'use strict';

const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

const profileClient = fs.readFileSync(path.join(__dirname, '..', 'profile-client.js'), 'utf8');
const socialClient = fs.readFileSync(path.join(__dirname, '..', 'social-client.js'), 'utf8');
const presence = fs.readFileSync(path.join(__dirname, '..', 'presence.html'), 'utf8');
const server = fs.readFileSync(path.join(__dirname, '..', 'server.js'), 'utf8');

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

test('nested friend profiles warm their controls and reachable profile tabs before a tap', () => {
  assert.match(profileClient, /function warmFriendProfileExperience\(friend\)/);
  assert.match(profileClient, /warmFriendSocial\(friend\.userId\)/);
  assert.match(profileClient, /warmFollowLists\(friend\.userId\)/);
  assert.match(profileClient, /warmProfileActivity\(friend\.userId\)/);
  assert.match(profileClient, /loadChatList\(false\)/);
  assert.match(profileClient, /others\.forEach\(function\(other, index\)[\s\S]*?warmFriendProfileExperience\(other\)/);
  assert.match(socialClient, /function _fetchFriendSocial\(userId\)/);
  assert.match(socialClient, /var _friendSocialRequests = \{\}/);
  assert.match(socialClient, /_friendSocialRequests\[userId\]/);
  assert.match(socialClient, /_currentFriendProfile\.userId !== f\.userId/);
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

test('Lodge warms launch summaries without preloading message histories', () => {
  const warmStart = socialClient.indexOf('function warmLodgeExperience()');
  const warmEnd = socialClient.indexOf('var _lodgeWarmTimer', warmStart);
  const warmBody = socialClient.slice(warmStart, warmEnd);
  assert.match(socialClient, /function warmLodgeFeeds\(\)/);
  assert.match(socialClient, /function warmLodgeExperience\(\)[\s\S]*?warmLodgeFeeds\(\);[\s\S]*?loadChatList\(false\);[\s\S]*?loadLodgeNotifs\(\)/);
  assert.match(socialClient, /function scheduleLodgeWarmExperience\(\)[\s\S]*?650 \+ Math\.floor\(Math\.random\(\) \* 1350\)/);
  assert.match(socialClient, /window\.addEventListener\('presence:auth-ready', scheduleLodgeWarmExperience\)/);
  assert.match(socialClient, /var _lodgeNotifsPromise = null;[\s\S]*?Date\.now\(\) - _lodgeNotifsLoadedAt < 30000[\s\S]*?if \(_lodgeNotifsPromise\) return _lodgeNotifsPromise/);
  assert.match(socialClient, /renderLodgeFeed\(\);\s*if \(!document\.getElementById\('lodgeScreen'\)\.classList\.contains\('active'\)\) showScreen\('lodgeScreen'\)/);
  // One merged feed now (no type param, no per-tab warm).
  assert.match(socialClient, /api\/social\/feed\?sort=newest/);
  assert.match(socialClient, /_cacheLodgeFeed\(posts\)/);
  assert.doesNotMatch(socialClient, /_warmLodgeFeed/);
  assert.doesNotMatch(warmBody, /warmChatMessageThreads/);
  assert.match(socialClient, /var cachedMessages = _chatMessageCache\[convId\];/);
  assert.match(socialClient, /function _fetchChatMsgs\(convId\)/);
});

test('Messages warms recent threads only when the conversation list opens', () => {
  assert.match(server, /app\.get\('\/api\/social\/conversations\/messages\/batch', verifyToken/);
  assert.match(server, /participants:req\.user\.userId/);
  assert.match(server, /slice\(0, 8\)/);
  assert.match(socialClient, /function warmChatMessageThreads\(conversations\)/);
  assert.match(socialClient, /api\/social\/conversations\/messages\/batch\?conversationIds=/);
  assert.match(socialClient, /function openChatList\(\)[\s\S]*?warmChatMessageThreads\(_chatConversations\);[\s\S]*?loadChatList\(true\)\.then/);
  assert.match(socialClient, /var cachedMessages = _chatMessageCache\[convId\]/);
});

test('Lodge post taps open discussion while author taps open Profile', () => {
  assert.match(socialClient, /var _lodgeDetailPost = null/);
  assert.match(socialClient, /function openLodgePostDetail\(post, returnScreen, openComments\)/);
  assert.match(socialClient, /_lodgeDetailSnapshot = _lodgeSnapshotView\(\)/);
  assert.match(socialClient, /if \(uhead\) \{ _openLodgeProfile/);
  assert.match(socialClient, /openFriendProfile\(userId, 'lodgeScreen'\)/);
  assert.match(socialClient, /openOwnProfile\('lodgeScreen'\)/);
  assert.match(socialClient, /if \(closeLodgePostDetail\(\)\) return/);
  assert.match(socialClient, /if \(!lodgeScreen\.classList\.contains\('active'\)/);
});

test('Lodge merges reflections and essays into one post type with Read more truncation', () => {
  // No tab machinery left anywhere in the client.
  assert.doesNotMatch(socialClient, /switchLodgeTab|_lodgeTab|data-lodge-tab/);
  // Any post can carry a title and be truncated on the feed.
  assert.match(socialClient, /var LODGE_PREVIEW_LEN = 280/);
  assert.match(socialClient, /raw\.length > LODGE_PREVIEW_LEN/);
  assert.match(socialClient, /Read more →/);
  // The single composer posts a note (so it still sets the status) with a title.
  assert.match(socialClient, /function openLodgePostEditor\(\)/);
  assert.match(socialClient, /type: 'note', title: document\.getElementById\('blogTitleInput'\)\.value/);
});

test('Lodge posts expose compact Reddit-like actions and an expandable multiline discussion', () => {
  assert.match(socialClient, /data-lodge-like/);
  assert.match(socialClient, /class="lodge-act lodge-comment-trigger" data-lodge-comments/);
  assert.match(socialClient, /class="lodge-act lodge-share" data-lodge-share/);
  assert.match(socialClient, /class="lodge-discussion-line" data-lodge-discussion/);
  assert.match(socialClient, /data-lodge-discussion>Comment/);
  assert.match(socialClient, /toggleLodgeComments\(pid, card\); return;/);
  assert.match(socialClient, /<textarea class="lodge-cinput lodge-cinput--comment" maxlength="280" rows="4"/);
  assert.match(socialClient, /card\.querySelector\('\.lodge-crow--comment \.lodge-cinput'\)/);
  assert.match(profileClient, /function openFollowList/);
});

test('Lodge comment composer has intentional copy, hierarchy, and live character feedback', () => {
  assert.match(socialClient, /lodge-comment-composer__head/);
  assert.match(socialClient, /Write a comment/);
  assert.match(socialClient, /Add something thoughtful to the conversation/);
  assert.match(socialClient, /Post comment/);
  assert.match(socialClient, /data-comment-countdown/);
  assert.match(socialClient, /280 - e\.target\.value\.length/);
  assert.match(presence, /\.lodge-crow--comment:focus-within/);
  assert.match(presence, /\.lodge-comment-composer__foot/);
  assert.match(presence, /\.lodge-crow--comment \.lodge-csend/);
});

test('Lodge comments support validated threaded replies and specific deletion confirmation', () => {
  assert.match(server, /const COMMENT_MAX_DEPTH = 6/);
  assert.match(server, /Parent comment not found/);
  assert.match(server, /This comment can no longer receive replies/);
  assert.match(server, /blockedId:parent\.userId/);
  assert.match(server, /parentId: parent \? parent\._id\.toString\(\) : null/);
  assert.match(server, /notify\(parent\.userId, 'reply'/);
  assert.match(server, /tombstoned:!!hasReplies/);
  assert.match(socialClient, /function _lodgeCommentNodeHtml\(c, children, seen\)/);
  assert.match(socialClient, /class="lodge-comment-children"/);
  assert.match(socialClient, /data-comment-reply=/);
  assert.match(socialClient, /parentId:parentId \|\| null/);
  assert.match(socialClient, /'Delete your comment\?'/);
  assert.match(socialClient, /'Delete comment'/);
  assert.doesNotMatch(socialClient, /window\.confirm\('Delete this post\?'\)/);
  assert.match(presence, /\.lodge-comment-children \{[^}]*border-left/);
  assert.match(presence, /function showConfirm\(title, text, onConfirm, tone, actionLabel\)/);
});

test('Lodge comments are heartable, ranked within their thread, and eagerly loaded', () => {
  assert.match(server, /commentLikesCollection = db\.collection\('comment_likes'\)/);
  assert.match(server, /label: 'comment-likes\.comment-user'[\s\S]*?unique:true/);
  assert.match(server, /app\.post\('\/api\/social\/comments\/:id\/like', verifyToken, mutationRateLimit/);
  assert.match(server, /likedByMe: !c\.deleted && myCommentLikeIds\.has/);
  assert.match(server, /notify\(comment\.userId, 'comment_like'/);
  assert.match(socialClient, /data-comment-like=/);
  assert.match(socialClient, /function toggleLodgeCommentHeart\(cid, card\)/);
  assert.match(socialClient, /_lodgeCommentHeartRequests\[cid\] = pending/);
  assert.ok(
    socialClient.indexOf('_lodgeRenderComments(card, comments);', socialClient.indexOf('async function toggleLodgeCommentHeart'))
      < socialClient.indexOf("fetch(SERVER_URL + '/api/social/comments/' + cid + '/like'", socialClient.indexOf('async function toggleLodgeCommentHeart')),
    'comment hearts should paint optimistically before waiting for the network'
  );
  assert.match(socialClient, /showToast\('Couldn’t save heart'\)/);
  assert.match(socialClient, /Number\(b\.likeCount\)[\s\S]*?Number\(a\.likeCount\)/);
  assert.match(socialClient, /if \(card\) toggleLodgeComments\(post\.id, card, true\)/);
  assert.match(presence, /\.lodge-comment__heart\.liked/);
});

test('visible Lodge discussions warm in one bounded request and paint from memory', () => {
  assert.match(server, /app\.get\('\/api\/social\/comments\/batch', verifyToken/);
  assert.match(server, /slice\(0, 8\)/);
  assert.match(server, /decorateLodgeCommentsByPost\(allowedIds, req\.user\.userId\)/);
  assert.match(socialClient, /function warmLodgeCommentThreads\(posts\)/);
  assert.match(socialClient, /api\/social\/comments\/batch\?postIds=/);
  assert.match(socialClient, /var cached = _lodgeCommentCache\[pid\]/);
  assert.match(socialClient, /_lodgeRenderComments\(card, cached\.comments\)/);
  assert.ok(
    socialClient.indexOf('_lodgeRenderComments(card, cached.comments)')
      < socialClient.indexOf('_lodgeFetchCommentThread(pid).then', socialClient.indexOf('async function _lodgeLoadComments')),
    'cached comments should paint before the quiet refresh begins'
  );
});

test('Profiles expose posts and comments with scoped Lodge history routes', () => {
  assert.match(presence, /id="profPostsBtn"[\s\S]*?id="profCommentsBtn"/);
  assert.match(presence, /id="friendProfPostsBtn"[\s\S]*?id="friendProfCommentsBtn"/);
  assert.match(presence, /id="profileActivityScreen"/);
  assert.match(profileClient, /openProfileActivity\('me', authUsername \|\| 'you', 'posts', 'profileScreen'\)/);
  assert.match(profileClient, /openProfileActivity\(_currentFriendProfile\.userId, _currentFriendProfile\.username, 'comments', 'friendProfileScreen'\)/);
  assert.match(socialClient, /function openProfileActivity\(userId, username, tab, returnScreen\)/);
  assert.match(socialClient, /function warmProfileActivity\(userId\)/);
  assert.match(socialClient, /_profileActivityCache\[key\] = rows/);
  assert.match(socialClient, /_profileActivityRows = cached \? cached\.slice\(\) : \[\]/);
  assert.match(profileClient, /warmProfileActivity\('me'\)/);
  assert.match(profileClient, /warmProfileActivity\(f\.userId\)/);
  assert.match(server, /function resolveSocialHistoryTarget\(viewerId, requestedId\)/);
  assert.match(server, /app\.get\('\/api\/social\/users\/:id\/comments', verifyToken/);
  assert.match(server, /userId: \{ \$in: allowedOwnerIds, \$nin: \[\.\.\.hidden\] \}/);
});

test('friend-profile chat returns to that profile for Back and swipe-back', () => {
  assert.match(socialClient, /function chatThreadPreviousScreen\(\) \{\s*return _chatReturnFriendId \? 'friendProfileScreen' : 'chatListScreen';/);
  assert.match(socialClient, /function returnFromChatThread\(\)[\s\S]*?renderFriendProfile\(friend\);[\s\S]*?showScreen\('friendProfileScreen'\)/);
  assert.match(socialClient, /chatThreadBack'\)\.addEventListener\('click', returnFromChatThread\)/);
  assert.match(socialClient, /if \(canMessage\) loadChatList\(false\)/);
  assert.match(profileClient, /var _friendProfileReturnScreen = 'profileScreen'/);
  assert.match(profileClient, /function friendProfilePreviousScreen\(\)/);
  assert.match(profileClient, /active\.id !== 'friendProfileScreen' && active\.id !== 'chatThreadScreen'/);
});

test('Profile navigation remembers the screen that opened it', () => {
  assert.match(profileClient, /var _profileReturnScreen = 'homeScreen'/);
  assert.match(profileClient, /function profilePreviousScreen\(\)/);
  assert.match(profileClient, /function openOwnProfile\(returnScreenId\)/);
  assert.match(profileClient, /function openFriendProfile\(userId, returnScreenId\)/);
});
