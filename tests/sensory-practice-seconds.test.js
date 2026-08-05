'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.join(__dirname, '..');
const guideSrc = fs.readFileSync(path.join(root, 'guide-path-client.js'), 'utf8');

function load() {
  const start = guideSrc.indexOf('var GUIDE_SENSORY_REP_KEYS');
  const end = guideSrc.indexOf('function guidePathEyesMode');
  assert.ok(start > -1 && end > start, 'the practice-seconds helpers must still be here');
  const ctx = { Array, parseInt, Math };
  vm.createContext(ctx);
  vm.runInContext(guideSrc.slice(start, end), ctx);
  return ctx;
}

test('a recorded wall clock is the practised time', () => {
  const g = load();
  assert.equal(g.guideSensoryEntryPracticeSec({ sessionDurationSec: 900, seconds: 180 }), 900);
});

test('without a wall clock, the session\'s own reps are summed', () => {
  const g = load();
  assert.equal(g.guideSensoryEntryPracticeSec(
    { seconds: 120, visualReps: [{ seconds: 120 }, { seconds: 180 }, { seconds: 300 }] }), 600);
  assert.equal(g.guideSensoryEntryPracticeSec(
    { seconds: 90, auditoryReps: [{ seconds: 90 }, { seconds: 150 }] }), 240);
  assert.equal(g.guideSensoryEntryPracticeSec(
    { seconds: 60, senseReps: [{ seconds: 60 }, { seconds: 60 }] }), 120);
});

test('an XP score is never read as a duration', () => {
  // These exercises award one XP per practised second, so xpEarned and the
  // session length happen to match today — but nothing holds them together.
  // A boost multiplier or a change to the XP curve would silently turn a score
  // into minutes of practice, and one save path already writes a flat 50 XP.
  // This figure drives the 10/15/20 session-length ladder, so a wrong reading
  // changes what the practitioner is told to sit.
  const g = load();
  assert.equal(g.guideSensoryEntryPracticeSec({ seconds: 120, xpEarned: 6000 }), 120,
    'a huge XP score must not inflate the practised time');
  assert.equal(g.guideSensoryEntryPracticeSec({ seconds: 600, xpEarned: 50 }), 600,
    'nor a flat XP score deflate it');
  assert.doesNotMatch(guideSrc.slice(
    guideSrc.indexOf('function guideSensoryEntryPracticeSec'),
    guideSrc.indexOf('function guidePathEyesMode')), /xpEarned/,
    'the reader must not touch the XP field at all');
});

test('the last resort is the stored seconds, and never negative', () => {
  const g = load();
  assert.equal(g.guideSensoryEntryPracticeSec({ seconds: 240 }), 240);
  assert.equal(g.guideSensoryEntryPracticeSec({}), 0);
  assert.equal(g.guideSensoryEntryPracticeSec(null), 0);
  assert.equal(g.guideSensoryEntryPracticeSec({ seconds: -50 }), 0);
  assert.equal(g.guideSensoryEntryPracticeSec({ sessionDurationSec: -900, seconds: 60 }), 60,
    'a nonsense wall clock falls through rather than going negative');
});

test('empty or malformed rep arrays fall through instead of scoring zero', () => {
  const g = load();
  assert.equal(g.guideSensoryEntryPracticeSec({ seconds: 300, visualReps: [] }), 300);
  assert.equal(g.guideSensoryEntryPracticeSec({ seconds: 300, senseReps: [{}, {}] }), 300);
  assert.equal(g.guideSensoryEntryPracticeSec({ seconds: 300, auditoryReps: 'nope' }), 300);
});
