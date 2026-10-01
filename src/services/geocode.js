"use strict";

const config = require("../config");
const logger = require("../utils/logger");

const DEFAULT_COORDINATES = Object.freeze({ lat: 28.6139, lon: 77.209 });

/**
 * Resolves a free-text location to coordinates using Geoapify.
 * Falls back to New Delhi when geocoding is disabled or the lookup fails, so a
 * third-party outage never blocks a host from publishing a listing.
 */
async function geocode(location, country) {
  if (!config.features.geocoding) return { ...DEFAULT_COORDINATES };

  const text = [location, country].filter(Boolean).join(", ");
  const url = new URL("https://api.geoapify.com/v1/geocode/search");
  url.searchParams.set("text", text);
  url.searchParams.set("limit", "1");
  url.searchParams.set("apiKey", config.geoapify.apiKey);

  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!response.ok) throw new Error(`Geoapify responded with ${response.status}`);
    const data = await response.json();
    const feature = data.features && data.features[0];
    if (feature) {
      const [lon, lat] = feature.geometry.coordinates;
      return { lat, lon };
    }
  } catch (error) {
    logger.warn("Geocoding failed, using default coordinates", { text, error: error.message });
  }
  return { ...DEFAULT_COORDINATES };
}

module.exports = { geocode, DEFAULT_COORDINATES };
