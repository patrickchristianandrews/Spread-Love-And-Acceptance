/* turn-sideways.js — "Turn your phone sideways" for the pages whose picture is wider than a phone is tall.
   Two small helpers, on touch screens only:
   1. A friendly hint under the big picture (Brain Breakers stage, the cartoons and teaser, Drift, the Night Garden)
      while the phone is upright. It has a little animated phone, can be closed (remembered for this visit only),
      and disappears by itself once the phone is turned.
   2. When something goes full screen, ask the phone to turn sideways with it (screen.orientation.lock, which
      Chrome on Android allows in full screen; iPhones ignore it) and let go again when full screen ends.
   Nothing is stored beyond a session flag; with reduced motion the phone icon does not move. */
(function () {
  'use strict';
  if (!window.matchMedia || !matchMedia('(pointer: coarse)').matches) return;
  var port = matchMedia('(orientation: portrait)'), RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  function ss(k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } }
  function ssSet(k, v) { try { sessionStorage.setItem(k, v); } catch (e) {} }

  // ---- 2. full screen goes sideways
  function lock() { try { var o = screen.orientation; if (o && o.lock) { var p = o.lock('landscape'); if (p && p.catch) p.catch(function () {}); } } catch (e) {} }
  function unlock() { try { var o = screen.orientation; if (o && o.unlock) o.unlock(); } catch (e) {} }
  ['fullscreenchange', 'webkitfullscreenchange'].forEach(function (ev) {
    document.addEventListener(ev, function () { if (document.fullscreenElement || document.webkitFullscreenElement) lock(); else unlock(); });
  });

  // ---- 1. the hint
  var TARGETS = ['#sn-stage', '.tz-stage', '.fb-stage', '.fbmv-stage', '#cv-gl', '#ng-canvas'];
  var CSS = '.tsw{ display:none; align-items:center; gap:.6rem; margin:.6rem auto; padding:.45rem .5rem .45rem .9rem; max-width:34rem; border-radius:999px; background:#FFF4D6; border:1px solid #E7C777; color:#5A430F; font:600 .92rem/1.25 "Lora",Georgia,serif; box-shadow:0 4px 12px -6px rgba(90,60,10,.4); }' +
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
    c.innerHTML = '<span class="tsw-ph" aria-hidden="true"><i></i></span><span class="tsw-t">Turn your phone sideways for a bigger picture.</span><button type="button" class="tsw-x" aria-label="Hide this hint">&times;</button>';
    c.querySelector('.tsw-x').addEventListener('click', function () { ssSet('tol-tsw-off', '1'); sync(); });
    anchor.parentNode.insertBefore(c, anchor.nextSibling); chips.push(c); sync();
  }
  function scan() { TARGETS.forEach(function (s) { var el = document.querySelector(s); if (el) addChip(el); }); }
  function start() {
    var st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
    scan(); var n = 0, iv = setInterval(function () { scan(); if (++n > 12) clearInterval(iv); }, 800);
    var onch = function () { sync(); }; if (port.addEventListener) port.addEventListener('change', onch); else if (port.addListener) port.addListener(onch);
    window.addEventListener('resize', sync);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
