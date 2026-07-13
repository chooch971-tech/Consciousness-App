'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const presence = fs.readFileSync(path.join(root, 'presence.html'), 'utf8');
const server = fs.readFileSync(path.join(root, 'server.js'), 'utf8');

test('production code does not ship the retired Bardon RPG', () => {
  assert.doesNotMatch(presence, /bardonScreen|drawerBardon|bardon_rpg_v2|BARDON GAME/);
  assert.doesNotMatch(server, /bardon_rpg_v2/);
});

test('browser loads the shared sync contract before app code', () => {
  const contractTag = presence.indexOf('<script src="sync-contract.js"></script>');
  const appUse = presence.indexOf('var PRESENCE_SYNC = window.PresenceSyncContract;');
  assert.notEqual(contractTag, -1);
  assert.notEqual(appUse, -1);
  assert.ok(contractTag < appUse);
});

test('server imports the shared sync allowlist instead of declaring another one', () => {
  assert.match(server, /require\('\.\/sync-contract'\)/);
  assert.match(server, /SYNC_KEYS\.forEach/);
  assert.doesNotMatch(server, /const\s+KEYS\s*=\s*\[\s*['"]presence_v3/);
});
