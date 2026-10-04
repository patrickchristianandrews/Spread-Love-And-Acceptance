/* A very faint local time and weather note in the corner of every page, so nobody has to leave to check it.
   Time comes from the device clock. Weather is opt-in: tap the note once, your browser asks before sharing where you are,
   and only a rounded spot is kept on this device (same as the pal cam). The weather itself is read from Open-Meteo. */
(function () {
  'use strict';
  if (window.TOLClockWx || window.top !== window.self) return;
  var KEY = 'tol-pc-wx', OFF = 'tol-clockwx-off', el, card, WX = null, busy = false;
  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  function kind(c) { return c === 0 ? ['Clear', '☀️'] : c <= 2 ? ['Partly cloudy', '⛅'] : c === 3 ? ['Cloudy', '☁️'] : c <= 48 ? ['Foggy', '🌫️'] : c <= 57 ? ['Drizzle', '🌦️'] : c <= 67 ? ['Rain', '🌧️'] : c <= 77 ? ['Snow', '❄️'] : c <= 82 ? ['Showers', '🌦️'] : c <= 86 ? ['Snow showers', '🌨️'] : ['Thunderstorm', '⛈️']; }
  function render() {
    if (!el) return;
    var t = ''; try { t = new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }); } catch (e) {}
    var narrow = window.innerWidth <= 560;   // on a phone it stays short so it never sits under the Puddles button
    el.textContent = narrow ? t.replace(' ', '\u00a0') + ' ' + (WX ? WX.icon + WX.deg + '°' : '📍') : t + ' · ' + (WX ? WX.icon + ' ' + WX.deg + '° ' + WX.text : '📍 allow location for weather');
    el.classList.toggle('is-set', !!WX);
    el.setAttribute('aria-label', 'Local time ' + t + (WX ? ', ' + WX.deg + ' degrees, ' + WX.text : '. Open to allow your location for the weather'));
  }
  function fetchWx(lat, lon) {
    if (busy || !window.fetch) return Promise.resolve(); busy = true;
    var f = /^en-US/i.test(navigator.language || '') ? 'fahrenheit' : 'celsius';
    return fetch('https://api.open-meteo.com/v1/forecast?latitude=' + lat + '&longitude=' + lon + '&current=temperature_2m,weather_code&temperature_unit=' + f)
      .then(function (r) { return r.ok ? r.json() : null; }).then(function (j) {
        busy = false; if (!j || !j.current) return; var k = kind(j.current.weather_code);
        var d = { kind: 'x', text: k[0], icon: k[1], deg: Math.round(j.current.temperature_2m) };
        lsSet(KEY, JSON.stringify({ lat: lat, lon: lon, at: Date.now(), d: d })); WX = d; render();
      }).catch(function () { busy = false; });
  }
  function start(ask) {
    var c = null; try { c = JSON.parse(lsGet(KEY) || 'null'); } catch (e) {}
    if (c && c.d) { WX = c.d; render(); if (Date.now() - c.at > 20 * 60 * 1000) fetchWx(c.lat, c.lon); return Promise.resolve('ok'); }
    if (!ask || !navigator.geolocation) return Promise.resolve(navigator.geolocation ? 'idle' : 'unavailable');
    return new Promise(function (done) {
      navigator.geolocation.getCurrentPosition(function (p) {
        var la = Math.round(p.coords.latitude * 10) / 10, lo = Math.round(p.coords.longitude * 10) / 10;
        fetchWx(la, lo).then(function () { done(WX ? 'ok' : 'error'); });
      }, function (e) { if (el) { el.textContent = '📍 location was not shared'; setTimeout(render, 3000); } done(e && e.code === 1 ? 'denied' : 'error'); }, { timeout: 10000, maximumAge: 3600000 });
    });
  }
  function openCard(note) {
    var set = !!WX;
    card.innerHTML = '<p class="tol-cw-t">' + (set ? 'Weather is on' : 'Show the weather where you are?') + '</p><p class="tol-cw-p">' + (set ? 'It uses a rounded spot from your location, kept only on this device. Turn it off any time.' : 'Your browser will ask first. Only a rounded spot is kept, on this device, and nothing is sent to us.') + '</p>' + (note ? '<p class="tol-cw-p"><strong>' + note + '</strong></p>' : '') +
      '<div class="tol-cw-b">' + (set ? '<button type="button" data-a="off">Stop using my location</button>' : '<button type="button" data-a="allow" class="is-main">Allow location</button>') + '<button type="button" data-a="hide">Hide this note</button><button type="button" data-a="settings">Open Settings</button><button type="button" data-a="close">Close</button></div>';
    card.hidden = false;
    card.onclick = function (e) {
      var a = e.target.getAttribute && e.target.getAttribute('data-a'); if (!a) return;
      if (a === 'allow') { card.hidden = true; start(true).then(function (r) { if (r === 'denied') { openCard('Your browser has location blocked for this site. Allow it in the browser’s site settings (the lock or tune icon by the address), then try again. You can also use Settings.'); } }); }
      else if (a === 'off') { try { localStorage.removeItem(KEY); } catch (x) {} WX = null; render(); card.hidden = true; }
      else if (a === 'hide') { showNote(false); }
      else if (a === 'settings') { card.hidden = true; var sb = document.querySelector('.tol-set-btn'); if (sb) sb.click(); }
      else card.hidden = true;
    };
    var f = card.querySelector('button'); if (f) f.focus();
  }
  function build() {
    var st = document.createElement('style');
    st.textContent = '.tol-cw{position:fixed;left:max(8px,env(safe-area-inset-left));bottom:max(6px,env(safe-area-inset-bottom));z-index:40;margin:0;padding:.24rem .65rem;border:1px solid rgba(59,29,110,.28);border-radius:999px;background:rgba(255,253,248,.72);color:#3B1D6E;font:700 .8rem/1.3 "IBM Plex Mono",ui-monospace,monospace;letter-spacing:.02em;opacity:.88;cursor:pointer;font-variant-numeric:tabular-nums;transition:opacity .2s;-webkit-tap-highlight-color:transparent}' +
      '.tol-cw.is-set{cursor:pointer}.tol-cw:hover,.tol-cw:focus-visible{opacity:1;background:rgba(255,253,248,.96)}.tol-cw:focus-visible{outline:2px solid #2B5B8C;outline-offset:2px}' +
      '@media (prefers-color-scheme:dark){.tol-cw{color:#E4D7FF;border-color:rgba(228,215,255,.35);background:rgba(20,14,34,.72)}.tol-cw:hover,.tol-cw:focus-visible{background:rgba(20,14,34,.96)}}' +
      '.tol-cw-card{position:fixed;left:max(8px,env(safe-area-inset-left));bottom:calc(max(6px,env(safe-area-inset-bottom)) + 2.1rem);z-index:41;max-width:min(20rem,calc(100vw - 16px));padding:.8rem .95rem;border-radius:16px;background:#FFFDF8;color:#2B2140;box-shadow:0 8px 28px rgba(30,20,60,.3);border:1px solid #D9CFEE;font:500 .95rem/1.4 Lora,Georgia,serif}.tol-cw-card[hidden]{display:none}.tol-cw-t{margin:0 0 .25rem;font:700 1.02rem Fraunces,Georgia,serif}.tol-cw-p{margin:0 0 .6rem}.tol-cw-b{display:flex;flex-wrap:wrap;gap:.4rem}.tol-cw-b button{min-height:44px;padding:.4rem .9rem;border-radius:999px;border:1.5px solid #8C7DB5;background:#fff;color:#2B2140;font:600 .9rem Lora,Georgia,serif;cursor:pointer}.tol-cw-b .is-main{background:#3C3350;color:#fff;border-color:#3C3350}' +
      'html.pc-lock .tol-cw,html.pc-lock .tol-cw-card,html.tv-quiet .tol-cw,.tol-cw[hidden]{display:none}@media print{.tol-cw{display:none}}';
    document.head.appendChild(st);
    el = document.createElement('button'); el.type = 'button'; el.className = 'tol-cw'; el.title = 'Local time and weather. Tap for the weather where you are.';
    card = document.createElement('div'); card.className = 'tol-cw-card'; card.hidden = true; card.setAttribute('role', 'dialog'); card.setAttribute('aria-label', 'Local weather');
    document.body.appendChild(card);
    el.addEventListener('click', function () { if (!card.hidden) { card.hidden = true; return; } openCard(); });
    document.addEventListener('click', function (e) { if (!card.hidden && e.target !== el && !card.contains(e.target)) card.hidden = true; });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') card.hidden = true; });
    document.body.appendChild(el); render(); start(false); setInterval(render, 15000); window.addEventListener('resize', render);
    document.addEventListener('fullscreenchange', function () { el.hidden = !!document.fullscreenElement; });
  }
  function offWx() { try { localStorage.removeItem(KEY); } catch (e) {} WX = null; render(); }
  function showNote(on) {
    if (on) { try { localStorage.removeItem(OFF); } catch (e) {} if (!el) { if (document.body) build(); } else el.hidden = false; }
    else { lsSet(OFF, '1'); if (el) { el.hidden = true; card.hidden = true; } }
  }
  window.TOLClockWx = { ask: function () { if (!el && document.body) { try { localStorage.removeItem(OFF); } catch (e) {} build(); } return start(true).then(function (r) { render(); return r; }); }, off: offWx, show: showNote };
  if (lsGet(OFF) === '1') return;
  if (document.body) build(); else document.addEventListener('DOMContentLoaded', build);
})();
