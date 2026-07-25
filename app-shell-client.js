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
