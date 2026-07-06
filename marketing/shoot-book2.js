// Captures the Book II panel from presence.html in headless Chromium.
// Prereqs: playwright in /tmp/node_modules; a static server on :8099
//   (python3 -m http.server 8099 from the repo root); the pre-installed
//   Chromium at /opt/pw-browsers. Outputs book2-viewport.png, which
//   clean-book2-screenshot.js then frames into 07-book2.png.
const { chromium } = require('/tmp/node_modules/playwright');
const path = require('path');
const OUTDIR = '/home/user/Consciousness-App/marketing';

const tools = {};
['circle','triangle','censer','mirror','lamp','wand','sword','dagger','trident','crown','cap','miter','headband','robe','belt']
  .forEach(id => tools[id] = { p: 3, readyAt: 0 });

const STATE = {
  akasha: 82000,
  prestige: 3,
  darkMatter: 520,
  totalDarkMatterEarned: 940,
  totalDarkMatterSpent: 420,
  bardonStep: 10,
  bookII: { tools, bodies: { astral: 24, mental: 22, wisdom: 20 }, sphere: 4, sphereReadyAt: 0 }
};

(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const ctx = await browser.newContext({
    viewport: { width: 402, height: 874 },
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
  });
  const page = await ctx.newPage();
  await page.goto('http://localhost:8099/presence.html', { waitUntil: 'load' });
  // inject unlocked state + skip welcome, then reload
  await page.evaluate((s) => {
    localStorage.setItem('presence_welcome_seen', '1');
    localStorage.setItem('presence_visited', '1');
    localStorage.setItem('presence_guide_tips_seen', JSON.stringify({omnia:true,tree:true,path:true}));
    localStorage.setItem('presence_omnia_v1', JSON.stringify(s));
  }, STATE);
  await page.reload({ waitUntil: 'load' });
  await page.waitForTimeout(1200);
  // dismiss any overlays, go home, switch to the Omnia tab, render
  await page.evaluate(() => {
    ['splash','welcomeScreen','loginScreen'].forEach(id => { const e = document.getElementById(id); if (e) e.style.display='none'; });
    document.querySelectorAll('.splash,.tut-overlay,.intro-overlay,[id*="tutorial"]').forEach(e => e.style.display='none');
    document.body.classList.remove('tut-live');
    var _to=document.getElementById('tutOverlay'); if(_to) _to.style.display='none';
    ['tutOmniaTip','tutTreeTip'].forEach(function(id){var e=document.getElementById(id); if(e) e.style.display='none';});
    if (typeof showScreen === 'function') showScreen('homeScreen');
    if (typeof switchGuideTab === 'function') switchGuideTab('omnia');
    if (typeof renderOmniaEngine === 'function') renderOmniaEngine();
  });
  await page.waitForTimeout(600);
  try { await page.evaluate(() => document.fonts && document.fonts.ready); } catch(e) {}
  await page.waitForTimeout(400);

  // center an iconic fully-built tool (Crown) in the tools carousel
  await page.evaluate(() => {
    const car = document.getElementById('b2Car');
    if (car && car.children.length > 9) {
      const s = car.children[9];
      car.scrollLeft = s.offsetLeft - (car.clientWidth - s.offsetWidth) / 2;
    }
  });
  await page.waitForTimeout(300);

  const info = await page.evaluate(() => {
    const t = document.getElementById('omniaTurnings');
    return { present: !!t, len: t ? t.innerHTML.length : 0, text: t ? t.innerText.slice(0,160) : '' };
  });
  console.log('omniaTurnings:', JSON.stringify(info));

  // full-panel element screenshot
  const el = await page.$('#omniaTurnings');
  if (el) await el.screenshot({ path: path.join(OUTDIR, 'book2-panel-full.png') });

  // viewport shot scrolled to the panel for context
  await page.evaluate(() => { const t = document.getElementById('omniaTurnings'); if (t) t.scrollIntoView({block:'start'}); });
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(OUTDIR, 'book2-viewport.png') });

  await browser.close();
  console.log('done');
})().catch(e => { console.error(e); process.exit(1); });
