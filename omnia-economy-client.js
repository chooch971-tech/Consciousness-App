function omniaBodyTotal() {
  return (omniaState.bodies.physical || 0) + (omniaState.bodies.astral || 0) + (omniaState.bodies.mental || 0);
}

// Sessions completed today — feeds the generator's practice multiplier.
function omniaSessionsToday() {
  var todayStr = presenceDayKey();
  if (omniaState.sessionsTodayDate !== todayStr) return 0;
  return omniaState.sessionsTodayCount || 0;
}

// The Engine is a supporting current, not the main practice reward. These are
// the intended shares of a three-session day at full generator investment.
// Deep upgrades approach the target logarithmically, so adding Generator II
// and III remains meaningful without letting passive income eclipse practice.
var OMNIA_ENGINE_SHARE_BY_STEP = [0.20, 0.23, 0.26, 0.29, 0.32, 0.34, 0.36, 0.38, 0.40, 0.42];
var OMNIA_GEN_LEGACY_BASE = [10, 18, 24];
var OMNIA_GEN_LEGACY_PER = [12, 10, 10];

function omniaGeneratorTargetShare(stepNum) {
  return OMNIA_ENGINE_SHARE_BY_STEP[Math.max(0, Math.min(9, (stepNum || 1) - 1))];
}

function omniaGeneratorContributionCurve(level, idx) {
  var base = [1, 0.72, 0.55][idx] || 0.55;
  return base * (1 + 0.55 * Math.log2(Math.max(1, level || 1))) * omniaCurrentMasteryMult(level);
}

var OMNIA_MASTERY_SPAN = 20;
var OMNIA_MASTERY_CAP = 3;
var OMNIA_UPGRADE_FINAL_LEVEL = 80;

// Upgrade levels never actually reset in storage. The four 20-level bands are
// a presentation layer over a monotonic lifetime level, which keeps existing
// max-merge cloud sync safe while still giving each track three explicit
// mastery thresholds.
function omniaUpgradeMasteryRank(upgId, rawLevel) {
  var lvl = Math.max(1, Number(rawLevel == null ? ((omniaState.upgrades || {})[upgId] || 1) : rawLevel) || 1);
  return Math.min(OMNIA_MASTERY_CAP, Math.floor((lvl - 1) / OMNIA_MASTERY_SPAN));
}
function omniaUpgradeDisplayLevel(upgId, rawLevel) {
  var lvl = Math.max(1, Number(rawLevel == null ? ((omniaState.upgrades || {})[upgId] || 1) : rawLevel) || 1);
  if (lvl >= OMNIA_UPGRADE_FINAL_LEVEL) return OMNIA_MASTERY_SPAN;
  return ((lvl - 1) % OMNIA_MASTERY_SPAN) + 1;
}
function omniaUpgradeMasteryReady(upgId) {
  var lvl = Math.max(1, Number((omniaState.upgrades || {})[upgId]) || 1);
  return (lvl === 20 || lvl === 40 || lvl === 60) && lvl < omniaUpgradeStepMax(upgId);
}
function omniaMasteryRoman(rank) { return ['', 'I', 'II', 'III'][Math.max(0, Math.min(3, rank || 0))] || ''; }
function omniaCurrentMasteryMult(level) { return 1 + 0.15 * omniaUpgradeMasteryRank('', level); }
function omniaAttunementDiscountMult(level) {
  var lvl = Math.max(1, Number(level) || 1);
  var mastery = omniaUpgradeMasteryRank('', lvl);
  // Preserve the original early curve and make each mastery break the old 50%
  // floor by another five points, to a firm 65% maximum discount.
  return Math.max(0.35, Math.max(0.5 - mastery * 0.05, 1 - (lvl - 1) * 0.05));
}

function omniaLegacyGenContribution(idx) {
  var gid = OMNIA_GEN_META[idx].id;
  var lvl = (omniaState.upgrades && omniaState.upgrades[gid]) || 1;
  return ((OMNIA_GEN_LEGACY_BASE[idx] || 24) + lvl * (OMNIA_GEN_LEGACY_PER[idx] || 10)) * omniaCurrentMasteryMult(lvl);
}

// Each Akasha pump owns an additive hourly rate. Global practice/body/boost
// factors still describe the player's overall current, but changing or
// constructing one pump never redistributes production from another pump.
// At equal investment this decomposition sums to the previous Book I balance
// target, so independence does not inflate the established passive-income cap.
function omniaPumpRatesPerHour() {
  var inBookII = typeof darkMatterUnlocked === 'function' && darkMatterUnlocked();
  var rates = {};
  var pumpCount = inBookII ? 3 : 1 + ((omniaState.bardonStep || 1) >= 5 ? 1 : 0) + ((omniaState.bardonStep || 1) >= 9 ? 1 : 0);
  if (inBookII) {
    var total = omniaBodyTotal();
    var b2b = bookIIBodies();
    total += (b2b.astral || 1) + (b2b.mental || 1) + (b2b.wisdom || 1);
    var legacyBodyBonus = Math.floor(Math.floor(Math.sqrt(Math.max(0, total)) * 9) * 0.5);
    var legacyPractice = Math.min(1, 0.55 + 0.15 * Math.min(3, omniaSessionsToday()));
    var legacyBoost = (typeof getActiveAkashaBoost === 'function') ? getActiveAkashaBoost() : 1;
    var legacyWeightTotal = 0, legacyWeights = [];
    for (var bi = 0; bi < pumpCount; bi++) {
      // The body bonus is allocated by a fixed fully-developed weight. Using a
      // fixed denominator is what prevents another pump's level from changing
      // this pump's rate.
      var legacyWeight = ((OMNIA_GEN_LEGACY_BASE[bi] || 24) + OMNIA_UPGRADE_FINAL_LEVEL * (OMNIA_GEN_LEGACY_PER[bi] || 10))
        * omniaCurrentMasteryMult(OMNIA_UPGRADE_FINAL_LEVEL);
      legacyWeights.push(legacyWeight);
      legacyWeightTotal += legacyWeight;
    }
    for (var bj = 0; bj < pumpCount; bj++) {
      var legacyBuildMult = (typeof omniaPumpProductionWhileBuilding === 'function') ? omniaPumpProductionWhileBuilding(bj) : 1;
      var legacyBonusShare = legacyWeightTotal > 0 ? legacyBodyBonus * legacyWeights[bj] / legacyWeightTotal : 0;
      rates[OMNIA_GEN_META[bj].id] = Math.max(0,
        (omniaGenContribution(bj) + legacyBonusShare) * legacyPractice * legacyBoost * legacyBuildMult);
    }
    return rates;
  }

  var stepNum = omniaState.bardonStep || 1;
  var maxPower = 0, maxContributions = [];
  for (var gi = 0; gi < pumpCount; gi++) {
    var meta = OMNIA_GEN_META[gi];
    var maxLevel = omniaUpgradeStepMax(meta.id);
    var maxContribution = omniaGeneratorContributionCurve(maxLevel, gi);
    maxContributions.push(maxContribution);
    maxPower += maxContribution;
  }
  if (maxPower <= 0) return rates;

  var bodies = ['physical', 'astral', 'mental'];
  var referenceCost = bodies.reduce(function(sum, body) {
    return sum + omniaEconomyReferenceBodyCost(body);
  }, 0) / bodies.length;
  // Three mature ten-minute recommendations establish the active-practice
  // baseline. The same 42% reference factor is used by the session award.
  var practiceBaseline = Math.max(95, referenceCost * 0.42) * (1.45 * 1.75) * 3;
  var targetShare = omniaGeneratorTargetShare(stepNum);
  var targetDaily = practiceBaseline * targetShare / (1 - targetShare);
  // The generator hums when you practice: idle days trickle at 55%, and each
  // session today restores 15%, reaching full flow at 3 sessions.
  var practiceMult = Math.min(1, 0.55 + 0.15 * Math.min(3, omniaSessionsToday()));
  var boost = (typeof getActiveAkashaBoost === 'function' && typeof omniaState !== 'undefined' && omniaState) ? getActiveAkashaBoost() : 1;
  for (var gj = 0; gj < pumpCount; gj++) {
    var gid = OMNIA_GEN_META[gj].id;
    var lvl = (omniaState.upgrades && omniaState.upgrades[gid]) || 1;
    var ownCore = omniaGeneratorContributionCurve(lvl, gj);
    var ownProgress = Math.min(1, ownCore / maxContributions[gj]);
    var ownWeight = maxContributions[gj] / maxPower;
    var resonance = (typeof dmResonanceMult === 'function') ? dmResonanceMult(gj) : 1;
    var buildMult = (typeof omniaPumpProductionWhileBuilding === 'function') ? omniaPumpProductionWhileBuilding(gj) : 1;
    rates[gid] = Math.max(0, (targetDaily / 24) * ownWeight * (0.65 + 0.35 * ownProgress)
      * practiceMult * boost * resonance * buildMult);
  }
  return rates;
}

function omniaRatePerHour() {
  var rates = omniaPumpRatesPerHour();
  return Math.floor(Object.keys(rates).reduce(function(sum, gid) { return sum + (rates[gid] || 0); }, 0));
}

function omniaReservoirCap() {
  // Idle buffer: akasha trickles in at the hourly rate and fills this well until
  // you collect. Tuned to start small — so early passive banking is weak and you
  // must actually show up to collect — then scale steeply with the Deep Vessel
  // upgrade and body total so late-game collections become large and rewarding.
  // This governs only the idle buffer. The wallet itself is intentionally
  // uncapped: earned Akasha belongs to the player once it is collected.
  var vessel = omniaState.upgrades.vessel || 1;
  var bodyTotal = Math.max(0, omniaBodyTotal());
  return Math.floor(180 + Math.pow(vessel - 1, 2) * 30 + Math.pow(bodyTotal, 1.15) * 3);
}

function omniaUpgradeStepMax(upgId) {
  // Dark Matter pumps keep their own finite cap even in Book II.
  if (typeof dmUpgradeLevelCap === 'function' && dmUpgradeLevelCap(upgId)) return dmUpgradeLevelCap(upgId);
  // Once Book II opens, all three mastery thresholds and the final 20-level
  // band remain available even though bardonStep resets to 1.
  if (typeof darkMatterUnlocked === 'function' && darkMatterUnlocked()) return OMNIA_UPGRADE_FINAL_LEVEL;
  var step = omniaState.bardonStep || 1;
  // One finite cap per Step I–X, continuing the early progression's widening
  // deltas (current/vessel +3,+4,+5,…; attunement +2,+3,+4,…) so each step
  // opens a few more levels rather than jumping to an "unlimited" placeholder.
  var caps = {
    current:    [3, 6, 10, 15, 21, 28, 36, 45, 60, 80],
    gen2:       [3, 6, 10, 15, 21, 28, 36, 45, 60, 80],
    gen3:       [3, 6, 10, 15, 21, 28, 36, 45, 60, 80],
    vessel:     [3, 6, 10, 15, 21, 28, 36, 45, 60, 80],
    vessel2:    [3, 6, 10, 15, 21, 28, 36, 45, 60, 80],
    vessel3:    [3, 6, 10, 15, 21, 28, 36, 45, 60, 80],
    attunement: [2, 4, 7, 11, 16, 22, 29, 37, 56, 80],
    attune2:    [2, 4, 7, 11, 16, 22, 29, 37, 56, 80],
    attune3:    [2, 4, 7, 11, 16, 22, 29, 37, 56, 80],
    quickening: [2, 4, 7, 11, 16, 22, 29, 37, 56, 80],
    quick2:     [2, 4, 7, 11, 16, 22, 29, 37, 56, 80],
    quick3:     [2, 4, 7, 11, 16, 22, 29, 37, 56, 80]
  };
  return (caps[upgId] || caps.current)[Math.min(step - 1, 9)];
}

function omniaUpgradeAtMax(upgId) {
  return (omniaState.upgrades[upgId] || 1) >= omniaUpgradeStepMax(upgId);
}

function omniaAccrue() {
  var now = Date.now();
  var elapsedHours = Math.max(0, (now - (omniaState.lastTick || now)) / 3600000);
  if (elapsedHours > 0) {
    if (!omniaState.reservoirs || typeof omniaState.reservoirs !== 'object') omniaState.reservoirs = {};
    var mult = omniaPrestigeMult() * omniaDevotionMult();
    var shares = omniaPumpShares();
    var n = omniaGenUnlockedCount(), earned = 0;
    for (var i = 0; i < n; i++) {
      var gid = OMNIA_GEN_META[i].id;
      // Keep the gain fractional: flooring here would throw away any sub-unit
      // remainder every call, so frequent accrual (the once-a-second live tick)
      // would never move slowly-filling pumps. Reservoirs hold floats; the UI
      // floors them only for display.
      var gain = elapsedHours * (shares[gid] || 0) * mult;
      if (gain <= 0) continue;
      var cap = omniaPumpReservoirCap(i);
      var before = omniaState.reservoirs[gid] || 0;
      omniaState.reservoirs[gid] = Math.min(cap, before + gain);
      earned += Math.max(0, omniaState.reservoirs[gid] - before);
    }
    if (earned > 0) omniaMintAkasha(earned, 'generator-accrual', { generators: n }, false);
    // Dark Matter pumps drip in the same pass. No prestige/devotion/boost
    // multipliers apply — ◆ stays scarce by design. A pump that is upgrading
    // is offline, like the akasha pumps.
    var dn = (typeof dmGenUnlockedCount === 'function') ? dmGenUnlockedCount() : 0;
    for (var di = 0; di < dn; di++) {
      var dgid = DM_GEN_META[di].id;
      var dmBuildMult = (typeof dmStabilizationMult === 'function') ? dmStabilizationMult(di) : 1;
      if (dmBuildMult <= 0) continue;
      var dcap = dmPumpReservoirCap(di);
      omniaState.reservoirs[dgid] = Math.min(dcap, (omniaState.reservoirs[dgid] || 0) + elapsedHours * dmGenRatePerDay(di) * dmBuildMult / 24);
    }
  }
  omniaState.lastTick = now;
  saveOmniaState();
}

function omniaStage() {
  // Book II: the stage tells the Evocation story instead of the body total.
  if (typeof darkMatterUnlocked === 'function' && darkMatterUnlocked()) {
    if (bookIICurrentToolIdx() < BOOK2_TOOLS.length) return { name:'Forge', sub:'The instruments of the art take shape.' };
    if (bookIISphereCount() < BOOK2_SPHERES.length) return { name:'Wanderer', sub:'Omnia walks the planetary spheres.' };
    return { name:'Sovereign', sub:'All spheres traversed. The next Evocation awaits.' };
  }
  var total = omniaBodyTotal();
  if (total >= 210) return { name:'Gate', sub:'Omnia can hold a complete triadic current.' };
  if (total >= 150) return { name:'Star', sub:'The three bodies are beginning to harmonize.' };
  if (total >= 105) return { name:'Voice', sub:'Omnia speaks more clearly through repeated practice.' };
  if (total >= 75) return { name:'Mirror', sub:'The astral and mental forms are becoming distinct.' };
  if (total >= 54) return { name:'Vessel', sub:'Omnia is learning to take form through your practice.' };
  return { name:'Seed', sub:'A small center of light waits for nourishment.' };
}

function omniaBodyRawCost(body) {
  var lvl = Math.max(1, omniaState.bodies[body] || 1);
  var built = Math.max(0, lvl - 1);
  var stepNum = omniaState.bardonStep || 1;
  // Tuned so buying levels stays the primary akasha sink at every rank instead
  // of akasha piling up faster than it can be spent. Costs run ~2-2.5x the old
  // flattened curve (linear 1.5→4, exp coef 0.48→1.2, exp 1.12→1.18, step tax
  // 11%→13%) so each level is a real commitment without outrunning income.
  var base = 78 + built * 4 + Math.floor(Math.pow(built, 1.18) * 1.2);
  var stepMult = 1 + Math.max(0, stepNum - 1) * 0.13;
  return Math.floor(base * stepMult);
}

// Rewards and generator targets follow the body-cost curve, but use a stable
// reference discount so buying Attunement can never reduce future income.
function omniaEconomyReferenceBodyCost(body) {
  return Math.max(1, Math.floor(omniaBodyRawCost(body) * 0.72));
}

function omniaBodyCost(body) {
  return Math.floor(omniaBodyRawCost(body) * omniaDiscountMult());
}

function omniaDiscountMult() {
  var att = (omniaState.upgrades && omniaState.upgrades.attunement) || 1;
  return omniaAttunementDiscountMult(att);
}
function omniaCosmeticCost(item) {
  // Dark Current items are ◆-priced and flat — like the pumps, the dark
  // current cannot be hurried, so Attunement's discount doesn't apply.
  if (item && item.dm) {
    if (typeof DARK_CURRENT_PREVIEW !== 'undefined' && DARK_CURRENT_PREVIEW) return 0; // temp: free while previewing
    return item.cost || 0;
  }
  return Math.floor((item.cost || 0) * omniaDiscountMult());
}
function omniaUpgradeCost(upg) {
  var lvl = omniaState.upgrades[upg.id] || 1;
  var raw = Math.floor((upg.base + (lvl - 1) * upg.step) * Math.pow(1.14, Math.max(0, lvl - 1)));
  // A pump upgrade is cheapened by that pump's own Attunement; anything else
  // uses the global Attunement (Generator I's).
  var pump = _pumpOfUpgrade(upg.id);
  var att = pump ? (omniaState.upgrades[pump.attune] || 1) : (omniaState.upgrades.attunement || 1);
  return Math.floor(raw * omniaAttunementDiscountMult(att));
}

// ── Prestige (Magical Evocation) ─────────────────────────────────
// Completing Bardon Step X lets the practitioner begin the path again, deeper.
// A prestige resets ONLY the path position (step + bodies + recommended count);
// akasha, upgrades, cosmetics, streaks, history and level are all preserved.
// Each prestige grants a permanent +25% akasha and cuts the step requirements
// (see omniaReqFactor): the first re-walk is halved, then 0.4, then the 0.3
// floor as Book II opens — so re-walking is genuinely faster each turning.
// +25% akasha per prestige, capped at +75% (P3). Akasha retires as the gate
// when Dark Matter / Book II opens at the 3rd Prestige, so the bonus stops
// climbing there — the reward past P3 is Book II depth, not more akasha.
function omniaPrestigeMult() { return 1 + 0.25 * Math.min(PRESTIGE_BOOK2, omniaState.prestige || 0); }
// ── Dark Matter (Book II currency) ─────────────────────────────
// A second current that only awakens at the 3rd Prestige, minted by the advanced
// exercises. Book II upgrades (tools, spheres) will spend it alongside akasha.
var PRESTIGE_BOOK2 = 3;            // prestiges required before Dark Matter awakens
var DARK_MATTER_PER_ADVANCED = 30; // sized so total Book II sinks (~11k ◆) ≈ months, not years
function darkMatterUnlocked() { return (omniaState.prestige || 0) >= PRESTIGE_BOOK2; }
function mintDarkMatter(amount) {
  if (!darkMatterUnlocked() || amount <= 0) return 0;
  // Dark Current cosmetics (and Seraph) raise every mint. Applied here so
  // pumps and practice drills both benefit without touching their call sites.
  if (typeof getOmniaDmBoost === 'function') amount = Math.round(amount * getOmniaDmBoost());
  omniaState.darkMatter = (omniaState.darkMatter || 0) + amount;
  omniaState.totalDarkMatterEarned = (omniaState.totalDarkMatterEarned || 0) + amount;
  saveOmniaState(); // completion pipeline already pushes the sync
  return amount;
}
// Practice-minted ◆ (advanced drills) is clamped like akasha awards: mints
// must be ≥60s apart and cap at 10 per day, so quick-tapping through drill
// completions can't out-earn genuine practice. Pump collection bypasses this
// (it's already rate-limited by the pumps' own drip).
var DM_MINT_DAILY_CAP = 10;
function mintDarkMatterFromPractice(amount) {
  if (!darkMatterUnlocked() || amount <= 0) return 0;
  var now = Date.now();
  if (now - (omniaState.lastDmMintMs || 0) < 60000) return 0;
  var todayStr = presenceDayKey();
  if (omniaState.dmMintDate !== todayStr) { omniaState.dmMintDate = todayStr; omniaState.dmMintCount = 0; }
  if ((omniaState.dmMintCount || 0) >= DM_MINT_DAILY_CAP) return 0;
  omniaState.dmMintCount = (omniaState.dmMintCount || 0) + 1;
  omniaState.lastDmMintMs = now;
  return mintDarkMatter(amount);
}
