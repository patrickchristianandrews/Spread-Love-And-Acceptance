/* remind.js — reminders people add to their own calendar. Nothing is sent to this site and nothing is
   stored here: the reminder lives in their calendar.

   1. "Come back gently": <div data-tol-remind></div> (optionally data-remind-to="/path.html" for where the
      reminder opens, and data-remind-what="..." for its note). The visitor picks a day and a time, then
      either downloads a calendar file (.ics: Apple Calendar, Outlook, most phones) or opens Google
      Calendar with the event filled in. The event repeats weekly, lasts ten minutes and has a neutral
      title ("10 minutes for me"), so it says nothing private to anyone who sees the calendar.

   2. "Add the six weeks to my calendar": <div data-tol-remind data-remind-weeks="6"></div>. The visitor
      picks a day, a time of their own and which week to start from. One calendar file holds one event a
      week (week N of 6, half an hour, a plain title), each linking to that week's pages. Google Calendar
      gets one link that repeats weekly for the same number of weeks; Outlook on the web gets one link per
      week, since its links can't repeat. Opening those links is the visitor's own choice. */
(function () {
  'use strict';
  var hosts = document.querySelectorAll('[data-tol-remind]');
  if (!hosts.length) return;
  var SITE = 'https://spreadloveandacceptance.com';
  var DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  var TIMES = [['07:30', '7:30 am'], ['12:30', '12:30 pm'], ['18:00', '6 pm'], ['19:30', '7:30 pm'], ['21:00', '9 pm']];
  var TITLE = '10 minutes for me';
  var SIX_TITLE = 'My weekly half hour';
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function stamp(d) { return d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()) + 'T' + pad(d.getHours()) + pad(d.getMinutes()) + '00'; }
  function utcStamp(d) { return d.getUTCFullYear() + pad(d.getUTCMonth() + 1) + pad(d.getUTCDate()) + 'T' + pad(d.getUTCHours()) + pad(d.getUTCMinutes()) + pad(d.getUTCSeconds()) + 'Z'; }
  // local time with its offset, for Outlook's links: 2026-10-12T19:30:00-04:00
  function isoLocal(d) {
    var off = -d.getTimezoneOffset(), sign = off < 0 ? '-' : '+'; off = Math.abs(off);
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + 'T' + pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':00' + sign + pad(Math.floor(off / 60)) + ':' + pad(off % 60);
  }
  // the next date (today or later) that falls on the chosen weekday at the chosen time
  function firstAt(day, hm) {
    var p = hm.split(':'), d = new Date(); d.setSeconds(0, 0); d.setHours(+p[0], +p[1]);
    var add = (day - d.getDay() + 7) % 7; if (add === 0 && d < new Date()) add = 7;
    d.setDate(d.getDate() + add); return d;
  }
  function plusWeeks(d, n) { var x = new Date(d.getTime()); x.setDate(x.getDate() + 7 * n); return x; }
  function icsText(t) { return String(t).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n'); }
  // Calendar files keep each line to 75 bytes: longer ones carry on in the next line after a space.
  function fold(line) {
    var out = '', used = 0, limit = 75;
    for (var i = 0; i < line.length; i++) {
      var c = line.charCodeAt(i), ch = line.charAt(i), bytes = c < 0x80 ? 1 : c < 0x800 ? 2 : 3;
      if (c >= 0xD800 && c <= 0xDBFF && i + 1 < line.length) { ch += line.charAt(++i); bytes = 4; }
      if (used + bytes > limit) { out += '\r\n '; used = 1; }
      out += ch; used += bytes;
    }
    return out;
  }
  function uid(n) { return Date.now().toString(36) + Math.random().toString(36).slice(2, 8) + (n != null ? '-w' + n : '') + '@spreadloveandacceptance.com'; }
  function calendar(name, events) {
    var lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Spread Love and Acceptance//' + name + '//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH'];
    events.forEach(function (ev) { lines = lines.concat(ev); });
    lines.push('END:VCALENDAR');
    return lines.map(fold).join('\r\n') + '\r\n';
  }
  function event(o) {
    var ev = ['BEGIN:VEVENT', 'UID:' + o.uid, 'DTSTAMP:' + utcStamp(new Date()), 'DTSTART:' + stamp(o.start), 'DURATION:PT' + o.minutes + 'M'];
    if (o.rrule) ev.push('RRULE:' + o.rrule);
    ev.push('SUMMARY:' + icsText(o.title), 'DESCRIPTION:' + icsText(o.note), 'URL:' + o.url,
      'BEGIN:VALARM', 'ACTION:DISPLAY', 'TRIGGER:PT0M', 'DESCRIPTION:' + icsText(o.title), 'END:VALARM', 'END:VEVENT');
    return ev;
  }
  function download(text, file) {
    var blob = new Blob([text], { type: 'text/calendar;charset=utf-8' }), url = URL.createObjectURL(blob), a = document.createElement('a');
    a.href = url; a.download = file; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
  }
  function googleHref(title, s, minutes, rrule, details) {
    var e = new Date(s.getTime() + minutes * 60000);
    return 'https://calendar.google.com/calendar/render?action=TEMPLATE&text=' + encodeURIComponent(title) +
      '&dates=' + stamp(s) + '/' + stamp(e) + (rrule ? '&recur=' + encodeURIComponent('RRULE:' + rrule) : '') +
      '&details=' + encodeURIComponent(details);
  }
  function outlookHref(title, s, minutes, body) {
    var e = new Date(s.getTime() + minutes * 60000);
    return 'https://outlook.live.com/calendar/0/deeplink/compose?path=%2Fcalendar%2Faction%2Fcompose&rru=addevent&subject=' + encodeURIComponent(title) +
      '&startdt=' + encodeURIComponent(isoLocal(s)) + '&enddt=' + encodeURIComponent(isoLocal(e)) + '&body=' + encodeURIComponent(body);
  }
  function niceDate(d) {
    try { return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }); } catch (e) { return d.toDateString(); }
  }
  function niceTime(hm) {
    var p = hm.split(':'), h = +p[0], m = p[1], h12 = h % 12 || 12;
    return h12 + (m === '00' ? '' : ':' + m) + ' ' + (h < 12 ? 'am' : 'pm');
  }

  var css = document.createElement('style');
  css.textContent =
    '.tol-rm-row input[type=time]{min-height:44px;padding:.3rem .6rem;border-radius:10px;border:1.5px solid #D9C8F0;background:#FFFDF7;color:#2B2620;font:inherit}' +
    '.tol-rm-row input[type=time]:focus-visible{outline:3px solid var(--focus,#2B5B8C);outline-offset:2px}' +
    '.tol-rm-field{display:flex;flex-direction:column;gap:.15rem}' +
    '.tol-rm-dates{list-style:none;margin:.5rem 0 .6rem !important;padding:0 !important;display:flex;flex-wrap:wrap;gap:.3rem}' +
    '.tol-rm-dates li{margin:0 !important;padding:.2rem .6rem;border-radius:999px;background:#F3EEFA;font-size:.9rem;max-width:none}' +
    '.tol-rm-more{margin:.4rem 0 0}.tol-rm-more>summary{cursor:pointer;min-height:44px;display:flex;align-items:center;gap:.4rem;font-weight:600;list-style:none}' +
    '.tol-rm-more>summary::-webkit-details-marker{display:none}.tol-rm-more>summary::before{content:"\\25B8";display:inline-block;transition:transform .2s}.tol-rm-more[open]>summary::before{transform:rotate(90deg)}' +
    '.tol-rm-more>summary:focus-visible{outline:3px solid var(--focus,#2B5B8C);outline-offset:2px}' +
    '.tol-rm-more ul{list-style:none;margin:.2rem 0 .4rem !important;padding:0 !important;display:flex;flex-wrap:wrap;gap:.4rem}.tol-rm-more li{margin:0 !important}' +
    '.read .tol-remind .tol-rm-small{font-size:.92rem;color:#5A5346;max-width:62ch}';
  document.head.appendChild(css);

  Array.prototype.forEach.call(hosts, function (host, n) {
    if (host.hasAttribute('data-remind-weeks')) sixWeeks(host, n); else weekly(host, n);
  });

  // ---------- 1. a ten-minute weekly reminder ----------
  function weekly(host, n) {
    var to = SITE + (host.getAttribute('data-remind-to') || '/start-in-10-minutes.html');
    var what = host.getAttribute('data-remind-what') || 'A gentle weekly check-in: one small thing for you, then get on with your day.';
    var id = 'tol-rm-' + n;
    host.classList.add('tol-remind', 'no-bubble', 'no-cheer');
    host.innerHTML =
      '<h2 class="tol-rm-h" id="' + id + '-h">Come back gently, once a week</h2>' +
      '<p class="tol-rm-p">Pick a day and a time, and add a ten-minute reminder to your own calendar. It repeats every week and just says “' + TITLE + '”. Nothing is sent to us.</p>' +
      '<div class="tol-rm-row">' +
        '<label for="' + id + '-d">Day</label><select id="' + id + '-d">' + DAYS.map(function (d, i) { return '<option value="' + i + '"' + (i === 0 ? ' selected' : '') + '>' + d + '</option>'; }).join('') + '</select>' +
        '<label for="' + id + '-t">Time</label><select id="' + id + '-t">' + TIMES.map(function (t, i) { return '<option value="' + t[0] + '"' + (i === 3 ? ' selected' : '') + '>' + t[1] + '</option>'; }).join('') + '</select>' +
      '</div>' +
      '<div class="tol-rm-row">' +
        '<button type="button" class="tol-rm-b" data-rm="ics">Add to my calendar</button>' +
        '<a class="tol-rm-b is-soft" data-rm="google" href="#" target="_blank" rel="noopener">Google Calendar<span class="sr-only"> (opens in a new tab)</span></a>' +
      '</div>' +
      '<p class="tol-rm-msg" role="status" aria-live="polite"></p>';
    var dSel = host.querySelector('#' + id + '-d'), tSel = host.querySelector('#' + id + '-t'), g = host.querySelector('[data-rm="google"]'), msg = host.querySelector('.tol-rm-msg');
    function when() { return firstAt(+dSel.value, tSel.value); }
    function refresh() { g.href = googleHref(TITLE, when(), 10, 'FREQ=WEEKLY', what + '\n' + to); }
    dSel.addEventListener('change', refresh); tSel.addEventListener('change', refresh); refresh();
    host.querySelector('[data-rm="ics"]').addEventListener('click', function () {
      download(calendar('Weekly reminder', [event({ uid: uid(), start: when(), minutes: 10, rrule: 'FREQ=WEEKLY', title: TITLE, note: what + '\n' + to, url: to })]), 'ten-minutes-for-me.ics');
      msg.textContent = 'Your calendar file is ready. Open it to add “' + TITLE + '”, every ' + DAYS[+dSel.value] + ' at ' + tSel.options[tSel.selectedIndex].text + '.';
    });
  }

  // ---------- 2. the six weeks, one event a week ----------
  function sixWeeks(host, n) {
    var WEEKS = Math.max(1, Math.min(12, +host.getAttribute('data-remind-weeks') || 6));
    var id = 'tol-rm-' + n, mins = 30;
    var weekUrl = function (w) { return SITE + '/workpapers/fill/suite.html?road=program&week=' + w; };
    // start from the next week not yet ticked, when the six-weeks tracker is on (kept on this device)
    var from = 1;
    try { var v = JSON.parse(localStorage.getItem('tol-prog01-v1') || 'null'); if (v && v.on && Array.isArray(v.done)) { for (var w = 1; w <= WEEKS; w++) if (v.done.indexOf(w) === -1) { from = w; break; } } } catch (e) {}
    host.classList.add('tol-remind', 'tol-plain', 'no-bubble', 'no-cheer');
    host.id = host.id || 'calendar';
    host.innerHTML =
      '<h2 class="tol-rm-h" id="' + id + '-h">Add the six weeks to my calendar</h2>' +
      '<p class="tol-rm-p">Pick a day and a time for your weekly half hour. You get one event a week, each with a link to that week’s pages. Miss one? That’s fine. The next one is still there.</p>' +
      '<div class="tol-rm-row">' +
        '<span class="tol-rm-field"><label for="' + id + '-d">Day</label><select id="' + id + '-d">' + DAYS.map(function (d, i) { return '<option value="' + i + '"' + (i === 0 ? ' selected' : '') + '>' + d + '</option>'; }).join('') + '</select></span>' +
        '<span class="tol-rm-field"><label for="' + id + '-t">Time</label><input type="time" id="' + id + '-t" value="19:30" step="300"></span>' +
        '<span class="tol-rm-field"><label for="' + id + '-w">Start with</label><select id="' + id + '-w">' + Array.apply(null, Array(WEEKS)).map(function (_, i) { return '<option value="' + (i + 1) + '"' + (i + 1 === from ? ' selected' : '') + '>Week ' + (i + 1) + '</option>'; }).join('') + '</select></span>' +
      '</div>' +
      '<ul class="tol-rm-dates" aria-label="Your dates"></ul>' +
      '<div class="tol-rm-row">' +
        '<button type="button" class="tol-rm-b" data-rm="ics">Download the calendar file</button>' +
        '<a class="tol-rm-b is-soft" data-rm="google" href="#" target="_blank" rel="noopener">Google Calendar<span class="sr-only"> (opens in a new tab)</span></a>' +
      '</div>' +
      '<details class="tol-rm-more"><summary>Outlook on the web: one link a week</summary><ul data-rm="outlook"></ul></details>' +
      '<p class="tol-rm-msg" role="status" aria-live="polite"></p>' +
      '<p class="tol-rm-small">Nothing is sent anywhere by this site. The calendar file is made on your device; open it and your phone or computer adds the events (Apple Calendar, Outlook and most phones). The Google and Outlook buttons open your own calendar in a new tab with the details filled in, and you choose whether to save them there. The title just says “' + SIX_TITLE + '”, so it says nothing private to anyone who glances at your calendar.</p>';
    var dSel = host.querySelector('#' + id + '-d'), tIn = host.querySelector('#' + id + '-t'), wSel = host.querySelector('#' + id + '-w');
    var g = host.querySelector('[data-rm="google"]'), ol = host.querySelector('[data-rm="outlook"]'), list = host.querySelector('.tol-rm-dates'), msg = host.querySelector('.tol-rm-msg');
    function hm() { var m = /^(\d\d):(\d\d)/.exec(tIn.value || ''); return m ? m[1] + ':' + m[2] : '19:30'; }
    function plan() {
      var first = firstAt(+dSel.value, hm()), out = [];
      for (var w = +wSel.value || 1; w <= WEEKS; w++) out.push({ week: w, start: plusWeeks(first, out.length) });
      return out;
    }
    function note(w) { return 'Week ' + w + ' of ' + WEEKS + '. This week’s pages: ' + weekUrl(w) + '\nMissing a week is fine. Pick up anywhere.'; }
    function refresh() {
      var p = plan();
      list.innerHTML = p.map(function (x) { return '<li>Week ' + x.week + ': ' + niceDate(x.start) + '</li>'; }).join('');
      g.href = googleHref(SIX_TITLE, p[0].start, mins, 'FREQ=WEEKLY;COUNT=' + p.length, 'One of your six weekly half hours. This week’s pages: ' + SITE + '/prog-01.html\nMissing a week is fine. Pick up anywhere.');
      ol.innerHTML = p.map(function (x) {
        return '<li><a class="tol-rm-b is-soft" href="' + outlookHref(SIX_TITLE + ' (week ' + x.week + ')', x.start, mins, note(x.week)).replace(/&/g, '&amp;') + '" target="_blank" rel="noopener">Week ' + x.week + '<span class="sr-only">, ' + niceDate(x.start) + ', in Outlook (opens in a new tab)</span></a></li>';
      }).join('');
    }
    dSel.addEventListener('change', refresh); tIn.addEventListener('change', refresh); tIn.addEventListener('input', refresh); wSel.addEventListener('change', refresh); refresh();
    host.querySelector('[data-rm="ics"]').addEventListener('click', function () {
      var p = plan();
      download(calendar('Six gentle weeks', p.map(function (x) {
        return event({ uid: uid(x.week), start: x.start, minutes: mins, title: SIX_TITLE + ' (week ' + x.week + ')', note: note(x.week), url: weekUrl(x.week) });
      })), 'six-gentle-weeks.ics');
      msg.textContent = 'Your calendar file is ready: ' + p.length + (p.length === 1 ? ' event' : ' events') + ', every ' + DAYS[+dSel.value] + ' at ' + niceTime(hm()) + ', starting ' + niceDate(p[0].start) + '. Open it to add them.';
    });
  }
})();
