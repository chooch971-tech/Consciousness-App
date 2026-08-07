'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const guideSource = fs.readFileSync(path.join(root, 'guide-path-client.js'), 'utf8');

function overviewBlock() {
  const start = guideSource.indexOf('function guideProgressOverview()');
  const end = guideSource.indexOf('var GUIDE_PROGRESS_CARD_FOR_ITEM');
  assert.ok(start > -1 && end > start, 'guideProgressOverview must still be here');
  return guideSource.slice(start, end);
}

test('the overview reads the real path items rather than recomputing them', () => {
  // The panel explains today's path. A card that derives its own ladder can
  // disagree with the item it is describing, which is exactly what happened:
  // a hand-added Senses item recommended twelve minutes on the path while this
  // panel announced twenty, because the panel was reading the curriculum
  // ladder for a stage the item does not run.
  const block = overviewBlock();
  assert.match(block, /buildGuideRegimentItems\(\)/, 'the real items are fetched');
  assert.match(block, /function pathItemForCard\(cardId\)/,
    'and matched to the card that describes them');
});

test('a hand-added sensory item reports its own target, not the curriculum ladder', () => {
  const block = overviewBlock();
  assert.match(block, /pathItem && pathItem\.added && typeof pathItem\.duration === 'number'/,
    'an added item is recognised');
  assert.match(block, /summary:pathItem\.duration \+ ' min recommended'/,
    'and the length shown is the one the path item carries');
  // A hand-added item stores its manual floor under its own id, not under the
  // faculty the curriculum would be training.
  assert.match(block, /guideFloorMin\(pathItem\.mode \|\| pathItem\.id\)/,
    'its floor is read under the item key it was saved with');
});

test('all three sensory cards are given their path item', () => {
  const block = overviewBlock();
  ['visual', 'auditory', 'sense'].forEach(id => {
    assert.match(block, new RegExp("pathItemForCard\\('" + id + "'\\)"),
      id + ' must be handed its live path item');
  });
});

test('cards are still filtered down to what is on the path', () => {
  // An exercise the practitioner removed must not be explained back to them.
  const block = overviewBlock();
  assert.match(block, /cards\.filter\(function\(card\) \{ return !!pathItemForCard\(card\.id\); \}\)/);
  // The item list is fetched once and reused for both jobs; the old helper
  // that fetched it a second time is gone.
  assert.doesNotMatch(guideSource, /function guideProgressCardIds/,
    'the duplicate path lookup must be gone');
  assert.equal(block.match(/buildGuideRegimentItems\(\)/g).length, 1,
    'the path is built exactly once per render');
});

test('the curriculum ladder still drives an item the practitioner did not add', () => {
  const block = overviewBlock();
  // The added branch returns early; everything after it is the sequence ladder.
  const afterAdded = block.slice(block.indexOf('var min = guideSensoryPracticeMinutes(stage);'));
  assert.match(afterAdded, /guideSensoryPracticeMinutes\(stage\)/);
  assert.match(afterAdded, /Training ' \+ stage\.label/,
    'and it still names the foundation being trained');
});

test('a manual target the ladder cannot exceed is not described as a start', () => {
  // An added Senses item climbs to ten minutes on its own — guideSenseTargetMinutes
  // and its mode-less legacy sibling both clamp there — and the floor is applied
  // as max(floor, natural). So a manual twelve can never be raised by practice,
  // however much is practised. Saying "practice lengthens it from there" was a
  // promise the ladder cannot keep.
  const block = overviewBlock();
  assert.match(block, /guideAddedNaturalCeiling\(pathItem\.id\)/);
  assert.match(block, /addedCeil && addedFloor >= addedCeil/,
    'the fixed case is the floor at or above the ceiling');
  assert.match(block, /practice will not raise it further/);
  assert.match(block, /change the number yourself to go higher/,
    'and it names the way out');
  // Below the ceiling, growth is real and should still be promised.
  assert.match(block, /'-minute start · practice lengthens it from there\.'/);
});

test('an added sensory card runs the same ladder as the curriculum', () => {
  // It used to run a progression of its own clamped at ten minutes, so the
  // same practice measured two ways depending on how its card reached the
  // path — and a manual start of ten or more could never move at all.
  const guide = fs.readFileSync(path.join(root, 'guide-path-client.js'), 'utf8');
  assert.doesNotMatch(guide, /Math\.min\(10, guideDurationForScore/,
    'the ten-minute clamp must be gone from both sense paths');
  // One unfloored ladder, read by the curriculum and by an added card alike.
  assert.match(guide, /function guideSensoryNaturalMinutes\(stage\)/);
  const senseTarget = guide.slice(guide.indexOf('function guideSenseTargetMinutes'),
                                  guide.indexOf('\n}', guide.indexOf('function guideSenseTargetMinutes')));
  assert.match(senseTarget, /guideSensoryNaturalMinutes\(stage\)/);
  assert.match(senseTarget, /guideAdvancedTarget\(mode,/, 'and each mode keeps its own floor');
  const practice = guide.slice(guide.indexOf('function guideSensoryPracticeMinutes'),
                               guide.indexOf('\n}', guide.indexOf('function guideSensoryPracticeMinutes')));
  assert.match(practice, /guideSensoryNaturalMinutes\(stage\)/,
    'the curriculum reads the very same function');
});

test('the mode-less legacy card measures the faculty being practised', () => {
  // guideCurrentSenseMode rotates on to Smell once Feeling has practice behind
  // it, so reading the length from it measured weeks of Feeling against an
  // untouched Smell stage: the more that was practised, the shorter the
  // recommendation became.
  const guide = fs.readFileSync(path.join(root, 'guide-path-client.js'), 'utf8');
  const legacy = guide.slice(guide.indexOf("var senseEyes = guidePathEyesMode"),
                             guide.indexOf("var senseTarget = senseDur"));
  assert.ok(legacy, 'the legacy sense item must still be here');
  assert.match(legacy, /guideRecentSenseMode\(senseLegacyStats\)/,
    'the newest-practised faculty decides the length');
  assert.ok(legacy.indexOf('guideRecentSenseMode') < legacy.indexOf('guideActiveSenseMode'),
    'and the rotation is only the fallback');
  assert.match(legacy, /guideSensoryNaturalMinutes\(guideSensoryStageFor\(senseLegacyMode, senseEyes\)\)/);
});

test('the ceiling table matches the ladder it describes', () => {
  const guide = fs.readFileSync(path.join(root, 'guide-path-client.js'), 'utf8');
  assert.match(guide, /var GUIDE_ADDED_NATURAL_CEIL = \{ sense:20, feeling:20, smell:20, taste:20 \};/,
    'the sense family now tops out where the curriculum does');
  assert.match(guide, /var GUIDE_SENSORY_PRACTICE_MAX = 20;/, 'and that maximum really is twenty');
  // The rung ladder must stop there rather than climbing on.
  assert.match(guide, /while \(rung < GUIDE_SENSORY_PRACTICE_MAX/);
  // Visualization and Auditory climb their own ladders, so they get no entry
  // and keep the growth wording.
  assert.doesNotMatch(guide, /GUIDE_ADDED_NATURAL_CEIL = \{[^}]*visual/);
  assert.doesNotMatch(guide, /GUIDE_ADDED_NATURAL_CEIL = \{[^}]*auditory/);
});
