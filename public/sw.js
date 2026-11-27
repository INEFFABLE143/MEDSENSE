/* Med Sense — lightweight offline cache for shell + core data */
const CACHE = "medsense-v2";
const ASSETS = [
  "./",
  "./index.html",
  "./checker.html",
  "./search.html",
  "./scan.html",
  "./medicine-library.html",
  "./css/brand.css",
  "./css/layout.css",
  "./css/medicine-library.css",
  "./js/theme.js",
  "./js/sidebar.js",
  "./js/medicine-library.js",
  "./js/suggest.js",
  "./js/fdacard.js",
  "./data/diseases.json",
  "./data/medicines.json",
  "./data/ingredients.json",
  "./img/med-sense-icon.svg",
  "./img/med-sense-logo.svg",
  "./img/med-sense-logo-dark.svg",
  "./img/icon-192.png",
  "./img/icon-512.png",
  "./manifest.webmanifest"
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  event.respondWith(
    caches.match(req).then((cached) => {
      const fetchPromise = fetch(req).then((res) => {
        const copy = res.clone();
        if (res.ok && (req.url.includes("/data/") || req.url.includes("/css/") || req.url.includes("/js/") || req.url.endsWith(".html") || req.url.endsWith(".svg") || req.url.endsWith(".png"))) {
          caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
        }
        return res;
      }).catch(() => cached);
      return cached || fetchPromise;
    })
  );
});
