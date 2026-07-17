'use strict';

const crypto = require('node:crypto');

const REQUEST_ID_PATTERN = /^[A-Za-z0-9._-]{8,64}$/;
const OBJECT_ID_SEGMENT = /\/[a-f\d]{24}(?=\/|$)/gi;
const UUID_SEGMENT = /\/[a-f\d]{8}-[a-f\d]{4}-[1-5][a-f\d]{3}-[89ab][a-f\d]{3}-[a-f\d]{12}(?=\/|$)/gi;

function normalizeRequestPath(value) {
  const pathname = String(value || '/').split('?')[0] || '/';
  return pathname
    .replace(OBJECT_ID_SEGMENT, '/:id')
    .replace(UUID_SEGMENT, '/:id');
}

function selectRequestId(value, createId = crypto.randomUUID) {
  const supplied = Array.isArray(value) ? value[0] : value;
  return typeof supplied === 'string' && REQUEST_ID_PATTERN.test(supplied)
    ? supplied
    : createId();
}

function errorDetails(error, includeStack = false) {
  const details = {
    name: error && error.name ? error.name : 'Error',
    message: error && error.message ? error.message : String(error || 'Unknown error')
  };
  if (includeStack && error && error.stack) details.stack = error.stack;
  return details;
}

function createStructuredLogger(output = console, now = () => new Date()) {
  function write(level, event, fields = {}) {
    const record = JSON.stringify({
      timestamp: now().toISOString(),
      level,
      event,
      ...fields
    });
    const method = typeof output[level] === 'function' ? level : 'log';
    output[method](record);
  }

  return {
    info: (event, fields) => write('info', event, fields),
    warn: (event, fields) => write('warn', event, fields),
    error: (event, fields) => write('error', event, fields)
  };
}

function observeRequests(options = {}) {
  const logger = options.logger || createStructuredLogger();
  const slowRequestMs = Number.isFinite(options.slowRequestMs) ? options.slowRequestMs : 1500;
  const createId = options.createId || crypto.randomUUID;
  const nowNs = options.nowNs || process.hrtime.bigint;

  return function requestObserver(req, res, next) {
    const requestId = selectRequestId(req.headers && req.headers['x-request-id'], createId);
    const startedAt = nowNs();
    req.requestId = requestId;
    res.setHeader('X-Request-ID', requestId);

    res.once('finish', () => {
      const durationMs = Number(nowNs() - startedAt) / 1e6;
      const fields = {
        requestId,
        method: req.method,
        path: normalizeRequestPath(req.originalUrl || req.url),
        status: res.statusCode,
        durationMs: Math.round(durationMs)
      };
      if (res.statusCode >= 500) logger.error('http_request_failed', fields);
      else if (res.statusCode >= 400) logger.warn('http_request_rejected', fields);
      else if (durationMs >= slowRequestMs) logger.warn('http_request_slow', fields);
    });

    next();
  };
}

module.exports = {
  createStructuredLogger,
  errorDetails,
  normalizeRequestPath,
  observeRequests,
  selectRequestId
};
