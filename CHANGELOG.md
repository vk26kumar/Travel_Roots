# Changelog

All notable changes to this project are documented in this file.

## [2.2.0] - 2026-10-02

### Added

- A new logo: a destination map pin with a globe, reached by a dotted journey route, used in the header, footer, receipts and as the browser tab icon, with PNG icons and a web app manifest.
- The "Where travellers are going" section is now an interactive gallery: panels widen on hover or focus and rotate automatically, with a swipeable carousel on phones. Motion is disabled when the visitor prefers reduced motion.
- Price-per-night filter on the browse page, combined with search, category and sorting.
- Share button on listing pages: the native share sheet on phones, copy link elsewhere.
- `/readyz` reports the database round-trip time (`dbLatencyMs`) to help diagnose slow responses.
- `DNS_SERVERS` setting for networks whose local DNS refuses the SRV lookups used by `mongodb+srv://` connection strings.
- `npm run demo:watch` restarts the local demo when server code changes and keeps demo data between restarts.

### Security

- Resolved all CodeQL findings: image host checks now compare exact hostnames instead of substrings, query inputs are explicitly reduced to strings before reaching MongoDB, the request sanitiser builds a fresh object instead of writing request-supplied keys, the payment webhook is rate limited, and the seed and demo scripts no longer print passwords.

### Performance

- Sessions are served from memory with write-through to MongoDB, and signed-in users are cached briefly with automatic invalidation, removing two database round trips from every signed-in request.
- Listing pages load in a single aggregation query instead of four sequential ones; booking and profile pages run independent queries in parallel.
- Hover prefetching through Speculation Rules in Chrome and Edge.

### Changed

- `/healthz` reports the running version and deployed commit. The deploy workflow records a production deployment only when a Render deploy hook is configured, and succeeds only once the new commit is live.

### Removed

- Dependabot version updates. Dependencies are reviewed manually.

## [2.1.0] - 2026-10-02

### Changed

- New visual design: an editorial look with Fraunces serif headlines, an earthy palette, hairline rules, a split hero with search, underlined category navigation, redesigned cards, listing pages, profile, checkout, receipts, sign-in pages and footer, in both light and dark themes.
- Home page weight reduced from roughly 5 MB to about 0.6 MB. Images are served as resized WebP files with responsive `srcset`; uploads are stored as WebP.
- Replaced Font Awesome with an SVG icon sprite, Google Fonts with self-hosted variable fonts and the Bootstrap JavaScript bundle with a few lines of plain JavaScript.
- Static assets are cached for a year using content-hashed URLs.
- The listing page runs its queries in parallel and caches home page statistics.
- The Docker image uses the Node.js 24 LTS release.
- Upgraded Joi to 18 and mongodb-memory-server to 11.

### Removed

- Unused dependencies: `ejs` (bundled by `ejs-mate`), `dotenv` (replaced by Node's built-in `process.loadEnvFile`) and `@fortawesome/fontawesome-free`.

### Fixed

- One seeded listing image was blocked by the Content Security Policy because it is served from `plus.unsplash.com`.

### Added

- `npm run demo` runs the application locally on a temporary in-memory database with sample data.
- A keep-alive workflow prevents slow first visits caused by the Render free plan going to sleep.

## [2.0.0] - 2026-10-02

A full revamp focused on security, reliability, user experience and production readiness.

### Security

- Added CSRF protection to every state-changing request, including uploads and JSON calls.
- Replaced the permissive Content Security Policy with a strict policy that forbids inline scripts; vendor libraries are now self-hosted.
- Booking amounts are now calculated on the server. Previously the browser chose the amount sent to the payment provider.
- Payment and webhook signatures are verified in constant time against the stored order.
- Fixed a cross-site scripting risk in the map popup, which rendered listing locations as HTML.
- Session cookies are now `Secure` in production, `SameSite=Lax`, created only when needed and given a rolling lifetime.
- Sign-out now requires a POST request.
- Added a password policy, generic sign-in errors, progressive delays and temporary lockout after repeated failures.
- OAuth accounts are linked to existing users only when the provider has verified the email address.
- Added input validation for every form, stripping of unknown fields and MongoDB operator keys, and escaping of search input.
- Image uploads are limited by type and size and sent to Cloudinary only after validation.
- Removed logging of OAuth profiles and password hashes, and the client-side exposure of the geocoding API key.
- Upgraded all dependencies; the production audit reports no known vulnerabilities.

### Fixed

- Google and GitHub sign-in created a new account on every login because the provider IDs were not stored.
- Edit and delete buttons for listings and reviews were shown to every visitor.
- Pages crashed when a listing, review or booking ID was invalid or no longer existed.
- The dashboard redirected signed-out users to a login page that did not exist.
- The listing success page and an unused route referenced missing data and views.
- Updating a listing's location did not update its map coordinates, and replaced images were never deleted.
- The seed script failed validation and deleted every listing in the database.

### Added

- Revamped interface: new navigation bar with account menu, hero search, category bar, sorting, pagination, redesigned listing cards and detail pages, and a multi-column footer.
- Light and dark themes.
- New profile page with statistics and tabs for trips, saved stays, listings, reservations and reviews.
- Account settings with profile editing, password change, connected accounts, cookie settings and account deletion.
- Wishlist.
- Password reset by email.
- Availability checks, GST breakdown, pending-payment holds and printable receipts for bookings.
- Host reservations view and protection against deleting listings with upcoming stays.
- Rating summaries with one review per guest per stay.
- Privacy Policy, Terms of Service and Cookie Policy pages, plus a cookie consent banner and preferences centre.
- Health and readiness probes, structured logging, graceful shutdown and configuration validation.
- Automated test suite, ESLint and Prettier.
- GitHub Actions workflows for CI, CodeQL and deployment, Dependabot, Dockerfile, Docker Compose and a Render Blueprint.
- Data migration script for 1.x databases.

### Changed

- Restructured the code base into `src/` with config, controllers, middleware, models, routes, services and validation layers.
- Upgraded to Express 5, Mongoose 8.24 and connect-mongo 6. Session store encryption keys are derived automatically when `SECRET` does not meet the store's complexity rules, and unreadable sessions now sign the visitor out instead of causing errors.
- Renamed the "Ionic Cities" category to "Iconic Cities".
- The profile moved from `/dashboard` to `/profile`, and receipts from `/bookings/:id/success` to `/bookings/:id`. The old URLs redirect.

## [1.0.0] - 2025

- Initial release with listings, reviews, local and OAuth authentication, Razorpay payments and maps.
