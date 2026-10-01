"use strict";

const nodemailer = require("nodemailer");
const config = require("../config");
const logger = require("../utils/logger");

let transporter = null;

function getTransporter() {
  if (!config.features.email) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: config.mail.host,
      port: config.mail.port,
      secure: config.mail.port === 465,
      auth: config.mail.user ? { user: config.mail.user, pass: config.mail.pass } : undefined,
    });
  }
  return transporter;
}

/**
 * Sends a transactional email. When SMTP is not configured the message is
 * written to the log outside production so flows remain testable locally.
 */
async function sendMail({ to, subject, text }) {
  const transport = getTransporter();
  if (!transport) {
    if (!config.isProduction) logger.info("Email (SMTP not configured)", { to, subject, text });
    return false;
  }
  await transport.sendMail({ from: config.mail.from, to, subject, text });
  return true;
}

async function sendPasswordReset(user, resetUrl) {
  return sendMail({
    to: user.email,
    subject: "Reset your Travel Roots password",
    text: [
      `Hello ${user.displayName || user.username},`,
      "",
      "We received a request to reset the password for your Travel Roots account.",
      "Use the link below within the next hour to choose a new password:",
      "",
      resetUrl,
      "",
      "If you did not request this, you can safely ignore this email. Your password will not change.",
      "",
      "Travel Roots",
    ].join("\n"),
  });
}

module.exports = { sendPasswordReset };
