'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.join(__dirname, '..');
const awarenessSource = fs.readFileSync(path.join(root, 'awareness-client.js'), 'utf8');
const visualSource = fs.readFileSync(path.join(root, 'visualization-client.js'), 'utf8');
const presenceSource = fs.readFileSync(path.join(root, 'presence.html'), 'utf8');

function loadTiger() {
  const start = awarenessSource.indexOf('var TIGER_LEVELS');
  const end = awarenessSource.indexOf('function getSymbolDescription');
  const context = {};
  vm.runInNewContext(awarenessSource.slice(start, end), context, { filename:'tiger-easter-egg.js' });
  return context;
}

test('the tiger appears at the irregular levels and original 108-level cadence', () => {
  const tiger = loadTiger();
  [11, 32, 67, 69, 92, 108, 216, 324, 432, 540, 648, 756].forEach(level => {
    assert.equal(tiger.isTigerLevel(level), true, 'level ' + level);
  });
  [1, 10, 12, 68, 70, 107, 109, 777].forEach(level => {
    assert.equal(tiger.isTigerLevel(level), false, 'level ' + level);
  });
});

test('the easter egg is an animated tiger holding a yin-yang, not an emoji', () => {
  const art = loadTiger().renderTigerYinYang();
  assert.match(art, /class="tiger-face"/);
  assert.match(art, /class="tiger-paws"/);
  assert.match(art, /class="tiger-yin-yang-disc"/);
  assert.match(art, /Tiger holding a yin-yang symbol/);
  assert.doesNotMatch(presenceSource, />🐯</);
  assert.match(presenceSource, /@keyframes tigerTailSway/);
  assert.match(presenceSource, /@keyframes tigerBlink/);
  assert.match(presenceSource, /@keyframes tigerYinTurn/);
  assert.match(presenceSource, /prefers-reduced-motion:reduce[\s\S]*?tiger-easter-egg/);
});

test('rank details and both level-up paths share the tiger behavior', () => {
  assert.match(awarenessSource, /updateTigerEasterEgg\(tigerEl, level\)/);
  assert.match(awarenessSource, /updateTigerEasterEgg\(levelupTiger, level\)/);
  assert.match(visualSource, /updateTigerEasterEgg\(levelupTiger, level\)/);
  assert.match(visualSource, /concentration level reached/);
  assert.match(presenceSource, /id="rankModalTiger"[^>]*Tiger holding a yin-yang symbol/);
  assert.match(presenceSource, /id="levelupTiger"[^>]*Tiger holding a yin-yang symbol/);
});
