"use strict";

/**
 * Regenerates the self-hosted images in public/images:
 *
 *   hero-*.webp            home page hero (Unsplash photo, three widths)
 *   auth-*.webp            sign-in page image (Unsplash photo, two widths)
 *   favicon-32.png, apple-touch-icon.png, icon-192.png, icon-512.png
 *                          tab and app icons rendered from logo.svg
 *   test-listing.webp      image for the Rs 1 payment test listing,
 *                          rendered from scripts/assets/test-listing.svg
 *
 * sharp is not a project dependency, so install it in a scratch folder and
 * pass that folder's node_modules path:
 *
 *   mkdir image-tools && cd image-tools && npm init -y && npm install sharp
 *   node scripts/assets/build-images.js ../image-tools/node_modules
 *
 * logo.svg is the source of truth for the brand mark. After editing it, copy
 * it over favicon.svg and run this script to refresh the PNG icons.
 */

const fs = require("fs");
const path = require("path");

const modules = process.argv[2];
if (!modules) {
  console.error("Usage: node scripts/assets/build-images.js <path-to-node_modules>");
  process.exit(1);
}

const sharp = require(path.resolve(modules, "sharp"));
const IMAGES = path.join(__dirname, "..", "..", "public", "images");

// Unsplash photo ids, used under the Unsplash License.
const PHOTOS = [
  { id: "1476514525535-07fb3b4ae5f1", name: "hero", widths: [640, 960, 1280], aspect: 5 / 4 },
  { id: "1522708323590-d24dbb6b0267", name: "auth", widths: [640, 960], aspect: 4 / 5 },
];

const ICONS = [
  ["favicon-32.png", 32],
  ["apple-touch-icon.png", 180],
  ["icon-192.png", 192],
  ["icon-512.png", 512],
];

async function main() {
  for (const photo of PHOTOS) {
    const response = await fetch(
      `https://images.unsplash.com/photo-${photo.id}?w=2400&q=90&fm=jpg`,
    );
    const source = Buffer.from(await response.arrayBuffer());
    for (const width of photo.widths) {
      const file = path.join(IMAGES, `${photo.name}-${width}.webp`);
      await sharp(source)
        .resize(width, Math.round(width / photo.aspect), { fit: "cover", position: "attention" })
        .webp({ quality: 68, effort: 6 })
        .toFile(file);
      console.log("Wrote", path.basename(file));
    }
  }

  const logo = fs.readFileSync(path.join(IMAGES, "logo.svg"));
  for (const [name, size] of ICONS) {
    await sharp(logo, { density: 1200 })
      .resize(size, size)
      .png({ compressionLevel: 9, palette: true })
      .toFile(path.join(IMAGES, name));
    console.log("Wrote", name);
  }

  await sharp(path.join(__dirname, "test-listing.svg"), { density: 144 })
    .resize(1600, 1200)
    .webp({ quality: 80 })
    .toFile(path.join(IMAGES, "test-listing.webp"));
  console.log("Wrote test-listing.webp");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
