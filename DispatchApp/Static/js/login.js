"use strict";
(function () {
    const input = document.getElementById("password");
    const toggle = document.getElementById("pw-toggle");
    if (!input || !toggle)
        return;
    toggle.addEventListener("click", () => {
        const showing = input.type === "text";
        input.type = showing ? "password" : "text";
        toggle.classList.toggle("is-visible", !showing);
        toggle.setAttribute("aria-pressed", String(!showing));
        toggle.setAttribute("aria-label", showing ? t("show_password") : t("hide_password"));
        input.focus({ preventScroll: true });
    });
})();
