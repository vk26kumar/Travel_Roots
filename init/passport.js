require("dotenv").config();
const User = require("../models/user");
const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const FacebookStrategy = require("passport-facebook").Strategy;
const GitHubStrategy = require("passport-github2").Strategy;
const LinkedInStrategy = require("passport-linkedin-oauth2").Strategy;

passport.use(
    new GoogleStrategy(
        {
            clientID: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            callbackURL: process.env.GOOGLE_CALLBACK_URL,
        },
        async (accessToken, refreshToken, profile, done) => {
            try {
                console.log("🔍 Google Profile:", profile);

                let user = await User.findOne({ googleId: profile.id });

                if (!user) {
                    // Ensure a unique username
                    let baseUsername = profile.displayName.replace(/\s+/g, "_"); // Replace spaces with underscores
                    let uniqueUsername = baseUsername;
                    let count = 1;

                    // Check if username already exists, and increment number until it's unique
                    while (await User.findOne({ username: uniqueUsername })) {
                        uniqueUsername = `${baseUsername}_${count}`;
                        count++;
                    }

                    user = new User({
                        googleId: profile.id,
                        username: uniqueUsername, // Guaranteed to be unique
                        email: profile.emails ? profile.emails[0].value : "",
                        profilePhoto: profile.photos ? profile.photos[0].value : "",
                        password: "GoogleOAuth",
                    });

                    await user.save();
                    console.log("✅ New User Created:", user);
                } else {
                    console.log("✅ Existing User Found:", user);
                }

                return done(null, user);
            } catch (err) {
                console.error("❌ Error in Google OAuth Callback:", err);
                return done(err, null);
            }
        }
    )
);

passport.use(new GitHubStrategy(
    {
        clientID: process.env.GITHUB_CLIENT_ID,
        clientSecret: process.env.GITHUB_CLIENT_SECRET,
        callbackURL: process.env.GITHUB_CALLBACK_URL,
    },
    async (accessToken, refreshToken, profile, done) => {
        try {
            console.log("🔍 GitHub Profile:", profile);

            // Fetch user's email from GitHub API (if not provided in profile)
            let email = profile.emails && profile.emails.length > 0 
                ? profile.emails[0].value 
                : null;

            // If GitHub does not provide email, create a fallback email
            if (!email) {
                email = `github_${profile.id}@example.com`;  // Fallback email
            }

            let user = await User.findOne({ githubId: profile.id });

            if (!user) {
                // Ensure a unique username
                let baseUsername = profile.username || `GitHubUser${profile.id}`;
                let uniqueUsername = baseUsername;
                let count = 1;

                // Check if username already exists, and increment number until it's unique
                while (await User.findOne({ username: uniqueUsername })) {
                    uniqueUsername = `${baseUsername}_${count}`;
                    count++;
                }

                user = new User({
                    githubId: profile.id,
                    username: uniqueUsername,
                    email: email,  // Guaranteed to have a value now
                    profilePhoto: profile.photos ? profile.photos[0].value : "",
                    password: "GitHubOAuth",
                });

                await user.save();
                console.log("✅ New GitHub User Created:", user);
            } else {
                console.log("✅ Existing GitHub User Found:", user);
            }

            return done(null, user);
        } catch (err) {
            console.error("❌ Error in GitHub OAuth Callback:", err);
            return done(err, null);
        }
    }
));




passport.serializeUser((user, done) => {
    done(null, user._id);  // Store MongoDB `_id`
});

passport.deserializeUser(async (id, done) => {
    try {
        const user = await User.findById(id);
        done(null, user);
    } catch (err) {
        done(err, null);
    }
});
