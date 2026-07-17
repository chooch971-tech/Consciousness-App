'use strict';

(function exposeSyncMerge(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.PresenceSyncMerge = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function createSyncMerge() {
  const HISTORY_MERGE = Object.freeze({
    presence_conc_v1: Object.freeze({
      arrays: Object.freeze(['history']),
      maxNums: Object.freeze(['xp', 'totalSessions', 'bestSeconds', 'bestAsanaSeconds', 'level'])
    }),
    presence_v3: Object.freeze({
      arrays: Object.freeze(['history', 'weeklyScores']),
      maxNums: Object.freeze(['xp', 'totalSessions', 'streak', 'longestStreak', 'level'])
    })
  });

  function parseValue(value) {
    if (!value) return null;
    if (typeof value === 'object') return value;
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === 'object' ? parsed : null;
    } catch (error) {
      return null;
    }
  }

  function cloneValue(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function resetAt(value) {
    return Math.max(0, Number(value && value._resetAt) || 0);
  }

  function progressScore(value) {
    if (!value || typeof value !== 'object') return 0;
    if (value.xp != null) return Number(value.xp) || 0;
    if (value.totalSessions != null) return Number(value.totalSessions) || 0;
    return Array.isArray(value.history) ? value.history.length : 0;
  }

  function candidatesAtNewestReset(values) {
    const candidates = (Array.isArray(values) ? values : [])
      .map(parseValue)
      .filter(Boolean);
    if (!candidates.length) return [];
    const newestReset = candidates.reduce(function(max, value) {
      return Math.max(max, resetAt(value));
    }, 0);
    return candidates.filter(function(value) {
      return resetAt(value) === newestReset;
    });
  }

  function historyTimestamp(entry) {
    const time = entry && entry.date ? new Date(entry.date).getTime() : 0;
    return Number.isFinite(time) ? time : 0;
  }

  function mergeHistoryArrays(a, b, cap) {
    const seen = new Set();
    const out = [];
    const combined = (Array.isArray(a) ? a : []).concat(Array.isArray(b) ? b : []);
    combined.forEach(function(entry) {
      if (!entry || typeof entry !== 'object') return;
      const id = entry.date || JSON.stringify(entry);
      if (seen.has(id)) return;
      seen.add(id);
      out.push(entry);
    });
    out.sort(function(aEntry, bEntry) {
      return historyTimestamp(bEntry) - historyTimestamp(aEntry);
    });
    return cap && out.length > cap ? out.slice(0, cap) : out;
  }

  function isHistoryKey(key) {
    return Object.prototype.hasOwnProperty.call(HISTORY_MERGE, key);
  }

  // Values are ordered by preference. Progress score selects the base object;
  // an equal score keeps the earlier value so browser cloud and server recency
  // preferences remain explicit without changing the monotonic merge fields.
  function mergeHistoryValues(key, values) {
    const spec = HISTORY_MERGE[key];
    if (!spec) return null;
    const candidates = candidatesAtNewestReset(values);
    if (!candidates.length) return null;

    let base = candidates[0];
    let baseScore = progressScore(base);
    candidates.slice(1).forEach(function(candidate) {
      const score = progressScore(candidate);
      if (score > baseScore) {
        base = candidate;
        baseScore = score;
      }
    });

    const out = cloneValue(base);
    candidates.forEach(function(candidate) {
      spec.arrays.forEach(function(field) {
        out[field] = mergeHistoryArrays(out[field], candidate[field], 100);
      });
      spec.maxNums.forEach(function(field) {
        if (out[field] != null || candidate[field] != null) {
          out[field] = Math.max(Number(out[field]) || 0, Number(candidate[field]) || 0);
        }
      });
      if (key === 'presence_conc_v1' && !out.clockTheme && candidate.clockTheme) {
        out.clockTheme = candidate.clockTheme;
      }
    });
    return out;
  }

  function mergeGiftPathValues(values, options) {
    const candidates = candidatesAtNewestReset(values);
    if (!candidates.length) return null;

    const cleared = [];
    const clearedSeen = new Set();
    let month = null;
    let started = false;
    candidates.forEach(function(candidate) {
      (Array.isArray(candidate.cleared) ? candidate.cleared : []).forEach(function(value) {
        if (!value || clearedSeen.has(value)) return;
        clearedSeen.add(value);
        cleared.push(value);
      });
      if (candidate.month && String(candidate.month) > String(month || '')) month = candidate.month;
      started = started || !!candidate.started;
    });
    cleared.sort();

    const out = {
      cleared,
      month,
      started,
      startDate: null,
      claimed: [false, false, false, false, false, false, false],
      done: {}
    };
    candidates.forEach(function(candidate) {
      if ((candidate.month || null) !== month) return;
      if (candidate.startDate && (!out.startDate || candidate.startDate < out.startDate)) {
        out.startDate = candidate.startDate;
      }
      const claimed = Array.isArray(candidate.claimed) ? candidate.claimed : [];
      for (let i = 0; i < 7; i += 1) out.claimed[i] = out.claimed[i] || !!claimed[i];
      const done = candidate.done || {};
      Object.keys(done).forEach(function(key) {
        if (done[key]) out.done[key] = true;
      });
    });

    if (!out.startDate && month && options && options.inferStartDate) {
      out.startDate = month + '-01';
    }
    // Always assign these (not just when truthy) so a value of 0 round-trips
    // identically instead of silently vanishing from the output — a merge of
    // byte-identical inputs must produce byte-identical output, or every pull
    // looks "changed" and forces a reload even when nothing actually happened.
    out._resetAt = resetAt(candidates[0]);
    out._testResetVersion = candidates.reduce(function(max, candidate) {
      return Math.max(max, Number(candidate._testResetVersion) || 0);
    }, 0);
    return out;
  }

  return Object.freeze({
    HISTORY_MERGE,
    isHistoryKey,
    mergeHistoryValues,
    mergeGiftPathValues
  });
});
