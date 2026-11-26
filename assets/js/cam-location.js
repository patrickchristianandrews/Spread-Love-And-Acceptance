/* cam-location.js: "Local weather and time" for Pal Cam TV and the Sleeping Pals Cam (optional, off until you turn it on).
   Your phone or browser asks you first. Your exact location is never kept or sent: it is rounded straight away to about
   7 miles (11 km), the same rounded spot the pal cam's weather has always used ('tol-pc-wx', on this device only). That
   spot goes to Open-Meteo (a free weather service, no account) for the current weather and the time zone, and to your
   own TV when you cast, so the TV can show the weather and your local time too. Never to us. Turning it off forgets it.

   On a start screen: <div data-camloc></div> becomes the button, a line saying what's on, and the note above.
   window.TOLCamLoc: spot(), data(), on(fn), use(lat, lon), refresh(), off(), time(), hour(). */
(function () {
  'use strict';
  var KEY = 'tol-pc-wx', subs = [], busy = false;
  function get() { try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { return null; } }
  function put(v) { try { if (v) localStorage.setItem(KEY, JSON.stringify(v)); else localStorage.removeItem(KEY); } catch (e) {} }
  function round(v) { return Math.round(+v * 10) / 10; }
  function kind(c) {
    return c === 0 ? ['clear', 'Clear', '☀️'] : c <= 2 ? ['clouds', 'Partly cloudy', '⛅'] : c === 3 ? ['clouds', 'Cloudy', '☁️']
      : c <= 48 ? ['clouds', 'Foggy', '🌫️'] : c <= 57 ? ['rain', 'Drizzle', '🌦️'] : c <= 67 ? ['rain', 'Rain', '🌧️']
      : c <= 77 ? ['snow', 'Snow', '❄️'] : c <= 82 ? ['rain', 'Showers', '🌦️'] : c <= 86 ? ['snow', 'Snow showers', '🌨️'] : ['storm', 'Thunderstorm', '⛈️'];
  }
  function tell() { var c = get(); subs.forEach(function (f) { try { f(c); } catch (e) {} }); try { window.dispatchEvent(new CustomEvent('tol-camloc', { detail: c })); } catch (e) {} }
  function read(lat, lon) {
    if (busy || !window.fetch) return Promise.resolve(null); busy = true;
    var f = /^en-US/i.test(navigator.language || '') ? 'fahrenheit' : 'celsius';
    return fetch('https://api.open-meteo.com/v1/forecast?latitude=' + lat + '&longitude=' + lon + '&current=temperature_2m,weather_code,is_day&timezone=auto&temperature_unit=' + f)
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (j) {
        busy = false; if (!j || !j.current) return null;
        var k = kind(j.current.weather_code), d = { kind: k[0], text: k[1], icon: k[2], deg: Math.round(j.current.temperature_2m), tz: j.timezone || '' };
        if (!get()) return null;   // turned off while it was looking
        put({ lat: lat, lon: lon, at: Date.now(), d: d }); tell(); return d;
      }).catch(function () { busy = false; return null; });
  }
  // a spot handed over by your phone (on the TV), or found here: keep only the rounded spot, then look up the weather
  function use(lat, lon) {
    lat = round(lat); lon = round(lon);
    if (!isFinite(lat) || !isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) return Promise.resolve(null);
    var c = get(); put({ lat: lat, lon: lon, at: 0, d: c && c.lat === lat && c.lon === lon ? c.d : null });
    return read(lat, lon);
  }
  function ask() {
    return new Promise(function (res) {
      if (!navigator.geolocation) { res('none'); return; }
      navigator.geolocation.getCurrentPosition(function (p) { use(p.coords.latitude, p.coords.longitude).then(function (d) { res(d ? 'ok' : 'noweather'); }); },
        function () { res('denied'); }, { timeout: 10000, maximumAge: 3600000, enableHighAccuracy: false });
    });
  }
  function refresh() { var c = get(); if (c && isFinite(c.lat) && (!c.d || Date.now() - c.at > 20 * 60 * 1000)) read(c.lat, c.lon); }
  function off() { put(null); tell(); }
  function tz() { var c = get(); return c && c.d && c.d.tz || ''; }
  // the time where you are (in your own time zone, even on a TV whose clock was never set to it)
  function time() {
    var o = { hour: 'numeric', minute: '2-digit' }, z = tz(); if (z) o.timeZone = z;
    try { return new Date().toLocaleTimeString([], o); } catch (e) { return new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }); }
  }
  function hour() {
    var z = tz(), n = new Date();
    if (z) { try { var p = new Intl.DateTimeFormat('en-US', { timeZone: z, hour: 'numeric', minute: 'numeric', hourCycle: 'h23' }).formatToParts(n), h = 0, m = 0; p.forEach(function (x) { if (x.type === 'hour') h = +x.value; if (x.type === 'minute') m = +x.value; }); return (h % 24) + m / 60; } catch (e) {} }
    return n.getHours() + n.getMinutes() / 60;
  }
  window.TOLCamLoc = {
    spot: function () { var c = get(); return c && isFinite(c.lat) && isFinite(c.lon) ? { lat: c.lat, lon: c.lon } : null; },
    data: function () { var c = get(); return c && c.d || null; },
    on: function (f) { subs.push(f); }, use: use, ask: ask, refresh: refresh, off: off, time: time, hour: hour
  };
  setInterval(refresh, 10 * 60 * 1000);

  // ------------------------------------------------------------------ the switch on a start screen
  function mount(box) {
    var cam = box.getAttribute('data-camloc') || 'the cam';
    box.classList.add('camloc');
    box.innerHTML = '<button type="button" class="camloc-btn"></button><p class="camloc-state" aria-live="polite"></p>' +
      '<p class="camloc-note">Your phone or browser asks first. This never shares your exact location: it is rounded to about 7 miles (11 km), just enough to look up the weather and your local time. It stays on this device, and goes only to Open-Meteo, a free weather service, and to your own TV when you cast. Nothing is sent to us. Turn it off here any time, and it is forgotten.</p>';
    var btn = box.querySelector('.camloc-btn'), st = box.querySelector('.camloc-state');
    function paint(msg) {
      var s = TOLCamLoc.spot(), d = TOLCamLoc.data();
      btn.textContent = s ? 'Turn off location' : '📍 Turn on location for weather and time';
      btn.setAttribute('aria-pressed', String(!!s));
      st.textContent = msg || (s && d ? 'On: ' + d.icon + ' ' + d.deg + '° ' + d.text + ', ' + time() + ' where you are. ' + cam + ' shows it, here and on your TV.'
        : s ? 'On. Looking up the weather…' : 'Off. ' + cam + ' uses this device’s own clock and shows no weather.');
    }
    btn.addEventListener('click', function () {
      if (TOLCamLoc.spot()) { off(); paint(); return; }
      btn.disabled = true; paint('Asking for your location…');
      ask().then(function (r) {
        btn.disabled = false;
        paint(r === 'ok' ? '' : r === 'denied' ? 'The location wasn’t shared, so there’s no weather. Press the button to try again, or allow location for this site in your browser settings.'
          : r === 'none' ? 'This browser can’t share a location, so there’s no weather.' : 'The weather service didn’t answer just now. It will try again in a few minutes.');
      });
    });
    TOLCamLoc.on(function () { paint(); });
    setInterval(function () { if (TOLCamLoc.spot()) paint(); }, 30000);
    paint(); refresh();
  }
  function mountAll() { Array.prototype.forEach.call(document.querySelectorAll('[data-camloc]'), mount); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mountAll); else mountAll();
})();
