// ── THE LODGE — social feed (Phase 1: posts, likes, comments) ──
var LODGE_CACHE_KEY = 'presence_lodge_feed_v2';
var _lodgePosts = [];
var _lodgeCursor = null;
var _lodgeLoading = false;
var _lodgeSort = 'newest';

function _lodgeCachedList() {
  if (_lodgeSort !== 'newest') return [];
  try {
    var all = JSON.parse(localStorage.getItem(LODGE_CACHE_KEY));
    // Preserve the last version's Reflection cache during the one-time
    // migration, then keep separate instant-paint entries for both tabs.
    if (Array.isArray(all)) return _lodgeTab === 'note' ? all : [];
    var entry = all && all[_lodgeTab + ':' + _lodgeSort];
    return entry && Array.isArray(entry.posts) ? entry.posts : [];
  } catch(e) { return []; }
}
function _cacheLodgeFeed(tab, sort, posts) {
  if (sort !== 'newest') return;
  try {
    var all = JSON.parse(localStorage.getItem(LODGE_CACHE_KEY));
    if (!all || Array.isArray(all)) all = {};
    all[tab + ':' + sort] = { posts: (posts || []).slice(0, 20), updatedAt: Date.now() };
    localStorage.setItem(LODGE_CACHE_KEY, JSON.stringify(all));
  } catch(e) {}
}
function _warmLodgeFeed(tab) {
  if (!authToken || _lodgeCachedListFor(tab).length) return;
  fetch(SERVER_URL + '/api/social/feed?type=' + tab + '&sort=newest', { headers: { 'Authorization': 'Bearer ' + authToken } })
    .then(function(res) { return res.ok ? res.json() : null; })
    .then(function(data) { if (data && data.posts) _cacheLodgeFeed(tab, 'newest', data.posts); })
    .catch(function() {});
}
function _lodgeCachedListFor(tab) {
  var activeTab = _lodgeTab;
  _lodgeTab = tab;
  var posts = _lodgeCachedList();
  _lodgeTab = activeTab;
  return posts;
}
function warmLodgeFeeds() {
  _warmLodgeFeed('note');
  _warmLodgeFeed('blog');
}

var _lodgeUserFilter = null; // {userId, username} → viewing one practitioner's posts
var _lodgeTab = 'note';      // 'note' (280-char posts) | 'blog' (long-form)
function _lodgeSetTabUi() {
  document.querySelectorAll('#lodgeTabs [data-lodge-tab]').forEach(function(t) {
    t.classList.toggle('on', t.getAttribute('data-lodge-tab') === _lodgeTab);
  });
  var hint = document.getElementById('lodgeComposerHint');
  var cta = document.getElementById('lodgeComposerCta');
  if (hint) hint.textContent = _lodgeTab === 'blog' ? 'Begin a longer piece...' : 'Share what is present for you today...';
  if (cta) cta.textContent = _lodgeTab === 'blog' ? 'New essay' : 'New reflection';
}
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
  _lodgeUserFilter = null;
  document.getElementById('lodgeTitle').textContent = '';
  document.getElementById('lodgeComposer').style.display = '';
  document.getElementById('lodgeBanner').style.display = '';
  document.getElementById('lodgeFeedNav').style.display = '';
  _lodgeCloseSortMenu();
  _lodgeSetTabUi();
  _lodgeSetSortUi();
  showScreen('lodgeScreen');
  // Instant paint from cache, then network refresh (established pattern).
  _lodgePosts = _lodgeCachedList();
  _lodgeLoading = !_lodgePosts.length;
  renderLodgeFeed();
  loadLodgeFeed();
  warmLodgeFeeds();
  loadLodgeNotifs();
  loadChatList(false);
}

// One practitioner's full post history on its own page.
function openLodgeUser(userId, username) {
  _lodgeUserFilter = { userId: userId, username: username };
  document.getElementById('lodgeTitle').textContent = '@' + username;
  document.getElementById('lodgeComposer').style.display = 'none';
  document.getElementById('lodgeBanner').style.display = 'none';
  document.getElementById('lodgeFeedNav').style.display = 'none';
  _lodgeCloseSortMenu();
  showScreen('lodgeScreen');
  _lodgePosts = []; _lodgeCursor = null; _lodgeLoading = true;
  renderLodgeFeed();
  loadLodgeFeed();
}

async function loadLodgeFeed(cursor) {
  if (!authToken) { _lodgePosts = []; _lodgeLoading = false; renderLodgeFeed(); return; }
  if (!cursor && !_lodgePosts.length) { _lodgeLoading = true; renderLodgeFeed(); }
  try {
    var params = [];
    if (!_lodgeUserFilter && _lodgeTab === 'blog') params.push('type=blog');
    else if (!_lodgeUserFilter) params.push('type=note');
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
    if (!cursor && !_lodgeUserFilter) _cacheLodgeFeed(_lodgeTab, _lodgeSort, _lodgePosts);
  } catch(e) { console.warn('Lodge feed failed', e); }
  finally { _lodgeLoading = false; renderLodgeFeed(); }
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
function _lodgePostHtml(p) {
  var hue = _lodgeHue(p.username);
  var bodyHtml;
  if (p.type === 'blog') {
    var titleHtml = p.title ? '<div class="lodge-blog-title">' + escHtml(p.title) + '</div>' : '';
    var raw = p.text || '';
    if (raw.length > 280) {
      bodyHtml = titleHtml
        + '<div class="lodge-post__text" data-blog-preview>' + escHtml(raw.slice(0, 280)) + '…</div>'
        + '<div class="lodge-post__text" data-blog-full style="display:none;">' + escHtml(raw) + '</div>'
        + '<button class="lodge-act lodge-read-more" data-blog-more>Continue reading</button>';
    } else {
      bodyHtml = titleHtml + '<div class="lodge-post__text">' + escHtml(raw) + '</div>';
    }
  } else {
    bodyHtml = '<div class="lodge-post__text">' + escHtml(p.text || '') + '</div>';
  }
  var kind = p.type === 'blog' ? 'Essay' : 'Reflection';
  // Card layout mirrors the reference: like control stacked in the top-right
  // of the head, kind label as a brand mark bottom-left, comments/moderation
  // on the footer's right edge.
  return '<article class="lodge-post' + (p.type === 'blog' ? ' is-blog' : '') + '" data-post-id="' + escHtml(p.id) + '" style="--lodge-hue:' + hue[0] + ';">'
    + '<div class="lodge-post__head">'
    + '<div style="display:flex;align-items:center;gap:11px;min-width:0;flex:1;cursor:pointer;" data-lodge-user="' + escHtml(p.userId) + '" data-lodge-uname="' + escHtml(p.username || '?') + '">'
    + _lodgeRingHtml(p.username, p.profilePic)
    + '<div class="lodge-post__identity"><div class="lodge-post__name">@' + escHtml(p.username || '?') + '</div>'
    + '<div class="lodge-post__time">' + timeAgo(new Date(p.createdAt)) + '</div></div></div>'
    + '<button class="lodge-act lodge-post__vote' + (p.likedByMe ? ' liked' : '') + '" data-lodge-like>' + (p.likedByMe ? '♥' : '♡')
    + ' <span data-like-count>' + (p.likeCount || 0) + '</span></button>'
    + '</div>'
    + '<div class="lodge-post__body">' + bodyHtml + '</div>'
    + '<div class="lodge-post__bar">'
    + '<div class="lodge-post__kind">' + kind + '</div>'
    + '<button class="lodge-act" data-lodge-comments>◌ <span data-comment-count>' + (p.commentCount || 0) + '</span></button>'
    + (p.mine ? '<button class="lodge-act lodge-del" data-lodge-del aria-label="Delete post">✕</button>'
               : '<button class="lodge-act lodge-del" data-lodge-report aria-label="Report post">⚑</button>')
    + '</div>'
    + '<div class="lodge-comments"><div data-comment-list></div>'
    + '<div class="lodge-crow"><input class="lodge-cinput" maxlength="280" placeholder="Add a comment…"/>'
    + '<button class="lodge-csend">Send</button></div>'
    + '</div></article>';
}

function renderLodgeFeed() {
  var feed = document.getElementById('lodgeFeed');
  var empty = document.getElementById('lodgeEmpty');
  var more = document.getElementById('lodgeMore');
  if (!feed) return;
  feed.innerHTML = _lodgeLoading && !_lodgePosts.length
    ? '<div class="lodge-skeleton"></div><div class="lodge-skeleton"></div><div class="lodge-skeleton"></div>'
    : _lodgePosts.map(_lodgePostHtml).join('');
  var emptyTitle = _lodgeUserFilter ? 'No shared writing yet'
    : _lodgeTab === 'blog' ? 'The essay room is quiet' : 'The record is waiting';
  var emptySub = _lodgeUserFilter ? 'This practitioner has not published anything here.'
    : _lodgeTab === 'blog' ? 'Begin the first longer piece, or return when another practitioner has written.'
    : 'Share a reflection above, or follow practitioners to bring their writing into your Lodge.';
  empty.innerHTML = '<div class="lodge-empty__mark">✒</div><div class="lodge-empty__title">' + emptyTitle + '</div><div class="lodge-empty__sub">' + emptySub + '</div>';
  empty.style.display = (!_lodgeLoading && !_lodgePosts.length) ? '' : 'none';
  more.style.display = (!_lodgeLoading && _lodgeCursor) ? '' : 'none';
}

function _lodgeCommentHtml(c) {
  return '<div class="lodge-comment" data-comment-id="' + escHtml(c.id) + '">'
    + '<div class="lodge-comment__name"><span style="color:' + _lodgeHue(c.username)[0] + ';opacity:.8;">@' + escHtml(c.username || '?') + '</span> · ' + timeAgo(new Date(c.createdAt))
    + (c.mine ? ' <button class="lodge-act lodge-del" data-comment-del="' + escHtml(c.id) + '" style="display:inline-flex;padding:0 4px;" aria-label="Delete comment">✕</button>' : '')
    + '</div><div class="lodge-comment__text">' + escHtml(c.text || '') + '</div></div>';
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

async function toggleLodgeComments(pid, card) {
  var box = card.querySelector('.lodge-comments');
  var open = box.style.display === 'block';
  box.style.display = open ? 'none' : 'block';
  if (open) return;
  var list = card.querySelector('[data-comment-list]');
  list.innerHTML = '<div class="lodge-comment__name">Loading…</div>';
  try {
    var res = await fetch(SERVER_URL + '/api/social/posts/' + pid + '/comments', {
      headers: { 'Authorization': 'Bearer ' + authToken }
    });
    var d = await res.json();
    list.innerHTML = (d.comments || []).map(_lodgeCommentHtml).join('');
  } catch(e) { list.innerHTML = ''; }
}

async function sendLodgeComment(pid, card) {
  var input = card.querySelector('.lodge-cinput');
  var text = (input.value || '').trim();
  if (!text) return;
  try {
    var res = await fetch(SERVER_URL + '/api/social/posts/' + pid + '/comments', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + authToken, 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: text })
    });
    var d = await res.json();
    if (!res.ok) { showToast(d.error || 'Comment failed'); return; }
    input.value = '';
    card.querySelector('[data-comment-list]').insertAdjacentHTML('beforeend', _lodgeCommentHtml(d.comment));
    var cnt = card.querySelector('[data-comment-count]');
    cnt.textContent = (parseInt(cnt.textContent, 10) || 0) + 1;
  } catch(e) { showToast('Comment failed'); }
}

async function deleteLodgePost(pid, card) {
  if (!window.confirm('Delete this post?')) return;
  try {
    var res = await fetch(SERVER_URL + '/api/social/posts/' + pid, {
      method: 'DELETE', headers: { 'Authorization': 'Bearer ' + authToken }
    });
    if (!res.ok) return;
    card.remove();
    _lodgePosts = _lodgePosts.filter(function(p) { return p.id !== pid; });
    if (_lodgeSort === 'newest') try { localStorage.setItem(LODGE_CACHE_KEY, JSON.stringify(_lodgePosts.slice(0, 20))); } catch(e) {}
    if (!_lodgePosts.length) renderLodgeFeed();
  } catch(e) {}
}

async function deleteLodgeComment(cid, pid, card) {
  try {
    var res = await fetch(SERVER_URL + '/api/social/comments/' + cid, {
      method: 'DELETE', headers: { 'Authorization': 'Bearer ' + authToken }
    });
    if (!res.ok) return;
    var row = card.querySelector('[data-comment-id="' + cid + '"]');
    if (row) row.remove();
    var cnt = card.querySelector('[data-comment-count]');
    cnt.textContent = Math.max(0, (parseInt(cnt.textContent, 10) || 1) - 1);
  } catch(e) {}
}

document.getElementById('lodgeFeed').addEventListener('click', function(e) {
  var card = e.target.closest('.lodge-post');
  if (!card) return;
  var pid = card.getAttribute('data-post-id');
  var uhead = e.target.closest('[data-lodge-user]');
  if (uhead) { openLodgeUser(uhead.getAttribute('data-lodge-user'), uhead.getAttribute('data-lodge-uname')); return; }
  var more = e.target.closest('[data-blog-more]');
  if (more) {
    var pv = card.querySelector('[data-blog-preview]'), fl = card.querySelector('[data-blog-full]');
    var expanded = fl.style.display !== 'none';
    fl.style.display = expanded ? 'none' : '';
    pv.style.display = expanded ? '' : 'none';
    more.textContent = expanded ? 'Continue reading' : 'Show less';
    return;
  }
  var cdel = e.target.closest('[data-comment-del]');
  if (cdel) { deleteLodgeComment(cdel.getAttribute('data-comment-del'), pid, card); return; }
  if (e.target.closest('[data-like-count]')) { openLikers(pid); return; }
  if (e.target.closest('[data-lodge-like]')) { toggleLodgeLike(pid, card); return; }
  if (e.target.closest('[data-lodge-comments]')) { toggleLodgeComments(pid, card); return; }
  if (e.target.closest('[data-lodge-del]')) { deleteLodgePost(pid, card); return; }
  if (e.target.closest('[data-lodge-report]')) { reportLodgeContent('post', pid); return; }
  if (e.target.closest('.lodge-csend')) { sendLodgeComment(pid, card); return; }
});
document.getElementById('lodgeComposer').addEventListener('click', function() {
  if (_lodgeTab === 'blog') openBlogEditor(); else openStatusEditor();
});
document.getElementById('lodgeTabs').addEventListener('click', function(e) {
  var t = e.target.closest('[data-lodge-tab]');
  if (!t || t.getAttribute('data-lodge-tab') === _lodgeTab) return;
  _lodgeTab = t.getAttribute('data-lodge-tab');
  _lodgeSetTabUi();
  _lodgePosts = _lodgeCachedList(); _lodgeCursor = null; _lodgeLoading = !_lodgePosts.length;
  renderLodgeFeed();
  loadLodgeFeed();
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

// Blog (essay) editor
function openBlogEditor() {
  if (!authToken) { showToast('Sign in to write'); return; }
  var ov = document.getElementById('blogOverlay');
  document.getElementById('blogTitleInput').value = '';
  document.getElementById('blogInput').value = '';
  document.getElementById('blogCount').textContent = '0';
  ov.classList.add('on');
  setTimeout(function() { try { document.getElementById('blogTitleInput').focus(); } catch(e) {} }, 50);
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
        body: JSON.stringify({ type: 'blog', title: document.getElementById('blogTitleInput').value, text: text })
      });
      var dd = await res.json();
      if (!res.ok) { showToast(dd.error || 'Publish failed'); return; }
      ov.classList.remove('on');
      showToast('Published to the Lodge', 1800, 'gold');
      loadLodgeFeed();
    } catch(e) { showToast('Publish failed'); }
  });
})();
document.getElementById('lodgeBack').addEventListener('click', function() {
  if (_lodgeUserFilter) { openLodge(); return; }
  showScreen('homeScreen');
});
document.getElementById('lodgeMore').addEventListener('click', function() { if (_lodgeCursor) loadLodgeFeed(_lodgeCursor); });
document.getElementById('drawerLodge').addEventListener('click', function() {
  closeDrawer();
  if (!authToken) { showToast('Sign in to enter the Lodge'); return; }
  openLodge();
});
// Prime the two Lodge tabs after state restoration, long before the user
// opens the drawer. This makes the first visit feel like a native screen.
window.addEventListener('load', function() { setTimeout(warmLodgeFeeds, 700); });
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
    var res = await fetch(SERVER_URL + '/api/social/users/' + encodeURIComponent(f.userId) + '/summary', {
      headers: { 'Authorization': 'Bearer ' + authToken }
    });
    if (!res.ok) { if (!cached) box.style.display = 'none'; return; }
    var s = await res.json();
    cacheFriendSocial(f.userId, s);
    _applyFriendSocial(f, s);
  } catch(e) { if (!cached) box.style.display = 'none'; }
}

// Notifications bell.
var _lodgeNotifs = [];
var NOTIF_COPY = { like: 'liked your post', comment: 'commented on your post', follow: 'now follows you', follow_req: 'requested to follow you', approved: 'approved your follow request', dm: 'sent you a message', friend: 'is now your friend — you follow each other' };
async function loadLodgeNotifs() {
  if (!authToken) return;
  try {
    var res = await fetch(SERVER_URL + '/api/social/notifications', { headers: { 'Authorization': 'Bearer ' + authToken } });
    if (!res.ok) return;
    var d = await res.json();
    _lodgeNotifs = d.notifications || [];
    var b = document.getElementById('lodgeBellBadge');
    if (d.unseen > 0) { b.style.display = ''; b.textContent = d.unseen > 9 ? '9+' : d.unseen; }
    else b.style.display = 'none';
  } catch(e) {}
}
function openLodgeNotifs() {
  var ov = document.getElementById('notifOverlay');
  var list = document.getElementById('notifList');
  list.innerHTML = _lodgeNotifs.length ? _lodgeNotifs.map(function(n) {
    var isFriend = n.kind === 'friend';
    return '<div class="likers-row"' + (isFriend ? ' style="color:#7eb8a4;"' : '') + '>'
      + (isFriend ? '✦ ' : '') + '@' + escHtml(n.username || '?')
      + ' <span style="color:var(--muted);">' + (NOTIF_COPY[n.kind] || n.kind) + ' · ' + timeAgo(new Date(n.createdAt)) + '</span></div>';
  }).join('') : '<div class="likers-row private">Nothing yet.</div>';
  ov.classList.add('on');
  fetch(SERVER_URL + '/api/social/notifications/seen', { method: 'POST', headers: { 'Authorization': 'Bearer ' + authToken } }).catch(function() {});
  document.getElementById('lodgeBellBadge').style.display = 'none';
}
document.getElementById('lodgeBell').addEventListener('click', openLodgeNotifs);
(function() {
  var ov = document.getElementById('notifOverlay');
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
      warmChatMessages(_chatConversations.slice(0, 6));
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
  loadChatList(true);
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
function _fetchChatMsgs(convId) {
  if (_chatMessageRequests[convId]) return _chatMessageRequests[convId];
  _chatMessageRequests[convId] = fetch(SERVER_URL + '/api/social/conversations/' + convId + '/messages', { headers: { 'Authorization': 'Bearer ' + authToken } })
    .then(function(res) {
      if (!res.ok) throw new Error('Message request failed');
      return res.json();
    })
    .then(function(data) {
      var messages = data.messages || [];
      _chatMessageCache[convId] = messages;
      return messages;
    })
    .finally(function() { delete _chatMessageRequests[convId]; });
  return _chatMessageRequests[convId];
}
function warmChatMessages(conversations) {
  (conversations || []).forEach(function(conversation) {
    if (conversation && conversation.id && !_chatMessageCache[conversation.id]) _fetchChatMsgs(conversation.id).catch(function() {});
  });
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
