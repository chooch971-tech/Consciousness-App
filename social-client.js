// ── THE LODGE — social feed (Phase 1: posts, likes, comments) ──
// v3: Reflections and Essays merged into a single feed, so the cache is one
// list keyed only by nothing (newest sort only), not per-tab.
var LODGE_CACHE_KEY = 'presence_lodge_feed_v3';
var _lodgePosts = [];
var _lodgeCursor = null;
var _lodgeLoading = false;
var _lodgeSort = 'newest';
var _lodgeUserPostsCache = {};
var _lodgeDetailPost = null;
var _lodgeDetailSnapshot = null;
var _lodgeDetailReturnScreen = 'lodgeScreen';
var _lodgeWarmPromise = null;
var _lodgeCommentCache = {};
var _lodgeCommentRequests = {};
var _lodgeCommentHeartRequests = {};
var _lodgeCommentCacheOwner = null;

function _lodgeEnsureCommentCacheOwner() {
  var owner = authToken || null;
  if (_lodgeCommentCacheOwner === owner) return;
  _lodgeCommentCacheOwner = owner;
  _lodgeCommentCache = {};
  _lodgeCommentRequests = {};
  _lodgeCommentHeartRequests = {};
}
function _lodgeApplyPendingCommentHearts(comments) {
  (comments || []).forEach(function(comment) {
    var pending = comment && _lodgeCommentHeartRequests[comment.id];
    if (!pending) return;
    comment.likedByMe = pending.liked;
    comment.likeCount = pending.likeCount;
  });
  return comments;
}
function _lodgeStoreComments(postId, comments) {
  _lodgeEnsureCommentCacheOwner();
  _lodgeCommentCache[postId] = {
    comments:Array.isArray(comments) ? comments : [],
    fetchedAt:Date.now()
  };
}
function _lodgeFetchCommentThread(postId) {
  _lodgeEnsureCommentCacheOwner();
  if (_lodgeCommentRequests[postId]) return _lodgeCommentRequests[postId];
  var request = fetch(SERVER_URL + '/api/social/posts/' + postId + '/comments', {
    headers: { 'Authorization': 'Bearer ' + authToken }
  }).then(function(res) {
    return res.ok ? res.json() : null;
  }).then(function(data) {
    if (!data) return null;
    _lodgeStoreComments(postId, _lodgeApplyPendingCommentHearts(data.comments || []));
    return _lodgeCommentCache[postId].comments;
  }).catch(function() { return null; }).finally(function() {
    delete _lodgeCommentRequests[postId];
  });
  _lodgeCommentRequests[postId] = request;
  return request;
}
function warmLodgeCommentThreads(posts) {
  if (!authToken) return Promise.resolve({});
  _lodgeEnsureCommentCacheOwner();
  var ids = [];
  (posts || []).forEach(function(post) {
    if (!post || !post.id || ids.length >= 8 || _lodgeCommentCache[post.id] || _lodgeCommentRequests[post.id]) return;
    if (!(Number(post.commentCount) || 0)) {
      _lodgeStoreComments(post.id, []);
      return;
    }
    ids.push(post.id);
  });
  if (!ids.length) return Promise.resolve({});
  var batch = fetch(SERVER_URL + '/api/social/comments/batch?postIds=' + encodeURIComponent(ids.join(',')), {
    headers: { 'Authorization': 'Bearer ' + authToken }
  }).then(function(res) {
    return res.ok ? res.json() : null;
  }).then(function(data) {
    var byPost = data && data.commentsByPost;
    if (!byPost) return {};
    ids.forEach(function(id) { _lodgeStoreComments(id, byPost[id] || []); });
    return byPost;
  }).catch(function() { return {}; });
  ids.forEach(function(id) {
    var threadRequest = batch.then(function(byPost) { return (byPost && byPost[id]) || null; });
    _lodgeCommentRequests[id] = threadRequest;
    threadRequest.finally(function() {
      if (_lodgeCommentRequests[id] === threadRequest) delete _lodgeCommentRequests[id];
    });
  });
  return batch;
}

function _lodgeCachedList() {
  if (_lodgeSort !== 'newest') return [];
  try { var a = JSON.parse(localStorage.getItem(LODGE_CACHE_KEY)); return Array.isArray(a) ? a : []; } catch(e) { return []; }
}
function _cacheLodgeFeed(posts) {
  try { localStorage.setItem(LODGE_CACHE_KEY, JSON.stringify((posts || []).slice(0, 20))); } catch(e) {}
}
function warmLodgeFeeds() {
  if (!authToken) return Promise.resolve([]);
  var cached = _lodgeCachedList();
  if (cached.length) return Promise.resolve(cached);
  if (_lodgeWarmPromise) return _lodgeWarmPromise;
  _lodgeWarmPromise = fetch(SERVER_URL + '/api/social/feed?sort=newest', { headers: { 'Authorization': 'Bearer ' + authToken } })
    .then(function(res) { return res.ok ? res.json() : null; })
    .then(function(data) {
      var posts = data && Array.isArray(data.posts) ? data.posts : [];
      if (posts.length) _cacheLodgeFeed(posts);
      // If the Lodge was opened while its warm request was in flight, paint
      // the result now rather than leaving a skeleton for a second request.
      if (!_lodgeUserFilter && _lodgeSort === 'newest' && !_lodgePosts.length && posts.length) {
        _lodgePosts = posts.slice();
        _lodgeLoading = false;
        if (document.getElementById('lodgeScreen').classList.contains('active')) renderLodgeFeed();
      }
      return posts;
    })
    .catch(function() { return []; })
    .finally(function() { _lodgeWarmPromise = null; });
  return _lodgeWarmPromise;
}

var _lodgeUserFilter = null; // {userId, username} → viewing one practitioner's posts
var _lodgeSearchActive = false;
var _lodgeSearchQuery = '';
var _lodgeSearchDebounce = null;
function _lodgeSetSortUi() {
  document.querySelectorAll('#lodgeSort [data-lodge-sort]').forEach(function(btn) {
    var on = btn.getAttribute('data-lodge-sort') === _lodgeSort;
    btn.classList.toggle('on', on);
    btn.setAttribute('aria-checked', on ? 'true' : 'false');
  });
  var filter = document.getElementById('lodgeSortBtn');
  if (filter) {
    var labels = { newest:'Newest', liked:'Most liked', commented:'Most commented', hot:'Hot', controversial:'Controversial' };
    filter.classList.toggle('active', _lodgeSort !== 'newest');
    filter.setAttribute('aria-label', 'Sort posts: ' + (labels[_lodgeSort] || 'Newest'));
    filter.title = 'Sort posts: ' + (labels[_lodgeSort] || 'Newest');
    var chipLabel = document.getElementById('lodgeSortLabel');
    if (chipLabel) chipLabel.textContent = labels[_lodgeSort] || 'Newest';
  }
}
function _lodgeCloseSortMenu() {
  var menu = document.getElementById('lodgeSort');
  var btn = document.getElementById('lodgeSortBtn');
  if (menu) menu.style.display = 'none';
  if (btn) btn.setAttribute('aria-expanded', 'false');
}
function openLodge() {
  _lodgeDetailPost = null;
  _lodgeDetailSnapshot = null;
  _lodgeDetailReturnScreen = 'lodgeScreen';
  _lodgeUserFilter = null;
  var titleEl = document.getElementById('lodgeTitle');
  titleEl.textContent = '';
  document.getElementById('lodgeProfileLink').style.display = 'none';
  document.getElementById('lodgeComposer').style.display = '';
  document.getElementById('lodgeBanner').style.display = '';
  document.getElementById('lodgeFeedNav').style.display = '';
  _lodgeCloseSortMenu();
  _lodgeSetSortUi();
  // Paint the current cache before the Lodge becomes visible, so its entry
  // animation never exposes an empty feed while the refresh is in flight.
  _lodgePosts = _lodgeCachedList();
  _lodgeLoading = !_lodgePosts.length;
  renderLodgeFeed();
  if (!document.getElementById('lodgeScreen').classList.contains('active')) showScreen('lodgeScreen');
  warmLodgeCommentThreads(_lodgePosts);
  loadLodgeFeed();
  warmLodgeFeeds();
  loadLodgeNotifs();
  loadChatList(false);
}

// One practitioner's full post history on its own page.
function openLodgeUser(userId, username) {
  // A post tap already gives us at least one of this person's entries. Paint
  // it straight away instead of replacing the feed with skeletons, then let
  // the complete profile feed arrive in the background. Repeat visits reuse
  // the complete in-memory result for an instant profile view.
  var visiblePosts = _lodgePosts.filter(function(post) { return post.userId === userId; });
  var cachedPosts = _lodgeUserPostsCache[userId] || visiblePosts;
  var knownPost = cachedPosts[0] || visiblePosts[0] || {};
  _lodgeUserFilter = {
    userId: userId,
    username: username,
    profilePic: knownPost.profilePic || (_friendProfileCache[userId] && _friendProfileCache[userId].profilePic) || '',
    isMine: !!knownPost.mine || (!!authUsername && String(username || '').toLowerCase() === String(authUsername).toLowerCase())
  };
  // The first tap always opens this person's writing. The second, explicit
  // avatar/header tap is the intentional route into a richer Profile.
  document.getElementById('lodgeTitle').textContent = '';
  var profileLink = document.getElementById('lodgeProfileLink');
  document.getElementById('lodgeProfileRing').innerHTML = _lodgeRingHtml(username, _lodgeUserFilter.profilePic);
  document.getElementById('lodgeProfileName').textContent = '@' + username;
  profileLink.style.display = 'flex';
  document.getElementById('lodgeComposer').style.display = 'none';
  document.getElementById('lodgeBanner').style.display = 'none';
  document.getElementById('lodgeFeedNav').style.display = 'none';
  _lodgeCloseSortMenu();
  if (!document.getElementById('lodgeScreen').classList.contains('active')) showScreen('lodgeScreen');
  _lodgePosts = cachedPosts.slice(); _lodgeCursor = null; _lodgeLoading = !_lodgePosts.length;
  renderLodgeFeed();
  loadLodgeFeed();
}

async function loadLodgeFeed(cursor) {
  if (!authToken) { _lodgePosts = []; _lodgeLoading = false; renderLodgeFeed(); return; }
  if (!cursor && !_lodgePosts.length) { _lodgeLoading = true; renderLodgeFeed(); }
  try {
    var params = [];
    if (!_lodgeUserFilter) params.push('sort=' + encodeURIComponent(_lodgeSort));
    if (cursor) params.push('cursor=' + encodeURIComponent(cursor));
    var base = _lodgeUserFilter
      ? SERVER_URL + '/api/social/users/' + encodeURIComponent(_lodgeUserFilter.userId) + '/posts'
      : SERVER_URL + '/api/social/feed';
    var url = base + (params.length ? '?' + params.join('&') : '');
    var res = await fetch(url, { headers: { 'Authorization': 'Bearer ' + authToken } });
    if (!res.ok) return;
    var data = await res.json();
    var posts = (data && data.posts) || [];
    _lodgePosts = cursor ? _lodgePosts.concat(posts) : posts;
    _lodgeCursor = Object.prototype.hasOwnProperty.call(data, 'nextCursor')
      ? data.nextCursor
      : (posts.length === 20 ? posts[posts.length - 1].createdAt : null);
    if (!cursor && _lodgeUserFilter) _lodgeUserPostsCache[_lodgeUserFilter.userId] = _lodgePosts.slice(0, 20);
    else if (!cursor && _lodgeSort === 'newest') _cacheLodgeFeed(_lodgePosts);
    warmLodgeCommentThreads(posts);
  } catch(e) { console.warn('Lodge feed failed', e); }
  finally { _lodgeLoading = false; renderLodgeFeed(); }
}

// ── Search: filters the same feed (you + accounts you follow) by text/title.
// Reuses the normal feed container and its delegated click handler, so like/
// comment/report/tap-author all work on results with no extra wiring.
function openLodgeSearch() {
  if (_lodgeUserFilter) openLodge();
  _lodgeSearchActive = true;
  _lodgeSearchQuery = '';
  document.getElementById('lodgeSearchBtn').classList.add('active');
  document.getElementById('lodgeSearchBar').style.display = '';
  document.getElementById('lodgeComposer').style.display = 'none';
  document.getElementById('lodgeBanner').style.display = 'none';
  document.getElementById('lodgeFeedNav').style.display = 'none';
  var input = document.getElementById('lodgeSearchInput');
  input.value = '';
  _lodgePosts = []; _lodgeCursor = null; _lodgeLoading = false;
  renderLodgeFeed();
  setTimeout(function() { try { input.focus(); } catch(e) {} }, 50);
}
function closeLodgeSearch() {
  _lodgeSearchActive = false;
  _lodgeSearchQuery = '';
  clearTimeout(_lodgeSearchDebounce);
  document.getElementById('lodgeSearchBtn').classList.remove('active');
  document.getElementById('lodgeSearchBar').style.display = 'none';
  openLodge();
}
async function runLodgeSearch(query) {
  _lodgeSearchQuery = query;
  if (!query) { _lodgePosts = []; _lodgeCursor = null; _lodgeLoading = false; renderLodgeFeed(); return; }
  _lodgeLoading = true; renderLodgeFeed();
  try {
    var res = await fetch(SERVER_URL + '/api/social/search?q=' + encodeURIComponent(query), {
      headers: { 'Authorization': 'Bearer ' + authToken }
    });
    var data = res.ok ? await res.json() : null;
    // A newer query may have landed while this was in flight — don't let a
    // stale response clobber it.
    if (query !== _lodgeSearchQuery) return;
    _lodgePosts = (data && data.posts) || [];
    _lodgeCursor = null;
  } catch(e) { if (query === _lodgeSearchQuery) _lodgePosts = []; }
  finally { if (query === _lodgeSearchQuery) { _lodgeLoading = false; renderLodgeFeed(); } }
}

// Deterministic per-user accent: hash the username into a small palette so
// every practitioner gets a stable ring gradient + name tint across surfaces.
var LODGE_HUES = [['#9ed8c4','#7eb8a4'],['#e8c87a','#d4956e'],['#b58ed8','#8e6ec4'],['#7ec4d8','#5e9ec0'],['#e89e9e','#c47a7a'],['#a8d88e','#7eb87e']];
function _lodgeHue(name) {
  var h = 0; name = String(name || '');
  for (var i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return LODGE_HUES[h % LODGE_HUES.length];
}
function _lodgeRingHtml(username, profilePic) {
  var pic = safeProfilePic(profilePic);
  if (pic) return '<div class="lodge-post__ring" style="background-image:url(\'' + pic + '\');color:transparent;"></div>';
  var hue = _lodgeHue(username);
  return '<div class="lodge-post__ring" style="background:linear-gradient(135deg,' + hue[0] + ',' + hue[1] + ');">' + escHtml(String(username || '?')[0].toUpperCase()) + '</div>';
}
// Reflections and essays are one post type now: any post may carry an optional
// title and any length. On the feed, posts over LODGE_PREVIEW_LEN chars show a
// preview with a "Read more →" affordance that opens the discussion view.
var LODGE_PREVIEW_LEN = 280;
function _lodgePostHtml(p, detail) {
  var hue = _lodgeHue(p.username);
  var titleHtml = p.title ? '<div class="lodge-blog-title">' + escHtml(p.title) + '</div>' : '';
  var raw = p.text || '';
  var bodyHtml;
  if (!detail && raw.length > LODGE_PREVIEW_LEN) {
    bodyHtml = titleHtml
      + '<div class="lodge-post__text" data-blog-preview>' + escHtml(raw.slice(0, LODGE_PREVIEW_LEN)) + '…</div>'
      + '<div class="lodge-post__text" data-blog-full style="display:none;">' + escHtml(raw) + '</div>'
      + '<button class="lodge-act lodge-read-more" data-lodge-open-post>Read more →</button>';
  } else {
    bodyHtml = titleHtml + '<div class="lodge-post__text">' + escHtml(raw) + '</div>';
  }
  return '<article class="lodge-post' + (detail ? ' lodge-post--detail' : '') + '" data-post-id="' + escHtml(p.id) + '" style="--lodge-hue:' + hue[0] + ';">'
    + '<div class="lodge-post__head">'
    + '<div style="display:flex;align-items:center;gap:11px;min-width:0;flex:1;cursor:pointer;" data-lodge-user="' + escHtml(p.userId) + '" data-lodge-uname="' + escHtml(p.username || '?') + '">'
    + _lodgeRingHtml(p.username, p.profilePic)
    + '<div class="lodge-post__identity"><div class="lodge-post__name">@' + escHtml(p.username || '?') + '</div>'
    + '<div class="lodge-post__time">' + timeAgo(new Date(p.createdAt)) + '</div></div></div>'
    + '</div>'
    + '<div class="lodge-post__body" data-lodge-open-post>' + bodyHtml + '</div>'
    + '<div class="lodge-post__bar">'
    + '<button class="lodge-act lodge-post__vote' + (p.likedByMe ? ' liked' : '') + '" data-lodge-like aria-label="Like post">' + (p.likedByMe ? '♥' : '♡')
    + ' <span data-like-count>' + (p.likeCount || 0) + '</span></button>'
    + '<button class="lodge-act lodge-comment-trigger" data-lodge-comments aria-label="Open comments">◌ <span data-comment-count>' + (p.commentCount || 0) + '</span></button>'
    + '<button class="lodge-act lodge-share" data-lodge-share aria-label="Share post">↗ <span>Share</span></button>'
    + (p.mine ? '<button class="lodge-act lodge-del" data-lodge-del aria-label="Delete post">✕</button>'
    : '<button class="lodge-act lodge-del" data-lodge-report aria-label="Report post">⚑</button>')
    + '</div>'
    + (detail ? '<button class="lodge-discussion-line" data-lodge-discussion>Comment <span>⌄</span></button>' : '')
    + '<div class="lodge-comments"><div data-comment-list></div>'
    + '<div class="lodge-comment-composer lodge-crow--comment">'
    + '<div class="lodge-comment-composer__head"><span><i>✦</i> Write a comment</span><span data-comment-countdown>280 left</span></div>'
    + '<textarea class="lodge-cinput lodge-cinput--comment" maxlength="280" rows="4" aria-label="Write a comment" placeholder="Add something thoughtful to the conversation…"></textarea>'
    + '<div class="lodge-comment-composer__foot"><span>Your response will appear in this discussion.</span>'
    + '<button class="lodge-csend" type="button"><span>Post comment</span><b aria-hidden="true">→</b></button></div></div>'
    + '</div></article>';
}

function renderLodgeFeed() {
  var feed = document.getElementById('lodgeFeed');
  var empty = document.getElementById('lodgeEmpty');
  var more = document.getElementById('lodgeMore');
  if (!feed) return;
  feed.innerHTML = _lodgeDetailPost ? _lodgePostHtml(_lodgeDetailPost, true) : _lodgeLoading && !_lodgePosts.length
    ? '<div class="lodge-skeleton"></div><div class="lodge-skeleton"></div><div class="lodge-skeleton"></div>'
    : _lodgePosts.map(function(post) { return _lodgePostHtml(post, false); }).join('');
  var emptyTitle = _lodgeSearchActive ? (_lodgeSearchQuery ? 'No matches' : 'Search the Lodge')
    : _lodgeUserFilter ? 'No shared writing yet' : 'The record is waiting';
  var emptySub = _lodgeSearchActive ? (_lodgeSearchQuery ? 'Nothing found for “' + escHtml(_lodgeSearchQuery) + '.”' : 'Search your own writing and everyone you follow.')
    : _lodgeUserFilter ? 'This practitioner has not published anything here.'
    : 'Share a reflection above, or follow practitioners to bring their writing into your Lodge.';
  empty.innerHTML = '<div class="lodge-empty__mark">✒</div><div class="lodge-empty__title">' + emptyTitle + '</div><div class="lodge-empty__sub">' + emptySub + '</div>';
  empty.style.display = (!_lodgeDetailPost && !_lodgeLoading && !_lodgePosts.length) ? '' : 'none';
  more.style.display = (!_lodgeDetailPost && !_lodgeLoading && _lodgeCursor) ? '' : 'none';
}

function _lodgeCommentNodeHtml(c, children, seen) {
  if (!c || seen[c.id]) return '';
  seen[c.id] = true;
  var deleted = !!c.deleted;
  var author = deleted
    ? '<span class="lodge-comment__deleted-author">deleted</span>'
    : '<span style="color:' + _lodgeHue(c.username)[0] + ';opacity:.8;cursor:pointer;" data-lodge-user="' + escHtml(c.userId) + '" data-lodge-uname="' + escHtml(c.username || '?') + '">@' + escHtml(c.username || '?') + '</span>';
  var actions = deleted ? '' : '<div class="lodge-comment__actions">'
    + '<button class="lodge-comment__action lodge-comment__heart' + (c.likedByMe ? ' liked' : '') + '" data-comment-like="' + escHtml(c.id) + '" aria-label="Heart comment" aria-pressed="' + (c.likedByMe ? 'true' : 'false') + '">'
    + (c.likedByMe ? '♥' : '♡') + ' <span>' + (Number(c.likeCount) || 0) + '</span></button>'
    + '<button class="lodge-comment__action" data-comment-reply="' + escHtml(c.id) + '" data-comment-uname="' + escHtml(c.username || '?') + '">Reply</button>'
    + (c.mine ? '<button class="lodge-comment__action lodge-comment__action--delete" data-comment-del="' + escHtml(c.id) + '">Delete</button>' : '')
    + '</div>';
  var replies = (children[c.id] || []).map(function(reply) {
    return _lodgeCommentNodeHtml(reply, children, seen);
  }).join('');
  return '<div class="lodge-comment-thread" data-comment-thread="' + escHtml(c.id) + '">'
    + '<div class="lodge-comment' + (deleted ? ' lodge-comment--deleted' : '') + '" data-comment-id="' + escHtml(c.id) + '">'
    + '<div class="lodge-comment__name">' + author + ' · ' + timeAgo(new Date(c.createdAt)) + '</div>'
    + '<div class="lodge-comment__text">' + (deleted ? 'Comment deleted' : escHtml(c.text || '')) + '</div>'
    + actions + '</div>'
    + (replies ? '<div class="lodge-comment-children">' + replies + '</div>' : '')
    + '</div>';
}

function _lodgeRenderComments(card, comments) {
  comments = Array.isArray(comments) ? comments : [];
  card._lodgeComments = comments;
  var byId = {};
  var children = {};
  comments.forEach(function(c) { if (c && c.id) byId[c.id] = c; });
  comments.forEach(function(c) {
    var parent = c && c.parentId && byId[c.parentId] ? c.parentId : '';
    (children[parent] || (children[parent] = [])).push(c);
  });
  Object.keys(children).forEach(function(parentId) {
    children[parentId].sort(function(a, b) {
      var hearts = (Number(b.likeCount) || 0) - (Number(a.likeCount) || 0);
      if (hearts) return hearts;
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });
  });
  var seen = {};
  var html = (children[''] || []).map(function(c) {
    return _lodgeCommentNodeHtml(c, children, seen);
  }).join('');
  // Legacy/corrupt orphan rows still remain readable instead of disappearing.
  comments.forEach(function(c) {
    if (c && !seen[c.id]) html += _lodgeCommentNodeHtml(c, children, seen);
  });
  card.querySelector('[data-comment-list]').innerHTML = html
    || '<div class="lodge-comment-empty">No comments yet. Start the discussion.</div>';
}

async function _lodgeLoadComments(pid, card) {
  var list = card.querySelector('[data-comment-list]');
  _lodgeEnsureCommentCacheOwner();
  var cached = _lodgeCommentCache[pid];
  if (cached) {
    _lodgeRenderComments(card, cached.comments);
    // Keep a warm thread current without making the already-painted discussion
    // wait. This quietly incorporates comments made on another device.
    _lodgeFetchCommentThread(pid).then(function(comments) {
      if (comments && card.isConnected && card.getAttribute('data-post-id') === pid) {
        _lodgeRenderComments(card, comments);
      }
    });
    return;
  }
  list.innerHTML = '<div class="lodge-comment__name">Preparing discussion…</div>';
  var comments = await _lodgeFetchCommentThread(pid);
  _lodgeRenderComments(card, comments || []);
}

function openLodgeReplyComposer(card, commentId, username) {
  var prior = card.querySelector('.lodge-reply-composer');
  if (prior) prior.remove();
  var comment = card.querySelector('[data-comment-id="' + commentId + '"]');
  if (!comment) return;
  comment.insertAdjacentHTML('beforeend',
    '<div class="lodge-reply-composer" data-reply-parent="' + escHtml(commentId) + '">'
    + '<div class="lodge-reply-composer__label">Replying to @' + escHtml(username || 'practitioner') + '</div>'
    + '<textarea class="lodge-cinput lodge-reply-input" maxlength="280" rows="3" placeholder="Write a reply…"></textarea>'
    + '<div class="lodge-reply-composer__actions"><button class="lodge-comment__action" data-reply-cancel>Cancel</button>'
    + '<button class="lodge-csend lodge-reply-send" data-reply-send>Reply</button></div></div>');
  var input = comment.querySelector('.lodge-reply-input');
  if (input) input.focus();
}

function _lodgeFindPost(pid) {
  if (_lodgeDetailPost && _lodgeDetailPost.id === pid) return _lodgeDetailPost;
  return _lodgePosts.find(function(post) { return post.id === pid; }) || null;
}

function _lodgeSnapshotView() {
  return {
    posts: _lodgePosts.slice(), cursor: _lodgeCursor, loading: _lodgeLoading,
    userFilter: _lodgeUserFilter, searchActive: _lodgeSearchActive, searchQuery: _lodgeSearchQuery,
    title: document.getElementById('lodgeTitle').textContent,
    profileDisplay: document.getElementById('lodgeProfileLink').style.display,
    profileRing: document.getElementById('lodgeProfileRing').innerHTML,
    profileName: document.getElementById('lodgeProfileName').textContent,
    composerDisplay: document.getElementById('lodgeComposer').style.display,
    bannerDisplay: document.getElementById('lodgeBanner').style.display,
    navDisplay: document.getElementById('lodgeFeedNav').style.display,
    searchDisplay: document.getElementById('lodgeSearchBar').style.display,
    scrollTop: document.getElementById('lodgeBody').scrollTop
  };
}

// Reddit-style continuous motion: instead of the discussion view cutting in,
// the tapped card glides from its spot in the feed up to its detail position
// (and glides back down on close). Classic FLIP — measure the card before the
// re-render, re-render, then transition away the positional difference.
function _lodgeFlipCard(firstRect, targetCard) {
  if (!firstRect || !targetCard) return;
  try { if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return; } catch(e) {}
  var dy = firstRect.top - targetCard.getBoundingClientRect().top;
  if (Math.abs(dy) < 3) return;
  targetCard.style.transition = 'none';
  targetCard.style.transform = 'translateY(' + dy + 'px)';
  requestAnimationFrame(function() {
    requestAnimationFrame(function() {
      targetCard.style.transition = 'transform .3s cubic-bezier(.22,.9,.32,1)';
      targetCard.style.transform = '';
      setTimeout(function() { targetCard.style.transition = ''; }, 380);
    });
  });
}

function openLodgePostDetail(post, returnScreen, openComments) {
  if (!post) return;
  var from = returnScreen || (document.querySelector('.screen.active') || {}).id || 'lodgeScreen';
  var fromCard = from === 'lodgeScreen'
    ? document.querySelector('#lodgeFeed .lodge-post[data-post-id="' + post.id + '"]') : null;
  var firstRect = fromCard ? fromCard.getBoundingClientRect() : null;
  if (from === 'lodgeScreen' && !_lodgeDetailPost) _lodgeDetailSnapshot = _lodgeSnapshotView();
  _lodgeDetailReturnScreen = from;
  _lodgeDetailPost = post;
  document.getElementById('lodgeTitle').textContent = '';
  document.getElementById('lodgeProfileLink').style.display = 'none';
  document.getElementById('lodgeComposer').style.display = 'none';
  document.getElementById('lodgeBanner').style.display = 'none';
  document.getElementById('lodgeFeedNav').style.display = 'none';
  document.getElementById('lodgeSearchBar').style.display = 'none';
  _lodgeCloseSortMenu();
  renderLodgeFeed();
  showScreen('lodgeScreen');
  document.getElementById('lodgeBody').scrollTop = 0;
  var card = document.querySelector('#lodgeFeed .lodge-post');
  _lodgeFlipCard(firstRect, card);
  // A post detail is the discussion: load its comments immediately rather
  // than requiring a second tap on the discussion line.
  if (card) toggleLodgeComments(post.id, card, true);
}

function closeLodgePostDetail() {
  if (!_lodgeDetailPost) return false;
  var returnScreen = _lodgeDetailReturnScreen;
  var closingPid = _lodgeDetailPost.id;
  var detailCard = document.querySelector('#lodgeFeed .lodge-post');
  var detailRect = detailCard ? detailCard.getBoundingClientRect() : null;
  _lodgeDetailPost = null;
  if (returnScreen !== 'lodgeScreen') {
    _lodgeDetailSnapshot = null;
    _lodgeDetailReturnScreen = 'lodgeScreen';
    showScreen(returnScreen);
    return true;
  }
  var snap = _lodgeDetailSnapshot;
  _lodgeDetailSnapshot = null;
  _lodgeDetailReturnScreen = 'lodgeScreen';
  if (!snap) { openLodge(); return true; }
  _lodgePosts = snap.posts; _lodgeCursor = snap.cursor; _lodgeLoading = snap.loading;
  _lodgeUserFilter = snap.userFilter; _lodgeSearchActive = snap.searchActive; _lodgeSearchQuery = snap.searchQuery;
  document.getElementById('lodgeTitle').textContent = snap.title;
  document.getElementById('lodgeProfileLink').style.display = snap.profileDisplay;
  document.getElementById('lodgeProfileRing').innerHTML = snap.profileRing;
  document.getElementById('lodgeProfileName').textContent = snap.profileName;
  document.getElementById('lodgeComposer').style.display = snap.composerDisplay;
  document.getElementById('lodgeBanner').style.display = snap.bannerDisplay;
  document.getElementById('lodgeFeedNav').style.display = snap.navDisplay;
  document.getElementById('lodgeSearchBar').style.display = snap.searchDisplay;
  renderLodgeFeed();
  document.getElementById('lodgeBody').scrollTop = snap.scrollTop;
  // Glide the card back down to its place in the restored feed.
  _lodgeFlipCard(detailRect, document.querySelector('#lodgeFeed .lodge-post[data-post-id="' + closingPid + '"]'));
  return true;
}

// Avatar/name taps are explicit Profile navigation. Cache the identity already
// present on the post so even a first visit paints immediately.
function _openLodgeProfile(userId, username, post) {
  var isMine = !!(post && post.mine) || (!!authUsername && String(username || '').toLowerCase() === String(authUsername).toLowerCase());
  if (isMine) {
    if (typeof openOwnProfile === 'function') openOwnProfile('lodgeScreen');
    else { if (typeof renderProfile === 'function') renderProfile(); showScreen('profileScreen'); }
    return;
  }
  var known = (typeof _friendProfileCache !== 'undefined' && _friendProfileCache[userId]) || {};
  known.userId = userId;
  known.username = username || known.username || 'practitioner';
  if (post && post.profilePic) known.profilePic = post.profilePic;
  if (typeof _friendProfileCache !== 'undefined') _friendProfileCache[userId] = known;
  if (typeof openFriendProfile === 'function') openFriendProfile(userId, 'lodgeScreen');
}

function openLodgeUserProfile() {
  var user = _lodgeUserFilter;
  if (!user) return;
  if (user.isMine) {
    if (typeof openOwnProfile === 'function') openOwnProfile('lodgeScreen');
    else { if (typeof renderProfile === 'function') renderProfile(); showScreen('profileScreen'); }
    return;
  }
  if (_friendProfileCache[user.userId]) {
    openFriendProfile(user.userId, 'lodgeScreen');
    return;
  }
  showToast('Follow this practitioner to view their full Profile');
}

async function toggleLodgeLike(pid, card) {
  try {
    var res = await fetch(SERVER_URL + '/api/social/posts/' + pid + '/like', {
      method: 'POST', headers: { 'Authorization': 'Bearer ' + authToken }
    });
    if (!res.ok) return;
    var d = await res.json();
    var btn = card.querySelector('[data-lodge-like]');
    btn.classList.toggle('liked', !!d.liked);
    btn.childNodes[0].textContent = (d.liked ? '♥' : '♡') + ' ';
    card.querySelector('[data-like-count]').textContent = d.likeCount;
    var p = _lodgePosts.find(function(x) { return x.id === pid; });
    if (p) { p.likedByMe = !!d.liked; p.likeCount = d.likeCount; }
    if (_lodgeDetailPost && _lodgeDetailPost.id === pid) {
      _lodgeDetailPost.likedByMe = !!d.liked;
      _lodgeDetailPost.likeCount = d.likeCount;
    }
  } catch(e) {}
}

async function openLikers(pid) {
  var ov = document.getElementById('likersOverlay');
  var list = document.getElementById('likersList');
  list.innerHTML = '<div class="likers-row private">Loading…</div>';
  ov.classList.add('on');
  try {
    var res = await fetch(SERVER_URL + '/api/social/posts/' + pid + '/likers', {
      headers: { 'Authorization': 'Bearer ' + authToken }
    });
    var d = await res.json();
    var rows = (d.likers || []).map(function(l) {
      return l.private
        ? '<div class="likers-row private">a private practitioner</div>'
        : '<div class="likers-row">@' + escHtml(l.username) + '</div>';
    });
    list.innerHTML = rows.length ? rows.join('') : '<div class="likers-row private">No likes yet.</div>';
  } catch(e) { list.innerHTML = '<div class="likers-row private">Couldn’t load.</div>'; }
}

async function toggleLodgeComments(pid, card, forceOpen) {
  var box = card.querySelector('.lodge-comments');
  var open = box.style.display === 'block';
  box.style.display = (open && !forceOpen) ? 'none' : 'block';
  card.classList.toggle('comments-open', !(open && !forceOpen));
  if (open) return;
  await _lodgeLoadComments(pid, card);
}

async function shareLodgePost(post) {
  if (!post) return;
  var text = (post.title ? post.title + '\n\n' : '') + (post.text || '');
  var shareData = { title: post.title || 'A post from the Lodge', text: '@' + (post.username || 'practitioner') + ': ' + text, url: window.location.origin + window.location.pathname };
  try {
    if (navigator.share) { await navigator.share(shareData); return; }
    await navigator.clipboard.writeText(shareData.text + '\n\n' + shareData.url);
    showToast('Post copied to clipboard');
  } catch(e) {
    if (e && e.name === 'AbortError') return;
    showToast('Couldn’t share this post');
  }
}

async function sendLodgeComment(pid, card, parentId, input) {
  input = input || card.querySelector('.lodge-crow--comment .lodge-cinput');
  var text = (input.value || '').trim();
  if (!text) return;
  try {
    var res = await fetch(SERVER_URL + '/api/social/posts/' + pid + '/comments', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + authToken, 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: text, parentId:parentId || null })
    });
    var d = await res.json();
    if (!res.ok) { showToast(d.error || 'Comment failed'); return; }
    input.value = '';
    var countdown = card.querySelector('[data-comment-countdown]');
    if (!parentId && countdown) countdown.textContent = '280 left';
    var comments = Array.isArray(card._lodgeComments) ? card._lodgeComments.slice() : [];
    comments.push(d.comment);
    _lodgeStoreComments(pid, comments);
    _lodgeRenderComments(card, comments);
    var cnt = card.querySelector('[data-comment-count]');
    var nextCount = (parseInt(cnt.textContent, 10) || 0) + 1;
    cnt.textContent = nextCount;
    var p = _lodgePosts.find(function(x) { return x.id === pid; });
    if (p) p.commentCount = nextCount;
    if (_lodgeDetailPost && _lodgeDetailPost.id === pid) _lodgeDetailPost.commentCount = nextCount;
  } catch(e) { showToast('Comment failed'); }
}

async function toggleLodgeCommentHeart(cid, card) {
  if (_lodgeCommentHeartRequests[cid]) return;
  var requestToken = authToken;
  var comments = Array.isArray(card._lodgeComments) ? card._lodgeComments.slice() : [];
  var target = comments.find(function(comment) { return comment.id === cid; });
  if (!target) return;
  var prior = {
    liked:!!target.likedByMe,
    likeCount:Math.max(0, Number(target.likeCount) || 0)
  };
  var pending = {
    liked:!prior.liked,
    likeCount:Math.max(0, prior.likeCount + (prior.liked ? -1 : 1))
  };
  _lodgeCommentHeartRequests[cid] = pending;
  target.likedByMe = pending.liked;
  target.likeCount = pending.likeCount;
  var postId = card.getAttribute('data-post-id');
  _lodgeStoreComments(postId, comments);
  _lodgeRenderComments(card, comments);
  try {
    var res = await fetch(SERVER_URL + '/api/social/comments/' + cid + '/like', {
      method:'POST',
      headers:{ 'Authorization':'Bearer ' + authToken }
    });
    if (!res.ok) throw new Error('Heart failed');
    var data = await res.json();
    if (authToken !== requestToken || _lodgeCommentHeartRequests[cid] !== pending) return;
    comments = Array.isArray(card._lodgeComments) ? card._lodgeComments.slice() : comments;
    comments.forEach(function(comment) {
      if (comment.id !== cid) return;
      comment.likedByMe = !!data.liked;
      comment.likeCount = Math.max(0, Number(data.likeCount) || 0);
    });
    delete _lodgeCommentHeartRequests[cid];
    _lodgeStoreComments(postId, comments);
    _lodgeRenderComments(card, comments);
  } catch(e) {
    if (authToken !== requestToken || _lodgeCommentHeartRequests[cid] !== pending) return;
    delete _lodgeCommentHeartRequests[cid];
    comments = Array.isArray(card._lodgeComments) ? card._lodgeComments.slice() : comments;
    comments.forEach(function(comment) {
      if (comment.id !== cid) return;
      comment.likedByMe = prior.liked;
      comment.likeCount = prior.likeCount;
    });
    _lodgeStoreComments(postId, comments);
    _lodgeRenderComments(card, comments);
    showToast('Couldn’t save heart');
  }
}

async function deleteLodgePost(pid, card, confirmed) {
  if (!confirmed) {
    showConfirm(
      'Delete this Lodge post?',
      'This permanently removes the post, its likes, and every comment in its discussion. This cannot be undone.',
      function() { deleteLodgePost(pid, card, true); },
      null,
      'Delete post'
    );
    return;
  }
  try {
    var res = await fetch(SERVER_URL + '/api/social/posts/' + pid, {
      method: 'DELETE', headers: { 'Authorization': 'Bearer ' + authToken }
    });
    if (!res.ok) return;
    _lodgePosts = _lodgePosts.filter(function(p) { return p.id !== pid; });
    if (_lodgeSort === 'newest') try { localStorage.setItem(LODGE_CACHE_KEY, JSON.stringify(_lodgePosts.slice(0, 20))); } catch(e) {}
    if (_lodgeDetailPost && _lodgeDetailPost.id === pid) {
      closeLodgePostDetail();
      showToast('Post deleted');
      return;
    }
    card.remove();
    if (!_lodgePosts.length) renderLodgeFeed();
  } catch(e) {}
}

async function deleteLodgeComment(cid, pid, card, confirmed) {
  if (!confirmed) {
    showConfirm(
      'Delete your comment?',
      'Your words will be permanently removed. If people replied, their replies will remain beneath a “Comment deleted” marker.',
      function() { deleteLodgeComment(cid, pid, card, true); },
      null,
      'Delete comment'
    );
    return;
  }
  try {
    var res = await fetch(SERVER_URL + '/api/social/comments/' + cid, {
      method: 'DELETE', headers: { 'Authorization': 'Bearer ' + authToken }
    });
    if (!res.ok) return;
    var data = await res.json();
    var comments = Array.isArray(card._lodgeComments) ? card._lodgeComments.slice() : [];
    if (data.tombstoned) {
      comments.forEach(function(c) {
        if (c.id === cid) { c.deleted = true; c.text = ''; c.mine = false; c.username = 'deleted'; }
      });
    } else {
      comments = comments.filter(function(c) { return c.id !== cid; });
    }
    _lodgeStoreComments(pid, comments);
    _lodgeRenderComments(card, comments);
    var cnt = card.querySelector('[data-comment-count]');
    var nextCount = Math.max(0, (parseInt(cnt.textContent, 10) || 1) - 1);
    cnt.textContent = nextCount;
    var p = _lodgePosts.find(function(x) { return x.id === pid; });
    if (p) p.commentCount = nextCount;
    if (_lodgeDetailPost && _lodgeDetailPost.id === pid) _lodgeDetailPost.commentCount = nextCount;
  } catch(e) {}
}

document.getElementById('lodgeFeed').addEventListener('click', function(e) {
  var card = e.target.closest('.lodge-post');
  if (!card) return;
  var pid = card.getAttribute('data-post-id');
  var post = _lodgeFindPost(pid);
  var uhead = e.target.closest('[data-lodge-user]');
  if (uhead) { _openLodgeProfile(uhead.getAttribute('data-lodge-user'), uhead.getAttribute('data-lodge-uname'), post); return; }
  var cdel = e.target.closest('[data-comment-del]');
  if (cdel) { deleteLodgeComment(cdel.getAttribute('data-comment-del'), pid, card); return; }
  var commentHeart = e.target.closest('[data-comment-like]');
  if (commentHeart) { toggleLodgeCommentHeart(commentHeart.getAttribute('data-comment-like'), card); return; }
  var reply = e.target.closest('[data-comment-reply]');
  if (reply) { openLodgeReplyComposer(card, reply.getAttribute('data-comment-reply'), reply.getAttribute('data-comment-uname')); return; }
  if (e.target.closest('[data-reply-cancel]')) { e.target.closest('.lodge-reply-composer').remove(); return; }
  var replySend = e.target.closest('[data-reply-send]');
  if (replySend) {
    var composer = replySend.closest('.lodge-reply-composer');
    sendLodgeComment(pid, card, composer.getAttribute('data-reply-parent'), composer.querySelector('.lodge-reply-input'));
    return;
  }
  if (e.target.closest('[data-like-count]')) { openLikers(pid); return; }
  if (e.target.closest('[data-lodge-like]')) { toggleLodgeLike(pid, card); return; }
  if (e.target.closest('[data-lodge-share]')) { shareLodgePost(post); return; }
  if (e.target.closest('[data-lodge-comments]')) {
    if (_lodgeDetailPost) toggleLodgeComments(pid, card, true);
    else openLodgePostDetail(post, 'lodgeScreen', true);
    return;
  }
  if (e.target.closest('[data-lodge-discussion]')) { toggleLodgeComments(pid, card); return; }
  if (e.target.closest('[data-lodge-del]')) { deleteLodgePost(pid, card); return; }
  if (e.target.closest('[data-lodge-report]')) { reportLodgeContent('post', pid); return; }
  if (e.target.closest('.lodge-csend')) { sendLodgeComment(pid, card); return; }
  if (e.target.closest('[data-lodge-open-post]') || !e.target.closest('button,textarea,input,a')) openLodgePostDetail(post, 'lodgeScreen', false);
});
document.getElementById('lodgeFeed').addEventListener('input', function(e) {
  if (!e.target.classList.contains('lodge-cinput--comment')) return;
  var composer = e.target.closest('.lodge-comment-composer');
  var countdown = composer && composer.querySelector('[data-comment-countdown]');
  if (countdown) countdown.textContent = Math.max(0, 280 - e.target.value.length) + ' left';
});
document.getElementById('lodgeComposer').addEventListener('click', function() {
  openLodgePostEditor();
});
document.getElementById('lodgeSort').addEventListener('click', function(e) {
  var btn = e.target.closest('[data-lodge-sort]');
  if (!btn) return;
  var next = btn.getAttribute('data-lodge-sort');
  _lodgeCloseSortMenu();
  if (next === _lodgeSort) return;
  _lodgeSort = next;
  _lodgeSetSortUi();
  _lodgePosts = []; _lodgeCursor = null; _lodgeLoading = true;
  renderLodgeFeed();
  loadLodgeFeed();
});
document.getElementById('lodgeSortBtn').addEventListener('click', function(e) {
  e.stopPropagation();
  var menu = document.getElementById('lodgeSort');
  var open = menu.style.display !== 'none';
  menu.style.display = open ? 'none' : '';
  this.setAttribute('aria-expanded', open ? 'false' : 'true');
});
document.addEventListener('click', function(e) {
  if (!e.target.closest('#lodgeFeedNav')) _lodgeCloseSortMenu();
});
document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') _lodgeCloseSortMenu();
});

// The one Lodge post editor (formerly the essay editor): an optional title
// and a body of any length. Posts as a 'note', so it also sets your status.
function openLodgePostEditor() {
  if (!authToken) { showToast('Sign in to write'); return; }
  var ov = document.getElementById('blogOverlay');
  document.getElementById('blogTitleInput').value = '';
  document.getElementById('blogInput').value = '';
  document.getElementById('blogCount').textContent = '0';
  ov.classList.add('on');
  setTimeout(function() { try { document.getElementById('blogInput').focus(); } catch(e) {} }, 50);
}
(function() {
  var ov = document.getElementById('blogOverlay');
  var ta = document.getElementById('blogInput');
  ta.addEventListener('input', function() { document.getElementById('blogCount').textContent = ta.value.length; });
  document.getElementById('blogCancelBtn').addEventListener('click', function() { ov.classList.remove('on'); });
  ov.addEventListener('click', function(e) { if (e.target === ov) ov.classList.remove('on'); });
  document.getElementById('blogSaveBtn').addEventListener('click', async function() {
    var text = (ta.value || '').trim();
    if (!text) return;
    try {
      var res = await fetch(SERVER_URL + '/api/social/posts', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + authToken, 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'note', title: document.getElementById('blogTitleInput').value, text: text })
      });
      var dd = await res.json();
      if (!res.ok) { showToast(dd.error || 'Post failed'); return; }
      ov.classList.remove('on');
      showToast('Shared to the Lodge', 1800, 'gold');
      // Server set this note as our status (a short preview). Mirror that in the
      // local status cache so the profile card updates now, not just next pull.
      try {
        var _sk = (typeof STATUS_KEY === 'string') ? STATUS_KEY : 'presence_status_v1';
        var _sm = (typeof STATUS_MAX === 'number') ? STATUS_MAX : 280;
        localStorage.setItem(_sk, JSON.stringify({ text: text.slice(0, _sm), updatedAt: new Date().toISOString() }));
      } catch(e) {}
      if (typeof renderMyStatus === 'function') { try { renderMyStatus(true); } catch(e) {} }
      loadLodgeFeed();
    } catch(e) { showToast('Post failed'); }
  });
})();
document.getElementById('lodgeBack').addEventListener('click', function() {
  if (closeLodgePostDetail()) return;
  if (_lodgeSearchActive) { closeLodgeSearch(); return; }
  if (_lodgeUserFilter) { openLodge(); return; }
  showScreen('homeScreen');
});
document.getElementById('lodgeProfileLink').addEventListener('click', openLodgeUserProfile);

// Detail and filtered-history views live inside the Lodge screen, so they own
// an internal edge swipe instead of falling through to Home.
(function() {
  var start = null;
  document.addEventListener('touchstart', function(e) {
    var lodgeScreen = document.getElementById('lodgeScreen');
    if (!lodgeScreen.classList.contains('active') || (!_lodgeDetailPost && !_lodgeUserFilter) || _lodgeSearchActive || !e.touches[0] || e.touches[0].clientX > 44) return;
    start = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  }, {passive:true});
  document.addEventListener('touchmove', function(e) {
    if (!start || !e.touches[0]) return;
    var dx = e.touches[0].clientX - start.x;
    var dy = Math.abs(e.touches[0].clientY - start.y);
    if (dy > Math.abs(dx) + 8 || dx <= 0) { start = null; return; }
    document.getElementById('lodgeScreen').style.transform = 'translateX(' + Math.min(dx, 56) + 'px)';
  }, {passive:true});
  document.addEventListener('touchend', function(e) {
    if (!start || !e.changedTouches[0]) { start = null; return; }
    var dx = e.changedTouches[0].clientX - start.x;
    start = null;
    var screen = document.getElementById('lodgeScreen');
    if (dx < 72) {
      screen.style.transition = 'transform .18s ease';
      screen.style.transform = '';
      setTimeout(function() { screen.style.transition = ''; }, 180);
      return;
    }
    // The card's own FLIP glide (in closeLodgePostDetail) now carries the
    // motion, so the screen just eases back to rest from wherever the drag
    // left it — no more slide-out/snap/slide-in relay, which fought the
    // FLIP and read as a stutter instead of one continuous release.
    screen.style.transition = 'transform .22s cubic-bezier(.22,.9,.32,1)';
    screen.style.transform = '';
    if (!closeLodgePostDetail()) openLodge();
    setTimeout(function() { screen.style.transition = ''; }, 220);
  }, {passive:true});
  document.addEventListener('touchcancel', function() {
    start = null;
    var screen = document.getElementById('lodgeScreen');
    screen.style.transition = '';
    screen.style.transform = '';
  }, {passive:true});
})();
document.getElementById('lodgeSearchBtn').addEventListener('click', function() {
  if (_lodgeSearchActive) closeLodgeSearch(); else openLodgeSearch();
});
document.getElementById('lodgeSearchClose').addEventListener('click', closeLodgeSearch);
document.getElementById('lodgeSearchInput').addEventListener('input', function() {
  var q = this.value.trim();
  clearTimeout(_lodgeSearchDebounce);
  _lodgeSearchDebounce = setTimeout(function() { runLodgeSearch(q); }, 350);
});
document.getElementById('lodgeSearchInput').addEventListener('keydown', function(e) {
  if (e.key === 'Enter') { clearTimeout(_lodgeSearchDebounce); runLodgeSearch(this.value.trim()); }
});
document.getElementById('lodgeMore').addEventListener('click', function() { if (_lodgeCursor) loadLodgeFeed(_lodgeCursor); });
document.getElementById('drawerLodge').addEventListener('click', function() {
  closeDrawer();
  if (!authToken) { showToast('Sign in to enter the Lodge'); return; }
  openLodge();
});

// ── Profile Lodge activity ──────────────────────────────────────────
var _profileActivityUserId = 'me';
var _profileActivityUsername = 'you';
var _profileActivityTab = 'posts';
var _profileActivityReturnScreen = 'profileScreen';
var _profileActivityRows = [];
var _profileActivityLoading = false;
var _profileActivityCache = {};
var _profileActivityRequests = {};

function _profileActivityCacheKey(userId, tab) {
  return (userId || 'me') + ':' + (tab === 'comments' ? 'comments' : 'posts');
}

function _fetchProfileActivity(userId, tab) {
  var normalizedTab = tab === 'comments' ? 'comments' : 'posts';
  var key = _profileActivityCacheKey(userId, normalizedTab);
  if (_profileActivityRequests[key]) return _profileActivityRequests[key];
  _profileActivityRequests[key] = fetch(SERVER_URL + '/api/social/users/' + encodeURIComponent(userId || 'me') + '/' + normalizedTab, {
    headers: { 'Authorization': 'Bearer ' + authToken }
  })
    .then(function(res) {
      if (!res.ok) throw new Error('Profile activity request failed');
      return res.json();
    })
    .then(function(data) {
      var rows = data && Array.isArray(data[normalizedTab]) ? data[normalizedTab] : [];
      _profileActivityCache[key] = rows;
      return rows;
    })
    .finally(function() { delete _profileActivityRequests[key]; });
  return _profileActivityRequests[key];
}

// Begin both requests as soon as a profile is visible. The activity screen can
// then paint its rows from memory immediately instead of waiting after a tab tap.
function warmProfileActivity(userId) {
  if (!authToken) return;
  ['posts', 'comments'].forEach(function(tab) {
    _fetchProfileActivity(userId || 'me', tab).catch(function() {});
  });
}

function profileActivityPreviousScreen() {
  return document.getElementById(_profileActivityReturnScreen) ? _profileActivityReturnScreen : 'profileScreen';
}

function _profileActivityPostCard(post) {
  return '<button class="profile-activity-card" data-profile-activity-post="' + escHtml(post.id) + '">'
    + '<div class="profile-activity-card__meta">' + timeAgo(new Date(post.createdAt)) + ' · ' + (post.likeCount || 0) + ' likes · ' + (post.commentCount || 0) + ' comments</div>'
    + (post.title ? '<div class="profile-activity-card__title">' + escHtml(post.title) + '</div>' : '')
    + '<div class="profile-activity-card__text">' + escHtml(post.text || '') + '</div></button>';
}

function _profileActivityCommentCard(comment) {
  var post = comment.post || {};
  return '<button class="profile-activity-card" data-profile-activity-post="' + escHtml(post.id || '') + '">'
    + '<div class="profile-activity-card__meta">' + timeAgo(new Date(comment.createdAt)) + '</div>'
    + '<div class="profile-activity-card__text">' + escHtml(comment.text || '') + '</div>'
    + '<div class="profile-activity-card__context">On @' + escHtml(post.username || 'practitioner') + '’s post ›</div></button>';
}

function renderProfileActivity() {
  document.querySelectorAll('[data-profile-activity-tab]').forEach(function(btn) {
    btn.classList.toggle('on', btn.getAttribute('data-profile-activity-tab') === _profileActivityTab);
  });
  var body = document.getElementById('profileActivityBody');
  if (_profileActivityLoading) {
    body.innerHTML = '<div class="lodge-skeleton"></div><div class="lodge-skeleton"></div>';
    return;
  }
  body.innerHTML = _profileActivityRows.length
    ? _profileActivityRows.map(_profileActivityTab === 'posts' ? _profileActivityPostCard : _profileActivityCommentCard).join('')
    : '<div class="prof-empty-note" style="text-align:center;padding:44px 20px;">No ' + _profileActivityTab + ' yet.</div>';
}

async function loadProfileActivity() {
  var userId = _profileActivityUserId;
  var tab = _profileActivityTab;
  var key = _profileActivityCacheKey(userId, tab);
  var cached = _profileActivityCache[key];
  _profileActivityRows = cached ? cached.slice() : [];
  _profileActivityLoading = !cached;
  renderProfileActivity();
  try {
    var rows = await _fetchProfileActivity(userId, tab);
    // Do not let a slower tab/profile request replace the view the user chose.
    if (_profileActivityUserId !== userId || _profileActivityTab !== tab) return;
    _profileActivityRows = rows.slice();
  } catch(e) {
    if (_profileActivityUserId !== userId || _profileActivityTab !== tab) return;
    if (!cached) _profileActivityRows = [];
  }
  if (_profileActivityUserId !== userId || _profileActivityTab !== tab) return;
  _profileActivityLoading = false;
  renderProfileActivity();
}

function openProfileActivity(userId, username, tab, returnScreen) {
  if (!authToken) { showToast('Sign in to view Lodge activity'); return; }
  _profileActivityUserId = userId || 'me';
  _profileActivityUsername = username || 'practitioner';
  _profileActivityTab = tab === 'comments' ? 'comments' : 'posts';
  _profileActivityReturnScreen = returnScreen || ((document.querySelector('.screen.active') || {}).id) || 'profileScreen';
  document.getElementById('profileActivityTitle').textContent = '@' + _profileActivityUsername;
  showScreen('profileActivityScreen');
  loadProfileActivity();
}

document.getElementById('profileActivityBack').addEventListener('click', function() {
  showScreen(profileActivityPreviousScreen());
});
document.querySelector('.profile-activity-tabs').addEventListener('click', function(e) {
  var btn = e.target.closest('[data-profile-activity-tab]');
  if (!btn) return;
  var tab = btn.getAttribute('data-profile-activity-tab');
  if (tab === _profileActivityTab) return;
  _profileActivityTab = tab;
  loadProfileActivity();
});
document.getElementById('profileActivityBody').addEventListener('click', function(e) {
  var card = e.target.closest('[data-profile-activity-post]');
  if (!card) return;
  var pid = card.getAttribute('data-profile-activity-post');
  var row = _profileActivityRows.find(function(item) {
    return _profileActivityTab === 'posts' ? item.id === pid : item.post && item.post.id === pid;
  });
  var post = _profileActivityTab === 'posts' ? row : row && row.post;
  if (post) openLodgePostDetail(post, 'profileActivityScreen', _profileActivityTab === 'comments');
});

// Prime the Lodge feed after state restoration, long before the user
// opens the drawer. This makes the first visit feel like a native screen.
function warmLodgeExperience() {
  if (!authToken) return;
  warmLodgeFeeds();
  loadChatList(false);
  loadLodgeNotifs();
}
var _lodgeWarmTimer = null;
function scheduleLodgeWarmExperience() {
  if (_lodgeWarmTimer) return;
  // Spread signed-in startup reads across a short window. A launch wave should
  // not turn into every device hitting feed/messages/notifications in the same
  // 80ms slice, while the warm-up still finishes well before normal navigation.
  var delay = 650 + Math.floor(Math.random() * 1350);
  _lodgeWarmTimer = setTimeout(function() {
    _lodgeWarmTimer = null;
    warmLodgeExperience();
  }, delay);
}
window.addEventListener('load', function() {
  scheduleLodgeWarmExperience();
});
window.addEventListener('presence:auth-ready', scheduleLodgeWarmExperience);
(function() {
  var ov = document.getElementById('likersOverlay');
  document.getElementById('likersCloseBtn').addEventListener('click', function() { ov.classList.remove('on'); });
  ov.addEventListener('click', function(e) { if (e.target === ov) ov.classList.remove('on'); });
})();

// ── Lodge Phase 2: follows, block/report, notifications ──
async function followUser(userId, btn) {
  if (!authToken) { showToast('Sign in to follow'); return; }
  if (btn) btn.disabled = true;
  try {
    var res = await fetch(SERVER_URL + '/api/social/follow', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + authToken, 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: userId })
    });
    var d = await res.json();
    if (res.ok) { if (btn) { btn.textContent = d.status === 'pending' ? 'Requested' : 'Following'; btn.style.opacity = '.5'; } }
    else { if (btn) btn.disabled = false; showToast(d.error || 'Follow failed'); }
  } catch(e) { if (btn) btn.disabled = false; }
}

async function approveFollow(userId) {
  try {
    await fetch(SERVER_URL + '/api/social/follow/approve', {
      method: 'POST', headers: { 'Authorization': 'Bearer ' + authToken, 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: userId })
    });
  } catch(e) {}
  loadFriendsPanel();
}
async function declineFollow(userId) {
  try {
    await fetch(SERVER_URL + '/api/social/follow/decline', {
      method: 'POST', headers: { 'Authorization': 'Bearer ' + authToken, 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: userId })
    });
  } catch(e) {}
  loadFriendsPanel();
}

async function reportLodgeContent(kind, refId) {
  var reason = window.prompt('Why are you reporting this? (optional)') || '';
  try {
    await fetch(SERVER_URL + '/api/social/report', {
      method: 'POST', headers: { 'Authorization': 'Bearer ' + authToken, 'Content-Type': 'application/json' },
      body: JSON.stringify({ kind: kind, refId: refId, reason: reason })
    });
    showToast('Reported. Thank you.');
  } catch(e) {}
}

// Friend profile: counts + follow/block/report controls.
// Per-friend follower/following + follow-state cache, so a repeat visit to a
// friend's profile paints instantly instead of showing a blank "…" while the
// network round-trip is in flight (matches the getCachedFollowSummary pattern
// used for the own-profile counts).
var FRIEND_SOCIAL_CACHE_KEY = 'presence_friend_social_cache_v1';
var _friendSocialRequests = {};
function cacheFriendSocial(userId, s) {
  if (!userId || !s) return;
  try {
    var all = JSON.parse(localStorage.getItem(FRIEND_SOCIAL_CACHE_KEY)) || {};
    all[userId] = { followers: s.followers || 0, following: s.following || 0, iFollow: s.iFollow || null, followsMe: !!s.followsMe, blocked: !!s.blocked };
    localStorage.setItem(FRIEND_SOCIAL_CACHE_KEY, JSON.stringify(all));
  } catch(e) {}
}
function getCachedFriendSocial(userId) {
  try {
    var all = JSON.parse(localStorage.getItem(FRIEND_SOCIAL_CACHE_KEY)) || {};
    return all[userId] || null;
  } catch(e) { return null; }
}

// A friend profile needs this same summary for its follow button, Message
// availability, and follower counts. Keep one in-flight request per person so
// opening a profile after it was warmed simply joins the already-running work.
function _fetchFriendSocial(userId) {
  if (!authToken || !userId) return Promise.reject(new Error('No signed-in friend profile'));
  if (_friendSocialRequests[userId]) return _friendSocialRequests[userId];
  var requestToken = authToken;
  _friendSocialRequests[userId] = fetch(SERVER_URL + '/api/social/users/' + encodeURIComponent(userId) + '/summary', {
    headers: { 'Authorization': 'Bearer ' + requestToken }
  })
    .then(function(res) {
      if (!res.ok) throw new Error('Friend summary request failed');
      return res.json();
    })
    .then(function(summary) {
      if (authToken === requestToken) cacheFriendSocial(userId, summary);
      return summary;
    })
    .finally(function() { delete _friendSocialRequests[userId]; });
  return _friendSocialRequests[userId];
}

function warmFriendSocial(userId) {
  if (authToken && userId) _fetchFriendSocial(userId).catch(function() {});
}

function _applyFriendSocial(f, s) {
  var counts = document.getElementById('friendProfCounts');
  var btn = document.getElementById('friendFollowBtn');
  counts.textContent = (s.followers || 0) + ' followers · ' + (s.following || 0) + ' following';
  counts.style.cursor = 'pointer';
  counts.title = 'View followers and following';
  counts.onclick = function() {
    if (typeof openFollowList === 'function') openFollowList('followers', f.userId, f.username || 'practitioner');
  };
  btn.disabled = false;
  btn.textContent = s.blocked ? 'Unblock' : s.iFollow === 'active' ? 'Following ✓' : s.iFollow === 'pending' ? 'Requested' : 'Follow';
  btn.onclick = async function() {
    btn.disabled = true;
    var ep = s.blocked ? '/unblock' : s.iFollow ? '/unfollow' : '/follow';
    if (ep === '/unfollow' && !window.confirm('Unfollow @' + (f.username || '') + '?')) { btn.disabled = false; return; }
    try {
      await fetch(SERVER_URL + '/api/social' + ep, {
        method: 'POST', headers: { 'Authorization': 'Bearer ' + authToken, 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: f.userId })
      });
    } catch(e) {}
    loadFriendSocial(f);
  };
  var bb = document.getElementById('friendBlockBtn');
  bb.style.display = s.blocked ? 'none' : '';
  bb.onclick = async function() {
    if (!window.confirm('Block @' + (f.username || '') + '? They will be removed from your friends and follows, both ways.')) return;
    try {
      await fetch(SERVER_URL + '/api/social/block', {
        method: 'POST', headers: { 'Authorization': 'Bearer ' + authToken, 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: f.userId })
      });
    } catch(e) {}
    showToast('Blocked');
    loadFriendSocial(f);
  };
  document.getElementById('friendReportBtn').onclick = function() { reportLodgeContent('user', f.userId); };
  var mb = document.getElementById('friendMsgBtn');
  if (mb) {
    var canMessage = s.iFollow === 'active' && s.followsMe && !s.blocked;
    mb.style.display = canMessage ? '' : 'none';
    // Warm existing conversations while the friend profile is already open.
    // This is deliberately background-only: opening a brand-new conversation
    // still goes through the server's mutual-follow authorization.
    if (canMessage) loadChatList(false);
    mb.onclick = function() { messageFriend(f.userId, f.username || ''); };
  }
}

async function loadFriendSocial(f) {
  var box = document.getElementById('friendProfSocial');
  if (!box || !authToken || !f || !f.userId) return;
  box.style.display = 'flex';
  var counts = document.getElementById('friendProfCounts');
  var btn = document.getElementById('friendFollowBtn');
  var cached = getCachedFriendSocial(f.userId);
  if (cached) { _applyFriendSocial(f, cached); } else { counts.textContent = ''; btn.textContent = '…'; btn.disabled = true; }
  try {
    var s = await _fetchFriendSocial(f.userId);
    // Another friend may have been opened while this request was in flight.
    // Never let that older response overwrite the visible profile's controls.
    if (!_currentFriendProfile || _currentFriendProfile.userId !== f.userId) return;
    _applyFriendSocial(f, s);
  } catch(e) {
    if (!_currentFriendProfile || _currentFriendProfile.userId !== f.userId) return;
    if (!cached) box.style.display = 'none';
  }
}

// Notifications bell.
var _lodgeNotifs = [];
var _lodgeNotifsPromise = null;
var _lodgeNotifsLoadedAt = 0;
var _lodgeNotifsToken = null;
var _lodgeNotifsEpoch = 0;
var NOTIF_COPY = { like: 'liked your post', comment_like: 'hearted your comment', comment: 'commented on your post', reply: 'replied to your comment', follow: 'now follows you', follow_req: 'requested to follow you', approved: 'approved your follow request', dm: 'sent you a message', friend: 'is now your friend — you follow each other' };
async function loadLodgeNotifs(force) {
  if (!authToken) return;
  if (_lodgeNotifsToken === null) {
    _lodgeNotifsToken = authToken;
  } else if (_lodgeNotifsToken !== authToken) {
    _lodgeNotifs = [];
    _lodgeNotifsLoadedAt = 0;
    _lodgeNotifsToken = authToken;
    _lodgeNotifsEpoch++;
  }
  if (!force && _lodgeNotifsLoadedAt && Date.now() - _lodgeNotifsLoadedAt < 30000) return _lodgeNotifs;
  if (_lodgeNotifsPromise) return _lodgeNotifsPromise;
  var requestToken = authToken;
  var requestEpoch = _lodgeNotifsEpoch;
  _lodgeNotifsPromise = (async function() {
    try {
      var res = await fetch(SERVER_URL + '/api/social/notifications', { headers: { 'Authorization': 'Bearer ' + authToken } });
      if (!res.ok) return _lodgeNotifs;
      var d = await res.json();
      if (authToken !== requestToken || _lodgeNotifsEpoch !== requestEpoch) return _lodgeNotifs;
      _lodgeNotifs = d.notifications || [];
      _lodgeNotifsLoadedAt = Date.now();
      var b = document.getElementById('lodgeBellBadge');
      if (d.unseen > 0) { b.style.display = ''; b.textContent = d.unseen > 9 ? '9+' : d.unseen; }
      else b.style.display = 'none';
      return _lodgeNotifs;
    } catch(e) { return _lodgeNotifs; }
    finally { _lodgeNotifsPromise = null; }
  })();
  return _lodgeNotifsPromise;
}
function renderLodgeNotifs() {
  var list = document.getElementById('notifList');
  var clear = document.getElementById('notifClearBtn');
  list.innerHTML = _lodgeNotifs.length ? _lodgeNotifs.map(function(n) {
    var isFriend = n.kind === 'friend';
    return '<div class="likers-row"' + (isFriend ? ' style="color:#7eb8a4;"' : '') + '>'
      + (isFriend ? '✦ ' : '') + '@' + escHtml(n.username || '?')
      + ' <span style="color:var(--muted);">' + (NOTIF_COPY[n.kind] || n.kind) + ' · ' + timeAgo(new Date(n.createdAt)) + '</span></div>';
  }).join('') : '<div class="likers-row private">Nothing yet.</div>';
  clear.disabled = !_lodgeNotifs.length;
  clear.style.opacity = _lodgeNotifs.length ? '1' : '.45';
}
function openLodgeNotifs() {
  var ov = document.getElementById('notifOverlay');
  renderLodgeNotifs();
  ov.classList.add('on');
  loadLodgeNotifs(true).then(function() {
    if (ov.classList.contains('on')) renderLodgeNotifs();
    // The refresh and mark-seen request intentionally overlap. Keep the local
    // badge dismissed even if the refresh observed the pre-update unseen count.
    document.getElementById('lodgeBellBadge').style.display = 'none';
  });
  fetch(SERVER_URL + '/api/social/notifications/seen', { method: 'POST', headers: { 'Authorization': 'Bearer ' + authToken } }).catch(function() {});
  document.getElementById('lodgeBellBadge').style.display = 'none';
}
async function clearLodgeNotifs() {
  if (!_lodgeNotifs.length) return;
  var previous = _lodgeNotifs;
  _lodgeNotifsEpoch++;
  _lodgeNotifs = [];
  renderLodgeNotifs();
  document.getElementById('lodgeBellBadge').style.display = 'none';
  try {
    var res = await fetch(SERVER_URL + '/api/social/notifications', {
      method: 'DELETE',
      headers: { 'Authorization': 'Bearer ' + authToken }
    });
    if (!res.ok) throw new Error('Clear failed');
    showToast('Notifications cleared');
  } catch(e) {
    _lodgeNotifs = previous;
    renderLodgeNotifs();
    loadLodgeNotifs(true);
    showToast('Couldn’t clear notifications');
  }
}
document.getElementById('lodgeBell').addEventListener('click', openLodgeNotifs);
(function() {
  var ov = document.getElementById('notifOverlay');
  document.getElementById('notifClearBtn').addEventListener('click', clearLodgeNotifs);
  document.getElementById('notifCloseBtn').addEventListener('click', function() { ov.classList.remove('on'); });
  ov.addEventListener('click', function(e) { if (e.target === ov) ov.classList.remove('on'); });
})();

// ── Lodge Phase 3: private chat (polling, mutual follows only) ──
var _chatConvId = null, _chatPoll = null, _chatPendingFriendId = null, _chatReturnFriendId = null;
var _chatConversations = [], _chatListLoaded = false, _chatListPromise = null, _chatCacheToken = null;

function stopChatPoll() { if (_chatPoll) { clearInterval(_chatPoll); _chatPoll = null; } }
function startChatPoll() {
  stopChatPoll();
  _chatPoll = setInterval(function() {
    var scr = document.getElementById('chatThreadScreen');
    if (scr && scr.classList.contains('active')) loadChatMsgs();
    else stopChatPoll();
  }, 8000);
}

function _chatEnsureCacheOwner() {
  if (_chatCacheToken === authToken) return;
  _chatCacheToken = authToken;
  _chatConversations = [];
  _chatMessageCache = {};
  _chatMessageRequests = {};
  _chatMessageWarmRequests = {};
  _chatListLoaded = false;
  _chatListPromise = null;
}

function renderChatList(loading) {
  var list = document.getElementById('chatList');
  var empty = document.getElementById('chatListEmpty');
  if (loading && !_chatConversations.length) {
    list.innerHTML = '<div class="chat-conv-skeleton"></div><div class="chat-conv-skeleton"></div><div class="chat-conv-skeleton"></div>';
    empty.style.display = 'none';
    return;
  }
  list.innerHTML = _chatConversations.map(function(c) {
    return '<div class="chat-conv" data-conv-id="' + escHtml(c.id) + '" data-conv-name="' + escHtml(c.username) + '">'
      + _lodgeRingHtml(c.username, c.profilePic)
      + '<div style="min-width:0;"><div class="chat-conv__name" style="color:' + _lodgeHue(c.username)[0] + ';">@' + escHtml(c.username) + '</div>'
      + '<div class="chat-conv__preview">' + escHtml(c.lastPreview || '') + '</div></div>'
      + (c.unread > 0 ? '<span class="chat-unread"></span>' : '')
      + '</div>';
  }).join('');
  empty.style.display = _chatConversations.length ? 'none' : '';
}

async function loadChatList(paint) {
  _chatEnsureCacheOwner();
  if (!authToken) return;
  if (_chatListPromise) {
    await _chatListPromise;
    if (paint && document.getElementById('chatListScreen').classList.contains('active')) renderChatList(false);
    return;
  }
  var requestToken = authToken;
  var request = (async function() {
    try {
      var res = await fetch(SERVER_URL + '/api/social/conversations', { headers: { 'Authorization': 'Bearer ' + requestToken } });
      if (!res.ok) return;
      var d = await res.json();
      if (authToken !== requestToken) return;
      _chatConversations = d.conversations || [];
      _chatListLoaded = true;
    } catch(e) {}
  })();
  _chatListPromise = request;
  await request;
  if (_chatListPromise === request) _chatListPromise = null;
  if (paint && document.getElementById('chatListScreen').classList.contains('active')) renderChatList(false);
}

function openChatList() {
  stopChatPoll();
  _chatReturnFriendId = null;
  _chatEnsureCacheOwner();
  renderChatList(!_chatListLoaded);
  showScreen('chatListScreen');
  warmChatMessageThreads(_chatConversations);
  loadChatList(true).then(function() { warmChatMessageThreads(_chatConversations); });
}

async function openChatThread(convId, username) {
  _chatPendingFriendId = null;
  _chatConvId = convId;
  var cachedConversation = _chatConversations.find(function(c) { return c.id === convId; });
  if (cachedConversation) cachedConversation.unread = 0;
  document.getElementById('chatThreadName').textContent = '@' + username;
  var cachedMessages = _chatMessageCache[convId];
  document.getElementById('chatMsgs').innerHTML = cachedMessages
    ? cachedMessages.map(_chatMsgHtml).join('')
    : '<div class="chat-conv-skeleton"></div><div class="chat-conv-skeleton"></div>';
  showScreen('chatThreadScreen');
  await loadChatMsgs();
  startChatPoll();
}

// The swipe-back controller asks this at gesture start, while the button below
// calls the matching return action at gesture completion. A thread opened from
// a friend profile therefore behaves like a child of that profile, rather than
// accidentally falling through to the global Messages/Lodge route.
function chatThreadPreviousScreen() {
  return _chatReturnFriendId ? 'friendProfileScreen' : 'chatListScreen';
}
function returnFromChatThread() {
  var friendId = _chatReturnFriendId;
  _chatReturnFriendId = null;
  _chatPendingFriendId = null;
  stopChatPoll();
  var friend = friendId && typeof _friendProfileCache !== 'undefined' ? _friendProfileCache[friendId] : null;
  if (!friend && typeof _currentFriendProfile !== 'undefined' && _currentFriendProfile && _currentFriendProfile.userId === friendId) friend = _currentFriendProfile;
  if (friend && typeof renderFriendProfile === 'function') {
    renderFriendProfile(friend);
    showScreen('friendProfileScreen');
    if (typeof closeFriendsPanel === 'function') closeFriendsPanel();
    return;
  }
  openChatList();
}

function _chatMsgHtml(m) {
  return '<div class="chat-row ' + (m.mine ? 'chat-mine' : 'chat-theirs') + '"><div class="chat-bubble">'
    + escHtml(m.text) + '<div class="chat-time">' + timeAgo(new Date(m.createdAt)) + '</div></div></div>';
}

async function loadChatMsgs() {
  if (!_chatConvId || !authToken) return;
  var convId = _chatConvId;
  try {
    var messages = await _fetchChatMsgs(convId);
    if (_chatConvId !== convId) return;
    var box = document.getElementById('chatMsgs');
    box.innerHTML = messages.map(_chatMsgHtml).join('');
    box.scrollTop = box.scrollHeight;
  } catch(e) {}
}

var _chatMessageCache = {};
var _chatMessageRequests = {};
var _chatMessageWarmRequests = {};
function warmChatMessageThreads(conversations) {
  _chatEnsureCacheOwner();
  if (!authToken) return Promise.resolve({});
  var ids = [];
  (conversations || []).forEach(function(conversation) {
    if (!conversation || !conversation.id || ids.length >= 8
      || _chatMessageCache[conversation.id] || _chatMessageWarmRequests[conversation.id]) return;
    if (!conversation.lastMsgAt && !conversation.lastPreview) {
      _chatMessageCache[conversation.id] = [];
      return;
    }
    ids.push(conversation.id);
  });
  if (!ids.length) return Promise.resolve({});
  var requestToken = authToken;
  var batch = fetch(SERVER_URL + '/api/social/conversations/messages/batch?conversationIds=' + encodeURIComponent(ids.join(',')), {
    headers:{ 'Authorization':'Bearer ' + requestToken }
  }).then(function(res) {
    return res.ok ? res.json() : null;
  }).then(function(data) {
    if (authToken !== requestToken) return {};
    var byConversation = data && data.messagesByConversation;
    if (!byConversation) return {};
    ids.forEach(function(id) {
      _chatMessageCache[id] = Array.isArray(byConversation[id]) ? byConversation[id] : [];
    });
    return byConversation;
  }).catch(function() { return {}; });
  ids.forEach(function(id) {
    _chatMessageWarmRequests[id] = batch;
    batch.finally(function() {
      if (_chatMessageWarmRequests[id] === batch) delete _chatMessageWarmRequests[id];
    });
  });
  return batch;
}
function _fetchChatMsgs(convId) {
  if (_chatMessageRequests[convId]) return _chatMessageRequests[convId];
  var requestToken = authToken;
  var request = fetch(SERVER_URL + '/api/social/conversations/' + convId + '/messages', { headers: { 'Authorization': 'Bearer ' + requestToken } })
    .then(function(res) {
      if (!res.ok) throw new Error('Message request failed');
      return res.json();
    })
    .then(function(data) {
      var messages = data.messages || [];
      if (authToken !== requestToken) return [];
      _chatMessageCache[convId] = messages;
      return messages;
    })
    .finally(function() {
      if (_chatMessageRequests[convId] === request) delete _chatMessageRequests[convId];
    });
  _chatMessageRequests[convId] = request;
  return request;
}

async function sendChatMsg() {
  var input = document.getElementById('chatInput');
  var text = (input.value || '').trim();
  if (!text || !_chatConvId) return;
  try {
    var res = await fetch(SERVER_URL + '/api/social/conversations/' + _chatConvId + '/messages', {
      method: 'POST', headers: { 'Authorization': 'Bearer ' + authToken, 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: text })
    });
    var d = await res.json();
    if (!res.ok) { showToast(d.error || 'Send failed'); return; }
    input.value = '';
    var cachedIndex = _chatConversations.findIndex(function(c) { return c.id === _chatConvId; });
    if (cachedIndex >= 0) {
      var cached = _chatConversations[cachedIndex];
      cached.lastPreview = text;
      cached.unread = 0;
      _chatConversations.splice(cachedIndex, 1);
      _chatConversations.unshift(cached);
    }
    var box = document.getElementById('chatMsgs');
    box.insertAdjacentHTML('beforeend', _chatMsgHtml(d.message));
    if (_chatMessageCache[_chatConvId]) _chatMessageCache[_chatConvId].push(d.message);
    box.scrollTop = box.scrollHeight;
  } catch(e) { showToast('Send failed'); }
}

async function messageFriend(userId, username) {
  if (!authToken) return;
  // Navigate instantly; Render can take a moment to wake before it creates or
  // returns the conversation ID. The pending marker prevents a late response
  // from reopening the thread after the user has backed out.
  _chatPendingFriendId = userId;
  _chatReturnFriendId = userId;
  _chatConvId = null;
  document.getElementById('chatThreadName').textContent = '@' + username;
  // A profile visit warms the conversation list below. Reuse a known thread
  // immediately so returning to an existing friend conversation skips the
  // extra open/create round-trip before messages can load.
  var cachedConversation = _chatConversations.find(function(c) { return c.userId === userId; });
  if (cachedConversation) {
    openChatThread(cachedConversation.id, username);
    return;
  }
  document.getElementById('chatMsgs').innerHTML = '<div class="followlist-empty">Opening conversation…</div>';
  showScreen('chatThreadScreen');
  try {
    var res = await fetch(SERVER_URL + '/api/social/conversations/open', {
      method: 'POST', headers: { 'Authorization': 'Bearer ' + authToken, 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: userId })
    });
    var d = await res.json();
    if (_chatPendingFriendId !== userId) return;
    if (!res.ok) {
      document.getElementById('chatMsgs').innerHTML = '<div class="followlist-empty">Couldn’t open this conversation.</div>';
      showToast(d.error || 'Unable to message');
      return;
    }
    openChatThread(d.id, username);
  } catch(e) {
    if (_chatPendingFriendId === userId) {
      document.getElementById('chatMsgs').innerHTML = '<div class="followlist-empty">Couldn’t open this conversation.</div>';
      showToast('Unable to message');
    }
  }
}

document.getElementById('lodgeChats').addEventListener('click', function() { openChatList(); });
document.getElementById('chatListBack').addEventListener('click', function() { stopChatPoll(); showScreen('lodgeScreen'); });
document.getElementById('chatThreadBack').addEventListener('click', returnFromChatThread);
document.getElementById('chatList').addEventListener('click', function(e) {
  var row = e.target.closest('[data-conv-id]');
  if (row) { _chatReturnFriendId = null; openChatThread(row.getAttribute('data-conv-id'), row.getAttribute('data-conv-name')); }
});
document.getElementById('chatSend').addEventListener('click', sendChatMsg);
document.getElementById('chatInput').addEventListener('keydown', function(e) { if (e.key === 'Enter') sendChatMsg(); });

var _friendsPanelReturnScreen = 'profileScreen';
var _friendsPanelCloseTimer = null;

function friendsPanelPreviousScreen() {
  return _friendsPanelReturnScreen || 'profileScreen';
}

function openFriendsPanel(returnScreenId) {
  var el = document.getElementById('friendsPanel');
  if (!el) return;
  var activeScreen = document.querySelector('.screen.active');
  _friendsPanelReturnScreen = returnScreenId || (activeScreen && activeScreen.id) || 'profileScreen';
  if (_friendsPanelCloseTimer) { clearTimeout(_friendsPanelCloseTimer); _friendsPanelCloseTimer = null; }
  el.classList.add('fp-show');
  requestAnimationFrame(function() { requestAnimationFrame(function() { el.classList.add('fp-vis'); }); });
  loadFriendsPanel();
}

function closeFriendsPanel() {
  var el = document.getElementById('friendsPanel');
  if (!el) return;
  if (_friendsPanelCloseTimer) { clearTimeout(_friendsPanelCloseTimer); _friendsPanelCloseTimer = null; }
  el.classList.remove('fp-vis');
  if (window._interactiveSwipeBackScreenId === 'friendsPanel') {
    el.classList.remove('fp-show');
    return;
  }
  _friendsPanelCloseTimer = setTimeout(function() {
    el.classList.remove('fp-show');
    _friendsPanelCloseTimer = null;
  }, 320);
}

async function loadFriendsPanel() {
  if (!authToken) return;
  // Paint the last-known list instantly so the panel isn't blank while the
  // network round-trip is in flight.
  var _cached = getCachedFriendsList();
  if (_cached.length) renderFriendsList(_cached);
  // Load friends list
  try {
    var res = await fetch(SYNC_API_URL + '/friends/list', { headers: { 'Authorization': 'Bearer ' + authToken } });
    var data = await res.json();
    if (typeof achSeeFriends === 'function') achSeeFriends(data.friends || []);
    renderFriendsList(data.friends || []);
  } catch(e) { console.warn('Friends load failed', e); }
  // Load pending requests (friend requests + follow requests from private-account gating)
  var _freq = [], _folreq = [];
  try {
    var rres = await fetch(SYNC_API_URL + '/friends/requests', { headers: { 'Authorization': 'Bearer ' + authToken } });
    var rdata = await rres.json();
    _freq = rdata.requests || [];
  } catch(e) {}
  try {
    var fres = await fetch(SERVER_URL + '/api/social/follow/requests', { headers: { 'Authorization': 'Bearer ' + authToken } });
    var fdata = await fres.json();
    _folreq = fdata.requests || [];
  } catch(e) {}
  renderFriendRequests(_freq, _folreq);
}

function renderFriendsList(friends) {
  var el = document.getElementById('fpFriendsList');
  if (!el) return;
  cacheFriends(friends);
  if (!friends.length) { el.innerHTML = '<div class="fp-empty">No friends yet.<br>Search by username to add some.</div>'; return; }
  el.innerHTML = friends.map(function(f) {
    var now = Date.now();
    var isOnline = f.lastActive && (now - new Date(f.lastActive).getTime() < 2 * 60 * 1000);
    var statusDot = isOnline ? '<span class="fp-online-dot"></span>' : '<span class="fp-offline-dot"></span>';
    var statusText = isOnline ? 'Online now' : (f.lastActive ? 'Active ' + timeAgo(new Date(f.lastActive)) : (f.lastSync ? 'Synced ' + timeAgo(new Date(f.lastSync)) : 'Never active'));
    var friendedDate = f.friendedAt ? new Date(f.friendedAt) : null;
    var friendedText = (friendedDate && !isNaN(friendedDate.getTime())) ? 'Friends since ' + friendedDate.toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' }) : '';
    var bodies = f.bodies || { physical:1, astral:1, mental:1 };
    var bodyTotal = (bodies.physical||1) + (bodies.astral||1) + (bodies.mental||1);
    return '<div class="fp-friend-card" data-friend-id="' + escHtml(f.userId) + '" style="cursor:pointer;">'
      + '<div style="display:flex;justify-content:space-between;align-items:flex-start;">'
      + '<div><div class="fp-friend-name" style="display:flex;align-items:center;gap:7px;">' + statusDot + '@' + escHtml(f.username) + '</div>'
      + '<div class="fp-friend-active">' + statusText + '</div>'
      + (friendedText ? '<div class="fp-friend-since">' + friendedText + '</div>' : '')
      + '</div>'
      + '<button class="fp-remove-btn" onclick="removeFriend(\'' + f.userId + '\')">Remove</button>'
      + '</div>'
      + (statusIsFresh(f.status) ? '<div class="fp-friend-status">“' + escHtml(f.status.text) + '”</div>' : '')
      + '<div class="fp-friend-stats">'
      + '<div class="fp-stat"><div class="fp-stat-val">' + (f.streak||0) + '</div><div class="fp-stat-lbl">Streak</div></div>'
      + '<div class="fp-stat"><div class="fp-stat-val">' + (f.concLevel||1) + '</div><div class="fp-stat-lbl">Conc Lvl</div></div>'
      + '<div class="fp-stat"><div class="fp-stat-val">' + bodyTotal + '</div><div class="fp-stat-lbl">Body Pts</div></div>'
      + '<div class="fp-stat"><div class="fp-stat-val">' + Math.floor(f.akasha||0) + '</div><div class="fp-stat-lbl">Akasha</div></div>'
      + '<div class="fp-stat"><div class="fp-stat-val">' + (f.bardonStep||1) + '</div><div class="fp-stat-lbl">Step</div></div>'
      + '<div class="fp-stat"><div class="fp-stat-val">' + (f.concXp||0) + 's</div><div class="fp-stat-lbl">Focus</div></div>'
      + '</div></div>';
  }).join('');
}

function renderFriendRequests(requests, followReqs) {
  requests = requests || []; followReqs = followReqs || [];
  var sec = document.getElementById('fpRequestsSection');
  var el = document.getElementById('fpRequestsList');
  if (!sec || !el) return;
  if (!requests.length && !followReqs.length) { sec.style.display='none'; return; }
  sec.style.display='block';
  el.innerHTML = requests.map(function(r) {
    return '<div class="fp-request-row">'
      + '<span class="fp-user-name">@' + escHtml(r.username) + '</span>'
      + '<div style="display:flex;gap:6px;">'
      + '<button class="fp-accept-btn" onclick="acceptFriend(\'' + r.userId + '\')">Accept</button>'
      + '<button class="fp-decline-btn" onclick="declineFriend(\'' + r.userId + '\')">Decline</button>'
      + '</div></div>';
  }).join('') + followReqs.map(function(r) {
    return '<div class="fp-request-row">'
      + '<span class="fp-user-name">@' + escHtml(r.username) + ' <span style="color:var(--muted);font-size:9px;">wants to follow you</span></span>'
      + '<div style="display:flex;gap:6px;">'
      + '<button class="fp-accept-btn" onclick="approveFollow(\'' + escHtml(r.userId) + '\')">Approve</button>'
      + '<button class="fp-decline-btn" onclick="declineFollow(\'' + escHtml(r.userId) + '\')">Decline</button>'
      + '</div></div>';
  }).join('');
}

async function searchFriends() {
  var q = (document.getElementById('fpSearchInput').value || '').trim();
  var resultsEl = document.getElementById('fpSearchResults');
  if (!q || !authToken) return;
  resultsEl.innerHTML = '<div class="fp-empty">Searching…</div>';
  try {
    var res = await fetch(SYNC_API_URL + '/friends/search?q=' + encodeURIComponent(q), { headers: { 'Authorization': 'Bearer ' + authToken } });
    var data = await res.json();
    var users = data.users || [];
    if (!users.length) { resultsEl.innerHTML = '<div class="fp-empty">No users found.</div>'; return; }
    resultsEl.innerHTML = users.map(function(u) {
      return '<div class="fp-user-row">'
        + '<span class="fp-user-name">@' + escHtml(u.username) + '</span>'
        + '<div style="display:flex;gap:6px;">'
        + '<button class="fp-add-btn" onclick="followUser(\'' + escHtml(u.userId) + '\', this)">Follow</button>'
        + '<button class="fp-add-btn" onclick="sendFriendRequest(\'' + escHtml(u.username) + '\', this)">Add</button>'
        + '</div></div>';
    }).join('');
  } catch(e) { resultsEl.innerHTML = '<div class="fp-empty">Search failed.</div>'; }
}

async function sendFriendRequest(username, btn) {
  if (!authToken) return;
  if (btn) btn.disabled = true;
  try {
    var res = await fetch(SYNC_API_URL + '/friends/request', {
      method:'POST', headers:{'Content-Type':'application/json','Authorization':'Bearer ' + authToken},
      body: JSON.stringify({ username: username })
    });
    var data = await res.json();
    if (res.ok) { if (btn) { btn.textContent='Sent'; btn.style.opacity='.5'; } }
    else { if (btn) { btn.disabled=false; btn.textContent='Add'; } showToast(data.error || 'Request failed'); }
  } catch(e) { if (btn) { btn.disabled=false; } }
}

async function acceptFriend(requesterId) {
  if (!authToken) return;
  try {
    await fetch(SYNC_API_URL + '/friends/accept', {
      method:'POST', headers:{'Content-Type':'application/json','Authorization':'Bearer ' + authToken},
      body: JSON.stringify({ requesterId: requesterId })
    });
    loadFriendsPanel();
  } catch(e) {}
}

async function declineFriend(userId) {
  if (!authToken) return;
  try {
    await fetch(SYNC_API_URL + '/friends/decline', {
      method:'POST', headers:{'Content-Type':'application/json','Authorization':'Bearer ' + authToken},
      body: JSON.stringify({ userId: userId })
    });
    loadFriendsPanel();
  } catch(e) {}
}

async function removeFriend(userId, _c) {
  if (!authToken) return;
  if (!_c) { showConfirm('Remove Friend', 'They will be removed from your Streak Society.', function(){ removeFriend(userId, true); }); return; }
  try {
    await fetch(SYNC_API_URL + '/friends/decline', {
      method:'POST', headers:{'Content-Type':'application/json','Authorization':'Bearer ' + authToken},
      body: JSON.stringify({ userId: userId })
    });
    loadFriendsPanel();
  } catch(e) {}
}

function timeAgo(date) {
  var diff = Math.floor((Date.now() - date) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return Math.floor(diff/60) + 'm ago';
  if (diff < 86400) return Math.floor(diff/3600) + 'h ago';
  return Math.floor(diff/86400) + 'd ago';
}

// Wire up events
document.getElementById('fpBackBtn').addEventListener('click', closeFriendsPanel);
document.getElementById('fpSearchBtn').addEventListener('click', searchFriends);
document.getElementById('fpSearchInput').addEventListener('keydown', function(e) { if (e.key === 'Enter') searchFriends(); });
document.getElementById('fpFriendsList').addEventListener('click', function(e) {
  if (e.target.closest('.fp-remove-btn')) return;
  var card = e.target.closest('[data-friend-id]');
  if (card) openFriendProfile(card.getAttribute('data-friend-id'));
});

// Heartbeat — ping every 60 s while app is open and user is signed in
(function() {
  function sendHeartbeat() {
    if (!authToken) return;
    fetch(SYNC_API_URL + '/auth/heartbeat', { method:'POST', headers:{'Authorization':'Bearer ' + authToken} }).catch(function(){});
  }
  sendHeartbeat();
  setInterval(sendHeartbeat, 60000);
  // Tie this device's existing push subscription to the signed-in account so
  // DM pushes reach the right user (endpoint-unique upsert server-side).
  if (authToken && 'serviceWorker' in navigator) {
    navigator.serviceWorker.ready.then(function(reg) {
      return reg.pushManager.getSubscription();
    }).then(function(sub) {
      if (!sub) return;
      return fetch(SERVER_URL + '/api/social/push/register', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + authToken, 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription: sub.toJSON() })
      });
    }).catch(function() {});
  }
})();
