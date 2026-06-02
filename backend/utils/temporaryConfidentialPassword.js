const crypto = require('crypto');

const DEFAULT_WINDOW_HOURS = 24;

function getWindowMs() {
  const hours = Number(process.env.CONFIDENTIAL_TEMP_WINDOW_HOURS);
  if (Number.isFinite(hours) && hours > 0) {
    return hours * 60 * 60 * 1000;
  }
  return DEFAULT_WINDOW_HOURS * 60 * 60 * 1000;
}

function getSecret() {
  return (
    process.env.CONFIDENTIAL_TEMP_SECRET ||
    process.env.JWT_SECRET ||
    'confidential-temp-fallback-change-in-production'
  );
}

function getRotationWindowStart(atMs = Date.now()) {
  const windowMs = getWindowMs();
  return Math.floor(atMs / windowMs) * windowMs;
}

function buildTemporaryPassword(windowStart) {
  const hmac = crypto
    .createHmac('sha256', getSecret())
    .update(`confidential-temp:v1:${windowStart}`)
    .digest('base64url');
  const clean = hmac.replace(/[^a-zA-Z0-9]/g, '');
  return clean.slice(0, 10).toUpperCase();
}

function getCurrentTemporaryPassword(atMs = Date.now()) {
  const windowMs = getWindowMs();
  const windowStart = getRotationWindowStart(atMs);
  return {
    password: buildTemporaryPassword(windowStart),
    validFrom: new Date(windowStart).toISOString(),
    validUntil: new Date(windowStart + windowMs).toISOString(),
    windowHours: windowMs / (60 * 60 * 1000),
  };
}

function verifyTemporaryPassword(input) {
  const submitted = String(input || '').trim().toUpperCase();
  if (!submitted) {
    return false;
  }
  const now = Date.now();
  const windowMs = getWindowMs();
  const windowStart = getRotationWindowStart(now);
  const current = buildTemporaryPassword(windowStart);
  if (submitted === current) {
    return true;
  }
  const previous = buildTemporaryPassword(windowStart - windowMs);
  return submitted === previous;
}

module.exports = {
  getCurrentTemporaryPassword,
  verifyTemporaryPassword,
};
