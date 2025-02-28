const express = require("express");
const router = express.Router();
const passport = require("passport");
const wrapAsync = require("../utlity/wrapAsync.js");
const { saveRedirectUrl }  = require("../middleware.js");
const userControllers = require("../controllers/user.js")



// Render Signup/Login Page (GET /signup)
router.get("/signup", (req, res) => {
    res.render("users/signup.ejs");
});


// Handle User Registration (POST /signup)
router.post(
    "/signup",
    saveRedirectUrl,
    wrapAsync(userControllers.signup)
);

// Handle Login (POST /login)
router.post(
    "/login",
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
