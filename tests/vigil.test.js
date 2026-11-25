'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.join(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'vigil-client.js'), 'utf8');
const server = fs.readFileSync(path.join(root, 'server.js'), 'utf8');

function load(fetchImpl) {
  const calls = [];
  const context = {
    console,
    authToken: 'tok',
    SERVER_URL: 'https://example.test',
    setInterval: () => 1,
    clearInterval: () => {},
    escHtml: s => String(s),
    document: { addEventListener: () => {}, getElementById: () => null, visibilityState: 'visible' },
    fetch: (url, opts) => {
      calls.push({ url, method: (opts && opts.method) || 'GET', body: opts && opts.body });
      return Promise.resolve(fetchImpl ? fetchImpl(url, opts) : { ok: true, json: () => Promise.resolve({}) });
    }
  };
  vm.runInNewContext(source, context, { filename: 'vigil-client.js' });
  calls.length = 0; // ignore the Home refresh the module starts on load
  context.calls = calls;
  return context;
}

test('an invite waiting on you outranks everything else on Home', () => {
  const { vigilPrimary } = load();
  const waitingOnThem = { status: 'pending', incoming: false };
  const inProgress = { status: 'accepted', youCompleted: false };
  const invite = { status: 'pending', incoming: true };
  assert.equal(vigilPrimary([waitingOnThem, inProgress, invite]), invite);
  assert.equal(vigilPrimary([waitingOnThem, inProgress]), inProgress);
  assert.equal(vigilPrimary([{ status: 'kept', claimed: true }]), null, 'a kept, paid vigil needs no card');
});

test('a sit too short to count does not keep a vigil', async () => {
  const context = load();
  context.vigilOnSessionComplete(60);
  await new Promise(r => setImmediate(r));
  assert.equal(context.calls.length, 0, 'no request at all for a one-minute tap-through');
});

test('a real sit reports to every vigil still waiting on you, re-reading the list first', async () => {
  const context = load((url, opts) => {
    if (url.endsWith('/vigils') && (!opts || !opts.method || opts.method === 'GET')) {
      return { ok: true, json: () => Promise.resolve({ vigils: [
        { id: 'a', status: 'accepted', youCompleted: false },
        { id: 'b', status: 'accepted', youCompleted: true },
        { id: 'c', status: 'pending', incoming: true }
      ] }) };
    }
    return { ok: true, json: () => Promise.resolve({}) };
  });
  context.vigilOnSessionComplete(600);
  await new Promise(r => setTimeout(r, 20));
  const completes = context.calls.filter(c => /\/complete$/.test(c.url)).map(c => c.url);
  assert.deepEqual(completes, ['https://example.test/api/social/vigils/a/complete']);
});

test('a kept vigil pays only when the server confirms this is the first claim', async () => {
  let credited = 0;
  const context = load(() => ({ ok: true, json: () => Promise.resolve({ firstClaim: false }) }));
  context.omniaState = {};
  context.omniaCreditAkasha = () => { credited++; };
  context._vigils = [{ id: 'k', status: 'kept', claimed: false, otherUsername: 'x' }];
  vm.runInContext('_vigils = this._vigils; vigilClaimKept();', context);
  await new Promise(r => setTimeout(r, 20));
  assert.equal(credited, 0, 'another device already claimed it');
});

test('the server only lets mutual friends start vigils and pays each person once', () => {
  const invite = server.slice(server.indexOf("app.post('/api/social/vigils',"), server.indexOf("app.get('/api/social/vigils'"));
  assert.match(invite, /isMutualFollow\(selfId, userId\)/);
  assert.match(invite, /blocksCollection\.findOne/);
  const claim = server.slice(server.indexOf("app.post('/api/social/vigils/:id/claim'"));
  assert.match(claim, /claimedBy: \{ \$ne: selfId \}/);
  assert.match(claim, /firstClaim: result\.modifiedCount === 1/);
});

test('the sitting count names friends only, never strangers', () => {
  const route = server.slice(server.indexOf("app.get('/api/social/sitting'"), server.indexOf('// A Shared Vigil'));
  assert.match(route, /followeeId: selfId, status: 'active'/, 'names come from mutual follows');
  assert.match(route, /res\.json\(\{ count: sittingIds\.length, friends \}\)/);
});

test('every exercise drives the sitting heartbeat through the shared wake lock', () => {
  const asana = fs.readFileSync(path.join(root, 'asana-client.js'), 'utf8');
  assert.match(asana, /function requestExerciseWakeLock\(\) \{[\s\S]*?sittingStart\(\)/);
  assert.match(asana, /function releaseExerciseWakeLock\(\) \{[\s\S]*?sittingStop\(\)/);
  const sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
  assert.match(sw, /'vigil-client\.js'/);
});
