'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '..', 'guide-quests-client.js'), 'utf8');

// The Guide tab's quest dot must only ever signal a reward the player can
// actually reach. The awareness quest is the tricky one: its minutes are
// recorded every day, but its card is only rendered on alternating days
// (isAwarenessQuestDay), so the badge has to respect that same gate or it
// lights with nothing on screen to claim.
function loadQuests(options) {
  const opts = options || {};
  const badge = { style: { display: '' } };
  const context = {
    console,
    // Freeze "now" so isAwarenessQuestDay() is deterministic per test.
    Date: class extends Date {
      constructor(...args) {
        if (args.length === 0) super(opts.now);
        else super(...args);
      }
      static now() { return new Date(opts.now).getTime(); }
    },
    document: {
      // The module wires listeners onto several elements at load time, so hand
      // back an inert stub for anything that isn't the badge under test.
      getElementById: id => (id === 'guideTabQuestBadge' ? badge : {
        style: {}, classList: { add() {}, remove() {}, toggle() {}, contains: () => false },
        addEventListener() {}, querySelector: () => null, querySelectorAll: () => []
      }),
      querySelector: () => null,
      querySelectorAll: () => [],
      addEventListener: () => {}
    },
    localStorage: { getItem: () => null, setItem: () => {} },
    // Real calendar semantics (local-midnight day keys), but driven off the
    // frozen date above so pathQuestState() doesn't roll the fixture over.
    presenceDayKey: value => {
      const d = value ? new Date(value) : new Date(opts.now);
      const pad = n => String(n).padStart(2, '0');
      return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
    },
    guideState: { quests: opts.quests },
    saveGuideState: () => {},
    omniaState: {},
    renderPathQuests: () => {}
  };
  context.window = context;
  vm.runInNewContext(source, context, { filename: 'guide-quests-client.js' });
  context.__badge = badge;
  return context;
}

// Day-of-year parity drives isAwarenessQuestDay(). 2026-01-02 is day 2 (even)
// => an awareness quest day; 2026-01-03 is day 3 (odd) => not one.
const AWARENESS_DAY = '2026-01-02T22:31:00';
const OFF_DAY = '2026-01-03T22:31:00';

function questsFor(dayKey, overrides) {
  return Object.assign({
    daily: { date: dayKey, count: 2, claimed: true },
    weekend: { weekId: 'w-2026-01-01', count: 0, claimed: false },
    awareness: { date: dayKey, minutes: 30, claimed: false }
  }, overrides || {});
}

test('a finished awareness quest on an off day does not light the Guide badge', () => {
  // Everything the player can actually see is collected: the daily is claimed
  // and the weekend is unfinished. Only the (uncollectable, cardless)
  // awareness quest is complete — the badge must stay dark.
  const ctx = loadQuests({ now: OFF_DAY, quests: questsFor('2026-01-03') });
  assert.equal(ctx.isAwarenessQuestDay(), false, 'fixture must be an off day');
  assert.equal(ctx.pathQuestHasUnclaimed(), false);
  ctx.updateGuideQuestBadge();
  assert.equal(ctx.__badge.style.display, 'none');
});

test('the same finished awareness quest does light the badge on its own day', () => {
  // On an awareness quest day the card is rendered, so the reward is genuinely
  // claimable and the dot is correct — this is what keeps the fix from being
  // "just hide the badge".
  const ctx = loadQuests({ now: AWARENESS_DAY, quests: questsFor('2026-01-02') });
  assert.equal(ctx.isAwarenessQuestDay(), true, 'fixture must be an awareness day');
  assert.equal(ctx.pathQuestHasUnclaimed(), true);
  ctx.updateGuideQuestBadge();
  assert.equal(ctx.__badge.style.display, 'block');
});

test('an already-claimed awareness quest never lights the badge on its own day', () => {
  const ctx = loadQuests({
    now: AWARENESS_DAY,
    quests: questsFor('2026-01-02', { awareness: { date: '2026-01-02', minutes: 30, claimed: true } })
  });
  assert.equal(ctx.pathQuestHasUnclaimed(), false);
});

test('an unclaimed finished daily quest still lights the badge on an off day', () => {
  // The off-day gate must be scoped to awareness only — a real, claimable
  // daily reward has to keep signalling.
  const ctx = loadQuests({
    now: OFF_DAY,
    quests: questsFor('2026-01-03', { daily: { date: '2026-01-03', count: 2, claimed: false } })
  });
  assert.equal(ctx.pathQuestHasUnclaimed(), true);
});
