const User = require("../models/user.js");


// Handle User Registration (POST /signup)
module.exports.signup = async (req, res, next) => {
    try {
        const { username, email, password } = req.body;
        const newUser = new User({ email, username });
        const registeredUser = await User.register(newUser, password);
        console.log(registeredUser);

        // Log the user in immediately after signup
        req.login(registeredUser, (err) => {
            if (err) return next(err);
            req.flash("success", `Hey ${username}! Welcome to Travel Root`);
            let redirectUrl = res.locals.redirectUrl || "/listings"; // Default to listings page
            res.redirect(redirectUrl);
        });
    } catch (error) {
        req.flash("error", error.message);
        res.redirect("/signup");
    }
};

// Handle Login (POST /login)
module.exports.login = (req, res) => {
    req.flash("success", `Hey ${req.user.username}! Welcome to Travel Root`);
    let redirectUrl = res.locals.redirectUrl || "/listings"; // Default if no saved URL
    res.redirect(redirectUrl);
};

// Handle Logout
module.exports.logout = (req,res)=>{
    req.logout((err)=>{
        if(err){
            return next(err);
        }
        req.flash("success", "You are logged out!");
        res.redirect("/listings");
    })
};