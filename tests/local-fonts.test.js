'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const root = path.join(__dirname, '..');
const presence = fs.readFileSync(path.join(root, 'presence.html'), 'utf8');
const fontsCss = fs.readFileSync(path.join(root, 'fonts.css'), 'utf8');
const sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');

// Every (family, style, weight) the app asks for anywhere in its CSS.
const REQUIRED = [
  ['Cormorant Garamond', 'normal', 300], ['Cormorant Garamond', 'normal', 400],
  ['Cormorant Garamond', 'italic', 300], ['Cormorant Garamond', 'italic', 400],
  ['DM Mono', 'normal', 300], ['DM Mono', 'normal', 400],
  ['Space Grotesk', 'normal', 400], ['Space Grotesk', 'normal', 500],
  ['Space Grotesk', 'normal', 600], ['Space Grotesk', 'normal', 700]
];

function declaredFaces() {
  return [...fontsCss.matchAll(/@font-face \{([^}]*)\}/g)].map(m => {
    const body = m[1];
    const pick = re => (body.match(re) || [])[1];
    return {
      family: pick(/font-family: '([^']+)'/),
      style: pick(/font-style: (\w+)/),
      weight: Number(pick(/font-weight: (\d+)/)),
      file: pick(/url\(([^)]+)\)/),
      range: pick(/unicode-range: ([^;]+);/),
      display: pick(/font-display: (\w+)/)
    };
  });
}

test('nothing reaches a Google font host any more', () => {
  // An external request on the critical path that the service worker could not
  // cache (it only handles same-origin), so an offline launch always fell back
  // to system serifs — and every launch told Google a user had opened the app.
  assert.doesNotMatch(presence, /fonts\.googleapis\.com/, 'no stylesheet link or preconnect');
  assert.doesNotMatch(presence, /fonts\.gstatic\.com/, 'and no font host');
  assert.match(presence, /<link href="fonts\.css" rel="stylesheet"\/>/);
});

test('the policy no longer permits what the app no longer uses', () => {
  const csp = (presence.match(/Content-Security-Policy" content="([^"]+)"/) || [])[1];
  assert.ok(csp, 'the CSP must still be here');
  assert.match(csp, /font-src 'self';/, 'fonts may only come from this origin');
  assert.doesNotMatch(csp, /fonts\.googleapis\.com/);
  assert.doesNotMatch(csp, /fonts\.gstatic\.com/);
  // The rest of the policy must survive the edit.
  assert.match(csp, /script-src 'self' 'unsafe-inline' https:\/\/accounts\.google\.com/);
  assert.match(csp, /connect-src 'self' https:\/\/presence-server-acik\.onrender\.com/);
});

test('every weight and style the app uses is declared', () => {
  const faces = declaredFaces();
  REQUIRED.forEach(([family, style, weight]) => {
    const hit = faces.filter(f => f.family === family && f.style === style && f.weight === weight);
    assert.ok(hit.length >= 1, family + ' ' + weight + ' ' + style + ' must be declared');
    // Latin and latin-ext are both needed: accented characters appear in
    // journal entries and display names.
    assert.equal(hit.length, 2, family + ' ' + weight + ' ' + style + ' needs latin and latin-ext');
  });
  assert.equal(faces.length, REQUIRED.length * 2);
});

test('every declared file exists and is a real woff2', () => {
  declaredFaces().forEach(face => {
    const file = path.join(root, face.file);
    assert.ok(fs.existsSync(file), face.file + ' is declared but missing');
    const head = fs.readFileSync(file).subarray(0, 4).toString('latin1');
    assert.equal(head, 'wOF2', face.file + ' must be woff2, not a stray HTML error page');
  });
});

test('identical files are stored once, not per weight', () => {
  // Cormorant Garamond and Space Grotesk are variable fonts: Google serves the
  // same bytes under a different URL for each weight. Keeping every copy would
  // have more than doubled the bundle for no glyph.
  const dir = path.join(root, 'fonts');
  const files = fs.readdirSync(dir).filter(n => n.endsWith('.woff2'));
  const hashes = new Set(files.map(n =>
    crypto.createHash('md5').update(fs.readFileSync(path.join(dir, n))).digest('hex')));
  assert.equal(hashes.size, files.length, 'no two font files may hold the same bytes');
  const total = files.reduce((sum, n) => sum + fs.statSync(path.join(dir, n)).size, 0);
  assert.ok(total < 400 * 1024, 'the font bundle stays under 400 KB (currently ' + Math.round(total / 1024) + ' KB)');
});

test('the fonts survive an offline launch', () => {
  // Precached, or the first offline launch renders in system serifs — the very
  // thing bundling them was meant to fix.
  assert.ok(sw.includes("'fonts.css'"), 'the stylesheet must be precached');
  declaredFaces().forEach(face => {
    assert.ok(sw.includes("'" + face.file + "'"), face.file + ' must be precached');
  });
});

test('text stays visible while a face loads', () => {
  declaredFaces().forEach(face => {
    assert.equal(face.display, 'swap', face.file + ' must not block painting');
    assert.ok(face.range && face.range.startsWith('U+'), face.file + ' must keep its unicode-range');
  });
});
