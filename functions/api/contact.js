export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const body = await request.json();

    const {
      nombre = "",
      email = "",
      telefono = "",
      tramite = "",
      mensaje = "",
      company = "",
      turnstileToken = ""
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
    if (!turnstileToken) {
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
          response: turnstileToken,
          remoteip: request.headers.get("CF-Connecting-IP") || ""
        })
      }
    );

    const verifyData = await verifyRes.json();

    if (!verifyData.success) {
      return jsonResponse(
        {
          error: "Turnstile verification failed",
          details: verifyData["error-codes"] || []
        },
        400
      );
    }

    // 1) Email to the firm
    const notifyFirmResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: "Laumann Web <consultas@send.laumannasociados.com.ar>",
        to: [env.CONTACT_TO_EMAIL],
        subject: "Nueva consulta desde la web",
        html: `
          <h2>Nueva consulta desde la web</h2>
          <p><strong>Nombre:</strong> ${escapeHtml(nombre)}</p>
          <p><strong>Email:</strong> ${escapeHtml(email)}</p>
          <p><strong>Teléfono:</strong> ${escapeHtml(telefono) || "No proporcionado"}</p>
          <p><strong>Trámite:</strong> ${escapeHtml(tramite)}</p>
          <p><strong>Situación:</strong><br>
            ${mensaje ? escapeHtml(mensaje) : "No especificada"}
          </p>
        `,
        reply_to: email.trim()
      })
    });

    if (!notifyFirmResponse.ok) {
      const errorText = await notifyFirmResponse.text();
      return jsonResponse(
        { error: "Email send failed", detail: errorText },
        502
      );
    }

    // 2) Auto-reply to the user (best effort)
    try {
      const autoReplyResponse = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${env.RESEND_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          from: "Laumann & Asociados <consultas@send.laumannasociados.com.ar>",
          to: [email.trim()],
          subject: "Hemos recibido su consulta",
          html: `
            <p>Hola ${escapeHtml(nombre)},</p>

            <p>Gracias por comunicarse con Laumann & Asociados.</p>

            <p>Hemos recibido su consulta correctamente y será revisada a la brevedad.</p>

            <p>Nos estaremos comunicando con usted por este medio o telefónicamente, en caso de haberlo informado.</p>

            <p>Saludos cordiales,<br>Laumann & Asociados</p>
          `
        })
      });

      if (!autoReplyResponse.ok) {
        const autoReplyError = await autoReplyResponse.text();
        console.log("Auto-reply failed:", autoReplyError);
      }
    } catch (autoReplyError) {
      console.log(
        "Auto-reply request failed:",
        autoReplyError instanceof Error ? autoReplyError.message : String(autoReplyError)
      );
    }

    return jsonResponse({ success: true }, 200);
  } catch (error) {
    return jsonResponse(
      {
        error: "Server error",
        detail: error instanceof Error ? error.message : String(error)
      },
      500
    );
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
