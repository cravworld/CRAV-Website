const escapeHtml = (value) =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.statusCode = 405;
    return res.end(JSON.stringify({ error: "Method not allowed." }));
  }

  try {
    const data = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});
    const to = process.env.CONTACT_TO;
    const from = process.env.CONTACT_FROM;

    if (!to || !from || !process.env.RESEND_API_KEY) {
      res.statusCode = 500;
      return res.end(JSON.stringify({ error: "Contact settings are missing." }));
    }

    if (data.honeypot) {
      res.statusCode = 200;
      res.setHeader("Content-Type", "application/json");
      return res.end(JSON.stringify({ ok: true }));
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