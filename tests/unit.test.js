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
const {
  sessionStoreSecret,
  meetsStoreComplexity,
  CachedSessionStore,
} = require("../src/config/session");
const { testSecret, complexSecret, simpleSecret } = require("./fixtures");

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

  it("requests resized WebP images from Cloudinary and Unsplash", () => {
    assert.equal(
      helpers.imageUrl("https://res.cloudinary.com/demo/image/upload/v1/a.jpg", { width: 400 }),
      "https://res.cloudinary.com/demo/image/upload/f_webp,q_auto:eco,c_fill,w_400/v1/a.jpg",
    );
    assert.equal(
      helpers.imageUrl("https://images.unsplash.com/photo-1?ixlib=rb&w=2000&q=90", {
        width: 400,
        height: 300,
      }),
      "https://images.unsplash.com/photo-1?w=400&q=60&fm=webp&fit=crop&h=300",
    );
    assert.equal(helpers.imageUrl("https://example.com/x.jpg"), "https://example.com/x.jpg");
    const spoofed = "https://evil.example/res.cloudinary.com/upload/v1/a.jpg";
    assert.equal(helpers.imageUrl(spoofed), spoofed, "hostnames are matched exactly");
    assert.equal(helpers.imageSrcset(spoofed, [400], 1), "");
    assert.equal(helpers.imageUrl(""), "/images/placeholder.svg");
    assert.match(
      helpers.imageSrcset("https://images.unsplash.com/photo-1", [400, 800], 4 / 3),
      /w=400.*400w, .*w=800.*800w$/,
    );
    assert.equal(helpers.imageSrcset("", [400], 1), "");
  });

  it("renders sprite icons with an accessible default", () => {
    assert.match(helpers.icon("search"), /aria-hidden="true"/);
    assert.match(helpers.icon("search"), /icons\.svg\?v=[a-f0-9]+#i-search/);
    assert.match(helpers.icon("star", { label: "Rated <5>" }), /aria-label="Rated &lt;5&gt;"/);
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
    const cleaned = clean(body);
    assert.deepEqual(cleaned, { listing: { title: "ok", nested: { keep: 2 } } });
    assert.equal(Object.getPrototypeOf(cleaned), Object.prototype);
    assert.notEqual(cleaned, body, "a new object is returned");
  });

  it("drops input nested beyond the depth limit", () => {
    let deep = { $gt: 1 };
    for (let i = 0; i < 15; i += 1) deep = { next: deep };
    assert.ok(!JSON.stringify(clean(deep)).includes("$gt"));
  });
});

describe("payment signatures", () => {
  it("verifies checkout and webhook signatures", () => {
    const keySecret = testSecret();
    const webhookSecret = testSecret();
    config.razorpay.keySecret = keySecret;
    config.razorpay.webhookSecret = webhookSecret;

    const signature = crypto.createHmac("sha256", keySecret).update("order_1|pay_1").digest("hex");
    assert.ok(
      payments.verifyPaymentSignature({ orderId: "order_1", paymentId: "pay_1", signature }),
    );
    assert.ok(
      !payments.verifyPaymentSignature({ orderId: "order_2", paymentId: "pay_1", signature }),
    );

    const body = Buffer.from('{"event":"payment.captured"}');
    const hook = crypto.createHmac("sha256", webhookSecret).update(body).digest("hex");
    assert.ok(payments.verifyWebhookSignature(body, hook));
    assert.ok(!payments.verifyWebhookSignature(body, "0".repeat(64)));
  });
});

describe("session store secret", () => {
  it("keeps compliant secrets and strengthens weak ones deterministically", () => {
    const strong = complexSecret();
    assert.equal(sessionStoreSecret(strong), strong);

    const weak = simpleSecret();
    assert.ok(!meetsStoreComplexity(weak));
    assert.ok(meetsStoreComplexity(sessionStoreSecret(weak)));
    assert.equal(sessionStoreSecret(weak), sessionStoreSecret(weak));
    assert.notEqual(sessionStoreSecret(weak), sessionStoreSecret(simpleSecret()));
  });
});

describe("cached session store", () => {
  function fakeStore() {
    const data = new Map();
    const calls = { get: 0, set: 0, touch: 0, destroy: 0 };
    return {
      calls,
      get(sid, cb) {
        calls.get += 1;
        cb(null, data.has(sid) ? { ...data.get(sid), lastModified: new Date(0) } : null);
      },
      set(sid, sess, cb) {
        calls.set += 1;
        data.set(sid, sess);
        cb(null);
      },
      touch(sid, sess, cb) {
        calls.touch += 1;
        cb(null);
      },
      destroy(sid, cb) {
        calls.destroy += 1;
        data.delete(sid);
        cb(null);
      },
    };
  }
  const read = (store, sid) => new Promise((resolve) => store.get(sid, (e, s) => resolve(s)));
  const future = () => new Date(Date.now() + 60000).toISOString();

  it("serves reads from memory after a write and still persists the write", async () => {
    const inner = fakeStore();
    const store = new CachedSessionStore(inner);
    store.set("a", { cookie: { expires: future() }, passport: { user: "u1" } }, () => {});
    const session = await read(store, "a");
    assert.equal(session.passport.user, "u1");
    assert.ok(session.lastModified instanceof Date);
    assert.equal(inner.calls.get, 0);
    assert.equal(inner.calls.set, 1);
  });

  it("falls back to the database once and then caches", async () => {
    const inner = fakeStore();
    inner.set("b", { cookie: { expires: future() }, value: 1 }, () => {});
    const store = new CachedSessionStore(inner);
    await read(store, "b");
    await read(store, "b");
    assert.equal(inner.calls.get, 1);
  });

  it("ignores expired cached sessions and forgets destroyed ones", async () => {
    const inner = fakeStore();
    const store = new CachedSessionStore(inner);
    store.set("c", { cookie: { expires: new Date(Date.now() - 1000).toISOString() } }, () => {});
    await read(store, "c");
    assert.equal(inner.calls.get, 1, "an expired entry is not served from memory");

    store.set("d", { cookie: { expires: future() } }, () => {});
    await new Promise((resolve) => store.destroy("d", resolve));
    assert.equal(await read(store, "d"), null);
  });
});
