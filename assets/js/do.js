/* do.js: /do.html?want=<slug> (home28). Draws one way in from assets/js/intents-data.js: what it is for, the best first pick (large),
   then more, each with when to use it, how long it takes and a button. With no (or an unknown) ?want it shows the eight ways in.
   Without JavaScript, do.html carries a plain list of everything (tools/intents/build.js writes it). Reads nothing stored, writes
   nothing, sends nothing. */
(function () {
  'use strict';
  var D = document, I = window.TOLIntents, root = D.getElementById('dw');
  if (!I || !root) return;
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function slug() {
    var m = /[?&]want=([a-z-]+)/i.exec(location.search || '') || /^#([a-z-]+)$/i.exec(location.hash || '');
    return m ? m[1].toLowerCase() : '';
  }
  function btn(p, cls) { return '<a class="dw-btn' + (cls ? ' ' + cls : '') + '" href="' + esc(p.href) + '">' + esc(p.cta) + '<span class="sr-only">: ' + esc(p.title) + '</span></a>'; }

  function chooser() {
    var h = '<h1 class="dw-h1" id="dw-h">What do you want to do today?</h1><p class="dw-lead">Pick one. Each way in has a short list of free things to try, with the best one first.</p><div class="dw-choose">';
    I.groups.forEach(function (g) {
      h += '<div><h2 class="dw-group">' + esc(g.label) + '</h2><ul class="dw-ways">' + I.list.filter(function (n) { return n.group === g.id; }).map(function (n) {
        return '<li><a href="/do.html?want=' + n.slug + '"><span class="dw-way-t">' + esc(n.title) + '</span><span class="dw-way-n">' + esc(n.line) + '</span></a></li>';
      }).join('') + '</ul></div>';
    });
    root.innerHTML = h + '</div>';
  }

  function show(n) {
    var top = n.picks[0], rest = n.picks.slice(1);
    D.title = n.title + ': what to try · Spread Love & Acceptance';
    var meta = D.querySelector('meta[name="description"]'); if (meta) meta.setAttribute('content', n.lead);
    var h = '<header class="dw-head"><h1 class="dw-h1" id="dw-h">' + esc(n.title) + '</h1><p class="dw-lead">' + esc(n.lead) + '</p></header>' +
      '<section class="dw-top" aria-labelledby="dw-top-h"><div class="dw-top-main"><p class="dw-flag">Start here</p><h2 class="dw-top-t" id="dw-top-h">' + esc(top.title) + '</h2>' +
      '<p class="dw-top-why">' + esc(top.why) + '</p></div><div class="dw-top-side"><p class="dw-time">' + esc(top.time) + '</p>' + btn(top, 'is-big') + '</div></section>' +
      '<section class="dw-more" aria-labelledby="dw-more-h"><h2 class="dw-h2" id="dw-more-h">' + (rest.length > 1 ? 'More ways in' : 'One more way in') + '</h2><ul class="dw-list">' +
      rest.map(function (p) {
        return '<li class="dw-item"><div class="dw-item-main"><h3 class="dw-item-t">' + esc(p.title) + '</h3><p class="dw-why">' + esc(p.why) + '</p></div>' +
          '<div class="dw-item-side"><span class="dw-time">' + esc(p.time) + '</span>' + btn(p) + '</div></li>';
      }).join('') + '</ul></section>' +
      '<nav class="dw-others" aria-labelledby="dw-others-h"><h2 class="dw-h2" id="dw-others-h">Want something else?</h2><ul>' +
      I.list.filter(function (x) { return x.slug !== n.slug; }).map(function (x) { return '<li><a href="/do.html?want=' + x.slug + '">' + esc(x.title) + '</a></li>'; }).join('') +
      '</ul><p class="dw-ask">Not sure? <a href="/ask.html">Tell Professor Puddles what&rsquo;s going on</a>, or <a href="/explore.html">browse everything</a>.</p></nav>';
    root.innerHTML = h;
  }

  var n = I.get(slug());
  if (n) show(n); else chooser();
  var nj = D.querySelector('main > noscript'); if (nj) nj.remove();
})();
