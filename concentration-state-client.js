// ═══════════════════════════════════════
// ═══════════════════════════════════════
// CONCENTRATION SYSTEM
// ═══════════════════════════════════════

// ── Concentration shares the same rank ladder as Awareness ──
// XP = seconds of focused practice. Level 2 = 900s (15 min), total = 10,000 hours.
// 1 hour of practice ≈ level 4. Growth rate r = 1.007357

function getConcRank(level) {
  return getRankTitle(level);
}

function concXpForLevel(level) {
  if (level >= 777) return Infinity;
  return Math.max(1, Math.round(900 * Math.pow(1.007357, level - 1)));
}

function concSumXpToLevel(l) {
  if (l <= 1) return 0;
  var r = 1.007357, a = 900;
  return Math.round(a * (Math.pow(r, l - 1) - 1) / (r - 1));
}

var CONC_DEFAULT = { level:1, xp:0, bestSeconds:0, bestAsanaSeconds:0, totalSessions:0, lifetimeBreaths:0, history:[] };

function loadConcState() {
  try {
    var s = localStorage.getItem('presence_conc_v1');
    var loaded = s ? Object.assign({}, CONC_DEFAULT, JSON.parse(s)) : Object.assign({}, CONC_DEFAULT);
    loaded.level = normalizeLevel(loaded.level);
    return loaded;
  } catch(e) { return Object.assign({}, CONC_DEFAULT); }
}

function saveConcState() {
  if (concState.xp === 0 && concState.totalSessions === 0 && window._syncPullPending) return;
  localStorage.setItem('presence_conc_v1', JSON.stringify(concState));
}

// A new "session" is counted only if 2+ hours have passed since the last saved exercise
function isConcNewSession() {
  if (!concState.history || !concState.history.length) return true;
  var lastDate = new Date(concState.history[0].date);
  return (Date.now() - lastDate.getTime()) >= 2 * 60 * 60 * 1000;
}

var concState = loadConcState();

// ── Startup migration: recalculate concentration level from raw XP ─────────
(function migrateConcLevel() {
  if (!concState.xp) return;
  var correct = 1;
  while (correct < 777 && concState.xp >= concSumXpToLevel(correct + 1)) {
    correct++;
  }
  if (correct !== concState.level) {
    console.log('[Presence] Conc level migrated: ' + concState.level + ' → ' + correct + ' (xp=' + concState.xp + 's)');
    concState.level = correct;
    saveConcState();
  }
})();

// ── Startup migration: seed lifetime breath tally from existing history ─────
// Older saves predate concState.lifetimeBreaths. Seed it once from whatever
// pore_breathing sessions remain in history (best effort — history is capped
// at 100, so this may undercount, but it's a one-time floor for the star).
(function migrateLifetimeBreaths() {
  if (typeof concState.lifetimeBreaths === 'number' && concState.lifetimeBreaths > 0) return;
  if (!concState.history || !concState.history.length) { concState.lifetimeBreaths = concState.lifetimeBreaths || 0; return; }
  var sum = 0;
  concState.history.forEach(function(h) {
    if (h && h.exercise === 'pore_breathing' && h.breaths) sum += h.breaths;
  });
  if (sum > 0) {
    concState.lifetimeBreaths = sum;
    saveConcState();
  } else {
    concState.lifetimeBreaths = concState.lifetimeBreaths || 0;
  }
})();
var concTimerHandle = null;
var concStartTime = null;
var concSeconds = 0;
