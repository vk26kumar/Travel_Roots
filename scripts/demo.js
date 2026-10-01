"use strict";

/**
 * Runs Travel Roots locally against a temporary in-memory MongoDB filled with
 * the sample listings. Nothing is written to your real database; the data is
 * discarded when the process stops. Other settings in .env (Cloudinary,
 * OAuth, Razorpay) are still used when present.
 *
 * Usage: npm run demo
 */

const { MongoMemoryServer } = require("mongodb-memory-server");

async function main() {
  const mongo = await MongoMemoryServer.create();
  // Set before config loads; dotenv never overrides variables that already exist.
  process.env.ATLASDB_URL = `${mongo.getUri()}travelroots_demo`;

  const mongoose = require("mongoose");
  const { seed } = require("./seed");
  await mongoose.connect(process.env.ATLASDB_URL);
  const { username, password } = await seed();
  await mongoose.disconnect();

  console.log("\nDemo database ready (in memory, discarded on exit).");
  console.log(`Sign in as "${username}" with password "${password}", or create a new account.\n`);

  process.on("exit", () => mongo.stop().catch(() => {}));
  require("../server");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
