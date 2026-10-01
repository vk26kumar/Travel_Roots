"use strict";

const crypto = require("crypto");

/** Escapes user input so it can be embedded safely in a regular expression. */
function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Express 5 parses repeated query keys into arrays. Collapse any query value
 * into a single trimmed string so it can be used safely in queries.
 */
function queryString(value, maxLength = 100) {
  const first = Array.isArray(value) ? value[0] : value;
  if (typeof first !== "string") return "";
  return first.trim().slice(0, maxLength);
}

/** Parses a positive integer from user input, clamped to [min, max]. */
function clampInt(value, { min = 1, max = Number.MAX_SAFE_INTEGER, fallback = min } = {}) {
  const parsed = Number.parseInt(queryString(String(value ?? "")), 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(Math.max(parsed, min), max);
}

/**
 * Accepts only same-origin relative paths for post-login redirects so the
 * application can never be used as an open redirect.
 */
function safeRedirectPath(value, fallback = "/listings") {
  if (typeof value !== "string") return fallback;
  if (!value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return fallback;
  return value;
}

/** Constant-time comparison of two strings. */
function safeEqual(a, b) {
  if (typeof a !== "string" || typeof b !== "string") return false;
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
}

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

/**
 * Returns a resized, auto-format Cloudinary URL. Non-Cloudinary URLs (for
 * example seeded Unsplash images) are returned unchanged.
 */
function imageUrl(url, { width = 800, height } = {}) {
  if (typeof url !== "string" || !url) return "/images/placeholder.svg";
  if (!url.includes("res.cloudinary.com") || !url.includes("/upload/")) return url;
  const transforms = ["f_auto", "q_auto", "c_fill", `w_${width}`];
  if (height) transforms.push(`h_${height}`);
  return url.replace("/upload/", `/upload/${transforms.join(",")}/`);
}

const inrFormatter = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 });

function formatINR(amount) {
  return `₹${inrFormatter.format(Number(amount) || 0)}`;
}

const dateFormatter = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
  year: "numeric",
  // Stay dates are stored as UTC midnight; IST keeps them on the same calendar day.
  timeZone: "Asia/Kolkata",
});

function formatDate(value) {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? "" : dateFormatter.format(date);
}

/** "Aspen, United States", but just "Maldives" when location and country match. */
function placeName(location, country) {
  const place = String(location || "").trim();
  const nation = String(country || "").trim();
  if (!nation || place.toLowerCase() === nation.toLowerCase()) return place || nation;
  return place ? `${place}, ${nation}` : nation;
}

function initials(name) {
  const parts = String(name || "")
    .replace(/[_.-]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!parts.length) return "?";
  return parts
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");
}

module.exports = {
  escapeRegex,
  queryString,
  clampInt,
  safeRedirectPath,
  safeEqual,
  sha256,
  imageUrl,
  formatINR,
  formatDate,
  placeName,
  initials,
};
