'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const platform = fs.readFileSync(path.join(root, 'platform-client.js'), 'utf8');
const awareness = fs.readFileSync(path.join(root, 'awareness-client.js'), 'utf8');

test('a resumed session hands the Pavlok back to the phone when there is no push', () => {
  // Resume assumes the server owns the Pavlok, to avoid a double zap, and
  // relies on notifyServerPavlokUpdate to say otherwise. It returned early
  // without clearing the flag when there was no subscription, so on a phone
  // without push every bell after a reload rang with no stimulus at all.
  assert.match(awareness, /pavlokServerManaged = !!\(getPavlokToken\(\) && pvkR\.awareness\.enabled\);/,
    'the optimistic assumption is still made on resume');
  assert.match(awareness, /if \(pavlokServerManaged\) \{ try \{ notifyServerPavlokUpdate\(\)/,
    'and still confirmed in the background');
  const fn = platform.slice(platform.indexOf('async function notifyServerPavlokUpdate'));
  assert.match(fn.slice(0, 900), /if \(!sub\) \{ pavlokServerManaged = false; return; \}/);
  assert.match(fn.slice(0, 1600), /pavlokServerManaged = !!\(data && data\.pavlokManaged\);/,
    'with push, the server still decides — no double zap');
});

test('checking for a subscription can never hang', () => {
  // navigator.serviceWorker.ready never settles where no worker activates.
  const fn = platform.slice(platform.indexOf('async function getSubscription'));
  const body = fn.slice(0, fn.indexOf('\n}'));
  assert.match(body, /navigator\.serviceWorker\.getRegistration\(\)/);
  assert.doesNotMatch(body, /await navigator\.serviceWorker\.ready/);
  assert.match(body, /if \(!reg \|\| !reg\.pushManager\) return null;/);
});
