"use strict";

const Listing = require("../models/listing");
const Review = require("../models/review");
const Booking = require("../models/booking");
const ExpressError = require("../utils/ExpressError");
const { safeRedirectPath } = require("../utils/helpers");

function wantsJson(req) {
  return req.xhr || req.is("application/json") || (req.get("accept") || "").includes("json");
}

/** Requires an authenticated user, remembering where they were heading. */
function isLoggedIn(req, res, next) {
  if (req.isAuthenticated()) return next();

  if (wantsJson(req)) return next(new ExpressError(401, "Please sign in to continue."));

  if (req.method === "GET") req.session.redirectUrl = safeRedirectPath(req.originalUrl);
  req.flash("error", "Please sign in to continue.");
  return res.redirect("/login");
}

/** Redirects already-authenticated users away from the login and signup pages. */
function isGuest(req, res, next) {
  if (req.isAuthenticated()) return res.redirect("/listings");
  return next();
}

/**
 * Copies the remembered destination into `res.locals` because Passport
 * regenerates the session on login, which discards session data.
 */
function saveRedirectUrl(req, res, next) {
  if (req.session.redirectUrl) {
    res.locals.redirectUrl = safeRedirectPath(req.session.redirectUrl);
    delete req.session.redirectUrl;
  }
  next();
}

/** Loads the listing into `res.locals.listing` and checks that the user owns it. */
async function isOwner(req, res, next) {
  const listing = await Listing.findById(req.params.id);
  if (!listing) throw new ExpressError(404, "This listing no longer exists.");

  if (!listing.owner || !listing.owner.equals(req.user._id)) {
    req.flash("error", "Only the host of this listing can do that.");
    return res.redirect(`/listings/${listing._id}`);
  }

  res.locals.listing = listing;
  return next();
}

async function isReviewAuthor(req, res, next) {
  const { id, reviewId } = req.params;
  const review = await Review.findById(reviewId);
  if (!review) throw new ExpressError(404, "This review no longer exists.");

  if (!review.author.equals(req.user._id)) {
    req.flash("error", "You can only delete reviews you wrote.");
    return res.redirect(`/listings/${id}`);
  }
  return next();
}

/** Allows the guest who made a booking, or the host of the listing, to view it. */
async function canViewBooking(req, res, next) {
  const booking = await Booking.findById(req.params.id).populate("listing").populate("user");
  if (!booking) throw new ExpressError(404, "Booking not found.");

  const userId = req.user._id;
  const isGuestUser = booking.user && booking.user._id.equals(userId);
  const isHost = booking.listing && booking.listing.owner && booking.listing.owner.equals(userId);

  if (!isGuestUser && !isHost) {
    throw new ExpressError(404, "Booking not found.");
  }

  res.locals.booking = booking;
  res.locals.viewerIsHost = Boolean(isHost && !isGuestUser);
  return next();
}

module.exports = {
  isLoggedIn,
  isGuest,
  saveRedirectUrl,
  isOwner,
  isReviewAuthor,
  canViewBooking,
  wantsJson,
};
