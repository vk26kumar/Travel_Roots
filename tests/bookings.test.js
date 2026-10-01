"use strict";

const { describe, it, before, after, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("crypto");
const h = require("./helpers");
const config = require("../src/config");
const payments = require("../src/services/payments");
const Booking = require("../src/models/booking");

function isoDaysFromNow(days) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

describe("bookings and payments", () => {
  let app;
  const originalCreateOrder = payments.createOrder;
  const originalConfig = { ...config.razorpay, enabled: config.features.payments };

  before(async () => {
    await h.connectDatabase();
    config.features.payments = true;
    config.razorpay.keyId = "rzp_test_key";
    config.razorpay.keySecret = "test_secret";
    config.razorpay.webhookSecret = "webhook_secret";
    let counter = 0;
    payments.createOrder = async ({ amountPaise }) => {
      counter += 1;
      return { id: `order_test_${counter}`, amount: amountPaise, currency: "INR" };
    };
    app = h.buildApp();
  });

  after(async () => {
    payments.createOrder = originalCreateOrder;
    config.features.payments = originalConfig.enabled;
    Object.assign(config.razorpay, {
      keyId: originalConfig.keyId,
      keySecret: originalConfig.keySecret,
      webhookSecret: originalConfig.webhookSecret,
    });
    await h.disconnectDatabase();
  });

  beforeEach(h.clearDatabase);

  async function startBooking(agent, listing, checkIn, checkOut) {
    const token = h.extractCsrf((await agent.get(`/listings/${listing._id}/book`)).text);
    const response = await agent
      .post("/bookings")
      .set("Accept", "application/json")
      .set("X-CSRF-Token", token)
      .send({ listingId: listing._id.toString(), checkIn, checkOut, amount: 1 });
    return { response, token };
  }

  it("prices the stay on the server and ignores client amounts", async () => {
    const host = await h.signUp(app);
    const guest = await h.signUp(app);
    const listing = await h.createListing(host.user, { price: 2000 });

    const { response } = await startBooking(
      guest.agent,
      listing,
      isoDaysFromNow(5),
      isoDaysFromNow(8),
    );
    assert.equal(response.status, 201);
    assert.equal(response.body.checkout.amount, 708000);

    const booking = await Booking.findById(response.body.bookingId);
    assert.equal(booking.status, "PENDING");
    assert.equal(booking.nights, 3);
    assert.equal(booking.subtotal, 6000);
    assert.equal(booking.tax, 1080);
    assert.equal(booking.amount, 7080);
  });

  it("verifies the payment signature against the stored order", async () => {
    const host = await h.signUp(app);
    const guest = await h.signUp(app);
    const listing = await h.createListing(host.user);
    const { response, token } = await startBooking(
      guest.agent,
      listing,
      isoDaysFromNow(3),
      isoDaysFromNow(4),
    );
    const { bookingId } = response.body;
    const orderId = response.body.checkout.order_id;

    const forged = await guest.agent
      .post(`/bookings/${bookingId}/verify`)
      .set("Accept", "application/json")
      .set("X-CSRF-Token", token)
      .send({
        razorpay_order_id: orderId,
        razorpay_payment_id: "pay_1",
        razorpay_signature: "ab".repeat(32),
      });
    assert.equal(forged.status, 400);

    const signature = crypto
      .createHmac("sha256", "test_secret")
      .update(`${orderId}|pay_1`)
      .digest("hex");
    const verified = await guest.agent
      .post(`/bookings/${bookingId}/verify`)
      .set("Accept", "application/json")
      .set("X-CSRF-Token", token)
      .send({
        razorpay_order_id: orderId,
        razorpay_payment_id: "pay_1",
        razorpay_signature: signature,
      });
    assert.equal(verified.status, 200);
    assert.equal(verified.body.redirectUrl, `/bookings/${bookingId}`);
    assert.equal((await Booking.findById(bookingId)).status, "PAID");

    const receipt = await guest.agent.get(`/bookings/${bookingId}`);
    assert.equal(receipt.status, 200);
    assert.match(receipt.text, /pay_1/);

    const stranger = await h.signUp(app);
    assert.equal((await stranger.agent.get(`/bookings/${bookingId}`)).status, 404);
    assert.equal((await host.agent.get(`/bookings/${bookingId}`)).status, 200);
  });

  it("blocks overlapping dates and self-booking", async () => {
    const host = await h.signUp(app);
    const guest = await h.signUp(app);
    const listing = await h.createListing(host.user);

    await Booking.create({
      listing: listing._id,
      user: host.user._id,
      fromDate: new Date(`${isoDaysFromNow(10)}T00:00:00Z`),
      toDate: new Date(`${isoDaysFromNow(14)}T00:00:00Z`),
      nights: 4,
      amount: 8000,
      status: "CONFIRMED",
    });

    const { response } = await startBooking(
      guest.agent,
      listing,
      isoDaysFromNow(12),
      isoDaysFromNow(15),
    );
    assert.equal(response.status, 409);

    const own = await host.agent.get(`/listings/${listing._id}/book`);
    assert.equal(own.headers.location, `/listings/${listing._id}`);
  });

  it("confirms bookings from a signed webhook", async () => {
    const host = await h.signUp(app);
    const guest = await h.signUp(app);
    const listing = await h.createListing(host.user);
    const { response } = await startBooking(
      guest.agent,
      listing,
      isoDaysFromNow(20),
      isoDaysFromNow(22),
    );
    const orderId = response.body.checkout.order_id;

    const payload = JSON.stringify({
      event: "payment.captured",
      payload: { payment: { entity: { id: "pay_hook", order_id: orderId } } },
    });
    const signature = crypto.createHmac("sha256", "webhook_secret").update(payload).digest("hex");

    const hook = await h
      .request(app)
      .post("/webhook/razorpay")
      .set("Content-Type", "application/json")
      .set("X-Razorpay-Signature", signature)
      .send(payload);
    assert.equal(hook.status, 200);

    const booking = await Booking.findById(response.body.bookingId);
    assert.equal(booking.status, "CONFIRMED");
    assert.equal(booking.paymentId, "pay_hook");
  });

  it("requires sign-in for booking endpoints", async () => {
    const response = await h
      .request(app)
      .post("/bookings")
      .set("Accept", "application/json")
      .send({});
    assert.equal(response.status, 403, "CSRF is enforced before anything else");
  });
});
