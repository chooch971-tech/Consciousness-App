'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const presence = fs.readFileSync(path.join(root, 'presence.html'), 'utf8');
const server = fs.readFileSync(path.join(root, 'server.js'), 'utf8');
const socialClient = fs.readFileSync(path.join(root, 'social-client.js'), 'utf8');

test('production code does not ship the retired Bardon RPG', () => {
  assert.doesNotMatch(presence, /bardonScreen|drawerBardon|bardon_rpg_v2|BARDON GAME/);
  assert.doesNotMatch(server, /bardon_rpg_v2/);
});

test('browser loads shared state modules before app code', () => {
  const contractTag = presence.indexOf('<script src="sync-contract.js"></script>');
  const progressTag = presence.indexOf('<script src="progress-state.js"></script>');
  const mergeTag = presence.indexOf('<script src="sync-merge.js"></script>');
  const appUse = presence.indexOf('var PRESENCE_SYNC = window.PresenceSyncContract;');
  assert.notEqual(contractTag, -1);
  assert.notEqual(progressTag, -1);
  assert.notEqual(mergeTag, -1);
  assert.notEqual(appUse, -1);
  assert.ok(contractTag < progressTag);
  assert.ok(progressTag < mergeTag);
  assert.ok(mergeTag < appUse);
  assert.match(presence, /PRESENCE_PROGRESS\.replaceStorageSnapshot/);
  assert.match(presence, /PRESENCE_PROGRESS\.withoutResetMarkers/);
  assert.match(presence, /PRESENCE_MERGE\.mergeHistoryValues/);
  assert.match(presence, /PRESENCE_MERGE\.mergeGiftPathValues/);
});

test('server imports the shared sync allowlist instead of declaring another one', () => {
  assert.match(server, /require\('\.\/sync-contract'\)/);
  assert.match(server, /SYNC_KEYS\.forEach/);
  assert.doesNotMatch(server, /const\s+KEYS\s*=\s*\[\s*['"]presence_v3/);
});

test('history and Gift Path merge contracts are shared by browser and server', () => {
  assert.match(server, /require\('\.\/sync-merge'\)/);
  assert.match(server, /mergeHistoryValues/);
  assert.match(server, /mergeGiftPathValues/);
  assert.doesNotMatch(presence, /function\s+mergeSyncHistoryArrays|SYNC_HISTORY_MERGE/);
  assert.doesNotMatch(server, /function\s+mergeHistoryArraysSrv|SRV_HISTORY_MERGE/);
});

test('Lodge, messages, and friends live behind the social client boundary', () => {
  const socialTag = presence.indexOf('<script src="social-client.js"></script>');
  const appUse = presence.indexOf('var PRESENCE_SYNC = window.PresenceSyncContract;');
  assert.notEqual(socialTag, -1);
  assert.ok(appUse < socialTag, 'social client must load after the main application runtime');
  assert.equal(presence.split('<script src="social-client.js"></script>').length - 1, 1);
  assert.doesNotMatch(presence, /function\s+openLodge\s*\(|function\s+openChatList\s*\(|function\s+openFriendsPanel\s*\(/);
  assert.match(socialClient, /function\s+openLodge\s*\(/);
  assert.match(socialClient, /function\s+openChatList\s*\(/);
  assert.match(socialClient, /function\s+openFriendsPanel\s*\(/);
  assert.doesNotThrow(() => new Function(socialClient));
});
