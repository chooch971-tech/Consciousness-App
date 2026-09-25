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

test('the bar follows the screen being shown, not only the mode', () => {
  // Settings, Profile, the Lodge, the Journal and each session have a sky of
  // their own; a mode-coloured bar would sit over them as a seam.
  assert.match(awareness, /if \(typeof applyScreenBarColor === 'function'\) applyScreenBarColor\(id\);/);
  assert.match(awareness, /applyModeCanvasColor\(currentMode\);/,
    'and returning Home restores the mode colour');
  // Each family measured with its own top must be in the table.
  ['settingsScreen', 'profileScreen', 'chatThreadScreen', 'journalScreen', 'lodgeScreen',
   'senseSessionScreen', 'concSessionScreen'].forEach(id => {
    assert.match(shell, new RegExp(id + ":'#[0-9a-f]{6}'"), id + ' needs its own bar colour');
  });
});

test('the bar and the canvas are different colours per mode', () => {
  // The bar meets the top of the backdrop and the canvas meets its bottom; one
  // shared value would be wrong at one end or the other.
  const pick = name => {
    const block = shell.slice(shell.indexOf('var ' + name + ' = {'));
    return (block.slice(0, block.indexOf('};')).match(/guide:\s*'(#[0-9a-f]{6})'/) || [])[1];
  };
  assert.equal(pick('MODE_BAR_COLORS'), '#1e1933', 'Guide top, as rendered');
  assert.equal(pick('MODE_CANVAS_COLORS'), '#0f0c1c', 'Guide bottom stop');
});
