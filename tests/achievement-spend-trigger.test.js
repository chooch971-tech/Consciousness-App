'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.join(__dirname, '..');
const ledgerSource = fs.readFileSync(path.join(root, 'omnia-ledger-client.js'), 'utf8');

// Boots the real ledger wrapper over a stub window, so the spend hook is
// exercised rather than restated. The wrapper only installs its globals when
// root.document exists, so the stub provides one.
function bootLedger() {
  const store = {};
  const ctx = {
    console, setTimeout, clearTimeout, Date, Math, JSON,
    document: { getElementById: () => null },
    localStorage: {
      getItem: (k) => (k in store ? store[k] : null),
      setItem(k, v) { store[k] = String(v); },
      removeItem(k) { delete store[k]; }
    },
    omniaState: { akasha: 10000, totalAkashaSpent: 0, totalAkashaEarned: 0 },
    saveOmniaState() {},
    achCalls: 0
  };
  ctx.window = ctx;
  vm.createContext(ctx);
  vm.runInContext('(function(root){' + ledgerSource + '})(this);', ctx, { filename: 'ledger.js' });
  return ctx;
}

const tick = () => new Promise((r) => setTimeout(r, 5));

test('a successful spend settles achievements', async () => {
  // Nothing re-checked achievements when the wallet moved, so crossing a
  // "Spend N Akasha" tier recorded nothing until an unrelated exercise, profile
  // visit or app launch happened to run achEvaluate.
  const ctx = bootLedger();
  ctx.achEvaluate = function () { ctx.achCalls += 1; };
  assert.equal(ctx.omniaSpendAkasha(500, 'test'), true);
  assert.equal(ctx.achCalls, 0, 'must not run inside the spend transaction');
  await tick();
  assert.equal(ctx.achCalls, 1, 'must run once the transaction has settled');
});

test('a refused spend settles nothing', async () => {
  const ctx = bootLedger();
  ctx.achEvaluate = function () { ctx.achCalls += 1; };
  ctx.omniaState.akasha = 10;
  assert.equal(ctx.omniaSpendAkasha(500, 'test'), false, 'not enough akasha');
  await tick();
  assert.equal(ctx.achCalls, 0, 'a failed spend must not trigger an evaluation');
});

test('the spend still returns its result and moves the wallet', async () => {
  const ctx = bootLedger();
  ctx.achEvaluate = function () { ctx.achCalls += 1; };
  ctx.omniaSpendAkasha(2500, 'test');
  await tick();
  assert.equal(ctx.omniaState.akasha, 7500);
  assert.equal(ctx.omniaState.totalAkashaSpent, 2500);
});

test('a missing or throwing achEvaluate never breaks a spend', async () => {
  const ctx = bootLedger();
  delete ctx.achEvaluate;
  assert.equal(ctx.omniaSpendAkasha(100, 'test'), true);
  await tick();
  const ctx2 = bootLedger();
  ctx2.achEvaluate = function () { throw new Error('boom'); };
  assert.equal(ctx2.omniaSpendAkasha(100, 'test'), true);
  await tick();
  assert.equal(ctx2.omniaState.akasha, 9900, 'the spend still stands');
});

test('crediting is deliberately not hooked', () => {
  // achEvaluate pays the badge reward through omniaCreditAkasha, so hooking the
  // credit side would recurse.
  const block = ledgerSource.slice(ledgerSource.indexOf('root.omniaCreditAkasha'),
                                   ledgerSource.indexOf('root.omniaSpendAkasha'));
  assert.doesNotMatch(block, /achEvaluate/, 'credit must not settle achievements');
  // And the spend side must still have it, so this test cannot pass by the
  // hook having been removed altogether.
  const spendBlock = ledgerSource.slice(ledgerSource.indexOf('root.omniaSpendAkasha'),
                                        ledgerSource.indexOf('root.omniaTransferAkasha'));
  assert.match(spendBlock, /achEvaluate/, 'spend must settle achievements');
});
