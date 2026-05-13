// Service Worker for Presence app
// Handles background push notifications

// Derive app URL from service worker's own scope (works from any repo path)
const APP_URL = self.registration ? self.registration.scope + 'presence.html' : '/Consciousness-App/presence.html';

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
    tag: 'presence-reminder',
    renotify: true,
    requireInteraction: false,
    data: { url: data.url || APP_URL }
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'Presence', options)
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

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', event => event.waitUntil(clients.claim()));
