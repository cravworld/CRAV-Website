const escapeHtml = (value) =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");

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
        ? `<h2>Launch-list request</h2><p><strong>Email:</strong> ${escapeHtml(data.email || "")}</p><p><strong>Source:</strong> ${escapeHtml(data.source || "website")}</p>`
        : `<h2>Enquiry</h2><p><strong>Name:</strong> ${escapeHtml(data.name || "")}</p><p><strong>Phone:</strong> ${escapeHtml(data.phone || "")}</p><p><strong>Email:</strong> ${escapeHtml(data.email || "")}</p><p><strong>Message:</strong><br>${escapeHtml(data.message || "").replace(/\n/g, "<br>")}</p><p><strong>Source:</strong> ${escapeHtml(data.source || "website")}</p>`;

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