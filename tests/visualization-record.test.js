'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '..', 'visualization-client.js'), 'utf8');

function loadRecord(history, openEyes) {
  const start = source.indexOf('function getVisualizationBest');
  const end = source.indexOf('function visImageTypeOptionsHTML');
  const context = {
    concState: { history: history || [] },
    visOpenEyesMode: openEyes === true,
    document: { getElementById: () => null }
  };
  vm.runInNewContext(source.slice(start, end), context, { filename:'visualization-record.js' });
  return context;
}

test('Visualization records keep Closed and Open Eyes bests separate', () => {
  const context = loadRecord([
    { type:'visualization', cleanSeconds:180 },
    { type:'visualization', eyesMode:'closed', cleanSeconds:305 },
    { type:'visualization', eyesMode:'open', cleanSeconds:245 },
    { type:'visualization', eyesMode:'open', cleanSeconds:450 }
  ]);

  assert.equal(context.getVisualizationBest('closed'), 305);
  assert.equal(context.getVisualizationBest('open'), 450);
});

test('Visualization records accept only halt-free legacy rep evidence', () => {
  const context = loadRecord([
    {
      type:'visualization',
      visualReps:[
        { seconds:510, halts:2 },
        { seconds:420, halts:0 }
      ]
    },
    { type:'visualization', seconds:600, halts:1 },
    { type:'visualization', eyesMode:'open', seconds:360, halts:0 }
  ]);

  assert.equal(context.getVisualizationBest('closed'), 420);
  assert.equal(context.getVisualizationBest('open'), 360);
});

test('Visualization record copy follows the selected eye mode', () => {
  const closed = loadRecord([{ type:'visualization', cleanSeconds:305 }], false);
  assert.match(closed.visualizationRecordHTML(), /Closed Eyes Record/);
  assert.match(closed.visualizationRecordHTML(), /5<small>m<\/small> 5<small>s<\/small>/);

  const open = loadRecord([{ type:'visualization', eyesMode:'open', cleanSeconds:75 }], true);
  assert.match(open.visualizationRecordHTML(), /Open Eyes Record/);
  assert.match(open.visualizationRecordHTML(), /1<small>m<\/small> 15<small>s<\/small>/);
});
