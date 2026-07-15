const nodemailer = require("nodemailer");

const escapeHtml = (value) =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");

const makeTransport = () => {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    throw new Error("SMTP is not configured.");
  }

  return nodemailer.createTransport({
    host,
    port: Number(process.env.SMTP_PORT || 587),
    secure: String(process.env.SMTP_SECURE || "false") === "true",
    auth: {
      user,
      pass,
    },
  });
};

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.statusCode = 405;
    return res.end(JSON.stringify({ error: "Method not allowed." }));
  }

  try {
    const data = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});
    const to = process.env.CONTACT_TO;
    const from = process.env.CONTACT_FROM || process.env.SMTP_USER;

    if (!to || !from) {
      res.statusCode = 500;
      return res.end(JSON.stringify({ error: "Contact settings are missing." }));
    }

    const transport = makeTransport();
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

    await transport.sendMail({
      from,
      to,
      subject,
      text: plainText,
      html,
      replyTo: data.email || undefined,
    });

    res.statusCode = 200;
    res.setHeader("Content-Type", "application/json");
    return res.end(JSON.stringify({ ok: true }));
  } catch (error) {
    res.statusCode = 400;
    res.setHeader("Content-Type", "application/json");
    return res.end(JSON.stringify({ error: error.message || "Unable to send message." }));
  }
}