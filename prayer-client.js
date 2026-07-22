// ═══════════════════════════════════════
// PRAYER SYSTEM
// ═══════════════════════════════════════

var PRAYER_PROMPTS = [
  "Be still, and know.",
  "Let your heart open to what is greater than you.",
  "Release what you carry. You are held.",
  "Speak what is true in you. Nothing is withheld.",
  "Return to the sacred. It has not moved.",
  "In this moment, you are not alone.",
  "Offer what you have. It is enough.",
  "Rest in the presence of the infinite.",
  "What do you bring today? Lay it down.",
  "The silence is not empty. Listen.",
  "You are seen. You are known.",
  "Nothing is too small to bring here.",
  "Let go of the outer world for a moment.",
  "The door is always open.",
  "Breathe. You are exactly where you need to be.",
  "What lives in your heart right now? Speak it.",
  "This moment is sacred.",
  "You do not pray alone.",
  "Come as you are. Nothing more is needed.",
  "The infinite meets you here, now.",
];

var PRAYER_ENCOURAGEMENTS = [
  "Take your time.",
  "There is no rush here.",
  "Stay as long as you need.",
  "You are not alone.",
  "This time is yours.",
  "Let everything else wait.",
  "Be present. That is enough.",
  "The work can wait. This cannot.",
  "Speak freely. Nothing is held against you.",
  "Breathe. Then begin.",
  "The door is always open.",
  "You came. That already matters.",
  "Nowhere else to be.",
  "Return to what matters most.",
  "Still the mind. Open the heart.",
  "Let the words come as they will.",
  "This is the most important thing you will do today.",
  "Sincerity is enough.",
  "Whatever you bring, bring it honestly.",
  "There is no wrong way to be here.",
];

// Contemplative prompts shown above the reflection box after a prayer — these
// give the reflection a focus and feed the journal / Omnia loop over time.
var PRAYER_REFLECT_PROMPTS = [
  "What did you carry in, and what are you setting down?",
  "Where did your attention want to wander? What does that ask of you?",
  "What were you grateful for in the silence?",
  "What truth surfaced that you had been avoiding?",
  "Who or what did you hold in your heart just now?",
  "What did you receive that you did not expect?",
  "What felt closest to the sacred in this time?",
  "What are you being asked to release?",
  "Where did you meet resistance, and where did you meet peace?",
  "What would you say if nothing were withheld?",
  "What small thing today is worthy of reverence?",
  "What did stillness reveal that motion had hidden?",
  "What are you ready to forgive — in another, or yourself?",
  "What is the next faithful step, however small?",
  "What did you bring honestly, and what did you hold back?",
];

var PRAYER_DEFAULT = {
  enabled: false,
  count: 5,
  times: ['06:00','09:00','12:00','15:00','18:00'],
  durationSec: 120,
  todayDate: '',
  todayDone: [], // indices completed today
  todaySkipped: [], // indices skipped today
  streak: 0,
  lastFullDay: '',
  history: [], // {date, durationSec, prompt, reflection, voluntary, label, xpEarned} | {type:'mantra', beads, target, mantra, ...}
  mantraText: '',      // the user's personal mantra
  mantraTarget: 108,   // beads per round (21 / 54 / 108)
};

// The five sacred hours. Fewer prayers/day slice from the middle outward so a
// single daily prayer is Midday and two are Morning + Evening.
var PRAYER_HOUR_SETS = {
  1: ['Midday'],
  2: ['Morning','Evening'],
  3: ['Morning','Midday','Evening'],
  4: ['Morning','Midday','Evening','Night'],
  5: ['Dawn','Morning','Midday','Evening','Night']
};
var PRAYER_HOUR_META = {
  Dawn:    { c:'#e8a87c', r:'232,168,124', svg:'<path d="M3 17h18M7 17a5 5 0 0 1 10 0" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round"/><path d="M12 6V3M5.6 9.6 4 8M18.4 9.6 20 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>' },
  Morning: { c:'#e8c878', r:'232,200,120', svg:'<circle cx="12" cy="14" r="4.5" stroke="currentColor" stroke-width="1.5" fill="none"/><path d="M12 5.5V3M4 14H2M22 14h-2M6 8l-1.5-1.5M18 8l1.5-1.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>' },
  Midday:  { c:'#f0d890', r:'240,216,144', svg:'<circle cx="12" cy="12" r="4.5" stroke="currentColor" stroke-width="1.5" fill="none"/><path d="M12 4V2M12 22v-2M4 12H2M22 12h-2M5.6 5.6 4.2 4.2M18.4 5.6l1.4-1.4M5.6 18.4l-1.4 1.4M18.4 18.4l1.4 1.4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>' },
  Evening: { c:'#d894a8', r:'216,148,168', svg:'<path d="M3 16h18M7 16a5 5 0 0 1 10 0" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round"/><path d="M12 8V5M6 20h12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>' },
  Night:   { c:'#8ea8e8', r:'142,168,232', svg:'<path d="M14.5 3.5a8 8 0 1 0 6.8 11.6A8.5 8.5 0 0 1 14.5 3.5z" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linejoin="round"/><circle cx="18.6" cy="5.4" r=".9" fill="currentColor"/>' }
};
function prayerHourName(i, count) {
  var set = PRAYER_HOUR_SETS[count] || PRAYER_HOUR_SETS[5];
  return set[i] || ('Prayer ' + (i + 1));
}
function prayerHourMeta(i, count) {
  return PRAYER_HOUR_META[prayerHourName(i, count)] || { c:'#c4b8e8', r:'196,184,232', svg:PRAYER_HOUR_META.Midday.svg };
}

function loadPrayerState() {
  try {
    var s = localStorage.getItem('presence_prayer_v1');
    var p = s ? Object.assign({}, PRAYER_DEFAULT, JSON.parse(s)) : Object.assign({}, PRAYER_DEFAULT);
    // Reset daily done/skipped if new day
    var today = new Date().toDateString();
    if (p.todayDate !== today) {
      // Check streak
      var yesterday = new Date(Date.now() - 86400000).toDateString();
      if (p.todayDone.length >= p.count && p.lastFullDay === yesterday) p.streak++;
      else if (p.todayDone.length < p.count) p.streak = 0;
      p.todayDate = today;
      p.todayDone = [];
      p.todaySkipped = [];
    }
    return p;
  } catch(e) { return Object.assign({}, PRAYER_DEFAULT); }
}

function savePrayerState() {
  localStorage.setItem('presence_prayer_v1', JSON.stringify(prayerState));
  syncPrayerScheduleToServer();
}

async function syncPrayerScheduleToServer() {
  try {
    var sub = await getSubscription();
    if (!sub) return;
    // Send timezone offset so server fires at correct local time
    // getTimezoneOffset() returns minutes BEHIND UTC, so negate for our convention
    var tzOffset = -new Date().getTimezoneOffset();
    var res = await fetch(SERVER_URL + '/prayer/schedule', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        endpoint: sub.endpoint, authKey: pushAuthKey(sub),
        times: prayerState.times.slice(0, prayerState.count),
        enabled: prayerState.enabled,
        tzOffset: tzOffset
      })
    });
    var data = await res.json();
    console.log('Prayer schedule synced:', data);
  } catch(e) { console.error('Prayer schedule sync failed:', e); }
}

var prayerState = loadPrayerState();
if (!Array.isArray(prayerState.history)) prayerState.history = []; // backfill for older saves
if (typeof prayerState.mantraText !== 'string') prayerState.mantraText = '';
if (!prayerState.mantraTarget) prayerState.mantraTarget = 108;
var prayerCheckInterval = null;
var prayerActiveTimes = []; // {index, scheduledMs, notifCount, delayUntilMs}
var currentPrayerIndex = -1;
var prayerSessionTimerHandle = null;
var prayerSessionStart = null;
var currentPrayerPrompt = '';
var currentPrayerEncouragement = '';
var currentPrayerLabel = '';

function renderPrayerPanel() {
  var today = new Date().toDateString();
  if (prayerState.todayDate !== today) { prayerState = loadPrayerState(); }

  // Show/hide the active session banner
  var banner = document.getElementById('activeSessionBanner');
  if (banner) banner.style.display = sessionStartTime ? 'flex' : 'none';

  var done = prayerState.todayDone;
  var skipped = prayerState.todaySkipped;
  var count = prayerState.count;

  document.getElementById('prayerDoneCount').textContent = done.length;
  document.getElementById('prayerTotalCount').textContent = count;
  var pStreak = prayerState.streak || 0;
  var prayerBannerDay = document.getElementById('prayerBannerDay');
  var prayerBannerPhrase = document.getElementById('prayerBannerPhrase');
  if (prayerBannerDay) prayerBannerDay.textContent = 'Day ' + pStreak;
  if (prayerBannerPhrase) prayerBannerPhrase.textContent = pStreak > 0 ? ' · Devotion holds' : ' · Begin the path';

  var list = document.getElementById('prayerTimesList');
  var times = prayerState.times.slice(0, count);
  var now = new Date();

  // Candle row — one candle per sacred hour, lit as each is kept
  var candlesRow = document.getElementById('prayerCandlesRow');
  if (candlesRow) {
    candlesRow.innerHTML = times.map(function(t, i) {
      var parts = t.split(':');
      var pDate = new Date(); pDate.setHours(parseInt(parts[0]), parseInt(parts[1]), 0, 0);
      var isDone = done.indexOf(i) !== -1;
      var isSkipped = skipped.indexOf(i) !== -1;
      var isActive = !isDone && !isSkipped && Math.abs(now - pDate) < 5 * 60 * 1000;
      var cls = isDone ? ' lit' : isActive ? ' active' : isSkipped ? ' skipped' : (now > pDate ? ' passed' : '');
      return '<div class="p-candle' + cls + '">'
        + '<div class="p-candle-holder"><div class="p-candle-flame"></div><div class="p-candle-wick"></div><div class="p-candle-body"></div></div>'
        + '<div class="p-candle-name">' + prayerHourName(i, count) + '</div>'
        + '</div>';
    }).join('');
  }

  // Named hour rows — "missed" softened to "passed"
  list.innerHTML = times.map(function(t, i) {
    var parts = t.split(':');
    var h = parseInt(parts[0]), m = parseInt(parts[1]);
    var pDate = new Date(); pDate.setHours(h, m, 0, 0);
    var isDone = done.indexOf(i) !== -1;
    var isSkipped = skipped.indexOf(i) !== -1;
    var isPast = now > pDate;
    var isActive = !isDone && !isSkipped && Math.abs(now - pDate) < 5 * 60 * 1000;
    var statusText = isDone ? '✓ kept' : isSkipped ? '— skipped' : isActive ? '● now' : isPast ? 'passed' : 'upcoming';
    var statusClass = isDone ? 'done' : isActive ? 'active' : (isPast && !isSkipped ? 'passed' : 'pending');
    var meta = prayerHourMeta(i, count);
    var ampm = h >= 12 ? 'pm' : 'am';
    var h12 = h % 12 || 12;
    var mStr = String(m).padStart(2,'0');
    return '<div class="prayer-hour-row' + (isDone ? ' done' : '') + '" style="--phr:' + meta.r + ';--phc:' + meta.c + ';">'
      + '<div class="prayer-hour-icon"><svg viewBox="0 0 24 24" fill="none">' + meta.svg + '</svg></div>'
      + '<span class="prayer-hour-name">' + prayerHourName(i, count) + '</span>'
      + '<span class="prayer-hour-time">' + h12 + ':' + mStr + ' ' + ampm + '</span>'
      + '<span class="prayer-time-status ' + statusClass + '">' + statusText + '</span>'
      + '</div>';
  }).join('');

  // Mantra card
  renderPrayerMantraCard();

  // Next-prayer hero + live countdown
  renderPrayerNextHero();
  startPrayerHeroTicker();

  // Sync settings UI
  renderPrayerTimesSettings();
  [1,2,3,4,5].forEach(function(n) {
    var btn = document.getElementById('prayerCount' + n);
    if (btn) btn.classList.toggle('selected', n === count);
  });
  var m2 = Math.floor(prayerState.durationSec / 60), s2 = prayerState.durationSec % 60;
  var durEl = document.getElementById('prayerDurDisplay');
  if (durEl) durEl.textContent = m2 + ':' + String(s2).padStart(2,'0');
  var toggleBtn = document.getElementById('prayerToggleBtn');
  if (toggleBtn) {
    toggleBtn.textContent = prayerState.enabled ? 'ON' : 'OFF';
    toggleBtn.style.background = prayerState.enabled ? 'rgba(155,142,196,0.12)' : 'transparent';
    toggleBtn.style.color = prayerState.enabled ? '#c4b8e8' : 'var(--muted)';
    toggleBtn.style.borderColor = prayerState.enabled ? 'rgba(155,142,196,.4)' : 'var(--border)';
  }
}

// ── Next-prayer hero: state machine + live countdown ──────────────────────────
// Computes the "what's next" state so the panel leads with one clear action
// instead of a column of "missed" labels.
function getPrayerNextState() {
  var count = prayerState.count;
  var times = prayerState.times.slice(0, count);
  var done = prayerState.todayDone;
  var skipped = prayerState.todaySkipped;
  var now = new Date();

  // All scheduled prayers kept today
  if (done.length >= count) return { kind: 'complete' };

  // Active right now (within the 5-min window, not yet done/skipped)
  for (var i = 0; i < times.length; i++) {
    if (done.indexOf(i) !== -1 || skipped.indexOf(i) !== -1) continue;
    var p = times[i].split(':');
    var pd = new Date(); pd.setHours(parseInt(p[0]), parseInt(p[1]), 0, 0);
    if (Math.abs(now - pd) < 5 * 60 * 1000) return { kind: 'now', index: i, time: times[i] };
  }

  // Next upcoming prayer still ahead today (not done/skipped)
  var next = null;
  for (var j = 0; j < times.length; j++) {
    if (done.indexOf(j) !== -1 || skipped.indexOf(j) !== -1) continue;
    var q = times[j].split(':');
    var qd = new Date(); qd.setHours(parseInt(q[0]), parseInt(q[1]), 0, 0);
    if (qd > now) { next = { kind: 'upcoming', index: j, time: times[j], at: qd }; break; }
  }
  if (next) return next;

  // Nothing left today but not all kept — invite voluntary prayer
  return { kind: 'open' };
}

function fmtPrayerClock(t) {
  var p = t.split(':'); var h = parseInt(p[0]), m = parseInt(p[1]);
  return (h % 12 || 12) + ':' + String(m).padStart(2, '0') + ' ' + (h >= 12 ? 'pm' : 'am');
}

function fmtCountdown(ms) {
  var s = Math.max(0, Math.floor(ms / 1000));
  var h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  if (h > 0) return 'in ' + h + 'h ' + m + 'm';
  if (m > 0) return 'in ' + m + 'm ' + String(sec).padStart(2, '0') + 's';
  return 'in ' + sec + 's';
}

function renderPrayerNextHero() {
  var el = document.getElementById('prayerNextHero');
  if (!el) return;
  var st = getPrayerNextState();
  var pStreak = prayerState.streak || 0;
  var count = prayerState.count;
  // Slow-turning light rays + pulsing star behind everything
  var artHtml = '<div class="pnh-rays"></div>'
    + '<svg class="pnh-star" viewBox="0 0 100 100" fill="none">'
    + '<path d="M50 8 L58 42 L92 50 L58 58 L50 92 L42 58 L8 50 L42 42 Z" fill="#e6d8f4" opacity="0.9"/>'
    + '<circle cx="50" cy="50" r="4" fill="#fff" opacity="0.85"/>'
    + '</svg>';
  var html = '';
  if (st.kind === 'complete') {
    html = '<div class="pnh-eyebrow">Today’s devotion</div>'
      + '<div class="pnh-time">All kept ✧</div>'
      + '<div class="pnh-count">' + (pStreak > 0 ? pStreak + '-day path held' : 'The path begins') + '</div>'
      + '<button class="pnh-cta" onclick="enterPrayerFromHero()">Pray Again</button>';
  } else if (st.kind === 'now') {
    html = '<div class="pnh-eyebrow">● ' + prayerHourName(st.index, count) + ' · Now</div>'
      + '<div class="pnh-time">' + fmtPrayerClock(st.time) + '</div>'
      + '<div class="pnh-count">The hour is here</div>'
      + '<button class="pnh-cta" onclick="enterPrayerFromHero()">Enter Prayer</button>';
  } else if (st.kind === 'upcoming') {
    html = '<div class="pnh-eyebrow">Next · ' + prayerHourName(st.index, count) + '</div>'
      + '<div class="pnh-time">' + fmtPrayerClock(st.time) + '</div>'
      + '<div class="pnh-count" id="pnhCountdown">' + fmtCountdown(st.at - new Date()) + '</div>'
      + '<button class="pnh-cta" onclick="enterPrayerFromHero()">Enter Prayer Now</button>';
  } else { // open
    html = '<div class="pnh-eyebrow">Today’s devotion</div>'
      + '<div class="pnh-time">When you are called</div>'
      + '<div class="pnh-count">No scheduled prayers remain today</div>'
      + '<button class="pnh-cta" onclick="enterPrayerFromHero()">Enter Prayer</button>';
  }
  el.innerHTML = artHtml + html;
}

var _prayerHeroTicker = null;
function startPrayerHeroTicker() {
  stopPrayerHeroTicker();
  _prayerHeroTicker = setInterval(function() {
    var panel = document.getElementById('prayerPanel');
    // Stop ticking if the prayer panel is no longer visible
    if (!panel || panel.style.display === 'none' || panel.offsetParent === null) {
      stopPrayerHeroTicker();
      return;
    }
    var st = getPrayerNextState();
    var cd = document.getElementById('pnhCountdown');
    // Lightweight path: just update the countdown text while upcoming.
    // On any state transition, re-render the whole hero (and dots).
    if (st.kind === 'upcoming' && cd) {
      cd.textContent = fmtCountdown(st.at - new Date());
    } else {
      renderPrayerNextHero();
    }
  }, 1000);
}
function stopPrayerHeroTicker() {
  if (_prayerHeroTicker) { clearInterval(_prayerHeroTicker); _prayerHeroTicker = null; }
}

// Hero CTA — begins the active/next scheduled prayer (so it counts toward the
// slot); falls back to a voluntary prayer when nothing is scheduled/remaining.
function enterPrayerFromHero() {
  var st = getPrayerNextState();
  if (st.kind === 'now' || st.kind === 'upcoming') beginPrayer(st.index);
  else beginPrayer(-1);
}

// Prayer scheduler — checks every 30 seconds
function startPrayerScheduler() {
  checkPrayerTimes();
  prayerCheckInterval = setInterval(checkPrayerTimes, 30000);
}

function checkPrayerTimes() {
  if (!prayerState.enabled) return;
  var now = new Date();
  var nowMs = now.getTime();
  var times = prayerState.times.slice(0, prayerState.count);

  times.forEach(function(t, i) {
    if (prayerState.todayDone.indexOf(i) !== -1) return;
    if (prayerState.todaySkipped.indexOf(i) !== -1) return;

    var parts = t.split(':');
    var pDate = new Date(); pDate.setHours(parseInt(parts[0]), parseInt(parts[1]), 0, 0);
    var diffMs = nowMs - pDate.getTime();

    // Within 0–20 min window (4 notifications × 5 min)
    if (diffMs >= 0 && diffMs < 20 * 60 * 1000) {
      var existing = prayerActiveTimes.find(function(p) { return p.index === i; });
      if (!existing) {
        prayerActiveTimes.push({ index: i, notifCount: 0, delayUntilMs: 0 });
        existing = prayerActiveTimes[prayerActiveTimes.length - 1];
      }

      if (existing.delayUntilMs && nowMs < existing.delayUntilMs) return;

      // Fire notification every 5 minutes, max 4 times
      var elapsed5min = Math.floor(diffMs / (5 * 60 * 1000));
      if (elapsed5min >= 4) {
        // Auto-silence after 4 misses
        prayerState.todaySkipped.push(i);
        savePrayerState();
        prayerActiveTimes = prayerActiveTimes.filter(function(p) { return p.index !== i; });
        return;
      }

      if (existing.notifCount <= elapsed5min) {
        existing.notifCount = elapsed5min + 1;
        showPrayerModal(i);
      }
    }
  });
}

function showPrayerModal(index) {
  // Don't interrupt an active awareness session
  if (sessionStartTime) {
    sendPrayerPushNotification(index); // still send push in background
    return;
  }
  currentPrayerIndex = index;
  var sub = prayerHourName(index, prayerState.count) + ' · ' + (index + 1) + ' of ' + prayerState.count;
  document.getElementById('prayerModalSub').textContent = sub;
  document.getElementById('prayerModal').classList.add('show');
  sendPrayerPushNotification(index);
  var pvk = getPavlokPrefs();
  if (pvk.prayer.enabled) sendPavlokStimulus('vibe', pvk.prayer.intensity);
}

async function sendPrayerPushNotification(index) {
  try {
    var sub = await getSubscription();
    if (!sub) return;
    var label = index >= 0
      ? prayerHourName(index, prayerState.count) + ' prayer (' + (index + 1) + ' of ' + prayerState.count + ')'
      : 'Prayer time';
    await fetch(SERVER_URL + '/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        endpoint: sub.endpoint, authKey: pushAuthKey(sub),
        title: 'Time to Pray.',
        body: label + ' — tap to begin.'
      })
    });
    console.log('Prayer push sent for ' + label);
  } catch(e) { console.error('Prayer push failed:', e); }
}

function hidePrayerModal() {
  document.getElementById('prayerModal').classList.remove('show');
}

function beginPrayer(index) {
  hidePrayerModal();
  var prompt = PRAYER_PROMPTS[Math.floor(Math.random() * PRAYER_PROMPTS.length)];
  var label = index === -1 ? 'Voluntary Prayer' : prayerHourName(index, prayerState.count) + ' Prayer';
  var enc = PRAYER_ENCOURAGEMENTS[Math.floor(Math.random() * PRAYER_ENCOURAGEMENTS.length)];
  currentPrayerPrompt = prompt;
  currentPrayerEncouragement = enc;
  currentPrayerLabel = label;
  document.getElementById('prayerSessionLabel').textContent = label;
  document.getElementById('prayerSessionPrompt').textContent = prompt;
  var encEl = document.getElementById('prayerEncouragement');
  if (encEl) encEl.textContent = enc;
  document.getElementById('prayerSessionTimer').textContent = '0:00';
  prayerSessionStart = Date.now();
  showScreen('prayerSessionScreen');
  requestExerciseWakeLock();
  // No timer tick — prayer length is at user's discretion
}

function tickPrayerTimer() {
  var elapsed = Math.floor((Date.now() - prayerSessionStart) / 1000);
  var m = Math.floor(elapsed / 60), s = elapsed % 60;
  document.getElementById('prayerSessionTimer').textContent = m + ':' + String(s).padStart(2,'0');
  prayerSessionTimerHandle = requestAnimationFrame(tickPrayerTimer);
}

// Tracks the in-flight prayer between concludePrayer (move to result screen)
// and savePrayerReflection (commit + go home).
var _pendingPrayer = null;

function concludePrayer() {
  releaseExerciseWakeLock();
  cancelAnimationFrame(prayerSessionTimerHandle);
  var elapsed = Math.floor((Date.now() - prayerSessionStart) / 1000);
  var idx = currentPrayerIndex;

  // Mark done (voluntary prayers don't mark a scheduled slot)
  if (idx >= 0 && prayerState.todayDone.indexOf(idx) === -1) prayerState.todayDone.push(idx);
  prayerActiveTimes = prayerActiveTimes.filter(function(p) { return p.index !== idx; });
  // Tell server prayer is done so it stops sending notifications for this slot
  if (idx >= 0) {
    getSubscription().then(function(sub) {
      if (!sub) return;
      fetch(SERVER_URL + '/prayer/done', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint: sub.endpoint, authKey: pushAuthKey(sub), index: idx })
      }).catch(function(e) { console.error('prayer/done error:', e); });
    });
  }

  // XP — award based on time prayed, feeds into awareness XP
  var xpEarned = Math.round(elapsed / 60 * 20); // 20 XP per minute
  state.xp += xpEarned;
  awardLevelUps(state, sumXpToLevel, xpForLevel);
  saveState();

  // Check if all prayers done today
  if (prayerState.todayDone.length >= prayerState.count) {
    prayerState.lastFullDay = new Date().toDateString();
    prayerState.streak = (prayerState.streak || 0) + 1;
  }

  // Push the entry into history NOW with empty reflection. If the user
  // writes one, we update the entry in place. This guarantees the prayer
  // is recorded even if the app is closed on the reflection screen.
  var entry = {
    date: new Date().toISOString(),
    durationSec: elapsed,
    prompt: currentPrayerPrompt,
    encouragement: currentPrayerEncouragement,
    label: currentPrayerLabel,
    voluntary: idx === -1,
    index: idx,
    xpEarned: xpEarned,
    reflection: ''
  };
  prayerState.history = prayerState.history || [];
  pushHistory(prayerState.history, entry, 100);
  recordPracticeReviewEntry('prayer', entry);
  savePrayerState();
  _pendingPrayer = entry; // reference into the array so updates are live

  showPrayerResultScreen();
}

function showPrayerResultScreen() {
  if (!_pendingPrayer) { showScreen('homeScreen'); switchMode('prayer'); return; }
  var p = _pendingPrayer;
  var m = Math.floor(p.durationSec / 60), s = p.durationSec % 60;
  var durStr = m + ':' + String(s).padStart(2, '0');
  document.getElementById('prayerResultDuration').textContent = durStr;
  document.getElementById('prayerResultLabel').textContent = p.label + ' · +' + p.xpEarned + ' XP';
  document.getElementById('prayerResultPrompt').textContent = p.prompt;
  document.getElementById('prayerResultEncouragement').textContent = p.encouragement;
  document.getElementById('prayerReflection').value = '';
  var rp = document.getElementById('prayerReflectPrompt');
  if (rp) rp.textContent = PRAYER_REFLECT_PROMPTS[Math.floor(Math.random() * PRAYER_REFLECT_PROMPTS.length)];
  showScreen('prayerResultScreen');
}

function savePrayerReflection() {
  if (!_pendingPrayer) { finishPrayerFlow(); return; }
  var reflection = (document.getElementById('prayerReflection').value || '').trim();
  // The entry is already in prayerState.history — update it in place.
  _pendingPrayer.reflection = reflection;
  savePrayerState();
  var entry = _pendingPrayer;
  var msg = '+' + entry.xpEarned + ' XP · ' + (entry.voluntary ? 'Prayer complete' : 'Prayer ' + (entry.index + 1) + ' complete');
  if (reflection) msg += ' · reflection saved';
  showToast(msg);
  _pendingPrayer = null;
  finishPrayerFlow();
}

function skipPrayerReflection() {
  if (!_pendingPrayer) { finishPrayerFlow(); return; }
  // Entry is already saved with reflection:'' — just close out.
  var entry = _pendingPrayer;
  showToast('+' + entry.xpEarned + ' XP · ' + (entry.voluntary ? 'Prayer complete' : 'Prayer ' + (entry.index + 1) + ' complete'));
  _pendingPrayer = null;
  finishPrayerFlow();
}

function finishPrayerFlow() {
  renderHome();
  renderPrayerPanel();
  // If the user opened prayer mid-awareness-session, drop them back into it
  // (the existing Return-to-Session button already handles this on the panel,
  // but the result screen dead-ends without it — so route directly.)
  if (sessionStartTime) {
    showScreen('sessionScreen');
  } else {
    showScreen('homeScreen');
    switchMode('prayer');
  }
}

// Settings
function togglePrayerEnabled() {
  prayerState.enabled = !prayerState.enabled;
  savePrayerState();
  var btn = document.getElementById('prayerToggleBtn');
  if (btn) {
    btn.textContent = prayerState.enabled ? 'ON' : 'OFF';
    btn.style.background = prayerState.enabled ? 'rgba(155,142,196,0.12)' : 'transparent';
    btn.style.color = prayerState.enabled ? '#c4b8e8' : 'var(--muted)';
    btn.style.borderColor = prayerState.enabled ? 'rgba(155,142,196,.4)' : 'var(--border)';
  }
  showToast(prayerState.enabled ? 'Prayer notifications on' : 'Prayer notifications off');
}

function setPrayerCount(n) {
  prayerState.count = n;
  [1,2,3,4,5].forEach(function(i) {
    var btn = document.getElementById('prayerCount' + i);
    if (btn) btn.classList.toggle('selected', i === n);
  });
  savePrayerState();
  renderPrayerTimesSettings();
}

function adjustPrayerDuration(delta) {
  prayerState.durationSec = Math.max(60, Math.min(600, (prayerState.durationSec || 120) + delta));
  var m = Math.floor(prayerState.durationSec / 60), s = prayerState.durationSec % 60;
  document.getElementById('prayerDurDisplay').textContent = m + ':' + String(s).padStart(2,'0');
  savePrayerState();
}

function renderPrayerTimesSettings() {
  var wrap = document.getElementById('prayerTimesSettings');
  if (!wrap) return;
  wrap.innerHTML = prayerState.times.slice(0, prayerState.count).map(function(t, i) {
    var meta = prayerHourMeta(i, prayerState.count);
    return '<div style="display:flex; align-items:center; justify-content:space-between;">'
      + '<span style="font-size:10px; letter-spacing:.15em; color:' + meta.c + ';">' + prayerHourName(i, prayerState.count) + '</span>'
      + '<input type="time" value="' + t + '" data-idx="' + i + '" onchange="updatePrayerTime(this)" '
      + 'style="background:var(--bg); border:1px solid var(--border2); border-radius:4px; padding:6px 10px; color:var(--text); font-family:monospace; font-size:13px; outline:none;"/>'
      + '</div>';
  }).join('');
  // Highlight active count btn
  [1,2,3,4,5].forEach(function(i) {
    var btn = document.getElementById('prayerCount' + i);
    if (btn) btn.classList.toggle('selected', i === prayerState.count);
  });
  var m = Math.floor(prayerState.durationSec / 60), s = prayerState.durationSec % 60;
  var el = document.getElementById('prayerDurDisplay');
  if (el) el.textContent = m + ':' + String(s).padStart(2,'0');
}

function updatePrayerTime(input) {
  var idx = parseInt(input.dataset.idx);
  prayerState.times[idx] = input.value;
  savePrayerState();
}

// Prayer modal buttons
document.getElementById('prayerBeginBtn').addEventListener('click', function() {
  beginPrayer(currentPrayerIndex);
});
document.getElementById('prayerDelayBtn').addEventListener('click', function() {
  var existing = prayerActiveTimes.find(function(p) { return p.index === currentPrayerIndex; });
  if (existing) existing.delayUntilMs = Date.now() + 30 * 60 * 1000;
  hidePrayerModal();
  showToast('Prayer delayed 30 minutes');
});
document.getElementById('prayerSkipBtn').addEventListener('click', function() {
  if (prayerState.todaySkipped.indexOf(currentPrayerIndex) === -1) {
    prayerState.todaySkipped.push(currentPrayerIndex);
  }
  prayerActiveTimes = prayerActiveTimes.filter(function(p) { return p.index !== currentPrayerIndex; });
  savePrayerState();
  hidePrayerModal();
  renderPrayerPanel();
  showToast('Prayer skipped');
});
document.getElementById('prayerConcludeBtn').addEventListener('click', concludePrayer);

// ── Prayer history ─────────────────────────────────────
function openPrayerHistory() {
  renderPrayerHistory();
  showScreen('prayerHistoryScreen');
}

function renderPrayerHistory() {
  var list = document.getElementById('prayerHistoryList');
  if (!list) return;
  var hist = (prayerState.history || []);
  if (!hist.length) {
    list.innerHTML = '<div class="history-empty">No prayers recorded yet.</div>';
    return;
  }
  list.innerHTML = hist.map(function(h, idx) {
    var d = new Date(h.date);
    var dateStr = d.toLocaleDateString('en-US', { month:'short', day:'numeric', weekday:'short' });
    var timeStr = d.toLocaleTimeString('en-US', { hour:'numeric', minute:'2-digit' });
    var m = Math.floor((h.durationSec || 0) / 60), s = (h.durationSec || 0) % 60;
    var durStr = m + ':' + String(s).padStart(2,'0');
    var labelStr = h.voluntary ? 'Voluntary' : (h.label || ('Prayer ' + ((h.index||0)+1)));
    var promptHtml = h.prompt
      ? '<div style="font-family:Cormorant Garamond,serif; font-style:italic; font-size:13px; color:var(--text); margin-top:8px; line-height:1.5;">' + escHtml(h.prompt) + '</div>'
      : '';
    var reflectionHtml = h.reflection
      ? '<div class="history-notes">' + escHtml(h.reflection) + '</div>'
      : '';
    return '<div class="conc-history-item" style="position:relative; border-color:rgba(155,142,196,.2);">'
      + '<button class="history-delete-btn" onclick="deletePrayerHistoryEntry(' + idx + ')">✕</button>'
      + '<div class="conc-history-top" style="padding-right:28px;">'
      + '<span class="conc-history-date">' + dateStr + ' · ' + timeStr + '</span>'
      + '<span class="conc-history-time" style="color:#c4b8e8;">' + durStr + '</span>'
      + '</div>'
      + '<div style="display:flex;gap:12px;align-items:center;">'
      + '<span class="conc-history-xp" style="color:#9b8ec4;">+' + (h.xpEarned || 0) + ' xp</span>'
      + '<span style="font-size:9px;color:var(--muted);letter-spacing:.1em;">' + escHtml(labelStr) + '</span>'
      + '</div>'
      + promptHtml
      + reflectionHtml
      + '</div>';
  }).join('');
}

function deletePrayerHistoryEntry(idx, _c) {
  if (!_c) { showConfirm('Delete Entry', 'This prayer entry will be removed. This cannot be undone.', function(){ deletePrayerHistoryEntry(idx, true); }); return; }
  prayerState.history.splice(idx, 1);
  savePrayerState();
  renderPrayerHistory();
  showToast('Entry deleted');
}

// ── Mantra — japa-style bead counter ────────────────────────────────────────
// A personal sacred phrase repeated a set number of times (21 / 54 / 108, the
// traditional mala counts). Tap anywhere on the screen with each repetition;
// the bead ring fills, quarters pulse, and the round completes at the target.
var mantraCount = 0;
var mantraStartMs = null;
var MANTRA_RING_C = 2 * Math.PI * 112; // ring circumference (r=112)

function countMantraRoundsToday() {
  var today = new Date().toDateString();
  return (prayerState.history || []).filter(function(h) {
    return h && h.type === 'mantra' && new Date(h.date).toDateString() === today;
  }).length;
}

function renderPrayerMantraCard() {
  var card = document.getElementById('prayerMantraCard');
  if (!card) return;
  var text = (prayerState.mantraText || '').trim();
  var target = prayerState.mantraTarget || 108;
  var todayRounds = countMantraRoundsToday();
  card.innerHTML = '<div class="prayer-card-title">☙ Mantra</div>'
    + (text
      ? '<div class="prayer-mantra-text">“' + escHtml(text) + '”</div>'
      : '<div class="prayer-mantra-text" style="color:var(--muted);">Set a sacred phrase to repeat…</div>')
    + '<div class="prayer-mantra-meta">' + target + ' beads per round'
      + (todayRounds ? ' · ' + todayRounds + ' round' + (todayRounds === 1 ? '' : 's') + ' today' : '') + '</div>'
    + '<div style="display:flex; gap:6px; margin-bottom:12px;">'
    + [21, 54, 108].map(function(n) {
        return '<button class="q-scale-btn' + (n === target ? ' selected' : '') + '" style="aspect-ratio:auto; padding:7px 0;" onclick="setMantraTarget(' + n + ')">' + n + '</button>';
      }).join('')
    + '</div>'
    + '<div class="prayer-mantra-row">'
    + '<button class="prayer-mantra-begin" onclick="beginMantra()">Begin Mantra</button>'
    + '<button class="prayer-mantra-edit" onclick="editMantra()">' + (text ? 'Edit' : 'Set') + '</button>'
    + '</div>';
}

function setMantraTarget(n) {
  prayerState.mantraTarget = n;
  savePrayerState();
  renderPrayerMantraCard();
}

function editMantra() {
  showAppPrompt('Your Mantra', 'A phrase to repeat with each bead.', prayerState.mantraText || '', function(next) {
    prayerState.mantraText = next.trim().slice(0, 160);
    savePrayerState();
    renderPrayerMantraCard();
  });
}

function beginMantra() {
  if (!(prayerState.mantraText || '').trim()) {
    editMantra();
    if (!(prayerState.mantraText || '').trim()) return;
  }
  mantraCount = 0;
  mantraStartMs = Date.now();
  var target = prayerState.mantraTarget || 108;
  document.getElementById('mantraPhrase').textContent = '“' + prayerState.mantraText.trim() + '”';
  document.getElementById('mantraScreenTarget').textContent = target + ' beads';
  document.getElementById('mantraCountNum').textContent = '0';
  document.getElementById('mantraCountTarget').textContent = 'of ' + target;
  var ring = document.getElementById('mantraRingFill');
  if (ring) { ring.style.strokeDasharray = MANTRA_RING_C; ring.style.strokeDashoffset = MANTRA_RING_C; }
  showScreen('mantraScreen');
  requestExerciseWakeLock();
}

function mantraTap() {
  var target = prayerState.mantraTarget || 108;
  if (mantraCount >= target) return;
  mantraCount++;
  var numEl = document.getElementById('mantraCountNum');
  if (numEl) {
    numEl.textContent = mantraCount;
    numEl.classList.remove('tick');
    void numEl.offsetWidth;
    numEl.classList.add('tick');
  }
  var ring = document.getElementById('mantraRingFill');
  if (ring) ring.style.strokeDashoffset = MANTRA_RING_C * (1 - mantraCount / target);
  if (mantraCount >= target) {
    if (navigator.vibrate) navigator.vibrate([60, 60, 160]);
    setTimeout(function() { completeMantra(mantraCount); }, 550);
  } else if (mantraCount % Math.max(1, Math.floor(target / 4)) === 0) {
    if (navigator.vibrate) navigator.vibrate(45); // quarter milestone
  } else {
    if (navigator.vibrate) navigator.vibrate(12);
  }
}

function completeMantra(beads) {
  releaseExerciseWakeLock();
  var elapsed = Math.floor((Date.now() - (mantraStartMs || Date.now())) / 1000);
  var target = prayerState.mantraTarget || 108;
  var xpEarned = Math.max(5, Math.round(elapsed / 60 * 20)); // same rate as prayer
  state.xp += xpEarned;
  awardLevelUps(state, sumXpToLevel, xpForLevel);
  saveState();
  prayerState.history = prayerState.history || [];
  var mantraHistoryEntry = {
    date: new Date().toISOString(),
    type: 'mantra',
    beads: beads,
    target: target,
    durationSec: elapsed,
    prompt: prayerState.mantraText.trim(),   // shows in history like a prayer prompt
    label: 'Mantra · ' + beads + '/' + target + ' beads',
    voluntary: false,
    xpEarned: xpEarned,
    reflection: ''
  };
  pushHistory(prayerState.history, mantraHistoryEntry, 100);
  recordPracticeReviewEntry('prayer', mantraHistoryEntry);
  savePrayerState();
  if (typeof playSessionCompleteSound === 'function') { try { playSessionCompleteSound(); } catch(e) {} }
  showToast('+' + xpEarned + ' XP · Mantra round ' + (beads >= target ? 'complete' : 'recorded') + ' · ' + beads + ' beads');
  mantraStartMs = null;
  renderPrayerPanel();
  showScreen('homeScreen');
  switchMode('prayer');
}

function discardMantra(_c) {
  if (mantraCount > 0 && !_c) { showConfirm('Discard Mantra', 'No beads will be saved.', function(){ discardMantra(true); }); return; }
  releaseExerciseWakeLock();
  mantraStartMs = null;
  showScreen('homeScreen');
  switchMode('prayer');
}

// Tap anywhere on the mantra screen counts a bead — except the control buttons.
document.getElementById('mantraScreen').addEventListener('click', function(e) {
  if (e.target.closest('button')) return;
  mantraTap();
});
document.getElementById('mantraEndEarlyBtn').addEventListener('click', function() {
  if (mantraCount > 0) completeMantra(mantraCount);
  else discardMantra();
});

document.getElementById('prayerHistoryBack').addEventListener('click', function() {
  showScreen('homeScreen');
  switchMode('prayer');
});
