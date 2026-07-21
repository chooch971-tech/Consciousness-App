// Omnia economy defaults and foundational metadata.
var OMNIA_DEFAULT = {
  akasha: 0,
  reservoir: 0,
  lastTick: Date.now(),
  bodies: { physical:1, astral:1, mental:1 },
  upgrades: {
    current:1, gen2:1, gen3:1,
    vessel:1, attunement:1, quickening:1,
    vessel2:1, attune2:1, quick2:1,
    vessel3:1, attune3:1, quick3:1,
    dm1:1, dmv1:1, dms1:1, dmr1:1,
    dm2:1, dmv2:1, dms2:1, dmr2:1,
    dm3:1, dmv3:1, dms3:1, dmr3:1
  },
  bardonStep:1,
  prestige:0,
  darkMatter:0,
  totalDarkMatterEarned:0, // monotonic — used for sync scoring
  rec: null,
  recStreak: 0,
  completedRecommended: 0,
  totalAkashaEarned: 0,
  totalAkashaSpent: 0, // monotonic — every akasha sink adds to this; used so spending never lowers the sync progress score
  bodyAwardSelectionDate: '',
  bodyAwardSelectionIds: [],
  bodyAwardClaimedIds: [],
  storySeen: [],   // ids of OMNIA_STORY beats already revealed
  storyRead: 0,    // how many revealed beats the user has viewed in the chat
  cosmetics: {
    palette:'aether',
    entity:'omnia',
    companion:null,
    veil:null,
    unlockedPalettes:['aether'],
    unlockedEntities:['omnia'],
    unlockedCompanions:[],
    unlockedVeils:[]
  }
};

var OMNIA_BODY_META = {
  physical: { name:'Physical Body', color:'#d49898', desc:'steadiness, posture, vitality' },
  astral: { name:'Astral Body', color:'#c4a8d4', desc:'feeling, image, symbol' },
  mental: { name:'Mental Body', color:'#98b4cc', desc:'attention, silence, command' }
};

var OMNIA_EXERCISE_META = {
  clock: { name:'Clock', body:'mental', open:'clock', text:'Follow the seconds hand until attention breaks. Omnia wants clean, honest concentration.' },
  visual: { name:'Visualization', body:'astral', open:'visual', text:'Hold one image until it steadies. This feeds Omnia with form and color.' },
  auditory: { name:'Auditory', body:'astral', open:'auditory', text:'Listen without leaning forward. The astral body learns through subtle vibration.' },
  sense: { name:'Sense Concentration', body:'astral', open:'sense', text:'Evoke a feeling, smell, or taste from imagination alone. The astral body is built from inner sensation.' },
  thought: { name:'Thought Control', body:'mental', open:'thought', text:'Observe, focus, or empty the mind. This strengthens Omnia\'s mental body.' },
  asana: { name:'Asana', body:'physical', open:'asana', text:'Make the body still enough to become a reliable instrument.' },
  pore_breathing: { name:'Pore Breathing', body:'physical', open:'soulmirror', text:'Draw vitality through the whole body. Omnia needs a living vessel, not only light.' }
};

var OMNIA_UPGRADES = [
  { id:'current', name:'Generator I', sub:'Akashic current — akasha generated per hour', base:520, step:260 },
  { id:'gen2', name:'Generator II', sub:'A second akashic current (opens at Step V)', base:520, step:260 },
  { id:'gen3', name:'Generator III', sub:'A third akashic current (opens at Step IX)', base:520, step:260 },
  { id:'vessel', name:'Deep Vessel', sub:'Reservoir capacity before overflow', base:480, step:240 },
  { id:'attunement', name:'Attunement', sub:'Cheapens cosmetics, engine upgrades, and body levels', base:640, step:320 },
  { id:'quickening', name:'Quickening', sub:'Speeds generator upgrade construction', base:600, step:300 },
  { id:'vessel2', name:'Deep Vessel', sub:'Reservoir capacity before overflow', base:480, step:240 },
  { id:'attune2', name:'Attunement', sub:'Cheapens this generator\'s upgrades', base:640, step:320 },
  { id:'quick2', name:'Quickening', sub:'Speeds this generator\'s construction', base:600, step:300 },
  { id:'vessel3', name:'Deep Vessel', sub:'Reservoir capacity before overflow', base:480, step:240 },
  { id:'attune3', name:'Attunement', sub:'Cheapens this generator\'s upgrades', base:640, step:320 },
  { id:'quick3', name:'Quickening', sub:'Speeds this generator\'s construction', base:600, step:300 }
];
