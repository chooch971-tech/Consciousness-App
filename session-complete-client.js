function playSessionCompleteSound() {
  try {
    var ctx = new (window.AudioContext || window.webkitAudioContext)();
    // Ascending major arpeggio — C5, E5, G5, C6
    var notes = [523.25, 659.25, 783.99, 1046.50];
    notes.forEach(function(freq, i) {
      var osc  = ctx.createOscillator();
      var osc2 = ctx.createOscillator();
      var gain = ctx.createGain();
      osc.connect(gain); osc2.connect(gain); gain.connect(ctx.destination);
      osc.type  = 'sine'; osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.16);
      osc2.type = 'sine'; osc2.frequency.setValueAtTime(freq * 2.756, ctx.currentTime + i * 0.16);
      gain.gain.setValueAtTime(0, ctx.currentTime + i * 0.16);
      gain.gain.linearRampToValueAtTime(i === 3 ? 0.22 : 0.15, ctx.currentTime + i * 0.16 + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.16 + (i === 3 ? 1.8 : 0.9));
      osc.start(ctx.currentTime + i * 0.16);  osc.stop(ctx.currentTime + i * 0.16 + 2);
      osc2.start(ctx.currentTime + i * 0.16); osc2.stop(ctx.currentTime + i * 0.16 + 2);
    });
    if (navigator.vibrate) navigator.vibrate([80, 60, 80, 60, 200]);
  } catch(e) {}
}


function buildOmniaShowerHtml() {
  var crystalSVG = '<svg class="tut-ps-omnia-crystal" viewBox="0 0 72 118" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">'
    + '<defs>'
    + '<radialGradient id="scog3" cx="50%" cy="40%" r="60%">'
    + '<stop offset="0%" stop-color="#e8f8ff" stop-opacity=".55"/>'
    + '<stop offset="100%" stop-color="#8ecce0" stop-opacity="0"/>'
    + '</radialGradient>'
    + '<filter id="scogl"><feGaussianBlur stdDeviation="2.5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>'
    + '</defs>'
    + '<ellipse cx="36" cy="62" rx="24" ry="42" fill="url(#scog3)" filter="url(#scogl)" opacity=".55"/>'
    + '<polygon points="36,2 50,14 36,26 22,14" fill="#ceeaff" stroke="#90cce8" stroke-width=".8" opacity=".95"/>'
    + '<polygon points="36,2 50,14 36,13" fill="#e8f8ff" opacity=".55"/>'
    + '<polygon points="36,2 22,14 36,13" fill="#b4daf5" opacity=".35"/>'
    + '<line x1="36" y1="2" x2="36" y2="26" stroke="#b8e0f8" stroke-width=".5" opacity=".4"/>'
    + '<polygon points="36,26 56,37 60,59 36,70 12,59 16,37" fill="#b8dcf5" stroke="#88c4e0" stroke-width=".7" opacity=".88"/>'
    + '<polygon points="36,26 56,37 36,45" fill="#d4ecff" opacity=".44"/>'
    + '<polygon points="36,26 16,37 36,45" fill="#a8d4f0" opacity=".28"/>'
    + '<line x1="36" y1="26" x2="36" y2="70" stroke="#a8d8f2" stroke-width=".5" opacity=".38"/>'
    + '<polygon points="36,70 60,59 52,88 36,100 20,88 12,59" fill="#a8d4f0" stroke="#88c4e0" stroke-width=".7" opacity=".82"/>'
    + '<polygon points="36,100 52,88 36,116" fill="#98c8e8" stroke="#88c4e0" stroke-width=".6" opacity=".7"/>'
    + '<polygon points="36,100 20,88 36,116" fill="#88c0e0" stroke="#88c4e0" stroke-width=".6" opacity=".52"/>'
    + '</svg>';
  var _beads = [
    [24,18,0,6],[37,10,.22,5],[52,14,.44,8],[68,8,.66,5],
    [78,24,.88,7],[18,35,1.1,5],[34,30,1.32,7],[58,34,1.54,6],
    [72,42,1.76,5],[27,50,1.98,8],[46,46,2.2,5],[64,56,2.42,7]
  ];
  var beadsHTML = _beads.map(function(p) {
    return '<span class="tut-ps-bead" style="left:' + p[0] + '%;top:' + p[1] + '%;width:' + p[3] + 'px;height:' + p[3] + 'px;animation-delay:' + p[2] + 's"></span>';
  }).join('');
  return '<div class="tut-ps-omnia-wrap"><div class="tut-ps-omnia-stage">' + crystalSVG + beadsHTML + '</div></div>';
}

function showSessionComplete(opts) {
  var el = document.getElementById('sessionComplete');
  if (!el) return;
  playSessionCompleteSound();
  // Consume any pending streak-goal reward so it shows in this overlay,
  // not as a timed toast that fires behind the session-complete screen.
  var _psb = window._pendingStreakBonus || null;
  window._pendingStreakBonus = null;
  var streakBannerHtml = _psb
    ? '<div style="margin:12px 0 4px;padding:12px 16px;background:rgba(212,149,110,.12);border:1px solid rgba(212,149,110,.35);border-radius:10px;text-align:center;">'
      + '<div style="font-size:9px;letter-spacing:.14em;text-transform:uppercase;color:#d4956e;margin-bottom:6px;">🔥 ' + _psb.days + '-Day Awareness Streak</div>'
      + '<div style="display:flex;justify-content:center;gap:16px;">'
      + '<span style="font-family:serif;font-size:18px;color:#d4b08e;">+' + _psb.akasha.toLocaleString() + ' <span style="font-size:11px;font-family:\'DM Mono\',monospace;letter-spacing:.08em;color:#d4956e;">Akasha</span></span>'
      + '<span style="font-family:serif;font-size:18px;color:#d4b08e;">+' + _psb.xp + ' <span style="font-size:11px;font-family:\'DM Mono\',monospace;letter-spacing:.08em;color:#d4956e;">Awareness XP</span></span>'
      + '</div>'
      + '</div>'
    : '';

  // One-time bonuses (a newly-earned Achievement or a Gift Path milestone) are
  // credited during the completion but shown here as their own gold banner,
  // never folded into the Akasha stat card — otherwise a milestone session
  // looks like the exercise itself paid thousands. (The achievement toast fires
  // behind this opaque overlay, so this banner is also its only visible home.)
  var _pcb = window._pendingCompletionBonus || null;
  window._pendingCompletionBonus = null;
  var bonusBannerHtml = '';
  if (_pcb) {
    var _bonusRows = [];
    if (_pcb.ach > 0) {
      var _achTitle = (_pcb.achCount > 1)
        ? _pcb.achCount + ' Achievements'
        : 'Achievement' + (_pcb.achName ? ' — ' + (typeof escHtml === 'function' ? escHtml(_pcb.achName) : _pcb.achName) : '');
      _bonusRows.push(['✦ ' + _achTitle, _pcb.ach]);
    }
    if (_pcb.gift > 0) _bonusRows.push(['✦ Gift Path', _pcb.gift]);
    bonusBannerHtml = _bonusRows.map(function(row) {
      return '<div style="margin:12px 0 4px;padding:12px 16px;background:rgba(216,184,106,.12);border:1px solid rgba(216,184,106,.35);border-radius:10px;text-align:center;">'
        + '<div style="font-size:9px;letter-spacing:.14em;text-transform:uppercase;color:#d4b064;margin-bottom:6px;">' + row[0] + '</div>'
        + '<div style="display:flex;justify-content:center;gap:16px;">'
        + '<span style="font-family:serif;font-size:18px;color:#e8cd8e;">+' + row[1].toLocaleString() + ' <span style="font-size:11px;font-family:\'DM Mono\',monospace;letter-spacing:.08em;color:#d4b064;">Akasha</span></span>'
        + '</div></div>';
    }).join('');
  }

  el.innerHTML =
    buildOmniaShowerHtml()
    + '<div class="tut-legend-title">' + opts.title + '</div>'
    + '<div class="tut-legend-sub">' + opts.sub + '</div>'
    + '<div class="tut-legend-cards">'
    + '<div class="tut-legend-card amber">'
    + '<span class="tut-legend-card-label">XP</span>'
    + '<span class="tut-legend-card-value">+' + opts.xp + '</span>'
    + '</div>'
    + '<div class="tut-legend-card teal">'
    + '<span class="tut-legend-card-label">Akasha</span>'
    + '<span class="tut-legend-card-value">+' + (opts.akashaDelta || 0) + '</span>'
    + '</div>'
    + '<div class="tut-legend-card ' + (opts.stat3.color || 'blue') + '">'
    + '<span class="tut-legend-card-label">' + opts.stat3.label + '</span>'
    + '<span class="tut-legend-card-value">' + opts.stat3.value + '</span>'
    + '</div>'
    + '</div>'
    + streakBannerHtml
    + bonusBannerHtml
    + (opts.omniaMsg ? '<div class="omnia-speak">' + opts.omniaMsg + '</div>' : '')
    + '<button class="sc-done-btn" id="scDoneBtn">Done →</button>'
    + (opts.onRepeat ? '<button class="sc-repeat-btn" id="scRepeatBtn">Repeat ↺</button>' : '');
  document.getElementById('scDoneBtn').onclick = function() {
    // Switch the screen behind FIRST while the overlay is still fully opaque,
    // so the exercise screen is replaced under cover. Only once the new screen
    // has painted do we fade the overlay out — this guarantees no flash of the
    // exercise clock between the legend and the home menu.
    if (opts.onDone) opts.onDone();
    requestAnimationFrame(function() {
      el.classList.remove('sc-vis');
      setTimeout(function() {
        el.classList.remove('sc-show');
        // Fire Awareness level-up after the overlay is gone, not while it's open.
        if (_psb && _psb.leveled) setTimeout(function() { showLevelUp(_psb.level); }, 300);
      }, 560);
    });
  };
  if (opts.onRepeat) {
    document.getElementById('scRepeatBtn').onclick = function() {
      el.classList.remove('sc-vis');
      setTimeout(function() { el.classList.remove('sc-show'); opts.onRepeat(); }, 560);
    };
  }
  el.classList.add('sc-show');
  requestAnimationFrame(function() {
    requestAnimationFrame(function() { el.classList.add('sc-vis'); });
  });
  // The reward numbers tick up from 0 — the payoff should feel earned, not
  // merely stated. Only plain "+N" values animate; times/labels are left alone.
  el.querySelectorAll('.tut-legend-card-value').forEach(function(vEl) {
    var m = /^\+(\d+)$/.exec((vEl.textContent || '').trim());
    if (!m) return;
    var target = parseInt(m[1], 10);
    if (!target || target > 100000) return;
    var t0 = null;
    function tick(ts) {
      if (!t0) t0 = ts;
      var k = Math.min(1, (ts - t0) / 650);
      k = 1 - Math.pow(1 - k, 3); // ease-out
      vEl.textContent = '+' + Math.round(target * k);
      if (k < 1) requestAnimationFrame(tick);
    }
    vEl.textContent = '+0';
    requestAnimationFrame(tick);
  });
}
