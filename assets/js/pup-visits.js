/* pup-visits.js — Tidbit and Sugarfoot pop by now and then while you read.
   As you scroll a reading page, one pup (or both) runs in from the edge of the screen to a spot
   beside the section you're passing, sits, and says something in a small bubble: a tip that fits
   the section, a key point from it, or just some love. Then they do a cute little thing (a spin,
   a wag, a play bow, zoomies, a sniff, a sneeze, a paw wave, a high five or a hug) and run off.
   Now and then they also pop up just to say hi.

   Pacing (delightful, never annoying):
   - nothing in the first 10-14 seconds on a page; then at most one visit per 45-60 seconds of
     reading (time with the tab hidden doesn't count), 3 or 4 per page view, 12 per browser session,
     and the gap carries over when you move to the next page;
   - never while something else is up: the weather pill, the pal cam invitation, the join pop-up,
     the Breathe break, the menus, or any dialog. If one opens mid-visit, the pups wrap up at once;
   - the × on the bubble ("Shoo, pups") sends them off for the rest of this visit (sessionStorage).
   "Keep the page still" and the system's reduce-motion setting: the pups don't run or do tricks.
   They fade in sitting quietly beside the section, say their line, and fade out, at most twice a
   page. Nothing keeps moving: there's no animation loop at all in that mode.

   Where: reading pages (main.read) and the home page. Not the games, the Journey pages (they have the
   pal cam), the calm visualizer, the fill-in workpapers, the legal pages, ask, 404 or offline.
   Placement: pinned in the page margin beside the section (at the height it was when they came),
   never over the text, on wide screens; on narrow screens they float just above the bottom edge,
   above the Breathe button. Pinned to the screen, so the bubble stays readable while you scroll on.
   The pups are decorative (aria-hidden). The bubble is never announced (it sits at the end of the
   reading order, and the pup's name is hidden from screen readers); the
   bubble never takes focus; its link is a real link and its × a real 44px button.
   pups.js and the words (pup-visits-lines.js) load only when a visit is about to happen.
   Test hooks: ?pupvisit=1 (a visit comes quickly), ?pupvisit=fast (all pacing x0.1),
   &pupwho=tidbit|sugarfoot|both, &pupact=<trick>, &pupkind=hello|section.
   Nothing is sent anywhere. */
(function () {
  'use strict';
  if (window.TOLPupVisits) return;
  var D = document, H = D.documentElement, B = D.body;
  if (!B) return;
  var path = decodeURIComponent(location.pathname).replace(/\/$/, '/index.html').replace(/-in-depth\.html$/, '.html');
  var SKIP = /^\/(frequency-journey(-play)?|calm-visualizer|ask|404|offline|privacy-policy|refund-policy|terms-of-service)\.html$|^\/(legal|workpapers\/fill)\//;
  if (SKIP.test(path) || B.classList.contains('is-game') || B.hasAttribute('data-no-pupvisits') ||
      D.querySelector('meta[http-equiv="Content-Security-Policy"]')) return;
  var main = D.querySelector('main.read');
  if (!main) return;

  // ---------- settings ----------
  var q = location.search, M = /[?&]pupvisit=(\w+)/.exec(q), TEST = M ? M[1] : '';
  function qp(k) { var m = new RegExp('[?&]' + k + '=([\\w-]+)').exec(q); return m ? m[1] : ''; }
  var FAST = TEST === 'fast', QUICK = !!TEST && !FAST, SC = FAST ? 0.1 : 1;
  var START_GATE = QUICK ? 800 : (10000 + Math.random() * 4000) * SC;   // never in the first ~10 s
  var GAP_MIN = 45000 * SC, GAP_MAX = 60000 * SC;                        // one visit per 45-60 s of reading
  var HELLO_WAIT = qp('pupkind') === 'section' ? 1e12 : (QUICK ? 3000 : 20000 * SC);                          // eligible this long without a section: maybe a hello
  var SESS_CAP = 12, KEY = 'tol-pups-';
  var PAGE_CAP = 3 + (Math.random() < 0.5 ? 1 : 0);
  var P_SECTION = TEST ? 1 : 0.6;                                        // not every section, just now and then

  function ssGet(k) { try { return sessionStorage.getItem(KEY + k); } catch (e) { return null; } }
  function ssSet(k, v) { try { sessionStorage.setItem(KEY + k, v); } catch (e) { /* private mode: fine */ } }
  var shooed = ssGet('shoo') === '1';

  // motion: the system setting, or the site's own "Keep the page still"
  var mq = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
  function calmNow() { return !!((mq && mq.matches) || (window.TOLStill && window.TOLStill.on()) || H.classList.contains('tol-still')); }

  // ---------- small maths ----------
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function mix(a, b, p) { return a + (b - a) * p; }
  function eio(p) { p = clamp(p, 0, 1); return p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2; }
  function eout(p) { p = clamp(p, 0, 1); return 1 - (1 - p) * (1 - p); }
  function ein(p) { p = clamp(p, 0, 1); return p * p; }
  function sgn(v) { return v < 0 ? -1 : 1; }
  function rnd(a, b) { return a + Math.random() * (b - a); }
  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
  function wpick(list) { var s = 0, i; for (i = 0; i < list.length; i++) s += list[i][1]; var r = Math.random() * s; for (i = 0; i < list.length; i++) { r -= list[i][1]; if (r <= 0) return list[i][0]; } return list[0][0]; }

  // ---------- styles (injected, so there's nothing to fetch) ----------
  var CSS =
    '.tpv{position:absolute;z-index:860;pointer-events:none;opacity:1;transition:opacity .45s ease}' +
    '.tpv.is-fixed{position:fixed}' +
    '.tpv.is-fade{opacity:0}' +
    '.tpv canvas{position:absolute;left:0;top:0;display:block;pointer-events:none}' +
    '.tpv-bub{position:absolute;box-sizing:border-box;pointer-events:auto;margin:0;padding:.55rem 2.9rem .6rem .8rem;border-radius:18px;' +
      'background:#FFFDF8;border:2px solid #EBCFDB;box-shadow:0 8px 24px rgba(60,40,90,.16);color:#3C3350;' +
      'font:500 15px/1.45 Lora,Georgia,serif;text-align:left;opacity:0;transform:translateY(6px) scale(.97);transform-origin:var(--tx,50%) 100%;' +
      'transition:opacity .28s ease,transform .38s cubic-bezier(.2,1.3,.4,1);overflow-wrap:break-word}' +
    '.tpv-bub.is-in{opacity:1;transform:none}' +
    '.tpv-bub[data-who=sugarfoot]{border-color:#D6CCEF}' +
    '.tpv-bub::after{content:"";position:absolute;left:var(--tx,50%);bottom:-9px;width:14px;height:14px;margin-left:-7px;background:#FFFDF8;' +
      'border-right:2px solid #EBCFDB;border-bottom:2px solid #EBCFDB;transform:rotate(45deg)}' +
    '.tpv-bub[data-who=sugarfoot]::after{border-color:#D6CCEF}' +
    '.tpv-name{display:inline-block;margin:0 .35rem .1rem 0;padding:0 .45rem;border-radius:999px;font:700 14px/1.5 Lora,Georgia,serif;background:#FCE4C8;color:#5E3410}' +
    '.tpv-bub[data-who=sugarfoot] .tpv-name{background:#E7E0F7;color:#3F3470}' +
    '.tpv-bub a{color:#6A2E86;font-weight:600;text-decoration:underline;text-underline-offset:2px;white-space:normal}' +
    '.tpv-bub a:hover{color:#4B1F63}' +
    '.tpv-bub a:focus-visible,.tpv-x:focus-visible{outline:2px solid #6A2E86;outline-offset:2px}' +
    '.tpv-x{position:absolute;top:0;right:0;width:44px;height:44px;margin:0;padding:0;border:0;border-radius:50%;background:transparent;' +
      'color:#5A4E66;font:400 24px/44px Georgia,serif;cursor:pointer;text-align:center}' +
    '.tpv-x span{display:inline-block;width:28px;height:28px;line-height:27px;border-radius:50%;background:#F4ECF3}' +
    '.tpv-x:hover span{background:#EADCEB;color:#3C3350}' +
    '.tpv-sr{position:absolute!important;width:1px;height:1px;margin:-1px;padding:0;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}' +
    '@media (prefers-reduced-motion:reduce){.tpv-bub{transform:none;transition:opacity .4s ease}}' +
    'html.tol-still .tpv-bub{transform:none;transition:opacity .4s ease}' +
    '@media print{.tpv{display:none!important}}' +
    '@media (forced-colors:active){.tpv-bub{border:1px solid CanvasText}.tpv-x span{border:1px solid ButtonText}}';
  var styled = false;
  function addStyle() { if (styled) return; styled = true; var s = D.createElement('style'); s.id = 'tpv-style'; s.textContent = CSS; D.head.appendChild(s); }

  // ---------- lazy loading (only when a visit is about to happen) ----------
  var ready = null;
  function load(src) { return new Promise(function (ok, no) { var s = D.createElement('script'); s.src = src; s.onload = ok; s.onerror = no; D.head.appendChild(s); }); }
  function loadAll() {
    if (!ready) {
      ready = Promise.all([
        window.TOLPups ? null : load('/assets/js/pups.js'),
        window.TOL_PUP_LINES ? null : load('/assets/js/pup-visits-lines.js')
      ]).then(function () { if (!window.TOLPups || !window.TOL_PUP_LINES) throw new Error('pups'); });
      ready.catch(function () { ready = null; });
    }
    return ready;
  }

  // ---------- what else is on screen ----------
  var BUSY = '.tol-wx, .pci, .tol-join-pop, .tol-install, .tol-breathe, [role="dialog"], dialog[open], [aria-modal="true"], #tol-panel, .tol-drop, .tol-dive-card, .tr-card';
  function shown(n) {
    if (n.hidden || !n.getClientRects().length) return false;
    var cs = getComputedStyle(n); return cs.visibility !== 'hidden' && cs.display !== 'none' && parseFloat(cs.opacity || '1') > 0.05;
  }
  function busy() {
    if (D.hidden) return true;
    if (D.querySelector('.tol-bar [aria-expanded="true"]')) return true;
    // typing, a video or episode playing, the pal cam open, or a tender page (site.js decides)
    if (window.TOLSite && (window.TOLSite.busy() || (window.TOLSite.sensitive && window.TOLSite.sensitive()))) return true;
    var list = D.querySelectorAll(BUSY);
    for (var i = 0; i < list.length; i++) if (!list[i].closest('.tpv') && shown(list[i])) return true;
    return false;
  }

  // ---------- pacing ----------
  var readMs = 0, lastTick = Date.now(), nextAt = START_GATE, eligibleSince = -1, pageCount = 0, active = null;
  var sessN = parseInt(ssGet('n') || '0', 10) || 0;
  if (!TEST) { // the gap carries over from the last page
    var lastStart = parseInt(ssGet('last') || '0', 10) || 0, since = Date.now() - lastStart;
    if (lastStart && since < GAP_MIN) nextAt = Math.max(nextAt, GAP_MIN - since);
  }
  function cap() { return calmNow() ? Math.min(2, PAGE_CAP) : PAGE_CAP; }
  function canVisit() {
    return !active && !shooed && pageCount < cap() && (TEST || sessN < SESS_CAP) && readMs >= nextAt;
  }
  setInterval(function () {
    var now = Date.now(), dt = Math.min(now - lastTick, 2000); lastTick = now;
    if (D.hidden) return;
    readMs += dt;
    if (!canVisit() || busy()) { eligibleSince = -1; return; }
    if (eligibleSince < 0) eligibleSince = readMs;
    checkSections();
    if (!active && readMs - eligibleSince >= HELLO_WAIT && (TEST || Math.random() < 0.09)) begin({ kind: 'hello' });
  }, 500);

  // ---------- sections ----------
  var used = typeof WeakSet === 'function' ? new WeakSet() : null, usedList = [];
  function isUsed(h) { return used ? used.has(h) : usedList.indexOf(h) !== -1; }
  function markUsed(h) { if (used) used.add(h); else usedList.push(h); }
  function headings() {
    var hs = Array.prototype.slice.call(main.querySelectorAll('h2'));
    if (hs.length < 2) hs = hs.concat(Array.prototype.slice.call(main.querySelectorAll('h3')));
    return hs.filter(function (h) { return !h.closest('.tol-tip, .tol-cheer, .tol-gate, [class*="join"], form, nav, dialog, [role="dialog"], [hidden], .tpv, details:not([open])') &&
        !/newsletter|sign up|your email|join (our|free)|free while/i.test(h.textContent || ''); });
  }
  var scrollQueued = false;
  window.addEventListener('scroll', function () {
    if (scrollQueued) return; scrollQueued = true;
    requestAnimationFrame(function () { scrollQueued = false; if (canVisit() && !busy()) checkSections(); });
  }, { passive: true });
  function checkSections() {
    if (active || qp('pupkind') === 'hello') return;
    var vh = window.innerHeight, hs = headings();
    for (var i = 0; i < hs.length; i++) {
      var h = hs[i]; if (isUsed(h)) continue;
      var r = h.getBoundingClientRect(); if (!r.height) continue;
      if (r.top > vh * 0.12 && r.top < vh * 0.6) {
        markUsed(h);
        if (Math.random() < P_SECTION) begin({ kind: 'section', heading: h });
        return;
      }
    }
  }

  // ---------- words ----------
  var BAD = /crisis|abuse|suicid|emergenc|hotline|\b988\b|self-harm|analytics|telemetry|tracking/i;
  var TIP_TOPICS = { self: ['calm', 'body', 'mind', 'selftalk', 'rest', 'sleep'], relationships: ['connection', 'talking', 'family', 'friends', 'kindness'],
    book: ['connection', 'talking', 'home', 'kindness'], workpapers: ['home', 'talking', 'work', 'connection'], program: ['home', 'talking', 'work'],
    tools: ['focus', 'calm', 'talking', 'mind'], media: ['rest', 'calm', 'outdoors', 'sleep'] };
  var seen = (ssGet('seen') || '').split('|').filter(Boolean);
  function norm(line) {
    var o = typeof line === 'string' ? { text: line } : { text: line[0], href: line[1], label: line[2] };
    if (o.href) {
      var hp = o.href.split('#')[0].replace(/-in-depth\.html$/, '.html');
      if (hp === path) return null;                               // never link to the page you're on
    }
    return BAD.test(o.text + ' ' + (o.label || '')) ? null : o;
  }
  function keyOf(o) { var s = o.text, h = 0; for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 1000003; return String(h); }
  function choose(pool) {
    var list = (pool || []).map(norm).filter(Boolean); if (!list.length) return null;
    var fresh = list.filter(function (o) { return seen.indexOf(keyOf(o)) === -1; });
    return pick(fresh.length ? fresh : list);
  }
  function remember(o) { if (!o) return; seen.push(keyOf(o)); if (seen.length > 60) seen = seen.slice(-60); ssSet('seen', seen.join('|')); }
  function tipFromSite(sec) {
    return new Promise(function (ok) {
      if (!window.TOLTips) return ok(null);
      var done = false, to = setTimeout(function () { done = true; ok(null); }, 1500);
      try { window.TOLTips.get(TIP_TOPICS[sec] || null, function (t) { if (done) return; clearTimeout(to); done = true; ok(t && t[0] ? t[0] + ' ' + t[1] : null); }); }
      catch (e) { clearTimeout(to); ok(null); }
    });
  }
  function sectionText(h) {
    var t = (h.textContent || '').replace(/\s+/g, ' ').trim(), n = h.nextElementSibling, extra = '';
    for (var k = 0; n && k < 2; k++, n = n.nextElementSibling) extra += ' ' + (n.textContent || '').slice(0, 220);
    return { head: t, all: t + ' ' + extra };
  }
  // one line for one pup; returns a promise of {text, href, label}
  function lineFor(who, kind, ctx) {
    var W = window.TOL_PUP_LINES, sec = B.getAttribute('data-sec') || '', o = null;
    if (kind === 'hello') return Promise.resolve(choose(Math.random() < 0.55 ? W.hi[who] : W.love[who]));
    if (kind === 'love') return Promise.resolve(choose(W.love[who]));
    // a section line: a key point, "this part is…", a section tip, a site tip, or love
    var keyPool = null, st = ctx && ctx.text;
    if (st) {
      var matches = W.keys.filter(function (k) { try { return new RegExp(k[0], 'i').test(st.head); } catch (e) { return false; } });
      if (!matches.length) matches = W.keys.filter(function (k) { try { return new RegExp(k[0], 'i').test(st.all); } catch (e) { return false; } });
      if (matches.length) keyPool = matches[0][1].concat(matches.length > 1 && Math.random() < 0.35 ? matches[1][1] : []);
    }
    var cheer = window.TOL_CHEER && window.TOL_CHEER.topics && window.TOL_CHEER.topics[sec];
    var h = st && st.head.replace(/[.:!?]+$/, '');
    var opts = [];
    if (keyPool) opts.push(['key', 4]);
    if (h && h.length <= 60 && h.length >= 4) opts.push(['about', 1.6]);
    if (W.sec[sec]) opts.push(['sec', 2.2]);
    if (cheer) opts.push(['cheer', 1]);
    if (window.TOLTips) opts.push(['site', 1.3]);
    opts.push(['tips', 1.2]); opts.push(['love', 1]);
    var kindPick = wpick(opts);
    if (kindPick === 'key') o = choose(keyPool);
    else if (kindPick === 'about') { var tpl = pick(W.about[who]); o = { text: tpl.replace('{h}', h) }; }
    else if (kindPick === 'sec') o = choose(W.sec[sec]);
    else if (kindPick === 'cheer') o = choose(cheer);
    else if (kindPick === 'tips') o = choose(W.tips);
    else if (kindPick === 'site') {
      return tipFromSite(sec).then(function (t) {
        if (t && t.length < 190 && !BAD.test(t)) return { text: pick(W.lead[who]).replace('{tip}', t) };
        return choose(W.tips);
      });
    }
    return Promise.resolve(o || choose(W.love[who]));
  }

  // ---------- who they are ----------
  var PER = {
    tidbit: { name: 'Tidbit', look: 'collar', speed: 0.46, wagRate: 0.0135, amp: 0.55, blink: [2200, 4200], blinkDur: 110, breathe: 380, tiltEvery: [1800, 3400], tiltAmp: 0.22, tiltDur: 600 },
    sugarfoot: { name: 'Sugarfoot', look: 'drop', speed: 0.32, wagRate: 0.0078, amp: 0.4, blink: [3600, 6200], blinkDur: 230, breathe: 560, tiltEvery: [4200, 6800], tiltAmp: 0.13, tiltDur: 1400 }
  };
  var SOLO = {
    tidbit: [['spin', 3], ['zoomies', 3], ['sniff', 2], ['sneeze', 2], ['wave', 2], ['wag', 1.5], ['heart', 1]],
    sugarfoot: [['wag', 3], ['bow', 3], ['wave', 2], ['heart', 2.5], ['sniff', 1], ['spin', 1], ['sneeze', 1]]
  };
  var PAIR = [['highfive', 3], ['hug', 3], ['chase', 2], ['bowplay', 2], ['spin2', 1.5], ['goldheart', 2]];

  // ---------- one visit ----------
  function begin(opts) {
    if (active || shooed) return;
    var who = qp('pupwho') || (opts.who) || wpick([['tidbit', 35], ['sugarfoot', 30], ['both', 35]]);
    active = { pending: true };
    pageCount++; sessN++; ssSet('n', String(sessN)); ssSet('last', String(Date.now()));
    nextAt = readMs + rnd(GAP_MIN, GAP_MAX); eligibleSince = -1;
    loadAll().then(function () {
      var ctx = opts.heading ? { text: sectionText(opts.heading) } : null;
      var speakers = who === 'both' ? (Math.random() < 0.65 ? ['tidbit', 'sugarfoot'] : ['sugarfoot', 'tidbit']) : [who];
      var W = window.TOL_PUP_LINES, lines;
      if (who === 'both' && (opts.kind === 'hello' ? Math.random() < 0.5 : Math.random() < 0.2)) {
        var duet = choose(W.duets.map(function (d) { return d[0]; })), dd = null;
        W.duets.forEach(function (d) { if (duet && d[0] === duet.text) dd = d; });
        speakers = ['tidbit', 'sugarfoot'];
        lines = Promise.resolve([norm(dd[0]), norm(dd[1])]);
      } else {
        lines = Promise.all(speakers.map(function (s, i) {
          // in a pair, the second pup mostly answers with love, sometimes with a second tip
          var kind = opts.kind === 'hello' ? 'hello' : (i === 1 && Math.random() < 0.6 ? 'love' : 'section');
          return lineFor(s, kind, ctx);
        }));
      }
      return lines.then(function (ls) {
        if (shooed || busy()) { active = null; return; }
        ls.forEach(remember);
        run({ kind: opts.kind, heading: opts.heading, who: who, speakers: speakers, lines: ls });
      });
    }).catch(function () { active = null; });
  }

  var DPR = Math.min(2, window.devicePixelRatio || 1);
  var live = null;
  function say(text) {
    // decorative: nothing is announced, so a screen reader is never interrupted mid-page by a pup
    // with a made-up name. The bubble sits at the very end of the page's reading order instead.
    return text;
  }

  function run(plan) {
    addStyle();
    var P = window.TOLPups, calm = calmNow(), vw = H.clientWidth, vh = window.innerHeight;
    var mr = main.getBoundingClientRect(), leftM = mr.left, rightM = vw - mr.right;
    var margin = Math.max(leftM, rightM) >= 190 && vw >= 900;
    var sc = margin ? 1.25 : 1.0, CH = Math.round(118 * sc), GY = CH - 12;
    var side, stageX, W;
    var stage = D.createElement('div'); stage.className = 'tpv'; stage.setAttribute('data-who', plan.who);
    var cv = D.createElement('canvas'); cv.setAttribute('aria-hidden', 'true'); stage.appendChild(cv);
    var g = cv.getContext('2d');
    var groundVY;
    if (margin) {
      var breathe = D.querySelector('.tol-breathe-btn');
      var br = breathe && shown(breathe) ? breathe.getBoundingClientRect() : null;
      side = leftM >= 190 && rightM >= 190 ? (Math.random() < 0.5 ? 'left' : 'right') : (leftM >= rightM ? 'left' : 'right');
      if (side === 'left') { stageX = 0; W = Math.floor(leftM - 10); }
      else { stageX = Math.ceil(mr.right + 10); W = vw - stageX; }
      var want = plan.heading ? plan.heading.getBoundingClientRect().top + 90 : vh * rnd(0.55, 0.7);
      var hi = vh - 24; if (side === 'right' && br) hi = Math.min(hi, br.top - 12);
      groundVY = clamp(want, Math.min(hi, 72 + 150 + 62 * sc + 12), hi);
    } else {
      side = Math.random() < 0.5 ? 'left' : 'right'; stageX = 0; W = vw;
    }
    cv.width = Math.round(W * DPR); cv.height = Math.round(CH * DPR); cv.style.width = W + 'px'; cv.style.height = CH + 'px';
    stage.style.width = W + 'px'; stage.style.height = CH + 'px';
    stage.classList.add('is-fixed');                            // pinned to the screen, so the bubble stays readable while the page scrolls on
    stage.style.left = stageX + 'px';
    if (margin) stage.style.top = (groundVY - GY) + 'px';
    else {
      var bb = D.querySelector('.tol-breathe-btn'), bottom = 10;
      if (bb && shown(bb)) bottom = Math.max(bottom, vh - bb.getBoundingClientRect().top + 6);
      stage.style.bottom = bottom + 'px';
    }
    B.appendChild(stage);
    function X(x) { return side === 'left' ? x : W - x; }       // local x (0 = the outer edge) to canvas x
    var fsign = side === 'left' ? 1 : -1;                       // local "toward the content" to canvas direction

    // where they sit (local x), nearer the content in the margin, a little way in on phones
    var edge = margin ? W - 44 * sc : Math.min(W * 0.42, 176);
    var pups = [], names = plan.who === 'both' ? (Math.random() < 0.5 ? ['tidbit', 'sugarfoot'] : ['sugarfoot', 'tidbit']) : [plan.who];
    names.forEach(function (id, i) {
      var per = PER[id], tx = edge - i * 62 * sc;
      pups.push({ id: id, per: per, L: P.looks[per.look], x: -70 * sc, tx: tx, face: 1, fd: 1, pose: 'run', popT: -1e9,
        ph: 0, wph: Math.random() * 6, wagS: 1, lift: 0, rot: 0, sx: 1, sy: 1, tilt: 0, raise: 0, wave: 0, lastX: -70 * sc,
        blinkAt: rnd(600, 2000), blinkEnd: 0, tiltAt: rnd(1200, 2600), mv: null, arrived: false, off: false });
    });
    var byId = {}; pups.forEach(function (p) { byId[p.id] = p; });
    // the quick one sets off first
    var order = pups.slice().sort(function (a, b) { return a.id === 'tidbit' ? -1 : b.id === 'tidbit' ? 1 : 0; });
    order.forEach(function (p, i) {
      var dist = p.tx - p.x, dur = Math.max(650, dist / p.per.speed);
      p.mv = { x0: p.x, x1: p.tx, t0: 60 + i * rnd(200, 360), dur: dur, ease: eout, done: function () { p.arrived = true; } };
    });

    var clock = 0, raf = 0, last = 0, timer = 0, phase = 'in', parts = [], act = null, actPlayed = false;
    var bub = null, bubIdx = -1, bubAcc = 0, bubDur = 0, hover = false, frames = [];
    var V = active = { stage: stage, hurry: hurry, plan: plan, calm: calm, get phase() { return phase; }, get act() { return act && act.name; }, frames: frames, side: side, margin: margin };

    // ---------- the bubble ----------
    function showBubble(i) {
      if (bub) { bub.remove(); bub = null; }
      var who = plan.speakers[i], line = plan.lines[i], p = byId[who] || pups[0];
      if (!line) { bubIdx = i; bubAcc = 0; bubDur = 0; return; }
      bub = D.createElement('div'); bub.className = 'tpv-bub'; bub.setAttribute('data-who', who);
      var tx = D.createElement('p'); tx.style.margin = '0';
      var nm = D.createElement('span'); nm.className = 'tpv-name'; nm.setAttribute('aria-hidden', 'true'); nm.textContent = PER[who].name; tx.appendChild(nm);
      tx.appendChild(D.createTextNode(line.text));
      if (line.href) { tx.appendChild(D.createTextNode(' ')); var a = D.createElement('a'); a.href = line.href; a.textContent = line.label || 'Take a look'; tx.appendChild(a); }
      bub.appendChild(tx);
      var x = D.createElement('button'); x.type = 'button'; x.className = 'tpv-x';
      x.setAttribute('aria-label', 'Shoo, pups (for this visit)'); x.title = 'Shoo, pups (for this visit)';
      x.innerHTML = '<span aria-hidden="true">&times;</span>';
      x.addEventListener('click', shoo);
      bub.appendChild(x);
      bub.addEventListener('mouseenter', function () { hover = true; });
      bub.addEventListener('mouseleave', function () { hover = false; });
      bub.addEventListener('focusin', function () { hover = true; });
      bub.addEventListener('focusout', function () { hover = false; });
      bub.style.visibility = 'hidden';
      stage.appendChild(bub);
      var maxW = margin ? Math.min(310, W - 12) : Math.min(340, W - 32);
      bub.style.width = maxW + 'px';
      // shrink-wrap short lines
      bub.style.width = 'auto'; bub.style.maxWidth = maxW + 'px';
      var bw = Math.min(maxW, Math.max(170, bub.offsetWidth)); bub.style.width = bw + 'px';
      var bh = bub.offsetHeight, cx = X(p.tx + 16 * sc);
      var lo = margin ? 6 : 16, hiX = W - bw - (margin ? 6 : 16);
      var left = clamp(cx - bw / 2, lo, Math.max(lo, hiX));
      bub.style.left = left + 'px';
      bub.style.top = (GY - 64 * sc - 14 - bh) + 'px';
      bub.style.setProperty('--tx', clamp(cx - left, 22, bw - 22) + 'px');
      bub.style.visibility = '';
      void bub.offsetWidth; bub.classList.add('is-in');
      say(PER[who].name + ' says: ' + line.text + (line.href ? ' (' + (line.label || 'link') + ')' : ''));
      bubIdx = i; bubAcc = 0; hover = false;
      bubDur = clamp(2600 + line.text.length * 48, 4800, 10500) * (FAST ? 0.5 : 1);
      if (p) { p.face = 1; }
    }
    function hideBubble() {
      if (!bub) return; var b = bub; bub = null; b.classList.remove('is-in');
      setTimeout(function () { b.remove(); }, 320);
      if (live) live.textContent = '';
    }

    // ---------- tricks ----------
    // each is a pure function of its own clock p (0..1) and ms, writing overrides for each pup
    function startAct() {
      var name = qp('pupact');
      var list = pups.length > 1 ? PAIR : SOLO[pups[0].id];
      var names2 = list.map(function (x) { return x[0]; });
      if (names2.indexOf(name) === -1) {
        var lastAct = ssGet('act');
        var l2 = list.filter(function (x) { return x[0] !== lastAct; });
        name = wpick(l2.length ? l2 : list);
      }
      ssSet('act', name);
      var slow = pups.length === 1 && pups[0].id === 'sugarfoot' ? 1.25 : 1;
      var dur = { spin: 1150, zoomies: 2300, sniff: 1900, sneeze: 1600, wave: 1900, wag: 1700, heart: 1800, bow: 1800,
        highfive: 1700, hug: 2300, chase: 2600, bowplay: 1900, spin2: 1250, goldheart: 1900 }[name] * slow;
      act = { name: name, t0: clock, dur: dur, fired: {} };
      actPlayed = true;
    }
    function once(key) { if (act.fired[key]) return false; act.fired[key] = true; return true; }
    function headAt(p) { // canvas position of a pup's head, for hearts, sparkles and puffs
      var y = GY - p.lift - (p.pose === 'sit' ? 38 : 32) * sc, dir = p.fd * fsign;
      return { x: X(p.x) + dir * 24 * sc, y: y };
    }
    function spawn(k, x, y, o) { parts.push({ k: k, x: x, y: y, vx: (o && o.vx) || 0, vy: (o && o.vy != null) ? o.vy : -0.03, life: 0, ttl: (o && o.ttl) || 1200, s: (o && o.s) || 6, rot: rnd(-0.4, 0.4), col: o && o.col }); }
    function doAct(o) {
      var t = clock - act.t0, p = clamp(t / act.dur, 0, 1), A = pups[0], Bp = pups[1], i;
      switch (act.name) {
        case 'spin': case 'spin2':
          pups.forEach(function (d, j) { var oo = o[j], pp = clamp((t - j * 120) / (act.dur - 120), 0, 1);
            oo.faceHard = Math.cos(eio(pp) * Math.PI * 4); oo.pose = pp > 0 && pp < 1 ? 'run' : null; oo.ph = t / 45;
            oo.lift = Math.abs(Math.sin(pp * Math.PI * 4)) * 5 * sc; oo.wag = 2.4; });
          if (p > 0.55 && once('s')) pups.forEach(function (d) { var hp = headAt(d); spawn('star', hp.x, hp.y - 14 * sc, { vy: -0.04, ttl: 900 }); });
          break;
        case 'zoomies':
          (function () { var d = A, oo = o[0], k = (1 - Math.cos(p * Math.PI * 4)) / 2, amp = Math.min(80 * sc, d.tx - 20 * sc);
            oo.dx = -k * amp; oo.pose = 'run'; oo.face = Math.sin(p * Math.PI * 4) > 0 ? -1 : 1; oo.lift = Math.abs(Math.sin(t / 70)) * 3 * sc; oo.wag = 2.6;
            if (Math.floor(t / 180) !== d.zq) { d.zq = Math.floor(t / 180); spawn('dust', X(d.x + oo.dx), GY - 2, { vy: -0.01, ttl: 500, s: 3 }); } })();
          break;
        case 'chase':
          pups.forEach(function (d, j) { var oo = o[j], pp = clamp(p - j * 0.08, 0, 1), k = (1 - Math.cos(pp * Math.PI * 4)) / 2, amp = Math.min(70 * sc, pups[1].tx - 16 * sc);
            oo.dx = -k * amp; oo.pose = pp > 0 && pp < 1 ? 'run' : null; oo.face = Math.sin(pp * Math.PI * 4) > 0 ? -1 : 1; oo.lift = Math.abs(Math.sin(t / 75 + j)) * 3 * sc; oo.wag = 2.6; });
          break;
        case 'sniff':
          (function () { var oo = o[0], d = A; oo.pose = 'run'; oo.ph = 0; oo.dx = eio(p < 0.5 ? p * 2 : 2 - p * 2) * 10 * sc; oo.tilt = 0.32 * Math.sin(Math.min(1, p * 4) * Math.PI / 2) * (p > 0.85 ? (1 - p) / 0.15 : 1) + Math.sin(t / 55) * 0.05;
            if (p > 0.1 && p < 0.85 && Math.floor(t / 260) !== d.sq) { d.sq = Math.floor(t / 260); var hp = headAt(d); spawn('puff', hp.x + d.fd * fsign * 14 * sc, GY - 10 * sc, { vy: -0.02, ttl: 600, s: 2.4 }); } })();
          break;
        case 'sneeze':
          (function () { var oo = o[0], d = A;
            if (p < 0.45) { oo.tilt = -0.32 * eio(p / 0.45); oo.sy = 1 + 0.05 * eio(p / 0.45); }
            else if (p < 0.56) { oo.tilt = 0.28; oo.sy = 0.86; oo.sx = 1.08; oo.dx = -3 * sc; }
            else { var r = (p - 0.56) / 0.44; oo.tilt = 0.28 * (1 - eio(r)); oo.sy = 1 - 0.14 * (1 - eio(r)); oo.sx = 1 + 0.08 * (1 - eio(r)); oo.blink = r < 0.5; }
            if (p >= 0.46 && once('a')) { var hp = headAt(d); for (i = 0; i < 6; i++) spawn('puff', hp.x + d.fd * fsign * 12 * sc, hp.y + 6 * sc, { vx: d.fd * fsign * rnd(0.03, 0.09), vy: rnd(-0.05, 0.01), ttl: rnd(500, 800), s: rnd(2, 3.4) });
              spawn('word', hp.x + d.fd * fsign * 8 * sc, hp.y - 22 * sc, { vy: -0.02, ttl: 1000, s: 12 }); } })();
          break;
        case 'wave':
          (function () { var oo = o[0]; oo.pose = 'sit'; oo.raise = p < 0.2 ? eio(p / 0.2) : p > 0.82 ? 1 - eio((p - 0.82) / 0.18) : 1; oo.wave = Math.sin(t / 120) * 0.45; oo.wag = 1.8; oo.tilt = 0.08; })();
          break;
        case 'wag':
          (function () { var oo = o[0]; oo.pose = p > 0.08 && p < 0.92 ? 'wiggle' : 'sit'; oo.wag = A.id === 'tidbit' ? 3.2 : 2.3; oo.sy = 1 + Math.sin(t / 90) * 0.02; })();
          if (p > 0.3 && once('h')) { var hp = headAt(A); spawn('heart', hp.x, hp.y - 12 * sc, { ttl: 1300, s: 6 }); }
          break;
        case 'bow':
          (function () { var oo = o[0]; oo.pose = p > 0.1 && p < 0.85 ? 'bow' : 'sit'; oo.wag = 3; oo.dx = Math.sin(p * Math.PI * 3) * 3 * sc; })();
          if (p > 0.35 && once('b')) { var hp2 = headAt(A); spawn('star', hp2.x, hp2.y - 20 * sc, { ttl: 900, s: 6 }); }
          break;
        case 'heart': case 'goldheart':
          pups.forEach(function (d, j) { var oo = o[j], hop = clamp((p - 0.05 - j * 0.06) / 0.25, 0, 1); oo.pose = 'sit'; oo.lift = Math.sin(hop * Math.PI) * 9 * sc; oo.wag = 2; oo.tilt = act.name === 'goldheart' ? (j ? -0.12 : 0.12) * Math.sin(p * Math.PI) * (fsign * d.fd) : 0; });
          if (p > 0.22 && once('g')) {
            var hx = pups.length > 1 ? (X(pups[0].x) + X(pups[1].x)) / 2 : headAt(A).x, hy = GY - 72 * sc;
            spawn('gold', hx, hy, { vy: -0.018, ttl: 1500, s: 11 * sc });
            for (i = 0; i < 4; i++) spawn('spark', hx + rnd(-16, 16) * sc, hy + rnd(-10, 10) * sc, { vx: rnd(-0.03, 0.03), vy: rnd(-0.05, -0.01), ttl: rnd(600, 1000), s: 3 });
          }
          break;
        case 'highfive':
          (function () { // Tidbit goes up first, of course
            var t0 = byId.tidbit, s0 = byId.sugarfoot, toward = sgn(s0.x - t0.x);
            [t0, s0].forEach(function (d) { var oo = o[pups.indexOf(d)], lead = d === t0 ? 0 : 0.07, pp = clamp((p - 0.12 - lead) / 0.5, 0, 1), dir = d === t0 ? toward : -toward;
              oo.face = dir; oo.pose = 'run'; oo.ph = 0; oo.dx = dir * Math.sin(Math.min(1, p / 0.3) * Math.PI / 2) * (p > 0.8 ? 1 - (p - 0.8) / 0.2 : 1) * 12 * sc;
              oo.lift = Math.sin(pp * Math.PI) * 18 * sc; oo.raise = Math.sin(clamp(pp * 1.2, 0, 1) * Math.PI); oo.rot = -0.1 * Math.sin(pp * Math.PI); oo.wag = 2.6; });
            if (p > 0.44 && once('h5')) { var mx = (X(t0.x) + X(s0.x)) / 2, my = GY - 58 * sc; for (var k = 0; k < 6; k++) spawn('spark', mx, my, { vx: Math.cos(k) * 0.07, vy: Math.sin(k) * 0.07 - 0.02, ttl: 700, s: 3 }); spawn('star', mx, my - 6, { vy: -0.03, ttl: 900, s: 7 }); }
          })();
          break;
        case 'hug':
          (function () { // Sugarfoot, the best hugger, walks over
            var t0 = byId.tidbit, s0 = byId.sugarfoot, toward = sgn(t0.x - s0.x), gap = Math.abs(t0.x - s0.x), close = Math.max(0, gap - 36 * sc);
            var inn = eio(clamp(p / 0.3, 0, 1)), outp = eio(clamp((p - 0.78) / 0.22, 0, 1)), k = inn * (1 - outp);
            var os = o[pups.indexOf(s0)], ot = o[pups.indexOf(t0)];
            os.dx = toward * close * 0.75 * k; ot.dx = -toward * close * 0.25 * k;
            os.face = p < 0.85 ? toward : 1; ot.face = p > 0.12 && p < 0.85 ? -toward : 1;
            os.pose = p < 0.3 || p > 0.78 ? 'run' : 'sit'; ot.pose = 'sit';
            var lean = Math.sin(clamp((p - 0.28) / 0.5, 0, 1) * Math.PI);
            os.rot = 0.14 * lean; ot.rot = 0.1 * lean; os.tilt = 0.12 * lean; ot.tilt = 0.12 * lean; os.wag = 1.4; ot.wag = 2.4; os.blink = lean > 0.6; ot.blink = lean > 0.75;
            if (p > 0.4 && once('hh')) { var mx = (X(t0.x + ot.dx) + X(s0.x + os.dx)) / 2; for (var k2 = 0; k2 < 3; k2++) spawn('heart', mx + (k2 - 1) * 10 * sc, GY - 62 * sc, { vx: (k2 - 1) * 0.01, vy: -0.03, ttl: 1300 + k2 * 150, s: 5 + k2 }); }
          })();
          break;
        case 'bowplay':
          (function () { var toward = sgn(pups[0].x - pups[1].x);
            pups.forEach(function (d, j) { var oo = o[j], dir = j === 0 ? -toward : toward, pp = clamp((p - j * 0.08) / 0.84, 0, 1); oo.face = p < 0.9 ? dir : 1; oo.pose = pp > 0.1 && pp < 0.85 ? 'bow' : 'run'; if (oo.pose === 'run') oo.ph = 0; oo.wag = 3; oo.dx = Math.sin(pp * Math.PI * 3) * 3 * sc; }); })();
          if (p > 0.4 && once('bb')) { var mx2 = (X(pups[0].x) + X(pups[1].x)) / 2; spawn('star', mx2, GY - 46 * sc, { ttl: 900, s: 6 }); }
          break;
      }
      if (t >= act.dur) act = null;
    }

    // ---------- the frame ----------
    function ex(dt, tau) { return 1 - Math.exp(-dt / tau); }
    function step(dt) {
      clock += dt;
      var o = pups.map(function () { return { dx: 0, lift: 0, rot: 0, pose: null, face: null, faceHard: null, sx: 1, sy: 1, tilt: 0, wag: 1, raise: 0, wave: 0, ph: null, blink: null }; });
      if (act) doAct(o);
      pups.forEach(function (p, i) {
        var oo = o[i], per = p.per;
        if (p.mv) {
          var m = p.mv, qq = (clock - m.t0) / m.dur;
          if (qq >= 0) {
            p.x = mix(m.x0, m.x1, m.ease(qq)); p.face = sgn(m.x1 - m.x0);
            if (qq >= 1) { p.x = m.x1; p.mv = null; if (m.done) m.done(); }
          } else if (m.turnFirst) p.face = sgn(m.x1 - m.x0);
        }
        var x = p.x + oo.dx, moved = Math.abs(x - p.lastX); p.lastX = x;
        var pose = oo.pose || (p.mv && clock >= p.mv.t0 ? 'run' : p.mv ? (p.mv.stand ? 'run' : 'sit') : (p.arrived && !p.off ? 'sit' : 'run'));
        if (pose !== p.pose) { p.popT = clock; p.pose = pose; }
        if (oo.ph != null) p.ph = oo.ph;
        else if (pose === 'run' && moved > dt * 0.004) p.ph += moved * 0.2 / sc;
        else { var tg = Math.round(p.ph / Math.PI) * Math.PI; p.ph += (tg - p.ph) * ex(dt, 120); }
        if (oo.faceHard != null) p.fd = oo.faceHard;
        else p.fd += ((oo.face != null ? oo.face : p.face) - p.fd) * ex(dt, 70);
        // who they are, in how they fidget: quick curious head tilts for Tidbit, slow ones for Sugarfoot
        var idleTilt = 0;
        if (!act && p.arrived && !p.mv) {
          if (clock > p.tiltAt) { p.tiltT0 = clock; p.tiltDir = Math.random() < 0.5 ? -1 : 1; p.tiltAt = clock + rnd(per.tiltEvery[0], per.tiltEvery[1]); }
          if (p.tiltT0 != null) { var tq = (clock - p.tiltT0) / per.tiltDur; if (tq < 1) idleTilt = Math.sin(tq * Math.PI) * per.tiltAmp * p.tiltDir; }
        }
        var k = ex(dt, 40);
        p.lift += (oo.lift - p.lift) * k; p.rot += (oo.rot - p.rot) * k; p.tilt += (oo.tilt + idleTilt - p.tilt) * ex(dt, 60);
        p.sx += (oo.sx - p.sx) * ex(dt, 34); p.sy += (oo.sy - p.sy) * ex(dt, 34); p.raise += (oo.raise - p.raise) * ex(dt, 60); p.wave = oo.wave;
        p.wagS += (oo.wag - p.wagS) * ex(dt, 200); p.wph += dt * per.wagRate * p.wagS;
        if (clock > p.blinkAt) { p.blinkEnd = clock + per.blinkDur; p.blinkAt = clock + rnd(per.blink[0], per.blink[1]); }
        p.blink = oo.blink != null ? oo.blink : clock < p.blinkEnd;
        p.drawX = x;
      });
      // particles
      for (var j = parts.length - 1; j >= 0; j--) { var pt = parts[j]; pt.life += dt; if (pt.life >= pt.ttl) { parts.splice(j, 1); continue; } pt.x += pt.vx * dt; pt.y += pt.vy * dt; }
      script(dt);
    }

    // the visit's story: in, talk (with a trick), out
    function allArrived() { return pups.every(function (p) { return p.arrived; }); }
    function script(dt) {
      if (phase === 'in' && allArrived()) { phase = 'settle'; V.tSettle = clock; }
      if (phase === 'settle' && clock - V.tSettle > (calm ? 0 : 260)) { phase = 'talk'; showBubble(0); }
      if (phase === 'talk') {
        if (!hover) bubAcc += dt;
        var lastB = bubIdx === plan.speakers.length - 1;
        if (lastB && !actPlayed && !calm && bubAcc > Math.min(1500, bubDur * 0.3)) startAct();
        if (bubAcc >= bubDur && !act) {
          if (!lastB) { hideBubble(); phase = 'swap'; V.tSwap = clock; }
          else leave(1);
        }
      }
      if (phase === 'swap' && clock - V.tSwap > 360) { phase = 'talk'; showBubble(bubIdx + 1); }
      if (phase === 'out' && pups.every(function (p) { return p.off && !p.mv; }) && !parts.length) finish();
    }
    function leave(speed) {
      if (phase === 'out') return;
      phase = 'out'; hideBubble();
      if (calm) { stage.classList.add('is-fade'); setTimeout(finish, 480); return; }
      act = null;
      // the steady one heads off last
      var ord = pups.slice().sort(function (a, b) { return a.id === 'tidbit' ? -1 : b.id === 'tidbit' ? 1 : 0; });
      ord.forEach(function (p, i) {
        var dist = p.x + 80 * sc, dur = Math.max(600, dist / (p.per.speed * 1.1 * speed));
        p.off = true; p.face = -1;
        p.mv = { x0: p.x, x1: -80 * sc, t0: clock + (speed > 1 ? 80 : 240) + i * (speed > 1 ? 60 : 170), dur: dur, ease: ein, stand: true, turnFirst: true };
      });
    }
    function hurry() { if (phase !== 'out') leave(1.6); }

    // ---------- drawing ----------
    function drawRaise(p) {
      if (p.raise < 0.02) return;
      var L = p.L, lean = L.build === 'lean', BY = lean ? -21 : -18.5, LL = lean ? 15 : 12.5, sit = p.pose === 'sit';
      g.save(); g.translate(sit ? 14 : 13, sit ? -24 : BY + 2); g.rotate(-2.25 * p.raise + p.wave * p.raise);
      var up = LL * 0.5;
      g.fillStyle = L.legUp; g.beginPath(); if (g.roundRect) g.roundRect(-2.8, -2, 5.6, up + 3, 2.8); else g.rect(-2.8, -2, 5.6, up + 3); g.fill();
      g.fillStyle = L.legLow; g.beginPath(); if (g.roundRect) g.roundRect(-2.5, up, 5, LL - up, 2.5); else g.rect(-2.5, up, 5, LL - up); g.fill();
      g.fillStyle = L.paw; g.beginPath(); g.ellipse(1, LL, 3.9, 2.6, 0, 0, Math.PI * 2); g.fill();
      g.restore();
    }
    function drawPup(p) {
      var cx = X(p.drawX), y = GY - p.lift, f = p.fd * fsign, fa = Math.max(0.15, Math.abs(f)), fs = sgn(f);
      var pq = clamp((clock - p.popT) / 200, 0, 1), pop = Math.sin(pq * Math.PI) * 0.07;
      var shf = clamp(1 - p.lift / 90, 0.4, 1);
      g.fillStyle = 'rgba(40,30,60,' + (0.14 * shf).toFixed(3) + ')'; g.beginPath(); g.ellipse(cx, GY + 1, 19 * sc * shf, 3.4 * sc * shf, 0, 0, Math.PI * 2); g.fill();
      g.save(); g.translate(cx, y); g.scale(fs, 1);
      if (p.rot) { g.translate(0, -18 * sc); g.rotate(p.rot); g.translate(0, 18 * sc); }
      var br = p.pose === 'lie' || calm ? 0 : Math.sin(clock / p.per.breathe) * (p.id === 'tidbit' ? 0.012 : 0.018);
      g.scale(fa * sc * p.sx * (1 + pop * 0.6), sc * p.sy * (1 - pop) * (1 + br));
      P.draw(g, p.L, p.pose, p.ph, Math.sin(p.wph) * p.per.amp * (p.wagS > 1.6 ? 1.25 : 1), !!p.blink, clock, p.tilt);
      drawRaise(p);
      g.restore();
    }
    function heart(x, y, r, col) {
      g.fillStyle = col; g.beginPath(); g.moveTo(x, y + r * 0.9);
      g.bezierCurveTo(x - r * 1.6, y - r * 0.2, x - r * 0.7, y - r * 1.5, x, y - r * 0.5);
      g.bezierCurveTo(x + r * 0.7, y - r * 1.5, x + r * 1.6, y - r * 0.2, x, y + r * 0.9); g.fill();
    }
    function star(x, y, r, col, rot) {
      g.fillStyle = col; g.beginPath();
      for (var i = 0; i < 10; i++) { var a = rot - Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r; g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
      g.closePath(); g.fill();
    }
    function drawParts() {
      parts.forEach(function (pt) {
        var q2 = pt.life / pt.ttl, a = q2 < 0.15 ? q2 / 0.15 : 1 - Math.max(0, (q2 - 0.6) / 0.4), grow = Math.min(1, q2 / 0.2);
        g.save(); g.globalAlpha = clamp(a, 0, 1);
        if (pt.k === 'heart') heart(pt.x + Math.sin(pt.life / 180) * 3, pt.y, pt.s * (0.6 + 0.4 * grow), '#EE7F9E');
        else if (pt.k === 'gold') {
          var r = pt.s * (0.4 + 0.6 * Math.min(1, q2 / 0.25)) * (1 + Math.sin(pt.life / 120) * 0.04);
          g.globalAlpha *= 0.35; heart(pt.x, pt.y, r * 1.5, '#FBE7A1'); g.globalAlpha = clamp(a, 0, 1);
          heart(pt.x, pt.y, r, '#E9B93A'); heart(pt.x - r * 0.25, pt.y - r * 0.2, r * 0.42, '#F8DC7A');
        }
        else if (pt.k === 'star') star(pt.x, pt.y, pt.s * (0.6 + 0.4 * grow), '#F4C94A', pt.rot + pt.life / 400);
        else if (pt.k === 'spark') star(pt.x, pt.y, pt.s, '#F7D46A', pt.rot);
        else if (pt.k === 'puff' || pt.k === 'dust') { g.fillStyle = pt.k === 'dust' ? 'rgba(170,150,130,.55)' : 'rgba(235,235,245,.95)'; g.beginPath(); g.arc(pt.x, pt.y, pt.s * (0.6 + q2), 0, Math.PI * 2); g.fill();
          if (pt.k === 'puff') { g.strokeStyle = 'rgba(140,140,170,.5)'; g.lineWidth = 0.8; g.stroke(); } }
        else if (pt.k === 'word') { g.font = '700 ' + Math.round(13 * sc) + 'px Fraunces, Georgia, serif'; g.textAlign = 'center'; g.lineWidth = 3; g.strokeStyle = '#FFFDF8'; g.strokeText('achoo!', pt.x, pt.y); g.fillStyle = '#6B4F8A'; g.fillText('achoo!', pt.x, pt.y); }
        g.restore();
      });
    }
    function draw() {
      g.setTransform(DPR, 0, 0, DPR, 0, 0); g.clearRect(0, 0, W, CH);
      // the one further back is drawn first
      pups.slice().sort(function (a, b) { return a.x - b.x; }).forEach(function (p) { if (p.drawX > -60 * sc || !p.off) drawPup(p); });
      drawParts();
    }

    // ---------- the loop (only while the visit is on screen and the tab is visible) ----------
    function frame(now) {
      raf = 0;
      var dt = last ? now - last : 16; last = now;
      if (frames.length < 2000) frames.push(dt);
      dt = clamp(dt, 0, 50);                       // after a hiccup or a tab switch nothing jumps
      step(dt); if (!V.done) { draw(); watch(); }
      if (!V.done && !D.hidden) raf = requestAnimationFrame(frame);
    }
    var nextBusyCheck = 0;
    function watch() {
      if (phase === 'out') return;
      if (shooed) { hurry(); return; }
      if (clock < nextBusyCheck) return;              // a light look around, four times a second, not every frame
      nextBusyCheck = clock + 250;
      if (busy()) hurry();
    }
    function onVis() {
      if (V.done) return;
      if (D.hidden) { if (raf) cancelAnimationFrame(raf); raf = 0; }
      else if (!calm && !raf) { last = 0; raf = requestAnimationFrame(frame); }
    }
    D.addEventListener('visibilitychange', onVis);
    function onStill() { if (!V.done && !calm && calmNow()) { hideBubble(); stage.classList.add('is-fade'); phase = 'out'; setTimeout(finish, 480); } }
    D.addEventListener('tol-still', onStill);
    function onResize() { if (!V.done && Math.abs(H.clientWidth - vw) > 40) { hideBubble(); stage.classList.add('is-fade'); phase = 'out'; setTimeout(finish, 480); } }
    window.addEventListener('resize', onResize);

    function finish() {
      if (V.done) return; V.done = true;
      if (raf) cancelAnimationFrame(raf); raf = 0; clearInterval(timer);
      D.removeEventListener('visibilitychange', onVis); D.removeEventListener('tol-still', onStill); window.removeEventListener('resize', onResize);
      if (bub) { bub.remove(); bub = null; }
      if (live) live.textContent = '';
      stage.remove();
      stats.visits.push({ kind: plan.kind, who: plan.who, act: V.actName || null, calm: calm, side: side, margin: margin, frames: frames.slice() });
      if (active === V) active = null;
    }
    function shoo() {
      shooed = true; ssSet('shoo', '1'); stats.shooed = true;
      if (bub) { bub.remove(); bub = null; }
      if (live) live.textContent = '';
      if (calm) { stage.classList.add('is-fade'); phase = 'out'; setTimeout(finish, 480); } else leave(1.7);
    }
    V.shoo = shoo;
    var startAct0 = startAct; startAct = function () { startAct0(); V.actName = act.name; };

    if (calm) {
      // no running, no tricks, nothing that keeps moving: they fade in sitting beside the section
      pups.forEach(function (p) { p.x = p.lastX = p.drawX = p.tx; p.arrived = true; p.mv = null; p.pose = 'sit'; p.face = 1; p.fd = 1; p.popT = -1e9; p.blink = false; });
      stage.classList.add('is-fade');
      draw();
      if (pups.length > 1) { // one quiet heart of gold between them
        var hx = (X(pups[0].x) + X(pups[1].x)) / 2; g.save(); heart(hx, GY - 70 * sc, 8 * sc, '#E9B93A'); g.restore();
      }
      void stage.offsetWidth; stage.classList.remove('is-fade');
      phase = 'settle'; V.tSettle = 0;
      var lastT = Date.now();
      timer = setInterval(function () {
        var now = Date.now(), dt = Math.min(now - lastT, 300); lastT = now;
        if (D.hidden || V.done) return;
        if (phase !== 'out' && (busy() || shooed)) { leave(1); return; }
        clock += dt; script(dt);
      }, 200);
    } else {
      raf = requestAnimationFrame(frame);
    }
  }

  // ---------- for tests and other scripts ----------
  var stats = { visits: [] };
  window.TOLPupVisits = {
    visit: function (o) { o = o || {}; if (active) return false; begin({ kind: o.kind || (o.heading ? 'section' : 'hello'), heading: o.heading || null, who: o.who }); return true; },
    hurry: function () { if (active && active.hurry) active.hurry(); },
    shoo: function () { if (active && active.shoo) active.shoo(); else { shooed = true; ssSet('shoo', '1'); } },
    state: function () {
      return { readMs: readMs, nextAt: nextAt, pageCount: pageCount, pageCap: cap(), sessN: sessN, shooed: shooed, calm: calmNow(),
        active: active && !active.pending ? { phase: active.phase, act: active.actName || null, who: active.plan.who, kind: active.plan.kind, side: active.side, margin: active.margin, calm: active.calm } : active ? { phase: 'loading' } : null };
    },
    stats: stats
  };
})();
