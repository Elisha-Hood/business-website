# Contact form

## Current state (preview)

- Fields: name and email (required); business name, current website and message (optional). Nothing else is collected.
- Client-side validation with per-field messages (`aria-invalid` + `aria-describedby`). Focus moves to the first problem, and errors re-check as you type.
- Honeypot field (`_gotcha`) for basic spam filtering.
- **Preview mode:** `data-endpoint` is empty, so submitting validates the entries and then says plainly that *nothing was sent*. No network request is made. A visible notice above the form says the same thing.
- **With an endpoint:** the form shows a loading state (button disabled, “Sending…”, `aria-busy`) and posts to the endpoint. It reports success **only** if the service replies with HTTP 2xx **and** JSON `{"ok": true}`. Errors, timeouts (15s) and non-JSON replies keep the visitor's entries and say the request was not sent or not confirmed.

## Why a hosted form service

Production is GitHub Pages, which serves static files only and can't run server code. So spam checks and server-side validation have to happen at a form service. The recommended option, which the code already supports, is **[Formspree](https://formspree.io)**:

- The form endpoint ID (`https://formspree.io/f/xxxxxxx`) is **not a secret**. It's designed to be public, so no keys live in client code.
- Formspree validates the `email` field server-side, handles the `_gotcha` honeypot, filters spam, and can add reCAPTCHA or Turnstile from its dashboard. It replies with `{"ok": true}` on success, which is what `script.js` checks for.
- The destination inbox is configured and verified inside Formspree, not in this repository.

### To activate

1. Confirm the inbox you own (see `CONFIRM-BEFORE-LAUNCH.md` #4).
2. Create a Formspree form that delivers to that inbox. Verify the address, enable spam filtering (and optionally a CAPTCHA), and restrict the form to your production domain.
3. Put the endpoint in `site.config.json` → `production.contactEndpoint`.
4. Run `node scripts/build.mjs --mode=production`. The endpoint is written into `contact.html` and the preview notice is removed.
5. Submit a real test from the live site, and confirm it arrives and that the success message appears only then.

If you later move to a host with server functions (e.g. Cloudflare Pages or Netlify), the same `data-endpoint` contract can point at your own function. Validate fields server-side, verify a Turnstile token with a secret stored in the host's environment variables (never in the repo), rate-limit, and return `{"ok": true}` only after the email provider accepts the message.
