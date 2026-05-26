const tabs = document.querySelectorAll("[data-auth-tab]");
const forms = document.querySelectorAll("[data-auth-form]");
const message = document.getElementById("message");

function setMessage(text, type = "") {
  message.textContent = text;
  message.className = `message ${type}`.trim();
}

function showMode(mode) {
  tabs.forEach((tab) => {
    const active = tab.dataset.authTab === mode;
    tab.classList.toggle("is-active", active);
    tab.setAttribute("aria-selected", String(active));
  });

  forms.forEach((form) => {
    form.classList.toggle("is-hidden", form.dataset.authForm !== mode);
  });

  setMessage("");
}

async function submitAuthForm(form) {
  const mode = form.dataset.authForm;
  const button = form.querySelector("button[type='submit']");
  const payload = Object.fromEntries(new FormData(form));

  setMessage("");
  button.disabled = true;
  button.textContent = mode === "login" ? "Signing in..." : "Creating...";

  try {
    const response = await fetch(mode === "login" ? "/login" : "/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const result = await response.json();

    if (!response.ok) {
      setMessage(result.message || "Authentication failed.", "error");
      return;
    }

    setMessage("Opening your garden...", "success");
    window.location.href = result.redirect || "/dashboard";
  } catch {
    setMessage("Unable to reach the authentication server.", "error");
  } finally {
    button.disabled = false;
    button.textContent = mode === "login" ? "Sign in" : "Create account";
  }
}

tabs.forEach((tab) => {
  tab.addEventListener("click", () => showMode(tab.dataset.authTab));
});

forms.forEach((form) => {
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    submitAuthForm(form);
  });
});

if (window.location.protocol === "file:") {
  setMessage("Open this project from http://localhost:3000.", "error");
  forms.forEach((form) => {
    form.querySelector("button[type='submit']").disabled = true;
  });
}
