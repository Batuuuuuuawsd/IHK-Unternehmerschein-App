// Service Worker for IHK Taxi Exam PWA
const CACHE_NAME = 'ihk-taxi-v1.0.0';
const STATIC_CACHE = `${CACHE_NAME}-static`;
const DATA_CACHE = `${CACHE_NAME}-data`;

// URLs to cache for offline functionality
const FILES_TO_CACHE = [
  '/',
  '/static/css/main.css',
  '/static/js/main.js',
  '/manifest.json',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap'
];

const API_URL = 'https://a1ea7671-5737-4b2d-bcb5-a47437e8d142.preview.emergentagent.com/api';

// Install service worker
self.addEventListener('install', (event) => {
  console.log('[SW] Install');
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('[SW] Pre-caching offline page');
        return cache.addAll(FILES_TO_CACHE);
      })
      .then(() => {
        return self.skipWaiting();
      })
  );
});

// Activate service worker
self.addEventListener('activate', (event) => {
  console.log('[SW] Activate');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((thisCacheName) => {
          if (thisCacheName !== STATIC_CACHE && thisCacheName !== DATA_CACHE) {
            console.log('[SW] Removing old cache', thisCacheName);
            return caches.delete(thisCacheName);
          }
        })
      );
    })
  );
  return self.clients.claim();
});

// Fetch event handler
self.addEventListener('fetch', (event) => {
  if (event.request.url.includes('/api/')) {
    // API requests - cache with network first strategy
    event.respondWith(
      caches.open(DATA_CACHE).then((cache) => {
        return fetch(event.request)
          .then((response) => {
            // If the response is valid, clone it and store in cache
            if (response.status === 200) {
              cache.put(event.request.url, response.clone());
            }
            return response;
          })
          .catch((error) => {
            // Network failed, try cache
            return cache.match(event.request);
          });
      })
    );
    return;
  }

  // Static resources - cache first strategy
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});

// Background sync for offline answers
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync-answers') {
    console.log('[SW] Background sync answers');
    event.waitUntil(syncOfflineAnswers());
  }
});

async function syncOfflineAnswers() {
  try {
    const cache = await caches.open(DATA_CACHE);
    const requests = await cache.keys();
    
    const offlineAnswers = requests.filter(request => 
      request.url.includes('/api/answer') && request.method === 'POST'
    );

    for (const request of offlineAnswers) {
      try {
        await fetch(request);
        await cache.delete(request);
      } catch (error) {
        console.log('[SW] Failed to sync answer:', error);
      }
    }
  } catch (error) {
    console.log('[SW] Background sync failed:', error);
  }
}

// Push notification handler
self.addEventListener('push', (event) => {
  console.log('[SW] Push received');
  
  const options = {
    body: event.data ? event.data.text() : 'Zeit für eine neue Lerneinheit!',
    icon: '/icons/icon-192.png',
    badge: '/icons/badge-72.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: 'Jetzt lernen',
        icon: '/icons/checkmark.png'
      },
      {
        action: 'close',
        title: 'Später',
        icon: '/icons/xmark.png'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification('IHK Taxi Exam', options)
  );
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification click received');
  
  event.notification.close();

  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('/')
    );
  } else if (event.action === 'close') {
    // Just close the notification
  } else {
    // Default action - open app
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});