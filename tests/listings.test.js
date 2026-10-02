"use strict";

const { describe, it, before, after, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const h = require("./helpers");
const images = require("../src/services/images");
const Listing = require("../src/models/listing");
const Review = require("../src/models/review");
const User = require("../src/models/user");

describe("listings, reviews and wishlist", () => {
  let app;
  const originalUpload = images.uploadImage;

  before(async () => {
    await h.connectDatabase();
    app = h.buildApp();
    images.uploadImage = async () => ({
      url: "https://res.cloudinary.com/demo/image/upload/v1/test.jpg",
      filename: "Travel_Roots_DATA/test",
    });
  });
  after(async () => {
    images.uploadImage = originalUpload;
    await h.disconnectDatabase();
  });
  beforeEach(h.clearDatabase);

  it("filters by category and searches without regex injection", async () => {
    const { user } = await h.signUp(app);
    await h.createListing(user, { title: "Farm Stay", category: "Farms", location: "Nashik" });
    await h.createListing(user, { title: "Peak Cabin", category: "Mountain", location: "Manali" });

    const farms = await h.request(app).get("/listings?category=Farms");
    assert.match(farms.text, /Farm Stay/);
    assert.doesNotMatch(farms.text, /Peak Cabin/);

    const search = await h.request(app).get("/listings?search=manali");
    assert.match(search.text, /Peak Cabin/);
    assert.doesNotMatch(search.text, /Farm Stay/);

    const injection = await h.request(app).get("/listings?search=.*");
    assert.equal(injection.status, 200);
    assert.match(injection.text, /<strong>0<\/strong> stays/);
  });

  it("filters stays by price per night", async () => {
    const { user } = await h.signUp(app);
    await h.createListing(user, { title: "Budget Hut", price: 900 });
    await h.createListing(user, { title: "Mid Cabin", price: 2500 });
    await h.createListing(user, { title: "Luxury Villa", price: 9000 });

    const range = await h.request(app).get("/listings?minPrice=1000&maxPrice=5000");
    assert.match(range.text, /Mid Cabin/);
    assert.doesNotMatch(range.text, /Budget Hut|Luxury Villa/);

    const swapped = await h.request(app).get("/listings?minPrice=5000&maxPrice=1000");
    assert.match(swapped.text, /Mid Cabin/);

    const ignored = await h.request(app).get("/listings?minPrice=abc&maxPrice=-5");
    assert.match(ignored.text, /<strong>3<\/strong> stays/);
  });

  it("creates a listing through the upload form with validation", async () => {
    const { agent, user } = await h.signUp(app);
    const token = h.extractCsrf((await agent.get("/listings/new")).text);

    const response = await agent
      .post("/listings")
      .field("_csrf", token)
      .field("listing[title]", "Riverside Cottage")
      .field("listing[description]", "Wake up to the sound of the river every morning.")
      .field("listing[category]", "Farms")
      .field("listing[price]", "3200")
      .field("listing[location]", "Rishikesh")
      .field("listing[country]", "India")
      .field("listing[phone]", "+91 99999 11111")
      .field("listing[email]", "host@example.com")
      .field("listing[owner]", "000000000000000000000000")
      .field("terms", "accepted")
      .attach("listing[image]", Buffer.from("fake-image"), {
        filename: "photo.jpg",
        contentType: "image/jpeg",
      });

    assert.equal(response.status, 302);
    const listing = await Listing.findOne({ title: "Riverside Cottage" });
    assert.ok(listing);
    assert.ok(listing.owner.equals(user._id), "owner cannot be overridden from the form");
    assert.equal(response.headers.location, `/listings/${listing._id}`);
  });

  it("rejects uploads that are not images", async () => {
    const { agent } = await h.signUp(app);
    const token = h.extractCsrf((await agent.get("/listings/new")).text);
    const response = await agent
      .post("/listings")
      .field("_csrf", token)
      .attach("listing[image]", Buffer.from("MZ"), {
        filename: "tool.exe",
        contentType: "application/octet-stream",
      });
    assert.equal(response.status, 400);
  });

  it("only lets the host edit or delete a listing", async () => {
    const host = await h.signUp(app);
    const other = await h.signUp(app);
    const listing = await h.createListing(host.user);

    const page = await other.agent.get(`/listings/${listing._id}`);
    assert.doesNotMatch(page.text, /Delete listing/);

    const edit = await other.agent.get(`/listings/${listing._id}/edit`);
    assert.equal(edit.headers.location, `/listings/${listing._id}`);

    const token = h.extractCsrf(page.text);
    await other.agent
      .post(`/listings/${listing._id}?_method=DELETE`)
      .type("form")
      .send({ _csrf: token });
    assert.ok(await Listing.exists({ _id: listing._id }));

    const hostPage = await host.agent.get(`/listings/${listing._id}`);
    assert.match(hostPage.text, /Delete listing/);
    const hostToken = h.extractCsrf(hostPage.text);
    await host.agent
      .post(`/listings/${listing._id}?_method=DELETE`)
      .type("form")
      .send({ _csrf: hostToken });
    assert.equal(await Listing.exists({ _id: listing._id }), null);
  });

  it("allows one review per guest and keeps the rating summary current", async () => {
    const host = await h.signUp(app);
    const guest = await h.signUp(app);
    const listing = await h.createListing(host.user);

    const post = async (agent, rating) => {
      const token = h.extractCsrf((await agent.get(`/listings/${listing._id}`)).text);
      return agent
        .post(`/listings/${listing._id}/reviews`)
        .type("form")
        .send({ _csrf: token, review: { rating, comment: "Lovely, quiet stay." } });
    };

    await post(guest.agent, 4);
    await post(guest.agent, 1);
    assert.equal(await Review.countDocuments(), 1);

    await post(host.agent, 5);
    assert.equal(await Review.countDocuments(), 1, "hosts cannot review their own listing");

    const refreshed = await Listing.findById(listing._id);
    assert.equal(refreshed.ratingAverage, 4);
    assert.equal(refreshed.ratingCount, 1);

    const review = await Review.findOne();
    const token = h.extractCsrf((await guest.agent.get(`/listings/${listing._id}`)).text);
    await guest.agent
      .post(`/listings/${listing._id}/reviews/${review._id}?_method=DELETE`)
      .type("form")
      .send({ _csrf: token });
    const afterDelete = await Listing.findById(listing._id);
    assert.equal(afterDelete.ratingCount, 0);
  });

  it("toggles a stay in the wishlist over JSON", async () => {
    const host = await h.signUp(app);
    const guest = await h.signUp(app);
    const listing = await h.createListing(host.user);

    const page = await guest.agent.get("/listings");
    const token = h.extractCsrf(page.text);

    const save = await guest.agent
      .post(`/listings/${listing._id}/wishlist`)
      .set("Accept", "application/json")
      .set("X-CSRF-Token", token)
      .send({});
    assert.equal(save.status, 200);
    assert.equal(save.body.saved, true);
    assert.equal((await User.findById(guest.user._id)).wishlist.length, 1);

    const saved = await guest.agent.get("/profile?tab=saved");
    assert.match(saved.text, /Lake House/);

    const remove = await guest.agent
      .post(`/listings/${listing._id}/wishlist`)
      .set("Accept", "application/json")
      .set("X-CSRF-Token", token)
      .send({});
    assert.equal(remove.body.saved, false);
  });
});
