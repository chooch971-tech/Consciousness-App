'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const presence = fs.readFileSync(path.join(root, 'presence.html'), 'utf8');
const sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');

function block(startMarker, endMarker) {
  const start = presence.indexOf(startMarker);
  assert.ok(start > -1, 'missing ' + startMarker);
  const end = presence.indexOf(endMarker, start);
  assert.ok(end > start, 'missing ' + endMarker);
  return presence.slice(start, end);
}

test('an offline device enters the app instead of running the cold-start ladder', () => {
  // The retry ladder exists for a free-tier host cold-starting, which is worth
  // waiting out. A device with no network is not: the request cannot succeed
  // however many times it repeats, and eight attempts over ~44 seconds held the
  // splash for its full 28-second cap in front of an app that works entirely
  // offline. Measured: 30.9s before, 2.6s after.
  const startup = block('function _startupPull(attempt)', 'window.addEventListener(\'online\'');
  assert.match(startup, /navigator\.onLine === false/,
    'the definite-offline case short-circuits');
  const guard = startup.indexOf('navigator.onLine === false');
  const ladder = startup.indexOf('if (attempt < 8)');
  assert.ok(guard > -1 && ladder > guard, 'and it is checked before the ladder');
  // Entering must leave nothing pending, or the saveState guards keep blocking.
  const guardBody = startup.slice(guard, ladder);
  assert.match(guardBody, /window\._syncPullPending = false/);
  assert.match(guardBody, /__dismissSplash/);
});

test('the sign-in restore pull gets the same treatment', () => {
  const restore = block('function pull() {', 'if (attempt < 6)');
  assert.match(restore, /navigator\.onLine === false.*finish\(\); return;/s,
    'no network means enter now, not six retries later');
});

test('only a false reading is trusted', () => {
  // navigator.onLine can be wrong when it says true — a captive portal reports
  // online — so a truthy value must still go through the retry ladder.
  const startup = block('function _startupPull(attempt)', 'window.addEventListener(\'online\'');
  assert.doesNotMatch(startup, /if \(!navigator\.onLine\)/,
    'a loose falsy check would also fire where onLine is undefined');
  assert.match(startup, /navigator\.onLine === false/, 'strict equality only');
});

test('the pull happens once the connection comes back', () => {
  // Entering offline is right, but it leaves cloud progress unread until the
  // next launch otherwise.
  const listener = block("window.addEventListener('online'", '});');
  assert.match(listener, /syncEnabled && authToken/, 'only for a signed-in user');
  assert.match(listener, /window\._syncPullPending/, 'and not on top of a pull already running');
  assert.match(listener, /syncPullData\(\)/);
});

test('the splash can never trap a user, whatever the network does', () => {
  const splash = block('var SPLASH_MIN_MS', '})();');
  assert.match(splash, /waited >= 28000/, 'a hard cap backs every other guard');
  assert.match(splash, /if \(!window\._syncPullPending\) \{ dismiss\(\); return; \}/,
    'and a signed-out user never waits at all');
});

test('the shell falls back to cache when the network is gone', () => {
  // presence.html is network-first so a connected device always runs fresh
  // code; the fallback is what makes an offline launch possible at all.
  assert.match(sw, /\.catch\(\(\) => cached\); \/\/ offline: fall back to cached/);
  assert.match(sw, /return isShell \? networkFetch : \(cached \|\| networkFetch\);/);
  // Every client script must be precached, or an offline launch loads a shell
  // whose modules are missing.
  ['guide-path-client.js', 'platform-client.js', 'reports-client.js',
   'omnia-engine-client.js', 'calendar.js'].forEach(file => {
    assert.ok(sw.includes("'" + file + "'"), file + ' must be precached');
  });
});
