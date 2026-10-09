/* turning-toward.js — "Today's small moment" and the 7-day starter on /turning-toward.html
   Nothing is sent anywhere. The 7-day ticks and the chosen relationship are kept only
   in this browser (localStorage), and the page works without them. */
(function () {
  'use strict';

  var WHO = [['partner', 'Partner'], ['family', 'Family'], ['friend', 'Friend'], ['roommate', 'Roommate'],
             ['coparent', 'Co-parent'], ['coworker', 'Coworker'], ['caregiver', 'Someone I care for'],
             ['grandchild', 'Grown child or grandchild'], ['neighbor', 'Neighbor']];

  // One small moment per day. msg: a message to send, by relationship (default covers the rest).
  var SPARKS = [
    { key: 'thanks', title: 'Say one specific thank-you',
      todo: 'Think of one thing they did this week that you haven’t thanked them for. Name the thing, and the effort it took.',
      msg: { default: 'Thank you for [the specific thing]. I noticed [the effort it took], and it made my day easier.',
             coworker: 'Thanks for [the specific thing] this week. It saved me a lot of time on [the task].',
             coparent: 'Thanks for handling [the specific thing] with the kids. It made a real difference.',
             friend: 'Still thinking about [the specific thing] you did. Thank you, honestly. It meant a lot.',
             grandchild: 'Thank you for the call on Sunday. Hearing your news was the best part of my week.',
             neighbor: 'Thank you for taking my bins in while I was away. It was a real kindness.' } },
    { key: 'bids', title: 'Catch one small reach today',
      todo: 'When they say “look at this,” sigh, or share something small, stop what you’re doing, look, and ask one question about it.',
      msg: null },
    { key: 'good-news', title: 'Ask about something good',
      todo: 'Ask about a good thing in their week, then get curious: ask one more question about the answer.',
      msg: { default: 'What’s been the best part of your week so far?',
             coworker: 'What’s gone well for you this week?',
             friend: 'Been a minute! What’s the best thing that’s happened to you lately?',
             grandchild: 'What’s the best thing that happened to you this week? I’d love to hear.',
             neighbor: 'How’s the garden doing this year? Mine finally has tomatoes.' } },
    { key: 'their-world', title: 'Learn one new thing about their world',
      todo: 'People change. Ask one question you don’t already know the answer to, and really listen.',
      msg: { default: 'What’s something on your mind this week that I don’t know about?',
             coworker: 'What are you working on that you’re enjoying right now?',
             caregiver: 'What would make tomorrow a good day for you?',
             friend: 'Thinking of you. What’s taking up your brain these days?' } },
    { key: 'fondness', title: 'Tell them one thing you admire',
      todo: 'Name one quality you like in them, and one moment you saw it.',
      msg: { default: 'I was thinking today about how [a quality you admire], like when you [a moment]. I really like that about you.',
             coworker: 'I really appreciated how you [a moment] in [the meeting]. You’re good at that.',
             coparent: 'The kids are lucky you [a quality]. I saw it when you [a moment].',
             friend: 'Random, but I was remembering when you [a moment]. You’re a really good friend.' } },
    { key: 'stress-talk', title: 'Offer an ear, not a fix',
      todo: 'Ask about the stress from outside: work, family, the world. Take their side and don’t fix it unless they ask.',
      msg: { default: 'Rough day? I’m around tonight if you want to vent. No fixing, just listening.',
             coworker: 'This week looks heavy for you. Want to grab a coffee and vent for ten minutes?',
             friend: 'How are you actually doing? Happy to just listen if you want to vent.' } },
    { key: 'rituals', title: 'Start one small ritual',
      todo: 'Suggest something small you could do together, the same way each week, whatever the mood.',
      msg: { default: 'Want to make [a weekly walk / Sunday coffee / a Friday call] our thing?',
             roommate: 'Want to do a quick house dinner on Sundays? Nothing fancy.',
             coworker: 'Want to do a five-minute “what went well this week” on Fridays?',
             family: 'Want to make [Sunday lunch / a weekly call] a regular thing?',
             friend: 'I miss you! Want to make [first Saturday coffee / a monthly call] our thing, so we don’t have to plan it every time?' } },

    // ---- More small moments, so the daily card stays fresh for over a month ----
    { key: 'bids', title: 'Put the phone face down for one conversation',
      todo: 'Next time they start talking, put your phone face down and look at them until they finish.', msg: null },
    { key: 'bids', title: 'Answer the small stuff',
      todo: 'When they send a meme, a photo or a “ha”, reply with more than a like. One real sentence is enough.',
      msg: { default: 'Ha, this is so you. Where did you find it?',
             friend: 'Okay, this made me laugh out loud. How are you, by the way?' } },
    { key: 'bids', title: 'Notice a sigh',
      todo: 'If they sigh, go quiet or look tired, ask one gentle question instead of moving on.',
      msg: { default: 'You seem a bit tired today. Anything on your mind?',
             coworker: 'You seem swamped. Anything I can take off your plate?' } },
    { key: 'bids', title: 'Say yes to one invitation',
      todo: 'The next time they ask you to join something small (a walk, a show, a coffee), say yes if you can.', msg: null },
    { key: 'thanks', title: 'Thank them for something invisible',
      todo: 'Pick a job nobody notices: remembering birthdays, restocking, planning. Thank them for that one.',
      msg: { default: 'I don’t think I’ve ever said this, but thank you for always [the invisible job]. I notice.',
             roommate: 'Thanks for always [restocking / taking the trash out]. It doesn’t go unnoticed.',
             coworker: 'Thanks for always [keeping the notes / chasing the follow-ups]. It holds the team together.' } },
    { key: 'thanks', title: 'Put a thank-you in writing',
      todo: 'Leave a note, a card or a text they can keep. Written thanks gets read more than once.',
      msg: { default: 'Just wanted to say: thank you for [the thing]. You made a real difference.' } },
    { key: 'thanks', title: 'Thank them in front of someone',
      todo: 'Mention something they did well while someone else is listening: a friend, the kids, a team.', msg: null },
    { key: 'thanks', title: 'Thank them for who they are',
      todo: 'Not for a task this time. Thank them for a quality: their patience, their humor, their loyalty.',
      msg: { default: 'Thanks for being so [patient / funny / steady]. It makes life with you better.',
             friend: 'Thanks for being the kind of friend who [always shows up / makes me laugh / tells me the truth].' } },
    { key: 'good-news', title: 'Make a fuss about a small win',
      todo: 'When they share something good, however small, stop and ask how it happened. Let them tell the story.',
      msg: { default: 'Wait, tell me everything. How did it go?',
             grandchild: 'You passed? That’s wonderful! How did it feel when you found out?',
             friend: 'The doctor’s appointment went well? Oh, I’m so glad. What did they say?' } },
    { key: 'good-news', title: 'Remember and follow up',
      todo: 'Think of something they were looking forward to or worried about. Ask how it went.',
      msg: { default: 'How did [the thing] go? I was thinking about you.',
             friend: 'Hey! How did [the interview / the trip / the date] go? I want to hear.',
             coworker: 'How did [the presentation] land? I bet you nailed it.' } },
    { key: 'good-news', title: 'Share one good thing of your own',
      todo: 'Tell them one small good thing from your day, and ask for one of theirs.',
      msg: { default: 'Best thing about my day: [one small thing]. What was yours?' } },
    { key: 'good-news', title: 'Celebrate out loud',
      todo: 'Pick something they did recently and make a small celebration: a toast, a treat, a silly dance.', msg: null },
    { key: 'their-world', title: 'Ask about a worry, gently',
      todo: 'Ask what’s been on their mind lately, then just listen. No advice unless they ask for it.',
      msg: { default: 'What’s been taking up space in your head lately?',
             friend: 'Real question: how are you actually doing?',
             family: 'How are things really going? I’d love to hear.' } },
    { key: 'their-world', title: 'Ask about a dream',
      todo: 'Ask about something they’d love to do one day. Get curious about why it matters to them.',
      msg: { default: 'If you could do anything next year, what would it be?' } },
    { key: 'their-world', title: 'Learn their favorite right now',
      todo: 'Ask what they’re loving at the moment: a song, a show, a food. Try it yourself.',
      msg: { default: 'What are you loving right now? Song, show, snack, anything. I need a recommendation.' } },
    { key: 'their-world', title: 'Ask about their people',
      todo: 'Ask about someone who matters to them: a sibling, an old friend, a colleague. Remember the name.',
      msg: { default: 'How’s [their person] doing these days?' } },
    { key: 'fondness', title: 'Remember a good memory together',
      todo: 'Bring up a moment you both loved. Ask what they remember about it.',
      msg: { default: 'Randomly thought about [the memory] today and smiled. Do you remember [a detail]?',
             friend: 'Remember [the trip / that night / that dumb joke]? Still one of my favorite memories.',
             grandchild: 'I was remembering when you were little and [the memory]. It still makes me smile.' } },
    { key: 'fondness', title: 'Tell them how they helped you',
      todo: 'Think of a time they made something easier for you. Tell them what it meant.',
      msg: { default: 'I still think about when you [what they did]. It helped more than you know.' } },
    { key: 'fondness', title: 'Send a “this made me think of you” message',
      todo: 'When you see something that reminds you of them, send it. No reason needed.',
      msg: { default: 'Saw this and thought of you 💛',
             friend: 'This is SO you. Thinking of you!' } },
    { key: 'fondness', title: 'Name what you’d miss',
      todo: 'Think about what life would lack without them. Tell them one piece of it.',
      msg: { default: 'Life would be a lot less [fun / calm / interesting] without you. Just saying.' } },
    { key: 'stress-talk', title: 'Ask what would help today',
      todo: 'Instead of guessing, ask: what would make today a bit easier? Then do that one thing if you can.',
      msg: { default: 'What’s one thing that would make today a bit easier for you?',
             coparent: 'Busy week. Is there one thing with the kids I can take off your list?',
             caregiver: 'What would make today feel a little lighter?' } },
    { key: 'stress-talk', title: 'Take their side first',
      todo: 'When they vent about someone else, show you’re on their team before anything else.',
      msg: { default: 'That sounds really unfair. I’m on your side.' } },
    { key: 'stress-talk', title: 'Do one of their jobs quietly',
      todo: 'Pick a small chore that’s normally theirs and do it without being asked or mentioning it.', msg: null },
    { key: 'stress-talk', title: 'Check in after a hard day',
      todo: 'If you know today was tough for them, send a message before they have to ask.',
      msg: { default: 'Thinking of you today. Hope it’s going okay. No need to reply.',
             friend: 'Know today’s a big one. Rooting for you. No need to reply 💛' } },
    { key: 'rituals', title: 'Make a tiny goodbye ritual',
      todo: 'Pick something small you do every time one of you leaves: a hug, a phrase, a wave from the window.', msg: null },
    { key: 'rituals', title: 'Start a six-second hug',
      todo: 'Hug for a slow six seconds today. It feels long, and that’s the point.', msg: null },
    { key: 'rituals', title: 'Plan something to look forward to',
      todo: 'Put one small, fun thing in the calendar together. Anticipation is half the joy.',
      msg: { default: 'Let’s put something fun on the calendar. [A picnic / a movie night / a day trip]?',
             friend: 'We need a plan! [Brunch / a walk / a show] sometime in the next few weeks? I’ll bring snacks.' } },
    { key: 'rituals', title: 'Reconnect with someone drifting',
      todo: 'Think of someone you’ve lost touch with. Send one low-pressure message, with no need for a long reply.',
      msg: { default: 'Hey, it’s been a while and I was thinking of you. How are things?',
             friend: 'It’s been way too long! No pressure to write back properly, just wanted to say hi. Coffee sometime?' } },
    { key: 'rituals', title: 'Short on energy? Send ten seconds',
      todo: 'When life is full (a new baby, a new job, a hard patch), a tiny message keeps the thread. No catch-up needed.',
      msg: { default: 'Life is full right now and I’ve been quiet. I’m thinking of you, and I’m not ignoring you.',
             friend: 'I’ve been underwater [with the baby / with work]. I miss you and I’m not ignoring you. Voice note this weekend?',
             family: 'I’ve been quiet because life is full, not because I don’t care. Can I call you on Sunday?' } },
    { key: 'bids', title: 'Say you miss them',
      todo: 'If you’ve been feeling left out, say it once, kindly, with one small ask. No list of who texted first.',
      msg: { default: 'I miss you. Could we find ten minutes this week?',
             friend: 'I miss you and I’ve been feeling a bit left out. Could we find ten minutes this week?',
             coworker: 'I miss our catch-ups. Coffee for ten minutes this week?' } },
    { key: 'rituals', title: 'End the day with one good thing',
      todo: 'Before sleep, or at the end of a call, each share one thing from today that went well.',
      msg: { default: 'Want to try something? Every night, we each share one good thing from the day.' } },
    { key: 'good-news', title: 'Share a small good thing with someone',
      todo: 'The doctor’s appointment went well, the tomatoes finally came up, a grandchild called: tell someone about one small good thing, and ask for theirs.',
      msg: { default: 'Small good news: [the doctor’s appointment went well / the tomatoes finally came up]. What’s your good thing this week?',
             grandchild: 'Lovely to hear from you. My good thing this week: [one small thing]. What’s yours?' } },
    { key: 'rituals', title: 'Make the call they’d love to get',
      todo: 'Ring a grandchild, an old friend or a neighbor just to hear their news. Ask about one thing they mentioned last time.',
      msg: { default: 'Just calling to hear your news. How did [the thing you mentioned] go?',
             grandchild: 'Thinking of you! How did [the match / the exam / the new job] go? Call me when you have a minute.' } },
    { key: 'bids', title: 'Turn toward a reach you missed',
      todo: 'Think back: was there a moment this week you brushed off? Go back to it now.',
      msg: { default: 'Earlier you mentioned [the thing] and I didn’t really listen. I’d like to hear about it now.' } }
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
    // a shared link can say who it's for (?who=friend), so the person who got a message can send one back
    try {
      var qWho = new URLSearchParams(location.search).get('who');
      if (qWho && WHO.some(function (w) { return w[0] === qWho; })) who = qWho;
    } catch (e) {}

    var whoWrap = $('tt-who');
    WHO.forEach(function (w) {
      var l = document.createElement('label'); l.className = 'tt-chip';
      l.innerHTML = '<input type="radio" name="tt-who" value="' + w[0] + '"' + (w[0] === who ? ' checked' : '') + '><span>' + esc(w[1]) + '</span>';
      l.querySelector('input').addEventListener('change', function () { who = w[0]; set('tol-tt-who', who); show(); });
      whoWrap.appendChild(l);
    });

    // the "Dig deeper" link says which section of the full guide it opens
    var DIG = { thanks: 'why specific thanks works', bids: 'bids, and three ways to answer them', 'good-news': 'celebrating good news',
      'their-world': 'knowing their world', fondness: 'remembering what you like about them', 'stress-talk': 'the stress-reducing conversation', rituals: 'small rituals of connection' };
    function show() {
      var s = SPARKS[idx], msg = s.msg ? (s.msg[who] || s.msg.default) : '';
      $('tt-title').textContent = s.title;
      $('tt-todo').textContent = s.todo;
      $('tt-more').setAttribute('href', '/turning-toward-in-depth.html#' + s.key);
      $('tt-more').textContent = 'Dig deeper: ' + (DIG[s.key] || 'why this works');
      var box = $('tt-msg');
      if (msg) { box.hidden = false; $('tt-msg-text').value = msg; }
      else box.hidden = true;
      fillNote(false);
    }
    // anything still in [square brackets] is a gap to fill in first
    function gaps(text) { return /\[[^\]]*\]/.test(text); }
    function fillNote(asked) {
      var t = $('tt-msg-text').value, n = $('tt-fill');
      n.classList.toggle('is-ask', !!asked);
      if (!gaps(t)) { n.textContent = ''; return; }
      n.textContent = asked
        ? 'Almost there: please fill in the parts in [square brackets] first, so the message sounds like you. Then tap Share again.'
        : 'Tap the message to fill in the parts in [square brackets].';
    }
    $('tt-msg-text').addEventListener('input', function () { fillNote(false); });
    function focusGap() {
      var ta = $('tt-msg-text'), i = ta.value.indexOf('['), j = ta.value.indexOf(']', i);
      try { ta.focus(); if (i >= 0 && j > i) ta.setSelectionRange(i, j + 1); } catch (e) {}
    }
    // "Another idea": go through the ideas in a shuffled order, never showing the same idea or the same
    // message twice in a row, and not repeating one until the rest have had a turn
    function msgOf(i) { var s = SPARKS[i]; return s.msg ? (s.msg[who] || s.msg.default) : ''; }
    var deck = [], recent = [];
    function shuffled() {
      var a = SPARKS.map(function (_, i) { return i; });
      for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; }
      return a;
    }
    function nextIdx() {
      var curMsg = msgOf(idx), curTitle = SPARKS[idx].title;
      for (var round = 0; round < 2; round++) {
        if (!deck.length) deck = shuffled();
        for (var k = 0; k < deck.length; k++) {
          var i = deck[k], m = msgOf(i);
          if (i === idx || SPARKS[i].title === curTitle) continue;
          if (m && (m === curMsg || recent.indexOf(m) !== -1)) continue;
          deck.splice(k, 1);
          return i;
        }
        deck = [];   // everything left would repeat: start a fresh shuffle
        recent = recent.slice(-1);
      }
      return (idx + 1) % SPARKS.length;
    }
    $('tt-next').addEventListener('click', function () {
      var m = msgOf(idx); if (m) { recent.push(m); if (recent.length > 12) recent.shift(); }
      idx = nextIdx(); show();
    });
    $('tt-copy').addEventListener('click', function () {
      var t = $('tt-msg-text').value;
      copy(t, this);
      if (gaps(t)) { $('tt-fill').textContent = 'Copied. Remember to change the parts in [square brackets] before you send it.'; }
    });
    var share = $('tt-share');
    // the message, with a link back to this page (set to the same relationship) so the other person can
    // find the tool and send one back, through the site's own share (the device's share menu, or a small sheet)
    if (window.TOLShare || navigator.share) {
      share.hidden = false;
      share.classList.add('tol-share-btn');
      try { if (window.TOLShareClip && window.TOLShareClip.mount) window.TOLShareClip.mount(share); } catch (e) {}
      share.addEventListener('click', function () {
        var text = $('tt-msg-text').value.trim();
        if (!text) return;
        if (gaps(text)) { fillNote(true); focusGap(); return; } // nothing is shared with the brackets still in
        var url = location.origin + '/turning-toward.html?who=' + encodeURIComponent(who);
        var body = text + '\n\nLittle messages like this one:';
        if (window.TOLShare) window.TOLShare.share({ title: 'A little message', text: body, url: url, result: true });
        else navigator.share({ text: body, url: url }).catch(function () {});
      });
    }
    show();
    card.hidden = false;
  }

  // "Why this works": the site adds its Pillars strip under the title; on this page it lives in the
  // closed "Why this works" box below today's moment, so the page opens with the activity.
  (function () {
    var slot = $('tt-why-body'); if (!slot) return;
    function grab() { var n = document.querySelector('main .tol-pillars'); if (n && n.parentNode !== slot) { slot.appendChild(n); return true; } return !!n; }
    if (grab()) return;
    var main = document.querySelector('main'); if (!main || !window.MutationObserver) return;
    var mo = new MutationObserver(function () { if (grab()) mo.disconnect(); });
    mo.observe(main, { childList: true });
    setTimeout(function () { mo.disconnect(); }, 15000);
  })();

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
    // One set of ticks by default (as before, 'tol-tt-7day'). Two people on one device can switch to a
    // column each, with their own names ('tol-tt-7day-pair'); the single set is kept as it was.
    var ticks = {}, pair = { names: ['', ''], t: [{}, {}] }, mode = get('tol-tt-7day-mode') === 'pair' ? 'pair' : 'one';
    try { ticks = JSON.parse(get('tol-tt-7day') || '{}') || {}; } catch (e) { ticks = {}; }
    try {
      var pr = JSON.parse(get('tol-tt-7day-pair') || 'null');
      if (pr && Array.isArray(pr.names) && Array.isArray(pr.t)) pair = { names: [String(pr.names[0] || '').slice(0, 30), String(pr.names[1] || '').slice(0, 30)], t: [pr.t[0] || {}, pr.t[1] || {}] };
    } catch (e) { /* start fresh */ }
    function savePair() { set('tol-tt-7day-pair', JSON.stringify(pair)); }
    function pname(k) { return String(pair.names[k] || '').trim() || (k ? 'Person 2' : 'Person 1'); }
    // the switch and the two names, above the list
    var tools = document.createElement('div');
    tools.className = 'tt-pair';
    tools.innerHTML = '<button type="button" class="tt-btn is-quiet" id="tt-pair-toggle" aria-pressed="false"></button>' +
      '<div class="tt-pair-names" id="tt-pair-names" hidden>' +
      '<label>First name <input type="text" id="tt-pn-0" maxlength="30" autocomplete="off"></label>' +
      '<label>Second name <input type="text" id="tt-pn-1" maxlength="30" autocomplete="off"></label>' +
      '<p class="tt-note" style="margin:0!important;">Each of you ticks only your own column, so you can both see whose day is done.</p></div>';
    list.parentNode.insertBefore(tools, list);
    $('tt-pn-0').value = pair.names[0]; $('tt-pn-1').value = pair.names[1];
    function draw() {
      list.innerHTML = '';
      list.classList.toggle('is-pair', mode === 'pair');
      DAYS.forEach(function (d, i) {
        var li = document.createElement('li');
        if (mode === 'pair') {
          li.innerHTML = '<span class="tt-day">Day ' + (i + 1) + '</span><span class="tt-task">' + esc(d[1]) + '</span>' +
            '<span class="tt-ticks">' + [0, 1].map(function (k) {
              return '<label class="tt-tick"><input type="checkbox" data-day="' + i + '" data-p="' + k + '"' + (pair.t[k][i] ? ' checked' : '') + '><span>' + esc(pname(k)) + '</span></label>';
            }).join('') + '</span>' +
            '<a href="/turning-toward-in-depth.html#' + d[0] + '" class="tt-how">How</a>';
        } else {
          li.innerHTML = '<label><input type="checkbox" data-day="' + i + '"' + (ticks[i] ? ' checked' : '') + '>' +
            '<span class="tt-day">Day ' + (i + 1) + '</span><span class="tt-task">' + esc(d[1]) + '</span></label>' +
            '<a href="/turning-toward-in-depth.html#' + d[0] + '" class="tt-how">How</a>';
        }
        list.appendChild(li);
      });
      var tg = $('tt-pair-toggle');
      tg.textContent = mode === 'pair' ? 'Back to one set of ticks' : 'Two of you on one device? Tick your own days';
      tg.setAttribute('aria-pressed', mode === 'pair' ? 'true' : 'false');
      $('tt-pair-names').hidden = mode !== 'pair';
      progress();
    }
    list.addEventListener('change', function (e) {
      if (!e.target.matches('input[data-day]')) return;
      var day = e.target.getAttribute('data-day'), p = e.target.getAttribute('data-p');
      if (p != null) { pair.t[+p][day] = e.target.checked; savePair(); }
      else { ticks[day] = e.target.checked; set('tol-tt-7day', JSON.stringify(ticks)); }
      if (e.target.checked && window.TOLGarden) window.TOLGarden.gift('kindness');
      progress();
    });
    $('tt-pair-toggle').addEventListener('click', function () {
      mode = mode === 'pair' ? 'one' : 'pair';
      set('tol-tt-7day-mode', mode);
      draw();
      var f = mode === 'pair' ? $('tt-pn-0') : $('tt-pair-toggle'); if (f) f.focus();
    });
    [0, 1].forEach(function (k) {
      $('tt-pn-' + k).addEventListener('input', function () {
        pair.names[k] = this.value.slice(0, 30); savePair();
        list.querySelectorAll('input[data-p="' + k + '"] + span').forEach(function (s) { s.textContent = pname(k); });
        progress();
      });
    });
    $('tt-reset').addEventListener('click', function () {
      if (mode === 'pair') { pair.t = [{}, {}]; savePair(); }
      else { ticks = {}; set('tol-tt-7day', '{}'); }
      list.querySelectorAll('input[data-day]').forEach(function (c) { c.checked = false; });
      progress();
    });
    function countOf(t) { return Object.keys(t).filter(function (k) { return t[k]; }).length; }
    function progress() {
      if (mode === 'pair') {
        var a = countOf(pair.t[0]), b = countOf(pair.t[1]);
        $('tt-bar').style.width = Math.round((a + b) / 14 * 100) + '%';
        $('tt-count').textContent = pname(0) + ' ' + a + ' of 7 · ' + pname(1) + ' ' + b + ' of 7';
        $('tt-done').hidden = !(a === 7 && b === 7);
        return;
      }
      var n = list.querySelectorAll('input[data-day]:checked').length;
      $('tt-bar').style.width = Math.round(n / 7 * 100) + '%';
      $('tt-count').textContent = n === 7 ? 'All seven. That’s a habit starting.' : n + ' of 7';
      $('tt-done').hidden = n !== 7;
    }
    draw();

    // A gentle welcome back to the 7-day start, only on a later day and never with a "you missed"
    var n = Object.keys(ticks).filter(function (k) { return ticks[k]; }).length;
    var todayKey = new Date().toDateString(), lastSeen = get('tol-tt-last');
    if (n > 0 && n < 7 && lastSeen && lastSeen !== todayKey) {
      var w = document.createElement('p'); w.className = 'tol-welcome';
      w.innerHTML = '<img src="/assets/img/mascots/two-bubbles.svg" alt="" width="40" height="40"><span>Welcome back. You’re on <strong>day ' + (n + 1) + ' of 7</strong>. Pick up where you left off, or start fresh.</span>';
      list.parentNode.insertBefore(w, list);
    }
    set('tol-tt-last', todayKey);
  }
})();
