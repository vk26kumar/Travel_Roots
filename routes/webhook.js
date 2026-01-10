const express = require("express");
const crypto = require("crypto");
const router = express.Router();
const Booking = require("../models/booking");

// Razorpay sends raw body → important!
router.post(
    "/razorpay",
    express.raw({ type: "application/json" }),
    async (req, res) => {
        try {
            const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

            const signature = req.headers["x-razorpay-signature"];

            const expectedSignature = crypto
                .createHmac("sha256", webhookSecret)
                .update(req.body)
                .digest("hex");

            if (signature !== expectedSignature) {
                return res.status(400).send("Invalid webhook signature");
            }

            const event = JSON.parse(req.body.toString());

            if (event.event === "payment.captured") {
                const payment = event.payload.payment.entity;

                // Update booking status if exists
                await Booking.findOneAndUpdate(
                    { paymentId: payment.id },
                    { status: "CONFIRMED" }
                );
            }

            res.status(200).json({ received: true });

        } catch (err) {
            console.error("Webhook Error:", err);
            res.status(500).send("Server error");
        }
    }
);

module.exports = router;
