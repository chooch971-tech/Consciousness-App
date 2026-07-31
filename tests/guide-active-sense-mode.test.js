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
  const start = guideSource.indexOf('function guideRecentSenseMode(');
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

test('recommendation sites ask what is next; the label asks what is happening', () => {
  // Two different questions, two different selectors, on purpose.
  // guideActiveSenseMode answers "what should be practised next" and drives the
  // duration seed and the recommended card. guideRecentSenseMode answers "what
  // is this card actually training" and only labels a mode-less Senses item.
  const calls = guideSource.match(/senseModeForced \|\| guide\w+SenseMode\(/g) || [];
  assert.equal(calls.length, 3, 'expected exactly three resolution sites');
  const active = calls.filter((c) => /guideActiveSenseMode\($/.test(c)).length;
  const recent = calls.filter((c) => /guideRecentSenseMode\($/.test(c)).length;
  assert.equal(active, 2, 'duration seed + recommended card use the curriculum-aware selector');
  assert.equal(recent, 1, 'only the Progress label reads recent practice');
  assert.equal(active + recent, calls.length, 'no site may use the raw rotation');
});

test('the most-recent selector reports what was actually practised', () => {
  const ctx = loadSelectors({ complete: false, current: { mode: 'feeling', eyesMode: 'closed' } });
  assert.equal(ctx.guideRecentSenseMode({
    feeling: { count: 23, lastMs: 5000 },
    smell: { count: 0, lastMs: 0 },
    taste: { count: 0, lastMs: 0 }
  }), 'feeling');
  // Newest wins, not most-practised.
  assert.equal(ctx.guideRecentSenseMode({
    feeling: { count: 23, lastMs: 5000 },
    smell: { count: 1, lastMs: 9000 },
    taste: { count: 0, lastMs: 0 }
  }), 'smell');
});

test('a faculty never practised is never reported as current', () => {
  const ctx = loadSelectors(null);
  assert.equal(ctx.guideRecentSenseMode({
    feeling: { count: 0, lastMs: 0 }, smell: { count: 0, lastMs: 0 }, taste: { count: 0, lastMs: 0 }
  }), null, 'with no sessions it must say nothing, not guess');
});

test('a mode-less Senses card is labelled from practice, not the rotation', () => {
  // The generic card commits to no faculty. Labelling it from the rotation
  // announced the faculty to do NEXT: a card sat entirely in Feeling read as
  // "Senses · Smell" because Feeling had cleared the rotation's 10-minute gate.
  const src = fs.readFileSync(path.join(root, 'guide-path-client.js'), 'utf8');
  const block = src.slice(src.indexOf('var md = it.mode'), src.indexOf('var md = it.mode') + 900);
  assert.match(block, /guideRecentSenseMode\(/, 'must read recent practice');
  assert.doesNotMatch(block, /guideActiveSenseMode\(/, 'must not fall back to the rotation here');
});
