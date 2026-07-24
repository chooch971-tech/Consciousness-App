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
  assert.match(platform, /indexedDB\.deleteDatabase\('presence_audio'\)/);
  assert.match(platform, /localStorage\.clear\(\)/);
  assert.match(platform, /sessionStorage\.clear\(\)/);
  assert.match(platform, /resetLocalProgressForSignedOut\(\)/);
});
