'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const presence = fs.readFileSync(path.join(__dirname, '..', 'presence.html'), 'utf8');

test('the streak calendar uses a quiet outer border with restrained inner accents', () => {
  assert.match(presence, /\.so-cal-card \{[^}]*border:1px solid rgba\(221,216,206,\.16\)/);
  assert.doesNotMatch(presence, /\.so-cal-card \{[^}]*border-box/);
  assert.match(presence, /\.so-cal-card::before \{[^}]*height:1px;[^}]*rgba\(232,200,122,\.34\)[^}]*rgba\(142,204,224,\.28\)/);
  assert.match(presence, /\.so-cal-stat \{[^}]*border:1px solid rgba\(212,149,110,\.24\)/);
  assert.match(presence, /\.so-cal-stat \+ \.so-cal-stat \{[^}]*border-color:rgba\(142,204,224,\.26\)/);
});
