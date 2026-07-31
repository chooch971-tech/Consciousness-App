'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.join(__dirname, '..');
const sessionSource = fs.readFileSync(path.join(root, 'session-complete-client.js'), 'utf8');

function loadFlow() {
  const context = {
    console,
    clearTimeout:() => {},
    setTimeout:() => 1,
    window:{},
    requestAnimationFrame:() => 1
  };
  vm.runInNewContext(sessionSource, context, { filename:'session-complete-client.js' });
  return context;
}

test('completion ceremonies play in priority order and never overlap', () => {
  const context = loadFlow();
  const shown = [];
  const close = {};

  context.completionFlowBegin();
  context.completionFlowQueue('achievement-reveal', 40, done => {
    shown.push('achievement'); close.achievement = done;
  });
  context.completionFlowQueue('body-level-award', 20, done => {
    shown.push('body'); close.body = done;
  });
  context.completionFlowQueue('streak-celebration', 10, done => {
    shown.push('streak'); close.streak = done;
  });
  context.completionFlowQueue('level-up:concentration', 30, done => {
    shown.push('level'); close.level = done;
  });

  context.completionFlowSessionOpened();
  assert.deepEqual(shown, []);
  context.completionFlowSessionDone();
  assert.deepEqual(shown, ['streak']);
  close.streak();
  assert.deepEqual(shown, ['streak', 'body']);
  close.body();
  assert.deepEqual(shown, ['streak', 'body', 'level']);
  close.level();
  assert.deepEqual(shown, ['streak', 'body', 'level', 'achievement']);
  close.achievement();
  assert.equal(context.completionFlowIsActive(), false);
});

test('completion queue deduplicates repeated producers and callbacks', () => {
  const context = loadFlow();
  let shows = 0;
  let close;

  assert.equal(context.completionFlowQueue('streak-celebration', 10, done => {
    shows++; close = done;
  }), true);
  assert.equal(context.completionFlowQueue('streak-celebration', 10, () => {
    shows++;
  }), false);
  context.completionFlowSessionOpened();
  context.completionFlowSessionDone();
  assert.equal(shows, 1);
  close();
  close();
  assert.equal(shows, 1);
  assert.equal(context.completionFlowIsActive(), false);
});

test('session completion starts its queued successor before fading away', () => {
  const doneHandler = sessionSource.slice(
    sessionSource.indexOf("document.getElementById('scDoneBtn').onclick"),
    sessionSource.indexOf('if (opts.onRepeat)', sessionSource.indexOf("document.getElementById('scDoneBtn').onclick"))
  );
  assert.ok(doneHandler.indexOf('completionFlowSessionDone();') >= 0);
  assert.ok(doneHandler.indexOf('completionFlowSessionDone();') < doneHandler.indexOf("el.classList.remove('sc-vis')"));
});

test('every full concentration result queues level-ups before its completion screen', () => {
  const files = [
    'asana-client.js',
    'auditory-client.js',
    'concentration-clock-client.js',
    'pore-breathing-client.js',
    'senses-client.js',
    'thought-control-client.js',
    'visualization-client.js'
  ];
  files.forEach(file => {
    const source = fs.readFileSync(path.join(root, file), 'utf8');
    assert.match(source, /completionFlowQueueLevelUp\(/, file);
  });
});

test('streak, body-level, and achievement producers use the shared sequence', () => {
  const awareness = fs.readFileSync(path.join(root, 'awareness-client.js'), 'utf8');
  const rewards = fs.readFileSync(path.join(root, 'omnia-rewards-client.js'), 'utf8');
  const achievements = fs.readFileSync(path.join(root, 'achievements-client.js'), 'utf8');

  assert.match(awareness, /completionFlowQueue\('streak-celebration', 10/);
  assert.match(rewards, /completionFlowQueue\('body-level-award', 20/);
  assert.match(achievements, /completionFlowQueue\('achievement-reveal', 40/);
});

test('Awareness holds earned ceremonies behind its result until Done', () => {
  const awareness = fs.readFileSync(path.join(root, 'awareness-client.js'), 'utf8');
  const survey = awareness.slice(
    awareness.indexOf('function submitSurvey()'),
    awareness.indexOf('\nfunction adapt(', awareness.indexOf('function submitSurvey()'))
  );

  assert.match(survey, /completionFlowSessionOpened\(\)/);
  assert.match(survey, /touchPracticeStreak\(\)/);
  assert.match(survey, /completionFlowQueueLevelUp\(state\.level, 'awareness'\)/);
  assert.match(survey, /renderHome\(\); showScreen\('homeScreen'\);\s*if \(typeof completionFlowSessionDone/);
});
