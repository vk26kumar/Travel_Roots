/*
 * Travel Roots site-wide behaviour: form validation, cookie consent, theme,
 * wishlist, tax display, confirmations and small UI helpers.
 */
(function () {
  "use strict";

  var CONSENT_COOKIE = "tr_consent";
  var CONSENT_MAX_AGE = 60 * 60 * 24 * 180;
  var PREFERENCE_KEYS = ["tr-theme", "tr-show-tax"];

  /* ---------- Consent ---------- */

  function readConsent() {
    var match = document.cookie.match(/(?:^|;\s*)tr_consent=([^;]+)/);
    if (!match) return null;
    try {
      var value = JSON.parse(decodeURIComponent(match[1]));
      return value && value.v === 1 ? value : null;
    } catch {
      return null;
    }
  }

  function writeConsent(preferences) {
    var value = encodeURIComponent(
      JSON.stringify({ v: 1, preferences: preferences, ts: Date.now() }),
    );
    var secure = window.location.protocol === "https:" ? "; Secure" : "";
    document.cookie =
      CONSENT_COOKIE +
      "=" +
      value +
      "; Max-Age=" +
      CONSENT_MAX_AGE +
      "; Path=/; SameSite=Lax" +
      secure;

    if (!preferences) {
      PREFERENCE_KEYS.forEach(function (key) {
        try {
          window.localStorage.removeItem(key);
        } catch {
          /* Storage may be unavailable in private browsing. */
        }
      });
    }
    document.dispatchEvent(new CustomEvent("tr:consent", { detail: { preferences: preferences } }));
  }

  function canStorePreferences() {
    var consent = readConsent();
    return Boolean(consent && consent.preferences);
  }

  function savePreference(key, value) {
    if (!canStorePreferences()) return;
    try {
      window.localStorage.setItem(key, value);
    } catch {
      /* Ignore storage failures. */
    }
  }

  function loadPreference(key) {
    if (!canStorePreferences()) return null;
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  }

  var banner = document.getElementById("cookieBanner");

  document.querySelectorAll("[data-consent]").forEach(function (button) {
    button.addEventListener("click", function () {
      writeConsent(button.getAttribute("data-consent") === "all");
      if (banner) banner.hidden = true;
    });
  });

  document.querySelectorAll("[data-cookie-settings]").forEach(function (button) {
    button.addEventListener("click", function () {
      if (banner) {
        banner.hidden = false;
        var first = banner.querySelector("button, a");
        if (first) first.focus();
      }
    });
  });

  var preferenceForm = document.getElementById("cookiePreferencesForm");
  if (preferenceForm) {
    var preferenceToggle = preferenceForm.querySelector("#consentPreferences");
    var savedNotice = preferenceForm.querySelector("[data-saved-notice]");
    var current = readConsent();
    if (preferenceToggle) preferenceToggle.checked = Boolean(current && current.preferences);

    preferenceForm.addEventListener("submit", function (event) {
      event.preventDefault();
      writeConsent(Boolean(preferenceToggle && preferenceToggle.checked));
      if (banner) banner.hidden = true;
      if (savedNotice) savedNotice.hidden = false;
    });
  }

  /* ---------- Theme ---------- */

  function applyThemeIcon() {
    var dark = document.documentElement.getAttribute("data-bs-theme") === "dark";
    document.querySelectorAll("[data-theme-toggle] i").forEach(function (icon) {
      icon.className = dark ? "fa-solid fa-sun" : "fa-solid fa-moon";
    });
    document.querySelectorAll("[data-theme-toggle]").forEach(function (button) {
      button.setAttribute("aria-label", dark ? "Switch to light mode" : "Switch to dark mode");
    });
  }

  document.querySelectorAll("[data-theme-toggle]").forEach(function (button) {
    button.addEventListener("click", function () {
      var next =
        document.documentElement.getAttribute("data-bs-theme") === "dark" ? "light" : "dark";
      document.documentElement.setAttribute("data-bs-theme", next);
      savePreference("tr-theme", next);
      applyThemeIcon();
    });
  });
  applyThemeIcon();

  /* ---------- Tax display ---------- */

  var taxSwitch = document.getElementById("taxToggle");
  function setTaxDisplay(show) {
    document.body.classList.toggle("show-tax", show);
    if (taxSwitch) taxSwitch.checked = show;
  }
  if (taxSwitch) {
    setTaxDisplay(loadPreference("tr-show-tax") === "1");
    taxSwitch.addEventListener("change", function () {
      setTaxDisplay(taxSwitch.checked);
      savePreference("tr-show-tax", taxSwitch.checked ? "1" : "0");
    });
  }

  /* ---------- Forms ---------- */

  document.querySelectorAll("form.needs-validation").forEach(function (form) {
    form.addEventListener("submit", function (event) {
      if (!form.checkValidity()) {
        event.preventDefault();
        event.stopPropagation();
        var invalid = form.querySelector(":invalid");
        if (invalid) invalid.focus();
      } else {
        var submit = form.querySelector("[type=submit][data-loading-text]");
        if (submit) {
          submit.disabled = true;
          submit.textContent = submit.getAttribute("data-loading-text");
        }
      }
      form.classList.add("was-validated");
    });
  });

  document.querySelectorAll("form[data-confirm]").forEach(function (form) {
    form.addEventListener("submit", function (event) {
      if (!window.confirm(form.getAttribute("data-confirm"))) event.preventDefault();
    });
  });

  document.querySelectorAll("[data-auto-submit]").forEach(function (control) {
    control.addEventListener("change", function () {
      if (control.form) control.form.submit();
    });
  });

  document.querySelectorAll("[data-password-toggle]").forEach(function (button) {
    button.addEventListener("click", function () {
      var input = document.getElementById(button.getAttribute("data-password-toggle"));
      if (!input) return;
      var reveal = input.type === "password";
      input.type = reveal ? "text" : "password";
      button.setAttribute("aria-label", reveal ? "Hide password" : "Show password");
      var icon = button.querySelector("i");
      if (icon) icon.className = reveal ? "fa-regular fa-eye-slash" : "fa-regular fa-eye";
    });
  });

  document.querySelectorAll("input[type=file][data-preview]").forEach(function (input) {
    var preview = document.getElementById(input.getAttribute("data-preview"));
    input.addEventListener("change", function () {
      var file = input.files && input.files[0];
      if (!preview || !file) return;
      if (file.size > 5 * 1024 * 1024) {
        input.setCustomValidity("Images must be 5 MB or smaller.");
      } else {
        input.setCustomValidity("");
      }
      preview.src = URL.createObjectURL(file);
      preview.hidden = false;
    });
  });

  document.querySelectorAll("[data-print]").forEach(function (button) {
    button.addEventListener("click", function () {
      window.print();
    });
  });

  document.querySelectorAll("[data-history-back]").forEach(function (button) {
    button.addEventListener("click", function () {
      if (window.history.length > 1) window.history.back();
      else window.location.href = "/listings";
    });
  });

  /* ---------- Flash messages ---------- */

  document.querySelectorAll("[data-autodismiss]").forEach(function (alert) {
    window.setTimeout(function () {
      if (window.bootstrap && document.body.contains(alert)) {
        window.bootstrap.Alert.getOrCreateInstance(alert).close();
      }
    }, 6000);
  });

  /* ---------- Wishlist ---------- */

  var csrfMeta = document.querySelector('meta[name="csrf-token"]');

  document.addEventListener("click", function (event) {
    var button = event.target.closest("button[data-wishlist-id]");
    if (!button) return;
    event.preventDefault();
    if (button.disabled) return;
    button.disabled = true;

    fetch(
      "/listings/" + encodeURIComponent(button.getAttribute("data-wishlist-id")) + "/wishlist",
      {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          "X-CSRF-Token": csrfMeta ? csrfMeta.content : "",
        },
        credentials: "same-origin",
        body: "{}",
      },
    )
      .then(function (response) {
        if (!response.ok) throw new Error("Request failed");
        return response.json();
      })
      .then(function (data) {
        document
          .querySelectorAll('[data-wishlist-id="' + button.getAttribute("data-wishlist-id") + '"]')
          .forEach(function (match) {
            match.setAttribute("aria-pressed", data.saved ? "true" : "false");
            match.setAttribute(
              "aria-label",
              data.saved ? "Remove from saved stays" : "Save to wishlist",
            );
            var label = match.querySelector("[data-wishlist-label]");
            if (label) label.textContent = data.saved ? "Saved" : "Save";
          });
      })
      .catch(function () {
        window.alert(
          "We could not update your saved stays. Please refresh the page and try again.",
        );
      })
      .finally(function () {
        button.disabled = false;
      });
  });
})();
