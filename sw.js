const CACHE_NAME = 'hive-v2';

const UI_ASSETS = [
  '/',
  '/index.html',
  '/auth/landing-page.html',
  '/auth/log-sign.html',
  '/auth/landing.css',
  '/auth/log-sign.css',
  '/Logo.png',
  '/Title.png',
  '/Background.png',
  '/assets/group.png',
  '/assets/participation.png',
  '/assets/track.png',
  '/assets/reports.png',
  '/assets/validate.png',
  '/assets/HIVE_Logo.svg',
];

// Cache UI assets on install
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(UI_ASSETS))
  );
  self.skipWaiting();
});

// Clean up old caches
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // Never cache Supabase or any API calls — always live or nothing
  const isSupabase = url.hostname.includes('supabase.co');
  const isAPI = url.pathname.includes('/rest/') || url.pathname.includes('/auth/');

  if (isSupabase || isAPI) {
    e.respondWith(
      fetch(e.request).catch(() => {
        // Return a clear JSON error so your app can show a proper message
        return new Response(
          JSON.stringify({ error: 'You are offline. Live data is unavailable.' }),
          { status: 503, headers: { 'Content-Type': 'application/json' } }
        );
      })
    );
    return;
  }

  // For UI files: network first, cache as fallback
  e.respondWith(
    fetch(e.request)
      .then(response => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(e.request, copy));
        return response;
      })
      .catch(() => caches.match(e.request))
  );
});