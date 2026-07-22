'use strict';

(function exposeProgressState(root, factory) {
  const progressState = factory();
  if (typeof module === 'object' && module.exports) module.exports = progressState;
  if (root) root.PresenceProgressState = progressState;
})(typeof globalThis !== 'undefined' ? globalThis : this, function createProgressStateModule() {
  const PRIMARY_RESET_KEYS = Object.freeze([
    'presence_v3',
    'presence_conc_v1',
    'presence_omnia_v1'
  ]);

  function cloneJson(value) {
    return JSON.parse(JSON.stringify(value == null ? {} : value));
  }

  function resetTimestamp(value) {
    const timestamp = Number(value);
    return Number.isFinite(timestamp) && timestamp > 0 ? timestamp : Date.now();
  }

  function resetSlice(defaultValue, resetAt) {
    const slice = cloneJson(defaultValue);
    slice._resetAt = resetAt;
    return slice;
  }

  function createOmniaResetState(defaultValue, resetAt) {
    const omnia = cloneJson(defaultValue);
    omnia.akasha = 0;
    omnia.reservoir = 0;
    omnia.lastTick = resetAt;
    omnia.bodies = { physical: 1, astral: 1, mental: 1 };
    omnia.upgrades = Object.keys(omnia.upgrades || {}).reduce(function(levels, key) {
      levels[key] = 1;
      return levels;
    }, {});
    omnia.bardonStep = 1;
    omnia.rec = null;
    omnia.recStreak = 0;
    omnia.completedRecommended = 0;
    omnia.totalAkashaEarned = 0;
    omnia._resetAt = resetAt;
    return omnia;
  }

  function createResetSnapshot(options) {
    const input = options || {};
    const resetAt = resetTimestamp(input.resetAt);
    const awareness = resetSlice(input.awarenessDefault, resetAt);
    const concentration = resetSlice(input.concentrationDefault, resetAt);
    const prayer = resetSlice(input.prayerDefault, resetAt);
    const omnia = createOmniaResetState(input.omniaDefault, resetAt);

    return {
      presence_v3: JSON.stringify(awareness),
      presence_conc_v1: JSON.stringify(concentration),
      presence_prayer_v1: JSON.stringify(prayer),
      presence_journal_v1: JSON.stringify({ _resetAt: resetAt }),
      presence_practice_review_v1: JSON.stringify({ version: 1, days: {}, _updatedAt: resetAt, _resetAt: resetAt }),
      presence_soul_mirror_v1: JSON.stringify({ positive: [], negative: [], notes: '', _resetAt: resetAt }),
      presence_guide_v1: JSON.stringify({ _resetAt: resetAt }),
      presence_omnia_v1: JSON.stringify(omnia),
      presence_ach_v1: JSON.stringify({ _resetAt: resetAt }),
      presence_giftpath_v1: JSON.stringify({ _resetAt: resetAt }),
      presence_visited: '1'
    };
  }

  function withoutResetMarkers(snapshot) {
    return Object.keys(snapshot || {}).reduce(function(out, key) {
      const raw = snapshot[key];
      if (key === 'presence_visited' || typeof raw !== 'string') {
        out[key] = raw;
        return out;
      }
      try {
        const value = JSON.parse(raw);
        if (value && typeof value === 'object') delete value._resetAt;
        out[key] = JSON.stringify(value);
      } catch (error) {
        out[key] = raw;
      }
      return out;
    }, {});
  }

  function replaceStorageSnapshot(storage, keys, snapshot) {
    if (!storage || typeof storage.removeItem !== 'function' || typeof storage.setItem !== 'function') {
      throw new TypeError('Presence progress storage must implement removeItem(key) and setItem(key, value)');
    }
    (keys || []).forEach(function(key) { storage.removeItem(key); });
    Object.keys(snapshot || {}).forEach(function(key) {
      if (snapshot[key] != null) storage.setItem(key, String(snapshot[key]));
    });
  }

  function hasResetMarker(storage, keys) {
    if (!storage || typeof storage.getItem !== 'function') return false;
    return (keys || PRIMARY_RESET_KEYS).some(function(key) {
      try {
        const raw = storage.getItem(key);
        return !!(raw && JSON.parse(raw)._resetAt);
      } catch (error) {
        return false;
      }
    });
  }

  return Object.freeze({
    PRIMARY_RESET_KEYS,
    createOmniaResetState,
    createResetSnapshot,
    withoutResetMarkers,
    replaceStorageSnapshot,
    hasResetMarker
  });
});
