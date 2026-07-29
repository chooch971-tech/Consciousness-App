'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const guideSource = fs.readFileSync(path.join(__dirname, '..', 'guide-path-client.js'), 'utf8');
const presenceSource = fs.readFileSync(path.join(__dirname, '..', 'presence.html'), 'utf8');

function loadBrightness(visualMasteries, history, options) {
  const start = guideSource.indexOf('function soulMirrorStarBrightness');
  const end = guideSource.indexOf('// Recency is an early-practice encouragement');
  const visual = visualMasteries || [];
  const opts = options || {};
  const seededHistory = (history || []).concat(visual.map(eyesMode => ({
    type:'visualization',
    eyesMode,
    cleanSeconds:300
  })));
  const context = {
    concState:{ lifetimeBreaths:opts.breaths || 0, history:seededHistory },
    state:{
      level:opts.awarenessLevel || 1,
      totalSessions:opts.awarenessSessions || 0,
      history:opts.awarenessHistory || []
    },
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
    thought:{ bestSec:0 },
    awareness:{ bestSec:0 },
    visual:{ bestSec:0 },
    auditory:{ bestSec:0 },
    asana:{ bestSec:0 },
    soulmirror:{ bestSec:0 }
  };
}

test('Clock contributes progressively to Fundamentals Mastery at 5, 10, and 15 minutes', () => {
  const context = loadBrightness();
  const stats = emptyStats();

  assert.equal(context.practiceTreeDisplayBrightness('clock', 15), 20);
  assert.equal(context.practiceTreeDisplayBrightness('visual', 20), 20);
  stats.clock.bestSec = 299;
  assert.equal(context.practiceTreeNodeBrightness('kether', stats), 0);
  stats.clock.bestSec = 300;
  assert.equal(context.practiceTreeNodeBrightness('kether', stats), 0.7);
  stats.clock.bestSec = 600;
  assert.equal(context.practiceTreeNodeBrightness('kether', stats), 1.5);
  stats.clock.bestSec = 900;
  assert.equal(context.practiceTreeNodeBrightness('kether', stats), 2.2);
});

test('Thought Control combines Observation, Focus, and Vacancy into one star', () => {
  const context = loadBrightness();
  const stats = emptyStats();

  stats.observation.bestSec = 900;
  const observationOnly = context.practiceTreeNodeBrightness('thought', stats);
  stats.focus.bestSec = 900;
  const withFocus = context.practiceTreeNodeBrightness('thought', stats);
  stats.vacancy.bestSec = 900;
  const allThoughtModes = context.practiceTreeNodeBrightness('thought', stats);

  assert.equal(observationOnly, 6.7);
  assert.equal(withFocus, 13.3);
  assert.equal(allThoughtModes, 20);
  assert.equal(context.practiceTreeNodeBrightness('kether', stats), 2.2);
});

test('Awareness brightens continuously and reaches full brightness at level 100', () => {
  const start = loadBrightness([], [], { awarenessLevel:1 });
  const halfway = loadBrightness([], [], { awarenessLevel:50 });
  const complete = loadBrightness([], [], { awarenessLevel:100 });
  const stats = emptyStats();

  assert.equal(start.practiceTreeNodeBrightness('awareness', stats), 0);
  assert.equal(halfway.practiceTreeNodeBrightness('awareness', stats), 9.9);
  assert.equal(complete.practiceTreeNodeBrightness('awareness', stats), 20);
  assert.equal(complete.practiceTreeNodeBrightness('kether', stats), 2.2);
});

test('Visualization earns two brightness points per clean minute in each eye mode', () => {
  const halted = loadBrightness([], [{
    type:'visualization', seconds:420, halts:1
  }]);
  const almostClosed = loadBrightness([], [{
    type:'visualization', cleanSeconds:290, halts:1
  }]);
  const closed = loadBrightness(['closed']);
  const openProgress = loadBrightness([], [
    { type:'visualization', cleanSeconds:300 },
    { type:'visualization', eyesMode:'open', cleanSeconds:179 }
  ]);
  const complete = loadBrightness(['closed', 'open']);
  const stats = emptyStats();

  assert.equal(halted.practiceTreeNodeBrightness('visual', stats), 0);
  assert.equal(almostClosed.practiceTreeVisualizationBest('closed'), 290);
  assert.equal(almostClosed.practiceTreeNodeBrightness('visual', stats), 8);
  assert.equal(closed.practiceTreeNodeBrightness('visual', stats), 10);
  assert.equal(openProgress.practiceTreeNodeBrightness('visual', stats), 14);
  assert.equal(complete.practiceTreeNodeBrightness('visual', stats), 20);
  assert.equal(closed.practiceTreeNodeBrightness('kether', stats), 1.1);
  assert.equal(complete.practiceTreeNodeBrightness('kether', stats), 2.2);
});

test('Visualization falls back to clean rep evidence and treats legacy sessions as Closed Eyes', () => {
  const context = loadBrightness([], [
    {
      type:'visualization',
      visualReps:[
        { seconds:240, halts:1 },
        { seconds:180, halts:0 }
      ]
    },
    {
      type:'visualization',
      eyesMode:'open',
      visualReps:[
        { seconds:120, halts:0 }
      ]
    }
  ]);
  const stats = emptyStats();

  assert.equal(context.practiceTreeVisualizationBest('closed'), 180);
  assert.equal(context.practiceTreeVisualizationBest('open'), 120);
  assert.equal(context.practiceTreeNodeBrightness('visual', stats), 10);
});

test('Auditory earns two brightness points per clean minute in each eye mode', () => {
  const halted = loadBrightness([], [{
    type:'auditory', seconds:420, halts:1
  }]);
  const almostClosed = loadBrightness([], [
    { type:'auditory', seconds:420, cleanSeconds:290, halts:1 }
  ]);
  const closedMastered = loadBrightness([], [
    { type:'auditory', cleanSeconds:300 }
  ]);
  const openProgress = loadBrightness([], [
    { type:'auditory', cleanSeconds:300 },
    { type:'auditory', eyesMode:'open', cleanSeconds:179 }
  ]);
  const fullyMastered = loadBrightness([], [
    { type:'auditory', cleanSeconds:300 },
    { type:'auditory', eyesMode:'open', cleanSeconds:300 }
  ]);
  const stats = emptyStats();

  assert.equal(halted.practiceTreeNodeBrightness('auditory', stats), 0);
  assert.equal(almostClosed.practiceTreeAuditoryBest('closed'), 290);
  assert.equal(almostClosed.practiceTreeNodeBrightness('auditory', stats), 8);
  assert.equal(closedMastered.practiceTreeNodeBrightness('auditory', stats), 10);
  assert.equal(openProgress.practiceTreeNodeBrightness('auditory', stats), 14);
  assert.equal(fullyMastered.practiceTreeNodeBrightness('auditory', stats), 20);
  assert.equal(closedMastered.practiceTreeNodeBrightness('kether', stats), 1.1);
  assert.equal(fullyMastered.practiceTreeNodeBrightness('kether', stats), 2.2);
});

test('Auditory falls back to clean rep evidence and treats legacy sessions as Closed Eyes', () => {
  const context = loadBrightness([], [
    {
      type:'auditory',
      auditoryReps:[
        { seconds:240, halts:1 },
        { seconds:180, halts:0 }
      ]
    },
    {
      type:'auditory',
      eyesMode:'open',
      auditoryReps:[
        { seconds:120, halts:0 }
      ]
    }
  ]);
  const stats = emptyStats();

  assert.equal(context.practiceTreeAuditoryBest('closed'), 180);
  assert.equal(context.practiceTreeAuditoryBest('open'), 120);
  assert.equal(context.practiceTreeNodeBrightness('auditory', stats), 10);
});

test('each clean minute across Senses modes and eye states advances its Star', () => {
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
  assert.equal(context.sensesStarMinuteCount(), 19);
  assert.equal(context.practiceTreeNodeBrightness('sense', stats), 12.7);
  assert.equal(context.practiceTreeNodeBrightness('kether', stats), 1.4);
});

test('Asana contributes to Fundamentals at 10, 20, 25, and 30 minutes', () => {
  const context = loadBrightness();
  const stats = emptyStats();
  const expected = [
    [599, 0],
    [600, 0.6],
    [1200, 1.1],
    [1500, 1.7],
    [1800, 2.2]
  ];

  expected.forEach(([seconds, brightness]) => {
    stats.asana.bestSec = seconds;
    assert.equal(context.practiceTreeNodeBrightness('kether', stats), brightness);
  });
});

test('all nine completed branches fully light Fundamentals Mastery', () => {
  const senseReps = ['feeling', 'smell', 'taste'].flatMap(mode => [
    { mode, eyesMode:'closed', seconds:300, halts:0 },
    { mode, eyesMode:'open', seconds:300, halts:0 }
  ]);
  const context = loadBrightness(
    ['closed', 'open'],
    [
      { type:'auditory', cleanSeconds:300 },
      { type:'auditory', eyesMode:'open', cleanSeconds:300 },
      { exercise:'sense', senseReps }
    ],
    { breaths:5000, transformedTraits:5, awarenessLevel:100 }
  );
  const stats = emptyStats();
  stats.clock.bestSec = 900;
  stats.observation.bestSec = 900;
  stats.focus.bestSec = 900;
  stats.vacancy.bestSec = 900;
  stats.asana.bestSec = 1800;

  assert.equal(context.practiceTreeNodeBrightness('kether', stats), 20);
});

test('Thought Control detail sheets use aggregate session stats', () => {
  const context = loadBrightness();
  const stats = {
    thought:{ count:12, bestSec:900 },
    observation:{ count:3, bestSec:600 },
    focus:{ count:4, bestSec:750 },
    vacancy:{ count:5, bestSec:840 }
  };

  assert.equal(context.practiceTreeNodeStats('thought', stats).count, 12);
  assert.equal(Object.keys(context.practiceTreeNodeStats('kether', stats)).length, 0);
});

test('Guide Star keeps ten nodes and replaces the old thought labels', () => {
  assert.doesNotMatch(guideSource, /label:'THT FOCUS'/);
  assert.doesNotMatch(guideSource, /label:'THOUGHT OBS\.'/);
  assert.match(guideSource, /id:'binah',\s+ex:'thought'.+label:'THOUGHT', label2:'CONTROL'/);
  assert.match(guideSource, /id:'geburah',\s+ex:'sense'.+label:'SENSES'/);
  assert.match(guideSource, /id:'tiphareth',\s+ex:'awareness'.+label:'AWARENESS'/);

  const nodesBlock = guideSource.slice(
    guideSource.indexOf('var NODES = ['),
    guideSource.indexOf('];', guideSource.indexOf('var NODES = ['))
  );
  assert.equal((nodesBlock.match(/id:'/g) || []).length, 10);
});

test('Guide Star detail sheets do not reserve an empty control-height footer', () => {
  const ruleStart = presenceSource.indexOf('.ptree-sheet {');
  const ruleEnd = presenceSource.indexOf('}', ruleStart);
  const sheetRule = presenceSource.slice(ruleStart, ruleEnd + 1);

  assert.notEqual(ruleStart, -1);
  assert.match(sheetRule, /padding:0 22px max\(env\(safe-area-inset-bottom,0px\),18px\)/);
  assert.doesNotMatch(sheetRule, /\+\s*48px/);
});

test('Guide Star progress bars replace stale widths before the sheet opens', () => {
  const barUpdateStart = guideSource.indexOf("sheetBar.style.transition = 'none'");
  const barUpdateEnd = guideSource.indexOf("sheetBar.style.transition = ''", barUpdateStart);
  const sheetOpen = guideSource.indexOf("sheet.classList.add('open')", barUpdateStart);

  assert.notEqual(barUpdateStart, -1);
  assert.ok(barUpdateEnd > barUpdateStart);
  assert.ok(sheetOpen > barUpdateEnd);
  assert.match(
    guideSource.slice(barUpdateStart, barUpdateEnd),
    /sheetBar\.style\.width = Math\.round\(b \/ max \* 100\) \+ '%';[\s\S]*void sheetBar\.offsetWidth;/
  );
});
