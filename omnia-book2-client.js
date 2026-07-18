// ── Book II: the fifteen magical tools ─────────────────────────
// Built strictly in order, each through three phases (Design → Craft →
// Consecrate). Every phase costs akasha + dark matter and imposes a rest
// before the next may begin. Once consecrated, a tool is kept forever —
// later turnings never ask for it again.
var BOOK2_TOOLS = [
  { id:'circle',   name:'Magic Circle', g:'◯', d:'The boundary of the operator’s universe — drawn before all else.' },
  { id:'triangle', name:'Triangle',     g:'△', d:'The place of manifestation, where the summoned appears.' },
  { id:'censer',   name:'Censer',       g:'≋', d:'Smoke gives the subtle a body to inhabit.' },
  { id:'mirror',   name:'Magic Mirror', g:'◍', d:'A gate between the planes, condensed and charged.' },
  { id:'lamp',     name:'Magic Lamp',   g:'☉', d:'The light of whichever sphere you would visit.' },
  { id:'wand',     name:'Wand',         g:'⌇', d:'The concentrated will, given form.' },
  { id:'sword',    name:'Sword',        g:'†', d:'Absolute victory over every plane.' },
  { id:'dagger',   name:'Dagger',       g:'‡', d:'The lesser blade — command over the astral.' },
  { id:'trident',  name:'Trident',      g:'ψ', d:'Body, soul and spirit mastered in one haft.' },
  { id:'crown',    name:'Crown',        g:'♛', d:'Authority of the spirit made visible.' },
  { id:'cap',      name:'Cap',          g:'∩', d:'The quiet dignity of inner rank.' },
  { id:'miter',    name:'Miter',        g:'⋀', d:'The office of the initiate, worn in the invisible.' },
  { id:'headband', name:'Headband',     g:'◠', d:'The simplest crown — thought bound to purpose.' },
  { id:'robe',     name:'Robe',         g:'▽', d:'Woven silence; nothing profane touches the work.' },
  { id:'belt',     name:'Belt',         g:'∞', d:'The girdle that closes the vestment — and the work.' }
];
var TOOL_PHASES = ['Design', 'Craft', 'Consecrate'];
var TOOL_PHASE_GATE_MS = 12 * 3600 * 1000; // rest between phases

// Detailed piece-built illustrations: each tool is drawn in three parts that
// materialise as its phases are bought (ghosted until then).
var BOOK2_TOOL_DEFS = '<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs><linearGradient id="b2gAu" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f4e2b0"/><stop offset=".55" stop-color="#c9a45e"/><stop offset="1" stop-color="#8a6a28"/></linearGradient><linearGradient id="b2gFe" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#e8edf5"/><stop offset=".5" stop-color="#9aa2b6"/><stop offset="1" stop-color="#565e70"/></linearGradient><linearGradient id="b2gVi" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8f74c0"/><stop offset="1" stop-color="#4a3a6e"/></linearGradient><linearGradient id="b2gGl" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#cfe0f2" stop-opacity=".55"/><stop offset="1" stop-color="#6f86ad" stop-opacity=".18"/></linearGradient><radialGradient id="b2gFl"><stop offset="0" stop-color="#fff6d0"/><stop offset=".55" stop-color="#f4c468"/><stop offset="1" stop-color="#f4c468" stop-opacity="0"/></radialGradient></defs></svg>';
var BOOK2_TOOL_ART = {
  circle: '<g class="b2p{P1}"><circle cx="60" cy="78" r="46" fill="none" stroke="url(#b2gAu)" stroke-width="4"/><circle cx="60" cy="78" r="39" fill="none" stroke="#8a6a28" stroke-width="1.2"/></g><g class="b2p{P2}"><circle cx="60" cy="78" r="30" fill="none" stroke="#c9ab6e" stroke-width="1.5"/><path d="M60 25l6 7-6 7-6-7z" fill="url(#b2gAu)"/><path d="M60 117l6 7-6 7-6-7z" fill="url(#b2gAu)"/><path d="M9 78l7-6 7 6-7 6z" fill="url(#b2gAu)"/><path d="M97 78l7-6 7 6-7 6z" fill="url(#b2gAu)"/></g><g class="b2p{P3}"><g fill="#e8cd94"><circle cx="95" cy="78" r="2"/><circle cx="25" cy="78" r="2"/><circle cx="60" cy="43" r="2"/><circle cx="60" cy="113" r="2"/><circle cx="84.7" cy="53.3" r="2"/><circle cx="84.7" cy="102.7" r="2"/><circle cx="35.3" cy="53.3" r="2"/><circle cx="35.3" cy="102.7" r="2"/></g><circle cx="60" cy="78" r="8" fill="none" stroke="#c4a8d4" stroke-width="1" opacity=".7"/><circle cx="60" cy="78" r="3.4" fill="#d8c4f4"/></g>',
  triangle: '<g class="b2p{P1}"><path d="M60 22 108 126H12z" fill="none" stroke="url(#b2gAu)" stroke-width="4" stroke-linejoin="round"/></g><g class="b2p{P2}"><path d="M60 112 32 68h56z" fill="none" stroke="#c4a8d4" stroke-width="2" stroke-linejoin="round"/></g><g class="b2p{P3}"><g fill="url(#b2gFl)"><path d="M60 2c4 6 5 10 0 15-5-5-4-9 0-15z"/><path d="M12 108c4 6 5 10 0 15-5-5-4-9 0-15z"/><path d="M108 108c4 6 5 10 0 15-5-5-4-9 0-15z"/></g></g>',
  censer: '<g class="b2p{P1}"><path d="M32 84h56c0 16-10 26-28 26S32 100 32 84z" fill="url(#b2gAu)"/><path d="M52 110h16l4 10H48z" fill="#8a6a28"/><rect x="42" y="122" width="36" height="6" rx="3" fill="url(#b2gAu)"/></g><g class="b2p{P2}"><path d="M34 84c0-16 12-24 26-24s26 8 26 24z" fill="url(#b2gAu)"/><g fill="#241a36"><circle cx="46" cy="72" r="1.6"/><circle cx="60" cy="68" r="1.6"/><circle cx="74" cy="72" r="1.6"/></g><circle cx="60" cy="54" r="5" fill="url(#b2gVi)"/><path d="M60 49V26M40 62 30 30M80 62l10-32" stroke="#c9ab6e" stroke-width="1.4" fill="none"/></g><g class="b2p{P3}"><path d="M50 46c-6-10 6-14 2-24M70 46c6-10-6-14-2-24" stroke="#c4a8d4" stroke-width="2" fill="none" stroke-linecap="round" opacity=".8"/><ellipse cx="60" cy="85" rx="15" ry="5" fill="url(#b2gFl)"/></g>',
  mirror: '<g class="b2p{P1}"><ellipse cx="60" cy="66" rx="34" ry="44" fill="none" stroke="url(#b2gAu)" stroke-width="5"/><path d="M60 13l7 9H53z" fill="url(#b2gAu)"/></g><g class="b2p{P2}"><ellipse cx="60" cy="66" rx="27" ry="37" fill="url(#b2gGl)"/><path d="M45 40c-6 10-7 22-4 32" stroke="#fff" stroke-width="2.5" opacity=".5" fill="none" stroke-linecap="round"/></g><g class="b2p{P3}"><path d="M60 110v24M42 142l18-10 18 10" stroke="url(#b2gAu)" stroke-width="4" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M60 55l3 8 8 3-8 3-3 8-3-8-8-3 8-3z" fill="#d8c4f4" opacity=".9"/></g>',
  lamp: '<g class="b2p{P1}"><rect x="44" y="120" width="32" height="8" rx="3" fill="url(#b2gAu)"/><path d="M48 120c-8-9-8-22 0-30h24c8 8 8 21 0 30z" fill="url(#b2gAu)"/></g><g class="b2p{P2}"><rect x="48" y="48" width="24" height="42" rx="10" fill="url(#b2gGl)" stroke="#c9ab6e" stroke-width="1.2"/><rect x="52" y="41" width="16" height="7" rx="3" fill="url(#b2gAu)"/><path d="M76 104c10-3 14-11 12-21" stroke="url(#b2gAu)" stroke-width="3.5" fill="none" stroke-linecap="round"/></g><g class="b2p{P3}"><path d="M60 58c6 8 7 15 0 21-7-6-6-13 0-21z" fill="url(#b2gFl)"/><g stroke="#e8cd94" stroke-width="1.6" stroke-linecap="round" opacity=".8"><path d="M60 34V23"/><path d="M40 40l-7-7"/><path d="M80 40l7-7"/><path d="M34 62H23"/><path d="M97 62H86"/></g></g>',
  wand: '<g class="b2p{P1}"><path d="M34 124 82 40" stroke="url(#b2gAu)" stroke-width="6" stroke-linecap="round"/></g><g class="b2p{P2}"><path d="M39 116l10 6M47 102l10 6M55 88l10 6" stroke="#6a4f8e" stroke-width="4" stroke-linecap="round"/><circle cx="34" cy="124" r="5.5" fill="url(#b2gVi)"/></g><g class="b2p{P3}"><circle cx="93" cy="29" r="13" fill="url(#b2gFl)" opacity=".5"/><path d="M84 38l7-17 11 11-16 8z" fill="url(#b2gVi)" stroke="#d8c4f4" stroke-width="1" stroke-linejoin="round"/></g>',
  sword: '<g class="b2p{P1}"><path d="M60 10l5 13-1 73h-8l-1-73z" fill="url(#b2gFe)"/><path d="M60 20v70" stroke="#eef2f8" stroke-width="1" opacity=".7"/></g><g class="b2p{P2}"><rect x="40" y="96" width="40" height="7" rx="3.5" fill="url(#b2gAu)"/><rect x="55" y="103" width="10" height="27" rx="4" fill="#6a4f8e"/><path d="M55 110h10M55 117h10M55 124h10" stroke="#c9ab6e" stroke-width="1.4"/></g><g class="b2p{P3}"><circle cx="60" cy="136" r="7" fill="url(#b2gAu)"/><circle cx="60" cy="136" r="3" fill="#d8c4f4"/><path d="M57 25l-1 58" stroke="#fff" stroke-width="2" opacity=".35" stroke-linecap="round"/></g>',
  dagger: '<g class="b2p{P1}"><path d="M28 28l46 46-11 4-39-39z" fill="url(#b2gFe)"/><path d="M32 33l38 38" stroke="#eef2f8" stroke-width="1" opacity=".6"/></g><g class="b2p{P2}"><path d="M68 62l16 16" stroke="url(#b2gAu)" stroke-width="6" stroke-linecap="round"/><path d="M80 76l17 17" stroke="#6a4f8e" stroke-width="9" stroke-linecap="round"/><circle cx="102" cy="98" r="6.5" fill="url(#b2gAu)"/></g><g class="b2p{P3}"><g stroke="#c4a8d4" stroke-width="1.6" stroke-linecap="round" fill="none"><path d="M42 40l6 6"/><path d="M50 38l4 10"/><path d="M58 48l8 4"/></g><circle cx="72" cy="72" r="10" fill="url(#b2gFl)" opacity=".45"/></g>',
  trident: '<g class="b2p{P1}"><path d="M60 140V62" stroke="url(#b2gAu)" stroke-width="5" stroke-linecap="round"/></g><g class="b2p{P2}"><path d="M60 64V28M40 70c-6-16-2-31 8-39M80 70c6-16 2-31-8-39" stroke="url(#b2gFe)" stroke-width="5" fill="none" stroke-linecap="round"/><path d="M42 68h36" stroke="url(#b2gAu)" stroke-width="4" stroke-linecap="round"/></g><g class="b2p{P3}"><g fill="url(#b2gFl)"><path d="M60 14c3.5 5 4.5 9 0 13-4.5-4-3.5-8 0-13z"/><path d="M46 17c3.5 5 4.5 9 0 13-4.5-4-3.5-8 0-13z"/><path d="M74 17c3.5 5 4.5 9 0 13-4.5-4-3.5-8 0-13z"/></g></g>',
  crown: '<g class="b2p{P1}"><path d="M28 96h64v18a6 6 0 0 1-6 6H34a6 6 0 0 1-6-6z" fill="url(#b2gAu)"/><path d="M28 108h64" stroke="#8a6a28" stroke-width="1.5"/></g><g class="b2p{P2}"><path d="M28 96 24 58l16 16 12-26 8 26 8-26 12 26 16-16-4 38z" fill="url(#b2gAu)" stroke="#8a6a28" stroke-width="1" stroke-linejoin="round"/></g><g class="b2p{P3}"><circle cx="44" cy="106" r="3.5" fill="#c47a7a"/><circle cx="60" cy="106" r="4.5" fill="#d8c4f4"/><circle cx="76" cy="106" r="3.5" fill="#7eb8a4"/><g fill="#e8cd94"><circle cx="24" cy="56" r="2.4"/><circle cx="60" cy="66" r="2.4"/><circle cx="96" cy="56" r="2.4"/></g></g>',
  cap: '<g class="b2p{P1}"><path d="M30 96c0-22 13-37 30-37s30 15 30 37z" fill="url(#b2gVi)"/></g><g class="b2p{P2}"><path d="M24 96h72v8a4 4 0 0 1-4 4H28a4 4 0 0 1-4-4z" fill="url(#b2gAu)"/><path d="M60 60v36M42 67c-4 8-6 18-6 29M78 67c4 8 6 18 6 29" stroke="#3a2c5a" stroke-width="1.4" fill="none"/></g><g class="b2p{P3}"><path d="M60 68l3.5 9 9 3.5-9 3.5-3.5 9-3.5-9-9-3.5 9-3.5z" fill="#e8cd94"/></g>',
  miter: '<g class="b2p{P1}"><path d="M60 18c15 10 27 27 27 46l-4 56H37l-4-56c0-19 12-36 27-46z" fill="url(#b2gVi)"/></g><g class="b2p{P2}"><path d="M56 24h8v96h-8z" fill="url(#b2gAu)"/><path d="M35 94h50v10H35z" fill="url(#b2gAu)"/></g><g class="b2p{P3}"><rect x="42" y="120" width="9" height="24" rx="2.5" fill="url(#b2gAu)"/><rect x="69" y="120" width="9" height="24" rx="2.5" fill="url(#b2gAu)"/><path d="M60 22c13 9 23 24 23 42" stroke="#e8cd94" stroke-width="1.5" fill="none" opacity=".8"/></g>',
  headband: '<g class="b2p{P1}"><path d="M18 92c8-26 26-40 42-40s34 14 42 40" fill="none" stroke="url(#b2gAu)" stroke-width="8" stroke-linecap="round"/></g><g class="b2p{P2}"><path d="M18 92c-4 12-2 26 4 36M102 92c4 12 2 26-4 36" stroke="#c9ab6e" stroke-width="3.5" fill="none" stroke-linecap="round"/><circle cx="18" cy="92" r="4" fill="url(#b2gAu)"/><circle cx="102" cy="92" r="4" fill="url(#b2gAu)"/></g><g class="b2p{P3}"><circle cx="60" cy="54" r="11" fill="url(#b2gFl)" opacity=".4"/><path d="M60 43l7 11-7 11-7-11z" fill="url(#b2gVi)" stroke="#d8c4f4" stroke-width="1"/></g>',
  robe: '<g class="b2p{P1}"><path d="M60 24c-8 0-14 6-16 12L32 128c8 6 18 9 28 9s20-3 28-9L76 36c-2-6-8-12-16-12z" fill="url(#b2gVi)"/><path d="M44 40c0-12 7-20 16-20s16 8 16 20c-5-6-10-9-16-9s-11 3-16 9z" fill="#3a2c5a"/></g><g class="b2p{P2}"><path d="M44 46 20 96l12 8 13-32" fill="url(#b2gVi)" stroke="#3a2c5a" stroke-width="1"/><path d="M76 46l24 50-12 8-13-32" fill="url(#b2gVi)" stroke="#3a2c5a" stroke-width="1"/><path d="M60 44v84" stroke="#2a2044" stroke-width="2"/></g><g class="b2p{P3}"><path d="M34 124c8 5 17 8 26 8s18-3 26-8" stroke="url(#b2gAu)" stroke-width="3" fill="none" stroke-linecap="round"/><g fill="#e8cd94"><circle cx="60" cy="62" r="2"/><circle cx="60" cy="76" r="2"/><circle cx="60" cy="90" r="2"/></g></g>',
  belt: '<g class="b2p{P1}"><rect x="14" y="70" width="92" height="22" rx="5" fill="url(#b2gAu)"/><path d="M18 75h84M18 87h84" stroke="#8a6a28" stroke-width="1" opacity=".6"/></g><g class="b2p{P2}"><rect x="48" y="62" width="26" height="38" rx="6" fill="none" stroke="url(#b2gFe)" stroke-width="5"/><path d="M60 66v20" stroke="url(#b2gFe)" stroke-width="4" stroke-linecap="round"/><path d="M106 70l9 11-9 11z" fill="url(#b2gAu)"/></g><g class="b2p{P3}"><g stroke="#6a4f8e" stroke-width="2" stroke-linecap="round" fill="none"><path d="M26 76l6 10M32 76l-6 10"/><path d="M86 76v10M82 81h8"/></g><path d="M16 71h88" stroke="#f4e2b0" stroke-width="1.2" opacity=".8"/></g>',
};

function bookIIToolState(id) {
  if (!omniaState.bookII) omniaState.bookII = {};
  if (!omniaState.bookII.tools) omniaState.bookII.tools = {};
  if (!omniaState.bookII.tools[id]) omniaState.bookII.tools[id] = { p: 0, readyAt: 0 };
  return omniaState.bookII.tools[id];
}
function bookIICurrentToolIdx() {
  for (var i = 0; i < BOOK2_TOOLS.length; i++) {
    if (bookIIToolState(BOOK2_TOOLS[i].id).p < TOOL_PHASES.length) return i;
  }
  return BOOK2_TOOLS.length;
}
function toolPhaseCost(toolIdx, phase) {
  var m = 1 + phase * 0.5; // consecration costs half again more than design
  return {
    a: Math.round((900 + toolIdx * 450) * m),
    d: Math.round((12 + toolIdx * 8) * m)
  };
}
function fmtToolGate(ms) {
  var h = Math.floor(ms / 3600000), m = Math.ceil((ms % 3600000) / 60000);
  return h > 0 ? h + 'h ' + m + 'm' : m + 'm';
}
function omniaBuildToolPhase() {
  if (!darkMatterUnlocked()) return;
  var idx = bookIICurrentToolIdx();
  if (idx >= BOOK2_TOOLS.length) return;
  var tool = BOOK2_TOOLS[idx];
  var st = bookIIToolState(tool.id);
  if (Date.now() < (st.readyAt || 0)) {
    showToast(tool.name + ' rests · ' + fmtToolGate(st.readyAt - Date.now()) + ' before the next phase', 3200);
    return;
  }
  var c = toolPhaseCost(idx, st.p);
  if ((omniaState.akasha || 0) < c.a || (omniaState.darkMatter || 0) < c.d) {
    showToast('Requires ' + c.a + ' akasha + ' + c.d + ' ◆ dark matter', 3200);
    return;
  }
  omniaSpendAkasha(c.a, 'book2-tool', { toolId: tool.id, phase: st.p });
  omniaState.darkMatter -= c.d;
  omniaState.totalDarkMatterSpent = (omniaState.totalDarkMatterSpent || 0) + c.d;
  var phaseName = TOOL_PHASES[st.p];
  st.p++;
  st.readyAt = st.p < TOOL_PHASES.length ? Date.now() + TOOL_PHASE_GATE_MS : 0;
  saveOmniaState();
  if (syncEnabled && authToken) syncPushData();
  showToast(st.p >= TOOL_PHASES.length
    ? '✦ ' + tool.name + ' consecrated'
    : tool.name + ' · ' + phaseName + ' complete', 3200, 'gold');
  renderOmniaEngine();
}

// ── Book II bodies: astral, mental, and WISDOM (replacing physical) ───────
// Unlocked once all fifteen tools are consecrated. Levels are bought with
// akasha + dark matter and are kept across turnings; sphere travel (Phase E)
// will demand them as thresholds.
var BOOK2_BODY_META = {
  astral: { name:'Astral',  color:'#c4a8d4', desc:'feeling, image, symbol — refined' },
  mental: { name:'Mental',  color:'#98b4cc', desc:'attention, silence, command — deepened' },
  wisdom: { name:'Wisdom',  color:'#e8cd94', desc:'the knowing that replaces the merely physical' }
};
function bookIIBodies() {
  if (!omniaState.bookII) omniaState.bookII = {};
  if (!omniaState.bookII.bodies) omniaState.bookII.bodies = { astral:1, mental:1, wisdom:1 };
  return omniaState.bookII.bodies;
}
function bookIIBodyCost(b) {
  var lvl = bookIIBodies()[b] || 1;
  return { a: Math.round(400 + lvl * 90), d: Math.round(6 + lvl * 3) };
}
function omniaBuildBookIIBody(b) {
  if (!BOOK2_BODY_META[b] || bookIICurrentToolIdx() < BOOK2_TOOLS.length) return;
  var c = bookIIBodyCost(b);
  if ((omniaState.akasha || 0) < c.a || (omniaState.darkMatter || 0) < c.d) {
    showToast('Requires ' + c.a + ' akasha + ' + c.d + ' ◆ dark matter', 3200);
    return;
  }
  omniaSpendAkasha(c.a, 'book2-body', { body: b, level: bookIIBodies()[b] || 1 });
  omniaState.darkMatter -= c.d;
  omniaState.totalDarkMatterSpent = (omniaState.totalDarkMatterSpent || 0) + c.d;
  var bodies = bookIIBodies();
  bodies[b] = (bodies[b] || 1) + 1;
  saveOmniaState();
  if (syncEnabled && authToken) syncPushData();
  showToast(BOOK2_BODY_META[b].name + ' rises to ' + bodies[b], 2800, 'gold');
  renderOmniaEngine();
}
// The refined bodies as literal Book I body cards (.oe-body): name, big serif
// level, "n / req · sphere" need line, thin bar, outline Build button. Rendered
// into the engine's own #omniaBodyGrid once Book II takes over. While the
// instruments are still being forged the cards show locked.
function renderBookIIBodyCards() {
  var bodies = bookIIBodies();
  var toolsDone = bookIICurrentToolIdx() >= BOOK2_TOOLS.length;
  var sphereIdx = bookIISphereCount();
  var spheresLeft = sphereIdx < BOOK2_SPHERES.length;
  var req = spheresLeft ? sphereReq(sphereIdx) : null;
  var roman = ['I','II','III','IV','V','VI','VII','VIII','IX','X'][sphereIdx] || 'X';
  return Object.keys(BOOK2_BODY_META).map(function(b) {
    var m = BOOK2_BODY_META[b];
    var lvl = bodies[b] || 1;
    var need = req ? req[b] : 0;
    var met = need > 0 && lvl >= need;
    var pct = need > 0 ? Math.min(100, (lvl / need) * 100) : Math.min(100, (lvl % 25) * 4);
    var needHtml = !toolsDone
      ? 'awaits the instruments'
      : need > 0
        ? '<span class="' + (met ? 'need-met' : '') + '">' + Math.min(lvl, need) + ' / ' + need + '</span> · sphere ' + roman
        : 'the spheres are yours';
    var c = bookIIBodyCost(b);
    var can = toolsDone && (omniaState.akasha || 0) >= c.a && (omniaState.darkMatter || 0) >= c.d;
    return '<div class="oe-body" style="--body-color:' + m.color + ';">'
      + '<div class="oe-body-name">' + m.name + '</div>'
      + '<div class="oe-body-lvl-row"><span class="oe-body-lvl">' + lvl + '</span><span class="oe-body-lvl-key">lvl</span></div>'
      + '<div class="oe-body-need ' + (met ? 'need-met' : '') + '">' + needHtml + '</div>'
      + '<div class="oe-body-bar"><div class="oe-body-bar-fill" style="width:' + (toolsDone ? pct : 0) + '%;"></div></div>'
      + '<button class="oe-body-btn" onclick="omniaBuildBookIIBody(\'' + b + '\')"' + (can ? '' : ' disabled') + '>'
      + 'Build <span class="oe-body-cost">' + c.a.toLocaleString() + ' + ' + c.d + '◆</span></button>'
      + '</div>';
  }).join('');
}

// ── Book II: the ten spheres ─────────────────────────────────
// Traversed strictly in order once the tools and bodies allow. Each sphere
// demands body thresholds, costs akasha + dark matter, and imposes a day's
// rest. Pluto opens the next Turning: spheres reset, tools and bodies remain.
var BOOK2_SPHERES = [
  { id:'zone',    name:'Zone Girdling the Earth', sym:'⊕', c:'#9cb88a', d:'The belt of the earth — the first passage beyond the physical.' },
  { id:'luna',    name:'Lunar Sphere',            sym:'☽', c:'#cdd6e8', d:'The realm of rhythm, and the tides of the astral sea.' },
  { id:'mercury', name:'Mercurian Sphere',        sym:'☿', c:'#e8b060', d:'The sphere of intellect, word, and swift intelligences.' },
  { id:'venus',   name:'Venusian Sphere',         sym:'♀', c:'#e89ab8', d:'The sphere of love, harmony, and attraction.' },
  { id:'sol',     name:'Solar Sphere',            sym:'☉', c:'#f0c860', d:'The heart of the system — light, life, and power.' },
  { id:'mars',    name:'Martian Sphere',          sym:'♂', c:'#e06858', d:'The sphere of strength, courage, and command.' },
  { id:'jupiter', name:'Jupiter Sphere',          sym:'♃', c:'#8898e8', d:'The sphere of order, mercy, and expansion.' },
  { id:'saturn',  name:'Saturn Sphere',           sym:'♄', c:'#7a88a0', d:'The severe teacher — limits, time, and karma.' },
  { id:'uranus',  name:'Uranus Sphere',           sym:'♅', c:'#7ed8e8', d:'The sphere of revelation and sudden knowing.' },
  { id:'pluto',   name:'Pluto Sphere',            sym:'♇', c:'#9a6ae8', d:'The deepest gate — transformation entire.' }
];

// Drawn mini-planet for each sphere (44x44 box), in the same hand-built style
// as the tool illustrations. Shared defs are emitted once by the orb row.
var BOOK2_SPHERE_DEFS = '<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>'
  + '<radialGradient id="spgZone" cx="35%" cy="30%" r="90%"><stop offset="0" stop-color="#dcecc4"/><stop offset=".55" stop-color="#9cb88a"/><stop offset="1" stop-color="#37503a"/></radialGradient>'
  + '<radialGradient id="spgLuna" cx="32%" cy="30%" r="95%"><stop offset="0" stop-color="#f4f7fc"/><stop offset=".5" stop-color="#cdd6e8"/><stop offset="1" stop-color="#5a6478"/></radialGradient>'
  + '<radialGradient id="spgMerc" cx="35%" cy="30%" r="90%"><stop offset="0" stop-color="#f8dfae"/><stop offset=".55" stop-color="#e8b060"/><stop offset="1" stop-color="#6e4a1e"/></radialGradient>'
  + '<radialGradient id="spgVenus" cx="35%" cy="30%" r="90%"><stop offset="0" stop-color="#fcd9e6"/><stop offset=".55" stop-color="#e89ab8"/><stop offset="1" stop-color="#7a3a54"/></radialGradient>'
  + '<radialGradient id="spgSol" cx="42%" cy="38%" r="80%"><stop offset="0" stop-color="#fff6d8"/><stop offset=".5" stop-color="#f0c860"/><stop offset="1" stop-color="#9a6c1c"/></radialGradient>'
  + '<radialGradient id="spgMars" cx="35%" cy="30%" r="90%"><stop offset="0" stop-color="#f4a894"/><stop offset=".55" stop-color="#e06858"/><stop offset="1" stop-color="#6a2018"/></radialGradient>'
  + '<radialGradient id="spgJup" cx="35%" cy="30%" r="90%"><stop offset="0" stop-color="#c4cdf4"/><stop offset=".55" stop-color="#8898e8"/><stop offset="1" stop-color="#38406e"/></radialGradient>'
  + '<radialGradient id="spgSat" cx="35%" cy="30%" r="90%"><stop offset="0" stop-color="#d2dae6"/><stop offset=".55" stop-color="#9aa8ba"/><stop offset="1" stop-color="#404c5e"/></radialGradient>'
  + '<radialGradient id="spgUra" cx="35%" cy="30%" r="90%"><stop offset="0" stop-color="#d8f6fc"/><stop offset=".55" stop-color="#7ed8e8"/><stop offset="1" stop-color="#2a6470"/></radialGradient>'
  + '<radialGradient id="spgPlu" cx="35%" cy="30%" r="90%"><stop offset="0" stop-color="#c8aef0"/><stop offset=".55" stop-color="#9a6ae8"/><stop offset="1" stop-color="#32204e"/></radialGradient>'
  + '<clipPath id="spcOrb"><circle cx="22" cy="22" r="15"/></clipPath>'
  + '<clipPath id="spcOrbSm"><circle cx="22" cy="22" r="12"/></clipPath>'
  + '</defs></svg>';

var BOOK2_SPHERE_ART = {
  zone: '<circle cx="22" cy="22" r="15" fill="url(#spgZone)"/>'
    + '<ellipse cx="22" cy="22" rx="15" ry="5.2" fill="none" stroke="#e8cd94" stroke-width="1.4" opacity=".85"/>'
    + '<ellipse cx="22" cy="22" rx="7" ry="15" fill="none" stroke="#dcecc4" stroke-width=".7" opacity=".3"/>'
    + '<circle cx="22" cy="22" r="15" fill="none" stroke="#c4d8ac" stroke-width=".7" opacity=".5"/>',
  luna: '<circle cx="22" cy="22" r="15" fill="url(#spgLuna)"/>'
    + '<g clip-path="url(#spcOrb)"><circle cx="31" cy="18" r="15" fill="#1a2030" opacity=".42"/></g>'
    + '<circle cx="16" cy="17" r="2.4" fill="#8a94a8" opacity=".55"/><circle cx="21" cy="27" r="1.7" fill="#8a94a8" opacity=".45"/><circle cx="13" cy="25" r="1.2" fill="#8a94a8" opacity=".4"/>'
    + '<circle cx="22" cy="22" r="15" fill="none" stroke="#e8eef8" stroke-width=".7" opacity=".5"/>',
  mercury: '<circle cx="22" cy="22" r="12" fill="url(#spgMerc)"/>'
    + '<ellipse cx="22" cy="22" rx="19" ry="7.5" fill="none" stroke="#e8b060" stroke-width="1" stroke-dasharray="2.5 4" opacity=".65" transform="rotate(-18 22 22)"/>'
    + '<circle cx="17" cy="18" r="1.6" fill="#6e4a1e" opacity=".5"/><circle cx="26" cy="24" r="1.2" fill="#6e4a1e" opacity=".45"/>'
    + '<circle cx="22" cy="22" r="12" fill="none" stroke="#f4d494" stroke-width=".7" opacity=".55"/>',
  venus: '<circle cx="22" cy="22" r="14" fill="url(#spgVenus)"/>'
    + '<g clip-path="url(#spcOrb)"><path d="M6 18 Q16 13 24 17 T40 15" fill="none" stroke="#fcd9e6" stroke-width="2.2" opacity=".4"/><path d="M4 27 Q15 23 25 26 T42 24" fill="none" stroke="#fcd9e6" stroke-width="1.7" opacity=".3"/></g>'
    + '<path d="M33 9l.9 2.1L36 12l-2.1.9L33 15l-.9-2.1L30 12l2.1-.9z" fill="#fcd9e6" opacity=".9"/>'
    + '<circle cx="22" cy="22" r="14" fill="none" stroke="#f4b8ce" stroke-width=".7" opacity=".55"/>',
  sol: '<circle cx="22" cy="22" r="11.5" fill="url(#spgSol)"/>'
    + '<g stroke="#f0c860" stroke-width="1.4" stroke-linecap="round" opacity=".85">'
    + '<line x1="22" y1="4" x2="22" y2="8.5"/><line x1="22" y1="35.5" x2="22" y2="40"/><line x1="4" y1="22" x2="8.5" y2="22"/><line x1="35.5" y1="22" x2="40" y2="22"/>'
    + '<line x1="9.3" y1="9.3" x2="12.4" y2="12.4"/><line x1="31.6" y1="31.6" x2="34.7" y2="34.7"/><line x1="34.7" y1="9.3" x2="31.6" y2="12.4"/><line x1="12.4" y1="31.6" x2="9.3" y2="34.7"/></g>'
    + '<circle cx="22" cy="22" r="11.5" fill="none" stroke="#ffe9a8" stroke-width=".8" opacity=".7"/>',
  mars: '<circle cx="22" cy="22" r="14" fill="url(#spgMars)"/>'
    + '<g clip-path="url(#spcOrb)"><ellipse cx="22" cy="9.5" rx="7" ry="3.4" fill="#f8e8e0" opacity=".75"/><path d="M12 24q5-3.5 10-1t9 1.5q-4 6-10.5 5T12 24z" fill="#8a3024" opacity=".5"/></g>'
    + '<circle cx="22" cy="22" r="14" fill="none" stroke="#f0907e" stroke-width=".7" opacity=".55"/>',
  jupiter: '<circle cx="22" cy="22" r="15" fill="url(#spgJup)"/>'
    + '<g clip-path="url(#spcOrb)" opacity=".75">'
    + '<path d="M5 14h34" stroke="#c4cdf4" stroke-width="2.6" opacity=".5"/><path d="M4 20h36" stroke="#5a68a8" stroke-width="3.2" opacity=".6"/>'
    + '<path d="M5 27h34" stroke="#c4cdf4" stroke-width="2.2" opacity=".45"/><path d="M7 32.5h30" stroke="#5a68a8" stroke-width="2.6" opacity=".5"/></g>'
    + '<ellipse cx="27.5" cy="26.5" rx="3.6" ry="2.3" fill="#e8a088" opacity=".9"/>'
    + '<circle cx="22" cy="22" r="15" fill="none" stroke="#aab6f0" stroke-width=".7" opacity=".5"/>',
  saturn: '<circle cx="22" cy="22" r="11" fill="url(#spgSat)"/>'
    + '<g clip-path="url(#spcOrbSm)" opacity=".6"><path d="M8 17h28" stroke="#d2dae6" stroke-width="2" opacity=".5"/><path d="M8 25h28" stroke="#66788e" stroke-width="2.4" opacity=".55"/></g>'
    + '<ellipse cx="22" cy="22" rx="19.5" ry="5.6" fill="none" stroke="#e8cd94" stroke-width="1.5" opacity=".85" transform="rotate(-16 22 22)"/>'
    + '<ellipse cx="22" cy="22" rx="16.5" ry="4.4" fill="none" stroke="#b8a06a" stroke-width=".8" opacity=".55" transform="rotate(-16 22 22)"/>'
    + '<circle cx="22" cy="22" r="11" fill="none" stroke="#c8d2e0" stroke-width=".7" opacity=".55"/>',
  uranus: '<circle cx="22" cy="22" r="13" fill="url(#spgUra)"/>'
    + '<ellipse cx="22" cy="22" rx="5.4" ry="18.5" fill="none" stroke="#a8ecf8" stroke-width="1.3" opacity=".7" transform="rotate(14 22 22)"/>'
    + '<g clip-path="url(#spcOrb)"><path d="M8 16 Q22 20 36 15" fill="none" stroke="#d8f6fc" stroke-width="1.6" opacity=".4"/></g>'
    + '<circle cx="22" cy="22" r="13" fill="none" stroke="#b0e8f4" stroke-width=".7" opacity=".55"/>',
  pluto: '<circle cx="22" cy="22" r="12.5" fill="url(#spgPlu)"/>'
    + '<g clip-path="url(#spcOrb)"><path d="M17 17c2.4-2.6 6.6-2.4 8.4.4 1.9-2.6 6-2.2 7.6.6 1.4 2.6-.6 5.4-3.6 7.8L22 31.5l-6.8-5.9c-2.4-2.4-1-6.5 1.8-8.6z" fill="#c8aef0" opacity=".38"/></g>'
    + '<circle cx="17.5" cy="16.5" r="1.3" fill="#e8dcfc" opacity=".8"/>'
    + '<circle cx="22" cy="22" r="12.5" fill="none" stroke="#b492ec" stroke-width=".7" opacity=".55"/>'
};

function bookIISphereSvg(sp, size) {
  return '<svg viewBox="0 0 44 44" width="' + size + '" height="' + size + '" aria-hidden="true">' + (BOOK2_SPHERE_ART[sp.id] || '') + '</svg>';
}
var SPHERE_REST_MS = 24 * 3600 * 1000;
function bookIISphereCount() { return (omniaState.bookII && omniaState.bookII.sphere) || 0; }
function sphereReq(i) { var n = 4 + i * 3; return { astral:n, mental:n, wisdom:n }; }
function sphereCost(i) { return { a: 2200 + i * 900, d: 45 + i * 28 }; }
function omniaTravelSphere() {
  if (bookIICurrentToolIdx() < BOOK2_TOOLS.length) return;
  var i = bookIISphereCount();
  if (i >= BOOK2_SPHERES.length) return;
  var b2 = omniaState.bookII;
  if (Date.now() < (b2.sphereReadyAt || 0)) {
    showToast('The way rests · ' + fmtToolGate(b2.sphereReadyAt - Date.now()) + ' before the next passage', 3200);
    return;
  }
  var req = sphereReq(i), bodies = bookIIBodies();
  if ((bodies.astral||1) < req.astral || (bodies.mental||1) < req.mental || (bodies.wisdom||1) < req.wisdom) {
    showToast('Requires Astral ' + req.astral + ' · Mental ' + req.mental + ' · Wisdom ' + req.wisdom, 3400);
    return;
  }
  var c = sphereCost(i);
  if ((omniaState.akasha || 0) < c.a || (omniaState.darkMatter || 0) < c.d) {
    showToast('Requires ' + c.a + ' akasha + ' + c.d + ' ◆ dark matter', 3200);
    return;
  }
  omniaSpendAkasha(c.a, 'book2-sphere', { sphere: i + 1 });
  omniaState.darkMatter -= c.d;
  omniaState.totalDarkMatterSpent = (omniaState.totalDarkMatterSpent || 0) + c.d;
  b2.sphere = i + 1;
  b2.sphereReadyAt = (i + 1 < BOOK2_SPHERES.length) ? Date.now() + SPHERE_REST_MS : 0;
  saveOmniaState();
  if (syncEnabled && authToken) syncPushData();
  showToast('✦ ' + BOOK2_SPHERES[i].name + ' traversed', 3400, 'gold');
  renderOmniaEngine();
}
// The ten spheres as drawn planets — rendered in the engine's session slot
// (where Book I's meditation-sessions line was) once Book II takes over.
function bookIISphereOrbRow() {
  var n = bookIISphereCount();
  return BOOK2_SPHERE_DEFS + '<div class="b2sp-row">'
    + BOOK2_SPHERES.map(function(sp, i) {
        return '<span class="b2sp' + (i < n ? ' done' : i === n ? ' cur' : '') + '" style="--spc:' + sp.c + ';" title="' + sp.name + '">' + bookIISphereSvg(sp, 26) + '</span>';
      }).join('')
    + '</div>';
}
// Body-requirement line for the sphere currently ahead.
function bookIISphereReqLine(n) {
  var req = sphereReq(n), bodies = bookIIBodies();
  return ['astral','mental','wisdom'].map(function(b) {
    var met = (bodies[b] || 1) >= req[b];
    return '<span class="b2sp-req' + (met ? ' met' : '') + '">' + BOOK2_BODY_META[b].name + ' ' + Math.min(bodies[b] || 1, req[b]) + '/' + req[b] + '</span>';
  }).join('<span class="b2t-sep">·</span>');
}

// The tools atelier, laid out like the engine's "Now Building" block: a
// 15-segment track (the Book I step-dots idiom) and the current instrument's
// art assembling piece by piece as phases are bought. The build action lives
// on the engine's main button (the old Advance slot), not in this card.
function renderBookIITools() {
  var idx = bookIICurrentToolIdx();
  var doneCount = 0;
  BOOK2_TOOLS.forEach(function(tool) {
    if (bookIIToolState(tool.id).p >= TOOL_PHASES.length) doneCount++;
  });
  var track = '<div class="oe-bardon-track" style="margin-top:0;">'
    + BOOK2_TOOLS.map(function(tool, i) {
        var cls = 'oe-bardon-dot' + (i < idx ? ' done' : (i === idx ? ' active' : ''));
        return '<div class="' + cls + '" title="' + tool.name + '"></div>';
      }).join('')
    + '</div>';
  var html = '<div class="b2-tools">'
    + '<div class="b2-tools-head"><span class="b2-tools-title">Magical Tools</span>'
    + '<span class="b2-tools-count">' + doneCount + ' / ' + BOOK2_TOOLS.length + '</span></div>'
    + BOOK2_TOOL_DEFS
    + track;
  if (idx >= BOOK2_TOOLS.length) {
    return html + '<div class="oe-turnings-hint" style="margin-top:9px;">All fifteen instruments consecrated. The three bodies of the operator are refined for the spheres.</div></div>';
  }
  var tool = BOOK2_TOOLS[idx];
  var st = bookIIToolState(tool.id);
  var art = (BOOK2_TOOL_ART[tool.id] || '')
    .replace('{P1}', st.p >= 1 ? ' on' : '')
    .replace('{P2}', st.p >= 2 ? ' on' : '')
    .replace('{P3}', st.p >= 3 ? ' on' : '');
  var trail = TOOL_PHASES.map(function(pn, pi) {
    return '<span class="b2t-ph' + (pi < st.p ? ' done' : pi === st.p ? ' cur' : '') + '">' + pn + '</span>';
  }).join('<span class="b2t-sep">·</span>');
  html += '<div class="b2-now">'
    + '<svg viewBox="0 0 120 150" aria-hidden="true">' + art + '</svg>'
    + '<div>'
    + '<div class="oe-stage-step-label">Now Forging</div>'
    + '<div class="oe-stage-step-name">' + tool.name + '</div>'
    + '<div class="oe-stage-step-need">' + tool.d + '</div>'
    + '<div class="b2t-phases">' + trail + '</div>'
    + '</div></div>';
  return html + '</div>';
}

// The always-visible "Magical Evocation" status: which prestige you're on,
// the permanent bonus, a tease toward the 3rd Prestige, and — once unlocked —
// the Dark Matter balance.
function renderOmniaTurnings() {
  var pc = omniaState.prestige || 0;
  // Before the first prestige the Prestige BUTTON already carries the teaser —
  // showing a card that repeats it is the duplicate the user saw. So this
  // status hub only appears once there's something the button doesn't say:
  // your prestige count, the akasha bonus, and (at 3+) Dark Matter + Book II.
  if (pc < 1) return '';
  var countHtml = '<span class="pip">' + (pc <= 6 ? Array(pc + 1).join('✦') : '✦ ×' + pc) + '</span> · +' + Math.round((omniaPrestigeMult() - 1) * 100) + '% akasha';
  var html = '<div class="oe-turnings-top">'
    + '<span class="oe-turnings-label">Magical Evocation</span>'
    + '<span class="oe-turnings-count">' + countHtml + '</span>'
    + '</div>';
  if (pc < PRESTIGE_BOOK2) {
    html += '<div class="oe-turnings-hint">The 3rd Prestige awakens <b>Dark Matter</b> — and Book II: <b>Magical Evocation</b>.</div>';
  } else {
    html += '<div class="oe-turnings-hint">The deeper current flows. <b>Dark Matter</b> gathers from the advanced exercises.</div>'
      + '<div class="oe-dm-row"><span class="oe-dm-orb"></span>'
      + '<span class="oe-dm-val">' + Math.floor(omniaState.darkMatter || 0) + '</span>'
      + '<span class="oe-dm-key">Dark Matter</span></div>'
      + renderBookIITools();
  }
  return html;
}
function omniaReqFactor() {
  var p = omniaState.prestige || 0;
  // Each Book I re-walk drops the step requirements by 10 points of the base:
  // P1 halves them (0.5), P2 → 0.4, P3 → 0.3 — landing on the floor exactly as
  // Book II / Dark Matter opens. So the first turning is a true half-length
  // victory lap and every turning after is distinctly faster than the last.
  return p <= 0 ? 1 : Math.max(0.3, 0.6 - 0.1 * p);
}
// Scaled step requirement for the ADVANCE gate + its display. Sync scoring and
// body clamps deliberately use raw requirements (they operate on snapshots).
function omniaStepReqVal(step, key) {
  var raw = (step && step.req && step.req[key]) || 0;
  return raw ? Math.max(1, Math.round(raw * omniaReqFactor())) : 0;
}
function omniaCanPrestige() {
  if ((omniaState.prestige || 0) >= PRESTIGE_BOOK2) {
    // Book II evocations: reaching Pluto (all tools implied) completes one.
    return bookIISphereCount() >= BOOK2_SPHERES.length;
  }
  var last = OMNIA_BARDON_STEPS[OMNIA_BARDON_STEPS.length - 1];
  return (omniaState.bardonStep || 1) >= last.step && omniaStepReady(last);
}
function omniaPrestige() {
  if (!omniaCanPrestige()) return;
  omniaState.prestige = (omniaState.prestige || 0) + 1;
  omniaState.bardonStep = 1;
  omniaState.bodies = { physical: 1, astral: 1, mental: 1 };
  omniaState.completedRecommended = 0;
  omniaState.rec = null;
  omniaState.recStreak = 0;
  // Book II evocations re-travel the spheres; tools and bodies are never asked again.
  if (omniaState.bookII) { omniaState.bookII.sphere = 0; omniaState.bookII.sphereReadyAt = 0; }
  saveOmniaState();
  if (syncEnabled && authToken) syncPushData();
  showPrestigeCeremony(omniaState.prestige);
  renderOmniaEngine();
}

function _prestigeRoman(n){ return ['','I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII'][n] || String(n); }
function _prestigeOrdinal(n){ return ['zeroth','first','second','third','fourth','fifth','sixth','seventh','eighth','ninth','tenth'][n] || (n+'th'); }

function omniaConfirmPrestige() {
  if (!omniaCanPrestige()) {
    showToast((omniaState.prestige || 0) >= PRESTIGE_BOOK2
      ? 'You must reach Pluto to Prestige'
      : 'You need to reach Step X to Prestige', 3000);
    return;
  }
  var next = (omniaState.prestige || 0) + 1;
  var body = (omniaState.prestige || 0) >= PRESTIGE_BOOK2
    ? 'The spheres close behind Omnia — instruments and bodies kept — to be walked again at greater depth.\n\n'
      + 'Your +75% akasha holds; the reward now is the deeper walk.'
    : 'Omnia returns to Step I and rebuilds her three bodies from the beginning — '
      + 'but keeps all akasha, upgrades, cosmetics, level and your streak.\n\n'
      + 'Permanent boon: +' + (25 * next) + '% akasha, and every step requirement ahead is eased.';
  showConfirm('Begin Magical Evocation ' + _prestigeRoman(next) + '?', body, omniaPrestige);
}

function showPrestigeCeremony(n) {
  var el = document.getElementById('prestigeCeremony');
  if (!el) return;
  var crystal = '<svg class="pc-crystal" viewBox="0 0 80 130" fill="none" xmlns="http://www.w3.org/2000/svg">'
    + '<defs><linearGradient id="pcG1" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#fff2cf" stop-opacity=".95"/><stop offset="100%" stop-color="#c99f52" stop-opacity=".55"/></linearGradient>'
    + '<radialGradient id="pcG3" cx="50%" cy="38%" r="58%"><stop offset="0%" stop-color="#ffe9b8" stop-opacity=".5"/><stop offset="100%" stop-color="#8a6a28" stop-opacity="0"/></radialGradient></defs>'
    + '<ellipse cx="40" cy="68" rx="28" ry="48" fill="url(#pcG3)" opacity=".7"/>'
    + '<polygon points="40,3 54,14 40,25 26,14" fill="url(#pcG1)" stroke="#e8c878" stroke-width=".55"/>'
    + '<polygon points="40,3 54,14 40,13" fill="#fff4d6" opacity=".7"/>'
    + '<polygon points="40,25 60,36 64,58 40,70 16,58 20,36" fill="url(#pcG1)" stroke="#d8b258" stroke-width=".55"/>'
    + '<polygon points="40,25 60,36 40,44" fill="#ffeec2" opacity=".5"/>'
    + '<polygon points="40,70 64,58 56,88 40,100 24,88 16,58" fill="url(#pcG1)" stroke="#d8b258" stroke-width=".55" opacity=".9"/>'
    + '<polygon points="40,100 56,88 40,114" fill="url(#pcG1)" stroke="#d8b258" stroke-width=".48" opacity=".72"/>'
    + '<polygon points="40,100 24,88 40,114" fill="#e8cd8e" stroke="#d8b258" stroke-width=".48" opacity=".5"/>'
    + '</svg>';
  var subTxt = n > PRESTIGE_BOOK2
    ? 'The spheres close behind her — instruments and bodies kept — to be walked again at greater depth.'
    : 'Omnia dissolves and reforms at the first step — the whole path walked again, now seen with mastery.';
  el.innerHTML = '<div class="pc-rays"></div>' + crystal
    + '<div class="pc-kicker">Magical Evocation ' + _prestigeRoman(n) + '</div>'
    + '<div class="pc-title">A New Evocation Begins</div>'
    + '<div class="pc-sub">' + subTxt + '</div>'
    + '<div class="pc-boon">✦ +' + (25 * n) + '% akasha, forever · the path ahead is shorter ✦</div>'
    + '<button class="pc-btn" id="pcCloseBtn">Walk Again →</button>';
  el.classList.add('pc-show');
  requestAnimationFrame(function(){ requestAnimationFrame(function(){ el.classList.add('pc-vis'); }); });
  if (navigator.vibrate) { try { navigator.vibrate([40,60,120,60,220]); } catch(e) {} }
  if (typeof playStreakBurstSound === 'function') { try { playStreakBurstSound(); } catch(e) {} }
  document.getElementById('pcCloseBtn').onclick = function() {
    el.classList.remove('pc-vis');
    setTimeout(function(){ el.classList.remove('pc-show'); }, 500);
  };
}
