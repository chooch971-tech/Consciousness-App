// ═══════════════════════════════════════
// PROMPTS
// ═══════════════════════════════════════
const PROMPTS = [
  "Are you here right now?", "Feel the weight of your body.", "What sounds surround you?",
  "Notice your breath — don't change it.", "Where has your mind just been?", "Return. You are here.",
  "Soften your jaw. Your shoulders.", "What is real in this exact moment?", "The mind drifts. Come back.",
  "Sense your feet on the ground.", "Notice without labeling.", "This moment will not come again.",
  "What are you actually doing right now?", "Let the thought pass. Stay.", "Feel the air on your skin.",
  "You drifted. That's fine. Return.", "Presence is not forced — it is remembered.",
  "What is the quality of your awareness right now?", "Drop the inner monologue. Just sense.",
  "Be here. Completely.",
];

const QUESTIONS = [
  { id:'drift',     text:'How often did you catch yourself drifting away from the present?', low:'rarely',         high:'constantly' },
  { id:'return',    text:'How difficult was it to return to awareness after drifting?',       low:'effortless',     high:'very hard' },
  { id:'redundant', text:'Did the reminders feel necessary, or were you already present?',   low:'already present', high:'very necessary' },
];

// ═══════════════════════════════════════
// RANK SYSTEM — 250 LEVELS
// ═══════════════════════════════════════

const RANK_TITLES = [
  '',  // index 0 unused
  // ── Tier 1: Awakening (1–111) ──
  'Initiate','Observer','Novice','Seeker','Aspirant','Student','Practitioner','Apprentice','Disciple','Attendant',
  'Watcher','Listener','Perceiver','Witness','Sentinel','Contemplator','Examiner','Reflector','Inquirer','Meditator',
  'Stillpoint','Anchor','Groundkeeper','Steadfast','Resolute','Awakener','Luminary','Torchbearer','Pathfinder','Wayfarer',
  'Pilgrim','Journeyman','Voyager','Ranger','Strider','Tracker','Trailblazer','Cartographer','Navigator','Guide',
  'Keeper','Guardian','Warden','Protector','Shieldbearer','Steward','Custodian','Overseer','Watchkeeper','Sage',
  'Seer','Oracle','Visionary','Prophet','Mystic','Alchemist','Channeler','Diviner','Elementalist','Hierophant',
  'Ascendant','Transcendent','Ethereal','Celestial','Astral','Cosmic','Infinite','Boundless','Timeless','Eternal',
  'Illumined','Radiant','Luminous','Incandescent','Brilliant','Sovereign','Emperor','Monarch','Ruler','Dominion',
  'Zenith','Apex','Pinnacle','Summit','Paragon','Exemplar','Archon','Magus','Adept','Master',
  'Grandmaster','Elder','High Seer','Awakened Mind','Silent Flame','Living Presence','Unbroken Witness','Absolute','The Conscious','Turiya',
  'Integrated','Embodied','Rooted Flame','Still River','Open Sky','Deep Field','Iron Lotus','Clear Mirror','Unshaken','Vast','Daykeeper',
  // ── Tier 2: Perception (112–222) ──
  'Horizon Walker','Sun Gazer','Meridian','Equinox','Solstice','Continuum','Perpetual','Ceaseless','Unwavering','Dawn Watcher',
  'First Light','Morning Star','Noonday Sun','Afternoon Sage','Eventide','Dusk Walker','Twilight Seer','Nightfall','Full Circle','Tireless',
  'Enduring','Patient Stone','Ancient Oak','Deep Root','Bedrock','Cornerstone','Monolith','Pillar','Day Master','Hour Keeper',
  'Temporal','Chronos','Kairos','Moment Weaver','Time Bender','Duration','Marathon','Ultra','Iron Will','Diamond Mind',
  'Adamantine','Unbreakable','Indomitable','Relentless','Unstoppable','Inexorable','Immutable','Invincible','Void Walker','Emptiness',
  'Sunyata','Mu','Kenosis','Fana','Nirodha','Cessation','Dissolution','Formless','Awareness Itself','Pure Witness',
  'Sakshi','Drashta','Kutastha','Unchanging','Immovable','Achala','Sthira','Dhruva','Ocean Mind','Depth',
  'Fathomless','Abyssal','Pelagic','Benthic','Hadal','Mariana','Infinite Depth','Solar','Stellar','Galactic',
  'Nebular','Quasar','Pulsar','Magnetar','Supernova','Hypernova','Cosmic Ray','Brahman','Atman','Sat-Chit-Ananda',
  'Purusha','Pratyagatman','Paramatman','Nirguna','Saguna','Ishvara','Shakti','Kether','Chokmah','Binah',
  'Chesed','Ain Soph','Ain Soph Aur','Ein Sof','Ohr','Tzimtzum','Tikkun','Pleroma','Monad','Nous','Psyche',
  // ── Tier 3: Stillness (223–333) ──
  'Pneuma','Logos','Sophia','Christos','Abraxas','Aeon','Primordial','Unborn','Uncreated','Unmade',
  'Unmanifest','Prior','Before Thought','Before Time','Before Space','The Source','All-Pervading','Omnipresent','Total Presence','Sahaja',
  'Nirvikalpa','Mahasamadhi','Jivanmukta','Kaivalya','Moksha','Turiyatita','The Flame','The Wave','The Field','The Stillness',
  'The Witness','Primordial Fire','Root Silence','Ground of Being','Uncaused','Self-Luminous','Self-Existing','Self-Sustaining','Beyond Mind','Beyond Form',
  'Beyond Time','Beyond Space','Beyond Cause','Beyond Effect','Absolute Ground','Clear Light','Mirror Mind','Water Mind','Space Mind','Earth Mind',
  'Fire Mind','Wind Mind','Void Mind','Boundless Mind','Infinite Mind','Eternal Mind','Silent Mind','Still Mind','Open Mind','Empty Mind',
  'Pure Mind','Undivided','Unbroken','Unfragmented','Unseparated','Unscattered','Unbound','Unfettered','Unchained','Unlocked',
  'Uncontained','Uncontracted','Unseen Seer','Unknown Knower','Unthought Thinker','Unmoved Mover','Uncaused Cause','Nameless','Formless Presence','Traceless',
  'Markless','Signless','Imageless','Conceptless','Wordless','Soundless','Thoughtless','Effortless','Actionless','Movementless',
  'Ageless','Deathless','Birthless','Endless','Beginningless','Limitless','Measureless','Indefinable','Indescribable','Ineffable',
  'Inexpressible','Unspeakable','Beyond Words','Beyond Silence','Beyond Both','The Gap','The Space','The Pause','The Breath','Infinite Breath',
  'Infinite Space','Sky Mind',
  // ── Tier 4: Expansion (334–444) ──
  'Sky Witness','Sky Presence','Open Awareness','Bare Awareness','Raw Awareness','Direct Awareness','Immediate Presence','Naked Presence','Pure Presence','Simple Presence',
  'Plain Presence','Ordinary Presence','Natural Presence','Effortless Presence','Spontaneous Presence','Unforced Presence','Free Presence','Unconditioned','Complete Presence','Whole Presence',
  'Total Awareness','Full Awareness','Whole Awareness','Undivided Awareness','All-Inclusive','All-Embracing','All-Pervading Awareness','Omnidirectional','Nonlocal','Nonpersonal',
  'Transpersonal','Superpersonal','Metapersonal','Beyond Personal','Impersonal Witness','Universal Witness','Cosmic Witness','Infinite Witness','Eternal Witness','Timeless Witness',
  'Spaceless Witness','Causeless Witness','Groundless Ground','Baseless Base','Rootless Root','Sourceless Source','Originless Origin','Beginningless Beginning','Endless End','Formless Form',
  'Thoughtless Thought','Effortless Effort','Actionless Action','Silent Sound','Dark Light','Empty Fullness','Nothing Everything','No-Thing','No-Self','No-Mind',
  'No-Thought','No-Form','No-Time','No-Space','No-Cause','No-Effect','No-Beginning','No-End','Pure Being','Pure Consciousness',
  'Pure Awareness','Pure Existence','Existence Itself','Being Itself','Consciousness Itself','Presence Itself','Life Itself','Light Itself','Love Itself','Truth Itself',
  'Reality Itself','The Real','The True','The Good','The Beautiful','The One','The Many in One','The One in Many','Unity in Diversity','The Whole',
  'Integrated Whole','Embodied Whole','Living Whole','Breathing Whole','Moving Whole','Thinking Whole','Feeling Whole','Perceiving Whole','Knowing Whole','Being Whole',
  'Existing Whole','Present Whole','Aware Whole','Conscious Whole','Awake Whole','Alive Whole','Real Whole','True Whole','Source Whole','Origin Whole',
  'Seed Awareness',
  // ── Tier 5: Integration (445–555) ──
  'Root Awareness','Stem Awareness','Branch Awareness','Leaf Awareness','Flower Awareness','Fruit Awareness','Tree Awareness','Forest Awareness','Mountain Awareness','River Awareness',
  'Ocean Awareness','Sky Awareness','Star Awareness','Sun Awareness','Moon Awareness','Earth Awareness','Fire Awareness','Water Awareness','Wind Awareness','Space Awareness',
  'Void Awareness','Form Awareness','Unified Field','Unified Presence','Unified Consciousness','Unified Being','Unified Reality','Seamless','Gapless','Borderless',
  'Edgeless','Centerless','Spacious','Vast Presence','Immense','Immeasurable Presence','Beyond Comparison','Matchless','Peerless','Incomparable',
  'Unequaled','Unsurpassed','Supreme','Ultimate','Absolute Presence','Final Presence','First Silence','Only This','Just This','Here Now',
  'Now Here','Always Already','Never Not Here','Ever Present','Permanently Present','Timelessly Present','This Moment','This Breath','This Heartbeat','This Sensation',
  'This Awareness','This Knowing','This Being','The Happening','The Presencing','The Knowing','The Being','The Witnessing','The Perceiving','The Sensing',
  'The Breathing','The Living','The Thinking','The Feeling','The Seeing','The Hearing','The Moving','The Resting','The Waking','Beyond Cycle',
  'Beyond Process','Beyond Event','Beyond Experience','Beyond Experiencer','Pure Experiencing','Bare Experiencing','Direct Experiencing','Unmediated Experience','Unfiltered Presence','Uninterpreted Presence',
  'Raw Presence','Elemental Presence','Primal Presence','Original Presence','First Presence','Before First','Before Origin','Prior to Experience','Prior to Witness','Prior to Awareness',
  'Prior to Consciousness','Prior to Being','Prior to Existence','Prior to Presence','Prior to Here','Prior to Now','That Which Is','That Which Was','That Which Always Is','That Alone',
  'Only That',
  // ── Tier 6: Dissolution (556–666) ──
  'Just That','That Itself','Selfsame','Selfless Self','No-Self Itself','Witness of Witness','Awareness of Awareness','Consciousness of Consciousness','Being of Being','Presence of Presence',
  'The Innermost','The Inmost','The Deepest','The Most Interior','The Secret','The Hidden','The Concealed','The Veiled','The Unrevealed','The Revealed',
  'The Manifest','The Unmanifest Manifest','The Secret Revealed','The Absolute Witness','The Absolute Presence','The Absolute Awareness','The Absolute Consciousness','The Absolute Being','The Absolute Existence','The Absolute Reality',
  'The Absolute Truth','The Absolute Self','The Absolute Ground','Infinite Depth','Infinite Height','Infinite Fullness','Infinite Emptiness','Infinite Silence','Infinite Sound','Infinite Light',
  'Infinite Dark','Infinite Form','Infinite Formlessness','Infinite Motion','Infinite Rest','Infinite Life','Infinite Death','Infinite Birth','Infinite Dissolution','Infinite Creation',
  'Infinite Destruction','Infinite Preservation','Infinite Transformation','Infinite Transcendence','Infinite Immanence','The Alpha','The Omega','The Alpha-Omega','The Beginning-End','The Endless Beginning',
  'That Which Has No Name','That Which Is All Names','The Name of Names','The Silence of Silence','The Ground of Ground','The Source of Sources','The Origin of Origins','The Cause of Causes','The One of Ones','The All of Alls',
  'The Nothing of Nothings','The Everything of Everything','The Beyond of Beyonds','Nameless Reality','Formless Truth','Boundless Being','Infinite Consciousness','Eternal Presence','Absolute Stillness','Total Silence',
  'Complete Emptiness','Perfect Fullness','The Unnameable','The Unthinkable','The Unknowable','The Unreachable','The Ungraspable','The Incomprehensible','The Unfathomable','The Immeasurable',
  'The Ineffable Ground','The Unspeakable Truth','The Inexpressible Reality','The Indescribable Presence','The Indefinable Awareness','Prior to Prior','Before Before','Beyond Beyond','Above Above','Below Below',
  'Inside Inside','Outside Outside','Here of Here','Now of Now','This of This','The Final Silence','The Last Witness','The Ultimate Presence','The Supreme Awareness','The Highest Consciousness',
  'The Deepest Being','The Most Real','The Truest Truth','The Purest Pure','The Holiest Whole',
  // ── Tier 7: Absolute (667–777) ──
  'Paramashiva','Parabrahman','Paramatman','Para-Turiya','Para-Turiyatita','The Great Silence','The Great Stillness','The Great Emptiness','The Great Fullness','The Great Peace',
  'The Great Witness','The Great Awareness','The Great Presence','The Great Consciousness','The Great Being','The Eternal Now','The Infinite Here','The Absolute This','The Supreme That','The First and Last',
  'The Only One','The Sole Reality','The Single Truth','The Unique Presence','Nondual','Advaita','Ekatvam','Kevalam','Purnam','Anantam',
  'Satyam','Shivam','Sundaram','Sachidananda','Tat Tvam Asi','Aham Brahmasmi','Prajnanam Brahma','Ayam Atma Brahma','The Final Word','The Only Truth',
  'The Single Light','The One Flame','The Primordial Peace','The Eternal Rest','The Infinite Play','Transparent','Diaphanous','Pellucid','Crystal Clear','Like Space',
  'Like Sky','Like Light','Like Silence','Like Peace','Like Love','The Mirror','The Reflection','Pure Reflection','Flawless','Spotless',
  'Stainless','Taintless','Blemishless','Uncontaminated','Unpolluted','Unadulterated','Unmixed','Undiluted','Full Measure','Complete Measure',
  'Total Measure','Ultimate Measure','Final Measure','The Capstone','The Keystone','The Touchstone','The Lodestone','The Horizon','The Zenith','The Nadir',
  'The Center','The Circumference','The Radius','The Point','The Pointless Point','The Centerless Center','The Boundless Horizon','The Centerless Circumference','The Sovereign Ground','The Immovable Peace',
  'The Witnessing Itself','The Living Absolute','The Realized Infinite','The Complete Stillness','The Whole Silence','The Undivided Light','The Unbroken Peace','The Only Awareness','The Single Presence','Turiyatita Itself',
  'The Nameless Absolute','The Absolute Nameless','The Final Awareness','The Last Silence','The First Awareness','The Only Presence','The Supreme Presence','Presence Itself Itself','The Supreme Culmination','The One Without Second',
  'The Awareness Beyond All',
];

function getRankTitle(level) {
  if (level <= 0) return 'Initiate';
  if (level > 777) return 'The Awareness Beyond All';
  return RANK_TITLES[level] || 'The Awareness Beyond All';
}
function getTierColor(level) {
  if (level <= 111) return '#c8a96e'; // amber — Awakening
  if (level <= 222) return '#7eb8a4'; // teal — Perception
  if (level <= 333) return '#7899d4'; // blue — Stillness
  if (level <= 444) return '#a47eb8'; // violet — Expansion
  if (level <= 555) return '#d4b87a'; // gold — Integration
  if (level <= 666) return '#b87a7a'; // rose — Dissolution
  return '#e8e4dc';                   // white — Absolute
}

function getTierName(level) {
  if (level <= 111) return 'Awakening';
  if (level <= 222) return 'Perception';
  if (level <= 333) return 'Stillness';
  if (level <= 444) return 'Expansion';
  if (level <= 555) return 'Integration';
  if (level <= 666) return 'Dissolution';
  return 'Absolute';
}

// Session params — smooth linear interpolation across 777 levels
// L1: 30min / 90s → L777: 480min / 600s
function getSessionParams(level) {
  var t = Math.min(1, Math.max(0, (level - 1) / 776));
  var dur = Math.round((30 + t * 450) / 5) * 5;
  var interval = Math.round((90 + t * 510) / 30) * 30;
  return { durationMin: Math.max(30, Math.min(480, dur)), intervalSec: Math.max(90, Math.min(600, interval)) };
}

// XP needed to advance from level N to N+1
// Exponential curve: 25 XP at L1, ~3,950 XP at L776
// Total XP for L1→777 ≈ 600,000 = 10,000 hours of practice
function xpForLevel(level) {
  if (level >= 777) return Infinity;
  return Math.max(1, Math.round(25 * Math.pow(1.006546, level - 1)));
}

function sumXpToLevel(l) {
  // Geometric series: sum of round(25 * 1.006546^(i-1)) for i=1 to l-1
  // Use formula for speed at high levels
  if (l <= 1) return 0;
  var r = 1.006546, a = 25;
  var exact = a * (Math.pow(r, l - 1) - 1) / (r - 1);
  return Math.round(exact);
}

// ═══════════════════════════════════════
// SYMBOL SYSTEM
// ═══════════════════════════════════════

var SYMBOL_DESCRIPTIONS = {
  taoist:   "The Tao · Levels 1–55 · The primordial unity from which all things arise. Awareness begins with the recognition of duality: self and world, observer and observed. You are learning to watch.",
  eye:      "The Eye · Levels 56–110 · The witness awakens. You begin to see yourself seeing. The inner observer is no longer hidden — it is the ground you practice from.",
  lotus:    "The Lotus · Levels 111–165 · Unfolding from the depths. Perception clarifies as the mind learns to rest on the surface of experience without grasping or pushing away.",
  flame:    "The Flame · Levels 166–220 · The inner light kindles. Awareness becomes a living force, brightening with each session. Presence is no longer effort — it is heat.",
  infinity: "The Infinity · Levels 221–275 · Boundlessness begins. The sense of a fixed, separate self softens into open, continuous presence. The edges of the watcher grow indistinct.",
  hexagram: "The Hexagram · Levels 276–330 · Above and below in balance. Inner and outer worlds are recognized as reflections of one another. What you observe, you become.",
  spiral:   "The Spiral · Levels 331–385 · The journey inward. Each revolution returns to the same point, but deeper. Practice reveals its own depth — the ground is always further down.",
  ouroboros:"The Ouroboros · Levels 386–440 · The self-sustaining circle. The practice feeds itself; presence generates the energy to be present. You no longer need to remember to return.",
  thirdeye: "The Third Eye · Levels 441–495 · Subtle vision opens. What was once background becomes foreground: the texture of bare experience, unmediated by concept or interpretation.",
  sun:      "The Sun · Levels 496–550 · Radiance and transcendence. Awareness shines steadily, no longer dimmed by thought or distraction. The light is not yours — it shines through you.",
  crystal:  "The Crystal · Levels 551–605 · Clarity and mastery. The mind becomes transparent, refracting experience without distortion. You are both the light and the medium it passes through.",
  moon:     "The Moon · Levels 606–660 · Integration over time. What was achieved in session begins to permeate ordinary waking life. The practice and the life are becoming one thing.",
  merkaba:  "The Merkaba · Levels 661–720 · Geometric perfection. Consciousness and form unite. Awareness is no longer an achievement — it is the ground beneath achievement and failure both.",
  void:     "The Void · Levels 721–777 · Sunyata. The empty circle that contains all. You have arrived at the beginning. There is no difference between presence and absence, between practice and rest.",
};

// 🐯 Hidden tiger — Connor's easter egg
var TIGER_LEVELS = [108, 216, 324, 432, 540, 648, 756];  // every 108 levels

function getSymbolDescription(symbolId) {
  return SYMBOL_DESCRIPTIONS[symbolId] || '';
}

function getHoursFromXP(xp) {
  return xp / 60; // XP = minutes practiced, return as decimal hours
}

function showRankModal(level, xp, mode) {
  // mode: 'awareness' or 'concentration'
  var group = getSymbolGroup(level);
  var color = mode === 'concentration' ? '#d4956e' : getTierColor(level);
  var rank = mode === 'concentration' ? getConcRank(level) : getRankTitle(level);
  var fill = getSymbolLevelRoman(level);
  var desc = getSymbolDescription(group.id);
  var hours = mode === 'concentration'
    ? xp / 3600  // conc XP = seconds → decimal hours
    : getHoursFromXP(xp);   // awareness XP = minutes

  var modal = document.getElementById('rankModal');
  var symEl = document.getElementById('rankModalSymbol');
  var numEl = document.getElementById('rankModalNum');
  var titleEl = document.getElementById('rankModalTitle');
  var fillEl = document.getElementById('rankModalFill');
  var descEl = document.getElementById('rankModalDesc');
  var hoursEl = document.getElementById('rankModalHours');

  if (symEl) symEl.innerHTML = renderSymbolSVG(group.id, color, 64);
  if (numEl) { numEl.textContent = 'Level ' + level; numEl.style.color = color; }
  if (titleEl) { titleEl.textContent = rank; titleEl.style.color = color; }
  if (fillEl) { fillEl.textContent = group.name + ' · ' + fill; fillEl.style.color = color; }
  if (descEl) descEl.textContent = desc;

  // 🐯 Tiger easter egg — appears silently at every 108th level
  var tigerEl = document.getElementById('rankModalTiger');
  if (tigerEl) tigerEl.style.display = TIGER_LEVELS.indexOf(level) !== -1 ? 'block' : 'none';
  if (hoursEl) {
    if (mode === 'awareness') {
      var hoursLeft = Math.max(0, 10000 - hours);
      hoursEl.textContent = hours.toFixed(1) + ' hrs practiced · ' + hoursLeft.toFixed(1) + ' to rank 777';
    } else {
      var concHoursLeft = Math.max(0, 10000 - hours);
      hoursEl.textContent = hours.toFixed(1) + ' hrs focused · ' + concHoursLeft.toFixed(1) + ' to rank 777';
    }
  }

  if (modal) { modal.style.display = 'flex'; }
}

function getSymbolGroup(level) {
  // 14 symbols, each covering ~55 levels across 777
  if (level <= 55)  return { id: 'taoist',   name: 'Tao',         start: 1   };
  if (level <= 110) return { id: 'eye',       name: 'The Eye',     start: 56  };
  if (level <= 165) return { id: 'lotus',     name: 'Lotus',       start: 111 };
  if (level <= 220) return { id: 'flame',     name: 'Flame',       start: 166 };
  if (level <= 275) return { id: 'infinity',  name: 'Infinity',    start: 221 };
  if (level <= 330) return { id: 'hexagram',  name: 'Hexagram',    start: 276 };
  if (level <= 385) return { id: 'spiral',    name: 'Spiral',      start: 331 };
  if (level <= 440) return { id: 'ouroboros', name: 'Ouroboros',   start: 386 };
  if (level <= 495) return { id: 'thirdeye',  name: 'Third Eye',   start: 441 };
  if (level <= 550) return { id: 'sun',       name: 'The Sun',     start: 496 };
  if (level <= 605) return { id: 'crystal',   name: 'Crystal',     start: 551 };
  if (level <= 660) return { id: 'moon',      name: 'Moon',        start: 606 };
  if (level <= 720) return { id: 'merkaba',   name: 'Merkaba',     start: 661 };
  return                   { id: 'void',      name: 'The Void',    start: 721 };
}

function getSymbolFill(level) {
  // Returns Roman numerals I-V for position within each 55-level symbol group
  var group = getSymbolGroup(level);
  var pos = level - group.start + 1;
  var groupSize = 55;
  var fills = Math.ceil((pos / groupSize) * 5);
  fills = Math.max(1, Math.min(5, fills));
  var roman = ['I','II','III','IV','V'];
  return roman[fills - 1];
}

function toLevelRoman(n) {
  // Convert integer 1-57 to Roman numeral string
  if (n <= 0) return 'I';
  var vals = [50,40,10,9,5,4,1];
  var syms = ['L','XL','X','IX','V','IV','I'];
  var result = '';
  for (var i = 0; i < vals.length; i++) {
    while (n >= vals[i]) { result += syms[i]; n -= vals[i]; }
  }
  return result;
}

function getSymbolLevelRoman(level) {
  // Returns the Roman numeral position within the current symbol group (1-55 → I-LV)
  var group = getSymbolGroup(level);
  var pos = level - group.start + 1;
  return toLevelRoman(pos);
}

function renderSymbolSVG(symbolId, color, size) {
  size = size || 80;
  var c = color || '#7eb8a4';
  var s = size;
  var half = s / 2;
  var sw = s * 0.025; // stroke width

  var svgs = {
    taoist: '<svg width="' + s + '" height="' + s + '" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">'
      + '<circle cx="50" cy="50" r="46" stroke="' + c + '" stroke-width="' + (sw*40) + '" fill="none" opacity="0.3"/>'
      + '<path d="M50 4 A46 46 0 0 1 50 96 A23 23 0 0 1 50 50 A23 23 0 0 0 50 4" fill="' + c + '" opacity="0.8"/>'
      + '<circle cx="50" cy="27" r="8" fill="' + c + '" opacity="0.9"/>'
      + '<circle cx="50" cy="73" r="8" fill="#07080d" opacity="0.9"/>'
      + '<circle cx="50" cy="27" r="3" fill="#07080d"/>'
      + '<circle cx="50" cy="73" r="3" fill="' + c + '"/>'
      + '</svg>',

        eye: '<svg width="' + s + '" height="' + s + '" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">'
      + '<path d="M10 50 Q50 10 90 50 Q50 90 10 50Z" stroke="' + c + '" stroke-width="2.5" fill="none" opacity="0.8"/>'
      + '<circle cx="50" cy="50" r="14" stroke="' + c + '" stroke-width="2" fill="none"/>'
      + '<circle cx="50" cy="50" r="6" fill="' + c + '" opacity="0.9"/>'
      + '<circle cx="47" cy="47" r="2" fill="#07080d"/>'
      + '<line x1="50" y1="12" x2="50" y2="4" stroke="' + c + '" stroke-width="1.5" opacity="0.5"/>'
      + '<line x1="50" y1="88" x2="50" y2="96" stroke="' + c + '" stroke-width="1.5" opacity="0.5"/>'
      + '</svg>',

    lotus: '<svg width="' + s + '" height="' + s + '" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">'
      + '<path d="M50 80 Q30 60 30 45 Q30 25 50 30 Q70 25 70 45 Q70 60 50 80Z" stroke="' + c + '" stroke-width="2" fill="none" opacity="0.8"/>'
      + '<path d="M50 80 Q20 65 15 45 Q12 28 35 35" stroke="' + c + '" stroke-width="1.5" fill="none" opacity="0.6"/>'
      + '<path d="M50 80 Q80 65 85 45 Q88 28 65 35" stroke="' + c + '" stroke-width="1.5" fill="none" opacity="0.6"/>'
      + '<path d="M50 80 Q10 70 5 50 Q3 32 28 40" stroke="' + c + '" stroke-width="1" fill="none" opacity="0.35"/>'
      + '<path d="M50 80 Q90 70 95 50 Q97 32 72 40" stroke="' + c + '" stroke-width="1" fill="none" opacity="0.35"/>'
      + '<line x1="50" y1="80" x2="50" y2="95" stroke="' + c + '" stroke-width="1.5" opacity="0.4"/>'
      + '<circle cx="50" cy="45" r="5" fill="' + c + '" opacity="0.7"/>'
      + '</svg>',

    flame: '<svg width="' + s + '" height="' + s + '" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">'
      + '<path d="M50 8 C50 8 65 28 65 42 C65 52 58 58 58 58 C58 48 52 42 50 38 C48 42 42 48 42 58 C42 58 35 52 35 42 C35 28 50 8 50 8Z" stroke="' + c + '" stroke-width="1.5" fill="none" opacity="0.9"/>'
      + '<path d="M50 40 C50 40 58 50 58 60 C58 70 54 76 50 78 C46 76 42 70 42 60 C42 50 50 40 50 40Z" stroke="' + c + '" stroke-width="1.5" fill="none" opacity="0.6"/>'
      + '<circle cx="50" cy="72" r="5" fill="' + c + '" opacity="0.8"/>'
      + '<line x1="50" y1="78" x2="50" y2="94" stroke="' + c + '" stroke-width="1.5" opacity="0.3"/>'
      + '</svg>',

    infinity: '<svg width="' + s + '" height="' + s + '" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">'
      + '<path d="M50 50 C50 50 35 28 22 28 C10 28 4 38 4 50 C4 62 10 72 22 72 C35 72 50 50 50 50 C50 50 65 28 78 28 C90 28 96 38 96 50 C96 62 90 72 78 72 C65 72 50 50 50 50Z" stroke="' + c + '" stroke-width="2.5" fill="none" opacity="0.85"/>'
      + '<circle cx="50" cy="50" r="3" fill="' + c + '"/>'
      + '</svg>',

    hexagram: '<svg width="' + s + '" height="' + s + '" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">'
      + '<polygon points="50,8 91,32 91,68 50,92 9,68 9,32" stroke="' + c + '" stroke-width="1" fill="none" opacity="0.2"/>'
      + '<polygon points="50,14 86,36 86,66 50,88 14,66 14,36" stroke="' + c + '" stroke-width="0.5" fill="none" opacity="0.15"/>'
      + '<path d="M50 18 L79 64 L21 64 Z" stroke="' + c + '" stroke-width="2" fill="none" opacity="0.8"/>'
      + '<path d="M50 82 L21 36 L79 36 Z" stroke="' + c + '" stroke-width="2" fill="none" opacity="0.8"/>'
      + '<circle cx="50" cy="50" r="5" fill="' + c + '" opacity="0.7"/>'
      + '</svg>',

    spiral: '<svg width="' + s + '" height="' + s + '" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">'
      + '<path d="M50 50 C50 50 54 46 58 50 C64 56 60 66 50 68 C38 70 28 60 30 48 C32 34 44 24 58 26 C74 28 84 42 82 58 C80 76 64 88 46 86 C26 84 12 66 14 46 C16 24 36 8 58 10" stroke="' + c + '" stroke-width="2" fill="none" opacity="0.85"/>'
      + '<circle cx="50" cy="50" r="3" fill="' + c + '"/>'
      + '</svg>',

    ouroboros: '<svg width="' + s + '" height="' + s + '" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">'
      + '<circle cx="50" cy="50" r="36" stroke="' + c + '" stroke-width="7" fill="none" opacity="0.7"/>'
      + '<circle cx="50" cy="50" r="36" stroke="' + c + '" stroke-width="3" stroke-dasharray="8 220" fill="none" opacity="0.9"/>'
      + '<polygon points="86,44 80,50 86,56" fill="' + c + '" opacity="0.9"/>'
      + '<circle cx="50" cy="50" r="10" stroke="' + c + '" stroke-width="1.5" fill="none" opacity="0.5"/>'
      + '<circle cx="50" cy="50" r="3" fill="' + c + '" opacity="0.7"/>'
      + '</svg>',

    thirdeye: '<svg width="' + s + '" height="' + s + '" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">'
      + '<polygon points="50,12 90,78 10,78" stroke="' + c + '" stroke-width="2" fill="none" opacity="0.85"/>'
      + '<polygon points="50,28 76,72 24,72" stroke="' + c + '" stroke-width="1" fill="none" opacity="0.4"/>'
      + '<circle cx="50" cy="58" r="9" stroke="' + c + '" stroke-width="2" fill="none" opacity="0.8"/>'
      + '<circle cx="50" cy="58" r="4" fill="' + c + '" opacity="0.9"/>'
      + '<line x1="50" y1="12" x2="50" y2="4" stroke="' + c + '" stroke-width="1.5" opacity="0.5"/>'
      + '</svg>',

    sun: '<svg width="' + s + '" height="' + s + '" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">'
      + '<circle cx="50" cy="50" r="20" stroke="' + c + '" stroke-width="2.5" fill="none" opacity="0.9"/>'
      + '<circle cx="50" cy="50" r="8" fill="' + c + '" opacity="0.8"/>'
      + '<line x1="50" y1="6" x2="50" y2="18" stroke="' + c + '" stroke-width="2.5" stroke-linecap="round" opacity="0.8"/>'
      + '<line x1="50" y1="82" x2="50" y2="94" stroke="' + c + '" stroke-width="2.5" stroke-linecap="round" opacity="0.8"/>'
      + '<line x1="6" y1="50" x2="18" y2="50" stroke="' + c + '" stroke-width="2.5" stroke-linecap="round" opacity="0.8"/>'
      + '<line x1="82" y1="50" x2="94" y2="50" stroke="' + c + '" stroke-width="2.5" stroke-linecap="round" opacity="0.8"/>'
      + '<line x1="18" y1="18" x2="26" y2="26" stroke="' + c + '" stroke-width="2.5" stroke-linecap="round" opacity="0.6"/>'
      + '<line x1="74" y1="74" x2="82" y2="82" stroke="' + c + '" stroke-width="2.5" stroke-linecap="round" opacity="0.6"/>'
      + '<line x1="82" y1="18" x2="74" y2="26" stroke="' + c + '" stroke-width="2.5" stroke-linecap="round" opacity="0.6"/>'
      + '<line x1="18" y1="82" x2="26" y2="74" stroke="' + c + '" stroke-width="2.5" stroke-linecap="round" opacity="0.6"/>'
      + '</svg>',

    crystal: '<svg width="' + s + '" height="' + s + '" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">'
      + '<polygon points="50,10 76,30 76,70 50,90 24,70 24,30" stroke="' + c + '" stroke-width="2" fill="none" opacity="0.85"/>'
      + '<line x1="50" y1="10" x2="24" y2="70" stroke="' + c + '" stroke-width="0.8" opacity="0.3"/>'
      + '<line x1="50" y1="10" x2="76" y2="70" stroke="' + c + '" stroke-width="0.8" opacity="0.3"/>'
      + '<line x1="24" y1="30" x2="76" y2="30" stroke="' + c + '" stroke-width="0.8" opacity="0.3"/>'
      + '<line x1="24" y1="70" x2="76" y2="70" stroke="' + c + '" stroke-width="0.8" opacity="0.3"/>'
      + '<line x1="24" y1="30" x2="50" y2="90" stroke="' + c + '" stroke-width="0.8" opacity="0.3"/>'
      + '<line x1="76" y1="30" x2="50" y2="90" stroke="' + c + '" stroke-width="0.8" opacity="0.3"/>'
      + '<circle cx="50" cy="50" r="4" fill="' + c + '" opacity="0.9"/>'
      + '</svg>',

    moon: '<svg width="' + s + '" height="' + s + '" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">'
      + '<circle cx="50" cy="50" r="38" stroke="' + c + '" stroke-width="2" fill="none" opacity="0.3"/>'
      + '<path d="M50 12 A38 38 0 1 0 50 88 A24 24 0 1 1 50 12Z" stroke="' + c + '" stroke-width="2" fill="none" opacity="0.85"/>'
      + '<circle cx="38" cy="38" r="4" stroke="' + c + '" stroke-width="1" fill="none" opacity="0.4"/>'
      + '<circle cx="58" cy="62" r="6" stroke="' + c + '" stroke-width="1" fill="none" opacity="0.4"/>'
      + '<circle cx="44" cy="60" r="2.5" stroke="' + c + '" stroke-width="1" fill="none" opacity="0.3"/>'
      + '</svg>',

    merkaba: '<svg width="' + s + '" height="' + s + '" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">'
      + '<polygon points="50,10 86,70 14,70" stroke="' + c + '" stroke-width="2" fill="none" opacity="0.85"/>'
      + '<polygon points="50,90 86,30 14,30" stroke="' + c + '" stroke-width="2" fill="none" opacity="0.85"/>'
      + '<circle cx="50" cy="50" r="18" stroke="' + c + '" stroke-width="1" fill="none" opacity="0.3"/>'
      + '<circle cx="50" cy="50" r="4" fill="' + c + '" opacity="0.8"/>'
      + '</svg>',

    void: '<svg width="' + s + '" height="' + s + '" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">'
      + '<circle cx="50" cy="50" r="42" stroke="' + c + '" stroke-width="1.5" fill="none" opacity="0.5"/>'
      + '<circle cx="50" cy="50" r="30" stroke="' + c + '" stroke-width="0.8" fill="none" opacity="0.3"/>'
      + '<circle cx="50" cy="50" r="18" stroke="' + c + '" stroke-width="0.5" fill="none" opacity="0.2"/>'
      + '<circle cx="50" cy="50" r="2" fill="' + c + '" opacity="0.6"/>'
      + '</svg>',
  };

  return svgs[symbolId] || svgs.void;
}

// ═══════════════════════════════════════
// STATE
// ═══════════════════════════════════════

const DEFAULT_STATE = {
  level: 1, xp: 0, totalSessions: 0,
  streak: 0, lastSessionDate: null,
  history: [], weeklyScores: [],
  intervalOffset: 0, // seconds added to level-based interval (+/- 120s cap)
  durationOverride: null, // null = use level-based default; number = user-set minutes
  // ── Idle game fields ──
  residue: 0,           // pending passive XP waiting to be collected
  residueGeneratedAt: null, // timestamp when last session ended (for residue decay)
  lastSessionClarity: 0,    // XP earned last session (residue cap basis)
  chainSessionsToday: 0,    // sessions today for chain bonus
  chainDate: null,           // date string for chain reset
  momentum: 1.0,             // Discipline multiplier (1.0 baseline, max 1.5)
  stillness: 0,              // stat: fed by awareness sessions
  focus: 0,                  // stat: fed by concentration sessions (updated separately)
  depth: 1,                  // unified depth level
  // ── Streak v2 (freezes + calendar) ──
  streakFreezes: 0,          // available freezes (0-3)
  streakFreezesEverEarned: 0, // lifetime count (for "earned N freezes" toast)
  freezesUsed: 0,            // lifetime freezes consumed
  practicedDates: [],        // array of 'YYYY-MM-DD' strings
  frozenDates: [],           // days a freeze covered (keep the chain unbroken)
  streakStartDate: null,     // 'YYYY-MM-DD' of current streak's day 1
  streakCommit: 7,           // current commitment goal (7/14/30/45)
  streakGoalBaseDays: 0,     // streak-day count when the current goal was committed; a new goal counts from here, not day 1
  endedStreakInfo: null,     // {days, date} stashed when streak ends, cleared after modal shown
  streakEndedPromptShown: false,
};

function normalizeLevel(value) {
  var level = Number(value);
  if (!Number.isFinite(level)) return 1;
  return Math.min(777, Math.max(1, Math.floor(level)));
}

function loadState() {
  try {
    const s = localStorage.getItem('presence_v3');
    var loaded = s ? { ...DEFAULT_STATE, ...JSON.parse(s) } : { ...DEFAULT_STATE };
    loaded.level = normalizeLevel(loaded.level);
    return loaded;
  } catch { return { ...DEFAULT_STATE }; }
}

function saveState() {
  // Guard: never overwrite real data with a default/empty state
  // If we have 0 XP and 0 sessions but cloud might have data, skip save until pull confirms
  if (state.xp === 0 && state.totalSessions === 0 && window._syncPullPending) return;
  localStorage.setItem('presence_v3', JSON.stringify(state));
}

let state = loadState();

// ═══════════════════════════════════════
// IDLE GAME ENGINE
// ═══════════════════════════════════════

// Depth = floor(sqrt(totalClarity / 100))
// Depth 10 ≈ 10,000 XP (~167 hrs), Depth 30 ≈ 90,000 XP
function calcDepth(xp) {
  return Math.max(1, Math.floor(Math.sqrt(Math.max(0, xp) / 100)));
}

// Residue: accumulates at 2% of last session's clarity per hour, cap 50%
// Decays (lost) if not collected within 36 hours
function calcResidueAccrued() {
  if (!state.residueGeneratedAt || !state.lastSessionClarity) return 0;
  var elapsed = (Date.now() - state.residueGeneratedAt) / 3600000; // hours
  if (elapsed > 36) return 0; // expired
  var cap = Math.floor(state.lastSessionClarity * 0.5);
  return Math.min(cap, Math.floor(state.lastSessionClarity * 0.02 * elapsed));
}

// Chain bonus: +20% first chain, +35% second+
function chainMultiplier() {
  var today = new Date().toDateString();
  var chains = (state.chainDate === today) ? state.chainSessionsToday : 0;
  if (chains <= 0) return 1.0;
  if (chains === 1) return 1.20;
  return 1.35;
}

// Momentum: streak-based multiplier, decays 0.1/missed day, floors at 0.7
function calcMomentum(streak) {
  return Math.min(1.5, Math.max(0.7, 1.0 + streak * 0.05));
}

// ── Shared helpers ────────────────────────────────────────────────────────
// Consume pending XP into level-ups. Both XP curves share the same loop —
// pass the matching cumulative-XP and next-level-cost functions
// (awareness: sumXpToLevel/xpForLevel · concentration: concSumXpToLevel/
// concXpForLevel). Returns true if at least one level was gained.
function awardLevelUps(st, sumFn, forFn) {
  var prev = st.level;
  while (st.level < 777) {
    if (st.xp - sumFn(st.level) >= forFn(st.level)) { st.level++; } else { break; }
  }
  return st.level > prev;
}

// Escape user-supplied text for safe insertion into innerHTML strings.
function escHtml(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Prepend an entry to a history array and truncate in place to the cap.
function pushHistory(arr, entry, cap) {
  arr.unshift(entry);
  var max = cap || 100;
  if (arr.length > max) arr.length = max;
}

// ── Shared exercise-completion pipeline ─────────────────────────────────────
// Every exercise ends the same way: record the session in concState.history,
// persist, sync, count the practice (streak + daily quests), then award Omnia
// akasha/body progress. Keeping this in ONE place means a completion-time
// feature is a single edit here — not a hand-threaded change across eight
// sites (which is exactly how pore breathing and multi-sense once missed
// quest counting).
// opts:
//   entry        history entry object (required)
//   exId         Omnia exercise id ('clock', 'visual', …); omit to skip award
//   omniaSeconds seconds/XP figure passed to awardOmniaForExercise
//   reachedRec   optional early-end flag (see awardOmniaForExercise)
//   skipOmnia    record + count only, no Omnia award (capped clock, multi-sense)
// Returns the akasha gained by the award (0 when skipped), for the legend.
function recordExerciseCompletion(opts) {
  pushHistory(concState.history, opts.entry, 100);
  saveConcState();
  if (syncEnabled && authToken) syncPushData();
  touchPracticeStreak();
  var pre = (typeof omniaState !== 'undefined' && omniaState) ? omniaState.akasha : 0;
  if (opts.exId && !opts.skipOmnia) {
    awardOmniaForExercise(opts.exId, opts.omniaSeconds, opts.reachedRec);
  }
  if (typeof achOnCompletion === 'function') achOnCompletion(opts);
  if (typeof evaluateGiftPath === 'function') { evaluateGiftPath(); updateGiftPathButton(); }
  return (typeof omniaState !== 'undefined' && omniaState) ? Math.round(omniaState.akasha - pre) : 0;
}

function touchPracticeStreak() {
  var today = new Date().toDateString();
  var todayISO = new Date().toISOString().slice(0,10);
  if (state.lastSessionDate !== today) {
    var prevStreak = state.streak || 0;
    // Record today's practice first, then derive the streak from the calendar so
    // the number can never drift from what the user sees.
    if (!state.practicedDates) state.practicedDates = [];
    if (state.practicedDates.indexOf(todayISO) === -1) {
      state.practicedDates.push(todayISO);
      if (state.practicedDates.length > 365) state.practicedDates = state.practicedDates.slice(-365);
    }
    state.lastSessionDate = today;
    syncStreakFromCalendar();
    // Freeze gifts, keyed off the calendar-derived streak:
    if (state.streak === 1) {
      // Fresh streak — top up to 3 freezes and reset the goal baseline to day 1.
      state.streakGoalBaseDays = 0;
      var fGift = Math.min(3, 3 - (state.streakFreezes || 0));
      if (fGift > 0) {
        state.streakFreezes = (state.streakFreezes || 0) + fGift;
        state.streakFreezesEverEarned = (state.streakFreezesEverEarned || 0) + fGift;
      }
    } else if (state.streak === prevStreak + 1 && state.streak % 7 === 0 && (state.streakFreezes || 0) < 3) {
      // Reached another clean week of practice — +1 freeze (capped at 3).
      state.streakFreezes = Math.min(3, (state.streakFreezes || 0) + 1);
      state.streakFreezesEverEarned = (state.streakFreezesEverEarned || 0) + 1;
    }
    // Award the committed streak goal's XP + Akasha when the streak reaches it.
    // Progress is measured from the goal's baseline (where the previous goal was
    // reached), so a goal is "N more days," and keyed by (streak start, baseline,
    // goal days) so each goal pays out exactly once.
    var commitDays = state.streakCommit || 7;
    var goalBase = state.streakGoalBaseDays || 0;
    if (state.streak - goalBase >= commitDays) {
      var awardKey = (state.streakStartDate || 'legacy') + ':' + goalBase + ':' + commitDays;
      if (state.streakCommitAwardedKey !== awardKey) {
        state.streakCommitAwardedKey = awardKey;
        var commitDef = null;
        for (var _ci = 0; _ci < STREAK_COMMITS.length; _ci++) {
          if (STREAK_COMMITS[_ci].days === commitDays) { commitDef = STREAK_COMMITS[_ci]; break; }
        }
        if (commitDef) {
          state.xp += commitDef.xp;
          var _scLeveled = awardLevelUps(state, sumXpToLevel, xpForLevel);
          if (typeof omniaState !== 'undefined' && omniaState) {
            omniaState.akasha += commitDef.akasha;
            if (typeof saveOmniaState === 'function') saveOmniaState();
          }
          // Queue the reward notification so it surfaces inside the session-complete
          // overlay (not buried behind it as a timed toast).
          window._pendingStreakBonus = { days: commitDays, xp: commitDef.xp, akasha: commitDef.akasha, leveled: _scLeveled, level: state.level };
        }
      }
    }
    saveState();
    if (syncEnabled && authToken) syncPushData();
    var el = document.getElementById('streakCount');
    if (el) el.textContent = state.streak;
    // Show streak celebration if not in tutorial. NOTE: this checked the key
    // 'presence_tutorialVisited', which nothing ever sets (the tutorial writes
    // 'presence_visited') — so the celebration never fired for anyone.
    if (!window._tutorialFirstClock && localStorage.getItem('presence_visited')) {
      setTimeout(function() {
        if (typeof showStreakCelebration === 'function') showStreakCelebration();
      }, 1400);
    }
  }
  if (typeof pathQuestRecordCompletion === 'function') pathQuestRecordCompletion();
}

function backfillPracticedDates() {
  if (!state.practicedDates) state.practicedDates = [];
  var seen = {};
  state.practicedDates.forEach(function(d) { seen[d] = true; });
  var added = false;
  function add(dateLike) {
    if (!dateLike) return;
    var iso;
    try { iso = new Date(dateLike).toISOString().slice(0,10); } catch(e) { return; }
    if (!iso || seen[iso]) return;
    seen[iso] = true;
    state.practicedDates.push(iso);
    added = true;
  }
  (state.history || []).forEach(function(h) { add(h.date); });
  if (typeof concState !== 'undefined' && concState && concState.history) {
    concState.history.forEach(function(h) { add(h.date); });
  }
  if (state.lastSessionDate) {
    try { add(new Date(state.lastSessionDate).toISOString().slice(0,10)); } catch(e) {}
  }
  if (added) {
    state.practicedDates.sort();
    if (state.practicedDates.length > 365) state.practicedDates = state.practicedDates.slice(-365);
    saveState();
  }
}

// Shared vigil between two practice calendars: consecutive days, ending today
// or yesterday, on which BOTH practiced. Today is a grace day — a pending
// partner doesn't break the run until the day is over.
function calcSharedStreak(mine, theirs, todayISO) {
  var mineSet = {}; (mine || []).forEach(function(d) { mineSet[d] = true; });
  var theirSet = {}; (theirs || []).forEach(function(d) { theirSet[d] = true; });
  var day = todayISO || new Date().toISOString().slice(0, 10);
  var todayMine = !!mineSet[day];
  var todayTheirs = !!theirSet[day];
  var bothToday = todayMine && todayTheirs;
  var cursor = day;
  // If the pair hasn't both practiced today, the still-alive run ends yesterday.
  if (!bothToday) {
    cursor = new Date(new Date(cursor + 'T00:00:00Z').getTime() - 86400000).toISOString().slice(0, 10);
  }
  var streak = 0;
  while (mineSet[cursor] && theirSet[cursor]) {
    streak++;
    cursor = new Date(new Date(cursor + 'T00:00:00Z').getTime() - 86400000).toISOString().slice(0, 10);
  }
  return { streak: streak, todayMine: todayMine, todayTheirs: todayTheirs, bothToday: bothToday };
}

// ── Calendar-derived streak ──────────────────────────────────────────────
// The streak NUMBER is always recomputed from the practiced-days calendar (plus
// any days a freeze covered) so it can never drift away from what the user sees
// on the calendar. A day counts toward the streak if it was practiced or frozen.
function _streakISO(d) { return d.toISOString().slice(0, 10); }

var STREAK_FREEZE_CAP = 3;

// Pure: walk backwards from today (or yesterday, since the streak is still alive
// until midnight) over consecutive practiced-or-frozen days. A frozen day is one
// a freeze covered, so it keeps the chain unbroken and counts toward the span.
// Returns the run length and its first day. Stops at the first uncovered miss.
function computeStreakRun() {
  var practiced = {}; (state.practicedDates || []).forEach(function(d) { practiced[d] = true; });
  var frozen = {}; (state.frozenDates || []).forEach(function(d) { frozen[d] = true; });
  function has(key) { return practiced[key] || frozen[key]; }
  var today = new Date(); today.setHours(0, 0, 0, 0);
  var cursor = new Date(today);
  if (!has(_streakISO(today))) cursor.setDate(cursor.getDate() - 1);
  var count = 0;
  var start = null;
  while (has(_streakISO(cursor))) {
    count++;
    start = _streakISO(cursor);
    cursor.setDate(cursor.getDate() - 1);
  }
  return { count: count, start: start };
}

// One-time repair for streaks created before the calendar-derived model: their
// missed days were never recorded as frozen, so the run would break at the first
// old gap. Seed frozenDates for already-passed ISOLATED single-day gaps in the
// trailing run (the kind a freeze covers), up to the freeze cap, so the streak
// number reflects the user's real, near-continuous practice. Runs exactly once.
function reconcileLegacyStreak() {
  if (state.streakReconciledV2) return;
  state.streakReconciledV2 = true;
  if (!state.frozenDates) state.frozenDates = [];
  var practiced = {}; (state.practicedDates || []).forEach(function(d) { practiced[d] = true; });
  var frozen = {}; state.frozenDates.forEach(function(d) { frozen[d] = true; });
  function has(key) { return practiced[key] || frozen[key]; }
  var today = new Date(); today.setHours(0, 0, 0, 0);
  var cursor = new Date(today);
  if (!has(_streakISO(today))) cursor.setDate(cursor.getDate() - 1);
  var bridgesLeft = STREAK_FREEZE_CAP;
  while (true) {
    var key = _streakISO(cursor);
    if (has(key)) { cursor.setDate(cursor.getDate() - 1); continue; }
    // Uncovered miss. Forgive it only if it's isolated (day before was practiced)
    // and we still have legacy bridges left; otherwise the chain genuinely ends.
    var prev = new Date(cursor); prev.setDate(prev.getDate() - 1);
    if (has(_streakISO(prev)) && bridgesLeft > 0) {
      bridgesLeft--;
      frozen[key] = true;
      if (state.frozenDates.indexOf(key) === -1) state.frozenDates.push(key);
      cursor.setDate(cursor.getDate() - 1);
      continue;
    }
    break;
  }
  saveState();
}

// A streak goal is a fresh challenge measured from where the previous goal was
// reached — not from day 1 — so picking "45 days" after finishing "30 days"
// means "45 more days," never showing you as already 37/45. This one-time
// migration seeds the baseline for existing streaks at the highest milestone the
// current streak has already cleared (below the current goal).
function migrateStreakGoalBase() {
  if (state.streakGoalBaseMigrated) return;
  state.streakGoalBaseMigrated = true;
  if (typeof state.streakGoalBaseDays !== 'number') state.streakGoalBaseDays = 0;
  var commit = state.streakCommit || 7;
  var streak = state.streak || 0;
  var base = 0;
  STREAK_COMMITS.forEach(function(c) {
    if (c.days < commit && streak >= c.days && c.days > base) base = c.days;
  });
  state.streakGoalBaseDays = base;
  saveState();
}

// Recompute state.streak from the calendar. Returns the previous value so
// callers can detect a break (prev > 0, now 0) or growth.
function syncStreakFromCalendar() {
  var run = computeStreakRun();
  var prev = state.streak || 0;
  state.streak = run.count;
  state.streakStartDate = run.count > 0 ? run.start : null;
  var el = document.getElementById('streakCount');
  if (el) el.textContent = state.streak;
  return prev;
}

function checkStreakStatus() {
  backfillPracticedDates();
  reconcileLegacyStreak();
  if (!state.lastSessionDate) { syncStreakFromCalendar(); return; }
  var today = new Date(); today.setHours(0,0,0,0);
  var last = new Date(state.lastSessionDate); last.setHours(0,0,0,0);
  var diffDays = Math.round((today - last) / 86400000);
  var prevStreak = state.streak || 0;
  if (diffDays > 1 && prevStreak > 0) {
    var missed = diffDays - 1;
    var available = state.streakFreezes || 0;
    if (missed <= available) {
      // Freezes can fully bridge the gap — spend exactly one per missed day and
      // record those days as frozen so the calendar-derived streak stays intact.
      for (var i = 1; i <= missed; i++) {
        var d = new Date(last); d.setDate(d.getDate() + i);
        var key = _streakISO(d);
        if (!state.frozenDates) state.frozenDates = [];
        if (state.frozenDates.indexOf(key) === -1) state.frozenDates.push(key);
      }
      state.streakFreezes = available - missed;
      state.freezesUsed = (state.freezesUsed || 0) + missed;
      state.endedStreakInfo = null;
      var _left = state.streakFreezes;
      setTimeout(function() {
        showToast('Streak freeze used · ' + _left + ' freeze' + (_left === 1 ? '' : 's') + ' remaining', 3200);
      }, 800);
    } else {
      // Not enough freezes to save the streak — break it, but DON'T waste the
      // freezes you did have (they carry into the next streak). Stash the miss/
      // freeze numbers so the Streak Ended popup can explain why it broke.
      state.endedStreakInfo = { days: prevStreak, date: state.lastSessionDate, missed: missed, freezes: available };
      state.streakEndedPromptShown = false;
      state.streakGoalBaseDays = 0; // next streak's goal counts from day 1
    }
    saveState();
  }
  // The streak number always reflects the calendar (never a stale counter).
  syncStreakFromCalendar();
  migrateStreakGoalBase();
  saveState();
  // Surface a pending "Streak Ended" popup — even if the streak is already 0
  // (e.g. the app reloaded before the prompt could render last time). The
  // "shown" flag is only set once the overlay actually appears, inside
  // showStreakEndedPrompt, so a missed render gets another chance.
  if (state.endedStreakInfo && !state.streakEndedPromptShown) {
    setTimeout(showStreakEndedPrompt, 1600);
  }
}

// Re-check whenever the app is resumed from the background (the standalone
// PWA isn't reloaded on reopen, so the load-time check alone left a stale
// streak count — and a delayed "Streak Ended" prompt — until the next launch).
document.addEventListener('visibilitychange', function() {
  if (document.visibilityState === 'visible' && typeof state !== 'undefined') {
    try { checkStreakStatus(); } catch(e) {}
  }
});

// Collect pending residue into XP
function collectResidue() {
  var pending = calcResidueAccrued();
  if (pending <= 0) return 0;
  state.xp += pending;
  state.residue = 0;
  state.residueGeneratedAt = null;
  state.depth = calcDepth(state.xp);
  var didLevelUp = awardLevelUps(state, sumXpToLevel, xpForLevel);
  saveState();
  if (syncEnabled && authToken) syncPushData();
  if (didLevelUp) setTimeout(function() { showLevelUp(state.level); }, 600);
  return pending;
}

// Called at session end — awards XP with all multipliers applied
function awardSessionClarity(rawMinutes) {
  var today = new Date().toDateString();
  // Chain tracking
  if (state.chainDate !== today) {
    state.chainSessionsToday = 0;
    state.chainDate = today;
  }
  var chainMult = chainMultiplier();
  var momentumMult = calcMomentum(state.streak);
  var finalXP = Math.round(rawMinutes * chainMult * momentumMult);
  state.xp += finalXP;
  state.chainSessionsToday++;
  state.lastSessionClarity = finalXP;
  state.residueGeneratedAt = Date.now();
  state.residue = 0; // resets; new residue starts accruing now
  state.momentum = momentumMult;
  state.stillness = (state.stillness || 0) + rawMinutes * 0.1;
  state.depth = calcDepth(state.xp);
  return { finalXP, chainMult, momentumMult };
}

// NBA (Next Best Action) string
function getNextBestAction() {
  var residue = calcResidueAccrued();
  var today = new Date().toDateString();
  var chainsToday = (state.chainDate === today) ? state.chainSessionsToday : 0;

  if (residue > 0) {
    return '<span>' + residue + ' XP</span> waiting — tap the ring to collect';
  }
  if (state.streak >= 3) {
    var nextDepth = state.depth + 1;
    var clarityNeeded = nextDepth * nextDepth * 100;
    var remaining = Math.max(0, clarityNeeded - state.xp);
    if (remaining < state.xp * 0.3) {
      return '<span>' + remaining + ' XP</span> from Depth ' + nextDepth;
    }
  }
  if (state.streak === 0 && state.totalSessions > 0) {
    return 'Return today to restore your <span>momentum</span>';
  }
  return '';
}

// ── Startup migration: recalculate level from raw XP ──────────────────────
// Runs whenever XP and level are out of sync (e.g. after leveling system change)
(function migrateLevel() {
  if (!state.xp) return;
  var correct = 1;
  while (correct < 777 && state.xp >= sumXpToLevel(correct + 1)) {
    correct++;
  }
  if (correct !== state.level) {
    console.log('[Presence] Level migrated: ' + state.level + ' → ' + correct + ' (xp=' + state.xp + ')');
    state.level = correct;
    saveState();
  }
})();

// ── Startup: decay momentum for missed days, sync depth ──────────────────
(function initIdleState() {
  // Decay momentum for days missed since last session
  if (state.lastSessionDate) {
    var last = new Date(state.lastSessionDate);
    var now = new Date();
    var daysMissed = Math.floor((now - last) / 86400000) - 1;
    if (daysMissed > 0) {
      state.momentum = Math.max(0.7, (state.momentum || 1.0) - 0.1 * daysMissed);
    }
  }
  // Sync depth from current XP
  state.depth = calcDepth(state.xp);
  saveState();
})();

// Derived session params — base from level, fine-tuned by offsets
function currentParams() {
  var base = getSessionParams(state.level);
  var offset = state.intervalOffset || 0;
  var adjustedInterval = Math.min(600, Math.max(30, base.intervalSec + offset));
  var dur = state.durationOverride != null ? state.durationOverride : base.durationMin;
  return { durationMin: Math.max(5, Math.min(480, dur)), intervalSec: adjustedInterval };
}

// ═══════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════

function fmt(sec) {
  if (sec >= 3600) {
    const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
    return h + ':' + String(m).padStart(2,'0') + ':' + String(s).padStart(2,'0');
  }
  const m = Math.floor(sec / 60), s = sec % 60;
  return String(m).padStart(2,'0') + ':' + String(s).padStart(2,'0');
}

function fmtDuration(min) {
  if (min >= 60) {
    const h = Math.floor(min / 60), m = min % 60;
    return m ? h + 'h ' + m + 'm' : h + 'h';
  }
  return min + 'm';
}

function fmtInterval(sec) {
  if (sec < 60) return sec + 's';
  const m = Math.floor(sec / 60), s = sec % 60;
  return s ? m + 'm ' + s + 's' : m + 'm';
}

function showToast(msg, dur, variant) {
  dur = dur || 2400;
  const t = document.getElementById('toast');
  t.textContent = msg;
  // Reward toasts glow gold automatically; explicit variant overrides.
  var v = variant || (/\+\d[\d,]*\s*(XP|xp|akasha|Akasha|◆)/.test(msg) ? 'gold' : '');
  t.className = 'toast show' + (v ? ' toast--' + v : '');
  setTimeout(function() { t.classList.remove('show'); }, dur);
}
function clearStaleInteractionLocks() {
  var cap = document.getElementById('tutDrawerCapture');
  var tut = document.getElementById('tutOverlay');
  var float = document.getElementById('tutDrawerFloat');
  var drawer = document.getElementById('drawerOverlay');
  document.body.classList.remove('tut-live');
  if (cap) cap.classList.remove('tut-cap-on');
  if (tut) { tut.style.display = 'none'; tut.style.opacity = '0'; tut.style.pointerEvents = 'none'; }
  if (float) float.classList.remove('tut-float-on');
  if (drawer) drawer.classList.remove('show');
}
function suppressTutorialForExerciseEntry() {
  // Only mark the tutorial complete when it is NOT currently running.
  // During the tutorial's own clock-launch sequence __tutInProgress is true,
  // so we skip setting the flag here — VISITED is set only when end() fires.
  if (!window.__tutInProgress) {
    try { localStorage.setItem('presence_visited', '1'); } catch(e) {}
  }
  window.__tutBoot = null;
  clearStaleInteractionLocks();
}
// Auto-reopen the drawer when backing out of a menu opened from it. (The
// reported "lag"/"not loading" was actually a leftover drawerAbout handler
// throwing and unbinding later drawer handlers — not this feature.)
var DRAWER_REOPEN_ON_BACK = true;
function showScreen(id) {
  if (id === 'homeScreen') {
    // Backing out of a menu opened from the hamburger: raise the drawer FIRST,
    // while the menu screen is still up, so the drawer overlay masks the swap
    // to home underneath. Otherwise the bare home screen flashes for a frame
    // before the drawer appears.
    var _reopen = window._returnToDrawer && DRAWER_REOPEN_ON_BACK && typeof openDrawer === 'function';
    window._returnToDrawer = false;
    if (_reopen) openDrawer(true);
    document.querySelectorAll('.screen').forEach(function(s) { s.classList.remove('active'); });
    document.getElementById('homeScreen').style.display = 'flex';
  } else {
    var el = document.getElementById(id);
    if (!el) { console.error('[showScreen] No element:', id); return; }
    document.querySelectorAll('.screen').forEach(function(s) { s.classList.remove('active'); });
    document.getElementById('homeScreen').style.display = 'none';
    el.classList.add('active');
    // A screen shown right after the drawer closed was opened FROM the drawer.
    if (Date.now() - (window._drawerClosedAt || 0) < 500) window._returnToDrawer = true;
    if (window._omniaQuickDismiss) window._omniaQuickDismiss();
  }
}
window.addEventListener('load', function() {
  if (localStorage.getItem('presence_visited')) clearStaleInteractionLocks();
});
document.addEventListener('DOMContentLoaded', function() {
  clearStaleInteractionLocks();
  setTimeout(clearStaleInteractionLocks, 250);
  setTimeout(clearStaleInteractionLocks, 1000);
  if (typeof checkStreakStatus === 'function') checkStreakStatus();
  if (typeof updateOmniaGiftBtn === 'function') { try { updateOmniaGiftBtn(); } catch(e) {} }
  if (typeof updateGiftPathButton === 'function') { try { updateGiftPathButton(); } catch(e) {} }
  if (typeof checkRemindersOnLoad === 'function') checkRemindersOnLoad();
  // Apply saved entity/palette cosmetics to the guide banner and drawer icon
  // on every page load so Seraph/etc. show immediately without visiting Upgrade.
  if (typeof applyOmniaCosmetics === 'function') applyOmniaCosmetics();
  if (typeof applyOmniaStepVisuals === 'function') { try { applyOmniaStepVisuals(); } catch(e) {} }
  if (typeof applyOmniaMetaMarks === 'function') { try { applyOmniaMetaMarks(); } catch(e) {} }
  // If a body level was earned but never acknowledged (app closed first),
  // surface the acknowledgment screen on next launch.
  setTimeout(function() {
    if (typeof maybeShowBodyLevelAward === 'function') { try { maybeShowBodyLevelAward(); } catch(e) {} }
  }, 2800);
  // Warm the Omnia report cache in the background so it's instant when the
  // user opens Progress Reports. Targets yesterday's daily report — the first
  // eligible daily view. fetchOmniaReport no-ops if already cached/fresh.
  setTimeout(prefetchOmniaReport, 3500);
});

function prefetchOmniaReport() {
  try {
    if (typeof fetchOmniaReport !== 'function') return;
    // Only bother if there's any practice history to reflect on, and only if
    // "yesterday" actually falls on or after the user's first-ever session.
    var hasData = (state.history && state.history.length) ||
                  (concState.history && concState.history.length);
    if (!hasData) return;
    if (getDateRange('daily', -1).now.getTime() <= getFirstUseDate()) return;
    fetchOmniaReport('daily', -1, function(){ /* cache warmed; ignore result */ });
  } catch (e) {}
}

function refreshGuidePathLayoutIfReady() {
  if (typeof scheduleGuidePathLayoutRefresh === 'function') {
    scheduleGuidePathLayoutRefresh(false);
  }
}
window.addEventListener('pageshow', refreshGuidePathLayoutIfReady);
window.addEventListener('resize', refreshGuidePathLayoutIfReady);
window.addEventListener('orientationchange', refreshGuidePathLayoutIfReady);
function randomPrompt(exclude) { var p; do { p = PROMPTS[Math.floor(Math.random() * PROMPTS.length)]; } while (p === exclude); return p; }

// ═══════════════════════════════════════
// HOME
// ═══════════════════════════════════════

function renderHome() {
  // If a session is active, don't let the user stay on the home screen
  if (sessionStartTime) {
    showScreen('sessionScreen');
    return;
  }
  var params = currentParams();
  var xpNeeded = xpForLevel(state.level);
  var xpThis = state.xp - sumXpToLevel(state.level);
  var prog = Math.min(xpThis / xpNeeded, 1);
  var circ = 2 * Math.PI * 60;
  document.getElementById('levelRingProg').style.strokeDashoffset = circ * (1 - prog);
  document.getElementById('levelNum').textContent = state.level;
  document.getElementById('levelTitle').textContent = getRankTitle(state.level);
  var awBannerGroup = document.getElementById('awBannerGroup');
  var awBannerLevel = document.getElementById('awBannerLevel');
  var awBannerSymbol = document.getElementById('awBannerSymbol');
  if (awBannerGroup) {
    var awBGroup = getSymbolGroup(state.level);
    awBannerGroup.textContent = awBGroup.name;
    awBannerLevel.textContent = state.level;
    awBannerSymbol.innerHTML = renderSymbolSVG(awBGroup.id, 'rgba(180,240,210,.75)', 16);
  }
  if (typeof renderAkashaBoostBadge === 'function') renderAkashaBoostBadge();
  if (typeof updateGuideQuestBadge === 'function') updateGuideQuestBadge();
  var awXPHint = document.getElementById('awXPHint');
  if (awXPHint) {
    if (state.level >= 777) {
      awXPHint.textContent = 'max level reached';
    } else {
      var awToNext = xpNeeded - xpThis;
      awXPHint.textContent = awToNext.toLocaleString() + ' xp to level ' + (state.level + 1);
    }
  }
  var drawerLevelEl = document.getElementById('drawerLevel');
  if (drawerLevelEl) {
    if (currentMode === 'concentration') {
      drawerLevelEl.textContent = 'Level ' + concState.level + ' · ' + getConcRank(concState.level);
    } else {
      drawerLevelEl.textContent = 'Level ' + state.level + ' · ' + getRankTitle(state.level);
    }
  }
  // Update home symbol if exists
  var homeSym = document.getElementById('homeSymbol');
  var homeSymFill = document.getElementById('homeSymbolFill');
  if (homeSym) {
    var hGroup = getSymbolGroup(state.level);
    var hColor = getTierColor(state.level);
    var hFill = getSymbolLevelRoman(state.level);
    homeSym.innerHTML = renderSymbolSVG(hGroup.id, hColor, 36);
    if (homeSymFill) homeSymFill.textContent = hFill;
  }
  document.getElementById('streakCount').textContent = state.streak;
  var xpStatEl = document.getElementById('statXP');
  if (xpStatEl) {
    xpStatEl.textContent = state.xp.toLocaleString();
    var totalHours = (state.xp / 60).toFixed(1);
    xpStatEl.title = totalHours + ' hrs practiced · ' + (10000 - parseFloat(totalHours)).toFixed(1) + ' hrs to rank 777';
  }
  var nextDurEl = document.getElementById('nextDuration');
  var nextIntEl = document.getElementById('nextInterval');
  if (nextDurEl) nextDurEl.textContent = fmtDuration(params.durationMin);
  if (nextIntEl) nextIntEl.textContent = fmtInterval(params.intervalSec);
  // Show/hide the active session banner
  var banner = document.getElementById('activeSessionBanner');
  if (banner) banner.style.display = sessionStartTime ? 'flex' : 'none';
  // Reflect any session running on another signed-in device
  refreshRemoteSessionBanner();

  // ── Idle game UI ──
  // Residue glow on ring
  var ringBtn = document.getElementById('awarenessRingBtn');
  var pendingResidue = calcResidueAccrued();
  if (pendingResidue > 0 && ringBtn) {
    ringBtn.classList.add('residue-glow');
    ringBtn.title = 'Collect ' + pendingResidue + ' XP';
  } else if (ringBtn) {
    ringBtn.classList.remove('residue-glow');
    ringBtn.title = 'Tap for rank details';
  }

  // Momentum bar (show if streak >= 3 or depth >= 8)
  var momentumBar = document.getElementById('momentumBar');
  var momentumFill = document.getElementById('momentumFill');
  if (momentumBar && momentumFill) {
    var mom = calcMomentum(state.streak);
    var showMom = state.streak >= 3 || (state.depth || 1) >= 8;
    momentumBar.style.display = showMom ? 'block' : 'none';
    var pct = Math.round(((mom - 0.7) / 0.8) * 100);
    momentumFill.style.width = pct + '%';
    momentumBar.title = 'Momentum ' + mom.toFixed(2) + '× · ' + state.streak + '-day streak';
  }

  // Next Best Action bar
  var nbaBar = document.getElementById('nbaBar');
  if (nbaBar) nbaBar.innerHTML = getNextBestAction();

  if (currentMode === 'guide' && typeof openGuide === 'function') {
    openGuide();
    refreshGuidePanelLayout(true);
  }
}

// ═══════════════════════════════════════
// SESSION
// ═══════════════════════════════════════

var sessionTimerHandle = null;
var customSessionParams = null; // set when user starts a custom session
var sessionReminderCount = 0;
var sessionRemindersBase = 0; // reminders banked before the current interval "epoch" (lets the interval change mid-session without losing the tally)
var sessionStartTime = null;
var reminderEpochStart = null; // anchor for reminder-cycle math; rebased when the interval changes mid-session (session duration accounting still uses sessionStartTime)
var sessionDurationSec = 0;
var sessionIntervalSec = 0;
var lastReminderCycle = -1;
var lastPavlokFiredCycle = -1;
var pavlokServerManaged = false;
var sessionEndedEarly = false;

function getSecondsRemaining() {
  if (!sessionStartTime) return 0;
  return Math.max(0, sessionDurationSec - Math.floor((Date.now() - sessionStartTime) / 1000));
}

function saveSessionState() {
  if (!sessionStartTime) return;
  try {
    localStorage.setItem('presence_session', JSON.stringify({
      startTime: sessionStartTime, durationSec: sessionDurationSec,
      intervalSec: sessionIntervalSec, reminderCount: sessionReminderCount,
      remindersBase: sessionRemindersBase, reminderEpochStart: reminderEpochStart
    }));
  } catch(e) {}
}

async function startSession() {
  // Hard cross-device lock: don't start if another device is mid-session.
  var _remote = remoteSessionActive();
  if (_remote) {
    showToast(remoteSessionLabel(_remote) + '. Finish it before starting another.', 4200);
    return;
  }
  var params = customSessionParams || currentParams();
  customSessionParams = null;
  localStorage.removeItem('presence_session');
  sessionStartTime = Date.now();
  reminderEpochStart = sessionStartTime;
  sessionDurationSec = params.durationMin * 60;
  sessionIntervalSec = params.intervalSec;
  sessionReminderCount = 0;
  sessionRemindersBase = 0;
  lastReminderCycle = -1;
  lastPavlokFiredCycle = -1;
  sessionEndedEarly = false;
  saveSessionState();
  startPresenceBeacon(currentMode === 'prayer' ? 'prayer' : 'awareness', '');

  // Show session screen immediately — don't block on push
  showScreen('sessionScreen');
  requestExerciseWakeLock();
  updateSessionPrompt(randomPrompt(''));
  document.getElementById('reminderCount').textContent = 0;
  initSessionPvkSlider();
  runLoop();

  // Tell server about the session (awaited so it happens before next tick)
  try { await notifyServerSessionStart(); } catch(e) { console.log('Server notify skipped:', e); }
}

async function resumeSession(sess) {
  sessionStartTime = sess.startTime;
  sessionDurationSec = sess.durationSec;
  sessionIntervalSec = sess.intervalSec;
  sessionReminderCount = sess.reminderCount || 0;
  sessionRemindersBase = sess.remindersBase || 0;
  reminderEpochStart = sess.reminderEpochStart || sess.startTime;
  var elapsed = Math.floor((Date.now() - reminderEpochStart) / 1000);
  lastReminderCycle = Math.floor(elapsed / sessionIntervalSec);
  lastPavlokFiredCycle = lastReminderCycle;
  sessionEndedEarly = false;

  // Server is the Pavlok authority when push is registered. Assume it's
  // managing (so the client stays suppressed during the uncertain window),
  // then confirm the real status with the server BEFORE the loop can fire —
  // guessing wrong here was a source of double/surprise zaps on reopen.
  var pvkR = getPavlokPrefs();
  pavlokServerManaged = !!(getPavlokToken() && pvkR.awareness.enabled);
  startPresenceBeacon(currentMode === 'prayer' ? 'prayer' : 'awareness', '');

  showScreen('sessionScreen');
  requestExerciseWakeLock();
  document.getElementById('reminderCount').textContent = sessionReminderCount;
  // Paint the live remaining time straight away so a slow/unreachable server
  // call can never leave a stale 30:00 frozen on screen.
  document.getElementById('sessionTimer').textContent = fmt(getSecondsRemaining());
  updateSessionPrompt(randomPrompt(''));
  initSessionPvkSlider();
  // Start the loop immediately. pavlokServerManaged is already true (optimistic),
  // so this won't client-fire Pavlok before the server confirms ownership.
  runLoop();
  // Confirm Pavlok ownership in the background — correcting pavlokServerManaged
  // afterwards doesn't disturb the already-running loop, and never blocks the
  // timer from rendering (the old awaited call here was the cause of the stuck
  // counter on reopen).
  if (pavlokServerManaged) { try { notifyServerPavlokUpdate().catch(function() {}); } catch(e) {} }
  showToast('Session resumed');
}

function runLoop() {
  clearTimeout(sessionTimerHandle);
  var remaining = getSecondsRemaining();
  // Reminder cadence is measured from the reminder epoch (rebased on interval
  // change), kept separate from sessionStartTime so duration/XP accounting and
  // the remaining countdown always reflect the true, full session.
  if (!reminderEpochStart) reminderEpochStart = sessionStartTime;
  var elapsed = Math.floor((Date.now() - reminderEpochStart) / 1000);
  var untilReminder = sessionIntervalSec - (elapsed % sessionIntervalSec);

  document.getElementById('sessionTimer').textContent = fmt(remaining);
  document.getElementById('nextNotifLabel').textContent = 'next reminder in ' + fmtInterval(untilReminder);
  var sivEl = document.getElementById('sessionIntervalVal');
  if (sivEl) sivEl.textContent = fmtInterval(sessionIntervalSec);
  // Derive count from epoch-elapsed time so it stays accurate when the app was
  // backgrounded, then add any reminders banked before the last interval change.
  var cyclesThisEpoch = elapsed >= sessionIntervalSec ? Math.floor(elapsed / sessionIntervalSec) : 0;
  sessionReminderCount = (sessionRemindersBase || 0) + cyclesThisEpoch;
  document.getElementById('reminderCount').textContent = sessionReminderCount;

  if (remaining <= 0) { endSession(); return; }

  var currentCycle = Math.floor(elapsed / sessionIntervalSec);

  // Re-show Pavlok block if it was hidden by a page reload/resume
  if (getPavlokToken()) {
    var pvkBlock = document.getElementById('sessionPvkRow');
    if (pvkBlock && pvkBlock.style.display === 'none') initSessionPvkSlider();
  }

  // Pre-fire Pavlok up to 2 s before the bell — wider window handles iOS timer throttling.
  // Use lastPavlokFiredCycle so we never fire twice for the same cycle.
  // Skip entirely when the server is firing Pavlok (avoids double-zaps).
  if (!pavlokServerManaged && untilReminder <= 2 && remaining > 2 && getPavlokToken()) {
    var nextCycle = currentCycle + 1;
    if (lastPavlokFiredCycle < nextCycle) {
      lastPavlokFiredCycle = nextCycle;
      var pvkPre = getPavlokPrefs();
      if (pvkPre.awareness.enabled) sendPavlokStimulus(pvkPre.awareness.type || 'vibe', pvkPre.awareness.intensity);
    }
  }

  if (currentCycle > lastReminderCycle && elapsed >= sessionIntervalSec) {
    // A bell is "on time" only when exactly one cycle has turned over and we're
    // still within a few seconds of its boundary. If the app was backgrounded
    // across one or more cycles (iOS throttles JS timers), this loop reconciles
    // them on return — that's a catch-up, not a live bell, and must NOT fire
    // Pavlok: the stimulus would land late, with no matching notification, as a
    // surprise shock on app-open.
    var sinceBoundary = elapsed % sessionIntervalSec;
    var onTime = (currentCycle - lastReminderCycle === 1) && sinceBoundary <= 3;
    lastReminderCycle = currentCycle;
    fireReminder(onTime);
  }

  saveSessionState();
  sessionTimerHandle = setTimeout(runLoop, 1000);
}

// Re-registering the session with the server is debounced so holding the
// interval buttons doesn't fire a request on every repeat.
var _intervalServerSyncTimer = null;
function scheduleServerIntervalSync() {
  clearTimeout(_intervalServerSyncTimer);
  _intervalServerSyncTimer = setTimeout(function() {
    if (sessionStartTime) notifyServerSessionStart();
  }, 700);
}

// Change the live reminder cadence mid-session. Rebases the schedule so the
// next bell lands a full (new) interval from now, preserves the remaining
// countdown and the running "reminders sent" tally, and reschedules the
// server's push reminders to match.
function changeSessionInterval(deltaSec) {
  if (!sessionStartTime) return;
  var newInterval = Math.min(600, Math.max(30, sessionIntervalSec + deltaSec));
  if (newInterval === sessionIntervalSec) return;
  if (!reminderEpochStart) reminderEpochStart = sessionStartTime;
  var epElapsed = Math.floor((Date.now() - reminderEpochStart) / 1000);
  // Bank reminders already sent in the current epoch before rebasing it.
  var cyclesThisEpoch = epElapsed >= sessionIntervalSec ? Math.floor(epElapsed / sessionIntervalSec) : 0;
  sessionRemindersBase = (sessionRemindersBase || 0) + cyclesThisEpoch;
  sessionIntervalSec = newInterval;
  // Rebase only the reminder schedule — the next bell is a full new interval
  // from now. sessionStartTime / sessionDurationSec stay put so the countdown
  // and end-of-session duration/XP are unaffected.
  reminderEpochStart = Date.now();
  lastReminderCycle = 0;
  lastPavlokFiredCycle = 0;
  saveSessionState();
  runLoop();
  if (navigator.vibrate) { try { navigator.vibrate(8); } catch(e) {} }
  scheduleServerIntervalSync();
}

function playReminderBell() {
  if (typeof appSoundEnabled === 'function' && !appSoundEnabled()) return;
  try {
    // Independent AudioContext so the bell never interrupts Concentration audio
    var ctx = new (window.AudioContext || window.webkitAudioContext)();
    var when = ctx.currentTime + 0.05;
    [[528, 0.28, 2.8], [1056, 0.14, 2.2], [1584, 0.08, 1.6]].forEach(function(f) {
      var osc = ctx.createOscillator(); osc.type = 'sine'; osc.frequency.value = f[0];
      var gain = ctx.createGain();
      gain.gain.setValueAtTime(f[1], when);
      gain.gain.exponentialRampToValueAtTime(0.001, when + f[2]);
      osc.connect(gain); gain.connect(ctx.destination);
      osc.start(when); osc.stop(when + f[2]);
    });
    setTimeout(function() { try { ctx.close(); } catch(e) {} }, 3500);
  } catch(e) {}
}

function fireReminder(onTime) {
  var p = randomPrompt(document.getElementById('sessionPrompt').textContent);
  updateSessionPrompt(p);
  playReminderBell();
  // Fallback: if the pre-fire window was skipped (iOS throttled timers while
  // briefly backgrounded), fire Pavlok now rather than silently missing it.
  // Only for an on-time bell — a catch-up after the app was backgrounded would
  // zap late, outside the notification, as a surprise shock. Also skip when the
  // server is managing Pavlok (avoids a double zap alongside the push).
  if (onTime && !pavlokServerManaged && getPavlokToken() && lastPavlokFiredCycle < lastReminderCycle) {
    lastPavlokFiredCycle = lastReminderCycle;
    var pvk = getPavlokPrefs();
    if (pvk.awareness.enabled) sendPavlokStimulus(pvk.awareness.type || 'vibe', pvk.awareness.intensity);
  }
}

function initSessionPvkSlider() {
  var block = document.getElementById('sessionPvkRow');
  var slider = document.getElementById('sessionPvkSlider');
  var valEl = document.getElementById('sessionPvkVal');
  var typesEl = document.getElementById('sessionPvkTypes');
  if (!block || !slider) return;
  if (!getPavlokToken()) { block.style.display = 'none'; return; }
  var p = getPavlokPrefs();
  var val = p.awareness.intensity || 50;
  var currentType = p.awareness.type || 'vibe';
  slider.value = val;
  slider.style.setProperty('--pct', val + '%');
  valEl.textContent = val;
  typesEl.innerHTML = [['vibe','Vibrate'],['beep','Beep'],['zap','⚡ Zap']].map(function(t) {
    return '<button class="session-pvk-type' + (currentType === t[0] ? ' sel' : '') + '" onclick="sessionPvkSetType(\'' + t[0] + '\')">' + t[1] + '</button>';
  }).join('');
  block.style.display = 'block';
}

function sessionPvkSetType(type) {
  var p = getPavlokPrefs();
  p.awareness.type = type;
  savePavlokPrefs(p);
  var btns = document.querySelectorAll('.session-pvk-type');
  var types = ['vibe','beep','zap'];
  btns.forEach(function(btn, i) {
    btn.classList.toggle('sel', types[i] === type);
  });
  notifyServerPavlokUpdate();
}

var sessionPvkUpdateTimer = null;
function sessionPvkInput(el) {
  var val = +el.value;
  el.style.setProperty('--pct', val + '%');
  var valEl = document.getElementById('sessionPvkVal');
  if (valEl) valEl.textContent = val;
  var p = getPavlokPrefs();
  p.awareness.intensity = val;
  savePavlokPrefs(p);
  // Debounce server update so dragging doesn't spam the endpoint
  clearTimeout(sessionPvkUpdateTimer);
  sessionPvkUpdateTimer = setTimeout(notifyServerPavlokUpdate, 400);
}

function updateSessionPrompt(text) {
  var el = document.getElementById('sessionPrompt');
  el.classList.add('fade');
  setTimeout(function() { el.textContent = text; el.classList.remove('fade'); }, 400);
}

// Lets the player check Guide or Prayer while an Awareness session keeps
// running in the background. The Return banner brings them back to the
// session screen; switchMode() handles all the panel/tab bookkeeping.
function openModeDuringSession(mode) {
  showScreen('homeScreen');
  switchMode(mode);
  var returnBanner = document.getElementById('sessionReturnBanner');
  if (returnBanner) returnBanner.style.display = 'block';
}

function returnToSessionFromPrayer() {
  var returnBanner = document.getElementById('sessionReturnBanner');
  if (returnBanner) returnBanner.style.display = 'none';
  showScreen('sessionScreen');
}

function endSession() {
  if (!sessionStartTime) return; // Guard against double-call
  releaseExerciseWakeLock();
  clearTimeout(sessionTimerHandle);
  localStorage.removeItem('presence_session');
  notifyServerSessionEnd();
  clearPresenceBeacon();
  var actualDuration = Math.max(1, Math.round((Date.now() - sessionStartTime) / 60000));
  var targetDuration = Math.round(sessionDurationSec / 60);
  // Clamp to a sane maximum (target duration + 5 min buffer)
  actualDuration = Math.min(actualDuration, targetDuration + 5);
  sessionEndedEarly = actualDuration < targetDuration;
  sessionStartTime = null;
  reminderEpochStart = null;
  sessionDurationSec = 0;
  showSurvey(actualDuration);
}

// ═══════════════════════════════════════
// SURVEY
// ═══════════════════════════════════════

var surveyAnswers = {};
var surveyDurationMin = 0;

function showSurvey(durationMin) {
  surveyDurationMin = durationMin;
  surveyAnswers = {};
  document.getElementById('surveyDuration').textContent = durationMin + ' min completed';
  document.getElementById('adaptCardWrap').innerHTML = '';
  document.getElementById('surveyNotes').value = '';
  var submitBtn = document.getElementById('submitSurveyBtn');
  submitBtn.textContent = 'Save & Adapt';
  submitBtn.onclick = submitSurvey;

  var wrap = document.getElementById('surveyQuestions');
  wrap.innerHTML = '';
  QUESTIONS.forEach(function(q) {
    var block = document.createElement('div');
    block.innerHTML = '<div class="q-text">' + q.text + '</div>'
      + '<div class="q-scale">'
      + [1,2,3,4,5].map(function(n) { return '<button class="q-scale-btn" data-q="' + q.id + '" data-v="' + n + '">' + n + '</button>'; }).join('')
      + '</div>'
      + '<div class="q-scale-labels"><span class="q-scale-label">' + q.low + '</span><span class="q-scale-label">' + q.high + '</span></div>';
    wrap.appendChild(block);
  });

  wrap.querySelectorAll('.q-scale-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      var qid = btn.dataset.q, v = parseInt(btn.dataset.v);
      surveyAnswers[qid] = v;
      document.querySelectorAll('.q-scale-btn[data-q="' + qid + '"]').forEach(function(b) { b.classList.remove('selected'); });
      btn.classList.add('selected');
    });
  });

  showScreen('surveyScreen');
}

function submitSurvey() {
  if (Object.keys(surveyAnswers).length < QUESTIONS.length) {
    showToast('Answer all questions first'); return;
  }
  sessionStorage.removeItem('_sessionJustEnded');

  var driftScore = 6 - surveyAnswers.drift;
  var returnScore = 6 - surveyAnswers['return'];
  var redundantScore = 6 - surveyAnswers.redundant;
  var composite = (driftScore + returnScore + redundantScore) / 3;

  // Nudge interval based on how necessary the reminders felt
  // redundant score: 1=already present (ease off), 5=very necessary (remind more)
  var redundantRaw = surveyAnswers.redundant; // 1–5
  var nudge = 0;
  if (redundantRaw <= 2) nudge = +5;   // reminders felt redundant → increase interval
  if (redundantRaw >= 4) nudge = -5;   // reminders felt necessary → decrease interval
  state.intervalOffset = Math.max(-120, Math.min(120, (state.intervalOffset || 0) + nudge));

  // Clarity = minutes practiced, multiplied by chain + momentum bonuses
  var params = currentParams();
  var rawMinutes = Math.min(480, Math.round(surveyDurationMin));

  // Score reduction for early exits (proportional)
  var completionRatio = surveyDurationMin / (params.durationMin);
  var finalScore = composite;
  if (sessionEndedEarly) {
    finalScore = composite * Math.max(0.3, completionRatio);
  }

  state.weeklyScores.push({ date: new Date().toISOString(), score: finalScore, endedEarly: sessionEndedEarly });
  state.totalSessions++;

  // Streak (must be updated before awardSessionClarity so momentum uses fresh streak)
  var today = new Date().toDateString();
  if (state.lastSessionDate !== today) {
    var yesterday = new Date(Date.now() - 86400000).toDateString();
    state.streak = state.lastSessionDate === yesterday ? state.streak + 1 : 1;
    state.lastSessionDate = today;
  }

  // Award Clarity with idle game multipliers
  var clarityResult = awardSessionClarity(rawMinutes);
  var xpEarned = clarityResult.finalXP;

  // Level up (legacy rank system still uses cumulative XP)
  var didLevelUp = awardLevelUps(state, sumXpToLevel, xpForLevel);

  // Adapt
  var adaptation = adapt(finalScore, sessionEndedEarly);

  // Save notes
  var notes = document.getElementById('surveyNotes').value.trim();

  // History
  state.history.unshift({
    date: new Date().toISOString(), durationMin: surveyDurationMin,
    targetMin: params.durationMin, score: finalScore.toFixed(1),
    answers: { drift: surveyAnswers.drift, 'return': surveyAnswers['return'], redundant: surveyAnswers.redundant },
    intervalSec: params.intervalSec, endedEarly: sessionEndedEarly,
    xpEarned: xpEarned, notes: notes || '',
  });
  if (state.history.length > 100) state.history.length = 100;
  saveState();
  if (typeof achOnAwarenessSession === 'function') achOnAwarenessSession(surveyDurationMin);
  if (typeof evaluateGiftPath === 'function') { evaluateGiftPath(); updateGiftPathButton(); }

  // Credit awareness quest minutes (awareness sessions are the main meditation sessions)
  if (typeof pathQuestRecordAwarenessMinutes === 'function' && typeof guideState !== 'undefined') {
    pathQuestRecordAwarenessMinutes(surveyDurationMin);
  }

  // Push to cloud if logged in
  if (syncEnabled && authToken) syncPushData();

  // Show results
  var rankTitle = getRankTitle(state.level);
  var newParams = currentParams();
  var offsetStr = state.intervalOffset === 0 ? 'baseline'
    : (state.intervalOffset > 0 ? '+' + state.intervalOffset + 's' : state.intervalOffset + 's');
  var nudgeMsg = nudge > 0 ? '↑ Interval nudged up 5s — reminders felt redundant.'
    : nudge < 0 ? '↓ Interval nudged down 5s — reminders felt necessary.'
    : 'Interval unchanged.';
  var div = document.getElementById('adaptCardWrap');
  div.innerHTML = '<div class="adapt-card">'
    + '<div class="adapt-title">session results</div>'
    + '<div class="adapt-text">+' + xpEarned + ' XP earned · ' + surveyDurationMin + ' min practiced'
    + (clarityResult.chainMult > 1 ? ' · <span style="color:#d4b08e;">chain ×' + clarityResult.chainMult.toFixed(2) + '</span>' : '')
    + (clarityResult.momentumMult > 1 ? ' · <span style="color:var(--accent);">momentum ×' + clarityResult.momentumMult.toFixed(2) + '</span>' : '')
    + '</div>'
    + '<div class="adapt-text" style="margin-top:8px">Rank ' + state.level + ': ' + rankTitle + '</div>'
    + '<div class="adapt-text" style="margin-top:8px; color:var(--accent);">' + nudgeMsg + '</div>'
    + '<div class="adapt-text" style="margin-top:4px; opacity:.6;">Next interval: ' + fmtInterval(newParams.intervalSec) + ' (' + offsetStr + ' from base)</div>'
    + '<div class="adapt-text" style="margin-top:12px">' + adaptation.message + '</div>'
    + '</div>';

  var submitBtn = document.getElementById('submitSurveyBtn');
  submitBtn.textContent = 'Done';
  submitBtn.onclick = function() {
    // Hide the "return to session" banner left over from Guide/Prayer-during-session
    var returnBanner = document.getElementById('sessionReturnBanner');
    if (returnBanner) returnBanner.style.display = 'none';
    renderHome(); showScreen('homeScreen');
  };

  // Show level up overlay if leveled up
  if (didLevelUp) {
    setTimeout(function() { showLevelUp(state.level); }, 600);
  }
}

function adapt(score, endedEarly) {
  var message = '';

  if (endedEarly) {
    message = 'You ended early. Every minute still counts — keep showing up.';
    return { message: message };
  }

  var weekly = state.weeklyScores.slice(-7);
  var weeklyAvg = weekly.length ? weekly.reduce(function(a, b) { return a + b.score; }, 0) / weekly.length : score;
  var isWeeklyCheck = weekly.length >= 7 && weekly.length % 7 === 0;

  if (isWeeklyCheck) {
    if (weeklyAvg >= 4.2) {
      message = 'Strong week. Your awareness is deepening — next level milestone will bring new parameters.';
    } else if (weeklyAvg >= 3.0) {
      message = 'Solid consistency. The practice is taking root.';
    } else {
      message = 'Challenging week. Stay with it — difficulty is part of the process.';
    }
  } else {
    if (score >= 4.5) {
      message = 'Excellent session. Presence came naturally today.';
    } else if (score >= 3.5) {
      message = 'Good session. Consistency builds the practice.';
    } else if (score >= 2.5) {
      message = 'Awareness was scattered. That awareness of scattering is itself progress.';
    } else {
      message = 'Difficult session. Showing up is what matters most.';
    }
  }

  return { message: message };
}

// ═══════════════════════════════════════
// LEVEL UP
// ═══════════════════════════════════════

function showLevelUp(level) {
  var overlay = document.getElementById('levelupOverlay');
  var bg = document.getElementById('levelupBg');
  var particles = document.getElementById('levelupParticles');
  var color = getTierColor(level);
  var tierName = getTierName(level);
  var title = getRankTitle(level);

  var group = getSymbolGroup(level);
  var fillRoman = getSymbolLevelRoman(level);
  document.getElementById('levelupNum').textContent = level;
  document.getElementById('levelupTitle').textContent = title;
  document.getElementById('levelupTier').textContent = tierName + ' · ' + group.name;
  document.getElementById('levelupFill').textContent = fillRoman;
  document.getElementById('levelupSymbol').innerHTML = renderSymbolSVG(group.id, color, 80);
  document.getElementById('levelupNum').style.color = color;
  document.getElementById('levelupTitle').style.color = color;
  document.getElementById('levelupTier').style.color = color;
  document.getElementById('levelupFill').style.color = color;
  document.getElementById('levelupContinue').style.borderColor = color + '44';
  document.getElementById('levelupContinue').style.color = color;

  // Background gradient
  bg.style.background = 'radial-gradient(ellipse 80% 60% at 50% 40%, ' + color + '18 0%, #07080d 70%)';

  // Spawn particles
  particles.innerHTML = '';
  for (var i = 0; i < 18; i++) {
    var p = document.createElement('div');
    p.className = 'particle';
    var size = Math.random() * 6 + 3;
    p.style.cssText = 'width:' + size + 'px;height:' + size + 'px;'
      + 'left:' + (Math.random() * 100) + '%;'
      + 'top:' + (40 + Math.random() * 40) + '%;'
      + 'background:' + color + ';'
      + 'animation-delay:' + (Math.random() * 1.2) + 's;'
      + 'animation-duration:' + (1.5 + Math.random()) + 's;';
    particles.appendChild(p);
  }

  // 🐯 Tiger easter egg — appears silently at every 108th level
  var levelupTiger = document.getElementById('levelupTiger');
  if (levelupTiger) levelupTiger.style.display = TIGER_LEVELS.indexOf(level) !== -1 ? 'block' : 'none';

  overlay.classList.add('show');
}

document.getElementById('levelupContinue').addEventListener('click', function() {
  document.getElementById('levelupOverlay').classList.remove('show');
});

// ═══════════════════════════════════════
// HISTORY
// ═══════════════════════════════════════

function deleteSession(index, _c) {
  var h = state.history[index];
  if (!h) return;
  var xpLost = h.xpEarned || 0;
  var newXP = Math.max(0, state.xp - xpLost);
  // Recalculate level from new XP
  var newLevel = 1;
  while (newLevel < 777) {
    if (newXP >= sumXpToLevel(newLevel + 1)) { newLevel++; } else { break; }
  }
  var rankWillDrop = newLevel < state.level;
  var msg = 'Delete this session?\n\n'
    + 'This will remove ' + xpLost + ' XP from your total.';
  if (rankWillDrop) {
    msg += '\n\nWarning: your rank will drop from '
      + getRankTitle(state.level) + ' (level ' + state.level + ') to '
      + getRankTitle(newLevel) + ' (level ' + newLevel + ').';
  }
  if (!_c) { showConfirm('Delete Session', msg.replace('Delete this session?\n\n',''), function(){ deleteSession(index, true); }); return; }
  // Apply deletion
  state.history.splice(index, 1);
  state.xp = newXP;
  state.level = newLevel;
  saveState();
  if (syncEnabled && authToken) syncPushData();
  renderHistory();
  renderHome();
  showToast('Session deleted');
}

// Returns "Today", "Yesterday", or "Mon, May 12" for a given Date object
function dateGroupLabel(d) {
  var today = new Date(); today.setHours(0,0,0,0);
  var yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
  var check = new Date(d); check.setHours(0,0,0,0);
  if (check.getTime() === today.getTime()) return 'Today';
  if (check.getTime() === yesterday.getTime()) return 'Yesterday';
  return d.toLocaleDateString('en-US', { weekday:'short', month:'short', day:'numeric' });
}

function renderHistory() {
  var list = document.getElementById('historyList');
  if (!state.history.length) {
    list.innerHTML = '<div class="history-empty">No sessions yet.<br>Begin your practice.</div>';
    return;
  }

  // Group by calendar date
  var groups = []; // [{label, entries:[{h,idx}]}]
  var groupMap = {};
  state.history.forEach(function(h, idx) {
    var d = new Date(h.date);
    var key = new Date(d); key.setHours(0,0,0,0);
    var keyStr = key.getTime().toString();
    if (!groupMap[keyStr]) {
      var g = { label: dateGroupLabel(d), entries: [] };
      groups.push(g);
      groupMap[keyStr] = g;
    }
    groupMap[keyStr].entries.push({ h: h, idx: idx });
  });

  list.innerHTML = groups.map(function(group) {
    var itemsHtml = group.entries.map(function(e) {
      var h = e.h; var idx = e.idx;
      var d = new Date(h.date);
      var timeStr = d.toLocaleTimeString('en-US', { hour:'numeric', minute:'2-digit' });
      var durStr = h.durationMin + ' min' + (h.targetMin && h.targetMin !== h.durationMin ? ' (target: ' + h.targetMin + ')' : '');
      var earlyStr = h.endedEarly ? ' · early' : '';
      var xpStr = h.xpEarned ? '+' + h.xpEarned + 'xp' : '';
      var notesHtml = h.notes ? '<div class="history-notes">' + escHtml(h.notes) + '</div>' : '';
      return '<div class="history-item">'
        + '<button class="history-delete-btn" onclick="deleteSession(' + idx + ')">✕</button>'
        + '<div class="history-item-top">'
        + '<span class="history-date">' + timeStr + '</span>'
        + '<span class="history-duration">' + durStr + ' · ' + fmtInterval(h.intervalSec) + earlyStr + '</span>'
        + '</div>'
        + '<div class="history-scores">'
        + '<span class="history-score">score <span>' + h.score + '/5</span></span>'
        + '<span class="history-score">drift <span>' + h.answers.drift + '</span></span>'
        + '<span class="history-score">return <span>' + h.answers["return"] + '</span></span>'
        + '<span class="history-score">needed <span>' + h.answers.redundant + '</span></span>'
        + (xpStr ? '<span class="history-score" style="color:var(--accent)">' + xpStr + '</span>' : '')
        + '</div>'
        + notesHtml
        + '</div>';
    }).join('');
    return '<div class="history-date-group">' + group.label + '</div>' + itemsHtml;
  }).join('');
}
