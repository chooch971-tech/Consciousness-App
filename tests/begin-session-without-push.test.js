'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const presence = fs.readFileSync(path.join(root, 'presence.html'), 'utf8');
const platform = fs.readFileSync(path.join(root, 'platform-client.js'), 'utf8');

test('nothing reads the Notification API bare', () => {
  // A browser without it (a Mudita Kompakt, for one) threw a ReferenceError at
  // Begin Session, and the session never started.
  [['presence.html', presence], ['platform-client.js', platform]].forEach(([name, src]) => {
    const code = src.split('\n').filter(l => !/^\s*\/\//.test(l)).join('\n');
    assert.doesNotMatch(code, /(^|[^.\w])Notification\.(permission|requestPermission)/,
      name + ' must go through presenceNotificationPermission / presenceRequestNotificationPermission');
  });
  assert.match(platform, /return \(typeof Notification !== 'undefined'\) \? Notification : null;/);
});

test('notification setup can never hold a session back', () => {
  // A permission prompt that never answered, or a push service that never
  // replied, used to leave Begin Session doing nothing at all.
  ['startBtn', 'customModal'].forEach(() => {});
  const begin = presence.slice(presence.indexOf("getElementById('startBtn').addEventListener('click'"));
  const handler = begin.slice(0, begin.indexOf('});'));
  assert.match(handler, /await preparePushForSession\(\)/);
  assert.doesNotMatch(handler, /await registerWebPush\(\)/);
  assert.doesNotMatch(presence, /await registerWebPush\(\);\s*\}\s*catch\(e\) \{ console\.log\('Push skipped/,
    'the custom-session start must not await it either');
  const prep = platform.slice(platform.indexOf('function preparePushForSession'));
  assert.match(prep, /Promise\.race\(\[setup,/, 'the wait is bounded');
  assert.match(platform, /var PUSH_SETUP_WAIT_MS = \d+;/);
});

test('push that finishes after the session started still reaches the server', () => {
  const prep = platform.slice(platform.indexOf('function preparePushForSession'));
  assert.match(prep, /startedWithout && typeof sessionStartTime !== 'undefined' && sessionStartTime/);
  assert.match(prep, /notifyServerSessionStart\(\);/);
});

test('both permission styles are understood', () => {
  // Older engines answer through a callback and return nothing.
  const fn = platform.slice(platform.indexOf('function presenceRequestNotificationPermission'));
  assert.match(fn, /N\.requestPermission\(function\(p\) \{ resolve\(p\); \}\)/);
  assert.match(fn, /typeof ret\.then === 'function'/);
});
