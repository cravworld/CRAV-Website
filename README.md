# CRAV Website

Static landing page for CRAV with a Vercel serverless contact endpoint.

## Deploy to Vercel

1. Push this folder to a Git repository.
2. Import the repo in Vercel.
3. Set these environment variables in Vercel:
   - `CONTACT_TO` - destination inbox for form submissions
   - `CONTACT_FROM` - verified sender address in Resend
   - `RESEND_API_KEY` - Resend API key
4. Deploy with the default settings.

## Local preview

Copy `.env.example` to `.env.local`, fill in the real values, and then open `index.html` for design review. The contact form only works after the `/api/contact` function is deployed and the Resend variables are configured.

## Files

- `index.html` - live site entry point
- `api/contact.js` - email submission endpoint
- `vercel.json` - Vercel routing settings