// Elemental Work · Step III (Bardon, "Magical Schooling of the Soul").
//
// The practitioner sits in asana at the centre of one element that fills the
// universe, and draws it in through the nose and the whole body (pore
// breathing). Each inhalation increases the element's quality — Fire's heat,
// Air's lightness, Water's cold, Earth's weight — until it is felt. The same
// number of exhalations then releases it back into the universe until not the
// smallest particle remains.
//
// The session counts like a string of beads: one tap per breath. It begins
// with seven breaths and adds one after each completed session. Ending early never leaves an
// element accumulated: it moves straight to the release, with as many
// exhalations as there were inhalations. The book says the purpose is the
// sense of feeling, so each session ends by rating how clearly the quality
// was felt, from not yet, through the soul, to the body.

var EL_START_BREATHS = 7;
var EL_NOTE_AFTER_SEC = 20 * 60;
var EL_ELEMENT_KEY = 'presence_el_element';

var EL_ELEMENTS = [
  { id: 'fire', name: 'Fire', color: '#e0603a', rgb: '224,96,58', colorName: 'red', quality: 'heat', cap: 30,
    universe: 'You sit at the centre of the Fire element. In the shape of a sphere it fills the whole universe; everything around you is fiery.',
    inhale: 'Draw the Fire in through your nose and every pore, deeply and evenly. With every breath the heat and the expanding pressure grow, until you feel fiery-hot.',
    exhale: 'Breathe normally in through the mouth; breathe the Fire out through the mouth and your whole body, back into the universe.' },
  { id: 'air', name: 'Air', color: '#6f9fe0', rgb: '111,159,224', colorName: 'blue', quality: 'lightness', cap: 40,
    universe: 'You sit at the centre of an air space that fills the whole universe. Nothing else exists for you.',
    inhale: 'Draw the Air into the empty vessel of the soul and the body, through lungs and pores. With each breath you fill like a balloon and grow lighter, until you no longer feel your body.',
    exhale: 'Breathe the Air out through the mouth and the whole body, back into the universe.' },
  { id: 'water', name: 'Water', color: '#4fb0a8', rgb: '79,176,168', colorName: 'greenish-blue', quality: 'cold', cap: 30,
    universe: 'Forget your surroundings. The whole universe is an infinite ocean, and you sit at its centre.',
    inhale: 'With each total-body breath the Water fills you and its cold spreads through your whole body, until you feel like a lump of ice.',
    exhale: 'Breathe the Water out through the mouth and the whole body, back into the ocean.' },
  { id: 'earth', name: 'Earth', color: '#c8a24a', rgb: '200,162,74', colorName: 'yellow, grey or black', quality: 'heaviness', cap: 30,
    universe: 'The whole universe is earth — not a lump of clay but a dense, heavy substance — and you sit at its centre.',
    inhale: 'Fill your body with the earth substance through total-body breathing. With each breath it grows denser, until you feel as heavy as lead, almost unable to move.',
    exhale: 'Breathe the Earth out through the mouth and the whole body, until you feel exactly as you did before.' }
];

var EL_FEELINGS = [
  { v: 1, label: 'Not yet' },
  { v: 2, label: 'Faintly, in the soul' },
  { v: 3, label: 'Clearly, in the soul' },
  { v: 4, label: 'In the body too' },
  { v: 5, label: 'Strongly in the body' }
];

function elElement(id) {
  return EL_ELEMENTS.find(function(e) { return e.id === id; }) || EL_ELEMENTS[0];
}

// ── Progress (achState.hwm: synced, monotonic) ──
function elRecords() {
  return (typeof achState !== 'undefined' && achState && achState.hwm) || {};
}
function elSessions(id, records) { return Number((records || elRecords())['el:' + id + ':sessions']) || 0; }
function elBestFeeling(id, records) { return Number((records || elRecords())['el:' + id + ':feel']) || 0; }
function elBestBreaths(id, records) { return Number((records || elRecords())['el:' + id + ':breaths']) || 0; }

// Seven breaths at first, then one more than the most ever completed, never
// past the element's cap. A session released early doesn't raise the count.
function elTargetBreaths(element, bestBreaths) {
  return Math.min(element.cap, Math.max(EL_START_BREATHS, (bestBreaths || 0) + 1));
}

// ── Landing ──
var elPick = null; // { element, breaths, eyes, color }

function elEnsurePick() {
  if (elPick) return;
  var saved = null;
  try { saved = localStorage.getItem(EL_ELEMENT_KEY); } catch (e) {}
  var element = elElement(saved || 'fire');
  elPick = { element: element.id, breaths: elTargetBreaths(element, elBestBreaths(element.id)), eyes: 'closed', color: true };
}

function elEsc(v) { return typeof escapeMediaText === 'function' ? escapeMediaText(v) : String(v || ''); }

function buildElementsSetupHTML() {
  elEnsurePick();
  var records = elRecords();
  var element = elElement(elPick.element);
  var tabs = EL_ELEMENTS.map(function(e) {
    var feel = elBestFeeling(e.id, records);
    return '<button type="button" class="el-tab' + (e.id === element.id ? ' on' : '') + '" style="--el-rgb:' + e.rgb + ';" onclick="elOnElement(\'' + e.id + '\')">'
      + '<i class="el-dot"></i>' + e.name
      + '<span>' + elSessions(e.id, records) + ' sessions' + (feel ? ' · ' + EL_FEELINGS[feel - 1].label.toLowerCase() : '') + '</span></button>';
  }).join('');
  return '<div class="el-setup" style="--el-rgb:' + element.rgb + '; --el-color:' + element.color + ';">'
    + '<div class="el-kicker">Step III · Accumulating the elements</div>'
    + '<div class="el-tabs">' + tabs + '</div>'
    + '<div class="el-orb"></div>'
    + '<div class="el-text">' + elEsc(element.universe) + '</div>'
    + '<div class="el-text">' + elEsc(element.inhale) + '</div>'
    + '<div class="el-row"><span class="el-label">Breaths</span>'
    + '<div class="el-stepper"><button type="button" onclick="elOnBreaths(-1)" aria-label="Fewer breaths">−</button>'
    + '<b id="elBreathsVal">' + elPick.breaths + '</b>'
    + '<button type="button" onclick="elOnBreaths(1)" aria-label="More breaths">+</button></div></div>'
    + '<div class="el-fine">In, then the same number out. Starts at seven and adds one each completed session; ' + element.cap + ' is plenty.</div>'
    + '<div class="el-row"><span class="el-label">Eyes</span><div class="el-seg">'
    + ['closed', 'open'].map(function(e) {
      return '<button type="button" class="' + (elPick.eyes === e ? 'on' : '') + '" onclick="elOnEyes(\'' + e + '\')">' + e + '</button>';
    }).join('') + '</div></div>'
    + '<div class="el-row"><span class="el-label">See it ' + element.colorName + '</span><div class="el-seg">'
    + '<button type="button" class="' + (elPick.color ? 'on' : '') + '" onclick="elOnColor(true)">on</button>'
    + '<button type="button" class="' + (!elPick.color ? 'on' : '') + '" onclick="elOnColor(false)">off</button>'
    + '</div></div>'
    + '<div class="el-note">Sit in your asana. Begin only once your soul mirror shows no element ruling your character: the elements are accumulated in an astral body already in balance.</div>'
    + '</div>';
}

function elRerender() {
  var contentEl = document.getElementById('exSetupContent');
  if (contentEl) contentEl.innerHTML = buildElementsSetupHTML();
}

function elOnElement(id) {
  var element = elElement(id);
  elPick.element = element.id;
  elPick.breaths = elTargetBreaths(element, elBestBreaths(element.id));
  try { localStorage.setItem(EL_ELEMENT_KEY, element.id); } catch (e) {}
  elRerender();
}

function elOnBreaths(delta) {
  var element = elElement(elPick.element);
  elPick.breaths = Math.max(1, Math.min(element.cap, elPick.breaths + delta));
  var v = document.getElementById('elBreathsVal');
  if (v) v.textContent = elPick.breaths;
}

function elOnEyes(eyes) { elPick.eyes = eyes; elRerender(); }
function elOnColor(on) { elPick.color = on; elRerender(); }

// ── Session ──
var elSession = null; // { pick, phase:'in'|'out'|'rate', inCount, outCount, startedAt, timer }

function elBegin() {
  elEnsurePick();
  elSession = { pick: Object.assign({}, elPick), phase: 'in', inCount: 0, outCount: 0, startedAt: Date.now(), timer: null };
  if (typeof requestExerciseWakeLock === 'function') requestExerciseWakeLock();
  showScreen('elHoldScreen');
  elSession.timer = setInterval(elTickClock, 1000);
  elRenderSession();
}

function elElapsed() { return elSession ? Math.floor((Date.now() - elSession.startedAt) / 1000) : 0; }

function elFmt(sec) { return Math.floor(sec / 60) + ':' + String(sec % 60).padStart(2, '0'); }

function elTickClock() {
  var c = document.getElementById('elClock');
  if (!c || !elSession) return;
  var sec = elElapsed();
  c.textContent = elFmt(sec) + (sec >= EL_NOTE_AFTER_SEC ? ' · twenty minutes is enough; release now' : '');
}

// How full of the element the practitioner is, 0..1, for the sphere.
function elFullness(s) {
  var target = s.pick.breaths;
  if (s.phase === 'in') return s.inCount / target;
  return Math.max(0, (s.inCount - s.outCount) / Math.max(1, s.inCount));
}

function elRenderSession() {
  var el = document.getElementById('elHoldScreen');
  if (!el || !elSession) return;
  var s = elSession;
  var element = elElement(s.pick.element);
  var target = s.phase === 'in' ? s.pick.breaths : s.inCount;
  var count = s.phase === 'in' ? s.inCount : s.outCount;
  var full = elFullness(s);
  var orbColor = s.pick.color ? element.rgb : '220,214,200';
  var beads = '';
  for (var i = 0; i < target; i++) beads += '<i class="' + (i < count ? 'on' : '') + '"></i>';

  if (s.phase === 'rate') {
    el.innerHTML = '<div class="el-session" style="--el-rgb:' + element.rgb + ';">'
      + '<div class="el-top"><span></span><span class="el-top-label">' + element.name + ' · released</span></div>'
      + '<div class="el-body"><div class="el-rate-title">How clearly did you feel the ' + element.quality + '?</div>'
      + '<div class="el-rate">' + EL_FEELINGS.map(function(f) {
        return '<button type="button" onclick="elFinish(' + f.v + ')">' + f.label + '</button>';
      }).join('') + '</div>'
      + '<div class="el-fine">In the beginning it is felt only in the soul. With practice it becomes physical as well.</div></div>'
      + '</div>';
    return;
  }

  el.innerHTML = '<div class="el-session" style="--el-rgb:' + element.rgb + ';">'
    + '<div class="el-top"><button class="ms3-discard" type="button" onclick="elDiscard()">&#215; Discard</button>'
    + '<span class="el-top-label">' + element.name + ' · ' + (s.phase === 'in' ? 'accumulate' : 'release') + ' · eyes ' + s.pick.eyes + '</span></div>'
    + '<div class="el-body" id="elTap">'
    + '<div class="el-sphere" style="--el-orb:' + orbColor + '; --el-full:' + full.toFixed(3) + ';"></div>'
    + '<div class="el-count">' + count + ' <span>/ ' + target + '</span></div>'
    + '<div class="el-sub">' + (s.phase === 'in' ? 'tap with each inhalation' : 'tap with each exhalation') + '</div>'
    + '<div class="el-beads">' + beads + '</div>'
    + '<div class="el-text el-text--center">' + elEsc(s.phase === 'in' ? element.inhale : element.exhale) + '</div>'
    + '<div class="el-clock" id="elClock">' + elFmt(elElapsed()) + '</div>'
    + '</div>'
    + '<div class="el-actions">'
    + (s.phase === 'in'
      ? '<button class="btn ghost conc-btn" type="button" style="font-size:0.5625rem;" onclick="elStartRelease()">' + (s.inCount ? 'Release now' : 'End') + '</button>'
      : '<div class="el-fine el-fine--center">Release every breath you took in. Nothing of the element may remain.</div>')
    + '</div></div>';
  document.getElementById('elTap').onclick = elBreath;
  elTickClock();
}

function elBreath() {
  var s = elSession;
  if (!s) return;
  if (navigator.vibrate) { try { navigator.vibrate(8); } catch (e) {} }
  if (s.phase === 'in') {
    s.inCount++;
    if (s.inCount >= s.pick.breaths) s.phase = 'out';
  } else if (s.phase === 'out') {
    s.outCount++;
    if (s.outCount >= s.inCount) s.phase = 'rate';
  }
  elRenderSession();
}

// Ending early still releases: as many exhalations as inhalations taken.
function elStartRelease() {
  var s = elSession;
  if (!s) return;
  if (!s.inCount) { elLeave(); showScreen('exSetupScreen'); elRerender(); return; }
  s.phase = 'out';
  elRenderSession();
}

function elLeave() {
  // Empty the session screen so it never shows through the result overlay.
  var _scr = document.getElementById('elHoldScreen');
  if (_scr) _scr.innerHTML = '';
  if (elSession) clearInterval(elSession.timer);
  elSession = null;
  if (typeof releaseExerciseWakeLock === 'function') releaseExerciseWakeLock();
}

// Discarding during accumulation would leave the element held, so it asks
// for the release first.
function elDiscard() {
  var s = elSession;
  if (s && s.phase === 'in' && s.inCount) {
    if (typeof showToast === 'function') showToast('Release the ' + elElement(s.pick.element).name + ' first', 2400);
    elStartRelease();
    return;
  }
  var go = function() { elLeave(); showScreen('exSetupScreen'); elRerender(); };
  if (s && s.outCount && typeof showConfirm === 'function') showConfirm('Discard Session', 'No data will be saved.', go);
  else go();
}

// Pure: the history entry for a finished session.
function elEntry(pick, inCount, feeling, durationSec, now) {
  return {
    date: (now || new Date()).toISOString(),
    type: 'elements',
    element: pick.element,
    breaths: inCount,
    feeling: feeling,
    eyesMode: pick.eyes,
    seconds: durationSec,
    durationSec: durationSec,
    object: elElement(pick.element).name + ' · ' + inCount + ' breaths',
    xpEarned: durationSec
  };
}

function elFinish(feeling) {
  var s = elSession;
  if (!s) return;
  var pick = s.pick;
  var inCount = s.inCount;
  var durationSec = elElapsed();
  elLeave();

  var entry = elEntry(pick, inCount, feeling, durationSec);
  var element = elElement(pick.element);
  var prevFeel = elBestFeeling(element.id);
  if (typeof achState !== 'undefined' && achState && achState.hwm) {
    var k = 'el:' + element.id + ':sessions';
    achState.hwm[k] = (achState.hwm[k] || 0) + 1;
    achState.hwm['el:' + element.id + ':feel'] = Math.max(prevFeel, feeling);
    achState.hwm['el:' + element.id + ':breaths'] = Math.max(elBestBreaths(element.id), inCount);
    if (typeof achSave === 'function') achSave();
  }
  concState.xp += entry.xpEarned;
  if (isConcNewSession()) concState.totalSessions++;
  var leveled = awardLevelUps(concState, concSumXpToLevel, concXpForLevel);
  // Akasha like every exercise (capped at 15 minutes inside the reward), and
  // from Prestige 3 the advanced-drill Dark Matter on top.
  var akasha = recordExerciseCompletion({ entry: entry, exId: 'elements', omniaSeconds: durationSec, reachedRec: inCount >= pick.breaths });
  var dm = typeof mintDarkMatterFromPractice === 'function' ? mintDarkMatterFromPractice(DARK_MATTER_PER_ADVANCED) : 0;
  if (leveled && typeof completionFlowQueueLevelUp === 'function') completionFlowQueueLevelUp(concState.level, 'concentration');
  elPick = null; // next time: one more breath

  var next = elTargetBreaths(element, elBestBreaths(element.id));
  var deeper = feeling > prevFeel && prevFeel > 0;
  showSessionComplete({
    title: deeper ? 'The ' + element.quality + ' deepens.' : element.name + ' released.',
    sub: inCount + ' breaths in, ' + inCount + ' out · eyes ' + pick.eyes,
    xp: entry.xpEarned,
    akashaDelta: akasha,
    stat3: dm ? { label: 'Dark Matter', color: 'blue', value: '+' + dm }
      : { label: 'Breaths', color: 'blue', value: inCount },
    omniaMsg: 'Felt: ' + EL_FEELINGS[feeling - 1].label.toLowerCase() + '. Next ' + element.name + ' session: ' + next + ' breaths.',
    onDone: function() {
      if (typeof renderConcHome === 'function') renderConcHome();
      showScreen('homeScreen');
      if (typeof returnAfterExercise === 'function') returnAfterExercise('concentration');
      else switchMode('concentration');
    }
  });
}
