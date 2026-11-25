// Shareable practice cards.
//
// Practitioners share milestones in their own communities, which is how a
// niche practice app gets found. A card is drawn on a canvas as a 1080×1350
// image (the 4:5 shape feeds and stories both accept) and handed to the
// phone's share sheet, or downloaded where sharing files isn't supported.
// Two cards exist: this month's practice (from the Streak screen) and a new Step.

var SHARE_CARD_W = 1080;
var SHARE_CARD_H = 1350;

function shareCardFmtDuration(sec) {
  var mins = Math.round((sec || 0) / 60);
  if (mins < 60) return mins + 'm';
  var h = Math.floor(mins / 60), m = mins % 60;
  return h + 'h' + (m ? ' ' + m + 'm' : '');
}

function shareCardStepLine() {
  if (typeof omniaState === 'undefined' || !omniaState || typeof OMNIA_BARDON_STEPS === 'undefined') return '';
  var def = OMNIA_BARDON_STEPS.find(function(s) { return s.step === (omniaState.bardonStep || 1); });
  return def ? def.name : '';
}

function shareCardBackground(ctx) {
  var g = ctx.createLinearGradient(0, 0, 0, SHARE_CARD_H);
  g.addColorStop(0, '#0b1020');
  g.addColorStop(0.55, '#0d0b18');
  g.addColorStop(1, '#07070c');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, SHARE_CARD_W, SHARE_CARD_H);
  var glow = ctx.createRadialGradient(SHARE_CARD_W / 2, 360, 20, SHARE_CARD_W / 2, 360, 520);
  glow.addColorStop(0, 'rgba(184,234,255,0.22)');
  glow.addColorStop(1, 'rgba(184,234,255,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, SHARE_CARD_W, SHARE_CARD_H);
  // A fixed scatter of stars, so the same card always looks the same.
  var seed = 7;
  function rnd() { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; }
  for (var i = 0; i < 90; i++) {
    ctx.fillStyle = 'rgba(220,230,255,' + (0.15 + rnd() * 0.45).toFixed(2) + ')';
    ctx.beginPath();
    ctx.arc(rnd() * SHARE_CARD_W, rnd() * SHARE_CARD_H, 0.8 + rnd() * 1.8, 0, Math.PI * 2);
    ctx.fill();
  }
}

// Omnia's crystal, drawn directly so the card needs no image loading.
function shareCardCrystal(ctx, cx, cy, s) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.shadowColor = 'rgba(184,234,255,0.7)';
  ctx.shadowBlur = 40;
  var faces = [
    [[0, -1.0], [0.55, -0.35], [0, -0.2], 'rgba(220,244,255,0.95)'],
    [[0, -1.0], [-0.55, -0.35], [0, -0.2], 'rgba(170,214,240,0.92)'],
    [[-0.55, -0.35], [0, -0.2], [0, 1.0], 'rgba(120,170,210,0.9)'],
    [[0.55, -0.35], [0, -0.2], [0, 1.0], 'rgba(150,196,230,0.92)']
  ];
  faces.forEach(function(f) {
    ctx.fillStyle = f[3];
    ctx.beginPath();
    ctx.moveTo(f[0][0] * s, f[0][1] * s);
    ctx.lineTo(f[1][0] * s, f[1][1] * s);
    ctx.lineTo(f[2][0] * s, f[2][1] * s);
    ctx.closePath();
    ctx.fill();
  });
  ctx.restore();
}

function shareCardText(ctx, text, x, y, font, color, spacing) {
  ctx.font = font;
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  if (spacing && 'letterSpacing' in ctx) ctx.letterSpacing = spacing + 'px';
  ctx.fillText(text, x, y);
  if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
}

function shareCardStats(ctx, stats, y) {
  var colW = SHARE_CARD_W / stats.length;
  stats.forEach(function(st, i) {
    var cx = colW * i + colW / 2;
    shareCardText(ctx, st.value, cx, y, '300 88px "Cormorant Garamond", serif', st.color || '#efe6d6');
    shareCardText(ctx, st.label.toUpperCase(), cx, y + 54, '28px "DM Mono", monospace', 'rgba(220,214,200,0.6)', 5);
  });
}

function shareCardFooter(ctx, line) {
  if (line) shareCardText(ctx, line.toUpperCase(), SHARE_CARD_W / 2, SHARE_CARD_H - 150, '28px "DM Mono", monospace', 'rgba(184,234,255,0.7)', 5);
  shareCardText(ctx, 'Presence', SHARE_CARD_W / 2, SHARE_CARD_H - 80, '300 56px "Cormorant Garamond", serif', 'rgba(239,230,214,0.85)', 10);
}

// A row of the period's days: lit for days practiced.
function shareCardDays(ctx, daily, y) {
  if (!daily || !daily.length || daily.length > 31) return;
  var size = Math.min(56, Math.floor((SHARE_CARD_W - 160) / daily.length) - 8);
  var gap = 8;
  var total = daily.length * size + (daily.length - 1) * gap;
  var x0 = (SHARE_CARD_W - total) / 2;
  var rows = daily.length > 16 ? 2 : 1;
  var perRow = Math.ceil(daily.length / rows);
  if (rows === 2) {
    size = Math.min(56, Math.floor((SHARE_CARD_W - 160) / perRow) - gap);
    total = perRow * size + (perRow - 1) * gap;
    x0 = (SHARE_CARD_W - total) / 2;
  }
  daily.forEach(function(d, i) {
    var r = Math.floor(i / perRow), c = i % perRow;
    var x = x0 + c * (size + gap), yy = y + r * (size + gap);
    ctx.fillStyle = d.sessions ? 'rgba(126,184,164,0.85)' : 'rgba(255,255,255,0.07)';
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x, yy, size, size, size * 0.25); else ctx.rect(x, yy, size, size);
    ctx.fill();
  });
}

function shareCardCanvas() {
  var canvas = document.createElement('canvas');
  canvas.width = SHARE_CARD_W;
  canvas.height = SHARE_CARD_H;
  return canvas;
}

function drawPeriodCard(canvas, data) {
  var ctx = canvas.getContext('2d');
  shareCardBackground(ctx);
  shareCardCrystal(ctx, SHARE_CARD_W / 2, 300, 120);
  shareCardText(ctx, data.rangeLabel.toUpperCase(), SHARE_CARD_W / 2, 530, '30px "DM Mono", monospace', 'rgba(184,234,255,0.75)', 8);
  shareCardText(ctx, data.headline, SHARE_CARD_W / 2, 640, '300 104px "Cormorant Garamond", serif', '#efe6d6');
  shareCardDays(ctx, data.daily, 720);
  shareCardStats(ctx, data.stats, 1000);
  shareCardFooter(ctx, data.footer);
}

function drawStepCard(canvas, data) {
  var ctx = canvas.getContext('2d');
  shareCardBackground(ctx);
  shareCardCrystal(ctx, SHARE_CARD_W / 2, 330, 150);
  shareCardText(ctx, 'STEP ' + data.roman + ' REACHED', SHARE_CARD_W / 2, 590, '32px "DM Mono", monospace', 'rgba(184,234,255,0.8)', 10);
  shareCardText(ctx, data.title, SHARE_CARD_W / 2, 720, '300 120px "Cormorant Garamond", serif', '#efe6d6');
  shareCardStats(ctx, data.stats, 960);
  shareCardFooter(ctx, '');
}

// Hand the image to the share sheet, or download it where files can't be shared.
function shareCardDeliver(canvas, filename, text) {
  return new Promise(function(resolve) { canvas.toBlob(resolve, 'image/png'); }).then(function(blob) {
    if (!blob) throw new Error('no image');
    var file = typeof File === 'function' ? new File([blob], filename, { type: 'image/png' }) : null;
    if (file && navigator.canShare && navigator.canShare({ files: [file] })) {
      return navigator.share({ files: [file], text: text }).catch(function(e) {
        if (e && e.name === 'AbortError') return;
        throw e;
      });
    }
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function() { URL.revokeObjectURL(url); }, 4000);
    if (typeof showToast === 'function') showToast('Card saved', 2000);
  }).catch(function() {
    if (typeof showToast === 'function') showToast('Couldn’t make the card', 2400);
  });
}

function shareCardFontsReady() {
  if (!document.fonts || !document.fonts.load) return Promise.resolve();
  return Promise.all([
    document.fonts.load('300 100px "Cormorant Garamond"'),
    document.fonts.load('30px "DM Mono"')
  ]).catch(function() {});
}

// Pure: what a period card says for a Practice Review summary.
function periodCardData(summary, period, rangeLabel, streak, stepLine) {
  var days = summary.activeDays || 0;
  return {
    rangeLabel: rangeLabel,
    headline: days + ' day' + (days === 1 ? '' : 's') + ' of practice',
    daily: period === 'yearly' ? null : summary.daily,
    stats: [
      { value: shareCardFmtDuration(summary.totalSeconds), label: 'Practiced' },
      { value: String(summary.sessions || 0), label: 'Sessions' },
      { value: String(streak || 0), label: 'Day streak', color: '#f0c88a' }
    ],
    footer: stepLine
  };
}

// The current calendar month, offered from the Streak screen.
function shareMonthCard() {
  if (typeof reviewSummary !== 'function') return;
  var summary = reviewSummary('monthly', 0);
  // Only the days so far: an unlived day is not a missed one.
  var today = presenceDayKey();
  summary.daily = (summary.daily || []).filter(function(d) { return d.key <= today; });
  var label = new Date().toLocaleDateString('en-US', { month:'long', year:'numeric' });
  var data = periodCardData(summary, 'monthly', label,
    (typeof state !== 'undefined' && state && state.streak) || 0, shareCardStepLine());
  shareCardFontsReady().then(function() {
    var canvas = shareCardCanvas();
    drawPeriodCard(canvas, data);
    return shareCardDeliver(canvas, 'presence-practice.png', data.headline + ' · ' + data.rangeLabel);
  });
}

// Offered right after Omnia crosses into a new Step.
function offerStepShareCard(stepDef) {
  if (!stepDef) return;
  var title = String(stepDef.name || '').split('·').pop().trim();
  var data = {
    roman: stepDef.roman,
    title: title,
    stats: [
      { value: String(((typeof state !== 'undefined' && state && state.practicedDates) || []).length), label: 'Days practiced' },
      { value: String((typeof state !== 'undefined' && state && state.streak) || 0), label: 'Day streak', color: '#f0c88a' }
    ]
  };
  shareCardFontsReady().then(function() {
    var canvas = shareCardCanvas();
    drawStepCard(canvas, data);
    var overlay = document.createElement('div');
    overlay.className = 'in-overlay';
    overlay.innerHTML = '<div class="in-sheet">'
      + '<div class="in-title">Step ' + stepDef.roman + ' · ' + escHtml(title) + '</div>'
      + '<div class="in-sub">A threshold crossed. Share it with the people who walk this path with you.</div>'
      + '<img class="sc-card-preview" alt="Step ' + stepDef.roman + ' card" src="' + canvas.toDataURL('image/png') + '">'
      + '<button type="button" class="in-set" id="scShareBtn">Share card</button>'
      + '<button type="button" class="in-skip" id="scCloseBtn">Close</button>'
      + '</div>';
    document.body.appendChild(overlay);
    function close() {
      overlay.classList.remove('in-vis');
      setTimeout(function() { if (overlay.parentNode) overlay.parentNode.removeChild(overlay); }, 320);
    }
    overlay.querySelector('#scShareBtn').onclick = function() {
      shareCardDeliver(canvas, 'presence-step-' + stepDef.roman + '.png', 'Step ' + stepDef.roman + ' reached · ' + title).then(close);
    };
    overlay.querySelector('#scCloseBtn').onclick = close;
    requestAnimationFrame(function() { requestAnimationFrame(function() { overlay.classList.add('in-vis'); }); });
  });
}
