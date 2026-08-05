'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.join(__dirname, '..');
const server = fs.readFileSync(path.join(root, 'server.js'), 'utf8');

// A stand-in for the ai_budget collection: one counter per _id, exactly the
// atomic $inc-and-return the real driver performs.
function fakeCollection(opts) {
  opts = opts || {};
  const rows = new Map();
  return {
    rows,
    calls: [],
    async findOneAndUpdate(filter, update) {
      if (opts.throwOn && opts.throwOn(filter._id)) throw new Error('connection lost');
      this.calls.push(filter._id);
      const n = (rows.get(filter._id) || 0) + (update.$inc.count || 0);
      rows.set(filter._id, n);
      return { _id: filter._id, count: n };
    }
  };
}

function load(collection, caps) {
  caps = caps || {};
  const warnings = [];
  const errors = [];
  const ctx = {
    Date, Math, Map, Number, JSON,
    console: { warn: m => warnings.push(m), error: m => errors.push(m), log() {} },
    aiCurrentDayKey: () => '2026-08-05',
    AI_GLOBAL_DAILY_CAP: caps.global || 3,
    AI_USER_DAILY_CAP: caps.user || 2,
    aiBudgetCollection: collection,
    warnings, errors
  };
  vm.createContext(ctx);
  const start = server.indexOf('const AI_BUDGET_ROW_TTL_MS');
  const end = server.indexOf('function aiRateLimit');
  assert.ok(start > -1 && end > start, 'the durable budget block must still be here');
  vm.runInContext(server.slice(start, end), ctx);
  return ctx;
}

test('generations are counted durably, not only in process memory', async () => {
  // Render restarts on every deploy, on a crash, and on a cold start after
  // idling. An in-memory counter resets each time, so a day's ceiling was
  // really a ceiling per process lifetime.
  const col = fakeCollection();
  const ctx = load(col, { global: 100, user: 100 });
  await ctx.aiConsumeDurableBudget('user-a');
  await ctx.aiConsumeDurableBudget('user-a');
  assert.equal(col.rows.get('global:2026-08-05'), 2, 'the day total survives outside the process');
  assert.equal(col.rows.get('user:2026-08-05:user-a'), 2);
});

test('the global ceiling refuses once the day is spent', async () => {
  const col = fakeCollection();
  const ctx = load(col, { global: 3, user: 100 });
  for (let i = 0; i < 3; i++) {
    const r = await ctx.aiConsumeDurableBudget('user-' + i);
    assert.equal(r.ok, true, 'generation ' + (i + 1) + ' is within the cap');
  }
  const over = await ctx.aiConsumeDurableBudget('user-x');
  assert.equal(over.ok, false);
  assert.equal(over.status, 429);
  assert.match(over.error, /at capacity/);
});

test('one account cannot drain the shared budget', async () => {
  const col = fakeCollection();
  const ctx = load(col, { global: 100, user: 2 });
  assert.equal((await ctx.aiConsumeDurableBudget('greedy')).ok, true);
  assert.equal((await ctx.aiConsumeDurableBudget('greedy')).ok, true);
  const over = await ctx.aiConsumeDurableBudget('greedy');
  assert.equal(over.ok, false);
  assert.match(over.error, /Daily AI limit/);
  // Everyone else is unaffected.
  assert.equal((await ctx.aiConsumeDurableBudget('someone-else')).ok, true);
});

test('a database failure allows the generation rather than losing the feature', async () => {
  // The in-memory caps still bound spend inside the process, so failing open
  // here trades a bounded overspend for not silently breaking every insight.
  const col = fakeCollection({ throwOn: () => true });
  const ctx = load(col);
  const r = await ctx.aiConsumeDurableBudget('user-a');
  assert.equal(r.ok, true);
  assert.equal(r.reason, 'store-error');
  assert.equal(ctx.errors.length, 1, 'and it is logged, not swallowed');
  assert.match(ctx.errors[0], /budget store unavailable/);
});

test('with no store configured it does not block', async () => {
  const ctx = load(null);
  const r = await ctx.aiConsumeDurableBudget('user-a');
  assert.equal(r.ok, true);
  assert.equal(r.reason, 'no-store');
});

test('a spent ceiling is logged for the operator, once per kind per day', async () => {
  const col = fakeCollection();
  const ctx = load(col, { global: 1, user: 100 });
  await ctx.aiConsumeDurableBudget('user-a');
  await ctx.aiConsumeDurableBudget('user-b');
  await ctx.aiConsumeDurableBudget('user-c');
  await ctx.aiConsumeDurableBudget('user-d');
  assert.equal(ctx.warnings.length, 1, 'a capped day leaves one mark, not a flood');
  assert.match(ctx.warnings[0], /global daily cap reached on 2026-08-05/);
});

test('budget rows carry an expiry so the collection cannot grow forever', () => {
  const block = server.slice(server.indexOf('const AI_BUDGET_ROW_TTL_MS'),
                             server.indexOf('function aiRateLimit'));
  assert.match(block, /\$set: \{ expiresAt \}/);
  assert.match(server, /label: 'ai-budget\.expiry'[\s\S]*?expireAfterSeconds: 0/);
});

test('both AI endpoints charge the durable budget before spending money', () => {
  // A generation that reaches OpenAI without passing here is unbounded spend.
  const progress = server.slice(server.indexOf("app.post('/api/ai/progress-comment'"),
                                server.indexOf("app.post('/api/sync/omnia/report'"));
  assert.ok(progress.indexOf('aiConsumeDurableBudget') > -1);
  assert.ok(progress.indexOf('aiConsumeDurableBudget') < progress.indexOf("generateAiMessage('progress_report'"),
    'charged before the paid call');

  const omniaStart = server.indexOf("app.post('/api/sync/omnia/report'");
  const omnia = server.slice(omniaStart, omniaStart + 6000);
  assert.ok(omnia.indexOf('aiConsumeDurableBudget') > -1);
  assert.ok(omnia.indexOf('aiConsumeDurableBudget') < omnia.indexOf("generateAiMessage('omnia_report'"),
    'charged before the paid call');
  // The cached read must stay free — it never reaches a generation.
  assert.match(omnia, /if \(usableCachedReport\(cached\)\) \{\s*\n\s*return res\.json\(\{ commentary: cached\.commentary \}\);/);
});

test('the paid call stays bounded in size and time', () => {
  assert.match(server, /max_tokens: 500/, 'output is capped');
  assert.match(server, /JSON\.stringify\(compactContext\(context\)\)\.slice\(0, 9000\)/, 'input is capped');
  assert.match(server, /setTimeout\(\(\) => controller\.abort\(\), 15000\)/, 'and it cannot hang');
});
