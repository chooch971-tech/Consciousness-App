// Clock SVG generation
function buildClockSVG() {
  var svg = document.getElementById('concClock');
  if (!svg) return;
  var theme = getClockTheme();
  var html = '';
  // Face fill blocks the screen background; only the area around the clock shows the chosen bg color.
  var faceFill = (theme.face && theme.face !== 'none') ? theme.face : 'var(--bg)';
  html += '<circle cx="100" cy="100" r="90" fill="' + faceFill + '" stroke="var(--border2)" stroke-width="1"/>';
  // Tick marks — major full strength, minor dimmed, both in the chosen tick colour
  for (var i = 0; i < 60; i++) {
    var angle = (i * 6 - 90) * Math.PI / 180;
    var isMajor = i % 5 === 0;
    var r1 = isMajor ? 78 : 83;
    var r2 = 88;
    var x1 = 100 + r1 * Math.cos(angle);
    var y1 = 100 + r1 * Math.sin(angle);
    var x2 = 100 + r2 * Math.cos(angle);
    var y2 = 100 + r2 * Math.sin(angle);
    html += '<line x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '" stroke="' + theme.ticks + '" stroke-width="' + (isMajor ? 1.5 : 1) + '"' + (isMajor ? '' : ' opacity="0.55"') + '/>';
  }
  // Hand group — rotates as a unit for smooth sliding
  html += '<g id="concHandGroup" class="clock-hand-group">';
  html += '<line x1="100" y1="100" x2="100" y2="24" stroke="' + theme.hand + '" stroke-width="2" stroke-linecap="round"/>'; // main hand
  html += '<line x1="100" y1="100" x2="100" y2="114" stroke="' + theme.hand + '" stroke-width="1.5" stroke-linecap="round" opacity="0.4"/>'; // tail
  html += '</g>';
  // Center dot on top
  html += '<circle cx="100" cy="100" r="4" fill="' + theme.hand + '"/>';
  svg.innerHTML = html;
}

// ── Clock colour theming ──────────────────────────────────
var CLOCK_PALETTE = ['#d4956e','#d4b86a','#7eb8a4','#8eccc0','#8ab8e0','#98b4cc','#9b8ec4','#c4a8d4','#d49898','#c46a6a','#e8e6e0','#8a8a9a'];
var CLOCK_THEME_DEFAULT = { hand:'#d4956e', ticks:'#ddd8ce', face:'none', bg:'none', scale:1 };
var CLOCK_SCALE_MIN = 0.7;
var CLOCK_START_BUFFER_DEFAULT = 3;
var CLOCK_START_BUFFER_MIN = 0;
var CLOCK_START_BUFFER_MAX = 10;
// Max scale adapts to the viewport so desktop can go big while mobile stays
// within bounds. Base clock is 320px; leave room for chrome and controls.
function clockScaleMax() {
  var w = ((window.innerWidth || 360) - 24) / 320;
  var h = ((window.innerHeight || 640) * 0.6) / 320;
  return Math.max(1.2, Math.min(2.5, Math.min(w, h)));
}
function getClockTheme() {
  var t = (typeof concState !== 'undefined' && concState.clockTheme) || {};
  var sc = parseFloat(t.scale);
  if (!(sc > 0)) sc = CLOCK_THEME_DEFAULT.scale;
  return {
    hand: t.hand || CLOCK_THEME_DEFAULT.hand,
    ticks: t.ticks || CLOCK_THEME_DEFAULT.ticks,
    face: t.face || CLOCK_THEME_DEFAULT.face,
    bg: t.bg || CLOCK_THEME_DEFAULT.bg,
    scale: Math.max(CLOCK_SCALE_MIN, Math.min(clockScaleMax(), sc))
  };
}

function getClockStartBuffer() {
  var raw = Number(typeof concState !== 'undefined' && concState.clockTheme && concState.clockTheme.startBuffer);
  if (!Number.isFinite(raw)) return CLOCK_START_BUFFER_DEFAULT;
  return Math.max(CLOCK_START_BUFFER_MIN, Math.min(CLOCK_START_BUFFER_MAX, Math.round(raw)));
}

// Re-colour the setup-screen hero clock preview in place from the saved theme.
function applyHeroClockTheme() {
  var svg = document.getElementById('clkHeroSvg');
  if (!svg) return;
  var theme = getClockTheme();
  var hand = svg.querySelector('.clk-hand'); if (hand) hand.setAttribute('stroke', theme.hand);
  var hub = svg.querySelector('.clk-hub'); if (hub) hub.setAttribute('fill', theme.hand);
  var ticks = svg.querySelector('.clk-ticks'); if (ticks) ticks.setAttribute('stroke', theme.ticks);
  var face = svg.querySelector('.clk-face');
  if (face) face.setAttribute('fill', (theme.face && theme.face !== 'none') ? theme.face : '#07080d');
  var card = document.getElementById('clkHeroCard');
  if (card) card.style.background = (theme.bg && theme.bg !== 'none') ? theme.bg : '';
}

// ── Clock settings screen ────────────────────────────────────────────
var _clkSettingsFrom = 'exSetupScreen'; // tracks navigation origin for back button
var _activeCfgPart = null;             // which part (hand/ticks/face) is selected

document.addEventListener('DOMContentLoaded', function() {
  var backBtn = document.getElementById('clkCfgBack');
  if (backBtn) backBtn.addEventListener('click', function() {
    _activeCfgPart = null;
    var screen = document.getElementById('clockSettingsScreen');
    if (screen) screen.style.background = '';
    if (_clkSettingsFrom && _clkSettingsFrom !== 'exSetupScreen') {
      showScreen(_clkSettingsFrom);
    } else {
      applyHeroClockTheme();
      showScreen('exSetupScreen');
    }
  });
});

function openClockSettings(from) {
  _clkSettingsFrom = from || 'exSetupScreen';
  _activeCfgPart = null;
  renderClockSettings();
  showScreen('clockSettingsScreen');
}

function _applyClkCfgBg() {
  var screen = document.getElementById('clockSettingsScreen');
  if (!screen) return;
  var bg = getClockTheme().bg;
  screen.style.background = (bg && bg !== 'none') ? bg : '';
}

function renderClockSettings() {
  var theme = getClockTheme();

  // Apply background to the whole screen so it shows around the clock
  _applyClkCfgBg();

  // Interactive preview clock — size scales with the theme scale value
  var previewEl = document.getElementById('clkCfgPreview');
  if (previewEl) {
    var tks = '';
    for (var t = 0; t < 12; t++) {
      var ang = t * 30 * Math.PI / 180;
      var x1 = (120 + Math.sin(ang) * 96).toFixed(1), y1 = (120 - Math.cos(ang) * 96).toFixed(1);
      var x2 = (120 + Math.sin(ang) * 104).toFixed(1), y2 = (120 - Math.cos(ang) * 104).toFixed(1);
      tks += '<line x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '"/>';
    }
    // Solid dark face by default so the background shows AROUND the clock, not through it
    var pFace = (theme.face && theme.face !== 'none') ? theme.face : '#07080d';
    // Match the session clock size (320px base), scaled by theme.scale, capped to screen
    var base = Math.min(300, (window.innerWidth || 390) - 40);
    var sz = Math.max(120, Math.min(Math.round(base * theme.scale), (window.innerWidth || 390) - 20));
    previewEl.innerHTML = '<div class="clk-hero" style="margin:0;">'
      + '<div class="clk-hero-glow"></div>'
      + '<svg viewBox="0 0 240 240" width="' + sz + '" height="' + sz + '" id="clkCfgHeroSvg">'
      +   '<circle cx="120" cy="120" r="112" fill="' + pFace + '" id="clkCfgFaceEl"/>'
      +   '<circle class="clk-rim" cx="120" cy="120" r="112"/>'
      +   '<circle class="clk-rim-inner" cx="120" cy="120" r="104"/>'
      +   '<g stroke="' + theme.ticks + '" class="clk-ticks" id="clkCfgTicksEl">' + tks + '</g>'
      +   '<line x1="120" y1="120" x2="120" y2="30" stroke="' + theme.hand + '" stroke-width="2.6" stroke-linecap="round" style="animation:none; transform-origin:120px 120px;" id="clkCfgHandEl"/>'
      +   '<circle cx="120" cy="120" r="6" fill="' + theme.hand + '" id="clkCfgHubEl"/>'
      // Tap targets: face inner, ticks ring, hand strip
      +   '<circle r="74" cx="120" cy="120" fill="transparent" data-clk-edit="face" style="cursor:pointer"/>'
      +   '<circle r="100" cx="120" cy="120" fill="none" stroke="transparent" stroke-width="24" data-clk-edit="ticks" style="cursor:pointer"/>'
      +   '<line x1="120" y1="120" x2="120" y2="30" stroke="transparent" stroke-width="28" stroke-linecap="round" data-clk-edit="hand" style="cursor:pointer"/>'
      + '</svg>'
      + '</div>';
  }

  // Palette area: hint or active swatches
  _renderClkCfgPaletteArea();

  // Background + scale (always visible)
  _renderClkCfgSwatches('bg', 'clkCfg_bg', true);
  var sv = document.getElementById('clkCfgScaleVal');
  if (sv) sv.textContent = Math.round(theme.scale * 100) + '%';
  var bv = document.getElementById('clkCfgBufferVal');
  if (bv) bv.textContent = getClockStartBuffer() + 's';
}

function _bgIsLight(colorStr) {
  if (!colorStr || colorStr === 'none') return false;
  var hex = colorStr.replace('#', '');
  if (hex.length === 6) {
    var r = parseInt(hex.substr(0,2),16), g = parseInt(hex.substr(2,2),16), b = parseInt(hex.substr(4,2),16);
    return (0.299*r + 0.587*g + 0.114*b) > 128;
  }
  return false;
}

function _renderClkCfgPaletteArea() {
  var area = document.getElementById('clkCfgPaletteArea');
  if (!area) return;
  if (!_activeCfgPart) {
    var hintColor = _bgIsLight(getClockTheme().bg) ? 'rgba(30,20,10,.85)' : 'rgba(224,158,110,.9)';
    area.innerHTML = '<div class="clk-cfg-hint" style="color:' + hintColor + '">Tap parts of the clock to customize</div>';
    return;
  }
  var labels = { hand:'Hand', ticks:'Ticks', face:'Face' };
  var showNone = (_activeCfgPart === 'face');
  var theme = getClockTheme();
  var current = theme[_activeCfgPart];
  var swatchHtml = '';
  if (showNone) {
    swatchHtml += '<button class="clock-swatch clock-swatch-none' + (current === 'none' ? ' sel' : '')
                + '" data-clk-part="' + _activeCfgPart + '" data-clk-color="none" title="Default"></button>';
  }
  CLOCK_PALETTE.forEach(function(c) {
    swatchHtml += '<button class="clock-swatch' + (current === c ? ' sel' : '')
                + '" data-clk-part="' + _activeCfgPart + '" data-clk-color="' + c + '" style="background:' + c + '"></button>';
  });
  area.innerHTML = '<div class="clk-cfg-section" style="margin-bottom:14px;">'
    + '<div class="clk-cfg-row">'
    + '<div class="clk-cfg-row-label active">' + (labels[_activeCfgPart] || _activeCfgPart) + '</div>'
    + '<div class="clk-cfg-swatches">' + swatchHtml + '</div>'
    + '</div></div>';
}

function _renderClkCfgSwatches(part, elId, showNone) {
  var el = document.getElementById(elId);
  if (!el) return;
  var current = getClockTheme()[part];
  var html = '';
  if (showNone) {
    html += '<button class="clock-swatch clock-swatch-none' + (current === 'none' ? ' sel' : '')
          + '" data-clk-part="' + part + '" data-clk-color="none" title="Default"></button>';
  }
  CLOCK_PALETTE.forEach(function(c) {
    html += '<button class="clock-swatch' + (current === c ? ' sel' : '')
          + '" data-clk-part="' + part + '" data-clk-color="' + c + '" style="background:' + c + '"></button>';
  });
  el.innerHTML = html;
}

function setClockColor(part, color) {
  if (!concState.clockTheme) concState.clockTheme = {};
  concState.clockTheme[part] = color;
  saveConcState();
  if (typeof syncEnabled !== 'undefined' && syncEnabled && authToken) syncPushData();
  // Update the preview clock in-place (no full re-render, keeps scroll)
  var theme = getClockTheme();
  var pFace = (theme.face && theme.face !== 'none') ? theme.face : '#07080d';
  var faceEl  = document.getElementById('clkCfgFaceEl');
  var ticksEl = document.getElementById('clkCfgTicksEl');
  var handEl  = document.getElementById('clkCfgHandEl');
  var hubEl   = document.getElementById('clkCfgHubEl');
  if (faceEl)  faceEl.setAttribute('fill', pFace);
  if (ticksEl) ticksEl.setAttribute('stroke', theme.ticks);
  if (handEl)  handEl.setAttribute('stroke', theme.hand);
  if (hubEl)   hubEl.setAttribute('fill', theme.hand);
  // Background is the screen itself, not an SVG element
  _applyClkCfgBg();
  // Refresh the palette area (selected-state highlight) + bg row
  _renderClkCfgPaletteArea();
  _renderClkCfgSwatches('bg', 'clkCfg_bg', true);
  // Keep session clock in sync if it's live
  if (document.getElementById('concClock')) buildClockSVG();
  applyClockScreenBg();
}

(function initClockSettings() {
  document.addEventListener('click', function(e) {
    // Tap target on the settings-screen clock: select part
    var editPart = e.target.closest('[data-clk-edit]');
    if (editPart) {
      var cfgScreen = document.getElementById('clockSettingsScreen');
      if (cfgScreen && cfgScreen.classList.contains('active')) {
        _activeCfgPart = editPart.getAttribute('data-clk-edit');
        _renderClkCfgPaletteArea();
        return;
      }
    }
    // Swatch pick (in palette area or bg row)
    var sw = e.target.closest('[data-clk-part][data-clk-color]');
    if (sw) { setClockColor(sw.getAttribute('data-clk-part'), sw.getAttribute('data-clk-color')); return; }
    if (e.target.closest('#clkCfgScaleDown')) { adjustClockScale(-0.1); return; }
    if (e.target.closest('#clkCfgScaleUp')) { adjustClockScale(0.1); return; }
    if (e.target.closest('#clkCfgBufferDown')) { adjustClockStartBuffer(-1); return; }
    if (e.target.closest('#clkCfgBufferUp')) { adjustClockStartBuffer(1); return; }
  });
})();

// ── Scale + screen background (applied to the live session clock) ────
function applyClockScale() {
  var wrap = document.getElementById('clockWrap');
  if (!wrap) return;
  var s = getClockTheme().scale;
  wrap.style.transform = 'scale(' + s + ')';
  wrap.style.transformOrigin = 'center center';
}

function applyClockScreenBg() {
  var screen = document.getElementById('concSessionScreen');
  if (!screen) return;
  var bg = getClockTheme().bg;
  screen.style.background = (bg && bg !== 'none') ? bg : '';
}

function adjustClockScale(delta) {
  var cur = getClockTheme().scale;
  var next = Math.round((cur + delta) * 10) / 10;
  next = Math.max(CLOCK_SCALE_MIN, Math.min(clockScaleMax(), next));
  if (!concState.clockTheme) concState.clockTheme = {};
  concState.clockTheme.scale = next;
  saveConcState();
  if (typeof syncEnabled !== 'undefined' && syncEnabled && authToken) syncPushData();
  applyClockScale();
  renderClockSettings();
}

function adjustClockStartBuffer(delta) {
  var next = Math.max(CLOCK_START_BUFFER_MIN, Math.min(CLOCK_START_BUFFER_MAX, getClockStartBuffer() + delta));
  if (!concState.clockTheme) concState.clockTheme = {};
  concState.clockTheme.startBuffer = next;
  saveConcState();
  if (typeof syncEnabled !== 'undefined' && syncEnabled && authToken) syncPushData();
  renderClockSettings();
}

function updateClockHand(elapsedMs) {
  var group = document.getElementById('concHandGroup');
  if (!group) return;
  // Static placement, used to seat the hand before a session starts (and to
  // park it when one ends). While the clock is actually running the hand is
  // driven by the concHandSpin CSS animation instead — see startClockHand.
  var totalSeconds = elapsedMs / 1000;
  var angle = totalSeconds * 6; // 6 degrees per second, grows forever
  group.style.transform = 'rotate(' + angle + 'deg)';
}

// Hand the rotation to the compositor. A negative animation-delay offsets the
// animation into its own past, so the hand starts at exactly the angle the
// elapsed time calls for instead of snapping back to twelve o'clock.
function startClockHand(elapsedMs) {
  var group = document.getElementById('concHandGroup');
  if (!group) return;
  group.style.transform = '';       // the animation owns the transform now
  group.classList.remove('running');
  void group.getBoundingClientRect(); // reflow, so re-adding restarts cleanly
  group.style.animationDelay = '-' + (elapsedMs / 1000) + 's';
  group.classList.add('running');
}

function stopClockHand() {
  var group = document.getElementById('concHandGroup');
  if (!group) return;
  group.classList.remove('running');
  group.style.animationDelay = '';
}

// A CSS animation runs off the compositor clock, which browsers pause or slow
// while the page is backgrounded. The old rAF loop recomputed the angle from
// Date.now() every frame and so healed itself; this has to be told. Re-seating
// the delay against real elapsed time on every return to visibility keeps the
// hand honest — it shows seconds against the tick marks, so drift is legible.
function resyncClockHand() {
  if (!concStartTime) return;
  startClockHand(Date.now() - concStartTime);
}
document.addEventListener('visibilitychange', function() {
  if (document.visibilityState === 'visible') resyncClockHand();
});

// A "pure" Clock session carries neither an `exercise` tag (asana,
// autosuggestion, pore_breathing) nor a `type` tag (visualization, auditory,
// thought, all-angles, multi-sense). Those other exercises store a full
// session DURATION in `seconds`, so counting them toward the Clock's best-rep
// record inflated it with times the user never actually held on the clock.
function isClockSession(h) {
  return !!h && !h.exercise && !h.type;
}

// Clock history is stored newest-first. Rebuild the record progression from
// oldest to newest so legacy entries can still show which sits established a
// new best at the time. New entries persist the boolean explicitly, preserving
// the milestone even if an older session later rolls out of the history cap.
function clockHistoryPersonalBestFlags(history) {
  var flags = {};
  var best = 0;
  (history || []).map(function(h, i) { return { h:h, i:i }; })
    .filter(function(entry) { return isClockSession(entry.h); })
    .sort(function(a, b) {
      var aTime = new Date(a.h.date).getTime();
      var bTime = new Date(b.h.date).getTime();
      if (!isFinite(aTime)) aTime = 0;
      if (!isFinite(bTime)) bTime = 0;
      return aTime - bTime || b.i - a.i;
    })
    .forEach(function(entry) {
      var seconds = Math.max(0, parseInt(entry.h.seconds, 10) || 0);
      var inferred = seconds > best;
      flags[entry.i] = typeof entry.h.isPersonalBest === 'boolean'
        ? entry.h.isPersonalBest
        : inferred;
      if (seconds > best) best = seconds;
    });
  return flags;
}

// "Best Hold" counts only exercises whose `seconds` is a genuine unbroken hold:
// Clock, Thought Control, and Visualization. Auditory, asana, pore breathing,
// and autosuggestion either aren't holds or store a full session duration.
function isHoldSession(h) {
  return isClockSession(h) || (!!h && (h.type === 'thought' || h.type === 'visualization'));
}

// Readable name for any concentration-history entry, keyed off whichever tag
// it carries (exercise or type). Pore breathing / autosuggestion live under
// `exercise`, so a plain `h.type` lookup mislabels them as "Clock".
function concEntryLabel(h) {
  var key = (h && (h.exercise || h.type)) || 'clock';
  var names = {
    clock: 'Clock', asana: 'Asana', pore_breathing: 'Pore Breathing',
    autosuggestion: 'Autosuggestion', visualization: 'Visualization',
    auditory: 'Auditory', thought: 'Thought Control',
    'all-angles': 'All Angles', 'multi-sense': 'Multi-Sense'
  };
  return names[key] || 'Clock';
}

function renderConcHome() {
  var xpNeeded = concXpForLevel(concState.level);
  var xpThis = concState.xp - concSumXpToLevel(concState.level);
  var prog = Math.min(xpThis / xpNeeded, 1);
  var circ = 2 * Math.PI * 60;
  document.getElementById('concLevelRingProg').style.strokeDashoffset = circ * (1 - prog);
  document.getElementById('concLevelNum').textContent = concState.level;
  document.getElementById('concLevelTitle').textContent = getConcRank(concState.level);
  document.getElementById('concStatXP').textContent = concState.xp.toLocaleString();
  var concBannerGroup = document.getElementById('concBannerGroup');
  var concBannerLevel = document.getElementById('concBannerLevel');
  var concBannerSymbol = document.getElementById('concBannerSymbol');
  if (concBannerGroup) {
    var bGroup = getSymbolGroup(concState.level);
    concBannerGroup.textContent = bGroup.name;
    concBannerLevel.textContent = concState.level;
    concBannerSymbol.innerHTML = renderSymbolSVG(bGroup.id, 'rgba(255,200,140,.75)', 16);
  }
  if (typeof renderAkashaBoostBadge === 'function') renderAkashaBoostBadge();
  var concXPHint = document.getElementById('concXPHint');
  if (concXPHint) {
    if (concState.level >= 777) {
      concXPHint.textContent = 'max level reached';
    } else {
      var toNext = xpNeeded - xpThis;
      concXPHint.textContent = toNext.toLocaleString() + ' xp to level ' + (concState.level + 1);
    }
  }
  var concSym = document.getElementById('concHomeSymbol');
  var concSymFill = document.getElementById('concHomeSymbolFill');
  if (concSym) {
    var cGroup = getSymbolGroup(concState.level);
    concSym.innerHTML = renderSymbolSVG(cGroup.id, '#d4956e', 36);
    if (concSymFill) concSymFill.textContent = getSymbolLevelRoman(concState.level);
  }
  // Show mastered asterisk on Clock card if clock-only best >= 15 min
  var clockBest = (concState.history || []).reduce(function(b, s) {
    return isClockSession(s) && s.seconds > b ? s.seconds : b;
  }, 0);
  var star = document.getElementById('clockMasteredStar');
  if (star) star.style.display = clockBest >= 900 ? 'inline' : 'none';

  // Show mastered asterisk on TC card only when all three modes have best >= 15 min
  var tcStar = document.getElementById('tcMasteredStar');
  if (tcStar) {
    var tcAllMastered = getTCBestGap('observation') >= 900
      && getTCBestGap('focus') >= 900
      && getTCBestGap('vacancy') >= 900;
    tcStar.style.display = tcAllMastered ? 'inline' : 'none';
  }

  // Multi-Sense follows the six clean sensory foundations. Keep its advanced
  // card visible as the destination, but clearly locked until Taste is
  // mastered; openExerciseSetup enforces the same gate.
  if (typeof guideSensoryTrackProgress === 'function') {
    var sensoryComplete = guideSensoryTrackProgress().complete;
    document.querySelectorAll('.exercise-card[data-exercise="multisense"]').forEach(function(card) {
      card.dataset.trackLocked = sensoryComplete ? '0' : '1';
      card.style.opacity = sensoryComplete ? '' : '.45';
      card.style.pointerEvents = sensoryComplete ? '' : 'none';
      card.setAttribute('aria-disabled', sensoryComplete ? 'false' : 'true');
      var desc = card.querySelector('.exercise-card-desc');
      if (desc) desc.textContent = 'Hold sight, sound, texture, and atmosphere simultaneously.';
    });
  }
}

var concCountInterval = null; // track countdown so we can cancel it
var concResultSaved = false; // prevents double-saving from multiple button hooks
var concPendingBegin = false; // session screen is showing instructions, awaiting Begin click
var concAutoStopTimer = null; // tutorial first session auto-ends after 60s
var concReps = [];
var concInSession = false;
var concSessionStartTime = null;
var concRepTimerInterval = null;

function startConcentration() {
  // Hard cross-device lock: only one session may run across a user's devices.
  // Block entry if another device has a live session right now.
  var _remote = remoteSessionActive();
  if (_remote) {
    showToast(remoteSessionLabel(_remote) + '. Finish it before starting another.', 4200);
    if (typeof renderHome === 'function') renderHome();
    showScreen('homeScreen');
    return;
  }
  // Refresh the beacon view so the Begin-button gate below is decided on fresh data.
  refreshRemoteSessionBanner();
  if (!concInSession) {
    concReps = [];
    concInSession = true;
    concSessionStartTime = Date.now();
  }
  concStartTime = null; // explicitly null until countdown finishes
  concSeconds = 0;
  if (concAutoStopTimer) { clearTimeout(concAutoStopTimer); concAutoStopTimer = null; }
  buildClockSVG();
  updateClockHand(0);
  showScreen('concSessionScreen');
  requestExerciseWakeLock();

  // Tutorial first-session gets a 60s auto-cap (retention) and a stripped-down
  // header (no top-left ✕, no top-right Stop) so the user can only press Begin
  // → wait → Stop. Veterans see the full UI and the clock runs until they stop.
  var isTutorialFirst = window._tutorialFirstClock === true;
  var discardBtn = document.querySelector('#concSessionScreen .session-discard-btn');
  var topStopBtn = document.getElementById('concStopBtn');
  if (discardBtn) discardBtn.style.visibility = isTutorialFirst ? 'hidden' : '';
  if (topStopBtn) topStopBtn.style.visibility = isTutorialFirst ? 'hidden' : '';
  var titleEl = document.querySelector('#concSessionScreen .session-title');
  if (titleEl) titleEl.style.visibility = isTutorialFirst ? 'hidden' : '';
  // Show the small back affordance while awaiting Begin (hidden for the
  // committed tutorial run); it's hidden again once the hand starts moving.
  var sessBackBtn = document.getElementById('concSessBack');
  if (sessBackBtn) sessBackBtn.style.display = isTutorialFirst ? 'none' : '';

  // A single short hint sits above the clock until the hand starts moving,
  // then fades so the running exercise is text-free. It's tinted with the
  // clock's hand colour so it coordinates with any chosen background.
  var sessionLabel = document.getElementById('concSessionLabel');
  if (sessionLabel) {
    sessionLabel.textContent = 'focus on the tip of the seconds hand';
    sessionLabel.style.display = '';
    sessionLabel.style.color = getClockTheme().hand;
    sessionLabel.style.opacity = '1';
    sessionLabel.classList.remove('conc-label-instructions', 'conc-label-flash');
  }

  // Bottom button invites the first tap; top stop disabled until running.
  var bottomBtn = document.getElementById('concStopBtn2');
  if (bottomBtn) {
    bottomBtn.textContent = 'Tap to Begin';
    bottomBtn.disabled = false;
    bottomBtn.style.opacity = '';
  }
  if (topStopBtn) { topStopBtn.disabled = true; topStopBtn.style.opacity = '0.3'; }

  var countdown = document.getElementById('clockCountdown');
  if (countdown) { countdown.classList.remove('show'); countdown.textContent = ''; }

  concPendingBegin = true;
  applyClockScale();
  applyClockScreenBg();
}

function beginCountdown() {
  if (!concPendingBegin) return;
  // Re-check the cross-device lock at the actual start moment (the entry
  // gate kicked off a fresh beacon read, which has landed by now).
  var _remote = remoteSessionActive();
  if (_remote) {
    showToast(remoteSessionLabel(_remote) + '. Finish it before starting another.', 4200);
    concInSession = false;
    if (typeof renderHome === 'function') renderHome();
    showScreen('homeScreen');
    return;
  }
  concPendingBegin = false;
  var isTutorialFirst = window._tutorialFirstClock === true;

  // Gently flash the focus hint through the countdown (unless it's turned off),
  // then it fades out below when the hand starts moving.
  var sessionLabel = document.getElementById('concSessionLabel');
  if (sessionLabel && sessionLabel.style.display !== 'none') {
    sessionLabel.classList.add('conc-label-flash');
  }

  // Bottom button now means Stop; disable during countdown.
  var bottomBtn = document.getElementById('concStopBtn2');
  if (bottomBtn) {
    bottomBtn.textContent = 'Stop';
    bottomBtn.disabled = true;
    bottomBtn.style.opacity = '0.3';
  }
  var topStopBtn = document.getElementById('concStopBtn');
  if (topStopBtn) { topStopBtn.disabled = true; topStopBtn.style.opacity = '0.3'; }

  // The tutorial tip card was sized to live during the countdown — fade it
  // out now so it doesn't linger on the clock face.
  var tip = document.getElementById('tutClockTip');
  if (tip) tip.classList.remove('tut-ct-show');
  // Past the point of no return — hide the back affordance for a clean run.
  var sessBackBtn = document.getElementById('concSessBack');
  if (sessBackBtn) sessBackBtn.style.display = 'none';

  // The optional settling buffer starts the clock after the selected delay.
  var countdown = document.getElementById('clockCountdown');
  var count = getClockStartBuffer();

  function startClock() {
    if (countdown) { countdown.classList.remove('show'); countdown.textContent = ''; }
    if (sessionLabel) {
      sessionLabel.classList.remove('conc-label-flash');
      sessionLabel.style.opacity = '0';
    }
    if (bottomBtn) { bottomBtn.disabled = false; bottomBtn.style.opacity = ''; }
    // Top stop stays hidden during tutorial; otherwise re-enable.
    if (topStopBtn && !isTutorialFirst) { topStopBtn.disabled = false; topStopBtn.style.opacity = ''; }
    concStartTime = Date.now();
    startClockHand(0);
    concTimerHandle = setTimeout(tickConcentration, 1000);
    // Tutorial first session: auto-stop at 60s only for the beginner path.
    if (isTutorialFirst && guidePathMode !== 'experienced') {
      concAutoStopTimer = setTimeout(function() {
        concAutoStopTimer = null;
        window._tutAutoStopped = true;
        stopConcentration();
      }, 60 * 1000);
    }
  }

  if (count === 0) {
    startClock();
    return;
  }
  if (countdown) { countdown.textContent = count; countdown.classList.add('show'); }

  if (concCountInterval) clearInterval(concCountInterval);
  concCountInterval = setInterval(function() {
    count--;
    if (count > 0) {
      if (countdown) countdown.textContent = count;
    } else {
      clearInterval(concCountInterval);
      concCountInterval = null;
      startClock();
    }
  }, 1000);
}

// Keeps concSeconds warm for anything that reads it mid-session. The hand is
// no longer drawn here, so this runs once a second rather than every frame —
// stopConcentration recomputes the final figure from concStartTime anyway, so
// nothing depends on this being fresher than that.
function tickConcentration() {
  if (!concStartTime) return; // guard against null startTime
  var elapsedMs = Date.now() - concStartTime;
  concSeconds = Math.floor(elapsedMs / 1000);
  concTimerHandle = setTimeout(tickConcentration, 1000 - (elapsedMs % 1000));
}

function stopConcentration() {
  // Clear the tutorial 60s auto-stop watchdog regardless of state.
  if (concAutoStopTimer) { clearTimeout(concAutoStopTimer); concAutoStopTimer = null; }
  // If we're still on the Begin screen (no countdown, no clock), bail to home.
  if (concPendingBegin) {
    concPendingBegin = false;
    openExerciseSetup(currentExercise);
    showScreen('exSetupScreen');
    return;
  }
  // If still in countdown, cancel it and go back home
  if (concCountInterval) {
    clearInterval(concCountInterval);
    concCountInterval = null;
    var countdown = document.getElementById('clockCountdown');
    if (countdown) { countdown.classList.remove('show'); countdown.textContent = ''; }
    var stopBtn = document.getElementById('concStopBtn');
    var stopBtn2 = document.getElementById('concStopBtn2');
    if (stopBtn) { stopBtn.disabled = false; stopBtn.style.opacity = ''; }
    if (stopBtn2) { stopBtn2.disabled = false; stopBtn2.style.opacity = ''; }
    showScreen('homeScreen');
    switchMode('concentration');
    return;
  }
  clearTimeout(concTimerHandle);
  stopClockHand();
  // Guard: if concStartTime is null (shouldn't happen now but just in case)
  concSeconds = concStartTime ? Math.floor((Date.now() - concStartTime) / 1000) : 0;
  concStartTime = null;
  var rawSecs = Math.max(concSeconds, 1);
  // Pavlok buzz on session end (only when a real session ran, not cancelled pre-start)
  var pvkC = getPavlokPrefs();
  if (pvkC.concentration.enabled && rawSecs > 2) sendPavlokStimulus('vibe', pvkC.concentration.intensity);

  // Tutorial first session: original single-rep flow
  if (window._tutorialFirstClock) {
    document.getElementById('concResultBig').textContent = rawSecs;
    document.getElementById('concNotes').value = '';
    document.getElementById('concAdaptWrap').innerHTML = '';
    concResultSaved = false;
    saveConcResult();
    return;
  }

  // Multi-rep session
  if (rawSecs >= 10) concReps.push({ seconds: rawSecs });
  showConcRepOverlay(rawSecs);
  return;
}

function showConcRepOverlay(repSecs) {
  var el = document.getElementById('concRepOverlay');
  if (!el) return;
  if (concRepTimerInterval) { clearInterval(concRepTimerInterval); concRepTimerInterval = null; }
  var repNum = concReps.length;
  var tooShort = repSecs < 10;

  el.style.zIndex = '';
  el.innerHTML =
    '<div style="font-family:\'DM Mono\',monospace;font-size:9px;letter-spacing:.18em;text-transform:uppercase;color:var(--text);margin-bottom:6px;">'
    + (tooShort ? 'Too short to record' : 'Rep ' + repNum + ' complete') + '</div>'
    + '<div style="font-family:\'Cormorant Garamond\',serif;font-size:64px;font-weight:300;color:var(--text);line-height:1;">' + fmtSecs(repSecs) + '</div>'
    + '<div style="margin-top:16px;font-family:\'DM Mono\',monospace;font-size:10px;letter-spacing:.22em;text-transform:uppercase;color:var(--text);">Session · <span id="concSessionTimer">0:00</span></div>'
    + '<button id="concRepNextBtn" class="sc-done-btn" style="margin-top:28px;">Rep ' + (repNum + 1) + ' →</button>'
    + '<button id="concEndSessionBtn" class="sc-end-btn">End Session</button>';

  function updateTimer() {
    var t = document.getElementById('concSessionTimer');
    if (t && concSessionStartTime) t.textContent = fmtSecs(Math.floor((Date.now() - concSessionStartTime) / 1000));
  }
  updateTimer();
  concRepTimerInterval = setInterval(updateTimer, 1000);

  function dismiss(cb) {
    if (concRepTimerInterval) { clearInterval(concRepTimerInterval); concRepTimerInterval = null; }
    el.classList.remove('cro-vis');
    setTimeout(function() { el.classList.remove('cro-show'); cb(); }, 320);
  }
  document.getElementById('concRepNextBtn').onclick = function() { dismiss(startConcentration); };
  document.getElementById('concEndSessionBtn').onclick = function() {
    var _clockElapsed = concSessionStartTime ? Math.floor((Date.now() - concSessionStartTime) / 1000) : 0;
    omniaConfirmEarlyEnd('clock', _clockElapsed, function() {
      if (concRepTimerInterval) { clearInterval(concRepTimerInterval); concRepTimerInterval = null; }
      // Drop this overlay just behind the session-complete legend (z-9800) and
      // let the legend fade in on top of it. This opaque overlay keeps covering
      // the clock the entire time, so the clock never flashes through between
      // the two screens. Remove the overlay once the legend has fully arrived.
      el.style.zIndex = '9799';
      saveConcSession();
      setTimeout(function() {
        el.classList.remove('cro-vis');
        el.classList.remove('cro-show');
        el.style.zIndex = '';
      }, 700);
    });
  };

  el.classList.add('cro-show');
  requestAnimationFrame(function() {
    requestAnimationFrame(function() { el.classList.add('cro-vis'); });
  });
}

function fmtSecs(s) {
  return (Math.floor(s / 60) > 0
    ? Math.floor(s / 60) + ':' + (s % 60 < 10 ? '0' : '') + s % 60
    : '0:' + (s < 10 ? '0' : '') + s);
}

function saveConcSession() {
  concInSession = false;
  releaseExerciseWakeLock();
  var validReps = concReps.filter(function(r) { return r.seconds >= 10; });
  concReps = [];
  if (validReps.length === 0) {
    renderConcHome();
    showScreen('homeScreen');
    returnAfterExercise(currentMode);
    return;
  }

  var totalXP = validReps.reduce(function(s, r) { return s + r.seconds; }, 0);
  var bestRep = validReps.reduce(function(a, r) { return r.seconds > a ? r.seconds : a; }, 0);
  var isNewBest = bestRep > concState.bestSeconds;
  // Total time spent in the session (covers all reps + restarts), used to judge
  // whether a session "qualifies" toward the next Clock tier — a player who
  // spends the full target duration should qualify even if focus broke mid-way.
  var sessionDurationSec = concSessionStartTime ? Math.floor((Date.now() - concSessionStartTime) / 1000) : totalXP;

  concState.xp += totalXP;
  if (isConcNewSession()) concState.totalSessions++;
  if (isNewBest) concState.bestSeconds = bestRep;

  var didLevelUp = awardLevelUps(concState, concSumXpToLevel, concXpForLevel);

  // Daily akasha cap: counting the session being recorded, only the first 4
  // clock sessions of the day earn akasha.
  var _todayStr = presenceDayKey();
  var _clockPrevToday = concState.history.filter(function(h) { return h.date && presenceDayKey(h.date) === _todayStr && !h.type && !h.exercise; }).length;
  var _akashaCapped = _clockPrevToday + 1 > 3;
  var _akashaDelta = recordExerciseCompletion({
    entry: { date: new Date().toISOString(), seconds: bestRep, xpEarned: totalXP, sessionDurationSec: sessionDurationSec, notes: '', isPersonalBest: isNewBest },
    exId: 'clock',
    omniaSeconds: totalXP,
    reachedRec: omniaReachedRecommendation('clock', sessionDurationSec),
    skipOmnia: _akashaCapped
  });
  if (_akashaCapped) showToast('Clock · Daily Akasha cap reached · XP still counts', 3200);

  var _originMode = currentMode;
  var _pbLabel = isNewBest ? 'New PB' : 'PB';
  var _fmtBest = fmtSecs(concState.bestSeconds);
  if (didLevelUp && typeof completionFlowQueueLevelUp === 'function') {
    completionFlowQueueLevelUp(concState.level, 'concentration');
  }

  var _omniaMsg = null;
  if (concState.bestSeconds > 0 && concState.bestSeconds < 900) {
    var _raw3x = Math.min(concState.bestSeconds * 3, 900);
    _omniaMsg = 'Next target: ' + fmtSecs(_raw3x) + '. Three times your best — build until you reach 15 minutes.';
  }

  var repCount = validReps.length;
  showSessionComplete({
    title: 'Meditative legend!',
    sub: repCount + ' rep' + (repCount !== 1 ? 's' : '') + ' · Clock Exercise',
    xp: totalXP,
    akashaDelta: _akashaDelta,
    stat3: { label: _pbLabel, color: 'blue', value: _fmtBest },
    omniaMsg: _omniaMsg,
    onDone: function() {
      renderConcHome();
      showScreen('homeScreen');
      returnAfterExercise(_originMode);
    }
  });
}

function showConcResult(seconds) {
  document.getElementById('concResultBig').textContent = seconds;
  document.getElementById('concResultDuration').textContent = seconds + ' seconds';
  document.getElementById('concNotes').value = '';
  document.getElementById('concAdaptWrap').innerHTML = '';
  concResultSaved = false;
  var saveBtn = document.getElementById('concSaveBtn');
  var repeatBtn = document.getElementById('concSaveRepeatBtn');
  saveBtn.textContent = 'Save & Continue';
  saveBtn.onclick = saveConcResult;
  if (repeatBtn) {
    repeatBtn.style.display = 'block';
    repeatBtn.disabled = false;
    repeatBtn.textContent = 'Save & Repeat';
    repeatBtn.onclick = function() { saveConcResult(true); };
  }
  showScreen('concResultScreen');
}

function saveConcResult(repeatAfter) {
  repeatAfter = repeatAfter === true;
  releaseExerciseWakeLock();
  if (concResultSaved) {
    if (repeatAfter) startConcentration();
    return;
  }
  var seconds = parseInt(document.getElementById('concResultBig').textContent);
  var notes = document.getElementById('concNotes').value.trim();

  // Sessions under 10 seconds don't count (skip gate during first tutorial session)
  if (seconds < 10 && !window._tutorialFirstClock) {
    var div = document.getElementById('concAdaptWrap');
    if (div) div.innerHTML = '<div class="adapt-card" style="border-color:rgba(212,149,110,.15); opacity:.7;">'
      + '<div class="adapt-text" style="color:var(--muted);">Session too short to record. Keep going.</div>'
      + '</div>';
    return;
  }
  concResultSaved = true;

  // XP = seconds held (simple and clean)
  var xpEarned = seconds;
  var isNewBest = seconds > concState.bestSeconds;

  concState.xp += xpEarned;
  if (isConcNewSession()) concState.totalSessions++;
  if (isNewBest) concState.bestSeconds = seconds;

  var concDidLevelUp1 = awardLevelUps(concState, concSumXpToLevel, concXpForLevel);

  var _akashaDelta = recordExerciseCompletion({
    entry: { date: new Date().toISOString(), seconds: seconds, xpEarned: xpEarned, notes: notes, isPersonalBest: isNewBest },
    exId: 'clock',
    omniaSeconds: seconds
  });
  if (window._tutorialFirstClock) {
    window._tutorialFirstClock = false;
    if (omniaState) { omniaCreditAkasha(50, 'tutorial-clock'); saveOmniaState(); }
    showTutorialPostSession(seconds, _akashaDelta + 50);
    return;
  }
  var _concDidLevelUp = concDidLevelUp1;
  var _originMode = currentMode;
  var _fmtSecs = (Math.floor(seconds/60) > 0 ? Math.floor(seconds/60) + ':' + (seconds%60 < 10 ? '0' : '') + seconds%60 : '0:' + (seconds < 10 ? '0' : '') + seconds);
  if (_concDidLevelUp && typeof completionFlowQueueLevelUp === 'function') {
    completionFlowQueueLevelUp(concState.level, 'concentration');
  }
  showSessionComplete({
    title: 'Meditative legend!',
    sub: 'Clock Exercise',
    xp: xpEarned,
    akashaDelta: _akashaDelta,
    stat3: { label: 'Time', color: 'blue', value: _fmtSecs },
    onDone: function() {
      renderConcHome();
      showScreen('homeScreen');
      returnAfterExercise(_originMode);
    }
  });
}



// Recalculate totalSessions from history using the same 2-hour window rule
// used when saving. Sorting chronologically and counting gaps >= 2h.
function recalcConcSessions(history) {
  if (!history || !history.length) return 0;
  var sorted = history.slice().sort(function(a, b) {
    return new Date(a.date) - new Date(b.date);
  });
  var sessions = 1;
  var lastDate = new Date(sorted[0].date);
  for (var i = 1; i < sorted.length; i++) {
    var d = new Date(sorted[i].date);
    if (d - lastDate >= 2 * 60 * 60 * 1000) sessions++;
    lastDate = d;
  }
  return sessions;
}

function deleteConcSession(index, _c) {
  var h = concState.history[index];
  if (!h) return;
  var xpLost = h.xpEarned || 0;
  var newXP = Math.max(0, concState.xp - xpLost);
  var newLevel = 1;
  while (newLevel < 777) {
    if (newXP >= concSumXpToLevel(newLevel + 1)) { newLevel++; } else { break; }
  }
  var rankWillDrop = newLevel < concState.level;
  var msg = 'Delete this concentration session?\n\nThis will remove ' + xpLost + ' XP from your count.';
  if (rankWillDrop) {
    msg += '\n\nWarning: your rank will drop from '
      + getConcRank(concState.level) + ' (level ' + concState.level + ') to '
      + getConcRank(newLevel) + ' (level ' + newLevel + ').';
  }
  if (!_c) { showConfirm('Delete Session', msg.replace('Delete this session?\n\n',''), function(){ deleteConcSession(index, true); }); return; }

  // Remove session and recalculate totalSessions from remaining history
  // (don't blindly decrement — multiple exercises can share a single session)
  concState.history.splice(index, 1);
  concState.xp = newXP;
  concState.level = newLevel;
  concState.totalSessions = recalcConcSessions(concState.history);

  // Recalculate best seconds from remaining history
  concState.bestSeconds = concState.history.reduce(function(best, s) {
    return isClockSession(s) && s.seconds > best ? s.seconds : best;
  }, 0);

  saveConcState();
  if (syncEnabled && authToken) syncPushData();
  renderConcHistory();
  renderConcHome();
  showToast('Session deleted');
}

function renderConcHistory() {
  var titleEl = document.querySelector('#concHistoryScreen .history-title');
  if (titleEl) titleEl.textContent = concHistoryFilter === 'clock' ? 'Clock' : concHistoryFilter === 'thought' ? 'Thought Control' : 'Concentration';
  var screen = document.getElementById('concHistoryScreen');
  if (screen) screen.classList.toggle('clock-history-mode', concHistoryFilter === 'clock');
  var list = document.getElementById('concHistoryList');
  var allHistory = concState.history;
  var clockPersonalBests = clockHistoryPersonalBestFlags(allHistory);
  var filtered = concHistoryFilter === 'clock'
    ? allHistory.map(function(h, i) { return { h: h, i: i }; }).filter(function(x) {
        return isClockSession(x.h);
      })
    : concHistoryFilter === 'thought'
    ? allHistory.map(function(h, i) { return { h: h, i: i }; }).filter(function(x) { return x.h.type === 'thought'; })
    : allHistory.map(function(h, i) { return { h: h, i: i }; });
  if (!filtered.length) {
    var emptyMsg = concHistoryFilter === 'clock' ? 'No clock sessions yet.' : concHistoryFilter === 'thought' ? 'No thought control sessions yet.' : 'No concentration sessions yet.';
    list.innerHTML = '<div class="history-empty">' + emptyMsg + '</div>';
    return;
  }
  // Group by calendar date
  var groups = [];
  var groupMap = {};
  filtered.forEach(function(entry) {
    var d = new Date(entry.h.date);
    var key = new Date(d); key.setHours(0,0,0,0);
    var keyStr = key.getTime().toString();
    if (!groupMap[keyStr]) {
      var g = { label: dateGroupLabel(d), entries: [] };
      groups.push(g);
      groupMap[keyStr] = g;
    }
    groupMap[keyStr].entries.push(entry);
  });

  var summaryHtml = concHistoryFilter === 'clock'
    ? '<div class="clock-history-summary">'
      + '<div class="clock-history-summary-stat"><span>Best Rep</span><strong>' + fmtSecs(filtered.reduce(function(best, entry) { return Math.max(best, entry.h.seconds || 0); }, 0)) + '</strong></div>'
      + '<div class="clock-history-summary-rule"></div>'
      + '<div class="clock-history-summary-stat"><span>Sessions</span><strong>' + filtered.length + '</strong></div>'
      + '</div>'
    : '';

  list.innerHTML = summaryHtml + groups.map(function(group) {
    var itemsHtml = group.entries.map(function(entry) {
      var h = entry.h; var idx = entry.i;
      var d = new Date(h.date);
      var timeStr = d.toLocaleTimeString('en-US', { hour:'numeric', minute:'2-digit' });
      var notesHtml = h.notes ? '<div class="history-notes">' + escHtml(h.notes) + '</div>' : '';
      var typeStr = h.exercise === 'asana' ? ('Asana' + (h.posture ? ' · ' + escHtml(h.posture) : ''))
        : h.exercise === 'sense' ? ((SENSE_MODE_DEFS[h.mode] ? SENSE_MODE_DEFS[h.mode].label : 'Senses')
          + (h.cue ? ' · ' + escHtml(h.cue) : '')
          + ' · ' + (h.eyesMode === 'open' ? 'Open Eyes' : 'Closed Eyes'))
        : h.exercise === 'pore_breathing' ? 'Pore Breathing'
        : h.exercise === 'autosuggestion' ? 'Autosuggestion'
        : h.type === 'visualization' ? (h.object ? escHtml(h.object) : 'Visualization')
        : h.type === 'auditory' ? (h.object ? escHtml(h.object) : 'Auditory')
        : h.type === 'thought' ? (h.object ? escHtml(h.object) : 'Thought Control')
        : 'Clock';
      var holdStr = h.exercise === 'autosuggestion'
        ? ((h.taps || 40) + ' taps')
        : (h.exercise === 'asana' || h.exercise === 'sense')
        ? (Math.floor(h.seconds/60) + ':' + (h.seconds%60 < 10 ? '0' : '') + (h.seconds%60))
        : h.seconds + 's';
      var isClockEntry = !h.type && !h.exercise;
      var isPersonalBest = isClockEntry && clockPersonalBests[idx] === true;
      var statsHtml = '';
      if (isClockEntry) {
        var totalSessionSec = guideSessionSec(h);
        statsHtml = '<div class="conc-history-stats">'
          + '<div class="conc-history-stat"><span class="conc-history-stat-label">Total Session</span><span class="conc-history-stat-value">' + fmtSecs(totalSessionSec) + '</span></div>'
          + '<div class="conc-history-stat conc-history-stat--best"><span class="conc-history-stat-label">Best Rep</span><span class="conc-history-stat-value">' + fmtSecs(h.seconds || 0) + '</span></div>'
          + '</div>';
      }
      return '<div class="conc-history-item' + (isPersonalBest ? ' is-personal-best' : '') + '" style="position:relative;">'
        + '<button class="history-delete-btn" onclick="deleteConcSession(' + idx + ')">✕</button>'
        + '<div class="conc-history-top" style="padding-right:28px;">'
        + '<span class="conc-history-date">' + timeStr + '</span>'
        + (isPersonalBest ? '<span class="conc-history-pb-badge">Personal Best</span>' : (isClockEntry ? '' : '<span class="conc-history-time">' + holdStr + '</span>'))
        + '</div>'
        + statsHtml
        + '<div class="conc-history-foot">'
        + '<span class="conc-history-xp">+' + h.xpEarned + ' xp</span>'
        + '<span style="font-size:9px;color:var(--muted);letter-spacing:.1em;">' + typeStr + '</span>'
        + '</div>'
        + notesHtml
        + '</div>';
    }).join('');
    return '<div class="history-date-group">' + group.label + '</div>' + itemsHtml;
  }).join('');
}
