export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const body = await request.json();

    const {
      nombre = "",
      email = "",
      telefono = "",
      tramite = "",
      company = ""
    } = body;

    // Honeypot anti-spam
    if (company) {
      return jsonResponse({ error: "Spam detected" }, 400);
    }

    // Required fields
    if (!nombre.trim() || !email.trim() || !tramite.trim()) {
      return jsonResponse({ error: "Missing required fields" }, 400);
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return jsonResponse({ error: "Invalid email" }, 400);
    }

    // Turnstile validation
	const token = body.turnstileToken;

	if (!token) {
	  return jsonResponse({ error: "Missing Turnstile token" }, 400);
	}

	const verifyRes = await fetch(
	  "https://challenges.cloudflare.com/turnstile/v0/siteverify",
	  {
	    method: "POST",
	    headers: {
	      "Content-Type": "application/x-www-form-urlencoded"
	    },
	    body: new URLSearchParams({
	      secret: env.TURNSTILE_SECRET_KEY,
	      response: token
	    })
	  }
	);

	const verifyData = await verifyRes.json();

	if (!verifyData.success) {
	  return jsonResponse({ error: "Turnstile verification failed" }, 400);
	}

    // Optional light origin check for MVP
    const origin = request.headers.get("Origin") || "";
    if (!origin.includes(".pages.dev") && !origin.includes("localhost")) {
      return jsonResponse({ error: "Forbidden" }, 403);
    }

    // Send email through Resend
    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: "Laumann Web <onboarding@resend.dev>",
        to: [env.CONTACT_TO_EMAIL],
        subject: "Nueva consulta desde la web",
        html: `
          <h2>Nueva consulta desde la web</h2>
          <p><strong>Nombre:</strong> ${escapeHtml(nombre)}</p>
          <p><strong>Email:</strong> ${escapeHtml(email)}</p>
          <p><strong>Teléfono:</strong> ${escapeHtml(telefono) || "No proporcionado"}</p>
          <p><strong>Trámite:</strong> ${escapeHtml(tramite)}</p>
        `,
        reply_to: email.trim()
      })
    });

    if (!resendResponse.ok) {
      const errorText = await resendResponse.text();
      return jsonResponse(
        { error: "Email send failed", detail: errorText },
        502
      );
    }

    return jsonResponse({ success: true }, 200);
  } catch (error) {
    return jsonResponse({ error: "Server error" }, 500);
  }
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json"
    }
  });
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
