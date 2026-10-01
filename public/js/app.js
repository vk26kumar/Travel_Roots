/*
 * Travel Roots site-wide behaviour: navigation menus, cookie consent, theme,
 * wishlist, tax display, form helpers and notices. No framework required.
 */
(function () {
  "use strict";

  var CONSENT_COOKIE = "tr_consent";
  var CONSENT_MAX_AGE = 60 * 60 * 24 * 180;
  var PREFERENCE_KEYS = ["tr-theme", "tr-show-tax"];

  function each(selector, callback) {
    Array.prototype.forEach.call(document.querySelectorAll(selector), callback);
  }

  /* ---------- Navigation: collapse and account menu ---------- */

  each("[data-collapse]", function (button) {
    var target = document.querySelector(button.getAttribute("data-collapse"));
    if (!target) return;
    button.addEventListener("click", function () {
      var open = target.classList.toggle("show");
      button.setAttribute("aria-expanded", open ? "true" : "false");
      button.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    });
  });

  var openMenu = null;

  function closeMenu(restoreFocus) {
    if (!openMenu) return;
    openMenu.panel.hidden = true;
    openMenu.button.setAttribute("aria-expanded", "false");
    if (restoreFocus) openMenu.button.focus();
    openMenu = null;
  }

  each("[data-menu]", function (button) {
    var panel = document.getElementById(button.getAttribute("data-menu"));
    if (!panel) return;
    button.addEventListener("click", function (event) {
      event.stopPropagation();
      if (openMenu && openMenu.panel === panel) return closeMenu(false);
      closeMenu(false);
      panel.hidden = false;
      button.setAttribute("aria-expanded", "true");
      openMenu = { button: button, panel: panel };
      var first = panel.querySelector("a, button");
      if (first) first.focus();
    });
  });

  document.addEventListener("click", function (event) {
    if (openMenu && !openMenu.panel.contains(event.target)) closeMenu(false);
  });

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") closeMenu(true);
  });

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

  each("[data-consent]", function (button) {
    button.addEventListener("click", function () {
      writeConsent(button.getAttribute("data-consent") === "all");
      if (banner) banner.hidden = true;
    });
  });

  each("[data-cookie-settings]", function (button) {
    button.addEventListener("click", function () {
      if (!banner) return;
      banner.hidden = false;
      var first = banner.querySelector("button, a");
      if (first) first.focus();
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

  /* ---------- Theme (icons swap through CSS) ---------- */

  function labelThemeButtons() {
    var dark = document.documentElement.getAttribute("data-bs-theme") === "dark";
    each("[data-theme-toggle]", function (button) {
      button.setAttribute("aria-label", dark ? "Switch to light mode" : "Switch to dark mode");
    });
  }

  each("[data-theme-toggle]", function (button) {
    button.addEventListener("click", function () {
      var root = document.documentElement;
      var next = root.getAttribute("data-bs-theme") === "dark" ? "light" : "dark";
      root.setAttribute("data-bs-theme", next);
      savePreference("tr-theme", next);
      labelThemeButtons();
    });
  });
  labelThemeButtons();

  /* ---------- Tax display ---------- */

  var taxSwitch = document.getElementById("taxToggle");
  if (taxSwitch) {
    var setTaxDisplay = function (show) {
      document.body.classList.toggle("show-tax", show);
      taxSwitch.checked = show;
    };
    setTaxDisplay(loadPreference("tr-show-tax") === "1");
    taxSwitch.addEventListener("change", function () {
      setTaxDisplay(taxSwitch.checked);
      savePreference("tr-show-tax", taxSwitch.checked ? "1" : "0");
    });
  }

  /* ---------- Forms ---------- */

  each("form.needs-validation", function (form) {
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

  each("form[data-confirm]", function (form) {
    form.addEventListener("submit", function (event) {
      if (!window.confirm(form.getAttribute("data-confirm"))) event.preventDefault();
    });
  });

  each("[data-auto-submit]", function (control) {
    control.addEventListener("change", function () {
      if (control.form) control.form.submit();
    });
  });

  each("[data-password-toggle]", function (button) {
    button.addEventListener("click", function () {
      var input = document.getElementById(button.getAttribute("data-password-toggle"));
      if (!input) return;
      var reveal = input.type === "password";
      input.type = reveal ? "text" : "password";
      button.setAttribute("aria-pressed", reveal ? "true" : "false");
      button.setAttribute("aria-label", reveal ? "Hide password" : "Show password");
    });
  });

  each("input[type=file][data-preview]", function (input) {
    var preview = document.getElementById(input.getAttribute("data-preview"));
    input.addEventListener("change", function () {
      var file = input.files && input.files[0];
      if (!preview || !file) return;
      input.setCustomValidity(file.size > 5 * 1024 * 1024 ? "Images must be 5 MB or smaller." : "");
      preview.src = URL.createObjectURL(file);
      preview.hidden = false;
    });
  });

  each("[data-print]", function (button) {
    button.addEventListener("click", function () {
      window.print();
    });
  });

  each("[data-history-back]", function (button) {
    button.addEventListener("click", function () {
      if (window.history.length > 1) window.history.back();
      else window.location.href = "/listings";
    });
  });

  /* ---------- Notices ---------- */

  each("[data-notice]", function (notice) {
    var close = notice.querySelector("[data-dismiss]");
    if (close) {
      close.addEventListener("click", function () {
        notice.remove();
      });
    }
    if (notice.hasAttribute("data-autodismiss")) {
      window.setTimeout(function () {
        notice.remove();
      }, 6000);
    }
  });

  /* ---------- Wishlist ---------- */

  var csrfMeta = document.querySelector('meta[name="csrf-token"]');

  document.addEventListener("click", function (event) {
    var button = event.target.closest("button[data-wishlist-id]");
    if (!button) return;
    event.preventDefault();
    if (button.disabled) return;
    button.disabled = true;
    var id = button.getAttribute("data-wishlist-id");

    fetch("/listings/" + encodeURIComponent(id) + "/wishlist", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "X-CSRF-Token": csrfMeta ? csrfMeta.content : "",
      },
      credentials: "same-origin",
      body: "{}",
    })
      .then(function (response) {
        if (!response.ok) throw new Error("Request failed");
        return response.json();
      })
      .then(function (data) {
        each('[data-wishlist-id="' + id + '"]', function (match) {
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
