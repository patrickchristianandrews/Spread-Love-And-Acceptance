/* recheck-drive.js — The Re-check Drive (recheck-drive.html)

   A calm football game made from the complacency playbook (complacency.html). Pick who the drive is
   for, call a play, do it for real, and tell the game you did: the ball moves toward a field goal.
   No clock, no opponent that can score, no way to lose, no streaks. Nothing is checked or sent
   anywhere; the drive is kept only in this browser (localStorage key tol-recheck-drive-v1), and
   "Start over" erases it.

   To add or change a play, edit PLAYS below. Every play has a category, a yardage, a how-to and
   a suggested line for each kind of relationship. Keep the lines kind and free of verdicts. */
(function () {
  'use strict';

  var KEY = 'tol-recheck-drive-v1';
  var START = 25;      // the ball starts on your own 25
  var KICK = 65;       // field-goal range starts on their 35
  var TOP = 99;        // the ball never goes past this
  var X0 = 80, PX = 8.4;   // the SVG field: the goal line is x = 80, one yard is 8.4 units

  var WHO = [
    ['self', 'Myself'], ['us', 'Us, together'], ['partner', 'A partner'], ['relative', 'A parent or relative'], ['young', 'A child or teen'],
    ['friend', 'A friend'], ['housemate', 'A housemate'], ['coworker', 'A coworker']
  ];

  /* ---------- the playbook ---------- */
  var PLAYS = [
    { id: 'state', cat: 'Check your state', yards: 3, title: 'Check your state first',
      how: 'Before any real conversation, take a minute. Are you tired, hurt or keeping score? If so, wait. A calm moment is part of the play.',
      say: 'Ask yourself', lines: {
        all: 'Am I calm enough to listen right now? If not, when would be a better time?' },
      why: 'Pillar III: how full your tank is shapes how every word lands.' },
    { id: 'notice', cat: 'Notice', yards: 5, title: 'Notice one quiet sign',
      how: 'Complacency never announces itself. Pick the quiet sign that is most true this week and just notice it. You don’t have to fix anything yet.',
      say: 'Name it, to yourself', lines: {
        self: '“I’m fine” has become the whole answer I give myself.',
        partner: '“Fine” has become the whole conversation.',
        us: '“Fine” has become the whole conversation, for both of us.',
        relative: 'Our calls have become all logistics.',
        young: 'I’m picturing them as they were a year ago.',
        friend: '“We’ll catch up soon” has replaced an actual plan.',
        housemate: '“We’ve always done it this way” is the reason for how we split things.',
        coworker: '“We’ve always done it this way” is the reason for how we run this.' },
      why: 'Noticing is the first half of the cure.' },
    { id: 'ask', cat: 'Ask', yards: 7, title: 'Ask a question you don’t know the answer to',
      how: 'Ask it, then listen to the whole answer. Don’t fix and don’t compare. People keep changing, even the ones we know best.',
      say: 'Try asking', lines: {
        self: 'What do I want more of this month, and what have I been putting up with?',
        partner: 'What’s on your mind this week that I don’t know about?',
        us: 'Take turns: what’s on your mind this week that the other one doesn’t know about?',
        relative: 'What’s something about your life now that I don’t know much about?',
        young: 'What’s something about your life right now that I should know?',
        friend: 'What’s been the best and the hardest part of your year so far?',
        housemate: 'What’s one thing that would make this place work better for you?',
        coworker: 'What part of your work right now could use more support?' },
      why: 'A real question brings the picture of them up to date.' },
    { id: 'thank', cat: 'Thank', yards: 7, title: 'Say one specific thank-you',
      how: 'Name the thing, the effort, or the quality behind it. Specific beats general, because it proves you noticed.',
      say: 'Try saying', lines: {
        self: 'Thank you for keeping going with the things nobody sees.',
        partner: 'Thank you for handling the school forms. I know that took real effort.',
        us: 'Take turns: one specific thank-you each, for something from this week.',
        relative: 'Thank you for always remembering everyone’s birthday. I notice it.',
        young: 'I saw how patient you were today. Thank you.',
        friend: 'Thank you for always being the one who plans things. I don’t say it enough.',
        housemate: 'Thanks for always taking the bins out without being asked.',
        coworker: 'Thanks for the follow-up notes after every meeting. They keep us all on track.' },
      why: 'Reliable work gets used to. Thanks makes it visible again.' },
    { id: 'share', cat: 'Share your context', yards: 10, title: 'Share your side',
      how: 'Say one honest thing about what has been going on for you lately, including your part in the quiet. This isn’t an excuse. It’s context, and they can’t see it unless you say it.',
      say: 'Try saying', lines: {
        self: 'Here’s what’s actually been going on for me, in one honest sentence: ___.',
        partner: 'I’ve been heads-down at work and I let our evenings slide. That’s on me, and it isn’t because I stopped caring.',
        us: 'Take turns: one honest thing each about how this month has been, including your own part in the quiet.',
        relative: 'I’ve been busy and I let our calls get shorter. I’d like to do better, and I’ll tell you more about what’s going on with me.',
        young: 'I’ve been caught up in my own stuff and I haven’t asked enough. I’d like to catch up.',
        friend: 'Life got busy and I let us slide, and that’s on me. I’ve missed you.',
        housemate: 'My schedule changed a lot this year, and I haven’t said how that’s affecting my share of the chores.',
        coworker: 'I’ve had a heavier load lately, and it’s made me less available for check-ins than I’d like.' },
      why: 'Context on your side, so they don’t have to guess.', flag: 'mine' },
    { id: 'theirs', cat: 'Ask for theirs', yards: 10, title: 'Ask for their context',
      how: 'Ask what it has been like for them, then listen to all of it without defending. Their context is the other half of the picture.',
      say: 'Try asking', lines: {
        self: 'Ask someone who knows you well: what have you noticed in me lately that I might not see?',
        partner: 'What’s it been like for you lately? I want to hear it properly.',
        us: 'Take turns asking “What’s it been like for you lately?” The other one just listens, all the way through.',
        relative: 'How have things really been for you? I’d like to hear more than the short version.',
        young: 'What’s been going on for you lately? You can tell me as little or as much as you like.',
        friend: 'What’s been going on with you? I want to hear all of it.',
        housemate: 'How does this setup look from your side? What’s working and what isn’t?',
        coworker: 'How does this process look from your seat? What would you change?' },
      why: 'Understanding needs both sides’ context.', flag: 'theirs' },
    { id: 'listen', cat: 'Listen', yards: 5, title: 'Say it back before you answer',
      how: 'When they answer, say back what you heard before you reply, and check you got it. That is how two people understand each other instead of trading verdicts.',
      say: 'Try saying back', lines: {
        self: 'What I’m hearing from myself is ___. Is that right?',
        all: 'What I heard is ___. Did I get that?' },
      why: 'Being heard comes before being answered.' },
    { id: 'raise', cat: 'Raise it kindly', yards: 10, title: 'Raise it kindly',
      how: 'Choose a calm time. Open with a fact, your own part, and a question. Never a verdict like “you never.” You’re on the same team against the drift.',
      say: 'Try opening with', lines: {
        self: 'I’ve noticed I’ve stopped checking on ___. I’d like to take a kind look at it this month.',
        partner: 'Nothing’s wrong. I’ve noticed we haven’t asked each other much lately, and part of that is me. What’s it been like for you?',
        us: 'Nothing’s wrong. We’ve both stopped asking each other much lately. What has each of us noticed?',
        relative: 'I realized we mostly talk about logistics. I’d like to hear how you’re really doing.',
        young: 'I might be picturing you as you were a year ago. I’d like to catch up.',
        friend: 'It’s been a while, and I’ve let it slide. I’d love to catch up.',
        housemate: 'The way we do this hasn’t changed in a while. Could we check whether it still works for everyone?',
        coworker: 'We’ve done it this way for a long time. Could we take ten minutes to check whether it still works?' },
      why: 'A fact, your part and a question open the door without a fight.' },
    { id: 'touchstone', cat: 'Touchstone', yards: 6, title: 'Bring back a touchstone',
      how: 'A touchstone is a shared word, joke, pet name, song, story or place that says “we’re us.” A few words can carry a whole history. Bring an old one back, or start a new one.',
      say: 'Try this', lines: {
        self: 'Pick one phrase, song or place that reminds you who you want to be, and use it today.',
        partner: 'Remember when we ___? That still makes me laugh.',
        us: 'Remember when we ___? Let’s bring that back this month.',
        relative: 'Tell me again the story about ___. I love hearing it.',
        young: 'Use the silly phrase or inside joke only the two of you share, and see if it lands.',
        friend: 'Send them the inside joke, or the song that always reminds you of them.',
        housemate: 'Bring back the house in-joke, or start a small tradition, like Friday takeout.',
        coworker: 'Use the team’s shared phrase, or start one, like a “win of the week.”' },
      why: 'Shared words say “we’re us,” and they keep context alive.' },
    { id: 'recheck', cat: 'Re-check', yards: 8, title: 'Put a small re-check on the calendar',
      how: 'Pick a day and a size you can keep, and put it in your calendar now. Small enough to survive a bad week, and fixed to a day.',
      say: 'Try this', lines: {
        self: 'The first Sunday of the month: What am I assuming is fine? When did I last actually check?',
        partner: 'The first Sunday of the month: one real question each, one thank-you each, and “what have we stopped mentioning?”',
        us: 'The first Sunday of the month: one real question each, one thank-you each, and “what have we stopped mentioning?”',
        relative: 'A standing ten-minute call, the same day each week.',
        young: 'A regular walk, drive or snack with no agenda.',
        friend: 'A standing monthly call or walk.',
        housemate: 'A ten-minute house check every three months: does this still work for everyone?',
        coworker: 'A quarterly ten-minute check: does this process still work for everyone?' },
      why: 'What isn’t re-checked slowly drifts. A date keeps it alive.' },
    { id: 'change', cat: 'Change one thing', yards: 8, title: 'Agree one small change',
      how: 'Pick one small change you will both try, say who does what, and set a date to look again. Small and kept beats big and dropped.',
      say: 'Try agreeing', lines: {
        self: 'For the next month I’ll ___, and I’ll look again on ___.',
        all: 'Let’s try ___ for a month, and look again on ___.' },
      why: 'One kept change is worth more than a list.' }
  ];

  var byId = {};
  PLAYS.forEach(function (p) { byId[p.id] = p; });

  /* ---------- small helpers ---------- */
  function $(id) { return document.getElementById(id); }
  function el(tag, attrs, text) {
    var n = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) { n.setAttribute(k, attrs[k]); });
    if (text != null) n.textContent = text;
    return n;
  }
  function svg(tag, attrs) {
    var n = document.createElementNS('http://www.w3.org/2000/svg', tag);
    if (attrs) Object.keys(attrs).forEach(function (k) { n.setAttribute(k, attrs[k]); });
    return n;
  }
  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function whoName(k) { for (var i = 0; i < WHO.length; i++) if (WHO[i][0] === k) return WHO[i][1]; return ''; }
  function lineFor(p, who) { return p.lines[who] || p.lines.all || ''; }
  function lineLabel(y) { return y < 50 ? 'your ' + y : (y === 50 ? 'the 50' : 'their ' + (100 - y)); }
  function xOf(y) { return X0 + y * PX; }

  /* ---------- saved state (this browser only) ---------- */
  var S = { who: '', yards: START, done: [], hand: [], kicked: false, total: 0, started: false, flags: { mine: false, theirs: false } };
  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      if (!raw) return;
      var d = JSON.parse(raw);
      if (d && typeof d === 'object') {
        S.who = typeof d.who === 'string' ? d.who : '';
        S.yards = typeof d.yards === 'number' ? Math.max(START, Math.min(TOP, d.yards)) : START;
        S.done = Array.isArray(d.done) ? d.done.filter(function (i) { return byId[i]; }) : [];
        S.hand = Array.isArray(d.hand) ? d.hand.filter(function (i) { return byId[i]; }) : [];
        S.kicked = !!d.kicked;
        S.total = typeof d.total === 'number' ? d.total : 0;
        S.started = !!d.started && !!S.who;
        S.flags = { mine: !!(d.flags && d.flags.mine), theirs: !!(d.flags && d.flags.theirs) };
      }
    } catch (e) { /* private window or blocked storage: the game still works */ }
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* ignore */ } }
  function erase() { try { localStorage.removeItem(KEY); } catch (e) { /* ignore */ } }

  /* ---------- the field ---------- */
  var ball, markFirst, markLine;
  function drawField() {
    var f = $('rd-svg');
    while (f.firstChild) f.removeChild(f.firstChild);
    var defs = svg('defs');
    var grad = svg('linearGradient', { id: 'rd-turf', x1: '0', y1: '0', x2: '0', y2: '1' });
    grad.appendChild(svg('stop', { offset: '0', 'stop-color': '#6DB07C' }));
    grad.appendChild(svg('stop', { offset: '1', 'stop-color': '#4F9663' }));
    defs.appendChild(grad); f.appendChild(defs);
    f.appendChild(svg('rect', { x: 0, y: 0, width: 1000, height: 300, fill: 'url(#rd-turf)' }));
    // end zones
    f.appendChild(svg('rect', { x: 0, y: 0, width: X0, height: 300, fill: '#4B6FB5' }));
    f.appendChild(svg('rect', { x: X0 + 100 * PX, y: 0, width: 1000 - (X0 + 100 * PX), height: 300, fill: '#C28A3B' }));
    var t1 = svg('text', { x: 40, y: 150, 'text-anchor': 'middle', fill: '#EAF0FF', 'font-size': 26, 'font-family': 'Fraunces, Georgia, serif', 'font-weight': 600, transform: 'rotate(-90 40 150)' }); t1.textContent = 'US'; f.appendChild(t1);
    var t2 = svg('text', { x: 934, y: 150, 'text-anchor': 'middle', fill: '#FFF3DC', 'font-size': 16, 'font-family': 'Fraunces, Georgia, serif', 'font-weight': 600, transform: 'rotate(90 934 150)' }); t2.textContent = 'UNDERSTANDING'; f.appendChild(t2);
    // alternating stripes and yard lines
    for (var i = 0; i < 10; i++) {
      if (i % 2) f.appendChild(svg('rect', { x: xOf(i * 10), y: 0, width: 10 * PX, height: 300, fill: 'rgba(255,255,255,.05)' }));
    }
    for (var k = 0; k <= 10; k++) {
      f.appendChild(svg('line', { x1: xOf(k * 10), y1: 0, x2: xOf(k * 10), y2: 300, stroke: 'rgba(255,255,255,.8)', 'stroke-width': k === 0 || k === 10 ? 4 : 2 }));
    }
    for (var m = 1; m < 10; m++) {
      var n = m <= 5 ? m * 10 : (10 - m) * 10;
      [60, 255].forEach(function (yy) {
        var tx = svg('text', { x: xOf(m * 10), y: yy, 'text-anchor': 'middle', fill: 'rgba(255,255,255,.7)', 'font-size': 22, 'font-family': 'IBM Plex Mono, monospace', 'font-weight': 500 });
        tx.textContent = String(n); f.appendChild(tx);
      });
    }
    for (var h = 1; h < 100; h++) {
      if (h % 10 === 0) continue;
      var hx = xOf(h);
      [100, 200].forEach(function (yy) { f.appendChild(svg('line', { x1: hx, y1: yy, x2: hx, y2: yy + 8, stroke: 'rgba(255,255,255,.45)', 'stroke-width': 1.5 })); });
    }
    // field-goal range
    var kr = svg('line', { x1: xOf(KICK), y1: 8, x2: xOf(KICK), y2: 292, stroke: '#FFF3C8', 'stroke-width': 3, 'stroke-dasharray': '10 8' }); f.appendChild(kr);
    var kt = svg('text', { x: xOf(KICK) + 8, y: 30, fill: '#FFF3C8', 'font-size': 15, 'font-family': 'IBM Plex Mono, monospace' }); kt.textContent = 'kick range →'; f.appendChild(kt);
    // goal post
    var gp = svg('g', { stroke: '#F4D35E', 'stroke-width': 5, fill: 'none', 'stroke-linecap': 'round' });
    gp.appendChild(svg('line', { x1: 978, y1: 290, x2: 978, y2: 170 }));
    gp.appendChild(svg('line', { x1: 958, y1: 170, x2: 996, y2: 170 }));
    gp.appendChild(svg('line', { x1: 958, y1: 170, x2: 958, y2: 90 }));
    gp.appendChild(svg('line', { x1: 996, y1: 170, x2: 996, y2: 90 }));
    f.appendChild(gp);
    // markers: first down (yellow) and line of scrimmage (blue)
    markFirst = svg('g', { 'class': 'rd-mark' });
    markFirst.appendChild(svg('line', { x1: 0, y1: 0, x2: 0, y2: 300, stroke: '#F2C94C', 'stroke-width': 5 }));
    f.appendChild(markFirst);
    markLine = svg('g', { 'class': 'rd-mark' });
    markLine.appendChild(svg('line', { x1: 0, y1: 0, x2: 0, y2: 300, stroke: '#4C7CF2', 'stroke-width': 5 }));
    f.appendChild(markLine);
    // the ball and the two of you
    ball = svg('g', { 'class': 'rd-ball' });
    var huddle = svg('g');
    huddle.appendChild(svg('circle', { cx: -34, cy: 14, r: 13, fill: '#7B5BD6', stroke: '#fff', 'stroke-width': 3 }));
    huddle.appendChild(svg('circle', { cx: -58, cy: 18, r: 13, fill: '#E0A92E', stroke: '#fff', 'stroke-width': 3 }));
    ball.appendChild(huddle);
    var b = svg('g', { id: 'rd-ball-body' });
    b.appendChild(svg('ellipse', { cx: 0, cy: 0, rx: 19, ry: 11, fill: '#8A4F2A', stroke: '#4E2B14', 'stroke-width': 2 }));
    b.appendChild(svg('line', { x1: -6, y1: 0, x2: 6, y2: 0, stroke: '#fff', 'stroke-width': 2 }));
    [-4, 0, 4].forEach(function (lx) { b.appendChild(svg('line', { x1: lx, y1: -3, x2: lx, y2: 3, stroke: '#fff', 'stroke-width': 1.5 })); });
    ball.appendChild(b);
    f.appendChild(ball);
  }
  function nextFirst(y) { return START + 10 * (Math.floor((y - START) / 10) + 1); }
  function place(y) {
    var yy = Math.min(y, TOP);
    ball.style.transform = 'translate(' + xOf(yy) + 'px,150px)';
    markLine.style.transform = 'translate(' + xOf(yy) + 'px,0)';
    markFirst.style.transform = 'translate(' + xOf(Math.min(nextFirst(yy), 100)) + 'px,0)';
    $('rd-svg').setAttribute('aria-label', 'A football field. The ball is on ' + lineLabel(yy) + ' yard line. Field-goal range starts on their ' + (100 - KICK) + '.');
  }

  /* ---------- the drive ---------- */
  function drawHand() {
    var h = $('rd-hand');
    while (h.firstChild) h.removeChild(h.firstChild);
    S.hand.forEach(function (id) {
      var p = byId[id];
      var b = el('button', { type: 'button', 'class': 'rd-card', 'data-play': id });
      b.appendChild(el('span', { 'class': 'rd-cat' }, p.cat));
      b.appendChild(el('strong', null, p.title));
      b.appendChild(el('span', { 'class': 'rd-yds' }, '+' + p.yards + ' yards'));
      b.addEventListener('click', function () { openPlay(id); });
      h.appendChild(b);
    });
  }
  function dealHand() {
    var pool = PLAYS.map(function (p) { return p.id; }).filter(function (i) { return S.done.indexOf(i) < 0; });
    if (pool.length < 3) {
      var last = S.done[S.done.length - 1];
      pool = PLAYS.map(function (p) { return p.id; }).filter(function (i) { return i !== last; });
    }
    S.hand = shuffle(pool).slice(0, 3);
  }
  // How far along the drive is, without football words: about how many small plays are left to score.
  function plainWords(y) {
    if (y >= KICK) return 'In plain words: you’ve done enough small, kind things to score. Press “Kick the field goal”, or keep going.';
    var part = (y - START) / (KICK - START), left = Math.max(1, Math.ceil((KICK - y) / 7));
    var where = part < 0.15 ? 'you’re just getting started' : part < 0.4 ? 'you’re about a third of the way' : part < 0.6 ? 'you’re about halfway' : 'you’re most of the way there';
    var words = ['', 'one', 'two', 'three', 'four', 'five', 'six'];
    return 'In plain words: ' + where + '; about ' + (words[left] || left) + ' more small ' + (left === 1 ? 'play' : 'plays') + ' to score.';
  }
  function renderStatus() {
    var y = S.yards, nf = nextFirst(y);
    $('rd-us').textContent = S.kicked ? '3' : '0';
    $('rd-down').textContent = S.kicked ? 'FIELD GOAL' : (y >= KICK ? 'FIELD-GOAL RANGE' : '1st & ' + Math.max(1, nf - y));
    $('rd-status').textContent = S.kicked ? 'The kick is good.' : 'The ball is on ' + lineLabel(y) + '.';
    $('rd-sub').textContent = S.kicked ? '' : (y >= KICK
      ? 'You’re in field-goal range. Kick now, or call another play for extra yards.'
      : 'First down at ' + lineLabel(nf) + '. Field-goal range starts at ' + lineLabel(KICK) + '.');
    // the same thing in plain words, for anyone who doesn't follow football
    var plain = $('rd-plain');
    if (plain) plain.textContent = S.kicked ? '' : plainWords(y);
    var mine = $('rd-b-mine'), theirs = $('rd-b-theirs');
    mine.className = 'rd-badge' + (S.flags.mine ? ' is-on' : ''); mine.textContent = (S.flags.mine ? '●' : '○') + ' Your context shared';
    theirs.className = 'rd-badge' + (S.flags.theirs ? ' is-on' : ''); theirs.textContent = (S.flags.theirs ? '●' : '○') + ' Their context asked for';
    $('rd-kick').hidden = !(y >= KICK && !S.kicked);
    $('rd-handwrap').hidden = !!S.kicked;
    $('rd-done').hidden = !S.kicked;
    $('rd-total').textContent = S.total ? 'Field goals kicked in this browser: ' + S.total + '. No streaks, just a quiet count.' : '';
    // the log
    var ol = $('rd-log-list');
    while (ol.firstChild) ol.removeChild(ol.firstChild);
    S.done.forEach(function (id) { ol.appendChild(el('li', null, byId[id].title + ' (+' + byId[id].yards + ')')); });
    $('rd-log').hidden = !S.done.length;
  }
  function renderAll() {
    $('rd-setup').hidden = S.started;
    $('rd-game').hidden = !S.started;
    if (!S.started) return;
    drawHand();
    renderStatus();
    place(S.yards);
  }

  function openPlay(id) {
    var p = byId[id], sheet = $('rd-sheet');
    while (sheet.firstChild) sheet.removeChild(sheet.firstChild);
    sheet.appendChild(el('p', { 'class': 'rd-cat' }, p.cat + ' · +' + p.yards + ' yards'));
    sheet.appendChild(el('h3', null, p.title));
    sheet.appendChild(el('p', null, p.how));
    var lab = el('label', { 'for': 'rd-words' }, p.say + ' (change it to sound like you)');
    var ta = el('textarea', { id: 'rd-words', rows: '3' });
    ta.value = lineFor(p, S.who);
    sheet.appendChild(lab); sheet.appendChild(ta);
    var row = el('div', { 'class': 'rd-row' });
    var copy = el('button', { type: 'button', 'class': 'rd-btn' }, 'Copy these words');
    copy.addEventListener('click', function () { copyText(ta.value, copy, 'Copy these words'); });
    var did = el('button', { type: 'button', 'class': 'rd-btn is-primary' }, 'I did it');
    did.addEventListener('click', function () { finishPlay(id); });
    var no = el('button', { type: 'button', 'class': 'rd-btn' }, 'Not today');
    no.addEventListener('click', function () { sheet.hidden = true; $('rd-handwrap').hidden = false; var c = document.querySelector('.rd-card[data-play="' + id + '"]'); if (c) c.focus(); });
    row.appendChild(did); row.appendChild(copy); row.appendChild(no);
    sheet.appendChild(row);
    sheet.appendChild(el('p', { 'class': 'rd-honest' }, 'Do it for real first, then tap “I did it.” The ball moves only when you say so, and “Not today” costs nothing. Words you type here are never saved or sent.'));
    sheet.hidden = false;
    $('rd-handwrap').hidden = true;
    sheet.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'nearest' });
    ta.focus();
  }

  function finishPlay(id) {
    var p = byId[id], before = S.yards;
    S.yards = Math.min(TOP, S.yards + p.yards);
    if (S.done.indexOf(id) < 0) S.done.push(id);
    if (p.flag) S.flags[p.flag] = true;
    var crossed = nextFirst(before) <= S.yards && nextFirst(before) <= 100;
    dealHand();
    $('rd-sheet').hidden = true;
    renderAll();
    var msg = (crossed ? 'First down! ' : '') + 'Good play: ' + p.why;
    $('rd-status').textContent = msg;
    save();
    var c = document.querySelector('.rd-card'); if (c && !S.kicked && S.yards < KICK) c.focus();
    if (S.yards >= KICK && !S.kicked) $('rd-kick-btn').focus();
  }

  function kick() {
    var btn = $('rd-kick-btn'); btn.disabled = true;
    var x0 = xOf(Math.min(S.yards, TOP)), y0 = 150, x1 = 977, y1 = 120;
    var cx = (x0 + x1) / 2, cy = -60, dur = reduced ? 1 : 1500, t0 = null;
    var body = $('rd-ball-body');
    function stepAnim(ts) {
      if (t0 === null) t0 = ts;
      var t = Math.min(1, (ts - t0) / dur), u = 1 - t;
      var x = u * u * x0 + 2 * u * t * cx + t * t * x1;
      var y = u * u * y0 + 2 * u * t * cy + t * t * y1;
      var dx = 2 * u * (cx - x0) + 2 * t * (x1 - cx), dy = 2 * u * (cy - y0) + 2 * t * (y1 - cy);
      ball.style.transition = 'none';
      ball.style.transform = 'translate(' + x + 'px,' + y + 'px)';
      body.setAttribute('transform', 'rotate(' + (Math.atan2(dy, dx) * 180 / Math.PI) + ')');
      if (t < 1) requestAnimationFrame(stepAnim); else landed();
    }
    function landed() {
      ball.style.transition = '';
      S.kicked = true; S.total += 1;
      var both = S.flags.mine && S.flags.theirs;
      var p = $('rd-done-p');
      p.textContent = both
        ? 'The kick is good, and it went through on both sides’ context: you shared yours and asked for theirs. That is what lets two people understand each other. Us 3, the Rut 0.'
        : 'The kick is good. Us 3, the Rut 0. Next drive, try sharing your own side and asking for theirs: context on both sides is what lets two people understand each other.';
      $('rd-done-h').textContent = 'It’s good!';
      renderStatus(); save();
      celebrate();
      $('rd-again').focus();
      btn.disabled = false;
    }
    if (reduced) { ball.style.transform = 'translate(' + x1 + 'px,' + y1 + 'px)'; landed(); } else requestAnimationFrame(stepAnim);
  }

  function celebrate() {
    if (reduced) return;
    var marks = ['❤️', '💛', '💜', '✨'];
    for (var i = 0; i < 14; i++) {
      var h = el('span', { 'class': 'rd-heart', 'aria-hidden': 'true' }, marks[i % marks.length]);
      h.style.left = (8 + Math.random() * 84) + 'vw';
      h.style.bottom = (4 + Math.random() * 14) + 'vh';
      h.style.animationDelay = (Math.random() * 0.8) + 's';
      document.body.appendChild(h);
      (function (n) { setTimeout(function () { if (n.parentNode) n.parentNode.removeChild(n); }, 4200); })(h);
    }
  }

  function copyText(text, btn, label) {
    function done(ok) { if (btn) { btn.textContent = ok ? 'Copied' : 'Select and copy'; setTimeout(function () { btn.textContent = label; }, 1800); } }
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(text).then(function () { done(true); }, function () { fallback(); }); return; }
    } catch (e) { /* fall through */ }
    fallback();
    function fallback() {
      var t = el('textarea', { 'aria-hidden': 'true' }); t.value = text; t.style.position = 'fixed'; t.style.opacity = '0';
      document.body.appendChild(t); t.select();
      var ok = false; try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
      document.body.removeChild(t); done(ok);
    }
  }

  function driveText() {
    var lines = [S.who === 'us' ? 'Our Re-check Drive, together:' : 'My Re-check Drive, for ' + whoName(S.who).toLowerCase() + ':'];
    S.done.forEach(function (id) { lines.push('✓ ' + byId[id].title); });
    lines.push(S.kicked ? 'Field goal: good.' : 'Ball on ' + lineLabel(S.yards) + '.');
    lines.push('From spreadloveandacceptance.com/recheck-drive.html');
    return lines.join('\n');
  }

  function newDrive(keepWho) {
    S.yards = START; S.done = []; S.hand = []; S.kicked = false; S.flags = { mine: false, theirs: false };
    S.started = !!(keepWho && S.who);
    if (S.started) dealHand();
    ball.style.transition = '';
    $('rd-sheet').hidden = true;
    renderAll(); save();
  }

  /* ---------- start up ---------- */
  function init() {
    if (!$('rd')) return;
    var who = $('rd-who');
    WHO.forEach(function (w, i) {
      var l = el('label', { 'class': 'rd-chip' });
      var r = el('input', { type: 'radio', name: 'rd-who', value: w[0] });
      if (i === 0) r.checked = true;
      l.appendChild(r); l.appendChild(el('span', null, w[1]));
      who.appendChild(l);
    });
    load();
    drawField();
    $('rd-start').addEventListener('click', function () {
      var r = document.querySelector('input[name="rd-who"]:checked');
      S.who = r ? r.value : 'self';
      S.started = true; S.yards = START; S.done = []; S.kicked = false; S.flags = { mine: false, theirs: false };
      dealHand(); save(); renderAll();
      $('rd-hand').querySelector('.rd-card').focus();
    });
    $('rd-shuffle').addEventListener('click', function () {
      var cur = S.hand.slice();
      var pool = PLAYS.map(function (p) { return p.id; }).filter(function (i) { return S.done.indexOf(i) < 0 && cur.indexOf(i) < 0; });
      if (pool.length < 3) pool = PLAYS.map(function (p) { return p.id; }).filter(function (i) { return cur.indexOf(i) < 0; });
      S.hand = shuffle(pool).slice(0, 3); save(); drawHand();
    });
    $('rd-kick-btn').addEventListener('click', kick);
    $('rd-copy').addEventListener('click', function () { copyText(driveText(), $('rd-copy'), 'Copy my drive'); });
    $('rd-again').addEventListener('click', function () { newDrive(true); });
    $('rd-reset').addEventListener('click', function () {
      erase(); S = { who: '', yards: START, done: [], hand: [], kicked: false, total: 0, started: false, flags: { mine: false, theirs: false } };
      $('rd-sheet').hidden = true; renderAll();
    });
    if (S.started && !S.hand.length && !S.kicked) dealHand();
    renderAll();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
