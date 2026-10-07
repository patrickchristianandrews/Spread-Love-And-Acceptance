/* remind.js — "Come back gently": a weekly reminder in the visitor's own calendar.
   Drop <div data-tol-remind></div> on a page (optionally data-remind-to="/path.html" for where the
   reminder opens, and data-remind-what="..." for its note). The visitor picks a day and a time, then
   either downloads a calendar file (.ics: Apple Calendar, Outlook, most phones) or opens Google
   Calendar with the event filled in. The event repeats weekly, lasts ten minutes and has a neutral
   title ("10 minutes for me"), so it says nothing private to anyone who sees the calendar.
   Nothing is sent to this site and nothing is stored here: the reminder lives in their calendar. */
(function () {
  'use strict';
  var hosts = document.querySelectorAll('[data-tol-remind]');
  if (!hosts.length) return;
  var SITE = 'https://spreadloveandacceptance.com';
  var DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  var TIMES = [['07:30', '7:30 am'], ['12:30', '12:30 pm'], ['18:00', '6 pm'], ['19:30', '7:30 pm'], ['21:00', '9 pm']];
  var TITLE = '10 minutes for me';
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function stamp(d) { return d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()) + 'T' + pad(d.getHours()) + pad(d.getMinutes()) + '00'; }
  function utcStamp(d) { return d.getUTCFullYear() + pad(d.getUTCMonth() + 1) + pad(d.getUTCDate()) + 'T' + pad(d.getUTCHours()) + pad(d.getUTCMinutes()) + pad(d.getUTCSeconds()) + 'Z'; }
  // the next date (today or later) that falls on the chosen weekday at the chosen time
  function firstAt(day, hm) {
    var p = hm.split(':'), d = new Date(); d.setSeconds(0, 0); d.setHours(+p[0], +p[1]);
    var add = (day - d.getDay() + 7) % 7; if (add === 0 && d < new Date()) add = 7;
    d.setDate(d.getDate() + add); return d;
  }
  function icsText(t) { return String(t).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n'); }

  Array.prototype.forEach.call(hosts, function (host, n) {
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
    function googleHref() {
      var s = when(), e = new Date(s.getTime() + 10 * 60000);
      return 'https://calendar.google.com/calendar/render?action=TEMPLATE&text=' + encodeURIComponent(TITLE) +
        '&dates=' + stamp(s) + '/' + stamp(e) + '&recur=' + encodeURIComponent('RRULE:FREQ=WEEKLY') +
        '&details=' + encodeURIComponent(what + '\n' + to);
    }
    function refresh() { g.href = googleHref(); }
    dSel.addEventListener('change', refresh); tSel.addEventListener('change', refresh); refresh();
    host.querySelector('[data-rm="ics"]').addEventListener('click', function () {
      var s = when(), lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Spread Love and Acceptance//Weekly reminder//EN', 'CALSCALE:GREGORIAN', 'BEGIN:VEVENT',
        'UID:' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8) + '@spreadloveandacceptance.com', 'DTSTAMP:' + utcStamp(new Date()),
        'DTSTART:' + stamp(s), 'DURATION:PT10M', 'RRULE:FREQ=WEEKLY', 'SUMMARY:' + icsText(TITLE), 'DESCRIPTION:' + icsText(what + '\n' + to), 'URL:' + to,
        'BEGIN:VALARM', 'ACTION:DISPLAY', 'TRIGGER:PT0M', 'DESCRIPTION:' + icsText(TITLE), 'END:VALARM', 'END:VEVENT', 'END:VCALENDAR'];
      var blob = new Blob([lines.join('\r\n') + '\r\n'], { type: 'text/calendar' }), url = URL.createObjectURL(blob), a = document.createElement('a');
      a.href = url; a.download = 'ten-minutes-for-me.ics'; document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
      msg.textContent = 'Your calendar file is ready. Open it to add “' + TITLE + '”, every ' + DAYS[+dSel.value] + ' at ' + tSel.options[tSel.selectedIndex].text + '.';
    });
  });
})();
