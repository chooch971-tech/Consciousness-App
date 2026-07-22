'use strict';

// ═══════════════════════════════════════
// PRACTICE REVIEW
// Journal owns the day-level record. This screen owns longitudinal meaning:
// consistency, quality, discipline-specific development, and one next step.
// ═══════════════════════════════════════

var currentReportPeriod = 'weekly';
var reportOffset = 0;
var _reviewRequestSerial = 0;

// Icons and colors mirror the Guide Path exercise cards (guide-quests-client.js
// exIcon/exColor) so a discipline reads the same wherever it appears. Entries
// with no Guide Path card of their own (awareness, prayer, autosuggestion,
// all-angles, multi-sense) borrow the nearest established app color instead.
var REVIEW_PRACTICES = {
  awareness:      { label:'Awareness', icon:'◎', color:'#7eb8a4', metric:null },
  clock:          { label:'Clock', icon:'⊙', color:'#d4b08e', metric:'hold' },
  thought:        { label:'Thought Control', icon:'◌', color:'#98b4cc', metric:'hold' },
  visualization:  { label:'Visualization', icon:'◉', color:'#8ab8e0', metric:'hold' },
  auditory:       { label:'Auditory', icon:'◈', color:'#8eccc0', metric:'hold' },
  asana:          { label:'Asana', icon:'✦', color:'#d49898', metric:'duration' },
  pore_breathing: { label:'Pore Breathing', icon:'≋', color:'#8ecce0', metric:'breaths' },
  prayer:         { label:'Prayer', icon:'☽', color:'#c4a8d4', metric:null },
  autosuggestion: { label:'Autosuggestion', icon:'✱', color:'#c4a8d4', metric:'taps' },
  sense:          { label:'Senses', icon:'✺', color:'#e0a8c4', metric:'duration' },
  'all-angles':   { label:'All Angles', icon:'◇', color:'#8ab8e0', metric:'duration' },
  'multi-sense':  { label:'Multi-Sense', icon:'◇', color:'#8ab8e0', metric:'duration' }
};

function reviewDayStart(value) {
  var date = value ? new Date(value) : new Date();
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function reviewAddDays(value, amount) {
  var date = reviewDayStart(value);
  date.setDate(date.getDate() + amount);
  return date;
}

function reviewDaysFor(period) {
  return period === 'monthly' ? 30 : period === 'yearly' ? null : 7;
}

function getDateRange(period, offset) {
  offset = Number(offset) || 0;
  if (period === 'yearly') {
    return { start:null, now:reviewAddDays(new Date(), 1), prevStart:null, prevEnd:null };
  }
  var days = reviewDaysFor(period);
  var end = reviewAddDays(new Date(), 1 + offset * days);
  var start = reviewAddDays(end, -days);
  var prevEnd = new Date(start);
  var prevStart = reviewAddDays(prevEnd, -days);
  return { start:start, now:end, prevStart:prevStart, prevEnd:prevEnd };
}

function reviewRangeLabel(period, offset) {
  if (period === 'yearly') return 'Since you began';
  var range = getDateRange(period, offset);
  var end = reviewAddDays(range.now, -1);
  if (offset === 0) return period === 'monthly' ? 'Last 30 days' : 'Last 7 days';
  return range.start.toLocaleDateString('en-US',{month:'short',day:'numeric'}) + ' – '
    + end.toLocaleDateString('en-US',{month:'short',day:'numeric',year:range.start.getFullYear() !== end.getFullYear() ? 'numeric' : undefined});
}

function reviewSeconds(value) {
  value = Math.max(0, Math.round(Number(value) || 0));
  if (value < 60) return value + 's';
  var minutes = Math.floor(value / 60);
  var seconds = value % 60;
  if (minutes < 60) return minutes + 'm' + (seconds ? ' ' + seconds + 's' : '');
  var hours = Math.floor(minutes / 60);
  minutes %= 60;
  return hours + 'h' + (minutes ? ' ' + minutes + 'm' : '');
}

function reviewSigned(value, formatter) {
  if (!value || Math.abs(value) < 0.05) return '<span class="review-trend review-trend--flat">steady</span>';
  var direction = value > 0 ? 'up' : 'down';
  var prefix = value > 0 ? '+' : '−';
  return '<span class="review-trend review-trend--' + direction + '">' + prefix + formatter(Math.abs(value)) + '</span>';
}

function reviewBackfill() {
  if (!window.PresencePracticeReview) return null;
  var review = PresencePracticeReview.backfill(localStorage, {
    awareness: (state && state.history) || [],
    concentration: (concState && concState.history) || [],
    prayer: (prayerState && prayerState.history) || []
  });
  if (typeof buildGuideRegimentItems === 'function') {
    try { PresencePracticeReview.capturePlan(localStorage, new Date(), buildGuideRegimentItems()); }
    catch(e) {}
  }
  return review;
}

function reviewJournalCount(start, end) {
  var count = 0;
  try {
    var journal = JSON.parse(localStorage.getItem('presence_journal_v1') || '{}');
    Object.keys(journal).forEach(function(key) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) return;
      var entry = journal[key] || {};
      if (!(entry.title && entry.title.trim()) && !(entry.note && entry.note.trim())) return;
      if (start && key < PresencePracticeReview.dayKey(start)) return;
      if (end && key >= PresencePracticeReview.dayKey(end)) return;
      count++;
    });
  } catch(e) {}
  return count;
}

function reviewSummary(period, offset) {
  var range = getDateRange(period, offset);
  return PresencePracticeReview.summarize(localStorage, range.start, range.now);
}

function reviewPreviousSummary(period, offset) {
  if (period === 'yearly') return null;
  var range = getDateRange(period, offset);
  return PresencePracticeReview.summarize(localStorage, range.prevStart, range.prevEnd);
}

function updateReportTabStyles() {
  document.querySelectorAll('.rpt-period-menu__item').forEach(function(item) {
    item.classList.toggle('active', item.dataset.period === currentReportPeriod);
  });
}

function updateReportNav() {
  var label = document.getElementById('reportNavLabel');
  var prev = document.getElementById('reportNavPrev');
  var next = document.getElementById('reportNavNext');
  if (label) label.textContent = reviewRangeLabel(currentReportPeriod, reportOffset);
  var lifetime = currentReportPeriod === 'yearly';
  if (prev) {
    prev.style.opacity = lifetime ? '.15' : '.7';
    prev.style.pointerEvents = lifetime ? 'none' : '';
  }
  if (next) {
    var disabled = lifetime || reportOffset >= 0;
    next.style.opacity = disabled ? '.15' : '.7';
    next.style.pointerEvents = disabled ? 'none' : '';
  }
}

function showReports() {
  currentReportPeriod = 'weekly';
  reportOffset = 0;
  reviewBackfill();
  updateReportTabStyles();
  showScreen('reportsScreen');
  renderReport(currentReportPeriod);
}

function reviewMetricText(practice, value) {
  var meta = REVIEW_PRACTICES[practice] || { metric:'duration' };
  if (!value) return '—';
  if (meta.metric === 'breaths') return Math.round(value) + ' breaths';
  if (meta.metric === 'taps') return Math.round(value) + ' taps';
  return reviewSeconds(value);
}

function reviewQualityRow(label, explanation, current, previous) {
  if (current == null) return '';
  var delta = previous == null ? '<span class="review-trend review-trend--flat">new</span>'
    : reviewSigned(current - previous, function(value){ return value.toFixed(1); });
  var pct = Math.max(0, Math.min(100, current / 5 * 100));
  return '<div class="review-quality-row">'
    + '<div class="review-quality-copy"><div class="review-quality-name">' + label + '</div><div class="review-quality-sub">' + explanation + '</div></div>'
    + '<div class="review-quality-score">' + current.toFixed(1) + '<small>/5</small>' + delta + '</div>'
    + '<div class="review-quality-track"><i style="width:' + pct.toFixed(0) + '%"></i></div>'
    + '</div>';
}

function reviewQualityHtml(summary, previous) {
  var quality = summary.awareness;
  if (!quality || !quality.count || quality.stability == null) return '';
  var prior = previous ? previous.awareness : {};
  return '<section class="review-section">'
    + '<div class="review-section-head"><div><span>Presence quality</span><small>' + quality.count + ' awareness session' + (quality.count === 1 ? '' : 's') + '</small></div></div>'
    + '<div class="review-quality-card">'
    + reviewQualityRow('Stability','How consistently attention stayed present',quality.stability,prior && prior.stability)
    + reviewQualityRow('Return','How easily awareness was restored',quality.returnEase,prior && prior.returnEase)
    + reviewQualityRow('Independence','How little the reminders were needed',quality.independence,prior && prior.independence)
    + '</div></section>';
}

function reviewPracticeRows(summary, previous) {
  var practices = Object.keys(summary.byPractice || {}).filter(function(key) {
    return summary.byPractice[key].sessions > 0;
  }).sort(function(a,b) {
    return summary.byPractice[b].seconds - summary.byPractice[a].seconds;
  });
  if (!practices.length) return '';
  var maxSeconds = Math.max.apply(null, practices.map(function(key){ return summary.byPractice[key].seconds; })) || 1;
  var rows = practices.map(function(key) {
    var current = summary.byPractice[key];
    var prior = previous && previous.byPractice ? previous.byPractice[key] : null;
    var meta = REVIEW_PRACTICES[key] || { label:key.replace(/_/g,' '), icon:'·', color:'#8ab8e0', metric:'duration' };
    var metric = meta.metric && current.best > 0
      ? '<span>Best ' + reviewMetricText(key,current.best) + (current.typical > 0 && current.typical !== current.best ? ' · typical ' + reviewMetricText(key,current.typical) : '') + '</span>'
      : '<span>' + reviewSeconds(current.seconds) + ' practiced</span>';
    var change = '';
    if (meta.metric && prior && prior.best > 0 && current.best !== prior.best) {
      change = reviewSigned(current.best - prior.best, function(value){ return reviewMetricText(key,value); });
    }
    return '<div class="review-practice-row">'
      + '<div class="review-practice-icon" style="background:' + meta.color + '1e;border-color:' + meta.color + '38;color:' + meta.color + ';">' + meta.icon + '</div>'
      + '<div class="review-practice-main"><div class="review-practice-title">' + escHtml(meta.label) + '<small>' + current.sessions + ' session' + (current.sessions === 1 ? '' : 's') + '</small></div>'
      + '<div class="review-practice-meta">' + metric + change + '</div>'
      + '<div class="review-practice-track"><i style="width:' + Math.max(4,current.seconds/maxSeconds*100).toFixed(0) + '%"></i></div></div>'
      + '</div>';
  }).join('');
  return '<section class="review-section"><div class="review-section-head"><div><span>Practice development</span><small>Each discipline measured on its own terms</small></div></div><div class="review-practice-card">' + rows + '</div></section>';
}

function reviewTimelineHtml(summary, range, period) {
  if (period === 'yearly' || !range.start) return '';
  var dayMap = {};
  (summary.daily || []).forEach(function(day){ dayMap[day.key] = day; });
  var days = reviewDaysFor(period);
  var slots = [];
  for (var i=0; i<days; i++) {
    var date = reviewAddDays(range.start,i);
    var key = PresencePracticeReview.dayKey(date);
    var item = dayMap[key] || { seconds:0, sessions:0 };
    slots.push({ date:date, key:key, seconds:item.seconds, sessions:item.sessions });
  }
  var grouped = [];
  var size = period === 'monthly' ? 5 : 1;
  for (var j=0; j<slots.length; j+=size) {
    var chunk = slots.slice(j,j+size);
    grouped.push({
      label: period === 'monthly' ? chunk[0].date.toLocaleDateString('en-US',{month:'short',day:'numeric'}) : chunk[0].date.toLocaleDateString('en-US',{weekday:'narrow'}),
      seconds: chunk.reduce(function(sum,item){return sum+item.seconds;},0),
      active: chunk.filter(function(item){return item.sessions>0;}).length,
      today: chunk.some(function(item){return item.key===PresencePracticeReview.dayKey(new Date());})
    });
  }
  var max = Math.max.apply(null, grouped.map(function(item){return item.seconds;})) || 1;
  var bars = grouped.map(function(item) {
    return '<div class="review-bar-col' + (item.today ? ' today' : '') + '"><div class="review-bar-wrap"><i style="height:' + (item.seconds ? Math.max(7,item.seconds/max*100) : 2).toFixed(0) + '%"></i></div><span>' + item.label + '</span></div>';
  }).join('');
  return '<section class="review-section review-section--chart"><div class="review-section-head"><div><span>Practice rhythm</span><small>' + (period === 'monthly' ? 'Five-day windows' : 'Daily practice time') + '</small></div></div><div class="review-bars">' + bars + '</div></section>';
}

function reviewBestImprovement(summary, previous) {
  if (!previous) return null;
  var best = null;
  Object.keys(summary.byPractice || {}).forEach(function(key) {
    var current = summary.byPractice[key];
    var prior = previous.byPractice && previous.byPractice[key];
    if (!current.best || !prior || !prior.best || current.best <= prior.best) return;
    var gain = current.best - prior.best;
    var relativeGain = gain / prior.best;
    if (!best || relativeGain > best.relativeGain) best = { key:key, gain:gain, relativeGain:relativeGain, current:current.best };
  });
  return best;
}

function buildReviewGuidance(summary, previous, period) {
  if (!summary.sessions) {
    return {
      insight:'There is no practice recorded in this window yet. Nothing is wrong; the next completed session is the whole beginning.',
      action:'Choose one small practice from the Guide and complete it without trying to make up for lost time.'
    };
  }
  var insight;
  var improvement = reviewBestImprovement(summary,previous);
  if (improvement) {
    var meta = REVIEW_PRACTICES[improvement.key] || {label:improvement.key};
    insight = meta.label + ' moved forward: your best reached ' + reviewMetricText(improvement.key,improvement.current) + ' in this window.';
  } else if (summary.awareness.stability != null && previous && previous.awareness.stability != null && summary.awareness.stability - previous.awareness.stability >= .25) {
    insight = 'Your attention was more stable than in the preceding window, improving from ' + previous.awareness.stability.toFixed(1) + ' to ' + summary.awareness.stability.toFixed(1) + ' out of 5.';
  } else {
    insight = 'You practiced on ' + summary.activeDays + ' of ' + (reviewDaysFor(period) || summary.activeDays) + ' days for ' + reviewSeconds(summary.totalSeconds) + ' across ' + summary.sessions + ' sessions.';
  }

  var action;
  if (summary.plan.assigned > 0 && summary.plan.completed / summary.plan.assigned < .7) {
    action = 'Keep the current regimen. Complete one assigned practice before adding anything new.';
  } else if (period !== 'yearly' && summary.activeDays < Math.ceil(reviewDaysFor(period) * .5)) {
    action = 'Protect a short practice window on the next two open days; consistency matters more than extending a single session.';
  } else if (summary.awareness.stability != null && summary.awareness.stability < 3) {
    action = 'Keep reminders close for now and make the return itself the practice; there is no need to lengthen the interval yet.';
  } else {
    action = 'Continue the current Guide plan and give the least-practiced assigned exercise the first clear slot this week.';
  }
  return { insight:insight, action:action };
}

function reviewOmniaCacheKey(period, offset) {
  var range = getDateRange(period,offset);
  return 'presence_omnia_practice_review_v1_' + period + '_' + PresencePracticeReview.dayKey(reviewAddDays(range.now,-1));
}

function reviewOmniaContext(period, offset, summary, previous) {
  var concentration = {};
  Object.keys(summary.byPractice || {}).forEach(function(key) {
    if (key === 'awareness' || key === 'prayer') return;
    var row = summary.byPractice[key];
    var meta = REVIEW_PRACTICES[key] || {label:key,metric:'duration'};
    var measure = meta.metric === 'breaths' ? 'breaths' : meta.metric === 'taps' ? 'taps' : 'seconds';
    concentration[meta.label] = { sessions:row.sessions, total_sec:row.seconds, measure:measure, best:row.best, typical:row.typical };
    if (measure === 'seconds') concentration[meta.label].best_sec = row.best;
  });
  var bestImprovement = reviewBestImprovement(summary,previous);
  var currentItems = [];
  try { currentItems = typeof buildGuideRegimentItems === 'function' ? buildGuideRegimentItems() : []; } catch(e) {}
  return {
    report_policy_version:3,
    period:period === 'monthly' ? 'monthly' : 'weekly',
    offset:offset || 0,
    utcOffsetMinutes:-new Date().getTimezoneOffset(),
    window_days:reviewDaysFor(period),
    active_days:summary.activeDays,
    total_practice_sec:summary.totalSeconds,
    awareness_sessions:(summary.byPractice.awareness || {}).sessions || 0,
    awareness_minutes:Math.round(((summary.byPractice.awareness || {}).seconds || 0)/60),
    awareness_quality:summary.awareness,
    concentration_sessions:Object.keys(concentration).reduce(function(sum,key){return sum+concentration[key].sessions;},0),
    concentration_total_sec:Object.keys(concentration).reduce(function(sum,key){return sum+concentration[key].total_sec;},0),
    concentration_best_sec:Object.keys(concentration).reduce(function(best,key){return Math.max(best,concentration[key].best_sec||0);},0),
    completed_exercises:Object.keys(concentration),
    concentration_by_exercise:concentration,
    current_regimen_exercises:currentItems.map(function(item){return item.name||item.id;}).slice(0,16),
    regimen_total:summary.plan.assigned || null,
    regimen_completed:summary.plan.completed || null,
    regimen_complete:summary.plan.assigned ? summary.plan.completed >= summary.plan.assigned : null,
    allowed_recommendations:[],
    recommendation_exclusions:['Clock','Thought Control','Visualization','Auditory','Asana','Pore Breathing'],
    avoid_clock_recommendation:true,
    thought_control_stack_count:currentItems.filter(function(item){return item.id==='thought'||item.tcMode;}).length,
    ready_for_new_exercises:false,
    days_without_improvement:0,
    needs_push:false,
    has_previous_data:!!(previous && previous.sessions),
    is_new_best_hold:false,
    progress_signals:{
      best_focus_improved:!!bestImprovement,
      practice_duration_improved:!!(previous && summary.totalSeconds > previous.totalSeconds),
      improved_exercises:bestImprovement ? [(REVIEW_PRACTICES[bestImprovement.key]||{label:bestImprovement.key}).label] : [],
      newly_practiced_exercises:[]
    },
    comparison_baseline:previous ? {
      window:'preceding_equal_window',
      active_days:previous.activeDays,
      total_practice_sec:previous.totalSeconds,
      awareness_sessions:(previous.byPractice.awareness||{}).sessions||0,
      concentration_sessions:previous.sessions-((previous.byPractice.awareness||{}).sessions||0)-((previous.byPractice.prayer||{}).sessions||0)
    } : {},
    practice_streak_days:state.streak || 0,
    streak_worth_mentioning:false,
    omnia_candor:typeof getOmniaCandor === 'function' ? getOmniaCandor() : 1
  };
}

function fetchOmniaReport(period, context) {
  var token = authToken || localStorage.getItem('presence_auth_token');
  if (!token) return Promise.reject(new Error('sign-in required'));
  return fetch(SYNC_API_URL + '/omnia/report', {
    method:'POST',
    headers:{'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token},
    body:JSON.stringify({period:period,context:context})
  }).then(function(response){
    if(!response.ok) throw new Error('review unavailable');
    return response.json();
  });
}

function loadReviewOmnia(period, offset, summary, previous, fallback) {
  if (period === 'yearly' || !summary.sessions) return;
  var key = reviewOmniaCacheKey(period,offset);
  var cached = null;
  try { cached = JSON.parse(localStorage.getItem(key)||'null'); } catch(e) {}
  if (cached && cached.commentary && cached.ts && Date.now()-cached.ts < 86400000) {
    var cachedEl = document.getElementById('reviewInsightText');
    if (cachedEl) cachedEl.textContent = cached.commentary;
    return;
  }
  var serial = ++_reviewRequestSerial;
  var requestPeriod = period === 'monthly' ? 'review30' : 'review7';
  fetchOmniaReport(requestPeriod,reviewOmniaContext(period,offset,summary,previous))
    .then(function(data){
      if(serial!==_reviewRequestSerial||!data.commentary)return;
      localStorage.setItem(key,JSON.stringify({ts:Date.now(),commentary:data.commentary}));
      var text=document.getElementById('reviewInsightText');
      if(text)text.textContent=data.commentary;
    }).catch(function(){
      var text=document.getElementById('reviewInsightText');
      if(text&&!text.textContent)text.textContent=fallback;
    });
}

function reviewInsightHtml(guidance, period) {
  if (period === 'yearly') return '';
  return '<section class="review-insight">'
    + '<div class="review-insight-glyph">' + (typeof OMNIA_CRYSTAL_SVG_RPT !== 'undefined' ? OMNIA_CRYSTAL_SVG_RPT : '◇') + '</div>'
    + '<div><div class="review-insight-label">Practice insight</div><div class="review-insight-text" id="reviewInsightText">' + escHtml(guidance.insight) + '</div></div>'
    + '</section>';
}

function reviewHeroHtml(summary, previous, period, reflections) {
  var days = reviewDaysFor(period);
  var dayValue = period === 'yearly' ? summary.activeDays : summary.activeDays + '/' + days;
  var timeDelta = previous ? reviewSigned(summary.totalSeconds-previous.totalSeconds,reviewSeconds) : '';
  var dayDelta = previous ? reviewSigned(summary.activeDays-previous.activeDays,function(value){return Math.round(value)+'d';}) : '';
  var thirdValue, thirdLabel, thirdSub;
  if (summary.plan.assigned > 0) {
    thirdValue = Math.round(summary.plan.completed/summary.plan.assigned*100)+'%';
    thirdLabel = 'Follow-through';
    thirdSub = summary.plan.completed + ' of ' + summary.plan.assigned + ' assigned';
  } else {
    thirdValue = reflections;
    thirdLabel = 'Reflections';
    thirdSub = 'written in this window';
  }
  return '<div class="review-hero">'
    + '<div class="review-hero-cell review-hero-cell--green"><div class="review-hero-value">'+dayValue+'</div><div class="review-hero-label">Practice days</div>'+dayDelta+'</div>'
    + '<div class="review-hero-cell review-hero-cell--blue"><div class="review-hero-value">'+reviewSeconds(summary.totalSeconds)+'</div><div class="review-hero-label">Practice time</div>'+timeDelta+'</div>'
    + '<div class="review-hero-cell review-hero-cell--gold"><div class="review-hero-value">'+thirdValue+'</div><div class="review-hero-label">'+thirdLabel+'</div><div class="review-hero-sub">'+thirdSub+'</div></div>'
    + '</div>';
}

function reviewNextHtml(guidance) {
  return '<section class="review-next"><div class="review-next-label">Carry forward</div><div class="review-next-text">'+escHtml(guidance.action)+'</div><button class="review-next-btn" data-review-guide>View today’s practice <span>›</span></button></section>';
}

function reviewJournalHtml(count) {
  var copy = count ? count + ' reflection' + (count === 1 ? '' : 's') + ' written in this period.' : 'No written reflections in this period yet.';
  return '<button class="review-journal-link" data-review-journal><span class="review-journal-icon">✎</span><span><b>Journal</b><small>'+copy+'</small></span><i>›</i></button>';
}

function reviewLifetimeHtml(summary, reflections) {
  var lifetimeSessions = Math.max(summary.sessions,(state.totalSessions||0)+(concState.totalSessions||0));
  var rows = Object.keys(summary.byPractice||{}).filter(function(key){return summary.byPractice[key].best>0;}).map(function(key){
    var meta=REVIEW_PRACTICES[key]||{label:key,icon:'·',color:'#8ab8e0'};
    return '<div class="review-record-row"><span class="review-practice-icon" style="background:'+meta.color+'1e;border-color:'+meta.color+'38;color:'+meta.color+';">'+meta.icon+'</span><span><b>'+escHtml(meta.label)+'</b><small>Personal best</small></span><strong>'+reviewMetricText(key,summary.byPractice[key].best)+'</strong></div>';
  }).join('');
  return '<div class="review-lifetime-note">A quiet record of the practice preserved on this account.</div>'
    + '<div class="review-hero review-hero--lifetime">'
    + '<div class="review-hero-cell review-hero-cell--green"><div class="review-hero-value">'+summary.activeDays+'</div><div class="review-hero-label">Recorded days</div></div>'
    + '<div class="review-hero-cell review-hero-cell--blue"><div class="review-hero-value">'+lifetimeSessions+'</div><div class="review-hero-label">Sessions</div></div>'
    + '<div class="review-hero-cell review-hero-cell--gold"><div class="review-hero-value">'+reviewSeconds(summary.totalSeconds)+'</div><div class="review-hero-label">Recorded time</div></div></div>'
    + (rows?'<section class="review-section"><div class="review-section-head"><div><span>Practice records</span><small>Each discipline keeps its own measure</small></div></div><div class="review-record-card">'+rows+'</div></section>':'')
    + reviewJournalHtml(reflections);
}

function renderReport(period) {
  currentReportPeriod = period || currentReportPeriod;
  reviewBackfill();
  updateReportTabStyles();
  updateReportNav();
  var range = getDateRange(currentReportPeriod,reportOffset);
  var summary = reviewSummary(currentReportPeriod,reportOffset);
  var previous = reviewPreviousSummary(currentReportPeriod,reportOffset);
  var reflections = reviewJournalCount(range.start,range.now);
  var bannerSub = document.getElementById('reportsBannerSub');
  if (bannerSub) bannerSub.textContent = currentReportPeriod === 'yearly'
    ? 'Milestones held across your practice'
    : summary.activeDays + ' practice day' + (summary.activeDays===1?'':'s') + ' · ' + reviewSeconds(summary.totalSeconds);

  if (currentReportPeriod === 'yearly') {
    document.getElementById('reportContent').innerHTML = reviewLifetimeHtml(summary,reflections);
    return;
  }

  var guidance = buildReviewGuidance(summary,previous,currentReportPeriod);
  var html = reviewInsightHtml(guidance,currentReportPeriod)
    + reviewHeroHtml(summary,previous,currentReportPeriod,reflections)
    + reviewTimelineHtml(summary,range,currentReportPeriod)
    + reviewQualityHtml(summary,previous)
    + reviewPracticeRows(summary,previous)
    + reviewNextHtml(guidance)
    + reviewJournalHtml(reflections);
  document.getElementById('reportContent').innerHTML = html;
  loadReviewOmnia(currentReportPeriod,reportOffset,summary,previous,guidance.insight);
}

function openGuideFromReview() {
  showScreen('homeScreen');
  if (typeof switchMode === 'function') switchMode('guide');
}

function openJournalFromReview() {
  if (typeof renderJournal === 'function') renderJournal();
  showScreen('journalScreen');
}

(function wirePracticeReview() {
  var filter = document.getElementById('reportFilterBtn');
  var menu = document.getElementById('reportPeriodMenu');
  filter.addEventListener('click',function(event){event.stopPropagation();menu.style.display=menu.style.display==='none'?'block':'none';});
  menu.addEventListener('click',function(event){
    var item=event.target.closest('[data-period]');
    if(!item)return;
    currentReportPeriod=item.dataset.period;
    reportOffset=0;
    menu.style.display='none';
    renderReport(currentReportPeriod);
  });
  document.addEventListener('click',function(event){if(!event.target.closest('#reportPeriodMenu')&&!event.target.closest('#reportFilterBtn'))menu.style.display='none';});
  document.getElementById('reportNavPrev').addEventListener('click',function(){if(currentReportPeriod==='yearly')return;reportOffset--;renderReport(currentReportPeriod);});
  document.getElementById('reportNavNext').addEventListener('click',function(){if(currentReportPeriod==='yearly'||reportOffset>=0)return;reportOffset++;renderReport(currentReportPeriod);});
  document.getElementById('reportsBack').addEventListener('click',function(){if(typeof renderHomeForNavigation==='function')renderHomeForNavigation();showScreen('homeScreen');});
  document.getElementById('reportContent').addEventListener('click',function(event){
    if(event.target.closest('[data-review-guide]'))openGuideFromReview();
    if(event.target.closest('[data-review-journal]'))openJournalFromReview();
  });
})();
