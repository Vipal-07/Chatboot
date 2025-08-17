/* Chatboot PWA Service Worker (defensive, single-file) */
const STATIC_CACHE = 'cb-static-v2';
const RUNTIME_CACHE = 'cb-runtime-v1';
const CORE_ASSETS = ['/', '/index.html', '/manifest.json', '/offline.html'];

// Small inline SVG placeholder for images when network fails
const SVG_PLACEHOLDER = `<?xml version="1.0" encoding="UTF-8"?><svg xmlns='http://www.w3.org/2000/svg' width='80' height='80' viewBox='0 0 80 80'><rect width='100%' height='100%' fill='#e2e8f0'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' fill='#94a3b8' font-size='10'>offline</text></svg>`;

async function ensureOfflinePage(cache) {
  const res = await cache.match('/offline.html');
  if (!res) {
    const offlineMarkup = `<!doctype html><meta charset='utf-8'><meta name='viewport' content='width=device-width'><title>Offline</title><style>body{font-family:system-ui,Segoe UI,Roboto,sans-serif;background:#0d1117;color:#fff;display:flex;align-items:center;justify-content:center;height:100vh;margin:0}main{max-width:40ch;padding:1rem;text-align:center}h1{margin:0 0 .5rem}</style><main><h1>You're offline</h1><p>Messaging will resume when connection is restored.</p></main>`;
    await cache.put('/offline.html', new Response(offlineMarkup, { headers: { 'Content-Type': 'text/html' } }));
  }
}

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(STATIC_CACHE);
    try {
      await cache.addAll(CORE_ASSETS.filter(a => a !== '/offline.html'));
    } catch (e) {
      // ignore individual failures
    }
    await ensureOfflinePage(cache);
    self.skipWaiting();
    setTimeout(() => broadcastUpdate().catch(()=>{}), 400);
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => ![STATIC_CACHE, RUNTIME_CACHE].includes(k)).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

// Unified push handling
self.addEventListener('push', event => {
  let data = {};
  try { data = event.data?.json() || {}; } catch { try { data = { title: 'Message', body: event.data?.text?.() || '' }; } catch(e){ data = { title: 'Message', body: '' }; } }
  const title = data.title || 'New Message';
  const body = data.body || '';
  const tag = data.tag || 'chat-msg';
  const clickUrl = data.clickUrl || data.click_action || '/';
  const senderId = data.senderId || data.sender_id || '';
  const notifData = { url: clickUrl, senderId };
  event.waitUntil(self.registration.showNotification(title, { body, icon: '/weather-app.png', badge: '/weather-app.png', data: notifData, tag }));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const payload = event.notification.data || { url: '/' };
  const targetPath = typeof payload === 'string' ? payload : (payload.url || '/');
  const senderId = typeof payload === 'object' ? payload.senderId : '';
  event.waitUntil((async () => {
    const allClients = await clients.matchAll({ type: 'window', includeUncontrolled: true });
    let client = allClients.find(c => 'focus' in c);
    if (client) {
      await client.focus();
      client.postMessage({ type: 'OPEN_CHAT', url: targetPath, senderId });
    } else {
      const absoluteUrl = new URL(targetPath, self.location.origin).href;
      await clients.openWindow(absoluteUrl);
    }
  })());
});

// Fetch strategies with safe fallbacks
self.addEventListener('fetch', event => {
  const req = event.request;
  const url = new URL(req.url);

  if (req.method !== 'GET') return;
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return;
  if (url.protocol.startsWith('chrome-extension')) return;
  if (url.pathname.includes('socket.io') || url.pathname.startsWith('/credential')) return;

  // Navigation: network-first with offline fallback
  if (req.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const res = await fetch(req);
        try { const copy = res.clone(); caches.open(STATIC_CACHE).then(c => c.put('/', copy)).catch(()=>{}); } catch(e){}
        return res;
      } catch (e) {
        const cached = await caches.match('/', { ignoreSearch: true });
        return cached || (await caches.match('/offline.html')) || new Response('<h1>Offline</h1>', { status: 503, headers: { 'Content-Type': 'text/html' } });
      }
    })());
    return;
  }

  // Static assets: stale-while-revalidate with safe fallback
  if (url.pathname.match(/\.(js|css|svg|png|jpg|jpeg|gif|webp|ico)$/)) {
    event.respondWith(staleWhileRevalidate(req));
    return;
  }

  // API JSON: network-first with cached fallback
  if (req.headers.get('accept')?.includes('application/json')) {
    event.respondWith(networkFirst(req));
    return;
  }
});

async function placeholderFor(request) {
  // Return SVG for images, simple text for others
  const accept = request.headers.get('accept') || '';
  if (accept.includes('image')) {
    return new Response(SVG_PLACEHOLDER, { headers: { 'Content-Type': 'image/svg+xml' } });
  }
  return new Response('Offline', { status: 503, headers: { 'Content-Type': 'text/plain' } });
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(RUNTIME_CACHE);
  const cached = await cache.match(request);
  const networkPromise = fetch(request).then(res => {
    try { if (res && res.ok) cache.put(request, res.clone()); } catch (e) {}
    return res;
  }).catch(async () => {
    return cached || await placeholderFor(request);
  });
  return cached || networkPromise;
}

async function networkFirst(request) {
  const cache = await caches.open(RUNTIME_CACHE);
  try {
    const res = await fetch(request);
    if (res && res.ok) cache.put(request, res.clone()).catch(()=>{});
    return res;
  } catch (e) {
    const cached = await cache.match(request);
    if (cached) return cached;
    // For JSON endpoints return structured offline response
    return new Response(JSON.stringify({ offline: true }), { headers: { 'Content-Type': 'application/json', 'X-Offline': '1' }, status: 503 });
  }
}

// Listen for skipWaiting message to activate updated SW immediately
self.addEventListener('message', event => {
  if (event.data === 'SKIP_WAITING') { self.skipWaiting(); }
  else if (event.data?.type === 'show-local-notification') {
    const p = event.data.payload || {};
    self.registration.showNotification(p.title || 'New Message', { body: p.body || '', icon: '/weather-app.png', tag: p.tag || 'chat-msg' });
  }
});

async function broadcastUpdate() {
  const clientsList = await self.clients.matchAll({ includeUncontrolled: true });
  for (const client of clientsList) client.postMessage({ type: 'SW_UPDATE_READY' });
}
