/* share-kit.js — more ways to share, added to the one share sheet in site.js (TOLShare).
   Loaded by site.js on every page. It brings its own small stylesheet (/assets/css/share-kit.css),
   so it works on the locked-down workpaper pages too (no inline styles).

   What it adds
   - More places in the share sheet (behind "More places"): Messenger, Telegram, LinkedIn, Reddit, Bluesky,
     Threads and LINE. They are plain links that open the chosen service only when tapped. Nothing is sent
     from this site.
   - "Show a QR code": the link drawn as a QR code, so someone in the room can scan it with their phone.
     The code is made here, on this device (byte mode, versions 1-40, error correction M, or L for long links).
     Checked against reference encoders and a decoder (bit-for-bit for every mask, and the same mask choice as
     the standard). Long links (over 213 bytes) open the big code (showQR) instead of a small one in the sheet.
   - "Save as image": a short line (a script, a quote, an answer) drawn on a card with the site's name, saved as a PNG.
   - "More apps on this device": the device's own share menu, first in the sheet, where there is one.
   - "Share this line": a small button by each "Words you could use" line. It shares just that sentence and a
     link to its part of the page. Seen on hover or focus with a mouse, small and always there on a phone;
     hidden in Quiet mode and on print. <body data-no-line-share> or class="no-line-share" keeps them off.

   For other scripts (window.TOLShareKit)
     TOLShareKit.shareText({ title, text, url, heading })  open the sheet for a piece of text
       (url omitted → this page; false → the text alone). Professor Puddles can use this for an answer.
     TOLShareKit.links(d)   the extra share links for { title, text, url, result }
     TOLShareKit.qr.matrix(text[, mask[, 'L'|'M']]) → { version, ecl, size, mask, modules[y][x] } or null when too long
     TOLShareKit.showQR(url, { title, note })  the link as a big QR code in a dialog, for a phone in the same room;
       Copy link as the backup. Returns false (and shows only Copy link) when the link is too long for a code.
     TOLShareKit.qrFits(url) → true when showQR can draw it (up to 2,000 bytes)
     TOLShareKit.qr.svg(text) → an <svg> element, or null
     TOLShareKit.saveImage({ text, title }) → Promise, downloads a PNG
     TOLShareKit.scan(root)  add "Share this line" buttons inside root (runs once on load for <main>)

   How it finds the sheet: it watches site.js's sheet (.tol-sharesheet) open and reads what is being shared
   back from it, so site.js only has to load this file. If site.js ever fires a 'tol-share-sheet' event on
   document with detail { data, box, close } as the sheet opens, that is used instead. */
(function () {
  'use strict';
  if (window.TOLShareKit) return;

  var SITE_NAME = 'Spread Love & Acceptance', SITE_HOST = 'spreadloveandacceptance.com';
  var enc = encodeURIComponent;

  // ---------- its stylesheet ----------
  // the line buttons wait for it, so they never show unstyled
  var cssReady = new Promise(function (ok) {
    var l = document.querySelector('link[href="/assets/css/share-kit.css"]');
    if (l) { if (l.sheet) { ok(); return; } } else {
      l = document.createElement('link'); l.rel = 'stylesheet'; l.href = '/assets/css/share-kit.css';
      document.head.appendChild(l);
    }
    l.addEventListener('load', function () { ok(true); }); l.addEventListener('error', function () { ok(false); });
    setTimeout(function () { ok(true); }, 4000);
  });

  function mk(tag, attrs, text) {
    var n = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) { if (attrs[k] != null) n.setAttribute(k, attrs[k]); });
    if (text) n.textContent = text;
    return n;
  }
  function fireShared(url, method) {
    ['tol:shared', 'tol-shared'].forEach(function (name) {
      try { document.dispatchEvent(new CustomEvent(name, { detail: { url: url, method: method, how: method } })); } catch (e) {}
    });
  }
  function isMobile() {
    if (navigator.userAgentData && typeof navigator.userAgentData.mobile === 'boolean' && navigator.userAgentData.mobile) return true;
    return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent || '') || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  }

  // =====================================================================================
  // QR code: byte mode, versions 1-40, error correction M (or L for long links). Follows ISO/IEC 18004.
  // Level M while the code fits in version 10 (up to 213 bytes, as before); longer links use level L,
  // raised to M when M still fits in the same version. Checked bit-for-bit against python qrcode and
  // segno for every mask, and decoded with zxing-cpp, for 1 to 2,953 bytes.
  // =====================================================================================
  var QR = (function () {
    // per version (index 1-40): error correction codewords per block, and the number of blocks
    var ECC = {
      L: [0, 7, 10, 15, 20, 26, 18, 20, 24, 30, 18, 20, 24, 26, 30, 22, 24, 28, 30, 28, 28, 28, 28, 30, 30, 26, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
      M: [0, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26, 30, 22, 22, 24, 24, 28, 28, 26, 26, 26, 26, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28]
    };
    var BLOCKS = {
      L: [0, 1, 1, 1, 1, 1, 2, 2, 2, 2, 4, 4, 4, 4, 4, 6, 6, 6, 6, 7, 8, 8, 9, 9, 10, 12, 12, 12, 13, 14, 15, 16, 17, 18, 19, 19, 20, 21, 22, 24, 25],
      M: [0, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5, 5, 8, 9, 9, 10, 10, 11, 13, 14, 16, 17, 17, 18, 20, 21, 23, 25, 26, 28, 29, 31, 33, 35, 37, 38, 40, 43, 45, 47, 49]
    };
    var FORMAT = { L: 1, M: 0 };   // the two level bits in the format information
    var M_UP_TO = 10;              // level M while it fits in this version

    function rawModules(ver) {
      var r = (16 * ver + 128) * ver + 64;
      if (ver >= 2) { var na = Math.floor(ver / 7) + 2; r -= (25 * na - 10) * na - 55; if (ver >= 7) r -= 36; }
      return r;
    }
    function dataCodewords(ver, ecl) { return Math.floor(rawModules(ver) / 8) - ECC[ecl][ver] * BLOCKS[ecl][ver]; }
    // how many bytes fit in a version at a level
    function capacity(ver, ecl) { return Math.floor((dataCodewords(ver, ecl) * 8 - 4 - (ver < 10 ? 8 : 16)) / 8); }
    function alignPos(ver) {
      if (ver === 1) return [];
      var na = Math.floor(ver / 7) + 2, size = ver * 4 + 17;
      var step = Math.floor((ver * 8 + na * 3 + 5) / (na * 4 - 4)) * 2, out = [6];
      for (var pos = size - 7; out.length < na; pos -= step) out.splice(1, 0, pos);
      return out;
    }
    // GF(2^8) with the QR polynomial 0x11D
    function gmul(x, y) {
      var z = 0;
      for (var i = 7; i >= 0; i--) { z = (z << 1) ^ ((z >>> 7) * 0x11D); z ^= ((y >>> i) & 1) * x; }
      return z & 0xFF;
    }
    function rsDivisor(deg) {
      var r = []; for (var i = 0; i < deg - 1; i++) r.push(0); r.push(1);
      var root = 1;
      for (i = 0; i < deg; i++) {
        for (var j = 0; j < r.length; j++) { r[j] = gmul(r[j], root); if (j + 1 < r.length) r[j] ^= r[j + 1]; }
        root = gmul(root, 2);
      }
      return r;
    }
    function rsRemainder(data, div) {
      var r = div.map(function () { return 0; });
      data.forEach(function (b) {
        var f = b ^ r.shift(); r.push(0);
        div.forEach(function (c, i) { r[i] ^= gmul(c, f); });
      });
      return r;
    }
    function utf8(s) {
      if (window.TextEncoder) return Array.prototype.slice.call(new TextEncoder().encode(s));
      var e = unescape(encodeURIComponent(s)), out = [];
      for (var i = 0; i < e.length; i++) out.push(e.charCodeAt(i));
      return out;
    }
    // the version and level for n bytes, or null when it is too long for any QR code
    function pick(n, forceEcl) {
      var ver;
      if (forceEcl === 'L' || forceEcl === 'M') {
        for (ver = 1; ver <= 40; ver++) if (capacity(ver, forceEcl) >= n) return { ver: ver, ecl: forceEcl };
        return null;
      }
      for (ver = 1; ver <= M_UP_TO; ver++) if (capacity(ver, 'M') >= n) return { ver: ver, ecl: 'M' };
      for (ver = 1; ver <= 40; ver++) if (capacity(ver, 'L') >= n) return { ver: ver, ecl: capacity(ver, 'M') >= n ? 'M' : 'L' };
      return null;
    }

    function matrix(text, forceMask, forceEcl) {
      var bytes = utf8(String(text)), pv = pick(bytes.length, forceEcl);
      if (!pv) return null;
      var ver = pv.ver, ecl = pv.ecl, cap = dataCodewords(ver, ecl) * 8, cc = ver < 10 ? 8 : 16;
      // the bit stream: mode 0100, character count, the bytes, terminator, then pad bytes
      var bits = [];
      function put(v, n) { for (var i = n - 1; i >= 0; i--) bits.push((v >>> i) & 1); }
      put(4, 4); put(bytes.length, cc);
      bytes.forEach(function (b) { put(b, 8); });
      put(0, Math.min(4, cap - bits.length));
      put(0, (8 - bits.length % 8) % 8);
      for (var pad = 0xEC; bits.length < cap; pad ^= 0xEC ^ 0x11) put(pad, 8);
      var data = [];
      for (var i = 0; i < bits.length; i += 8) { var b = 0; for (var k = 0; k < 8; k++) b = (b << 1) | bits[i + k]; data.push(b); }

      // split into blocks, add error correction, interleave
      var nb = BLOCKS[ecl][ver], eccLen = ECC[ecl][ver], raw = Math.floor(rawModules(ver) / 8);
      var nShort = nb - raw % nb, shortLen = Math.floor(raw / nb), div = rsDivisor(eccLen), blocks = [], at = 0;
      for (i = 0; i < nb; i++) {
        var dat = data.slice(at, at + shortLen - eccLen + (i < nShort ? 0 : 1)); at += dat.length;
        var ecc = rsRemainder(dat, div);
        if (i < nShort) dat.push(0);
        blocks.push(dat.concat(ecc));
      }
      var words = [];
      for (i = 0; i < blocks[0].length; i++) {
        for (var j = 0; j < blocks.length; j++) if (i !== shortLen - eccLen || j >= nShort) words.push(blocks[j][i]);
      }

      var size = ver * 4 + 17, mods = [], fn = [];
      for (i = 0; i < size; i++) { mods.push(new Array(size).fill(false)); fn.push(new Array(size).fill(false)); }
      function setF(x, y, dark) { mods[y][x] = !!dark; fn[y][x] = true; }
      // timing patterns
      for (i = 0; i < size; i++) { setF(6, i, i % 2 === 0); setF(i, 6, i % 2 === 0); }
      // finder patterns with their separators
      [[3, 3], [size - 4, 3], [3, size - 4]].forEach(function (c) {
        for (var dy = -4; dy <= 4; dy++) for (var dx = -4; dx <= 4; dx++) {
          var d = Math.max(Math.abs(dx), Math.abs(dy)), xx = c[0] + dx, yy = c[1] + dy;
          if (xx >= 0 && xx < size && yy >= 0 && yy < size) setF(xx, yy, d !== 2 && d !== 4);
        }
      });
      // alignment patterns
      var ap = alignPos(ver), na = ap.length;
      for (i = 0; i < na; i++) for (j = 0; j < na; j++) {
        if ((i === 0 && j === 0) || (i === 0 && j === na - 1) || (i === na - 1 && j === 0)) continue;
        for (var ay = -2; ay <= 2; ay++) for (var ax = -2; ax <= 2; ax++) setF(ap[i] + ax, ap[j] + ay, Math.max(Math.abs(ax), Math.abs(ay)) !== 1);
      }
      function drawFormat(mask) {
        var d = (FORMAT[ecl] << 3) | mask, rem = d;
        for (var q = 0; q < 10; q++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
        var fb = ((d << 10) | rem) ^ 0x5412;
        function bit(n) { return ((fb >>> n) & 1) !== 0; }
        for (q = 0; q <= 5; q++) setF(8, q, bit(q));
        setF(8, 7, bit(6)); setF(8, 8, bit(7)); setF(7, 8, bit(8));
        for (q = 9; q < 15; q++) setF(14 - q, 8, bit(q));
        for (q = 0; q < 8; q++) setF(size - 1 - q, 8, bit(q));
        for (q = 8; q < 15; q++) setF(8, size - 15 + q, bit(q));
        setF(8, size - 8, true);   // the dark module
      }
      drawFormat(0);   // reserve the format areas for now
      if (ver >= 7) {
        var rv = ver;
        for (i = 0; i < 12; i++) rv = (rv << 1) ^ ((rv >>> 11) * 0x1F25);
        var vb = (ver << 12) | rv;
        for (i = 0; i < 18; i++) {
          var bt = ((vb >>> i) & 1) !== 0, a = size - 11 + i % 3, bb = Math.floor(i / 3);
          setF(a, bb, bt); setF(bb, a, bt);
        }
      }
      // the data, in the zigzag
      var bi = 0;
      for (var right = size - 1; right >= 1; right -= 2) {
        if (right === 6) right = 5;
        for (var vert = 0; vert < size; vert++) for (j = 0; j < 2; j++) {
          var x = right - j, up = ((right + 1) & 2) === 0, y = up ? size - 1 - vert : vert;
          if (!fn[y][x] && bi < words.length * 8) { mods[y][x] = ((words[bi >>> 3] >>> (7 - (bi & 7))) & 1) !== 0; bi++; }
        }
      }
      function maskBit(m, x, y) {
        switch (m) {
          case 0: return (x + y) % 2 === 0;
          case 1: return y % 2 === 0;
          case 2: return x % 3 === 0;
          case 3: return (x + y) % 3 === 0;
          case 4: return (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0;
          case 5: return x * y % 2 + x * y % 3 === 0;
          case 6: return (x * y % 2 + x * y % 3) % 2 === 0;
          default: return ((x + y) % 2 + x * y % 3) % 2 === 0;
        }
      }
      function applyMask(m) {
        for (var yy = 0; yy < size; yy++) for (var xx = 0; xx < size; xx++) if (!fn[yy][xx] && maskBit(m, xx, yy)) mods[yy][xx] = !mods[yy][xx];
      }
      function penalty() {
        var p = 0, x, y, run, dark = 0;
        function lineScore(get) {
          var s = 0, r = 1;
          for (var t = 1; t <= size; t++) {
            if (t < size && get(t) === get(t - 1)) r++;
            else { if (r >= 5) s += 3 + (r - 5); r = 1; }
          }
          // finder-like runs in the ratio 1:1:3:1:1 (dark, light, dark, light, dark) with a light run of
          // four times the unit on one side; the outside of the code counts as light
          var runs = [], col = get(0), len = 1;
          for (t = 1; t <= size; t++) {
            if (t < size && get(t) === col) len++;
            else { runs.push([col, len]); if (t < size) { col = get(t); len = 1; } }
          }
          if (runs[0][0]) runs.unshift([false, size]); else runs[0][1] += size;
          if (runs[runs.length - 1][0]) runs.push([false, size]); else runs[runs.length - 1][1] += size;
          for (t = 1; t + 5 < runs.length; t += 1) {
            if (!runs[t][0]) continue;
            var n = runs[t][1];
            if (runs[t + 1][1] !== n || runs[t + 2][1] !== 3 * n || runs[t + 3][1] !== n || runs[t + 4][1] !== n) continue;
            var before = runs[t - 1][1], after = runs[t + 5][1];
            if (before >= 4 * n && after >= n) s += 40;
            if (after >= 4 * n && before >= n) s += 40;
          }
          return s;
        }
        for (y = 0; y < size; y++) p += lineScore(function (t) { return mods[y][t]; });
        for (x = 0; x < size; x++) p += lineScore(function (t) { return mods[t][x]; });
        for (y = 0; y < size - 1; y++) for (x = 0; x < size - 1; x++) {
          var c = mods[y][x];
          if (c === mods[y][x + 1] && c === mods[y + 1][x] && c === mods[y + 1][x + 1]) p += 3;
        }
        for (y = 0; y < size; y++) for (x = 0; x < size; x++) if (mods[y][x]) dark++;
        var total = size * size;
        p += (Math.ceil(Math.abs(dark * 20 - total * 10) / total) - 1) * 10;
        return p;
      }
      var mask = forceMask;
      if (!(mask >= 0 && mask <= 7)) {
        var best = Infinity;
        for (var m = 0; m < 8; m++) {
          applyMask(m); drawFormat(m);
          var sc = penalty();
          if (sc < best) { best = sc; mask = m; }
          applyMask(m);   // xor again to undo
        }
      }
      applyMask(mask); drawFormat(mask);
      return { version: ver, ecl: ecl, size: size, mask: mask, modules: mods };
    }

    function svg(text) {
      var q = matrix(text); if (!q) return null;
      var NS = 'http://www.w3.org/2000/svg', n = q.size + 8, d = '';
      for (var y = 0; y < q.size; y++) for (var x = 0; x < q.size; x++) if (q.modules[y][x]) d += 'M' + (x + 4) + ' ' + (y + 4) + 'h1v1h-1z';
      var s = document.createElementNS(NS, 'svg');
      s.setAttribute('viewBox', '0 0 ' + n + ' ' + n);
      s.setAttribute('shape-rendering', 'crispEdges');
      s.setAttribute('role', 'img');
      s.setAttribute('class', 'tsk-qr-img');
      var bg = document.createElementNS(NS, 'rect');
      bg.setAttribute('width', n); bg.setAttribute('height', n); bg.setAttribute('fill', '#ffffff');
      var p = document.createElementNS(NS, 'path');
      p.setAttribute('d', d); p.setAttribute('fill', '#000000');
      s.appendChild(bg); s.appendChild(p);
      return s;
    }
    return { matrix: matrix, svg: svg };
  })();

  // =====================================================================================
  // showQR(url, { title, note }): a link drawn big as a QR code, for a hand-off between two phones in the
  // same room. Made here, on this device; nothing is uploaded. Copy link stays there as the backup.
  // =====================================================================================
  var QR_MAX_BYTES = 2000;          // checked bit-for-bit and decoded up to 2,953; past 2,000 a phone screen is too small
  var MIN_PX = 4;                   // never fewer than 4 canvas pixels per module
  function qrBytes(t) { try { return new TextEncoder().encode(String(t)).length; } catch (e) { return unescape(encodeURIComponent(String(t))).length; } }
  function qrFits(t) { return !!t && qrBytes(t) <= QR_MAX_BYTES; }
  var dlg = null, dlgCur = null, dlgBack = null, dlgBig = false;
  function copyText(t) {
    if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(t).then(function () { return true; }, function () { return legacyCopy(t); });
    return Promise.resolve(legacyCopy(t));
  }
  function legacyCopy(t) {
    var ta = mk('textarea', { readonly: '', 'aria-hidden': 'true', class: 'tsk-offscreen' }); ta.value = t;
    (dlg || document.body).appendChild(ta); ta.select();
    var ok = false; try { ok = document.execCommand('copy'); } catch (e) {}
    ta.remove(); return ok;
  }
  function buildDialog() {
    var native = typeof HTMLDialogElement === 'function' && !!document.createElement('dialog').showModal;
    var d = mk(native ? 'dialog' : 'div', { class: 'tsk-qrd' + (native ? '' : ' tsk-qrd-plain'), 'aria-labelledby': 'tsk-qrd-h', 'aria-describedby': 'tsk-qrd-note' });
    if (!native) { d.setAttribute('role', 'dialog'); d.setAttribute('aria-modal', 'true'); d.hidden = true; }
    var card = mk('div', { class: 'tsk-qrd-card' });
    var head = mk('div', { class: 'tsk-qrd-head' });
    head.appendChild(mk('h2', { id: 'tsk-qrd-h' }, 'Scan with the other phone'));
    var x = mk('button', { type: 'button', class: 'tsk-qrd-close', 'data-qrd': 'close' }, 'Close');
    head.appendChild(x);
    card.appendChild(head);
    card.appendChild(mk('p', { class: 'tsk-qrd-note', id: 'tsk-qrd-note' }));
    var box = mk('div', { class: 'tsk-qrd-code' });
    box.appendChild(mk('canvas', { role: 'img', 'aria-label': 'QR code for the link' }));
    card.appendChild(box);
    card.appendChild(mk('p', { class: 'tsk-qrd-hint', hidden: '' }, 'Hold the phones closer, or use Copy link.'));
    card.appendChild(mk('p', { class: 'tsk-qrd-long', hidden: '' }, 'This link is too long to fit in a QR code. Use Copy link and send it instead.'));
    var acts = mk('div', { class: 'tsk-qrd-acts' });
    acts.appendChild(mk('button', { type: 'button', class: 'tol-share-act', 'data-qrd': 'big', 'aria-pressed': 'false' }, 'Bigger'));
    acts.appendChild(mk('button', { type: 'button', class: 'tol-share-act tsk-qrd-copy', 'data-qrd': 'copy' }, 'Copy link'));
    card.appendChild(acts);
    card.appendChild(mk('p', { class: 'tsk-qrd-private' }, 'The code holds the link and nothing else. It is made on this device; nothing is uploaded.'));
    card.appendChild(mk('p', { class: 'tsk-qrd-status', role: 'status', 'aria-live': 'polite' }));
    d.appendChild(card);
    d.addEventListener('click', function (e) {
      if (e.target === d) { closeQR(); return; }   // a tap on the backdrop
      var b = e.target.closest('[data-qrd]'); if (!b) return;
      var k = b.getAttribute('data-qrd');
      if (k === 'close') closeQR();
      else if (k === 'big') { dlgBig = !dlgBig; drawQR(); }
      else if (k === 'copy') {
        var u = dlgCur && dlgCur.url, st = d.querySelector('.tsk-qrd-status');
        copyText(u).then(function (ok) {
          st.textContent = ok ? 'Link copied. Paste it into a message to the other person.' : 'Couldn’t copy here. Press and hold the link in your address bar to copy it.';
          if (ok) fireShared(u, 'copy');
        });
      }
    });
    d.addEventListener('cancel', function (e) { e.preventDefault(); closeQR(); });
    d.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); closeQR(); return; }
      if (e.key !== 'Tab' || native) return;
      var f = Array.prototype.filter.call(d.querySelectorAll('button'), function (n) { return n.getClientRects().length > 0; });
      if (!f.length) return;
      if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
    });
    window.addEventListener('resize', function () { if (isOpen()) drawQR(); });
    document.body.appendChild(d);
    return d;
  }
  function isOpen() { return !!dlg && (dlg.open || (dlg.tagName !== 'DIALOG' && !dlg.hidden)); }
  // draws the code as large as the room allows, in whole canvas pixels per module (at least 4)
  function drawQR() {
    var q = dlgCur && dlgCur.q, cv = dlg.querySelector('canvas'), box = dlg.querySelector('.tsk-qrd-code');
    var hint = dlg.querySelector('.tsk-qrd-hint'), big = dlg.querySelector('[data-qrd="big"]');
    dlg.classList.toggle('tsk-qrd-big', dlgBig);
    big.setAttribute('aria-pressed', String(dlgBig)); big.textContent = dlgBig ? 'Smaller' : 'Bigger';
    if (!q) return;
    var n = q.size + 8, vw = document.documentElement.clientWidth || window.innerWidth, vh = window.innerHeight;
    // room left for the code: the card's width, and the height after the words and buttons
    var room = dlgBig ? Math.min(vw - 24, vh - 120) : Math.min(vw - 64, 380, vh - 300);
    room = Math.max(room, Math.min(vw - 24, 160));
    var css = Math.floor(room / n) >= MIN_PX ? Math.floor(room / n) * n : room;   // whole CSS pixels per module when there is room
    var dpr = Math.max(1, Math.min(window.devicePixelRatio || 1, 4));
    var k = Math.max(MIN_PX, Math.round(css * dpr / n)), px = n * k;
    cv.width = px; cv.height = px;
    cv.style.width = css + 'px'; cv.style.height = css + 'px';
    var ctx = cv.getContext('2d');
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, px, px);
    ctx.fillStyle = '#000000';
    for (var y = 0; y < q.size; y++) for (var x = 0; x < q.size; x++) if (q.modules[y][x]) ctx.fillRect((x + 4) * k, (y + 4) * k, k, k);
    box.hidden = false;
    // fewer than 4 screen pixels a module: a dense code, harder for a camera
    hint.hidden = css / n >= MIN_PX;
  }
  function showQR(url, o) {
    o = o || {};
    url = String(url || '');
    if (!dlg) dlg = buildDialog();
    var q = qrFits(url) ? QR.matrix(url) : null;
    dlgCur = { url: url, q: q }; dlgBig = false;
    dlg.querySelector('#tsk-qrd-h').textContent = o.title || 'Scan with the other phone';
    var note = dlg.querySelector('.tsk-qrd-note');
    note.textContent = o.note || 'Open the camera on the other phone and point it at this code. The link opens there.';
    dlg.querySelector('.tsk-qrd-status').textContent = '';
    dlg.querySelector('.tsk-qrd-long').hidden = !!q;
    dlg.querySelector('[data-qrd="big"]').hidden = !q;
    dlg.querySelector('.tsk-qrd-code').hidden = !q;
    dlg.querySelector('.tsk-qrd-hint').hidden = true;
    dlg.querySelector('.tsk-qrd-private').hidden = !q;
    dlgBack = document.activeElement;
    if (dlg.tagName === 'DIALOG') { if (!dlg.open) dlg.showModal(); } else dlg.hidden = false;
    document.documentElement.classList.add('tsk-qrd-on');
    drawQR();
    var f = dlg.querySelector(q ? '[data-qrd="big"]' : '[data-qrd="copy"]');
    try { f.focus({ preventScroll: true }); } catch (e) { f.focus(); }
    if (q) fireShared(url, 'qr');
    return !!q;
  }
  function closeQR() {
    if (!isOpen()) return;
    if (dlg.tagName === 'DIALOG') dlg.close(); else dlg.hidden = true;
    document.documentElement.classList.remove('tsk-qrd-on');
    var back = dlgBack; dlgBack = null;
    if (back && back.focus && document.contains(back)) { try { back.focus({ preventScroll: true }); } catch (e) { back.focus(); } }
  }

  // =====================================================================================
  // Share links: each one built only from what is being shared, opened only when tapped
  // =====================================================================================
  function message(d) { return [d.text, d.url].filter(Boolean).join('\n'); }
  function links(d) {
    var msg = message(d), url = d.url || '', linkOnly = !!url && !d.result;
    return {
      // Messenger has no web share link of its own: phones open the app, computers get Facebook's share page
      messenger: linkOnly ? (isMobile() ? 'fb-messenger://share/?link=' + enc(url) : 'https://www.facebook.com/sharer/sharer.php?u=' + enc(url)) : '',
      telegram: url ? 'https://t.me/share/url?url=' + enc(url) + (d.text ? '&text=' + enc(d.text) : '') : '',
      linkedin: linkOnly ? 'https://www.linkedin.com/sharing/share-offsite/?url=' + enc(url) : '',
      reddit: linkOnly ? 'https://www.reddit.com/submit?url=' + enc(url) + '&title=' + enc(d.title || d.text || '') : '',
      bluesky: msg && msg.length <= 300 ? 'https://bsky.app/intent/compose?text=' + enc(msg) : '',
      threads: msg && msg.length <= 500 ? 'https://www.threads.net/intent/post?text=' + enc(msg) : '',
      line: linkOnly ? 'https://social-plugins.line.me/lineit/share?url=' + enc(url) : (msg ? 'https://line.me/R/share?text=' + enc(msg) : '')
    };
  }
  var PLACES = [['messenger', 'Messenger'], ['telegram', 'Telegram'], ['linkedin', 'LinkedIn'], ['reddit', 'Reddit'], ['bluesky', 'Bluesky'], ['threads', 'Threads'], ['line', 'LINE']];

  // =====================================================================================
  // Save as image: the words on a soft card with the site's name, drawn here, saved as a PNG
  // =====================================================================================
  // only for words (a line, a quote, an answer), not for a page's link
  var IMAGE_MAX = 300;
  function imageText(d) { var t = d.result ? (d.text || '').trim() : ''; return t.length && t.length <= IMAGE_MAX ? t : ''; }
  function wrap(ctx, text, maxW) {
    var out = [];
    text.split(/\n+/).forEach(function (para) {
      var line = '';
      para.split(/\s+/).forEach(function (w) {
        if (!w) return;
        // a word too long for one line is broken where it must be
        while (ctx.measureText(w).width > maxW && w.length > 1) {
          var k = w.length - 1;
          while (k > 1 && ctx.measureText(w.slice(0, k)).width > maxW) k--;
          if (line) { out.push(line); line = ''; }
          out.push(w.slice(0, k)); w = w.slice(k);
        }
        var t = line ? line + ' ' + w : w;
        if (ctx.measureText(t).width > maxW && line) { out.push(line); line = w; } else line = t;
      });
      if (line) out.push(line);
    });
    return out;
  }
  function drawCard(o) {
    var W = 1080, H = 1080, c = document.createElement('canvas'); c.width = W; c.height = H;
    var ctx = c.getContext('2d'), text = (o.text || o.title || '').trim(), sub = o.text && o.title ? o.title.trim() : '';
    ctx.fillStyle = '#FFFDF7'; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#EFE8FA'; ctx.fillRect(0, 0, W, 28); ctx.fillRect(0, H - 28, W, 28);
    ctx.strokeStyle = '#B9A8D6'; ctx.lineWidth = 6; ctx.strokeRect(60, 88, W - 120, H - 176);
    var size = 64, lines, lh, maxW = W - 240, maxH = H - 460;
    for (; size >= 30; size -= 2) {
      ctx.font = size + 'px Lora, Georgia, "Times New Roman", serif';
      lines = wrap(ctx, text, maxW); lh = Math.round(size * 1.32);
      if (lines.length * lh <= maxH) break;
    }
    ctx.fillStyle = '#2B2620'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    var top = 140 + (H - 460 - lines.length * lh) / 2 + 60 + lh / 2;
    if (sub) {
      ctx.font = '600 32px system-ui, -apple-system, "Segoe UI", sans-serif'; ctx.fillStyle = '#5A5346';
      var sl = wrap(ctx, sub, maxW).slice(0, 2);
      sl.forEach(function (s, i) { ctx.fillText(s, W / 2, 170 + i * 42); });
      ctx.fillStyle = '#2B2620';
    }
    ctx.font = size + 'px Lora, Georgia, "Times New Roman", serif';
    lines.forEach(function (ln, i) { ctx.fillText(ln, W / 2, top + i * lh); });
    ctx.fillStyle = '#3C3354'; ctx.font = '600 36px Lora, Georgia, "Times New Roman", serif';
    ctx.fillText(SITE_NAME, W / 2, H - 200);
    ctx.fillStyle = '#5A5346'; ctx.font = '28px system-ui, -apple-system, "Segoe UI", sans-serif';
    ctx.fillText(SITE_HOST, W / 2, H - 150);
    return c;
  }
  function slug(s) { return (s || 'words').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'words'; }
  function saveImage(o) {
    o = o || {};
    return new Promise(function (ok, no) {
      var c;
      try { c = drawCard(o); } catch (e) { no(e); return; }
      function go(blob) {
        if (!blob) { no(new Error('no image')); return; }
        var u = URL.createObjectURL(blob), a = mk('a', { href: u, download: slug(o.title || o.text) + '.png' });
        a.hidden = true; document.body.appendChild(a); a.click();
        setTimeout(function () { a.remove(); URL.revokeObjectURL(u); }, 4000);
        ok(true);
      }
      if (c.toBlob) c.toBlob(go, 'image/png');
      else { try { var bin = atob(c.toDataURL('image/png').split(',')[1]), arr = new Uint8Array(bin.length); for (var i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i); go(new Blob([arr], { type: 'image/png' })); } catch (e) { no(e); } }
    });
  }

  // =====================================================================================
  // The extra part of the share sheet
  // =====================================================================================
  var kit = null, cur = null, ctl = null, pendingHeading = '';
  function canNative(d) {
    if (!navigator.share) return false;
    var data = nativeData(d);
    try { return navigator.canShare ? navigator.canShare(data) : true; } catch (e) { return true; }
  }
  function nativeData(d) { var x = {}; if (d.title) x.title = d.title; if (d.text) x.text = d.text; if (d.url) x.url = d.url; return x; }
  function status(t) { var st = ctl && ctl.box.querySelector('.tol-share-status'); if (st) st.textContent = t; }

  function buildKit(box) {
    var root = mk('div', { class: 'tsk-kit' });
    var acts = mk('div', { class: 'tsk-acts' });
    acts.appendChild(mk('button', { type: 'button', class: 'tol-share-act', 'data-kit': 'qr', 'aria-expanded': 'false', 'aria-controls': 'tsk-qr' }, 'Show a QR code'));
    acts.appendChild(mk('button', { type: 'button', class: 'tol-share-act', 'data-kit': 'image' }, 'Save as image'));
    var tog = mk('button', { type: 'button', class: 'tol-share-act tsk-toggle', 'data-kit': 'places', 'aria-expanded': 'false', 'aria-controls': 'tsk-places' }, 'More places');
    acts.appendChild(tog);
    root.appendChild(acts);

    var qr = mk('div', { class: 'tsk-qr', id: 'tsk-qr', hidden: '' });
    qr.appendChild(mk('div', { class: 'tsk-qr-box' }));
    qr.appendChild(mk('p', { class: 'tsk-qr-note' }));
    root.appendChild(qr);

    var places = mk('div', { class: 'tsk-acts tsk-places', id: 'tsk-places', hidden: '' });
    PLACES.forEach(function (p) {
      places.appendChild(mk('a', { class: 'tol-share-act', 'data-kit': 'go', 'data-place': p[0], target: '_blank', rel: 'noopener noreferrer' }, p[1]));
    });
    root.appendChild(places);

    root.addEventListener('click', function (e) {
      var b = e.target.closest('[data-kit]'); if (!b || !cur) return;
      var k = b.getAttribute('data-kit');
      if (k === 'places') {
        var open = places.hidden;
        places.hidden = !open; b.setAttribute('aria-expanded', String(open));
        if (open) { var f = places.querySelector('a:not([hidden])'); if (f) f.focus({ preventScroll: true }); }
        return;
      }
      if (k === 'qr') {
        if (!qr.querySelector('svg')) { showQR(b._qrText); return; }   // a long link: the big code, over the sheet
        var show = qr.hidden;
        qr.hidden = !show; b.setAttribute('aria-expanded', String(show));
        b.textContent = show ? 'Hide the QR code' : 'Show a QR code';
        if (show) {
          fireShared(cur.url, 'qr');
          try { qr.scrollIntoView({ block: 'nearest' }); } catch (er) {}
        }
        return;
      }
      if (k === 'image') {
        var orig = 'Save as image';
        saveImage({ text: imageText(cur), title: cur.text ? cur.title : '' }).then(function () {
          b.textContent = 'Saved!'; status('Picture saved to your downloads. It stays on your device until you share it.');
          fireShared(cur && cur.url, 'image');
          clearTimeout(b._t); b._t = setTimeout(function () { b.textContent = orig; }, 2000);
        }, function () { status('Couldn’t make the picture here. Try “Copy message” instead.'); });
        return;
      }
      if (k === 'go') {
        var place = b.getAttribute('data-place');
        fireShared(cur.url, place);
        if (place === 'messenger') {
          if (/^fb-messenger:/.test(b.getAttribute('href') || '')) {
            // the app either opens (the page goes to the background) or nothing happens: then point to Facebook
            var t0 = Date.now();
            setTimeout(function () {
              if (!document.hidden && Date.now() - t0 < 4000) status('Messenger didn’t open? Try Facebook, or Copy link and paste it into Messenger.');
            }, 1600);
          } else status('This opens Facebook. Choose “Send in Messenger” there.');
        }
      }
    });
    var card = box.querySelector('.tol-share-card') || box, before = box.querySelector('.tol-share-status');
    card.insertBefore(root, before && before.parentNode === card ? before : null);

    // the device's own share menu goes first in the sheet, where the device has one
    var nat = mk('button', { type: 'button', class: 'tol-share-act tsk-native', 'data-kit': 'native' }, 'More apps on this device');
    nat.addEventListener('click', function () {
      var d = cur, done = ctl; if (!d) return;
      try {
        Promise.resolve(navigator.share(nativeData(d))).then(function () {
          fireShared(d.url, 'native'); closeSheet(done);
        }, function () {});
      } catch (er) {}
    });
    var main = box.querySelector('.tol-share-acts');
    if (main) main.insertBefore(nat, main.firstChild); else root.insertBefore(nat, root.firstChild);
    root._native = nat;
    return root;
  }
  function closeSheet(c) {
    if (c && c.close) c.close();
    else if (window.TOLShare && window.TOLShare.close) window.TOLShare.close();
  }

  function onSheet(e) {
    var det = e && e.detail; if (!det || !det.box || !det.data) return;
    ctl = det; cur = det.data;
    if (!kit || !det.box.contains(kit)) kit = buildKit(det.box);
    var d = cur, L = links(d);
    if (pendingHeading) { var h = det.box.querySelector('#tol-share-h'); if (h) h.textContent = pendingHeading; pendingHeading = ''; }
    // each open starts tidy
    var qr = kit.querySelector('.tsk-qr'), places = kit.querySelector('.tsk-places');
    qr.hidden = true; places.hidden = true;
    var qb = kit.querySelector('[data-kit="qr"]'), pb = kit.querySelector('[data-kit="places"]'), ib = kit.querySelector('[data-kit="image"]');
    qb.setAttribute('aria-expanded', 'false'); qb.textContent = 'Show a QR code';
    pb.setAttribute('aria-expanded', 'false'); ib.textContent = 'Save as image';
    kit._native.hidden = !canNative(d);
    // the QR code holds the link (or, with no link, short words)
    var qrText = d.url || (d.text && d.text.length <= 180 ? d.text : ''), box = qr.querySelector('.tsk-qr-box');
    box.textContent = '';
    // a short link fits in the sheet; a longer one opens the big code (showQR) instead
    var s = qrText && qrBytes(qrText) <= 213 ? QR.svg(qrText) : null;
    qb._qrText = qrFits(qrText) ? qrText : '';
    if (qb._qrText && !s) qb.removeAttribute('aria-controls'); else qb.setAttribute('aria-controls', 'tsk-qr');
    if (s) {
      s.setAttribute('aria-label', 'QR code for ' + (d.url ? 'the link' : 'these words'));
      box.appendChild(s);
      qr.querySelector('.tsk-qr-note').textContent = d.url ? 'Scan it with another phone’s camera to open the link. It holds the link and nothing else.' : 'Scan it with another phone’s camera to read the words.';
    }
    qb.hidden = !s && !qb._qrText;
    ib.hidden = !imageText(d);
    var anyPlace = false;
    Array.prototype.forEach.call(places.querySelectorAll('[data-place]'), function (a) {
      var u = L[a.getAttribute('data-place')];
      a.hidden = !u; if (u) { a.setAttribute('href', u); anyPlace = true; } else a.removeAttribute('href');
    });
    pb.hidden = !anyPlace;
  }
  // site.js may announce each opening with a 'tol-share-sheet' event ({ data, box, close }).
  // Without it, the kit watches the sheet and reads what is being shared back from the sheet itself.
  var seenOpen = false;
  document.addEventListener('tol-share-sheet', function (e) { seenOpen = true; onSheet(e); });
  function readSheet(box) {
    function shown(sel) { var n = box.querySelector(sel); return !!n && !n.hidden; }
    var wa = box.querySelector('[data-act="whatsapp"]'), msg = '';
    try { msg = new URL(wa.getAttribute('href')).searchParams.get('text') || ''; } catch (e) { return null; }
    var what = box.querySelector('.tol-share-what'), title = what && !what.hidden ? what.textContent : '';
    var hasUrl = shown('[data-act="copy"]'), url = '', text = msg;
    if (hasUrl) { var i = msg.lastIndexOf('\n'); url = i < 0 ? msg : msg.slice(i + 1); text = i < 0 ? '' : msg.slice(0, i); }
    var h = box.querySelector('#tol-share-h');
    return { title: title, text: text, url: url, result: shown('.tol-share-preview') || shown('[data-act="copy-text"]') || (!!h && h.textContent === 'Share what you made') };
  }
  function watchSheet(box) {
    if (box._tskWatched) return; box._tskWatched = true;
    var check = function () {
      if (box.hidden) { seenOpen = false; return; }
      if (seenOpen) return;   // the event already did it
      seenOpen = true;
      var d = readSheet(box);
      if (d) onSheet({ detail: { data: d, box: box, close: window.TOLShare && window.TOLShare.close } });
    };
    new MutationObserver(check).observe(box, { attributes: true, attributeFilter: ['hidden'] });
    check();
  }
  function findSheet() {
    var b = document.querySelector('.tol-sharesheet[data-share-sheet]');
    if (b) { watchSheet(b); return true; }
    return false;
  }
  function startWatch() {
    if (findSheet()) return;
    var mo = new MutationObserver(function () { if (findSheet()) mo.disconnect(); });
    mo.observe(document.body, { childList: true });
  }

  function shareText(o) {
    o = o || {};
    var d = { title: o.title || '', text: o.text || '', url: o.url, result: o.result !== false };
    if (window.TOLShare && window.TOLShare.open) {
      pendingHeading = o.heading || 'Share this';
      window.TOLShare.open(d);
      return Promise.resolve({ method: 'sheet' });
    }
    // site.js not here: the device's own menu, or copy
    var url = d.url === false ? '' : (d.url || location.origin + location.pathname);
    var data = { title: d.title, text: d.text }; if (url) data.url = url;
    if (navigator.share) return Promise.resolve(navigator.share(data)).then(function () { return { method: 'native' }; }, function () { return null; });
    if (navigator.clipboard) return navigator.clipboard.writeText(message({ text: d.text, url: url })).then(function () { return { method: 'copy' }; });
    return Promise.resolve(null);
  }

  // =====================================================================================
  // "Share this line" on the words people can say
  // =====================================================================================
  // boxes of words to say: p.tol-try, the "-say" boxes on each page (gp-say, pg-say, wk-say ...),
  // p.say, script lines and blockquote.script
  var BOX_SEL = '.tol-try, [class*="-say"], p.say, .script-line, .ci-script, blockquote';
  var SAY_CLASS = /(^|\s)[a-z]+-say(\s|$)/;
  var QUOTE = /“([^”]{3,})”|"([^"]{3,})"/g, QUOTE_TEST = /“[^”]{3,}”|"[^"]{3,}"/;
  function lineText(p) {
    var c = p.cloneNode(true);
    Array.prototype.forEach.call(c.querySelectorAll('button, .tsk-line, script, style, .who'), function (n) { n.remove(); });
    var t = (c.textContent || '').replace(/\s+/g, ' ').trim(), qs = [], m;
    QUOTE.lastIndex = 0;
    while ((m = QUOTE.exec(t))) qs.push('“' + (m[1] || m[2]).trim() + '”');
    if (qs.length) return qs.join(' ');
    return '';
  }
  function linesIn(box) {
    if (box.tagName === 'P') return [box];
    var ps = box.querySelectorAll('p');
    if (!ps.length) return box.querySelector('[class*="-say"], .script-line, .tol-try') ? [] : [box];   // a line written straight into the box
    return Array.prototype.filter.call(ps, function (p) { return !p.closest('.tsk-line'); });
  }
  // the nearest part of the page with an id: the heading above the line, or a box around it that starts later
  function sectionOf(node, main) {
    var hs = main.querySelectorAll('h2[id], h3[id], h4[id]'), head = null;
    for (var i = 0; i < hs.length; i++) {
      if (hs[i].compareDocumentPosition(node) & Node.DOCUMENT_POSITION_FOLLOWING) head = hs[i]; else break;
    }
    var box = node.parentElement && node.parentElement.closest('[id]');
    if (box && !main.contains(box)) box = null;
    if (box === main) box = null;
    if (box && (!head || (head.compareDocumentPosition(box) & Node.DOCUMENT_POSITION_FOLLOWING))) return box;
    return head;
  }
  function headingFor(node, main) {
    var hs = main.querySelectorAll('h1, h2, h3'), best = null;
    for (var i = 0; i < hs.length; i++) {
      if (hs[i].compareDocumentPosition(node) & Node.DOCUMENT_POSITION_FOLLOWING) {
        if (!/^(words you could use|for example|palabras que puedes usar)/i.test(hs[i].textContent.trim())) best = hs[i];
      } else break;
    }
    return best ? best.textContent.replace(/\s+/g, ' ').replace(/\s*[#¶§]$/, '').trim() : '';   // not a heading's own "#" link
  }
  // a small "share" arrow out of a box, drawn in the text colour
  function icon() {
    var NS = 'http://www.w3.org/2000/svg', v = document.createElementNS(NS, 'svg');
    v.setAttribute('viewBox', '0 0 24 24'); v.setAttribute('aria-hidden', 'true'); v.setAttribute('focusable', 'false');
    var p = document.createElementNS(NS, 'path');
    p.setAttribute('d', 'M12 3v12M7.5 7.5 12 3l4.5 4.5M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7');
    p.setAttribute('fill', 'none'); p.setAttribute('stroke', 'currentColor'); p.setAttribute('stroke-width', '2');
    p.setAttribute('stroke-linecap', 'round'); p.setAttribute('stroke-linejoin', 'round');
    v.appendChild(p);
    return v;
  }
  function scan(root) {
    var main = root || document.querySelector('main');
    if (!main || document.body.hasAttribute('data-no-share') || document.body.hasAttribute('data-no-line-share')) return 0;
    var seen = [], n = 0, todo = [];
    Array.prototype.forEach.call(main.querySelectorAll(BOX_SEL), function (box) {
      if (/-say/.test(box.className) && !SAY_CLASS.test(box.className) && !box.matches('.tol-try, p.say, .script-line, .ci-script, blockquote')) return;
      if (box.closest('.tol-sharesheet, form, [contenteditable], .no-line-share, .ci-bad')) return;   // not the "how it can go wrong" examples
      linesIn(box).forEach(function (p) {
        if (seen.indexOf(p) !== -1 || p.querySelector('.tsk-line')) return;
        seen.push(p);
        var text = lineText(p); if (!text || text.length > 400) return;
        var b = mk('button', { type: 'button', class: 'tsk-line', 'aria-label': 'Share this line', title: 'Share this line' });
        b.appendChild(icon());
        b.addEventListener('click', function (e) {
          e.preventDefault(); e.stopPropagation();
          var t = lineText(p), sec = sectionOf(p, main), url = location.origin + location.pathname + (sec ? '#' + encodeURIComponent(sec.id) : '');
          var head = headingFor(p, main) || (document.querySelector('h1') || {}).textContent || '';
          pendingHeading = 'Share this line';
          if (window.TOLShare && window.TOLShare.open) window.TOLShare.open({ title: head.trim(), text: t, url: url, result: true });
          else shareText({ title: head, text: t, url: url });
        });
        // in a row laid out side by side (a line with its own Copy button), the icon goes after the words
        var host = p, disp = getComputedStyle(p).display;
        if (/flex|grid/.test(disp)) {
          var kids = Array.prototype.filter.call(p.children, function (c) { return c.tagName !== 'BUTTON' && QUOTE_TEST.test(c.textContent); });
          if (kids.length) host = kids[kids.length - 1];
        }
        todo.push([p, host, b]);
        n++;
      });
    });
    // add them all at once; where an icon would push the line's last word onto a new line, it sits just
    // past the words instead (taking no room), as long as it still fits inside the box
    var h0 = todo.map(function (t) { return t[0].offsetHeight; });
    todo.forEach(function (t) { t[1].appendChild(t[2]); t[0].classList.add('tsk-has'); });
    var grew = todo.filter(function (t, i) { return t[0].offsetHeight > h0[i] + 1; });
    grew.forEach(function (t) { t[2].classList.add('tsk-tight'); });
    var vw = document.documentElement.clientWidth;
    grew.forEach(function (t) {
      var r = t[2].getBoundingClientRect(), box = t[0].getBoundingClientRect();
      if (r.right > Math.min(box.right, vw) - 2) t[2].classList.remove('tsk-tight');
    });
    return n;
  }
  function start() { try { startWatch(); } catch (e) {} cssReady.then(function (good) { if (good !== false) try { scan(); } catch (e) {} }); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();

  window.TOLShareKit = {
    version: 1,
    sheetFirst: true,   // site.js: open this sheet (with "More apps on this device") instead of jumping straight to the device menu
    shareText: shareText,
    links: links,
    qr: QR,
    showQR: showQR,
    closeQR: closeQR,
    qrFits: qrFits,
    saveImage: saveImage,
    drawCard: drawCard,
    scan: scan
  };
})();
