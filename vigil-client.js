// Sitting Now + Shared Vigils.
//
// Practice is solitary; knowing others are sitting at the same moment makes it
// feel less so. Every exercise sends a "sitting" heartbeat while it runs (via
// the shared exercise wake lock), and Home shows how many practitioners are
// sitting right now, naming only mutual friends.
//
// A Shared Vigil is an invitation to a friend to sit now. Once accepted, it is
// kept when both finish a session within the hour. The reward is claimed
// through the server so it pays each person once, on whichever device.

var VIGIL_MIN_SESSION_SEC = 120;     // a sit shorter than this doesn't keep a vigil
var SITTING_HEARTBEAT_MS = 30000;    // well inside the server's 90s TTL
var SITTING_REFRESH_MS = 60000;

var _sittingHeartbeat = null;
var _sittingNow = { count: 0, friends: [] };
var _vigils = [];
var _sittingRefreshTimer = null;

function vigilApi(path, method, body) {
  if (typeof authToken === 'undefined' || !authToken) return Promise.reject(new Error('signed out'));
  var opts = { method: method || 'GET', headers: { 'Authorization': 'Bearer ' + authToken } };
  if (body) { opts.headers['Content-Type'] = 'application/json'; opts.body = JSON.stringify(body); }
  return fetch(SERVER_URL + '/api/social' + path, opts).then(function(res) {
    return res.json().then(function(data) {
      if (!res.ok) throw new Error((data && data.error) || 'Request failed');
      return data;
    });
  });
}

// ── Sitting heartbeat (called from the exercise wake lock) ──
function sittingStart() {
  if (_sittingHeartbeat || typeof authToken === 'undefined' || !authToken) return;
  var beat = function() { vigilApi('/sitting', 'POST', { active: true }).catch(function() {}); };
  beat();
  _sittingHeartbeat = setInterval(beat, SITTING_HEARTBEAT_MS);
}

function sittingStop() {
  if (!_sittingHeartbeat) return;
  clearInterval(_sittingHeartbeat);
  _sittingHeartbeat = null;
  vigilApi('/sitting', 'POST', { active: false }).catch(function() {});
}

// ── Home card ──
function vigilMinutesLeft(iso) {
  return Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / 60000));
}

// The vigil that matters most right now: an invite to answer, then one in
// progress, then a kept one still to claim, then one we're waiting on.
function vigilPrimary(vigils) {
  var rank = function(v) {
    if (v.status === 'pending' && v.incoming) return 0;
    if (v.status === 'kept' && !v.claimed) return 1;
    if (v.status === 'accepted' && !v.youCompleted) return 2;
    if (v.status === 'accepted') return 3;
    if (v.status === 'pending') return 4;
    return 9;
  };
  var live = (vigils || []).filter(function(v) { return rank(v) < 9; });
  live.sort(function(a, b) { return rank(a) - rank(b); });
  return live[0] || null;
}

function vigilCardHtml(v) {
  var name = '@' + escHtml(v.otherUsername);
  if (v.status === 'pending' && v.incoming) {
    return '<div class="vg-text">' + name + ' invites you to sit together</div>'
      + '<div class="vg-actions"><button class="vg-btn vg-btn--primary" data-vg="accept" data-id="' + v.id + '">Sit together</button>'
      + '<button class="vg-btn" data-vg="decline" data-id="' + v.id + '">Not now</button></div>';
  }
  if (v.status === 'pending') {
    return '<div class="vg-text">Waiting for ' + name + ' to join your vigil · ' + vigilMinutesLeft(v.inviteExpiresAt) + ' min</div>';
  }
  if (v.status === 'accepted' && !v.youCompleted) {
    return '<div class="vg-text">Vigil with ' + name + ' · finish any session in the next ' + vigilMinutesLeft(v.windowEndsAt) + ' min</div>';
  }
  if (v.status === 'accepted') {
    return '<div class="vg-text">You have sat. Waiting for ' + name + '…</div>';
  }
  return '';
}

function renderSittingNow() {
  var el = document.getElementById('sittingNowCard');
  if (!el) return;
  var signedIn = typeof authToken !== 'undefined' && !!authToken;
  var v = vigilPrimary(_vigils);
  var n = _sittingNow.count;
  if (!signedIn || (!n && !v)) { el.style.display = 'none'; return; }
  var friendNames = (_sittingNow.friends || []).slice(0, 2).map(function(f) { return '@' + escHtml(f.username); });
  var line = n
    ? '<div class="vg-count"><span class="vg-dot"></span>' + n + ' practitioner' + (n === 1 ? ' is' : 's are') + ' sitting now'
      + (friendNames.length ? ' · ' + friendNames.join(', ') + (_sittingNow.friends.length > 2 ? ' +' + (_sittingNow.friends.length - 2) : '') : '')
      + '</div>'
    : '';
  el.innerHTML = line + (v ? '<div class="vg-vigil">' + vigilCardHtml(v) + '</div>' : '');
  el.style.display = 'block';
  el.querySelectorAll('[data-vg]').forEach(function(btn) {
    btn.onclick = function() {
      var accept = btn.dataset.vg === 'accept';
      btn.disabled = true;
      vigilApi('/vigils/' + btn.dataset.id + '/respond', 'POST', { accept: accept })
        .then(function() {
          if (accept && typeof showToast === 'function') showToast('Vigil begun · finish any session within the hour', 3200);
        })
        .catch(function(err) { if (typeof showToast === 'function') showToast(err.message, 2800); })
        .then(refreshSittingNow);
    };
  });
}

function refreshSittingNow() {
  if (typeof authToken === 'undefined' || !authToken) { _vigils = []; renderSittingNow(); return Promise.resolve(); }
  return Promise.all([
    vigilApi('/sitting').catch(function() { return null; }),
    vigilApi('/vigils').catch(function() { return null; })
  ]).then(function(results) {
    if (results[0]) _sittingNow = { count: results[0].count || 0, friends: results[0].friends || [] };
    if (results[1]) _vigils = results[1].vigils || [];
    renderSittingNow();
    vigilClaimKept();
  });
}

function startSittingNowRefresh() {
  clearInterval(_sittingRefreshTimer);
  refreshSittingNow();
  _sittingRefreshTimer = setInterval(function() {
    if (document.visibilityState === 'visible') refreshSittingNow();
  }, SITTING_REFRESH_MS);
}

// ── Invites ──
function vigilInvite(friendId, username, btn) {
  if (btn) btn.disabled = true;
  vigilApi('/vigils', 'POST', { userId: friendId })
    .then(function() {
      if (typeof showToast === 'function') showToast('Invited @' + username + ' to sit together', 2800);
      if (btn) btn.textContent = 'Invited';
      refreshSittingNow();
    })
    .catch(function(err) {
      if (btn) btn.disabled = false;
      if (typeof showToast === 'function') showToast(err.message, 2800);
    });
}

// ── Completion and reward ──
function vigilReward() {
  return typeof pathQuestReward === 'function' ? pathQuestReward('daily') : 30;
}

// Pay for every kept vigil the server says we have not claimed yet.
function vigilClaimKept() {
  _vigils.filter(function(v) { return v.status === 'kept' && !v.claimed; }).forEach(function(v) {
    v.claimed = true; // optimistic: never double-ask from this device
    vigilApi('/vigils/' + v.id + '/claim', 'POST').then(function(data) {
      if (!data.firstClaim) return;
      var amount = vigilReward();
      if (typeof omniaCreditAkasha === 'function' && typeof omniaState !== 'undefined' && omniaState) {
        omniaCreditAkasha(amount, 'vigil', { vigilId: v.id });
        if (typeof saveOmniaState === 'function') saveOmniaState();
      }
      if (typeof showToast === 'function') showToast('Vigil kept with @' + v.otherUsername + ' · +' + amount + ' Akasha', 3600);
      renderSittingNow();
    }).catch(function() { v.claimed = false; });
  });
}

// Called when any session completes. Reports it to each open vigil.
// The vigil list is re-read first: it may have been accepted while this
// device was mid-session and not refreshing.
function vigilOnSessionComplete(seconds) {
  if ((seconds || 0) < VIGIL_MIN_SESSION_SEC) return;
  if (typeof authToken === 'undefined' || !authToken) return;
  vigilApi('/vigils').then(function(data) {
    var open = (data.vigils || []).filter(function(v) { return v.status === 'accepted' && !v.youCompleted; });
    return Promise.all(open.map(function(v) {
      return vigilApi('/vigils/' + v.id + '/complete', 'POST').catch(function() { return null; });
    }));
  }).catch(function() {}).then(refreshSittingNow);
}

document.addEventListener('visibilitychange', function() {
  if (document.visibilityState === 'visible') refreshSittingNow();
});

startSittingNowRefresh();
