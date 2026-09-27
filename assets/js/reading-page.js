/* reading-page.js — builds the Further Reading page (/reading.html) from reading-list.js.
   Filters: who it's for (for me / with others), one of the Five Pillars, and a topic.
   The current filters are kept in the address (#for=me&pillar=III&topic=calm) so a page can link
   straight to a filtered list. Nothing is stored or sent. */
(function () {
  'use strict';

  function start() {
    var D = window.TOL_READING;
    var list = document.getElementById('rl-list');
    if (!D || !list) return;
    var items = D.items || [], tags = D.tags || {}, pillars = D.pillars || {}, sources = D.sources || {};
    var AUD = [['', 'Everyone'], ['me', 'For me', 'understanding yourself'], ['others', 'With others', 'getting along with others']];
    var state = { aud: '', pillar: '', topic: '' };

    function el(tag, cls, text) {
      var e = document.createElement(tag);
      if (cls) e.className = cls;
      if (text != null) e.textContent = text;
      return e;
    }
    function count(filterFn) { return items.filter(filterFn).length; }

    /* ---------- the address keeps the filters ---------- */
    function readHash() {
      var h = (window.location.hash || '').replace(/^#/, '');
      h.split('&').forEach(function (kv) {
        var p = kv.split('='), k = p[0], v = decodeURIComponent(p[1] || '');
        if (k === 'for' && (v === 'me' || v === 'others')) state.aud = v;
        if (k === 'pillar' && pillars[v]) state.pillar = v;
        if (k === 'topic' && tags[v]) state.topic = v;
      });
    }
    function writeHash() {
      var parts = [];
      if (state.aud) parts.push('for=' + state.aud);
      if (state.pillar) parts.push('pillar=' + state.pillar);
      if (state.topic) parts.push('topic=' + state.topic);
      try { history.replaceState(null, '', parts.length ? '#' + parts.join('&') : window.location.pathname + window.location.search); } catch (e) { }
    }

    /* ---------- chips ---------- */
    function chip(label, small, pressed, onClick) {
      var b = el('button', 'rl-chip');
      b.type = 'button';
      b.appendChild(document.createTextNode(label));
      if (small) { b.appendChild(document.createTextNode(' ')); b.appendChild(el('small', '', small)); }
      b.setAttribute('aria-pressed', pressed ? 'true' : 'false');
      b.addEventListener('click', onClick);
      return b;
    }
    function buildChips() {
      var aud = document.getElementById('rl-aud'), pil = document.getElementById('rl-pillars'), top = document.getElementById('rl-topics');
      aud.innerHTML = ''; pil.innerHTML = ''; top.innerHTML = '';
      AUD.forEach(function (a) {
        aud.appendChild(chip(a[1], a[2] ? '(' + a[2] + ')' : '', state.aud === a[0], function () { set('aud', a[0]); }));
      });
      pil.appendChild(chip('All pillars', '', !state.pillar, function () { set('pillar', ''); }));
      Object.keys(pillars).forEach(function (k) {
        var n = count(function (it) { return (it.pillars || []).indexOf(k) !== -1; });
        pil.appendChild(chip(k + ' · ' + pillars[k].name, '(' + n + ')', state.pillar === k, function () { set('pillar', state.pillar === k ? '' : k); }));
      });
      top.appendChild(chip('All topics', '', !state.topic, function () { set('topic', ''); }));
      var pn = document.getElementById('rl-pillar-now'), tn = document.getElementById('rl-topic-now');
      if (pn) pn.textContent = state.pillar ? state.pillar + ' · ' + pillars[state.pillar].name : 'All pillars';
      if (tn) tn.textContent = state.topic ? tags[state.topic] : 'All topics';
      Object.keys(tags).forEach(function (k) {
        var n = count(function (it) { return it.topics.indexOf(k) !== -1; });
        if (!n) return;
        top.appendChild(chip(tags[k], '(' + n + ')', state.topic === k, function () { set('topic', state.topic === k ? '' : k); }));
      });
    }
    function set(key, val) {
      var group = { aud: 'rl-aud', pillar: 'rl-pillars', topic: 'rl-topics' }[key];
      var idx = Array.prototype.indexOf.call(document.getElementById(group).children, document.activeElement);
      state[key] = val;
      writeHash(); buildChips(); render();
      // keep keyboard focus on the chip that was pressed
      if (idx >= 0) { var again = document.getElementById(group).children[idx]; if (again) again.focus(); }
    }

    /* ---------- the list ---------- */
    function fits(it) {
      if (state.aud === 'me' && !(it.audience === 'self' || it.audience === 'both')) return false;
      if (state.aud === 'others' && !(it.audience === 'others' || it.audience === 'both')) return false;
      if (state.pillar && (it.pillars || []).indexOf(state.pillar) === -1) return false;
      if (state.topic && it.topics.indexOf(state.topic) === -1) return false;
      return true;
    }
    function itemEl(it) {
      var li = el('li', 'rl-item');
      var s = el('span', 'rl-src', sources[it.source] || it.source); s.setAttribute('data-src', it.source);
      li.appendChild(s);
      var h = el('h3'), a = el('a', '', it.title);
      a.href = it.url; a.target = '_blank'; a.rel = 'noopener';
      a.appendChild(el('span', 'rl-sr', ' (opens on ' + (sources[it.source] || 'the publisher’s site') + ' in a new tab)'));
      h.appendChild(a); li.appendChild(h);
      if (it.author) li.appendChild(el('p', 'rl-by', 'By ' + it.author));
      li.appendChild(el('p', 'rl-sum', it.summary));
      var meta = el('p', 'rl-meta');
      meta.appendChild(document.createTextNode(it.audience === 'self' ? 'For me' : it.audience === 'others' ? 'With others' : 'For me and with others'));
      (it.pillars || []).forEach(function (k) {
        var pd = pillars[k]; if (!pd) return;
        meta.appendChild(document.createTextNode(' · '));
        var pa = el('a', '', 'Pillar ' + k + ': ' + pd.name); pa.href = '/five-pillars.html#' + pd.anchor;
        meta.appendChild(pa);
      });
      li.appendChild(meta);
      return li;
    }
    function render() {
      var shown = items.filter(fits);
      list.innerHTML = '';
      var groups = {};
      shown.forEach(function (it) {
        var g = state.topic || it.topics[0];
        (groups[g] = groups[g] || []).push(it);
      });
      Object.keys(tags).forEach(function (k) {
        if (!groups[k]) return;
        var sec = el('section', 'rl-group');
        sec.setAttribute('aria-labelledby', 'rl-h-' + k);
        var h = el('h2'); h.id = 'rl-h-' + k;
        h.appendChild(document.createTextNode(tags[k] + ' '));
        h.appendChild(el('span', 'rl-n', '(' + groups[k].length + ')'));
        sec.appendChild(h);
        var ul = el('ul', 'rl-list');
        groups[k].sort(function (a, b) { return a.title.localeCompare(b.title); }).forEach(function (it) { ul.appendChild(itemEl(it)); });
        sec.appendChild(ul);
        list.appendChild(sec);
      });
      if (!shown.length) list.appendChild(el('p', 'rl-empty', 'Nothing matches all of those choices yet. Try one filter at a time.'));
      var any = state.aud || state.pillar || state.topic;
      document.getElementById('rl-count').textContent = any
        ? 'Showing ' + shown.length + ' of ' + items.length + ' articles.'
        : 'Showing all ' + items.length + ' articles, grouped by topic.';
      document.getElementById('rl-reset').hidden = !any;
    }

    document.getElementById('rl-reset').addEventListener('click', function () {
      state = { aud: '', pillar: '', topic: '' }; writeHash(); buildChips(); render();
      var first = document.querySelector('#rl-aud .rl-chip'); if (first) first.focus();
    });
    window.addEventListener('hashchange', function () { state = { aud: '', pillar: '', topic: '' }; readHash(); buildChips(); render(); });

    readHash(); buildChips(); render();
    // on a phone the long chip lists start folded, so the articles are close at hand
    try {
      if (window.matchMedia('(max-width: 720px)').matches) {
        ['rl-more-pillars', 'rl-more-topics'].forEach(function (id) { var d = document.getElementById(id); if (d) d.open = false; });
      }
    } catch (e) { }

    // one suggestion to start with, from anywhere in the list
    if (window.TOLReading && document.getElementById('rl-suggest')) {
      window.TOLReading.mount('#rl-suggest', { scan: false, page: '/reading.html', heading: 2 });
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
