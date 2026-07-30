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
  vm.runInNewContext(guideSource.slice(start, end), context, { filename:'guide-sensory-track.js' });
  return context;
}

function clean(date, fields) {
  return Object.assign({ date, seconds:300, cleanSeconds:300, halts:0 }, fields);
}

test('sensory foundations follow the Bardon order and require sequential clean five-minute holds', () => {
  const context = loadTrack([
    // Practicing Open Eyes early cannot be banked before Closed Eyes mastery.
    clean('2026-07-20T10:00:00.000Z', { type:'visualization', eyesMode:'open' }),
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

test('an open-eyes hold cannot satisfy the closed-eyes foundation that precedes it', () => {
  // Practicing the harder successor first must not skip the foundation, the
  // same rule Visualization has always enforced across its two stages.
  const context = loadTrack([
    clean('2026-07-20T10:00:00.000Z', { type:'visualization', eyesMode:'closed' }),
    clean('2026-07-21T10:00:00.000Z', { type:'visualization', eyesMode:'open' }),
    clean('2026-07-22T10:00:00.000Z', { type:'auditory', eyesMode:'open' })
  ]);
  const progress = context.guideSensoryTrackProgress();
  assert.equal(progress.current.id, 'auditory_closed');
  assert.equal(progress.stages[2].mastered, false);
  assert.equal(progress.stages[3].mastered, false);

  // Supplying the closed-eyes hold then unlocks both in order.
  context.concState.history.push(clean('2026-07-23T10:00:00.000Z', { type:'auditory' }));
  const after = context.guideSensoryTrackProgress();
  assert.equal(after.stages[2].mastered, true);
  assert.equal(after.current.id, 'auditory_open');
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

test('sensory practice sessions progress through 10–20 minutes while mastery remains a clean five-minute hold', () => {
  const newStage = loadTrack([]);
  const firstItem = newStage.guideSensoryTrackItem(1);
  assert.equal(firstItem.duration, 10);
  assert.equal(firstItem.done, false);
  assert.equal(firstItem.trackProgressSec, 0);
  assert.equal(firstItem.trackGoalSec, 300);
  assert.match(firstItem.trackGoal, /Practice 10–20 min/);
  assert.match(firstItem.trackGoal, /uninterrupted 5:00 hold/);

  const developingStage = loadTrack([
    { date:'2026-07-20T10:00:00.000Z', type:'visualization', eyesMode:'closed', seconds:120, xpEarned:600, cleanSeconds:120, halts:2 }
  ]);
  assert.equal(developingStage.guideSensoryTrackItem(1).duration, 15);

  const establishedStage = loadTrack([
    { date:'2026-07-20T10:00:00.000Z', type:'visualization', eyesMode:'closed', seconds:180, sessionDurationSec:900, cleanSeconds:180, halts:3 }
  ]);
  const establishedItem = establishedStage.guideSensoryTrackItem(1);
  assert.equal(establishedItem.duration, 20);
  assert.equal(establishedItem.done, false);
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
  assert.match(visualSource, /Complete the six sensory foundations to unlock Multi-Sense/);
  assert.match(clockSource, /card\.dataset\.trackLocked/);
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

test('lengthening a sensory practice session requires attempts that were real sits', () => {
  function attempt(date, seconds) {
    return {
      type:'visualization', eyesMode:'closed', date,
      seconds, sessionDurationSec:seconds, cleanSeconds:30, halts:4
    };
  }
  // Thirty one-minute attempts is what a struggling practitioner produces. It
  // must not push the recommended session all the way to twenty minutes.
  const struggling = loadTrack(Array.from({ length:30 }, (_, i) =>
    attempt('2026-07-' + String(i + 1).padStart(2, '0') + 'T10:00:00.000Z', 60)));
  const strugglingStage = struggling.guideSensoryTrackProgress().stages[0];
  assert.equal(strugglingStage.attempts, 30);
  assert.equal(struggling.guideSensoryPracticeMinutes(strugglingStage), 10);

  // Three attempts that each ran at least half the ten-minute range still earn
  // the longer session, so an imperfect practitioner is never stuck at 10.
  const solid = loadTrack(Array.from({ length:3 }, (_, i) =>
    attempt('2026-07-0' + (i + 1) + 'T10:00:00.000Z', 300)));
  assert.equal(solid.guideSensoryPracticeMinutes(solid.guideSensoryTrackProgress().stages[0]), 15);

  // A single completed ten-minute sit is enough on its own.
  const oneLong = loadTrack([attempt('2026-07-01T10:00:00.000Z', 600)]);
  assert.equal(oneLong.guideSensoryPracticeMinutes(oneLong.guideSensoryTrackProgress().stages[0]), 15);
});

test('the Progress view describes only what is on today\'s path', () => {
  // Cards are filtered against the real path, so an exercise the practitioner
  // removed is not explained back to them.
  assert.match(guideSource, /function guideProgressCardIds/);
  assert.match(guideSource, /onPath \? cards\.filter/);
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
