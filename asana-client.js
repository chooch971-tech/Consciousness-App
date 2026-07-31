// ══════════════════════════════════════════
// ASANA EXERCISE
// ══════════════════════════════════════════

// ── Shared Screen Wake Lock for all exercises ──────────────────────────────
// Acquiring a wake lock is asynchronous, so the obvious "request it, stash
// whatever comes back" shape leaks. Ask twice and the browser hands out two
// locks while only the second is remembered — the first stays held with
// nothing left able to release it, and the screen never sleeps again until
// the tab is destroyed. The callers really are re-entrant (a session asks on
// start and again on resume; Soul Mirror asks on every tab switch and on
// every return to visibility), so intent and the in-flight request are both
// tracked explicitly rather than assumed.
function makeWakeLockHolder() {
  var held = null;     // the live sentinel
  var pending = null;  // a request that has not resolved yet
  var wanted = false;  // whether we still want one by the time it arrives
  return {
    acquire: function() {
      if (!('wakeLock' in navigator)) return;
      wanted = true;
      if (held || pending) return; // already covered — asking again would leak
      try {
        pending = navigator.wakeLock.request('screen').then(function(wl) {
          pending = null;
          // Released while the request was still in flight: drop it now
          // instead of holding a lock nobody wants any more.
          if (!wanted) { try { wl.release(); } catch (e) {} return; }
          held = wl;
          // The browser drops the lock itself when the page hides. Clear our
          // handle when that happens so a later acquire() genuinely re-asks
          // rather than believing one is still active.
          try {
            wl.addEventListener('release', function() { if (held === wl) held = null; });
          } catch (e) {}
        }).catch(function() { pending = null; });
      } catch (e) { pending = null; }
    },
    release: function() {
      wanted = false;
      if (!held) return;
      var wl = held;
      held = null; // clear first, so a failed release cannot strand the handle
      try { wl.release().catch(function() {}); } catch (e) {}
    }
  };
}

var _exerciseWakeLockHolder = makeWakeLockHolder();
function requestExerciseWakeLock() { _exerciseWakeLockHolder.acquire(); }
function releaseExerciseWakeLock() { _exerciseWakeLockHolder.release(); }

var asanaStartTime = null;
var asanaTimerHandle = null;
var asanaSeconds = 0;
var asanaTargetSeconds = 300;
var currentAsanaPosture = 'seated';
var _asanaCountInterval = null;    // the pre-session countdown tick, so discard can cancel it
var _asanaCountBeginTimer = null;  // the 900ms pause after "1" before the session actually begins

// ── Start buffer (Settings → Asana) ──
var ASANA_START_BUFFER_DEFAULT = 3;
var ASANA_START_BUFFER_OPTIONS = [0,1,2,3,5,7,10];
function getAsanaStartBuffer() {
  var raw = Number(typeof concState !== 'undefined' && concState && concState.asanaStartBuffer);
  if (!Number.isFinite(raw) || ASANA_START_BUFFER_OPTIONS.indexOf(raw) === -1) return ASANA_START_BUFFER_DEFAULT;
  return raw;
}
function setAsanaStartBuffer(val) {
  var next = Number(val);
  if (ASANA_START_BUFFER_OPTIONS.indexOf(next) === -1) next = ASANA_START_BUFFER_DEFAULT;
  concState.asanaStartBuffer = next;
  saveConcState();
}
function syncAsanaBufferSelect() {
  var sel = document.getElementById('asanaBufferSelect');
  if (sel) sel.value = String(getAsanaStartBuffer());
}
function _wireAsanaBufferSelect() {
  var sel = document.getElementById('asanaBufferSelect');
  if (!sel) return;
  syncAsanaBufferSelect();
  sel.addEventListener('change', function() { setAsanaStartBuffer(this.value); });
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', _wireAsanaBufferSelect);
else _wireAsanaBufferSelect();

function fmtAsanaTime(sec) {
  var m = Math.floor(sec / 60), s = sec % 60;
  return m + ':' + (s < 10 ? '0' : '') + s;
}

function playAsanaAlarm() {
  try {
    var ctx = new (window.AudioContext || window.webkitAudioContext)();
    // Three gentle singing-bowl tones
    [[528, 0], [660, 1.6], [528, 3.2]].forEach(function(pair) {
      var freq = pair[0], delay = pair[1];
      var osc = ctx.createOscillator();
      var osc2 = ctx.createOscillator();
      var gain = ctx.createGain();
      var gain2 = ctx.createGain();
      osc.connect(gain); osc2.connect(gain2);
      gain.connect(ctx.destination); gain2.connect(ctx.destination);
      osc.type = 'sine'; osc.frequency.value = freq;
      osc2.type = 'sine'; osc2.frequency.value = freq * 2.756;
      var t = ctx.currentTime + delay;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.32, t + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 3.5);
      gain2.gain.setValueAtTime(0, t);
      gain2.gain.linearRampToValueAtTime(0.09, t + 0.01);
      gain2.gain.exponentialRampToValueAtTime(0.001, t + 1.8);
      osc.start(t); osc.stop(t + 4);
      osc2.start(t); osc2.stop(t + 2);
    });
  } catch(e) {}
  if (navigator.vibrate) navigator.vibrate([400, 250, 400, 250, 800]);
}

function startAsana() {
  // qualTarget already folds in the advanced floor, auto-advance state, and the
  // manual ceiling override, so it is the single source of truth here.
  var durMin = guideAsanaStats().qualTarget || 5;
  asanaTargetSeconds = durMin * 60;
  asanaSeconds = 0;
  var el = document.getElementById('asanaTimerDisplay');
  if (el) el.textContent = fmtAsanaTime(asanaTargetSeconds);
  var stateEl = document.getElementById('asanaStateLabel');
  if (stateEl) stateEl.textContent = 'be still';
  showScreen('asanaSessionScreen');
  requestExerciseWakeLock();

  // Configurable countdown before the timer starts (Settings → Asana →
  // Start Buffer) — a moment to settle into position first.
  var overlay = document.getElementById('asanaCountdownOverlay');
  var numEl = document.getElementById('asanaCountdownNum');
  var count = getAsanaStartBuffer();

  function beginAsanaSession() {
    if (overlay) overlay.style.display = 'none';
    if (numEl) numEl.style.animation = 'none';
    asanaStartTime = Date.now();
    tickAsana();
  }

  if (count <= 0 || !overlay || !numEl) { beginAsanaSession(); return; }
  overlay.style.display = 'flex';

  function showCountNum(n) {
    numEl.textContent = n;
    numEl.style.animation = 'none';
    void numEl.offsetWidth; // force reflow so animation restarts cleanly
    numEl.style.animation = 'tcCountPop 1s ease forwards';
  }

  showCountNum(count);
  _asanaCountInterval = setInterval(function() {
    count--;
    if (count <= 0) {
      clearInterval(_asanaCountInterval);
      _asanaCountInterval = null;
      _asanaCountBeginTimer = setTimeout(beginAsanaSession, 900);
    } else {
      showCountNum(count);
    }
  }, 1000);
}

function tickAsana() {
  asanaSeconds = Math.floor((Date.now() - asanaStartTime) / 1000);
  var remaining = Math.max(0, asanaTargetSeconds - asanaSeconds);
  var el = document.getElementById('asanaTimerDisplay');
  if (el) el.textContent = fmtAsanaTime(remaining);
  var pct = asanaTargetSeconds > 0 ? remaining / asanaTargetSeconds : 0;
  var label = pct > 0.75 ? 'be still' : pct > 0.5 ? 'settling' : pct > 0.25 ? 'holding' : 'iron stillness';
  var stateEl = document.getElementById('asanaStateLabel');
  if (stateEl) stateEl.textContent = label;
  if (remaining === 0) {
    clearTimeout(asanaTimerHandle);
    asanaTimerHandle = null;
    playAsanaAlarm();
    endAsana();
    return;
  }
  asanaTimerHandle = setTimeout(tickAsana, 1000);
}

function endAsana() {
  clearTimeout(asanaTimerHandle);
  asanaTimerHandle = null;
  releaseExerciseWakeLock();
  showAsanaResult(asanaSeconds);
}

function showAsanaResult(seconds) {
  var xpEarned = seconds;
  concState.xp += xpEarned;
  if (isConcNewSession()) concState.totalSessions++;
  if (seconds > (concState.bestAsanaSeconds || 0)) concState.bestAsanaSeconds = seconds;

  var didLevelUp = awardLevelUps(concState, concSumXpToLevel, concXpForLevel);

  var _akashaDeltaAsana = recordExerciseCompletion({
    entry: {
      date: new Date().toISOString(),
      exercise: 'asana',
      posture: currentAsanaPosture,
      seconds: seconds,
      xpEarned: xpEarned
    },
    exId: 'asana',
    omniaSeconds: seconds,
    reachedRec: omniaReachedRecommendation('asana', seconds, asanaTargetSeconds)
  });
  var _asanaOriginMode = currentMode;
  showSessionComplete({
    title: 'Stillness mastered.',
    sub: currentAsanaPosture,
    xp: xpEarned,
    akashaDelta: _akashaDeltaAsana,
    stat3: { label: 'Time', color: 'blue', value: fmtAsanaTime(seconds) },
    onDone: function() {
      showScreen('homeScreen');
      returnAfterExercise(_asanaOriginMode);
      if (didLevelUp) setTimeout(function() { showLevelUp(concState.level, getConcRank(concState.level), 'concentration'); }, 800);
    }
  });
}

function saveAsanaResult() {
  var notes = document.getElementById('asanaNotes').value.trim();
  if (notes && concState.history[0] && concState.history[0].exercise === 'asana') {
    concState.history[0].notes = notes;
    saveConcState();
  }
  showScreen('homeScreen');
  switchMode('concentration');
}

document.getElementById('asanaEndBtn').addEventListener('click', function() {
  omniaConfirmEarlyEnd('asana', asanaSeconds, endAsana, asanaTargetSeconds);
});
document.getElementById('asanaSaveBtn').addEventListener('click', saveAsanaResult);
document.getElementById('asanaViewHistoryBtn').addEventListener('click', function() {
  concHistoryFrom='home'; concHistoryFilter='all'; renderConcHistory(); showScreen('concHistoryScreen');
});
