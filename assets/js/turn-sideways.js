/* turn-sideways.js — "Turn your phone sideways" for the pages whose picture is wider than a phone is tall, and
   keeping the screen awake whenever something is full screen.
   On touch screens:
   1. A friendly hint under the big picture (Brain Breakers stage, the cartoons and teaser, Drift, the Night Garden)
      while the phone is upright. It has a little animated phone, can be closed (for this visit only), and
      disappears by itself once the phone is turned.
   2. Turning a phone sideways opens that page's picture full screen by itself, and turning it upright again lets go
      (only if it was this script that opened it, and never again in the same turn if you close it yourself).
      Browsers only allow real full screen right after a tap, so on a turn alone the pages' own full-screen fallback
      (a picture that fills the screen) is used; a tap on Play while sideways gets true full screen.
   3. When something goes full screen, ask the phone to turn sideways with it (screen.orientation.lock, which Chrome
      on Android allows in full screen; iPhones ignore it) and let go again when full screen ends.
   On every device:
   4. While anything is full screen, the screen is kept awake (Screen Wake Lock) so the phone never dims or locks
      mid-show. It is let go the moment full screen ends, and asked for again if you come back to the tab.
   Nothing is stored beyond a session flag; with reduced motion the phone icon does not move. */
(function () {
  'use strict';
  function ss(k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } }
  function ssSet(k, v) { try { sessionStorage.setItem(k, v); } catch (e) {} }

  // the pictures that can go full screen: [the thing that fills the screen, its Full screen button]
  var FULL = [['#sn-stage', '#sn-full'], ['.tz-player', '.tz-full'], ['.fb-player', '.fb-full'], ['.fbmv-stage', '.fbmv-full']];
  function fsEl() { return document.fullscreenElement || document.webkitFullscreenElement || null; }
  function isFull(box) { return !!box && (fsEl() === box || box.classList.contains('is-full') || box.classList.contains('is-full-now')); }
  function anyFull() { return !!fsEl() || !!document.querySelector('.is-full, .is-full-now'); }

  // ---- 4. no timeout while full screen
  var wl = null, wlAsking = false;
  function acquire() {
    if (!('wakeLock' in navigator) || wl || wlAsking || document.hidden) return;
    wlAsking = true;
    try { navigator.wakeLock.request('screen').then(function (l) { wlAsking = false; wl = l; l.addEventListener('release', function () { wl = null; }); if (!anyFull()) release(); }).catch(function () { wlAsking = false; }); } catch (e) { wlAsking = false; }
  }
  function release() { if (wl) { try { wl.release(); } catch (e) {} wl = null; } }
  function keepAwake() { if (anyFull()) acquire(); else release(); }
  ['fullscreenchange', 'webkitfullscreenchange'].forEach(function (ev) { document.addEventListener(ev, function () { keepAwake(); setTimeout(keepAwake, 200); }); });
  document.addEventListener('visibilitychange', function () { if (!document.hidden) keepAwake(); });
  setInterval(keepAwake, 1500);   // also covers the fill-the-screen fallback, which is only a CSS class
  window.addEventListener('pagehide', release);

  if (!window.matchMedia || !matchMedia('(pointer: coarse)').matches) return;
  var port = matchMedia('(orientation: portrait)'), RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  function small() { return Math.min(screen.width || innerWidth, screen.height || innerHeight, innerWidth, innerHeight) < 820; }

  // ---- 3. full screen goes sideways
  // First choice: ask the phone to turn (Android Chrome allows it in real full screen and in the installed app).
  // If the phone will not (iPhones, or a browser tab using the fill-the-screen fallback), turn the picture itself
  // a quarter turn so it fills the sideways screen, and drop that the moment the phone really is sideways.
  var locked = false, lockTried = 0;
  function lock() {
    try { var o = screen.orientation; if (o && o.lock) { var p = o.lock('landscape'); if (p && p.then) p.then(function () { locked = true; }).catch(function () { locked = false; }); return; } } catch (e) {}
    locked = false;
  }
  function unlock() { locked = false; try { var o = screen.orientation; if (o && o.unlock) o.unlock(); } catch (e) {} }
  function fullBox() { var el = fsEl(); if (el) return el; return document.querySelector('.is-full, .is-full-now'); }
  var turned = null;
  function quarterTurn(on, box) {
    if (turned && turned !== box) { turned.classList.remove('tsw-rot'); turned = null; }
    if (on && box && !box.classList.contains('tsw-rot')) { box.classList.add('tsw-rot'); turned = box; try { window.dispatchEvent(new Event('resize')); } catch (e) {} }
    if (!on && turned) { turned.classList.remove('tsw-rot'); turned = null; try { window.dispatchEvent(new Event('resize')); } catch (e) {} }
  }
  function sidewaysCheck() {
    var box = fullBox();
    if (!box || !small()) { if (turned) quarterTurn(false); if (!box && lockTried) { lockTried = 0; unlock(); } return; }
    if (!port.matches) { quarterTurn(false, box); return; }        // the phone is already sideways
    if (!locked && lockTried < 3) { lockTried++; lock(); }          // ask the phone to turn
    if (!locked && lockTried >= 1) setTimeout(function () { if (port.matches && !locked && fullBox() === box) quarterTurn(true, box); }, 450);
  }
  ['fullscreenchange', 'webkitfullscreenchange'].forEach(function (ev) {
    document.addEventListener(ev, function () { lockTried = 0; if (fsEl()) lock(); else unlock(); setTimeout(sidewaysCheck, 150); });
  });
  setInterval(sidewaysCheck, 700);

  // ---- 2. turning sideways opens the picture
  var autoBox = null, autoBtn = null, leftByUser = false;
  function boxes() { var out = []; FULL.forEach(function (f) { var b = document.querySelector(f[0]), btn = document.querySelector(f[1]); if (b && btn) out.push({ box: b, btn: btn }); }); return out; }
  function visibleShare(el) { var r = el.getBoundingClientRect(), vh = innerHeight; var h = Math.min(r.bottom, vh) - Math.max(r.top, 0); return r.height ? Math.max(0, h) / Math.min(r.height, vh) : 0; }
  function playing(box) {
    if (box.matches('.is-playing') || box.querySelector('.is-playing')) return true;
    var m = box.querySelectorAll('audio, video'); for (var i = 0; i < m.length; i++) if (!m[i].paused && !m[i].ended) return true;
    if (box.id === 'sn-stage') { var t = document.querySelectorAll('.track-player'); for (var j = 0; j < t.length; j++) if (!t[j].paused && !t[j].ended) return true; }
    return false;
  }
  function goSideways(onlyIfPlaying) {
    if (!small() || leftByUser || anyFull()) return;
    var pick = null; boxes().forEach(function (b) { if (!pick && (playing(b.box) || (!onlyIfPlaying && visibleShare(b.box) >= 0.45))) pick = b; });
    if (!pick) return;
    autoBox = pick.box; autoBtn = pick.btn; try { pick.btn.click(); } catch (e) { autoBox = autoBtn = null; }
  }
  function goUpright() {
    if (autoBox && isFull(autoBox) && autoBtn) { try { autoBtn.click(); } catch (e) {} }
    autoBox = autoBtn = null; leftByUser = false;
  }
  // ---- 2b. real <video> pictures: turning sideways makes the video full screen too (true full screen when the browser allows,
  // otherwise a picture that fills the screen with its own Exit button), and turning upright lets go
  var vidOn = null, vidBtn = null, leftVid = false;
  function vids() { return Array.prototype.slice.call(document.querySelectorAll('video')); }
  function vidPseudo(v) {
    v.classList.add('tsw-vid');
    if (!vidBtn) { vidBtn = document.createElement('button'); vidBtn.type = 'button'; vidBtn.className = 'tsw-vid-x'; vidBtn.textContent = '✕ Exit full screen'; vidBtn.addEventListener('click', function () { leftVid = true; vidUp(true); }); document.body.appendChild(vidBtn); }
    vidBtn.hidden = false;
  }
  function vidGo() {
    if (!small() || port.matches || vidOn || leftVid) return;
    var v = vids().filter(function (x) { return (!x.paused && !x.ended) || visibleShare(x) >= 0.45; })[0]; if (!v) return;
    vidOn = v;
    try {
      var rq = v.requestFullscreen || v.webkitRequestFullscreen;
      if (rq) { var pr = rq.call(v); if (pr && pr.catch) pr.catch(function () { vidPseudo(v); }); return; }
      if (v.webkitEnterFullscreen) { v.webkitEnterFullscreen(); return; }
    } catch (e) {}
    vidPseudo(v);
  }
  function vidUp(keepLeft) {
    if (vidOn) { try { if (fsEl() === vidOn) (document.exitFullscreen || document.webkitExitFullscreen).call(document); } catch (e) {} vidOn.classList.remove('tsw-vid'); vidOn = null; }
    if (vidBtn) vidBtn.hidden = true;
    if (!keepLeft) leftVid = false;
  }
  document.addEventListener('play', function (e) { if (e.target && e.target.tagName === 'VIDEO' && !port.matches) setTimeout(vidGo, 200); }, true);
  // if the person closes full screen themselves while sideways, leave it closed until the next turn
  document.addEventListener('fullscreenchange', function () { if (vidOn && !fsEl() && !vidOn.classList.contains('tsw-vid')) { vidOn = null; leftVid = true; } });
  function onTurn() { if (port.matches) { goUpright(); vidUp(); } else setTimeout(function () { goSideways(false); vidGo(); }, 350); sync(); }
  // if the person closes full screen themselves while sideways, leave it closed until the next turn
  var autoSeen = false;
  setInterval(function () {
    if (!autoBox) { autoSeen = false; return; }
    if (isFull(autoBox)) autoSeen = true; else if (autoSeen) { leftByUser = true; autoBox = autoBtn = null; autoSeen = false; }
  }, 500);
  document.addEventListener('click', function (e) {
    // a tap on Play while the phone is sideways is a real gesture, so this one can be true full screen
    if (port.matches || !small() || anyFull()) return;
    var b = e.target.closest && e.target.closest('button'); if (!b) return;
    var t = ((b.getAttribute('aria-label') || '') + ' ' + b.textContent).trim();
    if (!/^(▶|play|[^a-z]*play)/i.test(t) && !/sn-trkb|sn-see|tz-big|fb-big/.test(b.className)) return;
    var hit = null; boxes().forEach(function (x) { if (!hit && x.box.contains(b)) hit = x; });
    if (!hit && /sn-see|sn-trkb/.test(b.className)) { var s = boxes().filter(function (x) { return x.box.id === 'sn-stage'; })[0]; if (s) hit = s; }
    if (hit && !leftByUser) setTimeout(function () { if (!anyFull() && !port.matches) { autoBox = hit.box; autoBtn = hit.btn; try { hit.btn.click(); } catch (er) {} } }, 60);
  }, true);

  // ---- 1. the hint
  var TARGETS = ['#sn-stage', '.tz-stage', '.fb-stage', '.fbmv-stage', '#cv-gl', '#ng-canvas'];
  var CSS = '.tsw-vid{ position:fixed !important; inset:0 !important; width:100vw !important; height:100vh !important; height:100dvh !important; max-width:none !important; max-height:none !important; z-index:2147483000 !important; background:#000 !important; object-fit:contain !important; margin:0 !important; border-radius:0 !important; }' +
    '.tsw-vid-x{ position:fixed; top:max(10px,env(safe-area-inset-top)); right:max(10px,env(safe-area-inset-right)); z-index:2147483001; min-height:44px; padding:.4rem .9rem; border-radius:999px; border:1.5px solid rgba(255,255,255,.8); background:rgba(28,20,44,.82); color:#fff; font:600 1rem Lora,Georgia,serif; cursor:pointer; }' +
    '.tsw-vid-x[hidden]{ display:none; }' +
    '.tsw-rot{ position:fixed !important; inset:auto !important; top:0 !important; left:0 !important; width:100vh !important; height:100vw !important; width:100dvh !important; height:100dvw !important; max-width:none !important; transform-origin:top left !important; transform:rotate(90deg) translateY(-100%) !important; z-index:10060 !important; border-radius:0 !important; margin:0 !important; }' +
    '.tsw{ display:none; align-items:center; gap:.6rem; margin:.6rem auto; padding:.45rem .5rem .45rem .9rem; max-width:34rem; border-radius:999px; background:#FFF4D6; border:1px solid #E7C777; color:#5A430F; font:600 .92rem/1.25 "Lora",Georgia,serif; box-shadow:0 4px 12px -6px rgba(90,60,10,.4); }' +
    '.tsw.is-on{ display:flex; }' +
    '.tsw-ph{ flex:none; width:1.5rem; height:2.3rem; display:grid; place-items:center; }' +
    '.tsw-ph i{ display:block; width:.95rem; height:1.7rem; border:2px solid #5A430F; border-radius:.3rem; position:relative; transform-origin:50% 50%; animation:tsw-turn 3.2s ease-in-out infinite; }' +
    '.tsw-ph i::after{ content:""; position:absolute; left:50%; bottom:2px; width:.28rem; height:2px; margin-left:-.14rem; background:#5A430F; border-radius:2px; }' +
    '@keyframes tsw-turn{ 0%,20%{ transform:rotate(0); } 55%,85%{ transform:rotate(-90deg); } 100%{ transform:rotate(0); } }' +
    '@media (prefers-reduced-motion: reduce){ .tsw-ph i{ animation:none; transform:rotate(-90deg); } }' +
    '.tsw-t{ flex:1; }' +
    '.tsw-x{ flex:none; width:40px; height:40px; border:0; border-radius:50%; background:transparent; color:#5A430F; font-size:1.2rem; cursor:pointer; }' +
    '.tsw-x:focus-visible{ outline:3px solid #5A430F; outline-offset:1px; }';
  var chips = [];
  function sync() { var show = port.matches && Math.min(innerWidth, innerHeight) < 700 && ss('tol-tsw-off') !== '1'; chips.forEach(function (c) { c.classList.toggle('is-on', show); }); }
  function addChip(el) {
    if (el.getAttribute('data-tsw')) return; el.setAttribute('data-tsw', '1');
    var anchor = el; while (anchor.parentNode && anchor.parentNode !== document.body && /^(CANVAS|SPAN)$/.test(anchor.tagName) && anchor.parentNode.children.length === 1) anchor = anchor.parentNode;
    var c = document.createElement('div'); c.className = 'tsw'; c.setAttribute('role', 'note');
    c.innerHTML = '<span class="tsw-ph" aria-hidden="true"><i></i></span><span class="tsw-t">Turn your phone sideways for a bigger picture. It goes full screen by itself.</span><button type="button" class="tsw-x" aria-label="Hide this hint">&times;</button>';
    c.querySelector('.tsw-x').addEventListener('click', function () { ssSet('tol-tsw-off', '1'); sync(); });
    anchor.parentNode.insertBefore(c, anchor.nextSibling); chips.push(c); sync();
  }
  function scan() { TARGETS.forEach(function (s) { var el = document.querySelector(s); if (el) addChip(el); }); }
  function start() {
    var st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
    scan(); var n = 0, iv = setInterval(function () { scan(); if (++n > 12) clearInterval(iv); }, 800);
    if (port.addEventListener) port.addEventListener('change', onTurn); else if (port.addListener) port.addListener(onTurn);
    window.addEventListener('resize', sync);
    try { if (screen.orientation && screen.orientation.addEventListener) screen.orientation.addEventListener('change', onTurn); } catch (e) {}
    window.addEventListener('orientationchange', function () { setTimeout(onTurn, 120); });
    if (!port.matches) setTimeout(function () { goSideways(true); }, 900);   // arrived already sideways with something playing
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
