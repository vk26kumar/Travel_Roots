"use strict";

/**
 * Runs Travel Roots locally against a private MongoDB instance filled with the
 * sample listings, so nothing touches your real database. Data is kept in
 * .data/demo-db between runs; pass --fresh to start over. Other settings in
 * .env (Cloudinary, OAuth, Razorpay) are still used when present. Set
 * SEED_PASSWORD in .env to choose the demo host's password.
 *
 *   npm run demo            start the demo
 *   npm run demo:watch      restart automatically when server code changes
 *   npm run demo -- --fresh discard demo data and seed again
 */

const fs = require("fs");
const path = require("path");
const { MongoMemoryServer } = require("mongodb-memory-server");

const DATA_DIR = path.join(__dirname, "..", ".data");
const DB_PATH = path.join(DATA_DIR, "demo-db");

async function main() {
  if (process.argv.includes("--fresh")) fs.rmSync(DATA_DIR, { recursive: true, force: true });
  fs.mkdirSync(DB_PATH, { recursive: true });

  const mongo = await MongoMemoryServer.create({
    instance: { dbPath: DB_PATH, storageEngine: "wiredTiger" },
  });
  // Set before config loads; values from .env never override variables that already exist.
  process.env.ATLASDB_URL = `${mongo.getUri()}travelroots_demo`;

  const mongoose = require("mongoose");
  const Listing = require("../src/models/listing");
  const { seed } = require("./seed");

  await mongoose.connect(process.env.ATLASDB_URL);
  if ((await Listing.estimatedDocumentCount()) === 0) await seed();
  await mongoose.disconnect();

  console.log("\nDemo database ready in .data/demo-db (your real database is not used).");
  console.log(
    'Sign in as "travelroots_host" with the SEED_PASSWORD from your .env, or create an account.\n',
  );

  const stopDatabase = () => mongo.stop({ doCleanup: false }).catch(() => {});
  process.once("SIGINT", stopDatabase);
  process.once("SIGTERM", stopDatabase);
  require("../server");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
