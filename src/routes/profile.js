"use strict";

const express = require("express");
const profile = require("../controllers/profile");
const { isLoggedIn } = require("../middleware/auth");
const { validateBody, flashAndRedirect } = require("../middleware/validate");
const {
  profileSchema,
  changePasswordSchema,
  deleteAccountSchema,
} = require("../validation/schemas");

const router = express.Router();

router.use(isLoggedIn);

router
  .route("/")
  .get(profile.showProfile)
  .put(
    validateBody(profileSchema, { onError: flashAndRedirect("/profile/settings") }),
    profile.updateProfile,
  )
  .delete(
    validateBody(deleteAccountSchema, { onError: flashAndRedirect("/profile/settings#danger") }),
    profile.deleteAccount,
  );

router.get("/settings", profile.renderSettings);

router.put(
  "/password",
  validateBody(changePasswordSchema, { onError: flashAndRedirect("/profile/settings#security") }),
  profile.changePassword,
);

module.exports = router;
