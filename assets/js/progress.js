/* progress.js — "Your progress": keep what you've done here safe and private, in the browser or the app.
   window.TOLProgress. Loaded by site.js: right away on /on-this-device.html (the "Your progress" section),
   and a little after load on other pages when this browser keeps anything at all.

   Everything happens on this device. There is no account and no server. Nothing leaves the device unless the
   person saves a file or sends a link themselves.

   What it does
   - Collects the site's own notes in localStorage (the list on /on-this-device.html, plus any other tol-* key),
     leaving out looks-only settings (dark, text size, quiet mode…), invitations seen, the email sign-up and the
     weather location. sessionStorage (this tab only) is never collected. The site keeps nothing in IndexedDB.
   - "Save a backup": one file, spread-love-progress-YYYY-MM-DD.json. With a password it is encrypted
     (AES-GCM 256, key from PBKDF2-SHA256, 310,000 rounds, random salt and IV; the header is bound in as
     additional data, so a changed header fails too). Without one, the page says plainly that anyone with the
     file can read it. Phones get the share sheet (Files, iCloud Drive, Google Drive, email to yourself);
     elsewhere it downloads.
   - "Restore from a backup": pick the file, password if it has one, see what's in it (tool names and dates,
     never the contents), then Add (newer wins, key by key) or Replace. Strict checks: size limits, only this
     site's own key names, strings only, no HTML or script-looking values. Nothing in a file is ever run.
   - "Move to another device / into the app": the same payload as a link, /on-this-device.html#restore=…
     (after the #, so it never reaches any server), with a QR code when it is short enough. Opening one only
     offers to restore. The hash is removed from the address bar as soon as it's read.
   - navigator.storage.persist(): asked once when something meaningful is first saved, and on each start of
     the installed app; never automatically in Firefox (it asks with a pop-up there: the button does it).
   - One gentle tip on iPhone/iPad Safari (the Home Screen app isn't cleared after 7 days, and has its own
     storage: here's how to bring things over), and a backup reminder at most once a month (on, dismissible,
     "Don't remind me" turns it off; also a switch on the page).

   localStorage keys of its own (both left out of backups):
     tol-backup-v1          { last: last backup, nudged: last reminder, since: first meaningful save,
                              tip: iPhone tip shown, off: reminder off, asked: persistence asked, kept: answer }
     tol-progress-times-v1  { key: [fingerprint, time it last changed] } so "Add" can keep whichever is newer

   API (also require()-able in node for tools/progress/test-progress.js)
     TOLProgress.collect(storage)                → { keys, times }
     TOLProgress.makeBackup(payload, password)   → Promise<string> (the file's text)
     TOLProgress.readBackup(text, password)      → Promise<{ created, keys, times }>   (throws ProgressError)
     TOLProgress.inspect(text)                   → { encrypted } (throws on a file that isn't a backup)
     TOLProgress.packLink(payload, password)     → Promise<string> packed, for #restore=
     TOLProgress.unpackLink(packed, password)    → Promise<payload>
     TOLProgress.linkInfo(packed)                → { encrypted }
     TOLProgress.validate(obj)                   → cleaned payload (throws)
     TOLProgress.restore(payload, mode, storage) → { added, updated, kept, removed, failed }
     TOLProgress.summary(payload)                → [{ name, n, last }]
     TOLProgress.persist() / .persisted()        → Promise<boolean|null>
*/
(function (G) {
  'use strict';
  var W = typeof window !== 'undefined' ? window : null;
  var D = W && W.document;
  if (W && W.TOLProgress) return;

  var FORMAT = 'spread-love-progress', VERSION = 1;
  var ITER = 310000, MAX_ITER = 2000000;
  var MAX_FILE = 6 * 1024 * 1024;          // characters in a backup file
  var MAX_VALUE = 1500000;                 // characters in one stored value
  var MAX_TOTAL = 5 * 1024 * 1024;         // characters in all values together (localStorage holds about 5 MB)
  var MAX_KEYS = 600;
  var MAX_LINK = 40000;                    // characters after #restore= (longer: use a file)
  var MAX_INFLATE = 12 * 1024 * 1024;      // bytes a link may unpack to
  var STATE_KEY = 'tol-backup-v1', TIMES_KEY = 'tol-progress-times-v1';
  var DAY = 86400000;
  var OLDEST = Date.UTC(2020, 0, 1);

  function T(en, es) { try { return W && W.TOLLang && W.TOLLang.es() ? es : en; } catch (e) { return en; } }

  // ------------------------------------------------------------------ which keys are progress
  // Left out: looks-only settings, invitations and tips seen, visit lists, the email sign-up, the weather spot.
  var SKIP = ['tol-theme', 'tol-text-size', 'tol-contrast', 'tol-font', 'tol-spacing', 'tol-tint', 'tol-ruler', 'tol-easy',
    'tol-nobubbles', 'tol-quiet', 'tol-comfort-prev', 'tol-comfort-offer', 'tol-still', 'tol-hide-helpers', 'tol-sound-off',
    'tol-listen-rate', 'tol-recent', 'tol-recent-off', 'tol-visit-days', 'tol-depth-seen', 'tol-depth-pref', 'tol-weather-nudge',
    'tol-weather-nudge-seen', 'tol-clip-', 'tol-member-email', 'tol-join-pending', 'tol-join-pop-prev', 'tol-install-asked',
    'tol-palcam-pop-last', 'tol-appad-off', 'tol-app-installed', 'tol-es-hint', 'tol-puddles-hi-seen', 'tol-wide',
    'tol-keys-hint', 'tol-book-dl', 'tol-book-extras', 'tol-pc-wx', 'tol-pc-', 'tol-clockwx-off', 'tol-clockwx-on',
    'tol-work-keep', 'tol-ios-welcome', 'tol-keepask-test', 'tol-home-app-strip', STATE_KEY, TIMES_KEY];
  // [key, or a prefix ending in - or :] → group; groups marked * are things a person made or wrote (meaningful)
  var CAT = [
    ['tol-jobs-log-v1', 'checkin'], ['tol-small-wins', 'wins'], ['tol-ten-v1', 'ten'], ['tol-ten-log-v1', 'ten'],
    ['tol-weather-v1', 'weather'], ['tol-prog01-v1', 'six'], ['tol-wpf-keep:', 'sheets'], ['tol-keep-off:', 'sheetset'],
    ['tol-keepask-kept', 'sheetset'], ['tol-roots-v1', 'roots'], ['tol-wiring-card', 'wiring'],
    ['tol-wavelength-v1', 'wave'], ['tol-wavelength-people-v1', 'wave'], ['tol-heartprint-v1', 'wave'], ['tol-pawprint-v1', 'wave'],
    ['tol-lemonade-stand-v2', 'lemon'], ['tol-lemonade-quick', 'lemon'], ['tol-lemonade-mode', 'lemonset'],
    ['tol-calc01-full-v2', 'calc01'], ['tol-calc02-v1', 'calc02'], ['tol-time-deal-v1', 'deal'], ['tol-work-owners-v1', 'work'],
    ['tol-recheck-drive-v1', 'drive'], ['tol-rulebook', 'rules'], ['tol-pause-plan-v1', 'pause'], ['tol-household-v1', 'house'],
    ['cwd-v1', 'cwd'], ['cwd-consent', 'cwdset'], ['tol-tt-', 'tt'], ['tol-letters', 'letters'], ['tol-family-plan', 'family'],
    ['tol-our-week', 'week'], ['tol-ctx-people', 'ctx'], ['tol-selfpath-v1', 'self'], ['tol-mv-maker-v1', 'mv'],
    ['tol-take-in', 'takein'], ['tol-progress-v1', 'reading'], ['tol-come-back-v1', 'reading'], ['tol-reading-v1', 'reading'],
    ['tol-focus', 'reading'], ['tol-mode-v1', 'reading'], ['tol-bb-last', 'reading'], ['tol-booktopic-v', 'reading'],
    ['tol-night-garden-v1', 'garden'], ['tol-garden-gifts', 'garden'], ['tol-learnplay-v1', 'games'], ['tol-rewards-v1', 'games'],
    ['tol-levels-', 'games'], ['tol-arcade-v1', 'games'], ['tol-journey-v1', 'games'], ['tol-bloom-', 'games'], ['tol-xw-', 'games'],
    ['tol-np-', 'games'], ['tol-qw-', 'games'], ['tol-bb-count', 'games'], ['bears-dojo-', 'games'], ['tol-palcam-', 'games'],
    ['tol-buddies-v1', 'watch'], ['tol-fb-s2-teaser', 'watch'], ['tol-music-video-v1', 'watch'], ['tol-drift-v1', 'watch'],
    ['tol-br-', 'calm'], ['tol-sound-', 'calm'], ['tol-haptic', 'calm'], ['tol-sense-look', 'calm'], ['tol-mini-', 'calm'],
    ['tol-bonding-picker', 'picks'], ['tol-freq-mode', 'picks'], ['tol-st-simple', 'picks'], ['tol-st-brief', 'picks']
  ];
  var GROUPS = {
    checkin: ['*', 'This week’s check-in: jobs that keep coming back', 'Revisión de la semana: tareas que vuelven'],
    wins: ['*', 'Small wins', 'Pequeños logros'],
    ten: ['*', 'Start in 10 minutes', 'Empieza en 10 minutos'],
    weather: ['*', 'Today’s Weather almanac', 'El almanaque del clima de hoy'],
    six: ['*', 'Six gentle weeks', 'Seis semanas tranquilas'],
    sheets: ['*', 'Worksheets you kept', 'Hojas de trabajo guardadas'],
    sheetset: ['', 'Worksheet keeping choices', 'Opciones para guardar hojas'],
    roots: ['*', 'Roots & Wings', 'Raíces y alas'],
    wiring: ['*', 'Your Wiring Card', 'Tu tarjeta de conexiones'],
    wave: ['*', 'Wavelength', 'Wavelength'],
    lemon: ['*', 'The Lemonade Stand', 'El puesto de limonada'],
    lemonset: ['', 'The Lemonade Stand: just me or with others', 'El puesto de limonada: solo o con otros'],
    calc01: ['*', 'Is the setup working for everyone?', '¿Funciona el reparto para todos?'],
    calc02: ['*', 'Look back over 30 days', 'Mirar atrás 30 días'],
    deal: ['*', 'Your time-together deal', 'Su acuerdo de tiempo juntos'],
    work: ['*', 'Who owns what at work', 'Quién se encarga de qué en el trabajo'],
    drive: ['*', 'The Re-check Drive', 'The Re-check Drive'],
    rules: ['*', 'The rulebook from home', 'Las reglas de casa'],
    pause: ['*', 'Your pause plan', 'Su plan de pausa'],
    house: ['*', 'Your household', 'Tu hogar'],
    cwd: ['*', 'The Carrier Wave Decoder', 'The Carrier Wave Decoder'],
    cwdset: ['', 'Decoder saving', 'Guardar el Decoder'],
    tt: ['*', 'Turning Toward', 'Acercarse'],
    letters: ['*', 'Written conversations', 'Conversaciones por escrito'],
    family: ['*', 'Check-ins: the family plan', 'Revisiones: el plan familiar'],
    week: ['*', 'Different hours: our week', 'Horarios distintos: nuestra semana'],
    ctx: ['*', 'Context for a person', 'Contexto sobre una persona'],
    self: ['*', 'Your self path', 'Tu camino personal'],
    mv: ['*', 'Your music video', 'Tu video musical'],
    takein: ['', 'How you take things in', 'Cómo asimilas las cosas'],
    reading: ['', 'Reading: chapters, plans and picks', 'Lectura: capítulos, planes y elecciones'],
    garden: ['', 'The Night Garden', 'El jardín nocturno'],
    games: ['', 'Games and puzzles', 'Juegos y pasatiempos'],
    watch: ['', 'Frequency Buddies and visualizers', 'Frequency Buddies y visualizadores'],
    calm: ['', 'Breathing and calm sounds', 'Respiración y sonidos tranquilos'],
    picks: ['', 'Tool choices', 'Opciones de las herramientas'],
    other: ['', 'Other notes from the site', 'Otras notas del sitio']
  };
  function matches(k, p) { return k === p || (/[-:]$/.test(p) && k.indexOf(p) === 0); }
  function ours(k) { return typeof k === 'string' && /^(tol-|cwd-|bears-dojo-)[A-Za-z0-9:_.\-]{1,160}$/.test(k); }
  function skipped(k) { for (var i = 0; i < SKIP.length; i++) if (matches(k, SKIP[i]) || (SKIP[i] === 'tol-comfort-prev' && k.indexOf('tol-comfort-prev') === 0)) return true; return false; }
  function included(k) { return ours(k) && !skipped(k); }
  function groupOf(k) { for (var i = 0; i < CAT.length; i++) if (matches(k, CAT[i][0])) return CAT[i][1]; return 'other'; }
  function meaningful(k) { return GROUPS[groupOf(k)][0] === '*'; }
  function groupName(g) { var x = GROUPS[g] || GROUPS.other; return T(x[1], x[2]); }

  // ------------------------------------------------------------------ small helpers
  function ProgressError(code, msg) { var e = new Error(msg || code); e.name = 'ProgressError'; e.code = code; return e; }
  function isObj(o) { return !!o && typeof o === 'object' && Object.prototype.toString.call(o) === '[object Object]'; }
  function own(o, k) { return Object.prototype.hasOwnProperty.call(o, k); }
  function local() { try { return W.localStorage; } catch (e) { return null; } }
  function storageKeys(st) { var out = []; if (!st) return out; try { for (var i = 0; i < st.length; i++) out.push(st.key(i)); } catch (e) {} return out; }
  function sget(st, k) { try { return st.getItem(k); } catch (e) { return null; } }
  function readJSON(st, k) { try { var v = JSON.parse(sget(st, k) || 'null'); return isObj(v) ? v : null; } catch (e) { return null; } }
  function writeJSON(st, k, v) { try { st.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } }
  function fp(s) { var h = 0x811c9dc5; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return h.toString(36) + '.' + s.length; }
  var enc = typeof TextEncoder !== 'undefined' ? new TextEncoder() : null;
  var dec = typeof TextDecoder !== 'undefined' ? new TextDecoder('utf-8', { fatal: true }) : null;
  function utf8(s) { return enc.encode(s); }
  function unutf8(b) { return dec.decode(b); }
  function b64(bytes) { var s = ''; for (var i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000)); return btoa(s); }
  function unb64(s) {
    if (typeof s !== 'string' || !/^[A-Za-z0-9+/]*={0,2}$/.test(s) || s.length % 4) throw ProgressError('bad', 'not base64');
    var bin = atob(s), out = new Uint8Array(bin.length); for (var i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i); return out;
  }
  function b64url(bytes) { return b64(bytes).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
  function unb64url(s) {
    if (typeof s !== 'string' || !/^[A-Za-z0-9_-]*$/.test(s)) throw ProgressError('bad', 'not base64url');
    s = s.replace(/-/g, '+').replace(/_/g, '/'); while (s.length % 4) s += '='; return unb64(s);
  }
  function cat() { var n = 0, i; for (i = 0; i < arguments.length; i++) n += arguments[i].length; var out = new Uint8Array(n), o = 0; for (i = 0; i < arguments.length; i++) { out.set(arguments[i], o); o += arguments[i].length; } return out; }
  function subtle() { var c = G.crypto || (W && W.crypto); if (!c || !c.subtle) throw ProgressError('nocrypto', 'This browser can’t encrypt.'); return c; }
  function rand(n) { var a = new Uint8Array(n); subtle().getRandomValues(a); return a; }
  function sha256(bytes) { return subtle().subtle.digest('SHA-256', bytes).then(function (h) { return new Uint8Array(h); }); }

  // ------------------------------------------------------------------ crypto: PBKDF2-SHA256 → AES-GCM 256
  function deriveKey(password, salt, iter) {
    var c = subtle();
    return c.subtle.importKey('raw', utf8(String(password).normalize('NFC')), 'PBKDF2', false, ['deriveKey']).then(function (base) {
      return c.subtle.deriveKey({ name: 'PBKDF2', salt: salt, iterations: iter, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
    });
  }
  function seal(bytes, password, aad, iter, salt, iv) {
    return deriveKey(password, salt, iter).then(function (key) {
      return subtle().subtle.encrypt({ name: 'AES-GCM', iv: iv, additionalData: utf8(aad), tagLength: 128 }, key, bytes);
    }).then(function (ct) { return new Uint8Array(ct); });
  }
  function open(ct, password, aad, iter, salt, iv) {
    return deriveKey(password, salt, iter).then(function (key) {
      return subtle().subtle.decrypt({ name: 'AES-GCM', iv: iv, additionalData: utf8(aad), tagLength: 128 }, key, ct);
    }).then(function (pt) { return new Uint8Array(pt); }, function () { throw ProgressError('password', 'wrong password or changed file'); });
  }

  // ------------------------------------------------------------------ compression (links): deflate-raw
  function streamAll(stream, input, cap) {
    var w = stream.writable.getWriter(); w.write(input).catch(function () {}); w.close().catch(function () {});
    var r = stream.readable.getReader(), parts = [], n = 0;
    function pump() {
      return r.read().then(function (x) {
        if (x.done) return cat.apply(null, parts);
        n += x.value.length; if (n > cap) { try { r.cancel(); } catch (e) {} throw ProgressError('big', 'too big'); }
        parts.push(x.value); return pump();
      });
    }
    return pump();
  }
  function hasCS() { return typeof CompressionStream === 'function' && typeof DecompressionStream === 'function'; }
  function deflate(bytes) {
    if (hasCS()) return streamAll(new CompressionStream('deflate-raw'), bytes, MAX_INFLATE * 2);
    if (W && W.TOLCollab && W.TOLCollab.deflateRaw) return Promise.resolve(W.TOLCollab.deflateRaw(bytes));
    return Promise.resolve(null);
  }
  function inflate(bytes) {
    if (hasCS()) return streamAll(new DecompressionStream('deflate-raw'), bytes, MAX_INFLATE).catch(function (e) { throw e && e.code ? e : ProgressError('bad', 'broken link'); });
    if (W && W.TOLCollab && W.TOLCollab.inflateRaw) { try { return Promise.resolve(W.TOLCollab.inflateRaw(bytes, MAX_INFLATE)); } catch (e) { return Promise.reject(ProgressError('bad', 'broken link')); } }
    return Promise.reject(ProgressError('nozip', 'This browser can’t open this link.'));
  }

  // ------------------------------------------------------------------ the payload: { created, keys, times }
  // Values that look like HTML or script are refused, so nothing from a file or link can reach a page as markup.
  var HTMLISH = /<\s*[a-z!\/?]|javascript\s*:|vbscript\s*:|data\s*:\s*text\/html/i;
  function badString(s, depth) {
    if (typeof s === 'string') return HTMLISH.test(s);
    if (depth > 40) return true;
    if (Array.isArray(s)) { for (var i = 0; i < s.length; i++) if (badString(s[i], depth + 1)) return true; return false; }
    if (s && typeof s === 'object') { for (var k in s) if (own(s, k) && (HTMLISH.test(k) || badString(s[k], depth + 1))) return true; return false; }
    return false;
  }
  function cleanValue(v) {
    if (typeof v !== 'string' || v.length > MAX_VALUE) return null;
    if (/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/.test(v)) return null;
    if (HTMLISH.test(v)) return null;
    if (/^\s*[\[{]/.test(v)) { var p; try { p = JSON.parse(v); } catch (e) { return null; } if (badString(p, 0)) return null; }
    return v;
  }
  function validate(obj) {
    if (!isObj(obj) || !isObj(obj.keys)) throw ProgressError('schema', 'not a progress backup');
    var names = Object.keys(obj.keys);
    if (names.length > MAX_KEYS) throw ProgressError('big', 'too many items');
    var keys = Object.create(null), times = Object.create(null), total = 0, dropped = 0, now = Date.now();
    names.forEach(function (k) {
      if (!included(k)) { dropped++; return; }
      var v = cleanValue(obj.keys[k]);
      if (v === null) { dropped++; return; }
      total += v.length; if (total > MAX_TOTAL) throw ProgressError('big', 'too big');
      keys[k] = v;
    });
    if (!Object.keys(keys).length) throw ProgressError('empty', 'nothing to restore');
    if (obj.times !== undefined && !isObj(obj.times)) throw ProgressError('schema', 'bad times');
    if (isObj(obj.times)) Object.keys(obj.times).forEach(function (k) {
      var t = obj.times[k];
      if (own(keys, k) && typeof t === 'number' && isFinite(t) && t >= OLDEST && t <= now + 2 * DAY) times[k] = Math.round(t);
    });
    var created = typeof obj.created === 'string' && obj.created.length < 40 && !isNaN(Date.parse(obj.created)) ? new Date(Date.parse(obj.created)).toISOString() : null;
    return { created: created, keys: keys, times: times, dropped: dropped };
  }

  // ------------------------------------------------------------------ change times (for "newer wins")
  function readTimes(st) { var t = readJSON(st, TIMES_KEY) || {}, out = Object.create(null); Object.keys(t).forEach(function (k) { var e = t[k]; if (Array.isArray(e) && typeof e[0] === 'string' && typeof e[1] === 'number') out[k] = [e[0], e[1]]; }); return out; }
  function writeTimes(st, t) { var o = {}; Object.keys(t).forEach(function (k) { o[k] = t[k]; }); return writeJSON(st, TIMES_KEY, o); }
  function progressKeys(st) { return storageKeys(st).filter(included).sort(); }
  // notes the time each kept item last changed (seen at page load and when the page is put away)
  function track(st) {
    st = st || local(); if (!st) return;
    var keys = progressKeys(st), t = readTimes(st), now = Date.now(), changed = false, seen = Object.create(null);
    keys.forEach(function (k) {
      seen[k] = 1; var v = sget(st, k); if (v === null) return;
      var h = fp(v); if (!t[k] || t[k][0] !== h) { t[k] = [h, now]; changed = true; }
    });
    Object.keys(t).forEach(function (k) { if (!seen[k]) { delete t[k]; changed = true; } });
    if (changed) writeTimes(st, t);
  }
  function collect(st) {
    st = st || local();
    var keys = {}, times = {}, t = readTimes(st);
    progressKeys(st).forEach(function (k) { var v = sget(st, k); if (v === null) return; keys[k] = v; times[k] = t[k] ? t[k][1] : Date.now(); });
    return { created: new Date().toISOString(), keys: keys, times: times };
  }
  function hasMeaningful(st) { return progressKeys(st || local()).some(function (k) { return meaningful(k) && (sget(st || local(), k) || '').length > 2; }); }

  // ------------------------------------------------------------------ backup file
  function aadFile(iter, created) { return FORMAT + '|' + VERSION + '|file|PBKDF2-SHA256|' + iter + '|AES-GCM-256|' + created; }
  function inner(p) { return JSON.stringify({ created: p.created || new Date().toISOString(), keys: p.keys, times: p.times || {} }); }
  function makeBackup(payload, password) {
    var created = payload.created || new Date().toISOString(), body = inner({ created: created, keys: payload.keys, times: payload.times });
    var head = { format: FORMAT, version: VERSION, created: created, site: 'spreadloveandacceptance.com' };
    if (!password) {
      var data = JSON.parse(body);
      return sha256(utf8(JSON.stringify(data))).then(function (h) {
        head.encrypted = false;
        head.note = 'No password: anyone who opens this file can read it. Open it on spreadloveandacceptance.com/on-this-device.html to restore.';
        head.check = 'sha256:' + b64(h);
        head.data = data;
        return JSON.stringify(head, null, 1);
      });
    }
    var salt = rand(16), iv = rand(12);
    return seal(utf8(body), password, aadFile(ITER, created), ITER, salt, iv).then(function (ct) {
      head.encrypted = true;
      head.note = 'Locked with a password. Open it on spreadloveandacceptance.com/on-this-device.html to restore.';
      head.kdf = { name: 'PBKDF2', hash: 'SHA-256', iterations: ITER, salt: b64(salt) };
      head.cipher = { name: 'AES-GCM', bits: 256, iv: b64(iv) };
      head.data = b64(ct);
      return JSON.stringify(head, null, 1);
    });
  }
  function parseFile(text) {
    if (typeof text !== 'string' || !text.length) throw ProgressError('schema', 'empty');
    if (text.length > MAX_FILE) throw ProgressError('big', 'file too big');
    var f; try { f = JSON.parse(text); } catch (e) { throw ProgressError('schema', 'not JSON'); }
    if (!isObj(f) || f.format !== FORMAT) throw ProgressError('schema', 'not a progress backup');
    if (f.version !== VERSION) throw ProgressError('version', 'made by a newer version');
    if (typeof f.created !== 'string' || f.created.length > 40 || isNaN(Date.parse(f.created))) throw ProgressError('schema', 'bad date');
    if (f.encrypted === true) {
      var k = f.kdf, c = f.cipher;
      if (!isObj(k) || k.name !== 'PBKDF2' || k.hash !== 'SHA-256' || typeof k.iterations !== 'number' || k.iterations % 1 || k.iterations < ITER || k.iterations > MAX_ITER) throw ProgressError('schema', 'bad kdf');
      if (!isObj(c) || c.name !== 'AES-GCM' || c.bits !== 256 || typeof f.data !== 'string') throw ProgressError('schema', 'bad cipher');
      var salt = unb64(k.salt), iv = unb64(c.iv);
      if (salt.length !== 16 || iv.length !== 12) throw ProgressError('schema', 'bad salt or iv');
    } else if (f.encrypted === false) {
      if (!isObj(f.data) || typeof f.check !== 'string') throw ProgressError('schema', 'bad data');
    } else throw ProgressError('schema', 'bad header');
    return f;
  }
  function inspect(text) { var f = parseFile(text); return { encrypted: f.encrypted, created: f.created }; }
  function readBackup(text, password) {
    var f;
    try { f = parseFile(text); } catch (e) { return Promise.reject(e); }
    if (!f.encrypted) {
      return sha256(utf8(JSON.stringify(f.data))).then(function (h) {
        if ('sha256:' + b64(h) !== f.check) throw ProgressError('changed', 'the file was changed');
        return validate(f.data);
      });
    }
    if (!password) return Promise.reject(ProgressError('needpassword', 'password needed'));
    var ct; try { ct = unb64(f.data); } catch (e) { return Promise.reject(e); }
    return open(ct, password, aadFile(f.kdf.iterations, f.created), f.kdf.iterations, unb64(f.kdf.salt), unb64(f.cipher.iv)).then(function (pt) {
      var o; try { o = JSON.parse(unutf8(pt)); } catch (e) { throw ProgressError('schema', 'bad contents'); }
      return validate(o);
    });
  }

  // ------------------------------------------------------------------ move link: #restore=1.<flags>.<data>
  //   flags: p = password (salt 16 | iv 12 | AES-GCM of the deflated payload), o = open (sha-256 first 8 bytes | deflated)
  //          z = deflate-raw, n = not compressed
  function aadLink(flags) { return FORMAT + '|' + VERSION + '|link|' + flags + '|PBKDF2-SHA256|' + ITER + '|AES-GCM-256'; }
  function packLink(payload, password) {
    var raw = utf8(inner(payload));
    return deflate(raw).then(function (z) {
      var body = z || raw, flags = (password ? 'p' : 'o') + (z ? 'z' : 'n');
      if (password) {
        var salt = rand(16), iv = rand(12);
        return seal(body, password, aadLink(flags), ITER, salt, iv).then(function (ct) { return '1.' + flags + '.' + b64url(cat(salt, iv, ct)); });
      }
      return sha256(body).then(function (h) { return '1.' + flags + '.' + b64url(cat(h.subarray(0, 8), body)); });
    });
  }
  function splitLink(s) {
    s = String(s || '').trim();
    var at = s.indexOf('#restore='); if (at >= 0) s = s.slice(at + 9);
    if (s.length > MAX_LINK + 10) throw ProgressError('big', 'link too long');
    var m = /^1\.([po])([zn])\.([A-Za-z0-9_-]+)$/.exec(s);
    if (!m) throw ProgressError('schema', 'not a move link');
    return { enc: m[1] === 'p', zip: m[2] === 'z', flags: m[1] + m[2], data: m[3] };
  }
  function linkInfo(s) { var l = splitLink(s); return { encrypted: l.enc }; }
  function unpackLink(s, password) {
    var l; try { l = splitLink(s); } catch (e) { return Promise.reject(e); }
    var bytes; try { bytes = unb64url(l.data); } catch (e) { return Promise.reject(ProgressError('schema', 'broken link')); }
    var step;
    if (l.enc) {
      if (!password) return Promise.reject(ProgressError('needpassword', 'password needed'));
      if (bytes.length < 16 + 12 + 16) return Promise.reject(ProgressError('schema', 'broken link'));
      step = open(bytes.subarray(28), password, aadLink(l.flags), ITER, bytes.subarray(0, 16), bytes.subarray(16, 28));
    } else {
      if (bytes.length < 9) return Promise.reject(ProgressError('schema', 'broken link'));
      var body = bytes.subarray(8);
      step = sha256(body).then(function (h) {
        for (var i = 0; i < 8; i++) if (h[i] !== bytes[i]) throw ProgressError('changed', 'the link was changed');
        return body;
      });
    }
    return step.then(function (body) { return l.zip ? inflate(body) : body; }).then(function (raw) {
      var o; try { o = JSON.parse(unutf8(raw)); } catch (e) { throw ProgressError('schema', 'bad contents'); }
      return validate(o);
    });
  }

  // ------------------------------------------------------------------ restore
  // mode 'merge': add what's missing; where both have it, the newer one wins. 'replace': the backup only.
  function restore(payload, mode, st) {
    st = st || local();
    var res = { added: 0, updated: 0, kept: 0, removed: 0, failed: 0 };
    if (!st) { res.failed = Object.keys(payload.keys).length; return res; }
    track(st);
    var t = readTimes(st), now = Date.now();
    if (mode === 'replace') {
      progressKeys(st).forEach(function (k) { if (!own(payload.keys, k)) { try { st.removeItem(k); delete t[k]; res.removed++; } catch (e) {} } });
    }
    Object.keys(payload.keys).forEach(function (k) {
      var v = payload.keys[k], cur = sget(st, k), when = payload.times[k] || 0;
      if (cur === v) { res.kept++; return; }
      if (cur !== null && mode !== 'replace') {
        var mine = t[k] ? t[k][1] : 0;
        if (!(when > mine)) { res.kept++; return; }
      }
      try { st.setItem(k, v); t[k] = [fp(v), when || now]; if (cur === null) res.added++; else res.updated++; }
      catch (e) { res.failed++; }
    });
    writeTimes(st, t);
    return res;
  }
  function summary(payload) {
    var g = {};
    Object.keys(payload.keys).forEach(function (k) {
      var id = groupOf(k), x = g[id] || (g[id] = { id: id, name: groupName(id), n: 0, last: 0, m: GROUPS[id][0] === '*' });
      x.n++; var t = payload.times[k]; if (t && t > x.last) x.last = t;
    });
    return Object.keys(g).map(function (k) { return g[k]; }).sort(function (a, b) { return (b.m - a.m) || (b.last - a.last) || a.name.localeCompare(b.name); });
  }

  // ------------------------------------------------------------------ persistent storage
  function isFirefox() { return W && /Firefox\//.test(W.navigator.userAgent) && !/Seamonkey/i.test(W.navigator.userAgent); }
  function persisted() {
    var s = W && W.navigator.storage;
    if (!s || !s.persisted) return Promise.resolve(null);
    return s.persisted().catch(function () { return null; });
  }
  function persist() {
    var s = W && W.navigator.storage;
    if (!s || !s.persist) return Promise.resolve(null);
    return s.persist().then(function (r) { setState({ asked: Date.now(), kept: !!r }); return !!r; }, function () { return null; });
  }
  function isApp() { return !!W && ((W.matchMedia && W.matchMedia('(display-mode: standalone)').matches) || W.navigator.standalone === true); }
  function isIOS() { var n = W.navigator; return /iPad|iPhone|iPod/.test(n.userAgent) || (n.platform === 'MacIntel' && n.maxTouchPoints > 1); }
  function state() { return readJSON(local(), STATE_KEY) || {}; }
  function setState(p) { var s = state(); Object.keys(p).forEach(function (k) { if (p[k] === null) delete s[k]; else s[k] = p[k]; }); writeJSON(local(), STATE_KEY, s); return s; }

  var API = {
    FORMAT: FORMAT, VERSION: VERSION, ITER: ITER, MAX_FILE: MAX_FILE, MAX_LINK: MAX_LINK, KEYS: { state: STATE_KEY, times: TIMES_KEY },
    included: included, meaningful: meaningful, groupOf: groupOf,
    collect: collect, track: track, validate: validate, makeBackup: makeBackup, readBackup: readBackup, inspect: inspect,
    packLink: packLink, unpackLink: unpackLink, linkInfo: linkInfo, restore: restore, summary: summary,
    persist: persist, persisted: persisted, ProgressError: ProgressError
  };
  if (typeof module === 'object' && module.exports) module.exports = API;
  if (!D) return;
  W.TOLProgress = API;

  // =====================================================================================================
  // In the browser
  // =====================================================================================================
  var path = decodeURIComponent(location.pathname).replace(/\/$/, '/index.html');
  var PAGE = path === '/on-this-device.html';
  function css() {
    if (D.getElementById('tol-progress-css')) return;
    var l = D.createElement('link'); l.id = 'tol-progress-css'; l.rel = 'stylesheet'; l.href = '/assets/css/progress.css'; D.head.appendChild(l);
  }
  function mk(tag, attrs, text) {
    var e = D.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) { if (attrs[k] === true) e.setAttribute(k, ''); else if (attrs[k] !== false && attrs[k] != null) e.setAttribute(k, attrs[k]); });
    if (text != null) e.textContent = text;
    return e;
  }
  function day(t) {
    try { return new Date(t).toLocaleDateString(T('en-US', 'es'), { month: 'short', day: 'numeric', year: new Date(t).getFullYear() === new Date().getFullYear() ? undefined : 'numeric' }); }
    catch (e) { return new Date(t).toDateString(); }
  }
  function ymd(d) { function p(n) { return (n < 10 ? '0' : '') + n; } return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()); }
  function coarse() { return !!(W.matchMedia && W.matchMedia('(pointer: coarse)').matches); }
  function errText(e) {
    var c = e && e.code;
    if (c === 'password') return T('That password doesn’t open it. Check it (capital letters count) and try again.', 'Esa contraseña no lo abre. Revísala (las mayúsculas cuentan) y prueba otra vez.');
    if (c === 'needpassword') return T('This one is locked with a password. Type it below.', 'Está protegido con contraseña. Escríbela abajo.');
    if (c === 'big') return T('That’s too big to be a backup from this site.', 'Es demasiado grande para ser una copia de este sitio.');
    if (c === 'version') return T('This backup was made by a newer version of the site. Reload the page and try again.', 'Esta copia se hizo con una versión más nueva del sitio. Recarga la página y prueba otra vez.');
    if (c === 'changed') return T('This backup was changed after it was made, so it can’t be trusted. Nothing was restored.', 'Esta copia se cambió después de hacerla, así que no es fiable. No se restauró nada.');
    if (c === 'empty') return T('There’s nothing in it that this site can restore.', 'No hay nada que este sitio pueda restaurar.');
    if (c === 'nozip') return T('This browser can’t open move links. Use a backup file instead.', 'Este navegador no puede abrir enlaces de traslado. Usa un archivo de copia.');
    if (c === 'nocrypto') return T('This browser can’t lock or unlock with a password here. Try an up-to-date browser.', 'Este navegador no puede usar contraseñas aquí. Prueba un navegador actualizado.');
    return T('That isn’t a backup from this site, or it’s damaged. Nothing was changed.', 'No es una copia de este sitio, o está dañada. No se cambió nada.');
  }

  // ---------------------------------------------------------------- everywhere: times, persistence, tip, reminder
  function quietPage() {
    var h = D.documentElement.classList, b = D.body;
    var inFrame = true; try { inFrame = W.self !== W.top; } catch (e) {}
    return inFrame || PAGE || !b || b.hasAttribute('data-no-tip') || h.contains('tol-no-helpers') || h.contains('tol-work') ||
      /^\/(safety|upset-right-now|install|404|offline|privacy-policy)\.html$|^\/legal\//.test(path) || !D.querySelector('main');
  }
  function autoPersist() {
    var st = local(); if (!st || !W.navigator.storage || !W.navigator.storage.persist) return;
    if (isFirefox()) return;   // Firefox asks with a pop-up: only from the button on the progress page
    var app = isApp(), s = state();
    if (!app && (s.asked || !hasMeaningful(st))) return;
    persisted().then(function (p) {
      if (p) { if (!s.kept) setState({ kept: true }); return; }
      if (app || !s.asked) persist();
    });
  }
  function noteSince() { var s = state(); if (!s.since && hasMeaningful(local())) setState({ since: Date.now() }); }
  var card = null;
  function closeCard() { if (card) { card.remove(); card = null; } }
  function showCard(kind) {
    css();
    var es = T(false, true), c = mk('aside', { class: 'tp-card-pop no-bubble no-print', role: 'region', 'aria-label': kind === 'tip' ? T('Keep your progress', 'Guarda tu progreso') : T('A backup reminder', 'Recordatorio de copia') });
    var h = mk('p', { class: 'tp-pop-h' }, kind === 'tip' ? T('Keep your progress safe on this iPhone', 'Guarda tu progreso en este iPhone') : T('Keep a copy of your progress?', '¿Guardar una copia de tu progreso?'));
    if (kind === 'tip' && /iPad/.test(W.navigator.userAgent + (W.navigator.maxTouchPoints > 1 && W.navigator.platform === 'MacIntel' ? 'iPad' : ''))) h.textContent = T('Keep your progress safe on this iPad', 'Guarda tu progreso en este iPad');
    c.appendChild(h);
    c.appendChild(mk('p', null, kind === 'tip'
      ? T('What you do here is kept in Safari, and Safari can clear it after 7 days without a visit. The free app on your Home Screen keeps its own copy and isn’t cleared that way. Its storage is separate, so after you install it, bring your progress over with a move link or a backup file.',
          'Lo que haces aquí se guarda en Safari, y Safari puede borrarlo tras 7 días sin visitas. La app gratis en tu pantalla de inicio guarda su propia copia y no se borra así. Su espacio es aparte: después de instalarla, trae tu progreso con un enlace de traslado o un archivo de copia.')
      : T('What you’ve done here is kept only in this browser. A backup file keeps it safe if the browser clears it, and lets you move to a new phone. It stays private: the file goes only where you put it.',
          'Lo que has hecho aquí se guarda solo en este navegador. Un archivo de copia lo protege si el navegador lo borra, y te deja pasarlo a otro teléfono. Es privado: el archivo va solo a donde tú lo pongas.')));
    var acts = mk('p', { class: 'tp-pop-acts' });
    if (kind === 'tip') {
      acts.appendChild(mk('a', { href: '/install.html', class: 'tp-btn is-strong' }, T('Get the free app', 'Obtener la app gratis')));
      acts.appendChild(mk('a', { href: '/on-this-device.html#move', class: 'tp-btn' }, T('How to bring it over', 'Cómo pasarlo')));
    } else {
      acts.appendChild(mk('a', { href: '/on-this-device.html#backup', class: 'tp-btn is-strong' }, T('Save a backup', 'Guardar una copia')));
    }
    var later = mk('button', { type: 'button', class: 'tp-btn' }, T('Not now', 'Ahora no'));
    later.addEventListener('click', function () { closeCard(); });
    acts.appendChild(later);
    if (kind !== 'tip') {
      var off = mk('button', { type: 'button', class: 'tp-link' }, T('Don’t remind me', 'No me lo recuerdes'));
      off.addEventListener('click', function () { setState({ off: 1 }); closeCard(); });
      acts.appendChild(off);
    }
    c.appendChild(acts);
    D.body.appendChild(c); card = c;
    setState(kind === 'tip' ? { tip: Date.now() } : { nudged: Date.now() });
    void es;
  }
  function maybeCard() {
    if (quietPage() || !hasMeaningful(local())) return;
    var s = state(), now = Date.now();
    if (isIOS() && !isApp() && !s.tip) { showCard('tip'); return; }
    if (s.off) return;
    var since = s.since || now, last = s.last || 0, nudged = s.nudged || 0, tipAt = s.tip || 0;
    var due = last ? now - last > 30 * DAY : now - since > 14 * DAY;
    if (due && now - nudged > 30 * DAY && now - tipAt > 7 * DAY) showCard('nudge');
  }
  function everywhere() {
    track(); noteSince(); autoPersist();
    D.addEventListener('visibilitychange', function () { if (D.visibilityState === 'hidden') { track(); noteSince(); autoPersist(); } });
    setTimeout(maybeCard, 3000);
  }

  // ---------------------------------------------------------------- the "Your progress" section (/on-this-device.html)
  function $(id) { return D.getElementById(id); }
  function say(id, text, bad) { var e = $(id); if (!e) return; e.textContent = text; e.classList.toggle('is-bad', !!bad); }
  function pwPair(a, b, msgId) {
    var p1 = $(a), p2 = $(b), v1 = p1 ? p1.value : '', v2 = p2 ? p2.value : '';
    if (!v1 && !v2) return { ok: true, pw: '' };
    if (v1 !== v2) { say(msgId, T('The two passwords aren’t the same. Type them again.', 'Las dos contraseñas no son iguales. Escríbelas otra vez.'), true); (p2 || p1).focus(); return { ok: false }; }
    if (v1.length < 6) { say(msgId, T('Use at least 6 characters, or leave both boxes empty.', 'Usa al menos 6 caracteres, o deja las dos casillas vacías.'), true); p1.focus(); return { ok: false }; }
    return { ok: true, pw: v1 };
  }
  function drawWhat() {
    var host = $('tp-what'); if (!host) return;
    track();
    var p = collect(), list = summary(p);
    host.textContent = '';
    if (!list.length) { host.appendChild(mk('p', { class: 'tp-none' }, T('Nothing saved yet. When you use a tool, what you keep shows up here.', 'Todavía no hay nada guardado. Cuando uses una herramienta, lo que guardes aparecerá aquí.'))); return; }
    host.appendChild(mk('p', { class: 'tp-what-h' }, T('Saved in this browser now:', 'Guardado ahora en este navegador:')));
    var ul = mk('ul', { class: 'tp-list' });
    list.forEach(function (g) {
      var li = mk('li'); li.appendChild(mk('strong', null, g.name));
      li.appendChild(mk('span', null, ' · ' + (g.n === 1 ? T('1 item', '1 elemento') : g.n + T(' items', ' elementos')) + (g.last ? ' · ' + T('changed ', 'cambiado el ') + day(g.last) : '')));
      ul.appendChild(li);
    });
    host.appendChild(ul);
    var s = state();
    host.appendChild(mk('p', { class: 'tp-last' }, s.last ? T('Your last backup: ', 'Tu última copia: ') + day(s.last) + '.' : T('No backup saved from this browser yet.', 'Aún no se ha guardado ninguna copia desde este navegador.')));
  }
  function drawKeep() {
    var e = $('tp-persist'), b = D.querySelector('[data-tp="persist"]'); if (!e) return;
    persisted().then(function (p) {
      if (p === null) { e.textContent = T('This browser doesn’t say whether it will keep it. A backup file is the sure way.', 'Este navegador no dice si lo conservará. Un archivo de copia es lo seguro.'); if (b) b.hidden = true; return; }
      if (p) { e.textContent = T('Protected: this browser has agreed not to clear it to make room. Clearing your history or site data yourself still removes it, so a backup is still wise.', 'Protegido: este navegador aceptó no borrarlo para hacer espacio. Si tú borras el historial o los datos del sitio, se elimina igual, así que una copia sigue siendo buena idea.'); e.className = 'tp-ok'; if (b) b.hidden = true; return; }
      var s = state();
      e.className = '';
      e.textContent = s.asked
        ? T('Not protected yet. This browser decides by itself (often by how much you use the site, or whether it’s installed or bookmarked). A backup is the sure way.', 'Aún no está protegido. El navegador decide solo (a menudo según cuánto usas el sitio, o si está instalado o en marcadores). Una copia es lo seguro.')
        : T('Not protected yet. This browser may clear it if the device runs low on space.', 'Aún no está protegido. Este navegador puede borrarlo si el dispositivo se queda sin espacio.');
      if (b) b.hidden = false;
    });
    var r = $('tp-remind'); if (r) r.checked = !state().off;
  }

  // a backup or link coming in: password if needed → what's in it → Add or Replace
  var incoming = null;
  function inBox() { return $('tp-in'); }
  function startIncoming(src) {
    var box = inBox(); if (!box) return;
    incoming = src; box.hidden = false; box.textContent = '';
    var intro = src.kind === 'link'
      ? T('This link holds progress from another device or browser. Nothing has changed here yet.', 'Este enlace trae progreso de otro dispositivo o navegador. Aquí no ha cambiado nada todavía.')
      : T('Backup file: ', 'Archivo de copia: ') + (src.name || '');
    box.appendChild(mk('p', { class: 'tp-in-h' }, intro));
    if (src.encrypted) {
      var row = mk('p', { class: 'tp-row' });
      var lab = mk('label', { for: 'tp-in-pw' }, T('Its password', 'Su contraseña'));
      var inp = mk('input', { id: 'tp-in-pw', type: 'password', autocomplete: 'current-password', autocapitalize: 'off', spellcheck: 'false' });
      var go = mk('button', { type: 'button', class: 'tp-btn is-strong', 'data-tp': 'unlock' }, T('Open it', 'Abrirlo'));
      row.appendChild(lab); row.appendChild(inp); row.appendChild(go); box.appendChild(row);
      inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); unlock(); } });
      box.appendChild(mk('p', { id: 'tp-in-msg', class: 'tp-status', role: 'status', 'aria-live': 'polite' }));
      box.appendChild(cancelBtn());
      inp.focus();
    } else {
      box.appendChild(mk('p', { id: 'tp-in-msg', class: 'tp-status', role: 'status', 'aria-live': 'polite' }, T('Reading it…', 'Leyendo…')));
      unlock();
    }
    box.scrollIntoView({ block: 'nearest' });
  }
  function cancelBtn() { var b = mk('button', { type: 'button', class: 'tp-btn', 'data-tp': 'cancel' }, T('Cancel', 'Cancelar')); return b; }
  function unlock() {
    if (!incoming) return;
    var pw = $('tp-in-pw') ? $('tp-in-pw').value : '';
    if (incoming.encrypted && !pw) { say('tp-in-msg', errText({ code: 'needpassword' }), true); return; }
    say('tp-in-msg', T('Opening…', 'Abriendo…'));
    var b = D.querySelector('[data-tp="unlock"]'); if (b) b.disabled = true;
    var p = incoming.kind === 'link' ? unpackLink(incoming.raw, pw) : readBackup(incoming.raw, pw);
    p.then(preview, function (e) { if (b) b.disabled = false; say('tp-in-msg', errText(e), true); if ($('tp-in-pw')) $('tp-in-pw').focus(); });
  }
  function preview(payload) {
    var box = inBox(); incoming.payload = payload;
    box.textContent = '';
    box.appendChild(mk('p', { class: 'tp-in-h' }, (incoming.kind === 'link' ? T('From the link', 'Del enlace') : T('From the backup', 'De la copia')) +
      (payload.created ? T(', made ', ', hecha el ') + day(Date.parse(payload.created)) : '') + T('. It holds:', '. Contiene:')));
    var ul = mk('ul', { class: 'tp-list' });
    summary(payload).forEach(function (g) {
      var li = mk('li'); li.appendChild(mk('strong', null, g.name));
      li.appendChild(mk('span', null, ' · ' + (g.n === 1 ? T('1 item', '1 elemento') : g.n + T(' items', ' elementos')) + (g.last ? ' · ' + T('changed ', 'cambiado el ') + day(g.last) : '')));
      ul.appendChild(li);
    });
    box.appendChild(ul);
    if (payload.dropped) box.appendChild(mk('p', { class: 'tp-warn' }, T(payload.dropped + ' item(s) didn’t look right and will be left out.', payload.dropped + ' elemento(s) no parecían correctos y se dejarán fuera.')));
    var fs = mk('fieldset', { class: 'tp-mode' });
    fs.appendChild(mk('legend', null, T('How to bring it in', 'Cómo traerlo')));
    [['merge', T('Add it to what’s here. Where both have the same thing, the newer one stays.', 'Añadirlo a lo que hay. Si ambos tienen lo mismo, se queda lo más nuevo.')],
     ['replace', T('Replace what’s here with the backup. Progress here that isn’t in it is removed.', 'Reemplazar lo que hay con la copia. Lo de aquí que no esté en ella se elimina.')]].forEach(function (o, i) {
      var l = mk('label'), r = mk('input', { type: 'radio', name: 'tp-mode', value: o[0] }); if (!i) r.checked = true;
      l.appendChild(r); l.appendChild(D.createTextNode(' ' + o[1])); fs.appendChild(l);
    });
    box.appendChild(fs);
    var acts = mk('p', { class: 'tp-acts' });
    acts.appendChild(mk('button', { type: 'button', class: 'tp-btn is-strong', 'data-tp': 'apply' }, T('Restore', 'Restaurar')));
    acts.appendChild(cancelBtn());
    box.appendChild(acts);
    box.appendChild(mk('p', { id: 'tp-in-msg', class: 'tp-status', role: 'status', 'aria-live': 'polite' }));
    box.querySelector('[data-tp="apply"]').focus();
  }
  function apply() {
    if (!incoming || !incoming.payload) return;
    var m = D.querySelector('input[name="tp-mode"]:checked'), mode = m ? m.value : 'merge';
    if (mode === 'replace' && !W.confirm(T('Replace the progress in this browser with the backup? What’s here now and not in the backup will be removed.', '¿Reemplazar el progreso de este navegador con la copia? Lo que hay ahora y no está en la copia se eliminará.'))) return;
    var r = restore(incoming.payload, mode);
    var box = inBox(); box.textContent = '';
    var parts = [];
    if (r.added) parts.push(r.added + T(' added', ' añadidos'));
    if (r.updated) parts.push(r.updated + T(' updated', ' actualizados'));
    if (r.kept) parts.push(r.kept + T(' already up to date here', ' ya al día aquí'));
    if (r.removed) parts.push(r.removed + T(' removed', ' eliminados'));
    box.appendChild(mk('p', { class: 'tp-ok', role: 'status' }, T('Restored. ', 'Restaurado. ') + (parts.join(', ') || T('Nothing needed changing.', 'No hacía falta cambiar nada.')) + '.' +
      (r.failed ? ' ' + T(r.failed + ' couldn’t be saved: this browser is out of room or won’t keep things.', r.failed + ' no se pudieron guardar: este navegador no tiene espacio o no guarda datos.') : '') +
      ' ' + T('Open any tool to see it.', 'Abre cualquier herramienta para verlo.')));
    incoming = null;
    drawWhat();
    if (W.TOLProgressRendered) W.TOLProgressRendered();
    try { D.dispatchEvent(new CustomEvent('tol-progress-restored', { detail: r })); } catch (e) {}
    if (hasMeaningful(local()) && !isFirefox()) persist().then(drawKeep);
  }
  function cancelIncoming() { incoming = null; var b = inBox(); if (b) { b.hidden = true; b.textContent = ''; } var f = $('tp-file'); if (f) f.value = ''; }

  function backup() {
    var pw = pwPair('tp-pw1', 'tp-pw2', 'tp-backup-msg'); if (!pw.ok) return;
    var p = collect();
    if (!Object.keys(p.keys).length) { say('tp-backup-msg', T('There’s nothing to back up yet.', 'Todavía no hay nada que copiar.'), true); return; }
    var btn = D.querySelector('[data-tp="backup"]'); btn.disabled = true;
    say('tp-backup-msg', pw.pw ? T('Locking it with your password…', 'Protegiéndolo con tu contraseña…') : T('Making the file…', 'Haciendo el archivo…'));
    var name = 'spread-love-progress-' + ymd(new Date()) + '.json';
    makeBackup(p, pw.pw).then(function (text) {
      btn.disabled = false;
      var blob = new Blob([text], { type: 'application/json' });
      return deliver(blob, name).then(function (how) {
        if (how === 'cancelled') { say('tp-backup-msg', T('Not saved. Nothing left this device.', 'No se guardó. Nada salió de este dispositivo.')); return; }
        if (how === 'needtap') return;
        setState({ last: Date.now() }); drawWhat();
        say('tp-backup-msg', (how === 'shared' ? T('Sent where you chose. ', 'Enviado a donde elegiste. ') : T('Saved to your downloads as ', 'Guardado en tus descargas como ') + name + '. ') +
          (pw.pw ? T('Keep the password somewhere safe: without it, the file can’t be opened, and we can’t reset it.', 'Guarda la contraseña en un lugar seguro: sin ella no se puede abrir el archivo, y no podemos restablecerla.') : T('Anyone who opens this file can read it, so keep it somewhere private.', 'Cualquiera que abra este archivo puede leerlo, así que guárdalo en un lugar privado.')));
      });
    }).catch(function (e) { btn.disabled = false; say('tp-backup-msg', errText(e), true); });
  }
  // phones: the share sheet (Files, iCloud Drive, Google Drive, email to yourself); otherwise a download
  function deliver(blob, name) {
    var file = null; try { file = new File([blob], name, { type: 'application/json' }); } catch (e) {}
    var n = W.navigator;
    if (file && coarse() && n.share && n.canShare && n.canShare({ files: [file] })) {
      return n.share({ files: [file], title: name }).then(function () { return 'shared'; }, function (e) {
        if (e && e.name === 'AbortError') return 'cancelled';
        if (e && e.name === 'NotAllowedError') { // the password step took long enough that the tap no longer counts: one more tap
          var b = mk('button', { type: 'button', class: 'tp-btn is-strong' }, T('Save it now', 'Guardarlo ahora'));
          var m = $('tp-backup-msg'); m.textContent = T('It’s ready. ', 'Está listo. '); m.appendChild(b);
          b.addEventListener('click', function () { n.share({ files: [file], title: name }).then(function () { setState({ last: Date.now() }); drawWhat(); say('tp-backup-msg', T('Sent where you chose.', 'Enviado a donde elegiste.')); }, function () { download(blob, name); setState({ last: Date.now() }); drawWhat(); say('tp-backup-msg', T('Saved to your downloads as ', 'Guardado en tus descargas como ') + name + '.'); }); });
          b.focus();
          return 'needtap';
        }
        download(blob, name); return 'downloaded';
      });
    }
    download(blob, name); return Promise.resolve('downloaded');
  }
  function download(blob, name) {
    var u = URL.createObjectURL(blob), a = mk('a', { href: u, download: name, class: 'tp-hide' });
    D.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(u); }, 30000);
  }
  var lastLink = '';
  function makeLink() {
    var pw = pwPair('tp-lpw1', 'tp-lpw2', 'tp-link-msg'); if (!pw.ok) return;
    var p = collect();
    if (!Object.keys(p.keys).length) { say('tp-link-msg', T('There’s nothing to move yet.', 'Todavía no hay nada que pasar.'), true); return; }
    if (!pw.pw && !W.confirm(T('Make the link without a password? Anyone who gets the link can open your progress. A password is strongly suggested.', '¿Hacer el enlace sin contraseña? Cualquiera que reciba el enlace puede abrir tu progreso. Te recomendamos mucho una contraseña.'))) return;
    say('tp-link-msg', T('Making the link…', 'Haciendo el enlace…'));
    packLink(p, pw.pw).then(function (packed) {
      var box = $('tp-link');
      if (packed.length > MAX_LINK) { box.hidden = true; say('tp-link-msg', T('There’s too much to fit in a link. Use “Save a backup” instead, then open the file on the other device.', 'Hay demasiado para un enlace. Usa “Guardar una copia” y abre el archivo en el otro dispositivo.'), true); return; }
      lastLink = location.origin + '/on-this-device.html#restore=' + packed;
      $('tp-link-text').value = lastLink;
      box.hidden = false;
      var qr = D.querySelector('[data-tp="qr"]'); if (qr) qr.hidden = !(lastLink.length <= 2000);
      var sh = D.querySelector('[data-tp="share-link"]'); if (sh) sh.hidden = !W.navigator.share;
      say('tp-link-msg', (pw.pw ? T('Ready. Open it on the other device and type the password there. ', 'Listo. Ábrelo en el otro dispositivo y escribe allí la contraseña. ') : T('Ready. Anyone with this link can open it, so send it only to yourself. ', 'Listo. Cualquiera con este enlace puede abrirlo, así que envíatelo solo a ti. ')) +
        (lastLink.length <= 2000 ? '' : T('It’s too long for a QR code: copy it or share it to yourself.', 'Es demasiado largo para un código QR: cópialo o compártelo contigo.')));
    }).catch(function (e) { say('tp-link-msg', errText(e), true); });
  }
  function copyLink() {
    var t = $('tp-link-text'), done = function (ok) { say('tp-link-msg', ok ? T('Link copied. Paste it into a note or a message to yourself.', 'Enlace copiado. Pégalo en una nota o un mensaje para ti.') : T('Couldn’t copy. Select the link above and copy it.', 'No se pudo copiar. Selecciona el enlace de arriba y cópialo.'), !ok); };
    if (W.navigator.clipboard && W.navigator.clipboard.writeText) W.navigator.clipboard.writeText(lastLink).then(function () { done(true); }, function () { t.select(); var ok = false; try { ok = D.execCommand('copy'); } catch (e) {} done(ok); });
    else { t.select(); var ok = false; try { ok = D.execCommand('copy'); } catch (e) {} done(ok); }
  }
  function showQR() {
    var go = function () { if (W.TOLShareKit && W.TOLShareKit.showQR) W.TOLShareKit.showQR(lastLink, { title: T('Scan with the other device', 'Escanéalo con el otro dispositivo'), note: T('Point the other phone’s camera at this code. The link opens there and asks before restoring anything.', 'Apunta la cámara del otro teléfono a este código. El enlace se abre allí y pregunta antes de restaurar nada.') }); };
    if (W.TOLShareKit) { go(); return; }
    var s = D.createElement('script'); s.src = '/assets/js/share-kit.js'; s.onload = go; D.head.appendChild(s);
  }
  function shareLink() { if (W.navigator.share) W.navigator.share({ url: lastLink, title: T('My Spread Love & Acceptance progress', 'Mi progreso de Spread Love & Acceptance') }).catch(function () {}); }
  function openPasted() {
    var v = ($('tp-paste').value || '').trim();
    var info; try { info = linkInfo(v); } catch (e) { say('tp-paste-msg', T('That doesn’t look like a move link. It should have “#restore=” in it.', 'No parece un enlace de traslado. Debe incluir “#restore=”.'), true); return; }
    say('tp-paste-msg', '');
    $('tp-paste').value = '';
    startIncoming({ kind: 'link', raw: v, encrypted: info.encrypted });
    var r = $('restore'); if (r) r.scrollIntoView({ block: 'start' });
  }
  function pickFile(f) {
    if (!f) return;
    if (f.size > MAX_FILE) { startIncoming({ kind: 'file', name: f.name, raw: '' }); say('tp-in-msg', errText({ code: 'big' }), true); return; }
    var rd = new FileReader();
    rd.onload = function () {
      var text = String(rd.result || ''), info;
      try { info = inspect(text); } catch (e) { var box = inBox(); incoming = null; box.hidden = false; box.textContent = ''; box.appendChild(mk('p', { class: 'tp-status is-bad', role: 'status' }, errText(e))); box.appendChild(cancelBtn()); return; }
      startIncoming({ kind: 'file', name: f.name, raw: text, encrypted: info.encrypted });
    };
    rd.onerror = function () { say('tp-in-msg', errText({}), true); };
    rd.readAsText(f);
  }
  function syncWarn(a, b, warnId) {
    var w = $(warnId); if (!w) return;
    var empty = !($(a).value || $(b).value);
    w.textContent = empty
      ? T('No password: anyone who opens it can read what’s in it. Adding one is best.', 'Sin contraseña: cualquiera que lo abra puede leer lo que contiene. Lo mejor es poner una.')
      : T('Locked with your password. Without it, nobody can open it, not even us, so keep it somewhere safe.', 'Protegido con tu contraseña. Sin ella nadie puede abrirlo, ni siquiera nosotros, así que guárdala bien.');
    w.classList.toggle('is-bad', empty);
  }
  function section() {
    var root = $('progress'); if (!root) return;
    css();
    root.classList.add('tp-live');
    drawWhat(); drawKeep();
    if (isApp()) { var h = $('tp-app-hint'); if (h) h.hidden = false; }
    syncWarn('tp-pw1', 'tp-pw2', 'tp-backup-warn'); syncWarn('tp-lpw1', 'tp-lpw2', 'tp-link-warn');
    root.addEventListener('input', function (e) {
      var id = e.target.id;
      if (id === 'tp-pw1' || id === 'tp-pw2') { syncWarn('tp-pw1', 'tp-pw2', 'tp-backup-warn'); say('tp-backup-msg', ''); }
      if (id === 'tp-lpw1' || id === 'tp-lpw2') { syncWarn('tp-lpw1', 'tp-lpw2', 'tp-link-warn'); say('tp-link-msg', ''); }
    });
    root.addEventListener('change', function (e) {
      var t = e.target;
      if (t.id === 'tp-file') pickFile(t.files && t.files[0]);
      else if (t.id === 'tp-remind') setState({ off: t.checked ? null : 1 });
      else if (t.matches('[data-tp-show]')) {
        var on = t.checked;
        t.getAttribute('data-tp-show').split(' ').forEach(function (id) { var i = $(id); if (i) i.type = on ? 'text' : 'password'; });
      }
    });
    root.addEventListener('click', function (e) {
      var b = e.target.closest('[data-tp]'); if (!b) return;
      var k = b.getAttribute('data-tp');
      if (k === 'backup') backup();
      else if (k === 'link') makeLink();
      else if (k === 'copy') copyLink();
      else if (k === 'qr') showQR();
      else if (k === 'share-link') shareLink();
      else if (k === 'paste') openPasted();
      else if (k === 'unlock') unlock();
      else if (k === 'apply') apply();
      else if (k === 'cancel') cancelIncoming();
      else if (k === 'persist') { b.disabled = true; persist().then(function () { b.disabled = false; drawKeep(); }); }
    });
    var pi = $('tp-paste'); if (pi) pi.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); openPasted(); } });
    // other parts of the page (Erase, Erase everything) change what's kept: redraw the counts after them
    D.addEventListener('click', function (e) { if (e.target.closest('[data-erase], [data-od]')) setTimeout(function () { drawWhat(); drawKeep(); }, 50); });
    // a move link: read it, take it out of the address bar, and offer to restore (never automatically)
    var hsh = location.hash || '';
    if (hsh.indexOf('#restore=') === 0) {
      var raw = hsh;
      try { history.replaceState(null, '', location.pathname + location.search + '#restore'); } catch (er) {}
      var info = null; try { info = linkInfo(raw); } catch (er) {}
      if (info) startIncoming({ kind: 'link', raw: raw, encrypted: info.encrypted });
      else { var box = inBox(); box.hidden = false; box.textContent = ''; box.appendChild(mk('p', { class: 'tp-status is-bad', role: 'status' }, T('This move link is incomplete or damaged. Copy the whole link again, or use a backup file.', 'Este enlace de traslado está incompleto o dañado. Copia el enlace entero otra vez, o usa un archivo de copia.'))); }
      var r = $('restore'); if (r) setTimeout(function () { r.scrollIntoView({ block: 'start' }); }, 60);
    }
  }

  function start() {
    try { everywhere(); } catch (e) {}
    if (PAGE) section();
  }
  if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', start); else start();
})(typeof globalThis !== 'undefined' ? globalThis : this);
