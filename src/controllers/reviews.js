"use strict";

const Review = require("../models/review");
const Listing = require("../models/listing");
const ExpressError = require("../utils/ExpressError");
const { invalidateListingCache } = require("./listings");

module.exports.createReview = async (req, res) => {
  const listing = await Listing.findById(req.params.id);
  if (!listing) throw new ExpressError(404, "This listing no longer exists.");

  if (listing.owner && listing.owner.equals(req.user._id)) {
    req.flash("error", "Hosts cannot review their own listing.");
    return res.redirect(`/listings/${listing._id}`);
  }

  const alreadyReviewed = await Review.exists({
    _id: { $in: listing.reviews },
    author: req.user._id,
  });
  if (alreadyReviewed) {
    req.flash("error", "You have already reviewed this stay.");
    return res.redirect(`/listings/${listing._id}#reviews`);
  }

  const review = await Review.create({
    ...req.body.review,
    author: req.user._id,
    listing: listing._id,
  });
  await Listing.updateOne({ _id: listing._id }, { $push: { reviews: review._id } });
  await Listing.refreshRating(listing._id);
  invalidateListingCache();

  req.flash("success", "Thanks for sharing your experience.");
  return res.redirect(`/listings/${listing._id}#reviews`);
};

module.exports.deleteReview = async (req, res) => {
  const { id, reviewId } = req.params;
  await Listing.updateOne({ _id: id }, { $pull: { reviews: reviewId } });
  await Review.deleteOne({ _id: reviewId });
  await Listing.refreshRating(id);
  invalidateListingCache();

  req.flash("success", "Review deleted.");
  return res.redirect(`/listings/${id}#reviews`);
};
