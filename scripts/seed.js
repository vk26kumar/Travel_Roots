"use strict";

/**
 * Seeds the database with sample listings owned by a demo host account.
 *
 * Usage:
 *   npm run seed               Replace the demo host's listings only.
 *   npm run seed -- --reset    Delete ALL listings, reviews and bookings first.
 *
 * Refuses to run against a production environment unless --force is given.
 */

const crypto = require("crypto");
const mongoose = require("mongoose");
const config = require("../src/config");
const Listing = require("../src/models/listing");
const Review = require("../src/models/review");
const Booking = require("../src/models/booking");
const User = require("../src/models/user");
const sampleListings = require("./seed-data");

const DEMO_USERNAME = "travelroots_host";
const DEMO_EMAIL = "host@travelroots.app";

async function findOrCreateDemoHost() {
  const existing = await User.findOne({ username: DEMO_USERNAME });
  if (existing) return { user: existing, password: null };

  const password = process.env.SEED_PASSWORD || `Host-${crypto.randomBytes(6).toString("hex")}1`;
  const user = await User.register(
    new User({
      username: DEMO_USERNAME,
      email: DEMO_EMAIL,
      displayName: "Travel Roots Host",
      bio: "Demo host account created by the seed script.",
    }),
    password,
  );
  return { user, password };
}

/** Inserts the sample listings. Expects an open Mongoose connection. */
async function seed({ reset = false } = {}) {
  if (reset) {
    await Promise.all([Listing.deleteMany({}), Review.deleteMany({}), Booking.deleteMany({})]);
    console.log("Removed all listings, reviews and bookings.");
  }

  const { user, password } = await findOrCreateDemoHost();
  await Listing.deleteMany({ owner: user._id });

  const listings = sampleListings.map((listing) => ({
    ...listing,
    owner: user._id,
    phone: "+91 98765 43210",
    email: DEMO_EMAIL,
  }));
  await Listing.insertMany(listings);

  console.log(`Inserted ${listings.length} listings owned by "${DEMO_USERNAME}".`);
  if (password) console.log(`Demo host password: ${password}`);
  return { username: DEMO_USERNAME, password };
}

async function main() {
  const args = new Set(process.argv.slice(2));
  if (config.isProduction && !args.has("--force")) {
    throw new Error("Refusing to seed a production database. Pass --force if you are certain.");
  }

  await mongoose.connect(config.db.url);
  console.log(`Connected to ${mongoose.connection.host}/${mongoose.connection.name}`);
  await seed({ reset: args.has("--reset") });
}

if (require.main === module) {
  main()
    .catch((error) => {
      console.error(error.message);
      process.exitCode = 1;
    })
    .finally(() => mongoose.disconnect());
}

module.exports = { seed };
