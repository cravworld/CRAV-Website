const pageLoadedAt = Date.now();

const submitToApi = async (form, payload, statusNode, successMessage) => {
  const submitBtn = form.querySelector('button[type="submit"]');
  statusNode.textContent = "Sending...";
  statusNode.style.color = "var(--mist)";
  if (submitBtn) submitBtn.disabled = true;

  try {
    const response = await fetch("/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.error || "Something went wrong.");
    }

    form.reset();
    statusNode.textContent = successMessage;
    statusNode.style.color = "var(--cyan)";
  } finally {
    if (submitBtn) submitBtn.disabled = false;
  }
};

document.getElementById("notifyForm").addEventListener("submit", async function(e){
  e.preventDefault();
  const email = document.getElementById("notifyEmail").value.trim();
  const honeypot = document.getElementById("notifyHoneypot").value.trim();
  if(!email || honeypot) return;

  try {
    await submitToApi(
      this,
      {
        type: "notify",
        email,
        honeypot,
        elapsedMs: Date.now() - pageLoadedAt,
        source: "website",
      },
      document.getElementById("notifyMsg"),
      "Thanks. We’ve received your request and will reach out soon."
    );
  } catch (error) {
    document.getElementById("notifyMsg").textContent = error.message;
    document.getElementById("notifyMsg").style.color = "var(--magenta)";
  }
});

document.getElementById("enqForm").addEventListener("submit", async function(e){
  e.preventDefault();
  const name = document.getElementById("enqName").value.trim();
  const phone = document.getElementById("enqPhone").value.trim();
  const email = document.getElementById("enqEmail").value.trim();
  const msg = document.getElementById("enqMsg").value.trim();
  const honeypot = document.getElementById("enqHoneypot").value.trim();
  if(honeypot) return;

  try {
    await submitToApi(
      this,
      {
        type: "enquiry",
        name,
        phone,
        email,
        message: msg,
        honeypot,
        elapsedMs: Date.now() - pageLoadedAt,
        source: "website",
      },
      document.getElementById("enqStatus"),
      "Thanks. Your enquiry has been sent."
    );
  } catch (error) {
    document.getElementById("enqStatus").textContent = error.message;
    document.getElementById("enqStatus").style.color = "var(--magenta)";
  }
});
