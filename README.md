# JJ Audio Consulting

Static marketing site (`index.html`, a single self-contained bundle) plus one
Cloudflare Pages Function that emails contact-form submissions via Resend.

## How the form works

`index.html` POSTs the form to `/api/contact`, which is served by
`functions/api/contact.js`. That function validates the input and calls Resend.
**The Resend API key lives only in the function's environment** — it is never
shipped to the browser.

## Environment variables

Set these in Cloudflare → Pages → the project → Settings → Environment variables.

| Variable | Required | Notes |
| --- | --- | --- |
| `RESEND_API_KEY` | yes | From resend.com → API Keys. Secret — never commit it. |
| `CONTACT_TO` | yes | Where submissions are delivered (Joel's inbox). |
| `CONTACT_FROM` | no | Defaults to `onboarding@resend.dev`. See below. |

### About `CONTACT_FROM`

Until `jjaudioconsulting.com` is verified in Resend, you must send from Resend's
shared `onboarding@resend.dev` sender — and it can **only deliver to the email
address that owns the Resend account**. So today, `CONTACT_TO` has to be that
same address.

Once the domain is verified in Resend (add the DKIM/SPF DNS records it gives
you), set:

    CONTACT_FROM = JJ Audio Consulting <info@jjaudioconsulting.com>
    CONTACT_TO   = info@jjaudioconsulting.com

No code change is needed — both are read from the environment.

Regardless of sender, `reply_to` is set to the visitor's address, so replying to
a notification goes straight back to the person who filled out the form.

## Local development

    npm install
    cp .dev.vars.example .dev.vars   # then fill in a real key
    npx wrangler pages dev .

## Deploying

Cloudflare Pages builds on push to `main`.

- Build command: *(none — the site is prebuilt)*
- Build output directory: `/`

## Spam

The form carries an off-screen honeypot field (`company`). Submissions that fill
it are silently dropped. If real spam gets through, add Cloudflare Turnstile.
