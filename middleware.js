const Listing = require("./models/listing.js");
const Review = require("./models/review.js");
const ExpressError = require("./utlity/ExpressError.js");
const {listingSchema, reviewSchema} = require("./schema.js");


// VALIDATE FUNCTION FOR Listing
module.exports.validateListing = (req, res, next)=>{
    let {error} = listingSchema.validate(req.body);
    if (error) {
        let errMsg = error.details.map((el) => el.message).join(",");     //COMBINING ALL ERROR MSG
        throw new ExpressError(400,errMsg); 
    }else{
        next();
    }
};  

//VALIDATE FUNCTION FOR REVIEW
module.exports.validateReview = (req, res, next)=>{
    let {error} = reviewSchema.validate(req.body);
    if (error) {
        let errMsg = error.details.map((el) => el.message).join(",");     //COMBINING ALL ERROR MSG
        throw new ExpressError(400,errMsg); 
    }else{
        next();
    }
}; 

// TO CHECK USER IS LOGIN OR NOT
module.exports.isLoggedIn = (req,res,next)=>{
    if(!req.isAuthenticated()){
    req.session.redirectUrl = req.originalUrl; //storing the orignal url on which user is trying to reach
    req.flash("error","You must me logged in to create Listing.");
    return res.redirect("/signup");
    };
    next();
}; 




// TO STOR LOCAL ADDRESS OF USER WHERE USER IS TRYING TO RECH BEFORE LOGIN OR SIGNUP
module.exports.saveRedirectUrl = (req, res, next) => {
    if(req.session.redirectUrl){
        res.locals.redirectUrl = req.session.redirectUrl;
        delete req.session.redirectUrl; //clear after use
    }
    next();
};

//TO CHECK THAT USER IS OWNER OF THAT LISTING OR NOT
module.exports.isOwner = async (req, res, next)=>{
    let {id} = req.params; 
    let listing = await Listing.findById(id);
    if(!listing.owner._id.equals(res.locals.currUser._id)){
        req.flash("error", "You are not the owner of this listing.");
        return res.redirect(`/listings/${id}`);
    }
    next();
}

//TO CHECK THAT USER IS AUTHOR OF THAT REVIEW OR NOT
module.exports.isReviewAuthor = async (req, res, next)=>{
    let { id,reviewId } = req.params; 
    let review = await Review.findById(reviewId);
    if(!review.author.equals(res.locals.currUser._id)){
        req.flash("error", "You are not the author of this review.");
        return res.redirect(`/listings/${id}`);
    }
    next();
}