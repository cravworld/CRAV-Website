# CRAV Website

Official landing page for CRAV, a creator-tech foundry based in Kerala. The site is a polished static homepage with a lightweight serverless contact endpoint for launch-list requests and enquiries.

## What this site does

- Introduces CRAV and its creator-tech positioning
- Highlights the first set of launch programs
- Collects launch-list signups and enquiries through the website
- Is ready to deploy directly on Vercel from the repository root

## Tech Stack

- Plain HTML, CSS, and vanilla JavaScript (`assets/main.js` — extracted from an inline
  `<script>` so the CSP below can drop `'unsafe-inline'` on `script-src`)
- Self-hosted fonts (Archivo, Space Grotesk, Space Mono) — previously loaded from Google
  Fonts, which sent every visitor's IP to Google on each page view; now served from
  `assets/fonts/`
- Vercel serverless function for contact submissions, with in-memory per-IP rate limiting
- Resend for email delivery

## Repository Structure

- `index.html` - main public landing page
- `404.html` - branded 404 page
- `api/contact.js` - serverless contact endpoint used by the forms (validation, rate
  limiting, branded HTML email rendering)
- `assets/main.js` - contact-form submission logic (fetch, client-side validation, status
  messaging) for both forms
- `assets/fonts/` - self-hosted `.woff2` files for Archivo, Space Grotesk, Space Mono
- `crav-logo.png` - favicon / apple-touch-icon source (light mode), also used as the social share preview image
- `assets/crav-logo-white.png` - header logo mark (dark background variant)
- `assets/favicon-dark.png` - favicon used in dark mode
- `robots.txt`, `sitemap.xml` - basic SEO crawling files
- `vercel.json` - Vercel routing and security header settings
- `DATA-PRIVACY.md` - internal (unpublished) record of what the forms collect, where it
  goes, and how to handle a retention/access/deletion request
- `.env.example` - sample local environment variables
- `.env.local` - local-only environment values, not committed

## Local Setup

1. Copy `.env.example` to `.env.local`.
2. Replace the placeholder values with your real Resend and contact details.
3. Open `index.html` in a browser for design review, or run the project through Vercel for end-to-end form testing.

## Environment Variables

The contact form requires these values in Vercel and in your local `.env.local` file:

- `CONTACT_TO` - destination inbox for form submissions
- `CONTACT_FROM` - verified sender address in Resend
- `RESEND_API_KEY` - Resend API key

Example values are documented in `.env.example`.

## Deploy to Vercel

**Already done for this project** — the repo is public on GitHub (`cravworld/CRAV-Website`)
and linked to a Vercel project (`crav-website`), auto-deploying on push to `main`. Steps
below are what that setup involved, for standing up a fresh copy elsewhere:

1. Push the repository to GitHub.
2. Import the repo into Vercel.
3. Add the environment variables listed above in the Vercel project settings.
4. Deploy with the default settings.

## Contact Form Behavior

- The two forms on the page send JSON to `/api/contact`, handled by `assets/main.js`.
- Spam/bot mitigation is layered, not just the honeypot: a hidden honeypot field, a
  minimum-elapsed-time check (rejects submissions faster than 1.5s from page load), and
  per-IP rate limiting (5 requests / 10 minutes, in-memory, keyed off Vercel's trusted
  `x-vercel-forwarded-for` header rather than the client-spoofable `x-forwarded-for`
  first entry — a real bypass this project had until it was fixed).
- Server-side validation on every field (email format, max length on name/phone/message)
  rejects bad input before Resend is ever called.
- If the contact settings (`CONTACT_TO`/`CONTACT_FROM`/`RESEND_API_KEY`) are missing, the
  function returns an error instead of silently failing.
- Errors returned to the client are generic; raw Resend API error bodies and internal
  exception details are logged server-side only, never echoed back.
- Successful submissions send a branded HTML email (table-based markup for Outlook
  compatibility) with a sequential per-instance counter in the subject line so mail
  clients don't thread-group otherwise-identical subjects.
- Security headers are set site-wide in `vercel.json`: a strict CSP (`script-src 'self'`,
  no inline scripts — see Tech Stack above), HSTS, `X-Frame-Options: DENY`,
  `X-Content-Type-Options: nosniff`, and a locked-down `Permissions-Policy`.

## Notes

- The live deploy entry point is `index.html` at the repository root.
- See `DATA-PRIVACY.md` for what the forms collect, where it goes, and how to handle a deletion/access request.

---
*Reconciled against the actual codebase 2026-07-29. The local checkout was 6 commits
behind `origin/main` at the time (contact-endpoint/CSP hardening, the privacy-notice
fix, and self-hosted fonts) and was fast-forward-pulled first so this reflects the real
current state — every claim above was checked against the pulled code, not carried over
from the previous version of this file.*