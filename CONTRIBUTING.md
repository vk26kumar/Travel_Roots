# Contributing to Travel Roots

Thank you for taking the time to contribute.

## Development workflow

1. Fork the repository and create a branch from `main`, for example `feature/booking-calendar` or `fix/review-validation`.
2. Install dependencies with `npm install` and copy `.env.example` to `.env`.
3. Make your change, and add or update tests where it makes sense.
4. Run the checks locally:

   ```bash
   npm run lint
   npm run format:check
   npm test
   ```

5. Open a pull request against `main` that explains what changed and why. CI must pass before a pull request can be merged.

## Code style

- JavaScript is formatted with Prettier and linted with ESLint. Run `npm run format` before committing.
- Server code uses CommonJS modules and `"use strict"`.
- Keep controllers small. Put business rules in `src/services` and validation in `src/validation`.
- Never trust input from the browser. Validate it with Joi and recompute anything security- or money-related on the server.
- Browser scripts live in `public/js` and are loaded as files. Inline scripts are blocked by the Content Security Policy.
- Templates must escape user content with `<%= %>`. Use `<%- %>` only for trusted includes.
- Do not use emoji in code, templates, commit messages or documentation.

## Commit messages

Write commit messages in the imperative mood with a short summary line, for example:

```
Add availability check to booking creation
```

Use the body to explain the reasoning when it is not obvious from the change.

## Reporting bugs and requesting features

Open an issue with clear steps to reproduce, the expected behaviour and the actual behaviour. For security issues, follow [SECURITY.md](SECURITY.md) instead.
