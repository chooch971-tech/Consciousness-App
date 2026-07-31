const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

// Boots the real state + economy modules over a chosen saved payload, so these
// exercise the actual load migration rather than a restatement of it.
function loadSave(saved) {
  const store = {};
  if (saved !== null) store.presence_omnia_v1 = JSON.stringify(saved);
  const context = {
    Date, Math, JSON, setTimeout, clearTimeout, console,
    document: { getElementById: () => null, querySelector: () => null,
      createElement: () => ({ style: {}, remove() {} }), body: { appendChild() {} },
      addEventListener() {} },
    navigator: {}, window: {},
    localStorage: {
      getItem: (k) => (k in store ? store[k] : null),
      setItem(k, v) { store[k] = String(v); },
      removeItem(k) { delete store[k]; }
    },
    showToast() {}, showConfirm() {}, renderOmniaEngine() {},
    shouldTakeCloudValue: () => false
  };
  vm.createContext(context);
  vm.runInContext(read('omnia-economy-config-client.js'), context);
  vm.runInContext(read('omnia-progression-config-client.js'), context);
  vm.runInContext(read('omnia-state-client.js'), context);
  context.omniaState = vm.runInContext('loadOmniaState()', context);
  vm.runInContext(read('omnia-economy-client.js'), context);
  return context;
}

const GEN1 = ['current', 'vessel', 'attunement', 'quickening'];

test('a track below its generator band is lifted to the band floor', () => {
  // The reported save: one track past 20, the other three in the teens. The
  // migration seeded tier 1 off the highest track, leaving the rest under the
  // band floor where the card clamped them to "1 / 20" forever.
  const ctx = loadSave({
    akasha: 500000,
    upgrades: { current: 22, vessel: 13, attunement: 13, quickening: 13 },
    genTiers: { current: 1, gen2: 0, gen3: 0 }
  });
  assert.equal(ctx.omniaState.genTiers.current, 1, 'tier is preserved, not lowered');
  assert.equal(ctx.omniaState.upgrades.current, 22, 'the leading track is untouched');
  for (const id of ['vessel', 'attunement', 'quickening']) {
    assert.equal(ctx.omniaState.upgrades[id], 21, id + ' lifted to the tier-1 floor');
  }
});

test('every track sits at or above its band floor after load', () => {
  const ctx = loadSave({
    upgrades: { current: 45, vessel: 3, attunement: 1, quickening: 41 },
    genTiers: { current: 2, gen2: 0, gen3: 0 }
  });
  const display = (id) => vm.runInContext(`omniaUpgradeDisplayLevel(${JSON.stringify(id)})`, ctx);
  for (const id of GEN1) {
    assert.ok(ctx.omniaState.upgrades[id] >= 41, id + ' at or above the tier-2 floor');
    assert.ok(display(id) >= 1 && display(id) <= 20, id + ' shows a real band level');
  }
});

test('buying an upgrade always moves the number on the card', () => {
  const ctx = loadSave({
    upgrades: { current: 22, vessel: 13, attunement: 13, quickening: 13 },
    genTiers: { current: 1, gen2: 0, gen3: 0 }
  });
  const display = () => vm.runInContext('omniaUpgradeDisplayLevel("attunement")', ctx);
  const before = display();
  ctx.omniaState.upgrades.attunement += 1;
  assert.equal(display(), before + 1, 'one purchase advances the shown level by one');
});

test('the repair heals saves that already took the bad seeding', () => {
  // genTiers present means the first-run seeding block is skipped entirely;
  // the repair has to run on every load or these saves stay broken.
  const ctx = loadSave({
    upgrades: { current: 22, vessel: 13, attunement: 14, quickening: 13 },
    genTiers: { current: 1, gen2: 0, gen3: 0 }
  });
  assert.equal(ctx.omniaState.upgrades.attunement, 21);
  assert.equal(ctx.omniaState.upgrades.vessel, 21);
});

test('a fresh save is left alone', () => {
  const ctx = loadSave(null);
  assert.equal(ctx.omniaState.genTiers.current, 0);
  for (const id of GEN1) assert.equal(ctx.omniaState.upgrades[id], 1, id + ' starts at 1');
});

test('a save already consistent with its band is not inflated', () => {
  const ctx = loadSave({
    upgrades: { current: 30, vessel: 25, attunement: 21, quickening: 40 },
    genTiers: { current: 1, gen2: 0, gen3: 0 }
  });
  assert.deepEqual(
    GEN1.map((id) => ctx.omniaState.upgrades[id]),
    [30, 25, 21, 40],
    'levels already inside the band are untouched'
  );
});

test('first-run seeding still takes the highest track, then levels the rest', () => {
  const ctx = loadSave({
    upgrades: { current: 22, vessel: 13, attunement: 13, quickening: 13 }
    // no genTiers at all -> the original migration path
  });
  assert.equal(ctx.omniaState.genTiers.current, 1, 'seeded from the leading track');
  for (const id of ['vessel', 'attunement', 'quickening']) {
    assert.equal(ctx.omniaState.upgrades[id], 21, id + ' brought up to that band');
  }
});

test('the track groups have one definition shared by both modules', () => {
  const stateSrc = read('omnia-state-client.js');
  const economySrc = read('omnia-economy-client.js');
  assert.match(stateSrc, /var OMNIA_TIER_TRACK_GROUPS\s*=/);
  assert.match(economySrc, /OMNIA_TIER_TRACK_GROUPS/);
  const ctx = loadSave(null);
  // Compared as JSON: arrays built inside the vm realm have their own Array
  // prototype, so a structural compare against a host array fails on identity.
  assert.equal(
    vm.runInContext('JSON.stringify(OMNIA_GENERATOR_TRACKS.current)', ctx),
    JSON.stringify(GEN1)
  );
});
