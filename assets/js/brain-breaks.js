/* brain-breaks.js — "Brain Breakers": big instrumental music for a short break, then straight back to the program.
   site.js loads this on the home page and on program pages (book chapters, worksheets, guides). It adds:
   - a bold card at the top of the home page, and
   - a "Take a Brain Break" card at the end of each program page, above the Previous / Next links.
   Nothing plays until someone presses a button (browsers block autoplay, and a surprise blast of music
   isn't kind). The music files load only when a button is pressed. When a break ends, the card says so and
   offers the next step in the program, so a break feeds the program instead of replacing it.
   Quiet mode keeps sound off, so the buttons explain that instead of playing.
   The only thing kept is a count of breaks taken, in this browser's localStorage ('tol-bb-count'), and
   the last program page visited ('tol-bb-last'). Nothing is sent anywhere. */
(function () {
  'use strict';
  if (window.TOLBrainBreaks) return;
  var path = location.pathname.replace(/\/$/, '/index.html');
  var isHome = path === '/index.html' || path === '/';
  var TRACKS = [
    { id: 'star', title: 'Shooting Star', src: '/assets/audio/soundscapes/Shooting-Star.mp3', len: '3:27' },
    { id: 'watching', title: 'Watching a Shooting Star', src: '/assets/audio/soundscapes/Watching-a-Shooting-Star.mp3', len: '3:38' },
    { id: 'shimmer', title: 'Thunderous Shimmer', src: '/assets/audio/soundscapes/Thunderous-Shimmer.mp3', len: '2:51' }
  ];
  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  function esc(s) { var d = document.createElement('div'); d.textContent = s; return d.innerHTML; }
  function count() { return parseInt(lsGet('tol-bb-count') || '0', 10) || 0; }
  function mmss(s) { s = Math.max(0, Math.round(s)); return Math.floor(s / 60) + ':' + ('0' + (s % 60)).slice(-2); }

  var css = document.createElement('style');
  css.textContent =
    'html body section.bkb.bkb,html body main.read section.bkb.bkb{position:relative;overflow:hidden;box-sizing:border-box;margin:1.2rem 0;padding:1.2rem 1.3rem 1.1rem;border-radius:24px!important;color:#fff!important;background:linear-gradient(120deg,#1B1140,#48206E 55%,#A82F63)!important;border:0!important;box-shadow:0 14px 40px rgba(60,20,90,.35)!important;font-family:"Lora",Georgia,serif}' +
    'html:not(.tol-still) .bkb::before{content:"";position:absolute;inset:-40%;background:conic-gradient(from 0deg,rgba(255,200,120,.0),rgba(255,120,170,.28),rgba(120,200,255,.0),rgba(190,140,255,.28),rgba(255,200,120,0));animation:bb-spin 9s linear infinite;pointer-events:none}' +
    '@keyframes bb-spin{to{transform:rotate(360deg)}}' +
    '.bkb>*{position:relative}' +
    'html body section.bkb p.bb-kick,html body main.read section.bkb p.bb-kick{display:inline-block;margin:0 0 .35rem!important;padding:.12rem .65rem!important;border-radius:999px!important;background:#FFD66B!important;color:#3A1B52!important;font:700 .74rem/1.7 "IBM Plex Mono",monospace;letter-spacing:.08em}' +
    'html body section.bkb h2,html body main.read section.bkb h2{margin:0 0 .35rem;font:700 clamp(1.45rem,4.6vw,2.1rem)/1.1 "Fraunces",Georgia,serif;color:#fff!important;max-width:none;background:none!important;padding:0!important;border:0!important;box-shadow:none!important;text-wrap:balance}' +
    '.bkb h2 em{font-style:normal;color:#FFD66B}' +
    'html body section.bkb p,html body main.read section.bkb p{margin:.2rem 0 .7rem;max-width:none;color:#F1E8FF!important;font-size:1rem;line-height:1.5;background:none!important;padding:0!important;border:0!important;box-shadow:none!important}' +
    '.bkb a{color:#FFD66B}' +
    '.bb-bars{display:flex;align-items:flex-end;gap:5px;height:34px;margin:0 0 .5rem}' +
    '.bb-bars i{display:block;width:7px;border-radius:3px;background:linear-gradient(#FFD66B,#FF6FA3);height:30%}' +
    'html:not(.tol-still) .bkb.is-playing .bb-bars i{animation:bb-eq .7s ease-in-out infinite alternate}' +
    'html:not(.tol-still) .bkb:not(.is-playing) .bb-bars i{animation:bb-eq 1.6s ease-in-out infinite alternate}' +
    '.bb-bars i:nth-child(1){animation-delay:-.1s}.bb-bars i:nth-child(2){animation-delay:-.5s}.bb-bars i:nth-child(3){animation-delay:-.3s}.bb-bars i:nth-child(4){animation-delay:-.7s}.bb-bars i:nth-child(5){animation-delay:-.2s}.bb-bars i:nth-child(6){animation-delay:-.6s}.bb-bars i:nth-child(7){animation-delay:-.4s}' +
    '@keyframes bb-eq{from{height:18%}to{height:100%}}' +
    '.bb-ctl{display:flex;flex-wrap:wrap;gap:.5rem;margin:.3rem 0 .4rem}' +
    '.bkb button{font:600 1rem/1.2 "Lora",Georgia,serif;min-height:48px;padding:.55rem 1.1rem;border-radius:999px;border:2px solid #FFD66B;background:#FFD66B;color:#3A1B52;cursor:pointer}' +
    '.bkb button small{font-weight:500;opacity:.8;margin-left:.3rem}' +
    '.bkb button.bb-alt{background:transparent;color:#FFD66B}' +
    '.bkb button:hover{filter:brightness(1.08)}' +
    '.bkb button:focus-visible,.bkb a:focus-visible{outline:3px solid #fff;outline-offset:2px}' +
    '.bb-now,.bb-done{margin:.5rem 0 .2rem}' +
    '.bb-now[hidden],.bb-done[hidden],.bb-ctl[hidden]{display:none}' +
    '.bb-track{height:8px;border-radius:99px;background:rgba(255,255,255,.22);overflow:hidden;margin:.4rem 0}' +
    '.bb-track b{display:block;height:100%;width:0;background:linear-gradient(90deg,#FFD66B,#FF6FA3)}' +
    'html body section.bkb p.bb-meta,html body main.read section.bkb p.bb-meta{font-size:.9rem!important;color:#E4D6FA!important;margin:.5rem 0 0!important}' +
    '.bb-msg{min-height:1.3em}' +
    '.bb-end{margin:2rem 0 1rem}' +
    '@media (max-width:560px){html body section.bkb.bb-hero{padding:1rem 1rem .9rem!important;margin:.9rem 0!important}html body section.bkb.bb-hero h2{font-size:1.4rem!important}html body section.bkb.bb-hero p:not(.bb-kick):not(.bb-msg):not(.bb-meta){display:none}.bkb.bb-hero .bb-bars{height:22px;margin-bottom:.3rem}.bkb.bb-hero .bb-ctl button{min-height:44px;padding:.45rem .9rem;font-size:.95rem}}' +
    '@media (prefers-reduced-motion:reduce){.bkb::before{display:none}.bb-bars i{animation:none!important}}' +
    '@media print{.bkb{display:none!important}}';
  document.head.appendChild(css);

  // ---------- one player, shared by every card on the page ----------
  var aud = null, cards = [];
  function quietOn() { try { return !!(window.TOLQuiet && window.TOLQuiet.on()); } catch (e) { return false; } }
  function nextStep() {
    var n = document.querySelector('.tol-pager a.is-next');
    if (n) return { href: n.getAttribute('href'), text: n.querySelector('.tol-pager-title') ? n.querySelector('.tol-pager-title').textContent : 'Next' };
    return null;
  }
  function lastProgram() {
    try { var o = JSON.parse(lsGet('tol-bb-last') || 'null'); if (o && o.href && o.href !== path && o.title) return o; } catch (e) {}
    return null;
  }

  function Card(kind) {
    var el = document.createElement('section');
    el.className = 'bkb no-bubble ' + (kind === 'end' ? 'bb-end' : 'bb-hero');
    el.setAttribute('aria-labelledby', 'bb-h-' + kind);
    var n = count(), hook = n > 0
      ? 'Welcome back. Break number ' + (n + 1) + ' is waiting. You have taken ' + n + ' so far, counted on this device only.'
      : 'About three minutes. No sign-up, and nothing plays until you press a button.';
    var head = kind === 'end'
      ? '<p class="bb-kick">BRAIN BREAK</p><h2 id="bb-h-end">Finished a step? <em>Break your brain</em> for three minutes.</h2><p>Big instrumental music, then straight back to the program. Breaks work best when they are short and they end.</p>'
      : '<p class="bb-kick">NEW &middot; BRAIN BREAKERS</p><h2 id="bb-h-home">Come get your brain wrecked. <em>Broken in a good way.</em></h2><p>Big, bold instrumental music made for a three-minute break between program steps. One tap, then back to it.</p>';
    el.innerHTML =
      '<div class="bb-bars" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div>' + head +
      '<div class="bb-ctl">' +
        TRACKS.map(function (t) { return '<button type="button" data-t="' + t.id + '">&#9654; ' + esc(t.title) + ' <small>' + t.len + '</small></button>'; }).join('') +
        '<button type="button" class="bb-alt" data-t="random">Surprise me</button></div>' +
      '<div class="bb-now" hidden><p class="bb-line"></p><div class="bb-track" aria-hidden="true"><b></b></div><button type="button" class="bb-alt" data-stop="1">Stop the break</button></div>' +
      '<div class="bb-done" hidden></div>' +
      '<p class="bb-msg" role="status" aria-live="polite"></p>' +
      '<p class="bb-meta">' + esc(hook) + ' &middot; <a href="/soundscapes.html#finder">Find your sound</a> &middot; <a href="/soundscapes.html#brain-breakers">All Brain Breakers</a> &middot; <a href="/soundscapes.html#senses">See and feel</a></p>';
    var ctl = el.querySelector('.bb-ctl'), now = el.querySelector('.bb-now'), done = el.querySelector('.bb-done'), msg = el.querySelector('.bb-msg'),
        line = el.querySelector('.bb-line'), bar = el.querySelector('.bb-track b');
    var api = {
      el: el,
      reset: function () { el.classList.remove('is-playing'); now.hidden = true; done.hidden = true; ctl.hidden = false; msg.textContent = ''; },
      playing: function (t) { el.classList.add('is-playing'); ctl.hidden = true; done.hidden = true; now.hidden = false; msg.textContent = ''; line.textContent = 'Now playing: ' + t.title; bar.style.width = '0'; },
      tick: function (cur, dur) { if (dur) { bar.style.width = Math.min(100, cur / dur * 100) + '%'; line.textContent = 'Now playing: ' + api.title + ' · ' + mmss(dur - cur) + ' left. Eyes off the screen if you like.'; } },
      finished: function () {
        el.classList.remove('is-playing'); now.hidden = true; ctl.hidden = false;
        var ns = nextStep(), lp = lastProgram(), links = '';
        if (ns) links += '<a href="' + esc(ns.href) + '">Next in the program: ' + esc(ns.text) + ' &rarr;</a> ';
        else if (!isHome) links += '<a href="/start-in-10-minutes.html">Back to the program: Start in 10 minutes &rarr;</a> ';
        if (lp && !ns) links += '<a href="' + esc(lp.href) + '">Pick up where you were: ' + esc(lp.title) + ' &rarr;</a> ';
        if (isHome) links += '<a href="/start-in-10-minutes.html">Start in 10 minutes &rarr;</a> <a href="/share-the-load.html">Share the load &rarr;</a>';
        done.innerHTML = '<p><strong>Break over. Brain officially wrecked.</strong> That was break number ' + count() + '. Ready to go back in?</p><p>' + links + '</p>';
        done.hidden = false;
      },
      say: function (s) { msg.textContent = s; }
    };
    el.addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      if (b.hasAttribute('data-stop')) { stop(); return; }
      var id = b.getAttribute('data-t'); if (!id) return;
      play(api, id === 'random' ? TRACKS[Math.floor(Math.random() * TRACKS.length)] : TRACKS.filter(function (t) { return t.id === id; })[0]);
    });
    cards.push(api);
    return api;
  }

  function stop() {
    if (aud) { try { aud.pause(); } catch (e) {} }
    cards.forEach(function (c) { c.reset(); });
  }
  function play(card, t) {
    if (!t) return;
    if (quietOn()) { card.say('Quiet mode keeps sound off. Turn it off in Settings at the top, then press again.'); return; }
    cards.forEach(function (c) { if (c !== card) c.reset(); });
    if (!aud) {
      aud = new Audio(); aud.preload = 'none';
      aud.addEventListener('timeupdate', function () { if (aud.cur) aud.cur.tick(aud.currentTime, aud.duration); });
      aud.addEventListener('ended', function () { lsSet('tol-bb-count', String(count() + 1)); if (aud.cur) aud.cur.finished(); });
    }
    try { var pl = JSON.parse(lsGet('tol-sound-plays') || '{}') || {}; pl[t.id] = (pl[t.id] || 0) + 1; lsSet('tol-sound-plays', JSON.stringify(pl)); } catch (e) {} // feeds "Find your sound"
    aud.cur = card; card.title = t.title;
    aud.src = t.src; aud.currentTime = 0;
    var p = aud.play();
    if (p && p.catch) p.catch(function () { card.reset(); card.say('Your browser blocked the sound. Press the button again, or check that your volume is up.'); });
    card.playing(t);
  }
  document.addEventListener('tol-quiet', function () { if (quietOn()) stop(); });

  // ---------- where the cards go ----------
  function remember() {
    var h1 = document.querySelector('main h1'); if (!h1) return;
    lsSet('tol-bb-last', JSON.stringify({ href: path.replace(/-in-depth\.html$/, '.html'), title: h1.textContent.replace(/\s+/g, ' ').trim().slice(0, 80) }));
  }
  function mount() {
    var main = document.querySelector('main'); if (!main) return;
    if (isHome) {
      var intro = main.querySelector('[data-home-intro]'); if (!intro) return;
      // right inside the opening block, above the three start cards, so it is the first big thing anyone sees
      var c = Card('home'), at = intro.querySelector('.hh-go');
      if (at && at.previousElementSibling && at.previousElementSibling.tagName === 'H2') at = at.previousElementSibling;
      if (at) at.parentNode.insertBefore(c.el, at); else intro.parentNode.insertBefore(c.el, intro.nextSibling);
    } else {
      if (window.TOLSite && window.TOLSite.sensitive && window.TOLSite.sensitive()) return;
      if (main.hasAttribute('data-no-brain-break') || document.querySelector('.bb-end')) return;
      var e = Card('end'), pager = document.querySelector('.tol-pager');
      if (pager) pager.parentNode.insertBefore(e.el, pager); else main.appendChild(e.el);
      remember();
    }
  }
  window.TOLBrainBreaks = { stop: stop, audio: function () { return aud; } };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount); else mount();
})();
