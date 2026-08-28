/*
 * Offline shell for the installed PWA.
 *
 * Strategy is deliberately split:
 *   - navigations and static assets  -> stale-while-revalidate, so the app
 *     opens instantly and works with no signal at all.
 *   - /api/*                         -> network only, never cached, because a
 *     stale habit list is worse than an honest failure. The client already
 *     keeps its own cache and an offline write queue.
 */

const VERSION = "htc-v1";
const SHELL = `${VERSION}-shell`;

const PRECACHE = [
  "/",
  "/manifest.webmanifest",
  "/icon.svg",
  "/icon-192.png",
  "/icon-512.png",
  "/apple-touch-icon.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(SHELL)
      .then((cache) => cache.addAll(PRECACHE))
      .catch(() => undefined)
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== SHELL).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("message", (event) => {
  if (event.data === "skip-waiting") self.skipWaiting();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return;

  // Navigations: serve the cached shell immediately, refresh in the background.
  if (req.mode === "navigate") {
    event.respondWith(
      (async () => {
        const cache = await caches.open(SHELL);
        const cached = await cache.match("/");
        const network = fetch(req)
          .then((res) => {
            if (res && res.ok) cache.put("/", res.clone());
            return res;
          })
          .catch(() => null);
        return cached || (await network) || new Response("Offline", { status: 503 });
      })()
    );
    return;
  }

  event.respondWith(
    (async () => {
      const cache = await caches.open(SHELL);
      const cached = await cache.match(req);
      const network = fetch(req)
        .then((res) => {
          if (res && res.ok && res.type === "basic") cache.put(req, res.clone());
          return res;
        })
        .catch(() => null);
      return cached || (await network) || new Response("", { status: 504 });
    })()
  );
});
