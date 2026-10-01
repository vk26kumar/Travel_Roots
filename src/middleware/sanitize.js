"use strict";

/**
 * Removes keys that could be interpreted as MongoDB operators (`$gt`, `$where`)
 * or dotted paths from request bodies and route parameters. Combined with Joi
 * validation and Express 5's simple query parser this blocks NoSQL injection.
 */
const FORBIDDEN_KEY = /^\$|\./;
const PROTO_KEYS = new Set(["__proto__", "constructor", "prototype"]);

function clean(value, depth = 0) {
  if (depth > 10 || value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map((item) => clean(item, depth + 1));
  if (Buffer.isBuffer(value)) return value;

  for (const key of Object.keys(value)) {
    if (FORBIDDEN_KEY.test(key) || PROTO_KEYS.has(key)) {
      delete value[key];
    } else {
      value[key] = clean(value[key], depth + 1);
    }
  }
  return value;
}

function sanitizeRequest(req, res, next) {
  if (req.body && typeof req.body === "object") clean(req.body);
  if (req.params) clean(req.params);
  next();
}

module.exports = sanitizeRequest;
module.exports.clean = clean;
