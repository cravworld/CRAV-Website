const escapeHtml = (value) =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");

const SITE_URL = "https://www.crav.world";
const LOGO_URL = `${SITE_URL}/crav-logo.png`;

// Table-based, inline-styled markup on purpose — email clients (Outlook
// desktop especially) don't support flexbox/grid/CSS variables reliably.
function renderEmail({ eyebrow, title, rows, message, formLabel }) {
  const row = ({ label, value }) => `
    <tr>
      <td style="padding:14px 0;border-bottom:1px solid #1c1f4a;">
        <p style="margin:0 0 4px;font-family:'Courier New',monospace;font-size:11px;letter-spacing:1.5px;text-transform:uppercase;color:#8b90c9;">${escapeHtml(label)}</p>
        <p style="margin:0;font-family:Helvetica,Arial,sans-serif;font-size:15px;color:#ffffff;">${value}</p>
      </td>
    </tr>`;

  const messageBlock = message
    ? `
    <tr>
      <td style="padding:14px 0;">
        <p style="margin:0 0 4px;font-family:'Courier New',monospace;font-size:11px;letter-spacing:1.5px;text-transform:uppercase;color:#8b90c9;">Message</p>
        <p style="margin:0;font-family:Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6;color:#ffffff;white-space:pre-wrap;">${message}</p>
      </td>
    </tr>`
    : "";

  return `<!doctype html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${escapeHtml(title)}</title></head>
<body style="margin:0;padding:0;background-color:#04040F;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#04040F;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background-color:#0A0C2E;border:1px solid #1c1f4a;border-radius:8px;">
          <tr>
            <td align="center" style="padding:32px 32px 24px;background-color:#0B0E3F;border-radius:8px 8px 0 0;">
              <img src="${LOGO_URL}" width="92" alt="CRAV" style="display:block;border:0;background-color:#ffffff;border-radius:6px;padding:8px 14px;">
            </td>
          </tr>
          <tr>
            <td style="padding:28px 32px 4px;">
              <p style="margin:0 0 6px;font-family:'Courier New',monospace;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#35E6E0;">${escapeHtml(eyebrow)}</p>
              <h1 style="margin:0;font-family:Helvetica,Arial,sans-serif;font-size:22px;font-weight:700;color:#ffffff;">${escapeHtml(title)}</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 32px 8px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                ${rows.map(row).join("")}
                ${messageBlock}
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px 28px;">
              <p style="margin:0;font-family:Helvetica,Arial,sans-serif;font-size:12px;color:#6b70a8;">Sent from the ${escapeHtml(formLabel)} form at <a href="${SITE_URL}" style="color:#35E6E0;text-decoration:none;">crav.world</a></p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_FIELD_LENGTH = 200;
const MAX_MESSAGE_LENGTH = 5000;
const MIN_ELAPSED_MS = 1500;

// Best-effort in-memory rate limit. Persists only for the lifetime of a warm
// serverless instance (not shared across instances/regions) — good enough to
// blunt scripted spam bursts without needing an external store.
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 5;
const requestLog = new Map();

function isRateLimited(ip) {
  const now = Date.now();
  const timestamps = (requestLog.get(ip) || []).filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  timestamps.push(now);
  requestLog.set(ip, timestamps);

  if (requestLog.size > 5000) {
    for (const [key, times] of requestLog) {
      if (!times.some((t) => now - t < RATE_LIMIT_WINDOW_MS)) requestLog.delete(key);
    }
  }

  return timestamps.length > RATE_LIMIT_MAX_REQUESTS;
}

function getClientIp(req) {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.length) return forwarded.split(",")[0].trim();
  return req.socket && req.socket.remoteAddress ? req.socket.remoteAddress : "unknown";
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.statusCode = 405;
    return res.end(JSON.stringify({ error: "Method not allowed." }));
  }

  if (isRateLimited(getClientIp(req))) {
    res.statusCode = 429;
    res.setHeader("Retry-After", String(Math.ceil(RATE_LIMIT_WINDOW_MS / 1000)));
    return res.end(JSON.stringify({ error: "Too many requests. Please try again later." }));
  }

  try {
    const data = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});
    const to = process.env.CONTACT_TO;
    const from = process.env.CONTACT_FROM;

    if (!to || !from || !process.env.RESEND_API_KEY) {
      res.statusCode = 500;
      return res.end(JSON.stringify({ error: "Contact settings are missing." }));
    }

    const submittedTooFast =
      typeof data.elapsedMs === "number" && data.elapsedMs >= 0 && data.elapsedMs < MIN_ELAPSED_MS;

    if (data.honeypot || submittedTooFast) {
      res.statusCode = 200;
      res.setHeader("Content-Type", "application/json");
      return res.end(JSON.stringify({ ok: true }));
    }

    const email = String(data.email || "").trim();
    if (!email || !EMAIL_RE.test(email) || email.length > MAX_FIELD_LENGTH) {
      res.statusCode = 400;
      return res.end(JSON.stringify({ error: "Please enter a valid email address." }));
    }
    if (data.name && String(data.name).length > MAX_FIELD_LENGTH) {
      res.statusCode = 400;
      return res.end(JSON.stringify({ error: "Name is too long." }));
    }
    if (data.phone && String(data.phone).length > MAX_FIELD_LENGTH) {
      res.statusCode = 400;
      return res.end(JSON.stringify({ error: "Phone number is too long." }));
    }
    if (data.message && String(data.message).length > MAX_MESSAGE_LENGTH) {
      res.statusCode = 400;
      return res.end(JSON.stringify({ error: "Message is too long." }));
    }

    const type = data.type === "notify" ? "notify" : "enquiry";
    const subject =
      type === "notify"
        ? "CRAV website: new launch-list request"
        : `CRAV website: enquiry from ${data.name || "Unknown"}`;

    const plainText =
      type === "notify"
        ? `Launch-list request\n\nEmail: ${data.email || ""}\nSource: ${data.source || "website"}\n`
        : [
            "Enquiry",
            "",
            `Name: ${data.name || ""}`,
            `Phone: ${data.phone || ""}`,
            `Email: ${data.email || ""}`,
            "",
            data.message || "",
            "",
            `Source: ${data.source || "website"}`,
          ].join("\n");

    const html =
      type === "notify"
        ? renderEmail({
            eyebrow: "Launch list",
            title: "New launch-list signup",
            rows: [
              { label: "Email", value: escapeHtml(data.email || "") },
              { label: "Source", value: escapeHtml(data.source || "website") },
            ],
            formLabel: "notify",
          })
        : renderEmail({
            eyebrow: "Enquiry",
            title: `New enquiry from ${escapeHtml(data.name || "someone")}`,
            rows: [
              { label: "Name", value: escapeHtml(data.name || "") },
              { label: "Phone", value: escapeHtml(data.phone || "—") },
              { label: "Email", value: escapeHtml(data.email || "") },
              { label: "Source", value: escapeHtml(data.source || "website") },
            ],
            message: escapeHtml(data.message || "").replace(/\n/g, "<br>"),
            formLabel: "enquiry",
          });

    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from,
        to: [to],
        subject,
        text: plainText,
        html,
        reply_to: data.email || undefined,
      }),
    });

    if (!resendResponse.ok) {
      const errorBody = await resendResponse.text();
      throw new Error(errorBody || "Unable to send message.");
    }

    res.statusCode = 200;
    res.setHeader("Content-Type", "application/json");
    return res.end(JSON.stringify({ ok: true }));
  } catch (error) {
    res.statusCode = 400;
    res.setHeader("Content-Type", "application/json");
    return res.end(JSON.stringify({ error: error.message || "Unable to send message." }));
  }
}