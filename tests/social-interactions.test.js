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

test('network tabs warm, cache, and refresh follower lists without a blank loading state', () => {
  assert.match(profileClient, /warmFollowLists\('me'\)/);
  assert.match(profileClient, /var FOLLOW_LIST_CACHE_KEY = 'presence_follow_list_cache_v1'/);
  assert.match(profileClient, /function getCachedFollowList\(userId, tab\)/);
  assert.match(profileClient, /rows\.innerHTML = cached \? _followListContentHtml\(tab, cached\) : _followListLoadingHtml\(\)/);
  assert.match(profileClient, /function _followListLoadingHtml\(\)/);
  assert.doesNotMatch(profileClient, /followListTitle|Your network/);
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

test('Lodge preloads both feed tabs and recent message threads while preserving client boundaries', () => {
  assert.match(socialClient, /function warmLodgeFeeds\(\)/);
  assert.match(socialClient, /_warmLodgeFeed\('note'\)/);
  assert.match(socialClient, /_warmLodgeFeed\('blog'\)/);
  assert.match(socialClient, /_lodgePosts = _lodgeCachedList\(\); _lodgeCursor = null; _lodgeLoading = !_lodgePosts\.length;/);
  assert.match(socialClient, /function warmChatMessages\(conversations\)/);
  assert.match(socialClient, /warmChatMessages\(_chatConversations\.slice\(0, 6\)\)/);
  assert.match(socialClient, /var cachedMessages = _chatMessageCache\[convId\];/);
  assert.match(socialClient, /function _fetchChatMsgs\(convId\)/);
});

test('Lodge user profiles paint known posts immediately while their full feed refreshes', () => {
  assert.match(socialClient, /var _lodgeUserPostsCache = \{\}/);
  assert.match(socialClient, /var visiblePosts = _lodgePosts\.filter\(function\(post\) \{ return post\.userId === userId; \}\);/);
  assert.match(socialClient, /var cachedPosts = _lodgeUserPostsCache\[userId\] \|\| visiblePosts;/);
  assert.match(socialClient, /_lodgePosts = cachedPosts\.slice\(\); _lodgeCursor = null; _lodgeLoading = !_lodgePosts\.length;/);
  assert.match(socialClient, /_lodgeUserPostsCache\[_lodgeUserFilter\.userId\] = _lodgePosts\.slice\(0, 20\)/);
});

test('Lodge feed supports directional tab swipes without colliding with edge back navigation', () => {
  assert.match(socialClient, /function switchLodgeTab\(tab\)/);
  assert.match(socialClient, /touch\.clientX <= 44/);
  assert.match(socialClient, /Math\.abs\(dx\) < 72 \|\| Math\.abs\(dx\) < Math\.abs\(dy\) \* 1\.5/);
  assert.match(socialClient, /_lodgeTab === 'note' && dx > 0\) switchLodgeTab\('blog'\)/);
  assert.match(socialClient, /_lodgeTab === 'blog' && dx < 0\) switchLodgeTab\('note'\)/);
});

test('Lodge posts expose a prominent comment action and multiline composer', () => {
  assert.match(socialClient, /class="lodge-comment-trigger" data-lodge-comments/);
  assert.match(socialClient, /<span>Comment<\/span>/);
  assert.match(socialClient, /<textarea class="lodge-cinput lodge-cinput--comment" maxlength="280" rows="4"/);
  assert.match(socialClient, /card\.querySelector\('\.lodge-cinput'\)/);
  assert.match(profileClient, /function openFollowList/);
});

test('friend-profile chat returns to that profile for Back and swipe-back', () => {
  assert.match(socialClient, /function chatThreadPreviousScreen\(\) \{\s*return _chatReturnFriendId \? 'friendProfileScreen' : 'chatListScreen';/);
  assert.match(socialClient, /function returnFromChatThread\(\)[\s\S]*?renderFriendProfile\(friend\);[\s\S]*?showScreen\('friendProfileScreen'\)/);
  assert.match(socialClient, /chatThreadBack'\)\.addEventListener\('click', returnFromChatThread\)/);
  assert.match(socialClient, /if \(canMessage\) loadChatList\(false\)/);
});
