const express = require("express");
const router = express.Router();
const Booking = require("../models/booking");
const { isBookingOwner } = require("../middleware");

router.get("/:id/success",
    isBookingOwner,
    async (req, res) => {
    const booking = await Booking.findById(req.params.id)
        .populate("listing")
        .populate("user");

    res.render("booking/success", { booking });
});

module.exports = router;
