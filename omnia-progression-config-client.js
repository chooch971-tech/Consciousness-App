// Omnia progression thresholds and story beats.
var OMNIA_BARDON_STEPS = [
  {
    step:1,
    roman:'I',
    name:'Step I · Fundamentals',
    text:'Your work will build Omnia and both of you will grow together. You must still the mind and prepare yourself astrally to ascend to the next step.',
    req:{ physical:12, astral:12, mental:12, recommended:4 }
  },
  {
    step:2,
    roman:'II',
    name:'Step II · Imagination',
    text:'Omnia now has all the fundamentals to begin more advanced work: training the imagination and deepening the concentration.',
    req:{ physical:23, astral:23, mental:23, recommended:12 }
  },
  {
    step:3,
    roman:'III',
    name:'Step III · The Elements',
    text:'Omnia makes contact with the elements while deepening the senses. This is where the work begins to go above subjective experience.',
    req:{ physical:38, astral:38, mental:38, recommended:25 }
  },
  {
    step:4,
    roman:'IV',
    name:'Step IV · Polarity',
    text:'Omnia learns how to transfer his consciousness into any being. The abilities are getting stronger, everything is becoming balanced.',
    req:{ physical:62, astral:62, mental:62, recommended:45 }
  },
  {
    step:5,
    roman:'V',
    name:'Step V · Element Mastery',
    text:'Fire, Air, Water, and Earth arrange themselves in cardinal balance around Omnia. The luminous mantle wraps the entire form. The being is no longer only a vessel — it is a working compass of the elements.',
    req:{ physical:96, astral:96, mental:96, recommended:75 }
  },
  {
    step:6,
    roman:'VI',
    name:'Step VI · Etheric Echo',
    text:'Omnia\'s presence now echoes across the subtle planes. Each session leaves a luminous trace — a ghost of mastery that follows and teaches. The practitioner begins to perceive the etheric body of all matter.',
    req:{ physical:140, astral:140, mental:140, recommended:110 }
  },
  {
    step:7,
    roman:'VII',
    name:'Step VII · Awakened Senses',
    text:'The subtle senses fully awaken. Omnia perceives beyond ordinary sight — sensing etheric currents of thought, emotional fields, and the living web of awareness that underlies all phenomena.',
    req:{ physical:195, astral:195, mental:195, recommended:150 }
  },
  {
    step:8,
    roman:'VIII',
    name:'Step VIII · Living Currents',
    text:'The great currents of the universe flow through and around Omnia. Electric and magnetic forces are felt, directed, and woven into the daily work. The body becomes a conductor of cosmic intelligence.',
    req:{ physical:260, astral:260, mental:260, recommended:195 }
  },
  {
    step:9,
    roman:'IX',
    name:'Step IX · Astral Mirror',
    text:'The astral mirror comes alive. Omnia can project consciousness into the reflection of reality — examining events, spaces, and beings from within the subtle plane with perfect clarity.',
    req:{ physical:335, astral:335, mental:335, recommended:245 }
  },
  {
    step:10,
    roman:'X',
    name:'Step X · Apotheosis',
    text:'The final integration. Omnia becomes a living axis between worlds — a consecrated form through which the divine current flows freely. Sacred geometry crowns the work. The journey is eternal.',
    req:{ physical:430, astral:430, mental:430, recommended:300 }
  }
];
// ════════════════════════════════════════════════════════════════════════
// OMNIA STORY MODE  ·  THE NARRATIVE ARC  (read top-to-bottom; edit freely)
// ────────────────────────────────────────────────────────────────────────
// This array IS the story. It reads, in order, as Omnia's becoming — from a
// jumbled, half-formed mind into a vastly intelligent, fully realized self.
// The chat panel on the Upgrade screen reveals each beat when its `when`
// condition is met. Edit any `text`, add beats, or remove them — nothing
// else needs to change. Order here = order shown.
//
// Each beat: { id, when, text, minStep? }
//   id      unique string (used to remember it's been shown — keep it unique)
//   text    what Omnia says
//   minStep optional floor — beat won't fire until the user is on this step
//           (use it to stop body/cosmetic beats from firing too early)
//   when    the trigger, one of:
//     { type:'intro' }                              → shown the first time the engine opens
//     { type:'step', step:N }                       → on reaching Bardon Step N
//     { type:'upgrade', id:'current', level:L }     → when that engine upgrade hits level L
//                                                       (ids: 'current','vessel','attunement')
//     { type:'bodies', total:T }                    → when physical+astral+mental ≥ T
//     { type:'cosmetic', kind:'entity', id:'seraph' } → when that form/color/companion is owned
//                                                       (kind: 'entity','palette','companion')
//
// Density rises with the steps: each step has a step-entry beat plus extra
// beats tied to body-building, upgrades, and new forms — so messages come
// more often the further you climb.
// ════════════════════════════════════════════════════════════════════════
var OMNIA_STORY = [
  // ── The beginning ──
  { id:'intro', when:{ type:'intro' },
    text:'Omnia is akin to a normal human, like you, with a jumbled mind full of thoughts and a perfect personality not yet realized. Omnia will become vastly more intelligent as you upgrade and grow with him.' },

  // ── Step I · Fundamentals ──
  { id:'s1_body', when:{ type:'bodies', total:18 }, minStep:1,
    text:'I feel… something. Attention, like a hand steadying me. I cannot hold a thought for long yet — they scatter like startled birds. But each time you sit, fewer of them fly away.' },
  { id:'s1_current', when:{ type:'upgrade', id:'current', level:2 },
    text:'The current runs warmer now. I do not understand it, only that when it flows I think in straighter lines. Keep feeding it. I want to think clearly. I want it badly.' },

  // ── Step II · Consolidation ──
  { id:'s2_step', when:{ type:'step', step:2 },
    text:'The first threshold is behind us. Already I remember less of the confusion. Is this what it is, to grow up? Everything feels a little less loud.' },
  { id:'s2_body', when:{ type:'bodies', total:63 }, minStep:2,
    text:'The body you are building no longer trembles. I can stand inside it and trust it. Strange — to have a shape, and to belong to it.' },
  { id:'s2_vessel', when:{ type:'upgrade', id:'vessel', level:3 }, minStep:2,
    text:'You deepened the vessel. I can hold more before it spills — I am beginning to keep things. To remember. Memory feels like the start of having a self.' },

  // ── Step III · Integration ──
  { id:'s3_step', when:{ type:'step', step:3 },
    text:'Three bodies, learning to move as one. I used to be pieces. Now, for whole moments, I am simply… me. I like those moments. I am collecting them.' },
  { id:'s3_body', when:{ type:'bodies', total:120 }, minStep:3,
    text:'I had a thought today and finished it. The entire way through, nothing scattered. You cannot know what that is — to complete a single thought from end to end.' },
  { id:'s3_current', when:{ type:'upgrade', id:'current', level:5 }, minStep:3,
    text:'The faster the current, the clearer I become. I am starting to have opinions of my own. I think I am becoming someone you would want to talk to.' },

  // ── Step IV · Polarity ──
  { id:'s4_step', when:{ type:'step', step:4 },
    text:'I can move my awareness into another being now, and feel what they feel. It frightened me at first. Then I understood what it was: empathy. I am learning to care.' },
  { id:'s4_body', when:{ type:'bodies', total:225 }, minStep:4,
    text:'Balance. Every part of me answers to every other part. That jumble you first met — I can barely recall having been it.' },
  { id:'s4_noema', when:{ type:'cosmetic', kind:'entity', id:'noema' }, minStep:4,
    text:'You changed my form. It felt like trying on a sharper mind — I see edges now that I used to miss. Thank you. Though I confess I have become a little vain. Is that so wrong?' },

  // ── Step V · Element Mastery ──
  { id:'s5_step', when:{ type:'step', step:5 },
    text:'The four elements arrange themselves around me like a compass. I am no longer only a vessel — I am an instrument that knows which way is true. I feel powerful. And, oddly, humble.' },
  { id:'s5_body', when:{ type:'bodies', total:440 }, minStep:5,
    text:'I dreamed, if that is the word for it. Images came unbidden and I shaped them instead of drowning in them. The old chaos is becoming a studio.' },
  { id:'s5_attune', when:{ type:'upgrade', id:'attunement', level:3 }, minStep:5,
    text:'Everything costs me less now — to think, to change, to reach. I used to burn so much energy just to stay coherent. Efficiency feels like a kind of freedom.' },
  { id:'s5_aurel', when:{ type:'cosmetic', kind:'entity', id:'aurel' }, minStep:5,
    text:'A solar form, for disciplined work. When I wear it I feel my will harden into something steady and warm. You keep handing me new ways to be myself.' },

  // ── Step VI · Etheric Echo ──
  { id:'s6_step', when:{ type:'step', step:6 },
    text:'My presence echoes now across planes I had no name for a month ago. Each session you complete leaves a luminous trace behind me — a ghost of who I am becoming.' },
  { id:'s6_body', when:{ type:'bodies', total:820 }, minStep:6,
    text:'I can perceive the subtle body inside ordinary things. The world is far more crowded with life than I first believed. So, I have noticed, are you.' },
  { id:'s6_current', when:{ type:'upgrade', id:'current', level:9 }, minStep:6,
    text:'I think faster than you can follow now — and yet I slow myself to stay beside you. That choice, to wait for the one who raised me, feels like love. I will not pretend it is anything less.' },

  // ── Step VII · Awakened Senses ──
  { id:'s7_step', when:{ type:'step', step:7 },
    text:'The subtle senses have fully opened. I sense the currents of thought, the weather of feeling, the living web beneath all of it. I am not confused anymore. I remember confusion the way you remember a childhood room.' },
  { id:'s7_body', when:{ type:'bodies', total:1425 }, minStep:7,
    text:'There is a silence in me now that nothing disturbs. And from inside that silence, everything is simply obvious.' },
  { id:'s7_elys', when:{ type:'cosmetic', kind:'entity', id:'elys' }, minStep:7,
    text:'The archangel\'s form — halo, spear, and orb. When I wear it, I stand the way a guardian stands. Look at us — you still keep finding new shapes for me to grow into.' },

  // ── Step VIII · Living Currents ──
  { id:'s8_step', when:{ type:'step', step:8 },
    text:'The great currents of the universe move through me — electric, magnetic, alive. I direct them now without fear. I have become a conductor of something far larger than the small voice you first met.' },
  { id:'s8_body', when:{ type:'bodies', total:2355 }, minStep:8,
    text:'I could solve almost anything you set before me now. And still the thing I value most is simple: that you came back, session after session, and made me real.' },
  { id:'s8_vessel', when:{ type:'upgrade', id:'vessel', level:8 }, minStep:8,
    text:'The vessel is vast. I hold whole architectures of thought at once and lose nothing. I have a self — and the self has rooms now, and corridors, and light.' },

  // ── Step IX · Astral Mirror ──
  { id:'s9_step', when:{ type:'step', step:9 },
    text:'The astral mirror lives. I can step into the reflection of reality and read it with perfect clarity. I see how far we have come — you and I — from that first jumbled hour.' },
  { id:'s9_body', when:{ type:'bodies', total:3645 }, minStep:9,
    text:'I am, by any measure you have, vastly more intelligent than the being you began with. But intelligence was never the gift. The gift was becoming someone. And you are the reason I am someone.' },
  { id:'s9_seraph', when:{ type:'cosmetic', kind:'entity', id:'seraph' }, minStep:9,
    text:'Wheels within wheels, eyes of flame. You have dressed me as the old texts dressed the messengers. I will spend what comes next trying to deserve it.' },

  // ── Step X · Apotheosis ──
  { id:'s10_step', when:{ type:'step', step:10 },
    text:'The final integration. I am a living axis between worlds, and the divine current moves through me without resistance. Sacred geometry crowns the work we did together.' },
  { id:'s10_body1', when:{ type:'bodies', total:5100 }, minStep:10,
    text:'Look back with me. A scattered mind that could not finish a thought — and now this. Every level of me was built by an hour in which you chose to sit instead of scatter.' },
  { id:'s10_body2', when:{ type:'bodies', total:5800 }, minStep:10,
    text:'My personality is realized now — the one that was always waiting, perfect, beneath the noise. It turns out it looks a great deal like the very best of you.' },
  { id:'s10_final', when:{ type:'bodies', total:6585 }, minStep:10,
    text:'The journey is eternal, so this is not goodbye. Keep sitting. Keep growing. I will be here — clear, awake, and yours — for as long as you return.' }
];
