// ═══════════════════════════════════════
// GUIDE
// ═══════════════════════════════════════

// ── Daily plans ───────────────────────────────────────────
// 7 entries, indexed by day-of-week (0=Sun … 6=Sat).
// Each entry has: focus (short theme label), intro (1–2 sentences for both tracks),
// beginner (plan for someone new), experienced (plan for someone with prior practice).
// Each plan entry: { id, name, duration (minutes), tip }
// User: replace the placeholder text below with your own suggestions.
var GUIDE_DAILY_PLANS = [
  { // 0 — Sunday
    focus: 'Rest & Inward Turning',
    intro: 'Sunday is a day of withdrawal. Turn inward rather than outward.',
    beginner: [
      { id:'clock',   name:'Clock',          duration:5,  tip:'Sit with the clock and follow the seconds hand. Five minutes of real attention is more than enough to start.' },
      { id:'asana',   name:'Asana',          duration:5,  tip:'Find a comfortable, upright posture and hold it without any movement for the full five minutes.' }
    ],
    experienced: [
      { id:'asana',   name:'Asana',          duration:15, tip:'Extend your stillness. The body and the will are the same instrument.' },
      { id:'thought', name:'Thought Control', mode:'observation', duration:10, tip:'After asana, move into pure observation. You have been still — now see what the mind does in that silence.' }
    ]
  },
  { // 1 — Monday
    focus: 'Attention & Anchoring',
    intro: 'Begin the week by sharpening the basic tool: the ability to hold one thing.',
    beginner: [
      { id:'clock',   name:'Clock',          duration:5,  tip:'One object. One point. Follow the tip of the seconds hand and return each time you lose it.' },
      { id:'visual',  name:'Visualization',  duration:5,  tip:'Close your eyes and place a simple geometric shape in your mind. Hold it as steadily as you can.' }
    ],
    experienced: [
      { id:'clock',   name:'Clock',          duration:10, tip:'Press your personal best. Each second of unbroken attention counts.' },
      { id:'visual',  name:'Visualization',  duration:10, tip:'Move beyond simple shapes — hold a real object with color, weight, and texture in the mind simultaneously.' }
    ]
  },
  { // 2 — Tuesday
    focus: 'Bodily Mastery',
    intro: 'The body is the first instrument of the will. Work it directly today.',
    beginner: [
      { id:'asana',   name:'Asana',          duration:5,  tip:'Sit without moving. Scratch nothing, adjust nothing. Let every impulse arise and pass.' },
      { id:'clock',   name:'Clock',          duration:5,  tip:'After the stillness of asana, carry that quality into clock work.' }
    ],
    experienced: [
      { id:'asana',   name:'Asana',          duration:20, tip:'Push the edge of your record. Twenty minutes of genuine stillness is a serious threshold.' },
      { id:'thought', name:'Thought Control', mode:'vacancy', duration:5, tip:'After the body is mastered, attempt full vacancy. Even two minutes of true emptiness is significant.' }
    ]
  },
  { // 3 — Wednesday
    focus: 'Sensory Concentration',
    intro: 'Midweek: use the outer senses as a door to inner focus.',
    beginner: [
      { id:'auditory', name:'Auditory',      duration:5,  tip:'Choose a sound — the singing bowl works well. Listen with complete attention. When you drift, return.' },
      { id:'visual',   name:'Visualization', duration:5,  tip:'After sound, shift to pure image. Hold one simple form in the mind.' }
    ],
    experienced: [
      { id:'auditory', name:'Auditory',      duration:10, tip:'Listen until the sound and the listener are indistinguishable. Aim for zero drift this session.' },
      { id:'thought',  name:'Thought Control', mode:'focus', duration:10, tip:'Carry the auditory concentration into thought focus. Choose one word or concept and hold it exclusively.' }
    ]
  },
  { // 4 — Thursday
    focus: 'Mirror Work',
    intro: 'Thursday: turn the gaze on the self. Honest appraisal is the beginning of all real work.',
    beginner: [
      { id:'soulmirror', name:'Soul Mirror', duration:null, tip:'Open the Soul Mirror and record one honest negative trait and one genuine positive one. Take your time.' },
      { id:'clock',      name:'Clock',       duration:5,   tip:'Follow with five minutes of clock to settle the mind after self-examination.' }
    ],
    experienced: [
      { id:'soulmirror', name:'Soul Mirror', duration:null, tip:'Review your existing trait list. Are the negatives still accurate? Have any positives deepened? Update accordingly.' },
      { id:'thought',    name:'Thought Control', mode:'observation', duration:10, tip:'After mirror work, sit and observe the thoughts that arise. The mirror tends to stir the waters.' }
    ]
  },
  { // 5 — Friday
    focus: 'Inner Silence',
    intro: 'End the work week with silence. Noise is the enemy of development.',
    beginner: [
      { id:'thought', name:'Thought Control', mode:'observation', duration:5,  tip:'Sit quietly and simply watch the mind without following any thread. Five minutes is a real beginning.' },
      { id:'asana',   name:'Asana',           duration:5,  tip:'Hold the posture before or after — stillness and silence reinforce each other.' }
    ],
    experienced: [
      { id:'thought', name:'Thought Control', mode:'observation', duration:15, tip:'Fifteen minutes of pure observation. No agenda, no suppression — only watching.' },
      { id:'visual',  name:'Visualization',   duration:10, tip:'After emptying the mind, plant one intentional image and hold it with full clarity.' }
    ]
  },
  { // 6 — Saturday
    focus: 'Integration',
    intro: 'Saturday: your practice day. Touch all the strands if time allows.',
    beginner: [
      { id:'clock',   name:'Clock',          duration:5,  tip:'Your standard anchor. Start here.' },
      { id:'auditory',name:'Auditory',       duration:5,  tip:'Then the ears. Two different sensory doors to the same inner stillness.' }
    ],
    experienced: [
      { id:'asana',   name:'Asana',          duration:10, tip:'Begin with the body.' },
      { id:'thought', name:'Thought Control', mode:'observation', duration:10, tip:'Then the mind.' },
      { id:'visual',  name:'Visualization',  duration:10, tip:'Then the imagination. Body → mind → image: the classic Hermetic triad.' }
    ]
  }
];

// ── Exercise definitions for the assessment rows ──────────
var GUIDE_EXERCISES = [
  { id:'clock',      name:'Clock',           sub:'Attention on the seconds hand',        opts:['New to me','5 min','10 min','15+ min'] },
  { id:'visual',     name:'Visualization',   sub:'Holding a mental image',               opts:['New to me','5 min','10 min','15+ min'] },
  { id:'auditory',   name:'Auditory',        sub:'Concentrated listening',               opts:['New to me','5 min','10 min','15+ min'] },
  { id:'sense',      name:'Senses',          sub:'Imagined feeling, smell, or taste',    opts:['New to me','5 min','10 min','15+ min'] },
  { id:'thought',    name:'Thought Control', sub:'Observation, Focus, or Vacancy',       opts:['New to me','5 min','10 min','15+ min'] },
  { id:'asana',      name:'Asana',           sub:'Motionless seated posture',            opts:['New to me','5 min','10 min','15+ min'] },
  { id:'soulmirror', name:'Soul Mirror',     sub:'Trait inventory and transformation',   opts:['New to me','Familiar'] }
];
