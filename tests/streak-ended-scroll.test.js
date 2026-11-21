'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const presence = fs.readFileSync(path.join(__dirname, '..', 'presence.html'), 'utf8');
const rule = sel => {
  const i = presence.indexOf('    ' + sel + ' {');
  assert.ok(i > -1, sel + ' must still be here');
  return presence.slice(i, presence.indexOf('}', i));
};

test('the streak-ended screen scrolls when its card is taller than the screen', () => {
  // On a Kompakt-sized screen (about 320x460) the card was squeezed to the
  // window and clipped its own buttons: Begin Again and Maybe Later sat below
  // its bottom edge with nothing able to scroll to them.
  const ov = rule('.so-ended-overlay');
  assert.match(ov, /overflow-y:auto/);
  assert.match(ov, /overscroll-behavior:contain/);
  // justify-content:center pushes an oversized card off the TOP edge too,
  // where no scroll can reach. Auto margins centre it only when it fits.
  assert.doesNotMatch(ov, /justify-content:center/);
  const card = rule('.so-ended-card');
  assert.match(card, /flex-shrink:0/, 'the card keeps its full height rather than clipping its buttons');
  assert.match(card, /margin:auto 0/);
});
