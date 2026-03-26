import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';

// Unified GradeBook Service Worker - Handles PWA and Push Notifications
precacheAndRoute(self.__WB_MANIFEST || []);
cleanupOutdatedCaches();

const SW_VERSION = '1.2.0';
const CACHE_NAMES = {
  static: `gb-static-${SW_VERSION}`,
  dynamic: `gb-dynamic-${SW_VERSION}`,
  data: `gb-data-${SW_VERSION}`,
  icons: 'gb-icons'
};

const STATIC_ASSETS = ['/', '/index.html', '/manifest.json'];
const ICON_FILES = ['/favicon.ico', '/logo192.png', '/logo512.png', '/apple-touch-icon.png'];
const API_PATHS = ['/api/users', '/api/schools', '/api/directions', '/api/subjects', '/api/grades', '/api/notifications'];

// --- PLATFORM & NOTIFICATION HELPERS ---
class NotificationManager {
  static getOptions(data) {
    const ua = self.navigator.userAgent;
    const isIOS = /iPad|iPhone|iPod/.test(ua) || (self.navigator.platform === 'MacIntel' && self.navigator.maxTouchPoints > 1);
    
    const options = {
      body: data.body || 'New notification received',
      icon: '/logo192.png',
      badge: '/badge-icon.png',
      tag: data.tag || `gb-notif-${Date.now()}`,
      data: { 
        url: data.url || '/app/notifications',
        targetUserId: data.data?.targetUserId || data.targetUserId
      },
      timestamp: Date.now()
    };

    if (isIOS) return { ...options, vibrate: [] };
    return {
      ...options,
      actions: [
        { action: 'view', title: 'View' },
        { action: 'dismiss', title: 'Dismiss' }
      ],
      vibrate: [200, 100, 200]
    };
  }

  async shouldShowNotification(data) {
    const targetUserId = data.data?.targetUserId || data.targetUserId;
    if (!targetUserId) return true; // Show if no target specified (broadcast)

    const currentUserId = await this.getStoredValue('userAuth', 'currentUser', 'userId');
    if (currentUserId && targetUserId !== currentUserId) return false;

    const pushEnabled = await this.getStoredValue('userPreferences', 'pushNotificationEnabled', 'value');
    return pushEnabled !== false && pushEnabled !== 'false';
  }

  getStoredValue(storeName, key, valueField) {
    return new Promise((resolve) => {
      const request = indexedDB.open('GradeBookApp', 2); // Use version 2 as per PushNotificationManager
      request.onsuccess = () => {
        try {
          const db = request.result;
          if (!db.objectStoreNames.contains(storeName)) return resolve(null);
          const tx = db.transaction([storeName], 'readonly');
          const store = tx.objectStore(storeName);
          const getReq = store.get(key);
          getReq.onsuccess = () => resolve(getReq.result ? getReq.result[valueField] : null);
        } catch (e) { resolve(null); }
      };
      request.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains('userAuth')) db.createObjectStore('userAuth');
        if (!db.objectStoreNames.contains('userPreferences')) db.createObjectStore('userPreferences');
      };
      request.onerror = () => resolve(null);
    });
  }
}

const notifManager = new NotificationManager();

// --- EVENT LISTENERS ---

self.addEventListener('install', (event) => {
  event.waitUntil(
    Promise.all([
      caches.open(CACHE_NAMES.static).then(c => c.addAll(STATIC_ASSETS)),
      caches.open(CACHE_NAMES.icons).then(c => c.addAll(ICON_FILES))
    ]).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.map(key => {
        if (key.includes('gb-') && !Object.values(CACHE_NAMES).includes(key)) {
          return caches.delete(key);
        }
      })
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  // Network First for Navigation and API
  if (event.request.mode === 'navigate' || API_PATHS.some(p => url.pathname.includes(p))) {
    event.respondWith(
      fetch(event.request)
        .then(res => {
          if (res.status === 200) {
            const clone = res.clone();
            caches.open(CACHE_NAMES.data).then(c => c.put(event.request, clone));
          }
          return res;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Cache First for Assets
  event.respondWith(
    caches.match(event.request).then(res => res || fetch(event.request).then(netRes => {
      if (netRes.status === 200) {
        const clone = netRes.clone();
        caches.open(CACHE_NAMES.dynamic).then(c => c.put(event.request, clone));
      }
      return netRes;
    }))
  );
});

// Push Handling
self.addEventListener('push', (event) => {
  event.waitUntil((async () => {
    let data = { title: 'GradeBook', body: 'New notification available' };
    if (event.data) {
      try { data = event.data.json(); } catch (e) { console.error('Push Parse Error', e); }
    }
    
    if (await notifManager.shouldShowNotification(data)) {
      await self.registration.showNotification(data.title, NotificationManager.getOptions(data));
    }
  })());
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/app/notifications';
  
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
      for (const client of clients) {
        if (client.url.includes(targetUrl) && 'focus' in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(targetUrl);
    })
  );
});
