const CACHE_NAME = "electricity-incident-report-v18";
const ASSETS = [
  "/",
  "/index.html",
  "/manifest.webmanifest",
  "/apple-touch-icon.png",
  "/icon-192.png",
  "/icon-512.png"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      ))
      .then(() => self.clients.claim())
      .then(() => self.clients.matchAll({ type: "window", includeUncontrolled: true }))
      .then(clients => {
        clients.forEach(client => {
          if (client.url && new URL(client.url).origin === self.location.origin) {
            client.navigate(client.url);
          }
        });
      })
  );
});

self.addEventListener("fetch", event => {
  const url = new URL(event.request.url);
  if (event.request.method !== "GET" || url.pathname.startsWith("/api/")) {
    return;
  }

  const acceptsHtml = event.request.headers.get("accept")?.includes("text/html");
  if (event.request.mode === "navigate" || acceptsHtml) {
    event.respondWith(
      fetch(event.request, { cache: "no-store" })
        .then(response => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, copy);
            if (url.pathname === "/") {
              cache.put("/index.html", response.clone());
            }
          });
          return response;
        })
        .catch(() => caches.match(event.request).then(cached => cached || caches.match("/index.html")))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then(cached => cached || fetch(event.request).then(response => {
      const copy = response.clone();
      caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
      return response;
    }))
  );
});

self.addEventListener("message", event => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
