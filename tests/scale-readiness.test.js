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

test('idle reminder scans do not rewrite every enabled schedule each minute', () => {
  const prayer = server.slice(server.indexOf('async function processPrayerSchedules'), server.indexOf('async function processPracticeSchedules'));
  const practice = server.slice(server.indexOf('async function processPracticeSchedules'), server.indexOf('// Push subscription management'));
  assert.match(prayer, /if \(dirty\) await savePrayerSchedule\(schedule\)/);
  assert.match(practice, /if \(dirty\) await savePracticeSchedule\(schedule\)/);
});
