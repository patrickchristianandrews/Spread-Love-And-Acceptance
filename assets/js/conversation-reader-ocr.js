/* conversation-reader-ocr.js — read screenshots of a chat into the Chat analyzer (/signal-translator.html,
   "A whole conversation or screenshot"; this was the Conversation Reader's screenshot import).

   Everything happens on this device. The screenshot is read in the browser with Tesseract
   (assets/vendor/tesseract/, loaded only when someone picks a screenshot) and is never uploaded,
   saved or sent anywhere. Before the first screenshot it asks which side your messages are on (remembered
   on this device as 'tol-shot-side'), then goes straight to the read. What it read stays in a closed
   "What I read" box with an optional "Edit what I read". It asks one question only when a bubble's side
   really can't be told.

   TOLShotReader.layout(pages)  -> { name, meName, bubbles:[{side:'left'|'right', text}] }
       pages: [{ width, height, lines:[{ text, conf, bbox:{x0,y0,x1,y1}, tint }] }], in order.
       Groups OCR lines into message bubbles by where they sit (left = them, right = me), drops the
       clock and battery bar, the contact header, timestamps, "Delivered"/"Read", typing dots and the
       message box, and removes lines repeated where two screenshots overlap.
   TOLShotReader.mount()        -> adds "Read screenshots" to the Reader page
   TOLShotReader.read(files, say) -> Promise of layout(): reads image files on this device (the single-message
       boxes on /signal-translator.html use it straight from their "From a screenshot" button)
   TOLShotReader.begin()        -> the page's "From a screenshot" button: opens the picker, or the side question first
   TOLShotReader.toTurns(res, meSide, meName, themName) -> {me, turns, text}: "Name: message" lines, one turn per run
   TOLShotReader.onOne          -> set by the page: function ({text, mine, before}) that checks ONE message on
       its own. When it's set, a screenshot with one message goes straight to it, and each row of the review
       gets "Check just this one". */
(function (root) {
  'use strict';

  var VENDOR = '/assets/vendor/tesseract/';

  // ---------------------------------------------------------------- layout (no browser needed)
  var TIME = '\\d{1,2}[:.]\\d{2}\\s?(?:[ap]\\.?\\s?m\\.?)?';
  var CHROME = new RegExp('^(?:' + TIME + '|today|yesterday|now|just now|(?:today|yesterday)\\s+' + TIME + '|' +
    // a day on its own line ("Friday", "Tue, Mar 12", "Saturday 9:41 PM"), but not a message that starts with one ("Friday works")
    '(?:mon|tue|tues|wed|thu|thur|thurs|fri|sat|sun)[a-z]*\\.?,?(?:\\s+(?:\\d.*|at\\s.*|(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\\.?(?:\\s.*)?))?|' +
    '(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\\.?\\s+\\d{1,2}(?:,?\\s+\\d{4})?(?:,?\\s*(?:at\\s+)?' + TIME + ')?|' +
    '\\d{1,2}\\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\\.?(?:,?\\s+\\d{4})?|' + TIME + '\\s*[·•.,-]\\s*(?:read|delivered|sent|seen|edited).*|' +
    '\\d{1,2}/\\d{1,2}/\\d{2,4}.*|delivered|read(?:\\s+' + TIME + '.*)?|read \\d.*|seen(?:\\s.*)?|sent|sending.*|not delivered|edited|' +
    'i ?message|text message|sms|mms|message|messages|type a message|write a message|message\\.\\.\\.|' +
    'lte|5g|4g|3g|wi-?fi|\\d{1,3}\\s?%|.*\\bis typing.*|typing\\.*|online|last seen.*|tap (?:here|for).*|contact info|' +
    '.*end-to-end encrypted.*|•+|\\.{2,}|…|video|audio|details|info|back|<|‹|\\+|aa)$', 'i');
  var TRAIL_TIME = /\s*[-–]?\s*(?:[0-9oOlI]{0,2}[:.;]?\s?[0-9oO]{2}\s?[ap]\.?\s?m\.?|\d{1,2}[:.]\d{2})\s*(?:[✓✔√vVW/\\|»]{1,3})?\s*$/i;
  var JUNK_EDGE = /^[\s|•·‹<>©®™_~=*"'`]+|[\s|•·‹<>©®™_~=*`]+$/g;

  function letters(s) { return (String(s).match(/[A-Za-z]/g) || []).length; }
  function clean(t, keepTime) {
    // OCR often reads a lone "I" as "|" or "l": "| will do it" is "I will do it", "|'ll" is "I'll"
    t = String(t || '').replace(/\s+/g, ' ').replace(/^[|l!1]\s+(?=[a-z])/, 'I ').replace(/(\s)[|](\s)/g, '$1I$2')
      .replace(/(^|\s)[|l1](?=['’](?:ll|m|ve|d)\b)/g, '$1I').replace(/(\s)l(\s+(?:am|was|will|would|can|could|think|know|did|do|have|had|just|really|need|want|love|miss|hope|guess|mean|said|feel|got)\b)/g, '$1I$2')
      // 0 and O mixed up: a zero inside a word is an o, an O inside a time is a zero
      .replace(/([a-z])0(?=[a-z])/gi, '$1o').replace(/\b(\d)O(?=[:.]\d)/g, '$10').replace(/(\d[:.])O(?=\d)|(\d[:.]\d)O\b/g, function (m, a, b) { return (a || b) + '0'; })
      // stray marks: backticks and doubled quotes become plain apostrophes and quotes
      .replace(/[`´]/g, '’').replace(/''/g, '"')
      .replace(JUNK_EDGE, '').trim();
    var prev;
    if (!keepTime) do { prev = t; t = t.replace(TRAIL_TIME, '').replace(JUNK_EDGE, '').trim(); } while (t !== prev);
    // a question mark read as a 7 ("Can we talk at 87")
    var lastS = t.split(/[.!]\s+/).pop();
    if (/^(?:can|could|would|will|what|when|where|why|how|do|does|did|is|are|should|shall)\b/i.test(lastS) && /\d7$/.test(t)) t = t.slice(0, -1) + '?';
    return t;
  }
  function norm(t) { return String(t).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim(); }
  function similar(a, b) {
    a = norm(a); b = norm(b);
    if (!a || !b) return false;
    if (a === b) return true;
    var sa = a.split(' '), sb = b.split(' '), common = 0;
    sa.forEach(function (w) { if (sb.indexOf(w) !== -1) common++; });
    return common / Math.max(sa.length, sb.length) >= 0.8;
  }

  // which side a line sits on: by where it is, then (for a line as wide as the screen) by its bubble's color
  function sideOf(l, W) {
    var x0 = l.bbox.x0 / W, x1 = l.bbox.x1 / W, cx = (x0 + x1) / 2;
    if (x0 > 0.2 && x1 > 0.8) return 'right';
    if (x0 < 0.2 && x1 < 0.8) return 'left';
    if (x0 > 0.28 && cx > 0.52) return 'right';
    if (x1 < 0.72 && cx < 0.48) return 'left';
    if (l.tint === 'me') return 'right';
    if (l.tint === 'them') return 'left';
    return cx >= 0.5 ? 'right' : 'left';
  }

  function onePage(pg) {
    var fx = onePageFx(pg);
    if (fx) return fx;
    var W = pg.width || 1, H = pg.height || 1;
    var lines = (pg.lines || []).map(function (l) { return { text: String(l.text || '').replace(/\s+/g, ' ').trim(), conf: l.conf == null ? 90 : l.conf, bbox: l.bbox, tint: l.tint || '' }; })
      .filter(function (l) { return l.text && l.bbox; });
    lines.sort(function (a, b) { return a.bbox.y0 - b.bbox.y0 || a.bbox.x0 - b.bbox.x0; });
    // the header: the clock and battery bar, and the contact's name, in the top of the screen
    var headLimit = H * 0.15, name = '', nameH = 0;
    for (var hi = 0; hi < lines.length; hi++) {
      var ht = clean(lines[hi].text);
      if (lines[hi].bbox.y1 > headLimit) break;
      if (!CHROME.test(ht) && (ht.split(/\s+/).length >= 4 || ht.length >= 20 || /[?!]$/.test(ht))) { headLimit = lines[hi].bbox.y0 - 1; break; }
    }
    var body = [];
    lines.forEach(function (l) {
      var t = clean(l.text), top = l.bbox.y1 <= headLimit, bottom = l.bbox.y0 >= H * 0.9;
      if (top) {
        var w = t.replace(/[^A-Za-z .'-]/g, '').trim();
        var cx = (l.bbox.x0 + l.bbox.x1) / 2 / W, h = l.bbox.y1 - l.bbox.y0;
        if (w && !CHROME.test(w) && !CHROME.test(t) && w.split(/\s+/).length <= 3 && letters(w) >= 2 && letters(w) >= t.replace(/\s/g, '').length * 0.6 &&
            (Math.abs(cx - 0.5) < 0.22 || l.bbox.x0 / W < 0.45) && h > nameH * 1.05) { name = w.replace(/^[^A-Za-z]+|[^A-Za-z.]+$/g, ''); nameH = h; }
        return;
      }
      if (!t || CHROME.test(t) || (bottom && /^(?:i ?message|message|type a message|text message)\b/i.test(t))) return;
      if (l.conf < 35 && letters(t) < 4) return;
      if (letters(t) === 0 && !/[☀-➿\uD83C-\uDBFF]/.test(t)) return;
      body.push({ text: t, bbox: l.bbox, tint: l.tint });
    });
    // lines into bubbles: close together, and lined up with each other; then the side of the whole bubble
    var hs = body.map(function (l) { return l.bbox.y1 - l.bbox.y0; }).sort(function (a, b) { return a - b; });
    var lineH = hs.length ? hs[Math.floor(hs.length / 2)] : 20;
    var bubbles = [], cur = null;
    body.forEach(function (l) {
      var gap = cur ? l.bbox.y0 - cur.y1 : Infinity;
      var lined = cur && (Math.abs(l.bbox.x0 - cur.x0) < W * 0.06 || Math.abs(l.bbox.x1 - cur.x1) < W * 0.06) && !(l.tint && cur.tint && l.tint !== cur.tint);
      if (cur && lined && gap < lineH * 0.75) { cur.text += ' ' + l.text; cur.y1 = l.bbox.y1; cur.x0 = Math.min(cur.x0, l.bbox.x0); cur.x1 = Math.max(cur.x1, l.bbox.x1); cur.tints.push(l.tint); }
      else { cur = { text: l.text, y0: l.bbox.y0, y1: l.bbox.y1, x0: l.bbox.x0, x1: l.bbox.x1, tint: l.tint, tints: [l.tint] }; bubbles.push(cur); }
    });
    bubbles.forEach(function (b) {
      var me = b.tints.filter(function (x) { return x === 'me'; }).length, them = b.tints.filter(function (x) { return x === 'them'; }).length;
      b.side = sideOf({ bbox: { x0: b.x0, x1: b.x1 }, tint: me > them ? 'me' : them > me ? 'them' : '' }, W);
    });
    return { name: name, bubbles: bubbles.map(function (b) { return { side: b.side, text: clean(b.text) }; }).filter(function (b) { return b.text; }) };
  }

  // ---------------------------------------------------------------- the colour-aware reading
  // When the browser has measured the picture (features(), below), each line also carries:
  //   bg: the colour behind it; inBubble: that colour isn't the screen's own; rect: the bubble it sits in
  //   (found by walking out from the text to where the screen's colour starts); ink: how strongly the text
  //   stands out ({c: contrast, sat: how colourful}); and the same for each word. Then a message is a bubble,
  //   its side is where the bubble sits (not a guess from the words), small grey text inside it (the time,
  //   the ticks) comes off, a coloured name at the top of someone's bubble is who sent it (group chats),
  //   and the clock, header, date chips, receipts, message box and keyboard are left out.
  var INPUT = /^(?:i ?message|text message|rcs message|sms|mms|sms\/mms|chat|message|messages|message\s?\.{2,3}|message…|type a message|write a message|send a message|start a message|signal message|aa|reply)$/i;
  function nameLike(t) {
    t = String(t || '').trim();
    return t.length >= 2 && t.length <= 26 && t.split(/\s+/).length <= 3 && /^[~+]?\s?[A-Za-z][\w.'’ -]*$/.test(t) && !/[?!,]$/.test(t) && !CHROME.test(t) && !INPUT.test(t) &&
      !/^(?:ok|okay|yes|no|yep|nope|sure|thanks|thank you|lol|haha|fine|hi|hey|hello|bye|night|morning|same|cool|nice|great|wow|why|what|when|where|how|who|k|kk)$/i.test(t);
  }
  var EMOJI = /[☀-➿\uD83C-\uDBFF]/;
  function onePageFx(pg) {
    var W = pg.width || 1, H = pg.height || 1;
    var lines = (pg.lines || []).filter(function (l) { return l && l.text && l.bbox && l.bg; });
    if (lines.length < 2) return null;
    lines = lines.map(function (l) { return { text: String(l.text).replace(/\s+/g, ' ').trim(), conf: l.conf == null ? 90 : l.conf, bbox: l.bbox, bg: l.bg, inBubble: !!l.inBubble, rect: l.rect || null, ink: l.ink || { c: 0, sat: 0 }, words: l.words || [], tint: l.tint || '' }; })
      .filter(function (l) { return l.text; });
    lines.sort(function (a, b) { return a.bbox.y0 - b.bbox.y0 || a.bbox.x0 - b.bbox.x0; });
    // a bubble: in a colour block that isn't the whole width (that's the app's header or message bar) and isn't centred (a date chip)
    function bubbly(l) {
      if (!l.inBubble || !l.rect) return false;
      // a block that runs to the edge of the screen or the top is a bar (the status bar, the header, the message box)
      if (l.rect.x0 <= 2 || l.rect.x1 >= W - 3 || l.rect.y0 <= 2) return false;
      var w = l.rect.x1 - l.rect.x0, lm = l.rect.x0 / W, rm = 1 - l.rect.x1 / W;
      return w < W * 0.9 && !(Math.abs(lm - rm) < 0.035 && w < W * 0.6);
    }
    var bubbleLines = lines.filter(bubbly);
    if (bubbleLines.length < 2) return null;
    // the bottom: the message box, and a keyboard under it
    // (the keyboard is always under the message box; with no box found, it's a cluster of single letters with "space" or "return")
    var cut = H, keys = [], keyWord = false;
    lines.forEach(function (l) { if (l.bbox.y0 > H * 0.5 && INPUT.test(clean(l.text, true))) cut = Math.min(cut, l.bbox.y0); });
    if (cut === H) {
      lines.forEach(function (l) {
        var t = clean(l.text, true), flat = t.replace(/\s+/g, '');
        if (l.bbox.y0 <= H * 0.55) return;
        if (/^(?:space|return|enter|go|send|search|done|next|123|\?123|abc)$/i.test(flat)) { keyWord = true; keys.push(l.bbox.y0); }
        else if (/^[a-z]$/i.test(flat) || /^(?:[a-z]\s+){2,}[a-z]$/i.test(t) || /^(?:qwe|asd|zxc|qwerty|asdf|zxcv)/i.test(flat)) keys.push(l.bbox.y0);
      });
      if (keyWord && keys.length >= 5) cut = Math.min.apply(null, keys);
    }
    // the top: the clock and battery, and the header with their name (a full-width bar, or plain lines above the first bubble)
    var firstBubble = Math.min.apply(null, bubbleLines.filter(function (l) { return l.bbox.y0 < cut; }).map(function (l) { return l.bbox.y0; }).concat([H]));
    var headLimit = Math.min(H * 0.2, firstBubble), name = '', nameH = 0;
    var hs = bubbleLines.map(function (l) { return l.bbox.y1 - l.bbox.y0; }).sort(function (a, b) { return a - b; });
    var lineH = hs[Math.floor(hs.length / 2)] || 20;
    var body = [];
    lines.forEach(function (l) {
      if (l.bbox.y0 >= cut - 2) return;
      var t = clean(l.text, true);
      if (l.bbox.y1 <= headLimit && !bubbly(l)) {
        var w = t.replace(/[^A-Za-z0-9 .'_-]/g, '').trim(), h = l.bbox.y1 - l.bbox.y0, cx = (l.bbox.x0 + l.bbox.x1) / 2 / W;
        if (w && !CHROME.test(w) && !CHROME.test(t) && w.split(/\s+/).length <= 3 && letters(w) >= 2 && letters(w) >= t.replace(/\s/g, '').length * 0.6 &&
            (Math.abs(cx - 0.5) < 0.22 || l.bbox.x0 / W < 0.45) && h > nameH * 1.05 && !/,/.test(t)) { name = w.replace(/^[^A-Za-z]+|[^A-Za-z.]+$/g, ''); nameH = h; }
        return;
      }
      if (!t || CHROME.test(t)) return;
      body.push(l);
    });
    // lines into bubbles: the same colour block
    var bubbles = [];
    body.forEach(function (l) {
      if (!bubbly(l)) { bubbles.push({ loose: true, lines: [l], y0: l.bbox.y0, y1: l.bbox.y1 }); return; }
      var r = l.rect, tol = Math.max(lineH * 0.7, H * 0.006), tx = W * 0.025;
      var same = bubbles.filter(function (b) { return !b.loose && Math.abs(b.rect.x0 - r.x0) < tx && Math.abs(b.rect.x1 - r.x1) < tx && Math.abs(b.rect.y0 - r.y0) < tol && Math.abs(b.rect.y1 - r.y1) < tol; })[0];
      if (same) same.lines.push(l);
      else bubbles.push({ rect: r, lines: [l], y0: r.y0, y1: r.y1 });
    });
    bubbles.sort(function (a, b) { return a.y0 - b.y0; });
    var out = [];
    bubbles.forEach(function (b, i) {
      if (b.loose) {
        // a name over someone's bubble in a group chat; anything else outside a bubble (a time, "Seen", "Read") is the app's
        var t = clean(b.lines[0].text, true), next = bubbles[i + 1];
        if (next && !next.loose && nameLike(t) && next.y0 - b.y1 < lineH * 1.6 && sideOfRect(next.rect) === 'left') next.label = t;
        return;
      }
      var ls = b.lines.slice().sort(function (x, y) { return x.bbox.y0 - y.bbox.y0; });
      var inkMax = 0;
      ls.forEach(function (l) { (l.words.length ? l.words : [{ text: l.text, ink: l.ink }]).forEach(function (w) { if (letters(w.text) >= 2 && w.ink && w.ink.c > inkMax) inkMax = w.ink.c; }); });
      var side = sideOfRect(b.rect);
      // a group chat: a short coloured (or fainter) name as the first line of their bubble
      if (side === 'left' && ls.length >= 2 && nameLike(clean(ls[0].text, true))) {
        var l0 = ls[0], rest = ls.slice(1), restSat = Math.max.apply(null, rest.map(function (l) { return l.ink.sat || 0; }));
        if ((l0.ink.sat > 0.3 && l0.ink.sat > restSat + 0.15) || (inkMax && l0.ink.c < inkMax * 0.8)) { b.label = clean(l0.text, true); ls = rest; }
      }
      var texts = ls.map(function (l, k) {
        var ws = l.words.length ? l.words : [{ text: l.text, ink: l.ink, conf: l.conf }];
        ws = ws.map(function (w) { var tw = String(w.text || '').trim(); return /^[|\[\]]$/.test(tw) ? { text: 'I', ink: w.ink, conf: w.conf } : w; });
        ws = ws.filter(function (w) {
          var tw = String(w.text || '').trim(), c = w.ink ? w.ink.c : 0;
          if (tw.replace(/[^A-Za-z0-9]/g, '').length <= 2 && w.ink && w.ink.sat > 0.45 && !EMOJI.test(tw)) return false;   // a colourful picture: an emoji, a reaction
          if (!tw) return false;
          if (inkMax && c && c < inkMax * 0.7) return false;                                   // small grey text: the time, "edited"
          if (!letters(tw) && !/\d/.test(tw) && !EMOJI.test(tw) && /[^.,!?'’"()\-–—…:;]/.test(tw)) return false;   // a picture (an emoji or ticks) read as marks
          if (letters(tw) <= 1 && !/\d/.test(tw) && w.ink && w.ink.sat > 0.35 && !EMOJI.test(tw)) return false;
          return true;
        });
        return clean(ws.map(function (w) { return String(w.text).trim(); }).join(' '), k < ls.length - 1);
      }).filter(Boolean);
      var text = clean(texts.join(' '));
      if (!text) return;
      var lm = b.rect.x0 / W, rm = 1 - b.rect.x1 / W;
      out.push({ side: side, text: text, who: b.label || '', clear: Math.abs(lm - rm) >= 0.08, key: colourKey(ls[0].bg), lm: lm, rm: rm });
    });
    // A long bubble can reach almost across the screen, so where it sits doesn't say much. Bubbles of one colour
    // are one side (my blue or green ones, their grey or white ones): such a bubble takes the side of the clearly
    // placed bubbles of its colour. Only a bubble with neither is unsure.
    // Within one colour, bubbles that all start at the same place are on the left; all ending at the same place, the right.
    var bySide = {}, groups = {}, sideOf = {};
    out.forEach(function (o) { (groups[o.key] || (groups[o.key] = [])).push(o); if (!o.clear) return; var k = bySide[o.key] || (bySide[o.key] = { left: 0, right: 0 }); k[o.side]++; });
    Object.keys(groups).forEach(function (key) {
      var g = groups[key], k = bySide[key], x0s = g.map(function (o) { return o.lm; }), x1s = g.map(function (o) { return o.rm; });
      var s0 = Math.max.apply(null, x0s) - Math.min.apply(null, x0s), s1 = Math.max.apply(null, x1s) - Math.min.apply(null, x1s);
      if (k && k.left !== k.right) sideOf[key] = k.left > k.right ? 'left' : 'right';
      else if (g.length >= 2 && s0 < 0.012 && s1 > 0.025) sideOf[key] = 'left';
      else if (g.length >= 2 && s1 < 0.012 && s0 > 0.025) sideOf[key] = 'right';
    });
    // two colours, one of them known: the other is the other side
    var keys = Object.keys(groups);
    if (keys.length === 2 && !!sideOf[keys[0]] !== !!sideOf[keys[1]]) { var known = sideOf[keys[0]] ? 0 : 1; sideOf[keys[1 - known]] = sideOf[keys[known]] === 'left' ? 'right' : 'left'; }
    out.forEach(function (o) {
      var g = sideOf[o.key] || '';
      if (!o.clear && g) o.side = g;
      o.unsure = !o.clear && !g && Math.abs(o.lm - o.rm) < 0.05;
      delete o.clear; delete o.key; delete o.lm; delete o.rm;
    });
    // in a group chat, a name shows once over a run of someone's messages: the rest of the run is theirs too
    var lastLabel = '';
    out.forEach(function (b) { if (b.side !== 'left') { lastLabel = ''; return; } if (b.who) lastLabel = b.who; else if (lastLabel) b.who = lastLabel; });
    return { name: name, bubbles: out, fx: true };
    function colourKey(c) { return c ? [c[0] >> 4, c[1] >> 4, c[2] >> 4].join(',') : ''; }
    function sideOfRect(r) { var lm = r.x0 / W, rm = 1 - r.x1 / W; return lm < rm ? 'left' : 'right'; }
  }

  function layout(pages) {
    var all = [], name = '';
    (pages || []).forEach(function (pg) {
      var r = onePage(pg);
      if (!name && r.name) name = r.name;
      // screenshots that overlap: drop the lines the previous one already had
      var skip = 0;
      for (var k = Math.min(all.length, r.bubbles.length); k >= 1; k--) {
        var ok = true;
        for (var j = 0; j < k && ok; j++) { var a = all[all.length - k + j], b = r.bubbles[j]; ok = a.side === b.side && similar(a.text, b.text); }
        if (ok) { skip = k; break; }
      }
      all = all.concat(r.bubbles.slice(skip));
    });
    // no name in the header: a greeting in my own messages may name them ("thanks Alex!"), and theirs may name me
    var meName = '';
    function named(side) {
      for (var i = 0; i < all.length; i++) {
        if (all[i].side !== side) continue;
        var m = all[i].text.match(/\b(?:hi|hey|hiya|hello|thanks|thank you|thx|love you|morning|night|sorry|ok|okay|yes|no)\s*,?\s+([a-z]{3,15})\b/i);
        if (m && /^[A-Z][a-z]+$/.test(m[1]) && !/^(?:You|The|For|And|But|Too|Babe|Honey|Love|Dear|Man|Dude|Mate|Guys|All|Everyone|Again|Though|Then|Now|So|Just)$/.test(m[1])) return m[1];
      }
      return '';
    }
    if (!name) name = named('right');
    meName = named('left');
    return { name: name, meName: meName, bubbles: all };
  }

  // The two readings of one screenshot (plain gray, and light text in colored bubbles), merged: the same
  // bubble read twice counts once. A short bubble like "No." can come back as "oO" from the other picture,
  // in a box that only partly overlaps, so a line on the same row that overlaps at all is the same line,
  // and the reading with more letters and better confidence wins.
  function sameLine(a, b) {
    var ix = Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0), iy = Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0);
    if (ix <= 0 || iy <= 0) return false;
    var hMin = Math.min(a.y1 - a.y0, b.y1 - b.y0), wMin = Math.min(a.x1 - a.x0, b.x1 - b.x0);
    return iy >= hMin * 0.5 && ix >= wMin * 0.3;
  }
  function junk(t) { var x = String(t || '').replace(/[\s.,'"`-]/g, ''); return x.length <= 3 && /^[oO0Qcé°º]+$/.test(x); }
  function mergeReads(a, b) {
    var merged = (a || []).map(function (l) { return { text: l.text, conf: l.conf, bbox: l.bbox, words: l.words }; });
    (b || []).forEach(function (l) {
      var same = merged.filter(function (m) { return sameLine(m.bbox, l.bbox); });
      if (!same.length) { merged.push({ text: l.text, conf: l.conf, bbox: l.bbox, words: l.words }); return; }
      same.forEach(function (m) {
        // junk ("oO") always loses; otherwise the more confident reading wins, as long as it kept most of the letters;
        // between two equal readings, the one that kept the full stop wins
        var better = junk(m.text) && !junk(l.text) ||
          !junk(l.text) && (l.conf > m.conf + 5 && letters(l.text) >= letters(m.text) * 0.6 ||
            Math.abs(l.conf - m.conf) <= 5 && letters(l.text) === letters(m.text) && /[.!?]\s*$/.test(l.text) && !/[.!?]\s*$/.test(m.text));
        if (better) { m.text = l.text; m.conf = l.conf; m.bbox = l.bbox; m.words = l.words; }
      });
    });
    // a stray "oO" left on the same row as a real line is noise
    merged = merged.filter(function (m) { return !junk(m.text) || !merged.some(function (o) { return o !== m && !junk(o.text) && Math.min(o.bbox.y1, m.bbox.y1) - Math.max(o.bbox.y0, m.bbox.y0) > 0; }); });
    return merged.filter(function (m) { return (m.conf >= 30 || letters(m.text) >= 3) && !(junk(m.text) && (m.conf || 0) < 80); });
  }

  var api = { layout: layout, clean: clean, CHROME: CHROME, mergeReads: mergeReads, toTurns: toTurns };
  if (typeof module !== 'undefined' && module.exports) { module.exports = api; return; }
  root.TOLShotReader = api;

  // ---------------------------------------------------------------- reading the images (browser only)
  var doc = root.document;
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  var tessP = null;
  function loadTesseract() {
    if (root.Tesseract) return Promise.resolve(root.Tesseract);
    if (tessP) return tessP;
    tessP = new Promise(function (res, rej) {
      var s = doc.createElement('script'); s.src = VENDOR + 'tesseract.min.js'; s.async = true;
      s.onload = function () { root.Tesseract ? res(root.Tesseract) : rej(new Error('no Tesseract')); };
      s.onerror = function () { tessP = null; rej(new Error('could not load')); };
      doc.head.appendChild(s);
    });
    return tessP;
  }
  function toCanvas(file) {
    return new Promise(function (res, rej) {
      var url = URL.createObjectURL(file), img = new Image();
      img.onload = function () {
        // small screenshots read better a little larger
        var k = img.naturalWidth < 900 ? 2 : 1;
        var c = doc.createElement('canvas'); c.width = img.naturalWidth * k; c.height = img.naturalHeight * k;
        var g = c.getContext('2d'); g.imageSmoothingQuality = 'high'; g.drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url); res(c);
      };
      img.onerror = function () { URL.revokeObjectURL(url); rej(new Error('not an image')); };
      img.src = url;
    });
  }
  // Two pictures for the reader. The first is plain gray: dark text on light bubbles. The second finds
  // light text: inside colored bubbles (my blue or green ones) the light pixels become black text on white,
  // and on a dark-mode screen everything else is turned inside out; on a light screen everything else is
  // left blank, so the text the first picture already has isn't read twice.
  function gray(c) {
    var o = doc.createElement('canvas'); o.width = c.width; o.height = c.height;
    var g = o.getContext('2d'); g.drawImage(c, 0, 0);
    var d = g.getImageData(0, 0, o.width, o.height), p = d.data;
    for (var i = 0; i < p.length; i += 4) { var y = 0.299 * p[i] + 0.587 * p[i + 1] + 0.114 * p[i + 2]; p[i] = p[i + 1] = p[i + 2] = y; }
    g.putImageData(d, 0, 0);
    return o;
  }
  function lightText(c) {
    var W = c.width, H = c.height, o = doc.createElement('canvas'); o.width = W; o.height = H;
    var g = o.getContext('2d'); g.drawImage(c, 0, 0);
    var d = g.getImageData(0, 0, W, H), p = d.data, n = W * H;
    var sat = new Uint8Array(n), lum = new Uint8Array(n), sum = 0, i, x, y;
    for (i = 0; i < n; i++) {
      var r = p[i * 4], gg = p[i * 4 + 1], b = p[i * 4 + 2], mx = Math.max(r, gg, b), mn = Math.min(r, gg, b);
      lum[i] = 0.299 * r + 0.587 * gg + 0.114 * b; sum += lum[i];
      sat[i] = mx > 60 && (mx - mn) / mx > 0.35 ? 1 : 0;
    }
    var dark = sum / n < 110;
    // how much color is near each pixel (a box around it, from a running total)
    var R = Math.max(6, Math.round(W * 0.018)), I = new Uint32Array((W + 1) * (H + 1));
    for (y = 1; y <= H; y++) { var row = 0; for (x = 1; x <= W; x++) { row += sat[(y - 1) * W + x - 1]; I[y * (W + 1) + x] = I[(y - 1) * (W + 1) + x] + row; } }
    for (y = 0; y < H; y++) {
      var y0 = Math.max(0, y - R), y1 = Math.min(H, y + R + 1);
      for (x = 0; x < W; x++) {
        var x0 = Math.max(0, x - R), x1 = Math.min(W, x + R + 1);
        var cnt = I[y1 * (W + 1) + x1] - I[y0 * (W + 1) + x1] - I[y1 * (W + 1) + x0] + I[y0 * (W + 1) + x0];
        var k = y * W + x, frac = cnt / ((y1 - y0) * (x1 - x0)), near = frac > 0.3, v;
        // inside the bubble (not its soft edge), a light pixel is a letter
        if (near) v = frac > 0.55 && !sat[k] && lum[k] > 150 ? 0 : 255;
        else v = dark ? 255 - lum[k] : 255;
        p[k * 4] = p[k * 4 + 1] = p[k * 4 + 2] = v;
      }
    }
    g.putImageData(d, 0, 0);
    return o;
  }
  // the bubble behind a line: a colored bubble (blue, green) is usually mine, a gray or white one theirs
  function tintAt(c, bbox) {
    var hh = bbox.y1 - bbox.y0, g = c.getContext('2d'), pts = [[bbox.x0 - 6, (bbox.y0 + bbox.y1) / 2], [bbox.x1 + 6, (bbox.y0 + bbox.y1) / 2], [bbox.x0 - 6, bbox.y0 - 3], [bbox.x0 + 2, bbox.y0 - hh * 0.3], [bbox.x0 + 2, bbox.y1 + hh * 0.25]];
    var sat = 0, n = 0;
    pts.forEach(function (pt) {
      var x = Math.max(0, Math.min(c.width - 1, Math.round(pt[0]))), y = Math.max(0, Math.min(c.height - 1, Math.round(pt[1])));
      var px = g.getImageData(x, y, 1, 1).data, mx = Math.max(px[0], px[1], px[2]), mn = Math.min(px[0], px[1], px[2]);
      sat += mx ? (mx - mn) / mx : 0; n++;
    });
    sat /= n;
    return sat > 0.3 ? 'me' : sat < 0.08 ? 'them' : '';
  }
  function linesOf(data) {
    var out = [];
    (data.blocks || []).forEach(function (bl) { (bl.paragraphs || []).forEach(function (pa) { (pa.lines || []).forEach(function (l) {
      out.push({ text: l.text, conf: l.confidence, bbox: l.bbox, words: (l.words || []).map(function (w) { return { text: w.text, conf: w.confidence, bbox: w.bbox }; }) });
    }); }); });
    return out;
  }
  // What the colour-aware reading needs (see onePageFx): the screen's colour, the colour behind each line,
  // the bubble each line sits in, and how strongly each line and word stands out from its bubble.
  function features(c, lines) {
    var W = c.width, H = c.height, data = c.getContext('2d').getImageData(0, 0, W, H).data;
    function at(x, y) { x = x < 0 ? 0 : x >= W ? W - 1 : x | 0; y = y < 0 ? 0 : y >= H ? H - 1 : y | 0; var i = (y * W + x) * 4; return [data[i], data[i + 1], data[i + 2]]; }
    function dist(a, b) { return Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]); }
    function mode(pts) {
      var h = {}, best = null;
      pts.forEach(function (p) { var k = (p[0] >> 4) + ',' + (p[1] >> 4) + ',' + (p[2] >> 4), e = h[k] || (h[k] = { n: 0, r: 0, g: 0, b: 0 }); e.n++; e.r += p[0]; e.g += p[1]; e.b += p[2]; if (!best || e.n > best.n) best = e; });
      return best ? [best.r / best.n, best.g / best.n, best.b / best.n] : [255, 255, 255];
    }
    // the screen's own colour: thin strips down both edges, between the header and the bottom
    var pts = [], y;
    for (y = H * 0.18; y < H * 0.82; y += H / 240) [0.006, 0.014, 0.986, 0.994].forEach(function (fx) { pts.push(at(W * fx, y)); });
    var screen = mode(pts);
    function inkOf(b, bg) {
      var x0 = Math.max(0, b.x0 | 0), x1 = Math.min(W - 1, b.x1 | 0), y0 = Math.max(0, b.y0 | 0), y1 = Math.min(H - 1, b.y1 | 0);
      var st = Math.max(1, Math.floor((y1 - y0) / 24)), ds = [], ps = [], x, yy;
      for (yy = y0; yy <= y1; yy += st) for (x = x0; x <= x1; x += st) { var p = at(x, yy); ds.push(dist(p, bg)); ps.push(p); }
      if (!ds.length) return { c: 0, sat: 0 };
      var sorted = ds.slice().sort(function (a, b2) { return a - b2; }), c95 = sorted[Math.floor(sorted.length * 0.95)] || 0, r = 0, g = 0, bl = 0, n = 0;
      ds.forEach(function (d, i) { if (d >= c95 * 0.8 && d > 0) { r += ps[i][0]; g += ps[i][1]; bl += ps[i][2]; n++; } });
      if (!n) return { c: c95, sat: 0 };
      r /= n; g /= n; bl /= n;
      var mx = Math.max(r, g, bl), mn = Math.min(r, g, bl);
      return { c: c95, sat: mx > 90 ? (mx - mn) / mx : 0 };   // very dark ink is never "colourful"
    }
    lines.forEach(function (l) {
      var b = l.bbox, h = b.y1 - b.y0, m = Math.max(3, Math.round(h * 0.25)), ring = [], k;
      for (k = 0; k <= 6; k++) { var yy = b.y0 + h * k / 6; ring.push(at(b.x0 - m, yy), at(b.x0 - 2 * m, yy), at(b.x1 + m, yy), at(b.x1 + 2 * m, yy)); }
      for (k = 0; k <= 8; k++) { var xx = b.x0 + (b.x1 - b.x0) * k / 8; ring.push(at(xx, b.y0 - m), at(xx, b.y1 + m)); }
      var bg = mode(ring), sd = dist(bg, screen);
      l.bg = bg.map(Math.round); l.inBubble = sd > 18;
      l.ink = inkOf(b, bg);
      (l.words || []).forEach(function (w) { if (w.bbox) w.ink = inkOf(w.bbox, bg); });
      if (!l.inBubble) return;
      // the bubble: walk out from the text through its padding until the screen's colour starts
      function scr(p) { return dist(p, screen) < Math.max(12, sd * 0.35) && dist(p, bg) > Math.max(10, sd * 0.4); }
      var cy = (b.y0 + b.y1) / 2, x0 = b.x0 - 1, x1 = b.x1 + 1, miss = 0;
      while (x0 > 0) { if (scr(at(x0 - 1, cy))) { if (++miss >= 3) break; } else miss = 0; x0--; } x0 += miss;
      miss = 0; while (x1 < W - 1) { if (scr(at(x1 + 1, cy))) { if (++miss >= 3) break; } else miss = 0; x1++; } x1 -= miss;
      var xp = b.x0 - x0 >= 6 ? Math.round((x0 + b.x0) / 2) : Math.round(x0 + 2), y0 = Math.round(cy), y1 = Math.round(cy);
      miss = 0; while (y0 > 0) { if (scr(at(xp, y0 - 1))) { if (++miss >= 3) break; } else miss = 0; y0--; } y0 += miss;
      miss = 0; while (y1 < H - 1) { if (scr(at(xp, y1 + 1))) { if (++miss >= 3) break; } else miss = 0; y1++; } y1 -= miss;
      l.rect = { x0: x0, x1: x1, y0: y0, y1: y1 };
    });
  }
  function readImages(files, say, opts) {
    var pages = [];
    return loadTesseract().then(function (T) {
      say('Getting the reader ready on this device…');
      return T.createWorker('eng', 1, { workerPath: VENDOR + 'worker.min.js', corePath: VENDOR + 'core', langPath: VENDOR + 'lang', gzip: true, cacheMethod: 'none' })
        // sparse text: chat bubbles are scattered blocks, not a page of paragraphs
        .then(function (w) { return w.setParameters({ tessedit_pageseg_mode: '11', preserve_interword_spaces: '1' }).then(function () { return w; }); });
    }).then(function (worker) {
      var chain = Promise.resolve();
      files.forEach(function (f, i) {
        chain = chain.then(function () {
          say('Reading screenshot ' + (i + 1) + ' of ' + files.length + '…');
          return toCanvas(f).then(function (c) {
            return worker.recognize(gray(c), {}, { blocks: true }).then(function (r1) {
              return worker.recognize(lightText(c), {}, { blocks: true }).then(function (r2) {
                var merged = mergeReads(linesOf(r1.data), linesOf(r2.data));
                merged.forEach(function (m) { m.tint = tintAt(c, m.bbox); });
                try { features(c, merged); } catch (e) { merged.forEach(function (m) { delete m.bg; }); }
                pages.push({ width: c.width, height: c.height, lines: merged });
              });
            });
          });
        });
      });
      return chain.then(function () { return worker.terminate(); }, function (e) { worker.terminate(); throw e; });
    }).then(function () { var r = layout(pages); if (opts && opts.raw) r.pages = pages; return r; });
  }

  // ---------------------------------------------------------------- the page: which side is yours, pick, read
  // Which side your own messages are on is asked once, before the first screenshot is read, and remembered on
  // this device ('tol-shot-side': 'right' or 'left'). A message's side is where its bubble sits, never a guess.
  var SIDE_KEY = 'tol-shot-side';
  function savedSide() { try { var v = root.localStorage.getItem(SIDE_KEY); return v === 'left' || v === 'right' ? v : ''; } catch (e) { return ''; } }
  function saveSide(v) { try { root.localStorage.setItem(SIDE_KEY, v); } catch (e) {} }
  // a reading into a conversation: my side is "Me" (or the name given), theirs is their name, or each person's
  // name in a group chat; messages in a row from the same person are one turn
  function toTurns(res, meSide, meName, themName) {
    var me = String(meName || 'Me').replace(/:/g, '').trim() || 'Me';
    var them = String(themName || res.name || 'Them').replace(/:/g, '').trim() || 'Them';
    if (them.toLowerCase() === me.toLowerCase()) them = them + ' (them)';
    var turns = [];
    (res.bubbles || []).forEach(function (b) {
      var t = String(b.text || '').replace(/\s*\n+\s*/g, ' ').trim(); if (!t) return;
      var who = b.side === meSide ? me : (b.who ? String(b.who).replace(/:/g, '').trim() : them) || them;
      if (b.side !== meSide && who.toLowerCase() === me.toLowerCase()) who = who + ' (them)';
      var last = turns[turns.length - 1];
      if (last && last.who === who) last.texts.push(t); else turns.push({ who: who, mine: who === me, texts: [t] });
    });
    return { me: me, turns: turns, text: turns.map(function (t) { return t.who + ': ' + t.texts.join(' '); }).join('\n') };
  }
  function mount() {
    var step = doc.querySelector('.cr-input-step'), actions = step && step.querySelector('.cr-actions');
    if (!step || !actions || doc.getElementById('cr-shot')) return;
    var side = savedSide() || 'right';
    function opt(v, title, small) {
      return '<label class="cr-side-opt"><input type="radio" name="cr-side" value="' + v + '"' + (v === side ? ' checked' : '') + '>' +
        '<span class="cr-mock' + (v === 'left' ? ' is-left' : '') + '" aria-hidden="true"><i class="t"></i><i class="m">you</i><i class="t" style="width:40%"></i></span>' +
        '<b>' + title + '</b>' + (small ? '<small>' + small + '</small>' : '') + '</label>';
    }
    var box = doc.createElement('div');
    box.className = 'cr-shots';
    box.innerHTML = '<p class="cr-shots-h"><strong>Or use a screenshot.</strong> Pick one or more screenshots of the chat, in order (iMessage, WhatsApp, Messenger, Android Messages, Instagram, texts). You can also paste or drop them here.</p>' +
      '<fieldset class="cr-side" id="cr-side"><legend>Which side are your messages on?</legend><div class="cr-side-opts">' +
      opt('right', 'Mine are on the right', 'Usual on iMessage, WhatsApp and Messenger') + opt('left', 'Mine are on the left', 'The other way round') + '</div></fieldset>' +
      '<p class="cr-side-line" id="cr-side-line" hidden>Your messages: <b id="cr-side-now"></b> <span aria-hidden="true">·</span> <button type="button" class="linkbtn" id="cr-side-change">change</button></p>' +
      '<div class="cr-actions"><label class="cr-btn" for="cr-shot" tabindex="0" role="button" id="cr-shot-pick">Choose screenshots</label>' +
      '<button type="button" class="cr-btn" id="cr-shot-read" hidden>Read the screenshot</button>' +
      '<input type="file" id="cr-shot" accept="image/*" multiple style="position:absolute;left:-9999px;width:1px;height:1px"></div>' +
      '<p class="cr-hint cr-shots-private">Your screenshot is read on this device and never uploaded.</p>' +
      '<p class="cr-hint" id="cr-shot-status" role="status" aria-live="polite"></p>';
    actions.parentNode.insertBefore(box, actions.nextSibling);
    var review = doc.createElement('div'); review.id = 'cr-review';
    box.parentNode.insertBefore(review, box.nextSibling);
    var input = doc.getElementById('cr-shot'), status = doc.getElementById('cr-shot-status');
    var label = doc.getElementById('cr-shot-pick'), readBtn = doc.getElementById('cr-shot-read'), fs = doc.getElementById('cr-side'), line = doc.getElementById('cr-side-line');
    var pending = null, last = null;
    function paintSide() {
      var known = !!savedSide();
      fs.hidden = known; line.hidden = !known;
      doc.getElementById('cr-side-now').textContent = side === 'left' ? 'left' : 'right';
      label.textContent = known ? 'Choose screenshots' : 'Continue: choose screenshots';
    }
    paintSide();
    Array.prototype.forEach.call(fs.querySelectorAll('input[name="cr-side"]'), function (r) { r.addEventListener('change', function () { if (r.checked) side = r.value; }); });
    doc.getElementById('cr-side-change').addEventListener('click', function () {
      try { root.localStorage.removeItem(SIDE_KEY); } catch (e) {}
      paintSide(); var r = fs.querySelector('input:checked'); if (r) r.focus();
    });
    function confirmSide() { saveSide(side); paintSide(); }
    label.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); input.click(); } });
    function say(t) { status.textContent = t; }
    function run(files) {
      files = Array.prototype.filter.call(files || [], function (f) { return /^image\//.test(f.type); });
      if (!files.length) return;
      // not asked yet: ask first, then read
      if (!savedSide()) { pending = files; readBtn.hidden = false; say('Which side are your messages on? Pick one above, then tap “Read the screenshot”.'); fs.scrollIntoView && fs.scrollIntoView({ block: 'center', behavior: 'smooth' }); return; }
      pending = null; readBtn.hidden = true;
      review.innerHTML = '';
      say('Loading the screenshot reader on this device…');
      readImages(files, say).then(function (res) {
        var found = res.bubbles.reduce(function (a, b) { return a + letters(b.text); }, 0);
        if (!res.bubbles.length || found < 2) { say('I couldn’t find any messages in that screenshot. Try a sharper one, or paste the text instead.'); return; }
        say('');
        // one message: check it on its own, in the right single-message mode
        if (res.bubbles.length === 1 && typeof root.TOLShotReader.onOne === 'function') { root.TOLShotReader.onOne({ text: res.bubbles[0].text, mine: res.bubbles[0].side === side }); return; }
        last = res; settle(res);
      }, function () {
        say('The screenshot reader couldn’t start in this browser. You can still paste or type the conversation above.');
      });
    }
    readBtn.addEventListener('click', function () { confirmSide(); if (pending) run(pending); });
    input.addEventListener('change', function () { confirmSide(); run(input.files); input.value = ''; });
    function imagesFrom(dt) { return dt ? Array.prototype.filter.call(dt.files || [], function (f) { return /^image\//.test(f.type); }) : []; }
    step.addEventListener('dragover', function (e) { if (e.dataTransfer && Array.prototype.some.call(e.dataTransfer.items || [], function (i) { return i.kind === 'file'; })) { e.preventDefault(); step.classList.add('is-drop'); } });
    step.addEventListener('dragleave', function () { step.classList.remove('is-drop'); });
    step.addEventListener('drop', function (e) { var f = imagesFrom(e.dataTransfer); if (f.length) { e.preventDefault(); step.classList.remove('is-drop'); run(f); } });
    // only while this step is on screen (on the Chat analyzer it sits in the "whole conversation" view)
    doc.addEventListener('paste', function (e) { if (!step.offsetParent) return; var f = imagesFrom(e.clipboardData); if (f.length) { e.preventDefault(); run(f); } });

    // Only when a bubble sits in the middle, so its side really can't be told: one question, about that message
    function settle(res) {
      var u = res.bubbles.filter(function (b) { return b.unsure; })[0];
      if (!u) { readAll(res); return; }
      var them = res.name || 'They';
      review.innerHTML = '<div class="cr-ask1" role="group" aria-labelledby="cr-ask1-h"><p id="cr-ask1-h" style="margin:0"><strong>One quick question:</strong> who sent this message?</p><q>' + esc(u.text) + '</q>' +
        '<div class="cr-actions" style="margin:0"><button type="button" class="cr-btn" data-mine="1">I did</button><button type="button" class="cr-btn is-quiet" data-mine="0">' + esc(them) + ' did</button></div></div>';
      Array.prototype.forEach.call(review.querySelectorAll('[data-mine]'), function (b) {
        b.addEventListener('click', function () { u.side = b.getAttribute('data-mine') === '1' ? side : (side === 'right' ? 'left' : 'right'); u.unsure = false; settle(res); });
      });
      var q = review.querySelector('[data-mine]'); if (q) q.focus();
    }
    // straight to the read; what was read stays in a closed "What I read" box, with an optional Edit
    function readAll(res, meName, themName) {
      var tt = toTurns(res, side, meName, themName);
      if (!tt.text) return;
      review.innerHTML = '<details class="cr-read" id="cr-read"><summary>What I read <span class="cr-drop-n">' + res.bubbles.length + ' messages</span></summary><div class="cr-read-b">' +
        '<ol>' + tt.turns.map(function (t) { return '<li' + (t.mine ? ' class="is-me"' : '') + '><b>' + esc(t.who) + (t.mine ? ' (you)' : '') + ':</b> ' + esc(t.texts.join(' ')) + '</li>'; }).join('') + '</ol>' +
        '<p class="cr-hint">Read on this device from your screenshot. If a word or a side is off, you can fix it.</p>' +
        '<button type="button" class="cr-btn is-quiet is-small" id="cr-read-edit">Edit what I read</button></div></details>';
      doc.getElementById('cr-read-edit').addEventListener('click', function () { showReview(res, tt.me, themName); });
      var ta = doc.getElementById('cr-input'); if (ta) ta.value = tt.text;
      if (root.TOLReaderPage && root.TOLReaderPage.read) root.TOLReaderPage.read(tt.text, tt.me);
      else { var goBtn = doc.getElementById('cr-go'); if (goBtn) goBtn.click(); }
    }

    var rows = [], meSide = 'right';
    function showReview(res, meName, themName) {
      rows = res.bubbles.map(function (b) { return { side: b.side, text: b.text, who: b.who || '' }; });
      meSide = side;
      review.innerHTML = '<section class="cr-step cr-review" aria-labelledby="cr-rv-h">' +
        '<h2 id="cr-rv-h"><span>✎</span>Edit what I read</h2>' +
        '<p class="cr-hint">Fix any word or side that’s off, then read it again.' + (typeof root.TOLShotReader.onOne === 'function' ? ' Or pick one message and check just that one.' : '') + '</p>' +
        '<div class="cr-rv-names"><label>Your name <input type="text" id="cr-rv-me" maxlength="30" value="' + esc(meName || res.meName || 'Me') + '"></label>' +
        '<label>Their name <input type="text" id="cr-rv-them" maxlength="30" value="' + esc(themName || res.name || 'Them') + '"></label></div>' +
        '<fieldset class="cr-rv-side"><legend>Which side is you?</legend>' +
        '<label><input type="radio" name="cr-rv-side" value="right"' + (meSide === 'right' ? ' checked' : '') + '> The right</label>' +
        '<label><input type="radio" name="cr-rv-side" value="left"' + (meSide === 'left' ? ' checked' : '') + '> The left</label></fieldset>' +
        '<ol class="cr-rv-list" id="cr-rv-list"></ol>' +
        '<div class="cr-actions"><button type="button" class="cr-btn" id="cr-rv-go">Read this conversation</button>' +
        '<button type="button" class="cr-btn is-quiet" id="cr-rv-add">Add a message</button>' +
        '<button type="button" class="cr-btn is-quiet" id="cr-rv-cancel">Start again</button></div></section>';
      Array.prototype.forEach.call(review.querySelectorAll('input[name="cr-rv-side"]'), function (r) {
        r.addEventListener('change', function () { meSide = r.value; paint(); });
      });
      doc.getElementById('cr-rv-go').addEventListener('click', go);
      doc.getElementById('cr-rv-add').addEventListener('click', function () { rows.push({ side: meSide, text: '' }); paint(); var t = review.querySelectorAll('.cr-rv-list textarea'); if (t.length) t[t.length - 1].focus(); });
      doc.getElementById('cr-rv-cancel').addEventListener('click', function () { review.innerHTML = ''; say(''); });
      paint();
      var h = doc.getElementById('cr-rv-h'); if (h && h.scrollIntoView) h.scrollIntoView({ block: 'start', behavior: 'smooth' });
    }
    function names() {
      var me = (doc.getElementById('cr-rv-me').value || '').trim() || 'Me', them = (doc.getElementById('cr-rv-them').value || '').trim() || 'Them';
      if (me.toLowerCase() === them.toLowerCase()) them = them + ' (them)';
      return { me: me.replace(/:/g, ''), them: them.replace(/:/g, '') };
    }
    function paint() {
      var list = doc.getElementById('cr-rv-list'), n = names();
      list.innerHTML = rows.map(function (r, i) {
        var mine = r.side === meSide;
        return '<li class="cr-rv-row' + (mine ? ' is-me' : '') + '" data-i="' + i + '"><div class="cr-rv-top">' +
          '<label class="cr-rv-who">Who <select data-who="' + i + '"><option value="me"' + (mine ? ' selected' : '') + '>' + esc(n.me) + ' (you)</option><option value="them"' + (mine ? '' : ' selected') + '>' + esc(!mine && r.who ? r.who : n.them) + '</option></select></label>' +
          (i ? '<button type="button" class="cr-btn is-quiet is-small" data-merge="' + i + '">Join with the one above</button>' : '') +
          '<button type="button" class="cr-btn is-quiet is-small" data-split="' + i + '" title="Put each line on its own">Split at line breaks</button>' +
          '<button type="button" class="cr-btn is-quiet is-small" data-del="' + i + '">Remove</button>' +
          (typeof root.TOLShotReader.onOne === 'function' ? '<button type="button" class="cr-btn is-quiet is-small cr-rv-one" data-one="' + i + '">Check just this one</button>' : '') + '</div>' +
          '<label class="cr-rv-text"><span style="position:absolute;left:-9999px">Message ' + (i + 1) + '</span><textarea data-text="' + i + '" rows="2">' + esc(r.text) + '</textarea></label></li>';
      }).join('');
    }
    review.addEventListener('input', function (e) {
      var t = e.target;
      if (t.hasAttribute('data-text')) rows[+t.getAttribute('data-text')].text = t.value;
      if (t.id === 'cr-rv-me' || t.id === 'cr-rv-them') { var keep = doc.activeElement; paint(); if (keep) keep.focus(); }
    });
    review.addEventListener('change', function (e) {
      var t = e.target;
      if (t.hasAttribute('data-who')) { var i = +t.getAttribute('data-who'); rows[i].side = t.value === 'me' ? meSide : (meSide === 'right' ? 'left' : 'right'); paint(); }
    });
    review.addEventListener('click', function (e) {
      var b = e.target.closest ? e.target.closest('button') : null; if (!b) return;
      if (b.hasAttribute('data-merge')) { var i = +b.getAttribute('data-merge'); rows[i - 1].text = (rows[i - 1].text + ' ' + rows[i].text).trim(); rows.splice(i, 1); paint(); }
      else if (b.hasAttribute('data-split')) { var j = +b.getAttribute('data-split'), parts = rows[j].text.split(/\n+/).map(function (x) { return x.trim(); }).filter(Boolean); if (parts.length > 1) { rows.splice.apply(rows, [j, 1].concat(parts.map(function (p) { return { side: rows[j].side, text: p, who: rows[j].who }; }))); paint(); } }
      else if (b.hasAttribute('data-del')) { rows.splice(+b.getAttribute('data-del'), 1); paint(); }
      else if (b.hasAttribute('data-one') && typeof root.TOLShotReader.onOne === 'function') {
        var k = +b.getAttribute('data-one'), r = rows[k], mine = r.side === meSide, before = '';
        // for one of my own messages, the last thing they said before it is what it answers
        for (var q = k - 1; q >= 0 && mine; q--) if (rows[q].side !== meSide && rows[q].text.trim()) { before = rows[q].text.trim(); break; }
        if (r.text.trim()) root.TOLShotReader.onOne({ text: r.text.replace(/\s*\n+\s*/g, ' ').trim(), mine: mine, before: before });
      }
    });
    function go() {
      var n = names();
      side = meSide;
      var res = { name: n.them, bubbles: rows.filter(function (r) { return r.text.trim(); }).map(function (r) { return { side: r.side, text: r.text, who: r.side === meSide ? '' : r.who }; }) };
      if (!res.bubbles.length) return;
      last = res; readAll(res, n.me, n.them);
    }
    root.TOLShotReader.take = run;   // screenshots pasted or dropped elsewhere on the page
    // the page's own buttons start here: straight to the picker when the side is already known, or to the question
    root.TOLShotReader.begin = function () {
      if (savedSide()) { input.click(); return true; }
      var r = fs.querySelector('input:checked'); if (fs.scrollIntoView) fs.scrollIntoView({ block: 'center', behavior: 'smooth' }); if (r) r.focus({ preventScroll: true });
      return false;
    };
  }
  root.TOLShotReader.toTurns = toTurns;
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', mount); else mount();
  root.TOLShotReader.mount = mount;
  root.TOLShotReader.read = function (files, say, opts) {
    files = Array.prototype.filter.call(files || [], function (f) { return /^image\//.test(f.type); });
    return files.length ? readImages(files, say || function () {}, opts) : Promise.resolve({ name: '', meName: '', bubbles: [] });
  };
})(typeof window !== 'undefined' ? window : this);
