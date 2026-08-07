'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const presence = fs.readFileSync(path.join(root, 'presence.html'), 'utf8');
const prefs = fs.readFileSync(path.join(root, 'app-preferences-client.js'), 'utf8');
const jsFiles = fs.readdirSync(root).filter(n => n.endsWith('-client.js'));

test('no font size is nailed to a pixel any more', () => {
  // Every size used to be px, so the app ignored the reader completely:
  // doubling the root font size moved 0 of 38 visible elements. rem lets one
  // number move all 1348 of them together.
  const offenders = [];
  ['presence.html'].concat(jsFiles).forEach(name => {
    const src = fs.readFileSync(path.join(root, name), 'utf8');
    src.split('\n').forEach((line, i) => {
      // The one px left is prose in a comment describing another rule.
      if (/Sized by its parent/.test(line)) return;
      if (/font-size:\s*[0-9.]+px/.test(line) || /\bfont:\s*[0-9.]+px/.test(line)) {
        offenders.push(name + ':' + (i + 1));
      }
    });
  });
  assert.deepEqual(offenders, [], 'these still pin a font size in px');
});

test('the root scale answers both the browser and the app', () => {
  // 100% is whatever the reader has set as their browser/OS default, which is
  // what desktop and Android accessibility settings change. --fs is the
  // multiplier for what never reaches CSS: the in-app control, and later a
  // native wrapper feeding iOS Dynamic Type, which WKWebView does not expose.
  assert.match(presence, /html \{ font-size: calc\(100% \* var\(--fs\)\);/);
  assert.match(presence, /--fs: 1;/, 'and it must default to untouched');
  // none would block the reader entirely; 100% only stops iOS inflating text
  // on its own, which would otherwise stack on the chosen scale.
  assert.match(presence, /-webkit-text-size-adjust:100%/);
  assert.doesNotMatch(presence, /text-size-adjust:\s*none/);
});

test('the saved scale is applied before the first paint', () => {
  // Reading it after the body renders shows the whole app at one size and then
  // snaps it to another.
  const head = presence.slice(0, presence.indexOf('</head>'));
  assert.match(head, /presenceApplyTextScale\(presenceReadTextScale\(\)\)/,
    'the scale must be applied inside <head>');
  assert.ok(head.indexOf('function presenceReadTextScale') > -1,
    'and its reader must be defined there too');
});

test('a stored scale is clamped rather than trusted', () => {
  // It is user-writable storage, and a wild value would render the app unusable
  // with no way back to the control that fixes it.
  const fn = presence.slice(presence.indexOf('function presenceReadTextScale'),
                            presence.indexOf('function presenceApplyTextScale'));
  assert.match(fn, /if \(!isFinite\(v\)\) return 1;/, 'garbage falls back to 1');
  assert.match(fn, /Math\.min\(PRESENCE_TEXT_SCALE_MAX, Math\.max\(PRESENCE_TEXT_SCALE_MIN, v\)\)/);
  assert.match(presence, /PRESENCE_TEXT_SCALE_MIN = 1, PRESENCE_TEXT_SCALE_MAX = 2/);
});

test('the Settings control writes what the head reads', () => {
  assert.match(presence, /<input type="range" id="textScaleSlider" min="100" max="200"/);
  assert.match(presence, /aria-label="Text size"/, 'and it must be announced');
  assert.match(prefs, /localStorage\.setItem\('presence_text_scale'/);
  assert.match(prefs, /presenceApplyTextScale\(scale\)/, 'and take effect immediately');
  assert.match(prefs, /Math\.min\(2, Math\.max\(1, pct \/ 100\)\)/, 'clamped on the way in too');
  assert.match(presence, /id="textScaleValue"/, 'the percentage is shown');
  assert.match(presence, /Preview/, 'with a live sample to read rather than a number to guess at');
});

test('the mode tabs stop growing before they collide', () => {
  // Three wide-tracked labels share one row. Left uncapped they grew into each
  // other and the tab bar read as one word: GUIDECONCENTRATIONAWARENESS.
  const base = presence.match(/\.mode-tab \{ flex:1;[^}]*\}/);
  assert.ok(base, 'the base rule must still be here');
  assert.match(base[0], /font-size:min\(0\.5625rem, 11px\)/);
  assert.match(base[0], /min-width:0/, 'flex will not shrink a nowrap child without this');
  assert.match(base[0], /text-overflow:ellipsis/);
  // The later override would otherwise win the cascade and undo the cap.
  assert.match(presence, /\.mode-tab \{ position:relative; font-size:min\(0\.625rem, 12px\); \}/);
});
