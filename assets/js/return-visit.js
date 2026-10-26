/* return-visit.js: honest reasons to come back, kept on this device only (return21).

   1. "Seven small days": one small thing a day, about a minute each, in a short series of seven parts that picks up
      where you stopped. Two sets: "Just me" and "With someone" (it starts on the one picked on the home page,
      tol-mode-v1). Mount it with <div data-return-today></div> (the home page). After "I did it", the next part
      opens tomorrow, with a calendar reminder for the days left, a link to do tomorrow's part together, and a
      "Do the next one now" button for anyone who would rather not wait. Missing days never resets anything:
      the dots count parts done, never days in a row, and nothing ever says "you missed".
   2. (Removed: the "New since your last visit" box on the home page. What's new stays one tap away in the menu.)
   3. On tool, chapter and game pages, one line inside the "What you got from this" card (come-back.js, .cb-end):
      today's small minute, or that the next part opens tomorrow.
   3b. (return26) Under that card, one more small line: "Add today to your week" with a one-tap weather, only when My week
      has nothing for this week (assets/js/this-week.js, loaded when needed; at most once a day, never in Quiet mode).
      When all seven parts are done the card also offers "Send this week's idea to someone" (the site's share sheet).
   4. Once, right after a part is done: an optional email sign-up (Buttondown, tag "small-days"), at most one
      email a week. Never on the first visit's first screen, never twice in a visit (window.TOLPrompt), never
      after "No thanks" (asked again after 60 days at the earliest), never once signed up.

   It keeps one key, tol-return-v1: the parts done in each set (with the date), the last two days the site was
   opened (only the dates), when What's new was last put away, and the email offer's answer. With "Stop remembering
   pages I visit" (tol-recent-off) the visit dates are not written. Nothing is sent anywhere, except the email
   address if someone chooses to sign up. Quiet mode and "Hide the helpers" leave out 2, 3 and 4; the series card stays.
   Exposes window.TOLReturn. */
(function () {
  'use strict';
  if (window.TOLReturn) return;
  var doc = document, root = doc.documentElement;
  if (doc.querySelector('meta[http-equiv="Content-Security-Policy"]')) return;
  try { if (window.top !== window.self) return; } catch (e) { return; }

  var KEY = 'tol-return-v1', SITE = 'https://spreadloveandacceptance.com';
  var SIGNUP = 'https://buttondown.email/api/emails/embed-subscribe/spreadloveandacceptance';
  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  function esc(t) { return String(t == null ? '' : t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function ymd(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function today() { return ymd(new Date()); }
  function helpersOff() { return root.classList.contains('tol-no-helpers') || root.classList.contains('tol-quiet') || !!(window.TOLQuiet && window.TOLQuiet.on && window.TOLQuiet.on()); }
  function still() { return root.classList.contains('tol-still') || !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); }
  // return26: this-week.js (the weekly card's code: "Add today to your week", "Send this week's idea") loads only when one of them is needed
  var twWait = null;
  function weekKit(cb) {
    if (window.TOLThisWeek) return cb(window.TOLThisWeek);
    if (!twWait) {
      twWait = [];
      var sc = doc.createElement('script'); sc.src = '/assets/js/this-week.js'; sc.setAttribute('data-tw-kit', '');
      sc.onload = function () { var q = twWait; twWait = null; q.forEach(function (f) { if (window.TOLThisWeek) f(window.TOLThisWeek); }); };
      sc.onerror = function () { twWait = null; };
      doc.head.appendChild(sc);
    }
    twWait.push(cb);
  }

  /* ---------------------------------------------------------------- our one small record */
  var S = { p: { me: {}, with: {} }, set: '', last: '', prev: '', newSeen: '', nl: '' };
  (function () { try { var o = JSON.parse(lsGet(KEY) || 'null'); if (o && typeof o === 'object') for (var k in o) S[k] = o[k]; } catch (e) {} })();
  if (!S.p || typeof S.p !== 'object') S.p = {};
  if (!S.p.me) S.p.me = {};
  if (!S.p.with) S.p.with = {};
  function save() { lsSet(KEY, JSON.stringify(S)); }
  // the last two different days the site was opened (dates only), for "New since your last visit"
  (function () {
    if (lsGet('tol-recent-off')) return;
    var t = today();
    if (S.last !== t) { if (S.last) S.prev = S.last; S.last = t; save(); }
  })();

  /* ---------------------------------------------------------------- the two sets */
  // why: one plain line; ref: an entry on /research.html (#ref-<id>); ev: how strong the evidence is
  var SETS = {
    me: { name: 'Just me', who: 'just for you', parts: [
      { t: 'Name the feeling', d: 'Stop for a moment and finish this sentence, out loud or in your head: “Right now I feel…” One or two words is plenty.',
        why: 'Putting a feeling into words can take a little of the heat out of it.', ref: 'lieberman-2007', ev: 'Moderate evidence, mostly from lab studies' },
      { t: 'Check your weather', d: 'Ask yourself three quick things. Am I tired? Hungry? Rushed? If one is a yes, see to that first, or save a hard talk for later.',
        why: 'Stress makes the planning, thinking part of the brain work less well for a while.', ref: 'arnsten-2009', ev: 'Strong evidence, much of it from animal studies',
        go: ['/quick-checks.html#today', 'Check today’s weather'] },
      { t: 'One specific thank-you', d: 'Think of one thing someone did for you this week. Tell them what it was and how it helped, in one line or one text.',
        why: 'Thanks for a specific thing tends to bring people a little closer.', ref: 'algoe-2012', ev: 'Moderate evidence' },
      { t: 'An if-then plan', d: 'Pick one moment that often goes badly and finish this: “If ___ happens, then I will ___.” For example: “If I hear my voice rising, then I’ll take one slow breath before I answer.”',
        why: 'Plans written as “if this, then that” make people much more likely to follow through.', ref: 'gollwitzer-sheeran-2006', ev: 'Strong evidence, from a review of 94 tests' },
      { t: 'Step back from it', d: 'Think of a recent upset. Picture it from across the room, as if you were watching someone else, and use your own name: “Why did Sam feel that way?”',
        why: 'Looking at a hard moment from a little distance can make it sting less.', ref: 'kross-ayduk-mischel-2005', ev: 'Moderate evidence, from lab experiments' },
      { t: 'Three things that went okay', d: 'Write down three things that went okay today, however small. A good cup of coffee counts.',
        why: 'In studies, people who listed what they were grateful for felt a little better on average. The effect is small.', ref: 'emmons-mccullough-2003', ev: 'Moderate evidence' },
      { t: 'Keep one', d: 'Look back at the last six. Which one helped most? Pick a time of day to keep doing just that one.',
        why: 'Doing one small thing at the same point in the day is how a habit forms, and missing a day doesn’t undo it.', ref: 'lally-2010', ev: 'Moderate evidence' }
    ] },
    with: { name: 'With someone', who: 'with someone you live with or are close to', parts: [
      { t: 'Turn toward one small moment', d: 'When they share something small today (a song, a story, a sigh), stop and respond to it: a question, a look, a “Really?”',
        why: 'Couples who turned toward each other’s small bids for attention stayed warmer even in later disagreements.', ref: 'driver-gottman-2004', ev: 'Moderate evidence, from watching couples' },
      { t: 'Thank one quiet job', d: 'Name one job they do that nobody mentions, and thank them for it: what they did, and how it helped.',
        why: 'Feeling grateful for a partner’s thoughtful act went with feeling closer the next day, for both people.', ref: 'algoe-gable-maisel-2010', ev: 'Moderate evidence, from a daily diary study' },
      { t: 'Ask instead of guessing', d: 'Ask one real question and listen to the whole answer without fixing anything: “What was the best part of your day?” or “Is anything on your mind?”',
        why: 'People know what someone else thinks far better when they ask than when they try to imagine it.', ref: 'eyal-steffel-epley-2018', ev: 'Strong evidence, from many experiments' },
      { t: 'Start one thing softly', d: 'If something small is bothering you, raise it with one fact and one ask: “The dishes were left out last night. Could we do them before bed?” Leave out “always” and “never.”',
        why: 'How a hard talk begins often shapes how it ends.', ref: 'gottman-silver-1999', ev: 'Moderate evidence, a practice book built on the authors’ research',
        go: ['/signal-translator.html', 'Check how a message may land'] },
      { t: 'Check how it landed', d: 'After you say something that matters today, ask: “Did that come out the way I meant?” Then listen.',
        why: 'Asking tells you how it landed. Guessing often gets it wrong.', ref: 'eyal-steffel-epley-2018', ev: 'Strong evidence, from many experiments' },
      { t: 'Laugh together', d: 'Share one funny thing today: a memory, a video, something silly that happened. Laugh about it together.',
        why: 'In one study of couples, time spent laughing together went with feeling closer and more supported.', ref: 'kurtz-algoe-2015', ev: 'Moderate evidence, one study' },
      { t: 'Keep one together', d: 'Ask each other: “Which of these small things should we keep?” Pick one, and a time of day for it.',
        why: 'Doing one small thing at the same point in the day is how a habit forms, and missing a day doesn’t undo it.', ref: 'lally-2010', ev: 'Moderate evidence' }
    ] }
  };
  var N = 7;
  function homeMode() { var m = lsGet('tol-mode-v1'); return m === 'me' || m === 'with' ? m : ''; }
  function curSet() { return S.set === 'me' || S.set === 'with' ? S.set : (homeMode() || 'me'); }
  function doneMap(set) { return S.p[set] || (S.p[set] = {}); }
  function doneCount(set) { var d = doneMap(set), n = 0; for (var i = 1; i <= N; i++) if (d[i]) n++; return n; }
  function nextPart(set) { var d = doneMap(set); for (var i = 1; i <= N; i++) if (!d[i]) return i; return 0; }
  function doneToday(set) { var d = doneMap(set), t = today(); for (var i = 1; i <= N; i++) if (d[i] === t) return i; return 0; }
  function started(set) { return doneCount(set) > 0; }

  /* ---------------------------------------------------------------- a calendar reminder for the days left */
  function stamp(d) { return d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()) + 'T' + pad(d.getHours()) + pad(d.getMinutes()) + '00'; }
  function utcStamp(d) { return d.getUTCFullYear() + pad(d.getUTCMonth() + 1) + pad(d.getUTCDate()) + 'T' + pad(d.getUTCHours()) + pad(d.getUTCMinutes()) + pad(d.getUTCSeconds()) + 'Z'; }
  function icsText(t) { return String(t).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n'); }
  var R_TITLE = 'One small minute';
  function tomorrowAt(hm) { var p = hm.split(':'), d = new Date(); d.setDate(d.getDate() + 1); d.setHours(+p[0], +p[1], 0, 0); return d; }
  function reminderIcs(start, count) {
    var url = SITE + '/#small-days', note = 'Seven small days: one small thing, about a minute. ' + url;
    var L = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Spread Love and Acceptance//Seven small days//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
      'BEGIN:VEVENT', 'UID:' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8) + '-days@spreadloveandacceptance.com', 'DTSTAMP:' + utcStamp(new Date()),
      'DTSTART:' + stamp(start), 'DURATION:PT5M', 'RRULE:FREQ=DAILY;COUNT=' + count, 'SUMMARY:' + icsText(R_TITLE), 'DESCRIPTION:' + icsText(note), 'URL:' + url,
      'BEGIN:VALARM', 'ACTION:DISPLAY', 'TRIGGER:PT0M', 'DESCRIPTION:' + icsText(R_TITLE), 'END:VALARM', 'END:VEVENT', 'END:VCALENDAR'];
    return L.join('\r\n') + '\r\n';
  }
  function googleHref(start, count) {
    var end = new Date(start.getTime() + 5 * 60000);
    return 'https://calendar.google.com/calendar/render?action=TEMPLATE&text=' + encodeURIComponent(R_TITLE) + '&dates=' + stamp(start) + '/' + stamp(end) +
      '&recur=' + encodeURIComponent('RRULE:FREQ=DAILY;COUNT=' + count) + '&details=' + encodeURIComponent('Seven small days: one small thing, about a minute.\n' + SITE + '/#small-days');
  }
  function download(text, file) {
    try {
      var blob = new Blob([text], { type: 'text/calendar;charset=utf-8' }), u = URL.createObjectURL(blob), a = doc.createElement('a');
      a.href = u; a.download = file; doc.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { URL.revokeObjectURL(u); }, 4000);
      return true;
    } catch (e) { return false; }
  }

  /* ---------------------------------------------------------------- the email offer (once, after a part is done) */
  function signedUp() { return S.nl === 'yes' || !!lsGet('tol-member-email'); }
  function offerOk() {
    if (signedUp() || helpersOff()) return false;
    if (/^no:/.test(S.nl || '')) { var t = Date.parse(S.nl.slice(3)); if (!isNaN(t) && Date.now() - t < 60 * 864e5) return false; }
    var P = window.TOLPrompt; if (P && P.free && !P.free('return-email')) return false;
    return true;
  }
  function offerHTML(id) {
    return '<div class="rt-mail" data-rt-mail>' +
      '<p class="rt-mail-h">Want a small nudge by email?</p>' +
      '<p class="rt-mail-n">At most one email a week: one small thing to try in a minute, and anything new on the site. Unsubscribe with one tap at the bottom of any email.</p>' +
      '<form class="rt-mail-f" novalidate><label for="' + id + '">Email address</label>' +
      '<span class="rt-mail-row"><input type="email" id="' + id + '" name="email" autocomplete="email" placeholder="name@example.com" required>' +
      '<button type="submit">Send me the weekly idea</button></span></form>' +
      '<p class="rt-mail-say" role="status" aria-live="polite"></p>' +
      '<p class="rt-mail-foot"><button type="button" class="rt-link" data-rt-nothanks>No thanks</button> Your address goes to Buttondown, our newsletter service, and nowhere else. <a href="/contact.html">Other ways to stay in touch</a></p>' +
      '</div>';
  }
  function bindOffer(box) {
    var f = box.querySelector('.rt-mail-f'), say = box.querySelector('.rt-mail-say'); if (!f) return;
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      var input = f.querySelector('input'), email = (input.value || '').trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) { say.textContent = 'Enter an email address, like name@example.com.'; input.focus(); return; }
      say.textContent = 'One moment…';
      var settled = false, timer = setTimeout(function () { done(false); }, 12000);
      function done(ok) {
        if (settled) return; settled = true; clearTimeout(timer);
        if (ok) { S.nl = 'yes'; save(); f.hidden = true; say.textContent = 'Thank you. Buttondown may send a confirmation email first. Confirming keeps you on the list.'; }
        else say.textContent = 'We couldn’t reach the newsletter just now, so you’re not on the list yet. Please try again later.';
      }
      try { fetch(SIGNUP, { method: 'POST', mode: 'no-cors', body: new URLSearchParams({ email: email, embed: '1', tag: 'small-days' }) }).then(function () { done(true); }, function () { done(false); }); }
      catch (err) { done(false); }
    });
    box.querySelector('[data-rt-nothanks]').addEventListener('click', function () {
      S.nl = 'no:' + today(); save();
      var m = box.querySelector('[data-rt-mail]'); if (m) m.remove();
      var focus = box.querySelector('.rt-after button, .rt-after a'); if (focus) focus.focus();
    });
  }

  /* ---------------------------------------------------------------- the series card */
  var uidN = 0;
  function sharedPart() {
    try {
      var q = new URLSearchParams(location.search), set = q.get('days'), part = +q.get('part');
      if ((set === 'me' || set === 'with') && part >= 1 && part <= N) return { set: set, part: part };
    } catch (e) {}
    return null;
  }
  function dotsHTML(set, showing) {
    var d = doneMap(set), s = '<span class="rt-dots" aria-hidden="true">';
    for (var i = 1; i <= N; i++) s += '<i class="' + (d[i] ? 'on' : '') + (i === showing ? ' now' : '') + '"></i>';
    return s + '</span>';
  }
  function partHTML(set, i, id) {
    var P = SETS[set].parts[i - 1];
    return '<h3 class="rt-t" id="' + id + '-t">Part ' + i + ' of ' + N + ': ' + esc(P.t) + '</h3>' +
      '<p class="rt-do">' + esc(P.d) + '</p>' +
      '<p class="rt-why"><span class="rt-why-k">Why it may help:</span> ' + esc(P.why) + ' <a href="/research.html#ref-' + esc(P.ref) + '">' + esc(P.ev) + '</a></p>';
  }

  function Card(host) {
    var id = 'rt' + (++uidN), shared = sharedPart(), set = shared ? shared.set : curSet(), view = 0, openAfter = false, box;
    if (shared) { S.set = set; save(); }
    host.classList.add('rt-host', 'no-bubble', 'no-cheer', 'no-dive');
    box = doc.createElement('section');
    box.className = 'rt-card tol-plain';
    box.id = doc.getElementById('small-days') ? id + '-card' : 'small-days';
    box.setAttribute('aria-labelledby', id + '-h');
    box.setAttribute('tabindex', '-1');
    host.appendChild(box);

    function draw(focusSel) {
      var next = nextPart(set), dt = doneToday(set), count = doneCount(set), sh = shared && shared.set === set ? shared.part : 0;
      // what to show: a part asked for ("Do it now"), a part someone shared, today's "done" note, the end, or the next part
      var showing = view || sh || (dt || !next ? 0 : next);
      var html = '<p class="rt-k">One small minute a day</p>' +
        '<h2 class="rt-h" id="' + id + '-h">Seven small days</h2>' +
        '<div class="rt-for" role="group" aria-label="Which set">' +
          ['me', 'with'].map(function (k) { return '<button type="button" data-rt-set="' + k + '" aria-pressed="' + (k === set) + '">' + SETS[k].name + '</button>'; }).join('') + '</div>' +
        '<p class="rt-prog">' + dotsHTML(set, showing) + '<span>' + (count ? count + ' of ' + N + ' done' : 'Seven parts, ' + SETS[set].who + '. One a day, at your own pace.') + '</span></p>';
      if (sh && !view) html += '<p class="rt-shared">Someone shared this part with you, so you can try it together today.</p>';
      if (showing) {
        var isDone = !!doneMap(set)[showing];
        html += partHTML(set, showing, id) +
          '<p class="rt-btns">' + (isDone ? '<span class="rt-did">Done</span>' : '<button type="button" class="rt-btn" data-rt-done="' + showing + '">I did it</button>') +
          (SETS[set].parts[showing - 1].go ? ' <a class="rt-go" href="' + esc(SETS[set].parts[showing - 1].go[0]) + '">' + esc(SETS[set].parts[showing - 1].go[1]) + '</a>' : '') + '</p>';
      } else if (!next) {
        html += '<p class="rt-fin">You did all seven. Pick the one that helped most and keep it going. Whenever you like, try the other set, or start this one again.</p>' +
          '<p class="rt-btns"><button type="button" class="rt-btn" data-rt-set="' + (set === 'me' ? 'with' : 'me') + '">Try “' + SETS[set === 'me' ? 'with' : 'me'].name + '”</button> <button type="button" class="rt-link" data-rt-again>Start this set again</button></p>' +
          '<p class="rt-btns"><button type="button" class="rt-btn is-soft" data-rt-sendweek>Send this week’s idea to someone</button></p>';
      } else if (dt) {
        html += '<p class="rt-today">Today’s part is done: <strong>' + esc(SETS[set].parts[dt - 1].t) + '</strong>. Part ' + next + ' opens here tomorrow.</p>';
      }
      if (!showing && dt && next) html += afterHTML(next);
      box.innerHTML = html;
      if (box.querySelector('[data-rt-mail]')) bindOffer(box);
      if (box.querySelector('[data-rt-time]')) bindRemind();
      if (focusSel) { var f = box.querySelector(focusSel); if (f) try { f.focus({ preventScroll: false }); } catch (e) {} }
    }
    var offered = false;
    function afterHTML(next) {
      var left = N - next + 1, P = SETS[set].parts[next - 1];
      var h = '<div class="rt-after">' +
        '<p class="rt-k">Tomorrow</p><p class="rt-tmw">Part ' + next + ': ' + esc(P.t) + '. It takes about a minute. Missing a day is fine. It waits for you here.</p>' +
        '<details class="rt-more"><summary>Remind me in my calendar</summary>' +
          '<p class="rt-small">A five-minute event each day for the ' + (left === 1 ? 'last part' : left + ' parts left') + ', called “' + R_TITLE + ',” so it says nothing private. It lives in your calendar. Nothing is sent to us.</p>' +
          '<p class="rt-row"><label for="' + id + '-time">Time</label> <input type="time" id="' + id + '-time" value="08:00" step="300" data-rt-time></p>' +
          '<p class="rt-row"><button type="button" class="rt-btn is-soft" data-rt-ics>Add to my calendar</button> <a class="rt-btn is-soft" data-rt-google href="#" target="_blank" rel="noopener">Google Calendar<span class="sr-only"> (opens in a new tab)</span></a></p>' +
          '<p class="rt-small" data-rt-ics-say role="status" aria-live="polite"></p>' +
        '</details>' +
        '<p class="rt-row"><button type="button" class="rt-btn is-soft" data-rt-share="' + next + '">Do part ' + next + ' together tomorrow</button>' +
        ' <button type="button" class="rt-link" data-rt-now="' + next + '">Do part ' + next + ' now instead</button></p>';
      if (openAfter && !offered && offerOk()) { offered = true; try { window.TOLPrompt && window.TOLPrompt.take && window.TOLPrompt.take('return-email'); } catch (e) {} h += offerHTML(id + '-mail'); }
      else if (offered && !signedUp() && !/^no:/.test(S.nl || '')) h += offerHTML(id + '-mail');
      return h + '</div>';
    }
    function bindRemind() {
      var tIn = box.querySelector('[data-rt-time]'), g = box.querySelector('[data-rt-google]'), next = nextPart(set), left = next ? N - next + 1 : 1;
      function hm() { var m = /^(\d\d):(\d\d)/.exec(tIn.value || ''); return m ? m[1] + ':' + m[2] : '08:00'; }
      function refresh() { g.href = googleHref(tomorrowAt(hm()), left); }
      tIn.addEventListener('input', refresh); tIn.addEventListener('change', refresh); refresh();
      box.querySelector('[data-rt-ics]').addEventListener('click', function () {
        var ok = download(reminderIcs(tomorrowAt(hm()), left), 'one-small-minute.ics');
        box.querySelector('[data-rt-ics-say]').textContent = ok ? 'Your calendar file is ready. Open it to add “' + R_TITLE + '” each day from tomorrow.' : 'The calendar file couldn’t be made here. Try Google Calendar instead.';
      });
    }

    box.addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b || !box.contains(b)) return;
      if (b.hasAttribute('data-rt-sendweek')) {
        weekKit(function (K) { K.needData(function () { var r = K.shareCurrent(); if (r === 'copied') b.textContent = 'Link copied'; }); });
        return;
      }
      if (b.hasAttribute('data-rt-set')) {
        set = b.getAttribute('data-rt-set'); S.set = set; save(); view = 0; openAfter = false; shared = null;
        draw('[data-rt-set="' + set + '"]'); return;
      }
      if (b.hasAttribute('data-rt-done')) {
        var i = +b.getAttribute('data-rt-done');
        doneMap(set)[i] = today(); save();
        view = 0; openAfter = true; shared = null;
        draw();
        var say = box.querySelector('.rt-today, .rt-fin');
        if (say) { say.setAttribute('tabindex', '-1'); try { say.focus(); } catch (x) {} }
        if (window.TOLRewards && window.TOLRewards.earn) try { window.TOLRewards.earn(1, 'return', 'A small minute, done', { soft: true }); } catch (x) {}
        return;
      }
      if (b.hasAttribute('data-rt-now')) { view = +b.getAttribute('data-rt-now'); openAfter = false; draw('.rt-t'); var t = box.querySelector('.rt-t'); if (t) { t.setAttribute('tabindex', '-1'); try { t.focus(); } catch (x) {} } return; }
      if (b.hasAttribute('data-rt-again')) { S.p[set] = {}; save(); view = 0; openAfter = false; draw('[data-rt-done]'); return; }
      if (b.hasAttribute('data-rt-share')) {
        var n = +b.getAttribute('data-rt-share'), P = SETS[set].parts[n - 1];
        var url = location.origin + '/?days=' + set + '&part=' + n + '#small-days';
        var text = 'Want to try this with me tomorrow? It takes about a minute: ' + P.t + '.';
        if (window.TOLShare && window.TOLShare.open) window.TOLShare.open({ title: 'Seven small days, part ' + n, text: text, url: url });
        else if (navigator.share) navigator.share({ title: 'Seven small days', text: text, url: url }).catch(function () {});
        else { try { navigator.clipboard.writeText(text + ' ' + url); b.textContent = 'Link copied'; } catch (x) {} }
      }
    });
    draw();
    // the shared link (#small-days) lands on the card
    if (location.hash === '#small-days' || shared) setTimeout(function () { try { box.scrollIntoView({ block: 'start', behavior: still() ? 'auto' : 'smooth' }); box.focus({ preventScroll: true }); } catch (e) {} }, 400);
    doc.addEventListener('tol-mode', function (ev) {
      var m = ev && ev.detail && ev.detail.mode;
      if ((m === 'me' || m === 'with') && m !== set && !S.set) { set = m; draw(); }
    });
  }

  /* ---------------------------------------------------------------- one line in "What you got from this" */
  function endLine(card) {
    if (helpersOff() || !card) return;
    var set = curSet(), next = nextPart(set), dt = doneToday(set), P = next ? SETS[set].parts[next - 1] : null, s;
    if (!started(set)) s = 'Want one small thing a day? <a href="/#small-days">Seven small days</a>, about a minute each.';
    else if (!next) s = '';
    else if (dt) s = 'Seven small days: part ' + next + ' opens tomorrow on the <a href="/#small-days">home page</a>.';
    else s = 'Your small minute today: <a href="/#small-days">part ' + next + ', ' + esc(P.t) + '</a>.';
    if (s && !card.querySelector('.rt-tomorrow')) { var p = doc.createElement('p'); p.className = 'rt-tomorrow cb-mini'; p.innerHTML = s; card.appendChild(p); }
    weekKit(function (K) { K.addLine(card); });
  }
  function watchEnds() {
    var main = doc.querySelector('main'); if (!main || !('MutationObserver' in window)) return;
    Array.prototype.forEach.call(main.querySelectorAll('.cb-end'), endLine);
    var t = null;
    new MutationObserver(function () { clearTimeout(t); t = setTimeout(function () { Array.prototype.forEach.call(main.querySelectorAll('.cb-end'), endLine); }, 300); })
      .observe(main, { childList: true, subtree: true });
  }

  /* ---------------------------------------------------------------- start */
  function css() {
    if (doc.querySelector('link[data-return-visit]')) return;
    var l = doc.createElement('link'); l.rel = 'stylesheet'; l.href = '/assets/css/return-visit.css'; l.setAttribute('data-return-visit', '');
    doc.head.appendChild(l);
  }
  function start() {
    if (doc.body && (doc.body.hasAttribute('data-sensitive') || doc.body.hasAttribute('data-no-return'))) return;
    var hosts = doc.querySelectorAll('[data-return-today]');
    css();
    Array.prototype.forEach.call(hosts, function (h) { if (h.getAttribute('data-rt-on')) return; h.setAttribute('data-rt-on', '1'); Card(h); });
    watchEnds();
  }
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', start); else start();

  window.TOLReturn = {
    state: function () { return JSON.parse(JSON.stringify(S)); },
    sets: SETS,
    mount: function (h) { if (h && !h.getAttribute('data-rt-on')) { css(); h.setAttribute('data-rt-on', '1'); Card(h); } }
  };
})();
