"use strict";

/**
 * An error carrying an HTTP status code. Messages on errors with a status
 * below 500 are considered safe to show to the user.
 */
class ExpressError extends Error {
  constructor(status, message) {
    super(message);
    this.name = "ExpressError";
    this.status = status;
    this.expose = status < 500;
  }
}

module.exports = ExpressError;
