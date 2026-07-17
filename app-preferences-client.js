'use strict';

// Shared user preferences that are consumed by multiple runtime modules.
var OMNIA_CANDOR_NAMES = {
  1: 'Encouraging mentor',
  2: 'Honest but kind',
  3: 'Direct coach',
  4: 'Demanding teacher',
  5: 'Pitiless'
};

function getOmniaCandor() {
  var value = parseInt(localStorage.getItem('presence_omnia_candor'), 10);
  if (!Number.isFinite(value) || value < 1 || value > 5) value = 1;
  return value;
}

function syncOmniaCandorUI() {
  var value = getOmniaCandor();
  var slider = document.getElementById('omniaCandorSlider');
  var valueLabel = document.getElementById('omniaCandorValue');
  var name = document.getElementById('omniaCandorName');
  if (slider) slider.value = value;
  if (valueLabel) valueLabel.textContent = value;
  if (name) name.textContent = OMNIA_CANDOR_NAMES[value];
}

(function bindOmniaCandorControl() {
  var slider = document.getElementById('omniaCandorSlider');
  if (!slider) return;
  slider.addEventListener('input', function() {
    var value = parseInt(this.value, 10) || 1;
    try { localStorage.setItem('presence_omnia_candor', String(value)); } catch (e) {}
    var valueLabel = document.getElementById('omniaCandorValue');
    var name = document.getElementById('omniaCandorName');
    if (valueLabel) valueLabel.textContent = value;
    if (name) name.textContent = OMNIA_CANDOR_NAMES[value];
  });
})();

window.appSoundEnabled = function() {
  return localStorage.getItem('presence_sound_enabled') !== '0';
};

window.setAppSoundEnabled = function(enabled) {
  try { localStorage.setItem('presence_sound_enabled', enabled ? '1' : '0'); } catch (e) {}
};

(function unlockAudioOnFirstInteraction() {
  var unlocked = false;
  function unlock() {
    if (unlocked) return;
    unlocked = true;
    window._appAudioUnlocked = true;
    try {
      var AudioContextCtor = window.AudioContext || window.webkitAudioContext;
      if (AudioContextCtor) {
        var context = window._appAudioCtx || (window._appAudioCtx = new AudioContextCtor());
        if (context.state === 'suspended') context.resume().catch(function() {});
        // A silent in-gesture sample satisfies iOS's audio activation rule.
        var source = context.createBufferSource();
        source.buffer = context.createBuffer(1, 1, 22050);
        source.connect(context.destination);
        source.start(0);
      }
    } catch (e) {}
    ['pointerdown', 'touchend', 'click', 'keydown'].forEach(function(eventName) {
      document.removeEventListener(eventName, unlock, true);
    });
  }
  ['pointerdown', 'touchend', 'click', 'keydown'].forEach(function(eventName) {
    document.addEventListener(eventName, unlock, true);
  });
})();

(function bindSoundControl() {
  var button = document.getElementById('settingsSoundToggle');
  var indicator = document.getElementById('settingsSoundSwitch');
  if (!button || !indicator) return;
  function render() { indicator.classList.toggle('on', appSoundEnabled()); }
  render();
  button.addEventListener('click', function() {
    setAppSoundEnabled(!appSoundEnabled());
    render();
    if (appSoundEnabled() && typeof playReminderBell === 'function') {
      try { playReminderBell(); } catch (e) {}
    }
  });
})();
