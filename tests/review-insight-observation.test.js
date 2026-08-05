'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.join(__dirname, '..');
const reportsSrc = fs.readFileSync(path.join(root, 'reports-client.js'), 'utf8');

// reports-client.js is a browser script; run the pure pieces in a sandbox with
// only the helpers reviewObservation actually reaches.
function sandbox(opts) {
  opts = opts || {};
  const ctx = {
    Math, JSON, Date, console,
    reportOffset: opts.offset === undefined ? 0 : opts.offset,
    GUIDE_SENSORY_CLEAN_GOAL_SEC: 300,
    guideSensoryHeadlineStage: opts.stage === undefined ? undefined : function () { return opts.stage; }
  };
  vm.createContext(ctx);
  // Pull in just the functions under test plus the helpers they call.
  ['REVIEW_PRACTICES = ', 'function reviewSeconds', 'function reviewMetricText',
   'function reviewBestImprovement', 'function reviewDisciplineCount',
   'function reviewSensoryGateText', 'function reviewObservation'].forEach(marker => {
    const start = reportsSrc.indexOf(marker);
    assert.ok(start > -1, 'missing ' + marker);
    let end;
    if (marker.endsWith('= ')) {
      end = reportsSrc.indexOf('\n};', start) + 3;
    } else {
      end = reportsSrc.indexOf('\n}', start) + 2;
    }
    vm.runInContext((marker.endsWith('= ') ? 'var ' : '') + reportsSrc.slice(start, end), ctx);
  });
  return ctx;
}

function win(over) {
  return Object.assign({
    sessions: 3, totalSeconds: 1080, activeDays: 2, byPractice: {},
    awareness: { stability: null }, plan: { assigned: 0, completed: 0, days: 0 }
  }, over || {});
}

test('a personal best still leads', () => {
  const ctx = sandbox();
  const text = ctx.reviewObservation(
    win({ byPractice: { thought: { sessions: 5, best: 780 } } }),
    win({ byPractice: { thought: { sessions: 4, best: 600 } } }), 'weekly');
  assert.match(text, /Thought Control moved forward/);
  assert.match(text, /13m/);
});

test('the observation never recites the hero tiles back', () => {
  // The tiles directly beneath state practice days and practice time, so a
  // sentence repeating them is the most prominent thing on screen saying what
  // the next row says. That was the old fallback, verbatim.
  assert.doesNotMatch(reportsSrc,
    /'You practiced on ' \+ summary\.activeDays \+ ' of '/,
    'the days/time/sessions restatement must be gone');
  const ctx = sandbox();
  const flat = win({ byPractice: { clock: { sessions: 3, best: 300 } } });
  const text = ctx.reviewObservation(flat, null, 'weekly');
  assert.equal(text, '', 'with nothing to compare and nothing gained, it says nothing');
});

test('the sensory gate speaks without needing a previous window', () => {
  // This is the rung that covers a first week, when every comparison below is
  // unavailable — and it names the number actually being worked toward.
  const ctx = sandbox({ stage: { name: 'Senses', label: 'Feeling · Closed Eyes', bestCleanSec: 236 } });
  const text = ctx.reviewObservation(win({ byPractice: { sense: { sessions: 3, best: 236 } } }), null, 'weekly');
  assert.match(text, /Senses · Feeling · Closed Eyes is 1m 4s from the 5m clean hold that masters it\./);
});

test('the gate stays quiet when it would say nothing or repeat a mastery', () => {
  const unstarted = sandbox({ stage: { name: 'Senses', label: 'Feeling · Closed Eyes', bestCleanSec: 0 } });
  assert.equal(unstarted.reviewSensoryGateText(), '', 'no hold yet is not an observation');
  const mastered = sandbox({ stage: { name: 'Senses', label: 'Feeling · Closed Eyes', bestCleanSec: 300 } });
  assert.equal(mastered.reviewSensoryGateText(), '', 'a reached gate is the track\'s news, not this card\'s');
  const none = sandbox({ stage: null });
  assert.equal(none.reviewSensoryGateText(), '');
});

test('the gate is held to the live window', () => {
  // In a past review it would report today's standing against a window that
  // closed long ago.
  const past = sandbox({ offset: -1, stage: { name: 'Senses', label: 'Feeling · Closed Eyes', bestCleanSec: 236 } });
  assert.equal(past.reviewSensoryGateText(), '');
});

test('window-over-window movement is reported when nothing else moved', () => {
  const ctx = sandbox();
  const base = { byPractice: { clock: { sessions: 3, best: 300 } } };

  const moreTime = ctx.reviewObservation(
    win(Object.assign({ totalSeconds: 1935 }, base)),
    win(Object.assign({ totalSeconds: 1080 }, base)), 'weekly');
  assert.match(moreTime, /32m 15s this week, up from 18m the week before\./);

  const moreDays = ctx.reviewObservation(
    win(Object.assign({ activeDays: 4 }, base)),
    win(Object.assign({ activeDays: 2 }, base)), 'weekly');
  assert.match(moreDays, /on 4 days this week, against 2 the week before\./);

  const broader = ctx.reviewObservation(
    win({ byPractice: { clock: { sessions: 2, best: 300 }, asana: { sessions: 2, best: 600 } } }),
    win(base), 'weekly');
  assert.match(broader, /across 2 disciplines this week, against 1 the week before\./);
});

test('holding level is itself the observation on a maintenance window', () => {
  const ctx = sandbox();
  const same = { activeDays: 3, byPractice: { clock: { sessions: 3, best: 300 } } };
  const text = ctx.reviewObservation(win(same), win(same), 'weekly');
  assert.match(text, /kept the same rhythm as the week before: 3 practice days\./);
});

test('a window that fell behind gets no observation rather than a scolding', () => {
  const ctx = sandbox();
  const text = ctx.reviewObservation(
    win({ sessions: 2, totalSeconds: 600, activeDays: 1, byPractice: { clock: { sessions: 2, best: 300 } } }),
    win({ sessions: 5, totalSeconds: 1800, activeDays: 4, byPractice: { clock: { sessions: 5, best: 300 } } }),
    'weekly');
  assert.equal(text, '');
});

test('the period word follows the period', () => {
  const ctx = sandbox();
  const base = { byPractice: { clock: { sessions: 3, best: 300 } } };
  const monthly = ctx.reviewObservation(
    win(Object.assign({ totalSeconds: 1935 }, base)),
    win(Object.assign({ totalSeconds: 1080 }, base)), 'monthly');
  assert.match(monthly, /this month, up from 18m the month before\./);
});

test('an empty observation drops the card instead of rendering it blank', () => {
  assert.match(reportsSrc, /if \(!loading && !guidance\.insight\) return '';/,
    'the card is not rendered with nothing in it');
  // And a failed AI generation that falls back to an empty observation must
  // take the card with it rather than resolve the loading line into a blank.
  assert.match(reportsSrc, /if \(!textVal\) \{[\s\S]*closest\('\.review-insight'\)/,
    'the fallback path removes the section too');
});

test('a window with no practice at all still explains itself', () => {
  // Silence is right when there is nothing to add; it is wrong when the user
  // has never practised and needs to know that is fine.
  assert.match(reportsSrc, /There is no practice recorded in this window yet/);
});
