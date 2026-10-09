/* puddles-infographic.js — Professor Puddles draws a small poster (an "infographic") about a topic.
   Everything is drawn here, on this device, as an SVG: no images, fonts or data are fetched, and
   nothing is uploaded. Saving makes a PNG in the browser; sharing uses the device's own share menu.

   window.TOLInfographic
     render(spec[, opts])        → <svg> (viewBox 1080 wide, height to fit). svg.tolAlt is the text version.
     altText(spec)               → [lines] the same poster as plain text (for screen readers, copying, sharing)
     mount(el, spec[, opts])     → <figure> with the poster, "Save image", "Share", "Print", "Make it bigger"
                                   and "Read it as text". Re-draws itself when dark mode or Easy reading changes.
     fromCard(card[, kind, opts])  a program card or a situation playbook → spec (or null)
     fromSituation(issue[, opts])  a situation playbook (tools/chat/situations) → spec
     fromDeep(topic[, opts])       a deep.json entry {id,title,philosophy,psychology,autistic_lens,together,question,try,links}
     fromSplit(textOrData[, opts]) "me 60 them 40" / [{name, value}] → a "split" spec (a picture, never a verdict)
     fromAnswer(blocks[, opts])    the chat's answer blocks ({k:'p'|'list'|'script'|...}) → spec ("summarise this")
     fromKB(topic, KB[, opts])     find the best preset / deep topic / card / playbook for a topic → spec or null
                                   (KB = window.TOL_CHAT_KB; KB.deep may be an array or deep.json's {topics:[...]})
     parseRequest(text)            → null or { topic, last, layout } for "make an infographic about X" and friends
     presets                       { 'fair-equal', 'pursue-withdraw', 'pause', 'mental-load' } → spec
     toPNG(svg[, {scale:2, theme:'light'}]) → Promise<Blob>
     download(svg[, filename])     → Promise (saves a PNG)
     share(svg[, {title, text, url}]) → Promise<'shared'|'sheet'|'downloaded'|'cancelled'>
     print(svg)                    prints just the poster
     layouts, icons                the names this file knows

   A spec: { layout, title, subtitle?, kicker?, items?, left?, right?, bridge?, pairs?, data?, unit?, center?,
             banner?, after?, say?, sayLabel?, note?, source?, theme? }  (see tools/chat notes for the details). */
(function () {
  'use strict';
  if (typeof window === 'undefined' || window.TOLInfographic) return;

  var W = 1080, PAD = 64, INNER = W - PAD * 2;
  var SITE = 'spreadloveandacceptance.com';
  var CSS_HREF = '/assets/css/puddles-infographic.css';
  var uid = 0;

  // ------------------------------------------------------------------ stylesheet (no inline <style>: CSP)
  function linkCss() {
    try {
      if (document.querySelector('link[href="' + CSS_HREF + '"]')) return;
      var l = document.createElement('link'); l.rel = 'stylesheet'; l.href = CSS_HREF;
      document.head.appendChild(l);
    } catch (e) {}
  }

  // ------------------------------------------------------------------ themes (the site's palette)
  var THEMES = {
    light: {
      bg: '#FBF6EA', frame: '#E2D4AE', panel: '#FFFDF8', ink: '#2B2620', soft: '#5A5346', line: '#D9CBA3',
      kicker: '#7A5620', rule: '#2B2620', onDeep: '#FFFFFF', deco: ['#F7C9D4', '#C6DFF4', '#C7EBD6', '#F8E7AE', '#D9C8F0'], decoOp: 0.7,
      acc: [{ f: '#E3EFFA', e: '#8FBCE3', d: '#2B5B8C' }, { f: '#E5F3EA', e: '#8CC7A5', d: '#3E6B4C' },
            { f: '#FBF0D3', e: '#E2C063', d: '#7A5620' }, { f: '#EFE8F8', e: '#B39BDC', d: '#5B4790' },
            { f: '#FBE5EA', e: '#E79AAE', d: '#8E3550' }, { f: '#FCE9DF', e: '#E9A088', d: '#96412B' }],
      series: ['#2B5B8C', '#C08A2E', '#3E6B4C', '#7A63B0', '#B5546C', '#3E7A80']
    },
    dark: {
      bg: '#1F1C24', frame: '#3E3946', panel: '#2A2630', ink: '#F2ECDF', soft: '#CFC6B5', line: '#4C4655',
      kicker: '#E6C77F', rule: '#CFC6B5', onDeep: '#1F1C24', deco: ['#5A3A48', '#2F4760', '#2F4A3B', '#584A2A', '#41365E'], decoOp: 0.8,
      acc: [{ f: '#243449', e: '#4F7BA8', d: '#A3CCF2' }, { f: '#22372B', e: '#4F8A66', d: '#A4DAB8' },
            { f: '#3A3121', e: '#9C8240', d: '#F0D58A' }, { f: '#30293F', e: '#7C68AE', d: '#D2C3F4' },
            { f: '#3C2531', e: '#A45C73', d: '#F4B7C8' }, { f: '#3D2B23', e: '#A86A52', d: '#F6C0A8' }],
      series: ['#8CBDEB', '#E8C170', '#8FD0A8', '#BFA9EE', '#EFA3B8', '#86CACF']
    },
    contrast: {
      bg: '#FFFFFF', frame: '#000000', panel: '#FFFFFF', ink: '#000000', soft: '#1A1A1A', line: '#000000',
      kicker: '#000000', rule: '#000000', onDeep: '#FFFFFF', deco: [], decoOp: 0,
      acc: ['#0B3D6E', '#1F4D2E', '#5A3D0E', '#3F2B70', '#6E1F38', '#6B2614'].map(function (d) { return { f: '#FFFFFF', e: '#000000', d: d }; }),
      series: ['#0B3D6E', '#8A5A00', '#1F5A33', '#4B2F8A', '#8E1F45', '#145A60'], strong: true
    },
    contrastDark: {
      bg: '#000000', frame: '#FFFFFF', panel: '#000000', ink: '#FFFFFF', soft: '#EEEEEE', line: '#FFFFFF',
      kicker: '#FFFFFF', rule: '#FFFFFF', onDeep: '#000000', deco: [], decoOp: 0,
      acc: ['#A8D4FF', '#A4EBBE', '#FFDC8F', '#DCCBFF', '#FFBCD0', '#FFCBB3'].map(function (d) { return { f: '#000000', e: '#FFFFFF', d: d }; }),
      series: ['#A8D4FF', '#FFDC8F', '#A4EBBE', '#DCCBFF', '#FFBCD0', '#8FE3E8'], strong: true
    }
  };
  function htmlHas(c) { try { return document.documentElement.classList.contains(c); } catch (e) { return false; } }
  function darkNow() {
    try {
      if (window.TOLReadingOptions && typeof window.TOLReadingOptions.dark === 'function') return !!window.TOLReadingOptions.dark();
      var h = document.documentElement, t = h.getAttribute('data-theme');
      if (h.classList.contains('tol-nodark')) return false;
      if (t === 'dark') return true;
      if (t === 'light') return false;
      return !!(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
    } catch (e) { return false; }
  }
  // 'auto' follows the page: dark mode → dark; Easy reading or Quiet mode → high contrast
  function themeName(want) {
    if (want && want !== 'auto' && THEMES[want]) return want;
    var hc = htmlHas('tol-easy') || htmlHas('tol-quiet') || htmlHas('tol-contrast');
    var dk = darkNow();
    return hc ? (dk ? 'contrastDark' : 'contrast') : (dk ? 'dark' : 'light');
  }
  function fonts() {
    var easy = htmlHas('tol-font-easy');
    return easy ? { title: 'Atkinson Hyperlegible, Verdana, sans-serif', body: 'Atkinson Hyperlegible, Verdana, sans-serif', mono: 'IBM Plex Mono, Courier New, monospace' }
                : { title: 'Fraunces, Georgia, serif', body: 'Lora, Georgia, serif', mono: 'IBM Plex Mono, Courier New, monospace' };
  }

  // ------------------------------------------------------------------ text: measure, wrap, shrink, ellipsis
  var mctx = null, mcache = {};
  function measure(str, size, fam, weight, italic) {
    var key = size + '|' + fam + '|' + weight + '|' + (italic ? 1 : 0) + '|' + str;
    if (mcache[key] != null) return mcache[key];
    var w = 0;
    try {
      if (!mctx) mctx = document.createElement('canvas').getContext('2d');
      // measure with each font in the list (the web font, then its fallback) and keep the widest,
      // so the text fits whether the site's fonts are loaded or not (a saved PNG uses the fallback)
      // (and the generic family on its own, which is what shows when neither is installed)
      var list = fam.split(',').map(function (s) { return s.trim(); }), gen = list.filter(function (s) { return /^(serif|sans-serif|monospace)$/.test(s); })[0] || 'serif';
      list.filter(function (s) { return s !== gen; }).map(function (f) { return '"' + f + '", ' + gen; }).concat([gen]).forEach(function (f) {
        mctx.font = (italic ? 'italic ' : '') + (weight || 400) + ' ' + size + 'px ' + f;
        w = Math.max(w, mctx.measureText(str).width);
      });
    } catch (e) { w = 0; }
    if (!w) w = str.length * size * 0.56;
    w *= 1.04;
    mcache[key] = w;
    return w;
  }
  function splitWords(s) { return String(s || '').split(/\s+/).filter(Boolean); }
  function greedy(text, o, size, width) {
    var ws = splitWords(text), lines = [], cur = '';
    function mw(t) { return measure(t, size, o.fam, o.weight, o.italic); }
    ws.forEach(function (wd) {
      var t = cur ? cur + ' ' + wd : wd;
      if (mw(t) <= width) { cur = t; return; }
      if (cur) lines.push(cur);
      cur = wd;
      while (mw(cur) > width && cur.length > 2) { // one very long word: break it
        var k = cur.length - 1;
        while (k > 1 && mw(cur.slice(0, k) + '-') > width) k--;
        lines.push(cur.slice(0, k) + '-'); cur = cur.slice(k);
      }
    });
    if (cur) lines.push(cur);
    return lines;
  }
  // fit text into width × lines, shrinking from o.size to o.min; still too long → cut with an ellipsis
  function fit(text, o) {
    text = String(text || '').replace(/\s+/g, ' ').trim();
    var maxLines = o.lines || 3, size = o.size, min = o.min || o.size, lines;
    for (var s = size; s >= min; s -= 2) {
      lines = greedy(text, o, s, o.width);
      if (lines.length <= maxLines) {
        // "tight": shrink a little (up to 15%) when that saves a line, e.g. a lonely last word
        if (o.tight && lines.length > 1) {
          for (var t = s - 2; t >= Math.max(min, size * 0.85); t -= 2) { var l2 = greedy(text, o, t, o.width); if (l2.length < lines.length) return done(l2, t); }
        }
        return done(lines, s);
      }
    }
    lines = greedy(text, o, min, o.width).slice(0, maxLines);
    var last = lines[lines.length - 1] || '', orig = last.replace(/-$/, '');
    while (last && measure(last + '…', min, o.fam, o.weight, o.italic) > o.width) last = last.replace(/\s*\S+$/, '');
    if (!last) { last = orig; while (last.length > 1 && measure(last + '…', min, o.fam, o.weight, o.italic) > o.width) last = last.slice(0, -1); }
    lines[lines.length - 1] = last.replace(/[\s,;:.\-–—]+$/, '') + '…';
    return done(lines, min);
    function done(L, sz) { var lh = Math.round(sz * (o.lh || 1.32)); return { lines: L, size: sz, lh: lh, h: L.length * lh, o: o }; }
  }
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  // draw a fitted block; y is the top of the block
  function txt(x, y, f, a) {
    a = a || {};
    var o = f.o, base = y + (f.lh - f.size) / 2 + f.size * 0.8;
    var attrs = ' font-family="' + esc(o.fam) + '" font-size="' + f.size + '" fill="' + (a.fill || '#000') + '"' +
      (o.weight && o.weight !== 400 ? ' font-weight="' + o.weight + '"' : '') + (o.italic ? ' font-style="italic"' : '') +
      (a.anchor ? ' text-anchor="' + a.anchor + '"' : '') + (a.ls ? ' letter-spacing="' + a.ls + '"' : '');
    var out = '<text x="' + r(x) + '" y="' + r(base) + '"' + attrs + '>';
    f.lines.forEach(function (ln, i) { out += '<tspan x="' + r(x) + '"' + (i ? ' dy="' + f.lh + '"' : '') + '>' + esc(ln) + '</tspan>'; });
    return out + '</text>';
  }
  function r(n) { return Math.round(n * 10) / 10; }

  // trim long text gracefully: whole sentences while they fit, else words and an ellipsis
  function clip(s, max) {
    s = String(s || '').replace(/\s+/g, ' ').trim();
    if (s.length <= max) return s;
    var sents = s.match(/[^.!?]+[.!?]+["”’)]*\s*/g) || [], out = '';
    for (var i = 0; i < sents.length; i++) { if ((out + sents[i]).trim().length > max) break; out += sents[i]; }
    out = out.trim();
    if (out.length >= Math.min(40, max * 0.45)) return out;
    var cut = s.slice(0, max - 1).replace(/\s+\S*$/, '').replace(/[\s,;:.\-–—]+$/, '');
    return cut + '…';
  }

  // ------------------------------------------------------------------ icons (24×24 line drawings)
  var CIRCLE = 'M20.5 12a8.5 8.5 0 1 1-17 0 8.5 8.5 0 0 1 17 0z';
  var ICONS = {
    heart: 'M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.2a4.3 4.3 0 0 1 7.5 2.6C19.5 15.4 12 20 12 20z',
    house: 'M3.5 11.2 12 4l8.5 7.2M5.8 9.6V20h12.4V9.6M10 20v-5.2h4V20',
    clock: CIRCLE + 'M12 7.2V12l3.2 2.1',
    chat: 'M6.5 4.5h11a2.5 2.5 0 0 1 2.5 2.5v6.5a2.5 2.5 0 0 1-2.5 2.5h-7L6 19.5V16h.5A2.5 2.5 0 0 1 4 13.5V7a2.5 2.5 0 0 1 2.5-2.5z',
    scales: 'M12 4.5v15M8.5 19.5h7M5 7.5h14M7 7.5 4.2 14a2.8 2.8 0 0 0 5.6 0L7 7.5M17 7.5 14.2 14a2.8 2.8 0 0 0 5.6 0L17 7.5',
    list: 'M9.5 6.5h10M9.5 12h10M9.5 17.5h10M5 6.5h.01M5 12h.01M5 17.5h.01',
    leaf: 'M5.5 18.5C5.5 10 10.5 5 19 5c0 8.5-5 13.5-13.5 13.5zM5.5 18.5 12.5 11.5',
    phone: 'M8.2 3.5h7.6a1.7 1.7 0 0 1 1.7 1.7v13.6a1.7 1.7 0 0 1-1.7 1.7H8.2a1.7 1.7 0 0 1-1.7-1.7V5.2a1.7 1.7 0 0 1 1.7-1.7zM11 17.2h2',
    hands: 'M3 11.5l3.6 4.7a5 5 0 0 0 4 2H12M21 11.5l-3.6 4.7a5 5 0 0 1-4 2H12M7.2 14.2l2.2-2M16.8 14.2l-2.2-2M12 10.5s-3.2-1.9-3.2-4.2a1.7 1.7 0 0 1 3.2-.8 1.7 1.7 0 0 1 3.2.8c0 2.3-3.2 4.2-3.2 4.2z',
    star: 'M12 3.8l2.5 5.2 5.6.8-4.1 3.9 1 5.6L12 16.6l-5 2.7 1-5.6-4.1-3.9 5.6-.8z',
    moon: 'M19 14.6A7.6 7.6 0 0 1 9.4 5a7.6 7.6 0 1 0 9.6 9.6z',
    pause: CIRCLE + 'M10 9v6M14 9v6',
    check: 'M5 12.5l4.5 4.5L19 7.5',
    person: 'M12 11.2a3.6 3.6 0 1 0 0-7.2 3.6 3.6 0 0 0 0 7.2zM5 20a7 7 0 0 1 14 0',
    people: 'M9 11a3.2 3.2 0 1 0 0-6.4A3.2 3.2 0 0 0 9 11zM3 19.5a6 6 0 0 1 12 0M15.5 5a3 3 0 0 1 0 6M17.5 13.8a6 6 0 0 1 3.5 5.7',
    spark: 'M12 3.5v4M12 16.5v4M3.5 12h4M16.5 12h4M6 6l2.8 2.8M15.2 15.2 18 18M18 6l-2.8 2.8M8.8 15.2 6 18',
    arrow: 'M4.5 12h15M13.5 6l6 6-6 6'
  };
  function icon(name, cx, cy, size, color, sw) {
    var d = ICONS[name] || ICONS.heart, s = size / 24;
    return '<g transform="translate(' + r(cx - size / 2) + ' ' + r(cy - size / 2) + ') scale(' + r(s * 1000) / 1000 + ')">' +
      '<path d="' + d + '" fill="none" stroke="' + color + '" stroke-width="' + r((sw || 2) / s) + '" stroke-linecap="round" stroke-linejoin="round"/></g>';
  }
  var ICON_WORDS = [
    ['pause', /\b(pause|break|time ?out|stop|cool(ing)? (down|off)|step away)\b/],
    ['clock', /\b(minutes?|hours?|time|clock|o.?clock|later|tonight|weekly|monthly|every week|schedule|when)\b/],
    ['phone', /\b(phone|text(s|ing)?|message|screen|app|online|gaming)\b/],
    ['chat', /\b(say|said|talk|ask|tell|words?|sentence|listen|conversation|check.?in)\b/],
    ['scales', /\b(fair|split|equal|share[sd]?|balance|money|budget|50.?50)\b/],
    ['list', /\b(list|log|write|note|track|plan|owner|chart|remember)\b/],
    ['house', /\b(home|house|chores?|dishes|laundry|room|kitchen)\b/],
    ['leaf', /\b(calm|breathe|breath|walk|settle|rest|slow|body|water)\b/],
    ['moon', /\b(sleep|night|tired|bed|evening)\b/],
    ['star', /\b(thank|appreciat\w*|notice[sd]?|credit|celebrat\w*|proud|gift)\b/],
    ['hands', /\b(help|together|both|support|team|family|we)\b/],
    ['heart', /\b(love|care|feel\w*|hurt|kind\w*|warm)\b/]
  ];
  function pickIcon(text, used) {
    var t = String(text || '').toLowerCase();
    for (var i = 0; i < ICON_WORDS.length; i++) if (ICON_WORDS[i][1].test(t) && !(used && used[ICON_WORDS[i][0]])) { if (used) used[ICON_WORDS[i][0]] = 1; return ICON_WORDS[i][0]; }
    var order = ['heart', 'star', 'leaf', 'hands', 'chat', 'house'];
    for (var j = 0; j < order.length; j++) if (!(used && used[order[j]])) { if (used) used[order[j]] = 1; return order[j]; }
    return 'heart';
  }

  // Professor Puddles' mark (the same drawing as the floating helper, in its own colours)
  function puddles(x, y, size) {
    var s = size / 92;
    return '<g transform="translate(' + r(x + 4 * s) + ' ' + r(y + 14 * s) + ') scale(' + r(s * 1000) / 1000 + ')">' +
      '<path d="M40 8C33 22 14 36 14 50c0 14 12 22 26 22s26-8 26-22C66 36 47 22 40 8z" fill="#CFE6FA" stroke="#7FB2E0" stroke-width="2.6"/>' +
      '<ellipse cx="30" cy="30" rx="5" ry="3" fill="#fff" opacity=".6" transform="rotate(-25 30 30)"/>' +
      '<circle cx="31" cy="46" r="6.2" fill="#fff" fill-opacity=".35" stroke="#3A3350" stroke-width="1.8"/><circle cx="49" cy="46" r="6.2" fill="#fff" fill-opacity=".35" stroke="#3A3350" stroke-width="1.8"/><path d="M37.2 46h5.6" stroke="#3A3350" stroke-width="1.8"/>' +
      '<circle cx="31" cy="46.5" r="2.4" fill="#2B2620"/><circle cx="49" cy="46.5" r="2.4" fill="#2B2620"/><circle cx="31.9" cy="45.6" r=".8" fill="#fff"/><circle cx="49.9" cy="45.6" r=".8" fill="#fff"/>' +
      '<path d="M35 56 Q40 60.5 45 56" fill="none" stroke="#2B2620" stroke-width="2.2" stroke-linecap="round"/>' +
      '<ellipse cx="23" cy="55" rx="3.6" ry="2.2" fill="#F2A3B6" opacity=".85"/><ellipse cx="57" cy="55" rx="3.6" ry="2.2" fill="#F2A3B6" opacity=".85"/>' +
      '<path d="M18 10 L40 1 L62 10 L40 19 Z" fill="#3A3350"/><path d="M29 14.5v6c3 3 19 3 22 0v-6l-11 4.5z" fill="#4A4266"/>' +
      '<path d="M60 10 v11" stroke="#F4D26B" stroke-width="1.6"/><circle cx="60" cy="22.5" r="2.3" fill="#F4D26B"/></g>';
  }

  // ------------------------------------------------------------------ small drawing helpers
  function rect(x, y, w, h, rad, fill, stroke, sw, extra) {
    return '<rect x="' + r(x) + '" y="' + r(y) + '" width="' + r(w) + '" height="' + r(h) + '" rx="' + rad + '" fill="' + fill + '"' +
      (stroke ? ' stroke="' + stroke + '" stroke-width="' + (sw || 2) + '"' : '') + (extra || '') + '/>';
  }
  function circ(cx, cy, rad, fill, stroke, sw) {
    return '<circle cx="' + r(cx) + '" cy="' + r(cy) + '" r="' + r(rad) + '" fill="' + fill + '"' + (stroke ? ' stroke="' + stroke + '" stroke-width="' + (sw || 2) + '"' : '') + '/>';
  }
  function line(x1, y1, x2, y2, stroke, sw, extra) {
    return '<path d="M' + r(x1) + ' ' + r(y1) + 'L' + r(x2) + ' ' + r(y2) + '" stroke="' + stroke + '" stroke-width="' + (sw || 2) + '" fill="none" stroke-linecap="round"' + (extra || '') + '/>';
  }
  function itemOf(it) {
    if (it == null) return { text: '' };
    if (typeof it === 'string') return { text: it };
    return { label: it.label || it.l || '', text: it.text || it.x || '', icon: it.icon, when: it.when };
  }
  function strArr(a) { return (Array.isArray(a) ? a : a ? [a] : []).map(function (x) { return typeof x === 'string' ? x : itemOf(x).text; }).filter(Boolean); }

  var KICKERS = {
    steps: 'Step by step', compare: 'Side by side', checklist: 'A short checklist', cycle: 'How the loop goes',
    'dos-donts': 'Say it another way', words: 'Words you could use', split: 'Who does what', pillars: 'In a nutshell',
    timeline: 'Before, during, after'
  };
  var LIMITS = { steps: [3, 6], compare: [1, 5], checklist: [2, 8], cycle: [3, 5], 'dos-donts': [1, 5], words: [1, 4], split: [1, 6], pillars: [2, 5], timeline: [2, 5] };

  // ------------------------------------------------------------------ the layouts. Each gets (spec, y, T, F) and returns { s, h }
  var L = {};

  L.steps = function (sp, y0, T, F) {
    var items = (sp.items || []).map(itemOf).slice(0, 6), out = '', y = y0, cx = PAD + 40, R = 36, x0 = PAD + 104, tx = x0 + 34, tw = W - PAD - 30 - tx;
    var pos = [];
    items.forEach(function (it, i) {
      var a = T.acc[i % T.acc.length], lab = it.label ? fit(clip(it.label, 70), { fam: F.title, weight: 600, size: 36, min: 30, lines: 2, width: tw }) : null;
      var body = it.text ? fit(clip(it.text, 230), { fam: F.body, size: 34, min: 28, lines: lab ? 4 : 5, width: tw }) : null;
      var ih = (lab ? lab.h : 0) + (lab && body ? 6 : 0) + (body ? body.h : 0), h = Math.max(R * 2 + 24, ih + 50);
      out += rect(x0, y, W - PAD - x0, h, 22, a.f, a.e, T.strong ? 2.5 : 2);
      var ty = y + (h - ih) / 2;
      if (lab) { out += txt(tx, ty, lab, { fill: T.ink }); ty += lab.h + 6; }
      if (body) out += txt(tx, ty, body, { fill: T.ink });
      pos.push([y, h, a]);
      y += h + 34;
    });
    pos.forEach(function (p, i) {
      var cy = p[0] + p[1] / 2;
      if (i < pos.length - 1) {
        var ny = pos[i + 1][0] + pos[i + 1][1] / 2;
        out += line(cx, cy + R + 8, cx, ny - R - 12, T.soft, 3, ' stroke-dasharray="2 9"');
        out += '<path d="M' + (cx - 9) + ' ' + r(ny - R - 22) + 'l9 10 9-10" fill="none" stroke="' + T.soft + '" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>';
      }
      out += circ(cx, cy, R, p[2].d);
      out += '<text x="' + cx + '" y="' + r(cy + 13) + '" text-anchor="middle" font-family="' + esc(F.title) + '" font-weight="600" font-size="38" fill="' + T.onDeep + '">' + (i + 1) + '</text>';
    });
    return { s: out, h: y - y0 - 34 };
  };

  L.checklist = function (sp, y0, T, F) {
    var items = (sp.items || []).map(itemOf).slice(0, 8), out = '', y = y0 + 22, bx = PAD + 34, tx = PAD + 112, tw = W - PAD - 34 - tx;
    var mark = sp.marker || 'check';
    var rows = items.map(function (it) {
      var lab = it.label ? fit(clip(it.label, 60), { fam: F.title, weight: 600, size: 32, min: 28, lines: 2, width: tw }) : null;
      var body = it.text ? fit(clip(it.text, lab ? 150 : 170), { fam: F.body, size: lab ? 31 : 34, min: 27, lines: 3, width: tw }) : null;
      return { lab: lab, body: body, h: (lab ? lab.h : 0) + (lab && body ? 4 : 0) + (body ? body.h : 0) };
    });
    var inner = '';
    rows.forEach(function (f, i) {
      var h = Math.max(56, f.h) + 40, a = T.acc[1];
      if (mark === 'dot') inner += circ(bx + 26, y + h / 2, 11, a.d);
      else if (mark === 'number') inner += circ(bx + 26, y + h / 2, 26, a.d) + '<text x="' + (bx + 26) + '" y="' + r(y + h / 2 + 10) + '" text-anchor="middle" font-family="' + esc(F.title) + '" font-weight="600" font-size="28" fill="' + T.onDeep + '">' + (i + 1) + '</text>';
      else { inner += rect(bx, y + (h - 52) / 2, 52, 52, 12, a.f, a.d, 3); inner += icon('check', bx + 26, y + h / 2, 34, a.d, 3.2); }
      var ty = y + (h - f.h) / 2;
      if (f.lab) { inner += txt(tx, ty, f.lab, { fill: T.ink }); ty += f.lab.h + 4; }
      if (f.body) inner += txt(tx, ty, f.body, { fill: T.ink });
      if (i < rows.length - 1) inner += line(bx, y + h, W - PAD - 34, y + h, T.line, 2, ' stroke-dasharray="3 7"');
      y += h;
    });
    out += rect(PAD, y0, INNER, y - y0 + 22, 26, T.panel, T.line, T.strong ? 2.5 : 2) + inner;
    return { s: out, h: y - y0 + 22 };
  };

  L.pillars = function (sp, y0, T, F) {
    var items = (sp.items || []).map(itemOf).slice(0, 5), out = '', y = y0, used = {};
    var avg = items.reduce(function (n, it) { return n + (it.text || '').length; }, 0) / Math.max(1, items.length);
    var rows = avg > 95 || items.length < 2;
    if (rows) {
      items.forEach(function (it, i) {
        var a = T.acc[(i + (sp.accent || 0)) % T.acc.length], ic = it.icon || pickIcon(it.label + ' ' + it.text, used);
        var tx = PAD + 140, tw = W - PAD - 36 - tx;
        var lab = it.label ? fit(clip(it.label, 60), { fam: F.title, weight: 600, size: 36, min: 30, lines: 2, width: tw }) : null;
        var body = it.text ? fit(clip(it.text, 240), { fam: F.body, size: 32, min: 27, lines: 5, width: tw }) : null;
        var ih = (lab ? lab.h : 0) + (lab && body ? 6 : 0) + (body ? body.h : 0), h = Math.max(120, ih + 52);
        out += rect(PAD, y, INNER, h, 24, a.f, a.e, T.strong ? 2.5 : 2);
        out += circ(PAD + 72, y + h / 2, 42, T.panel, a.e, 2.5) + icon(ic, PAD + 72, y + h / 2, 44, a.d, 2.2);
        var ty = y + (h - ih) / 2;
        if (lab) { out += txt(tx, ty, lab, { fill: T.ink }); ty += lab.h + 6; }
        if (body) out += txt(tx, ty, body, { fill: T.ink });
        y += h + 22;
      });
      return { s: out, h: y - y0 - 22 };
    }
    // a grid of tiles, two across; an odd last tile spans the row
    var gap = 28, cw = (INNER - gap) / 2;
    for (var i = 0; i < items.length; i += 2) {
      var pair = items.slice(i, i + 2), full = pair.length === 1, tiles = [];
      pair.forEach(function (it, k) {
        var w = full ? INNER : cw, tw = w - 68;
        var lab = it.label ? fit(clip(it.label, 50), { fam: F.title, weight: 600, size: 36, min: 30, lines: 2, width: full ? w - 200 : tw }) : null;
        var body = it.text ? fit(clip(it.text, 150), { fam: F.body, size: 31, min: 27, lines: full ? 3 : 5, width: full ? w - 200 : tw }) : null;
        tiles.push({ it: it, w: w, lab: lab, body: body, a: T.acc[(i + k + (sp.accent || 0)) % T.acc.length], ic: it.icon || pickIcon((it.label || '') + ' ' + it.text, used) });
      });
      var h = Math.max.apply(null, tiles.map(function (t) {
        return full ? Math.max(140, (t.lab ? t.lab.h + 6 : 0) + (t.body ? t.body.h : 0) + 56) : 34 + 88 + 22 + (t.lab ? t.lab.h + 6 : 0) + (t.body ? t.body.h : 0) + 34;
      }));
      tiles.forEach(function (t, k) {
        var x = PAD + k * (cw + gap);
        out += rect(x, y, t.w, h, 24, t.a.f, t.a.e, T.strong ? 2.5 : 2);
        if (full) {
          out += circ(x + 80, y + h / 2, 46, T.panel, t.a.e, 2.5) + icon(t.ic, x + 80, y + h / 2, 48, t.a.d, 2.2);
          var ih = (t.lab ? t.lab.h + 6 : 0) + (t.body ? t.body.h : 0), ty = y + (h - ih) / 2;
          if (t.lab) { out += txt(x + 160, ty, t.lab, { fill: T.ink }); ty += t.lab.h + 6; }
          if (t.body) out += txt(x + 160, ty, t.body, { fill: T.ink });
        } else {
          out += circ(x + 34 + 44, y + 34 + 44, 44, T.panel, t.a.e, 2.5) + icon(t.ic, x + 78, y + 78, 46, t.a.d, 2.2);
          var ty2 = y + 34 + 88 + 22;
          if (t.lab) { out += txt(x + 34, ty2, t.lab, { fill: T.ink }); ty2 += t.lab.h + 6; }
          if (t.body) out += txt(x + 34, ty2, t.body, { fill: T.ink });
        }
      });
      y += h + gap;
    }
    return { s: out, h: y - y0 - gap };
  };

  L.compare = function (sp, y0, T, F) {
    var sides = [sp.left || {}, sp.right || {}], gap = 28, cw = (INNER - gap) / 2, out = '', cols = [];
    sides.forEach(function (sd, k) {
      var a = T.acc[k === 0 ? 0 : 1], items = strArr(sd.items).slice(0, 5), tw = cw - 76;
      var head = fit(clip(sd.label || (k ? 'B' : 'A'), 40), { fam: F.title, weight: 600, size: 40, min: 32, lines: 2, width: cw - 150 });
      var rows = items.map(function (t) { return fit(clip(t, 130), { fam: F.body, size: 31, min: 27, lines: 4, width: tw }); });
      var h = 36 + Math.max(84, head.h) + 26 + rows.reduce(function (n, f) { return n + f.h + 22; }, 0) + 14;
      cols.push({ a: a, head: head, rows: rows, h: h, ic: sd.icon || (k ? 'hands' : 'scales') });
    });
    var H = Math.max(cols[0].h, cols[1].h);
    cols.forEach(function (c, k) {
      var x = PAD + k * (cw + gap), y = y0;
      out += rect(x, y, cw, H, 26, c.a.f, c.a.e, T.strong ? 2.5 : 2);
      out += circ(x + 36 + 42, y + 36 + 42, 42, T.panel, c.a.e, 2.5) + icon(c.ic, x + 78, y + 78, 46, c.a.d, 2.2);
      var hh = Math.max(84, c.head.h);
      out += txt(x + 140, y + 36 + (hh - c.head.h) / 2, c.head, { fill: c.a.d });
      y += 36 + hh + 18;
      out += line(x + 34, y, x + cw - 34, y, c.a.e, 2);
      y += 26;
      c.rows.forEach(function (f) {
        out += circ(x + 44, y + f.lh / 2, 6, c.a.d);
        out += txt(x + 66, y, f, { fill: T.ink });
        y += f.h + 22;
      });
    });
    var h = H;
    if (sp.bridge) {
      var b = banner({ text: sp.bridge, icon: 'heart' }, y0 + H + 28, T, F, 2);
      out += b.s; h += 28 + b.h;
    }
    return { s: out, h: h };
  };

  L['dos-donts'] = function (sp, y0, T, F) {
    var pairs = (sp.pairs || []).slice(0, 5), out = '', y = y0, lw = 400, aw = 76, rw = INNER - lw - aw, a = T.acc[1];
    out += '<text x="' + (PAD + 4) + '" y="' + (y + 26) + '" font-family="' + esc(F.mono) + '" font-size="24" letter-spacing="2" fill="' + T.soft + '">' + esc((sp.leftLabel || 'Instead of').toUpperCase()) + '</text>';
    out += '<text x="' + (PAD + lw + aw + 4) + '" y="' + (y + 26) + '" font-family="' + esc(F.mono) + '" font-size="24" letter-spacing="2" fill="' + a.d + '">' + esc((sp.rightLabel || 'Try').toUpperCase()) + '</text>';
    y += 48;
    pairs.forEach(function (p) {
      var l = fit(clip(p[0], 110), { fam: F.body, italic: true, size: 31, min: 27, lines: 4, width: lw - 56 });
      var rr = fit(clip(p[1], 160), { fam: F.body, size: 32, min: 27, lines: 5, width: rw - 56 });
      var h = Math.max(l.h, rr.h) + 52;
      out += rect(PAD, y, lw, h, 22, T.panel, T.line, 2, ' stroke-dasharray="7 7"');
      out += txt(PAD + 28, y + (h - l.h) / 2, l, { fill: T.soft });
      out += icon('arrow', PAD + lw + aw / 2, y + h / 2, 44, T.soft, 2.4);
      out += rect(PAD + lw + aw, y, rw, h, 22, a.f, a.e, T.strong ? 2.5 : 2);
      out += txt(PAD + lw + aw + 28, y + (h - rr.h) / 2, rr, { fill: T.ink });
      y += h + 22;
    });
    return { s: out, h: y - y0 - 22 };
  };

  L.words = function (sp, y0, T, F) {
    var items = strArr(sp.items).slice(0, 4), out = '', y = y0;
    items.forEach(function (t, i) {
      var a = T.acc[[0, 1, 3, 2][i % 4]], off = i % 2 ? 70 : 0, w = INNER - 70, tw = w - 130;
      var f = fit(clip(t.replace(/^[“"]|[”"]$/g, ''), 220), { fam: F.body, italic: true, size: 35, min: 29, lines: 5, width: tw });
      var h = Math.max(110, f.h + 56), x = PAD + off;
      out += rect(x, y, w, h, 30, a.f, a.e, T.strong ? 2.5 : 2);
      // a little tail, like a speech bubble
      var tx0 = i % 2 ? x + w - 90 : x + 60, dir = i % 2 ? 1 : -1;
      out += '<path d="M' + tx0 + ' ' + r(y + h - 2) + 'l' + (dir * -4) + ' 26 ' + (dir * 30) + '-26z" fill="' + a.f + '" stroke="' + a.e + '" stroke-width="' + (T.strong ? 2.5 : 2) + '" stroke-linejoin="round"/>';
      out += line(tx0 + (dir < 0 ? 3 : -3), y + h - 2, tx0 + dir * 28, y + h - 2, a.f, 5);
      out += '<text x="' + (x + 30) + '" y="' + r(y + 78) + '" font-family="' + esc(F.title) + '" font-size="96" fill="' + a.d + '" opacity=".55">“</text>';
      out += txt(x + 96, y + (h - f.h) / 2, f, { fill: T.ink });
      y += h + 40;
    });
    return { s: out, h: y - y0 - 40 + 22 };
  };

  L.split = function (sp, y0, T, F) {
    var data = (sp.data || []).filter(function (d) { return d && isFinite(+d.value) && +d.value >= 0; }).slice(0, 6);
    var total = data.reduce(function (n, d) { return n + +d.value; }, 0) || 1, out = '';
    var cx = PAD + 210, R = 160, SW = 64, cy = y0 + 30 + R + SW / 2, C = 2 * Math.PI * R, acc = 0;
    out += circ(cx, cy, R, 'none', T.line, SW);
    data.forEach(function (d, i) {
      var frac = +d.value / total, len = Math.max(0, frac * C - (data.length > 1 && frac > 0 ? 6 : 0));
      if (len > 0) out += '<circle cx="' + cx + '" cy="' + r(cy) + '" r="' + R + '" fill="none" stroke="' + T.series[i % T.series.length] + '" stroke-width="' + SW + '" stroke-dasharray="' + r(len) + ' ' + r(C) + '" stroke-dashoffset="' + r(-acc * C) + '" transform="rotate(-90 ' + cx + ' ' + r(cy) + ')"/>';
      acc += frac;
    });
    var unit = sp.unit || '';
    var tot = fmtNum(total);
    out += '<text x="' + cx + '" y="' + r(cy + (unit && unit !== '%' ? 4 : 18)) + '" text-anchor="middle" font-family="' + esc(F.title) + '" font-weight="600" font-size="' + (tot.length > 4 ? 46 : 58) + '" fill="' + T.ink + '">' + esc(unit === '%' ? '100%' : tot) + '</text>';
    if (unit && unit !== '%') out += '<text x="' + cx + '" y="' + r(cy + 44) + '" text-anchor="middle" font-family="' + esc(F.body) + '" font-size="27" fill="' + T.soft + '">' + esc(clip(unit, 16)) + '</text>';
    // the legend, with a bar each
    var lx = PAD + 480, lw = W - PAD - lx, ly = y0 + 18, rowH = data.length > 4 ? 76 : 96;
    var top = cy - (data.length * rowH) / 2 + 6;
    ly = Math.max(y0, top);
    data.forEach(function (d, i) {
      var col = T.series[i % T.series.length], pct = Math.round(+d.value / total * 100);
      var right = (unit === '%' ? '' : fmtNum(+d.value) + (unit ? ' ' + shortUnit(unit) : '') + ' · ') + pct + '%';
      var rw = measure(right, 28, F.body, 400) + 8;
      var nm = fit(clip(d.name || ('Person ' + (i + 1)), 28), { fam: F.title, weight: 600, size: 32, min: 26, lines: 1, width: lw - rw - 52 });
      out += rect(lx, ly + 8, 26, 26, 7, col);
      out += txt(lx + 40, ly + 21 - nm.lh / 2, nm, { fill: T.ink });
      out += '<text x="' + (W - PAD) + '" y="' + r(ly + 31) + '" text-anchor="end" font-family="' + esc(F.body) + '" font-size="28" fill="' + T.soft + '">' + esc(right) + '</text>';
      out += rect(lx, ly + 50, lw, 14, 7, T.line, null, 0, ' opacity=".55"');
      if (pct > 0) out += rect(lx, ly + 50, Math.max(14, lw * +d.value / total), 14, 7, col);
      ly += rowH;
    });
    var h = Math.max(cy + R + SW / 2 + 10, ly) - y0;
    var note = sp.splitNote === false ? null : banner({ text: sp.splitNote || 'A plain picture of the split, not a verdict on anyone. Fair doesn’t always mean 50/50: what matters is that it feels fair to everyone.', icon: 'scales' }, y0 + h + 30, T, F, 0);
    if (note) { out += note.s; h += 30 + note.h; }
    return { s: out, h: h };
  };
  function fmtNum(n) { n = +n; return (Math.round(n * 10) / 10).toLocaleString('en-US'); }
  function shortUnit(u) { return u === 'hours' ? 'h' : u === 'minutes' ? 'min' : u; }

  L.timeline = function (sp, y0, T, F) {
    var items = (sp.items || []).map(itemOf).slice(0, 5), out = '', y = y0, rx = PAD + 50, R = 42, x0 = PAD + 120, tw = W - PAD - 36 - (x0 + 34), used = {};
    var centers = [];
    var inner = '';
    items.forEach(function (it, i) {
      var a = T.acc[(i + 2) % T.acc.length], ic = it.icon || pickIcon((it.label || '') + ' ' + it.text, used);
      var when = it.when ? clip(it.when, 26).toUpperCase() : '';
      var lab = it.label ? fit(clip(it.label, 60), { fam: F.title, weight: 600, size: 35, min: 30, lines: 2, width: tw }) : null;
      var body = it.text ? fit(clip(it.text, 200), { fam: F.body, size: 31, min: 27, lines: 4, width: tw }) : null;
      var ih = (when ? 34 : 0) + (lab ? lab.h + 4 : 0) + (body ? body.h : 0), h = Math.max(R * 2 + 30, ih + 48);
      inner += rect(x0, y, W - PAD - x0, h, 22, T.panel, T.line, T.strong ? 2.5 : 2);
      var ty = y + (h - ih) / 2;
      if (when) { inner += '<text x="' + (x0 + 34) + '" y="' + r(ty + 22) + '" font-family="' + esc(F.mono) + '" font-size="23" letter-spacing="2" fill="' + a.d + '">' + esc(when) + '</text>'; ty += 34; }
      if (lab) { inner += txt(x0 + 34, ty, lab, { fill: T.ink }); ty += lab.h + 4; }
      if (body) inner += txt(x0 + 34, ty, body, { fill: T.soft === '#1A1A1A' ? T.ink : T.soft });
      centers.push([y + h / 2, a, ic]);
      y += h + 26;
    });
    if (centers.length > 1) out += line(rx, centers[0][0], rx, centers[centers.length - 1][0], T.line, 6);
    out += inner;
    centers.forEach(function (c) { out += circ(rx, c[0], R, c[1].d) + icon(c[2], rx, c[0], 44, T.onDeep, 2.4); });
    return { s: out, h: y - y0 - 26 };
  };

  L.cycle = function (sp, y0, T, F) {
    var items = (sp.items || []).map(itemOf).slice(0, 5), n = Math.max(3, items.length), out = '';
    while (items.length < 3) items.push({ text: '' });
    var cw = n === 5 ? 300 : n === 4 ? 360 : 400;
    var cards = items.map(function (it, i) {
      var a = T.acc[i % T.acc.length];
      var lab = fit(clip(it.label || it.text, 50), { fam: F.title, weight: 600, size: 33, min: 27, lines: 3, width: cw - 48, tight: true });
      var body = it.label && it.text ? fit(clip(it.text, 110), { fam: F.body, size: 28, min: 26, lines: 4, width: cw - 48 }) : null;
      return { a: a, lab: lab, body: body, h: lab.h + (body ? body.h + 8 : 0) + 44 };
    });
    var ch = Math.max.apply(null, cards.map(function (c) { return c.h; }));
    var rx = (INNER - cw) / 2, ang = cards.map(function (c, i) { return -Math.PI / 2 + i * 2 * Math.PI / n; });
    function place(ry) { return ang.map(function (t) { return [W / 2 + rx * Math.cos(t), ry * Math.sin(t)]; }); }
    function clash(P) {
      for (var i = 0; i < P.length; i++) for (var j = i + 1; j < P.length; j++)
        if (Math.abs(P[i][0] - P[j][0]) < cw + 24 && Math.abs(P[i][1] - P[j][1]) < ch + 36) return true;
      return false;
    }
    var ry = ch * 0.6, P = place(ry);
    while (clash(P) && ry < 1400) { ry += 8; P = place(ry); }
    ry = Math.max(ry, n === 3 ? ch + 60 : ry);
    P = place(ry);
    var minY = Math.min.apply(null, P.map(function (p) { return p[1]; })) - ch / 2, maxY = Math.max.apply(null, P.map(function (p) { return p[1]; })) + ch / 2;
    var cy = y0 - minY + 6;
    // the ring, with arrows halfway between stages (going round clockwise)
    out += '<ellipse cx="' + W / 2 + '" cy="' + r(cy) + '" rx="' + r(rx) + '" ry="' + r(ry) + '" fill="none" stroke="' + T.line + '" stroke-width="5" stroke-dasharray="3 12" stroke-linecap="round"/>';
    ang.forEach(function (t) {
      var m = t + Math.PI / n, px = W / 2 + rx * Math.cos(m), py = cy + ry * Math.sin(m);
      var dx = -rx * Math.sin(m), dy = ry * Math.cos(m), deg = Math.atan2(dy, dx) * 180 / Math.PI;
      out += '<g transform="translate(' + r(px) + ' ' + r(py) + ') rotate(' + r(deg) + ')">' + circ(0, 0, 26, T.bg, T.soft, 2.5) +
        '<path d="M-10 0H9M2 -7l7 7-7 7" fill="none" stroke="' + T.soft + '" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/></g>';
    });
    if (sp.center) {
      var cwid = Math.max(220, 2 * rx - cw - 60);
      var cf = fit(clip(sp.center, 70), { fam: F.title, weight: 600, italic: false, size: 32, min: 26, lines: 4, width: Math.min(cwid, 420) });
      var ccy = n === 3 ? cy + ry * 0.12 : cy;
      out += txt(W / 2, ccy - cf.h / 2, cf, { fill: T.soft, anchor: 'middle' });
    }
    cards.forEach(function (c, i) {
      var x = P[i][0] - cw / 2, y = cy + P[i][1] - ch / 2;
      out += rect(x, y, cw, ch, 24, c.a.f, c.a.e, T.strong ? 2.5 : 2.5);
      out += circ(x + 26, y + 4, 22, c.a.d) + '<text x="' + r(x + 26) + '" y="' + r(y + 13) + '" text-anchor="middle" font-family="' + esc(F.title) + '" font-weight="600" font-size="26" fill="' + T.onDeep + '">' + (i + 1) + '</text>';
      var ih = c.lab.h + (c.body ? c.body.h + 8 : 0), ty = y + (ch - ih) / 2;
      out += txt(x + cw / 2, ty, c.lab, { fill: T.ink, anchor: 'middle' });
      if (c.body) out += txt(x + cw / 2, ty + c.lab.h + 8, c.body, { fill: T.ink, anchor: 'middle' });
    });
    return { s: out, h: maxY - minY + 12 };
  };

  // a full-width band: "Words you could use", "Together", a bridge line. variant 1 = quote, 2 = bold band
  function banner(b, y, T, F, variant) {
    var a = T.acc[variant === 1 ? 0 : variant === 2 ? 3 : 2], out = '', ic = b.icon || 'chat';
    var tw = INNER - 150;
    var lab = b.label ? b.label.toUpperCase() : '';
    var f = fit(variant === 1 ? '“' + clip(b.text, 236) + '”' : clip(b.text, 240), { fam: F.body, italic: variant === 1, weight: variant === 2 ? 600 : 400, size: variant === 0 ? 29 : 33, min: 26, lines: 5, width: tw });
    var ih = (lab ? 36 : 0) + f.h, h = Math.max(110, ih + 52);
    out += rect(PAD, y, INNER, h, 26, a.f, a.e, T.strong ? 2.5 : 2);
    out += circ(PAD + 70, y + h / 2, 38, T.panel, a.e, 2.5) + icon(ic, PAD + 70, y + h / 2, 40, a.d, 2.2);
    var ty = y + (h - ih) / 2;
    if (lab) { out += '<text x="' + (PAD + 132) + '" y="' + r(ty + 24) + '" font-family="' + esc(F.mono) + '" font-size="23" letter-spacing="2" fill="' + a.d + '">' + esc(lab) + '</text>'; ty += 36; }
    out += txt(PAD + 132, ty, f, { fill: T.ink });
    return { s: out, h: h };
  }
  // one or two small cards side by side ("A question to sit with", "Try this")
  function duo(list, y, T, F) {
    list = list.filter(function (x) { return x && x.text; }).slice(0, 2);
    if (!list.length) return { s: '', h: 0 };
    var gap = 28, w = list.length === 2 ? (INNER - gap) / 2 : INNER, out = '', parts = [];
    list.forEach(function (it, k) {
      var f = fit(clip(it.text, 170), { fam: F.body, size: 30, min: 26, lines: 5, width: w - 64 });
      parts.push({ it: it, f: f, a: T.acc[(k + 4) % T.acc.length] });
    });
    var h = Math.max.apply(null, parts.map(function (p) { return p.f.h + 36 + 70; }));
    parts.forEach(function (p, k) {
      var x = PAD + k * (w + gap);
      out += rect(x, y, w, h, 24, T.panel, p.a.e, T.strong ? 2.5 : 2);
      out += icon(p.it.icon || 'star', x + 50, y + 52, 34, p.a.d, 2.4);
      out += '<text x="' + (x + 80) + '" y="' + r(y + 61) + '" font-family="' + esc(F.mono) + '" font-size="23" letter-spacing="2" fill="' + p.a.d + '">' + esc(clip(p.it.label || '', 26).toUpperCase()) + '</text>';
      out += txt(x + 32, y + 88, p.f, { fill: T.ink });
    });
    return { s: out, h: h };
  }

  // ------------------------------------------------------------------ render
  function normSpec(spec) {
    var sp = {};
    Object.keys(spec || {}).forEach(function (k) { sp[k] = spec[k]; });
    sp.layout = L[sp.layout] ? sp.layout : 'checklist';
    sp.title = clip(sp.title || 'A little picture', 90);
    if (sp.subtitle) sp.subtitle = clip(sp.subtitle, 190);
    if (sp.items && !Array.isArray(sp.items)) sp.items = [sp.items];
    if (sp.layout === 'words') sp.items = strArr(sp.items);
    return sp;
  }

  function render(spec, opts) {
    opts = opts || {};
    var sp = normSpec(spec), tn = themeName(opts.theme || sp.theme), T = THEMES[tn], F = fonts(), id = 'tolig-' + (++uid);
    var out = '', y = 0, deco = '';
    // header
    y = 70;
    var kick = clip(sp.kicker || (sp.layout === 'checklist' && sp.marker && sp.marker !== 'check' ? 'At a glance' : KICKERS[sp.layout]) || '', 40).toUpperCase();
    if (kick) { out += '<text x="' + PAD + '" y="' + (y + 22) + '" font-family="' + esc(F.mono) + '" font-size="24" letter-spacing="3" fill="' + T.kicker + '">' + esc(kick) + '</text>'; y += 46; }
    var tf = fit(sp.title, { fam: F.title, weight: 600, size: 66, min: 46, lines: 3, width: INNER - 90, lh: 1.14, tight: true });
    out += txt(PAD, y, tf, { fill: T.ink }); y += tf.h + 12;
    if (sp.subtitle) { var sf = fit(sp.subtitle, { fam: F.body, size: 33, min: 27, lines: 4, width: INNER - 40 }); out += txt(PAD, y, sf, { fill: T.soft }); y += sf.h + 8; }
    y += 22;
    out += line(PAD, y, W - PAD, y, T.rule, 2) + line(PAD, y + 7, W - PAD, y + 7, T.rule, 2);
    y += 48;
    // body
    var body = L[sp.layout](sp, y, T, F);
    out += body.s; y += body.h;
    if (sp.banner && sp.banner.text) { y += 30; var bn = banner({ label: sp.banner.label, text: sp.banner.text, icon: sp.banner.icon || 'hands' }, y, T, F, 2); out += bn.s; y += bn.h; }
    if (sp.after && sp.after.length) { y += 30; var du = duo(sp.after, y, T, F); out += du.s; y += du.h; }
    if (sp.say) { y += 30; var sy = banner({ label: sp.sayLabel || 'Words you could use', text: String(sp.say).replace(/^[“"]|[”"]$/g, ''), icon: 'chat' }, y, T, F, 1); out += sy.s; y += sy.h; }
    if (sp.note) { y += 26; var nf = fit(clip(sp.note, 200), { fam: F.body, italic: true, size: 27, min: 24, lines: 3, width: INNER - 40 }); out += txt(W / 2, y, nf, { fill: T.soft, anchor: 'middle' }); y += nf.h; }
    // footer: Professor Puddles' mark, his name and the site
    y += 44;
    out += line(PAD, y, W - PAD, y, T.line, 2);
    y += 24;
    out += puddles(PAD - 4, y - 6, 78);
    out += '<text x="' + (PAD + 88) + '" y="' + (y + 32) + '" font-family="' + esc(F.title) + '" font-weight="600" font-size="28" fill="' + T.ink + '">Made with Professor Puddles</text>';
    var src = sp.source && /^\/[\w\-./#]*$/.test(sp.source) ? sp.source.replace(/\.html(#.*)?$/, '').replace(/\/index$/, '/') : '';
    out += '<text x="' + (PAD + 88) + '" y="' + (y + 66) + '" font-family="' + esc(F.mono) + '" font-size="23" fill="' + T.soft + '">' + esc(clip(SITE + (src && src !== '/' ? src : ''), 60)) + '</text>';
    y += 96 + 28;
    var H = Math.ceil(y);
    // a few soft bubbles in the top corner, like the site's background (not in high contrast)
    if (T.deco.length) {
      [[W - 120, 96, 46, 0], [W - 62, 170, 22, 1], [W - 176, 176, 16, 2], [W - 70, 52, 12, 3]].forEach(function (b) {
        deco += circ(b[0], b[1], b[2], T.deco[b[3]]).replace('/>', ' opacity="' + T.decoOp + '"/>');
      });
    }
    var alt = altText(sp);
    var svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-labelledby="' + id + '-t ' + id + '-d" class="tol-ig-svg" data-theme="' + tn + '" preserveAspectRatio="xMidYMin meet">' +
      '<title id="' + id + '-t">' + esc(sp.title) + '</title><desc id="' + id + '-d">' + esc(alt.slice(1).join(' ')) + '</desc>' +
      rect(0, 0, W, H, 36, T.bg) + rect(14, 14, W - 28, H - 28, 26, 'none', T.frame, T.strong ? 3 : 2) + deco + out + '</svg>';
    var el;
    try {
      var doc = new DOMParser().parseFromString(svg, 'image/svg+xml');
      el = document.importNode(doc.documentElement, true);
    } catch (e) {
      var wrap = document.createElement('div'); wrap.innerHTML = svg; el = wrap.firstChild;
    }
    el.tolSpec = spec; el.tolAlt = alt; el.tolTheme = tn; el.tolSize = [W, H];
    return el;
  }

  function altText(spec) {
    var sp = normSpec(spec), out = [sp.title];
    if (sp.subtitle) out.push(sp.subtitle);
    function it2s(it) { it = itemOf(it); return (it.when ? it.when + ': ' : '') + (it.label ? it.label + (it.text ? ': ' : '') : '') + (it.text || ''); }
    var lay = sp.layout;
    if (lay === 'steps') (sp.items || []).slice(0, 6).forEach(function (it, i) { out.push('Step ' + (i + 1) + ': ' + it2s(it)); });
    else if (lay === 'cycle') { (sp.items || []).slice(0, 5).forEach(function (it, i) { out.push((i + 1) + '. ' + it2s(it) + (i === (sp.items.length - 1) ? ' (and round again to 1)' : '')); }); if (sp.center) out.push('In the middle: ' + sp.center); }
    else if (lay === 'compare') {
      [sp.left || {}, sp.right || {}].forEach(function (s) { out.push((s.label || '') + ': ' + strArr(s.items).join('; ')); });
      if (sp.bridge) out.push(sp.bridge);
    } else if (lay === 'dos-donts') (sp.pairs || []).forEach(function (p) { out.push((sp.leftLabel || 'Instead of') + ' “' + p[0] + '”, ' + (sp.rightLabel || 'try').toLowerCase() + ': “' + p[1] + '”'); });
    else if (lay === 'split') {
      var data = sp.data || [], tot = data.reduce(function (n, d) { return n + (+d.value || 0); }, 0) || 1;
      data.forEach(function (d) { out.push(d.name + ': ' + (sp.unit === '%' ? '' : fmtNum(d.value) + (sp.unit ? ' ' + sp.unit : '') + ', ') + Math.round(d.value / tot * 100) + '%'); });
      if (sp.splitNote !== false) out.push(sp.splitNote || 'A plain picture of the split, not a verdict on anyone.');
    } else if (lay === 'words') strArr(sp.items).forEach(function (t) { out.push('“' + t.replace(/^[“"]|[”"]$/g, '') + '”'); });
    else (sp.items || []).forEach(function (it) { out.push(it2s(it)); });
    if (sp.banner && sp.banner.text) out.push((sp.banner.label ? sp.banner.label + ': ' : '') + sp.banner.text);
    (sp.after || []).forEach(function (a) { if (a && a.text) out.push((a.label ? a.label + ': ' : '') + a.text); });
    if (sp.say) out.push((sp.sayLabel || 'Words you could use') + ': “' + String(sp.say).replace(/^[“"]|[”"]$/g, '') + '”');
    if (sp.note) out.push(sp.note);
    out.push('Made with Professor Puddles, ' + SITE + (sp.source && /^\//.test(sp.source) ? sp.source : ''));
    return out;
  }

  // ------------------------------------------------------------------ building specs from the chat's knowledge
  function tidy(s, who) {
    who = who || {};
    var them = who.them || 'the other person';
    return String(s || '')
      .replace(/\{Them\}/g, them.charAt(0).toUpperCase() + them.slice(1)).replace(/\{them\}/g, them)
      .replace(/\{They\}/g, 'They').replace(/\{they\}/g, who.they || 'they').replace(/\{Their\}/g, 'Their').replace(/\{their\}/g, who.their || 'their')
      .replace(/\s*\((?:WP|CALC|REPORT|PROG)-\d+\)/g, '').replace(/\b(?:WP|CALC)-\d+:\s*/g, '')
      .replace(/(^|\s)(This (is|touches)|That’s|That's) Pillars? [IVX]+[^.]*\.\s*/g, '$1')
      .replace(/\s*\(that’s Pillar [IVX]+[^)]*\)/g, '')
      .replace(/\s+/g, ' ').trim();
  }
  function sentences(s) { return (String(s || '').match(/[^.!?]+[.!?]+["”’)]*|[^.!?]+$/g) || []).map(function (x) { return x.trim(); }).filter(Boolean); }
  function cap(s) { s = String(s || '').trim().replace(/^the /i, ''); return s.charAt(0).toUpperCase() + s.slice(1); }
  function arr(x) { return Array.isArray(x) ? x : x ? [x] : []; }
  // "Label: the rest" → {label, text} when the label part is short
  function labelled(s) {
    var m = /^([^:.!?]{3,44}):\s+(.{8,})$/.exec(s);
    if (m && !/\b(said|says|say|like|example)$/i.test(m[1])) return { label: m[1].replace(/^(If you’re|If you're)\s+/i, 'If you’re '), text: cap(m[2]) };
    return { text: s };
  }
  function firstLink(links) { var l = arr(links)[0]; return l && l[1] && /^\//.test(l[1]) ? l[1] : ''; }
  function easyWanted(opts) { return (opts && opts.plain) || htmlHas('tol-easy'); }

  // a card that touches fear or control keeps the way to help on the poster itself
  var SAFETY = /not safe at home|\/safety\.html|scared of (them|him|her)|afraid of (them|him|her)|control(ling)? (you|me)/i;
  // topics about fear, control or safety: no Save / Share / Print, so nothing is left on the device by accident
  var SENSITIVE_ID = /control|safe|abuse|harass|usedagainst|wifiprivacy|phonetrust|fear/i;
  function fromCard(card, kind, opts) {
    var s = fromCard0(card, kind, opts);
    if (s && card && SENSITIVE_ID.test(String(card.id || ''))) s.sensitive = true;
    if (s && !s.note) { try { if (SAFETY.test(JSON.stringify(card))) s.note = 'If you ever feel afraid or controlled, there’s help at ' + SITE + '/safety'; } catch (e) {} }
    return s;
  }
  function fromCard0(card, kind, opts) {
    if (!card) return null;
    if (kind && typeof kind === 'object') { opts = kind; kind = null; }
    opts = opts || {};
    if (card.steps && card.scripts && card.label) return fromSituation(card, opts);
    if (card.philosophy || card.psychology || card.autistic_lens) return fromDeep(card, opts);
    if (card.id && PRESET_FOR_CARD[card.id] && !kind) return preset(PRESET_FOR_CARD[card.id]);
    var who = opts.who, title = cap(tidy(opts.title || card.name || card.title || '', who));
    var what = arr(card.what).map(function (s) { return tidy(s, who); }).join(' ');
    var how = arr(card.how).map(function (s) { return tidy(s, who); }).filter(Boolean);
    var plain = arr(card.plain).map(function (s) { return tidy(s, who); }).filter(Boolean);
    var script = arr(card.script).map(function (s) { return tidy(s, who); }).filter(Boolean);
    var sub = clip(sentences(what).slice(0, 2).join(' ').replace(/:$/, '.'), 170);
    if (/:\s*$/.test(sub) || sub.length < 12) sub = clip(sentences(what)[0] || '', 170).replace(/:$/, '.');
    var spec = { title: title, subtitle: sub, source: firstLink(card.links), from: card.id || '' };
    if (easyWanted(opts) && plain.length >= 2 && !kind) kind = 'checklist-plain';
    var k = kind || '';
    if (k === 'words' || (!k && !how.length && script.length >= 2)) {
      if (!script.length) return null;
      spec.layout = 'words'; spec.items = script.slice(0, 4); return spec;
    }
    if (k === 'checklist-plain') { spec.layout = 'checklist'; spec.items = plain.slice(0, 8); if (script[0]) spec.say = script[0]; return spec; }
    if (k === 'checklist' || (!k && (how.length > 6 || (how.length < 3 && plain.length >= 3)))) {
      var list = how.length >= 2 ? how : plain.length ? plain : sentences(what);
      spec.layout = 'checklist'; spec.items = list.slice(0, 8).map(labelled);
      if (spec.items.filter(function (x) { return x.label; }).length >= spec.items.length / 2) spec.marker = 'dot';
      if (script[0]) spec.say = script[0];
      return spec;
    }
    if (k === 'pillars' || (!k && how.length < 3)) {
      var src = how.length >= 2 ? how : sentences(what).concat(how);
      if (src.length < 2) src = src.concat(plain);
      if (!src.length) return null;
      spec.layout = 'pillars'; spec.items = src.slice(0, 4).map(labelled);
      if (spec.items.length < 2 && script[0]) { spec.layout = 'words'; spec.items = script.slice(0, 4); return spec; }
      if (src === how || how.length >= 2) spec.subtitle = sub; else spec.subtitle = '';
      if (script[0]) spec.say = script[0];
      return spec;
    }
    if (L[k] && k !== 'steps') { spec.layout = k; spec.items = how.slice(0, 6).map(labelled); if (script[0]) spec.say = script[0]; return spec; }
    spec.layout = 'steps'; spec.items = how.slice(0, 6).map(labelled);
    if (script[0]) spec.say = script[0];
    return spec;
  }

  function fromSituation(issue, opts) {
    if (!issue) return null;
    opts = opts || {};
    var who = opts.who || (opts.self ? { them: 'yourself' } : null);
    var steps = arr(opts.self && issue.steps_self ? issue.steps_self : issue.steps).map(function (s) { return tidy(s, who); }).filter(Boolean);
    var scripts = issue.scripts || {}, key = opts.whoKey && scripts[opts.whoKey] ? opts.whoKey : 'default';
    var say = arr(scripts[key] || scripts['default'] || [])[0];
    var going = sentences(tidy(issue.going, who)).filter(function (s) { return !/\bPillar\b/.test(s); });
    var spec = {
      layout: steps.length >= 3 ? 'steps' : 'checklist', title: cap(tidy(issue.label, who)),
      subtitle: clip(going.slice(0, 1).join(' '), 170), items: steps.slice(0, 6).map(labelled),
      say: say ? tidy(say, who) : '', source: firstLink(issue.path), from: opts.id || ''
    };
    if (spec.layout === 'checklist') spec.items = steps;
    return spec;
  }

  function fromDeep(t, opts) {
    if (!t) return null;
    opts = opts || {};
    function para(x) { return clip(tidy(arr(x).join(' ')), 200); }
    var tiles = [];
    if (t.philosophy) tiles.push({ label: 'The big idea', text: para(t.philosophy), icon: 'star' });
    if (t.psychology) tiles.push({ label: 'What’s going on inside', text: para(t.psychology), icon: 'heart' });
    if (t.autistic_lens) tiles.push({ label: 'Through an autistic lens', text: para(t.autistic_lens), icon: 'leaf' });
    var spec = {
      layout: 'pillars', kicker: 'Three ways of looking', title: cap(t.title || t.id || ''), items: tiles,
      banner: t.together ? { label: 'Together', text: clip(tidy(arr(t.together).join(' ')), 240), icon: 'hands' } : null,
      after: [t.question ? { label: 'A question to sit with', text: clip(tidy(arr(t.question).join(' ')), 170), icon: 'chat' } : null,
              t['try'] ? { label: 'Try this', text: clip(tidy(arr(t['try']).join(' ')), 170), icon: 'star' } : null].filter(Boolean),
      source: firstLink(t.links), from: t.id || ''
    };
    if (SENSITIVE_ID.test(String(t.id || ''))) spec.sensitive = true;
    return spec;
  }

  // "me 60 them 40", "Sam 12 hours, Alex 5", "I do 70% and he does 30%", "60/40"
  var PRON = { me: 'Me', i: 'Me', myself: 'Me', you: 'You', them: 'Them', they: 'Them', he: 'Him', him: 'Him', she: 'Her', her: 'Her', we: 'Us', us: 'Us' };
  function parseSplit(text) {
    var t = String(text || '');
    var unit = /%|percent/i.test(t) ? '%' : /\bhours?\b|\bhrs?\b|\d\s*h\b/i.test(t) ? 'hours' : /\bmin(ute)?s?\b/i.test(t) ? 'minutes' : /\b(tasks?|jobs?|chores?)\b/i.test(t) ? 'jobs' : '';
    var m = /\b(\d{1,3})\s*[\/:]\s*(\d{1,3})(?:\s*[\/:]\s*(\d{1,3}))?\b/.exec(t);
    var data = [];
    var re = /([A-Za-z][A-Za-z'’\-]{0,20})(?:\s+(?:do(?:es)?|did|has|have|gets?|take?s?|carries|carry|is|am|are|on|with|about|around))*\s*[:=\-–]?\s*(\d+(?:\.\d+)?)\s*(?:%|percent|hours?|hrs?|h\b|min(?:ute)?s?|tasks?|jobs?|chores?)?/g, g;
    var STOP = /^(and|or|the|a|an|of|split|is|at|to|for|my|our|me|do|does|vs|versus|make|chart|graph|infographic|picture|show|week|per|out|about|around|hours?|h|minutes?|percent|tasks?|jobs?|chores?)$/i;
    while ((g = re.exec(t))) {
      var nm = g[1], v = +g[2];
      if (/^(do|does|did|has|have|is|am|are)$/i.test(nm)) continue;
      if (STOP.test(nm) && !PRON[nm.toLowerCase()]) continue;
      nm = PRON[nm.toLowerCase()] || nm.charAt(0).toUpperCase() + nm.slice(1);
      if (!data.some(function (d) { return d.name === nm; })) data.push({ name: nm, value: v });
    }
    if (data.length < 2 && m) data = [{ name: 'Person A', value: +m[1] }, { name: 'Person B', value: +m[2] }].concat(m[3] ? [{ name: 'Person C', value: +m[3] }] : []);
    return data.length >= 2 ? { data: data.slice(0, 6), unit: unit } : null;
  }
  function fromSplit(x, opts) {
    opts = opts || {};
    var p = Array.isArray(x) ? { data: x, unit: opts.unit || '' } : parseSplit(x);
    if (!p) return null;
    var tot = p.data.reduce(function (n, d) { return n + (+d.value || 0); }, 0);
    var unit = opts.unit || p.unit;
    return {
      layout: 'split', title: opts.title || 'Who does what', kicker: 'The split, as a picture',
      subtitle: opts.subtitle || (unit === 'hours' ? 'Out of ' + fmtNum(tot) + ' hours of shared work.' : unit === 'minutes' ? 'Out of ' + fmtNum(tot) + ' minutes of shared work.' : unit === 'jobs' ? 'Out of ' + fmtNum(tot) + ' shared jobs.' : 'How the shared work is split right now.'),
      data: p.data, unit: unit, source: '/lemonade-stand.html',
      say: opts.say === false ? '' : 'Could we look at this together and give each regular job one owner, so it feels fair to ' + (p.data.length > 2 ? 'all' : 'both') + ' of us?'
    };
  }

  // the chat's own answer blocks → a poster ("summarise this as an infographic")
  function fromAnswer(blocks, opts) {
    opts = opts || {};
    blocks = arr(blocks);
    var ps = [], list = null, script = null, head = '';
    blocks.forEach(function (b) {
      if (!b) return;
      if (b.k === 'p' && b.x) ps.push(String(b.x));
      else if (b.k === 'h' && !head) head = String(b.x || '');
      else if (b.k === 'list' && !list && arr(b.x).length) list = arr(b.x).map(String);
      else if (b.k === 'script' && !script) script = String(b.x || '');
      else if ((b.k === 'card' || b.k === 'passage' || b.k === 'bg') && !list && arr(b.x).length) { list = sentences(arr(b.x).join(' ')).slice(0, 5); head = head || b.h || ''; }
    });
    var lead = ps.map(function (p) { return tidy(p); }).filter(function (p) { return !/^(Here’s|Here's) (how|a plan)|:$/.test(p) || ps.length === 1; });
    var spec = { title: cap(opts.title || head || 'The short version'), subtitle: clip(sentences(lead.join(' ')).slice(0, 2).join(' '), 170), source: opts.source || '' };
    if (list && list.length >= 3 && list.length <= 6) { spec.layout = 'steps'; spec.items = list.map(tidy).map(labelled); }
    else if (list && list.length) { spec.layout = 'checklist'; spec.items = list.map(tidy).slice(0, 8); }
    else {
      var ss = sentences(lead.join(' '));
      if (ss.length < 2) return null;
      spec.subtitle = '';
      spec.layout = 'pillars'; spec.items = ss.slice(0, 4).map(function (s) { return { text: s }; });
    }
    if (script) spec.say = tidy(script);
    return spec;
  }

  // ------------------------------------------------------------------ presets for the pictures people ask for most
  var PRESETS = {
    'fair-equal': {
      layout: 'compare', title: 'Fair isn’t always equal', kicker: 'Side by side',
      subtitle: 'A 50/50 split on paper can still feel unfair. What matters most is that it feels fair to both of you.',
      left: { label: 'Equal', icon: 'scales', items: ['Every job split down the middle', 'Counts the tasks you can see', 'The same share, whatever else each person carries'] },
      right: { label: 'Fair', icon: 'hands', items: ['Each job has one owner you both agreed on', 'Counts the noticing, planning and remembering too', 'Fits each person’s hours, energy and strengths', 'Looked at again when life changes'] },
      bridge: 'Look at the setup, not the person. Ask each other: does this feel fair to both of us?',
      source: '/share-the-load.html'
    },
    'pursue-withdraw': {
      layout: 'cycle', title: 'One wants to talk now, one needs space', kicker: 'How the loop goes',
      subtitle: 'A very common loop, and it belongs to both of you. The pace mismatch is the problem, not either person.',
      items: [{ label: 'One wants to talk now', text: 'So the problem doesn’t get dropped' }, { label: 'The other pulls back', text: 'They need time before they can talk well' },
              { label: 'It feels like being shut out', text: 'So the one who wants to talk pushes harder' }, { label: 'Pushing feels like pressure', text: 'So the one who needs space pulls back further' }],
      center: 'Nobody is “right” about the pace',
      say: 'I need a break so I don’t say something unfair. I’ll be back at 8:30, and I want to finish this.', sayLabel: 'To step out of the loop',
      source: '/pursue-withdraw.html'
    },
    pause: {
      layout: 'timeline', title: 'Taking a good pause', kicker: 'Before, during, after',
      subtitle: 'A break feels safe to both of you when it comes with a time to come back.',
      items: [{ when: 'Before', label: 'Notice you’re flooded', text: 'A racing heart, a rising voice, or going blank. That’s the signal to pause.', icon: 'heart' },
              { when: 'Starting the pause', label: 'Say it kindly', text: '“I need a break so I don’t say something unfair. I’ll be back at 8:30.”', icon: 'chat' },
              { when: 'During: 20 to 30 minutes', label: 'Take a real break', text: 'Walk, breathe out slowly, do something absorbing. Try not to rehearse your case.', icon: 'leaf' },
              { when: 'After', label: 'Come back at the time you said', text: 'Even if it’s only to say “I need another half hour.” Keeping the time is what makes a pause safe.', icon: 'clock' }],
      source: '/upset-right-now.html'
    },
    'mental-load': {
      layout: 'pillars', title: 'The work nobody sees', kicker: 'In a nutshell',
      subtitle: 'Running a shared life takes thinking work as well as doing. It rarely gets counted, by anyone.',
      items: [{ label: 'Noticing', text: 'The milk is low. The permission slip is due.', icon: 'star' }, { label: 'Planning', text: 'The dentist, the birthday, the weekend.', icon: 'list' },
              { label: 'Remembering', text: 'Who needs what, and when.', icon: 'clock' }, { label: 'Doing', text: 'The part everyone can see.', icon: 'house' }],
      banner: { label: 'One thing to try', text: 'Give each regular job one owner, with the noticing included, not just the doing.', icon: 'hands' },
      say: 'I’m not keeping score. I just want us both to see the whole picture. Could we each write down one week of who does what?',
      source: '/book/preface.html'
    }
  };
  var PRESET_FOR_CARD = { pursuewithdraw: 'pursue-withdraw', breaklength: 'pause' };
  var PRESET_WORDS = [
    ['fair-equal', /\b(fair(ness)? (vs\.?|versus|and|isn.?t|is not|not) equal|equal (vs\.?|versus|and|or) fair|50 ?\/ ?50|fifty.fifty|fair isn.?t (always )?equal)\b/],
    ['pursue-withdraw', /\b(pursu\w*|withdraw\w*|needs? (some )?space|talk (it out )?now|walks? away|shut ?down|stonewall\w*)\b/],
    ['pause', /\b(paus(e|es|ing)|time ?out|cool(ing)? (down|off)|take a break|taking a break|break length|how long .*break|flooded)\b/],
    ['mental-load', /\b(mental load|invisible (work|load|labou?r)|unseen work|work nobody sees|emotional labou?r|default parent)\b/]
  ];
  function preset(name) { var p = PRESETS[name]; return p ? JSON.parse(JSON.stringify(p)) : null; }

  // ------------------------------------------------------------------ finding a topic in the chat's knowledge
  var STOPW = /^(a|an|the|of|on|about|for|to|and|or|my|our|me|you|we|i|it|is|in|with|how|what|why|do|does|make|infographic|chart|poster|picture|visual|one|page|pager|cheat|sheet|please|can|could|would|some|this|that|thing|things)$/;
  function toks(s) { return String(s || '').toLowerCase().replace(/[’']/g, '').split(/[^a-z0-9]+/).filter(function (w) { return w.length > 1 && !STOPW.test(w); }); }
  function stem(w) { return w.replace(/(ings?|ed|es|s)$/, ''); }
  function same(a, b) { return a === b || (a.length >= 5 && b.length >= 5 && a.slice(0, 5) === b.slice(0, 5)); }
  function overlap(q, s) {
    var a = toks(q).map(stem), b = toks(s).map(stem), n = 0;
    a.forEach(function (w) { if (b.some(function (x) { return same(w, x); })) n++; });
    return n;
  }
  function hasPhrase(q, a) { return new RegExp('(^|[^a-z0-9])' + a.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '($|[^a-z0-9])').test(q); }
  function fromKB(topic, KB, opts) {
    opts = opts || {};
    var q = String(topic || '').toLowerCase().trim();
    if (!q) return null;
    var lay = opts.layout || null;
    if (lay === 'split' || /\d+\s*(%|hours?|h\b|min|\/)/.test(q) && parseSplit(q)) { var s0 = fromSplit(q); if (s0) return s0; }
    for (var i = 0; i < PRESET_WORDS.length; i++) if (PRESET_WORDS[i][1].test(q)) {
      var pr = preset(PRESET_WORDS[i][0]);
      if (!lay || lay === 'auto' || pr.layout === lay) return pr;
      break; // they asked for another shape: build it from the cards instead
    }
    KB = KB || window.TOL_CHAT_KB || {};
    var best = null;
    function consider(score, make) { if (score > 0 && (!best || score > best.score)) best = { score: score, make: make }; }
    var deep = Array.isArray(KB.deep) ? KB.deep : (KB.deep && KB.deep.topics) || [];
    deep.forEach(function (d) {
      if (!d || !(d.philosophy || d.psychology)) return;
      var sc = overlap(q, (d.title || '') + ' ' + (d.id || '').replace(/[-_]/g, ' ')) * 2 + (q.indexOf(String(d.title || '').toLowerCase()) >= 0 ? 4 : 0);
      arr(d.patterns).forEach(function (pt) { try { if (new RegExp(pt, 'i').test(q)) sc = Math.max(sc, 5); } catch (e) {} });
      consider(sc + 0.5, function () { return fromDeep(d, opts); });
    });
    arr(KB.cards).forEach(function (c) {
      if (c.kind === 'tool' && !/\b(tool|game|page|how to use)\b/.test(q) && !opts.tools) { /* tools still count, a little less */ }
      var sc = 0;
      arr(c.keys).forEach(function (k) { if (k && hasPhrase(q, String(k).toLowerCase())) sc = Math.max(sc, 3 + String(k).split(' ').length); });
      sc += overlap(q, c.name) * 2 + overlap(q, (c.id || '').replace(/[-_]/g, ' ')) + Math.min(2, overlap(q, arr(c.keys).join(' ')));
      if (!arr(c.how).length && !arr(c.script).length) sc -= 1;
      consider(sc, function () { return fromCard(c, lay && lay !== 'auto' ? lay : null, opts); });
    });
    var issues = (KB.sit && KB.sit.issues) || KB.issues || {};
    Object.keys(issues).forEach(function (id) {
      var iss = issues[id], sc = overlap(q, iss.label) * 2 + overlap(q, id);
      arr(iss.match).forEach(function (m) {
        String(m && m[0] || '').split('|').forEach(function (alt) {
          var a = alt.replace(/[^a-z0-9 ]/gi, ' ').replace(/\s+/g, ' ').trim();
          if (a.length > 3 && hasPhrase(q, a.toLowerCase())) sc = Math.max(sc, 3 + a.split(' ').length);
        });
      });
      consider(sc, function () { var s = fromSituation(iss, opts); s.from = id; return s; });
    });
    if (!best || best.score < 2) return null;
    var spec = best.make();
    if (spec && lay && lay !== 'auto' && L[lay] && spec.layout !== lay) spec = relayout(spec, lay) || spec;
    return spec;
  }
  // re-shape a spec into another layout where that makes sense (steps ⇄ checklist ⇄ pillars)
  function relayout(spec, lay) {
    var items = (spec.items || []).map(itemOf);
    if (!items.length) return null;
    var s = JSON.parse(JSON.stringify(spec)); s.layout = lay; s.kicker = '';
    if (lay === 'checklist') s.items = items.map(function (it) { return (it.label ? it.label + ': ' : '') + it.text; });
    else if (lay === 'words') { var w = arr(spec.say).concat([]); if (!w.length) return null; s.items = w; s.say = ''; }
    else if (lay === 'steps' || lay === 'pillars' || lay === 'timeline' || lay === 'cycle') s.items = items;
    else return null;
    return s;
  }

  // "make an infographic about the mental load" → { topic: 'the mental load', last: false, layout: null }
  var VIS = '(?:infographic|info ?graphic|info-graphic|poster|cheat ?sheet|one[- ]?pager|visual(?:isation|ization)?|diagram|graphic|picture|chart|graph|flow ?chart|mind ?map|timeline)';
  var REQ = [
    new RegExp('\\b(?:make|create|draw|build|give|design|do|turn|put|sketch|whip up|generate)\\b(?:\\s+(?:me|us|it|this|that|out))?(?:\\s+(?:an?|the|some|one|into an?|as an?))?\\s+(?:(?:little|quick|simple|small|nice|printable|short)\\s+)*' + VIS + 's?\\b\\s*(?:of|about|on|for|showing|explaining|that shows|to show|with|from)?\\s*(.*)$', 'i'),
    new RegExp('\\b(?:can|could|would|will) you\\s+(?:please\\s+)?(?:draw|visuali[sz]e|sketch|map out|chart|picture|illustrate)\\s+(.*)$', 'i'),
    new RegExp('\\bshow me\\s+(.*?)\\s+(?:as|in) an?\\s+(?:picture|diagram|chart|' + VIS + ')\\b', 'i'),
    new RegExp('\\b(?:visuali[sz]e|illustrate)\\s+(.*)$', 'i'),
    new RegExp('^\\s*' + VIS + '\\s*(?:of|about|on|for)?\\s*(.*)$', 'i'),
    new RegExp('\\b' + VIS + '\\s+(?:of|about|on|for)\\s+(.*)$', 'i')
  ];
  var LAST = /\b(summari[sz]e|sum up|turn|put|make)\b.{0,30}\b(this|that|it|the (last )?answer|what you (just )?said)\b.{0,30}\b(infographic|picture|poster|visual|one[- ]?pager|cheat ?sheet|diagram|graphic|chart)\b|\b(infographic|picture|poster|visual|one[- ]?pager|cheat ?sheet)\b.{0,12}\b(of|for|from)\s+(this|that|it|the (last )?answer|what you (just )?said)\s*[?.!]*$/i;
  function parseRequest(text) {
    var t = String(text || '').trim();
    if (!t || t.length > 300) return null;
    if (/\b(chore|fill[- ]?in|wiring|weather|feelings?) chart\b/i.test(t) && !/\binfographic|poster|one[- ]?pager|cheat ?sheet\b/i.test(t)) return null;
    if (/\bwhat is (the|an?) (infographic|one[- ]page summary)\b/i.test(t)) return null; // the site's own one-page summary card
    var last = LAST.test(t), topic = null;
    if (!last) {
      for (var i = 0; i < REQ.length; i++) { var m = REQ[i].exec(t); if (m) { topic = m[1]; break; } }
      if (topic == null) return null;
    }
    topic = String(topic || '').replace(/[?.!]+$/, '').replace(/^(?:of|about|on|for)\s+/i, '').replace(/\bplease\b/ig, '').replace(/\s+/g, ' ').trim();
    if (!last && (!topic || /^(this|that|it|the last answer|what you (just )?said|your (last )?answer)$/i.test(topic))) last = true;
    var lay = null;
    if (/\bcheck ?list\b/i.test(t)) lay = 'checklist';
    else if (/\b(steps?|step by step|how to)\b/i.test(t)) lay = 'steps';
    else if (/\b(cycle|loop|circle)\b/i.test(t)) lay = 'cycle';
    else if (/\b(timeline|before.{0,12}after)\b/i.test(t)) lay = 'timeline';
    else if (/\b(do.?s and don.?ts|instead of)\b/i.test(t)) lay = 'dos-donts';
    else if (/\b(compare|comparison|vs\.?|versus)\b/i.test(t)) lay = 'compare';
    else if (/\b(words|scripts?|(what|things) to say|phrases)\b/i.test(t)) lay = 'words';
    else if (parseSplit(t) || /\b(donut|pie|bar) ?(chart|graph)?\b|\bsplit\b.*\d/i.test(t)) lay = 'split';
    if (lay === 'split' && parseSplit(t)) { last = false; if (!topic) topic = t; }
    return { topic: last ? '' : topic, last: last, layout: lay };
  }

  // ------------------------------------------------------------------ actions: PNG, save, share, print
  function forExport(svg, theme) {
    var spec = svg && svg.tolSpec, want = theme || 'light';
    if (spec && svg.tolTheme !== want) return render(spec, { theme: want });
    return svg;
  }
  function svgString(svg, scale) {
    var c = svg.cloneNode(true), sz = svg.tolSize || [W, (svg.viewBox && svg.viewBox.baseVal && svg.viewBox.baseVal.height) || 1200];
    c.setAttribute('width', Math.round(sz[0] * scale)); c.setAttribute('height', Math.round(sz[1] * scale));
    c.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    return new XMLSerializer().serializeToString(c);
  }
  function toPNG(svg, opts) {
    opts = opts || {};
    var scale = Math.max(0.5, Math.min(4, +opts.scale || 2));
    return new Promise(function (resolve, reject) {
      try {
        var s = forExport(svg, opts.theme), sz = s.tolSize || [W, 1200];
        var url = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgString(s, scale)); // data: works under the site's CSP
        var img = new Image();
        img.onload = function () {
          try {
            var cv = document.createElement('canvas');
            cv.width = Math.round(sz[0] * scale); cv.height = Math.round(sz[1] * scale);
            var ctx = cv.getContext('2d');
            ctx.drawImage(img, 0, 0, cv.width, cv.height);
            if (cv.toBlob) cv.toBlob(function (b) { b ? resolve(b) : reject(new Error('png')); }, 'image/png');
            else { var d = cv.toDataURL('image/png'), bin = atob(d.split(',')[1]), u8 = new Uint8Array(bin.length); for (var i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i); resolve(new Blob([u8], { type: 'image/png' })); }
          } catch (e) { reject(e); }
        };
        img.onerror = function () { reject(new Error('The picture could not be drawn.')); };
        img.src = url;
      } catch (e) { reject(e); }
    });
  }
  function slug(s) { return String(s || 'infographic').toLowerCase().replace(/[’']/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 50) || 'infographic'; }
  function nameFor(svg, filename) { return (filename || slug((svg.tolSpec || {}).title)).replace(/\.png$/i, '') + '.png'; }
  function saveBlob(blob, name) {
    var a = document.createElement('a'), u = URL.createObjectURL(blob);
    a.href = u; a.download = name; a.rel = 'noopener';
    a.hidden = true; document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(u); a.remove(); }, 4000);
  }
  function download(svg, filename) {
    return toPNG(svg, { scale: 2 }).then(function (b) { saveBlob(b, nameFor(svg, filename)); return 'downloaded'; });
  }
  function share(svg, meta) {
    meta = meta || {};
    var spec = svg.tolSpec || {}, title = meta.title || spec.title || 'An infographic', alt = svg.tolAlt || [];
    var url = meta.url || (spec.source ? 'https://' + SITE + spec.source : 'https://' + SITE + '/');
    return toPNG(svg, { scale: 2 }).then(function (blob) {
      var file = null;
      try { file = new File([blob], nameFor(svg), { type: 'image/png' }); } catch (e) {}
      // 1. the device's own share menu, with the picture itself (phones and some laptops)
      if (file && navigator.canShare && navigator.share) {
        try {
          if (navigator.canShare({ files: [file] })) {
            return navigator.share({ files: [file], title: title, text: meta.text || title + ' (made with Professor Puddles, ' + SITE + ')' })
              .then(function () { return 'shared'; }, function (e) { return e && e.name === 'AbortError' ? 'cancelled' : (saveBlob(blob, nameFor(svg)), 'downloaded'); });
          }
        } catch (e) {}
      }
      // 2. the site's share sheet, with the poster as text (and the picture saved, so it can be attached)
      if (window.TOLShareKit && typeof window.TOLShareKit.shareText === 'function') {
        saveBlob(blob, nameFor(svg));
        window.TOLShareKit.shareText({ title: title, text: meta.text || alt.slice(0, -1).join('\n'), url: url, heading: 'Share this picture' });
        return 'sheet';
      }
      // 3. just save it
      saveBlob(blob, nameFor(svg));
      return 'downloaded';
    });
  }
  // print just the poster: the page hides everything else while printing (no pop-up window needed)
  function print(svg) {
    var box = document.createElement('div');
    box.className = 'tol-ig-print';
    var s = forExport(svg, svg.tolTheme && /contrast/.test(svg.tolTheme) ? 'contrast' : 'light');
    box.appendChild(s === svg ? svg.cloneNode(true) : s);
    var ol = document.createElement('ol'); ol.className = 'tol-ig-print-text';
    (s.tolAlt || svg.tolAlt || []).forEach(function (t) { var li = document.createElement('li'); li.textContent = t; ol.appendChild(li); });
    box.appendChild(ol);
    document.body.appendChild(box);
    document.documentElement.classList.add('tol-ig-printing');
    var cleaned = false;
    function clean() { if (cleaned) return; cleaned = true; document.documentElement.classList.remove('tol-ig-printing'); box.remove(); window.removeEventListener('afterprint', clean); }
    window.addEventListener('afterprint', clean);
    setTimeout(function () { try { window.print(); } catch (e) {} setTimeout(clean, 1500); }, 60);
  }

  // ------------------------------------------------------------------ mount: the poster with its buttons, for the chat
  var mounted = [];
  function btn(label, cls) { var b = document.createElement('button'); b.type = 'button'; b.className = 'tol-ig-btn ' + (cls || ''); b.textContent = label; return b; }
  function mount(host, spec, opts) {
    linkCss();
    opts = opts || {};
    var fig = document.createElement('figure'); fig.className = 'tol-ig';
    var art = document.createElement('div'); art.className = 'tol-ig-art';
    var svg = render(spec, opts);
    art.appendChild(svg); fig.appendChild(art);
    var acts = document.createElement('div'); acts.className = 'tol-ig-actions';
    var bSave = btn('Save image', 'is-save'), bShare = btn('Share', 'is-share'), bPrint = btn('Print', 'is-print'), bBig = btn('Make it bigger', 'is-big');
    var status = document.createElement('p'); status.className = 'tol-ig-status'; status.setAttribute('role', 'status'); status.setAttribute('aria-live', 'polite');
    var quiet = !!(opts.sensitive || (spec && spec.sensitive));
    (quiet ? [bBig] : [bSave, bShare, bPrint, bBig]).forEach(function (b) { acts.appendChild(b); });
    if (quiet) { status.textContent = 'To keep this private, this picture has no save or share button. Nothing about it is kept on this device.'; status.classList.add('is-note'); }
    fig.appendChild(acts); fig.appendChild(status);
    var det = document.createElement('details'); det.className = 'tol-ig-text';
    var sum = document.createElement('summary'); sum.textContent = 'Read it as text'; det.appendChild(sum);
    function fillText(s) {
      var ol = det.querySelector('ul'); if (ol) ol.remove();
      ol = document.createElement('ul');
      (s.tolAlt || []).forEach(function (t, i) { var li = document.createElement('li'); li.textContent = t; if (i === 0) li.className = 'is-title'; ol.appendChild(li); });
      det.appendChild(ol);
    }
    fillText(svg); fig.appendChild(det);
    function cur() { return art.querySelector('svg'); }
    function say(t) { if (quiet) return; status.textContent = t; clearTimeout(status._t); status._t = setTimeout(function () { status.textContent = ''; }, 6000); }
    bSave.addEventListener('click', function () {
      download(cur()).then(function () { say('Saved as a picture on this device.'); }, function () { say('Sorry, this browser couldn’t make the picture. Try Print instead.'); });
    });
    bShare.addEventListener('click', function () {
      share(cur(), opts.share).then(function (r) {
        say(r === 'shared' ? 'Shared.' : r === 'cancelled' ? '' : r === 'sheet' ? 'The picture is saved on this device, so you can attach it.' : 'Saved as a picture on this device, ready to share.');
      }, function () { say('Sorry, this browser couldn’t make the picture. Try Print instead.'); });
    });
    bPrint.addEventListener('click', function () { print(cur()); });
    bBig.addEventListener('click', function () { bigger(cur(), bBig); });
    if (host) host.appendChild(fig);
    var rec = { fig: fig, art: art, spec: spec, opts: opts, theme: svg.tolTheme, fill: fillText };
    mounted.push(rec);
    watch();
    return fig;
  }
  // "Make it bigger": the poster on its own, filling the screen, scrollable; Esc or Close returns
  function bigger(svg, back) {
    linkCss();
    var dlg = document.createElement('div'); dlg.className = 'tol-ig-big';
    dlg.setAttribute('role', 'dialog'); dlg.setAttribute('aria-modal', 'true'); dlg.setAttribute('aria-label', (svg.tolSpec && svg.tolSpec.title) || 'Infographic');
    var bar = document.createElement('div'); bar.className = 'tol-ig-big-bar';
    var close = btn('Close', 'is-close'), save = btn('Save image', 'is-save'), zoom = btn('Zoom in', 'is-zoom');
    var noSave = !!(svg.tolSpec && svg.tolSpec.sensitive);
    bar.appendChild(zoom); if (!noSave) bar.appendChild(save); bar.appendChild(close);
    var stage = document.createElement('div'); stage.className = 'tol-ig-big-stage';
    // on a phone the poster already fills the width, so start zoomed in (scroll to move around)
    function setZoom(on) { stage.classList.toggle('is-zoom', on); zoom.textContent = on ? 'Fit to screen' : 'Zoom in'; zoom.setAttribute('aria-pressed', String(on)); }
    setZoom(window.innerWidth < 720);
    zoom.addEventListener('click', function () { setZoom(!stage.classList.contains('is-zoom')); });
    var c = render(svg.tolSpec || {}, { theme: svg.tolTheme });
    stage.appendChild(c);
    dlg.appendChild(bar); dlg.appendChild(stage);
    document.body.appendChild(dlg);
    document.documentElement.classList.add('tol-ig-open');
    function shut() {
      document.removeEventListener('keydown', onKey, true);
      dlg.remove(); document.documentElement.classList.remove('tol-ig-open');
      try { back && back.focus(); } catch (e) {}
    }
    function onKey(e) {
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); shut(); }
      else if (e.key === 'Tab') { // keep focus inside
        var f = noSave ? [zoom, close] : [zoom, save, close];
        var i = f.indexOf(document.activeElement);
        if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); } else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); }
      }
    }
    close.addEventListener('click', shut);
    save.addEventListener('click', function () { download(c); });
    dlg.addEventListener('click', function (e) { if (e.target === dlg) shut(); });
    document.addEventListener('keydown', onKey, true);
    close.focus();
  }
  // re-draw mounted posters when dark mode, Easy reading or Quiet mode changes
  var watching = false;
  function redrawAll() {
    mounted = mounted.filter(function (m) { return document.contains(m.fig); });
    mounted.forEach(function (m) {
      var want = themeName(m.opts.theme || (m.spec && m.spec.theme));
      if (want === m.theme && !m.fontChange) return;
      var s = render(m.spec, m.opts), old = m.art.querySelector('svg');
      if (old) m.art.replaceChild(s, old); else m.art.appendChild(s);
      m.theme = s.tolTheme; m.fill(s);
    });
  }
  function watch() {
    if (watching) return;
    watching = true;
    try {
      new MutationObserver(function () { setTimeout(redrawAll, 30); }).observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'data-theme'] });
      if (window.matchMedia) { var mq = window.matchMedia('(prefers-color-scheme: dark)'); if (mq.addEventListener) mq.addEventListener('change', redrawAll); }
    } catch (e) {}
  }

  window.TOLInfographic = {
    version: 1,
    render: render,
    altText: altText,
    mount: mount,
    bigger: bigger,
    fromCard: fromCard,
    fromSituation: fromSituation,
    fromDeep: fromDeep,
    fromSplit: fromSplit,
    parseSplit: parseSplit,
    fromAnswer: fromAnswer,
    fromKB: fromKB,
    relayout: relayout,
    parseRequest: parseRequest,
    presets: PRESETS,
    preset: preset,
    toPNG: toPNG,
    download: download,
    share: share,
    print: print,
    theme: themeName,
    layouts: Object.keys(L),
    icons: Object.keys(ICONS),
    limits: LIMITS
  };
})();
