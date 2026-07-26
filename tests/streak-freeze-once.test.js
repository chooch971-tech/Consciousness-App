'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.join(__dirname, '..');
const awarenessSource = fs.readFileSync(path.join(root, 'awareness-client.js'), 'utf8');
const streakSource = fs.readFileSync(path.join(root, 'streak-client.js'), 'utf8');

class FixedDate extends Date {
  constructor(value) {
    super(value === undefined ? '2026-07-26T12:00:00' : value);
  }
}

function dayKey(value) {
  const date = value instanceof Date ? value : new Date(value);
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0')
  ].join('-');
}

function loadStreakCheck(state) {
  const calendarStart = awarenessSource.indexOf('function _streakISO');
  const calendarEnd = awarenessSource.indexOf('// One-time repair for streaks');
  const checkStart = awarenessSource.indexOf('function syncStreakFromCalendar');
  const checkEnd = awarenessSource.indexOf('// Re-check whenever the app is resumed');
  const scheduled = [];
  const context = {
    state,
    Date: FixedDate,
    presenceDayKey: dayKey,
    document:{ getElementById:() => null },
    backfillPracticedDates:() => {},
    migratePracticedDatesToLocal:() => {},
    reconcileLegacyStreak:() => {},
    migrateStreakGoalBase:() => {},
    saveState:() => {},
    showStreakEndedPrompt:() => {},
    showStreakFrozenPrompt:() => {},
    setTimeout:fn => { scheduled.push(fn); return scheduled.length; }
  };
  vm.runInNewContext(
    awarenessSource.slice(calendarStart, calendarEnd)
      + awarenessSource.slice(checkStart, checkEnd),
    context,
    { filename:'streak-calendar-check.js' }
  );
  return context;
}

test('one freeze permanently covers one missed calendar day across repeated startup checks', () => {
  const state = {
    streak:5,
    lastSessionDate:'2026-07-24T18:00:00',
    streakFreezes:1,
    freezesUsed:0,
    practicedDates:['2026-07-20','2026-07-21','2026-07-22','2026-07-23','2026-07-24'],
    frozenDates:[],
    endedStreakInfo:null,
    frozenStreakInfo:null,
    frozenPromptShown:false
  };
  const context = loadStreakCheck(state);

  context.checkStreakStatus();
  assert.deepEqual(Array.from(state.frozenDates), ['2026-07-25']);
  assert.equal(state.streakFreezes, 0);
  assert.equal(state.freezesUsed, 1);
  assert.equal(state.endedStreakInfo, null);
  assert.equal(state.frozenStreakInfo.eventKey, 'freeze:2026-07-25');

  context.checkStreakStatus();
  assert.deepEqual(Array.from(state.frozenDates), ['2026-07-25']);
  assert.equal(state.streakFreezes, 0, 'reopening must not spend another freeze');
  assert.equal(state.freezesUsed, 1);
  assert.equal(state.endedStreakInfo, null, 'a covered day must not later end the streak');
  assert.equal(state.streak, 6);
});

test('a stale ended prompt is cleared when every missed day is already frozen', () => {
  const state = {
    streak:6,
    lastSessionDate:'2026-07-24T18:00:00',
    streakFreezes:0,
    freezesUsed:1,
    practicedDates:['2026-07-20','2026-07-21','2026-07-22','2026-07-23','2026-07-24'],
    frozenDates:['2026-07-25'],
    endedStreakInfo:{ days:5, missed:1, freezes:0 },
    streakEndedPromptShown:false,
    frozenStreakInfo:null,
    frozenPromptShown:true
  };
  const context = loadStreakCheck(state);
  context.checkStreakStatus();
  assert.equal(state.endedStreakInfo, null);
  assert.equal(state.streak, 6);
});

test('the held animation consumes and remembers its event before rendering', () => {
  assert.match(streakSource, /state\.lastFrozenPromptKey = eventKey/);
  assert.match(streakSource, /state\.frozenStreakInfo = null;\s*state\.frozenPromptShown = true/);
  assert.match(streakSource, /state\.frozenPromptShown = true;\s*state\.frozenStreakInfo = null;\s*saveState\(\)/);
});
