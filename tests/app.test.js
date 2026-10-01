"use strict";

const { describe, it, before, after, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const h = require("./helpers");

describe("application", () => {
  let app;

  before(async () => {
    await h.connectDatabase();
    app = h.buildApp();
  });
  after(h.disconnectDatabase);
  beforeEach(h.clearDatabase);

  it("serves health and readiness probes", async () => {
    const health = await h.request(app).get("/healthz");
    assert.equal(health.status, 200);
    assert.equal(health.body.status, "ok");

    const ready = await h.request(app).get("/readyz");
    assert.equal(ready.status, 200);
    assert.equal(ready.body.status, "ready");
  });

  it("sends strict security headers", async () => {
    const response = await h.request(app).get("/listings");
    assert.equal(response.status, 200);
    const csp = response.headers["content-security-policy"];
    assert.match(csp, /script-src 'self'/);
    assert.doesNotMatch(csp, /script-src[^;]*unsafe-inline/);
    assert.match(csp, /frame-ancestors 'none'/);
    assert.equal(response.headers["x-content-type-options"], "nosniff");
    assert.equal(response.headers["x-powered-by"], undefined);
  });

  it("does not create a session cookie for anonymous browsing", async () => {
    const response = await h.request(app).get("/listings");
    assert.equal(response.headers["set-cookie"], undefined);
  });

  it("renders the legal pages and the cookie banner", async () => {
    for (const path of ["/privacy", "/terms", "/cookies"]) {
      const response = await h.request(app).get(path);
      assert.equal(response.status, 200, path);
    }
    const page = await h.request(app).get("/cookies");
    assert.match(page.text, /id="cookieBanner"/);
    assert.match(page.text, /cookiePreferencesForm/);
  });

  it("hides the cookie banner once consent is recorded", async () => {
    const consent = encodeURIComponent(JSON.stringify({ v: 1, preferences: false }));
    const response = await h.request(app).get("/listings").set("Cookie", `tr_consent=${consent}`);
    assert.match(response.text, /id="cookieBanner"[^>]*hidden/);
  });

  it("returns a styled 404 for unknown pages and invalid ids", async () => {
    const missing = await h.request(app).get("/does-not-exist");
    assert.equal(missing.status, 404);
    assert.match(missing.text, /Page not found/);

    const badId = await h.request(app).get("/listings/not-an-id");
    assert.equal(badId.status, 404);
  });

  it("rejects state-changing requests without a CSRF token", async () => {
    const response = await h
      .request(app)
      .post("/login")
      .type("form")
      .send({ username: "a", password: "b" });
    assert.equal(response.status, 403);
  });

  it("rejects payment webhooks with an invalid signature", async () => {
    const response = await h
      .request(app)
      .post("/webhook/razorpay")
      .set("Content-Type", "application/json")
      .set("X-Razorpay-Signature", "invalid")
      .send('{"event":"payment.captured"}');
    assert.equal(response.status, 400);
  });

  it("redirects the legacy dashboard URL to the profile", async () => {
    const response = await h.request(app).get("/dashboard");
    assert.equal(response.status, 301);
    assert.equal(response.headers.location, "/profile");
  });
});
