"use strict";

const User = require("../models/user");
const Listing = require("../models/listing");
const Review = require("../models/review");
const Booking = require("../models/booking");
const { deleteImage } = require("../services/images");
const { invalidateListingCache } = require("./listings");
const { ACTIVE_BOOKING_STATUSES, BOOKING_STATUS } = require("../utils/constants");

const TABS = ["trips", "saved", "listings", "hosting", "reviews"];

/** The profile page: trips, saved stays, hosted listings, reservations and reviews. */
module.exports.showProfile = async (req, res) => {
  const user = req.user;
  const tab = TABS.includes(req.query.tab) ? req.query.tab : "trips";
  const now = new Date();

  const [bookings, listings, reviews, savedUser] = await Promise.all([
    Booking.find({ user: user._id, status: { $ne: BOOKING_STATUS.CANCELLED } })
      .populate("listing", "title location country image")
      .sort({ fromDate: -1 })
      .lean(),
    Listing.find({ owner: user._id })
      .sort({ _id: -1 })
      .select("title price location country image category ratingAverage ratingCount")
      .lean(),
    Review.find({ author: user._id }).sort({ createdAt: -1 }).lean(),
    User.findById(user._id)
      .populate("wishlist", "title price location country image ratingAverage ratingCount")
      .lean(),
  ]);

  const listingIds = listings.map((listing) => listing._id);
  const reservations = listingIds.length
    ? await Booking.find({ listing: { $in: listingIds }, status: { $in: ACTIVE_BOOKING_STATUSES } })
        .populate("listing", "title")
        .populate("user", "username displayName")
        .sort({ fromDate: -1 })
        .limit(50)
        .lean()
    : [];

  // Reviews only store their listing on newer documents; resolve titles for display.
  const reviewListingIds = reviews.map((review) => review.listing).filter(Boolean);
  const reviewListings = await Listing.find({ _id: { $in: reviewListingIds } })
    .select("title")
    .lean();
  const titles = new Map(reviewListings.map((listing) => [listing._id.toString(), listing.title]));

  const isActive = (booking) => ACTIVE_BOOKING_STATUSES.includes(booking.status);
  const upcoming = bookings.filter((booking) => isActive(booking) && booking.toDate >= now);
  const past = bookings.filter((booking) => !upcoming.includes(booking));
  const wishlist = (savedUser.wishlist || []).filter(Boolean);
  const totalSpent = bookings.filter(isActive).reduce((sum, booking) => sum + booking.amount, 0);
  const totalEarned = reservations.reduce(
    (sum, booking) => sum + (booking.subtotal || booking.amount),
    0,
  );

  res.render("profile/show", {
    title: "Your profile",
    tab,
    upcoming,
    past,
    listings,
    reservations,
    wishlist,
    reviews: reviews.map((review) => ({
      ...review,
      listingTitle: review.listing ? titles.get(review.listing.toString()) : null,
    })),
    stats: {
      trips: bookings.filter(isActive).length,
      upcoming: upcoming.length,
      listings: listings.length,
      reviews: reviews.length,
      saved: wishlist.length,
      totalSpent,
      totalEarned,
    },
    saved: new Set(wishlist.map((listing) => listing._id.toString())),
  });
};

module.exports.renderSettings = async (req, res) => {
  res.render("profile/settings", {
    title: "Account settings",
    hasPassword: await User.hasPassword(req.user._id),
  });
};

module.exports.updateProfile = async (req, res) => {
  const { displayName, email, phone, location, bio } = req.body;
  const normalisedEmail = email.toLowerCase();

  if (normalisedEmail !== req.user.email) {
    const taken = await User.exists({ email: normalisedEmail, _id: { $ne: req.user._id } });
    if (taken) {
      req.flash("error", "That email address is already used by another account.");
      return res.redirect("/profile/settings");
    }
  }

  await User.updateOne(
    { _id: req.user._id },
    {
      displayName: displayName || undefined,
      email: normalisedEmail,
      phone: phone || undefined,
      location: location || undefined,
      bio: bio || undefined,
    },
  );

  req.flash("success", "Your profile has been updated.");
  return res.redirect("/profile/settings");
};

module.exports.changePassword = async (req, res) => {
  const user = await User.findById(req.user._id).select("+hash +salt");
  const { currentPassword, newPassword } = req.body;

  try {
    if (user.hash) {
      await user.changePassword(currentPassword || "", newPassword);
    } else {
      // Accounts created through Google or GitHub can add a password for local sign-in.
      await user.setPassword(newPassword);
      await user.save();
    }
  } catch (error) {
    req.flash(
      "error",
      error.name === "IncorrectPasswordError"
        ? "Your current password is incorrect."
        : "Your password could not be changed. Please try again.",
    );
    return res.redirect("/profile/settings#security");
  }

  req.flash("success", "Your password has been changed.");
  return res.redirect("/profile/settings#security");
};

/**
 * Permanently deletes the account, its listings and its reviews. Completed
 * bookings are retained for accounting but no longer linked to a profile.
 */
module.exports.deleteAccount = async (req, res, next) => {
  const user = req.user;

  if (req.body.confirmUsername !== user.username) {
    req.flash("error", "Type your username exactly to confirm account deletion.");
    return res.redirect("/profile/settings#danger");
  }

  const listings = await Listing.find({ owner: user._id }).select("_id image");
  const listingIds = listings.map((listing) => listing._id);

  const hostingUpcoming = await Booking.exists({
    listing: { $in: listingIds },
    status: { $in: ACTIVE_BOOKING_STATUSES },
    toDate: { $gte: new Date() },
  });
  if (hostingUpcoming) {
    req.flash(
      "error",
      "You are hosting upcoming stays. Your account can be deleted once they are complete.",
    );
    return res.redirect("/profile/settings#danger");
  }

  const reviews = await Review.find({ author: user._id }).select("_id listing");
  const reviewIds = reviews.map((review) => review._id);
  const affectedListings = await Listing.find({ reviews: { $in: reviewIds } }).select("_id");

  await Listing.updateMany(
    { reviews: { $in: reviewIds } },
    { $pull: { reviews: { $in: reviewIds } } },
  );
  await Review.deleteMany({ _id: { $in: reviewIds } });
  await Promise.all(affectedListings.map((listing) => Listing.refreshRating(listing._id)));

  for (const listing of listings) {
    await Listing.findOneAndDelete({ _id: listing._id });
    await deleteImage(listing.image && listing.image.filename);
  }
  await User.updateMany(
    { wishlist: { $in: listingIds } },
    { $pull: { wishlist: { $in: listingIds } } },
  );
  await Booking.deleteMany({
    user: user._id,
    status: { $in: [BOOKING_STATUS.PENDING, BOOKING_STATUS.FAILED, BOOKING_STATUS.CANCELLED] },
  });
  await User.deleteOne({ _id: user._id });
  invalidateListingCache();

  return req.logout((error) => {
    if (error) return next(error);
    req.flash("success", "Your account has been deleted. We are sorry to see you go.");
    return res.redirect("/listings");
  });
};
