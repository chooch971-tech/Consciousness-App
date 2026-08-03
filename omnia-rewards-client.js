function omniaCurrentStep() {
  var stepNum = omniaState.bardonStep || 1;
  return OMNIA_BARDON_STEPS.find(function(s) { return s.step === stepNum; }) || OMNIA_BARDON_STEPS[0];
}

function omniaStepReady(step) {
  return (omniaState.bodies.physical || 0) >= omniaStepReqVal(step, 'physical')
    && (omniaState.bodies.astral || 0) >= omniaStepReqVal(step, 'astral')
    && (omniaState.bodies.mental || 0) >= omniaStepReqVal(step, 'mental')
    && (omniaState.completedRecommended || 0) >= omniaStepReqVal(step, 'recommended');
}

function renderOmniaStepReq(label, current, target) {
  var done = current >= target;
  return '<div class="omnia-step-req' + (done ? ' done' : '') + '"><span>' + label + '</span><span>' + Math.min(current, target) + ' / ' + target + '</span></div>';
}

function omniaPickRecommendation(forceNew) {
  var guided = omniaPickGuidedPathRecommendation(forceNew);
  if (guided) return guided;
  if (!forceNew && omniaState.rec && OMNIA_EXERCISE_META[omniaState.rec.id]) return omniaState.rec;

  var history = (typeof concState !== 'undefined' && concState.history) ? concState.history : [];
  var bodies = omniaState.bodies;
  var allIds = Object.keys(OMNIA_EXERCISE_META);

  // Count how many times each exercise appears in all history (lifetime) and last 20 sessions (affinity)
  var lifetimeCounts = {}, recentCounts = {};
  allIds.forEach(function(id) { lifetimeCounts[id] = 0; recentCounts[id] = 0; });
  history.forEach(function(h, i) {
    allIds.forEach(function(id) {
      if (omniaHistoryMatches(id, h)) {
        lifetimeCounts[id]++;
        if (i < 20) recentCounts[id]++;
      }
    });
  });

  // Strongest body level — used to normalize balance nudge
  var bodyKeys = ['mental', 'astral', 'physical'];
  var maxBody = Math.max.apply(null, bodyKeys.map(function(b) { return bodies[b] || 0; }));
  maxBody = Math.max(1, maxBody);

  var lastRecId = omniaState.rec ? omniaState.rec.id : null;
  var clockBest = (typeof concState !== 'undefined' && concState.bestSeconds) ? concState.bestSeconds : 0;

  var scored = allIds.map(function(id) {
    var meta = OMNIA_EXERCISE_META[id];
    var bodyLevel = bodies[meta.body] || 0;

    // Novelty: exercises done fewer than 10 times ever get a push (0–8 pts)
    var novelty = Math.max(0, 10 - lifetimeCounts[id]) / 10 * 8;

    // Affinity: how often the player chooses this exercise (capped at 8 to not overwhelm novelty)
    var affinity = Math.min(8, recentCounts[id]);

    // Balance nudge: gentle tilt toward weaker bodies (0–2 pts)
    var balance = (1 - bodyLevel / maxBody) * 2;

    // Clock mastery bonus: if clock hasn't been held for 3+ minutes, keep nudging it
    var mastery = (id === 'clock' && clockBest < 180) ? 3 : 0;

    // Avoid recommending the same exercise twice in a row
    var sameAsLast = (id === lastRecId) ? -12 : 0;

    // Mild penalty for the most recently completed exercise
    var justDone = (omniaLastDoneIndex(id, history) === 0) ? -4 : 0;

    return { id: id, score: novelty + affinity + balance + mastery + sameAsLast + justDone };
  });

  scored.sort(function(a, b) { return b.score - a.score; });
  var id = scored[0].id || 'clock';
  omniaState.rec = { id: id, setAt: Date.now() };
  saveOmniaState();
  return omniaState.rec;
}

function omniaPickGuidedPathRecommendation(forceNew) {
  if (typeof guideState === 'undefined' || typeof buildGuideRegimentItems !== 'function') return null;
  if (!guideState._pathLockedV2) return null;
  var items = buildGuideRegimentItems().filter(function(item) {
    return item && OMNIA_EXERCISE_META[item.id];
  });
  if (!items.length) return null;
  var choice = items.find(function(item) { return !item.done; }) || items[0];
  if (!forceNew && omniaState.rec && omniaState.rec.guidedPath && omniaState.rec.id === choice.id) return omniaState.rec;
  omniaState.rec = { id:choice.id, setAt:Date.now(), guidedPath:true };
  saveOmniaState();
  return omniaState.rec;
}

// Map a guided-path card id to the OMNIA_EXERCISE_META key whose body it
// trains. Thought sub-modes all feed the mental body via Thought Control;
// sense sub-modes (Feeling/Smell/Taste) all feed the astral body via Senses;
// Soul Mirror and the advanced visual drills don't grant body levels.
function omniaMetaIdForExercise(id) {
  if (id === 'observation' || id === 'focus' || id === 'vacancy') return 'thought';
  if (id === 'feeling' || id === 'smell' || id === 'taste') return 'sense';
  if (id === 'pore') return 'pore_breathing';
  if (OMNIA_EXERCISE_META[id]) return id;
  return null;
}

function omniaExerciseIsGuidedAgenda(exId) {
  if (typeof guideState === 'undefined' || typeof buildGuideRegimentItems !== 'function') return false;
  if (!guideState._pathLockedV2) return false;
  return buildGuideRegimentItems().some(function(item) {
    return omniaMetaIdForExercise(item.id) === exId;
  });
}

// ── Daily body-level budget ───────────────────────────────────────────────
// A player can earn at most omniaBodyAwardsPerDay() free body levels per
// calendar day (1 per recommended session). The budget grows with rank —
// 3/day at Step I up to 6/day at Step IX+ — so deeper practice keeps paying.
function omniaBodyAwardsPerDay() {
  var step = (omniaState && omniaState.bardonStep) || 1;
  return 3 + Math.floor(step / 3);
}
function omniaBodyAwardsRemaining() {
  if (!omniaState) return 0;
  var todayStr = presenceDayKey();
  if (omniaState.bodyAwardsDate !== todayStr) return omniaBodyAwardsPerDay();
  return Math.max(0, omniaBodyAwardsPerDay() - (omniaState.bodyAwardsToday || 0));
}
function omniaConsumeBodyAward(cardId) {
  var todayStr = presenceDayKey();
  if (omniaState.bodyAwardsDate !== todayStr) {
    omniaState.bodyAwardsDate = todayStr;
    omniaState.bodyAwardsToday = 0;
  }
  omniaState.bodyAwardsToday = (omniaState.bodyAwardsToday || 0) + 1;
  omniaState.bodyAwardClaimedIds = Array.isArray(omniaState.bodyAwardClaimedIds) ? omniaState.bodyAwardClaimedIds : [];
  if (cardId && omniaState.bodyAwardClaimedIds.indexOf(cardId) === -1) omniaState.bodyAwardClaimedIds.push(cardId);
}

// Consecutive legitimate exercises should all move the Path. A once-per-hour
// lock punished users who complete a 30-90 minute practice stack in one sitting,
// so credits are instead bounded to three reached recommendations per day.
var OMNIA_SESSION_CREDIT_DAILY_CAP = 3;
function omniaGrantRecommendedSessionCredit(recommended, reachedRec, todayStr) {
  if (!recommended || reachedRec === false) return false;
  if (omniaState.sessionCreditDate !== todayStr) {
    omniaState.sessionCreditDate = todayStr;
    omniaState.sessionCreditsToday = 0;
  }
  if ((omniaState.sessionCreditsToday || 0) >= OMNIA_SESSION_CREDIT_DAILY_CAP) return false;
  omniaState.sessionCreditsToday = (omniaState.sessionCreditsToday || 0) + 1;
  omniaState.completedRecommended = (omniaState.completedRecommended || 0) + 1;
  omniaState.lastSessionCreditMs = Date.now();
  return true;
}
// The body a given exercise will actually raise: its natural body, or — if that
// one is already capped for the current step — the next uncapped body, in the
// order mental → astral → physical. Returns null when all three are capped.
function omniaPickAwardBody(preferred) {
  var order = [preferred, 'mental', 'astral', 'physical'];
  for (var i = 0; i < order.length; i++) {
    if (order[i] && !omniaBodyAtCap(order[i])) return order[i];
  }
  return null;
}
// How many exercises can glow with a body-level highlight (and therefore
// actually grant one) at once. Starts low and rises with rank alongside
// the daily budget, but never exceeds it.
function omniaHighlightCap() {
  var step = (omniaState && omniaState.bardonStep) || 1;
  var byStep = step <= 3 ? 2 : step <= 5 ? 3 : step <= 7 ? 4 : step <= 9 ? 5 : 6;
  return Math.min(byStep, omniaBodyAwardsPerDay());
}

// A lightweight deterministic shuffle: selections feel random from day to day
// but are stable across re-renders, devices, and cadence changes. Persisting the
// resulting queue makes add/remove and 2x→1x changes unable to reroll rewards.
function omniaBodyAwardHash(text) {
  var h = 2166136261;
  text = String(text || '');
  for (var i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
function omniaBuildDailyBodyAwardQueue(items, todayStr) {
  var identity = (typeof authUsername === 'string' && authUsername)
    || (typeof authEmail === 'string' && authEmail) || 'local';
  var seed = String(todayStr || presenceDayKey()) + '|' + identity;
  var byMeta = {};
  (items || []).forEach(function(item) {
    var metaId = item && omniaMetaIdForExercise(item.id);
    if (!metaId) return;
    if (!byMeta[metaId]) byMeta[metaId] = [];
    if (!byMeta[metaId].some(function(row) { return row.id === item.id; })) byMeta[metaId].push({ id:item.id, metaId:metaId });
  });
  var candidates = Object.keys(byMeta).map(function(metaId) {
    byMeta[metaId].sort(function(a, b) {
      return omniaBodyAwardHash(seed + '|card|' + a.id) - omniaBodyAwardHash(seed + '|card|' + b.id) || a.id.localeCompare(b.id);
    });
    return byMeta[metaId][0];
  });
  candidates.sort(function(a, b) {
    return omniaBodyAwardHash(seed + '|meta|' + a.metaId) - omniaBodyAwardHash(seed + '|meta|' + b.metaId) || a.id.localeCompare(b.id);
  });
  return candidates.map(function(row) { return row.id; });
}
function omniaDailyBodyAwardQueue(items) {
  var todayStr = presenceDayKey();
  if (omniaState.bodyAwardSelectionDate !== todayStr || !Array.isArray(omniaState.bodyAwardSelectionIds)) {
    omniaState.bodyAwardSelectionDate = todayStr;
    omniaState.bodyAwardSelectionIds = omniaBuildDailyBodyAwardQueue(items, todayStr);
    omniaState.bodyAwardClaimedIds = [];
    if (typeof saveOmniaState === 'function') saveOmniaState();
  }
  return omniaState.bodyAwardSelectionIds.slice();
}
// The set of OMNIA_EXERCISE_META ids that currently grant a body level if
// completed right now, mapped to the specific path-card id that earns it —
// the ✦ glow on guided-path cards and the actual award in
// awardOmniaForExercise both consult this, so they always agree. Several
// cards (e.g. Vacancy of Mind, Thought Observation) can share a metaId
// ('thought'); only the first such card is marked, so the glow never lights
// up more cards than the body level they'd actually grant.
function omniaHighlightedExerciseIds() {
  var result = {};
  var remaining = omniaBodyAwardsRemaining();
  if (remaining <= 0) return result;
  var cap = Math.min(omniaHighlightCap(), remaining);
  if (cap <= 0) return result;

  if (typeof guideState !== 'undefined' && guideState._pathLockedV2 && typeof buildGuideRegimentItems === 'function') {
    var items = buildGuideRegimentItems().filter(function(item) {
      return item && omniaMetaIdForExercise(item.id);
    });
    var queue = omniaDailyBodyAwardQueue(items);
    var claimed = Array.isArray(omniaState.bodyAwardClaimedIds) ? omniaState.bodyAwardClaimedIds : [];
    // Only the first `cap` unclaimed queue positions are live slots. A removed
    // or newly-completed card keeps its position instead of promoting another
    // exercise, so settings changes cannot manufacture a new body award.
    var slots = queue.filter(function(id) { return claimed.indexOf(id) === -1; }).slice(0, cap);
    slots.forEach(function(cardId) {
      var item = items.find(function(row) { return row.id === cardId; });
      var metaId = item && omniaMetaIdForExercise(item.id);
      if (metaId && !result[metaId]) result[metaId] = item.id;
    });
    return result;
  }
  // No locked path — the single rotating recommendation is the only candidate.
  var rec = omniaPickRecommendation(false);
  if (rec && OMNIA_EXERCISE_META[rec.id]) result[rec.id] = rec.id;
  return result;
}
// Would completing this path card right now grant a body level? Used to
// highlight the card. Honours the daily budget, eligibility, and the cap
// cascade (so a capped mental body still highlights when astral can take it).
function omniaCardGrantsBodyLevel(cardId, isDone, highlighted) {
  if (isDone) return null;
  var metaId = omniaMetaIdForExercise(cardId);
  if (!metaId) return null;
  if (highlighted[metaId] !== cardId) return null;
  return omniaPickAwardBody(OMNIA_EXERCISE_META[metaId].body); // body name or null
}

function omniaLastDoneIndex(id, history) {
  for (var i = 0; i < history.length; i++) {
    if (omniaHistoryMatches(id, history[i])) return i;
  }
  return 999;
}

function omniaHistoryMatches(id, h) {
  if (!h) return false;
  if (id === 'clock') return !h.type && !h.exercise;
  if (id === 'visual') return h.type === 'visualization';
  if (id === 'auditory') return h.type === 'auditory';
  if (id === 'thought') return h.type === 'thought';
  if (id === 'asana') return h.exercise === 'asana';
  if (id === 'pore_breathing') return h.exercise === 'pore_breathing';
  return false;
}

// extraBoost is the caller's cosmetic + temporary akasha-boost multiplier
// (getActiveAkashaBoost() * getOmniaCosmeticBoost()) — folded in here so
// OMNIA_BONUS_STACK_CAP can limit the *combined* stack, not just streak/rec.
function omniaExerciseReward(exId, seconds, recommended, extraBoost) {
  // Akasha only rewards the first 15 minutes of a session — beyond that is
  // unnecessary for the economy, though XP/time still tracks the full length.
  var akashaSeconds = Math.min(seconds || 0, 900);
  var durationMult = 0.25 + 0.75 * Math.min(1.5, akashaSeconds / 600);
  var meta = OMNIA_EXERCISE_META[exId] || OMNIA_EXERCISE_META.clock;
  var referenceCost = omniaEconomyReferenceBodyCost(meta.body);
  // Practice income follows the same cost curve as body construction. This
  // returns the economy's weight to meditation as generator gains flatten,
  // while keeping early awards substantial and the first prestige near the
  // intended 5-6 / 3-4 month activity bands.
  var base = Math.max(95, referenceCost * 0.42) * durationMult;
  var streakMult = 1 + Math.min(0.45, (omniaState.recStreak || 0) * 0.08);
  var recMult = recommended ? 1.75 : 1;
  // Streak + "recommended" bonuses combine with cosmetic/temporary-boost
  // bonuses (extraBoost, from the caller) to multiply a single session's
  // reward. Without a cap, a maxed streak (+45%) and "recommended" bonus
  // (+75%) already multiply by ~2.5x, and a player with every cosmetic
  // unlocked (+64%, the $3.99/mo perk) plus an active quest-chest boost
  // (+20-30%) could reach ~5.4x. Capping the combined stack at 3x keeps
  // bonuses feeling rewarding without trivializing the body-cost curve,
  // while leaving non-paying players (max ~2.54x) untouched.
  var bonusMult = Math.min(streakMult * recMult * (extraBoost || 1), OMNIA_BONUS_STACK_CAP);
  return Math.max(42, Math.floor(base * bonusMult * omniaPrestigeMult() * omniaDevotionMult()));
}
// Permanent +2% akasha from completing the Seven-Day Devotion (one-time). The
// earned flag lives on omniaState so the reward follows the account across sync.
// The Seven Gifts grant a stacking +2% akasha per month completed, capped at
// +48% (24 devotions). devotionStacks is the synced count; the old one-time
// devotionEarned boolean counts as a single stack for players who earned it
// before the monthly rework.
function omniaDevotionStacks() {
  if (typeof omniaState === 'undefined' || !omniaState) return 0;
  var stacks = omniaState.devotionStacks || 0;
  if (!stacks && omniaState.devotionEarned) stacks = 1;
  return Math.min(24, stacks);
}
function omniaDevotionMult() { return 1 + 0.02 * omniaDevotionStacks(); }

var OMNIA_BONUS_STACK_CAP = 3.0;

// Unlocked entities/companions grant a permanent Akasha bonus scaled to each
// item's real price tier (_price). Owning is enough — no need to equip — and
// every unlocked item stacks, so the full collection reaches +64%.
// Dark Current items (dm:true) are priced in ◆ and grant no akasha bonus —
// their dmBonus feeds getOmniaDmBoost instead.
function omniaCosmeticBonusPct(item) {
  if (item && item.dm) return 0;
  return Math.round((item && item._price || 0) / 2000);
}

// Sum the bonus of every unlocked entity and companion, then combine
// multiplicatively with any active temporary boost.
function getOmniaCosmeticBoost() {
  if (!omniaState.cosmetics) return 1;
  var pct = 0;
  var ownedE = omniaState.cosmetics.unlockedEntities || [];
  var ownedC = omniaState.cosmetics.unlockedCompanions || [];
  OMNIA_ENTITIES.forEach(function(e) { if (ownedE.indexOf(e.id) !== -1) pct += omniaCosmeticBonusPct(e); });
  OMNIA_COMPANIONS.forEach(function(c) { if (ownedC.indexOf(c.id) !== -1) pct += omniaCosmeticBonusPct(c); });
  return 1 + pct / 100;
}

// The Dark Matter counterpart: any owned item with a dmBonus (the Dark
// Current cosmetics, plus Seraph's +1%) raises every ◆ mint — pump
// collections and advanced-drill rewards alike.
function getOmniaDmBoost() {
  if (!omniaState.cosmetics) return 1;
  var pct = 0;
  var ownedE = omniaState.cosmetics.unlockedEntities || [];
  var ownedC = omniaState.cosmetics.unlockedCompanions || [];
  OMNIA_ENTITIES.forEach(function(e) { if (e.dmBonus && ownedE.indexOf(e.id) !== -1) pct += e.dmBonus; });
  OMNIA_COMPANIONS.forEach(function(c) { if (c.dmBonus && ownedC.indexOf(c.id) !== -1) pct += c.dmBonus; });
  return 1 + pct / 100;
}

function getActiveAkashaBoost() {
  var now = Date.now();
  var boosts = omniaState.akashaBoosts || [];
  var active = boosts.filter(function(b) { return b.expiresAt > now; });
  if (active.length !== boosts.length) { omniaState.akashaBoosts = active; saveOmniaState(); }
  if (!active.length) return 1;
  return active.reduce(function(acc, b) { return acc * b.mult; }, 1);
}

// Minutes until the soonest-expiring active boost ends (when the combined % will next drop).
function getAkashaBoostRemainingMin() {
  var now = Date.now();
  var active = (omniaState.akashaBoosts || []).filter(function(b) { return b.expiresAt > now; });
  if (!active.length) return 0;
  var soonest = active.reduce(function(min, b) { return Math.min(min, b.expiresAt); }, Infinity);
  return Math.max(1, Math.ceil((soonest - now) / 60000));
}

function renderAkashaBoostBadge() {
  var mult = (typeof omniaState !== 'undefined' && omniaState) ? getActiveAkashaBoost() : 1;
  var pct = Math.round((mult - 1) * 100);
  var remainLabel = pct > 0 ? fmtDuration(getAkashaBoostRemainingMin()) + ' left' : '';
  ['awBoostBadge', 'concBoostBadge'].forEach(function(id) {
    var el = document.getElementById(id);
    if (!el) return;
    if (pct > 0) {
      el.style.display = 'flex';
      var pctEl = el.querySelector('.boost-badge__pct');
      if (pctEl) pctEl.textContent = pct;
      var timeEl = el.querySelector('.boost-badge__time');
      if (timeEl) timeEl.textContent = remainLabel;
    } else {
      el.style.display = 'none';
    }
  });
}

// ── Early-end guard: Omnia's recommended duration ─────────────────────────
// A session only earns "completion" (daily plan credit + any pending body
// level) once it reaches Omnia's recommended length. These helpers let the
// per-exercise End buttons warn before forfeiting that, and let the award
// path gate the body level on it.
function omniaRecommendedSec(exId) {
  try {
    var m = guideRecommendedMinutes(exId);
    return (typeof m === 'number' && m > 0) ? Math.round(m * 60) : 0;
  } catch (e) { return 0; }
}

// True when a body level is currently waiting on this exercise (the ✦ the
// player saw before starting) and would be lost by ending early.
function omniaExercisePendingBody(exId) {
  try { return !!(omniaHighlightedExerciseIds() || {})[exId]; } catch (e) { return false; }
}

// 5s grace for tap-timing variance, matching the guide's daily-completion grace.
function omniaReachedRecommendation(exId, elapsedSec, recSecOverride) {
  var recSec = (typeof recSecOverride === 'number') ? recSecOverride : omniaRecommendedSec(exId);
  if (!recSec) return true; // no recommendation to enforce
  return (elapsedSec || 0) + 5 >= recSec;
}

// Confirm before ending early. Runs onProceed() immediately if the
// recommendation is already met (or none exists); otherwise shows a warning
// and only proceeds if the user accepts. Countdown exercises (asana/sense)
// pass their own session target via recSecOverride.
function omniaConfirmEarlyEnd(exId, elapsedSec, onProceed, recSecOverride) {
  var recSec = (typeof recSecOverride === 'number') ? recSecOverride : omniaRecommendedSec(exId);
  if (!recSec || (elapsedSec || 0) + 5 >= recSec) { onProceed(); return; }
  var recMin = Math.round(recSec / 60);
  var msg = "You haven't reached Omnia's recommended " + recMin + " minute" + (recMin === 1 ? '' : 's') + " yet.\n\n"
          + "If you end now, this won't count as a completed session toward today's plan";
  if (omniaExercisePendingBody(exId)) {
    msg += ", and you'll forfeit the body-level award waiting on this exercise";
  }
  msg += ".\n\nEnd anyway?";
  showConfirm('End Early?', msg, onProceed);
}

function awardOmniaForExercise(exId, seconds, reachedRec) {
  omniaAccrue();
  // ── Plausibility clamps ──────────────────────────────────────────────────
  // Awards can't arrive faster than real practice: ignore calls < 30s apart,
  // and a session can't claim more time than has actually elapsed since the
  // previous award (with 5 min grace), nor more than 3 hours total.
  var nowClamp = Date.now();
  var sinceLast = nowClamp - (omniaState.lastAwardMs || 0);
  if (omniaState.lastAwardMs && sinceLast < 30000) return;
  var maxSec = omniaState.lastAwardMs ? Math.min(3 * 3600, sinceLast / 1000 + 300) : 3 * 3600;
  seconds = Math.max(0, Math.min(seconds || 0, maxSec));
  omniaState.lastAwardMs = nowClamp;
  // Track sessions completed today — feeds the generator practice multiplier.
  var todayStr = presenceDayKey();
  if (omniaState.sessionsTodayDate !== todayStr) {
    omniaState.sessionsTodayDate = todayStr;
    omniaState.sessionsTodayCount = 0;
  }
  omniaState.sessionsTodayCount = (omniaState.sessionsTodayCount || 0) + 1;

  var rec = omniaPickRecommendation(false);
  var recommended = rec && rec.id === exId;
  if (!recommended && omniaExerciseIsGuidedAgenda(exId)) recommended = true;
  var meta = OMNIA_EXERCISE_META[exId] || OMNIA_EXERCISE_META.clock;
  var boost = getActiveAkashaBoost() * getOmniaCosmeticBoost();
  var gain = omniaExerciseReward(exId, seconds || 0, recommended, boost);
  // The Clock can be repeated endlessly, so it only pays akasha for the first
  // two qualifying sessions each day (sessions under 10s are dropped earlier in
  // saveConcResult). Further clock sessions still log time/XP but earn nothing.
  var clockAkashaCapped = false;
  if (exId === 'clock') {
    if (omniaState.clockAkashaDate !== todayStr) {
      omniaState.clockAkashaDate = todayStr;
      omniaState.clockAkashaCount = 0;
    }
    if ((omniaState.clockAkashaCount || 0) >= 2) {
      gain = 0;
      clockAkashaCapped = true;
    } else {
      omniaState.clockAkashaCount = (omniaState.clockAkashaCount || 0) + 1;
    }
  }
  var activityName = meta && meta.name ? meta.name : 'Exercise';
  gain = omniaCreditAkasha(gain, 'exercise', {
    exId: exId,
    name: activityName,
    seconds: seconds || 0,
    recommended: !!recommended
  });
  // Up to three reached recommendations count each day, including consecutive
  // exercises in one practice block. Other exercises still pay Akasha and XP.
  omniaGrantRecommendedSessionCredit(recommended, reachedRec, todayStr);
  var awardedBody = false;
  if (recommended) {
    omniaState.recStreak = (omniaState.recStreak || 0) + 1;
    // A body level is only granted if this exercise is currently one of the
    // ✦-highlighted cards (omniaHighlightedExerciseIds) — so the award and
    // the highlight the player saw before starting always agree. The natural
    // body is raised unless it's capped, in which case the level cascades to
    // the next uncapped body (mental → astral → physical). A clock session
    // past its daily akasha cap earns no body level either, so it can't be farmed.
    // The session must also have reached Omnia's recommended duration: ending
    // early forfeits the body level (reachedRec === false). Callers that don't
    // pass the flag (tutorial clock, pore breathing) are unaffected.
    var highlightedCardId = omniaHighlightedExerciseIds()[exId];
    if (!clockAkashaCapped && reachedRec !== false && highlightedCardId) {
      var targetBody = omniaPickAwardBody(meta.body);
      if (targetBody) {
        omniaState.bodies[targetBody] = (omniaState.bodies[targetBody] || 0) + 1;
        omniaConsumeBodyAward(highlightedCardId);
        omniaState.lastBodyAward = { body: targetBody, exercise: activityName, level: omniaState.bodies[targetBody] };
        awardedBody = true;
      }
    }
    omniaPickRecommendation(true);
  } else {
    omniaState.recStreak = Math.max(0, (omniaState.recStreak || 0) - 1);
  }
  saveOmniaState();
  // The body level gets a real acknowledgment screen, not just a toast —
  // shown once the session-complete legend has been dismissed.
  if (awardedBody) maybeShowBodyLevelAward();
}

// TEMPORARY (testing): chronological Akasha ledger grouped by date, built
// from the local privacy-preserving economy ledger. Remove alongside
// akashaStatsScreen and its swipe handler once the economy has been evaluated.
function _akashaStatsFmtTime(sec) {
  sec = Math.max(0, Math.round(sec || 0));
  var m = Math.floor(sec / 60), s = sec % 60;
  return m + ':' + String(s).padStart(2, '0');
}
var AKASHA_SOURCE_LABELS = {
  'exercise': function(m) { return m.name || 'Exercise'; },
  'achievement': function() { return 'Achievement Unlocked'; },
  'morning-offering': function() { return 'Morning Offering'; },
  'generator-collection': function() { return 'Generator Collection'; },
  'path-quest': function() { return 'Guide Path Quest'; },
  'gift-path': function() { return 'Gift Path'; },
  'tutorial-clock': function() { return 'Clock Tutorial'; },
  'streak-commitment': function() { return 'Streak Commitment'; },
  'cosmetic': function() { return 'Cosmetic Purchase'; },
  'book2-tool': function() { return 'Book II Tool'; },
  'book2-body': function() { return 'Book II Body'; },
  'book2-sphere': function() { return 'Book II Sphere'; },
  'body-upgrade': function() { return 'Body Upgrade'; },
  'dark-resonance-upgrade': function() { return 'Dark Resonance Upgrade'; },
  'generator-upgrade': function() { return 'Generator Upgrade'; },
  'generator-accrual': function() { return 'Generator Accrual'; }
};
function _akashaEntryLabel(entry) {
  var fn = AKASHA_SOURCE_LABELS[entry.source];
  if (fn) return fn(entry.meta || {});
  return String(entry.source || 'Unknown').replace(/-/g, ' ').replace(/\b\w/g, function(c) { return c.toUpperCase(); });
}
function _akashaEntryDetail(entry) {
  var m = entry.meta || {};
  switch (entry.source) {
    case 'exercise': return _akashaStatsFmtTime(m.seconds) + (m.recommended ? ' · recommended' : '');
    case 'achievement': return m.count + (m.count === 1 ? ' achievement' : ' achievements');
    case 'morning-offering': return m.streak ? m.streak + '-day streak gift' : 'Daily gift';
    case 'generator-collection': return (m.generatorId && m.generatorId !== 'all') ? m.generatorId : 'All generators';
    case 'gift-path': return m.day ? 'Day ' + m.day : '';
    case 'streak-commitment': return m.days ? m.days + '-day vow' : '';
    case 'body-upgrade': return m.body ? m.body + (m.level ? ' → level ' + m.level : '') : '';
    case 'generator-upgrade': return m.upgradeId ? m.upgradeId + (m.level ? ' → level ' + m.level : '') : '';
    case 'cosmetic': return m.itemId || m.kind || '';
    default: return '';
  }
}
function _akashaStatsDayLabel(ms) {
  var d = new Date(ms), now = new Date();
  var startOfDay = function(x) { return new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime(); };
  var diffDays = Math.round((startOfDay(now) - startOfDay(d)) / 86400000);
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  var opts = d.getFullYear() === now.getFullYear()
    ? { weekday: 'long', month: 'long', day: 'numeric' }
    : { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' };
  return d.toLocaleDateString('en-US', opts);
}
function _akashaStatsFmtClock(ms) {
  return new Date(ms).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}
function renderAkashaStats() {
  var body = document.getElementById('akashaStatsBody');
  if (!body) return;
  var balance = Math.round((typeof omniaState !== 'undefined' && omniaState && omniaState.akasha) || 0);
  var balanceHtml = '<div style="display:flex; justify-content:space-between; align-items:baseline; border:1px solid var(--border); border-radius:12px; padding:14px 16px; margin-bottom:20px; background:rgba(232,200,122,.06);">'
    + '<div style="font-family:\'DM Mono\',monospace; font-size:9px; letter-spacing:.14em; text-transform:uppercase; color:var(--muted-readable);">Current Balance</div>'
    + '<div style="font-family:\'Cormorant Garamond\',serif; font-size:24px; font-weight:500; color:#e8c87a;">' + balance.toLocaleString() + '</div>'
    + '</div>';
  var log = typeof omniaReadAkashaLedger === 'function' ? omniaReadAkashaLedger() : [];
  if (!log.length) {
    body.innerHTML = balanceHtml + '<div style="font-family:\'DM Mono\',monospace; font-size:11px; color:var(--muted); text-align:center; padding:40px 20px; line-height:1.7;">No activity logged yet.<br>Complete an exercise to start seeing your Akasha history here.</div>';
    return;
  }
  var entries = log.slice().reverse(); // newest first
  var groups = [];
  var lastLabel = null;
  entries.forEach(function(entry) {
    var label = _akashaStatsDayLabel(entry.at);
    if (label !== lastLabel) { groups.push({ label: label, items: [] }); lastLabel = label; }
    groups[groups.length - 1].items.push(entry);
  });
  body.innerHTML = balanceHtml + groups.map(function(g) {
    var dayTotal = g.items.reduce(function(sum, e) { return sum + (e.kind === 'spend' || e.kind === 'reversal' ? -e.amount : e.amount); }, 0);
    var dayTotalStr = (dayTotal >= 0 ? '+' : '−') + Math.abs(Math.round(dayTotal)).toLocaleString();
    return '<div style="display:flex; justify-content:space-between; align-items:baseline; margin:22px 0 8px; padding-bottom:6px; border-bottom:1px solid var(--border);">'
      + '<div style="font-family:\'DM Mono\',monospace; font-size:9px; letter-spacing:.16em; text-transform:uppercase; color:var(--muted-readable);">' + g.label + '</div>'
      + '<div style="font-family:\'DM Mono\',monospace; font-size:9px; color:var(--muted-readable);">' + dayTotalStr + '</div>'
      + '</div>'
      + g.items.map(function(entry) {
        var isAchievement = entry.source === 'achievement';
        var negative = entry.kind === 'spend' || entry.kind === 'reversal';
        var sign = negative ? '−' : '+';
        var label = _akashaEntryLabel(entry);
        var detail = _akashaEntryDetail(entry);
        return '<div style="display:flex; justify-content:space-between; align-items:center; gap:10px; padding:10px 12px; margin-bottom:6px; border-radius:10px;'
          + (isAchievement ? ' background:rgba(232,200,122,.1); border:1px solid rgba(232,200,122,.28);' : ' background:rgba(255,255,255,.02);') + '">'
          + '<div style="min-width:0;">'
          + '<div style="font-family:\'Cormorant Garamond\',serif; font-size:16px; font-weight:' + (isAchievement ? '500' : '300') + '; color:' + (isAchievement ? '#e8c87a' : 'var(--text)') + ';">' + (isAchievement ? '✦ ' : '') + escHtml(label) + '</div>'
          + (detail ? '<div style="font-family:\'DM Mono\',monospace; font-size:9px; letter-spacing:.03em; color:var(--muted-readable); margin-top:2px;">' + escHtml(String(detail)) + '</div>' : '')
          + '</div>'
          + '<div style="text-align:right; flex-shrink:0;">'
          + '<div style="font-family:\'DM Mono\',monospace; font-size:14px; color:' + (negative ? 'var(--muted-readable)' : '#e8c87a') + ';">' + sign + Math.round(entry.amount).toLocaleString() + '</div>'
          + '<div style="font-family:\'DM Mono\',monospace; font-size:8px; color:var(--muted-readable); margin-top:2px;">' + _akashaStatsFmtClock(entry.at) + ' · bal ' + Math.round(entry.balance).toLocaleString() + '</div>'
          + '</div>'
          + '</div>';
      }).join('');
  }).join('');
}

// Show the pending body-level award as soon as no session-complete legend is
// covering the screen; the player dismisses it explicitly.
function maybeShowBodyLevelAward() {
  if (!omniaState || !omniaState.lastBodyAward) return;
  if (typeof completionFlowIsActive === 'function' && completionFlowIsActive()
      && typeof completionFlowQueue === 'function') {
    var pendingAward = omniaState.lastBodyAward;
    completionFlowQueue('body-level-award', 20, function(done) {
      showBodyLevelAward(pendingAward, done);
    });
    return;
  }
  var sc = document.getElementById('sessionComplete');
  if (sc && sc.classList.contains('sc-show')) {
    setTimeout(maybeShowBodyLevelAward, 700);
    return;
  }
  showBodyLevelAward(omniaState.lastBodyAward);
}

// A body level had no sound at all, while the achievement reveal has had its
// bright C-major arpeggio all along. This is deliberately the opposite shape:
// low, warm and slow-blooming rather than bright and percussive, so the two
// ceremonies are told apart with the phone in a pocket. The root is pitched per
// body — physical lowest, mental highest — which keeps it one recognisable
// sound while quietly naming which body grew.
var BLA_SOUND_ROOT = { physical: 196.00, astral: 261.63, mental: 329.63 };
function playBodyLevelSound(body) {
  if (typeof appSoundEnabled === 'function' && !appSoundEnabled()) return;
  try {
    var ctx = new (window.AudioContext || window.webkitAudioContext)();
    // Ceremonies fire outside a user gesture, so the context can arrive
    // suspended under an autoplay policy and play nothing at all.
    if (ctx.state === 'suspended' && ctx.resume) ctx.resume();
    var t = ctx.currentTime;
    var root = BLA_SOUND_ROOT[body] || BLA_SOUND_ROOT.astral;

    // Warmth: everything sits behind a gentle lowpass so it reads as a swell
    // rather than the achievement's glassy bells.
    var filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(900, t);
    filter.frequency.linearRampToValueAtTime(2200, t + 0.5);
    filter.Q.value = 0.6;
    filter.connect(ctx.destination);

    // Root and its fifth, swelling in together — an interval opening, not a
    // run of separate notes.
    [[root, 0.16, 0], [root * 1.5, 0.11, 0.09], [root * 2, 0.05, 0.18]].forEach(function(spec) {
      var freq = spec[0], peak = spec[1], delay = spec[2];
      var osc = ctx.createOscillator(), gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t + delay);
      gain.gain.setValueAtTime(0.0001, t + delay);
      gain.gain.linearRampToValueAtTime(peak, t + delay + 0.14);   // slow attack
      gain.gain.exponentialRampToValueAtTime(0.0001, t + delay + 1.9);
      osc.connect(gain); gain.connect(filter);
      osc.start(t + delay); osc.stop(t + delay + 2.0);
    });

    // A soft body under it so the swell has weight on a phone speaker.
    var sub = ctx.createOscillator(), sg = ctx.createGain();
    sub.type = 'triangle';
    sub.frequency.setValueAtTime(root / 2, t);
    sub.frequency.linearRampToValueAtTime(root / 2 * 1.02, t + 0.9);
    sg.gain.setValueAtTime(0.0001, t);
    sg.gain.linearRampToValueAtTime(0.13, t + 0.1);
    sg.gain.exponentialRampToValueAtTime(0.0001, t + 1.2);
    sub.connect(sg); sg.connect(filter);
    sub.start(t); sub.stop(t + 1.3);
  } catch (e) {}
}

function showBodyLevelAward(award, completionDone) {
  if (document.getElementById('bodyLevelAwardOverlay')) {
    if (completionDone) completionDone();
    return;
  }
  var bodyMeta = OMNIA_BODY_META[award.body];
  if (!bodyMeta) {
    omniaState.lastBodyAward = null;
    saveOmniaState();
    if (completionDone) completionDone();
    return;
  }
  var color = bodyMeta.color;
  var lvl = award.level || (omniaState.bodies && omniaState.bodies[award.body]) || 1;
  var overlay = document.createElement('div');
  overlay.className = 'bla-overlay';
  overlay.id = 'bodyLevelAwardOverlay';
  overlay.innerHTML = '<div class="bla-card" style="--bla-c:' + color + ';--bla-cl:' + color + ';">'
    + '<div class="bla-aura"><div class="bla-ring"></div><div class="bla-plus">+1</div></div>'
    + '<div class="bla-kicker">You received a body level!</div>'
    + '<div class="bla-title">' + bodyMeta.name + ' +1</div>'
    + '<div class="bla-sub">Now Lvl ' + lvl + (award.exercise ? ' · earned from ' + award.exercise : '') + '</div>'
    + '<button class="bla-btn" id="blaAckBtn">Continue →</button>'
    + '</div>';
  document.body.appendChild(overlay);
  document.getElementById('blaAckBtn').onclick = function() {
    omniaState.lastBodyAward = null;
    saveOmniaState();
    overlay.classList.remove('bla-vis');
    var done = completionDone;
    completionDone = null;
    if (done) done();
    setTimeout(function() { if (overlay.parentNode) overlay.parentNode.removeChild(overlay); }, 360);
  };
  requestAnimationFrame(function() {
    overlay.classList.add('bla-show');
    requestAnimationFrame(function() { overlay.classList.add('bla-vis'); });
  });
  playBodyLevelSound(award.body);
  if (navigator.vibrate) navigator.vibrate([30, 50, 90]);
}
