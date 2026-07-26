'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const server = fs.readFileSync(path.join(root, 'server.js'), 'utf8');
const presence = fs.readFileSync(path.join(root, 'presence.html'), 'utf8');
const settings = fs.readFileSync(path.join(root, 'settings-client.js'), 'utf8');

test('the drawer exposes Report a Bug directly below Donate', () => {
  const donate = presence.indexOf('id="drawerDonate"');
  const report = presence.indexOf('id="drawerBugReport"');
  const reset = presence.indexOf('id="drawerResetAll"');
  assert.notEqual(donate, -1);
  assert.ok(donate < report);
  assert.ok(report < reset);
});

test('the drawer header keeps Presence uncluttered and below the guide figure', () => {
  assert.match(presence, /\.drawer-guide-stage\s*\{[^}]*width:128px[^}]*height:120px[^}]*overflow:hidden/);
  assert.match(presence, /\.drawer-wordmark\s*\{[^}]*margin-top:12px/);
  assert.match(presence, /<div class="drawer-guide-stage">\s*<div id="drawerOmniaBtn">/);
  assert.match(presence, /<div class="drawer-wordmark">Presence<\/div>/);
  assert.doesNotMatch(presence, /drawerLevel|drawer-level/);
});

test('the bug form validates, submits technical context, and gives success feedback', () => {
  assert.match(presence, /id="bugReportScreen"/);
  assert.match(presence, /id="bugReportDescription"[^>]*maxlength="4000"[^>]*minlength="10"/);
  assert.doesNotMatch(presence, /Basic app, screen, and device-display details/);
  assert.match(settings, /fetch\(SERVER_URL \+ '\/api\/bug-reports'/);
  assert.match(settings, /if \(authToken\) headers\.Authorization = 'Bearer ' \+ authToken/);
  assert.match(settings, /viewport: window\.innerWidth \+ '×' \+ window\.innerHeight/);
  assert.match(settings, /Your bug report has been received/);
});

test('bug reports are bounded, durable, account-aware, and admin-readable', () => {
  assert.match(server, /bugReportsCollection = db\.collection\('bug_reports'\)/);
  assert.match(server, /app\.post\('\/api\/bug-reports', optionalVerifyToken, bugReportRateLimit/);
  assert.match(server, /BUG_REPORT_RATE_LIMIT = 5/);
  assert.match(server, /description\.length < 10/);
  assert.match(server, /sanitizeSocialText\(req\.body\.description, 4000\)/);
  assert.match(server, /status: 'open'/);
  assert.match(server, /app\.get\('\/api\/admin\/bug-reports', verifyAdmin/);
  assert.match(server, /bugReportsCollection\.find\(query\)\.sort\(\{ createdAt: -1 \}\)\.limit\(200\)/);
  assert.match(server, /bugReportsCollection\.deleteMany\(\{ reporterId: userId \}/);
});
