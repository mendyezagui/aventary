// Tehillim service worker — makes the app installable (Android/Chrome) and
// usable offline. Network-first so readers always get fresh content when
// online, with a cached fallback when there's no signal. Same-origin only:
// Supabase auth/sync and web-font requests are left untouched.
const CACHE = "tehillim-v3";
const APP_SHELL = "/tehillim";

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      try {
        const cache = await caches.open(CACHE);
        await cache.add(APP_SHELL); // one thing that's always there offline
      } catch (_) {
        /* offline at install — fine, it'll cache on first online visit */
      }
      await self.skipWaiting();
    })()
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))
      );
      await self.clients.claim();
    })()
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // Supabase, fonts, etc.

  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE);
      try {
        const fresh = await fetch(req);
        if (fresh && fresh.ok && (fresh.type === "basic" || fresh.type === "default")) {
          cache.put(req, fresh.clone());
        }
        return fresh;
      } catch (_) {
        const cached = await cache.match(req);
        if (cached) return cached;
        if (req.mode === "navigate") {
          const shell = await cache.match(APP_SHELL);
          if (shell) return shell;
        }
        return Response.error();
      }
    })()
  );
});
