'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const guideSource = fs.readFileSync(path.join(root, 'guide-path-client.js'), 'utf8');

function sensoryCardBlock() {
  const start = guideSource.indexOf('function sensoryLengthCard(stages');
  const end = guideSource.indexOf('// Progress describes the ladders behind');
  assert.ok(start > -1 && end > start, 'the sensory Progress cards must still be here');
  return guideSource.slice(start, end);
}

test('no sensory row is described as blocked or pending', () => {
  // "Waiting" was gate language from when a gap in the sequence voided every
  // stage behind it. With mastery earned per stage, nothing is blocked, and a
  // row can no longer wait on a foundation removed from the path — a state the
  // practitioner had no way to act on from that screen.
  const block = sensoryCardBlock();
  assert.doesNotMatch(block, /'Waiting'/, 'no row may be labelled Waiting');
  assert.doesNotMatch(block, /'Later'/, 'nor deferred to Later');
  assert.doesNotMatch(block, /is not on your path, so this cannot advance/);
  assert.doesNotMatch(block, /it counts once .* is mastered/);
});

test('all three sensory cards report session length, like Clock and Asana', () => {
  const block = sensoryCardBlock();
  // One builder, so Visualization, Auditory and Senses cannot drift apart.
  assert.match(block, /sensoryLengthCard\(visualStages/, 'Visualization uses it');
  assert.match(block, /sensoryLengthCard\(auditoryStages/, 'Auditory uses it');
  assert.match(block, /sensoryLengthCard\(senseStages/, 'Senses uses it');
  assert.match(block, /label:'Session length'/, 'and the row is the session length');
  // The old shape counted foundations in the collapsed header instead of
  // naming the length, which is the number the practitioner acts on.
  assert.doesNotMatch(block, /' \/ 2 foundations'/, 'no foundation tally as the summary');
  assert.match(block, /summary:min \+ ' min recommended'/,
    'the summary states the recommended length');
});

test('the mastery sequence is stated in the footer, not as a row per stage', () => {
  const block = sensoryCardBlock();
  assert.match(block, /'Training ' \+ stage\.label/, 'the footer names what is being trained');
  assert.match(block, /foundations mastered/, 'and how many are done');
  assert.match(block, /Next in sequence: /, 'and what follows');
  assert.doesNotMatch(block, /stages\.map\(/, 'no per-stage row list any more');
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
