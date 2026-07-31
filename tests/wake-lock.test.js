'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const asanaClient = fs.readFileSync(path.join(root, 'asana-client.js'), 'utf8');
const soulMirrorClient = fs.readFileSync(path.join(root, 'soul-mirror-client.js'), 'utf8');

// Pull makeWakeLockHolder out of asana-client.js and run it against a fake
// Screen Wake Lock API, so these assert real behaviour rather than shape.
function loadHolderFactory(navigatorStub) {
  const start = asanaClient.indexOf('function makeWakeLockHolder()');
  assert.ok(start > -1, 'makeWakeLockHolder must exist in asana-client.js');
  const end = asanaClient.indexOf('\nvar _exerciseWakeLockHolder');
  assert.ok(end > start, 'factory must be followed by the shared holder');
  const src = asanaClient.slice(start, end);
  // eslint-disable-next-line no-new-func
  return new Function('navigator', src + '\nreturn makeWakeLockHolder;')(navigatorStub);
}

function fakeWakeLockApi() {
  const state = { granted: 0, released: 0, live: [] };
  const navigatorStub = {
    wakeLock: {
      request() {
        return Promise.resolve().then(() => {
          state.granted++;
          const listeners = [];
          const sentinel = {
            released: false,
            addEventListener(type, fn) { if (type === 'release') listeners.push(fn); },
            release() {
              if (!sentinel.released) {
                sentinel.released = true;
                state.released++;
                state.live = state.live.filter((s) => s !== sentinel);
                listeners.forEach((fn) => fn());
              }
              return Promise.resolve();
            },
            // What the browser itself does when the page is hidden.
            _browserDrops() {
              if (!sentinel.released) {
                sentinel.released = true;
                state.live = state.live.filter((s) => s !== sentinel);
                listeners.forEach((fn) => fn());
              }
            }
          };
          state.live.push(sentinel);
          return sentinel;
        });
      }
    }
  };
  return { state, navigatorStub };
}

const flush = () => new Promise((resolve) => setImmediate(resolve));

test('repeated acquire does not strand a second wake lock', async () => {
  const { state, navigatorStub } = fakeWakeLockApi();
  const holder = loadHolderFactory(navigatorStub)();

  // Session start and resume both ask — the old code took two OS locks here
  // and remembered only the second, leaking the first forever.
  holder.acquire();
  holder.acquire();
  holder.acquire();
  await flush();

  assert.equal(state.granted, 1, 'only one lock should ever be requested');
  assert.equal(state.live.length, 1);

  holder.release();
  await flush();
  assert.equal(state.live.length, 0, 'releasing must leave nothing held');
  assert.equal(state.released, 1);
});

test('release during an in-flight request does not leave a lock held', async () => {
  const { state, navigatorStub } = fakeWakeLockApi();
  const holder = loadHolderFactory(navigatorStub)();

  holder.acquire();
  holder.release(); // user backs out before the request resolves
  await flush();
  await flush();

  assert.equal(state.live.length, 0, 'a lock that arrives unwanted must be dropped');
});

test('a browser-dropped lock can be re-acquired', async () => {
  const { state, navigatorStub } = fakeWakeLockApi();
  const holder = loadHolderFactory(navigatorStub)();

  holder.acquire();
  await flush();
  assert.equal(state.live.length, 1);

  // The browser releases wake locks by itself when the page hides.
  state.live[0]._browserDrops();
  assert.equal(state.live.length, 0);

  // Coming back must genuinely re-request, not assume one is still held.
  holder.acquire();
  await flush();
  assert.equal(state.granted, 2, 'must re-request after the browser dropped it');
  assert.equal(state.live.length, 1);
});

test('release is idempotent and never double-releases', async () => {
  const { state, navigatorStub } = fakeWakeLockApi();
  const holder = loadHolderFactory(navigatorStub)();

  holder.acquire();
  await flush();
  holder.release();
  holder.release();
  await flush();

  assert.equal(state.released, 1);
  assert.equal(state.live.length, 0);
});

test('acquire is inert where the API is unsupported', async () => {
  const holder = loadHolderFactory({})();
  assert.doesNotThrow(() => { holder.acquire(); holder.release(); });
});

test('both wake-lock users go through the shared holder', () => {
  // The exercise lock and the Autosuggestion lock are separate holders but
  // must share the one implementation — duplicating this concurrency logic
  // is how the two copies drifted apart and both leaked.
  assert.match(asanaClient, /function\s+requestExerciseWakeLock\s*\(/);
  assert.match(asanaClient, /function\s+releaseExerciseWakeLock\s*\(/);
  assert.match(asanaClient, /_exerciseWakeLockHolder\s*=\s*makeWakeLockHolder\(\)/);
  assert.match(soulMirrorClient, /makeWakeLockHolder\(\)/);
  // No caller may stash a raw sentinel on the side any more.
  assert.doesNotMatch(soulMirrorClient, /navigator\.wakeLock\.request/);
  assert.equal(asanaClient.split('navigator.wakeLock.request').length - 1, 1);
});
