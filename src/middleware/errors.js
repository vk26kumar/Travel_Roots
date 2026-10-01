"use strict";

const mongoose = require("mongoose");
const ExpressError = require("../utils/ExpressError");
const logger = require("../utils/logger");
const { wantsJson } = require("./auth");

function notFound(req, res, next) {
  next(new ExpressError(404, "The page you are looking for could not be found."));
}

/** Maps library errors onto HTTP errors with user-safe messages. */
function normalise(err) {
  if (err instanceof ExpressError) return err;
  if (err instanceof mongoose.Error.CastError) {
    return new ExpressError(404, "The page you are looking for could not be found.");
  }
  if (err instanceof mongoose.Error.ValidationError) {
    const message = Object.values(err.errors)
      .map((detail) => detail.message)
      .join(" ");
    return new ExpressError(400, message);
  }
  if (err.type === "entity.too.large") {
    return new ExpressError(413, "The request is too large.");
  }
  if (err.type === "entity.parse.failed") {
    return new ExpressError(400, "The request body could not be parsed.");
  }
  const status = Number(err.status || err.statusCode) || 500;
  const wrapped = new ExpressError(status, status < 500 && err.expose ? err.message : "");
  wrapped.cause = err;
  return wrapped;
}

// Express identifies error handlers by their four-argument signature, so `next` must stay.
function errorHandler(err, req, res, next) {
  const error = normalise(err);
  const status = error.status;

  if (status >= 500) {
    logger.error("Unhandled error", {
      method: req.method,
      url: req.originalUrl,
      err: error.cause || err,
    });
  }

  const message =
    status >= 500 || !error.message
      ? "Something went wrong on our side. Please try again in a moment."
      : error.message;

  if (res.headersSent) return undefined;

  res.status(status);
  if (wantsJson(req)) return res.json({ success: false, message });

  const titles = {
    400: "Something is not quite right",
    401: "Please sign in",
    403: "Request blocked",
    404: "Page not found",
    413: "Upload too large",
    429: "Slow down a little",
  };

  return res.render("error", {
    title: titles[status] || "Unexpected error",
    status,
    heading: titles[status] || "Unexpected error",
    message,
  });
}

module.exports = { notFound, errorHandler };
