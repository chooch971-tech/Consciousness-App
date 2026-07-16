// ── Path Quest tracking ──────────────────────────────
function pathQuestTodayKey() {
  var d = new Date();
  return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
}
function pathQuestWeekendKey() {
  // Identify the weekend by its Sunday's date; Fri/Sat/Sun share one key
  var d = new Date();
  var day = d.getDay();
  var addDays = day === 0 ? 0 : (7 - day);
  var sun = new Date(d.getTime());
  sun.setDate(sun.getDate() + addDays);
  return sun.getFullYear() + '-' + (sun.getMonth() + 1) + '-' + sun.getDate();
}
function isPathQuestWeekendWindow() {
  var d = new Date().getDay();
  return d === 5 || d === 6 || d === 0; // Fri, Sat, Sun
}
function isAwarenessQuestDay() {
  var d = new Date();
  var dayOfYear = Math.floor((d - new Date(d.getFullYear(), 0, 0)) / 86400000);
  return dayOfYear % 2 === 0;
}
function pathQuestState() {
  if (!guideState.quests) guideState.quests = {};
  var tk = pathQuestTodayKey();
  var wk = pathQuestWeekendKey();
  if (!guideState.quests.daily || guideState.quests.daily.date !== tk) {
    guideState.quests.daily = { date:tk, count:0, claimed:false };
  }
  if (!guideState.quests.weekend || guideState.quests.weekend.weekId !== wk) {
    guideState.quests.weekend = { weekId:wk, count:0, claimed:false };
  }
  if (!guideState.quests.awareness || guideState.quests.awareness.date !== tk) {
    guideState.quests.awareness = { date:tk, minutes:0, claimed:false };
  }
  return guideState.quests;
}
function pathQuestReward(type) {
  var step = (typeof omniaState !== 'undefined' && omniaState.bardonStep) || 1;
  if (type === 'daily')   return 20 + step * 10;
  if (type === 'weekend') return 60 + step * 30;
  if (type === 'awareness') return 35 + step * 15;
  return 0;
}
// Weekend quest target scales with rank so 2-3 session/day players can claim
// it early on, while power users keep a real goal later.
function pathQuestWeekendTarget() {
  var step = (typeof omniaState !== 'undefined' && omniaState.bardonStep) || 1;
  return step <= 4 ? 6 : step <= 7 ? 9 : 12;
}
function pathQuestFormatTime(targetDate) {
  var ms = targetDate.getTime() - Date.now();
  if (ms <= 0) return '0M';
  var hrs = Math.floor(ms / 3600000);
  var mins = Math.floor((ms % 3600000) / 60000);
  if (hrs >= 24) { var days = Math.floor(hrs / 24); return days + 'D ' + (hrs % 24) + 'H'; }
  if (hrs > 0)   return hrs + 'H ' + mins + 'M';
  return mins + 'M';
}
function pathQuestDailyTimeLeft() {
  var d = new Date(); d.setHours(23, 59, 59, 999);
  return pathQuestFormatTime(d);
}
function pathQuestWeekendTimeLeft() {
  var d = new Date();
  var day = d.getDay();
  var addDays = day === 0 ? 0 : (7 - day);
  d.setDate(d.getDate() + addDays);
  d.setHours(23, 59, 59, 999);
  return pathQuestFormatTime(d);
}
function pathQuestRecordCompletion() {
  var q = pathQuestState();
  q.daily.count = (q.daily.count || 0) + 1;
  if (isPathQuestWeekendWindow()) q.weekend.count = (q.weekend.count || 0) + 1;
  saveGuideState(guideState);
  if (document.getElementById('pathQuestRoot')) renderPathQuests();
}
function pathQuestRecordAwarenessMinutes(minutes) {
  if (!minutes || minutes < 1) return;
  var q = pathQuestState();
  q.awareness.minutes = (q.awareness.minutes || 0) + minutes;
  saveGuideState(guideState);
  if (document.getElementById('pathQuestRoot')) renderPathQuests();
}
function claimPathQuestReward(type) {
  var q = pathQuestState();
  var data = q[type];
  if (!data || data.claimed) return;
  var target = type === 'daily' ? 2 : type === 'awareness' ? 15 : pathQuestWeekendTarget();
  var progress = type === 'awareness' ? (data.minutes || 0) : (data.count || 0);
  if (progress < target) return;
  var amount = pathQuestReward(type);
  if (typeof omniaState !== 'undefined') {
    omniaState.akasha = (omniaState.akasha || 0) + amount;
    var boostMult = type === 'weekend' ? 1.3 : 1.2;
    var boostDuration = type === 'weekend' ? 8 * 3600000 : 4 * 3600000;
    var now = Date.now();
    omniaState.akashaBoosts = (omniaState.akashaBoosts || []).filter(function(b) { return b.expiresAt > now; });
    omniaState.akashaBoosts.push({ mult: boostMult, expiresAt: now + boostDuration });
    if (typeof saveOmniaState === 'function') saveOmniaState();
  }
  data.claimed = true;
  saveGuideState(guideState);
  if (typeof playSessionCompleteSound === 'function') playSessionCompleteSound();
  // Re-render now so the card already reads "Claimed" (and the tapped button,
  // with its lingering press highlight, is gone) the instant the chest overlay
  // lifts — otherwise the old highlighted Claim button flashes for a moment.
  renderPathQuests();
  function afterClaim() {
    renderPathQuests();
    if (typeof renderOmniaEngine === 'function') renderOmniaEngine();
  }
  var boostPct = Math.round(((boostMult || 1) - 1) * 100);
  var boostHrs = Math.round((boostDuration || 0) / 3600000);
  if (typeof playChestOpenAnimation === 'function') {
    playChestOpenAnimation(amount, afterClaim, { pct: boostPct, hours: boostHrs });
  } else {
    afterClaim();
  }
}
function pathQuestChestSVG(unlocked) {
  if (unlocked) {
    // Treasure chest — rich wood, gold fittings, warm glow & sparkles
    return '<svg viewBox="0 0 56 54" xmlns="http://www.w3.org/2000/svg" width="56" height="54">'
      + '<defs>'
      + '<linearGradient id="tcWood" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#8a5a30"/><stop offset="100%" stop-color="#4a2a12"/></linearGradient>'
      + '<linearGradient id="tcLid" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#9c6838"/><stop offset="100%" stop-color="#5c3618"/></linearGradient>'
      + '<linearGradient id="tcGold" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#ffe7a0"/><stop offset="48%" stop-color="#f0c75e"/><stop offset="100%" stop-color="#c08a32"/></linearGradient>'
      + '<radialGradient id="tcGlow" cx="50%" cy="42%" r="58%"><stop offset="0%" stop-color="#ffe9aa" stop-opacity="0.85"/><stop offset="100%" stop-color="#ffcf5e" stop-opacity="0"/></radialGradient>'
      + '</defs>'
      // aura behind chest
      + '<ellipse cx="28" cy="27" rx="23" ry="21" fill="url(#tcGlow)" opacity="0.55"/>'
      // ground glow
      + '<ellipse cx="28" cy="49" rx="19" ry="3.2" fill="#e8a91e" opacity="0.32"/>'
      // body
      + '<rect x="10" y="30" width="36" height="18" rx="2.6" fill="url(#tcWood)" stroke="#37200a" stroke-width="1"/>'
      // lid
      + '<path d="M10,31 V25 Q10,14.5 28,14.5 Q46,14.5 46,25 V31 Z" fill="url(#tcLid)" stroke="#37200a" stroke-width="1"/>'
      // lid sheen
      + '<path d="M13.5,24 Q15.5,18 28,18 Q40.5,18 42.5,24" fill="none" stroke="#d8a45c" stroke-width="1.3" opacity="0.55" stroke-linecap="round"/>'
      // gold seam band
      + '<rect x="9" y="28.8" width="38" height="3.6" rx="1.4" fill="url(#tcGold)" stroke="#9c6a22" stroke-width="0.4"/>'
      // vertical gold straps
      + '<rect x="15" y="21.5" width="3.2" height="26" rx="1" fill="url(#tcGold)" opacity="0.95"/>'
      + '<rect x="37.8" y="21.5" width="3.2" height="26" rx="1" fill="url(#tcGold)" opacity="0.95"/>'
      // corner feet caps
      + '<rect x="9.5" y="43.8" width="5.4" height="4.2" rx="1.3" fill="url(#tcGold)"/>'
      + '<rect x="41.1" y="43.8" width="5.4" height="4.2" rx="1.3" fill="url(#tcGold)"/>'
      // lock plate
      + '<rect x="23.8" y="32" width="8.4" height="9.4" rx="2" fill="url(#tcGold)" stroke="#9c6a22" stroke-width="0.5"/>'
      + '<circle cx="28" cy="36.6" r="2.1" fill="#5a3a16"/>'
      + '<circle cx="28" cy="36.4" r="0.95" fill="#ffe9aa" opacity="0.85"/>'
      // sparkles
      + '<path d="M44,7 L44,12 M41.5,9.5 L46.5,9.5" stroke="#ffe9a0" stroke-width="1.3" stroke-linecap="round" opacity="0.9"/>'
      + '<circle cx="11.5" cy="10" r="1.3" fill="#ffe9a0" opacity="0.85"/>'
      + '<circle cx="49" cy="20" r="1" fill="#ffe9a0" opacity="0.7"/>'
      + '<circle cx="8" cy="21" r="0.9" fill="#ffe9a0" opacity="0.6"/>'
      + '</svg>';
  }
  // Locked state — same silhouette, muted warm wood, padlock
  return '<svg viewBox="0 0 56 54" xmlns="http://www.w3.org/2000/svg" width="56" height="54" opacity="0.82">'
    + '<defs>'
    + '<linearGradient id="lcWood" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#6a4828"/><stop offset="100%" stop-color="#382010"/></linearGradient>'
    + '<linearGradient id="lcLid" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#76522e"/><stop offset="100%" stop-color="#422814"/></linearGradient>'
    + '</defs>'
    // body
    + '<rect x="10" y="30" width="36" height="18" rx="2.6" fill="url(#lcWood)" stroke="#231305" stroke-width="1"/>'
    // lid
    + '<path d="M10,31 V25 Q10,14.5 28,14.5 Q46,14.5 46,25 V31 Z" fill="url(#lcLid)" stroke="#231305" stroke-width="1"/>'
    // lid sheen
    + '<path d="M13.5,24 Q15.5,18 28,18 Q40.5,18 42.5,24" fill="none" stroke="#8a6838" stroke-width="1" opacity="0.4" stroke-linecap="round"/>'
    // seam band
    + '<rect x="9" y="28.8" width="38" height="3.3" rx="1.3" fill="#7a623c" opacity="0.6"/>'
    // vertical straps
    + '<rect x="15" y="21.5" width="3.2" height="26" rx="1" fill="#7a623c" opacity="0.5"/>'
    + '<rect x="37.8" y="21.5" width="3.2" height="26" rx="1" fill="#7a623c" opacity="0.5"/>'
    // corner caps
    + '<rect x="9.5" y="43.8" width="5.4" height="4.2" rx="1.3" fill="#7a623c" opacity="0.5"/>'
    + '<rect x="41.1" y="43.8" width="5.4" height="4.2" rx="1.3" fill="#7a623c" opacity="0.5"/>'
    // padlock body
    + '<rect x="23.4" y="34" width="9.2" height="8.2" rx="2" fill="#6e6452" stroke="#3a3122" stroke-width="1"/>'
    // padlock shackle
    + '<path d="M25.4,34 V31.4 Q25.4,28.4 28,28.4 Q30.6,28.4 30.6,31.4 V34" fill="none" stroke="#6e6452" stroke-width="2.2" stroke-linecap="round"/>'
    // keyhole
    + '<circle cx="28" cy="37.6" r="1.5" fill="#2e2618"/>'
    + '<rect x="27.3" y="38.4" width="1.4" height="2.1" rx="0.4" fill="#2e2618"/>'
    + '</svg>';
}

// Omnia opens a treasure chest — celebratory reward animation
function playChestOpenAnimation(amount, onDone, bonus) {
  var done = false;
  function finish() {
    if (done) return;
    done = true;
    overlay.classList.remove('show');
    setTimeout(function() {
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
      if (typeof onDone === 'function') onDone();
    }, 340);
  }

  // Animated chest base (body + open interior with gold)
  var baseSVG = '<svg class="chest-base" viewBox="0 0 140 104" xmlns="http://www.w3.org/2000/svg">'
    + '<defs>'
    + '<linearGradient id="caWood" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#8a5a30"/><stop offset="100%" stop-color="#46280f"/></linearGradient>'
    + '<linearGradient id="caGold" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#ffe7a0"/><stop offset="48%" stop-color="#f0c75e"/><stop offset="100%" stop-color="#c08a32"/></linearGradient>'
    + '<radialGradient id="caInner" cx="50%" cy="20%" r="80%"><stop offset="0%" stop-color="#fff2be"/><stop offset="55%" stop-color="#f3cd66"/><stop offset="100%" stop-color="#b9842c"/></radialGradient>'
    + '</defs>'
    // interior back wall (visible when lid opens)
    + '<rect x="16" y="40" width="108" height="40" rx="4" fill="#2a1809"/>'
    // treasure mound inside
    + '<ellipse cx="70" cy="56" rx="46" ry="14" fill="url(#caInner)"/>'
    + '<circle cx="50" cy="52" r="6" fill="#ffe28a"/><circle cx="64" cy="56" r="7" fill="#f3cd66"/>'
    + '<circle cx="80" cy="53" r="6.5" fill="#ffe28a"/><circle cx="92" cy="57" r="5.5" fill="#f0c75e"/>'
    + '<circle cx="70" cy="50" r="5" fill="#fff2be"/>'
    // body front
    + '<rect x="14" y="56" width="112" height="44" rx="6" fill="url(#caWood)" stroke="#37200a" stroke-width="2"/>'
    // gold rim at top of body
    + '<rect x="12" y="54" width="116" height="8" rx="3" fill="url(#caGold)" stroke="#9c6a22" stroke-width="0.8"/>'
    // vertical straps
    + '<rect x="34" y="56" width="8" height="44" fill="url(#caGold)" opacity="0.95"/>'
    + '<rect x="98" y="56" width="8" height="44" fill="url(#caGold)" opacity="0.95"/>'
    // corner feet
    + '<rect x="14" y="92" width="14" height="9" rx="3" fill="url(#caGold)"/>'
    + '<rect x="112" y="92" width="14" height="9" rx="3" fill="url(#caGold)"/>'
    // lock plate
    + '<rect x="62" y="62" width="16" height="18" rx="3.5" fill="url(#caGold)" stroke="#9c6a22" stroke-width="1"/>'
    + '<circle cx="70" cy="70" r="3.2" fill="#5a3a16"/>'
    + '</svg>';

  // Animated lid (pivots open)
  var lidSVG = '<svg class="chest-lid" viewBox="0 0 140 50" xmlns="http://www.w3.org/2000/svg">'
    + '<defs>'
    + '<linearGradient id="caLid" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#9c6838"/><stop offset="100%" stop-color="#5c3618"/></linearGradient>'
    + '<linearGradient id="caGold2" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#ffe7a0"/><stop offset="48%" stop-color="#f0c75e"/><stop offset="100%" stop-color="#c08a32"/></linearGradient>'
    + '</defs>'
    + '<path d="M14,48 V24 Q14,6 70,6 Q126,6 126,24 V48 Z" fill="url(#caLid)" stroke="#37200a" stroke-width="2"/>'
    + '<path d="M24,22 Q30,12 70,12 Q110,12 116,22" fill="none" stroke="#d8a45c" stroke-width="2" opacity="0.5" stroke-linecap="round"/>'
    + '<rect x="34" y="6" width="8" height="42" fill="url(#caGold2)" opacity="0.9"/>'
    + '<rect x="98" y="6" width="8" height="42" fill="url(#caGold2)" opacity="0.9"/>'
    + '<rect x="12" y="42" width="116" height="8" rx="3" fill="url(#caGold2)" stroke="#9c6a22" stroke-width="0.8"/>'
    + '</svg>';

  // light rays SVG
  var rays = '';
  for (var r = 0; r < 12; r++) {
    var ang = r * 30;
    rays += '<rect x="73" y="10" width="4" height="62" rx="2" fill="rgba(255,233,168,.6)" transform="rotate(' + ang + ' 75 75)"/>';
  }
  var raysSVG = '<svg class="chest-rays" viewBox="0 0 150 150" xmlns="http://www.w3.org/2000/svg">' + rays + '</svg>';

  // coins (generated with random trajectories)
  var coins = '';
  var N = 16;
  for (var i = 0; i < N; i++) {
    var tx = (Math.random() * 160 - 80).toFixed(0);
    var ty = (-50 - Math.random() * 80).toFixed(0);
    var cd = (0.8 + Math.random() * 0.6).toFixed(2);
    var cdelay = (0.38 + Math.random() * 0.25).toFixed(2);
    var sz = (6 + Math.random() * 5).toFixed(1);
    coins += '<div class="chest-coin" style="width:' + sz + 'px;height:' + sz + 'px;--tx:' + tx + 'px;--ty:' + ty + 'px;--cd:' + cd + 's;--cdelay:' + cdelay + 's;"></div>';
  }

  var omnia = OMNIA_CRYSTAL_SVG_RPT.replace('class="rpt-omnia-crystal"', 'class="chest-omnia-crystal"');

  var overlay = document.createElement('div');
  overlay.className = 'chest-overlay';
  overlay.innerHTML = '<div class="chest-scene">'
    + '<div class="chest-omnia" id="chestOmnia">' + omnia + '</div>'
    + '<div class="chest-rig" id="chestRig">'
    + raysSVG
    + '<div class="chest-burst"></div>'
    + baseSVG
    + lidSVG
    + coins
    + '</div>'
    + '<div class="chest-akasha" id="chestAkasha"><div class="chest-akasha__amt">+' + amount + '</div><div class="chest-akasha__lbl">Akasha</div>'
    +   (bonus && bonus.pct > 0 ? '<div class="chest-akasha__boost">+' + bonus.pct + '% akasha boost · ' + bonus.hours + 'h</div>' : '')
    + '</div>'
    + '<div class="chest-tap-hint">tap to continue</div>'
    + '</div>';
  document.body.appendChild(overlay);
  overlay.addEventListener('click', finish);

  // sequence
  requestAnimationFrame(function() {
    overlay.classList.add('show');
  });
  var rig = overlay.querySelector('#chestRig');
  var om = overlay.querySelector('#chestOmnia');
  var ak = overlay.querySelector('#chestAkasha');
  setTimeout(function() { if (om) om.classList.add('cast'); }, 280);
  setTimeout(function() { if (rig) rig.classList.add('open'); }, 480);
  setTimeout(function() { if (ak) ak.classList.add('show'); }, 1150);
  setTimeout(finish, 3200);
}
function colorToTint(hex, alpha) {
  if (!hex || hex[0] !== '#') return 'rgba(255,255,255,' + alpha + ')';
  var r = parseInt(hex.slice(1,3), 16);
  var g = parseInt(hex.slice(3,5), 16);
  var b = parseInt(hex.slice(5,7), 16);
  return 'rgba(' + r + ',' + g + ',' + b + ',' + alpha + ')';
}

// ── The Seven Gifts (monthly event → stacking +2% akasha, capped at +48%) ─────
// Seven gifts, each unlocked by completing its challenges. Gifts pay escalating
// akasha; claiming the seventh completes the month and adds a permanent +2%
// akasha stack (omniaState.devotionStacks → omniaDevotionMult, capped at 24
// stacks / +48%). The path refreshes on the 1st of each calendar month: the
// in-progress run (claimed/done) resets, while the durable set of completed
// months (cleared) persists and syncs. Challenges measure the current month's
// practice, so each month is genuinely re-earned.
var GIFT_PATH_KEY = 'presence_giftpath_v1';
var GIFT_PATH_WINDOW_DAYS = 7; // the event runs on days 1–7 of each month
// TEMP preview: while the 7x2 Challenge is still being revised, keep it visible
// every day so it can be worked on. Set false to restore the real 1st–7th
// window before launch.
var GIFT_PATH_PREVIEW = true;
// TEMP: bump this to force every device's current run back to Day 1 (from
// today) on next load — used while testing so the 7-day countdown can be
// walked day-by-day instead of picking up wherever the real calendar date
// falls. Leave alone once testing is done; it only fires once per bump.
var GIFT_PATH_TEST_RESET_VERSION = 1;
function _gpToday() { return new Date().toISOString().slice(0, 10); }
function gpCurrentMonth() { return new Date().toISOString().slice(0, 7); }
// Days elapsed since the run's startDate (1-indexed) — the real basis for the
// 7-day window. In production startDate is the 1st of the month, so this
// matches the calendar date; during a test restart startDate is "today", so
// the count genuinely begins at Day 1.
function gpDaysSinceStart(s) {
  s = s || loadGiftPath();
  if (!s.startDate) return 1;
  var start = new Date(s.startDate + 'T00:00:00');
  var now = new Date();
  var diff = Math.floor((Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())
    - Date.UTC(start.getFullYear(), start.getMonth(), start.getDate())) / 86400000);
  return diff + 1;
}
// The 7x2 Challenge is a 7-day sprint: it opens on the 1st and closes after the
// 7th, then returns on the 1st of the next month. Active only within that window.
function gpWindowActive(s) { return GIFT_PATH_PREVIEW || gpDaysSinceStart(s) <= GIFT_PATH_WINDOW_DAYS; }
function gpEventDay(s) { return Math.min(Math.max(gpDaysSinceStart(s), 1), GIFT_PATH_WINDOW_DAYS); }
function gpDaysLeftInWindow(s) { return Math.max(0, GIFT_PATH_WINDOW_DAYS - gpDaysSinceStart(s) + 1); }
// Pictorial countdown: seven pips, one per event day — days already spent are
// filled, today glows, days still to come are hollow.
function gpTimePips() {
  var s = loadGiftPath();
  var elapsed = gpDaysSinceStart(s), cur = gpEventDay(s), left = gpDaysLeftInWindow(s);
  var pips = '';
  for (var d = 1; d <= GIFT_PATH_WINDOW_DAYS; d++) {
    var cls = d < elapsed ? 'spent' : (d === elapsed ? 'today' : 'future');
    pips += '<span class="gp-daypip gp-daypip--' + cls + '">' + d + '</span>';
  }
  return '<div class="gp-timeline"><div class="gp-timeline-pips">' + pips + '</div>'
    + '<div class="gp-timeline-label">Day ' + cur + ' of ' + GIFT_PATH_WINDOW_DAYS
    + ' · <b>' + left + ' day' + (left === 1 ? '' : 's') + ' left</b></div></div>';
}
function _gpBlankClaimed() { return [false,false,false,false,false,false,false]; }
function loadGiftPath() {
  var def = { cleared: [], month: null, started: false, startDate: null, claimed: _gpBlankClaimed(), done: {}, _resetAt: 0, _testResetVersion: 0 };
  try { var s = localStorage.getItem(GIFT_PATH_KEY); if (s) { var p = JSON.parse(s); ['cleared','month','started','startDate','claimed','done'].forEach(function(k){ if (p[k] != null) def[k] = p[k]; });
    if (p._resetAt) def._resetAt = p._resetAt;
    if (p._testResetVersion) def._testResetVersion = p._testResetVersion;
    // Migrate pre-monthly saves (no `cleared`/`month`): a finished old run — the
    // seventh gift claimed, or the legacy one-time devotion — counts as one
    // cleared month so the earned +2% carries into the stacking model.
    if (p.cleared == null) {
      def.month = p.startDate ? p.startDate.slice(0, 7) : gpCurrentMonth();
      var wasDone = (Array.isArray(p.claimed) && p.claimed[6]) || (typeof omniaState !== 'undefined' && omniaState && omniaState.devotionEarned);
      if (wasDone && def.cleared.indexOf(def.month) === -1) def.cleared.push(def.month);
    }
  } } catch(e) {}
  if (!Array.isArray(def.cleared)) def.cleared = [];
  if (!Array.isArray(def.claimed) || def.claimed.length !== 7) def.claimed = _gpBlankClaimed();
  if (!def.done || typeof def.done !== 'object') def.done = {};
  return def;
}
function saveGiftPath(s) { try { localStorage.setItem(GIFT_PATH_KEY, JSON.stringify(s)); } catch(e) {} }
// "Earned" now means the CURRENT month's path is already complete — the button
// hides and evaluation stops until next month's fresh run.
function giftPathEarned() { return loadGiftPath().cleared.indexOf(gpCurrentMonth()) !== -1; }
function ensureGiftPathStarted() {
  var s = loadGiftPath();
  var m = gpCurrentMonth();
  if (s._testResetVersion !== GIFT_PATH_TEST_RESET_VERSION) {
    // One-time test restart: begin a fresh 7-day run from today so the
    // countdown can be walked day-by-day, rather than resuming wherever the
    // real calendar date happens to land this month.
    s.month = m; s.startDate = _gpToday(); s.claimed = _gpBlankClaimed(); s.done = {}; s.started = true;
    var ci = s.cleared.indexOf(m); if (ci !== -1) s.cleared.splice(ci, 1);
    s._testResetVersion = GIFT_PATH_TEST_RESET_VERSION;
    saveGiftPath(s);
    return s;
  }
  if (s.month !== m) {
    // New calendar month → fresh run. cleared (durable) is untouched.
    s.month = m; s.startDate = m + '-01'; s.claimed = _gpBlankClaimed(); s.done = {}; s.started = true;
    saveGiftPath(s);
  } else if (!s.started) {
    s.started = true; if (!s.startDate) s.startDate = m + '-01'; saveGiftPath(s);
  }
  return s;
}
// One-time reconciliation so devotionStacks reflects completed months (and any
// legacy one-time devotion) for the multiplier's fast path.
function migrateDevotionStacks() {
  if (typeof omniaState === 'undefined' || !omniaState) return;
  var gp = loadGiftPath();
  var want = Math.min(24, Math.max(gp.cleared.length, omniaState.devotionEarned ? 1 : 0));
  if ((omniaState.devotionStacks || 0) < want) {
    omniaState.devotionStacks = want;
    if (typeof saveOmniaState === 'function') saveOmniaState();
  }
}

function _gpConc() { return (typeof concState !== 'undefined' && concState.history) ? concState.history : []; }
function _gpAw() { return (typeof state !== 'undefined' && state.history) ? state.history : []; }
function gpSessions(sd) { var n = 0; _gpConc().forEach(function(h){ if (h && h.date && h.date.slice(0,10) >= sd) n++; }); _gpAw().forEach(function(h){ if (h && h.date && h.date.slice(0,10) >= sd) n++; }); return n; }
function gpDays(sd) { var set = {}; _gpConc().forEach(function(h){ if (h && h.date && h.date.slice(0,10) >= sd) set[h.date.slice(0,10)] = 1; }); _gpAw().forEach(function(h){ if (h && h.date && h.date.slice(0,10) >= sd) set[h.date.slice(0,10)] = 1; }); return Object.keys(set).length; }
function gpTypes(sd) { var set = {}; _gpConc().forEach(function(h){ if (h && h.date && h.date.slice(0,10) >= sd) { var id = (typeof guideHistoryExerciseId === 'function') ? guideHistoryExerciseId(h) : (h.type || h.exercise || 'clock'); set[id] = 1; } }); return Object.keys(set).length; }
function gpHasType(sd, want) { return _gpConc().some(function(h){ if (!h || !h.date || h.date.slice(0,10) < sd) return false; var id = (typeof guideHistoryExerciseId === 'function') ? guideHistoryExerciseId(h) : (h.type || h.exercise || 'clock'); return id === want; }); }
function gpBestHold(sd) { var best = 0; _gpConc().forEach(function(h){ if (h && h.date && h.date.slice(0,10) >= sd) { var isHold = (typeof isHoldSession !== 'function') || isHoldSession(h); if (isHold && (h.seconds||0) > best) best = h.seconds || 0; } }); return best; }
function gpRegimenComplete() { var r = (typeof omniaRegimenSnapshot === 'function') ? omniaRegimenSnapshot() : null; return !!(r && r.complete); }
function gpGiftCollected() { return typeof offeringAvailable === 'function' && !offeringAvailable(); }

var GIFT_PATH_DEFS = [
  { name:'First Light', akasha:500, ch:[
    { id:'g1a', label:'Complete 2 practice sessions', target:2, cur:function(s){ return gpSessions(s.startDate); } },
    { id:'g1b', label:'Collect a daily offering', test:function(){ return gpGiftCollected(); } } ] },
  { name:'Steady Flame', akasha:800, ch:[
    { id:'g2a', label:'Complete 4 practice sessions', target:4, cur:function(s){ return gpSessions(s.startDate); } },
    { id:'g2b', label:'Practice on 2 different days', target:2, cur:function(s){ return gpDays(s.startDate); } } ] },
  { name:'The Full Vessel', akasha:1200, ch:[
    { id:'g3a', label:'Finish your full daily stack', test:function(){ return gpRegimenComplete(); } },
    { id:'g3b', label:'Practice Clock and Thought Control', test:function(s){ return gpHasType(s.startDate,'clock') && gpHasType(s.startDate,'thought'); } } ] },
  { name:'Deepening', akasha:1800, ch:[
    { id:'g4a', label:'Practice on 4 different days', target:4, cur:function(s){ return gpDays(s.startDate); } },
    { id:'g4b', label:'Hold a single focus for 10 minutes', test:function(s){ return gpBestHold(s.startDate) >= 600; } } ] },
  { name:'The Widening', akasha:2800, ch:[
    { id:'g5a', label:'Complete 12 practice sessions', target:12, cur:function(s){ return gpSessions(s.startDate); } },
    { id:'g5b', label:'Practice 3 different exercises', target:3, cur:function(s){ return gpTypes(s.startDate); } } ] },
  { name:'The Long Sit', akasha:4500, ch:[
    { id:'g6a', label:'Practice on 6 different days', target:6, cur:function(s){ return gpDays(s.startDate); } },
    { id:'g6b', label:'Hold a single focus for 15 minutes', test:function(s){ return gpBestHold(s.startDate) >= 900; } } ] },
  { name:'The Seventh Seal', akasha:7000, ch:[
    { id:'g7a', label:'Practice on 7 different days', target:7, cur:function(s){ return gpDays(s.startDate); } },
    { id:'g7b', label:'Complete 20 practice sessions', target:20, cur:function(s){ return gpSessions(s.startDate); } } ] }
];

function gpChDone(s, ch) { if (s.done[ch.id]) return true; return ch.test ? !!ch.test(s) : (ch.cur(s) >= ch.target); }
function gpChProgress(s, ch) {
  var met = !!s.done[ch.id] || gpChDone(s, ch);
  if (ch.test) return { met: met, cur: met ? 1 : 0, target: 1, numeric: false };
  return { met: met, cur: met ? ch.target : Math.min(ch.cur(s), ch.target), target: ch.target, numeric: true };
}
function gpGiftAllDone(s, idx) { return GIFT_PATH_DEFS[idx].ch.every(function(ch){ return !!s.done[ch.id]; }); }
function gpGiftClaimable(s, idx) { if (s.claimed[idx]) return false; if (idx > 0 && !s.claimed[idx-1]) return false; return gpGiftAllDone(s, idx); }
function gpReadyCount() { var s = loadGiftPath(); var n = 0; for (var i = 0; i < 7; i++) { if (gpGiftClaimable(s, i)) n++; } return n; }

function evaluateGiftPath() {
  if (giftPathEarned() || !gpWindowActive()) return;
  var s = ensureGiftPathStarted();
  var changed = false;
  GIFT_PATH_DEFS.forEach(function(g){ g.ch.forEach(function(ch){ if (!s.done[ch.id] && gpChDone(s, ch)) { s.done[ch.id] = true; changed = true; } }); });
  if (changed) saveGiftPath(s);
  var ov = document.getElementById('giftPathOverlay');
  if (ov && ov.classList.contains('gp-show')) renderGiftPathScreen();
}
function updateGiftPathButton() {
  var btn = document.getElementById('omniaGiftPathBtn'); if (!btn) return;
  if (typeof migrateDevotionStacks === 'function') migrateDevotionStacks();
  // Only visible during the 1st–7th window (and if this month isn't already done).
  if (!gpWindowActive() || giftPathEarned()) { btn.style.display = 'none'; return; }
  ensureGiftPathStarted();
  evaluateGiftPath();
  btn.style.display = 'flex';
  var ready = gpReadyCount();
  var badge = document.getElementById('omniaGiftPathBadge');
  if (badge) { if (ready > 0) { badge.textContent = String(ready); badge.style.display = ''; } else { badge.style.display = 'none'; } }
}
function claimGift(idx) {
  var s = loadGiftPath();
  if (!gpGiftClaimable(s, idx)) return;
  s.claimed[idx] = true;
  var addedStack = false, atCap = false;
  if (idx === 6) {
    var m = s.month || gpCurrentMonth();
    if (s.cleared.indexOf(m) === -1) s.cleared.push(m);
  }
  saveGiftPath(s);
  var g = GIFT_PATH_DEFS[idx];
  if (typeof omniaState !== 'undefined' && omniaState) {
    var cap = (typeof omniaAkashaCap === 'function') ? omniaAkashaCap() : Infinity;
    var pre = omniaState.akasha || 0;
    omniaState.akasha = Math.min(cap, pre + g.akasha);
    omniaState.totalAkashaEarned = (omniaState.totalAkashaEarned || 0) + Math.max(0, Math.round(omniaState.akasha - pre));
    if (idx === 6) {
      var prevStacks = omniaState.devotionStacks || 0;
      var nextStacks = Math.min(24, s.cleared.length);
      addedStack = nextStacks > prevStacks;
      atCap = nextStacks >= 24;
      omniaState.devotionStacks = Math.max(prevStacks, nextStacks);
      omniaState.devotionEarned = true; // keep legacy flag truthy for old checks
    }
    if (typeof saveOmniaState === 'function') saveOmniaState();
    if (typeof syncEnabled !== 'undefined' && syncEnabled && typeof authToken !== 'undefined' && authToken && typeof syncPushData === 'function') syncPushData();
  }
  var seventhNote = atCap ? ' · devotion maxed (+48%)' : (addedStack ? ' · +2% akasha forever' : '');
  if (typeof showToast === 'function') showToast(idx === 6
    ? ('✦ ' + g.name + ' · +' + g.akasha.toLocaleString() + ' akasha' + seventhNote)
    : ('✦ ' + g.name + ' · +' + g.akasha.toLocaleString() + ' akasha'), 4200, 'gold');
  if (typeof renderOmniaEngine === 'function' && document.getElementById('omniaEngine')) { try { renderOmniaEngine(); } catch(e) {} }
  renderGiftPathScreen(); updateGiftPathButton();
}
// Hidden test affordance: long-press the gifts grid to unlock the next gift.
function giftPathTestAdvance() {
  var s = loadGiftPath();
  for (var i = 0; i < 7; i++) {
    if (!s.claimed[i]) { GIFT_PATH_DEFS[i].ch.forEach(function(ch){ s.done[ch.id] = true; }); saveGiftPath(s);
      if (typeof showToast === 'function') showToast('Gift ' + (i+1) + ' unlocked (test) — tap to open', 2200, 'gold');
      renderGiftPathScreen(); updateGiftPathButton(); return; }
  }
  if (typeof showToast === 'function') showToast('All seven gifts claimed', 1800);
}
function gpGiftSvg(state) {
  var lid = state === 'claimed' ? '#9ed8c0' : '#e8c87a';
  var body = state === 'locked' ? 'rgba(221,216,206,.35)' : '#e8c87a';
  return '<svg viewBox="0 0 48 48" fill="none" stroke="' + body + '" stroke-width="1.6" stroke-linejoin="round">'
    + '<rect x="9" y="18" width="30" height="7" rx="1.5"/>'
    + '<path d="M11 25h26v16a1.5 1.5 0 0 1-1.5 1.5h-23A1.5 1.5 0 0 1 11 41V25z"/>'
    + '<path d="M24 18v24" stroke="' + lid + '"/>'
    + '<path d="M24 18s-5 0-7-3.2 .8-5 3.6-3.6S24 18 24 18z" stroke="' + lid + '"/>'
    + '<path d="M24 18s5 0 7-3.2-.8-5-3.6-3.6S24 18 24 18z" stroke="' + lid + '"/>'
    + (state !== 'locked' ? '<circle cx="24" cy="30" r="1.6" fill="' + lid + '" stroke="none"/>' : '') + '</svg>';
}
var _gpTab = 'gifts';
function renderGiftPathScreen() {
  var el = document.getElementById('giftPathOverlay'); if (!el) return;
  ensureGiftPathStarted();
  var s = loadGiftPath(); var earned = giftPathEarned();
  var stacks = (typeof omniaDevotionStacks === 'function') ? omniaDevotionStacks() : 0;
  var atCap = stacks >= 24;
  // The first unclaimed gift gates every gift after it (claim in order). Used to
  // tell the player which gift they're actually on, and why later ones — even
  // with their tasks done — can't be collected yet.
  var nextClaimIdx = s.claimed.indexOf(false);
  var giftsTab = '<div class="gp-gifts">';
  GIFT_PATH_DEFS.forEach(function(g, i) {
    var claimable = gpGiftClaimable(s, i);
    var state = s.claimed[i] ? 'claimed' : (claimable ? 'ready' : 'locked');
    var stateTxt;
    if (s.claimed[i]) stateTxt = 'Collected';
    else if (claimable) stateTxt = 'Tap to collect';
    else if (gpGiftAllDone(s, i) && nextClaimIdx !== -1 && i > nextClaimIdx) stateTxt = 'Done · collect Gift ' + (nextClaimIdx + 1) + ' first';
    else if (i === nextClaimIdx) stateTxt = 'In progress';
    else stateTxt = 'Locked';
    var isFinal = i === 6;
    giftsTab += '<button class="gp-gift ' + state + (isFinal ? ' final' : '') + '" ' + (state === 'ready' ? 'data-claim="' + i + '"' : '') + '>'
      + '<span class="gp-gift-box">' + gpGiftSvg(state) + '</span>'
      + '<span class="gp-gift-n">Gift ' + (i+1) + '</span>'
      + '<span class="gp-gift-name">' + g.name + '</span>'
      + '<span class="gp-gift-reward">+' + g.akasha.toLocaleString() + ' akasha' + (isFinal ? '<span class="plus2">' + (atCap ? '+48% AKASHA · MAXED' : '+2% AKASHA · MONTHLY') + '</span>' : '') + '</span>'
      + '<span class="gp-gift-state">' + stateTxt + '</span></button>';
  });
  giftsTab += '</div>';
  var chTab = '';
  GIFT_PATH_DEFS.forEach(function(g, i) {
    var rows = '';
    g.ch.forEach(function(ch) {
      var p = gpChProgress(s, ch);
      rows += '<div class="gp-ch-row' + (p.met ? ' met' : '') + '">'
        + '<span class="gp-ch-tick">' + (p.met ? '✓' : '') + '</span>'
        + '<span class="gp-ch-info"><span class="gp-ch-label">' + ch.label + '</span>'
        + (p.numeric && !p.met ? '<span class="gp-ch-bar"><div style="width:' + Math.round(p.cur / p.target * 100) + '%"></div></span>' : '')
        + '</span>'
        + (p.numeric ? '<span class="gp-ch-num">' + p.cur + ' / ' + p.target + '</span>' : '') + '</div>';
    });
    chTab += '<div class="gp-ch-group' + (s.claimed[i] ? ' done' : '') + '">'
      + '<div class="gp-ch-head"><span class="gp-ch-title"><span>Gift ' + (i+1) + '</span>' + g.name + '</span>'
      + '<span class="gp-ch-reward">+' + g.akasha.toLocaleString() + (i === 6 ? ' · +2%' : '') + '</span></div>' + rows + '</div>';
  });
  var statusLine = earned
    ? 'All seven collected this month — the +2% is banked. The gifts return on the 1st.'
    : (nextClaimIdx === -1 ? 'All gifts done — collect the Seventh Seal before the window closes!' : '');
  el.innerHTML = '<div class="gp-top"><button class="gp-back" id="gpBack" aria-label="Back">←</button><div class="gp-title">7x2 Challenge</div></div>'
    + '<div class="gp-sub">Complete all challenges with seven days for a permanent 2% akasha boost. The 7x2 challenge will appear on the 1st every month.</div>'
    + (earned ? '' : gpTimePips())
    + (statusLine ? '<div class="gp-sub" style="margin-top:2px; color:var(--muted);">' + statusLine + '</div>' : '')
    + '<div class="gp-tabs"><button class="gp-tab' + (_gpTab === 'gifts' ? ' on' : '') + '" data-gptab="gifts">The Gifts</button>'
    + '<button class="gp-tab' + (_gpTab === 'challenges' ? ' on' : '') + '" data-gptab="challenges">Challenges</button></div>'
    + '<div class="gp-body" id="gpBody">' + (_gpTab === 'gifts' ? giftsTab : chTab) + '</div>';
  document.getElementById('gpBack').onclick = closeGiftPath;
  el.querySelectorAll('.gp-tab').forEach(function(b){ b.onclick = function(){ _gpTab = b.dataset.gptab; renderGiftPathScreen(); }; });
  el.querySelectorAll('[data-claim]').forEach(function(b){ b.onclick = function(){ claimGift(parseInt(b.dataset.claim, 10)); }; });
  var grid = el.querySelector('.gp-gifts'); if (grid) _gpAttachLong(grid);
}
function _gpAttachLong(host) {
  if (!host || host._gpLp) return; host._gpLp = true;
  var timer = null;
  var start = function(){ timer = setTimeout(giftPathTestAdvance, 700); };
  var cancel = function(){ if (timer) { clearTimeout(timer); timer = null; } };
  host.addEventListener('touchstart', start, { passive: true });
  ['touchend','touchmove','touchcancel'].forEach(function(ev){ host.addEventListener(ev, cancel); });
  host.addEventListener('mousedown', start); ['mouseup','mouseleave'].forEach(function(ev){ host.addEventListener(ev, cancel); });
}
function openGiftPath() {
  ensureGiftPathStarted(); evaluateGiftPath();
  var el = document.getElementById('giftPathOverlay');
  if (el.parentNode !== document.body) document.body.appendChild(el);
  renderGiftPathScreen();
  el.classList.add('gp-show');
  requestAnimationFrame(function(){ requestAnimationFrame(function(){ el.classList.add('gp-vis'); }); });
}
function closeGiftPath() { var el = document.getElementById('giftPathOverlay'); el.classList.remove('gp-vis'); setTimeout(function(){ el.classList.remove('gp-show'); }, 400); }


function renderPathQuests() {
  var root = document.getElementById('pathQuestRoot');
  if (!root) return;
  var q = pathQuestState();

  var regiment = (typeof guideCurrentRegimentInfo === 'function') ? guideCurrentRegimentInfo() : { mode:'beginner', focus:'Step I · Fundamentals' };
  var items = (typeof buildGuideRegimentItems === 'function') ? buildGuideRegimentItems(regiment.selectedMode) : [];
  // Fold session-completion into done for display: an exercise done for the day
  // (even if ended before Omnia's recommended time) reads as completed here.
  // Body-award eligibility is computed separately from the untouched item.done.
  items.forEach(function(it) { if (it.sessionDone) it.done = true; });
  var pathTotal = items.length;
  var pathDone = items.filter(function(i) { return i.done; }).length;
  var bannerSub = document.getElementById('pathBannerSub');
  if (bannerSub) bannerSub.textContent = regiment.focus;
  if (typeof guideMaybeNoticeAdaptation === 'function') guideMaybeNoticeAdaptation(regiment);

  var dailyCount = q.daily.count || 0, dailyTarget = 2;
  var dailyClamp = Math.min(dailyCount, dailyTarget);
  var dailyDone = dailyCount >= dailyTarget, dailyClaimed = !!q.daily.claimed;
  var dailyReward = pathQuestReward('daily');

  var weekendVisible = isPathQuestWeekendWindow();
  var weekendCount = q.weekend.count || 0, weekendTarget = pathQuestWeekendTarget();
  var weekendClamp = Math.min(weekendCount, weekendTarget);
  var weekendDone = weekendCount >= weekendTarget, weekendClaimed = !!q.weekend.claimed;
  var weekendReward = pathQuestReward('weekend');

  var awarenessQuestVisible = isAwarenessQuestDay();
  var awarenessMinutes = q.awareness.minutes || 0, awarenessTarget = 15;
  var awarenessClamp = Math.min(awarenessMinutes, awarenessTarget);
  var awarenessDone = awarenessMinutes >= awarenessTarget, awarenessClaimed = !!q.awareness.claimed;
  var awarenessReward = pathQuestReward('awareness');

  var exIcon = { clock:'⊙', visual:'◉', auditory:'◈', sense:'✺', thought:'◌', observation:'◌', focus:'◌', vacancy:'◌', asana:'✦', soulmirror:'◆', pore:'≋' };
  var exColor = { clock:'#d4b08e', visual:'#8ab8e0', auditory:'#8eccc0', sense:'#e0a8c4', thought:'#98b4cc', observation:'#98b4cc', focus:'#98b4cc', vacancy:'#98b4cc', asana:'#d49898', soulmirror:'#c4a8d4', pore:'#8ecce0' };

  var dayNames = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  var monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  var _now = new Date();
  var _d = _now.getDate();
  var _ord = _d === 1 || _d === 21 || _d === 31 ? 'st' : _d === 2 || _d === 22 ? 'nd' : _d === 3 || _d === 23 ? 'rd' : 'th';
  var dayName = dayNames[_now.getDay()] + ', ' + monthNames[_now.getMonth()] + ' ' + _d + _ord;

  // Arc ring calculation
  var ringCirc = 81.68;
  var ringOffset = pathTotal > 0 ? (ringCirc * (1 - pathDone / pathTotal)).toFixed(2) : ringCirc;

  var html = '';

  // ── Day strip + exercise cards ──
  html += '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;padding:0 2px;">'
    + '<div class="path-day-name">' + dayName + '</div>'
    + '<div style="display:flex;align-items:center;gap:10px;">'
    + '<span style="font-size:9px;color:var(--text);letter-spacing:.05em;"><strong style="color:var(--text);">' + pathDone + '</strong> / ' + pathTotal + ' done</span>'
    + '<svg width="32" height="32" viewBox="0 0 32 32">'
    + '<circle cx="16" cy="16" r="13" fill="none" stroke="rgba(255,255,255,.07)" stroke-width="2.5"/>'
    + '<circle cx="16" cy="16" r="13" fill="none" stroke="#8ecce0" stroke-width="2.5" stroke-dasharray="' + ringCirc + '" stroke-dashoffset="' + ringOffset + '" stroke-linecap="round" transform="rotate(-90 16 16)" opacity=".85"/>'
    + '</svg>'
    + '</div></div>';

  // ── Section label with cadence toggle inline ──
  var _twoOn = guideTwoADayEnabled();
  var _canAdd = (typeof guidePathAddableExercises === 'function') && guidePathAddableExercises().length > 0;
  html += '<div>';
  html += '<div style="display:flex;align-items:center;justify-content:space-between;margin:0 2px 6px;">'
    + '<span style="font-size:8px;letter-spacing:.26em;text-transform:uppercase;color:var(--text);">Exercises</span>'
    + '<div style="display:flex;align-items:center;gap:9px;">'
    + (_canAdd ? '<button id="pqAddExBtn" class="pq-add-ex-btn" title="Add an exercise to your path">+</button>' : '')
    + '<button id="pqTwoADayBtn" class="guide-cadence-toggle' + (_twoOn ? '' : ' off') + '">' + (_twoOn ? '2× / day' : '1× / day') + '</button>'
    + '</div>'
    + '</div>';
  html += '<div style="display:flex;flex-direction:column;gap:8px;">';
  var _isTC = function(id) { return id === 'thought' || id === 'observation' || id === 'focus' || id === 'vacancy'; };
  // Sort: uncompleted exercises to the top, completed to the bottom (stable).
  items.sort(function(a, b) { if (a.done === b.done) return 0; return a.done ? 1 : -1; });
  // Exercises that currently grant a body level if completed — the glow
  // below and the actual award in awardOmniaForExercise always agree.
  var _highlighted = (typeof omniaHighlightedExerciseIds === 'function') ? omniaHighlightedExerciseIds() : {};
  var _pqBuildCard = function(item) {
    var rounds = item.rounds != null ? item.rounds : (item.durationLabel && item.durationLabel.indexOf('x2') !== -1) ? 2 : 1;
    var modeText = item.mode ? (GUIDE_FOUNDATION_THOUGHT_LABELS[item.mode] || item.mode) : '';
    var metaParts = [];
    if (modeText && _isTC(item.id)) metaParts.push(modeText);
    if (item.duration) metaParts.push(item.duration + ' min');
    else if (item.durationLabel) metaParts.push(item.durationLabel.replace(/\s*[x×]\d+\s*$/, ''));
    if (rounds > 1 && !item.done) {
      var completedToday = item.todayCount || 0;
      var remaining = rounds - completedToday;
      if (remaining > 0) {
        metaParts.push(remaining === 1 ? '×1 remaining' : '×' + rounds + ' sessions');
      }
    }
    if (item.done) metaParts.push('completed');
    var meta = metaParts.join(' · ') || 'Open-ended';

    var displayName = item.name;
    var color = exColor[item.id] || '#c4a8d4';
    var icon = exIcon[item.id] || '◆';
    var startAttrs = item.open
      ? ' data-guide-start="' + item.open + '"'
        + (item.mode ? ' data-guide-mode="' + item.mode + '"' : '')
        + (item.duration ? ' data-guide-duration="' + item.duration + '"' : '')
      : '';
    var checkHtml = item.done
      ? '<div style="width:22px;height:22px;border-radius:50%;background:rgba(126,184,164,.15);color:var(--accent);display:flex;align-items:center;justify-content:center;font-size:11px;">✓</div>'
      : '<div style="width:22px;height:22px;border-radius:50%;border:1px solid var(--border);"></div>';
    var beginStyle = 'padding:8px 14px;border-radius:8px;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.04);color:var(--text);font-family:\'DM Mono\',monospace;letter-spacing:.2em;text-transform:uppercase;cursor:pointer;'
      + (item.done ? 'opacity:.35;cursor:default;pointer-events:none;' : '');
    var beginHtml = item.open
      ? '<button class="pq-ex-start" style="' + beginStyle + '"' + startAttrs + (item.done ? ' disabled' : '') + '>' + (item.done ? 'Done' : 'Begin') + '</button>'
      : '';

    // Clock-specific extras: upsell banner or stepper
    var extraHtml = '';
    if (item.clockExtra === 'upsell') {
      extraHtml = '<div style="margin-top:10px;padding:10px 12px;border-radius:8px;background:rgba(212,176,142,.07);border:1px solid rgba(212,176,142,.18);display:flex;align-items:center;justify-content:space-between;gap:10px;">'
        + '<div style="font-size:9px;color:#d4b08e;letter-spacing:.1em;">Ready for 15 min intervals?</div>'
        + '<div style="display:flex;gap:8px;">'
        + '<button class="pq-clock-upsell-yes" style="padding:5px 12px;border-radius:6px;border:1px solid rgba(212,176,142,.4);background:rgba(212,176,142,.1);color:#d4b08e;font-family:\'DM Mono\',monospace;font-size:8px;letter-spacing:.2em;cursor:pointer;">Yes</button>'
        + '<button class="pq-clock-upsell-no" style="padding:5px 12px;border-radius:6px;border:1px solid rgba(255,255,255,.08);background:none;color:var(--text);font-family:\'DM Mono\',monospace;font-size:8px;letter-spacing:.2em;cursor:pointer;">Stay at 10</button>'
        + '</div></div>';
    } else if (item.clockExtra === 'stepper') {
      var cur = guideClamp(guideState.clockUserTarget != null ? guideState.clockUserTarget : 10, 10, 15);
      extraHtml = '<div style="margin-top:10px;display:flex;align-items:center;gap:10px;">'
        + '<div style="font-size:9px;color:var(--text);letter-spacing:.1em;">Your target</div>'
        + '<div style="display:flex;align-items:center;gap:6px;">'
        + '<button class="pq-clock-step" data-dir="-1" style="width:24px;height:24px;border-radius:6px;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.04);color:var(--text);font-size:14px;cursor:pointer;display:flex;align-items:center;justify-content:center;">−</button>'
        + '<span style="font-family:\'Cormorant Garamond\',serif;font-size:18px;font-weight:300;color:var(--text);min-width:36px;text-align:center;">' + cur + ' min</span>'
        + '<button class="pq-clock-step" data-dir="1" style="width:24px;height:24px;border-radius:6px;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.04);color:var(--text);font-size:14px;cursor:pointer;display:flex;align-items:center;justify-content:center;">+</button>'
        + '</div></div>';
    }

    var cardPadding = extraHtml ? 'padding:13px 14px 10px;' : 'padding:13px 14px;';
    var menuBtn = '<button class="pq-menu-btn" data-ex-id="' + item.id + '"' + (item.mode ? ' data-ex-mode="' + item.mode + '"' : '') + (item.added ? ' data-ex-added="1"' : '') + ' title="Options">···</button>';
    var badgeStyle = 'position:relative;width:48px;height:48px;border-radius:12px;background:' + color + '1e;border:1px solid ' + color + '38;display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0;font-family:\'DM Mono\',monospace;line-height:1;color:' + color + ';';
    // Highlight cards that will grant a body level if completed right now.
    var grantsBodyName = (typeof omniaCardGrantsBodyLevel === 'function')
      ? omniaCardGrantsBodyLevel(item.id, item.done, _highlighted)
      : null;
    var bodyBadgeHtml = '';
    if (grantsBodyName) {
      var _bm = (typeof OMNIA_BODY_META !== 'undefined' && OMNIA_BODY_META[grantsBodyName]) ? OMNIA_BODY_META[grantsBodyName].name.replace(' Body', '') : grantsBodyName;
      bodyBadgeHtml = '<div class="pq-ex-bodybadge">✦ +1 ' + _bm + '</div>';
    }
    var outerStyle = 'display:flex;flex-direction:column;background:var(--surface);' + cardPadding
      + (item.done ? 'opacity:.5;' : '') + 'border:1px solid var(--border);border-radius:14px;';
    if (grantsBodyName) outerStyle += 'border-color:rgba(216,184,106,.5);';
    var grantsClass = grantsBodyName ? 'pq-grants-body' : '';
    return '<div' + (grantsClass ? ' class="' + grantsClass + '"' : '') + ' style="' + outerStyle + '">'
      + '<div style="display:flex;align-items:center;gap:14px;">'
      + '<div style="' + badgeStyle + '">' + icon + '</div>'
      + '<div style="flex:1;min-width:0;">'
      + '<div style="font-family:\'Space Grotesk\',sans-serif;font-size:12px;font-weight:600;letter-spacing:.01em;color:' + color + ';margin-bottom:3px;line-height:1.25;">' + displayName + '</div>'
      + '<div style="font-size:9px;color:var(--text);letter-spacing:.06em;">' + meta + '</div>'
      + bodyBadgeHtml
      + '</div>'
      + '<div style="display:flex;align-items:center;gap:10px;flex-shrink:0;">' + checkHtml + beginHtml + '</div>'
      + menuBtn
      + '</div>'
      + (extraHtml ? '<div style="padding:8px 0 0;">' + extraHtml + '</div>' : '')
      + '</div>';
  };
  items.forEach(function(item) { html += _pqBuildCard(item); });
  html += '</div>';  // close cards container
  html += '</div>';  // close label+cards wrapper

  // Mockup-style quest card builder
  function questCardHTML(opts) {
    // opts: label, labelColor, timerText, title, progressNumerator, progressDenominator, progressUnit, pct, fillGrad, reward, done, claimed, dataQuest, borderColor, bgGrad, glowColor
    return '<div style="border-radius:16px;border:1px solid ' + opts.borderColor + ';background:' + opts.bgGrad + ';padding:18px 20px;position:relative;overflow:hidden;">'
      + '<div style="content:\'\';position:absolute;top:-30px;right:-20px;width:100px;height:100px;border-radius:50%;background:radial-gradient(circle,' + opts.glowColor + ' 0%,transparent 70%);pointer-events:none;"></div>'
      + '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;position:relative;">'
      + '<div style="font-size:8px;letter-spacing:.26em;text-transform:uppercase;color:' + opts.labelColor + ';">' + opts.label + '</div>'
      + '<div style="display:flex;align-items:center;gap:5px;font-size:9px;letter-spacing:.1em;color:var(--text);"><div style="width:6px;height:6px;border-radius:50%;border:1px solid ' + opts.labelColor + ';"></div>' + opts.timerText + '</div>'
      + '</div>'
      + '<div style="font-family:\'Cormorant Garamond\',serif;font-size:19px;font-weight:300;color:var(--text);margin-bottom:14px;line-height:1.2;position:relative;">' + opts.title + '</div>'
      + '<div style="height:3px;border-radius:2px;background:rgba(255,255,255,.06);overflow:hidden;margin-bottom:8px;position:relative;">'
      + '<div style="height:100%;border-radius:2px;background:' + opts.fillGrad + ';width:' + opts.pct + '%;transition:width .5s ease;"></div>'
      + '</div>'
      + '<div style="font-size:9px;color:var(--text);letter-spacing:.08em;position:relative;"><strong style="color:var(--text);">' + opts.progressNumerator + '</strong> / ' + opts.progressDenominator + (opts.progressUnit ? ' ' + opts.progressUnit : '') + '</div>'
      + '<div style="display:flex;align-items:center;gap:12px;margin-top:14px;position:relative;">'
      + '<div class="pq-reward-icon">' + pathQuestChestSVG(opts.done) + '</div>'
      + '<div style="flex:1;">'
      +   '<div style="font-family:\'DM Mono\',monospace;font-size:11px;letter-spacing:.1em;color:#d4a874;">+' + opts.reward + ' Akasha</div>'
      +   (opts.boostPct ? '<div style="font-family:\'DM Mono\',monospace;font-size:8.5px;letter-spacing:.14em;text-transform:uppercase;color:#8ecce0;margin-top:4px;">+' + opts.boostPct + '% boost · ' + opts.boostHours + 'h</div>' : '')
      + '</div>'
      + (opts.done && !opts.claimed ? '<button class="pq-claim" data-quest="' + opts.dataQuest + '">Claim</button>' : opts.claimed ? '<div class="pq-claimed">Claimed</div>' : '')
      + '</div></div>';
  }

  html += '<div style="display:flex;flex-direction:column;gap:14px;margin-top:10px;">';

  // ── Awareness Quest (every other day) ──
  if (awarenessQuestVisible) {
    html += questCardHTML({
      label:'Awareness Quest', labelColor:'rgba(155,142,196,.6)',
      timerText:pathQuestDailyTimeLeft(), title:'15 minutes of awareness practice',
      progressNumerator:awarenessClamp, progressDenominator:awarenessTarget, progressUnit:'min',
      pct:awarenessClamp / awarenessTarget * 100,
      fillGrad:'linear-gradient(90deg,#9b8ec4 0%,#8ecce0 100%)',
      reward:awarenessReward, done:awarenessDone, claimed:awarenessClaimed, dataQuest:'awareness',
      boostPct:20, boostHours:4,
      borderColor:'rgba(155,142,196,.18)',
      bgGrad:'linear-gradient(135deg,rgba(155,142,196,.06) 0%,rgba(142,204,224,.04) 100%)',
      glowColor:'rgba(155,142,196,.1)'
    });
  }

  // ── Weekend Quest (Fri-Sun only) ──
  if (weekendVisible) {
    html += questCardHTML({
      label:'Weekend Quest', labelColor:'rgba(196,168,212,.6)',
      timerText:pathQuestWeekendTimeLeft(), title:'Complete ' + weekendTarget + ' exercises',
      progressNumerator:weekendClamp, progressDenominator:weekendTarget, progressUnit:'',
      pct:weekendClamp / weekendTarget * 100,
      fillGrad:'linear-gradient(90deg,#c4a8d4 0%,#b88dc8 100%)',
      reward:weekendReward, done:weekendDone, claimed:weekendClaimed, dataQuest:'weekend',
      boostPct:30, boostHours:8,
      borderColor:'rgba(196,168,212,.18)',
      bgGrad:'linear-gradient(135deg,rgba(196,168,212,.06) 0%,rgba(155,142,196,.04) 100%)',
      glowColor:'rgba(196,168,212,.1)'
    });
  }

  // ── Daily Quest ──
  html += questCardHTML({
    label:'Daily Quest', labelColor:'rgba(142,204,224,.6)',
    timerText:pathQuestDailyTimeLeft(), title:'Complete your next 2 exercises',
    progressNumerator:dailyClamp, progressDenominator:dailyTarget, progressUnit:'',
    pct:dailyClamp / dailyTarget * 100,
    fillGrad:'linear-gradient(90deg,#8ecce0 0%,#7eb8a4 100%)',
    reward:dailyReward, done:dailyDone, claimed:dailyClaimed, dataQuest:'daily',
    boostPct:20, boostHours:4,
    borderColor:'rgba(142,204,224,.18)',
    bgGrad:'linear-gradient(135deg,rgba(142,204,224,.06) 0%,rgba(126,184,164,.04) 100%)',
    glowColor:'rgba(142,204,224,.1)'
  });

  html += '</div>'; // close quest cards wrapper

  // ── Streak nudge (always shown) ──
  var streakVal = (typeof state !== 'undefined' && state.streak) || 0;
  var streakTitle = streakVal > 0 ? 'Keep your streak alive' : 'Start your streak today';
  var streakSub = streakVal > 0 ? "Complete today's practice before midnight" : 'Complete one exercise to begin';
  html += '<div style="display:flex;align-items:center;gap:12px;border:1px solid var(--border);border-radius:12px;background:rgba(255,255,255,.02);padding:12px 16px;">'
    + '<div style="font-size:20px;">🔥</div>'
    + '<div style="flex:1;"><div style="font-size:10px;color:var(--text);letter-spacing:.06em;margin-bottom:2px;">' + streakTitle + '</div>'
    + '<div style="font-size:9px;color:var(--text);letter-spacing:.05em;">' + streakSub + '</div></div>'
    + '<div style="font-family:\'Cormorant Garamond\',serif;font-size:22px;font-weight:300;color:#d4b08e;">' + streakVal + 'd</div>'
    + '</div>';

  root.innerHTML = html;

  var pqTwoADayBtn = root.querySelector('#pqTwoADayBtn');
  if (pqTwoADayBtn) {
    pqTwoADayBtn.onclick = function(e) { e.stopPropagation(); toggleGuideTwoADay(); };
  }

  var pqAddExBtn = root.querySelector('#pqAddExBtn');
  if (pqAddExBtn) {
    pqAddExBtn.onclick = function(e) { e.stopPropagation(); if (typeof pqOpenAddMenu === 'function') pqOpenAddMenu(pqAddExBtn); };
  }

  root.querySelectorAll('.pq-claim').forEach(function(btn) {
    btn.onclick = function(e) { e.stopPropagation(); claimPathQuestReward(btn.dataset.quest); };
  });
  root.querySelectorAll('.pq-ex-start').forEach(function(btn) {
    btn.onclick = function(e) { e.stopPropagation(); if (typeof beginGuidePlanItem === 'function') beginGuidePlanItem(btn); };
  });
  var upsellYes = root.querySelector('.pq-clock-upsell-yes');
  if (upsellYes) {
    upsellYes.onclick = function(e) {
      e.stopPropagation();
      guideState.clockUserTarget = 11; // start at 11 — they can adjust up from there
      saveGuideState(guideState);
      renderPathQuests();
    };
  }
  var upsellNo = root.querySelector('.pq-clock-upsell-no');
  if (upsellNo) {
    upsellNo.onclick = function(e) {
      e.stopPropagation();
      guideState.clockUserTarget = 10; // locks in 10, dismisses upsell, shows stepper
      saveGuideState(guideState);
      renderPathQuests();
    };
  }
  root.querySelectorAll('.pq-clock-step').forEach(function(btn) {
    btn.onclick = function(e) {
      e.stopPropagation();
      var dir = parseInt(btn.dataset.dir, 10);
      var cur = guideClamp(guideState.clockUserTarget != null ? guideState.clockUserTarget : 10, 10, 15);
      guideState.clockUserTarget = guideClamp(cur + dir, 10, 15);
      saveGuideState(guideState);
      renderPathQuests();
    };
  });
}

// ── Exercise card ··· menu ─────────────────────────────────
(function() {
  var activeExId = null;
  var activeExMode = null;
  var menu = document.getElementById('pqSkipMenu');
  var advItem = document.getElementById('pqSkipAdvanced');
  var advOverlay = document.getElementById('pqAdvancedOverlay');
  var advMinutes = 5;        // working value while the dialog is open
  var advAuto = true;
  var EX_DISPLAY_NAMES = { clock:'Clock', visual:'Visualization', auditory:'Auditory', thought:'Thought Control', asana:'Asana' };
  function isTimedEx(id) { return GUIDE_TIMED_EXERCISES.indexOf(id) !== -1; }

  var freq1Btn = document.getElementById('pqFreq1x');
  var freq2Btn = document.getElementById('pqFreq2x');
  var freqDiv  = document.getElementById('pqFreqDivider');
  // Exercises that have no "rounds" concept — hide frequency controls for these.
  var OPEN_ENDED_EX = { soulmirror:1, pore:1 };

  function openSkipMenu(btn) {
    activeExId = btn.dataset.exId;
    activeExMode = btn.dataset.exMode || null;
    var isPore = activeExId === 'pore';
    if (advItem) {
      if (isPore) {
        advItem.textContent = guideState.poreAdvanced ? 'Restart progression · 7 breaths' : 'I\'m Advanced · 40 breaths';
        advItem.style.display = 'block';
      } else if (isTimedEx(activeExId)) {
        var floor = guideFloorMin(guideFloorKey(activeExId, activeExMode));
        advItem.textContent = floor ? ('I\'m Advanced · ' + floor + ' min') : 'I\'m Advanced';
        advItem.style.display = 'block';
      } else {
        advItem.style.display = 'none';
      }
    }
    // Per-exercise frequency controls. Pore uses its own poreRounds; only the
    // truly open-ended Soul Mirror reflection has no frequency concept.
    var showFreq = !OPEN_ENDED_EX[activeExId] || isPore;
    var rounds1 = isPore ? (guideState.poreRounds || 1) === 1 : guideExRounds(activeExId) === 1;
    var rounds2 = isPore ? (guideState.poreRounds || 1) === 2 : guideExRounds(activeExId) === 2;
    if (freqDiv)  freqDiv.style.display  = showFreq ? '' : 'none';
    if (freq1Btn) {
      freq1Btn.style.display = showFreq ? '' : 'none';
      freq1Btn.classList.toggle('active', showFreq && rounds1);
    }
    if (freq2Btn) {
      freq2Btn.style.display = showFreq ? '' : 'none';
      freq2Btn.classList.toggle('active', showFreq && rounds2);
    }
    var r = btn.getBoundingClientRect();
    menu.style.top = (r.bottom + 4) + 'px';
    menu.style.right = (window.innerWidth - r.right) + 'px';
    menu.style.left = 'auto';
    menu.style.display = 'block';
    var mRect = menu.getBoundingClientRect();
    if (mRect.bottom > window.innerHeight - 8) {
      menu.style.top = Math.max(8, r.top - mRect.height - 4) + 'px';
    }
  }
  function closeSkipMenu() { if (menu) menu.style.display = 'none'; }

  // ── "I'm Advanced" per-exercise dialog ──
  function renderAdvDialog() {
    var valEl = document.getElementById('pqAdvVal');
    if (valEl) valEl.textContent = advMinutes + ' min';
    var toggle = document.getElementById('pqAdvAutoToggle');
    if (toggle) toggle.classList.toggle('on', advAuto);
  }
  function openAdvDialog() {
    if (!activeExId || !isTimedEx(activeExId)) return;
    var key = guideFloorKey(activeExId, activeExMode);
    var floor = guideFloorMin(key);
    advMinutes = floor || guideClamp(guideRecommendedMinutes(key), 1, GUIDE_FLOOR_CAP);
    // New overrides default to auto-advance on; existing ones keep their saved choice.
    advAuto = floor ? guideAutoAdvanceOn(key) : true;
    var titleEl = document.getElementById('pqAdvancedTitle');
    // For a thought discipline, name the specific form (e.g. "Vacancy of Mind").
    var dispName = (activeExId === 'thought' && activeExMode && GUIDE_FOUNDATION_THOUGHT_LABELS[activeExMode])
      ? GUIDE_FOUNDATION_THOUGHT_LABELS[activeExMode]
      : (EX_DISPLAY_NAMES[activeExId] || '');
    if (titleEl) titleEl.textContent = 'I\'m Advanced · ' + dispName;
    renderAdvDialog();
    if (advOverlay) advOverlay.style.display = 'flex';
  }
  function closeAdvDialog() { if (advOverlay) advOverlay.style.display = 'none'; }

  document.getElementById('pathQuestRoot').addEventListener('click', function(e) {
    var btn = e.target.closest('.pq-menu-btn');
    if (btn) { e.stopPropagation(); openSkipMenu(btn); return; }
  });

  var removeItemBtn = document.getElementById('pqSkipRemove');
  if (removeItemBtn) removeItemBtn.addEventListener('click', function() {
    if (!activeExId) return;
    closeSkipMenu();
    // Always remove from manually-added list AND postpone — belt-and-suspenders
    // so foundational items (which live outside _pathAdded) are also hidden.
    if (Array.isArray(guideState._pathAdded)) {
      guideState._pathAdded = guideState._pathAdded.filter(function(id) { return id !== activeExId; });
    }
    // Permanent removal — the item stays off the path until the user brings it
    // back with "+". (This used to be a 7-day snooze, so removed exercises like
    // Clock and Soul Mirror quietly returned a week later.)
    if (!guideState.removed) guideState.removed = {};
    guideState.removed[activeExId] = true;
    if (guideState.postponed) delete guideState.postponed[activeExId];
    saveGuideState(guideState);
    if (typeof syncPushData === 'function') syncPushData();
    renderPathQuests();
    if (typeof showToast === 'function') showToast('Removed from your path');
  });

  if (advItem) advItem.addEventListener('click', function() {
    closeSkipMenu();
    if (activeExId === 'pore') {
      if (guideState.poreAdvanced) {
        guideState.poreAdvanced = false;
        guideState.poreBreaths = 7;
      } else {
        guideState.poreAdvanced = true;
        guideState.poreBreaths = 40;
      }
      saveGuideState(guideState);
      renderPathQuests();
      return;
    }
    openAdvDialog();
  });
  if (freq1Btn) freq1Btn.addEventListener('click', function() {
    if (!activeExId) return;
    if (activeExId === 'pore') { guideState.poreRounds = 1; }
    else { if (!guideState._exRounds) guideState._exRounds = {}; guideState._exRounds[activeExId] = 1; }
    saveGuideState(guideState);
    closeSkipMenu();
    renderPathQuests();
    if (typeof renderGuidePlan === 'function' && guideState._pathLockedV2) renderGuidePlan(guidePathMode);
  });
  if (freq2Btn) freq2Btn.addEventListener('click', function() {
    if (!activeExId) return;
    if (activeExId === 'pore') { guideState.poreRounds = 2; }
    else { if (!guideState._exRounds) guideState._exRounds = {}; guideState._exRounds[activeExId] = 2; }
    saveGuideState(guideState);
    closeSkipMenu();
    renderPathQuests();
    if (typeof renderGuidePlan === 'function' && guideState._pathLockedV2) renderGuidePlan(guidePathMode);
  });
  var advMinusBtn = document.getElementById('pqAdvMinus');
  var advPlusBtn = document.getElementById('pqAdvPlus');
  if (advMinusBtn) advMinusBtn.addEventListener('click', function() {
    advMinutes = guideClamp(advMinutes - 1, 1, GUIDE_FLOOR_CAP); renderAdvDialog();
  });
  if (advPlusBtn) advPlusBtn.addEventListener('click', function() {
    advMinutes = guideClamp(advMinutes + 1, 1, GUIDE_FLOOR_CAP); renderAdvDialog();
  });
  var advToggleEl = document.getElementById('pqAdvAutoToggle');
  if (advToggleEl) advToggleEl.addEventListener('click', function() {
    advAuto = !advAuto; renderAdvDialog();
  });
  var advSaveBtn = document.getElementById('pqAdvSave');
  if (advSaveBtn) advSaveBtn.addEventListener('click', function() {
    if (activeExId) guideSetAdvanced(guideFloorKey(activeExId, activeExMode), advMinutes, advAuto);
    closeAdvDialog();
    renderPathQuests();
  });
  var advClearBtn = document.getElementById('pqAdvClear');
  if (advClearBtn) advClearBtn.addEventListener('click', function() {
    if (activeExId) guideClearAdvanced(guideFloorKey(activeExId, activeExMode));
    closeAdvDialog();
    renderPathQuests();
  });
  if (advOverlay) advOverlay.addEventListener('click', function(e) {
    if (e.target === advOverlay) closeAdvDialog();
  });

  document.getElementById('pqTellOmniaCancel').addEventListener('click', function() {
    overlay.style.display = 'none';
  });

  document.getElementById('pqTellOmniaSend').addEventListener('click', function() {
    var ta = document.getElementById('pqTellOmniaText');
    var msg = ta ? ta.value.trim() : '';
    overlay.style.display = 'none';
    if (!msg || !activeExId) return;
    if (!guideState.omniaNotes) guideState.omniaNotes = {};
    guideState.omniaNotes[activeExId] = { note: msg, date: guideLocalDayKey() };
    saveGuideState(guideState);
  });

  document.addEventListener('click', function(e) {
    if (!e.target.closest('#pqSkipMenu') && !e.target.closest('.pq-menu-btn')) closeSkipMenu();
  });
})();

// ── Path "+" add-exercise menu ─────────────────────────────
(function() {
  var menu = document.getElementById('pqAddMenu');
  if (!menu) return;
  var ADD_NAMES = { clock:'Clock', visual:'Visualization', auditory:'Auditory', thought:'Thought Control', asana:'Asana', soulmirror:'Soul Mirror', pore:'Pore Breathing', observation:'Thought Observation', focus:'Thought Focus', vacancy:'Vacancy of Mind', multisense:'Multi-Sense', allangles:'All Angles' };
  var ADD_ICONS = {
    clock:       { icon:'&#9200;',   color:'#d4b08e' },
    visual:      { icon:'&#128065;', color:'#8ab8e0' },
    auditory:    { icon:'&#127911;', color:'#8eccc0' },
    thought:     { icon:'&#9711;',   color:'#98b4cc' },
    observation: { icon:'&#9711;',   color:'#98b4cc' },
    focus:       { icon:'&#9711;',   color:'#98b4cc' },
    vacancy:     { icon:'&#9711;',   color:'#98b4cc' },
    asana:       { icon:'&#129485;', color:'#d49898' },
    soulmirror:  { icon:'&#128290;', color:'#c4a8d4' },
    pore:        { icon:'&#8779;',   color:'#8ecce0' },
    multisense:  { icon:'&#127925;', color:'#d4c88e' },
    allangles:   { icon:'&#128260;', color:'#a8c89e' }
  };

  window.pqOpenAddMenu = function(btn) {
    var addable = (typeof guidePathAddableExercises === 'function') ? guidePathAddableExercises() : [];
    if (!addable.length) { menu.style.display = 'none'; return; }
    menu.innerHTML = addable.map(function(ex) {
      var meta = ADD_ICONS[ex.id] || { icon:'✦', color:'var(--muted)' };
      return '<button class="pq-skip-item" data-add-ex="' + ex.id + '" style="display:flex;align-items:center;gap:10px;">'
        + '<span style="font-size:14px;color:' + meta.color + ';flex-shrink:0;opacity:.9;">' + meta.icon + '</span>'
        + '<span style="color:' + meta.color + ';">' + (ADD_NAMES[ex.id] || ex.name) + '</span>'
        + '</button>';
    }).join('');
    var r = btn.getBoundingClientRect();
    menu.style.top = (r.bottom + 4) + 'px';
    menu.style.right = (window.innerWidth - r.right) + 'px';
    menu.style.left = 'auto';
    menu.style.display = 'block';
    var mRect = menu.getBoundingClientRect();
    if (mRect.bottom > window.innerHeight - 8) {
      menu.style.top = Math.max(8, r.top - mRect.height - 4) + 'px';
    }
  };
  function closeAddMenu() { menu.style.display = 'none'; }

  menu.addEventListener('click', function(e) {
    var b = e.target.closest('[data-add-ex]');
    if (!b) return;
    var exId = b.dataset.addEx;
    closeAddMenu();
    function doAdd() {
      if (!Array.isArray(guideState._pathAdded)) guideState._pathAdded = [];
      if (guideState._pathAdded.indexOf(exId) === -1) guideState._pathAdded.push(exId);
      // Clear any active postpone/removal so the freshly-added exercise shows right away.
      if (guideState.postponed && guideState.postponed[exId]) delete guideState.postponed[exId];
      if (guideState.removed && guideState.removed[exId]) delete guideState.removed[exId];
      saveGuideState(guideState);
      // Push immediately so a reload doesn't pull an older cloud snapshot that
      // lacks this change and overwrite _pathAdded.
      if (typeof syncPushData === 'function') syncPushData();
      renderPathQuests();
      if (typeof showToast === 'function') showToast((ADD_NAMES[exId] || exId) + ' added to your path');
    }
    if ((exId === 'visual' || exId === 'auditory') && !guideThoughtFirstTierMastered()) {
      showConfirm(
        'Not yet recommended',
        'It is not recommended that a student add a Visualization or Auditory exercise until they\'ve mastered the first tier of Thought Control. Proceed anyway?',
        doAdd
      );
      return;
    }
    if (exId === 'multisense' || exId === 'allangles') {
      showConfirm(
        'Advanced exercise',
        'WARNING: These exercises can only be properly performed with months of preparation with the Beginner exercises. Proceed anyway?',
        doAdd
      );
      return;
    }
    // Warn when adding one sense exercise while the other is already on the path.
    var senseOnPath = function(id) {
      var addable = guidePathAddableExercises();
      return !addable.some(function(ex) { return ex.id === id; });
    };
    if ((exId === 'auditory' && senseOnPath('visual')) ||
        (exId === 'visual'   && senseOnPath('auditory'))) {
      showConfirm(
        'One sense at a time',
        'It is highly recommended that you only concentrate on one sense at a time and to not add this exercise until the previous sense has the first tier mastered. Proceed anyway?',
        doAdd
      );
      return;
    }
    doAdd();
  });

  document.addEventListener('click', function(e) {
    if (!e.target.closest('#pqAddMenu') && !e.target.closest('#pqAddExBtn')) closeAddMenu();
  });
})();
