'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const guideSource = fs.readFileSync(path.join(__dirname, '..', 'guide-path-client.js'), 'utf8');

function loadStats(history) {
  const start = guideSource.indexOf('function guideHistoryExerciseId');
  const end = guideSource.indexOf('function guideMonitoredScore');
  const context = {
    concState:{ history },
    GUIDE_EXERCISES:[
      { id:'clock' },
      { id:'visual' },
      { id:'auditory' },
      { id:'sense' },
      { id:'thought' },
      { id:'asana' },
      { id:'soulmirror' }
    ],
    guideThoughtDuration:session => session.seconds || 0,
    guideSessionSec:session => session.seconds || 0,
    guideIsToday:() => false
  };
  vm.runInNewContext(guideSource.slice(start, end), context, { filename:'guide-star-stats.js' });
  return context;
}

test('Pore Breathing and Soul Mirror maintain independent Guide Star statistics', () => {
  const context = loadStats([
    { date:'2026-07-29T10:00:00.000Z', exercise:'pore_breathing', seconds:120 },
    { date:'2026-07-28T10:00:00.000Z', exercise:'pore_breathing', seconds:180 },
    { date:'2026-07-27T10:00:00.000Z', exercise:'autosuggestion', seconds:300 }
  ]);
  const stats = context.guideExerciseStats();

  assert.equal(context.guideHistoryExerciseId({ exercise:'pore_breathing' }), 'pore');
  assert.equal(stats.pore.count, 2);
  assert.equal(stats.pore.bestSec, 180);
  assert.equal(stats.soulmirror.count, 1);
  assert.equal(stats.soulmirror.bestSec, 300);
});
