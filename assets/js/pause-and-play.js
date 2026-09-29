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
    if (bloom && bloom.num && bloom.tier) meta('bloom', 'You’re on ' + bloom.tier + ', level ' + bloom.num + (bloom.perfect ? ' · ' + bloom.perfect + (bloom.perfect === 1 ? ' perfect bloom' : ' perfect blooms') : ''));
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

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', render); else render();
  loadCounts();
  setInterval(render, 5000); // gentle refresh, so a finished breathing break shows up here
})();
