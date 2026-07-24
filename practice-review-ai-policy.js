'use strict';

(function exposePracticeReviewAiPolicy(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.PresenceReviewAiPolicy = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function createPracticeReviewAiPolicy() {
  const CHECKPOINT_HOUR = 22;
  const MIN_ACTIVE_DAYS = 2;
  const MIN_SESSIONS = 3;
  const MIN_SECONDS = 15 * 60;
  const NEW_SESSIONS = 2;
  const NEW_SECONDS = 10 * 60;
  const HISTORY_LIMIT = 60;

  function dayStart(value) {
    const date = value instanceof Date ? new Date(value) : new Date(value || Date.now());
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  }

  function addDays(value, amount) {
    const date = dayStart(value);
    date.setDate(date.getDate() + amount);
    return date;
  }

  function dayKey(value) {
    const date = value instanceof Date ? value : new Date(value || Date.now());
    return date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0');
  }

  // At or after 10 PM, today's completed practice enters the checkpoint.
  // Before 10 PM, the most recent checkpoint is yesterday, so an app opened
  // the next morning can still generate the prior evening's review.
  function checkpointEnd(value) {
    const now = value instanceof Date ? new Date(value) : new Date(value || Date.now());
    return now.getHours() >= CHECKPOINT_HOUR ? addDays(now, 1) : dayStart(now);
  }

  function checkpointKey(value) {
    return dayKey(addDays(checkpointEnd(value), -1));
  }

  function checkpointKeyAtOffset(value, utcOffsetMinutes) {
    let offset = Number(utcOffsetMinutes);
    if (!Number.isFinite(offset)) offset = 0;
    offset = Math.max(-840, Math.min(840, offset));
    const input = value instanceof Date ? value.getTime() : Number(value || Date.now());
    const shifted = new Date(input + offset * 60000);
    if (shifted.getUTCHours() < CHECKPOINT_HOUR) shifted.setUTCDate(shifted.getUTCDate() - 1);
    return shifted.getUTCFullYear() + '-'
      + String(shifted.getUTCMonth() + 1).padStart(2, '0') + '-'
      + String(shifted.getUTCDate()).padStart(2, '0');
  }

  function bests(summary) {
    const out = {};
    Object.keys((summary && summary.byPractice) || {}).sort().forEach(key => {
      const best = Math.max(0, Number(summary.byPractice[key] && summary.byPractice[key].best) || 0);
      if (best > 0) out[key] = best;
    });
    return out;
  }

  function metrics(summary) {
    summary = summary || {};
    const suppliedBests = summary.bests && typeof summary.bests === 'object'
      ? Object.keys(summary.bests).slice(0, 32).reduce((out, key) => {
          if (!/^[\w .'-]{1,64}$/.test(key)) return out;
          const value = Math.max(0, Number(summary.bests[key]) || 0);
          if (value > 0) out[key] = value;
          return out;
        }, {})
      : null;
    return {
      activeDays: Math.max(0, Number(summary.activeDays) || 0),
      sessions: Math.max(0, Number(summary.sessions) || 0),
      totalSeconds: Math.max(0, Number(summary.totalSeconds) || 0),
      bests: suppliedBests || bests(summary)
    };
  }

  function qualifies(summary) {
    const value = metrics(summary);
    return value.activeDays >= MIN_ACTIVE_DAYS
      && (value.sessions >= MIN_SESSIONS || value.totalSeconds >= MIN_SECONDS);
  }

  function hasNewBest(current, previous) {
    const now = (current && current.bests) || {};
    const before = (previous && previous.bests) || {};
    return Object.keys(now).some(key => Number(now[key]) > (Number(before[key]) || 0));
  }

  function meaningfulChange(currentSummary, previousMetrics) {
    const current = metrics(currentSummary);
    if (!previousMetrics) return true;
    return current.activeDays >= (Number(previousMetrics.activeDays) || 0) + 1
      || current.sessions >= (Number(previousMetrics.sessions) || 0) + NEW_SESSIONS
      || current.totalSeconds >= (Number(previousMetrics.totalSeconds) || 0) + NEW_SECONDS
      || hasNewBest(current, previousMetrics);
  }

  function stage(period, offset) {
    const past = (Number(offset) || 0) < 0;
    if (period === 'monthly') return past ? 'final' : 'local';
    if (period === 'weekly') return past ? 'final' : 'checkpoint';
    return 'local';
  }

  function eligibility(period, offset, summary, cached, value) {
    const reviewStage = stage(period, offset);
    if (reviewStage === 'local') return { eligible:false, stage:reviewStage, reason:'local-only' };
    if (!qualifies(summary)) return { eligible:false, stage:reviewStage, reason:'insufficient-data' };
    if (reviewStage === 'final') {
      return {
        eligible:!(cached && cached.commentary),
        stage:reviewStage,
        reason:cached && cached.commentary ? 'cached' : 'final'
      };
    }
    const key = checkpointKey(value);
    if (cached && cached.commentary && cached.checkpointKey === key) {
      return { eligible:false, stage:reviewStage, checkpointKey:key, reason:'checkpoint-cached' };
    }
    if (cached && cached.commentary && !meaningfulChange(summary, cached.metrics)) {
      return { eligible:false, stage:reviewStage, checkpointKey:key, reason:'no-meaningful-change' };
    }
    return { eligible:true, stage:reviewStage, checkpointKey:key, reason:'checkpoint' };
  }

  return Object.freeze({
    CHECKPOINT_HOUR,
    MIN_ACTIVE_DAYS,
    MIN_SESSIONS,
    MIN_SECONDS,
    NEW_SESSIONS,
    NEW_SECONDS,
    HISTORY_LIMIT,
    checkpointEnd,
    checkpointKey,
    checkpointKeyAtOffset,
    metrics,
    qualifies,
    meaningfulChange,
    stage,
    eligibility
  });
});
