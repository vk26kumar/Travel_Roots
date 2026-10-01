"use strict";

const mongoose = require("mongoose");
const Review = require("./review");
const { CATEGORY_NAMES } = require("../utils/constants");

const { Schema } = mongoose;

const listingSchema = new Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 100 },
    description: { type: String, required: true, trim: true, maxlength: 2000 },
    image: {
      url: String,
      filename: String,
    },
    price: { type: Number, required: true, min: 1 },
    location: { type: String, required: true, trim: true, maxlength: 100 },
    country: { type: String, required: true, trim: true, maxlength: 60 },
    reviews: [{ type: Schema.Types.ObjectId, ref: "Review" }],
    owner: { type: Schema.Types.ObjectId, ref: "User", index: true },
    coordinates: {
      lat: Number,
      lon: Number,
    },
    category: { type: String, enum: CATEGORY_NAMES, required: true, index: true },
    phone: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    ratingAverage: { type: Number, default: 0, min: 0, max: 5 },
    ratingCount: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true },
);

/** Recomputes the denormalised rating summary from the listing's reviews. */
listingSchema.statics.refreshRating = async function refreshRating(listingId) {
  const listing = await this.findById(listingId).select("reviews");
  if (!listing) return;

  const [summary] = await Review.aggregate([
    { $match: { _id: { $in: listing.reviews } } },
    { $group: { _id: null, average: { $avg: "$rating" }, count: { $sum: 1 } } },
  ]);

  await this.updateOne(
    { _id: listingId },
    {
      ratingAverage: summary ? Math.round(summary.average * 10) / 10 : 0,
      ratingCount: summary ? summary.count : 0,
    },
  );
};

listingSchema.post("findOneAndDelete", async (listing) => {
  if (listing) {
    await Review.deleteMany({ _id: { $in: listing.reviews } });
  }
});

module.exports = mongoose.model("Listing", listingSchema);
