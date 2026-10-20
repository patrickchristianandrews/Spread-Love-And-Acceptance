/* share-kit.js — more ways to share, added to the one share sheet in site.js (TOLShare).
   Loaded by site.js on every page. It brings its own small stylesheet (/assets/css/share-kit.css),
   so it works on the locked-down workpaper pages too (no inline styles, no inline scripts).
   Everything is free and made on this device. Every place below is a plain share link (or a copy, a
   picture, a QR code) that opens only when tapped. Nothing is sent from this site.

   The sheet, grouped so it is easy to scan
   - At the top: "More apps on this device" (the device's own share menu, where there is one), Copy link,
     and Copy message for something someone made.
   - Messages & chat: Text message, WhatsApp, Email, Messenger, Telegram, Signal (copy, then paste),
     Viber, LINE, WeChat (a QR code to scan in WeChat), Email it to myself.
   - Social: Facebook, X, Bluesky, Threads, Mastodon (asks for your server once and remembers it on this
     device: localStorage "tol-share-mastodon"), Reddit, Pinterest (with the page's picture), Tumblr,
     Instagram, TikTok and Snapchat (they don't take web links: a 9:16 story picture is saved, then a hint
     says what to tap in the app), Nextdoor.
   - Work & school: LinkedIn, Slack, Microsoft Teams, Discord (the message is copied, formatted for
     that app, then the app opens), Google Classroom.
   - Save, print & more: Show a QR code, Send to my other device (a big QR code), Save as square image
     (1080x1080), Save as story image (1080x1920), Print or save as PDF, and, on pages with a plan or a
     check-in time, Add a reminder to my calendar (a .ics file or Google Calendar).
   Which groups are open is remembered on this device (localStorage "tol-share-groups").
   Something private (a result, a list, a link that carries what someone typed) goes to one person:
   the chat apps, email, copy, QR codes and pictures, never the public places.

   On the pages (added here, so each page needs nothing of its own)
   - Content pages: a small Share button under the title and a "Share this page" row at the end
     (not on games, the 404, legal pages, noindex pages, the safety page or the working worksheet pages;
     <body data-no-share> keeps them off). Book chapters also get "Share the book".
   - Tools: "Share this result" on result cards that have no share button of their own (RESULTS below).
     It shares only the words on the card, and only when pressed; the sheet shows exactly what goes.
   - /tools.html: a small share button on each tool card ("Share this tool").
   - Professor Puddles: "Share this answer" under his answers (not on answers about safety).
   - "Share this line": a small button by each "Words you could use" line. Seen on hover or focus with a
     mouse, small and always there on a phone; hidden in Quiet mode and on print. <body data-no-line-share>
     or class="no-line-share" keeps them off.

   For other scripts (window.TOLShareKit)
     TOLShareKit.shareText({ title, text, url, heading })  open the sheet for a piece of text
       (url omitted → this page; false → the text alone). Professor Puddles can use this for an answer.
     TOLShareKit.links(d[, env])   every kit share link for { title, text, url, result, private }
       (env: { mobile, mastodon, image } — for tests; the page fills it in itself)
     TOLShareKit.qr.matrix(text[, mask[, 'L'|'M']]) → { version, ecl, size, mask, modules[y][x] } or null when too long
     TOLShareKit.showQR(url, { title, note })  the link as a big QR code in a dialog, for a phone in the same room;
       Copy link as the backup. Returns false (and shows only Copy link) when the link is too long for a code.
     TOLShareKit.qrFits(url) → true when showQR can draw it (up to 2,000 bytes)
     TOLShareKit.qr.svg(text) → an <svg> element, or null
     TOLShareKit.saveImage({ text, title, url, format: 'square'|'story' }) → Promise, downloads a PNG
     TOLShareKit.drawCard(same) → the <canvas>
     TOLShareKit.scan(root)  add "Share this line" buttons inside root (runs once on load for <main>)
     TOLShareKit.ics({ title, start: Date, minutes, repeat: 'once'|'daily'|'weekly', note, url }) → calendar text

   Adding to the sheet from another script (for example "Work on this together", assets/js/collab.js)
     TOLShareKit.addAction({
       id: 'together-link',               // unique
       group: 'together',                 // 'together' (a group at the top, "Work on this together"),
                                          // 'chat', 'social', 'work' or 'other'
       label: 'Send a working link', labelEs: 'Enviar un enlace de trabajo',
       icon: '<svg viewBox="0 0 24 24">…</svg>'   // optional; a plain dot otherwise
       private: true,                     // may show for private shares (results, lists)
       when: function (d) { return true; },       // optional: show for this share?
       href: function (d) { return 'https://…'; }, // a plain link opened when tapped, or
       run: function (d, api) { … }               // a tap handler
     })
     TOLShareKit.addSection({
       id: 'together',  title: 'Work on this together', titleEs: 'Trabajar juntos en esto',
       order: -1,                         // below 0: above the groups; otherwise below them
       when: function (d) { return !!(d.kit && d.kit.together); },
       build: function (box, d, api) { … }       // fill box (an empty <div>) each time the sheet opens
     })
     api = { data, status(text), close(), copy(text) → Promise<bool>, showQR(url, o) }
     d is what is being shared: { title, text, url, result, private, kit }. Any extra options a page
     passes as TOLShare.share({ …, kit: { … } }) arrive untouched in d.kit (for example d.kit.together).
     Both return a function that removes what they added. Sections are drawn in the sheet's own look
     (headings and .tol-share-act buttons); nothing here sends anything.

   How it finds the sheet: site.js fires 'tol-share-sheet' on document with detail { data, box, close } as
   the sheet opens. If an older site.js does not, the kit watches the sheet (.tol-sharesheet) open and reads
   what is being shared back from it. */
(function () {
  'use strict';
  var BROWSER = typeof document !== 'undefined' && typeof window !== 'undefined';
  if (BROWSER && window.TOLShareKit) return;

  var SITE_NAME = 'Spread Love & Acceptance', SITE_HOST = 'spreadloveandacceptance.com';
  var enc = encodeURIComponent;

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
      if (typeof TextEncoder === 'function') return Array.prototype.slice.call(new TextEncoder().encode(s));
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
      var q = matrix(text); if (!q || !BROWSER) return null;
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
  // Share links: each one built only from what is being shared, opened only when tapped.
  // Plain functions (no page needed), so they can be checked on their own.
  // =====================================================================================
  function message(d) { return [d.text, d.url].filter(Boolean).join('\n'); }
  function oneLine(s) { return String(s || '').replace(/\s*\n+\s*/g, ' ').trim(); }
  // private: a result, a list, a check-in card, or a link carrying what someone typed (#list=…, ?plan=…)
  function isPrivate(d) { return !!(d.private || d.result || (d.url && /[#?&][\w-]+=/.test(d.url))); }
  // a Mastodon server name, from whatever was typed: "mastodon.social", "https://mastodon.social/", "@me@mastodon.social"
  function mastodonHost(h) {
    h = String(h || '').trim().toLowerCase().replace(/^https?:\/\//, '').replace(/^@?[^@\s\/]*@/, '').replace(/[\/?#].*$/, '');
    return /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+(:\d{1,5})?$/.test(h) ? h : '';
  }
  function emailOk(a) { return /^[^\s@<>()",;:\\\/?&#]+@[^\s@<>()",;:\\\/?&#]+\.[^\s@<>()",;:\\\/?&#]+$/.test(String(a || '').trim()); }
  // the message as a work chat app shows it best: Slack bolds *this*, Discord and Teams **this**
  function formatted(d, app) {
    var t = (d.title || '').trim(), body = (d.text || '').trim(), u = d.url || '';
    var head = t && body.indexOf(t) !== 0 ? (app === 'slack' ? '*' + t + '*' : '**' + t + '**') : '';
    return [head, body, u].filter(Boolean).join('\n');
  }
  function links(d, env) {
    d = d || {}; env = env || {};
    var msg = message(d), url = d.url || '', linkOnly = !!url && !d.result, t = d.title || '', text = d.text || '';
    var host = mastodonHost(env.mastodon);
    return {
      // Messenger has no web share link of its own: phones open the app, computers get Facebook's share page
      messenger: linkOnly ? (env.mobile ? 'fb-messenger://share/?link=' + enc(url) : 'https://www.facebook.com/sharer/sharer.php?u=' + enc(url)) : '',
      telegram: url ? 'https://t.me/share/url?url=' + enc(url) + (text ? '&text=' + enc(text) : '') : '',
      // Viber's own share link (developers.viber.com/docs/tools/share-button): the app must be on the device; new lines are dropped
      viber: msg ? 'viber://forward?text=' + enc(oneLine(msg)) : '',
      line: linkOnly ? 'https://social-plugins.line.me/lineit/share?url=' + enc(url) : (msg ? 'https://line.me/R/share?text=' + enc(msg) : ''),
      linkedin: linkOnly ? 'https://www.linkedin.com/sharing/share-offsite/?url=' + enc(url) : '',
      reddit: linkOnly ? 'https://www.reddit.com/submit?url=' + enc(url) + '&title=' + enc(t || text) : '',
      bluesky: msg && msg.length <= 300 ? 'https://bsky.app/intent/compose?text=' + enc(msg) : '',
      threads: msg && msg.length <= 500 ? 'https://www.threads.net/intent/post?text=' + enc(msg) : '',
      // Mastodon: each server has its own /share page; the server is asked for once
      mastodon: host && msg && msg.length <= 500 ? 'https://' + host + '/share?text=' + enc(msg) : '',
      tumblr: linkOnly ? 'https://www.tumblr.com/widgets/share/tool?posttype=link&canonicalUrl=' + enc(url) + (t ? '&title=' + enc(t) : '') + (text ? '&caption=' + enc(text) : '') : '',
      pinterest: linkOnly && env.image ? 'https://www.pinterest.com/pin/create/button/?url=' + enc(url) + '&media=' + enc(env.image) + '&description=' + enc(text || t) : '',
      // Nextdoor's share kit (developer.nextdoor.com, share plugin): source and body; the link in the body makes the preview
      nextdoor: linkOnly && enc(msg).length <= 3500 ? 'https://nextdoor.com/sharekit/?source=' + enc(SITE_HOST) + '&body=' + enc(msg) : '',
      // Google Classroom's share link (developers.google.com/workspace/classroom/guides/sharebutton)
      classroom: linkOnly ? 'https://classroom.google.com/share?url=' + enc(url) + (t ? '&title=' + enc(t) : '') + (text ? '&body=' + enc(text) : '') : '',
      // Teams: its share page for a link; otherwise Teams itself (the message is on the clipboard by then)
      teams: linkOnly ? 'https://teams.microsoft.com/share?href=' + enc(url) + ((text || t) ? '&msgText=' + enc(text || t) : '') : 'https://teams.microsoft.com/',
      slack: 'https://app.slack.com/client',
      discord: 'https://discord.com/channels/@me'
    };
  }
  function emailSelfHref(d, addr) {
    if (!emailOk(addr)) return '';
    return 'mailto:' + String(addr).trim() + '?subject=' + enc('For later: ' + (d.title || 'something to read')) + '&body=' + enc(message(d));
  }

  // ---- calendar files (the same shape as /assets/js/remind.js: a plain local time, a reminder at the start) ----
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function stamp(x) { return x.getFullYear() + pad(x.getMonth() + 1) + pad(x.getDate()) + 'T' + pad(x.getHours()) + pad(x.getMinutes()) + '00'; }
  function utcStamp(x) { return x.getUTCFullYear() + pad(x.getUTCMonth() + 1) + pad(x.getUTCDate()) + 'T' + pad(x.getUTCHours()) + pad(x.getUTCMinutes()) + pad(x.getUTCSeconds()) + 'Z'; }
  function icsText(s) { return String(s).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n'); }
  function fold(line) {
    var out = '', used = 0;
    for (var i = 0; i < line.length; i++) {
      var c = line.charCodeAt(i), ch = line.charAt(i), bytes = c < 0x80 ? 1 : c < 0x800 ? 2 : 3;
      if (c >= 0xD800 && c <= 0xDBFF && i + 1 < line.length) { ch += line.charAt(++i); bytes = 4; }
      if (used + bytes > 75) { out += '\r\n '; used = 1; }
      out += ch; used += bytes;
    }
    return out;
  }
  var RRULE = { daily: 'FREQ=DAILY', weekly: 'FREQ=WEEKLY' };
  function ics(o) {
    var start = o.start, minutes = Math.max(5, Math.min(240, +o.minutes || 15)), rr = RRULE[o.repeat] || '';
    var uid = (o.uid || (Date.now().toString(36) + Math.random().toString(36).slice(2, 8))) + '@' + SITE_HOST;
    var ev = ['BEGIN:VEVENT', 'UID:' + uid, 'DTSTAMP:' + utcStamp(new Date()), 'DTSTART:' + stamp(start), 'DURATION:PT' + minutes + 'M'];
    if (rr) ev.push('RRULE:' + rr);
    ev.push('SUMMARY:' + icsText(o.title || 'Reminder'));
    if (o.note) ev.push('DESCRIPTION:' + icsText(o.note));
    if (o.url) ev.push('URL:' + o.url);
    ev.push('BEGIN:VALARM', 'ACTION:DISPLAY', 'TRIGGER:PT0M', 'DESCRIPTION:' + icsText(o.title || 'Reminder'), 'END:VALARM', 'END:VEVENT');
    var lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Spread Love and Acceptance//Share reminder//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH'].concat(ev, ['END:VCALENDAR']);
    return lines.map(fold).join('\r\n') + '\r\n';
  }
  function googleCalHref(o) {
    var e = new Date(o.start.getTime() + (Math.max(5, +o.minutes || 15)) * 60000), rr = RRULE[o.repeat] || '';
    return 'https://calendar.google.com/calendar/render?action=TEMPLATE&text=' + enc(o.title || 'Reminder') +
      '&dates=' + stamp(o.start) + '/' + stamp(e) + (rr ? '&recur=' + enc('RRULE:' + rr) : '') + '&details=' + enc([o.note, o.url].filter(Boolean).join('\n'));
  }

  // ---- which places show for what is being shared ----
  // groups, in order; "together" sits first and only shows when another script adds to it
  var GROUPS = [
    ['together', 'Work on this together'],
    ['chat', 'Messages & chat'],
    ['social', 'Social'],
    ['work', 'Work & school'],
    ['other', 'Save, print & more']
  ];
  // id, group, label, kind, may go to one person (private)
  //   site: a button site.js already makes (data-act), moved into its group
  //   link: a plain link · copyopen: copy formatted, then open the app · story: save a story picture, then a hint
  var PLACES = [
    ['sms', 'chat', 'Text message', 'site', 1],
    ['whatsapp', 'chat', 'WhatsApp', 'site', 1],
    ['email', 'chat', 'Email', 'site', 1],
    ['messenger', 'chat', 'Messenger', 'link', 1],
    ['telegram', 'chat', 'Telegram', 'link', 1],
    ['signal', 'chat', 'Signal', 'copy', 1],
    ['viber', 'chat', 'Viber', 'link', 1],
    ['line', 'chat', 'LINE', 'link', 1],
    ['wechat', 'chat', 'WeChat', 'qr', 1],
    ['emailself', 'chat', 'Email it to myself', 'panel', 1],
    ['facebook', 'social', 'Facebook', 'site', 0],
    ['x', 'social', 'X', 'site', 0],
    ['bluesky', 'social', 'Bluesky', 'link', 0],
    ['threads', 'social', 'Threads', 'link', 0],
    ['mastodon', 'social', 'Mastodon', 'mastodon', 0],
    ['reddit', 'social', 'Reddit', 'link', 0],
    ['pinterest', 'social', 'Pinterest', 'link', 0],
    ['tumblr', 'social', 'Tumblr', 'link', 0],
    ['instagram', 'social', 'Instagram', 'story', 0],
    ['tiktok', 'social', 'TikTok', 'story', 0],
    ['snapchat', 'social', 'Snapchat', 'story', 0],
    ['nextdoor', 'social', 'Nextdoor', 'link', 0],
    ['linkedin', 'work', 'LinkedIn', 'link', 0],
    ['slack', 'work', 'Slack', 'copyopen', 1],
    ['teams', 'work', 'Microsoft Teams', 'copyopen', 1],
    ['discord', 'work', 'Discord', 'copyopen', 1],
    ['classroom', 'work', 'Google Classroom', 'link', 0],
    ['qr', 'other', 'Show a QR code', 'qr-inline', 1],
    ['device', 'other', 'Send to my other device', 'device', 1],
    ['square', 'other', 'Save as square image', 'image', 1],
    ['story', 'other', 'Save as story image', 'image', 1],
    ['print', 'other', 'Print or save as PDF', 'site', 1],
    ['calendar', 'other', 'Add a reminder to my calendar', 'panel', 1]
  ];
  // the words a picture carries: a result's own words, or a page's title and line
  var IMAGE_MAX = { square: 520, story: 1100 };
  function imageWords(d) { return ((d.result ? d.text : (d.text || d.title)) || '').trim(); }
  function imageOk(d, format) { var w = imageWords(d); return !!w && w.length <= IMAGE_MAX[format || 'square']; }
  // true when a kit place shows for d (site.js decides its own buttons; env: { mobile, mastodon, image, remind, qr })
  function placeShows(id, d, env) {
    env = env || {};
    var p = null; PLACES.some(function (x) { if (x[0] === id) { p = x; return true; } return false; });
    if (!p) return false;
    if (isPrivate(d) && !p[4]) return false;
    var L = links(d, env), msg = message(d);
    switch (id) {
      case 'messenger': return !!L.messenger && (!isPrivate(d) || /^fb-messenger:/.test(L.messenger));
      case 'signal': return !!msg;
      case 'wechat': case 'device': return !!d.url || (!!d.text && d.text.length <= 180);
      case 'emailself': return !!msg;
      case 'mastodon': return !!msg && msg.length <= 500;
      case 'instagram': case 'tiktok': return imageOk(d, 'story');
      case 'snapchat': return imageOk(d, 'story') || !!d.url;
      case 'slack': case 'teams': case 'discord': return !!msg;
      case 'qr': return !!env.qr;
      case 'square': return imageOk(d, 'square');
      case 'story': return imageOk(d, 'story');
      case 'calendar': return !!env.remind;
      default: return !!L[id];
    }
  }

  if (!BROWSER) {
    if (typeof module === 'object' && module.exports) module.exports = { links: links, message: message, formatted: formatted, isPrivate: isPrivate, mastodonHost: mastodonHost, emailOk: emailOk, emailSelfHref: emailSelfHref, ics: ics, googleCalHref: googleCalHref, placeShows: placeShows, PLACES: PLACES, GROUPS: GROUPS, qr: QR, imageOk: imageOk };
    return;
  }

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
  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) {} }
  var path = location.pathname.replace(/\/$/, '/index.html');
  if (path === '/') path = '/index.html';

  // =====================================================================================
  // Small icons, drawn here (no pictures from anywhere else). A soft coloured tile with a plain mark,
  // so each place is quick to spot. The page's dark look turns svg back, so the colours stay true.
  // =====================================================================================
  var NS = 'http://www.w3.org/2000/svg';
  // [tile colour, mark colour, mark: a path ("M…"), or "t:" and up to 4 letters]
  var ICONS = {
    native: ['#3C3354', '#fff', 'M12 4v10M8 8l4-4 4 4M6 13v5a1.5 1.5 0 0 0 1.5 1.5h9A1.5 1.5 0 0 0 18 18v-5', 'stroke'],
    copy: ['#6B5A8E', '#fff', 'M10.5 13.5l3-3M9 11l-2 2a2.5 2.5 0 0 0 3.5 3.5l2-2M15 13l2-2a2.5 2.5 0 0 0-3.5-3.5l-2 2', 'stroke'],
    copytext: ['#6B5A8E', '#fff', 'M8 6.5h8M8 10h8M8 13.5h5M6 4h12v16H6z', 'stroke'],
    sms: ['#2E9E4F', '#fff', 'M5 6.5h14v9H10l-4 3v-3H5z', 'fill'],
    whatsapp: ['#1FAF54', '#fff', 'M12 4.5a7.5 7.5 0 0 0-6.5 11.2L4.5 19.5l3.9-1A7.5 7.5 0 1 0 12 4.5zM9.6 8.3c.3 0 .5.1.6.4l.6 1.4-.4.7c.4.9 1.2 1.7 2.1 2.1l.7-.4 1.4.6c.3.1.4.4.3.7-.3.8-1 1.2-1.8 1.1-2.4-.4-4.4-2.4-4.8-4.8-.1-.8.3-1.5 1.1-1.8z', 'fill'],
    email: ['#7A5C2E', '#fff', 'M4.5 7h15v10h-15zM4.5 7.5l7.5 5.5 7.5-5.5', 'stroke'],
    messenger: ['#0A6CF0', '#fff', 'M12 4.5c-4.3 0-7.5 3.1-7.5 7 0 2.2 1 4.1 2.7 5.4v2.6l2.4-1.3c.8.2 1.6.3 2.4.3 4.3 0 7.5-3.1 7.5-7s-3.2-7-7.5-7zm.7 9.3l-1.9-2-3.6 2 4-4.3 1.9 2 3.6-2z', 'fill'],
    telegram: ['#1C8FCB', '#fff', 'M4.8 11.6l13.4-5.2c.6-.2 1.2.2 1 1l-2.3 10.8c-.2.7-.6.9-1.2.6l-3.4-2.5-1.6 1.6c-.2.2-.4.3-.7.3l.2-3.5 6.4-5.8c.3-.3-.1-.4-.4-.2l-7.9 5-3.4-1.1c-.7-.2-.7-.7.1-1z', 'fill'],
    signal: ['#2F6BE0', '#fff', 'M12 5a7 7 0 0 0-6 10.6L5 19l3.5-.9A7 7 0 1 0 12 5z', 'stroke'],
    viber: ['#6F5BD8', '#fff', 'M12 4.5c-4 0-7 2.4-7 6.5 0 2.4 1 4.2 2.8 5.3V19l2.6-1.6c.5.1 1 .1 1.6.1 4 0 7-2.4 7-6.5s-3-6.5-7-6.5zm-1.8 3.8c.3 0 .5.1.6.4l.5 1.2-.4.6c.4.8 1 1.4 1.8 1.8l.6-.4 1.2.5c.3.1.4.4.3.6-.3.7-.9 1-1.6.9-2-.4-3.6-2-4-4-.1-.7.3-1.3 1-1.6z', 'fill'],
    line: ['#05B44F', '#fff', 't:LINE'],
    wechat: ['#07A84F', '#fff', 'M10 5.5c-3.3 0-6 2.1-6 4.8 0 1.5.8 2.8 2.1 3.7l-.5 1.7 2-1c.7.2 1.5.3 2.3.3h.4a4.3 4.3 0 0 1-.2-1.2c0-2.6 2.6-4.6 5.8-4.6h.3C15.6 7 13 5.5 10 5.5zm6 5c-2.6 0-4.7 1.7-4.7 3.8s2.1 3.8 4.7 3.8c.6 0 1.1-.1 1.7-.2l1.6.8-.4-1.4c1-.7 1.7-1.8 1.7-3 0-2.1-2.1-3.8-4.6-3.8z', 'fill'],
    emailself: ['#7A5C2E', '#fff', 'M4.5 7h15v10h-15zM4.5 7.5l7.5 5.5 7.5-5.5M12 17v3', 'stroke'],
    facebook: ['#1668E3', '#fff', 't:f'],
    x: ['#111111', '#fff', 't:X'],
    bluesky: ['#0F7AE5', '#fff', 'M12 11.3c-1-2-3.8-5.6-6.3-5.6-1.4 0-1.7 1.6-1.4 3 .4 1.8 1.7 3 3.6 3.1-2.4.4-3.4 1.7-2.2 3.1 2 2.4 4.4.6 6.3-2.7 1.9 3.3 4.3 5.1 6.3 2.7 1.2-1.4.2-2.7-2.2-3.1 1.9-.1 3.2-1.3 3.6-3.1.3-1.4 0-3-1.4-3-2.5 0-5.3 3.6-6.3 5.6z', 'fill'],
    threads: ['#111111', '#fff', 't:@'],
    mastodon: ['#5A55E8', '#fff', 't:M'],
    reddit: ['#F04A00', '#fff', 'M12 9.5c-3.6 0-6.5 2-6.5 4.5S8.4 18.5 12 18.5s6.5-2 6.5-4.5S15.6 9.5 12 9.5zm-2.6 3a1 1 0 1 1 0 2 1 1 0 0 1 0-2zm5.2 0a1 1 0 1 1 0 2 1 1 0 0 1 0-2zM9.3 16c1.6 1 3.8 1 5.4 0M12 9.5l1-4 3 .8M17.5 6.3a1 1 0 1 0 0 .1', 'fill'],
    pinterest: ['#D5001F', '#fff', 't:P'],
    tumblr: ['#283B57', '#fff', 't:t'],
    instagram: ['#D62E74', '#fff', 'M8 5h8a3 3 0 0 1 3 3v8a3 3 0 0 1-3 3H8a3 3 0 0 1-3-3V8a3 3 0 0 1 3-3zM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6zM16.3 7.4v.1', 'stroke'],
    tiktok: ['#111111', '#fff', 'M13.5 5v9.3a2.8 2.8 0 1 1-2.3-2.8M13.5 5c.4 2 1.8 3.3 3.8 3.4', 'stroke'],
    snapchat: ['#F7E600', '#111', 'M12 5c-2.3 0-4 1.8-4 4.1v1.6l-1.4-.3c-.4 0-.6.5-.2.7l1.5.8c-.4 1.3-1.4 2.4-2.6 2.9-.3.1-.2.5.1.6l1.3.4.4 1.1 1.6-.1c.8.6 2 1.4 3.3 1.4s2.5-.8 3.3-1.4l1.6.1.4-1.1 1.3-.4c.3-.1.4-.5.1-.6-1.2-.5-2.2-1.6-2.6-2.9l1.5-.8c.4-.2.2-.7-.2-.7l-1.4.3V9.1C16 6.8 14.3 5 12 5z', 'fill'],
    nextdoor: ['#6DAE00', '#fff', 'M5 12l7-6 7 6M7.5 10v8h3.5v-4.5h2V18h3.5v-8', 'stroke'],
    linkedin: ['#0A5DB5', '#fff', 't:in'],
    slack: ['#4A154B', '#fff', 't:#'],
    teams: ['#4B53BC', '#fff', 't:T'],
    discord: ['#5865F2', '#fff', 'M8 7.5c1.2-.5 2.5-.8 4-.8s2.8.3 4 .8c1.6 2.3 2.3 4.7 2.1 7.3-1.2.9-2.5 1.5-3.8 1.9l-.8-1.3c.6-.2 1.2-.5 1.7-.8-1 .5-2.1.8-3.2.9-1.1-.1-2.2-.4-3.2-.9.5.3 1.1.6 1.7.8l-.8 1.3c-1.3-.4-2.6-1-3.8-1.9-.2-2.6.5-5 2.1-7.3zm1.9 4a1.1 1.2 0 1 0 0 2.4 1.1 1.2 0 0 0 0-2.4zm4.2 0a1.1 1.2 0 1 0 0 2.4 1.1 1.2 0 0 0 0-2.4z', 'fill'],
    classroom: ['#1E8E3E', '#fff', 'M5 6h14v10H5zM9.5 19h5M12 9.2a1.6 1.6 0 1 0 0 3.2 1.6 1.6 0 0 0 0-3.2zM9 15c.5-1.3 1.6-2 3-2s2.5.7 3 2', 'stroke'],
    qr: ['#2B2620', '#fff', 'M5 5h5v5H5zM14 5h5v5h-5zM5 14h5v5H5zM14 14h2v2h-2zM17 17h2v2h-2zM14 18h1M18 14h1', 'stroke'],
    device: ['#3C3354', '#fff', 'M8 4.5h8v15H8zM11 17h2M4 12h3M5.5 10.5L4 12l1.5 1.5', 'stroke'],
    square: ['#8E7BB8', '#fff', 'M5.5 5.5h13v13h-13zM8 15l3-3 2 2 2-2.5 2 3.5', 'stroke'],
    story: ['#8E7BB8', '#fff', 'M8 3.5h8v17H8zM9.5 15l2-2 1.5 1.5 1.5-2 1.5 2.5', 'stroke'],
    print: ['#5A5346', '#fff', 'M7.5 9V4.5h9V9M7.5 16h-2a1 1 0 0 1-1-1v-5a1 1 0 0 1 1-1h13a1 1 0 0 1 1 1v5a1 1 0 0 1-1 1h-2M7.5 13.5h9v6h-9z', 'stroke'],
    calendar: ['#B5473F', '#fff', 'M5 6.5h14V19H5zM5 10h14M9 4.5v4M15 4.5v4M9 13.5h2M13 13.5h2M9 16h2', 'stroke'],
    together: ['#3C7A5A', '#fff', 'M9 11a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zM15.5 11a2.2 2.2 0 1 0 0-4.4 2.2 2.2 0 0 0 0 4.4zM4.5 18c.6-2.6 2.3-4 4.5-4s3.9 1.4 4.5 4M13.8 14.2c.5-.2 1.1-.3 1.7-.3 1.9 0 3.4 1.3 4 4.1', 'stroke'],
    dot: ['#8E7BB8', '#fff', 'M12 10a2 2 0 1 0 0 4 2 2 0 0 0 0-4z', 'fill'],
    share: ['', 'currentColor', 'M12 3v12M7.5 7.5 12 3l4.5 4.5M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7', 'stroke']
  };
  function svgIcon(id, cls) {
    var spec = ICONS[id] || ICONS.dot, v = document.createElementNS(NS, 'svg');
    v.setAttribute('viewBox', '0 0 24 24'); v.setAttribute('aria-hidden', 'true'); v.setAttribute('focusable', 'false');
    v.setAttribute('class', cls || 'tsk-ic');
    if (spec[0]) {
      var r = document.createElementNS(NS, 'rect');
      r.setAttribute('width', '24'); r.setAttribute('height', '24'); r.setAttribute('rx', '6'); r.setAttribute('fill', spec[0]);
      v.appendChild(r);
    }
    if (spec[2].indexOf('t:') === 0) {
      var t = document.createElementNS(NS, 'text'), w = spec[2].slice(2);
      t.setAttribute('x', '12'); t.setAttribute('y', '12'); t.setAttribute('text-anchor', 'middle'); t.setAttribute('dominant-baseline', 'central');
      t.setAttribute('fill', spec[1]); t.setAttribute('font-family', 'Arial, Helvetica, sans-serif'); t.setAttribute('font-weight', '700');
      t.setAttribute('font-size', w.length > 2 ? '7' : w.length > 1 ? '11' : '15');
      t.textContent = w; v.appendChild(t);
    } else {
      var p = document.createElementNS(NS, 'path');
      p.setAttribute('d', spec[2]);
      if (spec[3] === 'stroke') {
        p.setAttribute('fill', 'none'); p.setAttribute('stroke', spec[1]); p.setAttribute('stroke-width', spec[0] ? '1.6' : '2');
        p.setAttribute('stroke-linecap', 'round'); p.setAttribute('stroke-linejoin', 'round');
      } else p.setAttribute('fill', spec[1]);
      v.appendChild(p);
    }
    return v;
  }
  // an icon given by another script as svg markup (parsed as svg, never as html)
  function customIcon(markup) {
    try {
      var doc = new DOMParser().parseFromString(String(markup), 'image/svg+xml'), s = doc.documentElement;
      if (!s || s.nodeName.toLowerCase() !== 'svg' || s.getElementsByTagName('parsererror').length) return null;
      Array.prototype.forEach.call(s.querySelectorAll('script, foreignObject'), function (n) { n.remove(); });
      var all = [s].concat(Array.prototype.slice.call(s.querySelectorAll('*')));
      all.forEach(function (n) { Array.prototype.slice.call(n.attributes).forEach(function (a) { if (/^on|^style$|href$/i.test(a.name)) n.removeAttribute(a.name); }); });
      var v = document.importNode(s, true);
      v.setAttribute('class', 'tsk-ic'); v.setAttribute('aria-hidden', 'true'); v.setAttribute('focusable', 'false');
      return v;
    } catch (e) { return null; }
  }
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
    card.appendChild(mk('p', { class: 'tsk-qrd-long', hidden: '' }, 'This link holds too much to fit in a QR code a phone can read. Use Copy link and send it in a message instead.'));
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
    var dpr = Math.max(1, Math.min(window.devicePixelRatio || 1, 4));
    // on a plain (1x) screen, whole pixels per module keep every module the same size; a sharp phone screen can use all the room
    var css = dpr < 2 && Math.floor(room / n) >= MIN_PX ? Math.floor(room / n) * n : Math.floor(room);
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
    dlg.querySelector('#tsk-qrd-h').textContent = q ? (o.title || 'Scan with the other phone') : 'Too long for a QR code';
    var note = dlg.querySelector('.tsk-qrd-note');
    note.textContent = o.note || 'Open the camera on the other phone and point it at this code. The link opens there.';
    note.hidden = !q;
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
  // Pictures to share: the words on a soft card in the site's look, drawn here, saved as a PNG.
  // Square (1080x1080) for posts and chats; story (1080x1920) for Instagram, TikTok and Snapchat.
  // A page's picture carries a small QR code of its link; a result's picture never carries a link
  // that holds what someone typed.
  // =====================================================================================
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
  var SERIF = 'Lora, Georgia, "Times New Roman", serif', DISPLAY = 'Fraunces, Georgia, "Times New Roman", serif', SANS = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
  function fontsReady() {
    try {
      if (!document.fonts || !document.fonts.load) return Promise.resolve();
      var t = new Promise(function (ok) { setTimeout(ok, 1200); });
      return Promise.race([Promise.all(['48px Lora', '600 48px Fraunces'].map(function (f) { return document.fonts.load(f).catch(function () {}); })), t]);
    } catch (e) { return Promise.resolve(); }
  }
  function prettyUrl(u) { return String(u || '').replace(/^https?:\/\/(www\.)?/, '').replace(/\/index\.html$/, '').replace(/\.html(?=$|[#?])/, ''); }
  // o: { text, title, url, format: 'square'|'story', qr: true to draw the link as a code, kicker }
  function drawCard(o) {
    o = o || {};
    var story = o.format === 'story', W = 1080, H = story ? 1920 : 1080, c = document.createElement('canvas'); c.width = W; c.height = H;
    var ctx = c.getContext('2d');
    var text = (o.text || o.title || '').trim(), sub = o.text && o.title ? o.title.trim() : '';
    var q = o.qr && o.url && qrBytes(o.url) <= 213 ? QR.matrix(o.url) : null;
    // the paper, two soft bands and a frame
    ctx.fillStyle = '#FFFDF7'; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#EFE8FA'; ctx.fillRect(0, 0, W, story ? 40 : 28); ctx.fillRect(0, H - (story ? 40 : 28), W, story ? 40 : 28);
    ctx.strokeStyle = '#B9A8D6'; ctx.lineWidth = 6;
    var fx = 60, fy = story ? 120 : 88; ctx.strokeRect(fx, fy, W - 2 * fx, H - 2 * fy);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    var maxW = W - 240, y = fy + (story ? 110 : 80);
    // the title above the words, small
    if (sub) {
      ctx.font = '600 ' + (story ? 40 : 32) + 'px ' + SANS; ctx.fillStyle = '#5A5346';
      var sl = wrap(ctx, sub, maxW).slice(0, story ? 3 : 2);
      sl.forEach(function (s, i) { ctx.fillText(s, W / 2, y + i * (story ? 52 : 42)); });
      y += sl.length * (story ? 52 : 42) + (story ? 40 : 24);
      ctx.fillStyle = '#B9A8D6'; ctx.fillRect(W / 2 - 40, y - (story ? 20 : 12), 80, 4);
    }
    // the footer: the site's name and the link, and the code beside (square) or above it (story)
    var qrPx = q ? (story ? 260 : 150) : 0, footTop = H - fy - (story ? 170 : 120) - (story && q ? qrPx + 60 : 0);
    var bottom = footTop - (story ? 60 : 30);
    // the words, as large as fit
    var size = story ? 76 : 64, lines, lh, minSize = story ? 30 : 26, room = bottom - y;
    for (; size >= minSize; size -= 2) {
      ctx.font = size + 'px ' + SERIF;
      lines = wrap(ctx, text, maxW); lh = Math.round(size * 1.34);
      if (lines.length * lh <= room) break;
    }
    if (lines.length * lh > room) {   // still too long: as many lines as fit, ending in an ellipsis
      var fit = Math.max(1, Math.floor(room / lh)); lines = lines.slice(0, fit); lines[fit - 1] = lines[fit - 1].replace(/\s*\S*$/, '') + ' …';
    }
    ctx.fillStyle = '#2B2620'; ctx.font = size + 'px ' + SERIF;
    var top = y + (room - lines.length * lh) / 2 + lh / 2;
    lines.forEach(function (ln, i) { ctx.fillText(ln, W / 2, top + i * lh); });
    // the code
    if (q) {
      var n = q.size + 8, k = Math.max(1, Math.floor(qrPx / n)), px = n * k;
      var qx = story ? (W - px) / 2 : W - fx - 40 - px, qy = story ? footTop + 20 : H - fy - 40 - px;
      ctx.fillStyle = '#ffffff'; ctx.fillRect(qx, qy, px, px);
      ctx.fillStyle = '#000000';
      for (var yy = 0; yy < q.size; yy++) for (var xx = 0; xx < q.size; xx++) if (q.modules[yy][xx]) ctx.fillRect(qx + (xx + 4) * k, qy + (yy + 4) * k, k, k);
      if (story) { ctx.fillStyle = '#5A5346'; ctx.font = '28px ' + SANS; ctx.fillText('Scan to open', W / 2, qy + px + 30); }
    }
    var fxText = q && !story ? (fx + 40 + (W - 2 * fx - 80 - qrPx - 30) / 2) : W / 2, fMax = q && !story ? W - 2 * fx - 120 - qrPx : maxW;
    var fy2 = story ? H - fy - 130 : H - fy - 90;
    ctx.fillStyle = '#3C3354'; ctx.font = '600 ' + (story ? 44 : 36) + 'px ' + DISPLAY;
    ctx.fillText(SITE_NAME, fxText, fy2, fMax);
    ctx.fillStyle = '#5A5346'; ctx.font = (story ? 32 : 26) + 'px ' + SANS;
    var shown = o.url && !isPrivate(o) ? prettyUrl(o.url) : SITE_HOST;
    ctx.fillText(shown.length > 48 ? SITE_HOST : shown, fxText, fy2 + (story ? 56 : 46), fMax);
    return c;
  }
  function slug(s) { return (s || 'words').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'words'; }
  function canvasBlob(c) {
    return new Promise(function (ok, no) {
      if (c.toBlob) { c.toBlob(function (b) { if (b) ok(b); else no(new Error('no image')); }, 'image/png'); return; }
      try { var bin = atob(c.toDataURL('image/png').split(',')[1]), arr = new Uint8Array(bin.length); for (var i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i); ok(new Blob([arr], { type: 'image/png' })); } catch (e) { no(e); }
    });
  }
  function downloadBlob(blob, name) {
    var u = URL.createObjectURL(blob), a = mk('a', { href: u, download: name });
    a.hidden = true; document.body.appendChild(a); a.click();
    setTimeout(function () { a.remove(); URL.revokeObjectURL(u); }, 4000);
  }
  function saveImage(o) {
    o = o || {};
    return fontsReady().then(function () {
      var c = drawCard(o);
      return canvasBlob(c).then(function (blob) {
        downloadBlob(blob, slug(o.title || o.text) + (o.format === 'story' ? '-story' : o.format === 'square' ? '-square' : '') + '.png');
        return true;
      });
    });
  }

  // =====================================================================================
  // The share sheet, grouped: the kit takes site.js's sheet and lays its places out in groups
  // =====================================================================================
  var kit = null, cur = null, ctl = null, pendingHeading = '', curEnv = {};
  var EXTRA_ACTIONS = [], EXTRA_SECTIONS = [];
  var MASTO_KEY = 'tol-share-mastodon', GROUPS_KEY = 'tol-share-groups';
  function canNative(d) {
    if (!navigator.share) return false;
    var data = nativeData(d);
    try { return navigator.canShare ? navigator.canShare(data) : true; } catch (e) { return true; }
  }
  function nativeData(d) { var x = {}; if (d.title) x.title = d.title; if (d.text) x.text = d.text; if (d.url) x.url = d.url; return x; }
  function status(t) { var st = ctl && ctl.box.querySelector('.tol-share-status'); if (st) st.textContent = t; }
  function closeSheet(c) {
    c = c || ctl;
    if (c && c.close) c.close();
    else if (window.TOLShare && window.TOLShare.close) window.TOLShare.close();
  }
  function ogImage() { var m = document.querySelector('meta[property="og:image"]'); return m ? m.getAttribute('content') || '' : ''; }
  function openGroups() {
    try { var a = JSON.parse(lsGet(GROUPS_KEY) || 'null'); if (Array.isArray(a)) return a; } catch (e) {}
    return ['together', 'chat'];
  }
  function api(d) {
    return { data: d, status: status, close: function () { closeSheet(); }, copy: copyText,
      showQR: function (u, o) { return showQR(u, o); } };
  }

  // ---- reminders: pages with a plan or a check-in time ----
  // title is neutral on purpose (a calendar can be seen by others); repeat: once, daily or weekly
  var REMIND = [
    [/^\/check-ins\.html$/, { title: ['Our check-in'], repeat: 'weekly', day: 0, time: '19:30', minutes: 30 }],
    [/^\/workpapers\/(fill\/wp-13|wp-13-daily-check-in)\.html$|^\/wp-13\.html$/, { title: ['90-second check-in'], repeat: 'daily', time: '21:00', minutes: 5 }],
    [/^\/week-0\.html$/, { title: ['My weekly half hour'], repeat: 'weekly', day: 0, time: '19:30', minutes: 30 }],
    [/^\/pursue-withdraw\.html$/, { title: ['Back to our talk'], repeat: 'once', inMinutes: 30, minutes: 30 }],
    [/^\/different-hours\.html$/, { title: ['Our week together'], repeat: 'weekly', day: 0, time: '18:00', minutes: 15 }]
  ];
  function remindFor(d) {
    if (d.kit && d.kit.remind) return d.kit.remind;
    var here = location.origin + location.pathname;
    if (d.url && d.url.split('#')[0].split('?')[0] !== here) return null;   // only for this page (or what it made)
    var r = null; REMIND.some(function (x) { if (x[0].test(path)) { r = x[1]; return true; } return false; });
    return r;
  }
  function remindStart(r) {
    var x = new Date(); x.setSeconds(0, 0);
    if (r.repeat === 'once' && r.inMinutes) { x = new Date(x.getTime() + r.inMinutes * 60000); x.setMinutes(Math.ceil(x.getMinutes() / 5) * 5); return x; }
    var hm = String(r.time || '19:30').split(':'); x.setHours(+hm[0], +hm[1]);
    if (r.day != null) { var add = (r.day - x.getDay() + 7) % 7; if (add === 0 && x < new Date()) add = 7; x.setDate(x.getDate() + add); }
    else if (x < new Date()) x.setDate(x.getDate() + 1);
    return x;
  }
  function dateVal(x) { return x.getFullYear() + '-' + pad(x.getMonth() + 1) + '-' + pad(x.getDate()); }
  function timeVal(x) { return pad(x.getHours()) + ':' + pad(x.getMinutes()); }

  // ---- the panels under the groups: one at a time ----
  function panelShow(name) {
    if (!kit) return;
    Array.prototype.forEach.call(kit.querySelectorAll('[data-panel]'), function (p) { p.hidden = p.getAttribute('data-panel') !== name; });
    Array.prototype.forEach.call(kit.querySelectorAll('[data-place][aria-expanded]'), function (b) {
      b.setAttribute('aria-expanded', String(!!name && panelOf(b.getAttribute('data-place')) === name));
    });
    var p = name && kit.querySelector('[data-panel="' + name + '"]');
    if (p) {
      var f = p.querySelector('input, select, button, a[href]');
      try { p.scrollIntoView({ block: 'nearest' }); } catch (e) {}
      if (f && name !== 'qr') f.focus({ preventScroll: true });
    }
  }
  function panelOf(id) { return { qr: 'qr', emailself: 'emailself', mastodon: 'mastodon', calendar: 'calendar' }[id] || ''; }
  function buildPanels(root) {
    var wrapP = mk('div', { class: 'tsk-panels' });
    // QR in the sheet
    var qr = mk('div', { class: 'tsk-panel tsk-qr', id: 'tsk-qr', 'data-panel': 'qr', hidden: '' });
    qr.appendChild(mk('div', { class: 'tsk-qr-box' }));
    qr.appendChild(mk('p', { class: 'tsk-qr-note' }));
    wrapP.appendChild(qr);
    // email it to myself: the address is typed (or filled in by the browser) and not kept
    var em = mk('div', { class: 'tsk-panel', 'data-panel': 'emailself', id: 'tsk-p-emailself', hidden: '' });
    em.appendChild(mk('label', { for: 'tsk-self-addr', class: 'tsk-lab' }, 'Your email address'));
    em.appendChild(mk('input', { id: 'tsk-self-addr', type: 'email', autocomplete: 'email', inputmode: 'email', class: 'tsk-in', placeholder: 'you@example.com' }));
    var emGo = mk('a', { class: 'tol-share-act tsk-go', 'data-go': 'emailself', 'aria-disabled': 'true' }, 'Open my email app');
    em.appendChild(emGo);
    em.appendChild(mk('p', { class: 'tsk-small' }, 'Your email app opens with the link in a message to you. The address isn’t kept here.'));
    wrapP.appendChild(em);
    // Mastodon: which server, asked once and remembered on this device
    var ma = mk('div', { class: 'tsk-panel', 'data-panel': 'mastodon', id: 'tsk-p-mastodon', hidden: '' });
    ma.appendChild(mk('label', { for: 'tsk-masto', class: 'tsk-lab' }, 'Your Mastodon server'));
    ma.appendChild(mk('input', { id: 'tsk-masto', type: 'text', autocomplete: 'off', autocapitalize: 'none', spellcheck: 'false', inputmode: 'url', class: 'tsk-in', placeholder: 'mastodon.social' }));
    var maGo = mk('a', { class: 'tol-share-act tsk-go', 'data-go': 'mastodon', target: '_blank', rel: 'noopener noreferrer', 'aria-disabled': 'true' }, 'Post on Mastodon');
    ma.appendChild(maGo);
    ma.appendChild(mk('p', { class: 'tsk-small' }, 'Remembered on this device, so you only type it once. '));
    var maForget = mk('button', { type: 'button', class: 'tsk-linkbtn', 'data-go': 'mastodon-forget' }, 'Forget my server');
    ma.lastChild.appendChild(maForget);
    wrapP.appendChild(ma);
    // a calendar reminder
    var ca = mk('div', { class: 'tsk-panel', 'data-panel': 'calendar', id: 'tsk-p-calendar', hidden: '' });
    var row = function (id, lab, el) { var r = mk('p', { class: 'tsk-field' }); r.appendChild(mk('label', { for: id, class: 'tsk-lab' }, lab)); r.appendChild(el); return r; };
    ca.appendChild(row('tsk-cal-t', 'What it says in your calendar', mk('input', { id: 'tsk-cal-t', type: 'text', maxlength: '60', class: 'tsk-in', autocomplete: 'off' })));
    var two = mk('div', { class: 'tsk-two' });
    two.appendChild(row('tsk-cal-d', 'Day', mk('input', { id: 'tsk-cal-d', type: 'date', class: 'tsk-in' })));
    two.appendChild(row('tsk-cal-h', 'Time', mk('input', { id: 'tsk-cal-h', type: 'time', step: '300', class: 'tsk-in' })));
    ca.appendChild(two);
    var rep = mk('select', { id: 'tsk-cal-r', class: 'tsk-in' });
    [['once', 'Just once'], ['daily', 'Every day'], ['weekly', 'Every week']].forEach(function (o) { var op = mk('option', { value: o[0] }, o[1]); rep.appendChild(op); });
    ca.appendChild(row('tsk-cal-r', 'Repeat', rep));
    var cacts = mk('div', { class: 'tsk-acts' });
    cacts.appendChild(mk('button', { type: 'button', class: 'tol-share-act tsk-go', 'data-go': 'ics' }, 'Download calendar file'));
    cacts.appendChild(mk('a', { class: 'tol-share-act tsk-go', 'data-go': 'gcal', target: '_blank', rel: 'noopener noreferrer' }, 'Google Calendar'));
    ca.appendChild(cacts);
    ca.appendChild(mk('p', { class: 'tsk-small' }, 'The file works with Apple Calendar, Outlook and most phones. The reminder lives in your calendar; nothing is kept here.'));
    wrapP.appendChild(ca);
    root.appendChild(wrapP);

    // keep the panel links up to date as people type
    var addr = em.querySelector('input');
    var syncEmail = function () { var h = cur ? emailSelfHref(cur, addr.value) : ''; if (h) { emGo.setAttribute('href', h); emGo.removeAttribute('aria-disabled'); } else { emGo.removeAttribute('href'); emGo.setAttribute('aria-disabled', 'true'); } };
    addr.addEventListener('input', syncEmail);
    var mIn = ma.querySelector('input');
    var syncMasto = function () {
      var h = mastodonHost(mIn.value), u = h && cur ? links(cur, { mastodon: h }).mastodon : '';
      if (u) { maGo.setAttribute('href', u); maGo.removeAttribute('aria-disabled'); } else { maGo.removeAttribute('href'); maGo.setAttribute('aria-disabled', 'true'); }
    };
    mIn.addEventListener('input', syncMasto);
    var calIn = ca.querySelectorAll('input, select');
    var syncCal = function () { var o = calData(); var g = ca.querySelector('[data-go="gcal"]'); if (o) g.setAttribute('href', googleCalHref(o)); else g.removeAttribute('href'); };
    Array.prototype.forEach.call(calIn, function (n) { n.addEventListener('input', syncCal); n.addEventListener('change', syncCal); });
    root._sync = { email: syncEmail, masto: syncMasto, cal: syncCal };

    wrapP.addEventListener('click', function (e) {
      var b = e.target.closest('[data-go]'); if (!b || !cur) return;
      var k = b.getAttribute('data-go');
      if (b.getAttribute('aria-disabled') === 'true') {
        e.preventDefault();
        status(k === 'emailself' ? 'Type your email address first.' : 'Type your server first, like mastodon.social.');
        return;
      }
      if (k === 'emailself') { fireShared(cur.url, 'email-self'); status('Your email app is opening.'); return; }
      if (k === 'mastodon') { var h = mastodonHost(mIn.value); if (h) lsSet(MASTO_KEY, h); fireShared(cur.url, 'mastodon'); return; }
      if (k === 'mastodon-forget') { lsSet(MASTO_KEY, null); mIn.value = ''; syncMasto(); status('Forgotten. The next time, you’ll be asked for your server again.'); return; }
      if (k === 'ics') {
        var o = calData(); if (!o) { status('Pick a day and a time first.'); return; }
        try {
          downloadBlob(new Blob([ics(o)], { type: 'text/calendar;charset=utf-8' }), slug(o.title) + '.ics');
          status('Calendar file saved. Open it to add the reminder to your calendar.');
          fireShared(cur.url, 'calendar');
        } catch (er) { status('Couldn’t make the file here. Try Google Calendar instead.'); }
        return;
      }
      if (k === 'gcal') { if (!b.getAttribute('href')) { e.preventDefault(); return; } fireShared(cur.url, 'calendar'); }
    });
  }
  function calData() {
    if (!kit) return null;
    var t = kit.querySelector('#tsk-cal-t').value.trim() || 'Reminder';
    var dv = kit.querySelector('#tsk-cal-d').value, hv = kit.querySelector('#tsk-cal-h').value, rp = kit.querySelector('#tsk-cal-r').value;
    var m = /^(\d{4})-(\d\d)-(\d\d)$/.exec(dv), h = /^(\d\d):(\d\d)/.exec(hv);
    if (!m || !h) return null;
    var start = new Date(+m[1], +m[2] - 1, +m[3], +h[1], +h[2], 0, 0);
    var r = (cur && remindFor(cur)) || {};
    var u = cur && cur.url && !isPrivate(cur) ? cur.url : location.origin + location.pathname;
    return { title: t, start: start, minutes: r.minutes || 15, repeat: rp, url: u, note: 'From ' + SITE_NAME + ': ' + u };
  }

  // ---- one place in a group ----
  function placeEl(p) {
    var id = p[0], kind = p[3], label = p[2], a;
    if (kind === 'link') a = mk('a', { class: 'tol-share-act tsk-place', 'data-place': id, target: '_blank', rel: 'noopener noreferrer' });
    else if (kind === 'copyopen') a = mk('a', { class: 'tol-share-act tsk-place', 'data-place': id, target: '_blank', rel: 'noopener noreferrer' });
    else a = mk('button', { type: 'button', class: 'tol-share-act tsk-place', 'data-place': id });
    if (panelOf(id)) { a.setAttribute('aria-expanded', 'false'); a.setAttribute('aria-controls', id === 'qr' ? 'tsk-qr' : 'tsk-p-' + id); }
    a.appendChild(svgIcon(id));
    a.appendChild(mk('span', { class: 'tsk-pl' }, label));
    return a;
  }
  function decorate(a, iconId) {
    if (!a || a.querySelector('.tsk-ic')) return;
    var t = a.textContent; a.textContent = '';
    a.appendChild(svgIcon(iconId)); a.appendChild(mk('span', { class: 'tsk-pl' }, t));
  }
  function groupEl(g) {
    var open = openGroups().indexOf(g[0]) !== -1;
    var box = mk('div', { class: 'tsk-group', 'data-group': g[0] });
    var h = mk('h3', { class: 'tsk-gh' });
    var b = mk('button', { type: 'button', class: 'tsk-gt', 'aria-expanded': String(open), 'aria-controls': 'tsk-g-' + g[0] });
    b.appendChild(mk('span', { class: 'tsk-gt-t' }, g[1]));
    b.appendChild(mk('span', { class: 'tsk-gt-i', 'aria-hidden': 'true' }));
    h.appendChild(b); box.appendChild(h);
    var grid = mk('div', { class: 'tsk-grid', id: 'tsk-g-' + g[0] }); grid.hidden = !open;
    box.appendChild(grid);
    b.addEventListener('click', function () {
      var now = grid.hidden; grid.hidden = !now; b.setAttribute('aria-expanded', String(now));
      var list = openGroups().filter(function (x) { return x !== g[0]; }); if (now) list.push(g[0]);
      lsSet(GROUPS_KEY, JSON.stringify(list));
    });
    return box;
  }

  function buildKit(box) {
    var card = box.querySelector('.tol-share-card') || box, before = box.querySelector('.tol-share-status');
    var root = mk('div', { class: 'tsk-kit' });
    var groups = mk('div', { class: 'tsk-groups' });
    var byGroup = {};
    GROUPS.forEach(function (g) { var ge = groupEl(g); byGroup[g[0]] = ge; groups.appendChild(ge); });
    root._groups = byGroup;
    var sections = mk('div', { class: 'tsk-xsecs tsk-xsecs-top' }), after = mk('div', { class: 'tsk-xsecs' });
    root.appendChild(sections); root.appendChild(groups); root.appendChild(after);
    root._top = sections; root._after = after;
    // site.js's own buttons move into their groups; the kit's places go beside them
    // (Pinterest is the kit's own: any public page with a picture, not only pages marked for it)
    var sitePin = box.querySelector('[data-act="pinterest"]'); if (sitePin) sitePin.remove();
    PLACES.forEach(function (p) {
      var grid = byGroup[p[1]].querySelector('.tsk-grid'), a;
      if (p[3] === 'site') { a = box.querySelector('[data-act="' + p[0] + '"]'); if (!a) return; a.classList.add('tsk-place'); a.setAttribute('data-place', p[0]); a.setAttribute('data-label', p[2]); }
      else a = placeEl(p);
      grid.appendChild(a);
    });
    buildPanels(root);
    card.insertBefore(root, before && before.parentNode === card ? before : null);

    // the device's own share menu goes first in the sheet, where the device has one
    var nat = mk('button', { type: 'button', class: 'tol-share-act tsk-native', 'data-kit': 'native' });
    nat.appendChild(svgIcon('native')); nat.appendChild(mk('span', { class: 'tsk-pl' }, 'More apps on this device'));
    nat.addEventListener('click', function () {
      var d = cur, done = ctl; if (!d) return;
      try {
        Promise.resolve(navigator.share(nativeData(d))).then(function () {
          fireShared(d.url, 'native'); closeSheet(done);
        }, function () {});
      } catch (er) {}
    });
    var main = box.querySelector('.tol-share-acts');
    if (main) { main.classList.add('tsk-quick'); main.insertBefore(nat, main.firstChild); } else root.insertBefore(nat, root.firstChild);
    root._native = nat;

    root.addEventListener('click', function (e) {
      var b = e.target.closest('[data-place]'); if (!b || !cur || !root.contains(b)) return;
      if (b.hasAttribute('data-act')) return;   // site.js's own buttons look after themselves
      var id = b.getAttribute('data-place'), d = cur;
      if (b._tskRun) { e.preventDefault(); try { b._tskRun(d, api(d)); } catch (er) {} return; }
      if (b._tskHref) { fireShared(d.url, id); return; }
      var p = null; PLACES.some(function (x) { if (x[0] === id) { p = x; return true; } return false; });
      if (!p) return;
      var kind = p[3];
      if (kind === 'link') {
        fireShared(d.url, id);
        if (id === 'messenger' && /^fb-messenger:/.test(b.getAttribute('href') || '')) laterHint('Messenger didn’t open? Try Copy link and paste it into Messenger.');
        else if (id === 'messenger') status('This opens Facebook. Choose “Send in Messenger” there.');
        if (id === 'viber') laterHint('Viber didn’t open? It needs the Viber app. Try Signal’s way: Copy message, then paste it in Viber.');
        return;
      }
      if (kind === 'copyopen') {
        var app = { slack: 'Slack', teams: 'Microsoft Teams', discord: 'Discord' }[id];
        copyText(formatted(d, id)).then(function (ok) {
          status(ok ? ('Message copied for ' + app + '. Paste it into a chat there.') : 'Couldn’t copy here. Use Copy link instead.');
          if (ok) fireShared(d.url, id);
        });
        return;   // the link opens the app in a new tab
      }
      if (kind === 'copy') {   // Signal: no share link of its own
        copyText(message(d)).then(function (ok) {
          status(ok ? 'Message copied. Open Signal, pick a chat, and paste it.' : 'Couldn’t copy here. Use Copy link instead.');
          if (ok) fireShared(d.url, id);
        });
        return;
      }
      if (kind === 'qr' || kind === 'device') {
        var u = d.url || d.text;
        if (id === 'wechat') showQR(u, { title: 'Scan this in WeChat', note: 'Open WeChat, tap +, then Scan. The link opens in WeChat, ready to send to a chat.' });
        else showQR(u, { title: 'Open it on your other device', note: 'Point your other phone’s or tablet’s camera at this code. The link opens there.' });
        return;
      }
      if (kind === 'qr-inline') {
        var qrBox = root.querySelector('.tsk-qr');
        if (!qrBox.querySelector('svg')) { if (b._qrText) showQR(b._qrText); return; }   // a long link: the big code, over the sheet
        var show = qrBox.hidden;
        panelShow(show ? 'qr' : '');
        if (show) fireShared(d.url, 'qr');
        return;
      }
      if (kind === 'panel' || kind === 'mastodon') {
        var pn = panelOf(id), open = root.querySelector('[data-panel="' + pn + '"]').hidden;
        panelShow(open ? pn : '');
        if (open && id === 'calendar') root._sync.cal();
        return;
      }
      if (kind === 'image' || kind === 'story') {
        var fmt = kind === 'story' || id === 'story' ? 'story' : 'square', orig = b.querySelector('.tsk-pl').textContent;
        var words = imageWords(d);
        var o = { text: d.result ? words : (d.text || d.title), title: d.result || d.text ? d.title : '', url: d.url, result: d.result, private: d.private, format: fmt, qr: !isPrivate(d) && !!d.url };
        var hint = {
          instagram: 'Picture saved. Open Instagram, start a story, and pick the picture from your photos. You can add the link with a link sticker.',
          tiktok: 'Picture saved. Open TikTok, tap +, then Upload, and pick the picture.',
          snapchat: 'Picture saved and link copied. In Snapchat, add the picture from your camera roll, then paste the link with the paperclip.'
        }[id];
        var go = function () {
          saveImage(o).then(function () {
            b.querySelector('.tsk-pl').textContent = 'Saved!';
            status(hint || 'Picture saved to your downloads. It stays on your device until you share it.');
            fireShared(d.url, id === 'square' || id === 'story' ? 'image' : id);
            clearTimeout(b._t); b._t = setTimeout(function () { b.querySelector('.tsk-pl').textContent = orig; }, 2000);
          }, function () { status('Couldn’t make the picture here. Try “Copy link” instead.'); });
        };
        if (id === 'snapchat' && d.url) copyText(d.url).then(go, go); else go();
        if (id === 'snapchat' && !imageOk(d, 'story')) status('Link copied. Open Snapchat and paste it with the paperclip.');
      }
    });
    return root;
  }
  // a hint shown only when the app didn't open (the page stays in front)
  function laterHint(t) {
    var t0 = Date.now();
    setTimeout(function () { if (!document.hidden && Date.now() - t0 < 4000) status(t); }, 1600);
  }

  // ---- other scripts' actions and sections ----
  function actionEl(a) {
    var tag = a.href ? 'a' : 'button';
    var el2 = mk(tag, tag === 'a' ? { class: 'tol-share-act tsk-place', 'data-place': 'x-' + a.id, target: '_blank', rel: 'noopener noreferrer' } : { type: 'button', class: 'tol-share-act tsk-place', 'data-place': 'x-' + a.id });
    var ic = a.icon ? customIcon(a.icon) : null;
    el2.appendChild(ic || svgIcon(a.group === 'together' ? 'together' : 'dot'));
    el2.appendChild(mk('span', { class: 'tsk-pl' }, (a.label || a.id)));
    if (a.run) el2._tskRun = a.run;
    if (a.href) el2._tskHref = a.href;
    return el2;
  }
  function placeExtras(d) {
    if (!kit) return;
    EXTRA_ACTIONS.forEach(function (a) {
      if (!a._el || !kit.contains(a._el)) {
        a._el = actionEl(a);
        var g = kit._groups[a.group] || kit._groups.other;
        g.querySelector('.tsk-grid').appendChild(a._el);
      }
      var show = (!isPrivate(d) || a.private) && (!a.when || safe(function () { return a.when(d); }));
      var h = '';
      if (show && a.href) { h = safe(function () { return a.href(d); }) || ''; if (!/^(https?:|mailto:|sms:)/i.test(h)) h = ''; if (!h) show = false; }
      a._el.hidden = !show;
      if (h) a._el.setAttribute('href', h); else a._el.removeAttribute('href');
    });
    EXTRA_SECTIONS.forEach(function (s) {
      if (!s._el || !kit.contains(s._el)) {
        s._el = mk('section', { class: 'tsk-xsec', 'data-section': s.id, 'aria-labelledby': 'tsk-x-' + s.id });
        s._el.appendChild(mk('h3', { class: 'tsk-xh', id: 'tsk-x-' + s.id }, (s.title || '')));
        s._el.appendChild(mk('div', { class: 'tsk-xbody' }));
        var host = (s.order || 0) < 0 ? kit._top : kit._after;
        // keep them in order
        var sib = Array.prototype.filter.call(host.children, function (n) { var o2 = n._tskOrder || 0; return o2 > (s.order || 0); })[0];
        s._el._tskOrder = s.order || 0;
        host.insertBefore(s._el, sib || null);
      }
      var show2 = !s.when || safe(function () { return s.when(d); });
      s._el.hidden = !show2;
      var body = s._el.querySelector('.tsk-xbody');
      if (show2 && s.build) { body.textContent = ''; safe(function () { s.build(body, d, api(d)); }); }
    });
  }
  function safe(f) { try { return f(); } catch (e) { return undefined; } }
  function addAction(a) {
    if (!a || !a.id) return function () {};
    removeById(EXTRA_ACTIONS, a.id);
    EXTRA_ACTIONS.push(a);
    if (kit && cur && ctl && !ctl.box.hidden) placeExtras(cur);
    return function () { removeById(EXTRA_ACTIONS, a.id); };
  }
  function addSection(s) {
    if (!s || !s.id) return function () {};
    removeById(EXTRA_SECTIONS, s.id);
    EXTRA_SECTIONS.push(s);
    if (kit && cur && ctl && !ctl.box.hidden) placeExtras(cur);
    return function () { removeById(EXTRA_SECTIONS, s.id); };
  }
  function removeById(list, id) {
    for (var i = list.length - 1; i >= 0; i--) if (list[i].id === id) { if (list[i]._el) list[i]._el.remove(); list.splice(i, 1); }
  }

  function onSheet(e) {
    var det = e && e.detail; if (!det || !det.box || !det.data) return;
    ctl = det; cur = det.data;
    if (!kit || !det.box.contains(kit)) kit = buildKit(det.box);
    var d = cur, box = det.box;
    var heading = pendingHeading || (d.kit && d.kit.heading) || '';
    if (heading) { var hh = box.querySelector('#tol-share-h'); if (hh) hh.textContent = heading; }
    pendingHeading = '';
    var priv = isPrivate(d) || box.hasAttribute('data-private');
    var masto = mastodonHost(lsGet(MASTO_KEY));
    var qrText = d.url || (d.text && d.text.length <= 180 ? d.text : '');
    var env = curEnv = { mobile: isMobile(), mastodon: masto, image: ogImage(), remind: !!remindFor(d), qr: !!qrText && qrFits(qrText) };
    var L = links(d, env);
    // each open starts tidy
    panelShow('');
    kit._native.hidden = !canNative(d);
    // site.js's buttons: icons, and labels in the page's language
    PLACES.forEach(function (p) {
      if (p[3] !== 'site') return;
      var a = box.querySelector('[data-act="' + p[0] + '"]'); if (!a) return;
      if (!a.querySelector('.tsk-ic')) { a.textContent = p[2]; decorate(a, p[0]); }
    });
    var cp = box.querySelector('[data-act="copy"]'), ct = box.querySelector('[data-act="copy-text"]');
    if (cp && !cp.querySelector('.tsk-ic')) { cp.textContent = 'Copy link'; decorate(cp, 'copy'); cp.setAttribute('data-label', cp.textContent); }
    if (ct && !ct.querySelector('.tsk-ic')) { ct.textContent = 'Copy message'; decorate(ct, 'copytext'); ct.setAttribute('data-label', ct.textContent); }
    // the kit's places
    PLACES.forEach(function (p) {
      if (p[3] === 'site') return;
      var a = kit.querySelector('[data-place="' + p[0] + '"]'); if (!a) return;
      var show = !(priv && !p[4]) && placeShows(p[0], d, env);
      var lbl = a.querySelector('.tsk-pl'); if (lbl) lbl.textContent = p[2];
      if (p[3] === 'link' || p[3] === 'copyopen') {
        if (L[p[0]]) a.setAttribute('href', L[p[0]]); else a.removeAttribute('href');
      }
      a.hidden = !show;
    });
    // the QR code in the sheet holds the link (or, with no link, short words)
    var qrBox = kit.querySelector('.tsk-qr-box'), qb = kit.querySelector('[data-place="qr"]');
    qrBox.textContent = '';
    var s = qrText && qrBytes(qrText) <= 213 ? QR.svg(qrText) : null;
    qb._qrText = qrFits(qrText) ? qrText : '';
    if (qb._qrText && !s) qb.removeAttribute('aria-controls'); else qb.setAttribute('aria-controls', 'tsk-qr');
    if (s) {
      s.setAttribute('aria-label', d.url ? 'QR code for the link' : 'QR code for these words');
      qrBox.appendChild(s);
      kit.querySelector('.tsk-qr-note').textContent = d.url ? 'Scan it with another phone’s camera to open the link. It holds the link and nothing else.' : 'Scan it with another phone’s camera to read the words.';
    }
    // the panels: start from what's known
    kit._sync.email();
    var mIn = kit.querySelector('#tsk-masto'); if (!mIn.value && masto) mIn.value = masto; kit._sync.masto();
    var r = remindFor(d);
    if (r) {
      var st = remindStart(r);
      kit.querySelector('#tsk-cal-t').value = Array.isArray(r.title) ? r.title[0] : (r.title || 'Reminder');
      kit.querySelector('#tsk-cal-d').value = dateVal(st); kit.querySelector('#tsk-cal-h').value = timeVal(st);
      kit.querySelector('#tsk-cal-r').value = r.repeat || 'once';
    }
    placeExtras(d);
    // a group shows when something in it shows
    Array.prototype.forEach.call(kit.querySelectorAll('.tsk-group'), function (g) {
      g.hidden = !g.querySelector('.tsk-grid > :not([hidden])');
    });
    // the print button: "Print or save as PDF"
    var pr = box.querySelector('[data-act="print"]'); if (pr) pr.setAttribute('data-label', 'Print or save as PDF');
  }
  // site.js announces each opening with a 'tol-share-sheet' event ({ data, box, close }).
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
    return { title: title, text: text, url: url, result: shown('.tol-share-preview') || shown('[data-act="copy-text"]') || (!!h && /^(Share what you made|Comparte lo que hiciste)$/.test(h.textContent)), private: box.hasAttribute('data-private') };
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
    var d = { title: o.title || '', text: o.text || '', url: o.url, result: o.result !== false, kit: o.kit };
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
  // Share buttons on the pages: content pages, book chapters, tool results, tool cards, Puddles
  // =====================================================================================
  var GAME = /^\/(word-bloom|quiet-crossword|daily-ledger-crossword|quiet-words|frequency-journey(-play)?|night-garden|bears-dojo|recheck-drive|echoes-of-gold|pal-cam-tv|garden-backdrop|pause-and-play|keepsakes|calm-visualizer|soundscapes|heartprint|pawprint|frequency-buddies[\w-]*)\.html$/;
  var NOT_CONTENT = /^\/(404|offline|safety|on-this-device|privacy-policy|terms-of-service|refund-policy|membership|dashboard|telemetry|sent-this|someone-sent-you-this|upset-right-now|surprise|index)\.html$|^\/(legal|workpapers\/fill|store|supabase|infrastructure|notes|samples|manuscript|shots)\//;
  function noShare() { return document.body.hasAttribute('data-no-share') || document.body.classList.contains('is-game'); }
  function noindex() { var m = document.querySelector('meta[name="robots"]'); return !!m && /noindex/i.test(m.getAttribute('content') || ''); }
  function pageTitle() {
    var h = document.querySelector('main h1, [role="main"] h1');
    var t = h ? h.textContent.replace(/\s+/g, ' ').trim() : '';
    return t || (document.title || '').replace(/\s*[|·–-]\s*Spread Love.*$/i, '').trim();
  }
  function pageLine() {
    var m = document.querySelector('meta[name="description"]'), t = m ? (m.getAttribute('content') || '').trim() : '';
    if (t.length > 220) t = t.slice(0, 217).replace(/\s+\S*$/, '') + '…';
    return t;
  }
  function shareBtn(label, o, cls) {
    if (window.TOLShare && window.TOLShare.button) return window.TOLShare.button(label, o, cls);
    return null;
  }
  // the book: chapters share themselves, and "Share the book" sits beside
  var BOOK_CH = /^\/book\/(preface|chapter-\d+|self-\d-[a-z]+|understanding-\d+-[a-z-]+|afterword|for-yourself|together|understanding|whole|topic-[a-z-]+)(-in-depth)?\.html$/;
  function bookButton() {
    return shareBtn('Share the book', {
      title: 'Spread Love & Acceptance: the free book',
      text: 'A free, kind book about yourself, the people you share a life with, and how people work. Read it online or as free PDFs.',
      url: '/book/index.html', pin: true
    });
  }
  function placePage() {
    var main = document.querySelector('main') || document.querySelector('[role="main"]');
    if (!main || noShare() || GAME.test(path) || noindex()) return;
    var h1 = main.querySelector('h1');
    var content = !!h1 && !NOT_CONTENT.test(path);
    var title = pageTitle(), line = pageLine();
    var isDownload = path === '/book/download.html';
    var opts = function () {
      return isDownload
        ? { title: 'Spread Love & Acceptance: the free book', text: 'The whole book, free, as PDFs. No account.', url: '/book/download.html', pin: true }
        : { title: title, text: line, pin: true };
    };
    // 1. a small Share button under the title
    if (content && !main.querySelector('.tsk-top-row')) {
      var top = shareBtn(isDownload ? 'Share the book' : 'Share', opts, 'is-small tsk-top-btn');
      if (top) {
        top.setAttribute('aria-label', isDownload ? 'Share the book' : 'Share this page');
        top.setAttribute('data-no-clip', '');
        var tr = mk('p', { class: 'tsk-top-row tol-plain no-bubble' }); tr.appendChild(top);
        var head = h1.closest('header');
        var after = head && main.contains(head) ? head : h1;
        // a title inside a side-by-side layout: the button goes after the whole row
        try { var pd = getComputedStyle(after.parentNode); if (after === h1 && /flex|grid/.test(pd.display) && !/column/.test(pd.flexDirection)) after = after.parentNode; } catch (e) {}
        if (after === main || !main.contains(after)) main.insertBefore(tr, main.firstChild); else after.after(tr);
      }
    }
    // 2. a "Share this page" row at the end, unless site.js already put one there
    var row = main.querySelector('.tol-share-row:not(.is-inline)'), home = path === '/index.html';
    if (!row && (content || home) && path !== '/about.html') {
      var b = shareBtn(isDownload ? 'Share the book' : home ? 'Share this site' : 'Share this page',
        home ? { title: SITE_NAME, text: line || 'Free, kind tools for sharing the load at home.', url: '/index.html', pin: true } : opts);
      if (b) {
        row = mk('div', { class: 'tol-share-row tsk-end-row tol-plain no-bubble' });
        row.appendChild(b);
        if (!main.querySelector('main [data-print], .tol-print-btn') && !isDownload && !home) {
          var pb = mk('button', { type: 'button', class: 'tol-print-btn' }, 'Print this page');
          pb.addEventListener('click', function () { window.print(); });
          row.appendChild(pb);
        }
        var tip = main.querySelector(':scope > .tol-tip');
        if (tip) main.insertBefore(row, tip); else main.appendChild(row);
      }
    }
    // 3. book chapters: "Share the book" beside "Share this chapter"
    if (row && BOOK_CH.test(path) && !row.querySelector('.tsk-book-btn')) {
      var bb = bookButton(); if (bb) { bb.classList.add('tsk-book-btn'); var first = row.querySelector('.tol-share-btn'); if (first) first.after(bb); else row.insertBefore(bb, row.firstChild); }
    }
  }

  // ---- tool results: "Share this result" on result cards with no share button of their own ----
  // [page, the result box, what the result is called, { from: an element inside whose text or value is the result }]
  var RESULTS = [
    [/^\/refusals\.html$/, '#rf-out', ['Ways to say no kindly']],
    [/^\/carrier-wave-decoder\.html$/, '#result', ['Where our talk went sideways']],
    [/^\/love-languages\.html$/, '#ll-out', ['What feels like care to me'], { from: 'textarea' }],
    [/^\/touchstones\.html$/, '#ts-out', ['Our shared words and rituals'], { from: 'textarea' }],
    [/^\/tools\/frequency-calibration\.html$/, '#results', ['Our daily rhythms']],
    [/^\/tools\/soften-a-tense-moment\.html$/, '#pick-out', ['A way to soften a tense moment']],
    [/^\/family-rifts\.html$/, '#ft-out', ['My terms for the family event']],
    [/^\/small-wins\.html$/, '#sw-flip-out', ['A request, not a complaint']],
    [/^\/surprise\.html$/, '#su-out', ['A little surprise']],
    [/^\/signal-translator\.html$/, '#results', ['How my message might land']]
  ];
  var SHAREISH = /\b(share|send|compartir|enviar)\b/i;
  function hasOwnShare(box) {
    if (box.querySelector('[data-share]:not(.tsk-res-btn), .tol-share-btn:not(.tsk-res-btn)')) return true;
    return Array.prototype.some.call(box.querySelectorAll('button, a'), function (b) { return !b.classList.contains('tsk-res-btn') && SHAREISH.test(b.textContent || ''); });
  }
  function visible(n) { return !!n && !n.hidden && !n.closest('[hidden]') && n.getClientRects().length > 0; }
  function resultText(box, cfg) {
    if (cfg.from === 'self') return (box.value || box.textContent || '').trim();
    if (cfg.from) { var f = box.querySelector(cfg.from); if (f) return ('value' in f ? f.value : f.textContent || '').trim(); }
    var t = (box.innerText || box.textContent || '');
    // leave out the buttons' own words
    Array.prototype.forEach.call(box.querySelectorAll('button, .tsk-res-row, [aria-hidden="true"]'), function (b) {
      var bt = (b.innerText || b.textContent || '').trim(); if (bt) t = t.split(bt).join('');
    });
    return t.replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
  }
  function watchResult(rule) {
    var box = document.querySelector(rule[1]); if (!box) return;
    var cfg = rule[3] || {}, name = rule[2][0];
    var first = (box.textContent || '').trim();
    var host = /^(P|OUTPUT|TEXTAREA|INPUT|SPAN)$/.test(box.tagName) ? null : box;   // where the button can sit inside
    var rowEl = null;
    function ensure() {
      var txt = resultText(box, cfg);
      var showIt = visible(cfg.show ? document.querySelector(cfg.show) : box) || (cfg.from === 'self' && !!txt);
      var ok = !!txt && txt !== first && (cfg.from === 'self' || showIt) && !(host && hasOwnShare(host));
      if (cfg.from === 'self') ok = !!txt;
      if (!ok) { if (rowEl) rowEl.hidden = true; return; }
      if (!rowEl || !document.contains(rowEl)) {
        rowEl = mk('p', { class: 'tsk-res-row tol-plain no-bubble' });
        var b = shareBtn('Share this result', function () {
          var t = resultText(box, cfg);
          if (t.length > 3000) t = t.slice(0, 2997) + '…';
          pendingHeading = 'Share your result';
          return { title: name, text: t, url: location.pathname, result: true };
        }, 'is-small tsk-res-btn');
        if (!b) return;
        b.setAttribute('data-no-clip', '');
        rowEl.appendChild(b);
        if (host && cfg.from !== 'self') host.appendChild(rowEl); else box.after(rowEl);
      }
      rowEl.hidden = false;
    }
    var pending = false;
    var mo = new MutationObserver(function (list) {
      if (list.every(function (m) { return rowEl && (rowEl === m.target || rowEl.contains(m.target)); })) return;
      if (pending) return; pending = true;
      setTimeout(function () { pending = false; ensure(); }, 60);
    });
    mo.observe(box, { attributes: true, attributeFilter: ['hidden', 'class'], childList: true, subtree: true, characterData: true });
    var sec = box.parentNode; if (sec && sec !== document.body) mo.observe(sec, { attributes: true, attributeFilter: ['hidden'] });
    if (cfg.from === 'self') box.addEventListener('input', ensure);
    ensure();
  }
  function placeResults() {
    if (noShare()) return;
    RESULTS.forEach(function (r) { if (r[0].test(path)) try { watchResult(r); } catch (e) {} });
  }

  // ---- /tools.html: a small share button on each tool card ----
  function placeToolCards() {
    if (path !== '/tools.html') return;
    var list = document.querySelector('[data-tl-list]'); if (!list) return;
    var add = function () {
      Array.prototype.forEach.call(list.querySelectorAll('.tl-grid > li'), function (li) {
        if (li.querySelector('.tsk-card-share')) return;
        var a = li.querySelector('a.tl-card'); if (!a) return;
        var name = ((a.querySelector('.tl-name') || {}).textContent || '').trim(), does = ((a.querySelector('.tl-does') || {}).textContent || '').trim();
        var b = mk('button', { type: 'button', class: 'tsk-card-share', 'data-share': '', 'data-share-title': name, 'data-share-text': does + ' ' + 'Free, no account.', 'data-share-url': a.getAttribute('href') || '', 'data-share-pin': '', 'aria-label': 'Share this tool: ' + name, title: 'Share this tool' });
        b.appendChild(svgIcon('share', 'tsk-ic-plain'));
        li.classList.add('tsk-cardhost'); li.appendChild(b);
      });
    };
    add();
    new MutationObserver(function () { add(); }).observe(list, { childList: true });
  }

  // ---- Professor Puddles: "Share this answer" (the answer only, never the question) ----
  var SAFETY_WORDS = /\b(safety|safe|unsafe|helpline|hotline|emergency|crisis|abuse|abusive|violence|violent|hurt you|hurting you|hit you|control(ling)?|coercive|suicid\w*|self-harm|police|911|999|112|988)\b/i;
  function puddlesAnswer(msg) {
    if (msg.querySelector('.tsk-ans') || msg.querySelector('.tolc-info')) return;
    var prev = msg.previousElementSibling;
    while (prev && !/\btolc-(me|ctx)\b/.test(prev.className)) { if (/\btolc-bot\b/.test(prev.className)) { prev = null; break; } prev = prev.previousElementSibling; }
    if (!prev) return;   // the greeting
    var parts = [], url = '';
    Array.prototype.forEach.call(msg.querySelectorAll('p:not(.tolc-src):not(.tolc-fine), h3, li, .tolc-script p'), function (n) {
      if (n.closest('.tolc-links') || n.closest('.tolc-arts')) return;
      var t = (n.textContent || '').replace(/\s+/g, ' ').trim(); if (t && parts.indexOf(t) === -1) parts.push(t);
    });
    var more = msg.querySelector('a.tolc-more[href^="/"]'); if (more) url = more.getAttribute('href');
    var text = parts.join('\n');
    if (!text || text.length < 40) return;
    if (SAFETY_WORDS.test(text) || msg.querySelector('a[href*="safety"]')) return;
    var who = ((msg.querySelector('.tolc-sr') || {}).textContent || '').replace(/\s*says:\s*$/i, '').trim() || 'Professor Puddles';
    var b = mk('button', { type: 'button', class: 'tsk-ans' });
    b.appendChild(svgIcon('share', 'tsk-ic-plain')); b.appendChild(mk('span', null, 'Share this answer'));
    b.addEventListener('click', function () {
      var t = text.length > 1500 ? text.slice(0, 1497) + '…' : text;
      shareText({ title: 'An answer from ' + who, text: t, url: url || false, heading: 'Share this answer' });
    });
    msg.appendChild(b);
  }
  function watchPuddles() {
    if (GAME.test(path)) return;
    var scanAll = function (root) { Array.prototype.forEach.call((root || document).querySelectorAll('.tolc-msg.tolc-bot'), puddlesAnswer); };
    var t = null;
    new MutationObserver(function (list) {
      var hit = list.some(function (m) { return Array.prototype.some.call(m.addedNodes, function (n) { return n.nodeType === 1 && (n.classList.contains('tolc-msg') || (n.querySelector && n.querySelector('.tolc-msg'))); }); });
      if (!hit) return;
      clearTimeout(t); t = setTimeout(function () { scanAll(); }, 80);
    }).observe(document.body, { childList: true, subtree: true });
    scanAll();
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
  // owner17: inside the installed app (no address bar, no browser Share menu) app-bar.js puts a Share button in the bar
  // and "Share this page" in the menu. site.js loads app-bar.js in a browser tab only, so the kit brings it in the app.
  function appShare() {
    var app = false; try { app = (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true; } catch (e) {}
    var top = true; try { top = window.self === window.top; } catch (e) { top = false; }
    if (!app || !top || window.TOLAppBar || document.querySelector('script[src="/assets/js/app-bar.js"]')) return;   // already there (its own mount adds Share)
    var s = document.createElement('script'); s.src = '/assets/js/app-bar.js'; s.async = true;
    document.head.appendChild(s);
  }
  function start() {
    try { appShare(); } catch (e) {}
    try { startWatch(); } catch (e) {}
    cssReady.then(function (good) {
      if (good === false) return;
      [scan, placePage, placeResults, placeToolCards, watchPuddles].forEach(function (f) { try { f(); } catch (e) {} });
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();

  window.TOLShareKit = {
    version: 2,
    sheetFirst: true,   // site.js: open this sheet (with "More apps on this device") instead of jumping straight to the device menu
    shareText: shareText,
    links: function (d, env) { return links(d || {}, env || { mobile: isMobile(), mastodon: mastodonHost(lsGet(MASTO_KEY)), image: ogImage() }); },
    formatted: formatted,
    qr: QR,
    showQR: showQR,
    closeQR: closeQR,
    qrFits: qrFits,
    saveImage: saveImage,
    drawCard: drawCard,
    ics: ics,
    scan: scan,
    addAction: addAction,
    addSection: addSection
  };
  try { document.dispatchEvent(new CustomEvent('tol-share-kit-ready')); } catch (e) {}
})();
