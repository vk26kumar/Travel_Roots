"use strict";

const express = require("express");
const bookings = require("../controllers/bookings");

const router = express.Router();

// Mounted before the JSON body parser: signature verification needs the raw bytes.
router.post(
  "/razorpay",
  express.raw({ type: "application/json", limit: "1mb" }),
  bookings.razorpayWebhook,
);

module.exports = router;
