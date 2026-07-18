'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ensureIndexes } = require('../database-startup');

test('index setup reports a failed index and continues with the remaining definitions', async () => {
  const attempted = [];
  const warnings = [];
  const collection = label => ({
    async createIndex(keys, options) {
      attempted.push({ label, keys, options });
      if (label === 'broken') throw new Error('duplicate legacy rows');
      return label + '_index';
    }
  });

  const failures = await ensureIndexes([
    { label: 'first', collection: collection('first'), keys: { userId: 1 } },
    { label: 'broken', collection: collection('broken'), keys: { endpoint: 1 }, options: { unique: true } },
    { label: 'last', collection: collection('last'), keys: { createdAt: -1 } }
  ], { warn: (event, fields) => warnings.push({ event, fields }) });

  assert.deepEqual(attempted.map(row => row.label), ['first', 'broken', 'last']);
  assert.equal(failures.length, 1);
  assert.equal(failures[0].index, 'broken');
  assert.deepEqual(failures[0].error, { name: 'Error', message: 'duplicate legacy rows' });
  assert.equal(warnings[0].event, 'database_index_unavailable');
});

test('server does not report persistence success after database helpers fail', () => {
  const server = fs.readFileSync(path.join(__dirname, '..', 'server.js'), 'utf8');
  const helpers = server.slice(
    server.indexOf('async function saveSub'),
    server.indexOf('// ── Cloud Sync Middleware')
  );
  assert.doesNotMatch(helpers, /catch\s*\(/);
  assert.match(server, /await saveSub\(newSub\);\s*subscriptions\.push\(newSub\)/);
  assert.match(server, /await deleteSub\(endpoint\);\s*subscriptions = subscriptions\.filter/);
  assert.match(server, /await savePrayerSchedule\(newSchedule\);\s*prayerSchedules\.push\(newSchedule\)/);
  assert.match(server, /await savePracticeSchedule\(newSchedule\);\s*practiceSchedules\.push\(newSchedule\)/);
  assert.match(server, /await saveSub\(next\);\s*Object\.assign\(sub, next\)/);
  assert.match(server, /await savePrayerSchedule\(next\);\s*Object\.assign\(existing, next\)/);
  assert.match(server, /await savePracticeSchedule\(next\);\s*Object\.assign\(existing, next\)/);
});

test('server reports index and migration failures through structured logging', () => {
  const server = fs.readFileSync(path.join(__dirname, '..', 'server.js'), 'utf8');
  assert.match(server, /await ensureIndexes\(\[/);
  assert.doesNotMatch(server, /createIndex\([^\n]+catch\s*\([^)]*\)\s*\{\s*\}/);
  assert.match(server, /database_migration_skipped/);
  assert.match(server, /migration: 'legacy-usernames'/);
  assert.match(server, /migration: 'friends-to-follows'/);
});
