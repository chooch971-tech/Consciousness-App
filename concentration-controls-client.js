document.getElementById('concStopBtn').addEventListener('click', function() { stopConcentration(); });
document.getElementById('concStopBtn2').addEventListener('click', function() {
  // Bottom button is Begin during the pre-start instructions phase, Stop once
  // the countdown / clock has started.
  if (concPendingBegin) beginCountdown(); else stopConcentration();
});
document.getElementById('concHistoryBtn').addEventListener('click', function() { concHistoryFrom='home'; concHistoryFilter='all'; renderConcHistory(); showScreen('concHistoryScreen'); });

// The same origin must drive both the Back button and the interactive swipe.
// Otherwise the swipe controller reveals Home while Back ultimately restores
// the exercise setup, producing a visible Concentration → Clock flash.
function concHistoryPreviousScreen() {
  return concHistoryFrom === 'exSetupScreen' ? 'exSetupScreen' : 'homeScreen';
}

document.getElementById('concHistoryBack').addEventListener('click', function() {
  var previous = concHistoryPreviousScreen();
  showScreen(previous);
  if (previous === 'homeScreen') switchMode('concentration');
});
document.getElementById('concSaveBtn').addEventListener('click', saveConcResult);
