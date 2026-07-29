'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const guideSource = fs.readFileSync(path.join(__dirname, '..', 'guide-path-client.js'), 'utf8');

function loadBrightness(visualMasteries, history, options) {
  const start = guideSource.indexOf('function soulMirrorStarBrightness');
  const end = guideSource.indexOf('// Recency is an early-practice encouragement');
  const visual = visualMasteries || [];
  const opts = options || {};
  const context = {
    concState:{ lifetimeBreaths:opts.breaths || 0, history:history || [] },
    SOUL_MIRROR_NEG_GOAL:100,
    SOUL_MIRROR_POS_GOAL:60,
    loadSoulMirror:() => ({
      negative:Array.from({ length:opts.transformedTraits || 0 }, () => ({ done:true })),
      positive:[]
    }),
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
  assert.equal(context.practiceTreeNodeBrightness('kether', stats), 0.7);
  stats.clock.bestSec = 600;
  assert.equal(context.practiceTreeNodeBrightness('kether', stats), 1.3);
  stats.clock.bestSec = 900;
  assert.equal(context.practiceTreeNodeBrightness('kether', stats), 2);
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

  assert.equal(observationOnly, 2);
  assert.equal(withFocus, 4);
  assert.equal(allThoughtModes, 6);
});

test('Visualization is half bright after Closed Eyes mastery and full after Open Eyes mastery', () => {
  const closed = loadBrightness(['closed']);
  const complete = loadBrightness(['closed', 'open']);
  const stats = emptyStats();

  assert.equal(closed.practiceTreeNodeBrightness('visual', stats), 10);
  assert.equal(complete.practiceTreeNodeBrightness('visual', stats), 20);
  assert.equal(closed.practiceTreeNodeBrightness('kether', stats), 1);
  assert.equal(complete.practiceTreeNodeBrightness('kether', stats), 2);
});

test('Auditory fully lights after one clean five-minute hold', () => {
  const halted = loadBrightness([], [{
    type:'auditory', seconds:420, cleanSeconds:299, halts:1
  }]);
  const mastered = loadBrightness([], [{
    type:'auditory', seconds:420, cleanSeconds:300, halts:1
  }]);
  const stats = emptyStats();

  assert.equal(halted.practiceTreeNodeBrightness('auditory', stats), 0);
  assert.equal(mastered.practiceTreeNodeBrightness('auditory', stats), 20);
  assert.equal(mastered.practiceTreeNodeBrightness('kether', stats), 2);
});

test('each Senses mode and eye-state mastery adds one-sixth of its Star branch', () => {
  const history = [
    {
      exercise:'sense',
      senseReps:[
        { mode:'feeling', eyesMode:'closed', seconds:300, halts:0 },
        { mode:'feeling', eyesMode:'open', seconds:300, halts:0 },
        { mode:'smell', eyesMode:'closed', seconds:300, halts:0 },
        { mode:'smell', eyesMode:'open', seconds:299, halts:0 },
        { mode:'taste', eyesMode:'closed', seconds:420, halts:1 }
      ]
    }
  ];
  const context = loadBrightness([], history);
  const stats = emptyStats();

  assert.equal(context.sensesStarMasteryCount(), 3);
  assert.equal(context.practiceTreeNodeBrightness('sense', stats), 10);
  assert.equal(context.practiceTreeNodeBrightness('kether', stats), 1);
});

test('Asana contributes to Fundamentals at 10, 20, 25, and 30 minutes', () => {
  const context = loadBrightness();
  const stats = emptyStats();
  const expected = [
    [599, 0],
    [600, 0.5],
    [1200, 1],
    [1500, 1.5],
    [1800, 2]
  ];

  expected.forEach(([seconds, brightness]) => {
    stats.asana.bestSec = seconds;
    assert.equal(context.practiceTreeNodeBrightness('kether', stats), brightness);
  });
});

test('all ten completed branches fully light Fundamentals Mastery', () => {
  const senseReps = ['feeling', 'smell', 'taste'].flatMap(mode => [
    { mode, eyesMode:'closed', seconds:300, halts:0 },
    { mode, eyesMode:'open', seconds:300, halts:0 }
  ]);
  const context = loadBrightness(
    ['closed', 'open'],
    [
      { type:'auditory', cleanSeconds:300 },
      { exercise:'sense', senseReps }
    ],
    { breaths:5000, transformedTraits:5 }
  );
  const stats = emptyStats();
  stats.clock.bestSec = 900;
  stats.observation.bestSec = 900;
  stats.focus.bestSec = 900;
  stats.vacancy.bestSec = 900;
  stats.asana.bestSec = 1800;

  assert.equal(context.practiceTreeNodeBrightness('kether', stats), 20);
});
