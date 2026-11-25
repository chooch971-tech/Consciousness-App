// Personal bests and recent-trend feedback for the skill exercises.
//
// Seeing yourself improve is the reward that keeps a practice going, so every
// Clock, Thought Control, Visualization and Auditory result shows how this sit
// compares with your own past: a "new personal best" moment when a record
// falls, and a line of your last sessions with the comparison to your recent
// average. Only improvements are put into words; an ordinary sit is shown
// neutrally, never as a failure.
//
// Records live in achState.hwm under "pb_" keys. That map already syncs as a
// monotonic max on both client and server, so a record can never roll back.
// The history (capped at 100 entries) is folded in too, so records set before
// this feature shipped still count.

var PB_TREND_SESSIONS = 10;      // sessions drawn in the trend line, this one included
var PB_TREND_MIN_PRIOR = 3;      // prior sessions needed before comparing to an average
var PB_RATE_MIN_SEC = 120;       // a thoughts-per-minute rate from a shorter sit is noise

// Which skill a history entry trains, and how it is measured. Returns null for
// exercises measured only by time spent (Asana, Senses, Pore Breathing…).
function pbDescribe(entry) {
  if (!entry) return null;
  if (entry.type === 'thought') {
    var mode = entry.tcMode || 'observation';
    var dur = Number(entry.durationSec) || 0;
    var n = pbThoughtCount(entry);
    return {
      group: 'thought:' + mode,
      bestLabel: 'Longest thought-free stretch',
      best: Number(entry.seconds) || 0,
      trendLabel: 'thoughts per minute',
      trend: (dur >= PB_RATE_MIN_SEC && n !== null) ? n / (dur / 60) : null,
      trendHigher: false,
      trendIsTime: false
    };
  }
  if (entry.type === 'visualization' || entry.type === 'auditory') {
    var vis = entry.type === 'visualization';
    return {
      group: entry.type + ':' + (entry.eyesMode || 'closed'),
      bestLabel: vis ? 'Longest unbroken image' : 'Longest unbroken sound',
      best: Number(entry.seconds) || 0,
      trendLabel: 'longest hold',
      trend: Number(entry.seconds) || 0,
      trendHigher: true,
      trendIsTime: true
    };
  }
  if (!entry.type && !entry.exercise) {
    return {
      group: 'clock',
      // The Clock result card already announces its own PB, so the banner only
      // adds the trend there.
      bestLabel: null,
      best: Number(entry.seconds) || 0,
      trendLabel: 'longest hold',
      trend: Number(entry.seconds) || 0,
      trendHigher: true,
      trendIsTime: true
    };
  }
  return null;
}

// Thought Control entries record their tap count as `intrusions`; entries made
// before that field existed carry it only in the "N thoughts in m:ss" label.
function pbThoughtCount(entry) {
  if (typeof entry.intrusions === 'number') return entry.intrusions;
  var m = /^(\d+) thoughts? in /.exec(String(entry.object || ''));
  return m ? parseInt(m[1], 10) : null;
}

function pbFmtTime(sec) {
  sec = Math.max(0, Math.round(sec));
  return Math.floor(sec / 60) + ':' + String(sec % 60).padStart(2, '0');
}

// Compare a just-finished entry with what came before it. `history` is the
// newest-first history *without* this entry; `records` is the synced hwm map.
// Pure: returns the report and the record value to store, mutates nothing.
function pbEvaluate(entry, history, records) {
  var d = pbDescribe(entry);
  if (!d) return null;
  var prior = (history || []).filter(function(h) {
    var hd = pbDescribe(h);
    return hd && hd.group === d.group;
  });

  var key = 'pb_' + d.group;
  var prevBest = Number((records || {})[key]) || 0;
  prior.forEach(function(h) { prevBest = Math.max(prevBest, pbDescribe(h).best); });
  // A first-ever session is not a "record" — there is nothing yet to beat.
  var isNewBest = d.best > 0 && prevBest > 0 && d.best > prevBest;

  var trendPrior = prior.map(function(h) { return pbDescribe(h).trend; })
    .filter(function(v) { return typeof v === 'number' && isFinite(v); });
  var series = null, avg = null, deltaPct = null;
  if (typeof d.trend === 'number' && isFinite(d.trend) && trendPrior.length >= PB_TREND_MIN_PRIOR) {
    var window_ = trendPrior.slice(0, PB_TREND_SESSIONS - 1);
    avg = window_.reduce(function(a, v) { return a + v; }, 0) / window_.length;
    series = window_.slice().reverse().concat([d.trend]);
    if (avg > 0) deltaPct = Math.round((d.trend - avg) / avg * 100);
  }

  return {
    key: key,
    record: Math.max(prevBest, d.best),
    isNewBest: isNewBest,
    bestLabel: d.bestLabel,
    best: d.best,
    prevBest: prevBest,
    trendLabel: d.trendLabel,
    trend: d.trend,
    trendHigher: d.trendHigher,
    trendIsTime: d.trendIsTime,
    series: series,
    avg: avg,
    deltaPct: deltaPct
  };
}

// Called by recordExerciseCompletion before the entry joins the history.
function pbOnCompletion(entry) {
  window._pendingPersonalBest = null;
  try {
    var hist = (typeof concState !== 'undefined' && concState && concState.history) || [];
    var hasAch = typeof achState !== 'undefined' && achState && achState.hwm;
    var report = pbEvaluate(entry, hist, hasAch ? achState.hwm : {});
    if (!report) return;
    if (hasAch && report.record > (achState.hwm[report.key] || 0)) {
      achState.hwm[report.key] = report.record;
      if (typeof achSave === 'function') achSave();
    }
    window._pendingPersonalBest = report;
  } catch (e) {
    console.error('[personal-best]', e);
  }
}

// The sentence under the trend line. Only an improvement is put into words;
// otherwise it names the average plainly.
function pbTrendCaption(r) {
  if (r.deltaPct === null) return '';
  var improved = r.trendHigher ? r.deltaPct >= 5 : r.deltaPct <= -5;
  if (improved) {
    var pct = Math.abs(r.deltaPct);
    return r.trendHigher
      ? 'Your ' + r.trendLabel + ' was ' + pct + '% above your recent average'
      : pct + '% fewer ' + r.trendLabel.replace(' per minute', '') + ' per minute than your recent average';
  }
  var avgText = r.trendIsTime ? pbFmtTime(r.avg) : r.avg.toFixed(1);
  return 'Recent average ' + r.trendLabel + ': ' + avgText;
}

function pbSparklineSvg(series, higherIsBetter) {
  var w = 220, h = 44, pad = 5;
  var min = Math.min.apply(null, series), max = Math.max.apply(null, series);
  var span = max - min || 1;
  var step = series.length > 1 ? (w - pad * 2) / (series.length - 1) : 0;
  var pts = series.map(function(v, i) {
    // Better is always drawn higher, so "up" reads as progress for every metric.
    var k = (v - min) / span;
    if (!higherIsBetter) k = 1 - k;
    return [pad + i * step, h - pad - k * (h - pad * 2)];
  });
  var line = pts.map(function(p) { return p[0].toFixed(1) + ',' + p[1].toFixed(1); }).join(' ');
  var last = pts[pts.length - 1];
  return '<svg class="pb-spark" viewBox="0 0 ' + w + ' ' + h + '" width="' + w + '" height="' + h + '" aria-hidden="true">'
    + '<polyline points="' + line + '" fill="none" stroke="rgba(142,204,224,.55)" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round"/>'
    + pts.slice(0, -1).map(function(p) { return '<circle cx="' + p[0].toFixed(1) + '" cy="' + p[1].toFixed(1) + '" r="2" fill="rgba(142,204,224,.6)"/>'; }).join('')
    + '<circle cx="' + last[0].toFixed(1) + '" cy="' + last[1].toFixed(1) + '" r="4" fill="#e8cd8e"/>'
    + '</svg>';
}

// HTML for the session-complete screen, or '' when there is nothing to say.
function pbBannerHtml(r) {
  if (!r) return '';
  var showBest = r.isNewBest && r.bestLabel;
  var caption = pbTrendCaption(r);
  if (!showBest && !r.series) return '';
  var html = '<div class="pb-banner' + (showBest ? ' pb-banner--record' : '') + '">';
  if (showBest) {
    html += '<div class="pb-kicker">✦ New personal best</div>'
      + '<div class="pb-record">' + r.bestLabel + ' · <b>' + pbFmtTime(r.best) + '</b>'
      + ' <span class="pb-was">was ' + pbFmtTime(r.prevBest) + '</span></div>';
  }
  if (r.series) {
    html += pbSparklineSvg(r.series, r.trendHigher)
      + '<div class="pb-caption">' + caption + '</div>';
  }
  return html + '</div>';
}
