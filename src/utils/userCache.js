"use strict";

/**
 * Short-lived cache of signed-in users, keyed by id. Loading the user is the
 * first database round trip on every signed-in request; with the database in
 * another region that trip costs hundreds of milliseconds.
 *
 * Entries are invalidated by hooks on the User model whenever a user is saved,
 * updated or deleted, so the cache never serves stale profile or wishlist data
 * within this process.
 */
const TTL_MS = 60 * 1000;
const MAX_ENTRIES = 2000;

const entries = new Map();

function get(id) {
  const key = String(id);
  const entry = entries.get(key);
  if (!entry) return null;
  if (entry.expires < Date.now()) {
    entries.delete(key);
    return null;
  }
  return entry.user;
}

function set(id, user) {
  if (entries.size >= MAX_ENTRIES) entries.delete(entries.keys().next().value);
  entries.set(String(id), { user, expires: Date.now() + TTL_MS });
}

function invalidate(id) {
  if (id === undefined || id === null) return entries.clear();
  return entries.delete(String(id));
}

module.exports = { get, set, invalidate };
