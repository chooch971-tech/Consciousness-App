'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.join(__dirname, '..');
const streakSource = fs.readFileSync(path.join(root, 'streak-client.js'), 'utf8');
const presenceSource = fs.readFileSync(path.join(root, 'presence.html'), 'utf8');

function loadGoalHelper() {
  const end = streakSource.indexOf('function streakCalendarMonthValue');
  const context = {};
  vm.runInNewContext(streakSource.slice(0, end), context, { filename: 'streak-goal-helper.js' });
  return context.streakGoalIsComplete;
}

test('an active streak commitment cannot be replaced before completion', () => {
  const isComplete = loadGoalHelper();
  assert.equal(isComplete(18, 0, 30), false);
  assert.equal(isComplete(29, 7, 30), false);
  assert.equal(isComplete(37, 7, 30), true);

  assert.doesNotMatch(streakSource, /Goal locked/);
  assert.match(streakSource, /selLabel \? '<div class="so-goal-select-label">'/);
  assert.match(streakSource, /else if \(!completedCurrent\) \{ cls \+= ' locked'; disabled = true; \}/);
  assert.match(streakSource, /if \(!streakGoalIsComplete\(streak, state\.streakGoalBaseDays \|\| 0, state\.streakCommit \|\| 7\)\) return;/);
  assert.match(presenceSource, /\.so-goal-tier\.locked \{[^}]*cursor:default;/);
});

test('completing a commitment still unlocks selection of a fresh goal', () => {
  assert.match(streakSource, /hasNextGoal \? 'Choose your next goal' : 'Commitment complete'/);
  assert.match(streakSource, /if \(streak - base >= \(state\.streakCommit \|\| 7\)\) state\.streakGoalBaseDays = streak;/);
  assert.match(streakSource, /state\.streakCommit = days;/);
});
