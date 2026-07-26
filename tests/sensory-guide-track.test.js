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
  assert.deepEqual(Array.from(first.stages, stage => stage.id), [
    'visual_closed', 'visual_open', 'auditory', 'feeling', 'smell', 'taste'
  ]);
  assert.equal(first.goalSec, 300);
  assert.equal(first.stages[0].mastered, true);
  assert.equal(first.stages[1].mastered, false);
  assert.equal(first.current.id, 'visual_open');

  context.concState.history.push(
    clean('2026-07-22T10:00:00.000Z', { type:'visualization', eyesMode:'open' }),
    clean('2026-07-23T10:00:00.000Z', { type:'auditory' }),
    clean('2026-07-24T10:00:00.000Z', { exercise:'sense', mode:'feeling' }),
    clean('2026-07-25T10:00:00.000Z', { exercise:'sense', mode:'smell' }),
    clean('2026-07-26T10:00:00.000Z', { exercise:'sense', mode:'taste' })
  );
  const complete = context.guideSensoryTrackProgress();
  assert.equal(complete.complete, true);
  assert.equal(complete.completedCount, 6);
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
  assert.match(questSource, /item\.trackLabel/);
  assert.match(questSource, /data-sensory-track/);
  assert.match(reportsSource, /sensory_concentration_track/);
  assert.match(reportsSource, /recommended_practice_range_min:\[10, 20\]/);
  assert.match(reportsSource, /next_after_foundations:'multi_sense'/);
  assert.match(reportsSource, /later_stage:'elemental_work'/);
});
