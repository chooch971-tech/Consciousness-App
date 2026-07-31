'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const streakSource = fs.readFileSync(path.join(root, 'streak-client.js'), 'utf8');
const presenceSource = fs.readFileSync(path.join(root, 'presence.html'), 'utf8');

test('the streak candle is an accessible, repeatable flicker control', () => {
  assert.match(streakSource, /<button class="so-vigil" id="soVigilBtn" type="button" aria-label="Flicker the streak candle">/);
  assert.match(streakSource, /vigilBtn\.classList\.remove\('so-vigil-flicker'\)[\s\S]*void vigilBtn\.offsetWidth;[\s\S]*vigilBtn\.classList\.add\('so-vigil-flicker'\)/);
  assert.match(streakSource, /setTimeout\(function\(\) \{\s*vigilBtn\.classList\.remove\('so-vigil-flicker'\);\s*\}, 700\)/);
  assert.match(presenceSource, /\.so-vigil\.so-vigil-flicker \.so-vigil-glow \{ animation:soVigilTapGlow/);
  assert.match(presenceSource, /@keyframes soVigilTapFlame/);
});

test('the hero keeps the streak number close and omits the young-flame copy without a blank spacer', () => {
  assert.doesNotMatch(streakSource, /A young flame\. Feed it daily\./);
  assert.match(streakSource, /streak < 7\s+\? ''/);
  assert.match(streakSource, /\(subText \? '<div class="so-hero-sub">' \+ subText \+ '<\/div>' : ''\)/);
  assert.match(presenceSource, /\.so-hero-num \{[^}]*margin:-10px 0 10px;/);
});
