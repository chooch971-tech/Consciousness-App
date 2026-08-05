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
