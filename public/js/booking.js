/*
 * Booking checkout. Prices shown here are an estimate for the guest; the
 * server recalculates the amount and creates the Razorpay order itself.
 */
(function () {
  "use strict";

  var form = document.getElementById("bookingForm");
  if (!form) return;

  var DAY_MS = 24 * 60 * 60 * 1000;
  var price = Number(form.getAttribute("data-price"));
  var taxRate = Number(form.getAttribute("data-tax-rate"));
  var maxNights = Number(form.getAttribute("data-max-nights"));
  var listingId = form.getAttribute("data-listing-id");
  var paymentsEnabled = form.getAttribute("data-payments") === "true";

  var checkIn = document.getElementById("checkIn");
  var checkOut = document.getElementById("checkOut");
  var payButton = document.getElementById("payButton");
  var errorBox = document.getElementById("bookingError");
  var csrfMeta = document.querySelector('meta[name="csrf-token"]');
  var formatter = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 });

  var fields = {
    nights: document.querySelectorAll("[data-nights]"),
    subtotal: document.getElementById("summarySubtotal"),
    tax: document.getElementById("summaryTax"),
    total: document.getElementById("summaryTotal"),
  };

  function toIso(date) {
    return date.toISOString().slice(0, 10);
  }

  function parse(value) {
    return value ? new Date(value + "T00:00:00Z") : null;
  }

  function money(amount) {
    return "₹" + formatter.format(amount);
  }

  function showError(message) {
    errorBox.textContent = message;
    errorBox.hidden = !message;
  }

  var today = new Date();
  var todayIso = toIso(new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate())));
  checkIn.min = todayIso;
  checkOut.min = todayIso;

  function nightsBetween() {
    var from = parse(checkIn.value);
    var to = parse(checkOut.value);
    if (!from || !to) return 0;
    return Math.round((to - from) / DAY_MS);
  }

  function update() {
    var from = parse(checkIn.value);
    if (from) {
      checkOut.min = toIso(new Date(from.getTime() + DAY_MS));
      checkOut.max = toIso(new Date(from.getTime() + maxNights * DAY_MS));
    }

    var nights = nightsBetween();
    var valid = nights >= 1 && nights <= maxNights;
    var subtotalPaise = valid ? Math.round(price * 100) * nights : 0;
    var taxPaise = Math.round(subtotalPaise * taxRate);

    fields.nights.forEach(function (node) {
      node.textContent = valid ? nights : 0;
    });
    fields.subtotal.textContent = money(subtotalPaise / 100);
    fields.tax.textContent = money(taxPaise / 100);
    fields.total.textContent = money((subtotalPaise + taxPaise) / 100);

    if (checkIn.value && checkOut.value && !valid) {
      showError(
        nights > maxNights
          ? "Stays are limited to " + maxNights + " nights."
          : "Check-out must be at least one day after check-in.",
      );
    } else {
      showError("");
    }
    payButton.disabled = !valid || !paymentsEnabled;
  }

  checkIn.addEventListener("change", function () {
    if (checkOut.value && checkOut.value <= checkIn.value) checkOut.value = "";
    update();
  });
  checkOut.addEventListener("change", update);
  update();

  function postJson(url, body) {
    return fetch(url, {
      method: "POST",
      credentials: "same-origin",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "X-CSRF-Token": csrfMeta ? csrfMeta.content : "",
      },
      body: JSON.stringify(body || {}),
    }).then(function (response) {
      return response.json().then(function (data) {
        if (!response.ok || !data.success) {
          throw new Error(data.message || "Something went wrong. Please try again.");
        }
        return data;
      });
    });
  }

  function setBusy(busy) {
    payButton.disabled = busy;
    payButton.textContent = busy ? "Processing..." : payButton.getAttribute("data-label");
  }

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    if (!paymentsEnabled || typeof window.Razorpay !== "function") {
      showError("Online payments are not available right now. Please try again later.");
      return;
    }

    showError("");
    setBusy(true);

    postJson("/bookings", {
      listingId: listingId,
      checkIn: checkIn.value,
      checkOut: checkOut.value,
    })
      .then(function (data) {
        var bookingId = data.bookingId;
        var settled = false;

        function release() {
          if (settled) return;
          settled = true;
          postJson("/bookings/" + bookingId + "/cancel").catch(function () {});
          setBusy(false);
        }

        var options = Object.assign({}, data.checkout, {
          theme: { color: "#e0364a" },
          handler: function (response) {
            settled = true;
            postJson("/bookings/" + bookingId + "/verify", response)
              .then(function (result) {
                window.location.assign(result.redirectUrl);
              })
              .catch(function (error) {
                showError(error.message);
                setBusy(false);
              });
          },
          modal: { ondismiss: release },
        });

        var checkout = new window.Razorpay(options);
        // Checkout lets the guest retry after a failure, so the hold is only
        // released when the modal is dismissed.
        checkout.on("payment.failed", function (response) {
          showError(
            (response && response.error && response.error.description) ||
              "The payment did not go through. You have not been charged.",
          );
        });
        checkout.open();
      })
      .catch(function (error) {
        showError(error.message);
        setBusy(false);
      });
  });
})();
