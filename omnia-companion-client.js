// Companion taps: the corgi jumps; the wisp spins; the ember crackle-pops;
// the mote winks. None of them morph the entity behind them.
var COMPANION_TAP_CLASS = { wisp:'wisp-spin', ember:'ember-pop', mote:'mote-wink' };
var COMPANION_IDLE_CLASS = { wisp:'wisp-loop', ember:'ember-flare', mote:'mote-scan' };
['guideOmniaCompanion', 'omniaCenterCompanion', 'pathBannerOmniaCompanion'].forEach(function(id) {
  var comp = document.getElementById(id);
  if (!comp) return;
  comp.addEventListener('click', function(e) {
    if (comp.classList.contains('companion-corgi')) {
      e.stopPropagation();
      comp.classList.remove('corgi-jumping');
      void comp.offsetWidth; // restart the animation on rapid taps
      comp.classList.add('corgi-jumping');
      return;
    }
    var tap = COMPANION_TAP_CLASS[comp.dataset.companion];
    if (!tap) return;
    e.stopPropagation();
    comp.classList.remove(tap, COMPANION_IDLE_CLASS[comp.dataset.companion]);
    void comp.offsetWidth;
    comp.classList.add(tap);
  });
  comp.addEventListener('animationend', function(e) {
    // Drop one-shot action classes so idle and tap animations can re-trigger
    if (e.animationName === 'wispSpin') comp.classList.remove('wisp-spin');
    if (e.animationName === 'wispLoop') comp.classList.remove('wisp-loop');
    if (e.animationName === 'emberPop') comp.classList.remove('ember-pop');
    if (e.animationName === 'emberFlare') comp.classList.remove('ember-flare');
    if (e.animationName === 'moteWink') comp.classList.remove('mote-wink');
    if (e.animationName === 'moteScan') comp.classList.remove('mote-scan');
    if (e.animationName !== 'omniaCorgiJump') return;
    comp.classList.remove('corgi-jumping');
    if (comp.dataset.jumpsLeft && parseInt(comp.dataset.jumpsLeft, 10) > 0) {
      comp.dataset.jumpsLeft = String(parseInt(comp.dataset.jumpsLeft, 10) - 1);
      void comp.offsetWidth;
      comp.classList.add('corgi-jumping');
    } else {
      delete comp.dataset.jumpsLeft;
    }
  });
  // Arrival at the far side: stop waddling, turn to face the entity, hop twice
  comp.addEventListener('transitionend', function(e) {
    if (e.propertyName !== 'left' || !comp.classList.contains('companion-corgi')) return;
    comp.classList.remove('corgi-walking');
    comp.classList.toggle('corgi-flip', !comp.classList.contains('corgi-left'));
    comp.dataset.jumpsLeft = '1';
    comp.classList.remove('corgi-jumping');
    void comp.offsetWidth;
    comp.classList.add('corgi-jumping');
  });
});

// Corgi wander: every 15s he trots to the other side of his entity,
// facing where he's going (head is drawn on the sprite's right side)
var _corgiWanderTimers = {};
function setupCorgiWander(comp, active) {
  if (_corgiWanderTimers[comp.id]) { clearInterval(_corgiWanderTimers[comp.id]); delete _corgiWanderTimers[comp.id]; }
  comp.classList.remove('corgi-left', 'corgi-walking');
  if (!active) { comp.classList.remove('corgi-flip'); return; }
  comp.classList.add('corgi-flip'); // starts on the right, facing in
  _corgiWanderTimers[comp.id] = setInterval(function() {
    if (!comp.classList.contains('companion-corgi')) return;
    comp.classList.add('corgi-walking');
    var goingLeft = !comp.classList.contains('corgi-left');
    comp.classList.toggle('corgi-left', goingLeft);
    comp.classList.toggle('corgi-flip', goingLeft);
    // Double-jump on each side-switch
    comp.classList.remove('corgi-jumping'); void comp.offsetWidth; comp.classList.add('corgi-jumping');
    setTimeout(function() {
      comp.classList.remove('corgi-jumping'); void comp.offsetWidth; comp.classList.add('corgi-jumping');
      setTimeout(function() { comp.classList.remove('corgi-jumping'); }, 650);
    }, 650);
  }, 10000);
}

// Non-corgi companion idle: every 10s the wisp loops the air, the ember
// flares and spits sparks, the mote's eye scans its surroundings.
var _companionIdleTimers = {};
function setupCompanionIdle(comp, companionId) {
  if (_companionIdleTimers[comp.id]) { clearInterval(_companionIdleTimers[comp.id]); delete _companionIdleTimers[comp.id]; }
  comp.classList.remove('wisp-loop', 'wisp-spin', 'ember-flare', 'ember-pop', 'mote-scan', 'mote-wink');
  var idleClass = COMPANION_IDLE_CLASS[companionId];
  if (!idleClass) return;
  _companionIdleTimers[comp.id] = setInterval(function() {
    if (comp.dataset.companion !== companionId) return;
    comp.classList.remove(idleClass);
    void comp.offsetWidth;
    comp.classList.add(idleClass);
  }, 10000);
}
