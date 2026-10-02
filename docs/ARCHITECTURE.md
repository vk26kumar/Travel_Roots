# Architecture

This document explains how Travel Roots is built and why. It is written so that someone opening the project for the first time, or years from now, can understand every moving part without reading the code first.

## Contents

- [The big picture](#the-big-picture)
- [How a request is handled](#how-a-request-is-handled)
- [Code layout](#code-layout)
- [Routes](#routes)
- [Data model](#data-model)
- [Booking and payment flow](#booking-and-payment-flow)
- [Authentication and accounts](#authentication-and-accounts)
- [Caching](#caching)
- [Front end](#front-end)
- [Design decisions](#design-decisions)
- [Known limitations](#known-limitations)

---

## The big picture

Travel Roots is a server-rendered web application. There is no single-page front-end framework and no build step: Express renders EJS templates on the server, and a small amount of plain JavaScript adds interactivity in the browser.

```
            Browser
               |
        HTTPS (Cloudflare in front of Render)
               |
     Node.js process (server.js -> src/app.js)
       |            |             |              |
   MongoDB      Cloudinary     Razorpay      Google / GitHub
   (Atlas)      (photos)       (payments)    (OAuth sign-in)
                                   |
                         Geoapify (geocoding), SMTP (email),
                         OpenStreetMap (map tiles, from the browser)
```

Only MongoDB is required. Every other service is optional and switches on automatically when its credentials are present (see `config.features` in `src/config/index.js`).

## How a request is handled

Middleware runs in this order (see `src/app.js`):

1. **Security headers** (Helmet with a strict Content Security Policy) and **compression**.
2. **Access log** (morgan), except for health probes.
3. **Static files** from `public/` and vendor folders. These never touch sessions or the database.
4. **Speculation rules, health probes and the Razorpay webhook.** The webhook needs the raw request body to verify its signature, so it is mounted before the body parsers.
5. **Rate limiting** (600 requests per 15 minutes per IP, outside tests).
6. **Body parsing** (forms and JSON, 100 KB limit) and cookies.
7. **Session** (express-session, cookie `tr.sid`) and **Passport**, which loads the signed-in user.
8. **Multipart parsing** for uploads (Multer, memory storage, one image up to 5 MB).
9. **Method override** (`?_method=PUT` or `DELETE` on HTML forms).
10. **Sanitising**: removes keys such as `$where`, `a.b` or `__proto__` from the body.
11. **CSRF check** on every POST, PUT and DELETE.
12. **View locals**: the current user, flash messages, feature flags and helpers for templates.
13. **Routes**, which apply validation (Joi) and authorisation, then call a controller.
14. **404 handler** and **error handler**, which render a friendly page, or JSON for API calls.

## Code layout

```
server.js               Starts the process: config check, MongoDB, session store, HTTP server, shutdown
app.js                  Loads server.js (kept because the original deployment ran "node app.js")
src/app.js              Builds the Express app; used by server.js and by the tests
src/config/             index.js (environment), security.js (Helmet), passport.js, session.js
src/controllers/        listings, reviews, bookings, auth, profile, pages
src/middleware/         auth guards, csrf, validate, upload, sanitize, flash, locals, errors
src/models/             User, Listing, Review, Booking (Mongoose)
src/routes/             One router per area; routes wire validation and guards to controllers
src/services/           pricing, payments (Razorpay), images (Cloudinary), geocode, mailer
src/utils/              helpers (formatting, image URLs, icons), constants, cache, userCache,
                        assets (content hash), logger, ExpressError
src/validation/         Joi schemas for every form and JSON body
views/                  layouts/boilerplate.ejs, includes/ (partials), one folder per area
public/                 css/app.css, js/ (app, theme, map, booking), images/, robots.txt
scripts/                seed, migrate, demo, assets/ (icon and image build scripts)
tests/                  Node test runner suites; helpers.js and fixtures.js are shared
docs/                   This file, OPERATIONS.md and DESIGN.md
```

Controllers stay thin. Business rules live in `src/services` (for example `pricing.js` decides nights, GST and totals), and input rules live in `src/validation/schemas.js`.

## Routes

| Method and path                                  | Purpose                                                    | Access         |
| ------------------------------------------------ | ---------------------------------------------------------- | -------------- |
| `GET /`                                          | Redirects to `/listings`                                   | Anyone         |
| `GET /listings`                                  | Home and browse: search, category, price, sort, pages      | Anyone         |
| `POST /listings`                                 | Create a listing (multipart form with photo)               | Signed in      |
| `GET /listings/new`                              | New listing form                                           | Signed in      |
| `GET /listings/:id`                              | Listing page                                               | Anyone         |
| `PUT /listings/:id`                              | Update a listing                                           | Host only      |
| `DELETE /listings/:id`                           | Delete a listing (refused with upcoming confirmed stays)   | Host only      |
| `GET /listings/:id/edit`                         | Edit form                                                  | Host only      |
| `GET /listings/:id/book`                         | Checkout page                                              | Signed in      |
| `POST /listings/:id/wishlist`                    | Save or unsave (JSON)                                      | Signed in      |
| `POST /listings/:id/reviews`                     | Add a review (one per guest, not the host)                 | Signed in      |
| `DELETE /listings/:id/reviews/:reviewId`         | Delete own review                                          | Review author  |
| `POST /bookings`                                 | Start a booking: validates dates, creates a Razorpay order | Signed in      |
| `POST /bookings/:id/verify`                      | Verify the payment signature, mark the booking paid        | Booking guest  |
| `POST /bookings/:id/cancel`                      | Release a pending booking when checkout is closed          | Booking guest  |
| `GET /bookings/:id`                              | Receipt                                                    | Guest or host  |
| `GET /login`, `POST /login`                      | Sign in with username and password                         | Signed out     |
| `GET /signup`, `POST /signup`                    | Create an account                                          | Signed out     |
| `POST /logout`                                   | Sign out                                                   | Signed in      |
| `GET /auth/google`, `GET /auth/github`           | OAuth sign-in and their `/callback` routes                 | Anyone         |
| `GET /forgot-password`, `POST /forgot-password`  | Request a reset link by email                              | Signed out     |
| `GET /reset-password/:token`, `POST ...`         | Choose a new password with a one-hour token                | Anyone         |
| `GET /profile`                                   | Profile with tabs: trips, saved, listings, reservations, reviews | Signed in |
| `PUT /profile`, `DELETE /profile`                | Update profile, delete account                             | Signed in      |
| `GET /profile/settings`, `PUT /profile/password` | Settings page, change or set password                      | Signed in      |
| `GET /privacy`, `/terms`, `/cookies`             | Legal pages                                                | Anyone         |
| `POST /webhook/razorpay`                         | Razorpay events (signature checked)                        | Razorpay       |
| `GET /healthz`, `GET /readyz`                    | Health probes (version, commit, database latency)          | Anyone         |
| `GET /speculation-rules.json`                    | Hover prefetch rules for Chrome and Edge                   | Anyone         |

Old URLs from version 1.x still work: `/dashboard` redirects to `/profile` and `/bookings/:id/success` to `/bookings/:id`.

## Data model

MongoDB holds four collections. All of them use Mongoose timestamps (`createdAt`, `updatedAt`) except where noted.

**users** (`src/models/user.js`)
- `username` (unique), `email`, password `hash` and `salt` (added by passport-local-mongoose, never selected by default).
- Optional profile: `displayName`, `phone`, `location`, `bio`, `profilePhoto`.
- `googleId`, `githubId` for OAuth accounts (unique, sparse).
- `wishlist`: array of listing ids.
- `attempts`, `last`: failed sign-in tracking for the temporary lockout.
- `resetPasswordTokenHash`, `resetPasswordExpires`: only a SHA-256 hash of the reset token is stored.

**listings** (`src/models/listing.js`)
- `title`, `description`, `price` (whole rupees per night), `location`, `country`, `category`.
- `image`: `{ url, filename }`. `filename` is the Cloudinary public id, or `listingimage` for images not stored in Cloudinary.
- `coordinates`: `{ lat, lon }` from Geoapify (New Delhi if geocoding fails or is disabled).
- `phone`, `email`: host contact details shown on the checkout page.
- `owner`: user id. `reviews`: array of review ids.
- `ratingAverage`, `ratingCount`: kept up to date by `Listing.refreshRating()` whenever a review is added or deleted.

**reviews** (`src/models/review.js`)
- `rating` (1 to 5), `comment`, `author` (user id), `listing` (listing id).

**bookings** (`src/models/booking.js`)
- `listing`, `user`, `fromDate`, `toDate` (UTC midnight), `nights`.
- `pricePerNight`, `subtotal`, `tax`, `amount` (total), `currency` (`INR`).
- `orderId` (Razorpay order, unique), `paymentId` (Razorpay payment, unique), `paidAt`.
- `status`: `PENDING`, `PAID`, `CONFIRMED`, `FAILED` or `CANCELLED`.

Booking statuses move like this:

```
PENDING --(checkout signature verified)--> PAID --(webhook payment.captured)--> CONFIRMED
PENDING --(webhook payment.captured)-----------------------------------------> CONFIRMED
PENDING --(guest closes checkout)--> CANCELLED
PENDING --(webhook payment.failed)--> FAILED
```

`PAID` and `CONFIRMED` bookings block their dates. A `PENDING` booking blocks its dates for 15 minutes so two guests cannot pay for the same nights at once.

Categories are fixed in `src/utils/constants.js`: Trending, Rooms, Iconic Cities, Mountain, Castles, Pools, Camping, Farms.

## Booking and payment flow

The browser never decides how much to charge.

1. The guest picks dates on `/listings/:id/book`. `public/js/booking.js` shows an estimate only.
2. `POST /bookings` sends the listing id and dates. The server validates the dates (`src/services/pricing.js`): check-in not in the past, at least one night, at most 30 nights, at most 365 days ahead.
3. The server checks for overlapping bookings, computes subtotal, GST (18 percent) and total in paise, creates a Razorpay order for that amount and saves a `PENDING` booking holding the order id.
4. The browser opens Razorpay Checkout with the order. Card, UPI and bank details go to Razorpay only.
5. After payment, the browser sends Razorpay's response to `POST /bookings/:id/verify`. The server recomputes the HMAC signature with the secret key, against the order id stored on the booking, and marks the booking `PAID`.
6. Razorpay also calls `POST /webhook/razorpay`. The server verifies the webhook signature and marks the booking `CONFIRMED`, so a booking is confirmed even if the guest closed the browser after paying.
7. The receipt lives at `/bookings/:id` and is visible to the guest and the host only.

## Authentication and accounts

- **Local accounts** use passport-local-mongoose (PBKDF2 hashing). Passwords need at least 8 characters with a letter and a number. After repeated failures an account is locked for 15 minutes, and sign-in routes are rate limited.
- **Google and GitHub** sign-in create an account on first use. An OAuth login is linked to an existing local account only when the provider says the email address is verified, which prevents account takeover through unverified emails.
- **Sessions** last seven days after the last visit. Passport regenerates the session on sign-in.
- **CSRF**: each session holds a random token. Forms send it as `_csrf`; JavaScript sends it as the `X-CSRF-Token` header from a `<meta>` tag. Templates create the token only when a form is rendered, so anonymous browsing never creates a session.
- **Password reset** emails a link containing a random token valid for one hour. The same message is shown whether or not the email exists.
- **Account deletion** removes the user, their listings (with photos and reviews), their reviews and their saved stays. Completed bookings are kept for accounting. Deletion is refused while the user is hosting upcoming stays.

## Caching

The production database is far from the web server (see [OPERATIONS.md](OPERATIONS.md#performance-and-region)), so each database round trip costs about 230 ms. The app therefore avoids round trips wherever it safely can.

| What                     | Where                         | Lifetime                          | Invalidation                                   |
| ------------------------ | ----------------------------- | --------------------------------- | ---------------------------------------------- |
| Sessions                 | `CachedSessionStore` (memory) | 6 hours in memory, 7 days in MongoDB | Writes go to both; MongoDB is the source of truth |
| Signed-in user           | `src/utils/userCache.js`      | 60 seconds                        | Mongoose hooks on every user save, update or delete |
| Home page statistics, destinations, featured stay | `TtlCache` in listings controller | 5 minutes | Cleared when listings or reviews change |
| Static assets            | Browser                       | 1 year (immutable)                | URL contains a content hash (`?v=`)            |

The listing page loads the listing, host, reviews, review authors and similar stays in a single aggregation query (`loadListingPage` in `src/controllers/listings.js`).

## Front end

- **Templates**: EJS with ejs-mate layouts. Every page uses `views/layouts/boilerplate.ejs`. Partials live in `views/includes/`. Partials must read their data as plain variables with `typeof` checks, because ejs-mate replaces the usual `locals` object.
- **Styles**: `public/css/app.css` on top of Bootstrap 5.3's CSS (grid and utilities). Bootstrap's JavaScript is not used.
- **Scripts**: `public/js/app.js` (menus, cookie consent, theme, wishlist, share, destinations gallery, forms), `theme.js` (applies the theme before first paint), `map.js` (Leaflet), `booking.js` (checkout). No inline scripts are allowed by the Content Security Policy.
- **Icons**: one SVG sprite, `public/images/icons.svg`, used through `helpers.icon("name")`.
- See [DESIGN.md](DESIGN.md) for colours, typography, the logo and how to regenerate assets.

## Design decisions

- **Server rendering without a build step.** Easy to deploy, fast first paint, nothing to compile, and fewer dependencies that can age badly.
- **Express 5** because it handles errors thrown in async route handlers, which removes a whole class of crashes.
- **Optional integrations.** The app starts with only MongoDB, which keeps local development, CI and demos simple.
- **Self-hosted vendor files, fonts and icons.** Fewer third-party requests, a stricter security policy and no outages caused by external CDNs.
- **Joi validation with unknown fields stripped.** Users can never set fields such as `owner` or `reviews` through a form.
- **Tests never read `.env`** and generate credentials at runtime, so tests cannot touch real accounts and no credential-like strings are committed.

## Known limitations

- **Single instance.** The session cache, user cache, statistics cache and rate limiters live in memory. Running two or more instances would need a shared store such as Redis.
- **Free hosting.** Render's free plan sleeps after 15 minutes without traffic; the keep-alive workflow works around this.
- **Region distance.** The web server and the database run in different regions, adding about 230 ms per database round trip.
- **Refunds and cancellations** are arranged between guest and host; there is no automated refund flow.
- **One photo per listing.**
- **Email** requires an SMTP provider; without one, password reset links are only logged in development.
