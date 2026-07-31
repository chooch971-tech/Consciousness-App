'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const streakSource = fs.readFileSync(path.join(root, 'streak-client.js'), 'utf8');
const presenceSource = fs.readFileSync(path.join(root, 'presence.html'), 'utf8');

test('the lost-streak number has its own row outside the animation stage', () => {
  assert.match(
    streakSource,
    /embersHTML \+ smokeHTML \+ ashHTML\s*\+ '<\/div>'\s*\+ '<div class="so-ended-daysbig">'/
  );
  assert.match(presenceSource, /\.so-ended-daysbig \{[^}]*position:relative;[^}]*white-space:nowrap;/);
  assert.doesNotMatch(presenceSource, /\.so-ended-daysbig \{[^}]*position:absolute;/);
});

test('lost-streak ash remains within its animation lane', () => {
  assert.match(
    presenceSource,
    /@keyframes seoAshFall \{[\s\S]*?100%\{[^}]*translateY\(30px\)/
  );
});
