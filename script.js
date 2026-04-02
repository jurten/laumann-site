  // ===== FORM ELEMENTS =====
  const form = document.getElementById("contact-form");
  const nombre = document.getElementById("nombre");
  const email = document.getElementById("email");
  const telefono = document.getElementById("telefono");
  const tramite = document.getElementById("tramite");
  const mensaje = document.getElementById("mensaje");
  const submitBtn = document.getElementById("submit-btn");
  const formMessage = document.getElementById("form-message");

  const nombreError = document.getElementById("nombre-error");
  const emailError = document.getElementById("email-error");
  const telefonoError = document.getElementById("telefono-error");
  const tramiteError = document.getElementById("tramite-error");
  const mensajeError = document.getElementById("mensaje-error");

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const phoneRegex = /^[\d\s()+-]{6,20}$/;

  // ===== HELPERS =====
  function showError(input, errorElement, message) {
    errorElement.textContent = message;
    errorElement.classList.remove("hidden");
    input.classList.add("border-error");
  }

  function clearError(input, errorElement) {
    errorElement.textContent = "";
    errorElement.classList.add("hidden");
    input.classList.remove("border-error");
  }

  function showFormMessage(message, isError = false) {
    formMessage.textContent = message;
    formMessage.classList.remove("hidden", "text-error", "text-primary-container");
    formMessage.classList.add(isError ? "text-error" : "text-primary-container");
  }

  // ===== FORM SUBMIT =====
  form.addEventListener("submit", async function (e) {
    e.preventDefault();

    let isValid = true;

    const nombreValue = nombre.value.trim();
    const emailValue = email.value.trim();
    const telefonoValue = telefono.value.trim();
    const tramiteValue = tramite.value.trim();
    const mensajeValue = mensaje.value.trim();

    clearError(nombre, nombreError);
    clearError(email, emailError);
    clearError(telefono, telefonoError);
    clearError(tramite, tramiteError);
    clearError(mensaje, mensajeError);
    formMessage.classList.add("hidden");

    // ===== VALIDATION =====
    if (!nombreValue) {
      showError(nombre, nombreError, "Por favor, ingrese su nombre completo.");
      isValid = false;
    }

    if (!emailValue) {
      showError(email, emailError, "Por favor, ingrese su email.");
      isValid = false;
    } else if (!emailRegex.test(emailValue)) {
      showError(email, emailError, "Por favor, ingrese un email válido. Ejemplo: nombre@correo.com");
      isValid = false;
    }

    if (telefonoValue && !phoneRegex.test(telefonoValue)) {
      showError(telefono, telefonoError, "Por favor, ingrese un teléfono válido.");
      isValid = false;
    }

    if (!tramiteValue) {
      showError(tramite, tramiteError, "Por favor, seleccione un tipo de trámite.");
      isValid = false;
    }

    if (!isValid) return;

    // ===== LOADING STATE =====
    submitBtn.disabled = true;
    submitBtn.textContent = "Enviando...";

    try {
      const payload = {
  	nombre: nombreValue,
	email: emailValue,
	telefono: telefonoValue,
	tramite: tramiteValue,
	mensaje: mensajeValue,
	company: document.getElementById("company")?.value || "",
	turnstileToken: document.querySelector('[name="cf-turnstile-response"]')?.value
      };

      const res = await fetch("/api/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        throw new Error("Error al enviar");
      }

      form.reset();

      showFormMessage(
        "Su consulta fue enviada correctamente. Nos pondremos en contacto a la brevedad."
      );

    } catch (error) {
      showFormMessage(
        "No pudimos enviar su consulta en este momento. Por favor, intente nuevamente.",
        true
      );
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "Enviar Consulta";
    }
  });

  // ===== MOBILE MENU =====
  const menuBtn = document.getElementById("menu-btn");
  const mobileMenu = document.getElementById("mobile-menu");
  const closeMenuBtn = document.getElementById("close-menu-btn");

  let isOpen = false;

  function openMenu() {
    mobileMenu.classList.remove("opacity-0", "pointer-events-none");
    mobileMenu.classList.add("opacity-100");
    menuBtn.setAttribute("aria-expanded", "true");
    isOpen = true;
  }

  function closeMenu() {
    mobileMenu.classList.add("opacity-0", "pointer-events-none");
    mobileMenu.classList.remove("opacity-100");
    menuBtn.setAttribute("aria-expanded", "false");
    isOpen = false;
  }

  menuBtn.addEventListener("click", () => {
    isOpen ? closeMenu() : openMenu();
  });

  // close with X button
  closeMenuBtn?.addEventListener("click", closeMenu);

  // close when clicking links
  document.querySelectorAll("#mobile-menu a").forEach(link => {
    link.addEventListener("click", closeMenu);
  });

  // optional: click outside to close
  mobileMenu.addEventListener("click", (e) => {
    if (e.target === mobileMenu) {
      closeMenu();
    }
  });
