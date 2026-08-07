function playTutorialCelebrationSound() {
  try {
    var ctx = new (window.AudioContext || window.webkitAudioContext)();
    /* Bright ascending arpeggio with a held final note */
    var notes = [523.25, 659.25, 783.99, 1046.50];
    notes.forEach(function(freq, i) {
      var osc = ctx.createOscillator(), osc2 = ctx.createOscillator(), gain = ctx.createGain();
      osc.connect(gain); osc2.connect(gain); gain.connect(ctx.destination);
      osc.type = 'sine'; osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.14);
      osc2.type = 'triangle'; osc2.frequency.setValueAtTime(freq * 1.502, ctx.currentTime + i * 0.14);
      gain.gain.setValueAtTime(0, ctx.currentTime + i * 0.14);
      gain.gain.linearRampToValueAtTime(i === 3 ? 0.24 : 0.14, ctx.currentTime + i * 0.14 + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.14 + (i === 3 ? 2.2 : 0.7));
      osc.start(ctx.currentTime + i * 0.14);  osc.stop(ctx.currentTime + i * 0.14 + 2.5);
      osc2.start(ctx.currentTime + i * 0.14); osc2.stop(ctx.currentTime + i * 0.14 + 2.5);
    });
    /* Sparkle shimmer — high-frequency burst */
    [1567, 2093, 2637].forEach(function(freq, i) {
      var osc = ctx.createOscillator(), gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.type = 'sine'; osc.frequency.setValueAtTime(freq, ctx.currentTime + 0.55 + i * 0.09);
      gain.gain.setValueAtTime(0, ctx.currentTime + 0.55 + i * 0.09);
      gain.gain.linearRampToValueAtTime(0.07, ctx.currentTime + 0.55 + i * 0.09 + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.55 + i * 0.09 + 0.55);
      osc.start(ctx.currentTime + 0.55 + i * 0.09); osc.stop(ctx.currentTime + 1.5);
    });
    if (navigator.vibrate) navigator.vibrate([60, 40, 80, 40, 60, 40, 200]);
  } catch(e) {}
}

function showTutorialPostSession(secs, akashaDelta) {
  var ps = document.getElementById('tutPostSession');
  if (!ps) return;
  _tutEnablePostMode();
  _tutSetPostProgress(1);
  _tutSetPostBack(null); // no back — session just completed

  /* Format seconds as m:ss */
  var mins = Math.floor(secs / 60);
  var rem  = secs % 60;
  var timeStr = mins > 0 ? (mins + ':' + (rem < 10 ? '0' : '') + rem) : ('0:' + (rem < 10 ? '0' : '') + rem);

  var crystalSVG =
    '<svg class="tut-ps-omnia-crystal" viewBox="0 0 72 118" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">'
    + '<defs>'
    + '<radialGradient id="tpg3" cx="50%" cy="40%" r="60%">'
    + '<stop offset="0%" stop-color="#e8f8ff" stop-opacity=".55"/>'
    + '<stop offset="100%" stop-color="#8ecce0" stop-opacity="0"/>'
    + '</radialGradient>'
    + '<filter id="tpgl"><feGaussianBlur stdDeviation="2.5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>'
    + '</defs>'
    + '<ellipse cx="36" cy="62" rx="24" ry="42" fill="url(#tpg3)" filter="url(#tpgl)" opacity=".55"/>'
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

  var _beads=[
    [24,18,0,6],[37,10,.22,5],[52,14,.44,8],[68,8,.66,5],
    [78,24,.88,7],[18,35,1.1,5],[34,30,1.32,7],[58,34,1.54,6],
    [72,42,1.76,5],[27,50,1.98,8],[46,46,2.2,5],[64,56,2.42,7]
  ];
  var beadsHTML=_beads.map(function(p){
    return '<span class="tut-ps-bead" style="left:'+p[0]+'%;top:'+p[1]+'%;width:'+p[3]+'px;height:'+p[3]+'px;animation-delay:'+p[2]+'s"></span>';
  }).join('');

  var _isExperienced = (guidePathMode === 'experienced');
  var _autoStopped = !!window._tutAutoStopped;
  window._tutAutoStopped = false;
  var omniaMsg;
  if (!_isExperienced && _autoStopped) {
    omniaMsg = 'You did the entire minute without a distraction! Incredible job.';
  } else if (!_isExperienced && !_autoStopped) {
    omniaMsg = 'Impressive first exercise! It\'s difficult, but your resilience will only make it easier over time.';
  } else if (_isExperienced && secs < 60) {
    omniaMsg = 'Impressive first exercise! It\'s difficult, but your resilience will only make it easier over time.';
  } else if (_isExperienced && secs >= 60 && secs <= 180) {
    omniaMsg = 'Incredible first job! I can see your training has paid off. Your personal best will only improve from here.';
  }

  ps.innerHTML =
    '<div class="tut-ps-omnia-wrap"><div class="tut-ps-omnia-stage">' + crystalSVG + beadsHTML + '</div></div>'
    + '<div class="tut-legend-title">Meditative legend!</div>'
    + '<div class="tut-legend-sub">You completed your first exercise.</div>'
    + '<div class="tut-legend-cards">'
    + '<div class="tut-legend-card amber">'
    + '<span class="tut-legend-card-label">XP</span>'
    + '<span class="tut-legend-card-value">' + secs + '</span>'
    + '</div>'
    + '<div class="tut-legend-card teal">'
    + '<span class="tut-legend-card-label">Akasha</span>'
    + '<span class="tut-legend-card-value">+' + (akashaDelta || 50) + '</span>'
    + '</div>'
    + '<div class="tut-legend-card blue">'
    + '<span class="tut-legend-card-label">Time</span>'
    + '<span class="tut-legend-card-value">' + timeStr + '</span>'
    + '</div>'
    + '</div>'
    + (omniaMsg ? '<div class="omnia-speak">' + omniaMsg + '</div>' : '')
    + '<button id="tutPS-btn">Claim XP →</button>';

  document.getElementById('tutPS-btn').onclick = function() {
    showTutorialStreakCelebration();
  };

  ps.classList.add('tut-ps-show');
  requestAnimationFrame(function() {
    requestAnimationFrame(function() {
      ps.classList.add('tut-ps-vis');
      playTutorialCelebrationSound();
    });
  });
}

function tutFadeStage(buildFn) {
  var ps = document.getElementById('tutPostSession');
  // Keep the overlay fully opaque at all times — fading the whole container
  // reveals whatever screen is behind it, causing a flash. Each screen's
  // child elements handle their own entrance via CSS fadeUp animations.
  ps.innerHTML = '';
  buildFn(ps);
}

/* ── Post-stage progress + back helpers ──────────────────────────── */
function _tutSetPostProgress(stageIdx) {
  var total = window.__tutTotal    || 14;
  var base  = window.__tutStepsLen || 8;
  var pf = document.getElementById('tutProgressFill');
  if (pf) pf.style.width = Math.round((base + stageIdx) / total * 100) + '%';
}
function _tutSetPostBack(fn) {
  var bk = document.getElementById('tutBackBtn');
  if (!bk) return;
  window.__tutPostBackFn = fn || null;
  bk.style.display = fn ? 'block' : 'none';
}
function _tutEnablePostMode() {
  document.body.classList.add('tut-post');
}
function _tutDisablePostMode() {
  document.body.classList.remove('tut-post');
  window.__tutPostBackFn = null;
  var bk = document.getElementById('tutBackBtn');
  if (bk) bk.style.display = 'none';
}
/* ─────────────────────────────────────────────────────────────────── */

function showTutorialStreakCelebration() {
  _tutSetPostProgress(2);
  _tutSetPostBack(null); // no back — milestone moment
  tutFadeStage(function(ps) {
    ps.innerHTML =
      '<div class="tut-s1-scene">'
      + '<div class="tut-s1-ring-clip">'
      +   '<div class="tut-s1-ring"></div>'
      +   '<div class="tut-s1-ring"></div>'
      +   '<div class="tut-s1-ring"></div>'
      + '</div>'
      + '<div class="tut-s1-pyre">'
      +   '<div class="tut-s1-ground-glow"></div>'
      +   '<div class="tut-s1-flame-wrap">'
      +     '<div class="tut-s1-fl tut-s1-fl-haze"></div>'
      +     '<div class="tut-s1-fl tut-s1-fl-left"></div>'
      +     '<div class="tut-s1-fl tut-s1-fl-right"></div>'
      +     '<div class="tut-s1-fl tut-s1-fl-main"></div>'
      +     '<div class="tut-s1-fl tut-s1-fl-core"></div>'
      +     '<div class="tut-s1-fl-base"></div>'
      +   '</div>'
      +   '<div class="tut-s1-embers">'
      +     '<div class="tut-s1-ember"></div>'
      +     '<div class="tut-s1-ember"></div>'
      +     '<div class="tut-s1-ember"></div>'
      +     '<div class="tut-s1-ember"></div>'
      +     '<div class="tut-s1-ember"></div>'
      +     '<div class="tut-s1-ember"></div>'
      +     '<div class="tut-s1-ember"></div>'
      +     '<div class="tut-s1-ember"></div>'
      +     '<div class="tut-s1-ember"></div>'
      +     '<div class="tut-s1-ember"></div>'
      +   '</div>'
      +   '<div class="tut-s1-num-wrap">'
      +     '<span class="tut-s1-day-label">Day</span>'
      +     '<div class="tut-s1-num">1</div>'
      +   '</div>'
      + '</div>'
      + '</div>'
      + '<h1 class="tut-s1-headline">Your streak begins.</h1>'
      + '<p class="tut-s1-sub">Every master started exactly here.</p>'
      + '<button class="tut-s1-continue" id="tutStage-next">Continue →</button>';
    document.getElementById('tutStage-next').onclick = showTutorialStreakCommit;
    requestAnimationFrame(function() {
      requestAnimationFrame(function() { ps.classList.add('tut-ps-vis'); });
    });
  });
}

function showTutorialStreakCommit() {
  _tutSetPostProgress(3);
  _tutSetPostBack(showTutorialStreakCelebration);
  tutFadeStage(function(ps) {
    var tiers = [1, 2, 3, 4];
    var rowsHTML = STREAK_STARTER_COMMITS.map(function(c, i) {
      var reward = streakMilestoneReward(c);
      return '<div class="tut-commit-row" data-tier="' + tiers[i] + '" data-days="' + c.days + '">'
        + '<div class="tut-commit-days-wrap">'
        +   '<span class="tut-commit-days">' + c.days + '</span>'
        +   '<span class="tut-commit-day-unit">days</span>'
        + '</div>'
        + '<div class="tut-commit-divider"></div>'
        + '<div class="tut-commit-rewards">'
        +   '<span class="tut-commit-xp">+' + reward.xp.toLocaleString() + ' XP</span>'
        +   '<span class="tut-commit-akasha">+' + reward.akasha.toLocaleString() + ' Akasha</span>'
        + '</div>'
        + '<span class="tut-commit-arrow">→</span>'
        + '</div>';
    }).join('');

    ps.innerHTML =
      '<h2 class="tut-commit-headline">How long will you <em>commit?</em></h2>'
      + '<p class="tut-commit-sub">Complete your goal and earn a bonus.</p>'
      + '<div class="tut-commit-list">' + rowsHTML + '</div>'
      + '<button class="tut-commit-skip" id="tutCommit-skip">Skip for now</button>';

    ps.querySelectorAll('.tut-commit-row').forEach(function(row) {
      row.addEventListener('click', function() {
        var days = parseInt(row.dataset.days, 10);
        localStorage.setItem('presence_streak_commit', String(days));
        state.streakCommit = days;
        state.streakGoalBaseDays = 0;
        saveState();
        ps.querySelectorAll('.tut-commit-row').forEach(function(r) { r.classList.remove('selected'); });
        row.classList.add('selected');
        setTimeout(showTutorialReminder, 400);
      });
    });

    document.getElementById('tutCommit-skip').onclick = showTutorialReminder;

    requestAnimationFrame(function() {
      requestAnimationFrame(function() { ps.classList.add('tut-ps-vis'); });
    });
  });
}


function showTutorialReminder() {
  _tutSetPostProgress(4);
  _tutSetPostBack(showTutorialStreakCommit);
  tutFadeStage(function(ps) {
    var SLOTS = [
      { slot:'morning', label:'Morning',   time:'7 AM',  value:'07:00' },
      { slot:'noon',    label:'Afternoon', time:'12 PM', value:'12:00' },
      { slot:'evening', label:'Evening',   time:'8 PM',  value:'20:00' },
    ];
    var selected = [];

    var tilesHTML = SLOTS.map(function(s) {
      return '<div class="tut-remind-tile" data-value="' + s.value + '" data-slot="' + s.slot + '">'
        + '<div class="tut-remind-check"><span class="tut-remind-check-mark">✓</span></div>'
        + '<div class="tut-remind-tile-body">'
        +   '<span class="tut-remind-tile-period">' + s.label + '</span>'
        +   '<span class="tut-remind-tile-time">' + s.time + '</span>'
        + '</div>'
        + '</div>';
    }).join('');

    ps.innerHTML =
      '<h2 class="tut-stage-headline">When can I expect you?</h2>'
      + '<p class="tut-stage-sub">Select all that apply.</p>'
      + '<div class="tut-remind-list">' + tilesHTML + '</div>'
      + '<button class="tut-remind-confirm" id="tutRemindConfirm">Set reminders</button>'
      + '<button class="tut-remind-late-skip" id="tutRemindSkip">I\'ll decide later</button>';

    var confirmBtn = document.getElementById('tutRemindConfirm');

    ps.querySelectorAll('.tut-remind-tile').forEach(function(tile) {
      tile.addEventListener('click', function() {
        tile.classList.toggle('active');
        var v = tile.dataset.value;
        var idx = selected.indexOf(v);
        if (idx === -1) { selected.push(v); } else { selected.splice(idx, 1); }
        if (selected.length > 0) { confirmBtn.classList.add('ready'); }
        else { confirmBtn.classList.remove('ready'); }
      });
    });

    confirmBtn.addEventListener('click', function() {
      if (!confirmBtn.classList.contains('ready')) return;
      async function proceed() {
        scheduleReminderNotifications(selected);
        // Seed Omnia's push-based practice reminders from this choice: the
        // number of slots picked sets the frequency level. Adjustable later
        // in Settings → Practice Reminders.
        var level = practiceLevelForCount(selected.length);
        savePracticeReminderPrefs({ enabled: true, level: level });
        // Register push first so the schedule sync finds a subscription. The UI
        // advances immediately; the network calls finish in the background.
        if (typeof registerWebPush === 'function') { try { await registerWebPush(); } catch(e) {} }
        syncPracticeReminderToServer();
      }
      proceed();
      showTutorialAccountPrompt();
    });

    document.getElementById('tutRemindSkip').onclick = showTutorialAccountPrompt;

    requestAnimationFrame(function() {
      requestAnimationFrame(function() { ps.classList.add('tut-ps-vis'); });
    });
  });
}

var GOOGLE_ICON_SVG = '<svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.716v2.259h2.908C16.658 14.017 17.64 11.71 17.64 9.2z"/><path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/><path fill="#FBBC05" d="M3.964 10.706A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.038l3.007-2.332z"/><path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.962L3.964 7.294C4.672 5.163 6.656 3.58 9 3.58z"/></svg>';

function showTutorialAccountPrompt() {
  _tutSetPostProgress(5);
  _tutSetPostBack(showTutorialReminder);
  tutFadeStage(function(ps) {
    ps.innerHTML =
      '<div style="font-size:1.75rem;margin-bottom:6px;">🔥</div>'
      + '<div class="tut-stage-headline" style="font-size:clamp(22px,6vw,30px);margin-bottom:6px;">Protect your streak.</div>'
      + '<div class="tut-stage-sub" style="margin-bottom:20px;">Create a free account to save your progress<br>and sync across devices.</div>'
      + '<div class="tut-acct-btns">'
      +   '<div id="gSignInContainer"></div>'
      +   '<div class="tut-acct-divider"><div class="tut-acct-divider-line"></div><span class="tut-acct-divider-text">or</span><div class="tut-acct-divider-line"></div></div>'
      +   '<div class="tut-acct-email-form open" id="tutAcctEmailForm">'
      +     '<input class="tut-acct-input" type="email" id="tutAcctEmail" placeholder="Email" autocomplete="email"/>'
      +     '<input class="tut-acct-input" type="password" id="tutAcctPassword" placeholder="Password" autocomplete="new-password"/>'
      +     '<button class="tut-acct-email-submit" id="tutAcctSubmit">Create Account</button>'
      +     '<button class="tut-acct-email-toggle" id="tutAcctModeToggle" style="font-size:0.5rem;opacity:.6;">Already have an account? Sign in →</button>'
      +     '<div class="tut-acct-email-err" id="tutAcctErr"></div>'
      +   '</div>'
      +   '<button class="tut-acct-skip" id="tutAcct-skip">Continue without saving</button>'
      + '</div>';

    initGoogleSignIn('gSignInContainer', function() { showTutorialGuideIntro(false); });

    document.getElementById('tutAcct-skip').onclick = function() { showTutorialGuideIntro(false); };

    // Sign-up / sign-in mode toggle — starts in create-account mode
    var tutEmailMode = true; // true=create, false=sign-in
    document.getElementById('tutAcctModeToggle').onclick = function() {
      tutEmailMode = !tutEmailMode;
      document.getElementById('tutAcctSubmit').textContent = tutEmailMode ? 'Create Account' : 'Sign In';
      document.getElementById('tutAcctPassword').autocomplete = tutEmailMode ? 'new-password' : 'current-password';
      this.textContent = tutEmailMode ? 'Already have an account? Sign in →' : 'No account yet? Create one →';
      _liveCheckPassword(document.getElementById('tutAcctPassword'), document.getElementById('tutAcctErr'), function() { return tutEmailMode; }, document.getElementById('tutAcctSubmit'));
    };

    document.getElementById('tutAcctPassword').addEventListener('input', function() {
      _liveCheckPassword(this, document.getElementById('tutAcctErr'), function() { return tutEmailMode; }, document.getElementById('tutAcctSubmit'));
    });

    // Submit
    document.getElementById('tutAcctSubmit').onclick = async function() {
      var email = (document.getElementById('tutAcctEmail').value || '').trim();
      var password = document.getElementById('tutAcctPassword').value || '';
      var errEl = document.getElementById('tutAcctErr');
      if (!email || !password) { errEl.textContent = 'Email and password required'; errEl.style.display = 'block'; return; }
      this.disabled = true; this.textContent = 'Please wait…'; errEl.style.display = 'none';
      var ok = await authRegisterOrLogin(email, password, tutEmailMode, '');
      if (ok) {
        showTutorialGuideIntro(false);
      } else {
        errEl.textContent = window._lastAuthError || 'Sign-in failed. Try again.';
        errEl.style.display = 'block';
        this.disabled = false;
        this.textContent = tutEmailMode ? 'Create Account' : 'Sign In';
      }
    };

    requestAnimationFrame(function() {
      requestAnimationFrame(function() { ps.classList.add('tut-ps-vis'); });
    });
  });
}

function showTutorialGuideIntro(goToLogin) {
  _tutSetPostProgress(6);
  _tutSetPostBack(showTutorialAccountPrompt);
  tutFadeStage(function(ps) {
    ps.innerHTML =
      '<div class="tut-guide-ready">'
      + '<div class="tut-guide-scene" aria-hidden="true">'
      + '<span class="tut-guide-node"></span>'
      + '<span class="tut-guide-node"></span>'
      + '<span class="tut-guide-node"></span>'
      + '<span class="tut-guide-node"></span>'
      + '<div class="tut-guide-route"></div>'
      + '<div class="tut-guide-core"></div>'
      + '</div>'
      + '<div class="tut-guide-kicker">Omnia&apos;s Path</div>'
      + '<div class="tut-guide-title">Your custom path<br>has been prepared.</div>'
      + '<div class="tut-guide-copy">Return each day and Omnia will adapt your path to you.</div>'
      + '<button class="tut-guide-start" id="tutGuide-start">Start Exploring →</button>'
      + '</div>';

    var isLeavingGuideIntro = false;
    function goHome() {
      if (isLeavingGuideIntro) return;
      isLeavingGuideIntro = true;
      localStorage.removeItem('presence_tutorialPending');
      renderConcHome();
      showScreen('homeScreen');
      if (typeof switchMode === 'function') switchMode('guide');
      var gt = document.getElementById('tutGuideTip');
      if (gt) {
        gt.style.display = 'block';
        setTimeout(function() { gt.classList.add('tut-ct-show'); }, 60);
        var gtTimer = setTimeout(function() { gt.classList.remove('tut-ct-show'); setTimeout(function(){gt.style.display='none';},600); }, 7000);
        var gtBtn = document.getElementById('tutGuideTipBtn');
        if (gtBtn) gtBtn.onclick = function() { clearTimeout(gtTimer); gt.classList.remove('tut-ct-show'); setTimeout(function(){gt.style.display='none';},600); };
      }
      requestAnimationFrame(function() {
        _tutDisablePostMode();
        ps.classList.remove('tut-ps-vis');
        setTimeout(function() { ps.classList.remove('tut-ps-show'); }, 500);
      });
    }

    document.getElementById('tutGuide-start').onclick = goHome;
    requestAnimationFrame(function() {
      requestAnimationFrame(function() { ps.classList.add('tut-ps-vis'); });
    });
  });
}
