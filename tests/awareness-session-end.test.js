'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.join(__dirname, '..');
const swSource = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
const platform = fs.readFileSync(path.join(root, 'platform-client.js'), 'utf8');
const awareness = fs.readFileSync(path.join(root, 'awareness-client.js'), 'utf8');

// Run the real service worker against a fake push, a fake IndexedDB holding
// the given awareness-session state, and a fake network.
async function deliverPush(flagState, payload) {
  const listeners = {}, shown = [], fetched = [];
  const indexedDB = { open() {
    const req = {};
    setTimeout(() => {
      req.result = { objectStoreNames:{ contains:() => true }, transaction:() => ({ objectStore:() => ({ get(key) {
        const g = {};
        setTimeout(() => { g.result = key === 'awarenessSession' && flagState ? { state:flagState } : undefined; g.onsuccess && g.onsuccess(); });
        return g;
      } }) }) };
      req.onsuccess && req.onsuccess();
    });
    return req;
  } };
  const self = {
    indexedDB, location:{ origin:'https://example.test' },
    registration:{ scope:'https://example.test/app/',
      showNotification:(title, o) => { shown.push({ title, body:o.body, silent:!!o.silent }); return Promise.resolve(); },
      pushManager:{ getSubscription:() => Promise.resolve({ endpoint:'https://push.test/abc', toJSON:() => ({ keys:{ auth:'AUTH' } }) }) } },
    addEventListener:(t, fn) => { listeners[t] = fn; }, skipWaiting:() => {}
  };
  vm.runInContext(swSource, vm.createContext({ self, URL, JSON, Promise, Object, setTimeout, console,
    caches:{ open:() => Promise.resolve({ addAll:() => Promise.resolve() }), keys:() => Promise.resolve([]) },
    clients:{ claim:() => Promise.resolve(), matchAll:() => Promise.resolve([]) },
    fetch:(url, o) => { fetched.push({ url, body:JSON.parse(o.body) }); return Promise.resolve({ ok:true }); } }));
  let waited;
  listeners.push({ data:{ json:() => payload, text:() => '' }, waitUntil:p => { waited = p; } });
  await waited;
  return { shown, fetched };
}
const REMINDER = { title:'Presence', body:'Are you here right now?' };

test('a reminder that arrives after the session ended stops the session from the phone', async () => {
  // The reported case: the session was stopped and the app swiped away, but
  // the server never heard, so its reminders kept coming.
  const r = await deliverPush('ended', REMINDER);
  assert.equal(r.fetched.length, 1, 'the worker ends the session with the server itself');
  assert.match(r.fetched[0].url, /\/session\/end$/);
  assert.deepEqual(r.fetched[0].body, { endpoint:'https://push.test/abc', authKey:'AUTH' });
  // iOS revokes push for a web app whose pushes show nothing, so it must
  // still show something — a quiet notice, not another prompt.
  assert.equal(r.shown.length, 1);
  assert.equal(r.shown[0].body, 'Session ended — reminders stopped.');
  assert.equal(r.shown[0].silent, true);
});

test('a running or unknown session is reminded exactly as before', async () => {
  for (const state of ['active', null]) {
    const r = await deliverPush(state, REMINDER);
    assert.deepEqual(r.shown.map(n => n.body), ['Are you here right now?'], String(state));
    assert.equal(r.fetched.length, 0, String(state));
  }
});

test('prayer and practice pushes are never touched', async () => {
  const prayer = await deliverPush('ended', { title:'Prayer', body:'Prayer time: 12:00' });
  assert.deepEqual(prayer.shown.map(n => n.body), ['Prayer time: 12:00']);
  assert.equal(prayer.fetched.length, 0);
  const practice = await deliverPush('ended', { title:'Omnia', body:'Time to practise', tag:'presence-practice-reminder' });
  assert.equal(practice.fetched.length, 0);
});

test('ending sends the stop at once, with keepalive, and keeps it until answered', () => {
  const end = platform.slice(platform.indexOf('async function notifyServerSessionEnd'));
  const beforeFirstAwait = end.slice(0, end.indexOf('await getSubscription()'));
  assert.ok(beforeFirstAwait.length > 200, 'the first real await must still be the subscription lookup');
  // The remembered subscription goes out before anything is awaited, so
  // closing the app straight after Stop cannot cancel it.
  assert.match(beforeFirstAwait, /sendServerSessionEnd\(remembered\)/);
  assert.match(beforeFirstAwait, /setAwarenessPushFlag\('ended'\)/);
  const send = platform.slice(platform.indexOf('function sendServerSessionEnd'));
  assert.match(send.slice(0, 600), /keepalive: true/);
  assert.match(send.slice(0, 900), /if \(r\.status >= 500\) return false;/, 'a server error stays pending');
  // Retried on reopen, return to the foreground and reconnect — never mid-session.
  assert.match(platform, /window\.addEventListener\('load', retryPendingServerSessionEnd\)/);
  assert.match(platform, /window\.addEventListener\('online', retryPendingServerSessionEnd\)/);
  const retry = platform.slice(platform.indexOf('function retryPendingServerSessionEnd'));
  assert.match(retry.slice(0, 400), /if \(typeof sessionStartTime !== 'undefined' && sessionStartTime\) return;/);
});

test('a new session clears a stale stop and marks itself running', () => {
  const start = platform.slice(platform.indexOf('async function notifyServerSessionStart'));
  assert.match(start.slice(0, 700), /localStorage\.removeItem\(PRESENCE_SERVER_END_PENDING_KEY\)/);
  assert.match(start.slice(0, 900), /setAwarenessPushFlag\('active'\)/);
  assert.match(start, /if \(res\.ok\) rememberServerSession\(\{ endpoint: sub\.endpoint, authKey: pushAuthKey\(sub\) \}\);/);
  assert.match(awareness, /pavlokServerManaged = !!\(getPavlokToken\(\) && pvkR\.awareness\.enabled\);\n  if \(typeof setAwarenessPushFlag === 'function'\) setAwarenessPushFlag\('active'\);/,
    'a resumed session is marked running too');
});
