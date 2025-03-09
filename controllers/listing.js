const Listing = require("../models/listing");
const axios = require("axios");
const geoApiKey = process.env.MAP_API_KEY;
require("dotenv").config();


// INDEX ROUTE with Search & No Results Alert
module.exports.index = async (req, res) => {
    const searchQuery = req.query.search?.trim() || ""; // Get search term

    const filter = searchQuery
        ? { 
            $or: [
                { location: new RegExp(searchQuery, "i") }, 
                { country: new RegExp(searchQuery, "i") }
            ] 
        }
        : {}; // If no search, return all listings

    const allListing = await Listing.find(filter);

    const noResults = allListing.length === 0 ? "Sorry, no destination found for this location." : "";

    res.render("listing/index.ejs", { allListing, searchQuery, noResults });
};




//NEW ROUTE
module.exports.renderNewForm = (req,res)=>{
    res.render("listing/new.ejs");
};


//SHOW ROUTE
module.exports.showListing = async(req,res)=>{
    let {id} = req.params; 
    const listing = await Listing.findById(id)
    .populate({
        path:"reviews",
    populate:{
        path:"author",
    },
    })
    .populate("owner");
    if(!listing){
        req.flash("error", "Listing you are requesting for does not exist. ");
        res.redirect("/listings");
    }
    res.render("listing/show.ejs",{listing});
};


// CREATE ROUTE
module.exports.createListing = async(req,res, next)=>{
    let { location, category, email, phone } = req.body.listing;
    let url = req.file.path;
    let filename = req.file.filename;
    const geoUrl = `https://api.geoapify.com/v1/geocode/search?text=${encodeURIComponent(location)}&apiKey=${geoApiKey}`;

    // Fetch coordinates
    const geoResponse = await axios.get(geoUrl);
    let coordinates = { lat: 28.6139, lon: 77.2090 }; // Default: New Delhi

    if (geoResponse.data.features.length > 0) {
        coordinates.lat = geoResponse.data.features[0].geometry.coordinates[1];
        coordinates.lon = geoResponse.data.features[0].geometry.coordinates[0];
    }

    const newListing = new Listing({
        ...req.body.listing,
        owner: req.user._id,
        image: { url, filename },
        coordinates, // Save coordinates in the database
        category,
        email,
        phone,
    });

    await newListing.save(); 
    req.flash("success", "New Listing created successfully.");
    res.redirect("/listings");
};


//EDIT ROUTE
module.exports.editListing = async(req,res)=>{
    let {id} = req.params; 
    const listing = await Listing.findById(id);
    if(!listing){
        req.flash("error", "Listing you are requesting for does not exist.");
        res.redirect("/listings");
    }

    let originalImageUrl = listing.image.url;
    originalImageUrl = originalImageUrl.replace("/upload", "/upload/h_30,w_250");
    res.render("listing/edit.ejs",{listing, originalImageUrl});
};


// UPDATE ROUTE
module.exports.updateListing = async (req, res) => {
    let { id } = req.params;

    // Find and update the listing with the new data including category
    let listing = await Listing.findByIdAndUpdate(id, { ...req.body.listing });

    // If a new image is uploaded, update it
    if (typeof req.file !== "undefined") {
        let url = req.file.path;
        let filename = req.file.filename;
        listing.image = { url, filename };
        await listing.save();
    }

    req.flash("success", "Listing updated successfully");
    res.redirect(`/listings/${id}`);
};



//DELETE ROUTE
module.exports.deleteListing = async(req,res)=>{
    let {id} = req.params; 
    await Listing.findByIdAndDelete(id);
    req.flash("success", "Listing deleted successfully");
    res.redirect("/listings");
};

//BOOK ROUTE
module.exports.bookListing = async (req, res) => {
    let { id } = req.params;
    let listing = await Listing.findById(id); 
    if (!listing) {
        req.flash("error", "Listing not found!");
        return res.redirect("/listings");
    }
    res.render("listing/book", { listing }); 
};
