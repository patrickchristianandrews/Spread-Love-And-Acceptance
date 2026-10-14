/* tool-guide.js: a compact, collapsible "About this tool" panel at the end of a tool page.
   Use: put <div data-tool-guide="TOOL-ID"></div> after the tool, and load this file:
     <script src="/assets/js/tool-guide.js" defer></script>
   It loads its own words (/assets/js/tool-guide-data.js) and styles (/assets/css/tool-guide.css) when they
   aren't on the page already. The panel starts closed; a link to #about-this-tool opens it.
   What it shows: when to use it (and when not), how long, what a useful result looks like (with a filled-in
   example from the book when /tools/book/examples.json has one), what to do afterward, what it is based on
   (research vs. this site's own idea, and its limits), using it fairly, and privacy.
   Nothing is stored and nothing is sent: the only request is for the site's own examples list, made the first
   time someone opens the panel. */
(function () {
  'use strict';
  if (window.TOLToolGuide) return;
  var doc = document;
  var BASE = '/assets/';
  var DATA_SRC = BASE + 'js/tool-guide-data.js';
  var CSS_HREF = BASE + 'css/tool-guide.css';
  var EXAMPLES = '/tools/book/examples.json';
  var examplesP = null;
  var seq = 0;

  function esc(t) { return String(t == null ? '' : t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function pathOf(u) {
    if (!u) return '';
    var s = String(u).split('#')[0].split('?')[0];
    s = s.replace(/^https?:\/\/[^/]+/, '');
    if (s.charAt(0) !== '/') s = '/' + s;
    return s.replace(/\/$/, '/index.html');
  }
  function queryOf(u) { var m = /\?([^#]*)/.exec(String(u || '')); return m ? m[1] : ''; }

  function ensureCss() {
    var links = doc.querySelectorAll('link[rel="stylesheet"]');
    for (var i = 0; i < links.length; i++) if ((links[i].getAttribute('href') || '').indexOf('tool-guide.css') >= 0) return;
    var l = doc.createElement('link'); l.rel = 'stylesheet'; l.href = CSS_HREF; doc.head.appendChild(l);
  }
  function ensureData(cb) {
    if (window.TOLToolGuideData) { cb(); return; }
    var s = doc.querySelector('script[src*="tool-guide-data.js"]');
    if (!s) { s = doc.createElement('script'); s.src = DATA_SRC; doc.head.appendChild(s); }
    s.addEventListener('load', function () { cb(); });
    s.addEventListener('error', function () { /* no data: leave the placeholder empty */ });
  }

  // the tools registry (window.TOLTools, /assets/js/tools-registry.js) names every tool plainly; when it is on the
  // page, its name wins for the entry this tool points at (t.reg), so a rename there shows here too
  function registryName(t) {
    var list = window.TOLTools;
    if (!t.reg || !Array.isArray(list)) return '';
    // a merged tool's old id still finds the tool it now lives in
    if (typeof window.TOLToolById === 'function') { var hit = window.TOLToolById(t.reg); return hit ? hit.name || '' : ''; }
    for (var i = 0; i < list.length; i++) if (list[i] && list[i].id === t.reg) return list[i].name || '';
    return '';
  }

  function loadExamples() {
    if (!examplesP) {
      examplesP = (window.fetch ? fetch(EXAMPLES, { credentials: 'same-origin' }) : Promise.reject())
        .then(function (r) { if (!r.ok) throw new Error('no examples'); return r.json(); })
        .then(function (j) { return Array.isArray(j) ? j : (j && (j.examples || j.items)) || []; })
        .catch(function () { return []; });
    }
    return examplesP;
  }
  function exampleHref(e) {
    if (e.href) return e.href;
    if (e.url) return e.url;
    if (!e.id || !e.chapter) return '';
    var ch = String(e.chapter);
    if (ch.charAt(0) !== '/') ch = '/book/' + ch;
    if (!/\.html$/.test(ch)) ch += '.html';
    return ch + '#' + e.id;
  }
  function findExample(t, list) {
    var here = (location.search || '').replace(/^\?/, ''), best = null;
    for (var i = 0; i < list.length; i++) {
      var e = list[i] || {};
      var tools = [].concat(e.tool || [], e.tools || []);
      for (var j = 0; j < tools.length; j++) {
        if (t.pages.indexOf(pathOf(tools[j])) < 0) continue;
        if (!exampleHref(e)) continue;
        if (here && queryOf(tools[j]) === here) return e;
        if (!best) best = e;
      }
    }
    return best;
  }
  function showExample(box, t) {
    var slot = box.querySelector('.tg-ex');
    if (!slot || slot.getAttribute('data-done')) return;
    slot.setAttribute('data-done', '1');
    if (t.ex && t.ex[0]) { fillEx(slot, t.ex[0], t.ex[1]); return; }
    loadExamples().then(function (list) {
      var e = findExample(t, list);
      if (e) fillEx(slot, exampleHref(e), e.title);
    });
  }
  function fillEx(slot, href, title) {
    slot.innerHTML = '<a href="' + esc(href) + '">See a filled-in example</a>' +
      (title ? ' <span class="tg-soft">' + esc(String(title).replace(/^Filled-in example:?\s*/i, '')) + '</span>' : '');
    slot.hidden = false;
  }

  function list(items, cls) {
    return '<ul class="' + cls + '">' + items.map(function (x) { return '<li>' + x + '</li>'; }).join('') + '</ul>';
  }

  function build(id, t, shared) {
    var n = ++seq;
    var name = registryName(t) || t.name || '';
    var hid = 'tg-h-' + n;
    var limits = t.limits || '';
    if (limits && !/therapy|clinical|treatment|diagnos/i.test(limits)) limits += ' It is self-help, not therapy.';

    var h = '';
    h += '<summary class="tg-sum"><span class="tg-sum-t" id="' + hid + '">About this tool</span>' +
      (name ? '<span class="tg-sum-n">' + esc(name) + '</span>' : '') +
      '<span class="tg-sum-s">When to use it, how long, what it’s based on, and privacy</span></summary>';
    h += '<div class="tg-body">';

    h += '<div class="tg-grid">';
    h += '<section class="tg-b"><h3 class="tg-h">When to use it</h3><p>' + t.when + '</p>' +
      (t.notWhen ? '<p class="tg-not"><strong>When not to:</strong> ' + t.notWhen + '</p>' : '') + '</section>';
    h += '<section class="tg-b"><h3 class="tg-h">How long</h3><p>' + t.time + '</p></section>';
    h += '<section class="tg-b"><h3 class="tg-h">What a useful result looks like</h3><p>' + t.result + '</p>' +
      '<p class="tg-ex" hidden></p></section>';
    if (t.next && t.next.length) {
      h += '<section class="tg-b"><h3 class="tg-h">Afterward</h3><ol class="tg-next">' + t.next.slice(0, 3).map(function (x) {
        return '<li><a href="' + esc(x[0]) + '">' + esc(x[1]) + '</a>' + (x[2] ? ' <span class="tg-soft">' + esc(x[2]) + '</span>' : '') + '</li>';
      }).join('') + '</ol></section>';
    }
    h += '</div>';

    h += '<section class="tg-basis"><h3 class="tg-h">What it’s based on</h3><div class="tg-two">';
    if (t.research && t.research.length) {
      h += '<div class="tg-tag tg-tag-r"><p class="tg-lab"><span class="tg-dot" aria-hidden="true"></span>Draws on research</p>' +
        list(t.research.map(function (r) { return '<a href="/research.html#ref-' + esc(r[0]) + '">' + esc(r[1]) + '</a>'; }), 'tg-refs') + '</div>';
    }
    if (t.idea) {
      h += '<div class="tg-tag tg-tag-i"><p class="tg-lab"><span class="tg-dot" aria-hidden="true"></span>This site’s idea</p><p>' + t.idea + ' Untested as a tool: nobody has studied this exact format.</p></div>';
    }
    h += '</div>';
    if (limits) h += '<p class="tg-limits"><strong>Limits:</strong> ' + limits + '</p>';
    h += '</section>';

    var fair = [];
    if (t.two) fair = (shared.fair || []).concat(t.fair || [], shared.disagree ? [shared.disagree] : [], shared.overload ? [shared.overload] : []);
    else if (t.fair) fair = t.fair.slice();
    if (fair.length) {
      h += '<section class="tg-fair"><h3 class="tg-h">Using it fairly</h3>' + list(fair, 'tg-list') +
        (t.two && shared.notJoint ? '<p><strong>When doing it together isn’t right:</strong> ' + shared.notJoint + '</p>' : '') + '</section>';
    }

    if (t.privacy) {
      h += '<section class="tg-priv"><h3 class="tg-h">Privacy</h3><p>' + t.privacy +
        (/on-this-device/.test(t.privacy) ? '' : ' <a href="/on-this-device.html">See everything this site keeps on this device</a>.') + '</p></section>';
    }

    h += '<p class="tg-foot"><a href="/method-and-limits.html">Method and limits</a><span aria-hidden="true"> · </span>' +
      '<a href="/research.html">The research behind the site</a><span aria-hidden="true"> · </span>' +
      '<a href="/why-this-site.html">Why use this instead of an article or an AI chat?</a></p>';
    h += '</div>';

    var box = doc.createElement('details');
    box.className = 'tg tol-plain no-bubble no-cheer no-dive';
    if (!doc.getElementById('about-this-tool')) box.id = 'about-this-tool';
    box.setAttribute('data-tool', id);
    box.innerHTML = h;
    box.addEventListener('toggle', function () { if (box.open) showExample(box, t); });
    return box;
  }

  function renderOne(el) {
    var data = window.TOLToolGuideData;
    if (!data || el.getAttribute('data-tg-done')) return;
    var id = el.getAttribute('data-tool-guide');
    var t = data.tools && data.tools[id];
    if (!t) return;
    el.setAttribute('data-tg-done', '1');
    el.classList.add('tg-wrap', 'tol-plain', 'no-bubble');
    el.innerHTML = '';
    var box = build(id, t, data.shared || {});
    el.appendChild(box);
    openFromHash();
  }

  function openFromHash() {
    if (location.hash !== '#about-this-tool') return;
    var box = doc.getElementById('about-this-tool');
    if (box && box.tagName === 'DETAILS' && !box.open) {
      box.open = true;
      try { box.scrollIntoView({ block: 'start' }); } catch (e) { box.scrollIntoView(); }
    }
  }

  function renderAll() {
    var els = doc.querySelectorAll('[data-tool-guide]');
    if (!els.length) return;
    ensureCss();
    ensureData(function () { Array.prototype.forEach.call(els, renderOne); });
  }

  window.TOLToolGuide = { render: renderAll, renderOne: renderOne };
  window.addEventListener('hashchange', openFromHash);
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', renderAll);
  else renderAll();
})();
