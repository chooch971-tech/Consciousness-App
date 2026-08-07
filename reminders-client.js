// ── Reminder notification scheduling ───────────────────────────
function scheduleReminderNotifications(times) {
  if (!times || !times.length) return;
  localStorage.setItem('presence_reminder_times', JSON.stringify(times));
  _armReminderTimeouts(times);
}

function _armReminderTimeouts(times) {
  var now = new Date();
  times.forEach(function(t) {
    var parts = t.split(':');
    var target = new Date(now);
    target.setHours(parseInt(parts[0], 10), parseInt(parts[1], 10), 0, 0);
    if (target <= now) return;
    var ms = target - now;
    setTimeout(function() {
      // Don't interrupt a live Concentration exercise with a training nudge —
      // the whole point of the session is uninterrupted focus. The matching
      // push notification is suppressed the same way (see awareness-client.js).
      if (window._inConcSession) return;
      playReminderBell();
      showToast('Time to train.');
    }, ms);
  });
}

function checkRemindersOnLoad() {
  var saved = localStorage.getItem('presence_reminder_times');
  if (!saved) return;
  var times;
  try { times = JSON.parse(saved); } catch(e) { return; }
  _armReminderTimeouts(times);
}
// ───────────────────────────────────────────────────────────────

// ── Practice reminders (Omnia push notifications) ──────────────
// Unlike the in-app timeouts above, these fire as real push notifications via
// the server even when the app is closed. The frequency level maps to a fixed
// set of local times; the level is seeded from the tutorial's reminder choice.
var PRACTICE_REMINDER_KEY = 'presence_practice_reminders';
var PRACTICE_REMINDER_LEVELS = {
  gentle:   { label:'Gentle',   sub:'Once a day · evening',              times:['20:00'] },
  balanced: { label:'Balanced', sub:'Twice a day · morning & evening',   times:['07:00','20:00'] },
  frequent: { label:'Frequent', sub:'Three a day · morning, noon, night',times:['07:00','12:00','20:00'] },
};
function getPracticeReminderPrefs() {
  try { var p = JSON.parse(localStorage.getItem(PRACTICE_REMINDER_KEY)); if (p && p.level) return p; } catch(e) {}
  return { enabled:false, level:'balanced' };
}
function savePracticeReminderPrefs(p) { localStorage.setItem(PRACTICE_REMINDER_KEY, JSON.stringify(p)); }
function practiceTimesForLevel(level) {
  var l = PRACTICE_REMINDER_LEVELS[level] || PRACTICE_REMINDER_LEVELS.balanced;
  return l.times.slice();
}
// Map a tutorial reminder-time selection (subset of morning/noon/evening) to a
// frequency level by how many slots were chosen.
function practiceLevelForCount(n) { return n >= 3 ? 'frequent' : n === 2 ? 'balanced' : 'gentle'; }

async function syncPracticeReminderToServer() {
  try {
    var sub = await getSubscription();
    if (!sub) return;
    var p = getPracticeReminderPrefs();
    var tzOffset = -new Date().getTimezoneOffset(); // minutes ahead of UTC
    await fetch(SERVER_URL + '/practice/schedule', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({
        endpoint: sub.endpoint, authKey: pushAuthKey(sub),
        times: p.enabled ? practiceTimesForLevel(p.level) : [],
        enabled: !!p.enabled,
        tzOffset: tzOffset
      })
    });
  } catch(e) { console.error('Practice reminder sync failed:', e); }
}

function renderPracticeReminderSettings() {
  var card = document.getElementById('practiceReminderCard');
  if (!card) return;
  var p = getPracticeReminderPrefs();
  var html = '<div class="pvk-row">'
    + '<div><div class="pvk-row-label">Practice reminders</div><div class="pvk-row-sub">Omnia nudges you to train, even when the app is closed</div></div>'
    + '<button class="pvk-toggle ' + (p.enabled ? 'on' : 'off') + '" onclick="practiceReminderToggle()"></button>'
    + '</div>';
  if (p.enabled) {
    html += '<div style="margin-top:12px;font-size:0.5625rem;letter-spacing:.16em;text-transform:uppercase;color:var(--muted);margin-bottom:8px;">How often</div>';
    html += ['gentle','balanced','frequent'].map(function(lv) {
      var def = PRACTICE_REMINDER_LEVELS[lv];
      var sel = p.level === lv;
      return '<button onclick="practiceReminderSetLevel(\'' + lv + '\')" style="display:flex;justify-content:space-between;align-items:center;width:100%;text-align:left;padding:11px 13px;margin-bottom:6px;border-radius:9px;cursor:pointer;'
        + 'background:' + (sel ? 'rgba(142,204,224,.12)' : 'rgba(255,255,255,.03)') + ';'
        + 'border:1px solid ' + (sel ? 'rgba(142,204,224,.45)' : 'var(--border)') + ';">'
        + '<div><div style="font-size:0.6875rem;color:' + (sel ? '#8eccc0' : 'var(--text)') + ';">' + def.label + '</div>'
        + '<div style="font-size:0.5625rem;color:var(--muted);margin-top:2px;">' + def.sub + '</div></div>'
        + '<div style="width:16px;height:16px;border-radius:50%;flex-shrink:0;border:1px solid ' + (sel ? '#8eccc0' : 'var(--border2)') + ';background:' + (sel ? '#8eccc0' : 'transparent') + ';"></div>'
        + '</button>';
    }).join('');
  }
  card.innerHTML = html;
}

async function practiceReminderToggle() {
  var p = getPracticeReminderPrefs();
  p.enabled = !p.enabled;
  savePracticeReminderPrefs(p);
  renderPracticeReminderSettings();
  if (p.enabled) {
    // Make sure we actually have a push subscription before promising reminders —
    // await it so the schedule sync below finds the subscription.
    if (typeof registerWebPush === 'function') { try { await registerWebPush(); } catch(e) {} }
    showToast('Omnia will remind you to practice');
  } else {
    showToast('Practice reminders off');
  }
  syncPracticeReminderToServer();
}
function practiceReminderSetLevel(level) {
  var p = getPracticeReminderPrefs();
  p.level = level;
  p.enabled = true;
  savePracticeReminderPrefs(p);
  renderPracticeReminderSettings();
  syncPracticeReminderToServer();
}
// ───────────────────────────────────────────────────────────────
