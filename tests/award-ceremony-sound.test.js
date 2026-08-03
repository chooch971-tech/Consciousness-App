'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.join(__dirname, '..');
const rewardsSource = fs.readFileSync(path.join(root, 'omnia-rewards-client.js'), 'utf8');
const achSource = fs.readFileSync(path.join(root, 'achievements-client.js'), 'utf8');

// Runs the real body-level sound against a recording stub, so the pitches are
// observed rather than restated.
function playBody(body, soundEnabled) {
  const notes = [];
  const filters = [];
  function param(store) {
    return { value: 0, setValueAtTime(v) { store.push(v); }, linearRampToValueAtTime() {},
             exponentialRampToValueAtTime() {} };
  }
  const ctx = {
    state: 'suspended', resumed: false, currentTime: 0,
    resume() { this.resumed = true; },
    destination: {},
    createBiquadFilter() {
      const f = { type: '', Q: {}, frequency: param([]), connect() {} };
      filters.push(f); return f;
    },
    createOscillator() {
      const freqs = [];
      const o = { type: '', frequency: Object.assign(param(freqs), { linearRampToValueAtTime() {} }),
                  connect() {}, start() { notes.push({ type: o.type, freq: freqs[0] }); }, stop() {} };
      return o;
    },
    createGain() { return { gain: param([]), connect() {} }; }
  };
  const sandbox = {
    window: { AudioContext: function () { return ctx; } },
    appSoundEnabled: () => soundEnabled !== false,
    console
  };
  sandbox.AudioContext = sandbox.window.AudioContext;
  vm.createContext(sandbox);
  const start = rewardsSource.indexOf('var BLA_SOUND_ROOT');
  const end = rewardsSource.indexOf('function showBodyLevelAward');
  assert.ok(start > -1 && end > start, 'the body sound must still live above the overlay');
  vm.runInContext(rewardsSource.slice(start, end), sandbox, { filename: 'bla-sound.js' });
  sandbox.playBodyLevelSound(body);
  return { notes, filters, ctx };
}

test('a body level makes a sound at all', () => {
  // It had none: the achievement reveal has had its arpeggio all along, while
  // a body level appeared in silence.
  const { notes } = playBody('physical');
  assert.ok(notes.length >= 3, 'expected a chord, got ' + notes.length + ' notes');
});

test('the body sound sits far below the achievement arpeggio', () => {
  // The achievement reveal runs C5-E5-G5-C6 with harmonics past 2kHz. The body
  // swell must not land in that register or the two ceremonies blur together.
  const { notes } = playBody('mental'); // the highest-pitched body
  const highest = Math.max(...notes.map((n) => n.freq));
  assert.ok(highest < 700, 'body sound reaches ' + highest + 'Hz, too close to the arpeggio');
  assert.match(achSource, /523\.25, 659\.25, 783\.99, 1046\.5/, 'achievement arpeggio unchanged');
});

test('each body is pitched differently', () => {
  const roots = ['physical', 'astral', 'mental'].map((b) => playBody(b).notes[0].freq);
  assert.equal(new Set(roots).size, 3, 'all three bodies must differ');
  assert.ok(roots[0] < roots[1] && roots[1] < roots[2], 'physical lowest, mental highest');
});

test('the sound respects the app sound setting', () => {
  const { notes } = playBody('physical', false);
  assert.equal(notes.length, 0, 'must play nothing when sound is off');
});

test('both ceremonies resume a suspended context', () => {
  // They fire after a session rather than from a tap, so an autoplay policy can
  // hand back a suspended context and the sound never arrives.
  assert.equal(playBody('physical').ctx.resumed, true, 'body sound must resume');
  const achBlock = achSource.slice(achSource.indexOf('function _achRevealSound'),
                                   achSource.indexOf('function achSeed'));
  assert.match(achBlock, /state === 'suspended'/, 'achievement sound must resume too');
});

test('the overlay actually plays it', () => {
  const block = rewardsSource.slice(rewardsSource.indexOf('function showBodyLevelAward'));
  assert.match(block, /playBodyLevelSound\(award\.body\)/,
    'showBodyLevelAward must fire the sound for the body it is announcing');
});
