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
  if (W && W.TOLProgress && W.TOLProgress.collect) return;   // site.js keeps { get, html } here for the progress line: kept below

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


  // ------------------------------------------------------------------ which keys are progress
  // Left out: looks-only settings, invitations and tips seen, visit lists, the email sign-up, the weather spot.
  var SKIP = ['tol-theme', 'tol-text-size', 'tol-contrast', 'tol-font', 'tol-spacing', 'tol-tint', 'tol-ruler', 'tol-easy',
    'tol-nobubbles', 'tol-quiet', 'tol-comfort-prev', 'tol-comfort-offer', 'tol-still', 'tol-hide-helpers', 'tol-sound-off',
    'tol-listen-rate', 'tol-recent', 'tol-recent-off', 'tol-visit-days', 'tol-depth-seen', 'tol-depth-pref', 'tol-weather-nudge',
    'tol-weather-nudge-seen', 'tol-clip-', 'tol-member-email', 'tol-join-pending', 'tol-join-pop-prev', 'tol-install-asked',
    'tol-palcam-pop-last', 'tol-appad-off', 'tol-app-installed', 'tol-puddles-hi-seen', 'tol-wide',
    'tol-keys-hint', 'tol-book-dl', 'tol-book-extras', 'tol-pc-wx', 'tol-pc-', 'tol-clockwx-off', 'tol-clockwx-on',
    'tol-work-keep', 'tol-ios-welcome', 'tol-keepask-test', 'tol-home-app-strip', 'tol-appbar-off', 'tol-lang', 'tol-save-tip', 'tol-save-how', 'tol-sfx', STATE_KEY, TIMES_KEY, MODE_KEY, HIST_KEY, LOCK_KEY];
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
    ['tol-bonding-picker', 'picks'], ['tol-freq-mode', 'picks'], ['tol-st-simple', 'picks'], ['tol-st-brief', 'picks'],
    ['tol-journeys-v1', 'journeys'], ['tol-saved', 'saved'], ['tol-lastread', 'saved']
  ];
  var GROUPS = {
    entries: ['*', 'My saved entries'],
    together: ['*', 'Worked on together'],
    checkin: ['*', 'This week’s check-in: jobs that keep coming back'],
    wins: ['*', 'Small wins'],
    ten: ['*', 'Start in 10 minutes'],
    weather: ['*', 'Today’s Weather almanac'],
    six: ['*', 'Six gentle weeks'],
    sheets: ['*', 'Worksheets you kept'],
    sheetset: ['', 'Worksheet keeping choices'],
    roots: ['*', 'Roots & Wings'],
    wiring: ['*', 'Your Wiring Card'],
    wave: ['*', 'Wavelength'],
    lemon: ['*', 'The Lemonade Stand'],
    lemonset: ['', 'The Lemonade Stand: just me or with others'],
    calc01: ['*', 'Is the setup working for everyone?'],
    calc02: ['*', 'Look back over 30 days'],
    deal: ['*', 'Your time-together deal'],
    work: ['*', 'Who owns what at work'],
    drive: ['*', 'The Re-check Drive'],
    rules: ['*', 'The rulebook from home'],
    pause: ['*', 'Your pause plan'],
    house: ['*', 'Your household'],
    cwd: ['*', 'The Carrier Wave Decoder'],
    cwdset: ['', 'Decoder saving'],
    tt: ['*', 'Turning Toward'],
    letters: ['*', 'Written conversations'],
    family: ['*', 'Check-ins: the family plan'],
    week: ['*', 'Different hours: our week'],
    ctx: ['*', 'Context for a person'],
    self: ['*', 'Your self path'],
    mv: ['*', 'Your music video'],
    takein: ['', 'How you take things in'],
    reading: ['', 'Reading: chapters, plans and picks'],
    garden: ['', 'The Night Garden'],
    games: ['', 'Games and puzzles'],
    watch: ['', 'Frequency Buddies and visualizers'],
    calm: ['', 'Breathing and calm sounds'],
    picks: ['', 'Tool choices'],
    journeys: ['*', 'Guided journeys'],
    saved: ['*', 'Your saved places'],
    other: ['', 'Other notes from the site']
  };
  function matches(k, p) { return k === p || (/[-:]$/.test(p) && k.indexOf(p) === 0); }
  function ours(k) { return typeof k === 'string' && /^(tol-|cwd-|bears-dojo-)[A-Za-z0-9:_.\-]{1,160}$/.test(k); }
  function skipped(k) { for (var i = 0; i < SKIP.length; i++) if (matches(k, SKIP[i]) || (SKIP[i] === 'tol-comfort-prev' && k.indexOf('tol-comfort-prev') === 0)) return true; return false; }
  function included(k) { return ours(k) && !skipped(k); }
  function groupOf(k) { for (var i = 0; i < CAT.length; i++) if (matches(k, CAT[i][0])) return CAT[i][1]; return 'other'; }
  function meaningful(k) { return GROUPS[groupOf(k)][0] === '*'; }
  function groupName(g) { var x = GROUPS[g] || GROUPS.other; return x[1]; }

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
  var HTMLISH = /<[a-z!\/?]|javascript\s*:|vbscript\s*:|data\s*:\s*text\/html/i;
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


  // ------------------------------------------------------------------ My saved entries (the app and your own computer)
  var ENTRY_MAX = 200, ENTRY_CHARS = 1500000, NAME_MAX = 80;
  function entries(st) {
    var raw = null; try { raw = JSON.parse(sget(st, ENTRIES_KEY) || 'null'); } catch (e) {}
    var list = raw && Array.isArray(raw.list) ? raw.list : [];
    return list.filter(function (e) {
      if (!(isObj(e) && typeof e.id === 'string' && /^[a-z0-9]{4,40}$/.test(e.id) && typeof e.g === 'string' && own(GROUPS, e.g) &&
        typeof e.t === 'number' && isFinite(e.t) && typeof e.name === 'string')) return false;
      if (e.kind === 'result') return typeof e.text === 'string' && (e.tool === undefined || typeof e.tool === 'string');
      return isObj(e.data) && Object.keys(e.data).every(function (k) { return included(k) && k !== ENTRIES_KEY && typeof e.data[k] === 'string'; });
    });
  }
  function writeEntries(st, list) {
    var s = JSON.stringify({ v: 1, list: list });
    if (s.length > ENTRY_CHARS) throw ProgressError('full', 'saved entries are full');
    try { st.setItem(ENTRIES_KEY, s); } catch (e) { throw ProgressError('full', 'storage is full'); }
    return list;
  }
  function groupKeys(st, g) { return progressKeys(st).filter(function (k) { return k !== ENTRIES_KEY && groupOf(k) === g; }); }
  function leaves(v, depth) {
    if (depth > 30) return 0;
    if (Array.isArray(v)) return v.reduce(function (n, x) { return n + leaves(x, depth + 1); }, 0);
    if (v && typeof v === 'object') return Object.keys(v).reduce(function (n, k) { return n + leaves(v[k], depth + 1); }, 0);
    return v === '' || v === null || v === false ? 0 : 1;
  }
  function describe(data) {
    var n = 0; Object.keys(data).forEach(function (k) { var v = data[k], p; try { p = JSON.parse(v); } catch (e) { p = v; } n += leaves(p, 0); });
    return n === 1 ? '1 answer' : n + ' answers';
  }
  function newId(now) { var r = ''; try { r = b64url(rand(6)).toLowerCase().replace(/[^a-z0-9]/g, ''); } catch (e) { r = Math.random().toString(36).slice(2, 8); } return (now || Date.now()).toString(36) + r; }
  function saveEntry(st, o, now) {
    o = o || {}; now = now || Date.now();
    var keys = o.keys && o.keys.length ? o.keys.filter(function (k) { return included(k) && k !== ENTRIES_KEY; }) : groupKeys(st, o.group);
    var data = {}; keys.forEach(function (k) { var v = sget(st, k); if (v !== null) data[k] = v; });
    if (!Object.keys(data).length) throw ProgressError('empty', 'nothing to save');
    var g = o.group && own(GROUPS, o.group) ? o.group : groupOf(Object.keys(data)[0]);
    var list = entries(st);
    if (list.length >= ENTRY_MAX) throw ProgressError('full', 'too many entries');
    var name = String(o.name || '').replace(/[\u0000-\u001F<>]/g, '').trim().slice(0, NAME_MAX) || (groupName(g) + ' · ' + new Date(now).toISOString().slice(0, 10));
    var e = { id: newId(now), g: g, t: now, name: name, sum: String(o.summary || describe(data)).replace(/[\u0000-\u001F<>]/g, '').slice(0, 200), data: data };
    list.push(e); writeEntries(st, list); track(st);
    return e;
  }
  // a tool's result, saved from its result area: { tool, title, text, data } (text and data are kept as plain text and JSON)
  function plainText(s, max) { return String(s == null ? '' : s).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').replace(/<(?=[a-z!\/?])/gi, '‹').replace(/javascript\s*:/gi, 'javascript :').slice(0, max); }
  function plainData(v, depth) {
    if (depth > 12) return null;
    if (typeof v === 'string') return plainText(v, 5000);
    if (typeof v === 'number') return isFinite(v) ? v : null;
    if (typeof v === 'boolean' || v === null) return v;
    if (Array.isArray(v)) return v.slice(0, 200).map(function (x) { return plainData(x, depth + 1); });
    if (isObj(v)) { var o = {}; Object.keys(v).slice(0, 200).forEach(function (k) { if (k !== '__proto__') o[plainText(k, 80)] = plainData(v[k], depth + 1); }); return o; }
    return null;
  }
  function saveResult(st, o, now) {
    o = o || {}; now = now || Date.now();
    var text = plainText(o.text, 20000), res = o.data === undefined ? null : plainData(o.data, 0);
    if (!text && res === null) throw ProgressError('empty', 'nothing to save');
    if (res !== null && JSON.stringify(res).length > 200000) throw ProgressError('full', 'too big');
    var tool = String(o.tool || '').replace(/[^a-z0-9:_-]/gi, '').slice(0, 60);
    var g = own(GROUPS, tool) ? tool : /^together/.test(tool) ? 'together' : o.group && own(GROUPS, o.group) ? o.group : 'other';
    var list = entries(st);
    if (list.length >= ENTRY_MAX) throw ProgressError('full', 'too many entries');
    var name = plainText(o.title || o.name, NAME_MAX).replace(/[<>]/g, '').trim() || (groupName(g) + ' · ' + new Date(now).toISOString().slice(0, 10));
    var e = { id: newId(now), kind: 'result', g: g, tool: tool || undefined, t: now, name: name, sum: plainText(o.summary || text.split('\n')[0] || describe({ x: JSON.stringify(res) }), 200).replace(/[<>]/g, ''), text: text, res: res };
    list.push(e); writeEntries(st, list); track(st);
    return e;
  }
  function renameEntry(st, id, name) {
    var list = entries(st), e = list.filter(function (x) { return x.id === id; })[0]; if (!e) return false;
    name = String(name || '').replace(/[\u0000-\u001F<>]/g, '').trim().slice(0, NAME_MAX); if (!name) return false;
    e.name = name; writeEntries(st, list); return true;
  }
  function deleteEntry(st, id) {
    var list = entries(st), left = list.filter(function (x) { return x.id !== id; });
    if (left.length === list.length) return false;
    if (left.length) writeEntries(st, left); else { try { st.removeItem(ENTRIES_KEY); } catch (e) {} }
    track(st); return true;
  }
  function putBack(st, id) {
    var e = entries(st).filter(function (x) { return x.id === id; })[0]; if (!e || e.kind === 'result') return 0;
    var n = 0;
    Object.keys(e.data).forEach(function (k) { var v = cleanValue(e.data[k]); if (v === null) return; try { st.setItem(k, v); n++; } catch (er) {} });
    track(st); return n;
  }
  // every answer as [path, value], for "open" and "compare"
  function flatten(data, max) {
    max = max || 400; var out = [];
    function walk(v, path, depth) {
      if (out.length >= max || depth > 30) return;
      if (Array.isArray(v)) { if (!v.length) return; v.forEach(function (x, i) { walk(x, path.concat(String(i + 1)), depth + 1); }); return; }
      if (v && typeof v === 'object') { Object.keys(v).forEach(function (k) { walk(v[k], path.concat(k), depth + 1); }); return; }
      if (v === '' || v === null) return;
      out.push([path.join(' › '), String(v).slice(0, 500)]);
    }
    Object.keys(data).sort().forEach(function (k) {
      var v = data[k], p; try { p = JSON.parse(v); } catch (e) { p = v; }
      walk(p, [k.replace(/^(tol-|cwd-|bears-dojo-)/, '')], 0);
    });
    return out;
  }
  function rowsOf(e, max) { return e.kind === 'result' ? flatten({ result: JSON.stringify(e.res === undefined ? null : e.res) }, max) : flatten(e.data, max); }
  function compare(a, b) {
    var A = {}, B = {}, out = [];
    rowsOf(a, 2000).forEach(function (x) { A[x[0]] = x[1]; });
    rowsOf(b, 2000).forEach(function (x) { B[x[0]] = x[1]; });
    Object.keys(A).forEach(function (k) { if (!own(B, k)) out.push({ path: k, was: A[k], now: null }); else if (A[k] !== B[k]) out.push({ path: k, was: A[k], now: B[k] }); });
    Object.keys(B).forEach(function (k) { if (!own(A, k)) out.push({ path: k, was: null, now: B[k] }); });
    return out;
  }

  // ------------------------------------------------------------------ earlier versions (history)
  var HIST_N = 10, HIST_VALUE = 250000, HIST_CHARS = 1200000, ROOM = 3500000;
  function versions(st) {
    var raw = null; try { raw = JSON.parse(sget(st, HIST_KEY) || 'null'); } catch (e) {}
    var out = Object.create(null); if (!isObj(raw)) return out;
    Object.keys(raw).forEach(function (k) {
      if (!included(k) || !Array.isArray(raw[k])) return;
      var l = raw[k].filter(function (x) { return isObj(x) && typeof x.t === 'number' && typeof x.v === 'string'; });
      if (l.length) out[k] = l;
    });
    return out;
  }
  function used(st) { var n = 0; storageKeys(st).forEach(function (k) { n += k.length + (sget(st, k) || '').length; }); return n; }
  // keeps the newest HIST_N versions of each meaningful item; an item that is erased takes its versions with it
  function recordHistory(st, now) {
    now = now || Date.now();
    var h = versions(st), changed = false, live = Object.create(null);
    progressKeys(st).forEach(function (k) {
      if (k === ENTRIES_KEY || !meaningful(k)) return;
      live[k] = 1;
      var v = sget(st, k); if (v === null || v.length > HIST_VALUE) return;
      var l = h[k] || (h[k] = []);
      if (l.length && l[l.length - 1].v === v) return;
      l.push({ t: now, v: v }); changed = true;
      while (l.length > HIST_N) l.shift();
    });
    Object.keys(h).forEach(function (k) { if (!live[k]) { delete h[k]; changed = true; } });
    if (!changed) return h;
    // the whole history stays small, so the tools always have room to save: the oldest go first
    var size = function () { return JSON.stringify(h).length; };
    var room = used(st) - (sget(st, HIST_KEY) || '').length > ROOM ? 0 : HIST_CHARS;
    while (size() > room) {
      var oldest = null;
      Object.keys(h).forEach(function (k) { if (h[k].length && (!oldest || h[k][0].t < h[oldest][0].t)) oldest = k; });
      if (!oldest) break;
      h[oldest].shift(); if (!h[oldest].length) delete h[oldest];
    }
    var o = {}; Object.keys(h).forEach(function (k) { o[k] = h[k]; });
    if (Object.keys(o).length) { try { st.setItem(HIST_KEY, JSON.stringify(o)); } catch (e) {} }
    else { try { st.removeItem(HIST_KEY); } catch (e) {} }
    return h;
  }
  function goBack(st, k, t) {
    var l = versions(st)[k]; if (!l) return false;
    var x = l.filter(function (v) { return v.t === t; })[0]; if (!x) return false;
    var v = cleanValue(x.v); if (v === null) return false;
    try { st.setItem(k, v); } catch (e) { return false; }
    recordHistory(st); track(st); return true;
  }
  function dropHistory(st, keys) {
    var h = versions(st), n = 0; keys.forEach(function (k) { if (h[k]) { n += h[k].length; delete h[k]; } });
    var o = {}; Object.keys(h).forEach(function (k) { o[k] = h[k]; });
    try { if (Object.keys(o).length) st.setItem(HIST_KEY, JSON.stringify(o)); else st.removeItem(HIST_KEY); } catch (e) {}
    return n;
  }

  // ------------------------------------------------------------------ the app lock: PIN hash, and when it locks
  var PIN_ITER = 310000;
  function validPin(p) { return typeof p === 'string' && /^\d{4,6}$/.test(p); }
  function pinHash(pin, salt, iter) {
    var c = subtle();
    return c.subtle.importKey('raw', utf8(pin), 'PBKDF2', false, ['deriveBits']).then(function (base) {
      return c.subtle.deriveBits({ name: 'PBKDF2', salt: salt, iterations: iter, hash: 'SHA-256' }, base, 256);
    }).then(function (b) { return b64(new Uint8Array(b)); });
  }
  function pinRecord(pin, mins) {
    if (!validPin(pin)) return Promise.reject(ProgressError('pin', 'PIN must be 4 to 6 digits'));
    var salt = rand(16);
    return pinHash(pin, salt, PIN_ITER).then(function (h) { return { on: 1, alg: 'PBKDF2-SHA256', it: PIN_ITER, salt: b64(salt), h: h, mins: typeof mins === 'number' && mins >= 0 ? mins : 5, tries: 0 }; });
  }
  function checkPin(pin, rec) {
    if (!validPin(pin) || !rec || typeof rec.h !== 'string' || typeof rec.salt !== 'string' || !(rec.it >= 100000 && rec.it <= MAX_ITER)) return Promise.resolve(false);
    var salt; try { salt = unb64(rec.salt); } catch (e) { return Promise.resolve(false); }
    return pinHash(pin, salt, rec.it).then(function (h) {
      if (h.length !== rec.h.length) return false;
      var d = 0; for (var i = 0; i < h.length; i++) d |= h.charCodeAt(i) ^ rec.h.charCodeAt(i);
      return d === 0;
    });
  }
  function lockDue(rec, now) {
    if (!rec || rec.on !== 1) return false;
    if (typeof rec.away !== 'number') return true;
    return now - rec.away >= Math.max(0, +rec.mins || 0) * 60000;
  }
  function failDelay(tries) { return tries < 5 ? 0 : Math.min(15 * 60000, 30000 * Math.pow(2, tries - 5)); }
  function readLock(st) { var r = readJSON(st, LOCK_KEY); return r && r.on === 1 ? r : null; }
  function writeLock(st, r) { if (r) writeJSON(st, LOCK_KEY, r); else { try { st.removeItem(LOCK_KEY); } catch (e) {} } }

  // ------------------------------------------------------------------ shared-computer mode
  function siteKey(k) { return /^(tol-|cwd-|bears-dojo-)/.test(k) && k !== MODE_KEY; }
  function sharedStash(lst, sst) {
    var o = {}; storageKeys(lst).filter(siteKey).forEach(function (k) { var v = sget(lst, k); if (v !== null) o[k] = v; });
    try { sst.setItem(SH_STASH, JSON.stringify(o)); return true; } catch (e) { return false; }
  }
  function sharedWipe(lst) { var n = 0; storageKeys(lst).filter(siteKey).forEach(function (k) { try { lst.removeItem(k); n++; } catch (e) {} }); return n; }
  function sharedRestore(lst, sst) {
    var o = null; try { o = JSON.parse(sget(sst, SH_STASH) || 'null'); } catch (e) {}
    if (!isObj(o)) return 0;
    var n = 0; Object.keys(o).forEach(function (k) { if (siteKey(k) && typeof o[k] === 'string' && sget(lst, k) === null) { try { lst.setItem(k, o[k]); n++; } catch (e) {} } });
    return n;
  }

  // ------------------------------------------------------------------ persistent storage
  function isFirefox() { return W && /Firefox\//.test(W.navigator.userAgent); }
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
  function isComputer() { return !!(W.matchMedia && W.matchMedia('(pointer: fine)').matches) && !isIOS() && !/Android|Mobi/i.test(W.navigator.userAgent); }
  function level() {
    if (isApp()) return 'app';
    if (!isComputer()) return 'phone';
    var m = sget(local(), MODE_KEY);
    return m === 'own' ? 'own' : m === 'shared' ? 'shared' : 'unasked';
  }
  function perks(lv) { lv = lv || level(); return lv === 'app' || lv === 'own'; }
  function state() { return readJSON(local(), STATE_KEY) || {}; }
  function setState(p) { var s = state(); Object.keys(p).forEach(function (k) { if (p[k] === null) delete s[k]; else s[k] = p[k]; }); writeJSON(local(), STATE_KEY, s); return s; }

  var API = {
    FORMAT: FORMAT, VERSION: VERSION, ITER: ITER, MAX_FILE: MAX_FILE, MAX_LINK: MAX_LINK, HIST_N: HIST_N,
    KEYS: { state: STATE_KEY, times: TIMES_KEY, mode: MODE_KEY, entries: ENTRIES_KEY, history: HIST_KEY, lock: LOCK_KEY, stash: SH_STASH },
    included: included, meaningful: meaningful, groupOf: groupOf, groupName: groupName,
    collect: collect, track: track, validate: validate, makeBackup: makeBackup, readBackup: readBackup, inspect: inspect,
    packLink: packLink, unpackLink: unpackLink, linkInfo: linkInfo, restore: restore, summary: summary,
    entries: entries, saveEntry: function (a, b, c) { return a && typeof a.getItem === 'function' ? saveEntry(a, b, c) : browserSave(a); }, saveResult: saveResult, rowsOf: rowsOf, renameEntry: renameEntry, deleteEntry: deleteEntry, putBack: putBack, compare: compare, flatten: flatten,
    recordHistory: recordHistory, history: versions, goBack: goBack, dropHistory: dropHistory,
    validPin: validPin, pinRecord: pinRecord, checkPin: checkPin, lockDue: lockDue, failDelay: failDelay,
    sharedStash: sharedStash, sharedWipe: sharedWipe, sharedRestore: sharedRestore,
    persist: persist, persisted: persisted, ProgressError: ProgressError
  };
  // one tap from a tool's result area: TOLProgress.saveEntry({ tool, title, text, data }) → the entry, or false
  // (false when this isn't the app or your own computer, or storage is full; TOLProgress.perks() says beforehand)
  function browserSave(o) {
    var st = local(); if (!st || !W || !perks()) return false;
    try { return o && (o.text !== undefined || o.data !== undefined) && !o.keys && !o.group ? saveResult(st, o) : saveEntry(st, o); } catch (e) { return false; }
  }
  if (typeof module === 'object' && module.exports) module.exports = API;
  if (!D) return;
  var before = W.TOLProgress;   // site.js's { get, html } for the "Your progress" line: kept on the same object
  if (before && typeof before === 'object') Object.keys(before).forEach(function (k) { if (!own(API, k)) API[k] = before[k]; });
  W.TOLProgress = API;

  // =====================================================================================================
  // In the browser
  // =====================================================================================================
  var path = decodeURIComponent(location.pathname).replace(/\/$/, '/index.html');
  var PAGE = path === '/on-this-device.html';
  var HTML = D.documentElement;
  function sess() { try { return W.sessionStorage; } catch (e) { return null; } }
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
  function btn(label, cls, fn, attrs) { var b = mk('button', Object.assign({ type: 'button', class: 'tp-btn' + (cls ? ' ' + cls : '') }, attrs || {}), label); if (fn) b.addEventListener('click', fn); return b; }
  function day(t) {
    try { return new Date(t).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: new Date(t).getFullYear() === new Date().getFullYear() ? undefined : 'numeric' }); }
    catch (e) { return new Date(t).toDateString(); }
  }
  function dayTime(t) { try { return day(t) + ', ' + new Date(t).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }); } catch (e) { return new Date(t).toString(); } }
  function ymd(d) { function p(n) { return (n < 10 ? '0' : '') + n; } return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()); }
  function coarse() { return !!(W.matchMedia && W.matchMedia('(pointer: coarse)').matches); }
  function reveal() { HTML.style.visibility = ''; }
  function errText(e) {
    var c = e && e.code;
    if (c === 'password') return 'That password doesn’t open it. Check it (capital letters count) and try again.';
    if (c === 'needpassword') return 'This one is locked with a password. Type it below.';
    if (c === 'big') return 'That’s too big to be a backup from this site.';
    if (c === 'version') return 'This backup was made by a newer version of the site. Reload the page and try again.';
    if (c === 'changed') return 'This backup was changed after it was made, so it can’t be trusted. Nothing was restored.';
    if (c === 'empty') return 'There’s nothing in it that this site can restore.';
    if (c === 'full') return 'Your saved entries are full. Delete a few old ones first.';
    if (c === 'nozip') return 'This browser can’t open move links. Use a backup file instead.';
    if (c === 'nocrypto') return 'This browser can’t lock or unlock with a password here. Try an up-to-date browser.';
    return 'That isn’t a backup from this site, or it’s damaged. Nothing was changed.';
  }
  function confirmClear(o) {
    var go = function () { if (W.TOLConfirmClear) return W.TOLConfirmClear.ask(o); return Promise.resolve(W.confirm('Clear ' + o.what + '? This can’t be undone.') ? Promise.resolve(o.onConfirm && o.onConfirm()).then(function () { return true; }) : false); };
    if (W.TOLConfirmClear) return go();
    return new Promise(function (ok) { var s = D.createElement('script'); s.src = '/assets/js/confirm-clear.js'; s.onload = function () { ok(go()); }; s.onerror = function () { ok(go()); }; D.head.appendChild(s); });
  }
  function eraseEverything() {
    var mode = sget(local(), MODE_KEY);
    var done = function () { if (mode === 'shared') { try { local().setItem(MODE_KEY, 'shared'); sess().setItem(SH_SESSION, '1'); } catch (e) {} } };
    return (W.TOL && W.TOL.eraseAll ? W.TOL.eraseAll() : Promise.resolve(sharedWipe(local()))).then(done, done);
  }
  // the free app: the browser's own prompt, the iPhone/iPad guide (app-bar.js), or the install page
  function installFlow(opener) {
    if (W.TOLInstall && W.TOLInstall.ready()) { W.TOLInstall.ask().then(function (r) { if (r === 'unavailable' || r === 'error') location.href = '/install.html'; }); return; }
    if (isIOS()) {
      if (W.TOLAppBar && W.TOLAppBar.guide) { W.TOLAppBar.guide(opener); return; }
      var s = D.createElement('script'); s.src = '/assets/js/app-bar.js';
      s.onload = function () { if (W.TOLAppBar && W.TOLAppBar.guide) W.TOLAppBar.guide(opener); else location.href = '/install.html'; };
      s.onerror = function () { location.href = '/install.html'; };
      D.head.appendChild(s); return;
    }
    location.href = '/install.html';
  }

  // ---------------------------------------------------------------- shared-computer mode: nothing kept after the tab closes
  function sharedStart() {
    var ls = local(), ss = sess(); if (!ls || !ss) return false;
    var fresh = !sget(ss, SH_SESSION), changed;
    try { ss.setItem(SH_SESSION, '1'); } catch (e) {}
    changed = fresh ? sharedWipe(ls) > 0 : sharedRestore(ls, ss) > 0;
    // the page's tools read storage before this ran: one quiet reload so they see what's really there
    if (changed && !sget(ss, SH_RELOAD)) {
      try { ss.setItem(SH_RELOAD, '1'); ss.setItem(SH_NAV, String(Date.now())); } catch (e) {}
      location.reload(); return true;
    }
    try { ss.removeItem(SH_RELOAD); } catch (e) {}
    D.addEventListener('click', function (e) {
      var a = e.target.closest && e.target.closest('a[href]'); if (!a || a.target === '_blank' || a.hasAttribute('download')) return;
      try { var u = new URL(a.href, location.href); if (u.origin === location.origin && (u.pathname !== location.pathname || u.search !== location.search)) ss.setItem(SH_NAV, String(Date.now())); } catch (er) {}
    }, true);
    D.addEventListener('submit', function () { try { ss.setItem(SH_NAV, String(Date.now())); } catch (er) {} }, true);
    W.addEventListener('pagehide', function () {
      if (sget(ls, MODE_KEY) !== 'shared') return;
      sharedStash(ls, ss);
      var nav = +(sget(ss, SH_NAV) || 0);
      if (Date.now() - nav > 8000) sharedWipe(ls);
      try { ss.removeItem(SH_NAV); } catch (e) {}
    });
    W.addEventListener('pageshow', function (e) { if (e.persisted && sget(ls, MODE_KEY) === 'shared') sharedRestore(ls, ss); });
    return false;
  }
  function sharedChip() {
    var inFrame = true; try { inFrame = W.self !== W.top; } catch (e) {}
    if (inFrame || D.getElementById('tp-chip')) return;
    css();
    var c = mk('aside', { id: 'tp-chip', class: 'tp-chip no-bubble no-print', 'aria-label': 'Shared computer mode' });
    c.appendChild(mk('span', { class: 'tp-chip-t' }, 'Shared computer mode · nothing is kept'));
    c.appendChild(btn('Clear everything now', 'is-small', function () { clearShared(); }));
    if (!PAGE) c.appendChild(mk('a', { href: '/on-this-device.html#take', class: 'tp-chip-a' }, 'Take it with you'));
    D.body.appendChild(c);
  }
  function clearShared() {
    confirmClear({
      what: 'everything from this visit', keys: '*', short: true,
      doneText: 'Cleared. Nothing you typed is left on this computer.',
      onConfirm: function () { try { sess().removeItem(SH_STASH); } catch (e) {} return eraseEverything(); }
    }).then(function (ok) { if (ok) location.reload(); });
  }

  // ---------------------------------------------------------------- the app lock screen
  var LOCK_FREE = /^\/(upset-right-now)\.html$/;
  var lockEl = null;
  function passkeyReady() {
    var P = W.PublicKeyCredential;
    if (!P || !P.isUserVerifyingPlatformAuthenticatorAvailable || !W.isSecureContext) return Promise.resolve(false);
    return P.isUserVerifyingPlatformAuthenticatorAvailable().catch(function () { return false; });
  }
  function passkeyCreate() {
    return W.navigator.credentials.create({ publicKey: {
      challenge: rand(32), rp: { name: 'Spread Love & Acceptance', id: location.hostname },
      user: { id: rand(16), name: 'this-device', displayName: 'You, on this device' },
      pubKeyCredParams: [{ type: 'public-key', alg: -7 }, { type: 'public-key', alg: -257 }],
      authenticatorSelection: { authenticatorAttachment: 'platform', userVerification: 'required', residentKey: 'discouraged' },
      timeout: 60000, attestation: 'none' } }).then(function (c) { return b64(new Uint8Array(c.rawId)); });
  }
  function passkeyCheck(id) {
    var raw; try { raw = unb64(id); } catch (e) { return Promise.resolve(false); }
    return W.navigator.credentials.get({ publicKey: { challenge: rand(32), rpId: location.hostname, allowCredentials: [{ type: 'public-key', id: raw }], userVerification: 'required', timeout: 60000 } })
      .then(function (c) { return !!c; }, function () { return false; });
  }
  function lockNow() {
    var st = local(), rec = readLock(st); if (!rec || LOCK_FREE.test(path)) { reveal(); return; }
    if (lockEl) return;
    css();
    HTML.style.visibility = 'hidden';
    var o = mk('div', { class: 'tp-lock no-print', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'tp-lock-h' });
    o.style.visibility = 'visible';
    var c = mk('div', { class: 'tp-lock-card' });
    c.appendChild(mk('h2', { id: 'tp-lock-h' }, 'Locked'));
    c.appendChild(mk('p', null, 'Type your passcode to open Spread Love & Acceptance.'));
    var row = mk('p', { class: 'tp-row' });
    row.appendChild(mk('label', { for: 'tp-lock-pin' }, 'Passcode'));
    var pin = mk('input', { id: 'tp-lock-pin', type: 'password', inputmode: 'numeric', pattern: '[0-9]*', maxlength: '6', autocomplete: 'off', class: 'tp-pin' });
    row.appendChild(pin); c.appendChild(row);
    var msg = mk('p', { class: 'tp-status', role: 'status', 'aria-live': 'polite' });
    var acts = mk('p', { class: 'tp-acts' });
    var go = btn('Unlock', 'is-strong', tryPin);
    acts.appendChild(go);
    if (rec.cred) {
      acts.appendChild(btn('Use Face ID or fingerprint', '', function () {
        passkeyCheck(rec.cred).then(function (ok) { if (ok) unlock(); else msg.textContent = 'That didn’t work. Use your passcode.'; });
      }));
    }
    c.appendChild(acts); c.appendChild(msg);
    var forgot = mk('details', { class: 'tp-forgot' });
    forgot.appendChild(mk('summary', null, 'Forgot your passcode?'));
    forgot.appendChild(mk('p', null, 'It can’t be reset: it’s kept only on this device, and we never see it. You can erase everything this site keeps here and start fresh. A backup file can bring your progress back afterwards.'));
    forgot.appendChild(btn('Erase everything on this device', 'is-danger', function () {
      confirmClear({ what: 'everything this site keeps on this device', keys: '*',
        doneText: 'Cleared. Nothing you saved is left on this device, and the lock is off.',
        onConfirm: eraseEverything }).then(function (ok) { if (ok) location.reload(); });
    }));
    c.appendChild(forgot);
    o.appendChild(c); D.body.appendChild(o); lockEl = o;
    pin.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); tryPin(); } });
    setTimeout(function () { pin.focus(); }, 30);
    function tryPin() {
      var r = readLock(st); if (!r) { unlock(); return; }
      var now = Date.now();
      if (r.until && r.until > now) { msg.textContent = 'Too many tries. Please wait ' + Math.ceil((r.until - now) / 1000) + ' seconds and try again.'; return; }
      go.disabled = true; msg.textContent = 'Checking…';
      checkPin(pin.value, r).then(function (ok) {
        go.disabled = false;
        var r2 = readLock(st) || r;
        if (ok) { r2.tries = 0; delete r2.until; writeLock(st, r2); unlock(); return; }
        r2.tries = (r2.tries || 0) + 1; var wait = failDelay(r2.tries); if (wait) r2.until = Date.now() + wait; writeLock(st, r2);
        pin.value = ''; pin.focus();
        msg.textContent = wait ? 'That’s not it. Please wait ' + Math.ceil(wait / 1000) + ' seconds before the next try.' : 'That’s not it. Try again.';
      });
    }
  }
  function unlock() {
    var st = local(), r = readLock(st); if (r) { delete r.away; writeLock(st, r); }
    if (lockEl) { lockEl.remove(); lockEl = null; }
    reveal();
  }
  function lockStart() {
    var st = local(), rec = readLock(st);
    if (!rec || LOCK_FREE.test(path)) { reveal(); return; }
    if (lockDue(rec, Date.now())) lockNow(); else { delete rec.away; writeLock(st, rec); reveal(); }
    var away = function () { var r = readLock(st); if (r && !lockEl) { r.away = Date.now(); writeLock(st, r); } };
    D.addEventListener('visibilitychange', function () {
      if (D.visibilityState === 'hidden') away();
      else { var r = readLock(st); if (r && lockDue(r, Date.now())) lockNow(); else if (r && !lockEl) { delete r.away; writeLock(st, r); } }
    });
    W.addEventListener('pagehide', away);
  }

  // ---------------------------------------------------------------- everywhere: times, history, persistence, tips
  function quietPage() {
    var h = HTML.classList, b = D.body;
    var inFrame = true; try { inFrame = W.self !== W.top; } catch (e) {}
    return inFrame || PAGE || !b || b.hasAttribute('data-no-tip') || h.contains('tol-no-helpers') || h.contains('tol-work') ||
      /^\/(upset-right-now|install|404|offline|privacy-policy)\.html$|^\/legal\//.test(path) || !D.querySelector('main');
  }
  function autoPersist() {
    var st = local(); if (!st || !W.navigator.storage || !W.navigator.storage.persist || isFirefox()) return; // Firefox asks with a pop-up: only from the button
    var lv = level(), s = state();
    if (lv === 'shared') return;
    var every = perks(lv);
    if (!every && (s.asked || !hasMeaningful(st))) return;
    persisted().then(function (p) { if (p) { if (!s.kept) setState({ kept: true }); return; } if (every || !s.asked) persist(); });
  }
  function noteSince() { var s = state(); if (!s.since && hasMeaningful(local())) setState({ since: Date.now() }); }
  var card = null;
  function closeCard() { if (card) { card.remove(); card = null; } }
  function cardShell(label, title) {
    css(); closeCard();
    var c = mk('aside', { class: 'tp-card-pop no-bubble no-print', role: 'region', 'aria-label': label });
    c.appendChild(mk('p', { class: 'tp-pop-h' }, title));
    return c;
  }
  function placeCard(c) { D.body.appendChild(c); card = c; }
  function askCard() {
    var c = cardShell('Your own computer, or shared?', 'Is this your own computer or a shared one?');
    c.appendChild(mk('p', null, 'On your own computer, this site can keep a history of your results, saved entries and an app lock. On a shared or public computer, nothing is kept after you close the tab. Either way, nothing is sent to us.'));
    var acts = mk('p', { class: 'tp-pop-acts' });
    acts.appendChild(btn('My own computer', 'is-strong', function () { chooseMode('own'); ownDone(c); }));
    acts.appendChild(btn('Shared or public', '', function () { chooseMode('shared'); closeCard(); }));
    acts.appendChild(btn('Not sure', '', function () { chooseMode('shared'); closeCard(); }));
    c.appendChild(acts);
    placeCard(c);
  }
  function ownDone(c) {
    c.textContent = '';
    c.appendChild(mk('p', { class: 'tp-pop-h' }, 'Saving on your own computer'));
    c.appendChild(mk('p', null, 'Your results stay here, with earlier versions and saved entries. Change it any time under Your progress. The free app opens in one tap too.'));
    var acts = mk('p', { class: 'tp-pop-acts' });
    acts.appendChild(btn('Install the free app', 'is-strong', function (e) { installFlow(e.currentTarget); }));
    acts.appendChild(btn('Close', '', closeCard));
    c.appendChild(acts);
  }
  function chooseMode(m) {
    var ls = local(); try { ls.setItem(MODE_KEY, m); } catch (e) {}
    if (m === 'shared') { try { sess().setItem(SH_SESSION, '1'); } catch (e) {} sharedStart(); sharedChip(); }
    else { var c = D.getElementById('tp-chip'); if (c) c.remove(); recordHistory(ls); autoPersist(); }
    if (PAGE) drawAll();
  }
  function infoCard(kind) {
    var tip = kind === 'tip', ipad = /iPad/.test(W.navigator.userAgent) || (W.navigator.platform === 'MacIntel' && W.navigator.maxTouchPoints > 1);
    var c = cardShell(tip || kind === 'perk' ? 'Keep your progress' : 'A backup reminder',
      tip ? (ipad ? 'Keep your progress safe on this iPad' : 'Keep your progress safe on this iPhone')
        : kind === 'perk' ? 'The free app keeps more' : 'Keep a copy of your progress?');
    c.appendChild(mk('p', null, tip
      ? 'What you do here is kept in Safari, and Safari can clear it after 7 days without a visit. The free app on your Home Screen isn’t cleared that way, and it keeps a history of your results, saved entries and an app lock. Its storage is separate from Safari’s, so after installing, bring your progress over with a move link or a backup file.'
      : kind === 'perk'
        ? 'Install the free app to keep a history of your results, saved entries and an app lock. Still private: it all stays on this phone.'
        : 'What you’ve done here is kept only in this browser. A backup file keeps it safe if the browser clears it, and lets you move to a new phone. It stays private: the file goes only where you put it.'));
    var acts = mk('p', { class: 'tp-pop-acts' });
    if (tip || kind === 'perk') {
      acts.appendChild(btn('Get the free app', 'is-strong', function (e) { installFlow(e.currentTarget); }));
      if (tip) acts.appendChild(mk('a', { href: '/on-this-device.html#move', class: 'tp-btn' }, 'How to bring it over'));
    } else acts.appendChild(mk('a', { href: '/on-this-device.html#backup', class: 'tp-btn is-strong' }, 'Save a backup'));
    acts.appendChild(btn('Not now', '', closeCard));
    if (kind === 'nudge') acts.appendChild(btn('Don’t remind me', 'tp-link', function () { setState({ off: 1 }); closeCard(); }));
    c.appendChild(acts);
    placeCard(c);
    var p = {}; p[kind] = Date.now(); setState(p);
  }
  // home16b, the pop-up rules: these cards ask only as a page opens, before the person has touched anything (so never
  // over a result or a form they just opened), never on a link someone sent them, and only if nothing else has asked this
  // visit (window.TOLPrompt, site.js). "Your own computer, or shared?" waits for the first page after they first save
  // something here (sessionStorage 'tol-ask-due'), instead of turning up over the page a few seconds after it loads.
  var ASK_DUE = 'tol-ask-due', startSig = null;
  function saveSig() {
    var st = local(); if (!st) return '';
    return progressKeys(st).filter(meaningful).map(function (k) { var v = sget(st, k) || ''; return k + ':' + v.length + ':' + v.slice(-24); }).sort().join('|');
  }
  function noteSave() {
    if (startSig === null || level() !== 'unasked') return;
    if (saveSig() !== startSig && hasMeaningful(local())) { try { sess().setItem(ASK_DUE, '1'); } catch (e) {} }
  }
  function promptOk(name, bump) {
    var P = W.TOLPrompt, touched = P && P.touched ? P.touched() : 0;
    if (touched) return false;
    if (/#together=|[?&]together=|TOL-TOGETHER:/i.test(W.location.href)) return false;
    if (HTML.classList.contains('ti-nosurprise')) return false;
    // a tool page is for doing the tool: no cards there
    if (/^\/(ask|conversation-reader|signal-translator|carrier-wave-decoder|lemonade-stand|wiring-card|quick-checks|wavelength|the-logic-behind-it|check-ins|start-in-10-minutes|is-the-setup-working|calc01-solvency|recheck-drive|coin-pusher|frequency-journey|night-garden|word-bloom|quiet-words|quiet-crossword|daily-ledger-crossword)\.html$|^\/(workpapers\/(fill|calculators)|tools)\//.test(path)) return false;
    if (!P || P.free(name)) return true;
    // "Your own computer, or shared?" matters more than the free-app line: it takes the line's place this visit
    var cur = null; try { cur = sess().getItem('tol-prompt'); } catch (e) {}
    if (bump && cur === 'appbar') { var ab = D.querySelector('aside.tol-appbar'); if (ab) ab.remove(); return true; }
    return false;
  }
  function maybeCard() {
    var lv = level(); if (lv === 'shared' || card || lockEl) return;
    var inFrame = true; try { inFrame = W.self !== W.top; } catch (e) {}
    if (!hasMeaningful(local())) return;
    if (lv === 'unasked') {
      var due = false; try { due = sess().getItem(ASK_DUE) === '1'; } catch (e) {}
      if (due && !inFrame && !PAGE && !(D.body && D.body.hasAttribute('data-no-tip')) && !/^\/(upset-right-now)\.html$/.test(path) && promptOk('progress', true)) { if (W.TOLPrompt) W.TOLPrompt.take('progress'); askCard(); }
      return;
    }
    if (quietPage()) return;
    if (!promptOk('progress')) return;
    if (W.TOLPrompt) W.TOLPrompt.take('progress');
    var s = state(), now = Date.now();
    if (lv === 'phone' && isIOS() && !s.tip) { infoCard('tip'); return; }
    if (lv === 'phone' && !isIOS() && !s.perk) { infoCard('perk'); return; }
    if (s.off) return;
    var since = s.since || now, last = s.last || 0, nudged = s.nudge || 0, other = Math.max(s.tip || 0, s.perk || 0);
    var due = last ? now - last > 30 * DAY : now - since > 14 * DAY;
    if (due && now - nudged > 30 * DAY && now - other > 7 * DAY) infoCard('nudge');
  }
  function tick() { var st = local(); track(st); noteSince(); if (perks()) recordHistory(st); autoPersist(); }
  function everywhere() {
    var lv = level();
    if (lv === 'shared') { reveal(); if (sharedStart()) return; sharedChip(); return; }
    lockStart();
    tick();
    D.addEventListener('visibilitychange', function () { if (D.visibilityState === 'hidden') tick(); });
    W.addEventListener('pagehide', function () { tick(); });
    setTimeout(maybeCard, 3000);
    // a save on this page (for "Your own computer, or shared?" on the next page they open)
    if (lv === 'unasked') {
      startSig = saveSig();
      var iv = setInterval(function () { if (level() !== 'unasked') { clearInterval(iv); return; } noteSave(); }, 5000);
      W.addEventListener('pagehide', noteSave);
      D.addEventListener('visibilitychange', function () { if (D.visibilityState === 'hidden') noteSave(); });
    }
  }

  // ---------------------------------------------------------------- one-tap "Save as an entry" for tools (and a backup for confirm-clear.js)
  API.level = level;
  API.perks = function () { return perks(); };
  API.save = function (o) {
    if (!perks()) return Promise.resolve({ ok: false, why: 'not-here', text: 'Saved entries come with the free app, or on your own computer.' });
    try { var e = saveEntry(local(), o); return Promise.resolve({ ok: true, entry: e, text: 'Saved to My saved entries.' }); }
    catch (er) { return Promise.resolve({ ok: false, why: er.code, text: errText(er) }); }
  };
  API.saveBackup = function (pw, sayFn) {
    var p = collect();
    if (!Object.keys(p.keys).length) return Promise.resolve('There’s nothing to back up yet.');
    var name = 'spread-love-progress-' + ymd(new Date()) + '.json';
    return makeBackup(p, pw || '').then(function (text) {
      return deliver(new Blob([text], { type: 'application/json' }), name, sayFn || function () {}).then(function (how) {
        if (how === 'cancelled') return 'Not saved. Nothing left this device.';
        if (how === 'needtap') return 'It’s ready: tap “Save it now”.';
        setState({ last: Date.now() }); if (PAGE) drawWhat();
        return (how === 'shared' ? 'Sent where you chose. ' : 'Saved to your downloads as ' + name + '. ') +
          (pw ? 'Keep the password somewhere safe: without it, the file can’t be opened, and we can’t reset it.' : 'Anyone who opens this file can read it, so keep it somewhere private.');
      });
    });
  };
  // phones: the share sheet (Files, iCloud Drive, Google Drive, email to yourself); otherwise a download
  function deliver(blob, name, sayFn) {
    var file = null; try { file = new File([blob], name, { type: 'application/json' }); } catch (e) {}
    var n = W.navigator;
    if (file && coarse() && n.share && n.canShare && n.canShare({ files: [file] })) {
      return n.share({ files: [file], title: name }).then(function () { return 'shared'; }, function (e) {
        if (e && e.name === 'AbortError') return 'cancelled';
        if (e && e.name === 'NotAllowedError') { // the password step took long enough that the tap no longer counts: one more tap
          var b = btn('Save it now', 'is-strong', function () {
            n.share({ files: [file], title: name }).then(function () { setState({ last: Date.now() }); if (PAGE) drawWhat(); sayFn('Sent where you chose.'); },
              function () { download(blob, name); setState({ last: Date.now() }); if (PAGE) drawWhat(); sayFn('Saved to your downloads as ' + name + '.'); });
          });
          sayFn('It’s ready. ', b);
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

  // ---------------------------------------------------------------- the "Your progress" section (/on-this-device.html)
  function $(id) { return D.getElementById(id); }
  function say(id, text, bad, extra) { var e = $(id); if (!e) return; e.textContent = text; if (extra) e.appendChild(extra); e.classList.toggle('is-bad', !!bad); }
  function pwPair(a, b, msgId) {
    var p1 = $(a), p2 = $(b), v1 = p1 ? p1.value : '', v2 = p2 ? p2.value : '';
    if (!v1 && !v2) return { ok: true, pw: '' };
    if (v1 !== v2) { say(msgId, 'The two passwords aren’t the same. Type them again.', true); (p2 || p1).focus(); return { ok: false }; }
    if (v1.length < 6) { say(msgId, 'Use at least 6 characters, or leave both boxes empty.', true); p1.focus(); return { ok: false }; }
    return { ok: true, pw: v1 };
  }
  function countLine(g) { return (g.n === 1 ? '1 item' : g.n + ' items') + (g.last ? ' · ' + 'changed ' + day(g.last) : ''); }
  var LEVEL_NAMES = function (lv) {
    return { app: 'In the app', own: 'Your own computer', shared: 'Shared computer',
      phone: 'Phone or tablet browser', unasked: 'This computer’s browser' }[lv];
  };
  function drawLevel() {
    var host = $('tp-level'); if (!host) return;
    var lv = level(), tbl = $('tp-compare');
    host.textContent = '';
    host.appendChild(mk('p', { class: 'tp-level-h' }, 'Saving here: ' + LEVEL_NAMES(lv)));
    var p = mk('p'), acts = mk('p', { class: 'tp-acts' });
    if (lv === 'app') p.textContent = 'Your history, saved entries and automatic protection are on. Everything stays on this device.';
    else if (lv === 'own') {
      p.textContent = 'You said this is your own computer, so it keeps the same extras as the app: earlier versions, saved entries and the lock.';
      acts.appendChild(btn('Install the free app', 'is-strong', function (e) { installFlow(e.currentTarget); }));
      acts.appendChild(btn('Change to a shared computer', '', function () { chooseMode('shared'); }));
    } else if (lv === 'shared') {
      p.textContent = 'Nothing is kept after you close this tab. Before you go, take what you want with you:';
      var ul = mk('ul', { class: 'tp-take', id: 'take' });
      [['#backup', 'Save a backup file, for example to a USB stick.'],
       ['#move', 'Email a move link to yourself.'],
       ['#move', 'Show a QR code and scan it with your phone.']].forEach(function (x) { var li = mk('li'); li.appendChild(mk('a', { href: x[0] }, x[1])); ul.appendChild(li); });
      host.appendChild(p); host.appendChild(ul); p = null;
      acts.appendChild(btn('Clear everything now', 'is-danger', clearShared));
      acts.appendChild(btn('This is my own computer', '', function () { chooseMode('own'); }));
    } else if (lv === 'phone') {
      p.textContent = 'Kept in this browser, with backup, restore and move. The app lock is here too.';
      var perk = mk('p', { class: 'tp-perk' }, 'Install the free app to keep a history of your results, saved entries and an app lock.');
      host.appendChild(p); host.appendChild(perk); p = null;
      acts.appendChild(btn('Install the free app', 'is-strong', function (e) { installFlow(e.currentTarget); }));
    } else {
      p.textContent = 'Is this your own computer or a shared one? On your own, it can keep earlier versions, saved entries and a lock. On a shared or public one, nothing is kept after you close the tab.';
      acts.appendChild(btn('My own computer', 'is-strong', function () { chooseMode('own'); }));
      acts.appendChild(btn('Shared or public', '', function () { chooseMode('shared'); }));
      acts.appendChild(btn('Not sure', '', function () { chooseMode('shared'); }));
    }
    if (p) host.appendChild(p);
    if (acts.childNodes.length) host.appendChild(acts);
    if (tbl) { tbl.className = 'tp-compare tp-at-' + (lv === 'own' ? 'app' : lv === 'unasked' ? 'phone' : lv); }
  }
  function drawWhat() {
    var host = $('tp-what'); if (!host) return;
    track();
    var p = collect(), list = summary(p);
    host.textContent = '';
    if (!list.length) { host.appendChild(mk('p', { class: 'tp-none' }, 'Nothing saved yet. When you use a tool, what you keep shows up here.')); }
    else {
      host.appendChild(mk('p', { class: 'tp-what-h' }, 'Saved in this browser now:'));
      var ul = mk('ul', { class: 'tp-list' });
      list.forEach(function (g) { var li = mk('li'); li.appendChild(mk('strong', null, g.name)); li.appendChild(mk('span', null, ' · ' + countLine(g))); ul.appendChild(li); });
      host.appendChild(ul);
    }
    var s = state();
    host.appendChild(mk('p', { class: 'tp-last' }, s.last ? 'Your last backup: ' + day(s.last) + '.' : 'No backup saved from this browser yet.'));
  }
  function drawKeep() {
    var e = $('tp-persist'), b = D.querySelector('[data-tp="persist"]'); if (!e) return;
    if (level() === 'shared') { e.textContent = 'On a shared computer, nothing is kept after the tab closes, on purpose.'; if (b) b.hidden = true; return; }
    persisted().then(function (p) {
      e.className = '';
      if (p === null) { e.textContent = 'This browser doesn’t say whether it will keep it. A backup file is the sure way.'; if (b) b.hidden = true; return; }
      if (p) { e.textContent = 'Protected: this browser has agreed not to clear it to make room. Clearing your history or site data yourself still removes it, so a backup is still wise.'; e.className = 'tp-ok'; if (b) b.hidden = true; return; }
      e.textContent = state().asked
        ? 'Not protected yet. This browser decides by itself (often by how much you use the site, or whether it’s installed or bookmarked). A backup is the sure way.'
        : 'Not protected yet. This browser may clear it if the device runs low on space.';
      if (b) b.hidden = false;
    });
    var r = $('tp-remind'); if (r) r.checked = !state().off;
  }
  function perkNote(host) {
    var lv = level();
    host.appendChild(mk('p', { class: 'tp-perk' }, lv === 'shared'
      ? 'Not on a shared computer: nothing is kept here after the tab closes.'
      : 'This comes with the free app, or on your own computer.'));
    if (lv !== 'shared') host.appendChild(btn('Install the free app', '', function (e) { installFlow(e.currentTarget); }));
  }
  // ---- My saved entries
  var openEntry = null;
  function drawEntries() {
    var host = $('tp-entries'); if (!host) return;
    host.textContent = '';
    if (!perks()) { perkNote(host); return; }
    var st = local(), groups = summary(collect()).filter(function (g) { return g.id !== 'entries'; });
    var form = mk('div', { class: 'tp-entry-new' });
    if (groups.length) {
      var r1 = mk('p', { class: 'tp-row' });
      r1.appendChild(mk('label', { for: 'tp-e-tool' }, 'Tool'));
      var sel = mk('select', { id: 'tp-e-tool' });
      groups.forEach(function (g) { sel.appendChild(mk('option', { value: g.id }, g.name)); });
      r1.appendChild(sel); form.appendChild(r1);
      var r2 = mk('p', { class: 'tp-row' });
      r2.appendChild(mk('label', { for: 'tp-e-name' }, 'Name (optional)'));
      r2.appendChild(mk('input', { id: 'tp-e-name', type: 'text', maxlength: String(NAME_MAX), autocomplete: 'off' }));
      form.appendChild(r2);
      form.appendChild(btn('Save as an entry', 'is-strong', function () {
        try { saveEntry(st, { group: $('tp-e-tool').value, name: $('tp-e-name').value }); say('tp-e-msg', 'Saved. It’s in the list below.'); $('tp-e-name').value = ''; drawEntries(); drawWhat(); }
        catch (e) { say('tp-e-msg', errText(e), true); }
      }));
    } else form.appendChild(mk('p', { class: 'tp-none' }, 'Use a tool first; then you can save its answers here as an entry.'));
    form.appendChild(mk('p', { id: 'tp-e-msg', class: 'tp-status', role: 'status', 'aria-live': 'polite' }));
    host.appendChild(form);
    var list = entries(st).sort(function (a, b) { return b.t - a.t; });
    if (!list.length) { host.appendChild(mk('p', { class: 'tp-none' }, 'No saved entries yet.')); return; }
    var ul = mk('ul', { class: 'tp-entries' });
    list.forEach(function (e) {
      var li = mk('li', { 'data-entry': e.id });
      li.appendChild(mk('strong', null, e.name));
      li.appendChild(mk('span', { class: 'tp-e-meta' }, groupName(e.g) + ' · ' + dayTime(e.t) + ' · ' + e.sum));
      var a = mk('p', { class: 'tp-acts' });
      a.appendChild(btn(openEntry === e.id ? 'Close' : 'Open', 'is-small', function () { openEntry = openEntry === e.id ? null : e.id; drawEntries(); var n = D.querySelector('[data-entry="' + e.id + '"] button'); if (n) n.focus(); }, { 'aria-expanded': String(openEntry === e.id) }));
      a.appendChild(btn('Rename', 'is-small', function () {
        var n = W.prompt('New name for this entry', e.name); if (n == null) return;
        if (renameEntry(st, e.id, n)) drawEntries();
      }));
      a.appendChild(btn('Delete', 'is-small', function () {
        confirmClear({ what: 'the saved entry “' + e.name + '”', items: [{ name: groupName(e.g) + ' · ' + dayTime(e.t), n: 0 }],
          onConfirm: function () { deleteEntry(st, e.id); if (openEntry === e.id) openEntry = null; drawEntries(); drawWhat(); } });
      }));
      li.appendChild(a);
      if (openEntry === e.id) li.appendChild(entryDetail(e, list));
      ul.appendChild(li);
    });
    host.appendChild(ul);
  }
  function linesBox(rows) {
    var dl = mk('dl', { class: 'tp-lines' });
    rows.slice(0, 200).forEach(function (r) { dl.appendChild(mk('dt', null, r[0])); dl.appendChild(mk('dd', null, r[1])); });
    if (rows.length > 200) dl.appendChild(mk('dd', null, '…and ' + (rows.length - 200) + ' more'));
    return dl;
  }
  function entryDetail(e, list) {
    var box = mk('div', { class: 'tp-e-detail' });
    var rows = rowsOf(e);
    box.appendChild(mk('p', { class: 'tp-what-h' }, 'What was saved'));
    if (e.kind === 'result' && e.text) box.appendChild(mk('p', { class: 'tp-e-text' }, e.text));
    else box.appendChild(rows.length ? linesBox(rows) : mk('p', { class: 'tp-none' }, 'No answers in this one.'));
    var acts = mk('p', { class: 'tp-acts' });
    if (e.kind !== 'result') {
    acts.appendChild(btn('Put this back in the tool', '', function () {
      if (!W.confirm('Put this entry back? What the tool has now is replaced (it stays in Earlier versions).')) return;
      recordHistory(local()); var n = putBack(local(), e.id); recordHistory(local());
      say('tp-e-msg', n ? 'Put back. Open the tool to see it.' : 'Couldn’t put it back.', !n); drawWhat(); drawHistory();
    }));
    box.appendChild(acts);
    }
    var same = list.filter(function (x) { return x.g === e.g && x.id !== e.id; });
    if (same.length) {
      var r = mk('p', { class: 'tp-row' });
      r.appendChild(mk('label', { for: 'tp-cmp-' + e.id }, 'Compare with'));
      var sel = mk('select', { id: 'tp-cmp-' + e.id });
      same.forEach(function (x) { sel.appendChild(mk('option', { value: x.id }, x.name + ' · ' + day(x.t))); });
      r.appendChild(sel);
      var out = mk('div', { class: 'tp-diff', 'aria-live': 'polite' });
      r.appendChild(btn('Compare', 'is-small', function () {
        var other = same.filter(function (x) { return x.id === sel.value; })[0]; if (!other) return;
        var older = other.t < e.t ? other : e, newer = older === e ? other : e;
        var d = compare(older, newer); out.textContent = '';
        out.appendChild(mk('p', { class: 'tp-what-h' }, 'From ' + day(older.t) + ' to ' + day(newer.t) + ': ' + (d.length ? d.length + ' changes' : 'no changes')));
        var ul = mk('ul', { class: 'tp-list' });
        d.slice(0, 100).forEach(function (c) {
          ul.appendChild(mk('li', null, c.path + ': ' + (c.was === null ? 'added “' + c.now + '”' : c.now === null ? 'removed (was “' + c.was + '”)' : '“' + c.was + '” → “' + c.now + '”')));
        });
        out.appendChild(ul);
      }));
      box.appendChild(r); box.appendChild(out);
    }
    return box;
  }
  // ---- Earlier versions
  function drawHistory() {
    var host = $('tp-history'); if (!host) return;
    host.textContent = '';
    if (!perks()) { perkNote(host); return; }
    var st = local(); recordHistory(st);
    var h = versions(st), keys = Object.keys(h).filter(function (k) { return h[k].length > 1; }).sort();
    if (!keys.length) { host.appendChild(mk('p', { class: 'tp-none' }, ('Nothing yet. Each time you change something in a tool, the version before is kept here (the last ' + (HIST_N - 1) + ').'))); return; }
    var counts = {}; keys.forEach(function (k) { var g = groupOf(k); counts[g] = (counts[g] || 0) + 1; });
    keys.forEach(function (k, i) {
      var g = groupOf(k), name = groupName(g) + (counts[g] > 1 ? ' (' + k.replace(/^(tol-|cwd-|bears-dojo-)/, '') + ')' : '');
      var row = mk('div', { class: 'tp-hist' });
      var r = mk('p', { class: 'tp-row' });
      r.appendChild(mk('label', { for: 'tp-h-' + i }, name));
      var sel = mk('select', { id: 'tp-h-' + i });
      h[k].slice(0, -1).reverse().forEach(function (v) { sel.appendChild(mk('option', { value: String(v.t) }, dayTime(v.t))); });
      r.appendChild(sel);
      r.appendChild(btn('Go back to this version', 'is-small', function () {
        if (!W.confirm('Go back to the version from ' + sel.options[sel.selectedIndex].text + '? The one you have now stays in this list.')) return;
        var ok = goBack(st, k, +sel.value);
        say('tp-h-msg', ok ? 'Done. Open the tool to see that version.' : 'Couldn’t go back to that one.', !ok);
        drawHistory(); drawWhat();
      }));
      row.appendChild(r); host.appendChild(row);
    });
    host.appendChild(mk('p', { id: 'tp-h-msg', class: 'tp-status', role: 'status', 'aria-live': 'polite' }));
  }
  // ---- The app lock
  function drawLock() {
    var host = $('tp-lock'); if (!host) return;
    host.textContent = '';
    var lv = level(), st = local(), rec = readLock(st);
    if (lv === 'shared') { host.appendChild(mk('p', { class: 'tp-perk' }, 'Not on a shared computer: nothing is kept here after the tab closes.')); return; }
    host.appendChild(mk('p', { class: 'tp-note' }, 'A privacy screen: after some time away, the site asks for your passcode before showing anything. It doesn’t encrypt what’s stored, and someone who clears this site’s data in the browser’s settings removes the lock along with everything else.'));
    var minsSel = function (id, cur) {
      var s = mk('select', { id: id });
      [[1, '1 minute away'], [5, '5 minutes away'], [15, '15 minutes away'], [60, '1 hour away'], [0, 'Every time it opens']].forEach(function (o) { var op = mk('option', { value: String(o[0]) }, o[1]); if (o[0] === cur) op.selected = true; s.appendChild(op); });
      return s;
    };
    if (!rec) {
      var r1 = mk('p', { class: 'tp-row' });
      r1.appendChild(mk('label', { for: 'tp-pin1' }, 'Choose a passcode (4 to 6 digits)'));
      r1.appendChild(mk('input', { id: 'tp-pin1', type: 'password', inputmode: 'numeric', pattern: '[0-9]*', maxlength: '6', autocomplete: 'new-password', class: 'tp-pin' }));
      var r2 = mk('p', { class: 'tp-row' });
      r2.appendChild(mk('label', { for: 'tp-pin2' }, 'Type it again'));
      r2.appendChild(mk('input', { id: 'tp-pin2', type: 'password', inputmode: 'numeric', pattern: '[0-9]*', maxlength: '6', autocomplete: 'new-password', class: 'tp-pin' }));
      var r3 = mk('p', { class: 'tp-row' });
      r3.appendChild(mk('label', { for: 'tp-mins' }, 'Lock after'));
      r3.appendChild(minsSel('tp-mins', 5));
      host.appendChild(r1); host.appendChild(r2); host.appendChild(r3);
      host.appendChild(btn('Turn on the lock', 'is-strong', function (ev) {
        var a = $('tp-pin1').value, b = $('tp-pin2').value;
        if (!validPin(a)) { say('tp-lock-msg', 'Use 4 to 6 digits.', true); $('tp-pin1').focus(); return; }
        if (a !== b) { say('tp-lock-msg', 'The two passcodes aren’t the same.', true); $('tp-pin2').focus(); return; }
        ev.currentTarget.disabled = true;
        pinRecord(a, +$('tp-mins').value).then(function (r) { r.away = Date.now(); writeLock(st, r); drawLock(); say('tp-lock-msg', 'The lock is on. Keep your passcode in mind: it can’t be reset.'); });
      }));
    } else {
      host.appendChild(mk('p', { class: 'tp-ok' }, 'The lock is on.'));
      var r4 = mk('p', { class: 'tp-row' });
      r4.appendChild(mk('label', { for: 'tp-mins' }, 'Lock after'));
      var ms = minsSel('tp-mins', rec.mins); r4.appendChild(ms);
      ms.addEventListener('change', function () { var r = readLock(st); if (r) { r.mins = +ms.value; writeLock(st, r); say('tp-lock-msg', 'Saved.'); } });
      host.appendChild(r4);
      var acts = mk('p', { class: 'tp-acts' });
      acts.appendChild(btn('Lock now', '', function () { lockNow(); }));
      var pk = mk('span'); acts.appendChild(pk);
      passkeyReady().then(function (ok) {
        if (!ok) return;
        if (rec.cred) pk.appendChild(btn('Stop using Face ID or fingerprint', '', function () { var r = readLock(st); delete r.cred; writeLock(st, r); drawLock(); }));
        else pk.appendChild(btn('Also unlock with Face ID, Touch ID or fingerprint', '', function () {
          passkeyCreate().then(function (id) { var r = readLock(st); r.cred = id; writeLock(st, r); drawLock(); say('tp-lock-msg', 'Done. The lock screen will offer it, with your passcode as the backup.'); },
            function () { say('tp-lock-msg', 'That wasn’t set up. Your passcode still works.', true); });
        }));
      });
      host.appendChild(acts);
      var r5 = mk('p', { class: 'tp-row' });
      r5.appendChild(mk('label', { for: 'tp-pin-off' }, 'To turn it off, type your passcode'));
      var po = mk('input', { id: 'tp-pin-off', type: 'password', inputmode: 'numeric', pattern: '[0-9]*', maxlength: '6', autocomplete: 'off', class: 'tp-pin' });
      r5.appendChild(po);
      r5.appendChild(btn('Turn off the lock', '', function () {
        checkPin(po.value, readLock(st)).then(function (ok) {
          if (!ok) { say('tp-lock-msg', 'That’s not your passcode.', true); po.value = ''; po.focus(); return; }
          writeLock(st, null); drawLock(); say('tp-lock-msg', 'The lock is off.');
        });
      }));
      host.appendChild(r5);
    }
    host.appendChild(mk('p', { id: 'tp-lock-msg', class: 'tp-status', role: 'status', 'aria-live': 'polite' }));
    host.appendChild(mk('p', { class: 'tp-note' }, 'Why your saved entries aren’t encrypted with the passcode: a 4 to 6 digit passcode has at most a million possibilities, so anyone who copied this browser’s data could try them all quickly. It would only look safe. For real protection, save a backup file with a long password.'));
  }
  // ---- Clear my data: everything, or one tool
  function drawClear() {
    var host = $('tp-clear'); if (!host) return;
    host.textContent = '';
    var groups = summary(collect());
    var fs = mk('fieldset', { class: 'tp-mode' });
    fs.appendChild(mk('legend', null, 'What to clear'));
    var l1 = mk('label'), r1 = mk('input', { type: 'radio', name: 'tp-clr', value: 'all' }); r1.checked = true; l1.appendChild(r1); l1.appendChild(D.createTextNode(' ' + 'Everything this site keeps on this device')); fs.appendChild(l1);
    var l2 = mk('label'), r2 = mk('input', { type: 'radio', name: 'tp-clr', value: 'one' }); l2.appendChild(r2); l2.appendChild(D.createTextNode(' ' + 'One tool:' + ' '));
    var sel = mk('select', { id: 'tp-clr-tool', 'aria-label': 'Which tool' });
    groups.forEach(function (g) { sel.appendChild(mk('option', { value: g.id }, g.name)); });
    if (!groups.length) { r2.disabled = true; sel.disabled = true; }
    sel.addEventListener('change', function () { r2.checked = true; });
    l2.appendChild(sel); fs.appendChild(l2);
    host.appendChild(fs);
    host.appendChild(btn('Clear…', 'is-danger', function () {
      var one = r2.checked && sel.value;
      if (!one) {
        confirmClear({ what: 'everything you’ve saved on this device', items: groups.map(function (g) { return { name: g.name, n: g.n }; }),
          doneText: 'Cleared. Nothing you saved is left on this device.',
          onConfirm: function () { return eraseEverything().then(drawAll); } });
        return;
      }
      var st = local(), keys = groupKeys(st, one), es = entries(st).filter(function (e) { return e.g === one; }), h = versions(st), hv = 0;
      keys.forEach(function (k) { if (h[k]) hv += h[k].length; });
      var items = [{ name: groupName(one), n: keys.length }];
      if (es.length) items.push({ name: 'Saved entries for it', n: es.length });
      if (hv) items.push({ name: 'Earlier versions of it', n: hv });
      confirmClear({ what: groupName(one), items: items, onConfirm: function () {
        keys.forEach(function (k) { try { st.removeItem(k); } catch (e) {} });
        dropHistory(st, keys);
        es.forEach(function (e) { deleteEntry(st, e.id); });
        track(st); drawAll();
      } });
    }));
  }

  // a backup or link coming in: password if needed → what's in it → Add or Replace
  var incoming = null;
  function inBox() { return $('tp-in'); }
  function startIncoming(src) {
    var box = inBox(); if (!box) return;
    incoming = src; box.hidden = false; box.textContent = '';
    box.appendChild(mk('p', { class: 'tp-in-h' }, src.kind === 'link'
      ? 'This link holds progress from another device or browser. Nothing has changed here yet.'
      : 'Backup file: ' + (src.name || '')));
    if (src.encrypted) {
      var row = mk('p', { class: 'tp-row' });
      row.appendChild(mk('label', { for: 'tp-in-pw' }, 'Its password'));
      var inp = mk('input', { id: 'tp-in-pw', type: 'password', autocomplete: 'current-password', autocapitalize: 'off', spellcheck: 'false' });
      row.appendChild(inp); row.appendChild(btn('Open it', 'is-strong', null, { 'data-tp': 'unlock' })); box.appendChild(row);
      inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); unlockIn(); } });
      box.appendChild(mk('p', { id: 'tp-in-msg', class: 'tp-status', role: 'status', 'aria-live': 'polite' }));
      box.appendChild(btn('Cancel', '', null, { 'data-tp': 'cancel' }));
      inp.focus();
    } else {
      box.appendChild(mk('p', { id: 'tp-in-msg', class: 'tp-status', role: 'status', 'aria-live': 'polite' }, 'Reading it…'));
      unlockIn();
    }
  }
  function unlockIn() {
    if (!incoming) return;
    var pw = $('tp-in-pw') ? $('tp-in-pw').value : '';
    if (incoming.encrypted && !pw) { say('tp-in-msg', errText({ code: 'needpassword' }), true); return; }
    say('tp-in-msg', 'Opening…');
    var b = D.querySelector('[data-tp="unlock"]'); if (b) b.disabled = true;
    (incoming.kind === 'link' ? unpackLink(incoming.raw, pw) : readBackup(incoming.raw, pw))
      .then(preview, function (e) { if (b) b.disabled = false; say('tp-in-msg', errText(e), true); if ($('tp-in-pw')) $('tp-in-pw').focus(); });
  }
  function preview(payload) {
    var box = inBox(); incoming.payload = payload;
    box.textContent = '';
    box.appendChild(mk('p', { class: 'tp-in-h' }, (incoming.kind === 'link' ? 'From the link' : 'From the backup') +
      (payload.created ? ', made ' + day(Date.parse(payload.created)) : '') + '. It holds:'));
    var ul = mk('ul', { class: 'tp-list' });
    summary(payload).forEach(function (g) { var li = mk('li'); li.appendChild(mk('strong', null, g.name)); li.appendChild(mk('span', null, ' · ' + countLine(g))); ul.appendChild(li); });
    box.appendChild(ul);
    if (payload.dropped) box.appendChild(mk('p', { class: 'tp-warn is-bad' }, (payload.dropped + ' item(s) didn’t look right and will be left out.')));
    if (level() === 'shared') box.appendChild(mk('p', { class: 'tp-warn' }, 'This is a shared computer: what you restore is kept only until you close this tab.'));
    var fs = mk('fieldset', { class: 'tp-mode' });
    fs.appendChild(mk('legend', null, 'How to bring it in'));
    [['merge', 'Add it to what’s here. Where both have the same thing, the newer one stays.'],
     ['replace', 'Replace what’s here with the backup. Progress here that isn’t in it is removed.']].forEach(function (o, i) {
      var l = mk('label'), r = mk('input', { type: 'radio', name: 'tp-mode', value: o[0] }); if (!i) r.checked = true;
      l.appendChild(r); l.appendChild(D.createTextNode(' ' + o[1])); fs.appendChild(l);
    });
    box.appendChild(fs);
    var acts = mk('p', { class: 'tp-acts' });
    acts.appendChild(btn('Restore', 'is-strong', null, { 'data-tp': 'apply' }));
    acts.appendChild(btn('Cancel', '', null, { 'data-tp': 'cancel' }));
    box.appendChild(acts);
    box.appendChild(mk('p', { id: 'tp-in-msg', class: 'tp-status', role: 'status', 'aria-live': 'polite' }));
    box.querySelector('[data-tp="apply"]').focus();
  }
  function apply() {
    if (!incoming || !incoming.payload) return;
    var m = D.querySelector('input[name="tp-mode"]:checked'), mode = m ? m.value : 'merge';
    if (mode === 'replace' && !W.confirm('Replace the progress in this browser with the backup? What’s here now and not in the backup will be removed.')) return;
    if (perks()) recordHistory(local());
    var r = restore(incoming.payload, mode);
    var box = inBox(); box.textContent = '';
    var parts = [];
    if (r.added) parts.push(r.added + ' added');
    if (r.updated) parts.push(r.updated + ' updated');
    if (r.kept) parts.push(r.kept + ' already up to date here');
    if (r.removed) parts.push(r.removed + ' removed');
    box.appendChild(mk('p', { class: 'tp-ok', role: 'status' }, 'Restored. ' + (parts.join(', ') || 'Nothing needed changing') + '.' +
      (r.failed ? ' ' + (r.failed + ' couldn’t be saved: this browser is out of room or won’t keep things.') : '') +
      ' ' + 'Open any tool to see it.'));
    incoming = null;
    if (perks()) recordHistory(local());
    drawAll();
    try { D.dispatchEvent(new CustomEvent('tol-progress-restored', { detail: r })); } catch (e) {}
    if (level() !== 'shared' && hasMeaningful(local()) && !isFirefox()) persist().then(drawKeep);
  }
  function cancelIncoming() { incoming = null; var b = inBox(); if (b) { b.hidden = true; b.textContent = ''; } var f = $('tp-file'); if (f) f.value = ''; }

  function backup() {
    var pw = pwPair('tp-pw1', 'tp-pw2', 'tp-backup-msg'); if (!pw.ok) return;
    var btnB = D.querySelector('[data-tp="backup"]'); btnB.disabled = true;
    say('tp-backup-msg', pw.pw ? 'Locking it with your password…' : 'Making the file…');
    API.saveBackup(pw.pw, function (t, extra) { say('tp-backup-msg', t, false, extra); if (extra) extra.focus(); })
      .then(function (t) { btnB.disabled = false; if (!/Save it now|Guardarlo ahora/.test(t) || !$('tp-backup-msg').querySelector('button')) say('tp-backup-msg', t); })
      .catch(function (e) { btnB.disabled = false; say('tp-backup-msg', errText(e), true); });
  }
  var lastLink = '';
  function makeLink() {
    var pw = pwPair('tp-lpw1', 'tp-lpw2', 'tp-link-msg'); if (!pw.ok) return;
    var p = collect();
    if (!Object.keys(p.keys).length) { say('tp-link-msg', 'There’s nothing to move yet.', true); return; }
    if (!pw.pw && !W.confirm('Make the link without a password? Anyone who gets the link can open your progress. A password is strongly suggested.')) return;
    say('tp-link-msg', 'Making the link…');
    packLink(p, pw.pw).then(function (packed) {
      var box = $('tp-link');
      if (packed.length > MAX_LINK) { box.hidden = true; say('tp-link-msg', 'There’s too much to fit in a link. Use “Save a backup” instead, then open the file on the other device.', true); return; }
      lastLink = location.origin + '/on-this-device.html#restore=' + packed;
      $('tp-link-text').value = lastLink;
      box.hidden = false;
      var qrOk = lastLink.length <= 2000;
      D.querySelector('[data-tp="qr"]').hidden = !qrOk;
      D.querySelector('[data-tp="share-link"]').hidden = !W.navigator.share;
      D.querySelector('[data-tp="email-link"]').hidden = lastLink.length > 8000;
      say('tp-link-msg', (pw.pw ? 'Ready. Open it on the other device and type the password there. ' : 'Ready. Anyone with this link can open it, so send it only to yourself. ') +
        (qrOk ? '' : 'It’s too long for a QR code: copy it, email it or share it to yourself.'));
    }).catch(function (e) { say('tp-link-msg', errText(e), true); });
  }
  function copyLink() {
    var t = $('tp-link-text'), done = function (ok) { say('tp-link-msg', ok ? 'Link copied. Paste it into a note or a message to yourself.' : 'Couldn’t copy. Select the link above and copy it.', !ok); };
    var legacy = function () { t.select(); var ok = false; try { ok = D.execCommand('copy'); } catch (e) {} done(ok); };
    if (W.navigator.clipboard && W.navigator.clipboard.writeText) W.navigator.clipboard.writeText(lastLink).then(function () { done(true); }, legacy); else legacy();
  }
  function showQR() {
    var go = function () { if (W.TOLShareKit && W.TOLShareKit.showQR) W.TOLShareKit.showQR(lastLink, { title: 'Scan with the other device', note: 'Point the other phone’s camera at this code. The link opens there and asks before restoring anything.' }); };
    if (W.TOLShareKit) { go(); return; }
    var s = D.createElement('script'); s.src = '/assets/js/share-kit.js'; s.onload = go; D.head.appendChild(s);
  }
  function emailLink() {
    var subj = 'My Spread Love & Acceptance progress';
    var body = 'Open this link on the device where you want your progress. It asks before restoring anything.' + '\n\n' + lastLink;
    location.href = 'mailto:?subject=' + encodeURIComponent(subj) + '&body=' + encodeURIComponent(body);
  }
  function shareLink() { if (W.navigator.share) W.navigator.share({ url: lastLink, title: 'My Spread Love & Acceptance progress' }).catch(function () {}); }
  function openPasted() {
    var v = ($('tp-paste').value || '').trim(), info;
    try { info = linkInfo(v); } catch (e) { say('tp-paste-msg', 'That doesn’t look like a move link. It should have “#restore=” in it.', true); return; }
    say('tp-paste-msg', ''); $('tp-paste').value = '';
    startIncoming({ kind: 'link', raw: v, encrypted: info.encrypted });
    var r = $('restore'); if (r) r.scrollIntoView({ block: 'start' });
  }
  function badIn(text) { var box = inBox(); incoming = null; box.hidden = false; box.textContent = ''; box.appendChild(mk('p', { class: 'tp-status is-bad', role: 'status' }, text)); box.appendChild(btn('Close', '', null, { 'data-tp': 'cancel' })); }
  function pickFile(f) {
    if (!f) return;
    if (f.size > MAX_FILE) { badIn(errText({ code: 'big' })); return; }
    var rd = new FileReader();
    rd.onload = function () {
      var text = String(rd.result || ''), info;
      try { info = inspect(text); } catch (e) { badIn(errText(e)); return; }
      startIncoming({ kind: 'file', name: f.name, raw: text, encrypted: info.encrypted });
    };
    rd.onerror = function () { badIn(errText({})); };
    rd.readAsText(f);
  }
  function syncWarn(a, b, warnId) {
    var w = $(warnId); if (!w) return;
    var empty = !($(a).value || $(b).value);
    w.textContent = empty
      ? 'No password: anyone who opens it can read what’s in it. Adding one is best.'
      : 'Locked with your password. Without it, nobody can open it, not even us, so keep it somewhere safe.';
    w.classList.toggle('is-bad', empty);
  }
  function drawAll() { drawLevel(); drawWhat(); drawKeep(); drawEntries(); drawHistory(); drawLock(); drawClear(); var h = $('tp-app-hint'); if (h) h.hidden = !isApp(); }
  function section() {
    var root = D.querySelector('section.tp'); if (!root) return;
    css();
    root.classList.add('tp-live');
    drawAll();
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
      else if (t.hasAttribute('data-tp-show')) t.getAttribute('data-tp-show').split(' ').forEach(function (id) { var i = $(id); if (i) i.type = t.checked ? 'text' : 'password'; });
    });
    root.addEventListener('click', function (e) {
      var b = e.target.closest('[data-tp]'); if (!b) return;
      var k = b.getAttribute('data-tp');
      if (k === 'backup') backup();
      else if (k === 'link') makeLink();
      else if (k === 'copy') copyLink();
      else if (k === 'qr') showQR();
      else if (k === 'share-link') shareLink();
      else if (k === 'email-link') emailLink();
      else if (k === 'paste') openPasted();
      else if (k === 'unlock') unlockIn();
      else if (k === 'apply') apply();
      else if (k === 'cancel') cancelIncoming();
      else if (k === 'persist') { b.disabled = true; persist().then(function () { b.disabled = false; drawKeep(); }); }
    });
    var pi = $('tp-paste'); if (pi) pi.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); openPasted(); } });
    // the rest of the page (Erase, Erase everything) changes what's kept: redraw after it
    D.addEventListener('click', function (e) { if (e.target.closest('[data-erase], [data-od]')) setTimeout(drawAll, 80); });
    D.addEventListener('tol-progress-changed', drawAll);
    // a move link: read it, take it out of the address bar, and offer to restore (never automatically)
    var hsh = location.hash || '';
    if (hsh.indexOf('#restore=') === 0) {
      try { history.replaceState(null, '', location.pathname + location.search + '#restore'); } catch (er) {}
      var info = null; try { info = linkInfo(hsh); } catch (er) {}
      if (info) startIncoming({ kind: 'link', raw: hsh, encrypted: info.encrypted });
      else badIn('This move link is incomplete or damaged. Copy the whole link again, or use a backup file.');
      var r = $('restore'); if (r) setTimeout(function () { r.scrollIntoView({ block: 'start' }); }, 60);
    }
  }

  function start() {
    try { everywhere(); } catch (e) { reveal(); }
    if (PAGE) section();
  }
  if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', start); else start();
})(typeof globalThis !== 'undefined' ? globalThis : this);
