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

function buildSenseSetupHTML() {
  var tabs = ['feeling','smell','taste'].map(function(m) {
    var active = m === senseMode;
    return '<button onclick="switchSenseMode(\'' + m + '\')" style="'
      + 'flex:1;padding:7px 4px;font-family:\'DM Mono\',monospace;font-size:8px;letter-spacing:.15em;text-transform:uppercase;'
      + 'border-radius:6px;cursor:pointer;transition:all .2s;'
      + (active
        ? 'background:rgba(207,143,176,.18);border:1px solid rgba(207,143,176,.42);color:#e0a8c4;'
        : 'background:transparent;border:1px solid rgba(207,143,176,.12);color:var(--muted);')
      + '">' + SENSE_MODE_DEFS[m].label + '</button>';
  }).join('');

  var durs = [2,5,10].map(function(d) {
    var active = d === senseDuration;
    return '<button onclick="setSenseDuration(' + d + ')" style="'
      + 'flex:1;padding:9px 4px;font-family:\'DM Mono\',monospace;font-size:10px;letter-spacing:.08em;'
      + 'border-radius:6px;cursor:pointer;transition:all .2s;'
      + (active
        ? 'background:rgba(207,143,176,.16);border:1px solid rgba(207,143,176,.4);color:#e0a8c4;'
        : 'background:transparent;border:1px solid rgba(207,143,176,.12);color:var(--muted);')
      + '">' + d + ' min</button>';
  }).join('');

  return '<div style="display:flex;gap:6px;margin-bottom:20px;">' + tabs + '</div>'
    + '<div style="height:1px;background:var(--border);margin-bottom:20px;opacity:.4;"></div>'
    + '<div style="font-size:9px;letter-spacing:.2em;text-transform:uppercase;color:var(--muted);margin-bottom:10px;">Hold this</div>'
    + '<div style="display:flex;align-items:center;gap:12px;margin-bottom:24px;">'
    + '<div id="senseCueText" style="flex:1;font-family:\'Cormorant Garamond\',serif;font-size:20px;font-weight:300;font-style:italic;color:var(--text);line-height:1.4;">' + senseCurrentCue() + '</div>'
    + '<button onclick="shuffleSenseCue()" title="Another" style="flex-shrink:0;width:38px;height:38px;border-radius:50%;background:rgba(207,143,176,.1);border:1px solid rgba(207,143,176,.3);color:#e0a8c4;font-size:16px;cursor:pointer;">&#8635;</button>'
    + '</div>'
    + '<div style="font-size:9px;letter-spacing:.2em;text-transform:uppercase;color:var(--muted);margin-bottom:12px;">Session duration</div>'
    + '<div style="display:flex;gap:6px;">' + durs + '</div>'
    + '<span onclick="concHistoryFrom=\'exSetupScreen\'; concHistoryFilter=\'all\'; renderConcHistory(); showScreen(\'concHistoryScreen\');" style="display:block;margin-top:22px;font-size:9px;letter-spacing:.15em;text-transform:uppercase;color:var(--muted);cursor:pointer;text-decoration:underline;">View History</span>';
}

function switchSenseMode(mode) {
  if (!SENSE_MODE_DEFS[mode]) return;
  senseMode = mode;
  senseCueIdx = 0;
  var descEl = document.getElementById('exSetupDesc');
  if (descEl) descEl.innerHTML = SENSE_MODE_DEFS[mode].desc;
  var contentEl = document.getElementById('exSetupContent');
  if (contentEl) contentEl.innerHTML = buildSenseSetupHTML();
}

function setSenseDuration(min) {
  senseDuration = min;
  var contentEl = document.getElementById('exSetupContent');
  if (contentEl) contentEl.innerHTML = buildSenseSetupHTML();
}

function shuffleSenseCue() {
  var cues = SENSE_MODE_DEFS[senseMode].cues;
  if (cues.length < 2) return;
  var next = senseCueIdx;
  while (next === senseCueIdx) next = Math.floor(Math.random() * cues.length);
  senseCueIdx = next;
  var el = document.getElementById('senseCueText');
  if (el) el.textContent = senseCurrentCue();
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
