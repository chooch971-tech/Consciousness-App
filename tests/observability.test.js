'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const fs = require('node:fs');
const path = require('node:path');
const {
  createStructuredLogger,
  errorDetails,
  normalizeRequestPath,
  observeRequests,
  selectRequestId
} = require('../observability');

test('request paths discard queries and normalize user-controlled identifiers', () => {
  assert.equal(normalizeRequestPath('/api/social/posts/65f1a1020304050607080910?token=secret'), '/api/social/posts/:id');
  assert.equal(normalizeRequestPath('/api/items/550e8400-e29b-41d4-a716-446655440000'), '/api/items/:id');
});

test('request IDs accept bounded safe values and replace malformed input', () => {
  assert.equal(selectRequestId('client-request_123', () => 'generated-id'), 'client-request_123');
  assert.equal(selectRequestId('bad id\nforged', () => 'generated-id'), 'generated-id');
  assert.equal(selectRequestId('x'.repeat(65), () => 'generated-id'), 'generated-id');
});

test('structured logs remain machine-readable and omit stacks by default', () => {
  const records = [];
  const logger = createStructuredLogger({ log: value => records.push(value) }, () => new Date('2026-07-17T12:00:00Z'));
  logger.info('server_started', { port: 3000 });
  assert.deepEqual(JSON.parse(records[0]), {
    timestamp: '2026-07-17T12:00:00.000Z',
    level: 'info',
    event: 'server_started',
    port: 3000
  });
  assert.deepEqual(errorDetails(Object.assign(new Error('nope'), { stack: 'private stack' })), {
    name: 'Error',
    message: 'nope'
  });
});

test('request observer logs failures and slow requests without routine success noise', () => {
  const records = [];
  const logger = {
    warn: (event, fields) => records.push({ level: 'warn', event, ...fields }),
    error: (event, fields) => records.push({ level: 'error', event, ...fields })
  };
  let now = 0n;
  const middleware = observeRequests({
    logger,
    slowRequestMs: 100,
    createId: () => 'generated-request-id',
    nowNs: () => now
  });

  function finish(statusCode, durationMs, url = '/api/social/posts/65f1a1020304050607080910?secret=yes') {
    const req = { headers: {}, method: 'GET', originalUrl: url };
    const res = new EventEmitter();
    res.statusCode = statusCode;
    res.setHeader = (name, value) => { res.headers = { [name]: value }; };
    middleware(req, res, () => {});
    now += BigInt(durationMs) * 1000000n;
    res.emit('finish');
    return { req, res };
  }

  const success = finish(200, 20);
  assert.equal(success.req.requestId, 'generated-request-id');
  assert.equal(success.res.headers['X-Request-ID'], 'generated-request-id');
  assert.equal(records.length, 0);

  finish(200, 125, '/health');
  finish(404, 5, '/missing');
  finish(500, 5);
  assert.deepEqual(records.map(record => record.event), [
    'http_request_slow',
    'http_request_rejected',
    'http_request_failed'
  ]);
  assert.equal(records[2].path, '/api/social/posts/:id');
  assert.equal(JSON.stringify(records).includes('secret=yes'), false);
});

test('server exposes database health and bounded graceful shutdown hooks', () => {
  const server = fs.readFileSync(path.join(__dirname, '..', 'server.js'), 'utf8');
  assert.match(server, /app\.use\(observeRequests\(\{ logger \}\)\)/);
  assert.match(server, /app\.get\('\/health', async \(req, res\) => \{/);
  assert.match(server, /command\(\{ ping: 1 \}\)/);
  assert.match(server, /status\(503\)\.json\(\{ status: 'degraded', database: 'unavailable' \}\)/);
  assert.match(server, /process\.once\('SIGTERM'/);
  assert.match(server, /process\.once\('SIGINT'/);
  assert.match(server, /await mongoClient\.close\(\)/);
  assert.match(server, /server_shutdown_timed_out/);
});
