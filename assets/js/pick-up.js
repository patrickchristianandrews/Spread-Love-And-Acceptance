/* pick-up.js — "Pick up where you left off" and "I have 2, 5 or 10 minutes".
   site.js loads this on the home page (inside the opening block) and when the menu opens.
   Everything it shows is read from this browser: the last pages you opened here (site.js keeps a
   short list; /on-this-device.html shows it and erases it), the six weeks, today's weather, your
   progress and any drafts the tools keep on this device. Nothing is sent anywhere.
   In Focus mode (site.js, window.TOLFocus) the suggestions keep to the chosen areas. */
(function () {
  'use strict';
  if (window.TOLPickUp) return;
  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  // Focus mode: a suggestion fits when it's in the chosen areas (or belongs to none, like Breathe)
  function fits(u) { var F = window.TOLFocus; try { return !F || !F.isOn() || F.allows(u); } catch (e) { return true; } }
  function keepFits(list, url) { var f = list.filter(function (x) { return fits(url(x)); }); return f.length ? f : list; }
  function json(k) { try { return JSON.parse(lsGet(k) || 'null'); } catch (e) { return null; } }
  function esc(t) { return String(t == null ? '' : t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function ago(ms) {
    var m = Math.round((Date.now() - ms) / 60000);
    if (m < 2) return 'just now'; if (m < 60) return m + ' minutes ago';
    var h = Math.round(m / 60); if (h < 24) return h === 1 ? 'an hour ago' : h + ' hours ago';
    var d = Math.round(h / 24); return d === 1 ? 'yesterday' : d < 14 ? d + ' days ago' : 'a while ago';
  }
  function today() { var d = new Date(); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
  function keys() { var out = []; try { for (var i = 0; i < localStorage.length; i++) out.push(localStorage.key(i)); } catch (e) {} return out; }

  // what a tool remembers, in plain words, so the card can say where you were
  var WP_NAMES = { 'WP-01': 'Who did what (WP-01)', 'WP-02': 'How much are you carrying? (WP-02)', 'WP-03': 'One owner per job (WP-03)', 'WP-04': 'What keeps coming back? (WP-04)',
    'WP-09': 'Say it so it lands (WP-09)', 'WP-11': 'The Calm-Down Kit (WP-11)', 'WP-13': 'The 90-second daily check-in (WP-13)' };
  function drafts() {
    var out = [];
    keys().forEach(function (k) {
      var m = /^tol-wpf-keep:(.+)$/.exec(k); if (!m) return;
      var d = json(k) || {}, id = m[1];
      if (id === 'suite' || id.indexOf('suite') === 0) out.push({ t: 'The Workpaper Suite', u: '/workpapers/fill/suite.html', when: d.saved });
      else if (id === 'fullpath') out.push({ t: 'The workpaper package', u: '/workpapers/fill/suite.html#full-path', when: d.saved });
      else { var code = id.split(':')[0].toUpperCase(); out.push({ t: WP_NAMES[code] || code, u: '/workpapers/fill/' + code.toLowerCase() + '.html', when: d.saved }); }
    });
    if (lsGet('tol-wiring-card')) out.push({ t: 'Your Wiring Card', u: '/wiring-card.html' });
    if (lsGet('tol-wavelength-v1') || lsGet('tol-heartprint-v1')) out.push({ t: 'Wavelength', u: '/wavelength.html' });
    var lem = json('tol-lemonade-stand-v2'); if (lem && lem.jobs && lem.jobs.some(function (j) { return j && j.name; }) && !lem.example) out.push({ t: 'The Lemonade Stand', u: '/lemonade-stand.html' });
    var cw = json('cwd-v1'); if (cw && ((cw.log && cw.log.length) || Object.keys(cw.done || {}).length)) out.push({ t: 'The Carrier Wave Decoder', u: '/carrier-wave-decoder.html', note: Object.keys(cw.done || {}).length ? Object.keys(cw.done).length + ' practice' + (Object.keys(cw.done).length === 1 ? '' : 's') + ' done' : '' });
    if (lsGet('tol-calc01-full-v2')) out.push({ t: 'Is the setup working for everyone? (the long form)', u: '/is-the-setup-working.html' });
    return out;
  }
  function sixWeeks() {
    var v = json('tol-prog01-v1'); if (!v || !v.on) return null;
    var n = 0; for (var i = 1; i <= 6; i++) if ((v.done || []).indexOf(i) === -1) { n = i; break; }
    return n ? 'You’re on week ' + n + ' of 6' : 'All six weeks done';
  }
  var SKY = { clear: 'clear', gusty: 'gusty', fog: 'fogged in' };
  function weather() {
    var a = json('tol-weather-v1'); if (!Array.isArray(a) || !a.length) return null;
    var e = a[a.length - 1]; if (!e || e.d !== today()) return null;
    return 'Your weather today: ' + (SKY[e.sky] || 'logged');
  }
  // the safety page and the chat are never shown back, so nobody picking up a shared phone sees them
  function recent() { var r = json('tol-recent'); return Array.isArray(r) ? r.filter(function (x) { return x && !/^\/(safety|ask|teens|upset-right-now)\.html/.test(x.u || ''); }) : []; }

  // ---------- coming back: your next step, and what's new since your last visit ----------
  // NEWS mirrors the newest sections of whats-new.html (add a line here when that page gets a new date).
  var NEWS = [
    ['2026-10-07', 'Caring for someone you love', '/caregivers.html'],
    ['2026-10-07', 'En español', '/en-espanol.html'],
    ['2026-10-07', 'At work: the plain version for teams', '/work.html'],
    ['2026-10-07', 'Grief and later life', '/grief.html'],
    ['2026-10-07', 'Everything is open, no sign-up', '/ways-in.html'],
    ['2026-10-07', 'For teens', '/teens.html'],
    ['2026-10-07', 'The book: an “On your own” part in every chapter', '/book/chapter-1.html#on-your-own'],
    ['2026-10-07', 'A weekly reminder in your own calendar', '/self-path.html#steps'],
    ['2026-10-06', 'Not safe at home?', '/safety.html'],
    ['2026-10-06', 'For parents', '/parents.html'],
    ['2026-10-06', 'Leading a group', '/groups.html'],
    ['2026-10-04', 'Tidbit and Sugarfoot’s Arcade', '/frequency-journey.html']
  ];
  var SELF_STEPS = [['battery', 'Check your battery'], ['wiring', 'Get to know your wiring'], ['lens', 'See where your lens came from'],
    ['settle', 'Plan what settles you'], ['words', 'Find words for what you feel'], ['no', 'Practice kind ways to say no']];
  var BOOK_ORDER = [['/book/self-1-then.html', 'Part One: where you came from'], ['/book/self-2-now.html', 'Part One: who you are today'], ['/book/self-3-next.html', 'Part One: who you are becoming'],
    ['/book/preface.html', 'The Preface: the work nobody sees'], ['/book/chapter-1.html', 'Chapter I: why we get out of tune'], ['/book/chapter-2.html', 'Chapter II: is the split working?'],
    ['/book/chapter-3.html', 'Chapter III: full tanks'], ['/book/chapter-4.html', 'Chapter IV: two kinds of fair'], ['/book/chapter-5.html', 'Chapter V: the monthly look-back']];
  function lastVisitDay() {
    var days = json('tol-visit-days'), t = today(), prev = '';
    // site.js keeps these as Date.toDateString() ("Wed Oct 07 2026"); read either that or YYYY-MM-DD
    (Array.isArray(days) ? days : []).forEach(function (d) { d = isoDay(d); if (d && d < t && d > prev) prev = d; });
    return prev;
  }
  function isoDay(d) {
    if (typeof d !== 'string') return '';
    if (/^\d{4}-\d\d-\d\d$/.test(d)) return d;
    var x = new Date(d); if (isNaN(x.getTime())) return '';
    return x.getFullYear() + '-' + ('0' + (x.getMonth() + 1)).slice(-2) + '-' + ('0' + x.getDate()).slice(-2);
  }
  function daysSince(d) { if (!d) return 0; return Math.round((new Date(today() + 'T12:00:00') - new Date(d + 'T12:00:00')) / 864e5); }
  function nextStep() {
    var sp = json('tol-selfpath-v1'), done = (sp && Array.isArray(sp.done)) ? sp.done : [];
    if (done.length && done.length < SELF_STEPS.length) {
      for (var i = 0; i < SELF_STEPS.length; i++) if (done.indexOf(SELF_STEPS[i][0]) === -1)
        return { t: 'Your self path, Step ' + (i + 1) + ': ' + SELF_STEPS[i][1], u: '/self-path.html#' + SELF_STEPS[i][0], note: done.length + ' of 6 done' };
    }
    var cb = json('tol-come-back-v1'), read = (cb && cb.read) || {};
    var started = BOOK_ORDER.some(function (b) { return read[b[0]]; });
    if (started) for (var j = 0; j < BOOK_ORDER.length; j++) if (!read[BOOK_ORDER[j][0]]) return { t: 'The book, next: ' + BOOK_ORDER[j][1], u: BOOK_ORDER[j][0] };
    return null;
  }

  // things left partway through: the Re-check Drive and Turning toward's seven days
  function inProgress() {
    var out = [], rd = json('tol-recheck-drive-v1');
    if (rd && rd.started && !rd.kicked && typeof rd.yards === 'number') {
      var togo = Math.max(1, 100 - rd.yards);
      out.push({ t: 'Your Re-check Drive', u: '/recheck-drive.html', note: togo + ' yards to go' });
    }
    var tt = json('tol-tt-7day'), n = 0;
    if (tt && typeof tt === 'object') for (var k in tt) if (tt[k]) n++;
    if (n > 0 && n < 7) out.push({ t: 'Turning toward, seven days', u: '/turning-toward.html', note: n + ' of 7 done' });
    return out;
  }
  function card(where) {
    var here = location.pathname.replace(/\/$/, '/index.html');
    var seenT = {}, rec = recent().filter(function (r) { if (!r || !r.u || r.u === here || seenT[r.t]) return false; seenT[r.t] = 1; return true; }), last = rec[0];  // one line per page name (the simple page and its fill-in share a name)
    var d = drafts(), six = sixWeeks(), wx = weather(), prev = lastVisitDay(), gap = daysSince(prev), nx = nextStep();
    var fresh = prev ? NEWS.filter(function (n) { return n[0] > prev && fits(n[2]); }).slice(0, 3) : [];
    var prog = inProgress();
    var pg = window.TOLProgress && window.TOLProgress.html ? window.TOLProgress.html() : '';
    if (!last && !d.length && !six && !nx && !fresh.length && !prog.length && !pg) return null;
    var rows = '';
    // only on the first look this visit: not when they were on another page a few minutes ago
    var justHere = last && last.at && Date.now() - last.at < 6 * 3600e3;
    if (where !== 'menu' && gap >= 1 && !justHere) rows += '<li><span class="tol-pu-ico" aria-hidden="true">&#128075;</span><span>Welcome back' + (gap === 1 ? '. You were here yesterday.' : gap < 60 ? '. It’s been ' + gap + ' days, and that’s fine: pick up anywhere.' : '. It’s been a while, and that’s fine: pick up anywhere.') + '</span></li>';
    if (nx) rows += '<li><span class="tol-pu-ico" aria-hidden="true">&#10145;</span><span>Your next step: <a href="' + esc(nx.u) + '">' + esc(nx.t) + '</a>' + (nx.note ? ' <small>(' + esc(nx.note) + ')</small>' : '') + '</span></li>';
    prog.forEach(function (p) { rows += '<li><span class="tol-pu-ico" aria-hidden="true">&#9654;</span><span>Pick up where you stopped: <a href="' + esc(p.u) + '">' + esc(p.t) + '</a> <small>(' + esc(p.note) + ')</small></span></li>'; });
    if (fresh.length) rows += '<li><span class="tol-pu-ico" aria-hidden="true">&#10024;</span><span>New since your last visit: ' + fresh.map(function (n) { return '<a href="' + esc(n[2]) + '">' + esc(n[1]) + '</a>'; }).join(', ') + '</span></li>';
    if (last) rows += '<li><span class="tol-pu-ico" aria-hidden="true">&#128278;</span><span>You were last on <a href="' + esc(last.u) + '">' + esc(last.t) + '</a> <small>' + esc(ago(last.at)) + '</small>' +
      (rec[1] ? '. Before that: <a href="' + esc(rec[1].u) + '">' + esc(rec[1].t) + '</a>' : '') + '</span></li>';
    if (pg) rows += '<li><span class="tol-pu-ico" aria-hidden="true">&#127793;</span><span>' + pg + '</span></li>';
    if (six) rows += '<li><span class="tol-pu-ico" aria-hidden="true">&#128197;</span><span><a href="/prog-01.html">Six gentle weeks</a>: ' + esc(six) + '</span></li>';
    rows += '<li><span class="tol-pu-ico" aria-hidden="true">&#9925;</span><span>' + (wx ? esc(wx) + '. <a href="/quick-checks.html#today">See it again</a>' : 'Today’s weather isn’t checked yet. <a href="/quick-checks.html#today">A one-minute check-in</a>') + '</span></li>';
    if (d.length) rows += '<li><span class="tol-pu-ico" aria-hidden="true">&#128221;</span><span>Kept on this device: ' + d.slice(0, 4).map(function (x) {
      return '<a href="' + esc(x.u) + '">' + esc(x.t) + '</a>' + (x.note ? ' <small>(' + esc(x.note) + ')</small>' : '');
    }).join(', ') + (d.length > 4 ? ' and ' + (d.length - 4) + ' more' : '') + '</span></li>';
    var box = document.createElement('section');
    box.className = 'tol-pickup no-bubble no-cheer' + (where === 'menu' ? ' is-menu' : '');
    box.setAttribute('aria-label', 'Pick up where you left off');
    box.innerHTML = '<h2 class="tol-pu-h">Pick up where you left off</h2><ul>' + rows + '</ul>' +
      '<p class="tol-pu-foot">Only on this device. <a href="/on-this-device.html">Everything stored here</a></p>';
    return box;
  }

  // ---------- "I have 1, 5 or 15 minutes" (the same choices as the home page) ----------
  var TIME = {
    1: [['Wound up', 'Breathe for one minute', '#breathe'], ['Before a talk', 'Check your weather', '/quick-checks.html#today'],
        ['A message to send', 'Test it in the Signal Translator', '/signal-translator.html'], ['Just a moment', 'Sit in the Night Garden', '/night-garden.html']],
    5: [['We just had a fight', 'Paste it into the Conversation Reader', '/conversation-reader.html'], ['Chores piling up', 'List them in the Lemonade Stand', '/lemonade-stand.html'],
        ['Wound up', 'Three minutes of Breathe', '#breathe'], ['Understand myself', 'Start your Wiring Card', '/wiring-card.html']],
    15: [['New here', 'Start in 10 minutes', '/start-in-10-minutes.html'], ['After a hard talk', 'The Carrier Wave Decoder, step by step', '/carrier-wave-decoder.html'],
        ['Chores piling up', 'Give every job one owner (WP-03)', '/workpapers/wp-03-one-owner-per-job.html'], ['Need to settle', 'A soundscape, eyes closed', '/soundscapes.html']]
  };
  function launcher(where) {
    var box = document.createElement('section');
    box.className = 'tol-time no-bubble no-cheer' + (where === 'menu' ? ' is-menu' : '');
    box.setAttribute('aria-label', 'Something for the time you have');
    var id = 'tol-time-' + Math.random().toString(36).slice(2, 7);
    box.innerHTML = '<p class="tol-time-q" id="' + id + '">How much time do you have?</p>' +
      '<div class="tol-time-opts" role="group" aria-labelledby="' + id + '">' + [1, 5, 15].map(function (m) { return '<button type="button" data-min="' + m + '" aria-pressed="false" aria-controls="' + id + '-list">' + m + (m === 1 ? ' minute' : ' minutes') + '</button>'; }).join('') + '</div>' +
      '<ul class="tol-time-list" id="' + id + '-list" hidden></ul>';
    box.addEventListener('click', function (e) {
      var b = e.target.closest('[data-min]');
      if (b) {
        var on = b.getAttribute('aria-pressed') !== 'true', m = b.getAttribute('data-min'), list = box.querySelector('.tol-time-list');
        box.querySelectorAll('[data-min]').forEach(function (x) { x.setAttribute('aria-pressed', String(on && x === b)); });
        list.hidden = !on;
        list.innerHTML = on ? keepFits(TIME[m], function (r) { return r[2]; }).map(function (r) { return '<li><span>' + esc(r[0]) + ':</span> <a href="' + esc(r[2]) + '"' + (r[2] === '#breathe' ? ' data-breathe' : '') + '>' + esc(r[1]) + '</a></li>'; }).join('') : '';
        return;
      }
      var br = e.target.closest('[data-breathe]');
      if (br) { e.preventDefault(); if (window.TOLSettings && document.querySelector('#tol-panel:not([hidden])')) { var c = document.querySelector('.tol-panel .tol-close'); if (c) c.click(); } var btn = document.querySelector('.tol-breathe-btn'); if (btn) btn.click(); }
    });
    return box;
  }

  function mount(host, where) {
    if (!host) return;
    host.innerHTML = '';
    host.appendChild(launcher(where)); // the "Pick up where you left off" card is no longer shown (card() stays for anything that asks for it)
  }
  // TIME is shared with the home page's time picker (come-back.js), so both offer the same ideas
  window.TOLPickUp = { mount: mount, card: card, launcher: launcher, time: TIME };
})();
