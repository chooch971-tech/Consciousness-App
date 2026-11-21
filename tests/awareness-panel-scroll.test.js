'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const presence = fs.readFileSync(path.join(__dirname, '..', 'presence.html'), 'utf8');

test('the Awareness panel scrolls when it does not fit the screen', () => {
  // It was overflow:hidden, which is invisible on a tall phone where everything
  // fits, and fatal on a short one: on a Mudita Kompakt-sized screen (about
  // 320x460 CSS px) Begin Session sat at y=583 with nothing able to scroll to
  // it, so a session could not be started at all.
  const tag = presence.match(/<div id="awarenessPanel" style="([^"]+)">/);
  assert.ok(tag, 'the panel must still be here');
  assert.match(tag[1], /overflow-y:auto/);
  assert.doesNotMatch(tag[1], /overflow:hidden/);
  // min-height:0 is what lets a flex child shrink to the space it has, so the
  // overflow happens inside the panel instead of pushing past the screen.
  assert.match(tag[1], /min-height:0/);
  // The scroll stays inside the panel rather than dragging the page with it.
  assert.match(tag[1], /overscroll-behavior:contain/);
});
