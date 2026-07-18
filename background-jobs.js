'use strict';

function createRecurringJob(options) {
  const name = options && options.name;
  const intervalMs = options && options.intervalMs;
  const task = options && options.task;
  const logger = options && options.logger;
  const setTimer = (options && options.setTimer) || setTimeout;
  const clearTimer = (options && options.clearTimer) || clearTimeout;
  const now = (options && options.now) || Date.now;

  if (!name || typeof name !== 'string') throw new TypeError('Recurring job name is required');
  if (!Number.isFinite(intervalMs) || intervalMs <= 0) throw new TypeError('Recurring job interval must be positive');
  if (typeof task !== 'function') throw new TypeError('Recurring job task is required');
  if (!logger || typeof logger.error !== 'function') throw new TypeError('Recurring job logger is required');

  let active = false;
  let timer = null;
  let inFlight = null;

  function scheduleNext() {
    if (!active || timer !== null) return;
    timer = setTimer(() => {
      timer = null;
      void runTask();
    }, intervalMs);
    if (timer && typeof timer.unref === 'function') timer.unref();
  }

  function runTask() {
    if (!active) return Promise.resolve();
    if (inFlight) return inFlight;

    const startedAt = now();
    const current = Promise.resolve()
      .then(task)
      .catch(error => {
        logger.error('background_job_failed', {
          job: name,
          durationMs: Math.max(0, now() - startedAt),
          error: {
            name: error && error.name ? error.name : 'Error',
            message: error && error.message ? error.message : String(error || 'Unknown error')
          }
        });
      })
      .finally(() => {
        if (inFlight === current) inFlight = null;
        scheduleNext();
      });
    inFlight = current;
    return current;
  }

  function start() {
    if (active) return;
    active = true;
    scheduleNext();
  }

  async function stop() {
    active = false;
    if (timer !== null) {
      clearTimer(timer);
      timer = null;
    }
    if (inFlight) await inFlight;
  }

  function runNow() {
    if (!active) return Promise.resolve();
    if (timer !== null) {
      clearTimer(timer);
      timer = null;
    }
    return runTask();
  }

  return {
    name,
    start,
    stop,
    runNow,
    isActive: () => active,
    isRunning: () => inFlight !== null
  };
}

module.exports = { createRecurringJob };
