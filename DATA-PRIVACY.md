# Data Privacy Notes (internal)

Not published on the site — this is the operating record for what the forms collect and how to handle it, so DPDP-relevant decisions aren't just tribal knowledge.

## What's collected

| Form | Fields | Goes to |
|---|---|---|
| Notify (`#notifyForm`) | email | Resend → `CONTACT_TO` inbox |
| Enquiry (`#enqForm`) | name, phone (optional), email, message | Resend → `CONTACT_TO` inbox |

`api/contact.js` also keeps an in-memory IP + timestamp map for rate limiting only (`requestLog`). It's per-instance, expires after 10 minutes, and is never written to disk — not treated as retained personal data.

## Where it lives after submission

The only durable copies are: (1) whatever inbox `CONTACT_TO` points at, and (2) Resend's own delivery logs/dashboard. There is no database. Access to both is currently held by the site owner only; the inbox itself may have a wider set of people with login access — check that separately if it changes.

## Retention

No automated expiry exists (there's nothing to automate against — it's an inbox). Practice: periodically (suggest quarterly) clear out enquiry/notify emails that are no longer needed for active follow-up. Don't let it become an indefinite archive by default.

## Handling an access/correction/deletion request

If someone asks what CRAV has on them, or asks for deletion:
1. Search `CONTACT_TO` for their email/name/phone, delete matching emails.
2. Check the Resend dashboard's delivery log for the same submission and remove/redact it there too (contact Resend support if it can't be done self-serve).
3. Confirm back to the requester once done.

## Breach response

If the inbox or Resend account is compromised, the Resend delivery log (sender, recipient, subject, timestamp) is the fastest way to reconstruct what was sent and to whom, so you can scope which enquiries were exposed. DPDP Rules require notifying the Data Protection Board and affected individuals without delay — start from that log.

## Cross-border processing

Resend (email delivery) and Google Fonts (font CDN, incidental — not a personal-data flow anywhere near as consequential as Resend) both process data outside India. DPDP currently permits this by default (no government blacklist in effect). Revisit if that changes.
