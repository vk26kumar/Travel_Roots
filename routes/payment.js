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
        toDate
    } = req.body;

    //Verify Razorpay signature
    const body = razorpay_order_id + "|" + razorpay_payment_id;

    const expectedSignature = crypto
        .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
        .update(body)
        .digest("hex");

    if (expectedSignature !== razorpay_signature) {
        return res.status(400).json({ success: false });
    }

    //Fetch listing from DB
    const listing = await Listing.findById(listingId);
    if (!listing) {
        return res.status(404).json({ success: false });
    }

    //Parse & normalize dates
    const start = new Date(fromDate);
    const end = new Date(toDate);

    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);

    const diffMs = end - start;
    const nights = diffMs / (1000 * 60 * 60 * 24);

    //Backend validations
    if (nights < 1) {
        return res.status(400).json({ success: false });
    }

    //Recalculate amount (DO NOT TRUST FRONTEND)
    const amount = nights * listing.price;

    if (amount <= 0) {
        return res.status(400).json({ success: false });
    }

    //Save booking
    const booking = new Booking({
        listing: listingId,
        user: req.user._id,
        fromDate: start,
        toDate: end,
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
