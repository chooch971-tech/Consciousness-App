// Service Worker for Presence app
// Handles background push notifications + shell caching
// Cache version — bump this string when you need to force-evict all clients
const CACHE = 'presence-shell-v374';

const APP_URL = self.registration
  ? self.registration.scope + 'presence.html'
  : '/Consciousness-App/presence.html';

// Assets to precache on install (small, stable files)
const PRECACHE = [
  'manifest.webmanifest',
  'calendar.js',
  'sync-contract.js',
  'progress-state.js',
  'sync-merge.js',
  'practice-review-state.js',
  'practice-review-ai-policy.js',
  'awareness-client.js',
  'concentration-state-client.js',
  'concentration-clock-client.js',
  'visualization-client.js',
  'auditory-client.js',
  'thought-control-client.js',
  'asana-client.js',
  'senses-client.js',
  'app-shell-client.js',
  'omnia-ambient-client.js',
  'concentration-controls-client.js',
  'pore-breathing-client.js',
  'app-preferences-client.js',
  'guide-config-client.js',
  'omnia-economy-config-client.js',
  'omnia-cosmetics-config-client.js',
  'omnia-progression-config-client.js',
  'omnia-story-client.js',
  'omnia-state-client.js',
  'omnia-ledger-client.js',
  'omnia-appearance-client.js',
  'omnia-economy-client.js',
  'omnia-book2-client.js',
  'omnia-rewards-client.js',
  'omnia-engine-client.js',
  'omnia-morph-client.js',
  'guide-path-client.js',
  'guide-quests-client.js',
  'guide-shell-client.js',
  'profile-client.js',
  'settings-client.js',
  'achievements-client.js',
  'prayer-client.js',
  'streak-celebration-client.js',
  'session-complete-client.js',
  'streak-client.js',
  'omnia-companion-client.js',
  'reminders-client.js',
  'pavlok-client.js',
  'tutorial-post-session-client.js',
  'tutorial-client.js',
  'soul-mirror-client.js',
  'reports-client.js',
  'platform-client.js',
  'journal-client.js',
  'social-client.js',
  'apple-touch-icon.png',
];

// ── Install: precache stable assets ──────────────────────────────────────────
self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(PRECACHE).catch(() => {}))
  );
});

// ── Activate: delete stale caches ────────────────────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => clients.claim())
  );
});

// ── Fetch: network-first for presence.html, cache-first for rest ─────────────
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Only handle same-origin GET requests
  if (event.request.method !== 'GET' || url.origin !== self.location.origin) return;

  // Skip API calls
  if (url.pathname.startsWith('/api/')) return;

  const isShell = url.pathname.endsWith('presence.html');

  event.respondWith(
    caches.open(CACHE).then(cache =>
      cache.match(event.request).then(cached => {
        const networkFetch = fetch(event.request).then(response => {
          if (response && response.status === 200) {
            cache.put(event.request, response.clone());
          }
          return response;
        }).catch(() => cached); // offline: fall back to cached

        // The shell (presence.html) is the single source of all app code and
        // changes often, so it's network-FIRST: a connected device always gets
        // the freshest version, falling back to cache only when offline. This
        // is what keeps a returning device from running stale code against the
        // synced cloud state. Everything else stays cache-first for speed.
        return isShell ? networkFetch : (cached || networkFetch);
      })
    )
  );
});

// ── Push notifications ────────────────────────────────────────────────────────
// Practice Reminder pushes (tag 'presence-practice-reminder') are suppressed
// while the player is mid-exercise in a Concentration session — see the flag
// setup in awareness-client.js. The flag lives in IndexedDB because this
// service worker context can't read the page's localStorage. Reads default
// to "not suppressed" on any failure (missing DB, no flag yet, etc.) so a
// broken check can never silently swallow a real reminder.
const PRESENCE_SESSION_FLAG_DB = 'presence_session_flags';
const PRESENCE_SESSION_FLAG_STORE = 'flags';
const PRESENCE_SESSION_FLAG_KEY = 'inConcentrationSession';
function presenceIsInConcentrationSession() {
  return new Promise(resolve => {
    if (!self.indexedDB) { resolve(false); return; }
    const req = self.indexedDB.open(PRESENCE_SESSION_FLAG_DB, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(PRESENCE_SESSION_FLAG_STORE)) db.createObjectStore(PRESENCE_SESSION_FLAG_STORE);
    };
    req.onsuccess = () => {
      try {
        const tx = req.result.transaction(PRESENCE_SESSION_FLAG_STORE, 'readonly');
        const getReq = tx.objectStore(PRESENCE_SESSION_FLAG_STORE).get(PRESENCE_SESSION_FLAG_KEY);
        getReq.onsuccess = () => {
          const rec = getReq.result;
          resolve(!!(rec && rec.active && rec.expiresAt > Date.now()));
        };
        getReq.onerror = () => resolve(false);
      } catch (e) { resolve(false); }
    };
    req.onerror = () => resolve(false);
  });
}

self.addEventListener('push', event => {
  let data = {};
  try {
    data = event.data.json();
  } catch(e) {
    data = { title: 'Presence', body: event.data ? event.data.text() : 'Are you here right now?' };
  }

  const iconUrl = new URL('presence-icon-redesign.svg', self.registration.scope).href;
  const options = {
    body: data.body || 'Are you here right now?',
    icon: iconUrl,
    badge: iconUrl,
    tag: data.tag || 'presence-reminder',
    renotify: true,
    requireInteraction: false,
    data: { url: data.url || APP_URL }
  };

  const isPracticeReminder = data.tag === 'presence-practice-reminder';
  // Pavlok is fired server-side (firePavlokServer) — exactly once per bell.
  // The SW must NOT also fire it, or the duplicate trips Pavlok's rate limit
  // and zaps go silent after a couple of hits. Just show the notification.
  event.waitUntil(
    (isPracticeReminder ? presenceIsInConcentrationSession() : Promise.resolve(false)).then(suppress => {
      if (suppress) return; // mid-exercise — the session already has the player's full attention
      return self.registration.showNotification(data.title || 'Presence', options);
    })
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url)
    ? event.notification.data.url
    : APP_URL;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      for (const client of clientList) {
        if (client.url.includes('presence.html') && 'focus' in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});
