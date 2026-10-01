"use strict";

const express = require("express");
const rateLimit = require("express-rate-limit");
const bookings = require("../controllers/bookings");
const { isLoggedIn, canViewBooking } = require("../middleware/auth");
const { validateBody, validateObjectId } = require("../middleware/validate");
const { bookingSchema, verifyPaymentSchema } = require("../validation/schemas");

const router = express.Router();

const paymentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { success: false, message: "Too many payment attempts. Please wait and try again." },
});

router.post("/", paymentLimiter, isLoggedIn, validateBody(bookingSchema), bookings.createBooking);

router.get("/:id", validateObjectId("id"), isLoggedIn, canViewBooking, bookings.showBooking);

// Receipts were previously served from /bookings/:id/success.
router.get("/:id/success", validateObjectId("id"), (req, res) =>
  res.redirect(301, `/bookings/${req.params.id}`),
);

router.post(
  "/:id/verify",
  paymentLimiter,
  validateObjectId("id"),
  isLoggedIn,
  validateBody(verifyPaymentSchema),
  bookings.verifyPayment,
);

router.post("/:id/cancel", validateObjectId("id"), isLoggedIn, bookings.cancelPendingBooking);

module.exports = router;
