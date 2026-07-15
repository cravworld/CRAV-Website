# CRAV Website

Static landing page for CRAV with a Vercel serverless contact endpoint.

## Deploy to Vercel

1. Push this folder to a Git repository.
2. Import the repo in Vercel.
3. Set these environment variables in Vercel:
   - `CONTACT_TO` - destination inbox for form submissions
   - `CONTACT_FROM` - sender address used by the SMTP account
   - `SMTP_HOST` - SMTP host
   - `SMTP_PORT` - SMTP port, usually `587`
   - `SMTP_SECURE` - `true` for port `465`, otherwise `false`
   - `SMTP_USER` - SMTP username
   - `SMTP_PASS` - SMTP password
4. Deploy with the default settings.

## Local preview

You can open `index.html` directly for design review, but the contact form only works after the `/api/contact` function is deployed and the SMTP variables are configured.

## Files

- `index.html` - live site entry point
- `api/contact.js` - email submission endpoint
- `vercel.json` - Vercel routing settings