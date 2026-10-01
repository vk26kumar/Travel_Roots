"use strict";

const mongoose = require("mongoose");
const passportLocalMongoose = require("passport-local-mongoose");

const { Schema } = mongoose;

const GENERIC_LOGIN_ERROR = "Invalid username or password.";

const userSchema = new Schema(
  {
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxlength: 254,
      index: true,
    },
    displayName: { type: String, trim: true, maxlength: 60 },
    phone: { type: String, trim: true, maxlength: 20 },
    bio: { type: String, trim: true, maxlength: 500 },
    location: { type: String, trim: true, maxlength: 100 },
    profilePhoto: { type: String, trim: true },
    googleId: { type: String, index: { unique: true, sparse: true } },
    githubId: { type: String, index: { unique: true, sparse: true } },
    wishlist: [{ type: Schema.Types.ObjectId, ref: "Listing" }],
    resetPasswordTokenHash: { type: String, select: false },
    resetPasswordExpires: { type: Date, select: false },
  },
  { timestamps: true },
);

userSchema.plugin(passportLocalMongoose, {
  usernameField: "username",
  limitAttempts: true,
  maxAttempts: 10,
  unlockInterval: 15 * 60 * 1000,
  errorMessages: {
    IncorrectPasswordError: GENERIC_LOGIN_ERROR,
    IncorrectUsernameError: GENERIC_LOGIN_ERROR,
    NoSaltValueStoredError: GENERIC_LOGIN_ERROR,
    AttemptTooSoonError: "Too many failed attempts. Please try again shortly.",
    TooManyAttemptsError:
      "This account is temporarily locked after repeated failed sign-in attempts. Try again in 15 minutes.",
    UserExistsError: "That username is already taken.",
  },
});

userSchema.virtual("name").get(function name() {
  return this.displayName || this.username;
});

/** Whether the account has a local password (the hash field is not selected by default). */
userSchema.statics.hasPassword = async function hasPassword(userId) {
  const user = await this.findById(userId).select("+hash");
  return Boolean(user && user.hash);
};

module.exports = mongoose.model("User", userSchema);
