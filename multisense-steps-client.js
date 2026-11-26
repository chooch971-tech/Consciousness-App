// Multi-Sense · Step III (Bardon, "Magical Schooling of the Spirit").
//
// Step III widens concentration from one sense to two or three at once, then
// carries that from objects to places, living creatures and people. Each
// section has stages in the book's order, and every stage is practiced first
// with eyes closed, then with eyes open ("like a fata morgana suspended in the
// air"). A stage is complete when it is held for five minutes.
//
// A sit is a hold timer: begin holding, tap the moment the scene collapses,
// hold again. Records live in achState.hwm under "ms3:" keys, which sync as a
// monotonic max, so completed stages can never be lost or roll back.

var MS3_GOAL_SEC = 300;
var MS3_EYES = ['closed', 'open'];
var MS3_SUBJECT_KEY = 'presence_ms3_subjects';
var MS3_SECTION_KEY = 'presence_ms3_section';

var MS3_SECTIONS = [
  {
    id: 'objects', name: 'Objects', short: 'Objects',
    intro: 'Hold one object with two or three senses at once: see the clock and hear it tick.',
    subject: 'scene',
    stages: [
      { id: 'senses', name: 'Two or three senses',
        text: 'Build the object completely, then add its sound, and its feel if you can. Hold every sense at once. When one slips, the scene has collapsed.' }
    ]
  },
  {
    id: 'known_places', name: 'Known places', short: 'Places',
    intro: 'A place you know well: a village, a house, a garden, a meadow or a forest.',
    subject: 'own', ask: 'Which place?', placeholder: 'e.g. my grandmother’s garden',
    suggestions: ['Your childhood home', 'A garden you know', 'A street you walk often', 'A forest you have visited'],
    stages: [
      { id: 'see', name: 'See it',
        text: 'Be there. Every detail of colour, light and form, as if you were standing in it. Nothing escapes your attention. If it blurs, call it back clearer than before.' },
      { id: 'hear', name: 'Hear it too',
        text: 'Hold the place and its sounds together: the birds, the water in the stream, the wind, the bees. Sight and hearing at once.' }
    ]
  },
  {
    id: 'new_places', name: 'Places never seen', short: 'New places',
    intro: 'Villages and cities you have never visited, held with two or three senses.',
    subject: 'prompt',
    prompts: ['A monastery high in the Himalaya', 'A market square in Marrakesh at dusk', 'A fishing village on a Norwegian fjord',
      'Rice terraces in Bali after rain', 'A temple courtyard in Kyoto', 'A desert oasis at noon', 'A village in the high Andes',
      'A Venetian canal at dawn', 'A lighthouse on a Scottish island', 'A tea garden in Darjeeling', 'A nomad camp on the Mongolian steppe',
      'A riverbank deep in the Amazon'],
    stages: [
      { id: 'senses', name: 'Two or three senses',
        text: 'Build a place you have never seen as if you were there: its light, its sounds, its air. Hold two or three senses at once.' }
    ]
  },
  {
    id: 'animals', name: 'Animals', short: 'Animals',
    intro: 'Living creatures: first still, then moving.',
    subject: 'prompt',
    promptsByStage: {
      still: ['A cat', 'A dog', 'A horse', 'A cow', 'A calf', 'A chicken', 'A bird on a branch', 'A deer', 'A fox', 'An owl'],
      moving: ['A cat cleaning herself', 'A cat catching a mouse', 'A cat drinking milk', 'A dog barking and running',
        'A bird in flight', 'A bird eating seed', 'A horse galloping', 'A hen scratching the ground', 'A calf following its mother']
    },
    stages: [
      { id: 'still', name: 'Still',
        text: 'Hold the animal motionless, every detail of it, exactly as you held objects.' },
      { id: 'moving', name: 'In motion',
        text: 'Now let it move: a cat cleaning herself, a dog running, a bird in flight. Follow the movement without losing the animal.' }
    ]
  },
  {
    id: 'people', name: 'People you know', short: 'People',
    intro: 'Friends first, then relatives and acquaintances, and those who have passed.',
    subject: 'own', ask: 'Who?', placeholder: 'e.g. a close friend',
    suggestions: ['A friend', 'A relative', 'An acquaintance', 'Someone who has passed'],
    stages: [
      { id: 'face', name: 'Face',
        text: 'The facial features one by one: eyes, eyebrows, nose, mouth, teeth, the shape of the face, jaw, cheeks, ears, hair, skin.' },
      { id: 'head', name: 'Head & clothing',
        text: 'The whole head, then the clothes they wear. Hold the complete person still.' },
      { id: 'motion', name: 'In motion',
        text: 'See them walking, working, speaking. Keep the whole person while they move.' },
      { id: 'voice', name: 'Voice',
        text: 'Hear them speak exactly as they do: the tone, the pitch, whether slow or fast. Sight and voice at once.' }
    ]
  },
  {
    id: 'strangers', name: 'Strangers', short: 'Strangers',
    intro: 'People you have never seen: any age, from every part of the world. Books and museums help.',
    subject: 'prompt',
    prompts: ['An old fisherman mending a net', 'A small child laughing', 'A woman in her forties reading by a window',
      'An elderly man in Rajasthan', 'A young woman in Tokyo', 'A grandmother in Lagos', 'A teenager in Shanghai',
      'A farmer in the Peruvian highlands', 'A street musician in Lisbon', 'A carpenter in his workshop',
      'A nurse at the end of a long shift', 'A herder in the Atlas mountains'],
    stages: [
      { id: 'faces', name: 'Face & voice',
        text: 'Build a face you have never seen, then their clothing, then hear their voice. Male or female, young or old.' }
    ]
  }
];

function ms3Section(id) {
  return MS3_SECTIONS.find(function(s) { return s.id === id; }) || MS3_SECTIONS[0];
}

// ── Progress ──
function ms3Key(section, stage, eyes) { return 'ms3:' + section + ':' + stage + ':' + eyes; }

function ms3Records() {
  return (typeof achState !== 'undefined' && achState && achState.hwm) || {};
}

function ms3Best(section, stage, eyes, records) {
  return Number((records || ms3Records())[ms3Key(section, stage, eyes)]) || 0;
}

function ms3StepDone(section, stage, eyes, records) {
  return ms3Best(section, stage, eyes, records) >= MS3_GOAL_SEC;
}

// Every (stage, eyes) pair of a section in the book's order.
function ms3Steps(section) {
  var out = [];
  section.stages.forEach(function(stage) {
    MS3_EYES.forEach(function(eyes) { out.push({ stage: stage, eyes: eyes }); });
  });
  return out;
}

function ms3SectionProgress(section, records) {
  var steps = ms3Steps(section);
  var done = steps.filter(function(s) { return ms3StepDone(section.id, s.stage.id, s.eyes, records); }).length;
  return { done: done, total: steps.length };
}

// The first stage/eyes pair not yet held for five minutes (or the last one).
function ms3NextStep(section, records) {
  var steps = ms3Steps(section);
  for (var i = 0; i < steps.length; i++) {
    if (!ms3StepDone(section.id, steps[i].stage.id, steps[i].eyes, records)) return steps[i];
  }
  return steps[steps.length - 1];
}

// ── Landing state ──
var ms3Pick = null; // { section, stage, eyes, subject }

function ms3LoadSubjects() {
  try { return JSON.parse(localStorage.getItem(MS3_SUBJECT_KEY)) || {}; } catch (e) { return {}; }
}
function ms3SaveSubject(sectionId, text) {
  var all = ms3LoadSubjects();
  all[sectionId] = text;
  try { localStorage.setItem(MS3_SUBJECT_KEY, JSON.stringify(all)); } catch (e) {}
}

function ms3PromptPool(section, stageId) {
  if (section.promptsByStage) return section.promptsByStage[stageId] || [];
  return section.prompts || [];
}

function ms3RandomPrompt(section, stageId, avoid) {
  var pool = ms3PromptPool(section, stageId);
  if (!pool.length) return '';
  var pick = pool[Math.floor(Math.random() * pool.length)];
  if (pool.length > 1 && pick === avoid) return ms3RandomPrompt(section, stageId, avoid);
  return pick;
}

function ms3SelectSection(sectionId) {
  var section = ms3Section(sectionId);
  var next = ms3NextStep(section);
  ms3Pick = { section: section.id, stage: next.stage.id, eyes: next.eyes, subject: '' };
  if (section.subject === 'own') ms3Pick.subject = ms3LoadSubjects()[section.id] || '';
  if (section.subject === 'prompt') ms3Pick.subject = ms3RandomPrompt(section, ms3Pick.stage);
  try { localStorage.setItem(MS3_SECTION_KEY, section.id); } catch (e) {}
}

function ms3EnsurePick() {
  if (ms3Pick) return;
  var saved = null;
  try { saved = localStorage.getItem(MS3_SECTION_KEY); } catch (e) {}
  ms3SelectSection(saved || 'objects');
}

// ── Landing (Multi-Sense setup screen) ──
function ms3Esc(v) { return typeof escapeMediaText === 'function' ? escapeMediaText(v) : String(v || ''); }

function ms3FmtTime(sec) {
  sec = Math.max(0, Math.floor(sec || 0));
  return Math.floor(sec / 60) + ':' + String(sec % 60).padStart(2, '0');
}

function buildMs3SetupHTML() {
  ms3EnsurePick();
  var records = ms3Records();
  var section = ms3Section(ms3Pick.section);

  var tabs = MS3_SECTIONS.map(function(s) {
    var p = ms3SectionProgress(s, records);
    return '<button type="button" class="ms3-tab' + (s.id === section.id ? ' on' : '') + (p.done === p.total ? ' done' : '')
      + '" onclick="ms3OnSection(\'' + s.id + '\')">' + s.short
      + '<span>' + p.done + '/' + p.total + '</span></button>';
  }).join('');

  // The stage ladder: each stage with its closed/open marks.
  var ladder = section.stages.map(function(stage) {
    var eyes = MS3_EYES.map(function(e) {
      var best = ms3Best(section.id, stage.id, e, records);
      var on = ms3Pick.stage === stage.id && ms3Pick.eyes === e;
      return '<button type="button" class="ms3-eye' + (on ? ' on' : '') + (best >= MS3_GOAL_SEC ? ' done' : '')
        + '" onclick="ms3OnStep(\'' + stage.id + '\',\'' + e + '\')">'
        + (e === 'closed' ? 'Eyes closed' : 'Eyes open')
        + '<span>' + (best >= MS3_GOAL_SEC ? '✓ ' + ms3FmtTime(best) : best ? ms3FmtTime(best) + ' / 5:00' : '— / 5:00') + '</span></button>';
    }).join('');
    return '<div class="ms3-stage"><div class="ms3-stage-name">' + stage.name + '</div><div class="ms3-eyes">' + eyes + '</div></div>';
  }).join('');

  var subjectHtml = '';
  if (section.subject === 'scene') {
    subjectHtml = typeof buildMultiSenseSetupHTML === 'function' ? buildMultiSenseSetupHTML() : '';
  } else if (section.subject === 'own') {
    subjectHtml = '<div class="ms3-label">' + section.ask + '</div>'
      + '<input class="ms3-input" id="ms3SubjectInput" maxlength="60" placeholder="' + ms3Esc(section.placeholder) + '" value="' + ms3Esc(ms3Pick.subject) + '" oninput="ms3OnSubjectInput(this.value)">'
      + '<div class="ms3-suggest">' + section.suggestions.map(function(t) {
        return '<button type="button" class="ms3-chip" onclick="ms3OnSuggestion(this.textContent)">' + ms3Esc(t) + '</button>';
      }).join('') + '</div>';
  } else {
    subjectHtml = '<div class="ms3-label">Hold</div>'
      + '<div class="ms3-prompt">' + ms3Esc(ms3Pick.subject) + '</div>'
      + '<button type="button" class="ms-swap" onclick="ms3OnReroll()">Something else</button>';
  }

  var stage = section.stages.find(function(s) { return s.id === ms3Pick.stage; }) || section.stages[0];
  return '<div class="ms-setup ms3-setup">'
    + '<div class="ms3-kicker">Step III · Two or three senses at once</div>'
    + '<div class="ms3-tabs">' + tabs + '</div>'
    + '<div class="ms3-intro">' + ms3Esc(section.intro) + '</div>'
    + '<div class="ms3-ladder">' + ladder + '</div>'
    + (section.subject === 'scene' ? subjectHtml
      : subjectHtml + '<div class="ms-instruction">' + ms3Esc(stage.text) + '</div>')
    + '<div class="ms3-foot">A stage is complete when you hold it for five minutes, first with eyes closed, then with eyes open.</div>'
    + '</div>';
}

function ms3Rerender() {
  var contentEl = document.getElementById('exSetupContent');
  if (contentEl) contentEl.innerHTML = buildMs3SetupHTML();
}

function ms3OnSection(id) { ms3SelectSection(id); ms3Rerender(); }

function ms3OnStep(stageId, eyes) {
  var section = ms3Section(ms3Pick.section);
  var stageChanged = ms3Pick.stage !== stageId;
  ms3Pick.stage = stageId;
  ms3Pick.eyes = eyes;
  // Animals use a different prompt list once they move.
  if (stageChanged && section.promptsByStage) ms3Pick.subject = ms3RandomPrompt(section, stageId);
  ms3Rerender();
}

function ms3OnSubjectInput(value) { ms3Pick.subject = value.trim(); }

function ms3OnSuggestion(text) {
  ms3Pick.subject = text;
  var input = document.getElementById('ms3SubjectInput');
  if (input) input.value = text;
}

function ms3OnReroll() {
  ms3Pick.subject = ms3RandomPrompt(ms3Section(ms3Pick.section), ms3Pick.stage, ms3Pick.subject);
  ms3Rerender();
}

// ── Session ──
var ms3Session = null; // { pick, reps:[sec], holdStart, startedAt, timer, goalHit }

function ms3Begin() {
  ms3EnsurePick();
  var section = ms3Section(ms3Pick.section);
  if (section.subject === 'own') {
    if (!ms3Pick.subject) { if (typeof showToast === 'function') showToast(section.ask.replace('?', '') + ' first: name who or what you will hold', 2600); return; }
    ms3SaveSubject(section.id, ms3Pick.subject);
  }
  var pick = Object.assign({}, ms3Pick);
  if (section.subject === 'scene') {
    var scene = (typeof currentMultiSenseScene !== 'undefined' && currentMultiSenseScene) || pickMultiSenseScene();
    pick.subject = scene.name;
    pick.scene = scene;
  }
  ms3Session = { pick: pick, reps: [], holdStart: null, startedAt: Date.now(), timer: null, goalHit: false };
  if (typeof requestExerciseWakeLock === 'function') requestExerciseWakeLock();
  showScreen('msHoldScreen');
  ms3RenderSession();
}

function ms3Elapsed() {
  return ms3Session && ms3Session.holdStart ? (Date.now() - ms3Session.holdStart) / 1000 : 0;
}

function ms3RenderSession() {
  var el = document.getElementById('msHoldScreen');
  if (!el || !ms3Session) return;
  var p = ms3Session.pick;
  var section = ms3Section(p.section);
  var stage = section.stages.find(function(s) { return s.id === p.stage; }) || section.stages[0];
  var prevBest = ms3Best(p.section, p.stage, p.eyes);
  var sessionBest = Math.max.apply(null, [0].concat(ms3Session.reps));
  var holding = !!ms3Session.holdStart;
  var media = p.scene && typeof renderMultiSenseMedia === 'function' ? renderMultiSenseMedia(p.scene) : '';
  el.innerHTML = '<div class="ms3-top">'
    + '<button class="ms3-discard" type="button" onclick="ms3Discard()">&#215; Discard</button>'
    + '<span class="ms3-top-label">' + section.short + ' · ' + stage.name + ' · ' + (p.eyes === 'closed' ? 'eyes closed' : 'eyes open') + '</span>'
    + '</div>'
    + '<div class="ms3-body" id="ms3Body">'
    + media
    + '<div class="ms3-subject">' + ms3Esc(p.subject) + '</div>'
    + '<div class="ms3-text">' + ms3Esc(stage.text) + '</div>'
    + (p.eyes === 'open' ? '<div class="ms3-text ms3-text--note">Eyes open: fix your gaze on one point. Let the scene stand before you like a mirage in the air; your surroundings cease to exist.</div>' : '')
    + '<div class="ms3-timer-wrap" id="ms3TapArea">'
    + '<svg class="ms3-ring" viewBox="0 0 120 120"><circle cx="60" cy="60" r="54" class="ms3-ring-bg"/>'
    + '<circle cx="60" cy="60" r="54" class="ms3-ring-prog" id="ms3RingProg" stroke-dasharray="339.3" stroke-dashoffset="339.3"/></svg>'
    + '<div class="ms3-timer" id="ms3Timer">0:00</div>'
    + '<div class="ms3-timer-sub" id="ms3TimerSub">' + (holding ? 'tap when the scene collapses' : 'goal 5:00') + '</div>'
    + '</div>'
    + '<div class="ms3-stats">'
    + '<span>Holds <b>' + ms3Session.reps.length + '</b></span>'
    + '<span>Best today <b>' + ms3FmtTime(sessionBest) + '</b></span>'
    + '<span>Record <b>' + ms3FmtTime(Math.max(prevBest, sessionBest)) + '</b></span>'
    + '</div>'
    + '</div>'
    + '<div class="ms3-actions">'
    + (holding
      ? '<button class="btn primary conc-btn" type="button" onclick="ms3Lost()">Scene collapsed</button>'
      : '<button class="btn primary conc-btn" type="button" onclick="ms3Hold()">' + (ms3Session.reps.length ? 'Hold again' : 'Begin holding') + '</button>')
    + '<button class="btn ghost conc-btn" type="button" style="font-size:0.5625rem;" onclick="ms3End()"' + (holding ? ' disabled' : '') + '>End session</button>'
    + '</div>';
  var tap = document.getElementById('ms3TapArea');
  if (tap && holding) tap.onclick = ms3Lost;
  ms3Tick();
}

function ms3Tick() {
  var t = document.getElementById('ms3Timer');
  var ring = document.getElementById('ms3RingProg');
  var sec = ms3Elapsed();
  if (t) t.textContent = ms3FmtTime(sec);
  if (ring) ring.setAttribute('stroke-dashoffset', (339.3 * (1 - Math.min(1, sec / MS3_GOAL_SEC))).toFixed(1));
  if (ms3Session && ms3Session.holdStart && sec >= MS3_GOAL_SEC && !ms3Session.goalHit) {
    ms3Session.goalHit = true;
    var sub = document.getElementById('ms3TimerSub');
    if (sub) sub.textContent = 'five minutes held · keep going or let it go';
    if (navigator.vibrate) { try { navigator.vibrate([40, 60, 40]); } catch (e) {} }
  }
}

function ms3Hold() {
  if (!ms3Session) return;
  ms3Session.holdStart = Date.now();
  ms3Session.goalHit = false;
  clearInterval(ms3Session.timer);
  ms3Session.timer = setInterval(ms3Tick, 250);
  ms3RenderSession();
}

function ms3Lost() {
  if (!ms3Session || !ms3Session.holdStart) return;
  ms3Session.reps.push(Math.floor(ms3Elapsed()));
  ms3Session.holdStart = null;
  clearInterval(ms3Session.timer);
  ms3RenderSession();
}

function ms3Leave() {
  if (ms3Session) clearInterval(ms3Session.timer);
  ms3Session = null;
  if (typeof releaseExerciseWakeLock === 'function') releaseExerciseWakeLock();
  if (typeof stopSceneAudio === 'function') stopSceneAudio();
}

function ms3Discard() {
  var go = function() { ms3Leave(); showScreen('exSetupScreen'); ms3Rerender(); };
  if (ms3Session && ms3Session.reps.length && typeof showConfirm === 'function') {
    showConfirm('Discard Session', 'No data will be saved.', go);
  } else {
    go();
  }
}

// Pure: the history entry for a finished sit.
function ms3Entry(pick, reps, wallSec, now) {
  var best = Math.max.apply(null, [0].concat(reps));
  var total = reps.reduce(function(a, r) { return a + r; }, 0);
  return {
    date: (now || new Date()).toISOString(),
    type: 'multi-sense',
    msSection: pick.section,
    msStage: pick.stage,
    eyesMode: pick.eyes,
    seconds: best,
    reps: reps.length,
    halts: reps.length,
    sessionDurationSec: wallSec,
    object: pick.subject || '',
    xpEarned: total
  };
}

function ms3End() {
  if (!ms3Session) return;
  if (!ms3Session.reps.length) { ms3Leave(); showScreen('exSetupScreen'); ms3Rerender(); return; }
  var pick = ms3Session.pick;
  var reps = ms3Session.reps.slice();
  var wallSec = Math.floor((Date.now() - ms3Session.startedAt) / 1000);
  ms3Leave();

  var key = ms3Key(pick.section, pick.stage, pick.eyes);
  var records = ms3Records();
  var wasDone = (Number(records[key]) || 0) >= MS3_GOAL_SEC;
  var entry = ms3Entry(pick, reps, wallSec);
  if (typeof achState !== 'undefined' && achState && achState.hwm) {
    achState.hwm[key] = Math.max(achState.hwm[key] || 0, entry.seconds);
    if (typeof achSave === 'function') achSave();
  }
  var nowDone = entry.seconds >= MS3_GOAL_SEC;

  concState.xp += entry.xpEarned;
  if (isConcNewSession()) concState.totalSessions++;
  var leveled = awardLevelUps(concState, concSumXpToLevel, concXpForLevel);
  // Advanced drills feed Dark Matter, not Akasha (see BOOK2_ECONOMY.md).
  recordExerciseCompletion({ entry: entry, omniaSeconds: wallSec, skipOmnia: true });
  var dm = typeof mintDarkMatterFromPractice === 'function' ? mintDarkMatterFromPractice(DARK_MATTER_PER_ADVANCED) : 0;
  if (leveled && typeof completionFlowQueueLevelUp === 'function') completionFlowQueueLevelUp(concState.level, 'concentration');

  var section = ms3Section(pick.section);
  var stage = section.stages.find(function(s) { return s.id === pick.stage; }) || section.stages[0];
  var msg = null;
  if (nowDone && !wasDone) {
    var next = ms3NextStep(section);
    var allDone = ms3SectionProgress(section).done === ms3SectionProgress(section).total;
    msg = stage.name + (pick.eyes === 'closed' ? ', eyes closed,' : ', eyes open,') + ' is complete. '
      + (allDone ? section.name + ' is mastered.' : 'Next: ' + next.stage.name + ', eyes ' + next.eyes + '.');
    ms3Pick = null; // the landing moves on to the next stage
  }
  showSessionComplete({
    title: nowDone && !wasDone ? 'Stage complete.' : 'Scene held.',
    sub: section.short + ' · ' + stage.name + ' · eyes ' + pick.eyes,
    xp: entry.xpEarned,
    akashaDelta: 0,
    stat3: { label: dm ? '◆ +' + dm : 'Best hold', color: 'blue', value: ms3FmtTime(entry.seconds) },
    omniaMsg: msg,
    onDone: function() {
      if (typeof renderConcHome === 'function') renderConcHome();
      showScreen('homeScreen');
      if (typeof returnAfterExercise === 'function') returnAfterExercise('concentration');
      else switchMode('concentration');
    }
  });
}
