"use strict";

const crypto = require("crypto");

/**
 * connect-mongo encrypts sessions with kruptein, which rejects secrets that
 * lack at least two upper-case, lower-case, numeric and special characters.
 * A rejected secret makes every session write fail, so nobody can sign in.
 *
 * A compliant secret is used as-is (keeping existing sessions valid). Any
 * other secret is stretched into a deterministic key that always complies.
 */
function meetsStoreComplexity(secret) {
  if (typeof secret !== "string" || secret.length < 8) return false;
  const count = (pattern) => (secret.match(pattern) || []).length;
  return (
    count(/[A-Z]/g) >= 2 &&
    count(/[a-z]/g) >= 2 &&
    count(/[0-9]/g) >= 2 &&
    count(/[^A-Za-z0-9]/g) >= 2
  );
}

function sessionStoreSecret(secret) {
  if (meetsStoreComplexity(secret)) return secret;
  const digest = crypto.createHash("sha256").update(`travel-roots-session:${secret}`).digest("hex");
  return `Tr-${digest}-Ss!9Kq`;
}

/**
 * Treats sessions that cannot be decrypted or parsed (for example after the
 * secret is rotated) as missing, so affected visitors are simply signed out
 * instead of receiving an error page until their cookie expires.
 */
function tolerateUnreadableSessions(store, logger) {
  const get = store.get.bind(store);
  store.get = (sid, callback) =>
    get(sid, (error, session) => {
      if (error) {
        logger.warn("Discarding unreadable session", { error: error.message || String(error) });
        return callback(null, null);
      }
      return callback(null, session);
    });
  return store;
}

module.exports = { sessionStoreSecret, meetsStoreComplexity, tolerateUnreadableSessions };
