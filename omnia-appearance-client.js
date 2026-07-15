function omniaFindCosmetic(list, id) {
  return list.find(function(item) { return item.id === id; }) || list[0];
}

function omniaCosmeticUnlocked(kind, id) {
  var c = omniaState.cosmetics || cloneOmniaDefault().cosmetics;
  if (kind === 'palette') return (c.unlockedPalettes || []).indexOf(id) !== -1;
  if (kind === 'entity') return (c.unlockedEntities || []).indexOf(id) !== -1;
  if (kind === 'companion') return (c.unlockedCompanions || []).indexOf(id) !== -1;
  if (kind === 'veil') return (c.unlockedVeils || []).indexOf(id) !== -1;
  return false;
}

function omniaCosmeticSelected(kind, id) {
  var c = omniaState.cosmetics || {};
  if (kind === 'palette') return c.palette === id;
  if (kind === 'entity') return c.entity === id;
  if (kind === 'companion') return c.companion === id;
  if (kind === 'veil') return c.veil === id;
  return false;
}

function omniaUnlockList(kind) {
  if (!omniaState.cosmetics) omniaState.cosmetics = cloneOmniaDefault().cosmetics;
  if (kind === 'palette') return omniaState.cosmetics.unlockedPalettes;
  if (kind === 'entity') return omniaState.cosmetics.unlockedEntities;
  if (kind === 'veil') return omniaState.cosmetics.unlockedVeils;
  return omniaState.cosmetics.unlockedCompanions;
}

function renderOmniaEntityPreview(item) {
  var color = item.color || '#b8eaff';
  if (item.id === 'noema') {
    return '<svg viewBox="0 0 48 58" aria-hidden="true">'
      + '<polygon points="24,4 38,18 38,40 24,54 10,40 10,18" fill="rgba(255,255,255,.04)" stroke="' + color + '" stroke-width="1.2" opacity=".6"/>'
      + '<line x1="10" y1="18" x2="38" y2="40" stroke="' + color + '" stroke-width=".7" opacity=".3"/>'
      + '<line x1="38" y1="18" x2="10" y2="40" stroke="' + color + '" stroke-width=".7" opacity=".3"/>'
      + '<polygon points="24,16 32,29 24,42 16,29" fill="' + color + '" opacity=".12" stroke="' + color + '" stroke-width="1.1"/>'
      + '<path d="M17,29 Q24,22 31,29 Q24,36 17,29 Z" fill="rgba(255,255,255,.07)" stroke="' + color + '" stroke-width=".85" opacity=".85"/>'
      + '<circle cx="24" cy="29" r="3.8" fill="rgba(0,0,0,.18)" stroke="' + color + '" stroke-width=".8"/>'
      + '<circle cx="24" cy="29" r="1.6" fill="' + color + '" opacity=".9"/>'
      + '<circle cx="25.2" cy="28" r=".75" fill="rgba(255,255,255,.6)"/>'
      + '</svg>';
  }
  if (item.id === 'aurel') {
    return '<svg viewBox="0 0 56 56" aria-hidden="true">'
      + '<polygon points="28,4 46,34 10,34" fill="rgba(240,211,154,0.06)" stroke="' + color + '" stroke-width="1.3" opacity=".75"/>'
      + '<polygon points="28,52 10,22 46,22" fill="rgba(240,211,154,0.06)" stroke="' + color + '" stroke-width="1.3" opacity=".75"/>'
      + '<circle cx="28" cy="29" r="9" fill="rgba(240,211,154,0.12)" stroke="' + color + '" stroke-width="1.1" opacity=".9"/>'
      + '<circle cx="28" cy="29" r="5.5" stroke="' + color + '" stroke-width=".9" fill="none" opacity=".72"/>'
      + '<circle cx="28" cy="29" r="2.5" fill="' + color + '" opacity=".7"/>'
      + '<circle cx="28" cy="29" r=".9" fill="#fffce8" opacity=".95"/>'
      + '</svg>';
  }
  if (item.id === 'elys') {
    // Archangel Michael at icon scale: halo, wings, robe, spear, orb, mound
    return '<svg viewBox="0 0 56 58" aria-hidden="true" style="overflow:visible;">'
      + '<defs>'
      + '<linearGradient id="amBlade" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#ffffff"/><stop offset="42%" stop-color="#e8d4f0"/><stop offset="100%" stop-color="#9b7fb8"/></linearGradient>'
      + '<linearGradient id="amShaft" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#d4bce4"/><stop offset="100%" stop-color="#5a4670"/></linearGradient>'
      + '<radialGradient id="amCore" cx="50%" cy="50%" r="50%"><stop offset="0%" stop-color="#ffffff" stop-opacity=".98"/><stop offset="55%" stop-color="#e8d4f0" stop-opacity=".6"/><stop offset="100%" stop-color="#c4a8d4" stop-opacity="0"/></radialGradient>'
      + '</defs>'
      + '<path d="M24,15 C18,8 10,9 7,13 C10,16 10,22 9.5,28 C9,36 8,42 7.5,48 C13,43 17,35 19,27 C20.5,21 22,17 24,16 Z" fill="#9b7fb8" opacity=".5" stroke="#9b7fb8" stroke-width=".6" stroke-linejoin="round"/>'
      + '<path d="M32,15 C38,8 46,9 49,13 C46,16 46,22 46.5,28 C47,36 48,42 48.5,48 C43,43 39,35 37,27 C35.5,21 34,17 32,16 Z" fill="#9b7fb8" opacity=".5" stroke="#9b7fb8" stroke-width=".6" stroke-linejoin="round"/>'
      + '<path d="M10,30 C13,27 15,23 17,18 M11,40 C14,36 16,31 18,25 M46,30 C43,27 41,23 39,18 M45,40 C42,36 40,31 38,25" fill="none" stroke="#bcaae0" stroke-width=".45" opacity=".6"/>'
      + '<circle cx="28" cy="11.5" r="5.4" fill="none" stroke="#e8d4f0" stroke-width=".6" opacity=".75"/>'
      + '<circle cx="28" cy="12" r="3.2" fill="#e8d0e0" opacity=".9"/>'
      + '<path d="M25.2,11.2 C25.2,9 26.7,8 28,8 C29.3,8 30.8,9 30.8,11.2 C29.9,10.4 29,10.2 28,10.2 C27,10.2 26.1,10.4 25.2,11.2 Z" fill="#6a5480" opacity=".9"/>'
      + '<path d="M24,17 C22.8,26 22.3,38 21.8,50 L34.2,50 C33.7,38 33.2,26 32,17 C30,15.8 26,15.8 24,17 Z" fill="#d4a8c0" opacity=".78" stroke="#c4a8d4" stroke-width=".7"/>'
      + '<path d="M26.4,38 C26.2,42 26,46 25.8,50 L30.2,50 C30,46 29.8,42 29.6,38 Q28,37 26.4,38 Z" fill="#9b86c4" opacity=".45"/>'
      + '<path d="M24.2,21.5 L31.8,19.8 L31.8,21.8 L24.2,23.5 Z" fill="#9b86c4" opacity=".55"/>'
      + '<line x1="20.5" y1="9" x2="20" y2="50" stroke="#3a2e4e" stroke-width="1.3" stroke-linecap="round" opacity=".85"/>'
      + '<line x1="20.5" y1="9" x2="20" y2="50" stroke="url(#amShaft)" stroke-width=".8" stroke-linecap="round"/>'
      + '<line x1="20.3" y1="9.5" x2="19.8" y2="49" stroke="#f4ecfa" stroke-width=".2" opacity=".5"/>'
      + '<path d="M17.6,9 Q20.5,7.3 23.4,9" fill="none" stroke="#e8d4f0" stroke-width=".7" stroke-linecap="round" opacity=".9"/>'
      + '<circle cx="20.5" cy="9" r="1.2" fill="url(#amCore)"/>'
      + '<polygon points="20.5,2.5 18.7,6 20.5,9 22.3,6" fill="url(#amBlade)" stroke="#f4ecfa" stroke-width=".3" stroke-linejoin="round"/>'
      + '<line x1="20.5" y1="3.2" x2="20.5" y2="8.2" stroke="#ffffff" stroke-width=".35" opacity=".85"/>'
      + '<circle cx="36.5" cy="31" r="3.6" fill="rgba(244,236,250,.16)" stroke="#f4ecfa" stroke-width=".6"/>'
      + '<path d="M36.5,29.2 V32.8 M34.7,31 H38.3" stroke="#e8d4f0" stroke-width=".4" opacity=".9"/>'
      + '<path d="M20,52.5 A8,3.4 0 0 1 36,52.5 L36,54 A8,2.6 0 0 1 20,54 Z" fill="rgba(232,212,240,.12)" stroke="#c4a8d4" stroke-width=".45" opacity=".8"/>'
      + '</svg>';
  }
  if (item.id === 'seraph') {
    return getEntityCrystalSVG('seraph');
  }
  return '<svg viewBox="0 0 48 58" aria-hidden="true">'
    + '<path d="M24 4 36 20 30 52H18L12 20Z" fill="rgba(255,255,255,.05)" stroke="' + color + '" stroke-width="1.4"/>'
    + '<path d="M24 5v47M13 20h22M18 52l6-32 6 32" fill="none" stroke="' + color + '" stroke-width=".85" opacity=".55"/>'
    + '<path d="M24 12 30 22 24 32 18 22Z" fill="' + color + '" opacity=".28"/>'
    + '</svg>';
}

function renderOmniaCompanionPreview(item) {
  var color = item.color || '#b8eaff';
  if (item.id === 'wisp') {
    // The Akashic Wisp: a luminous spirit-orb wrapped in a soft aura, trailing
    // twin ribbon tails, with a bright core, gentle eyes and a small smile, and
    // orbiting star-motes. Loops the air every so often; spins when tapped.
    return '<svg viewBox="0 0 46 46" aria-hidden="true">'
      // soft outer aura
      + '<circle cx="23" cy="19" r="14" fill="' + color + '" opacity=".10"/>'
      + '<circle cx="23" cy="19" r="10.5" fill="' + color + '" opacity=".12"/>'
      // flowing twin ribbon tails curling away below
      + '<path d="M22 27 C17 32 13 33 7 40 C14 38 18 35 22 31 Z" fill="' + color + '" opacity=".22"/>'
      + '<path d="M25 27 C25 33 23 37 24 43 C28 38 29 33 28 28 Z" fill="' + color + '" opacity=".15"/>'
      + '<path d="M22 28 C17 32 13 34 10 39" fill="none" stroke="' + color + '" stroke-width="1" stroke-linecap="round" opacity=".5"/>'
      // core orb: layered body, inner glow, crescent highlight
      + '<circle cx="23" cy="19" r="9.4" fill="' + color + '" opacity=".26"/>'
      + '<circle cx="23" cy="19" r="6.6" fill="' + color + '" opacity=".5" stroke="' + color + '" stroke-width="1.1" stroke-opacity=".88"/>'
      + '<circle cx="23" cy="19" r="3.1" fill="#fff" opacity=".16"/>'
      + '<circle cx="20.5" cy="16.1" r="1.9" fill="#fff" opacity=".72"/>'
      // gentle face
      + '<ellipse cx="20.8" cy="20" rx="1" ry="1.5" fill="#1c3344" opacity=".88"/>'
      + '<ellipse cx="25.2" cy="20" rx="1" ry="1.5" fill="#1c3344" opacity=".88"/>'
      + '<circle cx="21.1" cy="19.4" r=".34" fill="#fff"/><circle cx="25.5" cy="19.4" r=".34" fill="#fff"/>'
      + '<path d="M21.4 23 Q23 24.5 24.6 23" fill="none" stroke="#1c3344" stroke-width=".75" stroke-linecap="round" opacity=".75"/>'
      // orbiting star-motes
      + '<g stroke="' + color + '" stroke-width="1" stroke-linecap="round" opacity=".9">'
      + '<path d="M34 8h4M36 6v4"/>'
      + '<path d="M33 27h3M34.5 25.5v3"/>'
      + '</g>'
      + '<circle cx="11.5" cy="11" r="1" fill="' + color + '" opacity=".75"/>'
      + '<circle cx="38" cy="18.5" r=".8" fill="' + color + '" opacity=".6"/>'
      + '</svg>';
  }
  if (item.id === 'ember') {
    // A calm little fire spirit: contented closed eyes on the inner flame,
    // spark motes that rise when it flares or is tapped.
    return '<svg viewBox="0 0 46 46" aria-hidden="true">'
      + '<path d="M23 5c4 7 10 11 10 21 0 8-5 14-10 14S13 34 13 26c0-6 3-10 7-14-1 6 2 9 5 11 3-5 1-10-2-18Z" fill="' + color + '" opacity=".38" stroke="' + color + '" stroke-width="1.2"/>'
      + '<path d="M23 23c3 4 5 7 5 10 0 4-2.5 6.5-5 6.5s-5-2.5-5-6.5c0-3 2-6 5-10Z" fill="#fff2cf" opacity=".6"/>'
      + '<path d="M19.4 32 q1.5-1.7 3 0 M23.6 32 q1.5-1.7 3 0" fill="none" stroke="#8a5a20" stroke-width=".85" stroke-linecap="round" opacity=".9"/>'
      + '<circle class="ember-spark" cx="15" cy="14" r="1.1" fill="#ffe9b0"/>'
      + '<circle class="ember-spark" style="animation-delay:.2s" cx="29" cy="10" r=".9" fill="#ffe9b0"/>'
      + '<circle class="ember-spark" style="animation-delay:.45s" cx="33" cy="19" r=".8" fill="#ffe9b0"/>'
      + '</svg>';
  }
  if (item.id === 'mote') {
    // The tiny watcher: a four-point star holding one attentive eye that
    // scans its surroundings and winks when tapped.
    return '<svg viewBox="0 0 46 46" aria-hidden="true">'
      + '<g class="mote-star">'
      + '<path d="M23 4l3.5 13L40 23l-13.5 6L23 42l-3.5-13L6 23l13.5-6Z" fill="' + color + '" opacity=".35" stroke="' + color + '" stroke-width="1"/>'
      + '</g>'
      + '<g class="mote-eye">'
      + '<path d="M16.5 23 Q23 17.5 29.5 23 Q23 28.5 16.5 23 Z" fill="#f6f0fa" stroke="#9b7fb8" stroke-width=".5"/>'
      + '<g class="mote-pupil">'
      + '<circle cx="23" cy="23" r="3" fill="#9b7fb8"/>'
      + '<circle cx="23" cy="23" r="1.5" fill="#1c1126"/>'
      + '<circle cx="23.8" cy="22.2" r=".6" fill="#fff" opacity=".95"/>'
      + '</g>'
      + '</g>'
      + '<circle cx="37" cy="10" r="1.2" fill="' + color + '" opacity=".8"/>'
      + '</svg>';
  }
  if (item.id === 'corgi') {
    // Warm solid corgi with a gem-polish finish: facet glints and a cool rim
    // light suggest crystal without going translucent/ghostly.
    return '<svg viewBox="0 0 58 46" aria-hidden="true">'
      // fluffy curled tail (wags via .corgi-tail CSS)
      + '<path class="corgi-tail" d="M10 28c-5 0-8-3-7-7 2 2 5 3 8 2 1 2 1 4-1 5Z" fill="#f0c08a" stroke="#c97f44" stroke-width=".9" stroke-linejoin="round"/>'
      // loaf body + white belly
      + '<ellipse cx="23" cy="33" rx="14" ry="8.5" fill="#e8a35c" stroke="#c97f44" stroke-width=".9"/>'
      + '<ellipse cx="25" cy="37" rx="9.5" ry="4.5" fill="#fff1d5"/>'
      // stubby front legs
      + '<rect x="14" y="39" width="4.2" height="6" rx="2.1" fill="#e8a35c"/>'
      + '<rect x="27" y="39" width="4.2" height="6" rx="2.1" fill="#e8a35c"/>'
      // big upright ears with pink inner
      + '<path d="M33 13 30 2l9 6Z" fill="#e8a35c" stroke="#c97f44" stroke-width=".9" stroke-linejoin="round"/>'
      + '<path d="M49 13l3-11-9 6Z" fill="#e8a35c" stroke="#c97f44" stroke-width=".9" stroke-linejoin="round"/>'
      + '<path d="M34.5 10.5 33 5.5l4.5 3Z" fill="#d97f6a"/>'
      + '<path d="M47.5 10.5l1.5-5-4.5 3Z" fill="#d97f6a"/>'
      // head with white blaze + muzzle
      + '<circle cx="41" cy="20" r="10.5" fill="#e8a35c" stroke="#c97f44" stroke-width=".9"/>'
      + '<path d="M41 11c1.8 3 1.8 6 .9 8.6h-1.8c-.9-2.6-.9-5.6.9-8.6Z" fill="#fff1d5" opacity=".95"/>'
      + '<ellipse cx="41" cy="25.5" rx="6.2" ry="4.6" fill="#fff1d5"/>'
      // eyes with glints
      + '<circle cx="36.8" cy="19" r="1.7" fill="#2a1c12"/><circle cx="45.2" cy="19" r="1.7" fill="#2a1c12"/>'
      + '<circle cx="37.3" cy="18.4" r=".55" fill="#fff"/><circle cx="45.7" cy="18.4" r=".55" fill="#fff"/>'
      // nose + smile
      + '<path d="M39.6 23h2.8l-1.4 1.6Z" fill="#2a1c12"/>'
      + '<path d="M41 24.6c-.8 1.4-2.2 1.8-3.4 1M41 24.6c.8 1.4 2.2 1.8 3.4 1" fill="none" stroke="#2a1c12" stroke-width=".9" stroke-linecap="round"/>'
      // gem polish: cool rim light down the back + facet glints
      + '<path d="M11 28c-1 3 0 6 2 8" fill="none" stroke="#b8eaff" stroke-width="1" stroke-linecap="round" opacity=".55"/>'
      + '<path d="M33 9c2-2 5-3 8-3" fill="none" stroke="#b8eaff" stroke-width="1" stroke-linecap="round" opacity=".5"/>'
      + '<path d="M15 28l3-1.6M19 31l2.6-1.4" stroke="#ffffff" stroke-width=".8" stroke-linecap="round" opacity=".5"/>'
      + '<path d="M46 14l2.4-1.2" stroke="#ffffff" stroke-width=".8" stroke-linecap="round" opacity=".55"/>'
      // astral sparkles
      + '<g stroke="#b8eaff" stroke-width="1" stroke-linecap="round" opacity=".9">'
      + '<path d="M7 12h5M9.5 9.5v5"/>'
      + '<path d="M52 33h4M54 31v4"/>'
      + '<path d="M50 6h3.6M51.8 4.2v3.6"/>'
      + '</g>'
      + '</svg>';
  }
  return '<svg viewBox="0 0 46 46" aria-hidden="true">'
    + '<path d="M26 8c8 3 12 10 10 17-2 8-10 13-19 10 5-2 8-6 8-11 0-6-4-10-9-12 3-4 6-5 10-4Z" fill="' + color + '" opacity=".36" stroke="' + color + '" stroke-width="1.1"/>'
    + '<circle cx="22" cy="23" r="7" fill="' + color + '" opacity=".35"/>'
    + '<circle cx="22" cy="23" r="2.6" fill="#fff" opacity=".54"/>'
    + '</svg>';
}

function renderOmniaCosmeticPreview(kind, item) {
  if (kind === 'entity') {
    return '<div class="omnia-cosmetic-preview" style="--swatch:' + item.color + ';">' + renderOmniaEntityPreview(item) + '</div>';
  }
  if (kind === 'companion') {
    return '<div class="omnia-cosmetic-preview" style="--swatch:' + item.color + ';">' + renderOmniaCompanionPreview(item) + '</div>';
  }
  return '<div class="omnia-cosmetic-preview" style="' + omniaSwatchStyle(item) + '"><div class="omnia-cosmetic-swatch" style="--swatch:' + item.color + ';"></div></div>';
}

function getEntityCrystalSVG(id) {
  if (id === 'noema') {
    return '<svg viewBox="0 0 80 130" width="72" height="118" xmlns="http://www.w3.org/2000/svg" style="overflow:visible;">'
      + '<defs>'
      + '<filter id="nglow" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="2" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>'
      + '</defs>'
      // Top hexagonal cap
      + '<polygon points="40,8 60,19 60,41 40,52 20,41 20,19" fill="rgba(152,180,204,0.07)" stroke="#98b4cc" stroke-width="0.85" opacity="0.65"/>'
      + '<line x1="20" y1="19" x2="60" y2="41" stroke="#98b4cc" stroke-width="0.5" opacity="0.28"/>'
      + '<line x1="60" y1="19" x2="20" y2="41" stroke="#98b4cc" stroke-width="0.5" opacity="0.28"/>'
      // Eye in top cap (center ~40,30)
      + '<path d="M32,30 Q40,24 48,30 Q40,36 32,30 Z" fill="rgba(152,180,204,0.1)" stroke="#98b4cc" stroke-width="0.75"/>'
      + '<circle cx="40" cy="30" r="3.5" fill="rgba(152,180,204,0.18)" stroke="#b8cce0" stroke-width="0.7"/>'
      + '<circle cx="40" cy="30" r="1.4" fill="#d4e8f8" opacity="0.88"/>'
      // Vertical side edges
      + '<line x1="20" y1="41" x2="20" y2="89" stroke="#98b4cc" stroke-width="0.8" opacity="0.5"/>'
      + '<line x1="60" y1="41" x2="60" y2="89" stroke="#98b4cc" stroke-width="0.8" opacity="0.5"/>'
      + '<line x1="20" y1="65" x2="60" y2="65" stroke="#98b4cc" stroke-width="0.6" opacity="0.28"/>'
      + '<line x1="40" y1="8" x2="40" y2="122" stroke="#98b4cc" stroke-width="0.5" opacity="0.22"/>'
      // Central diamond (the "mind" core)
      + '<polygon points="40,50 56,65 40,80 24,65" fill="rgba(152,180,204,0.15)" stroke="#b8cce0" stroke-width="1.2" filter="url(#nglow)" opacity="0.95"/>'
      + '<line x1="24" y1="65" x2="56" y2="65" stroke="#b8cce0" stroke-width="0.5" opacity="0.4"/>'
      + '<line x1="40" y1="50" x2="40" y2="80" stroke="#b8cce0" stroke-width="0.5" opacity="0.4"/>'
      // Eye in central diamond (center 40,65)
      + '<path d="M29,65 Q40,57 51,65 Q40,73 29,65 Z" fill="rgba(152,180,204,0.12)" stroke="#b8cce0" stroke-width="0.9"/>'
      + '<circle cx="40" cy="65" r="6" fill="rgba(130,170,210,0.2)" stroke="#a8c4e0" stroke-width="0.9"/>'
      + '<circle cx="40" cy="65" r="3" fill="rgba(80,130,180,0.45)"/>'
      + '<circle cx="43" cy="63" r="1.6" fill="rgba(255,255,255,0.55)"/>'
      // Bottom hexagonal cap
      + '<polygon points="40,122 60,111 60,89 40,78 20,89 20,111" fill="rgba(152,180,204,0.07)" stroke="#98b4cc" stroke-width="0.85" opacity="0.65"/>'
      + '<line x1="20" y1="89" x2="60" y2="111" stroke="#98b4cc" stroke-width="0.5" opacity="0.28"/>'
      + '<line x1="60" y1="89" x2="20" y2="111" stroke="#98b4cc" stroke-width="0.5" opacity="0.28"/>'
      // Eye in bottom cap (center ~40,100)
      + '<path d="M32,100 Q40,94 48,100 Q40,106 32,100 Z" fill="rgba(152,180,204,0.1)" stroke="#98b4cc" stroke-width="0.75"/>'
      + '<circle cx="40" cy="100" r="3.5" fill="rgba(152,180,204,0.18)" stroke="#b8cce0" stroke-width="0.7"/>'
      + '<circle cx="40" cy="100" r="1.4" fill="#d4e8f8" opacity="0.88"/>'
      // Sparkles
      + '<g opacity=".55" filter="url(#nglow)"><line x1="5" y1="52" x2="11" y2="52" stroke="#b8d0e4" stroke-width="1"/><line x1="8" y1="49" x2="8" y2="55" stroke="#b8d0e4" stroke-width="1"/></g>'
      + '<g opacity=".42"><line x1="69" y1="80" x2="75" y2="80" stroke="#b8d0e4" stroke-width="0.9"/><line x1="72" y1="77" x2="72" y2="83" stroke="#b8d0e4" stroke-width="0.9"/></g>'
      + '</svg>';
  }
  if (id === 'aurel') {
    return '<svg viewBox="0 0 80 130" width="72" height="118" xmlns="http://www.w3.org/2000/svg" style="overflow:visible;">'
      + '<defs>'
      + '<radialGradient id="ag1" cx="50%" cy="50%" r="50%"><stop offset="0%" stop-color="#fff8e0" stop-opacity="0.9"/><stop offset="100%" stop-color="#c09040" stop-opacity="0"/></radialGradient>'
      + '<filter id="aglow" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="2.5" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>'
      + '</defs>'
      // Upper triangle (pointing down — top point up, base mid)
      + '<polygon points="40,6 66,84 14,84" fill="rgba(240,211,154,0.06)" stroke="#f0d39a" stroke-width="0.9" opacity="0.7"/>'
      // Lower triangle (pointing up — bottom point down, base mid)
      + '<polygon points="40,124 14,46 66,46" fill="rgba(240,211,154,0.06)" stroke="#f0d39a" stroke-width="0.9" opacity="0.7"/>'
      // Center hexagon (star intersection zone)
      + '<polygon points="40,46 58,57 58,73 40,84 22,73 22,57" fill="rgba(240,211,154,0.1)" stroke="#e8c870" stroke-width="0.75" opacity="0.65"/>'
      // Spoke lines: triangle tips to center
      + '<line x1="40" y1="6" x2="40" y2="57" stroke="#f0d39a" stroke-width="0.55" opacity="0.38"/>'
      + '<line x1="40" y1="73" x2="40" y2="124" stroke="#f0d39a" stroke-width="0.55" opacity="0.38"/>'
      + '<line x1="14" y1="46" x2="28" y2="57" stroke="#f0d39a" stroke-width="0.55" opacity="0.32"/>'
      + '<line x1="66" y1="46" x2="52" y2="57" stroke="#f0d39a" stroke-width="0.55" opacity="0.32"/>'
      + '<line x1="14" y1="84" x2="28" y2="73" stroke="#f0d39a" stroke-width="0.55" opacity="0.32"/>'
      + '<line x1="66" y1="84" x2="52" y2="73" stroke="#f0d39a" stroke-width="0.55" opacity="0.32"/>'
      // Solar disk outer glow
      + '<circle cx="40" cy="65" r="18" fill="url(#ag1)" filter="url(#aglow)"/>'
      // Solar disk rings
      + '<circle cx="40" cy="65" r="14" fill="rgba(240,200,90,0.1)" stroke="#e8c060" stroke-width="1.1" opacity="0.75"/>'
      + '<circle cx="40" cy="65" r="9" fill="rgba(255,230,120,0.18)" stroke="#f0d39a" stroke-width="1" opacity="0.85"/>'
      + '<circle cx="40" cy="65" r="4.5" fill="rgba(255,248,200,0.55)" stroke="#fff5c0" stroke-width="0.8"/>'
      + '<circle cx="40" cy="65" r="1.8" fill="#fffce8" opacity="0.98"/>'
      // Sparkles
      + '<g opacity=".65" filter="url(#aglow)"><line x1="4" y1="65" x2="10" y2="65" stroke="#f0d39a" stroke-width="1.1"/><line x1="7" y1="62" x2="7" y2="68" stroke="#f0d39a" stroke-width="1.1"/></g>'
      + '<g opacity=".45"><line x1="70" y1="36" x2="76" y2="36" stroke="#e8c870" stroke-width="0.9"/><line x1="73" y1="33" x2="73" y2="39" stroke="#e8c870" stroke-width="0.9"/></g>'
      + '<g opacity=".38"><line x1="5" y1="94" x2="10" y2="94" stroke="#e8c870" stroke-width="0.8"/><line x1="7.5" y1="91.5" x2="7.5" y2="96.5" stroke="#e8c870" stroke-width="0.8"/></g>'
      + '</svg>';
  }
  if (id === 'elys') {
    // Archangel Michael, after the Byzantine icon: standing frontal figure —
    // haloed head, rose robe over a blue tunic, tall dark wings lined with
    // pale feather-rows, cross-tipped spear in the right hand, shining orb in
    // the left, on a small mound among starflowers. Idle motion via .am-*.
    return '<svg viewBox="0 0 80 130" width="72" height="118" xmlns="http://www.w3.org/2000/svg" style="overflow:visible;">'
      + '<defs>'
      + '<radialGradient id="amAura" cx="50%" cy="40%" r="55%"><stop offset="0%" stop-color="#f4ecfa" stop-opacity=".36"/><stop offset="55%" stop-color="#c4a8d4" stop-opacity=".12"/><stop offset="100%" stop-color="#9b7fb8" stop-opacity="0"/></radialGradient>'
      + '<radialGradient id="amHalo" cx="50%" cy="50%" r="50%"><stop offset="0%" stop-color="#f4ecfa" stop-opacity=".5"/><stop offset="70%" stop-color="#e8d4f0" stop-opacity=".18"/><stop offset="100%" stop-color="#c4a8d4" stop-opacity="0"/></radialGradient>'
      + '<linearGradient id="amWing" x1="1" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#9b7fb8" stop-opacity=".55"/><stop offset="100%" stop-color="#4a3a60" stop-opacity=".5"/></linearGradient>'
      + '<linearGradient id="amWingR" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#9b7fb8" stop-opacity=".55"/><stop offset="100%" stop-color="#4a3a60" stop-opacity=".5"/></linearGradient>'
      + '<linearGradient id="amRobe" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#d4a8c0" stop-opacity=".82"/><stop offset="100%" stop-color="#b08aa8" stop-opacity=".62"/></linearGradient>'
      + '<radialGradient id="amOrb" cx="42%" cy="38%" r="60%"><stop offset="0%" stop-color="#f4ecfa" stop-opacity=".5"/><stop offset="100%" stop-color="#c4a8d4" stop-opacity=".12"/></radialGradient>'
      + '<filter id="amGl" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="1.2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>'
      + '<filter id="amGlBig" x="-160%" y="-160%" width="420%" height="420%"><feGaussianBlur stdDeviation="2.2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>'
      + '<linearGradient id="amBlade" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#ffffff"/><stop offset="42%" stop-color="#e8d4f0"/><stop offset="100%" stop-color="#9b7fb8"/></linearGradient>'
      + '<linearGradient id="amShaft" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#d4bce4"/><stop offset="100%" stop-color="#5a4670"/></linearGradient>'
      + '<radialGradient id="amCore" cx="50%" cy="50%" r="50%"><stop offset="0%" stop-color="#ffffff" stop-opacity=".98"/><stop offset="55%" stop-color="#e8d4f0" stop-opacity=".6"/><stop offset="100%" stop-color="#c4a8d4" stop-opacity="0"/></radialGradient>'
      + '</defs>'
      + '<ellipse cx="40" cy="56" rx="36" ry="50" fill="url(#amAura)" opacity=".55"/>'
      // wings: tall icon wings, dark with pale-blue inner feather rows
      + '<g class="am-wing-l">'
      + '<path d="M34,30 C24,16 12,18 8,26 C12,30 13,38 12,48 C11,64 9,76 8,88 C16,80 22,66 25,52 C27,42 30,34 34,32 Z" fill="url(#amWing)" stroke="#9b7fb8" stroke-width=".7" stroke-linejoin="round" filter="url(#amGl)"/>'
      + '<path d="M11,46 C16,42 20,36 23,30 M10,60 C16,55 20,48 23,40 M9,74 C15,68 19,60 22,50 M9,85 C14,79 18,71 21,61" fill="none" stroke="#bcaae0" stroke-width=".55" opacity=".6"/>'
      + '<path d="M30,32 C26,26 20,22 14,22" fill="none" stroke="#e8d4f0" stroke-width=".5" opacity=".5"/>'
      + '</g>'
      + '<g class="am-wing-r">'
      + '<path d="M46,30 C56,16 68,18 72,26 C68,30 67,38 68,48 C69,64 71,76 72,88 C64,80 58,66 55,52 C53,42 50,34 46,32 Z" fill="url(#amWingR)" stroke="#9b7fb8" stroke-width=".7" stroke-linejoin="round" filter="url(#amGl)"/>'
      + '<path d="M69,46 C64,42 60,36 57,30 M70,60 C64,55 60,48 57,40 M71,74 C65,68 61,60 58,50 M71,85 C66,79 62,71 59,61" fill="none" stroke="#bcaae0" stroke-width=".55" opacity=".6"/>'
      + '<path d="M50,32 C54,26 60,22 66,22" fill="none" stroke="#e8d4f0" stroke-width=".5" opacity=".5"/>'
      + '</g>'
      // halo
      + '<circle class="am-halo" cx="40" cy="21" r="9.5" fill="url(#amHalo)" filter="url(#amGl)"/>'
      + '<circle cx="40" cy="21" r="8.5" fill="none" stroke="#e8d4f0" stroke-width=".7" opacity=".75"/>'
      // ornate spear: gradient shaft, diamond blade, animated charge at the tip
      + '<g class="am-spear">'
      + '<line x1="28" y1="16" x2="27.4" y2="100" stroke="#3a2e4e" stroke-width="2" stroke-linecap="round" opacity=".9"/>'
      + '<line x1="28" y1="16" x2="27.4" y2="100" stroke="url(#amShaft)" stroke-width="1.1" stroke-linecap="round"/>'
      + '<line x1="27.7" y1="17" x2="27.2" y2="97" stroke="#f4ecfa" stroke-width=".3" opacity=".5"/>'
      + '<path d="M23.3,17 Q28,13.3 32.7,17" fill="none" stroke="#e8d4f0" stroke-width="1" stroke-linecap="round" opacity=".9" filter="url(#amGl)"/>'
      + '<circle cx="28" cy="16.2" r="1.7" fill="url(#amCore)"/>'
      + '<polygon points="28,1 25.4,9 28,16.2 30.6,9" fill="url(#amBlade)" stroke="#f4ecfa" stroke-width=".4" stroke-linejoin="round" filter="url(#amGl)"/>'
      + '<line x1="28" y1="2.5" x2="28" y2="14.5" stroke="#ffffff" stroke-width=".5" opacity=".85"/>'
      + '</g>'
      + '<circle class="am-charge" cx="28" cy="5" r="3.4" fill="url(#amCore)" filter="url(#amGlBig)"/>'
      + '<circle class="am-flash" cx="28" cy="5" r="3" fill="none" stroke="#f4ecfa" stroke-width="1" opacity=".9"/>'
      + '<g class="am-bolt" filter="url(#amGlBig)"><circle cx="28" cy="5" r="2.3" fill="#ffffff"/><circle cx="26.9" cy="7.4" r="1.5" fill="#f0e0ff" opacity=".82"/><circle cx="26" cy="9.5" r="1" fill="#d8c0ee" opacity=".55"/><circle cx="25.3" cy="11.3" r=".6" fill="#c4a8d4" opacity=".35"/></g>'
      + '<circle class="am-spark" cx="28" cy="9" r="1.2" fill="#f4ecfa"/>'
      + '<circle class="am-spark b" cx="28" cy="9" r="1.2" fill="#e8d4f0"/>'
      // robe with folds, blue tunic at the hem, sash and waist band
      + '<path d="M33,30 C31,44 30,70 29,99 L51,99 C50,70 49,44 47,30 C44,28 36,28 33,30 Z" fill="url(#amRobe)" stroke="#c4a8d4" stroke-width=".9" filter="url(#amGl)"/>'
      + '<path d="M35,42 C34.5,60 34,80 33.5,97 M45,42 C45.5,60 46,80 46.5,97 M40,64 C40,74 40,86 40,97" fill="none" stroke="#b08aa8" stroke-width=".4" opacity=".55"/>'
      + '<path d="M37,72 C36.7,82 36.2,92 35.6,99 L44.4,99 C43.8,92 43.3,82 43,72 Q40,70.4 37,72 Z" fill="#9b86c4" opacity=".45"/>'
      + '<path d="M38.6,76 C38.5,84 38.4,92 38.2,98 M41.4,76 C41.5,84 41.6,92 41.8,98" fill="none" stroke="#bcaae0" stroke-width=".35" opacity=".55"/>'
      + '<path d="M33.4,37.5 L46.6,34.5 L46.6,38 L33.4,41 Z" fill="#9b86c4" opacity=".55"/>'
      + '<path d="M33.8,50 L46.2,50 L46,52.6 L34,52.6 Z" fill="#9b86c4" opacity=".4"/>'
      + '<path d="M37.5,29.5 L40,32.5 L42.5,29.5" fill="none" stroke="#e8d4f0" stroke-width=".6" opacity=".7"/>'
      // arms: right to the spear, left to the orb
      + '<path d="M34,33.5 C31.5,39 29.8,45 29,51 L32.4,52.6 C33.4,47 34.6,40 36.4,35.5 Z" fill="url(#amRobe)" stroke="#c4a8d4" stroke-width=".6" opacity=".95"/>'
      + '<circle cx="29.6" cy="53" r="1.7" fill="#e8d4f0" opacity=".9"/>'
      + '<path d="M46,33.5 C48.5,39 50.2,45 51,51 L47.6,52.6 C46.6,47 45.4,40 43.6,35.5 Z" fill="url(#amRobe)" stroke="#c4a8d4" stroke-width=".6" opacity=".95"/>'
      + '<circle cx="50.4" cy="53" r="1.7" fill="#e8d4f0" opacity=".9"/>'
      // the orb with its shining monogram
      + '<circle class="am-orb-glow" cx="53" cy="59.5" r="8" fill="url(#amOrb)" filter="url(#amGl)"/>'
      + '<circle cx="53" cy="59.5" r="5.6" fill="rgba(244,236,250,.14)" stroke="#f4ecfa" stroke-width=".7"/>'
      + '<path d="M50.2,57 A4,4 0 0 1 53,55.6" fill="none" stroke="#fff" stroke-width=".5" opacity=".7"/>'
      + '<path d="M53,56.7 V62.3 M50.2,59.5 H55.8 M51,57.5 L55,61.5 M55,57.5 L51,61.5" stroke="#e8d4f0" stroke-width=".5" opacity=".9"/>'
      + '<circle cx="53" cy="59.5" r=".8" fill="#f4ecfa"/>'
      // head: serene icon face under the halo
      + '<rect x="38.9" y="26" width="2.2" height="3.4" fill="#e0c8d8" opacity=".85"/>'
      + '<circle cx="40" cy="21.5" r="5.2" fill="#e8d0e0" opacity=".92" stroke="#c4a8d4" stroke-width=".5"/>'
      + '<path d="M35.3,20.2 C35.3,16.6 37.8,15 40,15 C42.2,15 44.7,16.6 44.7,20.2 C43.2,18.9 41.6,18.5 40,18.5 C38.4,18.5 36.8,18.9 35.3,20.2 Z" fill="#6a5480" opacity=".9"/>'
      + '<path d="M40,15.2 V18.4" stroke="#4a3a60" stroke-width=".3" opacity=".6"/>'
      // feet + the mound, with starflowers
      + '<path d="M36.4,99 h2.6 v2.6 a1.3,1.3 0 0 1 -2.6,0 Z M41,99 h2.6 v2.6 a1.3,1.3 0 0 1 -2.6,0 Z" fill="#9b7fb8" opacity=".85"/>'
      + '<path d="M27,104 A13,5.5 0 0 1 53,104 L53,106.5 A13,4 0 0 1 27,106.5 Z" fill="rgba(232,212,240,.12)" stroke="#c4a8d4" stroke-width=".5" opacity=".8"/>'
      + '<ellipse cx="40" cy="104" rx="13" ry="5.5" fill="rgba(244,236,250,.1)" stroke="#e8d4f0" stroke-width=".4" opacity=".7"/>'
      + '<g stroke="#9b86c4" stroke-width=".5" opacity=".6"><path d="M14,108 v-3.5 M12.6,105.5 l1.4,1 1.4,-1"/><path d="M66,108 v-3.5 M64.6,105.5 l1.4,1 1.4,-1"/></g>'
      + '<circle cx="14" cy="103.6" r=".7" fill="#bcaae0" opacity=".8"/>'
      + '<circle cx="66" cy="103.6" r=".7" fill="#bcaae0" opacity=".8"/>'
      // sparkles
      + '<g opacity=".55"><line x1="8" y1="14" x2="14" y2="14" stroke="#e8d4f0" stroke-width=".9"/><line x1="11" y1="11" x2="11" y2="17" stroke="#e8d4f0" stroke-width=".9"/></g>'
      + '<g opacity=".45"><line x1="66" y1="10" x2="72" y2="10" stroke="#e8d4f0" stroke-width=".8"/><line x1="69" y1="7" x2="69" y2="13" stroke="#e8d4f0" stroke-width=".8"/></g>'
      + '<g opacity=".4"><line x1="70" y1="120" x2="75" y2="120" stroke="#e8d4f0" stroke-width=".8"/><line x1="72.5" y1="117.5" x2="72.5" y2="122.5" stroke="#e8d4f0" stroke-width=".8"/></g>'
      + '<g opacity=".4"><line x1="5" y1="118" x2="10" y2="118" stroke="#e8d4f0" stroke-width=".8"/><line x1="7.5" y1="115.5" x2="7.5" y2="120.5" stroke="#e8d4f0" stroke-width=".8"/></g>'
      + '</svg>';
  }
  if (id === 'seraph') {
    // A biblically accurate angel: an Ophanim — wheels within wheels studded
    // with eyes of flame, ringed by six radiating feathered wings, embers
    // rising. Gold on dark.
    var C = '#f3d486', Cd = '#c79a3c', Cl = '#fff6dc', Cw = '#ffe9b0';
    var f1 = function(n) { return (+n).toFixed(1); };
    // Feather fan: `count` tapering feathers radiating from (bx,by), centered
    // on angle a0, spanning ±spread; middle feathers longest.
    var featherWing = function(bx, by, a0, spread, count, len, op) {
      var s = '';
      for (var i = 0; i < count; i++) {
        var t = count > 1 ? i / (count - 1) : 0.5;
        var a = a0 - spread + 2 * spread * t;
        var L = len * (0.62 + 0.38 * Math.sin(Math.PI * t));
        var tx = bx + Math.cos(a) * L, ty = by + Math.sin(a) * L;
        var w = L * 0.13, px = -Math.sin(a), py = Math.cos(a);
        var mx = (bx + tx) / 2, my = (by + ty) / 2;
        var o1x = mx + px * w, o1y = my + py * w, o2x = mx - px * w, o2y = my - py * w;
        s += '<path d="M' + f1(bx) + ',' + f1(by) + ' Q' + f1(o1x) + ',' + f1(o1y) + ' ' + f1(tx) + ',' + f1(ty) + ' Q' + f1(o2x) + ',' + f1(o2y) + ' ' + f1(bx) + ',' + f1(by) + ' Z" fill="url(#srWing)" opacity="' + (op * (0.7 + 0.3 * Math.sin(Math.PI * t))).toFixed(2) + '" stroke="' + Cw + '" stroke-width="0.3" stroke-opacity="0.4"/>';
        s += '<path d="M' + f1(bx) + ',' + f1(by) + ' L' + f1(tx) + ',' + f1(ty) + '" stroke="' + Cd + '" stroke-width="0.28" opacity="0.45"/>';
      }
      return s;
    };
    var seye = function(cx, cy, r) {
      return '<path d="M' + f1(cx - r * 1.6) + ',' + f1(cy) + ' Q' + f1(cx) + ',' + f1(cy - r) + ' ' + f1(cx + r * 1.6) + ',' + f1(cy) + ' Q' + f1(cx) + ',' + f1(cy + r) + ' ' + f1(cx - r * 1.6) + ',' + f1(cy) + ' Z" fill="rgba(20,11,2,.62)" stroke="' + Cw + '" stroke-width="0.4"/>'
        + '<circle cx="' + f1(cx) + '" cy="' + f1(cy) + '" r="' + f1(r * 0.5) + '" fill="' + Cl + '"/>'
        + '<circle cx="' + f1(cx) + '" cy="' + f1(cy) + '" r="' + f1(r * 0.22) + '" fill="' + Cd + '"/>';
    };
    var eyeRing = function(cx, cy, rad, count, er, start) {
      var s = '';
      for (var i = 0; i < count; i++) { var a = start + (i / count) * Math.PI * 2; s += seye(cx + Math.cos(a) * rad, cy + Math.sin(a) * rad, er); }
      return s;
    };
    var P = Math.PI, cx = 40, cy = 62, svg = '';
    // Six feathered wings, behind the wheels
    svg += featherWing(cx - 4, cy - 9, -P * 0.72, 0.30, 5, 34, 0.5);
    svg += featherWing(cx + 4, cy - 9, -P * 0.28, 0.30, 5, 34, 0.5);
    svg += featherWing(cx - 6, cy - 1,  P * 0.96, 0.26, 5, 36, 0.42);
    svg += featherWing(cx + 6, cy - 1,  P * 0.04, 0.26, 5, 36, 0.42);
    svg += featherWing(cx - 5, cy + 8,  P * 0.66, 0.28, 5, 38, 0.4);
    svg += featherWing(cx + 5, cy + 8,  P * 0.34, 0.28, 5, 38, 0.4);
    // Wheels within wheels
    svg += '<circle cx="' + cx + '" cy="' + cy + '" r="22" fill="url(#srHd)" opacity="0.42" filter="url(#srGl)"/>';
    svg += '<circle cx="' + cx + '" cy="' + cy + '" r="19" fill="none" stroke="' + C + '" stroke-width="0.7" opacity="0.6"/>';
    svg += '<circle cx="' + cx + '" cy="' + cy + '" r="13.5" fill="none" stroke="' + Cw + '" stroke-width="0.6" opacity="0.5"/>';
    svg += '<circle cx="' + cx + '" cy="' + cy + '" r="7.5" fill="none" stroke="' + C + '" stroke-width="0.6" opacity="0.62"/>';
    svg += eyeRing(cx, cy, 19, 10, 1.25, -P / 2);
    svg += eyeRing(cx, cy, 13.5, 7, 1.15, -P / 2 + 0.45);
    svg += '<g filter="url(#srGl)"><circle cx="' + cx + '" cy="' + cy + '" r="4.2" fill="url(#srHd)"/></g>';
    svg += seye(cx, cy, 2.4);
    // Embers rising
    var em = [[34, 32], [46, 34], [40, 24], [38, 17], [42, 13], [40, 8]];
    for (var ei = 0; ei < em.length; ei++) svg += '<circle cx="' + em[ei][0] + '" cy="' + em[ei][1] + '" r="' + (0.9 - ei * 0.09).toFixed(2) + '" fill="' + Cw + '" opacity="' + (0.6 - ei * 0.08).toFixed(2) + '"/>';
    return '<svg viewBox="0 0 80 130" width="72" height="118" xmlns="http://www.w3.org/2000/svg" style="overflow:visible;">'
      + '<defs>'
      + '<radialGradient id="srHd" cx="50%" cy="50%" r="50%"><stop offset="0%" stop-color="' + Cl + '" stop-opacity=".98"/><stop offset="60%" stop-color="' + C + '" stop-opacity=".5"/><stop offset="100%" stop-color="' + C + '" stop-opacity="0"/></radialGradient>'
      + '<linearGradient id="srWing" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="' + Cw + '" stop-opacity=".7"/><stop offset="100%" stop-color="' + C + '" stop-opacity=".12"/></linearGradient>'
      + '<filter id="srGl" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="1.3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>'
      + '</defs>'
      // Scaled up 2.1x about center — the radial design otherwise reads small
      // in the guide orb. overflow:visible lets the wings extend past the box.
      + '<g transform="translate(40,62) scale(2.1) translate(-40,-62)">' + svg + '</g>'
      + '</svg>';
  }
  // Default: null = keep existing HTML (Omnia crystal)
  return null;
}

var _drawerOmniaBtnOrigSVG = null;
var _origCrystalHTML = {};
function updateDrawerEntityBtn() {
  var btn = document.getElementById('drawerOmniaBtn');
  if (!btn) return;
  // Cache original Omnia crystal HTML on first call
  if (!_drawerOmniaBtnOrigSVG) _drawerOmniaBtnOrigSVG = btn.innerHTML;
  var entity = omniaFindCosmetic(OMNIA_ENTITIES, (omniaState && omniaState.cosmetics && omniaState.cosmetics.entity) || 'omnia');
  var palette = omniaFindCosmetic(OMNIA_PALETTES, (omniaState && omniaState.cosmetics && omniaState.cosmetics.palette) || 'aether');
  var relFilter = omniaPaletteFilterFor(palette, entity);
  var color = omniaDisplayColor(palette, entity);
  if (color.charAt(0) !== '#') color = entity.color;
  // The palette recolor filter must apply ONLY to the entity art — never to
  // the button as a whole, or it bleeds onto the appended companion and the
  // element wheel and hue-shifts them (e.g. the gold Fire companion turning
  // green in the drawer). So wrap the art and filter the wrapper, leaving
  // btn.style.filter clear for companion/elements to keep their true colors.
  btn.style.filter = '';
  if (entity.id === 'omnia') {
    var omniaArtFilter = relFilter !== 'none' ? 'filter:' + relFilter + ';' : '';
    btn.innerHTML = '<div class="drawer-omnia-art" style="line-height:0;' + omniaArtFilter + '">' + _drawerOmniaBtnOrigSVG + '</div>';
    btn.title = 'Meet Omnia';
    btn.setAttribute('aria-label', 'Open guide tutorial');
  } else {
    var crystalSVG = getEntityCrystalSVG(entity.id);
    var previewSVG;
    if (crystalSVG) {
      // Use the full crystal design (Ophanim, mandorla, etc.) scaled down for the drawer
      previewSVG = crystalSVG.replace(/width="[^"]*"/, 'width="48"').replace(/height="[^"]*"/, 'height="78"');
    } else {
      previewSVG = renderOmniaEntityPreview(entity).replace('<svg ', '<svg width="26" height="38" ');
    }
    var artFilter = (relFilter !== 'none' ? relFilter + ' ' : '') + 'drop-shadow(0 0 6px ' + color + '99)';
    btn.innerHTML = '<div class="drawer-omnia-art" style="line-height:0;filter:' + artFilter + ';">' + previewSVG + '</div>';
    btn.title = entity.name;
    btn.setAttribute('aria-label', 'Open ' + entity.name + ' guide');
  }
  // Companion (e.g. Corgi) — rendered as a small positioned element inside the button
  var existing = btn.querySelector('.drawer-btn-companion');
  if (existing) existing.remove();
  var compId = omniaState && omniaState.cosmetics && omniaState.cosmetics.companion;
  if (compId) {
    var comp = omniaFindCosmetic(OMNIA_COMPANIONS, compId);
    if (comp) {
      var cEl = document.createElement('div');
      cEl.className = 'drawer-btn-companion';
      cEl.setAttribute('aria-hidden', 'true');
      cEl.innerHTML = renderOmniaCompanionPreview(comp);
      btn.appendChild(cEl);
    }
  }
}

function injectOmniaTriad(fig) {
  if (!fig || fig.querySelector('.omnia-triad-orbit')) return;
  var triad = document.createElement('div');
  triad.className = 'omnia-triad-orbit';
  triad.setAttribute('aria-hidden', 'true');
  triad.innerHTML =
    '<div class="triad-ring">'
    + ['t-physical','t-astral','t-mental'].map(function(c) {
        return '<div class="triad-shard ' + c + '">'
          + '<div class="triad-shard-inner">'
          + '<svg viewBox="0 0 18 22"><polygon points="9,1 17,8 13,21 5,21 1,8" fill="currentColor" stroke="rgba(255,255,255,.6)" stroke-width="0.6"/></svg>'
          + '</div></div>';
      }).join('')
    + '</div>';
  fig.appendChild(triad);
}
function injectOmniaCrown(fig) {
  if (!fig || fig.querySelector('.omnia-crown')) return;
  var el = document.createElement('div');
  el.className = 'omnia-crown';
  el.setAttribute('aria-hidden', 'true');
  fig.appendChild(el);
  var dia = document.createElement('div');
  dia.className = 'omnia-diadem';
  dia.setAttribute('aria-hidden', 'true');
  dia.innerHTML = '<i>✦</i><i>✧</i><i>✦</i><i>✧</i><i>✦</i>';
  fig.appendChild(dia);
}
function injectOmniaPolar(fig) {
  if (!fig || fig.querySelector('.omnia-polar')) return;
  var el = document.createElement('div');
  el.className = 'omnia-polar';
  el.setAttribute('aria-hidden', 'true');
  el.innerHTML = '<div class="omnia-polar-pillar left"><b class="omnia-cap"></b></div><div class="omnia-polar-pillar right"><b class="omnia-cap"></b></div>';
  fig.appendChild(el);
}
function injectOmniaElements(fig) {
  if (!fig || fig.querySelector('.omnia-elements')) return;
  var mantle = document.createElement('div');
  mantle.className = 'omnia-mantle';
  mantle.setAttribute('aria-hidden', 'true');
  fig.appendChild(mantle);
  var wheel = document.createElement('div');
  wheel.className = 'omnia-elements';
  wheel.setAttribute('aria-hidden', 'true');
  wheel.innerHTML = '<div class="omnia-element e-fire"></div><div class="omnia-element e-air"></div><div class="omnia-element e-water"></div><div class="omnia-element e-earth"></div>';
  fig.appendChild(wheel);
}
// ── Steps VI–X: the Geometry of Light ──────────────────────────────────────
// From VI the ornament ladder inverts: instead of accumulating objects the
// figure distills. Function names keep their historical tier names (echo,
// senses, currents, mirror, apotheosis) so applyOmniaStepVisuals and the
// body tier classes stay untouched.
function injectOmniaEcho(fig) {
  // Step VI: the mandorla — one breathing ring enclosing the whole figure,
  // a crowning star at its apex, a ray descending to the crystal. (Replaces
  // the twin etheric doubles, whose cloned SVG defs duplicated the crystal's
  // gradient ids and ghosted the true form whenever the clones were hidden.)
  if (!fig || fig.querySelector('.omnia-mandorla')) return;
  var m = document.createElement('div');
  m.className = 'omnia-mandorla';
  m.setAttribute('aria-hidden', 'true');
  fig.appendChild(m);
  var ax = document.createElement('div');
  ax.className = 'omnia-axis';
  ax.setAttribute('aria-hidden', 'true');
  fig.appendChild(ax);
}
function injectOmniaSenses(fig) {
  // Step VII: the enclosure deepens — an inner ring breathing in counter-
  // phase with the outer, a small diamond node taking station at each side.
  if (!fig || fig.querySelector('.omnia-mandorla--inner')) return;
  var m = document.createElement('div');
  m.className = 'omnia-mandorla omnia-mandorla--inner';
  m.setAttribute('aria-hidden', 'true');
  fig.appendChild(m);
}
function _omniaGeoSvg(cls, points) {
  var el = document.createElement('div');
  el.className = 'omnia-geo ' + cls;
  el.setAttribute('aria-hidden', 'true');
  el.innerHTML = '<svg viewBox="0 0 100 100" preserveAspectRatio="none">'
    + '<polygon points="' + points + '" fill="none" stroke-width="1" vector-effect="non-scaling-stroke"/>'
    + '</svg>';
  return el;
}
function injectOmniaCurrents(fig) {
  // Step VIII: the four light-stations (crowning star, base spark, side
  // nodes) join into a single diamond of light framing the crystal.
  if (!fig || fig.querySelector('.omnia-geo--diamond')) return;
  fig.appendChild(_omniaGeoSvg('omnia-geo--diamond', '50,0 90.4,50 50,100 9.6,50'));
}
function injectOmniaMirror(fig) {
  // Step IX: the mirror — the geometry doubles, a faint upright rectangle
  // ghosted behind the diamond ("as above, so below").
  if (!fig || fig.querySelector('.omnia-geo--mirror')) return;
  fig.appendChild(_omniaGeoSvg('omnia-geo--mirror', '78.5,14.6 78.5,85.4 21.5,85.4 21.5,14.6'));
}
function injectOmniaApotheosis(fig) {
  // Step X: apotheosis — nothing new is added; the built geometry ignites
  // gold (tier CSS overrides) inside one final enclosing halo.
  if (!fig || fig.querySelector('.omnia-halo10')) return;
  var h = document.createElement('div');
  h.className = 'omnia-halo10';
  h.setAttribute('aria-hidden', 'true');
  fig.appendChild(h);
}
// Prestige aura + sphere-touched form markers on <body> — applied on load and
// on every Omnia render so the Path banner is correct before Upgrade is visited.
function applyOmniaMetaMarks() {
  document.body.classList.toggle('omnia-prestiged', (omniaState.prestige || 0) > 0);
  if (typeof updateOmniaGiftBtn === 'function') updateOmniaGiftBtn();
  var sf = (omniaState.bookII && omniaState.bookII.sphere) || 0;
  // Book II: the sigil overhead is present from the first forging day — it
  // marks the sphere currently approached, and stays on Pluto once attained.
  if (typeof darkMatterUnlocked === 'function' && darkMatterUnlocked()) sf = Math.min(sf + 1, 10);
  if (sf > 0) document.body.dataset.sphereForm = sf; else delete document.body.dataset.sphereForm;
}

function applyOmniaStepVisuals() {
  var step = (omniaState && omniaState.bardonStep) || 1;
  // The first two turnings (P1, P2) genuinely re-walk Book I: the regalia
  // resets to the bare crystal and rebuilds Step I → X with the path, so each
  // walk is felt. Only at the 3rd Prestige — when Dark Matter and Book II
  // awaken — does Omnia keep her full Step X regalia permanently (bardonStep
  // no longer advances past there) and gain the sphere sigil overhead.
  if (omniaState && (omniaState.prestige || 0) >= PRESTIGE_BOOK2) step = 10;
  document.body.classList.toggle('omnia-tier-orbit',      step >= 2);
  document.body.classList.toggle('omnia-tier-crown',      step >= 3);
  document.body.classList.toggle('omnia-tier-polar',      step >= 4);
  document.body.classList.toggle('omnia-tier-elements',   step >= 5);
  document.body.classList.toggle('omnia-tier-echo',       step >= 6);
  document.body.classList.toggle('omnia-tier-senses',     step >= 7);
  document.body.classList.toggle('omnia-tier-currents',   step >= 8);
  document.body.classList.toggle('omnia-tier-mirror',     step >= 9);
  document.body.classList.toggle('omnia-tier-apotheosis', step >= 10);
  ['guideOmniaFigure', 'omniaCenterFigure', 'drawerOmniaBtn', 'pathBannerOmniaFigure'].forEach(function(id) {
    var el = document.getElementById(id);
    if (!el) return;
    injectOmniaTriad(el);
    if (step >= 3) injectOmniaCrown(el);
    if (step >= 4) injectOmniaPolar(el);
    if (step >= 5) injectOmniaElements(el);
    if (step >= 6) injectOmniaEcho(el);
    if (step >= 7) injectOmniaSenses(el);
    if (step >= 8) injectOmniaCurrents(el);
    if (step >= 9) injectOmniaMirror(el);
    if (step >= 10) injectOmniaApotheosis(el);
  });
}

function applyOmniaCosmetics() {
  if (!omniaState.cosmetics) omniaState.cosmetics = cloneOmniaDefault().cosmetics;
  var palette = omniaFindCosmetic(OMNIA_PALETTES, omniaState.cosmetics.palette || 'aether');
  var entity = omniaFindCosmetic(OMNIA_ENTITIES, omniaState.cosmetics.entity || 'omnia');
  var companion = omniaState.cosmetics.companion ? omniaFindCosmetic(OMNIA_COMPANIONS, omniaState.cosmetics.companion) : null;
  var entitySVG = getEntityCrystalSVG(entity.id);
  var displayColor = omniaDisplayColor(palette, entity);
  var entityDropShadow = entitySVG ? 'drop-shadow(0 0 10px ' + (displayColor.charAt(0) === '#' ? displayColor : entity.color) + '88)' : '';
  // Apply palette filter + entity SVG to all Omnia figure elements. The
  // filter is computed relative to the entity's base color so a palette
  // reads as the same color on every form.
  ['guideOmniaFigure', 'omniaCenterFigure', 'pathBannerOmniaFigure'].forEach(function(figId) {
    var f = document.getElementById(figId);
    if (!f) return;
    f.style.setProperty('--omnia-filter', omniaPaletteFilterFor(palette, entity));
    f.classList.toggle('omnia-spectral', omniaState.cosmetics.veil === 'spectral');
    f.classList.toggle('omnia-aurora', palette.id === 'aurora');
    f.style.setProperty('--omnia-companion-color', companion ? companion.color : palette.color);
    f.classList.toggle('has-companion', !!companion);
    var compSlot = f.querySelector('.omnia-companion');
    if (compSlot) {
      var isCorgi = !!companion && companion.id === 'corgi';
      compSlot.innerHTML = companion ? renderOmniaCompanionPreview(companion) : '';
      compSlot.style.display = companion ? 'block' : 'none';
      compSlot.classList.toggle('companion-corgi', isCorgi);
      compSlot.dataset.companion = companion ? companion.id : '';
      setupCorgiWander(compSlot, isCorgi);
      setupCompanionIdle(compSlot, companion && !isCorgi ? companion.id : null);
    }
    f.dataset.entity = entity.id;
    f.setAttribute('aria-label', 'Reveal a ' + entity.name + ' symbol');
    var crystalLayer = f.querySelector('.omnia-crystal-layer');
    if (crystalLayer) {
      if (!_origCrystalHTML[figId]) _origCrystalHTML[figId] = crystalLayer.innerHTML;
      if (entitySVG) {
        crystalLayer.innerHTML = entitySVG;
        f.style.filter = entityDropShadow;
      } else {
        crystalLayer.innerHTML = _origCrystalHTML[figId] || '';
        f.style.filter = '';
      }
    }
  });
  var name = document.querySelector('.omnia-name');
  if (name) {
    name.textContent = entity.name;
    name.style.color = displayColor;
  }
  var peekInner = document.getElementById('omniaTabPeekInner');
  if (peekInner) {
    if (!_origCrystalHTML.omniaTabPeekInner) _origCrystalHTML.omniaTabPeekInner = peekInner.innerHTML;
    if (entitySVG) {
      peekInner.innerHTML = entitySVG.replace(/width="[^"]*"/, 'width="110"').replace(/height="[^"]*"/, 'height="178"');
    } else {
      peekInner.innerHTML = _origCrystalHTML.omniaTabPeekInner;
    }
  }
  updateDrawerEntityBtn();
}

// ── Appearance wardrobe: sub-tabs + swatch strip (colors) / card grid ──
// Owned items select on tap; locked items focus a detail card whose Unlock
// button does the purchase, so nobody buys by accident.
var _omniaCosTab = 'palette';
var _omniaCosFocus = {};

function renderOmniaCosDetail(kind, item) {
  var unlocked = omniaCosmeticUnlocked(kind, item.id);
  var selected = omniaCosmeticSelected(kind, item.id);
  var liveCost = omniaCosmeticCost(item);
  var label, disabled;
  if (kind === 'veil') {
    label = selected ? 'Turn Off' : unlocked ? 'Turn On' : liveCost > 0 ? 'Unlock · ' + liveCost.toLocaleString() + ' akasha' : 'Unlock';
    disabled = !unlocked && (omniaState.akasha || 0) < liveCost;
  } else {
    label = selected ? 'Selected' : unlocked ? 'Select' : liveCost > 0 ? 'Unlock ' + liveCost : 'Unlock';
    disabled = selected || (!unlocked && (omniaState.akasha || 0) < liveCost);
  }
  return '<div class="oe-cos-detail">'
    + '<div><div class="oe-cos-detail-name">' + item.name + '</div><div class="oe-cos-detail-sub">' + item.sub + (!unlocked && liveCost > 0 ? ' · ' + liveCost.toLocaleString() + ' akasha' : '') + '</div></div>'
    + '<button class="omnia-mini-btn" data-omnia-cosmetic-kind="' + kind + '" data-omnia-cosmetic-id="' + item.id + '"' + (disabled ? ' disabled' : '') + '>' + label + '</button>'
    + '</div>';
}

function omniaSwatchStyle(item) {
  var s = '--swatch:' + item.color + ';';
  if (item.id === 'aurora') s += 'background:conic-gradient(from 0deg,#ff9d9d,#ffd79d,#b8ff9d,#9dd9ff,#c89dff,#ff9d9d);';
  if (item.id === 'spectral') s += 'background:linear-gradient(135deg, rgba(216,236,255,.55), rgba(216,236,255,.1));';
  return s;
}

function renderOmniaAppearance() {
  var c = omniaState.cosmetics || cloneOmniaDefault().cosmetics;
  var kinds = [
    { kind:'palette', label:'Colors', items:OMNIA_PALETTES },
    { kind:'entity', label:'Forms', items:OMNIA_ENTITIES },
    { kind:'companion', label:'Companions', items:OMNIA_COMPANIONS }
  ];
  var tab = kinds.find(function(k) { return k.kind === _omniaCosTab; }) || kinds[0];
  var html = '<div class="oe-cos-tabs">' + kinds.map(function(k) {
    return '<button class="oe-cos-tab' + (k.kind === tab.kind ? ' active' : '') + '" data-omnia-cos-tab="' + k.kind + '">' + k.label + '</button>';
  }).join('') + '</div>';

  var focusItem = _omniaCosFocus[tab.kind] ? omniaFindCosmetic(tab.items, _omniaCosFocus[tab.kind]) : null;
  if (!focusItem) {
    var selId = tab.kind === 'palette' ? (c.palette || 'aether') : tab.kind === 'entity' ? (c.entity || 'omnia') : c.companion;
    focusItem = selId ? omniaFindCosmetic(tab.items, selId) : null;
  }

  if (tab.kind === 'entity' || tab.kind === 'companion') {
    var totalBonusPct = Math.round((getOmniaCosmeticBoost() - 1) * 100);
    html += '<div class="oe-cos-summary">Every form and companion you unlock adds its bonus permanently — no need to equip. Currently <strong>+' + totalBonusPct + '% Akasha</strong> from all training.</div>';
  }

  if (tab.kind === 'palette') {
    // Palette swatches + veil swatches in one strip.
    // Veil swatches ALWAYS go through the focus path so tapping any veil
    // (owned or not) shows the detail card below. The detail card's button
    // handles the actual toggle/unlock.
    var veilSwatches = OMNIA_VEILS.map(function(item) {
      var selected = omniaCosmeticSelected('veil', item.id);
      var unlocked = omniaCosmeticUnlocked('veil', item.id);
      var isFocusV = _omniaCosFocus.veil === item.id;
      return '<div class="oe-swatch oe-swatch-veil' + (selected ? ' sel' : '') + (unlocked ? '' : ' locked') + (isFocusV ? ' focus' : '') + '" style="' + omniaSwatchStyle(item) + '" title="' + item.name + '" data-omnia-cos-focus="' + item.id + '" data-omnia-cos-kind="veil">'
        + (selected ? '<span class="oe-swatch-veil-dot"></span>' : '')
        + '</div>';
    }).join('');
    html += '<div class="oe-swatch-strip">' + tab.items.map(function(item) {
      var unlocked = omniaCosmeticUnlocked('palette', item.id);
      var selected = omniaCosmeticSelected('palette', item.id);
      var isFocus = focusItem && focusItem.id === item.id;
      var attrs = unlocked
        ? 'data-omnia-cosmetic-kind="palette" data-omnia-cosmetic-id="' + item.id + '"'
        : 'data-omnia-cos-focus="' + item.id + '" data-omnia-cos-kind="palette"';
      return '<div class="oe-swatch' + (selected ? ' sel' : '') + (unlocked ? '' : ' locked') + (isFocus && !unlocked ? ' focus' : '') + '" style="' + omniaSwatchStyle(item) + '" title="' + item.name + '" ' + attrs + '></div>';
    }).join('') + veilSwatches + '</div>';
    if (focusItem) html += renderOmniaCosDetail('palette', focusItem);
    var veilFocus = _omniaCosFocus.veil ? omniaFindCosmetic(OMNIA_VEILS, _omniaCosFocus.veil) : null;
    if (veilFocus) {
      html += '<div style="margin-top:10px;">' + renderOmniaCosDetail('veil', veilFocus) + '</div>';
    }
  } else {
    html += '<div class="oe-cos-grid">' + tab.items.map(function(item) {
      var unlocked = omniaCosmeticUnlocked(tab.kind, item.id);
      var selected = omniaCosmeticSelected(tab.kind, item.id);
      var liveCost = omniaCosmeticCost(item);
      var tag = selected ? 'Selected' : unlocked ? 'Owned' : liveCost > 0 ? liveCost.toLocaleString() + ' akasha' : 'Locked';
      var attrs = unlocked
        ? 'data-omnia-cosmetic-kind="' + tab.kind + '" data-omnia-cosmetic-id="' + item.id + '"'
        : 'data-omnia-cos-focus="' + item.id + '" data-omnia-cos-kind="' + tab.kind + '"';
      var bonusPct = omniaCosmeticBonusPct(item);
      var bonusHtml = bonusPct > 0 ? '<div class="oe-cos-card-bonus">+' + bonusPct + '% Akasha</div>' : '';
      return '<div class="oe-cos-card' + (selected ? ' sel' : '') + (unlocked ? '' : ' locked') + '" ' + attrs + '>'
        + renderOmniaCosmeticPreview(tab.kind, item)
        + '<div class="oe-cos-card-name">' + item.name + '</div>'
        + bonusHtml
        + '<div class="oe-cos-card-tag' + (selected ? ' sel' : '') + '">' + tag + '</div>'
        + '</div>';
    }).join('') + '</div>';
    if (focusItem && !omniaCosmeticUnlocked(tab.kind, focusItem.id)) {
      html += '<div style="margin-top:10px;">' + renderOmniaCosDetail(tab.kind, focusItem) + '</div>';
    }
    if (tab.kind === 'companion' && c.companion) {
      html += '<button class="omnia-mini-btn oe-cos-dismiss" data-omnia-cosmetic-kind="companion" data-omnia-cosmetic-id="none">Dismiss Companion</button>';
    }
  }
  return html;
}

function unlockOrSelectOmniaCosmetic(kind, id) {
  if (!omniaState.cosmetics) omniaState.cosmetics = cloneOmniaDefault().cosmetics;
  if (kind === 'companion' && id === 'none') {
    omniaState.cosmetics.companion = null;
    omniaState.cosmetics._updatedAt = Date.now();
    saveOmniaState();
    renderOmniaEngine();
    return;
  }
  var list = kind === 'palette' ? OMNIA_PALETTES : kind === 'entity' ? OMNIA_ENTITIES : kind === 'veil' ? OMNIA_VEILS : OMNIA_COMPANIONS;
  var item = omniaFindCosmetic(list, id);
  var unlocked = omniaCosmeticUnlocked(kind, id);
  // Veils toggle on/off and layer over the active palette, rather than
  // replacing one another like palettes/entities/companions do.
  if (kind === 'veil' && unlocked && omniaState.cosmetics.veil === id) {
    omniaState.cosmetics.veil = null;
    omniaState.cosmetics._updatedAt = Date.now();
    saveOmniaState();
    renderOmniaEngine();
    showToast(item.name + ' removed');
    return;
  }
  if (!unlocked) {
    var liveCost = omniaCosmeticCost(item);
    if ((omniaState.akasha || 0) < liveCost) return;
    omniaState.akasha -= liveCost;
    omniaState.totalAkashaSpent = (omniaState.totalAkashaSpent || 0) + liveCost;
    omniaUnlockList(kind).push(id);
  }
  if (kind === 'palette') omniaState.cosmetics.palette = id;
  if (kind === 'veil') omniaState.cosmetics.veil = id;
  if (kind === 'entity') {
    omniaState.cosmetics.entity = id;
    var autoPal = OMNIA_ENTITY_AUTO_PALETTE[id];
    if (autoPal) {
      // These forms come with their own signature palette, free and
      // selected the moment they're chosen.
      if (omniaUnlockList('palette').indexOf(autoPal) === -1) omniaUnlockList('palette').push(autoPal);
      omniaState.cosmetics.palette = autoPal;
    } else {
      // Snap the color to the form's native palette so the selected swatch
      // matches how the entity actually renders (only if that palette is owned).
      var nativePal = OMNIA_ENTITY_NATIVE_PALETTE[id] || 'aether';
      if (omniaState.cosmetics.palette !== nativePal && omniaCosmeticUnlocked('palette', nativePal)) {
        omniaState.cosmetics.palette = nativePal;
      }
    }
  }
  if (kind === 'companion') omniaState.cosmetics.companion = id;
  omniaState.cosmetics._updatedAt = Date.now();
  saveOmniaState();
  renderOmniaEngine();
  showToast(item.name + (unlocked ? ' selected' : ' unlocked'));
}
