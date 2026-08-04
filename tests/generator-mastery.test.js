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
    },
    omniaTransferAkasha(amount) {
      context.omniaState.akasha += amount;
      return amount;
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

test('a generator tiers up only once all four of its branches top the band', () => {
  const game = createContext();
  game.omniaState.bardonStep = 10;

  // Akashic Current alone at the top is not enough — that cherry-pick is
  // exactly what made tiering free on the three non-production branches.
  game.omniaState.upgrades.current = 20;
  assert.equal(game.omniaGenTierReady('current'), false);
  assert.equal(game.omniaGenTracksRemaining('current'), 3);
  assert.equal(game.tierUpOmniaGenerator('current'), false);

  game.omniaState.upgrades.vessel = 20;
  game.omniaState.upgrades.attunement = 20;
  assert.equal(game.omniaGenTierReady('current'), false);
  assert.equal(game.omniaGenTracksRemaining('current'), 1);

  game.omniaState.upgrades.quickening = 20;
  assert.equal(game.omniaGenTierReady('current'), true);
  assert.equal(game.omniaGenTracksRemaining('current'), 0);

  // Tiering advances the counter, never the levels — those stay monotonic for
  // cloud max-merge, and the band falls out of the tier.
  assert.equal(game.tierUpOmniaGenerator('current'), true);
  assert.equal(game.omniaGenTier('current'), 1);
  // Each track steps one level as it crosses, so the new band's Level 1 sits at
  // raw 21 — levels only ever climb, which is what cloud max-merge requires.
  assert.equal(game.omniaState.upgrades.current, 21);
  ['current', 'vessel', 'attunement', 'quickening'].forEach(id => {
    assert.equal(game.omniaState.upgrades[id], 21, id + ' steps rather than resets');
    assert.equal(game.omniaUpgradeDisplayLevel(id), 1, id + ' restarts its band');
  });

  // A generator's tier governs only its own tracks.
  assert.equal(game.omniaGenTier('gen2'), 0);
  assert.equal(game.omniaUpgradeDisplayLevel('gen2'), 1);
});

test('a track cannot be bought past the top of its band until the generator tiers', () => {
  const game = createContext();
  game.omniaState.bardonStep = 10;
  game.omniaState.akasha = 10_000_000;

  assert.equal(game.omniaUpgradeStepMax('current'), 20);
  game.omniaState.upgrades.current = 20;
  assert.equal(game.omniaUpgradeAtMax('current'), true);
  assert.equal(game.omniaUpgradeAtBandTop('current'), true);

  game.omniaState.genTiers.current = 1;
  assert.equal(game.omniaUpgradeStepMax('current'), 40);
  assert.equal(game.omniaUpgradeAtMax('current'), false);
});

test('tier multipliers are keyed to the generator, not to a bare level', () => {
  const game = createContext();

  assert.equal(game.omniaCurrentMasteryMult('current'), 1);
  game.omniaState.genTiers.current = 1;
  assert.equal(game.omniaCurrentMasteryMult('current'), 2.5);
  game.omniaState.genTiers.current = 3;
  assert.equal(game.omniaCurrentMasteryMult('current'), 5.5);
  assert.equal(game.omniaCurrentMasteryMult('gen2'), 1, 'other generators are unaffected');

  // The tier deepens where a band ENDS, not where it starts: every band opens at
  // full price and the twenty levels walk it down to that tier's best.
  game.omniaState.genTiers.current = 0;
  assert.equal(game.omniaAttunementDiscountMult(1, 'attunement'), 1, 'band 1 is full price');
  assert.ok(Math.abs(game.omniaAttunementDiscountMult(20, 'attunement') - 0.5) < 1e-9,
    '50% off at the foot of Tier 0');
  game.omniaState.genTiers.current = 1;
  assert.ok(Math.abs(game.omniaAttunementDiscountMult(40, 'attunement') - 0.45) < 1e-9,
    '55% off at the foot of Tier I');
  game.omniaState.genTiers.current = 3;
  assert.ok(Math.abs(game.omniaAttunementDiscountMult(80, 'attunement') - 0.35) < 1e-9,
    '65% off at the foot of Tier III — the caps the mastery blurb promises');
});

test('every level of a branch band changes what it is worth', () => {
  // Both branches used to read the LIFETIME level on a slope that bottomed out
  // at level 11, so levels 12-80 bought nothing while their price kept climbing
  // and the tier-up gate still demanded twenty of them.
  const game = createContext();
  game.omniaState.genTiers.current = 0;
  let prevAtt = Infinity, prevQui = Infinity;
  for (let lvl = 1; lvl <= 20; lvl += 1) {
    game.omniaState.upgrades.attunement = lvl;
    game.omniaState.upgrades.quickening = lvl;
    const att = game.omniaAttunementDiscountMult(lvl, 'attunement');
    const qui = game.omniaBuildSpeedMult('current');
    if (lvl > 1) {
      assert.ok(att < prevAtt, 'attunement level ' + lvl + ' must improve on ' + (lvl - 1));
      assert.ok(qui < prevQui, 'quickening level ' + lvl + ' must improve on ' + (lvl - 1));
    }
    prevAtt = att; prevQui = qui;
  }
});

test('a tier up lands worse than the band it just maxed, then climbs past it', () => {
  // That arc is the whole point of tiering, and it only works if the band truly
  // resets. An earlier attempt kept the old value as a floor so nobody lost
  // ground — which pinned the entire band flat and recreated the dead levels it
  // was meant to end. No floor: every band starts at full price and every level
  // of it is worth buying.
  const game = createContext();
  const at = (tier, band) => {
    game.omniaState.genTiers.current = tier;
    const raw = tier * 20 + band;
    game.omniaState.upgrades.attunement = raw;
    game.omniaState.upgrades.quickening = raw;
    return { att: game.omniaAttunementDiscountMult(raw, 'attunement'),
             qui: game.omniaBuildSpeedMult('current') };
  };

  const maxedT0 = at(0, 20);
  const freshT1 = at(1, 1);
  assert.ok(freshT1.att > maxedT0.att, 'a fresh tier is initially worse on discount');
  assert.ok(freshT1.qui > maxedT0.qui, 'and on build speed');
  assert.equal(freshT1.att, 1, 'the band genuinely resets, no legacy floor');

  const maxedT1 = at(1, 20);
  assert.ok(maxedT1.att < maxedT0.att, 'and ends up better than the tier before');
  assert.ok(maxedT1.qui < maxedT0.qui);

  // Every tier's ceiling beats the one below it, all the way up.
  const ceilings = [0, 1, 2, 3].map((t) => at(t, 20));
  for (let i = 1; i < ceilings.length; i += 1) {
    assert.ok(ceilings[i].att < ceilings[i - 1].att, 'tier ' + i + ' discount ceiling improves');
    assert.ok(ceilings[i].qui < ceilings[i - 1].qui, 'tier ' + i + ' build ceiling improves');
  }
});

test('the discount and build speed a tier is bought with are kept', () => {
  const game = createContext();
  // Attunement's discount and Quickening's build speed still read the lifetime
  // level, so they survive a tier — that persistence is what the levels buy.
  // Reservoir capacity deliberately does NOT; see the test below.
  game.omniaState.genTiers.current = 3;
  game.omniaState.upgrades.quickening = 61;
  game.omniaState.upgradeBuilds.current = Date.now() + 60_000;
  assert.ok(Math.abs(game.omniaPumpProductionWhileBuilding(0) - 0.3) < 1e-9);
});

test('reservoir capacity falls back with the band on a tier up', () => {
  // It used to read the lifetime level, so output dropped to the bottom of the
  // new band while the vessel kept its full size — the reservoir went from
  // filling in 44 hours to 11.5 days and the pump stopped needing collecting.
  const game = createContext();
  game.omniaState.genTiers.current = 0;
  game.omniaState.upgrades.vessel = 20;              // band 20, top of tier 0
  const atBandTop = game.omniaPumpReservoirCap(0);
  game.omniaState.genTiers.current = 1;
  game.omniaState.upgrades.vessel = 21;              // band 1, bottom of tier 1
  const afterTier = game.omniaPumpReservoirCap(0);
  assert.ok(afterTier < atBandTop,
    'capacity must fall back with the band, got ' + afterTier + ' vs ' + atBandTop);

  // The tier still counts for something: band 1 of a higher tier holds more
  // than band 1 of a lower one, by the same factor output gains.
  game.omniaState.genTiers.current = 0;
  game.omniaState.upgrades.vessel = 1;
  const tier0Band1 = game.omniaPumpReservoirCap(0);
  assert.ok(afterTier > tier0Band1, 'a higher tier must still hold more at band 1');
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
  // Band position is now a function of the generator's tier, so the tier has to
  // move with the level the way it does in play.
  // (tier, band position) -> the build time quoted for the next level.
  const at = (tier, band) => {
    game.omniaState.genTiers.current = tier;
    const raw = tier * 20 + band;
    game.omniaState.upgrades.current = raw;
    return game.omniaBuildDurationMs(raw + 1, 'current');
  };

  // Levels 1-20 keep the documented curve: minutes early, many hours late.
  const early = at(0, 1);
  const late = at(0, 19);
  assert.ok(early < 15 * 60 * 1000, 'the first upgrade is minutes, not hours');
  assert.ok(late > 12 * HOUR && late < 24 * HOUR, 'the end of a band is a long haul');

  // Reading the lifetime level put a cubic past the 24h cap around level 21, so
  // every upgrade after the first mastery quoted a full day however early in its
  // band it was. Each band now replays the same curve.
  const afterTier = at(1, 1);
  assert.equal(afterTier, early, 'a fresh band starts where the first one did');
  assert.ok(afterTier < HOUR, 'and is nowhere near the 24h cap');
  assert.equal(at(2, 1), early);
  assert.equal(at(3, 1), early);

  // The band position is what matters, not how much lifetime level precedes it.
  assert.equal(at(1, 5), at(0, 5));
  assert.equal(at(3, 19), late);
});

test('tiering up banks the reservoir before capacity shrinks', () => {
  // omniaAccrue stores with Math.min(cap, ...), and capacity now falls back
  // with the band, so anything standing above the new ceiling would be wiped by
  // the next tick. It was earned, so it goes to the wallet.
  const game = createContext();
  ['current', 'vessel', 'attunement', 'quickening'].forEach((id) => {
    game.omniaState.upgrades[id] = 20;               // every branch at band top
  });
  game.omniaState.genTiers.current = 0;
  const full = game.omniaPumpReservoirCap(0);
  game.omniaState.reservoirs.current = full;
  game.omniaState.akasha = 1000;

  assert.equal(game.omniaGenTierReady('current'), true);
  assert.equal(game.tierUpOmniaGenerator('current'), true);

  assert.equal(game.omniaState.reservoirs.current, 0, 'the reservoir is emptied');
  assert.equal(game.omniaState.akasha, 1000 + full, 'and every akasha of it lands in the wallet');
  assert.ok(game.omniaPumpReservoirCap(0) < full, 'capacity did fall back');
});

test('tiering up an empty pump moves nothing', () => {
  const game = createContext();
  ['current', 'vessel', 'attunement', 'quickening'].forEach((id) => {
    game.omniaState.upgrades[id] = 20;
  });
  game.omniaState.genTiers.current = 0;
  game.omniaState.reservoirs.current = 0;
  game.omniaState.akasha = 500;
  assert.equal(game.tierUpOmniaGenerator('current'), true);
  assert.equal(game.omniaState.akasha, 500, 'no phantom credit');
});
