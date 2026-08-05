'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.join(__dirname, '..');
const streakSource = fs.readFileSync(path.join(root, 'streak-client.js'), 'utf8');
const presenceSource = fs.readFileSync(path.join(root, 'presence.html'), 'utf8');

function loadGoalHelpers(economyState) {
  const end = streakSource.indexOf('function streakCalendarMonthValue');
  const context = { omniaState:economyState };
  vm.runInNewContext(streakSource.slice(0, end), context, { filename: 'streak-goal-helper.js' });
  return context;
}

test('streak commitments are absolute milestones from day one', () => {
  const { streakGoalIsComplete:isComplete } = loadGoalHelpers();
  assert.equal(isComplete(18, 30), false);
  assert.equal(isComplete(29, 30), false);
  assert.equal(isComplete(30, 30), true);
  assert.equal(isComplete(45, 45), true);

  assert.doesNotMatch(streakSource, /Goal locked/);
  assert.match(streakSource, /selLabel \? '<div class="so-goal-select-label">'/);
  assert.match(streakSource, /else if \(!completedCurrent\) \{ cls \+= ' locked'; disabled = true; \}/);
  assert.match(streakSource, /if \(!streakGoalIsComplete\(streak, state\.streakCommit \|\| 7\)\) return;/);
  assert.doesNotMatch(streakSource, /streak\s*-\s*base/);
  assert.doesNotMatch(streakSource, /sd\.getDate\(\) \+ \(state\.streakGoalBaseDays/);
  assert.match(presenceSource, /\.so-goal-tier\.locked \{[^}]*cursor:default;/);
});

test('the first ladder finishes at day 45 and unlocks the long vigil', () => {
  const helpers = loadGoalHelpers();
  assert.deepEqual(Array.from(helpers.STREAK_STARTER_COMMITS, c => c.days), [7, 14, 30, 45]);
  assert.deepEqual(Array.from(helpers.STREAK_LONG_COMMITS, c => c.days), [45, 75, 120, 180]);
  assert.deepEqual(Array.from(helpers.streakVisibleCommits(44), c => c.days), [7, 14, 30, 45]);
  assert.deepEqual(Array.from(helpers.streakVisibleCommits(45), c => c.days), [45, 75, 120, 180]);
  assert.match(streakSource, /hasNextGoal \? 'Choose your next milestone' : 'All milestones complete'/);
  assert.match(streakSource, /Complete each milestone to earn its reward/);
  assert.match(streakSource, /if \(!days \|\| days <= streak\) return;/);
  assert.match(streakSource, /state\.streakCommit = days;/);
});

test('every crossed milestone rewards once even when a later goal is selected', () => {
  const helpers = loadGoalHelpers();
  assert.deepEqual(Array.from(helpers.streakUnawardedMilestones(45, []), c => c.days), [7, 14, 30, 45]);
  assert.deepEqual(Array.from(helpers.streakUnawardedMilestones(45, [7, 14, 30]), c => c.days), [45]);
  assert.deepEqual(Array.from(helpers.streakUnawardedMilestones(74, [7, 14, 30, 45]), c => c.days), []);
  assert.deepEqual(Array.from(helpers.streakUnawardedMilestones(75, [7, 14, 30, 45]), c => c.days), [75]);
  assert.match(streakSource, /earned from the live streak/);
});

test('milestone Akasha scales with current Step and prestige', () => {
  const base = loadGoalHelpers({ bardonStep:1, prestige:0 });
  const stepTen = loadGoalHelpers({ bardonStep:10, prestige:0 });
  const prestiged = loadGoalHelpers({ bardonStep:10, prestige:3 });
  const milestone = base.STREAK_COMMITS.find(c => c.days === 45);
  assert.equal(base.streakMilestoneReward(milestone).akasha, 18000);
  assert.ok(stepTen.streakMilestoneReward(milestone).akasha > 18000);
  assert.ok(prestiged.streakMilestoneReward(milestone).akasha > stepTen.streakMilestoneReward(milestone).akasha);
});

test('existing additive saves migrate without duplicate retroactive rewards', () => {
  assert.match(streakSource, /STREAK_STARTER_COMMITS\.map/);
  const awarenessSource = fs.readFileSync(path.join(root, 'awareness-client.js'), 'utf8');
  assert.match(awarenessSource, /function migrateAbsoluteStreakMilestones\(\)/);
  assert.match(awarenessSource, /c\.days <= \(state\.streak \|\| 0\)/);
  assert.match(awarenessSource, /state\.streakGoalBaseDays = 0/);
  assert.match(awarenessSource, /streakUnawardedMilestones\(state\.streak, state\.streakMilestonesAwarded\)/);
});
