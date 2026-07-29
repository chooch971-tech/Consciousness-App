'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const guideSource = fs.readFileSync(path.join(__dirname, '..', 'guide-path-client.js'), 'utf8');

function loadRecency(options) {
  const start = guideSource.indexOf('function practiceTreeNodeFirstMasteryMet');
  const end = guideSource.indexOf('function practiceTreeNodeDepth');
  const mastered = new Set((options && options.mastered) || []);
  const thoughtBest = Object.assign({}, options && options.thoughtBest);
  const context = {
    concState:{ history:(options && options.history) || [] },
    state:{ level:(options && options.awarenessLevel) || 1 },
    ACH_MASTERY_DEFS:() => [
      'Clock',
      'Visualization',
      'Auditory',
      'Asana',
      'Soul Mirror',
      'Pore Breathing'
    ].map(ex => ({ ex, m:mastered.has(ex) })),
    achTCBest:mode => thoughtBest[mode] || 0
  };
  vm.runInNewContext(guideSource.slice(start, end), context, { filename:'guide-star-recency.js' });
  return context;
}

function daysAgo(days) {
  return Date.now() - days * 86400000;
}

test('unmastered Guide Star auras still fade with inactivity', () => {
  const context = loadRecency();
  const stats = { clock:{ lastMs:daysAgo(70) } };

  assert.equal(context.practiceTreeNodeRecency('clock', stats), 0.2);
  assert.equal(context.practiceTreeNodeRecency('clock', { clock:{ lastMs:daysAgo(2) } }), 1);
});

test('first mastery permanently stabilizes an exercise aura and pulse', () => {
  const context = loadRecency({ mastered:['Clock', 'Visualization', 'Asana', 'Soul Mirror', 'Pore Breathing'] });
  const stale = daysAgo(500);
  const stats = {
    clock:{ lastMs:stale },
    visual:{ lastMs:stale },
    asana:{ lastMs:stale },
    soulmirror:{ lastMs:stale },
    pore:{ lastMs:stale }
  };

  ['clock', 'visual', 'asana', 'soulmirror', 'pore'].forEach(exId => {
    assert.equal(context.practiceTreeNodeRecency(exId, stats), 1, exId);
  });
});

test('Thought Control stabilizes only after all three modes reach ten minutes', () => {
  const stale = daysAgo(70);
  const stats = {
    observation:{ bestSec:600, lastMs:stale },
    focus:{ bestSec:599, lastMs:stale },
    vacancy:{ bestSec:900, lastMs:stale },
    thought:{ lastMs:stale }
  };
  const incomplete = loadRecency({
    thoughtBest:{ observation:600, focus:599, vacancy:900 }
  });
  const complete = loadRecency({
    thoughtBest:{ observation:600, focus:600, vacancy:900 }
  });

  assert.equal(incomplete.practiceTreeNodeRecency('thought', stats), 0.2);
  assert.equal(complete.practiceTreeNodeRecency('thought', stats), 1);
});

test('Awareness stabilizes at its first level milestone', () => {
  const staleStats = { awareness:{ lastMs:daysAgo(70) } };
  assert.equal(loadRecency({ awarenessLevel:24 }).practiceTreeNodeRecency('awareness', staleStats), 0.2);
  assert.equal(loadRecency({ awarenessLevel:25 }).practiceTreeNodeRecency('awareness', staleStats), 1);
});

test('Fundamentals Mastery remains a composite rather than a decaying exercise', () => {
  const context = loadRecency();
  assert.equal(context.practiceTreeNodeRecency('kether', {}), 0.15);
});
