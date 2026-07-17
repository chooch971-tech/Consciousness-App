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
  await page.locator('#hamburgerBtn').click();
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

  await page.locator('#hamburgerBtn').click();
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
