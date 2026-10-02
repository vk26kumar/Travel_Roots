"use strict";

/**
 * Returns a copy of the request body without keys that could be interpreted as
 * MongoDB operators (`$gt`, `$where`), dotted paths or prototype properties.
 * Combined with Joi validation and Express 5's simple query parser this blocks
 * NoSQL injection. A new object is built rather than modifying the original,
 * so request-supplied keys are never written onto an existing object.
 */
const FORBIDDEN_KEY = /^\$|\.|^(?:__proto__|constructor|prototype)$/;
const MAX_DEPTH = 10;

function clean(value, depth = 0) {
  if (value === null || typeof value !== "object") return value;
  // Deeply nested input is never legitimate for these forms; drop it.
  if (depth > MAX_DEPTH) return undefined;
  if (Array.isArray(value)) return value.map((item) => clean(item, depth + 1));
  if (Buffer.isBuffer(value)) return value;

  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => !FORBIDDEN_KEY.test(key))
      .map(([key, item]) => [key, clean(item, depth + 1)]),
  );
}

function sanitizeRequest(req, res, next) {
  if (req.body && typeof req.body === "object" && !Buffer.isBuffer(req.body)) {
    req.body = clean(req.body);
  }
  next();
}

module.exports = sanitizeRequest;
module.exports.clean = clean;
