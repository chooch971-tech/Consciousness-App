var OMNIA_ENTITY_MORPH_SYMBOLS = {
  omnia: [
    { id:'eye', label:'Inner Eye', color:'#b8eaff' },
    { id:'triangle', label:'Triad', color:'#d4b08e' },
    { id:'sun', label:'Solar Center', color:'#f0d39a' },
    { id:'moon', label:'Lunar Vessel', color:'#c4a8d4' }
  ],
  noema: [
    { id:'prism', label:'Noema Lens', color:'#98b4cc' },
    { id:'eye', label:'Cognitive Core', color:'#9fbfd8' },
    { id:'triangle', label:'Noetic Prism', color:'#b7cee0' }
  ],
  aurel: [
    { id:'hexagram', label:'Will Sigil', color:'#e3b97f' },
    { id:'sun', label:'Solar Forge', color:'#f0d39a' },
    { id:'eye', label:'Golden Watch', color:'#f2d8a8' }
  ],
  elys: [
    { id:'halo', label:'Halo & Spear', color:'#c4a8d4' },
    { id:'moon', label:'The Halo', color:'#d8b7e6' },
    { id:'sun', label:'Spear of Light', color:'#b995ca' }
  ],
  seraph: [
    { id:'wheel', label:'Wheel of Fire', color:'#f0c860' },
    { id:'eye', label:'Eye of Flame', color:'#f3d486' },
    { id:'sun', label:'Burning Round', color:'#e8b84a' }
  ],
  darkomnia: [
    { id:'eye', label:'Void Eye', color:'#c4a8d4' },
    { id:'moon', label:'Dark Moon', color:'#9b7fb8' },
    { id:'triangle', label:'Umbral Triad', color:'#d8c4f4' }
  ]
};
var omniaMorphIndexes = { omnia:0, noema:0, aurel:0, elys:0, seraph:0 };
var omniaMorphTimer = null;
var omniaMorphRaf = null;

var OMNIA_CRYSTAL_MORPH_SHARDS = [
  [[50,4],[66,18],[50,32],[34,18]],
  [[50,32],[74,45],[80,70],[50,84]],
  [[50,32],[50,84],[20,70],[26,45]],
  [[20,70],[50,84],[50,116],[32,99]],
  [[80,70],[68,99],[50,116],[50,84]],
  [[20,70],[80,70],[68,99],[32,99]],
  [[50,84],[68,99],[50,116],[32,99]],
  [[34,18],[50,32],[26,45],[20,70]],
  [[66,18],[80,70],[74,45],[50,32]]
];

// Per-entity morph origins: rough shard silhouettes of each form, so a
// tapped entity bursts out of its own shape instead of flashing the Omnia
// crystal before the symbol appears. Same shard count and point count as
// the crystal set so the lerp into OMNIA_MORPH_TARGETS stays index-aligned.
var OMNIA_ENTITY_MORPH_SHARDS = {
  noema: [ // hexagonal prism: caps, column halves, central diamond, eye core
    [[50,12],[70,23],[50,43],[30,23]],
    [[30,23],[30,65],[50,65],[50,43]],
    [[70,23],[70,65],[50,65],[50,43]],
    [[30,65],[30,87],[50,87],[50,65]],
    [[70,65],[70,87],[50,87],[50,65]],
    [[30,87],[70,87],[55,107],[45,107]],
    [[45,107],[55,107],[50,117],[50,117]],
    [[50,51],[66,65],[50,79],[34,65]],
    [[44,60],[56,60],[56,70],[44,70]]
  ],
  aurel: [ // hexagram star: triangle tips and legs, central diamond, core
    [[50,10],[59,33],[50,42],[41,33]],
    [[41,33],[23,82],[34,82],[47,44]],
    [[59,33],[77,82],[66,82],[53,44]],
    [[50,119],[41,96],[50,86],[59,96]],
    [[23,47],[34,47],[46,86],[38,92]],
    [[77,47],[66,47],[54,86],[62,92]],
    [[50,53],[68,65],[50,70],[32,65]],
    [[32,65],[68,65],[56,82],[44,82]],
    [[50,58],[57,65],[50,72],[43,65]]
  ],
  elys: [ // archangel: halo+head, wing halves, torso, robe, spear, orb
    [[50,15],[58,24],[50,33],[42,24]],
    [[42,35],[17,27],[20,49],[40,46]],
    [[20,49],[17,86],[33,72],[38,50]],
    [[58,35],[83,27],[80,49],[60,46]],
    [[80,49],[83,86],[67,72],[62,50]],
    [[42,33],[58,33],[59,60],[41,60]],
    [[41,60],[59,60],[61,96],[39,96]],
    [[36,16],[39,16],[38,97],[35,97]],
    [[63,53],[70,60],[63,67],[56,60]]
  ],
  seraph: [ // ophanim: outer wheel quarters, inner wheel, core, wing fans
    [[50,25],[72,42],[50,50],[28,42]],
    [[72,42],[86,62],[72,82],[62,62]],
    [[72,82],[50,99],[28,82],[50,74]],
    [[28,82],[14,62],[28,42],[38,62]],
    [[50,40],[72,62],[50,84],[28,62]],
    [[50,53],[59,62],[50,71],[41,62]],
    [[34,18],[66,18],[58,38],[42,38]],
    [[12,96],[30,106],[42,84],[28,76]],
    [[88,96],[70,106],[58,84],[72,76]]
  ]
};

var OMNIA_MORPH_TARGETS = {
  eye: [
    [[50,34],[64,50],[50,66],[36,50]],
    [[50,64],[64,78],[50,94],[36,78]],
    [[8,65],[28,46],[40,54],[26,76]],
    [[92,65],[72,46],[60,54],[74,76]],
    [[8,65],[28,46],[72,46],[92,65]],
    [[8,65],[28,84],[72,84],[92,65]],
    [[43,58],[57,58],[57,72],[43,72]],
    [[22,43],[50,25],[78,43],[70,49]],
    [[24,87],[50,105],[76,87],[68,82]]
  ],
  triangle: [
    [[50,8],[61,31],[39,31],[50,8]],
    [[61,31],[89,88],[73,88],[49,31]],
    [[39,31],[27,88],[11,88],[51,31]],
    [[11,88],[89,88],[80,100],[20,100]],
    [[50,33],[62,61],[38,61],[50,33]],
    [[38,61],[31,82],[50,73],[62,61]],
    [[62,61],[69,82],[50,73],[38,61]],
    [[20,100],[50,73],[80,100],[50,112]],
    [[50,8],[50,33],[39,31],[61,31]]
  ],
  sun: [
    [[47,8],[53,8],[55,27],[45,27]],
    [[47,103],[53,103],[55,122],[45,122]],
    [[7,62],[26,60],[26,70],[7,68]],
    [[74,60],[93,62],[93,68],[74,70]],
    [[24,23],[32,16],[42,34],[35,41]],
    [[68,16],[76,23],[65,41],[58,34]],
    [[24,107],[35,89],[42,96],[32,114]],
    [[58,96],[65,89],[76,107],[68,114]],
    [[50,38],[70,65],[50,92],[30,65]]
  ],
  moon: [
    [[63,13],[78,17],[66,28],[52,31]],
    [[52,31],[66,28],[59,45],[43,50]],
    [[43,50],[59,45],[58,62],[39,68]],
    [[39,68],[58,62],[66,78],[45,88]],
    [[45,88],[66,78],[80,85],[61,99]],
    [[61,99],[38,91],[29,72],[39,68]],
    [[39,68],[29,72],[27,49],[43,50]],
    [[43,50],[27,49],[37,27],[52,31]],
    [[52,31],[37,27],[63,13],[63,13]]
  ],
  prism: [ // Noema: hexagonal lens, six edge facets around an eye core
    [[50,25],[85,45],[71,53],[50,41]],
    [[85,45],[85,85],[71,77],[71,53]],
    [[85,85],[50,105],[50,89],[71,77]],
    [[50,105],[15,85],[29,77],[50,89]],
    [[15,85],[15,45],[29,53],[29,77]],
    [[15,45],[50,25],[50,41],[29,53]],
    [[50,49],[64,65],[50,81],[36,65]],
    [[44,59],[56,59],[56,71],[44,71]],
    [[47,30],[53,30],[53,36],[47,36]]
  ],
  hexagram: [ // Aurel: interlocked triangles, six points around a core
    [[50,15],[61,38],[50,45],[39,38]],
    [[15,90],[35,90],[42,76],[26,70]],
    [[85,90],[65,90],[58,76],[74,70]],
    [[50,115],[39,92],[50,85],[61,92]],
    [[15,40],[35,40],[42,54],[26,60]],
    [[85,40],[65,40],[58,54],[74,60]],
    [[38,52],[62,52],[66,65],[34,65]],
    [[34,65],[66,65],[62,78],[38,78]],
    [[50,57],[58,65],[50,73],[42,65]]
  ],
  halo: [ // Michael: halo ring quarters, spearhead and shaft, the orb
    [[50,12],[66,28],[58,28],[50,20]],
    [[66,28],[50,44],[50,36],[58,28]],
    [[50,44],[34,28],[42,28],[50,36]],
    [[34,28],[50,12],[50,20],[42,28]],
    [[50,48],[58,62],[50,58],[42,62]],
    [[47,58],[53,58],[53,86],[47,86]],
    [[47,86],[53,86],[53,114],[47,114]],
    [[72,78],[82,88],[72,98],[62,88]],
    [[70,82],[76,82],[76,88],[70,88]]
  ],
  wheel: [ // Seraph: wheel within a wheel, crossed spokes, burning core
    [[50,23],[92,65],[80,65],[50,35]],
    [[92,65],[50,107],[50,95],[80,65]],
    [[50,107],[8,65],[20,65],[50,95]],
    [[8,65],[50,23],[50,35],[20,65]],
    [[50,40],[75,65],[50,90],[25,65]],
    [[50,53],[62,65],[50,77],[38,65]],
    [[20,62],[80,62],[80,68],[20,68]],
    [[47,35],[53,35],[53,95],[47,95]],
    [[46,61],[54,61],[54,69],[46,69]]
  ]
};

function omniaPointString(poly) {
  return poly.map(function(p) { return p[0].toFixed(2) + ',' + p[1].toFixed(2); }).join(' ');
}

function omniaLerpPoly(a, b, t) {
  return a.map(function(p, i) {
    return [
      p[0] + (b[i][0] - p[0]) * t,
      p[1] + (b[i][1] - p[1]) * t
    ];
  });
}

function omniaEaseMorph(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function omniaMorphOutline(sym, color) {
  if (sym.id === 'triangle') {
    return '<g id="omniaShardOutline" opacity="0" fill="none" stroke="' + color + '" stroke-linecap="round" stroke-linejoin="round">'
      + '<path d="M50 8 L89 88 L11 88 Z" stroke-width="2.25"/>'
      + '<path d="M50 33 L69 82 L31 82 Z" stroke-width="1.15" opacity=".72"/>'
      + '<circle cx="50" cy="67" r="10" stroke-width="1" opacity=".62"/>'
      + '</g>';
  }
  if (sym.id === 'sun') {
    return '<g id="omniaShardOutline" opacity="0" fill="none" stroke="' + color + '" stroke-linecap="round" stroke-linejoin="round">'
      + '<circle cx="50" cy="65" r="25" stroke-width="2.2"/>'
      + '<circle cx="50" cy="65" r="9" stroke-width="1.1" opacity=".78"/>'
      + '<path d="M50 8 V27 M50 103 V122 M7 65 H26 M74 65 H93 M24 23 L38 37 M76 23 L62 37 M24 107 L38 93 M76 107 L62 93" stroke-width="1.55"/>'
      + '</g>';
  }
  if (sym.id === 'moon') {
    return '<g id="omniaShardOutline" opacity="0" fill="none" stroke="' + color + '" stroke-linecap="round" stroke-linejoin="round">'
      + '<path d="M63 13 C40 19 27 37 30 58 C34 80 54 91 76 82 C61 77 51 63 53 47 C55 31 65 20 80 15 C74 12 68 11 63 13 Z" stroke-width="2.25"/>'
      + '<path d="M38 27 C29 44 31 72 45 88" stroke-width="1" opacity=".48"/>'
      + '<path d="M36 24 L35 29 M24 50 L29 50 M43 82 L47 86" stroke-width="1" opacity=".58"/>'
      + '</g>';
  }
  if (sym.id === 'prism') {
    return '<g id="omniaShardOutline" opacity="0" fill="none" stroke="' + color + '" stroke-linecap="round" stroke-linejoin="round">'
      + '<path d="M50 25 L85 45 L85 85 L50 105 L15 85 L15 45 Z" stroke-width="2.2"/>'
      + '<path d="M50 41 L71 53 L71 77 L50 89 L29 77 L29 53 Z" stroke-width="1" opacity=".55"/>'
      + '<ellipse cx="50" cy="65" rx="14" ry="9" stroke-width="1.2" opacity=".78"/>'
      + '<circle cx="50" cy="65" r="3.5" stroke-width="1.1" opacity=".85"/>'
      + '</g>';
  }
  if (sym.id === 'hexagram') {
    return '<g id="omniaShardOutline" opacity="0" fill="none" stroke="' + color + '" stroke-linecap="round" stroke-linejoin="round">'
      + '<path d="M50 15 L85 90 L15 90 Z" stroke-width="2.2"/>'
      + '<path d="M50 115 L15 40 L85 40 Z" stroke-width="2.2"/>'
      + '<circle cx="50" cy="65" r="9" stroke-width="1.1" opacity=".72"/>'
      + '</g>';
  }
  if (sym.id === 'halo') {
    return '<g id="omniaShardOutline" opacity="0" fill="none" stroke="' + color + '" stroke-linecap="round" stroke-linejoin="round">'
      + '<circle cx="50" cy="28" r="16" stroke-width="2.2"/>'
      + '<path d="M50 48 L58 62 L50 58 L42 62 Z" stroke-width="1.4"/>'
      + '<line x1="50" y1="58" x2="50" y2="114" stroke-width="2"/>'
      + '<circle cx="72" cy="88" r="10" stroke-width="1.5" opacity=".8"/>'
      + '</g>';
  }
  if (sym.id === 'wheel') {
    return '<g id="omniaShardOutline" opacity="0" fill="none" stroke="' + color + '" stroke-linecap="round" stroke-linejoin="round">'
      + '<circle cx="50" cy="65" r="42" stroke-width="2.2"/>'
      + '<circle cx="50" cy="65" r="25" stroke-width="1.4" opacity=".75"/>'
      + '<path d="M50 23 V107 M8 65 H92" stroke-width="1" opacity=".5"/>'
      + '<circle cx="50" cy="65" r="6" stroke-width="1.2" opacity=".85"/>'
      + '<circle cx="50" cy="40" r="2.2" stroke-width="1" opacity=".6"/><circle cx="75" cy="65" r="2.2" stroke-width="1" opacity=".6"/>'
      + '<circle cx="50" cy="90" r="2.2" stroke-width="1" opacity=".6"/><circle cx="25" cy="65" r="2.2" stroke-width="1" opacity=".6"/>'
      + '</g>';
  }
  return '<g id="omniaShardOutline" opacity="0" fill="none" stroke="' + color + '" stroke-linecap="round" stroke-linejoin="round">'
    + '<path d="M8 65 C22 39 39 31 50 31 C61 31 78 39 92 65 C78 91 61 99 50 99 C39 99 22 91 8 65 Z" stroke-width="2.15"/>'
    + '<circle cx="50" cy="65" r="18" stroke-width="1.6"/>'
    + '<circle cx="50" cy="65" r="7" stroke-width="1.2" fill="#06131f" fill-opacity=".75"/>'
    + '<path d="M20 47 C35 36 65 36 80 47 M20 83 C35 94 65 94 80 83" stroke-width=".85" opacity=".44"/>'
    + '</g>';
}

function animateOmniaShardMorph(sym, figId, svgId) {
  var fig = document.getElementById(figId || 'guideOmniaFigure');
  var svg = document.getElementById(svgId || 'guideOmniaShardSvg');
  if (!fig || !svg) return;
  if (omniaMorphRaf) cancelAnimationFrame(omniaMorphRaf);
  var entityId = (omniaState && omniaState.cosmetics && omniaState.cosmetics.entity) || 'omnia';
  var from = OMNIA_ENTITY_MORPH_SHARDS[entityId] || OMNIA_CRYSTAL_MORPH_SHARDS;
  var to = OMNIA_MORPH_TARGETS[sym.id] || OMNIA_MORPH_TARGETS.eye;
  var color = sym.color || '#b8eaff';
  svg.innerHTML = '<defs><filter id="omniaShardGlow" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="2.2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>';
  var polys = from.map(function(poly, idx) {
    var el = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
    el.setAttribute('points', omniaPointString(poly));
    el.setAttribute('fill', color);
    el.setAttribute('fill-opacity', idx === 8 ? '.18' : '.26');
    el.setAttribute('stroke', color);
    el.setAttribute('stroke-width', idx === 8 ? '1.1' : '1.35');
    el.setAttribute('stroke-opacity', '.86');
    el.setAttribute('filter', 'url(#omniaShardGlow)');
    svg.appendChild(el);
    return el;
  });
  svg.insertAdjacentHTML('beforeend', omniaMorphOutline(sym, color));
  var outline = svg.querySelector('#omniaShardOutline');
  fig.classList.remove('morphing');
  void fig.offsetWidth;
  fig.classList.add('morphing');
  var start = performance.now();
  var inwardMs = 760;
  var holdMs = 650;
  var outwardMs = 640;
  var totalMs = inwardMs + holdMs + outwardMs;
  function frame(now) {
    var elapsed = now - start;
    var t;
    if (elapsed <= inwardMs) {
      t = omniaEaseMorph(elapsed / inwardMs);
      svg.style.opacity = String(0.3 + t * 0.7);
      if (outline) outline.setAttribute('opacity', String(Math.max(0, (t - 0.58) / 0.42)));
      polys.forEach(function(poly, idx) {
        poly.setAttribute('points', omniaPointString(omniaLerpPoly(from[idx], to[idx], t)));
      });
    } else if (elapsed <= inwardMs + holdMs) {
      svg.style.opacity = '1';
      if (outline) outline.setAttribute('opacity', '1');
      polys.forEach(function(poly, idx) { poly.setAttribute('points', omniaPointString(to[idx])); });
    } else if (elapsed <= totalMs) {
      t = omniaEaseMorph((elapsed - inwardMs - holdMs) / outwardMs);
      svg.style.opacity = String(1 - t * 0.75);
      if (outline) outline.setAttribute('opacity', String(1 - t));
      polys.forEach(function(poly, idx) {
        poly.setAttribute('points', omniaPointString(omniaLerpPoly(to[idx], from[idx], t)));
      });
    } else {
      fig.classList.remove('morphing');
      svg.innerHTML = '';
      svg.style.opacity = '0';
      omniaMorphRaf = null;
      return;
    }
    omniaMorphRaf = requestAnimationFrame(frame);
  }
  omniaMorphRaf = requestAnimationFrame(frame);
}

function renderOmniaMorphSymbol(sym) {
  var color = sym.color || '#b8eaff';
  if (sym.id === 'triangle') {
    return '<svg viewBox="0 0 100 100" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">'
      + '<defs><filter id="omTriGlow"><feGaussianBlur stdDeviation="2.4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>'
      + '<path d="M50 9 L88 80 L12 80 Z" fill="none" stroke="' + color + '" stroke-width="2.2" filter="url(#omTriGlow)"/>'
      + '<path d="M50 25 L73 72 L27 72 Z" fill="rgba(212,176,142,.08)" stroke="' + color + '" stroke-width="1" opacity=".72"/>'
      + '<circle cx="50" cy="58" r="12" fill="none" stroke="' + color + '" stroke-width="1.4" opacity=".72"/>'
      + '<line x1="50" y1="9" x2="50" y2="80" stroke="' + color + '" stroke-width=".8" opacity=".45"/>'
      + '</svg>';
  }
  if (sym.id === 'sun') {
    return '<svg viewBox="0 0 100 100" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">'
      + '<defs><filter id="omSunGlow"><feGaussianBlur stdDeviation="2.6" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>'
      + '<g stroke="' + color + '" stroke-width="1.6" stroke-linecap="round" filter="url(#omSunGlow)">'
      + '<line x1="50" y1="7" x2="50" y2="21"/><line x1="50" y1="79" x2="50" y2="93"/><line x1="7" y1="50" x2="21" y2="50"/><line x1="79" y1="50" x2="93" y2="50"/>'
      + '<line x1="20" y1="20" x2="30" y2="30"/><line x1="70" y1="70" x2="80" y2="80"/><line x1="20" y1="80" x2="30" y2="70"/><line x1="70" y1="30" x2="80" y2="20"/>'
      + '</g><circle cx="50" cy="50" r="23" fill="rgba(240,211,154,.08)" stroke="' + color + '" stroke-width="2.2"/>'
      + '<circle cx="50" cy="50" r="9" fill="none" stroke="' + color + '" stroke-width="1.2" opacity=".75"/>'
      + '</svg>';
  }
  if (sym.id === 'moon') {
    return '<svg viewBox="0 0 100 100" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">'
      + '<defs><filter id="omMoonGlow"><feGaussianBlur stdDeviation="2.4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>'
      + '<path d="M63 13 C40 19 27 37 30 58 C34 80 54 91 76 82 C61 77 51 63 53 47 C55 31 65 20 80 15 C74 12 68 11 63 13 Z" fill="rgba(196,168,212,.11)" stroke="' + color + '" stroke-width="2.2" filter="url(#omMoonGlow)"/>'
      + '<circle cx="35" cy="25" r="2" fill="' + color + '" opacity=".72"/><circle cx="24" cy="50" r="1.6" fill="' + color + '" opacity=".5"/><circle cx="43" cy="82" r="1.8" fill="' + color + '" opacity=".58"/>'
      + '</svg>';
  }
  if (sym.id === 'prism') {
    return '<svg viewBox="0 0 100 100" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">'
      + '<defs><filter id="omPrismGlow"><feGaussianBlur stdDeviation="2.4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>'
      + '<path d="M50 12 L82 31 L82 69 L50 88 L18 69 L18 31 Z" fill="rgba(152,180,204,.08)" stroke="' + color + '" stroke-width="2.2" filter="url(#omPrismGlow)"/>'
      + '<path d="M50 26 L69 38 L69 62 L50 74 L31 62 L31 38 Z" fill="none" stroke="' + color + '" stroke-width="1" opacity=".55"/>'
      + '<ellipse cx="50" cy="50" rx="13" ry="8.5" fill="rgba(184,220,245,.1)" stroke="' + color + '" stroke-width="1.2" opacity=".85"/>'
      + '<circle cx="50" cy="50" r="3.4" fill="' + color + '" opacity=".9"/>'
      + '<circle cx="51.4" cy="48.4" r="1.1" fill="#fff" opacity=".8"/>'
      + '</svg>';
  }
  if (sym.id === 'hexagram') {
    return '<svg viewBox="0 0 100 100" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">'
      + '<defs><filter id="omHexGlow"><feGaussianBlur stdDeviation="2.4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>'
      + '<path d="M50 8 L78 66 L22 66 Z" fill="rgba(240,211,154,.07)" stroke="' + color + '" stroke-width="2" filter="url(#omHexGlow)"/>'
      + '<path d="M50 92 L22 34 L78 34 Z" fill="rgba(240,211,154,.07)" stroke="' + color + '" stroke-width="2" filter="url(#omHexGlow)"/>'
      + '<circle cx="50" cy="50" r="8" fill="none" stroke="' + color + '" stroke-width="1.2" opacity=".8"/>'
      + '<circle cx="50" cy="50" r="2.6" fill="' + color + '" opacity=".85"/>'
      + '</svg>';
  }
  if (sym.id === 'halo') {
    return '<svg viewBox="0 0 100 100" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">'
      + '<defs><filter id="omHaloGlow"><feGaussianBlur stdDeviation="2.4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>'
      + '<circle cx="50" cy="22" r="13" fill="none" stroke="' + color + '" stroke-width="2.2" filter="url(#omHaloGlow)"/>'
      + '<path d="M50 40 L56 51 L50 48 L44 51 Z" fill="rgba(196,168,212,.16)" stroke="' + color + '" stroke-width="1.2"/>'
      + '<line x1="50" y1="48" x2="50" y2="92" stroke="' + color + '" stroke-width="2" stroke-linecap="round"/>'
      + '<circle cx="68" cy="72" r="8" fill="rgba(196,168,212,.12)" stroke="' + color + '" stroke-width="1.4" opacity=".9"/>'
      + '<circle cx="70.5" cy="69.5" r="1.6" fill="#fff" opacity=".7"/>'
      + '</svg>';
  }
  if (sym.id === 'wheel') {
    return '<svg viewBox="0 0 100 100" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">'
      + '<defs><filter id="omWheelGlow"><feGaussianBlur stdDeviation="2.4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>'
      + '<circle cx="50" cy="50" r="36" fill="rgba(240,200,96,.05)" stroke="' + color + '" stroke-width="2.2" filter="url(#omWheelGlow)"/>'
      + '<circle cx="50" cy="50" r="21" fill="none" stroke="' + color + '" stroke-width="1.4" opacity=".8"/>'
      + '<path d="M50 14 V86 M14 50 H86" stroke="' + color + '" stroke-width=".9" opacity=".45"/>'
      + '<circle cx="50" cy="50" r="5" fill="' + color + '" opacity=".85"/>'
      + '<g fill="' + color + '" opacity=".75">'
      + '<circle cx="50" cy="29" r="2.2"/><circle cx="71" cy="50" r="2.2"/><circle cx="50" cy="71" r="2.2"/><circle cx="29" cy="50" r="2.2"/>'
      + '</g>'
      + '<circle cx="51.6" cy="48.4" r="1.4" fill="#fff" opacity=".75"/>'
      + '</svg>';
  }
  return '<svg viewBox="0 0 100 100" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">'
    + '<defs><radialGradient id="omEyeIris" cx="50%" cy="50%" r="50%"><stop offset="0%" stop-color="#dff8ff"/><stop offset="58%" stop-color="#6ab8d8"/><stop offset="100%" stop-color="#174a64"/></radialGradient><filter id="omEyeGlow"><feGaussianBlur stdDeviation="2.5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>'
    + '<path d="M9 50 C22 25 39 17 50 17 C61 17 78 25 91 50 C78 75 61 83 50 83 C39 83 22 75 9 50 Z" fill="rgba(184,234,255,.08)" stroke="' + color + '" stroke-width="2" filter="url(#omEyeGlow)"/>'
    + '<circle cx="50" cy="50" r="19" fill="url(#omEyeIris)" opacity=".92"/><circle cx="50" cy="50" r="8" fill="#06131f"/>'
    + '<circle cx="57" cy="43" r="4.2" fill="#fff" opacity=".66"/>'
    + '<path d="M15 50 C29 38 39 34 50 34 C61 34 71 38 85 50" fill="none" stroke="#fff" stroke-width=".8" opacity=".26"/>'
    + '</svg>';
}

function morphOmniaFigureBy(figId, layerId, svgId) {
  var fig = document.getElementById(figId);
  var layer = document.getElementById(layerId);
  if (!fig || !layer) return;
  var entityId = (omniaState && omniaState.cosmetics && omniaState.cosmetics.entity) || 'omnia';
  var entity = omniaFindCosmetic(OMNIA_ENTITIES, entityId) || OMNIA_ENTITIES[0];
  var symbols = OMNIA_ENTITY_MORPH_SYMBOLS[entityId] || OMNIA_ENTITY_MORPH_SYMBOLS.omnia;
  if (!symbols || !symbols.length) symbols = OMNIA_ENTITY_MORPH_SYMBOLS.omnia;
  if (typeof omniaMorphIndexes[entityId] !== 'number') omniaMorphIndexes[entityId] = 0;
  var baseSym = symbols[omniaMorphIndexes[entityId] % symbols.length];
  var palette = omniaFindCosmetic(OMNIA_PALETTES, (omniaState.cosmetics && omniaState.cosmetics.palette) || 'aether');
  var sym = Object.assign({}, baseSym, { color: palette.color || baseSym.color });
  omniaMorphIndexes[entityId]++;
  if (omniaMorphTimer) clearTimeout(omniaMorphTimer);
  layer.innerHTML = renderOmniaMorphSymbol(sym);
  layer.style.color = sym.color;
  fig.setAttribute('aria-label', entity.name + ' reveals ' + sym.label);
  animateOmniaShardMorph(sym, figId, svgId);
  omniaMorphTimer = setTimeout(function() {
    fig.setAttribute('aria-label', 'Reveal a ' + entity.name + ' symbol');
  }, 2200);
}
function morphGuideOmnia() {
  morphOmniaFigureBy('guideOmniaFigure', 'guideOmniaSymbolLayer', 'guideOmniaShardSvg');
}
function morphOmniaCenter() {
  morphOmniaFigureBy('omniaCenterFigure', 'omniaCenterSymbolLayer', 'omniaCenterShardSvg');
}
function morphPathBannerOmnia() {
  morphOmniaFigureBy('pathBannerOmniaFigure', 'pathBannerOmniaSymbolLayer', 'pathBannerOmniaShardSvg');
}
