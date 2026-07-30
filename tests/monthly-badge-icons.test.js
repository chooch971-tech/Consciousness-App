'use strict';

const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

const achievements = fs.readFileSync(path.join(__dirname, '..', 'achievements-client.js'), 'utf8');
const profile = fs.readFileSync(path.join(__dirname, '..', 'profile-client.js'), 'utf8');

test('monthly achievement families have distinct semantic icons', () => {
  ['mlogin', 'mfifteen', 'mspend', 'mfriend'].forEach(function(group) {
    assert.match(achievements, new RegExp('\\n  ' + group + ": '<"));
  });
  assert.match(achievements, /gid === 'monthly' && badge && ACH_ICONS\[badge\.group\]/);
});

test('monthly badges select icons from their individual achievement data on every profile', () => {
  // The Monthly Badges screen passes a badge so its family icon renders.
  assert.match(achievements, /achIconSvg\('monthly', shown\)/);
  // Own profile earned + own profile pending (dimmed doorway) + friend profile.
  assert.equal((profile.match(/achIconSvg\('monthly', b\)/g) || []).length, 3);
});

test('Days Present can never fall below the practice calendar it should exceed', () => {
  const achievements = fs.readFileSync(path.join(__dirname, '..', 'achievements-client.js'), 'utf8');
  const start = achievements.indexOf('function achTouchLogin');
  const end = achievements.indexOf('function achRemaster', start);
  const handler = achievements.slice(start, end);
  // A day with a completed session is a day the app was open, so the badge
  // folds in this month's practicedDates — the same list the streak calendar
  // draws, and one the cloud merge does union.
  assert.match(handler, /practicedDates/);
  assert.match(handler, /achState\.monthly\.key \+ '-'/);
  // Frozen days are spent automatically and imply no app open.
  assert.doesNotMatch(handler, /frozenDates/);
});
