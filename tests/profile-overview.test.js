'use strict';

const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

const profileClient = fs.readFileSync(path.join(__dirname, '..', 'profile-client.js'), 'utf8');
const server = fs.readFileSync(path.join(__dirname, '..', 'server.js'), 'utf8');
const html = fs.readFileSync(path.join(__dirname, '..', 'presence.html'), 'utf8');

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

test('friend profile header shows the accepted friendship date when available', () => {
  assert.match(profileClient, /document\.getElementById\('friendProfSince'\)/);
  assert.match(profileClient, /f\.friendedAt \? new Date\(f\.friendedAt\) : null/);
  assert.match(profileClient, /'Friends since ' \+ friendedDate\.toLocaleDateString/);
});

test('friend profile keeps the username in the top bar and shows the display name by the avatar', () => {
  assert.match(server, /displayName: otherUser\.displayName \|\| null/);
  assert.match(profileClient, /friendProfTopName'\)\.textContent = '@' \+ uname/);
  assert.match(profileClient, /friendProfName'\)\.textContent = displayName \|\| '@' \+ uname/);
});

test('new status composer starts blank and exposes only clear Cancel and Publish actions', () => {
  assert.match(profileClient, /ta\.value = '';/);
  assert.doesNotMatch(profileClient, /statusClearBtn/);
  assert.match(html, /<div class="status-ov__title">New Status<\/div>/);
  assert.match(html, /Share a new thought or some insight/);
  assert.match(html, /<textarea class="status-ov__ta" id="statusInput" maxlength="280"><\/textarea>/);
  assert.doesNotMatch(html, /id="statusClearBtn"/);
  assert.match(html, /status-ov__btn--cancel" id="statusCancelBtn"/);
});

test('profile trophy sections render earned items only and hide empty headers', () => {
  assert.match(html, /id="profBadgesSection"/);
  assert.match(html, /id="profAchievementsSection"/);
  assert.match(profileClient, /function profileMonthlyBestBadges\(earnedMap\)/);
  assert.match(profileClient, /earnedBadges = profileMonthlyBestBadges\(achState\.monthly\.earned\)/);
  assert.match(profileClient, /section\.style\.display = earnedBadges\.length \? '' : 'none'/);
  assert.match(profileClient, /if \(achState\.earned\[b\.id\]\) done\.push/);
  assert.match(profileClient, /section\.style\.display = picks\.length \? '' : 'none'/);
});

test('friend profile hides empty earned and friends-in-common sections', () => {
  assert.match(html, /id="friendProfSimilarSection"/);
  assert.match(html, /<span>Friends in Common<\/span>/);
  assert.match(server, /commonFriendIds: Array\.from\(commonByFriend\.get\(otherId\) \|\| \[\]\)/);
  assert.match(profileClient, /commonIds\.indexOf\(o\.userId\) !== -1/);
  assert.match(profileClient, /monthlyEarned = profileMonthlyBestBadges\(fMonthly\)/);
  assert.match(profileClient, /badgesSection\.style\.display = monthlyEarned\.length \? '' : 'none'/);
  assert.match(profileClient, /achSection\.style\.display = earnedAch\.length \? '' : 'none'/);
  assert.match(profileClient, /section\.style\.display = others\.length \? '' : 'none'/);
});
