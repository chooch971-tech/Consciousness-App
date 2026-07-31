'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const guideSource = fs.readFileSync(path.join(root, 'guide-path-client.js'), 'utf8');

// The Thought Control rows of guideProgressOverview, isolated by its markers.
function thoughtRowBlock() {
  const start = guideSource.indexOf('var thoughtRows = GUIDE_FOUNDATION_THOUGHT_ORDER.map');
  const end = guideSource.indexOf("id:'thought', name:'Thought Control'");
  assert.ok(start > -1 && end > start, 'thought progress rows must still be here');
  return guideSource.slice(start, end);
}

test('a manual floor only short-circuits when automatic increases are off', () => {
  // It used to short-circuit on any floor at all, so a discipline still
  // climbing reported "automatic increases on" beside a hardcoded full bar and
  // never appeared to move — the real state could be 0 of 6 qualifying sits.
  const block = thoughtRowBlock();
  assert.match(block, /if \(floor && !guideAutoAdvanceOn\(mode\)\)/,
    'the floor branch must also require auto-advance to be off');
  assert.doesNotMatch(block, /automatic increases '\s*\n?\s*\+ \(guideAutoAdvanceOn/,
    'the old on/off suffix must be gone');
});

test('the climbing branch computes a real bar instead of leaving it full', () => {
  const block = thoughtRowBlock();
  assert.match(block, /pct = guideProgressPct\(ladder\.qualAtRung, ladder\.required\)/,
    'progress must be measured, not assumed');
});

test('a ladder below its manual floor does not promise a rise it cannot deliver', () => {
  // target is max(floor, natural); while natural is under the floor, climbing a
  // rung leaves the recommendation where it is, so it must not read
  // "N more -> <the number already shown>".
  const block = thoughtRowBlock();
  assert.match(block, /var nextMin = Math\.max\(floor, ladder\.natural \+ 1\)/);
  assert.match(block, /nextMin > target/, 'must compare against the live target');
  assert.match(block, /before the ladder passes your manual/,
    'needs distinct wording for the below-floor case');
});

test('Thought Control now guards the same way as the other ladders', () => {
  // Clock, Asana and Auditory already only short-circuit on an explicit lock;
  // Thought Control was the odd one out.
  assert.match(guideSource, /if \(clockFloor && !guideAutoAdvanceOn\('clock'\)\)/);
  assert.match(guideSource, /if \(asana\.locked\)/);
  assert.match(guideSource, /if \(aud\.locked\)/);
  assert.match(thoughtRowBlock(), /if \(floor && !guideAutoAdvanceOn\(mode\)\)/);
});
