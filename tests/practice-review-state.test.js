'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const Review = require('../practice-review-state');

function memoryStorage() {
  const values = new Map();
  return {
    getItem: key => values.has(key) ? values.get(key) : null,
    setItem: (key, value) => values.set(key, String(value))
  };
}

test('practice review preserves discipline-specific facts without journal prose', () => {
  const storage = memoryStorage();
  Review.record(storage, 'awareness', {
    date:'2026-07-20T14:00:00.000Z', durationMin:20, score:'4.0',
    answers:{drift:2, return:1, redundant:3}, notes:'private words'
  });
  Review.record(storage, 'concentration', {
    date:'2026-07-20T15:00:00.000Z', type:'thought', seconds:75, durationSec:300, tcMode:'observation', notes:'private words'
  });
  Review.record(storage, 'concentration', {
    date:'2026-07-21T15:00:00.000Z', exercise:'pore_breathing', breaths:12, seconds:180
  });

  const summary = Review.summarize(storage, new Date(2026,6,20), new Date(2026,6,22));
  assert.equal(summary.sessions, 3);
  assert.equal(summary.activeDays, 2);
  assert.equal(summary.byPractice.awareness.seconds, 1200);
  assert.equal(summary.byPractice.thought.best, 75);
  assert.equal(summary.byPractice.thought.seconds, 300, 'Thought Control uses full session time, not only its best clear interval');
  assert.equal(summary.byPractice.pore_breathing.best, 12);
  assert.equal(summary.awareness.stability, 4);
  assert.equal(summary.awareness.returnEase, 5);
  assert.equal(summary.awareness.independence, 3);
  assert.doesNotMatch(storage.getItem(Review.STORAGE_KEY), /private words/);
});

test('practice review preserves Closed and Open Eyes Senses progress separately', () => {
  const storage = memoryStorage();
  Review.record(storage, 'concentration', {
    date:'2026-07-20T15:00:00.000Z', exercise:'sense', mode:'feeling',
    eyesMode:'closed', seconds:360, cleanSeconds:300, halts:1
  });
  Review.record(storage, 'concentration', {
    date:'2026-07-21T15:00:00.000Z', exercise:'sense', mode:'feeling',
    eyesMode:'open', seconds:460, cleanSeconds:450, halts:1
  });

  const summary = Review.summarize(storage, new Date(2026,6,20), new Date(2026,6,22));
  assert.equal(summary.byPractice.sense.closedEyesSessions, 1);
  assert.equal(summary.byPractice.sense.openEyesSessions, 1);
  assert.equal(summary.byPractice.sense.closedEyesBest, 300);
  assert.equal(summary.byPractice.sense.openEyesBest, 450);
  assert.equal(summary.byPractice.sense.best, 450);
  assert.equal(Review.normalize('concentration', {
    date:'2026-07-21T15:00:00.000Z', exercise:'sense', eyesMode:'open', cleanSeconds:450
  }).event.o, 1);
});

test('backfill is idempotent and current Guide completion is snapshotted by day', () => {
  const storage = memoryStorage();
  const awareness = [{date:'2026-07-21T10:00:00.000Z',durationMin:10,answers:{drift:3,return:3,redundant:3}}];
  Review.backfill(storage,{awareness});
  Review.backfill(storage,{awareness});
  Review.capturePlan(storage,new Date(2026,6,21),[
    {id:'clock',done:true},
    {id:'visual',done:false},
    {id:'thought',done:false,sessionDone:true}
  ]);

  const summary = Review.summarize(storage,new Date(2026,6,21),new Date(2026,6,22));
  assert.equal(summary.sessions,1);
  assert.deepEqual(summary.plan,{assigned:3,completed:2,days:1});
});

test('daily follow-through freezes its initial Guide assignments while later captures add completions', () => {
  const storage = memoryStorage();
  const day = new Date(2026, 6, 22);
  Review.capturePlan(storage, day, [
    {id:'clock',done:false},
    {id:'thought',done:false}
  ]);
  // The adaptive Guide may recommend something new after Clock is completed.
  // It must not replace today's commitment or discard its completion.
  Review.capturePlan(storage, day, [
    {id:'clock',done:false,sessionDone:true},
    {id:'visual',done:false}
  ]);

  const summary = Review.summarize(storage, day, new Date(2026, 6, 23));
  assert.deepEqual(summary.plan,{assigned:2,completed:1,days:1});
  assert.deepEqual(Review.load(storage).days['2026-07-22'].plan, {
    assigned:['clock','thought'], completed:['clock'], frozen:true
  });
});

test('finishing Soul Mirror then Pore Breathing the same day still counts as one followed-through slot', () => {
  const storage = memoryStorage();
  const day = new Date(2026, 6, 22);
  // Morning: the Guide's daily card is still the Soul Mirror reflection.
  Review.capturePlan(storage, day, [
    {id:'clock',done:true},
    {id:'soulmirror',done:false}
  ]);
  // Later: finishing the Mirror swaps the card to Pore Breathing (id 'pore'),
  // and the player completes it. Without aliasing, this 'pore' completion
  // could never match the frozen 'soulmirror' assignment.
  Review.capturePlan(storage, day, [
    {id:'clock',done:true},
    {id:'pore',done:true}
  ]);

  const summary = Review.summarize(storage, day, new Date(2026, 6, 23));
  assert.deepEqual(summary.plan,{assigned:2,completed:2,days:1});
  assert.deepEqual(Review.load(storage).days['2026-07-22'].plan, {
    assigned:['clock','soulmirror'], completed:['clock','soulmirror'], frozen:true
  });
});

test('older detail rolls into lifetime totals without growing the sync payload forever', () => {
  const storage = memoryStorage();
  const state = { version: 1, days: {} };
  const start = new Date(2020, 0, 1, 12);
  for (let index = 0; index < Review.MAX_DAYS + 2; index += 1) {
    const date = new Date(start);
    date.setDate(date.getDate() + index);
    state.days[Review.dayKey(date)] = { events: { ['e' + index.toString(36)]: { p: 'clock', s: 60, v: 30 } } };
  }
  Review.save(storage, state);

  const stored = Review.load(storage);
  const lifetime = Review.summarize(storage, null, new Date(2030, 0, 1));
  assert.equal(Object.keys(stored.days).length, Review.MAX_DAYS);
  assert.equal(stored.archive.sessions, 2);
  assert.equal(lifetime.sessions, Review.MAX_DAYS + 2);
  assert.equal(lifetime.totalSeconds, (Review.MAX_DAYS + 2) * 60);
  assert.equal(lifetime.byPractice.clock.best, 30);
});

test('event ids are compact and deterministic for cross-device deduplication', () => {
  const entry = { date:'2026-07-21T15:00:00.000Z', type:'visualization', seconds:30 };
  const first = Review.normalize('concentration', entry);
  const second = Review.normalize('concentration', entry);
  assert.equal(first.id, second.id);
  assert.ok(first.id.length <= 9);
});
