"use strict";

const config = require("../config");
const { assetVersion } = require("../utils/assets");
const helpers = require("../utils/helpers");
const { CATEGORIES } = require("../utils/constants");

const CONSENT_COOKIE = "tr_consent";

/** Reads the cookie-consent cookie written by the consent banner. */
function readConsent(req) {
  const raw = req.cookies && req.cookies[CONSENT_COOKIE];
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (parsed && parsed.v === 1) return { preferences: Boolean(parsed.preferences) };
  } catch {
    // A malformed cookie is treated as "no choice made yet".
  }
  return null;
}

/** Exposes view helpers and request-scoped values to every template. */
function viewLocals(req, res, next) {
  res.set("Speculation-Rules", '"/speculation-rules.json"');
  const flashSuccess = req.flash("success");
  const flashError = req.flash("error");

  Object.assign(res.locals, {
    currUser: req.user || null,
    currentPath: req.path,
    searchQuery: helpers.queryString(req.query.search),
    success: flashSuccess,
    error: flashError,
    consent: readConsent(req),
    features: config.features,
    categories: CATEGORIES,
    assetVersion,
    supportEmail: config.support.email,
    appUrl: config.appUrl,
    taxRate: config.pricing.taxRate,
    currentYear: new Date().getFullYear(),
    title: "",
    description: "",
    helpers,
  });
  next();
}

module.exports = { viewLocals };
