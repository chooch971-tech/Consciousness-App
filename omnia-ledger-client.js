(function(root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (!root) return;

  root.PresenceOmniaLedger = api;
  if (!root.document) return;

  var ledger = api.createLedger({
    storage: (function() { try { return root.localStorage; } catch (e) { return null; } })()
  });
  root.omniaReadAkashaLedger = function() { return ledger.read(); };
  root.omniaCreditAkasha = function(amount, source, meta) {
    return ledger.credit(root.omniaState, amount, source, meta);
  };
  root.omniaSpendAkasha = function(amount, source, meta) {
    return ledger.spend(root.omniaState, amount, source, meta);
  };
  root.omniaTransferAkasha = function(amount, source, meta) {
    return ledger.transfer(root.omniaState, amount, source, meta);
  };
  root.omniaMintAkasha = function(amount, source, meta, record) {
    return ledger.mint(root.omniaState, amount, source, meta, record);
  };
  root.omniaReverseAkashaCredit = function(amount, source, meta) {
    return ledger.reverseCredit(root.omniaState, amount, source, meta);
  };

  if (root.omniaState && Array.isArray(root.omniaState.akashaLog)) {
    var migrated = ledger.migrateLegacyExerciseLog(root.omniaState);
    if (migrated >= 0 && typeof root.saveOmniaState === 'function') root.saveOmniaState();
  }

  // One-time wallet recovery: if a past sync-merge silently zeroed a real
  // Akasha balance (the fresh-snapshot-clobber bug, now fixed in
  // mergeOmniaPull), the local ledger still records the true balance. Restore
  // the unaccounted loss via a transfer — which moves already-earned akasha
  // back into the wallet WITHOUT bumping lifetime totalAkashaEarned (that
  // monotonic total survived the bug, so re-crediting it would double-count).
  // Runs once, after any startup cloud pull settles so it acts on merged state
  // and sees the synced _walletRecoveredV1 flag; the flag is OR-folded in
  // mergeOmniaPull so once any device recovers, no other device repeats it.
  root.omniaRecoverSilentWalletLoss = function() {
    var st = root.omniaState;
    if (!st || st._walletRecoveredV1) return 0;
    var loss = 0;
    try {
      var det = api.detectSilentWalletLoss(ledger.read());
      loss = Math.min(det.loss, det.maxBalance); // never restore above the highest balance ever recorded
    } catch (e) { loss = 0; }
    st._walletRecoveredV1 = 1; // mark done even at 0 so we never re-scan
    if (loss > 0) root.omniaTransferAkasha(loss, 'balance-recovery', { reason: 'sync-wallet-loss' });
    if (typeof root.saveOmniaState === 'function') root.saveOmniaState();
    if (loss > 0 && root.syncEnabled && root.authToken && typeof root.syncPushData === 'function') {
      try { root.syncPushData(); } catch (e) {}
    }
    if (loss > 0 && typeof root.showToast === 'function') {
      root.showToast('Restored ' + loss.toLocaleString() + ' Akasha lost to a sync error', 4200, 'gold');
      if (typeof root.renderOmniaEngine === 'function' && root.document.getElementById('omniaEngine')) {
        try { root.renderOmniaEngine(); } catch (e) {}
      }
    }
    return loss;
  };
  (function _omniaWalletRecoverySettle(waited) {
    if (!root.omniaState || typeof root.omniaTransferAkasha !== 'function') {
      if (waited < 20000) return void setTimeout(function() { _omniaWalletRecoverySettle(waited + 400); }, 400);
      return;
    }
    if (root._syncPullPending && waited < 30000) {
      return void setTimeout(function() { _omniaWalletRecoverySettle(waited + 400); }, 400);
    }
    try { root.omniaRecoverSilentWalletLoss(); } catch (e) {}
  })(0);
})(typeof globalThis !== 'undefined' ? globalThis : this, function() {
  'use strict';

  var DEFAULT_KEY = 'presence_akasha_ledger_v1';
  var DEFAULT_LIMIT = 500;

  function finiteNumber(value) {
    var number = Number(value);
    return Number.isFinite(number) ? number : 0;
  }

  function cleanAmount(value) {
    return Math.max(0, Math.round(finiteNumber(value)));
  }

  function sanitizeMeta(meta) {
    if (!meta || typeof meta !== 'object' || Array.isArray(meta)) return {};
    var clean = {};
    Object.keys(meta).slice(0, 12).forEach(function(key) {
      if (!/^[a-zA-Z][a-zA-Z0-9_]{0,31}$/.test(key)) return;
      var value = meta[key];
      if (typeof value === 'string') clean[key] = value.slice(0, 80);
      else if (typeof value === 'number' && Number.isFinite(value)) clean[key] = value;
      else if (typeof value === 'boolean') clean[key] = value;
    });
    return clean;
  }

  function createLedger(options) {
    options = options || {};
    var storage = options.storage || null;
    var key = options.key || DEFAULT_KEY;
    var limit = Math.max(1, cleanAmount(options.limit || DEFAULT_LIMIT));
    var now = typeof options.now === 'function' ? options.now : Date.now;

    function read() {
      if (!storage) return [];
      try {
        var parsed = JSON.parse(storage.getItem(key) || '[]');
        return Array.isArray(parsed) ? parsed.slice(-limit) : [];
      } catch (e) {
        return [];
      }
    }

    function write(entries) {
      if (!storage) return false;
      try {
        storage.setItem(key, JSON.stringify(entries.slice(-limit)));
        return true;
      } catch (e) {
        return false;
      }
    }

    function append(kind, source, amount, balance, meta, at) {
      var entries = read();
      entries.push({
        v: 1,
        at: finiteNumber(at) || now(),
        kind: String(kind || 'unknown').slice(0, 24),
        source: String(source || 'unknown').slice(0, 48),
        amount: cleanAmount(amount),
        balance: cleanAmount(balance),
        meta: sanitizeMeta(meta)
      });
      write(entries);
    }

    function credit(state, amount, source, meta) {
      if (!state) return 0;
      var value = cleanAmount(amount);
      state.akasha = cleanAmount(state.akasha) + value;
      state.totalAkashaEarned = cleanAmount(state.totalAkashaEarned) + value;
      append('credit', source, value, state.akasha, meta);
      return value;
    }

    function spend(state, amount, source, meta) {
      if (!state) return false;
      var value = cleanAmount(amount);
      if (cleanAmount(state.akasha) < value) return false;
      state.akasha = cleanAmount(state.akasha) - value;
      state.totalAkashaSpent = cleanAmount(state.totalAkashaSpent) + value;
      append('spend', source, value, state.akasha, meta);
      return true;
    }

    function transfer(state, amount, source, meta) {
      if (!state) return 0;
      var value = cleanAmount(amount);
      state.akasha = cleanAmount(state.akasha) + value;
      append('transfer', source, value, state.akasha, meta);
      return value;
    }

    function mint(state, amount, source, meta, shouldRecord) {
      if (!state) return 0;
      var before = cleanAmount(state.totalAkashaEarned);
      state.totalAkashaEarned = Math.floor(before + Math.max(0, finiteNumber(amount)));
      var minted = Math.max(0, state.totalAkashaEarned - before);
      if (shouldRecord !== false && minted > 0) append('mint', source, minted, state.akasha, meta);
      return minted;
    }

    function reverseCredit(state, amount, source, meta) {
      if (!state) return 0;
      var value = cleanAmount(amount);
      var walletBefore = cleanAmount(state.akasha);
      state.akasha = Math.max(0, walletBefore - value);
      state.totalAkashaEarned = Math.max(0, cleanAmount(state.totalAkashaEarned) - value);
      var reversed = Math.min(walletBefore, value);
      append('reversal', source, reversed, state.akasha, meta);
      return reversed;
    }

    function migrateLegacyExerciseLog(state) {
      if (!state || !Array.isArray(state.akashaLog)) return -1;
      var legacy = state.akashaLog;
      var entries = read();
      legacy.forEach(function(entry) {
        entry = entry || {};
        entries.push({
          v: 1,
          at: finiteNumber(entry.date) || now(),
          kind: 'credit',
          source: 'exercise',
          amount: cleanAmount(entry.gain),
          balance: 0,
          meta: sanitizeMeta({
            exId: entry.exId || '',
            name: entry.name || '',
            seconds: finiteNumber(entry.seconds),
            recommended: !!entry.recommended
          })
        });
      });
      if (!write(entries)) return -1;
      delete state.akashaLog;
      return legacy.length;
    }

    return {
      read: read,
      credit: credit,
      spend: spend,
      transfer: transfer,
      mint: mint,
      reverseCredit: reverseCredit,
      migrateLegacyExerciseLog: migrateLegacyExerciseLog
    };
  }

  // Reconstruct how much akasha the wallet lost *without* a matching ledger
  // entry. Every real wallet move (credit/spend/transfer/reversal) is logged
  // with the running balance after it, so between two consecutive entries the
  // balance should change by exactly the signed amount of the later entry. A
  // larger-than-expected drop means the wallet was zeroed/lowered by something
  // that bypassed the ledger — historically the sync-merge bug that let a
  // fresh/empty snapshot overwrite a real balance. (Reset All Progress also
  // bypasses the ledger, but it clears the ledger too, so no stale pre-drop
  // entries survive to be mistaken for a silent loss — this can't fire on a
  // reset.) Returns { loss, maxBalance }: loss is the total unaccounted drop,
  // maxBalance the highest balance ever recorded (a safety ceiling for the
  // amount restored). Pure — takes the ledger array, mutates nothing.
  function detectSilentWalletLoss(entries) {
    if (!Array.isArray(entries) || entries.length < 2) return { loss: 0, maxBalance: 0 };
    var sorted = entries.slice().sort(function(a, b) { return (finiteNumber(a && a.at)) - (finiteNumber(b && b.at)); });
    var loss = 0, maxBalance = 0;
    var running = finiteNumber(sorted[0] && sorted[0].balance);
    maxBalance = running;
    for (var i = 1; i < sorted.length; i++) {
      var e = sorted[i] || {};
      var amount = finiteNumber(e.amount);
      var signed = (e.kind === 'spend' || e.kind === 'reversal') ? -amount : amount;
      var expected = running + signed;
      var actual = finiteNumber(e.balance);
      if (actual < expected - 0.5) loss += (expected - actual);
      running = actual;
      if (actual > maxBalance) maxBalance = actual;
    }
    return { loss: Math.round(Math.max(0, loss)), maxBalance: Math.round(Math.max(0, maxBalance)) };
  }

  return {
    DEFAULT_KEY: DEFAULT_KEY,
    DEFAULT_LIMIT: DEFAULT_LIMIT,
    sanitizeMeta: sanitizeMeta,
    createLedger: createLedger,
    detectSilentWalletLoss: detectSilentWalletLoss
  };
});
