'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.join(__dirname, '..');
const guideSrc = fs.readFileSync(path.join(root, 'guide-path-client.js'), 'utf8');

function load() {
  const start = guideSrc.indexOf('function thoughtControlStarBrightness');
  const end = guideSrc.indexOf('\n}', start) + 2;
  assert.ok(start > -1, 'thoughtControlStarBrightness must still be here');
  const ctx = { Math, GUIDE_THOUGHT_MAX_RUNG: 15 };
  vm.createContext(ctx);
  vm.runInContext(guideSrc.slice(start, end), ctx);
  return ctx;
}

function stats(obs, foc, vac) {
  return { observation: { bestSec: obs }, focus: { bestSec: foc || 0 }, vacancy: { bestSec: vac || 0 } };
}

test('practice below ten minutes no longer renders as never practised', () => {
  // The old thresholds were [600, 750, 900], so anything under a ten-minute
  // hold scored zero — pixel-identical to an untouched star. The Guide's own
  // ladder starts at five minutes and climbs a minute at a time, so following
  // it exactly left this star dead for months.
  const g = load();
  const dark = g.thoughtControlStarBrightness(stats(0));
  assert.equal(dark, 0, 'an untouched form is still dark');
  const eightMinutes = g.thoughtControlStarBrightness(stats(480));
  assert.ok(eightMinutes > 0, 'eight minutes must light the star at all');
  assert.ok(eightMinutes > dark + 3, 'and visibly, not by a rounding crumb');
});

test('every minute moves it, the way the neighbouring stars work', () => {
  const g = load();
  let last = -1;
  for (let minutes = 0; minutes <= 15; minutes++) {
    const value = g.thoughtControlStarBrightness(stats(minutes * 60));
    assert.ok(value >= last, 'brightness never goes backwards');
    if (minutes > 0) {
      assert.ok(value > last, 'minute ' + minutes + ' must add something');
    }
    last = value;
  }
});

test('the ceiling is the ladder\'s own fifteen minutes, held in all three forms', () => {
  const g = load();
  assert.equal(g.thoughtControlStarBrightness(stats(900, 900, 900)), 20);
  // Sitting longer than the ladder asks cannot overflow the scale.
  assert.equal(g.thoughtControlStarBrightness(stats(3600, 3600, 3600)), 20);
});

test('the three forms are weighted equally', () => {
  const g = load();
  const onlyOne = g.thoughtControlStarBrightness(stats(900, 0, 0));
  const allThree = g.thoughtControlStarBrightness(stats(900, 900, 900));
  assert.ok(Math.abs(onlyOne - allThree / 3) < 0.1,
    'one form at the ceiling is a third of the star');
  assert.equal(g.thoughtControlStarBrightness(stats(900, 0, 0)),
               g.thoughtControlStarBrightness(stats(0, 900, 0)),
               'no form counts for more than another');
  assert.equal(g.thoughtControlStarBrightness(stats(0, 0, 900)),
               g.thoughtControlStarBrightness(stats(0, 900, 0)));
});

test('the ceiling is read from the ladder constant, not hardcoded', () => {
  // The tree and the Guide must agree on what "finished" means.
  const block = guideSrc.slice(guideSrc.indexOf('function thoughtControlStarBrightness'),
                               guideSrc.indexOf('\n}', guideSrc.indexOf('function thoughtControlStarBrightness')) + 2);
  assert.match(block, /GUIDE_THOUGHT_MAX_RUNG/);
  assert.doesNotMatch(block, /\[600, 750, 900\]/, 'the ten-minute floor must be gone');
  // A different ladder ceiling must move the star with it.
  const ctx = { Math, GUIDE_THOUGHT_MAX_RUNG: 10 };
  vm.createContext(ctx);
  vm.runInContext(block, ctx);
  assert.equal(ctx.thoughtControlStarBrightness(stats(600, 600, 600)), 20,
    'with a ten-minute ladder, ten minutes is full brightness');
});

test('Fundamentals Mastery inherits the smoother progression', () => {
  // kether averages thought/20 among its nine branches, so a star that sat at
  // zero until ten minutes also froze a ninth of the crown.
  assert.match(guideSrc, /practiceTreeNodeBrightness\('thought', stats\) \/ 20/);
});
