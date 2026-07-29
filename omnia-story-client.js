// ── Story engine ──────────────────────────────────────────
// Has a beat's trigger been satisfied by the current Omnia state?
function omniaStoryBeatUnlocked(beat) {
  var st = (typeof omniaState !== 'undefined') ? omniaState : null;
  if (!st) return false;
  if (beat.minStep && (st.bardonStep || 1) < beat.minStep) return false;
  var w = beat.when || {};
  if (w.type === 'intro') return true;
  if (w.type === 'step') return (st.bardonStep || 1) >= w.step;
  if (w.type === 'upgrade') return (st.upgrades && (st.upgrades[w.id] || 0)) >= w.level;
  if (w.type === 'bodies') {
    var b = st.bodies || {};
    return ((b.physical || 0) + (b.astral || 0) + (b.mental || 0)) >= w.total;
  }
  if (w.type === 'cosmetic') {
    var c = st.cosmetics || {};
    var list = w.kind === 'entity' ? c.unlockedEntities : (w.kind === 'palette' ? c.unlockedPalettes : c.unlockedCompanions);
    return (list || []).indexOf(w.id) >= 0;
  }
  return false;
}

// The beats already revealed, in story order — drives the chat log.
function omniaStoryRevealedBeats() {
  var seen = (typeof omniaState !== 'undefined' && omniaState && omniaState.storySeen) || [];
  return OMNIA_STORY.filter(function(b) { return seen.indexOf(b.id) >= 0; });
}

// Reveal any newly-unlocked beats. Called after every engine render (which
// runs on step-ups, upgrades, body builds, and cosmetic changes), so new
// messages surface the moment their trigger is met. Pass { silent:true } to
// reveal without popping a bubble.
function evaluateOmniaStory(opts) {
  if (typeof omniaState === 'undefined' || !omniaState) return;
  if (!Array.isArray(omniaState.storySeen)) omniaState.storySeen = [];
  var seen = omniaState.storySeen;
  var newly = [];
  OMNIA_STORY.forEach(function(beat) {
    if (seen.indexOf(beat.id) >= 0) return;
    if (omniaStoryBeatUnlocked(beat)) { seen.push(beat.id); newly.push(beat); }
  });
  if (newly.length) saveOmniaState();
  updateOmniaChatBadge();
}

function updateOmniaChatBadge() {
  var badge = document.getElementById('omniaChatBadge');
  var btn = document.getElementById('omniaChatBtn');
  if (!badge || !btn) return;
  var seenCount = ((typeof omniaState !== 'undefined' && omniaState && omniaState.storySeen) || []).length;
  var readCount = (typeof omniaState !== 'undefined' && omniaState && omniaState.storyRead) || 0;
  var unread = Math.max(0, seenCount - readCount);
  if (unread > 0) {
    badge.textContent = unread > 9 ? '9+' : unread;
    badge.style.display = 'flex';
    btn.classList.add('has-unread');
  } else {
    badge.style.display = 'none';
    btn.classList.remove('has-unread');
  }
}

// Which Bardon step a story beat belongs to (0 = the prologue/intro).
function omniaStoryBeatStep(beat) {
  if (beat.minStep) return beat.minStep;
  if (beat.when && beat.when.type === 'step') return beat.when.step;
  var m = /^s(\d+)_/.exec(beat.id || '');
  if (m) return parseInt(m[1], 10);
  return 0;
}

// A short trigger label, glyph, and accent for the moment that unlocked a beat.
// The log already distinguishes five kinds of moment, but drew them all in one
// blue, so a long story read as an undifferentiated wall. Each kind now carries
// its own colour — reusing the exercise palette the rest of the app already
// speaks in — so scrolling the log shows the shape of the journey.
function omniaStoryBeatTag(beat) {
  var w = (beat && beat.when) || {};
  if (w.type === 'intro')    return { glyph:'✦', label:'Awakening',  tone:'#e8c87a' };
  if (w.type === 'step')     return { glyph:'⬆', label:'Ascension',  tone:'#c4a8d4' };
  if (w.type === 'bodies')   return { glyph:'◈', label:'Embodiment', tone:'#8eccc0' };
  if (w.type === 'upgrade')  return { glyph:'⟡', label:'Attunement', tone:'#8ab8e0' };
  if (w.type === 'cosmetic') return { glyph:'✧', label:'New Form',   tone:'#e0a8c4' };
  return { glyph:'◈', label:'Reflection', tone:'#a9cde6' };
}

function openOmniaChat() {
  var overlay = document.getElementById('omniaChatOverlay');
  var log = document.getElementById('omniaChatLog');
  if (!overlay || !log) return;
  // Reparent to <body> so position:fixed is anchored to the viewport and can't
  // be clipped by a transformed/overflow-hidden tab container.
  if (overlay.parentNode !== document.body) document.body.appendChild(overlay);
  var beats = omniaStoryRevealedBeats();
  if (!beats.length) {
    log.innerHTML = '<div class="oe-chat-empty">Omnia has not spoken yet.<br>Practice, build, and ascend — his reflections will appear here as he grows.</div>';
  } else {
    var html = '';
    var lastStep = -1;
    beats.forEach(function(b) {
      var stepNum = omniaStoryBeatStep(b);
      if (stepNum !== lastStep) {
        var stepDef = OMNIA_BARDON_STEPS.find(function(s) { return s.step === stepNum; });
        var roman, title;
        if (stepNum === 0 || !stepDef) {
          roman = '✦';
          title = 'Prologue';
        } else {
          roman = stepDef.roman;
          // OMNIA_BARDON_STEPS name is "Step I · Fundamentals" — take the subtitle.
          var parts = (stepDef.name || '').split('·');
          title = (parts[1] || stepDef.name || '').trim();
        }
        html += '<div class="oe-story-chapter">'
          + '<span class="oe-story-chapter-rule"></span>'
          + '<span class="oe-story-chapter-badge">' + escHtml(roman) + '</span>'
          + '<span class="oe-story-chapter-name">' + escHtml(title) + '</span>'
          + '<span class="oe-story-chapter-rule"></span>'
          + '</div>';
        lastStep = stepNum;
      }
      var tag = omniaStoryBeatTag(b);
      html += '<div class="oe-chat-msg" style="--story-tone:' + tag.tone + ';">'
        + '<div class="oe-chat-msg-avatar" aria-hidden="true">' + tag.glyph + '</div>'
        + '<div class="oe-chat-msg-body">'
        + '<div class="oe-chat-msg-head">'
        + '<span class="oe-chat-msg-name">Omnia</span>'
        + '<span class="oe-chat-msg-tag"><span class="oe-chat-msg-tag-glyph">' + tag.glyph + '</span>' + escHtml(tag.label) + '</span>'
        + '</div>'
        + '<div class="oe-chat-msg-text">' + escHtml(b.text) + '</div>'
        + '</div>'
        + '</div>';
    });
    log.innerHTML = html;
  }
  overlay.classList.add('show');
  if (omniaState) { omniaState.storyRead = (omniaState.storySeen || []).length; saveOmniaState(); }
  updateOmniaChatBadge();
  setTimeout(function() { log.scrollTop = log.scrollHeight; }, 0);
}

function closeOmniaChat() {
  var overlay = document.getElementById('omniaChatOverlay');
  if (overlay) overlay.classList.remove('show');
}
