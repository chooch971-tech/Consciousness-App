'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const presence = fs.readFileSync(path.join(root, 'presence.html'), 'utf8');
const server = fs.readFileSync(path.join(root, 'server.js'), 'utf8');
const serviceWorker = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
const awarenessClient = fs.readFileSync(path.join(root, 'awareness-client.js'), 'utf8');
const concentrationStateClient = fs.readFileSync(path.join(root, 'concentration-state-client.js'), 'utf8');
const concentrationClockClient = fs.readFileSync(path.join(root, 'concentration-clock-client.js'), 'utf8');
const visualizationClient = fs.readFileSync(path.join(root, 'visualization-client.js'), 'utf8');
const auditoryClient = fs.readFileSync(path.join(root, 'auditory-client.js'), 'utf8');
const thoughtControlClient = fs.readFileSync(path.join(root, 'thought-control-client.js'), 'utf8');
const asanaClient = fs.readFileSync(path.join(root, 'asana-client.js'), 'utf8');
const sensesClient = fs.readFileSync(path.join(root, 'senses-client.js'), 'utf8');
const appShellClient = fs.readFileSync(path.join(root, 'app-shell-client.js'), 'utf8');
const omniaAmbientClient = fs.readFileSync(path.join(root, 'omnia-ambient-client.js'), 'utf8');
const concentrationControlsClient = fs.readFileSync(path.join(root, 'concentration-controls-client.js'), 'utf8');
const poreBreathingClient = fs.readFileSync(path.join(root, 'pore-breathing-client.js'), 'utf8');
const appPreferencesClient = fs.readFileSync(path.join(root, 'app-preferences-client.js'), 'utf8');
const guideConfigClient = fs.readFileSync(path.join(root, 'guide-config-client.js'), 'utf8');
const omniaEconomyConfigClient = fs.readFileSync(path.join(root, 'omnia-economy-config-client.js'), 'utf8');
const omniaCosmeticsConfigClient = fs.readFileSync(path.join(root, 'omnia-cosmetics-config-client.js'), 'utf8');
const omniaProgressionConfigClient = fs.readFileSync(path.join(root, 'omnia-progression-config-client.js'), 'utf8');
const omniaStoryClient = fs.readFileSync(path.join(root, 'omnia-story-client.js'), 'utf8');
const omniaStateClient = fs.readFileSync(path.join(root, 'omnia-state-client.js'), 'utf8');
const omniaLedgerClient = fs.readFileSync(path.join(root, 'omnia-ledger-client.js'), 'utf8');
const omniaAppearanceClient = fs.readFileSync(path.join(root, 'omnia-appearance-client.js'), 'utf8');
const omniaEconomyClient = fs.readFileSync(path.join(root, 'omnia-economy-client.js'), 'utf8');
const omniaBook2Client = fs.readFileSync(path.join(root, 'omnia-book2-client.js'), 'utf8');
const omniaRewardsClient = fs.readFileSync(path.join(root, 'omnia-rewards-client.js'), 'utf8');
const omniaEngineClient = fs.readFileSync(path.join(root, 'omnia-engine-client.js'), 'utf8');
const omniaMorphClient = fs.readFileSync(path.join(root, 'omnia-morph-client.js'), 'utf8');
const guidePathClient = fs.readFileSync(path.join(root, 'guide-path-client.js'), 'utf8');
const guideQuestsClient = fs.readFileSync(path.join(root, 'guide-quests-client.js'), 'utf8');
const guideShellClient = fs.readFileSync(path.join(root, 'guide-shell-client.js'), 'utf8');
const reportsClient = fs.readFileSync(path.join(root, 'reports-client.js'), 'utf8');
const platformClient = fs.readFileSync(path.join(root, 'platform-client.js'), 'utf8');
const profileClient = fs.readFileSync(path.join(root, 'profile-client.js'), 'utf8');
const settingsClient = fs.readFileSync(path.join(root, 'settings-client.js'), 'utf8');
const achievementsClient = fs.readFileSync(path.join(root, 'achievements-client.js'), 'utf8');
const prayerClient = fs.readFileSync(path.join(root, 'prayer-client.js'), 'utf8');
const streakCelebrationClient = fs.readFileSync(path.join(root, 'streak-celebration-client.js'), 'utf8');
const sessionCompleteClient = fs.readFileSync(path.join(root, 'session-complete-client.js'), 'utf8');
const streakClient = fs.readFileSync(path.join(root, 'streak-client.js'), 'utf8');
const omniaCompanionClient = fs.readFileSync(path.join(root, 'omnia-companion-client.js'), 'utf8');
const remindersClient = fs.readFileSync(path.join(root, 'reminders-client.js'), 'utf8');
const pavlokClient = fs.readFileSync(path.join(root, 'pavlok-client.js'), 'utf8');
const tutorialPostSessionClient = fs.readFileSync(path.join(root, 'tutorial-post-session-client.js'), 'utf8');
const tutorialClient = fs.readFileSync(path.join(root, 'tutorial-client.js'), 'utf8');
const soulMirrorClient = fs.readFileSync(path.join(root, 'soul-mirror-client.js'), 'utf8');
const journalClient = fs.readFileSync(path.join(root, 'journal-client.js'), 'utf8');
const socialClient = fs.readFileSync(path.join(root, 'social-client.js'), 'utf8');

test('every declared client module parses and is precached', () => {
  const clientScripts = [...presence.matchAll(/<script\s+src="([^"]+-client\.js)"><\/script>/g)]
    .map(match => match[1]);
  assert.ok(clientScripts.length >= 45, 'expected the complete feature-module graph');
  clientScripts.forEach(file => {
    const source = fs.readFileSync(path.join(root, file), 'utf8');
    assert.match(serviceWorker, new RegExp("['\"]" + file.replace('.', '\\.') + "['\"]"));
    assert.doesNotThrow(() => new Function(source), file + ' must parse');
  });
});

test('production code does not ship the retired Bardon RPG', () => {
  assert.doesNotMatch(presence, /bardonScreen|drawerBardon|bardon_rpg_v2|BARDON GAME/);
  assert.doesNotMatch(server, /bardon_rpg_v2/);
});

test('server does not expose the retired sync diagnostic route', () => {
  assert.doesNotMatch(server, /\/api\/sync\/sync\/diagnose/);
});

test('server does not accept traffic after a MongoDB startup failure', () => {
  assert.match(server, /MongoDB connection failed:[\s\S]*?throw err;/);
  assert.match(server, /connectDB\(\)\.then\([\s\S]*?\}\)\.catch\(\(\) => \{\s*process\.exit\(1\);/);
});

test('externally costly sign-in and Pavlok routes are rate limited', () => {
  assert.match(server, /app\.post\('\/api\/sync\/auth\/google', authRateLimit,/);
  assert.match(server, /function\s+pavlokRateLimit\s*\(/);
  assert.match(server, /app\.post\('\/api\/pavlok\/link', pavlokRateLimit,/);
  assert.match(server, /app\.post\('\/api\/pavlok\/stimulus', pavlokRateLimit,/);
  assert.match(server, /pavlokRateBuckets\.delete/);
});

test('medium-risk mutation and push paths have bounded, constant-time guards', () => {
  assert.match(server, /app\.set\('trust proxy', 1\)/);
  assert.match(server, /function\s+secretsMatch\s*\([\s\S]*?crypto\.timingSafeEqual/);
  assert.match(server, /verifyAdmin[\s\S]*?secretsMatch\(provided, ADMIN_SECRET\)/);
  assert.match(server, /verifyPushOwner[\s\S]*?secretsMatch\(authKey, stored\)/);
  assert.match(server, /const\s+MUTATION_RATE_LIMIT\s*=\s*90/);
  assert.match(server, /const\s+SUBSCRIPTION_RATE_LIMIT\s*=\s*12/);
  assert.match(server, /app\.post\('\/api\/sync\/sync\/push', verifyToken, mutationRateLimit,/);
  assert.match(server, /app\.post\('\/api\/social\/posts', verifyToken, mutationRateLimit,/);
  assert.match(server, /app\.post\('\/api\/social\/conversations\/:id\/messages', verifyToken, mutationRateLimit,/);
  assert.match(server, /app\.post\('\/subscribe', subscriptionRateLimit,/);
  assert.match(server, /subscription\.endpoint\.length > 2048/);
  assert.match(server, /typeof deviceId !== 'string' \|\| !deviceId \|\| deviceId\.length > 128/);
});

test('server returns JSON for parser, CORS, and unexpected request failures', () => {
  assert.match(server, /app\.use\(\(err, req, res, next\) => \{/);
  assert.match(server, /CORS: origin not allowed[\s\S]*?status\(403\)\.json\(\{ error: 'Origin not allowed' \}\)/);
  assert.match(server, /entity\.too\.large[\s\S]*?status\(413\)\.json\(\{ error: 'Request body too large' \}\)/);
  assert.match(server, /entity\.parse\.failed[\s\S]*?status\(400\)\.json\(\{ error: 'Invalid JSON body' \}\)/);
  assert.match(server, /status\(500\)\.json\(\{ error: 'Unexpected server error' \}\)/);
});

test('social resource routes reject malformed identifiers before database access', () => {
  assert.match(server, /app\.param\('id', \(req, res, next, id\) => \{/);
  assert.match(server, /isValidSocialResourceId\(id, req\.path\)/);
  assert.match(server, /require\('\.\/social-route-ids'\)/);
  assert.match(server, /status\(400\)\.json\(\{ error: 'Invalid resource identifier' \}\)/);
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

test('Concentration progression state loads before startup restoration', () => {
  const awarenessTag = presence.indexOf('<script src="awareness-client.js"></script>');
  const stateTag = presence.indexOf('<script src="concentration-state-client.js"></script>');
  const modeDeclaration = presence.indexOf('var currentMode;');
  assert.notEqual(stateTag, -1);
  assert.ok(awarenessTag < stateTag, 'Concentration ranks depend on Awareness rank titles');
  assert.ok(stateTag < modeDeclaration, 'Concentration state must exist before startup restoration');
  assert.equal(presence.split('<script src="concentration-state-client.js"></script>').length - 1, 1);
  assert.doesNotMatch(presence, /function\s+getConcRank\s*\(|function\s+loadConcState\s*\(/);
  assert.doesNotMatch(presence, /\bCONC_DEFAULT\s*=\s*\{/);
  assert.match(concentrationStateClient, /function\s+getConcRank\s*\(/);
  assert.match(concentrationStateClient, /function\s+loadConcState\s*\(/);
  assert.match(concentrationStateClient, /function\s+isConcNewSession\s*\(/);
  assert.match(concentrationStateClient, /migrateConcLevel/);
  assert.match(serviceWorker, /['"]concentration-state-client\.js['"]/);
  assert.doesNotThrow(() => new Function(concentrationStateClient));
});

test('startup cloud restoration keeps the splash in one document', () => {
  const applyStart = presence.indexOf('function _applyStartupPull(result)');
  const pullStart = presence.indexOf('function _startupPull(attempt)', applyStart);
  assert.notEqual(applyStart, -1);
  assert.notEqual(pullStart, -1);
  const startupApply = presence.slice(applyStart, pullStart);
  assert.match(startupApply, /rehydrateProgressAfterPull\(\)/);
  assert.doesNotMatch(startupApply, /window\.location\.reload\(\)/);
});

test('Clock sessions and Concentration history load through their own client boundary', () => {
  const stateTag = presence.indexOf('<script src="concentration-state-client.js"></script>');
  const clockTag = presence.indexOf('<script src="concentration-clock-client.js"></script>');
  const visualizationTag = presence.indexOf('<script src="visualization-client.js"></script>');
  assert.notEqual(clockTag, -1);
  assert.ok(stateTag < clockTag, 'Clock sessions require Concentration state');
  assert.ok(clockTag < visualizationTag, 'Clock helpers initialize before shared exercise clients');
  assert.equal(presence.split('<script src="concentration-clock-client.js"></script>').length - 1, 1);
  assert.doesNotMatch(presence, /function\s+buildClockSVG\s*\(|function\s+startConcentration\s*\(/);
  assert.doesNotMatch(presence, /function\s+saveConcResult\s*\(|function\s+renderConcHistory\s*\(/);
  assert.match(concentrationClockClient, /function\s+buildClockSVG\s*\(/);
  assert.match(concentrationClockClient, /function\s+startConcentration\s*\(/);
  assert.match(concentrationClockClient, /function\s+saveConcResult\s*\(/);
  assert.match(concentrationClockClient, /function\s+renderConcHistory\s*\(/);
  assert.match(serviceWorker, /['"]concentration-clock-client\.js['"]/);
  assert.doesNotThrow(() => new Function(concentrationClockClient));
});

test('Pore Breathing loads through its own late runtime boundary', () => {
  const poreTag = presence.indexOf('<script src="pore-breathing-client.js"></script>');
  const tutorialMarkup = presence.indexOf('<div id="tutOverlay">');
  assert.notEqual(poreTag, -1);
  assert.ok(poreTag < tutorialMarkup, 'Pore Breathing initializes before later tutorial markup');
  assert.equal(presence.split('<script src="pore-breathing-client.js"></script>').length - 1, 1);
  assert.doesNotMatch(presence, /function\s+startPoreBreath\s*\(|function\s+stopPoreBreath\s*\(/);
  assert.match(poreBreathingClient, /function\s+startPoreBreath\s*\(/);
  assert.match(poreBreathingClient, /function\s+stopPoreBreath\s*\(/);
  assert.match(poreBreathingClient, /recordExerciseCompletion/);
  assert.match(serviceWorker, /['"]pore-breathing-client\.js['"]/);
  assert.doesNotThrow(() => new Function(poreBreathingClient));
});

test('shared app preferences load through their own late runtime boundary', () => {
  const poreTag = presence.indexOf('<script src="pore-breathing-client.js"></script>');
  const preferencesTag = presence.indexOf('<script src="app-preferences-client.js"></script>');
  const tutorialMarkup = presence.indexOf('<div id="tutOverlay">');
  assert.notEqual(preferencesTag, -1);
  assert.ok(poreTag < preferencesTag, 'preferences retain the original post-Pore load order');
  assert.ok(preferencesTag < tutorialMarkup, 'preferences initialize before later tutorial markup');
  assert.equal(presence.split('<script src="app-preferences-client.js"></script>').length - 1, 1);
  assert.doesNotMatch(presence, /function\s+getOmniaCandor\s*\(/);
  assert.doesNotMatch(presence, /window\.appSoundEnabled\s*=/);
  assert.match(appPreferencesClient, /function\s+getOmniaCandor\s*\(/);
  assert.match(appPreferencesClient, /window\.appSoundEnabled\s*=/);
  assert.match(appPreferencesClient, /unlockAudioOnFirstInteraction/);
  assert.match(serviceWorker, /['"]app-preferences-client\.js['"]/);
  assert.doesNotThrow(() => new Function(appPreferencesClient));
});

test('top-level drawer screens reveal the open drawer during swipe-back', () => {
  assert.match(presence, /var revealsDrawer = prevIsHome && !!window\._returnToDrawer/);
  assert.match(presence, /function makeDrawerPreview\(host\)[\s\S]*cloneNode\(true\)[\s\S]*host\.appendChild\(preview\)/);
  assert.match(presence, /var drawerPreview = revealsDrawer \? makeDrawerPreview\(prevEl\) : null/);
  assert.match(presence, /guideClone\.classList\.add\('drawer-omnia-preview'\)/);
  assert.match(presence, /\.drawer-omnia-preview \{[^}]*margin-bottom:14px/);
  assert.match(presence, /function uniquifyDrawerPreviewIds\(root\)[\s\S]*?value\.split\('#' \+ oldId\)\.join\('#' \+ idMap\[oldId\]\)/);
  assert.match(presence, /function startDrawerGuideMirror\(sourceGuide, guideClone, preview\)[\s\S]*?requestAnimationFrame\(mirrorFrame\)/);
  assert.match(presence, /pair\[1\]\.style\.setProperty\('transform', frame\.transform, 'important'\)/);
  assert.match(presence, /function openDrawer\(instant, preserveGuideAnimation\)/);
  assert.match(presence, /if \(!preserveGuideAnimation\) \{[\s\S]*?updateDrawerEntityBtn/);
  assert.match(presence, /window\._preserveDrawerGuideAnimation = !!drawerPreview;[\s\S]*?backBtn\.click\(\);[\s\S]*?window\._preserveDrawerGuideAnimation = false;/);
  assert.match(omniaAppearanceClient, /function updateDrawerEntityBtn\(\) \{\s*[\s\S]*?if \(window\._preserveDrawerGuideAnimation\) return;/);
  assert.match(presence, /if \(drawerPreview\) \{\s*removeDrawerPreview\(drawerPreview\);\s*openDrawer\(true, true\);/);
  assert.match(presence, /querySelector\('[^']*\.lodge-back[^']*'\)/);
  assert.match(presence, /visibilitychange[\s\S]*abortInterruptedSwipe/);
  assert.match(presence, /if \(el\.id !== 'profileScreen'\) el\.style\.background = 'var\(--bg\)'/);
  assert.match(presence, /chatListScreen: 'lodgeScreen', chatThreadScreen: 'chatListScreen'/);
  assert.match(presence, /screenEl\.id === 'chatThreadScreen' && typeof chatThreadPreviousScreen === 'function/);
});

test('Visualization and the shared exercise gateway load before Auditory', () => {
  const visualizationTag = presence.indexOf('<script src="visualization-client.js"></script>');
  const concentrationStateTag = presence.indexOf('<script src="concentration-state-client.js"></script>');
  const concentrationClockTag = presence.indexOf('<script src="concentration-clock-client.js"></script>');
  const modeDeclaration = presence.indexOf('var currentMode;');
  const auditoryTag = presence.indexOf('<script src="auditory-client.js"></script>');
  assert.notEqual(visualizationTag, -1);
  assert.ok(concentrationStateTag < visualizationTag, 'Visualization requires Concentration state');
  assert.ok(concentrationClockTag < visualizationTag, 'Visualization shares Concentration results and history');
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
  const omniaEconomyConfigTag = presence.indexOf('<script src="omnia-economy-config-client.js"></script>');
  assert.notEqual(guideConfigTag, -1);
  assert.ok(prayerTag < guideConfigTag, 'Guide configuration loads after Prayer');
  assert.ok(guideConfigTag < omniaEconomyConfigTag, 'Guide configuration exists before the Omnia economy configuration');
  assert.equal(presence.split('<script src="guide-config-client.js"></script>').length - 1, 1);
  assert.doesNotMatch(presence, /var\s+GUIDE_DAILY_PLANS\s*=\s*\[/);
  assert.doesNotMatch(presence, /var\s+GUIDE_EXERCISES\s*=\s*\[/);
  assert.match(guideConfigClient, /var\s+GUIDE_DAILY_PLANS\s*=\s*\[/);
  assert.match(guideConfigClient, /var\s+GUIDE_EXERCISES\s*=\s*\[/);
  assert.match(guideConfigClient, /focus:\s*['"]Rest & Inward Turning['"]/);
  assert.match(guideConfigClient, /id:\s*['"]soulmirror['"]/);
  assert.doesNotThrow(() => new Function(guideConfigClient));
});

test('Omnia economy defaults and metadata live in a static configuration boundary', () => {
  const guideConfigTag = presence.indexOf('<script src="guide-config-client.js"></script>');
  const omniaEconomyConfigTag = presence.indexOf('<script src="omnia-economy-config-client.js"></script>');
  const cosmeticsConfigTag = presence.indexOf('<script src="omnia-cosmetics-config-client.js"></script>');
  assert.notEqual(omniaEconomyConfigTag, -1);
  assert.ok(guideConfigTag < omniaEconomyConfigTag, 'Omnia economy configuration loads after Guide configuration');
  assert.ok(omniaEconomyConfigTag < cosmeticsConfigTag, 'Omnia economy configuration loads before cosmetic configuration');
  assert.equal(presence.split('<script src="omnia-economy-config-client.js"></script>').length - 1, 1);
  assert.doesNotMatch(presence, /var\s+OMNIA_DEFAULT\s*=\s*\{/);
  assert.doesNotMatch(presence, /var\s+OMNIA_UPGRADES\s*=\s*\[/);
  assert.match(omniaEconomyConfigClient, /bodies:\s*\{\s*physical:1,\s*astral:1,\s*mental:1\s*\}/);
  assert.match(omniaEconomyConfigClient, /var\s+OMNIA_EXERCISE_META\s*=\s*\{/);
  assert.match(omniaEconomyConfigClient, /id:['"]current['"],\s*name:['"]Generator I['"]/);
  assert.doesNotThrow(() => new Function(omniaEconomyConfigClient));
});

test('Omnia cosmetic catalogs live in a static configuration boundary', () => {
  const economyTag = presence.indexOf('<script src="omnia-economy-config-client.js"></script>');
  const cosmeticsTag = presence.indexOf('<script src="omnia-cosmetics-config-client.js"></script>');
  const paletteRuntime = presence.indexOf('function omniaPaletteFilterFor(');
  assert.notEqual(cosmeticsTag, -1);
  assert.ok(economyTag < cosmeticsTag, 'Cosmetic configuration loads after economy defaults');
  assert.ok(cosmeticsTag < paletteRuntime, 'Cosmetic configuration loads before appearance behavior');
  assert.equal(presence.split('<script src="omnia-cosmetics-config-client.js"></script>').length - 1, 1);
  assert.doesNotMatch(presence, /var\s+OMNIA_PALETTES\s*=\s*\[/);
  assert.doesNotMatch(presence, /var\s+OMNIA_COMPANIONS\s*=\s*\[/);
  assert.match(omniaCosmeticsConfigClient, /id:['"]aether['"],\s*name:['"]Aether Blue['"]/);
  assert.match(omniaCosmeticsConfigClient, /id:['"]corgi['"],\s*name:['"]Astral Corgi['"]/);
  assert.match(omniaCosmeticsConfigClient, /var\s+OMNIA_ENTITY_NATIVE_PALETTE\s*=\s*\{/);
  assert.doesNotThrow(() => new Function(omniaCosmeticsConfigClient));
});

test('Omnia progression thresholds and story beats live in a static configuration boundary', () => {
  const cosmeticsTag = presence.indexOf('<script src="omnia-cosmetics-config-client.js"></script>');
  const progressionTag = presence.indexOf('<script src="omnia-progression-config-client.js"></script>');
  const storyTag = presence.indexOf('<script src="omnia-story-client.js"></script>');
  assert.notEqual(progressionTag, -1);
  assert.ok(cosmeticsTag < progressionTag, 'Progression configuration loads after cosmetic configuration');
  assert.ok(progressionTag < storyTag, 'Progression configuration loads before story behavior');
  assert.equal(presence.split('<script src="omnia-progression-config-client.js"></script>').length - 1, 1);
  assert.doesNotMatch(presence, /var\s+OMNIA_BARDON_STEPS\s*=\s*\[/);
  assert.doesNotMatch(presence, /var\s+OMNIA_STORY\s*=\s*\[/);
  assert.match(omniaProgressionConfigClient, /step:10,[\s\S]*?physical:430,\s*astral:430,\s*mental:430/);
  assert.match(omniaProgressionConfigClient, /id:['"]s10_final['"]/);
  assert.doesNotThrow(() => new Function(omniaProgressionConfigClient));
});

test('Omnia story evaluation and chat UI live in a dedicated client boundary', () => {
  const progressionTag = presence.indexOf('<script src="omnia-progression-config-client.js"></script>');
  const storyTag = presence.indexOf('<script src="omnia-story-client.js"></script>');
  const stateTag = presence.indexOf('<script src="omnia-state-client.js"></script>');
  assert.notEqual(storyTag, -1);
  assert.ok(progressionTag < storyTag, 'Story behavior loads after progression configuration');
  assert.ok(storyTag < stateTag, 'Story behavior loads before Omnia state runtime');
  assert.equal(presence.split('<script src="omnia-story-client.js"></script>').length - 1, 1);
  assert.doesNotMatch(presence, /function\s+omniaStoryBeatUnlocked\s*\(/);
  assert.doesNotMatch(presence, /function\s+openOmniaChat\s*\(/);
  assert.match(omniaStoryClient, /function\s+omniaStoryBeatUnlocked\s*\(/);
  assert.match(omniaStoryClient, /function\s+evaluateOmniaStory\s*\(/);
  assert.match(omniaStoryClient, /function\s+updateOmniaChatBadge\s*\(/);
  assert.match(omniaStoryClient, /function\s+openOmniaChat\s*\(/);
  assert.match(omniaStoryClient, /function\s+closeOmniaChat\s*\(/);
  assert.doesNotThrow(() => new Function(omniaStoryClient));
});

test('Omnia persistence and cloud reconciliation live in a dedicated client boundary', () => {
  const storyTag = presence.indexOf('<script src="omnia-story-client.js"></script>');
  const stateTag = presence.indexOf('<script src="omnia-state-client.js"></script>');
  const appearanceTag = presence.indexOf('<script src="omnia-appearance-client.js"></script>');
  assert.notEqual(stateTag, -1);
  assert.ok(storyTag < stateTag, 'Omnia state loads after story behavior');
  assert.ok(stateTag < appearanceTag, 'Omnia state initializes before appearance behavior');
  assert.equal(presence.split('<script src="omnia-state-client.js"></script>').length - 1, 1);
  assert.doesNotMatch(presence, /function\s+cloneOmniaDefault\s*\(/);
  assert.doesNotMatch(presence, /function\s+mergeOmniaPull\s*\(/);
  assert.doesNotMatch(presence, /function\s+loadOmniaState\s*\(/);
  assert.doesNotMatch(presence, /function\s+saveOmniaState\s*\(/);
  assert.match(omniaStateClient, /function\s+cloneOmniaDefault\s*\(/);
  assert.match(omniaStateClient, /function\s+clampOmniaBodies\s*\(/);
  assert.match(omniaStateClient, /function\s+mergeOmniaPull\s*\(/);
  assert.match(omniaStateClient, /function\s+loadOmniaState\s*\(/);
  assert.match(omniaStateClient, /function\s+saveOmniaState\s*\(/);
  assert.match(omniaStateClient, /var\s+omniaState\s*=\s*loadOmniaState\(\)/);
  assert.doesNotThrow(() => new Function(omniaStateClient));
});

test('Akasha accounting lives in a local ledger between state and feature behavior', () => {
  const stateTag = presence.indexOf('<script src="omnia-state-client.js"></script>');
  const ledgerTag = presence.indexOf('<script src="omnia-ledger-client.js"></script>');
  const appearanceTag = presence.indexOf('<script src="omnia-appearance-client.js"></script>');
  assert.notEqual(ledgerTag, -1);
  assert.ok(stateTag < ledgerTag, 'Ledger loads after Omnia state initialization');
  assert.ok(ledgerTag < appearanceTag, 'Ledger loads before Akasha-consuming features');
  assert.equal(presence.split('<script src="omnia-ledger-client.js"></script>').length - 1, 1);
  assert.match(serviceWorker, /['"]omnia-ledger-client\.js['"]/);
  assert.match(omniaLedgerClient, /function\s+credit\s*\(/);
  assert.match(omniaLedgerClient, /function\s+spend\s*\(/);
  assert.match(omniaLedgerClient, /function\s+transfer\s*\(/);
  assert.match(omniaLedgerClient, /function\s+mint\s*\(/);
  assert.match(omniaLedgerClient, /function\s+migrateLegacyExerciseLog\s*\(/);
  assert.doesNotThrow(() => new Function(omniaLedgerClient));
});

test('Omnia cosmetic rendering and selection live in a dedicated client boundary', () => {
  const stateTag = presence.indexOf('<script src="omnia-state-client.js"></script>');
  const appearanceTag = presence.indexOf('<script src="omnia-appearance-client.js"></script>');
  const economyTag = presence.indexOf('<script src="omnia-economy-client.js"></script>');
  assert.notEqual(appearanceTag, -1);
  assert.ok(stateTag < appearanceTag, 'Appearance behavior loads after Omnia state');
  assert.ok(appearanceTag < economyTag, 'Appearance behavior loads before economy runtime');
  assert.equal(presence.split('<script src="omnia-appearance-client.js"></script>').length - 1, 1);
  assert.doesNotMatch(presence, /function\s+omniaFindCosmetic\s*\(/);
  assert.doesNotMatch(presence, /function\s+renderOmniaAppearance\s*\(/);
  assert.doesNotMatch(presence, /function\s+unlockOrSelectOmniaCosmetic\s*\(/);
  assert.match(omniaAppearanceClient, /function\s+omniaFindCosmetic\s*\(/);
  assert.match(omniaAppearanceClient, /function\s+renderOmniaEntityPreview\s*\(/);
  assert.match(omniaAppearanceClient, /function\s+applyOmniaCosmetics\s*\(/);
  assert.match(omniaAppearanceClient, /function\s+renderOmniaAppearance\s*\(/);
  assert.match(omniaAppearanceClient, /function\s+unlockOrSelectOmniaCosmetic\s*\(/);
  assert.doesNotThrow(() => new Function(omniaAppearanceClient));
});

test('Omnia core economy math lives in a dedicated client boundary', () => {
  const appearanceTag = presence.indexOf('<script src="omnia-appearance-client.js"></script>');
  const economyTag = presence.indexOf('<script src="omnia-economy-client.js"></script>');
  const bookTwoTag = presence.indexOf('<script src="omnia-book2-client.js"></script>');
  assert.notEqual(economyTag, -1);
  assert.ok(appearanceTag < economyTag, 'Core economy loads after appearance behavior');
  assert.ok(economyTag < bookTwoTag, 'Core economy loads before Book II progression');
  assert.equal(presence.split('<script src="omnia-economy-client.js"></script>').length - 1, 1);
  assert.doesNotMatch(presence, /function\s+omniaBodyTotal\s*\(/);
  assert.doesNotMatch(presence, /function\s+omniaAccrue\s*\(/);
  assert.doesNotMatch(presence, /function\s+omniaBodyCost\s*\(/);
  assert.doesNotMatch(presence, /function\s+mintDarkMatterFromPractice\s*\(/);
  assert.match(omniaEconomyClient, /function\s+omniaBodyTotal\s*\(/);
  assert.match(omniaEconomyClient, /function\s+omniaRatePerHour\s*\(/);
  assert.match(omniaEconomyClient, /function\s+omniaAccrue\s*\(/);
  assert.match(omniaEconomyClient, /function\s+omniaBodyCost\s*\(/);
  assert.match(omniaEconomyClient, /function\s+mintDarkMatterFromPractice\s*\(/);
  assert.doesNotThrow(() => new Function(omniaEconomyClient));
});

test('Omnia Book II and prestige progression live in a dedicated client boundary', () => {
  const economyTag = presence.indexOf('<script src="omnia-economy-client.js"></script>');
  const bookTwoTag = presence.indexOf('<script src="omnia-book2-client.js"></script>');
  const rewardsTag = presence.indexOf('<script src="omnia-rewards-client.js"></script>');
  assert.notEqual(bookTwoTag, -1);
  assert.ok(economyTag < bookTwoTag, 'Book II progression loads after core economy math');
  assert.ok(bookTwoTag < rewardsTag, 'Book II progression loads before recommendation and reward behavior');
  assert.equal(presence.split('<script src="omnia-book2-client.js"></script>').length - 1, 1);
  assert.doesNotMatch(presence, /var\s+BOOK2_TOOLS\s*=\s*\[/);
  assert.doesNotMatch(presence, /function\s+omniaBuildToolPhase\s*\(/);
  assert.doesNotMatch(presence, /function\s+omniaTravelSphere\s*\(/);
  assert.doesNotMatch(presence, /function\s+omniaPrestige\s*\(/);
  assert.match(omniaBook2Client, /var\s+BOOK2_TOOLS\s*=\s*\[/);
  assert.match(omniaBook2Client, /function\s+omniaBuildToolPhase\s*\(/);
  assert.match(omniaBook2Client, /function\s+omniaBuildBookIIBody\s*\(/);
  assert.match(omniaBook2Client, /function\s+omniaTravelSphere\s*\(/);
  assert.match(omniaBook2Client, /function\s+omniaPrestige\s*\(/);
  assert.match(omniaBook2Client, /function\s+showPrestigeCeremony\s*\(/);
  assert.doesNotThrow(() => new Function(omniaBook2Client));
});

test('Omnia recommendations and exercise rewards live in a dedicated client boundary', () => {
  const bookTwoTag = presence.indexOf('<script src="omnia-book2-client.js"></script>');
  const rewardsTag = presence.indexOf('<script src="omnia-rewards-client.js"></script>');
  const engineTag = presence.indexOf('<script src="omnia-engine-client.js"></script>');
  assert.notEqual(rewardsTag, -1);
  assert.ok(bookTwoTag < rewardsTag, 'Rewards load after Book II progression');
  assert.ok(rewardsTag < engineTag, 'Rewards load before engine rendering');
  assert.equal(presence.split('<script src="omnia-rewards-client.js"></script>').length - 1, 1);
  assert.doesNotMatch(presence, /function\s+omniaPickRecommendation\s*\(/);
  assert.doesNotMatch(presence, /function\s+omniaExerciseReward\s*\(/);
  assert.doesNotMatch(presence, /function\s+awardOmniaForExercise\s*\(/);
  assert.match(omniaRewardsClient, /function\s+omniaCurrentStep\s*\(/);
  assert.match(omniaRewardsClient, /function\s+omniaPickRecommendation\s*\(/);
  assert.match(omniaRewardsClient, /function\s+omniaHighlightedExerciseIds\s*\(/);
  assert.match(omniaRewardsClient, /function\s+omniaExerciseReward\s*\(/);
  assert.match(omniaRewardsClient, /function\s+omniaConfirmEarlyEnd\s*\(/);
  assert.match(omniaRewardsClient, /function\s+awardOmniaForExercise\s*\(/);
  assert.match(omniaRewardsClient, /function\s+showBodyLevelAward\s*\(/);
  assert.doesNotThrow(() => new Function(omniaRewardsClient));
});

test('Omnia engine rendering and generator controls live in a dedicated client boundary', () => {
  const rewardsTag = presence.indexOf('<script src="omnia-rewards-client.js"></script>');
  const engineTag = presence.indexOf('<script src="omnia-engine-client.js"></script>');
  const morphTag = presence.indexOf('<script src="omnia-morph-client.js"></script>');
  assert.notEqual(engineTag, -1);
  assert.ok(rewardsTag < engineTag, 'Engine rendering loads after reward behavior');
  assert.ok(engineTag < morphTag, 'Engine rendering loads before click-morph animation data');
  assert.equal(presence.split('<script src="omnia-engine-client.js"></script>').length - 1, 1);
  assert.doesNotMatch(presence, /function\s+renderOmniaEngine\s*\(/);
  assert.doesNotMatch(presence, /function\s+renderOmniaGenYard\s*\(/);
  assert.doesNotMatch(presence, /function\s+buyOmniaUpgrade\s*\(/);
  assert.match(omniaEngineClient, /function\s+renderOmniaEngine\s*\(/);
  assert.match(omniaEngineClient, /function\s+collectOmniaAkasha\s*\(/);
  assert.match(omniaEngineClient, /function\s+buildOmniaBody\s*\(/);
  assert.match(omniaEngineClient, /var\s+OMNIA_GEN_META\s*=\s*\[/);
  assert.match(omniaEngineClient, /var\s+DM_GEN_META\s*=\s*\[/);
  assert.match(omniaEngineClient, /function\s+confirmOmniaUpgradeMastery\s*\(/);
  assert.match(omniaEngineClient, /function\s+dmPumpBuildingId\s*\(/);
  assert.match(omniaEngineClient, /function\s+dmResonanceMult\s*\(/);
  assert.match(omniaEngineClient, /function\s+renderOmniaGenYard\s*\(/);
  assert.match(omniaEngineClient, /function\s+buyOmniaUpgrade\s*\(/);
  assert.match(omniaEngineClient, /function\s+beginOmniaRecommendation\s*\(/);
  assert.doesNotThrow(() => new Function(omniaEngineClient));
});

test('generator collection effects stay anchored and clipped to the viewport without an Akasha amount badge', () => {
  assert.match(omniaEngineClient, /anchorEl\.isConnected/);
  assert.match(omniaEngineClient, /querySelector\('\[data-gen-tap="' \+ gid \+ '\"\]'\)/);
  assert.match(omniaEngineClient, /fxLayer\.className = 'oe-collection-fx'/);
  assert.match(omniaEngineClient, /fxLayer\.appendChild\(sp\)/);
  assert.doesNotMatch(omniaEngineClient, /burst\.textContent = '\+' \+ collected \+ ' akasha'/);
  assert.match(presence, /\.oe-collection-fx \{[^}]*position:fixed;[^}]*inset:0;[^}]*overflow:hidden;[^}]*contain:strict/);
  assert.doesNotMatch(omniaEngineClient, /canCollect(?:Sheet)? \? ' · <span[^']*tap the pump to collect/);
});

test('Omnia click-morph geometry and animation live in a dedicated client boundary', () => {
  const engineTag = presence.indexOf('<script src="omnia-engine-client.js"></script>');
  const morphTag = presence.indexOf('<script src="omnia-morph-client.js"></script>');
  const guidePathTag = presence.indexOf('<script src="guide-path-client.js"></script>');
  assert.notEqual(morphTag, -1);
  assert.ok(engineTag < morphTag, 'Click-morph behavior loads after the Omnia engine');
  assert.ok(morphTag < guidePathTag, 'Click-morph behavior loads before Guide state');
  assert.equal(presence.split('<script src="omnia-morph-client.js"></script>').length - 1, 1);
  assert.doesNotMatch(presence, /var\s+OMNIA_ENTITY_MORPH_SYMBOLS\s*=\s*\{/);
  assert.doesNotMatch(presence, /function\s+animateOmniaShardMorph\s*\(/);
  assert.doesNotMatch(presence, /function\s+morphGuideOmnia\s*\(/);
  assert.match(omniaMorphClient, /var\s+OMNIA_ENTITY_MORPH_SYMBOLS\s*=\s*\{/);
  assert.match(omniaMorphClient, /var\s+OMNIA_MORPH_TARGETS\s*=\s*\{/);
  assert.match(omniaMorphClient, /function\s+animateOmniaShardMorph\s*\(/);
  assert.match(omniaMorphClient, /function\s+renderOmniaMorphSymbol\s*\(/);
  assert.match(omniaMorphClient, /function\s+morphGuideOmnia\s*\(/);
  assert.match(omniaMorphClient, /function\s+morphPathBannerOmnia\s*\(/);
  assert.doesNotThrow(() => new Function(omniaMorphClient));
});

test('Guide path assessment and adaptive agenda live in a dedicated client boundary', () => {
  const morphTag = presence.indexOf('<script src="omnia-morph-client.js"></script>');
  const guidePathTag = presence.indexOf('<script src="guide-path-client.js"></script>');
  const questsTag = presence.indexOf('<script src="guide-quests-client.js"></script>');
  assert.notEqual(guidePathTag, -1);
  assert.ok(morphTag < guidePathTag, 'Guide path loads after Omnia morph behavior');
  assert.ok(guidePathTag < questsTag, 'Guide path loads before Path Quest tracking');
  assert.equal(presence.split('<script src="guide-path-client.js"></script>').length - 1, 1);
  assert.doesNotMatch(presence, /function\s+loadGuideState\s*\(/);
  assert.doesNotMatch(presence, /function\s+buildExperiencedGuideItems\s*\(/);
  assert.doesNotMatch(presence, /function\s+renderGuidePlan\s*\(/);
  assert.match(guidePathClient, /function\s+loadGuideState\s*\(/);
  assert.match(guidePathClient, /function\s+renderPracticeTree\s*\(/);
  assert.match(guidePathClient, /function\s+guideExerciseStats\s*\(/);
  assert.match(guidePathClient, /function\s+buildExperiencedGuideItems\s*\(/);
  assert.match(guidePathClient, /function\s+buildFoundationalGuideItems\s*\(/);
  assert.match(guidePathClient, /function\s+guideDetectAdaptedLevel\s*\(/);
  assert.match(guidePathClient, /function\s+renderGuidePlan\s*\(/);
  assert.match(guidePathClient, /function\s+beginGuidePlanItem\s*\(/);
  assert.doesNotThrow(() => new Function(guidePathClient));
});

test('Path Quests and Seven Gifts live in a dedicated client boundary', () => {
  const guidePathTag = presence.indexOf('<script src="guide-path-client.js"></script>');
  const questsTag = presence.indexOf('<script src="guide-quests-client.js"></script>');
  const guideShellTag = presence.indexOf('<script src="guide-shell-client.js"></script>');
  assert.notEqual(questsTag, -1);
  assert.ok(guidePathTag < questsTag, 'Guide quests load after adaptive path planning');
  assert.ok(questsTag < guideShellTag, 'Guide quests load before Guide shell initialization');
  assert.equal(presence.split('<script src="guide-quests-client.js"></script>').length - 1, 1);
  assert.doesNotMatch(presence, /function\s+pathQuestState\s*\(/);
  assert.doesNotMatch(presence, /function\s+renderGiftPathScreen\s*\(/);
  assert.doesNotMatch(presence, /function\s+renderPathQuests\s*\(/);
  assert.match(guideQuestsClient, /function\s+pathQuestState\s*\(/);
  assert.match(guideQuestsClient, /function\s+claimPathQuestReward\s*\(/);
  assert.match(guideQuestsClient, /function\s+playChestOpenAnimation\s*\(/);
  assert.match(guideQuestsClient, /var\s+GIFT_PATH_DEFS\s*=\s*\[/);
  assert.match(guideQuestsClient, /function\s+claimGift\s*\(/);
  assert.match(guideQuestsClient, /function\s+renderGiftPathScreen\s*\(/);
  assert.match(guideQuestsClient, /function\s+renderPathQuests\s*\(/);
  assert.match(guideQuestsClient, /window\.pqOpenAddMenu\s*=\s*function/);
  assert.doesNotThrow(() => new Function(guideQuestsClient));
});

test('Guide shell navigation loads after planning and quest behavior', () => {
  const questsTag = presence.indexOf('<script src="guide-quests-client.js"></script>');
  const shellTag = presence.indexOf('<script src="guide-shell-client.js"></script>');
  assert.notEqual(shellTag, -1);
  assert.ok(questsTag < shellTag, 'Guide shell initializes after planning and quest behavior');
  assert.equal(presence.split('<script src="guide-shell-client.js"></script>').length - 1, 1);
  assert.doesNotMatch(presence, /function\s+openGuide\s*\(|function\s+toggleGuideTwoADay\s*\(/);
  assert.match(guideShellClient, /function\s+openGuide\s*\(/);
  assert.match(guideShellClient, /function\s+toggleGuideTwoADay\s*\(/);
  assert.match(guideShellClient, /bindGuideTabSwipe/);
  assert.match(serviceWorker, /['"]guide-shell-client\.js['"]/);
  assert.doesNotThrow(() => new Function(guideShellClient));
});

test('profile and friend profile share one starfield while friendship overlays keep the green backdrop', () => {
  assert.match(presence, /#profileScreen,\s*#friendProfileScreen\s*\{[\s\S]*?radial-gradient\(2px 2px at 12% 6%/);
  assert.match(presence, /#friendsPanel,\s*#followListOverlay,\s*#societyOverlay\s*\{[^}]*rgba\(126,184,164,\.18\)/);
  assert.match(presence, /#profileScreen \.prof-topbar,\s*#friendProfileScreen \.prof-topbar \{ background:transparent; \}/);
  assert.match(presence, /#profFriendsMore \{[^}]*color:#9ed8c4;[^}]*opacity:1/);
});

test('changing daily cadence refreshes any visible path immediately', () => {
  assert.match(guideShellClient, /guideState\._exRounds = \{\}/);
  assert.match(guideShellClient, /delete guideState\.poreRounds/);
  assert.match(guidePathClient, /function guidePoreRounds\(\)[\s\S]*guideTwoADayEnabled\(\) \? 2 : 1/);
  assert.match(guideQuestsClient, /isPore \? guidePoreRounds\(\) === 1/);
  assert.match(guideShellClient, /var planOutput = document\.getElementById\('guidePlanOutput'\)/);
  assert.match(guideShellClient, /guidePathMode && planOutput && planOutput\.style\.display !== 'none'/);
  assert.match(guideShellClient, /renderGuidePlan\(guidePathMode, true\)/);
  assert.doesNotMatch(guideShellClient, /guideState\._pathLockedV2 && guidePathMode\) renderGuidePlan/);
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

test('Pavlok integration loads through its own late-stage client boundary', () => {
  const platformTag = presence.indexOf('<script src="platform-client.js"></script>');
  const pavlokTag = presence.indexOf('<script src="pavlok-client.js"></script>');
  const tutorialTag = presence.indexOf('<script src="tutorial-client.js"></script>');
  assert.notEqual(pavlokTag, -1);
  assert.ok(platformTag < pavlokTag, 'Pavlok requires platform notification services');
  assert.ok(pavlokTag < tutorialTag, 'Pavlok initializes before the tutorial can start exercises');
  assert.equal(presence.split('<script src="pavlok-client.js"></script>').length - 1, 1);
  assert.doesNotMatch(presence, /function\s+getPavlokPrefs\s*\(|function\s+sendPavlokStimulus\s*\(/);
  assert.doesNotMatch(presence, /function\s+renderPavlokSettings\s*\(|\bPAVLOK_DEFAULT_PREFS\s*=\s*\{/);
  assert.match(pavlokClient, /function\s+getPavlokPrefs\s*\(/);
  assert.match(pavlokClient, /function\s+sendPavlokStimulus\s*\(/);
  assert.match(pavlokClient, /function\s+renderPavlokSettings\s*\(/);
  assert.match(pavlokClient, /function\s+pavlokSetType\s*\(/);
  assert.match(serviceWorker, /['"]pavlok-client\.js['"]/);
  assert.doesNotThrow(() => new Function(pavlokClient));
});

test('high-risk credentials and paid AI routes require revocable authentication', () => {
  assert.match(server, /const TOKEN_EXPIRY = '7d'/);
  assert.match(server, /function\s+issueAuthToken\s*\([\s\S]*?authVersion:\s*authVersionFor\(user\)/);
  assert.match(server, /async function verifyToken\s*\([\s\S]*?usersCollection\.findOne\([\s\S]*?authVersionFor\(user\)/);
  assert.match(server, /app\.post\('\/api\/sync\/auth\/logout', verifyToken, async[\s\S]*?authVersionFor\(req\.authUser\) \+ 1/);
  assert.match(server, /app\.post\('\/api\/ai\/progress-comment', verifyToken, aiRateLimit, aiGlobalBudget/);
  assert.match(server, /app\.post\('\/api\/sync\/omnia\/report', verifyToken, aiRateLimit, aiGlobalBudget/);

  const reportStart = server.indexOf("app.post('/api/sync/omnia/report'");
  const reportEnd = server.indexOf('// ── Pavlok integration', reportStart);
  const reportRoute = server.slice(reportStart, reportEnd);
  assert.doesNotMatch(reportRoute, /deviceId/);
  assert.match(reportRoute, /const userId = req\.user\.userId/);

  assert.match(platformClient, /function\s+requestPresenceAI\s*\([\s\S]*?['"]Authorization['"]:\s*'Bearer ' \+ authToken/);
  assert.match(platformClient, /function\s+authLogout\s*\([\s\S]*?\/auth\/logout/);
  assert.match(platformClient, /payload\.authVersion != null/);
  assert.match(reportsClient, /function\s+fetchOmniaReport\s*\([\s\S]*?if \(!token\)/);
  assert.match(reportsClient, /['"]Authorization['"]:\s*'Bearer ' \+ token/);

  assert.doesNotMatch(pavlokClient, /localStorage\.setItem\(['"]presence_pavlok_pass/);
  assert.doesNotMatch(pavlokClient, /localStorage\.getItem\(['"]presence_pavlok_pass/);
  assert.doesNotMatch(pavlokClient, /PAVLOK_PASS_KEY/);
  assert.match(pavlokClient, /localStorage\.removeItem\('presence_pavlok_pass'\)/);
});

test('Practice reminders load through their own late-stage client boundary', () => {
  const platformTag = presence.indexOf('<script src="platform-client.js"></script>');
  const remindersTag = presence.indexOf('<script src="reminders-client.js"></script>');
  const pavlokTag = presence.indexOf('<script src="pavlok-client.js"></script>');
  assert.notEqual(remindersTag, -1);
  assert.ok(platformTag < remindersTag, 'reminders require platform push services');
  assert.ok(remindersTag < pavlokTag, 'reminders initialize before later integration clients');
  assert.equal(presence.split('<script src="reminders-client.js"></script>').length - 1, 1);
  assert.doesNotMatch(presence, /function\s+scheduleReminderNotifications\s*\(|function\s+getPracticeReminderPrefs\s*\(/);
  assert.doesNotMatch(presence, /function\s+renderPracticeReminderSettings\s*\(|\bPRACTICE_REMINDER_LEVELS\s*=\s*\{/);
  assert.match(remindersClient, /function\s+scheduleReminderNotifications\s*\(/);
  assert.match(remindersClient, /function\s+getPracticeReminderPrefs\s*\(/);
  assert.match(remindersClient, /function\s+syncPracticeReminderToServer\s*\(/);
  assert.match(remindersClient, /function\s+renderPracticeReminderSettings\s*\(/);
  assert.match(serviceWorker, /['"]reminders-client\.js['"]/);
  assert.doesNotThrow(() => new Function(remindersClient));
});

test('Omnia companion interactions load through their own client boundary', () => {
  const appearanceTag = presence.indexOf('<script src="omnia-appearance-client.js"></script>');
  const companionTag = presence.indexOf('<script src="omnia-companion-client.js"></script>');
  const remindersTag = presence.indexOf('<script src="reminders-client.js"></script>');
  assert.notEqual(companionTag, -1);
  assert.ok(appearanceTag < companionTag, 'companion behavior extends Omnia appearance rendering');
  assert.ok(companionTag < remindersTag, 'companion behavior initializes before later integration clients');
  assert.equal(presence.split('<script src="omnia-companion-client.js"></script>').length - 1, 1);
  assert.doesNotMatch(presence, /function\s+setupCorgiWander\s*\(|function\s+setupCompanionIdle\s*\(/);
  assert.doesNotMatch(presence, /\bCOMPANION_TAP_CLASS\s*=\s*\{|\bCOMPANION_IDLE_CLASS\s*=\s*\{/);
  assert.match(omniaCompanionClient, /function\s+setupCorgiWander\s*\(/);
  assert.match(omniaCompanionClient, /function\s+setupCompanionIdle\s*\(/);
  assert.match(omniaCompanionClient, /gnome:['"]gnome-mine['"]/);
  assert.match(omniaCompanionClient, /gnome:['"]gnome-sway['"]/);
  assert.match(omniaCompanionClient, /gnomeLampFlare/);
  assert.match(omniaCompanionClient, /document\.getElementById\(id\)/);
  assert.match(serviceWorker, /['"]omnia-companion-client\.js['"]/);
  assert.doesNotThrow(() => new Function(omniaCompanionClient));
});

test('Streak screen and ended-state UI load through their own client boundary', () => {
  const profileTag = presence.indexOf('<script src="profile-client.js"></script>');
  const streakTag = presence.indexOf('<script src="streak-client.js"></script>');
  const companionTag = presence.indexOf('<script src="omnia-companion-client.js"></script>');
  assert.notEqual(streakTag, -1);
  assert.ok(profileTag < streakTag, 'Streak Society requires Profile friend helpers');
  assert.ok(streakTag < companionTag, 'streak UI initializes before later end-of-body clients');
  assert.equal(presence.split('<script src="streak-client.js"></script>').length - 1, 1);
  assert.doesNotMatch(presence, /function\s+buildStreakCalendar\s*\(|function\s+showStreakScreen\s*\(/);
  assert.doesNotMatch(presence, /function\s+openStreakSociety\s*\(|function\s+showStreakEndedPrompt\s*\(/);
  assert.doesNotMatch(presence, /\bSTREAK_COMMITS\s*=\s*\[/);
  assert.match(streakClient, /\bSTREAK_COMMITS\s*=\s*\[/);
  assert.match(streakClient, /function\s+buildStreakCalendar\s*\(/);
  assert.match(streakClient, /function\s+showStreakScreen\s*\(/);
  assert.match(streakClient, /function\s+openStreakSociety\s*\(/);
  assert.match(streakClient, /function\s+showStreakEndedPrompt\s*\(/);
  assert.match(serviceWorker, /['"]streak-client\.js['"]/);
  assert.doesNotThrow(() => new Function(streakClient));
});

test('Shared session completion UI loads through its own client boundary', () => {
  const controlsTag = presence.indexOf('<script src="concentration-controls-client.js"></script>');
  const completionTag = presence.indexOf('<script src="session-complete-client.js"></script>');
  const streakTag = presence.indexOf('<script src="streak-client.js"></script>');
  assert.notEqual(completionTag, -1);
  assert.ok(controlsTag < completionTag, 'completion UI loads after concentration controls');
  assert.ok(completionTag < streakTag, 'completion UI initializes before streak presentation');
  assert.equal(presence.split('<script src="session-complete-client.js"></script>').length - 1, 1);
  assert.doesNotMatch(presence, /function\s+playSessionCompleteSound\s*\(|function\s+buildOmniaShowerHtml\s*\(/);
  assert.doesNotMatch(presence, /function\s+showSessionComplete\s*\(/);
  assert.match(sessionCompleteClient, /function\s+playSessionCompleteSound\s*\(/);
  assert.match(sessionCompleteClient, /function\s+buildOmniaShowerHtml\s*\(/);
  assert.match(sessionCompleteClient, /function\s+showSessionComplete\s*\(/);
  assert.match(sessionCompleteClient, /window\._pendingStreakBonus/);
  assert.match(serviceWorker, /['"]session-complete-client\.js['"]/);
  assert.doesNotThrow(() => new Function(sessionCompleteClient));
});

test('Streak ignition celebration loads through its own client boundary', () => {
  const celebrationTag = presence.indexOf('<script src="streak-celebration-client.js"></script>');
  const completionTag = presence.indexOf('<script src="session-complete-client.js"></script>');
  assert.notEqual(celebrationTag, -1);
  assert.ok(celebrationTag < completionTag, 'streak celebration initializes before completion presentation');
  assert.equal(presence.split('<script src="streak-celebration-client.js"></script>').length - 1, 1);
  assert.doesNotMatch(presence, /function\s+showStreakCelebration\s*\(|function\s+playStreakBurstSound\s*\(/);
  assert.match(streakCelebrationClient, /function\s+showStreakCelebration\s*\(/);
  assert.match(streakCelebrationClient, /function\s+playStreakBurstSound\s*\(/);
  assert.match(streakCelebrationClient, /appSoundEnabled/);
  assert.match(serviceWorker, /['"]streak-celebration-client\.js['"]/);
  assert.doesNotThrow(() => new Function(streakCelebrationClient));
});

test('Tutorial post-session journey loads through its own client boundary', () => {
  const remindersTag = presence.indexOf('<script src="reminders-client.js"></script>');
  const postSessionTag = presence.indexOf('<script src="tutorial-post-session-client.js"></script>');
  const tutorialTag = presence.indexOf('<script src="tutorial-client.js"></script>');
  assert.notEqual(postSessionTag, -1);
  assert.ok(remindersTag < postSessionTag, 'post-session tutorial requires reminder helpers');
  assert.ok(postSessionTag < tutorialTag, 'post-session journey initializes before the main tutorial runtime');
  assert.equal(presence.split('<script src="tutorial-post-session-client.js"></script>').length - 1, 1);
  assert.doesNotMatch(presence, /function\s+showTutorialPostSession\s*\(|function\s+tutFadeStage\s*\(/);
  assert.doesNotMatch(presence, /function\s+showTutorialStreakCelebration\s*\(|function\s+showTutorialAccountPrompt\s*\(/);
  assert.match(tutorialPostSessionClient, /function\s+showTutorialPostSession\s*\(/);
  assert.match(tutorialPostSessionClient, /function\s+tutFadeStage\s*\(/);
  assert.match(tutorialPostSessionClient, /function\s+showTutorialStreakCelebration\s*\(/);
  assert.match(tutorialPostSessionClient, /function\s+showTutorialAccountPrompt\s*\(/);
  assert.match(tutorialPostSessionClient, /function\s+showTutorialGuideIntro\s*\(/);
  assert.match(serviceWorker, /['"]tutorial-post-session-client\.js['"]/);
  assert.doesNotThrow(() => new Function(tutorialPostSessionClient));
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
