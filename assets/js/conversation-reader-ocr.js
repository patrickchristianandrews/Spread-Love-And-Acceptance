/* conversation-reader-ocr.js — read screenshots of a chat into the Conversation Reader.

   Everything happens on this device. The screenshot is read in the browser with Tesseract
   (assets/vendor/tesseract/, loaded only when someone picks a screenshot) and is never uploaded,
   saved or sent anywhere. The text it finds goes to a review screen first, where names, sides and
   any line can be fixed, and only then into the Reader.

   TOLShotReader.layout(pages)  -> { name, meName, bubbles:[{side:'left'|'right', text}] }
       pages: [{ width, height, lines:[{ text, conf, bbox:{x0,y0,x1,y1}, tint }] }], in order.
       Groups OCR lines into message bubbles by where they sit (left = them, right = me), drops the
       clock and battery bar, the contact header, timestamps, "Delivered"/"Read", typing dots and the
       message box, and removes lines repeated where two screenshots overlap.
   TOLShotReader.mount()        -> adds "Read screenshots" to the Reader page */
(function (root) {
  'use strict';

  var VENDOR = '/assets/vendor/tesseract/';

  // ---------------------------------------------------------------- layout (no browser needed)
  var TIME = '\\d{1,2}[:.]\\d{2}\\s?(?:[ap]\\.?\\s?m\\.?)?';
  var CHROME = new RegExp('^(?:' + TIME + '|today|yesterday|now|just now|(?:today|yesterday)\\s+' + TIME + '|' +
    '(?:mon|tue|tues|wed|thu|thur|thurs|fri|sat|sun)[a-z]*\\.?,?(?:\\s+.*)?|' +
    '(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\\.?\\s+\\d{1,2}(?:,?\\s+\\d{4})?(?:,?\\s*(?:at\\s+)?' + TIME + ')?|' +
    '\\d{1,2}/\\d{1,2}/\\d{2,4}.*|delivered|read(?:\\s+' + TIME + '.*)?|read \\d.*|seen(?:\\s.*)?|sent|sending.*|not delivered|edited|' +
    'i ?message|text message|sms|mms|message|messages|type a message|write a message|message\\.\\.\\.|' +
    'lte|5g|4g|3g|wi-?fi|\\d{1,3}\\s?%|.*\\bis typing.*|typing\\.*|online|last seen.*|tap (?:here|for).*|contact info|' +
    '.*end-to-end encrypted.*|•+|\\.{2,}|…|video|audio|details|info|back|<|‹|\\+|aa)$', 'i');
  var TRAIL_TIME = /\s*[-–]?\s*(?:[0-9oOlI]{0,2}[:.;]?\s?[0-9oO]{2}\s?[ap]\.?\s?m\.?|\d{1,2}[:.]\d{2})\s*(?:[✓✔√vVW/\\|»]{1,3})?\s*$/i;
  var JUNK_EDGE = /^[\s|•·‹<>©®™_~=*"'`]+|[\s|•·‹<>©®™_~=*`]+$/g;

  function letters(s) { return (String(s).match(/[A-Za-z]/g) || []).length; }
  function clean(t) {
    // OCR often reads a lone "I" as "|" or "l": "| will do it" is "I will do it"
    t = String(t || '').replace(/\s+/g, ' ').replace(/^[|l!1]\s+(?=[a-z])/, 'I ').replace(/(\s)[|](\s)/g, '$1I$2').replace(JUNK_EDGE, '').trim();
    var prev;
    do { prev = t; t = t.replace(TRAIL_TIME, '').replace(JUNK_EDGE, '').trim(); } while (t !== prev);
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
            (Math.abs(cx - 0.5) < 0.22 || l.bbox.x0 / W < 0.45) && h >= nameH) { name = w.replace(/^[^A-Za-z]+|[^A-Za-z.]+$/g, ''); nameH = h; }
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

  var api = { layout: layout, clean: clean, CHROME: CHROME };
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
  function overlap(a, b) {
    var x = Math.max(0, Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0)), y = Math.max(0, Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0));
    var inter = x * y, ua = (a.x1 - a.x0) * (a.y1 - a.y0) + (b.x1 - b.x0) * (b.y1 - b.y0) - inter;
    return ua ? inter / ua : 0;
  }
  function linesOf(data) {
    var out = [];
    (data.blocks || []).forEach(function (bl) { (bl.paragraphs || []).forEach(function (pa) { (pa.lines || []).forEach(function (l) { out.push({ text: l.text, conf: l.confidence, bbox: l.bbox }); }); }); });
    return out;
  }
  function readImages(files, say) {
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
                var a = linesOf(r1.data), b = linesOf(r2.data), merged = a.slice();
                b.forEach(function (l) {
                  var same = merged.filter(function (m) { return overlap(m.bbox, l.bbox) > 0.3; });
                  if (!same.length) merged.push(l);
                  else same.forEach(function (m) { if (l.conf > m.conf + 5 && letters(l.text) >= letters(m.text) * 0.6) { m.text = l.text; m.conf = l.conf; m.bbox = l.bbox; } });
                });
                merged = merged.filter(function (m) { return m.conf >= 30 || letters(m.text) >= 3; });
                merged.forEach(function (m) { m.tint = tintAt(c, m.bbox); });
                pages.push({ width: c.width, height: c.height, lines: merged });
              });
            });
          });
        });
      });
      return chain.then(function () { return worker.terminate(); }, function (e) { worker.terminate(); throw e; });
    }).then(function () { return layout(pages); });
  }

  // ---------------------------------------------------------------- the page: pick, review, read
  function mount() {
    var step = doc.querySelector('.cr-input-step'), actions = step && step.querySelector('.cr-actions');
    if (!step || !actions || doc.getElementById('cr-shot')) return;
    var box = doc.createElement('div');
    box.className = 'cr-shots';
    box.innerHTML = '<p class="cr-shots-h"><strong>Or use screenshots.</strong> Pick one or more screenshots of the chat (iMessage, WhatsApp, Messenger, texts, Slack…), in order. You can also paste or drop them here.</p>' +
      '<div class="cr-actions"><label class="cr-btn is-quiet" for="cr-shot" tabindex="0" role="button">Choose screenshots</label>' +
      '<input type="file" id="cr-shot" accept="image/*" multiple style="position:absolute;left:-9999px;width:1px;height:1px"></div>' +
      '<p class="cr-hint cr-shots-private">Your screenshot is read on this device and never uploaded. You’ll check what was read before anything else happens.</p>' +
      '<p class="cr-hint" id="cr-shot-status" role="status" aria-live="polite"></p>';
    actions.parentNode.insertBefore(box, actions.nextSibling);
    var review = doc.createElement('div'); review.id = 'cr-review';
    box.parentNode.insertBefore(review, box.nextSibling);
    var input = doc.getElementById('cr-shot'), status = doc.getElementById('cr-shot-status');
    var label = box.querySelector('label');
    label.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); input.click(); } });
    function say(t) { status.textContent = t; }
    function run(files) {
      files = Array.prototype.filter.call(files || [], function (f) { return /^image\//.test(f.type); });
      if (!files.length) return;
      review.innerHTML = '';
      say('Loading the screenshot reader on this device…');
      readImages(files, say).then(function (res) {
        if (!res.bubbles.length) { say('I couldn’t find any messages in that screenshot. Try a sharper one, or paste the text instead.'); return; }
        say('Read ' + res.bubbles.length + ' message' + (res.bubbles.length === 1 ? '' : 's') + '. Check them below, then read the conversation.');
        showReview(res);
      }, function () {
        say('The screenshot reader couldn’t start in this browser. You can still paste or type the conversation above.');
      });
    }
    input.addEventListener('change', function () { run(input.files); input.value = ''; });
    function imagesFrom(dt) { return dt ? Array.prototype.filter.call(dt.files || [], function (f) { return /^image\//.test(f.type); }) : []; }
    step.addEventListener('dragover', function (e) { if (e.dataTransfer && Array.prototype.some.call(e.dataTransfer.items || [], function (i) { return i.kind === 'file'; })) { e.preventDefault(); step.classList.add('is-drop'); } });
    step.addEventListener('dragleave', function () { step.classList.remove('is-drop'); });
    step.addEventListener('drop', function (e) { var f = imagesFrom(e.dataTransfer); if (f.length) { e.preventDefault(); step.classList.remove('is-drop'); run(f); } });
    doc.addEventListener('paste', function (e) { var f = imagesFrom(e.clipboardData); if (f.length) { e.preventDefault(); run(f); } });

    var rows = [], meSide = 'right';
    function showReview(res) {
      rows = res.bubbles.map(function (b) { return { side: b.side, text: b.text }; });
      meSide = 'right';
      review.innerHTML = '<section class="cr-step cr-review" aria-labelledby="cr-rv-h">' +
        '<h2 id="cr-rv-h"><span>✓</span>Check what was read</h2>' +
        '<p class="cr-hint">The screenshot reader can misread a word or a side. Fix anything that’s off, then read the conversation.</p>' +
        '<div class="cr-rv-names"><label>Your name <input type="text" id="cr-rv-me" maxlength="30" value="' + esc(res.meName || 'Me') + '"></label>' +
        '<label>Their name <input type="text" id="cr-rv-them" maxlength="30" value="' + esc(res.name || 'Them') + '"></label></div>' +
        '<fieldset class="cr-rv-side"><legend>Which side is you?</legend>' +
        '<label><input type="radio" name="cr-rv-side" value="right" checked> The right (usually the colored bubbles)</label>' +
        '<label><input type="radio" name="cr-rv-side" value="left"> The left</label></fieldset>' +
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
          '<label class="cr-rv-who">Who <select data-who="' + i + '"><option value="me"' + (mine ? ' selected' : '') + '>' + esc(n.me) + ' (you)</option><option value="them"' + (mine ? '' : ' selected') + '>' + esc(n.them) + '</option></select></label>' +
          (i ? '<button type="button" class="cr-btn is-quiet is-small" data-merge="' + i + '">Join with the one above</button>' : '') +
          '<button type="button" class="cr-btn is-quiet is-small" data-split="' + i + '" title="Put each line on its own">Split at line breaks</button>' +
          '<button type="button" class="cr-btn is-quiet is-small" data-del="' + i + '">Remove</button></div>' +
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
      else if (b.hasAttribute('data-split')) { var j = +b.getAttribute('data-split'), parts = rows[j].text.split(/\n+/).map(function (x) { return x.trim(); }).filter(Boolean); if (parts.length > 1) { rows.splice.apply(rows, [j, 1].concat(parts.map(function (p) { return { side: rows[j].side, text: p }; }))); paint(); } }
      else if (b.hasAttribute('data-del')) { rows.splice(+b.getAttribute('data-del'), 1); paint(); }
    });
    function go() {
      var n = names();
      var text = rows.filter(function (r) { return r.text.trim(); }).map(function (r) { return (r.side === meSide ? n.me : n.them) + ': ' + r.text.replace(/\s*\n+\s*/g, ' ').trim(); }).join('\n');
      if (!text) return;
      var ta = doc.getElementById('cr-input'); if (ta) ta.value = text;
      if (root.TOLReaderPage && root.TOLReaderPage.read) root.TOLReaderPage.read(text, n.me);
      else { var goBtn = doc.getElementById('cr-go'); if (goBtn) goBtn.click(); }
    }
  }
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', mount); else mount();
  root.TOLShotReader.mount = mount;
})(typeof window !== 'undefined' ? window : this);
