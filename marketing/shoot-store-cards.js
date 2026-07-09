const { chromium } = require('/tmp/node_modules/playwright');
const SCRATCH = '/tmp/claude-0/-home-user-Consciousness-App/b82bdf13-111b-5148-828c-6e25b6345b74/scratchpad';
(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const ctx = await browser.newContext({ viewport: { width: 402, height: 874 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  const errs = []; page.on('pageerror', e => errs.push(String(e).slice(0,120)));
  await page.goto('http://localhost:8099/presence.html', { waitUntil: 'load' });
  await page.evaluate(() => {
    localStorage.clear();
    localStorage.setItem('presence_welcome_seen','1'); localStorage.setItem('presence_visited','1');
    localStorage.setItem('presence_guide_tips_seen', JSON.stringify({omnia:true,tree:true,path:true}));
    localStorage.setItem('presence_conc_v1', JSON.stringify({ level: 34, xp: 0, bestSeconds: 585, totalSessions: 240, lifetimeBreaths: 800, history: [] }));
    localStorage.setItem('presence_v3', JSON.stringify({ level: 18, xp: 0, streak: 45, longestStreak: 45, totalSessions: 60, practicedDates: [], history: [] }));
    localStorage.setItem('presence_omnia_v1', JSON.stringify({ akasha: 7757, prestige: 0, bardonStep: 4, totalAkashaEarned: 20000, totalAkashaSpent: 8000, bodies: { physical: 45, astral: 61, mental: 63 } }));
  });
  await page.reload({ waitUntil: 'load' });
  await page.waitForTimeout(1600);
  const clean = () => page.evaluate(() => {
    document.body.classList.remove('tut-live');
    ['splash','welcomeScreen','tutOverlay','tutOmniaTip','tutTreeTip'].forEach(id => { var e=document.getElementById(id); if(e) e.style.display='none'; });
  });
  await clean();

  // ── CLOCK: begin the real session, let the hand sweep 21s ──
  await page.evaluate(() => { openExerciseSetup('clock'); });
  await page.waitForTimeout(800);
  await page.evaluate(() => {
    var btns = Array.from(document.querySelectorAll('#exSetupScreen button')).filter(b => b.offsetParent && /begin/i.test(b.textContent));
    if (btns.length) btns[btns.length-1].click();
  });
  await page.waitForTimeout(1000);
  // tap to actually start the watch
  await page.evaluate(() => {
    var t = Array.from(document.querySelectorAll('button, .clk-begin, [id*="clk"]')).filter(b => b.offsetParent && /tap to begin/i.test(b.textContent||''));
    if (t.length) t[0].click();
  });
  await page.waitForTimeout(21000);
  await clean();
  await page.evaluate(() => {
    var st = document.createElement('style');
    st.textContent = '.clock-face { filter:drop-shadow(0 0 34px rgba(224,150,80,.45)) drop-shadow(0 0 80px rgba(224,140,70,.2)); }'
      + ' #concSessionLabel { display:block !important; opacity:1 !important; color:#f0c8a0 !important; font-size:13px !important; letter-spacing:.22em; text-shadow:0 0 16px rgba(224,150,80,.5); }';
    document.head.appendChild(st);
    var lbl = document.getElementById('concSessionLabel');
    if (lbl) { lbl.textContent = 'focus on the tip of the seconds hand'; lbl.style.display = 'block'; }
  });
  await page.waitForTimeout(300);
  await page.screenshot({ path: SCRATCH + '/store-clock-raw.png' });

  // ── VISUALIZATION: force the Violet Pentagram, study phase ──
  await page.evaluate(() => {
    window.pickVisObject = function() { return { shape:'svg_candle', label:'Candle' }; };
    openExerciseSetup('visual');
  });
  await page.waitForTimeout(800);
  await page.evaluate(() => {
    var btns = Array.from(document.querySelectorAll('#exSetupScreen button')).filter(b => b.offsetParent && /begin/i.test(b.textContent));
    if (btns.length) btns[btns.length-1].click();
  });
  await page.waitForTimeout(1400);
  await clean();
  await page.evaluate(() => {
    var st = document.createElement('style');
    st.textContent = '#visStudyObject svg { filter:brightness(1.22) saturate(1.15) drop-shadow(0 0 30px rgba(255,190,90,.65)) drop-shadow(0 0 90px rgba(255,160,60,.3)); transform:scale(1.15); }'
      + ' #visStudyScreen { background:radial-gradient(ellipse 95% 55% at 50% 32%, rgba(255,170,70,.12), transparent 70%), #07080d !important; }'
      + ' #visStudyLabel { color:#f4dcae !important; font-size:24px !important; text-shadow:0 0 20px rgba(255,190,100,.5); }'
      + ' #visStudyLabel + div { color:rgba(232,222,206,.85) !important; font-size:12px !important; }'
      + ' .session-title { color:#f0b880 !important; }';
    document.head.appendChild(st);
  });
  await page.waitForTimeout(300);
  await page.screenshot({ path: SCRATCH + '/store-vis-raw.png' });
  console.log('errors:', errs.length ? errs.slice(0,3) : 'none');
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
