'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const presence = fs.readFileSync(path.join(root, 'presence.html'), 'utf8');
const server = fs.readFileSync(path.join(root, 'server.js'), 'utf8');
const awarenessClient = fs.readFileSync(path.join(root, 'awareness-client.js'), 'utf8');
const reportsClient = fs.readFileSync(path.join(root, 'reports-client.js'), 'utf8');
const platformClient = fs.readFileSync(path.join(root, 'platform-client.js'), 'utf8');
const profileClient = fs.readFileSync(path.join(root, 'profile-client.js'), 'utf8');
const settingsClient = fs.readFileSync(path.join(root, 'settings-client.js'), 'utf8');
const achievementsClient = fs.readFileSync(path.join(root, 'achievements-client.js'), 'utf8');
const prayerClient = fs.readFileSync(path.join(root, 'prayer-client.js'), 'utf8');
const tutorialClient = fs.readFileSync(path.join(root, 'tutorial-client.js'), 'utf8');
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

test('Awareness practice owns its dedicated client boundary', () => {
  const awarenessTag = presence.indexOf('<script src="awareness-client.js"></script>');
  const appUse = presence.indexOf('var PRESENCE_SYNC = window.PresenceSyncContract;');
  const appEvents = presence.indexOf("document.getElementById('customCancelBtn').addEventListener");
  assert.notEqual(awarenessTag, -1);
  assert.ok(appUse < awarenessTag, 'Awareness loads after shared state contracts');
  assert.ok(awarenessTag < appEvents, 'Awareness functions must exist before app event wiring');
  assert.equal(presence.split('<script src="awareness-client.js"></script>').length - 1, 1);
  assert.doesNotMatch(presence, /function\s+loadState\s*\(|function\s+renderHome\s*\(/);
  assert.doesNotMatch(presence, /function\s+startSession\s*\(|function\s+renderHistory\s*\(/);
  assert.match(awarenessClient, /const\s+RANK_TITLES\s*=\s*\[/);
  assert.match(awarenessClient, /function\s+loadState\s*\(/);
  assert.match(awarenessClient, /function\s+renderHome\s*\(/);
  assert.match(awarenessClient, /function\s+startSession\s*\(/);
  assert.match(awarenessClient, /function\s+submitSurvey\s*\(/);
  assert.match(awarenessClient, /function\s+renderHistory\s*\(/);
  assert.doesNotThrow(() => new Function(awarenessClient));
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

test('Achievements load through their own client boundary at boot time', () => {
  const achievementsTag = presence.indexOf('<script src="achievements-client.js"></script>');
  const appUse = presence.indexOf('var PRESENCE_SYNC = window.PresenceSyncContract;');
  const resetControls = presence.indexOf("document.getElementById('confirmModalCancel')");
  assert.notEqual(achievementsTag, -1);
  assert.ok(appUse < achievementsTag, 'Achievements need initialized core state');
  assert.ok(achievementsTag < resetControls, 'Achievements must retain their original boot position');
  assert.equal(presence.split('<script src="achievements-client.js"></script>').length - 1, 1);
  assert.doesNotMatch(presence, /function\s+achEvaluate\s*\(|function\s+renderAchScreen\s*\(/);
  assert.match(achievementsClient, /function\s+achEvaluate\s*\(/);
  assert.match(achievementsClient, /function\s+achOnCompletion\s*\(/);
  assert.match(achievementsClient, /function\s+showAchInfo\s*\(/);
  assert.match(achievementsClient, /function\s+renderAchScreen\s*\(/);
  assert.match(achievementsClient, /\(function\s+_achBootSettle\s*\(/);
  assert.match(awarenessClient, /function\s+refreshGuidePathLayoutIfReady\s*\(\)/);
  assert.match(awarenessClient, /typeof\s+scheduleGuidePathLayoutRefresh\s*===\s*['"]function['"]/);
  assert.doesNotThrow(() => new Function(achievementsClient));
});

test('Profile and account identity behavior load before Achievements', () => {
  const profileTag = presence.indexOf('<script src="profile-client.js"></script>');
  const settingsTag = presence.indexOf('<script src="settings-client.js"></script>');
  const achievementsTag = presence.indexOf('<script src="achievements-client.js"></script>');
  assert.notEqual(profileTag, -1);
  assert.ok(profileTag < settingsTag, 'Profile account helpers initialize before Settings');
  assert.ok(profileTag < achievementsTag, 'Profile badge hooks initialize before Achievements');
  assert.equal(presence.split('<script src="profile-client.js"></script>').length - 1, 1);
  assert.doesNotMatch(presence, /function\s+renderProfile\s*\(|function\s+openFriendProfile\s*\(/);
  assert.doesNotMatch(presence, /function\s+applyAccountFields\s*\(|function\s+setMyStatus\s*\(/);
  assert.match(profileClient, /function\s+renderProfile\s*\(/);
  assert.match(profileClient, /function\s+openFriendProfile\s*\(/);
  assert.match(profileClient, /function\s+applyAccountFields\s*\(/);
  assert.match(profileClient, /function\s+setMyStatus\s*\(/);
  assert.match(profileClient, /document\.addEventListener\(['"]DOMContentLoaded['"], _wireStatusEditor\)/);
  assert.doesNotThrow(() => new Function(profileClient));
});

test('Settings and utility screens load through their own client boundary', () => {
  const profileTag = presence.indexOf('<script src="profile-client.js"></script>');
  const settingsTag = presence.indexOf('<script src="settings-client.js"></script>');
  const achievementsTag = presence.indexOf('<script src="achievements-client.js"></script>');
  assert.notEqual(settingsTag, -1);
  assert.ok(profileTag < settingsTag, 'Settings privacy controls require Profile helpers');
  assert.ok(settingsTag < achievementsTag, 'Settings retains its boot position before Achievements');
  assert.equal(presence.split('<script src="settings-client.js"></script>').length - 1, 1);
  assert.doesNotMatch(presence, /function\s+renderSettingsExerciseList\s*\(|function\s+openAccountSettings\s*\(/);
  assert.doesNotMatch(presence, /function\s+addAudioUrlSound\s*\(|\bEXERCISE_SETTINGS_LIST\s*=\s*\[/);
  assert.match(settingsClient, /function\s+renderSettingsExerciseList\s*\(/);
  assert.match(settingsClient, /function\s+openAccountSettings\s*\(/);
  assert.match(settingsClient, /function\s+addAudioUrlSound\s*\(/);
  assert.match(settingsClient, /document\.getElementById\('importFile'\)\.addEventListener/);
  assert.match(settingsClient, /document\.querySelectorAll\('#faqScreen \.faq-item-head'\)/);
  assert.doesNotThrow(() => new Function(settingsClient));
});

test('Prayer state and practice flow load before the Guide engine', () => {
  const prayerTag = presence.indexOf('<script src="prayer-client.js"></script>');
  const guideStart = presence.indexOf('var GUIDE_DAILY_PLANS = [');
  const appUse = presence.indexOf('var PRESENCE_SYNC = window.PresenceSyncContract;');
  assert.notEqual(prayerTag, -1);
  assert.ok(appUse < prayerTag, 'Prayer requires initialized core practice state');
  assert.ok(prayerTag < guideStart, 'Prayer retains its original position before Guide');
  assert.equal(presence.split('<script src="prayer-client.js"></script>').length - 1, 1);
  assert.doesNotMatch(presence, /function\s+loadPrayerState\s*\(|function\s+beginPrayer\s*\(/);
  assert.doesNotMatch(presence, /function\s+renderPrayerHistory\s*\(|function\s+beginMantra\s*\(/);
  assert.match(prayerClient, /function\s+loadPrayerState\s*\(/);
  assert.match(prayerClient, /function\s+renderPrayerPanel\s*\(/);
  assert.match(prayerClient, /function\s+beginPrayer\s*\(/);
  assert.match(prayerClient, /function\s+renderPrayerHistory\s*\(/);
  assert.match(prayerClient, /function\s+beginMantra\s*\(/);
  assert.match(prayerClient, /document\.getElementById\('prayerConcludeBtn'\)\.addEventListener/);
  assert.doesNotThrow(() => new Function(prayerClient));
});

test('first-time tutorial loads through its own end-of-body client boundary', () => {
  const tutorialTag = presence.indexOf('<script src="tutorial-client.js"></script>');
  const soulMirrorTag = presence.indexOf('<script src="soul-mirror-client.js"></script>');
  const tutorialMarkup = presence.indexOf('<div id="tutOverlay">');
  assert.notEqual(tutorialTag, -1);
  assert.ok(tutorialMarkup < tutorialTag, 'tutorial behavior loads after its complete markup');
  assert.ok(tutorialTag < soulMirrorTag, 'tutorial initializes before later feature clients');
  assert.equal(presence.split('<script src="tutorial-client.js"></script>').length - 1, 1);
  assert.doesNotMatch(presence, /var\s+STEPS\s*=\s*\[/);
  assert.match(tutorialClient, /document\.addEventListener\(['"]DOMContentLoaded['"]/);
  assert.match(tutorialClient, /var\s+STEPS\s*=\s*\[/);
  assert.match(tutorialClient, /window\.__tutReplay\s*=/);
  assert.match(tutorialClient, /function\s+go\s*\(/);
  assert.doesNotThrow(() => new Function(tutorialClient));
});
