/* sw.js — lets the site open like an app and keep working offline.
   The site's own pages, styles, scripts and images: network first, so visitors (and the
   store apps, which show this site) always get the latest version; the saved copy is only
   used when there's no connection. Fonts: served from the saved copy. Nothing a visitor types passes through
   here: the tools keep entries in the browser, and this only stores the site's own files.
   The word-game puzzle chunks (/assets/js/puzzles/, about 500 small files) are not in the list
   below: they're saved the first time a game loads them (cache on use, via isStatic), so a puzzle
   you've opened once keeps working offline.
   The Frequency Buddies episodes (/assets/js/buddies/) are small data files, saved up front so an episode
   plays offline; a future episode not in the list is saved the first time it's watched.
   Bump VERSION when the list below changes. */
var VERSION = 'tol-v78';
var CORE = [
  '/', '/index.html', '/offline.html',
  '/night-garden.html', '/quiet-words.html', '/word-bloom.html', '/quiet-crossword.html', '/pause-and-play.html', '/ask.html', '/whats-new.html', '/frequency-journey.html', '/frequency-journey-play.html', '/pal-cam-tv.html', '/frequency-buddies.html', '/daily-ledger-crossword.html', '/garden-backdrop.html', '/turning-toward.html', '/quick-checks.html', '/lemonade-stand.html',
  '/assets/css/site.css', '/assets/css/reading.css', '/assets/css/games.css',
  '/assets/js/site.js', '/assets/js/night-garden.js', '/assets/js/quiet-words.js', '/assets/js/calm-music.js', '/assets/js/tips.js', '/assets/js/breathe.js', '/assets/js/turning-toward.js',
  '/assets/js/rewards.js', '/assets/js/pause-and-play.js', '/assets/js/site-chat.js', '/assets/js/frequency-journey.js', '/assets/js/journey-levels.js', '/assets/js/pups.js', '/assets/js/journey-pals.js', '/assets/js/chat-kb.js', '/assets/js/word-bloom.js', '/assets/js/quiet-crossword.js', '/assets/js/game-levels.js',
  '/assets/js/pals-cam.js', '/assets/js/ten-return.js', '/assets/js/pals-cam-acts.js', '/assets/js/pals-cam-more.js', '/assets/js/pals-cam-tricks.js', '/assets/js/pals-cam-invite.js', '/assets/js/pals-cam-pack-scenes.js', '/assets/js/pals-cam-pack-extra.js',
  '/assets/js/buddies-player.js', '/assets/js/buddies/s1e1.js', '/assets/js/buddies/s1e2.js', '/assets/js/buddies/s1e3.js', '/assets/js/buddies/s1e4.js', '/assets/js/buddies/s1e5.js',
  '/assets/js/journey-pools.js', '/assets/js/journey-pools-2.js', '/assets/js/journey-pools-3.js', '/assets/js/journey-pools-4.js', '/assets/js/journey-pools-5.js',
  '/assets/js/learn-play.js', '/assets/js/learn-play-data.js', '/assets/js/join-invite.js', '/assets/js/pup-visits.js', '/assets/js/pup-visits-lines.js', '/assets/js/calc01-core.js', '/assets/js/mood-arbitrage.js',
  '/reading.html', '/assets/js/reading-page.js', '/assets/js/reading-list.js', '/assets/js/reading-suggest.js', '/assets/js/buddies-suggest.js',
  '/assets/img/mascots/two-bubbles.svg', '/assets/img/logo-mark.svg', '/assets/img/logo-mark-wink.svg', '/assets/img/logo-mark-dark.svg', '/assets/img/logo-mark.png', '/assets/img/logo-mark-wink.png', '/assets/icons/icon-192.png', '/manifest.webmanifest'
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
  // Covers every same-origin script, including the puzzle chunks under /assets/js/puzzles/.
  return url.origin === self.location.origin && /\.(?:css|js|svg|png|jpg|jpeg|webp|gif|ico|webmanifest|woff2?)$/i.test(url.pathname);
}
function isFont(url) { return url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com'; }

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  if (url.pathname.indexOf('/assets/video/') === 0 || url.pathname.indexOf('/assets/audio/music/') === 0 || url.pathname.indexOf('/assets/vendor/tesseract/') === 0 || url.pathname.indexOf('/assets/audio/buddies/') === 0) return; // big cast videos stream straight from the network, never cached

  if (req.mode === 'navigate' && url.origin === self.location.origin) {
    e.respondWith(fetch(req.url, { cache: 'no-cache', credentials: 'same-origin' }).then(function (res) {
      if (res.ok) { var copy = res.clone(); caches.open(VERSION).then(function (c) { c.put(req, copy); }); }
      return res;
    }).catch(function () {
      return caches.match(req, { ignoreSearch: true }).then(function (hit) { return hit || caches.match('/offline.html'); });
    }));
    return;
  }

  if (isStatic(url)) {
    // always ask the server whether there's a newer copy (cheap when nothing changed), so an update reaches everyone right away
    e.respondWith(fetch(req.url, { cache: 'no-cache', credentials: 'same-origin' }).then(function (res) {
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
  // Everything else (members list, sign-up, other sites' scripts, the dashboard's database) goes straight to the network.
});
