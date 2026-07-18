// ── PROFILE ─────────────────────────────────────────────
var PROFILE_PIC_KEY = 'presence_profile_pic';
function getProfilePic() { try { return localStorage.getItem(PROFILE_PIC_KEY) || ''; } catch(e) { return ''; } }
function setProfilePic(dataUrl) {
  try { if (dataUrl) localStorage.setItem(PROFILE_PIC_KEY, dataUrl); else localStorage.removeItem(PROFILE_PIC_KEY); } catch(e) {}
  if (dataUrl && authToken) {
    fetch(SYNC_API_URL + '/profile-pic', {
      method: 'PUT',
      headers: { 'Authorization': 'Bearer ' + authToken, 'Content-Type': 'application/json' },
      body: JSON.stringify({ pic: dataUrl })
    }).catch(function() {});
  }
}

// Apply the identity fields the server returns on /sync/pull (and sign-in) so
// the signed-in account's own avatar, username, and privacy flag follow them
// across devices. Server is authoritative here — the pic is pushed immediately
// on change, so adopting the server copy on pull can't lose a newer local one.
function applyAccountFields(acct) {
  if (!acct) return;
  if (typeof acct.profilePic === 'string' && acct.profilePic && getProfilePic() !== acct.profilePic) {
    try { localStorage.setItem(PROFILE_PIC_KEY, acct.profilePic); } catch(e) {}
    if (typeof renderProfile === 'function') { try { renderProfile(); } catch(e) {} }
  }
  if (typeof acct.isPrivate === 'boolean') {
    try { localStorage.setItem(PRIVATE_PROFILE_KEY, acct.isPrivate ? '1' : '0'); } catch(e) {}
  }
  if (acct.username && !authUsername) {
    authUsername = acct.username;
    try { localStorage.setItem('presence_auth_username', authUsername); } catch(e) {}
  }
  // Daily status: adopt the server copy when it's at least as recent as the local
  // one (updatedAt is monotonic, and a cleared status carries a newer timestamp
  // with empty text, so clears propagate too).
  if (acct.status && typeof acct.status.text === 'string') {
    var _loc = getMyStatus();
    var _srvT = acct.status.updatedAt ? new Date(acct.status.updatedAt).getTime() : 0;
    var _locT = (_loc && _loc.updatedAt) ? new Date(_loc.updatedAt).getTime() : 0;
    if (_srvT >= _locT) {
      try { localStorage.setItem(STATUS_KEY, JSON.stringify({ text: acct.status.text, updatedAt: acct.status.updatedAt })); } catch(e) {}
    }
  }
}

// ── DAILY STATUS ────────────────────────────────────────
// A short message shared with friends. Stored on the user doc server-side (like
// the avatar), surfaced to friends via /friends/list, and synced to the user's
// own devices via applyAccountFields. Empty text with a timestamp = "cleared".
var STATUS_KEY = 'presence_status_v1';
var STATUS_MAX = 280;
var STATUS_FRESH_MS = 3 * 24 * 60 * 60 * 1000; // a status older than 3 days stops showing
function getMyStatus() {
  try { var s = JSON.parse(localStorage.getItem(STATUS_KEY)); return (s && typeof s.text === 'string') ? s : null; } catch(e) { return null; }
}
function statusIsFresh(s) {
  return !!(s && s.text && s.updatedAt && (Date.now() - new Date(s.updatedAt).getTime() < STATUS_FRESH_MS));
}
async function setMyStatus(text) {
  text = String(text || '').replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, STATUS_MAX);
  // Non-empty status → a Lodge post (server sets user.status as a side effect).
  // Clearing (empty text) only clears the status; it never creates a post.
  if (authToken) {
    var res = await (text
      ? fetch(SERVER_URL + '/api/social/posts', {
          method: 'POST',
          headers: { 'Authorization': 'Bearer ' + authToken, 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: text })
        })
      : fetch(SYNC_API_URL + '/status', {
          method: 'PUT',
          headers: { 'Authorization': 'Bearer ' + authToken, 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: '' })
        }));
    var data = await res.json().catch(function() { return {}; });
    if (!res.ok) throw new Error(data.error || 'Status could not be shared');
  }
  var s = { text: text, updatedAt: new Date().toISOString() };
  try { localStorage.setItem(STATUS_KEY, JSON.stringify(s)); } catch(e) {}
  return s;
}
function renderMyStatus(signedIn) {
  var sec = document.getElementById('profStatusSection');
  var btn = document.getElementById('profStatusBtn');
  if (!sec || !btn) return;
  if (!signedIn) { sec.style.display = 'none'; return; }
  sec.style.display = '';
  var s = getMyStatus();
  if (statusIsFresh(s)) {
    btn.innerHTML = '<div class="prof-status__text">' + escHtml(s.text) + '</div>'
      + '<div class="prof-status__meta"><span>' + timeAgo(new Date(s.updatedAt)) + '</span><span class="prof-status__edit">Edit</span></div>';
  } else {
    btn.innerHTML = '<div class="prof-status__text prof-status__text--empty">Share what’s present for you today…</div>'
      + '<div class="prof-status__meta"><span></span><span class="prof-status__edit">Add status</span></div>';
  }
}
function openStatusEditor() {
  if (!authToken) { showToast('Sign in to share a status'); return; }
  var ov = document.getElementById('statusOverlay');
  var ta = document.getElementById('statusInput');
  var cnt = document.getElementById('statusCount');
  if (!ov || !ta) return;
  var cur = getMyStatus();
  ta.value = (cur && cur.text) ? cur.text : '';
  if (cnt) cnt.textContent = ta.value.length;
  ov.classList.add('on');
  setTimeout(function() { try { ta.focus(); } catch(e) {} }, 50);
}
function closeStatusEditor() {
  var ov = document.getElementById('statusOverlay');
  if (ov) ov.classList.remove('on');
}
// Wire the status editor once the DOM exists. This script block runs during
// parse, long before the overlay markup further down the page, so binding must
// wait for DOMContentLoaded or the listeners attach to null and silently do
// nothing (counter stuck at 0, Save inert).
function _wireStatusEditor() {
  var btn = document.getElementById('profStatusBtn');
  if (btn) btn.addEventListener('click', openStatusEditor);
  var ta = document.getElementById('statusInput');
  var cnt = document.getElementById('statusCount');
  if (ta && cnt) ta.addEventListener('input', function() { cnt.textContent = ta.value.length; });
  function signedInNow() { return !!(syncEnabled && (authEmail || authUsername)); }
  var save = document.getElementById('statusSaveBtn');
  if (save) save.addEventListener('click', async function() {
    if (save.disabled) return;
    save.disabled = true;
    try {
      var s = await setMyStatus(ta ? ta.value : '');
      closeStatusEditor();
      renderMyStatus(signedInNow());
      showToast('Status shared', 1800, 'gold');
      var lodgeOpen = document.getElementById('lodgeScreen').classList.contains('active');
      if (lodgeOpen && typeof loadLodgeFeed === 'function') loadLodgeFeed();
    } catch(e) { showToast(e.message || 'Status could not be shared'); }
    finally { save.disabled = false; }
  });
  var clr = document.getElementById('statusClearBtn');
  if (clr) clr.addEventListener('click', async function() {
    try {
      await setMyStatus('');
      if (ta) ta.value = '';
      if (cnt) cnt.textContent = '0';
      closeStatusEditor();
      renderMyStatus(signedInNow());
      showToast('Status cleared', 1600);
    } catch(e) { showToast(e.message || 'Status could not be cleared'); }
  });
  var cancel = document.getElementById('statusCancelBtn');
  if (cancel) cancel.addEventListener('click', closeStatusEditor);
  var ov = document.getElementById('statusOverlay');
  if (ov) ov.addEventListener('click', function(e) { if (e.target === ov) closeStatusEditor(); });
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', _wireStatusEditor);
else _wireStatusEditor();

// ── PROFILE PRIVACY ─────────────────────────────────────
// Local flag mirrors the server's user.isPrivate. When on, the account is
// dropped from friend search server-side (see /friends/search). Hydrated from
// the sign-in response so it follows the account across devices.
var PRIVATE_PROFILE_KEY = 'presence_private_profile';
function isProfilePrivate() { try { return localStorage.getItem(PRIVATE_PROFILE_KEY) === '1'; } catch(e) { return false; } }
function setProfilePrivate(on) {
  try { localStorage.setItem(PRIVATE_PROFILE_KEY, on ? '1' : '0'); } catch(e) {}
  if (authToken) {
    fetch(SYNC_API_URL + '/privacy', {
      method: 'PUT',
      headers: { 'Authorization': 'Bearer ' + authToken, 'Content-Type': 'application/json' },
      body: JSON.stringify({ isPrivate: !!on })
    }).catch(function() {});
  }
}

function _profOvItem(icon, val, lbl) {
  return '<div class="prof-ov-item"><span class="prof-ov-item__icon">' + icon + '</span>'
    + '<div><div class="prof-ov-item__val">' + val + '</div>'
    + '<div class="prof-ov-item__lbl">' + lbl + '</div></div></div>';
}

function renderProfile() {
  var signedIn = !!(syncEnabled && (authEmail || authUsername));
  var display = signedIn ? (authUsername || (authEmail ? authEmail.split('@')[0] : 'Account')) : 'Guest';

  document.getElementById('profDisplayName').textContent = display;
  var handleEl = document.getElementById('profHandle');
  handleEl.textContent = signedIn ? (authUsername ? '@' + authUsername : (authEmail || '')) : 'Not signed in';
  var fcEl = document.getElementById('profFollowCounts');
  if (fcEl) {
    if (signedIn && authToken) {
      // Paint instantly from the last-known counts (same pattern as friend
      // streaks below), then refresh from the network — otherwise this sits
      // blank for a beat every time Profile opens while the request round-trips.
      var cachedSummary = getCachedFollowSummary();
      fcEl.textContent = cachedSummary ? (cachedSummary.followers + ' followers · ' + cachedSummary.following + ' following') : '';
      fetch(SERVER_URL + '/api/social/users/me/summary', { headers: { 'Authorization': 'Bearer ' + authToken } })
        .then(function(r) { return r.json(); })
        .then(function(s) {
          if (s && typeof s.followers === 'number') {
            fcEl.textContent = s.followers + ' followers · ' + s.following + ' following';
            cacheFollowSummary(s);
          }
        })
        .catch(function() {});
    } else {
      fcEl.textContent = '';
    }
  }

  // Avatar (uploaded picture or initial)
  var av = document.getElementById('profAvatar');
  var init = document.getElementById('profAvatarInitial');
  var pic = getProfilePic();
  var _sp = safeProfilePic(pic);
  if (_sp) {
    av.classList.add('has-pic');
    av.style.backgroundImage = 'url("' + _sp + '")';
  } else {
    av.classList.remove('has-pic');
    av.style.backgroundImage = '';
    init.textContent = (display[0] || '◎');
  }

  // CTA
  var cta = document.getElementById('profCtaBtn');
  if (!signedIn) { cta.textContent = 'Sign In'; cta.style.display = ''; }
  else if (!pic) { cta.textContent = 'Add Profile Picture'; cta.style.display = ''; }
  else { cta.style.display = 'none'; }

  // Overview
  var totalXP = (state.xp || 0) + (concState.xp || 0);
  var ov = document.getElementById('profOverview');
  ov.innerHTML =
      _profOvItem('🔥', (state.streak || 0) + (state.streak === 1 ? ' day' : ' days'), 'Streak')
    + _profOvItem('⚡', totalXP.toLocaleString() + ' XP', 'Total Earned')
    + _profOvItem('<span style="color:var(--accent);">◎</span>', 'Level ' + state.level, getRankTitle(state.level))
    + _profOvItem('<span style="color:#d4956e;">◉</span>', 'Level ' + concState.level, getConcRank(concState.level));

  renderMyStatus(signedIn);
  renderProfileFriendStreaks(signedIn);
  renderProfileBadges();
  renderProfileAchievements();
}

function renderProfileFriendStreaks(signedIn) {
  var el = document.getElementById('profFriendStreaks');
  if (!el) return;
  if (!signedIn || !authToken) {
    var html = '';
    for (var i = 0; i < 5; i++) {
      html += '<div class="prof-friend"><button class="prof-friend__ring prof-friend__ring--add" data-prof-addfriend="1">+</button></div>';
    }
    el.innerHTML = html;
    return;
  }
  // Paint instantly from the persisted cache (avatars and all), then refresh
  // from the network. First-ever load with no cache shows just the Add button.
  var cached = getCachedFriendsList();
  el.innerHTML = cached.length ? _friendStripHtml(cached)
    : '<div class="prof-friend"><button class="prof-friend__ring prof-friend__ring--add" data-prof-addfriend="1">+</button><div class="prof-friend__name">Add</div></div>';
  loadProfileFriendStreaks();
}

function _friendStripHtml(friends) {
  var html = '';
  (friends || []).slice(0, 4).forEach(function(f) {
    var nm = f.username || '?';
    html += '<div class="prof-friend" data-friend-id="' + escHtml(f.userId) + '">'
      + _friendRingHtml(nm[0] || '?', f.profilePic || '')
      + '<div class="prof-friend__name">@' + escHtml(nm) + '</div>'
      + '<div class="prof-friend__streak">🔥 ' + (f.streak || 0) + '</div>'
      + '</div>';
  });
  html += '<div class="prof-friend"><button class="prof-friend__ring prof-friend__ring--add" data-prof-addfriend="1">+</button><div class="prof-friend__name">Add</div></div>';
  return html;
}

async function loadProfileFriendStreaks() {
  if (!authToken) return;
  try {
    var res = await fetch(SYNC_API_URL + '/friends/list', { headers: { 'Authorization': 'Bearer ' + authToken } });
    var data = await res.json();
    cacheFriends(data.friends || []);
    var el = document.getElementById('profFriendStreaks');
    if (!el) return;
    el.innerHTML = _friendStripHtml(data.friends || []);
  } catch(e) {}
}

// Profile · Monthly Badges — this month's set, earned ones lit.
function renderProfileBadges() {
  var el = document.getElementById('profBadges');
  if (!el) return;
  if (typeof achEnsureMonth !== 'function') return;
  achSeed(); achEnsureMonth();
  el.innerHTML = ACH_GROUPS[0].items.map(function(b) {
    var earned = !!achState.monthly.earned[b.id];
    var medal = b.target >= 1000 ? (b.target / 1000) + 'k' : b.target;
    return '<div class="prof-badge' + (earned ? ' prof-badge--earned' : ' prof-badge--locked') + '" style="--gc:' + ACH_COLORS.monthly + ';cursor:pointer;" data-ach="' + b.id + '" title="' + b.name + '">'
      + achIconSvg('monthly') + '<b>' + medal + '</b></div>';
  }).join('');
}

// Profile · Achievements — the four lifetime badges nearest completion
// (earned ones fill in first if fewer than four are in progress).
function renderProfileAchievements() {
  var el = document.getElementById('profAchievements');
  if (!el) return;
  if (typeof achProviders !== 'function') return;
  achSeed(); achEnsureMonth();
  var p = achProviders();
  var pending = [], done = [];
  ACH_GROUPS.forEach(function(g) {
    if (g.monthly) return;
    g.items.forEach(function(b) {
      var item = { b: b, g: g, pct: Math.min(100, Math.round((p[b.key] || 0) / b.target * 100)) };
      if (achState.earned[b.id]) done.push(item); else pending.push(item);
    });
  });
  pending.sort(function(x, y) { return y.pct - x.pct; });
  done.sort(function(x, y) { return (achState.earned[y.b.id] || 0) - (achState.earned[x.b.id] || 0); });
  var picks = pending.slice(0, 4);
  while (picks.length < 4 && done.length) picks.push(done.shift());
  el.innerHTML = picks.map(function(it) {
    var earned = !!achState.earned[it.b.id];
    var medal = it.b.group === 'step' ? ['','','II','III','IV','V','VI','VII','VIII','IX','X'][it.b.target]
      : it.b.target >= 1000 ? (it.b.target / 1000) + 'k' : it.b.target;
    return '<div class="prof-ach-item" data-ach="' + it.b.id + '" style="cursor:pointer;' + (earned || it.pct > 0 ? 'opacity:1;' : '') + '">'
      + '<div class="prof-ach-item__disc" style="--gc:' + (ACH_COLORS[it.g.id] || '#e8c87a') + (earned ? ';border-color:rgba(232,200,122,.6);' : '') + '">'
      + achIconSvg(it.g.id) + '<b>' + medal + '</b></div>'
      + '<div class="prof-ach-item__lbl' + (earned ? ' prof-ach-item__lbl--earned' : it.pct > 0 ? ' prof-ach-item__lbl--active' : '') + '">' + (earned ? 'Earned' : it.pct + '%') + '</div></div>';
  }).join('');
}
// "›" buttons on both profile sections open the full Achievements screen.
['profBadgesMore', 'profAchMore'].forEach(function(id) {
  var btn = document.getElementById(id);
  if (btn) btn.addEventListener('click', function() {
    if (typeof achEvaluate === 'function') achEvaluate(true);
    renderAchScreen(); showScreen('achScreen');
  });
});

// A profile picture must be a clean base64 image data-URL and nothing else.
// escHtml only escapes <>, so a pic containing a quote could otherwise break
// out of a style="…url(pic)…" attribute and inject an event handler (stored
// XSS via a friend's avatar). Returns '' for anything that doesn't match.
function safeProfilePic(pic) {
  return (typeof pic === 'string' && /^data:image\/(png|jpe?g|gif|webp);base64,[A-Za-z0-9+/=]+$/i.test(pic)) ? pic : '';
}
function _friendRingHtml(initial, pic) {
  var sp = safeProfilePic(pic);
  if (sp) {
    return '<div class="prof-friend__ring prof-friend__ring--filled" style="background-image:url(\'' + sp + '\');background-size:cover;background-position:center top;color:transparent;font-size:0;"></div>';
  }
  return '<div class="prof-friend__ring prof-friend__ring--filled">' + escHtml(String(initial || '?').toUpperCase()[0]) + '</div>';
}

// ── Friend profile view (mirrors the user's own Profile layout) ──
var _friendProfileCache = {};
// Persist the friends list (avatars included) so every friend surface can paint
// instantly from cache on open, instead of leaving blank rings until the
// /friends/list round-trip returns and the avatars "pop in".
var FRIENDS_CACHE_KEY = 'presence_friends_cache_v1';
function cacheFriends(list) {
  (list || []).forEach(function(f) { if (f && f.userId) _friendProfileCache[f.userId] = f; });
  try { localStorage.setItem(FRIENDS_CACHE_KEY, JSON.stringify((list || []).slice(0, 60))); } catch(e) {}
}
function getCachedFriendsList() {
  try { var a = JSON.parse(localStorage.getItem(FRIENDS_CACHE_KEY)); return Array.isArray(a) ? a : []; } catch(e) { return []; }
}
// Same instant-paint-from-cache treatment for the follower/following counts.
var FOLLOW_SUMMARY_CACHE_KEY = 'presence_follow_summary_cache_v1';
function cacheFollowSummary(s) {
  if (!s || typeof s.followers !== 'number') return;
  try { localStorage.setItem(FOLLOW_SUMMARY_CACHE_KEY, JSON.stringify({ followers: s.followers, following: s.following || 0 })); } catch(e) {}
}
function getCachedFollowSummary() {
  try { var s = JSON.parse(localStorage.getItem(FOLLOW_SUMMARY_CACHE_KEY)); return (s && typeof s.followers === 'number') ? s : null; } catch(e) { return null; }
}
// Warm the in-memory profile cache from persisted friends at startup so a tap
// straight into a friend's profile has their data before any fetch resolves.
(function(){ getCachedFriendsList().forEach(function(f){ if (f && f.userId) _friendProfileCache[f.userId] = f; }); })();
function openFriendProfile(userId) {
  var f = _friendProfileCache[userId];
  if (!f) return;
  renderFriendProfile(f);
  showScreen('friendProfileScreen');
  if (typeof closeFriendsPanel === 'function') closeFriendsPanel();
}
function renderFriendProfile(f) {
  if (!f) return;
  _currentFriendProfile = f;
  var uname = f.username || 'friend';
  document.getElementById('friendProfTopName').textContent = '@' + uname;
  document.getElementById('friendProfName').textContent = '@' + uname;

  var av = document.getElementById('friendProfAvatar');
  var initEl = document.getElementById('friendProfInitial');
  var _fsp = safeProfilePic(f.profilePic);
  if (_fsp) {
    av.classList.add('has-pic');
    av.style.backgroundImage = 'url("' + _fsp + '")';
    initEl.style.display = 'none';
  } else {
    av.classList.remove('has-pic');
    av.style.backgroundImage = '';
    initEl.style.display = '';
    initEl.textContent = (String(uname).trim()[0] || '?').toUpperCase();
  }

  var now = Date.now();
  var isOnline = f.lastActive && (now - new Date(f.lastActive).getTime() < 2 * 60 * 1000);
  var statusText = isOnline ? 'Online now'
    : (f.lastActive ? 'Active ' + timeAgo(new Date(f.lastActive))
    : (f.lastSync ? 'Synced ' + timeAgo(new Date(f.lastSync)) : 'Friend'));
  document.getElementById('friendProfHandle').textContent = statusText;

  var fst = document.getElementById('friendProfStatus');
  if (fst) {
    if (statusIsFresh(f.status)) {
      fst.style.display = '';
      fst.innerHTML = '“' + escHtml(f.status.text) + '”';
    } else {
      fst.style.display = 'none';
      fst.textContent = '';
    }
  }

  var bodies = f.bodies || { physical: 1, astral: 1, mental: 1 };
  var bodyTotal = (bodies.physical || 1) + (bodies.astral || 1) + (bodies.mental || 1);
  var concRank = (typeof getConcRank === 'function') ? getConcRank(f.concLevel || 1) : 'Concentration';
  document.getElementById('friendProfOverview').innerHTML =
      _profOvItem('🔥', (f.streak || 0) + ((f.streak || 0) === 1 ? ' day' : ' days'), 'Streak')
    + _profOvItem('<span style="color:#d4956e;">◉</span>', 'Level ' + (f.concLevel || 1), concRank)
    + _profOvItem('◈', bodyTotal, 'Body Points')
    + _profOvItem('🌀', Math.floor(f.akasha || 0).toLocaleString(), 'Akasha');

  renderFriendProfSimilar(f.userId);
  renderFriendAchievements(f);
  if (typeof loadFriendSocial === 'function') loadFriendSocial(f);
}

// Show only the achievements a friend has actually earned (read-only, tappable).
function renderFriendAchievements(f) {
  var badgesEl = document.getElementById('friendProfBadges');
  var achEl = document.getElementById('friendProfAch');

  // Monthly badges — only if the friend's snapshot is from the current month.
  if (badgesEl) {
    var monthMatch = f.achMonthlyKey && (typeof achMonthKey === 'function') && (f.achMonthlyKey === achMonthKey());
    var fMonthly = monthMatch ? (f.achMonthlyEarned || {}) : {};
    var monthlyEarned = ACH_GROUPS[0].items.filter(function(b) { return fMonthly[b.id]; });
    if (monthlyEarned.length) {
      badgesEl.innerHTML = monthlyEarned.map(function(b) {
        var medal = b.target >= 1000 ? (b.target / 1000) + 'k' : b.target;
        return '<div class="prof-badge prof-badge--earned" style="--gc:' + ACH_COLORS.monthly + ';cursor:pointer;" data-ach="' + b.id + '" data-earned="' + escHtml(String(fMonthly[b.id])) + '" title="' + escHtml(b.name) + '">'
          + achIconSvg('monthly') + '<b>' + medal + '</b></div>';
      }).join('');
    } else {
      badgesEl.innerHTML = '<div class="prof-empty-note">No monthly badges earned yet this month.</div>';
    }
  }

  // All-time achievements the friend has earned, most recent first.
  if (achEl) {
    var life = f.achEarned || {};
    var earnedAch = [];
    ACH_GROUPS.forEach(function(g) {
      if (g.monthly) return;
      g.items.forEach(function(b) { if (life[b.id]) earnedAch.push({ b: b, g: g }); });
    });
    if (earnedAch.length) {
      earnedAch.sort(function(x, y) { return (life[y.b.id] || 0) - (life[x.b.id] || 0); });
      achEl.classList.add('friend-ach-strip');
      achEl.innerHTML = earnedAch.map(function(it) {
        var b = it.b, g = it.g;
        var medal = b.group === 'step' ? ['','','II','III','IV','V','VI','VII','VIII','IX','X'][b.target]
          : b.target >= 1000 ? (b.target / 1000) + 'k' : b.target;
        return '<div class="prof-ach-item" data-ach="' + b.id + '" data-earned="' + escHtml(String(life[b.id])) + '" style="cursor:pointer;opacity:1;">'
          + '<div class="prof-ach-item__disc" style="--gc:' + (ACH_COLORS[g.id] || '#e8c87a') + ';border-color:rgba(232,200,122,.5);">'
          + achIconSvg(g.id) + '<b>' + medal + '</b></div>'
          + '<div class="prof-ach-item__lbl prof-ach-item__lbl--earned">Earned</div></div>';
      }).join('');
    } else {
      achEl.classList.remove('friend-ach-strip');
      achEl.innerHTML = '<div class="prof-empty-note">No achievements reached yet.</div>';
    }
  }
}
function renderFriendProfSimilar(excludeId) {
  var el = document.getElementById('friendProfSimilar');
  if (!el) return;
  var others = Object.keys(_friendProfileCache).map(function(k) { return _friendProfileCache[k]; })
    .filter(function(o) { return o && o.userId && o.userId !== excludeId; })
    .slice(0, 6);
  if (!others.length) { el.innerHTML = '<div class="prof-empty-note">No other practitioners to compare yet.</div>'; return; }
  el.innerHTML = others.map(function(o) {
    var nm = o.username || '?';
    return '<div class="prof-friend" data-friend-id="' + escHtml(o.userId) + '">'
      + _friendRingHtml(nm[0] || '?', o.profilePic || '')
      + '<div class="prof-friend__name">@' + escHtml(nm) + '</div>'
      + '<div class="prof-friend__streak">🔥 ' + (o.streak || 0) + '</div>'
      + '</div>';
  }).join('');
}
document.getElementById('friendProfBack').addEventListener('click', function() {
  if (typeof renderProfile === 'function') renderProfile();
  showScreen('profileScreen');
});
document.getElementById('friendProfSimilar').addEventListener('click', function(e) {
  var card = e.target.closest('[data-friend-id]');
  if (card) openFriendProfile(card.getAttribute('data-friend-id'));
});

function handleProfilePicFile(file) {
  if (!file || file.type.indexOf('image/') !== 0) { showToast('Please choose an image'); return; }
  var reader = new FileReader();
  reader.onload = function(ev) {
    var img = new Image();
    img.onload = function() {
      var size = 256;
      var canvas = document.createElement('canvas');
      canvas.width = size; canvas.height = size;
      var ctx = canvas.getContext('2d');
      var scale = Math.max(size / img.width, size / img.height);
      var w = img.width * scale, h = img.height * scale;
      ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h);
      var out = canvas.toDataURL('image/jpeg', 0.82);
      setProfilePic(out);
      renderProfile();
      showToast('Profile picture updated');
    };
    img.onerror = function() { showToast('Could not load image'); };
    img.src = ev.target.result;
  };
  reader.onerror = function() { showToast('Could not read file'); };
  reader.readAsDataURL(file);
}

document.getElementById('profileBack').addEventListener('click', function() { renderHome(); showScreen('homeScreen'); });
document.getElementById('profSettingsBtn').addEventListener('click', function() {
  if (typeof openAccountSettings === 'function') openAccountSettings();
  else showScreen('settingsScreen');
});
document.getElementById('profAvatar').addEventListener('click', function() { document.getElementById('profPicInput').click(); });
document.getElementById('profCtaBtn').addEventListener('click', function() {
  var signedIn = !!(syncEnabled && (authEmail || authUsername));
  if (!signedIn) {
    renderSettingsExerciseList();
    renderCustomVisImageList();
    renderCustomAudSoundList();
    openAccountSettings();
  } else {
    document.getElementById('profPicInput').click();
  }
});
document.getElementById('profPicInput').addEventListener('change', function(e) {
  if (e.target.files && e.target.files[0]) handleProfilePicFile(e.target.files[0]);
  e.target.value = '';
});
document.getElementById('profFriendStreaks').addEventListener('click', function(e) {
  if (e.target.closest('[data-prof-addfriend]')) {
    if (!authToken) { showToast('Sign in to add friends'); return; }
    openFriendsPanel();
    return;
  }
  var fc = e.target.closest('[data-friend-id]');
  if (fc) openFriendProfile(fc.getAttribute('data-friend-id'));
});
document.getElementById('profFriendsMore').addEventListener('click', function() {
  if (!authToken) { showToast('Sign in to use Friends'); return; }
  openFriendsPanel();
});
document.getElementById('profBadgesMore').addEventListener('click', function() { showToast('Monthly badges coming soon'); });
document.getElementById('profAchMore').addEventListener('click', function() { showToast('Achievements coming soon'); });
