"use strict";

process.env.NODE_ENV = "test";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("crypto");

const { validateStay, quote, parseDate } = require("../src/services/pricing");
const helpers = require("../src/utils/helpers");
const { clean } = require("../src/middleware/sanitize");
const config = require("../src/config");
const payments = require("../src/services/payments");
const { sessionStoreSecret, meetsStoreComplexity } = require("../src/config/session");

const NOW = new Date("2026-10-02T10:00:00Z");

describe("pricing", () => {
  it("parses strict ISO dates only", () => {
    assert.equal(parseDate("2026-10-05").toISOString(), "2026-10-05T00:00:00.000Z");
    assert.equal(parseDate("2026-02-30"), null);
    assert.equal(parseDate("05/10/2026"), null);
    assert.equal(parseDate(undefined), null);
  });

  it("calculates nights between valid dates", () => {
    const stay = validateStay("2026-10-05", "2026-10-08", NOW);
    assert.equal(stay.nights, 3);
  });

  it("rejects check-out on or before check-in", () => {
    assert.throws(() => validateStay("2026-10-05", "2026-10-05", NOW), /at least one day/);
    assert.throws(() => validateStay("2026-10-06", "2026-10-05", NOW), /at least one day/);
  });

  it("rejects past dates, long stays and far-future bookings", () => {
    assert.throws(() => validateStay("2026-09-01", "2026-09-03", NOW), /past/);
    assert.throws(() => validateStay("2026-10-05", "2026-11-20", NOW), /limited/);
    assert.throws(() => validateStay("2028-01-01", "2028-01-03", NOW), /in advance/);
  });

  it("computes GST in paise without floating point drift", () => {
    const result = quote(1999, 3, 0.18);
    assert.equal(result.subtotal, 5997);
    assert.equal(result.tax, 1079.46);
    assert.equal(result.total, 7076.46);
    assert.equal(result.totalPaise, 707646);
  });
});

describe("helpers", () => {
  it("escapes regular expression metacharacters", () => {
    const pattern = new RegExp(helpers.escapeRegex("a.b*(c)"));
    assert.ok(pattern.test("a.b*(c)"));
    assert.ok(!pattern.test("aXbbbc"));
  });

  it("only allows same-origin redirect paths", () => {
    assert.equal(helpers.safeRedirectPath("/listings/1"), "/listings/1");
    assert.equal(helpers.safeRedirectPath("//evil.example"), "/listings");
    assert.equal(helpers.safeRedirectPath("https://evil.example"), "/listings");
    assert.equal(helpers.safeRedirectPath("/\\evil.example"), "/listings");
  });

  it("normalises query values", () => {
    assert.equal(helpers.queryString(["goa", "manali"]), "goa");
    assert.equal(helpers.queryString({ $ne: 1 }), "");
    assert.equal(helpers.clampInt("999", { min: 1, max: 5 }), 5);
    assert.equal(helpers.clampInt("abc", { min: 1, max: 5, fallback: 1 }), 1);
  });

  it("adds Cloudinary transformations only to Cloudinary URLs", () => {
    assert.equal(
      helpers.imageUrl("https://res.cloudinary.com/demo/image/upload/v1/a.jpg", { width: 400 }),
      "https://res.cloudinary.com/demo/image/upload/f_auto,q_auto,c_fill,w_400/v1/a.jpg",
    );
    assert.equal(
      helpers.imageUrl("https://images.unsplash.com/x"),
      "https://images.unsplash.com/x",
    );
    assert.equal(helpers.imageUrl(""), "/images/placeholder.svg");
  });

  it("formats currency and initials", () => {
    assert.equal(helpers.formatINR(150000), "₹1,50,000");
    assert.equal(helpers.initials("vishal_kumar"), "VK");
    assert.equal(helpers.initials(""), "?");
  });

  it("compares secrets in constant time", () => {
    assert.ok(helpers.safeEqual("abc", "abc"));
    assert.ok(!helpers.safeEqual("abc", "abd"));
    assert.ok(!helpers.safeEqual("abc", "abcd"));
    assert.ok(!helpers.safeEqual(undefined, "abc"));
  });
});

describe("request sanitising", () => {
  it("removes operator and prototype keys recursively", () => {
    const body = JSON.parse(
      '{"listing":{"title":"ok","$where":"1","nested":{"a.b":1,"keep":2}},"__proto__":{"x":1}}',
    );
    clean(body);
    assert.deepEqual(body, { listing: { title: "ok", nested: { keep: 2 } } });
  });
});

describe("payment signatures", () => {
  it("verifies checkout and webhook signatures", () => {
    config.razorpay.keySecret = "unit_secret";
    config.razorpay.webhookSecret = "hook_secret";

    const signature = crypto
      .createHmac("sha256", "unit_secret")
      .update("order_1|pay_1")
      .digest("hex");
    assert.ok(
      payments.verifyPaymentSignature({ orderId: "order_1", paymentId: "pay_1", signature }),
    );
    assert.ok(
      !payments.verifyPaymentSignature({ orderId: "order_2", paymentId: "pay_1", signature }),
    );

    const body = Buffer.from('{"event":"payment.captured"}');
    const hook = crypto.createHmac("sha256", "hook_secret").update(body).digest("hex");
    assert.ok(payments.verifyWebhookSignature(body, hook));
    assert.ok(!payments.verifyWebhookSignature(body, "0".repeat(64)));
  });
});

describe("session store secret", () => {
  it("keeps compliant secrets and strengthens weak ones deterministically", () => {
    const strong = "Ab-Cd_12";
    assert.equal(sessionStoreSecret(strong), strong);

    const weak = "all-lowercase-secret-123";
    assert.ok(!meetsStoreComplexity(weak));
    assert.ok(meetsStoreComplexity(sessionStoreSecret(weak)));
    assert.equal(sessionStoreSecret(weak), sessionStoreSecret(weak));
    assert.notEqual(sessionStoreSecret(weak), sessionStoreSecret("another-weak-secret-1"));
  });
});
