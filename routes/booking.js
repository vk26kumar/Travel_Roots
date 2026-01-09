const express = require("express");
const router = express.Router();
const Booking = require("../models/booking");

router.get("/:id/success", async (req, res) => {
    const booking = await Booking.findById(req.params.id)
        .populate("listing")
        .populate("user");

    res.render("booking/success", { booking });
});

module.exports = router;
