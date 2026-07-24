'use strict';

(function exposePracticeReview(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.PresencePracticeReview = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function createPracticeReviewState() {
  const STORAGE_KEY = 'presence_practice_review_v1';
  const VERSION = 1;
  // Keep recent session-level facts for comparisons and roll older days into
  // compact lifetime totals. This keeps the whole cloud snapshot comfortably
  // below the server's deliberate 1 MB request ceiling even after years of use.
  const MAX_DAYS = 1095;

  function blank() {
    return { version: VERSION, days: {}, _updatedAt: 0 };
  }

  function parse(raw) {
    if (!raw) return blank();
    try {
      const value = typeof raw === 'string' ? JSON.parse(raw) : raw;
      if (!value || typeof value !== 'object') return blank();
      if (!value.days || typeof value.days !== 'object') value.days = {};
      value.version = VERSION;
      return value;
    } catch (error) {
      return blank();
    }
  }

  function load(storage) {
    return parse(storage && storage.getItem ? storage.getItem(STORAGE_KEY) : null);
  }

  function save(storage, state) {
    if (!storage || typeof storage.setItem !== 'function') return state;
    const keys = Object.keys(state.days || {}).sort();
    if (keys.length > MAX_DAYS) keys.slice(0, keys.length - MAX_DAYS).forEach(key => {
      archiveDay(state, key, state.days[key]);
      delete state.days[key];
    });
    state.version = VERSION;
    state._updatedAt = Date.now();
    storage.setItem(STORAGE_KEY, JSON.stringify(state));
    return state;
  }

  function dayKey(value) {
    const date = value instanceof Date ? new Date(value) : new Date(value || Date.now());
    if (Number.isNaN(date.getTime())) return '';
    return date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0');
  }

  function practiceId(kind, entry) {
    if (kind === 'awareness') return 'awareness';
    if (kind === 'prayer') return 'prayer';
    const raw = String(entry.exercise || entry.type || 'clock').toLowerCase();
    const aliases = {
      visual: 'visualization',
      pore: 'pore_breathing',
      porebreathing: 'pore_breathing',
      autosug: 'autosuggestion',
      observation: 'thought',
      focus: 'thought',
      vacancy: 'thought'
    };
    return aliases[raw] || raw;
  }

  function activeSeconds(kind, practice, entry) {
    if (kind === 'awareness') return Math.max(0, Math.round((Number(entry.durationMin) || 0) * 60));
    if (kind === 'prayer') return Math.max(0, Math.round(Number(entry.durationSec) || 0));
    if (Number(entry.sessionDurationSec) > 0) return Math.round(Number(entry.sessionDurationSec));
    if (Number(entry.durationSec) > 0) return Math.round(Number(entry.durationSec));
    if (practice === 'visualization' && Number(entry.xpEarned) > 0) return Math.round(Number(entry.xpEarned));
    return Math.max(0, Math.round(Number(entry.seconds) || 0));
  }

  function skillValue(practice, entry) {
    if (practice === 'pore_breathing') return Math.max(0, Number(entry.breaths) || 0);
    if (practice === 'autosuggestion') return Math.max(0, Number(entry.taps) || 0);
    if (practice === 'sense') {
      if (Number(entry.cleanSeconds) >= 0) return Math.max(0, Number(entry.cleanSeconds) || 0);
      return Math.max(0, Number(entry.halts) || 0) === 0 ? Math.max(0, Number(entry.seconds) || 0) : 0;
    }
    if (practice === 'prayer' || practice === 'awareness') return 0;
    return Math.max(0, Number(entry.seconds) || 0);
  }

  function eventId(kind, practice, entry) {
    const source = [kind, entry.date || '', practice, entry.tcMode || '', entry.eyesMode || '', entry.exercise || '', entry.type || ''].join(':');
    let hash = 2166136261;
    for (let index = 0; index < source.length; index += 1) {
      hash ^= source.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return 'e' + (hash >>> 0).toString(36);
  }

  function normalize(kind, entry) {
    if (!entry || !entry.date) return null;
    const practice = practiceId(kind, entry);
    const event = {
      p: practice,
      s: activeSeconds(kind, practice, entry),
      v: skillValue(practice, entry)
    };
    if (kind === 'awareness') {
      const answers = entry.answers || {};
      if (Number(answers.drift) > 0) event.d = Number(answers.drift);
      if (Number(answers.return) > 0) event.r = Number(answers.return);
      if (Number(answers.redundant) > 0) event.n = Number(answers.redundant);
      if (Number(entry.score) > 0) event.q = Number(entry.score);
      if (entry.endedEarly) event.e = 1;
    }
    if (entry.tcMode) event.m = String(entry.tcMode).slice(0, 24);
    if (practice === 'sense' && entry.eyesMode === 'open') event.o = 1;
    if (Number(entry.xpEarned) > 0) event.x = Math.round(Number(entry.xpEarned));
    return {
      id: eventId(kind, practice, entry),
      key: dayKey(entry.date),
      event
    };
  }

  function addNormalized(state, normalized) {
    if (!normalized || !normalized.key || !normalized.id) return false;
    const day = state.days[normalized.key] || (state.days[normalized.key] = { events: {} });
    if (!day.events || typeof day.events !== 'object') day.events = {};
    if (day.events[normalized.id]) return false;
    day.events[normalized.id] = normalized.event;
    return true;
  }

  function record(storage, kind, entry) {
    const state = load(storage);
    const changed = addNormalized(state, normalize(kind, entry));
    if (changed) save(storage, state);
    return changed;
  }

  function backfill(storage, histories) {
    const source = histories || {};
    const state = load(storage);
    let changed = false;
    (source.awareness || []).forEach(entry => { changed = addNormalized(state, normalize('awareness', entry)) || changed; });
    (source.concentration || []).forEach(entry => { changed = addNormalized(state, normalize('concentration', entry)) || changed; });
    (source.prayer || []).forEach(entry => { changed = addNormalized(state, normalize('prayer', entry)) || changed; });
    if (changed) save(storage, state);
    return state;
  }

  // The Guide swaps a card's id mid-day for one committed slot: the daily
  // Soul Mirror reflection becomes a Pore Breathing card (id 'pore') once the
  // Mirror step is finished (see guideMirrorToPore in guide-path-client.js).
  // Without this alias, a plan frozen before that swap keeps 'soulmirror' in
  // its assigned list, and a completion recorded afterward under 'pore' can
  // never match it — a real Mirror-then-breathing day would score as 0%
  // follow-through even though the one assigned slot was completed.
  const PLAN_ID_ALIASES = { pore: 'soulmirror', pore_breathing: 'soulmirror' };
  function canonicalPlanId(id) { return PLAN_ID_ALIASES[id] || id; }

  function capturePlan(storage, value, items) {
    if (!Array.isArray(items) || !items.length) return false;
    const key = dayKey(value);
    if (!key) return false;
    const state = load(storage);
    const day = state.days[key] || (state.days[key] = { events: {} });
    const previous = day.plan && typeof day.plan === 'object' ? day.plan : null;
    // A Guide plan is a commitment for that day, not a moving target. Earlier
    // Review snapshots were replaced whenever the adaptive Guide changed an
    // exercise, which could erase a completion from the follow-through score.
    // Rebuild legacy snapshots once, then preserve the first captured list.
    const frozen = !!(previous && previous.frozen);
    const assigned = frozen && Array.isArray(previous.assigned) ? previous.assigned.slice() : [];
    const completed = frozen && Array.isArray(previous.completed)
      ? previous.completed.filter(id => assigned.includes(id)) : [];
    items.forEach(item => {
      const id = canonicalPlanId(String(item.id || item.mode || item.tcMode || '').slice(0, 40));
      if (!id) return;
      if (!frozen && !assigned.includes(id)) assigned.push(id);
      if (!assigned.includes(id)) return;
      // The Guide displays a timed practice as done once its required daily
      // session count is met, even when the session ended before the full
      // recommended duration. Practice Review must use the same definition;
      // otherwise real Guide completions are recorded as follow-through misses.
      if ((item.done || item.sessionDone) && !completed.includes(id)) completed.push(id);
    });
    const before = JSON.stringify(previous || null);
    day.plan = { assigned, completed, frozen: true };
    if (JSON.stringify(day.plan) === before) return false;
    save(storage, state);
    return true;
  }

  function emptySummary() {
    return {
      sessions: 0,
      totalSeconds: 0,
      activeDays: 0,
      byPractice: {},
      daily: [],
      awareness: { count: 0, stability: null, returnEase: null, independence: null, score: null },
      plan: { assigned: 0, completed: 0, days: 0 }
    };
  }

  function emptyArchive() {
    return {
      through: '', sessions: 0, totalSeconds: 0, activeDays: 0,
      byPractice: {},
      awareness: {
        count: 0, stabilityTotal: 0, stabilityCount: 0,
        returnTotal: 0, returnCount: 0,
        independenceTotal: 0, independenceCount: 0,
        scoreTotal: 0, scoreCount: 0
      },
      plan: { assigned: 0, completed: 0, days: 0 }
    };
  }

  function archiveDay(state, key, day) {
    const archive = state.archive && typeof state.archive === 'object' ? state.archive : (state.archive = emptyArchive());
    archive.sessions = Math.max(0, Number(archive.sessions) || 0);
    archive.totalSeconds = Math.max(0, Number(archive.totalSeconds) || 0);
    archive.activeDays = Math.max(0, Number(archive.activeDays) || 0);
    archive.byPractice = archive.byPractice && typeof archive.byPractice === 'object' ? archive.byPractice : {};
    const awareness = archive.awareness || (archive.awareness = emptyArchive().awareness);
    const planTotals = archive.plan || (archive.plan = { assigned: 0, completed: 0, days: 0 });
    ['count','stabilityTotal','stabilityCount','returnTotal','returnCount','independenceTotal','independenceCount','scoreTotal','scoreCount'].forEach(field => {
      awareness[field] = Math.max(0, Number(awareness[field]) || 0);
    });
    ['assigned','completed','days'].forEach(field => { planTotals[field] = Math.max(0, Number(planTotals[field]) || 0); });
    const events = Object.values((day && day.events) || {});
    events.forEach(event => {
      const practice = event.p || 'other';
      const bucket = archive.byPractice[practice] || (archive.byPractice[practice] = { sessions: 0, seconds: 0, best: 0 });
      bucket.sessions = Math.max(0, Number(bucket.sessions) || 0);
      bucket.seconds = Math.max(0, Number(bucket.seconds) || 0);
      bucket.best = Math.max(0, Number(bucket.best) || 0);
      const seconds = Math.max(0, Number(event.s) || 0);
      const value = Math.max(0, Number(event.v) || 0);
      bucket.sessions += 1;
      bucket.seconds += seconds;
      bucket.best = Math.max(bucket.best || 0, value);
      if (practice === 'sense') {
        const openEyes = Number(event.o) === 1;
        const sessionKey = openEyes ? 'openEyesSessions' : 'closedEyesSessions';
        const bestKey = openEyes ? 'openEyesBest' : 'closedEyesBest';
        bucket[sessionKey] = Math.max(0, Number(bucket[sessionKey]) || 0) + 1;
        bucket[bestKey] = Math.max(Math.max(0, Number(bucket[bestKey]) || 0), value);
      }
      archive.sessions += 1;
      archive.totalSeconds += seconds;
      if (practice === 'awareness') {
        awareness.count += 1;
        if (Number(event.d) > 0) { awareness.stabilityTotal += 6 - Number(event.d); awareness.stabilityCount += 1; }
        if (Number(event.r) > 0) { awareness.returnTotal += 6 - Number(event.r); awareness.returnCount += 1; }
        if (Number(event.n) > 0) { awareness.independenceTotal += 6 - Number(event.n); awareness.independenceCount += 1; }
        if (Number(event.q) > 0) { awareness.scoreTotal += Number(event.q); awareness.scoreCount += 1; }
      }
    });
    if (events.length) archive.activeDays += 1;
    if (day && day.plan && Array.isArray(day.plan.assigned) && day.plan.assigned.length) {
      planTotals.days += 1;
      planTotals.assigned += day.plan.assigned.length;
      planTotals.completed += (day.plan.completed || []).filter(id => day.plan.assigned.includes(id)).length;
    }
    if (!archive.through || key > archive.through) archive.through = key;
  }

  function seedFromArchive(summary, archive) {
    if (!archive || typeof archive !== 'object') return;
    summary.sessions = Math.max(0, Number(archive.sessions) || 0);
    summary.totalSeconds = Math.max(0, Number(archive.totalSeconds) || 0);
    summary.activeDays = Math.max(0, Number(archive.activeDays) || 0);
    Object.keys(archive.byPractice || {}).forEach(practice => {
      const row = archive.byPractice[practice] || {};
      summary.byPractice[practice] = {
        sessions: Math.max(0, Number(row.sessions) || 0),
        seconds: Math.max(0, Number(row.seconds) || 0),
        best: Math.max(0, Number(row.best) || 0),
        values: []
      };
      if (practice === 'sense') {
        summary.byPractice[practice].openEyesSessions = Math.max(0, Number(row.openEyesSessions) || 0);
        summary.byPractice[practice].closedEyesSessions = Math.max(0, Number(row.closedEyesSessions) || 0);
        summary.byPractice[practice].openEyesBest = Math.max(0, Number(row.openEyesBest) || 0);
        summary.byPractice[practice].closedEyesBest = Math.max(0, Number(row.closedEyesBest) || 0);
      }
    });
    const awareness = archive.awareness || {};
    summary.awareness.count = Math.max(0, Number(awareness.count) || 0);
    summary.awareness.stability = Number(awareness.stabilityCount) > 0 ? Number(awareness.stabilityTotal) / Number(awareness.stabilityCount) : null;
    summary.awareness.returnEase = Number(awareness.returnCount) > 0 ? Number(awareness.returnTotal) / Number(awareness.returnCount) : null;
    summary.awareness.independence = Number(awareness.independenceCount) > 0 ? Number(awareness.independenceTotal) / Number(awareness.independenceCount) : null;
    summary.awareness.score = Number(awareness.scoreCount) > 0 ? Number(awareness.scoreTotal) / Number(awareness.scoreCount) : null;
    const plan = archive.plan || {};
    summary.plan = {
      assigned: Math.max(0, Number(plan.assigned) || 0),
      completed: Math.max(0, Number(plan.completed) || 0),
      days: Math.max(0, Number(plan.days) || 0)
    };
  }

  function mean(values) {
    return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
  }

  function median(values) {
    if (!values.length) return 0;
    const sorted = values.slice().sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  }

  function summarizeState(state, start, end) {
    const summary = emptySummary();
    const startKey = start ? dayKey(start) : '';
    const endKey = end ? dayKey(end) : '';
    const quality = { stability: [], returnEase: [], independence: [], score: [] };
    if (!startKey) seedFromArchive(summary, state && state.archive);
    Object.keys((state && state.days) || {}).sort().forEach(key => {
      if (startKey && key < startKey) return;
      if (endKey && key >= endKey) return;
      const day = state.days[key] || {};
      const events = Object.values(day.events || {});
      let daySeconds = 0;
      events.forEach(event => {
        const practice = event.p || 'other';
        const bucket = summary.byPractice[practice] || (summary.byPractice[practice] = { sessions: 0, seconds: 0, best: 0, values: [] });
        const seconds = Math.max(0, Number(event.s) || 0);
        const value = Math.max(0, Number(event.v) || 0);
        bucket.sessions += 1;
        bucket.seconds += seconds;
        if (value > 0) {
          bucket.values.push(value);
          if (value > bucket.best) bucket.best = value;
        }
        if (practice === 'sense') {
          const openEyes = Number(event.o) === 1;
          const sessionKey = openEyes ? 'openEyesSessions' : 'closedEyesSessions';
          const bestKey = openEyes ? 'openEyesBest' : 'closedEyesBest';
          bucket[sessionKey] = Math.max(0, Number(bucket[sessionKey]) || 0) + 1;
          bucket[bestKey] = Math.max(Math.max(0, Number(bucket[bestKey]) || 0), value);
        }
        summary.sessions += 1;
        summary.totalSeconds += seconds;
        daySeconds += seconds;
        if (practice === 'awareness') {
          summary.awareness.count += 1;
          if (Number(event.d) > 0) quality.stability.push(6 - Number(event.d));
          if (Number(event.r) > 0) quality.returnEase.push(6 - Number(event.r));
          if (Number(event.n) > 0) quality.independence.push(6 - Number(event.n));
          if (Number(event.q) > 0) quality.score.push(Number(event.q));
        }
      });
      if (events.length) summary.activeDays += 1;
      summary.daily.push({ key, seconds: daySeconds, sessions: events.length });
      if (day.plan && Array.isArray(day.plan.assigned) && day.plan.assigned.length) {
        summary.plan.days += 1;
        summary.plan.assigned += day.plan.assigned.length;
        summary.plan.completed += (day.plan.completed || []).filter(id => day.plan.assigned.includes(id)).length;
      }
    });
    Object.keys(summary.byPractice).forEach(practice => {
      const bucket = summary.byPractice[practice];
      bucket.typical = median(bucket.values);
      delete bucket.values;
    });
    const archivedAwareness = (state && state.archive && state.archive.awareness) || {};
    function combinedMean(values, totalKey, countKey, existing) {
      if (startKey) return mean(values);
      const archivedCount = Math.max(0, Number(archivedAwareness[countKey]) || 0);
      const currentTotal = values.reduce((sum, value) => sum + value, 0);
      const count = archivedCount + values.length;
      if (count) return ((Number(archivedAwareness[totalKey]) || 0) + currentTotal) / count;
      return existing;
    }
    summary.awareness.stability = combinedMean(quality.stability, 'stabilityTotal', 'stabilityCount', summary.awareness.stability);
    summary.awareness.returnEase = combinedMean(quality.returnEase, 'returnTotal', 'returnCount', summary.awareness.returnEase);
    summary.awareness.independence = combinedMean(quality.independence, 'independenceTotal', 'independenceCount', summary.awareness.independence);
    summary.awareness.score = combinedMean(quality.score, 'scoreTotal', 'scoreCount', summary.awareness.score);
    return summary;
  }

  function summarize(storage, start, end) {
    return summarizeState(load(storage), start, end);
  }

  return Object.freeze({
    STORAGE_KEY,
    VERSION,
    MAX_DAYS,
    parse,
    load,
    save,
    dayKey,
    normalize,
    record,
    backfill,
    capturePlan,
    summarize,
    summarizeState
  });
});
