"use strict";

/**
 * Session-backed one-time messages, compatible with the `req.flash` API that
 * Passport uses for `failureFlash`.
 *
 *   req.flash("success", "Saved.")  queues a message
 *   req.flash("success")            returns and clears queued messages
 */
function flash(req, res, next) {
  req.flash = (type, message) => {
    if (!req.session) throw new Error("flash() requires sessions");

    if (message === undefined) {
      const store = req.session.flash || {};
      const messages = store[type] || [];
      if (store[type]) {
        delete store[type];
        if (!Object.keys(store).length) delete req.session.flash;
      }
      return messages;
    }

    const store = req.session.flash || (req.session.flash = {});
    (store[type] || (store[type] = [])).push(String(message));
    return store[type].length;
  };
  next();
}

module.exports = flash;
