'use strict';

const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

const root = path.join(__dirname, '..');
const server = fs.readFileSync(path.join(root, 'server.js'), 'utf8');
const platform = fs.readFileSync(path.join(root, 'platform-client.js'), 'utf8');
const presence = fs.readFileSync(path.join(root, 'presence.html'), 'utf8');

test('cloud snapshots remain bounded to one row per user installation', () => {
  assert.match(server, /sync\.user-device[\s\S]*?userId: 1, deviceId: 1[\s\S]*?partialFilterExpression/);
  assert.match(server, /syncDataCollection\.updateOne\([\s\S]*?deviceId: cleanDeviceId[\s\S]*?upsert: true/);
  assert.match(platform, /deviceId: getSyncDeviceId\(\)/);
  assert.match(presence, /deviceId: getSyncDeviceId\(\)/);
});

test('social launch queries have indexes for both follow directions and profile activity', () => {
  assert.match(server, /follows\.follower-status-created/);
  assert.match(server, /follows\.followee-status-created/);
  assert.match(server, /comments\.user-created/);
  assert.match(server, /blocks\.blocked-user/);
  assert.match(server, /conversations\.participants[\s\S]*?participants: 1, lastMsgAt: -1/);
});

test('friends list resolves users, snapshots, and mutual follows in batches', () => {
  const friendsList = server.slice(
    server.indexOf("app.get('/api/sync/friends/list'"),
    server.indexOf("app.get('/api/sync/friends/search'")
  );
  assert.match(friendsList, /const \[networkDocs, friendUsers, latestSyncRows, activeFollowEdges\] = await Promise\.all/);
  assert.match(friendsList, /\$group: \{ _id: '\$userId', snapshot: \{ \$first: '\$\$ROOT' \} \}/);
  const renderLoop = friendsList.slice(friendsList.indexOf('for (const doc of docs)'));
  assert.doesNotMatch(renderLoop, /await (usersCollection|syncDataCollection|isMutualFollow)/);
});

test('legacy friend lists and requests are bounded and avoid user lookup loops', () => {
  const friendList = server.slice(
    server.indexOf("app.get('/api/sync/friends/list'"),
    server.indexOf("app.get('/api/sync/friends/search'")
  );
  const requests = server.slice(
    server.indexOf("app.get('/api/sync/friends/requests'"),
    server.indexOf("app.put('/api/sync/profile-pic'")
  );
  assert.match(friendList, /\.limit\(500\)\.toArray\(\)/);
  assert.match(requests, /\.limit\(100\)\.toArray\(\)/);
  assert.match(requests, /_id: \{ \$in: ids\.map/);
  assert.doesNotMatch(requests, /for \(const doc of docs\)[\s\S]*?usersCollection\.findOne/);
});

test('daily write guards and lookup paths have supporting indexes', () => {
  assert.match(server, /messages\.sender-created/);
  assert.match(server, /reports\.reporter-created/);
  assert.match(server, /notifications\.lookup/);
  assert.match(server, /users\.username/);
  assert.match(server, /friends\.user-status/);
  assert.match(server, /friends\.friend-status/);
  assert.match(server, /beacons\.user-device/);
  assert.match(server, /beacons\.user-expiry-updated/);
  assert.match(server, /subscriptions\.endpoint/);
});

test('username prefix search stays indexable against normalized usernames', () => {
  const search = server.slice(
    server.indexOf("app.get('/api/sync/friends/search'"),
    server.indexOf("app.post('/api/sync/friends/request'")
  );
  assert.match(search, /trim\(\)\.toLowerCase\(\)/);
  assert.doesNotMatch(search, /\$options: 'i'/);
});

test('idle reminder scans do not rewrite every enabled schedule each minute', () => {
  const prayer = server.slice(server.indexOf('async function processPrayerSchedules'), server.indexOf('async function processPracticeSchedules'));
  const practice = server.slice(server.indexOf('async function processPracticeSchedules'), server.indexOf('// Push subscription management'));
  assert.match(prayer, /if \(dirty\) await savePrayerSchedule\(schedule\)/);
  assert.match(practice, /if \(dirty\) await savePracticeSchedule\(schedule\)/);
});
