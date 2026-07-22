'use strict';

const fs = require('node:fs');

const DEFAULT_PATHS = Object.freeze([
  { name: 'sync-pull', method: 'GET', path: '/api/sync/sync/pull' },
  { name: 'feed', method: 'GET', path: '/api/social/feed?sort=newest' },
  { name: 'conversations', method: 'GET', path: '/api/social/conversations' },
  { name: 'notifications', method: 'GET', path: '/api/social/notifications' },
  { name: 'heartbeat', method: 'POST', path: '/api/sync/auth/heartbeat' }
]);
const NETWORK_PATHS = Object.freeze([
  { name: 'friends', method: 'GET', path: '/api/sync/friends/list' },
  { name: 'profile-summary', method: 'GET', path: '/api/social/users/me/summary' },
  { name: 'followers', method: 'GET', path: '/api/social/users/me/followers' },
  { name: 'following', method: 'GET', path: '/api/social/users/me/following' }
]);
const SCENARIOS = Object.freeze({ launch: DEFAULT_PATHS, network: NETWORK_PATHS });

function percentile(values, pct) {
  if (!values.length) return 0;
  const sorted = values.slice().sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil((pct / 100) * sorted.length) - 1));
  return sorted[index];
}

function positiveNumber(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : fallback;
}

function nonnegativeNumber(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : fallback;
}

function loadTokens(env) {
  if (env.PRESENCE_LOAD_TOKENS_FILE) {
    const parsed = JSON.parse(fs.readFileSync(env.PRESENCE_LOAD_TOKENS_FILE, 'utf8'));
    if (!Array.isArray(parsed)) throw new Error('PRESENCE_LOAD_TOKENS_FILE must contain a JSON array');
    return parsed.map(item => typeof item === 'string' ? item : item && item.token).filter(Boolean);
  }
  return String(env.PRESENCE_LOAD_TOKENS || env.PRESENCE_LOAD_TOKEN || '')
    .split(',').map(value => value.trim()).filter(Boolean);
}

function readConfig(env) {
  if (!env.PRESENCE_LOAD_BASE_URL) throw new Error('PRESENCE_LOAD_BASE_URL is required');
  const baseUrl = new URL(env.PRESENCE_LOAD_BASE_URL);
  const isLocal = ['localhost', '127.0.0.1', '::1'].includes(baseUrl.hostname);
  if (!isLocal && env.PRESENCE_LOAD_CONFIRM !== baseUrl.host) {
    throw new Error('Set PRESENCE_LOAD_CONFIRM=' + baseUrl.host + ' to confirm the exact load-test target');
  }
  const tokens = loadTokens(env);
  if (!tokens.length) throw new Error('Provide PRESENCE_LOAD_TOKEN(S) or PRESENCE_LOAD_TOKENS_FILE');
  const scenario = String(env.PRESENCE_LOAD_SCENARIO || 'launch').trim().toLowerCase();
  if (!SCENARIOS[scenario]) throw new Error('PRESENCE_LOAD_SCENARIO must be launch or network');
  return {
    baseUrl: baseUrl.origin,
    tokens,
    scenario,
    users: Math.floor(positiveNumber(env.PRESENCE_LOAD_USERS, Math.min(100, tokens.length))),
    rampMs: nonnegativeNumber(env.PRESENCE_LOAD_RAMP_SEC, 10) * 1000,
    timeoutMs: positiveNumber(env.PRESENCE_LOAD_TIMEOUT_MS, 10000),
    maxErrorRate: nonnegativeNumber(env.PRESENCE_LOAD_MAX_ERROR_RATE, 0.01),
    maxP95Ms: positiveNumber(env.PRESENCE_LOAD_MAX_P95_MS, 2000)
  };
}

async function hit(config, token, endpoint, results) {
  const started = Date.now();
  let status = 0;
  let error = null;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.timeoutMs);
  try {
    const response = await fetch(config.baseUrl + endpoint.path, {
      method: endpoint.method,
      headers: { Authorization: 'Bearer ' + token, Accept: 'application/json' },
      signal: controller.signal
    });
    status = response.status;
    await response.arrayBuffer();
    if (!response.ok) error = 'HTTP ' + response.status;
  } catch (cause) {
    error = cause && cause.name === 'AbortError' ? 'timeout' : (cause && cause.message) || 'request failed';
  } finally {
    clearTimeout(timeout);
  }
  results.push({ name: endpoint.name, durationMs: Date.now() - started, status, error });
}

async function runJourney(config, token, results, endpoints) {
  if (config.scenario === 'launch') {
    await hit(config, token, endpoints[0], results);
    await Promise.all(endpoints.slice(1).map(endpoint => hit(config, token, endpoint, results)));
    return;
  }
  await Promise.all(endpoints.map(endpoint => hit(config, token, endpoint, results)));
}

function summarize(results, elapsedMs, endpointsToReport) {
  const failures = results.filter(result => result.error);
  const durations = results.map(result => result.durationMs);
  const endpoints = {};
  for (const endpoint of endpointsToReport || DEFAULT_PATHS) {
    const rows = results.filter(result => result.name === endpoint.name);
    const failed = rows.filter(result => result.error);
    endpoints[endpoint.name] = {
      requests: rows.length,
      errors: failed.length,
      p50Ms: percentile(rows.map(result => result.durationMs), 50),
      p95Ms: percentile(rows.map(result => result.durationMs), 95),
      p99Ms: percentile(rows.map(result => result.durationMs), 99)
    };
  }
  return {
    requests: results.length,
    errors: failures.length,
    errorRate: results.length ? failures.length / results.length : 1,
    elapsedMs,
    requestsPerSecond: elapsedMs ? Number((results.length / (elapsedMs / 1000)).toFixed(1)) : 0,
    p50Ms: percentile(durations, 50),
    p95Ms: percentile(durations, 95),
    p99Ms: percentile(durations, 99),
    endpoints
  };
}

async function run(config) {
  const results = [];
  const started = Date.now();
  const workers = [];
  const endpoints = SCENARIOS[config.scenario || 'launch'];
  for (let index = 0; index < config.users; index++) {
    const delay = config.users === 1 ? 0 : Math.floor((index / (config.users - 1)) * config.rampMs);
    const token = config.tokens[index % config.tokens.length];
    workers.push(new Promise(resolve => setTimeout(resolve, delay)).then(() => runJourney(config, token, results, endpoints)));
  }
  await Promise.all(workers);
  return summarize(results, Date.now() - started, endpoints);
}

async function main() {
  const config = readConfig(process.env);
  console.log('Presence', config.scenario, 'load test:', config.users, 'users over', config.rampMs / 1000, 'seconds against', config.baseUrl);
  const summary = await run(config);
  console.log(JSON.stringify(summary, null, 2));
  const passed = summary.errorRate <= config.maxErrorRate && summary.p95Ms <= config.maxP95Ms;
  if (!passed) {
    console.error('FAIL: required errorRate <=', config.maxErrorRate, 'and p95Ms <=', config.maxP95Ms);
    process.exitCode = 1;
  } else {
    console.log('PASS: launch thresholds satisfied');
  }
}

if (require.main === module) main().catch(error => { console.error(error.message); process.exitCode = 1; });

module.exports = { DEFAULT_PATHS, NETWORK_PATHS, SCENARIOS, percentile, readConfig, summarize, run };
