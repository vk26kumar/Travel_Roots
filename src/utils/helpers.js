"use strict";

const crypto = require("crypto");
const { asset } = require("./assets");

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

/**
 * Returns the value only if it is a string. Used right before values reach a
 * database query, so an object such as { "$ne": null } can never get through.
 */
function asString(value) {
  return typeof value === "string" ? value : "";
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

const PLACEHOLDER_IMAGE = "/images/placeholder.svg";

/**
 * Returns a resized, cropped WebP URL for Cloudinary and Unsplash images so
 * the browser never downloads a full-size original. Other URLs are returned
 * unchanged.
 */
const UNSPLASH_HOSTS = new Set(["images.unsplash.com", "plus.unsplash.com"]);

/** Identifies image hosts by exact hostname, never by substring. */
function imageHost(url) {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:") return null;
    if (parsed.hostname === "res.cloudinary.com" && parsed.pathname.includes("/upload/")) {
      return "cloudinary";
    }
    if (UNSPLASH_HOSTS.has(parsed.hostname)) return "unsplash";
  } catch {
    // Not an absolute URL.
  }
  return null;
}

function imageUrl(url, { width = 800, height } = {}) {
  if (typeof url !== "string" || !url) return PLACEHOLDER_IMAGE;
  const host = imageHost(url);

  if (host === "cloudinary") {
    const transforms = ["f_webp", "q_auto:eco", "c_fill", `w_${width}`];
    if (height) transforms.push(`h_${height}`);
    // Drop transformations added to previously generated URLs before applying new ones.
    const original = url.replace(/\/upload\/(?:[a-z]+_[^/]+\/)+(?=v\d+\/)/, "/upload/");
    return original.replace("/upload/", `/upload/${transforms.join(",")}/`);
  }

  if (host === "unsplash") {
    const parsed = new URL(url);
    const params = new URLSearchParams({ w: String(width), q: "60", fm: "webp", fit: "crop" });
    if (height) params.set("h", String(height));
    return `${parsed.origin}${parsed.pathname}?${params}`;
  }

  return url;
}

/** Builds a `srcset` for a resizable image at a fixed aspect ratio (width / height). */
function imageSrcset(url, widths, aspect) {
  if (typeof url !== "string" || !imageHost(url)) return "";
  return widths
    .map((width) => `${imageUrl(url, { width, height: Math.round(width / aspect) })} ${width}w`)
    .join(", ");
}

/**
 * Inline reference to an icon in the SVG sprite. Icons are decorative by
 * default; pass `label` for icons that convey meaning on their own.
 */
function icon(name, { className = "", label = "" } = {}) {
  const a11y = label ? `role="img" aria-label="${escapeHtml(label)}"` : 'aria-hidden="true"';
  const href = `${asset("/images/icons.svg")}#i-${name}`;
  return `<svg class="icon ${className}" ${a11y} focusable="false"><use href="${href}"></use></svg>`;
}

function escapeHtml(value) {
  return String(value).replace(
    /[&<>"']/g,
    (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char],
  );
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
  asString,
  sha256,
  imageUrl,
  imageSrcset,
  icon,
  escapeHtml,
  asset,
  formatINR,
  formatDate,
  placeName,
  initials,
};
