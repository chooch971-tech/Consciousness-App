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

test('no sensory row is described as blocked any more', () => {
  // "Waiting" was gate language from when a gap in the sequence voided every
  // stage behind it. With mastery earned per stage, nothing is blocked, and a
  // row can no longer wait on a foundation removed from the path — a state the
  // practitioner had no way to act on from that screen.
  const block = sensoryRowBlock();
  assert.doesNotMatch(block, /'Waiting'/, 'no row may be labelled Waiting');
  assert.doesNotMatch(block, /is not on your path, so this cannot advance/);
  assert.doesNotMatch(block, /it counts once .* is mastered/);
});

test('an unreached stage says it can be practised whenever', () => {
  const block = sensoryRowBlock();
  assert.match(block, /'Later'/, 'stages behind the recommendation read as Later');
  assert.match(block, /'Next'/, 'the next one up still reads as Next');
  assert.match(block, /practise this any time/i,
    'must say the stage is reachable, not gated');
  assert.match(block, /clean 5:00 hold masters it/,
    'and name what actually earns it');
});

test('mastery is earned per stage, not chained', () => {
  const block = guideSource.slice(guideSource.indexOf('function guideSensoryTrackProgress'),
                                  guideSource.indexOf('function guideSensoryStageForToday'));
  assert.doesNotMatch(block, /chainOpen/, 'the chain gate must be gone');
  assert.doesNotMatch(block, /priorMasteryMs/, 'and its prior-mastery clock with it');
  assert.match(block, /stage\.mastered = !!earned/, 'a stage is mastered by its own hold');
});

test('the recommendation still walks Bardon order', () => {
  // Free order is about what counts, not about what Omnia suggests: it must
  // still point at the first unmastered stage in sequence.
  const block = guideSource.slice(guideSource.indexOf('function guideSensoryTrackProgress'),
                                  guideSource.indexOf('function guideSensoryStageForToday'));
  assert.match(block, /findIndex\(function\(stage\) \{ return !stage\.mastered; \}\)/,
    'current is the first unmastered stage in order');
});
