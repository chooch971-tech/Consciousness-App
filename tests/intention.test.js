'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.join(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'intention-client.js'), 'utf8');
const server = fs.readFileSync(path.join(root, 'server.js'), 'utf8');

function load(today) {
  const store = {};
  const queued = [];
  const context = {
    console, window:{}, Date,
    localStorage:{ getItem:k => (k in store ? store[k] : null), setItem:(k, v) => { store[k] = String(v); } },
    presenceDayKey:d => {
      const x = d ? new Date(d) : new Date(today + 'T10:00:00');
      return x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0');
    },
    escHtml:s => String(s),
    completionFlowQueue:(id, priority) => { queued.push({ id, priority }); return true; }
  };
  vm.runInNewContext(source, context, { filename:'intention-client.js' });
  // Pin "now" for the module's own tomorrow calculation.
  vm.runInContext('intentionTomorrowKey = (function(orig) { return function() { return orig(new Date("' + today + 'T10:00:00")); }; })(intentionTomorrowKey);', context);
  return { context, store, queued };
}

test('the first session of a day asks about tomorrow, after the other ceremonies', () => {
  const { context, queued } = load('2026-11-25');
  context.intentionOnSession();
  assert.equal(queued.length, 1);
  assert.equal(queued[0].id, 'intention-prompt');
  assert.ok(queued[0].priority > 40, 'after streak, level-up and achievement reveals');
});

test('it asks at most once a day, and not when tomorrow is already planned', () => {
  const asked = load('2026-11-25');
  asked.store.presence_intention_prompted = '2026-11-25';
  asked.context.intentionOnSession();
  assert.equal(asked.queued.length, 0);

  const planned = load('2026-11-25');
  planned.store.presence_intention_v1 = JSON.stringify({ day:'2026-11-26', time:'07:00' });
  planned.context.intentionOnSession();
  assert.equal(planned.queued.length, 0);
});

test('practicing on the planned day marks the intention kept, once', () => {
  const { context, store } = load('2026-11-26');
  store.presence_intention_v1 = JSON.stringify({ day:'2026-11-26', time:'07:00', place:'at home', kept:false });
  context.intentionOnSession();
  assert.equal(context.window._pendingIntentionKept.place, 'at home');
  assert.equal(JSON.parse(store.presence_intention_v1).kept, true);
  context.intentionOnSession();
  assert.equal(context.window._pendingIntentionKept, null, 'a second session that day is not celebrated again');
});

test('the tutorial\'s first session never gets the prompt', () => {
  const { context, queued } = load('2026-11-25');
  context.window._tutorialFirstClock = true;
  context.intentionOnSession();
  assert.equal(queued.length, 0);
});

test('local times convert to the right moment', () => {
  const { context } = load('2026-11-25');
  const at = new Date(context.intentionAt('2026-11-26', '07:30'));
  assert.equal(at.getDate(), 26);
  assert.equal(at.getHours(), 7);
  assert.equal(at.getMinutes(), 30);
  assert.equal(context.intentionFmtTime('20:00'), '8:00 pm');
  assert.equal(context.intentionFmtTime('00:15'), '12:15 am');
});

test('the server only accepts near-future intentions and fires each one once, never late', () => {
  const route = server.slice(server.indexOf("app.post('/practice/intention'"), server.indexOf("app.post('/prayer/done'"));
  assert.match(route, /verifyPushOwner/);
  assert.match(route, /atMs <= now \|\| atMs > now \+ PRACTICE_INTENTION_MAX_AHEAD_MS/);
  const loop = server.slice(server.indexOf('async function processPracticeSchedules'), server.indexOf('let backgroundJobs'));
  assert.ok(loop.indexOf('schedule.intention') < loop.indexOf('if (!schedule.enabled) continue;'),
    'an intention fires even when daily reminders are off');
  assert.match(loop, /intent\.fired = true; \/\/ missed its window/);
});
