const express = require("express");
const router = express.Router();
const wrapAsync = require("../utlity/wrapAsync.js")
const Listing = require("../models/listing.js");
const {isLoggedIn, isOwner, validateListing} = require("../middleware.js");
const listingController = require("../controllers/listing.js");
const multer  = require('multer');
const {storage} = require("../cloudConfig.js");
const upload = multer({ storage });


//Combining INDEX and CREATE route using router.route method
router
    .route("/")
    .get(wrapAsync(listingController.index))
    .post( 
        isLoggedIn, 
        upload.single('listing[image]'), //this is middleware
        validateListing,
        wrapAsync (listingController.createListing)
    );

// Use this middleware on your route
router.get("/listings/new", isLoggedIn, (req, res) => {
    res.render("listings/new");
});

//NEW ROUTE
router.get("/new", isLoggedIn,listingController.renderNewForm);


//combining SHOW,UPADTE and DELETE route using router.route method
router.route("/:id")
    .get(wrapAsync (listingController.showListing))
    .put(
        isLoggedIn, 
        isOwner,
        upload.single('listing[image]'),
        validateListing,
        wrapAsync (listingController.updateListing)
    )
    .delete(
        isLoggedIn,
        isOwner, 
        wrapAsync (listingController.deleteListing)
    );


//EDIT ROUTE
router.get("/:id/edit",
    isLoggedIn, 
    isOwner,
    wrapAsync (listingController.editListing)
); 


module.exports = router;