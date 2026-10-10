/* pick-up.js — the menu's "How much time do you have?" (1, 5 or 15 minutes).
   site.js loads this when the menu opens. It reads nothing about you and stores nothing.
   (The old "Pick up where you left off" card was removed on purpose; it is not coming back.)
   The home page's own time picker (come-back.js) draws on the same list (window.TOLPickUp.time).
   In Focus mode (site.js, window.TOLFocus) the suggestions keep to the chosen areas. */
(function () {
  'use strict';
  if (window.TOLPickUp) return;
  // Focus mode: a suggestion fits when it's in the chosen areas (or belongs to none, like Breathe)
  function fits(u) { var F = window.TOLFocus; try { return !F || !F.isOn() || F.allows(u); } catch (e) { return true; } }
  function keepFits(list, url) { var f = list.filter(function (x) { return fits(url(x)); }); return f.length ? f : list; }
  function esc(t) { return String(t == null ? '' : t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  // ---------- "I have 1, 5 or 15 minutes" (the same choices as the home page) ----------
  var TIME = {
    1: [['Wound up', 'Breathe for one minute', '#breathe'], ['Before a talk', 'Check your weather', '/quick-checks.html#today'],
        ['A message to send', 'Test it in the Signal Translator', '/signal-translator.html'], ['Just a moment', 'Sit in the Night Garden', '/night-garden.html']],
    5: [['We just had a fight', 'Paste it into the Conversation Reader', '/conversation-reader.html'], ['Chores piling up', 'List them in the Lemonade Stand', '/lemonade-stand.html'],
        ['Wound up', 'Three minutes of Breathe', '#breathe'], ['Understand myself', 'Start your Wiring Card', '/wiring-card.html']],
    15: [['New here', 'Start in 10 minutes', '/start-in-10-minutes.html'], ['After a hard talk', 'The Carrier Wave Decoder, step by step', '/carrier-wave-decoder.html'],
        ['Chores piling up', 'Give every job one owner', '/workpapers/wp-03-one-owner-per-job.html'], ['Need to settle', 'A soundscape, eyes closed', '/soundscapes.html']]
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
    host.appendChild(launcher(where));
  }
  // TIME is shared with the home page's time picker (come-back.js), so both offer the same ideas
  window.TOLPickUp = { mount: mount, launcher: launcher, time: TIME };
})();
