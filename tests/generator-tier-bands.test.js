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

test('a tier above what the four tracks support is corrected down', () => {
  // The reported save: one track past 20, the other three in the teens. The old
  // migration seeded tier 1 off the highest track, leaving the rest under the
  // band floor where the card clamped them to "1 / 20" forever. The tier is the
  // band all four have finished, so it belongs at 0 here — and no levels are
  // handed out to paper over it.
  const ctx = loadSave({
    akasha: 500000,
    upgrades: { current: 22, vessel: 13, attunement: 13, quickening: 13 },
    genTiers: { current: 1, gen2: 0, gen3: 0 }
  });
  assert.equal(ctx.omniaState.genTiers.current, 0, 'tier drops to what all four support');
  assert.equal(ctx.omniaState.upgrades.current, 22, 'no level is altered');
  for (const id of ['vessel', 'attunement', 'quickening']) {
    assert.equal(ctx.omniaState.upgrades[id], 13, id + ' keeps its real level');
  }
});

test('correcting the tier never costs the player buying room', () => {
  // Lifting under-band tracks up to the band floor used to burn the headroom the
  // player had left: at Step 6 a track at 13 has seven buys before it meets the
  // tier-0 band top of 20, and came back from the lift with one.
  const ctx = loadSave({
    bardonStep: 6,
    upgrades: { current: 22, vessel: 13, attunement: 13, quickening: 13 },
    genTiers: { current: 1, gen2: 0, gen3: 0 }
  });
  const room = vm.runInContext(
    'omniaUpgradeStepMax("attunement") - omniaState.upgrades.attunement', ctx);
  assert.equal(room, 7, 'all seven remaining attunement purchases survive');
});

test('no track can ever sit below its generator band floor', () => {
  const ctx = loadSave({
    upgrades: { current: 45, vessel: 3, attunement: 1, quickening: 41 },
    genTiers: { current: 2, gen2: 0, gen3: 0 }
  });
  const display = (id) => vm.runInContext(`omniaUpgradeDisplayLevel(${JSON.stringify(id)})`, ctx);
  const tier = ctx.omniaState.genTiers.current;
  assert.equal(tier, 0, 'the weakest track (level 1) sets the tier');
  for (const id of GEN1) {
    assert.ok(ctx.omniaState.upgrades[id] >= tier * 20 + 1, id + ' is at or above its band floor');
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
  assert.equal(before, 13, 'the card shows the real level, not a clamped 1');
  ctx.omniaState.upgrades.attunement += 1;
  assert.equal(display(), before + 1, 'one purchase advances the shown level by one');
});

test('the repair heals saves that already took the bad seeding', () => {
  // A stored genTiers used to mean the seeding block was skipped entirely, so
  // these saves stayed broken. Tier is re-derived on every load instead.
  const ctx = loadSave({
    upgrades: { current: 22, vessel: 13, attunement: 14, quickening: 13 },
    genTiers: { current: 1, gen2: 0, gen3: 0 }
  });
  assert.equal(ctx.omniaState.genTiers.current, 0);
  assert.equal(ctx.omniaState.upgrades.attunement, 14, 'levels are left alone');
});

test('a legitimately earned tier survives reload', () => {
  // Tier Up steps every branch one past the band top, so a real tier-up leaves
  // all four supporting the new tier. Re-deriving must not undo that.
  const ctx = loadSave({
    upgrades: { current: 21, vessel: 21, attunement: 21, quickening: 21 },
    genTiers: { current: 1, gen2: 0, gen3: 0 }
  });
  assert.equal(ctx.omniaState.genTiers.current, 1, 'earned tier is kept');
});

test('re-deriving never promotes a generator for free', () => {
  // Reaching the band top is not a tier-up; the player presses the button and
  // the band resets. Load must never hand out the tier by itself.
  const ctx = loadSave({
    upgrades: { current: 40, vessel: 40, attunement: 40, quickening: 40 },
    genTiers: { current: 1, gen2: 0, gen3: 0 }
  });
  assert.equal(ctx.omniaState.genTiers.current, 1, 'still tier 1 until Tier Up is pressed');
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
  assert.equal(ctx.omniaState.genTiers.current, 1, 'and the tier is left where it was');
});

test('a save with no recorded tier seeds from its weakest track', () => {
  const ctx = loadSave({
    upgrades: { current: 22, vessel: 13, attunement: 13, quickening: 13 }
    // no genTiers at all -> first migration
  });
  assert.equal(ctx.omniaState.genTiers.current, 0, 'seeded from the track furthest behind');
  for (const id of GEN1) {
    assert.equal(vm.runInContext(`omniaUpgradeDisplayLevel("${id}")`, ctx),
      Math.min(20, ctx.omniaState.upgrades[id]), id + ' shows its true level');
  }
});

test('the tier panel counts outstanding band levels, not just branches', () => {
  // "4 of 4 branches short" reads identically at the start of a band and one
  // level from the end, so it could not show that a purchase had registered.
  const ctx = loadSave({
    upgrades: { current: 22, vessel: 13, attunement: 13, quickening: 13 },
    genTiers: { current: 1, gen2: 0, gen3: 0 }
  });
  const owed = () => vm.runInContext('omniaGenLevelsRemaining("current")', ctx);
  const before = owed();
  assert.equal(before, 21, '(20-20) + (20-13) x3, at tier 0');
  ctx.omniaState.upgrades.attunement += 1;
  assert.equal(owed(), before - 1, 'one purchase moves the counter by one');
});

test('a generator ready to tier up owes nothing', () => {
  const ctx = loadSave({
    upgrades: { current: 40, vessel: 40, attunement: 40, quickening: 40 },
    genTiers: { current: 1, gen2: 0, gen3: 0 }
  });
  assert.equal(vm.runInContext('omniaGenLevelsRemaining("current")', ctx), 0);
  assert.equal(vm.runInContext('omniaGenTracksRemaining("current")', ctx), 0);
  assert.equal(vm.runInContext('omniaGenTierReady("current")', ctx), true);
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
