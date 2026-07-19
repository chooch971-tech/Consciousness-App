// ══════════════════════════════════════════
// SENSE CONCENTRATION EXERCISE
// ══════════════════════════════════════════
// Bardon's sense-concentration training for the three senses the app does not
// already cover with their own cards (Visualization = sight, Auditory =
// hearing). The student evokes a single feeling, smell, or taste from
// imagination alone and holds it, unbroken, for the chosen duration. It is a
// pure countdown exercise — modelled on Asana — that ends on a gentle alarm and
// the shared meditative completion screen.
var senseMode = 'feeling'; // 'feeling' | 'smell' | 'taste'
var senseDuration = 5;     // minutes
var senseCueIdx = 0;

var SENSE_MODE_DEFS = {
  feeling: {
    label: 'Feeling',
    desc: 'Evoke a single physical sensation from imagination alone — warmth, coolness, weight, or texture — and hold it on your skin as vividly as if it were real. When it fades or another sensation intrudes, gently rebuild it. <em>Feeling</em> trains the sense of touch.',
    cues: [
      'The warmth of sunlight on your face',
      'Cool water flowing over your hands',
      'A gentle breeze across your arms',
      'The weight of a warm blanket',
      'Soft sand beneath bare feet',
      'The heat of a fire on your palms',
      'Cold air filling your lungs',
      'Smooth, cool stone in your hand'
    ]
  },
  smell: {
    label: 'Smell',
    desc: 'Summon a scent in the mind alone, with nothing before you. Let it bloom as fully as if its source were present, and hold it steady. When it slips away, call it back. <em>Smell</em> trains the olfactory imagination.',
    cues: [
      'Fresh rain on warm earth',
      'A rose in full bloom',
      'Coffee brewing',
      'Pine forest after snow',
      'Fresh-cut citrus peel',
      'Bread baking in an oven',
      'Salt air by the sea',
      'A field of lavender'
    ]
  },
  taste: {
    label: 'Taste',
    desc: 'Bring a taste alive on the tongue with nothing in your mouth — its body, sweetness, sharpness, and finish. Hold it, and when it dissolves, evoke it again. <em>Taste</em> trains the gustatory imagination.',
    cues: [
      'Honey, slow and golden',
      'A slice of ripe lemon',
      'Dark chocolate melting',
      'Cool fresh mint',
      'A pinch of sea salt',
      'A ripe summer strawberry',
      'Strong black tea',
      'A sliver of fresh ginger'
    ]
  }
};

function senseCurrentCue() {
  var cues = SENSE_MODE_DEFS[senseMode].cues;
  if (senseCueIdx < 0 || senseCueIdx >= cues.length) senseCueIdx = 0;
  return cues[senseCueIdx];
}

// One distinct glyph per sense so the mode cards read at a glance:
// touch = fingertip ripples, smell = rising scent curls, taste = a droplet.
var SENSE_MODE_GLYPHS = {
  feeling: '<svg viewBox="0 0 24 22" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true">'
    + '<circle cx="12" cy="16.4" r="2.1" fill="currentColor" stroke="none"/>'
    + '<path d="M7.6 11.6a6.2 6.2 0 0 1 8.8 0"/>'
    + '<path d="M4.6 8.2a10.4 10.4 0 0 1 14.8 0"/></svg>',
  smell: '<svg viewBox="0 0 24 22" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true">'
    + '<path d="M7 19.2c1.6-2.4-1.6-4.2 0-6.8 1.4-2.3.2-3.7.6-5.8"/>'
    + '<path d="M12 19.6c1.6-2.7-1.6-4.7 0-7.5 1.5-2.6.2-4 .6-6.3"/>'
    + '<path d="M17 19.2c1.6-2.4-1.6-4.2 0-6.8 1.4-2.3.2-3.7.6-5.8"/></svg>',
  taste: '<svg viewBox="0 0 24 22" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'
    + '<path d="M12 2.6C12 2.6 6.6 9.4 6.6 13.2a5.4 5.4 0 0 0 10.8 0C17.4 9.4 12 2.6 12 2.6Z"/>'
    + '<path d="M9.6 13.5a2.6 2.6 0 0 0 1.8 2.4"/></svg>'
};

// Clock-page mirror pieces, shared with Thought Control's setup (hue comes
// from the .sn-setup wrapper's CSS vars, not from here).
function snMasteryHtml(title, sub) {
  return '<div class="sn-mastery"><div class="sn-mastery__title">' + title + '</div>'
    + '<div class="sn-mastery__sub">' + sub + '</div></div>';
}
// "Your Record" readout — big serif m/s, or an italic "Not set yet".
function snRecordHtml(best) {
  var html = '<div class="sn-record"><div class="sn-record-label">Your Record</div>';
  if (best > 0) {
    var t = best >= 60
      ? Math.floor(best / 60) + '<small>m</small> ' + (best % 60) + '<small>s</small>'
      : best + '<small>s</small>';
    html += '<div class="sn-record-time">' + t + '</div>';
  } else {
    html += '<div class="sn-record-none">Not set yet</div>';
  }
  return html + '</div>';
}
// Single 0 → goal progress track with waypoint marks (Clock-style).
// marks: [{sec, label?}] — a mark always draws a notch; label is optional.
function snTrackHtml(best, goalSec, marks, goalLabel) {
  var fill = Math.min(100, best / goalSec * 100);
  var markHtml = '', labelHtml = '';
  (marks || []).forEach(function(m) {
    var left = (m.sec / goalSec * 100).toFixed(1);
    markHtml += '<div class="sn-track-mark" style="left:' + left + '%;"></div>';
    if (m.label) labelHtml += '<span style="left:' + left + '%;">' + m.label + '</span>';
  });
  return '<div class="sn-track-wrap">'
    + '<div class="sn-track-top"><span class="l">Progress</span><span class="r">Goal &middot; ' + goalLabel + '</span></div>'
    + '<div class="sn-track">'
    +   '<div class="sn-track-fill" style="width:' + fill.toFixed(1) + '%;"></div>' + markHtml
    + '</div>'
    + '<div class="sn-track-foot">'
    +   '<span style="left:0; transform:none;">0</span>' + labelHtml
    +   '<span style="right:0; left:auto; transform:none;">' + goalLabel + '</span>'
    + '</div>'
    + '</div>';
}

// Longest completed session for one sense (seconds).
function getSenseBest(mode) {
  return (concState.history || []).reduce(function(b, s) {
    return (s.exercise === 'sense' && (s.mode || 'feeling') === mode && s.seconds > b) ? s.seconds : b;
  }, 0);
}

// Per-card accents: rose touch, sage-green scent, honey-gold taste.
var SENSE_MODE_ACCENTS = {
  feeling: '--sn-card-rgb:207,143,176; --sn-card-light:#e0a8c4;',
  smell:   '--sn-card-rgb:150,200,150; --sn-card-light:#a8d88e;',
  taste:   '--sn-card-rgb:232,200,122; --sn-card-light:#e8c87a;'
};

function buildSenseSetupHTML() {
  var tabs = ['feeling','smell','taste'].map(function(m) {
    return '<button class="sn-mode' + (m === senseMode ? ' on' : '') + '" style="' + SENSE_MODE_ACCENTS[m] + '" onclick="switchSenseMode(\'' + m + '\')">'
      + SENSE_MODE_GLYPHS[m]
      + '<span class="sn-mode__lbl">' + SENSE_MODE_DEFS[m].label + '</span></button>';
  }).join('');

  var best = getSenseBest(senseMode);
  var progressHtml = best >= 900
    ? snMasteryHtml('This sense has been mastered.', 'Fifteen minutes held unbroken')
    : snTrackHtml(best, 900, [{ sec: 300, label: '5 min' }, { sec: 600, label: '10 min' }], '15 min');

  return '<div class="sn-setup">'
    + '<div class="sn-hero-card">'
    + '<div class="sn-head"><div class="sn-head__label">Train a sense</div>'
    + '<button type="button" class="aud-omnia-peek" onclick="openExExplainer(\'sense\')" aria-label="How Senses works">'
    + '<span class="clk-omnia-peek-head"><span class="clk-omnia-spin">' + omniaHeadOnlySVG(34, 32) + '</span></span>'
    + '</button></div>'
    + '<div class="sn-modes">' + tabs + '</div>'
    + '<div class="sn-goal__label">Minutes</div>'
    + '<div class="sn-stepper">'
    + '<button class="sn-step-btn" onclick="if(senseDuration>1){senseDuration--;document.getElementById(\'snDurVal\').textContent=senseDuration;}">&#8722;</button>'
    + '<div class="sn-step-val" id="snDurVal">' + senseDuration + '</div>'
    + '<button class="sn-step-btn" onclick="if(senseDuration<30){senseDuration++;document.getElementById(\'snDurVal\').textContent=senseDuration;}">+</button>'
    + '</div>'
    + '<div class="sn-goal__sub">1&ndash;30 &middot; a sensation is revealed when you begin</div>'
    + '</div>'
    + snRecordHtml(best)
    + progressHtml
    + '<button type="button" class="clk-history-link" onclick="concHistoryFrom=\'exSetupScreen\'; concHistoryFilter=\'all\'; renderConcHistory(); showScreen(\'concHistoryScreen\');">View History</button>'
    + '</div>';
}

function switchSenseMode(mode) {
  if (!SENSE_MODE_DEFS[mode]) return;
  senseMode = mode;
  senseCueIdx = 0;
  var contentEl = document.getElementById('exSetupContent');
  if (contentEl) contentEl.innerHTML = buildSenseSetupHTML();
}

var senseTimerHandle = null;
var senseStartTime = null;
var senseSeconds = 0;
var senseTargetSeconds = 300;
var senseActiveCue = '';
var senseActiveMode = 'feeling';

function fmtSenseTime(sec) {
  var m = Math.floor(sec / 60), s = sec % 60;
  return m + ':' + (s < 10 ? '0' : '') + s;
}

function startSenseSession() {
  // The setup page no longer previews a cue — the sensation is dealt fresh
  // each session, revealed on the session screen when practice begins.
  senseCueIdx = Math.floor(Math.random() * SENSE_MODE_DEFS[senseMode].cues.length);
  senseActiveCue = senseCurrentCue();
  senseActiveMode = senseMode;
  senseTargetSeconds = senseDuration * 60;
  senseSeconds = 0;
  senseStartTime = Date.now();
  var cueEl = document.getElementById('senseSessionCue');
  if (cueEl) cueEl.textContent = senseActiveCue;
  var titleEl = document.getElementById('senseSessionTitle');
  if (titleEl) titleEl.textContent = SENSE_MODE_DEFS[senseActiveMode].label.toLowerCase();
  var el = document.getElementById('senseTimerDisplay');
  if (el) el.textContent = fmtSenseTime(senseTargetSeconds);
  var stateEl = document.getElementById('senseStateLabel');
  if (stateEl) stateEl.textContent = 'summon it';
  showScreen('senseSessionScreen');
  requestExerciseWakeLock();
  tickSense();
}

function tickSense() {
  senseSeconds = Math.floor((Date.now() - senseStartTime) / 1000);
  var remaining = Math.max(0, senseTargetSeconds - senseSeconds);
  var el = document.getElementById('senseTimerDisplay');
  if (el) el.textContent = fmtSenseTime(remaining);
  var pct = senseTargetSeconds > 0 ? remaining / senseTargetSeconds : 0;
  var label = pct > 0.75 ? 'summon it' : pct > 0.5 ? 'let it bloom' : pct > 0.25 ? 'hold it steady' : 'let nothing else in';
  var stateEl = document.getElementById('senseStateLabel');
  if (stateEl) stateEl.textContent = label;
  if (remaining === 0) {
    clearTimeout(senseTimerHandle);
    senseTimerHandle = null;
    playAsanaAlarm();
    endSenseSession();
    return;
  }
  senseTimerHandle = setTimeout(tickSense, 1000);
}

function endSenseSession() {
  clearTimeout(senseTimerHandle);
  senseTimerHandle = null;
  releaseExerciseWakeLock();
  showSenseResult(senseSeconds);
}

function showSenseResult(seconds) {
  var xpEarned = seconds;
  concState.xp += xpEarned;
  if (isConcNewSession()) concState.totalSessions++;

  var didLevelUp = awardLevelUps(concState, concSumXpToLevel, concXpForLevel);

  var _akashaDeltaSense = recordExerciseCompletion({
    entry: {
      date: new Date().toISOString(),
      exercise: 'sense',
      mode: senseActiveMode,
      cue: senseActiveCue,
      seconds: seconds,
      xpEarned: xpEarned
    },
    exId: 'sense',
    omniaSeconds: seconds,
    reachedRec: omniaReachedRecommendation('sense', seconds, senseTargetSeconds)
  });
  var _senseOriginMode = currentMode;
  showSessionComplete({
    title: SENSE_MODE_DEFS[senseActiveMode].label + ' held.',
    sub: senseActiveCue,
    xp: xpEarned,
    akashaDelta: _akashaDeltaSense,
    stat3: { label: 'Time', color: 'blue', value: fmtSenseTime(seconds) },
    onDone: function() {
      showScreen('homeScreen');
      returnAfterExercise(_senseOriginMode);
      if (didLevelUp) setTimeout(function() { showLevelUp(concState.level, getConcRank(concState.level), 'concentration'); }, 800);
    }
  });
}

document.getElementById('senseEndBtn').addEventListener('click', function() {
  omniaConfirmEarlyEnd('sense', senseSeconds, endSenseSession, senseTargetSeconds);
});
