"use strict";

const mongoose = require("mongoose");
const { BOOKING_STATUS } = require("../utils/constants");

const { Schema } = mongoose;

const bookingSchema = new Schema(
  {
    listing: { type: Schema.Types.ObjectId, ref: "Listing", required: true, index: true },
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    fromDate: { type: Date, required: true },
    toDate: { type: Date, required: true },
    nights: { type: Number, required: true, min: 1 },
    pricePerNight: { type: Number, min: 0 },
    subtotal: { type: Number, min: 0 },
    tax: { type: Number, min: 0, default: 0 },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: "INR" },
    orderId: { type: String, index: { unique: true, sparse: true } },
    paymentId: { type: String, index: { unique: true, sparse: true } },
    status: {
      type: String,
      enum: Object.values(BOOKING_STATUS),
      default: BOOKING_STATUS.PENDING,
      index: true,
    },
    paidAt: Date,
  },
  { timestamps: true },
);

bookingSchema.index({ listing: 1, fromDate: 1, toDate: 1 });

bookingSchema.virtual("isUpcoming").get(function isUpcoming() {
  return this.toDate && this.toDate.getTime() >= Date.now();
});

module.exports = mongoose.model("Booking", bookingSchema);
