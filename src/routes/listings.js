"use strict";

const express = require("express");
const listings = require("../controllers/listings");
const { isLoggedIn, isOwner } = require("../middleware/auth");
const { validateBody, validateObjectId, flashAndRedirect } = require("../middleware/validate");
const { listingSchema } = require("../validation/schemas");

const router = express.Router();

const validateListing = (redirect) =>
  validateBody(listingSchema, { onError: flashAndRedirect(redirect) });

router
  .route("/")
  .get(listings.index)
  .post(isLoggedIn, validateListing("/listings/new"), listings.createListing);

router.get("/new", isLoggedIn, listings.renderNewForm);

router
  .route("/:id")
  .all(validateObjectId("id"))
  .get(listings.showListing)
  .put(
    isLoggedIn,
    isOwner,
    validateListing((req) => `/listings/${req.params.id}/edit`),
    listings.updateListing,
  )
  .delete(isLoggedIn, isOwner, listings.deleteListing);

router.get("/:id/edit", validateObjectId("id"), isLoggedIn, isOwner, listings.renderEditForm);
router.get("/:id/book", validateObjectId("id"), isLoggedIn, listings.renderBookingForm);
router.post("/:id/wishlist", validateObjectId("id"), isLoggedIn, listings.toggleWishlist);

module.exports = router;
