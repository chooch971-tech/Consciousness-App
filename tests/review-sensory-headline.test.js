'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const reportsSrc = fs.readFileSync(path.join(root, 'reports-client.js'), 'utf8');
const guideSrc = fs.readFileSync(path.join(root, 'guide-path-client.js'), 'utf8');

function headlineBlock() {
  const start = guideSrc.indexOf('function guideSensoryHeadlineStage()');
  const end = guideSrc.indexOf('function guideActiveSenseMode');
  assert.ok(start > -1 && end > start, 'guideSensoryHeadlineStage must still be here');
  return guideSrc.slice(start, end);
}

function modeBreakdownBlock() {
  const start = reportsSrc.indexOf("if (key === 'sense' || key === 'visualization') {");
  const end = reportsSrc.indexOf('return \'<div class="review-practice-row">\'', start);
  assert.ok(start > -1 && end > start, 'the mode breakdown must still be here');
  return reportsSrc.slice(start, end);
}

test('the review names the stage being trained, not the next one in sequence', () => {
  // Someone whose only sensory work is a Senses exercise they added themselves
  // was told they were "Current: Visualization · Closed Eyes" — a sequence
  // they are not following — and shown that stage's clean-hold best, which is
  // zero because they have never sat it.
  const block = headlineBlock();
  assert.match(block, /buildGuideRegimentItems\(\)/, 'the real path decides');
  assert.match(block, /sensoryItem\.sensoryTrack/,
    'a curriculum item still reports the sequence stage');
  assert.match(block, /guideRecentSenseMode\(senseStats\)/,
    'a hand-added Senses item reports the faculty actually practised');
  assert.match(block, /if \(!sensoryItem\) return progress\.current;/,
    'with nothing sensory on the path, the sequence stage is the honest answer');
});

test('a curriculum item outranks a hand-added one regardless of path order', () => {
  // Both can sit on one path. This line also carries the mastery count, so the
  // sequence item is what it is about; picking whichever the path listed first
  // made the answer depend on ordering.
  const block = headlineBlock();
  assert.match(block, /if \(it\.sensoryTrack\) \{ sensoryItem = it; break; \}/,
    'the curriculum item is taken as soon as it is seen');
  assert.match(block, /if \(!addedItem\) addedItem = it;/,
    'an added item is only held as a fallback');
  assert.match(block, /if \(!sensoryItem\) sensoryItem = addedItem;/);
});

test('the review consumes the headline stage rather than track.current', () => {
  assert.match(reportsSrc, /guideSensoryHeadlineStage\(\)/);
  assert.match(reportsSrc, /'Training: ' \+ currentStage\.name/,
    'and says Training, since it names live practice');
  assert.doesNotMatch(reportsSrc, /'Current: ' \+ currentStage\.name/);
  // A missing headline must not print a stage-less line.
  assert.match(reportsSrc, /track\.complete \|\| !currentStage/);
});

test('a breakdown only prints numbers when it actually divides the sessions', () => {
  // The eyes slice and the faculty slice cut the same sessions on the same
  // metric. With one faculty in one eyes mode they each restated the count and
  // the best from the row above, so the same numbers appeared three times.
  const block = modeBreakdownBlock();
  assert.match(block, /eyeSlices\.length > 1/, 'the eyes split needs both modes present');
  assert.match(block, /senseSlices\.length > 1/, 'the faculty split needs more than one faculty');
  assert.match(block, /'Every sit · ' \+ uniform\.join/,
    'what did not divide is stated once as a fact, without numbers');
});

test('a session count in the breakdown says what it counts', () => {
  // "Closed eyes 9" never said the 9 was sessions.
  const block = modeBreakdownBlock();
  assert.match(block, /' session' \+ \(slice\.sessions === 1 \? '' : 's'\)/,
    'counts are labelled and pluralised');
  assert.doesNotMatch(block, /'Closed eyes ' \+ current\.closedEyesSessions/,
    'the old bare-number form must be gone');
});

test('both slices label their metric the same way', () => {
  // One said "best" and the other "best clean" for the identical field.
  const block = modeBreakdownBlock();
  const labels = block.match(/best clean '/g) || [];
  assert.equal(labels.length, 1, 'one shared line builder, one label');
  assert.match(block, /function sliceLine\(slice\)/);
});
