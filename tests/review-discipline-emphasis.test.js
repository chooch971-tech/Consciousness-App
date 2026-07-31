'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const reports = fs.readFileSync(path.join(root, 'reports-client.js'), 'utf8');
const server = fs.readFileSync(path.join(root, 'server.js'), 'utf8');

test('the report payload separates concentration time from the blended total', () => {
  // total_practice mixes every discipline, and one Awareness sitting can run to
  // eight hours — enough to bury a week where no hold moved. Concentration
  // needs its own figure, and its own human-readable label, because the prompt
  // tells the model to reuse those labels verbatim.
  assert.match(reports, /concentration_practice:\s*reviewSeconds\(/);
  assert.match(reports, /awareness_practice:\s*reviewSeconds\(/);
  assert.match(reports, /total_practice_is_combined:\s*true/);
});

test('the payload states which discipline carries the weight', () => {
  const block = reports.slice(reports.indexOf('practice_emphasis:'),
                              reports.indexOf('practice_emphasis:') + 320);
  assert.match(block, /primary:\s*'concentration'/);
  assert.match(block, /secondary:\s*'awareness'/);
  assert.match(block, /note:/, 'the emphasis needs to say why, not just rank');
});

test('concentration totals exclude awareness and prayer', () => {
  // The concentration map is built by skipping those two keys; if that guard
  // goes, concentration_practice silently becomes the blended figure again.
  assert.match(reports, /if \(key === 'awareness' \|\| key === 'prayer'\) return;/);
});

test('the prompt ranks concentration above awareness', () => {
  assert.match(server, /Concentration and Awareness are not interchangeable/);
  assert.match(server, /Never present Awareness volume as concentration progress/);
  // And the label list must offer the split figures, or the model has nothing
  // to quote but the combined one.
  assert.match(server, /total_practice, concentration_practice, awareness_practice/);
});

test('the Practice Review override carries the same weighting', () => {
  const override = server.slice(server.indexOf('PRACTICE REVIEW OVERRIDE'),
                                server.indexOf('PRACTICE REVIEW OVERRIDE') + 2600);
  assert.match(override, /Weigh the concentration exercises above Awareness/);
  assert.match(override, /practice_emphasis/);
});
