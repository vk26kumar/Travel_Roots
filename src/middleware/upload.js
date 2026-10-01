"use strict";

const multer = require("multer");
const ExpressError = require("../utils/ExpressError");

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

const parser = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE, files: 1, fields: 30, fieldSize: 10 * 1024 },
  fileFilter(req, file, callback) {
    if (!ALLOWED_TYPES.has(file.mimetype)) {
      return callback(new ExpressError(400, "Please upload a JPG, PNG or WebP image."));
    }
    return callback(null, true);
  },
}).single("listing[image]");

/**
 * Parses multipart bodies before CSRF verification runs, so the token in the
 * multipart form can be checked. Files are held in memory (max 5 MB) and only
 * uploaded to Cloudinary after authentication, CSRF and validation succeed.
 */
function parseMultipart(req, res, next) {
  if (!req.is("multipart/form-data")) return next();

  return parser(req, res, (error) => {
    if (!error) return next();
    if (error instanceof multer.MulterError) {
      const message =
        error.code === "LIMIT_FILE_SIZE"
          ? "Images must be 5 MB or smaller."
          : "The uploaded form could not be processed.";
      return next(new ExpressError(400, message));
    }
    return next(error);
  });
}

module.exports = { parseMultipart };
