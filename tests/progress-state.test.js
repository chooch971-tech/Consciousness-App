'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  PRIMARY_RESET_KEYS,
  createResetSnapshot,
  withoutResetMarkers,
  replaceStorageSnapshot,
  hasResetMarker
} = require('../progress-state');

const RESET_AT = 1783915200000;

function defaults() {
  return {
    awarenessDefault: { level: 1, xp: 0, history: [] },
    concentrationDefault: { level: 1, xp: 0, history: [] },
    prayerDefault: { enabled: false, history: [] },
    omniaDefault: {
      akasha: 900,
      reservoir: 300,
      lastTick: 1,
      bodies: { physical: 18, astral: 17, mental: 16 },
      upgrades: { current: 8, gen2: 4, vessel: 6 },
      bardonStep: 4,
      rec: { ex: 'clock' },
      recStreak: 7,
      completedRecommended: 25,
      totalAkashaEarned: 12000,
      cosmetics: { palette: 'solar', unlockedPalettes: ['aether', 'solar'] }
    }
  };
}

test('reset snapshot restores level-one Omnia bodies and zero Akasha', () => {
  const input = defaults();
  const original = structuredClone(input);
  const snapshot = createResetSnapshot({ ...input, resetAt: RESET_AT });
  const omnia = JSON.parse(snapshot.presence_omnia_v1);

  assert.deepEqual(omnia.bodies, { physical: 1, astral: 1, mental: 1 });
  assert.equal(omnia.akasha, 0);
  assert.equal(omnia.reservoir, 0);
  assert.equal(omnia.bardonStep, 1);
  assert.equal(omnia.lastTick, RESET_AT);
  assert.equal(omnia._resetAt, RESET_AT);
  assert.deepEqual(omnia.upgrades, { current: 1, gen2: 1, vessel: 1 });
  assert.deepEqual(input, original, 'reset construction must not mutate live defaults');
});

test('deliberate reset stamps every resettable slice consistently', () => {
  const snapshot = createResetSnapshot({ ...defaults(), resetAt: RESET_AT });
  const jsonKeys = Object.keys(snapshot).filter(key => key !== 'presence_visited');
  jsonKeys.forEach(key => assert.equal(JSON.parse(snapshot[key])._resetAt, RESET_AT, key));
  assert.equal(snapshot.presence_visited, '1');
});

test('signed-out reset removes reset markers without changing reset values', () => {
  const reset = createResetSnapshot({ ...defaults(), resetAt: RESET_AT });
  const signedOut = withoutResetMarkers(reset);
  const omnia = JSON.parse(signedOut.presence_omnia_v1);

  assert.equal(Object.hasOwn(omnia, '_resetAt'), false);
  assert.deepEqual(omnia.bodies, { physical: 1, astral: 1, mental: 1 });
  assert.equal(omnia.akasha, 0);
  assert.equal(signedOut.presence_visited, '1');
});

test('snapshot replacement clears stale progress before writing the new state', () => {
  const values = new Map([
    ['presence_v3', 'stale-awareness'],
    ['presence_session', 'stale-session'],
    ['unrelated_preference', 'keep-me']
  ]);
  const storage = {
    getItem: key => values.get(key) || null,
    removeItem: key => values.delete(key),
    setItem: (key, value) => values.set(key, value)
  };
  const snapshot = createResetSnapshot({ ...defaults(), resetAt: RESET_AT });

  replaceStorageSnapshot(storage, ['presence_v3', 'presence_session'], snapshot);

  assert.equal(values.has('presence_session'), false);
  assert.equal(JSON.parse(values.get('presence_v3'))._resetAt, RESET_AT);
  assert.equal(values.get('unrelated_preference'), 'keep-me');
});

test('reset marker detection uses the primary progress slices', () => {
  const values = new Map();
  const storage = { getItem: key => values.get(key) || null };
  assert.deepEqual(PRIMARY_RESET_KEYS, ['presence_v3', 'presence_conc_v1', 'presence_omnia_v1']);
  assert.equal(hasResetMarker(storage), false);
  values.set('presence_omnia_v1', JSON.stringify({ _resetAt: RESET_AT }));
  assert.equal(hasResetMarker(storage), true);
});
