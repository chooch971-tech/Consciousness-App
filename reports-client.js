// ═══════════════════════════════════════
// REPORTS SYSTEM
// ═══════════════════════════════════════

var currentReportPeriod = 'daily';
var reportOffset = 0;

// ── Omnia report eligibility ──────────────────────────────
function isOmniaReportDay(period) {
  var now = new Date();
  if (period === 'daily') return false; // daily commentary only on past days (offset < 0)
  if (period === 'weekly') return now.getDay() === 0; // Sunday
  if (period === 'monthly') {
    var lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    return now.getDate() === lastDay;
  }
  return false;
}

// Earliest timestamp the user has ever logged a session — Omnia has nothing
// to reflect on before this, so reports/API calls for earlier periods are blocked.
function getFirstUseDate() {
  var dates = [];
  (state.history || []).forEach(function(h) { if (h.date) dates.push(new Date(h.date).getTime()); });
  (concState.history || []).forEach(function(h) { if (h.date) dates.push(new Date(h.date).getTime()); });
  if (!dates.length) return Date.now();
  return Math.min.apply(null, dates);
}

function omniaReportPeriodKey(period, offset) {
  offset = offset || 0;
  var now = new Date();
  if (period === 'daily') {
    var d = new Date(now); d.setDate(d.getDate() + offset);
    return presenceDayKey(d);
  }
  if (period === 'weekly') {
    var sun = new Date(now); sun.setDate(now.getDate() - now.getDay() + offset * 7);
    return presenceWeekKey(sun);
  }
  if (period === 'monthly') {
    var mo = new Date(now.getFullYear(), now.getMonth() + offset, 1);
    return 'm-' + presenceMonthKey(mo);
  }
  return 'y-' + now.getFullYear();
}

function omniaReportCacheKey(period, offset) {
  return 'presence_omnia_report_v2_' + omniaReportPeriodKey(period, offset);
}

function omniaReportTTL(period) {
  if (period === 'daily') return 86400000;
  if (period === 'weekly') return 7 * 86400000;
  return 31 * 86400000;
}

// Snapshot of today's daily regiment for Omnia's discipline commentary: how
// much of it is finished, and how many focus exercises (Clock + Thought
// Control modes) it contains. Only meaningful for the current day.
function omniaRegimenSnapshot() {
  if (typeof buildGuideRegimentItems !== 'function') return null;
  var items;
  try { items = buildGuideRegimentItems(); } catch(e) { return null; }
  if (!items || !items.length) return null;
  var FOCUS = { clock:1, thought:1, observation:1, focus:1, vacancy:1 };
  var THOUGHT = { thought:1, observation:1, focus:1, vacancy:1 };
  var total = 0, completed = 0, focusCount = 0, thoughtCount = 0, clockCount = 0, have = {}, stack = [];
  items.forEach(function(it) {
    var key = it.tcMode || it.mode || it.id;
    total++;
    if (it.done || it.sessionDone) completed++;
    if (FOCUS[it.id] || FOCUS[key]) { focusCount++; have[key] = 1; }
    if (THOUGHT[it.id] || THOUGHT[key]) thoughtCount++;
    if (it.id === 'clock' || key === 'clock') clockCount++;
    stack.push(it.name || key || 'Exercise');
  });
  // A Thought Control mode they don't already run — what Omnia should suggest
  // adding when the regiment holds fewer than two focus exercises.
  var addMode = ['observation','focus','vacancy'].filter(function(m){ return !have[m]; })[0] || 'observation';
  var TC_LABEL = { observation:'Thought Observation', focus:'Thought Focus', vacancy:'Vacancy of Mind' };
  return {
    total: total, completed: completed, complete: total > 0 && completed >= total,
    focusCount: focusCount, hasTwoFocus: focusCount >= 2,
    thoughtCount: thoughtCount, hasTwoThoughtControls: thoughtCount >= 2,
    clockCount: clockCount, exercises: stack,
    suggestFocus: TC_LABEL[addMode]
  };
}

// Consecutive most-recent PRACTICED days with no gain in either best unbroken
// hold or practiced duration against a trailing seven-practiced-day baseline.
// Deterministic from history, so viewing old reports never mutates it.
function omniaPracticeSeconds(h) {
  if (!h) return 0;
  if (h.type === 'thought' && typeof guideThoughtDuration === 'function') return guideThoughtDuration(h);
  if (typeof guideSessionSec === 'function') return guideSessionSec(h);
  return Math.max(0, parseInt(h.sessionDurationSec,10) || parseInt(h.durationSec,10) || parseInt(h.seconds,10) || 0);
}

function omniaDaysWithoutImprovement(endExclusive) {
  var h = (typeof concState !== 'undefined' && concState.history) ? concState.history : [];
  var byDay = {};
  h.forEach(function(e) {
    if (!e || !e.date) return;
    var when = new Date(e.date);
    if (endExclusive && !isNaN(when) && when >= endExclusive) return;
    var day = presenceDayKey(e.date), sec = omniaPracticeSeconds(e), hold = isHoldSession(e) ? (e.seconds || 0) : 0;
    if (!byDay[day]) byDay[day] = { best:0, total:0 };
    byDay[day].total += sec;
    if (hold > byDay[day].best) byDay[day].best = hold;
  });
  var days = Object.keys(byDay).sort();
  var improved = [];
  days.forEach(function(day, index) {
    if (index === 0) { improved.push(true); return; }
    var priorDays = days.slice(Math.max(0, index - 7), index);
    var priorBest = Math.max.apply(null, priorDays.map(function(d){ return byDay[d].best; }));
    var priorAvgTotal = priorDays.reduce(function(sum, d){ return sum + byDay[d].total; }, 0) / priorDays.length;
    improved.push(byDay[day].best > priorBest || byDay[day].total > priorAvgTotal);
  });
  var count = 0;
  for (var i = improved.length - 1; i >= 1; i--) {
    if (improved[i]) break;
    count++;
  }
  return count;
}

function omniaConcentrationBreakdown(history) {
  var byExercise = {}, practicedDays = {};
  (history || []).forEach(function(h) {
    if (!h) return;
    var ex = h.type || h.exercise || 'clock';
    var sec = omniaPracticeSeconds(h);
    var hold = isHoldSession(h) ? (h.seconds || 0) : 0;
    var day = h.date ? presenceDayKey(h.date) : null;
    if (!byExercise[ex]) byExercise[ex] = { sessions:0, total_sec:0, best_sec:0, days:{} };
    byExercise[ex].sessions++;
    byExercise[ex].total_sec += sec;
    if (hold > byExercise[ex].best_sec) byExercise[ex].best_sec = hold;
    if (day) { byExercise[ex].days[day] = 1; practicedDays[day] = 1; }
  });
  return { byExercise:byExercise, practicedDays:Object.keys(practicedDays) };
}

function buildOmniaReportContext(period, offset) {
  var range = getDateRange(period, offset || 0);
  var awNow = filterHistory(state.history, range.start, range.now);
  var concNow = filterHistory(concState.history, range.start, range.now);
  var awMin = sumMinutes(awNow);
  var concSec = concNow.reduce(function(a,h){return a+omniaPracticeSeconds(h);},0);
  var _concHold = concNow.filter(isHoldSession);
  var concBest = _concHold.length ? Math.max.apply(null,_concHold.map(function(h){return h.seconds||0;})) : 0;
  // The current Guide stack constrains recommendations in every report, even
  // when the report reflects on an earlier or longer period. Completion fields
  // remain live-daily data only; the stack is recommendation context elsewhere.
  var _currentRegimen = omniaRegimenSnapshot();

  // Per-exercise concentration breakdown (clock entries have no `type` field)
  var EX_LABELS = { clock:'Clock', visualization:'Visualization', auditory:'Auditory', thought:'Thought Control', asana:'Asana', pore_breathing:'Pore Breathing', autosuggestion:'Autosuggestion', 'all-angles':'All Angles', 'multi-sense':'Multi-Sense' };
  // Only the five core Bardon exercises are candidates for "try this next" —
  // the rest are unlockable extras Omnia shouldn't push.
  var CORE_EX = ['clock', 'visualization', 'auditory', 'thought', 'asana'];
  var byEx = omniaConcentrationBreakdown(concNow).byExercise;
  var concByExercise = {};
  Object.keys(byEx).forEach(function(ex){
    concByExercise[EX_LABELS[ex] || ex] = {
      sessions:byEx[ex].sessions,
      total_sec:byEx[ex].total_sec,
      best_sec:byEx[ex].best_sec
    };
  });
  // Which core exercises has the user never touched this period?
  var untried = CORE_EX
    .filter(function(ex){ return !byEx[ex]; })
    .map(function(ex){ return EX_LABELS[ex]; });
  if (_currentRegimen && _currentRegimen.hasTwoThoughtControls) {
    untried = untried.filter(function(name){ return name !== 'Clock'; });
  }

  // Foundation gate: don't suggest moving on to the later exercises
  // (Visualization, Auditory, Asana) until the user has reached a 10-minute
  // interval on either Clock (longest hold) or Thought Control (longest gap),
  // measured all-time so a past achievement still counts.
  var clockPB = concState.bestSeconds || 0;
  var thoughtBest = 0;
  try {
    var _ts = guideThoughtStats();
    ['observation','focus','vacancy'].forEach(function(m){
      if (_ts[m] && _ts[m].bestSec > thoughtBest) thoughtBest = _ts[m].bestSec;
    });
  } catch(e) {}
  var readyForNewExercises = clockPB >= 600 || thoughtBest >= 600;
  if (!readyForNewExercises) {
    var GATED = { Visualization:1, Auditory:1, Asana:1 };
    untried = untried.filter(function(name){ return !GATED[name]; });
  }

  // Concentration streak: consecutive calendar days ending on the last day of
  // the period that had at least one concentration session. Computed from local
  // history so it's never stale (unlike state.streak which tracks awareness).
  var concStreakDays = 0;
  var _streakDay = new Date(range.now);
  _streakDay.setDate(_streakDay.getDate() - 1); // last calendar day inside range
  _streakDay.setHours(0, 0, 0, 0);
  for (var _si = 0; _si < 365; _si++) {
    var _dStr = presenceDayKey(_streakDay);
    var _hadConc = concState.history.some(function(h) { return h.date && presenceDayKey(h.date) === _dStr; });
    if (!_hadConc) break;
    concStreakDays++;
    _streakDay.setDate(_streakDay.getDate() - 1);
  }

  // Daily coaching compares this day with the seven calendar days immediately
  // before it. Weekly/monthly reports retain their natural prior-period window.
  var comparisonStart = new Date(range.prevStart);
  var comparisonEnd = new Date(range.prevEnd);
  if (period === 'daily') {
    comparisonEnd = new Date(range.start);
    comparisonStart = new Date(range.start);
    comparisonStart.setDate(comparisonStart.getDate() - 7);
  }
  var comparisonAw = filterHistory(state.history, comparisonStart, comparisonEnd);
  var comparisonConc = filterHistory(concState.history, comparisonStart, comparisonEnd);
  var comparisonSummary = omniaConcentrationBreakdown(comparisonConc);
  var comparisonByEx = comparisonSummary.byExercise;
  var comparisonTotalSec = comparisonConc.reduce(function(sum,h){ return sum + omniaPracticeSeconds(h); }, 0);
  var comparisonHolds = comparisonConc.filter(isHoldSession);
  var comparisonBestSec = comparisonHolds.length ? Math.max.apply(null,comparisonHolds.map(function(h){ return h.seconds || 0; })) : 0;
  var comparisonPracticedDays = comparisonSummary.practicedDays.length;
  var comparisonAvgDailySec = comparisonPracticedDays ? comparisonTotalSec / comparisonPracticedDays : 0;
  var exerciseProgress = {}, improvedExercises = [], newlyPracticedExercises = [];
  Object.keys(byEx).forEach(function(ex) {
    var current = byEx[ex], prior = comparisonByEx[ex] || null;
    var priorDays = prior ? Object.keys(prior.days || {}).length : 0;
    var priorAvg = priorDays ? prior.total_sec / priorDays : 0;
    var label = EX_LABELS[ex] || ex;
    var focusImproved = !!prior && current.best_sec > prior.best_sec;
    var durationImproved = !!prior && current.total_sec > priorAvg;
    if (!prior) newlyPracticedExercises.push(label);
    if (focusImproved || durationImproved) improvedExercises.push(label);
    exerciseProgress[label] = {
      current_sessions:current.sessions,
      current_total_sec:current.total_sec,
      current_best_sec:current.best_sec,
      baseline_sessions:prior ? prior.sessions : 0,
      baseline_best_sec:prior ? prior.best_sec : 0,
      baseline_avg_practiced_day_sec:Math.round(priorAvg),
      best_focus_improved:focusImproved,
      practice_duration_improved:durationImproved
    };
  });
  var hasComparisonConcentration = comparisonConc.length > 0;
  var bestFocusImproved = hasComparisonConcentration && concBest > comparisonBestSec;
  var practiceDurationImproved = hasComparisonConcentration && concSec > (period === 'daily' ? comparisonAvgDailySec : comparisonTotalSec);

  // Did this period set the all-time best hold?
  var priorConc = filterHistory(concState.history, new Date(0), range.start);
  var priorHolds = priorConc.filter(isHoldSession);
  var priorAllTimeBest = priorHolds.length ? Math.max.apply(null,priorHolds.map(function(h){ return h.seconds || 0; })) : 0;
  var isNewBestHold = concBest > priorAllTimeBest && concBest > 0;

  // Deterministic per-report hint so the streak gets woven in occasionally —
  // not every single report, and not never.
  var _pk = omniaReportPeriodKey(period, offset || 0);
  var _pkHash = 0;
  for (var _pi = 0; _pi < _pk.length; _pi++) { _pkHash = (_pkHash * 31 + _pk.charCodeAt(_pi)) | 0; }
  var streakWorthMentioning = Math.abs(_pkHash) % 2 === 0;

  // Only a live daily report may discuss completion of today's regimen. The
  // current stack still constrains recommendations on historical daily reports.
  var _regimen = (period === 'daily' && (offset || 0) === 0) ? _currentRegimen : null;
  var _noImprove = omniaDaysWithoutImprovement(range.now);
  var _needsPush = _noImprove >= 5;
  var _improved = hasComparisonConcentration ? (bestFocusImproved || practiceDurationImproved || improvedExercises.length > 0) : null;
  var recommendationExclusions = [];
  if (_currentRegimen && _currentRegimen.hasTwoThoughtControls) {
    recommendationExclusions.push('Clock', 'Thought Control');
    untried = untried.filter(function(name){ return name !== 'Clock' && name !== 'Thought Control'; });
  }

  return {
    report_policy_version: 2,
    period: period,
    offset: offset || 0,
    regimen_total: _regimen ? _regimen.total : null,
    regimen_completed: _regimen ? _regimen.completed : null,
    regimen_complete: _regimen ? _regimen.complete : null,
    current_regimen_exercises: _currentRegimen ? _currentRegimen.exercises : [],
    focus_exercise_count: _currentRegimen ? _currentRegimen.focusCount : null,
    has_two_focus_exercises: _currentRegimen ? _currentRegimen.hasTwoFocus : null,
    thought_control_stack_count: _currentRegimen ? _currentRegimen.thoughtCount : 0,
    has_two_thought_control_exercises: !!(_currentRegimen && _currentRegimen.hasTwoThoughtControls),
    suggested_focus_exercise: (_currentRegimen && !_currentRegimen.hasTwoFocus) ? _currentRegimen.suggestFocus : null,
    avoid_clock_recommendation: !!(_currentRegimen && _currentRegimen.hasTwoThoughtControls),
    recommendation_exclusions: recommendationExclusions,
    allowed_recommendations: untried.slice(),
    improved: _improved,
    days_without_improvement: _noImprove,
    needs_push: _needsPush,
    awareness_sessions: awNow.length,
    awareness_minutes: awMin,
    concentration_sessions: concNow.length,
    concentration_total_sec: concSec,
    concentration_best_sec: concBest,
    completed_exercises: Object.keys(concByExercise),
    concentration_by_exercise: concByExercise,
    exercise_progress: exerciseProgress,
    concentration_exercises_untried: untried,
    ready_for_new_exercises: readyForNewExercises,
    concentration_streak_days: concStreakDays,
    practice_streak_days: state.streak || 0,
    clock_alltime_pb_sec: concState.bestSeconds || 0,
    is_new_best_hold: isNewBestHold,
    progress_signals: {
      best_focus_improved: bestFocusImproved,
      practice_duration_improved: practiceDurationImproved,
      improved_exercises: improvedExercises,
      newly_practiced_exercises: newlyPracticedExercises
    },
    comparison_baseline: {
      window: period === 'daily' ? 'preceding_7_days' : 'previous_' + period,
      start_date: presenceDayKey(comparisonStart),
      end_date_exclusive: presenceDayKey(comparisonEnd),
      awareness_sessions: comparisonAw.length,
      concentration_sessions: comparisonConc.length,
      concentration_practiced_days: comparisonPracticedDays,
      concentration_total_sec: comparisonTotalSec,
      concentration_avg_practiced_day_sec: Math.round(comparisonAvgDailySec),
      concentration_best_hold_sec: comparisonBestSec
    },
    has_previous_data: (comparisonAw.length + comparisonConc.length) > 0,
    streak_worth_mentioning: streakWorthMentioning,
    omnia_candor: getOmniaCandor()
  };
}

function getOmniaDeviceId() {
  var key = 'presence_device_id';
  var id = localStorage.getItem(key);
  if (!id) {
    id = 'xxxxxxxxxxxx4xxxyxxxxxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      var r = Math.random() * 16 | 0;
      return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
    localStorage.setItem(key, id);
  }
  return id;
}

function fetchOmniaReport(period, offset, cb) {
  var cacheKey = omniaReportCacheKey(period, offset);
  var ttl = omniaReportTTL(period);
  // A past period (offset < 0) is immutable — once cached, keep it forever so
  // the commentary never changes and we never spend another API call on it.
  var isPast = (offset || 0) < 0;
  try {
    var cached = JSON.parse(localStorage.getItem(cacheKey) || 'null');
    if (cached && cached.commentary && (isPast || (cached.ts && (Date.now() - cached.ts) < ttl))) {
      return cb(null, cached.commentary);
    }
  } catch(e) {}

  var ctx = buildOmniaReportContext(period, offset);
  ctx.periodKey = omniaReportPeriodKey(period, offset);
  ctx.utcOffsetMinutes = -new Date().getTimezoneOffset();

  var token = authToken || localStorage.getItem('presence_auth_token');
  if (!token) return cb('sign-in-required');
  var headers = { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token };

  fetch(SYNC_API_URL + '/omnia/report', {
    method: 'POST',
    headers: headers,
    body: JSON.stringify({ period: period, context: ctx })
  }).then(function(r){ return r.json(); }).then(function(data){
    if (data.commentary) {
      localStorage.setItem(cacheKey, JSON.stringify({ ts: Date.now(), commentary: data.commentary }));
      cb(null, data.commentary);
    } else {
      cb(data.error || 'no-commentary');
    }
  }).catch(function(e){ cb(e); });
}

var OMNIA_CRYSTAL_SVG_RPT = '<svg class="rpt-omnia-crystal" viewBox="0 0 80 130" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">'
  + '<defs>'
  + '<linearGradient id="rptOg1" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#ddf0ff" stop-opacity="0.92"/><stop offset="100%" stop-color="#6ab8d8" stop-opacity="0.48"/></linearGradient>'
  + '<linearGradient id="rptOg2" x1="100%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stop-color="#ffffff" stop-opacity="0.78"/><stop offset="100%" stop-color="#4a9ec0" stop-opacity="0.22"/></linearGradient>'
  + '<radialGradient id="rptOg3" cx="50%" cy="38%" r="58%"><stop offset="0%" stop-color="#b8eaff" stop-opacity="0.42"/><stop offset="100%" stop-color="#2878a0" stop-opacity="0"/></radialGradient>'
  + '<filter id="rptOglow"><feGaussianBlur stdDeviation="2.5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>'
  + '</defs>'
  + '<ellipse cx="40" cy="68" rx="28" ry="48" fill="url(#rptOg3)" opacity="0.62"/>'
  + '<polygon points="40,3 54,14 40,25 26,14" fill="url(#rptOg1)" stroke="#90cce8" stroke-width="0.55" filter="url(#rptOglow)"/>'
  + '<polygon points="40,3 54,14 40,13" fill="#ceeaff" opacity="0.72"/>'
  + '<polygon points="40,3 26,14 40,13" fill="#b0dcf5" opacity="0.42"/>'
  + '<line x1="40" y1="3" x2="40" y2="25" stroke="#b8e0f8" stroke-width="0.4" opacity="0.55"/>'
  + '<line x1="26" y1="14" x2="54" y2="14" stroke="#b8e0f8" stroke-width="0.4" opacity="0.35"/>'
  + '<polygon points="40,25 60,36 64,58 40,70 16,58 20,36" fill="url(#rptOg1)" stroke="#88c4e0" stroke-width="0.55"/>'
  + '<polygon points="40,25 60,36 40,44" fill="#d4ecff" opacity="0.52"/>'
  + '<polygon points="40,25 20,36 40,44" fill="#bce0f8" opacity="0.32"/>'
  + '<line x1="40" y1="25" x2="40" y2="70" stroke="#a8d8f2" stroke-width="0.38" opacity="0.48"/>'
  + '<polygon points="16,58 64,58 40,70" fill="url(#rptOg2)" opacity="0.38"/>'
  + '<polygon points="40,70 64,58 56,88 40,100 24,88 16,58" fill="url(#rptOg1)" stroke="#88c4e0" stroke-width="0.55" opacity="0.88"/>'
  + '<polygon points="40,100 56,88 40,114" fill="url(#rptOg2)" stroke="#88c4e0" stroke-width="0.48" opacity="0.72"/>'
  + '<polygon points="40,100 24,88 40,114" fill="#b4dcf4" stroke="#88c4e0" stroke-width="0.48" opacity="0.52"/>'
  + '<g opacity="0.65" filter="url(#rptOglow)"><line x1="6" y1="22" x2="12" y2="22" stroke="#b8eaff" stroke-width="1"/><line x1="9" y1="19" x2="9" y2="25" stroke="#b8eaff" stroke-width="1"/></g>'
  + '<g opacity="0.48"><line x1="68" y1="48" x2="74" y2="48" stroke="#b8eaff" stroke-width="0.9"/><line x1="71" y1="45" x2="71" y2="51" stroke="#b8eaff" stroke-width="0.9"/></g>'
  + '</svg>';

var OMNIA_SHARD_SVG = '<svg viewBox="0 0 10 12" width="10" height="12"><polygon points="5,1 9,4 7.5,11 2.5,11 1,4" fill="currentColor" stroke="rgba(255,255,255,.5)" stroke-width="0.5"/></svg>';

var OMNIA_CLIPBOARD_SVG_CONTENT = '<rect x="2" y="5" width="34" height="41" rx="3" fill="#1a1f2e" stroke="rgba(184,234,255,.25)" stroke-width="1"/>'
  + '<rect x="12" y="1" width="14" height="8" rx="3" fill="#243040" stroke="rgba(184,234,255,.3)" stroke-width="1"/>'
  + '<rect x="15" y="3" width="8" height="4" rx="2" fill="#0e1420"/>'
  + '<rect x="7" y="14" width="22" height="1.5" rx=".75" fill="rgba(184,234,255,.35)"/>'
  + '<rect x="7" y="19" width="18" height="1.5" rx=".75" fill="rgba(184,234,255,.25)"/>'
  + '<rect x="7" y="24" width="20" height="1.5" rx=".75" fill="rgba(184,234,255,.25)"/>'
  + '<rect x="7" y="29" width="14" height="1.5" rx=".75" fill="rgba(184,234,255,.18)"/>'
  + '<polyline points="7,37 9,39.5 13,35" fill="none" stroke="rgba(126,184,164,.7)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>'
  + '<rect x="16" y="36" width="12" height="1.5" rx=".75" fill="rgba(126,184,164,.4)"/>';

var OMNIA_CLIPBOARD_SVG_REFLECT = '<rect x="2" y="5" width="34" height="41" rx="3" fill="#1a1f2e" stroke="rgba(184,234,255,.18)" stroke-width="1"/>'
  + '<rect x="12" y="1" width="14" height="8" rx="3" fill="#243040" stroke="rgba(184,234,255,.22)" stroke-width="1"/>'
  + '<rect x="15" y="3" width="8" height="4" rx="2" fill="#0e1420"/>'
  + '<rect x="7" y="14" width="22" height="1.5" rx=".75" fill="rgba(184,234,255,.2)"/>'
  + '<rect x="7" y="19" width="18" height="1.5" rx=".75" fill="rgba(184,234,255,.15)"/>'
  + '<rect x="7" y="24" width="20" height="1.5" rx=".75" fill="rgba(184,234,255,.12)"/>'
  + '<rect x="7" y="29" width="14" height="1.5" rx=".75" fill="rgba(184,234,255,.1)"/>'
  + '<text x="17" y="43" font-size="10" fill="rgba(184,234,255,.3)" font-family="monospace" text-anchor="middle">?</text>';

function buildRptOmniaStage(loading, small) {
  var crystalClass = 'rpt-omnia-crystal' + (loading ? ' rpt-omnia-crystal--loading' : '') + (small ? ' rpt-omnia-crystal--sm' : '');
  var clipInner = loading ? OMNIA_CLIPBOARD_SVG_REFLECT : OMNIA_CLIPBOARD_SVG_CONTENT;
  var clipClass = 'rpt-omnia-clipboard' + (loading ? '' : ' rpt-omnia-clipboard--still') + (small ? ' rpt-omnia-clipboard--sm' : '');
  var stageClass = 'rpt-omnia-stage' + (small ? ' rpt-omnia-stage--sm' : '');
  return '<div class="' + stageClass + '">'
    + OMNIA_CRYSTAL_SVG_RPT.replace('class="rpt-omnia-crystal"','class="'+crystalClass+'"')
    + '<svg class="'+clipClass+'" viewBox="0 0 38 48" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">'+clipInner+'</svg>'
    + '</div>';
}

function updateReportTabStyles() {
  document.querySelectorAll('.rpt-period-menu__item').forEach(function(t) {
    t.classList.toggle('active', t.dataset.period === currentReportPeriod);
  });
}

function showReports() {
  currentReportPeriod = 'daily';
  reportOffset = 0;
  updateReportTabStyles();
  showScreen('reportsScreen');
  renderReport('daily');
}

// ── Data helpers ──────────────────────────────────────────

function getDateRange(period, offset) {
  offset = offset || 0;
  var now = new Date();
  var start, end, prevStart, prevEnd;
  if (period === 'daily') {
    var d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    d.setDate(d.getDate() + offset);
    start = d;
    end = offset === 0 ? now : new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);
    prevStart = new Date(d); prevStart.setDate(prevStart.getDate() - 1);
    prevEnd = d;
  } else if (period === 'weekly') {
    var day = now.getDay();
    var sun = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day);
    start = new Date(sun); start.setDate(start.getDate() + offset * 7);
    end = offset === 0 ? now : new Date(start.getFullYear(), start.getMonth(), start.getDate() + 7);
    prevStart = new Date(start); prevStart.setDate(prevStart.getDate() - 7);
    prevEnd = new Date(start);
  } else if (period === 'monthly') {
    var anchor = new Date(now.getFullYear(), now.getMonth() + offset, 1);
    start = anchor;
    end = offset === 0 ? now : new Date(anchor.getFullYear(), anchor.getMonth() + 1, 1);
    prevStart = new Date(anchor.getFullYear(), anchor.getMonth() - 1, 1);
    prevEnd = new Date(anchor);
  } else {
    start = new Date(now.getFullYear(), 0, 1);
    end = now;
    prevStart = new Date(now.getFullYear() - 1, 0, 1);
    prevEnd = new Date(now.getFullYear(), 0, 1);
  }
  return { start: start, prevStart: prevStart, prevEnd: prevEnd, now: end };
}

function reportNavLabel(period, offset) {
  var now = new Date();
  if (period === 'daily') {
    var d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    d.setDate(d.getDate() + offset);
    if (offset === 0) return 'Today';
    if (offset === -1) return 'Yesterday';
    return d.toLocaleDateString('en-US', {weekday:'short', month:'short', day:'numeric'});
  }
  if (period === 'weekly') {
    if (offset === 0) return 'This Week';
    if (offset === -1) return 'Last Week';
    var day = now.getDay();
    var sun = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day + offset * 7);
    var sat = new Date(sun); sat.setDate(sat.getDate() + 6);
    return sun.toLocaleDateString('en-US',{month:'short',day:'numeric'}) + ' – ' + sat.toLocaleDateString('en-US',{month:'short',day:'numeric'});
  }
  if (period === 'monthly') {
    if (offset === 0) return 'This Month';
    if (offset === -1) return 'Last Month';
    var anchor = new Date(now.getFullYear(), now.getMonth() + offset, 1);
    return anchor.toLocaleDateString('en-US', {month:'long', year:'numeric'});
  }
  return 'All Time';
}

function filterHistory(history, from, to) {
  return history.filter(function(h) {
    var d = new Date(h.date);
    return d >= from && (!to || d < to);
  });
}

function sumMinutes(sessions) {
  return sessions.reduce(function(a, h) { return a + (h.durationMin || 0); }, 0);
}

function avgScore(sessions) {
  var scored = sessions.filter(function(h) { return h.score; });
  if (!scored.length) return null;
  return (scored.reduce(function(a, h) { return a + parseFloat(h.score); }, 0) / scored.length).toFixed(1);
}

// ── SVG Chart renderers ────────────────────────────────────

var _barChartUid = 0;
function renderBarChart(data, labels, color, height) {
  color = color || '#7eb8a4';
  height = height || 60;
  if (!data.length) return '<div style="text-align:center;color:var(--muted);font-size:11px;padding:20px 0;">No data yet</div>';
  var max = Math.max.apply(null, data) || 1;
  // Fixed-width viewBox (no preserveAspectRatio:none) so label text isn't stretched
  var uid = ++_barChartUid;
  var vbW = 300, vbH = height + 18;
  var n = data.length;
  var slot = vbW / n;
  var bw = Math.min(16, slot * 0.5);
  var maxIdx = data.indexOf(max);
  var parts = [];
  var peak = '#e8cd8e';
  parts.push('<defs><linearGradient id="rptBar' + uid + '" x1="0" y1="0" x2="0" y2="1">'
    + '<stop offset="0%" stop-color="' + color + '"/>'
    + '<stop offset="100%" stop-color="' + color + '" stop-opacity=".22"/>'
    + '</linearGradient>'
    + '<linearGradient id="rptBarPk' + uid + '" x1="0" y1="0" x2="0" y2="1">'
    + '<stop offset="0%" stop-color="' + peak + '"/>'
    + '<stop offset="100%" stop-color="' + peak + '" stop-opacity=".3"/>'
    + '</linearGradient></defs>');
  parts.push('<line x1="0" y1="' + height + '" x2="' + vbW + '" y2="' + height + '" stroke="rgba(221,216,206,.14)" stroke-width="1"/>');
  data.forEach(function(v, i) {
    var cx = i * slot + slot / 2;
    if (v <= 0) {
      // Empty slot: a faint dot on the baseline instead of a stub bar
      parts.push('<circle cx="' + cx.toFixed(1) + '" cy="' + height + '" r="1.4" fill="rgba(221,216,206,.18)"/>');
      return;
    }
    var h = Math.max(3, (v / max) * (height - 16));
    var y = height - h;
    var isMax = i === maxIdx;
    if (isMax) {
      // Soft glow pooled under the best bar
      parts.push('<ellipse cx="' + cx.toFixed(1) + '" cy="' + height + '" rx="' + (bw * 1.6).toFixed(1) + '" ry="4.5" fill="' + peak + '" opacity=".22"/>');
    }
    parts.push('<rect x="' + (cx - bw / 2).toFixed(1) + '" y="' + y.toFixed(1) + '" width="' + bw.toFixed(1) + '" height="' + h.toFixed(1) + '" rx="' + Math.min(4, bw / 2).toFixed(1) + '" fill="url(#rptBar' + (isMax ? 'Pk' : '') + uid + ')"' + (isMax ? '' : ' opacity=".62"') + '/>');
    if (isMax) {
      parts.push('<text x="' + cx.toFixed(1) + '" y="' + (y - 5).toFixed(1) + '" text-anchor="middle" fill="' + peak + '" font-size="8.5" font-family="DM Mono,monospace">' + fmtDuration(Math.round(v)) + '</text>');
    }
  });
  var every = n > 9 ? 2 : 1;
  labels.forEach(function(l, i) {
    if (i % every !== 0) return;
    var cx = i * slot + slot / 2;
    parts.push('<text x="' + cx.toFixed(1) + '" y="' + (height + 13) + '" text-anchor="middle" fill="rgba(221,216,206,.4)" font-size="7.5" font-family="DM Mono,monospace">' + l + '</text>');
  });
  return '<svg width="100%" height="' + vbH + '" viewBox="0 0 ' + vbW + ' ' + vbH + '" xmlns="http://www.w3.org/2000/svg">' + parts.join('') + '</svg>';
}

// Grouped bars per time-bucket: a green Awareness column beside a gold
// Concentration column. Both series are minutes.
function renderDualBarChart(aw, conc, labels, height) {
  height = height || 56;
  var n = Math.max(aw.length, conc.length, labels.length);
  if (!n) return '<div style="text-align:center;color:var(--muted);font-size:11px;padding:20px 0;">No data yet</div>';
  var green = '#7eb8a4', gold = '#e8cd8e';
  var uid = ++_barChartUid;
  var vbW = 300, vbH = height + 18;
  var slot = vbW / n;
  var bw = Math.max(2.5, Math.min(8, slot * 0.28));
  var gap = Math.max(1.5, bw * 0.3);
  var groupW = bw * 2 + gap;
  var max = 1;
  for (var k = 0; k < n; k++) { max = Math.max(max, aw[k] || 0, conc[k] || 0); }
  var parts = [];
  parts.push('<defs>'
    + '<linearGradient id="dbG' + uid + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="' + green + '"/><stop offset="100%" stop-color="' + green + '" stop-opacity=".25"/></linearGradient>'
    + '<linearGradient id="dbA' + uid + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="' + gold + '"/><stop offset="100%" stop-color="' + gold + '" stop-opacity=".25"/></linearGradient>'
    + '</defs>');
  parts.push('<line x1="0" y1="' + height + '" x2="' + vbW + '" y2="' + height + '" stroke="rgba(221,216,206,.14)" stroke-width="1"/>');
  for (var j = 0; j < n; j++) {
    var cx = j * slot + slot / 2;
    var av = aw[j] || 0, cv = conc[j] || 0;
    var leftX = cx - groupW / 2;
    var goldX = leftX + bw + gap;
    if (av <= 0 && cv <= 0) {
      parts.push('<circle cx="' + cx.toFixed(1) + '" cy="' + height + '" r="1.4" fill="rgba(221,216,206,.18)"/>');
      continue;
    }
    if (av > 0) {
      var ah = Math.max(3, (av / max) * (height - 10));
      parts.push('<rect x="' + leftX.toFixed(1) + '" y="' + (height - ah).toFixed(1) + '" width="' + bw.toFixed(1) + '" height="' + ah.toFixed(1) + '" rx="' + Math.min(3, bw / 2).toFixed(1) + '" fill="url(#dbG' + uid + ')"/>');
    }
    if (cv > 0) {
      var ch = Math.max(3, (cv / max) * (height - 10));
      parts.push('<rect x="' + goldX.toFixed(1) + '" y="' + (height - ch).toFixed(1) + '" width="' + bw.toFixed(1) + '" height="' + ch.toFixed(1) + '" rx="' + Math.min(3, bw / 2).toFixed(1) + '" fill="url(#dbA' + uid + ')"/>');
    }
  }
  var every = n > 9 ? 2 : 1;
  labels.forEach(function(l, i) {
    if (i % every !== 0) return;
    var cx = i * slot + slot / 2;
    parts.push('<text x="' + cx.toFixed(1) + '" y="' + (height + 13) + '" text-anchor="middle" fill="rgba(221,216,206,.4)" font-size="7.5" font-family="DM Mono,monospace">' + l + '</text>');
  });
  return '<svg width="100%" height="' + vbH + '" viewBox="0 0 ' + vbW + ' ' + vbH + '" xmlns="http://www.w3.org/2000/svg">' + parts.join('') + '</svg>';
}

function renderClockProgressChart(sessions) {
  if (!sessions.length) return '<div style="text-align:center;color:var(--muted);font-size:11px;padding:20px 0;">No clock sessions yet.</div>';
  if (sessions.length < 2) return '<div style="text-align:center;color:var(--muted);font-size:11px;padding:20px 0;">Complete more sessions to see your trend.</div>';
  var height = 80;
  var maxVal = Math.max(120, Math.max.apply(null, sessions.map(function(s) { return s.seconds; })));
  var goalY = height - Math.round((600 / maxVal) * (height - 8));
  var showGoalLine = maxVal >= 120;
  var n = sessions.length;
  var step = 100 / (n - 1);
  var points = sessions.map(function(s, i) {
    return (i * step).toFixed(1) + ',' + (height - Math.round((s.seconds / maxVal) * (height - 8))).toFixed(1);
  }).join(' ');
  var dots = sessions.map(function(s, i) {
    var cx = (i * step).toFixed(1);
    var cy = (height - Math.round((s.seconds / maxVal) * (height - 8))).toFixed(1);
    var isBest = s.seconds === Math.max.apply(null, sessions.map(function(x) { return x.seconds; }));
    return '<circle cx="' + cx + '" cy="' + cy + '" r="' + (isBest ? 3.5 : 2.5) + '" fill="' + (isBest ? '#e8b88a' : '#d4956e') + '" opacity="' + (isBest ? 1 : 0.75) + '"/>';
  }).join('');
  var firstDate = new Date(sessions[0].date).toLocaleDateString('en-US', { month:'short', day:'numeric' });
  var lastDate = new Date(sessions[sessions.length - 1].date).toLocaleDateString('en-US', { month:'short', day:'numeric' });
  var vbW = 200;
  var stepPx = vbW / (n - 1);
  var pointsPx = sessions.map(function(s, i) {
    return (i * stepPx).toFixed(1) + ',' + (height - Math.round((s.seconds / maxVal) * (height - 8))).toFixed(1);
  }).join(' ');
  var dotsPx = sessions.map(function(s, i) {
    var cx = (i * stepPx).toFixed(1);
    var cy = (height - Math.round((s.seconds / maxVal) * (height - 8))).toFixed(1);
    var isBest = s.seconds === Math.max.apply(null, sessions.map(function(x) { return x.seconds; }));
    return '<circle cx="' + cx + '" cy="' + cy + '" r="' + (isBest ? 3.5 : 2.5) + '" fill="' + (isBest ? '#e8b88a' : '#d4956e') + '" opacity="' + (isBest ? 1 : 0.75) + '"/>';
  }).join('');
  var goalLinePx = showGoalLine && goalY > 0 && goalY < height
    ? '<line x1="0" y1="' + goalY + '" x2="' + vbW + '" y2="' + goalY + '" stroke="#7eb8a4" stroke-width="0.8" stroke-dasharray="3,3" opacity="0.45"/>'
      + '<text x="' + (vbW - 2) + '" y="' + (goalY - 2) + '" text-anchor="end" fill="rgba(126,184,164,.55)" font-size="7" font-family="DM Mono,monospace">10 min</text>'
    : '';
  return '<svg width="100%" height="' + (height + 20) + '" viewBox="0 0 ' + vbW + ' ' + (height + 20) + '" xmlns="http://www.w3.org/2000/svg">'
    + goalLinePx
    + '<polyline points="' + pointsPx + '" fill="none" stroke="#d4956e" stroke-width="1.5" stroke-linejoin="round" opacity="0.8"/>'
    + dotsPx
    + '<text x="0" y="' + (height + 15) + '" text-anchor="start" fill="rgba(221,216,206,.35)" font-size="7" font-family="DM Mono,monospace">' + firstDate + '</text>'
    + '<text x="' + vbW + '" y="' + (height + 15) + '" text-anchor="end" fill="rgba(221,216,206,.35)" font-size="7" font-family="DM Mono,monospace">' + lastDate + '</text>'
    + '</svg>';
}

function renderLineChart(data, color, height) {
  color = color || 'var(--accent)';
  height = height || 60;
  if (data.length < 2) return '<div style="text-align:center;color:var(--muted);font-size:11px;padding:20px 0;">Not enough data</div>';
  var max = Math.max.apply(null, data) || 1;
  var step = 100 / (data.length - 1);
  var points = data.map(function(v, i) {
    return (i * step).toFixed(1) + ',' + (height - Math.round((v / max) * (height - 4))).toFixed(1);
  }).join(' ');
  var dots = data.map(function(v, i) {
    var cx = (i * step).toFixed(1);
    var cy = (height - Math.round((v / max) * (height - 4))).toFixed(1);
    return '<circle cx="' + cx + '%" cy="' + cy + '" r="2.5" fill="' + color + '"/>';
  }).join('');
  return '<svg width="100%" height="' + height + '" viewBox="0 0 100 ' + height + '" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">'
    + '<polyline points="' + points + '" fill="none" stroke="' + color + '" stroke-width="1.5" stroke-linejoin="round" vector-effect="non-scaling-stroke" opacity="0.85"/>'
    + dots + '</svg>';
}

// ── Delta helper ──────────────────────────────────────────

function delta(curr, prev, suffix) {
  suffix = suffix || '';
  if (prev === 0 && curr === 0) return '<span class="delta-same">— no change</span>';
  if (prev === 0) return '<span class="delta-up">↑ new</span>';
  var pct = Math.round(((curr - prev) / prev) * 100);
  if (pct > 0) return '<span class="delta-up">↑ ' + pct + '% vs prior</span>';
  if (pct < 0) return '<span class="delta-down">↓ ' + Math.abs(pct) + '% vs prior</span>';
  return '<span class="delta-same">= same as prior</span>';
}

// ── Motivational messages ─────────────────────────────────

var MOTIVATIONAL = [
  "Every session is a revolution — the same point, but deeper.",
  "Consistency is the only practice. You are here.",
  "The gap between thoughts is where you actually live.",
  "Each return to presence is as valuable as never having left.",
  "The practice does not end when the session does.",
  "You are building something that cannot be taken away.",
  "There is no destination. There is only this, and this, and this.",
  "The mind that notices it wandered is already home.",
];

function getMotivationalMessage(sessions, streak) {
  if (sessions === 0) return "Today is a new beginning. Begin.";
  if (streak > 6) return "Seven days or more of unbroken practice. This is rare. Keep it.";
  if (sessions >= 3) return "Three sessions in a single day. The practice is becoming life.";
  return MOTIVATIONAL[Math.floor(Math.random() * MOTIVATIONAL.length)];
}

var pendingProgressReportComments = {};

function reportDayStart(value) {
  var d = value ? new Date(value) : new Date();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function reportAddDays(date, days) {
  var d = new Date(date);
  d.setDate(d.getDate() + days);
  return reportDayStart(d);
}

function reportDateKey(date) {
  var d = reportDayStart(date);
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

function reportRangeLabel(start, endExclusive) {
  var end = reportAddDays(endExclusive, -1);
  var opts = { month: 'short', day: 'numeric' };
  if (reportDateKey(start) === reportDateKey(end)) return start.toLocaleDateString('en-US', opts);
  return start.toLocaleDateString('en-US', opts) + ' - ' + end.toLocaleDateString('en-US', opts);
}

function loadProgressReportComments() {
  try {
    var c = JSON.parse(localStorage.getItem('presence_ai_report_comments_v1') || '{}');
    // Drop any truncated entries so they re-fetch
    var dirty = false;
    Object.keys(c).forEach(function(k) { if (c[k].message && c[k].message.length < 150) { delete c[k]; dirty = true; } });
    if (dirty) try { localStorage.setItem('presence_ai_report_comments_v1', JSON.stringify(c)); } catch(e) {}
    return c;
  } catch(e) { return {}; }
}

function saveProgressReportComment(key, message) {
  var comments = loadProgressReportComments();
  // Purge any previously-truncated entries (< 150 chars = hit token limit)
  Object.keys(comments).forEach(function(k) {
    if (comments[k].message && comments[k].message.length < 150) delete comments[k];
  });
  comments[key] = { message: message, savedAt: new Date().toISOString() };
  try { localStorage.setItem('presence_ai_report_comments_v1', JSON.stringify(comments)); } catch(e) {}
}

function reportPracticeSessionsInRange(start, end) {
  var aw = filterHistory(state.history || [], start, end);
  var conc = filterHistory(concState.history || [], start, end);
  var prayers = (prayerState && prayerState.history ? prayerState.history : []).filter(function(h) {
    var d = new Date(h.date);
    return d >= start && d < end;
  });
  return { aw: aw, conc: conc, prayers: prayers };
}

function hasPracticeInRange(start, end) {
  var p = reportPracticeSessionsInRange(start, end);
  return !!(p.aw.length || p.conc.length || p.prayers.length);
}

function getFirstPracticeDate() {
  var dates = [];
  (state.history || []).forEach(function(h) { if (h.date) dates.push(reportDayStart(h.date)); });
  (concState.history || []).forEach(function(h) { if (h.date) dates.push(reportDayStart(h.date)); });
  if (prayerState && prayerState.history) {
    prayerState.history.forEach(function(h) { if (h.date) dates.push(reportDayStart(h.date)); });
  }
  if (!dates.length) return null;
  return dates.reduce(function(a, b) { return a < b ? a : b; });
}

function buildCompletedReportSummary(type, start, end, key, title) {
  var prevStart = reportAddDays(start, -Math.round((end - start) / 86400000));
  var prevEnd = start;
  var current = reportPracticeSessionsInRange(start, end);
  var previous = reportPracticeSessionsInRange(prevStart, prevEnd);
  var awarenessMinutes = sumMinutes(current.aw);
  var previousAwarenessMinutes = sumMinutes(previous.aw);
  var concentrationSeconds = current.conc.reduce(function(a, h) { return a + (h.seconds || 0); }, 0);
  var previousConcentrationSeconds = previous.conc.reduce(function(a, h) { return a + (h.seconds || 0); }, 0);
  return {
    key: key,
    title: title,
    period: type,
    range: reportRangeLabel(start, end),
    startDate: reportDateKey(start),
    endDate: reportDateKey(reportAddDays(end, -1)),
    awarenessSessions: current.aw.length,
    awarenessMinutes: awarenessMinutes,
    previousAwarenessMinutes: previousAwarenessMinutes,
    averageAwarenessScore: avgScore(current.aw),
    concentrationSessions: current.conc.length,
    concentrationSeconds: concentrationSeconds,
    previousConcentrationSeconds: previousConcentrationSeconds,
    prayerSessions: current.prayers.length,
    prayerMinutes: Math.round(current.prayers.reduce(function(a, h) { return a + ((h.durationSec || 0) / 60); }, 0)),
    streak: state.streak,
    awarenessLevel: state.level,
    concentrationLevel: concState.level
  };
}

function buildDueProgressReportSummaries() {
  var today = reportDayStart(new Date());
  var due = [];
  var yesterday = reportAddDays(today, -1);
  var tomorrowOfYesterday = today;
  if (hasPracticeInRange(yesterday, tomorrowOfYesterday)) {
    due.push(buildCompletedReportSummary(
      'daily',
      yesterday,
      tomorrowOfYesterday,
      'daily:' + reportDateKey(yesterday),
      'Day complete'
    ));
  }

  var first = getFirstPracticeDate();
  if (!first) return due;
  [
    { type: 'weekly', days: 7, label: 'Week' },
    { type: 'monthly', days: 30, label: 'Month' },
    { type: 'yearly', days: 365, label: 'Year' }
  ].forEach(function(cadence) {
    var elapsedDays = Math.floor((today - first) / 86400000);
    var completed = Math.floor(elapsedDays / cadence.days);
    if (completed <= 0) return;
    var index = completed - 1;
    var start = reportAddDays(first, index * cadence.days);
    var end = reportAddDays(start, cadence.days);
    if (end > today || !hasPracticeInRange(start, end)) return;
    due.push(buildCompletedReportSummary(
      cadence.type,
      start,
      end,
      cadence.type + ':' + reportDateKey(start) + ':' + reportDateKey(reportAddDays(end, -1)),
      cadence.label + ' ' + (index + 1) + ' complete'
    ));
  });
  return due;
}

function getReportFallbackMessage(summary) {
  var totalSessions = (summary.awarenessSessions || 0) + (summary.concentrationSessions || 0);
  if (!totalSessions) return 'No sessions in this window yet. Begin small, and let the first return count.';
  if ((summary.streak || 0) >= 7) return 'Your streak is carrying real momentum. Protect the daily return more than any single number.';
  if ((summary.awarenessMinutes || 0) > 0 && (summary.concentrationSeconds || 0) > 0) return 'Good balance: awareness and concentration are both being trained. Keep the next session simple and exact.';
  if ((summary.awarenessMinutes || 0) > 0) return 'Awareness is the thread this period. The next useful step is another clean return to the present.';
  return 'Concentration is leading this period. Stay patient with the repetitions; they are doing their quiet work.';
}

function requestProgressReportComment(summary, targetId) {
  var saved = loadProgressReportComments()[summary.key];
  if (saved && saved.message) return;
  if (pendingProgressReportComments[summary.key]) return;
  pendingProgressReportComments[summary.key] = true;
  requestPresenceAI('progress_report', summary).then(function(message) {
    if (!message) return;
    saveProgressReportComment(summary.key, message);
    if (syncEnabled && authToken) syncPushData();
    var el = document.getElementById(targetId);
    if (el) el.textContent = message;
  }).catch(function() {}).finally(function() {
    delete pendingProgressReportComments[summary.key];
  });
}

function renderDueProgressReportComments(summaries) {
  if (!summaries.length) return '';
  var saved = loadProgressReportComments();
  var html = '<div class="report-section">';
  html += '<div class="report-section-title">Omnia Reports</div>';
  summaries.forEach(function(summary, i) {
    var id = 'aiReportCommentText' + i;
    var message = saved[summary.key] && saved[summary.key].message
      ? saved[summary.key].message
      : getReportFallbackMessage(summary);
    html += '<div class="report-motivational" style="margin-bottom:10px;">'
      + '<div style="font-size:9px;letter-spacing:.2em;text-transform:uppercase;color:var(--muted);margin-bottom:8px;">'
      + escHtml(summary.title) + ' · ' + escHtml(summary.range)
      + '</div>'
      + '<div class="report-motivational-text" id="' + id + '">"' + escHtml(message) + '"</div>'
      + '</div>';
  });
  html += '</div>';
  return html;
}

// ── Report renderers ──────────────────────────────────────

function updateReportNav() {
  var lbl = document.getElementById('reportNavLabel');
  var prev = document.getElementById('reportNavPrev');
  var next = document.getElementById('reportNavNext');
  var isYearly = currentReportPeriod === 'yearly';
  if (lbl) lbl.textContent = reportNavLabel(currentReportPeriod, reportOffset);
  var atStart = !isYearly && getDateRange(currentReportPeriod, reportOffset - 1).now.getTime() <= getFirstUseDate();
  if (prev) { prev.style.opacity = (isYearly || atStart) ? '.15' : '.7'; prev.style.pointerEvents = (isYearly || atStart) ? 'none' : ''; prev.style.visibility = ''; }
  if (next) { next.style.opacity = (isYearly || reportOffset >= 0) ? '.15' : '1'; next.style.pointerEvents = (isYearly || reportOffset >= 0) ? 'none' : ''; }
}

function deltaMini(curr, prev) {
  if (!prev && !curr) return '';
  if (!prev) return '<span class="delta-up">↑ new</span>';
  var pct = Math.round(((curr - prev) / prev) * 100);
  if (pct > 0) return '<span class="delta-up">↑' + pct + '%</span>';
  if (pct < 0) return '<span class="delta-down">↓' + Math.abs(pct) + '%</span>';
  return '<span class="delta-same">—</span>';
}

function rptStripCell(val, lbl, deltaHtml) {
  return '<div class="rpt-strip__cell"><div class="rpt-strip__val">' + val + '</div><div class="rpt-strip__lbl">' + lbl + '</div>'
    + (deltaHtml ? '<div class="rpt-strip__delta">' + deltaHtml + '</div>' : '') + '</div>';
}

function rptAccRow(dot, name, summary, body, icon) {
  return '<div class="rpt-acc-row rpt-acc-row--' + dot + '">'
    + '<div class="rpt-acc-head" onclick="rptToggleAcc(this)">'
    + '<span class="rpt-acc-dot rpt-acc-dot--' + dot + '">' + (icon || '') + '</span>'
    + '<span class="rpt-acc-name">' + name + '</span>'
    + '<span class="rpt-acc-sum">' + summary + '</span>'
    + '<span class="rpt-acc-chev">›</span>'
    + '</div>'
    + '<div class="rpt-acc-body"><div class="rpt-acc-inner">' + body + '</div></div>'
    + '</div>';
}

function rptToggleAcc(head) {
  head.parentElement.classList.toggle('open');
}

// Derive readable "best pattern" insights from the period's sessions.
function buildSignals(awNow, concNow, period) {
  var signals = [];
  var all = awNow.concat(concNow);
  if (!all.length) return signals;
  function sMin(h) { return h.durationMin != null ? h.durationMin : (h.seconds ? h.seconds / 60 : 0); }
  function bucketOf(hr) {
    if (hr >= 5 && hr < 11) return 'Morning';
    if (hr >= 11 && hr < 17) return 'Midday';
    if (hr >= 17 && hr < 22) return 'Evening';
    return 'Late-night';
  }

  // Best Rhythm — time of day with the most sessions
  if (all.length >= 3) {
    var byBucket = {};
    all.forEach(function(h) { var d = new Date(h.date); if (isNaN(d)) return; var b = bucketOf(d.getHours()); byBucket[b] = (byBucket[b] || 0) + 1; });
    var bk = Object.keys(byBucket).sort(function(a, b) { return byBucket[b] - byBucket[a]; });
    if (bk.length && byBucket[bk[0]] >= 2) {
      signals.push({ label: 'Best Rhythm', text: bk[0] + ' sessions were most consistent.', val: byBucket[bk[0]] + '×' });
    }
  }

  // Deepest Day — weekday holding the most practice (multi-day periods only)
  if (period !== 'daily') {
    var dayNames = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
    var byDay = {};
    all.forEach(function(h) { var d = new Date(h.date); if (isNaN(d)) return; byDay[d.getDay()] = (byDay[d.getDay()] || 0) + sMin(h); });
    var dk = Object.keys(byDay).sort(function(a, b) { return byDay[b] - byDay[a]; });
    if (dk.length && byDay[dk[0]] >= 1) {
      signals.push({ label: 'Deepest Day', text: dayNames[dk[0]] + ' held the deepest practice.', val: fmtDuration(Math.round(byDay[dk[0]])) });
    }
  }

  // Sharpest Focus — longest concentration hold (Clock / Thought / Visualization)
  var sharpHold = concNow.filter(isHoldSession);
  if (sharpHold.length) {
    var bestHold = Math.max.apply(null, sharpHold.map(function(h) { return h.seconds || 0; }));
    if (bestHold > 0) signals.push({ label: 'Sharpest Focus', text: 'Your longest unbroken hold.', val: fmtTimer(bestHold) });
  }

  // Clearest Reflection — highest awareness score
  var scored = awNow.filter(function(h) { return h.score; });
  if (scored.length) {
    var bestScore = Math.max.apply(null, scored.map(function(h) { return parseFloat(h.score); }));
    if (bestScore > 0) signals.push({ label: 'Clearest Reflection', text: 'Highest awareness score recorded.', val: bestScore + '/5' });
  }

  // Cadence — distinct days practiced
  if (period !== 'daily') {
    var daysSet = {};
    all.forEach(function(h) { var d = new Date(h.date); if (isNaN(d)) return; daysSet[d.getFullYear() + '-' + d.getMonth() + '-' + d.getDate()] = 1; });
    var nDays = Object.keys(daysSet).length;
    if (nDays >= 2) signals.push({ label: 'Cadence', text: 'You showed up on ' + nDays + ' separate days.', val: nDays + 'd' });
  }

  return signals;
}

function buildOmniaReportCardHtml(period) {
  if (period !== 'daily' && period !== 'weekly' && period !== 'monthly') return '';
  // Nothing to reflect on before the user's first-ever logged session — don't
  // render a card or spend an API call on periods that predate that.
  if (reportOffset < 0) {
    var _range = getDateRange(period, reportOffset);
    if (_range.now.getTime() <= getFirstUseDate()) return '';
  }
  var html = '';
  // Past periods are always eligible; current period depends on the day
  var isEligible = reportOffset < 0 ? true : isOmniaReportDay(period);
  var periodLabel = reportNavLabel(period, reportOffset).toLowerCase();
  var stageHtml = buildRptOmniaStage(!isEligible); // loading bounce if not eligible yet
  if (!isEligible) {
    var _now = new Date();
    var _evalMsg, _availMsg;
    if (period === 'daily') {
      _evalMsg = 'Omnia will reflect on your practice when the day is complete.';
      _availMsg = 'available tomorrow';
    } else if (period === 'weekly') {
      _evalMsg = 'Omnia is evaluating. Come back Sunday for a custom analysis of this week.';
      _availMsg = 'available Sunday';
    } else {
      var _lastDay = new Date(_now.getFullYear(), _now.getMonth() + 1, 0);
      var _mNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      var _lastStr = _mNames[_lastDay.getMonth()] + ' ' + _lastDay.getDate();
      _evalMsg = 'Omnia is evaluating. Come back ' + _lastStr + ' for a custom analysis of this month.';
      _availMsg = 'available ' + _lastStr;
    }
    html += '<div class="rpt-omnia-card">'
      + '<div class="rpt-omnia-card__inner">'
      + stageHtml
      + '<div class="rpt-omnia-text" style="color:#a9cde6;">' + _evalMsg + '</div>'
      + '<div class="rpt-omnia-meta" style="color:var(--accent);opacity:.85;">' + _availMsg + '</div>'
      + '</div></div>';
  } else {
    // Check cache — use offset-aware key so each day/week/month has its own entry
    var cacheKey = omniaReportCacheKey(period, reportOffset);
    var cachedEntry = null;
    try { cachedEntry = JSON.parse(localStorage.getItem(cacheKey) || 'null'); } catch(e) {}
    // Past periods are immutable: any cached commentary is permanently fresh.
    var _isPastReport = reportOffset < 0;
    var isFresh = cachedEntry && cachedEntry.commentary &&
      (_isPastReport || (cachedEntry.ts && (Date.now() - cachedEntry.ts) < omniaReportTTL(period)));

    html += '<div class="rpt-omnia-card" id="omniaReportCard">'
      + '<div class="rpt-omnia-card__inner rpt-omnia-card__inner--row">';
    if (isFresh) {
      html += buildRptOmniaStage(false, true)
        + '<div class="rpt-omnia-bubble">'
        + '<div class="rpt-omnia-bubble-text">' + escHtml(cachedEntry.commentary) + '</div>'
        + '<div class="rpt-omnia-bubble-meta">Omnia · ' + periodLabel + '</div>'
        + '</div>';
    } else {
      html += buildRptOmniaStage(true, true)
        + '<div class="rpt-omnia-bubble">'
        + '<div class="rpt-omnia-bubble-text rpt-omnia-bubble-text--dim" id="omniaReportText">Omnia is reflecting…</div>'
        + '</div>';
      var _capturedOffset = reportOffset;
      setTimeout(function() { loadOmniaReportInto(period, _capturedOffset); }, 0);
    }
    html += '</div></div>';
  }
  return html;
}

function renderReport(period) {
  var range = getDateRange(period, reportOffset);
  updateReportNav();
  // Banner sub-line: lifetime totals across both practices
  var bannerSub = document.getElementById('reportsBannerSub');
  if (bannerSub) {
    var lifeSessions = state.history.length + (concState.history || []).length;
    var lifeMin = sumMinutes(state.history) + Math.round((concState.history || []).reduce(function(a, h) { return a + (h.seconds || 0); }, 0) / 60);
    bannerSub.textContent = lifeSessions > 0
      ? lifeSessions + ' sessions · ' + fmtDuration(lifeMin) + ' all time'
      : 'Your practice, in numbers';
  }
  var awarenessNow = filterHistory(state.history, range.start, range.now);
  var awarenessPrev = filterHistory(state.history, range.prevStart, range.prevEnd);
  var concNow = filterHistory(concState.history, range.start, range.now);
  var concPrev = filterHistory(concState.history, range.prevStart, range.prevEnd);
  var html = '';

  // ── Omnia commentary — kept above all data ──
  html += buildOmniaReportCardHtml(period);

  var totalSessions = awarenessNow.length + concNow.length;
  var concSecNow = concNow.reduce(function(a, h) { return a + (h.seconds || 0); }, 0);
  var concSecPrev = concPrev.reduce(function(a, h) { return a + (h.seconds || 0); }, 0);
  var totalMinNow = sumMinutes(awarenessNow) + Math.round(concSecNow / 60);
  var totalMinPrev = sumMinutes(awarenessPrev) + Math.round(concSecPrev / 60);

  // 7-day activity strip — only on current periods (it's anchored to today)
  var weekHtml = '';
  if (reportOffset === 0) {
    var dayLetters = ['S','M','T','W','T','F','S'];
    var todayD = new Date(); todayD.setHours(0, 0, 0, 0);
    var activeDays = {};
    state.history.concat(concState.history || []).forEach(function(h) {
      var hd = new Date(h.date); if (isNaN(hd)) return;
      hd.setHours(0, 0, 0, 0);
      activeDays[hd.getTime()] = 1;
    });
    weekHtml = '<div class="rpt-week">';
    for (var wi = 6; wi >= 0; wi--) {
      var wd = new Date(todayD); wd.setDate(wd.getDate() - wi);
      var lit = !!activeDays[wd.getTime()];
      weekHtml += '<div class="rpt-week-day' + (lit ? ' lit' : '') + (wi === 0 ? ' today' : '') + '">'
        + '<span class="rpt-week-day__l">' + dayLetters[wd.getDay()] + '</span>'
        + '<span class="rpt-week-day__d">' + (lit ? '✓' : '') + '</span></div>';
    }
    weekHtml += '</div>';
  }

  if (totalSessions === 0) {
    html += '<div class="rpt-empty">No practice recorded in this period.<br>Your overall rank is below.</div>';
    html += weekHtml;
  } else {
    // ── Hero: the whole summary is three numbers ──
    var holdNow = concNow.filter(isHoldSession);
    var holdPrev = concPrev.filter(isHoldSession);
    var bestHoldNow = holdNow.length ? Math.max.apply(null, holdNow.map(function(h) { return h.seconds || 0; })) : 0;
    var bestHoldPrev = holdPrev.length ? Math.max.apply(null, holdPrev.map(function(h) { return h.seconds || 0; })) : 0;
    var practicedStr = totalMinNow >= 60 ? Math.floor(totalMinNow / 60) + 'h ' + (totalMinNow % 60) + 'm' : totalMinNow + 'm';
    html += '<div class="rpt-summary">';
    html += '<div class="rpt-summary-card"><div class="rpt-summary-ico">◷</div><div class="rpt-summary-val rpt-summary-val--green">' + practicedStr + '</div><div class="rpt-summary-label">Practiced</div><div class="rpt-summary-delta">' + deltaMini(totalMinNow, totalMinPrev) + '</div></div>';
    html += '<div class="rpt-summary-card"><div class="rpt-summary-ico">❖</div><div class="rpt-summary-val rpt-summary-val--blue">' + totalSessions + '</div><div class="rpt-summary-label">Sessions</div><div class="rpt-summary-delta">' + deltaMini(totalSessions, awarenessPrev.length + concPrev.length) + '</div></div>';
    if (bestHoldNow > 0) {
      html += '<div class="rpt-summary-card"><div class="rpt-summary-ico">◎</div><div class="rpt-summary-val rpt-summary-val--gold">' + fmtTimer(bestHoldNow) + '</div><div class="rpt-summary-label">Best Hold</div><div class="rpt-summary-delta">' + deltaMini(bestHoldNow, bestHoldPrev) + '</div></div>';
    } else {
      html += '<div class="rpt-summary-card"><div class="rpt-summary-ico">✶</div><div class="rpt-summary-val rpt-summary-val--gold">' + state.streak + 'd</div><div class="rpt-summary-label">Streak</div></div>';
    }
    html += '</div>';
    html += weekHtml;

    // ── Highlights: at most two, milestones before patterns ──
    var signalStyle = {
      'Best Rhythm':         { color: 'teal',   icon: '☀' },
      'Deepest Day':         { color: 'blue',   icon: '◆' },
      'Sharpest Focus':      { color: 'amber',  icon: '◎' },
      'Clearest Reflection': { color: 'purple', icon: '☾' },
      'Cadence':             { color: 'teal',   icon: '✦' }
    };
    var records = buildRecords(awarenessNow, concNow, range);
    var chips = records.map(function(r) { return { icon: r.icon, text: r.text, color: 'gold' }; });
    if (chips.length < 2) {
      // Don't pad with signals that restate a record chip already shown
      var recordKeys = records.map(function(r) { return r.key; });
      var dupOf = { 'Sharpest Focus': 'hold', 'Clearest Reflection': 'score' };
      buildSignals(awarenessNow, concNow, period).filter(function(s) {
        return recordKeys.indexOf(dupOf[s.label]) === -1;
      }).slice(0, 2 - chips.length).forEach(function(s) {
        var st = signalStyle[s.label] || { color: 'teal', icon: '✦' };
        chips.push({ icon: st.icon, text: s.text, val: s.val, color: st.color });
      });
    }
    chips.slice(0, 2).forEach(function(c) {
      html += '<div class="report-record report-record--' + c.color + '">'
        + '<span class="report-record-icon">' + c.icon + '</span>'
        + '<span class="report-record-text">' + escHtml(c.text) + '</span>'
        + (c.val ? '<span class="report-record-val">' + escHtml(String(c.val)) + '</span>' : '')
        + '</div>';
    });

    // ── One chart: Awareness (green) beside Concentration (gold) per bucket ──
    var awChart = buildChartData(state.history, period, 'durationMin');
    var concChart = buildChartData(concState.history, period, 'seconds');
    var awMinSeries = awChart.values.map(function(v) { return Math.round(v); });
    var concMinSeries = concChart.values.map(function(v) { return Math.round((v || 0) / 60); });
    if (awMinSeries.some(function(v) { return v > 0; }) || concMinSeries.some(function(v) { return v > 0; })) {
      html += '<div class="report-chart" style="margin-top:14px;">'
        + '<div class="report-chart-title" style="display:flex;justify-content:space-between;align-items:baseline;"><span>Minutes Practiced</span><span style="color:var(--accent);letter-spacing:.08em;">' + practicedStr + ' total</span></div>'
        + '<div class="rpt-legend"><span class="rpt-legend__i rpt-legend__i--green">Awareness</span><span class="rpt-legend__i rpt-legend__i--gold">Concentration</span></div>'
        + renderDualBarChart(awMinSeries, concMinSeries, awChart.labels, 56) + '</div>';
    }
  }

  // ── Detail: everything else folds away ──
  var accHtml = '';

  if (awarenessNow.length > 0) {
    var awMinNow = sumMinutes(awarenessNow);
    var awMinPrev = sumMinutes(awarenessPrev);
    var awScoreNow = avgScore(awarenessNow);
    var awScorePrev = avgScore(awarenessPrev);
    var awBody = '<div class="rpt-strip">'
      + rptStripCell(awarenessNow.length, 'Sessions', deltaMini(awarenessNow.length, awarenessPrev.length))
      + rptStripCell(fmtDuration(awMinNow), 'Time', deltaMini(awMinNow, awMinPrev))
      + (awScoreNow
          ? rptStripCell(awScoreNow, 'Avg Score', deltaMini(parseFloat(awScoreNow), parseFloat(awScorePrev || 0)))
          : rptStripCell(state.streak + 'd', 'Streak', ''))
      + '</div>';
    var awChartData = buildChartData(state.history, period, 'durationMin');
    if (awChartData.values.length >= 3 && awChartData.scoreValues && awChartData.scoreValues.some(function(v) { return v > 0; })) {
      awBody += '<div class="report-chart"><div class="report-chart-title">Session Score Trend</div>' + renderLineChart(awChartData.scoreValues, '#7eb8a4', 48) + '</div>';
    }
    accHtml += rptAccRow('green', 'Awareness', awarenessNow.length + ' sessions · ' + fmtDuration(awMinNow), awBody, '◎');
  }

  var clockSessions = (concState.history || []).filter(isClockSession).slice().reverse().slice(-50);
  if (concNow.length > 0 || clockSessions.length > 0) {
    var concBody = '';
    var concSum = '—';
    if (concNow.length > 0) {
      var concHoldNow = concNow.filter(isHoldSession);
      var concBestNow = concHoldNow.length ? Math.max.apply(null, concHoldNow.map(function(h) { return h.seconds || 0; })) : 0;
      concSum = concNow.length + (concNow.length === 1 ? ' session' : ' sessions') + (concBestNow > 0 ? ' · best ' + fmtTimer(concBestNow) : '');
      concBody += '<div class="rpt-strip">'
        + rptStripCell(concNow.length, 'Sessions', deltaMini(concNow.length, concPrev.length))
        + rptStripCell(concBestNow > 0 ? fmtTimer(concBestNow) : '—', 'Best Hold', '')
        + rptStripCell(fmtTimer(concSecNow), 'Total Held', deltaMini(concSecNow, concSecPrev))
        + '</div>';
      var typeBreakdown = {};
      concNow.forEach(function(h) { var t = concEntryLabel(h); typeBreakdown[t] = (typeBreakdown[t] || 0) + 1; });
      if (Object.keys(typeBreakdown).length > 1) {
        concBody += '<div class="rpt-cap">' + escHtml(Object.keys(typeBreakdown).map(function(k) { return k + ' ' + typeBreakdown[k]; }).join('   ·   ')) + '</div>';
      }
    }
    if (clockSessions.length >= 1) {
      var clockBest = Math.max.apply(null, clockSessions.map(function(s) { return s.seconds || 0; }));
      var clockPct = Math.min(100, Math.round(clockBest / 600 * 1000) / 10);
      concBody += '<div class="rpt-clockbar">'
        + '<div class="rpt-clockbar__lbl"><span>Clock · toward 10 min</span><span>' + (Number.isInteger(clockPct) ? clockPct : clockPct.toFixed(1)) + '%</span></div>'
        + '<div class="rpt-clockbar__track"><div class="rpt-clockbar__fill" style="width:' + clockPct + '%;"></div></div>'
        + '</div>';
      if (clockSessions.length >= 2) {
        concBody += '<div class="report-chart"><div class="report-chart-title">Hold Time Per Session</div>' + renderClockProgressChart(clockSessions) + '</div>';
      }
    }
    accHtml += rptAccRow('amber', 'Concentration', concSum, concBody, '◉');
  }

  if (prayerState.enabled && prayerState.count > 0) {
    var prayerDone = prayerState.todayDone ? prayerState.todayDone.length : 0;
    var prayerBody = '<div class="rpt-strip">'
      + rptStripCell(prayerDone + '/' + prayerState.count, 'Today', '')
      + rptStripCell((prayerState.streak || 0) + 'd', 'Streak', '')
      + '</div>';
    accHtml += rptAccRow('purple', 'Prayer', prayerDone + ' of ' + prayerState.count + ' today', prayerBody, '☽');
  }

  var rankBody = '<div class="rpt-strip">'
    + rptStripCell(state.level, 'Awareness Lvl', '')
    + rptStripCell(concState.level, 'Focus Lvl', '')
    + rptStripCell((state.xp + concState.xp).toLocaleString(), 'Total XP', '')
    + '</div>';
  accHtml += rptAccRow('gold', 'Rank', getRankTitle(state.level) + ' · ' + (state.xp + concState.xp).toLocaleString() + ' XP', rankBody, '✦');

  html += '<div class="rpt-acc">' + accHtml + '</div>';

  document.getElementById('reportContent').innerHTML = html;
}

function loadOmniaReportInto(period, offset) {
  offset = offset || 0;
  // Never fire an API call for today's daily report (day isn't complete)
  if (period === 'daily' && offset === 0) return;
  fetchOmniaReport(period, offset, function(err, commentary) {
    // Guard: if the user navigated to a different period/offset while the
    // request was in flight, discard this result — it belongs to another view
    if (currentReportPeriod !== period || reportOffset !== offset) return;
    var card = document.getElementById('omniaReportCard');
    if (!card) return;
    var inner = card.querySelector('.rpt-omnia-card__inner');
    if (!inner) return;
    var periodLabel = reportNavLabel(period, offset).toLowerCase();
    if (err || !commentary) return;
    inner.className = 'rpt-omnia-card__inner rpt-omnia-card__inner--row';
    inner.innerHTML = buildRptOmniaStage(false, true)
      + '<div class="rpt-omnia-bubble">'
      + '<div class="rpt-omnia-bubble-text" style="opacity:0;transition:opacity .6s ease;" id="omniaReportText">' + escHtml(commentary) + '</div>'
      + '<div class="rpt-omnia-bubble-meta">Omnia · ' + periodLabel + '</div>'
      + '</div>';
    requestAnimationFrame(function() {
      var t = document.getElementById('omniaReportText');
      if (t) t.style.opacity = '1';
    });
  });
}

function buildChartData(history, period, valueKey) {
  var now = new Date();
  var labels = [], values = [], scoreValues = [];

  if (period === 'daily') {
    // Last 24 hours by hour
    for (var h = 0; h < 24; h += 3) {
      labels.push(h === 0 ? '12a' : h < 12 ? h + 'a' : h === 12 ? '12p' : (h-12) + 'p');
      var from = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h);
      var to = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h + 3);
      var sessions = history.filter(function(s) { var d = new Date(s.date); return d >= from && d < to; });
      values.push(sessions.reduce(function(a,s) { return a + (s[valueKey] || s.seconds || 0); }, 0));
      var scored = sessions.filter(function(s) { return s.score; });
      scoreValues.push(scored.length ? scored.reduce(function(a,s) { return a + parseFloat(s.score); }, 0) / scored.length : 0);
    }
  } else if (period === 'weekly') {
    var days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    var weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
    for (var d = 0; d < 7; d++) {
      labels.push(days[d]);
      var from2 = new Date(weekStart); from2.setDate(from2.getDate() + d);
      var to2 = new Date(from2); to2.setDate(to2.getDate() + 1);
      var sessions2 = history.filter(function(s) { var dt = new Date(s.date); return dt >= from2 && dt < to2; });
      values.push(sessions2.reduce(function(a,s) { return a + (s[valueKey] || s.seconds || 0); }, 0));
      var scored2 = sessions2.filter(function(s) { return s.score; });
      scoreValues.push(scored2.length ? scored2.reduce(function(a,s) { return a + parseFloat(s.score); }, 0) / scored2.length : 0);
    }
  } else if (period === 'monthly') {
    var daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    for (var day = 1; day <= daysInMonth; day += 3) {
      labels.push(day);
      var from3 = new Date(now.getFullYear(), now.getMonth(), day);
      var to3 = new Date(now.getFullYear(), now.getMonth(), day + 3);
      var sessions3 = history.filter(function(s) { var dt = new Date(s.date); return dt >= from3 && dt < to3; });
      values.push(sessions3.reduce(function(a,s) { return a + (s[valueKey] || s.seconds || 0); }, 0));
      scoreValues.push(0);
    }
  } else {
    var months = ['J','F','M','A','M','J','J','A','S','O','N','D'];
    for (var mo = 0; mo < 12; mo++) {
      labels.push(months[mo]);
      var from4 = new Date(now.getFullYear(), mo, 1);
      var to4 = new Date(now.getFullYear(), mo + 1, 1);
      var sessions4 = history.filter(function(s) { var dt = new Date(s.date); return dt >= from4 && dt < to4; });
      values.push(sessions4.reduce(function(a,s) { return a + (s[valueKey] || s.seconds || 0); }, 0));
      scoreValues.push(0);
    }
  }
  return { labels: labels, values: values, scoreValues: scoreValues };
}

function buildRecords(awarenessNow, concNow, range) {
  var records = [];
  // A "record" means this period beat everything that came BEFORE it — comparing
  // against all-time maxima (which include the period itself) made these chips
  // fire on every period that merely contained the all-time best.
  var startTs = range && range.start ? range.start.getTime() : 0;
  function isPrior(h) { var d = new Date(h.date); return !isNaN(d) && d.getTime() < startTs; }
  if (awarenessNow.length > 0) {
    var best = awarenessNow.reduce(function(a, h) { return parseFloat(h.score || 0) > parseFloat(a.score || 0) ? h : a; }, awarenessNow[0]);
    var priorScores = state.history.filter(function(h) { return h.score && isPrior(h); }).map(function(h) { return parseFloat(h.score); });
    var maxPrior = priorScores.length ? Math.max.apply(null, priorScores) : 0;
    if (parseFloat(best.score || 0) > maxPrior && parseFloat(best.score) > 0) {
      records.push({ key: 'score', icon: '⭐', text: 'Personal best session score: ' + best.score + '/5' });
    }
    var longestNow = Math.max.apply(null, awarenessNow.map(function(h) { return h.durationMin || 0; }));
    var priorDurations = state.history.filter(isPrior).map(function(h) { return h.durationMin || 0; });
    var longestPrior = priorDurations.length ? Math.max.apply(null, priorDurations) : 0;
    if (longestNow > longestPrior && longestNow > 0) {
      records.push({ key: 'duration', icon: '⏱', text: 'Longest session yet: ' + fmtDuration(longestNow) });
    }
  }
  var concHoldNow2 = concNow.filter(isHoldSession);
  if (concHoldNow2.length > 0) {
    var bestHold = Math.max.apply(null, concHoldNow2.map(function(h) { return h.seconds || 0; }));
    var priorHolds = (concState.history || []).filter(function(h) { return isPrior(h) && isHoldSession(h); }).map(function(h) { return h.seconds || 0; });
    var bestPrior = priorHolds.length ? Math.max.apply(null, priorHolds) : 0;
    if (bestHold > bestPrior && bestHold > 0) {
      records.push({ key: 'hold', icon: '🎯', text: 'New concentration record: ' + fmtTimer(bestHold) });
    }
  }
  // Streak milestones only make sense on the current day's report
  if (currentReportPeriod === 'daily' && reportOffset === 0 && state.streak > 0 && state.streak % 7 === 0) {
    records.push({ key: 'streak', icon: '🔥', text: state.streak + '-day streak milestone reached!' });
  }
  return records;
}

// ── Share report ──────────────────────────────────────────
function shareReport() {
  var range = getDateRange(currentReportPeriod, reportOffset);
  var awarenessNow = filterHistory(state.history, range.start, range.now);
  var concNow = filterHistory(concState.history, range.start, range.now);
  var awMin = sumMinutes(awarenessNow);

  var periodLabel = reportNavLabel(currentReportPeriod, reportOffset);
    var text = [
    'Presence | ' + periodLabel,
    '',
    'Awareness: ' + awarenessNow.length + ' sessions, ' + fmtDuration(awMin),
    'Concentration: ' + concNow.length + ' sessions',
    'Prayer: ' + (prayerState.todayDone ? prayerState.todayDone.length : 0) + '/' + prayerState.count + ' today',
    'Awareness Level ' + state.level + ': ' + getRankTitle(state.level),
    'Concentration Level ' + concState.level + ': ' + getConcRank(concState.level),
    'Streak: ' + state.streak + ' days',
    '',
    'Training with Presence'
  ].join('\n');

  if (navigator.share) {
    navigator.share({ title: 'My Presence Report', text: text })
      .catch(function() { copyToClipboard(text); });
  } else {
    copyToClipboard(text);
  }
}

function copyToClipboard(text) {
  var ta = document.createElement('textarea');
  ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
  document.body.appendChild(ta); ta.select();
  try { document.execCommand('copy'); showToast('Report copied to clipboard'); }
  catch(e) { showToast('Could not copy'); }
  document.body.removeChild(ta);
}

// ── Period filter menu ────────────────────────────────────
(function() {
  var btn = document.getElementById('reportFilterBtn');
  var menu = document.getElementById('reportPeriodMenu');
  btn.addEventListener('click', function(e) {
    e.stopPropagation();
    menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
  });
  document.addEventListener('click', function() { menu.style.display = 'none'; });
  menu.addEventListener('click', function(e) { e.stopPropagation(); });
  document.querySelectorAll('.rpt-period-menu__item').forEach(function(item) {
    item.addEventListener('click', function() {
      currentReportPeriod = this.dataset.period;
      reportOffset = 0;
      menu.style.display = 'none';
      updateReportTabStyles();
      updateReportNav();
      renderReport(currentReportPeriod);
    });
  });
})();

document.getElementById('reportNavPrev').addEventListener('click', function() {
  if (currentReportPeriod === 'yearly') return;
  if (getDateRange(currentReportPeriod, reportOffset - 1).now.getTime() <= getFirstUseDate()) return;
  reportOffset--;
  renderReport(currentReportPeriod);
});
document.getElementById('reportNavNext').addEventListener('click', function() {
  if (currentReportPeriod === 'yearly' || reportOffset >= 0) return;
  reportOffset++;
  renderReport(currentReportPeriod);
});

document.getElementById('reportsBack').addEventListener('click', function() {
  renderHome(); showScreen('homeScreen');
});

document.getElementById('reportShareBtn').addEventListener('click', shareReport);
