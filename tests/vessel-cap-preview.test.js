'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const engineSrc = read('omnia-engine-client.js');

function createContext() {
  const context = {
    Date, Math, JSON, setTimeout, clearTimeout,
    document: {
      getElementById: () => null,
      querySelector: () => null,
      querySelectorAll: () => [],
      createElement: () => ({ style: {}, remove() {} }),
      body: { appendChild() {} },
      addEventListener() {}
    },
    navigator: {}, window: {},
    localStorage: { getItem: () => null, setItem() {} },
    showConfirm() {}, showToast() {}, saveOmniaState() {}, renderOmniaEngine() {}
  };
  vm.createContext(context);
  vm.runInContext(read('omnia-economy-config-client.js'), context);
  vm.runInContext(read('omnia-progression-config-client.js'), context);
  context.omniaState = JSON.parse(JSON.stringify(context.OMNIA_DEFAULT));
  context.omniaState.upgradeBuilds = {};
  context.omniaState.reservoirs = {};
  vm.runInContext(read('omnia-economy-client.js'), context);
  vm.runInContext(engineSrc, context);
  return context;
}

test('the preview reports the capacity held now and the one being bought', () => {
  // Buying Deep Vessel used to show a price and a build time with no statement
  // of what it bought, so the one track whose effect is a plain number was the
  // only one that never showed it.
  const game = createContext();
  Object.assign(game.omniaState.upgrades, { current: 8, vessel: 8 });
  const p = game.omniaPreviewVesselCapGain('vessel');
  assert.equal(p.before, game.omniaVesselReservoirCap('vessel', 8));
  assert.equal(p.after, game.omniaVesselReservoirCap('vessel', 9));
  assert.ok(p.after > p.before, 'a level must buy capacity');
  // "before" is the number the sheet header already prints as the reservoir
  // cap, so the two readouts on one screen can never disagree.
  assert.equal(p.before, game.omniaReservoirCap());
});

test('the preview follows the band, not the lifetime level', () => {
  // A tiered pump reads capacity from its band level; the preview has to read
  // it the same way or it would promise a jump the purchase does not deliver.
  const flat = createContext();
  Object.assign(flat.omniaState.upgrades, { vessel: 3 });
  flat.omniaState.genTiers = { current: 0 };
  const a = flat.omniaPreviewVesselCapGain('vessel');

  const tiered = createContext();
  Object.assign(tiered.omniaState.upgrades, { vessel: 23 });
  tiered.omniaState.genTiers = { current: 1 };
  const b = tiered.omniaPreviewVesselCapGain('vessel');

  assert.equal(b.before, a.before * 2.5, 'Tier I scales the same band level by 2.5');
  assert.equal(b.after, a.after * 2.5);
});

test('every akasha pump vessel track is previewable', () => {
  const game = createContext();
  ['vessel', 'vessel2', 'vessel3'].forEach(id => {
    game.omniaState.upgrades[id] = 4;
    const p = game.omniaPreviewVesselCapGain(id);
    assert.ok(p.after > p.before, id + ' must preview a gain');
  });
});

test('an unlevelled vessel previews from its real floor', () => {
  const game = createContext();
  game.omniaState.upgrades.vessel = 1;
  const p = game.omniaPreviewVesselCapGain('vessel');
  assert.equal(p.before, game.omniaVesselReservoirCap('vessel', 1));
  assert.ok(p.after > p.before);
});

test('the sheet prints the preview for Deep Vessel, not only the current track', () => {
  const start = engineSrc.indexOf("var ratePreview = '';", engineSrc.indexOf('function renderGenSheet'));
  const end = engineSrc.indexOf('var right =', start);
  assert.ok(start > -1 && end > start, 'the preview block must still be here');
  const block = engineSrc.slice(start, end);
  assert.match(block, /id === meta\.vessel/, 'the vessel track is previewed');
  assert.match(block, /omniaPreviewVesselCapGain/);
  assert.match(block, /capacity<\/div>/, 'and labelled as capacity, not a rate');
  // Attunement and Quickening state their effect as a percentage in the
  // sub-line, so a raw before/after there would add nothing.
  assert.doesNotMatch(block, /meta\.attune|meta\.quick/,
    'only the two tracks with a numeric effect get a preview');
  // A preview must never survive into a state with no next level to buy.
  assert.match(block, /!atMax && !atBandTop && !building && !pumpBusyId/,
    'suppressed at the band top, mid-build, and while another track builds');
});
