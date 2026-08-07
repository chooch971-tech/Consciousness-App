'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const presence = fs.readFileSync(path.join(root, 'presence.html'), 'utf8');
const reports = fs.readFileSync(path.join(root, 'reports-client.js'), 'utf8');

function ruleFor(selector) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = presence.match(new RegExp('^\\s*' + escaped + '\\s*\\{([^}]*)\\}', 'm'));
  assert.ok(match, 'expected a CSS rule for ' + selector);
  return match[1];
}

test('the sensory summary carries its own type size', () => {
  // It used to reuse .review-practice-modes, which has no font-size because it
  // is always nested inside .review-practice-meta (font:0.5rem). Mounted at the
  // top of the card instead, with no such parent, it inherited the page font
  // and rendered several times its intended size.
  const rule = ruleFor('.review-sensory-summary');
  // 0.5rem is the same 8px it always was — sizes moved to rem so the reader's
  // chosen text size can move them. What matters here is unchanged: the rule
  // states a size of its own instead of inheriting one.
  assert.match(rule, /font:\s*0\.5rem\//, 'must set its own font shorthand');
  assert.match(ruleFor('.review-sensory-summary strong'), /font-size:/,
    'the heading line needs an explicit size too');
});

test('the summary block uses the standalone class, not the nested one', () => {
  const block = reports.slice(reports.indexOf('sensoryTrackHtml ='),
                              reports.indexOf('foundations mastered') + 40);
  assert.match(block, /class="review-sensory-summary"/);
  assert.doesNotMatch(block, /class="review-practice-modes"/,
    'the top-level block must not borrow the nested class again');
});

test('.review-practice-modes is only ever used nested', () => {
  // Its size comes from .review-practice-meta, so any use outside a
  // .review-practice-meta parent reintroduces the same bug.
  const uses = reports.match(/class="review-practice-modes"/g) || [];
  assert.equal(uses.length, 1, 'exactly one use expected');
  // That one use is built into modeDetail, which the row template drops inside
  // the .review-practice-meta div.
  assert.match(reports, /modeDetail = '<div class="review-practice-modes">/);
  assert.match(reports, /class="review-practice-meta">' \+ metric \+ change \+ modeDetail/);
});
