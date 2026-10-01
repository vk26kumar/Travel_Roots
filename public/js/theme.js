/*
 * Applies the colour theme before the page renders to avoid a flash of the
 * wrong theme. A saved choice is only read when the visitor has consented to
 * preference storage; otherwise the operating system setting is used.
 */
(function () {
  "use strict";

  function hasPreferenceConsent() {
    var match = document.cookie.match(/(?:^|;\s*)tr_consent=([^;]+)/);
    if (!match) return false;
    try {
      var consent = JSON.parse(decodeURIComponent(match[1]));
      return Boolean(consent && consent.preferences);
    } catch {
      return false;
    }
  }

  var theme = null;
  try {
    if (hasPreferenceConsent()) theme = window.localStorage.getItem("tr-theme");
  } catch {
    theme = null;
  }

  if (theme !== "light" && theme !== "dark") {
    theme =
      window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
  }

  document.documentElement.setAttribute("data-bs-theme", theme);
})();
