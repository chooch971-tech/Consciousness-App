'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const presence = fs.readFileSync(path.join(root, 'presence.html'), 'utf8');
const shell = fs.readFileSync(path.join(root, 'app-shell-client.js'), 'utf8');

// The last stop of each mode's #homeScreen backdrop, read from the stylesheet
// itself so the two can never drift apart.
function backdropEndColor(mode) {
  const rule = presence.slice(presence.indexOf('body.mode-' + mode + ' #homeScreen {'));
  const grad = rule.slice(0, rule.indexOf('}')).match(/linear-gradient\(180deg,[^;]*?(#[0-9a-f]{6}) 100%\)/i);
  assert.ok(grad, mode + ' must still paint a base gradient');
  return grad[1].toLowerCase();
}

test('the canvas behind each mode matches that mode, not a flat near-black', () => {
  // <html>'s background paints the canvas, including anywhere the page's own
  // paint does not reach — behind the home indicator most visibly. It was a
  // flat #07080d in every mode, so against the Guide's violet #0f0c1c it read
  // as a band the app had failed to cover.
  const table = shell.slice(shell.indexOf('var MODE_CANVAS_COLORS'),
                            shell.indexOf('function applyModeCanvasColor'));
  ['guide', 'concentration', 'awareness', 'prayer'].forEach(mode => {
    const declared = (table.match(new RegExp(mode + ":\\s*'(#[0-9a-f]{6})'", 'i')) || [])[1];
    assert.ok(declared, mode + ' must have a canvas colour');
    assert.equal(declared.toLowerCase(), backdropEndColor(mode),
      mode + ' canvas must be the colour its own backdrop ends on');
  });
});

test('the standalone window is tinted to match too', () => {
  // iOS takes the window's own colour from this meta, and that surface is
  // outside anything CSS can paint.
  assert.match(shell, /meta\[name="theme-color"\]/);
  assert.match(shell, /meta\.setAttribute\('content', color\)/);
  assert.match(presence, /<meta name="theme-color" content="#[0-9a-f]{6}"\/>/i,
    'the meta must still be there for the script to find');
});

test('the colour is applied on a switch and on boot', () => {
  // The app opens in whichever mode the body class carries without going
  // through switchMode, so boot needs its own pass or the canvas stays the
  // default until the first tab tap.
  assert.match(shell, /\}\);\n  applyModeCanvasColor\(mode\);/,
    'switchMode applies it right after setting the mode class');
  assert.match(shell, /function applyModeCanvasColorOnBoot\(\)/);
  const boot = shell.slice(shell.indexOf('function applyModeCanvasColorOnBoot'));
  assert.match(boot, /document\.body\.classList\.contains\('mode-' \+ modes\[i\]\)/,
    'boot reads the mode from the class already on the body');
  assert.match(boot, /applyModeCanvasColor\('guide'\)/, 'with a fallback');
});

test('an unknown mode falls back rather than throwing', () => {
  const fn = shell.slice(shell.indexOf('function applyModeCanvasColor(mode)'),
                         shell.indexOf('function switchMode'));
  assert.match(fn, /MODE_CANVAS_COLORS\[mode\] \|\| '#07080d'/);
  assert.match(fn, /catch \(e\) \{\}/, 'and never breaks a mode switch');
});
