'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '..', 'concentration-clock-client.js'), 'utf8');
const controlsSource = fs.readFileSync(path.join(__dirname, '..', 'concentration-controls-client.js'), 'utf8');
const presenceSource = fs.readFileSync(path.join(__dirname, '..', 'presence.html'), 'utf8');

function loadPersonalBestFlags() {
  const start = source.indexOf('function clockHistoryPersonalBestFlags');
  const end = source.indexOf('\n// "Best Hold"', start);
  const context = vm.createContext({
    isClockSession: entry => !!entry && !entry.exercise && !entry.type,
    isFinite,
    Date,
    Math,
    parseInt
  });
  vm.runInContext(source.slice(start, end), context);
  return context.clockHistoryPersonalBestFlags;
}

test('Clock history identifies the sessions that established a record at the time', () => {
  const flags = loadPersonalBestFlags()([
    { date:'2026-07-05T09:00:00Z', seconds:20 },
    { date:'2026-07-04T09:00:00Z', seconds:12 },
    { date:'2026-07-03T09:00:00Z', seconds:15 },
    { date:'2026-07-02T09:00:00Z', seconds:15 },
    { date:'2026-07-01T09:00:00Z', seconds:10 },
    { date:'2026-06-30T09:00:00Z', seconds:300, exercise:'asana' }
  ]);
  assert.deepEqual(JSON.parse(JSON.stringify(flags)), {
    0:true,
    1:false,
    2:false,
    3:true,
    4:true
  });
});

test('Clock history preserves an explicitly recorded personal-best result', () => {
  const flags = loadPersonalBestFlags()([
    { date:'2026-07-03T09:00:00Z', seconds:18, isPersonalBest:true },
    { date:'2026-07-02T09:00:00Z', seconds:20, isPersonalBest:false },
    { date:'2026-07-01T09:00:00Z', seconds:10, isPersonalBest:true }
  ]);
  assert.deepEqual(JSON.parse(JSON.stringify(flags)), { 0:true, 1:false, 2:true });
});

test('Clock history uses Best Rep copy and marks personal-best cards', () => {
  assert.doesNotMatch(source, /Personal Best Rep/);
  assert.match(source, /conc-history-stat-label">Best Rep</);
  assert.match(source, /isPersonalBest \? ' is-personal-best'/);
  assert.match(source, /conc-history-pb-badge">Personal Best/);
  assert.equal((source.match(/isPersonalBest: isNewBest/g) || []).length, 2);
});

test('Clock history Back and swipe reveal the same originating screen', () => {
  const start = controlsSource.indexOf('function concHistoryPreviousScreen');
  const end = controlsSource.indexOf("document.getElementById('concHistoryBack')", start);
  const fromClock = vm.createContext({ concHistoryFrom:'exSetupScreen' });
  vm.runInContext(controlsSource.slice(start, end), fromClock);
  assert.equal(fromClock.concHistoryPreviousScreen(), 'exSetupScreen');

  const fromHome = vm.createContext({ concHistoryFrom:'home' });
  vm.runInContext(controlsSource.slice(start, end), fromHome);
  assert.equal(fromHome.concHistoryPreviousScreen(), 'homeScreen');

  assert.match(controlsSource, /var previous = concHistoryPreviousScreen\(\);\s*showScreen\(previous\)/);
  assert.match(presenceSource, /screenEl\.id === 'concHistoryScreen'[\s\S]*?concHistoryPreviousScreen\(\)/);
  const dynamicDestination = presenceSource.indexOf("screenEl.id === 'concHistoryScreen'");
  const homeFallback = presenceSource.indexOf("PREV_SCREEN[screenEl.id] || 'homeScreen'", dynamicDestination);
  assert.ok(dynamicDestination !== -1 && homeFallback > dynamicDestination, 'history origin resolves before the Home fallback');
});
