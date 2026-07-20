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
    assert.equal((await page.locator('#exBannerTitle').textContent()).trim(), name);
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
  assert.deepEqual(errors, [], 'profile sky check emitted browser errors');
  await context.close();
}

async function testFriendMessageReturn(browser, baseUrl) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });
  const { page, errors } = await seedPage(context, baseUrl, { presence_auth_token: 'browser-test-token' });
  await page.evaluate(() => {
    const friend = {
      userId: 'friend-browser-test', username: 'friendly', displayName: 'Friendly',
      streak: 2, awarenessLevel: 1, awarenessXp: 0, concLevel: 1, concXp: 0,
      achEarned: {}, achMonthlyEarned: {}, commonFriendIds: []
    };
    _friendProfileCache[friend.userId] = friend;
    _chatConversations = [{ id: 'friend-browser-conv', userId: friend.userId, username: friend.username, unread: 0 }];
    renderFriendProfile(friend);
    showScreen('friendProfileScreen');
    messageFriend(friend.userId, friend.username);
  });
  await page.locator('#chatThreadScreen.active').waitFor({ state: 'visible' });
  assert.equal(await page.evaluate(() => chatThreadPreviousScreen()), 'friendProfileScreen');
  await page.locator('#chatThreadBack').click();
  await page.locator('#friendProfileScreen.active').waitFor({ state: 'visible' });
  assert.deepEqual(errors, [], 'friend-message return emitted browser errors');
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
    console.log('run - generator mastery');
    await testGeneratorMastery(browser, baseUrl);
    console.log('ok - generator mastery and Dark Matter tracks render');
    console.log('run - profile sky');
    await testProfileSky(browser, baseUrl);
    console.log('ok - profiles and Friends manager share the night sky and swipe-back path');
    console.log('run - friend message return');
    await testFriendMessageReturn(browser, baseUrl);
    console.log('ok - friend message returns directly to the friend profile');
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
