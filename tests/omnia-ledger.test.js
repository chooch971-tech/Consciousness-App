'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createLedger, DEFAULT_KEY, sanitizeMeta, detectSilentWalletLoss } = require('../omnia-ledger-client');
const { LOCAL_PROGRESS_KEYS, SYNC_KEYS } = require('../sync-contract');

function memoryStorage() {
  const values = new Map();
  return {
    getItem: key => values.has(key) ? values.get(key) : null,
    setItem: (key, value) => values.set(key, String(value))
  };
}

test('Akasha ledger distinguishes credits, spends, transfers, mints, and reversals', () => {
  const ledger = createLedger({ storage: memoryStorage(), now: () => 1234 });
  const state = { akasha: 100, totalAkashaEarned: 100, totalAkashaSpent: 0 };

  assert.equal(ledger.credit(state, 25, 'exercise', { exId: 'clock' }), 25);
  assert.equal(ledger.spend(state, 40, 'body-upgrade'), true);
  assert.equal(ledger.transfer(state, 12, 'generator-collection'), 12);
  assert.equal(ledger.mint(state, 9.8, 'generator-accrual'), 9);
  assert.equal(ledger.reverseCredit(state, 10, 'achievement-revocation'), 10);

  assert.deepEqual(state, { akasha: 87, totalAkashaEarned: 124, totalAkashaSpent: 40 });
  assert.deepEqual(ledger.read().map(entry => entry.kind), [
    'credit', 'spend', 'transfer', 'mint', 'reversal'
  ]);
});

test('Akasha ledger rejects unaffordable spends and bounds local telemetry', () => {
  const storage = memoryStorage();
  const ledger = createLedger({ storage, limit: 2, now: () => 9000 });
  const state = { akasha: 1 };

  assert.equal(ledger.spend(state, 2, 'cosmetic'), false);
  ledger.credit(state, 1, 'one', { notes: { private: true }, label: 'a'.repeat(100) });
  ledger.credit(state, 1, 'two');
  ledger.credit(state, 1, 'three');

  const entries = JSON.parse(storage.getItem(DEFAULT_KEY));
  assert.equal(entries.length, 2);
  assert.deepEqual(entries.map(entry => entry.source), ['two', 'three']);
  assert.equal(sanitizeMeta({ notes: { private: true }, label: 'a'.repeat(100) }).label.length, 80);
  assert.equal('notes' in sanitizeMeta({ notes: { private: true } }), false);
});

test('legacy exercise stats migrate locally without changing progression totals', () => {
  const ledger = createLedger({ storage: memoryStorage(), now: () => 777 });
  const state = {
    akasha: 500,
    totalAkashaEarned: 900,
    akashaLog: [{ exId: 'clock', name: 'Clock', seconds: 300, gain: 30, recommended: true, date: 456 }]
  };

  assert.equal(ledger.migrateLegacyExerciseLog(state), 1);
  assert.equal('akashaLog' in state, false);
  assert.equal(state.akasha, 500);
  assert.equal(state.totalAkashaEarned, 900);
  assert.deepEqual(ledger.read()[0], {
    v: 1,
    at: 456,
    kind: 'credit',
    source: 'exercise',
    amount: 30,
    balance: 0,
    meta: { exId: 'clock', name: 'Clock', seconds: 300, recommended: true }
  });
});

test('feature clients do not mutate the Akasha wallet outside the ledger boundary', () => {
  const root = path.join(__dirname, '..');
  const clients = fs.readdirSync(root).filter(name => name.endsWith('-client.js') && name !== 'omnia-ledger-client.js');
  const violations = clients.filter(name => /omniaState\.akasha\s*(?:\+\+|--|[+\-*/]?=)/.test(
    fs.readFileSync(path.join(root, name), 'utf8')
  ));
  assert.deepEqual(violations, []);
});

test('local ledger clears with progress but never enters cloud sync', () => {
  assert.equal(LOCAL_PROGRESS_KEYS.includes(DEFAULT_KEY), true);
  assert.equal(SYNC_KEYS.includes(DEFAULT_KEY), false);
});

test('detectSilentWalletLoss reconstructs an unaccounted balance drop', () => {
  // Mirrors the reported incident: balance rode up to 11,927 via normal
  // activity, then a +500 Morning Offering landed at 500 — meaning the wallet
  // was silently at 0 beforehand. The 11,927 drop had no spend entry.
  const seq = [
    { at: 10, kind: 'transfer', source: 'generator-collection', amount: 1275, balance: 9390 },
    { at: 20, kind: 'transfer', source: 'generator-collection', amount: 1661, balance: 11428 },
    { at: 30, kind: 'transfer', source: 'generator-collection', amount: 499, balance: 11927 },
    // ← wallet silently zeroed here by the sync bug (no ledger entry)
    { at: 40, kind: 'credit', source: 'morning-offering', amount: 500, balance: 500 }
  ];
  const { loss, maxBalance } = detectSilentWalletLoss(seq);
  assert.equal(loss, 11927);
  assert.equal(maxBalance, 11927);
});

test('detectSilentWalletLoss ignores legitimate spends and empty ledgers', () => {
  // Fewer than two entries: no drop is measurable, so nothing to restore.
  assert.deepEqual(detectSilentWalletLoss([]), { loss: 0, maxBalance: 0 });
  assert.deepEqual(detectSilentWalletLoss([{ at: 1, kind: 'credit', amount: 100, balance: 100 }]), { loss: 0, maxBalance: 0 });
  // A normal spend lowers the balance by exactly its amount → no silent loss.
  const normal = [
    { at: 1, kind: 'credit', source: 'exercise', amount: 100, balance: 100 },
    { at: 2, kind: 'spend', source: 'body-upgrade', amount: 40, balance: 60 },
    { at: 3, kind: 'transfer', source: 'generator-collection', amount: 25, balance: 85 }
  ];
  assert.equal(detectSilentWalletLoss(normal).loss, 0);
});

test('one-time wallet recovery restores the loss via transfer, without inflating lifetime earnings', () => {
  const stateClient = require('fs').readFileSync(path.join(__dirname, '..', 'omnia-state-client.js'), 'utf8');
  // Sanity: the recovery flag is OR-folded so it never re-runs across devices.
  assert.match(stateClient, /base\._walletRecoveredV1 = !!\(base\._walletRecoveredV1 \|\| other\._walletRecoveredV1\)/);
  const ledgerClient = require('fs').readFileSync(path.join(__dirname, '..', 'omnia-ledger-client.js'), 'utf8');
  // Recovery must use transfer (wallet-only), never credit (which bumps totalAkashaEarned).
  assert.match(ledgerClient, /omniaTransferAkasha\(loss, 'balance-recovery'/);
  assert.doesNotMatch(ledgerClient, /omniaCreditAkasha\([^)]*balance-recovery/);
});
