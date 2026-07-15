// ═══════════════════════════════════════
// AUDITORY CONCENTRATION EXERCISE
// ═══════════════════════════════════════

var SOUNDS = [
  { id:'gong',         label:'Gong',          icon:'&#128276;' },
  { id:'bowl',         label:'Singing Bowl',  icon:'&#9679;'   },
  { id:'creek',        label:'Creek',         icon:'&#127754;' },
  { id:'rain',         label:'Rain',          icon:'&#127783;' },
  { id:'bell',         label:'Bell',          icon:'&#128276;' },
  { id:'om',           label:'Om Drone',      icon:'&#9055;'   },
  { id:'binaural',     label:'Binaural',      icon:'&#127911;' },
  { id:'pulse',        label:'Soft Pulse',    icon:'&#11835;'  },
  { id:'psychedelic',  label:'Psychedelic',   icon:'&#127775;' },
  { id:'ocean',        label:'Ocean Waves',   icon:'&#127754;' },
  { id:'wind',         label:'Wind',          icon:'&#127788;' },
  { id:'fire',         label:'Crackling Fire',icon:'&#128293;' },
  { id:'chimes',       label:'Wind Chimes',   icon:'&#127888;' },
  { id:'crickets',     label:'Night Crickets',icon:'&#129431;' },
  { id:'brown',        label:'Brown Noise',   icon:'&#128996;' },
  { id:'white',        label:'White Noise',   icon:'&#9898;'   },
  { id:'theta',        label:'Theta Waves',   icon:'&#129504;' },
  { id:'freeplay',    label:'My Music — Stopwatch Mode', icon:'&#9836;' },
];

var audCtx = null;
var audNodes = []; // active audio nodes to stop
var audLoopHandle = null;
var currentSound = 'bowl';
var customAudElement = null; // <audio> element for custom uploaded sounds
var customAudObjectUrl = null; // object URL for IndexedDB blob playback (must be revoked)
var _customSoundToken = 0; // cancels stale async blob loads
var audSessionStartTime = null;
var audRepStartTime = null;
var audTimerHandle = null;
var audReps = [];
var audHalts = 0;
var audRepActive = false;
var audWaveHandle = null;

function getAudCtx() {
  if (!audCtx || audCtx.state === 'closed') {
    audCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audCtx.state === 'suspended') audCtx.resume();
  return audCtx;
}

// ── Sound generators ──────────────────────────────────────

function stopAllAudio() {
  audNodes.forEach(function(n) { try { n.stop(); } catch(e) {} });
  audNodes = [];
  if (audLoopHandle) { clearTimeout(audLoopHandle); audLoopHandle = null; }
  _customSoundToken++; // cancel any in-flight blob load
  if (customAudElement) { customAudElement.pause(); customAudElement.src = ''; customAudElement = null; }
  if (customAudObjectUrl) { try { URL.revokeObjectURL(customAudObjectUrl); } catch(e) {} customAudObjectUrl = null; }
}

function playGong(ctx, when, volume) {
  volume = volume || 0.5;
  var duration = 4.0;
  var gain = ctx.createGain();
  gain.gain.setValueAtTime(volume, when);
  gain.gain.exponentialRampToValueAtTime(0.001, when + duration);
  gain.connect(ctx.destination);
  [80, 160, 240, 320].forEach(function(freq, i) {
    var osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = freq;
    var g2 = ctx.createGain();
    g2.gain.setValueAtTime(volume / (i + 1), when);
    g2.gain.exponentialRampToValueAtTime(0.001, when + duration * (1 - i * 0.1));
    osc.connect(g2); g2.connect(ctx.destination);
    osc.start(when); osc.stop(when + duration);
    audNodes.push(osc);
  });
}

function playBowl(ctx, when) {
  // Singing bowl — sustained resonant tone with slow tremolo
  var fundamental = 432;
  var duration = 6.0;
  [fundamental, fundamental * 2.756, fundamental * 5.0].forEach(function(freq, i) {
    var osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = freq;
    var lfo = ctx.createOscillator();
    lfo.frequency.value = 0.3 + i * 0.1;
    var lfoGain = ctx.createGain();
    lfoGain.gain.value = 1.5;
    lfo.connect(lfoGain); lfoGain.connect(osc.frequency);
    var gain = ctx.createGain();
    gain.gain.setValueAtTime(0.001, when);
    gain.gain.linearRampToValueAtTime(0.25 / (i + 1), when + 0.3);
    gain.gain.exponentialRampToValueAtTime(0.001, when + duration);
    osc.connect(gain); gain.connect(ctx.destination);
    osc.start(when); osc.stop(when + duration);
    lfo.start(when); lfo.stop(when + duration);
    audNodes.push(osc); audNodes.push(lfo);
  });
}

function playCreek(ctx, when, duration) {
  // Creek — filtered noise with burble
  duration = duration || 8;
  var bufSize = ctx.sampleRate * duration;
  var buf = ctx.createBuffer(2, bufSize, ctx.sampleRate);
  for (var c = 0; c < 2; c++) {
    var data = buf.getChannelData(c);
    var b0=0,b1=0,b2=0,b3=0,b4=0,b5=0,b6=0;
    for (var i = 0; i < bufSize; i++) {
      var white = Math.random() * 2 - 1;
      b0=.99886*b0+white*.0555179; b1=.99332*b1+white*.0750759;
      b2=.96900*b2+white*.1538520; b3=.86650*b3+white*.3104856;
      b4=.55000*b4+white*.5329522; b5=-.7616*b5-white*.0168980;
      data[i] = (b0+b1+b2+b3+b4+b5+b6+white*.5362) * 0.11;
      b6 = white * 0.115926;
    }
  }
  var src = ctx.createBufferSource();
  src.buffer = buf;
  src.loop = true;
  var filter = ctx.createBiquadFilter();
  filter.type = 'bandpass'; filter.frequency.value = 600; filter.Q.value = 0.5;
  var gain = ctx.createGain(); gain.gain.value = 0.4;
  src.connect(filter); filter.connect(gain); gain.connect(ctx.destination);
  src.start(when);
  audNodes.push(src);
}

function playRain(ctx, when, duration) {
  duration = duration || 8;
  var bufSize = ctx.sampleRate * duration;
  var buf = ctx.createBuffer(2, bufSize, ctx.sampleRate);
  for (var c = 0; c < 2; c++) {
    var data = buf.getChannelData(c);
    for (var i = 0; i < bufSize; i++) { data[i] = (Math.random() * 2 - 1) * 0.15; }
  }
  var src = ctx.createBufferSource(); src.buffer = buf; src.loop = true;
  var filter = ctx.createBiquadFilter(); filter.type = 'highpass'; filter.frequency.value = 1200;
  var gain = ctx.createGain(); gain.gain.value = 0.35;
  src.connect(filter); filter.connect(gain); gain.connect(ctx.destination);
  src.start(when); audNodes.push(src);
}

function playBell(ctx, when) {
  var freqs = [440, 880, 1320, 2200];
  freqs.forEach(function(freq, i) {
    var osc = ctx.createOscillator(); osc.type = 'sine'; osc.frequency.value = freq;
    var gain = ctx.createGain();
    gain.gain.setValueAtTime(0.3 / (i + 1), when);
    gain.gain.exponentialRampToValueAtTime(0.001, when + 3.0 - i * 0.4);
    osc.connect(gain); gain.connect(ctx.destination);
    osc.start(when); osc.stop(when + 3.0);
    audNodes.push(osc);
  });
}

function playOm(ctx, when) {
  // Om drone — fundamental + overtones with slow beating
  var fundamental = 136.1; // OM frequency (C#)
  [1, 2, 3, 4, 5].forEach(function(harmonic) {
    var osc = ctx.createOscillator(); osc.type = 'sine';
    osc.frequency.value = fundamental * harmonic + (Math.random() * 0.3);
    var gain = ctx.createGain(); gain.gain.value = 0.15 / harmonic;
    osc.connect(gain); gain.connect(ctx.destination);
    osc.start(when);
    audNodes.push(osc);
  });
}

function playBinaural(ctx, when) {
  // 10Hz alpha binaural — 200Hz left, 210Hz right
  var gainL = ctx.createGain(); gainL.gain.value = 0.2;
  var gainR = ctx.createGain(); gainR.gain.value = 0.2;
  var merger = ctx.createChannelMerger(2);
  gainL.connect(merger, 0, 0); gainR.connect(merger, 0, 1);
  merger.connect(ctx.destination);
  var oscL = ctx.createOscillator(); oscL.type = 'sine'; oscL.frequency.value = 200;
  var oscR = ctx.createOscillator(); oscR.type = 'sine'; oscR.frequency.value = 210;
  oscL.connect(gainL); oscR.connect(gainR);
  oscL.start(when); oscR.start(when);
  audNodes.push(oscL); audNodes.push(oscR);
}

function playPulse(ctx, when) {
  // Soft periodic pulse every 4 seconds
  function firePulse() {
    if (!audCtx || audCtx.state === 'closed') return;
    var osc = ctx.createOscillator(); osc.type = 'sine'; osc.frequency.value = 528;
    var gain = ctx.createGain();
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.15, ctx.currentTime + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.5);
    osc.connect(gain); gain.connect(ctx.destination);
    osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 1.5);
    audNodes.push(osc);
    audLoopHandle = setTimeout(firePulse, 4000);
  }
  audLoopHandle = setTimeout(firePulse, 100);
}

function playPsychedelic(ctx, when) {
  // Psychedelic buzz — multiple detuned oscillators with ring mod, LFO wobble,
  // slowly drifting frequencies and overtone clusters

  var masterGain = ctx.createGain();
  masterGain.gain.setValueAtTime(0, when);
  masterGain.gain.linearRampToValueAtTime(0.3, when + 2.0);
  masterGain.connect(ctx.destination);

  // Core drone layers — slightly detuned from each other to create beating
  var baseFreqs = [55, 55.4, 110, 110.7, 165, 220, 220.9];
  baseFreqs.forEach(function(freq, i) {
    var osc = ctx.createOscillator();
    osc.type = i % 2 === 0 ? 'sawtooth' : 'square';
    osc.frequency.value = freq;

    // Slow frequency drift
    osc.frequency.linearRampToValueAtTime(freq * (1 + 0.008 * Math.sin(i)), when + 8);
    osc.frequency.linearRampToValueAtTime(freq * (1 - 0.005 * Math.cos(i)), when + 16);

    var g = ctx.createGain();
    g.gain.value = 0.07 / (i * 0.4 + 1);

    // Each layer gets its own low-pass filter to soften the buzz
    var filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 800 + i * 200;
    filter.Q.value = 2 + i * 0.5;

    osc.connect(filter);
    filter.connect(g);
    g.connect(masterGain);
    osc.start(when);
    audNodes.push(osc);
  });

  // LFO cluster — 3 LFOs at different rates modulating pitch of a carrier
  [0.12, 0.31, 0.73].forEach(function(rate, i) {
    var carrier = ctx.createOscillator();
    carrier.type = 'sine';
    carrier.frequency.value = 432 + i * 111;

    var lfo = ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = rate;

    var lfoDepth = ctx.createGain();
    lfoDepth.gain.value = 18 + i * 7;

    lfo.connect(lfoDepth);
    lfoDepth.connect(carrier.frequency);

    var cGain = ctx.createGain();
    cGain.gain.value = 0.04;

    carrier.connect(cGain);
    cGain.connect(masterGain);

    carrier.start(when);
    lfo.start(when);
    audNodes.push(carrier);
    audNodes.push(lfo);
  });

  // Ring modulator — creates metallic, buzzing sidebands
  var ringCarrier = ctx.createOscillator();
  ringCarrier.type = 'sine';
  ringCarrier.frequency.value = 83; // modulation frequency

  var ringMod = ctx.createGain();
  ringMod.gain.value = 0; // starts silent, modulated by ring carrier

  var ringSource = ctx.createOscillator();
  ringSource.type = 'sawtooth';
  ringSource.frequency.value = 137; // base pitch for ring mod

  var ringGain = ctx.createGain();
  ringGain.gain.value = 0.08;

  ringCarrier.connect(ringMod.gain);
  ringSource.connect(ringMod);
  ringMod.connect(ringGain);
  ringGain.connect(masterGain);

  ringCarrier.start(when);
  ringSource.start(when);
  audNodes.push(ringCarrier);
  audNodes.push(ringSource);

  // High shimmer layer — very quiet upper harmonics for brightness
  [880, 1320, 1760].forEach(function(freq) {
    var shimmer = ctx.createOscillator();
    shimmer.type = 'sine';
    shimmer.frequency.value = freq;

    var shimLfo = ctx.createOscillator();
    shimLfo.frequency.value = 0.2 + Math.random() * 0.3;
    var shimDepth = ctx.createGain();
    shimDepth.gain.value = 3;
    shimLfo.connect(shimDepth);
    shimDepth.connect(shimmer.frequency);

    var shimGain = ctx.createGain();
    shimGain.gain.value = 0.015;
    shimmer.connect(shimGain);
    shimGain.connect(masterGain);

    shimmer.start(when);
    shimLfo.start(when);
    audNodes.push(shimmer);
    audNodes.push(shimLfo);
  });
}

function playOcean(ctx, when, duration) {
  // Ocean waves — brown noise through a lowpass, with a slow swell LFO on gain
  duration = duration || 10;
  var bufSize = ctx.sampleRate * duration;
  var buf = ctx.createBuffer(2, bufSize, ctx.sampleRate);
  for (var c = 0; c < 2; c++) {
    var d = buf.getChannelData(c); var last = 0;
    for (var i = 0; i < bufSize; i++) { var w = Math.random() * 2 - 1; last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; }
  }
  var src = ctx.createBufferSource(); src.buffer = buf; src.loop = true;
  var filter = ctx.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = 500;
  var gain = ctx.createGain(); gain.gain.value = 0.4;
  var lfo = ctx.createOscillator(); lfo.frequency.value = 0.08;
  var lfoGain = ctx.createGain(); lfoGain.gain.value = 0.25;
  lfo.connect(lfoGain); lfoGain.connect(gain.gain);
  src.connect(filter); filter.connect(gain); gain.connect(ctx.destination);
  src.start(when); lfo.start(when);
  audNodes.push(src); audNodes.push(lfo);
}

function playWind(ctx, when, duration) {
  // Wind — white noise through a sweeping bandpass
  duration = duration || 8;
  var bufSize = ctx.sampleRate * duration;
  var buf = ctx.createBuffer(2, bufSize, ctx.sampleRate);
  for (var c = 0; c < 2; c++) { var d = buf.getChannelData(c); for (var i = 0; i < bufSize; i++) { d[i] = (Math.random() * 2 - 1) * 0.5; } }
  var src = ctx.createBufferSource(); src.buffer = buf; src.loop = true;
  var filter = ctx.createBiquadFilter(); filter.type = 'bandpass'; filter.frequency.value = 500; filter.Q.value = 1.2;
  var lfo = ctx.createOscillator(); lfo.frequency.value = 0.15;
  var lfoGain = ctx.createGain(); lfoGain.gain.value = 350;
  lfo.connect(lfoGain); lfoGain.connect(filter.frequency);
  var gain = ctx.createGain(); gain.gain.value = 0.3;
  src.connect(filter); filter.connect(gain); gain.connect(ctx.destination);
  src.start(when); lfo.start(when);
  audNodes.push(src); audNodes.push(lfo);
}

function playFire(ctx, when, duration) {
  // Crackling fire — a lowpassed brown-noise bed plus randomly scheduled pops
  duration = duration || 6;
  var bufSize = ctx.sampleRate * duration;
  var buf = ctx.createBuffer(2, bufSize, ctx.sampleRate);
  for (var c = 0; c < 2; c++) {
    var d = buf.getChannelData(c); var last = 0;
    for (var i = 0; i < bufSize; i++) { var w = Math.random() * 2 - 1; last = (last + 0.02 * w) / 1.02; d[i] = last * 2.2; }
  }
  var src = ctx.createBufferSource(); src.buffer = buf; src.loop = true;
  var filter = ctx.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = 420;
  var gain = ctx.createGain(); gain.gain.value = 0.35;
  src.connect(filter); filter.connect(gain); gain.connect(ctx.destination);
  src.start(when); audNodes.push(src);
  function crackle() {
    if (!audCtx || audCtx.state === 'closed') return;
    var n = 1 + Math.floor(Math.random() * 3);
    for (var k = 0; k < n; k++) {
      var t = ctx.currentTime + Math.random() * 0.25;
      var osc = ctx.createOscillator(); osc.type = 'triangle';
      osc.frequency.value = 600 + Math.random() * 1800;
      var g = ctx.createGain();
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.08 + Math.random() * 0.12, t + 0.005);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
      osc.connect(g); g.connect(ctx.destination);
      osc.start(t); osc.stop(t + 0.08);
      audNodes.push(osc);
    }
    audLoopHandle = setTimeout(crackle, 200 + Math.random() * 400);
  }
  audLoopHandle = setTimeout(crackle, 150);
}

function playChimes(ctx, when) {
  // Wind chimes — random pentatonic bell tones with shimmering overtones
  var scale = [523.25, 587.33, 659.25, 783.99, 880.00, 1046.50];
  function chime() {
    if (!audCtx || audCtx.state === 'closed') return;
    var n = 1 + Math.floor(Math.random() * 2);
    for (var k = 0; k < n; k++) {
      var t = ctx.currentTime + Math.random() * 0.4;
      var f = scale[Math.floor(Math.random() * scale.length)];
      [1, 2.01, 3.03].forEach(function(mult, i) {
        var osc = ctx.createOscillator(); osc.type = 'sine'; osc.frequency.value = f * mult;
        var g = ctx.createGain();
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(0.18 / (i + 1), t + 0.01);
        g.gain.exponentialRampToValueAtTime(0.001, t + 2.4 - i * 0.5);
        osc.connect(g); g.connect(ctx.destination);
        osc.start(t); osc.stop(t + 2.6);
        audNodes.push(osc);
      });
    }
    audLoopHandle = setTimeout(chime, 900 + Math.random() * 1600);
  }
  chime();
}

function playCrickets(ctx, when, duration) {
  // Night crickets — a faint high-air bed plus rhythmic chirp trains
  duration = duration || 6;
  var bufSize = ctx.sampleRate * duration;
  var buf = ctx.createBuffer(2, bufSize, ctx.sampleRate);
  for (var c = 0; c < 2; c++) { var d = buf.getChannelData(c); for (var i = 0; i < bufSize; i++) { d[i] = (Math.random() * 2 - 1) * 0.04; } }
  var src = ctx.createBufferSource(); src.buffer = buf; src.loop = true;
  var hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 4000;
  var bgGain = ctx.createGain(); bgGain.gain.value = 0.5;
  src.connect(hp); hp.connect(bgGain); bgGain.connect(ctx.destination);
  src.start(when); audNodes.push(src);
  function chirp() {
    if (!audCtx || audCtx.state === 'closed') return;
    var t0 = ctx.currentTime + 0.02;
    for (var p = 0; p < 14; p++) {
      var t = t0 + p * 0.018;
      var osc = ctx.createOscillator(); osc.type = 'square';
      osc.frequency.value = 4500 + Math.random() * 300;
      var g = ctx.createGain();
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.05, t + 0.002);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.012);
      osc.connect(g); g.connect(ctx.destination);
      osc.start(t); osc.stop(t + 0.015);
      audNodes.push(osc);
    }
    audLoopHandle = setTimeout(chirp, 350 + Math.random() * 250);
  }
  audLoopHandle = setTimeout(chirp, 200);
}

function playBrownNoise(ctx, when, duration) {
  // Brown noise — integrated white noise, heavier on the low end
  duration = duration || 8;
  var bufSize = ctx.sampleRate * duration;
  var buf = ctx.createBuffer(2, bufSize, ctx.sampleRate);
  for (var c = 0; c < 2; c++) {
    var d = buf.getChannelData(c); var last = 0;
    for (var i = 0; i < bufSize; i++) { var w = Math.random() * 2 - 1; last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; }
  }
  var src = ctx.createBufferSource(); src.buffer = buf; src.loop = true;
  var gain = ctx.createGain(); gain.gain.value = 0.4;
  src.connect(gain); gain.connect(ctx.destination);
  src.start(when); audNodes.push(src);
}

function playWhiteNoise(ctx, when, duration) {
  // White noise — full-spectrum hiss
  duration = duration || 8;
  var bufSize = ctx.sampleRate * duration;
  var buf = ctx.createBuffer(2, bufSize, ctx.sampleRate);
  for (var c = 0; c < 2; c++) { var d = buf.getChannelData(c); for (var i = 0; i < bufSize; i++) { d[i] = (Math.random() * 2 - 1) * 0.18; } }
  var src = ctx.createBufferSource(); src.buffer = buf; src.loop = true;
  var gain = ctx.createGain(); gain.gain.value = 0.3;
  src.connect(gain); gain.connect(ctx.destination);
  src.start(when); audNodes.push(src);
}

function playTheta(ctx, when) {
  // Theta waves — 6Hz binaural beat (200Hz left, 206Hz right) for deep calm
  var gainL = ctx.createGain(); gainL.gain.value = 0.2;
  var gainR = ctx.createGain(); gainR.gain.value = 0.2;
  var merger = ctx.createChannelMerger(2);
  gainL.connect(merger, 0, 0); gainR.connect(merger, 0, 1);
  merger.connect(ctx.destination);
  var oscL = ctx.createOscillator(); oscL.type = 'sine'; oscL.frequency.value = 200;
  var oscR = ctx.createOscillator(); oscR.type = 'sine'; oscR.frequency.value = 206;
  oscL.connect(gainL); oscR.connect(gainR);
  oscL.start(when); oscR.start(when);
  audNodes.push(oscL); audNodes.push(oscR);
}

// Sustained sounds need looping
var SUSTAINED_SOUNDS = ['creek', 'rain', 'om', 'binaural', 'psychedelic', 'ocean', 'wind', 'fire', 'crickets', 'brown', 'white', 'theta'];

function _startCustomAudio(src, isObjectUrl) {
  var audio = new Audio(src);
  audio.loop = true;
  audio.volume = 0.75;
  audio.play().catch(function() { showToast('Could not play that audio'); });
  customAudElement = audio;
  if (isObjectUrl) customAudObjectUrl = src;
}
function playCustomSound(id) {
  var sounds = loadCustomAudSounds();
  var sound = sounds.find(function(s) { return s.id === id; });
  if (!sound) return;
  // Direct link or legacy inline data URL — play synchronously.
  if (sound.url || sound.dataUrl) { _startCustomAudio(sound.url || sound.dataUrl, false); return; }
  // Uploaded blob lives in IndexedDB — load it, then play if still current.
  var token = ++_customSoundToken;
  audDbGet(id).then(function(blob) {
    if (token !== _customSoundToken) return; // superseded by another selection/stop
    if (!blob) { showToast('Sound not found — try re-uploading'); return; }
    _startCustomAudio(URL.createObjectURL(blob), true);
  }).catch(function() {
    if (token === _customSoundToken) showToast('Could not load that sound');
  });
}

function playSound(soundId) {
  if (soundId === 'freeplay') return;
  stopAllAudio();
  if (soundId.indexOf('custom_') === 0) {
    playCustomSound(soundId);
    return;
  }
  var ctx = getAudCtx();
  var when = ctx.currentTime + 0.05;

  if (soundId === 'gong') {
    function loopGong() {
      playGong(ctx, ctx.currentTime + 0.05);
      audLoopHandle = setTimeout(loopGong, 5000);
    }
    loopGong();
  } else if (soundId === 'bowl') {
    function loopBowl() {
      playBowl(ctx, ctx.currentTime + 0.05);
      audLoopHandle = setTimeout(loopBowl, 6500);
    }
    loopBowl();
  } else if (soundId === 'creek') {
    playCreek(ctx, when);
  } else if (soundId === 'rain') {
    playRain(ctx, when);
  } else if (soundId === 'bell') {
    function loopBell() {
      playBell(ctx, ctx.currentTime + 0.05);
      audLoopHandle = setTimeout(loopBell, 4000);
    }
    loopBell();
  } else if (soundId === 'om') {
    playOm(ctx, when);
  } else if (soundId === 'binaural') {
    playBinaural(ctx, when);
  } else if (soundId === 'pulse') {
    playPulse(ctx, when);
  } else if (soundId === 'psychedelic') {
    playPsychedelic(ctx, when);
  } else if (soundId === 'ocean') {
    playOcean(ctx, when);
  } else if (soundId === 'wind') {
    playWind(ctx, when);
  } else if (soundId === 'fire') {
    playFire(ctx, when);
  } else if (soundId === 'chimes') {
    playChimes(ctx, when);
  } else if (soundId === 'crickets') {
    playCrickets(ctx, when);
  } else if (soundId === 'brown') {
    playBrownNoise(ctx, when);
  } else if (soundId === 'white') {
    playWhiteNoise(ctx, when);
  } else if (soundId === 'theta') {
    playTheta(ctx, when);
  }
}

// ── Waveform animation ────────────────────────────────────
function startWaveAnimation() {
  var bars = document.querySelectorAll('#audWave .aud-bar');
  function animateBars() {
    bars.forEach(function(bar) {
      var h = 8 + Math.random() * 36;
      bar.style.height = h + 'px';
    });
    audWaveHandle = setTimeout(animateBars, 120);
  }
  animateBars();
}
function stopWaveAnimation() {
  if (audWaveHandle) { clearTimeout(audWaveHandle); audWaveHandle = null; }
  var bars = document.querySelectorAll('#audWave .aud-bar');
  bars.forEach(function(bar) { bar.style.height = '6px'; });
}

// ── Home screen — sound selector ─────────────────────────
// Per-sound accent colour + line-art SVG icon (24×24, stroke:currentColor).
// _custom / _url cover uploaded files and pasted links.
var AUD_SOUND_ART = {
  gong:        ['#e8c078', '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none"/>'],
  bowl:        ['#d4956e', '<path d="M4 11c0 3.8 3.6 6.8 8 6.8s8-3 8-6.8H4z"/><path d="M9 21h6"/><path d="M18.5 4.5 21 7"/>'],
  creek:       ['#7ec8d8', '<path d="M3 9c2-2.4 4-2.4 6 0s4 2.4 6 0 4-2.4 6 0"/><path d="M3 15c2-2.4 4-2.4 6 0s4 2.4 6 0 4-2.4 6 0"/>'],
  rain:        ['#8aa8d8', '<path d="M7 13a5 5 0 1 1 1-9.9A6 6 0 0 1 19.5 6 4 4 0 0 1 18 13.5H7z"/><path d="M8 17l-1.2 3M13 17l-1.2 3M18 17l-1.2 3"/>'],
  bell:        ['#e8d080', '<path d="M12 4a5.5 5.5 0 0 1 5.5 5.5c0 3 .8 4.6 1.8 5.7H4.7c1-1.1 1.8-2.7 1.8-5.7A5.5 5.5 0 0 1 12 4z"/><circle cx="12" cy="18.6" r="1.5"/><path d="M12 2.2v1.6"/>'],
  om:          ['#c4a8e0', '<circle cx="5.5" cy="12" r="1.3" fill="currentColor" stroke="none"/><path d="M8.5 9a4.4 4.4 0 0 1 0 6"/><path d="M11.5 6.5a8.2 8.2 0 0 1 0 11"/><path d="M14.5 4a12.2 12.2 0 0 1 0 16"/>'],
  binaural:    ['#a89ce8', '<path d="M4 16v-3a8 8 0 0 1 16 0v3"/><rect x="3" y="14.5" width="4" height="6" rx="1.6"/><rect x="17" y="14.5" width="4" height="6" rx="1.6"/>'],
  pulse:       ['#7eb8a4', '<path d="M2 12h4.2l2.3-5.6 3.3 11.2 2.5-5.6H22"/>'],
  psychedelic: ['#e08ac0', '<path d="M12 12c.9 0 1.4.8 1.1 1.6-.4 1.1-1.6 1.7-2.8 1.3-1.9-.6-2.8-2.6-2.1-4.5.9-2.6 3.7-4 6.2-3 3.4 1.3 5.1 5 3.8 8.4-1.6 4.2-6.3 6.3-10.4 4.7"/>'],
  ocean:       ['#6aaede', '<path d="M2 16.5c2.6 0 2.6-6.5 7.6-6.5 3.4 0 4.7 3 3.2 4.7-1.1 1.2-3.1.7-3.2-.9"/><path d="M2 20h20"/>'],
  wind:        ['#9cc8d0', '<path d="M3 8h10a2.5 2.5 0 1 0-2.5-2.5"/><path d="M3 12h15a2.5 2.5 0 1 1-2.5 2.5"/><path d="M3 16h8a2 2 0 1 1-2 2"/>'],
  fire:        ['#e89060', '<path d="M12 3s5 4.7 5 8.7c0 3-2.1 5.5-5 5.5s-5-2.5-5-5.5C7 7.7 12 3 12 3z"/><path d="M12 11.5s2 1.9 2 3.4a2 2 0 1 1-4 0c0-1.5 2-3.4 2-3.4z"/>'],
  chimes:      ['#a8d8b8', '<path d="M4 4h16"/><path d="M8 4v9M12 4v13M16 4v7"/><circle cx="8" cy="14.6" r="1"/><circle cx="12" cy="18.6" r="1"/><circle cx="16" cy="12.6" r="1"/>'],
  crickets:    ['#98c888', '<path d="M14.5 3.5a7.5 7.5 0 1 0 6 11.5 8.5 8.5 0 0 1-6-11.5z"/><circle cx="18.5" cy="5.5" r=".9" fill="currentColor" stroke="none"/><circle cx="21" cy="9" r=".7" fill="currentColor" stroke="none"/>'],
  brown:       ['#c0987a', '<circle cx="12" cy="12" r="8.5" fill="currentColor" stroke="none" opacity=".22"/><circle cx="12" cy="12" r="5" fill="currentColor" stroke="none" opacity=".45"/><circle cx="12" cy="12" r="1.8" fill="currentColor" stroke="none"/>'],
  white:       ['#cfd4de', '<circle cx="6" cy="7" r="1.1" fill="currentColor" stroke="none"/><circle cx="13" cy="5" r=".8" fill="currentColor" stroke="none" opacity=".7"/><circle cx="18.5" cy="8.5" r="1" fill="currentColor" stroke="none"/><circle cx="9" cy="12.5" r=".8" fill="currentColor" stroke="none" opacity=".6"/><circle cx="16" cy="13.5" r="1.1" fill="currentColor" stroke="none" opacity=".85"/><circle cx="5.5" cy="17" r="1" fill="currentColor" stroke="none" opacity=".75"/><circle cx="12" cy="18.5" r=".9" fill="currentColor" stroke="none"/><circle cx="19" cy="18" r=".7" fill="currentColor" stroke="none" opacity=".6"/>'],
  theta:       ['#90a0e8', '<path d="M2 12c1.7-4.5 3.3-4.5 5 0s3.3 4.5 5 0 3.3-4.5 5 0 3.3 4.5 5 0"/>'],
  freeplay:    ['#8eccc0', '<path d="M9.5 18V5.5l10-2V15"/><circle cx="7" cy="18" r="2.6"/><circle cx="17" cy="15" r="2.6"/>'],
  _custom:     ['#8eccc0', '<path d="M4 10v4M7.5 7v10M11 9.5v5M14.5 5v14M18 8.5v7M21 11v2"/>'],
  _url:        ['#6eb8a4', '<path d="M10 14a4 4 0 0 0 6 .4l3-3a4 4 0 0 0-5.7-5.7l-1.7 1.7"/><path d="M14 10a4 4 0 0 0-6-.4l-3 3a4 4 0 0 0 5.7 5.7l1.7-1.7"/>']
};

function _audRgbTriplet(hex) {
  var h = hex.replace('#', '');
  return parseInt(h.substr(0,2),16) + ',' + parseInt(h.substr(2,2),16) + ',' + parseInt(h.substr(4,2),16);
}

// Shared tile renderer for the setup grid and the in-session picker.
function audSoundBtnHTML(s) {
  var art = AUD_SOUND_ART[s.id] || (s.kind === 'url' ? AUD_SOUND_ART._url : AUD_SOUND_ART._custom);
  var sel = s.id === currentSound ? ' selected' : '';
  var extra = s.id === 'freeplay' ? ' sound-btn--freeplay' : '';
  return '<button class="sound-btn' + extra + sel + '" data-sound="' + s.id + '" style="--sc:' + art[0] + ';--scr:' + _audRgbTriplet(art[0]) + ';">'
    + '<span class="sound-art"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + art[1] + '</svg></span>'
    + '<span class="sound-eq"><i></i><i></i><i></i><i></i></span>'
    + s.label + '</button>';
}

function audAllSelectableSounds() {
  var customSounds = loadCustomAudSounds().filter(function(s) { return s.kind !== 'youtube'; });
  return SOUNDS.map(function(s) {
    return { id: s.id, label: s.label };
  }).concat(customSounds.map(function(s) {
    return { id: s.id, label: escHtml(s.name), kind: s.kind };
  }));
}

function buildSoundGrid() {
  var grid = document.getElementById('soundGrid');
  if (!grid) return;
  grid.innerHTML = audAllSelectableSounds().map(audSoundBtnHTML).join('');
  grid.querySelectorAll('.sound-btn').forEach(function(btn) {
    btn.addEventListener('click', function() { selectSound(this.dataset.sound); });
  });
}

function selectSound(id) {
  currentSound = id;
  document.querySelectorAll('.sound-btn').forEach(function(b) { b.classList.remove('selected'); });
  var btn = document.querySelector('.sound-btn[data-sound="' + id + '"]');
  if (btn) btn.classList.add('selected');
  // Preview the sound briefly (no preview for freeplay mode)
  if (id !== 'freeplay') {
    stopAllAudio();
    playSound(id);
  }
  // Auto-stop preview after 3 seconds (except sustained / freeplay)
  if (id !== 'freeplay' && SUSTAINED_SOUNDS.indexOf(id) === -1 && id.indexOf('custom_') !== 0) {
    setTimeout(function() {
      // Only stop if still on home (not in session)
      if (document.getElementById('audSessionScreen').style.display === 'none' ||
          !document.getElementById('audSessionScreen').classList.contains('active')) {
        stopAllAudio();
      }
    }, 3000);
  }
}

// Sounds the in-session "Switch Sound" button can cycle through: the built-in
// sounds (minus freeplay, which is a different mode) plus any custom uploads.
function audSwitchableSounds() {
  var ids = SOUNDS.filter(function(s) { return s.id !== 'freeplay'; }).map(function(s) { return s.id; });
  loadCustomAudSounds().filter(function(s) { return s.kind !== 'youtube'; }).forEach(function(s) { ids.push(s.id); });
  return ids;
}

// Build the in-session sound picker grid — same contents as the home selector:
// every built-in sound, "My Music" (freeplay), and any custom uploads.
function buildAudPickerGrid() {
  var grid = document.getElementById('audPickerGrid');
  if (!grid) return;
  grid.innerHTML = audAllSelectableSounds().map(audSoundBtnHTML).join('');
  grid.querySelectorAll('.sound-btn').forEach(function(btn) {
    btn.addEventListener('click', function() { pickAudSoundFromPicker(this.dataset.sound); });
  });
}

// Open the picker so the user can jump straight to any sound (rather than
// cycling one at a time). Only meaningful before concentration begins.
function openAudSoundPicker() {
  buildAudPickerGrid();
  var ov = document.getElementById('audPickerOverlay');
  if (ov) ov.classList.add('show');
}

function closeAudSoundPicker() {
  var ov = document.getElementById('audPickerOverlay');
  if (ov) ov.classList.remove('show');
}

// Apply a sound chosen from the picker, previewing it immediately and matching
// the listening/freeplay prompt the same way startAuditorySession does.
function pickAudSoundFromPicker(id) {
  currentSound = id;
  closeAudSoundPicker();
  var isFreePlay = id === 'freeplay';
  var nameEl = document.getElementById('audSoundName');
  if (nameEl) nameEl.textContent = getAudSoundLabel(currentSound);
  var waveEl = document.getElementById('audWave');
  if (waveEl) waveEl.style.visibility = isFreePlay ? 'hidden' : '';
  // Before concentration begins, refresh the listening prompt. Mid-rep we just
  // swap the ambient sound without disturbing the "Concentrate." cue.
  if (!audRepActive) {
    var stateEl = document.getElementById('audStateLabel');
    if (stateEl) stateEl.textContent = isFreePlay
      ? 'Play your own music.\nTap Start when ready to focus.'
      : 'Listen to the sound.\nTap Start when ready to concentrate.';
  }
  stopAllAudio();
  if (!isFreePlay) {
    playSound(currentSound);
    startWaveAnimation();
  } else {
    stopWaveAnimation();
  }
}

// ── Session logic ─────────────────────────────────────────
function startAuditorySession() {
  audReps = [];
  audHalts = 0;
  audRepActive = false;
  audSessionStartTime = null; // will be set when user clicks Start

  var isFreePlay = currentSound === 'freeplay';
  var waveEl = document.getElementById('audWave');
  if (waveEl) waveEl.style.visibility = isFreePlay ? 'hidden' : '';

  document.getElementById('audSoundName').textContent = getAudSoundLabel(currentSound);
  document.getElementById('audStateLabel').textContent = isFreePlay
    ? 'Play your own music.\nTap Start when ready to focus.'
    : 'Listen to the sound.\nTap Start when ready to concentrate.';
  document.getElementById('audRepCount').textContent = '';
  document.getElementById('audHaltCount').textContent = '';
  document.getElementById('audSessionTimer').textContent = '0:00';
  document.getElementById('audRepTimer').textContent = '0:00';
  // Show Start button, hide rep buttons
  document.getElementById('audStartRepBtn').style.display = '';
  document.getElementById('audLostBtn').style.display = 'none';
  document.getElementById('audNextRepBtn').style.display = 'none';
  // Switching sounds only makes sense while listening, before focus begins —
  // and only when more than one sound is available.
  var switchBtn = document.getElementById('audSwitchSoundBtn');
  if (switchBtn) switchBtn.style.display = audSwitchableSounds().length > 1 ? '' : 'none';
  closeAudSoundPicker();

  showScreen('audSessionScreen');
  requestExerciseWakeLock();
  if (!isFreePlay) {
    playSound(currentSound);
    startWaveAnimation();
  }
  // Session timer begins the moment the sound starts playing (or, in freeplay,
  // when the session screen opens). The rep clock still waits for "Start".
  audSessionStartTime = Date.now();
  if (audTimerHandle) cancelAnimationFrame(audTimerHandle);
  tickAudTimer();
}

function beginAudRep() {
  // User tapped Start — stop sound and begin concentration
  stopAllAudio();
  stopWaveAnimation();
  var waveEl = document.getElementById('audWave');
  if (waveEl) waveEl.style.visibility = '';
  // Session timer already started when the sound began; only start the rep clock.
  if (!audSessionStartTime) audSessionStartTime = Date.now();
  audRepStartTime = Date.now();
  document.getElementById('audStartRepBtn').style.display = 'none';
  document.getElementById('audStateLabel').textContent = 'Concentrate.';
  document.getElementById('audRepCount').textContent = 'rep 1';
  startAudRep();
}

function startAudRep() {
  audRepStartTime = Date.now();
  audHalts = 0;
  audRepActive = true;
  document.getElementById('audHaltCount').textContent = '';
  document.getElementById('audStateLabel').textContent = 'Concentrate.';
  document.getElementById('audStartRepBtn').style.display = 'none';
  document.getElementById('audLostBtn').style.display = '';
  document.getElementById('audNextRepBtn').style.display = 'none';
  updateAudRepCount();
}

function tickAudTimer() {
  var now = Date.now();
  var fmt = function(s) { return Math.floor(s/60) + ':' + String(s%60).padStart(2,'0'); };
  var sesEl = document.getElementById('audSessionTimer');
  var repEl = document.getElementById('audRepTimer');
  // The session clock runs from when the sound started; the rep clock only
  // once concentration begins (so it reads 0:00 during the listening phase).
  if (sesEl && audSessionStartTime) sesEl.textContent = fmt(Math.floor((now - audSessionStartTime) / 1000));
  if (repEl) repEl.textContent = audRepStartTime ? fmt(Math.floor((now - audRepStartTime) / 1000)) : '0:00';
  audTimerHandle = requestAnimationFrame(tickAudTimer);
}

function updateAudRepCount() {
  var el = document.getElementById('audRepCount');
  if (el) el.textContent = audReps.length > 0
    ? 'rep ' + (audReps.length + 1) + ' · ' + audReps.length + ' completed'
    : 'rep 1';
}

function audLostFocus() {
  if (!audRepActive) return;
  audRepActive = false;
  var repSec = Math.floor((Date.now() - audRepStartTime) / 1000);
  audReps.push({ seconds: repSec, halts: audHalts, sound: currentSound });

  // Flash rep time
  var flash = document.getElementById('audHaltFlash');
  if (flash) {
    flash.textContent = repSec + 's';
    flash.classList.remove('show');
    void flash.offsetWidth;
    flash.classList.add('show');
    setTimeout(function() { if(flash) flash.textContent = 'Halt.'; }, 1200);
  }

  document.getElementById('audStateLabel').textContent = repSec + 's held — listen again.';
  document.getElementById('audLostBtn').style.display = 'none';
  document.getElementById('audNextRepBtn').style.display = '';
  // Replay sound between reps for them to re-settle
  playSound(currentSound);
  startWaveAnimation();
  updateAudRepCount();
}

function audRecordHalt() {
  if (!audRepActive) return;
  audHalts++;
  var flash = document.getElementById('audHaltFlash');
  if (flash) {
    flash.textContent = 'Halt.';
    flash.classList.remove('show');
    void flash.offsetWidth;
    flash.classList.add('show');
  }
  var countEl = document.getElementById('audHaltCount');
  if (countEl) countEl.textContent = audHalts + ' halt' + (audHalts !== 1 ? 's' : '') + ' this rep';
}

function endAuditorySession() {
  releaseExerciseWakeLock();
  cancelAnimationFrame(audTimerHandle);
  stopAllAudio();
  stopWaveAnimation();
  audRepActive = false;
  // Record in-progress rep if active
  if (audRepActive && audRepStartTime) {
    var repSec = Math.floor((Date.now() - audRepStartTime) / 1000);
    if (repSec > 2) audReps.push({ seconds: repSec, halts: audHalts, sound: currentSound });
  }
  showAudResult();
}

function showAudResult() {
  var totalSec = Math.floor((Date.now() - audSessionStartTime) / 1000);
  var fmt = function(s) { return Math.floor(s/60) + ':' + String(s%60).padStart(2,'0'); };
  var bestRep = audReps.reduce(function(a,b) { return b.seconds > a.seconds ? b : a; }, { seconds: 0 });

  document.getElementById('audResultSub').textContent =
    audReps.length + ' rep' + (audReps.length !== 1 ? 's' : '') + ' · session ' + fmt(totalSec);
  document.getElementById('audNotes').value = '';
  document.getElementById('audAdaptWrap').innerHTML = '';

  var wrap = document.getElementById('audRepsWrap');
  if (wrap) {
    wrap.innerHTML = audReps.map(function(r, i) {
      var isBest = r.seconds === bestRep.seconds && i === audReps.indexOf(bestRep);
      var haltStr = r.halts ? r.halts + ' halt' + (r.halts !== 1 ? 's' : '') : '';
      return '<div style="display:flex; justify-content:space-between; align-items:center; padding:10px 14px; background:var(--surface); border:1px solid var(--border); border-radius:6px;">'
        + '<div><div style="font-size:10px; letter-spacing:.1em; color:var(--muted);">Rep ' + (i+1) + '</div>'
        + (haltStr ? '<div style="font-size:9px; color:#d4956e; opacity:.7;">' + haltStr + '</div>' : '')
        + '</div>'
        + '<div style="display:flex; align-items:center; gap:8px;">'
        + (isBest ? '<span style="font-size:8px; letter-spacing:.1em; color:#d4956e;">best</span>' : '')
        + '<span style="font-family:serif; font-size:20px; color:#d4b08e;">' + fmtTimer(r.seconds) + '</span>'
        + '</div></div>';
    }).join('');
  }

  saveAudResult();
}

function saveAudResult() {
  var notes = document.getElementById('audNotes').value.trim();
  var totalXP = audReps.reduce(function(a,r) { return a + r.seconds; }, 0);
  var bestSec = audReps.reduce(function(a,r) { return r.seconds > a ? r.seconds : a; }, 0);
  // Actual wall-clock length of the session, so daily progress counts the whole
  // sit (and the sum of multiple sits), not just the best unbroken rep.
  var audSessionDurationSec = audSessionStartTime ? Math.floor((Date.now() - audSessionStartTime) / 1000) : totalXP;
  concState.xp += totalXP;
  if (isConcNewSession()) concState.totalSessions++;
  if (bestSec > concState.bestSeconds) concState.bestSeconds = bestSec;

  var concDidLevelUpA = awardLevelUps(concState, concSumXpToLevel, concXpForLevel);

  var _akashaDeltaAud = recordExerciseCompletion({
    entry: {
      date: new Date().toISOString(),
      seconds: bestSec,
      xpEarned: totalXP,
      sessionDurationSec: audSessionDurationSec,
      reps: audReps.length,
      notes: notes,
      type: 'auditory',
      object: getAudSoundLabel(currentSound)
    },
    exId: 'auditory',
    // Reward on full wall-clock length like every other exercise (was totalXP =
    // sum of unbroken rep seconds, which quietly under-paid any sit with halts).
    // Still capped at 15 min / 1100 akasha inside omniaExerciseReward.
    omniaSeconds: audSessionDurationSec,
    reachedRec: omniaReachedRecommendation('auditory', audSessionDurationSec)
  });
  var _concDidLevelUpAud = concDidLevelUpA;
  var _audOriginMode = currentMode;
  showSessionComplete({
    title: 'Pure focus.',
    sub: audReps.length + ' rep' + (audReps.length !== 1 ? 's' : ''),
    xp: totalXP,
    akashaDelta: _akashaDeltaAud,
    stat3: { label: 'Reps', color: 'blue', value: audReps.length },
    onDone: function() {
      renderConcHome();
      showScreen('homeScreen');
      returnAfterExercise(_audOriginMode);
      if (_concDidLevelUpAud) setTimeout(function() { showConcLevelUp(concState.level); }, 400);
    }
  });
}

// ── Tap to record halt on auditory session ────────────────
document.getElementById('audSessionScreen').addEventListener('click', function(e) {
  // Don't register halts on button taps
  var tag = e.target.tagName;
  if (tag === 'BUTTON') return;
  audRecordHalt();
});
document.getElementById('audLostBtn').addEventListener('click', audLostFocus);
document.getElementById('audNextRepBtn').addEventListener('click', function() {
  stopAllAudio();
  stopWaveAnimation();
  document.getElementById('audNextRepBtn').style.display = 'none';
  startAudRep();
});
document.getElementById('audStartRepBtn').addEventListener('click', beginAudRep);
document.getElementById('audSwitchSoundBtn').addEventListener('click', openAudSoundPicker);
document.getElementById('audPickerCloseBtn').addEventListener('click', function(e) {
  e.stopPropagation();
  closeAudSoundPicker();
});
// Tapping the dimmed backdrop (outside the sheet) closes the picker. Stop the
// click from bubbling to the session screen, which would log a stray halt.
document.getElementById('audPickerOverlay').addEventListener('click', function(e) {
  e.stopPropagation();
  if (e.target === this) closeAudSoundPicker();
});
document.getElementById('audEndBtn').addEventListener('click', function() {
  var _audElapsed = audSessionStartTime ? Math.floor((Date.now() - audSessionStartTime) / 1000) : 0;
  omniaConfirmEarlyEnd('auditory', _audElapsed, endAuditorySession);
});
document.getElementById('audSaveBtn').addEventListener('click', saveAudResult);
document.getElementById('audViewHistoryBtn').addEventListener('click', function() {
  concHistoryFrom='home'; concHistoryFilter='all'; renderConcHistory(); showScreen('concHistoryScreen');
});
