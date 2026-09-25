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
  // Guide's violet, leaving a hard black edge. So the bar colour is held fixed
  // and every screen's top fades into it.
  assert.match(presence, /<meta name="theme-color" content="#07080d"\/>/);
  const rule = presence.slice(presence.indexOf('html.is-standalone body::after {'));
  const body = rule.slice(0, rule.indexOf('}'));
  assert.match(body, /position:fixed; top:0; left:0; right:0;/);
  assert.match(body, /linear-gradient\(180deg, #07080d 0%/, 'starts exactly at the bar colour');
  assert.match(body, /rgba\(7,8,13,0\) 100%/, 'and fades to nothing');
  assert.match(body, /pointer-events:none/, 'it must never swallow a tap on the header');
  assert.match(body, /z-index:10000/, 'above every overlay, so they blend the same way');
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
