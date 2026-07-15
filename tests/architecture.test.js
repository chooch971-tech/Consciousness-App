'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const presence = fs.readFileSync(path.join(root, 'presence.html'), 'utf8');
const server = fs.readFileSync(path.join(root, 'server.js'), 'utf8');
const awarenessClient = fs.readFileSync(path.join(root, 'awareness-client.js'), 'utf8');
const visualizationClient = fs.readFileSync(path.join(root, 'visualization-client.js'), 'utf8');
const auditoryClient = fs.readFileSync(path.join(root, 'auditory-client.js'), 'utf8');
const thoughtControlClient = fs.readFileSync(path.join(root, 'thought-control-client.js'), 'utf8');
const asanaClient = fs.readFileSync(path.join(root, 'asana-client.js'), 'utf8');
const sensesClient = fs.readFileSync(path.join(root, 'senses-client.js'), 'utf8');
const appShellClient = fs.readFileSync(path.join(root, 'app-shell-client.js'), 'utf8');
const omniaAmbientClient = fs.readFileSync(path.join(root, 'omnia-ambient-client.js'), 'utf8');
const concentrationControlsClient = fs.readFileSync(path.join(root, 'concentration-controls-client.js'), 'utf8');
const guideConfigClient = fs.readFileSync(path.join(root, 'guide-config-client.js'), 'utf8');
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

test('Visualization and the shared exercise gateway load before Auditory', () => {
  const visualizationTag = presence.indexOf('<script src="visualization-client.js"></script>');
  const concentrationState = presence.indexOf('function getConcRank(level)');
  const modeDeclaration = presence.indexOf('var currentMode;');
  const auditoryTag = presence.indexOf('<script src="auditory-client.js"></script>');
  assert.notEqual(visualizationTag, -1);
  assert.ok(concentrationState < visualizationTag, 'Visualization requires Concentration state');
  assert.ok(modeDeclaration < visualizationTag, 'shared mode state must be declared before startup and exercise clients');
  assert.ok(visualizationTag < auditoryTag, 'Visualization must initialize before Auditory');
  assert.equal(presence.split('<script src="visualization-client.js"></script>').length - 1, 1);
  assert.doesNotMatch(presence, /function\s+openExerciseSetup\s*\(|function\s+startVisSession\s*\(/);
  assert.doesNotMatch(presence, /function\s+endVisSession\s*\(|function\s+showConcLevelUp\s*\(/);
  assert.match(visualizationClient, /function\s+openExerciseSetup\s*\(/);
  assert.match(visualizationClient, /function\s+startVisSession\s*\(/);
  assert.match(visualizationClient, /function\s+endVisSession\s*\(/);
  assert.match(visualizationClient, /function\s+renderVisIntermediateSession\s*\(/);
  assert.match(visualizationClient, /document\.getElementById\('exerciseGrid'\)\.addEventListener/);
  assert.match(visualizationClient, /function\s+showConcLevelUp\s*\(/);
  assert.doesNotThrow(() => new Function(visualizationClient));
});

test('Auditory sound and session behavior load before Thought Control', () => {
  const visualizationTag = presence.indexOf('<script src="visualization-client.js"></script>');
  const auditoryTag = presence.indexOf('<script src="auditory-client.js"></script>');
  const thoughtTag = presence.indexOf('<script src="thought-control-client.js"></script>');
  assert.notEqual(auditoryTag, -1);
  assert.ok(visualizationTag < auditoryTag, 'Auditory loads after the shared exercise gateway');
  assert.ok(auditoryTag < thoughtTag, 'Auditory must initialize before Thought Control');
  assert.equal(presence.split('<script src="auditory-client.js"></script>').length - 1, 1);
  assert.doesNotMatch(presence, /function\s+stopAllAudio\s*\(|function\s+startAuditorySession\s*\(/);
  assert.doesNotMatch(presence, /function\s+buildSoundGrid\s*\(|function\s+saveAudResult\s*\(/);
  assert.match(auditoryClient, /function\s+stopAllAudio\s*\(/);
  assert.match(auditoryClient, /function\s+buildSoundGrid\s*\(/);
  assert.match(auditoryClient, /function\s+startAuditorySession\s*\(/);
  assert.match(auditoryClient, /function\s+saveAudResult\s*\(/);
  assert.match(auditoryClient, /document\.getElementById\('audSessionScreen'\)\.addEventListener/);
  assert.doesNotThrow(() => new Function(auditoryClient));
});

test('Thought Control modes and sessions load before Asana', () => {
  const auditoryTag = presence.indexOf('<script src="auditory-client.js"></script>');
  const thoughtTag = presence.indexOf('<script src="thought-control-client.js"></script>');
  const asanaTag = presence.indexOf('<script src="asana-client.js"></script>');
  assert.notEqual(thoughtTag, -1);
  assert.ok(auditoryTag < thoughtTag, 'Thought Control loads after Auditory');
  assert.ok(thoughtTag < asanaTag, 'Thought Control must initialize before Asana');
  assert.equal(presence.split('<script src="thought-control-client.js"></script>').length - 1, 1);
  assert.doesNotMatch(presence, /function\s+buildTCSetupHTML\s*\(|function\s+startThoughtControl\s*\(/);
  assert.doesNotMatch(presence, /function\s+endThoughtControl\s*\(|function\s+saveTCResult\s*\(/);
  assert.match(thoughtControlClient, /var\s+TC_MODE_DEFS\s*=\s*\{/);
  assert.match(thoughtControlClient, /function\s+buildTCSetupHTML\s*\(/);
  assert.match(thoughtControlClient, /function\s+startThoughtControl\s*\(/);
  assert.match(thoughtControlClient, /function\s+endThoughtControl\s*\(/);
  assert.match(thoughtControlClient, /function\s+saveTCResult\s*\(/);
  assert.match(thoughtControlClient, /document\.getElementById\('tcTapArea'\)\.addEventListener/);
  assert.doesNotThrow(() => new Function(thoughtControlClient));
});

test('Asana and the shared wake lock load before Senses', () => {
  const thoughtTag = presence.indexOf('<script src="thought-control-client.js"></script>');
  const asanaTag = presence.indexOf('<script src="asana-client.js"></script>');
  const sensesTag = presence.indexOf('<script src="senses-client.js"></script>');
  assert.notEqual(asanaTag, -1);
  assert.ok(thoughtTag < asanaTag, 'Asana loads after Thought Control');
  assert.ok(asanaTag < sensesTag, 'Asana must initialize before Senses');
  assert.equal(presence.split('<script src="asana-client.js"></script>').length - 1, 1);
  assert.doesNotMatch(presence, /function\s+requestExerciseWakeLock\s*\(|function\s+startAsana\s*\(/);
  assert.doesNotMatch(presence, /function\s+endAsana\s*\(|function\s+saveAsanaResult\s*\(/);
  assert.match(asanaClient, /function\s+requestExerciseWakeLock\s*\(/);
  assert.match(asanaClient, /function\s+releaseExerciseWakeLock\s*\(/);
  assert.match(asanaClient, /function\s+startAsana\s*\(/);
  assert.match(asanaClient, /function\s+endAsana\s*\(/);
  assert.match(asanaClient, /function\s+saveAsanaResult\s*\(/);
  assert.match(asanaClient, /document\.getElementById\('asanaEndBtn'\)\.addEventListener/);
  assert.doesNotThrow(() => new Function(asanaClient));
});

test('Senses setup and sessions load before app mode switching', () => {
  const asanaTag = presence.indexOf('<script src="asana-client.js"></script>');
  const sensesTag = presence.indexOf('<script src="senses-client.js"></script>');
  const appShellTag = presence.indexOf('<script src="app-shell-client.js"></script>');
  assert.notEqual(sensesTag, -1);
  assert.ok(asanaTag < sensesTag, 'Senses requires the shared Asana alarm and wake lock');
  assert.ok(sensesTag < appShellTag, 'Senses retains its original position before app mode switching');
  assert.equal(presence.split('<script src="senses-client.js"></script>').length - 1, 1);
  assert.doesNotMatch(presence, /function\s+buildSenseSetupHTML\s*\(|function\s+startSenseSession\s*\(/);
  assert.doesNotMatch(presence, /function\s+endSenseSession\s*\(|function\s+showSenseResult\s*\(/);
  assert.match(sensesClient, /var\s+SENSE_MODE_DEFS\s*=\s*\{/);
  assert.match(sensesClient, /function\s+buildSenseSetupHTML\s*\(/);
  assert.match(sensesClient, /function\s+startSenseSession\s*\(/);
  assert.match(sensesClient, /function\s+endSenseSession\s*\(/);
  assert.match(sensesClient, /function\s+showSenseResult\s*\(/);
  assert.match(sensesClient, /document\.getElementById\('senseEndBtn'\)\.addEventListener/);
  assert.doesNotThrow(() => new Function(sensesClient));
});

test('app shell owns mode switching and primary navigation wiring', () => {
  const sensesTag = presence.indexOf('<script src="senses-client.js"></script>');
  const appShellTag = presence.indexOf('<script src="app-shell-client.js"></script>');
  const omniaAmbientTag = presence.indexOf('<script src="omnia-ambient-client.js"></script>');
  assert.notEqual(appShellTag, -1);
  assert.ok(sensesTag < appShellTag, 'app navigation loads after exercise clients');
  assert.ok(appShellTag < omniaAmbientTag, 'navigation exists before Omnia ambient animations initialize');
  assert.equal(presence.split('<script src="app-shell-client.js"></script>').length - 1, 1);
  assert.doesNotMatch(presence, /function\s+openAwarenessSubMenu\s*\(|function\s+switchMode\s*\(/);
  assert.match(appShellClient, /var\s+currentMode\s*=\s*['"]guide['"]/);
  assert.match(appShellClient, /function\s+openAwarenessSubMenu\s*\(/);
  assert.match(appShellClient, /function\s+closeAwarenessSubMenu\s*\(/);
  assert.match(appShellClient, /function\s+switchMode\s*\(/);
  assert.match(appShellClient, /document\.getElementById\('modeAwareness'\)\.addEventListener/);
  assert.match(appShellClient, /document\.getElementById\('modeConcentration'\)\.addEventListener/);
  assert.match(appShellClient, /document\.getElementById\('modePrayer'\)\.addEventListener/);
  assert.doesNotThrow(() => new Function(appShellClient));
});

test('Omnia ambient animation scheduling owns its client boundary', () => {
  const appShellTag = presence.indexOf('<script src="app-shell-client.js"></script>');
  const omniaAmbientTag = presence.indexOf('<script src="omnia-ambient-client.js"></script>');
  const concentrationControlsTag = presence.indexOf('<script src="concentration-controls-client.js"></script>');
  assert.notEqual(omniaAmbientTag, -1);
  assert.ok(appShellTag < omniaAmbientTag, 'ambient animations require current app mode state');
  assert.ok(omniaAmbientTag < concentrationControlsTag, 'ambient startup retains its original event-wiring position');
  assert.equal(presence.split('<script src="omnia-ambient-client.js"></script>').length - 1, 1);
  assert.doesNotMatch(presence, /function\s+initOmniaAnims\s*\(/);
  assert.match(omniaAmbientClient, /function\s+initOmniaAnims\s*\(/);
  assert.match(omniaAmbientClient, /window\._omniaQuickDismiss\s*=\s*function/);
  assert.match(omniaAmbientClient, /function\s+scheduleAmbient\s*\(/);
  assert.match(omniaAmbientClient, /peek\.addEventListener\('click'/);
  assert.match(omniaAmbientClient, /setTimeout\(trigger,\s*8000\)/);
  assert.doesNotThrow(() => new Function(omniaAmbientClient));
});

test('Concentration controls own their navigation and session wiring', () => {
  const omniaAmbientTag = presence.indexOf('<script src="omnia-ambient-client.js"></script>');
  const concentrationControlsTag = presence.indexOf('<script src="concentration-controls-client.js"></script>');
  const prayerTag = presence.indexOf('<script src="prayer-client.js"></script>');
  assert.notEqual(concentrationControlsTag, -1);
  assert.ok(omniaAmbientTag < concentrationControlsTag, 'Concentration controls retain their post-ambient position');
  assert.ok(concentrationControlsTag < prayerTag, 'Concentration controls initialize before Prayer');
  assert.equal(presence.split('<script src="concentration-controls-client.js"></script>').length - 1, 1);
  assert.doesNotMatch(presence, /document\.getElementById\('concStopBtn'\)\.addEventListener/);
  assert.match(concentrationControlsClient, /document\.getElementById\('concStopBtn'\)\.addEventListener/);
  assert.match(concentrationControlsClient, /document\.getElementById\('concStopBtn2'\)\.addEventListener/);
  assert.match(concentrationControlsClient, /document\.getElementById\('concHistoryBtn'\)\.addEventListener/);
  assert.match(concentrationControlsClient, /document\.getElementById\('concHistoryBack'\)\.addEventListener/);
  assert.match(concentrationControlsClient, /document\.getElementById\('concSaveBtn'\)\.addEventListener/);
  assert.doesNotThrow(() => new Function(concentrationControlsClient));
});

test('Guide recommendation tables live in a static configuration boundary', () => {
  const prayerTag = presence.indexOf('<script src="prayer-client.js"></script>');
  const guideConfigTag = presence.indexOf('<script src="guide-config-client.js"></script>');
  const omniaGrowth = presence.indexOf('var OMNIA_DEFAULT = {');
  assert.notEqual(guideConfigTag, -1);
  assert.ok(prayerTag < guideConfigTag, 'Guide configuration loads after Prayer');
  assert.ok(guideConfigTag < omniaGrowth, 'Guide configuration exists before the Omnia runtime');
  assert.equal(presence.split('<script src="guide-config-client.js"></script>').length - 1, 1);
  assert.doesNotMatch(presence, /var\s+GUIDE_DAILY_PLANS\s*=\s*\[/);
  assert.doesNotMatch(presence, /var\s+GUIDE_EXERCISES\s*=\s*\[/);
  assert.match(guideConfigClient, /var\s+GUIDE_DAILY_PLANS\s*=\s*\[/);
  assert.match(guideConfigClient, /var\s+GUIDE_EXERCISES\s*=\s*\[/);
  assert.match(guideConfigClient, /focus:\s*['"]Rest & Inward Turning['"]/);
  assert.match(guideConfigClient, /id:\s*['"]soulmirror['"]/);
  assert.doesNotThrow(() => new Function(guideConfigClient));
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
  const guideStart = presence.indexOf('<script src="guide-config-client.js"></script>');
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
