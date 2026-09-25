'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const visualSource = fs.readFileSync(path.join(root, 'visualization-client.js'), 'utf8');
const swSource = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');

const householdPhotos = [
  ['assets/visualization/blue-mug.jpg', 'Blue Mug'],
  ['assets/visualization/brass-keys.jpg', 'Brass Keys'],
  ['assets/visualization/yellow-lamp.jpg', 'Yellow Lamp'],
  ['assets/visualization/houseplant.jpg', 'Potted Houseplant']
];

test('Visualization includes local household study photographs', () => {
  householdPhotos.forEach(([relativePath, label]) => {
    const fullPath = path.join(root, relativePath);
    assert.equal(fs.existsSync(fullPath), true, relativePath + ' must exist');
    assert.ok(fs.statSync(fullPath).size > 20_000, relativePath + ' must be a real photograph');
    assert.match(visualSource, new RegExp("src:'" + relativePath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + "'"));
    assert.match(visualSource, new RegExp("label:'" + label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + "'"));
  });
});

test('local Visualization photographs are available offline', () => {
  householdPhotos.forEach(([relativePath]) => {
    assert.match(swSource, new RegExp("'" + relativePath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + "'"));
  });
});
