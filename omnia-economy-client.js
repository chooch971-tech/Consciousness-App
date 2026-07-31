function omniaBodyTotal() {
  return (omniaState.bodies.physical || 0) + (omniaState.bodies.astral || 0) + (omniaState.bodies.mental || 0);
}

// Autonomous hourly output. Step only unlocks pumps and deeper upgrade bands;
// it never changes an already-running pump's rate. Pump I starts lower but has
// the strongest per-level Current so all three remain distinct and worthwhile.
var OMNIA_GEN_BASE_HOUR = [22, 28, 34];
var OMNIA_GEN_PER_LEVEL_HOUR = [12, 10, 10];

// Production is read from the level shown on the card (1–20 within the current
// band), not the lifetime level, so tiering a generator genuinely returns it to
// Level 1. The tier multiplier makes that reset worth taking: the new Level 1
// out-produces the old Level 1 several times over, and the band's ceiling
// clears the previous ceiling by the same factor.
function omniaGeneratorContributionCurve(level, idx) {
  var lvl = Math.max(1, Number(level) || 1);
  var genId = (typeof OMNIA_GEN_META !== 'undefined' && OMNIA_GEN_META[idx]) ? OMNIA_GEN_META[idx].id : 'current';
  var band = omniaUpgradeDisplayLevel(genId, lvl);
  return ((OMNIA_GEN_BASE_HOUR[idx] || 34) + (band - 1) * (OMNIA_GEN_PER_LEVEL_HOUR[idx] || 10))
    * omniaCurrentMasteryMult(genId);
}

var OMNIA_MASTERY_SPAN = 20;
var OMNIA_MASTERY_CAP = 3;
var OMNIA_UPGRADE_FINAL_LEVEL = 80;

// ── Generator tiers ──────────────────────────────────────────────────────────
// A generator tiers up as a whole, only once all four of its tracks have been
// carried to the top of the current band. Tiering used to be per track, which
// made it a free action on three of them: cost is read from the band while
// reservoir capacity, the cost discount, and build speed are read from the
// lifetime level, so resetting Deep Vessel / Attunement / Quickening collapsed
// their price ~50x and left the reward untouched or better. Requiring all four
// removes the cherry-pick and makes the four branches develop together.
//
// The tier is stored rather than derived because levels are monotonic — cloud
// sync max-merges them, which is why the bands are presentational — so the tier
// is a counter that also only ever climbs.
// Which four tracks belong to which generator. Declared here rather than read
// from the engine's OMNIA_GEN_META so the economy stays free of that dependency
// — tiers are an economy concept, and the engine only draws them.
// Built from the groups declared in omnia-state-client.js (which loads first
// and needs them for the save migration), so the two can never drift apart.
var OMNIA_GENERATOR_TRACKS = (function() {
  var groups = (typeof OMNIA_TIER_TRACK_GROUPS !== 'undefined') ? OMNIA_TIER_TRACK_GROUPS : [
    ['current', 'vessel', 'attunement', 'quickening'],
    ['gen2', 'vessel2', 'attune2', 'quick2'],
    ['gen3', 'vessel3', 'attune3', 'quick3']
  ];
  var out = {};
  groups.forEach(function(g) { out[g[0]] = g.slice(); });
  return out;
})();
var OMNIA_TRACK_GENERATOR = (function() {
  var out = {};
  Object.keys(OMNIA_GENERATOR_TRACKS).forEach(function(gen) {
    OMNIA_GENERATOR_TRACKS[gen].forEach(function(track) { out[track] = gen; });
  });
  return out;
})();
function omniaGeneratorOfTrack(upgId) { return OMNIA_TRACK_GENERATOR[upgId] || null; }

function omniaGenTier(genId) {
  var tiers = (omniaState && omniaState.genTiers) || {};
  return Math.max(0, Math.min(OMNIA_MASTERY_CAP, Number(tiers[genId]) || 0));
}

// The tier governing one upgrade track, via the generator that owns it.
function omniaTierForUpgrade(upgId) {
  var gen = omniaGeneratorOfTrack(upgId);
  return gen ? omniaGenTier(gen) : 0;
}

// The level shown on the card: where this track stands inside its current band.
function omniaUpgradeDisplayLevel(upgId, rawLevel) {
  var lvl = Math.max(1, Number(rawLevel == null ? ((omniaState.upgrades || {})[upgId] || 1) : rawLevel) || 1);
  var band = lvl - omniaTierForUpgrade(upgId) * OMNIA_MASTERY_SPAN;
  return Math.max(1, Math.min(OMNIA_MASTERY_SPAN, band));
}

// Kept under its original name: everything that scaled by "mastery rank" now
// scales by the owning generator's tier.
function omniaUpgradeMasteryRank(upgId, rawLevel) {
  return omniaTierForUpgrade(upgId);
}

// The top of a track's current band — the level it may not be bought past
// until the whole generator tiers up.
function omniaUpgradeBandTop(upgId) {
  return omniaTierForUpgrade(upgId) * OMNIA_MASTERY_SPAN + OMNIA_MASTERY_SPAN;
}
function omniaUpgradeAtBandTop(upgId) {
  return (Math.max(1, Number((omniaState.upgrades || {})[upgId]) || 1)) >= omniaUpgradeBandTop(upgId);
}

// A generator may tier up only when every one of its four tracks sits at the
// top of the band, and only while it has tiers left to climb.
function omniaGenTierReady(genId) {
  var gen = omniaGeneratorOfTrack(genId);
  if (!gen) return false;
  if (omniaGenTier(gen) >= OMNIA_MASTERY_CAP) return false;
  var top = omniaGenTier(gen) * OMNIA_MASTERY_SPAN + OMNIA_MASTERY_SPAN;
  if (top > OMNIA_UPGRADE_FINAL_LEVEL) return false;
  return OMNIA_GENERATOR_TRACKS[gen].every(function(id) {
    return (Math.max(1, Number((omniaState.upgrades || {})[id]) || 1)) >= top;
  });
}

// How many of the four are still short, for the button's own label.
function omniaGenTracksRemaining(genId) {
  var gen = omniaGeneratorOfTrack(genId);
  if (!gen) return 4;
  var top = omniaGenTier(gen) * OMNIA_MASTERY_SPAN + OMNIA_MASTERY_SPAN;
  return OMNIA_GENERATOR_TRACKS[gen].filter(function(id) {
    return (Math.max(1, Number((omniaState.upgrades || {})[id]) || 1)) < top;
  }).length;
}

// Total branch levels still owed before this generator can tier up, counted in
// the band levels the cards actually display. "4 of 4 branches short" reads the
// same at the very start of a band as it does one level from the end, which
// made it impossible to tell progress — or to tell whether anything had moved
// at all. This gives the panel a number that changes with every purchase.
function omniaGenLevelsRemaining(genId) {
  var gen = omniaGeneratorOfTrack(genId);
  if (!gen) return 0;
  return OMNIA_GENERATOR_TRACKS[gen].reduce(function(sum, id) {
    return sum + Math.max(0, OMNIA_MASTERY_SPAN - omniaUpgradeDisplayLevel(id));
  }, 0);
}
function omniaMasteryRoman(rank) { return ['', 'I', 'II', 'III'][Math.max(0, Math.min(3, rank || 0))] || ''; }
// What one mastery band is worth. Both production and upgrade cost are read
// from the band level and then scaled by this, so a mastery drops the pump back
// to Level 1 on a curve that is this much stronger than the one before it.
var OMNIA_MASTERY_BAND_MULT = 1.5;
function omniaMasteryScale(rank) {
  return 1 + OMNIA_MASTERY_BAND_MULT * Math.max(0, Math.min(OMNIA_MASTERY_CAP, rank || 0));
}
// The inline badge sits directly beside names that already carry a roman
// numeral ("Generator I"), where a second one reads as part of the name rather
// than as a mastery tier. Pips carry the same count without the collision; the
// explicit "Mastery II" buttons keep their numerals, where they are unambiguous.
function omniaMasteryPips(rank) {
  return new Array(Math.max(0, Math.min(OMNIA_MASTERY_CAP, rank || 0)) + 1).join('\u2726');
}
function omniaCurrentMasteryMult(genId) { return omniaMasteryScale(omniaGenTier(genId)); }
function omniaAttunementDiscountMult(level, attuneId) {
  var lvl = Math.max(1, Number(level) || 1);
  var mastery = omniaTierForUpgrade(attuneId || 'attunement');
  // Preserve the original early curve and make each mastery break the old 50%
  // floor by another five points, to a firm 65% maximum discount.
  return Math.max(0.35, Math.max(0.5 - mastery * 0.05, 1 - (lvl - 1) * 0.05));
}

// Each Akasha pump owns an additive hourly rate. Step, sessions, and body levels
// do not participate: Current/mastery, paired Resonance, and that pump's
// construction state are its entire production formula. Explicit Akasha boosts
// remain rewards, while prestige/devotion apply later at accrual time.
function omniaPumpRatesPerHour() {
  var rates = {};
  var pumpCount = (typeof darkMatterUnlocked === 'function' && darkMatterUnlocked())
    ? 3
    : 1 + ((omniaState.bardonStep || 1) >= 5 ? 1 : 0) + ((omniaState.bardonStep || 1) >= 9 ? 1 : 0);
  var boost = (typeof getActiveAkashaBoost === 'function' && typeof omniaState !== 'undefined' && omniaState) ? getActiveAkashaBoost() : 1;
  for (var i = 0; i < pumpCount; i++) {
    var gid = OMNIA_GEN_META[i].id;
    var buildMult = (typeof omniaPumpProductionWhileBuilding === 'function') ? omniaPumpProductionWhileBuilding(i) : 1;
    rates[gid] = Math.max(0, omniaGenContribution(i) * boost * buildMult);
  }
  return rates;
}

function omniaRatePerHour() {
  var rates = omniaPumpRatesPerHour();
  return Math.floor(Object.keys(rates).reduce(function(sum, gid) { return sum + (rates[gid] || 0); }, 0));
}

function omniaReservoirCap() {
  // Reservoir capacity is autonomous too: only this pump's Deep Vessel and its
  // mastery matter. The wallet itself remains intentionally uncapped.
  var vessel = omniaState.upgrades.vessel || 1;
  var masteryMult = 1 + 0.25 * omniaUpgradeMasteryRank('vessel', vessel);
  return Math.floor((180 + Math.pow(vessel - 1, 2) * 30) * masteryMult);
}

function omniaUpgradeStepMax(upgId) {
  // Dark Matter pumps keep their own finite cap even in Book II. They have no
  // tier bands, so they return before the band clamp below.
  if (typeof dmUpgradeLevelCap === 'function' && dmUpgradeLevelCap(upgId)) return dmUpgradeLevelCap(upgId);
  // A track can never be bought past the top of its band: the generator has to
  // tier up first, and that needs all four of its tracks standing there.
  var bandTop = omniaUpgradeBandTop(upgId);
  // Once Book II opens, all four bands remain available even though bardonStep
  // resets to 1 — but the band clamp still applies.
  if (typeof darkMatterUnlocked === 'function' && darkMatterUnlocked()) {
    return Math.min(OMNIA_UPGRADE_FINAL_LEVEL, bandTop);
  }
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
  return Math.min((caps[upgId] || caps.current)[Math.min(step - 1, 9)], bandTop);
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
  // Price the level the card is actually showing. Charging against the lifetime
  // level meant a track that had just attained a mastery displayed "Level 1"
  // while quoting the level-21 price — 78,612 where Level 1 costs 520, and over
  // two million after the second mastery. The band multiplier keeps each band's
  // cost curve proportional to the production it now yields.
  var band = omniaUpgradeDisplayLevel(upg.id, lvl);
  var raw = Math.floor((upg.base + (band - 1) * upg.step)
    * Math.pow(1.14, Math.max(0, band - 1))
    * omniaMasteryScale(omniaUpgradeMasteryRank(upg.id, lvl)));
  // A pump upgrade is cheapened by that pump's own Attunement; anything else
  // uses the global Attunement (Generator I's).
  var pump = _pumpOfUpgrade(upg.id);
  var attId = pump ? pump.attune : 'attunement';
  var att = omniaState.upgrades[attId] || 1;
  return Math.floor(raw * omniaAttunementDiscountMult(att, attId));
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
