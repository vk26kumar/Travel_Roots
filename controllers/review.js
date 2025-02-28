const Review = require("../models/review.js");
const Listing = require("../models/listing.js"); 

// POST REVIEW ROUTE
module.exports.postReview = async(req,res)=>{
    let listing = await Listing.findById(req.params.id);
    let newReview = new Review(req.body.review);
    newReview.author = req.user._id;
    listing.reviews.push(newReview);

    await newReview.save();
    await listing.save();
    req.flash("success", "New Review created successfully");
    res.redirect(`/listings/${listing._id}`);
};

//DELETE REVIEW ROUTE
module.exports.destoryReview = async(req,res)=>{
    let { id, reviewId } = req.params;
    await Listing.findByIdAndUpdate(id,{$pull: { reviews: reviewId }});
    await Review.findByIdAndDelete(reviewId);

    req.flash("success", "Review deleted successfully");
    res.redirect(`/listings/${id}`);
};