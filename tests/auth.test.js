"use strict";

const { describe, it, before, after, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const h = require("./helpers");
const User = require("../src/models/user");

describe("authentication and profile", () => {
  let app;

  before(async () => {
    await h.connectDatabase();
    app = h.buildApp();
  });
  after(h.disconnectDatabase);
  beforeEach(h.clearDatabase);

  it("signs up, signs out and signs back in", async () => {
    const { agent, credentials } = await h.signUp(app);

    const profile = await agent.get("/profile");
    assert.equal(profile.status, 200);
    assert.match(profile.text, new RegExp(`@${credentials.username}`));

    const logoutToken = h.extractCsrf(profile.text);
    const logout = await agent.post("/logout").type("form").send({ _csrf: logoutToken });
    assert.equal(logout.status, 302);
    assert.equal((await agent.get("/profile")).headers.location, "/login");

    // The protected page the visitor tried to open is remembered across sign-in.
    const loginToken = await h.csrfFor(agent, "/login");
    const login = await agent
      .post("/login")
      .type("form")
      .send({ username: credentials.username, password: credentials.password, _csrf: loginToken });
    assert.equal(login.headers.location, "/profile");
    assert.equal((await agent.get("/profile")).status, 200);
  });

  it("does not store the password in plain text", async () => {
    const { user, credentials } = await h.signUp(app);
    const stored = await User.findById(user._id).select("+hash +salt").lean();
    assert.ok(stored.hash && stored.salt);
    assert.ok(!JSON.stringify(stored).includes(credentials.password));
  });

  it("rejects weak passwords and invalid usernames", async () => {
    const agent = h.request.agent(app);
    const token = await h.csrfFor(agent, "/signup");
    const response = await agent
      .post("/signup")
      .type("form")
      .send({ username: "a b", email: "x@example.com", password: "short", _csrf: token });
    assert.equal(response.headers.location, "/signup");
    assert.equal(await User.countDocuments(), 0);
  });

  it("uses the same message for unknown users and wrong passwords", async () => {
    const { credentials } = await h.signUp(app);
    const agent = h.request.agent(app);

    const attempt = async (username, password) => {
      const token = await h.csrfFor(agent, "/login");
      await agent.post("/login").type("form").send({ username, password, _csrf: token });
      return (await agent.get("/login")).text.match(/Invalid username or password/) !== null;
    };

    assert.ok(await attempt(credentials.username, "WrongPass1"));
    assert.ok(await attempt("nobody-here", "WrongPass1"));
  });

  it("redirects guests to the login page and back afterwards", async () => {
    const { credentials } = await h.signUp(app);
    const agent = h.request.agent(app);

    const guarded = await agent.get("/profile/settings");
    assert.equal(guarded.headers.location, "/login");

    const token = await h.csrfFor(agent, "/login");
    const login = await agent
      .post("/login")
      .type("form")
      .send({ username: credentials.username, password: credentials.password, _csrf: token });
    assert.equal(login.headers.location, "/profile/settings");
  });

  it("updates the profile and changes the password", async () => {
    const { agent, user, credentials } = await h.signUp(app);
    let token = h.extractCsrf((await agent.get("/profile/settings")).text);

    const update = await agent.post("/profile?_method=PUT").type("form").send({
      _csrf: token,
      displayName: "Asha Rao",
      email: credentials.email,
      phone: "+91 90000 00000",
      location: "Pune, India",
      bio: "Weekend hiker.",
      username: "attempted-change",
    });
    assert.equal(update.status, 302);

    const updated = await User.findById(user._id);
    assert.equal(updated.displayName, "Asha Rao");
    assert.equal(updated.username, credentials.username);

    token = h.extractCsrf((await agent.get("/profile/settings")).text);
    await agent.post("/profile/password?_method=PUT").type("form").send({
      _csrf: token,
      currentPassword: credentials.password,
      newPassword: "BrandNew456",
      confirmPassword: "BrandNew456",
    });
    const { user: authenticated } = await User.authenticate()(credentials.username, "BrandNew456");
    assert.ok(authenticated);
  });

  it("issues single-use password reset tokens", async () => {
    const { credentials } = await h.signUp(app);
    const agent = h.request.agent(app);

    const token = await h.csrfFor(agent, "/forgot-password");
    const response = await agent
      .post("/forgot-password")
      .type("form")
      .send({ email: credentials.email, _csrf: token });
    assert.equal(response.headers.location, "/login");

    const stored = await User.findOne({ email: credentials.email }).select(
      "+resetPasswordTokenHash",
    );
    assert.ok(stored.resetPasswordTokenHash);
    assert.equal(stored.resetPasswordTokenHash.length, 64);

    const invalid = await agent.get(`/reset-password/${"a".repeat(64)}`);
    assert.equal(invalid.headers.location, "/forgot-password");
  });

  it("deletes the account only after confirmation", async () => {
    const { agent, user, credentials } = await h.signUp(app);
    let token = h.extractCsrf((await agent.get("/profile/settings")).text);

    await agent
      .post("/profile?_method=DELETE")
      .type("form")
      .send({ _csrf: token, confirmUsername: "wrong" });
    assert.ok(await User.exists({ _id: user._id }));

    token = h.extractCsrf((await agent.get("/profile/settings")).text);
    await agent
      .post("/profile?_method=DELETE")
      .type("form")
      .send({ _csrf: token, confirmUsername: credentials.username });
    assert.equal(await User.exists({ _id: user._id }), null);
  });
});
