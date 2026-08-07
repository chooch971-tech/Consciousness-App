'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const presence = fs.readFileSync(path.join(root, 'presence.html'), 'utf8');
const quests = fs.readFileSync(path.join(root, 'guide-quests-client.js'), 'utf8');
const guidePath = fs.readFileSync(path.join(root, 'guide-path-client.js'), 'utf8');

test('a low-vision user may zoom the page', () => {
  // maximum-scale caps pinch-zoom. iOS Safari has ignored the cap since iOS 10,
  // but Android Chrome honours it, so this genuinely blocked zooming there —
  // and it is WCAG 1.4.4, one of the first things an accessibility pass checks.
  const vp = (presence.match(/name="viewport" content="([^"]+)"/) || [])[1];
  assert.ok(vp, 'the viewport meta must still be here');
  assert.doesNotMatch(vp, /maximum-scale/, 'zoom must not be capped');
  assert.doesNotMatch(vp, /user-scalable\s*=\s*no/, 'zoom must not be disabled');
  // The rest of the tag must survive the edit — viewport-fit drives the safe
  // area insets the whole layout is built on.
  assert.match(vp, /width=device-width/);
  assert.match(vp, /viewport-fit=cover/);
});

test('controls drawn under 44px still offer a 44px tap area', () => {
  // Apple's HIG minimum. These are drawn small on purpose — a 38px round back
  // button, a 32px chevron — so the drawn size is kept and an invisible centred
  // 44x44 area is laid over each. Growing the buttons would re-space the
  // headers they sit in.
  const rule = presence.slice(presence.indexOf('.tap44,'), presence.indexOf('/* ── Apple-style grouped settings ── */'));
  assert.ok(rule, 'the minimum-tap-target rule must still be here');
  assert.match(rule, /min-width:44px; min-height:44px/);
  assert.match(rule, /position:relative/, 'the overlay needs a positioned host');
  assert.match(rule, /transform:translate\(-50%, -50%\)/, 'and must be centred on the control');
  // The recurring offenders found by the live audit. .history-back alone
  // covers roughly a dozen screens.
  ['.history-back', '.lodge-back', '.prof-gear', '.prof-section__more',
   '.mode-tab', '.soul-tab', '.pq-menu-btn', '.pq-add-ex-btn',
   '#reportNavPrev', '#reportNavNext'].forEach(sel => {
    assert.ok(rule.includes(sel + '::after'), sel + ' must get a 44px tap area');
  });
});

test('no control is announced as bare punctuation', () => {
  // A screen reader reads the button's text when there is no label, so these
  // were spoken as "plus", "dot dot dot" and "greater-than sign" — the AX tree
  // confirmed it. title= does not help: visible text outranks it.
  [
    [presence, 'reportNavPrev', 'Earlier period'],
    [presence, 'reportNavNext', 'Later period'],
    [presence, 'profBadgesMore', 'See all monthly badges'],
    [presence, 'profAchMore', 'See all achievements'],
    [presence, 'omniaCandorSlider', 'Omnia candor'],
    [presence, 'addPositiveBtn', 'Add a positive trait'],
    [presence, 'addNegativeBtn', 'Add a negative trait'],
    [quests, 'pqAddExBtn', 'Add an exercise to your path']
  ].forEach(([source, id, label]) => {
    const tag = source.match(new RegExp('<[^>]*id="' + id + '"[^>]*>'));
    assert.ok(tag, id + ' must still be here');
    assert.match(tag[0], new RegExp('aria-label="' + label + '"'), id + ' needs its label');
  });
});

test('the exercise options button names the exercise it belongs to', () => {
  // Every row on the path has one, so "Options" alone would give a screen
  // reader a dozen identical buttons with no way to tell them apart.
  [guidePath, quests].forEach(source => {
    const btn = source.match(/<button class="pq-menu-btn"[\s\S]{0,400}?<\/button>'/);
    assert.ok(btn, 'the menu button must still be built here');
    assert.match(btn[0], /aria-label="Options for ' \+ escHtml\(item\.name\) \+ '"/,
      'and must name its exercise, escaped');
  });
});

test('the reusable prompt names its input from whatever it is asking', () => {
  // showAppPrompt rewrites the title and body per use, so pointing the input at
  // them keeps the spoken name correct for every caller rather than freezing
  // one wording. Verified against the AX tree with the prompt open.
  const input = presence.match(/<input id="appPromptInput"[^>]*>/);
  assert.ok(input, 'the prompt input must still be here');
  assert.match(input[0], /aria-labelledby="appPromptTitle appPromptText"/);
  const modal = presence.match(/<div class="modal-overlay" id="appPromptModal"[^>]*>/);
  assert.match(modal[0], /role="dialog"/);
  assert.match(modal[0], /aria-modal="true"/);
  assert.match(modal[0], /aria-labelledby="appPromptTitle"/);
});
