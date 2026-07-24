'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '..', 'senses-client.js'), 'utf8');

function loadSensesContext(seed) {
  const values = new Map(Object.entries(seed || {}));
  const context = {
    console,
    document: { getElementById: () => null },
    localStorage: {
      getItem: key => values.has(key) ? values.get(key) : null,
      setItem: (key, value) => values.set(key, String(value))
    }
  };
  vm.runInNewContext(source, context, { filename: 'senses-client.js' });
  context.values = values;
  return context;
}

test('Senses exposes the four requested feeling practices as selectable cues', () => {
  const context = loadSensesContext();
  const feelings = Array.from(context.SENSE_MODE_DEFS.feeling.cues);
  assert.deepEqual(feelings.slice(0, 4), ['Warmth', 'Coldness', 'Tiredness', 'Hunger']);
});

test('custom senses are sanitized, categorized, deduplicated, and included in choices', () => {
  const context = loadSensesContext();
  const saved = context.saveCustomSenses([
    { id: 'custom one', mode: 'smell', label: '  Cedar   smoke  ' },
    { id: 'duplicate', mode: 'smell', label: 'cedar smoke' },
    { id: 'bad', mode: 'unknown', label: 'Ignore me' },
    { id: 'custom-two', mode: 'feeling', label: 'Weightlessness' }
  ]);
  assert.equal(saved.length, 2);
  assert.equal(saved[0].id, 'customone');
  assert.equal(saved[0].label, 'Cedar smoke');
  assert.equal(saved[1].mode, 'feeling');

  const smellChoices = Array.from(context.senseChoicesForMode('smell'), choice => ({
    label: choice.label,
    custom: choice.custom
  }));
  assert.ok(smellChoices.some(choice => choice.label === 'Cedar smoke' && choice.custom));
  assert.equal(smellChoices.filter(choice => choice.label.toLowerCase() === 'cedar smoke').length, 1);
});

test('Senses session source retains rep timers, halt tracking, and per-rep persistence', () => {
  assert.match(source, /senseSessionStartTime/);
  assert.match(source, /senseRepStartTime/);
  assert.match(source, /function\s+recordSenseHalt\s*\(/);
  assert.match(source, /function\s+sensationFaded\s*\(/);
  assert.match(source, /senseReps\.push\(\{/);
  assert.match(source, /senseReps:\s*senseReps\.map/);
});

test('the first Senses rep waits for an explicit Begin action before either timer starts', () => {
  const startSession = source.slice(
    source.indexOf('function startSenseSession()'),
    source.indexOf('function startSenseRep()')
  );
  assert.match(startSession, /senseSessionStartTime = null/);
  assert.match(startSession, /beginBtn\.textContent = 'Begin Rep 1'/);
  assert.doesNotMatch(startSession, /startSenseRep\(\)/);
  assert.doesNotMatch(startSession, /tickSenseTimers\(\)/);

  const startRep = source.slice(
    source.indexOf('function startSenseRep()'),
    source.indexOf('function tickSenseTimers()')
  );
  assert.match(startRep, /senseSessionStartTime = Date\.now\(\)/);
  assert.match(startRep, /tickSenseTimers\(\)/);
});
