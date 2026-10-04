/* share-clip.js: Kip the Paperclip, the little friend who sits beside the Share buttons.
   He is decoration on the share button the site already has (the button itself does the sharing):
   he blinks and wiggles, does a trick when you tap or point at him, and does a happy dance when a page
   gets shared or its link copied. On reading pages he may also peek in from the edge once, after
   someone has read to the end of a page, to offer to help share it.
   He stays out of the way: at most one peek per page, none in someone's first 20 seconds, never while
   they're typing or a menu or dialog is open, at most three a day, "Not now" snoozes him for the
   visit, and "Don't show Kip" (remembered on this device, undo in Settings) leaves plain share buttons.
   Hide the helpers and Quiet mode leave the plain buttons too; Keep the page still or the device's
   reduce-motion setting keeps him still.
   Hooks:
     TOLShareClip.mount(button)   decorate one share button (also automatic for [data-share-clip],
                                  [data-share] buttons and links, and .tol-share-btn)
     TOLShareClip.celebrate()     a happy dance (also on the 'tol:shared' or 'tol-shared' event on document)
     TOLShareClip.trick(name)     play a trick (for testing); TOLShareClip.peek() shows the offer now
   Kept on this device only: tol-clip-off ("Don't show Kip"), tol-clip-day (peeks today) and, for this
   visit only, tol-clip-snooze. Nothing is sent anywhere. */
(function () {
  'use strict';
  if (window.TOLShareClip || !document.body) return;
  var html = document.documentElement, body = document.body;
  var TEST = /[?&]clip=test\b/.test(location.search);
  var OFF_KEY = 'tol-clip-off', DAY_KEY = 'tol-clip-day', SNOOZE_KEY = 'tol-clip-snooze';
  var SHARE_SEL = '[data-share-clip], button[data-share], a[data-share], .tol-share-btn';
  var NAME = 'Kip';

  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  function lsDel(k) { try { localStorage.removeItem(k); } catch (e) {} }
  function ssGet(k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } }
  function ssSet(k, v) { try { sessionStorage.setItem(k, v); } catch (e) {} }
  function el(tag, attrs, inner) {
    var n = document.createElement(tag);
    for (var k in attrs) if (attrs[k] != null) n.setAttribute(k, attrs[k]);
    if (inner) n.innerHTML = inner;
    return n;
  }
  function rand(a) { return a[Math.floor(Math.random() * a.length)]; }

  function offOn() { return lsGet(OFF_KEY) === '1'; }
  function helpersHidden() { return html.classList.contains('tol-no-helpers'); }
  function quiet() { return html.classList.contains('tol-quiet'); }
  function calm() {
    try { if (window.TOLStill && window.TOLStill.chosen) return !!window.TOLStill.chosen(); } catch (e) {}
    return !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  }
  function apply() {
    html.classList.toggle('tol-clip-off', offOn());
    html.classList.toggle('tsc-calm', calm());
  }
  apply();
  document.addEventListener('tol-still', apply);

  // ---------- how he looks ----------
  // a bent-wire paperclip (lavender, with a soft shine), big eyes, eyebrows that move, a small smile and
  // a heart charm hanging from his bottom loop. The heart-shaped wire and the hat only show in tricks.
  var WIRE = 'M26 40V74a7 7 0 0 0 14 0V22a11 11 0 0 0-22 0V80a14 14 0 0 0 28 0V30';
  var HEART = 'M32 92C14 78 6 62 9 50c3-11 16-14 23-3c7-11 20-8 23 3c3 12-5 28-23 42z';
  var SVG = '<svg class="tsc-svg" viewBox="-10 -18 84 132" aria-hidden="true" focusable="false">' +
    '<ellipse class="tsc-shadow" cx="32" cy="111" rx="17" ry="2.6" fill="#3A3350" opacity=".14"/>' +
    '<g class="tsc-body">' +
      '<g class="tsc-wire">' +
        '<path d="' + WIRE + '" fill="none" stroke="#6F5BB0" stroke-width="6.4" stroke-linecap="round" stroke-linejoin="round"/>' +
        '<path d="' + WIRE + '" fill="none" stroke="#A895E0" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"/>' +
        '<path d="' + WIRE + '" fill="none" stroke="#F1ECFF" stroke-width="1.3" stroke-linecap="round" stroke-dasharray="14 9 30 12" transform="translate(-.9 -.6)" opacity=".9"/>' +
      '</g>' +
      '<g class="tsc-hwire">' +
        '<path d="' + HEART + '" fill="none" stroke="#6F5BB0" stroke-width="6.4" stroke-linejoin="round"/>' +
        '<path d="' + HEART + '" fill="none" stroke="#F28BA8" stroke-width="3.6" stroke-linejoin="round"/>' +
        '<path d="' + HEART + '" fill="none" stroke="#FFE3EC" stroke-width="1.2" stroke-dasharray="10 14" transform="translate(-.8 -.6)"/>' +
      '</g>' +
      '<g class="tsc-charm"><circle cx="32" cy="96.5" r="2.6" fill="none" stroke="#C9A64A" stroke-width="1.5"/>' +
        '<path d="M32 109c-6-4-8.5-7-8.5-9.6a3.6 3.6 0 0 1 8.5-2a3.6 3.6 0 0 1 8.5 2c0 2.6-2.5 5.6-8.5 9.6z" fill="#F28BA8" stroke="#D9607F" stroke-width="1.1"/>' +
        '<ellipse cx="28.6" cy="100" rx="1.4" ry=".9" fill="#fff" opacity=".8"/></g>' +
      '<g class="tsc-face">' +
        '<g class="tsc-brows" fill="none" stroke="#3A3350" stroke-width="2.6" stroke-linecap="round">' +
          '<path class="tsc-brow-l" d="M15.5 19.5q7-6.5 14.5-1.5"/><path class="tsc-brow-r" d="M35 18q7.5-5 14.5 1.5"/></g>' +
        '<ellipse cx="23" cy="34" rx="8.4" ry="10" fill="#fff" stroke="#3A3350" stroke-width="1.8"/>' +
        '<ellipse cx="42" cy="34" rx="8.4" ry="10" fill="#fff" stroke="#3A3350" stroke-width="1.8"/>' +
        '<g class="tsc-pupils"><circle cx="24.4" cy="36" r="4" fill="#2B2620"/><circle cx="40.6" cy="36" r="4" fill="#2B2620"/>' +
          '<circle cx="25.8" cy="34.3" r="1.4" fill="#fff"/><circle cx="42" cy="34.3" r="1.4" fill="#fff"/></g>' +
        '<ellipse class="tsc-lid tsc-lid-l" cx="23" cy="34" rx="9.3" ry="10.9" fill="#D9CFF5" stroke="#3A3350" stroke-width="1.8"/>' +
        '<ellipse class="tsc-lid tsc-lid-r" cx="42" cy="34" rx="9.3" ry="10.9" fill="#D9CFF5" stroke="#3A3350" stroke-width="1.8"/>' +
        '<ellipse cx="18" cy="50" rx="3.6" ry="2.1" fill="#F4A3B8" opacity=".85"/><ellipse cx="47" cy="50" rx="3.6" ry="2.1" fill="#F4A3B8" opacity=".85"/>' +
        '<path class="tsc-mouth" d="M29 50.5q3.5 4 7 0" fill="none" stroke="#2B2620" stroke-width="2" stroke-linecap="round"/>' +
      '</g>' +
      '<g class="tsc-hat"><rect x="21" y="-2" width="22" height="3.4" rx="1.7" fill="#3A3350"/><rect x="25" y="-15" width="14" height="14" rx="2" fill="#3A3350"/>' +
        '<rect x="25" y="-5.6" width="14" height="2.6" fill="#F28BA8"/></g>' +
    '</g></svg>';
  var ENVELOPE = '<svg viewBox="0 0 20 14" aria-hidden="true" focusable="false"><rect x="1" y="1" width="18" height="12" rx="2" fill="#FFF8EC" stroke="#6F5BB0" stroke-width="1.4"/><path d="M1.8 2l8.2 6 8.2-6" fill="none" stroke="#6F5BB0" stroke-width="1.4"/><path d="M10 9.6c-1.3-.9-1.9-1.6-1.9-2.2a.9.9 0 0 1 1.9-.4a.9.9 0 0 1 1.9.4c0 .6-.6 1.3-1.9 2.2z" fill="#F28BA8"/></svg>';
  var PAGE = '<svg viewBox="0 0 16 20" aria-hidden="true" focusable="false"><path d="M1 1h10l4 4v14H1z" fill="#fff" stroke="#8C8070" stroke-width="1.2"/><path d="M4 8h8M4 11h8M4 14h6" stroke="#B9AE9C" stroke-width="1.2"/></svg>';
  var NOTE = '<svg viewBox="0 0 14 16" aria-hidden="true" focusable="false"><path d="M5 12.5V2.5l8-1.8v9.8" fill="none" stroke="#6F5BB0" stroke-width="1.6"/><ellipse cx="3.4" cy="12.8" rx="2.6" ry="2" fill="#6F5BB0"/><ellipse cx="11.4" cy="11" rx="2.6" ry="2" fill="#6F5BB0"/></svg>';
  var HEARTP = '<svg viewBox="0 0 12 11" aria-hidden="true" focusable="false"><path d="M6 10.5C2 7.8.5 5.8.5 4A2.7 2.7 0 0 1 6 2.4A2.7 2.7 0 0 1 11.5 4c0 1.8-1.5 3.8-5.5 6.5z" fill="currentColor"/></svg>';
  var SPARK = '<svg viewBox="0 0 12 12" aria-hidden="true" focusable="false"><path d="M6 0l1.4 4.6L12 6l-4.6 1.4L6 12l-1.4-4.6L0 6l4.6-1.4z" fill="#F4D26B"/></svg>';

  // ---------- styles ----------
  var CSS = [
    '.tsc-stage{ position:relative; display:inline-block; width:3.5em; height:5.5em; font-size:17px; line-height:0; }',
    '.tsc-stage .tsc-svg{ width:100%; height:100%; overflow:visible; display:block; }',
    '.tsc-stage svg *{ transform-box:fill-box; }',
    '.tsc-body{ transform-origin:50% 100%; }',
    '.tsc-charm{ transform-origin:50% 0; animation:tscCharm 3.4s ease-in-out infinite; }',
    '.tsc-lid{ transform-origin:50% 0; transform:scaleY(0); }',
    '.tsc-brows path{ transition:transform .25s ease; }',
    '.tsc-hwire, .tsc-hat{ opacity:0; }',
    '.tsc-hat{ transform-origin:30% 100%; }',
    '.tsc-stage.is-idle .tsc-body{ animation:tscIdle 4.2s ease-in-out infinite; }',
    '.tsc-stage.is-blink .tsc-lid{ animation:tscBlink .22s ease-in-out; }',
    '.tsc-stage.is-wow .tsc-brows path{ transform:translateY(-2.5px); }',
    '.tsc-stage.is-sway .tsc-body{ animation:tscSway 1.3s ease-in-out; }',
    '.tsc-stage.is-perk .tsc-body{ animation:tscPerk .55s ease-out; }',
    '.tsc-stage.is-wave .tsc-body{ animation:tscWave 1.4s ease-in-out; }',
    // tricks
    '.tsc-stage.t-dance .tsc-body{ animation:tscDance 1.9s ease-in-out; }',
    '.tsc-stage.t-spin .tsc-body{ animation:tscSpin 1.2s cubic-bezier(.5,0,.4,1); }',
    '.tsc-stage.t-heart .tsc-wire{ animation:tscOut 2.2s ease-in-out; }',
    '.tsc-stage.t-heart .tsc-hwire{ animation:tscIn 2.2s ease-in-out; transform-origin:50% 50%; }',
    '.tsc-stage.t-heart .tsc-charm{ animation:tscOut 2.2s ease-in-out; }',
    '.tsc-stage.t-heart .tsc-face{ animation:tscFaceDown 2.2s ease-in-out; }',
    '.tsc-stage.t-bounce .tsc-body{ animation:tscBounce 1.4s cubic-bezier(.3,0,.3,1); }',
    '.tsc-stage.t-bounce .tsc-shadow, .tsc-stage.t-dance .tsc-shadow{ animation:tscShadow 1.4s ease-in-out; transform-origin:50% 50%; }',
    '.tsc-stage.t-cartwheel .tsc-body{ animation:tscCart 1.6s ease-in-out; transform-origin:50% 55%; }',
    '.tsc-stage.t-hat .tsc-hat{ animation:tscHat 2.2s ease-in-out; }',
    '.tsc-stage.t-hat .tsc-body{ animation:tscBow 2.2s ease-in-out; }',
    '.tsc-stage.t-juggle .tsc-pupils{ animation:tscLook 1.1s ease-in-out infinite; }',
    '.tsc-stage.t-juggle .tsc-body{ animation:tscJigg 1.1s ease-in-out infinite; }',
    '.tsc-stage.t-clip .tsc-body{ animation:tscSqueeze 2s ease-in-out; transform-origin:50% 50%; }',
    '.tsc-stage.t-wink .tsc-lid-l{ animation:tscWink 1.3s ease-in-out; }',
    '.tsc-stage.t-wink .tsc-brow-l{ transform:translateY(2px) rotate(8deg); }',
    '.tsc-stage.t-wink .tsc-body{ animation:tscTilt 1.3s ease-in-out; }',
    '.tsc-stage.t-party .tsc-body{ animation:tscParty 2.2s ease-in-out; }',
    '.tsc-stage.t-party .tsc-brows path, .tsc-stage.t-dance .tsc-brows path, .tsc-stage.t-bounce .tsc-brows path{ transform:translateY(-2.5px); }',
    '.tsc-stage.t-party .tsc-mouth, .tsc-stage.t-dance .tsc-mouth{ d:path("M28 49.5q4.5 6 9 0z"); fill:#C9566F; }',
    // props (music notes, envelopes, pages, hearts, sparkles), sized with the stage
    '.tsc-prop{ position:absolute; pointer-events:none; line-height:0; }',
    '.tsc-prop svg{ width:100%; height:100%; display:block; overflow:visible; }',
    '.tsc-note{ width:.8em; height:.9em; left:2.6em; top:.6em; animation:tscNote 1.5s ease-out forwards; opacity:0; }',
    '.tsc-env{ width:1.05em; height:.75em; left:1.25em; top:.2em; animation:tscJug 1.1s linear infinite; }',
    '.tsc-page{ width:1em; height:1.25em; top:2em; }',
    '.tsc-page.is-l{ left:-1.4em; animation:tscPageL 2s ease-in-out forwards; }',
    '.tsc-page.is-r{ left:3.9em; animation:tscPageR 2s ease-in-out forwards; }',
    '.tsc-heartp{ width:.7em; height:.65em; left:1.4em; top:2em; color:#F28BA8; animation:tscBurst 1.4s ease-out forwards; }',
    '.tsc-spark{ width:.75em; height:.75em; left:2.7em; top:.4em; animation:tscSpark .9s ease-out forwards; }',
    '@keyframes tscIdle{ 0%,100%{ transform:translateY(0) rotate(0) } 50%{ transform:translateY(-1.5px) rotate(-1.5deg) } }',
    '@keyframes tscCharm{ 0%,100%{ transform:rotate(7deg) } 50%{ transform:rotate(-7deg) } }',
    '@keyframes tscBlink{ 0%,100%{ transform:scaleY(0) } 45%,60%{ transform:scaleY(1) } }',
    '@keyframes tscSway{ 0%,100%{ transform:rotate(0) } 30%{ transform:rotate(-7deg) } 70%{ transform:rotate(6deg) } }',
    '@keyframes tscPerk{ 0%,100%{ transform:translateY(0) } 40%{ transform:translateY(-.35em) scaleY(1.04) } }',
    '@keyframes tscWave{ 0%,100%{ transform:rotate(0) } 15%,45%,75%{ transform:rotate(-12deg) } 30%,60%{ transform:rotate(10deg) } }',
    '@keyframes tscDance{ 0%,100%{ transform:none } 12%{ transform:translateY(-.4em) rotate(-12deg) } 25%{ transform:translateY(0) rotate(0) scaleY(.92) } 37%{ transform:translateY(-.4em) rotate(12deg) } 50%{ transform:translateY(0) scaleY(.92) } 62%{ transform:translateX(-.25em) rotate(-8deg) } 75%{ transform:translateX(.25em) rotate(8deg) } 87%{ transform:translateY(-.5em) rotate(0) } }',
    '@keyframes tscSpin{ 0%{ transform:perspective(200px) rotateY(0) } 20%{ transform:perspective(200px) translateY(-.3em) rotateY(0) } 100%{ transform:perspective(200px) rotateY(720deg) } }',
    '@keyframes tscOut{ 0%,100%{ opacity:1; transform:none } 25%,75%{ opacity:0; transform:scale(.7) } }',
    '@keyframes tscIn{ 0%,100%{ opacity:0; transform:scale(.6) rotate(-10deg) } 25%,75%{ opacity:1; transform:scale(1) rotate(0) } 40%{ transform:scale(1.08) } 55%{ transform:scale(1) } }',
    '@keyframes tscFaceDown{ 0%,100%{ transform:none } 25%,75%{ transform:translateY(16px) scale(.86) } }',
    '@keyframes tscBounce{ 0%,100%{ transform:none } 15%{ transform:scale(1.12,.72) } 40%{ transform:translateY(-1.4em) scale(.92,1.1) } 55%{ transform:translateY(-1.5em) } 75%{ transform:scale(1.1,.8) } 88%{ transform:translateY(-.25em) } }',
    '@keyframes tscShadow{ 0%,100%{ transform:none } 45%{ transform:scale(.6); opacity:.06 } }',
    '@keyframes tscCart{ 0%{ transform:none } 15%{ transform:translateX(-.5em) rotate(-15deg) } 70%{ transform:translateX(.5em) translateY(-.4em) rotate(360deg) } 85%{ transform:translateX(.2em) rotate(370deg) } 100%{ transform:rotate(360deg) } }',
    '@keyframes tscHat{ 0%,100%{ opacity:0; transform:translateY(-6px) } 15%,85%{ opacity:1; transform:none } 40%{ transform:translate(3px,-7px) rotate(-22deg) } 55%{ transform:none } }',
    '@keyframes tscBow{ 0%,25%,60%,100%{ transform:none } 40%{ transform:rotate(-6deg) translateY(1px) } }',
    '@keyframes tscLook{ 0%,100%{ transform:translate(-1.4px,-2px) } 50%{ transform:translate(1.4px,-2px) } }',
    '@keyframes tscJigg{ 0%,100%{ transform:translateY(0) } 25%,75%{ transform:translateY(-1.5px) } }',
    '@keyframes tscJug{ 0%{ transform:translate(-1.1em,1em) rotate(-20deg) } 25%{ transform:translate(-.6em,-.9em) rotate(0) } 50%{ transform:translate(1.1em,1em) rotate(20deg) } 75%{ transform:translate(0,.3em) rotate(0) } 100%{ transform:translate(-1.1em,1em) rotate(-20deg) } }',
    '@keyframes tscSqueeze{ 0%,30%,100%{ transform:none } 45%{ transform:scale(.82,1.05) } 60%{ transform:scale(1.06,.97) } 70%{ transform:none } }',
    '@keyframes tscPageL{ 0%{ opacity:0; transform:translateX(-.8em) rotate(-20deg) } 30%{ opacity:1 } 45%,85%{ opacity:1; transform:translateX(1.75em) rotate(-4deg) } 100%{ opacity:0; transform:translateX(1.75em) translateY(-.5em) } }',
    '@keyframes tscPageR{ 0%{ opacity:0; transform:translateX(.8em) rotate(20deg) } 30%{ opacity:1 } 45%,85%{ opacity:1; transform:translateX(-1.75em) rotate(4deg) } 100%{ opacity:0; transform:translateX(-1.75em) translateY(-.5em) } }',
    '@keyframes tscWink{ 0%,100%{ transform:scaleY(0) } 20%,70%{ transform:scaleY(1) } }',
    '@keyframes tscTilt{ 0%,100%{ transform:none } 20%,70%{ transform:rotate(-8deg) } }',
    '@keyframes tscParty{ 0%,100%{ transform:none } 10%{ transform:scale(1.1,.8) } 22%{ transform:translateY(-1.1em) rotate(-14deg) } 34%{ transform:scale(1.08,.86) } 46%{ transform:translateY(-1.1em) rotate(14deg) } 58%{ transform:scale(1.08,.86) } 72%{ transform:translateY(-.8em) rotate(360deg) } 86%{ transform:scale(1.06,.9) rotate(360deg) } }',
    '@keyframes tscNote{ 0%{ opacity:0; transform:translate(0,.4em) } 20%{ opacity:1 } 100%{ opacity:0; transform:translate(var(--dx,.6em),-1.6em) rotate(15deg) } }',
    '@keyframes tscBurst{ 0%{ opacity:0; transform:translate(0,0) scale(.4) } 15%{ opacity:1 } 100%{ opacity:0; transform:translate(var(--dx),var(--dy)) scale(1.1) rotate(var(--r,0deg)) } }',
    '@keyframes tscSpark{ 0%{ opacity:0; transform:scale(.2) rotate(0) } 40%{ opacity:1; transform:scale(1.1) rotate(45deg) } 100%{ opacity:0; transform:scale(.6) rotate(90deg) } }',
    // perched beside a share button
    '.tsc-perch{ display:inline-flex; align-items:flex-end; justify-content:center; vertical-align:middle; width:2.8rem; height:4.3rem; margin:-1.9rem -1.85rem -.1rem -.3rem; cursor:pointer; position:relative; z-index:1; flex:none; -webkit-tap-highlight-color:transparent; }',
    '.tsc-perch .tsc-stage{ font-size:12.5px; filter:drop-shadow(0 0 1.2px rgba(255,255,255,.95)) drop-shadow(0 1px 2px rgba(58,51,80,.28)); transform:rotate(-8deg); transform-origin:50% 100%; }',
    '.tsc-perch:hover .tsc-stage{ transform:rotate(-2deg); }',
    'html:not(.tol-no-helpers):not(.tol-clip-off) .tsc-has-clip .tol-share-ic{ display:none; }',
    'html:not(.tol-no-helpers):not(.tol-clip-off) .tsc-has-clip{ padding-left:1.7rem !important; }',
    'html.tol-no-helpers .tsc-perch, html.tol-clip-off .tsc-perch, html.tol-no-helpers .tsc-peek, html.tol-clip-off .tsc-peek{ display:none !important; }',
    '@media print{ .tsc-perch, .tsc-peek{ display:none !important; } }',
    // peeking in from the right edge, once, near the end of a page
    '.tsc-peek{ position:fixed; right:0; bottom:calc(8.6rem + env(safe-area-inset-bottom, 0px)); z-index:878; display:flex; align-items:flex-end; gap:.35rem; pointer-events:none;',
    '  transform:translateX(110%); transition:transform .6s cubic-bezier(.3,1.4,.5,1); }',
    '.tsc-peek.is-in{ transform:translateX(0); }',
    '.tsc-peek > *{ pointer-events:auto; }',
    '.tsc-me{ appearance:none; border:0; background:none; padding:.2rem .5rem .2rem .3rem; margin:0; cursor:pointer; min-width:44px; min-height:44px; border-radius:16px 0 0 16px; line-height:0; }',
    '.tsc-me:focus-visible{ outline:2px solid var(--focus, #2F5F8A); outline-offset:2px; }',
    '.tsc-bub{ position:relative; box-sizing:border-box; width:min(17.5rem, calc(100vw - 6rem)); margin-bottom:2.4rem; padding:.85rem .9rem .7rem; background:#FFFDF7; color:#2B2620;',
    '  border:1.5px solid #CBBDEB; border-radius:18px; box-shadow:0 10px 28px rgba(58,51,80,.18); font:400 .95rem/1.4 "Lora", Georgia, serif; text-align:left; }',
    '.tsc-bub::after{ content:""; position:absolute; right:-8px; bottom:1.1rem; width:14px; height:14px; background:#FFFDF7; border-top:1.5px solid #CBBDEB; border-right:1.5px solid #CBBDEB; transform:rotate(45deg); }',
    '.tsc-bub p{ margin:0 0 .6rem; padding:0; background:none; border:0; box-shadow:none; max-width:none; font-size:.95rem; line-height:1.4; }',
    '.tsc-bub strong{ font-family:"Fraunces", Georgia, serif; color:#4B3D86; }',
    '.tsc-row{ display:flex; flex-wrap:wrap; gap:.4rem; }',
    '.tsc-row button, .tsc-off{ font:600 .9rem "Lora", Georgia, serif; min-height:44px; border-radius:999px; cursor:pointer; padding:.45rem 1rem; }',
    '.tsc-go{ background:#5B4A9E; color:#fff; border:1px solid #5B4A9E; }',
    '.tsc-go:hover{ background:#4B3D86; }',
    '.tsc-no{ background:#fff; color:#4B3D86; border:1px solid #CBBDEB; }',
    '.tsc-no:hover{ background:#F4F0FF; }',
    '.tsc-off{ display:block; background:none; border:0; color:#6A6152; font-weight:400; font-size:.82rem; text-decoration:underline; padding:.3rem .2rem; margin-top:.25rem; min-height:44px; }',
    '.tsc-bub button:focus-visible{ outline:2px solid var(--focus, #2F5F8A); outline-offset:2px; }',
    '@media (max-width:560px){ .tsc-peek{ bottom:calc(9.5rem + env(safe-area-inset-bottom, 0px)); } .tsc-peek .tsc-stage{ font-size:14px; } .tsc-bub{ margin-bottom:1.6rem; font-size:.9rem; } }',
    // still: no movement at all, he just sits there smiling
    'html.tsc-calm .tsc-stage *, html.tsc-calm .tsc-stage{ animation:none !important; transition:none !important; }',
    'html.tsc-calm .tsc-peek{ transition:none; }',
    'html.tsc-calm .tsc-prop{ display:none !important; }'
  ].join('\n');
  if (!document.getElementById('tsc-style')) {
    var st = el('style', { id: 'tsc-style' }); st.textContent = CSS; document.head.appendChild(st);
  }

  // ---------- one paperclip (a stage), and his tricks ----------
  var stages = [];
  function makeStage() {
    var s = el('span', { class: 'tsc-stage is-idle', 'aria-hidden': 'true' }, SVG);
    stages.push(s);
    return s;
  }
  function prop(stage, cls, svg, styleText, life) {
    var p = el('span', { class: 'tsc-prop ' + cls }, svg);
    if (styleText) p.setAttribute('style', styleText);
    stage.appendChild(p);
    setTimeout(function () { p.remove(); }, life || 2000);
    return p;
  }
  function hearts(stage, n) {
    var colors = ['#F28BA8', '#F4D26B', '#A895E0', '#7FC4B8', '#F6A96B'];
    for (var i = 0; i < n; i++) {
      var a = (Math.PI * 2 * i) / n + Math.random() * .5, d = 2.2 + Math.random() * 1.6;
      prop(stage, 'tsc-heartp', i % 3 === 2 ? SPARK : HEARTP,
        'color:' + colors[i % colors.length] + ';--dx:' + (Math.cos(a) * d).toFixed(2) + 'em;--dy:' + (Math.sin(a) * d - 1.2).toFixed(2) + 'em;--r:' + Math.round(Math.random() * 90 - 45) + 'deg;animation-delay:' + (i * 30) + 'ms', 1800);
    }
  }
  var TRICKS = {
    dance: function (s) { [0, 450, 900, 1300].forEach(function (t, i) { setTimeout(function () { prop(s, 'tsc-note', NOTE, '--dx:' + (i % 2 ? '-' : '') + '.8em;left:' + (i % 2 ? '.2em' : '2.6em'), 1600); }, t); }); return 1900; },
    spin: function () { return 1200; },
    heart: function (s) { setTimeout(function () { prop(s, 'tsc-spark', SPARK, 'left:.3em;top:1.4em', 1000); prop(s, 'tsc-spark', SPARK, 'animation-delay:.2s', 1200); }, 600); return 2200; },
    bounce: function () { return 1400; },
    cartwheel: function () { return 1600; },
    hat: function () { return 2200; },
    juggle: function (s) { for (var i = 0; i < 3; i++) prop(s, 'tsc-env', ENVELOPE, 'animation-delay:' + (-i * 0.367).toFixed(2) + 's', 2300); return 2200; },
    clip: function (s) { prop(s, 'tsc-page is-l', PAGE, '', 2000); prop(s, 'tsc-page is-r', PAGE, '', 2000); setTimeout(function () { prop(s, 'tsc-spark', SPARK, 'left:1.4em;top:1.4em', 900); }, 900); return 2000; },
    wink: function (s) { setTimeout(function () { prop(s, 'tsc-spark', SPARK, 'left:-.2em;top:1em', 900); }, 250); return 1300; }
  };
  var TRICK_NAMES = Object.keys(TRICKS);
  function busy(s) { return s.getAttribute('data-trick'); }
  function play(s, name, done) {
    if (!s || calm()) { if (done) done(); return false; }
    if (busy(s)) return false;
    var last = s.getAttribute('data-last');
    if (!name) { do { name = rand(TRICK_NAMES); } while (name === last && TRICK_NAMES.length > 1); }
    var cls = 't-' + name, fn = TRICKS[name] || function () { return 2200; };
    s.setAttribute('data-trick', name); s.setAttribute('data-last', name);
    s.classList.remove('is-idle', 'is-sway', 'is-perk', 'is-wave');
    void s.offsetWidth;
    s.classList.add(cls);
    var dur = fn(s);
    setTimeout(function () { s.classList.remove(cls); s.removeAttribute('data-trick'); s.classList.add('is-idle'); if (done) done(); }, dur + 40);
    return name;
  }
  function party(s) {
    if (!s || calm()) return;
    s.classList.remove.apply(s.classList, TRICK_NAMES.map(function (n) { return 't-' + n; }));
    s.removeAttribute('data-trick');
    s.setAttribute('data-trick', 'party'); s.classList.remove('is-idle'); void s.offsetWidth; s.classList.add('t-party');
    hearts(s, 14);
    setTimeout(function () { hearts(s, 8); }, 700);
    [200, 800, 1300].forEach(function (t, i) { setTimeout(function () { prop(s, 'tsc-note', NOTE, '--dx:' + (i % 2 ? '-' : '') + '.8em', 1600); }, t); });
    setTimeout(function () { s.classList.remove('t-party'); s.removeAttribute('data-trick'); s.classList.add('is-idle'); }, 2250);
  }
  function flash(s, cls, ms) {
    if (calm() || busy(s)) return;
    s.classList.remove('is-idle'); s.classList.add(cls);
    setTimeout(function () { s.classList.remove(cls); if (!busy(s)) s.classList.add('is-idle'); }, ms);
  }
  function visible(s) {
    if (!s.isConnected) return false;
    var r = s.getBoundingClientRect();
    return r.width > 0 && r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth;
  }
  // blinks now and then, and a little sway once in a while
  setInterval(function () {
    if (calm() || document.hidden) return;
    stages = stages.filter(function (s) { return s.isConnected || s.__keep; });
    stages.forEach(function (s) {
      if (!visible(s) || busy(s)) return;
      if (Math.random() < .45) { s.classList.add('is-blink'); setTimeout(function () { s.classList.remove('is-blink'); }, 240); }
      else if (Math.random() < .12) flash(s, 'is-sway', 1300);
    });
  }, 2600);
  // his eyes follow the pointer a little
  var lookRaf = 0;
  document.addEventListener('pointermove', function (e) {
    if (lookRaf || calm()) return;
    lookRaf = requestAnimationFrame(function () {
      lookRaf = 0;
      stages.forEach(function (s) {
        if (!visible(s) || busy(s)) return;
        var r = s.getBoundingClientRect(), dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height * .3);
        var d = Math.max(1, Math.sqrt(dx * dx + dy * dy)), k = Math.min(1, d / 260);
        var p = s.querySelector('.tsc-pupils');
        if (p) p.setAttribute('transform', 'translate(' + (dx / d * 2.4 * k).toFixed(2) + ' ' + (dy / d * 2.6 * k).toFixed(2) + ')');
      });
    });
  }, { passive: true });

  // ---------- perched beside every share button ----------
  var lastPerchStage = null, trickAt = 0;
  function mount(btn) {
    if (!btn || btn.nodeType !== 1 || btn.__tscPerch || btn.closest('.tsc-peek')) return null;
    if (btn.hasAttribute('data-no-clip') || btn.closest('[data-share-sheet], .tol-sharesheet, [role="dialog"]') || btn.hasAttribute('data-act') || !btn.parentNode) return null;
    var perch = el('span', { class: 'tsc-perch', 'aria-hidden': 'true', title: 'Tap ' + NAME + ' for a trick' });
    var s = makeStage();
    perch.appendChild(s);
    btn.parentNode.insertBefore(perch, btn);
    btn.__tscPerch = perch; perch.__btn = btn;
    btn.classList.add('tsc-has-clip');
    // a tap on him is a trick, not a share
    perch.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); trickAt = Date.now(); play(s); });
    perch.addEventListener('pointerenter', function (e) { if (e.pointerType === 'mouse' && Date.now() - trickAt > 2500) { trickAt = Date.now(); play(s); } });
    btn.addEventListener('pointerenter', function () { flash(s, 'is-perk', 560); });
    btn.addEventListener('focus', function () { flash(s, 'is-perk', 560); });
    return perch;
  }
  function scan(root) {
    if (!root || !root.querySelectorAll) return;
    if (root.matches && root.matches(SHARE_SEL)) mount(root);
    Array.prototype.forEach.call(root.querySelectorAll(SHARE_SEL), mount);
  }

  // ---------- noticing a share that went through ----------
  var armedAt = 0;
  function arm(btn) { armedAt = Date.now(); if (btn && btn.__tscPerch) lastPerchStage = btn.__tscPerch.querySelector('.tsc-stage'); }
  function armed() { return Date.now() - armedAt < 120000; }
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest(SHARE_SEL);
    if (b) { arm(b); if (b.__tscPerch) flash(b.__tscPerch.querySelector('.tsc-stage'), 'is-wow', 900); }
  }, true);
  function sheetOpen() { var sh = document.querySelector('.tol-sharesheet'); return sh && !sh.hidden ? sh : null; }
    var lastParty = 0;
  function celebrate(how) {
    if (Date.now() - lastParty < 1000) return;   // the share helper may announce one share under two event names
    lastParty = Date.now();
    armedAt = 0;
    if (offOn() || helpersHidden()) return;
    var did = false, sh = sheetOpen();
    if (sh) {
      // the share sheet is open: the perched paperclip dances once the sheet closes
      var waitFor = lastPerchStage, t0 = Date.now();
      (function later() {
        if (Date.now() - t0 > 15000) return;
        if (sheetOpen()) { setTimeout(later, 300); return; }
        if (waitFor && visible(waitFor)) setTimeout(function () { party(waitFor); }, 250);
      })();
      did = true;
    }
    if (peekBox && peekBox.classList.contains('is-in')) {
      if (!sh) party(peekStage);
      did = true;
      say(how === 'copied' ? '<strong>Link copied!</strong> Paste it anywhere you like. Thanks for passing it on!' : '<strong>Yay!</strong> Thanks for passing it on. You just made someone’s day a little brighter.', false);
      clearTimeout(peekTimer); peekTimer = setTimeout(function () { hidePeek(); }, sh ? 8000 : 4200);
    }
    if (did) return;
    if (lastPerchStage && visible(lastPerchStage)) { party(lastPerchStage); return; }
    stages.forEach(function (s) { if (visible(s)) party(s); });
  }
  function onShared(e) { var m = e && e.detail && (e.detail.method || e.detail.how); celebrate(/copy/.test(m || '') ? 'copied' : 'shared'); }
  document.addEventListener('tol:shared', onShared);
  document.addEventListener('tol-shared', onShared);
  // anything that calls the site's share helper counts as starting a share
  function wrapApis() {
    var T = window.TOLShare;
    if (T && typeof T.share === 'function' && !T.share.__tsc) {
      var ot = T.share;
      var wt = function () { arm(); return ot.apply(T, arguments); };
      wt.__tsc = true;
      try { T.share = wt; } catch (e) {}
    }
  }

  // ---------- peeking in near the end of a page ----------
  var cur = decodeURIComponent(location.pathname);
  var FULLSCREEN = /^\/(night-garden|calm-visualizer|pal-cam-tv|garden-backdrop|frequency-buddies-live|frequency-buddies-music-video|offline|404|ask)\.html$/;
  var SENSITIVE = /^\/(growing-up|know-yourself)(-in-depth)?\.html$/;
  var startedAt = Date.now(), maxScroll = 0, peekY = 0, shownThisPage = false, peekBox = null, peekStage = null, peekTimer = 0;
  var DWELL = TEST ? 1200 : 20000;
  function today() { var d = new Date(); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); }
  function dayCount() { try { var o = JSON.parse(lsGet(DAY_KEY) || '{}'); return o.d === today() ? (o.n || 0) : 0; } catch (e) { return 0; } }
  function bumpDay() { lsSet(DAY_KEY, JSON.stringify({ d: today(), n: dayCount() + 1 })); }
  function pageAllowsPeek() {
    if (body.classList.contains('is-game') || body.hasAttribute('data-no-share-clip') || body.hasAttribute('data-sensitive')) return false;
    if (FULLSCREEN.test(cur) || SENSITIVE.test(cur)) return false;
    if (document.querySelector('meta[http-equiv="Content-Security-Policy"], .pc-ov.is-tv')) return false;
    // only where the page has a share button of its own
    return !!document.querySelector('.tsc-has-clip');
  }
  function typing() {
    var a = document.activeElement;
    return !!(a && (/^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName) || a.isContentEditable));
  }
  function overlayOpen() {
    if (document.fullscreenElement) return true;
    var open = Array.prototype.some.call(document.querySelectorAll('[role="dialog"], [aria-modal="true"], .tol-breathe, .pc-ov, #tol-panel, .tol-drop, [data-share-sheet], .tol-share-sheet'), function (n) {
      if (n.hidden || n.closest('.tsc-peek')) return false;
      var cs = getComputedStyle(n), r = n.getBoundingClientRect();
      return cs.display !== 'none' && cs.visibility !== 'hidden' && r.width > 0 && r.height > 0;
    });
    if (open) return true;
    var expanded = document.querySelector('header [aria-expanded="true"], nav [aria-expanded="true"]');
    if (expanded) return true;
    return Array.prototype.some.call(document.querySelectorAll('video, audio'), function (m) { return !m.paused && !m.ended; });
  }
  function nearEnd() {
    var main = document.querySelector('main');
    if (!main) return false;
    var doc = document.documentElement, scrollable = doc.scrollHeight - innerHeight;
    if (scrollable < innerHeight * .5) return false;                         // a short page: nothing to read to the end of
    if (maxScroll < Math.min(scrollable * .6, innerHeight * 1.5)) return false; // some real reading first
    return main.getBoundingClientRect().bottom < innerHeight * 1.4;
  }
  function mayPeek(force) {
    if (shownThisPage || peekBox) return false;
    if (offOn() || helpersHidden() || quiet()) return false;
    if (force) return true;
    if (ssGet(SNOOZE_KEY) === '1' || dayCount() >= 3) return false;
    if (Date.now() - startedAt < DWELL) return false;
    if (!pageAllowsPeek() || typing() || overlayOpen()) return false;
    return nearEnd();
  }
  function check() { if (mayPeek(false)) showPeek(); }
  var scrollT = 0;
  addEventListener('scroll', function () {
    maxScroll = Math.max(maxScroll, scrollY);
    // he tucks away again once someone scrolls back up to read, so he never sits over what they're reading
    if (peekBox && peekBox.classList.contains('is-in') && peekY - scrollY > 360 && !peekBox.contains(document.activeElement)) hidePeek();
    if (scrollT) return;
    scrollT = setTimeout(function () { scrollT = 0; check(); }, 400);
  }, { passive: true });
  setInterval(function () { check(); if (peekBox && peekBox.classList.contains('is-in') && (overlayOpen() || helpersHidden() || quiet())) hidePeek(); }, 2000);

  var LINES = [
    '<strong>Found this helpful?</strong> I can help you share it!',
    '<strong>Know someone who’d like this?</strong> I’m great at holding things together. Want to send it their way?',
    '<strong>You made it to the end!</strong> Want to pass this page along to someone?'
  ];
  function say(htmlText, withButtons) {
    if (!peekBox) return;
    var bub = peekBox.querySelector('.tsc-bub');
    bub.querySelector('.tsc-say').innerHTML = htmlText;
    bub.querySelector('.tsc-row').hidden = !withButtons;
    bub.querySelector('.tsc-off').hidden = !withButtons;
  }
  function showPeek(force) {
    if (!force && !mayPeek(false)) return;
    shownThisPage = true;
    if (!force) bumpDay();
    peekY = scrollY;
    // and after a little while on his own, unless someone is using his buttons
    var idleOut = function () { if (!peekBox) return; if (peekBox.contains(document.activeElement) || peekBox.matches(':hover')) { peekTimer = setTimeout(idleOut, 4000); return; } hidePeek(); };
    clearTimeout(peekTimer); peekTimer = setTimeout(idleOut, TEST ? 30000 : 20000);
    peekBox = el('div', { class: 'tsc-peek', role: 'region', 'aria-label': NAME + ' the Paperclip' },
      '<div class="tsc-bub"><div role="status" aria-live="polite"><p class="tsc-say"></p></div>' +
      '<div class="tsc-row"><button type="button" class="tsc-go">Share this page</button><button type="button" class="tsc-no">Not now</button></div>' +
      '<button type="button" class="tsc-off">Don’t show ' + NAME + '</button></div>' +
      '<button type="button" class="tsc-me" aria-label="' + NAME + ' the Paperclip. Tap for a trick"></button>');
    peekStage = makeStage(); peekStage.__keep = false;
    peekBox.querySelector('.tsc-me').appendChild(peekStage);
    body.appendChild(peekBox);
    setTimeout(function () { say(rand(LINES), true); }, 60);
    requestAnimationFrame(function () { requestAnimationFrame(function () { peekBox.classList.add('is-in'); }); });
    setTimeout(function () { if (peekStage && !busy(peekStage)) flash(peekStage, 'is-wave', 1400); }, calm() ? 0 : 650);
    peekBox.addEventListener('click', function (e) {
      if (e.target.closest('.tsc-go')) { doShare(); }
      else if (e.target.closest('.tsc-no')) { ssSet(SNOOZE_KEY, '1'); hidePeek(true); }
      else if (e.target.closest('.tsc-off')) {
        lsSet(OFF_KEY, '1');
        say('Okay! I’ll stay out of the way. You can bring me back any time in Settings.', false);
        clearTimeout(peekTimer); peekTimer = setTimeout(function () { hidePeek(true); apply(); }, 2600);
      }
      else if (e.target.closest('.tsc-me')) { play(peekStage); }
    });
    peekBox.querySelector('.tsc-me').addEventListener('pointerenter', function (e) {
      if (e.pointerType === 'mouse' && Date.now() - trickAt > 2500) { trickAt = Date.now(); play(peekStage); }
    });
  }
  function hidePeek(returnFocus) {
    if (!peekBox) return;
    var box = peekBox, hadFocus = box.contains(document.activeElement);
    peekBox = null;
    clearTimeout(peekTimer);
    box.classList.remove('is-in');
    setTimeout(function () { box.remove(); }, calm() ? 0 : 650);
    if (hadFocus && returnFocus) {
      var t = document.querySelector('.tsc-has-clip') || document.querySelector('main');
      if (t) { if (!t.hasAttribute('tabindex') && !/^(A|BUTTON)$/.test(t.tagName)) t.setAttribute('tabindex', '-1'); try { t.focus({ preventScroll: true }); } catch (e) {} }
    }
  }
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && peekBox && peekBox.classList.contains('is-in')) { ssSet(SNOOZE_KEY, '1'); hidePeek(true); }
  });
  function shareData() {
    var c = document.querySelector('link[rel="canonical"]');
    var h1 = document.querySelector('main h1');
    return { title: (h1 ? h1.textContent.replace(/\s+/g, ' ').trim() : document.title.split('·')[0].trim()).slice(0, 120),
      url: (c && c.href) || (location.origin + location.pathname) };
  }
  function doShare() {
    var btn = document.querySelector('.tsc-has-clip');
    if (btn) { lastPerchStage = null; arm(); btn.click(); return; }
    arm();
    var d = shareData();
    if (window.TOLShare && typeof window.TOLShare.share === 'function') { window.TOLShare.share({ title: d.title }); return; }
    if (navigator.share) { navigator.share(d).then(function () { celebrate('shared'); }, function () {}); return; }
    say('Here’s the link to copy: <br>' + d.url.replace(/</g, '&lt;'), false);
  }

  // ---------- a switch in Settings, beside "Hide the helpers" ----------
  function addSetting(box) {
    if (!box || box.querySelector('[data-clip-switch]')) return;
    var helpers = box.querySelector('[data-switch="helpers"]'), after = helpers && helpers.closest('label');
    if (!after) return;
    var lab = el('label', { class: 'tol-set-sw' },
      '<input type="checkbox" data-clip-switch><span class="tol-set-track" aria-hidden="true"><span></span></span>' +
      '<span>Show ' + NAME + ' the Paperclip<small>The little paperclip by the Share buttons, who does tricks and now and then offers to help you share a page you’ve read to the end</small></span>');
    after.parentNode.insertBefore(lab, after.nextSibling);
    var input = lab.querySelector('input');
    input.checked = !offOn();
    input.addEventListener('change', function () { if (input.checked) lsDel(OFF_KEY); else lsSet(OFF_KEY, '1'); apply(); });
    box.addEventListener('focusin', function () { input.checked = !offOn(); });
  }

  // ---------- start ----------
  wrapApis();
  scan(body);
  addSetting(document.querySelector('.tol-set'));
  var mo = new MutationObserver(function (list) {
    for (var i = 0; i < list.length; i++) {
      var added = list[i].addedNodes;
      for (var j = 0; j < added.length; j++) {
        var n = added[j];
        if (n.nodeType !== 1 || (n.classList && (n.classList.contains('tsc-perch') || n.classList.contains('tsc-prop') || n.classList.contains('tsc-peek')))) continue;
        if (n.classList && n.classList.contains('tol-set')) addSetting(n);
        scan(n);
      }
    }
    if (!(window.TOLShare && window.TOLShare.share && window.TOLShare.share.__tsc)) wrapApis();
  });
  mo.observe(body, { childList: true, subtree: true });
  addEventListener('storage', function (e) { if (e.key === OFF_KEY || e.key === 'tol-still') apply(); });

  window.TOLShareClip = {
    mount: mount,
    celebrate: celebrate,
    trick: function (name, which) { var s = which || peekStage || stages.filter(visible)[0] || stages[0]; return play(s, name); },
    tricks: TRICK_NAMES.slice(),
    peek: function () { if (!peekBox) { shownThisPage = false; showPeek(true); } },
    hide: function () { hidePeek(); }
  };
})();
