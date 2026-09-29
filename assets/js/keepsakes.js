/* keepsakes.js — "My garden" (/keepsakes.html): what has arrived in the garden behind the pages
   (rewards.js) and the constellations found and named in the Night Garden (night-garden.js), read
   from this browser only. A keepsake can be switched off (it rests out of sight in the background)
   and on again. No streaks, no counts of days, nothing to keep up. */
(function () {
  'use strict';
  function read(k) { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; } }
  function esc(t) { return String(t == null ? '' : t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function plural(n, one, many) { return n + ' ' + (n === 1 ? one : many); }

  // the Night Garden's constellation names (the garden also saves the names it has shown you)
  var NAMES = { heart: 'The Heart', star: 'The Wishing Star', moon: 'The Crescent', flower: 'The Bloom', leaf: 'The Leaf', house: 'The Home', wave: 'The Wave',
    kite: 'The Kite', butterfly: 'The Butterfly', paw: 'The Paw Prints', tree: 'The Evergreen', cloud: 'The Cloud', bird: 'The Swallow', fish: 'The Fish',
    cup: 'The Warm Cup', bell: 'The Bell', umbrella: 'The Umbrella', boat: 'The Sailboat', mountain: 'The Mountain', candle: 'The Candle', feather: 'The Feather',
    snail: 'The Snail', sun: 'The Sun', rainbow: 'The Rainbow', raindrop: 'The Raindrop', mushroom: 'The Mushroom', twohearts: 'The Two Hearts', infinity: 'The Loop',
    gem: 'The Gem', teapot: 'The Teapot', bridge: 'The Bridge', lantern: 'The Lantern', cat: 'The Sleepy Cat', acorn: 'The Acorn', crown: 'The Daisy Crown',
    bone: 'The Bone', sprout: 'The Sprout', apple: 'The Apple', balloon: 'The Balloon', key: 'The Key', letter: 'The Letter', snowflake: 'The Snowflake',
    owl: 'The Little Owl', mitten: 'The Mitten', note: 'The Note', pup: 'The Pup', hotair: 'The Hot-Air Balloon' };
  function nameOf(id, g) { return (g.cnames && g.cnames[id]) || NAMES[id] || ('The ' + id.charAt(0).toUpperCase() + id.slice(1)); }

  function render() {
    var R = window.TOLRewards, st = R ? R.state() : { level: 1, unlocked: [], from: {} };
    var g = read('tol-night-garden-v1') || {};
    var consts = Array.isArray(g.consts) ? g.consts : [], ded = g.dedic || {};
    var xw = read('tol-xw-v1') || {}, np = read('tol-np-v1') || {}, bloom = read('tol-bloom-v1') || {};
    var qw = +(localStorage.getItem('tol-qw-done') || 0);
    var got = (R ? R.ladder : []).filter(function (u) { return st.unlocked.indexOf(u.id) !== -1; });
    var wonders = got.filter(function (u) { return u.id.indexOf('garden-flies-') !== 0; }), flies = got.length - wonders.length;

    var sum = ['✨ Level ' + st.level];
    if (wonders.length) sum.push('🌳 ' + plural(wonders.length, 'keepsake', 'keepsakes'));
    if (consts.length) sum.push('⭐ ' + plural(consts.length, 'constellation', 'constellations'));
    if (g.flowers && g.flowers.length) sum.push('🌸 ' + plural(g.flowers.length, 'flower', 'flowers'));
    var played = (xw.solved || 0) + (np.solved || 0);
    if (played) sum.push('✏️ ' + plural(played, 'crossword', 'crosswords'));
    if (bloom.cleared) sum.push('🌼 ' + plural(bloom.cleared, 'wheel bloomed', 'wheels bloomed'));
    if (qw) sum.push('🔍 ' + plural(qw, 'word search', 'word searches'));
    document.getElementById('ks-sum').innerHTML = sum.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('');

    var gEl = document.getElementById('ks-garden');
    if (!wonders.length) {
      gEl.innerHTML = '<p class="ks-empty">Nothing has arrived yet. Play any of the calm games, and now and then something new, like a swing by the pond or koi in the water, will appear in the garden behind the pages. It will be listed here.</p>';
    } else {
      gEl.innerHTML = '<ul class="ks-grid">' + wonders.map(function (u) {
        var on = R.garden(u.id);
        return '<li class="ks-item"><span class="ks-art" aria-hidden="true">' + (u.img ? '<img src="' + esc(u.img) + '" alt="">' : esc(u.icon)) + '</span>' +
          '<h3>' + esc(u.name) + '</h3><p>' + esc(u.desc) + '</p>' +
          '<label><input type="checkbox" data-id="' + esc(u.id) + '"' + (on ? ' checked' : '') + '> In the background</label></li>';
      }).join('') + '</ul>' +
        (flies ? '<p class="ks-note">And ' + plural(flies * 5, 'extra firefly', 'extra fireflies') + ' glowing over the pond.</p>' : '') +
        (st.next ? '<p class="ks-note">More will arrive as you play, at an easy pace. No rush.</p>' : '<p class="ks-note">Everything has arrived. Thank you for playing.</p>');
    }

    var sEl = document.getElementById('ks-sky');
    if (!consts.length) {
      sEl.innerHTML = '<p class="ks-empty">Your sky is waiting. In the Night Garden, guide the fireflies to join the stars, and each new picture you find can be named for someone you love.</p><p><a href="/night-garden.html">Visit the Night Garden &rarr;</a></p>';
    } else {
      var named = consts.filter(function (id) { return ded[id]; }), rest = consts.filter(function (id) { return !ded[id]; });
      sEl.innerHTML = '<ul class="ks-sky">' + named.concat(rest).map(function (id) {
        return '<li class="ks-star"><h3>' + esc(nameOf(id, g)) + '</h3>' + (ded[id] ? '<span class="ks-for">For ' + esc(ded[id]) + ' &#9829;</span>' : '<p>Found in your sky.</p>') + '</li>';
      }).join('') + '</ul>';
    }
  }

  document.addEventListener('change', function (e) {
    var box = e.target.closest && e.target.closest('input[data-id]');
    if (!box || !window.TOLRewards) return;
    window.TOLRewards.setGarden(box.getAttribute('data-id'), box.checked);
  });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', render); else render();
  window.addEventListener('focus', render);
})();
