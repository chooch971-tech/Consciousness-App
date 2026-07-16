// Omnia cosmetic catalog and palette relationships. `_price` is the canonical
// tier price; `cost` is the shop price before the Attunement discount.
var OMNIA_PALETTES = [
  { id:'aether', name:'Aether Blue', cost:0, _price:0, color:'#b8eaff', filter:'none', sub:'Original crystalline guide-light' },
  { id:'rose', name:'Rose Astral', cost:6800, _price:6800, color:'#ffc4d8', filter:'hue-rotate(128deg) saturate(1.28) brightness(1.08)', sub:'A softer astral radiance' },
  { id:'solar', name:'Solar Gold', cost:9200, _price:9200, color:'#f0d39a', filter:'hue-rotate(182deg) saturate(1.2) brightness(1.1)', sub:'A warm body of will' },
  { id:'violet', name:'Violet Mind', cost:11800, _price:11800, color:'#c4a8d4', filter:'hue-rotate(74deg) saturate(1.22) brightness(1.04)', sub:'A quiet mental flame' },
  { id:'verdant', name:'Verdant Vessel', cost:14500, _price:14500, color:'#98d8bd', filter:'hue-rotate(246deg) saturate(1.12) brightness(1.02)', sub:'A healing green current' },
  { id:'crimson', name:'Crimson Flame', cost:13500, _price:13500, color:'#e8554f', filter:'hue-rotate(162deg) saturate(1.3) brightness(1.05)', sub:"Archangel Michael's own warrior-fire" },
  { id:'aurora', name:'Aurora Veil', cost:0, _price:0, color:'#a8e8c8', filter:'none', sub:'A living prism — the full spectrum cycling endlessly' }
];

// Veils layer on top of the selected palette instead of replacing it.
var OMNIA_VEILS = [
  { id:'spectral', name:'Spectral Veil', cost:14500, _price:14500, color:'rgba(216,236,255,0.42)', sub:'A near-invisible ghost — only the glowing edges pulse into view, over any color' }
];

// `dm:true` items are the Dark Current line: priced in Dark Matter ◆ (not
// akasha), visible only once Dark Matter awakens (Prestige 3 / Book II), and
// granting a Dark Matter earn bonus (`dmBonus` %) instead of the akasha bonus.
// TEMP preview: while on, the Dark Current cosmetics show in the shop before
// Prestige 3 and are free, so they can be viewed equipped in-game. It does NOT
// grant the ◆ earn boost (that stays gated on real Book II). Set false to
// restore the real ◆-priced, Prestige-3-gated behavior before launch.
var DARK_CURRENT_PREVIEW = true;
var OMNIA_ENTITIES = [
  { id:'omnia', name:'Omnia', cost:0, _price:0, color:'#b8eaff', sub:'The first guide-form' },
  { id:'noema', name:'Noema', cost:12000, _price:12000, color:'#98b4cc', sub:'A sharper mental entity design' },
  { id:'aurel', name:'Aurel', cost:18000, _price:18000, color:'#f0d39a', sub:'A solar entity design for disciplined work' },
  { id:'elys', name:'Archangel Michael', cost:26000, _price:26000, color:'#c4a8d4', sub:'The standing archangel — halo, spear, and orb' },
  { id:'seraph', name:'Seraph', cost:34000, _price:34000, dmBonus:1, color:'#f3d486', sub:'A biblically accurate angel — wheels within wheels, eyes of flame' },
  { id:'darkomnia', name:'Dark Omnia', cost:2400, _price:2400, dm:true, dmBonus:12, color:'#c4a8d4', sub:'Omnia\'s form turned to the dark current — where she casts light, this casts dark' }
];

// Hand-tuned hue rotations relative to the blue Omnia crystal (#b8eaff).
var OMNIA_HUE_FROM_BLUE = {
  aether:0, rose:128, solar:182, violet:74, verdant:246, crimson:162,
  omnia:0, noema:0, aurel:182, elys:74, seraph:182, darkomnia:74
};

// Native and automatically unlocked palettes keep form artwork and swatches aligned.
var OMNIA_ENTITY_NATIVE_PALETTE = { omnia:'aether', noema:'aether', aurel:'solar', elys:'violet', seraph:'solar', darkomnia:'violet' };
var OMNIA_ENTITY_AUTO_PALETTE = { noema:'violet', aurel:'solar', elys:'violet', seraph:'solar', darkomnia:'violet' };

var OMNIA_COMPANIONS = [
  { id:'wisp', name:'Akashic Wisp', cost:5400, _price:5400, color:'#b8eaff', sub:'A small orbiting practice companion' },
  { id:'ember', name:'Solar Ember', cost:7600, _price:7600, color:'#f0d39a', sub:'A warm companion for steady effort' },
  { id:'mote', name:'Violet Mote', cost:9800, _price:9800, color:'#c4a8d4', sub:'A tiny watcher for mental work' },
  { id:'corgi', name:'Astral Corgi', cost:14500, _price:14500, color:'#d9a069', sub:'A loyal little companion for returning to practice' },
  { id:'gnome', name:'Vein Gnome', cost:800, _price:800, dm:true, dmBonus:8, color:'#d8c4f4', sub:'An earth elemental — keeper of the dark veins. His lantern holds a live shard' }
];
