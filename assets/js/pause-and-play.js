/* pause-and-play.js — the Pause & Play page (/pause-and-play.html): your level, streak, and a little of where you are in each game. Reads this browser only. */
(function () {
  'use strict';
  function read(k) { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; } }
  function esc(t) { return String(t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function meta(k, text) { var el = document.querySelector('[data-meta="' + k + '"]'); if (el && text) el.textContent = text; }

  function render() {
    var R = window.TOLRewards;
    var statsEl = document.getElementById('pp-stats'), nextEl = document.getElementById('pp-next');
    if (R && statsEl && nextEl) {
      var s = R.state(), nx = s.next;
      statsEl.innerHTML =
        '<span class="pp-stat">\u2728 Level ' + s.level + '</span>' +
        (s.streak > 1 ? '<span class="pp-stat">\uD83D\uDD25 ' + s.streak + '-day streak</span>' : '');
      nextEl.innerHTML = nx ? 'Something new is on its way to the background' + (s.unlocked.length ? ' \u00B7 ' + s.unlocked.length + ' there so far' : '') +
        '<div class="pp-bar"><i style="width:' + Math.max(4, Math.round(s.progress * 100)) + '%"></i></div>' : 'Everything has arrived. Thank you for playing.';
    }
    var bloom = read('tol-bloom-v1'); if (bloom && bloom.level != null) meta('bloom', 'You’re on level ' + (bloom.level + 1) + (bloom.perfect ? ' · ' + bloom.perfect + (bloom.perfect === 1 ? ' perfect bloom' : ' perfect blooms') : ''));
    var xw = read('tol-xw-v1'); if (xw && xw.solved) meta('xw', xw.solved + (xw.solved === 1 ? ' crossword solved' : ' crosswords solved'));
    var qw = +(localStorage.getItem('tol-qw-done') || 0); if (qw) meta('words', qw + (qw === 1 ? ' puzzle finished' : ' puzzles finished'));
    var g = read('tol-night-garden-v1');
    if (g && g.flowers) meta('garden', g.flowers.length + (g.flowers.length === 1 ? ' flower' : ' flowers') + (g.consts && g.consts.length ? ' · ' + g.consts.length + (g.consts.length === 1 ? ' constellation' : ' constellations') : '') + (g.lilies ? ' · ' + g.lilies + (g.lilies === 1 ? ' lily row' : ' lily rows') : ''));
    var br = +(localStorage.getItem('tol-br-count') || 0); if (br) meta('breathe', br + (br === 1 ? ' breathing break so far' : ' breathing breaks so far'));
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
  setInterval(render, 5000); // gentle refresh, so a finished breathing break shows up here
})();
