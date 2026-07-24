'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const Policy = require('../practice-review-ai-policy');

function summary(activeDays, sessions, totalSeconds, best) {
  return {
    activeDays,
    sessions,
    totalSeconds,
    byPractice: best ? { clock: { best } } : {}
  };
}

test('weekly AI waits for two active days and enough sessions or time', () => {
  assert.equal(Policy.qualifies(summary(1, 5, 2000)), false);
  assert.equal(Policy.qualifies(summary(2, 2, 899)), false);
  assert.equal(Policy.qualifies(summary(2, 3, 300)), true);
  assert.equal(Policy.qualifies(summary(2, 1, 900)), true);
});

test('10 PM checkpoint includes today and morning uses last night', () => {
  assert.equal(Policy.checkpointKey(new Date(2026, 6, 23, 21, 59)), '2026-07-22');
  assert.equal(Policy.checkpointKey(new Date(2026, 6, 23, 22, 0)), '2026-07-23');
  assert.equal(Policy.checkpointKey(new Date(2026, 6, 24, 8, 0)), '2026-07-23');
});

test('server checkpoint follows the supplied player offset', () => {
  const instant = new Date('2026-07-23T21:30:00.000Z');
  assert.equal(Policy.checkpointKeyAtOffset(instant, -240), '2026-07-22');
  assert.equal(Policy.checkpointKeyAtOffset(instant, 120), '2026-07-23');
});

test('current weekly insight refreshes once per checkpoint only after meaningful data', () => {
  const now = new Date(2026, 6, 23, 22, 30);
  const first = summary(2, 3, 900, 40);
  assert.equal(Policy.eligibility('weekly', 0, first, null, now).eligible, true);

  const cached = {
    commentary:'Seen',
    checkpointKey:'2026-07-22',
    metrics:Policy.metrics(first)
  };
  assert.equal(Policy.eligibility('weekly', 0, summary(2, 4, 1100, 40), cached, now).eligible, false);
  assert.equal(Policy.eligibility('weekly', 0, summary(3, 4, 1100, 40), cached, now).eligible, true);
  assert.equal(Policy.eligibility('weekly', 0, summary(2, 5, 1100, 40), cached, now).eligible, true);
  assert.equal(Policy.eligibility('weekly', 0, summary(2, 4, 1500, 40), cached, now).eligible, true);
  assert.equal(Policy.eligibility('weekly', 0, summary(2, 4, 1100, 41), cached, now).eligible, true);

  cached.checkpointKey = '2026-07-23';
  assert.equal(Policy.eligibility('weekly', 0, summary(5, 9, 4000, 90), cached, now).eligible, false);
});

test('monthly is local while in progress and generates once when complete', () => {
  const enough = summary(4, 8, 3600, 60);
  assert.equal(Policy.eligibility('monthly', 0, enough, null, new Date()).eligible, false);
  assert.equal(Policy.eligibility('monthly', -1, enough, null, new Date()).eligible, true);
  assert.equal(Policy.eligibility('monthly', -1, enough, { commentary:'Final' }, new Date()).eligible, false);
});

test('normalized cached metrics preserve bests for server-side refresh checks', () => {
  const normalized = Policy.metrics({
    activeDays:2,
    sessions:3,
    totalSeconds:900,
    bests:{ clock:40 }
  });
  assert.deepEqual(normalized.bests, { clock:40 });
  assert.equal(Policy.meaningfulChange(
    { activeDays:2, sessions:3, totalSeconds:900, bests:{ clock:41 } },
    normalized
  ), true);
});
