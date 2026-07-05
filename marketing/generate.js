// Renders Presence App Store screenshots (1290x2796) as SVG -> PNG via sharp.
const sharp = require('/tmp/node_modules/sharp');
const fs = require('fs');
const path = require('path');

const W = 1290, H = 2796;
const OUT = '/home/user/Consciousness-App/marketing';
fs.mkdirSync(OUT, { recursive: true });

const TEXT = '#ddd8ce';
const MUTED = 'rgba(221,216,206,0.45)';
const FAINT = 'rgba(221,216,206,0.28)';
const ACCENT = '#7eb8a4';
const AMBER = '#d4956e';
const PURPLE = '#9b8ec4';
const BLUE = '#b8eaff';
const GOLD = '#e8c87a';
const ROSE = '#ffc4d8';
const SERIF = 'Cormorant Garamond';
const MONO = 'DM Mono';

// ── shared pieces ────────────────────────────────────────────────────────────

function defsCommon(seed) {
  return `
  <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#0b0e18"/>
    <stop offset="0.55" stop-color="#07080d"/>
    <stop offset="1" stop-color="#060709"/>
  </linearGradient>
  <radialGradient id="glow" cx="0.5" cy="0.5" r="0.5">
    <stop offset="0" stop-color="#8ecce0" stop-opacity="0.20"/>
    <stop offset="0.55" stop-color="#5a9ec0" stop-opacity="0.07"/>
    <stop offset="1" stop-color="#07080d" stop-opacity="0"/>
  </radialGradient>
  <radialGradient id="glowGreen" cx="0.5" cy="0.5" r="0.5">
    <stop offset="0" stop-color="${ACCENT}" stop-opacity="0.16"/>
    <stop offset="1" stop-color="#07080d" stop-opacity="0"/>
  </radialGradient>
  <filter id="soft" x="-40%" y="-40%" width="180%" height="180%">
    <feGaussianBlur stdDeviation="4" result="b"/>
    <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
  </filter>`;
}

// deterministic pseudo-random star field
function stars(seed, n, yMin, yMax) {
  let s = seed, out = '';
  const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < n; i++) {
    const x = rnd() * W, y = yMin + rnd() * (yMax - yMin);
    const r = 1 + rnd() * 2.2, o = 0.08 + rnd() * 0.3;
    const c = rnd() < 0.18 ? '#a8d8f0' : '#ddd8ce';
    out += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(1)}" fill="${c}" opacity="${o.toFixed(2)}"/>`;
  }
  return out;
}

// Omnia crystal (taken from the app's own artwork), drawn into an 80x130 box.
function crystal(idp) {
  return `
  <defs>
    <linearGradient id="${idp}g1" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ddf0ff" stop-opacity="0.92"/>
      <stop offset="100%" stop-color="#6ab8d8" stop-opacity="0.48"/>
    </linearGradient>
    <linearGradient id="${idp}g2" x1="100%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.78"/>
      <stop offset="100%" stop-color="#4a9ec0" stop-opacity="0.22"/>
    </linearGradient>
    <radialGradient id="${idp}g3" cx="50%" cy="38%" r="58%">
      <stop offset="0%" stop-color="#b8eaff" stop-opacity="0.42"/>
      <stop offset="100%" stop-color="#2878a0" stop-opacity="0"/>
    </radialGradient>
    <filter id="${idp}glow" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="2.5" result="blur"/>
      <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>
  <ellipse cx="40" cy="68" rx="28" ry="48" fill="url(#${idp}g3)" opacity="0.62"/>
  <polygon points="40,3 54,14 40,25 26,14" fill="url(#${idp}g1)" stroke="#90cce8" stroke-width="0.55" filter="url(#${idp}glow)"/>
  <polygon points="40,3 54,14 40,13" fill="#ceeaff" opacity="0.72"/>
  <polygon points="40,3 26,14 40,13" fill="#b0dcf5" opacity="0.42"/>
  <line x1="40" y1="3" x2="40" y2="25" stroke="#b8e0f8" stroke-width="0.4" opacity="0.55"/>
  <line x1="26" y1="14" x2="54" y2="14" stroke="#b8e0f8" stroke-width="0.4" opacity="0.35"/>
  <polygon points="40,25 60,36 64,58 40,70 16,58 20,36" fill="url(#${idp}g1)" stroke="#88c4e0" stroke-width="0.55"/>
  <polygon points="40,25 60,36 40,44" fill="#d4ecff" opacity="0.52"/>
  <polygon points="40,25 20,36 40,44" fill="#bce0f8" opacity="0.32"/>
  <line x1="40" y1="25" x2="40" y2="70" stroke="#a8d8f2" stroke-width="0.38" opacity="0.48"/>
  <polygon points="16,58 64,58 40,70" fill="url(#${idp}g2)" opacity="0.38"/>
  <polygon points="40,70 64,58 56,88 40,100 24,88 16,58" fill="url(#${idp}g1)" stroke="#88c4e0" stroke-width="0.55" opacity="0.88"/>
  <polygon points="40,100 56,88 40,114" fill="url(#${idp}g2)" stroke="#88c4e0" stroke-width="0.48" opacity="0.72"/>
  <polygon points="40,100 24,88 40,114" fill="#b4dcf4" stroke="#88c4e0" stroke-width="0.48" opacity="0.52"/>
  <g opacity="0.65" filter="url(#${idp}glow)">
    <line x1="6" y1="22" x2="12" y2="22" stroke="#b8eaff" stroke-width="1"/>
    <line x1="9" y1="19" x2="9" y2="25" stroke="#b8eaff" stroke-width="1"/>
  </g>
  <g opacity="0.48">
    <line x1="68" y1="48" x2="74" y2="48" stroke="#b8eaff" stroke-width="0.9"/>
    <line x1="71" y1="45" x2="71" y2="51" stroke="#b8eaff" stroke-width="0.9"/>
  </g>`;
}

function crystalAt(idp, cx, cy, width) {
  const s = width / 80;
  return `<g transform="translate(${cx - width / 2}, ${cy - (130 * s) / 2}) scale(${s})">${crystal(idp)}</g>`;
}

const mono = (x, y, size, fill, text, ls, anchor = 'middle') =>
  `<text x="${x}" y="${y}" font-family="${MONO}" font-size="${size}" fill="${fill}" letter-spacing="${ls}" text-anchor="${anchor}">${text}</text>`;

const serif = (x, y, size, fill, text, anchor = 'middle', style = '') =>
  `<text x="${x}" y="${y}" font-family="${SERIF}" font-weight="300" font-size="${size}" fill="${fill}" text-anchor="${anchor}" ${style}>${text}</text>`;

const wordmark = (y) => mono(W / 2, y, 36, MUTED, 'P R E S E N C E', 14);
const divider = (y) => `<rect x="${W / 2 - 32}" y="${y}" width="64" height="2" fill="${ACCENT}" opacity="0.5"/>`;

function shell(inner, seed) {
  return `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
  <defs>${defsCommon(seed)}</defs>
  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  ${stars(seed, 90, 0, H)}
  ${inner}
</svg>`;
}

// ── card 1: hero ─────────────────────────────────────────────────────────────

function card1() {
  // Dark particle field; wordmark up top mirrors the loading screen
  // (Cormorant caps, wide tracking, accent green) and the text pops bright.
  const cy = 1450;
  // colored glow particles scattered around the field
  let s = 99, dust = '';
  const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  const dustCols = ['#7eb8a4', '#8ecce0', '#b8eaff', '#e8c87a'];
  for (let i = 0; i < 26; i++) {
    const x = rnd() * W, y = rnd() * H;
    const r = 3 + rnd() * 5, c = dustCols[(rnd() * dustCols.length) | 0];
    dust += `<circle cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="${r.toFixed(1)}" fill="${c}" opacity="${(0.5 + rnd() * 0.4).toFixed(2)}" filter="url(#soft)"/>`;
  }
  return shell(`
  <ellipse cx="${W / 2}" cy="${cy}" rx="640" ry="700" fill="url(#glow)"/>
  ${stars(31, 90, 0, H)}
  ${dust}
  <text x="${W / 2}" y="430" font-family="${SERIF}" font-weight="400" font-size="92" fill="#ffffff" letter-spacing="38" text-anchor="middle" filter="url(#soft)">PRESENCE</text>
  ${crystalAt('c1', W / 2, cy, 600)}
  <ellipse cx="${W / 2}" cy="${cy + 620}" rx="300" ry="36" fill="#8ecce0" opacity="0.08"/>
  `, 7);
}

// ── helpers for the redesigned cards ────────────────────────────────────────

// 4-point star (diadem/sparkle) — drawn, not a glyph, so no font risk.
function star4(cx, cy, r, c, o = 1) {
  const k = r * 0.26;
  return `<path d="M${cx},${cy - r} L${cx + k},${cy - k} L${cx + r},${cy} L${cx + k},${cy + k} L${cx},${cy + r} L${cx - k},${cy + k} L${cx - r},${cy} L${cx - k},${cy - k} Z" fill="${c}" opacity="${o}" filter="url(#soft)"/>`;
}

// Line icons for the six disciplines (24-box, stroke currentColor style).
function discIcon(name, cx, cy, size, c) {
  const s = size / 24;
  const P = (d) => `<path d="${d}" fill="none" stroke="${c}" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>`;
  const C = (x, y, r, fill) => `<circle cx="${x}" cy="${y}" r="${r}" ${fill ? `fill="${c}" stroke="none"` : `fill="none" stroke="${c}" stroke-width="1.7"`}/>`;
  let inner = '';
  if (name === 'awareness') inner = C(12,12,4.4) + P('M12 3.2v2.4M12 18.4v2.4M3.2 12h2.4M18.4 12h2.4M5.9 5.9l1.7 1.7M16.4 16.4l1.7 1.7M18.1 5.9l-1.7 1.7M7.6 16.4l-1.7 1.7');
  if (name === 'clock')     inner = C(12,12,8.4) + P('M12 6.6V12l3.6 2.2');
  if (name === 'visual')    inner = P('M2.6 12S6 5.8 12 5.8 21.4 12 21.4 12 18 18.2 12 18.2 2.6 12 2.6 12z') + C(12,12,2.6) + C(12,12,0.9,true);
  if (name === 'auditory')  inner = C(5.5,12,1.2,true) + P('M8.5 9a4.4 4.4 0 0 1 0 6') + P('M11.5 6.5a8.2 8.2 0 0 1 0 11') + P('M14.5 4a12.2 12.2 0 0 1 0 16');
  if (name === 'thought')   inner = C(12,12,8.4) + C(12,12,1.6,true);
  if (name === 'soulmirror') inner = C(12,9.6,6.2) + P('M12 15.8v4.6M9.2 20.4h5.6') + P('M9.2 7.6c.7-1.5 2.1-2.4 3.6-2.3');
  if (name === 'asana')     inner = C(12,5.6,2.6) + P('M12 8.6c-2.6 0-4.4 1.8-5.2 4.4L4 17.4c2.4 1.6 5.2 2.4 8 2.4s5.6-.8 8-2.4l-2.8-4.4c-.8-2.6-2.6-4.4-5.2-4.4z') + P('M8.6 15.4h6.8');
  return `<g transform="translate(${cx - size / 2}, ${cy - size / 2}) scale(${s})">${inner}</g>`;
}

// ── card 2: the exercises, styled like the in-game cards ────────────────────

const INK = '#f2ede3';
const INK2 = 'rgba(232,227,216,0.66)';

function card2() {
  // In-game exercise cards: stacked full-width, per-exercise accent tint.
  const rows = [
    { id:'clock',      name: 'The Clock',       sub: 'UNBROKEN FOCUS',  c: '#e07c3a' },
    { id:'visual',     name: 'Visualization',   sub: 'THE INNER EYE',   c: '#6e9fd4' },
    { id:'auditory',   name: 'Auditory',        sub: 'THE INNER EAR',   c: '#6eb8a4' },
    { id:'thought',    name: 'Thought Control', sub: 'MASTER THE MIND', c: '#7898b8' },
    { id:'asana',      name: 'Asana',           sub: 'STILL THE BODY',  c: '#c47878' },
    { id:'soulmirror', name: 'Soul Mirror',     sub: 'KNOW THYSELF',    c: '#a47eb8' },
  ];
  const x = 140, w = W - 280, rh = 252, gap = 30;
  let defs = '', g = '';
  rows.forEach((r, i) => {
    const y = 900 + i * (rh + gap);
    defs += `<linearGradient id="r${i}g" x1="0" y1="0" x2="0.7" y2="1">
      <stop offset="0" stop-color="${r.c}" stop-opacity="0.20"/>
      <stop offset="1" stop-color="${r.c}" stop-opacity="0.06"/></linearGradient>`;
    g += `
    <rect x="${x}" y="${y}" width="${w}" height="${rh}" rx="26" fill="url(#r${i}g)"/>
    <rect x="${x}" y="${y}" width="${w}" height="${rh}" rx="26" fill="none" stroke="${r.c}" stroke-opacity="0.55" stroke-width="2.5"/>
    <rect x="${x + w * 0.12}" y="${y + 1}" width="${w * 0.56}" height="2" fill="#ffffff" opacity="0.10"/>
    <rect x="${x + 56}" y="${y + rh / 2 - 52}" width="104" height="104" rx="26" fill="${r.c}" opacity="0.20"/>
    <rect x="${x + 56}" y="${y + rh / 2 - 52}" width="104" height="104" rx="26" fill="none" stroke="${r.c}" stroke-opacity="0.6" stroke-width="2"/>
    ${discIcon(r.id, x + 108, y + rh / 2, 60, r.c)}
    ${serif(x + 210, y + rh / 2 + 2, 62, INK, r.name, 'start')}
    ${mono(x + 213, y + rh / 2 + 62, 26, INK2, r.sub, 5, 'start')}`;
  });
  return shell(`
  <defs>${defs}</defs>
  ${wordmark(300)}
  ${serif(W / 2, 530, 116, INK, 'Interactive,')}
  ${serif(W / 2, 670, 116, ACCENT, 'occult exercises.', 'middle', 'font-style="italic"')}
  ${g}
  `, 19);
}

// ── card 3: meet Omnia — grown with the app's real step regalia ──────────────

function card3() {
  const BASE = 1760;
  const forms = [
    { cx: 250,  w: 230, label: 'DAY ONE' },
    { cx: 645,  w: 330, label: 'STEP V' },
    { cx: 1035, w: 470, label: 'STEP X' },
  ];
  const at = (idp, f) => crystalAt(idp, f.cx, BASE - (130 * (f.w / 80)) / 2, f.w);
  const midCy = BASE - 130 * (forms[1].w / 80) / 2;
  const bigCy = BASE - 130 * (forms[2].w / 80) / 2;
  const cx2 = forms[1].cx, cx3 = forms[2].cx;
  const top3 = BASE - 130 * (forms[2].w / 80);

  // In-game tiers, cumulative:
  // II triad shards · III crown glow · IV polar pillars · V element wheel
  const shardCols = ['#e8b8a0', '#c4a8d4', '#a8c8e8'];
  const orbit = (cx, cy, rx, ry) => {
    let o = `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="none" stroke="#b8eaff" stroke-opacity="0.3" stroke-width="1.6" stroke-dasharray="3 9"/>`;
    [[0.06, -1], [0.5, 1.06], [0.88, -0.72]].forEach((p, i) => {
      const a = p[0] * Math.PI * 2, sx = cx + Math.cos(a) * rx, sy = cy + Math.sin(a) * ry * p[1];
      o += `<polygon points="${sx},${sy - 13} ${sx + 11},${sy - 4} ${sx + 7},${sy + 12} ${sx - 7},${sy + 12} ${sx - 11},${sy - 4}" fill="${shardCols[i]}" opacity="0.95" filter="url(#soft)"/>`;
    });
    return o;
  };
  const elements = (cx, cy, rx, ry, r) => {
    const cols = ['#ff8b4d', '#f5e29a', '#6bb8ff', '#8fc880']; // fire air water earth
    let e = `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="none" stroke="#f5e29a" stroke-opacity="0.18" stroke-width="1.4"/>`;
    [[0, -1], [1, 0], [0, 1], [-1, 0]].forEach((d, i) => {
      const ex = cx + d[0] * rx, ey = cy + d[1] * ry;
      e += `<circle cx="${ex}" cy="${ey}" r="${r}" fill="${cols[i]}" filter="url(#soft)"/>
            <circle cx="${ex}" cy="${ey}" r="${r * 1.9}" fill="${cols[i]}" opacity="0.14"/>`;
    });
    return e;
  };
  const crownGlow = (cx, cy, rx, ry, o) =>
    `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${GOLD}" opacity="${o}" filter="url(#soft)"/>`;
  const pillar = (px, h) => `<rect x="${px - 5}" y="${BASE - h - 50}" width="10" height="${h}" rx="5" fill="url(#pillarG)" opacity="0.7"/>`;
  // X: apotheosis mandala + mirror disc
  const apo = () => {
    let a = '';
    [[210, 0.28], [260, 0.20], [310, 0.13]].forEach((rr) => {
      a += `<circle cx="${cx3}" cy="${bigCy}" r="${rr[0]}" fill="none" stroke="${GOLD}" stroke-opacity="${rr[1]}" stroke-width="1.6"/>`;
    });
    for (let i = 0; i < 12; i++) {
      const an = (i / 12) * Math.PI * 2;
      a += `<circle cx="${cx3 + Math.cos(an) * 310}" cy="${bigCy + Math.sin(an) * 310}" r="5" fill="#ffeec8" opacity="0.8"/>`;
    }
    return a;
  };
  const diadem =
    star4(cx3 - 84, top3 + 30, 12, '#f4e8c0', 0.75) +
    star4(cx3 - 44, top3 + 2, 15, '#f4e8c0', 0.9) +
    star4(cx3, top3 - 12, 19, '#fff2cf', 1) +
    star4(cx3 + 44, top3 + 2, 15, '#f4e8c0', 0.9) +
    star4(cx3 + 84, top3 + 30, 12, '#f4e8c0', 0.75);

  const palette = ['#b8eaff', '#ffc4d8', '#f0d39a', '#c4a8d4', '#98d8bd', '#e8554f'];
  let gems = '';
  palette.forEach((c, i) => {
    const x = W / 2 + (i - (palette.length - 1) / 2) * 112, y = 2060;
    gems += `<circle cx="${x}" cy="${y}" r="44" fill="${c}" opacity="0.14"/>
      <polygon points="${x},${y - 26} ${x + 20},${y} ${x},${y + 26} ${x - 20},${y}" fill="${c}" opacity="0.95"/>
      <polygon points="${x},${y - 26} ${x + 20},${y} ${x},${y}" fill="#ffffff" opacity="0.30"/>`;
  });
  return shell(`
  <defs>
    <linearGradient id="pillarG" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#dff0ff" stop-opacity="0.85"/>
      <stop offset="1" stop-color="#dff0ff" stop-opacity="0"/>
    </linearGradient>
  </defs>
  <ellipse cx="${W / 2}" cy="1440" rx="640" ry="660" fill="url(#glow)"/>
  ${wordmark(300)}
  ${serif(W / 2, 530, 124, INK, `Meet <tspan fill="${BLUE}">Omnia</tspan>.`)}
  ${serif(W / 2, 680, 72, 'rgba(232,227,216,0.72)', 'A living guide that grows as you do.', 'middle', 'font-style="italic"')}
  <g opacity="0.8">${at('c3a', forms[0])}</g>
  ${elements(cx2, midCy, 190, 64, 11)}
  ${orbit(cx2, midCy, 152, 52)}
  ${pillar(cx2 - 128, 250)}${pillar(cx2 + 128, 250)}
  ${crownGlow(cx2, midCy - 130 * (forms[1].w / 80) / 2 + 6, 68, 40, 0.13)}
  ${at('c3b', forms[1])}
  ${apo()}
  ${elements(cx3, bigCy, 208, 76, 13)}
  ${pillar(cx3 - 185, 380)}${pillar(cx3 + 185, 380)}
  ${at('c3c', forms[2])}
  ${crownGlow(cx3, top3 + 8, 120, 74, 0.16)}
  ${diadem}
  <ellipse cx="${cx3}" cy="${BASE + 26}" rx="235" ry="26" fill="#a0d2f0" opacity="0.10"/>
  <ellipse cx="${W / 2}" cy="${BASE + 46}" rx="480" ry="30" fill="#8ecce0" opacity="0.06"/>
  ${mono(forms[0].cx, BASE + 120, 26, INK2, forms[0].label, 5)}
  ${mono(forms[1].cx, BASE + 120, 26, INK2, forms[1].label, 5)}
  ${mono(forms[2].cx, BASE + 120, 26, GOLD, forms[2].label, 5)}
  ${gems}
  ${mono(W / 2, 2190, 32, INK2, 'NEW FORMS · COLORS · COMPANIONS', 7)}
  ${serif(W / 2, 2360, 70, INK, 'Practice earns akasha — spend it', 'middle')}
  ${serif(W / 2, 2445, 70, INK, `to shape your <tspan fill="${ACCENT}" font-style="italic">guide</tspan>.`, 'middle')}
  `, 41);
}

// ── card 4: a path paced to you ──────────────────────────────────────────────

function card4() {
  const rows = [
    { name: 'The Clock',       glyph: '⊙', meta: '8 MIN · 2/2 → 9 MIN',          c: AMBER,     done: true,  prog: 1.0 },
    { name: 'Auditory',        glyph: '◈', meta: '10 MIN · COMPLETE',            c: '#d4b08e', done: true,  prog: 1.0, badge: '✦ BODY LEVEL' },
    { name: 'Thought Control', glyph: '◌', meta: '6 MIN · ×2 SESSIONS · UP NEXT', c: '#8ecce0', done: false, prog: 0.35 },
    { name: 'Awareness',       glyph: '◉', meta: 'REMINDERS THROUGH THE DAY',    c: ACCENT,    done: false, prog: 0.6 },
  ];
  const x = 110, w = W - 220, rh = 300, gap = 40;
  let g = '';
  rows.forEach((r, i) => {
    const y = 1060 + i * (rh + gap);
    const chipX = x + 66, chipY = y + 68;
    const badge = r.badge
      ? `<rect x="${x + w - 328}" y="${y + 58}" width="266" height="60" rx="30" fill="${GOLD}" opacity="0.10"/>
         <rect x="${x + w - 328}" y="${y + 58}" width="266" height="60" rx="30" fill="none" stroke="${GOLD}" stroke-opacity="0.55" stroke-width="2"/>
         ${mono(x + w - 195, y + 97, 25, GOLD, r.badge, 3)}`
      : '';
    const doneMark = r.done
      ? `<circle cx="${chipX + 44}" cy="${chipY - 44}" r="19" fill="#0e0f17"/>
         <circle cx="${chipX + 44}" cy="${chipY - 44}" r="19" fill="none" stroke="${r.c}" stroke-width="2.5" stroke-opacity="0.9"/>
         <path d="M ${chipX + 35} ${chipY - 44} l 6 7 l 12 -14" fill="none" stroke="${r.c}" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>`
      : '';
    g += `
    <rect x="${x}" y="${y}" width="${w}" height="${rh}" rx="28" fill="#0e0f17"/>
    <rect x="${x}" y="${y}" width="${w}" height="${rh}" rx="28" fill="none" stroke="${r.c}" stroke-opacity="${r.done ? 0.24 : 0.42}" stroke-width="2"/>
    <rect x="${x + w * 0.14}" y="${y + 1}" width="${w * 0.5}" height="2" fill="#ffffff" opacity="0.07"/>
    <rect x="${chipX - 48}" y="${chipY - 48}" width="96" height="96" rx="24" fill="${r.c}" opacity="0.13"/>
    <rect x="${chipX - 48}" y="${chipY - 48}" width="96" height="96" rx="24" fill="none" stroke="${r.c}" stroke-opacity="0.45" stroke-width="2"/>
    <text x="${chipX}" y="${chipY + 20}" font-family="DejaVu Sans" font-size="52" fill="${r.c}" text-anchor="middle">${r.glyph}</text>
    ${doneMark}
    ${serif(x + 190, y + 100, 60, INK, r.name, 'start')}
    ${mono(x + 192, y + 158, 27, INK2, r.meta, 4, 'start')}
    ${badge}
    <rect x="${x + 190}" y="${y + 210}" width="${w - 310}" height="8" rx="4" fill="rgba(221,216,206,0.10)"/>
    <rect x="${x + 190}" y="${y + 210}" width="${(w - 310) * r.prog}" height="8" rx="4" fill="${r.c}" opacity="0.85"/>`;
  });
  return shell(`
  ${wordmark(300)}
  ${serif(W / 2, 530, 116, INK, 'A path paced')}
  ${serif(W / 2, 670, 116, INK, `to <tspan fill="${ACCENT}" font-style="italic">you</tspan>.`)}
  ${mono(W / 2, 800, 36, INK2, 'OMNIA BUILDS EACH DAY AROUND YOUR NUMBERS', 5)}
  ${g}
  `, 67);
}

// ── card 5: the endgame — prestige, dark matter, the ten spheres ─────────────

function goldCrystal(idp) {
  let c = crystal(idp);
  const map = {
    '#ddf0ff': '#fff2cf', '#6ab8d8': '#c99f52', '#b8eaff': '#ffe9b8', '#2878a0': '#8a6a28',
    '#90cce8': '#d8b258', '#88c4e0': '#d8b258', '#ceeaff': '#fff4d6', '#b0dcf5': '#ecd9a8',
    '#d4ecff': '#ffeec2', '#bce0f8': '#eeda9e', '#a8d8f2': '#e8cd94', '#b4dcf4': '#e8cd8e',
    '#4a9ec0': '#a3812f', '#ffffff': '#fffaf0'
  };
  for (const [a, b] of Object.entries(map)) c = c.split(a).join(b);
  return c;
}

function card5() {
  const cx = W / 2, cy = 1500, R = 430;
  const spheres = [
    ['⊕', '#9cb88a'], ['☽', '#cdd6e8'], ['☿', '#e8b060'], ['♀', '#e89ab8'], ['☉', '#f0d860'],
    ['♂', '#e06858'], ['♃', '#8898e8'], ['♄', '#8a98b0'], ['♅', '#7ed8e8'], ['♇', '#9a6ae8'],
  ];
  let ring = `
  <circle cx="${cx}" cy="${cy}" r="${R}" fill="none" stroke="${GOLD}" stroke-opacity="0.22" stroke-width="2"/>
  <circle cx="${cx}" cy="${cy}" r="${R - 74}" fill="none" stroke="${PURPLE}" stroke-opacity="0.20" stroke-width="1.6" stroke-dasharray="3 10"/>`;
  spheres.forEach((sp, i) => {
    const a = -Math.PI / 2 + (i / spheres.length) * Math.PI * 2;
    const sx = cx + Math.cos(a) * R, sy = cy + Math.sin(a) * R;
    ring += `<circle cx="${sx}" cy="${sy}" r="44" fill="#0b0d14"/>
      <circle cx="${sx}" cy="${sy}" r="44" fill="none" stroke="${sp[1]}" stroke-opacity="0.5" stroke-width="2"/>
      <circle cx="${sx}" cy="${sy}" r="58" fill="${sp[1]}" opacity="0.07"/>
      <text x="${sx}" y="${sy + 22}" font-family="DejaVu Sans" font-size="58" fill="${sp[1]}" text-anchor="middle" filter="url(#soft)">${sp[0]}</text>`;
  });
  // prestige pips beneath the gold crystal
  const pips = [-56, 0, 56].map((dx) => star4(cx + dx, cy + 300, 17, '#f4e2b0', 0.95)).join('');
  const stats = [
    { v: '15', l: 'TOOLS FORGED', c: GOLD },
    { v: '◆', l: 'DARK MATTER', c: '#b48ce0' },
    { v: '10', l: 'SPHERES', c: BLUE },
  ];
  let chips = '';
  const chw = 330, chh = 220, chGap = 32;
  stats.forEach((st, i) => {
    const x = (W - (chw * 3 + chGap * 2)) / 2 + i * (chw + chGap), y = 2100;
    const val = st.v === '◆'
      ? `<text x="${x + chw / 2}" y="${y + 128}" font-family="DejaVu Sans" font-size="84" fill="${st.c}" text-anchor="middle" filter="url(#soft)">◆</text>`
      : serif(x + chw / 2, y + 122, 88, st.c, st.v);
    chips += `
    <rect x="${x}" y="${y}" width="${chw}" height="${chh}" rx="26" fill="#0e0f17"/>
    <rect x="${x}" y="${y}" width="${chw}" height="${chh}" rx="26" fill="none" stroke="${st.c}" stroke-opacity="0.30" stroke-width="2"/>
    ${val}
    ${mono(x + chw / 2, y + 176, 23, MUTED, st.l, 4)}`;
  });
  return shell(`
  <ellipse cx="${cx}" cy="${cy}" rx="660" ry="680" fill="url(#glow)"/>
  <ellipse cx="${cx}" cy="${cy}" rx="420" ry="440" fill="${GOLD}" opacity="0.05"/>
  ${wordmark(300)}
  ${serif(W / 2, 530, 108, INK, 'Based on Franz Bardon’s')}
  ${serif(W / 2, 670, 116, GOLD, 'Hermetics.', 'middle', 'font-style="italic"')}
  ${mono(W / 2, 800, 36, INK2, 'TEN STEPS · PRESTIGES · EXERCISES', 5)}
  ${ring}
  <g transform="translate(${cx - 150}, ${cy - 262}) scale(3.75)">${goldCrystal('g5')}</g>
  ${pips}
  ${chips}
  ${serif(W / 2, 2540, 72, INK, 'Idle mechanics reinforce practice.', 'middle')}
  `, 83);
}

// ── render ───────────────────────────────────────────────────────────────────

(async () => {
  const cards = [
    ['01-hero.png', card1()],
    ['02-disciplines.png', card2()],
    ['03-omnia.png', card3()],
    ['04-path.png', card4()],
    ['05-progress.png', card5()],
  ];
  for (const [name, svg] of cards) {
    await sharp(Buffer.from(svg), { density: 72 }).png().toFile(path.join(OUT, name));
    console.log('wrote', name);
  }
})();
