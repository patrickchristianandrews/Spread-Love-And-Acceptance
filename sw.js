/* sw.js — lets the site open like an app and keep working offline.
   The site's own pages, styles, scripts and images: network first, so visitors (and the
   store apps, which show this site) always get the latest version; the saved copy is only
   used when there's no connection. Fonts: served from the saved copy. Nothing a visitor types passes through
   here: the tools keep entries in the browser, and this only stores the site's own files.
   Bump VERSION when the list below changes. */
var VERSION = 'tol-v4';
var CORE = [
  '/', '/index.html', '/offline.html',
  '/night-garden.html', '/quiet-words.html', '/turning-toward.html', '/quick-checks.html', '/lemonade-stand.html',
  '/assets/css/site.css', '/assets/css/reading.css',
  '/assets/js/site.js', '/assets/js/night-garden.js', '/assets/js/quiet-words.js', '/assets/js/quiet-words-themes.js', '/assets/js/tips.js', '/assets/js/breathe.js', '/assets/js/turning-toward.js',
  '/assets/img/mascots/two-bubbles.svg', '/assets/icons/icon-192.png', '/manifest.webmanifest'
];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(VERSION).then(function (c) {
    return Promise.all(CORE.map(function (u) { return c.add(u).catch(function () {}); }));
  }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k !== VERSION; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

function isStatic(url) {
  return url.origin === self.location.origin && /\.(?:css|js|svg|png|jpg|jpeg|webp|gif|ico|webmanifest|woff2?)$/i.test(url.pathname);
}
function isFont(url) { return url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com'; }

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);

  if (req.mode === 'navigate' && url.origin === self.location.origin) {
    e.respondWith(fetch(req).then(function (res) {
      if (res.ok) { var copy = res.clone(); caches.open(VERSION).then(function (c) { c.put(req, copy); }); }
      return res;
    }).catch(function () {
      return caches.match(req, { ignoreSearch: true }).then(function (hit) { return hit || caches.match('/offline.html'); });
    }));
    return;
  }

  if (isStatic(url)) {
    e.respondWith(fetch(req).then(function (res) {
      if (res.ok) { var copy = res.clone(); caches.open(VERSION).then(function (c) { c.put(req, copy); }); }
      return res;
    }).catch(function () { return caches.match(req); }));
    return;
  }

  if (isFont(url)) {
    e.respondWith(caches.match(req).then(function (hit) {
      var net = fetch(req).then(function (res) {
        if (res.ok || res.type === 'opaque') { var copy = res.clone(); caches.open(VERSION).then(function (c) { c.put(req, copy); }); }
        return res;
      }).catch(function () { return hit; });
      return hit || net;
    }));
  }
  // Everything else (members list, sign-up, analytics, the dashboard's database) goes straight to the network.
});
