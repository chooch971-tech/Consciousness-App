// ── Mode switching ──
var currentMode = 'guide';
var awarenessSubMode = 'awareness'; // 'awareness' or 'prayer'

function openAwarenessSubMenu(tabEl) {
  var menu = document.getElementById('awarenessSubMenu');
  var r = tabEl.getBoundingClientRect();
  menu.style.right = (window.innerWidth - r.right) + 'px';
  menu.style.top = (r.bottom + 4) + 'px';
  menu.style.display = 'block';
  document.getElementById('subMenuAwareness').classList.toggle('aw-sub-active', awarenessSubMode === 'awareness');
  document.getElementById('subMenuPrayer').classList.toggle('aw-sub-active', awarenessSubMode === 'prayer');
}
function closeAwarenessSubMenu() {
  var m = document.getElementById('awarenessSubMenu');
  if (m) m.style.display = 'none';
}

// ── The two surfaces around the page ────────────────────────────────────────
//
// Canvas: <html>'s own background, which shows anywhere the page's paint does
// not reach — behind the home indicator most visibly. It follows the BOTTOM of
// each mode's backdrop. It used to be a flat #07080d in every mode, which
// against the Guide's violet read as a band the app had failed to cover.
//
// Status bar: since the switch to status-bar-style default, iOS draws an
// opaque bar across the top and tints it from <meta name="theme-color">. It
// sits against the TOP of whatever is on screen, so it follows the top — and
// not just per mode: Settings, Profile, the Lodge and the sessions each have a
// sky of their own, and a mode-coloured bar would sit over them as a seam.
//
// Every value below is measured, not read off a stylesheet: the top 3px of
// each screen averaged as rendered. The glows layered over the gradients make
// the real top noticeably lighter than the gradient's own first stop — the
// Guide renders #1e1933 there against a #131022 stop.
var MODE_CANVAS_COLORS = {
  guide:         '#0f0c1c',
  concentration: '#130e08',
  awareness:     '#091410',
  prayer:        '#0a0b18'
};
var MODE_BAR_COLORS = {
  guide:         '#1e1933',
  concentration: '#20160c',
  awareness:     '#11241a',
  prayer:        '#111229'
};
// Screens whose top is not the plain #07080d. Anything absent — 24 of the 44
// screens as measured — uses that default.
var SCREEN_BAR_COLORS = {
  settingsScreen:'#0e162a', exerciseSettingsScreen:'#0e162a', accountSettingsScreen:'#0e162a',
  bugReportScreen:'#0e162a', clockSettingsScreen:'#0e162a',
  profileScreen:'#152026', friendProfileScreen:'#152026', profileActivityScreen:'#152026',
  chatListScreen:'#152026', chatThreadScreen:'#152026',
  journalScreen:'#0d0e1c', journalEntryScreen:'#0d0e1c',
  lodgeScreen:'#1f1a33',
  prayerSessionScreen:'#11111a', mantraScreen:'#121213', concSessionScreen:'#140f10',
  visSessionScreen:'#0d1119', audSessionScreen:'#131013', asanaSessionScreen:'#120f13',
  senseSessionScreen:'#2f1f2b'
};
var DEFAULT_SURFACE_COLOR = '#07080d';

function presenceSetBarColor(color) {
  try {
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', color || DEFAULT_SURFACE_COLOR);
  } catch (e) {}
}

// Home in a given mode: canvas to the backdrop's bottom, bar to its top.
function applyModeCanvasColor(mode) {
  try {
    document.documentElement.style.backgroundColor = MODE_CANVAS_COLORS[mode] || DEFAULT_SURFACE_COLOR;
  } catch (e) {}
  presenceSetBarColor(MODE_BAR_COLORS[mode] || DEFAULT_SURFACE_COLOR);
}

// Any other screen: the bar follows that screen's own top.
function applyScreenBarColor(screenId) {
  presenceSetBarColor(SCREEN_BAR_COLORS[screenId] || DEFAULT_SURFACE_COLOR);
}

function switchMode(mode) {
  currentMode = mode;
  // An explicit mode switch is a fresh entry — discard any Guide scroll position
  // banked for a return trip so it can't restore stale on a later renderHome.
  window._guideScrollRestore = 0;
  // Each mode paints its own backdrop on the shared #homeScreen, so exactly one
  // mode-* class may be set at a time or two backdrops would stack.
  // (Body default is mode-guide since the app boots into the Guide.)
  ['guide', 'concentration', 'awareness', 'prayer'].forEach(function(m) {
    document.body.classList.toggle('mode-' + m, mode === m);
  });
  applyModeCanvasColor(mode);
  if (typeof closeStarMapSheet === 'function') closeStarMapSheet();
  if(window._omniaQuickDismiss && mode==='guide') window._omniaQuickDismiss();
  if (mode !== 'guide') document.body.classList.remove('upgrade-stage');
  var awTab = document.getElementById('modeAwareness');
  var coTab = document.getElementById('modeConcentration');
  var prTab = document.getElementById('modePrayer');
  var awPanel = document.getElementById('awarenessPanel');
  var coPanel = document.getElementById('concentrationPanel');
  var prPanel = document.getElementById('prayerPanel');
  var guPanel = document.getElementById('guidePanel');

  awTab.classList.remove('active','conc-mode','guide-mode','prayer-mode');
  coTab.classList.remove('active','conc-mode','guide-mode');
  prTab.classList.remove('active','prayer-mode','guide-mode');
  awPanel.style.display = 'none';
  coPanel.style.display = 'none';
  prPanel.style.display = 'none';
  if (guPanel) guPanel.style.display = 'none';

  if (mode === 'awareness') {
    awTab.classList.add('active');
    awPanel.style.display = 'flex';
    renderHome();
    var lbl = document.getElementById('awarenessTabLabel');
    if (lbl) lbl.textContent = 'Awareness';
  } else if (mode === 'concentration') {
    coTab.classList.add('active','conc-mode');
    coPanel.style.display = 'flex';
    renderConcHome();
  } else if (mode === 'guide') {
    prTab.classList.add('active','guide-mode');
    if (guPanel) { guPanel.style.display = 'flex'; guPanel.scrollTop = 0; }
    openGuide();
    refreshGuidePanelLayout(true);
  } else {
    // Prayer is a sub-mode under the Awareness tab
    awTab.classList.add('active', 'prayer-mode');
    prPanel.style.display = 'flex';
    renderPrayerPanel();
    var lbl = document.getElementById('awarenessTabLabel');
    if (lbl) lbl.textContent = 'Prayer';
  }
}

document.getElementById('modeAwareness').addEventListener('click', function(e) {
  if (currentMode === 'awareness' || currentMode === 'prayer') {
    openAwarenessSubMenu(this);
  } else {
    closeAwarenessSubMenu();
    switchMode(awarenessSubMode);
  }
});
document.getElementById('subMenuAwareness').addEventListener('click', function(e) {
  e.stopPropagation();
  awarenessSubMode = 'awareness';
  switchMode('awareness');
  closeAwarenessSubMenu();
});
document.getElementById('subMenuPrayer').addEventListener('click', function(e) {
  e.stopPropagation();
  awarenessSubMode = 'prayer';
  switchMode('prayer');
  closeAwarenessSubMenu();
});
document.addEventListener('click', function(e) {
  if (!e.target.closest('#modeAwareness') && !e.target.closest('#awarenessSubMenu')) {
    closeAwarenessSubMenu();
  }
});
document.getElementById('awarenessRingBtn').addEventListener('click', function() {
  var collected = collectResidue();
  if (collected > 0) {
    showToast('+' + collected + ' XP collected');
    renderHome();
    return;
  }
  showRankModal(state.level, state.xp, 'awareness');
});
document.getElementById('homeSymbol').addEventListener('click', function() {
  showRankModal(state.level, state.xp, 'awareness');
});
document.getElementById('homeSymbolFill').addEventListener('click', function() {
  showRankModal(state.level, state.xp, 'awareness');
});
document.getElementById('concRingBtn').addEventListener('click', function() {
  showRankModal(concState.level, concState.xp, 'concentration');
});
document.getElementById('concHomeSymbol').addEventListener('click', function() {
  showRankModal(concState.level, concState.xp, 'concentration');
});
document.getElementById('concHomeSymbolFill').addEventListener('click', function() {
  showRankModal(concState.level, concState.xp, 'concentration');
});
document.getElementById('modeConcentration').addEventListener('click', function() { switchMode('concentration'); });
document.getElementById('modePrayer').addEventListener('click', function() { switchMode('guide'); });

// Boot: the app starts in whichever mode the body class already carries (Guide
// by default) without necessarily going through switchMode, so the canvas would
// otherwise stay the flat default until the first tab tap.
(function applyModeCanvasColorOnBoot() {
  var modes = ['guide', 'concentration', 'awareness', 'prayer'];
  for (var i = 0; i < modes.length; i++) {
    if (document.body.classList.contains('mode-' + modes[i])) {
      applyModeCanvasColor(modes[i]);
      return;
    }
  }
  applyModeCanvasColor('guide');
})();
