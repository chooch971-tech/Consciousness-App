'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { DEFAULT_PATHS, NETWORK_PATHS, percentile, readConfig, summarize, run } = require('../scripts/load-smoke');

test('launch load scenario covers the signed-in startup endpoints', () => {
  assert.deepEqual(DEFAULT_PATHS.map(endpoint => endpoint.name), [
    'sync-pull', 'feed', 'conversations', 'notifications', 'heartbeat'
  ]);
});

test('network scenario covers the batched profile graph endpoints', () => {
  assert.deepEqual(NETWORK_PATHS.map(endpoint => endpoint.name), [
    'friends', 'profile-summary', 'followers', 'following'
  ]);
  const config = readConfig({
    PRESENCE_LOAD_BASE_URL: 'http://127.0.0.1:3000',
    PRESENCE_LOAD_TOKEN: 'token',
    PRESENCE_LOAD_SCENARIO: 'network'
  });
  assert.equal(config.scenario, 'network');
});

test('load configuration requires explicit confirmation for remote targets', () => {
  assert.throws(() => readConfig({
    PRESENCE_LOAD_BASE_URL: 'https://presence.example.com',
    PRESENCE_LOAD_TOKEN: 'token'
  }), /PRESENCE_LOAD_CONFIRM=presence\.example\.com/);
  assert.doesNotThrow(() => readConfig({
    PRESENCE_LOAD_BASE_URL: 'https://presence.example.com',
    PRESENCE_LOAD_CONFIRM: 'presence.example.com',
    PRESENCE_LOAD_TOKEN: 'token'
  }));
});

test('load summary reports percentile latency and errors', () => {
  assert.equal(percentile([100, 20, 80, 40], 95), 100);
  const summary = summarize([
    { name: 'sync-pull', durationMs: 40, status: 200, error: null },
    { name: 'feed', durationMs: 90, status: 500, error: 'HTTP 500' }
  ], 1000);
  assert.equal(summary.requests, 2);
  assert.equal(summary.errors, 1);
  assert.equal(summary.errorRate, 0.5);
  assert.equal(summary.p95Ms, 90);
});

test('load runner models five launch requests for every virtual user', async () => {
  const originalFetch = global.fetch;
  const requests = [];
  global.fetch = async (url, options) => {
    requests.push({ url, method: options.method });
    return { ok: true, status: 200, arrayBuffer: async () => new ArrayBuffer(0) };
  };
  try {
    const summary = await run({
      baseUrl: 'http://127.0.0.1:3000',
      tokens: ['a', 'b'],
      scenario: 'launch',
      users: 3,
      rampMs: 0,
      timeoutMs: 1000
    });
    assert.equal(requests.length, 15);
    assert.equal(summary.requests, 15);
    assert.equal(summary.errors, 0);
  } finally {
    global.fetch = originalFetch;
  }
});
