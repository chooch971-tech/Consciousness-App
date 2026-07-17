'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const presence = fs.readFileSync(path.join(__dirname, '..', 'presence.html'), 'utf8');

test('nested confirmations preserve the callback installed by the first action', () => {
  const listenerStart = presence.indexOf("document.getElementById('confirmModalOk').addEventListener");
  const listenerEnd = presence.indexOf('\n});', listenerStart);
  const listener = presence.slice(listenerStart, listenerEnd);
  const capture = listener.indexOf('var callback = window._confirmCallback');
  const clear = listener.indexOf('window._confirmCallback = null');
  const invoke = listener.indexOf('if (callback) callback()');
  assert.ok(capture >= 0 && clear > capture && invoke > clear);
  assert.doesNotMatch(listener, /window\._confirmCallback\(\);\s*window\._confirmCallback = null/);
});

test('Reset All retains its deliberate two-confirmation safeguard', () => {
  const resetStart = presence.indexOf("document.getElementById('drawerResetAll').addEventListener");
  const resetEnd = presence.indexOf("document.getElementById('settingsResetAwareness')", resetStart);
  const resetHandler = presence.slice(resetStart, resetEnd);
  assert.equal((resetHandler.match(/showConfirm\(/g) || []).length, 2);
  assert.match(resetHandler, /resetAllProgress\(\)/);
});
