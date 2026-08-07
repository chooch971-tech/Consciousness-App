'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const guide = fs.readFileSync(path.join(root, 'guide-path-client.js'), 'utf8');
const awareness = fs.readFileSync(path.join(root, 'awareness-client.js'), 'utf8');

test('a resize re-measures the Guide panel instead of rebuilding it', () => {
  // On a phone the URL bar collapses and expands throughout a scroll, firing
  // resize the whole way down. Routing that through the full refresh rebuilt
  // the path list on every event — measured at 34 rebuilds for one flick to the
  // bottom — each one also adding and removing a compositing transform on the
  // very element under the finger.
  assert.match(awareness, /window\.addEventListener\('resize', relayoutGuidePathIfReady\)/);
  assert.match(awareness, /window\.addEventListener\('orientationchange', relayoutGuidePathIfReady\)/);
  assert.match(guide, /function scheduleGuidePathRelayout\(\)/);
  const fn = guide.slice(guide.indexOf('function scheduleGuidePathRelayout()'),
                         guide.indexOf('\n}', guide.indexOf('function scheduleGuidePathRelayout()')));
  assert.doesNotMatch(fn, /renderPathQuests/, 'a resize must not rebuild the list');
  assert.match(fn, /refreshGuidePanelLayout\(false\)/, 'it re-measures');
  assert.doesNotMatch(fn, /refreshGuidePanelLayout\(true\)/,
    'and never resets the scroll position out from under a scroll');
});

test('a burst of resizes collapses into one measure', () => {
  const fn = guide.slice(guide.indexOf('function scheduleGuidePathRelayout()'),
                         guide.indexOf('\n}', guide.indexOf('function scheduleGuidePathRelayout()')));
  assert.match(fn, /clearTimeout\(guidePathRelayoutTimer\)/,
    'each new resize must cancel the pending measure');
  assert.match(fn, /guidePathRelayoutTimers\.forEach/,
    'and cancel the trailing pass too, or they stack up across a scroll');
});

test('the cases that can really change the path still rebuild it', () => {
  // Arriving on the tab, and returning from the background where a day may have
  // rolled over, both need the content itself refreshed — not just re-measured.
  assert.match(awareness, /window\.addEventListener\('pageshow', refreshGuidePathLayoutIfReady\)/);
  const shell = fs.readFileSync(path.join(root, 'guide-shell-client.js'), 'utf8');
  assert.match(shell, /scheduleGuidePathLayoutRefresh\(true\)/, 'navigation still rebuilds');
  const presence = fs.readFileSync(path.join(root, 'presence.html'), 'utf8');
  assert.match(presence, /visibilityState === 'visible'[\s\S]{0,200}scheduleGuidePathLayoutRefresh\(false\)/,
    'returning from the background still rebuilds');
  assert.match(guide, /function refreshGuidePathIfActive\(resetScroll\)[\s\S]{0,240}renderPathQuests\(\)/,
    'the full refresh must still exist for them to call');
});

test('the relayout does nothing when the Guide is not on screen', () => {
  const fn = guide.slice(guide.indexOf('function scheduleGuidePathRelayout()'),
                         guide.indexOf('\n}', guide.indexOf('function scheduleGuidePathRelayout()')));
  assert.match(fn, /currentMode !== 'guide'/, 'a resize elsewhere must not touch this panel');
  assert.match(fn, /typeof currentMode === 'undefined'/,
    'and it must survive firing before the shell has booted');
});
