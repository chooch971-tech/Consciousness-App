'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createRecurringJob } = require('../background-jobs');

function createHarness(task) {
  const scheduled = [];
  const cleared = [];
  const errors = [];
  let nextId = 1;
  const job = createRecurringJob({
    name: 'test-job',
    intervalMs: 250,
    task,
    logger: { error: (event, fields) => errors.push({ event, fields }) },
    setTimer: (handler, delay) => {
      const timer = { id: nextId++, handler, delay, unref() {} };
      scheduled.push(timer);
      return timer;
    },
    clearTimer: timer => cleared.push(timer.id),
    now: () => 1000
  });
  return { job, scheduled, cleared, errors };
}

test('recurring jobs schedule only after start and remain idempotent', async () => {
  let runs = 0;
  const harness = createHarness(() => { runs++; });
  assert.equal(harness.scheduled.length, 0);
  harness.job.start();
  harness.job.start();
  assert.equal(harness.scheduled.length, 1);
  assert.equal(harness.scheduled[0].delay, 250);

  await harness.job.runNow();
  assert.equal(runs, 1);
  assert.deepEqual(harness.cleared, [1]);
  assert.equal(harness.scheduled.length, 2, 'completion schedules exactly one next run');
  await harness.job.stop();
  assert.equal(harness.job.isActive(), false);
  assert.deepEqual(harness.cleared, [1, 2]);
});

test('recurring jobs never overlap an in-flight task', async () => {
  let release;
  let runs = 0;
  const harness = createHarness(() => {
    runs++;
    return new Promise(resolve => { release = resolve; });
  });
  harness.job.start();
  const first = harness.job.runNow();
  const second = harness.job.runNow();
  await Promise.resolve();
  assert.equal(runs, 1);
  assert.equal(harness.job.isRunning(), true);
  release();
  await Promise.all([first, second]);
  assert.equal(runs, 1);
  await harness.job.stop();
});

test('recurring jobs log failures and continue scheduling', async () => {
  const harness = createHarness(() => { throw new Error('temporary outage'); });
  harness.job.start();
  await harness.job.runNow();
  assert.equal(harness.errors.length, 1);
  assert.equal(harness.errors[0].event, 'background_job_failed');
  assert.equal(harness.errors[0].fields.job, 'test-job');
  assert.deepEqual(harness.errors[0].fields.error, { name: 'Error', message: 'temporary outage' });
  assert.equal(harness.scheduled.length, 2, 'a failed run still schedules its next attempt');
  await harness.job.stop();
});

test('server starts jobs after MongoDB and drains them during shutdown', () => {
  const server = fs.readFileSync(path.join(__dirname, '..', 'server.js'), 'utf8');
  assert.doesNotMatch(server, /setInterval\(/);
  assert.match(server, /connectDB\(\)\.then\(\(\) => \{[\s\S]*?startBackgroundJobs\(\)/);
  assert.match(server, /async function shutdown\(signal\)[\s\S]*?await stopBackgroundJobs\(\)/);
  assert.match(server, /name: 'awareness-sessions'/);
  assert.match(server, /name: 'prayer-schedules'/);
  assert.match(server, /name: 'practice-schedules'/);
  assert.match(server, /name: 'rate-limit-cleanup'/);
});
