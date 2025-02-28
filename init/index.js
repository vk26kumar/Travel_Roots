const mongoose = require("mongoose");
const initData = require("./data.js");
const Listing = require("../models/listing.js");

const MONGO_URL = "mongodb://127.0.0.1:27017/TravelRoots";

main().then(()=>{
    console.log("connected to Database");
})
.catch((err)=>{
    console.log(err);
});

async function main() {
    await mongoose.connect(MONGO_URL);  
};


const initDB = async ()=>{
    await Listing.deleteMany({});
    initData.data = initData.data.map((obj) => ({
     ...obj, 
     owner: "67a9e3d33d39b2c0575fb59e",
    }));
    await Listing.insertMany(initData.data);
    console.log("data initialized");
};

initDB();