# CRAV Website

Official landing page for CRAV, a creator-tech foundry based in Kerala. The site is a polished static homepage with a lightweight serverless contact endpoint for launch-list requests and enquiries.

## What this site does

- Introduces CRAV and its creator-tech positioning
- Highlights the first set of launch programs
- Collects launch-list signups and enquiries through the website
- Is ready to deploy directly on Vercel from the repository root

## Tech Stack

- Plain HTML, CSS, and vanilla JavaScript
- Vercel serverless function for contact submissions
- Resend for email delivery

## Repository Structure

- `index.html` - main public landing page
- `api/contact.js` - serverless contact endpoint used by the forms
- `crav-logo.png` - favicon / apple-touch-icon source (light mode)
- `assets/crav-logo-white.png` - header logo mark (dark background variant)
- `assets/favicon-dark.png` - favicon used in dark mode
- `assets/og-image.png` - social share preview image
- `robots.txt`, `sitemap.xml` - basic SEO crawling files
- `vercel.json` - Vercel routing and security header settings
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

1. Push the repository to GitHub.
2. Import the repo into Vercel.
3. Add the environment variables listed above in the Vercel project settings.
4. Deploy with the default settings.

## Contact Form Behavior

- The two forms on the page send JSON to `/api/contact`.
- A honeypot field is included to reduce basic spam.
- If the contact settings are missing, the function returns an error instead of silently failing.

## Notes

- The live deploy entry point is `index.html` at the repository root.