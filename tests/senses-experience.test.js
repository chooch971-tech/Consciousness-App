'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '..', 'senses-client.js'), 'utf8');
const presenceSource = fs.readFileSync(path.join(__dirname, '..', 'presence.html'), 'utf8');
const journalSource = fs.readFileSync(path.join(__dirname, '..', 'journal-client.js'), 'utf8');
const historySource = fs.readFileSync(path.join(__dirname, '..', 'concentration-clock-client.js'), 'utf8');
const reportsSource = fs.readFileSync(path.join(__dirname, '..', 'reports-client.js'), 'utf8');

function loadSensesContext(seed) {
  const values = new Map(Object.entries(seed || {}));
  const context = {
    console,
    document: { getElementById: () => null },
    showToast: () => {},
    concState: { history: [] },
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
  assert.match(startSession, /beginBtn\.textContent = senseBeginLabel\(1\)/);
  assert.doesNotMatch(startSession, /startSenseRep\(\)/);
  assert.doesNotMatch(startSession, /tickSenseTimers\(\)/);

  const startRep = source.slice(
    source.indexOf('function startSenseRep()'),
    source.indexOf('function tickSenseTimers()')
  );
  assert.match(startRep, /senseSessionStartTime = Date\.now\(\)/);
  assert.match(startRep, /tickSenseTimers\(\)/);
  assert.match(startRep, /setInterval\(tickSenseTimers,\s*250\)/);
});

test('Feeling offers only the four intentional body-state senses', () => {
  const context = loadSensesContext();
  assert.deepEqual(
    Array.from(context.SENSE_MODE_DEFS.feeling.cues),
    ['Warmth', 'Coldness', 'Tiredness', 'Hunger']
  );
});

test('Feeling, Smell, and Taste each begin with exactly four defaults', () => {
  const context = loadSensesContext();
  assert.deepEqual(Array.from(context.SENSE_MODE_DEFS.feeling.cues), ['Warmth', 'Coldness', 'Tiredness', 'Hunger']);
  assert.deepEqual(Array.from(context.SENSE_MODE_DEFS.smell.cues), [
    'Fresh rain on warm earth', 'A rose in full bloom', 'Coffee brewing', 'Pine forest after snow'
  ]);
  assert.deepEqual(Array.from(context.SENSE_MODE_DEFS.taste.cues), [
    'Honey', 'Ripe lemon', 'Dark chocolate', 'Fresh mint'
  ]);
});

test('default senses can be removed and restored through synced library preferences', () => {
  const context = loadSensesContext();
  context.toggleDefaultSense('smell', 0);
  assert.equal(context.senseChoicesForMode('smell').some(choice => choice.label === 'Fresh rain on warm earth'), false);
  const stored = JSON.parse(context.values.get(context.SENSE_CUSTOM_KEY));
  assert.deepEqual(stored[0], {
    id: 'default_smell_0',
    mode: 'smell',
    label: 'Fresh rain on warm earth',
    hiddenDefault: true
  });
  context.toggleDefaultSense('smell', 0);
  assert.equal(context.senseChoicesForMode('smell').some(choice => choice.label === 'Fresh rain on warm earth'), true);
});

test('Closed eyes is the default and Open Eyes is the advanced mode', () => {
  const context = loadSensesContext();
  assert.equal(context.senseEyesMode, 'closed');
  assert.equal(context.normalizeSenseEyesMode('anything-else'), 'closed');
  assert.equal(context.normalizeSenseEyesMode('open'), 'open');
  assert.match(source, /<small>Advanced<\/small>/);
  assert.doesNotMatch(source, /Advanced successor/);
  assert.match(source, /senseEyesLabel\(senseEyesMode\) \+ ' Record'/);
  assert.doesNotMatch(source, /'Clean ' \+ senseEyesLabel/);
  assert.match(source, /eyesMode:\s*senseActiveEyesMode/);
  assert.match(source, /eyesMode:\s*rep\.eyesMode/);
});

test('the sticky setup Begin bar stays above Senses mastery targets while scrolling', () => {
  assert.match(presenceSource, /\.ex-setup-beginbar\s*\{\s*margin-top:auto;\s*z-index:30;\s*\}/);
  assert.match(presenceSource, /\.sense-mastery-node\s*\{[^}]*z-index:1;/);
});

test('Senses mastery uses clean 5, 7.5, and 10 minute reps per eyes mode', () => {
  const context = loadSensesContext();
  context.concState.history = [
    {
      exercise: 'sense', mode: 'feeling', eyesMode: 'closed', seconds: 610,
      senseReps: [
        { mode: 'feeling', eyesMode: 'closed', seconds: 610, halts: 2 },
        { mode: 'feeling', eyesMode: 'closed', seconds: 460, halts: 0 }
      ]
    },
    {
      exercise: 'sense', mode: 'feeling', eyesMode: 'open', seconds: 305,
      senseReps: [{ mode: 'feeling', eyesMode: 'open', seconds: 305, halts: 0 }]
    }
  ];
  assert.deepEqual(Array.from(context.SENSE_MASTERY_THRESHOLDS), [300, 450, 600]);
  assert.equal(context.getSenseBest('feeling', 'closed'), 460, 'halted time must not advance mastery');
  assert.equal(context.getSenseBest('feeling', 'open'), 305, 'open eyes keeps its own advanced record');
  assert.equal(context.senseMasteryTier(299), 0);
  assert.equal(context.senseMasteryTier(300), 1);
  assert.equal(context.senseMasteryTier(450), 2);
  assert.equal(context.senseMasteryTier(600), 3);
});

test('Journal, history, and Practice Review expose the saved Senses eyes mode', () => {
  assert.match(journalSource, /h\.eyesMode==='open'\?'Open eyes':'Closed eyes'/);
  assert.match(historySource, /h\.eyesMode === 'open' \? 'Open Eyes' : 'Closed Eyes'/);
  assert.match(reportsSource, /openEyesSessions/);
  assert.match(reportsSource, /advanced_successor:true/);
});
