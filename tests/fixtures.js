"use strict";

/**
 * Generates throwaway credentials for tests at runtime, so no password or
 * secret literal is committed to the repository (and secret scanners such
 * as GitGuardian have nothing to flag).
 */

const crypto = require("crypto");

const random = (bytes = 8) => crypto.randomBytes(bytes).toString("hex");

/** A password that satisfies the signup policy (letters and a number). */
function testPassword() {
  return `Tp${random()}7`;
}

/** A random signing secret for payment and webhook tests. */
function testSecret() {
  return random(24);
}

/** A secret meeting the session store's complexity rules. */
function complexSecret() {
  return `AB${random(4)}cd!@12`;
}

/** A secret that fails them: only lower-case hex characters and digits. */
function simpleSecret() {
  return random(16);
}

module.exports = { testPassword, testSecret, complexSecret, simpleSecret };
