"use strict";

const Booking = require("../models/booking");
const Listing = require("../models/listing");
const config = require("../config");
const logger = require("../utils/logger");
const ExpressError = require("../utils/ExpressError");
const { validateStay, quote } = require("../services/pricing");
const payments = require("../services/payments");
const { asString } = require("../utils/helpers");
const { BOOKING_STATUS, ACTIVE_BOOKING_STATUSES } = require("../utils/constants");

/**
 * Returns true when the requested dates overlap a confirmed booking, or a
 * pending checkout started within the hold window.
 */
async function hasConflict(listingId, from, to, excludeBookingId) {
  const holdSince = new Date(Date.now() - config.pricing.pendingHoldMinutes * 60 * 1000);
  const filter = {
    listing: listingId,
    fromDate: { $lt: to },
    toDate: { $gt: from },
    $or: [
      { status: { $in: ACTIVE_BOOKING_STATUSES } },
      { status: BOOKING_STATUS.PENDING, createdAt: { $gte: holdSince } },
    ],
  };
  if (excludeBookingId) filter._id = { $ne: excludeBookingId };
  return Boolean(await Booking.exists(filter));
}

/** Creates a pending booking and a matching Razorpay order. Amounts are computed server-side. */
module.exports.createBooking = async (req, res) => {
  if (!config.features.payments) {
    throw new ExpressError(503, "Online payments are not available right now.");
  }

  const { checkIn, checkOut } = req.body;
  const listing = await Listing.findById(asString(req.body.listingId));
  if (!listing) throw new ExpressError(404, "This listing no longer exists.");
  if (listing.owner && listing.owner.equals(req.user._id)) {
    throw new ExpressError(400, "You cannot book your own listing.");
  }

  const stay = validateStay(checkIn, checkOut);
  if (await hasConflict(listing._id, stay.from, stay.to)) {
    throw new ExpressError(409, "Those dates are no longer available. Please choose other dates.");
  }

  const price = quote(listing.price, stay.nights);
  const booking = new Booking({
    listing: listing._id,
    user: req.user._id,
    fromDate: stay.from,
    toDate: stay.to,
    nights: stay.nights,
    pricePerNight: listing.price,
    subtotal: price.subtotal,
    tax: price.tax,
    amount: price.total,
    currency: config.pricing.currency,
    status: BOOKING_STATUS.PENDING,
  });

  let order;
  try {
    order = await payments.createOrder({
      amountPaise: price.totalPaise,
      receipt: `booking_${booking._id}`,
      notes: { bookingId: booking.id, listingId: listing.id, userId: req.user.id },
    });
  } catch (error) {
    logger.error("Razorpay order creation failed", error);
    throw new ExpressError(502, "We could not start the payment. Please try again.");
  }

  booking.orderId = order.id;
  await booking.save();

  return res.status(201).json({
    success: true,
    bookingId: booking.id,
    checkout: {
      key: config.razorpay.keyId,
      amount: order.amount,
      currency: order.currency,
      order_id: order.id,
      name: "Travel Roots",
      description: `${stay.nights} night${stay.nights > 1 ? "s" : ""} at ${listing.title}`,
      prefill: { name: req.user.displayName || req.user.username, email: req.user.email },
      notes: { bookingId: booking.id },
    },
  });
};

/** Confirms a payment returned by Razorpay Checkout. Idempotent for repeated calls. */
module.exports.verifyPayment = async (req, res) => {
  const booking = await Booking.findOne({ _id: req.params.id, user: req.user._id });
  if (!booking) throw new ExpressError(404, "Booking not found.");

  const redirectUrl = `/bookings/${booking.id}`;
  if (ACTIVE_BOOKING_STATUSES.includes(booking.status)) {
    return res.json({ success: true, redirectUrl });
  }

  const { razorpay_order_id: orderId, razorpay_payment_id: paymentId } = req.body;
  const valid =
    orderId === booking.orderId &&
    payments.verifyPaymentSignature({
      orderId: booking.orderId,
      paymentId,
      signature: req.body.razorpay_signature,
    });

  if (!valid) {
    logger.warn("Payment signature verification failed", { bookingId: booking.id });
    throw new ExpressError(
      400,
      "Payment verification failed. If you were charged, contact support.",
    );
  }

  booking.status = BOOKING_STATUS.PAID;
  booking.paymentId = paymentId;
  booking.paidAt = new Date();
  await booking.save();

  req.flash("success", "Payment received. Your stay is booked.");
  return res.json({ success: true, redirectUrl });
};

/** Releases the date hold when the guest closes or fails the checkout. */
module.exports.cancelPendingBooking = async (req, res) => {
  await Booking.updateOne(
    { _id: req.params.id, user: req.user._id, status: BOOKING_STATUS.PENDING },
    { status: BOOKING_STATUS.CANCELLED },
  );
  return res.json({ success: true });
};

module.exports.showBooking = (req, res) => {
  res.render("bookings/show", { title: "Booking receipt" });
};

/** Handles Razorpay webhooks. The raw body is required for signature verification. */
module.exports.razorpayWebhook = async (req, res) => {
  const signature = req.get("x-razorpay-signature");
  if (!payments.verifyWebhookSignature(req.body, signature)) {
    return res.status(400).json({ received: false, message: "Invalid webhook signature" });
  }

  let event;
  try {
    event = JSON.parse(req.body.toString("utf8"));
  } catch {
    return res.status(400).json({ received: false, message: "Malformed payload" });
  }

  const payment = (event.payload && event.payload.payment && event.payload.payment.entity) || {};
  // Even signed payloads are reduced to plain strings before they reach a query.
  const orderId = asString(payment.order_id);
  const paymentId = asString(payment.id);

  if (orderId && (event.event === "payment.captured" || event.event === "order.paid")) {
    await Booking.updateOne(
      {
        orderId,
        status: { $in: [BOOKING_STATUS.PENDING, BOOKING_STATUS.PAID, BOOKING_STATUS.CANCELLED] },
      },
      { status: BOOKING_STATUS.CONFIRMED, paymentId: paymentId || undefined, paidAt: new Date() },
    );
  } else if (orderId && event.event === "payment.failed") {
    await Booking.updateOne(
      { orderId, status: BOOKING_STATUS.PENDING },
      { status: BOOKING_STATUS.FAILED },
    );
  }

  return res.status(200).json({ received: true });
};
