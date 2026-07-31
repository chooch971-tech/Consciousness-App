'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { mergeHistoryValues } = require('../sync-merge');

const source = fs.readFileSync(path.join(__dirname, '..', 'streak-client.js'), 'utf8');
const calendarSource = source.slice(0, source.indexOf('function showStreakScreen'));

class FixedDate extends Date {
  constructor(value, month, day) {
    if (arguments.length >= 2) super(value, month, day);
    else super(value === undefined ? '2026-07-31T12:00:00' : value);
  }
}

function dayKey(value) {
  const date = value instanceof Date ? value : new FixedDate(value);
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0')
  ].join('-');
}

function loadCalendar(state) {
  let saves = 0;
  const context = {
    state,
    Date: FixedDate,
    presenceDayKey: value => dayKey(value === undefined ? new FixedDate() : value),
    presenceDateFromDayKey: key => {
      const parts = key.split('-').map(Number);
      return new FixedDate(parts[0], parts[1] - 1, parts[2]);
    },
    saveState: () => { saves += 1; }
  };
  vm.runInNewContext(calendarSource, context, { filename: 'streak-calendar.js' });
  context.saveCount = () => saves;
  return context;
}

test('calendar statistics are scoped to the displayed month', () => {
  const julyPractice = Array.from({ length: 31 }, (_, index) => '2026-07-' + String(index + 1).padStart(2, '0'))
    .filter(key => key !== '2026-07-25' && key !== '2026-07-26');
  const context = loadCalendar({
    practicedDates: julyPractice.concat(['2026-06-30']),
    frozenDates: ['2026-07-25', '2026-06-29'],
    freezesUsed: 10,
    streakStartDate: '2026-07-23'
  });

  const html = context.buildStreakCalendar(2026, 6, 7);
  assert.match(html, /so-cal-stat-val">29<\/div><div class="so-cal-stat-lbl">✓ Practiced/);
  assert.match(html, /so-cal-stat-val">1<\/div><div class="so-cal-stat-lbl">❄ Freezes used/);
  assert.doesNotMatch(html, /so-cal-stat-val">10<\/div><div class="so-cal-stat-lbl">❄ Freezes used/);
});

test('calendar navigation runs from first recorded use through next month only', () => {
  const state = {
    practicedDates: ['2026-05-18', '2026-07-31'],
    frozenDates: [],
    streakStartDate: '2026-07-23'
  };
  const context = loadCalendar(state);

  const may = context.buildStreakCalendar(2026, 4, 7);
  const july = context.buildStreakCalendar(2026, 6, 7);
  const august = context.buildStreakCalendar(2026, 7, 7);
  assert.match(may, /aria-label="Previous month" disabled/);
  assert.doesNotMatch(may, /aria-label="Next month" disabled/);
  assert.doesNotMatch(july, /aria-label="Next month" disabled/);
  assert.match(august, /aria-label="Next month" disabled/);
  assert.equal(state.streakCalendarStartDate, '2026-05-18');
  assert.equal(context.saveCount(), 1);
});

test('cloud merging preserves the earliest known calendar beginning', () => {
  const merged = mergeHistoryValues('presence_v3', [
    { xp: 50, history: [], practicedDates: ['2026-07-01'], frozenDates: [], streakCalendarStartDate: '2026-07-01' },
    { xp: 50, history: [], practicedDates: ['2026-05-18'], frozenDates: [], streakCalendarStartDate: '2026-05-18' }
  ]);
  assert.equal(merged.streakCalendarStartDate, '2026-05-18');
});
