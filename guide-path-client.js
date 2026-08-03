function loadGuideState() {
  try { var s = localStorage.getItem('presence_guide_v1'); return s ? JSON.parse(s) : {}; } catch(e) { return {}; }
}
function saveGuideState(st) {
  // Stamp a write time so the sync pull can prefer the freshest guide snapshot.
  // Guide state carries no progress score, so without this the pull comparator
  // treated every difference as a cloud win and silently reverted local
  // settings (e.g. an exercise's 1x/day frequency) on the next day's sync.
  try { if (st && typeof st === 'object') st._updatedAt = Date.now(); } catch(e) {}
  try { localStorage.setItem('presence_guide_v1', JSON.stringify(st)); } catch(e) {}
}
function markGuideCadenceChanged() {
  guideState._cadenceUpdatedAt = Date.now();
}

var guideState = loadGuideState(); // {[exerciseId]: selectedOption string}
// All Angles has been retired as an exercise. A user who added it to their
// path back when it was briefly addable would otherwise keep seeing a stale
// card for it forever — strip it once here so it self-heals on next save.
if (Array.isArray(guideState._pathAdded)) {
  guideState._pathAdded = guideState._pathAdded.filter(function(id) { return id !== 'allangles'; });
}
var guidePathMode = guideState._pathModeV2 || null;
var guideActiveTab = 'path';
var guidePendingPathMode = null;

var GUIDE_FOUNDATION_THOUGHT_ORDER = ['observation','focus','vacancy'];
var GUIDE_FOUNDATION_THOUGHT_LABELS = {
  observation:'Thought Observation',
  focus:'Thought Focus',
  vacancy:'Vacancy of Mind'
};
var GUIDE_FOUNDATION_THOUGHT_TIPS = {
  observation:'Watch thoughts arise and pass without entering them.',
  focus:'Choose one thought, word, or simple idea and hold only that.',
  vacancy:'Let the mind stay empty; tap at the first sign of content.'
};

// Senses, like Thought Control, trains through distinct sub-modes rather than
// one blended exercise — see SENSE_MODE_DEFS in senses-client.js for the full
// descriptions shown on the exercise screen itself.
var GUIDE_SENSE_ORDER = ['feeling','smell','taste'];
var GUIDE_SENSE_LABELS = { feeling:'Feeling', smell:'Smell', taste:'Taste' };
var GUIDE_SENSE_TIPS = {
  feeling:'Evoke a single physical sensation — warmth, weight, or texture — and hold it as if it were real.',
  smell:'Summon a scent from imagination alone and hold it steady until it dissolves, then call it back.',
  taste:'Bring a taste alive on the tongue with nothing in your mouth, and hold its full body.'
};

// Bardon-aligned sensory concentration is one sequential curriculum, not a
// "most neglected sense" rotation. Each foundation stage is mastered by one
// uninterrupted five-minute rep inside a longer practice session. Omnia keeps
// those sessions in a 10–20 minute training range by default. Session-duration
// preferences remain separate: a practitioner may sit longer, but neither a
// shorter custom target nor time accumulated across several broken reps can
// bypass the clean-hold gate.
var GUIDE_SENSORY_CLEAN_GOAL_SEC = 300;
var GUIDE_SENSORY_PRACTICE_MIN = 10;
var GUIDE_SENSORY_PRACTICE_MAX = 20;
// Every faculty is trained twice: first with the eyes closed, then holding the
// same impression against the visible world. Open eyes is the harder successor
// in each pair, so the two are separate stages rather than a preference.
// Legacy history carries no eyesMode for Auditory or the senses; those entries
// read as closed eyes (see guideSensoryStageMatches), which is what they were.
var GUIDE_SENSORY_STAGES = [
  { id:'visual_closed', exercise:'visual', name:'Visualization', label:'Closed Eyes', open:'visual', eyesMode:'closed' },
  { id:'visual_open', exercise:'visual', name:'Visualization', label:'Open Eyes', open:'visual', eyesMode:'open' },
  { id:'auditory_closed', exercise:'auditory', name:'Auditory', label:'Closed Eyes', open:'auditory', eyesMode:'closed' },
  { id:'auditory_open', exercise:'auditory', name:'Auditory', label:'Open Eyes', open:'auditory', eyesMode:'open' },
  { id:'feeling', exercise:'sense', name:'Senses', label:'Feeling · Closed Eyes', open:'sense', mode:'feeling', eyesMode:'closed' },
  { id:'feeling_open', exercise:'sense', name:'Senses', label:'Feeling · Open Eyes', open:'sense', mode:'feeling', eyesMode:'open' },
  { id:'smell', exercise:'sense', name:'Senses', label:'Smell · Closed Eyes', open:'sense', mode:'smell', eyesMode:'closed' },
  { id:'smell_open', exercise:'sense', name:'Senses', label:'Smell · Open Eyes', open:'sense', mode:'smell', eyesMode:'open' },
  { id:'taste', exercise:'sense', name:'Senses', label:'Taste · Closed Eyes', open:'sense', mode:'taste', eyesMode:'closed' },
  { id:'taste_open', exercise:'sense', name:'Senses', label:'Taste · Open Eyes', open:'sense', mode:'taste', eyesMode:'open' }
];

// Every item id that represents sensory work, whether it arrived through the
// curriculum, the experienced rotation, or the practitioner's own "+".
var GUIDE_SENSORY_ITEM_IDS = {
  visual:1, auditory:1, sense:1, feeling:1, smell:1, taste:1, multisense:1
};

function guideSensoryEntryCleanSec(entry) {
  if (!entry || !Object.prototype.hasOwnProperty.call(entry, 'cleanSeconds')) return 0;
  return Math.max(0, parseInt(entry.cleanSeconds, 10) || 0);
}

function guideSensoryEntryPracticeSec(entry) {
  if (!entry) return 0;
  return Math.max(0,
    parseInt(entry.sessionDurationSec, 10)
      || parseInt(entry.xpEarned, 10)
      || parseInt(entry.seconds, 10)
      || 0);
}

function guideSensoryStageMatches(stage, entry) {
  if (!stage || !entry) return false;
  if (stage.exercise === 'visual') {
    return entry.type === 'visualization' && entry.eyesMode === stage.eyesMode;
  }
  // Auditory and the senses only began recording eyesMode when open eyes
  // became a stage of its own. Entries without one were practiced closed, so
  // they keep counting toward the closed-eyes stage instead of matching
  // nothing and silently revoking a mastery the practitioner already earned.
  if (stage.exercise === 'auditory') {
    return entry.type === 'auditory' && (entry.eyesMode || 'closed') === stage.eyesMode;
  }
  return entry.exercise === 'sense'
    && (entry.mode || 'feeling') === stage.mode
    && (entry.eyesMode || 'closed') === stage.eyesMode;
}

function guideSensoryTrackProgress() {
  var history = (typeof concState !== 'undefined' && Array.isArray(concState.history)) ? concState.history : [];
  var stages = GUIDE_SENSORY_STAGES.map(function(def, index) {
    var bestCleanSec = 0, bestPracticeSec = 0, attempts = 0, halts = 0, qualifyingDates = [];
    var practiceSecs = [];
    history.forEach(function(entry) {
      if (!guideSensoryStageMatches(def, entry)) return;
      attempts++;
      halts += Math.max(0, parseInt(entry.halts, 10) || 0);
      var clean = guideSensoryEntryCleanSec(entry);
      var practice = guideSensoryEntryPracticeSec(entry);
      if (clean > bestCleanSec) bestCleanSec = clean;
      if (practice > bestPracticeSec) bestPracticeSec = practice;
      // Kept per attempt so lengthening the session can require attempts that
      // were themselves real sits — see guideSensoryPracticeMinutes.
      practiceSecs.push(practice);
      if (clean >= GUIDE_SENSORY_CLEAN_GOAL_SEC && entry.date) {
        qualifyingDates.push(entry.date);
      }
    });
    return Object.assign({}, def, {
      index:index,
      bestCleanSec:bestCleanSec,
      bestPracticeSec:bestPracticeSec,
      attempts:attempts,
      practiceSecs:practiceSecs,
      halts:halts,
      mastered:false,
      masteredAt:'',
      qualifyingDates:qualifyingDates
    });
  });
  // A stage is mastered on its own evidence: one clean five-minute hold in that
  // faculty, whenever it happened.
  //
  // These stages used to be chain-gated — a qualifying hold only counted if it
  // came after the preceding stage was mastered, so the first gap voided
  // everything behind it. That treats the order as a prerequisite chain, but
  // the faculties are not built on each other; they all rest on the same
  // capacity to hold attention clean. A practitioner sitting eleven clean
  // minutes in Feeling has demonstrated exactly what the five-minute gate asks
  // for, and voiding it because they had not first done Visualization said
  // their work did not count when plainly it did — and left the whole track
  // dead if they ever removed a foundation from their path.
  //
  // The order survives as a recommendation, not a gate: `current` below is
  // still the first unmastered stage in Bardon's sequence, so Omnia keeps
  // pointing at Visualization first for anyone who has not done it.
  stages.forEach(function(stage) {
    var earned = stage.qualifyingDates.slice().sort()[0];
    stage.mastered = !!earned;
    stage.masteredAt = earned || '';
    delete stage.qualifyingDates;
  });
  var currentIndex = stages.findIndex(function(stage) { return !stage.mastered; });
  var complete = currentIndex < 0;
  if (complete) currentIndex = stages.length;
  return {
    goalSec:GUIDE_SENSORY_CLEAN_GOAL_SEC,
    stages:stages,
    currentIndex:currentIndex,
    current:complete ? null : stages[currentIndex],
    completedCount:stages.filter(function(stage) { return stage.mastered; }).length,
    complete:complete,
    next:complete ? null : (stages[currentIndex + 1] || null)
  };
}

function guideSensoryStageForToday(progress) {
  if (!progress || progress.complete) return null;
  var today = guideLocalDayKey();
  var pin = guideState._sensoryDailyStageV1;
  var pinned = pin && pin.day === today
    ? progress.stages.find(function(stage) { return stage.id === pin.id; })
    : null;
  if (pinned) return pinned;
  guideState._sensoryDailyStageV1 = { day:today, id:progress.current.id };
  saveGuideState(guideState);
  return progress.current;
}

function guideMultiSenseSessionsToday() {
  var history = (typeof concState !== 'undefined' && Array.isArray(concState.history)) ? concState.history : [];
  return history.filter(function(entry) {
    return entry && entry.type === 'multi-sense' && guideIsToday(entry.date);
  }).length;
}

// How many attempts at this stage ran at least the given number of seconds.
function guideSensorySolidAttempts(stage, sec) {
  var list = (stage && stage.practiceSecs) || [];
  var n = 0;
  for (var i = 0; i < list.length; i++) if (list[i] >= sec) n++;
  return n;
}

function guideSensoryPracticeMinutes(stage) {
  // Lengthen the training sit independently of the clean-hold mastery gate.
  // A completed 10-minute sit moves the next recommendation to 15; a
  // completed 15-minute sit moves it to 20. Repeated attempts also progress
  // the range so an imperfect practitioner is never stuck at 10 — but each one
  // has to be a real sit (at least half the current range) to count. Counting
  // every attempt regardless of length meant a run of one-minute failures,
  // exactly what a struggling practitioner produces, pushed the session
  // recommendation up to twenty minutes precisely when it should hold steady.
  var minutes = GUIDE_SENSORY_PRACTICE_MIN;
  if (stage.bestPracticeSec >= 600 || guideSensorySolidAttempts(stage, 300) >= 3) minutes = 15;
  if (stage.bestPracticeSec >= 900 || guideSensorySolidAttempts(stage, 450) >= 10) minutes = GUIDE_SENSORY_PRACTICE_MAX;
  var preferenceId = stage.exercise === 'sense' ? stage.mode : stage.exercise;
  minutes = guideAdvancedTarget(preferenceId, minutes);
  return guideClamp(minutes, GUIDE_SENSORY_PRACTICE_MIN, GUIDE_FLOOR_CAP);
}

function guidePathEyesMode(exId, fallback) {
  var saved = guideState && guideState._pathEyesModes && guideState._pathEyesModes[exId];
  return saved === 'open' || saved === 'closed' ? saved : (fallback || 'closed');
}

function guideSensoryTrackItem(rounds) {
  rounds = rounds || 1;
  var progress = guideSensoryTrackProgress();
  if (progress.complete) {
    var multiToday = guideMultiSenseSessionsToday();
    return {
      id:'multisense',
      name:'Multi-Sense',
      duration:null,
      durationLabel:'Scene practice',
      done:multiToday >= rounds,
      todayCount:multiToday,
      rounds:rounds,
      progress:'sensory foundations complete',
      tip:'Combine sight, sound, touch, smell, and atmosphere only after mastering each foundation separately. Elemental work will follow in a later stage.',
      open:'multisense',
      sensoryTrack:true,
      trackComplete:true,
      trackStage:6,
      trackTotal:6,
      trackProgressSec:GUIDE_SENSORY_CLEAN_GOAL_SEC,
      trackGoalSec:GUIDE_SENSORY_CLEAN_GOAL_SEC,
      trackLabel:'Sensory foundations complete',
      trackGoal:'Multi-Sense unlocked',
      trackNext:'Next: elemental work (coming later)'
    };
  }

  var stage = guideSensoryStageForToday(progress);
  var naturalMin = guideSensoryPracticeMinutes(stage);
  var nextStage = progress.stages[stage.index + 1] || null;
  var nextLabel = nextStage
    ? nextStage.name + ' · ' + nextStage.label
    : 'Multi-Sense concentration';
  return {
    id:stage.exercise,
    name:stage.name,
    mode:stage.mode || null,
    // The curriculum stage decides the eyes, not a saved preference — the two
    // are separate stages now, so honoring a preference here would launch the
    // wrong one and the hold would count toward a stage already mastered.
    eyesMode:stage.eyesMode || null,
    duration:naturalMin,
    durationLabel:naturalMin + ' min' + (rounds > 1 ? ' x' + rounds : ''),
    done:stage.mastered,
    todayCount:0,
    progress:'best clean ' + guideFmtTime(stage.bestCleanSec) + ' / 5m',
    tip:'Practice this faculty for the full recommended session. The stage advances when one rep within that practice reaches an uninterrupted five-minute hold; changing the session time does not change that mastery goal.',
    open:stage.open,
    sensoryTrack:true,
    trackStage:stage.index + 1,
    trackTotal:GUIDE_SENSORY_STAGES.length,
    trackProgressSec:stage.bestCleanSec,
    trackGoalSec:GUIDE_SENSORY_CLEAN_GOAL_SEC,
    trackLabel:'Sensory concentration · Stage ' + (stage.index + 1) + ' of ' + GUIDE_SENSORY_STAGES.length,
    trackGoal:'Practice 10–20 min · mastery: one uninterrupted 5:00 hold',
    trackNext:'Next: ' + nextLabel
  };
}

// ── Practice Tree ─────────────────────────────────────────

// Soul Mirror star brightness — driven by inventory + transformation
// milestones rather than raw session count. Each benchmark raises a floor
// (Math.max), so the independent "build the mirror" and "transform traits"
// tracks both contribute and the star maxes at 20 once 20 negative traits
// have been transformed.
function soulMirrorStarBrightness() {
  var data;
  try { data = loadSoulMirror(); } catch(e) { return 0; }
  var neg = data.negative || [], pos = data.positive || [];
  var negDone = neg.filter(function(t){ return t.done; }).length;
  var mirrorComplete = neg.length >= SOUL_MIRROR_NEG_GOAL && pos.length >= SOUL_MIRROR_POS_GOAL;
  var practiced4 = neg.some(function(t){ return (t.sessions||0) >= 4; });
  var b = 0;
  if (mirrorComplete) b = Math.max(b, 2);   // 100 neg + 60 pos added
  if (practiced4)     b = Math.max(b, 4);   // a trait worked 4+ autosug sessions
  if (negDone >= 1)   b = Math.max(b, 6);   // first trait transformed
  if (negDone >= 3)   b = Math.max(b, 8);
  if (negDone >= 5)   b = Math.max(b, 11);
  if (negDone >= 8)   b = Math.max(b, 13);
  if (negDone >= 12)  b = Math.max(b, 16);
  if (negDone >= 15)  b = Math.max(b, 18);
  if (negDone >= 20)  b = Math.max(b, 20);  // fully lit
  return b;
}

function practiceTreeTierContribution(bestSec, thresholds) {
  var reached = thresholds.filter(function(sec) { return (bestSec || 0) >= sec; }).length;
  return reached / thresholds.length;
}

function practiceTreeDisplayBrightness(exId, brightness) {
  var max = exId === 'clock' ? 15 : 20;
  return Math.min(20, Math.max(0, (brightness || 0) / max * 20));
}

function practiceTreeNodeStats(exId, stats) {
  return exId === 'kether' ? {} : (stats[exId] || {});
}

function practiceTreeVisualizationBest(eyesMode) {
  var history = (typeof concState !== 'undefined' && concState.history) ? concState.history : [];
  return history.reduce(function(best, session) {
    if (!session || session.type !== 'visualization') return best;
    var sessionEyes = session.eyesMode === 'open' ? 'open' : 'closed';
    if (sessionEyes !== eyesMode) return best;
    if (Object.prototype.hasOwnProperty.call(session, 'cleanSeconds')) {
      return Math.max(best, Math.max(0, Number(session.cleanSeconds) || 0));
    }
    if (Array.isArray(session.visualReps) && session.visualReps.length) {
      return session.visualReps.reduce(function(repBest, rep) {
        var seconds = Math.max(0, Number(rep.seconds) || 0);
        var halts = Math.max(0, Number(rep.halts) || 0);
        return halts === 0 && seconds > repBest ? seconds : repBest;
      }, best);
    }
    var seconds = Math.max(0, Number(session.seconds) || 0);
    var halts = Math.max(0, Number(session.halts) || 0);
    return halts === 0 && seconds > best ? seconds : best;
  }, 0);
}

function visualizationStarBrightness() {
  var closedMinutes = Math.min(5, Math.floor(practiceTreeVisualizationBest('closed') / 60));
  var openMinutes = Math.min(5, Math.floor(practiceTreeVisualizationBest('open') / 60));
  return (closedMinutes + openMinutes) * 2;
}

function practiceTreeAuditoryBest(eyesMode) {
  var history = (typeof concState !== 'undefined' && concState.history) ? concState.history : [];
  return history.reduce(function(best, session) {
    if (!session || session.type !== 'auditory') return best;
    var sessionEyes = session.eyesMode === 'open' ? 'open' : 'closed';
    if (sessionEyes !== eyesMode) return best;
    if (Object.prototype.hasOwnProperty.call(session, 'cleanSeconds')) {
      return Math.max(best, Math.max(0, Number(session.cleanSeconds) || 0));
    }
    if (Array.isArray(session.auditoryReps) && session.auditoryReps.length) {
      return session.auditoryReps.reduce(function(repBest, rep) {
        var repEyes = rep.eyesMode === 'open' ? 'open' : sessionEyes;
        var seconds = Math.max(0, Number(rep.seconds) || 0);
        var halts = Math.max(0, Number(rep.halts) || 0);
        return repEyes === eyesMode && halts === 0 && seconds > repBest ? seconds : repBest;
      }, best);
    }
    var seconds = Math.max(0, Number(session.seconds) || 0);
    var halts = Math.max(0, Number(session.halts) || 0);
    return halts === 0 && seconds > best ? seconds : best;
  }, 0);
}

function auditoryStarBrightness() {
  var closedMinutes = Math.min(5, Math.floor(practiceTreeAuditoryBest('closed') / 60));
  var openMinutes = Math.min(5, Math.floor(practiceTreeAuditoryBest('open') / 60));
  return (closedMinutes + openMinutes) * 2;
}

function practiceTreeSenseBest(mode, eyesMode) {
  var history = (typeof concState !== 'undefined' && concState.history) ? concState.history : [];
  return history.reduce(function(best, session) {
    if (!session || session.exercise !== 'sense') return best;
    var reps = Array.isArray(session.senseReps) && session.senseReps.length
      ? session.senseReps
      : [{
          seconds:session.cleanSeconds != null ? session.cleanSeconds : session.seconds,
          mode:session.mode,
          eyesMode:session.eyesMode,
          halts:session.halts
        }];
    return reps.reduce(function(repBest, rep) {
      var repMode = rep.mode || session.mode || 'feeling';
      var repEyes = (rep.eyesMode || session.eyesMode) === 'open' ? 'open' : 'closed';
      var seconds = Math.max(0, Number(rep.seconds) || 0);
      var halts = Math.max(0, Number(rep.halts) || 0);
      return repMode === mode && repEyes === eyesMode && halts === 0 && seconds > repBest
        ? seconds
        : repBest;
    }, best);
  }, 0);
}

function sensesStarMasteryCount(eyesMode) {
  var modes = ['feeling', 'smell', 'taste'];
  var eyes = eyesMode ? [eyesMode] : ['closed', 'open'];
  return modes.reduce(function(total, mode) {
    return total + eyes.filter(function(modeEyes) {
      return practiceTreeSenseBest(mode, modeEyes) >= 300;
    }).length;
  }, 0);
}

function sensesStarMinuteCount(eyesMode) {
  var modes = ['feeling', 'smell', 'taste'];
  var eyes = eyesMode ? [eyesMode] : ['closed', 'open'];
  return modes.reduce(function(total, mode) {
    return total + eyes.reduce(function(eyeTotal, modeEyes) {
      return eyeTotal + Math.min(5, Math.floor(practiceTreeSenseBest(mode, modeEyes) / 60));
    }, 0);
  }, 0);
}

function sensesStarBrightness() {
  // Thirty equal milestones: minutes 1–5 for Feeling, Smell, and Taste,
  // first with Closed Eyes and then with Open Eyes.
  return Math.round(sensesStarMinuteCount() / 30 * 200) / 10;
}

function thoughtControlStarBrightness(stats) {
  var modes = ['observation', 'focus', 'vacancy'];
  var score = modes.reduce(function(total, mode) {
    return total + practiceTreeTierContribution((stats[mode] || {}).bestSec, [600, 750, 900]);
  }, 0);
  return Math.round(score / modes.length * 200) / 10;
}

function awarenessStarBrightness() {
  var awarenessState = (typeof state !== 'undefined' && state) ? state : {};
  var level = Math.max(1, Number(awarenessState.level) || 1);
  return Math.min(20, Math.round((level - 1) / 99 * 200) / 10);
}

function practiceTreeAwarenessStats() {
  var awarenessState = (typeof state !== 'undefined' && state) ? state : {};
  var history = Array.isArray(awarenessState.history) ? awarenessState.history : [];
  var lastMs = history.reduce(function(latest, session) {
    var ms = session && session.date ? new Date(session.date).getTime() : 0;
    return ms > latest ? ms : latest;
  }, 0);
  if (!lastMs && awarenessState.lastSessionDate) {
    lastMs = new Date(awarenessState.lastSessionDate).getTime() || 0;
  }
  var bestSec = history.reduce(function(best, session) {
    return Math.max(best, Math.max(0, Number(session && session.durationMin) || 0) * 60);
  }, 0);
  return {
    count:Math.max(history.length, Math.max(0, Number(awarenessState.totalSessions) || 0)),
    bestSec:bestSec,
    lastMs:lastMs,
    level:Math.max(1, Number(awarenessState.level) || 1)
  };
}

function practiceTreeNodeBrightness(exId, stats) {
  var st = stats[exId] || { bestSec:0, count:0 };
  if (exId === 'clock') return Math.min(15, Math.floor((st.bestSec||0)/60));
  if (exId === 'thought') return thoughtControlStarBrightness(stats);
  if (exId === 'awareness') return awarenessStarBrightness();
  if (exId === 'asana') return Math.min(20, Math.floor((st.bestSec||0)/90));
  if (exId === 'soulmirror') return soulMirrorStarBrightness();
  if (exId === 'pore') {
    // Independent of Soul Mirror: maxes at 10,000 lifetime breaths (500/level).
    var breaths = (typeof concState !== 'undefined' && concState.lifetimeBreaths) ? concState.lifetimeBreaths : 0;
    return Math.min(20, Math.floor(breaths / 500));
  }
  if (exId === 'visual') return visualizationStarBrightness();
  if (exId === 'auditory') return auditoryStarBrightness();
  if (exId === 'sense') return sensesStarBrightness();
  if (exId === 'kether') {
    // Fundamentals Mastery has nine equal branches. Thought Control combines
    // Observation, Focus, and Vacancy; Awareness brightens continuously
    // through level 100.
    // Visualization and Auditory contribute at every clean minute from one
    // through five for each eye mode. Senses divides the same five-minute
    // progression across Feeling, Smell, and Taste in both eye modes.
    var contributions = [
      practiceTreeTierContribution((stats.clock || {}).bestSec, [300, 600, 900]),
      practiceTreeNodeBrightness('thought', stats) / 20,
      practiceTreeNodeBrightness('awareness', stats) / 20,
      practiceTreeNodeBrightness('visual', stats) / 20,
      practiceTreeNodeBrightness('auditory', stats) / 20,
      practiceTreeNodeBrightness('sense', stats) / 20,
      practiceTreeTierContribution((stats.asana || {}).bestSec, [600, 1200, 1500, 1800]),
      practiceTreeNodeBrightness('soulmirror', stats) >= 10 ? 1 : 0,
      practiceTreeNodeBrightness('pore', stats) >= 10 ? 1 : 0
    ];
    var score = contributions.reduce(function(total, value) { return total + value; }, 0);
    return Math.min(20, Math.round(score / contributions.length * 200) / 10);
  }
  return 0;
}

// Recency is an early-practice encouragement, not a permanent maintenance
// obligation. Once a node reaches the same first-mastery gate used by
// Achievements, its aura stays settled at full strength.
function practiceTreeNodeFirstMasteryMet(exId, stats) {
  if (exId === 'kether') return false;
  if (exId === 'thought') {
    return ['observation', 'focus', 'vacancy'].every(function(mode) {
      if (typeof achTCBest === 'function') return achTCBest(mode) >= 600;
      return ((stats[mode] || {}).bestSec || 0) >= 600;
    });
  }
  if (exId === 'awareness') return ((typeof state !== 'undefined' && state) ? state.level : 1) >= 25;
  if (exId === 'sense') return sensesStarMasteryCount('closed') >= 3;

  var achievementName = {
    clock:'Clock',
    visual:'Visualization',
    auditory:'Auditory',
    asana:'Asana',
    soulmirror:'Soul Mirror',
    pore:'Pore Breathing'
  }[exId];
  if (!achievementName || typeof ACH_MASTERY_DEFS !== 'function') return false;
  var mastery = ACH_MASTERY_DEFS().find(function(def) { return def.ex === achievementName; });
  return !!(mastery && mastery.m);
}

// Most recent pore_breathing session timestamp (history is newest-first).
function poreLastSessionMs() {
  var h = (typeof concState !== 'undefined' && concState.history) ? concState.history : [];
  for (var i = 0; i < h.length; i++) {
    if (h[i] && h[i].exercise === 'pore_breathing' && h[i].date) return new Date(h[i].date).getTime();
  }
  return 0;
}

function practiceTreeNodeRecency(exId, stats) {
  var ms;
  if (exId === 'kether') return 0.15;
  if (practiceTreeNodeFirstMasteryMet(exId, stats)) return 1.0;
  if (exId === 'pore') ms = poreLastSessionMs();
  else ms = (stats[exId] || {}).lastMs || 0;
  if (!ms) return 0.15;
  var days = (Date.now() - ms) / 86400000;
  if (days <= 7) return 1.0;
  if (days >= 60) return 0.2;
  return 1.0 - (days - 7) / 53 * 0.8;
}

function practiceTreeNodeDepth(exId, stats) {
  if (exId === 'pore') {
    // Ring layers grow with lifetime breaths: 2,500 / 5,000 / 7,500.
    var breaths = (typeof concState !== 'undefined' && concState.lifetimeBreaths) ? concState.lifetimeBreaths : 0;
    return Math.min(3, Math.floor(breaths / 2500));
  }
  return Math.min(3, Math.floor(((stats[exId] || {}).count||0) / 10));
}

function renderPracticeTree() {
  var el = document.getElementById('guideTreeSVGWrap');
  if (!el) return;

  var stats = guideExerciseStats();
  // Thought Control uses the aggregate for depth/recency and the per-mode
  // records for its combined brightness and mastery.
  var _tStats = guideThoughtStats();
  ['observation','focus','vacancy'].forEach(function(m) { stats[m] = _tStats[m] || { count:0, bestSec:0, lastMs:0 }; });
  stats.awareness = practiceTreeAwarenessStats();

  var NODES = [
    { id:'kether',    ex:'kether',      cx:170, cy:48,  color:'#c8a848', lc:'#f8f0cc', label:'FUNDAMENTALS', label2:'MASTERY', fs:5.5, gf:'pt-gf-gold' },
    { id:'chokmah',   ex:'visual',      cx:242, cy:115, color:'#6e9fd4', lc:'#c4dff8', label:'VISUALIZATION', fs:6.5, gf:'pt-gf-blue' },
    { id:'binah',     ex:'thought',     cx:98,  cy:115, color:'#7898b8', lc:'#ccdaec', label:'THOUGHT', label2:'CONTROL', fs:5.7, gf:'pt-gf-purple' },
    { id:'chesed',    ex:'auditory',    cx:242, cy:190, color:'#6eb8a4', lc:'#c4ece4', label:'AUDITORY',      fs:6.5, gf:'pt-gf-teal-sm' },
    { id:'geburah',   ex:'sense',       cx:98,  cy:190, color:'#cf8fb0', lc:'#f0c6da', label:'SENSES',        fs:7,   gf:'pt-gf-rose' },
    { id:'tiphareth', ex:'awareness',   cx:170, cy:260, color:'#7eb8a4', lc:'#c4ece4', label:'AWARENESS',     fs:7,   gf:'pt-gf-teal' },
    { id:'netzach',   ex:'pore',        cx:242, cy:340, color:'#a47eb8', lc:'#e4d0f4', label:'PORE BREATH',   fs:6.5, gf:'pt-gf-blue' },
    { id:'hod',       ex:'soulmirror',  cx:98,  cy:340, color:'#a47eb8', lc:'#e4d0f4', label:'SOUL MIRROR',   fs:6.5, gf:'pt-gf-purple' },
    { id:'yesod',     ex:'asana',       cx:170, cy:400, color:'#c47878', lc:'#f4d0d0', label:'ASANA',         fs:7,   gf:'pt-gf-rose' },
    { id:'malkuth',   ex:'clock',       cx:170, cy:490, color:'#d4956e', lc:'#f8dcc0', label:'CLOCK',         fs:7.5, gf:'pt-gf-teal' }
  ];

  var bMap = {};
  NODES.forEach(function(n) { bMap[n.id] = practiceTreeNodeBrightness(n.ex, stats); });

  function pathLine(x1, y1, x2, y2, stroke, srcId) {
    var b = bMap[srcId] || 0;
    var op = Math.max(0.06, Math.min(0.45, 0.07 + b * 0.022));
    var sw = (0.7 + b * 0.04).toFixed(1);
    var dash = b > 2 ? '' : ' stroke-dasharray="3 3"';
    return '<line x1="'+x1+'" y1="'+y1+'" x2="'+x2+'" y2="'+y2+'" stroke="'+stroke+'" stroke-width="'+sw+'" stroke-opacity="'+op.toFixed(3)+'"'+dash+'/>';
  }

  function nodeCircles(n) {
    var b = bMap[n.id];
    var displayB = practiceTreeDisplayBrightness(n.ex, b);
    var rec = practiceTreeNodeRecency(n.ex, stats);
    var dep = practiceTreeNodeDepth(n.ex, stats);
    // Increased minimum sizes/opacities so all nodes are visible even at brightness 0
    var starR = Math.max(3.5, 3 + displayB * 0.55);
    var auraR = (starR * (1.3 + rec * 0.5)).toFixed(1);
    var coronaR = (starR * 4.2).toFixed(1);
    var coreR = Math.max(1.5, starR * 0.38).toFixed(1);
    var coronaOp = Math.min(0.14, 0.04 + displayB * 0.005).toFixed(3);
    var auraOp = (0.07 + rec * 0.1).toFixed(3);
    var starOp = Math.min(0.97, 0.32 + displayB * 0.04).toFixed(3);
    var coreOp = displayB > 4 ? '1' : displayB > 1 ? '0.6' : '0.25';
    var labelY = (n.cy - starR - 5).toFixed(1);
    var labelOp = displayB > 5 ? '1' : displayB > 2 ? '0.9' : '0.78';

    var rings = '';
    for (var r = 1; r <= dep; r++) {
      var rr = (starR * (1.9 + r * 0.8)).toFixed(1);
      var rop = (0.14 - r * 0.02).toFixed(3);
      rings += '<circle cx="'+n.cx+'" cy="'+n.cy+'" r="'+rr+'" fill="none" stroke="'+n.color+'" stroke-width=".6" stroke-opacity="'+rop+'" stroke-dasharray="2 2"/>';
    }

    var pulse = '';
    if (rec > 0.5 && b > 0) {
      var pr = (starR * 3.2).toFixed(1);
      var pr0 = (starR * 1.8).toFixed(1);
      pulse = '<circle cx="'+n.cx+'" cy="'+n.cy+'" r="'+pr+'" fill="'+n.color+'">'
        + '<animate attributeName="r" values="'+pr0+';'+pr+';'+pr0+'" dur="5s" repeatCount="indefinite"/>'
        + '<animate attributeName="opacity" values=".08;0;.08" dur="5s" repeatCount="indefinite"/>'
        + '</circle>';
    }

    var tapR = Math.max(starR * 2.5, 16).toFixed(1);
    return '<circle cx="'+n.cx+'" cy="'+n.cy+'" r="'+coronaR+'" fill="'+n.color+'" opacity="'+coronaOp+'"/>'
      + rings
      + '<circle cx="'+n.cx+'" cy="'+n.cy+'" r="'+auraR+'" fill="'+n.lc+'" opacity="'+auraOp+'" filter="url(#'+n.gf+')"/>'
      + pulse
      + '<circle cx="'+n.cx+'" cy="'+n.cy+'" r="'+(starR.toFixed(1))+'" fill="'+n.lc+'" opacity="'+starOp+'" filter="url(#'+n.gf+')"/>'
      + '<circle cx="'+n.cx+'" cy="'+n.cy+'" r="'+coreR+'" fill="#ffffff" opacity="'+coreOp+'"/>'
      + (n.label2
        ? '<text x="'+n.cx+'" y="'+(parseFloat(labelY)-6).toFixed(1)+'" text-anchor="middle" font-family="DM Mono,monospace" font-size="'+n.fs+'" letter-spacing=".12em" fill="'+n.lc+'" paint-order="stroke fill" stroke="rgba(5,8,15,.88)" stroke-width="2.8" stroke-linejoin="round" opacity="'+labelOp+'">'+n.label+'</text>'
          +'<text x="'+n.cx+'" y="'+labelY+'" text-anchor="middle" font-family="DM Mono,monospace" font-size="'+n.fs+'" letter-spacing=".12em" fill="'+n.lc+'" paint-order="stroke fill" stroke="rgba(5,8,15,.88)" stroke-width="2.8" stroke-linejoin="round" opacity="'+labelOp+'">'+n.label2+'</text>'
        : '<text x="'+n.cx+'" y="'+labelY+'" text-anchor="middle" font-family="DM Mono,monospace" font-size="'+n.fs+'" letter-spacing=".12em" fill="'+n.lc+'" paint-order="stroke fill" stroke="rgba(5,8,15,.88)" stroke-width="2.8" stroke-linejoin="round" opacity="'+labelOp+'">'+n.label+'</text>'
      )
      + '<circle cx="'+n.cx+'" cy="'+n.cy+'" r="'+tapR+'" fill="transparent" data-node="'+n.id+'" class="ptree-tap-area" style="cursor:pointer;"/>';
  }

  var bgStars = '<g opacity=".28"><circle cx="18" cy="62" r=".6" fill="#e8e4dc"/><circle cx="305" cy="88" r=".5" fill="#e8e4dc"/><circle cx="28" cy="200" r=".7" fill="#e8e4dc"/><circle cx="316" cy="220" r=".5" fill="#e8e4dc"/><circle cx="12" cy="360" r=".6" fill="#e8e4dc"/><circle cx="328" cy="380" r=".5" fill="#e8e4dc"/><circle cx="62" cy="490" r=".4" fill="#e8e4dc"/><circle cx="278" cy="500" r=".6" fill="#e8e4dc"/><circle cx="44" cy="130" r=".5" fill="#e8e4dc"/><circle cx="298" cy="145" r=".4" fill="#e8e4dc"/><circle cx="170" cy="22" r=".5" fill="#e8e4dc"/><circle cx="90" cy="46" r=".4" fill="#e8e4dc"/><circle cx="250" cy="38" r=".5" fill="#e8e4dc"/></g>';

  var paths = [
    pathLine(170,490,170,400,'#8ecce0','malkuth'),
    pathLine(170,400,98,340,'#8ecce0','yesod'),
    pathLine(170,400,242,340,'#8ecce0','yesod'),
    pathLine(98,340,170,260,'#8ecce0','hod'),
    pathLine(242,340,170,260,'#8ecce0','netzach'),
    pathLine(170,260,98,190,'#98b4cc','tiphareth'),
    pathLine(170,260,242,190,'#8ecce0','tiphareth'),
    pathLine(98,190,98,115,'#98b4cc','geburah'),
    pathLine(242,190,242,115,'#8ab8e0','chesed'),
    pathLine(98,115,170,48,'#c4a8d4','binah'),
    pathLine(242,115,170,48,'#8ab8e0','chokmah'),
    '<line x1="98" y1="340" x2="242" y2="340" stroke="rgba(255,255,255,.055)" stroke-width=".6" stroke-dasharray="2 4"/>',
    '<line x1="98" y1="190" x2="242" y2="190" stroke="rgba(255,255,255,.045)" stroke-width=".5" stroke-dasharray="2 4"/>',
    '<line x1="98" y1="115" x2="242" y2="115" stroke="rgba(255,255,255,.035)" stroke-width=".5" stroke-dasharray="2 4"/>'
  ].join('');

  var nodesStr = NODES.map(nodeCircles).join('');

  var svg = '<svg class="ptree-svg" viewBox="0 0 340 540" xmlns="http://www.w3.org/2000/svg">'
    + '<defs>'
    + '<radialGradient id="pt-neb1" cx="50%" cy="48%" r="42%"><stop offset="0%" stop-color="#8ecce0" stop-opacity=".04"/><stop offset="100%" stop-color="#8ecce0" stop-opacity="0"/></radialGradient>'
    + '<radialGradient id="pt-neb2" cx="50%" cy="80%" r="30%"><stop offset="0%" stop-color="#d4b08e" stop-opacity=".03"/><stop offset="100%" stop-color="#d4b08e" stop-opacity="0"/></radialGradient>'
    + '<radialGradient id="pt-neb3" cx="50%" cy="12%" r="28%"><stop offset="0%" stop-color="#c4a8d4" stop-opacity=".04"/><stop offset="100%" stop-color="#c4a8d4" stop-opacity="0"/></radialGradient>'
    + '<filter id="pt-gf-teal" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>'
    + '<filter id="pt-gf-teal-sm" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur stdDeviation="3.5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>'
    + '<filter id="pt-gf-gold" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur stdDeviation="4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>'
    + '<filter id="pt-gf-purple" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur stdDeviation="3.5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>'
    + '<filter id="pt-gf-rose" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>'
    + '<filter id="pt-gf-blue" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>'
    + '</defs>'
    + '<rect x="0" y="0" width="340" height="540" fill="url(#pt-neb1)"/>'
    + '<rect x="0" y="0" width="340" height="540" fill="url(#pt-neb2)"/>'
    + '<rect x="0" y="0" width="340" height="540" fill="url(#pt-neb3)"/>'
    + bgStars
    + paths
    + nodesStr
    + '</svg>';

  el.innerHTML = svg;

  // Node info data
  var nameMap = {
    kether:'Fundamentals Mastery', chokmah:'Visualization', binah:'Thought Control',
    chesed:'Auditory', geburah:'Senses', tiphareth:'Awareness',
    netzach:'Pore Breathing', hod:'Soul Mirror', yesod:'Asana', malkuth:'Clock'
  };
  var descMap = {
    kether:'Lights up as all exercises approach mastery.',
    chokmah:'Hold a mental image clearly for five minutes without halting.',
    binah:'Observation, Focus, and Vacancy brighten this star together.',
    chesed:'Concentrated listening on a single sound.',
    geburah:'Master feeling, smell, and taste with both closed and open eyes.',
    tiphareth:'Return to the present throughout daily life and formal sessions.',
    netzach:'Breathing through every pore of the body simultaneously.',
    hod:'Honest daily reflection on traits and patterns.',
    yesod:'Seated stillness — no movement for the full duration.',
    malkuth:'Follow the seconds hand without losing awareness.'
  };
  var maxMap = { malkuth:15 };

  var sheet = document.getElementById('ptreeSheet');
  var sheetBackdrop = document.getElementById('ptreeSheetBackdrop');
  var sheetName = document.getElementById('ptreeSheetName');
  var sheetSub = document.getElementById('ptreeSheetSub');
  var sheetBar = document.getElementById('ptreeSheetBar');
  var sheetStat = document.getElementById('ptreeSheetStat');
  var sheetClose = document.getElementById('ptreeSheetClose');
  var sheetBegin = document.getElementById('ptreeSheetBegin');

  function closePtreeSheet() {
    if (sheet) { sheet.style.transition = ''; sheet.style.transform = ''; sheet.classList.remove('open'); sheet.__openNode = null; }
    if (sheetBackdrop) sheetBackdrop.classList.remove('open');
  }

  // One-time setup: relocate the sheet + backdrop to <body> so they aren't
  // positioned relative to #guidePanel (which gets a transform applied,
  // breaking position:fixed) and bind the persistent gesture handlers.
  if (sheet && !sheet.__ptreeBound) {
    sheet.__ptreeBound = true;
    if (sheetBackdrop && sheetBackdrop.parentNode !== document.body) document.body.appendChild(sheetBackdrop);
    if (sheet.parentNode !== document.body) document.body.appendChild(sheet);

    if (sheetBackdrop) sheetBackdrop.addEventListener('click', closePtreeSheet);
    if (sheetClose) sheetClose.addEventListener('click', closePtreeSheet);

    // Swipe-down-to-dismiss — only the sheet moves; preventDefault stops the
    // page/panel behind it from scrolling along with the drag.
    var _swY = null, _swTracking = false, _swLastY = null, _swLastT = null, _swVel = 0;
    sheet.addEventListener('touchstart', function(e) {
      if (sheet.scrollTop > 4) { _swTracking = false; return; }
      _swY = e.touches[0].clientY; _swLastY = _swY; _swLastT = Date.now();
      _swTracking = true; _swVel = 0;
      sheet.style.transition = 'none';
    }, {passive: true});
    sheet.addEventListener('touchmove', function(e) {
      if (!_swTracking) return;
      var y = e.touches[0].clientY;
      var dy = y - _swY;
      if (dy <= 0) { sheet.style.transform = ''; return; } // upward → allow normal scroll
      if (e.cancelable) e.preventDefault();
      var now = Date.now(); var dt = Math.max(1, now - _swLastT);
      _swVel = (_swVel * 0.6) + ((y - _swLastY) / dt * 1000 * 0.4);
      _swLastY = y; _swLastT = now;
      sheet.style.transform = 'translateY(' + dy + 'px)';
    }, {passive: false});
    sheet.addEventListener('touchend', function(e) {
      if (!_swTracking) return;
      _swTracking = false;
      sheet.style.transition = '';
      var dy = Math.max(0, e.changedTouches[0].clientY - _swY);
      if (dy > 80 || _swVel > 500) { closePtreeSheet(); }
      else { sheet.style.transform = ''; }
    }, {passive: true});

    // Begin Practice button — reads the currently-open node's exercise,
    // stored on the element so this one-time handler stays in sync.
    if (sheetBegin) {
      sheetBegin.addEventListener('click', function() {
        var ex = sheet.__currentEx;
        if (!ex) return;
        closePtreeSheet();
        setTimeout(function() {
          if (ex === 'soulmirror') {
            if (typeof _smOriginMode !== 'undefined') _smOriginMode = 'guide';
            showScreen('soulMirrorScreen');
            if (window.soulMirrorInit) window.soulMirrorInit();
          } else if (ex === 'pore') {
            if (typeof _smOriginMode !== 'undefined') _smOriginMode = 'guide';
            showScreen('soulMirrorScreen');
            if (window.soulMirrorInit) window.soulMirrorInit();
            setTimeout(function() {
              var pbTab = document.querySelector('#soulMirrorTabs [data-tab="breathing"]');
              if (pbTab) pbTab.click();
            }, 320);
          } else if (ex === 'awareness') {
            showScreen('homeScreen');
            switchMode('awareness');
          } else if (ex && ex !== 'kether') {
            openExerciseSetup(ex);
          }
        }, 320);
      });
    }
  }

  el.querySelectorAll('.ptree-tap-area').forEach(function(area) {
    area.addEventListener('click', function() {
      var nodeId = area.dataset.node;
      if (sheet && sheet.__openNode === nodeId) { closePtreeSheet(); return; }
      var node = NODES.find(function(n) { return n.id === nodeId; });
      if (!node || !sheet) return;
      sheet.__openNode = nodeId;
      sheet.__currentEx = node.ex;
      var b = bMap[nodeId];
      var max = maxMap[nodeId] || 20;
      var dep = practiceTreeNodeDepth(node.ex, stats);
      var rec = practiceTreeNodeRecency(node.ex, stats);
      var isPore = (node.ex === 'pore');
      var isMirror = (node.ex === 'soulmirror');
      var isThought = (node.ex === 'thought');
      var isAwareness = (node.ex === 'awareness');
      var isVisual = (node.ex === 'visual');
      var isAuditory = (node.ex === 'auditory');
      var isSense = (node.ex === 'sense');
      var poreBreaths = isPore ? ((typeof concState !== 'undefined' && concState.lifetimeBreaths) ? concState.lifetimeBreaths : 0) : 0;
      var st = practiceTreeNodeStats(node.ex, stats);
      var sessions = st.count || 0;
      var bestSec = st.bestSec || 0;
      var recencyStr = rec >= 0.99 ? 'this week'
        : rec <= 0.21 ? '60+ days ago'
        : Math.round((1 - rec) / 0.8 * 53 + 7) + ' days ago';

      sheet.style.setProperty('--ptree-accent', node.color);
      sheetName.textContent = nameMap[nodeId] || node.label;
      if (sheetSub) sheetSub.textContent = descMap[nodeId] || '';
      if (sheetBar) {
        // The sheet reuses one bar for every star. Set the selected value
        // without transition while the sheet is still closed so a prior
        // star's width can never flash and animate down during opening.
        sheetBar.style.transition = 'none';
        sheetBar.style.width = Math.round(b / max * 100) + '%';
        sheetBar.style.background = node.color;
        void sheetBar.offsetWidth;
        sheetBar.style.transition = '';
      }

      var statLines = [];
      statLines.push('<strong>Brightness</strong> ' + b + ' / ' + max);
      if (isPore) {
        statLines.push('<strong>Breaths</strong> ' + poreBreaths.toLocaleString() + ' / 10,000' + (dep > 0 ? ' · ' + dep + ' depth ring' + (dep > 1 ? 's' : '') : ''));
        if (poreBreaths > 0) statLines.push('<strong>Last practiced</strong> ' + recencyStr);
      } else if (isMirror) {
        var _sm; try { _sm = loadSoulMirror(); } catch(e) { _sm = { positive:[], negative:[] }; }
        var _neg = _sm.negative || [], _pos = _sm.positive || [];
        var _negDone = _neg.filter(function(t){ return t.done; }).length;
        var _inProg = _neg.filter(function(t){ return !t.done && (t.sessions||0) > 0; }).length;
        var _mc = _neg.length >= SOUL_MIRROR_NEG_GOAL && _pos.length >= SOUL_MIRROR_POS_GOAL;
        statLines.push('<strong>Inventory</strong> ' + (_mc ? '✓ complete' : (_neg.length + ' / 100 neg · ' + _pos.length + ' / 60 pos')));
        statLines.push('<strong>Transformed</strong> ' + _negDone + ' / 20 trait' + (_negDone === 1 ? '' : 's'));
        if (_inProg > 0) statLines.push('<strong>In progress</strong> ' + _inProg + ' trait' + (_inProg === 1 ? '' : 's'));
      } else if (isThought) {
        statLines.push('<strong>Observation</strong> ' + guideFmtTime((stats.observation || {}).bestSec || 0));
        statLines.push('<strong>Focus</strong> ' + guideFmtTime((stats.focus || {}).bestSec || 0));
        statLines.push('<strong>Vacancy</strong> ' + guideFmtTime((stats.vacancy || {}).bestSec || 0));
        statLines.push('<strong>Sessions</strong> ' + sessions + (dep > 0 ? ' · ' + dep + ' depth ring' + (dep > 1 ? 's' : '') : ''));
        if (sessions > 0) statLines.push('<strong>Last practiced</strong> ' + recencyStr);
      } else if (isAwareness) {
        statLines.push('<strong>Level</strong> ' + (st.level || 1) + ' · full brightness at 100');
        statLines.push('<strong>Sessions</strong> ' + sessions + (dep > 0 ? ' · ' + dep + ' depth ring' + (dep > 1 ? 's' : '') : ''));
        if (sessions > 0) statLines.push('<strong>Last practiced</strong> ' + recencyStr);
      } else if (isVisual) {
        statLines.push('<strong>Closed Eyes</strong> ' + guideFmtTime(practiceTreeVisualizationBest('closed')) + ' / 5m');
        statLines.push('<strong>Open Eyes</strong> ' + guideFmtTime(practiceTreeVisualizationBest('open')) + ' / 5m');
        statLines.push('<strong>Sessions</strong> ' + sessions + (dep > 0 ? ' · ' + dep + ' depth ring' + (dep > 1 ? 's' : '') : ''));
        if (sessions > 0) statLines.push('<strong>Last practiced</strong> ' + recencyStr);
      } else if (isAuditory) {
        statLines.push('<strong>Closed Eyes</strong> ' + guideFmtTime(practiceTreeAuditoryBest('closed')) + ' / 5m');
        statLines.push('<strong>Open Eyes</strong> ' + guideFmtTime(practiceTreeAuditoryBest('open')) + ' / 5m');
        statLines.push('<strong>Sessions</strong> ' + sessions + (dep > 0 ? ' · ' + dep + ' depth ring' + (dep > 1 ? 's' : '') : ''));
        if (sessions > 0) statLines.push('<strong>Last practiced</strong> ' + recencyStr);
      } else if (isSense) {
        ['feeling', 'smell', 'taste'].forEach(function(mode) {
          var label = mode.charAt(0).toUpperCase() + mode.slice(1);
          statLines.push('<strong>' + label + '</strong> Closed '
            + guideFmtTime(practiceTreeSenseBest(mode, 'closed')) + ' · Open '
            + guideFmtTime(practiceTreeSenseBest(mode, 'open')));
        });
        statLines.push('<strong>Sessions</strong> ' + sessions + (dep > 0 ? ' · ' + dep + ' depth ring' + (dep > 1 ? 's' : '') : ''));
        if (sessions > 0) statLines.push('<strong>Last practiced</strong> ' + recencyStr);
      } else {
        statLines.push('<strong>Sessions</strong> ' + sessions + (dep > 0 ? ' · ' + dep + ' depth ring' + (dep > 1 ? 's' : '') : ''));
        if (bestSec > 0) statLines.push('<strong>Best hold</strong> ' + (bestSec >= 60 ? Math.floor(bestSec/60) + 'm ' + (bestSec%60) + 's' : bestSec + 's'));
        if (sessions > 0) statLines.push('<strong>Last practiced</strong> ' + recencyStr);
      }
      sheetStat.innerHTML = statLines.join('<br>');

      // Show Begin button for all practisable nodes (not kether which is a mastery summary)
      if (sheetBegin) sheetBegin.style.display = (node.ex === 'kether') ? 'none' : 'block';

      sheet.scrollTop = 0;
      sheet.classList.add('open');
      sheetBackdrop.classList.add('open');
    });
  });

  // Close sheet when tapping SVG background
  el.querySelector('.ptree-svg').addEventListener('click', function(e) {
    if (!e.target.classList.contains('ptree-tap-area')) closePtreeSheet();
  });
}

function refreshGuidePanelLayout(resetScroll) {
  var gp = document.getElementById('guidePanel');
  if (!gp) return;
  gp.style.flex = '1 1 auto';
  gp.style.height = '';
  var home = document.getElementById('homeScreen');
  if (home && home.style.display !== 'none' && window.innerWidth >= 700) {
    var homeRect = home.getBoundingClientRect();
    var panelRect = gp.getBoundingClientRect();
    var homeStyle = window.getComputedStyle ? window.getComputedStyle(home) : null;
    var padBottom = homeStyle ? (parseFloat(homeStyle.paddingBottom) || 0) : 0;
    var available = Math.floor(homeRect.bottom - panelRect.top - padBottom);
    if (available > 180) gp.style.height = available + 'px';
  }
  document.body.classList.add('guide-layout-refresh');
  void gp.offsetHeight;
  if (resetScroll) gp.scrollTop = 0;
  requestAnimationFrame(function() {
    void gp.offsetHeight;
    if (resetScroll) gp.scrollTop = 0;
    requestAnimationFrame(function() {
      document.body.classList.remove('guide-layout-refresh');
    });
  });
  setTimeout(function() {
    void gp.offsetHeight;
  }, 120);
}

function isStandalonePresenceApp() {
  return window.navigator.standalone === true
    || (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches);
}

function refreshGuidePathIfActive(resetScroll) {
  if (typeof currentMode === 'undefined' || typeof guideActiveTab === 'undefined') return;
  if (currentMode !== 'guide') return;
  if (guideActiveTab !== 'path') return;
  if (typeof renderPathQuests === 'function') renderPathQuests();
  refreshGuidePanelLayout(resetScroll);
}

var guidePathLayoutTimers = [];
function scheduleGuidePathLayoutRefresh(resetScroll) {
  guidePathLayoutTimers.forEach(function(timer) { clearTimeout(timer); });
  guidePathLayoutTimers = [];
  refreshGuidePathIfActive(resetScroll);
  // The staggered re-measures exist to catch viewport chrome (iOS toolbars,
  // etc.) settling after navigation — they must NOT keep re-forcing scrollTop
  // to 0 on every pass, or a user who starts scrolling within this ~1.4s
  // window gets yanked back to the top, sometimes more than once. Only the
  // very first, immediate call above may reset scroll; every deferred pass
  // just re-measures height.
  [40, 120, 280, 700, 1400].forEach(function(delay) {
    guidePathLayoutTimers.push(setTimeout(function() {
      refreshGuidePathIfActive(false);
    }, delay));
  });
}

// The star-map detail sheet is appended to <body>, so it overlays everything
// until explicitly closed. Call this on any navigation away from the tree.
function closeStarMapSheet() {
  var s = document.getElementById('ptreeSheet'), b = document.getElementById('ptreeSheetBackdrop');
  if (s) { s.style.transition = ''; s.style.transform = ''; s.classList.remove('open'); s.__openNode = null; }
  if (b) b.classList.remove('open');
}

function switchGuideTab(tab) {
  guideActiveTab = tab;
  var pathPanel = document.getElementById('guidePathPanel');
  var omniaPanel = document.getElementById('guideOmniaPanel');
  var treePanel = document.getElementById('guideTreePanel');
  var pathTab = document.getElementById('guidePathTab');
  var omniaTab = document.getElementById('guideOmniaTab');
  var treeTab = document.getElementById('guideTreeTab');
  if (pathPanel) pathPanel.classList.toggle('guide-tab-hidden', tab !== 'path');
  if (omniaPanel) omniaPanel.classList.toggle('guide-tab-hidden', tab !== 'omnia');
  if (treePanel) treePanel.classList.toggle('guide-tab-hidden', tab !== 'tree');
  if (tab !== 'tree') closeStarMapSheet();
  if (pathTab) pathTab.classList.toggle('active', tab === 'path');
  if (omniaTab) omniaTab.classList.toggle('active', tab === 'omnia');
  if (treeTab) treeTab.classList.toggle('active', tab === 'tree');
  document.body.classList.toggle('upgrade-stage', tab === 'omnia');
  if (tab === 'omnia') { renderOmniaEngine(); _showGuideTabTip('omnia'); }
  if (tab === 'tree') { renderPracticeTree(); _showGuideTabTip('tree'); }
  if (tab === 'path' && typeof renderPathQuests === 'function') renderPathQuests();
  var gp = document.getElementById('guidePanel');
  if (gp) gp.scrollTop = 0;
  refreshGuidePanelLayout(false);
}

// ── Render exercise assessment rows ───────────────────────
function renderGuideExRows() {
  var container = document.getElementById('guideExRows');
  if (!container) return;
  container.innerHTML = GUIDE_EXERCISES.map(function(ex) {
    var opts = ex.opts.map(function(opt) {
      var sel = guideState[ex.id] === opt ? ' sel' : '';
      return '<button class="guide-opt' + sel + '" data-ex="' + ex.id + '" data-opt="' + opt.replace(/"/g,'&quot;') + '">' + opt + '</button>';
    }).join('');
    return '<div class="guide-ex-row">'
      + '<div class="guide-ex-label"><div class="guide-ex-name">' + ex.name + '</div><div class="guide-ex-sub">' + ex.sub + '</div></div>'
      + '<div class="guide-opt-row">' + opts + '</div>'
      + '</div>';
  }).join('');
  if (!container._advWired) {
    container._advWired = true;
    container.addEventListener('click', function(e) {
      var btn = e.target.closest('.guide-opt');
      if (!btn) return;
      var exId = btn.dataset.ex;
      var opt  = btn.dataset.opt;
      guideState[exId] = opt;
      saveGuideState(guideState);
      container.querySelectorAll('.guide-opt[data-ex="' + exId + '"]').forEach(function(b) {
        b.classList.toggle('sel', b.dataset.opt === opt);
      });
    });
  }
}

function setGuidePathMode(mode, lockChoice) {
  guidePathMode = mode;
  if (mode) guideState._pathModeV2 = mode;
  if (lockChoice) guideState._pathLockedV2 = true;
  saveGuideState(guideState);
  guidePendingPathMode = null;
  var beginnerBtn = document.getElementById('guideBeginnerPathBtn');
  var experiencedBtn = document.getElementById('guideExperiencedPathBtn');
  var routeGrid = document.getElementById('guideRouteGrid');
  var confirmPanel = document.getElementById('guideConfirmPanel');
  var locked = document.getElementById('guideLockedPath');
  var lockedTitle = document.getElementById('guideLockedTitle');
  var lockedText = document.getElementById('guideLockedText');
  var cadence = document.getElementById('guideCadenceControl');
  var panel = document.getElementById('guideAssessmentPanel');
  var isLocked = !!guideState._pathLockedV2 && !!mode;
  if (routeGrid) routeGrid.style.display = isLocked ? 'none' : 'grid';
  if (confirmPanel) confirmPanel.style.display = 'none';
  if (locked) locked.style.display = 'none';
  if (cadence) cadence.style.display = 'none';
  if (lockedTitle) lockedTitle.textContent = mode === 'experienced' ? 'Tell Omnia where I am' : 'Foundational Path';
  if (lockedText) lockedText.textContent = mode === 'experienced'
    ? 'Omnia will keep watching your completed exercises and refine recommendations from your current capacities.'
    : 'Omnia will keep you on the foundation sequence and adjust the next session from your completed practice.';
  if (beginnerBtn) beginnerBtn.classList.toggle('active', mode === 'beginner');
  if (experiencedBtn) experiencedBtn.classList.toggle('active', mode === 'experienced');
  if (panel) panel.style.display = 'none';
  renderGuideCadenceControl();
  if (!isLocked) {
    if (beginnerBtn) beginnerBtn.classList.remove('active');
    if (experiencedBtn) experiencedBtn.classList.remove('active');
  }
  if (isLocked && mode === 'experienced') renderGuideExRows();
}

function showGuideRouteChoice() {
  guidePendingPathMode = null;
  var routeGrid = document.getElementById('guideRouteGrid');
  var confirmPanel = document.getElementById('guideConfirmPanel');
  var locked = document.getElementById('guideLockedPath');
  var panel = document.getElementById('guideAssessmentPanel');
  var plan = document.getElementById('guidePlanOutput');
  if (routeGrid) routeGrid.style.display = 'grid';
  if (confirmPanel) confirmPanel.style.display = 'none';
  if (locked) locked.style.display = 'none';
  if (panel) panel.style.display = 'none';
  if (plan) plan.style.display = 'none';
  document.getElementById('guideBeginnerPathBtn').classList.remove('active');
  document.getElementById('guideExperiencedPathBtn').classList.remove('active');
}

function showGuidePathConfirmation(mode) {
  guidePendingPathMode = mode;
  guidePathMode = mode;
  var routeGrid = document.getElementById('guideRouteGrid');
  var confirmPanel = document.getElementById('guideConfirmPanel');
  var confirmTitle = document.getElementById('guideConfirmTitle');
  var confirmText = document.getElementById('guideConfirmText');
  var confirmBtn = document.getElementById('guideConfirmCommitBtn');
  var confirmActions = document.getElementById('guideConfirmActions');
  var confirmCadence = document.getElementById('guideConfirmCadenceControl');
  var panel = document.getElementById('guideAssessmentPanel');
  var generateBtn = document.getElementById('guideGenerateBtn');
  var plan = document.getElementById('guidePlanOutput');
  if (routeGrid) routeGrid.style.display = 'none';
  if (confirmPanel) confirmPanel.style.display = 'block';
  if (plan) plan.style.display = 'none';
  if (confirmTitle) confirmTitle.textContent = mode === 'experienced' ? 'Tell Omnia where I am' : 'I am new to this';
  if (confirmText) confirmText.textContent = mode === 'experienced'
    ? 'Set your current capacity below. When you confirm, Omnia will use your answers and your completed sessions to make today\'s agenda.'
    : 'Omnia will start you with Clock and Thought Control only, then open new exercises after your practice earns them.';
  if (confirmBtn) confirmBtn.textContent = mode === 'experienced' ? 'Create Agenda' : 'Begin Path';
  if (confirmBtn) confirmBtn.style.display = mode === 'experienced' ? 'none' : '';
  if (confirmActions) confirmActions.style.gridTemplateColumns = mode === 'experienced' ? '1fr' : '1fr 1.35fr';
  if (confirmCadence) confirmCadence.style.display = mode === 'beginner' ? 'flex' : 'none';
  if (panel) panel.style.display = mode === 'experienced' ? 'block' : 'none';
  if (generateBtn) generateBtn.textContent = mode === 'experienced' ? 'Confirm & Create Agenda' : 'Ask Omnia for recommendations →';
  document.getElementById('guideBeginnerPathBtn').classList.toggle('active', mode === 'beginner');
  document.getElementById('guideExperiencedPathBtn').classList.toggle('active', mode === 'experienced');
  if (mode === 'experienced') renderGuideExRows();
  renderGuideCadenceControl();
}

function commitGuidePath(mode) {
  if (!mode) return;
  setGuidePathMode(mode, true);
  renderGuidePlan(mode);
}

function guideClamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function guideLocalDayKey(value) {
  var d = value ? new Date(value) : new Date();
  if (isNaN(d.getTime())) return '';
  var m = String(d.getMonth() + 1).padStart(2, '0');
  var day = String(d.getDate()).padStart(2, '0');
  return d.getFullYear() + '-' + m + '-' + day;
}

function guideIsToday(value) {
  return guideLocalDayKey(value) === guideLocalDayKey();
}

function guideFmtTime(sec) {
  sec = Math.max(0, Math.round(sec || 0));
  var m = Math.floor(sec / 60);
  var s = sec % 60;
  if (m && s) return m + 'm ' + s + 's';
  if (m) return m + 'm';
  return s + 's';
}

function guideTwoADayEnabled() {
  return guideState._twoADayV1 !== false;
}

// Per-exercise rounds override — returns 1 or 2, consulting the per-exercise
// setting first then falling back to the global 2x/day toggle.
function guideExRounds(exId) {
  var ov = guideState._exRounds && guideState._exRounds[exId];
  if (ov === 1 || ov === 2) return ov;
  return guideTwoADayEnabled() ? 2 : 1;
}

// Pore Breathing has a breath-count target instead of a timed duration, but
// its daily session count follows the same global cadence unless the player
// explicitly changes that card's frequency afterward.
function guidePoreRounds() {
  var ov = guideState.poreRounds;
  if (ov === 1 || ov === 2) return ov;
  return guideTwoADayEnabled() ? 2 : 1;
}

// Post-process items: if an exercise has a per-exercise rounds override that
// differs from the global setting, re-derive done and durationLabel from it.
// Called last in buildGuideRegimentItems so it also fixes added items.
function guideApplyExRounds(items) {
  if (!guideState._exRounds || !Object.keys(guideState._exRounds).length) return items;
  var globalR = guideTwoADayEnabled() ? 2 : 1;
  // Lazy-load stats only if needed (avoids scanning history when nothing is overridden)
  var _stats = null, _ts = null;
  function getStats() { if (!_stats) _stats = guideExerciseStats(); return _stats; }
  function getTS()    { if (!_ts)   _ts   = guideThoughtStats();    return _ts;   }
  return items.map(function(it) {
    if (it.sensoryTrack) return it; // mastery is a clean five-minute rep, never accumulated minutes
    var ov = guideState._exRounds && guideState._exRounds[it.id];
    if (ov !== 1 && ov !== 2) return it;
    if (ov === globalR) return it;           // override matches global — no change
    if (!it.duration && it.duration !== 0) return it; // open-ended (soulmirror, pore)
    var todaySec;
    var isThought = (it.id === 'thought' || it.id === 'observation' || it.id === 'focus' || it.id === 'vacancy');
    if (isThought) {
      var mode = it.mode || it.id;
      todaySec = (getTS()[mode] || {}).todaySec || 0;
    } else {
      todaySec = (getStats()[it.id] || {}).todaySec || 0;
    }
    var done = todaySec + 5 * ov >= it.duration * 60 * ov;
    var durationLabel = it.duration + ' min' + (ov > 1 ? ' x2' : '');
    return Object.assign({}, it, { done: done, durationLabel: durationLabel });
  });
}

function renderGuideCadenceControl() {
  var on = guideTwoADayEnabled();
  ['guideTwoADayBtn','guideConfirmTwoADayBtn','guidePlanTwoADayBtn'].forEach(function(id) {
    var btn = document.getElementById(id);
    if (!btn) return;
    btn.textContent = on ? '2x/day on' : '2x/day off';
    btn.classList.toggle('off', !on);
  });
}

function guideIsClockHistory(h) {
  return !!h && !h.type && !h.exercise;
}

function guideHistorySeconds(h) {
  return Math.max(0, parseInt(h && h.seconds, 10) || 0);
}

function guideThoughtDurationFromObject(text) {
  var m = String(text || '').match(/in\s+(\d+):(\d{2})/);
  if (!m) return 0;
  return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
}

function guideThoughtDuration(h) {
  if (!h) return 0;
  return Math.max(0,
    parseInt(h.durationSec, 10)
    || parseInt(h.elapsedSec, 10)
    || guideThoughtDurationFromObject(h.object)
    || guideHistorySeconds(h)
  );
}

// A Clock session "qualifies" toward the next tier based on the total time
// spent in the session (covering restarts/breaks), not just unbroken focus —
// players whose attention resets mid-session still get credit for showing up
// and putting in the full duration. Falls back to best-rep/XP for older
// history entries recorded before sessionDurationSec was tracked.
function guideClockSessionSec(h) {
  return guideSessionSec(h);
}

// Generalized "time actually practiced" for one session: prefers the recorded
// wall-clock duration, then summed active reps (xpEarned), then the stored
// seconds. Lets rep-based exercises (auditory) get credit for the whole sit —
// and for the sum of several sits in a day — instead of only the best rep.
function guideSessionSec(h) {
  var sec = guideHistorySeconds(h);
  var xp = parseInt(h && h.xpEarned, 10) || 0;
  var dur = parseInt(h && h.sessionDurationSec, 10) || 0;
  return Math.max(dur, xp, sec);
}

function guideClockStats() {
  var out = { count:0, totalSec:0, bestSec:0, todaySec:0, todayBestSec:0, todayCount:0, firstMs:0, lastMs:0, qualTarget:5, qualTenCount:0 };
  var history = (typeof concState !== 'undefined' && concState.history) ? concState.history : [];
  // Collect clock sessions sorted oldest-first for tier simulation
  var clockSessions = [];
  history.forEach(function(h) {
    if (!guideIsClockHistory(h)) return;
    var sec = guideHistorySeconds(h);
    var ms = h.date ? new Date(h.date).getTime() : 0;
    out.count++;
    out.totalSec += sec;
    if (sec > out.bestSec) out.bestSec = sec;
    if (ms && (!out.firstMs || ms < out.firstMs)) out.firstMs = ms;
    if (ms && ms > out.lastMs) out.lastMs = ms;
    var sessionSec = guideClockSessionSec(h);
    if (guideIsToday(h.date)) {
      out.todayCount++;
      out.todaySec += sessionSec;
      if (sec > out.todayBestSec) out.todayBestSec = sec;
    }
    clockSessions.push({ sec:sessionSec, ms:ms });
  });
  // Recommendation rule: completing TWO sessions at a given length earns the
  // next minute. The target is therefore the lowest minute (>=5) at which the
  // player has fewer than two qualifying sessions — two 6-min sits recommend 7,
  // two 7-min recommend 8, and so on, capped at 10. (5s grace for tap timing.)
  function clockQualCount(min) {
    var n = 0;
    for (var i = 0; i < clockSessions.length; i++) {
      if (clockSessions[i].sec + 5 >= min * 60) n++;
    }
    return n;
  }
  var tier = 5;
  while (tier < 10 && clockQualCount(tier) >= 2) tier++;
  out.qualTarget = tier;
  out.qualAtTier = Math.min(clockQualCount(tier), 2); // sessions toward the next minute
  out.qualTenCount = clockQualCount(10);
  return out;
}

function asanaTierRequired(tier) {
  return tier % 5 === 0 ? 7 : 1;
}

function guideAsanaStats() {
  var out = { count:0, totalSec:0, bestSec:0, todaySec:0, todayCount:0, qualTarget:5, qualAtTier:0, atCap:false, tierRequired:7, locked:false, showStepper:false };
  var history = (typeof concState !== 'undefined' && concState.history) ? concState.history : [];
  var sessions = [];
  history.forEach(function(h) {
    if (!h || h.exercise !== 'asana') return;
    var sec = Math.max(0, parseInt(h.seconds, 10) || 0);
    var ms = h.date ? new Date(h.date).getTime() : 0;
    out.count++;
    out.totalSec += sec;
    if (sec > out.bestSec) out.bestSec = sec;
    if (guideIsToday(h.date)) { out.todayCount++; out.todaySec += sec; }
    sessions.push({ sec:sec, ms:ms });
  });
  sessions.sort(function(a, b) { return a.ms - b.ms; });

  var floor = guideFloorMin('asana');
  var auto = guideAutoAdvanceOn('asana');

  // Advanced floor with auto-advance OFF → suggestion is locked at the floor;
  // the setup screen shows a manual stepper editing that floor.
  if (floor > 0 && !auto) {
    out.qualTarget = floor;
    out.locked = true;
    out.showStepper = true;
    out.cap = GUIDE_FLOOR_CAP;
    return out;
  }

  // Otherwise climb the tier ladder. Floor (when set) raises both the starting
  // rung and the ceiling (to 120); without a floor it's the standard 5→30 ladder.
  var cap = floor > 0 ? GUIDE_FLOOR_CAP : 30;
  // With an advanced floor, the chosen minute IS the starting recommendation;
  // only sessions logged after it was set count toward climbing higher.
  var setAt = floor > 0 ? guideAdvanceSetAt('asana') : 0;
  // Qualifying sessions are counted across the whole history at each rung —
  // the same way Clock does it — so one long sit counts at every rung it
  // clears. A practitioner who can already hold 30 minutes is recognized right
  // away instead of climbing 25 rungs one session at a time.
  function asanaQualCount(min) {
    var n = 0;
    for (var i = 0; i < sessions.length; i++) {
      if (setAt && sessions[i].ms <= setAt) continue;
      if (sessions[i].sec + 5 >= min * 60) n++;
    }
    return n;
  }
  var tier = floor > 0 ? floor : 5;
  while (tier < cap && asanaQualCount(tier) >= asanaTierRequired(tier)) tier++;
  out.atCap = tier >= cap;
  out.cap = cap;
  out.tierRequired = asanaTierRequired(Math.min(tier, cap - 1));
  out.qualAtTier = Math.min(asanaQualCount(tier), out.tierRequired);
  // At the foundational 30-min ceiling the user picks any duration manually.
  if (out.atCap && floor === 0) {
    out.qualTarget = guideClamp(parseInt(localStorage.getItem('presence_asana_duration'), 10) || cap, cap, GUIDE_FLOOR_CAP);
    out.showStepper = true;
  } else {
    out.qualTarget = tier;
    out.showStepper = out.atCap;
  }
  return out;
}

// Auditory practices in three rungs — 10, 15, then 20 minutes — the same
// range the sensory concentration track already uses for this faculty, so the
// exercise never reports two different targets depending on which route the
// practitioner is on. Seven qualifying sessions at a rung earn the next one.
var GUIDE_AUDITORY_RUNGS = [10, 15, 20];
var GUIDE_AUDITORY_PER_RUNG = 7;

function auditoryTierRequired() {
  return GUIDE_AUDITORY_PER_RUNG;
}

// With an advanced floor the rungs continue in the same five-minute steps from
// the chosen start up to the override ceiling.
function guideAuditoryRungs(floor) {
  if (!floor) return GUIDE_AUDITORY_RUNGS.slice();
  var rungs = [];
  for (var m = floor; m <= GUIDE_FLOOR_CAP; m += 5) rungs.push(m);
  return rungs.length ? rungs : [floor];
}

function guideAuditoryStats() {
  var out = { count:0, totalSec:0, bestSec:0, todaySec:0, todayCount:0, qualTarget:GUIDE_AUDITORY_RUNGS[0], qualAtTier:0, atCap:false, tierRequired:GUIDE_AUDITORY_PER_RUNG, locked:false };
  var history = (typeof concState !== 'undefined' && concState.history) ? concState.history : [];
  var sessions = [];
  history.forEach(function(h) {
    if (!h || h.type !== 'auditory') return;
    var sec = guideSessionSec(h);                            // time practiced (whole sit)
    var repSec = Math.max(0, parseInt(h.seconds, 10) || 0);  // best unbroken rep
    var ms = h.date ? new Date(h.date).getTime() : 0;
    out.count++;
    out.totalSec += sec;
    if (repSec > out.bestSec) out.bestSec = repSec;
    if (guideIsToday(h.date)) { out.todayCount++; out.todaySec += sec; }
    sessions.push({ sec:sec, ms:ms });
  });
  sessions.sort(function(a, b) { return a.ms - b.ms; });

  var floor = guideFloorMin('auditory');
  var auto = guideAutoAdvanceOn('auditory');

  if (floor > 0 && !auto) {
    out.qualTarget = floor;
    out.locked = true;
    return out;
  }

  // With an advanced floor, the chosen minute IS the starting recommendation;
  // only sessions logged after it was set count toward climbing higher.
  var setAt = floor > 0 ? guideAdvanceSetAt('auditory') : 0;
  // Qualifying sessions are counted across the whole history at each rung —
  // the same way Clock does it — so one long sit counts at every rung it
  // clears. A practitioner who already sits 20 minutes is recognized right
  // away instead of grinding up one rung at a time.
  function auditoryQualCount(min) {
    var n = 0;
    for (var i = 0; i < sessions.length; i++) {
      if (setAt && sessions[i].ms <= setAt) continue;
      if (sessions[i].sec + 5 >= min * 60) n++; // 5s grace for tap-timing variance
    }
    return n;
  }
  var rungs = guideAuditoryRungs(floor);
  var idx = 0;
  while (idx < rungs.length - 1 && auditoryQualCount(rungs[idx]) >= GUIDE_AUDITORY_PER_RUNG) idx++;
  out.qualTarget = rungs[idx];
  out.atCap = idx >= rungs.length - 1;
  out.nextTarget = out.atCap ? null : rungs[idx + 1];
  out.qualAtTier = Math.min(auditoryQualCount(rungs[idx]), GUIDE_AUDITORY_PER_RUNG);
  out.tierRequired = GUIDE_AUDITORY_PER_RUNG;
  return out;
}

function guideThoughtStats() {
  var out = {};
  function blank() {
    return { count:0, totalSec:0, bestSec:0, todaySec:0, todayCount:0, lastMs:0, sessions:[] };
  }
  GUIDE_FOUNDATION_THOUGHT_ORDER.forEach(function(mode) {
    out[mode] = blank();
  });
  var history = (typeof concState !== 'undefined' && concState.history) ? concState.history : [];
  history.forEach(function(h) {
    if (!h || h.type !== 'thought') return;
    var mode = h.tcMode || 'observation';
    if (!out[mode]) out[mode] = blank();
    var dur = guideThoughtDuration(h);
    var best = guideHistorySeconds(h);
    var ms = h.date ? new Date(h.date).getTime() : 0;
    out[mode].count++;
    out[mode].totalSec += dur;
    if (best > out[mode].bestSec) out[mode].bestSec = best;
    if (ms > out[mode].lastMs) out[mode].lastMs = ms;
    // Kept per session so the duration ladder can ask how many sits actually
    // reached a given length, rather than trusting a bare session count.
    out[mode].sessions.push({ sec:dur, ms:ms });
    if (guideIsToday(h.date)) {
      out[mode].todayCount++;
      out[mode].todaySec += dur;
    }
  });
  return out;
}

function guideAllThoughtModesMastered(thoughtStats) {
  return GUIDE_FOUNDATION_THOUGHT_ORDER.every(function(mode) {
    return (thoughtStats[mode] && thoughtStats[mode].bestSec >= 600);
  });
}

// Returns true once the student has completed ≥2 thought control sessions
// (any mode), meaning they have advanced past the initial 5-min tier.
function guideThoughtFirstTierMastered() {
  var ts = guideThoughtStats();
  var total = GUIDE_FOUNDATION_THOUGHT_ORDER.reduce(function(acc, mode) {
    return acc + ((ts[mode] && ts[mode].count) || 0);
  }, 0);
  return total >= 2;
}

function guideLeastRecentThoughtMode(thoughtStats) {
  return GUIDE_FOUNDATION_THOUGHT_ORDER.slice().sort(function(a, b) {
    var aa = thoughtStats[a] || { lastMs:0, count:0 };
    var bb = thoughtStats[b] || { lastMs:0, count:0 };
    if (aa.todayCount !== bb.todayCount) return aa.todayCount - bb.todayCount;
    if (aa.lastMs !== bb.lastMs) return aa.lastMs - bb.lastMs;
    return aa.count - bb.count;
  })[0];
}

function guideCurrentThoughtMode(thoughtStats) {
  for (var i = 0; i < GUIDE_FOUNDATION_THOUGHT_ORDER.length; i++) {
    var mode = GUIDE_FOUNDATION_THOUGHT_ORDER[i];
    if (!thoughtStats[mode] || thoughtStats[mode].bestSec < 600) return mode;
  }
  return guideLeastRecentThoughtMode(thoughtStats);
}

// Thought Control climbs 5→10 at one minute per 2 qualifying sessions, then
// 10→15 at one minute per 6 — the same pacing as before. What changed is what
// "qualifying" means: a session now has to actually reach the rung's length.
// Counting bare sessions let a run of thirty-second sits earn a fifteen-minute
// recommendation, which no other discipline allowed. Qualifying sessions are
// counted across the whole history, so one long sit counts at every rung it
// clears, exactly as Clock, Asana, and Auditory do.
var GUIDE_THOUGHT_MIN_RUNG = 5;
var GUIDE_THOUGHT_MAX_RUNG = 15;
function guideThoughtRungRequired(rung) {
  return rung < 10 ? 2 : 6;
}

// Ladder state for one thought discipline: the recommended minutes plus the
// progress toward the next rung, so the Path and the Progress view can both
// describe it without recomputing the rules.
function guideThoughtLadder(mode, thoughtStats) {
  var st = (thoughtStats && thoughtStats[mode]) || { sessions:[] };
  var list = st.sessions || [];
  var floor = guideFloorMin(mode);
  // With an advanced floor, only sessions logged after it was set may climb.
  var setAt = floor > 0 ? guideAdvanceSetAt(mode) : 0;
  function qualCount(min) {
    var n = 0;
    for (var i = 0; i < list.length; i++) {
      if (setAt && list[i].ms <= setAt) continue;
      if (list[i].sec + 5 >= min * 60) n++; // 5s grace for tap-timing variance
    }
    return n;
  }
  var rung = GUIDE_THOUGHT_MIN_RUNG;
  while (rung < GUIDE_THOUGHT_MAX_RUNG && qualCount(rung) >= guideThoughtRungRequired(rung)) rung++;
  var required = guideThoughtRungRequired(rung);
  var atCap = rung >= GUIDE_THOUGHT_MAX_RUNG;
  return {
    natural:rung,
    // Per-mode floor: Vacancy's override doesn't move Observation or Focus.
    target:guideAdvancedTarget(mode, rung),
    qualAtRung:atCap ? required : Math.min(qualCount(rung), required),
    required:required,
    atCap:atCap
  };
}

function guideThoughtTargetMinutes(mode, thoughtStats) {
  return guideThoughtLadder(mode, thoughtStats).target;
}

// ── Senses sub-modes: Feeling, Smell, Taste — same distinguishing treatment
// as Thought Control's Observation/Focus/Vacancy ─────────────────────────
function guideSenseStats() {
  var out = {};
  GUIDE_SENSE_ORDER.forEach(function(mode) {
    out[mode] = { count:0, totalSec:0, bestSec:0, todaySec:0, todayCount:0, lastMs:0 };
  });
  var history = (typeof concState !== 'undefined' && concState.history) ? concState.history : [];
  history.forEach(function(h) {
    if (!h || h.exercise !== 'sense') return;
    var mode = h.mode || 'feeling';
    if (!out[mode]) out[mode] = { count:0, totalSec:0, bestSec:0, todaySec:0, todayCount:0, lastMs:0 };
    var sec = h.seconds || 0;
    var ms = h.date ? new Date(h.date).getTime() : 0;
    out[mode].count++;
    out[mode].totalSec += sec;
    if (sec > out[mode].bestSec) out[mode].bestSec = sec;
    if (ms > out[mode].lastMs) out[mode].lastMs = ms;
    if (guideIsToday(h.date)) {
      out[mode].todayCount++;
      out[mode].todaySec += sec;
    }
  });
  return out;
}

function guideAllSenseModesMastered(senseStats) {
  return GUIDE_SENSE_ORDER.every(function(mode) {
    return (senseStats[mode] && senseStats[mode].bestSec >= 600);
  });
}

function guideLeastRecentSenseMode(senseStats) {
  return GUIDE_SENSE_ORDER.slice().sort(function(a, b) {
    var aa = senseStats[a] || { lastMs:0, count:0 };
    var bb = senseStats[b] || { lastMs:0, count:0 };
    if (aa.todayCount !== bb.todayCount) return aa.todayCount - bb.todayCount;
    if (aa.lastMs !== bb.lastMs) return aa.lastMs - bb.lastMs;
    return aa.count - bb.count;
  })[0];
}

// The faculty actually being trained lately, newest first. Used to describe a
// generic Senses card, which commits to no mode of its own.
function guideRecentSenseMode(senseStats) {
  var best = null, bestMs = 0;
  GUIDE_SENSE_ORDER.forEach(function(mode) {
    var st = senseStats[mode] || { lastMs:0, count:0 };
    if ((st.count || 0) > 0 && (st.lastMs || 0) >= bestMs) { bestMs = st.lastMs || 0; best = mode; }
  });
  return best;
}

function guideCurrentSenseMode(senseStats) {
  for (var i = 0; i < GUIDE_SENSE_ORDER.length; i++) {
    var mode = GUIDE_SENSE_ORDER[i];
    if (!senseStats[mode] || senseStats[mode].bestSec < 600) return mode;
  }
  return guideLeastRecentSenseMode(senseStats);
}

// Which faculty the practitioner is actually on.
//
// Two selectors had grown up side by side and they disagree. The sequential
// curriculum advances only on a clean 5:00 hold, three times over; the rotation
// above advances on a single 10-minute best. Sit with Feeling for twelve
// minutes and never once hold it clean and the curriculum rightly keeps you
// there, while the rotation has already declared it finished and moved to
// Smell — so the Progress panel announced a faculty the practitioner was not
// training, and the recommendation followed it.
//
// While the curriculum is still running it is the authority. Its stages cover
// Visualization and Auditory too, which are not sense faculties, so the
// override only applies when the live stage really is one; otherwise the
// rotation still answers.
function guideActiveSenseMode(senseStats) {
  try {
    var progress = guideSensoryTrackProgress();
    if (progress && !progress.complete && progress.current
        && GUIDE_SENSE_MODES[progress.current.mode]) {
      return progress.current.mode;
    }
  } catch (e) {}
  return guideCurrentSenseMode(senseStats);
}

// Senses is held to its own 2/5/10 duration model (matching the exercise's
// own duration picker), so the same score used by the old flat gate just
// gets clamped to 10 rather than scaling further like Thought Control does.
function guideSenseTargetMinutes(mode, senseStats) {
  var st = senseStats[mode] || { count:0, bestSec:0 };
  var score = guideExperienceScore('sense');
  if (st.count >= 3) score = Math.max(score, 1);
  if (st.bestSec >= 600) score = Math.max(score, 2);
  if (st.bestSec >= 900 || st.count >= 10) score = Math.max(score, 3);
  var natural = Math.min(10, guideDurationForScore(score));
  // Per-mode floor: an advanced start in Feeling doesn't move Smell or Taste.
  return guideAdvancedTarget(mode, natural);
}

function guideClockTargetMinutes(clockStats) {
  return clockStats.qualTarget || 5;
}

function guideClockFinalTarget(clockStats) {
  var auto = guideClockTargetMinutes(clockStats);
  if (auto >= 10 && guideState.clockUserTarget != null) {
    auto = guideClamp(guideState.clockUserTarget, 10, 15);
  }
  // An advanced starting floor overrides/raises the natural clock target.
  return guideAdvancedTarget('clock', auto);
}

function guideClockAtCap(clockStats) {
  return guideClockTargetMinutes(clockStats) >= 10;
}

function guideClockShowUpsell(clockStats) {
  // The 10→15 upsell is moot once an advanced floor governs the clock target.
  if (guideFloorMin('clock')) return false;
  // Show upsell after 14 qualifying 10-min sessions and user hasn't set a manual target yet
  return guideClockAtCap(clockStats) && (clockStats.qualTenCount || 0) >= 14 && guideState.clockUserTarget == null;
}

function guideClockAttentionTargetSec(clockStats) {
  if (!clockStats.bestSec) return 0;
  var days = clockStats.firstMs ? Math.floor((Date.now() - clockStats.firstMs) / 86400000) + 1 : 1;
  if (days <= 21) return guideClamp(Math.ceil(clockStats.bestSec * 3 / 15) * 15, 120, 600);
  return guideClamp(Math.ceil((clockStats.bestSec + 60) / 60) * 60, 600, 900);
}

function guideExerciseBreadth(stats) {
  return ['clock','visual','auditory','thought','asana'].reduce(function(sum, id) {
    return sum + ((stats[id] && stats[id].count > 0) ? 1 : 0);
  }, 0);
}

// ── Determine if user counts as "experienced" for an exercise ─
function guideIsExperienced(exId) {
  var sel = guideState[exId];
  if (!sel || sel === 'New to me') return false;
  return true;
}

// ── "I'm Advanced" per-exercise override ──────────────────────────────────────
// From a Path card's ··· menu, a practitioner can set where Omnia's suggestions
// START for that one discipline (capped at 120 min) and whether Omnia should
// keep raising the bar from there. This is opt-in per exercise and independent
// of the beginner/experienced path: an exercise has an override only once the
// user sets one. Without an override, the exercise climbs naturally as before.
var GUIDE_TIMED_EXERCISES = ['clock','visual','auditory','thought','observation','focus','vacancy','asana','sense','feeling','smell','taste'];
var GUIDE_FLOOR_CAP = 120;

// Thought Control is three independent disciplines (Observation, Focus,
// Vacancy), each with its own advanced floor. A card carries its mode, so the
// floor for one mode never bleeds into the others. Everything else keys by exId.
var GUIDE_THOUGHT_MODES = { observation:1, focus:1, vacancy:1 };
// Senses gets the same per-mode treatment as Thought Control — Feeling, Smell,
// and Taste each hold their own independent floor.
var GUIDE_SENSE_MODES = { feeling:1, smell:1, taste:1 };
function guideFloorKey(exId, mode) {
  if (exId === 'thought' && mode && GUIDE_THOUGHT_MODES[mode]) return mode;
  if (exId === 'sense' && mode && GUIDE_SENSE_MODES[mode]) return mode;
  return exId;
}

// One-time cleanup: earlier builds stored a single shared 'thought' floor that
// (incorrectly) drove all three thought disciplines at once. That key is no
// longer read, so remove it once — the user re-sets per form, which now stays
// isolated. Clearing (rather than guessing a mode) avoids surprising a form
// the user never meant to change.
(function migrateThoughtFloor() {
  try {
    if (!guideState || guideState._tcFloorMigrated) return;
    var f = guideState._advancedFloors;
    if (f && Object.prototype.hasOwnProperty.call(f, 'thought')) {
      delete f.thought;
      if (guideState._advanceAuto) delete guideState._advanceAuto.thought;
      if (guideState._advanceSetAt) delete guideState._advanceSetAt.thought;
    }
    guideState._tcFloorMigrated = true;
    saveGuideState(guideState);
  } catch (e) {}
})();

function guideFloorMin(exId) {
  var f = guideState && guideState._advancedFloors && guideState._advancedFloors[exId];
  return (typeof f === 'number' && f >= 1) ? f : 0;
}

function guideAutoAdvanceOn(exId) {
  // No override → natural progression always climbs. Override → per-exercise
  // checkbox, default ON (climbs past the chosen start) unless explicitly turned off.
  if (!guideFloorMin(exId)) return true;
  var auto = guideState._advanceAuto && guideState._advanceAuto[exId];
  return auto === undefined ? true : !!auto;
}

function guideAdvancedActive(exId) {
  return guideFloorMin(exId) > 0;
}

function guideSetAdvanced(exId, minutes, autoOn) {
  if (!guideState._advancedFloors || typeof guideState._advancedFloors !== 'object') guideState._advancedFloors = {};
  if (!guideState._advanceAuto || typeof guideState._advanceAuto !== 'object') guideState._advanceAuto = {};
  if (!guideState._advanceSetAt || typeof guideState._advanceSetAt !== 'object') guideState._advanceSetAt = {};
  guideState._advancedFloors[exId] = guideClamp(parseInt(minutes, 10) || 5, 1, GUIDE_FLOOR_CAP);
  guideState._advanceAuto[exId] = !!autoOn;
  // Remember when the floor was set: only practice from this point on should
  // climb the bar past the chosen start, so declaring a start never snaps the
  // recommendation upward off the back of pre-existing history.
  guideState._advanceSetAt[exId] = Date.now();
  saveGuideState(guideState);
}

function guideClearAdvanced(exId) {
  if (guideState._advancedFloors) delete guideState._advancedFloors[exId];
  if (guideState._advanceAuto) delete guideState._advanceAuto[exId];
  if (guideState._advanceSetAt) delete guideState._advanceSetAt[exId];
  saveGuideState(guideState);
}

// Timestamp (ms) when the advanced floor for an exercise was set, or 0. Sessions
// at or before this only establish the starting point; later ones climb past it.
function guideAdvanceSetAt(exId) {
  var t = guideState && guideState._advanceSetAt && guideState._advanceSetAt[exId];
  return (typeof t === 'number' && t > 0) ? t : 0;
}

// Apply any advanced override to a naturally-computed minute target. No override
// → unchanged. Override + auto off → locked at the floor. Override + auto on →
// never below the floor, but may climb past it.
function guideAdvancedTarget(exId, naturalMin) {
  var floor = guideFloorMin(exId);
  if (!floor) return naturalMin;
  if (!guideAutoAdvanceOn(exId)) return floor;
  return Math.max(floor, naturalMin || 0);
}

// ── Omnia offers the advanced start ───────────────────────────────────────────
// "I'm Advanced" is the pressure valve for every ladder in here, but it lives
// behind a card's ··· menu, so the practitioners who most need it are the least
// likely to find it. When someone's actual sits keep running well past what
// Omnia asks for, that mismatch is visible in the history — so offer the higher
// starting point directly on the card instead of waiting to be discovered.
var GUIDE_ADV_OFFER_SESSIONS = 3;      // consecutive recent sits that must clear
var GUIDE_ADV_OFFER_MARGIN_SEC = 300;  // the recommendation, by five minutes

// Practiced seconds for one discipline, newest first. Each exercise records
// duration differently, so route through the same helpers the ladders use.
function guideRecentSessionSecs(exId, mode, limit) {
  var history = (typeof concState !== 'undefined' && Array.isArray(concState.history)) ? concState.history : [];
  var out = [];
  for (var i = 0; i < history.length && out.length < limit; i++) {
    var h = history[i];
    if (!h) continue;
    if (exId === 'thought' || GUIDE_THOUGHT_MODES[exId]) {
      if (h.type !== 'thought') continue;
      if (mode && (h.tcMode || 'observation') !== mode) continue;
      out.push(guideThoughtDuration(h));
    } else if (exId === 'sense' || GUIDE_SENSE_MODES[exId]) {
      if (h.exercise !== 'sense') continue;
      if (mode && (h.mode || 'feeling') !== mode) continue;
      out.push(guideSensoryEntryPracticeSec(h));
    } else if (guideHistoryExerciseId(h) === exId) {
      out.push(guideSessionSec(h));
    }
  }
  return out;
}

// Returns { key, minutes, from } when the last few sits all cleared the current
// recommendation by a clear margin, or null. Never fires for an exercise that
// already carries a manual floor, and never again once declined.
function guideAdvancedOffer(exId, mode, currentMin) {
  if (!exId || !currentMin) return null;
  if (GUIDE_TIMED_EXERCISES.indexOf(exId) === -1) return null;
  var key = guideFloorKey(exId, mode);
  if (guideFloorMin(key)) return null;
  var dismissed = (guideState && guideState._advOfferDismissed) || {};
  if (dismissed[key]) return null;
  var recent = guideRecentSessionSecs(exId, mode, GUIDE_ADV_OFFER_SESSIONS);
  if (recent.length < GUIDE_ADV_OFFER_SESSIONS) return null;
  var threshold = currentMin * 60 + GUIDE_ADV_OFFER_MARGIN_SEC;
  var lowest = Infinity;
  for (var j = 0; j < recent.length; j++) {
    if (recent[j] < threshold) return null;   // one short sit and the run is broken
    if (recent[j] < lowest) lowest = recent[j];
  }
  // Offer the largest whole five minutes every one of those sits actually held,
  // so the suggestion is something they have already demonstrated.
  var suggest = guideClamp(Math.floor(lowest / 300) * 5, currentMin + 5, GUIDE_FLOOR_CAP);
  return suggest > currentMin ? { key:key, minutes:suggest, from:currentMin } : null;
}

function guideDismissAdvancedOffer(key) {
  if (!guideState._advOfferDismissed || typeof guideState._advOfferDismissed !== 'object') {
    guideState._advOfferDismissed = {};
  }
  guideState._advOfferDismissed[key] = true;
  saveGuideState(guideState);
}

// Current recommended minutes for an exercise (already folds in any override).
// Used to seed the "I'm Advanced" dialog with a sensible default.
function guideRecommendedMinutes(exId) {
  try {
    // While a sensory foundation is active, its Path duration is the exercise
    // recommendation used by early-end warnings and rewards. The fixed mastery
    // gate remains one clean 5:00 rep even when an advanced user raises this
    // session target.
    var sensoryItem = guideSensoryTrackItem(1);
    if (sensoryItem && sensoryItem.duration && sensoryItem.id === exId) return sensoryItem.duration;
    // A specific thought discipline (observation/focus/vacancy) computes its
    // own natural target — used to seed the dialog and label its own card.
    if (GUIDE_THOUGHT_MODES[exId]) return guideThoughtTargetMinutes(exId, guideThoughtStats()) || 5;
    if (GUIDE_SENSE_MODES[exId]) return guideSenseTargetMinutes(exId, guideSenseStats()) || 5;
    if (exId === 'asana') return guideAsanaStats().qualTarget || 5;
    if (exId === 'auditory') return guideAuditoryStats().qualTarget || 5;
    if (exId === 'clock') return guideClockFinalTarget(guideClockStats()) || 5;
    if (exId === 'thought') {
      var ts = guideThoughtStats();
      var mode = guideState.thoughtModeForced || guideCurrentThoughtMode(ts);
      return guideThoughtTargetMinutes(mode, ts) || 5;
    }
    if (exId === 'sense') {
      var ss = guideSenseStats();
      var smode = guideState.senseModeForced || guideActiveSenseMode(ss);
      return guideSenseTargetMinutes(smode, ss) || 5;
    }
    var st = guideExerciseStats();
    return guideDurationForScore(guideMonitoredScore(exId, st)) || 5;
  } catch (e) { return 5; }
}

function guideExperienceScore(exId) {
  var sel = guideState[exId];
  if (!sel || sel === 'New to me') return 0;
  if (sel === 'Familiar') return 2;
  if (sel.indexOf('15') === 0) return 3;
  if (sel.indexOf('10') === 0) return 2;
  if (sel.indexOf('5') === 0) return 1;
  return 0;
}

function guideHistoryExerciseId(h) {
  if (!h) return 'clock';
  if (h.exercise === 'asana') return 'asana';
  if (h.exercise === 'sense') return 'sense';
  if (h.exercise === 'pore_breathing') return 'pore';
  if (h.exercise === 'autosuggestion') return 'soulmirror';
  if (h.type === 'visualization') return 'visual';
  if (h.type === 'all-angles' || h.type === 'multi-sense') return 'visual';
  if (h.type === 'auditory') return 'auditory';
  if (h.type === 'thought') return 'thought';
  return 'clock';
}

function guideExerciseStats() {
  var stats = {};
  var recentCutoff = Date.now() - 14 * 86400000;
  function emptyStats() {
    return { count:0, bestSec:0, preTodayBestSec:0, totalSec:0, todaySec:0, todayCount:0, lastMs:0, recentCount:0, recentSec:0 };
  }
  GUIDE_EXERCISES.forEach(function(ex) {
    stats[ex.id] = emptyStats();
  });
  // Pore Breathing has its own Star and path card, but intentionally does not
  // add another self-assessment row beside Soul Mirror.
  stats.pore = emptyStats();
  var history = (typeof concState !== 'undefined' && concState.history) ? concState.history : [];
  history.forEach(function(h) {
    var id = guideHistoryExerciseId(h);
    if (!stats[id]) return;
    var sec = id === 'thought' ? guideThoughtDuration(h)
            : (id === 'auditory' || id === 'clock') ? guideSessionSec(h)
            : (h.seconds || 0);
    var bestSec = h.seconds || sec;
    var ms = h.date ? new Date(h.date).getTime() : 0;
    stats[id].count++;
    stats[id].totalSec += sec;
    if (bestSec > stats[id].bestSec) stats[id].bestSec = bestSec;
    if (!guideIsToday(h.date) && bestSec > stats[id].preTodayBestSec) stats[id].preTodayBestSec = bestSec;
    if (guideIsToday(h.date)) {
      stats[id].todayCount++;
      stats[id].todaySec += sec;
    }
    if (ms && ms >= recentCutoff) {
      stats[id].recentCount++;
      stats[id].recentSec += sec;
    }
    if (ms > stats[id].lastMs) stats[id].lastMs = ms;
  });
  return stats;
}

function guideMonitoredScore(exId, stats) {
  var score = guideExperienceScore(exId);
  var st = stats[exId] || { count:0, bestSec:0, lastMs:0 };
  if (st.count >= 3) score = Math.max(score, 1);
  if (st.bestSec >= 600) score = Math.max(score, 2);
  if (st.bestSec >= 900 || st.count >= 10) score = Math.max(score, 3);
  return score;
}

function guideDurationForScore(score) {
  if (score <= 0) return 5;
  if (score === 1) return 10;
  if (score === 2) return 15;
  return 20;
}

function guideProgressPct(value, total) {
  if (!total) return 0;
  return Math.max(0, Math.min(100, Math.round(value / total * 100)));
}

// Read-only curriculum view used by the Path's Progress toggle. Daily cards
// stay focused on what Omnia recommends today; this view explains the ladders
// behind those choices without placing a large instruction box on each card.
function guideProgressOverview() {
  var cards = [];
  var clock = guideClockStats();
  var clockTarget = guideClockFinalTarget(clock);
  var clockFloor = guideFloorMin('clock');
  var clockDetail, clockPct = 100;
  if (clockFloor && !guideAutoAdvanceOn('clock')) {
    clockDetail = 'Manual target · automatic increases are off.';
  } else if (clock.qualTarget < 10) {
    var clockRemaining = Math.max(0, 2 - (clock.qualAtTier || 0));
    clockDetail = clockRemaining + ' more → ' + (clock.qualTarget + 1) + ' min';
    clockPct = guideProgressPct(clock.qualAtTier || 0, 2);
  } else if (guideState.clockUserTarget == null && (clock.qualTenCount || 0) < 14) {
    var tenRemaining = 14 - (clock.qualTenCount || 0);
    clockDetail = tenRemaining + ' more 10-minute session' + (tenRemaining === 1 ? '' : 's')
      + ' → optional 15-minute intervals';
    clockPct = guideProgressPct(clock.qualTenCount || 0, 14);
  } else {
    clockDetail = guideState.clockUserTarget != null
      ? 'Your 10–15 minute interval target is manually adjustable.'
      : 'The foundational timing ladder is complete.';
  }
  cards.push({
    id:'clock', name:'Clock', icon:'⊙', color:'#d4b08e',
    summary:clockTarget + ' min recommended',
    rows:[{ label:'Session length', status:clockTarget + ' min', detail:clockDetail, pct:clockPct }]
  });

  var thought = guideThoughtStats();
  var thoughtRows = GUIDE_FOUNDATION_THOUGHT_ORDER.map(function(mode) {
    var ladder = guideThoughtLadder(mode, thought);
    var target = ladder.target;
    var floor = guideFloorMin(mode);
    var detail, pct = 100;
    // Only a floor with automatic increases turned OFF is genuinely finished —
    // that is how the Clock, Asana and Auditory rows already read. This one
    // took the same short-circuit for any floor at all, so a discipline still
    // climbing announced "automatic increases on" beside a hardcoded full bar
    // and never moved: the real state underneath could be nought of six
    // qualifying sits, with none of that visible.
    if (floor && !guideAutoAdvanceOn(mode)) {
      detail = 'Manual ' + floor + '-minute target · automatic increases are off.';
    } else if (ladder.atCap) {
      detail = 'The 15-minute recommendation ceiling is reached.';
    } else {
      var remaining = Math.max(1, ladder.required - ladder.qualAtRung);
      // While the ladder is still below a manual floor, climbing a rung does
      // not move the recommendation — say that rather than promising a rise
      // to the number already on screen.
      var nextMin = Math.max(floor, ladder.natural + 1);
      detail = nextMin > target
        ? remaining + ' more → ' + nextMin + ' min'
        : remaining + ' more before the ladder passes your manual ' + floor + ' min';
      pct = guideProgressPct(ladder.qualAtRung, ladder.required);
    }
    return {
      label:GUIDE_FOUNDATION_THOUGHT_LABELS[mode] || mode,
      status:target + ' min',
      detail:detail,
      pct:pct
    };
  });
  cards.push({
    id:'thought', name:'Thought Control', icon:'◌', color:'#98b4cc',
    summary:'Each form advances separately',
    rows:thoughtRows
  });

  var asana = guideAsanaStats();
  var asanaDetail, asanaPct = 100;
  if (asana.locked) {
    asanaDetail = 'Manual target · automatic increases are off.';
  } else if (asana.atCap) {
    asanaDetail = 'The current ladder ceiling is reached; adjust the target manually.';
  } else {
    var asanaRemaining = Math.max(0, asana.tierRequired - asana.qualAtTier);
    asanaDetail = asanaRemaining + ' more → ' + (asana.qualTarget + 1) + ' min';
    asanaPct = guideProgressPct(asana.qualAtTier, asana.tierRequired);
  }
  cards.push({
    id:'asana', name:'Asana', icon:'✦', color:'#d49898',
    summary:asana.qualTarget + ' min recommended',
    rows:[{ label:'Motionless sitting', status:asana.qualTarget + ' min', detail:asanaDetail, pct:asanaPct }]
  });

  var sensory = guideSensoryTrackProgress();
  var sensoryPin = guideState._sensoryDailyStageV1;
  var sensoryPinnedStage = sensoryPin && sensoryPin.day === guideLocalDayKey()
    ? sensory.stages.find(function(stage) { return stage.id === sensoryPin.id; })
    : null;
  var sensoryActiveStage = sensoryPinnedStage
    ? (sensoryPinnedStage.mastered ? null : sensoryPinnedStage)
    : sensory.current;
  function sensoryRow(stage) {
    var active = !!(sensoryActiveStage && sensoryActiveStage.id === stage.id);
    var prior = stage.index > 0 ? sensory.stages[stage.index - 1] : null;
    var status, detail;
    if (stage.mastered) {
      status = 'Mastered';
      detail = 'Clean hold ' + guideFmtTime(stage.bestCleanSec) + ' / 5m';
    } else if (!active) {
      // Nothing is blocked any more — the order is a recommendation, so a stage
      // that is not today's is simply one not yet held clean. "Waiting" was
      // gate language from when a gap voided everything behind it, and it left
      // rows waiting on foundations that had been removed from the path and so
      // could never arrive.
      var earlier = sensory.stages.some(function(other) {
        return other.index < stage.index && !other.mastered;
      });
      status = earlier ? 'Later' : 'Next';
      if (stage.attempts > 0) {
        detail = 'Best clean ' + guideFmtTime(stage.bestCleanSec) + ' / 5m'
          + (earlier ? ' · Omnia recommends the earlier foundations first, but this counts whenever you hold it.'
                     : ' · one clean 5:00 hold masters it.');
      } else {
        detail = earlier
          ? 'Omnia recommends the earlier foundations first — practise this any time; a clean 5:00 hold masters it.'
          : 'Omnia will recommend this on your next practice day.';
      }
    } else {
      var practiceMin = guideSensoryPracticeMinutes(stage);
      status = practiceMin + ' min recommended';
      var increase;
      if (practiceMin < 15) {
        increase = '→ 15 min after a 10-min sit';
      } else if (practiceMin < 20) {
        increase = '→ 20 min after a 15-min sit';
      } else if (practiceMin === 20) {
        increase = 'at the 20-min range';
      } else {
        increase = 'your manual ' + practiceMin + '-min target';
      }
      detail = 'Best clean ' + guideFmtTime(stage.bestCleanSec) + ' / 5m · ' + increase;
    }
    return {
      label:stage.label,
      status:status,
      detail:detail,
      pct:guideProgressPct(stage.bestCleanSec, GUIDE_SENSORY_CLEAN_GOAL_SEC),
      active:active,
      mastered:stage.mastered
    };
  }
  var visualStages = sensory.stages.filter(function(stage) { return stage.exercise === 'visual'; });
  var auditoryStages = sensory.stages.filter(function(stage) { return stage.exercise === 'auditory'; });
  var senseStages = sensory.stages.filter(function(stage) { return stage.exercise === 'sense'; });
  cards.push({
    id:'visual', name:'Visualization', icon:'◉', color:'#8ab8e0',
    summary:visualStages.filter(function(stage) { return stage.mastered; }).length + ' / 2 foundations',
    rows:visualStages.map(sensoryRow)
  });
  // Auditory's session length has two governors: while the sensory foundation
  // is still being trained the track sets it, and once that foundation is
  // mastered (or the exercise is practiced outside the track) the standalone
  // 10/15/20 ladder does. Only the one actually in force is shown, so the card
  // never states two different targets at once.
  var auditoryRows = auditoryStages.map(sensoryRow);
  if (auditoryStages.length && auditoryStages.every(function(stage) { return stage.mastered; })) {
    var aud = guideAuditoryStats();
    var audDetail, audPct = 100;
    if (aud.locked) {
      audDetail = 'Manual target · automatic increases are off.';
    } else if (aud.atCap) {
      audDetail = 'At the twenty-minute practice ceiling.';
    } else {
      var audRemaining = Math.max(1, aud.tierRequired - aud.qualAtTier);
      audDetail = audRemaining + ' more → ' + aud.nextTarget + ' min';
      audPct = guideProgressPct(aud.qualAtTier, aud.tierRequired);
    }
    auditoryRows.push({
      label:'Session length', status:aud.qualTarget + ' min', detail:audDetail, pct:audPct
    });
  }
  cards.push({
    id:'auditory', name:'Auditory', icon:'◈', color:'#8eccc0',
    summary:auditoryStages.filter(function(stage) { return stage.mastered; }).length + ' / 2 foundations',
    rows:auditoryRows
  });
  cards.push({
    id:'sense', name:'Senses', icon:'✺', color:'#e0a8c4',
    summary:senseStages.filter(function(stage) { return stage.mastered; }).length + ' / 6 foundations',
    rows:senseStages.map(sensoryRow),
    footer:sensory.complete
      ? 'Multi-Sense unlocked · elemental work follows later.'
      : 'Feeling, Smell, and Taste unlock in order, each closed-eyes then open-eyes; only one is recommended at a time.'
  });
  // Progress describes the ladders behind today's path, so it only covers what
  // is actually on that path. An exercise the practitioner removed has no
  // bearing on their practice and should not be explained back to them.
  var onPath = guideProgressCardIds();
  return onPath ? cards.filter(function(card) { return onPath[card.id]; }) : cards;
}

// Maps today's path items onto the Progress cards that describe them. Thought
// Control is drawn as one card covering its three forms, and the sense
// sub-modes share the Senses card, so several item ids fold into one.
var GUIDE_PROGRESS_CARD_FOR_ITEM = {
  clock:'clock',
  thought:'thought', observation:'thought', focus:'thought', vacancy:'thought',
  asana:'asana',
  visual:'visual',
  auditory:'auditory',
  sense:'sense', feeling:'sense', smell:'sense', taste:'sense',
  multisense:'sense'
};

function guideProgressCardIds() {
  var items;
  try { items = buildGuideRegimentItems(); } catch (e) { return null; }
  if (!Array.isArray(items)) return null;
  var present = {};
  items.forEach(function(item) {
    var cardId = item && GUIDE_PROGRESS_CARD_FOR_ITEM[item.id];
    if (cardId) present[cardId] = true;
  });
  return present;
}

// The ladders below explain how long each exercise should run, but the question
// a practitioner actually asks first is why these exercises and not others.
// This states the selection rule for whichever regiment is in force, naming the
// pieces that vary today so the daily list stops looking arbitrary.
// Names a sensory stage the way the practitioner meets it. Visualization's
// closed/open split is a curriculum stage in its own right, so the eyes belong
// in the name; Senses carries the practitioner's own eyes preference instead;
// Auditory has no eyes dimension at all.
function guideSensoryStageLabel(stage) {
  if (!stage) return '';
  // Reads as a value in a labelled row, not a clause in a sentence.
  var faculty = stage.exercise === 'sense'
    ? stage.name + ' · ' + String(stage.label).split(' · ')[0]
    : stage.name;
  return faculty + ' · ' + (stage.eyesMode === 'open' ? 'open' : 'closed') + ' eyes';
}

function guideProgressIntro() {
  // Six sentences of prose read as a wall of text, and every fact in it is a
  // short answer to a short question. Emit labelled rows instead, so the panel
  // can be scanned rather than read, with one note carrying the only part that
  // is genuinely explanatory.
  var items = [];
  try { items = buildGuideRegimentItems() || []; } catch (e) { items = []; }
  var present = {};
  items.forEach(function(item) { if (item) present[item.id] = true; });

  var rows = [];
  function row(k, v) { rows.push({ k: k, v: v }); }

  var anchors = [];
  if (present.clock) anchors.push('Clock');
  if (present.thought || present.observation || present.focus || present.vacancy) anchors.push('Thought Control');
  if (anchors.length) row('Anchors', anchors.join(' · '));

  // The sensoryTrack flag marks the sequential curriculum card only. A faculty
  // added with "+", or rotated in as the most neglected on the experienced
  // regiment, carries no such flag — so keying solely off it told a
  // practitioner with Senses right there on their path that they had none.
  var sensoryItem = null;
  var sensoryOnPath = [];
  for (var i = 0; i < items.length; i++) {
    var it = items[i];
    if (!it) continue;
    if (it.sensoryTrack && !sensoryItem) sensoryItem = it;
    if (GUIDE_SENSORY_ITEM_IDS[it.id]) {
      var nm = it.name || it.id;
      // "Senses" alone says nothing about which faculty is actually being
      // trained, so name it: Senses · Feeling.
      if (it.id === 'sense' || GUIDE_SENSE_MODES[it.id]) {
        var md = it.mode || (GUIDE_SENSE_MODES[it.id] ? it.id : null);
        if (!md) {
          // A generic "Senses" card carries no mode: the practitioner chooses
          // the faculty inside the exercise. Asking the rotation what to do
          // NEXT and printing that as the card's identity announced a faculty
          // they were not training — a card sat entirely in Feeling read as
          // "Senses · Smell" because Feeling had cleared the rotation's gate.
          // Report what the sessions actually say, and if there are none, say
          // nothing rather than inventing a faculty.
          try {
            md = guideState.senseModeForced || guideRecentSenseMode(guideSenseStats());
          } catch (e) {}
        }
        if (md && GUIDE_SENSE_LABELS[md]) nm += ' · ' + GUIDE_SENSE_LABELS[md];
      }
      if (sensoryOnPath.indexOf(nm) === -1) sensoryOnPath.push(nm);
    }
  }
  var note;
  if (sensoryItem && sensoryItem.trackComplete) {
    row('Sense', 'Multi-Sense');
    note = 'Every sensory foundation is mastered, so Omnia now recommends Multi-Sense. Anything you add yourself stays until you remove it.';
  } else if (sensoryItem) {
    var sensory = guideSensoryTrackProgress();
    if (sensory.current) row('Today', guideSensoryStageLabel(sensory.current));
    if (sensory.next) row('Next', guideSensoryStageLabel(sensory.next));
    note = 'Omnia rotates in one sense at a time and keeps it until you master it. Anything you add yourself stays until you remove it.';
  } else if (sensoryOnPath.length) {
    row('Sense', sensoryOnPath.join(' · '));
    note = 'Added by you, or rotated in by Omnia, rather than through the sequential curriculum. Anything you add yourself stays until you remove it.';
  } else {
    row('Sense', 'None on your path');
    note = 'Add one with “+” to resume the sensory curriculum. Anything you add yourself stays until you remove it.';
  }

  row('Schedule', guideTwoADayEnabled() ? 'Twice today' : 'Once today');

  return rows.map(function(r) {
    return '<div class="pq-intro-row"><span class="pq-intro-k">' + r.k + '</span>'
      + '<span class="pq-intro-v">' + r.v + '</span></div>';
  }).join('') + '<div class="pq-intro-note">' + note + '</div>';
}

function guideExerciseById(id) {
  return GUIDE_EXERCISES.find(function(ex) { return ex.id === id; }) || GUIDE_EXERCISES[0];
}

function buildExperiencedGuideItems() {
  var stats = guideExerciseStats();
  var thought = guideThoughtStats();
  var now = Date.now();
  var rounds = guideTwoADayEnabled() ? 2 : 1;

  // ── Fixed anchors: Clock and Thought Control always appear ──────────────────
  var clockStats = guideClockStats();
  var clockScore = guideMonitoredScore('clock', stats);
  var clockMinutes = guideClockFinalTarget(clockStats);
  var clockDailyTarget = clockMinutes * 60 * rounds;
  var atCap = guideClockAtCap(clockStats);
  var showUpsell = guideClockShowUpsell(clockStats);
  var clockExtra = showUpsell ? 'upsell' : atCap ? 'stepper' : null;
  var tierProgress = !atCap
    ? ' (' + (clockStats.qualAtTier || 0) + '/2 sessions toward ' + (clockMinutes + 1) + ' min)'
    : '';
  var clockDurLabel = clockMinutes + ' min' + (rounds > 1 ? ' x2' : '');

  var thoughtMode = guideState.thoughtModeForced || guideCurrentThoughtMode(thought);
  var thoughtModeStats = thought[thoughtMode] || { count:0, bestSec:0, todaySec:0 };
  var thoughtMinutes = guideThoughtTargetMinutes(thoughtMode, thought);
  var thoughtDailyTarget = thoughtMinutes * 60 * rounds;
  var thoughtDurLabel = thoughtMinutes + ' min' + (rounds > 1 ? ' x2' : '');
  var nextThought = thoughtMode === 'observation'
    ? 'When observation reaches a ten-minute gap, Omnia will move you to Thought Focus at five minutes.'
    : thoughtMode === 'focus'
      ? 'When focus reaches a ten-minute gap, Omnia will move you to Vacancy at five minutes.'
      : 'When vacancy reaches a ten-minute gap, Omnia will cycle all three forms.';

  var fixedItems = [
    {
      id:'clock',
      name:'Clock',
      duration:clockMinutes,
      durationLabel:clockDurLabel,
      done:clockStats.todaySec + 5 * rounds >= clockDailyTarget,
      todayCount:clockStats.todayCount || 0,
      progress:'today ' + guideFmtTime(clockStats.todaySec) + ' / ' + guideFmtTime(clockDailyTarget) + (atCap ? '' : ' · ' + (clockStats.qualAtTier || 0) + '/2 → ' + (clockMinutes + 1) + 'min'),
      tip:'Complete the full session to count toward the next tier. Two qualifying sessions unlock the next minute.' + tierProgress,
      open:'clock',
      clockExtra:clockExtra
    },
    {
      id:'thought',
      name:'Thought Control',
      mode:thoughtMode,
      duration:thoughtMinutes,
      durationLabel:thoughtDurLabel,
      done:thoughtModeStats.todaySec + 5 * rounds >= thoughtDailyTarget,
      todayCount:thoughtModeStats.todayCount || 0,
      progress:'today ' + guideFmtTime(thoughtModeStats.todaySec) + ' / ' + guideFmtTime(thoughtDailyTarget) + ' · best gap ' + guideFmtTime(thoughtModeStats.bestSec || 0),
      tip:GUIDE_FOUNDATION_THOUGHT_TIPS[thoughtMode] + ' ' + nextThought,
      open:'thought'
    }
  ];

  // ── Rotating gate: most neglected from {visual, auditory, asana} ────────────
  // Visualization and Auditory are never recommended together (same astral
  // faculty). Since only one gate rotates here, the anti-pair rule is naturally
  // satisfied — whichever ranks most neglected appears alone.
  var GATE_IDS = ['visual', 'auditory', 'asana', 'sense'];
  var gateCandidates = GATE_IDS.map(function(id) {
    var ex = guideExerciseById(id);
    var st = stats[id] || { count:0, bestSec:0, lastMs:0 };
    var score = guideMonitoredScore(id, stats);
    var daysSince = st.lastMs ? (now - st.lastMs) / 86400000 : 999;
    var priority = score * 10 + Math.min(st.count, 8) - Math.min(daysSince, 14) * 0.35;
    return { ex:ex, score:score, count:st.count, daysSince:daysSince, priority:priority };
  }).sort(function(a, b) {
    if (a.priority !== b.priority) return a.priority - b.priority;
    return a.ex.id.localeCompare(b.ex.id);
  });

  var gateById = {};
  gateCandidates.forEach(function(c) { gateById[c.ex.id] = c; });

  // Pin today's gate pick so done-state doesn't drift mid-day.
  var dayKey = guideLocalDayKey();
  var pick = guideState._dailyPick;
  var fresh = pick && pick.day === dayKey && pick.v === 4 && Array.isArray(pick.ids) && pick.ids.length === 1;
  var gateId = fresh ? pick.ids[0] : null;
  if (!gateId || !gateById[gateId]) {
    var pool = gateCandidates.map(function(c) { return c.ex.id; });
    var lastGateId = (pick && Array.isArray(pick.ids) && pick.ids.length === 1) ? pick.ids[0] : null;
    // Respect a manually forced gate (set via "Switch to X" button) if it's still a valid candidate
    var forced = guideState.gateForced;
    if (forced && gateById[forced]) {
      gateId = forced;
    } else {
      gateId = pool[0];
      // Same-gate repeat penalty: if it's the same as yesterday's, pick the next
      if (gateId === lastGateId && pool.length > 1) gateId = pool[1];
    }
    guideState._dailyPick = { day: dayKey, ids: [gateId], v: 4 };
    saveGuideState(guideState);
  }

  var gc = gateById[gateId] || { ex:guideExerciseById(gateId), score:guideExperienceScore(gateId), count:0 };
  var gScore = gc.score;
  // Use pre-today bestSec so the target doesn't jump mid-day after completing a session
  var gSt = stats[gateId] || {};
  var gStableBest = typeof gSt.preTodayBestSec === 'number' ? gSt.preTodayBestSec : (gSt.bestSec || 0);
  var gStableScore = guideExperienceScore(gateId);
  if ((gSt.count || 0) >= 3) gStableScore = Math.max(gStableScore, 1);
  if (gStableBest >= 600) gStableScore = Math.max(gStableScore, 2);
  if (gStableBest >= 900 || (gSt.count || 0) >= 10) gStableScore = Math.max(gStableScore, 3);
  var gDur = guideAdvancedTarget(gateId, guideDurationForScore(gStableScore));
  var gSenseMode = null;
  var gSenseStats = null;
  if (gateId === 'asana') {
    gDur = guideAsanaStats().qualTarget;
  } else if (gateId === 'auditory') {
    gDur = guideAuditoryStats().qualTarget;
  } else if (gateId === 'sense') {
    // Senses trains through distinct sub-modes (Feeling/Smell/Taste), same
    // as Thought Control's Observation/Focus/Vacancy — pick whichever is
    // least mastered and hold to the exercise's own 2/5/10 duration model.
    gSenseStats = guideSenseStats();
    gSenseMode = guideState.senseModeForced || guideActiveSenseMode(gSenseStats);
    gDur = guideSenseTargetMinutes(gSenseMode, gSenseStats);
  }
  var gTip;
  if (gScore === 0) {
    gTip = 'This is the neglected gate. Begin modestly and let accuracy matter more than duration.';
  } else if (gScore === 1) {
    gTip = 'You have the beginning. Add a little pressure without making the practice theatrical.';
  } else if (gScore === 2) {
    gTip = 'You are ready for a clean consolidation session. Hold form, reduce drift, record honestly.';
  } else {
    gTip = 'This is already strong. Use it as a stabilizing pillar, then notice what remains undeveloped.';
  }
  if (gateId === 'sense' && gSenseMode && GUIDE_SENSE_TIPS[gSenseMode]) {
    gTip = GUIDE_SENSE_TIPS[gSenseMode] + ' ' + gTip;
  }

  var gateProgress = gc.count ? gc.count + ' recorded' : 'no completed sessions recorded';
  if (gateId === 'auditory') {
    var _aup = guideAuditoryStats();
    if (_aup.locked) {
      gateProgress = 'held at ' + _aup.qualTarget + ' min · ' + gc.count + ' recorded';
    } else if (_aup.atCap) {
      gateProgress = 'ceiling reached · ' + gc.count + ' recorded';
    } else {
      gateProgress = _aup.qualAtTier + ' / ' + _aup.tierRequired + ' sessions at ' + _aup.qualTarget + ' min';
    }
  } else if (gateId === 'asana') {
    var _asp = guideAsanaStats();
    if (_asp.locked) {
      gateProgress = 'held at ' + _asp.qualTarget + ' min · ' + gc.count + ' recorded';
    } else if (_asp.atCap) {
      gateProgress = 'ceiling reached · ' + gc.count + ' recorded';
    } else {
      gateProgress = _asp.qualAtTier + ' / ' + _asp.tierRequired + ' sessions at ' + _asp.qualTarget + ' min';
    }
  } else if (gateId === 'sense' && gSenseMode) {
    var _senseSt = (gSenseStats && gSenseStats[gSenseMode]) || { count:0 };
    gateProgress = _senseSt.count + ' ' + GUIDE_SENSE_LABELS[gSenseMode].toLowerCase() + ' recorded';
  }
  var gateItem = {
    id:gateId,
    name:gc.ex.name,
    duration:gDur,
    durationLabel:gDur + ' min' + (rounds > 1 ? ' x' + rounds : ''),
    done:(stats[gateId] && stats[gateId].todaySec + 5 * rounds >= gDur * 60 * rounds) || false,
    todayCount:stats[gateId] ? (stats[gateId].todayCount || 0) : 0,
    progress:gateProgress,
    tip:gTip + (gc.count ? ' Omnia has recorded ' + gc.count + ' completed session' + (gc.count === 1 ? '' : 's') + ' here.' : ' Omnia has no completed sessions recorded here yet.'),
    open:gateId
  };
  if (gSenseMode) {
    // "done" and today's count must key off THIS mode's practice, not the
    // combined total across all three senses — otherwise finishing Taste
    // earlier today could mark a freshly-rotated Feeling card done unpracticed.
    gateItem.mode = gSenseMode;
    var _gSenseModeSt = (gSenseStats && gSenseStats[gSenseMode]) || { todaySec:0, todayCount:0 };
    gateItem.done = _gSenseModeSt.todaySec + 5 * rounds >= gDur * 60 * rounds;
    gateItem.todayCount = _gSenseModeSt.todayCount || 0;
  }

  // The historical gate calculation above remains useful for existing
  // experience/adaptation statistics, but the actual astral recommendation is
  // now the ordered Bardon sensory curriculum. This guarantees that Auditory,
  // Feeling, Smell, or Taste cannot appear before the current faculty is held
  // cleanly for five minutes.
  gateItem = guideSensoryTrackItem(rounds);
  fixedItems.push(gateItem);
  fixedItems.push({
    id:'soulmirror',
    name:'Soul Mirror',
    duration:null,
    durationLabel:'Reflection',
    done:(function(){ var sm = loadSoulMirror(); return !!(sm._lastEditDate && sm._lastEditDate === guideLocalDayKey()); })(),
    progress:'',
    tip:'Open the mirror and make one honest edit — add a trait, revise one, or write a note. That is all Omnia asks today.',
    open:'soulmirror'
  });

  return fixedItems;
}

function buildFoundationalGuideItems() {
  var rounds = guideTwoADayEnabled() ? 2 : 1;
  var clock = guideClockStats();
  var thought = guideThoughtStats();
  var mode = guideState.thoughtModeForced || guideCurrentThoughtMode(thought);
  var modeStats = thought[mode] || { count:0, bestSec:0, todaySec:0 };
  var clockMinutes = guideClockFinalTarget(clock);
  var clockDailyTarget = clockMinutes * 60 * rounds;
  var thoughtMinutes = guideThoughtTargetMinutes(mode, thought);
  var thoughtDailyTarget = thoughtMinutes * 60 * rounds;
  var attentionTarget = guideClockAttentionTargetSec(clock);
  var atCap = guideClockAtCap(clock);
  var showUpsell = guideClockShowUpsell(clock);
  var attentionText = attentionTarget
    ? ' Your concentration target is ' + guideFmtTime(attentionTarget) + ', based on the first-weeks rule of three times your best recorded hold.'
    : ' First establish a clean baseline; after that Omnia sets the clock target at three times your best hold.';
  var tierProgress = !atCap
    ? ' (' + (clock.qualAtTier || 0) + '/2 sessions toward ' + (clockMinutes + 1) + ' min)'
    : '';
  var nextThought = mode === 'observation'
    ? 'When observation reaches a ten-minute gap, Omnia will move you to Thought Focus at five minutes.'
    : mode === 'focus'
      ? 'When focus reaches a ten-minute gap, Omnia will move you to Vacancy at five minutes.'
      : 'When vacancy reaches a ten-minute gap, Omnia will cycle all three forms instead of adding more volume.';

  var clockExtra = showUpsell ? 'upsell' : atCap ? 'stepper' : null;
  var clockDurLabel2 = clockMinutes + ' min' + (rounds > 1 ? ' x2' : '');
  var thoughtDurLabel2 = thoughtMinutes + ' min' + (rounds > 1 ? ' x2' : '');

  var items = [
    {
      id:'clock',
      name:'Clock',
      duration:clockMinutes,
      durationLabel:clockDurLabel2,
      done:clock.todaySec + 5 * rounds >= clockDailyTarget,
      todayCount:clock.todayCount || 0,
      progress:'today ' + guideFmtTime(clock.todaySec) + ' / ' + guideFmtTime(clockDailyTarget) + (atCap ? '' : ' · ' + (clock.qualAtTier || 0) + '/2 → ' + (clockMinutes + 1) + 'min'),
      tip:'Complete the full session to count toward the next tier. Two qualifying sessions unlock the next minute.' + tierProgress + attentionText,
      open:'clock',
      clockExtra:clockExtra
    },
    {
      id:'thought',
      name:'Thought Control',
      mode:mode,
      duration:thoughtMinutes,
      durationLabel:thoughtDurLabel2,
      done:modeStats.todaySec + 5 * rounds >= thoughtDailyTarget,
      todayCount:modeStats.todayCount || 0,
      progress:'today ' + guideFmtTime(modeStats.todaySec) + ' / ' + guideFmtTime(thoughtDailyTarget) + ' · best gap ' + guideFmtTime(modeStats.bestSec || 0),
      tip:GUIDE_FOUNDATION_THOUGHT_TIPS[mode] + ' Omnia adds one minute after every two completed sessions in this form, up to ten minutes. ' + nextThought,
      open:'thought'
    },
    {
      id:'soulmirror',
      name:'Soul Mirror',
      duration:null,
      durationLabel:'Reflection',
      done:(function(){ var sm = loadSoulMirror(); return !!(sm._lastEditDate && sm._lastEditDate === guideLocalDayKey()); })(),
      progress:'',
      tip:'Open the mirror and make one honest edit — add a trait, revise one, or write a note. That is all Omnia asks today.',
      open:'soulmirror'
    }
  ];

  var stats = guideExerciseStats();
  var gate = guideFoundationNewGate(stats, thought, rounds);
  var gateForced = guideState.gateForced;
  if (gateForced === 'visual' || gateForced === 'auditory' || gateForced === 'sense') {
    gate = guideSensoryTrackItem(rounds);
    gateForced = null;
  }
  if (gateForced && (!gate || gate.id !== gateForced)) {
    var dailyTarget5 = 5 * 60 * rounds;
    var forcedGateItems = {
      asana: (function() { var _asp2 = guideAsanaStats(); var _ad = _asp2.qualTarget; var _at = _ad * 60 * rounds; var _prog = _asp2.locked ? ('held at ' + _ad + ' min · ' + (_asp2.count||0) + ' recorded') : _asp2.atCap ? ('ceiling reached · ' + (_asp2.count||0) + ' recorded') : (_asp2.qualAtTier + ' / ' + _asp2.tierRequired + ' sessions at ' + _asp2.qualTarget + ' min'); return { id:'asana', name:'Asana', duration:_ad, durationLabel:_ad + ' min' + (rounds > 1 ? ' x2' : ''), done:(stats.asana||{}).todaySec + 5 * rounds >= _at, progress:_prog, tip:'Begin building stillness. Sit upright and complete the whole period without negotiating with each impulse.', open:'asana' }; })(),
      visual: { id:'visual', name:'Visualization', duration:5, durationLabel:'5 min' + (rounds > 1 ? ' x2' : ''), done:(stats.visual||{}).todaySec + 5 * rounds >= dailyTarget5, progress:'new gate · ' + ((stats.visual||{}).count||0) + ' recorded', tip:'Hold a simple mental image clearly. Clarity matters more than complexity.', open:'visual' },
      auditory: { id:'auditory', name:'Auditory', duration:5, durationLabel:'5 min' + (rounds > 1 ? ' x2' : ''), done:(stats.auditory||{}).todaySec + 5 * rounds >= dailyTarget5, progress:'astral refinement gate · ' + ((stats.auditory||{}).count||0) + ' recorded', tip:'Focused listening on a single sound. Broaden the astral body steadily.', open:'auditory' }
    };
    gate = forcedGateItems[gateForced] || gate;
  }
  if (gate) items.push(gate);

  var postponed = guideState.postponed || {};
  var removed = guideState.removed || {};
  var now = Date.now();
  return items.filter(function(item) {
    if (removed[item.id]) return false;   // removing a curriculum stage hides it same as any other item
    if (item.sensoryTrack) return true;
    var until = postponed[item.id];
    return !until || now >= until;
  });
}

function guideFoundationNewGate(stats, thoughtStats, rounds) {
  var asana = stats.asana || { count:0, todaySec:0 };
  var clock = guideClockStats();
  var obs = thoughtStats.observation || { bestSec:0 };
  var focus = thoughtStats.focus || { bestSec:0 };
  if (clock.totalSec >= 1800 && obs.bestSec >= 600) {
    return guideSensoryTrackItem(rounds);
  }
  if (asana.count < 3 && clock.bestSec >= 300 && focus.bestSec >= 300) {
    var _adNew = guideAsanaStats().qualTarget;
    return {
      id:'asana',
      name:'Asana',
      duration:_adNew,
      durationLabel:_adNew + ' min',
      done:asana.todaySec + 5 >= _adNew * 60,
      progress:'physical body gate · ' + asana.count + ' recorded',
      tip:'Begin building Omnia\'s physical body through stillness. Sit upright and complete the whole period without negotiating with each impulse.',
      open:'asana'
    };
  }
  return null;
}

function guideFoundationalNote() {
  var stats = guideExerciseStats();
  var clock = guideClockStats();
  var thought = guideThoughtStats();
  var obs = thought.observation || { bestSec:0 };
  if (clock.totalSec < 1800 || obs.bestSec < 600) {
    return 'The sensory concentration track begins with Closed Eyes Visualization after attention and Thought Observation have enough stability. Each later faculty unlocks only after one uninterrupted five-minute hold.';
  }
  return '';
}

function guideSelfRatedExperienceCount() {
  return GUIDE_EXERCISES.reduce(function(sum, ex) {
    return sum + (guideIsExperienced(ex.id) ? 1 : 0);
  }, 0);
}

function guideAdvancedPracticeProfile(stats) {
  var advancedIds = ['visual','auditory','thought','asana','soulmirror'];
  var profile = { total:0, recent:0, active:0, strong:0 };
  advancedIds.forEach(function(id) {
    var st = stats[id] || { count:0, bestSec:0, recentCount:0 };
    var count = st.count || 0;
    var recent = st.recentCount || 0;
    profile.total += count;
    profile.recent += recent;
    if (count >= 2 || recent >= 2 || st.bestSec >= 300) profile.active++;
    if (count >= 4 || recent >= 3 || st.bestSec >= 600) profile.strong++;
  });
  return profile;
}

function guideDetectAdaptedLevel(stats) {
  var history = (typeof concState !== 'undefined' && concState.history) ? concState.history : [];
  if (history.length < 5) return { level:null, confidence:0, sessions:history.length };

  var recent = history.slice(0, 10);
  var totalSec = 0;
  var advancedCount = 0;
  var longCount = 0;
  recent.forEach(function(h) {
    var id = guideHistoryExerciseId(h);
    var sec = id === 'thought' ? guideThoughtDuration(h) : (h.seconds || 0);
    totalSec += sec;
    if (id !== 'clock') advancedCount++;
    if (sec >= 600) longCount++;
  });

  var avgSec = recent.length ? totalSec / recent.length : 0;
  var profile = guideAdvancedPracticeProfile(stats || guideExerciseStats());
  var score = 0;
  if (avgSec >= 300) score++;
  if (avgSec >= 600) score++;
  if (longCount >= 3) score += 2;
  if (advancedCount >= 4) score += 2;
  if (guideExerciseBreadth(stats || guideExerciseStats()) >= 3) score++;
  if (profile.strong >= 1) score++;
  if (profile.recent >= 4) score++;

  if (score >= 4) {
    return {
      level:'advanced',
      confidence:guideClamp(55 + score * 8, 70, 96),
      sessions:history.length,
      avgSec:avgSec,
      advancedCount:advancedCount
    };
  }

  if (history.length >= 8 && avgSec < 120 && advancedCount === 0) {
    return { level:'beginner', confidence:72, sessions:history.length, avgSec:avgSec, advancedCount:advancedCount };
  }

  return { level:null, confidence:0, sessions:history.length, avgSec:avgSec, advancedCount:advancedCount };
}

function guideShouldUseExperiencedRegiment(stats) {
  // Only leave the foundational track if the user explicitly chose experienced
  // mode or has genuinely substantial practice — the old thresholds were far
  // too easy (5 sessions across 4 exercises), which silently dropped users
  // off the structured track they were relying on.
  if (guideState._pathModeV2 === 'experienced') return true;
  if (guideSelfRatedExperienceCount() >= 4) return true; // rated 4+ exercises as experienced

  var detected = guideDetectAdaptedLevel(stats || guideExerciseStats());
  if (detected.level === 'advanced' && detected.confidence >= 85) return true; // raised from 70

  var profile = guideAdvancedPracticeProfile(stats || guideExerciseStats());
  // Require breadth across all 5 concentration gates AND substantial history
  if (guideExerciseBreadth(stats || guideExerciseStats()) >= 5 && profile.total >= 20) return true;
  return false;
}

function guideCurrentRegimentInfo(mode) {
  var baseMode = mode || guidePathMode || guideState._pathModeV2 || 'beginner';
  var stats = guideExerciseStats();
  var detected = guideDetectAdaptedLevel(stats);
  var experienced = guideShouldUseExperiencedRegiment(stats);
  var resolvedMode = experienced ? 'experienced' : 'beginner';
  var autoAdapted = resolvedMode === 'experienced' && baseMode !== 'experienced';
  return {
    mode: resolvedMode,
    selectedMode: baseMode,
    autoAdapted: autoAdapted,
    detectedLevel: detected.level,
    confidence: detected.confidence || 0,
    focus: resolvedMode === 'experienced'
      ? (autoAdapted ? 'Adaptive Regiment' : 'Personal Recommendations')
      : 'Foundational Path' + (guideTwoADayEnabled() ? ' · 2x/day' : ''),
    dayLabel: resolvedMode === 'experienced' ? (autoAdapted ? 'Adaptive' : 'Custom') : null
  };
}

function guideMaybeNoticeAdaptation(info) {
  if (!info || !info.autoAdapted || info.detectedLevel !== 'advanced') return;
  if (guideState._omniaAdaptNoticeV1 === 'advanced') return;
  guideState._omniaAdaptNoticeV1 = 'advanced';
  guideState._detectedLevelV1 = 'advanced';
  if (!guideState._adaptationHistoryV1) guideState._adaptationHistoryV1 = [];
  guideState._adaptationHistoryV1.push({
    date:new Date().toISOString(),
    fromLevel:info.selectedMode || 'beginner',
    toLevel:'advanced',
    confidence:info.confidence || 0
  });
  saveGuideState(guideState);
  if (typeof showToast === 'function') {
    showToast('Omnia noticed your practice changing · regiment adapted', 4200);
  }
}

function buildGuideRegimentItems(mode) {
  var info = guideCurrentRegimentInfo(mode);
  var items = info.mode === 'experienced' ? buildExperiencedGuideItems() : buildFoundationalGuideItems();
  items = guideMirrorToPore(guideApplyExRounds(guideMergeAddedItems(items)));
  // Honor "Remove from path" for ALL path modes and on the final ids. The
  // experienced builder never filtered these, so removing a fixed card like
  // Soul Mirror had no effect; mirror→pore conversion can also change an id,
  // so filter here after the full pipeline. `removed` is a permanent hide
  // (until re-added via "+"); `postponed` is the legacy timed snooze.
  var postponed = guideState.postponed || {};
  var removed = guideState.removed || {};
  var now = Date.now();
  return guideAttachSessionDone(items.filter(function(item) {
    if (removed[item.id]) return false;   // removing a curriculum stage hides it same as any other item
    if (item.sensoryTrack) return true;
    var until = postponed[item.id];
    return !until || now >= until;
  }));
}

// Mark a timed Path exercise as session-complete once the day's required number
// of sessions has been recorded — even if each ended before Omnia's recommended
// duration (ending early only forfeits the body-level award, not the daily Path
// credit). This is stored as a SEPARATE flag (item.sessionDone), never folded
// into item.done here, so the body-award highlight (omniaHighlightedExerciseIds)
// and the recommendation picker — both of which read item.done — are unchanged.
// The Path renderers fold sessionDone into done for display only.
function guideAttachSessionDone(items) {
  var exStats = null, thStats = null;
  var thoughtModes = { thought:1, observation:1, focus:1, vacancy:1 };
  items.forEach(function(it) {
    if (it.sensoryTrack) return;                    // only its clean-hold gate can complete it
    if (it.done) return;                            // already complete by duration
    if (typeof it.duration !== 'number') return;    // open-ended (soulmirror/pore) keep own logic
    if (it.id === 'soulmirror' || it.id === 'pore' || it.id === 'pore_breathing') return;
    var rounds = 1;
    var ov = guideState._exRounds && guideState._exRounds[it.id];
    if (ov === 1 || ov === 2) rounds = ov;
    else rounds = guideTwoADayEnabled() ? 2 : 1;
    var todayCount;
    if (typeof it.todayCount === 'number') {
      todayCount = it.todayCount;
    } else if (thoughtModes[it.id]) {
      if (!thStats) thStats = guideThoughtStats();
      todayCount = ((thStats[it.mode || it.id]) || {}).todayCount || 0;
    } else {
      if (!exStats) exStats = guideExerciseStats();
      todayCount = ((exStats[it.id]) || {}).todayCount || 0;
    }
    if (todayCount >= rounds) it.sessionDone = true;
  });
  return items;
}

// Has a Pore Breathing session been logged today?
function guidePoreSessionsDoneToday() {
  var h = (typeof concState !== 'undefined' && concState.history) ? concState.history : [];
  var today = guideLocalDayKey();
  return h.filter(function(e) { return e && e.exercise === 'pore_breathing' && guideLocalDayKey(e.date) === today; }).length;
}
function guidePoreBreathTarget() {
  if (guideState.poreAdvanced) return 40;
  return Math.min(40, Math.max(7, guideState.poreBreaths || 7));
}
function guidePoreDoneToday() {
  var rounds = guidePoreRounds();
  return guidePoreSessionsDoneToday() >= rounds;
}

// A Pore Breathing path card with auto-progressing breath target (7 → 40).
function guidePoreItem(added) {
  var target = guidePoreBreathTarget();
  var rounds = guidePoreRounds();
  var done = guidePoreDoneToday();
  var sessToday = guidePoreSessionsDoneToday();
  var durLabel = target + ' breaths' + (rounds > 1 ? ' ×' + rounds : '');
  var poreRemaining = rounds - sessToday;
  var prog = rounds > 1 && !done && poreRemaining > 0 ? (poreRemaining === 1 ? '×1 remaining' : '×' + rounds + ' sessions') : '';
  return {
    id:'pore', name:'Pore Breathing', duration:null, durationLabel:durLabel,
    done:done, progress:prog, open:'pore', added:!!added,
    rounds: rounds, todayCount: sessToday,
    tip:'Draw vital force through the whole body. Pore breathing transforms what the mirror revealed — let the breath fill every pore.'
  };
}

// Once the user has finished with the Mirror, the daily Soul Mirror reflection
// card becomes Pore Breathing. The Mirror stays editable; only the recommended
// path item changes.
function guideMirrorToPore(items) {
  if (!soulMirrorIsFinished()) return items;
  return items.map(function(it) {
    if (it && it.id === 'soulmirror' && it.open === 'soulmirror') return guidePoreItem(it.added);
    return it;
  });
}

// ── Manually-added exercises ("+" on the Path) ──────────────
// The user can pull an exercise into their daily path before Omnia gates it.
// These persist in guideState._pathAdded and are scaled by the normal
// per-exercise progression (start at 5 min, climb over sessions).
function guideBuildAddedItem(exId, rounds) {
  rounds = rounds || 1;
  var stats = guideExerciseStats();
  if (exId === 'asana') {
    var asp = guideAsanaStats();
    var ad = asp.qualTarget;
    var at = ad * 60 * rounds;
    var prog = asp.locked ? ('held at ' + ad + ' min · ' + (asp.count || 0) + ' recorded')
      : asp.atCap ? ('ceiling reached · ' + (asp.count || 0) + ' recorded')
      : (asp.qualAtTier + ' / ' + asp.tierRequired + ' sessions at ' + ad + ' min');
    return { id:'asana', name:'Asana', duration:ad, durationLabel:ad + ' min' + (rounds > 1 ? ' x2' : ''), done:(stats.asana || {}).todaySec >= at, progress:prog, tip:'Added by you. Sit upright and complete the whole period without negotiating with each impulse.', open:'asana', added:true };
  }
  if (exId === 'visual' || exId === 'auditory') {
    var min = guideClamp(guideRecommendedMinutes(exId), 1, GUIDE_FLOOR_CAP);
    var target = min * 60 * rounds;
    var st = stats[exId] || { count:0, todaySec:0 };
    var names = { visual:'Visualization', auditory:'Auditory' };
    var tips = { visual:'Added by you. Hold a simple mental image clearly — clarity matters more than complexity.', auditory:'Added by you. Focused listening on a single sound; broaden the astral body steadily.' };
    return { id:exId, name:names[exId], duration:min, durationLabel:min + ' min' + (rounds > 1 ? ' x2' : ''), done:st.todaySec >= target, progress:'added · ' + (st.count || 0) + ' recorded', tip:tips[exId], open:exId, eyesMode:exId === 'visual' ? guidePathEyesMode('visual', 'closed') : null, added:true };
  }
  if (exId === 'feeling' || exId === 'smell' || exId === 'taste') {
    // Senses trains through distinct sub-modes, same as Thought Control's
    // Observation/Focus/Vacancy — see the note above in buildExperiencedGuideItems.
    var senseStats3 = guideSenseStats();
    var senseDur3 = guideSenseTargetMinutes(exId, senseStats3);
    var senseSt3 = senseStats3[exId] || { count:0, todaySec:0, todayCount:0 };
    var senseTarget3 = senseDur3 * 60 * rounds;
    return { id:exId, name:'Senses', mode:exId, duration:senseDur3, durationLabel:senseDur3 + ' min' + (rounds > 1 ? ' x2' : ''), done:senseSt3.todaySec >= senseTarget3, todayCount:senseSt3.todayCount || 0, progress:'added · ' + (senseSt3.count || 0) + ' recorded', tip:'Added by you. ' + (GUIDE_SENSE_TIPS[exId] || 'Practice sense concentration.'), open:'sense', added:true };
  }
  if (exId === 'sense') {
    // Legacy: a generic (mode-less) "Senses" addition from before the sense
    // sub-modes existed. Kept so anything already saved under the bare id
    // keeps working; new additions always go through feeling/smell/taste above.
    var senseScore = guideMonitoredScore('sense', stats);
    var senseDur = guideAdvancedTarget('sense', Math.min(10, guideDurationForScore(senseScore)));
    var senseTarget = senseDur * 60 * rounds;
    var senseSt = stats.sense || { count:0, todaySec:0 };
    return { id:'sense', name:'Senses', duration:senseDur, durationLabel:senseDur + ' min' + (rounds > 1 ? ' x2' : ''), done:senseSt.todaySec >= senseTarget, progress:'added · ' + (senseSt.count || 0) + ' recorded', tip:'Added by you. Imagine a feeling, smell, or taste as vividly as you can — accuracy matters more than intensity.', open:'sense', eyesMode:guidePathEyesMode('sense', 'closed'), added:true };
  }
  if (exId === 'multisense') {
    var advSt = stats.visual || { count:0, todaySec:0 };
    var advDur = 10;
    return { id:exId, name:'Multi-Sense', duration:advDur, durationLabel:advDur + ' min' + (rounds > 1 ? ' x2' : ''), done:advSt.todaySec >= advDur * 60 * rounds, progress:'advanced · ' + (advSt.count || 0) + ' visual sessions', tip:'Added by you. Hold a full scene — sight, sound, texture, smell — completely in mind.', open:exId, added:true };
  }
  if (exId === 'soulmirror') {
    return { id:'soulmirror', name:'Soul Mirror', duration:null, durationLabel:'Reflection', done:(function(){ var sm = loadSoulMirror(); return !!(sm._lastEditDate && sm._lastEditDate === guideLocalDayKey()); })(), progress:'', tip:'Added by you. Open the mirror and make one honest edit — add a trait, revise one, or write a note.', open:'soulmirror', added:true };
  }
  if (exId === 'pore') {
    return guidePoreItem(true);
  }
  if (exId === 'clock') {
    var c = guideClockStats();
    var cm = guideClockFinalTarget(c);
    var ct = cm * 60 * rounds;
    return { id:'clock', name:'Clock', duration:cm, durationLabel:cm + ' min' + (rounds > 1 ? ' x2' : ''), done:c.todaySec >= ct, progress:'added · today ' + guideFmtTime(c.todaySec), tip:'Added by you. Attention on the seconds hand; complete the full session.', open:'clock', added:true };
  }
  if (exId === 'thought') {
    var ts = guideThoughtStats();
    var m = guideState.thoughtModeForced || guideCurrentThoughtMode(ts);
    var tm = guideThoughtTargetMinutes(m, ts);
    var ms = ts[m] || { todaySec:0, todayCount:0 };
    var tt = tm * 60 * rounds;
    return { id:'thought', name:'Thought Control', mode:m, duration:tm, durationLabel:tm + ' min' + (rounds > 1 ? ' x2' : ''), done:ms.todaySec >= tt, todayCount:ms.todayCount || 0, progress:'added', tip:(GUIDE_FOUNDATION_THOUGHT_TIPS[m] || 'Practice thought control.'), open:'thought', added:true };
  }
  if (exId === 'observation' || exId === 'focus' || exId === 'vacancy') {
    var ts2 = guideThoughtStats();
    var tm2 = guideThoughtTargetMinutes(exId, ts2);
    var ms2 = ts2[exId] || { todaySec:0, todayCount:0 };
    var tt2 = tm2 * 60 * rounds;
    return { id:exId, name:'Thought Control', mode:exId, duration:tm2, durationLabel:tm2 + ' min' + (rounds > 1 ? ' x2' : ''), done:ms2.todaySec >= tt2, todayCount:ms2.todayCount || 0, progress:'added · ' + (ms2.count || 0) + ' recorded', tip:(GUIDE_FOUNDATION_THOUGHT_TIPS[exId] || 'Practice thought control.'), open:'thought', tcMode:exId, added:true };
  }
  return null;
}

function guideMergeAddedItems(items) {
  var added = (guideState && Array.isArray(guideState._pathAdded)) ? guideState._pathAdded : [];
  if (!added.length) return items;
  var rounds = guideTwoADayEnabled() ? 2 : 1;
  var present = {};
  items.forEach(function(it) { present[it.id] = true; });
  var postponed = guideState.postponed || {};
  var removed = guideState.removed || {};
  var now = Date.now();
  added.forEach(function(exId) {
    // Legacy sense-submode additions are represented by the single Senses
    // card now; Visualization, Auditory, and Senses may each coexist.
    if (exId === 'feeling' || exId === 'smell' || exId === 'taste') return;
    if (present[exId]) return;
    if (removed[exId]) return;
    var until = postponed[exId];
    if (until && now < until) return;
    var it = guideBuildAddedItem(exId, rounds);
    if (it) { items.push(it); present[exId] = true; }
  });
  return items;
}

// Exercises the user could still add (not already on today's path).
function guidePathAddableExercises() {
  var items = buildGuideRegimentItems();
  var present = {};
  items.forEach(function(it) { present[it.id] = true; });
  var addable = GUIDE_EXERCISES.filter(function(ex) {
    return !present[ex.id];
  });
  // Offer thought sub-modes that are NOT the current active mode (already on
  // the path under the 'thought' item) and NOT already added independently.
  var activeMode = guideState.thoughtModeForced || guideCurrentThoughtMode(guideThoughtStats());
  GUIDE_FOUNDATION_THOUGHT_ORDER.forEach(function(mode) {
    if (present[mode]) return;   // already an independent card on the path
    if (mode === activeMode) return; // already covered by the 'thought' item
    addable.push({ id: mode });
  });
  // Pore Breathing — addable any time it isn't already on the path.
  if (!present['pore']) addable.push({ id: 'pore' });
  return addable;
}

function guideApplyTutorialPathChoice(mode, experienceBars, launchChoice, goal) {
  var st = loadGuideState();
  var bars = parseInt(experienceBars, 10) || 1;
  st._pathModeV2 = mode;
  st._pathLockedV2 = true;
  st._tutorialExperienceBarsV1 = bars;
  if (launchChoice) st._tutorialLaunchChoiceV1 = launchChoice;
  if (goal) st._tutorialGoalV1 = goal;

  if (mode === 'experienced') {
    var opt = bars >= 5 ? '15+ min' : bars >= 4 ? '10 min' : '5 min';
    ['clock','visual','auditory','thought'].forEach(function(id) {
      if (!st[id] || st[id] === 'New to me') st[id] = opt;
    });
    if (bars >= 4 && (!st.asana || st.asana === 'New to me')) st.asana = '10 min';
    if (bars >= 4 && (!st.soulmirror || st.soulmirror === 'New to me')) st.soulmirror = 'Familiar';
  }

  // Serious daily goal → unlock Asana immediately in the foundational plan
  if (goal === '30 min / day' || goal === '60+ min / day') {
    if (!st.gateForced) st.gateForced = 'asana';
  }

  saveGuideState(st);
  guideState = st;
  guidePathMode = st._pathModeV2 || guidePathMode;
}

// ── Render the daily plan output ──────────────────────────
function renderGuidePlan(mode, skipScroll) {
  var regiment = guideCurrentRegimentInfo(mode);
  mode = regiment.mode;
  var dayIdx = new Date().getDay(); // 0–6

  var items = buildGuideRegimentItems(regiment.selectedMode);
  // Capture the day's initial Guide commitment before rendering. Practice
  // Review then tracks completion against this stable list even if adaptive
  // recommendations evolve after a session.
  if (window.PresencePracticeReview) {
    try { PresencePracticeReview.capturePlan(localStorage, new Date(), items); } catch(e) {}
  }
  // An exercise whose day's sessions were completed (even if ended early) shows
  // as done on the Path — display only; body-award logic uses the untouched flag.
  items.forEach(function(it) { if (it.sessionDone) it.done = true; });
  var focus = regiment.focus;

  var dayNames = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  var monthNames2 = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  var _n2 = new Date(); var _d2 = _n2.getDate();
  var _o2 = _d2===1||_d2===21||_d2===31?'st':_d2===2||_d2===22?'nd':_d2===3||_d2===23?'rd':'th';
  var fullDayLabel = dayNames[dayIdx] + ', ' + monthNames2[_n2.getMonth()] + ' ' + _d2 + _o2;
  var dayLabelEl = document.getElementById('guidePlanDayLabel');
  if (dayLabelEl) dayLabelEl.textContent = regiment.dayLabel || fullDayLabel;
  var focusEl = document.getElementById('guidePlanFocus');
  if (focusEl) focusEl.textContent = focus;
  var planControls = document.getElementById('guidePlanControls');
  if (planControls) planControls.style.display = 'flex';
  renderGuideCadenceControl();

  // Exercise icons by type
  var exIcon = { clock:'⊙', visual:'◉', auditory:'◈', sense:'✺', multisense:'◇', thought:'◌', observation:'◌', focus:'◌', vacancy:'◌', asana:'✦', soulmirror:'◆', pore:'≋' };

  var doneCount = items.filter(function(i){ return i.done; }).length;
  var totalCount = items.length;

  // Update arc ring
  var ringFill = document.getElementById('guidePlanRingFill');
  if (ringFill) {
    var pct = totalCount > 0 ? doneCount / totalCount : 0;
    ringFill.setAttribute('stroke-dashoffset', (81.68 * (1 - pct)).toFixed(2));
  }
  var fracEl = document.getElementById('guidePlanFrac');
  if (fracEl) fracEl.innerHTML = '<strong>' + doneCount + '</strong> / ' + totalCount + ' done';

  // Update banner sub-text with step/focus
  var bannerSub = document.getElementById('pathBannerSub');
  if (bannerSub) bannerSub.textContent = focus;

  var _isTC = function(id) { return id === 'thought' || id === 'observation' || id === 'focus' || id === 'vacancy'; };
  function _buildCardHtml(item) {
    var durLabel = item.durationLabel || (item.duration ? item.duration + ' min' : 'Open-ended');
    var modeLabel = item.mode ? ' · ' + (GUIDE_FOUNDATION_THOUGHT_LABELS[item.mode] || GUIDE_SENSE_LABELS[item.mode] || item.mode) : '';
    if (item.eyesMode) modeLabel += ' · ' + (item.eyesMode === 'open' ? 'Open Eyes' : 'Closed Eyes');
    var accentColor = item.id === 'clock' ? '#d4b08e'
      : item.id === 'visual'   ? '#8ab8e0'
      : item.id === 'auditory' ? '#8eccc0'
      : item.id === 'multisense' ? '#d4c88e'
      : _isTC(item.id) ? '#98b4cc'
      : item.id === 'asana'    ? '#d49898'
      : item.id === 'pore'     ? '#8ecce0'
      : '#c4a8d4';
    var icon = exIcon[item.id] || exIcon['thought'] || '◆';
    var startAttrs = item.open
      ? ' data-guide-start="' + item.open + '"'
        + (item.mode ? ' data-guide-mode="' + item.mode + '"' : '')
        + (item.eyesMode ? ' data-guide-eyes="' + item.eyesMode + '"' : '')
        + (item.duration ? ' data-guide-duration="' + item.duration + '"' : '')
      : '';
    var checkHtml = item.done
      ? '<div class="path-ex-check done">✓</div>'
      : '<div class="path-ex-check empty"></div>';
    var beginHtml = item.open
      ? '<button class="path-ex-begin guide-plan-start"' + startAttrs + (item.done ? ' disabled' : '') + '>' + (item.done ? 'Done' : 'Begin') + '</button>'
      : '';
    return '<div class="path-ex-card' + (item.done ? ' done' : '') + '">'
      + '<div class="path-ex-icon" style="background:' + accentColor + '1e;border:1px solid ' + accentColor + '38;color:' + accentColor + ';">' + icon + '</div>'
      + '<div class="path-ex-info">'
      + '<div class="path-ex-name" style="color:' + accentColor + ';">' + item.name + modeLabel + '</div>'
      + '<div class="path-ex-meta">' + durLabel + (item.progress ? ' · ' + item.progress : '') + '</div>'
      + '</div>'
      + '<div class="path-ex-right">' + checkHtml + beginHtml + '</div>'
      + '<button class="pq-menu-btn" data-ex-id="' + item.id + '"' + (item.mode ? ' data-ex-mode="' + item.mode + '"' : '') + (item.eyesMode ? ' data-ex-eyes="' + item.eyesMode + '"' : '') + (item.sensoryTrack ? ' data-sensory-track="1"' : '') + (item.added ? ' data-ex-added="1"' : '') + ' title="Options">···</button>'
      + '</div>';
  }

  var cardsHTML = items.map(_buildCardHtml).join('');

  var note = mode === 'beginner' ? guideFoundationalNote() : '';
  document.getElementById('guidePlanCards').innerHTML = cardsHTML
    + (note ? '<div class="guide-plan-note">' + note + '</div>' : '');

  // Show streak nudge if user has a streak going
  var streakNudge = document.getElementById('guideStreakNudge');
  var streakVal = document.getElementById('guideStreakVal');
  if (streakNudge && typeof state !== 'undefined' && state.streak > 0) {
    streakNudge.style.display = 'flex';
    if (streakVal) streakVal.textContent = state.streak + 'd';
  } else if (streakNudge) {
    streakNudge.style.display = 'none';
  }

  document.getElementById('guidePlanOutput').style.display = 'block';
  // Scroll to plan only when triggered by an explicit user action
  if (!skipScroll) {
    setTimeout(function() {
      var out = document.getElementById('guidePlanOutput');
      if (out) out.scrollIntoView({ behavior:'smooth', block:'start' });
    }, 120);
  }
}

function beginGuidePlanItem(btn) {
  if (!btn || btn.disabled) return;
  // Don't let a player launch a fresh exercise from Omnia's Path while an
  // Awareness session is still running in the background.
  if (sessionStartTime) {
    showToast('Finish your current session first', 2600);
    return;
  }
  var ex = btn.dataset.guideStart;
  var duration = parseInt(btn.dataset.guideDuration, 10);
  var mode = btn.dataset.guideMode;
  var eyesMode = btn.dataset.guideEyes;
  if (ex === 'thought') {
    if (mode && TC_MODE_DEFS[mode]) tcMode = mode;
    if (duration) tcDuration = duration;
  }
  if (ex === 'sense') {
    if (mode && typeof SENSE_MODE_DEFS !== 'undefined' && SENSE_MODE_DEFS[mode]) {
      senseMode = mode;
      var guideSenseChoices = senseChoicesForMode(mode);
      senseSelectedCue = guideSenseChoices.length ? guideSenseChoices[0].label : '';
    }
    if (eyesMode) {
      if (typeof setSenseEyesMode === 'function') setSenseEyesMode(eyesMode);
      else senseEyesMode = eyesMode === 'open' ? 'open' : 'closed';
    }
  }
  if (ex === 'visual' && eyesMode) {
    visOpenEyesMode = eyesMode === 'open';
  }
  if (ex === 'auditory' && eyesMode) {
    if (typeof setAudEyesMode === 'function') setAudEyesMode(eyesMode);
    else if (typeof audEyesMode !== 'undefined') audEyesMode = eyesMode === 'open' ? 'open' : 'closed';
  }
  if (ex === 'soulmirror') {
    if (typeof _smOriginMode !== 'undefined') _smOriginMode = 'guide';
    switchMode('concentration');
    suppressTutorialForExerciseEntry();
    renderSoulMirrorTraits();
    showScreen('soulMirrorScreen');
    return;
  }
  if (ex === 'pore') {
    if (typeof _smOriginMode !== 'undefined') _smOriginMode = 'guide';
    switchMode('concentration');
    suppressTutorialForExerciseEntry();
    renderSoulMirrorTraits();
    showScreen('soulMirrorScreen');
    var pbTab = document.querySelector('#soulMirrorTabs [data-tab="breathing"]');
    if (pbTab) pbTab.click();
    // Pre-seed slider to the path breath target so the user doesn't have to adjust it.
    setTimeout(function() {
      var t = (typeof guidePoreBreathTarget === 'function') ? guidePoreBreathTarget() : 7;
      var sl = document.getElementById('poreBreathSlider');
      var disp = document.getElementById('poreBreathCountDisplay');
      if (sl) { sl.value = t; poreBreathTotal = t; if (disp) disp.textContent = t; }
    }, 0);
    return;
  }
  openExerciseSetup(ex);
}
