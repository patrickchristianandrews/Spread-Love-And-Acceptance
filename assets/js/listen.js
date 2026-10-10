/* listen.js — "Listen": the page read aloud by the device's own voice (speechSynthesis).
   site.js loads this on reading pages (chapters, content pages, the Simple and Full pages, the
   Library) and the mini dives and the glossary use it too. It reads one sentence at a time and
   highlights the sentence being read, with pause, stop, a slower or faster voice, and "read from
   here" (tap a paragraph, or start from the top of the screen). The words never leave the device:
   the browser's own voice reads them. It hides itself where the device has no voice to read with.
   The only thing kept is the speed you chose (in this browser).
   It also puts a small "Listen" button on the short cards people use most (the "In short" box, the
   steps of Start in 10 minutes, the choices on the home page, tool results, and anything marked
   data-listen-card), and on the Spanish page every word of its own controls is in Spanish and the
   page is read with a Spanish voice. */
(function () {
  'use strict';
  if (window.TOLListen) return;
  var ok = 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
  var synth = ok ? window.speechSynthesis : null;
  var PAGE_LANG = (document.documentElement.lang || 'en-US').toLowerCase(), ES = /^es\b/.test(PAGE_LANG);
  function T(en, es) { return ES ? es : en; }
  var RATES = [['0.8', T('Slower', 'Más lento')], ['1', T('Usual', 'Normal')], ['1.2', T('Faster', 'Más rápido')], ['1.4', T('Fastest', 'Lo más rápido')]];
  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  var rate = +(lsGet('tol-listen-rate') || 1) || 1;
  var HL = !!(window.CSS && CSS.highlights && window.Highlight);

  // what to read: headings, paragraphs, list items, quotes and table cells in the main text, in order,
  // skipping the site's own furniture (menus, buddies, quizzes, tips, sign-up boxes)
  var SKIP = '.tol-listen, .tol-listen-bar, .tol-listen-mini, .tol-listen-cardrow, .tol-cheer, .lp-card, .lp-trail, .tol-pillars, nav, .tol-chbar, .tol-depth, .depth-bar, .tol-tip, .tol-read-host, .tol-pud-card, ' +
    '.tol-private, .tol-fp-note, .tol-gate, form, .tol-offer, .tol-pickup, .tol-dive-box, .no-listen, [aria-hidden="true"], .sr-only, ' +
    'script, style, noscript, .tol-join, .tol-puddles-hi, .pc-launch-row, .tol-steps-toggle, ' +
    // the breadcrumb ("Self-discovery · Where your lens came from") isn't read: the title comes first
    '.read-code, .breadcrumb, .crumbs, [aria-label="Breadcrumb"], [aria-label="breadcrumb"]';
  var BLOCK = 'h1, h2, h3, h4, h5, p, li, dt, dd, blockquote, figcaption, td, th, summary, .scene-line';
  function visible(n) { return !!(n.offsetParent || n.getClientRects().length); }
  function blocksIn(root) {
    return Array.prototype.filter.call(root.querySelectorAll(BLOCK), function (n) {
      var sk = n.closest(SKIP);
      if ((sk && sk !== root && root.contains(sk)) || !visible(n)) return false;
      if (n.querySelector(BLOCK)) {                 // a list item holding paragraphs: read the paragraphs instead
        var own = Array.prototype.some.call(n.childNodes, function (c) { return c.nodeType === 3 && c.textContent.trim(); });
        if (!own) return false;
      }
      return /\S/.test(textOf(n));
    });
  }
  function textNodes(n) {
    var out = [], w = document.createTreeWalker(n, NodeFilter.SHOW_TEXT, { acceptNode: function (t) {
      var p = t.parentElement, sk = p && p.closest(SKIP);
      return sk && sk !== n && n.contains(sk) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT; } });
    while (w.nextNode()) {
      var pb = w.currentNode.parentElement && w.currentNode.parentElement.closest(BLOCK);
      if (pb && pb !== n && n.contains(pb)) continue; // an inner paragraph is read on its own
      out.push(w.currentNode);
    }
    return out;
  }
  function textOf(n) { return textNodes(n).map(function (t) { return t.textContent; }).join(''); }
  // sentences, with where each one starts and ends in the block's text
  // where two separate pieces of a card meet with no space ("I need calm right now" + "Where am I…"), the voice pauses
  var PIC = /[\u2190-\u21FF\u2794\u279C\u27A1\u2B05-\u2B07\u203A\u00BB\u2600-\u27BF\uFE0F]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|\uD83E[\uDD00-\uDFFF]/g;
  function speakable(full, bounds, from, to) {
    var t = full.slice(from, to);
    for (var i = bounds.length - 1; i >= 0; i--) {
      var b = bounds[i] - from; if (b <= 0 || b >= t.length) continue;
      if (/\s/.test(t.charAt(b - 1)) || /[\s.,;:!?)…»”’]/.test(t.charAt(b))) continue;
      t = t.slice(0, b) + (/[.!?…:,;]/.test(t.charAt(b - 1)) ? ' ' : '. ') + t.slice(b);
    }
    return t.replace(PIC, '').replace(/\s+/g, ' ').trim();
  }
  function sentences(n) {
    var nodes = textNodes(n), full = '', bounds = [], out = [], lastP = null;
    // a boundary only where one of the two pieces is laid out as its own line or box (not a word in bold mid-sentence)
    function boxy(e) { while (e && e !== n) { var d = getComputedStyle(e).display; if (d !== 'inline' && d !== 'contents') return e; e = e.parentElement; } return n; }
    nodes.forEach(function (t) {
      var p = boxy(t.parentElement);
      if (full && p !== lastP) bounds.push(full.length);
      lastP = p; full += t.textContent;
    });
    var re = /[^.!?…]+(?:[.!?…]+["”’)\]]*|$)/g, m;
    while ((m = re.exec(full))) {
      if (!m[0]) { re.lastIndex++; continue; }
      var s = m[0], lead = s.length - s.replace(/^\s+/, '').length, t = s.trim();
      if (t && /[A-Za-z0-9\u00C0-\u017F]/.test(t)) out.push({ text: speakable(full, bounds, m.index + lead, m.index + lead + t.length), from: m.index + lead, to: m.index + lead + t.length });
    }
    out = out.filter(function (o) { return /[A-Za-z0-9\u00C0-\u017F]/.test(o.text); });
    // very short pieces ("e.g.", "Dr.") join the next one
    for (var i = out.length - 2; i >= 0; i--) if (out[i].text.length < 12) { out[i + 1].text = out[i].text + ' ' + out[i + 1].text; out[i + 1].from = out[i].from; out.splice(i, 1); }
    return { nodes: nodes, list: out };
  }
  function rangeFor(nodes, from, to) {
    var r = document.createRange(), at = 0, set = false;
    for (var i = 0; i < nodes.length; i++) {
      var len = nodes[i].textContent.length;
      if (!set && from <= at + len) { r.setStart(nodes[i], Math.max(0, from - at)); set = true; }
      if (set && to <= at + len) { r.setEnd(nodes[i], Math.max(0, to - at)); return r; }
      at += len;
    }
    if (set && nodes.length) r.setEnd(nodes[nodes.length - 1], nodes[nodes.length - 1].textContent.length);
    return set ? r : null;
  }

  var voice = null;
  function pickVoice() {
    var vs = synth ? synth.getVoices() : [];
    var lang = PAGE_LANG.replace('_', '-');
    // the page's own language first (the Spanish page is read in Spanish, a Latin American voice first), then English
    var base = lang.split('-')[0];
    function L(v) { return (v.lang || '').toLowerCase().replace('_', '-'); }
    if (base !== 'en') {
      var mine = vs.filter(function (v) { return L(v).indexOf(base) === 0; });
      voice = mine.filter(function (v) { return L(v) === lang; })[0] ||
        mine.filter(function (v) { return /^es-(419|us|mx|co|ar|cl|pe)/.test(L(v)); })[0] || mine[0] || null;
      return vs.length;   // no voice in the page's language: the browser picks one from u.lang, never an English voice
    }
    voice = vs.filter(function (v) { return L(v) === lang && v.localService; })[0] ||
      vs.filter(function (v) { return v.lang && v.lang.toLowerCase().indexOf('en') === 0 && v.default; })[0] ||
      vs.filter(function (v) { return v.lang && v.lang.toLowerCase().indexOf('en-us') === 0; })[0] ||
      vs.filter(function (v) { return v.lang && v.lang.toLowerCase().indexOf('en') === 0; })[0] || null;
    return vs.length;
  }

  // ---------- the reader ----------
  var S = { queue: [], bi: 0, si: 0, playing: false, paused: false, token: 0, blockEl: null, host: null };
  var bar = null;
  function clearMarks() {
    if (HL) { try { CSS.highlights.delete('tol-listen'); } catch (e) {} }
    if (S.blockEl) S.blockEl.classList.remove('tol-listen-now');
    S.blockEl = null;
  }
  function mark(block, sent) {
    if (S.blockEl !== block) { if (S.blockEl) S.blockEl.classList.remove('tol-listen-now'); block.classList.add('tol-listen-now'); S.blockEl = block; }
    if (HL) {
      var r = rangeFor(sent.nodes, sent.from, sent.to);
      try { if (r) CSS.highlights.set('tol-listen', new Highlight(r)); } catch (e) {}
    }
    var rect = block.getBoundingClientRect(), top = (parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--tol-bar-h')) || 60) + 70;
    if (rect.top < top || rect.bottom > window.innerHeight - 90) {
      var still = document.documentElement.classList.contains('tol-still') || (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
      window.scrollTo({ top: window.scrollY + rect.top - top - 10, behavior: still ? 'auto' : 'smooth' });
    }
  }
  function speakNext() {
    var my = ++S.token;
    while (S.bi < S.queue.length) {
      var q = S.queue[S.bi];
      if (!q.s) q.s = sentences(q.el);
      if (S.si < q.s.list.length) break;
      S.bi++; S.si = 0;
    }
    if (S.bi >= S.queue.length) { finish(); return; }
    var block = S.queue[S.bi], sent = block.s.list[S.si];
    mark(block.el, { nodes: block.s.nodes, from: sent.from, to: sent.to });
    var u = new SpeechSynthesisUtterance(sent.text);
    u.rate = rate; if (voice) { u.voice = voice; u.lang = voice.lang; } else u.lang = ES ? 'es-US' : (document.documentElement.lang || 'en-US');
    var done = false, guard = setTimeout(next, sent.text.split(/\s+/).length * 900 / rate + 5000);
    function next() { if (done || my !== S.token) return; done = true; clearTimeout(guard); S.si++; if (S.playing && !S.paused) speakNext(); }
    u.onend = next; u.onerror = function (e) { if (e && (e.error === 'interrupted' || e.error === 'canceled')) { clearTimeout(guard); return; } next(); };
    synth.speak(u);
    status();
  }
  function start(blocks, fromIndex) {
    stop(true);
    S.queue = blocks.map(function (b) { return { el: b, s: null }; });
    S.bi = Math.max(0, fromIndex || 0); S.si = 0; S.playing = true; S.paused = false;
    showBar(); speakNext();
  }
  function pause() { if (!S.playing || S.paused) return; S.paused = true; S.token++; synth.cancel(); status(); }
  function resume() { if (!S.playing || !S.paused) return; S.paused = false; speakNext(); }
  function stop(quiet) {
    S.token++; if (synth) synth.cancel();
    S.playing = false; S.paused = false; clearMarks(); pickMode(false);
    if (!quiet) { status(); hideBar(); }
  }
  function finish() { S.playing = false; clearMarks(); status(T('Finished reading.', 'Terminó la lectura.')); setTimeout(function () { if (!S.playing) hideBar(); }, 2500); }
  window.addEventListener('pagehide', function () { if (synth) synth.cancel(); });

  // ---------- the player strip (fixed near the top while reading) ----------
  function showBar() {
    if (!bar) {
      bar = document.createElement('div');
      bar.className = 'tol-listen-bar'; bar.setAttribute('role', 'region'); bar.setAttribute('aria-label', T('Reading aloud', 'Lectura en voz alta'));
      bar.innerHTML = '<button type="button" data-l="pause"></button>' +
        '<button type="button" data-l="stop"><span aria-hidden="true">&#9632;</span> ' + T('Stop', 'Parar') + '</button>' +
        '<label class="tol-listen-speed"><span class="sr-only">' + T('Speed', 'Velocidad') + '</span><select data-l="rate">' + RATES.map(function (r) { return '<option value="' + r[0] + '"' + (+r[0] === rate ? ' selected' : '') + '>' + r[1] + '</option>'; }).join('') + '</select></label>' +
        '<button type="button" data-l="here" aria-pressed="false">' + T('Read from here', 'Leer desde aquí') + '</button>' +
        '<p class="tol-listen-status" aria-live="polite"></p>';
      bar.addEventListener('click', function (e) {
        var b = e.target.closest('button'); if (!b) return;
        var a = b.getAttribute('data-l');
        if (a === 'pause') { if (S.paused) resume(); else pause(); }
        if (a === 'stop') stop();
        if (a === 'here') pickMode(b.getAttribute('aria-pressed') !== 'true');
      });
      bar.querySelector('select').addEventListener('change', function (e) {
        rate = +e.target.value || 1; lsSet('tol-listen-rate', String(rate));
        if (S.playing && !S.paused) { S.token++; synth.cancel(); speakNext(); }
      });
      document.body.appendChild(bar);
    }
    bar.hidden = false; status();
  }
  function hideBar() { if (bar) { bar.hidden = true; pickMode(false); } var f = document.querySelector('.tol-listen-go'); if (f && bar && bar.contains(document.activeElement)) f.focus(); }
  function status(msg) {
    if (!bar) return;
    var p = bar.querySelector('[data-l="pause"]');
    p.innerHTML = S.paused ? '<span aria-hidden="true">&#9654;</span> ' + T('Resume', 'Seguir') : '<span aria-hidden="true">&#10074;&#10074;</span> ' + T('Pause', 'Pausa');
    p.disabled = !S.playing;
    bar.querySelector('.tol-listen-status').textContent = msg || (S.picking ? T('Tap a paragraph to start there, or press Enter to start at the top of the screen.', 'Toca un párrafo para empezar ahí, o presiona Enter para empezar arriba de la pantalla.') : S.paused ? T('Paused.', 'En pausa.') : S.playing ? '' : '');
  }

  // "Read from here": tap a paragraph, or press Enter to start at the top of the screen
  S.picking = false;
  function blocksNow() { return blocksIn(S.host || document.querySelector('main') || document.body); }
  function pickMode(on) {
    S.picking = !!on;
    document.documentElement.classList.toggle('tol-listen-picking', S.picking);
    if (bar) { var h = bar.querySelector('[data-l="here"]'); if (h) h.setAttribute('aria-pressed', String(S.picking)); status(); }
  }
  function fromScreenTop() {
    var list = blocksNow(), top = (parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--tol-bar-h')) || 60) + 10;
    for (var i = 0; i < list.length; i++) if (list[i].getBoundingClientRect().bottom > top) return start(list, i);
    start(list, 0);
  }
  document.addEventListener('click', function (e) {
    if (!S.picking || (bar && bar.contains(e.target))) return;
    var list = blocksNow(), hit = null;
    for (var i = 0; i < list.length; i++) if (list[i].contains(e.target)) { hit = i; }
    if (hit === null) return;
    e.preventDefault(); e.stopPropagation();
    pickMode(false); start(list, hit);
  }, true);
  document.addEventListener('keydown', function (e) {
    if (!S.picking) return;
    if (e.key === 'Enter') { e.preventDefault(); pickMode(false); fromScreenTop(); }
    if (e.key === 'Escape') { pickMode(false); }
  });

  // ---------- the Listen button at the top of a reading page ----------
  // a page can put its own big "Listen to this chapter" row at the top (<div data-listen-top hidden> with
  // .tol-listen-top-go and .tol-listen-here buttons): it is shown and wired here instead of adding a second one,
  // and its "(about N min)" is worked out from the words that will actually be read (about 150 a minute)
  function wireTop(top, main) {
    if (top.__tolListen) return top;
    top.__tolListen = true;
    var go = top.querySelector('.tol-listen-top-go'), here = top.querySelector('.tol-listen-here');
    top.classList.add('tol-listen');
    if (go) {
      go.classList.add('tol-listen-go');
      var words = 0;
      blocksIn(main).forEach(function (b) { words += (textOf(b).match(/\S+/g) || []).length; });
      var len = go.querySelector('.tol-listen-len');
      if (len && words > 60) len.textContent = T('(about ', '(unos ') + Math.max(1, Math.round(words / 150)) + ' min)';
      go.addEventListener('click', function () { S.host = main; start(blocksIn(main), 0); });
    }
    if (here) here.addEventListener('click', function () { S.host = main; showBar(); pickMode(true); status(); });
    top.hidden = false;
    return top;
  }
  function mount(opts) {
    opts = opts || {};
    var main = opts.host || document.querySelector('main');
    var top = main && main.querySelector('[data-listen-top]');
    if (top) return wireTop(top, main);
    if (!main || document.querySelector('.tol-listen') || /^\/(index\.html)?$/.test(location.pathname)) return;   // the home page gets the card buttons only
    var box = document.createElement('div');
    box.className = 'tol-listen no-bubble no-cheer';
    box.innerHTML = '<button type="button" class="tol-listen-go"><svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false"><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" fill="currentColor"/><path d="M15.5 8.5a5 5 0 0 1 0 7M18 6a8.5 8.5 0 0 1 0 12" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/></svg> ' + T('Listen to this page', 'Escuchar esta página') + '</button>' +
      '<button type="button" class="tol-listen-here">' + T('Read from where I am', 'Leer desde aquí') + '</button>';
    box.querySelector('.tol-listen-go').addEventListener('click', function () { S.host = main; start(blocksIn(main), 0); });
    box.querySelector('.tol-listen-here').addEventListener('click', function () { S.host = main; showBar(); pickMode(true); status(); });
    var anchor = opts.after || main.querySelector(':scope > .read-head') || main.querySelector('.read-head');
    if (anchor && anchor.parentNode) anchor.parentNode.insertBefore(box, anchor.nextSibling); else main.insertBefore(box, main.firstChild);
    return box;
  }
  // read one element on its own (a mini dive, a glossary entry); the button shows it's playing
  function readEl(node, btn) {
    if (!ok) return;
    if (btn && btn.getAttribute('aria-pressed') === 'true') { stop(); return; }
    S.host = node; start(blocksIn(node).length ? blocksIn(node) : [node], 0);
    if (btn) {
      btn.setAttribute('aria-pressed', 'true');
      var t = setInterval(function () { if (!S.playing) { btn.setAttribute('aria-pressed', 'false'); clearInterval(t); } }, 400);
    }
  }
  function button(label) {
    var b = document.createElement('button'); b.type = 'button'; b.className = 'tol-listen-mini'; b.setAttribute('aria-pressed', 'false');
    b.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false"><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" fill="currentColor"/><path d="M15.5 8.5a5 5 0 0 1 0 7" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/></svg> ' + (label || T('Listen', 'Escuchar'));
    return b;
  }

  // ---------- "Listen" on the cards people use most ----------
  // [selector, label, where the button goes: 'after' a heading inside the card, or 'before' the card]
  var CARDS = [
    ['.tol-inshort', T('Listen', 'Escuchar'), '.tol-inshort-h'],
    ['.ten-steps > li', T('Listen to this step', 'Escuchar este paso'), 'h2, h3'],
    ['ul:has(> li > a.hh-card)', T('Listen to these choices', 'Escuchar estas opciones'), null],
    ['#forecast', T('Listen to your forecast', 'Escuchar tu pronóstico'), '.fc-head'],
    ['#lq-res', T('Listen to your result', 'Escuchar tu resultado'), 'h2, h3'],
    ['.cb-done', T('Listen', 'Escuchar'), null],
    ['[data-listen-card]', null, 'h2, h3, h4']
  ];
  function wireCard(card, label, head) {
    if (card.__tolCard || card.closest('.tol-listen-bar, [hidden]')) return;
    card.__tolCard = true;
    var row = document.createElement('p');
    row.className = 'tol-listen-cardrow no-bubble no-cheer';
    var lb = label || card.getAttribute('data-listen-card') || T('Listen', 'Escuchar');
    var b = button(lb);
    // the button says what it reads: "Listen to this step: Check your own weather"
    var h = /^(LI|SECTION|ARTICLE|DIV)$/.test(card.tagName) && !/^(forecast|lq-res)$/.test(card.id) && card.querySelector('h2, h3, h4');
    if (h && h.textContent.trim()) b.setAttribute('aria-label', lb + ': ' + h.textContent.replace(PIC, '').replace(/\s+/g, ' ').trim().slice(0, 80));
    b.addEventListener('click', function () { readEl(card, b); });
    row.appendChild(b);
    var at = head ? card.querySelector(head) : null;
    if (head === null || card.tagName === 'UL' || card.tagName === 'OL') card.parentNode.insertBefore(row, card);
    else if (at && at.parentNode) at.parentNode.insertBefore(row, at.nextSibling);
    else card.insertBefore(row, card.firstChild);
  }
  function cards(root) {
    if (!ok) return;
    var main = root || document.querySelector('main'); if (!main) return;
    CARDS.forEach(function (c) {
      var list; try { list = main.querySelectorAll(c[0]); } catch (e) { return; }   // :has() on older browsers
      Array.prototype.forEach.call(list, function (card) { if (card.textContent.trim().length > 20) wireCard(card, c[1], c[2]); });
    });
  }
  var cardTimer = null;
  function watchCards() {
    var main = document.querySelector('main'); if (!main || !window.MutationObserver) return;
    cards(main);
    new MutationObserver(function (list) {
      // our own buttons and the reading marks don't count as new cards
      if (list.every(function (m) { return Array.prototype.every.call(m.addedNodes, function (n) { return n.nodeType !== 1 || /tol-listen/.test(n.className || ''); }); })) return;
      clearTimeout(cardTimer); cardTimer = setTimeout(function () { cards(main); }, 400);
    }).observe(main, { childList: true, subtree: true });
  }

  var ready = false, waiting = [];
  function whenVoices(cb) {
    if (!ok) return;
    if (ready) return cb();
    waiting.push(cb);
    if (waiting.length > 1) return;
    function go() { if (ready) return; ready = true; pickVoice(); waiting.forEach(function (f) { try { f(); } catch (e) {} }); waiting = []; }
    if (pickVoice()) return go();
    try { synth.addEventListener('voiceschanged', function () { if (pickVoice()) go(); }); } catch (e) {}
    setTimeout(function () { if (pickVoice() || /iPhone|iPad|iPod|Macintosh|Android/.test(navigator.userAgent)) go(); }, 1500); // some devices only list voices once asked
  }
  window.TOLListen = { ok: ok, mount: function (o) { whenVoices(function () { mount(o); }); }, read: readEl, button: button, stop: stop, whenReady: whenVoices, cards: cards };
  whenVoices(watchCards);
  document.dispatchEvent(new CustomEvent('tol-listen-ready'));
})();
