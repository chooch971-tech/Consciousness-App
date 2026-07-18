document.getElementById('customVisUpload').addEventListener('change', function(e) {
  var files = Array.from(e.target.files);
  if (!files.length) return;
  var MAX_SIZE = 10 * 1024 * 1024; // 10 MB cap before reading
  var oversized = files.filter(function(f) { return f.size > MAX_SIZE; });
  files = files.filter(function(f) { return f.size <= MAX_SIZE && f.type.indexOf('image/') === 0; });
  if (oversized.length) showToast('Skipped ' + oversized.length + ' file(s) over 10 MB.', 3000);
  if (!files.length) { e.target.value = ''; return; }
  var imgs = loadCustomVisImages();
  var remaining = files.length;
  files.forEach(function(file) {
    var reader = new FileReader();
    reader.onload = function(ev) {
      resizeImageForStorage(ev.target.result, function(dataUrl) {
        imgs.push({
          id: Date.now() + '_' + Math.random().toString(36).substr(2, 6),
          name: file.name.replace(/\.[^/.]+$/, ''),
          dataUrl: dataUrl
        });
        remaining--;
        if (remaining === 0) {
          saveCustomVisImages(imgs);
          renderCustomVisImageList();
          showToast(files.length === 1 ? '1 image added' : files.length + ' images added');
        }
      });
    };
    reader.readAsDataURL(file);
  });
  e.target.value = '';
});

function _isAudioFile(f) {
  if (f.type && f.type.indexOf('audio/') === 0) return true;
  return /\.(mp3|ogg|oga|m4a|aac|wav|flac|opus|weba|webm)$/i.test(f.name || '');
}
document.getElementById('customAudUpload').addEventListener('change', function(e) {
  var files = Array.from(e.target.files);
  if (!files.length) return;
  var MAX_SIZE = 100 * 1024 * 1024; // 100 MB cap
  var oversized = files.filter(function(f) { return f.size > MAX_SIZE; });
  files = files.filter(function(f) { return f.size <= MAX_SIZE && _isAudioFile(f); });
  if (oversized.length) showToast('Skipped ' + oversized.length + ' file(s) over 100 MB.', 3000);
  if (!files.length) { e.target.value = ''; return; }
  showToast(files.length === 1 ? 'Adding sound…' : 'Adding ' + files.length + ' sounds…');
  var sounds = loadCustomAudSounds();
  var added = 0, failed = 0, remaining = files.length;
  function finish() {
    saveCustomAudSounds(sounds);
    renderCustomAudSoundList();
    if (document.getElementById('soundGrid')) buildSoundGrid();
    if (added) showToast(added === 1 ? '1 sound added' : added + ' sounds added');
    if (failed) showToast('Could not store ' + failed + ' file(s) — device storage may be full.', 3500);
  }
  files.forEach(function(file) {
    var id = 'custom_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
    audDbPut(id, file).then(function() {
      sounds.push({ id: id, name: file.name.replace(/\.[^/.]+$/, ''), kind: 'blob' });
      added++;
    }, function() {
      failed++;
    }).then(function() {
      remaining--;
      if (remaining === 0) finish();
    });
  });
  e.target.value = '';
});

function addAudioUrlSound() {
  var inp = document.getElementById('audUrlInput');
  if (!inp) return;
  var url = (inp.value || '').trim();
  if (!url) return;
  if (/youtube\.com|youtu\.be/i.test(url)) { showToast('YouTube isn’t supported — paste a direct .mp3 link'); return; }
  if (!/^https?:\/\//i.test(url)) { showToast('Enter a direct audio link (https://…)'); return; }
  var sounds = loadCustomAudSounds();
  if (sounds.some(function(s) { return s.kind === 'url' && s.url === url; })) {
    showToast('That link is already added'); inp.value = ''; return;
  }
  var name = 'Audio link';
  try {
    var path = url.split('?')[0].split('#')[0];
    var file = decodeURIComponent(path.substring(path.lastIndexOf('/') + 1));
    if (file) name = file.replace(/\.[^/.]+$/, '');
  } catch(e) {}
  var entry = { id: 'custom_url_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6), name: name || 'Audio link', kind: 'url', url: url };
  sounds.push(entry);
  saveCustomAudSounds(sounds);
  renderCustomAudSoundList();
  if (document.getElementById('soundGrid')) buildSoundGrid();
  inp.value = '';
  showToast('Sound added');
}
document.getElementById('audUrlAddBtn').addEventListener('click', addAudioUrlSound);
document.getElementById('audUrlInput').addEventListener('keydown', function(e) {
  if (e.key === 'Enter') { e.preventDefault(); addAudioUrlSound(); }
});

document.getElementById('syncLogoutBtn').addEventListener('click', function() {
  showConfirm('Sign Out', 'Your progress is saved to the cloud and will be restored when you sign back in.', function() {
    authLogout({ clearLocalProgress: true });
  });
});

(function bindAccountDeletion() {
  var reveal = document.getElementById('accountDeleteReveal');
  var form = document.getElementById('accountDeleteForm');
  var confirmInput = document.getElementById('accountDeleteConfirm');
  var passwordInput = document.getElementById('accountDeletePassword');
  var submit = document.getElementById('accountDeleteSubmit');
  var cancel = document.getElementById('accountDeleteCancel');
  var error = document.getElementById('accountDeleteError');
  if (!reveal || !form || !confirmInput || !submit) return;

  function closeForm() {
    form.style.display = 'none';
    reveal.style.display = '';
    confirmInput.value = '';
    passwordInput.value = '';
    error.style.display = 'none';
    submit.disabled = true;
    submit.style.opacity = '.42';
    submit.textContent = 'Delete Forever';
  }
  reveal.addEventListener('click', function() {
    reveal.style.display = 'none';
    form.style.display = 'block';
    confirmInput.focus();
  });
  cancel.addEventListener('click', closeForm);
  confirmInput.addEventListener('input', function() {
    var ready = confirmInput.value.trim() === 'DELETE';
    submit.disabled = !ready;
    submit.style.opacity = ready ? '1' : '.42';
  });
  submit.addEventListener('click', async function() {
    if (confirmInput.value.trim() !== 'DELETE' || !authToken) return;
    submit.disabled = true;
    submit.style.opacity = '.65';
    submit.textContent = 'Deleting…';
    error.style.display = 'none';
    try {
      var response = await fetch(SYNC_API_URL + '/auth/account', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + authToken },
        body: JSON.stringify({ confirmation: 'DELETE', password: passwordInput.value })
      });
      var data = await response.json().catch(function() { return {}; });
      if (!response.ok) throw new Error(data.error || 'Account deletion failed');
      await clearDeletedAccountFromDevice();
    } catch(e) {
      error.textContent = e.message || 'Account deletion failed. Try again.';
      error.style.display = 'block';
      submit.disabled = false;
      submit.style.opacity = '1';
      submit.textContent = 'Delete Forever';
    }
  });
})();

document.getElementById('setUsernameBtn').addEventListener('click', async function() {
  var input = document.getElementById('setUsernameInput');
  var errEl = document.getElementById('setUsernameError');
  var val = (input.value || '').trim();
  if (!val) return;
  this.disabled = true;
  errEl.style.display = 'none';
  try {
    var res = await fetch(SYNC_API_URL + '/auth/set-username', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + authToken },
      body: JSON.stringify({ username: val })
    });
    var data = await res.json();
    if (res.ok) {
      authUsername = data.username;
      localStorage.setItem('presence_auth_username', authUsername);
      document.getElementById('setUsernameCard').style.display = 'none';
      document.getElementById('syncStatusEmail').textContent = '@' + authUsername + ' · ' + authEmail;
      showToast('Username set: @' + authUsername);
    } else {
      errEl.textContent = data.error || 'Failed to set username';
      errEl.style.display = 'block';
      this.disabled = false;
    }
  } catch(e) {
    errEl.textContent = 'Network error. Try again.';
    errEl.style.display = 'block';
    this.disabled = false;
  }
});
document.getElementById('setDisplayNameBtn').addEventListener('click', async function() {
  var input = document.getElementById('setDisplayNameInput');
  var errEl = document.getElementById('setDisplayNameError');
  var val = (input.value || '').trim();
  this.disabled = true;
  errEl.style.display = 'none';
  try {
    var res = await fetch(SYNC_API_URL + '/auth/set-display-name', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + authToken },
      body: JSON.stringify({ displayName: val })
    });
    var data = await res.json();
    if (res.ok) {
      authDisplayName = data.displayName || null;
      if (authDisplayName) localStorage.setItem('presence_display_name', authDisplayName);
      else localStorage.removeItem('presence_display_name');
      input.value = authDisplayName || '';
      if (typeof renderProfile === 'function') renderProfile();
      showToast(authDisplayName ? 'Name saved' : 'Name cleared');
    } else {
      errEl.textContent = data.error || 'Failed to save name';
      errEl.style.display = 'block';
    }
  } catch(e) {
    errEl.textContent = 'Network error. Try again.';
    errEl.style.display = 'block';
  } finally {
    this.disabled = false;
  }
});
// syncLoginBtn removed — sign-in now handled by settingsSignInWrap
document.getElementById('settingsBack').addEventListener('click', function() {
  renderHome(); showScreen('homeScreen');
});

// ── Apple-style per-exercise settings ──
var EXERCISE_SETTINGS_LIST = [
  { id:'clock',      name:'Clock Exercise',           icon:'⏱',  tint:'rgba(212,149,110,.16)', group:'conc' },
  { id:'visual',     name:'Visualization',            icon:'👁', tint:'rgba(110,159,212,.16)', group:'conc' },
  { id:'auditory',   name:'Auditory',                 icon:'🎧', tint:'rgba(110,184,164,.16)', group:'conc' },
  { id:'thought',    name:'Thought Control',          icon:'◌',  tint:'rgba(152,180,204,.16)', group:'conc' },
  { id:'asana',      name:'Asana',                    icon:'🧘', tint:'rgba(196,120,120,.16)', group:'conc' },
  { id:'multisense', name:'Multi-Sense Visualization',icon:'🎴', tint:'rgba(110,159,212,.16)', group:'conc' },
  { id:'allangles',  name:'All-Angles Visualization', icon:'🔄', tint:'rgba(110,159,212,.16)', group:'conc' },
  { id:'awareness',  name:'Awareness',                icon:'◉',  tint:'rgba(126,184,164,.16)', group:'practice' },
  { id:'prayer',     name:'Prayer',                   icon:'✦',  tint:'rgba(196,168,212,.16)', group:'practice' },
  { id:'soulmirror', name:'Soul Mirror',              icon:'◆',  tint:'rgba(164,126,184,.16)', group:'practice' },
  { id:'pore',       name:'Pore Breathing',           icon:'≋',  tint:'rgba(142,204,224,.16)', group:'practice' }
];

// Which parked functional blocks mount into each exercise sub-page.
var EXSET_BLOCKS = {
  visual:    [{ block:'visImagesBlock', header:'Custom Images' }],
  auditory:  [{ block:'audSoundsBlock', header:'Custom Sounds' }],
  awareness: [{ block:'settingsResetAwareness', header:'Reset', card:true, danger:true }],
  prayer:    [{ block:'settingsResetPrayer', header:'Reset', card:true, danger:true }]
};

function _asetRowHTML(ex) {
  return '<button class="aset-row" data-exset="' + ex.id + '">'
    + '<span class="aset-row__icon" style="background:' + ex.tint + ';">' + ex.icon + '</span>'
    + '<span class="aset-row__label">' + ex.name + '</span>'
    + '<span class="aset-row__chevron">›</span>'
    + '</button>';
}

// Return all relocatable functional blocks to the hidden parking container.
function _parkSettingsBlocks() {
  var park = document.getElementById('settingsParking');
  if (!park) return;
  ['acctSyncBlock','visImagesBlock','audSoundsBlock','settingsResetAwareness','settingsResetConc','settingsResetPrayer'].forEach(function(bid) {
    var el = document.getElementById(bid);
    if (el && el.parentNode !== park) park.appendChild(el);
  });
}

function renderSettingsExerciseList() {
  renderSettingsProfileBanner();
  _parkSettingsBlocks();
  var concCard = document.getElementById('settingsExConcCard');
  var pracCard = document.getElementById('settingsExPracticeCard');
  if (!concCard || !pracCard) return;
  concCard.innerHTML = EXERCISE_SETTINGS_LIST.filter(function(e){ return e.group === 'conc'; }).map(_asetRowHTML).join('');
  pracCard.innerHTML = EXERCISE_SETTINGS_LIST.filter(function(e){ return e.group === 'practice'; }).map(_asetRowHTML).join('');
  // Reset Concentration belongs to the whole Concentration category → append to that card.
  var resetConc = document.getElementById('settingsResetConc');
  if (resetConc) concCard.appendChild(resetConc);
}

function renderSettingsProfileBanner() {
  var av = document.getElementById('settingsProfileAvatar');
  var nm = document.getElementById('settingsProfileName');
  var sub = document.getElementById('settingsProfileSub');
  if (!av || !nm || !sub) return;
  var signedIn = !!(syncEnabled && (authEmail || authUsername));
  if (signedIn) {
    var display = authUsername || (authEmail ? authEmail.split('@')[0] : 'Account');
    av.textContent = (display[0] || '◎');
    av.className = 'aset-profile__avatar';
    nm.textContent = authUsername ? '@' + authUsername : display;
    sub.textContent = authEmail || 'Syncing across devices';
  } else {
    av.textContent = '◎';
    av.className = 'aset-profile__avatar aset-profile__avatar--out';
    nm.textContent = 'Sign in to Presence';
    sub.textContent = 'Sync your progress across devices';
  }
}

function openExerciseSettings(id) {
  if (id === 'clock') { openClockSettings('settingsScreen'); return; }
  var ex = EXERCISE_SETTINGS_LIST.find(function(e){ return e.id === id; });
  if (!ex) return;
  _parkSettingsBlocks();
  document.getElementById('exerciseSettingsTitle').textContent = ex.name;
  var body = document.getElementById('exerciseSettingsBody');
  var mounts = EXSET_BLOCKS[id];
  var html = '<div class="aset-group"><div class="aset-card">'
    + '<div class="aset-row" style="cursor:default;">'
    + '<span class="aset-row__icon" style="background:' + ex.tint + ';">' + ex.icon + '</span>'
    + '<span class="aset-row__label">' + ex.name + '</span>'
    + '</div></div></div>';
  if (mounts && mounts.length) {
    mounts.forEach(function(m, i) {
      html += '<div class="aset-group">'
        + '<div class="aset-header">' + m.header + '</div>'
        + (m.card ? '<div class="aset-card" id="exsetMount' + i + '"></div>' : '<div id="exsetMount' + i + '"></div>')
        + '</div>';
    });
  } else {
    html += '<div class="aset-placeholder">'
      + '<div class="aset-placeholder__mark">⚙</div>'
      + '<div class="aset-placeholder__title">Settings coming soon</div>'
      + '<div class="aset-placeholder__sub">Adjustable preferences for ' + ex.name + ' will live here. For now, options are chosen at the start of each session.</div>'
      + '</div>';
  }
  body.innerHTML = html;
  if (mounts && mounts.length) {
    mounts.forEach(function(m, i) {
      var mount = document.getElementById('exsetMount' + i);
      var blk = document.getElementById(m.block);
      if (mount && blk) mount.appendChild(blk);
    });
  }
  body.scrollTop = 0;
  showScreen('exerciseSettingsScreen');
}

function openAccountSettings() {
  _parkSettingsBlocks();
  var mount = document.getElementById('accountSyncMount');
  var blk = document.getElementById('acctSyncBlock');
  if (mount && blk) mount.appendChild(blk);
  if (syncEnabled && authEmail) { _refreshSettingsSyncCardSignedIn(); } else { _refreshSettingsSyncCard(); }
  _refreshPrivacyToggle();
  showScreen('accountSettingsScreen');
}

// Show the privacy toggle only for signed-in accounts, and sync its visual state.
function _refreshPrivacyToggle() {
  var group = document.getElementById('accountPrivacyGroup');
  var sw = document.getElementById('settingsPrivateSwitch');
  if (!group || !sw) return;
  var signedIn = !!(syncEnabled && authToken);
  group.style.display = signedIn ? '' : 'none';
  sw.classList.toggle('on', isProfilePrivate());
}

(function() {
  var btn = document.getElementById('settingsPrivateToggle');
  if (!btn) return;
  btn.addEventListener('click', function() {
    if (!authToken) { showToast('Sign in to manage privacy'); return; }
    setProfilePrivate(!isProfilePrivate());
    _refreshPrivacyToggle();
  });
})();

// Delegated row taps within the Settings exercises lists
document.getElementById('settingsScrollBody').addEventListener('click', function(e) {
  if (e.target.closest('#settingsProfileBanner')) { openAccountSettings(); return; }
  var row = e.target.closest('.aset-row[data-exset]');
  if (row) openExerciseSettings(row.dataset.exset);
});

document.getElementById('exerciseSettingsBack').addEventListener('click', function() {
  _parkSettingsBlocks();
  showScreen('settingsScreen');
});
document.getElementById('accountSettingsBack').addEventListener('click', function() {
  _parkSettingsBlocks();
  showScreen('settingsScreen');
});

// Settings email toggle
document.getElementById('settingsEmailToggle').addEventListener('click', function() {
  var form = document.getElementById('settingsEmailForm');
  var isOpen = form.style.display === 'flex';
  form.style.display = isOpen ? 'none' : 'flex';
  this.textContent = isOpen ? 'Continue with email →' : 'Hide email sign-in ↑';
});

// Live inline password-length check (create-account mode only; existing logins are unaffected).
// Mirrors the server's 8-char minimum so the user is warned as they type, not after submit.
function _liveCheckPassword(pwEl, errEl, getCreateMode, submitBtn) {
  if (!pwEl || !errEl) return;
  var v = pwEl.value || '';
  if (getCreateMode() && v.length > 0 && v.length < 8) {
    errEl.textContent = 'Password must be at least 8 characters (' + v.length + '/8)';
    errEl.style.display = 'block';
    if (submitBtn) submitBtn.disabled = true;
  } else {
    errEl.textContent = '';
    errEl.style.display = 'none';
    if (submitBtn) submitBtn.disabled = false;
  }
}

// Settings email sign-in / create account
var _settingsEmailMode = false; // false=sign-in, true=create-account
document.getElementById('settingsEmailCreate').addEventListener('click', function() {
  _settingsEmailMode = !_settingsEmailMode;
  document.getElementById('settingsEmailSubmit').textContent = _settingsEmailMode ? 'Create Account' : 'Sign In';
  this.textContent = _settingsEmailMode ? 'Sign In Instead' : 'Create Account';
  _liveCheckPassword(document.getElementById('settingsPasswordInput'), document.getElementById('settingsEmailError'), function() { return _settingsEmailMode; }, document.getElementById('settingsEmailSubmit'));
});
(function() {
  var pwEl = document.getElementById('settingsPasswordInput');
  if (pwEl) pwEl.addEventListener('input', function() {
    _liveCheckPassword(pwEl, document.getElementById('settingsEmailError'), function() { return _settingsEmailMode; }, document.getElementById('settingsEmailSubmit'));
  });
})();
document.getElementById('settingsEmailSubmit').addEventListener('click', async function() {
  var email = (document.getElementById('settingsEmailInput').value || '').trim();
  var password = document.getElementById('settingsPasswordInput').value;
  var errEl = document.getElementById('settingsEmailError');
  if (!email || !password) { errEl.textContent = 'Email and password required'; errEl.style.display = 'block'; return; }
  this.disabled = true;
  this.textContent = 'Please wait…';
  errEl.style.display = 'none';
  var ok = await authRegisterOrLogin(email, password, _settingsEmailMode, '');
  if (ok) {
    _refreshSettingsSyncCardSignedIn();
    showToast('Signed in ✓');
    syncPullData().then(function(restored) {
      if (restored) window.location.reload();
      else syncPushData();
    });
  } else {
    errEl.textContent = (window._lastAuthError || 'Sign-in failed');
    errEl.style.display = 'block';
    this.disabled = false;
    this.textContent = _settingsEmailMode ? 'Create Account' : 'Sign In';
  }
});

// ── EXPORT ──────────────────────────────────────────────
document.getElementById('exportBtn').addEventListener('click', function() {
  var keys = PRESENCE_SYNC.SYNC_KEYS;
  var backup = { version: 1, exportedAt: new Date().toISOString(), data: {} };
  keys.forEach(function(k) {
    var val = localStorage.getItem(k);
    if (val) backup.data[k] = val; // store as raw strings to avoid double-parse issues
  });
  var blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  var date = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = 'presence-backup-' + date + '.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast('Backup downloaded ✓');
});

// ── IMPORT ──────────────────────────────────────────────
document.getElementById('importFile').addEventListener('change', function(e) {
  var file = e.target.files[0];
  if (!file) return;
  var status = document.getElementById('importStatus');
  var reader = new FileReader();
  reader.onload = function(ev) {
    try {
      var backup = JSON.parse(ev.target.result);
      if (!backup.data || backup.version !== 1) throw new Error('Invalid backup file.');
      // Allowlist: only restore keys that the export writes. Prevents a malicious
      // backup from overwriting auth tokens or injecting unknown localStorage keys.
      var count = 0, skipped = 0;
      Object.entries(backup.data).forEach(function([k, v]) {
        if (!PRESENCE_SYNC.isSyncKey(k)) { skipped++; return; }
        if (typeof v !== 'string') { skipped++; return; }
        localStorage.setItem(k, v);
        count++;
      });
      if (skipped > 0) console.warn('[Import] Skipped ' + skipped + ' unknown/invalid keys');
      status.style.display = 'block';
      status.style.color = '#7eb8a4';
      status.textContent = '✓ ' + count + ' data keys restored. Reloading in 2 seconds…';
      console.log('[Presence] Import successful:', count, 'keys restored');
      setTimeout(function() { window.location.reload(); }, 2000);
    } catch(err) {
      status.style.display = 'block';
      status.style.color = '#d4956e';
      status.textContent = '✗ Could not read backup: ' + err.message;
      console.error('[Presence] Import failed:', err);
    }
  };
  reader.onerror = function() {
    status.style.display = 'block';
    status.style.color = '#d4956e';
    status.textContent = '✗ Could not read file.';
  };
  reader.readAsText(file);
  // Show immediate feedback while reading
  status.style.display = 'block';
  status.style.color = 'var(--muted)';
  status.textContent = 'Reading backup…';
  e.target.value = '';
});
document.getElementById('drawerDonate').addEventListener('click', function() {
  closeDrawer(true); // instant — window.open backgrounds the app; an animated close would freeze
  window.open('https://buymeacoffee.com/presence_app', '_blank');
});
document.getElementById('drawerPlayground').addEventListener('click', function() {
  closeDrawer(); showScreen('playgroundScreen');
});
document.getElementById('playgroundBack').addEventListener('click', function() {
  showScreen('homeScreen');
});
document.querySelectorAll('#playgroundScreen .pg-card').forEach(function(card) {
  card.addEventListener('click', function() {
    var name = card.getAttribute('data-pg-soon');
    showToast('✨ ' + name + ' is coming soon', 2600);
  });
});
document.getElementById('drawerFaq').addEventListener('click', function() {
  closeDrawer();
  showScreen('faqScreen');
});
document.getElementById('faqBackBtn').addEventListener('click', function() {
  renderHome(); showScreen('homeScreen');
});
// FAQ accordion — one section open at a time
document.querySelectorAll('#faqScreen .faq-item-head').forEach(function(head) {
  head.addEventListener('click', function() {
    var item = head.parentElement;
    var wasOpen = item.classList.contains('open');
    document.querySelectorAll('#faqScreen .faq-item.open').forEach(function(o) { o.classList.remove('open'); });
    if (!wasOpen) item.classList.add('open');
  });
});
