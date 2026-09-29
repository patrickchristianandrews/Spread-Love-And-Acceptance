/* prog-tracker.js — "Six gentle weeks" (PROG-01) progress, kept only on this device.
   - On /prog-01.html and /prog-01-in-depth.html: a week bar ("Week N of 6"), and a small tracker
     that is OFF until someone turns it on. Once on, it keeps a start date and which weeks are done
     in this browser's storage (key tol-prog01-v1). "Erase" removes it completely and turns it off.
   - Anywhere with <div data-prog-resume></div>: a "Pick up where you left off" card, shown only when
     the tracker is on.
   - On the full guide, each week gets a small "Week N of 6 · previous · next" line.
   Nothing is ever sent anywhere. */
(function () {
  'use strict';
  var KEY = 'tol-prog01-v1', WEEKS = 6;
  var NAMES = ['See the work that’s already happening', 'Give every job one owner', 'Notice how full each battery is',
    'Talk about it kindly', 'Get back in step', 'Make it last'];
  var path = location.pathname;
  var isSimple = /\/prog-01\.html$/.test(path), isFull = /\/prog-01-in-depth\.html$/.test(path);

  function load() { try { var v = JSON.parse(localStorage.getItem(KEY) || 'null'); return v && v.on ? v : null; } catch (e) { return null; } }
  function save(v) { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch (e) {} }
  function erase() { try { localStorage.removeItem(KEY); } catch (e) {} }
  function today() { var d = new Date(); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
  function nice(iso) {
    var p = String(iso || '').split('-'); if (p.length !== 3) return iso;
    var d = new Date(+p[0], +p[1] - 1, +p[2]);
    try { return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }); } catch (e) { return iso; }
  }
  function calendarWeek(v) {
    var p = String(v.start || '').split('-'); if (p.length !== 3) return 1;
    var days = Math.floor((new Date() - new Date(+p[0], +p[1] - 1, +p[2])) / 864e5);
    return Math.max(1, Math.min(WEEKS, Math.floor(days / 7) + 1));
  }
  function nextWeek(v) { for (var i = 1; i <= WEEKS; i++) if ((v.done || []).indexOf(i) === -1) return i; return 0; }
  function weekHref(n) { return (isSimple ? '' : isFull ? '' : '/prog-01-in-depth.html') + '#week-' + n; }
  function esc(s) { var d = document.createElement('div'); d.textContent = s; return d.innerHTML; }
  function el(tag, cls, html) { var n = document.createElement(tag); if (cls) n.className = cls; if (html != null) n.innerHTML = html; return n; }

  var css = el('style', null,
    '.pt-card,.pt-bar,.pt-resume{box-sizing:border-box;margin:0 0 1.4rem;padding:.9rem 1rem;border-radius:18px;border:1px solid #D9CBA3;background:rgba(255,251,242,.96);font-family:Lora,Georgia,serif;color:#2B2620}' +
    '.pt-card h2,.pt-resume h2{margin:0 0 .3rem !important;font:600 1.15rem/1.3 Fraunces,Georgia,serif}' +
    '.pt-card p,.pt-resume p,.pt-bar p{margin:0 0 .5rem !important;max-width:none}' +
    '.pt-bar{display:flex;flex-wrap:wrap;align-items:center;gap:.4rem .9rem}' +
    '.pt-bar ol{display:flex;flex-wrap:wrap;gap:.3rem;list-style:none;margin:0 !important;padding:0 !important}.pt-bar li{margin:0 !important}' +
    '.read .pt-bar ol a,.pt-bar ol a{display:grid;place-items:center;min-width:2.3rem;height:2.3rem;border-radius:999px;border:1px solid #D9CBA3;background:#FFFDF7;color:#2B2620;text-decoration:none;font:600 .9rem/1 "IBM Plex Mono",monospace}' +
    '.pt-bar ol a.is-done{background:#DDEFE3;border-color:#8CC7A5}.pt-bar ol a.is-next{border:2px solid #2F5F8A}' +
    '.pt-weeks{list-style:none;margin:.4rem 0 .6rem !important;padding:0 !important;display:grid;gap:.25rem}.pt-weeks li{margin:0 !important;max-width:none}' +
    '.pt-weeks label{display:flex;gap:.55rem;align-items:center;min-height:40px;cursor:pointer}.pt-weeks input{width:1.2rem;height:1.2rem;accent-color:#3E6B4C;flex:none}' +
    '.pt-row{display:flex;flex-wrap:wrap;gap:.5rem .8rem;align-items:center;margin:.3rem 0 0}' +
    '.pt-row label{display:flex;flex-wrap:wrap;gap:.4rem;align-items:center}' +
    '.pt-card input[type=date]{font:inherit;padding:.35rem .5rem;border:1px solid #8A7F6A;border-radius:8px;background:#fff;color:#2B2620;min-height:40px}' +
    '.pt-btn{font:600 .95rem/1.2 Lora,Georgia,serif;min-height:44px;padding:.45rem 1.05rem;border-radius:999px;border:1px solid #2F5F8A;background:#2F5F8A;color:#fff;cursor:pointer}' +
    '.pt-btn.is-quiet{background:#FFFDF7;color:#2F5F8A}.pt-btn.is-erase{background:#FFFDF7;color:#8A2F3C;border-color:#C98B94}' +
    '.pt-btn:focus-visible,.pt-card :focus-visible,.pt-bar :focus-visible,.pt-resume :focus-visible{outline:3px solid #2B5B8C;outline-offset:2px}' +
    '.pt-small{font-size:.9rem;color:#5A5346}.pt-weeknav{display:flex;flex-wrap:wrap;gap:.3rem 1rem;align-items:center;margin:0 0 .8rem;font-size:.95rem}' +
    '.pt-weeknav b{font-weight:600}.pt-weeknav a{font-weight:600;min-height:36px;display:inline-flex;align-items:center}' +
    '.read .pt-resume a.pt-go,.pt-resume a.pt-go{display:inline-flex;align-items:center;min-height:44px;padding:.4rem 1.05rem;border-radius:999px;background:#2F5F8A;color:#fff;text-decoration:none;font-weight:600}' +
    '@media print{.pt-card,.pt-bar,.pt-resume,.pt-weeknav{display:none}}');
  document.head.appendChild(css);

  // ---------- "Pick up where you left off" ----------
  function resumeCards() {
    var v = load();
    Array.prototype.forEach.call(document.querySelectorAll('[data-prog-resume]'), function (host) {
      host.innerHTML = '';
      if (!v) return;
      var n = nextWeek(v), cw = calendarWeek(v);
      var box = el('section', 'pt-resume no-bubble');
      box.setAttribute('aria-labelledby', 'pt-resume-h');
      box.innerHTML = n
        ? '<h2 id="pt-resume-h">Pick up where you left off</h2><p>You’re on <strong>week ' + n + ' of ' + WEEKS + '</strong> of six gentle weeks: ' + esc(NAMES[n - 1]) + '. You started on ' + esc(nice(v.start)) + (cw !== n ? '; by the calendar it’s week ' + cw + ', and going at your own pace is just fine.' : '.') + '</p>' +
          '<p><a class="pt-go" href="/prog-01-in-depth.html#week-' + n + '">Open week ' + n + ' &rarr;</a></p>'
        : '<h2 id="pt-resume-h">All six weeks done</h2><p>Every week is ticked. Week six’s before-and-after look is a lovely thing to repeat once a season.</p><p><a class="pt-go" href="/prog-01.html">See the six weeks &rarr;</a></p>';
      box.appendChild(el('p', 'pt-small', 'Kept on this device only. <a href="/prog-01.html#pt-tracker">Change or erase it</a>.'));
      host.appendChild(box);
    });
  }

  // ---------- the week bar and the tracker (PROG-01 pages) ----------
  var bar = null, card = null;
  function drawBar() {
    if (!bar) return;
    var v = load(), n = v ? nextWeek(v) : 0, links = '';
    for (var i = 1; i <= WEEKS; i++) {
      var done = v && v.done.indexOf(i) !== -1;
      links += '<li><a href="' + weekHref(i) + '" class="' + (done ? 'is-done' : '') + (n === i ? ' is-next' : '') + '" title="Week ' + i + ': ' + esc(NAMES[i - 1]) + '">' +
        '<span aria-hidden="true">' + (done ? '✓' : i) + '</span><span class="sr-only">Week ' + i + ': ' + esc(NAMES[i - 1]) + (done ? ', done' : '') + (n === i ? ', your next week' : '') + '</span></a></li>';
    }
    bar.innerHTML = '<p><strong>' + WEEKS + ' weeks</strong>' + (v ? (n ? ' · you’re on week ' + n + ' of ' + WEEKS : ' · all done') : ' · one step a week') + '</p><ol>' + links + '</ol>';
  }
  function drawCard() {
    if (!card) return;
    var v = load();
    if (!v) {
      card.innerHTML = '<h2 id="pt-h">Keep track of your weeks</h2>' +
        '<p>Would you like this page to remember which weeks you’ve done and when you started? It’s kept on this device only, never sent anywhere, and you can erase it any time.</p>' +
        '<div class="pt-row"><button type="button" class="pt-btn" data-pt="on">Turn on the tracker</button></div>';
    } else {
      var items = '';
      for (var i = 1; i <= WEEKS; i++) {
        items += '<li><label><input type="checkbox" data-pt-week="' + i + '"' + (v.done.indexOf(i) !== -1 ? ' checked' : '') + '> Week ' + i + ': ' + esc(NAMES[i - 1]) + '</label></li>';
      }
      card.innerHTML = '<h2 id="pt-h">Your six weeks</h2>' +
        '<div class="pt-row"><label>Started on <input type="date" data-pt="start" value="' + esc(v.start) + '" max="' + today() + '"></label></div>' +
        '<ul class="pt-weeks" aria-label="Weeks done">' + items + '</ul>' +
        '<p class="pt-small" role="status" data-pt="status"></p>' +
        '<div class="pt-row"><button type="button" class="pt-btn is-erase" data-pt="erase">Erase and turn off</button></div>' +
        '<p class="pt-small">Kept in this browser only. Erasing removes it completely.</p>';
    }
  }
  function redraw(msg) {
    drawBar(); drawCard(); resumeCards();
    var s = card && card.querySelector('[data-pt="status"]'); if (s && msg) s.textContent = msg;
  }
  function wire() {
    card.addEventListener('click', function (e) {
      var b = e.target.closest('[data-pt]'); if (!b) return;
      var what = b.getAttribute('data-pt');
      if (what === 'on') { save({ on: true, start: today(), done: [] }); redraw('Tracker on. Tick each week as you finish it.'); var f = card.querySelector('input'); if (f) f.focus(); }
      if (what === 'erase') { erase(); redraw(); card.querySelector('button').focus(); }
    });
    card.addEventListener('change', function (e) {
      var v = load(); if (!v) return;
      var t = e.target;
      if (t.getAttribute('data-pt') === 'start' && /^\d{4}-\d{2}-\d{2}$/.test(t.value)) { v.start = t.value; save(v); drawBar(); resumeCards(); }
      if (t.hasAttribute('data-pt-week')) {
        var n = +t.getAttribute('data-pt-week');
        v.done = v.done.filter(function (x) { return x !== n; });
        if (t.checked) v.done.push(n);
        v.done.sort(); save(v); drawBar(); resumeCards();
        var s = card.querySelector('[data-pt="status"]'); if (s) s.textContent = t.checked ? 'Week ' + n + ' ticked. Well done.' : 'Week ' + n + ' unticked.';
      }
    });
  }
  // "Week N of 6 · previous · next" at the top of each week in the full guide
  function weekNavs() {
    for (var i = 1; i <= WEEKS; i++) {
      var sec = document.getElementById('week-' + i); if (!sec || sec.querySelector('.pt-weeknav')) continue;
      var nav = el('nav', 'pt-weeknav');
      nav.setAttribute('aria-label', 'Week ' + i + ' of ' + WEEKS);
      nav.innerHTML = '<b>Week ' + i + ' of ' + WEEKS + '</b>' +
        (i > 1 ? '<a href="#week-' + (i - 1) + '">&larr; Week ' + (i - 1) + '</a>' : '') +
        (i < WEEKS ? '<a href="#week-' + (i + 1) + '">Week ' + (i + 1) + ' &rarr;</a>' : '<a href="#week-1">Back to week 1</a>');
      sec.insertBefore(nav, sec.firstChild);
    }
  }

  function start() {
    resumeCards();
    if (!isSimple && !isFull) return;
    var main = document.querySelector('main'); if (!main) return;
    bar = el('nav', 'pt-bar no-bubble'); bar.setAttribute('aria-label', 'The six weeks');
    card = el('section', 'pt-card no-bubble'); card.id = 'pt-tracker'; card.setAttribute('aria-labelledby', 'pt-h');
    var anchor = main.querySelector('.tol-depth, .depth-bar') || main.querySelector('.read-head');
    var host = anchor ? anchor.parentNode : main;
    var after = anchor ? anchor.nextSibling : main.firstChild;
    host.insertBefore(bar, after);
    var lede = main.querySelector('.simple-lede');
    if (lede && lede.parentNode) lede.parentNode.insertBefore(card, lede.nextSibling); else host.insertBefore(card, bar.nextSibling);
    wire(); redraw();
    if (isFull) weekNavs();
  }
  // after site.js has built the page (the Simple/Full chooser replaces the depth bar)
  function later() { setTimeout(start, 0); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', later); else later();
})();
