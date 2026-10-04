/* sound-finder.js — "Find your sound" for /soundscapes.html (the Brain Breakers page).
   Three quick taps (what you need, how your body is, how you like sound) and it suggests one of the three
   Brain Breakers, with the reasons, and the other two to try. The matching uses Christian's own listening
   notes for each piece (Shooting Star: deep quieting; Thunderous Shimmer: curious alertness; Watching a
   Shooting Star: uplifting expansion). No quiz result is stored as a "type", and nothing is sent anywhere.
   For "you": a "go-to" you can save for each need, and a count of what you have played. Both stay in this
   browser's localStorage ('tol-sound-fav', 'tol-sound-plays'). */
(function () {
  'use strict';
  var page = document.getElementById('finder');
  if (!page && !document.getElementById('sn-stage')) return;
  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  function jget(k) { try { return JSON.parse(lsGet(k) || '{}') || {}; } catch (e) { return {}; } }
  function esc(s) { var d = document.createElement('div'); d.textContent = s; return d.innerHTML; }
  var RM = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  // e = energy (0 to 1), n = how many sudden moments (0 = none), tags = the needs it fits best
  var S = [
    { id: 'star', name: 'Shooting Star', m: 3.5, e: .15, n: .1, tags: ['quiet', 'anxious', 'sleep'],
      note: 'The softest, most floating one. Airy and low-energy.',
      why: { quiet: 'It strongly quiets mental noise and looping thoughts.', anxious: 'It lowers arousal: a slower heart rate and deeper, easier breathing.', sleep: 'A gentle way to wind down without fully shutting off.' } },
    { id: 'shimmer', name: 'Thunderous Shimmer', m: 2.9, e: .5, n: .8, tags: ['spark', 'curious'],
      note: 'The most textural and restless one. Shimmering moments and a thunderous low end.',
      why: { spark: 'Recovery that feels too passive with pure calm needs a little aliveness, and this gives it.', curious: 'Its shifting textures stimulate curiosity and mild alertness.' } },
    { id: 'watching', name: 'Watching a Shooting Star', m: 3.6, e: .6, n: .35, tags: ['stuck', 'walk', 'big'],
      note: 'The most expansive and cinematic one, with a journey-like arc.',
      why: { stuck: 'It builds a sense of expansion and forward motion that can lift a stuck or low mood.', walk: 'It keeps a relaxed baseline with a light current of energy, so it feels purposeful.', big: 'Full orchestral writing with math-rock drive: the biggest of the three.' } }
  ];
  var BYID = {}; S.forEach(function (x) { BYID[x.id] = x; });
  var NEEDS = [['quiet', 'Quiet my busy mind'], ['anxious', 'Calm anxious or restless energy'], ['sleep', 'Wind down before sleep'], ['spark', 'Recover, but I need a spark'], ['curious', 'Get curious and alert'], ['stuck', 'I feel stuck or low on energy'], ['walk', 'A walk or light planning'], ['big', 'Feel something big']];
  var BODY = [['', 'No idea'], ['fine', 'Fine'], ['tired', 'Tired'], ['wired', 'Wired or restless'], ['over', 'Anxious or overwhelmed']];
  var PREFS = [['steady', 'Nothing sudden'], ['soft', 'Soft and floaty'], ['big', 'Big and cinematic'], ['feelit', 'I want to feel the low end'], ['textured', 'Something textured and surprising'], ['short', 'Under three minutes']];
  var NEEDNAME = {}; NEEDS.forEach(function (n) { NEEDNAME[n[0]] = n[1]; });

  function bump(id) { var p = jget('tol-sound-plays'); p[id] = (p[id] || 0) + 1; lsSet('tol-sound-plays', JSON.stringify(p)); }
  function redrawAll() { instances.forEach(function (i) { i.draw(); }); }
  var instances = [];
  function mount(host, opts) {
    opts = opts || {}; var compact = !!opts.compact, uid = compact ? '-o' : '';
  var need = '', body = '', prefs = {};
  
    function score(x) {
      var sc = 0, why = [];
      if (x.tags.indexOf(need) >= 0) { sc += 6; if (x.why && x.why[need]) why.push(x.why[need]); }
      if (need === 'anxious' || need === 'sleep' || need === 'quiet') sc += (1 - x.e) * 2;
      if (need === 'stuck' || need === 'spark' || need === 'curious') sc += x.e * 1.5;
      if (body === 'over') { sc -= x.e * 5 + x.n * 2; if (x.e < .3) why.push('The gentlest of the three, which suits an overwhelmed body.'); }
      if (body === 'wired') { sc -= x.e * 2; if (x.e < .3) why.push('Low-energy and floating, to take the edge off.'); }
      if (body === 'tired') { sc += x.e * 1.5; if (x.id === 'watching') why.push('A light energetic current for a tired body, without feeling heavy.'); }
      if (prefs.steady) { sc -= x.n * 3; if (x.n <= .2) why.push('Smooth and steady, with nothing sudden.'); }
      if (prefs.soft) { sc -= x.e * 4; if (x.e <= .25) why.push('Soft and floaty.'); }
      if (prefs.big) { sc += (x.id === 'watching' ? 3 : x.e * 2); if (x.id === 'watching') why.push('Cinematic and expansive.'); }
      if (prefs.feelit) { sc += (x.id === 'shimmer' ? 3 : 0); if (x.id === 'shimmer') why.push('Has a thunderous low end you can feel.'); }
      if (prefs.textured) { sc += x.n * 3; if (x.n >= .7) why.push('Textured and unpredictable, with sudden shimmering moments.'); }
      if (prefs.short) { sc += x.m <= 3.1 ? 2.5 : 0; if (x.m <= 3.1) why.push('Under three minutes.'); }
      var plays = jget('tol-sound-plays')[x.id] || 0; sc += Math.min(1, plays * 0.25);
      return { x: x, sc: sc, why: why, plays: plays };
    }
    function rank() { return S.map(score).sort(function (a, b) { return b.sc - a.sc; }); }
  
    // ---------- the panel ----------
    function chips(group, list, cur, multi) {
      return list.map(function (it) {
        var on = multi ? !!prefs[it[0]] : cur === it[0];
        return '<button type="button" class="sf-c" data-g="' + group + '" data-v="' + it[0] + '" aria-pressed="' + on + '">' + esc(it[1]) + '</button>';
      }).join('');
    }
    function draw() {
      var fav = jget('tol-sound-fav'), plays = jget('tol-sound-plays'), keep = Object.keys(fav).filter(function (k) { return BYID[fav[k]]; });
      var top = Object.keys(plays).sort(function (a, b) { return plays[b] - plays[a]; })[0];
      var mine = '';
      if (keep.length || top) {
        mine = '<div class="sf-mine"><strong>Yours</strong>' +
          keep.map(function (k) { return '<span>For “' + esc(NEEDNAME[k] || k).toLowerCase() + '”: <button type="button" class="sf-link" data-play="' + fav[k] + '">' + esc(BYID[fav[k]].name) + '</button></span>'; }).join('') +
          (top && BYID[top] ? '<span>Played most: <button type="button" class="sf-link" data-play="' + top + '">' + esc(BYID[top].name) + '</button> (' + plays[top] + (plays[top] === 1 ? ' time' : ' times') + ')</span>' : '') + '</div>';
      }
      var res = '';
      if (need) {
        var r = rank(), pick = r[0], more = r.slice(1, 3), f = fav[need] === pick.x.id;
        var reasons = pick.why.filter(function (w) { return w !== '__over'; }).slice(0, 4);
        if (!reasons.length) reasons = [pick.x.note];
        var warn = body === 'over' && pick.x.e > .3 ? '<p class="sf-warn">Bigger sounds can feel like too much when you are overwhelmed. If you play it, start with the volume low. Shooting Star is the softest of the three.</p>' : '';
        var tail = '';
        res = '<div class="sf-pick"><p class="sf-k">Try this first</p><h3>' + esc(pick.x.name) + '</h3><p class="sf-note">' + esc(pick.x.note) + esc(tail) + '</p><ul>' +
          reasons.map(function (w) { return '<li>' + esc(w) + '</li>'; }).join('') + '</ul>' + warn +
          '<div class="sf-row"><button type="button" class="sf-play" data-play="' + pick.x.id + '">&#9654; Play it</button>' +
          '<button type="button" class="sf-b" data-fav="' + pick.x.id + '" aria-pressed="' + f + '">' + (f ? 'Saved as my go-to' : 'Save as my go-to for “' + esc(NEEDNAME[need]).toLowerCase() + '”') + '</button></div>' +
          (pick.plays ? '<p class="sf-small">You have played this ' + pick.plays + (pick.plays === 1 ? ' time' : ' times') + '.</p>' : '') + '</div>' +
          '<div class="sf-more"><p class="sf-k">Also worth a try</p>' + more.map(function (m) { return '<div class="sf-alt"><div><strong>' + esc(m.x.name) + '</strong><span>' + esc(m.x.note) + '</span></div><button type="button" class="sf-b" data-play="' + m.x.id + '">&#9654; Play</button></div>'; }).join('') + '</div>';
      } else res = '<p class="sf-hint">Tap what you need above and a suggestion appears here.</p>';
      host.querySelector('.sf-out').innerHTML = mine + res;
      host.querySelectorAll('[data-g="need"]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-v') === need)); });
      plain();
    }
    // the site gives loose text a soft bubble; inside this panel the panel itself is the card
    function plain() { host.querySelectorAll('p, h2, h3, ul, li').forEach(function (n) { n.classList.add('no-bubble'); }); }
    host.innerHTML =
      (compact ? '<p class="sf-k sf-ovl-k">Undecided? Find what is right for you</p>' : '<h2 id="finder-h' + uid + '" class="live-h">Find your Brain Breaker</h2>' +
      '<p class="live-lede">Not sure which of the three to press? Three quick taps. It suggests one and tells you why. Nothing is saved unless you choose to save a go-to, and that stays on your device.</p>') +
      '<div class="sf-q" role="group" aria-labelledby="sf-q1' + uid + '"><p class="sf-ql" id="sf-q1' + uid + '">1. What do you need right now?</p><div class="sf-chips">' + chips('need', NEEDS, need) + '</div></div>' +
      '<div class="sf-q" role="group" aria-labelledby="sf-q2' + uid + '"><p class="sf-ql" id="sf-q2' + uid + '">2. How is your body? <span>(optional)</span></p><div class="sf-chips">' + chips('body', BODY, body) + '</div></div>' +
      '<div class="sf-q" role="group" aria-labelledby="sf-q3' + uid + '"><p class="sf-ql" id="sf-q3' + uid + '">3. How do you like sound? <span>(pick any)</span></p><div class="sf-chips">' + chips('pref', PREFS, null, true) + '</div></div>' +
      '<div class="sf-out" role="region" aria-live="polite" aria-label="Your suggestion"></div>' +
      '<p class="sf-small">The matching follows Christian\u2019s listening notes for each track. This is a starting point, not a prescription, and your own ears win.</p>';
  
    // ---------- playing ----------
    function say(msg) { var o = host.querySelector('.sf-out'); var p = o.querySelector('.sf-live'); if (!p) { p = document.createElement('p'); p.className = 'sf-live sf-small'; o.appendChild(p); } p.textContent = msg; }
    function playSound(id) {
      var x = BYID[id]; if (!x) return;
      {
        var cards = document.querySelectorAll('.track-card'), hit = null;
        cards.forEach(function (c) { var t = c.querySelector('.track-title'); if (t && t.textContent.replace(/^\d+\.\s*/, '') === x.name) hit = c; });
        if (!hit) return; var a = hit.querySelector('audio'); if (!a) return;
        if (!compact) { var stg = document.getElementById('sn-stage') || hit; stg.scrollIntoView({ block: 'center', behavior: RM ? 'auto' : 'smooth' }); }
        document.querySelectorAll('.track-player').forEach(function (o) { if (o !== a && !o.paused) o.pause(); });
        var p = a.play(); if (p && p.catch) p.catch(function () { say('Your browser blocked the sound. Press play on the track.'); });
        if (opts.onPlay) opts.onPlay(id);
      }
    }
  
    host.addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      if (b.hasAttribute('data-g')) {
        var g = b.getAttribute('data-g'), v = b.getAttribute('data-v');
        if (g === 'need') need = need === v ? '' : v;
        else if (g === 'body') { body = v; host.querySelectorAll('[data-g="body"]').forEach(function (c) { c.setAttribute('aria-pressed', String(c.getAttribute('data-v') === body)); }); }
        else { prefs[v] = !prefs[v]; b.setAttribute('aria-pressed', String(!!prefs[v])); }
        draw();
      } else if (b.hasAttribute('data-play')) playSound(b.getAttribute('data-play'));
      else if (b.hasAttribute('data-fav')) {
        var fv = jget('tol-sound-fav'), id = b.getAttribute('data-fav');
        if (fv[need] === id) delete fv[need]; else fv[need] = id;
        lsSet('tol-sound-fav', JSON.stringify(fv)); draw();
      }
    });
    draw(); instances.push({ draw: draw });
    return { draw: draw };
  }
  // count what gets played anywhere on the page, so "played most" is real
  document.querySelectorAll('.track-player').forEach(function (a) {
    a.addEventListener('play', function () {
      var c = a.closest('.track-card'), t = c && c.querySelector('.track-title'); if (!t) return;
      var name = t.textContent.replace(/^\d+\.\s*/, ''), id = null; S.forEach(function (x) { if (x.name === name) id = x.id; });
      if (id) { bump(id); redrawAll(); }
    });
  });
  document.addEventListener('tol-sound-played', function (e) { if (e.detail && BYID[e.detail.id]) { bump(e.detail.id); redrawAll(); } });

  if (page) mount(page, {});
  window.TOLFinder = { mount: function (el, o) { o = o || {}; o.compact = true; return mount(el, o); } };
})();
