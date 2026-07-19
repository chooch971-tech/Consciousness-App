'use strict';

const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

const profileClient = fs.readFileSync(path.join(__dirname, '..', 'profile-client.js'), 'utf8');
const socialClient = fs.readFileSync(path.join(__dirname, '..', 'social-client.js'), 'utf8');

test('friend-profile counts open that friend’s follower and following lists', () => {
  assert.match(profileClient, /var _followListUserId = 'me'/);
  assert.match(profileClient, /encodeURIComponent\(userId\) \+ '\/' \+ tab/);
  assert.match(socialClient, /openFollowList\('followers', f\.userId, f\.username/);
});

test('Message opens the thread immediately while the conversation request is pending', () => {
  const start = socialClient.indexOf('async function messageFriend');
  const end = socialClient.indexOf("document.getElementById('lodgeChats')", start);
  const body = socialClient.slice(start, end);

  assert.match(body, /_chatPendingFriendId = userId/);
  assert.match(body, /_chatReturnFriendId = userId/);
  assert.match(body, /_chatConversations\.find\(function\(c\) \{ return c\.userId === userId; \}\)/);
  assert.ok(body.indexOf("showScreen('chatThreadScreen')") < body.indexOf("fetch(SERVER_URL + '/api/social/conversations/open'"));
  assert.match(body, /Opening conversation/);
  assert.match(body, /_chatPendingFriendId !== userId/);
});

test('friend-profile chat returns to that profile for Back and swipe-back', () => {
  assert.match(socialClient, /function chatThreadPreviousScreen\(\) \{\s*return _chatReturnFriendId \? 'friendProfileScreen' : 'chatListScreen';/);
  assert.match(socialClient, /function returnFromChatThread\(\)[\s\S]*?renderFriendProfile\(friend\);[\s\S]*?showScreen\('friendProfileScreen'\)/);
  assert.match(socialClient, /chatThreadBack'\)\.addEventListener\('click', returnFromChatThread\)/);
  assert.match(socialClient, /if \(canMessage\) loadChatList\(false\)/);
});
