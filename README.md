# JJ Audio Consulting

A Cloudflare **Worker with static assets**. The site is a single self-contained
bundle (`public/index.html`); one Worker route emails contact-form submissions
via Resend.

    public/index.html      the site (prebuilt — nothing compiles it)
    public/joel-console.jpg
    src/index.js           routes /api/contact, serves everything else from assets
    src/contact.js         validates the form and calls Resend
    wrangler.jsonc         Worker + assets config

## How the form works

`public/index.html` POSTs to `/api/contact`. Anything that isn't that path is
served straight from `public/` by the assets binding. **The Resend API key lives
only in the Worker's environment** — it is never shipped to the browser.

## Deploying (Cloudflare Workers Builds)

Connect the GitHub repo in the Cloudflare dashboard. There is no build step:

| Setting | Value |
| --- | --- |
| Build command | *(leave empty)* |
| Deploy command | `npx wrangler deploy` |

## Environment variables

`CONTACT_TO` and `CONTACT_FROM` are declared in `wrangler.jsonc` and can be
overridden in the dashboard. `RESEND_API_KEY` is a **secret** — set it under
Workers → the project → Settings → Variables and Secrets. Never commit it.

| Variable | Notes |
| --- | --- |
| `RESEND_API_KEY` | Secret. From resend.com → API Keys. |
| `CONTACT_TO` | Where submissions land. `info@jjaudioconsulting.com` is delivered by Cloudflare Email Routing, which forwards to Joel's real inbox. |
| `CONTACT_FROM` | Must be on a Resend-verified domain. |

### Why `CONTACT_FROM` uses a subdomain

Resend adds an `MX` record to whichever domain you verify. Verifying the apex
would collide with the Email Routing `MX` that makes `info@` receive mail, so
sending is verified on **`send.jjaudioconsulting.com`** instead. Sending and
receiving then coexist.

`reply_to` is always the visitor's address, so replying to a notification goes
straight back to whoever filled out the form.

## Local development

    npm install
    cp .dev.vars.example .dev.vars   # then add a real key
    npx wrangler dev

## Spam

The form carries an off-screen honeypot field (`company`); submissions that fill
it are silently dropped. If real spam gets through, add Cloudflare Turnstile.
