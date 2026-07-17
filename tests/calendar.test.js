const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const calendar = require('../calendar');
const root = path.join(__dirname, '..');

function inTimezone(timezone, callback) {
  const previous = process.env.TZ;
  process.env.TZ = timezone;
  try { callback(); }
  finally {
    if (previous == null) delete process.env.TZ;
    else process.env.TZ = previous;
  }
}

test('day keys follow the player calendar rather than UTC', () => {
  const instant = new Date('2026-07-18T00:30:00.000Z');
  inTimezone('America/New_York', () => {
    assert.equal(calendar.dayKey(instant), '2026-07-17');
    assert.equal(calendar.monthKey(instant), '2026-07');
  });
  inTimezone('Asia/Tokyo', () => {
    assert.equal(calendar.dayKey(instant), '2026-07-18');
    assert.equal(calendar.monthKey(instant), '2026-07');
  });
});

test('calendar arithmetic survives daylight-saving transitions', () => {
  inTimezone('America/New_York', () => {
    assert.equal(calendar.addDays('2026-03-08', 1), '2026-03-09');
    assert.equal(calendar.addDays('2026-11-01', 1), '2026-11-02');
    assert.equal(calendar.weekKey(new Date(2026, 2, 11, 23, 30)), 'w-2026-03-08');
  });
});

test('existing canonical day keys are timezone-independent', () => {
  inTimezone('America/Los_Angeles', () => {
    assert.equal(calendar.dayKey('2026-07-17'), '2026-07-17');
    assert.equal(calendar.monthKey('2026-07-17'), '2026-07');
    assert.equal(calendar.dayKey(calendar.dateFromDayKey('2026-07-17')), '2026-07-17');
  });
});

test('server offset helpers mirror client-local report periods', () => {
  const instant = new Date('2026-07-18T00:30:00.000Z');
  assert.equal(calendar.dayKeyAtOffset(instant, -240), '2026-07-17');
  assert.equal(calendar.dayKeyAtOffset(instant, 540), '2026-07-18');
  assert.equal(calendar.weekKeyAtOffset(instant, -240), 'w-2026-07-12');
  assert.equal(calendar.monthKeyAtOffset(instant, -240), '2026-07');
});

test('all gameplay day consumers load after the shared calendar', () => {
  const presence = fs.readFileSync(path.join(root, 'presence.html'), 'utf8');
  const serviceWorker = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
  const server = fs.readFileSync(path.join(root, 'server.js'), 'utf8');
  const calendarTag = presence.indexOf('<script src="calendar.js"></script>');

  assert.ok(calendarTag >= 0);
  assert.ok(calendarTag < presence.indexOf('<script src="sync-contract.js"></script>'));
  assert.match(serviceWorker, /['"]calendar\.js['"]/);
  assert.match(server, /require\('\.\/calendar'\)/);
  assert.match(server, /context && context\.utcOffsetMinutes/);
});
