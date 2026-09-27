/* reading-page.js — the Articles page (/reading.html), built from reading-list.js.

   Two views, as tabs:
   1. Fresh picks (the default): the articles grouped by topic, a random handful in each group.
      Every visit gets a new selection and a new group order. Every 20–30 seconds one group
      softly swaps in new articles, one group at a time. A group is left alone while the pointer
      is over it or anything inside it has keyboard focus, and nothing swaps on its own while the
      tab is hidden, under prefers-reduced-motion, or with the site's "Keep the page still" switch
      on (window.TOLStill / html.tol-still / the 'tol-still' event). The reader can also pause it.
      Swaps prefer articles not shown yet this visit and skip ones the reader has opened
      (localStorage 'tol-reading-v1', shared with reading-suggest.js).
   2. Browse all: the full list with pillar and topic filters, kept in the address
      (#pillar=III&topic=calm, or #all for the unfiltered list).

   Test hook: ?rotate=2 makes the swap interval 2 seconds.
   Nothing is sent anywhere. */
(function () {
  'use strict';

  var PER_GROUP = 3;
  var FADE_MS = 320;

  // a friendly line for each topic group
  var BLURB = {
    'invisible-work': 'The remembering, planning and tracking that keeps a home running, and how to share it fairly.',
    'stress': 'Why a full load wears you down, and how to notice it before you run empty.',
    'calm': 'Small, doable ways to bring your body back down from high alert.',
    'connection': 'The little reach-outs that keep people close, and how to catch them.',
    'conflict': 'Getting through hard conversations, including when to take a break and how to come back.',
    'repair': 'Making things right after a rough moment, in a way the other person can take in.',
    'communication': 'Hearing each other properly, and asking for what you need.',
    'anxiety': 'When worry colours what you hear, and ways to steady it.',
    'attachment': 'How our early bonds shape the way we reach for, and pull back from, the people we love.',
    'boundaries': 'Saying no, and saying what you need, without it turning into a fight.',
    'neurodiversity': 'Brains work in different ways. Knowing that makes getting along a lot easier.',
    'autism': 'Sensory differences, masking, burnout and everyday life as an autistic person.',
    'adhd': 'Focus, feelings and sharing a life when ADHD is part of the picture.',
    'self-compassion': 'Being as kind to yourself as you would be to a good friend.',
    'family': 'Raising children, caring for others and sharing the work of a family.',
    'teams': 'Getting along with the people you share a home, a space or a job with.',
    'habits': 'Small, steady changes that tend to stick better than big resolutions.',
    'gratitude': 'Noticing the good and saying thank you, and why it helps you both.'
  };

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  function shuffle(a) {
    a = a.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  function start() {
    var D = window.TOL_READING;
    var list = document.getElementById('rl-list');
    if (!D || !list) return;
    var items = D.items || [], tags = D.tags || {}, pillars = D.pillars || {}, sources = D.sources || {};
    var byId = {};
    items.forEach(function (it) { byId[it.id] = it; });
    function srcName(it) { return sources[it.source] || it.source; }

    /* ---------- opened articles: reuse reading-suggest.js's store ---------- */
    var R = window.TOLReading || {};
    function openedSet() {
      var o = {};
      try { (typeof R.opened === 'function' ? R.opened() : []).forEach(function (id) { o[id] = 1; }); } catch (e) { }
      return o;
    }
    function markOpened(id) { try { if (typeof R.markOpened === 'function') R.markOpened(id); } catch (e) { } }
    function watchOpen(a, id) {
      a.addEventListener('click', function () { markOpened(id); });
      a.addEventListener('auxclick', function (e) { if (e.button === 1) markOpened(id); });
    }

    /* =========================================================
       Tabs
       ========================================================= */
    var tabFresh = document.getElementById('rl-tab-fresh'), tabAll = document.getElementById('rl-tab-all');
    var panelFresh = document.getElementById('rl-panel-fresh'), panelAll = document.getElementById('rl-panel-all');
    var view = 'fresh';
    function showView(v, focusTab) {
      view = v;
      var fresh = v === 'fresh';
      tabFresh.setAttribute('aria-selected', fresh ? 'true' : 'false');
      tabAll.setAttribute('aria-selected', fresh ? 'false' : 'true');
      tabFresh.tabIndex = fresh ? 0 : -1;
      tabAll.tabIndex = fresh ? -1 : 0;
      panelFresh.hidden = !fresh;
      panelAll.hidden = fresh;
      if (focusTab) (fresh ? tabFresh : tabAll).focus();
      updatePauseUI();
    }
    function onTab(v) {
      showView(v, false);
      if (v === 'all') writeHash(); else clearHash();
    }
    tabFresh.addEventListener('click', function () { onTab('fresh'); });
    tabAll.addEventListener('click', function () { onTab('all'); });
    [tabFresh, tabAll].forEach(function (t) {
      t.addEventListener('keydown', function (e) {
        var k = e.key;
        if (k === 'ArrowRight' || k === 'ArrowLeft' || k === 'Home' || k === 'End') {
          e.preventDefault();
          var v = (k === 'Home') ? 'fresh' : (k === 'End') ? 'all' : (view === 'fresh' ? 'all' : 'fresh');
          onTab(v); (v === 'fresh' ? tabFresh : tabAll).focus();
        }
      });
    });

    /* =========================================================
       Browse all: the full filterable list
       ========================================================= */
    var state = { pillar: '', topic: '' };
    function count(filterFn) { return items.filter(filterFn).length; }

    function readHash() {
      var h = (window.location.hash || '').replace(/^#/, ''), browse = false;
      state = { pillar: '', topic: '' };
      h.split('&').forEach(function (kv) {
        var p = kv.split('='), k = p[0], v = decodeURIComponent(p[1] || '');
        if (k === 'all' || k === 'browse') browse = true;
        if (k === 'pillar' && pillars[v]) { state.pillar = v; browse = true; }
        if (k === 'topic' && tags[v]) { state.topic = v; browse = true; }
      });
      return browse;
    }
    function setHash(h) {
      try { history.replaceState(null, '', h || (window.location.pathname + window.location.search)); } catch (e) { }
    }
    function writeHash() {
      var parts = [];
      if (state.pillar) parts.push('pillar=' + state.pillar);
      if (state.topic) parts.push('topic=' + state.topic);
      setHash('#' + (parts.length ? parts.join('&') : 'all'));
    }
    function clearHash() { setHash(''); }

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
      var pil = document.getElementById('rl-pillars'), top = document.getElementById('rl-topics');
      pil.innerHTML = ''; top.innerHTML = '';
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
      var group = { pillar: 'rl-pillars', topic: 'rl-topics' }[key];
      var idx = Array.prototype.indexOf.call(document.getElementById(group).children, document.activeElement);
      state[key] = val;
      writeHash(); buildChips(); render();
      // keep keyboard focus on the chip that was pressed
      if (idx >= 0) { var again = document.getElementById(group).children[idx]; if (again) again.focus(); }
    }
    function fits(it) {
      if (state.pillar && (it.pillars || []).indexOf(state.pillar) === -1) return false;
      if (state.topic && it.topics.indexOf(state.topic) === -1) return false;
      return true;
    }
    function itemEl(it) {
      var li = el('li', 'rl-item');
      var s = el('span', 'rl-src', srcName(it)); s.setAttribute('data-src', it.source);
      li.appendChild(s);
      var h = el('h3'), a = el('a', '', it.title);
      a.href = it.url; a.target = '_blank'; a.rel = 'noopener';
      a.appendChild(el('span', 'rl-sr', ' (opens on ' + srcName(it) + ' in a new tab)'));
      watchOpen(a, it.id);
      h.appendChild(a); li.appendChild(h);
      if (it.author) li.appendChild(el('p', 'rl-by', 'By ' + it.author));
      li.appendChild(el('p', 'rl-sum', it.summary));
      var meta = el('p', 'rl-meta');
      (it.pillars || []).forEach(function (k) {
        var pd = pillars[k]; if (!pd) return;
        if (meta.childNodes.length) meta.appendChild(document.createTextNode(' · '));
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
      if (!shown.length) list.appendChild(el('p', 'rl-empty', 'Nothing matches both of those yet. Try one filter at a time.'));
      var any = state.pillar || state.topic;
      document.getElementById('rl-count').textContent = any
        ? 'Showing ' + shown.length + ' of ' + items.length + ' articles.'
        : 'Showing all ' + items.length + ' articles, grouped by topic.';
      document.getElementById('rl-reset').hidden = !any;
    }
    document.getElementById('rl-reset').addEventListener('click', function () {
      state = { pillar: '', topic: '' }; writeHash(); buildChips(); render();
      var first = document.querySelector('#rl-pillars .rl-chip'); if (first) first.focus();
    });
    window.addEventListener('hashchange', function () {
      var browse = readHash(); buildChips(); render();
      showView(browse ? 'all' : 'fresh', false);
    });

    /* =========================================================
       Fresh picks: grouped, random, gently rotating
       ========================================================= */
    var freshRoot = document.getElementById('af-groups');
    var jump = document.getElementById('af-jump');
    var statusEl = document.getElementById('af-status');
    var pauseBtn = document.getElementById('af-pause');
    var stateLine = document.getElementById('af-state');
    var shuffleBtn = document.getElementById('af-shuffle');

    var seen = {};        // ids shown at any point during this visit
    var onScreen = {};    // id → group key, so one article never shows twice at once
    var groups = [];      // [{ key, sec, ul, items, ids, hover, busy }]
    var groupByKey = {};
    var rotIdx = 0;
    var userPaused = false;
    var timer = null;

    var params = {};
    try { new URLSearchParams(window.location.search).forEach(function (v, k) { params[k] = v; }); } catch (e) { }
    var testSecs = parseFloat(params.rotate);
    function nextDelay() {
      if (testSecs > 0) return testSecs * 1000;
      return 20000 + Math.floor(Math.random() * 10000);   // 20–30 seconds
    }

    var mqReduce = null;
    try { mqReduce = window.matchMedia('(prefers-reduced-motion: reduce)'); } catch (e) { }
    function reduced() { return !!(mqReduce && mqReduce.matches); }
    function still() {
      try { if (window.TOLStill && typeof window.TOLStill.on === 'function' && window.TOLStill.on()) return true; } catch (e) { }
      return document.documentElement.classList.contains('tol-still');
    }
    var override = false;   // the reader pressed Resume while "keep still" or reduced motion was on
    function autoReason() {
      if (still()) return 'still';
      if (reduced()) return 'reduced';
      return '';
    }
    function pauseReason() {
      if (userPaused) return 'user';
      if (override) return '';
      if (reduced()) return 'reduced';
      if (still()) return 'still';
      return '';
    }

    // choose n articles for a group: not on screen elsewhere, then unseen and unopened first
    function choose(g, n, avoid) {
      var opened = openedSet();
      avoid = avoid || {};
      var pool = g.items.filter(function (it) { return !onScreen[it.id] && !avoid[it.id]; });
      var tiers = [
        pool.filter(function (it) { return !seen[it.id] && !opened[it.id]; }),
        pool.filter(function (it) { return seen[it.id] && !opened[it.id]; }),
        pool.filter(function (it) { return opened[it.id]; })
      ];
      var out = [];
      for (var t = 0; t < tiers.length && out.length < n; t++) {
        // the reader's opened articles are only a last resort, and only if the group would be empty
        if (t === 2 && out.length) break;
        out = out.concat(shuffle(tiers[t]).slice(0, n - out.length));
      }
      return out;
    }
    // is there anything new to swap in for this group right now?
    function hasFresh(g) {
      var opened = openedSet();
      return g.items.some(function (it) { return !onScreen[it.id] && !opened[it.id]; });
    }

    function cardEl(it) {
      var li = el('li', 'af-card');
      li.setAttribute('data-id', it.id);
      var from = el('p', 'af-from');
      from.setAttribute('aria-hidden', 'true');
      var s = el('span', 'rl-src', srcName(it)); s.setAttribute('data-src', it.source);
      from.appendChild(s);
      from.appendChild(el('span', 'af-newtab', 'opens in a new tab ↗'));
      li.appendChild(from);
      var h = el('h3', 'af-t'), a = el('a', '', it.title);
      a.href = it.url; a.target = '_blank'; a.rel = 'noopener';
      a.appendChild(el('span', 'rl-sr', ' (opens on ' + srcName(it) + ' in a new tab)'));
      watchOpen(a, it.id);
      h.appendChild(a); li.appendChild(h);
      li.appendChild(el('p', 'af-sum', it.summary));
      return li;
    }

    function fill(g, picks) {
      g.ids.forEach(function (id) { if (onScreen[id] === g.key) delete onScreen[id]; });
      g.ids = picks.map(function (it) { return it.id; });
      var frag = document.createDocumentFragment();
      picks.forEach(function (it) { onScreen[it.id] = g.key; seen[it.id] = 1; frag.appendChild(cardEl(it)); });
      g.ul.innerHTML = '';
      g.ul.appendChild(frag);
      // never shrink during a visit, so swapping doesn't make the page below jump up
      var hgt = g.ul.offsetHeight;
      if (hgt > (g.minH || 0)) { g.minH = hgt; g.ul.style.minHeight = hgt + 'px'; }
    }

    // swap in new articles for one group, with a soft fade when motion is fine
    function swap(g, animate) {
      if (g.busy) return false;
      var avoid = {};
      g.ids.forEach(function (id) { avoid[id] = 1; });
      var picks = choose(g, PER_GROUP, avoid);
      if (!picks.length) return false;
      // top up with the ones already there if the group is running short
      if (picks.length < PER_GROUP) {
        g.ids.forEach(function (id) { if (picks.length < PER_GROUP && byId[id]) picks.push(byId[id]); });
      }
      if (!animate || reduced()) { fill(g, picks); return true; }
      g.busy = true;
      g.ul.classList.add('is-swap');
      setTimeout(function () {
        fill(g, picks);
        // next frame, fade back in
        requestAnimationFrame(function () { g.ul.classList.remove('is-swap'); g.busy = false; });
      }, FADE_MS);
      return true;
    }

    function groupEl(key, items) {
      var sec = el('section', 'rl-group af-group');
      sec.id = 'af-g-' + key;
      sec.setAttribute('data-group', key);
      sec.setAttribute('aria-labelledby', 'af-h-' + key);
      var head = el('div', 'af-head');
      var hw = el('div', 'af-hw');
      var h = el('h2', 'af-h', tags[key]); h.id = 'af-h-' + key;
      hw.appendChild(h);
      hw.appendChild(el('p', 'af-blurb', BLURB[key] || ''));
      head.appendChild(hw);
      var more = el('button', 'af-more', 'New picks in this group');
      more.type = 'button';
      more.setAttribute('aria-label', 'New picks in ' + tags[key]);
      head.appendChild(more);
      sec.appendChild(head);
      var ul = el('ul', 'af-list');
      ul.setAttribute('aria-live', 'off');
      sec.appendChild(ul);
      var foot = el('p', 'af-foot');
      var link = el('a', 'af-all', 'See all ' + items.length + ' in Browse all');
      link.href = '#topic=' + key;
      link.addEventListener('click', function (e) {
        e.preventDefault();
        state = { pillar: '', topic: key };
        writeHash(); buildChips(); render();
        showView('all', false);
        var tabs = document.getElementById('rl-tabs');
        if (tabs) tabs.scrollIntoView({ block: 'start' });
        tabAll.focus({ preventScroll: true });
      });
      foot.appendChild(link);
      sec.appendChild(foot);
      var g = { key: key, sec: sec, ul: ul, items: items, ids: [], hover: false, busy: false, minH: 0 };
      more.addEventListener('click', function () { swap(g, true); });
      // hovering or focusing a group keeps it still
      sec.addEventListener('pointerenter', function (e) { if (e.pointerType !== 'touch') g.hover = true; });
      sec.addEventListener('pointerleave', function () { g.hover = false; });
      return g;
    }

    function buildJump() {
      if (!jump) return;
      jump.innerHTML = '';
      groups.forEach(function (g) {
        var li = el('li'), a = el('a', '', tags[g.key]);
        a.href = '#af-g-' + g.key;
        a.addEventListener('click', function (e) {
          e.preventDefault();   // keep the address for the filters
          var smooth = !reduced() && !still();
          g.sec.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto', block: 'start' });
          var h = document.getElementById('af-h-' + g.key);
          if (h) { h.tabIndex = -1; h.focus({ preventScroll: true }); }
        });
        li.appendChild(a); jump.appendChild(li);
      });
    }

    function buildFresh() {
      var keys = Object.keys(tags).filter(function (k) { return items.some(function (it) { return it.topics.indexOf(k) !== -1; }); });
      keys.forEach(function (k) {
        groupByKey[k] = groupEl(k, items.filter(function (it) { return it.topics.indexOf(k) !== -1; }));
      });
      arrange(shuffle(keys));
    }
    // put the groups in a new order and give every one of them new picks
    function arrange(order) {
      groups = order.map(function (k) { return groupByKey[k]; });
      groups.forEach(function (g) {
        g.ids.forEach(function (id) { if (onScreen[id] === g.key) delete onScreen[id]; });
        g.ids = [];
      });
      freshRoot.innerHTML = '';
      groups.forEach(function (g) {
        freshRoot.appendChild(g.sec);
        g.ul.classList.remove('is-swap'); g.busy = false;
        fill(g, choose(g, PER_GROUP));
      });
      rotIdx = 0;
      buildJump();
    }

    // one tick: the next group in line that is on or below the screen, not hovered, not focused
    function tick() {
      timer = setTimeout(tick, nextDelay());
      if (pauseReason() || document.hidden || view !== 'fresh') return;
      var n = groups.length;
      for (var i = 0; i < n; i++) {
        var g = groups[(rotIdx + i) % n];
        if (g.hover || g.busy) continue;
        if (g.sec.contains(document.activeElement)) continue;
        if (g.sec.getBoundingClientRect().bottom < 0) continue;   // above the screen: leave it alone
        if (!hasFresh(g)) continue;
        if (swap(g, true)) { rotIdx = (rotIdx + i + 1) % n; return; }
      }
    }
    function startTimer() { if (timer) clearTimeout(timer); timer = setTimeout(tick, nextDelay()); }

    function updatePauseUI() {
      if (!pauseBtn) return;
      var why = pauseReason();
      pauseBtn.textContent = why ? 'Resume new articles' : 'Pause new articles';
      pauseBtn.setAttribute('aria-pressed', why ? 'true' : 'false');
      var line = {
        '': 'New articles drift in on their own, one group at a time, about every half minute. A group stays put while you point at it or move through it with the keyboard.',
        user: 'Paused. These picks will stay put until you resume.',
        still: 'Staying put because “Keep the page still” is on. Press Resume if you would like new articles to drift in anyway.',
        reduced: 'Staying put because your device asks for less motion. Press Resume if you would like new articles to drift in anyway.'
      }[why];
      if (stateLine) stateLine.textContent = line;
    }
    if (pauseBtn) pauseBtn.addEventListener('click', function () {
      if (pauseReason()) {
        userPaused = false;
        if (autoReason()) override = true;
        startTimer();
      } else {
        userPaused = true;
      }
      updatePauseUI();
    });
    if (shuffleBtn) shuffleBtn.addEventListener('click', function () {
      arrange(shuffle(groups.map(function (g) { return g.key; })));
      startTimer();
      if (statusEl) {
        statusEl.textContent = '';
        setTimeout(function () { statusEl.textContent = 'Shuffled. Every group has new picks, in a new order.'; }, 60);
      }
    });
    function onMotionChange() { override = false; updatePauseUI(); }
    try { if (mqReduce) (mqReduce.addEventListener ? mqReduce.addEventListener('change', onMotionChange) : mqReduce.addListener(onMotionChange)); } catch (e) { }
    document.addEventListener('tol-still', onMotionChange);
    window.addEventListener('tol-still', onMotionChange);

    /* ---------- go ---------- */
    var browse = readHash();
    buildChips(); render();
    try {
      if (window.matchMedia('(max-width: 720px)').matches) {
        ['rl-more-pillars', 'rl-more-topics', 'af-jump-more'].forEach(function (id) { var d = document.getElementById(id); if (d) d.open = false; });
      }
    } catch (e) { }
    if (freshRoot) buildFresh();
    showView(browse ? 'all' : 'fresh', false);
    startTimer();
    document.documentElement.setAttribute('data-articles-ready', '1');
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
