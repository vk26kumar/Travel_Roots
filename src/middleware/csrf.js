"use strict";

const crypto = require("crypto");
const ExpressError = require("../utils/ExpressError");
const { safeEqual } = require("../utils/helpers");

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

/**
 * Synchroniser-token CSRF protection backed by the server-side session.
 *
 * Templates call `csrfToken()` lazily, so a session (and its cookie) is only
 * created for visitors who are shown a form. Every state-changing request must
 * echo the token back in the `_csrf` body field or the `X-CSRF-Token` header.
 */
function csrfProtection(req, res, next) {
  res.locals.csrfToken = () => {
    if (!req.session.csrfToken) {
      req.session.csrfToken = crypto.randomBytes(32).toString("hex");
    }
    return req.session.csrfToken;
  };

  if (SAFE_METHODS.has(req.method)) return next();

  const expected = req.session && req.session.csrfToken;
  const provided = (req.body && req.body._csrf) || req.get("x-csrf-token");

  if (!expected || !safeEqual(String(provided || ""), expected)) {
    return next(
      new ExpressError(403, "Your session has expired or the form is invalid. Please try again."),
    );
  }

  if (req.body) delete req.body._csrf;
  return next();
}

module.exports = csrfProtection;
