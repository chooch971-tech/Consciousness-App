'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const clientFiles = fs.readdirSync(root).filter((f) => f.endsWith('-client.js'));

test('no client references OMNIA_CRYSTAL_SVG_RPT without guarding it', () => {
  // The constant is referenced but never defined anywhere in the app. An
  // unguarded read threw a ReferenceError inside playChestOpenAnimation, above
  // the line that builds the overlay, so the entire chest animation died before
  // a single element existed — the reward still landed, silently.
  for (const file of clientFiles) {
    const src = fs.readFileSync(path.join(root, file), 'utf8');
    const lines = src.split('\n');
    lines.forEach((line, i) => {
      if (!line.includes('OMNIA_CRYSTAL_SVG_RPT')) return;
      if (line.trim().startsWith('//') || line.trim().startsWith('*')) return;
      // The guard may be on this line (a ternary) or open a block just above it.
      const window = lines.slice(Math.max(0, i - 3), i + 1).join('\n');
      assert.match(window, /typeof OMNIA_CRYSTAL_SVG_RPT !== 'undefined'/,
        file + ':' + (i + 1) + ' reads OMNIA_CRYSTAL_SVG_RPT with no typeof guard in scope');
    });
  }
});

test('the chest animation has a crystal to draw even with the constant absent', () => {
  const src = fs.readFileSync(path.join(root, 'guide-quests-client.js'), 'utf8');
  const block = src.slice(src.indexOf('function playChestOpenAnimation'),
                          src.indexOf('var overlay = document.createElement'));
  assert.match(block, /omniaHeadOnlySVG/, 'must fall back to a helper that exists');
});

function claimBlock() {
  const src = fs.readFileSync(path.join(root, 'guide-quests-client.js'), 'utf8');
  const start = src.indexOf('function claimPathQuestReward');
  const end = src.indexOf('function pathQuestChestSVG');
  assert.ok(start > -1 && end > start, 'claimPathQuestReward must still be here');
  return src.slice(start, end);
}

test('a claim on a rolled-over window explains itself instead of doing nothing', () => {
  // pathQuestState() wipes a quest whose day key has changed, so a Claim button
  // left on screen across midnight hit progress < target and returned in
  // silence: no animation, no akasha, no message, no repaint.
  const block = claimBlock();
  assert.match(block, /storedWindow/, 'must read the stored window before it is rolled');
  assert.match(block, /windowClosed/, 'must detect the closed window');
  assert.match(block, /showToast/, 'must tell the user');
  assert.match(block, /closed at midnight/, 'daily wording');
  assert.match(block, /week rolled over/, 'weekend wording');
});

test('every early return from a claim repaints the card', () => {
  // Whatever the outcome, the card must stop offering something it cannot give.
  const block = claimBlock();
  const claimedBranch = block.slice(block.indexOf('if (data.claimed)'), block.indexOf('var target'));
  assert.match(claimedBranch, /renderPathQuests\(\)/, 'already-claimed path must repaint');
  const shortBranch = block.slice(block.indexOf('if (progress < target)'), block.indexOf('var amount'));
  assert.match(shortBranch, /renderPathQuests\(\)/, 'not-yet-earned path must repaint');
});

test('the quest card repaints itself when the day key turns over', () => {
  // The Guide only re-renders on a visibility change, and only while the Path
  // tab is open, so an app left sitting on this screen kept a stale button.
  const src = fs.readFileSync(path.join(root, 'guide-quests-client.js'), 'utf8');
  assert.match(src, /function pqWatchDayRollover/);
  assert.match(src, /if \(document\.visibilityState !== 'visible'\) return;/,
    'the tick must idle while hidden');
  assert.match(src, /pqWatchDayRollover\(\);/, 'renderPathQuests must arm the watcher');
});
