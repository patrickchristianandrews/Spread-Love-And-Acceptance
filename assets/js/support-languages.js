/* support-languages.js: the quiz, the result card, the translator and "Work on this together"
   on /support-languages.html. Everything runs on this device.

   Kept on this device (listed on /on-this-device.html)
     localStorage 'tol-support-langs-v1'  { a: [answer index per question, -1 = skipped], at: seconds }
       Your quiz answers, so your top two are there when you come back. "Forget my answers" removes it.
   Sharing: only when you press a button (the site's share sheet, a picture, or a together link from collab.js).
   Nothing is uploaded: a together link carries your top two inside the link itself. */
(function () {
  'use strict';
  var D = document, W = window;
  var KEY = 'tol-support-langs-v1';

  // ------------------------------------------------------------------ the seven support languages
  var L = {
    room:    { name: 'Give me room', tag: 'Time to settle', one: 'time on your own to settle, then coming back',
               ask: 'I need about half an hour on my own to settle. You haven’t done anything wrong. I’ll come find you at 8.',
               offer: 'Take the time you need. I’ll be in the kitchen when you’re ready.',
               looks: 'like being shut out',
               cross: 'being followed, asked again or touched before you’re ready can feel like pressure, and settling takes longer' },
    near:    { name: 'Stay close', tag: 'Company and comfort', one: 'someone nearby, even quietly, and a hug if it’s welcome',
               ask: 'Could you just sit with me for a bit? You don’t have to say anything.',
               offer: 'Want me to stay? I can just be here.',
               looks: 'like crowding, or like being handed a second set of feelings to manage',
               cross: 'someone leaving during a hard moment can feel like being left alone with it' },
    hear:    { name: 'Hear me out', tag: 'Being listened to', one: 'telling the whole story to someone who listens without fixing yet',
               ask: 'I don’t need ideas yet. Can you just listen for five minutes?',
               offer: 'Do you want me to just listen, or help you figure it out?',
               looks: 'like going in circles, or complaining with no wish to solve it',
               cross: 'quick advice can feel like your feelings are a problem to get rid of' },
    think:   { name: 'Help me think', tag: 'A plan and the facts', one: 'the facts, the options and a next step',
               ask: 'Can you help me figure out the next step? Having a plan is what calms me down.',
               offer: 'Want to think it through together? We could write down the options.',
               looks: 'cold or rushed, as if the feelings are being skipped',
               cross: 'long talk about feelings with no next step can make the worry grow' },
    hands:   { name: 'Lend a hand', tag: 'Practical help', one: 'something taken off your plate, done fully and without fuss',
               ask: 'Could you handle dinner tonight? That would help more than anything.',
               offer: 'I’m picking up the kids today. Is there anything else I can take off your plate?',
               looks: 'like taking over, or like a hint that the other person can’t cope',
               cross: '“let me know if you need anything” can feel like no help at all, because now you have to make the plan too' },
    believe: { name: 'Remind me I can', tag: 'Encouragement', one: 'someone naming your strengths and trusting you with it',
               ask: 'Can you remind me I can do this? I’m doubting myself.',
               offer: 'You’ve handled hard things before. I know you can handle this.',
               looks: 'like being hurried past the hard part',
               cross: 'a lot of dwelling on the problem can feel like everyone thinks it’s hopeless' },
    shift:   { name: 'Help me shift gears', tag: 'Moving, doing, lightening up', one: 'a walk, a task, a game or a laugh, then talking',
               ask: 'I need to walk this off first. Come with me? We can talk on the way.',
               offer: 'Want to get some air, or watch something silly for a bit?',
               looks: 'like avoiding the subject, or not caring',
               cross: 'being asked to sit still and talk while your body is buzzing can feel impossible' }
  };
  var ORDER = ['room', 'near', 'hear', 'think', 'hands', 'believe', 'shift'];

  // bridges for the pairs that clash most often (either order)
  var BRIDGE = {
    'near|room': 'Agree on a time. The one who needs room says when they’ll be back, and the one who needs closeness gets a quick hug or a kind text to hold on to. “Still here, no rush” bridges the gap.',
    'hear|think': 'Ask first: “Listen, or help?” Listening first and ideas second usually works for both of you.',
    'hear|shift': 'Walk and talk. Side by side, moving, with the talking happening on the way.',
    'believe|hear': 'Hear the hard part first. Add the encouragement once it has all been said.',
    'believe|hands': 'Ask before stepping in: “Do you want me to take this, or do it yourself with me nearby?”',
    'hear|room': 'Room first, then a set time to talk it all through. Say the time out loud so nobody is left guessing.',
    'near|shift': 'Do the moving thing together: a walk, cooking, a game, a drive.',
    'hands|think': 'Make the plan together, then split who does what.',
    'room|shift': 'You both settle by stepping out of the moment. Say what you’re doing (“going for a walk, back by 6”) so it doesn’t look like leaving.',
    'hands|near': 'Do the helpful thing in the same room, so it comes with company.',
    'believe|think': 'Plan the next step together, then say out loud why you think they can do it.'
  };
  function pairKey(a, b) { return [a, b].sort().join('|'); }

  // ------------------------------------------------------------------ the questions
  // each answer names the language it counts toward; every language appears in five or six questions
  var Q = [
    ['After a really hard day, the first thing I want when I get home is…', [
      ['room', 'Half an hour to myself before anyone talks to me.'],
      ['near', 'Someone to hug, or just to be in the same room with.'],
      ['hear', 'To tell someone the whole story.'],
      ['shift', 'To do something normal: cook, play a game, watch something funny.']]],
    ['I just got bad news. The most helpful reply from a friend would be…', [
      ['hear', '“That’s awful. Tell me what happened.”'],
      ['think', '“Okay. What are your options? Let’s look.”'],
      ['believe', '“You’ve gotten through hard things before. You’ll get through this.”'],
      ['near', '“Do you want me to come over?”']]],
    ['I’m overwhelmed by everything on my list. What helps most?', [
      ['hands', 'Someone takes one whole task off my plate.'],
      ['think', 'Someone helps me put it in order and pick what comes first.'],
      ['shift', 'A break doing something with my hands or body, then I start again.'],
      ['room', 'Quiet, with no one asking me questions.']]],
    ['When I’m upset and someone asks “What’s wrong?” I usually…', [
      ['room', 'Need them to wait. I’ll talk once I’ve settled.'],
      ['hear', 'Feel relieved. I want to be asked.'],
      ['near', 'Want them to stay, even if I can’t explain yet.'],
      ['shift', 'Would rather they took my mind off it for a while.']]],
    ['A friend wants to help me through a stressful week. I’d most love them to…', [
      ['hands', 'Bring dinner or run an errand for me.'],
      ['believe', 'Send a message saying they’re proud of me and know I can do it.'],
      ['near', 'Check in each day, just to say they’re thinking of me.'],
      ['think', 'Help me make a plan for the week.']]],
    ['When I’m worried about something coming up (an exam, a hard talk, a doctor’s visit)…', [
      ['think', 'I calm down once I know the facts and have a plan.'],
      ['believe', 'I calm down when someone reminds me what I’m good at.'],
      ['hear', 'I calm down once I’ve said all my worries out loud.'],
      ['shift', 'I calm down when I stop thinking about it and do something else.']]],
    ['After an argument, what helps me settle?', [
      ['room', 'Time apart first, then talking.'],
      ['near', 'Staying close, even sitting quietly together.'],
      ['shift', 'A walk, a shower, tidying up, something physical.'],
      ['hands', 'A small practical kindness, like a cup of tea made for me, without needing words.']]],
    ['Which of these sounds most like a hard time I’ve had?', [
      ['hear', 'I felt better once someone really listened.'],
      ['hands', 'I felt better once someone stepped in and handled things.'],
      ['believe', 'I felt better once someone said, “I believe in you.”'],
      ['room', 'I felt better once I had time alone to sort out my head.']]],
    ['Someone I love sees me crying. I’d want them to…', [
      ['near', 'Sit beside me and put an arm around me, if I want it.'],
      ['room', 'Give me a minute alone and then come back.'],
      ['hear', 'Ask gently what’s going on, and listen.'],
      ['believe', 'Remind me that I’m going to be okay.']]],
    ['When work or school is going badly, the support I’d use most is…', [
      ['think', 'Someone who’ll help me figure out what to do.'],
      ['hands', 'Someone who’ll take something else off my plate so I have time.'],
      ['believe', 'Someone who reminds me of what I’ve already done well.'],
      ['shift', 'Someone who gets me out of my head, like a walk or a game.']]]
  ];
  var APPEAR = {}; ORDER.forEach(function (k) { APPEAR[k] = 0; });
  Q.forEach(function (q) { q[1].forEach(function (o) { APPEAR[o[0]]++; }); });
  var MIN_ANSWERED = 6;

  // ------------------------------------------------------------------ small helpers
  function $(id) { return D.getElementById(id); }
  function mk(tag, attrs, kids) {
    var e = D.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      if (k === 'text') e.textContent = attrs[k];
      else if (k === 'cls') e.className = attrs[k];
      else e.setAttribute(k, attrs[k]);
    });
    (kids || []).forEach(function (c) { if (c == null) return; e.appendChild(typeof c === 'string' ? D.createTextNode(c) : c); });
    return e;
  }
  function lsGet() { try { var v = JSON.parse(W.localStorage.getItem(KEY) || 'null'); return v && Array.isArray(v.a) ? v : null; } catch (e) { return null; } }
  function lsSet(v) { try { if (v) W.localStorage.setItem(KEY, JSON.stringify(v)); else W.localStorage.removeItem(KEY); } catch (e) {} }
  function reduced() { try { return W.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } }
  function say(el, t) { el.textContent = ''; setTimeout(function () { el.textContent = t; }, 30); }

  // ------------------------------------------------------------------ scoring (plain data, testable)
  function score(answers) {
    var picks = {}, seen = {}, n = 0;
    ORDER.forEach(function (k) { picks[k] = 0; seen[k] = 0; });
    answers.forEach(function (ai, qi) {
      if (ai == null || ai < 0 || !Q[qi] || !Q[qi][1][ai]) return;
      n++;
      Q[qi][1].forEach(function (o) { seen[o[0]]++; });
      picks[Q[qi][1][ai][0]]++;
    });
    // a share of the times each language was on offer, so no language wins just by appearing more often
    var list = ORDER.map(function (k, i) { return { k: k, i: i, picks: picks[k], v: seen[k] ? picks[k] / seen[k] : 0 }; });
    list.sort(function (a, b) { return (b.v - a.v) || (b.picks - a.picks) || (a.i - b.i); });
    return { n: n, list: list };
  }
  W.TOLSupportLangs = { score: score, L: L, ORDER: ORDER, Q: Q };

  // ------------------------------------------------------------------ the quiz form
  var form = $('sl-quiz'), box = $('sl-qs'), out = $('sl-result'), msg = $('sl-msg'), prog = $('sl-progress');
  if (!form || !box || !out) return;
  box.textContent = '';
  Q.forEach(function (q, qi) {
    var fs = mk('fieldset', { cls: 'sl-q' });
    fs.appendChild(mk('legend', {}, [mk('span', { cls: 'sl-n', text: (qi + 1) + ' of ' + Q.length }), q[0]]));
    var opts = mk('div', { cls: 'sl-opts' });
    q[1].forEach(function (o, oi) {
      var id = 'sl-q' + qi + '-' + oi;
      opts.appendChild(mk('label', { for: id }, [mk('input', { type: 'radio', name: 'q' + qi, id: id, value: String(oi) }), mk('span', { text: o[1] })]));
    });
    fs.appendChild(opts);
    box.appendChild(fs);
  });
  function answers() {
    return Q.map(function (q, qi) { var c = form.querySelector('input[name="q' + qi + '"]:checked'); return c ? +c.value : -1; });
  }
  function setAnswers(a) {
    Q.forEach(function (q, qi) {
      Array.prototype.forEach.call(form.querySelectorAll('input[name="q' + qi + '"]'), function (r) { r.checked = a && +r.value === a[qi]; });
    });
    progress();
  }
  function progress() {
    var n = answers().filter(function (x) { return x >= 0; }).length;
    prog.textContent = n + ' of ' + Q.length + ' answered';
  }
  form.addEventListener('change', function () { progress(); });

  var current = null; // the latest result: { top:[k,k], list, n }
  function showResult(res, focus) {
    var top = res.list.slice(0, 2), third = res.list[2];
    current = { top: [top[0].k, top[1].k], list: res.list, n: res.n };
    out.textContent = '';
    out.appendChild(mk('h3', { text: 'Your top two: “' + L[top[0].k].name + '” and “' + L[top[1].k].name + '”' }));
    var grid = mk('div', { cls: 'sl-top' });
    top.forEach(function (t, i) {
      var d = L[t.k];
      grid.appendChild(mk('div', { cls: 'sl-c-' + t.k }, [
        mk('p', { cls: 'sl-rank', text: i === 0 ? 'Most like you' : 'Next most like you' }),
        mk('p', {}, [mk('strong', { text: d.name })]),
        mk('p', { text: 'What helps: ' + d.one + '.' }),
        mk('p', { text: 'You could say: “' + d.ask + '”' })
      ]));
    });
    out.appendChild(grid);
    if (third && third.v === top[1].v && third.v > 0) out.appendChild(mk('p', { cls: 'sl-small', text: 'Also just as close: ' + L[third.k].name + '. You lean on more than two, which is common.' }));

    out.appendChild(mk('h4', { text: 'How it might be misread' }));
    var ul = mk('ul');
    top.forEach(function (t) { ul.appendChild(mk('li', { text: 'To someone who settles differently, ' + q(L[t.k].name) + ' can look ' + L[t.k].looks + '. To you, help in their language can miss too: ' + L[t.k].cross + '. Saying what you need on a calm day heads both off.' })); });
    out.appendChild(ul);

    out.appendChild(mk('h4', { text: 'All seven, for you right now' }));
    var bars = mk('ul', { cls: 'sl-bars', 'aria-label': 'All seven support languages, most like you first' });
    res.list.forEach(function (t) {
      var pct = Math.round(t.v * 100);
      bars.appendChild(mk('li', { cls: 'sl-c-' + t.k }, [mk('span', { text: L[t.k].name }),
        mk('span', { cls: 'sl-bar', role: 'img', 'aria-label': t.picks + ' of ' + APPEAR[t.k] + ' times you could pick it' }, [mk('span', { style: 'width:' + Math.max(pct, 3) + '%' })])]));
    });
    out.appendChild(bars);
    out.appendChild(mk('p', { cls: 'sl-small', text: 'This is how you lean right now, and it can change with the kind of stress, the day and the person. Based on ' + res.n + ' of ' + Q.length + ' answers.' }));

    // the share card
    out.appendChild(mk('h4', { text: 'Share it with someone close' }));
    var wrap = mk('div', { cls: 'sl-share' });
    var ta = mk('textarea', { id: 'sl-card-text', rows: '8', 'aria-label': 'Your support languages, as text you can copy or share' });
    ta.value = cardText();
    wrap.appendChild(ta);
    var row = mk('p', { cls: 'sl-row' });
    var bShare = mk('button', { type: 'button', cls: 'sl-btn', text: 'Share my result' });
    var bCopy = mk('button', { type: 'button', cls: 'sl-btn is-quiet', text: 'Copy it' });
    var bPic = mk('button', { type: 'button', cls: 'sl-btn is-quiet', text: 'Save as a picture' });
    [bShare, bCopy, bPic].forEach(function (b) { row.appendChild(b); });
    wrap.appendChild(row);
    var st = mk('p', { cls: 'sl-msg', role: 'status' });
    wrap.appendChild(st);
    out.appendChild(wrap);
    bShare.addEventListener('click', function () {
      var K = W.TOLShareKit;
      if (K && K.shareText) { K.shareText({ title: 'My support languages', text: ta.value, url: location.origin + '/support-languages.html', heading: 'Share your support languages' }); return; }
      if (navigator.share) { navigator.share({ title: 'My support languages', text: ta.value }).catch(function () {}); return; }
      copy(ta, st);
    });
    bCopy.addEventListener('click', function () { copy(ta, st); });
    bPic.addEventListener('click', function () {
      var K = W.TOLShareKit;
      if (!K || !K.saveImage) { say(st, 'The picture maker is still loading. Try again in a moment.'); return; }
      K.saveImage({ title: 'My support languages', text: pictureText(), url: location.origin + '/support-languages.html', format: 'square' })
        .then(function () { say(st, 'Saved as a picture. Look in your downloads.'); }, function () { say(st, 'The picture couldn’t be made on this device. Copy the text instead.'); });
    });

    out.appendChild(mk('p', { cls: 'sl-small' }, ['Next: ', mk('a', { href: '#translate', text: 'translate between yours and theirs' }), ', or send it to them below so you can see both side by side.']));
    out.hidden = false;
    if (focus) {
      try { out.focus({ preventScroll: true }); } catch (e) { out.focus(); }
      try { out.scrollIntoView({ behavior: reduced() ? 'auto' : 'smooth', block: 'start' }); } catch (e2) { out.scrollIntoView(); }
    }
    // the translator starts from your top language
    var me = $('sl-me'); if (me && !me.dataset.touched) { me.value = top[0].k; translate(); }
    drawBetween();
  }
  function cardText() {
    if (!current) return '';
    var a = L[current.top[0]], b = L[current.top[1]];
    return ['My support languages: what helps me when I’m having a hard time',
      '1. ' + a.name + ': ' + a.one + '.',
      '2. ' + b.name + ': ' + b.one + '.',
      '', 'You could say to me: “' + a.offer + '”',
      '', 'What helps you? Find yours at spreadloveandacceptance.com/support-languages.html'].join('\n');
  }
  function pictureText() {
    var a = L[current.top[0]], b = L[current.top[1]];
    return 'When I’m having a hard time, what helps most:\n1. ' + a.name + '\n2. ' + b.name + '\n\nYou could say: “' + a.offer + '”';
  }
  function copy(ta, st) {
    function done() { say(st, 'Copied. Share it whenever you’re ready.'); }
    function fallback() { ta.focus(); ta.select(); try { D.execCommand('copy'); done(); } catch (e) { say(st, 'Select the text and copy it with your device’s copy command.'); } }
    if (navigator.clipboard && W.isSecureContext) navigator.clipboard.writeText(ta.value).then(done, fallback); else fallback();
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var a = answers(), res = score(a);
    if (res.n < MIN_ANSWERED) {
      say(msg, 'Answer at least ' + MIN_ANSWERED + ' questions first (' + res.n + ' so far). Pick the closest one, even if none fits perfectly.');
      try { var first = form.querySelector('fieldset.sl-q:not(:has(input:checked)) input'); if (first) first.focus(); } catch (er) {}
      return;
    }
    say(msg, '');
    lsSet({ a: a, at: Math.floor(Date.now() / 1000) });
    showResult(res, true);
    if (ctl) ctl.changed();
  });
  $('sl-forget').addEventListener('click', function () {
    lsSet(null); setAnswers(null); current = null;
    out.hidden = true; out.textContent = '';
    say(msg, 'Your answers are forgotten on this device.');
    drawBetween();
    if (ctl) ctl.changed();
  });

  // ------------------------------------------------------------------ the translator
  var selMe = $('sl-me'), selThem = $('sl-them'), trans = $('sl-trans');
  function fillSelect(sel) {
    sel.appendChild(mk('option', { value: '', text: 'Choose one' }));
    ORDER.forEach(function (k) { sel.appendChild(mk('option', { value: k, text: L[k].name })); });
  }
  function q(s) { return '“' + s + '”'; }
  function translation(a, b) {
    // a: mine, b: theirs. Returns a list of paragraphs (plain text, or { k, say } for a line to use).
    var A = L[a], B = L[b];
    if (a === b) return [
      'You both reach for ' + q(A.name) + '. That makes you easy for each other to read.',
      'The hard moment is when you’re both stressed at once and need the same thing at the same time. Decide who goes first, and take turns.',
      { say: A.offer }];
    var p = [
      'When you’re stressed, you reach for ' + q(A.name) + ': ' + A.one + '. When they’re stressed, they reach for ' + q(B.name) + ': ' + B.one + '.',
      'To them, your ' + q(A.name) + ' can look ' + A.looks + '. To you, their ' + q(B.name) + ' can look ' + B.looks + '.',
      'Neither way is wrong. They are settling in their own way, and so are you.'
    ];
    var br = BRIDGE[pairKey(a, b)];
    p.push('One way to give you both what helps: ' + (br || 'say yours on a calm day, ask for theirs, and take turns. Whoever is more overwhelmed goes first.'));
    p.push({ k: 'To ask for yours', say: A.ask });
    p.push({ k: 'To offer theirs', say: B.offer });
    return p;
  }
  function renderParas(el, paras) {
    paras.forEach(function (x) {
      if (typeof x === 'string') el.appendChild(mk('p', { text: x }));
      else { if (x.k) el.appendChild(mk('p', {}, [mk('strong', { text: x.k })])); el.appendChild(mk('p', { cls: 'sl-say', text: '“' + x.say + '”' })); }
    });
  }
  function translate() {
    if (!selMe || !trans) return;
    var a = selMe.value, b = selThem.value;
    trans.textContent = '';
    if (!a || !b) { trans.appendChild(mk('p', { cls: 'sl-small', text: 'Choose two languages to see the translation.' })); return; }
    renderParas(trans, translation(a, b));
  }
  if (selMe && selThem) {
    fillSelect(selMe); fillSelect(selThem);
    selMe.addEventListener('change', function () { selMe.dataset.touched = '1'; translate(); });
    selThem.addEventListener('change', function () { selThem.dataset.touched = '1'; translate(); });
  }

  // ------------------------------------------------------------------ restore saved answers
  var saved = lsGet();
  if (saved) {
    setAnswers(saved.a);
    var r0 = score(saved.a);
    if (r0.n >= MIN_ANSWERED) showResult(r0, false);
  } else progress();

  // ------------------------------------------------------------------ work on this together (collab.js)
  var ctl = null, between = null;
  function mine() {
    if (!current) return {};
    return { top: q(L[current.top[0]].name) + ', then ' + q(L[current.top[1]].name),
             order: current.list.map(function (t) { return L[t.k].name; }).join(', '),
             k: current.top.slice(), a: answers() };
  }
  function validTop(k) { return Array.isArray(k) && k.length === 2 && k.every(function (x) { return typeof x === 'string' && L.hasOwnProperty(x); }); }
  function drawBetween(envParts) {
    if (!between) return;
    between.textContent = '';
    var parts = envParts || (ctl && ctl.others ? ctl.others() : []);
    parts = parts.filter(function (p) { return p && p.d && validTop(p.d.k); });
    if (!parts.length) { between.hidden = true; return; }
    between.hidden = false;
    parts.forEach(function (p) {
      var name = (p.n || 'They').slice(0, 40);
      var sec = mk('div', { cls: 'sl-trans' });
      sec.appendChild(mk('h4', { text: 'Between you and ' + name }));
      sec.appendChild(mk('p', { text: name + '’s top two: ' + q(L[p.d.k[0]].name) + ', then ' + q(L[p.d.k[1]].name) + '.' }));
      if (!current) { sec.appendChild(mk('p', { cls: 'sl-small', text: 'Answer the questions above to see how yours and theirs fit together.' })); between.appendChild(sec); return; }
      renderParas(sec, translation(current.top[0], p.d.k[0]).slice(0, 4));
      sec.appendChild(mk('p', { cls: 'sl-say', text: 'To offer ' + name + ' theirs: “' + L[p.d.k[0]].offer + '”' }));
      between.appendChild(sec);
    });
  }
  function attach() {
    var C = W.TOLCollab, mount = $('sl-together');
    if (!C || !C.attach || !mount) return;
    ctl = C.attach({ tool: 'support-langs', page: '/support-languages.html', mount: mount,
      title: ['our support languages'],
      lede: 'Each of you answers the questions on your own phone and sends your top two. Opening theirs shows both side by side, with how your languages fit together.',
      fields: [{ k: 'top', en: 'Top two' }, { k: 'order', en: 'All seven, most like them first' }],
      mine: mine,
      isBlank: function () { return !current; },
      fill: function (d) { if (d && Array.isArray(d.a) && d.a.length === Q.length && !current) { setAnswers(d.a.map(function (x) { return typeof x === 'number' ? x : -1; })); var r = score(answers()); if (r.n >= MIN_ANSWERED) { lsSet({ a: answers(), at: Math.floor(Date.now() / 1000) }); showResult(r, false); } } },
      next: function () { return 'This week, each try offering the other their top language once.'; },
      // the env handed over here holds only the others' parts (collab.js keeps yours in the form)
      onMerge: function (env) { drawBetween(Object.keys((env && env.p) || {}).map(function (id) { return { n: env.p[id].n, d: env.p[id].d }; })); } });
    between = mk('div', { cls: 'sl-between', hidden: '' });
    mount.insertBefore(between, mount.firstChild);
    drawBetween();
  }
  attach();
})();
