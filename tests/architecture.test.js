'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const presence = fs.readFileSync(path.join(root, 'presence.html'), 'utf8');
const server = fs.readFileSync(path.join(root, 'server.js'), 'utf8');
const reportsClient = fs.readFileSync(path.join(root, 'reports-client.js'), 'utf8');
const platformClient = fs.readFileSync(path.join(root, 'platform-client.js'), 'utf8');
const soulMirrorClient = fs.readFileSync(path.join(root, 'soul-mirror-client.js'), 'utf8');
const journalClient = fs.readFileSync(path.join(root, 'journal-client.js'), 'utf8');
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

test('Journal behavior loads through its own client boundary', () => {
  const journalTag = presence.indexOf('<script src="journal-client.js"></script>');
  const socialTag = presence.indexOf('<script src="social-client.js"></script>');
  const appUse = presence.indexOf('var PRESENCE_SYNC = window.PresenceSyncContract;');
  assert.notEqual(journalTag, -1);
  assert.ok(appUse < journalTag, 'journal client must load after shared app state');
  assert.ok(journalTag < socialTag, 'journal must initialize before the social client');
  assert.equal(presence.split('<script src="journal-client.js"></script>').length - 1, 1);
  assert.doesNotMatch(presence, /function\s+renderJournal\s*\(|function\s+openJournalEntry\s*\(/);
  assert.match(journalClient, /function\s+renderJournal\s*\(/);
  assert.match(journalClient, /function\s+openJournalEntry\s*\(/);
  assert.match(journalClient, /document\.getElementById\('journalBack'\)\.addEventListener/);
  assert.doesNotThrow(() => new Function(journalClient));
});

test('Progress Reports load through their own client boundary', () => {
  const reportsTag = presence.indexOf('<script src="reports-client.js"></script>');
  const journalTag = presence.indexOf('<script src="journal-client.js"></script>');
  const appUse = presence.indexOf('var PRESENCE_SYNC = window.PresenceSyncContract;');
  assert.notEqual(reportsTag, -1);
  assert.ok(appUse < reportsTag, 'reports client must load after shared app state');
  assert.ok(reportsTag < journalTag, 'reports must initialize before Journal');
  assert.equal(presence.split('<script src="reports-client.js"></script>').length - 1, 1);
  assert.doesNotMatch(presence, /function\s+showReports\s*\(|function\s+renderReport\s*\(/);
  assert.match(reportsClient, /function\s+showReports\s*\(/);
  assert.match(reportsClient, /function\s+renderReport\s*\(/);
  assert.match(reportsClient, /function\s+getDateRange\s*\(/);
  assert.match(reportsClient, /document\.getElementById\('reportFilterBtn'\)/);
  assert.doesNotThrow(() => new Function(reportsClient));
});

test('browser platform services load through their own client boundary', () => {
  const mergeTag = presence.indexOf('<script src="sync-merge.js"></script>');
  const platformTag = presence.indexOf('<script src="platform-client.js"></script>');
  const appUse = presence.indexOf('var PRESENCE_SYNC = window.PresenceSyncContract;');
  assert.notEqual(platformTag, -1);
  assert.ok(mergeTag < platformTag, 'platform services load after shared state modules');
  assert.ok(platformTag < appUse, 'platform globals must exist before the app runtime starts');
  assert.equal(presence.split('<script src="platform-client.js"></script>').length - 1, 1);
  assert.doesNotMatch(presence, /function\s+authRegisterOrLogin\s*\(|function\s+syncPushData\s*\(/);
  assert.doesNotMatch(presence, /function\s+registerWebPush\s*\(|function\s+showAppUpdateBanner\s*\(/);
  assert.match(platformClient, /function\s+authRegisterOrLogin\s*\(/);
  assert.match(platformClient, /function\s+syncPushData\s*\(/);
  assert.match(platformClient, /function\s+registerWebPush\s*\(/);
  assert.match(platformClient, /function\s+showAppUpdateBanner\s*\(/);
  assert.doesNotThrow(() => new Function(platformClient));
});

test('Soul Mirror and Autosuggestion load through their own client boundary', () => {
  const soulMirrorTag = presence.indexOf('<script src="soul-mirror-client.js"></script>');
  const reportsTag = presence.indexOf('<script src="reports-client.js"></script>');
  const appUse = presence.indexOf('var PRESENCE_SYNC = window.PresenceSyncContract;');
  assert.notEqual(soulMirrorTag, -1);
  assert.ok(appUse < soulMirrorTag, 'Soul Mirror needs the completed core runtime');
  assert.ok(soulMirrorTag < reportsTag, 'Soul Mirror initializes before later feature clients');
  assert.equal(presence.split('<script src="soul-mirror-client.js"></script>').length - 1, 1);
  assert.doesNotMatch(presence, /function\s+loadSoulMirror\s*\(|function\s+renderAutosug\s*\(/);
  assert.match(soulMirrorClient, /function\s+loadSoulMirror\s*\(/);
  assert.match(soulMirrorClient, /function\s+renderSoulMirrorTraits\s*\(/);
  assert.match(soulMirrorClient, /function\s+autosugFinish\s*\(/);
  assert.match(soulMirrorClient, /function\s+renderAutosug\s*\(/);
  assert.doesNotThrow(() => new Function(soulMirrorClient));
});
