'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');

let chromium;
try {
  ({ chromium } = require('playwright'));
} catch (error) {
  throw new Error('Playwright is required for browser smoke tests. Install it or expose it through NODE_PATH.');
}

const root = path.join(__dirname, '..');
const mime = {
  '.css': 'text/css', '.html': 'text/html', '.js': 'text/javascript',
  '.json': 'application/json', '.jpg': 'image/jpeg', '.png': 'image/png',
  '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json'
};

function startStaticServer() {
  const server = http.createServer((req, res) => {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    const relative = pathname === '/' ? 'presence.html' : pathname.replace(/^\/+/, '');
    const file = path.resolve(root, relative);
    if (!file.startsWith(root + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
      res.writeHead(404).end('Not found');
      return;
    }
    res.writeHead(200, { 'Content-Type': mime[path.extname(file)] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => resolve(server));
  });
}

function launchOptions() {
  const configured = process.env.PRESENCE_CHROME_PATH;
  const macChrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  const executablePath = configured || (fs.existsSync(macChrome) ? macChrome : null);
  return executablePath ? { headless: true, executablePath } : { headless: true };
}

async function seedPage(context, baseUrl, storage, cloudData) {
  await context.addInitScript(values => {
    if (sessionStorage.getItem('__presence_browser_smoke_seeded')) return;
    localStorage.clear();
    sessionStorage.clear();
    sessionStorage.setItem('__presence_browser_smoke_seeded', '1');
    // The smoke suite is about app state, not browser push enrollment. A
    // blocked service worker leaves navigator.serviceWorker.ready pending
    // forever, so expose a fast no-subscription path for reset/sign-out tests.
    try {
      const registration = { pushManager: { getSubscription: async () => null } };
      Object.defineProperty(navigator, 'serviceWorker', {
        value: {
          controller: null,
          ready: Promise.resolve(registration),
          register: async () => registration,
          addEventListener: () => {}
        },
        configurable: true
      });
    } catch (e) {}
    Object.entries(values).forEach(([key, value]) => localStorage.setItem(key, value));
  }, Object.assign({ presence_welcome_seen: '1', presence_visited: '1' }, storage || {}));
  await context.route('https://presence-server-acik.onrender.com/**', async route => {
    const url = route.request().url();
    if (url.includes('/sync/pull')) {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({
        data: cloudData || null,
        account: { email: 'browser-test@example.com', username: 'browser_test', isPrivate: false }
      }) });
      return;
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' });
  });
  await context.route('https://accounts.google.com/**', route => route.abort());
  const page = await context.newPage();
  page.setDefaultTimeout(10000);
  page.setDefaultNavigationTimeout(15000);
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(baseUrl + '/presence.html?browser-smoke=' + Date.now() + '-' + Math.random(), { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => {
    const home = document.getElementById('homeScreen');
    return home && home.style.display !== 'none' && typeof window.openExerciseSetup === 'function';
  }, null, { timeout: 20000 });
  return { page, errors };
}

async function testExerciseEntry(browser, baseUrl) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });
  const { page, errors } = await seedPage(context, baseUrl);
  await page.locator('#modeConcentration').click();
  await page.locator('#concentrationPanel').waitFor({ state: 'visible' });

  const expectedNames = {
    clock: 'Clock', visual: 'Visualization', auditory: 'Auditory',
    thought: 'Thought Control', asana: 'Asana'
  };
  for (const [exercise, name] of Object.entries(expectedNames)) {
    await page.locator(`#concBeginnerGrid .exercise-card[data-exercise="${exercise}"]`).click();
    await page.locator('#exSetupScreen.active').waitFor({ state: 'visible' });
    const bannerTitle = (await page.locator('#exBannerTitle').textContent()).trim();
    const bannerSymbol = (await page.locator('#exBannerSym').innerHTML()).trim();
    if (exercise === 'visual') {
      assert.equal(bannerTitle, '', 'Visualization setup should not repeat its title in the banner');
      assert.equal(bannerSymbol, '', 'Visualization setup should not repeat its eye icon in the banner');
    } else {
      assert.equal(bannerTitle, name);
    }
    const surface = await page.locator('#exSetupScreen').evaluate(element => ({
      width: element.getBoundingClientRect().width,
      height: element.getBoundingClientRect().height,
      background: getComputedStyle(element).backgroundColor,
      contentLength: (document.getElementById('exSetupContent').textContent || '').trim().length
    }));
    assert.ok(surface.width >= 360 && surface.height >= 700, exercise + ' setup must fill the phone viewport');
    assert.ok(surface.contentLength > 10, exercise + ' setup must render its controls');
    await page.locator('#exSetupBack').click();
    await page.locator('#concentrationPanel').waitFor({ state: 'visible' });
  }
  assert.deepEqual(errors, [], 'exercise entry emitted browser errors');
  await context.close();
}

async function testGeneratorMastery(browser, baseUrl) {
  const omnia = {
    akasha: 1_000_000, darkMatter: 100_000, lastTick: Date.now(),
    bardonStep: 1, prestige: 3,
    bodies: { physical: 1, astral: 1, mental: 1 },
    upgrades: {
      current: 20, vessel: 20, attunement: 20, quickening: 20,
      gen2: 1, vessel2: 1, attune2: 1, quick2: 1,
      gen3: 1, vessel3: 1, attune3: 1, quick3: 1,
      dm1: 10, dmv1: 1, dms1: 1, dmr1: 1
    },
    reservoirs: { current: 1200 }, totalAkashaEarned: 1_000_000, totalAkashaSpent: 0,
    totalDarkMatterEarned: 100_000, totalDarkMatterSpent: 0
  };
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });
  const { page, errors } = await seedPage(context, baseUrl, {
    presence_omnia_v1: JSON.stringify(omnia)
  });

  await page.evaluate(() => {
    document.getElementById('guideOmniaPanel').classList.remove('guide-tab-hidden');
    renderOmniaEngine();
    openGenSheet('current');
  });
  const collectBadge = page.locator('#genSheetMedal .oe-gen-collectbadge');
  await collectBadge.waitFor({ state: 'visible' });
  const sheetHeightBeforeCollect = await page.locator('#genSheetBody').evaluate(element => element.getBoundingClientRect().height);
  await page.locator('#genSheetMedal').click();
  await collectBadge.waitFor({ state: 'detached' });
  const sheetHeightAfterCollect = await page.locator('#genSheetBody').evaluate(element => element.getBoundingClientRect().height);
  assert.ok(Math.abs(sheetHeightBeforeCollect - sheetHeightAfterCollect) <= 1,
    `collecting Akasha must not resize the generator drawer (${sheetHeightBeforeCollect}px → ${sheetHeightAfterCollect}px)`);
  const mastery = page.locator('[data-sheet-mastery="current"]');
  await mastery.waitFor({ state: 'visible' });
  assert.match((await mastery.textContent()).trim(), /Mastery I/);
  await mastery.click();
  await page.locator('#confirmModal.confirm-mastery.show').waitFor({ state: 'visible' });
  assert.match(await page.locator('#confirmModalTitle').textContent(), /Mastery I/);
  await page.locator('#confirmModalOk').click();
  await page.waitForFunction(() => omniaState.upgrades.current === 21);
  await page.evaluate(() => openGenSheet('current'));
  assert.match(await page.locator('#genSheetBody').textContent(), /Akashic Current\s+✦I\s+1\s+\/ 20/);

  await page.evaluate(() => openGenSheet('dm1'));
  const dmText = await page.locator('#genSheetBody').textContent();
  assert.match(dmText, /Dark Current/);
  assert.match(dmText, /Void Vessel/);
  assert.match(dmText, /Stabilization/);
  assert.match(dmText, /Umbral Resonance/);
  assert.match(dmText, /akasha/i);
  assert.deepEqual(errors, [], 'generator mastery flow emitted browser errors');
  await context.close();
}

async function testClockSettingsSwipeBack(browser, baseUrl) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, serviceWorkers: 'block' });
  const { page, errors } = await seedPage(context, baseUrl);
  const result = await page.evaluate(async () => {
    openExerciseSetup('clock');
    openClockSettings('exSetupScreen');
    for (var i = 0; i < 8; i++) document.getElementById('clkCfgBufferUp').click();
    var cappedAtTen = getClockStartBuffer() === 10 && document.getElementById('clkCfgBufferVal').textContent === '10s';
    for (var j = 0; j < 11; j++) document.getElementById('clkCfgBufferDown').click();
    var loweredToZero = getClockStartBuffer() === 0 && concState.clockTheme.startBuffer === 0
      && document.getElementById('clkCfgBufferVal').textContent === '0s';
    const screen = document.getElementById('clockSettingsScreen');
    const touch = x => new Touch({ identifier: 41, target: screen, clientX: x, clientY: 260, screenX: x, screenY: 260 });
    document.dispatchEvent(new TouchEvent('touchstart', { touches: [touch(8)], changedTouches: [touch(8)], bubbles: true }));
    document.dispatchEvent(new TouchEvent('touchmove', { touches: [touch(170)], changedTouches: [touch(170)], bubbles: true }));
    document.dispatchEvent(new TouchEvent('touchend', { touches: [], changedTouches: [touch(210)], bubbles: true }));
    await new Promise(resolve => setTimeout(resolve, 430));
    return {
      iconOnly: document.getElementById('clkCfgBack').textContent.trim() === '',
      cappedAtTen,
      loweredToZero,
      returnedToClock: document.getElementById('exSetupScreen').classList.contains('active'),
      cleanTransform: screen.style.transform === ''
    };
  });
  assert.equal(result.iconOnly, true, 'Clock customization back control should have no Back text');
  assert.equal(result.cappedAtTen, true, 'Clock start buffer should cap at ten seconds');
  assert.equal(result.loweredToZero, true, 'Clock start buffer should persist the immediate-start option');
  assert.equal(result.returnedToClock, true, 'Clock customization edge swipe should return to the Clock exercise');
  assert.equal(result.cleanTransform, true, 'Clock swipe should clean its temporary transform');
  assert.deepEqual(errors, [], 'Clock settings swipe-back emitted browser errors');
  await context.close();
}

async function testEveryDrawerScreenSwipeBack(browser, baseUrl) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, serviceWorkers: 'block' });
  const { page, errors } = await seedPage(context, baseUrl, { presence_auth_token: 'browser-test-token' });
  // Startup's final stale-lock cleanup runs at 1s and deliberately closes the
  // drawer; begin navigation checks after that one-time maintenance pass.
  await page.waitForTimeout(1100);
  const routes = [
    ['drawerReports', 'reportsScreen'],
    ['drawerJournal', 'journalScreen'],
    ['drawerPlayground', 'playgroundScreen'],
    ['drawerProfile', 'profileScreen'],
    ['drawerLodge', 'lodgeScreen'],
    ['drawerFaq', 'faqScreen'],
    ['drawerSettings', 'settingsScreen']
  ];
  await page.evaluate(() => document.getElementById('hamburgerBtn').click());
  for (const [drawerId, screenId] of routes) {
    await page.evaluate(drawerId => {
      document.getElementById(drawerId).click();
    }, drawerId);
    await page.waitForFunction(screenId => document.getElementById(screenId).classList.contains('active'), screenId);
    const state = await page.evaluate(screenId => {
      const screen = document.getElementById(screenId);
      const touch = x => new Touch({ identifier: 8, target: screen, clientX: x, clientY: 240, screenX: x, screenY: 240 });
      document.dispatchEvent(new TouchEvent('touchstart', { touches: [touch(8)], changedTouches: [touch(8)], bubbles: true }));
      document.dispatchEvent(new TouchEvent('touchmove', { touches: [touch(160)], changedTouches: [touch(160)], bubbles: true }));
      const drawer = document.getElementById('drawerOverlay');
      return {
        active: screen.classList.contains('active'),
        remembersDrawer: window._returnToDrawer,
        transform: screen.style.transform,
        currentLayer: Number(getComputedStyle(screen).zIndex),
        drawerLayer: Number(getComputedStyle(drawer).zIndex),
        drawerHostedByHome: document.getElementById('homeScreen').contains(drawer),
        pageIsTopLayer: screen.contains(document.elementFromPoint(180, 240)),
        drawerVisible: drawer.classList.contains('show'),
        livePreview: drawer.classList.contains('swipe-back-live')
      };
    }, screenId);
    assert.equal(state.active, true, `${drawerId} opens its screen`);
    assert.equal(state.remembersDrawer, true, `${drawerId} retains its drawer origin`);
    assert.match(state.transform, /translateX\(/, `${drawerId} follows the finger`);
    assert.ok(state.currentLayer > state.drawerLayer, `${drawerId} stays above the live drawer`);
    assert.equal(state.drawerHostedByHome, true, `${drawerId} structurally hosts the drawer beneath the page`);
    assert.equal(state.pageIsTopLayer, true, `${drawerId} reveals the drawer underneath the departing page`);
    assert.equal(state.drawerVisible, true, `${drawerId} reveals the drawer while swiping`);
    assert.equal(state.livePreview, true, `${drawerId} uses the live drawer preview`);
    await page.evaluate(screenId => {
      const screen = document.getElementById(screenId);
      const touch = x => new Touch({ identifier: 8, target: screen, clientX: x, clientY: 240, screenX: x, screenY: 240 });
      document.dispatchEvent(new TouchEvent('touchend', { touches: [], changedTouches: [touch(360)], bubbles: true }));
    }, screenId);
    await page.waitForFunction(() => !document.getElementById('drawerOverlay').classList.contains('swipe-back-live'));
    const completed = await page.evaluate(() => {
      const drawer = document.getElementById('drawerOverlay');
      return {
        visible: drawer.classList.contains('show'),
        livePreview: drawer.classList.contains('swipe-back-live'),
        restoredOutsideHome: !document.getElementById('homeScreen').contains(drawer)
      };
    });
    assert.equal(completed.visible, true, `${drawerId} completes into the drawer`);
    assert.equal(completed.livePreview, false, `${drawerId} promotes the live drawer without a cut`);
    assert.equal(completed.restoredOutsideHome, true, `${drawerId} restores the drawer host after completion`);
  }
  assert.deepEqual(errors, [], 'drawer screen swipe checks emitted browser errors');
  await context.close();
}

async function testProfileSky(browser, baseUrl) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, serviceWorkers: 'block' });
  const { page, errors } = await seedPage(context, baseUrl);
  const appearance = await page.evaluate(() => {
    const own = document.getElementById('profileScreen');
    const friend = document.getElementById('friendProfileScreen');
    const friends = document.getElementById('friendsPanel');
    const ownSky = getComputedStyle(own).backgroundImage;
    const friendSky = getComputedStyle(friend).backgroundImage;
    const friendsSky = getComputedStyle(friends).backgroundImage;
    const manage = getComputedStyle(document.getElementById('profFriendsMore'));
    return {
      sameSky: ownSky === friendSky,
      friendsSameSky: ownSky === friendsSky,
      starLayers: ownSky.split('radial-gradient').length - 1,
      ownTopbar: getComputedStyle(own.querySelector('.prof-topbar')).backgroundColor,
      friendTopbar: getComputedStyle(friend.querySelector('.prof-topbar')).backgroundColor,
      manageOpacity: manage.opacity,
      manageBorder: manage.borderTopWidth
    };
  });
  assert.equal(appearance.sameSky, true);
  assert.equal(appearance.friendsSameSky, true);
  assert.ok(appearance.starLayers >= 20, 'profiles and Friends manager retain the full starfield');
  assert.equal(appearance.ownTopbar, 'rgba(0, 0, 0, 0)');
  assert.equal(appearance.friendTopbar, 'rgba(0, 0, 0, 0)');
  assert.equal(appearance.manageOpacity, '1');
  assert.equal(appearance.manageBorder, '1px');
  const monthlyBadges = await page.evaluate(() => {
    achEnsureMonth();
    achState.monthly.earned = {
      mlogin_7: Date.now(), mlogin_14: Date.now(),
      mspend_3000: Date.now(), mspend_5000: Date.now(),
      mfifteen_1: Date.now()
    };
    renderProfile();
    const own = Array.from(document.querySelectorAll('#profBadges [data-ach]')).map(el => el.getAttribute('data-ach'));
    const friend = {
      userId: 'friend-badge-test', username: 'badge_friend', displayName: 'Badge Friend',
      streak: 1, awarenessLevel: 1, awarenessXp: 0, concLevel: 1, concXp: 0,
      achEarned: {}, achMonthlyKey: achMonthKey(),
      achMonthlyEarned: { mlogin_7: 1, mlogin_14: 1, mspend_3000: 1, mspend_5000: 1, mfifteen_1: 1 },
      commonFriendIds: []
    };
    renderFriendProfile(friend);
    const friendBadges = Array.from(document.querySelectorAll('#friendProfBadges [data-ach]')).map(el => el.getAttribute('data-ach'));
    const ownLocked = Array.from(document.querySelectorAll('#profBadges .prof-badge--locked')).map(el => el.getAttribute('data-ach'));
    return { own, friendBadges, ownLocked };
  });
  // Own profile: best earned per group lit, plus the unearned group's next
  // goal dimmed — the section doubles as the Monthly Badges screen's doorway.
  assert.deepEqual(monthlyBadges.own, ['mlogin_14', 'mfifteen_1', 'mspend_5000', 'mfriend_1']);
  assert.deepEqual(monthlyBadges.ownLocked, ['mfriend_1']);
  // Friend profiles keep showing earned badges only.
  assert.deepEqual(monthlyBadges.friendBadges, ['mlogin_14', 'mfifteen_1', 'mspend_5000']);
  await page.evaluate(() => {
    showScreen('profileScreen');
    openFriendsPanel();
  });
  await page.locator('#friendsPanel.fp-show').waitFor({ state: 'visible' });
  assert.equal(await page.evaluate(() => friendsPanelPreviousScreen()), 'profileScreen');
  await page.evaluate(() => {
    const panel = document.getElementById('friendsPanel');
    const touch = x => new Touch({ identifier: 1, target: panel, clientX: x, clientY: 240, screenX: x, screenY: 240 });
    document.dispatchEvent(new TouchEvent('touchstart', { touches: [touch(8)], changedTouches: [touch(8)], bubbles: true }));
    document.dispatchEvent(new TouchEvent('touchmove', { touches: [touch(250)], changedTouches: [touch(250)], bubbles: true }));
    document.dispatchEvent(new TouchEvent('touchend', { touches: [], changedTouches: [touch(300)], bubbles: true }));
  });
  await page.locator('#friendsPanel').waitFor({ state: 'hidden' });
  await page.locator('#profileScreen.active').waitFor({ state: 'visible' });
  await page.evaluate(() => {
    const friend = {
      userId: 'friend-swipe-test', username: 'swipe_friend', displayName: 'Swipe Friend',
      streak: 2, awarenessLevel: 1, awarenessXp: 0, concLevel: 1, concXp: 0,
      achEarned: {}, achMonthlyEarned: {}, commonFriendIds: []
    };
    // This Profile was opened from the hamburger menu. Returning from a
    // nested friend profile must preserve that final swipe-back destination.
    window._returnToDrawer = true;
    _friendProfileCache[friend.userId] = friend;
    openFriendProfile(friend.userId);
  });
  await page.locator('#friendProfileScreen.active').waitFor({ state: 'visible' });
  const friendTransition = await page.evaluate(() => {
    const current = document.getElementById('friendProfileScreen');
    const previous = document.getElementById('profileScreen');
    const touch = x => new Touch({ identifier: 2, target: current, clientX: x, clientY: 240, screenX: x, screenY: 240 });
    document.dispatchEvent(new TouchEvent('touchstart', { touches: [touch(8)], changedTouches: [touch(8)], bubbles: true }));
    document.dispatchEvent(new TouchEvent('touchmove', { touches: [touch(250)], changedTouches: [touch(250)], bubbles: true }));
    return {
      currentBackground: getComputedStyle(current).backgroundImage,
      previousBackground: getComputedStyle(previous).backgroundImage,
      previousVisible: getComputedStyle(previous).display
    };
  });
  assert.equal(friendTransition.currentBackground, friendTransition.previousBackground);
  assert.equal(friendTransition.previousVisible, 'flex');
  await page.evaluate(() => {
    const current = document.getElementById('friendProfileScreen');
    const touch = x => new Touch({ identifier: 2, target: current, clientX: x, clientY: 240, screenX: x, screenY: 240 });
    document.dispatchEvent(new TouchEvent('touchend', { touches: [], changedTouches: [touch(300)], bubbles: true }));
  });
  await page.locator('#profileScreen.active').waitFor({ state: 'visible' });
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(resolve)));
  const friendProfileHandoff = await page.locator('#profileScreen').evaluate(element => ({
    background: getComputedStyle(element).backgroundImage,
    position: element.style.position,
    transform: element.style.transform,
    suppressesEntryFade: element.classList.contains('swipe-back-arrival') && getComputedStyle(element).animationName === 'none'
  }));
  assert.match(friendProfileHandoff.background, /radial-gradient/);
  assert.equal(friendProfileHandoff.position, '');
  assert.equal(friendProfileHandoff.transform, '');
  assert.equal(friendProfileHandoff.suppressesEntryFade, true);
  assert.equal(await page.evaluate(() => window._returnToDrawer), true);
  await page.evaluate(() => {
    const current = document.getElementById('profileScreen');
    const touch = x => new Touch({ identifier: 3, target: current, clientX: x, clientY: 240, screenX: x, screenY: 240 });
    document.dispatchEvent(new TouchEvent('touchstart', { touches: [touch(8)], changedTouches: [touch(8)], bubbles: true }));
    document.dispatchEvent(new TouchEvent('touchmove', { touches: [touch(250)], changedTouches: [touch(250)], bubbles: true }));
    document.dispatchEvent(new TouchEvent('touchend', { touches: [], changedTouches: [touch(300)], bubbles: true }));
  });
  await page.locator('#drawerOverlay.show').waitFor({ state: 'visible' });
  await page.waitForFunction(() => !document.getElementById('drawerOverlay').classList.contains('swipe-back-live'));
  const drawerHandoff = await page.evaluate(() => ({
    overlayCount: document.querySelectorAll('.drawer-overlay').length,
    stillInSwipeLayer: document.getElementById('drawerOverlay').classList.contains('swipe-back-live')
  }));
  assert.equal(drawerHandoff.overlayCount, 1, 'swipe-back should reuse the real drawer instead of cloning it');
  assert.equal(drawerHandoff.stillInSwipeLayer, false, 'completed swipe should restore the drawer to its normal layer');
  assert.deepEqual(errors, [], 'profile sky check emitted browser errors');
  await context.close();
}

async function testFriendMessageReturn(browser, baseUrl) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, serviceWorkers: 'block' });
  const { page, errors } = await seedPage(context, baseUrl, { presence_auth_token: 'browser-test-token' });
  await page.evaluate(() => {
    const friend = {
      userId: 'friend-browser-test', username: 'friendly', displayName: 'Friendly',
      streak: 2, awarenessLevel: 1, awarenessXp: 0, concLevel: 1, concXp: 0,
      achEarned: {}, achMonthlyEarned: {}, commonFriendIds: []
    };
    _friendProfileCache[friend.userId] = friend;
    _chatConversations = [{ id: 'friend-browser-conv', userId: friend.userId, username: friend.username, unread: 0 }];
    renderProfile();
    showScreen('profileScreen');
    window._returnToDrawer = true;
    openFriendProfile(friend.userId);
    messageFriend(friend.userId, friend.username);
  });
  await page.locator('#chatThreadScreen.active').waitFor({ state: 'visible' });
  assert.equal(await page.evaluate(() => chatThreadPreviousScreen()), 'friendProfileScreen');
  const messageSky = await page.evaluate(() => ({
    profile: getComputedStyle(document.getElementById('profileScreen')).backgroundImage,
    list: getComputedStyle(document.getElementById('chatListScreen')).backgroundImage,
    thread: getComputedStyle(document.getElementById('chatThreadScreen')).backgroundImage
  }));
  assert.equal(messageSky.list, messageSky.profile, 'Messages should share the Profile night sky');
  assert.equal(messageSky.thread, messageSky.profile, 'a conversation should share the Profile night sky');
  await page.evaluate(() => {
    const current = document.getElementById('chatThreadScreen');
    const touch = x => new Touch({ identifier: 20, target: current, clientX: x, clientY: 240, screenX: x, screenY: 240 });
    document.dispatchEvent(new TouchEvent('touchstart', { touches: [touch(8)], changedTouches: [touch(8)], bubbles: true }));
    document.dispatchEvent(new TouchEvent('touchmove', { touches: [touch(250)], changedTouches: [touch(250)], bubbles: true }));
    document.dispatchEvent(new TouchEvent('touchend', { touches: [], changedTouches: [touch(300)], bubbles: true }));
  });
  await page.locator('#friendProfileScreen.active').waitFor({ state: 'visible' });
  assert.equal(await page.evaluate(() => friendProfilePreviousScreen()), 'profileScreen');
  assert.equal(await page.evaluate(() => window._returnToDrawer), true);

  const friendSwipe = await page.evaluate(() => {
    const current = document.getElementById('friendProfileScreen');
    const previous = document.getElementById('profileScreen');
    const touch = x => new Touch({ identifier: 21, target: current, clientX: x, clientY: 240, screenX: x, screenY: 240 });
    document.dispatchEvent(new TouchEvent('touchstart', { touches: [touch(8)], changedTouches: [touch(8)], bubbles: true }));
    document.dispatchEvent(new TouchEvent('touchmove', { touches: [touch(250)], changedTouches: [touch(250)], bubbles: true }));
    return {
      previousVisible: getComputedStyle(previous).display,
      sameBackground: getComputedStyle(previous).backgroundImage === getComputedStyle(current).backgroundImage,
      drawerVisible: document.getElementById('drawerOverlay').classList.contains('show')
    };
  });
  assert.equal(friendSwipe.previousVisible, 'flex');
  assert.equal(friendSwipe.sameBackground, true);
  assert.equal(friendSwipe.drawerVisible, false);
  await page.evaluate(() => {
    const current = document.getElementById('friendProfileScreen');
    const touch = x => new Touch({ identifier: 21, target: current, clientX: x, clientY: 240, screenX: x, screenY: 240 });
    document.dispatchEvent(new TouchEvent('touchend', { touches: [], changedTouches: [touch(300)], bubbles: true }));
  });
  await page.locator('#profileScreen.active').waitFor({ state: 'visible' });
  const profileHandoff = await page.evaluate(() => ({
    activeScreen: document.querySelector('.screen.active').id,
    drawerVisible: document.getElementById('drawerOverlay').classList.contains('show'),
    suppressesEntryFade: document.getElementById('profileScreen').classList.contains('swipe-back-arrival')
      && getComputedStyle(document.getElementById('profileScreen')).animationName === 'none'
  }));
  assert.equal(profileHandoff.activeScreen, 'profileScreen');
  assert.equal(profileHandoff.drawerVisible, false);
  assert.equal(profileHandoff.suppressesEntryFade, true);

  await page.evaluate(() => {
    const current = document.getElementById('profileScreen');
    const touch = x => new Touch({ identifier: 22, target: current, clientX: x, clientY: 240, screenX: x, screenY: 240 });
    document.dispatchEvent(new TouchEvent('touchstart', { touches: [touch(8)], changedTouches: [touch(8)], bubbles: true }));
    document.dispatchEvent(new TouchEvent('touchmove', { touches: [touch(250)], changedTouches: [touch(250)], bubbles: true }));
    document.dispatchEvent(new TouchEvent('touchend', { touches: [], changedTouches: [touch(300)], bubbles: true }));
  });
  await page.locator('#drawerOverlay.show').waitFor({ state: 'visible' });
  assert.deepEqual(errors, [], 'friend-message return emitted browser errors');
  await context.close();
}

async function testProfileActivityWarm(browser, baseUrl) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, serviceWorkers: 'block' });
  const { page, errors } = await seedPage(context, baseUrl, { presence_auth_token: 'browser-test-token' });
  await page.evaluate(() => {
    const originalFetch = window.fetch;
    window._profileActivityCalls = [];
    window.fetch = function(url, options) {
      const target = String(url);
      if (target.includes('/api/social/users/activity-browser/')) {
        window._profileActivityCalls.push(target);
        const isComments = target.endsWith('/comments');
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(isComments
            ? { comments: [{ id: 'warm-comment', text: 'Warmed comment', createdAt: new Date().toISOString(), post: { id: 'warm-post', username: 'other' } }] }
            : { posts: [{ id: 'warm-post', text: 'Warmed post', createdAt: new Date().toISOString(), likeCount: 0, commentCount: 0 }] })
        });
      }
      return originalFetch(url, options);
    };
    const friend = {
      userId: 'activity-browser', username: 'activity_friend', displayName: 'Activity Friend',
      streak: 2, awarenessLevel: 1, awarenessXp: 0, concLevel: 1, concXp: 0,
      achEarned: {}, achMonthlyEarned: {}, commonFriendIds: []
    };
    _friendProfileCache[friend.userId] = friend;
    openFriendProfile(friend.userId, 'homeScreen');
  });
  await page.waitForFunction(() => _profileActivityCache['activity-browser:posts'] && _profileActivityCache['activity-browser:comments']);
  const posts = await page.evaluate(() => {
    document.getElementById('friendProfPostsBtn').click();
    const body = document.getElementById('profileActivityBody');
    return { active: document.getElementById('profileActivityScreen').classList.contains('active'), text: body.textContent, loading: !!body.querySelector('.lodge-skeleton') };
  });
  assert.equal(posts.active, true);
  assert.match(posts.text, /Warmed post/);
  assert.equal(posts.loading, false, 'cached posts should paint without a loading skeleton');
  const comments = await page.evaluate(() => {
    document.getElementById('profileActivityCommentsTab').click();
    const body = document.getElementById('profileActivityBody');
    return { text: body.textContent, loading: !!body.querySelector('.lodge-skeleton'), calls: window._profileActivityCalls.slice() };
  });
  assert.match(comments.text, /Warmed comment/);
  assert.equal(comments.loading, false, 'cached comments should paint without a loading skeleton');
  assert.equal(comments.calls.filter(url => url.endsWith('/posts')).length >= 1, true);
  assert.equal(comments.calls.filter(url => url.endsWith('/comments')).length >= 1, true);
  assert.deepEqual(errors, [], 'profile activity warm-up emitted browser errors');
  await context.close();
}

async function testLodgeReadMore(browser, baseUrl) {
  // Reflections and essays are one merged post type: long posts truncate on
  // the feed with a Read more affordance that opens the full discussion.
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, serviceWorkers: 'block' });
  const { page, errors } = await seedPage(context, baseUrl, { presence_auth_token: 'lodge-readmore-token' });
  const result = await page.evaluate(() => {
    const long = 'This is a long reflection. '.repeat(20); // ~540 chars, over the preview cap
    _lodgeUserFilter = null;
    _lodgePosts = [
      { id: 'p-long', userId: 'other', username: 'other', title: 'A title', text: long, createdAt: new Date().toISOString(), type: 'note' },
      { id: 'p-short', userId: 'other2', username: 'other2', text: 'Short.', createdAt: new Date().toISOString(), type: 'note' }
    ];
    _lodgeLoading = false;
    showScreen('lodgeScreen');
    renderLodgeFeed();
    const longMore = document.querySelector('[data-post-id="p-long"] .lodge-read-more');
    const shortHasMore = !!document.querySelector('[data-post-id="p-short"] .lodge-read-more');
    const before = document.querySelector('[data-post-id="p-long"] [data-blog-full]');
    const beforeHidden = before ? getComputedStyle(before).display === 'none' : null;
    if (longMore) longMore.click();
    const detail = document.querySelector('[data-post-id="p-long"].lodge-post--detail');
    return {
      longHasMore: !!longMore,
      shortHasMore,
      title: (document.querySelector('[data-post-id="p-long"] .lodge-blog-title') || {}).textContent || null,
      beforeHidden,
      detailOpen: !!detail,
      fullTextVisible: !!detail && detail.textContent.includes(long),
      tabsGone: !document.getElementById('lodgeTabs')
    };
  });
  assert.equal(result.longHasMore, true, 'long post should show a Read more toggle');
  assert.equal(result.shortHasMore, false, 'short post should not show a Read more toggle');
  assert.equal(result.title, 'A title', 'an optional post title should render');
  assert.equal(result.beforeHidden, true, 'full text starts hidden');
  assert.equal(result.detailOpen, true, 'Read more should open the discussion view');
  assert.equal(result.fullTextVisible, true, 'the discussion view should show the full text');
  assert.equal(result.tabsGone, true, 'Reflections/Essays tabs should be gone');
  assert.deepEqual(errors, [], 'Lodge read-more emitted browser errors');
  await context.close();
}

async function testLodgeAuthorFlow(browser, baseUrl) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, serviceWorkers: 'block' });
  const { page, errors } = await seedPage(context, baseUrl, { presence_auth_token: 'lodge-author-token', presence_auth_username: 'lodge_self' });
  const result = await page.evaluate(async () => {
    authUsername = 'lodge_self';
    const post = { id: 'friend-lodge-post', userId: 'friend-lodge-user', username: 'lodge_friend', text: 'A friend’s reflection', createdAt: new Date().toISOString(), mine: false, likeCount: 2, commentCount: 1 };
    _lodgeUserFilter = null;
    _lodgePosts = [post];
    _lodgeLoading = false;
    showScreen('lodgeScreen');
    renderLodgeFeed();
    document.querySelector('.lodge-post__body').click();
    const detailOpen = !!_lodgeDetailPost && !!document.querySelector('.lodge-post--detail');
    const compactActions = !!document.querySelector('[data-lodge-like]')
      && !!document.querySelector('[data-lodge-comments]')
      && !!document.querySelector('[data-lodge-share]');
    document.querySelector('[data-lodge-discussion]').click();
    const composerOpen = getComputedStyle(document.querySelector('.lodge-comments')).display === 'block';
    document.querySelector('[data-lodge-user]').click();
    const friendProfile = document.getElementById('friendProfileScreen').classList.contains('active');

    const friendScreen = document.getElementById('friendProfileScreen');
    const profileTouch = x => new Touch({ identifier: 30, target: friendScreen, clientX: x, clientY: 260, screenX: x, screenY: 260 });
    document.dispatchEvent(new TouchEvent('touchstart', { touches: [profileTouch(8)], changedTouches: [profileTouch(8)], bubbles: true }));
    document.dispatchEvent(new TouchEvent('touchmove', { touches: [profileTouch(190)], changedTouches: [profileTouch(190)], bubbles: true }));
    document.dispatchEvent(new TouchEvent('touchend', { touches: [], changedTouches: [profileTouch(230)], bubbles: true }));
    await new Promise(resolve => setTimeout(resolve, 430));
    const screen = document.getElementById('lodgeScreen');
    const returnedToDetail = screen.classList.contains('active') && !!_lodgeDetailPost;

    const lodgeTouch = x => new Touch({ identifier: 31, target: screen, clientX: x, clientY: 260, screenX: x, screenY: 260 });
    document.dispatchEvent(new TouchEvent('touchstart', { touches: [lodgeTouch(8)], changedTouches: [lodgeTouch(8)], bubbles: true }));
    document.dispatchEvent(new TouchEvent('touchmove', { touches: [lodgeTouch(170)], changedTouches: [lodgeTouch(170)], bubbles: true }));
    document.dispatchEvent(new TouchEvent('touchend', { touches: [], changedTouches: [lodgeTouch(210)], bubbles: true }));
    await new Promise(resolve => setTimeout(resolve, 430));
    return {
      detailOpen,
      compactActions,
      composerOpen,
      friendProfile,
      returnedToDetail,
      swipedToFeed: !_lodgeDetailPost && screen.classList.contains('active'),
      cleanTransform: screen.style.transform === ''
    };
  });
  assert.equal(result.detailOpen, true, 'post taps should open an enlarged discussion');
  assert.equal(result.compactActions, true, 'discussion should expose like, comment, and share actions');
  assert.equal(result.composerOpen, true, 'the discussion line should reveal the comment composer');
  assert.equal(result.friendProfile, true, 'author taps should open the author Profile');
  assert.equal(result.returnedToDetail, true, 'swiping out of a Profile should return to its originating discussion');
  assert.equal(result.swipedToFeed, true, 'a second edge swipe should return from discussion to the Lodge feed');
  assert.equal(result.cleanTransform, true, 'Lodge swipe should clean its temporary transform');
  assert.deepEqual(errors, [], 'Lodge author flow emitted browser errors');
  await context.close();
}

async function testGuideGestureAndBanner(browser, baseUrl) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, serviceWorkers: 'block' });
  const { page, errors } = await seedPage(context, baseUrl, { presence_auth_token: 'guide-guard-token', presence_auth_username: 'guide_guard' });
  const result = await page.evaluate(async () => {
    showScreen('homeScreen');
    openGiftPath();
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    const overlay = document.getElementById('giftPathOverlay');
    const touch = x => new Touch({ identifier: 41, target: overlay, clientX: x, clientY: 280, screenX: x, screenY: 280 });
    document.dispatchEvent(new TouchEvent('touchstart', { touches: [touch(5)], changedTouches: [touch(5)], bubbles: true }));
    document.dispatchEvent(new TouchEvent('touchmove', { touches: [touch(300)], changedTouches: [touch(300)], bubbles: true }));
    document.dispatchEvent(new TouchEvent('touchend', { touches: [], changedTouches: [touch(385)], bubbles: true }));
    await new Promise(resolve => setTimeout(resolve, 460));
    const drawerStayedClosed = !document.getElementById('drawerOverlay').classList.contains('show');
    const challengeClosed = !overlay.classList.contains('gp-show');

    omniaState.bardonStep = 6;
    applyOmniaStepVisuals();
    switchMode('prayer');
    openGuide();
    const banner = document.getElementById('pathBanner');
    const figure = document.getElementById('pathBannerOmniaFigure');
    figure.style.animation = 'none';
    const br = banner.getBoundingClientRect();
    const visibleParts = [
      figure.querySelector('.path-banner-crystal'),
      figure.querySelector('.omnia-crown'),
      figure.querySelector('.omnia-mandorla:not(.omnia-mandorla--inner)'),
      figure.querySelector('.omnia-axis')
    ].filter(Boolean).map(element => {
      const rect = element.getBoundingClientRect();
      return { top: rect.top, bottom: rect.bottom };
    });
    const figureContained = visibleParts.length === 4 && visibleParts.every(rect => rect.top >= br.top - 1 && rect.bottom <= br.bottom + 1);
    return { drawerStayedClosed, challengeClosed, figureContained, visiblePartCount: visibleParts.length };
  });
  assert.equal(result.challengeClosed, true, 'the 7x2 edge swipe should close the challenge');
  assert.equal(result.drawerStayedClosed, true, 'the same swipe must not fall through to the hamburger drawer');
  assert.equal(result.visiblePartCount, 4, 'Step VI should render its complete banner geometry');
  assert.equal(result.figureContained, true, 'Step VI geometry should fit within the Practice Now banner');
  assert.deepEqual(errors, [], 'Guide gesture/banner checks emitted browser errors');
  await context.close();
}

async function testNotificationClear(browser, baseUrl) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });
  const { page, errors } = await seedPage(context, baseUrl, { presence_auth_token: 'notification-clear-token' });
  const result = await page.evaluate(async () => {
    _lodgeNotifs = [{ kind: 'like', username: 'fellow_traveler', createdAt: new Date().toISOString() }];
    document.getElementById('lodgeBellBadge').style.display = '';
    openLodgeNotifs();
    document.getElementById('notifClearBtn').click();
    await new Promise(resolve => setTimeout(resolve, 0));
    return {
      empty: _lodgeNotifs.length === 0,
      emptyCopy: document.getElementById('notifList').textContent.trim(),
      clearDisabled: document.getElementById('notifClearBtn').disabled,
      badgeHidden: document.getElementById('lodgeBellBadge').style.display === 'none'
    };
  });
  assert.equal(result.empty, true, 'clearing should remove notifications from the active list');
  assert.equal(result.emptyCopy, 'Nothing yet.', 'clearing should show the empty notification state');
  assert.equal(result.clearDisabled, true, 'Clear all should disable after the list is empty');
  assert.equal(result.badgeHidden, true, 'clearing should remove the bell badge');
  assert.deepEqual(errors, [], 'notification clear emitted browser errors');
  await context.close();
}

async function testSettingsAvatarSwipe(browser, baseUrl) {
  const profilePic = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M/wHwAF/gL+X0Y5WQAAAABJRU5ErkJggg==';
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, serviceWorkers: 'block' });
  const { page, errors } = await seedPage(context, baseUrl, {
    presence_auth_token: 'settings-browser-token',
    presence_auth_email: 'settings-browser@example.com',
    presence_auth_username: 'settings_browser',
    presence_profile_pic: profilePic
  });
  await page.evaluate(() => {
    renderSettingsExerciseList();
    showScreen('settingsScreen');
  });
  const avatar = await page.locator('#settingsProfileAvatar').evaluate(element => ({
    text: element.textContent,
    hasPic: element.classList.contains('has-pic'),
    background: getComputedStyle(element).backgroundImage
  }));
  assert.equal(avatar.text, '');
  assert.equal(avatar.hasPic, true);
  assert.match(avatar.background, /data:image\/png;base64/);

  await page.locator('#settingsProfileBanner').click();
  await page.locator('#accountSettingsScreen.active').waitFor({ state: 'visible' });
  const transition = await page.evaluate(() => {
    const current = document.getElementById('accountSettingsScreen');
    const previous = document.getElementById('settingsScreen');
    const touch = x => new Touch({ identifier: 1, target: current, clientX: x, clientY: 220, screenX: x, screenY: 220 });
    document.dispatchEvent(new TouchEvent('touchstart', { touches: [touch(8)], changedTouches: [touch(8)], bubbles: true }));
    document.dispatchEvent(new TouchEvent('touchmove', { touches: [touch(250)], changedTouches: [touch(250)], bubbles: true }));
    return {
      currentBackground: getComputedStyle(current).backgroundImage,
      previousBackground: getComputedStyle(previous).backgroundImage,
      previousVisible: getComputedStyle(previous).display
    };
  });
  assert.equal(transition.currentBackground, transition.previousBackground);
  assert.equal(transition.previousVisible, 'flex');
  await page.evaluate(() => {
    const current = document.getElementById('accountSettingsScreen');
    const touch = x => new Touch({ identifier: 1, target: current, clientX: x, clientY: 220, screenX: x, screenY: 220 });
    document.dispatchEvent(new TouchEvent('touchend', { touches: [], changedTouches: [touch(300)], bubbles: true }));
  });
  await page.locator('#settingsScreen.active').waitFor({ state: 'visible' });

  // Account Settings is also opened directly from Profile. Its swipe-back
  // must keep Profile's full night-sky surface painted through the handoff.
  await page.evaluate(() => {
    renderProfile();
    showScreen('profileScreen');
  });
  await page.locator('#profSettingsBtn').click();
  await page.locator('#accountSettingsScreen.active').waitFor({ state: 'visible' });
  const profileTransition = await page.evaluate(() => {
    const current = document.getElementById('accountSettingsScreen');
    const previous = document.getElementById('profileScreen');
    const touch = x => new Touch({ identifier: 2, target: current, clientX: x, clientY: 220, screenX: x, screenY: 220 });
    document.dispatchEvent(new TouchEvent('touchstart', { touches: [touch(8)], changedTouches: [touch(8)], bubbles: true }));
    document.dispatchEvent(new TouchEvent('touchmove', { touches: [touch(250)], changedTouches: [touch(250)], bubbles: true }));
    return { previousBackground: getComputedStyle(previous).backgroundImage, previousVisible: getComputedStyle(previous).display };
  });
  assert.match(profileTransition.previousBackground, /radial-gradient/);
  assert.equal(profileTransition.previousVisible, 'flex');
  await page.evaluate(() => {
    const current = document.getElementById('accountSettingsScreen');
    const touch = x => new Touch({ identifier: 2, target: current, clientX: x, clientY: 220, screenX: x, screenY: 220 });
    document.dispatchEvent(new TouchEvent('touchend', { touches: [], changedTouches: [touch(300)], bubbles: true }));
  });
  await page.locator('#profileScreen.active').waitFor({ state: 'visible' });
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(resolve)));
  const profileHandoff = await page.locator('#profileScreen').evaluate(element => ({
    background: getComputedStyle(element).backgroundImage,
    position: element.style.position,
    zIndex: element.style.zIndex,
    suppressesEntryFade: element.classList.contains('swipe-back-arrival') && getComputedStyle(element).animationName === 'none'
  }));
  assert.match(profileHandoff.background, /radial-gradient/);
  assert.equal(profileHandoff.position, '');
  assert.equal(profileHandoff.zIndex, '');
  assert.equal(profileHandoff.suppressesEntryFade, true);
  assert.deepEqual(errors, [], 'Settings avatar/swipe check emitted browser errors');
  await context.close();
}

async function testResetAll(browser, baseUrl) {
  const elevatedOmnia = {
    akasha: 98765, reservoir: 1200, lastTick: Date.now(), bardonStep: 10, prestige: 0,
    bodies: { physical: 18, astral: 18, mental: 18 },
    upgrades: { current: 8, gen2: 5, gen3: 3, vessel: 6 },
    totalAkashaEarned: 150000, totalAkashaSpent: 50000
  };
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });
  const { page, errors } = await seedPage(context, baseUrl, {
    presence_omnia_v1: JSON.stringify(elevatedOmnia),
    presence_v3: JSON.stringify({ level: 20, xp: 25000, totalSessions: 100, history: [{ date: '2026-07-01' }] }),
    presence_conc_v1: JSON.stringify({ level: 18, xp: 18000, totalSessions: 80, history: [{ exercise: 'clock' }] })
  });
  // This journey tests Reset, not pointer hit-testing during startup. Invoke
  // the already-located menu control directly so the splash/drawer animation
  // cannot intermittently swallow the physical click.
  await page.locator('#hamburgerBtn').evaluate(element => element.click());
  try {
    await page.locator('#drawerOverlay.show').waitFor({ state: 'visible' });
  } catch (error) {
    const drawerClass = await page.locator('#drawerOverlay').getAttribute('class');
    throw new Error('Reset test could not open the drawer: ' + JSON.stringify({ drawerClass, errors }), { cause: error });
  }
  // The drawer deliberately animates above the live app. A physical Playwright
  // click can race that transition and be intercepted by the page beneath it,
  // even though the drawer item is already visible. This journey verifies the
  // Reset behavior, so activate the located button directly.
  await page.locator('#drawerResetAll').evaluate(element => element.click());
  await page.locator('#confirmModal.show').waitFor({ state: 'visible' });
  await page.locator('#confirmModalOk').click();
  await page.waitForFunction(() => {
    const title = document.getElementById('confirmModalTitle');
    return title && title.textContent === 'Are you absolutely sure?';
  });
  await page.locator('#confirmModalOk').click();
  // Watch the durable state rather than the reload event. On WebKit and CDP,
  // location.reload() may commit before a navigation observer attaches.
  try {
    await page.waitForFunction(() => {
      const value = JSON.parse(localStorage.getItem('presence_omnia_v1') || '{}');
      return value.bodies && value.bodies.physical === 1 && value.akasha === 0;
    });
  } catch (error) {
    const diagnostic = await page.evaluate(() => ({
      omnia: localStorage.getItem('presence_omnia_v1'),
      pending: sessionStorage.getItem('presence_reset_all_pending'),
      modalTitle: document.getElementById('confirmModalTitle').textContent
    }));
    throw new Error('Reset All did not persist its clean snapshot: ' + JSON.stringify(diagnostic), { cause: error });
  }
  const reset = await page.evaluate(() => ({
    omnia: JSON.parse(localStorage.getItem('presence_omnia_v1')),
    awareness: JSON.parse(localStorage.getItem('presence_v3')),
    concentration: JSON.parse(localStorage.getItem('presence_conc_v1'))
  }));
  assert.deepEqual(reset.omnia.bodies, { physical: 1, astral: 1, mental: 1 });
  assert.equal(reset.omnia.akasha, 0);
  assert.equal(reset.awareness.level, 1);
  assert.equal(reset.concentration.level, 1);
  assert.deepEqual(errors, [], 'reset flow emitted browser errors');
  await context.close();
}

async function testCloudRestoreAndSignOut(browser, baseUrl) {
  const cloudOmnia = {
    akasha: 4321, reservoir: 0, lastTick: Date.now(), bardonStep: 2, prestige: 0,
    bodies: { physical: 4, astral: 5, mental: 6 }, upgrades: { current: 2 },
    totalAkashaEarned: 7000, totalAkashaSpent: 1000
  };
  const cloudData = {
    presence_v3: JSON.stringify({ level: 7, xp: 6200, totalSessions: 22, history: [{ date: '2026-07-15', duration: 600 }] }),
    presence_conc_v1: JSON.stringify({ level: 6, xp: 5100, totalSessions: 18, history: [{ exercise: 'clock', duration: 300 }] }),
    presence_omnia_v1: JSON.stringify(cloudOmnia)
  };
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });
  const { page, errors } = await seedPage(context, baseUrl, {
    presence_auth_token: 'browser-test-token',
    presence_auth_email: 'browser-test@example.com'
  }, cloudData);
  await page.waitForFunction(() => {
    const value = JSON.parse(localStorage.getItem('presence_v3') || '{}');
    return value.level === 7 && value.totalSessions === 22;
  });
  const restored = await page.evaluate(() => ({
    awareness: JSON.parse(localStorage.getItem('presence_v3')),
    omnia: JSON.parse(localStorage.getItem('presence_omnia_v1')),
    renderedLevel: document.getElementById('levelNum') && document.getElementById('levelNum').textContent
  }));
  assert.equal(restored.awareness.level, 7);
  assert.deepEqual(restored.omnia.bodies, { physical: 4, astral: 5, mental: 6 });

  await page.locator('#hamburgerBtn').evaluate(element => element.click());
  await page.locator('#drawerOverlay.show').waitFor({ state: 'visible' });
  await page.locator('#drawerSettings').evaluate(element => element.click());
  await page.locator('#settingsProfileBanner').click();
  await page.locator('#syncLogoutBtn').waitFor({ state: 'visible' });
  await page.locator('#syncLogoutBtn').click();
  await page.locator('#confirmModal.show').waitFor({ state: 'visible' });
  const signedOutReload = page.waitForNavigation({ waitUntil: 'domcontentloaded' });
  await page.locator('#confirmModalOk').click();
  await signedOutReload;
  await page.waitForFunction(() => !localStorage.getItem('presence_auth_token'));
  const signedOut = await page.evaluate(() => ({
    token: localStorage.getItem('presence_auth_token'),
    omnia: JSON.parse(localStorage.getItem('presence_omnia_v1')),
    awareness: JSON.parse(localStorage.getItem('presence_v3'))
  }));
  assert.equal(signedOut.token, null);
  assert.deepEqual(signedOut.omnia.bodies, { physical: 1, astral: 1, mental: 1 });
  assert.equal(signedOut.omnia.akasha, 0);
  assert.equal(signedOut.awareness.level, 1);
  assert.deepEqual(errors, [], 'cloud/sign-out flow emitted browser errors');
  await context.close();
}

(async () => {
  const configuredBaseUrl = process.env.PRESENCE_BASE_URL;
  const server = configuredBaseUrl ? null : await startStaticServer();
  const address = server && server.address();
  const baseUrl = configuredBaseUrl || `http://127.0.0.1:${address.port}`;
  const browser = process.env.PRESENCE_CDP_URL
    ? await chromium.connectOverCDP(process.env.PRESENCE_CDP_URL)
    : await chromium.launch(launchOptions());
  try {
    console.log('run - exercise entry');
    await testExerciseEntry(browser, baseUrl);
    console.log('ok - exercise cards open complete setup screens');
    console.log('run - every drawer screen swipe-back');
    await testEveryDrawerScreenSwipeBack(browser, baseUrl);
    console.log('ok - every drawer screen follows the finger and reveals the live drawer');
    console.log('run - generator mastery');
    await testGeneratorMastery(browser, baseUrl);
    console.log('ok - generator mastery and Dark Matter tracks render');
    console.log('run - Clock settings swipe-back');
    await testClockSettingsSwipeBack(browser, baseUrl);
    console.log('ok - Clock customization uses an icon-only back control and returns by swipe');
    console.log('run - profile sky');
    await testProfileSky(browser, baseUrl);
    console.log('ok - profiles and Friends manager share the night sky and swipe-back path');
    console.log('run - friend message return');
    await testFriendMessageReturn(browser, baseUrl);
    console.log('ok - friend message returns directly to the friend profile');
    console.log('run - profile activity warm-up');
    await testProfileActivityWarm(browser, baseUrl);
    console.log('ok - profile posts and comments are warm before either tab opens');
    console.log('run - Lodge read more');
    await testLodgeReadMore(browser, baseUrl);
    console.log('ok - Lodge feed truncates long posts into a full discussion view');
    console.log('run - Lodge author flow');
    await testLodgeAuthorFlow(browser, baseUrl);
    console.log('ok - Lodge discussion actions and Profile return navigation work');
    console.log('run - Guide gesture and Step VI banner');
    await testGuideGestureAndBanner(browser, baseUrl);
    console.log('ok - 7x2 swipe stays isolated and the Step VI figure fits its banner');
    console.log('run - notification clear');
    await testNotificationClear(browser, baseUrl);
    console.log('ok - notifications clear immediately and persist through the social endpoint');
    console.log('run - Settings avatar and swipe');
    await testSettingsAvatarSwipe(browser, baseUrl);
    console.log('ok - Settings uses the saved profile photo and keeps its background during swipe-back');
    console.log('run - Reset All');
    await testResetAll(browser, baseUrl);
    console.log('ok - Reset All restores level-one clean state');
    console.log('run - cloud restore and sign-out');
    await testCloudRestoreAndSignOut(browser, baseUrl);
    console.log('ok - cloud restoration and sign-out replace local state');
  } finally {
    await browser.close();
    if (server) await new Promise(resolve => server.close(resolve));
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
