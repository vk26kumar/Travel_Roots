"use strict";

const express = require("express");
const rateLimit = require("express-rate-limit");
const auth = require("../controllers/auth");
const { isGuest, isLoggedIn, saveRedirectUrl } = require("../middleware/auth");
const { validateBody, flashAndRedirect } = require("../middleware/validate");
const {
  signupSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} = require("../validation/schemas");

const router = express.Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  // Failed sign-ins also end in a redirect, so success is judged by the session state.
  skipSuccessfulRequests: true,
  requestWasSuccessful: (req) => req.isAuthenticated(),
  handler(req, res) {
    req.flash("error", "Too many attempts. Please wait a few minutes and try again.");
    res.redirect(req.path === "/signup" ? "/signup" : "/login");
  },
});

router.get("/login", isGuest, auth.renderLogin);
router.post(
  "/login",
  authLimiter,
  validateBody(loginSchema, { onError: flashAndRedirect("/login") }),
  saveRedirectUrl,
  auth.authenticateLocal,
  auth.afterLogin,
);

router.get("/signup", isGuest, auth.renderSignup);
router.post(
  "/signup",
  authLimiter,
  validateBody(signupSchema, { onError: flashAndRedirect("/signup") }),
  saveRedirectUrl,
  auth.signup,
);

router.post("/logout", isLoggedIn, auth.logout);

router.get("/forgot-password", isGuest, auth.renderForgotPassword);
router.post(
  "/forgot-password",
  authLimiter,
  validateBody(forgotPasswordSchema, { onError: flashAndRedirect("/forgot-password") }),
  auth.forgotPassword,
);

router.get("/reset-password/:token", auth.renderResetPassword);
router.post(
  "/reset-password/:token",
  authLimiter,
  validateBody(resetPasswordSchema, {
    onError: flashAndRedirect((req) => `/reset-password/${encodeURIComponent(req.params.token)}`),
  }),
  auth.resetPassword,
);

router.get("/auth/google", auth.oauthStart("google", { scope: ["profile", "email"] }));
router.get("/auth/google/callback", ...auth.oauthCallback("google"));
router.get("/auth/github", auth.oauthStart("github"));
router.get("/auth/github/callback", ...auth.oauthCallback("github"));

module.exports = router;
