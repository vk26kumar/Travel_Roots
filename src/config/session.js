"use strict";

const crypto = require("crypto");
const { Store } = require("express-session");

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

/**
 * Session store that answers reads from memory and writes through to the
 * underlying store (MongoDB) in the background.
 *
 * Every request that carries a session cookie needs the session before
 * anything else can happen. With the database in another region that lookup
 * costs a full round trip; serving it from memory removes it. MongoDB remains
 * the source of truth, so sessions survive restarts: after a restart, or once
 * an entry is evicted, the first request reads it from MongoDB again.
 *
 * Suitable for a single application instance, which is how Travel Roots runs.
 */
class CachedSessionStore extends Store {
  constructor(inner, { logger, maxEntries = 5000, ttlMs = 6 * 60 * 60 * 1000, touchAfterMs } = {}) {
    super();
    this.inner = inner;
    this.logger = logger;
    this.maxEntries = maxEntries;
    this.ttlMs = ttlMs;
    this.touchAfterMs = touchAfterMs || 0;
    this.entries = new Map();
  }

  remember(sid, session, lastModified) {
    const data = { ...session };
    delete data.lastModified;
    this.entries.delete(sid);
    if (this.entries.size >= this.maxEntries) this.entries.delete(this.entries.keys().next().value);
    this.entries.set(sid, {
      json: JSON.stringify(data),
      lastModified: lastModified instanceof Date ? lastModified : new Date(),
      cachedUntil: Date.now() + this.ttlMs,
    });
  }

  background(action, sid) {
    return (error) => {
      if (error && this.logger) this.logger.error(`Session ${action} failed`, { sid, error });
    };
  }

  get(sid, callback) {
    const entry = this.entries.get(sid);
    if (entry && entry.cachedUntil > Date.now()) {
      const session = JSON.parse(entry.json);
      const expires = session.cookie && session.cookie.expires && new Date(session.cookie.expires);
      if (!expires || expires > new Date()) {
        session.lastModified = entry.lastModified;
        return callback(null, session);
      }
    }
    this.entries.delete(sid);

    return this.inner.get(sid, (error, session) => {
      if (error) return callback(error);
      if (session) this.remember(sid, session, session.lastModified);
      return callback(null, session || null);
    });
  }

  set(sid, session, callback) {
    this.remember(sid, session, new Date());
    this.inner.set(sid, session, this.background("write", sid));
    if (callback) callback(null);
  }

  touch(sid, session, callback) {
    const entry = this.entries.get(sid);
    if (entry) {
      const due = Date.now() - entry.lastModified.getTime() >= this.touchAfterMs;
      this.remember(sid, session, due ? new Date() : entry.lastModified);
    }
    this.inner.touch(sid, session, this.background("touch", sid));
    if (callback) callback(null);
  }

  destroy(sid, callback) {
    this.entries.delete(sid);
    this.inner.destroy(sid, callback);
  }
}

module.exports = {
  sessionStoreSecret,
  meetsStoreComplexity,
  tolerateUnreadableSessions,
  CachedSessionStore,
};
