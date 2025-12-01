const Joi = require("joi");
const review = require("./models/review");

module.exports.listingSchema = Joi.object({
    listing: Joi.object({
        title: Joi.string().required(),
        description: Joi.string().required(),
        location: Joi.string().required(),
        country: Joi.string().required(),
        phone: Joi.string().required(),
        email: Joi.string().required(),
        price: Joi.number().required().min(0),
        image: Joi.allow("", null),
        category: Joi.string()
            .valid(
                "Trending", 
                "Mountain", 
                "Rooms", 
                "Ionic Cities", 
                "Castles", 
                "Pools", 
                "Camping", 
                "Farms")
            .required(),
    }).required(),
});

module.exports.reviewSchema = Joi.object({
    review: Joi.object({
        rating: Joi.number().required().min(1).max(5),
        comment: Joi.required(),
    }).required(),
});
