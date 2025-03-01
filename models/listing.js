const mongoose = require("mongoose");
const review = require("./review");
const Schema = mongoose.Schema;
const Review = require("./review.js");
const { required } = require("joi");


const listingSchema = new Schema({
    title: String,
    description: String,
    image: {
       url: String,
       filename: String,
    },
    price: Number,
    location: String,
    country: String,
    reviews:[
      {
        type: Schema.Types.ObjectId,
        ref:"Review",
      },
    ],
    owner: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    coordinates:{
      lat:Number,
      lon:Number,
    },
    category:{
      type: String,
      enum: ["Trending","Mountain", "Rooms", "Ionic Cities", "Castles", "Pools", "Camping", "Farms"],
      required:true,
    }
});


listingSchema.post("findOneAndDelete", async(listing)=>{
  if(listing){
    await review.deleteMany( {_id:{$in: listing.reviews}});
  }
});

const Listing = mongoose.model("Listing",listingSchema);
module.exports = Listing;