'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.join(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'multisense-steps-client.js'), 'utf8');

function load() {
  const context = { console };
  vm.runInNewContext(source, context, { filename:'multisense-steps-client.js' });
  return context;
}

test('every section follows the book: each stage is held eyes closed before eyes open', () => {
  const { MS3_SECTIONS, ms3Steps } = load();
  MS3_SECTIONS.forEach(section => {
    const steps = ms3Steps(section);
    for (let i = 0; i < steps.length; i += 2) {
      assert.equal(steps[i].eyes, 'closed', section.id + ' starts each stage with eyes closed');
      assert.equal(steps[i + 1].eyes, 'open');
      assert.equal(steps[i].stage.id, steps[i + 1].stage.id);
    }
  });
});

test('Step III covers objects, known and unseen places, animals still and moving, people and strangers', () => {
  const { MS3_SECTIONS, ms3Section } = load();
  assert.equal(MS3_SECTIONS.map(s => s.id).join(','), 'objects,known_places,new_places,animals,people,strangers');
  assert.equal(ms3Section('animals').stages.map(s => s.id).join(','), 'still,moving');
  assert.equal(ms3Section('people').stages.map(s => s.id).join(','), 'face,head,motion,voice');
  assert.equal(ms3Section('known_places').stages.map(s => s.id).join(','), 'see,hear');
});

test('a stage is complete only at five minutes, and the next stage is the first one not yet held', () => {
  const { ms3Section, ms3NextStep, ms3SectionProgress, ms3StepDone } = load();
  const people = ms3Section('people');
  const records = { 'ms3:people:face:closed': 300, 'ms3:people:face:open': 299 };
  assert.equal(ms3StepDone('people', 'face', 'closed', records), true);
  assert.equal(ms3StepDone('people', 'face', 'open', records), false, '4:59 is not five minutes');
  const next = ms3NextStep(people, records);
  assert.equal(next.stage.id + ':' + next.eyes, 'face:open');
  assert.equal(ms3SectionProgress(people, records).done, 1);
  assert.equal(ms3SectionProgress(people, records).total, 8);
});

test('a finished section keeps offering its last stage rather than nothing', () => {
  const { ms3Section, ms3NextStep } = load();
  const records = { 'ms3:objects:senses:closed': 400, 'ms3:objects:senses:open': 320 };
  const next = ms3NextStep(ms3Section('objects'), records);
  assert.equal(next.stage.id + ':' + next.eyes, 'senses:open');
});

test('a sit is logged with its best hold, so records and personal bests can compare like with like', () => {
  const { ms3Entry } = load();
  const entry = ms3Entry({ section:'animals', stage:'moving', eyes:'open', subject:'A bird in flight' }, [40, 130, 75], 400, new Date('2026-11-26T08:00:00Z'));
  assert.equal(entry.type, 'multi-sense');
  assert.equal(entry.msSection, 'animals');
  assert.equal(entry.msStage, 'moving');
  assert.equal(entry.eyesMode, 'open');
  assert.equal(entry.seconds, 130);
  assert.equal(entry.reps, 3);
  assert.equal(entry.xpEarned, 245, 'XP is the time actually held, like Visualization');
});

test('personal bests compare Step III holds only within the same section, stage and eyes', () => {
  const pbSource = fs.readFileSync(path.join(root, 'personal-best-client.js'), 'utf8');
  const ctx = { console, window:{} };
  vm.runInNewContext(pbSource, ctx);
  const a = ctx.pbDescribe({ type:'multi-sense', msSection:'animals', msStage:'still', eyesMode:'closed', seconds:90 });
  const b = ctx.pbDescribe({ type:'multi-sense', msSection:'animals', msStage:'still', eyesMode:'open', seconds:90 });
  assert.notEqual(a.group, b.group);
  assert.equal(ctx.pbDescribe({ type:'multi-sense', object:'old flat log' }), null, 'old untimed logs never drag down an average');
});
