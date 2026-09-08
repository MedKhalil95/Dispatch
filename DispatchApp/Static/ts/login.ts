// Compiled to static/js/login.js
// Standalone (no dependency on common.ts) since the login page doesn't
// load Socket.IO or the rest of the app shell.

(function () {
  const input = document.getElementById("password") as HTMLInputElement | null;
  const toggle = document.getElementById("pw-toggle") as HTMLButtonElement | null;
  if (!input || !toggle) return;

  toggle.addEventListener("click", () => {
    const showing = input.type === "text";
    input.type = showing ? "password" : "text";
    toggle.classList.toggle("is-visible", !showing);
    toggle.setAttribute("aria-pressed", String(!showing));
    toggle.setAttribute("aria-label", showing ? t("show_password") : t("hide_password"));
    input.focus({ preventScroll: true });
  });
})();
