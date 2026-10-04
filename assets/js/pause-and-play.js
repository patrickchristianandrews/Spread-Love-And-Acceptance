/* pause-and-play.js — the Pause & Play page (/pause-and-play.html): your level and a little of where you are in each game, with
   true counts of the puzzles in each game (from assets/js/puzzles/index.js). Reads this browser only. No streaks. */
(function () {
  'use strict';
  function read(k) { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; } }
  function esc(t) { return String(t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function meta(k, text) { var el = document.querySelector('[data-meta="' + k + '"]'); if (el && text) el.textContent = text; }

  // how many puzzles each game really has, from the shared index of puzzle banks
  var counts = {};
  function sum(idx, pre) { var n = 0; Object.keys(idx).forEach(function (k) { if (k.indexOf(pre) === 0 && /-(gentle|easy|medium|hard|expert|mini|small|daily|weekend|sunday|themes)$/.test(k)) n += idx[k].n; }); return n; }
  function loadCounts() {
    var sc = document.createElement('script'); sc.src = '/assets/js/puzzles/index.js';
    sc.onload = function () {
      var idx = window.TOL_PUZZLE_INDEX || {};
      counts = { bloom: sum(idx, 'bloom-'), xw: sum(idx, 'xw-'), paper: sum(idx, 'np-'), words: sum(idx, 'qw-') };
      render();
    };
    document.head.appendChild(sc);
  }
  function render() {
    var R = window.TOLRewards;
    var statsEl = document.getElementById('pp-stats'), nextEl = document.getElementById('pp-next');
    if (R && statsEl && nextEl) {
      var s = R.state(), nx = s.next;
      statsEl.innerHTML = '<a class="pp-stat" href="/keepsakes.html">\u2728 Level ' + s.level + ' \u00B7 My garden</a>';
      nextEl.innerHTML = nx ? 'Something new is on its way to the background' + (s.unlocked.length ? ' \u00B7 ' + s.unlocked.length + ' there so far' : '') +
        '<div class="pp-bar"><i style="width:' + Math.max(4, Math.round(s.progress * 100)) + '%"></i></div>' : 'Everything has arrived. Thank you for playing.';
    }
    var bloom = read('tol-bloom-v1');
    if (bloom && bloom.num && bloom.tier) meta('bloom', 'You’re on ' + bloom.tier + ', level ' + bloom.num);
    else if (counts.bloom) meta('bloom', counts.bloom.toLocaleString('en-US') + ' wheels in five sizes');
    var xw = read('tol-xw-v1'); if (xw && xw.solved) meta('xw', xw.solved + (xw.solved === 1 ? ' crossword solved' : ' crosswords solved'));
    else if (counts.xw) meta('xw', counts.xw.toLocaleString('en-US') + ' crosswords, made for your phone');
    var np = read('tol-np-v1'); if (np && np.solved) meta('paper', np.solved + (np.solved === 1 ? ' newspaper crossword solved' : ' newspaper crosswords solved'));
    else if (counts.paper) meta('paper', 'Five sizes and ' + counts.paper.toLocaleString('en-US') + ' grids to play any time');
    var qw = 0; try { qw = +(localStorage.getItem('tol-qw-done') || 0); } catch (e) {}
    if (qw) meta('words', qw + (qw === 1 ? ' puzzle finished' : ' puzzles finished'));
    else if (counts.words) meta('words', 'A new theme each day, and ' + counts.words.toLocaleString('en-US') + ' in all');
    var g = read('tol-night-garden-v1');
    if (g && g.flowers) meta('garden', g.flowers.length + (g.flowers.length === 1 ? ' flower' : ' flowers') + (g.consts && g.consts.length ? ' · ' + g.consts.length + (g.consts.length === 1 ? ' constellation' : ' constellations') : '') + (g.lilies ? ' · ' + g.lilies + (g.lilies === 1 ? ' lily row' : ' lily rows') : ''));
    var br = 0; try { br = +(localStorage.getItem('tol-br-count') || 0); } catch (e) {} if (br) meta('breathe', br + (br === 1 ? ' breathing break so far' : ' breathing breaks so far'));
  }

  // "A breathing break" opens the site's breathing break right here
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-breathe]'); if (!b) return;
    var open = document.querySelector('.tol-breathe-btn');
    if (open) { e.preventDefault(); open.click(); }
    else if (b.tagName === 'A') { b.setAttribute('href', '/night-garden.html'); }
  });
  // come back to fresh numbers after a game or a breathing break
  document.addEventListener('visibilitychange', function () { if (!document.hidden) render(); });
  window.addEventListener('focus', render);
  document.addEventListener('click', function (e) { if (e.target.closest('.tol-breathe [data-act="close"], .tol-breathe [data-act="done"]')) setTimeout(render, 300); });

  // ---------- "Pick one for me (2 minutes)" ----------
  // One small thing, chosen for you. It only suggests: nothing opens until you tap the link.
  var PICKS = [
    ['/quiet-words.html', 'Quiet Words', 'find two or three words in a gentle word search'],
    ['/word-bloom.html', 'Word Bloom', 'spell a few words from the petals'],
    ['/night-garden.html', 'The Night Garden', 'breathe with the glowing light for a few rounds'],
    ['/quiet-crossword.html', 'Quiet Crossword', 'fill in two or three clues, then stop'],
    ['/frequency-journey.html', 'The Frequency Journey', 'play one short round as Tidbit or Sugarfoot']
  ], lastPick = -1;
  var pickBtn = document.getElementById('pp-pick'), pickOut = document.getElementById('pp-pick-out');
  if (pickBtn && pickOut) pickBtn.addEventListener('click', function () {
    var i; do { i = Math.floor(Math.random() * PICKS.length); } while (i === lastPick && PICKS.length > 1);
    lastPick = i; var k = PICKS[i];
    pickOut.innerHTML = '<strong>' + esc(k[1]) + ':</strong> ' + esc(k[2]) + '. Two minutes is plenty, and stopping is fine. <a href="' + k[0] + '">Go to ' + esc(k[1]) + ' &rarr;</a>';
    pickBtn.innerHTML = '<span aria-hidden="true">&#127922;</span> Pick another';
  });

  // ---------- "Tonight only": a silent 3-minute wind-down ----------
  // breathe (1 minute) → a soft scene (1 minute) → one kind sentence. No sound, no score, nothing saved.
  var KIND = [
    'You did enough today. The rest can wait until morning.',
    'Whatever didn’t get done tonight is allowed to wait.',
    'You’re allowed to rest before everything is fixed.',
    'Someone is glad you’re in their life, even if they didn’t say it today.',
    'Be as gentle with yourself tonight as you would be with a friend.',
    'Tomorrow is a fresh page. You don’t have to write on it yet.',
    'Small, kind things count. You did some today.',
    'Let the day be finished. You can set it down now.'
  ];
  var wd = document.getElementById('pp-wd');
  if (wd) {
    var $w = function (id) { return document.getElementById(id); };
    var step = 0, timer = null, until = 0, back = null, breathT = null;
    var STEPS = [
      { cls: 'is-breathe', k: '1 of 3 · Breathe', h: 'Breathe with the circle', secs: 60 },
      { cls: 'is-scene', k: '2 of 3 · Rest your eyes', h: 'A quiet night', secs: 60, p: 'Just look for a while. Nothing to do. Let your shoulders drop.' },
      { cls: 'is-words', k: '3 of 3 · Something kind', h: 'Before you go', secs: 0 }
    ];
    function still() { return !!((window.TOLStill && (window.TOLStill.chosen ? window.TOLStill.chosen() : window.TOLStill.on())) || (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches)); }
    function show(n) {
      step = n; var st = STEPS[n];
      clearInterval(timer); clearInterval(breathT);
      wd.classList.remove('is-breathe', 'is-scene', 'is-words'); wd.classList.add(st.cls);
      $w('pp-wd-k').textContent = st.k; $w('pp-wd-h').textContent = st.h;
      $w('pp-wd-next').textContent = n === 2 ? 'Goodnight' : 'Next →';
      if (n === 0) {
        // in for 4, out for 6: the words change with the breath (and the circle grows, unless the page is kept still)
        var t0 = Date.now(), cue = function () { var x = ((Date.now() - t0) / 1000) % 10; $w('pp-wd-p').textContent = x < 4 ? 'Breathe in…' : 'and slowly out…'; };
        cue(); breathT = setInterval(cue, 250);
        if (still()) wd.classList.remove('is-breathe');
      } else if (n === 1) $w('pp-wd-p').textContent = st.p;
      else $w('pp-wd-p').textContent = KIND[Math.floor(Math.random() * KIND.length)];
      until = st.secs ? Date.now() + st.secs * 1000 : 0;
      tick(); if (until) timer = setInterval(tick, 500);
      try { $w('pp-wd-h').focus({ preventScroll: true }); } catch (e) {}
    }
    function tick() {
      if (!until) { $w('pp-wd-left').textContent = 'Stay as long as you like.'; return; }
      var left = Math.max(0, Math.ceil((until - Date.now()) / 1000));
      $w('pp-wd-left').textContent = left ? 'About ' + left + ' seconds' : '';
      if (!left) show(step + 1);
    }
    function close() { clearInterval(timer); clearInterval(breathT); wd.hidden = true; document.documentElement.style.overflow = ''; if (back && back.focus) back.focus(); }
    $w('pp-tonight').addEventListener('click', function () { back = this; wd.hidden = false; document.documentElement.style.overflow = 'hidden'; show(0); });
    $w('pp-wd-next').addEventListener('click', function () { if (step >= 2) close(); else show(step + 1); });
    $w('pp-wd-stop').addEventListener('click', close);
    wd.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', render); else render();
  loadCounts();
  setInterval(render, 5000); // gentle refresh, so a finished breathing break shows up here
})();
