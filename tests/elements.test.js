'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.join(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'elements-client.js'), 'utf8');

function load(extra) {
  const context = Object.assign({ console, navigator:{}, setInterval:() => 1, clearInterval:() => {} }, extra || {});
  vm.runInNewContext(source, context, { filename:'elements-client.js' });
  return context;
}

test('the four elements in the book\'s order, each with its own quality and colour', () => {
  const { EL_ELEMENTS } = load();
  assert.equal(EL_ELEMENTS.map(e => e.id).join(','), 'fire,air,water,earth');
  assert.equal(EL_ELEMENTS.map(e => e.quality).join(','), 'heat,lightness,cold,heaviness');
  assert.equal(EL_ELEMENTS.map(e => e.colorName).join('|'), 'red|blue|greenish-blue|yellow, grey or black');
});

test('breaths start at seven, add one per completed session, and stop at the book\'s limit', () => {
  const { elElement, elTargetBreaths } = load();
  const fire = elElement('fire'), air = elElement('air');
  assert.equal(elTargetBreaths(fire, 0), 7, 'first session');
  assert.equal(elTargetBreaths(fire, 7), 8, 'after completing seven');
  assert.equal(elTargetBreaths(fire, 4), 7, 'a session released after four breaths does not raise the count');
  assert.equal(elTargetBreaths(fire, 11), 12);
  assert.equal(elTargetBreaths(fire, 100), 30, 'twenty to thirty should suffice');
  assert.equal(elTargetBreaths(air, 100), 40, 'Air: do not exceed forty');
});

function session(context, breaths) {
  vm.runInContext('elSession = { pick:{ element:"fire", breaths:' + breaths + ', eyes:"closed", color:true }, phase:"in", inCount:0, outCount:0, startedAt:Date.now(), timer:null }; elRenderSession = function(){};', context);
}

test('the release takes exactly as many exhalations as there were inhalations', () => {
  const context = load();
  session(context, 3);
  for (let i = 0; i < 3; i++) context.elBreath();
  assert.equal(vm.runInContext('elSession.phase', context), 'out');
  context.elBreath(); context.elBreath();
  assert.equal(vm.runInContext('elSession.phase', context), 'out', 'two out of three is not yet released');
  context.elBreath();
  assert.equal(vm.runInContext('elSession.phase', context), 'rate');
});

test('ending early never leaves an element held: it moves to a matching release', () => {
  let toast = '';
  const context = load({ showToast: m => { toast = m; } });
  session(context, 10);
  context.elBreath(); context.elBreath(); context.elBreath(); context.elBreath();
  context.elDiscard();
  assert.equal(vm.runInContext('elSession.phase', context), 'out');
  assert.match(toast, /Release the Fire first/);
  context.elBreath(); context.elBreath(); context.elBreath();
  assert.equal(vm.runInContext('elSession.phase', context), 'out');
  context.elBreath();
  assert.equal(vm.runInContext('elSession.phase', context), 'rate', 'four in, four out');
});

test('a session is logged with its breaths and how clearly the quality was felt', () => {
  const { elEntry } = load();
  const e = elEntry({ element:'water', eyes:'open' }, 12, 3, 540, new Date('2026-11-26T07:00:00Z'));
  assert.equal(e.type, 'elements');
  assert.equal(e.element, 'water');
  assert.equal(e.breaths, 12);
  assert.equal(e.feeling, 3);
  assert.equal(e.eyesMode, 'open');
  assert.equal(e.durationSec, 540);
});

test('Elemental Work is a live Step III card with its own setup and banner', () => {
  const presence = fs.readFileSync(path.join(root, 'presence.html'), 'utf8');
  const step3 = presence.slice(presence.indexOf('<div class="conc-step-grid" data-step="3"'), presence.indexOf('<div class="conc-step-grid" data-step="4"'));
  assert.match(step3, /data-exercise="elements"/);
  assert.doesNotMatch(step3, /Coming Soon/);
  const vis = fs.readFileSync(path.join(root, 'visualization-client.js'), 'utf8');
  assert.match(vis, /elements: \{[\s\S]*?setupHTML: function\(\) \{ return buildElementsSetupHTML\(\); \}/);
  assert.match(fs.readFileSync(path.join(root, 'sw.js'), 'utf8'), /'elements-client\.js'/);
});

test('Step III exercises pay Akasha like every exercise, not only Dark Matter after Prestige 3', () => {
  // Dark Matter only exists from Prestige 3, so skipping Akasha left these
  // exercises paying nothing but XP for most practitioners.
  const el = fs.readFileSync(path.join(root, 'elements-client.js'), 'utf8');
  const ms = fs.readFileSync(path.join(root, 'multisense-steps-client.js'), 'utf8');
  [el, ms].forEach(src => {
    assert.doesNotMatch(src, /skipOmnia: true/);
    assert.match(src, /recordExerciseCompletion\(\{ entry: entry, exId: '(elements|multisense)'/);
    assert.match(src, /akashaDelta: akasha/);
  });
  const meta = fs.readFileSync(path.join(root, 'omnia-economy-config-client.js'), 'utf8');
  assert.match(meta, /elements: \{[^}]*minStep:3/);
  assert.match(meta, /multisense: \{[^}]*minStep:3/);
  const rewards = fs.readFileSync(path.join(root, 'omnia-rewards-client.js'), 'utf8');
  assert.match(rewards, /reachedStep >= OMNIA_EXERCISE_META\[id\]\.minStep/, 'Omnia never recommends them before Step III');
});
