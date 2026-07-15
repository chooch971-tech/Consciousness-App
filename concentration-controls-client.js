document.getElementById('concStopBtn').addEventListener('click', function() { stopConcentration(); });
document.getElementById('concStopBtn2').addEventListener('click', function() {
  // Bottom button is Begin during the pre-start instructions phase, Stop once
  // the countdown / clock has started.
  if (concPendingBegin) beginCountdown(); else stopConcentration();
});
document.getElementById('concHistoryBtn').addEventListener('click', function() { concHistoryFrom='home'; concHistoryFilter='all'; renderConcHistory(); showScreen('concHistoryScreen'); });
document.getElementById('concHistoryBack').addEventListener('click', function() {
  if (concHistoryFrom === 'exSetupScreen') {
    showScreen('exSetupScreen');
  } else {
    showScreen('homeScreen');
    switchMode('concentration');
  }
});
document.getElementById('concSaveBtn').addEventListener('click', saveConcResult);
