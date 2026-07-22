'use strict';

const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

const achievements = fs.readFileSync(path.join(__dirname, '..', 'achievements-client.js'), 'utf8');
const profile = fs.readFileSync(path.join(__dirname, '..', 'profile-client.js'), 'utf8');

test('monthly achievement families have distinct semantic icons', () => {
  ['mlogin', 'mfifteen', 'mspend', 'mfriend'].forEach(function(group) {
    assert.match(achievements, new RegExp('\\n  ' + group + ": '<"));
  });
  assert.match(achievements, /gid === 'monthly' && badge && ACH_ICONS\[badge\.group\]/);
});

test('monthly badges select icons from their individual achievement data on every profile', () => {
  assert.match(achievements, /achIconSvg\(g\.id, b\)/);
  // Own profile earned + own profile pending (dimmed doorway) + friend profile.
  assert.equal((profile.match(/achIconSvg\('monthly', b\)/g) || []).length, 3);
});
