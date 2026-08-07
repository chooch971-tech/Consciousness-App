'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.join(__dirname, '..');
const guideSource = fs.readFileSync(path.join(root, 'guide-path-client.js'), 'utf8');
const questSource = fs.readFileSync(path.join(root, 'guide-quests-client.js'), 'utf8');
const visualSource = fs.readFileSync(path.join(root, 'visualization-client.js'), 'utf8');
const auditorySource = fs.readFileSync(path.join(root, 'auditory-client.js'), 'utf8');
const clockSource = fs.readFileSync(path.join(root, 'concentration-clock-client.js'), 'utf8');
const reportsSource = fs.readFileSync(path.join(root, 'reports-client.js'), 'utf8');
const presenceSource = fs.readFileSync(path.join(root, 'presence.html'), 'utf8');

function loadTrack(history) {
  const start = guideSource.indexOf('var GUIDE_SENSORY_CLEAN_GOAL_SEC');
  const end = guideSource.indexOf('// ── Practice Tree');
  const context = {
    concState:{ history:history || [] },
    guideState:{},
    guideLocalDayKey:() => '2026-07-26',
    saveGuideState:() => {},
    guideAdvancedTarget:(_id, minutes) => minutes,
    guideClamp:(value, min, max) => Math.max(min, Math.min(max, value)),
    guideFmtTime:seconds => String(seconds),
    GUIDE_FLOOR_CAP:120
  };
  // The sensory ladder reads its per-rung requirement from Thought Control's,
  // which lives outside this slice. Pull in the real function rather than a
  // stub, so a test claiming the two match is actually comparing them.
  const rungStart = guideSource.indexOf('function guideThoughtRungRequired');
  const rungEnd = guideSource.indexOf('\n}', rungStart) + 2;
  vm.runInNewContext(guideSource.slice(rungStart, rungEnd) + '\n'
    + guideSource.slice(start, end), context, { filename:'guide-sensory-track.js' });
  return context;
}

function clean(date, fields) {
  return Object.assign({ date, seconds:300, cleanSeconds:300, halts:0 }, fields);
}

test('sensory foundations keep Bardon order as the recommendation', () => {
  const context = loadTrack([
    clean('2026-07-21T10:00:00.000Z', { type:'visualization', eyesMode:'closed' })
  ]);
  const first = context.guideSensoryTrackProgress();
  // Each faculty is trained closed-eyes first, then open-eyes.
  assert.deepEqual(Array.from(first.stages, stage => stage.id), [
    'visual_closed', 'visual_open',
    'auditory_closed', 'auditory_open',
    'feeling', 'feeling_open',
    'smell', 'smell_open',
    'taste', 'taste_open'
  ]);
  assert.equal(first.goalSec, 300);
  assert.equal(first.stages[0].mastered, true);
  assert.equal(first.stages[1].mastered, false);
  // The recommendation still walks the sequence from the first unmastered stage.
  assert.equal(first.current.id, 'visual_open');

  context.concState.history.push(
    clean('2026-07-22T10:00:00.000Z', { type:'visualization', eyesMode:'open' }),
    // No eyesMode at all — history recorded before open eyes became a stage.
    // It must still count as the closed-eyes foundation it actually was.
    clean('2026-07-23T10:00:00.000Z', { type:'auditory' }),
    clean('2026-07-24T10:00:00.000Z', { type:'auditory', eyesMode:'open' }),
    clean('2026-07-25T10:00:00.000Z', { exercise:'sense', mode:'feeling' }),
    clean('2026-07-26T10:00:00.000Z', { exercise:'sense', mode:'feeling', eyesMode:'open' }),
    clean('2026-07-27T10:00:00.000Z', { exercise:'sense', mode:'smell' }),
    clean('2026-07-28T10:00:00.000Z', { exercise:'sense', mode:'smell', eyesMode:'open' }),
    clean('2026-07-29T10:00:00.000Z', { exercise:'sense', mode:'taste' }),
    clean('2026-07-30T10:00:00.000Z', { exercise:'sense', mode:'taste', eyesMode:'open' })
  );
  const complete = context.guideSensoryTrackProgress();
  assert.equal(complete.complete, true);
  assert.equal(complete.completedCount, 10);
});

test('a stage is mastered on its own evidence, whatever order it came in', () => {
  // These stages used to be chain-gated: a hold only counted if it came after
  // the preceding stage was mastered, so one gap voided everything behind it.
  // The faculties are not built on each other -- they rest on the same capacity
  // to hold attention clean -- so a hold earns its own stage whenever it
  // happened. The order remains what Omnia recommends, not a prerequisite.
  const context = loadTrack([
    clean('2026-07-20T10:00:00.000Z', { type:'visualization', eyesMode:'closed' }),
    clean('2026-07-21T10:00:00.000Z', { type:'visualization', eyesMode:'open' }),
    clean('2026-07-22T10:00:00.000Z', { type:'auditory', eyesMode:'open' })
  ]);
  const progress = context.guideSensoryTrackProgress();
  assert.equal(progress.stages[3].mastered, true, 'the open-eyes hold earns its own stage');
  assert.equal(progress.stages[2].mastered, false, 'the closed-eyes stage was never held');
  assert.equal(progress.current.id, 'auditory_closed', 'and is still what Omnia recommends next');
  assert.equal(progress.completedCount, 3);
});

test('a far-ahead faculty counts without the foundations before it', () => {
  // The reported case: a practitioner with a clean eleven-minute Feeling hold
  // and no Visualization at all was told they had mastered nothing.
  const context = loadTrack([
    { date:'2026-07-22T10:00:00.000Z', exercise:'sense', mode:'feeling',
      eyesMode:'closed', seconds:660, cleanSeconds:660, halts:0 }
  ]);
  const progress = context.guideSensoryTrackProgress();
  assert.equal(progress.completedCount, 1, 'the hold counts');
  assert.equal(progress.stages.find(s => s.id === 'feeling').mastered, true);
  assert.equal(progress.current.id, 'visual_closed', 'Visualization is still recommended first');
});

test('removing a foundation can no longer stall the track', () => {
  // Nothing is gated on a prior stage now, so a foundation the practitioner
  // removed from their path cannot wedge everything behind it.
  const context = loadTrack([
    { date:'2026-07-22T10:00:00.000Z', exercise:'sense', mode:'smell',
      eyesMode:'closed', seconds:400, cleanSeconds:400, halts:0 }
  ]);
  const progress = context.guideSensoryTrackProgress();
  assert.equal(progress.stages.find(s => s.id === 'smell').mastered, true);
});

test('broken or accumulated reps cannot satisfy a sensory foundation', () => {
  const context = loadTrack([
    { date:'2026-07-20T10:00:00.000Z', type:'visualization', eyesMode:'closed', seconds:420, cleanSeconds:299, halts:1 },
    { date:'2026-07-21T10:00:00.000Z', type:'visualization', eyesMode:'closed', seconds:300, halts:0 }
  ]);
  const progress = context.guideSensoryTrackProgress();
  assert.equal(progress.completedCount, 0);
  assert.equal(progress.current.id, 'visual_closed');
  assert.equal(progress.current.bestCleanSec, 299);
});

test('a sensory session climbs a minute at a time from ten, like Thought Control', () => {
  const newStage = loadTrack([]);
  const firstItem = newStage.guideSensoryTrackItem(1);
  assert.equal(firstItem.duration, 10, 'everyone starts at ten');
  assert.equal(firstItem.done, false);
  assert.equal(firstItem.trackProgressSec, 0);
  assert.equal(firstItem.trackGoalSec, 300);
  assert.match(firstItem.trackGoal, /Practice 10–20 min/);
  assert.match(firstItem.trackGoal, /uninterrupted 5:00 hold/);

  function sit(day, seconds) {
    return { date:'2026-07-' + String(day).padStart(2, '0') + 'T10:00:00.000Z',
             type:'visualization', eyesMode:'closed', seconds, sessionDurationSec:seconds,
             cleanSeconds:120, halts:2 };
  }
  const rung = list => {
    const track = loadTrack(list);
    return track.guideSensoryPracticeMinutes(track.guideSensoryTrackProgress().stages[0]);
  };

  // Five sits at the rung is not enough; the sixth earns the next minute.
  assert.equal(rung(Array.from({length:5}, (_, i) => sit(i + 1, 600))), 10);
  assert.equal(rung(Array.from({length:6}, (_, i) => sit(i + 1, 600))), 11);

  // Six ten-minute sits earn 11 but cannot also earn 12 — that needs six
  // sits of eleven.
  assert.equal(rung(Array.from({length:12}, (_, i) => sit(i + 1, 600))), 11);
  assert.equal(rung(Array.from({length:6}, (_, i) => sit(i + 1, 660))), 12);
});

test('the sensory ladder keeps Thought Control\'s pace exactly', () => {
  // Read from guideThoughtRungRequired rather than restated, so the two can
  // never drift apart.
  assert.match(guideSource, /function guideSensoryRungRequired\(rung\) \{\s*\n\s*return guideThoughtRungRequired\(rung\);/);
  const track = loadTrack([]);
  [10, 11, 12, 15, 19].forEach(r => {
    assert.equal(track.guideSensoryRungRequired(r), track.guideThoughtRungRequired(r),
      'rung ' + r + ' must ask what Thought Control asks');
  });
});

// Six sits at every rung from ten up to `top` is exactly what lifts a stage
// to `top`; anything on top of that is the stage's own further evidence.
function ladderTo(top, fields) {
  const out = [];
  for (let rung = 10; rung <= top; rung++) {
    for (let i = 0; i < 6; i++) {
      out.push(Object.assign({
        date:'2026-07-26T10:00:00.000Z', seconds:rung * 60, sessionDurationSec:rung * 60,
        cleanSeconds:120, halts:2
      }, fields));
    }
  }
  return out;
}

const FEELING_CLOSED = { exercise:'sense', type:'sense', mode:'feeling', eyesMode:'closed' };
const FEELING_OPEN = Object.assign({}, FEELING_CLOSED, { eyesMode:'open' });

function naturalFor(history, mode, eyesMode) {
  const track = loadTrack(history);
  return track.guideSensoryNaturalMinutes(track.guideSensoryStageFor(mode, eyesMode));
}

test('opening the eyes on a sense steps the session back five minutes', () => {
  // Holding a feeling against the visible world is the harder version of the
  // same practice, so it must not open at whatever length closed eyes reached.
  // Reach fifteen closed and open eyes starts at ten; reach twenty and it
  // starts at fifteen — never below the ten everything starts at.
  [[10, 10], [11, 10], [15, 10], [18, 13], [20, 15]].forEach(([closedRung, openStart]) => {
    const history = ladderTo(closedRung - 1, FEELING_CLOSED);
    assert.equal(naturalFor(history, 'feeling', 'closed'), closedRung,
      'the fixture must really put closed eyes at ' + closedRung);
    assert.equal(naturalFor(history, 'feeling', 'open'), openStart,
      'closed ' + closedRung + ' must open the eyes at ' + openStart);
  });
});

test('an open-eyes sense stage climbs on from the stepped-back start', () => {
  // The step back sets where the stage begins, not a ceiling: its own sits
  // move it from there.
  const openSits = n => Array.from({length:n}, () => Object.assign({}, FEELING_OPEN,
    { date:'2026-07-26T10:00:00.000Z', seconds:900, sessionDurationSec:900, cleanSeconds:120, halts:2 }));
  const withOpen = n => ladderTo(19, FEELING_CLOSED).concat(openSits(n));

  assert.equal(naturalFor(withOpen(0), 'feeling', 'closed'), 20);
  // Five fifteen-minute sits is one short of the rung, so it is still sitting
  // at the start the step back gave it. Without the step back this reads ten —
  // this is the assertion that tells the two ladders apart.
  assert.equal(naturalFor(withOpen(5), 'feeling', 'open'), 15,
    'five sits have not earned a rung, so it holds at the stepped-back fifteen');
  assert.equal(naturalFor(withOpen(6), 'feeling', 'open'), 16,
    'the sixth earns sixteen');
});

test('Visualization and Auditory keep two independent ladders, with no step back', () => {
  // Their open-eyes stage is a separate stage with its own sits, so it neither
  // inherits the closed length nor is pushed down by it.
  const track = loadTrack(ladderTo(14, { type:'visualization', eyesMode:'closed' })
    .concat(Array.from({length:6}, () => ({ date:'2026-07-26T10:00:00.000Z',
      type:'visualization', eyesMode:'open', seconds:600, sessionDurationSec:600,
      cleanSeconds:120, halts:2 }))));
  const stage = id => track.guideSensoryTrackProgress().stages.filter(s => s.id === id)[0];
  assert.equal(track.guideSensoryNaturalMinutes(stage('visual_closed')), 15);
  assert.equal(track.guideSensoryNaturalMinutes(stage('visual_open')), 11,
    'six of its own ten-minute sits earn eleven, whatever closed eyes reached');
  // The guard is on the exercise, not on the eyes, so this holds for auditory too.
  assert.match(guideSource, /stage\.exercise !== 'sense' \|\| stage\.eyesMode !== 'open'/);
});

test('the step back is explained only when it is the number on screen', () => {
  // The note answers "why did my session get shorter". Showing it beside a
  // length the step back did not set explains a number nobody is looking at —
  // the exact defect that put twelve on the path and twenty on this panel.
  const note = (history, eyesMode, shown) =>
    loadTrack(history).guideSensoryStepBackNote('feeling', eyesMode, shown);
  const closedAt20 = ladderTo(19, FEELING_CLOSED);

  assert.match(note(closedAt20, 'open', 15), /Open eyes starts 5 min below your closed-eyes length/,
    'the stepped-back start itself is explained');
  assert.equal(note(closedAt20, 'closed', 15), '', 'closed eyes never stepped back');
  assert.equal(note(closedAt20, 'open', 16), '',
    'once its own sits have carried it off the start, the number speaks for itself');
  assert.equal(note(closedAt20, 'open', 12), '',
    'a manual target that outranks the start is not the step back either');
  // Nothing to step down from: a faculty with no closed-eyes practice starts at
  // ten because everything does, not because it was stepped back.
  assert.equal(note([], 'open', 10), '');
});

test('the step back can never drop a stage below the ten everyone starts at', () => {
  const track = loadTrack([]);
  assert.equal(track.GUIDE_SENSORY_OPEN_EYES_STEP_BACK, 5);
  // A stage with no closed-eyes evidence at all still starts at ten, not five.
  assert.equal(track.guideSensoryStartRung(track.guideSensoryStageFor('smell', 'open')),
    track.GUIDE_SENSORY_PRACTICE_MIN);
  assert.equal(track.guideSensoryStartRung(null), track.GUIDE_SENSORY_PRACTICE_MIN);
});

test('Visualization, Auditory, and Senses can be manually added as separate cards', () => {
  const start = guideSource.indexOf('function guideMergeAddedItems');
  const end = guideSource.indexOf('function guideApplyTutorialPathChoice');
  const context = {
    guideState:{ _pathAdded:['visual', 'auditory', 'sense'] },
    guideTwoADayEnabled:() => false,
    guideBuildAddedItem:id => ({ id, added:true }),
    buildGuideRegimentItems:() => [],
    GUIDE_EXERCISES:[
      { id:'visual', name:'Visualization' },
      { id:'auditory', name:'Auditory' },
      { id:'sense', name:'Senses' }
    ],
    GUIDE_FOUNDATION_THOUGHT_ORDER:[],
    guideCurrentThoughtMode:() => 'observation',
    guideThoughtStats:() => ({})
  };
  vm.runInNewContext(guideSource.slice(start, end), context, { filename:'guide-manual-sensory.js' });

  const merged = context.guideMergeAddedItems([]);
  assert.deepEqual(Array.from(merged, item => item.id), ['visual', 'auditory', 'sense']);

  context.guideState._pathAdded = [];
  const addable = context.guidePathAddableExercises();
  assert.deepEqual(
    Array.from(addable.filter(ex => ['visual', 'auditory', 'sense'].includes(ex.id)), ex => ex.id),
    ['visual', 'auditory', 'sense']
  );
});

test('exercise records and Path cards expose the evidence and curriculum indicators', () => {
  assert.match(visualSource, /cleanSeconds:\s*bestCleanSec/);
  assert.match(visualSource, /eyesMode:\s*visOpenEyesMode\s*\?\s*'open'\s*:\s*'closed'/);
  assert.match(visualSource, /visualReps:\s*visReps\.map/);
  assert.match(auditorySource, /cleanSeconds:\s*bestCleanSec/);
  assert.match(auditorySource, /auditoryReps:\s*audReps\.map/);
  assert.doesNotMatch(visualSource, /Complete the six sensory foundations to unlock Multi-Sense/);
  assert.doesNotMatch(clockSource, /Complete the six sensory foundations to unlock/);
  assert.doesNotMatch(clockSource, /card\.dataset\.trackLocked/);
  assert.doesNotMatch(clockSource, /card\.style\.pointerEvents = sensoryComplete/);
  assert.match(guideSource, /changing the session time does not change that mastery goal/);
  assert.match(guideSource, /data-guide-eyes/);
  assert.match(guideSource, /Sensory concentration · Stage/);
  assert.match(guideSource, /function guideProgressOverview/);
  assert.match(guideSource, /id:'visual', name:'Visualization'/);
  assert.match(guideSource, /id:'auditory', name:'Auditory'/);
  assert.match(guideSource, /id:'sense', name:'Senses'/);
  assert.match(guideSource, /Visualization, Auditory, and Senses may each coexist/);
  assert.match(guideSource, /function guidePathEyesMode/);
  assert.match(guideSource, /setSenseEyesMode\(eyesMode\)/);
  assert.match(questSource, /class="pq-progress-view"/);
  // Cadence and view are separate controls: reaching Progress must never
  // change how many times a day the practitioner is scheduled to sit.
  assert.match(questSource, /id="pqCadenceBtn"/);
  assert.match(questSource, /id="pqPathViewBtn"/);
  assert.doesNotMatch(questSource, /pqPathCycleBtn/);
  assert.doesNotMatch(questSource, /data-pq-view=/);
  assert.match(questSource, /'Exercise Progress' : 'Exercises'/);
  assert.match(questSource, /data-ex-eyes/);
  assert.match(questSource, /setPathEyesMode/);
  assert.match(presenceSource, /id="pqEyesClosed"/);
  assert.match(presenceSource, /id="pqEyesOpen"/);
  assert.match(questSource, /role="progressbar"/);
  assert.doesNotMatch(questSource, /sensory-goal-bar/);
  assert.doesNotMatch(questSource, /item\.trackNext/);
  assert.match(questSource, /data-sensory-track/);
  assert.match(reportsSource, /sensory_concentration_track/);
  assert.match(reportsSource, /recommended_practice_range_min:\[10, 20\]/);
  assert.match(reportsSource, /next_after_foundations:'multi_sense'/);
  assert.match(reportsSource, /later_stage:'elemental_work'/);
});

test('Multi-Sense can open before the sensory curriculum is complete', () => {
  const openSetup = visualSource.slice(
    visualSource.indexOf('function openExerciseSetup(ex)'),
    visualSource.indexOf('function setAsanaDuration(min)')
  );
  assert.doesNotMatch(openSetup, /guideSensoryTrackProgress/);
  assert.doesNotMatch(openSetup, /ex === 'multisense'[\s\S]*?return;/);
  assert.match(visualSource, /concExpertGrid[\s\S]*?openExerciseSetup\(card\.dataset\.exercise\)/);
});

test('short attempts never lengthen the session', () => {
  function attempt(date, seconds) {
    return {
      type:'visualization', eyesMode:'closed', date,
      seconds, sessionDurationSec:seconds, cleanSeconds:30, halts:4
    };
  }
  const rung = list => {
    const track = loadTrack(list);
    return track.guideSensoryPracticeMinutes(track.guideSensoryTrackProgress().stages[0]);
  };

  // Thirty one-minute attempts is what a struggling practitioner produces. A
  // sit only counts at a rung it actually reached, so none of these count.
  const struggling = Array.from({ length:30 }, (_, i) =>
    attempt('2026-07-' + String(i + 1).padStart(2, '0') + 'T10:00:00.000Z', 60));
  assert.equal(loadTrack(struggling).guideSensoryTrackProgress().stages[0].attempts, 30);
  assert.equal(rung(struggling), 10, 'and the recommendation holds steady at ten');

  // Nor do sits that fall just short of the rung.
  assert.equal(rung(Array.from({length:10}, (_, i) => attempt('2026-07-0' + (i % 9 + 1) + 'T10:00:00.000Z', 540))), 10);

  // One very long sit qualifies at every rung it clears — the same rule Clock,
  // Asana and Thought Control use — but a rung still needs its six sits, so a
  // single hour cannot vault the ladder.
  assert.equal(rung([attempt('2026-07-01T10:00:00.000Z', 3600)]), 10);
  assert.equal(rung(Array.from({length:6}, (_, i) => attempt('2026-07-0' + (i + 1) + 'T10:00:00.000Z', 3600))), 20);
});

test('the Progress view describes only what is on today\'s path', () => {
  // Cards are filtered against the real path, so an exercise the practitioner
  // removed is not explained back to them.
  assert.match(guideSource, /function pathItemForCard\(cardId\)/);
  assert.match(guideSource, /cards\.filter\(function\(card\) \{ return !!pathItemForCard\(card\.id\); \}\)/);
  // The intro reads the path too, rather than announcing a curriculum stage
  // that was removed from it.
  assert.match(guideSource, /function guideProgressIntro/);
  assert.match(guideSource, /buildGuideRegimentItems\(\) \|\| \[\]/);
  // The intro is scannable labelled rows rather than a paragraph of prose.
  assert.match(guideSource, /class="pq-intro-row"/);
  assert.match(guideSource, /row\('Schedule'/);
  assert.match(guideSource, /row\('Next', guideSensoryStageLabel\(sensory\.next\)\)/);
  assert.match(guideSource, /None on your path/);
  // "None on your path" must mean none. The sensoryTrack flag marks only the
  // sequential curriculum card, so a faculty added with "+" or rotated in on
  // the experienced regiment carries no flag and was being reported as absent
  // while sitting right there on the path.
  assert.match(guideSource, /var GUIDE_SENSORY_ITEM_IDS = \{/);
  assert.match(guideSource, /GUIDE_SENSORY_ITEM_IDS\[it\.id\]/);
  assert.match(guideSource, /} else if \(sensoryOnPath\.length\) \{/);
  assert.doesNotMatch(guideSource, /the single most neglected of Visualization/);
});
