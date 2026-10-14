/* progress.js — "Your progress": keep what you've done here safe and private, in the browser or the app.
   window.TOLProgress. Loaded by site.js: right away on /on-this-device.html, in shared-computer mode and when the
   app lock is on; otherwise a little after load, when this browser keeps anything at all.

   Everything happens on this device. There is no account and no server. Nothing leaves the device unless the
   person saves a file or sends a link themselves.

   Three ways of saving (level()):
     'app'    the installed app (display-mode: standalone / navigator.standalone), and 'own' (a computer whose
              owner said "my own computer"): My saved entries, earlier versions of each tool (history), automatic
              persistent-storage request, optional app lock, backup reminders.
     'phone'  a phone or tablet browser (or a computer nobody has answered for yet): kept in this browser, with
              backup, restore and move, the app lock if wanted, and a gentle "the free app does more" line.
     'shared' a shared or public computer (or "not sure"): nothing is kept once the tab closes. This tab's notes
              ride in sessionStorage between pages (tol-shared-stash) and localStorage is emptied on pagehide,
              unless the page is going to another page of this site (a link was just followed). A new tab
              finds and wipes anything left behind. A chip says "Shared computer mode · nothing is kept", with
              "Clear everything now" and "Take it with you" (backup file to a USB stick, a link by email, a QR).
     Computers are asked once, the first time something meaningful is saved: "your own computer or a shared one?"
     Phones and tablets are not asked.

   - Collects the site's own notes in localStorage (the list on /on-this-device.html, plus any other tol-* key),
     leaving out looks-only settings, invitations seen, the email sign-up, the weather spot, the app lock, the
     history and the saving mode. sessionStorage is never collected. The site keeps nothing in IndexedDB.
   - "Save a backup": spread-love-progress-YYYY-MM-DD.json. With a password: AES-GCM 256, key from PBKDF2-SHA256,
     310,000 rounds, random salt and IV, the header bound in as additional data. Without one, the page says
     plainly that anyone with the file can read it. Phones get the share sheet; elsewhere it downloads.
   - "Restore from a backup": file, password, a preview (tool names and dates, never contents), then Add (newer
     wins, key by key) or Replace. Strict checks: sizes, this site's own key names, strings only, nothing that
     looks like HTML or script. Nothing in a file is ever run.
   - "Move to another device / into the app": the same payload as /on-this-device.html#restore=… (after the #, so
     it never reaches a server), a QR code when short enough. Opening one only offers to restore. On iPhone a
     link opens in Safari, not the Home Screen app, so the app has a "paste a move link" box.
   - The app lock: a 4–6 digit PIN kept only as a PBKDF2-SHA256 hash with a random salt, Face ID / Touch ID /
     fingerprint through WebAuthn where the device has it, locking after a chosen time away. A privacy screen,
     not encryption: the page says so, and says why saved entries are not encrypted with the PIN.

   localStorage keys of its own:
     tol-backup-v1          last backup, last reminder, first meaningful save, tips shown, reminder off, persistence asked
     tol-progress-times-v1  { key: [fingerprint, time it last changed] } so "Add" can keep whichever is newer
     tol-save-mode-v1       'own' or 'shared' (computers only)
     tol-entries-v1         My saved entries (included in backups)
     tol-history-v1         earlier versions, up to 10 per key (left out of backups)
     tol-lock-v1            the app lock: on, PIN hash + salt + rounds, minutes, passkey id, time away, wrong tries
   sessionStorage (shared mode): tol-shared-stash, tol-shared-session, tol-shared-nav, tol-shared-reloaded

   API (also require()-able in node for tools/progress/test-progress.js): collect, track, validate, makeBackup,
   readBackup, inspect, packLink, unpackLink, linkInfo, restore, summary, groupOf, groupName, included, meaningful,
   entries / saveEntry / renameEntry / deleteEntry / putBack / compare / flatten, recordHistory / history / goBack,
   pinRecord / checkPin / validPin / lockDue / failDelay, sharedStash / sharedWipe / sharedRestore,
   saveBackup(password) (browser), level() (browser), persist / persisted.
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
  var STATE_KEY = 'tol-backup-v1', TIMES_KEY = 'tol-progress-times-v1', MODE_KEY = 'tol-save-mode-v1', ENTRIES_KEY = 'tol-entries-v1',
      HIST_KEY = 'tol-history-v1', LOCK_KEY = 'tol-lock-v1';
  var SH_STASH = 'tol-shared-stash', SH_SESSION = 'tol-shared-session', SH_NAV = 'tol-shared-nav', SH_RELOAD = 'tol-shared-reloaded';
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
    'tol-work-keep', 'tol-ios-welcome', 'tol-keepask-test', 'tol-home-app-strip', 'tol-appbar-off', STATE_KEY, TIMES_KEY, MODE_KEY, HIST_KEY, LOCK_KEY];
  // [key, or a prefix ending in - or :] → group; groups marked * are things a person made or wrote (meaningful)
  var CAT = [
    [ENTRIES_KEY, 'entries'], ['tol-jobs-log-v1', 'checkin'], ['tol-small-wins', 'wins'], ['tol-ten-v1', 'ten'], ['tol-ten-log-v1', 'ten'],
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
    entries: ['*', 'My saved entries', 'Mis entradas guardadas'],
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

