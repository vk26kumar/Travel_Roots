"use strict";

process.env.NODE_ENV = "test";

const mongoose = require("mongoose");
const request = require("supertest");
const { createApp } = require("../src/app");
const User = require("../src/models/user");
const Listing = require("../src/models/listing");

let memoryServer = null;

/**
 * Connects to MongoDB for an integration test file. Uses MONGODB_URI_TEST when
 * provided (as in CI), otherwise starts an in-memory MongoDB instance.
 */
async function connectDatabase() {
  let uri = process.env.MONGODB_URI_TEST;
  if (!uri) {
    const { MongoMemoryServer } = require("mongodb-memory-server");
    memoryServer = await MongoMemoryServer.create();
    uri = memoryServer.getUri();
  }
  const dbName = `travelroots_test_${process.pid}_${Date.now()}`;
  await mongoose.connect(uri, { dbName });
  await Promise.all(Object.values(mongoose.models).map((model) => model.init()));
}

async function disconnectDatabase() {
  if (mongoose.connection.readyState === 1) {
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  }
  if (memoryServer) await memoryServer.stop();
}

async function clearDatabase() {
  await Promise.all(
    Object.values(mongoose.connection.collections).map((collection) => collection.deleteMany({})),
  );
}

function buildApp() {
  return createApp();
}

/** Extracts the CSRF token from a rendered page (hidden field or meta tag). */
function extractCsrf(html) {
  const match =
    html.match(/name="_csrf" value="([a-f0-9]{64})"/) ||
    html.match(/name="csrf-token" content="([a-f0-9]{64})"/);
  if (!match) throw new Error("No CSRF token found in page");
  return match[1];
}

async function csrfFor(agent, path = "/login") {
  const response = await agent.get(path);
  return extractCsrf(response.text);
}

let userCounter = 0;

/** Registers a user through the real signup form and returns the signed-in agent. */
async function signUp(app, overrides = {}) {
  userCounter += 1;
  const credentials = {
    username: `traveller${userCounter}`,
    email: `traveller${userCounter}@example.com`,
    password: "Secret123",
    ...overrides,
  };
  const agent = request.agent(app);
  const _csrf = await csrfFor(agent, "/signup");
  const response = await agent
    .post("/signup")
    .type("form")
    .send({ ...credentials, _csrf });
  if (response.status !== 302 || response.headers.location !== "/listings") {
    throw new Error(`Signup failed with ${response.status} -> ${response.headers.location}`);
  }
  const user = await User.findOne({ username: credentials.username });
  return { agent, user, credentials };
}

async function createListing(owner, overrides = {}) {
  return Listing.create({
    title: "Lake House",
    description: "A calm house by the lake with plenty of light.",
    image: { url: "https://images.unsplash.com/photo-1", filename: "listingimage" },
    price: 2000,
    location: "Udaipur",
    country: "India",
    category: "Farms",
    phone: "+91 98765 43210",
    email: "host@example.com",
    coordinates: { lat: 24.58, lon: 73.71 },
    owner: owner._id,
    ...overrides,
  });
}

module.exports = {
  connectDatabase,
  disconnectDatabase,
  clearDatabase,
  buildApp,
  extractCsrf,
  csrfFor,
  signUp,
  createListing,
  request,
};
