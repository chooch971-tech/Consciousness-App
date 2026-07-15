// ═══════════════════════════════════════
// THOUGHT CONTROL EXERCISE
// ═══════════════════════════════════════

// ── Thought Control modes ────────────────────────────────
var tcMode = 'observation'; // 'observation' | 'focus' | 'vacancy'
var tcDuration = 5; // minutes

var TC_MODE_DEFS = {
  observation: {
    label: 'Observation',
    desc: 'Sit or lay comfortably and observe the thoughts that arise. Do not follow them, suppress them, or judge them — only watch each thought appear and disappear. Tap when you get lost in a thought. The goal is to <em>be the watcher</em> and not forget yourself in your thoughts.'
  },
  focus: {
    label: 'Focus',
    desc: 'Choose a single thought, word, or simple concept and hold it in the mind exclusively. The moment another thought intrudes, tap the screen. Unlike observation, here you are actively directing the mind — not watching, but holding. The goal is a sustained, unbroken thread of one thought.'
  },
  vacancy: {
    label: 'Vacancy',
    desc: 'Attempt to hold the mind in complete emptiness — no thoughts, no images, no inner speech. This is the most demanding of the three. Tap at the very first sign of any mental content. The goal is total stillness: a mind as silent and open as empty sky.'
  }
};

function getTCBestGap(mode) {
  return (concState.history || []).reduce(function(b, s) {
    if (s.type !== 'thought') return b;
    var m = s.tcMode || 'observation'; // legacy entries default to observation
    return m === mode && s.seconds > b ? s.seconds : b;
  }, 0);
}

function buildTCProgressBars(mode) {
  var best = getTCBestGap(mode);
  if (best === 0) return '';
  var html = '';

  // Bar 1 — progress to 10:00
  var p1 = Math.min(100, Math.round(best / 600 * 1000) / 10);
  var p1d = Number.isInteger(p1) ? p1 : p1.toFixed(1);
  html += '<div style="margin-top:14px;padding:12px 14px;background:rgba(164,126,184,.08);border:1px solid rgba(164,126,184,.2);border-radius:8px;">'
    + '<div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:8px;">'
    + '<span style="font-size:9px;letter-spacing:.18em;text-transform:uppercase;color:rgba(164,126,184,.6);">Progress to 10 min</span>'
    + '<span style="font-family:Cormorant Garamond,serif;font-size:26px;font-weight:300;color:#c4a8d4;line-height:1;">' + p1d + '<span style="font-size:14px;">%</span></span>'
    + '</div>'
    + '<div style="height:4px;background:rgba(255,255,255,.07);border-radius:2px;overflow:hidden;">'
    + '<div style="height:100%;width:' + p1d + '%;background:linear-gradient(90deg,#a47eb8,#c4a8d4);border-radius:2px;"></div>'
    + '</div></div>';

  // Bar 2 — progress to 12:30 (unlocks at 10 min)
  if (best >= 600) {
    var p2 = Math.min(100, Math.round(best / 750 * 1000) / 10);
    var p2d = Number.isInteger(p2) ? p2 : p2.toFixed(1);
    html += '<div style="margin-top:10px;padding:12px 14px;background:rgba(164,126,184,.08);border:1px solid rgba(164,126,184,.2);border-radius:8px;">'
      + '<div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:8px;">'
      + '<span style="font-size:9px;letter-spacing:.18em;text-transform:uppercase;color:rgba(164,126,184,.6);">Progress to 12:30</span>'
      + '<span style="font-family:Cormorant Garamond,serif;font-size:26px;font-weight:300;color:#c4a8d4;line-height:1;">' + p2d + '<span style="font-size:14px;">%</span></span>'
      + '</div>'
      + '<div style="height:4px;background:rgba(255,255,255,.07);border-radius:2px;overflow:hidden;">'
      + '<div style="height:100%;width:' + p2d + '%;background:linear-gradient(90deg,#a47eb8,#c4a8d4);border-radius:2px;"></div>'
      + '</div></div>';
  }

  // Bar 3 — progress to 15:00 mastery, red (unlocks at 12:30)
  if (best >= 750) {
    var p3 = Math.min(100, Math.round(best / 900 * 1000) / 10);
    var p3d = Number.isInteger(p3) ? p3 : p3.toFixed(1);
    html += '<div style="margin-top:10px;padding:12px 14px;background:rgba(180,40,40,.07);border:1px solid rgba(180,40,40,.2);border-radius:8px;">'
      + '<div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:8px;">'
      + '<span style="font-size:9px;letter-spacing:.18em;text-transform:uppercase;color:rgba(180,60,60,.65);">Progress to 15 min</span>'
      + '<span style="font-family:Cormorant Garamond,serif;font-size:26px;font-weight:300;color:#c0403a;line-height:1;">' + p3d + '<span style="font-size:14px;">%</span></span>'
      + '</div>'
      + '<div style="height:4px;background:rgba(255,255,255,.07);border-radius:2px;overflow:hidden;">'
      + '<div style="height:100%;width:' + p3d + '%;background:linear-gradient(90deg,#b42828,#d94f4f);border-radius:2px;"></div>'
      + '</div></div>';
  }

  // Mastery banner
  if (best >= 900) {
    html += '<div style="margin-top:18px;padding:20px 18px;background:rgba(180,40,40,.06);border:1px solid rgba(180,40,40,.25);border-radius:10px;text-align:center;">'
      + '<div style="font-family:Cormorant Garamond,serif;font-size:22px;font-weight:400;color:#c0403a;line-height:1.4;">This mode has been mastered.</div>'
      + '<div style="margin-top:8px;font-size:10px;letter-spacing:.18em;text-transform:uppercase;color:rgba(180,60,60,.5);">Fifteen minutes of unbroken silence</div>'
      + '</div>';
  }

  return html;
}

function buildTCSetupHTML() {
  var tabs = ['observation','focus','vacancy'].map(function(m) {
    var active = m === tcMode;
    return '<button onclick="switchTCMode(\'' + m + '\')" style="'
      + 'flex:1;padding:7px 4px;font-family:\'DM Mono\',monospace;font-size:8px;letter-spacing:.15em;text-transform:uppercase;'
      + 'border-radius:6px;cursor:pointer;transition:all .2s;'
      + (active
        ? 'background:rgba(164,126,184,.18);border:1px solid rgba(164,126,184,.4);color:#c4a8d4;'
        : 'background:transparent;border:1px solid rgba(164,126,184,.12);color:var(--muted);')
      + '">' + TC_MODE_DEFS[m].label + '</button>';
  }).join('');

  return '<div style="display:flex;gap:6px;margin-bottom:20px;">' + tabs + '</div>'
    + '<div style="height:1px;background:var(--border);margin-bottom:20px;opacity:.4;"></div>'
    + '<div class="tc-duration-picker" style="margin-bottom:0;">'
    + '<div style="font-size:9px;letter-spacing:.2em;text-transform:uppercase;color:var(--muted);margin-bottom:12px;">Session duration</div>'
    + '<div class="tc-duration-row">'
    + '<button class="tc-duration-btn" onclick="if(tcDuration>1){tcDuration--;document.getElementById(\'tcDurDisplay\').textContent=tcDuration;}">&#8722;</button>'
    + '<div class="tc-duration-val" id="tcDurDisplay">' + tcDuration + '</div>'
    + '<button class="tc-duration-btn" onclick="if(tcDuration<30){tcDuration++;document.getElementById(\'tcDurDisplay\').textContent=tcDuration;}">+</button>'
    + '</div>'
    + '<div style="font-size:9px;letter-spacing:.1em;color:var(--muted);margin-top:8px;">minutes &middot; 1&ndash;30</div>'
    + '</div>'
    + buildTCProgressBars(tcMode)
    + '<span onclick="concHistoryFrom=\'exSetupScreen\'; concHistoryFilter=\'thought\'; renderConcHistory(); showScreen(\'concHistoryScreen\');" style="display:block;margin-top:20px;font-size:9px;letter-spacing:.15em;text-transform:uppercase;color:var(--muted);cursor:pointer;text-decoration:underline;">View History</span>';
}

function switchTCMode(mode) {
  tcMode = mode;
  var descEl = document.getElementById('exSetupDesc');
  if (descEl) descEl.innerHTML = TC_MODE_DEFS[mode].desc;
  var contentEl = document.getElementById('exSetupContent');
  if (contentEl) contentEl.innerHTML = buildTCSetupHTML();
}

var tcTimerHandle = null;
var tcStartTime = null;
var tcDurationSec = 600;
var tcIntrusions = [];  // timestamps of each thought tap
var tcLastTapTime = null;
var _tcAlarmInterval = null;  // loops the alarm until dismissed
var _tcCompletedElapsed = 0;  // elapsed seconds saved for dismissal
var tcResultElapsedSec = 0;
var tcResultSaved = false;
var _tcCompletedFlag = false;  // whether session was completed (vs ended early)

// Thought duration wired in openExerciseSetup

// ── TC Alarm (Web Audio bell) ────────────────────────────
// AudioContext is pre-created and unlocked on the first user tap so the
// alarm works on iOS / Android even though it fires outside a gesture.
var _tcAudioCtx = null;

function _getTCAudioCtx() {
  if (!_tcAudioCtx) {
    try { _tcAudioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch(e) {}
  }
  if (_tcAudioCtx && _tcAudioCtx.state === 'suspended') {
    _tcAudioCtx.resume().catch(function(){});
  }
  return _tcAudioCtx;
}

// Call this on every user-gesture during a TC session so the context is warm
function _unlockTCAudio() {
  var ctx = _getTCAudioCtx();
  if (!ctx) return;
  // Play a silent buffer to unlock on iOS
  var buf = ctx.createBuffer(1, 1, 22050);
  var src = ctx.createBufferSource();
  src.buffer = buf;
  src.connect(ctx.destination);
  src.start(0);
}

function playTCAlarm() {
  // Visual flash on the session screen (user may have eyes closed)
  var tapArea = document.getElementById('tcTapArea');
  if (tapArea) {
    tapArea.style.transition = 'background .15s';
    tapArea.style.background = 'rgba(164,126,184,.18)';
    setTimeout(function() { tapArea.style.background = ''; }, 600);
  }

  // Haptic feedback (works on Android; no-op on iOS)
  if (navigator.vibrate) navigator.vibrate([400, 150, 400, 150, 600]);

  // Audio
  var ctx = _getTCAudioCtx();
  if (!ctx) return;

  function bell(freq, startT, dur, vol) {
    var osc  = ctx.createOscillator();
    var gain = ctx.createGain();
    // Add a slight harmonic overtone for a richer bell timbre
    var osc2  = ctx.createOscillator();
    var gain2 = ctx.createGain();
    osc.connect(gain);   gain.connect(ctx.destination);
    osc2.connect(gain2); gain2.connect(ctx.destination);
    osc.type  = 'sine'; osc.frequency.setValueAtTime(freq, startT);
    osc2.type = 'sine'; osc2.frequency.setValueAtTime(freq * 2.756, startT); // inharmonic partial
    gain.gain.setValueAtTime(vol,   startT);
    gain.gain.exponentialRampToValueAtTime(0.001, startT + dur);
    gain2.gain.setValueAtTime(vol * 0.3, startT);
    gain2.gain.exponentialRampToValueAtTime(0.001, startT + dur * 0.6);
    osc.start(startT);  osc.stop(startT + dur);
    osc2.start(startT); osc2.stop(startT + dur);
  }

  var t = ctx.currentTime;
  // Three descending bell strikes — clearly audible
  bell(880, t,        3.5, 0.7);
  bell(698, t + 1.0,  3.5, 0.65);
  bell(523, t + 2.0,  4.5, 0.6);
}

function startThoughtControl() {
  _unlockTCAudio(); // pre-warm AudioContext while inside a user gesture
  tcDurationSec = tcDuration * 60;
  tcIntrusions = [];
  tcLastTapTime = null;

  document.getElementById('tcTimerDisplay').textContent = fmtTimer(tcDurationSec);
  document.getElementById('tcIntrusionCount').textContent = '0 thoughts';
  document.getElementById('tcStateLabel').textContent = 'Tap when a thought enters.';

  showScreen('tcSessionScreen');
  requestExerciseWakeLock();

  // 3-second countdown before session starts
  var overlay = document.getElementById('tcCountdownOverlay');
  var numEl = document.getElementById('tcCountdownNum');
  overlay.style.display = 'flex';
  var count = 3;

  function showCountNum(n) {
    numEl.textContent = n;
    numEl.style.animation = 'none';
    void numEl.offsetWidth; // force reflow so animation restarts cleanly
    numEl.style.animation = 'tcCountPop 1s ease forwards';
  }

  showCountNum(count);
  var cdInterval = setInterval(function() {
    count--;
    if (count <= 0) {
      clearInterval(cdInterval);
      setTimeout(function() {
        overlay.style.display = 'none';
        numEl.style.animation = 'none';
        tcStartTime = Date.now();
        tcLastTapTime = tcStartTime;
        tickTCTimer();
      }, 900);
    } else {
      showCountNum(count);
    }
  }, 1000);
}

function tickTCTimer() {
  var elapsed = Math.floor((Date.now() - tcStartTime) / 1000);
  var remaining = Math.max(0, tcDurationSec - elapsed);
  document.getElementById('tcTimerDisplay').textContent = fmtTimer(remaining);

  if (remaining <= 0) {
    endThoughtControl(true);
    return;
  }
  tcTimerHandle = requestAnimationFrame(tickTCTimer);
}

function recordThought() {
  if (!tcStartTime) return; // ignore taps during countdown
  _unlockTCAudio(); // keep AudioContext warm on each tap
  var now = Date.now();
  tcIntrusions.push(now);
  tcLastTapTime = now;

  var flash = document.getElementById('tcIntrusionFlash');
  if (flash) {
    flash.classList.remove('show');
    void flash.offsetWidth;
    flash.classList.add('show');
  }

  var count = tcIntrusions.length;
  var el = document.getElementById('tcIntrusionCount');
  if (el) el.textContent = count + ' thought' + (count !== 1 ? 's' : '');
}

function endThoughtControl(completed) {
  releaseExerciseWakeLock();
  cancelAnimationFrame(tcTimerHandle);
  var elapsed = Math.floor((Date.now() - tcStartTime) / 1000);
  // Under 1 minute and stopped early — no XP, just return to Concentration
  if (!completed && elapsed < 60) {
    showScreen('homeScreen');
    switchMode('concentration');
    return;
  }
  // Skip times-up overlay — go straight to the completion card
  playTCAlarm();
  showTCResult(elapsed, completed);
}

function dismissTCAlarm() {
  clearInterval(_tcAlarmInterval);
  _tcAlarmInterval = null;
  var overlay = document.getElementById('tcTimesUpOverlay');
  if (overlay) overlay.style.display = 'none';
  showTCResult(_tcCompletedElapsed, true);
}

function showTCResult(elapsedSec, completed) {
  tcResultElapsedSec = elapsedSec;
  _tcCompletedFlag = !!completed;
  tcResultSaved = false;
  var totalIntrusions = tcIntrusions.length;
  var minutes = elapsedSec / 60;
  var rate = minutes > 0 ? (totalIntrusions / minutes).toFixed(1) : '0.0';

  // Longest gap between taps (or between start and first tap, or last tap and end)
  var gaps = [];
  var points = [tcStartTime].concat(tcIntrusions).concat([tcStartTime + elapsedSec * 1000]);
  for (var i = 0; i < points.length - 1; i++) {
    gaps.push(Math.floor((points[i+1] - points[i]) / 1000));
  }
  var bestGap = gaps.length ? Math.max.apply(null, gaps) : elapsedSec;

  document.getElementById('tcResultSub').textContent =
    fmtTimer(elapsedSec) + ' · ' + (completed ? 'completed' : 'ended early');
  document.getElementById('tcResultTotal').textContent = totalIntrusions;
  document.getElementById('tcResultRate').textContent = rate + '/min';
  document.getElementById('tcResultBest').textContent = fmtTimer(bestGap);
  document.getElementById('tcNotes').value = '';
  document.getElementById('tcAdaptWrap').innerHTML = '';

  saveTCResult();
}

function saveTCResult() {
  if (tcResultSaved) return;
  var notes = document.getElementById('tcNotes').value.trim();
  var elapsedSec = tcResultElapsedSec || Math.floor((Date.now() - tcStartTime) / 1000);
  tcResultSaved = true;
  // XP = seconds of session — same rate as other concentration exercises
  var xpEarned = Math.floor(elapsedSec * 0.5); // half rate since passive
  var bestGap = 0;
  var points = [tcStartTime].concat(tcIntrusions).concat([tcStartTime + elapsedSec * 1000]);
  for (var i = 0; i < points.length - 1; i++) {
    var g = Math.floor((points[i+1] - points[i]) / 1000);
    if (g > bestGap) bestGap = g;
  }

  concState.xp += xpEarned;
  if (isConcNewSession()) concState.totalSessions++;

  var concDidLevelUpTC = awardLevelUps(concState, concSumXpToLevel, concXpForLevel);

  var _akashaDeltaTC = recordExerciseCompletion({
    entry: {
      date: new Date().toISOString(),
      seconds: bestGap,
      xpEarned: xpEarned,
      notes: notes,
      type: 'thought',
      tcMode: tcMode,
      durationSec: elapsedSec,
      object: tcIntrusions.length + ' thoughts in ' + fmtTimer(elapsedSec)
    },
    exId: 'thought',
    omniaSeconds: elapsedSec,
    reachedRec: _tcCompletedFlag || omniaReachedRecommendation('thought', elapsedSec)
  });
  var _concDidLevelUpTC2 = concDidLevelUpTC;
  var _tcOriginMode = currentMode;
  showSessionComplete({
    title: 'Mind controlled.',
    sub: fmtTimer(elapsedSec) + (_tcCompletedFlag ? ' · completed' : ''),
    xp: xpEarned,
    akashaDelta: _akashaDeltaTC,
    stat3: { label: 'Thoughts', color: 'blue', value: tcIntrusions.length },
    onDone: function() {
      renderConcHome();
      showScreen('homeScreen');
      returnAfterExercise(_tcOriginMode);
      if (_concDidLevelUpTC2) setTimeout(function() { showConcLevelUp(concState.level); }, 400);
    }
  });
}

// Session tap area
document.getElementById('tcTapArea').addEventListener('click', function() {
  recordThought();
});
document.getElementById('tcEndBtn').addEventListener('click', function() {
  var _tcElapsed = tcStartTime ? Math.floor((Date.now() - tcStartTime) / 1000) : 0;
  omniaConfirmEarlyEnd('thought', _tcElapsed, function() {
    cancelAnimationFrame(tcTimerHandle);
    endThoughtControl(false);
  });
});
document.getElementById('tcSaveBtn').addEventListener('click', saveTCResult);
document.getElementById('tcViewHistoryBtn').addEventListener('click', function() {
  concHistoryFrom='exSetupScreen'; concHistoryFilter='thought'; renderConcHistory(); showScreen('concHistoryScreen');
});
