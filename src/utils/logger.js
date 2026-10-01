"use strict";

/**
 * Minimal structured logger.
 *
 * Emits single-line JSON in production so log aggregators can index fields,
 * and readable text during development. Silent while running tests unless
 * LOG_LEVEL is set explicitly.
 */

const LEVELS = { debug: 10, info: 20, warn: 30, error: 40, silent: 100 };

const env = process.env.NODE_ENV || "development";
const defaultLevel = env === "test" ? "silent" : env === "production" ? "info" : "debug";
const threshold = LEVELS[process.env.LOG_LEVEL] || LEVELS[defaultLevel];

function serialiseError(err) {
  if (!(err instanceof Error)) return err;
  return { name: err.name, message: err.message, stack: err.stack, code: err.code };
}

function write(level, message, meta) {
  if (LEVELS[level] < threshold) return;

  const stream = level === "error" || level === "warn" ? process.stderr : process.stdout;
  let details = meta instanceof Error ? { err: serialiseError(meta) } : meta;
  if (details && typeof details === "object") {
    details = Object.fromEntries(
      Object.entries(details).map(([key, value]) => [key, serialiseError(value)]),
    );
  }

  if (env === "production") {
    stream.write(
      `${JSON.stringify({ time: new Date().toISOString(), level, message, ...details })}\n`,
    );
    return;
  }

  const suffix = details ? ` ${JSON.stringify(details, null, 2)}` : "";
  stream.write(`[${new Date().toISOString()}] ${level.toUpperCase()} ${message}${suffix}\n`);
}

module.exports = {
  debug: (message, meta) => write("debug", message, meta),
  info: (message, meta) => write("info", message, meta),
  warn: (message, meta) => write("warn", message, meta),
  error: (message, meta) => write("error", message, meta),
};
