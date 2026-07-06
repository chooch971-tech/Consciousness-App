// Turns the raw Book II viewport capture (book2-viewport.png) into an
// App Store-ready 07-book2.png: drops the PRESENCE/streak header row
// (keeps the GUIDE/CONCENTRATION/AWARENESS tabs), trims the partial
// element at the bottom, and centers the panel on a matching dark canvas
// at 1290x2796. Source is captured by shoot-book2 (headless Chromium).
const sharp = require('/tmp/node_modules/sharp');
const path = require('path');
const DIR = __dirname;
const SRC = path.join(DIR, 'book2-viewport.png');
const OUT = path.join(DIR, '07-book2.png');
const CANVAS_W = 1290, CANVAS_H = 2796;
const CROP_TOP = 116;      // below PRESENCE/streak, above the tabs
const CROP_BOTTOM = 2588;  // after the current-sphere line, before the partial button
(async () => {
  const meta = await sharp(SRC).metadata();
  // sample flat page background just under the top crop line
  const { data } = await sharp(SRC).extract({left:40,top:CROP_TOP+4,width:120,height:16}).raw().toBuffer({resolveWithObject:true});
  let r=0,g=0,b=0,n=data.length/3;
  for(let i=0;i<data.length;i+=3){r+=data[i];g+=data[i+1];b+=data[i+2];}
  const BG = { r:Math.round(r/n), g:Math.round(g/n), b:Math.round(b/n), alpha:1 };
  console.log('bg', BG, 'src', meta.width+'x'+meta.height);
  const cropped = await sharp(SRC)
    .extract({ left:0, top:CROP_TOP, width:meta.width, height:CROP_BOTTOM - CROP_TOP })
    .toBuffer();
  const scaled = await sharp(cropped).resize({ width:CANVAS_W }).toBuffer();
  const s = await sharp(scaled).metadata();
  const topPad = Math.max(0, Math.round((CANVAS_H - s.height) / 2));
  console.log('scaled', s.width+'x'+s.height, 'topPad', topPad);
  await sharp({ create:{ width:CANVAS_W, height:CANVAS_H, channels:4, background:BG } })
    .composite([{ input:scaled, left:0, top:topPad }])
    .png().toFile(OUT);
  console.log('wrote', OUT);
})();
