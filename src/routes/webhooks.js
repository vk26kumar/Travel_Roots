"use strict";

const express = require("express");
const rateLimit = require("express-rate-limit");
const bookings = require("../controllers/bookings");

const router = express.Router();

// Razorpay sends a handful of events per payment; anything far beyond that is abuse.
const webhookLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 120,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { received: false, message: "Too many requests" },
});

// Mounted before the JSON body parser: signature verification needs the raw bytes.
router.post(
  "/razorpay",
  webhookLimiter,
  express.raw({ type: "application/json", limit: "1mb" }),
  bookings.razorpayWebhook,
);

module.exports = router;
