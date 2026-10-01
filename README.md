# Travel Roots

Travel Roots is a full-stack stay booking platform. Hosts list homes, cabins, villas and farm stays; guests discover them, save favourites, leave reviews and book with secure online payments through Razorpay.

[![CI](https://github.com/vk26kumar/Travel_Roots/actions/workflows/ci.yml/badge.svg)](https://github.com/vk26kumar/Travel_Roots/actions/workflows/ci.yml)
[![CodeQL](https://github.com/vk26kumar/Travel_Roots/actions/workflows/codeql.yml/badge.svg)](https://github.com/vk26kumar/Travel_Roots/actions/workflows/codeql.yml)

Live site: https://travel-roots.onrender.com

---

## Contents

- [Features](#features)
- [Tech stack](#tech-stack)
- [Architecture](#architecture)
- [Project structure](#project-structure)
- [Getting started](#getting-started)
- [Configuration](#configuration)
- [Available scripts](#available-scripts)
- [Testing](#testing)
- [CI/CD pipeline](#cicd-pipeline)
- [Deployment](#deployment)
- [Performance](#performance)
- [Security](#security)
- [Privacy and cookies](#privacy-and-cookies)
- [Upgrading from 1.x](#upgrading-from-1x)
- [Contributing](#contributing)
- [License](#license)

---

## Features

### Guests

- Browse stays with server-side search (city, country or title), category filters, sorting and pagination.
- Listing pages with photo, host details, interactive map, rating summary and similar stays.
- Wishlist: save and remove stays with one click and view them in the profile.
- Booking flow with date validation, availability checks, GST breakdown and Razorpay Checkout.
- Printable receipts for every booking.
- One review per guest per stay, with an automatically maintained average rating.

### Hosts

- Create, edit and delete listings with image upload (JPG, PNG or WebP up to 5 MB, stored on Cloudinary).
- Automatic geocoding of the listing location (Geoapify).
- Reservations dashboard showing guests, dates, payouts and payment status.
- Listings with upcoming confirmed stays are protected from accidental deletion.

### Accounts and profile

- Sign up with username and password, or sign in with Google or GitHub.
- Profile page with avatar, bio, location, statistics and tabs for trips, saved stays, listings, reservations and reviews.
- Account settings: edit profile details, change or set a password, review connected accounts, manage cookie preferences and permanently delete the account.
- Password reset by email with single-use, one-hour tokens.

### Interface

- Responsive design built on Bootstrap 5.3 with a custom design system.
- Light and dark themes that follow the operating system and can be toggled.
- Accessible markup: skip link, labelled controls, focus styles, ARIA attributes and reduced-motion support.
- Cookie consent banner and a preferences centre.

---

## Tech stack

| Layer          | Technology                                                                  |
| -------------- | --------------------------------------------------------------------------- |
| Runtime        | Node.js 22 or later                                                         |
| Web framework  | Express 5                                                                   |
| Views          | EJS with ejs-mate layouts, Bootstrap 5.3 CSS, Leaflet, Lucide icon sprite, Fraunces and Inter (self-hosted) |
| Database       | MongoDB with Mongoose 8                                                     |
| Authentication | Passport (local, Google OAuth 2.0, GitHub OAuth), passport-local-mongoose   |
| Sessions       | express-session with connect-mongo                                          |
| Payments       | Razorpay Orders, Checkout and webhooks                                      |
| Media          | Cloudinary (uploads via Multer memory storage)                              |
| Maps           | Geoapify geocoding, OpenStreetMap tiles                                     |
| Email          | Nodemailer (any SMTP provider)                                              |
| Security       | Helmet, express-rate-limit, Joi validation, custom CSRF protection          |
| Tooling        | ESLint, Prettier, Node.js test runner, Supertest, mongodb-memory-server     |
| Delivery       | GitHub Actions, Docker, GitHub Container Registry, Render                   |

---

## Architecture

```
Browser
   |
   v
Express app (src/app.js)
   |-- Security headers (Helmet, strict CSP), compression, access logs
   |-- Health probes (/healthz, /readyz) and Razorpay webhook (raw body)
   |-- Rate limiting, body parsing, sessions, Passport
   |-- Multipart parsing, method override, input sanitising, CSRF verification
   |-- Routes -> validation (Joi) -> controllers -> models (Mongoose)
   |                                     |
   |                                     +-- services: payments, images, geocoding, email, pricing
   +-- 404 and error handler (HTML or JSON)
```

Key design decisions:

- **Server-side pricing.** The browser never decides how much to charge. The server validates dates, checks availability, computes the subtotal and GST in paise, creates the Razorpay order and stores a pending booking. Payment signatures are verified against the stored order before a booking is marked as paid, and webhooks confirm captured payments.
- **Uploads after validation.** Images are held in memory, and uploaded to Cloudinary only after authentication, CSRF verification and validation succeed.
- **Optional integrations.** Google, GitHub, Razorpay, Cloudinary, Geoapify and SMTP are each enabled automatically when their credentials are present. The application runs locally and in CI without any of them.
- **Testable composition.** `src/app.js` builds the application without opening a port; `server.js` connects to MongoDB, starts the HTTP server and handles graceful shutdown.

---

## Project structure

```
.
|-- server.js                 Process entry point (database, HTTP server, graceful shutdown)
|-- app.js                    Compatibility entry point that loads server.js
|-- src/
|   |-- app.js                Express application factory
|   |-- config/               Environment configuration, Helmet policy, Passport strategies
|   |-- controllers/          Request handlers (listings, reviews, bookings, auth, profile, pages)
|   |-- middleware/           Auth guards, CSRF, validation, uploads, sanitising, flash, errors
|   |-- models/               Mongoose models (User, Listing, Review, Booking)
|   |-- routes/               Route definitions
|   |-- services/             Payments, pricing, image storage, geocoding, email
|   |-- utils/                Logger, constants, helpers, ExpressError
|   `-- validation/           Joi schemas
|-- views/                    EJS templates (layouts, includes, pages)
|-- public/                   Static assets (CSS, JavaScript, images)
|-- scripts/                  Database seed and migration scripts
|-- tests/                    Unit and integration tests
|-- .github/                  CI, CodeQL, deployment and Dependabot configuration
|-- Dockerfile                Production container image
|-- docker-compose.yml        Local application and MongoDB stack
`-- render.yaml               Render Blueprint
```

---

## Getting started

### Prerequisites

- Node.js 22.12 or later (see `.nvmrc`)
- MongoDB 7 running locally, a MongoDB Atlas cluster, or Docker

### Local setup

```bash
git clone https://github.com/vk26kumar/Travel_Roots.git
cd Travel_Roots
npm install
cp .env.example .env        # then edit the values you need
npm run seed                # optional: sample listings and a demo host account
npm run dev                 # http://localhost:8080
```

To try the application without any database setup, run `npm run demo`. It starts a temporary in-memory MongoDB with the sample listings and prints the demo host's sign-in details; the data is discarded when the process stops.

Only `ATLASDB_URL` and `SECRET` are needed to start. Each optional integration switches on when its variables are filled in.

### Run with Docker

```bash
docker compose up --build
```

This starts the application on http://localhost:8080 together with a MongoDB container. Values in `.env`, if present, are passed to the application.

---

## Configuration

All configuration is read from environment variables in `src/config/index.js`. A `.env` file is loaded automatically in development only.

| Variable                                                    | Required          | Description                                                               |
| ----------------------------------------------------------- | ----------------- | ------------------------------------------------------------------------- |
| `NODE_ENV`                                                  | Yes in production | `development`, `test` or `production`                                     |
| `PORT`                                                      | No                | HTTP port, defaults to `8080`                                             |
| `APP_URL`                                                   | Yes in production | Public base URL used in emails and default OAuth callbacks                |
| `ATLASDB_URL`                                               | Yes in production | MongoDB connection string (`MONGODB_URI` is also accepted)                |
| `SECRET`                                                    | Yes in production | Session signing and session store encryption secret (32+ characters)      |
| `TRUST_PROXY`                                               | No                | Number of trusted reverse proxies, defaults to `1` in production          |
| `CLOUD_NAME`, `CLOUD_API_KEY`, `CLOUD_API_SECRET`           | For uploads       | Cloudinary credentials                                                    |
| `CLOUD_FOLDER`                                              | No                | Cloudinary folder, defaults to `Travel_Roots_DATA`                        |
| `MAP_API_KEY`                                               | No                | Geoapify key for geocoding listing locations                              |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`                  | For Google login  | Google OAuth credentials                                                  |
| `GOOGLE_CALLBACK_URL`                                       | No                | Defaults to `APP_URL/auth/google/callback`                                |
| `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`                  | For GitHub login  | GitHub OAuth credentials                                                  |
| `GITHUB_CALLBACK_URL`                                       | No                | Defaults to `APP_URL/auth/github/callback`                                |
| `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`                    | For payments      | Razorpay API keys                                                         |
| `RAZORPAY_WEBHOOK_SECRET`                                   | For payments      | Secret configured on the Razorpay webhook                                 |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`          | For email         | SMTP server used for password reset emails                                |
| `MAIL_FROM`                                                 | No                | Sender address for outgoing email                                         |
| `SUPPORT_EMAIL`                                             | No                | Contact address shown in the footer, receipts and legal pages             |
| `LOG_LEVEL`                                                 | No                | `debug`, `info`, `warn`, `error` or `silent`                              |

Configure the Razorpay webhook to send `payment.captured`, `order.paid` and `payment.failed` events to:

```
https://<your-domain>/webhook/razorpay
```

---

## Available scripts

| Command                 | Description                                                   |
| ----------------------- | ------------------------------------------------------------- |
| `npm start`             | Start the server                                              |
| `npm run dev`           | Start the server and restart on file changes                  |
| `npm run demo`          | Run locally on a temporary in-memory database with sample listings (no MongoDB needed) |
| `npm test`              | Run unit and integration tests                                |
| `npm run test:coverage` | Run tests with a coverage report                              |
| `npm run lint`          | Lint with ESLint                                              |
| `npm run format`        | Format with Prettier                                          |
| `npm run format:check`  | Verify formatting                                             |
| `npm run seed`          | Insert sample listings owned by a demo host (`-- --reset` clears all listings, reviews and bookings first) |
| `npm run migrate`       | Migrate data created by version 1.x to the 2.0 schema         |
| `npm run audit:prod`    | Fail on high or critical vulnerabilities in production dependencies |

---

## Testing

The suite uses the built-in Node.js test runner with Supertest. Integration tests run against an in-memory MongoDB instance (`mongodb-memory-server`), or against the server given in `MONGODB_URI_TEST`, which CI uses.

```bash
npm test
```

Coverage includes:

- Pricing, date validation and GST arithmetic
- Security headers, CSRF enforcement, input sanitising and safe redirects
- Sign up, sign in, sign out, password change, password reset and account deletion
- Listing creation with uploads, ownership checks, search and filters
- Reviews and rating summaries, wishlist
- Server-side booking amounts, overlap protection, payment signature verification, receipt access control and webhooks

Tests never read `.env`, so they cannot reach real payment, OAuth or storage accounts. Test passwords and signing secrets are generated at runtime by `tests/fixtures.js`, so no credential-like values are committed.

---

## CI/CD pipeline

| Workflow     | Trigger                          | What it does                                                                                       |
| ------------ | -------------------------------- | -------------------------------------------------------------------------------------------------- |
| `keepalive.yml` | Every 10 minutes             | Requests `/healthz` so the Render free instance does not go to sleep                            |
| `ci.yml`     | Push and pull request to `main`  | Lint and format check, tests on Node 22 and 24 with MongoDB, production dependency audit, Docker build and container smoke test |
| `codeql.yml` | Push, pull request and weekly    | GitHub CodeQL security analysis                                                                    |
| `deploy.yml` | After CI succeeds on `main`      | Publishes the image to GitHub Container Registry, triggers the Render deploy hook and waits for `/healthz` |
| Dependabot   | Monthly                          | One grouped pull request per ecosystem for minor and patch updates; major versions are skipped     |

To enable continuous deployment:

1. In Render, open the service settings, copy the **Deploy Hook** URL and set **Auto-Deploy** to off so only builds that pass CI are released.
2. In GitHub, add the URL as the repository secret `RENDER_DEPLOY_HOOK_URL`.
3. Optionally create a `production` environment in GitHub to require approval before each deployment.

---

## Deployment

### Render

The service can be created from `render.yaml` (Blueprint) or configured manually:

- Build command: `npm ci --omit=dev`
- Start command: `npm start`
- Health check path: `/healthz`
- Environment variables: see [Configuration](#configuration)

Existing services that start with `node app.js` continue to work, because `app.js` loads `server.js`.

### Container

```bash
docker build -t travel-roots .
docker run -p 8080:8080 --env-file .env -e NODE_ENV=production travel-roots
```

The image runs as a non-root user and includes a health check. Images built by the deploy workflow are published as `ghcr.io/vk26kumar/travel-roots`.

### Health probes

- `GET /healthz` returns `200` while the process is running (liveness).
- `GET /readyz` returns `200` when the database is connected and `503` otherwise (readiness).

---

## Performance

The home page downloads about 0.6 MB on a first visit, down from roughly 5 MB in version 2.0.0, and repeat visits are served almost entirely from the browser cache.

- **Images.** Listing photos are requested from Cloudinary and Unsplash as resized, cropped WebP files with a responsive `srcset`, so a card image is about 30 KB instead of 300 KB. Uploads are stored on Cloudinary as WebP. The hero and sign-in images are self-hosted WebP files in several sizes; only the first image on a page loads eagerly, the rest lazily.
- **Icons and fonts.** A single SVG sprite (about 5 KB compressed) replaces the Font Awesome icon fonts (about 300 KB). The Fraunces and Inter variable fonts are self-hosted, subset to Latin and preloaded, removing the Google Fonts round trips.
- **JavaScript.** Bootstrap's JavaScript bundle is replaced by about 3 KB of plain JavaScript, and all scripts load with `defer`.
- **Caching.** Every static URL carries a content hash (`?v=`), so assets are served with a one-year immutable cache header and still refresh instantly after a deploy.
- **Server.** The listing page runs its database queries in parallel, and the home page statistics are cached in memory for five minutes and cleared when listings or reviews change. Responses are compressed.
- **Cold starts.** Render's free plan stops idle services, which makes the next visit slow. The `keepalive.yml` workflow requests `/healthz` every ten minutes; remove it on a paid plan. For the lowest latency, run the Render service and the MongoDB Atlas cluster in the same region.

---

## Security

- **Content Security Policy** without inline scripts. All first-party JavaScript is served from files, and vendor libraries, fonts and icons are self-hosted.
- **CSRF protection** with per-session synchroniser tokens on every state-changing request, including uploads and JSON calls.
- **Sessions** stored in MongoDB, encrypted at rest, with `HttpOnly`, `SameSite=Lax` and `Secure` (in production) cookies, a seven-day rolling lifetime and regeneration on sign-in.
- **Authentication hardening**: salted PBKDF2 password hashes, a password policy, generic error messages, progressive delays and temporary lockout after repeated failures, rate limiting on authentication routes, and verified-email-only linking of OAuth accounts.
- **Input handling**: Joi validation with unknown fields stripped (preventing mass assignment), removal of MongoDB operator keys, escaped search patterns, ObjectId validation and strict query parsing.
- **Payments**: amounts computed on the server, constant-time HMAC verification of checkout and webhook signatures, idempotent confirmation and unique order and payment identifiers.
- **Uploads**: type and size limits, memory storage and upload only after validation.
- **Operations**: no stack traces or internal messages shown to users, structured logs, graceful shutdown and fail-fast configuration checks in production.

See [SECURITY.md](SECURITY.md) to report a vulnerability.

---

## Privacy and cookies

Travel Roots sets only two first-party cookies, both strictly necessary:

| Cookie       | Purpose                                                  | Lifetime                    |
| ------------ | -------------------------------------------------------- | --------------------------- |
| `tr.sid`     | Session, sign-in state, CSRF token and one-time messages | 7 days after the last visit |
| `tr_consent` | Records the visitor's cookie choice                      | 180 days                    |

Theme and tax display preferences are stored in local storage only after the visitor consents, and are removed when consent is withdrawn. The site uses no advertising, tracking or analytics cookies. The full texts are served at `/privacy`, `/terms` and `/cookies`.

---

## Upgrading from 1.x

Version 2.0 changes the schema and some URLs. After deploying, run once against the production database:

```bash
npm run migrate
```

The migration renames the "Ionic Cities" category to "Iconic Cities", links reviews to their listings, converts booking dates stored as strings into dates and recalculates rating summaries. It is safe to run more than once.

URL changes:

- `/dashboard` redirects to `/profile`.
- `/bookings/:id/success` redirects to `/bookings/:id`.
- Signing out is now a `POST /logout` request.
- `/payment/create-order` and `/payment/verify` are replaced by `POST /bookings` and `POST /bookings/:id/verify`.

See [CHANGELOG.md](CHANGELOG.md) for the full list of changes.

---

## Contributing

Contributions are welcome. Please read [CONTRIBUTING.md](CONTRIBUTING.md) before opening a pull request.

---

## License

Released under the [ISC License](LICENSE). Copyright (c) Vishal Kumar.
