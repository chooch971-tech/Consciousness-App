'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.join(__dirname, '..');
const guideSource = fs.readFileSync(path.join(root, 'guide-path-client.js'), 'utf8');

// Pulls the two selectors out of guide-path-client.js and runs them against a
// stubbed curriculum, so the precedence rule is exercised rather than restated.
function loadSelectors(progress) {
  const start = guideSource.indexOf('function guideCurrentSenseMode(');
  const end = guideSource.indexOf('// Senses is held to its own');
  assert.ok(start > -1 && end > start, 'selectors must still live together');
  const context = {
    GUIDE_SENSE_ORDER: ['feeling', 'smell', 'taste'],
    GUIDE_SENSE_MODES: { feeling: 1, smell: 1, taste: 1 },
    guideLeastRecentSenseMode: () => 'taste',
    guideSensoryTrackProgress: () => progress
  };
  vm.runInNewContext(guideSource.slice(start, end), context, { filename: 'sense-selectors.js' });
  return context;
}

const stats = (over) => Object.assign(
  { feeling: { bestSec: 0 }, smell: { bestSec: 0 }, taste: { bestSec: 0 } }, over);

test('a live curriculum stage outranks the rotation', () => {
  // The reported case: long Feeling sits (bestSec 700) with no clean 5:00 hold.
  // The rotation advances on a 10-minute best and had jumped to Smell; the
  // curriculum advances only on the clean hold and is still on Feeling.
  const ctx = loadSelectors({ complete: false, current: { mode: 'feeling', eyesMode: 'closed' } });
  const s = stats({ feeling: { bestSec: 700 } });
  assert.equal(ctx.guideCurrentSenseMode(s), 'smell', 'the rotation still says smell');
  assert.equal(ctx.guideActiveSenseMode(s), 'feeling', 'the curriculum wins while it runs');
});

test('a finished curriculum hands back to the rotation', () => {
  const ctx = loadSelectors({ complete: true, current: { mode: 'feeling', eyesMode: 'closed' } });
  const s = stats({ feeling: { bestSec: 700 } });
  assert.equal(ctx.guideActiveSenseMode(s), 'smell');
});

test('a non-sense curriculum stage does not hijack the sense label', () => {
  // Visualization and Auditory are curriculum stages too, but they are not
  // sense faculties — the override must not report them as one.
  for (const current of [{ exercise: 'visual', eyesMode: 'closed' },
                         { exercise: 'auditory', eyesMode: 'open' },
                         { mode: undefined, eyesMode: 'closed' }]) {
    const ctx = loadSelectors({ complete: false, current });
    assert.equal(ctx.guideActiveSenseMode(stats()), 'feeling',
      'falls through to the rotation for ' + JSON.stringify(current));
  }
});

test('a missing or throwing curriculum falls back rather than breaking', () => {
  assert.equal(loadSelectors(null).guideActiveSenseMode(stats()), 'feeling');
  assert.equal(loadSelectors({ complete: false, current: null }).guideActiveSenseMode(stats()), 'feeling');
  const thrower = loadSelectors(null);
  thrower.guideSensoryTrackProgress = () => { throw new Error('boom'); };
  assert.equal(thrower.guideActiveSenseMode(stats()), 'feeling');
});

test('every sense-mode resolution goes through the curriculum-aware selector', () => {
  // Three call sites read this: the duration seed, the Progress intro label,
  // and the recommended-exercise card. If one keeps using the raw rotation the
  // panel and the card disagree again.
  const calls = guideSource.match(/senseModeForced \|\| guide\w+SenseMode\(/g) || [];
  assert.ok(calls.length >= 3, 'expected all three call sites');
  for (const call of calls) {
    assert.match(call, /guideActiveSenseMode\($/, 'call site still on the raw rotation: ' + call);
  }
});
