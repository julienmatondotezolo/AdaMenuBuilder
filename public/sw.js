// Bump on each behavior change so existing clients evict the old cache.
const CACHE_NAME = "ada-menu-builder-v2";
const PRECACHE_URLS = ["/", "/index.html"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Only cache static, same-origin app shell. Never cache API traffic so
// every menu update is reflected on the next fetch without waiting for
// the cache to expire or the user to clear site data.
function isApiRequest(url) {
  if (url.pathname.startsWith("/api/")) return true;
  // Cross-origin fetches (e.g. our backend at api-menu.adasystems.app or
  // the KDS at api-kds.adasystems.app) are always live — no SW caching.
  if (url.origin !== self.location.origin) return true;
  return false;
}

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);

  // Live passthrough for API + cross-origin — no cache read, no cache write.
  if (isApiRequest(url)) {
    return; // fall through to the browser's default network handling
  }

  // Same-origin static assets: network-first, fall back to cache when offline.
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
