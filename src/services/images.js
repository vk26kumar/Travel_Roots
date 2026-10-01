"use strict";

const cloudinary = require("cloudinary").v2;
const config = require("../config");
const logger = require("../utils/logger");
const ExpressError = require("../utils/ExpressError");

if (config.features.uploads) {
  cloudinary.config({
    cloud_name: config.cloudinary.cloudName,
    api_key: config.cloudinary.apiKey,
    api_secret: config.cloudinary.apiSecret,
    secure: true,
  });
}

/**
 * Uploads an in-memory image buffer to Cloudinary.
 * Resolves to `{ url, filename }` in the shape stored on listings.
 */
function uploadImage(file) {
  if (!config.features.uploads) {
    return Promise.reject(
      new ExpressError(503, "Image uploads are not configured on this server yet."),
    );
  }

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: config.cloudinary.folder,
        resource_type: "image",
        allowed_formats: ["jpg", "jpeg", "png", "webp"],
        transformation: [{ width: 2000, height: 2000, crop: "limit" }],
      },
      (error, result) => {
        if (error) {
          logger.error("Cloudinary upload failed", error);
          return reject(
            new ExpressError(422, "The image could not be processed. Try another file."),
          );
        }
        return resolve({ url: result.secure_url, filename: result.public_id });
      },
    );
    stream.end(file.buffer);
  });
}

/** Deletes a previously uploaded image. Failures are logged, never thrown. */
async function deleteImage(filename) {
  if (!config.features.uploads || !filename || filename === "listingimage") return;
  try {
    await cloudinary.uploader.destroy(filename);
  } catch (error) {
    logger.warn("Cloudinary delete failed", { filename, error: error.message });
  }
}

module.exports = { uploadImage, deleteImage };
