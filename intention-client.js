// Next-sit intention.
//
// Deciding exactly when and where you will act ("tomorrow at 7:00, at my
// desk") makes people far more likely to follow through than a general
// reminder does. After the first session of each day, once its ceremonies
// have played, Presence asks when the next sit will be. The answer becomes a
// one-time push at that moment (server: /practice/intention), and keeping the
// intention the next day is acknowledged on the result screen.

var INTENTION_KEY = 'presence_intention_v1';
var INTENTION_PROMPTED_KEY = 'presence_intention_prompted';
var INTENTION_TIMES = [
  { label: 'Morning', time: '07:00' },
  { label: 'Midday', time: '12:30' },
  { label: 'Evening', time: '20:00' }
];
var INTENTION_PLACES = ['at home', 'at work', 'outside'];

function intentionLoad() {
  try { var v = JSON.parse(localStorage.getItem(INTENTION_KEY)); if (v && v.day) return v; } catch (e) {}
  return null;
}
function intentionSave(v) {
  try { localStorage.setItem(INTENTION_KEY, JSON.stringify(v)); } catch (e) {}
}

function intentionTomorrowKey(now) {
  var d = new Date(now || Date.now());
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() + 1);
  return presenceDayKey(d);
}

// Local "HH:MM" on a day key → epoch ms.
function intentionAt(dayKey, time) {
  var p = String(dayKey).split('-').map(Number);
  var t = String(time).split(':').map(Number);
  return new Date(p[0], p[1] - 1, p[2], t[0] || 0, t[1] || 0, 0, 0).getTime();
}

function intentionFmtTime(time) {
  var t = String(time).split(':').map(Number);
  var h = t[0] % 12 || 12;
  return h + ':' + String(t[1] || 0).padStart(2, '0') + (t[0] < 12 ? ' am' : ' pm');
}

// The current time rounded to the quarter hour, offered as "same time".
function intentionSameTimeNow(now) {
  var d = new Date(now || Date.now());
  var mins = Math.round((d.getHours() * 60 + d.getMinutes()) / 15) * 15 % (24 * 60);
  return String(Math.floor(mins / 60)).padStart(2, '0') + ':' + String(mins % 60).padStart(2, '0');
}

// Called for every completed session (from touchPracticeStreak).
function intentionOnSession() {
  window._pendingIntentionKept = null;
  if (typeof presenceDayKey !== 'function') return;
  var today = presenceDayKey();
  var v = intentionLoad();
  if (v && v.day === today && !v.kept) {
    v.kept = true;
    intentionSave(v);
    window._pendingIntentionKept = v;
  }
  if (window._tutorialFirstClock) return;
  var prompted = null;
  try { prompted = localStorage.getItem(INTENTION_PROMPTED_KEY); } catch (e) {}
  if (prompted === today) return;
  if (v && v.day === intentionTomorrowKey()) return; // already planned
  if (typeof completionFlowQueue === 'function') {
    completionFlowQueue('intention-prompt', 70, showIntentionSheet);
  }
}

function intentionKeptBannerHtml(v) {
  if (!v) return '';
  return '<div class="in-kept"><div class="in-kept-kicker">✓ Intention kept</div>'
    + '<div class="in-kept-text">You said you would sit' + (v.place ? ' ' + escHtml(v.place) : '') + ' today, and you did.</div></div>';
}

function intentionSchedulePush(v) {
  if (typeof getSubscription !== 'function' || typeof SERVER_URL === 'undefined') return;
  getSubscription().then(function(sub) {
    if (!sub) return;
    return fetch(SERVER_URL + '/practice/intention', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ endpoint: sub.endpoint, authKey: pushAuthKey(sub), at: intentionAt(v.day, v.time), place: v.place || '' })
    });
  }).catch(function() {});
}

function showIntentionSheet(done) {
  try { localStorage.setItem(INTENTION_PROMPTED_KEY, presenceDayKey()); } catch (e) {}
  var same = intentionSameTimeNow();
  var times = [{ label: 'Same time', time: same }].concat(INTENTION_TIMES.filter(function(t) { return t.time !== same; }));
  var pick = { time: same, place: '' };

  var overlay = document.createElement('div');
  overlay.className = 'in-overlay';
  overlay.innerHTML = '<div class="in-sheet" role="dialog" aria-labelledby="inTitle">'
    + '<div class="in-title" id="inTitle">When will you sit tomorrow?</div>'
    + '<div class="in-sub">Deciding when and where now makes it far more likely to happen.</div>'
    + '<div class="in-label">Time</div>'
    + '<div class="in-chips" id="inTimes">'
    + times.map(function(t, i) {
      return '<button type="button" class="in-chip' + (i === 0 ? ' on' : '') + '" data-time="' + t.time + '">'
        + t.label + '<span>' + intentionFmtTime(t.time) + '</span></button>';
    }).join('')
    + '<label class="in-chip in-chip--input">Other<input type="time" id="inTimeInput" value="' + same + '"></label>'
    + '</div>'
    + '<div class="in-label">Where</div>'
    + '<div class="in-chips" id="inPlaces">'
    + INTENTION_PLACES.map(function(p) { return '<button type="button" class="in-chip" data-place="' + p + '">' + p + '</button>'; }).join('')
    + '</div>'
    + '<input class="in-place-input" id="inPlaceInput" maxlength="40" placeholder="or somewhere else… (optional)">'
    + '<button type="button" class="in-set" id="inSetBtn">Set intention</button>'
    + '<button type="button" class="in-skip" id="inSkipBtn">Not now</button>'
    + '</div>';
  document.body.appendChild(overlay);

  function close() {
    overlay.classList.remove('in-vis');
    setTimeout(function() { if (overlay.parentNode) overlay.parentNode.removeChild(overlay); done(); }, 320);
  }
  function selectTime(time, btn) {
    pick.time = time;
    overlay.querySelectorAll('#inTimes .in-chip').forEach(function(c) { c.classList.toggle('on', c === btn); });
  }
  overlay.querySelectorAll('#inTimes [data-time]').forEach(function(btn) {
    btn.onclick = function() { selectTime(btn.dataset.time, btn); };
  });
  var timeInput = overlay.querySelector('#inTimeInput');
  timeInput.onchange = function() { if (timeInput.value) selectTime(timeInput.value, timeInput.parentNode); };
  timeInput.onfocus = function() { selectTime(timeInput.value || same, timeInput.parentNode); };
  var placeInput = overlay.querySelector('#inPlaceInput');
  overlay.querySelectorAll('#inPlaces [data-place]').forEach(function(btn) {
    btn.onclick = function() {
      var on = !btn.classList.contains('on');
      overlay.querySelectorAll('#inPlaces .in-chip').forEach(function(c) { c.classList.remove('on'); });
      btn.classList.toggle('on', on);
      pick.place = on ? btn.dataset.place : '';
      if (on) placeInput.value = '';
    };
  });
  placeInput.oninput = function() {
    overlay.querySelectorAll('#inPlaces .in-chip').forEach(function(c) { c.classList.remove('on'); });
    pick.place = placeInput.value.trim();
  };
  overlay.querySelector('#inSetBtn').onclick = function() {
    var v = { day: intentionTomorrowKey(), time: pick.time, place: pick.place.slice(0, 40), setOn: presenceDayKey(), kept: false };
    intentionSave(v);
    intentionSchedulePush(v);
    if (typeof showToast === 'function') {
      showToast('Tomorrow at ' + intentionFmtTime(v.time) + (v.place ? ', ' + v.place : '') + ' · Omnia will remind you', 3400);
    }
    close();
  };
  overlay.querySelector('#inSkipBtn').onclick = close;
  requestAnimationFrame(function() { requestAnimationFrame(function() { overlay.classList.add('in-vis'); }); });
}
