function cloneOmniaDefault() {
  return JSON.parse(JSON.stringify(OMNIA_DEFAULT));
}

// Body levels must never exceed the current Bardon step's requirement.
// Both gameplay paths (build button + recommended-exercise award) enforce this,
// but data arriving via cloud sync / localStorage bypasses those guards — so we
// re-clamp here on load, on save, and on sync-pull. Mutates and returns stateObj.
function clampOmniaBodies(stateObj) {
  if (!stateObj || typeof stateObj !== 'object' || !stateObj.bodies) return stateObj;
  var stepNum = stateObj.bardonStep || 1;
  var step = OMNIA_BARDON_STEPS.find(function(s) { return s.step === stepNum; }) || OMNIA_BARDON_STEPS[0];
  ['physical','astral','mental'].forEach(function(body) {
    var cap = (step && step.req && step.req[body]) || Infinity;
    var v = Math.max(1, Number(stateObj.bodies[body]) || 1);
    stateObj.bodies[body] = Math.min(cap, v);
  });
  return stateObj;
}

// Merge a cloud Omnia snapshot into local on sync-pull. Last-writer-wins fields
// (rec, recStreak) follow the existing conflict-resolution winner; wallet fields
// (akasha, reservoirs) are reconciled independently by lastTick recency; monotonic
// progress counters take the MAX of both snapshots so a stale snapshot can never
// roll them backwards. Returns a JSON string to store, or null to leave local untouched.
function mergeOmniaPull(localStr, cloudStr) {
  if (!cloudStr) return null;
  if (!localStr) {
    try { return JSON.stringify(clampOmniaBodies(JSON.parse(cloudStr))); } catch(e) { return cloudStr; }
  }
  var localObj, cloudObj;
  try { localObj = JSON.parse(localStr); cloudObj = JSON.parse(cloudStr); } catch(e) { return null; }
  var takeCloud = shouldTakeCloudValue('presence_omnia_v1', localStr, cloudStr);
  var base  = takeCloud ? cloudObj : localObj;
  var other = takeCloud ? localObj : cloudObj;
  // Cosmetic selection (palette/entity/veil/companion) carries no progress score,
  // so the score-based winner above can't preserve it: a stale cloud snapshot that
  // ties on progress would revert a color the user just picked and left before it
  // synced. Reconcile cosmetics independently — keep whichever side was touched
  // most recently (last-writer-wins by _updatedAt).
  (function() {
    var bc = (base && base.cosmetics) || {};
    var oc = (other && other.cosmetics) || {};
    if ((Number(oc._updatedAt) || 0) > (Number(bc._updatedAt) || 0)) base.cosmetics = oc;
  })();
  // Wallet/reservoir state carries no progress score (by design — see
  // shouldTakeCloudValue), so it can tie even when one side is materially
  // fresher (e.g. collecting an already-full reservoir doesn't move
  // totalAkashaEarned). A stale cloud snapshot winning that tie would restore
  // an already-collected reservoir, letting the same accrual be collected
  // twice. lastTick advances on every accrue/collect regardless of score, so
  // use it as an independent recency signal and keep whichever side actually
  // touched the wallet more recently.
  (function() {
    var localTick = Number(localObj.lastTick) || 0;
    var cloudTick = Number(cloudObj.lastTick) || 0;
    // lastTick advances on every accrue/collect, so normally the higher-tick
    // snapshot is the one that most recently touched the wallet and should win
    // (that's what stops an already-collected reservoir from being collected
    // twice). BUT a fresh/empty or partially-loaded save also ticks its clock to
    // "now" while carrying akasha:0 — and letting that win silently zeroed real
    // balances (all other progress survived via the max-merges below, so it
    // looked like only the wallet mysteriously reset). Lifetime earnings is
    // monotonic and can only be as high on a genuine continuation, so require
    // the fresher-tick snapshot to be at least as advanced on totalAkashaEarned
    // before trusting its (possibly-zero) wallet; otherwise keep the richer
    // side's wallet.
    var fresher = localTick >= cloudTick ? localObj : cloudObj;
    var staler  = fresher === localObj ? cloudObj : localObj;
    var walletSrc = (Number(fresher.totalAkashaEarned) || 0) >= (Number(staler.totalAkashaEarned) || 0)
      ? fresher : staler;
    var walletAkasha = Number(walletSrc.akasha);
    if (!Number.isFinite(walletAkasha)) {
      // Chosen wallet is missing/corrupt — don't fall to 0 and wipe a real
      // balance; take the other snapshot's value if it's usable.
      var alt = Number((walletSrc === localObj ? cloudObj : localObj).akasha);
      walletAkasha = Number.isFinite(alt) ? alt : 0;
    }
    base.akasha = walletAkasha;
    base.reservoirs = walletSrc.reservoirs || {};
    base.lastTick = Math.max(localTick, cloudTick);
  })();
  // Daily-gift claim marker: keep the later date so a device that already
  // claimed today's offering can't have it reopened by a stale snapshot.
  if ((other.offeringDay || '') > (base.offeringDay || '')) base.offeringDay = other.offeringDay;
  // Seven-Gifts devotion is a permanent loyalty reward (survives prestige), so
  // fold it ungated: keep the higher stack count and OR the legacy flag.
  base.devotionStacks = Math.min(24, Math.max(Number(base.devotionStacks) || 0, Number(other.devotionStacks) || 0));
  base.devotionEarned = !!(base.devotionEarned || other.devotionEarned);
  // The one-time wallet-recovery flag is monotonic: once any device has run the
  // recovery, OR it across snapshots so no other device repeats it.
  base._walletRecoveredV1 = !!(base._walletRecoveredV1 || other._walletRecoveredV1);
  // Only fold monotonic progress across snapshots when neither side was deliberately
  // reset relative to the other — otherwise honor the reset and keep base as-is.
  var sameReset = ((localObj && localObj._resetAt) || 0) === ((cloudObj && cloudObj._resetAt) || 0);
  // Prestige is a generational marker: fold monotonic progress only WITHIN the
  // same prestige count, or a pre-prestige snapshot's higher bardonStep/bodies
  // would revert a prestige (which intentionally resets them to 1).
  base.prestige = Math.max(Number(base.prestige) || 0, Number(other.prestige) || 0);
  var sameGen = sameReset && (((localObj && localObj.prestige) || 0) === ((cloudObj && cloudObj.prestige) || 0));
  if (sameGen) {
    ['completedRecommended','totalAkashaEarned','totalAkashaSpent','darkMatter','totalDarkMatterEarned','totalDarkMatterSpent'].forEach(function(f) {
      base[f] = Math.max(Number(base[f]) || 0, Number(other[f]) || 0);
    });
    base.bardonStep = Math.max(Number(base.bardonStep) || 1, Number(other.bardonStep) || 1);
    // Sphere progress resets each turning — fold only within the generation.
    if ((other.bookII || {}).sphere != null) {
      base.bookII = base.bookII || {};
      base.bookII.sphere = Math.max(Number(base.bookII.sphere) || 0, Number(other.bookII.sphere) || 0);
    }
    base.bodies = base.bodies || {};
    var ob = other.bodies || {};
    ['physical','astral','mental'].forEach(function(b) {
      base.bodies[b] = Math.max(Number(base.bodies[b]) || 1, Number(ob[b]) || 1);
    });
    // Purchased upgrades are monotonic (never un-bought) — keep the higher level
    // of each so a stale snapshot can't revert an upgrade the user just bought.
    base.upgrades = base.upgrades || {};
    var ou = other.upgrades || {};
    Object.keys(ou).forEach(function(u) {
      base.upgrades[u] = Math.max(Number(base.upgrades[u]) || 1, Number(ou[u]) || 1);
    });
  }
  // Magical tools are kept across turnings and never reset — fold the higher
  // phase for every tool regardless of prestige generation.
  base.bookII = base.bookII || {}; base.bookII.tools = base.bookII.tools || {};
  var _obT = ((other.bookII || {}).tools) || {};
  Object.keys(_obT).forEach(function(k) {
    var bt = base.bookII.tools[k] || (base.bookII.tools[k] = { p:0, readyAt:0 });
    var ot = _obT[k] || {};
    if ((ot.p || 0) > (bt.p || 0)) { bt.p = ot.p || 0; bt.readyAt = ot.readyAt || 0; }
  });
  // Book II bodies are likewise permanent — fold the higher level per body.
  var _obB = ((other.bookII || {}).bodies) || {};
  if (Object.keys(_obB).length) {
    base.bookII.bodies = base.bookII.bodies || { astral:1, mental:1, wisdom:1 };
    ['astral','mental','wisdom'].forEach(function(b) {
      base.bookII.bodies[b] = Math.max(Number(base.bookII.bodies[b]) || 1, Number(_obB[b]) || 1);
    });
  }
  // Story progress is monotonic: union the revealed beats and keep the higher
  // read-count so a stale snapshot can't un-reveal Omnia's narrative.
  var seenUnion = [].concat(base.storySeen || [], other.storySeen || []);
  base.storySeen = seenUnion.filter(function(id, i) { return seenUnion.indexOf(id) === i; });
  base.storyRead = Math.max(Number(base.storyRead) || 0, Number(other.storyRead) || 0);
  clampOmniaBodies(base); // re-cap bodies to the (possibly advanced) step requirement
  return JSON.stringify(base);
}

function loadOmniaState() {
  try {
    var s = localStorage.getItem('presence_omnia_v1');
    if (!s) return cloneOmniaDefault();
    var parsed = JSON.parse(s);
    var merged = cloneOmniaDefault();
    Object.assign(merged, parsed);
    merged.bodies = Object.assign(cloneOmniaDefault().bodies, parsed.bodies || {});
    clampOmniaBodies(merged);
    merged.upgrades = Object.assign(cloneOmniaDefault().upgrades, parsed.upgrades || {});
    // Generators II and III use their own keys (gen2/gen3) that begin at level 1
    // — independent of Generator I. (An earlier build stored them under
    // current2/current3 and briefly seeded them from Generator I; those keys are
    // now abandoned, so the new tracks start fresh and merge cleanly.)
    // Per-pump reservoirs: fold the old single reservoir into Generator I once.
    if (!merged.reservoirs || typeof merged.reservoirs !== 'object') {
      merged.reservoirs = (merged.reservoir > 0) ? { current: merged.reservoir } : {};
    }
    merged.cosmetics = Object.assign(cloneOmniaDefault().cosmetics, parsed.cosmetics || {});
    merged.cosmetics.unlockedPalettes = merged.cosmetics.unlockedPalettes || ['aether'];
    merged.cosmetics.unlockedEntities = merged.cosmetics.unlockedEntities || ['omnia'];
    merged.cosmetics.unlockedCompanions = merged.cosmetics.unlockedCompanions || [];
    merged.cosmetics.unlockedVeils = merged.cosmetics.unlockedVeils || [];
    // Migrate Spectral Veil from a standalone color into a stackable overlay:
    // anyone who owned/selected it as a palette keeps it, now layered on
    // whichever color they actually have selected.
    if (merged.cosmetics.unlockedPalettes.indexOf('spectral') !== -1) {
      merged.cosmetics.unlockedPalettes = merged.cosmetics.unlockedPalettes.filter(function(id) { return id !== 'spectral'; });
      if (merged.cosmetics.unlockedVeils.indexOf('spectral') === -1) merged.cosmetics.unlockedVeils.push('spectral');
    }
    if (merged.cosmetics.palette === 'spectral') {
      merged.cosmetics.veil = 'spectral';
      if (merged.cosmetics.unlockedVeils.indexOf('spectral') === -1) merged.cosmetics.unlockedVeils.push('spectral');
      var nativePal = OMNIA_ENTITY_NATIVE_PALETTE[merged.cosmetics.entity] || 'aether';
      merged.cosmetics.palette = merged.cosmetics.unlockedPalettes.indexOf(nativePal) !== -1 ? nativePal : 'aether';
    }
    // Archangel Michael's native palette is rose-violet, not crimson — correct
    // the old bad DEFAULT once. This must be a one-time migration (flagged),
    // never an every-load rule: Crimson Flame is a purchasable palette themed
    // for Michael, and re-running this on each load silently reverted a
    // deliberate Crimson pick back to violet every time the app reopened.
    try {
      if (!merged.cosmetics._elysPalFixed) {
        if (merged.cosmetics.entity === 'elys' && merged.cosmetics.palette === 'crimson') {
          merged.cosmetics.palette = 'violet';
          if (merged.cosmetics.unlockedPalettes.indexOf('violet') === -1) merged.cosmetics.unlockedPalettes.push('violet');
        }
        merged.cosmetics._elysPalFixed = 1;
      }
    } catch(e) {}
    merged.storySeen = Array.isArray(parsed.storySeen) ? parsed.storySeen : [];
    merged.storyRead = Number(parsed.storyRead) || 0;
    if (!merged.lastTick) merged.lastTick = Date.now();
    return merged;
  } catch(e) { return cloneOmniaDefault(); }
}

function saveOmniaState() {
  clampOmniaBodies(omniaState); // never persist or push body levels above the step cap
  try { localStorage.setItem('presence_omnia_v1', JSON.stringify(omniaState)); } catch(e) {}
  // Debounce sync so rapid omniaAccrue calls don't spam the network
  clearTimeout(saveOmniaState._syncTimer);
  saveOmniaState._syncTimer = setTimeout(function() {
    if (typeof syncEnabled !== 'undefined' && syncEnabled && typeof authToken !== 'undefined' && authToken) {
      if (typeof syncPushData === 'function') syncPushData();
    }
  }, 3000);
}

var omniaState = loadOmniaState();
