'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  SYNC_KEYS,
  LOCAL_PROGRESS_KEYS,
  isSyncKey,
  selectSyncData,
  readStorage
} = require('../sync-contract');

test('defines every supported cloud key once without the retired Bardon game', () => {
  assert.equal(new Set(SYNC_KEYS).size, SYNC_KEYS.length);
  assert.equal(SYNC_KEYS.includes('presence_omnia_v1'), true);
  assert.equal(SYNC_KEYS.includes('presence_giftpath_v1'), true);
  assert.equal(SYNC_KEYS.includes('presence_practice_review_v1'), true);
  assert.equal(SYNC_KEYS.includes('presence_custom_senses_v1'), true);
  assert.equal(SYNC_KEYS.includes('bardon_rpg_v2'), false);
  assert.equal(LOCAL_PROGRESS_KEYS.includes('presence_session'), true);
});

test('selectSyncData allowlists cloud fields', () => {
  const selected = selectSyncData({
    presence_v3: 'awareness',
    presence_omnia_v1: 'omnia',
    presence_auth_token: 'must-not-sync',
    unknown: 'must-not-sync'
  });
  assert.deepEqual(Object.keys(selected), SYNC_KEYS);
  assert.equal(selected.presence_v3, 'awareness');
  assert.equal(selected.presence_omnia_v1, 'omnia');
  assert.equal(Object.hasOwn(selected, 'presence_auth_token'), false);
  assert.equal(Object.hasOwn(selected, 'unknown'), false);
});

test('readStorage and isSyncKey use the same registry', () => {
  const values = new Map(SYNC_KEYS.map(key => [key, 'value:' + key]));
  const data = readStorage({ getItem: key => values.get(key) || null });
  assert.deepEqual(Object.keys(data), SYNC_KEYS);
  assert.equal(data.presence_ach_v1, 'value:presence_ach_v1');
  assert.equal(isSyncKey('presence_ach_v1'), true);
  assert.equal(isSyncKey('presence_auth_token'), false);
});
