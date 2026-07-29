'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const guideSource = fs.readFileSync(path.join(__dirname, '..', 'guide-path-client.js'), 'utf8');

function loadBrightness(visualMasteries) {
  const start = guideSource.indexOf('function soulMirrorStarBrightness');
  const end = guideSource.indexOf('// Recency is an early-practice encouragement');
  const visual = visualMasteries || [];
  const context = {
    concState:{ lifetimeBreaths:0 },
    SOUL_MIRROR_NEG_GOAL:100,
    SOUL_MIRROR_POS_GOAL:60,
    loadSoulMirror:() => ({ negative:[], positive:[] }),
    guideSensoryTrackProgress:() => ({
      stages:[
        { exercise:'visual', id:'visual_closed', mastered:visual.includes('closed') },
        { exercise:'visual', id:'visual_open', mastered:visual.includes('open') }
      ]
    })
  };
  vm.runInNewContext(guideSource.slice(start, end), context, { filename:'guide-star-mastery.js' });
  return context;
}

function emptyStats() {
  return {
    clock:{ bestSec:0 },
    observation:{ bestSec:0 },
    focus:{ bestSec:0 },
    vacancy:{ bestSec:0 },
    visual:{ bestSec:0 },
    auditory:{ bestSec:0 },
    asana:{ bestSec:0 },
    soulmirror:{ bestSec:0 }
  };
}

test('Clock contributes progressively to Fundamentals Mastery at 5, 10, and 15 minutes', () => {
  const context = loadBrightness();
  const stats = emptyStats();

  stats.clock.bestSec = 299;
  assert.equal(context.practiceTreeNodeBrightness('kether', stats), 0);
  stats.clock.bestSec = 300;
  assert.equal(context.practiceTreeNodeBrightness('kether', stats), 1);
  stats.clock.bestSec = 600;
  assert.equal(context.practiceTreeNodeBrightness('kether', stats), 2);
  stats.clock.bestSec = 900;
  assert.equal(context.practiceTreeNodeBrightness('kether', stats), 3);
});

test('Observation, Focus, and Vacancy each contribute independently to the top star', () => {
  const context = loadBrightness();
  const stats = emptyStats();

  stats.observation.bestSec = 900;
  const observationOnly = context.practiceTreeNodeBrightness('kether', stats);
  stats.focus.bestSec = 900;
  const withFocus = context.practiceTreeNodeBrightness('kether', stats);
  stats.vacancy.bestSec = 900;
  const allThoughtModes = context.practiceTreeNodeBrightness('kether', stats);

  assert.equal(observationOnly, 3);
  assert.equal(withFocus, 5);
  assert.equal(allThoughtModes, 8);
});

test('Visualization is half bright after Closed Eyes mastery and full after Open Eyes mastery', () => {
  const closed = loadBrightness(['closed']);
  const complete = loadBrightness(['closed', 'open']);
  const stats = emptyStats();

  assert.equal(closed.practiceTreeNodeBrightness('visual', stats), 10);
  assert.equal(complete.practiceTreeNodeBrightness('visual', stats), 20);
  assert.equal(closed.practiceTreeNodeBrightness('kether', stats), 1);
  assert.equal(complete.practiceTreeNodeBrightness('kether', stats), 3);
});
