"use strict";

const path = require("path");
const express = require("express");
const session = require("express-session");
const cookieParser = require("cookie-parser");
const compression = require("compression");
const methodOverride = require("method-override");
const morgan = require("morgan");
const flash = require("./middleware/flash");
const ejsMate = require("ejs-mate");
const rateLimit = require("express-rate-limit");

const config = require("./config");
const securityHeaders = require("./config/security");
const { configurePassport } = require("./config/passport");
const csrfProtection = require("./middleware/csrf");
const sanitizeRequest = require("./middleware/sanitize");
const { parseMultipart } = require("./middleware/upload");
const { viewLocals } = require("./middleware/locals");
const { notFound, errorHandler } = require("./middleware/errors");
const pages = require("./controllers/pages");

const webhookRoutes = require("./routes/webhooks");
const pageRoutes = require("./routes/pages");
const authRoutes = require("./routes/auth");
const listingRoutes = require("./routes/listings");
const reviewRoutes = require("./routes/reviews");
const bookingRoutes = require("./routes/bookings");
const profileRoutes = require("./routes/profile");

const ROOT = path.join(__dirname, "..");

const SPECULATION_RULES = JSON.stringify({
  prefetch: [
    {
      where: {
        and: [
          { href_matches: "/*" },
          {
            not: {
              href_matches: [
                "/logout",
                "/login",
                "/signup",
                "/forgot-password",
                "/reset-password/*",
                "/auth/*",
                "/webhook/*",
                "/bookings/*",
                "/listings/*/book",
                "/listings/new",
              ],
            },
          },
          { not: { selector_matches: "[data-no-prefetch], [target=_blank], [download]" } },
        ],
      },
      eagerness: "moderate",
    },
  ],
});

/**
 * Builds the Express application.
 *
 * @param {{ sessionStore?: import("express-session").Store }} [options]
 *   A session store. Production passes a MongoDB-backed store; tests use the
 *   default in-memory store.
 */
function createApp({ sessionStore } = {}) {
  const app = express();
  const passport = configurePassport();

  app.set("trust proxy", config.trustProxy);
  app.set("query parser", "simple");
  app.disable("x-powered-by");
  app.engine("ejs", ejsMate);
  app.set("view engine", "ejs");
  app.set("views", path.join(ROOT, "views"));
  if (config.isProduction) app.set("view cache", true);

  app.use(securityHeaders);
  app.use(compression());

  if (!config.isTest) {
    app.use(
      morgan(config.isProduction ? "combined" : "dev", {
        skip: (req) => req.path === "/healthz" || req.path === "/readyz",
      }),
    );
  }

  // Versioned URLs (?v=<content hash>) are immutable; anything else is revalidated daily.
  const staticOptions = {
    setHeaders(res) {
      if (!config.isProduction) return res.setHeader("Cache-Control", "no-cache");
      const versioned = res.req && res.req.query && res.req.query.v;
      return res.setHeader(
        "Cache-Control",
        versioned ? "public, max-age=31536000, immutable" : "public, max-age=86400",
      );
    },
  };
  const vendor = (pkgPath) => path.join(ROOT, "node_modules", pkgPath);
  app.use(express.static(path.join(ROOT, "public"), staticOptions));
  app.use("/vendor/bootstrap", express.static(vendor("bootstrap/dist/css"), staticOptions));
  app.use("/vendor/leaflet", express.static(vendor("leaflet/dist"), staticOptions));
  app.use(
    "/vendor/fonts",
    express.static(vendor("@fontsource-variable/inter/files"), staticOptions),
  );
  app.use(
    "/vendor/fonts",
    express.static(vendor("@fontsource-variable/fraunces/files"), staticOptions),
  );

  // Hover prefetching (Chrome and Edge): pages start loading before the click,
  // hiding most of the server's response time. Pages with side effects are excluded.
  app.get("/speculation-rules.json", (req, res) => {
    res.set("Cache-Control", "public, max-age=86400");
    res.type("application/speculationrules+json").send(SPECULATION_RULES);
  });

  // Health probes and payment webhooks bypass sessions, CSRF and rate limiting.
  app.get("/healthz", pages.health);
  app.get("/readyz", pages.ready);
  app.use("/webhook", webhookRoutes);

  if (!config.isTest) {
    app.use(
      rateLimit({
        windowMs: 15 * 60 * 1000,
        limit: 600,
        standardHeaders: "draft-7",
        legacyHeaders: false,
        message: "Too many requests from this address. Please try again later.",
      }),
    );
  }

  app.use(express.urlencoded({ extended: true, limit: "100kb", parameterLimit: 100 }));
  app.use(express.json({ limit: "100kb" }));
  app.use(cookieParser());

  app.use(
    session({
      store: sessionStore,
      name: config.session.name,
      secret: config.session.secret,
      resave: false,
      saveUninitialized: false,
      rolling: true,
      proxy: config.isProduction,
      cookie: {
        httpOnly: true,
        sameSite: "lax",
        secure: config.isProduction,
        maxAge: config.session.maxAgeMs,
      },
    }),
  );
  app.use(flash);
  app.use(passport.initialize());
  app.use(passport.session());

  app.use(parseMultipart);
  app.use(methodOverride("_method"));
  app.use(sanitizeRequest);
  app.use(csrfProtection);
  app.use(viewLocals);

  app.use("/", pageRoutes);
  app.use("/", authRoutes);
  app.use("/listings", listingRoutes);
  app.use("/listings/:id/reviews", reviewRoutes);
  app.use("/bookings", bookingRoutes);
  app.use("/profile", profileRoutes);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}

module.exports = { createApp };
