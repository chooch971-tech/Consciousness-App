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
      sessionsTodayDate: new Date().toISOString().slice(0, 10),
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

test('Book I engine remains a bounded supporting share of daily Akasha', () => {
  const economy = createEconomyContext();
  const bodyLevels = [12, 23, 38, 62, 96, 140, 195, 260, 335, 430];
  const generatorCaps = [3, 6, 10, 15, 21, 28, 36, 45, 60, 80];

  bodyLevels.forEach((level, index) => {
    const step = index + 1;
    const cap = generatorCaps[index];
    economy.omniaState.bardonStep = step;
    economy.omniaState.bodies = { physical: level, astral: level, mental: level };
    economy.omniaState.upgrades.current = cap;
    economy.omniaState.upgrades.gen2 = cap;
    economy.omniaState.upgrades.gen3 = cap;

    const practiceDaily = economy.omniaExerciseReward('clock', 600, true, 1) * 3;
    const engineDaily = economy.omniaRatePerHour() * 24;
    const actualShare = engineDaily / (practiceDaily + engineDaily);
    const targetShare = economy.omniaGeneratorTargetShare(step);

    assert.ok(
      Math.abs(actualShare - targetShare) <= 0.015,
      `Step ${step} engine share ${actualShare.toFixed(3)} missed ${targetShare.toFixed(3)}`
    );
  });
});

test('generator Current upgrades have diminishing marginal returns', () => {
  const economy = createEconomyContext();
  const earlyGain = economy.omniaGeneratorContributionCurve(2, 0)
    - economy.omniaGeneratorContributionCurve(1, 0);
  const deepGain = economy.omniaGeneratorContributionCurve(80, 0)
    - economy.omniaGeneratorContributionCurve(79, 0);

  assert.ok(earlyGain > deepGain * 20);
  assert.ok(deepGain > 0);
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
