/* sleepcam-cast.js: "Cast to your TV" for the Sleeping Pals Cam (sleeping-pals-cam.html), like Pal Cam TV.

   The TV runs the real, live Sleeping Pals Cam, not a recording. It uses the same Google Cast app as Pal Cam TV
   (its TV side is pal-cam-tv.html?receiver=1). Once the TV has joined, this page sends it one message on the
   pal cam's own channel: "sleep", with the choices on the start screen (timer, sound, snores) and this device's
   sleep room (your fur babies, your sound mixes, the dimmer and sound bed), so the TV shows your room. The TV
   then shows this page full screen with ?receiver=1, which starts by itself with no buttons on screen.

   Casting works from Chrome on a computer or an Android phone on the same Wi-Fi as a Chromecast or Google TV.
   Google's Cast library loads when the page opens (listed in the privacy policy). What is sent goes to your TV
   only: the three sleep cam keys below, never anything else from this device. */
(function () {
  'use strict';
  var CAST_APP_ID = '26DCEDE9', NS = 'urn:x-cast:com.spreadloveandacceptance.palcam';
  var KEYS = ['tol-sleepcam-v1', 'tol-sleepcam-pets-v1', 'tol-sleepcam-mixes-v1'];
  var q = new URLSearchParams(location.search), receiver = q.get('receiver') === '1';
  function $(id) { return document.getElementById(id); }
  function ready(fn) { if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn); else fn(); }

  // ---------------------------------------------------------------- on the TV: start by itself, nothing to press
  if (receiver) {
    document.documentElement.classList.add('spc-receiver');
    ready(function () {
      function pick(name, v) { var el = document.querySelector('input[name="' + name + '"][value="' + v + '"]'); if (el) el.checked = true; }
      function tick(id, v) { var el = $(id); if (el && v != null) el.checked = v === '1' || v === 'true'; }
      // the dimmer is a saved choice, not on the start screen: carry it over
      if (q.has('dim')) { try { var p = JSON.parse(localStorage.getItem('tol-sleepcam-v1') || '{}') || {}; p.dim = q.get('dim') === '1'; localStorage.setItem('tol-sleepcam-v1', JSON.stringify(p)); } catch (e) {} }
      var go = $('spc-go');
      // the choices go on just before Start (the page resets the sound box on its own when it finishes loading)
      if (go) setTimeout(function () {
        if (q.has('timer')) pick('spc-timer', String(+q.get('timer') || 0));
        tick('spc-sound-opt', q.get('sound')); tick('spc-snore-opt', q.get('snore'));
        go.click();
      }, 400);
    });
    return;
  }

  // ---------------------------------------------------------------- on the phone or computer: the Cast button
  ready(function () {
    var btn = $('spc-cast'), state = $('spc-cast-state'), help = $('spc-live-help');
    if (!btn || !state) return;
    btn.hidden = false;
    var ctx = null, castReady = false, want = false, acked = false, retryT = 0, tries = 0, listening = null;
    var stopBtn = document.createElement('button'); stopBtn.type = 'button'; stopBtn.className = 'spc-cast-stop'; stopBtn.hidden = true; stopBtn.textContent = 'Stop casting';
    var againBtn = document.createElement('button'); againBtn.type = 'button'; againBtn.className = 'spc-cast-stop'; againBtn.hidden = true; againBtn.textContent = 'Send my choices to the TV again';
    var row = document.createElement('p'); row.className = 'spc-cast-row'; row.appendChild(againBtn); row.appendChild(stopBtn);
    state.parentNode.insertBefore(row, state.nextSibling);
    function say(t) { state.textContent = t; }
    function noCast() {
      say(/iPhone|iPad|iPod/.test(navigator.userAgent)
        ? 'Casting from this page needs Chrome on a computer or an Android phone. On an iPhone or iPad, use Screen Mirroring (see the other ways below), then press Start.'
        : 'Casting from this page needs Google Chrome on a computer or an Android phone. Open this page in Chrome and the button will work, or see the other ways below.');
      if (help) help.open = true;
    }
    function radio(name, d) { var el = document.querySelector('input[name="' + name + '"]:checked'); return el ? el.value : d; }
    function box(id, d) { var el = $(id); return el ? (el.checked ? '1' : '0') : d; }
    function payload() {
      var store = {};
      KEYS.forEach(function (k) { try { var v = localStorage.getItem(k); if (v != null) store[k] = v; } catch (e) {} });
      var dim = '1'; try { dim = (JSON.parse(localStorage.getItem('tol-sleepcam-v1') || '{}') || {}).dim === false ? '0' : '1'; } catch (e) {}
      return { mode: 'sleep', opts: { timer: radio('spc-timer', '0'), sound: box('spc-sound-opt', '1'), snore: box('spc-snore-opt', '1'), dim: dim }, store: store };
    }
    function tvName(ses) { try { return ses.getCastDevice().friendlyName; } catch (e) { return 'your TV'; } }
    // send "sleep" until the TV says it got it (a few tries: the TV may still be loading the first time)
    function sendSleep(ses) {
      if (!ses) return;
      acked = false; tries = 0; clearTimeout(retryT);
      if (listening !== ses) {
        listening = ses;
        try { ses.addMessageListener(NS, function (ns, msg) { var d = {}; try { d = typeof msg === 'string' ? JSON.parse(msg) : msg; } catch (e) {} if (d && d.ok && d.mode === 'sleep') { acked = true; clearTimeout(retryT); shown(ses); } }); } catch (e) {}
      }
      say('Sending the Sleeping Pals Cam to ' + tvName(ses) + '…');
      (function once() {
        if (acked) return;
        if (tries++ >= 6) { say(tvName(ses) + ' didn’t answer. Press “Send my choices to the TV again,” or stop casting and try once more.'); againBtn.hidden = false; stopBtn.hidden = false; return; }
        try { var p = ses.sendMessage(NS, payload()); if (p && p.catch) p.catch(function () {}); } catch (e) {}
        retryT = setTimeout(once, 1800);
      })();
    }
    function shown(ses) {
      var o = payload().opts;
      say('Sleeping on ' + tvName(ses) + (o.timer !== '0' ? ', fading out in ' + o.timer + ' minutes' : '') + '. You can close this page or turn off your phone. The TV keeps going.');
      againBtn.hidden = false; stopBtn.hidden = false;
    }
    againBtn.addEventListener('click', function () { if (ctx && ctx.getCurrentSession()) sendSleep(ctx.getCurrentSession()); });
    stopBtn.addEventListener('click', function () { try { ctx.endCurrentSession(true); } catch (e) {} });
    btn.addEventListener('click', function () {
      if (!castReady) { noCast(); return; }
      want = true;
      var ses = ctx.getCurrentSession();
      if (ses) { sendSleep(ses); return; } // already on the TV (the daytime cam, say): switch it to the sleep room
      if (ctx.getCastState() === cast.framework.CastState.NO_DEVICES_AVAILABLE) say('No Chromecast or Google TV found yet. Check that this device is on the same Wi-Fi as the TV, then try again.');
      try { var p = ctx.requestSession(); if (p && p.catch) p.catch(function () {}); } catch (e) {}
    });
    setTimeout(function () { if (!castReady) noCast(); }, 6000);
    var prev = window.__onGCastApiAvailable;
    window.__onGCastApiAvailable = function (ok) {
      if (typeof prev === 'function') try { prev(ok); } catch (e) {}
      if (!ok || !window.cast || !cast.framework || !window.chrome || !chrome.cast) { noCast(); return; }
      castReady = true; ctx = cast.framework.CastContext.getInstance();
      ctx.setOptions({ receiverApplicationId: CAST_APP_ID, autoJoinPolicy: chrome.cast.AutoJoinPolicy.ORIGIN_SCOPED });
      function sync() {
        var st = ctx.getCastState(), ses = ctx.getCurrentSession();
        if (st === cast.framework.CastState.CONNECTED && ses) { stopBtn.hidden = false; if (!want) { say('Connected to ' + tvName(ses) + '. Press Cast to your TV to send the Sleeping Pals Cam.'); againBtn.hidden = true; } }
        else {
          stopBtn.hidden = true; againBtn.hidden = true; acked = false; clearTimeout(retryT);
          say(st === cast.framework.CastState.CONNECTING ? 'Connecting…' : st === cast.framework.CastState.NO_DEVICES_AVAILABLE ? 'Looking for your Chromecast or Google TV on this Wi-Fi…' : 'Ready. Press Cast to your TV and pick your TV.');
        }
      }
      ctx.addEventListener(cast.framework.CastContextEventType.CAST_STATE_CHANGED, sync);
      // only a press of the button sends the sleep room: opening this page never changes what a TV is showing
      ctx.addEventListener(cast.framework.CastContextEventType.SESSION_STATE_CHANGED, function (ev) {
        var S = cast.framework.SessionState;
        if ((ev.sessionState === S.SESSION_STARTED || ev.sessionState === S.SESSION_RESUMED) && want) sendSleep(ev.session || ctx.getCurrentSession());
        if (ev.sessionState === S.SESSION_ENDED) { want = false; listening = null; }
      });
      sync();
      setTimeout(function () { if (ctx.getCastState() === cast.framework.CastState.NO_DEVICES_AVAILABLE && help) help.open = true; }, 7000);
    };
    var sc = document.createElement('script'); sc.src = 'https://www.gstatic.com/cv/js/sender/v1/cast_sender.js?loadCastFramework=1'; sc.async = true; document.head.appendChild(sc);
  });
})();
