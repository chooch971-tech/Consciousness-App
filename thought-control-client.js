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

// Only the rung currently being climbed is shown (10:00 → 12:30 → 15:00,
// mastery banner at fifteen) — one bar, not the whole ladder. Rendered via
// the shared .sn-* kit (snProgressBarHtml lives in senses-client.js; the
// blue hue comes from the .sn-setup--tc wrapper).
function buildTCProgressBars(mode) {
  var best = getTCBestGap(mode);
  if (best === 0) return '';
  if (best >= 900) return snMasteryHtml('This mode has been mastered.', 'Fifteen minutes of unbroken silence');
  if (best >= 750) return snProgressBarHtml('Progress to 15 min', best, 900, true);
  if (best >= 600) return snProgressBarHtml('Progress to 12:30', best, 750, false);
  return snProgressBarHtml('Progress to 10 min', best, 600, false);
}

// Mode glyphs: observation = an open eye, focus = a held point,
// vacancy = a dashed (empty) circle.
var TC_MODE_GLYPHS = {
  observation: '<svg viewBox="0 0 24 22" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'
    + '<path d="M2.5 11 Q12 3.6 21.5 11 Q12 18.4 2.5 11 Z"/><circle cx="12" cy="11" r="2.9"/></svg>',
  focus: '<svg viewBox="0 0 24 22" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true">'
    + '<circle cx="12" cy="11" r="7.6"/><circle cx="12" cy="11" r="2.2" fill="currentColor" stroke="none"/></svg>',
  vacancy: '<svg viewBox="0 0 24 22" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true">'
    + '<circle cx="12" cy="11" r="7.6" stroke-dasharray="2.6 3.6"/></svg>'
};

// Per-card accents: sky-blue watching, violet holding, teal emptiness.
var TC_MODE_ACCENTS = {
  observation: '--sn-card-rgb:126,168,208; --sn-card-light:#98c4e8;',
  focus:       '--sn-card-rgb:164,126,184; --sn-card-light:#c4a8d4;',
  vacancy:     '--sn-card-rgb:126,184,164; --sn-card-light:#8eccc0;'
};

function buildTCSetupHTML() {
  var tabs = ['observation','focus','vacancy'].map(function(m) {
    return '<button class="sn-mode' + (m === tcMode ? ' on' : '') + '" style="' + TC_MODE_ACCENTS[m] + '" onclick="switchTCMode(\'' + m + '\')">'
      + TC_MODE_GLYPHS[m]
      + '<span class="sn-mode__lbl">' + TC_MODE_DEFS[m].label + '</span></button>';
  }).join('');

  return '<div class="sn-setup sn-setup--tc">'
    + '<div class="sn-head"><div class="sn-head__label">Choose a discipline</div></div>'
    + '<div class="sn-modes">' + tabs + '</div>'
    + '<div class="sn-goal">'
    + '<div class="sn-goal__label">Minutes</div>'
    + '<div class="sn-stepper">'
    + '<button class="sn-step-btn" onclick="if(tcDuration>1){tcDuration--;document.getElementById(\'tcDurDisplay\').textContent=tcDuration;}">&#8722;</button>'
    + '<div class="sn-step-val" id="tcDurDisplay">' + tcDuration + '</div>'
    + '<button class="sn-step-btn" onclick="if(tcDuration<30){tcDuration++;document.getElementById(\'tcDurDisplay\').textContent=tcDuration;}">+</button>'
    + '</div>'
    + '<div class="sn-goal__sub">minutes &middot; 1&ndash;30 &middot; tap the screen each time a thought intrudes</div>'
    + '</div>'
    + buildTCProgressBars(tcMode)
    + '<button class="sn-history" onclick="concHistoryFrom=\'exSetupScreen\'; concHistoryFilter=\'thought\'; renderConcHistory(); showScreen(\'concHistoryScreen\');">&#9719;&nbsp; View history</button>'
    + '</div>';
}

function switchTCMode(mode) {
  tcMode = mode;
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
