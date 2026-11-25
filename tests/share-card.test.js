'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.join(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'share-card-client.js'), 'utf8');

function load() {
  const context = { console };
  vm.runInNewContext(source, context, { filename:'share-card-client.js' });
  return context;
}

test('the month card leads with days practiced and carries time, sessions and streak', () => {
  const { periodCardData } = load();
  const card = periodCardData({ activeDays:12, totalSeconds:5 * 3600 + 20 * 60, sessions:31, daily:[{ key:'a', sessions:1 }] },
    'monthly', 'November 2026', 9, 'Step II · Imagination');
  assert.equal(card.headline, '12 days of practice');
  assert.equal(card.stats.map(s => s.value).join('|'), '5h 20m|31|9');
  assert.equal(card.footer, 'Step II · Imagination');
  assert.equal(card.daily.length, 1);
});

test('one day reads as singular, and short practice reads in minutes', () => {
  const { periodCardData, shareCardFmtDuration } = load();
  assert.equal(periodCardData({ activeDays:1, totalSeconds:600, sessions:1, daily:[] }, 'monthly', 'x', 0, '').headline, '1 day of practice');
  assert.equal(shareCardFmtDuration(45 * 60), '45m');
  assert.equal(shareCardFmtDuration(120 * 60), '2h');
});

test('the Practice Review screen stays free of a share button (an earlier deliberate removal)', () => {
  const presence = fs.readFileSync(path.join(root, 'presence.html'), 'utf8');
  assert.doesNotMatch(presence, /id="reportShareBtn"/);
  const streak = fs.readFileSync(path.join(root, 'streak-client.js'), 'utf8');
  assert.match(streak, /shareMonthCard\(\)/);
  const engine = fs.readFileSync(path.join(root, 'omnia-engine-client.js'), 'utf8');
  assert.match(engine, /offerStepShareCard\(next\)/);
  const sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
  assert.match(sw, /'share-card-client\.js'/);
});
