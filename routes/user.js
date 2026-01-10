const express = require("express");
const router = express.Router();
const passport = require("passport");
const wrapAsync = require("../utlity/wrapAsync.js");
const { saveRedirectUrl }  = require("../middleware.js");
const userControllers = require("../controllers/user.js")
const Booking = require("../models/booking");
const rateLimit = require("express-rate-limit");

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, 
    max: 20, 
    message: "Too many login/signup attempts. Please try again later."
});


// Render Signup/Login Page (GET /signup)
router.get("/signup", (req, res) => {
    res.render("users/signup.ejs");
});


// Handle User Registration (POST /signup)
router.post(
    "/signup",
    authLimiter,
    saveRedirectUrl,
    wrapAsync(userControllers.signup)
);

router.get("/dashboard", async (req, res) => {
    if (!req.isAuthenticated()) {
        return res.redirect("/login");
    }

    const bookings = await Booking.find({ user: req.user._id })
        .populate("listing")
        .sort({ createdAt: -1 });

    res.render("users/dashboard", {
        user: req.user,
        bookings
    });
});

// Handle Login (POST /login)
router.post(
    "/login",
    authLimiter,
    saveRedirectUrl,
    passport.authenticate("local", {
        failureRedirect: "/signup",
        failureFlash: true,
    }),
    userControllers.login,
); 

// Handle Logout 
router.get("/logout", userControllers.logout);

module.exports = router;
