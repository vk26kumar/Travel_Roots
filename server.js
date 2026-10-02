"use strict";

/**
 * Process entry point: validates configuration, connects to MongoDB, starts
 * the HTTP server and shuts everything down cleanly on SIGTERM / SIGINT.
 */

const mongoose = require("mongoose");
const { MongoStore } = require("connect-mongo");
const config = require("./src/config");
const {
  sessionStoreSecret,
  tolerateUnreadableSessions,
  CachedSessionStore,
} = require("./src/config/session");
const logger = require("./src/utils/logger");
const { createApp } = require("./src/app");

async function start() {
  for (const warning of config.validate()) logger.warn(warning);

  mongoose.set("strictQuery", true);
  await mongoose.connect(config.db.url, { serverSelectionTimeoutMS: 10000 });
  logger.info("Connected to MongoDB");

  const touchAfterSeconds = 24 * 3600;
  const mongoStore = MongoStore.create({
    client: mongoose.connection.getClient(),
    crypto: { secret: sessionStoreSecret(config.session.secret) },
    touchAfter: touchAfterSeconds,
    ttl: config.session.maxAgeMs / 1000,
  });
  mongoStore.on("error", (error) => logger.error("Session store error", error));
  tolerateUnreadableSessions(mongoStore, logger);
  const sessionStore = new CachedSessionStore(mongoStore, {
    logger,
    touchAfterMs: touchAfterSeconds * 1000,
  });

  const app = createApp({ sessionStore });
  const server = app.listen(config.port, () => {
    logger.info(`Travel Roots listening on port ${config.port}`, { env: config.env });
  });

  let shuttingDown = false;
  const shutdown = (signal) => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info(`${signal} received, shutting down`);

    const forceExit = setTimeout(() => process.exit(1), 10000);
    forceExit.unref();

    server.close(async () => {
      await mongoose.connection.close().catch(() => {});
      logger.info("Shutdown complete");
      process.exit(0);
    });
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

process.on("unhandledRejection", (reason) => {
  logger.error("Unhandled promise rejection", reason instanceof Error ? reason : { reason });
});

start().catch((error) => {
  logger.error("Failed to start Travel Roots", error);
  process.exit(1);
});
