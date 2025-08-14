/* Chatboot PWA Service Worker */
const STATIC_CACHE = 'cb-static-v2';
const RUNTIME_CACHE = 'cb-runtime-v1';
const CORE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/offline.html'
];

// Create minimal offline page dynamically if not provided
async function ensureOfflinePage(cache) {
  const res = await cache.match('/offline.html');
  if (!res) {
    const offlineMarkup = `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Offline</title><meta name="viewport" content="width=device-width,initial-scale=1"/><style>body{font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;background:#0d1117;color:#fff;display:flex;align-items:center;justify-content:center;min-height:100vh;padding:1.5rem;text-align:center}h1{font-size:1.6rem;margin-bottom:.75rem}p{opacity:.8;font-size:.9rem;line-height:1.35}</style></head><body><main><h1>You're offline</h1><p>Messages will sync automatically when connection is restored.<br/>You can still reopen the app shell.</p></main></body></html>`;
    await cache.put('/offline.html', new Response(offlineMarkup, { headers: { 'Content-Type': 'text/html' } }));
  }
}

// Single install handler: pre-cache core assets, ensure offline page, then (optionally) skipWaiting and schedule update broadcast
self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(STATIC_CACHE);
    await cache.addAll(CORE_ASSETS.filter(a => a !== '/offline.html'));
    await ensureOfflinePage(cache);
    // Immediate activation improves user getting new SW (can comment out to allow manual update prompt flow)
    self.skipWaiting();
    // Broadcast update readiness shortly after install (only meaningful on upgrades)
    setTimeout(() => broadcastUpdate().catch(()=>{}), 400);
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil(
  caches.keys().then(keys => Promise.all(keys.filter(k => ![STATIC_CACHE, RUNTIME_CACHE].includes(k)).map(k => caches.delete(k)))).then(() => self.clients.claim())
  );
});


self.addEventListener('push', event => {
  let data = {};
  try { data = event.data?.json() || {}; } catch { data = { title: 'Message', body: event.data?.text?.() || '' }; }
  const title = data.title || 'New Message';
  const body = data.body || '';
  const tag = data.tag || 'chat-msg';
  const clickUrl = data.clickUrl || data.click_action || '/';
  const senderId = data.senderId || data.sender_id || '';
  const notifData = { url: clickUrl, senderId };
  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: '/weather-app.png',
      badge: '/weather-app.png',
      data: notifData,
      tag,
    })
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const payload = event.notification.data || { url: '/' };
  const targetPath = typeof payload === 'string' ? payload : (payload.url || '/');
  const senderId = typeof payload === 'object' ? payload.senderId : '';
  event.waitUntil((async () => {
    const allClients = await clients.matchAll({ type: 'window', includeUncontrolled: true });
    // Prefer a focused/visible client
    let client = allClients.find(c => 'focus' in c);
    if (client) {
      await client.focus();
      // Post message so SPA can route internally without full reload
      client.postMessage({ type: 'OPEN_CHAT', url: targetPath, senderId });
    } else {
      // No existing window: open directly to deep link (ensures route path retained)
      const absoluteUrl = new URL(targetPath, self.location.origin).href;
      await clients.openWindow(absoluteUrl);
    }
  })());
});

/**
 * Strategy:
 *  - Static/navigation requests: network first fallback to cache (so updates arrive)
 *  - Other GET (images/css/js): stale-while-revalidate
 *  - Skip caching for: socket.io, /credential, media streams
 */
self.addEventListener('fetch', event => {
  const req = event.request;
  const url = new URL(req.url);

  if (req.method !== 'GET') return;

  // Ignore browser extension and unsupported schemes
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return;
  if (url.protocol.startsWith('chrome-extension')) return;

  // Skip dynamic realtime endpoints
  if (url.pathname.includes('socket.io') || url.pathname.startsWith('/credential')) return;

  // Navigation requests (SPA)
  if (req.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const res = await fetch(req);
        const copy = res.clone();
        caches.open(STATIC_CACHE).then(c => c.put('/', copy));
        return res;
      } catch {
        return (await caches.match('/', { ignoreSearch: true })) || (await caches.match('/offline.html'));
      }
    })());
    return;
  }

  // Static assets (hashed)
  if (url.pathname.match(/\.(js|css|svg|png|jpg|jpeg|gif|webp|ico)$/)) {
    event.respondWith(staleWhileRevalidate(req));
    return;
  }

  // API JSON: network first with fallback
  if (req.headers.get('accept')?.includes('application/json')) {
    event.respondWith(networkFirst(req));
    return;
  }
});

async function staleWhileRevalidate(request) {
  const cache = await caches.open(RUNTIME_CACHE);
  const cached = await cache.match(request);
  const networkPromise = fetch(request).then(res => {
    if (res.ok) cache.put(request, res.clone());
    return res;
  }).catch(() => cached);
  return cached || networkPromise;
}

async function networkFirst(request) {
  const cache = await caches.open(RUNTIME_CACHE);
  try {
    const res = await fetch(request);
    if (res.ok) cache.put(request, res.clone());
    return res;
  } catch {
    const cached = await cache.match(request);
    if (cached) return cached;
    return new Response(JSON.stringify({ offline: true }), { headers: { 'Content-Type': 'application/json', 'X-Offline': '1' }, status: 503 });
  }
}

// Listen for skipWaiting message to activate updated SW immediately
self.addEventListener('message', event => {
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting();
  } else if (event.data?.type === 'show-local-notification') {
    const p = event.data.payload || {};
    self.registration.showNotification(p.title || 'New Message', {
      body: p.body || '',
      icon: '/weather-app.png',
      tag: p.tag || 'chat-msg'
    });
  }
});

// Notify clients when a new version is waiting
async function broadcastUpdate() {
  const clientsList = await self.clients.matchAll({ includeUncontrolled: true });
  for (const client of clientsList) {
    client.postMessage({ type: 'SW_UPDATE_READY' });
  }
}
// (Removed duplicate install listener; logic merged above)

// (Removed duplicate secondary push listener; consolidated above.)