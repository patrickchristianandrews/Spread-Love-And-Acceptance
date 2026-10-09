/* research-links.js: links research named in the reading to its entry on /research.html.
   It looks for a researcher's surname with a matching year nearby, in the same sentence, for example
   "Ross and Sicoly (1979)", "Gottman (1994)", "Daminger 2019" or "Lieberman and colleagues (2007)",
   and turns the first mention in each section into a small link: Ross and Sicoly (1979) ↗.
   On the Professor's Library pages, each entry's "What the research says" part also gets a
   "Sources" line listing the research that entry draws on.
   The map of studies comes from research-index.js (built by tools/research/build_research.py), which
   site.js loads first. Nothing is fetched over the network and nothing is stored. */
(function () {
  'use strict';
  if (window.TOLResearchLinks) return;
  var IDX = window.TOLResearchIndex;
  if (!IDX || !IDX.refs || !IDX.m) return;
  window.TOLResearchLinks = { version: 1 };

  var path = decodeURIComponent(location.pathname);
  if (/\/$/.test(path)) path += 'index.html';
  else if (!/\.[a-z0-9]+$/i.test(path)) path += '.html';
  if (path === '/research.html') return;
  var main = document.querySelector('main');
  if (!main) return;

  var PAGE = '/research.html#ref-';
  var LETTER = /[A-Za-zÀ-ɏ'’-]/;          // characters that can sit inside a surname
  var YEAR = /(^|[^0-9])((?:18|19|20)[0-9]{2})(?![0-9]|s\b)/g;
  // what may sit between a name and its year for both to be linked together: more names, "and", "&",
  // "and colleagues", "et al.", "’s", "in", commas and brackets ("Hazan and Shaver (1987)", "Gordon and colleagues in 2012")
  var BETWEEN = /^(?:[\s,&(]|’s|'s|\band\b|\bwith\b|\bcolleagues\b|\bet al\.?|\bin\b|[A-Z][A-Za-z\u00C0-\u024F'’.-]*)*$/;
  var FIRST_STOP = /^(The|A|An|In|On|At|By|Of|And|For|From|With|When|While|After|Before|Psychologist|Psychologists|Sociologist|Researcher|Researchers|Professor|Doctor|Studies|Study|Work|Research|See|Later|Both|Also|But|So|Then|As|Like|Unlike|Since)$/;

  // ---------- the matchers: surname -> [{year, ids, strict}] ----------
  var bySur = {}, names = [];
  IDX.m.forEach(function (m) {
    if (!bySur[m[0]]) { bySur[m[0]] = []; names.push(m[0]); }
    bySur[m[0]].push({ y: m[1], ids: m[2], strict: !!m[3] });
  });
  if (!names.length) return;
  names.sort(function (a, b) { return b.length - a.length; });
  function reEsc(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
  var NAME_RE = new RegExp('(' + names.map(reEsc).join('|') + ')', 'g');

  // research this page (and this section) draws on, to settle ties like two Neff papers from 2003
  var onPage = {}, bySection = {};
  Object.keys(IDX.p || {}).forEach(function (k) {
    var parts = k.split('#');
    if (parts[0] !== path) return;
    IDX.p[k].forEach(function (id) { onPage[id] = 1; if (parts[1]) (bySection[parts[1]] = bySection[parts[1]] || {})[id] = 1; });
  });

  // ---------- small styles (no motion, no layout tricks) ----------
  if (!document.getElementById('tol-rl-css')) {
    var css = document.createElement('style');
    css.id = 'tol-rl-css';
    css.textContent =
      'a.tol-rl{ text-decoration-style:dotted; text-decoration-thickness:1px; text-underline-offset:.18em; color:inherit; }' +
      'a.tol-rl:hover, a.tol-rl:focus-visible{ text-decoration-style:solid; color:var(--credit, #3E6B4C); }' +
      '.tol-rl-i{ font-size:.78em; margin-left:.12em; color:var(--credit, #3E6B4C); }' +
      '.tol-vh{ position:absolute !important; width:1px; height:1px; padding:0; margin:-1px; overflow:hidden; clip:rect(0 0 0 0); white-space:nowrap; border:0; }' +
      '.read p.tol-rsrc{ font-size:.92rem; color:var(--ink-soft, #5A5346); margin-top:.4rem; overflow-wrap:anywhere; }' +
      '.tol-rsrc-k{ font-weight:600; color:var(--ink, #2B2620); }' +
      'html.tol-quiet .tol-rl-i{ display:none; }' +
      '@media print{ .tol-rl-i{ display:none; } a.tol-rl{ text-decoration:none; } }';
    document.head.appendChild(css);
  }

  // ---------- where to look ----------
  var SKIP = 'a, button, label, input, textarea, select, option, code, pre, kbd, samp, h1, h2, h3, h4, h5, h6, nav, script, style, svg, noscript, ' +
    'header, footer, [aria-hidden="true"], [contenteditable], .no-research, .lib-toc, .lib-aka, .tol-rsrc, .read-head';
  var BLOCKS = 'p, li, dd, dt, blockquote, td, th, figcaption, summary';
  function skipped(node) {
    var el = node.nodeType === 1 ? node : node.parentElement;
    if (!el || !main.contains(el)) return true;
    if (el.closest(SKIP)) return true;
    // things the site adds on top of the reading (helpers, pop-ups, cards) all carry a tol- class
    for (var e = el; e && e !== main; e = e.parentElement) {
      if (typeof e.className === 'string' && /(^|\s)tol-(?!rl)/.test(e.className)) return true;
    }
    return false;
  }

  // sentence end after `from`: a full stop, ! or ? followed by a space, unless it ends an initial or "et al."
  function sentenceEnd(s, from, limit) {
    var stop = Math.min(s.length, from + limit);
    for (var i = from; i < stop; i++) {
      var c = s.charAt(i);
      if (c !== '.' && c !== '!' && c !== '?' && c !== ';') continue;
      if (i + 1 < s.length && !/\s/.test(s.charAt(i + 1))) continue;
      if (c === '.') {
        var before = s.slice(Math.max(0, i - 4), i);
        if (/(^|[\s.(])[A-Z]$/.test(before) || /(al|eds?|vol|pp|no|vs|Dr|St|e\.g|i\.e)$/i.test(before)) continue;
      }
      return i;
    }
    return stop;
  }
  function sentenceStart(s, at, limit) {
    var lo = Math.max(0, at - limit);
    for (var i = at - 1; i >= lo; i--) {
      var c = s.charAt(i);
      if ((c === '.' || c === '!' || c === '?' || c === ';') && /\s/.test(s.charAt(i + 1) || ' ')) {
        var before = s.slice(Math.max(0, i - 4), i);
        if (c === '.' && (/(^|[\s.(])[A-Z]$/.test(before) || /(al|eds?|vol|pp|no|vs|Dr|St|e\.g|i\.e)$/i.test(before))) continue;
        return i + 1;
      }
    }
    return lo;
  }

  function pickId(ids, around, sectionId) {
    if (ids.length === 1) return ids[0];
    var sec = bySection[sectionId] || {};
    var i;
    for (i = 0; i < ids.length; i++) if (sec[ids[i]]) return ids[i];
    // a second author named nearby ("Epley and Schroeder")
    for (i = 0; i < ids.length; i++) {
      var a = (IDX.refs[ids[i]] || {}).a || '', parts = a.split(' & ');
      if (parts[1] && around.indexOf(parts[1]) !== -1) return ids[i];
    }
    for (i = 0; i < ids.length; i++) if (onPage[ids[i]]) return ids[i];
    return ids[0];
  }

  // ---------- find mentions in one block of text ----------
  function textNodes(block) {
    var out = [], w = document.createTreeWalker(block, NodeFilter.SHOW_TEXT, null), n, pos = 0;
    while ((n = w.nextNode())) {
      if (skipped(n)) { out.push({ n: n, s: pos, e: pos + n.data.length, skip: true }); pos += n.data.length; continue; }
      out.push({ n: n, s: pos, e: pos + n.data.length }); pos += n.data.length;
    }
    return out;
  }
  function nodeAt(nodes, i) { for (var k = 0; k < nodes.length; k++) if (i >= nodes[k].s && i < nodes[k].e) return nodes[k]; return null; }

  function findMentions(full, nodes, sectionId) {
    var found = [], m;
    NAME_RE.lastIndex = 0;
    while ((m = NAME_RE.exec(full))) {
      var ns = m.index, ne = ns + m[1].length, sur = m[1];
      if (ns > 0 && LETTER.test(full.charAt(ns - 1))) continue;           // inside a longer word ("Kübler-Ross")
      if (ne < full.length && /[A-Za-zÀ-ɏ]/.test(full.charAt(ne))) continue;
      var tn = nodeAt(nodes, ns);
      if (!tn || tn.skip || ne > tn.e) continue;
      var list = bySur[sur];
      // an optional first name or initial just before ("Jeffrey Hall", "J. Stacy Adams" -> "Stacy Adams")
      var pre = full.slice(Math.max(tn.s, ns - 30), ns), fm = /([A-Z][A-Za-zÀ-ɏ'’-]+|[A-Z]\.)\s$/.exec(pre), start = ns;
      if (fm && !FIRST_STOP.test(fm[1])) start = ns - fm[0].length;
      var after = full.slice(ne, ne + 16);
      if (list[0].strict && start === ns && !/^(’s|'s)?\s*(\(|,\s*(18|19|20)\d\d|and\s+[A-Z]|&|et al)/.test(after)) continue;
      // the name has its own year right after it, and it is not one we know for this name: a different work
      var own = /^(?:’s|'s)?\s*[(,]\s*((?:18|19|20)\d\d)/.exec(after);
      if (own && !list.some(function (x) { return x.y === +own[1]; })) continue;
      // named second ("Pruitt and Kim", "Algoe, Gable and Maisel"): only when the name before it is a co-author we know
      var co = /([A-Z][A-Za-z\u00C0-\u024F'’-]+)(?:’s|'s)?\s*(,|\band\b|&)\s*$/.exec(full.slice(Math.max(0, start - 40), start));
      if (co && co[2] === ',' && !bySur[co[1]]) co = null;   // "However, Gottman (1994)" is not a co-author
      if (co && !list.some(function (x) { return x.ids.some(function (id) { return ((IDX.refs[id] || {}).a || '').indexOf(co[1]) !== -1; }); })) continue;
      // a matching year: first later in the sentence, then earlier in it
      var endS = sentenceEnd(full, ne, 160), seg = full.slice(ne, endS), y, hit = null;
      YEAR.lastIndex = 0;
      while ((y = YEAR.exec(seg))) {
        var yr = +y[2];
        for (var j = 0; j < list.length; j++) if (list[j].y === yr) { hit = { e: list[j], ys: ne + y.index + y[1].length, ye: ne + y.index + y[1].length + 4, fwd: true }; break; }
        if (hit) break;
      }
      if (!hit) {
        var begS = sentenceStart(full, ns, 140), back = full.slice(begS, ns), best = null;
        YEAR.lastIndex = 0;
        while ((y = YEAR.exec(back))) {
          for (var k = 0; k < list.length; k++) if (list[k].y === +y[2]) best = { e: list[k], fwd: false };
        }
        hit = best;
      }
      if (!hit) continue;
      var around = full.slice(Math.max(0, ns - 80), Math.min(full.length, ne + 120));
      var id = pickId(hit.e.ids, around, sectionId);
      // what to link: "Ross and Sicoly (1979)" when it is short and in one piece of text, otherwise the name
      var end = ne;
      if (hit.fwd && hit.ye - ns <= 48 && hit.ye <= tn.e && BETWEEN.test(full.slice(ne, hit.ys))) {
        end = hit.ye;
        if (full.charAt(end) === ')' && end < tn.e && full.slice(ns, end).indexOf('(') !== -1) end++;
      }
      found.push({ id: id, s: start, e: end, node: tn });
    }
    return found;
  }

  function linkFor(id, text) {
    var r = IDX.refs[id] || {};
    var a = document.createElement('a');
    a.className = 'tol-rl';
    a.href = PAGE + encodeURIComponent(id);
    a.title = 'About this research: ' + (r.a || '') + (r.y ? ' (' + r.y + ')' : '') + (r.t ? ', ' + r.t : '');
    a.appendChild(document.createTextNode(text));
    var vh = document.createElement('span'); vh.className = 'tol-vh'; vh.textContent = ' (about this research)';
    var ic = document.createElement('span'); ic.className = 'tol-rl-i'; ic.setAttribute('aria-hidden', 'true'); ic.textContent = '↗';
    a.appendChild(vh); a.appendChild(ic);
    return a;
  }

  function wrap(f) {
    var n = f.node.n, s = f.s - f.node.s, e = f.e - f.node.s;
    if (s < 0 || e > n.data.length || s >= e) return false;
    var mid = n.splitText(s), rest = mid.splitText(e - s);
    var a = linkFor(f.id, mid.data);
    mid.parentNode.replaceChild(a, mid);
    return !!rest;
  }

  // ---------- walk the reading, section by section ----------
  var linked = 0;
  function run() {
    var els = main.querySelectorAll('h2, article, section, ' + BLOCKS), seen = {}, sectionId = '';
    for (var i = 0; i < els.length; i++) {
      var el = els[i], tag = el.tagName;
      if (tag === 'H2' || tag === 'ARTICLE' || tag === 'SECTION') {
        seen = {};
        if (el.id) sectionId = el.id;
        else if (tag === 'H2' && el.parentElement && el.parentElement.id && el.parentElement !== main) sectionId = el.parentElement.id;
        continue;
      }
      if (el.querySelector(BLOCKS)) continue;              // the inner block will be read on its own
      if (skipped(el)) continue;
      var nodes = textNodes(el);
      if (!nodes.length) continue;
      var full = nodes.map(function (x) { return x.n.data; }).join('');
      if (!/(18|19|20)\d\d/.test(full)) continue;
      var found = findMentions(full, nodes, sectionId).filter(function (f) {
        if (seen[f.id]) return false;
        seen[f.id] = 1;
        return true;
      });
      // wrap from the end, so earlier positions stay correct
      found.sort(function (a, b) { return b.s - a.s; });
      var lastStart = Infinity;
      found.forEach(function (f) { if (f.e <= lastStart && wrap(f)) { linked++; lastStart = f.s; } });
    }
  }

  // ---------- "Sources" lines on the Library entries ----------
  var sources = 0;
  function sourcesLines() {
    if (!/^\/library\//.test(path)) return;
    var arts = main.querySelectorAll('article.lib-entry[id]');
    for (var i = 0; i < arts.length; i++) {
      var art = arts[i], ids = (IDX.p || {})[path + '#' + art.id];
      if (!ids || !ids.length || art.querySelector('.tol-rsrc')) continue;
      var h = null, hs = art.querySelectorAll('h3');
      for (var j = 0; j < hs.length; j++) if (/^What the research says/i.test(hs[j].textContent.trim())) { h = hs[j]; break; }
      if (!h) continue;
      var last = h;
      while (last.nextElementSibling && last.nextElementSibling.tagName === 'P' && !last.nextElementSibling.classList.contains('lib-own-k')) last = last.nextElementSibling;
      var list = ids.filter(function (id) { return IDX.refs[id]; }).sort(function (a, b) { return (IDX.refs[a].y || 0) - (IDX.refs[b].y || 0); });
      if (!list.length) continue;
      var p = document.createElement('p');
      p.className = 'tol-rsrc';
      var k = document.createElement('span'); k.className = 'tol-rsrc-k'; k.textContent = 'Sources: ';
      p.appendChild(k);
      list.forEach(function (id, n) {
        var r = IDX.refs[id];
        if (n) p.appendChild(document.createTextNode(n === list.length - 1 ? ' and ' : ', '));
        p.appendChild(linkFor(id, r.a + (r.y ? ' (' + r.y + ')' : '')));
      });
      p.appendChild(document.createTextNode('.'));
      last.parentNode.insertBefore(p, last.nextSibling);
      sources++;
    }
  }

  try { run(); } catch (e) { /* the reading still works without the links */ }
  try { sourcesLines(); } catch (e) {}
  window.TOLResearchLinks.linked = linked;
  window.TOLResearchLinks.sources = sources;
})();
