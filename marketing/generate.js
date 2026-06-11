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
  <text x="${W / 2}" y="430" font-family="${SERIF}" font-weight="400" font-size="92" fill="#a8e2cb" letter-spacing="38" text-anchor="middle" filter="url(#soft)">PRESENCE</text>
  <rect x="${W / 2 - 32}" y="500" width="64" height="3" fill="#a8e2cb" opacity="0.7"/>
  ${crystalAt('c1', W / 2, cy, 600)}
  <ellipse cx="${W / 2}" cy="${cy + 620}" rx="300" ry="36" fill="#8ecce0" opacity="0.08"/>
  <text x="${W / 2}" y="2370" font-family="${SERIF}" font-weight="500" font-size="158" fill="#ffffff" text-anchor="middle">Enlightenment</text>
  <text x="${W / 2}" y="2550" font-family="${SERIF}" font-weight="300" font-size="158" fill="#ffffff" font-style="italic" text-anchor="middle">Now</text>
  `, 7);
}

// ── card 2: six disciplines ──────────────────────────────────────────────────

function card2() {
  const tiles = [
    { name: 'Awareness', sub: 'RETURN TO NOW', c: ACCENT },
    { name: 'The Clock', sub: 'UNBROKEN FOCUS', c: AMBER },
    { name: 'Visualization', sub: 'THE INNER EYE', c: PURPLE },
    { name: 'Auditory', sub: 'THE INNER EAR', c: '#d4b08e' },
    { name: 'Thought Control', sub: 'MASTER THE MIND', c: '#8ecce0' },
    { name: 'Asana', sub: 'STILL THE BODY', c: ROSE },
  ];
  const gx = 120, gw = W - gx * 2, gap = 36;
  const tw = (gw - gap) / 2, th = 360;
  let g = '';
  tiles.forEach((t, i) => {
    const col = i % 2, row = (i / 2) | 0;
    const x = gx + col * (tw + gap), y = 950 + row * (th + gap);
    g += `
    <rect x="${x}" y="${y}" width="${tw}" height="${th}" rx="30" fill="${t.c}" opacity="0.07"/>
    <rect x="${x}" y="${y}" width="${tw}" height="${th}" rx="30" fill="none" stroke="${t.c}" stroke-opacity="0.34" stroke-width="2"/>
    <circle cx="${x + tw / 2}" cy="${y + 118}" r="10" fill="${t.c}" opacity="0.85" filter="url(#soft)"/>
    ${serif(x + tw / 2, y + 235, 64, TEXT, t.name)}
    ${mono(x + tw / 2, y + 300, 26, MUTED, t.sub, 6)}`;
  });
  return shell(`
  ${wordmark(300)}
  ${serif(W / 2, 530, 116, TEXT, 'Six disciplines.')}
  ${serif(W / 2, 670, 116, ACCENT, 'One path.', 'middle', 'font-style="italic"')}
  ${mono(W / 2, 800, 36, MUTED, 'CLASSICAL CONCENTRATION TRAINING, MADE DAILY', 5)}
  ${g}
  ${mono(W / 2, 2280 + 90, 34, FAINT, 'EACH SESSION MEASURED · EVERY REP COUNTS', 6)}
  `, 19);
}

// ── card 3: meet Omnia ───────────────────────────────────────────────────────

function card3() {
  const cy = 1430;
  const palette = ['#b8eaff', '#ffc4d8', '#f0d39a', '#c4a8d4', '#98d8bd', '#e8554f'];
  let dots = '';
  const n = palette.length, dw = 110;
  palette.forEach((c, i) => {
    const x = W / 2 + (i - (n - 1) / 2) * dw;
    dots += `<circle cx="${x}" cy="2010" r="30" fill="${c}"/>
             <circle cx="${x}" cy="2010" r="30" fill="none" stroke="#ffffff" stroke-opacity="0.18" stroke-width="2"/>
             <circle cx="${x}" cy="2010" r="42" fill="${c}" opacity="0.12"/>`;
  });
  // little wisp companion beside the crystal
  const wisp = `
  <g transform="translate(${W / 2 + 240}, ${cy + 170}) scale(3.4)" opacity="0.95">
    <path d="M22 23 C16 29 9 31 4 29 C9 27 12 23 13 18 C16 21 19 23 22 23 Z" fill="${BLUE}" opacity=".3" stroke="${BLUE}" stroke-width=".8"/>
    <circle cx="27" cy="18" r="7.5" fill="${BLUE}" opacity=".4" stroke="${BLUE}" stroke-width="1.1"/>
    <circle cx="26" cy="15.5" r="2.8" fill="#fff" opacity=".55"/>
    <ellipse cx="24.5" cy="18.5" rx="1" ry="1.4" fill="#1c3344" opacity=".85"/>
    <ellipse cx="29.5" cy="18.5" rx="1" ry="1.4" fill="#1c3344" opacity=".85"/>
    <path d="M25.4 22.4 Q27 23.6 28.6 22.4" fill="none" stroke="#1c3344" stroke-width=".7" stroke-linecap="round" opacity=".7"/>
  </g>`;
  return shell(`
  <ellipse cx="${W / 2}" cy="${cy}" rx="600" ry="640" fill="url(#glow)"/>
  ${wordmark(300)}
  ${serif(W / 2, 530, 124, TEXT, `Meet <tspan fill="${BLUE}">Omnia</tspan>.`)}
  ${serif(W / 2, 680, 72, MUTED, 'A living guide that grows as you do.', 'middle', 'font-style="italic"')}
  ${crystalAt('c3', W / 2, cy, 460)}
  ${wisp}
  <ellipse cx="${W / 2}" cy="${cy + 480}" rx="260" ry="30" fill="#8ecce0" opacity="0.06"/>
  ${dots}
  ${mono(W / 2, 2130, 32, MUTED, 'NEW FORMS · COLORS · COMPANIONS', 7)}
  ${serif(W / 2, 2330, 70, TEXT, 'Practice earns akasha — spend it', 'middle')}
  ${serif(W / 2, 2415, 70, TEXT, `to shape your <tspan fill="${ACCENT}" font-style="italic">guide</tspan>.`, 'middle')}
  `, 41);
}

// ── card 4: a path paced to you ──────────────────────────────────────────────

function card4() {
  const rows = [
    { name: 'The Clock', meta: '8 MIN · 2/2 → 9 MIN', c: AMBER, done: true, prog: 1.0 },
    { name: 'Auditory', meta: '10 MIN · COMPLETE', c: '#d4b08e', done: true, prog: 1.0 },
    { name: 'Thought Control', meta: '6 MIN · UP NEXT', c: '#8ecce0', done: false, prog: 0.35 },
    { name: 'Awareness', meta: 'REMINDERS THROUGH THE DAY', c: ACCENT, done: false, prog: 0.6 },
  ];
  const x = 120, w = W - 240, rh = 290, gap = 42;
  let g = '';
  rows.forEach((r, i) => {
    const y = 1030 + i * (rh + gap);
    const check = r.done
      ? `<circle cx="${x + 120}" cy="${y + 116}" r="44" fill="${r.c}" opacity="0.16"/>
         <circle cx="${x + 120}" cy="${y + 116}" r="44" fill="none" stroke="${r.c}" stroke-width="3" stroke-opacity="0.8"/>
         <path d="M ${x + 99} ${y + 116} l 15 16 l 28 -32" fill="none" stroke="${r.c}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>`
      : `<circle cx="${x + 120}" cy="${y + 116}" r="44" fill="none" stroke="${r.c}" stroke-width="3" stroke-opacity="0.4" stroke-dasharray="6 8"/>`;
    g += `
    <rect x="${x}" y="${y}" width="${w}" height="${rh}" rx="28" fill="#0e0f17"/>
    <rect x="${x}" y="${y}" width="${w}" height="${rh}" rx="28" fill="none" stroke="${r.c}" stroke-opacity="0.28" stroke-width="2"/>
    ${check}
    ${serif(x + 210, y + 105, 62, TEXT, r.name, 'start')}
    ${mono(x + 212, y + 165, 28, MUTED, r.meta, 4, 'start')}
    <rect x="${x + 210}" y="${y + 212}" width="${w - 330}" height="8" rx="4" fill="rgba(221,216,206,0.10)"/>
    <rect x="${x + 210}" y="${y + 212}" width="${(w - 330) * r.prog}" height="8" rx="4" fill="${r.c}" opacity="0.85"/>`;
  });
  return shell(`
  ${wordmark(300)}
  ${serif(W / 2, 530, 116, TEXT, 'A path paced')}
  ${serif(W / 2, 670, 116, TEXT, `to <tspan fill="${ACCENT}" font-style="italic">you</tspan>.`)}
  ${mono(W / 2, 800, 36, MUTED, 'TWO STRONG SESSIONS EARN THE NEXT MINUTE', 5)}
  ${g}
  ${serif(W / 2, 2540, 70, MUTED, 'It never rushes. It never lets you stall.', 'middle', 'font-style="italic"')}
  `, 67);
}

// ── card 5: progress ─────────────────────────────────────────────────────────

function card5() {
  // 14-day bar chart
  const vals = [0.18, 0.3, 0.22, 0.4, 0.34, 0.52, 0.45, 0.6, 0.5, 0.72, 0.66, 0.8, 0.74, 0.95];
  const cx = 140, cw = W - 280, ch = 560, cy0 = 1660;
  const bw = cw / vals.length * 0.55, step = cw / vals.length;
  let bars = '';
  vals.forEach((v, i) => {
    const bh = ch * v;
    const x = cx + i * step + (step - bw) / 2;
    bars += `<rect x="${x}" y="${cy0 - bh}" width="${bw}" height="${bh}" rx="${bw / 2}" fill="${ACCENT}" opacity="${0.35 + v * 0.6}"/>`;
  });
  const stats = [
    { v: 'LV 12', l: 'CONCENTRATION' },
    { v: '21', l: 'DAY STREAK' },
    { v: '4:24', l: 'BEST HOLD' },
  ];
  let chips = '';
  const chw = 330, chh = 230, chGap = 30;
  stats.forEach((s, i) => {
    const x = (W - (chw * 3 + chGap * 2)) / 2 + i * (chw + chGap), y = 1850;
    chips += `
    <rect x="${x}" y="${y}" width="${chw}" height="${chh}" rx="26" fill="#0e0f17"/>
    <rect x="${x}" y="${y}" width="${chw}" height="${chh}" rx="26" fill="none" stroke="rgba(221,216,206,0.14)" stroke-width="2"/>
    ${serif(x + chw / 2, y + 118, 84, ACCENT, s.v)}
    ${mono(x + chw / 2, y + 178, 24, MUTED, s.l, 4)}`;
  });
  return shell(`
  <ellipse cx="${W / 2}" cy="1300" rx="640" ry="620" fill="url(#glowGreen)"/>
  ${wordmark(300)}
  ${serif(W / 2, 530, 116, TEXT, 'Watch the practice')}
  ${serif(W / 2, 670, 116, ACCENT, 'deepen.', 'middle', 'font-style="italic"')}
  ${mono(W / 2, 800, 36, MUTED, 'LEVELS · STREAKS · HONEST REPORTS', 6)}
  <rect x="100" y="980" width="${W - 200}" height="760" rx="34" fill="#0e0f17"/>
  <rect x="100" y="980" width="${W - 200}" height="760" rx="34" fill="none" stroke="rgba(221,216,206,0.14)" stroke-width="2"/>
  ${mono(180, 1070, 28, MUTED, 'FOCUS, LAST 14 DAYS', 5, 'start')}
  ${bars}
  ${chips}
  ${serif(W / 2, 2390, 70, TEXT, 'Small sits, honestly measured,', 'middle')}
  ${serif(W / 2, 2475, 70, TEXT, `become <tspan fill="${ACCENT}" font-style="italic">unshakable attention</tspan>.`, 'middle')}
  `, 23);
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
