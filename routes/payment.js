const express = require("express");
const router = express.Router();
const razorpay = require("../utlity/razorpay");
const crypto = require("crypto");
const Booking = require("../models/booking");
const Listing = require("../models/listing");

router.post("/create-order", async (req, res) => {
    const { amount } = req.body;

    const order = await razorpay.orders.create({
        amount: amount * 100,
        currency: "INR",
        receipt: "receipt_" + Date.now()
    });

    res.json(order);
});

router.post("/verify", async (req, res) => {
    const {
        razorpay_payment_id,
        razorpay_order_id,
        razorpay_signature,
        listingId,
        fromDate,
        toDate,
        nights,
        amount
    } = req.body;

    const body = razorpay_order_id + "|" + razorpay_payment_id;

    const expectedSignature = crypto
        .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
        .update(body)
        .digest("hex");

    if (expectedSignature !== razorpay_signature) {
        return res.status(400).json({ success: false });
    }

    const booking = new Booking({
        listing: listingId,
        user: req.user._id,
        fromDate,
        toDate,
        nights,
        amount,
        paymentId: razorpay_payment_id
    });

    await booking.save();

    res.json({
        success: true,
        bookingId: booking._id
    });
});
module.exports = router;
