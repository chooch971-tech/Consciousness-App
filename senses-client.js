// ══════════════════════════════════════════
// SENSE CONCENTRATION EXERCISE
// ══════════════════════════════════════════
// Senses follows the same honest, rep-based practice model as Visualization:
// summon one imagined sensation, tap whenever concentration breaks, and end
// the rep when the sensation fades. Built-in and user-created sensations stay
// inside this module; Settings only provides the mount point for its editor.

var SENSE_CUSTOM_KEY = 'presence_custom_senses_v1';
var SENSE_CUSTOM_LIMIT = 40;
var SENSE_MASTERY_THRESHOLDS = [300, 450, 600];
var senseMode = 'feeling'; // 'feeling' | 'smell' | 'taste'
var senseSelectedCue = 'Warmth';
var senseEyesMode = 'closed'; // Closed eyes is the default; open eyes is the advanced successor.
// Each sense remembers its own chosen sensation, so stepping over to another
// mode and back doesn't silently reset the pick to the first cue in the list.
var senseSelectedByMode = { feeling: 'Warmth', smell: '', taste: '' };

var SENSE_MODE_DEFS = {
  feeling: {
    label: 'Feeling',
    desc: 'Evoke a physical feeling from imagination alone and hold it as vividly as if it were real.',
    cues: [
      'Warmth',
      'Coldness',
      'Tiredness',
      'Hunger'
    ]
  },
  smell: {
    label: 'Smell',
    desc: 'Summon a scent in the mind alone, with nothing before you, and let it bloom fully.',
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
    desc: 'Bring a taste alive on the tongue with nothing in your mouth and hold every note of it.',
    cues: [
      'Honey',
      'Ripe lemon',
      'Dark chocolate',
      'Fresh mint',
      'Sea salt',
      'Summer strawberry',
      'Strong black tea',
      'Fresh ginger'
    ]
  }
};

function escapeSenseText(value) {
  return String(value || '').replace(/[&<>"']/g, function(ch) {
    return ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[ch];
  });
}

function normalizeCustomSense(value) {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, 48);
}

function sanitizeCustomSenses(value) {
  if (!Array.isArray(value)) return [];
  var seen = {};
  return value.reduce(function(out, item) {
    if (!item || !SENSE_MODE_DEFS[item.mode]) return out;
    var label = normalizeCustomSense(item.label);
    var duplicateKey = item.mode + ':' + label.toLowerCase();
    if (!label || seen[duplicateKey] || out.length >= SENSE_CUSTOM_LIMIT) return out;
    seen[duplicateKey] = true;
    out.push({
      id: String(item.id || ('sense_' + out.length)).replace(/[^a-zA-Z0-9_.-]/g, '').slice(0, 80) || ('sense_' + out.length),
      mode: item.mode,
      label: label
    });
    return out;
  }, []);
}

function loadCustomSenses() {
  try {
    return sanitizeCustomSenses(JSON.parse(localStorage.getItem(SENSE_CUSTOM_KEY) || '[]'));
  } catch (e) {
    return [];
  }
}

function saveCustomSenses(senses) {
  var clean = sanitizeCustomSenses(senses);
  localStorage.setItem(SENSE_CUSTOM_KEY, JSON.stringify(clean));
  return clean;
}

function senseChoicesForMode(mode) {
  var builtIns = (SENSE_MODE_DEFS[mode] || SENSE_MODE_DEFS.feeling).cues.map(function(label) {
    return { label: label, custom: false };
  });
  var custom = loadCustomSenses().filter(function(item) {
    return item.mode === mode;
  }).map(function(item) {
    return { label: item.label, custom: true, id: item.id };
  });
  return builtIns.concat(custom);
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

function snMasteryHtml(title, sub) {
  return '<div class="sn-mastery"><div class="sn-mastery__title">' + title + '</div>'
    + '<div class="sn-mastery__sub">' + sub + '</div></div>';
}

function snRecordHtml(best, label) {
  var html = '<div class="sn-record"><div class="sn-record-label">' + (label || 'Your Record') + '</div>';
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
    + '<div class="sn-track"><div class="sn-track-fill" style="width:' + fill.toFixed(1) + '%;"></div>' + markHtml + '</div>'
    + '<div class="sn-track-foot"><span style="left:0; transform:none;">0</span>' + labelHtml
    + '<span style="right:0; left:auto; transform:none;">' + goalLabel + '</span></div></div>';
}

function normalizeSenseEyesMode(mode) {
  return mode === 'open' ? 'open' : 'closed';
}

function senseEyesLabel(mode) {
  return normalizeSenseEyesMode(mode) === 'open' ? 'Open Eyes' : 'Closed Eyes';
}

function senseMasteryTier(seconds) {
  var cleanSeconds = Math.max(0, Number(seconds) || 0);
  if (cleanSeconds >= SENSE_MASTERY_THRESHOLDS[2]) return 3;
  if (cleanSeconds >= SENSE_MASTERY_THRESHOLDS[1]) return 2;
  if (cleanSeconds >= SENSE_MASTERY_THRESHOLDS[0]) return 1;
  return 0;
}

function senseRepHistory(session) {
  if (Array.isArray(session.senseReps) && session.senseReps.length) return session.senseReps;
  return [{
    seconds: session.cleanSeconds != null ? session.cleanSeconds : session.seconds,
    mode: session.mode,
    eyesMode: session.eyesMode,
    halts: session.halts
  }];
}

// Mastery is based only on full, halt-free reps. Closed and open eyes keep
// separate records so the advanced successor never overwrites its foundation.
function getSenseBest(mode, eyesMode) {
  var targetEyes = normalizeSenseEyesMode(eyesMode);
  return (concState.history || []).reduce(function(best, session) {
    if (!session || session.exercise !== 'sense') return best;
    return senseRepHistory(session).reduce(function(repBest, rep) {
      var repMode = rep.mode || session.mode || 'feeling';
      var repEyes = normalizeSenseEyesMode(rep.eyesMode || session.eyesMode);
      var halts = Math.max(0, Number(rep.halts) || 0);
      var seconds = Math.max(0, Number(rep.seconds) || 0);
      return repMode === mode && repEyes === targetEyes && halts === 0 && seconds > repBest ? seconds : repBest;
    }, best);
  }, 0);
}

function senseMasteryProgressHtml(best, eyesMode) {
  var tier = senseMasteryTier(best);
  var modeLabel = senseEyesLabel(eyesMode);
  var nodes = [
    { tier: 1, label: 'Mastery I', time: '5:00' },
    { tier: 2, label: 'Mastery II', time: '7:30' },
    { tier: 3, label: 'Final', time: '10:00' }
  ].map(function(item) {
    return '<div class="sense-mastery-node' + (tier >= item.tier ? ' reached' : '') + '">'
      + '<span class="sense-mastery-dot">' + (tier >= item.tier ? '✦' : item.tier) + '</span>'
      + '<strong>' + item.label + '</strong><small>' + item.time + '</small></div>';
  }).join('');
  var title = tier === 3 ? modeLabel + ' fully mastered' : modeLabel + ' mastery';
  var sub = tier === 3
    ? 'A clean ten-minute rep with no halts'
    : 'Only uninterrupted reps with no halts advance mastery';
  return '<div class="sense-mastery-card"><div class="sense-mastery-head"><span>' + title + '</span>'
    + '<small>' + (tier ? tier + ' / 3' : 'not yet earned') + '</small></div>'
    + '<div class="sense-mastery-line">' + nodes + '</div>'
    + '<div class="sense-mastery-note">' + sub + '</div></div>';
}

var SENSE_MODE_ACCENTS = {
  feeling: '--sn-card-rgb:207,143,176; --sn-card-light:#e0a8c4;',
  smell:   '--sn-card-rgb:150,200,150; --sn-card-light:#a8d88e;',
  taste:   '--sn-card-rgb:232,200,122; --sn-card-light:#e8c87a;'
};

// The cue this mode should open on: its remembered pick when that is still a
// real choice, otherwise the first one.
function senseCueForMode(mode) {
  var choices = senseChoicesForMode(mode);
  if (!choices.length) return '';
  var remembered = senseSelectedByMode[mode];
  return choices.some(function(choice) { return choice.label === remembered; })
    ? remembered
    : choices[0].label;
}

function senseChoiceGridHTML() {
  return senseChoicesForMode(senseMode).map(function(choice, index) {
    return '<button type="button" class="sense-choice' + (choice.label === senseSelectedCue ? ' on' : '') + '" onclick="chooseSenseCue(' + index + ')">'
      + '<span>' + escapeSenseText(choice.label) + '</span>'
      + (choice.custom ? '<small>custom</small>' : '')
      + '</button>';
  }).join('');
}

function senseProgressHTML() {
  var best = getSenseBest(senseMode, senseEyesMode);
  return snRecordHtml(best, senseEyesLabel(senseEyesMode) + ' Record')
    + senseMasteryProgressHtml(best, senseEyesMode);
}

function senseEyesOptionsHTML() {
  return '<button type="button" class="sense-eyes-option' + (senseEyesMode === 'closed' ? ' on' : '') + '" onclick="setSenseEyesMode(\'closed\')">'
    + '<span class="sense-eye-icon">◉</span><span><strong>Closed Eyes</strong><small>Foundation · default</small></span></button>'
    + '<button type="button" class="sense-eyes-option sense-eyes-option--advanced' + (senseEyesMode === 'open' ? ' on' : '') + '" onclick="setSenseEyesMode(\'open\')">'
    + '<span class="sense-eye-icon">◎</span><span><strong>Open Eyes</strong><small>Advanced</small></span></button>';
}

function buildSenseSetupHTML() {
  var tabs = ['feeling', 'smell', 'taste'].map(function(mode) {
    return '<button type="button" class="sn-mode' + (mode === senseMode ? ' on' : '') + '" style="' + SENSE_MODE_ACCENTS[mode] + '" onclick="switchSenseMode(\'' + mode + '\')">'
      + SENSE_MODE_GLYPHS[mode]
      + '<span class="sn-mode__lbl">' + SENSE_MODE_DEFS[mode].label + '</span></button>';
  }).join('');
  senseSelectedCue = senseCueForMode(senseMode);
  senseSelectedByMode[senseMode] = senseSelectedCue;
  var eyesHtml = '<div class="sense-eyes-picker">'
    + '<div class="sense-choice-label">Practice mode</div>'
    + '<div class="sense-eyes-options" id="senseEyesRow">' + senseEyesOptionsHTML()
    + '</div></div>';

  // The hero head carries a looping spin/shine animation. Only the regions that
  // actually change on a tap get their own ids below, so switching mode or cue
  // can repaint those alone instead of re-running this whole string through
  // innerHTML — which rebuilt the SVG and visibly restarted its animation.
  return '<div class="sn-setup">'
    + '<div class="sn-hero-card">'
    + '<div class="sn-head"><div class="sn-head__label">Train a sense</div>'
    + '<button type="button" class="aud-omnia-peek" onclick="openExExplainer(\'sense\')" aria-label="How Senses works">'
    + '<span class="clk-omnia-peek-head"><span class="clk-omnia-spin">' + omniaHeadOnlySVG(34, 32) + '</span></span></button></div>'
    + '<div class="sn-modes" id="senseModeRow">' + tabs + '</div>'
    + eyesHtml
    + '<div class="sense-choice-label">Choose a sensation</div>'
    + '<div class="sense-choice-grid" id="senseChoiceGrid">' + senseChoiceGridHTML() + '</div>'
    + '</div>'
    + '<div id="senseProgressWrap">' + senseProgressHTML() + '</div>'
    + '<button type="button" class="clk-history-link" onclick="concHistoryFrom=\'exSetupScreen\'; concHistoryFilter=\'all\'; renderConcHistory(); showScreen(\'concHistoryScreen\');">View History</button>'
    + '</div>';
}

// Fall back to a full rebuild whenever the targeted containers aren't mounted
// (first paint, or a caller rendering the setup from scratch).
function rebuildSenseSetup() {
  var contentEl = document.getElementById('exSetupContent');
  if (contentEl) contentEl.innerHTML = buildSenseSetupHTML();
}

// Closed and open eyes keep separate records, so only the record/mastery block
// and the toggle itself change here.
function setSenseEyesMode(mode) {
  senseEyesMode = normalizeSenseEyesMode(mode);
  var eyesRow = document.getElementById('senseEyesRow');
  var progress = document.getElementById('senseProgressWrap');
  if (!eyesRow || !progress) { rebuildSenseSetup(); return; }
  eyesRow.innerHTML = senseEyesOptionsHTML();
  progress.innerHTML = senseProgressHTML();
}

function switchSenseMode(mode) {
  if (!SENSE_MODE_DEFS[mode]) return;
  senseMode = mode;
  senseSelectedCue = senseCueForMode(mode);
  senseSelectedByMode[mode] = senseSelectedCue;
  var modeRow = document.getElementById('senseModeRow');
  var grid = document.getElementById('senseChoiceGrid');
  var progress = document.getElementById('senseProgressWrap');
  if (!modeRow || !grid || !progress) { rebuildSenseSetup(); return; }
  ['feeling', 'smell', 'taste'].forEach(function(id, index) {
    var btn = modeRow.children[index];
    if (btn) btn.classList.toggle('on', id === mode);
  });
  grid.innerHTML = senseChoiceGridHTML();
  progress.innerHTML = senseProgressHTML();
}

function chooseSenseCue(index) {
  var choices = senseChoicesForMode(senseMode);
  if (!choices[index]) return;
  senseSelectedCue = choices[index].label;
  senseSelectedByMode[senseMode] = senseSelectedCue;
  var grid = document.getElementById('senseChoiceGrid');
  if (!grid) { rebuildSenseSetup(); return; }
  // A pick only moves the highlight — no markup needs regenerating.
  for (var i = 0; i < grid.children.length; i++) {
    grid.children[i].classList.toggle('on', i === index);
  }
}

var senseSessionStartTime = null;
var senseRepStartTime = null;
var senseTimerHandle = null;
var senseReps = [];
var senseHalts = 0;
var senseRepActive = false;
var senseActiveCue = '';
var senseActiveMode = 'feeling';
var senseActiveEyesMode = 'closed';

function fmtSenseTime(sec) {
  var value = Math.max(0, Number(sec) || 0);
  var minutes = Math.floor(value / 60);
  var seconds = value % 60;
  return minutes + ':' + (seconds < 10 ? '0' : '') + seconds;
}

function senseBeginLabel(repNumber) {
  return senseActiveEyesMode === 'open'
    ? 'Begin Open-Eyes Rep ' + repNumber
    : 'Close Eyes · Begin Rep ' + repNumber;
}

function updateSenseSessionPresentation(active) {
  var screen = document.getElementById('senseSessionScreen');
  var eyesEl = document.getElementById('senseEyesBadge');
  var instructionEl = document.getElementById('senseInstruction');
  var stateEl = document.getElementById('senseStateLabel');
  if (screen) {
    screen.dataset.senseMode = senseActiveMode;
    screen.dataset.eyesMode = senseActiveEyesMode;
  }
  if (eyesEl) eyesEl.textContent = senseEyesLabel(senseActiveEyesMode);
  if (instructionEl) {
    instructionEl.textContent = senseActiveEyesMode === 'open'
      ? 'Keep a soft gaze. Hold the imagined sensation against the visible world.'
      : 'Close your eyes. Build the sensation from memory and keep it vivid.';
  }
  if (stateEl) {
    stateEl.textContent = active
      ? (senseActiveEyesMode === 'open' ? 'eyes open · summon it · hold it' : 'eyes closed · summon it · hold it')
      : (senseActiveEyesMode === 'open' ? 'soft gaze · ready when you are' : 'close your eyes when ready');
  }
}

function startSenseSession() {
  var choices = senseChoicesForMode(senseMode);
  if (!choices.length) return;
  if (!choices.some(function(choice) { return choice.label === senseSelectedCue; })) {
    senseSelectedCue = choices[0].label;
  }
  senseActiveMode = senseMode;
  senseActiveCue = senseSelectedCue;
  senseActiveEyesMode = normalizeSenseEyesMode(senseEyesMode);
  senseSessionStartTime = null;
  senseRepStartTime = null;
  senseReps = [];
  senseHalts = 0;
  senseRepActive = false;
  var titleEl = document.getElementById('senseSessionTitle');
  var cueEl = document.getElementById('senseSessionCue');
  var stateEl = document.getElementById('senseStateLabel');
  var flashEl = document.getElementById('senseRepFlash');
  var fadedBtn = document.getElementById('senseFadedBtn');
  var switchBtn = document.getElementById('senseSwitchBtn');
  var beginBtn = document.getElementById('senseBeginRepBtn');
  var countEl = document.getElementById('senseRepCount');
  var haltCountEl = document.getElementById('senseHaltCount');
  var sessionTimerEl = document.getElementById('senseSessionTimer');
  var repTimerEl = document.getElementById('senseRepTimer');
  if (titleEl) titleEl.textContent = SENSE_MODE_DEFS[senseActiveMode].label.toLowerCase();
  if (cueEl) cueEl.textContent = senseActiveCue;
  updateSenseSessionPresentation(false);
  if (flashEl) flashEl.style.display = 'none';
  if (fadedBtn) fadedBtn.style.display = 'none';
  if (switchBtn) switchBtn.style.display = '';
  if (beginBtn) {
    beginBtn.textContent = senseBeginLabel(1);
    beginBtn.style.display = '';
  }
  if (countEl) countEl.textContent = 'rep 1 · ready';
  if (haltCountEl) haltCountEl.textContent = '';
  if (sessionTimerEl) sessionTimerEl.textContent = '0:00';
  if (repTimerEl) repTimerEl.textContent = '0:00';
  showScreen('senseSessionScreen');
}

function startSenseRep() {
  if (senseRepActive) return;
  if (!senseSessionStartTime) {
    senseSessionStartTime = Date.now();
    requestExerciseWakeLock();
    tickSenseTimers();
    senseTimerHandle = setInterval(tickSenseTimers, 250);
  }
  senseHalts = 0;
  senseRepActive = true;
  senseRepStartTime = Date.now();
  var titleEl = document.getElementById('senseSessionTitle');
  var cueEl = document.getElementById('senseSessionCue');
  var stateEl = document.getElementById('senseStateLabel');
  var flashEl = document.getElementById('senseRepFlash');
  var fadedBtn = document.getElementById('senseFadedBtn');
  var switchBtn = document.getElementById('senseSwitchBtn');
  var beginBtn = document.getElementById('senseBeginRepBtn');
  var countEl = document.getElementById('senseHaltCount');
  if (titleEl) titleEl.textContent = SENSE_MODE_DEFS[senseActiveMode].label.toLowerCase();
  if (cueEl) cueEl.textContent = senseActiveCue;
  updateSenseSessionPresentation(true);
  if (flashEl) flashEl.style.display = 'none';
  if (fadedBtn) fadedBtn.style.display = '';
  if (switchBtn) switchBtn.style.display = 'none';
  if (beginBtn) beginBtn.style.display = 'none';
  if (countEl) countEl.textContent = '';
  updateSenseRepCount();
}

function tickSenseTimers() {
  var now = Date.now();
  var sessionSeconds = senseSessionStartTime ? Math.floor((now - senseSessionStartTime) / 1000) : 0;
  var repSeconds = senseRepActive && senseRepStartTime ? Math.floor((now - senseRepStartTime) / 1000) : 0;
  var sessionEl = document.getElementById('senseSessionTimer');
  var repEl = document.getElementById('senseRepTimer');
  if (sessionEl) sessionEl.textContent = fmtSenseTime(sessionSeconds);
  if (repEl) repEl.textContent = senseRepActive ? fmtSenseTime(repSeconds) : '—';
}

function updateSenseRepCount() {
  var el = document.getElementById('senseRepCount');
  if (!el) return;
  el.textContent = senseRepActive
    ? (senseReps.length ? 'rep ' + (senseReps.length + 1) + '  ·  ' + senseReps.length + ' completed' : 'rep 1')
    : '';
}

function recordSenseHalt() {
  if (!senseRepActive) return;
  senseHalts++;
  var flash = document.getElementById('senseHaltFlash');
  var countEl = document.getElementById('senseHaltCount');
  if (flash) {
    flash.classList.remove('show');
    void flash.offsetWidth;
    flash.classList.add('show');
  }
  if (countEl) countEl.textContent = senseHalts + ' halt' + (senseHalts === 1 ? '' : 's') + ' this rep';
}

function sensationFaded() {
  if (!senseRepActive) return;
  senseRepActive = false;
  var seconds = Math.max(0, Math.floor((Date.now() - senseRepStartTime) / 1000));
  senseReps.push({
    seconds: seconds,
    cue: senseActiveCue,
    mode: senseActiveMode,
    eyesMode: senseActiveEyesMode,
    halts: senseHalts
  });
  var flashEl = document.getElementById('senseRepFlash');
  var timeEl = document.getElementById('senseRepTime');
  var stateEl = document.getElementById('senseStateLabel');
  var fadedBtn = document.getElementById('senseFadedBtn');
  var switchBtn = document.getElementById('senseSwitchBtn');
  var beginBtn = document.getElementById('senseBeginRepBtn');
  if (flashEl) flashEl.style.display = 'block';
  if (timeEl) timeEl.textContent = seconds;
  if (stateEl) stateEl.textContent = '';
  if (fadedBtn) fadedBtn.style.display = 'none';
  if (switchBtn) switchBtn.style.display = '';
  if (beginBtn) {
    beginBtn.textContent = senseBeginLabel(senseReps.length + 1);
    beginBtn.style.display = '';
  }
  updateSenseRepCount();
}

function switchSenseCueBetweenReps() {
  if (senseRepActive) return;
  var choices = senseChoicesForMode(senseActiveMode);
  if (!choices.length) return;
  var currentIndex = choices.findIndex(function(choice) { return choice.label === senseActiveCue; });
  var nextIndex = currentIndex < 0 ? 0 : (currentIndex + 1) % choices.length;
  senseActiveCue = choices[nextIndex].label;
  senseSelectedCue = senseActiveCue;
  senseSelectedByMode[senseActiveMode] = senseActiveCue;
  var cueEl = document.getElementById('senseSessionCue');
  var stateEl = document.getElementById('senseStateLabel');
  if (cueEl) cueEl.textContent = senseActiveCue;
  updateSenseSessionPresentation(false);
}

function endSenseSession() {
  clearInterval(senseTimerHandle);
  senseTimerHandle = null;
  if (senseRepActive && senseRepStartTime) {
    var seconds = Math.floor((Date.now() - senseRepStartTime) / 1000);
    if (seconds > 2) {
      senseReps.push({
        seconds: seconds,
        cue: senseActiveCue,
        mode: senseActiveMode,
        eyesMode: senseActiveEyesMode,
        halts: senseHalts
      });
    }
  }
  senseRepActive = false;
  releaseExerciseWakeLock();
  showSenseSessionResult();
}

function showSenseSessionResult() {
  var totalSec = senseSessionStartTime ? Math.floor((Date.now() - senseSessionStartTime) / 1000) : 0;
  var bestRep = senseReps.reduce(function(best, rep) {
    return rep.seconds > best.seconds ? rep : best;
  }, { seconds: 0 });
  var sub = document.getElementById('senseResultSub');
  var notes = document.getElementById('senseNotes');
  var wrap = document.getElementById('senseRepsWrap');
  if (sub) sub.textContent = senseEyesLabel(senseActiveEyesMode) + ' · ' + senseReps.length + ' rep' + (senseReps.length === 1 ? '' : 's') + ' · session ' + fmtSenseTime(totalSec);
  if (notes) notes.value = '';
  if (wrap) {
    wrap.innerHTML = senseReps.map(function(rep, index) {
      var isBest = rep === bestRep;
      var halts = rep.halts ? rep.halts + ' halt' + (rep.halts === 1 ? '' : 's') : 'unbroken';
      return '<div class="sense-result-rep">'
        + '<div><div class="sense-result-rep__title">Rep ' + (index + 1) + ' · ' + escapeSenseText(rep.cue) + ' · ' + senseEyesLabel(rep.eyesMode) + '</div>'
        + '<div class="sense-result-rep__halts">' + halts + '</div></div>'
        + '<div class="sense-result-rep__time">' + (isBest ? '<small>best</small>' : '') + fmtSenseTime(rep.seconds) + '</div>'
        + '</div>';
    }).join('');
  }
  showScreen('senseResultScreen');
}

function saveSenseSessionResult() {
  var notesEl = document.getElementById('senseNotes');
  var notes = notesEl ? notesEl.value.trim() : '';
  var totalXP = senseReps.reduce(function(total, rep) { return total + rep.seconds; }, 0);
  var bestSec = senseReps.reduce(function(best, rep) { return Math.max(best, rep.seconds); }, 0);
  var bestCleanSec = senseReps.reduce(function(best, rep) { return rep.halts === 0 ? Math.max(best, rep.seconds) : best; }, 0);
  var totalHalts = senseReps.reduce(function(total, rep) { return total + rep.halts; }, 0);
  var wallSec = senseSessionStartTime ? Math.floor((Date.now() - senseSessionStartTime) / 1000) : 0;
  concState.xp += totalXP;
  if (isConcNewSession()) concState.totalSessions++;
  var didLevelUp = awardLevelUps(concState, concSumXpToLevel, concXpForLevel);
  var akashaDelta = recordExerciseCompletion({
    entry: {
      date: new Date().toISOString(),
      exercise: 'sense',
      type: 'sense',
      mode: senseActiveMode,
      eyesMode: senseActiveEyesMode,
      cue: senseReps.length ? senseReps[0].cue : senseActiveCue,
      seconds: bestSec,
      cleanSeconds: bestCleanSec,
      masteryTier: senseMasteryTier(bestCleanSec),
      xpEarned: totalXP,
      reps: senseReps.length,
      halts: totalHalts,
      senseReps: senseReps.map(function(rep) {
        return { seconds: rep.seconds, cue: rep.cue, mode: rep.mode, eyesMode: rep.eyesMode, halts: rep.halts };
      }),
      notes: notes
    },
    exId: 'sense',
    omniaSeconds: totalXP,
    reachedRec: omniaReachedRecommendation('sense', wallSec)
  });
  var originMode = currentMode;
  showSessionComplete({
    title: 'Senses held.',
    sub: senseEyesLabel(senseActiveEyesMode) + ' · ' + senseReps.length + ' rep' + (senseReps.length === 1 ? '' : 's'),
    xp: totalXP,
    akashaDelta: akashaDelta,
    stat3: { label: 'Session', color: 'blue', value: fmtSenseTime(wallSec) },
    onDone: function() {
      renderConcHome();
      showScreen('homeScreen');
      returnAfterExercise(originMode);
      if (didLevelUp) {
        setTimeout(function() {
          showLevelUp(concState.level, getConcRank(concState.level), 'concentration');
        }, 800);
      }
    }
  });
}

function renderCustomSenseList() {
  var wrap = document.getElementById('customSenseList');
  if (!wrap) return;
  var senses = loadCustomSenses();
  if (!senses.length) {
    wrap.innerHTML = '<div class="sense-custom-empty">No custom senses yet.</div>';
    return;
  }
  wrap.innerHTML = senses.map(function(item) {
    return '<div class="sense-custom-row">'
      + '<div><span>' + escapeSenseText(item.label) + '</span><small>' + escapeSenseText(SENSE_MODE_DEFS[item.mode].label) + '</small></div>'
      + '<button type="button" onclick="deleteCustomSense(\'' + item.id + '\')" aria-label="Delete ' + escapeSenseText(item.label) + '">×</button>'
      + '</div>';
  }).join('');
}

function addCustomSense() {
  var input = document.getElementById('customSenseInput');
  var modeEl = document.getElementById('customSenseMode');
  if (!input || !modeEl) return;
  var label = normalizeCustomSense(input.value);
  var mode = modeEl.value;
  if (!label || !SENSE_MODE_DEFS[mode]) {
    showToast('Enter a sense to add.');
    return;
  }
  var senses = loadCustomSenses();
  var allLabels = SENSE_MODE_DEFS[mode].cues.map(function(cue) { return cue.toLowerCase(); })
    .concat(senses.filter(function(item) { return item.mode === mode; }).map(function(item) { return item.label.toLowerCase(); }));
  if (allLabels.indexOf(label.toLowerCase()) !== -1) {
    showToast('That sense is already in ' + SENSE_MODE_DEFS[mode].label + '.');
    return;
  }
  if (senses.length >= SENSE_CUSTOM_LIMIT) {
    showToast('Custom senses are limited to ' + SENSE_CUSTOM_LIMIT + '.');
    return;
  }
  senses.push({
    id: 'sense_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8),
    mode: mode,
    label: label
  });
  saveCustomSenses(senses);
  input.value = '';
  renderCustomSenseList();
  showToast('Custom sense added');
}

function deleteCustomSense(id) {
  var senses = loadCustomSenses();
  saveCustomSenses(senses.filter(function(item) { return item.id !== id; }));
  renderCustomSenseList();
  // A deleted custom sense may have been the remembered pick for any mode, not
  // just the one on screen — re-resolve each so none points at a gone cue.
  ['feeling', 'smell', 'taste'].forEach(function(mode) {
    senseSelectedByMode[mode] = senseCueForMode(mode);
  });
  senseSelectedCue = senseSelectedByMode[senseMode];
}

(function wireSenseExperience() {
  var endBtn = document.getElementById('senseEndBtn');
  var main = document.getElementById('senseMainArea');
  var fadedBtn = document.getElementById('senseFadedBtn');
  var switchBtn = document.getElementById('senseSwitchBtn');
  var beginBtn = document.getElementById('senseBeginRepBtn');
  var saveBtn = document.getElementById('senseSaveBtn');
  var historyBtn = document.getElementById('senseViewHistoryBtn');
  var addBtn = document.getElementById('customSenseAddBtn');
  var input = document.getElementById('customSenseInput');
  if (endBtn) endBtn.addEventListener('click', function() {
    var elapsed = senseSessionStartTime ? Math.floor((Date.now() - senseSessionStartTime) / 1000) : 0;
    omniaConfirmEarlyEnd('sense', elapsed, endSenseSession);
  });
  if (main) {
    main.addEventListener('click', recordSenseHalt);
    main.addEventListener('keydown', function(event) {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        recordSenseHalt();
      }
    });
  }
  if (fadedBtn) fadedBtn.addEventListener('click', sensationFaded);
  if (switchBtn) switchBtn.addEventListener('click', switchSenseCueBetweenReps);
  if (beginBtn) beginBtn.addEventListener('click', startSenseRep);
  if (saveBtn) saveBtn.addEventListener('click', saveSenseSessionResult);
  if (historyBtn) historyBtn.addEventListener('click', function() {
    concHistoryFrom = 'home';
    concHistoryFilter = 'all';
    renderConcHistory();
    showScreen('concHistoryScreen');
  });
  if (addBtn) addBtn.addEventListener('click', addCustomSense);
  if (input) input.addEventListener('keydown', function(event) {
    if (event.key === 'Enter') {
      event.preventDefault();
      addCustomSense();
    }
  });
  renderCustomSenseList();
})();
