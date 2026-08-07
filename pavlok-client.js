// ── Pavlok integration ────────────────────────────────────────────────────────
var PAVLOK_TOKEN_KEY  = 'presence_pavlok_token';
var PAVLOK_EMAIL_KEY  = 'presence_pavlok_email';
var PAVLOK_PREFS_KEY  = 'presence_pavlok_prefs';
var PAVLOK_DEFAULT_PREFS = {
  awareness:     { enabled: true,  intensity: 50, type: 'vibe' },
  prayer:        { enabled: true,  intensity: 40 },
  concentration: { enabled: true,  intensity: 60 },
};

// Older builds persisted the Pavlok password for silent token renewal. Purge
// that legacy secret immediately; reconnects now require explicit entry.
try { localStorage.removeItem('presence_pavlok_pass'); } catch(e) {}

function getPavlokToken() { return localStorage.getItem(PAVLOK_TOKEN_KEY) || ''; }
function getPavlokEmail() { return localStorage.getItem(PAVLOK_EMAIL_KEY) || ''; }
function getPavlokPrefs() {
  try { var p = JSON.parse(localStorage.getItem(PAVLOK_PREFS_KEY)); if (p) return p; } catch(e) {}
  return JSON.parse(JSON.stringify(PAVLOK_DEFAULT_PREFS));
}
function savePavlokPrefs(prefs) { localStorage.setItem(PAVLOK_PREFS_KEY, JSON.stringify(prefs)); }

function sendPavlokStimulus(type, intensity) {
  var token = getPavlokToken();
  if (!token) return;
  var val = Math.max(1, Math.min(100, intensity || 50));
  fetch(SERVER_URL + '/api/pavlok/stimulus', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: token, type: type, value: val }),
  }).then(function(r) {
    if (r.status !== 401) return;
    localStorage.removeItem(PAVLOK_TOKEN_KEY);
    renderPavlokSettings();
    showToast('Pavlok session expired — reconnect in Settings');
  }).catch(function() {});
}

function pavlokConnect(email, password, statusEl) {
  if (statusEl) statusEl.textContent = 'Connecting…';
  fetch(SERVER_URL + '/api/pavlok/link', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: email, password: password }),
  })
  .then(function(r) { return r.json().then(function(d) { return { ok: r.ok, d: d }; }); })
  .then(function(res) {
    if (!res.ok || !res.d.token) {
      if (statusEl) statusEl.textContent = res.d.error || 'Login failed — check your credentials';
      return;
    }
    localStorage.setItem(PAVLOK_TOKEN_KEY, res.d.token);
    localStorage.setItem(PAVLOK_EMAIL_KEY, email);
    renderPavlokSettings();
    notifyServerPavlokUpdate();
  })
  .catch(function() { if (statusEl) statusEl.textContent = 'Network error — try again'; });
}

function pavlokDisconnect() {
  localStorage.removeItem(PAVLOK_TOKEN_KEY);
  localStorage.removeItem(PAVLOK_EMAIL_KEY);
  localStorage.removeItem('presence_pavlok_pass');
  renderPavlokSettings();
}

function pavlokTest() {
  var token = getPavlokToken();
  if (!token) { showToast('No Pavlok token'); return; }
  var p = getPavlokPrefs();
  var type = p.awareness.type || 'vibe';
  var val = Math.max(1, Math.min(100, p.awareness.intensity || 50));
  showToast('Sending test stimulus…');
  fetch(SERVER_URL + '/api/pavlok/stimulus', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: token, type: type, value: val }),
  }).then(function(r) {
    return r.json().then(function(d) { return { status: r.status, d: d }; });
  }).then(function(res) {
    if (res.status === 200) {
      showToast('Pavlok OK — stimulus sent');
    } else if (res.status === 401) {
      localStorage.removeItem(PAVLOK_TOKEN_KEY);
      renderPavlokSettings();
      showToast('Token expired — re-link Pavlok in settings');
    } else {
      var msg = (res.d && (res.d.error || JSON.stringify(res.d))) || ('HTTP ' + res.status);
      showToast('Pavlok error: ' + msg, 6000);
    }
  }).catch(function(e) {
    showToast('Network error: ' + (e.message || e));
  });
}

function renderPavlokSettings() {
  var card = document.getElementById('pavlokSettingsCard');
  if (!card) return;
  var token = getPavlokToken();
  var email = getPavlokEmail();
  var p = getPavlokPrefs();

  function intensityHtml(key) {
    var val = p[key].intensity || 50;
    var pct = val + '%';
    return '<div class="pvk-slider-row">'
      + '<input type="range" min="1" max="100" value="' + val + '" class="pvk-slider" style="--pct:' + pct + ';"'
      + ' oninput="pavlokSliderInput(this,\'' + key + '\')"'
      + ' onchange="pavlokSetIntensity(\'' + key + '\',+this.value)">'
      + '<span class="pvk-slider-val" id="pvkSliderVal_' + key + '">' + val + '</span>'
      + '</div>';
  }

  if (!token) {
    card.innerHTML = ''
      + '<div style="font-size:0.75rem;color:var(--text);margin-bottom:4px;">Connect your Pavlok</div>'
      + '<div style="font-size:0.625rem;color:var(--muted);line-height:1.6;margin-bottom:14px;">Use your Pavlok account credentials. Your password is never stored — only the session token is saved locally.</div>'
      + '<div class="pvk-connect-form" style="display:flex;flex-direction:column;gap:10px;">'
      + '<input class="pvk-input" id="pvkEmail" type="email" placeholder="Pavlok account email" autocomplete="email"/>'
      + '<input class="pvk-input" id="pvkPass" type="password" placeholder="Password" autocomplete="current-password"/>'
      + '<button class="btn primary" style="background:rgba(155,142,196,.12);border-color:rgba(155,142,196,.35);color:#c4b8e8;" onclick="pavlokConnectFromForm()">Connect Pavlok</button>'
      + '<div class="pvk-status" id="pvkStatus"></div>'
      + '</div>';
  } else {
    card.innerHTML = ''
      + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">'
      + '<span class="pvk-connected-badge">' + (email || 'Connected') + '</span>'
      + '<button onclick="pavlokDisconnect()" style="background:none;border:none;font-family:\'DM Mono\',monospace;font-size:0.5625rem;letter-spacing:.14em;text-transform:uppercase;color:var(--muted);cursor:pointer;padding:4px 0;">Disconnect</button>'
      + '</div>'
      + '<div class="pvk-row">'
      + '<div><div class="pvk-row-label">Awareness reminder</div><div class="pvk-row-sub">' + (p.awareness.type === 'zap' ? 'Zap' : p.awareness.type === 'beep' ? 'Beep' : 'Vibrate') + ' at each interval bell</div></div>'
      + '<button class="pvk-toggle ' + (p.awareness.enabled ? 'on' : 'off') + '" onclick="pavlokToggle(\'awareness\')"></button>'
      + '</div>'
      + (p.awareness.enabled ? '<div style="padding:8px 0 2px;"><div class="pvk-intensity" style="margin-bottom:8px;">'
        + ['vibe','beep','zap'].map(function(t) {
            var sel = (p.awareness.type || 'vibe') === t ? ' sel' : '';
            var label = t === 'vibe' ? 'Vibrate' : t === 'beep' ? 'Beep' : '⚡ Zap';
            return '<button class="pvk-lvl' + sel + '" onclick="pavlokSetType(\'awareness\',\'' + t + '\')">' + label + '</button>';
          }).join('')
        + '</div>' + intensityHtml('awareness') + '</div>' : '')
      + '<div class="pvk-row">'
      + '<div><div class="pvk-row-label">Prayer time</div><div class="pvk-row-sub">Vibrate when a prayer time fires</div></div>'
      + '<button class="pvk-toggle ' + (p.prayer.enabled ? 'on' : 'off') + '" onclick="pavlokToggle(\'prayer\')"></button>'
      + '</div>'
      + (p.prayer.enabled ? '<div style="padding:8px 0 4px;">' + intensityHtml('prayer') + '</div>' : '')
      + '<div class="pvk-row">'
      + '<div><div class="pvk-row-label">Concentration end</div><div class="pvk-row-sub">Vibrate when a session completes</div></div>'
      + '<button class="pvk-toggle ' + (p.concentration.enabled ? 'on' : 'off') + '" onclick="pavlokToggle(\'concentration\')"></button>'
      + '</div>'
      + (p.concentration.enabled ? '<div style="padding:8px 0 12px;">' + intensityHtml('concentration') + '</div>' : '')
      + '<button onclick="pavlokTest()" style="margin-top:8px;width:100%;padding:10px;border-radius:8px;border:1px solid var(--border);background:none;color:var(--muted);font-family:\'DM Mono\',monospace;font-size:0.5625rem;letter-spacing:.18em;text-transform:uppercase;cursor:pointer;">Test vibration</button>';
  }
}

function pavlokConnectFromForm() {
  var email = (document.getElementById('pvkEmail') || {}).value || '';
  var pass  = (document.getElementById('pvkPass')  || {}).value || '';
  var status = document.getElementById('pvkStatus');
  if (!email || !pass) { if (status) status.textContent = 'Enter your email and password'; return; }
  pavlokConnect(email.trim(), pass, status);
}

function pavlokToggle(key) {
  var p = getPavlokPrefs();
  p[key].enabled = !p[key].enabled;
  savePavlokPrefs(p);
  renderPavlokSettings();
}

function pavlokSliderInput(el, key) {
  var val = +el.value;
  el.style.setProperty('--pct', val + '%');
  var label = document.getElementById('pvkSliderVal_' + key);
  if (label) label.textContent = val;
}

function pavlokSetIntensity(key, val) {
  var p = getPavlokPrefs();
  p[key].intensity = +val;
  savePavlokPrefs(p);
}

function pavlokSetType(key, type) {
  var p = getPavlokPrefs();
  p[key].type = type;
  savePavlokPrefs(p);
  renderPavlokSettings();
}
