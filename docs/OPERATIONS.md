# Operations

How Travel Roots is run in production, how to deploy and check it, and what to do when something goes wrong. No secrets are stored in this file; they live in the Render dashboard and in your local `.env`.

## Contents

- [Where everything lives](#where-everything-lives)
- [Environments](#environments)
- [Deploying](#deploying)
- [Checking the live site](#checking-the-live-site)
- [Performance and region](#performance-and-region)
- [Database tasks](#database-tasks)
- [Third-party settings](#third-party-settings)
- [Secrets and rotation](#secrets-and-rotation)
- [Troubleshooting](#troubleshooting)

---

## Where everything lives

| Piece                | Where                                                                                     |
| -------------------- | ----------------------------------------------------------------------------------------- |
| Source code          | GitHub, `vk26kumar/Travel_Roots`, branch `main`                                           |
| Web server           | Render, web service `travel-roots`, https://travel-roots.onrender.com (free plan)          |
| Database             | MongoDB Atlas, cluster `cluster0.uz2zv.mongodb.net`, free M0 tier on AWS Mumbai (`ap-south-1`). Data is in the database named `test`, the default because the connection string names no database |
| Photos               | Cloudinary, cloud `dy0zygs9b`, folder `Travel_Roots_DATA`                                  |
| Payments             | Razorpay dashboard; webhook to `https://travel-roots.onrender.com/webhook/razorpay`       |
| Sign-in providers    | Google Cloud Console OAuth client and a GitHub OAuth app, both calling back to `/auth/google/callback` and `/auth/github/callback` |
| Geocoding            | Geoapify API key (`MAP_API_KEY`)                                                          |
| Container images     | GitHub Container Registry, `ghcr.io/vk26kumar/travel-roots`                               |
| Automation           | GitHub Actions: `ci.yml`, `codeql.yml`, `deploy.yml`, `keepalive.yml` in `.github/workflows` |
| Security scanning    | GitHub CodeQL (Security tab) and GitGuardian, which watches pushed commits for secrets     |

## Environments

| Environment | How to start it          | Database                                   | Notes                                                    |
| ----------- | ------------------------ | ------------------------------------------ | -------------------------------------------------------- |
| Production  | Render runs `npm start`  | Atlas (Mumbai)                             | `NODE_ENV=production`; variables set in the Render dashboard |
| Demo        | `npm run demo:watch`     | Private local MongoDB in `.data/demo-db`   | Safe for trying changes; restarts on server code changes  |
| Development | `npm run dev`            | Whatever `ATLASDB_URL` in `.env` points to | Careful: the local `.env` points at the production database |
| Tests       | `npm test`               | In-memory MongoDB                          | Never reads `.env`                                        |

The demo signs in as `travelroots_host` with the `SEED_PASSWORD` from `.env`. Delete `.data/` or run `npm run demo -- --fresh` to start from scratch.

## Deploying

Render's **Auto-Deploy** is on: every push to `main` is built and released within a few minutes.

1. Make the change locally and check it with `npm run demo:watch`.
2. Run `npm run lint`, `npm run format:check` and `npm test`.
3. Commit and push to `main`.
4. Render builds (`npm ci --omit=dev`) and starts (`npm start`) the new version.
5. Confirm the release: `https://travel-roots.onrender.com/healthz` shows the new `commit`.

The GitHub `deploy.yml` workflow also publishes a container image after CI passes. It only triggers Render when the `RENDER_DEPLOY_HOOK_URL` repository secret exists. Do not add that secret while Auto-Deploy is on, or every push deploys twice. To release only builds that pass CI instead, turn Auto-Deploy off in Render and add the secret.

If a deploy fails, open the service in Render, then **Events**, then the failed deploy, and read the build log.

## Checking the live site

| URL        | Shows                                                                                 |
| ---------- | ------------------------------------------------------------------------------------- |
| `/healthz` | `version` from `package.json`, the deployed git `commit` and process `uptime` in seconds |
| `/readyz`  | Whether the database answers, and `dbLatencyMs`, the measured database round trip     |

A small `uptime` means the service restarted recently (a deploy, or waking from sleep).

## Performance and region

In October 2026 `dbLatencyMs` on the live site was about 233 ms: the Render service runs in a different region from the Mumbai database. Each database round trip costs that much, so the code keeps round trips to a minimum (see [ARCHITECTURE.md](ARCHITECTURE.md#caching)).

To remove the delay completely, run the web server near the database:

1. In Render, create a new Web Service from the same repository in the **Singapore** region (the closest to Mumbai), with the same build and start commands and environment variables.
2. Check that `/readyz` on the new service reports roughly 30 to 60 ms.
3. Delete the old service and, if the name is free, rename the new one to `travel-roots`. If the address changes, update `APP_URL`, both OAuth callback URLs, the Razorpay webhook URL and the URLs in `keepalive.yml` and `deploy.yml`.

Render's free plan also sleeps after 15 minutes without traffic. `keepalive.yml` requests `/healthz` every 10 minutes to prevent that; GitHub may delay scheduled runs, and it disables them after 60 days without repository activity.

## Database tasks

All commands read `ATLASDB_URL` from `.env`, which points at production. Back up first when in doubt (Atlas, then Database, then the cluster's backup or export options; or `mongodump`).

- **Migrate 1.x data**: `npm run migrate`. Safe to repeat. It was run on production on 2 October 2026.
- **Seed sample listings**: `npm run seed`. Refused in production unless `--force` is given. `-- --reset` deletes all listings, reviews and bookings first.
- **Payment test listing**: the listing "Test listing: payment check" (id `696163f41c19052c1f9c8c4b`, Rs 1 per night) exists to test real payments cheaply. It uses `public/images/test-listing.webp` and holds the test bookings made while building the payment flow. Keep it or delete it from the host's profile.

## Third-party settings

- **Razorpay webhook**: events `payment.captured`, `order.paid` and `payment.failed`; the signing secret must match `RAZORPAY_WEBHOOK_SECRET`.
- **Google OAuth**: authorised redirect URI `https://travel-roots.onrender.com/auth/google/callback`.
- **GitHub OAuth app**: callback URL `https://travel-roots.onrender.com/auth/github/callback`; the app requests the `user:email` scope.
- **Cloudinary**: uploads are stored as WebP in `Travel_Roots_DATA`; replaced or deleted listing photos are removed automatically.
- **Email**: set `SMTP_*` and `MAIL_FROM` to enable password reset emails. Without SMTP the forgot-password page tells users to contact support.

## Secrets and rotation

- Secrets live in the Render dashboard (production) and the git-ignored `.env` (local). `.env.example` lists every variable without values.
- **`SECRET`** signs session cookies and encrypts sessions in MongoDB. Changing it signs everyone out once, which is harmless.
- **API keys** (Razorpay, Cloudinary, OAuth, Geoapify) can be rotated in their dashboards and then updated in Render. Render restarts the service on save.
- Never commit secrets, including test passwords. GitGuardian flags anything that looks like a credential; tests generate theirs at runtime in `tests/fixtures.js`.

## Troubleshooting

| Symptom                                                        | Cause and fix                                                                                     |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `querySrv ECONNREFUSED _mongodb._tcp...` when running scripts locally | The computer's DNS refuses SRV lookups (seen with DNS set to `127.0.0.1`). Add `DNS_SERVERS=1.1.1.1,8.8.8.8` to `.env`. |
| Live site shows old pages after a push                          | Render did not deploy. Check Render Events for a failed or missing deploy; use Manual Deploy if needed. Compare `/healthz` `commit` with the latest commit. |
| First visit takes up to a minute                                | The free instance was asleep. Check that `keepalive.yml` runs in GitHub Actions.                  |
| Every page is slow, `dbLatencyMs` is high                       | Server and database in different regions. See [Performance and region](#performance-and-region). |
| Visitors are signed out after a deploy                          | Expected only if `SECRET` changed. Sessions otherwise survive restarts.                           |
| Payment succeeded but the booking shows "Awaiting payment"      | The browser closed before verification. The Razorpay webhook confirms it; check the webhook URL and secret in Razorpay. |
| Image uploads fail                                              | Check the `CLOUD_*` variables. The listing form shows a notice when uploads are not configured.   |
| Google or GitHub sign-in fails with a redirect error            | The callback URL in the provider does not match the site address.                                 |
| CodeQL alerts appear                                            | Open the Security tab, read the alert, fix the code; alerts close automatically on the next scan. |
