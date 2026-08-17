// Minimal service worker.
//
// Its job is installability: Chrome and Edge will not offer to install a site
// — and will not fire `beforeinstallprompt` — without one that handles fetch.
// The offline resilience is a side effect, not the point.
//
// Network-first for same-origin GETs, so a stale page is never served while
// the network works. That matters more here than in most apps: this one shows
// somebody's compliance record, and a cached copy that quietly lags behind the
// real one is worse than an error.

const CACHE = "cpd-cache-v1";

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  let url;
  try {
    url = new URL(req.url);
  } catch {
    return;
  }
  if (url.origin !== self.location.origin) return;

  // Never cache anything that carries somebody's identity or a credential: a
  // shared device would otherwise serve one person's record to the next.
  if (
    url.pathname.startsWith("/slip/") ||
    url.pathname.startsWith("/verify/") ||
    url.pathname.startsWith("/calendar/") ||
    url.pathname.startsWith("/record/planned/") ||
    url.pathname.includes("/export")
  ) {
    return;
  }

  event.respondWith(
    fetch(req)
      .then((res) => {
        if (res && res.ok && res.type === "basic") {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
        }
        return res;
      })
      .catch(() => caches.match(req))
  );
});
