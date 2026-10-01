"use strict";

const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..", "..");

function listFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? listFiles(full) : [full];
  });
}

/**
 * A short hash of every public file and the dependency lockfile. Asset URLs
 * carry it as `?v=`, so browsers can cache them for a year and still pick up
 * changes immediately after a deploy.
 */
function computeAssetVersion() {
  const hash = crypto.createHash("sha1");
  const files = listFiles(path.join(ROOT, "public")).sort();
  const lockfile = path.join(ROOT, "package-lock.json");
  if (fs.existsSync(lockfile)) files.push(lockfile);
  for (const file of files) hash.update(file).update(fs.readFileSync(file));
  return hash.digest("hex").slice(0, 10);
}

const assetVersion = computeAssetVersion();

/** Appends the asset version to a local URL. */
function asset(url) {
  return `${url}${url.includes("?") ? "&" : "?"}v=${assetVersion}`;
}

module.exports = { assetVersion, asset };
