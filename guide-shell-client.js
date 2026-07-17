'use strict';

// Guide shell behavior: entering the Guide, route controls, tab tips, and
// horizontal navigation. Adaptive planning and quest logic remain in their
// dedicated Guide clients.
function openGuide() {
  guideState = loadGuideState();
  guidePathMode = guideState._pathModeV2 || 'beginner';
  var assessment = document.getElementById('guideAssessmentPanel');
  if (assessment) assessment.style.display = 'none';
  document.getElementById('guidePlanOutput').style.display = 'none';
  renderGuideExRows();
  renderOmniaEngine();
  if (!guideState._pathLockedV2) setGuidePathMode(guidePathMode, true);
  setGuidePathMode(guidePathMode);
  renderGuidePlan(guidePathMode, true);
  renderPathQuests();
  switchGuideTab('path');
  scheduleGuidePathLayoutRefresh(true);
}

document.getElementById('guideBeginnerPathBtn').addEventListener('click', function() {
  showGuidePathConfirmation('beginner');
});

document.getElementById('guideExperiencedPathBtn').addEventListener('click', function() {
  showGuidePathConfirmation('experienced');
});

document.getElementById('guideGenerateBtn').addEventListener('click', function() {
  commitGuidePath('experienced');
});

function toggleGuideTwoADay() {
  guideState._twoADayV1 = !guideTwoADayEnabled();
  saveGuideState(guideState);
  renderGuideCadenceControl();
  if (guideState._pathLockedV2 && guidePathMode) renderGuidePlan(guidePathMode, true);
  if (document.getElementById('pathQuestRoot')) renderPathQuests();
}

document.getElementById('guideTwoADayBtn').addEventListener('click', toggleGuideTwoADay);
document.getElementById('guideConfirmTwoADayBtn').addEventListener('click', toggleGuideTwoADay);
document.getElementById('guidePlanTwoADayBtn').addEventListener('click', toggleGuideTwoADay);
document.getElementById('guideConfirmBackBtn').addEventListener('click', showGuideRouteChoice);
document.getElementById('guideConfirmCommitBtn').addEventListener('click', function() {
  commitGuidePath(guidePendingPathMode || guidePathMode || 'beginner');
});

document.getElementById('guidePlanCards').addEventListener('click', function(event) {
  var button = event.target.closest('.guide-plan-start');
  if (button) beginGuidePlanItem(button);
});

document.querySelectorAll('.guide-dot[data-tab]').forEach(function(dot) {
  dot.addEventListener('click', function() {
    switchGuideTab(this.dataset.tab);
  });
});

var _guideTabTipShown = (function() {
  try { return JSON.parse(localStorage.getItem('presence_guide_tips_seen') || '{}'); } catch (e) { return {}; }
})();

function _showGuideTabTip(tab) {
  if (_guideTabTipShown[tab]) return;
  var tipId = tab === 'omnia' ? 'tutOmniaTip' : 'tutTreeTip';
  var element = document.getElementById(tipId);
  if (!element) return;
  element.style.display = 'block';
  setTimeout(function() { element.classList.add('tut-ct-show'); }, 60);
  var timer = setTimeout(function() { _hideGuideTabTip(element, tab); }, 7000);
  element.querySelector('button').onclick = function() { clearTimeout(timer); _hideGuideTabTip(element, tab); };
}

function _hideGuideTabTip(element, tab) {
  if (tab) {
    _guideTabTipShown[tab] = true;
    try { localStorage.setItem('presence_guide_tips_seen', JSON.stringify(_guideTabTipShown)); } catch (e) {}
  }
  element.classList.remove('tut-ct-show');
  setTimeout(function() { element.style.display = 'none'; }, 500);
}

(function bindGuideTabSwipe() {
  var panel = document.getElementById('guidePanel');
  var startX;
  var startY;
  var dragging;
  var tabOrder = ['path', 'omnia', 'tree'];
  function handleStart(x, y) { startX = x; startY = y; dragging = false; }
  function handleMove(x, y) {
    if (startX == null) return;
    var dx = x - startX;
    var dy = y - startY;
    if (!dragging && Math.abs(dy) > Math.abs(dx)) { startX = null; return; }
    dragging = true;
  }
  function handleEnd(x) {
    if (startX == null || !dragging) return;
    var dx = x - startX;
    startX = null;
    dragging = false;
    if (Math.abs(dx) < 40) return;
    var index = tabOrder.indexOf(guideActiveTab);
    if (dx < 0 && index < tabOrder.length - 1) switchGuideTab(tabOrder[index + 1]);
    else if (dx > 0 && index > 0) switchGuideTab(tabOrder[index - 1]);
  }
  panel.addEventListener('touchstart', function(event) { handleStart(event.touches[0].clientX, event.touches[0].clientY); }, { passive: true });
  panel.addEventListener('touchmove', function(event) { handleMove(event.touches[0].clientX, event.touches[0].clientY); }, { passive: true });
  panel.addEventListener('touchend', function(event) { handleEnd(event.changedTouches[0].clientX); }, { passive: true });
  panel.addEventListener('mousedown', function(event) { handleStart(event.clientX, event.clientY); });
  panel.addEventListener('mousemove', function(event) { if (startX != null) handleMove(event.clientX, event.clientY); });
  panel.addEventListener('mouseup', function(event) { handleEnd(event.clientX); });
  panel.addEventListener('mouseleave', function() { startX = null; dragging = false; });
})();
