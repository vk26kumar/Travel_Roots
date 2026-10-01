"use strict";

/**
 * One-off data migration from the 1.x schema to 2.0. Safe to run repeatedly.
 *
 *   1. Renames the "Ionic Cities" category to "Iconic Cities".
 *   2. Links each review to its listing.
 *   3. Converts booking dates stored as strings into real dates.
 *   4. Recalculates every listing's rating summary.
 *
 * Usage: npm run migrate
 */

const mongoose = require("mongoose");
const config = require("../src/config");
const Listing = require("../src/models/listing");
const Review = require("../src/models/review");
const Booking = require("../src/models/booking");

async function renameCategory() {
  const result = await Listing.collection.updateMany(
    { category: "Ionic Cities" },
    { $set: { category: "Iconic Cities" } },
  );
  console.log(`Categories renamed: ${result.modifiedCount}`);
}

async function linkReviews() {
  let linked = 0;
  const cursor = Listing.find({ "reviews.0": { $exists: true } })
    .select("reviews")
    .cursor();
  for await (const listing of cursor) {
    const result = await Review.collection.updateMany(
      { _id: { $in: listing.reviews }, listing: { $exists: false } },
      { $set: { listing: listing._id } },
    );
    linked += result.modifiedCount;
  }
  console.log(`Reviews linked to listings: ${linked}`);
}

async function convertBookingDates() {
  let converted = 0;
  const cursor = Booking.collection.find({
    $or: [{ fromDate: { $type: "string" } }, { toDate: { $type: "string" } }],
  });
  for await (const booking of cursor) {
    const fromDate = new Date(booking.fromDate);
    const toDate = new Date(booking.toDate);
    if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) {
      console.warn(`Skipping booking ${booking._id}: unparseable dates`);
      continue;
    }
    await Booking.collection.updateOne({ _id: booking._id }, { $set: { fromDate, toDate } });
    converted += 1;
  }
  console.log(`Booking dates converted: ${converted}`);
}

async function refreshRatings() {
  let refreshed = 0;
  const cursor = Listing.find().select("_id").cursor();
  for await (const listing of cursor) {
    await Listing.refreshRating(listing._id);
    refreshed += 1;
  }
  console.log(`Ratings recalculated: ${refreshed}`);
}

async function main() {
  await mongoose.connect(config.db.url);
  console.log(`Connected to ${mongoose.connection.host}/${mongoose.connection.name}`);
  await renameCategory();
  await linkReviews();
  await convertBookingDates();
  await refreshRatings();
  console.log("Migration complete.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
