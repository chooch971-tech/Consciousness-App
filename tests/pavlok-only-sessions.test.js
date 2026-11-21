'use strict';

// Pavlok-only Awareness sessions: for a phone that cannot receive push (a
// Mudita Kompakt), the server fires the band on every bell, so it keeps
// working while the phone sleeps or is switched off.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');

const root = path.join(__dirname, '..');
const server = fs.readFileSync(path.join(root, 'server.js'), 'utf8');
const between = (from, to) => {
  const a = server.indexOf(from), b = server.indexOf(to, a);
  assert.ok(a > -1 && b > a, 'server.js must still contain ' + from);
  return server.slice(a, b);
};

// Load the real session code against a fake clock, database, app and Pavlok.
function load(opts = {}) {
  let now = opts.start || Date.UTC(2026, 10, 21, 9, 0, 0);
  const rows = new Map();
  const fired = [];
  const routes = {};
  const ctx = {
    Math, JSON, Number, Object, Promise, parseInt, console: { log() {}, error() {} },
    crypto,
    Date: class extends Date { static now() { return now; } },
    PAVLOK_VALID_TYPES: new Set(['zap', 'vibe', 'beep']),
    pavlokRateLimit: (req, res, next) => next(),
    firePavlokServer: (token, type, intensity) => { fired.push({ at: now, token, type, intensity }); return Promise.resolve(opts.pavlokFails ? false : true); },
    pavlokSessionsCollection: {
      async updateOne(filter, update) { rows.set(filter.id, { ...(rows.get(filter.id) || {}), ...update.$set }); },
      async deleteOne(filter) { rows.delete(filter.id); },
      async find() { return { toArray: async () => [...rows.values()].map(r => ({ ...r })) }; }
    },
    app: { post: (p, ...handlers) => { routes[p] = handlers[handlers.length - 1]; } }
  };
  vm.createContext(ctx);
  vm.runInContext('var pavlokSessions = [];\n'
    + between('async function savePavlokSession', '// ── Cloud Sync Middleware')
    + between('async function processPavlokSessions', '// ── Prayer schedule loop')
    + between('const PAVLOK_SESSION_ID', "app.post('/prayer/schedule'"), ctx);
  async function call(route, body) {
    let status = 200, payload;
    await routes[route]({ body }, { status(c) { status = c; return this; }, json(d) { payload = d; return this; } });
    return { status, body: payload };
  }
  return {
    ctx, fired, rows, call,
    get now() { return now; },
    // Run the 5-second background loop for `ms` of wall time.
    async advance(ms) {
      const end = now + ms;
      while (now < end) { now = Math.min(end, now + 5000); await ctx.processPavlokSessions(); }
    }
  };
}
const START = { token: 'tok', type: 'zap', intensity: 60, intervalSec: 60 };

test('the server fires the band on every bell with the phone switched off', async () => {
  const s = load();
  const epoch = s.now;
  const r = await s.call('/pavlok-session/start', { ...START, epochStart: epoch, endsAt: epoch + 10 * 60000 });
  assert.equal(r.status, 200);
  assert.match(r.body.id, /^[a-f0-9]{32}$/);
  assert.equal(r.body.pavlokManaged, true);
  await s.advance(11 * 60000);                      // nothing from the phone at all
  assert.equal(s.fired.length, 10, 'one stimulus per bell, the last at the session end');
  assert.deepEqual(s.fired[0], { at: epoch + 60000, token: 'tok', type: 'zap', intensity: 60 });
  s.fired.forEach((f, i) => assert.ok(f.at - (epoch + (i + 1) * 60000) < 5000, 'bell ' + (i + 1) + ' within the 5s loop'));
  assert.equal(s.rows.size, 0, 'and the session is gone once it ends');
});

test('bells follow the phone, not a server slow to wake', async () => {
  // The request lands 40s after the phone started: a sleeping Render server.
  const s = load();
  const phoneStart = s.now - 40000;
  await s.call('/pavlok-session/start', { ...START, epochStart: phoneStart, endsAt: phoneStart + 5 * 60000 });
  await s.advance(30000);
  assert.equal(s.fired.length, 1);
  assert.ok(s.fired[0].at - (phoneStart + 60000) < 5000, 'fired on the phone\'s first bell, not 60s after the request');
});

test('bells the phone already rang are not fired again', async () => {
  const s = load();
  const phoneStart = s.now - 150000;               // two bells already behind
  await s.call('/pavlok-session/start', { ...START, epochStart: phoneStart, endsAt: phoneStart + 10 * 60000 });
  await s.advance(20000);
  assert.equal(s.fired.length, 0, 'the next bell is the first one fired');
  await s.advance(20000);
  assert.equal(s.fired.length, 1);
});

test('ending stops it, and only the holder of the id can', async () => {
  const s = load();
  const { body } = await s.call('/pavlok-session/start', { ...START, epochStart: s.now, endsAt: s.now + 600000 });
  await s.advance(130000);
  assert.equal(s.fired.length, 2);
  assert.equal((await s.call('/pavlok-session/end', { id: 'f'.repeat(32) })).status, 404);
  assert.equal((await s.call('/pavlok-session/end', { id: body.id })).status, 200);
  await s.advance(300000);
  assert.equal(s.fired.length, 2, 'nothing after the end');
  assert.equal((await s.call('/pavlok-session/end', { id: body.id })).status, 404, 'a repeat end is settled, not an error');
});

test('one band never runs two schedules', async () => {
  const s = load();
  await s.call('/pavlok-session/start', { ...START, epochStart: s.now, endsAt: s.now + 600000 });
  await s.call('/pavlok-session/start', { ...START, intervalSec: 120, epochStart: s.now, endsAt: s.now + 600000 });
  assert.equal(s.ctx.pavlokSessions.length, 1, 'starting again with the same token replaces the old session');
  await s.advance(250000);
  assert.equal(s.fired.length, 2, 'only the new 120s schedule fires');
});

test('a failing Pavlok call costs one bell, never a burst', async () => {
  // The push loop retries a failed bell every 5s; for a shock that would be a
  // zap every five seconds until Pavlok's rate limit cut in.
  const s = load({ pavlokFails: true });
  await s.call('/pavlok-session/start', { ...START, epochStart: s.now, endsAt: s.now + 600000 });
  await s.advance(125000);
  assert.equal(s.fired.length, 2, 'exactly one attempt per bell');
});

test('settings can change mid-session; a lost session reports 404', async () => {
  const s = load();
  const { body } = await s.call('/pavlok-session/start', { ...START, epochStart: s.now, endsAt: s.now + 600000 });
  assert.equal((await s.call('/pavlok-session/update', { id: body.id, token: 'tok', type: 'vibe', intensity: 20 })).status, 200);
  await s.advance(61000);
  assert.deepEqual([s.fired[0].type, s.fired[0].intensity], ['vibe', 20]);
  assert.equal((await s.call('/pavlok-session/update', { id: 'a'.repeat(32), token: 'tok' })).status, 404,
    'the phone treats 404 as "start a new one"');
});

test('a wrong phone clock cannot schedule into the past or the future', async () => {
  const s = load();
  await s.call('/pavlok-session/start', { ...START, epochStart: s.now + 3600000, endsAt: s.now + 10 * 3600000 });
  const ps = s.ctx.pavlokSessions[0];
  assert.equal(ps.epochStart, s.now, 'a future start falls back to now');
  assert.ok(ps.endsAt <= s.now + 4 * 3600000, 'and no session outlives the four-hour cap');
});

test('the loop is scheduled and sessions survive a restart', () => {
  assert.match(server, /name: 'pavlok-sessions',\s*intervalMs: 5000,\s*task: processPavlokSessions/);
  assert.match(server, /pavlokSessions = await pavlokSessionsCollection\.find\(\{\}\)\.toArray\(\);/);
  assert.match(server, /pavlokSessionsCollection = db\.collection\('pavlok_sessions'\);/);
});

test('the phone hands the Pavlok to the server only once it confirms', () => {
  const platform = fs.readFileSync(path.join(root, 'platform-client.js'), 'utf8');
  const start = platform.slice(platform.indexOf('async function notifyServerSessionStart'));
  // The bug the browser test caught: the result was logged, not acted on, so
  // the phone fired as well — two shocks a bell.
  assert.match(start.slice(0, 1400), /pavlokServerManaged = await startServerPavlokSession\(\);/);
  const fn = platform.slice(platform.indexOf('async function startServerPavlokSession'));
  const body = fn.slice(0, fn.indexOf('\n}\n'));
  assert.match(body, /epochStart: reminderEpochStart \|\| sessionStartTime/, 'timed from the phone');
  assert.match(body, /if \(!res\.ok\) return false;/);
  assert.match(body, /if \(!sessionStartTime\) \{ sendPavlokSessionEnd\(\{ id: data\.id \}\); return false; \}/,
    'a session ended while the start was in flight is undone');
  // Ending it is immediate and retried, like the push session's end.
  const end = platform.slice(platform.indexOf('async function notifyServerSessionEnd'));
  assert.match(end.slice(0, end.indexOf('await getSubscription()')), /endServerPavlokSession\(\);/);
  assert.match(platform, /'\/pavlok-session\/end', \{\s*method: 'POST', keepalive: true/);
  assert.match(platform, /if \(pendingPavlok\) sendPavlokSessionEnd\(pendingPavlok\);/);
});
