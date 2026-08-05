'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const root = path.join(__dirname, '..');
const prayerSrc = fs.readFileSync(path.join(root, 'prayer-client.js'), 'utf8');
const awarenessSrc = fs.readFileSync(path.join(root, 'awareness-client.js'), 'utf8');

// Daylight saving only exists relative to a zone, so these run in a child
// process with TZ set. Node reads TZ once per process.
function inZone(tz, body) {
  const out = execFileSync(process.execPath, ['-e', body], {
    env: Object.assign({}, process.env, { TZ: tz }),
    encoding: 'utf8'
  });
  return JSON.parse(out);
}

test('stepping back a calendar day survives a 25-hour day', () => {
  // DST ends 2026-11-01 02:00 EDT, so that Sunday runs 25 hours. In its last
  // hour, "now minus 86,400,000 ms" lands back inside the same day.
  const r = inZone('America/New_York', `
    const now = new Date(2026, 10, 1, 23, 30);
    const bySubtraction = new Date(now.getTime() - 86400000).toDateString();
    const byCalendar = (() => {
      const d = new Date(now); d.setHours(0,0,0,0); d.setDate(d.getDate() - 1);
      return d.toDateString();
    })();
    console.log(JSON.stringify({ bySubtraction, byCalendar }));
  `);
  assert.equal(r.byCalendar, 'Sat Oct 31 2026', 'the calendar step gives the real previous day');
  assert.equal(r.bySubtraction, 'Sun Nov 01 2026',
    'while subtracting 24 hours returns the day it started on — the bug this guards');
  assert.notEqual(r.bySubtraction, r.byCalendar);
});

test('the prayer streak reads yesterday by the calendar, not by 24 hours', () => {
  // Getting this wrong meant lastFullDay never matched, so a practitioner who
  // had completed every prayer the day before saw their streak quietly stall —
  // once a year, in every region that changes its clocks.
  const start = prayerSrc.indexOf('function loadPrayerState');
  const end = prayerSrc.indexOf('function savePrayerState');
  assert.ok(start > -1 && end > start);
  const block = prayerSrc.slice(start, end);
  assert.doesNotMatch(block, /Date\.now\(\) - 86400000/,
    'no fixed 24-hour subtraction may decide which day was yesterday');
  assert.match(block, /yd\.setDate\(yd\.getDate\(\) - 1\)/, 'it steps one calendar day back');
  assert.match(block, /yd\.setHours\(0, 0, 0, 0\)/, 'from midnight, so the hour cannot matter');
});

test('missed days are counted as calendar days, not elapsed 24-hour blocks', () => {
  const start = awarenessSrc.indexOf('function initIdleState');
  const end = awarenessSrc.indexOf('function currentParams');
  assert.ok(start > -1 && end > start);
  const block = awarenessSrc.slice(start, end);
  assert.doesNotMatch(block, /Math\.floor\(\(now - last\) \/ 86400000\)/,
    'the raw-timestamp floor must be gone');
  assert.match(block, /last\.setHours\(0, 0, 0, 0\)/);
  assert.match(block, /now\.setHours\(0, 0, 0, 0\)/);
  assert.match(block, /Math\.round\(\(now - last\) \/ 86400000\) - 1/,
    'both ends at midnight, rounded so a 23- or 25-hour day still reads as one');
});

test('a late session then an early open is one missed day, not none', () => {
  // 23:00 Monday to 01:00 Wednesday is 26 hours. Counting 24-hour blocks called
  // that nought days missed; Tuesday plainly was one. Independent of DST.
  const r = inZone('America/New_York', `
    const last = new Date(2026, 5, 15, 23, 0);
    const now  = new Date(2026, 5, 17, 1, 0);
    const byElapsed = Math.floor((now - last) / 86400000) - 1;
    const a = new Date(last); a.setHours(0,0,0,0);
    const b = new Date(now);  b.setHours(0,0,0,0);
    const byCalendar = Math.round((b - a) / 86400000) - 1;
    console.log(JSON.stringify({ byElapsed, byCalendar }));
  `);
  assert.equal(r.byCalendar, 1, 'Tuesday was missed');
  assert.equal(r.byElapsed, 0, 'the old form saw nothing — the bug this guards');
});

test('rounding absorbs both daylight-saving days', () => {
  const spring = inZone('America/New_York', `
    // 2026-03-08 is 23 hours long.
    const a = new Date(2026, 2, 7); a.setHours(0,0,0,0);
    const b = new Date(2026, 2, 9); b.setHours(0,0,0,0);
    console.log(JSON.stringify({
      rounded: Math.round((b - a) / 86400000),
      floored: Math.floor((b - a) / 86400000)
    }));
  `);
  assert.equal(spring.rounded, 2, 'two calendar days across a 23-hour day');
  assert.equal(spring.floored, 1, 'flooring would have lost one');

  const fall = inZone('America/New_York', `
    // 2026-11-01 is 25 hours long.
    const a = new Date(2026, 9, 31); a.setHours(0,0,0,0);
    const b = new Date(2026, 10, 2); b.setHours(0,0,0,0);
    console.log(JSON.stringify({ rounded: Math.round((b - a) / 86400000) }));
  `);
  assert.equal(fall.rounded, 2, 'two calendar days across a 25-hour day');
});

test('the shared day key is local and agrees across extreme offsets', () => {
  // Every daily boundary in the app funnels through PresenceCalendar.dayKey.
  const calendarSrc = fs.readFileSync(path.join(root, 'calendar.js'), 'utf8');
  assert.match(calendarSrc, /date\.getFullYear\(\) \+ '-' \+ pad\(date\.getMonth\(\) \+ 1\) \+ '-' \+ pad\(date\.getDate\(\)\)/,
    'built from local components, never from toISOString');
  // dateFromDayKey anchors at midday precisely so a DST shift cannot move the
  // calendar day a key represents.
  assert.match(calendarSrc, /new Date\(parts\[0\], parts\[1\] - 1, parts\[2\], 12, 0, 0, 0\)/);

  const r = inZone('Pacific/Kiritimati', `
    const d = new Date(Date.UTC(2026, 5, 15, 11, 30));
    console.log(JSON.stringify({
      local: d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0'),
      utc: d.toISOString().slice(0, 10)
    }));
  `);
  assert.equal(r.local, '2026-06-16', 'UTC+14 is already on the next local day');
  assert.equal(r.utc, '2026-06-15', 'which a UTC key would have got wrong');
});
