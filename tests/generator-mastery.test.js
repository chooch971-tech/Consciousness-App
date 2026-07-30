const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

function createContext() {
  const context = {
    Date,
    Math,
    JSON,
    setTimeout,
    clearTimeout,
    document: {
      getElementById: () => null,
      querySelector: () => null,
      createElement: () => ({ style: {}, remove() {} }),
      body: { appendChild() {} }
    },
    navigator: {},
    window: {},
    localStorage: { getItem: () => null, setItem() {} },
    showConfirm() {},
    showToast() {},
    saveOmniaState() {},
    renderOmniaEngine() {},
    omniaSpendAkasha(amount) {
      if (context.omniaState.akasha < amount) return false;
      context.omniaState.akasha -= amount;
      context.omniaState.totalAkashaSpent += amount;
      return true;
    }
  };
  vm.createContext(context);
  vm.runInContext(read('omnia-economy-config-client.js'), context);
  vm.runInContext(read('omnia-progression-config-client.js'), context);
  context.omniaState = JSON.parse(JSON.stringify(context.OMNIA_DEFAULT));
  context.omniaState.upgradeBuilds = {};
  context.omniaState.reservoirs = {};
  vm.runInContext(read('omnia-economy-client.js'), context);
  vm.runInContext(read('omnia-engine-client.js'), context);
  // Keep action tests silent and independent of browser audio.
  context.playUpgradeHammer = () => {};
  context.renderOmniaEngine = () => {};
  return context;
}

test('Akasha upgrade masteries are derived from monotonic lifetime levels', () => {
  const game = createContext();

  game.omniaState.bardonStep = 5;
  game.omniaState.upgrades.current = 20;
  assert.equal(game.omniaUpgradeMasteryReady('current'), true);
  assert.equal(game.omniaUpgradeMasteryRank('current'), 0);
  assert.equal(game.omniaUpgradeDisplayLevel('current'), 20);

  assert.equal(game.masterOmniaUpgrade('current'), true);
  assert.equal(game.omniaState.upgrades.current, 21);
  assert.equal(game.omniaUpgradeMasteryRank('current'), 1);
  assert.equal(game.omniaUpgradeDisplayLevel('current'), 1);

  game.omniaState.upgrades.current = 66; // grandfathered uncapped Book II save
  assert.equal(game.omniaUpgradeMasteryRank('current'), 3);
  assert.equal(game.omniaUpgradeDisplayLevel('current'), 6);

  game.omniaState.upgrades.current = 80;
  assert.equal(game.omniaUpgradeAtMax('current'), true);
  assert.equal(game.omniaUpgradeDisplayLevel('current'), 20);
});

test('Akasha mastery thresholds grant bounded category-specific benefits', () => {
  const game = createContext();

  assert.equal(game.omniaCurrentMasteryMult(20), 1);
  assert.equal(game.omniaCurrentMasteryMult(21), 2.5);
  assert.equal(game.omniaCurrentMasteryMult(61), 5.5);
  assert.equal(game.omniaAttunementDiscountMult(20), 0.5);
  assert.equal(game.omniaAttunementDiscountMult(21), 0.45);
  assert.equal(game.omniaAttunementDiscountMult(61), 0.35);

  game.omniaState.upgrades.vessel = 21;
  const masteredCap = game.omniaPumpReservoirCap(0);
  game.omniaState.upgrades.vessel = 20;
  const baseCap = game.omniaPumpReservoirCap(0);
  assert.ok(masteredCap > baseCap * 1.2);

  game.omniaState.upgrades.quickening = 61;
  game.omniaState.upgradeBuilds.current = Date.now() + 60_000;
  assert.ok(Math.abs(game.omniaPumpProductionWhileBuilding(0) - 0.3) < 1e-9);
});

test('Dark Matter pumps expose four bounded tracks with dual-currency resonance', () => {
  const game = createContext();
  const pump = game.DM_GEN_META[0];

  assert.deepEqual(
    [pump.id, pump.vessel, pump.stable, pump.resonance],
    ['dm1', 'dmv1', 'dms1', 'dmr1']
  );
  assert.equal(game.dmUpgradeLevelCap(pump.id), 20);
  assert.equal(game.dmUpgradeLevelCap(pump.vessel), 10);
  assert.equal(game.dmUpgradeLevelCap(pump.stable), 10);
  assert.equal(game.dmUpgradeLevelCap(pump.resonance), 10);

  const resonancePrice = game.dmUpgradePrice(pump.resonance);
  assert.ok(resonancePrice.d > 0);
  assert.ok(resonancePrice.a > 0);

  game.omniaState.upgrades[pump.resonance] = 10;
  assert.ok(Math.abs(game.dmResonanceMult(0) - 1.36) < 1e-9);
});

test('Dark Matter expansion preserves early production and bounds later idle growth', () => {
  const game = createContext();
  const pump = game.DM_GEN_META[0];

  game.omniaState.upgrades[pump.id] = 10;
  assert.equal(game.dmGenRatePerDay(0), 30);
  game.omniaState.upgrades[pump.id] = 20;
  assert.equal(game.dmGenRatePerDay(0), 40);

  game.omniaState.upgrades[pump.vessel] = 1;
  const twoDayCap = game.dmPumpReservoirCap(0);
  game.omniaState.upgrades[pump.vessel] = 10;
  assert.ok(game.dmPumpReservoirCap(0) > twoDayCap * 2);

  game.omniaState.upgrades[pump.stable] = 10;
  game.omniaState.upgradeBuilds[pump.vessel] = Date.now() + 60_000;
  assert.equal(game.dmPumpBuildingId(pump), pump.vessel);
  assert.equal(game.dmStabilizationMult(0), 0.45);
});

test('Dark Matter construction spends atomically and locks the paired pump', () => {
  const game = createContext();
  const pump = game.DM_GEN_META[0];
  game.omniaState.prestige = 3;
  game.omniaState.akasha = 100_000;
  game.omniaState.darkMatter = 10_000;
  const price = game.dmUpgradePrice(pump.resonance);

  assert.equal(game.buyDmUpgrade(pump.resonance), true);
  assert.equal(game.omniaState.akasha, 100_000 - price.a);
  assert.equal(game.omniaState.darkMatter, 10_000 - price.d);
  assert.equal(game.dmPumpBuildingId(pump), pump.resonance);
  assert.equal(game.buyDmUpgrade(pump.vessel), false);

  game.omniaState.upgradeBuilds[pump.resonance] = Date.now() - 1;
  assert.deepEqual(Array.from(game.omniaResolveUpgradeBuilds()), [pump.resonance]);
  assert.equal(game.omniaState.upgrades[pump.resonance], 2);
});

test('Umbral Resonance boosts only its paired Akasha generator', () => {
  const game = createContext();
  game.omniaState.prestige = 3;
  const baseline = game.omniaGenContribution(0);

  game.omniaState.upgrades.dmr1 = 10;
  const resonant = game.omniaGenContribution(0);
  const unpaired = game.omniaGenContribution(1);

  assert.ok(Math.abs(resonant / baseline - 1.36) < 1e-9);
  assert.equal(game.dmResonanceMult(1), 1);
  assert.ok(unpaired < resonant);
});

test('new generator track levels remain monotonic during cloud reconciliation', () => {
  const stateClient = read('omnia-state-client.js');
  const game = createContext();
  vm.runInContext(stateClient, game);

  const local = JSON.stringify({
    prestige: 3,
    lastTick: 10,
    bodies: { physical: 1, astral: 1, mental: 1 },
    upgrades: { current: 41, dmr1: 7 }
  });
  const cloud = JSON.stringify({
    prestige: 3,
    lastTick: 9,
    bodies: { physical: 1, astral: 1, mental: 1 },
    upgrades: { current: 40, dmr1: 4 }
  });
  game.shouldTakeCloudValue = () => false;

  const merged = JSON.parse(game.mergeOmniaPull(local, cloud));
  assert.equal(merged.upgrades.current, 41);
  assert.equal(merged.upgrades.dmr1, 7);
});

test('a fresh/empty snapshot with a newer clock cannot zero a real Akasha balance', () => {
  const stateClient = read('omnia-state-client.js');
  const game = createContext();
  vm.runInContext(stateClient, game);
  game.shouldTakeCloudValue = () => true; // cloud "wins" the score-based base

  // Real device: rich wallet + lifetime earnings, older clock.
  const local = JSON.stringify({
    prestige: 0, lastTick: 1000,
    akasha: 11927, totalAkashaEarned: 50000, totalAkashaSpent: 20000,
    bodies: { physical: 1, astral: 1, mental: 1 }, upgrades: { current: 40 }
  });
  // Fresh/empty device (e.g. a second origin that just loaded): zero wallet,
  // near-zero lifetime earnings, but a NEWER clock because it just ticked.
  const cloud = JSON.stringify({
    prestige: 0, lastTick: 2000,
    akasha: 0, totalAkashaEarned: 0, totalAkashaSpent: 0,
    bodies: { physical: 1, astral: 1, mental: 1 }, upgrades: {}
  });

  const merged = JSON.parse(game.mergeOmniaPull(local, cloud));
  assert.equal(merged.akasha, 11927, 'the real balance must survive the fresh clobber');
  // Monotonic progress still folds to the richer values.
  assert.equal(merged.totalAkashaEarned, 50000);
  assert.equal(merged.upgrades.current, 40);
});

test('a genuine post-collect snapshot (newer clock, equal earnings) still wins the wallet', () => {
  const stateClient = read('omnia-state-client.js');
  const game = createContext();
  vm.runInContext(stateClient, game);
  game.shouldTakeCloudValue = () => false;

  // Stale local: pre-collect, full reservoir, lower wallet, older clock.
  const local = JSON.stringify({
    prestige: 0, lastTick: 1000,
    akasha: 100, totalAkashaEarned: 5000, totalAkashaSpent: 0,
    reservoirs: { current: 900 },
    bodies: { physical: 1, astral: 1, mental: 1 }, upgrades: {}
  });
  // Fresh cloud: just collected → higher wallet, emptied reservoir, newer clock,
  // same lifetime earnings (the mint was counted before the collect).
  const cloud = JSON.stringify({
    prestige: 0, lastTick: 2000,
    akasha: 1000, totalAkashaEarned: 5000, totalAkashaSpent: 0,
    reservoirs: { current: 0 },
    bodies: { physical: 1, astral: 1, mental: 1 }, upgrades: {}
  });

  const merged = JSON.parse(game.mergeOmniaPull(local, cloud));
  assert.equal(merged.akasha, 1000, 'the collected balance wins, no double-collect');
  assert.deepEqual(merged.reservoirs, { current: 0 }, 'the emptied reservoir is not restored');
});

test('construction time follows the band, so a mastery does not pin every upgrade at the cap', () => {
  const game = createContext();
  const HOUR = 3600 * 1000;
  const at = (raw) => {
    game.omniaState.upgrades.current = raw;
    return game.omniaBuildDurationMs(raw + 1, 'current');
  };

  // Levels 1-20 keep the documented curve: minutes early, many hours late.
  const early = at(1);
  const late = at(19);
  assert.ok(early < 15 * 60 * 1000, 'the first upgrade is minutes, not hours');
  assert.ok(late > 12 * HOUR && late < 24 * HOUR, 'the end of a band is a long haul');

  // Reading the lifetime level put a cubic past the 24h cap around level 21, so
  // every upgrade after the first mastery quoted a full day however early in its
  // band it was. Each band now replays the same curve.
  const afterMastery = at(21);
  assert.equal(afterMastery, early, 'a fresh band starts where the first one did');
  assert.ok(afterMastery < HOUR, 'and is nowhere near the 24h cap');
  assert.equal(at(41), early);
  assert.equal(at(61), early);

  // The band position is what matters, not how much lifetime level precedes it.
  assert.equal(at(25), at(5));
  assert.equal(at(39), late);
});
