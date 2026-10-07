/*
  tol-simple.js — the simple workpaper pages (Who did what, How much are you carrying?, One owner per job,
  What keeps coming back?, Say it so it lands, The 90-second daily check-in).

  A simple page stays short: the "Fill it in on screen" button sits right under the title, and the extras
  the site adds to reading pages (the "Check yourself" moments, the cartoon cards and promos, the tip and
  the reading suggestion) are folded together behind one closed "Practice (optional)" toggle at the end.
  Nothing is removed: open the toggle and it is all there.

  It also corrects a few "Check yourself" moments for these pages before they are shown (the words live
  in /assets/js/learn-play-data.js): a moment is matched by its "at" words, so once the source has the
  new words, the fix here simply finds nothing to change.

  Nothing is stored and nothing is sent anywhere.
*/
(function () {
  'use strict';
  var doc = document, path = location.pathname;

  /* ------------------------------------------------------------ moments, corrected for these pages */
  var FIX = {
    '/workpapers/wp-03-one-owner-per-job.html': {
      // one owner per job: count the jobs with one owner written in, and one drag is enough
      'Count how many': {
        q: 'Ten jobs on your list. If you like, drag how many have one owner written in.', label: 'Jobs with an owner',
        need: 1, fmt: 'int',
        zones: [[3, 'Lots of gaps', 'Jobs with no owner drift to whoever notices first.', '🧩'],
                [7, 'Getting clearer', 'Keep going. Give the easier jobs an owner first.', '🧩'],
                [10, 'Nearly every job has an owner', 'Nobody has to keep re-deciding who does what.', '🧩']]
      }
    },
    '/workpapers/wp-13-daily-check-in.html': {
      // plain words on the simple page; the circuit picture stays on the full version
      'Small and often': {
        at: 'Ninety seconds a day', k: 'quiz', q: 'Why a short check-in every day, instead of one long talk at the weekend?',
        o: [['Small things get said while they’re still small', true, 'Yes! A little each day keeps you in step, so nothing piles up.'],
            ['So there’s more to argue about at the weekend', false, 'Not quite. The idea is that there’s no big pile left to argue about.'],
            ['Because longer talks aren’t allowed', false, 'Not quite. Bigger things simply wait for the weekly catch-up.']]
      }
    },
    '/workpapers/wp-01.html': {
      'log the small jobs': { say: 'Yes! Those minutes go into the Lemonade Stand and the fair-split calculator, Is the setup working for everyone?' }
    }
  };
  function patch(D) {
    try {
      var P = D && D.pages && D.pages[path], f = FIX[path];
      if (!P || !P.m || !f) return;
      P.m = P.m.map(function (m) {
        var x = m && f[m.at];
        if (!x) return m;
        var o = {}, k;
        for (k in m) o[k] = m[k];
        for (k in x) o[k] = x[k];
        return o;
      });
    } catch (e) {}
  }
  if (FIX[path]) {
    try {
      if (window.TOLLearnPlayData) patch(window.TOLLearnPlayData);
      else {
        var held;
        Object.defineProperty(window, 'TOLLearnPlayData', {
          configurable: true, enumerable: true,
          get: function () { return held; },
          set: function (d) { held = d; patch(d); }
        });
      }
    } catch (e) {}
  }

  /* ------------------------------------------------------------ one closed "Practice (optional)" */
  var QUIZ = '.lp-card', EXTRA = '.tol-fbs-wrap, .tol-pud-card, .tol-cheer, .tol-tip, .tol-read-host, .tol-fp-note';
  var box = null, quizzes = null, extras = null;

  function build(main) {
    var tryThis = main.querySelector('.try-this');
    box = doc.createElement('details');
    box.className = 'wps-practice no-bubble no-cheer no-dive';
    var sum = doc.createElement('summary');
    sum.textContent = 'Practice (optional)';
    var note = doc.createElement('p');
    note.className = 'wps-practice-note';
    note.textContent = 'A few quick questions to check the idea, plus the extras: a cartoon with the pups, a tip and something to read. None of it is needed to fill in the sheet.';
    quizzes = doc.createElement('div'); quizzes.className = 'wps-practice-q';
    extras = doc.createElement('div'); extras.className = 'wps-practice-x';
    box.appendChild(sum); box.appendChild(note); box.appendChild(quizzes); box.appendChild(extras);
    if (tryThis) tryThis.parentNode.insertBefore(box, tryThis.nextSibling);
    else main.appendChild(box);
  }

  // A "Check yourself" card splits the numbered list it follows in two; put the list back together.
  function mendLists(main) {
    Array.prototype.forEach.call(main.querySelectorAll('ol[data-lp-split]'), function (rest) {
      var prev = rest.previousElementSibling;
      if (!prev || prev.tagName !== 'OL' || !prev.classList.contains('ideas')) return;
      while (rest.firstChild) prev.appendChild(rest.firstChild);
      rest.remove();
    });
  }

  function gather(main) {
    var moved = false;
    Array.prototype.forEach.call(main.querySelectorAll(QUIZ), function (n) {
      if (box.contains(n)) return;
      quizzes.appendChild(n); moved = true;
    });
    Array.prototype.forEach.call(main.querySelectorAll(EXTRA), function (n) {
      if (box.contains(n) || n.parentNode.closest(EXTRA)) return;
      extras.appendChild(n); moved = true;
    });
    if (moved) mendLists(main);
  }

  function start() {
    var main = doc.querySelector('main.read');
    if (!main || !main.querySelector('.try-this')) return;
    build(main);
    gather(main);
    // the site adds these a moment after the page loads; fold each one in as it arrives
    try {
      var busy = false;
      new MutationObserver(function () {
        if (busy) return;
        busy = true;
        try { gather(main); } finally { busy = false; }
      }).observe(main, { childList: true, subtree: true });
    } catch (e) {}
    // a link to a moment (#lp-m2) opens the toggle
    function openFor() { var t = location.hash && doc.getElementById(location.hash.slice(1)); if (t && box.contains(t)) box.open = true; }
    window.addEventListener('hashchange', openFor);
    openFor();
  }
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', start);
  else start();
})();
