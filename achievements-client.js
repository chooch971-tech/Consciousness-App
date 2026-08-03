// ═══════════════ ACHIEVEMENTS ═══════════════
// Lifetime badges + a monthly set. Progress is tracked in presence_ach_v1
// (high-water marks + counters, so capped histories can't erase progress).
// Every badge pays akasha once, on the device where it is first earned.
var ACH_KEY = 'presence_ach_v1';
var achState = (function() {
  var def = { earned:{}, hwm:{}, flags:{}, counters:{}, exCount:0, seeded:false,
    monthly:{ key:'', loginDays:[], spentBase:0, fifteen:false, earned:{} },
    monthsCleared:0, clearedKeys:[], friendsSeen:{}, _updatedAt:0 };
  try {
    var s = localStorage.getItem(ACH_KEY);
    if (!s) return def;
    var p = JSON.parse(s);
    Object.keys(def).forEach(function(k){ if (p[k] == null) p[k] = def[k]; });
    return p;
  } catch(e) { return def; }
})();
function achSave() {
  achState._updatedAt = Date.now();
  try { localStorage.setItem(ACH_KEY, JSON.stringify(achState)); } catch(e) {}
}
function achMonthKey(d) { d = d || new Date(); return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0'); }
function achToday() { return presenceDayKey(); }

// ── Mastery per exercise: two tiers — mastered (\u2731) and completely mastered (\u2731\u2731) ──
function achTCBest(mode) {
  var live = (typeof getTCBestGap === 'function') ? (getTCBestGap(mode) || 0) : 0;
  return Math.max(live, (achState.hwm['tc_' + mode] || 0));
}
function achHwm(k, extra) { return Math.max(achState.hwm[k] || 0, extra || 0); }
function ACH_MASTERY_DEFS() {
  var cs = (typeof concState !== 'undefined' && concState) ? concState : {};
  var ct = achState.counters || {};
  var clockBest = achHwm('clock');
  var tcAll = Math.min(achTCBest('observation'), achTCBest('focus'), achTCBest('vacancy'));
  var senseAll = Math.min(achHwm('sense_feeling'), achHwm('sense_smell'), achHwm('sense_taste'));
  var vis = achHwm('visual'), aud = achHwm('auditory'), br = cs.lifetimeBreaths || 0;
  return [
    { ex:'Clock', mDesc:'10:00 unbroken watch', cDesc:'15:00', m: clockBest >= 600, c: clockBest >= 900 },
    { ex:'Thought Control', mDesc:'all three modes 10:00', cDesc:'15:00', m: tcAll >= 600, c: tcAll >= 900 },
    { ex:'Visualization', mDesc:'5:00 steady hold', cDesc:'10:00', m: vis >= 300, c: vis >= 600 },
    { ex:'Auditory', mDesc:'5:00 held listening', cDesc:'10:00', m: aud >= 300, c: aud >= 600 },
    { ex:'Sense Concentration', mDesc:'feeling, smell & taste 5:00 each', cDesc:'10:00 each', m: senseAll >= 300, c: senseAll >= 600 },
    { ex:'Asana', mDesc:'seven 30:00 sits', cDesc:'fourteen 60:00 sits', m: (ct.asana30 || 0) >= 7, c: (ct.asana60 || 0) >= 14 },
    { ex:'Soul Mirror', mDesc:'10 negative traits dissolved', cDesc:'25 dissolved', m: (ct.traitsGone || 0) >= 10, c: (ct.traitsGone || 0) >= 25 },
    { ex:'Pore Breathing', mDesc:'5,000 lifetime breaths', cDesc:'10,000', m: br >= 5000, c: br >= 10000 }
  ];
}
function achMasteryCounts() {
  var defs = ACH_MASTERY_DEFS(), some = 0, full = 0;
  defs.forEach(function(d) { if (d.m || d.c) some++; if (d.c) full++; });
  return { some: some, full: full, total: defs.length, defs: defs };
}

// ── Badge catalogue ──
function achProviders() {
  var m = achMasteryCounts();
  var aw = (typeof state !== 'undefined' && state) ? state : {};
  var cs = (typeof concState !== 'undefined' && concState) ? concState : {};
  var om = (typeof omniaState !== 'undefined' && omniaState) ? omniaState : {};
  var spentBase = achState.monthly.spentBase || 0;
  var fSeen = achState.friendsSeen, mk = achState.monthly.key, fMonth = 0;
  Object.keys(fSeen).forEach(function(id){ if (fSeen[id] === mk) fMonth++; });
  return {
    ex: achState.exCount,
    some: m.some, full: m.full,
    streak: Math.max(aw.streak || 0, aw.longestStreak || 0),
    clears: achState.monthsCleared,
    conc: cs.level || 1,
    aware: aw.level || 1,
    step: (om.prestige || 0) > 0 ? 10 : (om.bardonStep || 1),
    mLogin: (achState.monthly.loginDays || []).length,
    mFifteen: achState.monthly.fifteen ? 1 : 0,
    mSpent: Math.max(0, (om.totalAkashaSpent || 0) - spentBase),
    mFriends: fMonth
  };
}
function achTier(group, key, tiers, rewards, name, desc, fmt) {
  return tiers.map(function(t, i) {
    return { id: group + '_' + t, group: group, key: key, target: t, reward: rewards[i],
      name: name.replace('{n}', typeof fmt === 'function' ? fmt(t) : t), desc: desc.replace('{n}', t.toLocaleString()) };
  });
}
var ACH_GROUPS = [
  { id:'monthly', label:'This Month', monthly:true, items: []
      .concat(achTier('mlogin','mLogin',[7,14,21,26],[500,750,1000,1500],'{n} Days Present','Open the app on {n} different days this month.'))
      .concat(achTier('mfifteen','mFifteen',[1],[750],'The Long Sit','Complete one 15-minute exercise this month.'))
      .concat(achTier('mspend','mSpent',[3000,5000,10000],[500,750,1250],'Spend {n} Akasha','Spend {n} akasha this month.', function(n){return n.toLocaleString();}))
      .concat(achTier('mfriend','mFriends',[1,2,3],[500,750,1000],'{n} New Companions','Add {n} friends this month.')) },
  { id:'volume', label:'Practice Volume', items:
      achTier('ex','ex',[100,500,1000,5000,10000],[1000,2500,5000,25000,100000],'{n} Exercises','Complete {n} exercises of two minutes or longer.', function(n){return n.toLocaleString();}) },
  { id:'mastery', label:'Mastery', items:
      achTier('master','some',[1,2,3,5,7,8],[800,1500,2500,5000,10000,20000],'Master {n}','Earn at least one mastery asterisk in {n} exercises.', function(n){return n===8?'All Eight':n+(n===1?' Exercise':' Exercises');}) },
  { id:'fullmastery', label:'Complete Mastery', items:
      achTier('fullm','full',[1,2,3,5,7,8],[1500,3000,5000,10000,20000,50000],'Perfect {n}','Earn every asterisk in {n} exercises.', function(n){return n===8?'All Eight':n+(n===1?' Exercise':' Exercises');}) },
  { id:'vigil', label:'The Vigil', items:
      achTier('streak','streak',[7,14,21,30,45,60,90,150,365],[500,800,1200,2000,3000,5000,10000,20000,100000],'{n}-Day Vigil','Keep a {n}-day practice streak.') },
  { id:'devotion', label:'Monthly Devotion', items:
      achTier('clear','clears',[1,2,3,5,7],[2000,4000,8000,15000,30000],'{n}','Complete every monthly badge in {n} different months.', function(n){return n===1?'One Perfect Month':n+' Perfect Months';}) },
  { id:'conc', label:'Concentration', items:
      achTier('conc','conc',[25,50,80,100,200,300,500,700,777],[800,1500,2500,5000,10000,15000,25000,50000,77700],'Concentration {n}','Reach concentration level {n}.') },
  { id:'aware', label:'Awareness', items:
      achTier('aware','aware',[25,50,80,100,200,300,500,700,777],[800,1500,2500,5000,10000,15000,25000,50000,77700],'Awareness {n}','Reach awareness level {n}.') },
  { id:'path', label:'The Path', items:
      achTier('step','step',[2,3,4,5,6,7,8,9,10],[500,1000,1500,2500,4000,6000,9000,13000,20000],'Step {n}','Guide Omnia to Step {n} of Book I.', function(n){return ['','','II','III','IV','V','VI','VII','VIII','IX','X'][n];}) }
];
var ACH_MONTHLY_IDS = ACH_GROUPS[0].items.map(function(b){ return b.id; });
var ACH_ICONS = {
  monthly: '<path d="M14.5 3.5a8.5 8.5 0 1 0 6 14.7A9.5 9.5 0 0 1 14.5 3.5z"/>',
  mlogin: '<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M8 3v4M16 3v4M4 9h16m5 5 2 2 4-4"/>',
  mfifteen: '<path d="M7 3h10M7 21h10M8 3c0 4 1.3 6.4 4 9-2.7 2.6-4 5-4 9M16 3c0 4-1.3 6.4-4 9 2.7 2.6 4 5 4 9"/>',
  mspend: '<path d="M7 4h10l4 5-9 11L3 9l4-5zM3 9h18M7 4l5 16 5-16"/>',
  mfriend: '<circle cx="8" cy="8" r="3"/><circle cx="17" cy="9" r="2.5"/><path d="M2.5 19c.5-3.7 2.3-5.5 5.5-5.5s5 1.8 5.5 5.5M13.5 14.5c.9-.7 2-1 3.5-1 2.8 0 4.3 1.8 4.5 5.5"/>',
  volume: '<path d="M5 20v-6M12 20V9M19 20V4"/>',
  mastery: '<path d="M12 4v16M5.1 8l13.8 8M18.9 8L5.1 16"/>',
  fullmastery: '<circle cx="12" cy="12" r="9"/><path d="M12 6.5v11M7.2 9.2l9.6 5.6M16.8 9.2l-9.6 5.6"/>',
  vigil: '<path d="M12 3c3.2 3.8 6 6.3 6 9.8a6 6 0 0 1-12 0C6 9.3 8.8 6.8 12 3z"/>',
  devotion: '<path d="M12 3.5l1.9 6.1h6.4l-5.2 3.8 2 6.1-5.1-3.8-5.1 3.8 2-6.1-5.2-3.8h6.4z"/>',
  conc: '<circle cx="12" cy="12" r="8.5"/><path d="M12 6.8V12l3.4 2.1"/>',
  aware: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="2.6"/>',
  path: '<path d="M12 2.5l5 5.5-5 13.5L7 8l5-5.5zM7 8h10"/>'
};
var ACH_COLORS = { monthly:'#cdd6e8', volume:'#d4956e', mastery:'#e8c87a', fullmastery:'#f0d8ac', vigil:'#f0a860', devotion:'#c4a8d4', conc:'#e8b060', aware:'#7eb8a4', path:'#8ecce0' };
function achIconSvg(gid, badge) {
  var iconId = gid === 'monthly' && badge && ACH_ICONS[badge.group] ? badge.group : gid;
  return '<svg viewBox="0 0 24 24" aria-hidden="true">' + (ACH_ICONS[iconId] || ACH_ICONS.mastery) + '</svg>';
}

// ── Achievement reveal ceremony (#achRevealOverlay) ──────────────────────────
// Newly-earned badges play a queued unlock ceremony. It defers, then waits
// behind any session-complete / body-award / streak / level-up screen so it
// never stacks — then plays the whole batch as one ceremony with medal swaps.
// Honors the app sound setting and prefers-reduced-motion.
var _achRevealQueue = [];
var _achRevealActive = false;
var _achRevealWaits = 0;

function _achRevealBlocked() {
  var sc = document.getElementById('sessionComplete');
  if (sc && sc.classList.contains('sc-show')) return true;
  if (document.getElementById('bodyLevelAwardOverlay')) return true;
  var streak = document.getElementById('streakCelebOverlay');
  if (streak && streak.classList.contains('sco-show')) return true;
  var lu = document.getElementById('levelupOverlay');
  if (lu && lu.classList.contains('show')) return true;
  return false;
}

function queueAchievementReveal(badges) {
  if (!badges || !badges.length) return;
  if (!document.getElementById('achRevealOverlay')) {
    // No ceremony markup present — degrade to the old toast so the unlock is
    // never silently lost.
    if (typeof showToast === 'function') {
      var _sum = badges.reduce(function(s, b){ return s + (b.reward || 0); }, 0);
      showToast('✦ Achievement — ' + badges[0].name + ' · +' + _sum.toLocaleString() + ' akasha', 4200, 'gold');
    }
    return;
  }
  badges.forEach(function(b) { _achRevealQueue.push(b); });
  if (typeof completionFlowIsActive === 'function' && completionFlowIsActive()
      && typeof completionFlowQueue === 'function') {
    completionFlowQueue('achievement-reveal', 40, function(done) {
      var batch = _achRevealQueue.slice();
      _achRevealQueue = [];
      if (!batch.length) { done(); return; }
      _achRevealActive = true;
      _playAchievementReveal(batch, done);
    });
    return;
  }
  // Defer the first pump: achEvaluate often runs mid-completion, before the
  // session-complete screen has been shown — a beat lets it appear so we wait
  // behind it instead of playing underneath.
  setTimeout(_achRevealPump, 550);
}

function _achRevealPump() {
  if (_achRevealActive || !_achRevealQueue.length) return;
  if (_achRevealBlocked() && _achRevealWaits < 40) {
    _achRevealWaits++;
    setTimeout(_achRevealPump, 600);
    return;
  }
  _achRevealWaits = 0;
  var batch = _achRevealQueue.slice();
  _achRevealQueue = [];
  _achRevealActive = true;
  _playAchievementReveal(batch);
}

function _playAchievementReveal(batch, completionDone) {
  var el = document.getElementById('achRevealOverlay');
  if (!el) {
    _achRevealActive = false;
    if (completionDone) completionDone();
    return;
  }
  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var total = batch.length, idx = -1, lastAdv = 0;

  function burstHtml(n) {
    var colors = ['#fff0c8','#b8eaff','#d4956e','#e8d8b0','#a8d8ec','#ffe2a0'];
    var h = '<div class="acr-burst"><div class="acr-flash"></div><div class="acr-ring"></div><div class="acr-ring two"></div>';
    for (var i = 0; i < n; i++) {
      var a = (i / n) * 360 + (Math.random() * 14 - 7);
      var d = 120 + Math.random() * 90, s = 4 + Math.random() * 5, c = colors[i % colors.length];
      h += '<span class="acr-pt" style="--a:' + a + 'deg;--d:' + d + 'px;--dl:' + (Math.random() * 0.15) + 's;'
        + 'width:' + s + 'px;height:' + s + 'px;background:' + c + ';box-shadow:0 0 8px ' + c + '"></span>';
    }
    return h + '</div>';
  }
  function beadsHtml() {
    return [[18,0],[76,0.7],[30,1.3],[64,1.9],[46,2.4]].map(function(p) {
      var s = 3 + Math.random() * 3;
      return '<span class="acr-bead" style="left:' + p[0] + '%;bottom:8px;width:' + s + 'px;height:' + s + 'px;--dl:' + (1.4 + p[1]) + 's"></span>';
    }).join('');
  }
  function pipsHtml(i) {
    if (total < 2) return '';
    var h = '<div class="acr-pips">';
    for (var k = 0; k < total; k++) h += '<i class="' + (k <= i ? 'lit' : '') + '"></i>';
    return h + '</div>';
  }
  function tickAkasha(node, target) {
    if (reduced || !node) { if (node) node.textContent = '+' + target.toLocaleString(); return; }
    var t0 = null;
    (function stepAk(ts) {
      if (!t0) t0 = ts;
      var k = Math.min(1, (ts - t0) / 700); k = 1 - Math.pow(1 - k, 3);
      node.textContent = '+' + Math.round(target * k).toLocaleString();
      if (k < 1) requestAnimationFrame(stepAk);
    })(performance.now());
  }
  function render(b, i, first) {
    var late = first ? 0 : -0.35;
    var color = ACH_COLORS[b.group] || '#e8c87a';
    el.innerHTML = '<div class="acr-card">' + pipsHtml(i) + burstHtml(first ? 18 : 8)
      + '<div class="acr-zone"><div class="acr-halo"></div>'
      + '<div class="acr-medal" style="--gc:' + color + '">' + achIconSvg(b.group, b)
      + '<b>' + _achMedalText(b) + '</b><span class="acr-star">✦</span></div>' + beadsHtml() + '</div>'
      + '<div class="acr-eyebrow acr-fade" style="--dl:' + (0.85 + late) + 's">✦ &nbsp;Achievement&nbsp; ✦</div>'
      + '<div class="acr-name acr-fade" style="--dl:' + (0.95 + late) + 's" aria-live="polite">' + escHtml(b.name) + '</div>'
      + '<div class="acr-desc acr-fade" style="--dl:' + (1.08 + late) + 's">' + escHtml(b.desc) + '</div>'
      + '<div class="acr-akasha acr-fade" style="--dl:' + (1.2 + late) + 's"><span id="acrAk">+0</span><small>Akasha</small></div>'
      + '<button class="acr-btn acr-fade" style="--dl:' + (1.7 + late) + 's">' + (i < total - 1 ? 'Next ✦' : 'Continue →') + '</button></div>';
    el.querySelectorAll('.acr-medal svg *').forEach(function(p) { p.setAttribute('pathLength', 100); });
    var ak = Math.max(0, b.reward || 0);
    setTimeout(function() { tickAkasha(document.getElementById('acrAk'), ak); }, reduced ? 0 : (1.2 + late) * 1000);
  }
  function step(first) {
    idx++;
    if (idx >= total) { dismiss(); return; }
    render(batch[idx], idx, first);
    el.classList.add('acr-on');
    if (!first) { el.classList.remove('acr-swap'); void el.offsetWidth; el.classList.add('acr-swap'); }
    _achRevealSound(first);
    if (navigator.vibrate) navigator.vibrate(first ? [40, 60, 140] : [60]);
  }
  function advance() { var now = Date.now(); if (now - lastAdv < 340) return; lastAdv = now; step(false); }
  function dismiss() {
    el.onclick = null;
    el.classList.remove('acr-on', 'acr-swap');
    var done = completionDone;
    completionDone = null;
    _achRevealActive = false;
    if (done) done();
    setTimeout(function() {
      el.classList.remove('acr-show'); el.innerHTML = '';
      if (!done) { _achRevealActive = false; _achRevealPump(); }
    }, 460);
  }
  el.classList.add('acr-show');
  el.onclick = advance;
  requestAnimationFrame(function() { requestAnimationFrame(function() { step(true); }); });
}

function _achRevealSound(first) {
  if (typeof appSoundEnabled === 'function' && !appSoundEnabled()) return;
  try {
    var ctx = new (window.AudioContext || window.webkitAudioContext)();
    // The reveal fires after a session ends rather than from a tap, so the
    // context can arrive suspended under an autoplay policy and play silently.
    if (ctx.state === 'suspended' && ctx.resume) ctx.resume();
    var t = ctx.currentTime;
    if (first) {
      var sub = ctx.createOscillator(), sg = ctx.createGain();
      sub.type = 'sine'; sub.frequency.setValueAtTime(110, t); sub.frequency.exponentialRampToValueAtTime(45, t + 0.4);
      sg.gain.setValueAtTime(0.22, t); sg.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
      sub.connect(sg); sg.connect(ctx.destination); sub.start(t); sub.stop(t + 0.55);
    }
    [523.25, 659.25, 783.99, 1046.5].forEach(function(f, i) {
      var d = 0.3 + i * 0.07, o = ctx.createOscillator(), o2 = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'sine'; o2.type = 'triangle';
      o.frequency.setValueAtTime(f, t + d); o2.frequency.setValueAtTime(f * 2.005, t + d);
      g.gain.setValueAtTime(0, t + d); g.gain.linearRampToValueAtTime(i === 3 ? 0.12 : 0.08, t + d + 0.04);
      g.gain.exponentialRampToValueAtTime(0.001, t + d + 2.2);
      o.connect(g); o2.connect(g); g.connect(ctx.destination);
      o.start(t + d); o.stop(t + d + 2.4); o2.start(t + d); o2.stop(t + d + 2.4);
    });
  } catch (e) {}
}

// ── Seeding, month rollover, evaluation ──
function achSeed() {
  if (achState.seeded) return;
  achState.seeded = true;
  var aw = (typeof state !== 'undefined' && state) ? state : {};
  var cs = (typeof concState !== 'undefined' && concState) ? concState : {};
  // Credit past practice: assume recorded lifetime sessions qualify.
  achState.exCount = (cs.totalSessions || 0) + (aw.totalSessions || 0);
  try {
    // Strict per-entry matching only. guideExerciseStats() defaults unknown
    // entries to 'clock' and can fall back to whole-session durations, which
    // once seeded phantom masteries — never use it here.
    achState.counters = achState.counters || {};
    ((cs.history) || []).forEach(function(h) {
      if (typeof isClockSession === 'function' && isClockSession(h) && h.seconds) achState.hwm.clock = Math.max(achState.hwm.clock || 0, h.seconds);
      if (h.type === 'visualization' && h.seconds) achState.hwm.visual = Math.max(achState.hwm.visual || 0, h.seconds);
      if (h.type === 'auditory' && h.seconds) achState.hwm.auditory = Math.max(achState.hwm.auditory || 0, h.seconds);
      if (h.type === 'multi-sense') achState.flags.multisense = true;
      if (h.exercise === 'sense' && h.mode) achState.hwm['sense_' + h.mode] = Math.max(achState.hwm['sense_' + h.mode] || 0, h.seconds || 0);
      if (h.exercise === 'asana') {
        if ((h.seconds || 0) >= 1800) achState.counters.asana30 = (achState.counters.asana30 || 0) + 1;
        if ((h.seconds || 0) >= 3600) achState.counters.asana60 = (achState.counters.asana60 || 0) + 1;
      }
    });
  } catch(e) {}
  achSave();
}
function achEnsureMonth() {
  var mk = achMonthKey();
  if (achState.monthly.key === mk) return;
  var om = (typeof omniaState !== 'undefined' && omniaState) ? omniaState : {};
  achState.monthly = { key: mk, loginDays: [], spentBase: om.totalAkashaSpent || 0, fifteen: false, earned: {} };
  achSave();
}
function achTouchLogin() {
  achEnsureMonth();
  var days = achState.monthly.loginDays || (achState.monthly.loginDays = []);
  var changed = false;
  var d = achToday();
  if (days.indexOf(d) === -1) { days.push(d); changed = true; }
  // A day carrying a completed session is a day the app was open, so fold the
  // practice calendar in. loginDays is only ever appended live, on days this
  // function actually runs, and it sits nested inside presence_ach_v1.monthly
  // where the cloud merge does not union it — so it could drift below the very
  // calendar it should exceed, reporting 21 Days Present against 28 practiced
  // days in the same month. practicedDates drives that calendar and IS merged
  // as a union, which makes this both a repair of the past and a floor going
  // forward. Frozen days are deliberately excluded: a freeze is spent for you,
  // without the app being opened.
  var prefix = achState.monthly.key + '-';
  var practiced = (typeof state !== 'undefined' && state && state.practicedDates) || [];
  for (var i = 0; i < practiced.length; i++) {
    var day = practiced[i];
    if (typeof day === 'string' && day.indexOf(prefix) === 0 && days.indexOf(day) === -1) {
      days.push(day);
      changed = true;
    }
  }
  if (changed) { days.sort(); achSave(); }
}
// One-time repair for the stats-based seed above: re-derive clock/visual/
// auditory strictly, then revoke any Mastery badges the polluted seed paid
// for (clawing the akasha back) so earned badges match the live counts.
function achRemaster() {
  if (achState._remaster1) return;
  achState._remaster1 = 1;
  achState.hwmV = 2;
  delete achState.hwm.clock; delete achState.hwm.visual; delete achState.hwm.auditory;
  var cs = (typeof concState !== 'undefined' && concState) ? concState : {};
  ((cs.history) || []).forEach(function(h) {
    if (typeof isClockSession === 'function' && isClockSession(h) && h.seconds) achState.hwm.clock = Math.max(achState.hwm.clock || 0, h.seconds);
    if (h.type === 'visualization' && h.seconds) achState.hwm.visual = Math.max(achState.hwm.visual || 0, h.seconds);
    if (h.type === 'auditory' && h.seconds) achState.hwm.auditory = Math.max(achState.hwm.auditory || 0, h.seconds);
  });
  var m = achMasteryCounts();
  var refund = 0;
  achState.revoked = achState.revoked || {};
  ACH_GROUPS.forEach(function(g) {
    g.items.forEach(function(b) {
      if (b.group !== 'master' && b.group !== 'fullm') return;
      var live = b.group === 'master' ? m.some : m.full;
      if (achState.earned[b.id] && live < b.target) {
        delete achState.earned[b.id];
        achState.revoked[b.id] = Date.now();
        refund += b.reward;
      }
    });
  });
  if (refund > 0 && typeof omniaState !== 'undefined' && omniaState) {
    omniaReverseAkashaCredit(refund, 'achievement-revocation');
    if (typeof saveOmniaState === 'function') saveOmniaState();
  }
  achSave();
}
function achEvaluate(silent) {
  if (typeof omniaState === 'undefined' || !omniaState) return;
  achSeed(); achRemaster(); achEnsureMonth(); achTouchLogin();
  // A startup cloud pull still in flight means the earned map may not have
  // merged yet. Awarding now would re-grant akasha for achievements already
  // earned on another device (the sync double-award bug). Date/login
  // bookkeeping above is safe; defer awarding until the pull settles — the
  // boot settle-waiter and post-pull evaluate re-run this once it clears.
  if (window._syncPullPending) { achSave(); return; }
  var p = achProviders();
  var newly = [];
  ACH_GROUPS.forEach(function(g) {
    g.items.forEach(function(b) {
      var earnedMap = g.monthly ? achState.monthly.earned : achState.earned;
      if (earnedMap[b.id]) return;
      if ((p[b.key] || 0) >= b.target) {
        earnedMap[b.id] = Date.now();
        newly.push(b);
      }
    });
  });
  if (newly.length) {
    var total = 0;
    newly.forEach(function(b){ total += b.reward; });
    var got = omniaCreditAkasha(total, 'achievement', { count: newly.length });
    // Expose the just-earned batch so a session-complete screen can show it in
    // its own banner (the achievement toast fires behind that opaque overlay).
    window._lastAchievementBatch = { name: newly[0].name, count: newly.length, akasha: got };
    if (typeof saveOmniaState === 'function') saveOmniaState();
    achSave();
    if (!silent) {
      // The unlock ceremony is the achievement's moment now — it queues behind
      // any session-complete screen and plays a batch as one sequence.
      queueAchievementReveal(newly);
    }
  } else {
    achSave(); // persists login-day / month-rollover bookkeeping
  }
  // A completed monthly set counts as a perfect month exactly once — checked on
  // every evaluate (not only when a badge was just earned here) so sets finished
  // via a sync merge still count.
  var allDone = ACH_MONTHLY_IDS.every(function(id){ return achState.monthly.earned[id]; });
  if (allDone && achState.clearedKeys.indexOf(achState.monthly.key) === -1) {
    achState.clearedKeys.push(achState.monthly.key);
    achState.monthsCleared = achState.clearedKeys.length;
    achSave();
    achEvaluate(silent); // the perfect-month badges themselves may now unlock
    return;
  }
  if (document.getElementById('achScreen') && document.getElementById('achScreen').style.display !== 'none') renderAchScreen();
}

// ── Hooks from the practice pipeline ──
var ACH_EX_MAP = { pore_breathing:'pore' };
function achOnCompletion(opts) {
  try {
    achEnsureMonth();
    var e = (opts && opts.entry) || {};
    var sec = Math.max(e.seconds || 0, e.sessionDurationSec || 0, (e.durationMin || 0) * 60);
    var ex = ACH_EX_MAP[opts.exId] || opts.exId;
    if (e.type === 'multi-sense') achState.flags.multisense = true;
    if (ex && sec) achState.hwm[ex] = Math.max(achState.hwm[ex] || 0, e.seconds || sec);
    if (e.mode && opts.exId === 'thought') achState.hwm['tc_' + e.mode] = Math.max(achState.hwm['tc_' + e.mode] || 0, e.seconds || 0);
    if (ex === 'sense' && e.mode) achState.hwm['sense_' + e.mode] = Math.max(achState.hwm['sense_' + e.mode] || 0, e.seconds || 0);
    if (ex === 'asana') {
      achState.counters = achState.counters || {};
      if (sec >= 1800) achState.counters.asana30 = (achState.counters.asana30 || 0) + 1;
      if (sec >= 3600) achState.counters.asana60 = (achState.counters.asana60 || 0) + 1;
    }
    if (sec >= 120) achState.exCount = (achState.exCount || 0) + 1;
    if (sec >= 900) achState.monthly.fifteen = true;
    achSave();
    achEvaluate();
  } catch(err) {}
}
function achOnAwarenessSession(durationMin) {
  try {
    achEnsureMonth();
    var sec = (durationMin || 0) * 60;
    if (sec >= 120) achState.exCount = (achState.exCount || 0) + 1;
    if (sec >= 900) achState.monthly.fifteen = true;
    achSave();
    achEvaluate();
  } catch(err) {}
}
function achSeeFriends(friends) {
  try {
    achEnsureMonth();
    var mk = achState.monthly.key, changed = false;
    (friends || []).forEach(function(f) {
      var id = f.userId || f.id || f._id || f.username;
      if (id && !achState.friendsSeen[id]) { achState.friendsSeen[id] = mk; changed = true; }
    });
    if (changed) { achSave(); achEvaluate(); }
  } catch(err) {}
}

// ── Screen ──
var _achSelected = null;

// ── Achievement info popover (tap an achievement on a profile) ──
// Works on the user's own Profile (shows progress + reward) and on a friend's
// Profile (read-only, earned date). Copy in the ACH_GROUPS data — never from the
// friend payload — so a friend's stored fields can't inject markup.
var _currentFriendProfile = null;
function _achMedalText(b) {
  return b.group === 'step' ? ['','','II','III','IV','V','VI','VII','VIII','IX','X'][b.target]
    : b.target >= 1000 ? (b.target / 1000) + 'k' : b.target;
}
function showAchInfo(id, friend, earnedAt) {
  var badge = null, group = null;
  ACH_GROUPS.forEach(function(g) { g.items.forEach(function(b) { if (b.id === id) { badge = b; group = g; } }); });
  if (!badge) return;
  var ov = document.getElementById('achInfoOverlay'), body = document.getElementById('achInfoBody');
  if (!ov || !body) return;
  // Reuses the exact same .ach-detail-* classes as the Achievements screen's
  // own detail sheet (#achDetail) so this reads as the identical popup —
  // only the progress fill's color is overridden per-group (e.g. blue for
  // The Path) instead of the fixed orange gradient .ach-detail-fill uses.
  var gc = ACH_COLORS[group.id] || '#e8c87a';
  var kicker = group.monthly ? 'Monthly Badge' : escHtml(group.label);
  var statusHtml;
  if (friend) {
    var d = earnedAt ? new Date(Number(earnedAt) || earnedAt) : null;
    if (d && !isNaN(d.getTime())) kicker += ' · earned ' + d.toLocaleDateString();
    statusHtml = '<div class="ach-detail-row"><span class="ach-detail-prog">✦ Earned</span></div>';
  } else {
    var earnedMap = group.monthly ? achState.monthly.earned : achState.earned;
    var eAt = earnedMap[badge.id];
    var p = achProviders();
    var cur = Math.min(p[badge.key] || 0, badge.target);
    var pct = eAt ? 100 : Math.min(100, Math.round(cur / badge.target * 100));
    if (eAt) kicker += ' · earned ' + new Date(eAt).toLocaleDateString();
    statusHtml = '<div class="ach-detail-bar"><div class="ach-detail-fill" style="width:' + pct + '%;background:' + gc + ';"></div></div>'
      + '<div class="ach-detail-row"><span class="ach-detail-prog">' + (eAt ? 'COMPLETE' : cur.toLocaleString() + ' / ' + badge.target.toLocaleString()) + '</span>'
      + '<span class="ach-detail-reward">' + (eAt ? '✦ PAID' : '✦ +' + badge.reward.toLocaleString() + ' AKASHA') + '</span></div>';
  }
  body.innerHTML = '<button class="ach-detail-close" aria-label="Close">✕</button>'
    + '<div class="ach-detail-kicker">' + kicker + '</div>'
    + '<div class="ach-detail-name">' + escHtml(badge.name) + '</div>'
    + '<div class="ach-detail-desc">' + escHtml(badge.desc) + '</div>'
    + statusHtml;
  ov.classList.add('on');
}
function closeAchInfo() { var ov = document.getElementById('achInfoOverlay'); if (ov) ov.classList.remove('on'); }
// #achInfoOverlay's markup lives near the end of <body>, well after this
// script tag — binding here at parse time would silently find `null` and
// never attach, leaving the popup impossible to close once opened. Defer
// to DOMContentLoaded (same pattern used elsewhere for scripts that run
// ahead of their markup).
function _wireAchInfoOverlay() {
  var ov = document.getElementById('achInfoOverlay');
  if (ov) ov.addEventListener('click', function(e) { if (e.target === ov || e.target.closest('.ach-detail-close')) closeAchInfo(); });
  function ownHandler(e) { var it = e.target.closest('[data-ach]'); if (it) showAchInfo(it.getAttribute('data-ach'), null); }
  function friendHandler(e) {
    var it = e.target.closest('[data-ach]');
    if (it && _currentFriendProfile) showAchInfo(it.getAttribute('data-ach'), _currentFriendProfile, it.getAttribute('data-earned'));
  }
  ['profAchievements', 'profBadges'].forEach(function(id) { var el = document.getElementById(id); if (el) el.addEventListener('click', ownHandler); });
  ['friendProfAch', 'friendProfBadges'].forEach(function(id) { var el = document.getElementById(id); if (el) el.addEventListener('click', friendHandler); });
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', _wireAchInfoOverlay);
else _wireAchInfoOverlay();
// Duolingo-style split: the profile's Monthly Badges › and Achievements ›
// open this same screen in two different modes — monthly badges alone, or
// the all-time groups alone — instead of one long mixed page.
var _achScreenMode = 'alltime';
function renderAchScreen(mode) {
  if (mode === 'monthly' || mode === 'alltime') _achScreenMode = mode;
  var body = document.getElementById('achBody');
  if (!body) return;
  achSeed(); achEnsureMonth();
  var p = achProviders();
  var monthly = _achScreenMode === 'monthly';
  var banner = document.querySelector('#achScreen .ach-banner-title');
  if (banner) banner.textContent = monthly ? 'Monthly Badges' : 'Achievements';
  body.innerHTML = monthly ? _achMonthlyHtml() : _achRecordsHtml(p) + _achAwardsHtml();
  renderAchDetail(p);
}

// ── Monthly mode: this month's badge families laid out exactly like the
// Awards grid (one card per family, medal + label + "n of m"), then a year
// calendar of perfect months (big discs, future months locked). ──
var ACH_MONTHLY_FAMILY_LABELS = { mlogin:'Days Present', mfifteen:'The Long Sit', mspend:'Akasha Spent', mfriend:'New Companions' };
function _achMonthlyHtml() {
  var g = ACH_GROUPS[0];
  var earnedMap = achState.monthly.earned;
  var earnedN = g.items.filter(function(b){ return earnedMap[b.id]; }).length;
  var monthName = new Date().toLocaleString('en', { month:'long' });
  var daysLeft = (function(){ var n = new Date(); return new Date(n.getFullYear(), n.getMonth()+1, 1) - n; })();
  daysLeft = Math.max(1, Math.ceil(daysLeft / 86400000));
  // Group the monthly tiers into their families, preserving first-seen order,
  // so each renders as a single Awards-style card instead of one disc per tier.
  var fams = [], byFam = {};
  g.items.forEach(function(b) {
    if (!byFam[b.group]) { byFam[b.group] = []; fams.push(b.group); }
    byFam[b.group].push(b);
  });
  var cards = fams.map(function(fam) {
    var items = byFam[fam];
    var eN = items.filter(function(b){ return earnedMap[b.id]; }).length;
    var next = items.filter(function(b){ return !earnedMap[b.id]; })[0] || items[items.length - 1];
    var shown = eN ? items[eN - 1] : next; // medal shows the tier you hold
    var label = ACH_MONTHLY_FAMILY_LABELS[fam] || items[0].name;
    return '<button class="ach-badge ach-award' + (eN ? ' earned' : '') + (_achSelected === next.id ? ' sel' : '') + '" data-ach="' + next.id + '">'
      + '<span class="ach-medal" style="--gc:' + ACH_COLORS.monthly + '">' + achIconSvg('monthly', shown) + '<b>' + _achMedalText(shown) + '</b></span>'
      + '<span class="ach-badge-lbl">' + label + '</span>'
      + '<span class="ach-award-prog">' + eN + ' of ' + items.length + '</span></button>';
  }).join('');
  return '<div class="ach-sec-title" style="margin-top:4px;">' + monthName + ' Badges</div>'
    + '<div class="ach-month-note">Resets in ' + daysLeft + ' day' + (daysLeft === 1 ? '' : 's') + ' · ' + earnedN + ' / ' + g.items.length + ' earned. A perfect month feeds the Monthly Devotion badges.</div>'
    + '<div class="ach-awards">' + cards + '</div>'
    + _achYearsHtml();
}
var ACH_LOCK_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5.5" y="10.5" width="13" height="9" rx="2"/><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5"/></svg>';
function _achYearsHtml() {
  var cleared = {};
  (achState.clearedKeys || []).forEach(function(k){ cleared[k] = true; });
  var now = new Date();
  var years = [now.getFullYear()];
  Object.keys(cleared).forEach(function(k){ var y = +k.split('-')[0]; if (y && years.indexOf(y) === -1) years.push(y); });
  years.sort(function(a, b){ return b - a; });
  return years.map(function(y) {
    var months = '';
    for (var m = 1; m <= 12; m++) {
      var key = y + '-' + String(m).padStart(2, '0');
      var name = new Date(y, m - 1, 1).toLocaleString('en', { month:'long' });
      var future = y > now.getFullYear() || (y === now.getFullYear() && m - 1 > now.getMonth());
      var isNow = y === now.getFullYear() && m - 1 === now.getMonth();
      var cls = cleared[key] ? ' ach-ym--perfect' : isNow ? ' ach-ym--now' : '';
      var inner = cleared[key] ? '✦' : future ? ACH_LOCK_SVG : isNow ? '✦' : '';
      months += '<div class="ach-ym' + cls + '"><span class="ach-ym__disc">' + inner + '</span><span class="ach-ym__lbl">' + name + '</span></div>';
    }
    return '<div class="ach-sec-title">' + y + ' Perfect Months</div><div class="ach-year-grid">' + months + '</div>';
  }).join('');
}

// ── All-time mode: Personal Records cards up top, then one award per badge
// family with tier progress ("2 of 9") — reference layout, Presence dress. ──
function _achRecordsHtml(p) {
  var clock = (achState.hwm && achState.hwm.clock) || 0;
  var roman = ['','I','II','III','IV','V','VI','VII','VIII','IX','X'];
  var fmt = function(sec){ var m = Math.floor(sec / 60), s = Math.round(sec % 60); return m + ':' + String(s).padStart(2, '0'); };
  var recs = [
    { icon:'vigil', c:'#f0a860', show: p.streak > 0, val: String(p.streak), lbl:'Longest Streak' },
    { icon:'mfifteen', c:'#cdd6e8', show: clock > 0, val: fmt(clock), lbl:'Best Clock Hold' },
    { icon:'volume', c:'#d4956e', show: p.ex > 0, val: Number(p.ex).toLocaleString(), lbl:'Exercises' },
    { icon:'conc', c:'#e8b060', show: true, val: String(p.conc), lbl:'Concentration' },
    { icon:'aware', c:'#7eb8a4', show: true, val: String(p.aware), lbl:'Awareness' },
    { icon:'path', c:'#8ecce0', show: true, val: roman[p.step] || 'I', lbl:'Bardon Step' }
  ].filter(function(r){ return r.show; });
  return '<div class="ach-sec-title" style="margin-top:4px;">Personal Records</div>'
    + '<div class="ach-rec-row">' + recs.map(function(r) {
      return '<div class="ach-rec-card" style="--rc:' + r.c + ';">'
        + '<svg viewBox="0 0 24 24" aria-hidden="true">' + ACH_ICONS[r.icon] + '</svg>'
        + '<span class="ach-rec-val">' + r.val + '</span>'
        + '<span class="ach-rec-lbl">' + r.lbl + '</span></div>';
    }).join('') + '</div>';
}
function _achAwardsHtml() {
  var cards = ACH_GROUPS.filter(function(g){ return !g.monthly; }).map(function(g) {
    var earnedN = g.items.filter(function(b){ return achState.earned[b.id]; }).length;
    var next = g.items.filter(function(b){ return !achState.earned[b.id]; })[0] || g.items[g.items.length - 1];
    var shown = earnedN ? g.items[earnedN - 1] : next; // medal shows the tier you hold
    return '<button class="ach-badge ach-award' + (earnedN ? ' earned' : '') + (_achSelected === next.id ? ' sel' : '') + '" data-ach="' + next.id + '">'
      + '<span class="ach-medal" style="--gc:' + (ACH_COLORS[g.id] || '#e8c87a') + '">' + achIconSvg(g.id) + '<b>' + _achMedalText(shown) + '</b></span>'
      + '<span class="ach-badge-lbl">' + g.label + '</span>'
      + '<span class="ach-award-prog">' + earnedN + ' of ' + g.items.length + '</span></button>';
  }).join('');
  return '<div class="ach-sec-title">Awards</div><div class="ach-awards">' + cards + '</div>';
}
function renderAchDetail(p) {
  var box = document.getElementById('achDetail');
  if (!box) return;
  if (!_achSelected) { box.style.display = 'none'; return; }
  var badge = null, group = null;
  ACH_GROUPS.forEach(function(g){ g.items.forEach(function(b){ if (b.id === _achSelected) { badge = b; group = g; } }); });
  if (!badge) { box.style.display = 'none'; return; }
  p = p || achProviders();
  var earnedMap = group.monthly ? achState.monthly.earned : achState.earned;
  var earnedAt = earnedMap[badge.id];
  var cur = Math.min(p[badge.key] || 0, badge.target);
  var pct = Math.min(100, Math.round(cur / badge.target * 100));
  var extra = '';
  if (badge.group === 'master' || badge.group === 'fullm') {
    var mm = achMasteryCounts();
    extra = '<div class="ach-detail-desc" style="margin-top:8px;line-height:1.9;">' + mm.defs.map(function(d) {
      var stars = d.c ? '<span style="color:#e8c87a;">✱✱</span>' : d.m ? '<span style="color:#e8c87a;">✱</span><span style="opacity:.3;">✱</span>' : '<span style="opacity:.3;">✱✱</span>';
      return '<span style="white-space:nowrap;">' + d.ex + ' ' + stars + ' <span style="opacity:.55;font-size:10px;">(' + d.mDesc + ' · ✱✱ ' + d.cDesc + ')</span></span>';
    }).join('<br>') + '</div>';
  }
  box.style.display = '';
  box.innerHTML = '<button class="ach-detail-close" aria-label="Close">✕</button>'
    + '<div class="ach-detail-kicker">' + (group.monthly ? 'Monthly · resets on the 1st' : group.label) + (earnedAt ? ' · earned ' + new Date(earnedAt).toLocaleDateString() : '') + '</div>'
    + '<div class="ach-detail-name">' + badge.name + '</div>'
    + '<div class="ach-detail-desc">' + badge.desc + '</div>' + extra
    + '<div class="ach-detail-bar"><div class="ach-detail-fill" style="width:' + (earnedAt ? 100 : pct) + '%"></div></div>'
    + '<div class="ach-detail-row"><span class="ach-detail-prog">' + (earnedAt ? 'COMPLETE' : cur.toLocaleString() + ' / ' + badge.target.toLocaleString()) + '</span>'
    + '<span class="ach-detail-reward">' + (earnedAt ? '✦ PAID' : '✦ +' + badge.reward.toLocaleString() + ' AKASHA') + '</span></div>';
}
document.getElementById('achBody').addEventListener('click', function(e) {
  var btn = e.target.closest('.ach-badge');
  if (!btn) return;
  _achSelected = btn.dataset.ach === _achSelected ? null : btn.dataset.ach;
  // Update selection in place — no re-render, no scroll jump, so you can
  // tab straight through the grid while the sheet updates underneath.
  document.querySelectorAll('#achBody .ach-badge').forEach(function(b) {
    b.classList.toggle('sel', b.dataset.ach === _achSelected);
  });
  renderAchDetail();
});
document.getElementById('achDetail').addEventListener('click', function(e) {
  if (!e.target.closest('.ach-detail-close')) return;
  _achSelected = null;
  document.querySelectorAll('#achBody .ach-badge.sel').forEach(function(b){ b.classList.remove('sel'); });
  document.getElementById('achDetail').style.display = 'none';
});
document.getElementById('achBannerStar').addEventListener('click', function() {
  var host = this;
  for (var i = 0; i < 3; i++) {
    var r = document.createElement('div');
    r.className = 'exb-ripple exb-ripple-burst';
    r.style.animationDelay = (i * 0.18) + 's';
    host.appendChild(r);
    r.addEventListener('animationend', function() { this.remove(); });
  }
});
document.getElementById('achBackBtn').addEventListener('click', function() {
  _achSelected = null;
  var d = document.getElementById('achDetail'); if (d) d.style.display = 'none';
  // Achievements is reached from the Profile (Duolingo-style) now that its
  // drawer entry is gone, so back returns there — without touching the
  // profile's own remembered return screen.
  if (typeof renderProfile === 'function') { renderProfile(); showScreen('profileScreen'); }
  else { renderHome(); showScreen('homeScreen'); }
});
// Boot: count today's login and settle anything already earned — but only once
// any startup cloud pull has finished merging, so a fresh device never awards
// akasha for achievements it's about to receive as already-earned from the cloud.
(function _achBootSettle(waited){
  if (window._syncPullPending && waited < 30000) { setTimeout(function(){ _achBootSettle(waited + 400); }, 400); return; }
  // Silent: settle already-earned badges without playing the unlock ceremony on
  // launch (a first run back-credits many badges from past practice).
  try { achEvaluate(true); } catch(e) {}
})(0);
