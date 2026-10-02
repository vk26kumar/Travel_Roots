"use strict";

const mongoose = require("mongoose");

const LEGAL_LAST_UPDATED = "2 October 2026";

module.exports.privacy = (req, res) => {
  res.render("pages/privacy", {
    title: "Privacy Policy",
    description: "How Travel Roots collects, uses and protects your personal information.",
    lastUpdated: LEGAL_LAST_UPDATED,
  });
};

module.exports.terms = (req, res) => {
  res.render("pages/terms", {
    title: "Terms of Service",
    description: "The terms that apply when you use Travel Roots as a guest or a host.",
    lastUpdated: LEGAL_LAST_UPDATED,
  });
};

module.exports.cookies = (req, res) => {
  res.render("pages/cookies", {
    title: "Cookie Policy",
    description: "The cookies and similar technologies Travel Roots uses and how to control them.",
    lastUpdated: LEGAL_LAST_UPDATED,
  });
};

/** Liveness probe: the process is up and able to serve requests. */
module.exports.health = (req, res) => {
  res.set("Cache-Control", "no-store");
  res.json({ status: "ok", uptime: Math.round(process.uptime()) });
};

/**
 * Readiness probe: pings the database and reports the round trip in
 * milliseconds. A value well above 50 ms usually means the web server and the
 * database run in different regions.
 */
module.exports.ready = async (req, res) => {
  res.set("Cache-Control", "no-store");
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({ status: "unavailable" });
  }
  try {
    const started = process.hrtime.bigint();
    await mongoose.connection.db.admin().ping();
    const dbLatencyMs = Number((process.hrtime.bigint() - started) / 1000000n);
    return res.json({ status: "ready", dbLatencyMs });
  } catch {
    return res.status(503).json({ status: "unavailable" });
  }
};
