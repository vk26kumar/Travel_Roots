"use strict";

const config = require("../config");
const ExpressError = require("../utils/ExpressError");

const DAY_MS = 24 * 60 * 60 * 1000;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Parses a YYYY-MM-DD string as a UTC midnight date, or returns null. */
function parseDate(value) {
  if (typeof value !== "string" || !ISO_DATE.test(value)) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) return null;
  return date;
}

function todayUtc(now = new Date()) {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

/**
 * Validates a requested stay and returns its normalised dates and length.
 * Throws a 400 ExpressError describing the first problem found.
 */
function validateStay(checkIn, checkOut, now = new Date()) {
  const from = parseDate(checkIn);
  const to = parseDate(checkOut);
  if (!from || !to)
    throw new ExpressError(400, "Please choose valid check-in and check-out dates.");

  // Allow one day of tolerance so guests in time zones ahead of UTC can book "today".
  const earliest = new Date(todayUtc(now).getTime() - DAY_MS);
  if (from < earliest) throw new ExpressError(400, "Check-in date cannot be in the past.");

  const latest = new Date(todayUtc(now).getTime() + config.pricing.maxAdvanceDays * DAY_MS);
  if (from > latest) {
    throw new ExpressError(
      400,
      `Bookings can be made up to ${config.pricing.maxAdvanceDays} days in advance.`,
    );
  }

  const nights = Math.round((to - from) / DAY_MS);
  if (nights < 1) throw new ExpressError(400, "Check-out must be at least one day after check-in.");
  if (nights > config.pricing.maxNights) {
    throw new ExpressError(400, `Stays are limited to ${config.pricing.maxNights} nights.`);
  }

  return { from, to, nights };
}

/**
 * Computes the price breakdown for a stay. All arithmetic is done in paise to
 * avoid floating point drift; rupee values are rounded to two decimals.
 */
function quote(pricePerNight, nights, taxRate = config.pricing.taxRate) {
  const subtotalPaise = Math.round(pricePerNight * 100) * nights;
  const taxPaise = Math.round(subtotalPaise * taxRate);
  const totalPaise = subtotalPaise + taxPaise;
  return {
    nights,
    pricePerNight,
    subtotal: subtotalPaise / 100,
    tax: taxPaise / 100,
    total: totalPaise / 100,
    totalPaise,
    taxRate,
  };
}

module.exports = { parseDate, validateStay, quote, DAY_MS };
