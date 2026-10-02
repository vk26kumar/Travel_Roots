"use strict";

const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const GitHubStrategy = require("passport-github2").Strategy;
const User = require("../models/user");
const userCache = require("../utils/userCache");
const config = require("./index");
const logger = require("../utils/logger");

/** Derives a unique, policy-compliant username from an OAuth profile. */
async function uniqueUsername(seed) {
  let base = String(seed || "traveller")
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9_.-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 24);
  if (base.length < 3) base = `traveller_${base}`.slice(0, 24);

  let candidate = base;
  for (let attempt = 1; await User.exists({ username: candidate }); attempt += 1) {
    candidate = `${base}_${attempt}`;
  }
  return candidate;
}

/**
 * Finds or creates the user for an OAuth login. An existing local account is
 * linked only when the provider reports the email address as verified, which
 * prevents account takeover through unverified provider emails.
 */
async function findOrCreateOAuthUser({ provider, providerId, email, emailVerified, name, photo }) {
  const idField = provider === "google" ? "googleId" : "githubId";

  let user = await User.findOne({ [idField]: providerId });
  if (user) return user;

  if (email && emailVerified) {
    user = await User.findOne({ email: email.toLowerCase() });
    if (user) {
      user[idField] = providerId;
      if (!user.profilePhoto && photo) user.profilePhoto = photo;
      await user.save();
      logger.info("Linked OAuth provider to existing account", { provider, userId: user.id });
      return user;
    }
  }

  user = await User.create({
    [idField]: providerId,
    username: await uniqueUsername(name),
    displayName: name ? String(name).slice(0, 60) : undefined,
    email: email || `${providerId}@users.noreply.${provider}.com`,
    profilePhoto: photo || undefined,
  });
  logger.info("Created account from OAuth login", { provider, userId: user.id });
  return user;
}

function configurePassport() {
  passport.use(new LocalStrategy(User.authenticate()));

  if (config.features.google) {
    passport.use(
      new GoogleStrategy(
        {
          clientID: config.google.clientID,
          clientSecret: config.google.clientSecret,
          callbackURL: config.google.callbackURL,
        },
        async (accessToken, refreshToken, profile, done) => {
          try {
            const email = profile.emails && profile.emails[0];
            const user = await findOrCreateOAuthUser({
              provider: "google",
              providerId: profile.id,
              email: email && email.value,
              emailVerified: Boolean(
                (email && email.verified) || (profile._json && profile._json.email_verified),
              ),
              name: profile.displayName,
              photo: profile.photos && profile.photos[0] && profile.photos[0].value,
            });
            return done(null, user);
          } catch (error) {
            logger.error("Google OAuth callback failed", error);
            return done(error);
          }
        },
      ),
    );
  }

  if (config.features.github) {
    passport.use(
      new GitHubStrategy(
        {
          clientID: config.github.clientID,
          clientSecret: config.github.clientSecret,
          callbackURL: config.github.callbackURL,
          scope: ["user:email"],
          allRawEmails: true,
        },
        async (accessToken, refreshToken, profile, done) => {
          try {
            const emails = profile.emails || [];
            const primary = emails.find((entry) => entry.primary) || emails[0];
            const user = await findOrCreateOAuthUser({
              provider: "github",
              providerId: profile.id,
              email: primary && primary.value,
              emailVerified: Boolean(primary && primary.verified),
              name: profile.username || profile.displayName,
              photo: profile.photos && profile.photos[0] && profile.photos[0].value,
            });
            return done(null, user);
          } catch (error) {
            logger.error("GitHub OAuth callback failed", error);
            return done(error);
          }
        },
      ),
    );
  }

  passport.serializeUser((user, done) => done(null, user.id));

  passport.deserializeUser(async (id, done) => {
    try {
      // Served from memory when possible; see src/utils/userCache.js.
      const cached = userCache.get(id);
      if (cached) return done(null, cached);
      const user = await User.findById(id);
      if (user) userCache.set(id, user);
      return done(null, user || false);
    } catch (error) {
      return done(error);
    }
  });

  return passport;
}

module.exports = { configurePassport };
