const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const calendar = require('../calendar');

const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

function createEconomyContext() {
  const context = {
    Date,
    Math,
    PRESTIGE_BOOK2: 3,
    omniaState: {
      akasha: 0,
      bardonStep: 1,
      bodies: { physical: 1, astral: 1, mental: 1 },
      prestige: 0,
      recStreak: 6,
      sessionsTodayCount: 3,
      sessionsTodayDate: calendar.dayKey(),
      upgrades: { current: 1, gen2: 1, gen3: 1, attunement: 1 }
    },
    OMNIA_GEN_META: [{ id: 'current' }, { id: 'gen2' }, { id: 'gen3' }],
    OMNIA_EXERCISE_META: { clock: { body: 'mental' } },
    darkMatterUnlocked: () => false,
    getActiveAkashaBoost: () => 1,
    omniaUpgradeBuilding: () => 0
  };
  context.presenceDayKey = calendar.dayKey;
  vm.createContext(context);
  vm.runInContext(read('omnia-economy-client.js'), context);
  context.omniaGenContribution = (idx) => context.omniaGeneratorContributionCurve(
    context.omniaState.upgrades[context.OMNIA_GEN_META[idx].id],
    idx
  );
  vm.runInContext(read('omnia-rewards-client.js'), context);
  return context;
}

test('Akasha pump rates ignore Step, sessions, and body progression', () => {
  const economy = createEconomyContext();
  economy.omniaState.bardonStep = 1;
  economy.omniaState.bodies = { physical: 1, astral: 1, mental: 1 };
  economy.omniaState.sessionsTodayCount = 0;
  economy.omniaState.sessionsTodayDate = '2000-01-01';
  economy.omniaState.upgrades.current = 20;
  const early = economy.omniaPumpRatesPerHour();

  economy.omniaState.bardonStep = 10;
  economy.omniaState.bodies = { physical: 430, astral: 430, mental: 430 };
  economy.omniaState.sessionsTodayCount = 3;
  economy.omniaState.sessionsTodayDate = calendar.dayKey();
  const late = economy.omniaPumpRatesPerHour();

  assert.equal(late.current, early.current);
  assert.equal(early.current, economy.omniaGeneratorContributionCurve(20, 0));
});

test('autonomous Current progression has diminishing percentage returns', () => {
  const economy = createEconomyContext();
  const earlyGain = economy.omniaGeneratorContributionCurve(2, 0)
    / economy.omniaGeneratorContributionCurve(1, 0) - 1;
  // The deep comparison has to sit inside the top band, which means the
  // generator must actually be at that tier.
  economy.omniaState.genTiers = { current: 3, gen2: 3, gen3: 3 };
  const deepGain = economy.omniaGeneratorContributionCurve(80, 0)
    / economy.omniaGeneratorContributionCurve(79, 0) - 1;

  // Each mastery band spans 20 levels rather than the whole 80, so a late level
  // inside a band is a ~5% step rather than ~1%. The curve still flattens hard
  // across a band (≈55% at the start against ≈5% at the end); the factor is
  // calibrated to the band, not to a single 80-level ramp.
  assert.ok(earlyGain > deepGain * 8);
  assert.ok(deepGain > 0);
});

test('Akasha pumps produce independently without redistributing neighboring rates', () => {
  const economy = createEconomyContext();
  economy.omniaState.bardonStep = 9;
  economy.omniaState.bodies = { physical: 195, astral: 195, mental: 195 };
  economy.omniaState.upgrades.current = 19;
  economy.omniaState.upgrades.gen2 = 19;
  economy.omniaState.upgrades.gen3 = 19;

  const before = economy.omniaPumpRatesPerHour();
  economy.omniaState.upgrades.current = 20;
  const upgraded = economy.omniaPumpRatesPerHour();

  assert.ok(upgraded.current > before.current);
  assert.equal(upgraded.gen2, before.gen2);
  assert.equal(upgraded.gen3, before.gen3);

  economy.omniaPumpProductionWhileBuilding = (idx) => idx === 0 ? 0 : 1;
  const constructing = economy.omniaPumpRatesPerHour();
  assert.equal(constructing.current, 0);
  assert.equal(constructing.gen2, upgraded.gen2);
  assert.equal(constructing.gen3, upgraded.gen3);
  assert.equal(
    economy.omniaRatePerHour(),
    Math.floor(constructing.gen2 + constructing.gen3)
  );
});

test('Book II keeps the same autonomous pump rates as Book I', () => {
  const economy = createEconomyContext();
  economy.omniaState.bardonStep = 10;
  economy.omniaState.upgrades.current = 20;
  economy.omniaState.upgrades.gen2 = 20;
  economy.omniaState.upgrades.gen3 = 20;
  const bookI = economy.omniaPumpRatesPerHour();

  economy.darkMatterUnlocked = () => true;
  economy.omniaState.bardonStep = 1;
  economy.omniaState.bodies = { physical: 999, astral: 999, mental: 999 };
  economy.omniaState.sessionsTodayCount = 0;
  const bookII = economy.omniaPumpRatesPerHour();

  assert.deepEqual({ ...bookII }, { ...bookI });
});

test('autonomous production has useful early payback and bounded unboosted output', () => {
  const economy = createEconomyContext();
  economy._pumpOfUpgrade = () => ({ attune: 'attunement' });
  const currentUpgrade = { id: 'current', base: 520, step: 260 };

  const firstGain = economy.omniaGeneratorContributionCurve(2, 0)
    - economy.omniaGeneratorContributionCurve(1, 0);
  const firstPaybackHours = economy.omniaUpgradeCost(currentUpgrade) / firstGain;
  assert.ok(firstPaybackHours >= 36 && firstPaybackHours <= 60);

  // Attaining a mastery is a real prestige: the pump returns to Level 1, so
  // both its output and its upgrade price drop steeply. What makes the reset
  // worth taking is that the new band starts well above the old band's start
  // and ends well above the old band's ceiling.
  economy.omniaState.genTiers = { current: 0 };
  const bandStart = economy.omniaGeneratorContributionCurve(1, 0);
  const bandPeak = economy.omniaGeneratorContributionCurve(20, 0);
  economy.omniaState.genTiers = { current: 1 };
  const nextBandStart = economy.omniaGeneratorContributionCurve(21, 0);
  const nextBandPeak = economy.omniaGeneratorContributionCurve(40, 0);
  assert.ok(nextBandStart < bandPeak, 'a mastery must actually cost present output');
  assert.ok(nextBandStart > bandStart * 2, 'the new Level 1 must clearly beat the old Level 1');
  assert.ok(nextBandPeak > bandPeak * 2, 'the new band must clear the old ceiling');

  economy.omniaState.genTiers = { current: 0 };
  economy.omniaState.upgrades.current = 20;
  economy.omniaState.upgrades.attunement = 20;
  const costAtPeak = economy.omniaUpgradeCost(currentUpgrade);
  economy.omniaState.genTiers = { current: 1 };
  economy.omniaState.upgrades.current = 21;
  const costAfterMastery = economy.omniaUpgradeCost(currentUpgrade);
  // The card reads "Level 1" after a mastery, so it must not still quote the
  // lifetime-level price (which was 78,612 against 520 at the real Level 1).
  assert.ok(costAfterMastery < costAtPeak / 10, 'cost must fall back with the level');

  const masteryGain = economy.omniaGeneratorContributionCurve(22, 0)
    - economy.omniaGeneratorContributionCurve(21, 0);
  economy.omniaState.upgrades.current = 21;
  const masteryPaybackHours = economy.omniaUpgradeCost(currentUpgrade) / masteryGain;
  assert.ok(masteryPaybackHours < 24 * 30);

  economy.omniaState.bardonStep = 10;
  economy.omniaState.genTiers = { current: 3, gen2: 3, gen3: 3 };
  economy.omniaState.upgrades.current = 80;
  economy.omniaState.upgrades.gen2 = 80;
  economy.omniaState.upgrades.gen3 = 80;
  const maxHourly = economy.omniaRatePerHour();
  assert.ok(maxHourly > 3_500 && maxHourly < 4_000);
});

test('reservoir capacity depends only on Deep Vessel and its mastery', () => {
  const economy = createEconomyContext();
  economy.omniaState.upgrades.vessel = 1;
  const base = economy.omniaReservoirCap();
  economy.omniaState.bodies = { physical: 999, astral: 999, mental: 999 };
  assert.equal(economy.omniaReservoirCap(), base);
  assert.equal(base, 180);

  // Capacity reads the BAND level and shares output's tier multiplier, so fill
  // time depends on how far through a band the pump is and never on the tier.
  // Reading the lifetime level meant a tier-up left an enormous vessel behind a
  // band-1 trickle, and the reservoir effectively stopped filling.
  economy.omniaState.genTiers = { current: 1 };
  economy.omniaState.upgrades.vessel = 21;           // band 1 of tier 1
  const tier1Band1 = economy.omniaReservoirCap();
  assert.equal(tier1Band1, Math.floor(180 * 2.5), 'band 1 capacity, scaled by the tier');

  // Same band level one tier up: capacity and output both scale by the tier, so
  // the ratio between them — the fill time — is unchanged.
  economy.omniaState.genTiers = { current: 0 };
  economy.omniaState.upgrades.vessel = 1;
  assert.equal(economy.omniaReservoirCap(), 180);
  assert.equal(tier1Band1 / 180, 2.5, 'the tier multiplies capacity exactly as it does output');
});

test('practice rewards scale with progression without Attunement reducing income', () => {
  const economy = createEconomyContext();
  economy.omniaState.bardonStep = 1;
  economy.omniaState.bodies = { physical: 12, astral: 12, mental: 12 };
  const earlyReward = economy.omniaExerciseReward('clock', 600, true, 1);

  economy.omniaState.bardonStep = 10;
  economy.omniaState.bodies = { physical: 430, astral: 430, mental: 430 };
  const before = economy.omniaExerciseReward('clock', 600, true, 1);
  economy.omniaState.upgrades.attunement = 56;
  const after = economy.omniaExerciseReward('clock', 600, true, 1);

  assert.equal(after, before);
  assert.ok(after > 20 * earlyReward);
});

test('three consecutive recommendations earn Path credit without hourly spacing', () => {
  const economy = createEconomyContext();
  const day = '2026-07-17';

  assert.equal(economy.omniaGrantRecommendedSessionCredit(true, true, day), true);
  assert.equal(economy.omniaGrantRecommendedSessionCredit(true, true, day), true);
  assert.equal(economy.omniaGrantRecommendedSessionCredit(true, true, day), true);
  assert.equal(economy.omniaGrantRecommendedSessionCredit(true, true, day), false);
  assert.equal(economy.omniaState.completedRecommended, 3);

  assert.equal(economy.omniaGrantRecommendedSessionCredit(true, true, '2026-07-18'), true);
  assert.equal(economy.omniaState.completedRecommended, 4);
});

test('wallet is unlimited while generator reservoirs retain finite caps', () => {
  const economyClient = read('omnia-economy-client.js');
  const engineClient = read('omnia-engine-client.js');
  const presence = read('presence.html');

  assert.doesNotMatch(economyClient, /function\s+omniaAkashaCap\s*\(/);
  assert.doesNotMatch(engineClient, /Wallet full|Math\.min\(amount,\s*room\)/);
  assert.match(engineClient, /function\s+omniaPumpReservoirCap\s*\(/);
  assert.match(presence, /id="omniaApotheosis"/);
});
