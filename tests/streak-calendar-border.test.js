'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const presence = fs.readFileSync(path.join(__dirname, '..', 'presence.html'), 'utf8');

test('the streak calendar has a visible gold-to-frost border treatment', () => {
  assert.match(presence, /\.so-cal-card \{[^}]*linear-gradient\(135deg,rgba\(232,200,122,\.88\),rgba\(212,149,110,\.68\) 48%,rgba\(142,204,224,\.82\)\) border-box/);
  assert.match(presence, /\.so-cal-card \{[^}]*border:1\.5px solid transparent/);
  assert.match(presence, /\.so-cal-stat \{[^}]*border:1px solid rgba\(212,149,110,\.38\)/);
  assert.match(presence, /\.so-cal-stat \+ \.so-cal-stat \{[^}]*border-color:rgba\(142,204,224,\.42\)/);
});
