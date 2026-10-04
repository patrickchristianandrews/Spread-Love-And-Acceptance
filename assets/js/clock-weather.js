/* A very faint local time and weather note in the corner of every page, so nobody has to leave to check it.
   Time comes from the device clock. Weather is opt-in: tap the note once, your browser asks before sharing where you are,
   and only a rounded spot is kept on this device (same as the pal cam). The weather itself is read from Open-Meteo. */
(function () {
  'use strict';
  if (window.TOLClockWx || window.top !== window.self) return;
  window.TOLClockWx = true;
  var KEY = 'tol-pc-wx', OFF = 'tol-clockwx-off', el, WX = null, busy = false;
  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  if (lsGet(OFF) === '1') return;
  function kind(c) { return c === 0 ? ['Clear', '☀️'] : c <= 2 ? ['Partly cloudy', '⛅'] : c === 3 ? ['Cloudy', '☁️'] : c <= 48 ? ['Foggy', '🌫️'] : c <= 57 ? ['Drizzle', '🌦️'] : c <= 67 ? ['Rain', '🌧️'] : c <= 77 ? ['Snow', '❄️'] : c <= 82 ? ['Showers', '🌦️'] : c <= 86 ? ['Snow showers', '🌨️'] : ['Thunderstorm', '⛈️']; }
  function render() {
    if (!el) return;
    var t = ''; try { t = new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }); } catch (e) {}
    el.textContent = t + ' · ' + (WX ? WX.icon + ' ' + WX.deg + '° ' + WX.text : '⛅ tap for weather');
    el.classList.toggle('is-set', !!WX);
    el.setAttribute('aria-label', 'Local time ' + t + (WX ? ', ' + WX.deg + ' degrees, ' + WX.text : '. Tap to add the weather where you are'));
  }
  function fetchWx(lat, lon) {
    if (busy || !window.fetch) return; busy = true;
    var f = /^en-US/i.test(navigator.language || '') ? 'fahrenheit' : 'celsius';
    fetch('https://api.open-meteo.com/v1/forecast?latitude=' + lat + '&longitude=' + lon + '&current=temperature_2m,weather_code&temperature_unit=' + f)
      .then(function (r) { return r.ok ? r.json() : null; }).then(function (j) {
        busy = false; if (!j || !j.current) return; var k = kind(j.current.weather_code);
        var d = { kind: 'x', text: k[0], icon: k[1], deg: Math.round(j.current.temperature_2m) };
        lsSet(KEY, JSON.stringify({ lat: lat, lon: lon, at: Date.now(), d: d })); WX = d; render();
      }).catch(function () { busy = false; });
  }
  function start(ask) {
    var c = null; try { c = JSON.parse(lsGet(KEY) || 'null'); } catch (e) {}
    if (c && c.d) { WX = c.d; render(); if (Date.now() - c.at > 20 * 60 * 1000) fetchWx(c.lat, c.lon); return; }
    if (!ask || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(function (p) { fetchWx(Math.round(p.coords.latitude * 10) / 10, Math.round(p.coords.longitude * 10) / 10); }, function () { el.textContent = 'Weather needs your location'; setTimeout(render, 3000); }, { timeout: 8000, maximumAge: 3600000 });
  }
  function build() {
    var st = document.createElement('style');
    st.textContent = '.tol-cw{position:fixed;left:max(8px,env(safe-area-inset-left));bottom:max(6px,env(safe-area-inset-bottom));z-index:40;margin:0;padding:.18rem .55rem;border:0;border-radius:999px;background:rgba(255,253,248,.28);color:#3C3350;font:500 .72rem/1.3 "IBM Plex Mono",ui-monospace,monospace;letter-spacing:.03em;opacity:.38;cursor:pointer;font-variant-numeric:tabular-nums;transition:opacity .2s;-webkit-tap-highlight-color:transparent}' +
      '.tol-cw.is-set{cursor:default}.tol-cw:hover,.tol-cw:focus-visible{opacity:.9;background:rgba(255,253,248,.9)}.tol-cw:focus-visible{outline:2px solid #2B5B8C;outline-offset:2px}' +
      '@media (prefers-color-scheme:dark){.tol-cw{color:#F4EFFF;background:rgba(20,14,34,.3)}.tol-cw:hover,.tol-cw:focus-visible{background:rgba(20,14,34,.9)}}' +
      'html.pc-lock .tol-cw,html.tv-quiet .tol-cw,.tol-cw[hidden]{display:none}@media print{.tol-cw{display:none}}';
    document.head.appendChild(st);
    el = document.createElement('button'); el.type = 'button'; el.className = 'tol-cw'; el.title = 'Local time and weather. Tap for the weather where you are.';
    el.addEventListener('click', function () { if (!WX) start(true); });
    document.body.appendChild(el); render(); start(false); setInterval(render, 15000);
    document.addEventListener('fullscreenchange', function () { el.hidden = !!document.fullscreenElement; });
  }
  if (document.body) build(); else document.addEventListener('DOMContentLoaded', build);
})();
