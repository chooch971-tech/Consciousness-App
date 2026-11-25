'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.join(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'personal-best-client.js'), 'utf8');

function load(extra) {
  const context = Object.assign({ console, window:{} }, extra || {});
  vm.runInNewContext(source, context, { filename:'personal-best-client.js' });
  return context;
}

const tc = (seconds, intrusions, durationSec, mode) =>
  ({ type:'thought', tcMode:mode || 'observation', seconds, intrusions, durationSec });

test('a first-ever session is not celebrated as a record — there was nothing to beat', () => {
  const { pbEvaluate } = load();
  const r = pbEvaluate(tc(90, 4, 300), [], {});
  assert.equal(r.isNewBest, false);
  assert.equal(r.record, 90, 'it still becomes the record to beat next time');
});

test('records set before the history cap or on another device still count', () => {
  const { pbEvaluate } = load();
  // The synced record (200s) is higher than anything left in local history.
  const r = pbEvaluate(tc(150, 4, 300), [tc(100, 5, 300)], { 'pb_thought:observation':200 });
  assert.equal(r.isNewBest, false, '150s must not beat a 200s record that only the synced map remembers');
  const r2 = pbEvaluate(tc(210, 4, 300), [tc(100, 5, 300)], { 'pb_thought:observation':200 });
  assert.equal(r2.isNewBest, true);
  assert.equal(r2.prevBest, 200);
});

test('records are kept per Thought Control mode and per eyes mode, never mixed', () => {
  const { pbEvaluate } = load();
  const r = pbEvaluate(tc(60, 2, 300, 'vacancy'), [tc(500, 1, 600, 'observation')], {});
  assert.equal(r.prevBest, 0, 'an Observation record is not a Vacancy record');
  const vis = (seconds, eyesMode) => ({ type:'visualization', seconds, eyesMode });
  const v = pbEvaluate(vis(40, 'open'), [vis(90, 'closed')], {});
  assert.equal(v.prevBest, 0);
});

test('fewer thoughts per minute is the improvement, and short sits do not count toward the rate', () => {
  const { pbEvaluate, pbTrendCaption } = load();
  const prior = [tc(60, 20, 600), tc(60, 20, 600), tc(60, 20, 600), tc(10, 1, 30)]; // last is 30s: excluded
  const r = pbEvaluate(tc(60, 10, 600), prior, {});
  assert.equal(r.avg, 2, 'average of the three qualifying sits, 2 thoughts/min');
  assert.equal(r.deltaPct, -50);
  assert.match(pbTrendCaption(r), /50% fewer thoughts per minute/);
});

test('an ordinary sit is described neutrally, never as falling short', () => {
  const { pbEvaluate, pbTrendCaption } = load();
  const vis = seconds => ({ type:'visualization', seconds, eyesMode:'closed' });
  const r = pbEvaluate(vis(30), [vis(60), vis(60), vis(60)], {});
  const caption = pbTrendCaption(r);
  assert.doesNotMatch(caption, /below|worse|fewer|less/i);
  assert.match(caption, /Recent average longest hold: 1:00/);
});

test('no trend is drawn until there are enough past sessions to make an average meaningful', () => {
  const { pbEvaluate, pbBannerHtml } = load();
  const clock = seconds => ({ seconds });
  const r = pbEvaluate(clock(50), [clock(40), clock(30)], {});
  assert.equal(r.series, null);
  assert.equal(pbBannerHtml(r), '', 'the Clock card shows its own PB, so with no trend there is nothing to add');
});

test('legacy Thought Control entries are read from their "N thoughts in" label', () => {
  const { pbThoughtCount } = load();
  assert.equal(pbThoughtCount({ object:'7 thoughts in 5:00' }), 7);
  assert.equal(pbThoughtCount({ intrusions:0, object:'9 thoughts in 5:00' }), 0);
  assert.equal(pbThoughtCount({ object:'' }), null);
});

test('completing a session raises the synced record and leaves a report for the result screen', () => {
  let saved = 0;
  const context = load({
    concState:{ history:[tc(100, 5, 300)] },
    achState:{ hwm:{} },
    achSave:() => { saved++; }
  });
  context.pbOnCompletion(tc(140, 3, 300));
  assert.equal(context.achState.hwm['pb_thought:observation'], 140);
  assert.equal(saved, 1);
  assert.equal(context.window._pendingPersonalBest.isNewBest, true);
  assert.match(context.pbBannerHtml(context.window._pendingPersonalBest), /New personal best/);
});

test('exercises measured only by time spent get no skill comparison', () => {
  const { pbDescribe } = load();
  assert.equal(pbDescribe({ exercise:'asana', seconds:600 }), null);
  assert.equal(pbDescribe({ type:'sense', seconds:600 }), null);
});

test('the module is loaded before the result screen and precached for offline use', () => {
  const presence = fs.readFileSync(path.join(root, 'presence.html'), 'utf8');
  const sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
  const pb = presence.indexOf('<script src="personal-best-client.js"></script>');
  assert.notEqual(pb, -1);
  assert.ok(pb < presence.indexOf('<script src="session-complete-client.js"></script>'));
  assert.match(sw, /'personal-best-client\.js'/);
});
