'use strict';

// Pore Breathing session state, audio, rewards, and controls. This client loads
// after the core runtime so its shared Concentration, Guide, and completion APIs
// are all available without duplicating their persistence rules.
var poreBreathTotal = 7;
var poreBreathCurrent = 0;
var poreBreathPhase = null;
var poreBreathPhaseTimer = null;
var poreBreathAudioCtx = null;
var PHASES_PORE = ['inhale', 'hold_in', 'exhale', 'hold_out'];
var PHASE_DUR_PORE = 4000;
var poreBreathStartTime = null;

// ── Start buffer (Settings → Soul Mirror → Pore Breathing) — mirrors the
// Thought Control / Asana buffer pattern, stored on the shared concState. ──
var PORE_START_BUFFER_DEFAULT = 3;
var PORE_START_BUFFER_OPTIONS = [0,1,2,3,5,7,10];
var _poreCountInterval = null;  // the pre-session countdown tick, so discard can cancel it
var _poreCountBeginTimer = null;  // the 900ms pause after "1" before the session actually begins
function getPoreStartBuffer() {
  var raw = Number(typeof concState !== 'undefined' && concState && concState.poreStartBuffer);
  if (!Number.isFinite(raw) || PORE_START_BUFFER_OPTIONS.indexOf(raw) === -1) return PORE_START_BUFFER_DEFAULT;
  return raw;
}
function setPoreStartBuffer(val) {
  var next = Number(val);
  if (PORE_START_BUFFER_OPTIONS.indexOf(next) === -1) next = PORE_START_BUFFER_DEFAULT;
  concState.poreStartBuffer = next;
  saveConcState();
}
function syncPoreBufferSelect() {
  var sel = document.getElementById('poreBufferSelect');
  if (sel) sel.value = String(getPoreStartBuffer());
}
function _wirePoreBufferSelect() {
  var sel = document.getElementById('poreBufferSelect');
  if (!sel) return;
  syncPoreBufferSelect();
  sel.addEventListener('change', function() { setPoreStartBuffer(this.value); });
}
_wirePoreBufferSelect();

document.getElementById('poreBreathSlider').addEventListener('input', function() {
  poreBreathTotal = parseInt(this.value, 10);
  document.getElementById('poreBreathCountDisplay').textContent = poreBreathTotal;
});

function getPoreAudioCtx() {
  if (!poreBreathAudioCtx || poreBreathAudioCtx.state === 'closed') {
    poreBreathAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (poreBreathAudioCtx.state === 'suspended') poreBreathAudioCtx.resume();
  return poreBreathAudioCtx;
}

function playPoreSound(type) {
  try {
    var ctx = getPoreAudioCtx();
    var osc = ctx.createOscillator();
    var gain = ctx.createGain();
    var filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 800;
    osc.connect(filter); filter.connect(gain); gain.connect(ctx.destination);
    var now = ctx.currentTime;
    var dur = 3.6;
    if (type === 'inhale') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(180, now); osc.frequency.linearRampToValueAtTime(320, now + dur * .7); osc.frequency.linearRampToValueAtTime(280, now + dur);
      gain.gain.setValueAtTime(0, now); gain.gain.linearRampToValueAtTime(.08, now + .3); gain.gain.linearRampToValueAtTime(.06, now + dur - .4); gain.gain.linearRampToValueAtTime(0, now + dur);
    } else {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(300, now); osc.frequency.linearRampToValueAtTime(160, now + dur * .8); osc.frequency.linearRampToValueAtTime(140, now + dur);
      gain.gain.setValueAtTime(0, now); gain.gain.linearRampToValueAtTime(.06, now + .2); gain.gain.linearRampToValueAtTime(.04, now + dur - .4); gain.gain.linearRampToValueAtTime(0, now + dur);
    }
    osc.start(now); osc.stop(now + dur);
  } catch (e) {}
}

function setPoreOrbPhase(phase) {
  var orb = document.getElementById('poreBreathOrb');
  var ringMid = document.getElementById('poreBreathRingMid');
  var ringOuter = document.getElementById('poreBreathRingOuter');
  var phaseLabel = document.getElementById('poreBreathPhaseLabel');
  var labels = { inhale: 'inhale', hold_in: 'hold', exhale: 'exhale', hold_out: 'hold' };
  if (phaseLabel) phaseLabel.textContent = labels[phase] || phase;
  if (!orb) return;
  // The glow is a separate layer faded by opacity rather than a box-shadow
  // blur animated on the orb: same swell, none of the per-frame rasterisation.
  var glow = document.getElementById('poreBreathGlow');
  if (phase === 'inhale') {
    orb.style.transform = 'scale(1.55)';
    if (glow) { glow.style.opacity = '.7'; glow.style.transform = 'scale(3.4)'; }
    if (ringMid) ringMid.style.transform = 'scale(1.18)';
    if (ringOuter) { ringOuter.style.transform = 'scale(1.08)'; ringOuter.style.opacity = '.6'; }
  } else if (phase === 'hold_in') {
    orb.style.transform = 'scale(1.55)';
    if (glow) { glow.style.opacity = '.85'; glow.style.transform = 'scale(3.6)'; }
    if (ringOuter) ringOuter.style.opacity = '.8';
  } else if (phase === 'exhale') {
    orb.style.transform = 'scale(.75)';
    if (glow) { glow.style.opacity = '.16'; glow.style.transform = 'scale(1.8)'; }
    if (ringMid) ringMid.style.transform = 'scale(.88)';
    if (ringOuter) { ringOuter.style.transform = 'scale(.94)'; ringOuter.style.opacity = '.2'; }
  } else {
    orb.style.transform = 'scale(.75)';
    if (glow) { glow.style.opacity = '.1'; glow.style.transform = 'scale(1.6)'; }
    if (ringOuter) ringOuter.style.opacity = '.15';
  }
}

function startPoreBreath() {
  poreBreathTotal = parseInt(document.getElementById('poreBreathSlider').value, 10);
  poreBreathCurrent = 1;
  document.getElementById('poreBreathSetup').style.display = 'none';
  document.getElementById('poreBreathOverlay').style.display = 'flex';
  document.getElementById('poreBreathCycleLabel').textContent = 'breath 1 of ' + poreBreathTotal;
  requestExerciseWakeLock();

  // Configurable countdown before the cycle starts (Settings → Soul Mirror →
  // Pore Breathing → Start Buffer).
  var overlay = document.getElementById('poreBreathCountdownOverlay');
  var numEl = document.getElementById('poreBreathCountdownNum');
  var count = getPoreStartBuffer();

  function beginPoreSession() {
    if (overlay) overlay.style.display = 'none';
    if (numEl) numEl.style.animation = 'none';
    poreBreathStartTime = Date.now();
    runPorePhase('inhale');
  }

  if (count <= 0 || !overlay || !numEl) { beginPoreSession(); return; }
  overlay.style.display = 'flex';

  function showCountNum(n) {
    numEl.textContent = n;
    numEl.style.animation = 'none';
    void numEl.offsetWidth; // force reflow so animation restarts cleanly
    numEl.style.animation = 'tcCountPop 1s ease forwards';
  }

  showCountNum(count);
  _poreCountInterval = setInterval(function() {
    count--;
    if (count <= 0) {
      clearInterval(_poreCountInterval);
      _poreCountInterval = null;
      _poreCountBeginTimer = setTimeout(beginPoreSession, 900);
    } else {
      showCountNum(count);
    }
  }, 1000);
}

function runPorePhase(phase) {
  poreBreathPhase = phase;
  setPoreOrbPhase(phase);
  if (phase === 'inhale') playPoreSound('inhale');
  if (phase === 'exhale') playPoreSound('exhale');
  poreBreathPhaseTimer = setTimeout(function() {
    var next = PHASES_PORE[(PHASES_PORE.indexOf(phase) + 1) % PHASES_PORE.length];
    if (phase === 'hold_out') {
      poreBreathCurrent++;
      if (poreBreathCurrent > poreBreathTotal) { stopPoreBreath(true); return; }
      var cycleLabel = document.getElementById('poreBreathCycleLabel');
      if (cycleLabel) cycleLabel.textContent = 'breath ' + poreBreathCurrent + ' of ' + poreBreathTotal;
    }
    runPorePhase(next);
  }, PHASE_DUR_PORE);
}

function stopPoreBreath(completed) {
  releaseExerciseWakeLock();
  clearTimeout(poreBreathPhaseTimer); poreBreathPhaseTimer = null; poreBreathPhase = null;
  // A discard mid pre-session-countdown (Stop button, or the Soul Mirror
  // screen's own back button which also routes through here) must cancel
  // the pending interval/timer too, or the session silently begins in the
  // background after the user has already left the screen.
  clearInterval(_poreCountInterval); _poreCountInterval = null;
  clearTimeout(_poreCountBeginTimer); _poreCountBeginTimer = null;
  var pcd = document.getElementById('poreBreathCountdownOverlay');
  if (pcd) pcd.style.display = 'none';
  var orb = document.getElementById('poreBreathOrb');
  if (orb) { orb.style.transform = 'scale(1)'; }
  var glowEl = document.getElementById('poreBreathGlow');
  if (glowEl) { glowEl.style.opacity = '.18'; glowEl.style.transform = 'scale(2.2)'; }
  var ringMid = document.getElementById('poreBreathRingMid');
  var ringOuter = document.getElementById('poreBreathRingOuter');
  if (ringMid) ringMid.style.transform = 'scale(1)';
  if (ringOuter) { ringOuter.style.transform = 'scale(1)'; ringOuter.style.opacity = '1'; }
  var overlay = document.getElementById('poreBreathOverlay');
  var setup = document.getElementById('poreBreathSetup');
  if (overlay) overlay.style.display = 'none';
  if (setup) setup.style.display = 'block';

  if (!completed) return;
  var breathsDone = poreBreathCurrent - 1;
  var secondsElapsed = poreBreathStartTime ? Math.floor((Date.now() - poreBreathStartTime) / 1000) : 0;
  var xpEarned = breathsDone * 10;
  concState.xp += xpEarned;
  if (isConcNewSession()) concState.totalSessions++;
  var didLevelUp = awardLevelUps(concState, concSumXpToLevel, concXpForLevel);
  concState.lifetimeBreaths = (concState.lifetimeBreaths || 0) + breathsDone;
  if (!guideState.poreAdvanced) {
    var currentTarget = Math.max(7, guideState.poreBreaths || 7);
    if (currentTarget < 40) { guideState.poreBreaths = currentTarget + 1; saveGuideState(guideState); }
  }
  var akashaGained = Math.max(0, recordExerciseCompletion({
    entry: {
      date: new Date().toISOString(),
      exercise: 'pore_breathing',
      breaths: breathsDone,
      seconds: secondsElapsed,
      xpEarned: xpEarned
    },
    exId: 'pore_breathing',
    omniaSeconds: secondsElapsed || breathsDone * 10
  }));
  renderConcHome();
  var verse = PORE_LEGEND_VERSES[Math.floor(Math.random() * PORE_LEGEND_VERSES.length)];
  var levelUp = didLevelUp ? concState.level : null;
  showSessionComplete({
    title: 'Pore breathing complete.',
    sub: verse,
    xp: xpEarned,
    akashaDelta: akashaGained,
    stat3: { label: 'Breaths', color: 'blue', value: breathsDone },
    onDone: function() {
      if (levelUp) setTimeout(function() { showConcLevelUp(levelUp); }, 400);
    }
  });
}

var PORE_LEGEND_VERSES = [
  'Light has moved through every pore. Darkness has left by the same door.',
  'The skin forgets its edges. For a breath, the body was one organ.',
  'You drew in the living light and returned the night to the air.',
  'Vitality gathers in the vessel. Omnia stirs within the light.'
];

document.getElementById('startPoreBreathBtn').addEventListener('click', startPoreBreath);
document.getElementById('stopPoreBreathBtn').addEventListener('click', function() { stopPoreBreath(false); });
