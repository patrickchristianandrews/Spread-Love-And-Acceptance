/* keepsakes.js — the keepsakes page (/keepsakes.html): petals, streak, tile colours,
   and the wonders your petals grow in the garden, all from rewards.js. Kept in this browser. */
(function () {
  'use strict';
  var R = window.TOLRewards; if (!R) return;
  var SW = {
    'tiles-petal': ['#FFF8EE', '#F6EEF8', '#FFFFFF', '#D9C8F0'], 'tiles-rose': ['#FFF3F5', '#FBE3EA', '#FFFAFB', '#F4A6B8'],
    'tiles-moon': ['#22264C', '#33335F', '#3A3F72', '#8F7FC4'], 'tiles-meadow': ['#F1F9EC', '#DFEFD8', '#FBFFF8', '#A9DCB8'],
    'tiles-sunrise': ['#FFF3E2', '#FFE0D0', '#FFFBF5', '#F9C08F'], 'tiles-gold': ['#FFF8DE', '#F6E3A2', '#FFFCEF', '#E8C55B']
  };
  function esc(t) { return String(t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function art(u) { return u.img ? '<img src="' + u.img + '" alt="">' : '<span aria-hidden="true">' + (u.icon || '') + '</span>'; }

  function render() {
    var s = R.state(), nx = s.next, from = s.prevAt, pct = nx ? Math.round((s.petals - from) / (nx.at - from) * 100) : 100;
    // streak dots for the last 14 days
    var dots = '', today = new Date();
    for (var i = 13; i >= 0; i--) {
      var d = new Date(today); d.setDate(today.getDate() - i);
      var k = R.dayKey(d), on = s.days.indexOf(k) !== -1;
      dots += '<span class="' + (on ? 'is-on' : '') + (i === 0 ? ' is-today' : '') + '" title="' + k + '">' + (on ? '♥' : '') + '</span>';
    }
    document.getElementById('ks-hero').innerHTML =
      '<div class="ks-petals"><div><b>' + s.petals + '</b><small>petals</small></div></div>' +
      '<div><h2>Level ' + s.level + '</h2><div class="ks-bar" role="img" aria-label="' + pct + ' percent of the way to the next keepsake"><i style="width:' + Math.max(3, pct) + '%"></i></div>' +
      '<p class="ks-next">' + (nx ? (nx.at - s.petals) + ' more petals to unlock <strong>' + esc(nx.name) + '</strong>' : 'You have unlocked every keepsake. Thank you for playing.') + '</p></div>' +
      '<div class="ks-streak"><span>' + (s.streak > 1 ? '🔥 ' + s.streak + '-day streak' : s.streak === 1 ? 'Day one of a new streak' : 'Play a calm game to start a streak') + (s.best > 1 ? ' · best ' + s.best : '') + '</span><span class="ks-days" aria-hidden="true">' + dots + '</span></div>';

    var tiles = document.getElementById('ks-tiles');
    tiles.innerHTML = R.tileThemes.map(function (u) {
      var have = R.has(u.id), c = SW[u.id] || SW['tiles-petal'];
      var sw = '<span class="ks-swatch" style="background:linear-gradient(145deg,' + c[0] + ',' + c[1] + ')"><i style="background:' + c[2] + '"></i><i style="background:' + c[3] + '"></i><i style="background:' + c[3] + '"></i><i style="background:' + c[2] + '"></i></span>';
      return have ? '<button type="button" class="ks-item" data-tiles="' + u.id + '" aria-pressed="' + (s.tiles === u.id) + '">' + sw + '<strong>' + esc(u.name) + '</strong><small>' + (s.tiles === u.id ? 'In use' : 'Tap to use') + '</small></button>'
        : '<div class="ks-item is-locked">' + sw + '<strong>' + esc(u.name) + '</strong><small>At ' + u.at + ' petals</small></div>';
    }).join('');

    var garden = document.getElementById('ks-garden');
    var gl = R.ladder.filter(function (u) { return u.kind === 'garden' && u.id.indexOf('garden-flies-') !== 0; });
    garden.innerHTML = gl.map(function (u) {
      var have = R.has(u.id), on = R.garden(u.id);
      return '<div class="ks-item' + (have ? '' : ' is-locked') + '"><span class="ks-art">' + art(u) + '</span><strong>' + esc(u.name) + '</strong><small>' + (have ? esc(u.desc) : 'At ' + u.at + ' petals') + '</small>' +
        (have ? '<button type="button" class="ks-toggle" data-garden="' + u.id + '" aria-pressed="' + on + '">' + (on ? 'On' : 'Off') + '</button>' : '') + '</div>';
    }).join('');


    var g = s.games, bits = [];
    if (g.bloom && g.bloom.best) bits.push('Word Bloom: level ' + g.bloom.best);
    if (g.crossword && g.crossword.done) bits.push('Crosswords solved: ' + g.crossword.done);
    if (g.words && g.words.done) bits.push('Quiet Words puzzles: ' + g.words.done);
    if (g.pond && g.pond.best) bits.push('Best lily pond: ' + g.pond.best + ' rows');
    document.getElementById('ks-stats').innerHTML = bits.map(function (b) { return '<span>' + esc(b) + '</span>'; }).join('');
  }

  document.addEventListener('click', function (e) {
    var t = e.target.closest('[data-tiles]'); if (t && t.tagName === 'BUTTON') { R.setTiles(t.getAttribute('data-tiles')); render(); }
    var g = e.target.closest('[data-garden]'); if (g) { R.setGarden(g.getAttribute('data-garden'), g.getAttribute('aria-pressed') !== 'true'); render(); }
  });
  render();
})();
