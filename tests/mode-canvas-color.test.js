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

test('the status bar is tinted separately, to the top of the screen', () => {
  // With status-bar-style default, iOS draws an opaque bar across the top and
  // tints it from theme-color. It sits against the TOP of the screen, while the
  // canvas shows at the bottom — so the two take different colours.
  assert.match(shell, /function presenceSetBarColor\(color\)/);
  assert.match(shell, /meta\.setAttribute\('content', color \|\| DEFAULT_SURFACE_COLOR\)/);
  const fn = shell.slice(shell.indexOf('function applyModeCanvasColor(mode)'),
                         shell.indexOf('function applyScreenBarColor'));
  assert.match(fn, /MODE_CANVAS_COLORS\[mode\]/, 'canvas from the bottom table');
  assert.match(fn, /presenceSetBarColor\(MODE_BAR_COLORS\[mode\]/, 'bar from the top table');
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

test('an unknown mode or screen falls back rather than throwing', () => {
  assert.match(shell, /var DEFAULT_SURFACE_COLOR = '#07080d';/);
  assert.match(shell, /MODE_CANVAS_COLORS\[mode\] \|\| DEFAULT_SURFACE_COLOR/);
  assert.match(shell, /MODE_BAR_COLORS\[mode\] \|\| DEFAULT_SURFACE_COLOR/);
  assert.match(shell, /SCREEN_BAR_COLORS\[screenId\] \|\| DEFAULT_SURFACE_COLOR/);
  const setter = shell.slice(shell.indexOf('function presenceSetBarColor'),
                             shell.indexOf('function applyModeCanvasColor'));
  assert.match(setter, /catch \(e\) \{\}/, 'and never breaks a navigation');
});
