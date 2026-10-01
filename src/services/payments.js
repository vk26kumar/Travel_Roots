"use strict";

const crypto = require("crypto");
const Razorpay = require("razorpay");
const config = require("../config");
const { safeEqual } = require("../utils/helpers");

let client = null;

function getClient() {
  if (!config.features.payments) return null;
  if (!client) {
    client = new Razorpay({ key_id: config.razorpay.keyId, key_secret: config.razorpay.keySecret });
  }
  return client;
}

async function createOrder({ amountPaise, receipt, notes }) {
  const razorpay = getClient();
  return razorpay.orders.create({
    amount: amountPaise,
    currency: config.pricing.currency,
    receipt,
    notes,
  });
}

function hmac(secret, payload) {
  return crypto.createHmac("sha256", secret).update(payload).digest("hex");
}

/** Verifies the signature returned by Razorpay Checkout after a payment. */
function verifyPaymentSignature({ orderId, paymentId, signature }) {
  if (!config.razorpay.keySecret || !orderId || !paymentId || !signature) return false;
  return safeEqual(hmac(config.razorpay.keySecret, `${orderId}|${paymentId}`), signature);
}

/** Verifies the X-Razorpay-Signature header of a webhook request. */
function verifyWebhookSignature(rawBody, signature) {
  if (!config.razorpay.webhookSecret || !Buffer.isBuffer(rawBody) || !signature) return false;
  return safeEqual(hmac(config.razorpay.webhookSecret, rawBody), signature);
}

module.exports = { createOrder, verifyPaymentSignature, verifyWebhookSignature };
