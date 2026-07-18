'use strict';

(function exposeSyncContract(root, factory) {
  const contract = factory();
  if (typeof module === 'object' && module.exports) module.exports = contract;
  if (root) root.PresenceSyncContract = contract;
})(typeof globalThis !== 'undefined' ? globalThis : this, function createSyncContract() {
  const SYNC_KEYS = Object.freeze([
    'presence_v3',
    'presence_conc_v1',
    'presence_prayer_v1',
    'presence_journal_v1',
    'presence_soul_mirror_v1',
    'presence_ai_report_comments_v1',
    'presence_guide_v1',
    'presence_omnia_v1',
    'presence_visited',
    'presence_ach_v1',
    'presence_giftpath_v1'
  ]);

  const LOCAL_PROGRESS_KEYS = Object.freeze([
    'presence_session',
    'presence_akasha_ledger_v1'
  ].concat(SYNC_KEYS));
  const SYNC_KEY_SET = new Set(SYNC_KEYS);

  function isSyncKey(key) {
    return SYNC_KEY_SET.has(key);
  }

  function selectSyncData(source) {
    const input = source || {};
    return SYNC_KEYS.reduce(function(out, key) {
      out[key] = input[key];
      return out;
    }, {});
  }

  function readStorage(storage) {
    if (!storage || typeof storage.getItem !== 'function') {
      throw new TypeError('Presence sync storage must implement getItem(key)');
    }
    return SYNC_KEYS.reduce(function(out, key) {
      out[key] = storage.getItem(key);
      return out;
    }, {});
  }

  return Object.freeze({
    SYNC_KEYS,
    LOCAL_PROGRESS_KEYS,
    isSyncKey,
    selectSyncData,
    readStorage
  });
});
