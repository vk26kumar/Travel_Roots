"use strict";

const crypto = require("crypto");
const passport = require("passport");
const User = require("../models/user");
const config = require("../config");
const logger = require("../utils/logger");
const { sendPasswordReset } = require("../services/mailer");
const { sha256, safeRedirectPath } = require("../utils/helpers");

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000;

module.exports.renderLogin = (req, res) => {
  res.render("auth/login", { title: "Sign in", mode: "login" });
};

module.exports.renderSignup = (req, res) => {
  res.render("auth/login", { title: "Create your account", mode: "signup" });
};

module.exports.signup = async (req, res, next) => {
  const { username, email, password } = req.body;

  if (await User.exists({ email: email.toLowerCase() })) {
    req.flash("error", "An account with these details already exists. Try signing in instead.");
    return res.redirect("/signup");
  }

  let user;
  try {
    user = await User.register(new User({ username, email }), password);
  } catch (error) {
    if (error.name === "UserExistsError") {
      req.flash("error", "That username is already taken.");
      return res.redirect("/signup");
    }
    throw error;
  }

  const redirectUrl = res.locals.redirectUrl || "/listings";
  return req.login(user, (error) => {
    if (error) return next(error);
    req.flash("success", `Welcome to Travel Roots, ${user.username}.`);
    return res.redirect(redirectUrl);
  });
};

module.exports.authenticateLocal = passport.authenticate("local", {
  failureRedirect: "/login",
  failureFlash: true,
});

module.exports.afterLogin = (req, res) => {
  req.flash("success", `Welcome back, ${req.user.displayName || req.user.username}.`);
  res.redirect(safeRedirectPath(res.locals.redirectUrl));
};

module.exports.logout = (req, res, next) => {
  req.logout((error) => {
    if (error) return next(error);
    req.flash("success", "You have been signed out.");
    return res.redirect("/listings");
  });
};

/** Starts an OAuth flow, returning 404 when the provider is not configured. */
module.exports.oauthStart = (provider, options) => (req, res, next) => {
  if (!config.features[provider]) return next();
  return passport.authenticate(provider, options)(req, res, next);
};

module.exports.oauthCallback = (provider) => [
  (req, res, next) => {
    if (!config.features[provider]) return next("route");
    return passport.authenticate(provider, {
      failureRedirect: "/login",
      failureFlash: "We could not sign you in with that provider. Please try again.",
    })(req, res, next);
  },
  (req, res) => {
    req.flash("success", `Welcome, ${req.user.displayName || req.user.username}.`);
    res.redirect("/listings");
  },
];

module.exports.renderForgotPassword = (req, res) => {
  res.render("auth/forgot", { title: "Reset your password" });
};

module.exports.forgotPassword = async (req, res) => {
  const user = await User.findOne({ email: req.body.email.toLowerCase() });

  if (user) {
    const token = crypto.randomBytes(32).toString("hex");
    user.resetPasswordTokenHash = sha256(token);
    user.resetPasswordExpires = new Date(Date.now() + RESET_TOKEN_TTL_MS);
    await user.save();

    try {
      await sendPasswordReset(user, `${config.appUrl}/reset-password/${token}`);
    } catch (error) {
      logger.error("Password reset email could not be sent", error);
    }
  }

  // The same response is returned whether or not the account exists.
  req.flash(
    "success",
    "If an account exists for that email, a reset link is on its way. It expires in one hour.",
  );
  return res.redirect("/login");
};

async function findUserByResetToken(token) {
  if (!/^[a-f0-9]{64}$/.test(token)) return null;
  return User.findOne({
    resetPasswordTokenHash: sha256(token),
    resetPasswordExpires: { $gt: new Date() },
  }).select("+resetPasswordTokenHash +resetPasswordExpires");
}

module.exports.renderResetPassword = async (req, res) => {
  const user = await findUserByResetToken(req.params.token);
  if (!user) {
    req.flash("error", "That reset link is invalid or has expired. Please request a new one.");
    return res.redirect("/forgot-password");
  }
  return res.render("auth/reset", { title: "Choose a new password", token: req.params.token });
};

module.exports.resetPassword = async (req, res, next) => {
  const user = await findUserByResetToken(req.params.token);
  if (!user) {
    req.flash("error", "That reset link is invalid or has expired. Please request a new one.");
    return res.redirect("/forgot-password");
  }

  await user.setPassword(req.body.password);
  user.resetPasswordTokenHash = undefined;
  user.resetPasswordExpires = undefined;
  user.set("attempts", 0);
  await user.save();

  return req.login(user, (error) => {
    if (error) return next(error);
    req.flash("success", "Your password has been updated.");
    return res.redirect("/profile");
  });
};
