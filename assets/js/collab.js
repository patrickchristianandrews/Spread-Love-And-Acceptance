/* collab.js — "Work on this together": one way for two or more people to fill in the same tool, each on
   their own phone, by passing a link (or a QR code, a text message, an email, a code) back and forth.

   Nothing is stored anywhere but each person's own device. The answers travel inside the link, after the
   "#together=" (the part of an address a browser never sends to any website), so they never reach a server.
   Anyone who has the link can read what is in it: every place that sends one says so.

   The link
     https://spreadloveandacceptance.com/<page>#together=1.<data>
     <data> is the envelope below as JSON, squeezed with deflate (raw) and written in base64url. "1." is the
     format's version. It is squeezed with the browser's CompressionStream where there is one, and with the
     small deflater here otherwise (the same format either way). It is always read with the small inflater
     here, which stops at 256 KB, so a hostile link can't flood the page.
     The same data as a code, for a link too long to text or scan: "TOL-TOGETHER:1.<data>".

   The envelope (short keys, so links stay short)
     { v:1,                      the version
       t:'checkin',              the tool it belongs to
       r:'k3f9a2',               a short random id for this back-and-forth (a reply keeps it)
       f:'p8x2m4q1',             who sent this link (a person id below)
       at:1760000000,            when (seconds), the newest part
       p:{ 'p8x2m4q1': { n:'Alex', at:1760000000, d:{ ...Alex's answers... } }, ... },   one part per person
       x:{ ... } }               optional: a tool that keeps its own shared data (its own merge rules)
     Each person writes only their own part, so answers never overwrite each other. Opening a link merges
     it person by person: the latest part from each person wins, and an older link opened after a newer one
     changes nothing (it says so). Works the same for three or more people.

   Everything read from a link is cleaned first (only plain text, numbers, true/false, lists and objects;
   limits on size and depth; no "__proto__"), and every word is put on the page as text, never as HTML.

   Kept on this device (listed on /on-this-device.html)
     localStorage 'tol-collab-me'    { id, name }: a random id and the name you typed, so the next link you
                                     open knows which part is yours. Written the first time you send or open one.
     localStorage 'tol-collab-kept'  only if you tick "Keep on this device": what the others sent, per tool,
                                     so next time you can see what changed. "Clear what you received" removes it.
     sessionStorage 'tol-collab-tab' this tab only: the parts you've received, so a reload doesn't lose them.

   For other scripts: window.TOLCollab
     pack(obj) → Promise<string>, packSync(obj) → string, unpack(str) → Promise<obj>, unpackSync(str) → obj
     envelope({ tool, name, d, x, r }) → env (with your part)      merge(base, incoming) → { env, changes, older }
     link(env, page) → url        code(env) → 'TOL-TOGETHER:1.…'    read(textOrHash) → env or null
     wrap(tool, x, { page, name, r }) → url (a tool's own data inside a #together= link)
     isLong(url) → true past ~1,800 characters (too long for a QR code or a text message)
     sendBlock(opts) → element, sendSheet(opts): the "Send by" buttons (QR code, Text message, Email,
       WhatsApp or another app, Copy link, Copy as a code), with the privacy line
     attach(opts) → controller: the whole "Work on this together" panel for a tool (see attach below)
*/
(function (root) {
  'use strict';
  var W = typeof window !== 'undefined' ? window : null;
  var D = typeof document !== 'undefined' ? document : null;
  if (W && W.TOLCollab) return;

  var VERSION = 1, HASH = '#together=', CODE = 'TOL-TOGETHER:', LONG = 1800, SITE = 'https://spreadloveandacceptance.com';
  var MAX_PACKED = 60000, MAX_RAW = 262144, MAX_PEOPLE = 12;
  var ID_RE = /^[a-z0-9]{4,16}$/, TOOL_RE = /^[a-z0-9][a-z0-9-]{0,31}$/;
  var ME_KEY = 'tol-collab-me', KEPT_KEY = 'tol-collab-kept', TAB_KEY = 'tol-collab-tab';

  // ============================================================== words (English or Spanish)
  function esPage() { try { if (W && W.TOLLang && W.TOLLang.es) return !!W.TOLLang.es(); } catch (e) {} return !!D && /^es\b/i.test(D.documentElement.lang || ''); }
  function T(en, es) { return esPage() && es ? es : en; }

  // ============================================================== bytes
  function utf8(s) {
    s = String(s);
    if (typeof TextEncoder === 'function') return new TextEncoder().encode(s);
    var e = unescape(encodeURIComponent(s)), a = new Uint8Array(e.length);
    for (var i = 0; i < e.length; i++) a[i] = e.charCodeAt(i);
    return a;
  }
  function unutf8(b) {
    if (typeof TextDecoder === 'function') return new TextDecoder('utf-8', { fatal: true }).decode(b);
    var s = ''; for (var i = 0; i < b.length; i++) s += String.fromCharCode(b[i]);
    return decodeURIComponent(escape(s));
  }
  var B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_', B64I = {};
  for (var bi = 0; bi < 64; bi++) B64I[B64.charAt(bi)] = bi;
  B64I['+'] = 62; B64I['/'] = 63;
  function b64e(b) {
    var out = '', i = 0, n = b.length, v;
    for (; i + 2 < n; i += 3) { v = (b[i] << 16) | (b[i + 1] << 8) | b[i + 2]; out += B64.charAt(v >> 18 & 63) + B64.charAt(v >> 12 & 63) + B64.charAt(v >> 6 & 63) + B64.charAt(v & 63); }
    if (n - i === 1) { v = b[i] << 16; out += B64.charAt(v >> 18 & 63) + B64.charAt(v >> 12 & 63); }
    else if (n - i === 2) { v = (b[i] << 16) | (b[i + 1] << 8); out += B64.charAt(v >> 18 & 63) + B64.charAt(v >> 12 & 63) + B64.charAt(v >> 6 & 63); }
    return out;
  }
  function b64d(s) {
    s = String(s).replace(/=+$/, '');
    if (!/^[A-Za-z0-9_\-+\/]*$/.test(s) || s.length % 4 === 1) throw new Error('bad base64');
    var n = Math.floor(s.length * 3 / 4), out = new Uint8Array(n), o = 0, i = 0, v;
    for (; i + 3 < s.length; i += 4) {
      v = (B64I[s.charAt(i)] << 18) | (B64I[s.charAt(i + 1)] << 12) | (B64I[s.charAt(i + 2)] << 6) | B64I[s.charAt(i + 3)];
      out[o++] = v >> 16 & 255; out[o++] = v >> 8 & 255; out[o++] = v & 255;
    }
    var rest = s.length - i;
    if (rest === 2) { v = (B64I[s.charAt(i)] << 18) | (B64I[s.charAt(i + 1)] << 12); out[o++] = v >> 16 & 255; }
    else if (rest === 3) { v = (B64I[s.charAt(i)] << 18) | (B64I[s.charAt(i + 1)] << 12) | (B64I[s.charAt(i + 2)] << 6); out[o++] = v >> 16 & 255; out[o++] = v >> 8 & 255; }
    return out.subarray(0, o);
  }

  // ============================================================== deflate (raw, RFC 1951)
  var LBASE = [3, 4, 5, 6, 7, 8, 9, 10, 11, 13, 15, 17, 19, 23, 27, 31, 35, 43, 51, 59, 67, 83, 99, 115, 131, 163, 195, 227, 258];
  var LEXT = [0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5, 0];
  var DBASE = [1, 2, 3, 4, 5, 7, 9, 13, 17, 25, 33, 49, 65, 97, 129, 193, 257, 385, 513, 769, 1025, 1537, 2049, 3073, 4097, 6145, 8193, 12289, 16385, 24577];
  var DEXT = [0, 0, 0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 11, 11, 12, 12, 13, 13];
  // The small deflater: LZ77 matches (a 32 KB window, hash chains) coded with the fixed Huffman codes.
  // Short texts like ours squeeze to about half. The browser's own CompressionStream does a little better.
  function deflateRaw(data) {
    var out = [], buf = 0, cnt = 0, n = data.length;
    function put(v, k) { buf |= v << cnt; cnt += k; while (cnt >= 8) { out.push(buf & 255); buf >>>= 8; cnt -= 8; } }
    function rev(c, k) { var r = 0; while (k--) { r = (r << 1) | (c & 1); c >>= 1; } return r; }
    function sym(s) {
      if (s < 144) put(rev(0x30 + s, 8), 8);
      else if (s < 256) put(rev(0x190 + s - 144, 9), 9);
      else if (s < 280) put(rev(s - 256, 7), 7);
      else put(rev(0xC0 + s - 280, 8), 8);
    }
    function match(len, dist) {
      var c = 0; while (c < 28 && LBASE[c + 1] <= len) c++;
      sym(257 + c); if (LEXT[c]) put(len - LBASE[c], LEXT[c]);
      var d = 0; while (d < 29 && DBASE[d + 1] <= dist) d++;
      put(rev(d, 5), 5); if (DEXT[d]) put(dist - DBASE[d], DEXT[d]);
    }
    put(1, 1); put(1, 2);   // the last block, fixed codes
    var head = new Int32Array(32768), prev = new Int32Array(Math.max(1, n)), i, j;
    for (i = 0; i < 32768; i++) head[i] = -1;
    function hash(p) { return ((data[p] << 10) ^ (data[p + 1] << 5) ^ data[p + 2]) & 32767; }
    function insert(p) { if (p + 2 < n) { var h = hash(p); prev[p] = head[h]; head[h] = p; } }
    i = 0;
    while (i < n) {
      var best = 0, dist = 0;
      if (i + 2 < n) {
        var max = Math.min(258, n - i), chain = 0;
        j = head[hash(i)];
        while (j >= 0 && i - j <= 32768 && chain++ < 96) {
          if (data[j + best] === data[i + best]) {
            var l = 0; while (l < max && data[j + l] === data[i + l]) l++;
            if (l > best) { best = l; dist = i - j; if (l === max) break; }
          }
          j = prev[j];
        }
      }
      if (best >= 3) { match(best, dist); for (var s = 0; s < best; s++) insert(i + s); i += best; }
      else { sym(data[i]); insert(i); i++; }
    }
    sym(256);
    if (cnt > 0) out.push(buf & 255);
    return new Uint8Array(out);
  }

  // The small inflater (stored, fixed and dynamic blocks), after "puff" by Mark Adler. It stops at maxOut bytes.
  function inflateRaw(src, maxOut) {
    maxOut = maxOut || MAX_RAW;
    var pos = 0, buf = 0, cnt = 0, out = new Uint8Array(Math.min(maxOut, Math.max(1024, src.length * 4))), len = 0;
    function fail(m) { throw new Error('inflate: ' + m); }
    function bits(k) {
      while (cnt < k) { if (pos >= src.length) fail('ran out'); buf |= src[pos++] << cnt; cnt += 8; }
      var v = buf & ((1 << k) - 1); buf >>>= k; cnt -= k; return v;
    }
    function emit(b) {
      if (len >= maxOut) fail('too big');
      if (len >= out.length) { var o2 = new Uint8Array(Math.min(maxOut, out.length * 2)); o2.set(out); out = o2; }
      out[len++] = b;
    }
    function table(lengths, n) {
      var count = new Uint16Array(16), offs = new Uint16Array(16), sym = new Uint16Array(n), i;
      for (i = 0; i < n; i++) count[lengths[i]]++;
      count[0] = 0;
      for (i = 1; i < 15; i++) offs[i + 1] = offs[i] + count[i];
      for (i = 0; i < n; i++) if (lengths[i]) sym[offs[lengths[i]]++] = i;
      return { c: count, s: sym };
    }
    function decode(t) {
      var code = 0, first = 0, index = 0;
      for (var l = 1; l < 16; l++) {
        code |= bits(1);
        var c = t.c[l];
        if (code - c < first) return t.s[index + (code - first)];
        index += c; first += c; first <<= 1; code <<= 1;
      }
      fail('bad code');
    }
    var fixedL = null, fixedD = null;
    function fixed() {
      if (!fixedL) {
        var l = new Uint8Array(288), i;
        for (i = 0; i < 144; i++) l[i] = 8; for (; i < 256; i++) l[i] = 9; for (; i < 280; i++) l[i] = 7; for (; i < 288; i++) l[i] = 8;
        fixedL = table(l, 288);
        var d = new Uint8Array(30); for (i = 0; i < 30; i++) d[i] = 5;
        fixedD = table(d, 30);
      }
      return [fixedL, fixedD];
    }
    var ORDER = [16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15];
    function dynamic() {
      var nlen = bits(5) + 257, ndist = bits(5) + 1, ncode = bits(4) + 4, i;
      if (nlen > 286 || ndist > 30) fail('bad counts');
      var cl = new Uint8Array(19);
      for (i = 0; i < ncode; i++) cl[ORDER[i]] = bits(3);
      var ct = table(cl, 19), lens = new Uint8Array(nlen + ndist);
      i = 0;
      while (i < nlen + ndist) {
        var s = decode(ct), rep, v = 0;
        if (s < 16) { lens[i++] = s; continue; }
        if (s === 16) { if (!i) fail('repeat with nothing'); v = lens[i - 1]; rep = 3 + bits(2); }
        else if (s === 17) rep = 3 + bits(3);
        else rep = 11 + bits(7);
        if (i + rep > nlen + ndist) fail('too many lengths');
        while (rep--) lens[i++] = v;
      }
      if (!lens[256]) fail('no end code');
      return [table(lens.subarray(0, nlen), nlen), table(lens.subarray(nlen), ndist)];
    }
    var last = 0;
    while (!last) {
      last = bits(1);
      var type = bits(2);
      if (type === 0) {
        buf = 0; cnt = 0;
        if (pos + 4 > src.length) fail('ran out');
        var L = src[pos] | (src[pos + 1] << 8), NL = src[pos + 2] | (src[pos + 3] << 8); pos += 4;
        if (L !== (~NL & 0xFFFF)) fail('bad stored length');
        if (pos + L > src.length) fail('ran out');
        for (var q = 0; q < L; q++) emit(src[pos++]);
      } else if (type === 1 || type === 2) {
        var tt = type === 1 ? fixed() : dynamic();
        for (;;) {
          var sy = decode(tt[0]);
          if (sy < 256) { emit(sy); continue; }
          if (sy === 256) break;
          sy -= 257; if (sy >= 29) fail('bad length code');
          var ln = LBASE[sy] + bits(LEXT[sy]), ds = decode(tt[1]);
          if (ds >= 30) fail('bad distance code');
          var dist = DBASE[ds] + bits(DEXT[ds]);
          if (dist > len) fail('distance too far');
          while (ln--) emit(out[len - dist]);
        }
      } else fail('bad block type');
    }
    return out.subarray(0, len);
  }

  // ============================================================== pack / unpack
  function packSync(obj) { return VERSION + '.' + b64e(deflateRaw(utf8(JSON.stringify(obj)))); }
  function streamBytes(bytes, stream) {
    var s = new Blob([bytes]).stream().pipeThrough(stream);
    return new Response(s).arrayBuffer().then(function (b) { return new Uint8Array(b); });
  }
  // the browser's own deflate where there is one (a little shorter); the small one here otherwise
  function pack(obj) {
    var sync = packSync(obj);
    if (typeof CompressionStream !== 'function' || typeof Blob !== 'function' || typeof Response !== 'function') return Promise.resolve(sync);
    try {
      return streamBytes(utf8(JSON.stringify(obj)), new CompressionStream('deflate-raw')).then(function (z) {
        var p = VERSION + '.' + b64e(z); return p.length < sync.length ? p : sync;
      }, function () { return sync; });
    } catch (e) { return Promise.resolve(sync); }
  }
  function unpackSync(s) {
    var m = /^1\.([A-Za-z0-9_-]+)$/.exec(String(s || '').replace(/\s+/g, ''));
    if (!m) throw new Error('not a together link');
    if (m[1].length > MAX_PACKED) throw new Error('too long');
    return JSON.parse(unutf8(inflateRaw(b64d(m[1]), MAX_RAW)));
  }
  function unpack(s) { try { return Promise.resolve(unpackSync(s)); } catch (e) { return Promise.reject(e); } }

  // ============================================================== cleaning what comes in
  // keys that could reach an object's prototype are never copied (an object literal can't even hold "__proto__")
  function badKey(k) { return k === '__proto__' || k === 'constructor' || k === 'prototype'; }
  // control characters and the invisible direction marks (they can make a name read backwards)
  var CTRL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F​-‏‪-‮⁦-⁩﻿]/g;
  function cleanStr(s, max) { return String(s).replace(CTRL, '').slice(0, max || 4000); }
  function cleanVal(v, depth, budget) {
    if (budget.n-- <= 0) return null;
    if (v === null || typeof v === 'boolean') return v;
    if (typeof v === 'number') return isFinite(v) ? v : null;
    if (typeof v === 'string') return cleanStr(v, budget.str);
    if (depth > 8 || typeof v !== 'object') return null;
    if (Array.isArray(v)) { var a = []; for (var i = 0; i < v.length && i < 500; i++) a.push(cleanVal(v[i], depth + 1, budget)); return a; }
    var o = {}, ks = Object.keys(v).slice(0, 400);
    ks.forEach(function (k) {
      var ck = cleanStr(k, 80);
      if (badKey(k) || badKey(ck) || k.length > 80) return;
      var x = cleanVal(v[k], depth + 1, budget);
      if (x !== undefined) o[ck] = x;
    });
    return o;
  }
  function num(x) { x = +x; return isFinite(x) && x > 0 ? Math.min(Math.floor(x), 4102444800) : 0; }
  function cleanName(s) { return cleanStr(s == null ? '' : s, 40).replace(/\s+/g, ' ').trim(); }
  // an envelope as it came in, or null when it isn't one
  function cleanEnv(o) {
    if (!o || typeof o !== 'object' || Array.isArray(o) || o.v !== VERSION) return null;
    if (typeof o.t !== 'string' || !TOOL_RE.test(o.t)) return null;
    var env = { v: VERSION, t: o.t, r: typeof o.r === 'string' && ID_RE.test(o.r) ? o.r : rid(6), p: {}, at: 0 };
    if (typeof o.f === 'string' && ID_RE.test(o.f)) env.f = o.f;
    if (o.p && typeof o.p === 'object' && !Array.isArray(o.p)) {
      Object.keys(o.p).filter(function (k) { return ID_RE.test(k); }).slice(0, MAX_PEOPLE).forEach(function (pid) {
        var s = o.p[pid]; if (!s || typeof s !== 'object' || Array.isArray(s)) return;
        var d = s.d && typeof s.d === 'object' ? cleanVal(s.d, 1, { n: 4000, str: 4000 }) : {};
        env.p[pid] = { n: cleanName(s.n), at: num(s.at), d: d && typeof d === 'object' ? d : {} };
        env.at = Math.max(env.at, env.p[pid].at);
      });
    }
    if (o.x !== undefined) env.x = cleanVal(o.x, 0, { n: 40000, str: 4000 });
    env.at = Math.max(env.at, num(o.at));
    if (o.lang === 'es' || o.lang === 'en') env.lang = o.lang;
    return env;
  }

  // ============================================================== envelopes, merging
  function rid(n) {
    var a = 'abcdefghijkmnpqrstuvwxyz23456789', s = '', r = null;
    try { if (W && W.crypto && W.crypto.getRandomValues) { r = new Uint8Array(n); W.crypto.getRandomValues(r); } } catch (e) { r = null; }
    for (var i = 0; i < n; i++) s += a.charAt(r ? r[i] % 32 : Math.floor(Math.random() * 32));
    return s;
  }
  function now() { return Math.floor(Date.now() / 1000); }
  function clone(o) { return o == null ? o : JSON.parse(JSON.stringify(o)); }
  function same(a, b) { return JSON.stringify(a == null ? null : a) === JSON.stringify(b == null ? null : b); }
  // which answers differ between two versions of someone's part
  function changedKeys(a, b) {
    a = a || {}; b = b || {};
    var ks = Object.keys(a).concat(Object.keys(b)).filter(function (k, i, all) { return all.indexOf(k) === i; });
    return ks.filter(function (k) { return !same(a[k], b[k]); });
  }
  function envelope(o) {
    o = o || {};
    var id = o.id || rid(8), at = o.at || now(), env = { v: VERSION, t: o.tool, r: o.r || rid(6), f: id, at: at, p: {} };
    if (o.base && o.base.p) Object.keys(o.base.p).forEach(function (k) { if (k !== id) env.p[k] = clone(o.base.p[k]); });
    if (o.d !== undefined || o.name) env.p[id] = { n: cleanName(o.name), at: at, d: clone(o.d || {}) };
    Object.keys(env.p).forEach(function (k) { env.at = Math.max(env.at, env.p[k].at || 0); });
    if (o.x !== undefined) env.x = clone(o.x);
    if (o.lang) env.lang = o.lang;
    return env;
  }
  // Merge a link into what this device has, person by person. The latest part from each person wins;
  // an older part never replaces a newer one. changes: [{ id, n, kind: 'new'|'updated'|'older'|'same', keys }]
  function merge(base, inc) {
    inc = cleanEnv(inc);
    if (!inc) return null;
    base = base && base.t === inc.t ? clean2(base) : null;
    var out = base ? clone(base) : { v: VERSION, t: inc.t, r: inc.r, p: {}, at: 0 }, changes = [];
    if (!out.p) out.p = {};
    Object.keys(inc.p).forEach(function (id) {
      var a = out.p[id], b = inc.p[id];
      if (!a) { if (Object.keys(out.p).length >= MAX_PEOPLE) return; out.p[id] = b; changes.push({ id: id, n: b.n, kind: 'new', keys: Object.keys(b.d || {}) }); return; }
      if (b.at > a.at) { var ks = changedKeys(a.d, b.d); out.p[id] = b; changes.push({ id: id, n: b.n || a.n, kind: ks.length || a.n !== b.n ? 'updated' : 'same', keys: ks }); return; }
      if (b.at < a.at) { changes.push({ id: id, n: a.n || b.n, kind: 'older', keys: changedKeys(a.d, b.d) }); return; }
      changes.push({ id: id, n: a.n, kind: 'same', keys: [] });
    });
    // a tool's own shared data: the newer link's
    if (inc.x !== undefined && (!base || base.x === undefined || inc.at >= (base.at || 0))) out.x = inc.x;
    out.r = base ? base.r : inc.r;
    if (inc.f) out.f = inc.f;
    out.at = 0; Object.keys(out.p).forEach(function (k) { out.at = Math.max(out.at, out.p[k].at || 0); });
    if (inc.lang) out.lang = inc.lang;
    var older = changes.length > 0 && changes.every(function (c) { return c.kind === 'older' || c.kind === 'same'; }) && changes.some(function (c) { return c.kind === 'older'; });
    return { env: out, changes: changes, older: older };
  }
  function clean2(e) { var c = cleanEnv(e); return c; }

  // ============================================================== links and codes
  function origin() {
    try { if (W && W.location && /^https?:$/.test(W.location.protocol)) return W.location.origin; } catch (e) {}
    return SITE;
  }
  function pagePath(page) {
    page = String(page || (W && W.location ? W.location.pathname + W.location.search : '/'));
    if (/^https?:\/\//.test(page)) return page.replace(/#.*$/, '');
    return origin() + (page.charAt(0) === '/' ? '' : '/') + page.replace(/#.*$/, '');
  }
  function link(env, page) { return pagePath(page) + HASH + packSync(env); }
  function linkAsync(env, page) { return pack(env).then(function (p) { return pagePath(page) + HASH + p; }); }
  function code(env) { return CODE + packSync(env); }
  function codeOf(url) { var m = /#together=(1\.[A-Za-z0-9_-]+)/.exec(String(url || '')); return m ? CODE + m[1] : ''; }
  // the envelope in a link, a code, or a message with one in it; null when there isn't a good one
  function read(text) {
    var s = String(text == null ? '' : text), m = /#together=(1\.[A-Za-z0-9_-]+)/.exec(s) || /TOL-TOGETHER:\s*(1\.[A-Za-z0-9_-]+)/i.exec(s) || /^\s*(1\.[A-Za-z0-9_-]{8,})\s*$/.exec(s);
    if (!m) return null;
    try { return cleanEnv(unpackSync(m[1])); } catch (e) { return null; }
  }
  function has(text) { return /#together=1\.|TOL-TOGETHER:/i.test(String(text || '')); }
  function isLong(url) { return String(url || '').length > LONG; }
  function wrap(tool, x, o) {
    o = o || {};
    var me = getMe(), env = envelope({ tool: tool, id: me.id, name: o.name != null ? o.name : me.name, d: o.d || {}, x: x, r: o.r, lang: o.lang });
    return link(env, o.page);
  }

  // ============================================================== this device
  function lsGet(k) { try { return JSON.parse(W.localStorage.getItem(k) || 'null'); } catch (e) { return null; } }
  function lsSet(k, v) { try { if (v == null) W.localStorage.removeItem(k); else W.localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } }
  function ssGet(k) { try { return JSON.parse(W.sessionStorage.getItem(k) || 'null'); } catch (e) { return null; } }
  function ssSet(k, v) { try { if (v == null) W.sessionStorage.removeItem(k); else W.sessionStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  var meCache = null;
  function getMe() {
    if (meCache) return meCache;
    var m = W ? lsGet(ME_KEY) : null;
    meCache = m && typeof m.id === 'string' && ID_RE.test(m.id) ? { id: m.id, name: cleanName(m.name) } : { id: rid(8), name: '', fresh: true };
    return meCache;
  }
  function saveMe(name) {
    var m = getMe();
    if (name != null) m.name = cleanName(name);
    delete m.fresh;
    if (W) lsSet(ME_KEY, { id: m.id, name: m.name });
    return m;
  }

  // ============================================================== the page: small helpers
  function mk(tag, attrs, kids) {
    var n = D.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      var v = attrs[k]; if (v == null || v === false) return;
      if (k === 'text') n.textContent = v; else if (k === 'cls') n.className = v; else n.setAttribute(k, v === true ? '' : v);
    });
    (kids || []).forEach(function (c) { if (c != null) n.appendChild(typeof c === 'string' ? D.createTextNode(c) : c); });
    return n;
  }
  var cssOnce = false;
  function css() {
    if (cssOnce || !D) return; cssOnce = true;
    if (D.querySelector('link[href="/assets/css/collab.css"]')) return;
    var l = D.createElement('link'); l.rel = 'stylesheet'; l.href = '/assets/css/collab.css'; D.head.appendChild(l);
  }
  function copyText(t) {
    if (W.TOLShare && W.TOLShare.copy) { try { return Promise.resolve(W.TOLShare.copy(t)).then(function (ok) { return ok !== false; }); } catch (e) {} }
    function legacy() {
      var ta = mk('textarea', { readonly: '', 'aria-hidden': 'true', cls: 'tcol-off' }); ta.value = t;
      D.body.appendChild(ta); ta.select(); var ok = false; try { ok = D.execCommand('copy'); } catch (e) {} ta.remove(); return ok;
    }
    if (W.navigator.clipboard && W.navigator.clipboard.writeText && W.isSecureContext) return W.navigator.clipboard.writeText(t).then(function () { return true; }, legacy);
    return Promise.resolve(legacy());
  }
  function withKit(cb) {
    if (W.TOLShareKit && W.TOLShareKit.showQR) { cb(W.TOLShareKit); return; }
    var s = D.querySelector('script[src="/assets/js/share-kit.js"]');
    if (!s) { s = D.createElement('script'); s.src = '/assets/js/share-kit.js'; D.head.appendChild(s); }
    var tries = 0;
    (function wait() { if (W.TOLShareKit && W.TOLShareKit.showQR) cb(W.TOLShareKit); else if (++tries < 60) setTimeout(wait, 100); })();
  }
  function smsHref(body) { return 'sms:?&body=' + encodeURIComponent(body); }
  function mailHref(subject, body) { return 'mailto:?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body); }
  function fire(url, how) { try { D.dispatchEvent(new CustomEvent('tol-shared', { detail: { url: url, method: how, how: how, together: true } })); } catch (e) {} }

  // ============================================================== "Send by": QR code, text, email, apps, copy
  // opts: { url: string or function → string, title, text (the message before the link), subject,
  //         who (their name, for "Scan with Sam's phone"), onSent(how) }
  function sendBlock(opts) {
    css();
    opts = opts || {};
    // the page's language, or the tool's own choice (a tool with its own English/Spanish switch)
    function T(en, es) { return (opts.lang ? opts.lang === 'es' : esPage()) && es ? es : en; }
    var box = mk('div', { cls: 'tcol-send' });
    var head = mk('p', { cls: 'tcol-send-h', text: opts.heading || T('Send it by', 'Envíalo por') });
    var acts = mk('div', { cls: 'tcol-acts', role: 'group', 'aria-label': opts.heading || T('Send it by', 'Envíalo por') });
    var qr = mk('button', { type: 'button', cls: 'tcol-act', 'data-c': 'qr', text: T('QR code', 'Código QR') });
    var sms = mk('a', { cls: 'tcol-act', 'data-c': 'sms', href: '#', text: T('Text message', 'Mensaje de texto') });
    var mail = mk('a', { cls: 'tcol-act', 'data-c': 'mail', href: '#', text: T('Email', 'Correo') });
    var more = mk('button', { type: 'button', cls: 'tcol-act', 'data-c': 'more', text: T('WhatsApp or another app', 'WhatsApp u otra app') });
    var cp = mk('button', { type: 'button', cls: 'tcol-act tcol-act-copy', 'data-c': 'copy', text: T('Copy link', 'Copiar enlace') });
    var cd = mk('button', { type: 'button', cls: 'tcol-act', 'data-c': 'code', text: T('Copy as a code', 'Copiar como código'), hidden: '' });
    [qr, sms, mail, more, cd, cp].forEach(function (b) { acts.appendChild(b); });
    var long = mk('p', { cls: 'tcol-long', hidden: '' });
    var priv = mk('p', { cls: 'tcol-priv', text: T('Your answers travel inside the link. Anyone with the link can read them. Nothing is stored on our side.', 'Tus respuestas viajan dentro del enlace. Cualquiera que tenga el enlace puede leerlas. No se guarda nada de nuestro lado.') });
    var st = mk('p', { cls: 'tcol-st', role: 'status', 'aria-live': 'polite' });
    box.appendChild(head); box.appendChild(acts); box.appendChild(long); box.appendChild(priv); box.appendChild(st);
    var cur = '', stT = 0;
    function say(m) { st.textContent = ''; clearTimeout(stT); setTimeout(function () { st.textContent = m; }, 30); stT = setTimeout(function () { st.textContent = ''; }, 9000); }
    function getUrl() { var u = typeof opts.url === 'function' ? opts.url() : opts.url; return String(u || ''); }
    function message(u) { return [typeof opts.text === 'function' ? opts.text() : opts.text, u].filter(Boolean).join('\n'); }
    function subject() { return (typeof opts.subject === 'function' ? opts.subject() : opts.subject) || (typeof opts.title === 'function' ? opts.title() : opts.title) || T('Let’s work on this together', 'Trabajemos en esto juntos'); }
    function refresh() {
      cur = getUrl();
      var on = !!cur, lg = isLong(cur);
      [qr, sms, mail, more, cp].forEach(function (b) { b.classList.toggle('is-off', !on); if (on) b.removeAttribute('aria-disabled'); else b.setAttribute('aria-disabled', 'true'); });
      sms.hidden = lg; qr.hidden = lg; cd.hidden = !lg;
      long.hidden = !lg;
      long.textContent = lg ? T('This link is long (' + cur.length.toLocaleString() + ' characters), too long for a QR code or a text message to carry safely. Copy it as a code and paste it into a chat, or send it by email, which has no limit. On their side, they paste the code under “Got a code instead of a link?”.',
        'Este enlace es largo (' + cur.length.toLocaleString() + ' caracteres), demasiado para un código QR o un mensaje de texto. Cópialo como código y pégalo en un chat, o envíalo por correo, que no tiene límite. Del otro lado, pegan el código en «¿Te llegó un código en vez de un enlace?».') : '';
      sms.setAttribute('href', on ? smsHref(message(cur)) : '#');
      mail.setAttribute('href', on ? mailHref(subject(), message(cur) + '\n\n' + T('Nothing is uploaded: everything travels inside the link.', 'No se sube nada: todo viaja dentro del enlace.')) : '#');
      return cur;
    }
    function notReady(e) {
      if (cur) return false;
      if (e) e.preventDefault();
      say(opts.empty ? (typeof opts.empty === 'function' ? opts.empty() : opts.empty) : T('Fill in your part first, then send it.', 'Primero completa tu parte y luego envíala.'));
      return true;
    }
    // the link is made fresh as a finger or a key reaches for a button, so it always holds the latest answers
    acts.addEventListener('pointerdown', refresh);
    acts.addEventListener('focusin', refresh);
    acts.addEventListener('click', function (e) {
      var b = e.target.closest && e.target.closest('[data-c]'); if (!b) return;
      var c = b.getAttribute('data-c');
      refresh();
      if (notReady(e)) return;
      if (c === 'sms' || c === 'mail') { fire(cur, c); if (opts.onSent) opts.onSent(c, cur); say(c === 'sms' ? T('Opening your messages app. If nothing opens, use “Copy link”.', 'Abriendo tus mensajes. Si no se abre nada, usa «Copiar enlace».') : T('Opening your email. If nothing opens, use “Copy link”.', 'Abriendo tu correo. Si no se abre nada, usa «Copiar enlace».')); return; }
      if (c === 'qr') {
        var who = typeof opts.who === 'function' ? opts.who() : opts.who;
        withKit(function (K) { K.showQR(cur, { title: who ? T('Scan with ' + who + '’s phone', 'Escanéalo con el teléfono de ' + who) : T('Scan with the other phone', 'Escanéalo con el otro teléfono'), note: opts.qrNote || T('Open the camera on the other phone and point it at this code. It opens this page there, with your part in it.', 'Abre la cámara del otro teléfono y apúntala a este código. Abre esta página allí, con tu parte.') }); });
        if (opts.onSent) opts.onSent('qr', cur);
        return;
      }
      if (c === 'more') {
        var d = { title: typeof opts.title === 'function' ? opts.title() : opts.title || '', text: typeof opts.text === 'function' ? opts.text() : opts.text || '', url: cur, private: true, result: true };
        if (W.TOLShare && W.TOLShare.open) W.TOLShare.open(d);
        else if (W.navigator.share) { try { W.navigator.share({ title: d.title, text: d.text, url: cur }).catch(function () {}); } catch (er) {} }
        else copyText(message(cur)).then(function (ok) { say(ok ? T('Copied. Paste it into any app.', 'Copiado. Pégalo en cualquier app.') : T('Couldn’t copy here.', 'No se pudo copiar aquí.')); });
        if (opts.onSent) opts.onSent('more', cur);
        return;
      }
      if (c === 'copy' || c === 'code') {
        var t = c === 'code' ? codeOf(cur) : cur;
        copyText(t).then(function (ok) {
          say(!ok ? T('Couldn’t copy here. Press and hold to copy by hand.', 'No se pudo copiar aquí.') : c === 'code' ? T('Code copied. Paste it into a chat or a note. On their side, they paste it under “Got a code instead of a link?”.', 'Código copiado. Pégalo en un chat o una nota. Del otro lado, lo pegan en «¿Te llegó un código en vez de un enlace?».') : T('Link copied. Paste it into a message to them.', 'Enlace copiado. Pégalo en un mensaje.'));
          if (ok) { fire(cur, c); if (opts.onSent) opts.onSent(c, cur); }
        });
      }
    });
    box.refresh = refresh;
    box.say = say;
    refresh();
    return box;
  }

  // the same buttons in a small window over the page (for a tool's own "Send" button)
  var sheet = null, sheetBack = null;
  function closeSheet() {
    if (!sheet || sheet.hidden) return;
    sheet.hidden = true; D.documentElement.classList.remove('tcol-sheet-on');
    var b = sheetBack; sheetBack = null;
    if (b && b.focus && D.contains(b)) { try { b.focus({ preventScroll: true }); } catch (e) { b.focus(); } }
  }
  function sendSheet(opts) {
    css();
    opts = opts || {};
    if (!sheet) {
      sheet = mk('div', { cls: 'tcol-sheet', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'tcol-sheet-h', hidden: '' });
      var card = mk('div', { cls: 'tcol-sheet-card' });
      var hd = mk('div', { cls: 'tcol-sheet-head' }, [mk('h2', { id: 'tcol-sheet-h' }), mk('button', { type: 'button', cls: 'tcol-sheet-x', 'data-x': '1', text: T('Close', 'Cerrar') })]);
      card.appendChild(hd); card.appendChild(mk('p', { cls: 'tcol-sheet-note' })); card.appendChild(mk('div', { cls: 'tcol-sheet-body' }));
      sheet.appendChild(card);
      sheet.addEventListener('click', function (e) { if (e.target === sheet || (e.target.closest && e.target.closest('[data-x]'))) closeSheet(); });
      sheet.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') { e.preventDefault(); closeSheet(); return; }
        if (e.key !== 'Tab') return;
        var f = Array.prototype.filter.call(sheet.querySelectorAll('button, a[href], input, textarea'), function (n) { return !n.hidden && n.getClientRects().length > 0; });
        if (!f.length) return;
        if (e.shiftKey && D.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
        else if (!e.shiftKey && D.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
      });
      D.body.appendChild(sheet);
    }
    sheet.querySelector('#tcol-sheet-h').textContent = opts.heading || T('Send it', 'Envíalo');
    var note = sheet.querySelector('.tcol-sheet-note'); note.textContent = opts.note || ''; note.hidden = !opts.note;
    var body = sheet.querySelector('.tcol-sheet-body'); body.textContent = '';
    var sb = sendBlock(Object.assign({}, opts, { heading: opts.blockHeading || T('Send by', 'Enviar por') }));
    body.appendChild(sb);
    sheetBack = D.activeElement;
    sheet.hidden = false; D.documentElement.classList.add('tcol-sheet-on');
    var f = sheet.querySelector('.tcol-act:not([hidden])'); if (f) { try { f.focus({ preventScroll: true }); } catch (e) { f.focus(); } }
    return { close: closeSheet, block: sb };
  }

  // ============================================================== "Work on this together": a whole panel
  /* attach(opts) puts the panel into opts.mount and returns a controller.
     opts = {
       tool: 'checkin',                       the tool id (letters, numbers, dashes)
       page: '/check-ins.html',               the page the link opens (default: this page)
       title: ['the weekly check-in card', 'la tarjeta semanal'],   for "Alex sent you their part of …"
       fields: [{ k:'well', en:'What went well', es:'Lo que fue bien' }, ...],   labels for showing parts
       mine: function () { return { well: '...', ... }; },   your part, as it is now
       fill: function (d) { ... },             optional: put values into your form ("Use this", or your own
                                               part coming back to an empty form)
       shared: true,                           one agreement everyone edits: your empty answers are filled in
                                               from theirs, and where yours differ each one gets "Use this"
       format: function (k, v) { return 'text'; }   optional: how a value reads
       onMerge: function (env, info) {}        optional: told after a link is opened (env has everyone's parts)
       message: function (reply) { return 'text before the link'; }   optional
       lede: 'words under the heading'         optional
     } */
  function blankish(d) { return !d || Object.keys(d).every(function (k) { var v = d[k]; return v == null || v === '' || v === false || (Array.isArray(v) && !v.length) || (typeof v === 'object' && !Array.isArray(v) && blankish(v)); }); }
  function attach(opts) {
    css();
    opts = opts || {};
    var tool = opts.tool, mount = opts.mount;
    if (!D || !mount || !TOOL_RE.test(tool || '')) return null;
    var title = function () { var t = opts.title || ['this', 'esto']; return Array.isArray(t) ? T(t[0], t[1]) : t; };
    var fieldMap = {}; (opts.fields || []).forEach(function (f) { fieldMap[f.k] = f; });
    function label(k) { var f = fieldMap[k]; return f ? T(f.en, f.es || f.en) : k; }
    function fmt(k, v) {
      if (opts.format) { var r = opts.format(k, v); if (r != null) return String(r); }
      if (Array.isArray(v)) return v.map(function (x) { return typeof x === 'object' ? JSON.stringify(x) : String(x); }).join(', ');
      if (v && typeof v === 'object') return Object.keys(v).map(function (x) { return x + ': ' + fmt(x, v[x]); }).join('; ');
      if (v === true) return T('Yes', 'Sí'); if (v === false) return T('No', 'No');
      return v == null ? '' : String(v);
    }
    function mine() { var d = {}; try { d = opts.mine() || {}; } catch (e) { d = {}; } return clone(d); }
    // nothing of yours yet (a tool with starting text says so itself)
    // answers that are each person's own (their hours, say): shown, never offered as "Use this"
    var own = opts.own || [];
    function shareable(d) { var o = {}; Object.keys(d || {}).forEach(function (k) { if (own.indexOf(k) < 0) o[k] = d[k]; }); return o; }
    function mineBlank() { if (opts.isBlank) { try { return !!opts.isBlank(); } catch (e) {} } return blankish(mine()); }

    // what this tab knows: everyone's parts in this back-and-forth, and when your own part last changed
    var tab = ssGet(TAB_KEY) || {}, keptAll = lsGet(KEPT_KEY) || {}, kept = keptAll[tool] || null;
    var st = tab[tool] || (kept ? { env: kept.env, sig: kept.sig, at: kept.at, r: kept.r } : null) || { env: null, sig: '', at: 0 };
    if (st.env) st.env = cleanEnv(st.env);
    // one id for this back-and-forth: the links you send all carry it, and the replies keep it
    if (!st.r || !ID_RE.test(st.r)) st.r = st.env ? st.env.r : rid(6);
    var keepOn = !!kept, info = null, whoAsk = null;
    function myId() { return getMe().id; }
    function myAt() {
      var d = mine(), s = JSON.stringify(d);
      if (s !== st.sig) { st.sig = s; st.at = Math.max(now(), (st.at || 0) + 1); persist(); }
      return st.at || now();
    }
    function persist() {
      var t = ssGet(TAB_KEY) || {}; t[tool] = { env: st.env, sig: st.sig, at: st.at, r: st.r }; ssSet(TAB_KEY, t);
      var k = lsGet(KEPT_KEY) || {};
      if (keepOn) { k[tool] = { env: st.env, sig: st.sig, at: st.at, r: st.r, saved: now(), hist: k[tool] && k[tool].hist }; lsSet(KEPT_KEY, k); }
      else if (k[tool]) { delete k[tool]; lsSet(KEPT_KEY, Object.keys(k).length ? k : null); }
    }
    function others() { var e = st.env, id = myId(); return e ? Object.keys(e.p).filter(function (k) { return k !== id; }) : []; }
    function nameInput() { return panel.querySelector('.tcol-name'); }
    // your name: the tool's own name box where it has one, or the panel's
    function myName() { if (opts.name) { try { return cleanName(opts.name()); } catch (e) {} } var i = nameInput(); return cleanName(i && i.value) || ''; }
    // the envelope to send: everyone's parts this tab has, and yours as it is now
    function current() {
      var me = getMe(), d = mine();
      return envelope({ tool: tool, id: me.id, name: myName() || me.name, d: d, at: myAt(), base: st.env, r: st.env ? st.env.r : st.r, lang: esPage() ? 'es' : undefined });
    }
    function url() { if (blankish(mine()) && !others().length) return ''; return link(current(), opts.page); }
    function sendText() {
      var reply = others().length > 0;
      if (opts.message) { var m = opts.message(reply); if (m) return m; }
      var who = myName();
      return reply
        ? T((who ? who + ' here. ' : '') + 'I’ve added my part of ' + title() + '. Open the link to see everyone’s parts together. Nothing is uploaded: it travels inside the link.', (who ? 'Soy ' + who + '. ' : '') + 'Agregué mi parte de ' + title() + '. Abre el enlace para ver las partes de todos juntas. No se sube nada: viaja dentro del enlace.')
        : T((who ? who + ' here. ' : '') + 'Here’s my part of ' + title() + '. Open the link, add yours, and send it back. Nothing is uploaded: it travels inside the link.', (who ? 'Soy ' + who + '. ' : '') + 'Aquí está mi parte de ' + title() + '. Abre el enlace, agrega la tuya y envíala de vuelta. No se sube nada: viaja dentro del enlace.');
    }

    // ---- the panel ----
    var hid = 'tcol-h-' + tool;
    var panel = mk('section', { cls: 'tcol no-print', 'aria-labelledby': hid, 'data-collab': tool });
    panel.appendChild(mk('h3', { cls: 'tcol-h', id: hid, text: T('Work on this together', 'Trabajar en esto juntos') }));
    panel.appendChild(mk('p', { cls: 'tcol-lede', text: opts.lede || T('Each of you fills in your own part, on your own phone. Send yours, they add theirs and send it back. Nobody’s answers overwrite anyone else’s, and it works for three or more of you too.', 'Cada uno completa su propia parte, en su propio teléfono. Envía la tuya, la otra persona agrega la suya y te la devuelve. Nadie borra las respuestas de nadie, y funciona también con tres o más.') }));
    var banner = mk('div', { cls: 'tcol-in', role: 'status', tabindex: '-1', hidden: '' });
    var pick = mk('div', { cls: 'tcol-pick', hidden: '' });
    var people = mk('p', { cls: 'tcol-people', hidden: '' });
    var parts = mk('div', { cls: 'tcol-parts', hidden: '' });
    // joining: everyone's answers side by side (where you match, where you differ, one next step)
    var side = mk('div', { cls: 'tcol-side', hidden: '' }), sideOpen = false;
    var hist = mk('details', { cls: 'tcol-hist', hidden: '' });
    var nid = 'tcol-n-' + tool;
    var meRow = mk('p', { cls: 'tcol-me' }, [mk('label', { for: nid, text: T('Your name (optional)', 'Tu nombre (opcional)') }),
      mk('input', { type: 'text', id: nid, cls: 'tcol-name', maxlength: '40', autocomplete: 'off', placeholder: T('Me', 'Yo') })]);
    var send = sendBlock({ url: url, title: function () { return cap(title()); }, text: sendText, subject: function () { return T('My part of ', 'Mi parte de ') + title(); },
      who: function () { var o = others(); return o.length === 1 ? st.env.p[o[0]].n : ''; },
      empty: function () { return T('Fill in your part first, then send it.', 'Primero completa tu parte y luego envíala.'); },
      onSent: function () { saveMe(myName()); } });
    var pid = 'tcol-p-' + tool;
    var paste = mk('details', { cls: 'tcol-paste' }, [mk('summary', { text: T('Got a code instead of a link?', '¿Te llegó un código en vez de un enlace?') }),
      mk('label', { for: pid, text: T('Paste the code or the link here', 'Pega aquí el código o el enlace') }),
      mk('textarea', { id: pid, rows: '3', cls: 'tcol-pastebox', autocomplete: 'off', spellcheck: 'false' }),
      mk('p', {}, [mk('button', { type: 'button', cls: 'tcol-btn', 'data-k': 'open', text: T('Open it', 'Abrirlo') })])]);
    var kid = 'tcol-k-' + tool;
    var keep = mk('div', { cls: 'tcol-keep' }, [
      mk('p', {}, [mk('input', { type: 'checkbox', id: kid, cls: 'tcol-keepbox' }), ' ', mk('label', { for: kid, text: T('Keep on this device', 'Guardar en este aparato') })]),
      mk('p', { cls: 'tcol-small', text: T('So next time you can see what changed. Only on this device, never sent anywhere. Off: what they sent stays in this tab until you close it.', 'Así la próxima vez ves qué cambió. Solo en este aparato, nunca se envía. Si no lo marcas, lo que te enviaron queda en esta pestaña hasta que la cierres.') }),
      mk('p', {}, [mk('button', { type: 'button', cls: 'tcol-btn tcol-quiet', 'data-k': 'clear', text: T('Clear what you received', 'Borrar lo que recibiste') })])]);
    var pst = mk('p', { cls: 'tcol-st', role: 'status', 'aria-live': 'polite' });
    [banner, pick, people, parts, side, hist, meRow, send, paste, keep, pst].forEach(function (n) { panel.appendChild(n); });
    mount.appendChild(panel);
    function cap(s) { s = String(s || ''); return s.charAt(0).toUpperCase() + s.slice(1); }
    function status(m) { pst.textContent = ''; setTimeout(function () { pst.textContent = m; }, 30); }
    nameInput().value = getMe().name || '';
    if (opts.name) meRow.hidden = true;
    panel.querySelector('.tcol-keepbox').checked = keepOn;

    // ---- showing the parts ----
    function when(at) {
      if (!at) return '';
      try { return new Date(at * 1000).toLocaleString(esPage() ? 'es' : undefined, { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }); } catch (e) { return ''; }
    }
    function nameOf(id) { var s = st.env && st.env.p[id]; return (s && s.n) || T('Someone', 'Alguien'); }
    function draw() {
      var ids = others(), e = st.env, mineNow = mine(), id0 = myId();
      // who's in it so far
      if (e && ids.length) {
        var names = ids.map(nameOf).concat([myName() ? myName() + T(' (you)', ' (tú)') : T('you', 'tú')]);
        people.textContent = T('In this so far: ', 'Hasta ahora: ') + names.join(' · ');
        people.hidden = false;
      } else people.hidden = true;
      parts.textContent = '';
      if (!ids.length) { parts.hidden = true; return; }
      parts.hidden = false;
      parts.appendChild(mk('h4', { cls: 'tcol-parts-h', text: ids.length === 1 ? T('What ' + nameOf(ids[0]) + ' sent', 'Lo que envió ' + nameOf(ids[0])) : T('What the others sent', 'Lo que enviaron los demás') }));
      ids.sort(function (a, b) { return (e.p[b].at || 0) - (e.p[a].at || 0); });
      ids.forEach(function (id) {
        var s = e.p[id], ch = info && info.changes ? info.changes.filter(function (c) { return c.id === id; })[0] : null;
        var art = mk('article', { cls: 'tcol-part' });
        var h = mk('h5', { text: s.n || T('Someone', 'Alguien') });
        if (ch && ch.kind === 'new') h.appendChild(mk('span', { cls: 'tcol-tag', text: T('New', 'Nuevo') }));
        if (ch && ch.kind === 'updated') h.appendChild(mk('span', { cls: 'tcol-tag', text: T('Changed', 'Cambió') }));
        art.appendChild(h);
        if (s.at) art.appendChild(mk('p', { cls: 'tcol-when', text: T('Their part as of ', 'Su parte al ') + when(s.at) }));
        if (ch && ch.kind === 'updated' && ch.keys.length) art.appendChild(mk('p', { cls: 'tcol-changed', text: T('Changed since last time: ', 'Cambió desde la última vez: ') + ch.keys.map(label).join(', ') }));
        var dl = mk('dl', { cls: 'tcol-dl' }), any = false;
        var keys = (opts.fields || []).map(function (f) { return f.k; }).filter(function (k) { return k in s.d; });
        Object.keys(s.d).forEach(function (k) { if (keys.indexOf(k) < 0 && (!opts.fields || !opts.fields.length)) keys.push(k); });
        keys.forEach(function (k) {
          var txt = fmt(k, s.d[k]); if (!txt) return;
          any = true;
          var dd = mk('dd', { text: txt });
          var row = mk('div', { cls: 'tcol-row' }, [mk('dt', { text: label(k) }), dd]);
          if (opts.shared && opts.fill && own.indexOf(k) < 0 && !same(mineNow[k], s.d[k])) {
            var ub = mk('button', { type: 'button', cls: 'tcol-btn tcol-use', 'data-k': 'use', 'data-id': id, 'data-f': k, text: T('Use this', 'Usar esto') });
            ub.setAttribute('aria-label', T('Use ' + (s.n || 'their') + '’s ' + label(k).toLowerCase(), 'Usar ' + label(k).toLowerCase() + ' de ' + (s.n || 'esa persona')));
            row.appendChild(mk('div', { cls: 'tcol-usebox' }, [ub]));
          }
          dl.appendChild(row);
        });
        if (!any) art.appendChild(mk('p', { cls: 'tcol-small', text: T('Nothing filled in yet.', 'Todavía no completó nada.') }));
        else art.appendChild(dl);
        if (opts.shared && opts.fill && any && keys.filter(function (k) { return own.indexOf(k) < 0 && !same(mineNow[k], s.d[k]) && fmt(k, s.d[k]); }).length > 1) {
          art.appendChild(mk('p', {}, [mk('button', { type: 'button', cls: 'tcol-btn tcol-quiet', 'data-k': 'useall', 'data-id': id, text: T('Use all of ' + (s.n || 'theirs'), 'Usar todo lo de ' + (s.n || 'esa persona')) })]));
        }
        parts.appendChild(art);
      });
      void id0;
      drawSide();
    }
    function canCombine() { return opts.combine !== false && others().length > 0 && !mineBlank(); }
    function everyone() {
      var me = getMe(), list = [{ id: me.id, n: myName(), me: true, d: mine() }];
      others().forEach(function (id) { list.push({ id: id, n: st.env.p[id].n, d: clone(st.env.p[id].d) }); });
      return list;
    }
    function drawSide() {
      side.textContent = '';
      if (!canCombine()) { side.hidden = true; return; }
      side.hidden = false;
      var b = mk('button', { type: 'button', cls: 'tcol-btn', 'data-k': 'side', 'aria-expanded': String(sideOpen), text: sideOpen ? T('Hide the side-by-side view', 'Ocultar la vista lado a lado') : T('See everyone’s answers side by side', 'Ver las respuestas de todos lado a lado') });
      side.appendChild(mk('p', {}, [b]));
      if (sideOpen) side.appendChild(combinedView(everyone(), { kind: opts.kind || 'fields', fields: opts.fields, format: opts.format, next: opts.next, k: opts.scoreKey, list: opts.listKey, tool: tool,
        title: T('Side by side', 'Lado a lado') }));
    }
    function drawHist() {
      hist.textContent = '';
      var k = (lsGet(KEPT_KEY) || {})[tool], h = opts.history && k && Array.isArray(k.hist) ? k.hist : [];
      if (!h.length) { hist.hidden = true; return; }
      hist.hidden = false;
      hist.appendChild(mk('summary', { text: T('Earlier rounds, kept on this device (' + h.length + ')', 'Rondas anteriores, guardadas en este aparato (' + h.length + ')') }));
      h.slice().reverse().forEach(function (r) {
        var art = mk('div', { cls: 'tcol-hist-r' }, [mk('p', { cls: 'tcol-when', text: when(r.at) })]);
        (r.people || []).forEach(function (p) {
          var bits = Object.keys(p.d || {}).filter(function (x) { return fmt(x, p.d[x]); }).map(function (x) { return label(x) + ': ' + fmt(x, p.d[x]); });
          if (bits.length) art.appendChild(mk('p', { cls: 'tcol-small', text: (p.n || T('Someone', 'Alguien')) + ' · ' + bits.join(' · ') }));
        });
        hist.appendChild(art);
      });
    }
    function drawBanner() {
      banner.textContent = '';
      if (!info) { banner.hidden = true; return; }
      banner.hidden = false;
      if (info.bad) {
        banner.appendChild(mk('p', { text: T('That link didn’t open. Part of it may have been cut off when it was copied. Ask them to send it again, or to copy it as a code.', 'Ese enlace no se abrió. Puede que se haya cortado al copiarlo. Pide que lo envíen otra vez, o como código.') }));
      } else if (info.wrong) {
        banner.appendChild(mk('p', { text: T('That link is for a different tool, so nothing was added here.', 'Ese enlace es de otra herramienta, así que no se agregó nada aquí.') }));
      } else if (info.own) {
        banner.appendChild(mk('p', { text: T('This is the link you sent. Nothing new in it yet: when they send it back, their part shows up here.', 'Este es el enlace que enviaste. Todavía no trae nada nuevo: cuando te lo devuelvan, su parte aparecerá aquí.') }));
      } else {
        var from = info.from || T('Someone', 'Alguien'), reply = info.reply;
        var lead = mk('p', {}, [mk('strong', { text: reply
          ? T(from + ' added their part of ' + title() + '. ', from + ' agregó su parte de ' + title() + '. ')
          : T(from + ' sent you their part of ' + title() + '. ', from + ' te envió su parte de ' + title() + '. ') }),
          reply ? T('It’s below, beside yours. Change anything, then send it back.', 'Está abajo, junto a la tuya. Cambia lo que quieras y envíala de vuelta.') : T('Add yours, then send it back.', 'Agrega la tuya y envíala de vuelta.')]);
        banner.appendChild(lead);
        var lines = [];
        info.changes.forEach(function (c) {
          if (c.id === myId()) return;
          var n = c.n || T('Someone', 'Alguien');
          if (c.kind === 'new') lines.push(T(n + '’s part is new here.', 'La parte de ' + n + ' es nueva aquí.'));
          else if (c.kind === 'updated') lines.push(c.keys.length ? T(n + ' changed: ' + c.keys.map(label).join(', ') + '.', n + ' cambió: ' + c.keys.map(label).join(', ') + '.') : T(n + ' sent it again; nothing in their part changed.', n + ' lo envió otra vez; su parte no cambió.'));
          else if (c.kind === 'older') lines.push(T('This link is older than what you already have from ' + n + ', so the newer part stays.', 'Este enlace es más viejo que lo que ya tienes de ' + n + ', así que se queda la parte más nueva.'));
          else if (c.kind === 'same') lines.push(T('Nothing new from ' + n + '.', 'Nada nuevo de ' + n + '.'));
        });
        if (info.fresh && !keepOn && info.changes.some(function (c) { return c.kind === 'new' && c.id !== myId(); }) && info.reply) lines.push(T('To see what changed next time, tick “Keep on this device” below.', 'Para ver qué cambió la próxima vez, marca «Guardar en este aparato» abajo.'));
        if (info.filled) lines.push(T('Their answers are filled in below, so you can start from them and change anything.', 'Sus respuestas están abajo, así puedes partir de ellas y cambiar lo que quieras.'));
        if (info.mineBack) lines.push(T('Your own part came back with the link, so it’s filled in again.', 'Tu propia parte volvió con el enlace, así que está completa otra vez.'));
        if (lines.length) { var ul = mk('ul', { cls: 'tcol-changes' }); lines.forEach(function (l) { ul.appendChild(mk('li', { text: l })); }); banner.appendChild(ul); }
        // you've done it too: offer to join the answers
        if (canCombine() && !sideOpen) banner.appendChild(mk('p', {}, [reply ? '' : T('You’ve done this too. ', 'Tú también lo hiciste. '),
          mk('button', { type: 'button', cls: 'tcol-btn', 'data-k': 'side', text: reply ? T('See your answers side by side', 'Ver sus respuestas lado a lado') : T('Combine your answers?', '¿Combinar sus respuestas?') })]));
      }
      banner.appendChild(mk('p', {}, [mk('button', { type: 'button', cls: 'tcol-btn tcol-quiet', 'data-k': 'hide', text: T('Okay, hide this', 'Listo, ocultar esto') })]));
    }
    function drawPick() {
      pick.textContent = '';
      if (!whoAsk) { pick.hidden = true; return; }
      pick.hidden = false;
      pick.appendChild(mk('p', { text: T('Is “' + whoAsk.n + '” you, on another device?', '¿“' + whoAsk.n + '” eres tú, en otro aparato?') }));
      pick.appendChild(mk('p', {}, [mk('button', { type: 'button', cls: 'tcol-btn', 'data-k': 'isme', text: T('Yes, that’s me', 'Sí, soy yo') }), ' ',
        mk('button', { type: 'button', cls: 'tcol-btn tcol-quiet', 'data-k': 'notme', text: T('No, someone else', 'No, es otra persona') })]));
    }
    function render() { drawBanner(); drawPick(); draw(); drawHist(); send.refresh(); }

    // ---- opening a link ----
    function take(env, how) {
      if (!env) { info = { bad: true }; render(); return false; }
      if (env.t !== tool) { info = { wrong: true }; render(); return false; }
      // merged person by person with what this tab already has (a link from a different back-and-forth too:
      // the latest part from each person wins, and "Clear what you received" starts afresh)
      var me = getMe(), fresh = !st.env;
      var res = merge(st.env, env);
      if (!res) { info = { bad: true }; render(); return false; }
      var ids = Object.keys(res.env.p);
      saveMe();
      var myPart = res.env.p[me.id];
      info = { changes: res.changes, older: res.older, fresh: fresh, from: env.f && env.p[env.f] ? env.p[env.f].n : '', reply: !!myPart, how: how };
      info.own = env.f === me.id && ids.every(function (k) { return k === me.id; });
      // your own part, back from the other side, into an empty form
      if (myPart && mineBlank() && opts.fill && !blankish(myPart.d)) { try { opts.fill(clone(myPart.d)); info.mineBack = true; } catch (e) {} }
      // the same name as yours on a part that isn't yours: maybe you, on another device
      var nm = (myName() || me.name || '').toLowerCase();
      whoAsk = null;
      if (nm && !myPart) ids.forEach(function (k) { if (!whoAsk && k !== me.id && (res.env.p[k].n || '').toLowerCase() === nm) whoAsk = { id: k, n: res.env.p[k].n }; });
      // one agreement everyone edits: an empty form starts from theirs
      if (opts.shared && opts.fill && !info.mineBack && mineBlank()) {
        var from = env.f && env.f !== me.id && res.env.p[env.f] ? res.env.p[env.f] : null;
        if (from && !blankish(shareable(from.d))) { var cur0 = mine(); Object.keys(shareable(from.d)).forEach(function (k) { cur0[k] = clone(from.d[k]); }); try { opts.fill(cur0); info.filled = true; } catch (e) {} }
      }
      // your own part in what this tab holds is the one in your form; drop the copy that came back
      if (res.env.p[me.id]) delete res.env.p[me.id];
      st.env = res.env; st.r = res.env.r;
      persist();
      // a shared history: each round kept, on this device only, if "Keep on this device" is ticked
      if (opts.history && keepOn) {
        var kk0 = lsGet(KEPT_KEY) || {}, e0 = kk0[tool];
        if (e0) {
          e0.hist = Array.isArray(e0.hist) ? e0.hist : [];
          e0.hist.push({ at: now(), people: [{ n: myName() || T('You', 'Tú'), d: mine() }].concat(Object.keys(res.env.p).map(function (k) { return { n: res.env.p[k].n, d: res.env.p[k].d }; })) });
          e0.hist = e0.hist.slice(-12); lsSet(KEPT_KEY, kk0);
        }
      }
      render();
      if (opts.onMerge) { try { opts.onMerge(st.env, info); } catch (e) {} }
      return true;
    }
    function fromHash() {
      if (!W.location || !/^#together=/.test(W.location.hash || '')) return false;
      var env = read(W.location.hash);
      if (env && env.t !== tool) return false;   // another tool on this page may want it
      // read once, then taken out of the address bar and this tab's history
      try { W.history.replaceState(W.history.state, '', W.location.pathname + W.location.search); } catch (e) {}
      take(env, 'link');
      // the banner, in view
      setTimeout(function () { try { panel.scrollIntoView({ block: 'start' }); banner.focus({ preventScroll: true }); } catch (e) {} }, 60);
      return true;
    }

    panel.addEventListener('click', function (e) {
      var b = e.target.closest && e.target.closest('[data-k]'); if (!b) return;
      var k = b.getAttribute('data-k');
      if (k === 'side') {
        sideOpen = !sideOpen; drawBanner(); drawSide();
        var t0 = side.querySelector('[data-k="side"]'); if (t0) t0.focus({ preventScroll: true });
        if (sideOpen) { var cv = side.querySelector('.tcol-cmp'); if (cv) try { cv.scrollIntoView({ block: 'nearest' }); } catch (er) {} }
        return;
      }
      if (k === 'hide') { info = null; drawBanner(); var h = panel.querySelector('.tcol-h'); if (h) { h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true }); } return; }
      if (k === 'open') {
        var ta = panel.querySelector('.tcol-pastebox'), env = read(ta.value);
        if (!env) { status(T('That doesn’t look like a link or a code from this site. Copy all of it and try again.', 'Eso no parece un enlace o código de este sitio. Copia todo e inténtalo otra vez.')); ta.focus(); return; }
        if (take(env, 'code') && env.t === tool) { ta.value = ''; paste.open = false; banner.focus({ preventScroll: true }); }
        return;
      }
      if (k === 'use' || k === 'useall') {
        var s = st.env && st.env.p[b.getAttribute('data-id')]; if (!s || !opts.fill) return;
        var cur = mine();
        if (k === 'use') { var f = b.getAttribute('data-f'); cur[f] = clone(s.d[f]); }
        else Object.keys(shareable(s.d)).forEach(function (x) { if (s.d[x] != null && s.d[x] !== '') cur[x] = clone(s.d[x]); });
        try { opts.fill(cur); } catch (er) {}
        draw(); send.refresh();
        status(T('Done. It’s in your part now. Send it back so you both have the same.', 'Listo. Ya está en tu parte. Envíala de vuelta para que los dos tengan lo mismo.'));
        return;
      }
      if (k === 'clear') {
        st.env = null; info = null; whoAsk = null;
        var t = ssGet(TAB_KEY) || {}; delete t[tool]; ssSet(TAB_KEY, Object.keys(t).length ? t : null);
        var kk = lsGet(KEPT_KEY) || {}; delete kk[tool]; lsSet(KEPT_KEY, Object.keys(kk).length ? kk : null);
        st = { env: null, sig: st.sig, at: st.at, r: rid(6) };
        render();
        status(T('Cleared. What they sent is gone from this device. Your own part is still in the form.', 'Borrado. Lo que te enviaron ya no está en este aparato. Tu propia parte sigue en el formulario.'));
        return;
      }
      if (k === 'isme' && whoAsk) {
        // their part was you on another device: it becomes yours here, and the id you send with
        var m = getMe(); m.id = whoAsk.id; saveMe();
        if (st.env && st.env.p[whoAsk.id]) { var d0 = st.env.p[whoAsk.id].d; delete st.env.p[whoAsk.id]; if (opts.fill && mineBlank()) { try { opts.fill(clone(d0)); } catch (er) {} } }
        whoAsk = null; persist(); render(); status(T('Got it. That part is yours on this device now.', 'Entendido. Esa parte es tuya en este aparato ahora.'));
        return;
      }
      if (k === 'notme') { whoAsk = null; drawPick(); return; }
    });
    panel.addEventListener('change', function (e) {
      if (!e.target.classList.contains('tcol-keepbox')) return;
      keepOn = e.target.checked; persist();
      status(keepOn ? T('Kept on this device. “Clear what you received” removes it.', 'Guardado en este aparato. «Borrar lo que recibiste» lo quita.') : T('Not kept on this device now.', 'Ya no se guarda en este aparato.'));
    });
    nameInput().addEventListener('input', function () { if (!getMe().fresh) saveMe(myName()); send.refresh(); });
    W.addEventListener('hashchange', fromHash);
    // the form changes: the links follow (and "Use this" buttons come and go)
    var tm = 0;
    function changed() { clearTimeout(tm); tm = setTimeout(function () { myAt(); draw(); send.refresh(); }, 250); }

    render();
    fromHash();
    return {
      el: panel, changed: changed, refresh: function () { draw(); send.refresh(); },
      env: function () { return st.env; }, current: current, take: take,
      // the link as it is now (a tool's own Copy or QR button): your random id is kept from here on
      link: function () { var u = url(); if (u && getMe().fresh) saveMe(myName() || null); return u; },
      others: function () { return others().map(function (id) { return { id: id, n: st.env.p[id].n, at: st.env.p[id].at, d: clone(st.env.p[id].d) }; }); }
    };
  }


  // ============================================================== joining: answers side by side
  // people: [{ id, n (name), me (true for you), d (their answers) }]. Plain data in, plain data out (node-testable).
  function normV(v) {
    if (Array.isArray(v)) return v.map(normV).filter(function (x) { return x !== ''; }).sort();
    if (v == null) return '';
    if (typeof v === 'object') return JSON.stringify(v);
    return String(v).replace(/\s+/g, ' ').trim().toLowerCase();
  }
  function filled(v) { return Array.isArray(v) ? v.length > 0 : v != null && String(v).trim() !== '' && v !== false; }
  // one row per answer: everyone's value, whether they match, and (for lists of choices) what they share
  function combineFields(people, fields) {
    var keys = fields && fields.length ? fields.map(function (f) { return f.k; }) : [];
    if (!keys.length) people.forEach(function (p) { Object.keys(p.d || {}).forEach(function (k) { if (keys.indexOf(k) < 0) keys.push(k); }); });
    var rows = [], same = 0, differ = 0, missing = 0;
    keys.forEach(function (k) {
      var vals = people.map(function (p) { return p.d ? p.d[k] : undefined; });
      var have = vals.filter(filled);
      if (!have.length) return;
      var row = { k: k, vals: vals, same: false, missing: have.length < people.length };
      if (have.length >= 2) {
        if (have.every(Array.isArray)) {
          var sets = have.map(function (a) { return normV(a); });
          row.common = sets[0].filter(function (x) { return sets.every(function (s) { return s.indexOf(x) >= 0; }); });
          // the shared choices, in the first person's own words
          row.common = have[0].filter(function (x) { return row.common.indexOf(normV(x)) >= 0; });
          row.same = sets.every(function (s) { return JSON.stringify(s) === JSON.stringify(sets[0]); });
        } else {
          var n0 = JSON.stringify(normV(have[0]));
          row.same = have.every(function (v) { return JSON.stringify(normV(v)) === n0; });
        }
        if (row.same) same++; else differ++;
      }
      if (row.missing) missing++;
      rows.push(row);
    });
    return { rows: rows, same: same, differ: differ, missing: missing };
  }
  // scores: everyone's value and the gap, with no "winner". o: { higher: 'load' (higher means more), digits }
  function combineScore(people, o) {
    o = o || {};
    var vals = people.map(function (p) { var v = p.d ? +p.d[o.k || 's'] : NaN; return { id: p.id, n: p.n, me: !!p.me, v: isFinite(v) ? v : null }; });
    var have = vals.filter(function (x) { return x.v !== null; });
    var res = { vals: vals, gap: null, high: null, close: true };
    if (have.length < 2) return res;
    var hi = have.reduce(function (a, b) { return b.v > a.v ? b : a; }), lo = have.reduce(function (a, b) { return b.v < a.v ? b : a; });
    res.gap = Math.round((hi.v - lo.v) * 100) / 100;
    res.close = res.gap < (o.close != null ? o.close : 0.1);
    res.high = res.close ? null : hi;
    return res;
  }
  // lists: one merged list, duplicates joined (case and spaces don't matter), with who added each one
  function combineList(people, o) {
    o = o || {};
    var items = [], at = {};
    people.forEach(function (p) {
      (Array.isArray(p.d && p.d[o.k || 'items']) ? p.d[o.k || 'items'] : []).forEach(function (it) {
        var text = typeof it === 'string' ? it : it && (it.t || it.text || it.name) || '';
        text = String(text).replace(/\s+/g, ' ').trim(); if (!text) return;
        var key = text.toLowerCase();
        if (at[key] == null) { at[key] = items.length; items.push({ text: text, by: [], extra: [] }); }
        var row = items[at[key]];
        if (row.by.indexOf(p.n) < 0) row.by.push(p.n);
        if (it && typeof it === 'object' && it.x) row.extra.push({ n: p.n, x: String(it.x) });
      });
    });
    var shared = items.filter(function (r) { return r.by.length > 1; }).length;
    return { items: items, shared: shared };
  }
  // the kind words for a gap between two or more scores
  function gapWords(res, o) {
    o = o || {};
    if (res.gap === null) return T('Only one score so far. When the others send theirs, the gap shows here.', 'Por ahora solo hay un puntaje. Cuando los demás envíen el suyo, la diferencia aparece aquí.');
    var g = res.gap.toFixed(2);
    if (res.close) return T('Your scores are close (a gap of ' + g + '). Neither of you is carrying much more than the other right now.', 'Sus puntajes están cerca (una diferencia de ' + g + '). Ahora mismo nadie carga mucho más que el otro.');
    var who = res.high.me ? T('yours', 'el tuyo') : (res.high.n || T('one of yours', 'uno de ustedes')) + T('’s', '');
    return o.words ? o.words(res, g) : T('A gap of ' + g + ': ' + who + ' reads higher right now. That isn’t a contest or anyone’s fault. It’s a reason to look at what’s on each plate this week.', 'Una diferencia de ' + g + ': ' + who + ' está más alto ahora. No es una competencia ni culpa de nadie. Es una razón para mirar qué tiene cada uno esta semana.');
  }

  // ---- the side-by-side view on the page (only text, never HTML)
  function personName(p) { return p.me ? (p.n ? p.n + T(' (you)', ' (tú)') : T('You', 'Tú')) : (p.n || T('Someone', 'Alguien')); }
  function showVal(v, fmt, k) {
    if (fmt) { var r = fmt(k, v); if (r != null) return String(r); }
    if (Array.isArray(v)) return v.join(', ');
    if (v === true) return T('Yes', 'Sí'); if (v === false || v == null) return '';
    return String(v);
  }
  // opts: { kind: 'fields'|'score'|'list', fields, label(k), format(k, v), next (a sentence), title, scoreLabel, k }
  function combinedView(people, opts) {
    css();
    opts = opts || {};
    var box = mk('div', { cls: 'tcol-cmp' });
    if (opts.title) box.appendChild(mk('h4', { cls: 'tcol-cmp-h', text: opts.title }));
    var label = opts.label || function (k) { var f = (opts.fields || []).filter(function (x) { return x.k === k; })[0]; return f ? T(f.en, f.es || f.en) : k; };
    var kind = opts.kind || 'fields', summary = '';
    if (kind === 'score') {
      var res = combineScore(people, opts);
      var ul = mk('ul', { cls: 'tcol-cmp-scores' });
      res.vals.forEach(function (v) { ul.appendChild(mk('li', {}, [mk('strong', { text: personName(people.filter(function (p) { return p.id === v.id; })[0] || v) + ': ' }), v.v === null ? T('not answered yet', 'todavía sin responder') : v.v.toFixed(opts.digits == null ? 2 : opts.digits) + (opts.scoreLabel ? ' ' + opts.scoreLabel : '')])); });
      box.appendChild(ul);
      summary = gapWords(res, opts);
      box.appendChild(mk('p', { cls: 'tcol-cmp-sum', text: summary }));
    } else if (kind === 'list') {
      var L = combineList(people, opts), ol = mk('ul', { cls: 'tcol-cmp-list' });
      L.items.forEach(function (it) {
        var li = mk('li', { cls: it.by.length > 1 ? 'is-same' : '' }, [mk('span', { cls: 'tcol-cmp-item', text: it.text }), ' ',
          mk('span', { cls: 'tcol-cmp-by', text: it.by.length === people.length && people.length > 1 ? T('everyone', 'todos') : T('added by ', 'de ') + it.by.join(', ') })]);
        it.extra.forEach(function (e) { li.appendChild(mk('span', { cls: 'tcol-cmp-x', text: e.n + ': ' + e.x })); });
        ol.appendChild(li);
      });
      summary = L.items.length ? T(L.items.length + (L.items.length === 1 ? ' item' : ' items') + ' in all' + (L.shared ? ', ' + L.shared + ' on more than one list (joined into one).' : '.'), L.items.length + ' en total' + (L.shared ? ', ' + L.shared + ' en más de una lista (unidos en uno).' : '.')) : T('Nothing on the lists yet.', 'Todavía no hay nada en las listas.');
      box.appendChild(mk('p', { cls: 'tcol-cmp-sum', text: summary }));
      box.appendChild(ol);
    } else {
      var F = combineFields(people, opts.fields);
      summary = people.length < 2 ? '' : T('You match on ' + F.same + ' and see ' + F.differ + ' differently.', 'Coinciden en ' + F.same + ' y lo ven distinto en ' + F.differ + '.') + (F.missing ? T(' Some answers are only on one side.', ' Algunas respuestas están solo de un lado.') : '');
      if (summary) box.appendChild(mk('p', { cls: 'tcol-cmp-sum', text: summary }));
      F.rows.forEach(function (r) {
        var row = mk('div', { cls: 'tcol-cmp-row' + (r.same ? ' is-same' : '') });
        var h = mk('p', { cls: 'tcol-cmp-k' }, [mk('strong', { text: label(r.k) })]);
        if (people.length > 1 && !r.missing) h.appendChild(mk('span', { cls: 'tcol-tag' + (r.same ? ' is-same' : ''), text: r.same ? T('Same', 'Igual') : T('Different', 'Distinto') }));
        row.appendChild(h);
        var ul2 = mk('ul', { cls: 'tcol-cmp-vals' });
        people.forEach(function (p, i) { var t = showVal(r.vals[i], opts.format, r.k); ul2.appendChild(mk('li', {}, [mk('span', { cls: 'tcol-cmp-who', text: personName(p) + ': ' }), t || T('(left blank)', '(en blanco)')])); });
        row.appendChild(ul2);
        if (r.common && r.common.length && !r.same) row.appendChild(mk('p', { cls: 'tcol-cmp-common', text: T('You both chose: ', 'Los dos eligieron: ') + r.common.join(', ') }));
        box.appendChild(row);
      });
    }
    var next = typeof opts.next === 'function' ? opts.next(people) : opts.next;
    if (next) box.appendChild(mk('p', { cls: 'tcol-cmp-next' }, [mk('strong', { text: T('One next step: ', 'Un paso siguiente: ') }), next]));
    box.appendChild(mk('p', { cls: 'tcol-priv', text: T('Their answers came inside the link. Nothing is stored on our side.', 'Sus respuestas llegaron dentro del enlace. No se guarda nada de nuestro lado.') }));
    // "Save this combined view" in My saved entries (progress.js), where the device keeps them
    var P = W && W.TOLProgress;
    if (P && typeof P.saveEntry === 'function' && (typeof P.level !== 'function' || P.level() !== 'shared')) {
      var sv = mk('button', { type: 'button', cls: 'tcol-btn tcol-quiet', text: T('Save this combined view', 'Guardar esta vista combinada') }), sst = mk('span', { cls: 'tcol-small', role: 'status' });
      sv.addEventListener('click', function () {
        var text = combinedText(people, opts);
        Promise.resolve().then(function () { return P.saveEntry({ tool: 'together' + (opts.tool ? ':' + opts.tool : ''), title: opts.title || T('Combined view', 'Vista combinada'), text: text, data: { people: people.map(function (p) { return { n: p.n, me: !!p.me, d: p.d }; }), kind: kind } }); })
          .then(function (r) { sst.textContent = r === false ? T(' Couldn’t save it here.', ' No se pudo guardar aquí.') : T(' Saved in My saved entries, on this device only.', ' Guardado en Mis entradas guardadas, solo en este aparato.'); }, function () { sst.textContent = T(' Couldn’t save it here.', ' No se pudo guardar aquí.'); });
      });
      box.appendChild(mk('p', {}, [sv, sst]));
    }
    return box;
  }
  // the same view as plain text (for saving or copying)
  function combinedText(people, opts) {
    opts = opts || {};
    var label = opts.label || function (k) { var f = (opts.fields || []).filter(function (x) { return x.k === k; })[0]; return f ? f.en : k; };
    var out = [opts.title || 'Combined view'];
    if (opts.kind === 'score') { var r = combineScore(people, opts); r.vals.forEach(function (v) { out.push((v.n || 'Someone') + ': ' + (v.v === null ? '-' : v.v.toFixed(2))); }); out.push(gapWords(r, opts)); }
    else if (opts.kind === 'list') combineList(people, opts).items.forEach(function (it) { out.push('- ' + it.text + ' (' + it.by.join(', ') + ')'); });
    else combineFields(people, opts.fields).rows.forEach(function (row) { out.push(label(row.k) + (row.same ? ' (same)' : '') + ': ' + people.map(function (p, i) { return (p.n || 'Someone') + ' ' + showVal(row.vals[i], opts.format, row.k); }).join(' · ')); });
    return out.join('\n');
  }

  var API = {
    version: VERSION, HASH: HASH, CODE: CODE, LONG: LONG,
    pack: pack, packSync: packSync, unpack: unpack, unpackSync: unpackSync,
    deflateRaw: deflateRaw, inflateRaw: inflateRaw, b64e: b64e, b64d: b64d,
    clean: cleanEnv, envelope: envelope, merge: merge, changedKeys: changedKeys,
    link: link, linkAsync: linkAsync, code: code, codeOf: codeOf, read: read, has: has, isLong: isLong, wrap: wrap,
    me: getMe, saveMe: saveMe, rid: rid,
    smsHref: smsHref, mailHref: mailHref,
    sendBlock: sendBlock, sendSheet: sendSheet, closeSheet: closeSheet, attach: attach,
    combine: { fields: combineFields, score: combineScore, list: combineList, gapWords: gapWords, view: combinedView, text: combinedText },
    keys: { me: ME_KEY, kept: KEPT_KEY, tab: TAB_KEY }
  };
  if (W) W.TOLCollab = API;
  if (typeof module === 'object' && module.exports) module.exports = API;
})(this);
