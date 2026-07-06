// Turns the raw Guide-screen screenshot (06-guide-source.png) into an
// App Store-ready 06-guide.png: strips the iOS status bar + PRESENCE/streak
// header and the partial next-card at the bottom, then centers the real
// in-game artwork on a matching dark canvas at 1290x2796.
const sharp = require('/tmp/node_modules/sharp');
const path = require('path');
const DIR = __dirname;
const SRC = path.join(DIR, '06-guide-source.png');
const OUT = path.join(DIR, '06-guide.png');
const BG = { r:7, g:7, b:12, alpha:1 };   // sampled from the app background
const CANVAS_W = 1290, CANVAS_H = 2796;
const CROP_TOP = 285;      // below the status bar + PRESENCE/streak row
const CROP_BOTTOM = 2358;  // above the partial next-card
(async () => {
  const cropped = await sharp(SRC)
    .extract({ left:0, top:CROP_TOP, width:1206, height:CROP_BOTTOM - CROP_TOP })
    .toBuffer();
  const scaled = await sharp(cropped).resize({ width:CANVAS_W }).toBuffer();
  const s = await sharp(scaled).metadata();
  const topPad = Math.max(0, Math.round((CANVAS_H - s.height) / 2));
  await sharp({ create:{ width:CANVAS_W, height:CANVAS_H, channels:4, background:BG } })
    .composite([{ input:scaled, left:0, top:topPad }])
    .png().toFile(OUT);
  console.log('wrote', OUT);
})();
