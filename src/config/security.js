"use strict";

const helmet = require("helmet");
const config = require("./index");

/**
 * HTTP security headers.
 *
 * All first-party JavaScript is served from external files, so scripts are
 * restricted to `'self'` plus Razorpay Checkout; no inline script is allowed.
 * Vendor libraries, fonts and icons are self-hosted.
 */
const directives = {
  defaultSrc: ["'self'"],
  baseUri: ["'self'"],
  objectSrc: ["'none'"],
  frameAncestors: ["'none'"],
  formAction: ["'self'"],
  scriptSrc: ["'self'", "https://checkout.razorpay.com", "https://*.razorpay.com"],
  scriptSrcAttr: ["'none'"],
  styleSrc: ["'self'", "'unsafe-inline'"],
  fontSrc: ["'self'"],
  imgSrc: [
    "'self'",
    "data:",
    "blob:",
    "https://res.cloudinary.com",
    "https://images.unsplash.com",
    "https://plus.unsplash.com",
    "https://lh3.googleusercontent.com",
    "https://avatars.githubusercontent.com",
    "https://tile.openstreetmap.org",
    "https://*.razorpay.com",
  ],
  connectSrc: ["'self'", "https://*.razorpay.com"],
  frameSrc: ["https://api.razorpay.com", "https://checkout.razorpay.com"],
  workerSrc: ["'self'", "blob:"],
};

if (config.isProduction) directives.upgradeInsecureRequests = [];

module.exports = helmet({
  contentSecurityPolicy: { useDefaults: false, directives },
  crossOriginEmbedderPolicy: false,
  crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" },
  referrerPolicy: { policy: "strict-origin-when-cross-origin" },
  strictTransportSecurity: config.isProduction
    ? { maxAge: 31536000, includeSubDomains: true }
    : false,
});
