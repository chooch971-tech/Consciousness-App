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
  const resetStart = presence.indexOf("document.getElementById('settingsResetAll').addEventListener");
  const resetEnd = presence.indexOf("document.getElementById('settingsResetAwareness')", resetStart);
  const resetHandler = presence.slice(resetStart, resetEnd);
  assert.equal((resetHandler.match(/showConfirm\(/g) || []).length, 2);
  assert.match(resetHandler, /resetAllProgress\(\)/);
});

test('Reset Awareness clears only Awareness, and marks it so the cloud cannot restore it', () => {
  const start = presence.indexOf("document.getElementById('settingsResetAwareness').addEventListener");
  const end = presence.indexOf("document.getElementById('settingsResetConc')", start);
  const handler = presence.slice(start, end);
  // Assert against code only: the handler's own comments explain what it
  // replaced and would otherwise match the name being ruled out.
  const code = handler.replace(/\/\/[^\n]*/g, '');
  // It used to call the global reset, erasing Concentration, Prayer, and Omnia
  // behind a button that promised only Awareness.
  assert.doesNotMatch(code, /resetAllProgress/);
  assert.match(handler, /presence_v3/);
  assert.match(handler, /DEFAULT_STATE/);
  // Without the reset stamp, sync-merge prefers the richer cloud slice and the
  // reset silently undoes itself on the next pull.
  assert.match(handler, /_resetAt/);
  assert.match(handler, /left untouched/);
});
