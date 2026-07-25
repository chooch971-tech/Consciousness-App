'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  HISTORY_MERGE,
  isHistoryKey,
  mergeHistoryValues,
  mergeGiftPathValues,
  mergePracticeReviewValues,
  mergeGuideValues
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

test('history merge unions practicedDates/frozenDates instead of losing them to a stale base', () => {
  // Reproduces the reported bug: a stale cloud snapshot (equal or higher xp,
  // so it wins as `base`) is missing several weeks of practicedDates that the
  // local device recorded since the last successful push. Since state.streak
  // is recomputed from practicedDates on every load, silently inheriting only
  // `base`'s dates would collapse a long unbroken streak back down to
  // whatever the stale snapshot happened to cover.
  const localDates = [];
  for (let d = 1; d <= 17; d++) localDates.push('2026-07-' + String(d).padStart(2, '0'));
  for (let d = 1; d <= 30; d++) localDates.push('2026-06-' + String(d).padStart(2, '0'));

  const cloud = {
    xp: 500,
    totalSessions: 40,
    streak: 30,
    practicedDates: localDates.slice(0, 30), // only June — hasn't synced July yet
    frozenDates: [],
    history: []
  };
  const local = {
    xp: 500, // tied — base selection falls to candidate order, cloud first
    totalSessions: 47,
    streak: 47,
    practicedDates: localDates, // full 47-day unbroken run through July 17
    frozenDates: ['2026-06-15'],
    history: []
  };

  const merged = mergeHistoryValues('presence_v3', [cloud, local]);

  assert.equal(merged.practicedDates.length, 47, 'union must keep every practiced day from both sides');
  assert.ok(merged.practicedDates.includes('2026-07-17'), 'must not lose the most recent local days');
  assert.ok(merged.practicedDates.includes('2026-06-01'), 'must not lose older cloud-only days either');
  assert.deepEqual(merged.practicedDates, [...merged.practicedDates].sort(), 'must stay sorted ascending');
  assert.deepEqual(merged.frozenDates, ['2026-06-15']);
  assert.equal(merged.streak, 47, 'the raw streak number itself is still max-merged as before');
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

test('Practice Review merge unions same-day events and plan completion across devices', () => {
  const cloud = {
    version:1,
    days:{'2026-07-21':{events:{a:{p:'awareness',s:600,v:0}},plan:{assigned:['clock','visual'],completed:['clock']}}}
  };
  const local = {
    version:1,
    days:{'2026-07-21':{events:{b:{p:'clock',s:180,v:60}},plan:{assigned:['clock','visual'],completed:['visual']}}}
  };
  const merged = mergePracticeReviewValues([cloud,local]);
  assert.deepEqual(Object.keys(merged.days['2026-07-21'].events).sort(),['a','b']);
  assert.deepEqual(merged.days['2026-07-21'].plan.assigned,['clock','visual']);
  assert.deepEqual(merged.days['2026-07-21'].plan.completed,['clock','visual']);
});

test('Practice Review merge respects Reset All boundaries', () => {
  const stale={days:{'2026-07-20':{events:{a:{p:'clock',s:60,v:60}}}}};
  const reset={_resetAt:1784650000000,days:{}};
  const merged=mergePracticeReviewValues([stale,reset]);
  assert.deepEqual(merged.days,{});
  assert.equal(merged._resetAt,reset._resetAt);
});

test('Practice Review merge keeps the furthest lifetime archive without recounting its days', () => {
  const older = {
    archive:{through:'2023-01-01',sessions:12,totalSeconds:720},
    days:{'2023-01-02':{events:{a:{p:'clock',s:60,v:30}}}}
  };
  const newer = {
    archive:{through:'2023-01-02',sessions:13,totalSeconds:780},
    days:{'2023-01-03':{events:{b:{p:'thought',s:60,v:20}}}}
  };
  const merged=mergePracticeReviewValues([older,newer]);
  assert.equal(merged.archive.through,'2023-01-02');
  assert.equal(merged.archive.sessions,13);
  assert.deepEqual(Object.keys(merged.days),['2023-01-03']);
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

test('guide merge keeps routine activity newest without reviving stale cadence', () => {
  const staleCadenceWithNewActivity = {
    _updatedAt: 300,
    _cadenceUpdatedAt: 100,
    _exRounds: { asana: 2 },
    _dailyPick: { day: '2026-07-24', ids: ['asana'] }
  };
  const explicitOnePerDay = {
    _updatedAt: 200,
    _cadenceUpdatedAt: 200,
    _exRounds: { asana: 1 },
    _dailyPick: { day: '2026-07-23', ids: ['clock'] }
  };

  const merged = mergeGuideValues([staleCadenceWithNewActivity, explicitOnePerDay]);
  assert.deepEqual(merged._dailyPick, staleCadenceWithNewActivity._dailyPick);
  assert.equal(merged._exRounds.asana, 1);
  assert.equal(merged._cadenceUpdatedAt, 200);
});

test('guide merge preserves an explicit global cadence reset', () => {
  const priorOverride = {
    _updatedAt: 300,
    _cadenceUpdatedAt: 200,
    _twoADayV1: true,
    _exRounds: { asana: 1 }
  };
  const globalOnePerDay = {
    _updatedAt: 250,
    _cadenceUpdatedAt: 250,
    _twoADayV1: false,
    _exRounds: {}
  };

  const merged = mergeGuideValues([priorOverride, globalOnePerDay]);
  assert.equal(merged._twoADayV1, false);
  assert.deepEqual(merged._exRounds, {});
});

test('guide merge honors legacy explicit cadence via its guide timestamp', () => {
  const newerDefaultActivity = { _updatedAt: 300, _dailyPick: { day: '2026-07-24' } };
  const legacyExplicit = { _updatedAt: 200, _exRounds: { asana: 1 } };

  const merged = mergeGuideValues([newerDefaultActivity, legacyExplicit]);
  assert.equal(merged._exRounds.asana, 1);
  assert.equal(merged._cadenceUpdatedAt, 200);
});
