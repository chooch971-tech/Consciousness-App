'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const presence = fs.readFileSync(path.join(root, 'presence.html'), 'utf8');
const shell = fs.readFileSync(path.join(root, 'app-shell-client.js'), 'utf8');
const awareness = fs.readFileSync(path.join(root, 'awareness-client.js'), 'utf8');

test('the page no longer runs under the status bar', () => {
  // With black-translucent, iOS 26+ lays its Liquid Glass scroll-edge blur over
  // the inset, reaching about 35pt past the bar and across the header. It is
  // drawn above the web view: a solid strip painted at the top does not cover
  // it, and no CSS or meta switch disables it. Starting the web view below an
  // opaque bar leaves nothing of ours underneath to blur.
  assert.match(presence, /<meta name="apple-mobile-web-app-status-bar-style" content="default"\/>/);
  assert.doesNotMatch(presence, /content="black-translucent"/);
  // viewport-fit=cover stays: the bottom inset still matters for the home indicator.
  assert.match(presence, /name="viewport" content="[^"]*viewport-fit=cover/);
});

test('the top padding follows the reported inset, with no fixed status bar allowance', () => {
  // A 44px floor only made sense while the page was drawn under the bar. With
  // the web view starting below it the inset is 0, and a floor would leave an
  // empty strip. env() stays so an install still on black-translucent — the
  // tag is cached with the icon until it is re-added — keeps clearing its bar.
  const script = presence.slice(presence.indexOf('Set safe-area padding variables before first paint'));
  assert.match(script, /'--safe-top',\s+'max\(env\(safe-area-inset-top\),8px\)'/);
  assert.match(script, /'--safe-top-lg', 'max\(env\(safe-area-inset-top\),12px\)'/);
  // The comment explains the old values; what must be gone is setting them.
  assert.doesNotMatch(script.slice(0, 1600), /setProperty\([^)]*(44|52)px/);
});

test('screens fade into the cached status bar colour instead of recolouring it', () => {
  // iOS draws the bar from the theme-color it cached and ignores runtime
  // changes: on device the bar stayed #07080d while a script had set it to the
  // Guide's violet, leaving a hard edge. So the bar colour is held fixed and
  // every coloured sky starts with a layer fading out of it.
  assert.match(presence, /<meta name="theme-color" content="#07080d"\/>/);
  assert.match(presence, /--top-blend: linear-gradient\(transparent, transparent\);/,
    'inert by default');
  assert.match(presence, /html\.is-standalone \{\s*--top-blend: linear-gradient\(180deg, #07080d 0px,[^;]*rgba\(7,8,13,0\) 32px\);/,
    'starting exactly at the bar colour in the installed app');
  // Every sky measured with a top other than #07080d carries the layer first.
  ['body.mode-guide #homeScreen', 'body.mode-concentration #homeScreen',
   'body.mode-awareness #homeScreen', 'body.mode-prayer #homeScreen',
   '#settingsScreen,', '#profileScreen,', '#senseSessionScreen'].forEach(sel => {
    const at = presence.indexOf('    ' + sel);
    assert.ok(at > -1, sel + ' must still be here');
    const rule = presence.slice(at, presence.indexOf('}', at));
    assert.match(rule, /background:\s*\n\s*var\(--top-blend\),/, sel + ' must start with the blend layer');
  });
  assert.equal((presence.match(/var\(--top-blend\),/g) || []).length, 8, 'eight skies');
});

test('the blend is never a fixed element', () => {
  // WebKit hit-tests 8px inside the top edge, walks up to the first fixed or
  // sticky element and reads its plain background-color; gradients do not
  // count, and where it cannot read one it draws its own blur over the page.
  // A fixed overlay carrying this gradient was exactly that case and brought
  // the blur back on device. As a background layer it adds nothing WebKit walks.
  assert.doesNotMatch(presence, /body::after/);
  assert.doesNotMatch(presence, /position:fixed;[^}]*#07080d 0%/);
});

test('the blend exists only in the installed app', () => {
  // In a Safari tab the browser's own chrome sits above the page.
  const script = presence.slice(presence.indexOf('Set safe-area padding variables before first paint'));
  const pwaBlock = script.slice(script.indexOf('if (pwa) {'), script.indexOf('}', script.indexOf('if (pwa) {')));
  assert.match(pwaBlock, /root\.classList\.add\('is-standalone'\)/);
});

test('nothing tries to recolour the status bar at runtime any more', () => {
  // It does nothing on current iOS, and if a later iOS did honour it the bar
  // would turn violet above a fade that runs to near-black — a new seam.
  assert.doesNotMatch(shell, /meta\[name="theme-color"\]/);
  assert.doesNotMatch(shell, /SCREEN_BAR_COLORS|MODE_BAR_COLORS|presenceSetBarColor/);
  assert.doesNotMatch(awareness, /applyScreenBarColor/);
});
