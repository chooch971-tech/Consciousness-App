'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const server = fs.readFileSync(path.join(root, 'server.js'), 'utf8');
const presence = fs.readFileSync(path.join(root, 'presence.html'), 'utf8');
const platform = fs.readFileSync(path.join(root, 'platform-client.js'), 'utf8');
const settings = fs.readFileSync(path.join(root, 'settings-client.js'), 'utf8');

test('account deletion is authenticated, confirmed, reauthenticated, and atomic', () => {
  assert.match(server, /app\.delete\('\/api\/sync\/auth\/account', verifyToken, mutationRateLimit,/);
  assert.match(server, /req\.body\.confirmation !== 'DELETE'/);
  assert.match(server, /bcrypt\.compare\(req\.body\.password, user\.passwordHash\)/);
  assert.match(server, /ACCOUNT_DELETE_REAUTH_SECONDS\s*=\s*15 \* 60/);
  assert.match(server, /req\.user\.iat[\s\S]*?reauth_required/);
  assert.match(server, /session\.withTransaction/);
  const deletionBody = server.slice(
    server.indexOf('async function deletePresenceAccount'),
    server.indexOf("app.delete('/api/sync/auth/account'")
  );
  assert.doesNotMatch(deletionBody, /await\s+Promise\.all/);
  assert.match(server, /No partial deletion was committed/);
});

test('account deletion removes cloud, social, report, message, and notification data', () => {
  const deletionStart = server.indexOf('async function deletePresenceAccount');
  const routeStart = server.indexOf("app.delete('/api/sync/auth/account'", deletionStart);
  const body = server.slice(deletionStart, routeStart);
  [
    'syncDataCollection.deleteMany',
    'beaconsCollection.deleteMany',
    'friendsCollection.deleteMany',
    'followsCollection.deleteMany',
    'blocksCollection.deleteMany',
    'notificationsCollection.deleteMany',
    'reportsCollection.deleteMany',
    'bugReportsCollection.deleteMany',
    'likesCollection.deleteMany',
    'commentLikesCollection.deleteMany',
    'commentsCollection.deleteMany',
    'postsCollection.deleteMany',
    'messagesCollection.deleteMany',
    'conversationsCollection.deleteMany',
    'userPushSubsCollection.deleteMany',
    "collection('omnia_reports').deleteMany"
  ].forEach(operation => assert.ok(body.includes(operation), operation));
  assert.match(body, /subsCollection\.deleteMany/);
  assert.match(body, /prayerCollection\.deleteMany/);
  assert.match(body, /practiceCollection\.deleteMany/);
  assert.match(body, /likeCount:[\s\S]*?commentCount:/);
  assert.match(body, /commentLikeCounts[\s\S]*?likeCount:commentLikeCounts/);
  assert.ok(
    body.indexOf('usersCollection.deleteOne') > body.indexOf("collection('omnia_reports').deleteMany"),
    'the user record must be deleted last'
  );
});

test('Account settings require typed confirmation and clear every local data store after success', () => {
  assert.match(presence, /id="accountDeleteGroup"/);
  assert.match(presence, /id="accountDeleteConfirm"/);
  assert.match(presence, /id="accountDeletePassword"/);
  assert.match(settings, /confirmInput\.value\.trim\(\) === 'DELETE'/);
  assert.match(settings, /method: 'DELETE'/);
  assert.match(settings, /await clearDeletedAccountFromDevice\(\)/);
  assert.match(platform, /subscription\.unsubscribe\(\)/);
  assert.match(platform, /localStorage\.clear\(\)/);
  assert.match(platform, /sessionStorage\.clear\(\)/);
  assert.match(platform, /resetLocalProgressForSignedOut\(\)/);
});

test('every IndexedDB this app opens is dropped, not only the audio store', () => {
  // The service worker opens presence_session_flags to decide whether a
  // practice reminder should be suppressed mid-exercise. A flow that promises
  // to remove everything must not leave a record of the deleted account's
  // practice sitting on the device.
  const wipe = platform.slice(
    platform.indexOf('async function clearDeletedAccountFromDevice'),
    platform.indexOf('async function authLogout')
  );
  assert.ok(wipe, 'the device wipe must still be here');
  const sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
  const swDbs = [...sw.matchAll(/indexedDB\.open\(([A-Z_]+)/g)].length;
  assert.ok(swDbs > 0, 'the service worker does open a database');
  assert.match(sw, /PRESENCE_SESSION_FLAG_DB = 'presence_session_flags'/);
  ['presence_audio', 'presence_session_flags'].forEach(name => {
    assert.ok(wipe.includes("'" + name + "'"), name + ' must be deleted on account deletion');
  });
  assert.match(wipe, /indexedDB\.deleteDatabase\(name\)/);
});

test('the way to account deletion is reachable, and only when there is an account', () => {
  // Deleting an account has to be findable from inside the app. The route is
  // drawer > Settings > the profile banner > Delete Account; each hop below is
  // the link that makes the next one reachable.
  assert.match(presence, /id="drawerSettings"/, 'the drawer offers Settings');
  assert.match(presence, /id="settingsProfileBanner"/, 'Settings shows the account banner');
  assert.match(settings, /#settingsProfileBanner'\)\) \{ openAccountSettings\(\); return; \}/,
    'and tapping it opens Account settings');
  assert.match(presence, /id="accountDeleteReveal"/, 'which carries the Delete Account button');

  // The banner must name the signed-in account rather than reading "Sign in",
  // or the one route in looks like a route to signing in.
  assert.match(settings, /function renderSettingsProfileBanner/);
  assert.match(settings, /nm\.textContent = authUsername \? '@' \+ authUsername : display/);
  // It is only correct because the drawer handler renders it on the way in.
  const drawerHandler = presence.slice(
    presence.indexOf("document.getElementById('drawerSettings').addEventListener('click'"),
    presence.indexOf("document.getElementById('drawerJournal')"));
  assert.ok(drawerHandler, 'the drawer Settings handler must still be here');
  assert.match(drawerHandler, /renderSettingsExerciseList\(\)/,
    'opening Settings from the drawer renders the banner');
  assert.match(settings, /function renderSettingsExerciseList\(\) \{\s*\n\s*renderSettingsProfileBanner\(\);/);

  // Signed out there is no account to delete, so the group stays hidden.
  const platformSignedOut = platform.slice(
    platform.indexOf('function _refreshSettingsSyncCard()'),
    platform.indexOf('function _refreshSettingsSyncCardSignedIn')
  );
  assert.match(platformSignedOut, /if \(dg\) dg\.style\.display = 'none';/);
  const platformSignedIn = platform.slice(
    platform.indexOf('function _refreshSettingsSyncCardSignedIn'),
    platform.indexOf('async function clearDeletedAccountFromDevice')
  );
  assert.match(platformSignedIn, /if \(dg\) dg\.style\.display = '';/);
});
