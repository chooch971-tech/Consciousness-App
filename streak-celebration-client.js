function showStreakCelebration() {
  var el = document.getElementById('streakCelebOverlay');
  if (!el) return;
  if (el.classList.contains('sco-show')) return;
  // Wait until the session-complete legend and body-level award are dismissed —
  // this overlay sits below them (z 9750 vs 9800/9900), so firing now would
  // play the whole ignition invisibly behind the legend.
  var _sc = document.getElementById('sessionComplete');
  if ((_sc && _sc.classList.contains('sc-show')) || document.getElementById('bodyLevelAwardOverlay')) {
    setTimeout(showStreakCelebration, 700);
    return;
  }
  var streak = state.streak || 0;
  var msgs = [
    'You came back. That\'s the whole practice.',
    'Three days in. Don\'t break the chain.',
    'Momentum is building. Trust the process.',
    'The mind is becoming still. Keep going.',
    'You\'re here again. That\'s everything.',
    'Consistency is the highest discipline.',
    'The work compounds. Every session counts.',
    'Your mind is changing. You can feel it.',
    'This is what mastery looks like — showing up.',
    'Omnia grows as you practice. You grow together.'
  ];
  var msg = streak === 1 ? 'Day one. The hardest step is done.'
    : streak === 2 ? 'I knew you\'d come back. Let\'s do this again tomorrow.'
    : streak === 7 ? 'Seven days. A real habit is forming.'
    : streak === 30 ? 'Thirty days. You\'ve become someone who meditates.'
    : msgs[(streak - 1) % msgs.length];

  // Week dots: Sun–Sat of the current week
  var now = new Date();
  var todayISO = presenceDayKey(now);
  var dow = now.getDay();
  var practiced = state.practicedDates || [];
  var dayLabels = ['Su','Mo','Tu','We','Th','Fr','Sa'];
  var weekHTML = dayLabels.map(function(lbl, i) {
    var d = new Date(now); d.setDate(d.getDate() - dow + i);
    var ds = presenceDayKey(d);
    var done = practiced.indexOf(ds) !== -1;
    var isToday = ds === todayISO;
    return '<div class="sco-week-col">'
      + '<div class="sco-week-lbl' + (isToday ? ' active' : '') + '">' + lbl + '</div>'
      + '<div class="sco-dot' + (done ? ' done' : isToday ? ' today' : '') + '">'
      + (done ? '✓' : '') + '</div>'
      + '</div>';
  }).join('');

  // The streak flame igniting — the same flame the streak screen shows and the
  // Streak Ended overlay extinguishes; extending the streak is it catching again.
  var cSVG = '<svg class="sco-flame-svg" viewBox="0 0 52 64" fill="none" aria-hidden="true">'
    + '<path d="M26 6C26 6 40 22 40 34C40 42 35 47 30 47C35 33 26 24 26 24C26 24 18 36 22 46C17 45 12 40 12 34C12 22 26 6 26 6Z" fill="rgba(255,200,80,0.9)"/>'
    + '<path d="M26 28C26 28 32 36 30 43C28 49 23 48 21 46C26 40 26 28 26 28Z" fill="rgba(255,250,180,0.8)"/>'
    + '<ellipse cx="26" cy="54" rx="13" ry="4" fill="rgba(180,80,20,0.30)"/>'
    + '</svg>';
  // Embers begin drifting once the flame has caught (after the 1.1s ignition).
  var emberHTML = [[30,1.2,-8],[52,1.9,6],[64,2.6,12],[42,3.2,-4]].map(function(e) {
    return '<span class="sco-ember" style="left:' + e[0] + '%;animation-delay:' + e[1] + 's;--drift:' + e[2] + 'px;"></span>';
  }).join('');

  // Burst particles — 18 light shards radiating outward
  var burstHTML = '<div class="sco-burst" id="scoBurst">'
    + '<div class="sco-flash"></div>'
    + '<div class="sco-shockwave"></div>'
    + '<div class="sco-shockwave two"></div>';
  var colors = ['#fff0c8','#b8eaff','#d4956e','#e8d8b0','#a8d8ec','#ffe2a0'];
  for (var i = 0; i < 18; i++) {
    var angle = (i / 18) * 360 + (Math.random() * 12 - 6);
    var dist = 140 + Math.random() * 100;
    var color = colors[i % colors.length];
    var delay = Math.random() * 0.15;
    var size = 4 + Math.random() * 5;
    burstHTML += '<div class="sco-particle" style="--a:' + angle + 'deg;--d:' + dist + 'px;'
      + 'width:' + size + 'px;height:' + size + 'px;background:' + color
      + ';box-shadow:0 0 8px ' + color + ',0 0 14px ' + color
      + ';animation-delay:' + delay + 's;"></div>';
  }
  burstHTML += '</div>';

  // The number fades in at yesterday's count, then ticks up to today's with a
  // pop — the moment the streak visibly extends. Day one just shows 1.
  var prevStreak = streak > 1 ? streak - 1 : streak;
  el.innerHTML =
    burstHTML
    + '<div class="sco-bubble sco-fadein" style="animation-delay:.55s">' + msg + '</div>'
    + '<div class="sco-mascot-wrap"><div class="sco-glow"></div>' + cSVG + emberHTML + '</div>'
    + '<div class="sco-num sco-fadein" id="scoNumEl" style="animation-delay:.65s">' + prevStreak + '</div>'
    + '<div class="sco-label sco-fadein" style="animation-delay:.72s">day streak</div>'
    + '<div class="sco-week sco-fadein" style="animation-delay:.80s">' + weekHTML + '</div>'
    + '<button class="sco-commit-btn sco-fadein" id="scoCelebBtn" style="animation-delay:1.15s">I\'m Committed →</button>'
    + '<button class="sco-later sco-fadein" id="scoCelebLater" style="animation-delay:1.25s">Continue</button>';
  if (streak > 1) {
    setTimeout(function() {
      var numEl = document.getElementById('scoNumEl');
      if (!numEl) return;
      numEl.textContent = streak;
      numEl.classList.remove('sco-fadein');
      numEl.classList.add('sco-num-pop');
      if (navigator.vibrate) navigator.vibrate(60);
    }, 1350);
  }

  function close() {
    el.classList.remove('sco-vis');
    setTimeout(function() { el.classList.remove('sco-show'); }, 400);
  }
  document.getElementById('scoCelebBtn').onclick = close;
  document.getElementById('scoCelebLater').onclick = close;

  el.classList.add('sco-show');
  requestAnimationFrame(function() {
    requestAnimationFrame(function() {
      el.classList.add('sco-vis');
      playStreakBurstSound();
      if (navigator.vibrate) navigator.vibrate([40, 50, 120, 60, 80, 40, 220]);
    });
  });
}

function playStreakBurstSound() {
  if (typeof appSoundEnabled === 'function' && !appSoundEnabled()) return;
  try {
    var ctx = new (window.AudioContext || window.webkitAudioContext)();
    var t0 = ctx.currentTime;
    // 1) Sub-bass impact at t=0 — the "burst" thud
    var sub = ctx.createOscillator(), subG = ctx.createGain();
    sub.type = 'sine'; sub.frequency.setValueAtTime(120, t0); sub.frequency.exponentialRampToValueAtTime(40, t0 + 0.45);
    subG.gain.setValueAtTime(0, t0); subG.gain.linearRampToValueAtTime(0.32, t0 + 0.02); subG.gain.exponentialRampToValueAtTime(0.001, t0 + 0.6);
    sub.connect(subG); subG.connect(ctx.destination); sub.start(t0); sub.stop(t0 + 0.7);
    // 2) Rising whoosh — filtered noise sweep
    var noise = ctx.createBufferSource();
    var buf = ctx.createBuffer(1, ctx.sampleRate * 0.8, ctx.sampleRate);
    var data = buf.getChannelData(0);
    for (var n = 0; n < data.length; n++) data[n] = (Math.random() * 2 - 1) * (1 - n / data.length);
    noise.buffer = buf;
    var bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 1.8;
    bp.frequency.setValueAtTime(400, t0); bp.frequency.exponentialRampToValueAtTime(5000, t0 + 0.7);
    var noiseG = ctx.createGain(); noiseG.gain.setValueAtTime(0, t0); noiseG.gain.linearRampToValueAtTime(0.18, t0 + 0.1); noiseG.gain.exponentialRampToValueAtTime(0.001, t0 + 0.8);
    noise.connect(bp); bp.connect(noiseG); noiseG.connect(ctx.destination); noise.start(t0);
    // 3) Cinematic ascending major chord — Cmaj9 spread, layered sine + triangle
    var chord = [261.63, 392.00, 523.25, 659.25, 783.99, 1046.50]; // C E G B C
    chord.forEach(function(freq, i) {
      var delay = 0.35 + i * 0.06;
      var osc = ctx.createOscillator(), osc2 = ctx.createOscillator(), g = ctx.createGain();
      osc.type = 'sine'; osc2.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t0 + delay);
      osc2.frequency.setValueAtTime(freq * 2.005, t0 + delay);
      g.gain.setValueAtTime(0, t0 + delay);
      g.gain.linearRampToValueAtTime(i >= 4 ? 0.13 : 0.09, t0 + delay + 0.04);
      g.gain.exponentialRampToValueAtTime(0.001, t0 + delay + 2.8);
      osc.connect(g); osc2.connect(g); g.connect(ctx.destination);
      osc.start(t0 + delay); osc.stop(t0 + delay + 3);
      osc2.start(t0 + delay); osc2.stop(t0 + delay + 3);
    });
    // 4) Sparkle shimmer — high bells over the chord
    [1567, 2093, 2637, 3136, 2349].forEach(function(freq, i) {
      var delay = 0.55 + i * 0.08;
      var osc = ctx.createOscillator(), g = ctx.createGain();
      osc.type = 'sine'; osc.frequency.setValueAtTime(freq, t0 + delay);
      g.gain.setValueAtTime(0, t0 + delay);
      g.gain.linearRampToValueAtTime(0.06, t0 + delay + 0.02);
      g.gain.exponentialRampToValueAtTime(0.001, t0 + delay + 0.7);
      osc.connect(g); g.connect(ctx.destination);
      osc.start(t0 + delay); osc.stop(t0 + delay + 0.8);
    });
  } catch(e) {}
}
