"use strict";

const Listing = require("../models/listing");
const Booking = require("../models/booking");
const User = require("../models/user");
const config = require("../config");
const ExpressError = require("../utils/ExpressError");
const images = require("../services/images");
const { geocode } = require("../services/geocode");
const { escapeRegex, queryString, clampInt } = require("../utils/helpers");
const TtlCache = require("../utils/cache");
const {
  CATEGORY_NAMES,
  SORT_OPTIONS,
  PAGE_SIZE,
  ACTIVE_BOOKING_STATUSES,
} = require("../utils/constants");

function wishlistIds(user) {
  return new Set(user ? user.wishlist.map((id) => id.toString()) : []);
}

/** Parses an optional whole-rupee price from the query string, or returns null. */
function priceParam(value) {
  const text = queryString(value, 10);
  if (!/^\d+$/.test(text)) return null;
  return Math.min(Number(text), 1000000);
}

/** Builds the Mongo filter for the browse page from validated query input. */
function buildFilter({ search, category, minPrice, maxPrice }) {
  const filter = {};
  if (search) {
    const pattern = new RegExp(escapeRegex(search), "i");
    filter.$or = [{ location: pattern }, { country: pattern }, { title: pattern }];
  }
  if (category) filter.category = category;
  if (minPrice !== null || maxPrice !== null) {
    filter.price = {};
    if (minPrice !== null) filter.price.$gte = minPrice;
    if (maxPrice !== null) filter.price.$lte = maxPrice;
  }
  return filter;
}

async function siteStats() {
  const [stays, countries, hosts] = await Promise.all([
    Listing.estimatedDocumentCount(),
    Listing.distinct("country"),
    Listing.distinct("owner"),
  ]);
  return { stays, countries: countries.length, hosts: hosts.length };
}

// Home page statistics change rarely; caching them saves several database round trips.
const landingCache = new TtlCache(5 * 60 * 1000);

/** Clears cached home page data after listings or ratings change. */
function invalidateListingCache() {
  landingCache.clear();
}

async function featuredListing() {
  return Listing.findOne({ ratingCount: { $gt: 0 } })
    .sort({ ratingAverage: -1, ratingCount: -1, _id: -1 })
    .select("title location country ratingAverage ratingCount")
    .lean();
}

function landingData() {
  return landingCache.get("landing", async () => {
    const [stats, destinations, featured] = await Promise.all([
      siteStats(),
      popularDestinations(),
      featuredListing(),
    ]);
    return { stats, destinations, featured };
  });
}

async function popularDestinations(limit = 6) {
  return Listing.aggregate([
    { $sort: { ratingAverage: -1, _id: -1 } },
    {
      $group: {
        _id: "$country",
        count: { $sum: 1 },
        image: { $first: "$image.url" },
        location: { $first: "$location" },
      },
    },
    { $sort: { count: -1, _id: 1 } },
    { $limit: limit },
  ]);
}

module.exports.index = async (req, res) => {
  const search = queryString(req.query.search);
  const requestedCategory = queryString(req.query.category);
  const category = CATEGORY_NAMES.includes(requestedCategory) ? requestedCategory : "";
  const sortKey = SORT_OPTIONS[queryString(req.query.sort)]
    ? queryString(req.query.sort)
    : "recommended";
  let minPrice = priceParam(req.query.minPrice);
  let maxPrice = priceParam(req.query.maxPrice);
  if (minPrice !== null && maxPrice !== null && minPrice > maxPrice) {
    [minPrice, maxPrice] = [maxPrice, minPrice];
  }
  const filter = buildFilter({ search, category, minPrice, maxPrice });
  const hasPriceFilter = minPrice !== null || maxPrice !== null;

  const page = clampInt(req.query.page, { min: 1, max: 1000, fallback: 1 });
  const isLanding = !search && !category && !hasPriceFilter && page === 1;

  // Independent queries run in parallel so the page costs one database round trip.
  const [total, listings, landing] = await Promise.all([
    Listing.countDocuments(filter),
    Listing.find(filter)
      .sort(SORT_OPTIONS[sortKey].sort)
      .skip((page - 1) * PAGE_SIZE)
      .limit(PAGE_SIZE)
      .select("title price location country image category ratingAverage ratingCount")
      .lean(),
    isLanding ? landingData() : null,
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  if (page > totalPages) {
    const params = new URLSearchParams(req.query);
    params.set("page", String(totalPages));
    return res.redirect(`/listings?${params}`);
  }

  return res.render("listings/index", {
    title: search ? `Stays matching "${search}"` : category ? `${category} stays` : "Explore stays",
    description:
      "Discover and book handpicked stays, from mountain cabins and farm stays to city apartments.",
    listings,
    total,
    page,
    totalPages,
    search,
    category,
    minPrice,
    maxPrice,
    hasPriceFilter,
    sortKey,
    sortOptions: SORT_OPTIONS,
    isLanding,
    stats: landing ? landing.stats : null,
    destinations: landing ? landing.destinations : [],
    featured: landing ? landing.featured : null,
    saved: wishlistIds(req.user),
  });
};

module.exports.renderNewForm = (req, res) => {
  res.render("listings/new", { title: "List your place", listing: null });
};

module.exports.showListing = async (req, res) => {
  const listing = await Listing.findById(req.params.id)
    .populate({
      path: "reviews",
      options: { sort: { createdAt: -1 } },
      populate: { path: "author", select: "username displayName profilePhoto" },
    })
    .populate("owner", "username displayName profilePhoto createdAt bio");

  if (!listing) {
    req.flash("error", "The listing you requested does not exist.");
    return res.redirect("/listings");
  }

  // Reviews whose author account was deleted are hidden rather than crashing the page.
  const reviews = listing.reviews.filter((review) => review.author);
  const userId = req.user && req.user._id;
  const isHost = Boolean(userId && listing.owner && listing.owner._id.equals(userId));
  const hasReviewed = Boolean(userId && reviews.some((review) => review.author._id.equals(userId)));

  const similar = await Listing.find({ category: listing.category, _id: { $ne: listing._id } })
    .sort({ ratingAverage: -1, _id: -1 })
    .limit(3)
    .select("title price location country image ratingAverage ratingCount")
    .lean();

  return res.render("listings/show", {
    title: listing.title,
    description: listing.description.slice(0, 160),
    listing,
    reviews,
    isHost,
    hasReviewed,
    similar,
    saved: wishlistIds(req.user),
  });
};

module.exports.createListing = async (req, res) => {
  if (!req.file) {
    req.flash("error", "Please add a photo of your place.");
    return res.redirect("/listings/new");
  }

  const data = req.body.listing;
  const [image, coordinates] = await Promise.all([
    images.uploadImage(req.file),
    geocode(data.location, data.country),
  ]);

  const listing = await Listing.create({ ...data, owner: req.user._id, image, coordinates });
  invalidateListingCache();

  req.flash("success", "Your listing is live.");
  return res.redirect(`/listings/${listing._id}`);
};

module.exports.renderEditForm = (req, res) => {
  res.render("listings/edit", { title: `Edit ${res.locals.listing.title}` });
};

module.exports.updateListing = async (req, res) => {
  const { listing } = res.locals;
  const data = req.body.listing;
  const locationChanged = data.location !== listing.location || data.country !== listing.country;

  Object.assign(listing, data);
  if (locationChanged) listing.coordinates = await geocode(data.location, data.country);

  let previousImage = null;
  if (req.file) {
    previousImage = listing.image && listing.image.filename;
    listing.image = await images.uploadImage(req.file);
  }

  await listing.save();
  invalidateListingCache();
  if (previousImage) await images.deleteImage(previousImage);

  req.flash("success", "Listing updated.");
  return res.redirect(`/listings/${listing._id}`);
};

module.exports.deleteListing = async (req, res) => {
  const { listing } = res.locals;

  const upcoming = await Booking.exists({
    listing: listing._id,
    status: { $in: ACTIVE_BOOKING_STATUSES },
    toDate: { $gte: new Date() },
  });
  if (upcoming) {
    req.flash("error", "This listing has upcoming confirmed stays and cannot be deleted yet.");
    return res.redirect(`/listings/${listing._id}`);
  }

  await Listing.findOneAndDelete({ _id: listing._id });
  invalidateListingCache();
  await Promise.all([
    images.deleteImage(listing.image && listing.image.filename),
    User.updateMany({ wishlist: listing._id }, { $pull: { wishlist: listing._id } }),
  ]);

  req.flash("success", "Listing deleted.");
  return res.redirect("/profile?tab=listings");
};

module.exports.renderBookingForm = async (req, res) => {
  const listing = await Listing.findById(req.params.id).populate("owner", "username displayName");
  if (!listing) throw new ExpressError(404, "This listing no longer exists.");

  if (listing.owner && listing.owner._id.equals(req.user._id)) {
    req.flash("error", "You cannot book your own listing.");
    return res.redirect(`/listings/${listing._id}`);
  }

  const unavailable = await Booking.find({
    listing: listing._id,
    status: { $in: ACTIVE_BOOKING_STATUSES },
    toDate: { $gte: new Date() },
  })
    .sort({ fromDate: 1 })
    .select("fromDate toDate")
    .lean();

  return res.render("listings/book", {
    title: `Book ${listing.title}`,
    listing,
    unavailable,
    maxNights: config.pricing.maxNights,
  });
};

module.exports.toggleWishlist = async (req, res) => {
  const listing = await Listing.exists({ _id: req.params.id });
  if (!listing) throw new ExpressError(404, "This listing no longer exists.");

  const saved = req.user.wishlist.some((id) => id.equals(req.params.id));
  await User.updateOne(
    { _id: req.user._id },
    saved ? { $pull: { wishlist: req.params.id } } : { $addToSet: { wishlist: req.params.id } },
  );

  if (req.is("application/json") || (req.get("accept") || "").includes("json")) {
    return res.json({ success: true, saved: !saved });
  }
  req.flash("success", saved ? "Removed from your saved stays." : "Saved to your wishlist.");
  return res.redirect(`/listings/${req.params.id}`);
};

module.exports.invalidateListingCache = invalidateListingCache;
