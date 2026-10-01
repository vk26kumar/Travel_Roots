"use strict";

const express = require("express");
const reviews = require("../controllers/reviews");
const { isLoggedIn, isReviewAuthor } = require("../middleware/auth");
const { validateBody, validateObjectId, flashAndRedirect } = require("../middleware/validate");
const { reviewSchema } = require("../validation/schemas");

const router = express.Router({ mergeParams: true });

router.post(
  "/",
  validateObjectId("id"),
  isLoggedIn,
  validateBody(reviewSchema, {
    onError: flashAndRedirect((req) => `/listings/${req.params.id}#reviews`),
  }),
  reviews.createReview,
);

router.delete(
  "/:reviewId",
  validateObjectId("id", "reviewId"),
  isLoggedIn,
  isReviewAuthor,
  reviews.deleteReview,
);

module.exports = router;
