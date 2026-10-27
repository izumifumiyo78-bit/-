/* PITCH 26 service worker — precache the whole game so it launches offline. */
const CACHE = 'pitch26-v1';
const ASSETS = [
  './', './index.html', './manifest.webmanifest', './src/styles.css',
  './src/main.js',
  './src/core/util.js', './src/core/config.js',
  './src/data/teams.js', './src/data/formations.js',
  './src/sim/ball.js', './src/sim/player.js', './src/sim/team.js',
  './src/sim/actions.js', './src/sim/ai.js', './src/sim/rules.js', './src/sim/match.js',
  './src/render/camera.js', './src/render/renderer.js', './src/render/hud.js',
  './src/render/effects.js',
  './src/io/input.js', './src/io/audio.js',
  './src/game/replay.js', './src/game/ui.js',
  './icons/icon-192.png', './icons/icon-512.png', './icons/icon-180.png',
  './icons/icon-maskable-192.png', './icons/icon-maskable-512.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => Promise.allSettled(ASSETS.map((a) => c.add(new Request(a, { cache: 'reload' })))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;
  // Cache first: the game is fully static, so this makes launches instant.
  e.respondWith(
    caches.match(req, { ignoreSearch: true }).then((hit) => {
      if (hit) {
        // refresh in the background
        fetch(req).then((res) => {
          if (res && res.ok) caches.open(CACHE).then((c) => c.put(req, res.clone()));
        }).catch(() => {});
        return hit;
      }
      return fetch(req).then((res) => {
        if (res && res.ok && res.type === 'basic') {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return res;
      }).catch(() => caches.match('./index.html'));
    })
  );
});
