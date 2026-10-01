// Lizard ARDS Recorder — offline cache
const APP = "lizard-ards-app-v1", TILES = "lizard-ards-tiles-v1", MAX_TILES = 3000;
const SHELL = ["./", "./index.html", "./manifest.webmanifest", "./icon-192.png", "./icon-512.png"];
self.addEventListener("install", e => { e.waitUntil(caches.open(APP).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener("activate", e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== APP && k !== TILES).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener("fetch", e => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET") return;
  if (/tile\.openstreetmap\.org|arcgisonline\.com/.test(url.hostname)) {
    // Map tiles: use cached copy if we have it (works offline for areas already viewed)
    e.respondWith(caches.open(TILES).then(async c => {
      const hit = await c.match(e.request);
      if (hit) return hit;
      try {
        const res = await fetch(e.request);
        c.put(e.request, res.clone());
        c.keys().then(ks => { if (ks.length > MAX_TILES) ks.slice(0, ks.length - MAX_TILES).forEach(k => c.delete(k)); });
        return res;
      } catch (err) { return new Response("", { status: 504 }); }
    }));
    return;
  }
  if (url.origin === location.origin) {
    // App files: network first (so updates arrive), fall back to cache offline
    e.respondWith(fetch(e.request).then(res => { const cp = res.clone(); caches.open(APP).then(c => c.put(e.request, cp)); return res; })
      .catch(() => caches.match(e.request, { ignoreSearch: true }).then(r => r || caches.match("./index.html"))));
  }
});
