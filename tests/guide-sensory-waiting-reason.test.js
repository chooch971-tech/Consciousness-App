'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const guideSource = fs.readFileSync(path.join(root, 'guide-path-client.js'), 'utf8');

function sensoryRowBlock() {
  const start = guideSource.indexOf('function sensoryRow(stage)');
  const end = guideSource.indexOf('var visualStages =');
  assert.ok(start > -1 && end > start, 'sensoryRow must still be here');
  return guideSource.slice(start, end);
}

test('a waiting stage says which of the three reasons applies', () => {
  // "Waiting" on its own answers nothing. The three cases are: the foundation
  // it waits on was removed from the path, so nothing here can ever advance;
  // the hold for this stage is already banked and only waits to be credited;
  // or the prior foundation genuinely has not reached its hold yet.
  const block = sensoryRowBlock();
  assert.match(block, /is not on your path, so this cannot advance/);
  assert.match(block, /already clears 5:00 — it counts once/);
  assert.match(block, /Omnia recommends this after/);
});

test('the removed check reads the removal flag, not the day\'s card list', () => {
  // The curriculum only ever surfaces its current stage, so Auditory is
  // legitimately off the path while Visualization is still being trained.
  // Reading the card list told every practitioner their curriculum was broken.
  const block = guideSource.slice(guideSource.indexOf('function stageOnPath(stage)'),
                                 guideSource.indexOf('function sensoryRow(stage)'));
  assert.match(block, /guideState\.removed/, 'must consult the explicit removal flag');
  assert.doesNotMatch(block, /guideProgressCardIds/, 'must not infer removal from today\'s cards');
});

test('an unknown state never claims a foundation was removed', () => {
  const block = guideSource.slice(guideSource.indexOf('function stageOnPath(stage)'),
                                 guideSource.indexOf('function sensoryRow(stage)'));
  // Missing guideState must read as "on the path", not as removed.
  assert.match(block, /\|\|\s*\{\}/, 'a missing removal map defaults to nothing removed');
});

test('the banked-hold wording only fires once the goal is actually cleared', () => {
  const block = sensoryRowBlock();
  assert.match(block, /stage\.bestCleanSec >= GUIDE_SENSORY_CLEAN_GOAL_SEC/,
    'must compare against the real clean-hold goal');
});
