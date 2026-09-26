/* turning-toward.js — "Today's small moment" and the 7-day starter on /turning-toward.html
   Nothing is sent anywhere. The 7-day ticks and the chosen relationship are kept only
   in this browser (localStorage), and the page works without them. */
(function () {
  'use strict';

  var WHO = [['partner', 'Partner'], ['family', 'Family'], ['friend', 'Friend'], ['roommate', 'Roommate'],
             ['coparent', 'Co-parent'], ['coworker', 'Coworker'], ['caregiver', 'Someone I care for']];

  // One small moment per day. msg: a message to send, by relationship (default covers the rest).
  var SPARKS = [
    { key: 'thanks', title: 'Say one specific thank-you',
      todo: 'Think of one thing they did this week that you haven’t thanked them for. Name the thing, and the effort it took.',
      msg: { default: 'Thank you for [the specific thing]. I noticed [the effort it took], and it made my day easier.',
             coworker: 'Thanks for [the specific thing] this week. It saved me a lot of time on [the task].',
             coparent: 'Thanks for handling [the specific thing] with the kids. It made a real difference.' } },
    { key: 'bids', title: 'Catch one small reach today',
      todo: 'When they say “look at this”, sigh, or share something small, stop what you’re doing, look, and ask one question about it.',
      msg: null },
    { key: 'good-news', title: 'Ask about something good',
      todo: 'Ask about a good thing in their week, then get curious: ask one more question about the answer.',
      msg: { default: 'What’s been the best part of your week so far?',
             coworker: 'What’s gone well for you this week?' } },
    { key: 'their-world', title: 'Learn one new thing about their world',
      todo: 'People change. Ask one question you don’t already know the answer to, and really listen.',
      msg: { default: 'What’s something on your mind this week that I don’t know about?',
             coworker: 'What are you working on that you’re enjoying right now?',
             caregiver: 'What would make tomorrow a good day for you?' } },
    { key: 'fondness', title: 'Tell them one thing you admire',
      todo: 'Name one quality you like in them, and one moment you saw it.',
      msg: { default: 'I was thinking today about how [a quality you admire], like when you [a moment]. I really like that about you.',
             coworker: 'I really appreciated how you [a moment] in [the meeting]. You’re good at that.',
             coparent: 'The kids are lucky you [a quality]. I saw it when you [a moment].' } },
    { key: 'stress-talk', title: 'Offer an ear, not a fix',
      todo: 'Ask about the stress from outside: work, family, the world. Take their side and don’t fix it unless they ask.',
      msg: { default: 'Rough day? I’m around tonight if you want to vent. No fixing, just listening.',
             coworker: 'This week looks heavy for you. Want to grab a coffee and offload for ten minutes?' } },
    { key: 'rituals', title: 'Start one small ritual',
      todo: 'Suggest something small you could do together, the same way each week, whatever the mood.',
      msg: { default: 'Want to make [a weekly walk / Sunday coffee / a Friday call] our thing?',
             roommate: 'Want to do a quick house dinner on Sundays? Nothing fancy.',
             coworker: 'Want to do a five-minute “what went well this week” on Fridays?',
             family: 'Want to make [Sunday lunch / a weekly call] a regular thing?' } }
  ];

  var DAYS = [
    ['bids', 'Catch one small reach for your attention, and turn toward it.'],
    ['thanks', 'Say one specific thank-you.'],
    ['good-news', 'Ask about something good, and ask one more question.'],
    ['stress-talk', 'Offer ten minutes of listening, with no fixing.'],
    ['their-world', 'Ask one question you don’t know the answer to.'],
    ['rituals', 'Suggest one small ritual.'],
    ['fondness', 'Tell them one thing you admire, and when you saw it.']
  ];

  var $ = function (id) { return document.getElementById(id); };
  function get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  // ---------- Today's small moment ----------
  var card = $('tt-today');
  if (card) {
    var now = new Date();
    var dayOfYear = Math.floor((now - new Date(now.getFullYear(), 0, 0)) / 864e5);
    var idx = dayOfYear % SPARKS.length;
    var who = get('tol-tt-who') || 'partner';

    var whoWrap = $('tt-who');
    WHO.forEach(function (w) {
      var l = document.createElement('label'); l.className = 'tt-chip';
      l.innerHTML = '<input type="radio" name="tt-who" value="' + w[0] + '"' + (w[0] === who ? ' checked' : '') + '><span>' + esc(w[1]) + '</span>';
      l.querySelector('input').addEventListener('change', function () { who = w[0]; set('tol-tt-who', who); show(); });
      whoWrap.appendChild(l);
    });

    function show() {
      var s = SPARKS[idx], msg = s.msg ? (s.msg[who] || s.msg.default) : '';
      $('tt-title').textContent = s.title;
      $('tt-todo').textContent = s.todo;
      $('tt-more').setAttribute('href', '/turning-toward-in-depth.html#' + s.key);
      var box = $('tt-msg');
      if (msg) { box.hidden = false; $('tt-msg-text').textContent = msg; }
      else box.hidden = true;
    }
    $('tt-next').addEventListener('click', function () { idx = (idx + 1) % SPARKS.length; show(); });
    $('tt-copy').addEventListener('click', function () { copy($('tt-msg-text').textContent, this); });
    var share = $('tt-share');
    if (navigator.share) {
      share.hidden = false;
      share.addEventListener('click', function () {
        navigator.share({ text: $('tt-msg-text').textContent }).catch(function () {});
      });
    }
    show();
    card.hidden = false;
  }

  function copy(text, btn) {
    var done = function () { var o = btn.textContent; btn.textContent = 'Copied'; setTimeout(function () { btn.textContent = o; }, 1500); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, fallback); else fallback();
    function fallback() {
      var ta = document.createElement('textarea'); ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); done(); } catch (e) {} ta.remove();
    }
  }

  // ---------- The 7-day starter ----------
  var list = $('tt-week');
  if (list) {
    var ticks = {};
    try { ticks = JSON.parse(get('tol-tt-7day') || '{}') || {}; } catch (e) { ticks = {}; }
    DAYS.forEach(function (d, i) {
      var li = document.createElement('li');
      li.innerHTML = '<label><input type="checkbox" data-day="' + i + '"' + (ticks[i] ? ' checked' : '') + '>' +
        '<span class="tt-day">Day ' + (i + 1) + '</span><span class="tt-task">' + esc(d[1]) + '</span></label>' +
        '<a href="/turning-toward-in-depth.html#' + d[0] + '" class="tt-how">How</a>';
      list.appendChild(li);
    });
    list.addEventListener('change', function (e) {
      if (!e.target.matches('input[data-day]')) return;
      ticks[e.target.getAttribute('data-day')] = e.target.checked;
      set('tol-tt-7day', JSON.stringify(ticks));
      progress();
    });
    $('tt-reset').addEventListener('click', function () {
      ticks = {}; set('tol-tt-7day', '{}');
      list.querySelectorAll('input[data-day]').forEach(function (c) { c.checked = false; });
      progress();
    });
    function progress() {
      var n = list.querySelectorAll('input[data-day]:checked').length;
      $('tt-bar').style.width = Math.round(n / 7 * 100) + '%';
      $('tt-count').textContent = n === 7 ? 'All seven. That’s a habit starting.' : n + ' of 7';
      $('tt-done').hidden = n !== 7;
    }
    progress();
  }
})();
