function omniaBodyTotal() {
  return (omniaState.bodies.physical || 0) + (omniaState.bodies.astral || 0) + (omniaState.bodies.mental || 0);
}

// Sessions completed today — feeds the generator's practice multiplier.
function omniaSessionsToday() {
  var todayStr = new Date().toISOString().slice(0, 10);
  if (omniaState.sessionsTodayDate !== todayStr) return 0;
  return omniaState.sessionsTodayCount || 0;
}

function omniaRatePerHour() {
  var total = omniaBodyTotal();
  var inBookII = typeof darkMatterUnlocked === 'function' && darkMatterUnlocked();
  // Book II: the refined bodies (astral/mental/wisdom) take over feeding the
  // generator, so income keeps scaling as the operator is built for the spheres.
  if (inBookII) {
    var b2b = bookIIBodies();
    total += (b2b.astral || 1) + (b2b.mental || 1) + (b2b.wisdom || 1);
  }
  var stepNum = omniaState.bardonStep || 1;
  var earlyBoost = total < 48 ? Math.floor((48 - total) * 1.5) : 0;
  var stepTax = Math.max(0, stepNum - 1) * 16;
  var bodyBonus = Math.floor(Math.sqrt(Math.max(0, total)) * 9);
  // Each unlocked generator (I always; II at Step V; III at Step IX; all three
  // in Book II) is its own upgrade track and contributes from its OWN level. A
  // generator earns nothing while it is itself under construction; the others
  // keep running. If every active generator is offline, the flow is 0.
  var genCount = inBookII ? 3 : (1 + (stepNum >= 5 ? 1 : 0) + (stepNum >= 9 ? 1 : 0));
  var genSum = 0, genActive = 0;
  for (var gi = 0; gi < genCount; gi++) {
    if (typeof omniaUpgradeBuilding === 'function' && omniaUpgradeBuilding(OMNIA_GEN_META[gi].id)) continue;
    genSum += omniaGenContribution(gi);
    genActive++;
  }
  if (genActive === 0) return 0; // every generator is mid-upgrade
  var base = genSum + Math.floor(bodyBonus * 0.5) + Math.floor(earlyBoost * 0.3) - stepTax;
  // The generator hums when you practice: idle days trickle at 55%, and each
  // session today restores 15%, reaching full flow at 3 sessions.
  var practiceMult = Math.min(1, 0.55 + 0.15 * Math.min(3, omniaSessionsToday()));
  var boost = (typeof getActiveAkashaBoost === 'function' && typeof omniaState !== 'undefined' && omniaState) ? getActiveAkashaBoost() : 1;
  return Math.max(10, Math.floor(base * practiceMult * boost));
}

function omniaReservoirCap() {
  // Idle buffer: akasha trickles in at the hourly rate and fills this well until
  // you collect. Tuned to start small — so early passive banking is weak and you
  // must actually show up to collect — then scale steeply with the Deep Vessel
  // upgrade and body total so late-game collections become large and rewarding.
  // Deliberately does NOT touch the earning rate, body costs, or wallet cap, so
  // the core economy stays balanced; this only governs the idle buffer size.
  // Start ≈ 130 · Step IV ≈ 3,000 · Step X ≈ 80,000 (was 318 / 3,000 / 42,330).
  var vessel = omniaState.upgrades.vessel || 1;
  var bodyTotal = Math.max(0, omniaBodyTotal());
  return Math.floor(120 + Math.pow(vessel - 1, 2) * 30 + Math.pow(bodyTotal, 1.15) * 3);
}

function omniaAkashaCap() {
  // Book II sits past Step X (bardonStep frozen at 1) — keep the endgame cap.
  if (typeof darkMatterUnlocked === 'function' && darkMatterUnlocked()) return 80000000;
  var step = omniaState.bardonStep || 1;
  return [6000, 18000, 45000, 100000, 220000, 800000, 2500000, 8000000, 25000000, 80000000][step - 1] || 80000000;
}

function omniaUpgradeStepMax(upgId) {
  // Dark Matter pumps keep their own finite cap even in Book II.
  if (typeof dmGenIdx === 'function' && dmGenIdx(upgId) >= 0) return DM_GEN_LEVEL_CAP;
  // Book II (Magical Evocation) sits past Step X — caps are fully open there,
  // since bardonStep is reset to 1 and no longer advances. Infinity → the UI
  // renders it as uncapped rather than a placeholder number.
  if (typeof darkMatterUnlocked === 'function' && darkMatterUnlocked()) return Infinity;
  var step = omniaState.bardonStep || 1;
  // One finite cap per Step I–X, continuing the early progression's widening
  // deltas (current/vessel +3,+4,+5,…; attunement +2,+3,+4,…) so each step
  // opens a few more levels rather than jumping to an "unlimited" placeholder.
  var caps = {
    current:    [3, 6, 10, 15, 21, 28, 36, 45, 55, 66],
    gen2:       [3, 6, 10, 15, 21, 28, 36, 45, 55, 66],
    gen3:       [3, 6, 10, 15, 21, 28, 36, 45, 55, 66],
    vessel:     [3, 6, 10, 15, 21, 28, 36, 45, 55, 66],
    vessel2:    [3, 6, 10, 15, 21, 28, 36, 45, 55, 66],
    vessel3:    [3, 6, 10, 15, 21, 28, 36, 45, 55, 66],
    attunement: [2, 4, 7, 11, 16, 22, 29, 37, 46, 56],
    attune2:    [2, 4, 7, 11, 16, 22, 29, 37, 46, 56],
    attune3:    [2, 4, 7, 11, 16, 22, 29, 37, 46, 56],
    quickening: [2, 4, 7, 11, 16, 22, 29, 37, 46, 56],
    quick2:     [2, 4, 7, 11, 16, 22, 29, 37, 46, 56],
    quick3:     [2, 4, 7, 11, 16, 22, 29, 37, 46, 56]
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
    if (earned > 0) omniaState.totalAkashaEarned = Math.floor((omniaState.totalAkashaEarned || 0) + earned);
    // Dark Matter pumps drip in the same pass. No prestige/devotion/boost
    // multipliers apply — ◆ stays scarce by design. A pump that is upgrading
    // is offline, like the akasha pumps.
    var dn = (typeof dmGenUnlockedCount === 'function') ? dmGenUnlockedCount() : 0;
    for (var di = 0; di < dn; di++) {
      var dgid = DM_GEN_META[di].id;
      if (omniaUpgradeBuilding(dgid)) continue;
      var dcap = dmPumpReservoirCap(di);
      omniaState.reservoirs[dgid] = Math.min(dcap, (omniaState.reservoirs[dgid] || 0) + elapsedHours * dmGenRatePerDay(di) / 24);
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

function omniaBodyCost(body) {
  var lvl = Math.max(1, omniaState.bodies[body] || 1);
  var built = Math.max(0, lvl - 1);
  var stepNum = omniaState.bardonStep || 1;
  // Tuned so buying levels stays the primary akasha sink at every rank instead
  // of akasha piling up faster than it can be spent. Costs run ~2-2.5x the old
  // flattened curve (linear 1.5→4, exp coef 0.48→1.2, exp 1.12→1.18, step tax
  // 11%→13%) so each level is a real commitment without outrunning income.
  var base = 78 + built * 4 + Math.floor(Math.pow(built, 1.18) * 1.2);
  var stepMult = 1 + Math.max(0, stepNum - 1) * 0.13;
  return Math.floor(base * stepMult * omniaDiscountMult());
}

function omniaDiscountMult() {
  var att = (omniaState.upgrades && omniaState.upgrades.attunement) || 1;
  return Math.max(0.5, 1 - (att - 1) * 0.05);
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
  return Math.floor(raw * Math.max(0.5, 1 - (att - 1) * 0.05));
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
  var todayStr = new Date().toISOString().slice(0, 10);
  if (omniaState.dmMintDate !== todayStr) { omniaState.dmMintDate = todayStr; omniaState.dmMintCount = 0; }
  if ((omniaState.dmMintCount || 0) >= DM_MINT_DAILY_CAP) return 0;
  omniaState.dmMintCount = (omniaState.dmMintCount || 0) + 1;
  omniaState.lastDmMintMs = now;
  return mintDarkMatter(amount);
}
