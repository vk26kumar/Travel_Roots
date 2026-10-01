"use strict";

const mongoose = require("mongoose");
const ExpressError = require("../utils/ExpressError");

/**
 * Builds a middleware that validates `req.body` against a Joi schema.
 *
 * Unknown keys are stripped and the sanitised value replaces the body, which
 * prevents mass assignment of fields such as `owner` or `reviews`.
 *
 * @param {import("joi").Schema} schema
 * @param {{ onError?: (req, res, message) => void }} [options]
 *   `onError` lets HTML form routes flash the message and redirect instead of
 *   rendering a generic error page.
 */
function validateBody(schema, { onError } = {}) {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body || {}, {
      abortEarly: false,
      stripUnknown: true,
      convert: true,
    });

    if (error) {
      const message = [...new Set(error.details.map((detail) => detail.message.replace(/"/g, "")))]
        .slice(0, 3)
        .join(" ");
      if (onError) return onError(req, res, message);
      return next(new ExpressError(400, message));
    }

    req.body = value;
    return next();
  };
}

/** Rejects route parameters that are not valid ObjectIds with a 404. */
function validateObjectId(...params) {
  return (req, res, next) => {
    for (const param of params) {
      if (!mongoose.isValidObjectId(req.params[param]) || String(req.params[param]).length !== 24) {
        return next(new ExpressError(404, "The page you are looking for could not be found."));
      }
    }
    return next();
  };
}

/** Flashes a validation error and redirects back to a fixed path. */
function flashAndRedirect(path) {
  return (req, res, message) => {
    req.flash("error", message);
    const target = typeof path === "function" ? path(req) : path;
    return res.redirect(target);
  };
}

module.exports = { validateBody, validateObjectId, flashAndRedirect };
