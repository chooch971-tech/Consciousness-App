'use strict';

const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

const profileClient = fs.readFileSync(path.join(__dirname, '..', 'profile-client.js'), 'utf8');
const server = fs.readFileSync(path.join(__dirname, '..', 'server.js'), 'utf8');

test('account and friend profiles use one shared overview renderer', () => {
  assert.match(profileClient, /function renderProfileOverview\(el, stats\)/);
  assert.match(profileClient, /renderProfileOverview\(document\.getElementById\('profOverview'\)/);
  assert.match(profileClient, /renderProfileOverview\(document\.getElementById\('friendProfOverview'\)/);
  assert.match(profileClient, /'Total Earned'/);
  assert.match(profileClient, /awarenessLevel: f\.awarenessLevel/);
  assert.match(profileClient, /awarenessXp: f\.awarenessXp/);
});

test('friends-list data includes the awareness progress needed by the shared overview', () => {
  assert.match(server, /awarenessLevel = v3\.level \|\| 1/);
  assert.match(server, /awarenessXp = v3\.xp \|\| 0/);
  assert.match(server, /streak, awarenessLevel, awarenessXp, concLevel, concXp/);
});
