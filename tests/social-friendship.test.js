'use strict';

const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

const server = fs.readFileSync(path.join(__dirname, '..', 'server.js'), 'utf8');

test('mutual follows persist one dated accepted friendship for the Friends screen', () => {
  const start = server.indexOf('async function recordMutualFriendship');
  const end = server.indexOf("app.post('/api/social/follow'", start);
  const body = server.slice(start, end);

  assert.notEqual(start, -1);
  assert.match(body, /friendsCollection\.findOne/);
  assert.match(body, /\$set: \{ status: 'accepted', acceptedAt: now \}/);
  assert.match(body, /\$setOnInsert: \{ userId: a, friendId: b, createdAt: now \}/);
  assert.match(body, /await recordMutualFriendship\(a, b\)/);
});
