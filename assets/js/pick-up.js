/* pick-up.js — "Pick up where you left off" and "I have 2, 5 or 10 minutes".
   site.js loads this on the home page (inside the opening block) and when the menu opens.
   Everything it shows is read from this browser: the last pages you opened here (site.js keeps a
   short list, which you can switch off or erase), the six weeks, today's weather and any drafts
   the tools keep on this device. Nothing is sent anywhere. */
(function () {
  'use strict';
  if (window.TOLPickUp) return;
  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsDel(k) { try { localStorage.removeItem(k); } catch (e) {} }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
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
  var WP_NAMES = { 'WP-01': 'Who did what (WP-01)', 'WP-02': 'How full is your battery? (WP-02)', 'WP-03': 'One owner per job (WP-03)', 'WP-04': 'What keeps coming back? (WP-04)',
    'WP-09': 'Say it so it lands (WP-09)', 'WP-11': 'The Calm-Down Kit (WP-11)', 'WP-13': 'The 90-second check-in (WP-13)' };
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
    var lem = json('tol-lemonade-stand-v2'); if (lem && lem.jobs && lem.jobs.some(function (j) { return j && j.name; }) && !lem.example) out.push({ t: 'The Lemonade Stand', u: '/lemonade-stand.html' });
    var cw = json('cwd-v1'); if (cw && ((cw.log && cw.log.length) || Object.keys(cw.done || {}).length)) out.push({ t: 'The Carrier Wave Decoder', u: '/carrier-wave-decoder.html', note: Object.keys(cw.done || {}).length ? Object.keys(cw.done).length + ' practice' + (Object.keys(cw.done).length === 1 ? '' : 's') + ' done' : '' });
    if (lsGet('tol-calc01-full-v2')) out.push({ t: 'Can the load last? (the long form)', u: '/calc01-solvency.html' });
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
  function recent() { var r = json('tol-recent'); return Array.isArray(r) ? r : []; }

  function card(where) {
    var here = location.pathname.replace(/\/$/, '/index.html');
    var rec = recent().filter(function (r) { return r && r.u && r.u !== here; }), last = rec[0];
    var d = drafts(), six = sixWeeks(), wx = weather();
    if (!last && !d.length && !six) return null;
    var rows = '';
    if (last) rows += '<li><span class="tol-pu-ico" aria-hidden="true">&#128278;</span><span>You were last on <a href="' + esc(last.u) + '">' + esc(last.t) + '</a> <small>' + esc(ago(last.at)) + '</small>' +
      (rec[1] ? '. Before that: <a href="' + esc(rec[1].u) + '">' + esc(rec[1].t) + '</a>' : '') + '</span></li>';
    if (six) rows += '<li><span class="tol-pu-ico" aria-hidden="true">&#128197;</span><span><a href="/prog-01.html">Six gentle weeks</a>: ' + esc(six) + '</span></li>';
    rows += '<li><span class="tol-pu-ico" aria-hidden="true">&#9925;</span><span>' + (wx ? esc(wx) + '. <a href="/quick-checks.html#today">See it again</a>' : 'Today’s weather isn’t checked yet. <a href="/quick-checks.html#today">A one-minute check-in</a>') + '</span></li>';
    if (d.length) rows += '<li><span class="tol-pu-ico" aria-hidden="true">&#128221;</span><span>Kept on this device: ' + d.slice(0, 4).map(function (x) {
      return '<a href="' + esc(x.u) + '">' + esc(x.t) + '</a>' + (x.note ? ' <small>(' + esc(x.note) + ')</small>' : '');
    }).join(', ') + (d.length > 4 ? ' and ' + (d.length - 4) + ' more' : '') + '</span></li>';
    var box = document.createElement('section');
    box.className = 'tol-pickup no-bubble no-cheer' + (where === 'menu' ? ' is-menu' : '');
    box.setAttribute('aria-label', 'Pick up where you left off');
    box.innerHTML = '<h2 class="tol-pu-h">Pick up where you left off</h2><ul>' + rows + '</ul>' +
      '<p class="tol-pu-foot">Only on this device. <button type="button" data-pu="erase">Forget the pages I visited</button> <button type="button" data-pu="off">' + (lsGet('tol-recent-off') ? 'Remember them again' : 'Stop remembering them') + '</button> <a href="/on-this-device.html">Everything stored here</a></p>';
    box.addEventListener('click', function (e) {
      var b = e.target.closest('[data-pu]'); if (!b) return;
      if (b.getAttribute('data-pu') === 'erase') { lsDel('tol-recent'); b.textContent = 'Forgotten'; b.disabled = true; var f = box.querySelector('li'); if (f && last) f.remove(); }
      if (b.getAttribute('data-pu') === 'off') {
        if (lsGet('tol-recent-off')) { lsDel('tol-recent-off'); b.textContent = 'Stop remembering them'; }
        else { lsSet('tol-recent-off', '1'); lsDel('tol-recent'); b.textContent = 'Remember them again'; }
      }
    });
    return box;
  }

  // ---------- "I have 2, 5 or 10 minutes" ----------
  var TIME = {
    2: [['Wound up', 'Breathe for one minute', '#breathe'], ['Before a talk', 'Check your weather', '/quick-checks.html#today'],
        ['A message to send', 'Test it in the Signal Translator', '/signal-translator.html'], ['Just a moment', 'Sit in the Night Garden', '/night-garden.html']],
    5: [['We just had a fight', 'Paste it into the Conversation Reader', '/conversation-reader.html'], ['Chores piling up', 'List them in the Lemonade Stand', '/lemonade-stand.html'],
        ['Wound up', 'Three minutes of Breathe', '#breathe'], ['Understand myself', 'Start your Wiring Card', '/wiring-card.html']],
    10: [['New here', 'Start in 10 minutes', '/start-in-10-minutes.html'], ['After a hard talk', 'The Carrier Wave Decoder, step by step', '/carrier-wave-decoder.html'],
        ['Chores piling up', 'Give every job one owner (WP-03)', '/workpapers/wp-03-raci-treaty.html'], ['Need to settle', 'A soundscape, eyes closed', '/soundscapes.html']]
  };
  function launcher(where) {
    var box = document.createElement('section');
    box.className = 'tol-time no-bubble no-cheer' + (where === 'menu' ? ' is-menu' : '');
    box.setAttribute('aria-label', 'Something for the time you have');
    var id = 'tol-time-' + Math.random().toString(36).slice(2, 7);
    box.innerHTML = '<p class="tol-time-q" id="' + id + '">How much time do you have?</p>' +
      '<div class="tol-time-opts" role="group" aria-labelledby="' + id + '">' + [2, 5, 10].map(function (m) { return '<button type="button" data-min="' + m + '" aria-pressed="false" aria-controls="' + id + '-list">' + m + ' minutes</button>'; }).join('') + '</div>' +
      '<ul class="tol-time-list" id="' + id + '-list" hidden></ul>';
    box.addEventListener('click', function (e) {
      var b = e.target.closest('[data-min]');
      if (b) {
        var on = b.getAttribute('aria-pressed') !== 'true', m = b.getAttribute('data-min'), list = box.querySelector('.tol-time-list');
        box.querySelectorAll('[data-min]').forEach(function (x) { x.setAttribute('aria-pressed', String(on && x === b)); });
        list.hidden = !on;
        list.innerHTML = on ? TIME[m].map(function (r) { return '<li><span>' + esc(r[0]) + ':</span> <a href="' + esc(r[2]) + '"' + (r[2] === '#breathe' ? ' data-breathe' : '') + '>' + esc(r[1]) + '</a></li>'; }).join('') : '';
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
    var c = card(where); if (c) host.appendChild(c);
    host.appendChild(launcher(where));
  }
  window.TOLPickUp = { mount: mount, card: card, launcher: launcher };
})();
