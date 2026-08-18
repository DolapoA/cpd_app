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

/*
  Notifications.

  The payload is encrypted to this device, so it arrives as text only we and
  the browser can read. It is still parsed defensively: a push service is
  allowed to wake a worker with nothing at all, and a notification that throws
  here is a notification the person never sees.
*/
self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    // Not ours, or malformed. Fall through to the defaults below.
  }

  const title = data.title || "CPD Register";
  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || "",
      // The badge is the monochrome silhouette Android puts in the status bar;
      // the icon is the full-colour one inside the notification itself.
      icon: "/icons/192",
      badge: "/icons/192",
      // Same tag replaces rather than stacks, so a phone that has been off
      // shows this morning's reminder and not also yesterday's.
      tag: data.tag || "cpd",
      data: { url: data.url || "/dashboard" },
    })
  );
});

/*
  Tapping one.

  If the app is already open somewhere, that window is focused and moved to
  the right page rather than a second copy being launched — an installed app
  that opens a new window every time it is tapped stops feeling like an app.
*/
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || "/dashboard", self.location.origin);

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if (new URL(client.url).origin === target.origin && "focus" in client) {
          return client.navigate ? client.navigate(target.href).then((c) => c && c.focus()) : client.focus();
        }
      }
      return self.clients.openWindow(target.href);
    })
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
