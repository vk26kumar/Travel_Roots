if(process.env.NODE_ENV != "production"){
    require('dotenv').config();
}

const express = require("express");
const app =express();
const path = require("path");
const methodOverride = require("method-override");
const mongoose = require("mongoose");
const { title } = require("process");
const ejsMate = require("ejs-mate");
const ExpressError = require("./utlity/ExpressError.js");
const cookieParser = require("cookie-parser");
const session = require("express-session");
const MongoStore = require('connect-mongo');
const flash = require("connect-flash");
const passport = require("passport");
const LocalStrategy = require("passport-local");
const User = require("./models/user.js");

const listingRouter = require("./routes/listing.js");
const reviewRouter = require("./routes/review.js");
const userRouter = require("./routes/user.js");
require("./init/passport.js");


const dbUrl = process.env.ATLASDB_URL;
  
main().then(()=>{
    console.log("connected to Database");
})
.catch((err)=>{
    console.log(err);
});
async function main() {
    await mongoose.connect(dbUrl);  
};


app.set("view engine","ejs");
app.set("views", path.join(__dirname,"/views"));
app.use(express.static(path.join(__dirname,"public")));
app.use(express.static("public"));
app.use(express.urlencoded({extended:true}));
app.use(express.json());
app.use(methodOverride("_method"));
app.engine('ejs', ejsMate);
app.use(cookieParser());


const store = MongoStore.create({
    mongoUrl: dbUrl,
    crypto:{
        secret:process.env.SECRET,
    },
    touchAfter:24*3600,
});

store.on("error", () => {
    console.log("ERROR in MONGO SESSION STORE", err);
})

const sessionOptions = {
    store,
    secret:process.env.SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: {
        expires: Date.now() + 7 * 24 * 60 * 60 * 1000,     //7 DAYS IN MILLISECOND
        maxAge:7 * 24 * 60 * 60 * 1000,
        httpOnly:true,
    },
}; 

app.use(session(sessionOptions));
app.use(flash());


// If logged in, set user; otherwise, set null
app.use((req, res, next) => {
    res.locals.currUser = req.user || null; 
    next();
});

// This makes searchQuery available in all views
app.use((req, res, next) => {
    res.locals.searchQuery = req.query.search || ""; 
    next();
});


// Google Auth
app.get("/auth/google", passport.authenticate("google", { scope: ["profile", "email"] }));
// google Callback Route
app.get("/auth/google/callback",
  passport.authenticate("google", { failureRedirect: "/" }),
  (req, res) => {
    res.redirect("/listings");
  }
);

// GitHub Auth
app.get("/auth/github", passport.authenticate("github"));
// GitHub Callback Route
app.get("/auth/github/callback",
  passport.authenticate("github", { failureRedirect: "/" }),
  (req, res) => {
    console.log("✅ GitHub Authentication Successful:", req.user);
    res.redirect("/listings");
  }
);



// Initialize Passport Middleware
app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

 
app.use((req, res, next)=>{
    res.locals.success = req.flash("success");
    res.locals.error = req.flash("error");
    res.locals.currUser = req.user;
    next();
});


// ROUTER REQUIRE
const listings = require("./routes/listing.js");
const reviews = require("./routes/review.js");

//LISTING AND REVIEW ROUTE
app.use("/listings",listingRouter);
app.use("/listings/:id/reviews",reviewRouter);
app.use("/",userRouter);

//ERROR
app.all("*",(req, res, next)=>{
    next(new ExpressError(404,"Page not found"));   //Assigned a castam message,if its not defined then it will show defalut status and message
})

// ERROR HANDLING MIDDLEWARE
app.use((err, req, res, next)=>{
    let {status = 500, message = "SOMETHING WENT WRONG"} = err;  //Assigned a defalut value of status and message
    res.status(status).render("error.ejs", {message});
})

// ERROR WHEN NO CATEGORY IS FOUND
app.get("/", (req, res) => {
  req.flash("error", "No listing found in this category");
  res.render("index", { error: req.flash("error") });
});




//HOST
app.listen(8080, ()=>{
    console.log("server working");
});
