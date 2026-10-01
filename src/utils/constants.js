"use strict";

/** Listing categories and the sprite icon shown for each. */
const CATEGORIES = [
  { name: "Trending", icon: "flame" },
  { name: "Rooms", icon: "bed" },
  { name: "Iconic Cities", icon: "building" },
  { name: "Mountain", icon: "mountain" },
  { name: "Castles", icon: "castle" },
  { name: "Pools", icon: "waves" },
  { name: "Camping", icon: "tent" },
  { name: "Farms", icon: "tractor" },
];

const CATEGORY_NAMES = CATEGORIES.map((category) => category.name);

const SORT_OPTIONS = {
  recommended: { label: "Recommended", sort: { ratingAverage: -1, ratingCount: -1, _id: -1 } },
  newest: { label: "Newest", sort: { _id: -1 } },
  "price-asc": { label: "Price: low to high", sort: { price: 1, _id: -1 } },
  "price-desc": { label: "Price: high to low", sort: { price: -1, _id: -1 } },
  rating: { label: "Top rated", sort: { ratingAverage: -1, ratingCount: -1, _id: -1 } },
};

const BOOKING_STATUS = {
  PENDING: "PENDING",
  PAID: "PAID",
  CONFIRMED: "CONFIRMED",
  FAILED: "FAILED",
  CANCELLED: "CANCELLED",
};

/** Bookings in these states block the dates they cover. */
const ACTIVE_BOOKING_STATUSES = [BOOKING_STATUS.PAID, BOOKING_STATUS.CONFIRMED];

const PAGE_SIZE = 12;

module.exports = {
  CATEGORIES,
  CATEGORY_NAMES,
  SORT_OPTIONS,
  BOOKING_STATUS,
  ACTIVE_BOOKING_STATUSES,
  PAGE_SIZE,
};
