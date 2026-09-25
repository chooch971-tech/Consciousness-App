'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const presence = fs.readFileSync(path.join(root, 'presence.html'), 'utf8');

function ruleFor(selector) {
  const i = presence.indexOf('\n    ' + selector + ' {');
  assert.ok(i > -1, selector + ' must still be here');
  return presence.slice(i, presence.indexOf('}', i));
}

// The elements that stay on screen for as long as the app is open. A finished
// animation left filling forwards keeps its end state applied forever, and that
// end state includes transform:translateY(0) — an identity transform, but a
// transform all the same. An element carrying one is painted on its own
// composited layer rather than snapped to the pixel grid, and iOS rasterises
// that layer at its own scale, which renders the text visibly soft. Measured on
// the Guide home: .top-bar held matrix(1,0,0,1,0,0) and read blurry while the
// tabs directly below it, with transform:none, stayed crisp.
const PERSISTENT = ['.top-bar', '.hero', '.home-actions'];

test('a persistent element never keeps a finished animation applied', () => {
  PERSISTENT.forEach(sel => {
    const rule = ruleFor(sel);
    assert.match(rule, /animation:fadeUp [^;]*backwards/,
      sel + ' must fill backwards, not forwards');
    assert.doesNotMatch(rule, /forwards/, sel + ' must not retain its end state');
  });
});

test('their resting state is visible without the animation', () => {
  // With the fill dropped, the element falls back to its own style once the
  // animation finishes — so that style has to be the visible one. Leaving
  // opacity:0 in the base rule would make the bar vanish the moment the
  // animation ended, and would also hide it outright wherever the animation
  // never runs.
  PERSISTENT.forEach(sel => {
    assert.doesNotMatch(ruleFor(sel), /opacity:0/,
      sel + ' must not rest at opacity:0');
  });
});

test('the fade-in itself is unchanged', () => {
  // backwards still applies the from-keyframe through the delay, so nothing
  // flashes in un-faded before the animation starts.
  assert.match(presence, /@keyframes fadeUp \{ from\{opacity:0;transform:translateY\(10px\)\} to\{opacity:1;transform:translateY\(0\)\} \}/);
  assert.match(ruleFor('.top-bar'), /animation:fadeUp \.7s ease \.1s backwards/);
  assert.match(ruleFor('.hero'), /animation:fadeUp \.7s ease \.25s backwards/);
  assert.match(ruleFor('.home-actions'), /animation:fadeUp \.7s ease \.4s backwards/);
});
