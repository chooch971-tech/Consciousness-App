'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const rewards = fs.readFileSync(path.join(__dirname, '..', 'omnia-rewards-client.js'), 'utf8');

function bodyAwardContext() {
  const day = '2026-07-21';
  const items = [
    { id: 'clock', done: false },
    { id: 'visual', done: false },
    { id: 'auditory', done: false },
    { id: 'observation', done: false },
    { id: 'feeling', done: false },
    { id: 'asana', done: false },
    { id: 'pore', done: false }
  ];
  const context = {
    Date,
    Math,
    PRESTIGE_BOOK2: 3,
    authUsername: 'daily_shuffle_test',
    guideState: { _pathLockedV2: true },
    omniaState: {
      bardonStep: 6,
      bodies: { physical: 1, astral: 1, mental: 1 },
      bodyAwardsDate: day,
      bodyAwardsToday: 0
    },
    OMNIA_EXERCISE_META: {
      clock: { body: 'mental' }, visual: { body: 'astral' }, auditory: { body: 'astral' },
      thought: { body: 'mental' }, sense: { body: 'astral' }, asana: { body: 'physical' },
      pore_breathing: { body: 'physical' }
    },
    presenceDayKey: () => day,
    buildGuideRegimentItems: () => items.map(item => ({ ...item })),
    saveOmniaState: () => {}
  };
  vm.createContext(context);
  vm.runInContext(rewards, context);
  return { context, items };
}

test('body-level cards use one shuffled queue for the whole day', () => {
  const { context, items } = bodyAwardContext();
  const first = { ...context.omniaHighlightedExerciseIds() };
  const storedQueue = [...context.omniaState.bodyAwardSelectionIds];

  assert.equal(Object.keys(first).length, 4, 'Step VI should expose four current award slots');
  assert.notDeepEqual(storedQueue, items.map(item => item.id), 'daily queue should not follow display order');

  // Mimic a cadence change: cards reorder and their done calculation changes.
  items.reverse();
  items.forEach((item, index) => { item.done = index % 2 === 0; });
  const afterCadenceChange = { ...context.omniaHighlightedExerciseIds() };

  assert.deepEqual(afterCadenceChange, first, '2x/day → 1x/day must not reroll body awards');
  assert.deepEqual([...context.omniaState.bodyAwardSelectionIds], storedQueue);
});

test('claiming a body award advances the persisted queue without reusing that card', () => {
  const { context } = bodyAwardContext();
  const first = { ...context.omniaHighlightedExerciseIds() };
  const claimedCard = Object.values(first)[0];

  context.omniaConsumeBodyAward(claimedCard);
  const next = { ...context.omniaHighlightedExerciseIds() };

  assert.equal(Object.values(next).includes(claimedCard), false);
  assert.equal(context.omniaState.bodyAwardsToday, 1);
  assert.deepEqual([...context.omniaState.bodyAwardClaimedIds], [claimedCard]);
});
