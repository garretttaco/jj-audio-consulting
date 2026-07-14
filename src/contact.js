// Emails a contact-form submission to Joel via Resend.
// The Resend key lives only in this Worker's env; it never reaches the browser.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });

const esc = (str) =>
  String(str).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

export async function handleContact(request, env) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Could not read that submission.' }, 400);
  }

  // Honeypot: the field is off-screen, so a real visitor never fills it.
  // Report success so bots don't learn they were caught.
  if (String(body.company ?? '').trim()) return json({ ok: true });

  const name = String(body.name ?? '').trim();
  const email = String(body.email ?? '').trim();
  const church = String(body.church ?? '').trim();
  const topic = String(body.topic ?? '').trim() || 'Not specified';
  const msg = String(body.msg ?? '').trim();

  if (!name || !email) return json({ error: 'Name and email are required.' }, 400);
  if (!EMAIL_RE.test(email)) return json({ error: 'That email looks off.' }, 400);
  if (name.length > 200 || email.length > 200 || church.length > 200 || msg.length > 5000) {
    return json({ error: 'That submission is too long.' }, 400);
  }

  if (!env.RESEND_API_KEY || !env.CONTACT_TO) {
    // TEMPORARY diagnostic: report *which* binding is absent (never its value) so
    // a misconfigured deploy is diagnosable from outside. Remove once verified.
    const missing = [];
    if (!env.RESEND_API_KEY) missing.push('RESEND_API_KEY');
    if (!env.CONTACT_TO) missing.push('CONTACT_TO');
    console.error('Missing bindings:', missing.join(', '));
    return json(
      { error: 'Email is not configured yet. Please email info@jjaudioconsulting.com.', missing },
      500,
    );
  }

  const rows = [
    ['Name', name],
    ['Church', church || '—'],
    ['Email', email],
    ['Interested in', topic],
  ]
    .map(
      ([k, v]) =>
        `<tr><td style="padding:6px 16px 6px 0;color:#8090ad;font:600 13px sans-serif">${k}</td>` +
        `<td style="padding:6px 0;color:#12244f;font:600 15px sans-serif">${esc(v)}</td></tr>`,
    )
    .join('');

  const html =
    `<div style="font-family:sans-serif;max-width:560px">` +
    `<h2 style="color:#12244f;margin:0 0 4px">New assessment request</h2>` +
    `<p style="color:#8090ad;margin:0 0 20px;font-size:14px">From the JJ Audio Consulting website</p>` +
    `<table style="border-collapse:collapse;margin-bottom:20px">${rows}</table>` +
    (msg
      ? `<div style="border-left:3px solid #2464C2;padding:2px 0 2px 14px;color:#3f4d6e;white-space:pre-wrap;font-size:15px;line-height:1.6">${esc(msg)}</div>`
      : '') +
    `<p style="color:#8090ad;font-size:13px;margin-top:24px">Reply directly to this email to reach ${esc(name)}.</p>` +
    `</div>`;

  const text = [
    `New assessment request`,
    ``,
    `Name:          ${name}`,
    `Church:        ${church || '—'}`,
    `Email:         ${email}`,
    `Interested in: ${topic}`,
    ``,
    msg || '(no message)',
  ].join('\n');

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${env.RESEND_API_KEY}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      from: env.CONTACT_FROM || 'JJ Audio Consulting <onboarding@resend.dev>',
      to: [env.CONTACT_TO],
      reply_to: email, // so Joel can just hit Reply and land in the visitor's inbox
      subject: `New assessment request — ${name}${church ? ` (${church})` : ''}`,
      html,
      text,
    }),
  });

  if (!res.ok) {
    console.error('Resend error', res.status, await res.text());
    return json({ error: 'Could not send right now. Please email info@jjaudioconsulting.com.' }, 502);
  }

  return json({ ok: true });
}
