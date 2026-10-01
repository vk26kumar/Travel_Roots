"use strict";

/**
 * A tiny in-process cache for expensive, slowly changing values such as the
 * site statistics on the home page. Concurrent callers share one pending
 * computation, and `clear()` invalidates everything after writes.
 */
class TtlCache {
  constructor(ttlMs) {
    this.ttlMs = ttlMs;
    this.entries = new Map();
  }

  async get(key, compute) {
    const entry = this.entries.get(key);
    if (entry && entry.expires > Date.now()) return entry.value;

    const value = compute();
    this.entries.set(key, { value, expires: Date.now() + this.ttlMs });
    try {
      return await value;
    } catch (error) {
      this.entries.delete(key);
      throw error;
    }
  }

  clear() {
    this.entries.clear();
  }
}

module.exports = TtlCache;
