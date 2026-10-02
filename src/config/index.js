"use strict";

/**
 * Centralised application configuration.
 *
 * Every environment variable the application reads is parsed here so the rest
 * of the codebase never touches `process.env` directly. Optional integrations
 * (OAuth, payments, geocoding, email) are switched off automatically when their
 * credentials are missing, which keeps local development and CI friction-free.
 */

const path = require("path");

const env = process.env.NODE_ENV || "development";

// Only development reads .env (with Node's built-in loader). Tests never do, so
// they cannot reach real payment, OAuth or storage accounts. Variables that are
// already set in the environment always take precedence.
if (env === "development") {
  try {
    process.loadEnvFile(path.join(__dirname, "..", "..", ".env"));
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
}

// Some networks (VPN clients, local DNS proxies) refuse the SRV lookups that
// mongodb+srv:// connection strings need. DNS_SERVERS=1.1.1.1,8.8.8.8 makes
// Node use those resolvers instead of the system ones.
if (process.env.DNS_SERVERS) {
  require("dns").setServers(
    process.env.DNS_SERVERS.split(",")
      .map((server) => server.trim())
      .filter(Boolean),
  );
}

const isProduction = env === "production";
const isTest = env === "test";

function read(name, fallback = "") {
  const value = process.env[name];
  return value === undefined || value === "" ? fallback : value.trim();
}

function readInt(name, fallback) {
  const parsed = Number.parseInt(read(name), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

const port = readInt("PORT", 8080);
const appUrl = read("APP_URL", `http://localhost:${port}`).replace(/\/+$/, "");

const config = {
  env,
  isProduction,
  isTest,
  port,
  appUrl,
  trustProxy: readInt("TRUST_PROXY", isProduction ? 1 : 0),

  db: {
    url: read("ATLASDB_URL", read("MONGODB_URI", "mongodb://127.0.0.1:27017/travelroots")),
  },

  session: {
    secret: read("SECRET", isProduction ? "" : "development-only-session-secret-change-me"),
    name: "tr.sid",
    maxAgeMs: 7 * 24 * 60 * 60 * 1000,
  },

  cloudinary: {
    cloudName: read("CLOUD_NAME"),
    apiKey: read("CLOUD_API_KEY"),
    apiSecret: read("CLOUD_API_SECRET"),
    folder: read("CLOUD_FOLDER", "Travel_Roots_DATA"),
  },

  geoapify: {
    apiKey: read("MAP_API_KEY"),
  },

  google: {
    clientID: read("GOOGLE_CLIENT_ID"),
    clientSecret: read("GOOGLE_CLIENT_SECRET"),
    callbackURL: read("GOOGLE_CALLBACK_URL", `${appUrl}/auth/google/callback`),
  },

  github: {
    clientID: read("GITHUB_CLIENT_ID"),
    clientSecret: read("GITHUB_CLIENT_SECRET"),
    callbackURL: read("GITHUB_CALLBACK_URL", `${appUrl}/auth/github/callback`),
  },

  razorpay: {
    keyId: read("RAZORPAY_KEY_ID"),
    keySecret: read("RAZORPAY_KEY_SECRET"),
    webhookSecret: read("RAZORPAY_WEBHOOK_SECRET"),
  },

  mail: {
    host: read("SMTP_HOST"),
    port: readInt("SMTP_PORT", 587),
    user: read("SMTP_USER"),
    pass: read("SMTP_PASS"),
    from: read("MAIL_FROM", "Travel Roots <no-reply@travelroots.app>"),
  },

  support: {
    email: read("SUPPORT_EMAIL", "support@travelroots.app"),
  },

  pricing: {
    currency: "INR",
    taxRate: 0.18,
    maxNights: 30,
    maxAdvanceDays: 365,
    pendingHoldMinutes: 15,
  },
};

config.features = {
  google: Boolean(config.google.clientID && config.google.clientSecret),
  github: Boolean(config.github.clientID && config.github.clientSecret),
  payments: Boolean(config.razorpay.keyId && config.razorpay.keySecret),
  uploads: Boolean(
    config.cloudinary.cloudName && config.cloudinary.apiKey && config.cloudinary.apiSecret,
  ),
  geocoding: Boolean(config.geoapify.apiKey),
  email: Boolean(config.mail.host),
};

/**
 * Fails fast on configuration that would make a production deployment unsafe.
 * Returns a list of non-fatal warnings for the caller to log.
 */
config.validate = function validate() {
  const errors = [];
  const warnings = [];

  if (isProduction) {
    if (!process.env.ATLASDB_URL && !process.env.MONGODB_URI) {
      errors.push("ATLASDB_URL (or MONGODB_URI) is required in production.");
    }
    if (!config.session.secret) {
      errors.push("SECRET is required in production.");
    } else if (config.session.secret.length < 32) {
      warnings.push("SECRET is shorter than 32 characters; use a long random value.");
    }
    if (!process.env.APP_URL) {
      warnings.push("APP_URL is not set; password reset links will point to localhost.");
    }
    if (config.features.payments && !config.razorpay.webhookSecret) {
      warnings.push("RAZORPAY_WEBHOOK_SECRET is not set; payment webhooks will be rejected.");
    }
  }

  for (const [feature, enabled] of Object.entries(config.features)) {
    if (!enabled && !isTest) warnings.push(`Optional feature "${feature}" is disabled.`);
  }

  if (errors.length) {
    const error = new Error(`Invalid configuration:\n  - ${errors.join("\n  - ")}`);
    error.code = "ECONFIG";
    throw error;
  }
  return warnings;
};

module.exports = config;
