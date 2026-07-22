// ═══════════════════════════════════════
// WEB PUSH
// ═══════════════════════════════════════

var SERVER_URL = 'https://presence-server-acik.onrender.com';
var SYNC_API_URL = SERVER_URL + '/api/sync';
var GOOGLE_CLIENT_ID = '311497048186-gast7j1trlbddlpvabsnqn1p25h5u5jc.apps.googleusercontent.com';

// Stable per-install identity for live-session presence. This belongs to the
// platform boundary; Practice Review must not be required for presence beacons.
function getOmniaDeviceId() {
  var key = 'presence_device_id';
  var id = localStorage.getItem(key);
  if (!id) {
    id = 'xxxxxxxxxxxx4xxxyxxxxxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      var r = Math.random() * 16 | 0;
      return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
    localStorage.setItem(key, id);
  }
  return id;
}

function requestPresenceAI(kind, context) {
  if (!authToken) return Promise.reject(new Error('Sign in required'));
  var path = '/api/ai/progress-comment';
  var controller = window.AbortController ? new AbortController() : null;
  var timer = controller ? setTimeout(function() { controller.abort(); }, 5500) : null;
  return fetch(SERVER_URL + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + authToken },
    body: JSON.stringify({ context: context || {} }),
    signal: controller ? controller.signal : undefined
  }).then(function(res) {
    if (timer) clearTimeout(timer);
    if (!res.ok) throw new Error('AI unavailable');
    return res.json();
  }).then(function(data) {
    var msg = data && data.message ? String(data.message).trim() : '';
    if (!msg) throw new Error('Empty AI message');
    return msg;
  }).catch(function(err) {
    if (timer) clearTimeout(timer);
    throw err;
  });
}

function loadGoogleScript(cb) {
  if (window.google && window.google.accounts) { cb(); return; }
  var s = document.createElement('script');
  s.src = 'https://accounts.google.com/gsi/client';
  s.async = true; s.defer = true;
  s.onload = cb;
  document.head.appendChild(s);
}

function initGoogleSignIn(containerId, onSuccess) {
  var container = document.getElementById(containerId);
  if (!container) return;

  // We render Google's REAL Identity-Services button as a transparent overlay
  // sitting directly on top of our styled button, so the user's tap lands on
  // Google's own button and carries a genuine user gesture into the GIS iframe.
  // (The old approach hid Google's button and proxy-clicked it; a synthetic
  // click can't propagate user activation across the cross-origin iframe, so
  // the desktop sign-in popup was blocked by the popup blocker — which is why
  // it only worked on mobile, where GIS falls back to a redirect flow.)
  // We use the *ID-token* flow (google.accounts.id), which returns a signed
  // identity credential and NEVER mints an access token, so Google treats each
  // login as a plain sign-in (no "You shared some Google Account data" email).
  var wrap = document.createElement('div');
  wrap.style.position = 'relative';
  wrap.style.width = '100%';

  var btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'tut-google-btn';
  btn.innerHTML = GOOGLE_ICON_SVG + ' Continue with Google';

  // Transparent, click-through-disabled overlay that holds Google's button.
  // opacity:0 keeps it invisible while still receiving pointer events (unlike
  // display:none / visibility:hidden). overflow:hidden clips the scaled-up
  // Google button to the visual button's bounds.
  var overlay = document.createElement('div');
  overlay.style.position = 'absolute';
  overlay.style.inset = '0';
  overlay.style.opacity = '0';
  overlay.style.overflow = 'hidden';
  overlay.style.zIndex = '3';
  overlay.style.cursor = 'pointer';
  overlay.style.display = 'flex';
  overlay.style.alignItems = 'center';
  overlay.style.justifyContent = 'center';

  // Google's button renders at a fixed pixel size; scaling the host up ensures
  // it fully covers the visual button area, so a tap anywhere lands on it.
  var gHost = document.createElement('div');
  gHost.style.transform = 'scale(4)';
  gHost.style.transformOrigin = 'center center';
  overlay.appendChild(gHost);

  wrap.appendChild(btn);
  wrap.appendChild(overlay);
  container.appendChild(wrap);

  function resetBtn() {
    btn.innerHTML = GOOGLE_ICON_SVG + ' Continue with Google';
    btn.disabled = false;
    overlay.style.pointerEvents = 'auto';
  }
  function setBusy() {
    btn.innerHTML = 'Signing in…';
    btn.disabled = true;
    overlay.style.pointerEvents = 'none'; // block double-taps mid sign-in
  }

  function onCredential(response) {
    if (!response || !response.credential) { resetBtn(); return; }
    setBusy();
    (async function() {
      try {
        var res = await fetch(SYNC_API_URL + '/auth/google', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ credential: response.credential })
        });
        var result = await res.json();
        if (!res.ok) throw new Error(result.error || 'Sign-in failed');
        authToken = result.token;
        authEmail = result.email;
        authUsername = result.username || null;
        authDisplayName = result.displayName || null;
        localStorage.setItem('presence_auth_token', authToken);
        localStorage.setItem('presence_auth_email', authEmail);
        localStorage.setItem('presence_visited', '1');
        if (authUsername) localStorage.setItem('presence_auth_username', authUsername);
        if (authDisplayName) localStorage.setItem('presence_display_name', authDisplayName);
        try { localStorage.setItem(PRIVATE_PROFILE_KEY, result.isPrivate ? '1' : '0'); } catch(e) {}
        syncEnabled = true;
        onSuccess();
      } catch(err) {
        resetBtn();
        showToast('Sign-in failed. Try again.');
      }
    })();
  }

  // If the SDK is blocked or fails to load, drop the overlay so our own button
  // becomes tappable and can explain what happened instead of silently eating
  // the tap.
  function failToFallback() {
    overlay.style.display = 'none';
    if (!btn._fallbackBound) {
      btn._fallbackBound = true;
      btn.addEventListener('click', function() {
        showToast('Google sign-in is unavailable right now. Check your connection and try again.', 3500);
      });
    }
  }

  loadGoogleScript(function() {
    if (!(window.google && google.accounts && google.accounts.id)) { failToFallback(); return; }
    try {
      google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: onCredential,
        ux_mode: 'popup',
        auto_select: false,
        itp_support: true
      });
      google.accounts.id.renderButton(gHost, {
        type: 'standard', theme: 'outline', size: 'large',
        text: 'continue_with', width: 300
      });
      // If Google never actually rendered its button, fall back so the tap
      // isn't swallowed by an empty transparent overlay.
      setTimeout(function() {
        if (!gHost.querySelector('div[role=button], [role=button], iframe')) failToFallback();
      }, 1500);
    } catch(e) { failToFallback(); }
  });
}

// ── Cloud Sync State ──────────────────────────────────────────
var authToken = localStorage.getItem('presence_auth_token');
var authEmail = localStorage.getItem('presence_auth_email');
var authUsername = localStorage.getItem('presence_auth_username');
var authDisplayName = localStorage.getItem('presence_display_name');
var syncEnabled = !!authToken;

// ═══════════════════════════════════════════════════════════════
// CLOUD SYNC FUNCTIONS
// ═══════════════════════════════════════════════════════════════

async function authRegisterOrLogin(email, password, isRegister, username) {
  try {
    const endpoint = isRegister ? 'register' : 'login';
    const url = SYNC_API_URL + '/auth/' + endpoint;
    console.log('[Auth] Attempting ' + endpoint);

    const body = { email, password };
    if (isRegister && username) body.username = username;

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    console.log('[Auth] Response status:', res.status);
    const result = await res.json();

    if (!res.ok) throw new Error(result.error || 'Auth failed (status ' + res.status + ')');

    authToken = result.token;
    authEmail = result.email;
    authUsername = result.username || null;
    authDisplayName = result.displayName || null;
    localStorage.setItem('presence_auth_token', authToken);
    localStorage.setItem('presence_auth_email', authEmail);
    localStorage.setItem('presence_visited', '1');
    if (authUsername) localStorage.setItem('presence_auth_username', authUsername);
    if (authDisplayName) localStorage.setItem('presence_display_name', authDisplayName);
    try { localStorage.setItem(PRIVATE_PROFILE_KEY, result.isPrivate ? '1' : '0'); } catch(e) {}
    syncEnabled = true;

    console.log('[Auth] Success.');
    return true;
  } catch (err) {
    console.error('[Auth] Error:', err.message);
    window._lastAuthError = err.message;
    return false;
  }
}

async function syncPushData() {
  if (!syncEnabled || !authToken) return;
  try {
    const data = PRESENCE_SYNC.readStorage(localStorage);

    // Don't push if local state has no real progress — prevents a fresh browser from
    // overwriting a real cloud snapshot with default/empty data
    const hasMeaningfulData = (function() {
      try {
        var v3 = data.presence_v3 ? JSON.parse(data.presence_v3) : null;
        var conc = data.presence_conc_v1 ? JSON.parse(data.presence_conc_v1) : null;
        var omnia = data.presence_omnia_v1 ? JSON.parse(data.presence_omnia_v1) : null;
        var achievements = data.presence_ach_v1 ? JSON.parse(data.presence_ach_v1) : null;
        var giftPath = data.presence_giftpath_v1 ? JSON.parse(data.presence_giftpath_v1) : null;
        var hasAwareness = v3 && ((v3.xp || 0) > 0 || (v3.totalSessions || 0) > 0 || (v3.streak || 0) > 0);
        var hasConc = conc && ((conc.xp || 0) > 0 || (conc.totalSessions || 0) > 0);
        var hasOmnia = omnia && ((omnia.akasha || 0) > 0 || (omnia.totalAkashaEarned || 0) > 0
          || ((omnia.bodies && (omnia.bodies.physical > 1 || omnia.bodies.astral > 1 || omnia.bodies.mental > 1))));
        var hasJournal = data.presence_journal_v1 && data.presence_journal_v1.length > 50;
        var hasAchievements = achievements && (Object.keys(achievements.earned || {}).length > 0
          || Object.keys(achievements.hwm || {}).length > 0 || (achievements.exCount || 0) > 0);
        var hasGiftPath = giftPath && ((giftPath.cleared || []).length > 0 || (giftPath.claimed || []).some(Boolean));
        return hasAwareness || hasConc || hasOmnia || hasJournal || hasAchievements || hasGiftPath;
      } catch(e) { return true; }
    })();
    if (!hasMeaningfulData) {
      console.log('[Sync] Skipping push — no meaningful local progress to sync');
      return;
    }

    const res = await fetch(SYNC_API_URL + '/sync/push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + authToken
      },
      body: JSON.stringify({ data, deviceInfo: detectDevice(), deviceId: getSyncDeviceId() })
    });

    if (!res.ok) {
      if (res.status === 401) { authLogout({ message: 'Session expired — sign in via Settings' }); }
      return;
    }
    console.log('[Sync] Data pushed to cloud');
    markSynced();
  } catch (err) {
    console.warn('[Sync] Push failed:', err.message);
  }
}

// Record the moment of the last successful cloud round-trip, so the account
// card can reassure the user their data is current ("Synced 2m ago").
function markSynced() {
  try { localStorage.setItem('presence_last_sync', String(Date.now())); } catch(e) {}
  if (typeof refreshSyncStatusLabel === 'function') refreshSyncStatusLabel();
}

function syncStatusLabel() {
  var raw = localStorage.getItem('presence_last_sync');
  var ts = raw ? parseInt(raw, 10) : 0;
  if (!ts) return '✓ Syncing across devices';
  return '✓ Synced ' + timeAgo(ts) + ' · all devices';
}

// Keep the visible "Synced …" line current while the account card is open.
function refreshSyncStatusLabel() {
  if (!(syncEnabled && authToken)) return;
  var st = document.getElementById('syncStatusText');
  if (!st || st.offsetParent === null) return; // not visible
  st.textContent = syncStatusLabel();
  st.style.color = '';
}
setInterval(refreshSyncStatusLabel, 30000);

async function syncPullData() {
  if (!syncEnabled || !authToken) return;
  window._syncPullPending = true;
  try {
    const res = await fetch(SYNC_API_URL + '/sync/pull', {
      headers: { 'Authorization': 'Bearer ' + authToken }
    });
    const result = await res.json();

    if (!res.ok) {
      window._syncPullPending = false;
      if (res.status === 401) { authLogout({ message: 'Session expired — sign in via Settings' }); }
      return;
    }

    // Identity fields (avatar/username/privacy) ride alongside the snapshot data
    // and must apply even when there's no progress snapshot yet.
    if (result.account) applyAccountFields(result.account);

    if (!result.data) {
      window._syncPullPending = false;
      console.log('[Sync] No data on cloud yet');
      return;
    }

    // Field-merge so no device's progress is ever rolled back (histories union,
    // counters stay monotonic, Omnia field-merges). Shared with the startup and
    // foreground pull paths via applyPulledData.
    applyPulledData(result.data);

    window._syncPullPending = false;
    markSynced();
    console.log('[Sync] Data pulled from cloud · synced at', result.syncedAt);
    return true;
  } catch (err) {
    window._syncPullPending = false;
    console.warn('[Sync] Pull failed:', err.message);
  }
}

// ── Live session beacon ───────────────────────────────────
// Tells the server "a session is running on this device" at start, refreshes
// it on a heartbeat, and clears it at the end. Other signed-in devices read
// this to show a "session in progress elsewhere" banner. Fire-and-forget:
// a failed beacon never disrupts the local session, which stays authoritative.
var _beaconHeartbeat = null;

function pushPresenceBeacon(mode, exercise) {
  if (!syncEnabled || !authToken) return;
  fetch(SYNC_API_URL + '/presence/beacon', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + authToken },
    body: JSON.stringify({
      deviceId: getOmniaDeviceId(),
      mode: mode || 'awareness',
      exercise: exercise || '',
      startedAt: sessionStartTime || Date.now(),
      device: detectDevice()
    })
  }).catch(function() {});
}

function startPresenceBeacon(mode, exercise) {
  if (!syncEnabled || !authToken) return;
  pushPresenceBeacon(mode, exercise);
  if (_beaconHeartbeat) clearInterval(_beaconHeartbeat);
  // Heartbeat well inside the 90s server TTL so the beacon never goes stale mid-session
  _beaconHeartbeat = setInterval(function() { pushPresenceBeacon(mode, exercise); }, 30000);
}

function clearPresenceBeacon() {
  if (_beaconHeartbeat) { clearInterval(_beaconHeartbeat); _beaconHeartbeat = null; }
  if (!syncEnabled || !authToken) return;
  fetch(SYNC_API_URL + '/presence/clear', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + authToken },
    body: JSON.stringify({ deviceId: getOmniaDeviceId() })
  }).catch(function() {});
}

// Cached view of whether another device has a live session. The hard
// cross-device lock reads this synchronously at session-start; it's only
// trusted while fresh (REMOTE_ACTIVE_TTL) so a stale cache fails OPEN —
// we never wrongly block practice.
var _remoteActive = { active: null, checkedAt: 0 };
var REMOTE_ACTIVE_TTL = 45000;

// True (with the beacon payload) only when a *fresh* beacon from another
// device is active and this device isn't itself mid-session.
function remoteSessionActive() {
  if (sessionStartTime) return null;
  if (!_remoteActive.active) return null;
  if (Date.now() - _remoteActive.checkedAt > REMOTE_ACTIVE_TTL) return null;
  return _remoteActive.active;
}

function remoteSessionLabel(a) {
  var label = a.mode === 'concentration' ? 'Concentration' : a.mode === 'prayer' ? 'Prayer' : 'Awareness';
  var dev = (!a.device || a.device === 'Unknown') ? 'another device' : 'your ' + a.device;
  return label + ' session is running on ' + dev;
}

// Read whether another device has a live session, and reflect it on the home banner
function refreshRemoteSessionBanner() {
  var banner = document.getElementById('remoteSessionBanner');
  // Never show / never block on the device that's actually running a session
  if (!syncEnabled || !authToken || sessionStartTime) {
    _remoteActive = { active: null, checkedAt: Date.now() };
    if (banner) banner.style.display = 'none';
    return;
  }
  fetch(SYNC_API_URL + '/presence/active?exclude=' + encodeURIComponent(getOmniaDeviceId()), {
    headers: { 'Authorization': 'Bearer ' + authToken }
  }).then(function(r) { return r.ok ? r.json() : null; }).then(function(res) {
    var a = (res && res.active) || null;
    _remoteActive = { active: a, checkedAt: Date.now() };
    if (sessionStartTime) a = null; // a local session started while we waited
    if (!banner) return;
    var txt = document.getElementById('remoteSessionText');
    if (a && txt) {
      var label = a.mode === 'concentration' ? 'Concentration' : a.mode === 'prayer' ? 'Prayer' : 'Awareness';
      var mins = a.startedAt ? Math.max(0, Math.round((Date.now() - a.startedAt) / 60000)) : 0;
      var ago = mins <= 0 ? 'just now' : 'started ' + mins + 'm ago';
      var dev = (!a.device || a.device === 'Unknown') ? 'another device' : 'your ' + a.device + ' device';
      txt.textContent = label + ' session in progress on ' + dev + ' · ' + ago;
      banner.style.display = 'flex';
    } else {
      banner.style.display = 'none';
    }
  }).catch(function() {});
}

function _refreshSettingsSyncCard() {
  var wrap = document.getElementById('settingsSignInWrap');
  var sgc  = document.getElementById('settingsGoogleContainer');
  var st   = document.getElementById('syncStatusText');
  var se   = document.getElementById('syncStatusEmail');
  var lb   = document.getElementById('syncLogoutBtn');
  var uc   = document.getElementById('setUsernameCard');
  var nc   = document.getElementById('setDisplayNameCard');
  var dg   = document.getElementById('accountDeleteGroup');
  if (!wrap) return;
  var syncWarning = localStorage.getItem('presence_sync_warning');
  if (st) st.textContent = syncWarning ? '⚠ Sync disconnected — sign in to reconnect' : 'Not signed in';
  if (st) st.style.color = syncWarning ? '#d4956e' : '';
  if (se) se.textContent = '';
  if (lb) lb.style.display = 'none';
  if (uc) uc.style.display = 'none';
  if (nc) nc.style.display = 'none';
  if (dg) dg.style.display = 'none';
  wrap.style.display = 'block';
  if (sgc) {
    sgc.innerHTML = '';
    initGoogleSignIn('settingsGoogleContainer', function() {
      _refreshSettingsSyncCardSignedIn();
      showToast('Signed in ✓');
      syncPullData().then(function(restored) {
        if (restored) window.location.reload();
        else syncPushData();
      });
    });
  }
  // Reset email form state
  var ef = document.getElementById('settingsEmailForm');
  if (ef) ef.style.display = 'none';
  var toggle = document.getElementById('settingsEmailToggle');
  if (toggle) toggle.textContent = 'Continue with email →';
}

function _refreshSettingsSyncCardSignedIn() {
  var wrap = document.getElementById('settingsSignInWrap');
  var st   = document.getElementById('syncStatusText');
  var se   = document.getElementById('syncStatusEmail');
  var lb   = document.getElementById('syncLogoutBtn');
  var uc   = document.getElementById('setUsernameCard');
  var nc   = document.getElementById('setDisplayNameCard');
  var ni   = document.getElementById('setDisplayNameInput');
  var dg   = document.getElementById('accountDeleteGroup');
  localStorage.removeItem('presence_sync_warning');
  if (st) { st.textContent = syncStatusLabel(); st.style.color = ''; }
  if (se) se.textContent = authUsername ? '@' + authUsername + ' · ' + authEmail : authEmail;
  if (lb) lb.style.display = 'block';
  if (wrap) wrap.style.display = 'none';
  if (uc) uc.style.display = authUsername ? 'none' : 'block';
  // Unlike the username card (one-time claim), this stays visible and
  // editable any time you're signed in, pre-filled with the current name.
  if (nc) nc.style.display = 'block';
  if (ni) ni.value = authDisplayName || '';
  if (dg) dg.style.display = '';
}

async function clearDeletedAccountFromDevice() {
  authToken = null;
  authEmail = null;
  authUsername = null;
  authDisplayName = null;
  syncEnabled = false;
  try {
    if ('serviceWorker' in navigator) {
      var registration = await navigator.serviceWorker.ready;
      var subscription = await registration.pushManager.getSubscription();
      if (subscription) await subscription.unsubscribe();
    }
  } catch(e) {}
  try {
    if (window.indexedDB) indexedDB.deleteDatabase('presence_audio');
  } catch(e) {}
  localStorage.clear();
  sessionStorage.clear();
  resetLocalProgressForSignedOut();
  window.location.reload();
}

async function authLogout(options) {
  options = options || {};
  var logoutToken = authToken;
  // For a deliberate sign-out, flush any unsynced local progress to the cloud
  // while the token is still valid. Involuntary 401 handling does not clear or
  // revoke progress.
  if (options.clearLocalProgress && syncEnabled && logoutToken) {
    try { await syncPushData(); } catch(e) {}
  }
  // Detach this device's push subscription from the account so DMs to the
  // old account never land on a signed-out (or re-used) device.
  try {
    if (logoutToken && 'serviceWorker' in navigator) {
      var registration = await navigator.serviceWorker.ready;
      var subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await fetch(SERVER_URL + '/api/social/push/unregister', {
          method: 'POST',
          headers: { 'Authorization': 'Bearer ' + logoutToken, 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: subscription.endpoint })
        });
      }
    }
  } catch(e) {}
  // Revoke the account's current token generation after this device has
  // finished its final authenticated writes. This invalidates copied tokens
  // and sessions left on other devices.
  if (options.clearLocalProgress && logoutToken) {
    try {
      await fetch(SYNC_API_URL + '/auth/logout', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + logoutToken }
      });
    } catch(e) {}
  }
  authToken = null;
  authEmail = null;
  authUsername = null;
  authDisplayName = null;
  localStorage.removeItem('presence_auth_token');
  localStorage.removeItem('presence_auth_email');
  localStorage.removeItem('presence_auth_username');
  localStorage.removeItem('presence_display_name');
  localStorage.removeItem('presence_private_profile');
  try { localStorage.removeItem(STATUS_KEY); } catch(e) {}
  try { localStorage.removeItem(FRIENDS_CACHE_KEY); } catch(e) {}
  try { localStorage.removeItem('presence_lodge_feed_v1'); } catch(e) {}
  _friendProfileCache = {};
  syncEnabled = false;
  // Deliberate sign-out: wipe local progress so a signed-out device shows a
  // clean slate instead of the previous account's data. The data is safe in the
  // cloud (pushed above) and restored on next sign-in via shouldTakeCloudValue.
  // Re-arm the welcome screen so the user lands there, then reload to apply.
  if (options.clearLocalProgress) {
    resetLocalProgressForSignedOut();
    localStorage.removeItem('presence_welcome_seen');
    if (options.message) localStorage.setItem('presence_sync_warning', options.message);
    window.location.reload();
    return;
  }
  _refreshSettingsSyncCard();
  // Persist a warning so the user sees it next time they open Settings
  if (options.message) {
    localStorage.setItem('presence_sync_warning', options.message);
    showToast(options.message, 3500);
  }
  // Stay on Settings if that's where the action came from; otherwise go home
  if (!options.stayOnSettings) {
    renderHome(); showScreen('homeScreen');
  }
}

function detectDevice() {
  var ua = navigator.userAgent;
  if (/iPhone|iPad/.test(ua)) return 'iOS';
  if (/Android/.test(ua)) return 'Android';
  if (/Mac/.test(ua)) return 'macOS';
  if (/Windows/.test(ua)) return 'Windows';
  if (/Linux/.test(ua)) return 'Linux';
  return 'Unknown';
}

// Stable per-install identity for cloud snapshot compaction. It is deliberately
// local-only (not part of the synced payload), so each device owns one server
// snapshot row instead of appending an unbounded row on every save.
function getSyncDeviceId() {
  var key = 'presence_sync_device_id';
  var existing = localStorage.getItem(key);
  if (existing && /^[A-Za-z0-9_-]{12,80}$/.test(existing)) return existing;
  var generated = '';
  try { generated = crypto.randomUUID().replace(/-/g, ''); } catch(e) {}
  if (!generated) generated = Date.now().toString(36) + Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
  generated = generated.replace(/[^A-Za-z0-9_-]/g, '').slice(0, 80);
  localStorage.setItem(key, generated);
  return generated;
}

// Silently refresh the JWT before it can expire. Legacy tokens without an
// authVersion refresh immediately into the revocable seven-day format.
async function maybeRefreshToken() {
  if (!syncEnabled || !authToken) return;
  try {
    var parts = authToken.split('.');
    if (parts.length !== 3) return;
    var encoded = parts[1].replace(/-/g,'+').replace(/_/g,'/');
    while (encoded.length % 4) encoded += '=';
    var payload = JSON.parse(atob(encoded));
    var remainingMs = (payload.exp || 0) * 1000 - Date.now();
    if (payload.authVersion != null && remainingMs > 2 * 24 * 60 * 60 * 1000) return;
    var res = await fetch(SYNC_API_URL + '/auth/refresh', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + authToken }
    });
    if (!res.ok) return; // if refresh fails, do nothing — next push will catch the 401
    var result = await res.json();
    if (result.token) {
      authToken = result.token;
      localStorage.setItem('presence_auth_token', authToken);
      console.log('[Auth] Token refreshed silently');
    }
  } catch(e) {}
}

var VAPID_PUBLIC_KEY = 'BD8weuWNktThYNUkWKnkv5Hgz2-yiJyC_T1YVCrYomhOH2rJSys97xrRnm5BsrGNc9t8MRmqRaN2KHnF-zLjXlI';

function urlBase64ToUint8Array(base64String) {
  var padding = '='.repeat((4 - base64String.length % 4) % 4);
  var base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  var rawData = window.atob(base64);
  return Uint8Array.from([].slice.call(rawData).map(function(c) { return c.charCodeAt(0); }));
}

// The push subscription's `auth` secret proves ownership of these endpoint-
// keyed server routes — it's never in the endpoint URL, so a captured URL
// alone can no longer forge session/schedule/notify calls.
function pushAuthKey(sub) {
  try { return (sub && sub.toJSON && sub.toJSON().keys && sub.toJSON().keys.auth) || ''; } catch(e) { return ''; }
}
async function getSubscription() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return null;
  try { var reg = await navigator.serviceWorker.ready; return await reg.pushManager.getSubscription(); }
  catch(e) { return null; }
}

// Resolve sw.js relative to this page so it works from any sub-path
var SW_PATH = (location.pathname.includes('/app/') ? '../' : '') + 'sw.js';

async function registerWebPush() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
  try {
    var reg = await navigator.serviceWorker.register(SW_PATH);
    var permission = await Notification.requestPermission();
    if (permission !== 'granted') { showToast('Enable notifications for background reminders'); return; }
    var sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) });
    }
    await fetch(SERVER_URL + '/subscribe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(sub) });
  } catch(err) { console.error('Web Push registration failed:', err); showToast('Push setup failed: ' + err.message, 4000); }
}

async function notifyServerSessionStart() {
  pavlokServerManaged = false;
  try {
    var sub = await getSubscription();
    if (!sub) { console.log('Push not registered — session running locally'); return; }
    var pvk = getPavlokPrefs();
    var pavlokPayload = null;
    if (getPavlokToken() && pvk.awareness.enabled) {
      pavlokPayload = { token: getPavlokToken(), enabled: true, type: pvk.awareness.type || 'vibe', intensity: pvk.awareness.intensity || 50 };
    }
    // Send the REMAINING duration so a mid-session interval change (which
    // re-calls this) reschedules only the time left, never past the real end.
    var _elapsedTotal = sessionStartTime ? Math.floor((Date.now() - sessionStartTime) / 1000) : 0;
    var _remainingDur = Math.max(1, sessionDurationSec - _elapsedTotal);
    var res = await fetch(SERVER_URL + '/session/start', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ endpoint: sub.endpoint, authKey: pushAuthKey(sub), intervalSec: sessionIntervalSec, durationSec: _remainingDur, pavlok: pavlokPayload })
    });
    var data = await res.json();
    // When the server is firing Pavlok, the client must NOT also fire it (avoids double-zaps)
    pavlokServerManaged = !!(data && data.pavlokManaged);
    console.log('Server session started:', JSON.stringify(data));
  } catch(e) { console.error('session/start error:', e); /* Server may be waking up, retry silently */ }
}

// Push the current awareness Pavlok prefs to the server mid-session (after the
// user moves the intensity slider or switches type) so server-fired stimuli update.
async function notifyServerPavlokUpdate() {
  try {
    var sub = await getSubscription();
    if (!sub) return;
    var pvk = getPavlokPrefs();
    var pavlokPayload = null;
    if (getPavlokToken() && pvk.awareness.enabled) {
      pavlokPayload = { token: getPavlokToken(), enabled: true, type: pvk.awareness.type || 'vibe', intensity: pvk.awareness.intensity || 50 };
    }
    var res = await fetch(SERVER_URL + '/session/pavlok', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ endpoint: sub.endpoint, authKey: pushAuthKey(sub), pavlok: pavlokPayload })
    });
    var data = await res.json();
    pavlokServerManaged = !!(data && data.pavlokManaged);
  } catch(e) { /* silent — client fallback still works */ }
}

async function notifyServerSessionEnd() {
  try {
    var sub = await getSubscription();
    if (!sub) return;
    await fetch(SERVER_URL + '/session/end', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ endpoint: sub.endpoint, authKey: pushAuthKey(sub) }) });
  } catch(e) { console.error('session/end error:', e); }
}

// A gentle, tappable "new version ready" pill. Tapping reloads into the fresh
// shell and flags a one-time reconciliation pull so the updated (correct) merge
// logic re-runs against the cloud immediately after the refresh.
function showAppUpdateBanner() {
  if (document.getElementById('appUpdateBanner')) return;
  var bar = document.createElement('div');
  bar.id = 'appUpdateBanner';
  bar.setAttribute('role', 'button');
  bar.style.cssText = 'position:fixed;left:50%;transform:translateX(-50%);bottom:max(env(safe-area-inset-bottom),18px);'
    + 'z-index:99999;display:flex;align-items:center;gap:9px;padding:11px 18px;border-radius:999px;'
    + 'background:rgba(126,184,164,.16);border:1px solid rgba(126,184,164,.42);-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px);'
    + 'color:#bfe3d4;font-family:\'DM Mono\',monospace;font-size:11px;letter-spacing:.05em;cursor:pointer;'
    + 'box-shadow:0 6px 24px rgba(0,0,0,.35);max-width:calc(100vw - 32px);transition:opacity .4s ease;opacity:0;';
  setTimeout(function() { bar.style.opacity = '1'; }, 30);
  bar.innerHTML = '<span style="font-size:13px;">✦</span><span>New version ready — tap to refresh</span>';
  bar.addEventListener('click', function() {
    try { sessionStorage.setItem('_postUpdatePull', '1'); } catch(e) {}
    window.location.reload();
  });
  document.body.appendChild(bar);
}

// After an update-triggered refresh, re-pull once with the freshly-loaded code
// so the corrected merge logic reconciles this device's state with the cloud.
window.addEventListener('load', function() {
  if (!sessionStorage.getItem('_postUpdatePull')) return;
  sessionStorage.removeItem('_postUpdatePull');
  setTimeout(function() {
    if (syncEnabled && authToken && typeof syncPullData === 'function') syncPullData();
  }, 1200);
});

// Auto re-subscribe on load
if ('serviceWorker' in navigator) {
  // Whether a worker was already controlling this page when it loaded. On a
  // first-ever visit there's no controller, so the initial controllerchange
  // (when our SW first takes control) must NOT surface an update prompt — only
  // a genuine *update* on a returning device should.
  var _swHadController = !!navigator.serviceWorker.controller;
  var _swUpdateShown = false;
  navigator.serviceWorker.addEventListener('controllerchange', function() {
    if (_swUpdateShown || !_swHadController) return;
    _swUpdateShown = true;
    // A fresh version has activated in the background. Rather than yanking the
    // page out from under the user, offer a gentle, tappable refresh so they
    // control the timing (and we never interrupt a live session).
    showAppUpdateBanner();
  });

  window.addEventListener('load', async function() {
    try {
      var reg = await navigator.serviceWorker.register(SW_PATH);
      // Proactively check for a newer cached shell. sw.js calls skipWaiting()
      // on install, so a fresh version activates immediately and fires the
      // controllerchange handler above — which surfaces the refresh banner.
      try { reg.update(); } catch(e) {}
      if (Notification.permission === 'granted') {
        var sub = await reg.pushManager.getSubscription();
        if (!sub) { sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) }); }
        await fetch(SERVER_URL + '/subscribe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(sub) });
        // Sync prayer schedule on every load — always send even if disabled
        // so server knows the current state
        var tzOff = -new Date().getTimezoneOffset();
        await fetch(SERVER_URL + '/prayer/schedule', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            endpoint: sub.endpoint, authKey: pushAuthKey(sub),
            times: prayerState.times.slice(0, prayerState.count),
            enabled: prayerState.enabled !== false,
            tzOffset: tzOff
          })
        });
        console.log('Prayer schedule synced (tz offset: ' + tzOff + 'min)');
        // Keep the server's practice-reminder schedule in sync on every load.
        if (typeof syncPracticeReminderToServer === 'function') { try { await syncPracticeReminderToServer(); } catch(e) {} }
      }
    } catch(err) { console.error('SW setup failed:', err); }
  });
}

// Login screen removed — sign-in handled via Google in Tutorial and Settings
