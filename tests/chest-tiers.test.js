'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const full = fs.readFileSync(path.join(__dirname, '..', 'guide-quests-client.js'), 'utf8');
// Only the chest-tier rules: the rest of the module wires DOM on load.
const source = full.slice(full.indexOf('// ── Chest tiers ──'), full.indexOf('function claimPathQuestReward('));

function load(extra) {
  const store = {};
  const context = Object.assign({
    console,
    localStorage:{ getItem:k => (k in store ? store[k] : null), setItem:(k, v) => { store[k] = String(v); } },
    presenceDayKey:d => (d ? new Date(d) : new Date('2026-11-25T12:00:00')).toISOString().slice(0, 10)
  }, extra || {});
  vm.runInNewContext(source, context, { filename:'guide-quests-client.js' });
  context.store = store;
  return context;
}

// Share of rolls landing on each tier across a uniform sweep of the die.
function shares(roll, quality) {
  const n = 1000, out = { radiant:0, rich:0, common:0 };
  for (let i = 0; i < n; i++) out[roll(quality, (i + 0.5) / n).id]++;
  return { radiant:out.radiant / n, rich:out.rich / n, common:out.common / n };
}

test('better practice today means better odds of a rich chest — never worse', () => {
  const { pathQuestChestRoll } = load();
  const idle = shares(pathQuestChestRoll, 0);
  const devoted = shares(pathQuestChestRoll, 1);
  assert.ok(devoted.radiant > idle.radiant);
  assert.ok(devoted.radiant + devoted.rich > idle.radiant + idle.rich);
  assert.equal(idle.radiant, 0.05);
  assert.equal(devoted.radiant, 0.15);
});

test('chests stay a modest top-up so the Akasha economy is not inflated', () => {
  const { pathQuestChestRoll, CHEST_TIERS } = load();
  const expected = q => {
    const s = shares(pathQuestChestRoll, q);
    const mult = id => CHEST_TIERS.find(t => t.id === id).mult;
    return s.radiant * mult('radiant') + s.rich * mult('rich') + s.common * mult('common');
  };
  assert.ok(expected(0) < 1.2, 'an idle day averages under +20%');
  assert.ok(expected(1) < 1.35, 'even a perfect day averages under +35%');
  assert.equal(pathQuestChestRoll(0, 0.999).mult, 1, 'most chests are plain');
});

test('practice quality counts today only: minutes sat and a personal best set today', () => {
  const today = '2026-11-25T09:00:00';
  const yesterday = '2026-11-24T09:00:00';
  const context = load({
    concState:{ history:[{ date:today, durationSec:900 }, { date:yesterday, durationSec:3600 }] },
    state:{ history:[{ date:today, durationMin:15 }] }
  });
  assert.equal(context.pathQuestPracticeQuality(), 0.7, '30 minutes today is full minute credit; yesterday is ignored');
  context.store.presence_pb_day = '2026-11-25';
  assert.equal(context.pathQuestPracticeQuality(), 1);
});
