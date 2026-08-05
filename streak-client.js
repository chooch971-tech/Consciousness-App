var STREAK_COMMITS = [
  { days:7,  xp:50,   akasha:2000  },
  { days:14, xp:100,  akasha:4500  },
  { days:30, xp:200,  akasha:10000 },
  { days:45, xp:300,  akasha:18000 },
];

function streakGoalIsComplete(streak, base, commit) {
  return Math.max(0, (streak || 0) - (base || 0)) >= (commit || 7);
}

function streakCalendarMonthValue(year, month) {
  return year * 12 + month;
}

function streakCalendarDayKeyMonth(key) {
  var match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(key || ''));
  if (!match) return null;
  var year = parseInt(match[1], 10);
  var month = parseInt(match[2], 10) - 1;
  var day = parseInt(match[3], 10);
  var date = new Date(year, month, day);
  if (date.getFullYear() !== year || date.getMonth() !== month || date.getDate() !== day) return null;
  return streakCalendarMonthValue(year, month);
}

// Persist the earliest calendar fact we know. practicedDates is capped for
// payload size, so the dedicated key keeps the calendar's true beginning even
// after those oldest day entries eventually roll off.
function streakCalendarStartDate() {
  var stored = streakCalendarDayKeyMonth(state.streakCalendarStartDate) !== null
    ? state.streakCalendarStartDate
    : null;
  var known = [];
  (state.practicedDates || []).concat(state.frozenDates || []).forEach(function(key) {
    if (streakCalendarDayKeyMonth(key) !== null) known.push(key);
  });
  if (streakCalendarDayKeyMonth(state.streakStartDate) !== null) known.push(state.streakStartDate);
  known.sort();
  var earliest = known[0] || presenceDayKey(new Date());
  var start = stored && stored < earliest ? stored : earliest;
  if (state.streakCalendarStartDate !== start) {
    state.streakCalendarStartDate = start;
    saveState();
  }
  return start;
}

function streakCalendarBounds() {
  var startKey = streakCalendarStartDate();
  var first = streakCalendarDayKeyMonth(startKey);
  var now = new Date();
  var current = streakCalendarMonthValue(now.getFullYear(), now.getMonth());
  return { first: first === null ? current : Math.min(first, current), last: current + 1 };
}

function buildStreakCalendar(year, month, commit) {
  var monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  var dayNames = ['S','M','T','W','T','F','S'];
  var now = new Date();
  var todayStr = presenceDayKey(now);
  var practiced = state.practicedDates || [];
  var frozen = state.frozenDates || [];
  var firstDow = new Date(year, month, 1).getDay();
  var daysInMonth = new Date(year, month + 1, 0).getDate();
  var goalEndStr = null;
  if (state.streakStartDate && commit) {
    var sd = presenceDateFromDayKey(state.streakStartDate);
    sd.setDate(sd.getDate() + (state.streakGoalBaseDays || 0) + commit - 1);
    goalEndStr = presenceDayKey(sd);
  }
  var prefix = year + '-' + String(month+1).padStart(2,'0') + '-';
  var practiced7 = practiced.filter(function(d){ return d.startsWith(prefix); }).length;
  var frozen7 = frozen.filter(function(d){ return d.startsWith(prefix); }).length;
  var bounds = streakCalendarBounds();
  var shownMonth = streakCalendarMonthValue(year, month);
  var html = '<div class="so-cal-header">'
    + '<button class="so-cal-nav" data-dir="prev" aria-label="Previous month"' + (shownMonth <= bounds.first ? ' disabled' : '') + '>◀</button>'
    + '<div class="so-cal-title">' + monthNames[month] + ' ' + year + '</div>'
    + '<button class="so-cal-nav" data-dir="next" aria-label="Next month"' + (shownMonth >= bounds.last ? ' disabled' : '') + '>▶</button>'
    + '</div>'
    + '<div class="so-cal-stats">'
    + '<div class="so-cal-stat"><div class="so-cal-stat-val">' + practiced7 + '</div><div class="so-cal-stat-lbl">✓ Practiced</div></div>'
    + '<div class="so-cal-stat"><div class="so-cal-stat-val">' + frozen7 + '</div><div class="so-cal-stat-lbl">❄ Freezes used</div></div>'
    + '</div>'
    + '<div class="so-cal-grid-head">' + dayNames.map(function(d){return '<span>'+d+'</span>';}).join('') + '</div>'
    + '<div class="so-cal-grid">';
  for (var i = 0; i < firstDow; i++) html += '<div class="so-cal-day empty"></div>';
  for (var d = 1; d <= daysInMonth; d++) {
    var ds = prefix + String(d).padStart(2,'0');
    var cls = 'so-cal-day';
    if (practiced.indexOf(ds) !== -1) cls += ' practiced';
    else if (frozen.indexOf(ds) !== -1) cls += ' frozen';
    if (ds === todayStr) cls += ' today';
    if (goalEndStr && ds === goalEndStr) cls += ' goal-end';
    html += '<div class="' + cls + '">' + d + '</div>';
  }
  return html + '</div>';
}

// The Streak view is a fixed overlay rather than a `.screen`, so it cannot use
// the app-wide swipe-back controller. Give it the same left-edge interaction
// locally while leaving vertical calendar scrolling and ordinary taps alone.
function wireStreakSwipeDismiss(el, dismiss) {
  if (!el) return;
  el._streakSwipeDismiss = dismiss;
  if (el._streakSwipeBound) return;
  el._streakSwipeBound = true;

  var gesture = null;
  var dragging = false;
  var settleTimer = 0;
  var EASE = 'cubic-bezier(0.25,0.46,0.45,0.94)';

  function clearSwipeStyles() {
    el.classList.remove('so-swipe-live');
    el.style.transform = '';
    el.style.transition = '';
    el.style.willChange = '';
  }

  function settleBack() {
    el.style.transition = 'transform .22s ' + EASE;
    el.style.transform = 'translate3d(0,0,0)';
    settleTimer = setTimeout(function() {
      settleTimer = 0;
      clearSwipeStyles();
    }, 220);
  }

  el.addEventListener('touchstart', function(e) {
    if (!el.classList.contains('so-show') || settleTimer) return;
    // Society is a child view above Streak. Its own Back button should win;
    // never dismiss the parent invisibly beneath it.
    var society = document.getElementById('societyOverlay');
    if (society && society.classList.contains('soc-show')) return;
    var t = e.touches && e.touches[0];
    if (!t || t.clientX > 44) return;
    gesture = { x:t.clientX, y:t.clientY };
    dragging = false;
  }, { passive:true });

  el.addEventListener('touchmove', function(e) {
    if (!gesture) return;
    var t = e.touches && e.touches[0];
    if (!t) return;
    var dx = t.clientX - gesture.x;
    var dy = Math.abs(t.clientY - gesture.y);
    if (!dragging) {
      if (dy > Math.abs(dx) + 8) { gesture = null; return; }
      if (Math.abs(dx) < 6) return;
      if (dx <= 0) { gesture = null; return; }
      dragging = true;
      el.classList.add('so-swipe-live');
      el.style.transition = 'none';
      el.style.willChange = 'transform';
    }
    if (e.cancelable) e.preventDefault();
    el.style.transform = 'translate3d(' + Math.max(0, dx) + 'px,0,0)';
  }, { passive:false });

  el.addEventListener('touchend', function(e) {
    if (!gesture) return;
    var t = e.changedTouches && e.changedTouches[0];
    var dx = t ? Math.max(0, t.clientX - gesture.x) : 0;
    gesture = null;
    if (!dragging) return;
    dragging = false;
    var width = Math.max(window.innerWidth || 375, 320);
    if (dx > width * 0.3) {
      el.style.transition = 'transform .26s ' + EASE;
      el.style.transform = 'translate3d(100%,0,0)';
      settleTimer = setTimeout(function() {
        var close = el._streakSwipeDismiss;
        if (typeof close === 'function') close(true);
        settleTimer = 0;
        clearSwipeStyles();
      }, 260);
    } else {
      settleBack();
    }
  }, { passive:true });

  el.addEventListener('touchcancel', function() {
    gesture = null;
    if (!dragging) return;
    dragging = false;
    settleBack();
  }, { passive:true });
}

function showStreakScreen() {
  var el = document.getElementById('streakOverlay');
  if (!el) return;
  if (typeof backfillPracticedDates === 'function') backfillPracticedDates();
  if (typeof migrateStreakGoalBase === 'function') migrateStreakGoalBase();
  var streak = state.streak || 0;
  var commit = state.streakCommit || 7;
  var freezes = state.streakFreezes || 0;
  var subText = streak === 0 ? 'The wick is dry. Light it today.'
    : streak === 1 ? 'First light — shelter it.'
    : streak < 7  ? ''
    : streak < 30 ? 'It burns steady now. Keep the vigil.'
    : 'A long-kept fire. Few hold one this long.';
  var now = new Date();
  var calYear = now.getFullYear();
  var calMonth = now.getMonth();
  var gemsHTML = [0,1,2].map(function(i){
    return '<div class="so-freeze-gem' + (i < freezes ? ' active' : '') + '"></div>';
  }).join('');
  var goalPct = commit > 0 ? Math.min(100, Math.round(streak / commit * 100)) : 100;
  var societyLocked = streak < 7;

  // A commitment stays locked until it is complete. Only then may the player
  // choose a fresh goal, measured from the current streak day. Goals already
  // passed remain locked so rewards cannot be claimed retroactively.
  function goalCardInner() {
    var commitNow = state.streakCommit || 7;
    var base = state.streakGoalBaseDays || 0;
    var done = Math.max(0, streak - base);          // days completed toward THIS goal
    var pct = commitNow > 0 ? Math.min(100, Math.round(done / commitNow * 100)) : 100;
    var completedCurrent = streakGoalIsComplete(streak, base, commitNow);
    var hasNextGoal = completedCurrent && STREAK_COMMITS.some(function(c) {
      return c.days !== commitNow && done < c.days;
    });
    var selLabel = completedCurrent
      ? (hasNextGoal ? 'Choose your next goal' : 'Commitment complete')
      : '';
    var tiersHTML = STREAK_COMMITS.map(function(c) {
      var isCurrent = commitNow === c.days;
      var isReached = done >= c.days;               // already cleared this many days in the window
      var cls = 'so-goal-tier';
      var disabled = false;
      if (isCurrent) { cls += ' selected'; disabled = true; }
      else if (isReached) { cls += ' reached'; disabled = true; }
      else if (!completedCurrent) { cls += ' locked'; disabled = true; }
      return '<button class="' + cls + '" data-days="' + c.days + '"' + (disabled ? ' disabled' : '') + '>'
        + '<span class="so-goal-tier-days">' + c.days + '</span>'
        + '<span class="so-goal-tier-unit">days</span>'
        + '<span class="so-goal-tier-reward">+' + c.akasha.toLocaleString() + '</span>'
        + '</button>';
    }).join('');
    return '<div class="so-goal-header"><span class="so-goal-title">Streak Goal</span><span class="so-goal-fraction">' + Math.min(done, commitNow) + ' / ' + commitNow + ' days</span></div>'
      + '<div class="so-goal-track"><div class="so-goal-fill" style="width:' + pct + '%"></div></div>'
      + '<div class="so-goal-labels"><span class="so-goal-lbl">' + (base > 0 ? 'Day ' + (base + 1) : 'Day 1') + '</span><span class="so-goal-lbl">✦ ' + commitNow + ' days</span></div>'
      + (selLabel ? '<div class="so-goal-select-label">' + selLabel + '</div>' : '')
      + '<div class="so-goal-tiers">' + tiersHTML + '</div>';
  }
  function wireGoalCard() {
    var card = document.getElementById('soGoalCard');
    if (!card) return;
    if (!streakGoalIsComplete(streak, state.streakGoalBaseDays || 0, state.streakCommit || 7)) return;
    card.querySelectorAll('.so-goal-tier:not([disabled])').forEach(function(btn) {
      btn.addEventListener('click', function() {
        if (!streakGoalIsComplete(streak, state.streakGoalBaseDays || 0, state.streakCommit || 7)) return;
        var days = parseInt(btn.dataset.days, 10);
        if (!days) return;
        // If the current goal is already complete, the new goal is a fresh
        // challenge measured from here — so it reads 0 / N, not N-already-done.
        var base = state.streakGoalBaseDays || 0;
        if (streak - base >= (state.streakCommit || 7)) state.streakGoalBaseDays = streak;
        state.streakCommit = days;
        localStorage.setItem('presence_streak_commit', String(days));
        saveState();
        if (syncEnabled && authToken) syncPushData();
        // Re-render only the goal card (not the whole overlay) so the calendar
        // nav listener on `el` isn't re-bound and stacked.
        card.innerHTML = goalCardInner();
        wireGoalCard();
        var cal = el.querySelector('.so-cal-card');
        if (cal) cal.innerHTML = buildStreakCalendar(parseInt(el.dataset.calYear, 10), parseInt(el.dataset.calMonth, 10), days);
        showToast('Streak goal set to ' + days + ' days', 2600);
      });
    });
  }
  el.innerHTML =
    '<button class="so-back-btn" id="soBackBtn" aria-label="Back">&#8592;</button>'
    + '<div class="so-hero">'
    + '<button class="so-vigil" id="soVigilBtn" type="button" aria-label="Flicker the streak candle">'
    + '<div class="so-vigil-glow' + (streak === 0 ? ' so-vigil-glow--unlit' : '') + '"></div>'
    + '<svg class="so-vigil-svg" viewBox="0 0 96 132" fill="none" aria-hidden="true">'
    + '<defs>'
    + '<linearGradient id="soVigC" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#efe4cc"/><stop offset=".6" stop-color="#d9c8a6"/><stop offset="1" stop-color="#b3a17e"/></linearGradient>'
    + '<radialGradient id="soVigF" cx="50%" cy="72%" r="66%"><stop offset="0" stop-color="#fff6d8"/><stop offset=".55" stop-color="#ffca70"/><stop offset="1" stop-color="#e0801e"/></radialGradient>'
    + '</defs>'
    + (streak > 0
        ? '<g class="so-vigil-flame">'
          + '<path d="M48 34C48 34 61 51 61 62.5C61 71 55.4 76 48 76C40.6 76 35 71 35 62.5C35 51 48 34 48 34Z" fill="url(#soVigF)" opacity=".96"/>'
          + '<path d="M48 50C48 50 54 59.5 52.6 66.5C51.5 72 45.5 72.5 43.8 69.5C42.5 67 44 61 48 50Z" fill="#fff8dc" opacity=".85"/>'
          + '</g>'
        : '<path d="M48 66c1.8 2.6 1.4 5.4-.4 7.6" stroke="rgba(170,178,196,.45)" stroke-width="1.4" stroke-linecap="round" fill="none"/>')
    + '<line x1="48" y1="76" x2="48" y2="83" stroke="#5a4630" stroke-width="2.2" stroke-linecap="round"/>'
    + '<path d="M35 86c0-2.2 5.8-4 13-4s13 1.8 13 4v34c0 2.2-5.8 4-13 4s-13-1.8-13-4V86z" fill="url(#soVigC)"/>'
    + '<ellipse cx="48" cy="86" rx="13" ry="4" fill="#f4ecd8"/>'
    + '<path d="M41 88c-1.4 4-1 9 .4 12.6 1 2.6-.8 3.4-2 1.4-2-3.4-2-10-1-13.2z" fill="#f8f2e2" opacity=".8"/>'
    + '<ellipse cx="48" cy="126" rx="20" ry="4" fill="rgba(255,160,60,.10)"/>'
    + '</svg>'
    + (streak > 0
        ? '<i class="so-vigil-ember" style="left:46%;--drift:-9px;"></i>'
          + '<i class="so-vigil-ember" style="left:52%;--drift:7px;animation-delay:1.3s;"></i>'
          + '<i class="so-vigil-ember" style="left:49%;--drift:-3px;animation-delay:2.4s;"></i>'
        : '')
    + '</button>'
    + '<div class="so-hero-num">' + streak + '</div>'
    + '<div class="so-hero-label">Day Streak</div>'
    + (subText ? '<div class="so-hero-sub">' + subText + '</div>' : '')
    + '<div class="so-hero-rule"></div>'
    + '</div>'
    + '<div class="so-body">'
    + '<div class="so-freeze-card">'
    + '<div class="so-freeze-icon"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true"><path d="M12 3v18M12 6l-2.6-2M12 6l2.6-2M12 18l-2.6 2M12 18l2.6 2M4.2 7.5l15.6 9M6.5 6.2l.4 3.2M4.5 10.8l3-1.1M17.1 14.6l3 -1.1M17.5 18.6l.4-3.2M19.8 7.5l-15.6 9M17.5 5.4l-.4 3.2M19.5 10.8l-3-1.1M6.9 14.6l-3-1.1M6.5 17.8l.4-3.2"/></svg></div>'
    + '<div class="so-freeze-text">'
    + '<div class="so-freeze-title">Streak Freezes · ' + freezes + ' held</div>'
    + '<div class="so-freeze-sub">Frost holds the flame through a missed day · +1 every 7 streak days</div>'
    + '<div class="so-freeze-gems">' + gemsHTML + '</div>'
    + '</div></div>'
    + '<div class="so-cal-card" id="soCalCard">' + buildStreakCalendar(calYear, calMonth, commit) + '</div>'
    + '<div class="so-goal-card" id="soGoalCard">' + goalCardInner() + '</div>'
    + '<div class="so-society-card" id="soSocietyCard" style="opacity:' + (societyLocked ? '.45' : '1') + (societyLocked ? '' : ';cursor:pointer') + '">'
    + '<div class="so-society-icon"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="9" cy="8.5" r="2.8"/><path d="M3.8 19c.9-3 2.9-4.6 5.2-4.6s4.3 1.6 5.2 4.6"/><circle cx="16.6" cy="9.5" r="2.2"/><path d="M15.4 14.7c2.1.2 3.9 1.7 4.7 4.3"/></svg></div>'
    + '<div class="so-society-text">'
    + '<div class="so-society-title">Friends Streaks</div>'
    + '<div class="so-society-sub">' + (societyLocked ? 'Reach a 7 day streak to join and see friends\' streaks' : 'Compare streaks with friends') + '</div>'
    + '</div>'
    + '<div class="so-society-lock">' + (societyLocked
        ? '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true"><rect x="5.5" y="10.5" width="13" height="9" rx="2"/><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5"/></svg>'
        : '→') + '</div>'
    + '</div>'
    + '<button class="so-close-btn" id="soCloseBtn">Close</button>'
    + '</div>';
  el.dataset.calYear = calYear;
  el.dataset.calMonth = calMonth;
  // Bind the month-nav handler ONCE. `el` is a persistent element reused every
  // time the streak screen opens, so re-adding this listener each open stacked
  // them — one tap then fired N times and skipped months (June went missing).
  if (!el._calNavBound) {
    el._calNavBound = true;
    el.addEventListener('click', function(e) {
      var btn = e.target.closest('.so-cal-nav');
      if (!btn) return;
      var yr = parseInt(el.dataset.calYear, 10);
      var mo = parseInt(el.dataset.calMonth, 10);
      var target = streakCalendarMonthValue(yr, mo) + (btn.dataset.dir === 'prev' ? -1 : 1);
      var bounds = streakCalendarBounds();
      if (target < bounds.first || target > bounds.last) return;
      yr = Math.floor(target / 12);
      mo = target - yr * 12;
      el.dataset.calYear = yr; el.dataset.calMonth = mo;
      var cal = el.querySelector('.so-cal-card');
      if (cal) cal.innerHTML = buildStreakCalendar(yr, mo, state.streakCommit || 7);
    });
  }
  function closeStreakOverlay(immediate) {
    el.classList.remove('so-vis');
    if (immediate === true) {
      el.classList.remove('so-show');
      return;
    }
    setTimeout(function() { el.classList.remove('so-show'); }, 420);
  }
  wireStreakSwipeDismiss(el, closeStreakOverlay);
  document.getElementById('soBackBtn').onclick = closeStreakOverlay;
  document.getElementById('soCloseBtn').onclick = closeStreakOverlay;
  var vigilBtn = document.getElementById('soVigilBtn');
  if (vigilBtn) {
    vigilBtn.onclick = function() {
      clearTimeout(vigilBtn._flickerTimer);
      vigilBtn.classList.remove('so-vigil-flicker');
      // Force a style flush so every tap restarts the one-shot flicker.
      void vigilBtn.offsetWidth;
      vigilBtn.classList.add('so-vigil-flicker');
      vigilBtn._flickerTimer = setTimeout(function() {
        vigilBtn.classList.remove('so-vigil-flicker');
      }, 700);
    };
  }
  if (!societyLocked) {
    var socCard = document.getElementById('soSocietyCard');
    if (socCard) socCard.onclick = openStreakSociety;
  }
  wireGoalCard();
  el.classList.add('so-show');
  requestAnimationFrame(function() { requestAnimationFrame(function() { el.classList.add('so-vis'); }); });
}

// Friends Streaks — the roster of shared vigils. Each accepted friend pair keeps
// a run of consecutive days both practiced; today is a grace day.
function openStreakSociety() {
  var el = document.getElementById('societyOverlay');
  if (!el) return;

  function closeSociety() {
    el.classList.remove('soc-vis');
    setTimeout(function() { el.classList.remove('soc-show'); }, 420);
  }

  var bannerHtml =
    '<div class="soc-banner-wrap">'
    + '<div class="ex-banner" style="--exb-rgb:126,184,164; --exb-light:#9ed8c4; margin:0; height:140px;">'
    + '<div class="soc-banner-title">Friends Streaks</div>'
    + '<div class="exb-right">'
    + '<div class="exb-glow"></div>'
    + '<div class="exb-ripple"></div><div class="exb-ripple"></div><div class="exb-ripple"></div>'
    + '<div class="exb-sym">'
    + '<svg width="92" height="92" viewBox="0 0 100 100" fill="none" aria-hidden="true">'
    + '<circle cx="50" cy="52" r="38" stroke="#9ed8c4" stroke-width="1.6" opacity="0.28"/>'
    + '<circle cx="50" cy="52" r="27" stroke="#9ed8c4" stroke-width="1.2" opacity="0.18"/>'
    + '<path d="M42 26 C42 26 57 46 57 60 C57 70 50 75 42 75 C34 75 27 70 27 60 C27 46 42 26 42 26 Z" fill="#9ed8c4" opacity="0.85" stroke="#9ed8c4" stroke-width="1"/>'
    + '<path d="M60 36 C60 36 70 50 70 60 C70 67 65 71 60 71 C55 71 50 67 50 60 C50 50 60 36 60 36 Z" fill="#c8ece0" opacity="0.95" stroke="#c8ece0" stroke-width="1"/>'
    + '<path d="M43 52 C43 52 49 60 47.6 65 C46.8 68.5 42.5 68.5 41.4 66 C40.5 64 41.5 60 43 52 Z" fill="#eafaf4" opacity="0.7"/>'
    + '</svg>'
    + '</div>'
    + '</div>'
    + '</div>'
    + '</div>';

  el.innerHTML =
    '<button class="so-back-btn" id="socBackBtn" aria-label="Back">&#8592;</button>'
    + bannerHtml
    + '<div id="socBody"></div>';

  document.getElementById('socBackBtn').onclick = closeSociety;

  var body = document.getElementById('socBody');

  function renderSignedOut() {
    body.innerHTML = '<div class="soc-msg">Sign in to keep vigils with friends.</div>';
  }
  function renderUnreachable() {
    body.innerHTML = '<div class="soc-msg">Friends Streaks is unavailable &mdash; try again later.</div>';
  }
  function renderEmpty() {
    body.innerHTML = '<div class="soc-msg">A vigil kept together burns brighter. Add a friend to begin.'
      + '<br><button class="b2t-btn soc-msg-btn" id="socAddBtn">Add Friends</button></div>';
    var b = document.getElementById('socAddBtn');
    if (b) b.onclick = function() {
      closeSociety();
      if (typeof openFriendsPanel === 'function') openFriendsPanel();
    };
  }
  function renderFriends(friends) {
    var mine = state.practicedDates || [];
    var rows = friends.map(function(f) {
      return { f: f, r: calcSharedStreak(mine, f.practicedDates || []) };
    });
    rows.sort(function(a, b) { return b.r.streak - a.r.streak; });
    var html = '<div class="soc-legend"><span class="soc-section-label">Shared Vigils</span>'
      + '<span class="soc-legend-dots">You &middot; Them</span></div>'
      + '<div class="soc-list">';
    rows.forEach(function(row) {
      var f = row.f, r = row.r;
      var uname = f.username || '?';
      var stateTxt, stateCls = '';
      // No shared run yet: a "waiting" label would imply a streak in jeopardy,
      // so the zero case wins outright. The waiting states below only apply
      // once there's an active shared vigil to keep alive.
      if (r.streak === 0) { stateTxt = 'Practice the same day to begin'; }
      else if (r.bothToday) { stateTxt = 'Extended today'; stateCls = ' lit'; }
      else if (r.todayMine && !r.todayTheirs) { stateTxt = 'Waiting on them'; stateCls = ' wait'; }
      else if (!r.todayMine && r.todayTheirs) { stateTxt = 'Waiting on you'; stateCls = ' wait'; }
      else { stateTxt = 'Both needed today'; }
      html += '<div class="soc-row">'
        + _friendRingHtml(uname[0], f.profilePic)
        + '<div class="soc-row-mid">'
        + '<div class="soc-name">@' + escHtml(uname) + '</div>'
        + '<div class="soc-state' + stateCls + '">' + stateTxt + '</div>'
        + '</div>'
        + '<div class="soc-right">'
        + '<div class="soc-count"><span class="soc-count-num' + (r.streak === 0 ? ' zero' : '') + '">' + r.streak + '</span>'
        + '<span class="soc-count-lbl">Days</span></div>'
        + '<div class="soc-dots">'
        + '<span class="soc-dot' + (r.todayMine ? ' on' : '') + '" title="You"></span>'
        + '<span class="soc-dot' + (r.todayTheirs ? ' on' : '') + '" title="Them"></span>'
        + '</div>'
        + '</div>'
        + '</div>';
    });
    html += '</div>';
    body.innerHTML = html;
  }

  if (!authToken) {
    renderSignedOut();
  } else {
    // Paint from cache first (avatars included) so vigils show immediately; the
    // network refresh below then updates streak state.
    var _socCached = (typeof getCachedFriendsList === 'function') ? getCachedFriendsList() : [];
    if (_socCached.length) renderFriends(_socCached);
    else body.innerHTML = '<div class="soc-msg" style="font-family:\'DM Mono\',monospace;font-size:10px;letter-spacing:.24em;text-transform:uppercase;font-style:normal;">Loading&hellip;</div>';
    fetch(SYNC_API_URL + '/friends/list', { headers: { 'Authorization': 'Bearer ' + authToken } })
      .then(function(res) { return res.json(); })
      .then(function(data) {
        var friends = (data && data.friends) || [];
        if (typeof cacheFriends === 'function') cacheFriends(friends);
        if (!friends.length) renderEmpty();
        else renderFriends(friends);
      })
      .catch(function() { renderUnreachable(); });
  }

  el.classList.add('soc-show');
  requestAnimationFrame(function() { requestAnimationFrame(function() { el.classList.add('soc-vis'); }); });
}

function showStreakEndedPrompt() {
  if (document.getElementById('streakEndedOverlay')) return;
  if (!state.endedStreakInfo) return;
  // Mark shown only now that we're actually rendering — if the app had reloaded
  // before reaching this point, the prompt gets another chance next launch.
  state.streakEndedPromptShown = true;
  saveState();
  var info = state.endedStreakInfo;
  var overlay = document.createElement('div');
  overlay.className = 'so-ended-overlay';
  overlay.id = 'streakEndedOverlay';
  var cardsHTML = STREAK_COMMITS.map(function(c, ti) {
    var sel = (state.streakCommit || 7) === c.days ? ' selected' : '';
    return '<div class="so-ended-commit-card seo-t' + ti + sel + '" data-days="' + c.days + '">'
      + '<div class="so-ended-commit-days">' + c.days + '</div>'
      + '<div class="so-ended-commit-unit">days</div>'
      + '<div class="so-ended-commit-xp">+' + c.xp.toLocaleString() + ' XP</div>'
      + '<div class="so-ended-commit-akasha">+' + c.akasha + ' Akasha</div>'
      + '</div>';
  }).join('');
  var embersHTML = [[34,0,-8],[48,.7,5],[60,1.3,12],[42,1.9,-4]].map(function(e) {
    return '<span class="so-ended-ember" style="left:' + e[0] + '%;animation-delay:' + e[1] + 's;--drift:' + e[2] + 'px;"></span>';
  }).join('');
  var smokeHTML = [[.05,-10,-14],[.30,8,12],[.60,-4,-6],[.95,13,16]].map(function(s) {
    return '<span class="so-ended-smoke" style="--sd:' + s[0] + 's;--sx:' + s[1] + 'px;--sr:' + s[2] + 'deg;"></span>';
  }).join('');
  var ashHTML = [[38,.05,-7],[46,.25,4],[55,.12,9],[50,.45,-3],[61,.34,6],[42,.58,-9]].map(function(a) {
    return '<span class="so-ended-ash" style="left:' + a[0] + '%;--ad:' + a[1] + 's;--ax:' + a[2] + 'px;"></span>';
  }).join('');
  // The freeze math behind the break — why freezes didn't (or couldn't) save it.
  var freezeNote = '';
  if (typeof info.missed === 'number') {
    var _fz = info.freezes || 0;
    freezeNote = '<div class="so-ended-freeze-note">❄ ' + info.missed + ' day' + (info.missed === 1 ? '' : 's') + ' missed — '
      + (_fz > 0
        ? 'more than your ' + _fz + ' freeze' + (_fz === 1 ? '' : 's') + ' could cover. Your freezes were kept.'
        : 'and no freezes were available to cover ' + (info.missed === 1 ? 'it' : 'them') + '.')
      + '</div>';
  }
  overlay.innerHTML = '<div class="so-ended-card">'
    + '<div class="so-ended-stage">'
    + '<div class="so-ended-flame-glow"></div>'
    // The same flame as the streak screen hero — it's that flame going out.
    + '<svg class="so-ended-flame-svg" viewBox="0 0 52 64" fill="none" aria-hidden="true">'
    + '<path d="M26 6C26 6 40 22 40 34C40 42 35 47 30 47C35 33 26 24 26 24C26 24 18 36 22 46C17 45 12 40 12 34C12 22 26 6 26 6Z" fill="rgba(255,200,80,0.9)"/>'
    + '<path d="M26 28C26 28 32 36 30 43C28 49 23 48 21 46C26 40 26 28 26 28Z" fill="rgba(255,250,180,0.8)"/>'
    + '<ellipse cx="26" cy="54" rx="13" ry="4" fill="rgba(180,80,20,0.30)"/>'
    + '</svg>'
    + embersHTML + smokeHTML + ashHTML
    + '</div>'
    + '<div class="so-ended-daysbig">' + (info.days || 0) + ' <span class="u">day' + (info.days === 1 ? '' : 's') + '</span></div>'
    + '<div class="so-ended-reveal">'
    + '<div class="so-ended-title">Streak Ended</div>'
    + '<div class="so-ended-sub">Your <span class="seo-days">' + (info ? info.days : 0) + ' day</span> streak ended. Every master has fallen — and risen. Commit to a new goal and begin again.</div>'
    + freezeNote
    + '<div class="so-ended-commits">' + cardsHTML + '</div>'
    + '<button class="so-ended-start" id="seoPrimaryBtn">Begin Again →</button>'
    + '<button class="so-ended-dismiss" id="seoDismissBtn">Maybe later</button>'
    + '</div>'
    + '</div>';
  document.body.appendChild(overlay);
  // Choreograph the extinguish: alive → struggle → out → ash → reveal.
  // Reduced-motion users skip straight to the revealed card.
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    overlay.dataset.seophase = 'reveal';
  } else {
    overlay.dataset.seophase = 'alive';
    [['struggle',1500],['out',2650],['ash',3350],['reveal',4150]].forEach(function(p) {
      setTimeout(function() { if (overlay.isConnected) overlay.dataset.seophase = p[0]; }, p[1]);
    });
  }
  overlay.querySelectorAll('.so-ended-commit-card').forEach(function(card) {
    card.addEventListener('click', function() {
      state.streakCommit = parseInt(card.dataset.days, 10);
      overlay.querySelectorAll('.so-ended-commit-card').forEach(function(c) { c.classList.remove('selected'); });
      card.classList.add('selected');
      saveState();
    });
  });
  function dismiss() {
    state.endedStreakInfo = null;
    saveState();
    overlay.classList.remove('seo-vis');
    setTimeout(function() { if(overlay.parentNode) overlay.parentNode.removeChild(overlay); }, 360);
  }
  document.getElementById('seoPrimaryBtn').onclick = dismiss;
  document.getElementById('seoDismissBtn').onclick = dismiss;
  requestAnimationFrame(function() {
    overlay.classList.add('seo-show');
    requestAnimationFrame(function() { overlay.classList.add('seo-vis'); });
  });
}

// A freeze being spent is the streak system's relief moment: the player came
// back expecting to have lost the run. It deliberately does NOT celebrate —
// missing a day shouldn't feel rewarded — so this is the extinguish animation's
// sober cousin: the flame gutters and nearly dies, frost closes over it, and it
// steadies. No burst, no fanfare, one quiet chime.
function showStreakFrozenPrompt() {
  if (document.getElementById('streakFrozenOverlay')) return;
  if (!state.frozenStreakInfo) return;
  var info = state.frozenStreakInfo;
  var eventKey = info.eventKey
    || ('freeze:legacy:' + String(state.lastSessionDate || '') + ':' + String(info.missed || 1));
  if (state.lastFrozenPromptKey === eventKey) {
    state.frozenStreakInfo = null;
    state.frozenPromptShown = true;
    saveState();
    return;
  }
  // Marked only now that it's actually rendering, so an app reload before this
  // point gets another chance instead of swallowing the moment. Once rendering
  // begins, consume the pending event and retain its key so a stale cloud/local
  // copy cannot replay the same animation on a later launch.
  state.lastFrozenPromptKey = eventKey;
  state.frozenPromptShown = true;
  state.frozenStreakInfo = null;
  saveState();
  var missed = info.missed || 1;
  var left = info.freezes || 0;
  var streak = state.streak || 0;

  var overlay = document.createElement('div');
  overlay.className = 'so-frozen-overlay';
  overlay.id = 'streakFrozenOverlay';

  // Frost spurs closing in over the flame from the rim of the stage.
  var spursHTML = [0, 45, 90, 135, 180, 225, 270, 315].map(function(deg, i) {
    return '<span class="so-frozen-spur" style="--sa:' + deg + 'deg;--sd:' + (i * 0.055) + 's;"></span>';
  }).join('');
  // Slow-settling frost motes, drifting down rather than rising like embers.
  var motesHTML = [[30, .1, -6], [44, .5, 5], [58, .9, 9], [50, 1.3, -4], [37, 1.7, 7]].map(function(m) {
    return '<span class="so-frozen-mote" style="left:' + m[0] + '%;--md:' + m[1] + 's;--mx:' + m[2] + 'px;"></span>';
  }).join('');

  overlay.innerHTML = '<div class="so-frozen-card">'
    + '<div class="so-frozen-stage">'
    + '<div class="so-frozen-glow"></div>'
    // The same flame the streak screen and the ended overlay use — continuity
    // matters here: this is that flame surviving rather than a new symbol.
    + '<svg class="so-frozen-flame-svg" viewBox="0 0 52 64" fill="none" aria-hidden="true">'
    + '<path d="M26 6C26 6 40 22 40 34C40 42 35 47 30 47C35 33 26 24 26 24C26 24 18 36 22 46C17 45 12 40 12 34C12 22 26 6 26 6Z" fill="rgba(255,200,80,0.9)"/>'
    + '<path d="M26 28C26 28 32 36 30 43C28 49 23 48 21 46C26 40 26 28 26 28Z" fill="rgba(255,250,180,0.8)"/>'
    + '<ellipse cx="26" cy="54" rx="13" ry="4" fill="rgba(180,80,20,0.30)"/>'
    + '</svg>'
    + '<div class="so-frozen-sheath"></div>'
    + spursHTML + motesHTML
    + '</div>'
    // Sits below the stage rather than over it: unlike the extinguish overlay,
    // the flame is still burning here, so an overlaid number collides with it.
    + '<div class="so-frozen-daysbig">' + streak + ' <span class="u">day' + (streak === 1 ? '' : 's') + '</span></div>'
    + '<div class="so-frozen-reveal">'
    + '<div class="so-frozen-title">Streak Held</div>'
    + '<div class="so-frozen-sub">You missed <span class="sfo-days">' + missed + ' day'
    + (missed === 1 ? '' : 's') + '</span>. Frost held the flame — your streak is intact.</div>'
    + '<div class="so-frozen-note">❄ ' + (left > 0
      ? left + ' freeze' + (left === 1 ? '' : 's') + ' remaining · +1 every 7 streak days'
      : 'No freezes left — the next missed day ends the streak.') + '</div>'
    + '<button class="so-frozen-continue" id="sfoContinueBtn">Continue →</button>'
    + '</div>'
    + '</div>';
  document.body.appendChild(overlay);

  // alive → gutter (nearly out) → frost (sheath closes) → hold (steadies) →
  // reveal. Reduced-motion users skip straight to the revealed card.
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    overlay.dataset.sfphase = 'reveal';
  } else {
    overlay.dataset.sfphase = 'alive';
    [['gutter', 900], ['frost', 2000], ['hold', 2950], ['reveal', 3600]].forEach(function(p) {
      setTimeout(function() { if (overlay.isConnected) overlay.dataset.sfphase = p[0]; }, p[1]);
    });
    setTimeout(function() { if (overlay.isConnected) playStreakFrostSound(); }, 2000);
  }

  function dismiss() {
    overlay.classList.remove('sfo-vis');
    setTimeout(function() { if (overlay.parentNode) overlay.parentNode.removeChild(overlay); }, 360);
  }
  document.getElementById('sfoContinueBtn').onclick = dismiss;
  requestAnimationFrame(function() {
    overlay.classList.add('sfo-show');
    requestAnimationFrame(function() { overlay.classList.add('sfo-vis'); });
  });
}

// Cold and quiet — a glassy settle, deliberately nothing like the streak
// celebration's rising major chord.
function playStreakFrostSound() {
  if (typeof appSoundEnabled === 'function' && !appSoundEnabled()) return;
  try {
    var ctx = new (window.AudioContext || window.webkitAudioContext)();
    var t0 = ctx.currentTime;
    // Frost settling — a short filtered noise wash, falling instead of rising.
    var noise = ctx.createBufferSource();
    var buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.9), ctx.sampleRate);
    var data = buf.getChannelData(0);
    for (var n = 0; n < data.length; n++) data[n] = (Math.random() * 2 - 1) * (1 - n / data.length);
    noise.buffer = buf;
    var bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 2.4;
    bp.frequency.setValueAtTime(3200, t0); bp.frequency.exponentialRampToValueAtTime(900, t0 + 0.8);
    var noiseG = ctx.createGain();
    noiseG.gain.setValueAtTime(0, t0);
    noiseG.gain.linearRampToValueAtTime(0.07, t0 + 0.08);
    noiseG.gain.exponentialRampToValueAtTime(0.001, t0 + 0.9);
    noise.connect(bp); bp.connect(noiseG); noiseG.connect(ctx.destination); noise.start(t0);
    // Two glass tones a fifth apart — held, unresolved, not triumphant.
    [1174.66, 1760.00].forEach(function(freq, i) {
      var delay = 0.18 + i * 0.10;
      var osc = ctx.createOscillator(), g = ctx.createGain();
      osc.type = 'sine'; osc.frequency.setValueAtTime(freq, t0 + delay);
      g.gain.setValueAtTime(0, t0 + delay);
      g.gain.linearRampToValueAtTime(0.05, t0 + delay + 0.03);
      g.gain.exponentialRampToValueAtTime(0.001, t0 + delay + 1.5);
      osc.connect(g); g.connect(ctx.destination);
      osc.start(t0 + delay); osc.stop(t0 + delay + 1.6);
    });
  } catch (e) {}
}

(function() {
  var badge = document.querySelector('.streak-badge');
  if (badge) badge.addEventListener('click', showStreakScreen);
  badge.style.cursor = 'pointer';
})();
