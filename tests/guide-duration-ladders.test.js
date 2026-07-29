'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.join(__dirname, '..');
const guideSource = fs.readFileSync(path.join(root, 'guide-path-client.js'), 'utf8');

// The Asana and Auditory ladders live between these two markers and depend only
// on concState.history plus a few small helpers, so they can be exercised
// directly without standing up the whole Guide client.
function loadLadders(history, guideState) {
  const start = guideSource.indexOf('function asanaTierRequired');
  const end = guideSource.indexOf('function guideThoughtStats');
  const context = {
    concState:{ history:history || [] },
    guideState:guideState || {},
    localStorage:{ getItem:() => null, setItem:() => {} },
    guideIsToday:() => false,
    guideClamp:(value, min, max) => Math.max(min, Math.min(max, value)),
    guideSessionSec:entry => Math.max(0, parseInt(entry && entry.seconds, 10) || 0),
    guideFloorMin:id => (context.guideState._advancedFloors || {})[id] || 0,
    guideAutoAdvanceOn:id => {
      const auto = (context.guideState._advanceAuto || {})[id];
      return auto === undefined ? true : !!auto;
    },
    guideAdvanceSetAt:id => (context.guideState._advanceSetAt || {})[id] || 0,
    GUIDE_FLOOR_CAP:120
  };
  vm.runInNewContext(guideSource.slice(start, end), context, { filename:'guide-duration-ladders.js' });
  return context;
}

const DAY = 86400000;
function sessions(count, minutes, fields) {
  const out = [];
  for (let i = 0; i < count; i++) {
    out.push(Object.assign({
      date:new Date(Date.UTC(2026, 0, 1) + i * DAY).toISOString(),
      seconds:minutes * 60
    }, fields));
  }
  return out;
}

test('Asana recognizes a practitioner who already sits long instead of making them climb every rung', () => {
  // Seven full 30-minute sits clear the 5/10/15/20/25 holds (7 each) and the
  // single-session rungs between them all at once — the capable practitioner is
  // recognized immediately rather than after 55 sessions.
  const fast = loadLadders(sessions(7, 30, { exercise:'asana' }));
  const at30 = fast.guideAsanaStats();
  assert.equal(at30.qualTarget, 30);
  assert.equal(at30.atCap, true);

  // One qualifying sit is not enough to leave the opening rung.
  const single = loadLadders(sessions(1, 30, { exercise:'asana' })).guideAsanaStats();
  assert.equal(single.qualTarget, 5);
  assert.equal(single.qualAtTier, 1);
  assert.equal(single.tierRequired, 7);
});

test('Asana still refuses to raise the target off sessions that never reach the next rung', () => {
  // Twenty 5-minute sits clear the 7-session hold at 5 but can never qualify at
  // 6, so the recommendation stops there. Volume alone does not inflate it.
  const stats = loadLadders(sessions(20, 5, { exercise:'asana' })).guideAsanaStats();
  assert.equal(stats.qualTarget, 6);
  assert.equal(stats.atCap, false);
});

test('Auditory opens at ten minutes and advances through 15 to 20 on seven qualifying sessions', () => {
  const fresh = loadLadders([]).guideAuditoryStats();
  assert.equal(fresh.qualTarget, 10);
  assert.equal(fresh.tierRequired, 7);

  // Short sits never qualify at the opening rung.
  const short = loadLadders(sessions(10, 5, { type:'auditory' })).guideAuditoryStats();
  assert.equal(short.qualTarget, 10);
  assert.equal(short.qualAtTier, 0);

  const six = loadLadders(sessions(6, 10, { type:'auditory' })).guideAuditoryStats();
  assert.equal(six.qualTarget, 10);
  assert.equal(six.qualAtTier, 6);

  const seven = loadLadders(sessions(7, 10, { type:'auditory' })).guideAuditoryStats();
  assert.equal(seven.qualTarget, 15);

  // A 15-minute sit qualifies at the 10-minute rung too, so both rungs clear
  // together — the same skip-ahead Clock has always had.
  const long = loadLadders(sessions(7, 15, { type:'auditory' })).guideAuditoryStats();
  assert.equal(long.qualTarget, 20);
  assert.equal(long.atCap, true);
});

// The Thought Control ladder needs the stats collector plus the ladder itself.
function loadThought(history) {
  const start = guideSource.indexOf('function guideThoughtStats');
  const end = guideSource.indexOf('function guideSenseStats');
  const context = {
    concState:{ history:history || [] },
    guideState:{},
    GUIDE_FOUNDATION_THOUGHT_ORDER:['observation', 'focus', 'vacancy'],
    guideIsToday:() => false,
    guideClamp:(value, min, max) => Math.max(min, Math.min(max, value)),
    guideHistorySeconds:entry => Math.max(0, parseInt(entry && entry.seconds, 10) || 0),
    guideThoughtDuration:entry => Math.max(0, parseInt(entry && entry.durationSec, 10) || 0),
    guideFloorMin:() => 0,
    guideAutoAdvanceOn:() => true,
    guideAdvanceSetAt:() => 0,
    guideAdvancedTarget:(_id, minutes) => minutes
  };
  vm.runInNewContext(guideSource.slice(start, end), context, { filename:'guide-thought-ladder.js' });
  return context;
}

function thoughtSits(count, seconds) {
  const out = [];
  for (let i = 0; i < count; i++) {
    out.push({
      type:'thought', tcMode:'observation', durationSec:seconds, seconds:seconds,
      date:new Date(Date.UTC(2026, 0, 1) + i * DAY).toISOString()
    });
  }
  return out;
}

test('Thought Control will not raise its target off sessions that never reach the rung', () => {
  // A hundred thirty-second sits used to earn a fifteen-minute recommendation,
  // because the ladder counted sessions without asking how long they ran.
  const tiny = loadThought(thoughtSits(100, 30));
  assert.equal(tiny.guideThoughtTargetMinutes('observation', tiny.guideThoughtStats()), 5);

  // Two genuine ten-minute sits clear every rung below ten at once.
  const real = loadThought(thoughtSits(2, 600));
  assert.equal(real.guideThoughtTargetMinutes('observation', real.guideThoughtStats()), 10);
});

test('Thought Control keeps its original pacing for a practitioner who sits the recommendation', () => {
  // 2 qualifying sessions per minute up to 10, then 6 per minute up to 15 —
  // the same forty sessions the count-based ladder took.
  const history = [];
  let sessions = 0;
  let target = 5;
  while (sessions < 200) {
    const context = loadThought(history);
    target = context.guideThoughtTargetMinutes('observation', context.guideThoughtStats());
    if (target >= 15) break;
    history.push(thoughtSits(1, target * 60)[0]);
    history[history.length - 1].date = new Date(Date.UTC(2026, 0, 1) + sessions * DAY).toISOString();
    sessions++;
  }
  assert.equal(target, 15);
  assert.equal(sessions, 40);
});

test('an advanced floor sets the starting rung and only later sessions climb past it', () => {
  const setAt = Date.UTC(2026, 5, 1);
  const guideState = {
    _advancedFloors:{ auditory:30 },
    _advanceAuto:{ auditory:true },
    _advanceSetAt:{ auditory:setAt }
  };
  // History predating the override establishes the start but must not climb it.
  const stats = loadLadders(sessions(20, 40, { type:'auditory' }), guideState).guideAuditoryStats();
  assert.equal(stats.qualTarget, 30);

  // With auto-advance off the target is pinned to the chosen start.
  const locked = loadLadders(sessions(20, 40, { type:'auditory' }), {
    _advancedFloors:{ auditory:30 },
    _advanceAuto:{ auditory:false }
  }).guideAuditoryStats();
  assert.equal(locked.qualTarget, 30);
  assert.equal(locked.locked, true);
});

// Omnia's proactive "I'm Advanced" offer.
function loadOffer(history, guideState) {
  const start = guideSource.indexOf('var GUIDE_ADV_OFFER_SESSIONS');
  const end = guideSource.indexOf('// Current recommended minutes');
  const context = {
    concState:{ history:history || [] },
    guideState:guideState || {},
    GUIDE_TIMED_EXERCISES:['clock', 'visual', 'auditory', 'thought', 'asana'],
    GUIDE_THOUGHT_MODES:{ observation:1, focus:1, vacancy:1 },
    GUIDE_SENSE_MODES:{ feeling:1, smell:1, taste:1 },
    GUIDE_FLOOR_CAP:120,
    guideClamp:(value, min, max) => Math.max(min, Math.min(max, value)),
    guideFloorKey:(exId) => exId,
    guideFloorMin:id => (context.guideState._advancedFloors || {})[id] || 0,
    guideHistoryExerciseId:entry => (entry && entry.ex) || 'clock',
    guideSessionSec:entry => Math.max(0, parseInt(entry && entry.seconds, 10) || 0),
    guideThoughtDuration:entry => Math.max(0, parseInt(entry && entry.durationSec, 10) || 0),
    guideSensoryEntryPracticeSec:entry => Math.max(0, parseInt(entry && entry.seconds, 10) || 0),
    saveGuideState:() => {}
  };
  vm.runInNewContext(guideSource.slice(start, end), context, { filename:'guide-advanced-offer.js' });
  return context;
}

function clockSits(seconds) {
  return seconds.map((sec, i) => ({
    ex:'clock', seconds:sec,
    date:new Date(Date.UTC(2026, 0, 10) - i * DAY).toISOString()
  }));
}

test('Omnia offers a higher starting point only when recent sits consistently clear it', () => {
  // Three 20-minute sits against a 10-minute recommendation.
  const ready = loadOffer(clockSits([1200, 1200, 1200]));
  const offer = ready.guideAdvancedOffer('clock', null, 10);
  assert.equal(offer.minutes, 20);
  assert.equal(offer.from, 10);

  // The offer names a length every one of those sits actually held, not the best.
  const uneven = loadOffer(clockSits([2400, 1200, 1800]));
  assert.equal(uneven.guideAdvancedOffer('clock', null, 10).minutes, 20);

  // A single short sit breaks the run, so an inconsistent practitioner is not nagged.
  const broken = loadOffer(clockSits([120, 1200, 1200]));
  assert.equal(broken.guideAdvancedOffer('clock', null, 10), null);

  // Sitting only slightly over the recommendation is not a mismatch worth raising.
  const marginal = loadOffer(clockSits([720, 720, 720]));
  assert.equal(marginal.guideAdvancedOffer('clock', null, 10), null);

  // Too little history to judge.
  const sparse = loadOffer(clockSits([1200, 1200]));
  assert.equal(sparse.guideAdvancedOffer('clock', null, 10), null);
});

test('the advanced offer stays quiet once a floor exists or the practitioner declines', () => {
  const withFloor = loadOffer(clockSits([1200, 1200, 1200]), { _advancedFloors:{ clock:15 } });
  assert.equal(withFloor.guideAdvancedOffer('clock', null, 10), null);

  const context = loadOffer(clockSits([1200, 1200, 1200]));
  assert.notEqual(context.guideAdvancedOffer('clock', null, 10), null);
  context.guideDismissAdvancedOffer('clock');
  assert.equal(context.guideState._advOfferDismissed.clock, true);
  assert.equal(context.guideAdvancedOffer('clock', null, 10), null);
});
