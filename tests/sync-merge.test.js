'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  HISTORY_MERGE,
  isHistoryKey,
  mergeHistoryValues,
  mergeGiftPathValues
} = require('../sync-merge');

test('history merge unions sessions and keeps monotonic concentration fields', () => {
  const cloud = {
    xp: 100,
    totalSessions: 2,
    bestSeconds: 45,
    level: 2,
    clockTheme: 'moon',
    history: [{ date: '2026-07-10T10:00:00.000Z', seconds: 45 }]
  };
  const local = {
    xp: 140,
    totalSessions: 3,
    bestSeconds: 30,
    level: 3,
    history: [{ date: '2026-07-11T10:00:00.000Z', seconds: 30 }]
  };

  const merged = mergeHistoryValues('presence_conc_v1', [cloud, local]);

  assert.equal(merged.xp, 140);
  assert.equal(merged.totalSessions, 3);
  assert.equal(merged.bestSeconds, 45);
  assert.equal(merged.level, 3);
  assert.equal(merged.clockTheme, 'moon');
  assert.deepEqual(merged.history.map(entry => entry.date), [
    '2026-07-11T10:00:00.000Z',
    '2026-07-10T10:00:00.000Z'
  ]);
  assert.equal(local.clockTheme, undefined, 'merge must not mutate its input');
});

test('history merge never crosses a deliberate reset boundary', () => {
  const stale = {
    xp: 5000,
    totalSessions: 90,
    history: [{ date: '2026-06-01T10:00:00.000Z' }]
  };
  const reset = {
    _resetAt: 1783915200000,
    xp: 0,
    totalSessions: 0,
    level: 1,
    history: []
  };

  const merged = mergeHistoryValues('presence_conc_v1', [stale, reset]);

  assert.equal(merged._resetAt, reset._resetAt);
  assert.equal(merged.xp, 0);
  assert.deepEqual(merged.history, []);
});

test('history merge uses input order only to resolve equal-score preferences', () => {
  const first = { xp: 20, label: 'first', history: [] };
  const second = { xp: 20, label: 'second', history: [] };

  assert.equal(mergeHistoryValues('presence_v3', [first, second]).label, 'first');
  assert.equal(mergeHistoryValues('presence_v3', [second, first]).label, 'second');
  assert.equal(isHistoryKey('presence_conc_v1'), true);
  assert.equal(isHistoryKey('presence_giftpath_v1'), false);
  assert.deepEqual(Object.keys(HISTORY_MERGE).sort(), ['presence_conc_v1', 'presence_v3']);
});

test('Gift Path merge unions same-month progress and completed months', () => {
  const a = {
    cleared: ['2026-05'],
    month: '2026-07',
    started: true,
    startDate: '2026-07-03',
    claimed: [true, false, false, false, false, false, false],
    done: { clock: true }
  };
  const b = {
    cleared: ['2026-06'],
    month: '2026-07',
    startDate: '2026-07-01',
    claimed: [false, true, false, false, false, false, false],
    done: { visualization: true }
  };

  const merged = mergeGiftPathValues([a, b]);

  assert.deepEqual(merged.cleared, ['2026-05', '2026-06']);
  assert.equal(merged.month, '2026-07');
  assert.equal(merged.started, true);
  assert.equal(merged.startDate, '2026-07-01');
  assert.deepEqual(merged.claimed, [true, true, false, false, false, false, false]);
  assert.deepEqual(merged.done, { clock: true, visualization: true });
});

test('Gift Path merge keeps only the newest month run', () => {
  const oldMonth = {
    cleared: ['2026-05'],
    month: '2026-06',
    claimed: [true, true, true, false, false, false, false],
    done: { clock: true }
  };
  const newMonth = {
    cleared: ['2026-06'],
    month: '2026-07',
    claimed: [false, false, false, false, false, false, false],
    done: {}
  };

  const merged = mergeGiftPathValues([oldMonth, newMonth], { inferStartDate: true });

  assert.deepEqual(merged.cleared, ['2026-05', '2026-06']);
  assert.equal(merged.month, '2026-07');
  assert.deepEqual(merged.claimed, [false, false, false, false, false, false, false]);
  assert.deepEqual(merged.done, {});
  assert.equal(merged.startDate, '2026-07-01');
});

test('Gift Path merge honors reset markers and is order-independent for progress', () => {
  const stale = {
    cleared: ['2026-04', '2026-05'],
    month: '2026-07',
    claimed: [true, true, true, true, true, true, true]
  };
  const reset = {
    _resetAt: 1783915200000,
    cleared: [],
    month: '2026-07',
    claimed: [false, true, false, false, false, false, false]
  };
  const resetPeer = {
    _resetAt: 1783915200000,
    cleared: ['2026-06'],
    month: '2026-07',
    claimed: [true, false, false, false, false, false, false]
  };

  const forward = mergeGiftPathValues([stale, reset, resetPeer]);
  const reverse = mergeGiftPathValues([resetPeer, reset, stale]);

  assert.deepEqual(forward, reverse);
  assert.equal(forward._resetAt, reset._resetAt);
  assert.deepEqual(forward.cleared, ['2026-06']);
  assert.deepEqual(forward.claimed, [true, true, false, false, false, false, false]);
});
