"use strict";

const Joi = require("joi");
const { CATEGORY_NAMES } = require("../utils/constants");

const text = (max) => Joi.string().trim().max(max);
const phone = Joi.string()
  .trim()
  .pattern(/^\+?[0-9\s-]{7,20}$/)
  .messages({ "string.pattern.base": "Enter a valid phone number (digits, spaces, + or -)." });

const listingSchema = Joi.object({
  listing: Joi.object({
    title: text(100).min(3).required(),
    description: text(2000).min(10).required(),
    location: text(100).min(2).required(),
    country: text(60).min(2).required(),
    phone: phone.required(),
    email: Joi.string().trim().email().max(254).required(),
    price: Joi.number().integer().min(1).max(1000000).required(),
    category: Joi.string()
      .valid(...CATEGORY_NAMES)
      .required(),
  }).required(),
  terms: Joi.any(),
});

const reviewSchema = Joi.object({
  review: Joi.object({
    rating: Joi.number().integer().min(1).max(5).required(),
    comment: text(1000).min(3).required(),
  }).required(),
});

const username = Joi.string()
  .trim()
  .min(3)
  .max(30)
  .pattern(/^[a-zA-Z0-9_.-]+$/)
  .messages({
    "string.pattern.base":
      "Username may only contain letters, numbers, dots, dashes and underscores.",
  });

const password = Joi.string()
  .min(8)
  .max(128)
  .pattern(/[A-Za-z]/)
  .pattern(/[0-9]/)
  .messages({
    "string.min": "Password must be at least 8 characters long.",
    "string.pattern.base": "Password must contain at least one letter and one number.",
  });

const signupSchema = Joi.object({
  username: username.required(),
  email: Joi.string().trim().email().max(254).required(),
  password: password.required(),
});

const loginSchema = Joi.object({
  username: Joi.string().trim().max(254).required(),
  password: Joi.string().max(128).required(),
});

const profileSchema = Joi.object({
  displayName: text(60).allow(""),
  email: Joi.string().trim().email().max(254).required(),
  phone: phone.allow(""),
  location: text(100).allow(""),
  bio: text(500).allow(""),
});

const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().max(128).allow(""),
  newPassword: password.required(),
  confirmPassword: Joi.any()
    .valid(Joi.ref("newPassword"))
    .required()
    .messages({ "any.only": "The new passwords do not match." }),
});

const forgotPasswordSchema = Joi.object({
  email: Joi.string().trim().email().max(254).required(),
});

const resetPasswordSchema = Joi.object({
  password: password.required(),
  confirmPassword: Joi.any()
    .valid(Joi.ref("password"))
    .required()
    .messages({ "any.only": "The passwords do not match." }),
});

const deleteAccountSchema = Joi.object({
  confirmUsername: Joi.string().trim().max(60).required(),
});

// Plain YYYY-MM-DD strings: Joi's isoDate() would convert them into full timestamps.
const stayDate = Joi.string()
  .pattern(/^\d{4}-\d{2}-\d{2}$/)
  .messages({ "string.pattern.base": "Please choose valid check-in and check-out dates." });

const bookingSchema = Joi.object({
  listingId: Joi.string().hex().length(24).required(),
  checkIn: stayDate.required(),
  checkOut: stayDate.required(),
});

const verifyPaymentSchema = Joi.object({
  razorpay_payment_id: Joi.string().max(64).required(),
  razorpay_order_id: Joi.string().max(64).required(),
  razorpay_signature: Joi.string().hex().max(128).required(),
});

module.exports = {
  listingSchema,
  reviewSchema,
  signupSchema,
  loginSchema,
  profileSchema,
  changePasswordSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  deleteAccountSchema,
  bookingSchema,
  verifyPaymentSchema,
};
