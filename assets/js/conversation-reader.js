/* conversation-reader.js — the page for /conversation-reader.html
   Uses TOLReader (conversation-reader-engine.js). Runs only in the browser:
   nothing here saves, stores or sends what people paste. */
(function () {
  'use strict';
  var R = window.TOLReader;
  if (!R) return;

  var EXAMPLE = [
    'Sam: hey, are we still on for Saturday? I was thinking the lake',
    'Alex: maybe, I\'ll let you know later',
    'Sam: you said that last week. When will you know?',
    'Alex: I SAID later. Why do you always do this??',
    'Sam: I\'m not trying to start anything. I\'m just tired of not knowing the plan',
    'Alex: whatever. you never notice anything I do',
    'Sam: that\'s not fair. Remember when I planned the whole trip last month?',
    'Alex: wow, thanks a lot for keeping score',
    'Sam: ok I\'m sorry, I didn\'t mean it like that. Can we talk tonight?',
    'Alex: fine.'
  ].join('\n');

  var FORMS = [['text', 'Text or chat'], ['email', 'Email'], ['person', 'In person, from memory'], ['phone', 'Phone call, from memory']];
  var ORDER = ['hostile', 'swear', 'verdict', 'dig', 'contempt', 'sarcasm', 'passive', 'compare', 'absolute', 'dismiss', 'defend', 'brushaside', 'withdraw', 'pointed', 'hint', 'opener', 'demand', 'history', 'shouting', 'vague', 'short', 'turnaway', 'need', 'repair', 'pause', 'warmth', 'feeling', 'ask'];
  var GOOD = { repair: 1, pause: 1, warmth: 1, feeling: 1, ask: 1 };
  if (window.TOLPatterns) window.TOLPatterns.lookFor(document.getElementById('cr-lookfor'));

  var $ = function (id) { return document.getElementById(id); };
  var input = $('cr-input'), out = $('cr-out'), draftStep = $('cr-draft-step'), draft = $('cr-draft'), draftOut = $('cr-draft-out');
  var state = null;   // { turns, speakers, format, me, form }

  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function snip(t, n) { t = String(t).replace(/\s+/g, ' ').trim(); n = n || 80; return t.length > n ? t.slice(0, n - 3).replace(/\s\S*$/, '') + '…' : t; }
  function plural(n, w) { return n + ' ' + w + (n === 1 ? '' : 's'); }
  // Notes and the "Which one is you?" step go in their own box above the read, so #cr-out only ever
  // holds a full read (the "What you got from this" line and the garden level wait for that)
  function pre(html) {
    var el = $('cr-pre');
    if (!el) { if (!html) return null; el = document.createElement('div'); el.id = 'cr-pre'; out.parentNode.insertBefore(el, out); }
    el.innerHTML = html || '';
    if (html) out.innerHTML = '';
    return el;
  }

  // ---------- Reading ----------
  function start(text) {
    var p = R.parse(text);
    if (p.turns.length < 2) {
      pre('<p class="cr-note" role="alert" style="margin-top:1.5rem!important;">Paste at least two messages, so there’s a back-and-forth to read.</p>');
      draftStep.hidden = true;
      return;
    }
    // Only guess who "you" are when the paste says so ("Me:", "You:"). Otherwise, ask.
    var guess = p.speakers.filter(function (s) { return /^(me|you|i|myself)$/i.test(s); })[0] || null;
    if (!guess && p.speakers.length === 1) guess = p.speakers[0];
    state = { turns: p.turns, speakers: p.speakers, format: p.format, me: guess, form: p.format === 'email' ? 'email' : 'text' };
    if (state.me) render(true); else askWho();
  }

  // Names were found, but nothing says which one is you: ask before reading
  function askWho() {
    var FMT = { 'chat app': 'a chat app like Slack or Teams', 'chat export': 'a chat export', 'named lines': 'names at the start of lines', email: 'an email thread' };
    var h = '<section class="cr-step cr-who cr-ask" aria-labelledby="cr-s2">' +
      '<h2 id="cr-s2"><span>02</span>Which one is you?</h2>' +
      '<p class="cr-hint">The Reader found ' + plural(state.speakers.length, 'name') + (FMT[state.format] ? ' (it looks like ' + FMT[state.format] + ')' : '') +
      '. Pick yourself, so it can show what the others may be hearing from you, and the other way round.</p><div class="cr-chips cr-pick">';
    state.speakers.forEach(function (s, i) {
      var n = state.turns.filter(function (t) { return t.who === s; }).length;
      h += '<button type="button" class="cr-btn is-quiet" data-pick="' + i + '">' + esc(s) + ' <small>(' + plural(n, 'message') + ')</small></button>';
    });
    h += '</div><p class="cr-note">Not in this conversation yourself? Pick the person you want to understand better.</p></section>';
    var box = pre(h);
    draftStep.hidden = true;
    box.querySelectorAll('[data-pick]').forEach(function (b) {
      b.addEventListener('click', function () { state.me = state.speakers[+b.getAttribute('data-pick')]; render(true); });
    });
    var first = box.querySelector('[data-pick]');
    if (first) { var sec = box.querySelector('.cr-ask'); if (sec && sec.scrollIntoView) sec.scrollIntoView({ behavior: 'smooth', block: 'start' }); first.focus({ preventScroll: true }); }
  }

  // a tidy drop-down: a title (with an optional little count) that opens to show more
  function drop(title, body, open, count, cls) {
    return '<details class="cr-drop' + (cls ? ' ' + cls : '') + '"' + (open ? ' open' : '') + '><summary><span class="cr-drop-t">' + title + '</span>' +
      (count ? '<span class="cr-drop-n">' + count + '</span>' : '') + '</summary><div class="cr-drop-b">' + body + '</div></details>';
  }

  function render(scroll) {
    // what was typed into "Add context" helps name a tentative topic ("he missed our call")
    var ctxText = ''; try { ctxText = ctxPanel && ctxPanel.get ? JSON.stringify(ctxPanel.get()) : ''; } catch (e) {}
    var r = R.read(state.turns, state.me, state.form, { ctxText: ctxText });
    var others = state.speakers.filter(function (s) { return s !== state.me; });
    var them = others.length === 1 ? others[0] : (others.length ? 'the others' : 'them');
    var html = '';

    // 02 Who's who, and how it happened
    var s2 = '';
    s2 += '<p class="cr-hint">Which one is you?</p><div class="cr-chips" role="radiogroup" aria-label="Which one is you">';
    state.speakers.forEach(function (s, i) {
      s2 += '<label class="cr-chip"><input type="radio" name="cr-me" value="' + i + '"' + (s === state.me ? ' checked' : '') + '><span>' + esc(s) + '</span></label>';
    });
    s2 += '</div>';
    if (state.format === 'unlabelled') html += '<p class="cr-note">There were no names in the paste, so the Reader assumed the messages take turns between two people. If it got someone wrong, tap the name above that message to switch it.</p>';
    s2 += '<p class="cr-hint" style="margin-top:1rem!important;">How did this conversation happen?</p><div class="cr-chips" role="radiogroup" aria-label="How it happened">';
    FORMS.forEach(function (f) {
      s2 += '<label class="cr-chip"><input type="radio" name="cr-form" value="' + f[0] + '"' + (f[0] === state.form ? ' checked' : '') + '><span>' + f[1] + '</span></label>';
    });
    s2 += '</div>';
    var formName = ({ text: 'by text', email: 'by email', person: 'in person', phone: 'on the phone' })[state.form];
    html += '<section class="cr-step cr-who" aria-labelledby="cr-s2">' +
      drop('<span class="cr-num">02</span><span id="cr-s2">Who’s who, and how it happened</span>', s2, state.format === 'unlabelled', esc('You: ' + state.me + ' · ' + formName)) + '</section>';

    // Threats or control: no rewording makes those okay
    // context typed into "Add context" is read for crisis and fear too, and never ignored
    var cx = ctxRead(r, them);
    if (cx && cx.safety === 'crisis') html += '<section class="cr-safety" role="alert"><p><strong>' + esc(cx.notes[0].text) + '</strong> <a href="/outside-help.html">Help beyond this site</a></p></section>';
    if (r.safety || (cx && (cx.safety === 'fear' || cx.safety === 'threat'))) {
      html += '<section class="cr-safety" role="alert" aria-labelledby="cr-safe"><h2 id="cr-safe">Step away from this one</h2>' +
        '<p>Something here may be more than a wording problem: a threat, or checking up on someone or cutting them off, or someone feeling afraid. Better wording can’t fix that, and the Reader can’t judge it properly. One conversation can’t tell you what a relationship is like. If messages like this leave you feeling afraid or cut off, free and private support is there. It’s okay to step away.</p>' +
        '<p>If someone is hurting, threatening, watching or controlling you, it isn’t your fault. In the US, the National Domestic Violence Hotline is free and private: call 1-800-799-7233 or text START to 88788. Elsewhere, findahelpline.com lists free lines. If you’re in danger right now, call 911 or your local emergency number.</p>' +
        '<p><a href="/safety.html">Not safe at home?</a> <button type="button" class="cr-btn is-quiet is-small" data-tol-exit>Leave this site quickly</button></p></section>';
    }

    // 03 The read
    html += '<section class="cr-step" aria-labelledby="cr-s3"><h2 id="cr-s3"><span>03</span>The read</h2>';
    html += '<div class="cr-summary">' + summary(r, them) + chart(r) + '</div>';
    if (window.TOLContext) html += TOLContext.usedHTML(cx) + '<div class="tol-clar" id="cr-clar" hidden></div>';
    // what the context changes: moves for "it keeps coming back" and for what you want, first
    if (cx && !cx.empty && !r.safety && r.next) r.next = ctxMoves(cx, them).concat(r.next);

    // How to respond (not for a thread that reads as threats or control: there, no advice on wording)
    if (r.next && r.next.length && !r.safety) {
      var mv = '<ol class="cr-moves">';
      r.next.forEach(function (m, i) {
        mv += '<li' + (i === 0 ? ' class="is-first"' : '') + '><h3>' + esc(m.title) + '</h3><p>' + esc(m.say) + '</p>' +
          (m.script ? '<div class="cr-script"><q>' + esc(m.script) + '</q><button type="button" class="cr-btn is-quiet is-small" data-copy="' + esc(m.script) + '">Copy</button></div>' : '') +
          (m.dig ? '<a class="dig" href="' + m.dig[0] + '">Dig deeper: ' + esc(m.dig[1]) + '</a>' : '') + '</li>';
      });
      mv += '</ol>';
      if (r.drafts && r.drafts.length) {
        mv += '<h3 style="margin-top:1.1rem;">Replies you could send, built from this conversation</h3><ul class="cr-drafts">';
        r.drafts.filter(function (d) { return !(d.label === 'Own your part' && r.owns && r.owns.length); }).forEach(function (d) {
          mv += '<li><span class="cr-dl">' + esc(d.label) + '</span><div class="cr-script"><q>' + esc(d.text) + '</q><button type="button" class="cr-btn is-quiet is-small" data-copy="' + esc(d.text) + '">Copy</button></div></li>';
        });
        mv += '</ul>';
      }
      if (r.owns && r.owns.length) {
        mv += '<h3 style="margin-top:1.1rem;">Each side’s part</h3><p class="cr-hint">' + (r.owns.length > 1 ? 'Both of you said something that may have added heat. Owning your own line first makes it easier for the other person to own theirs.' : 'One line that may have added heat, and a way to own it. The other side may still have their own part that the words don’t show.') + '</p><ul class="cr-drafts">';
        r.owns.forEach(function (o) {
          var part = esc(o.mine ? 'Your part' : o.who + '’s part') + ' · ' + esc(o.label || R.KINDS[o.kind].label.toLowerCase());
          mv += '<li><span class="cr-dl">' + (o.asked ? esc(o.mine ? 'What you asked for' : 'What ' + o.who + ' asked for') + ': “' + esc(o.asked) + '” · ' + part.replace(/^Your part/, 'your part') : part) + '</span><div class="cr-script"><q>' + esc(o.script) + '</q>' + (o.mine ? '<button type="button" class="cr-btn is-quiet is-small" data-copy="' + esc(o.script) + '">Copy</button>' : '') + '</div></li>';
        });
        mv += '</ul>' + (r.owns.some(function (o) { return !o.mine; }) ? '<p class="cr-note">Their part is theirs to say. It’s here so the read stays fair, not to send to them.</p>' : '');
      }
      mv += '<p class="cr-note">Change anything in [square brackets] to fit. Short beats perfect.</p>';
      html += drop('How to respond', mv, true, '', 'is-key');
    }

    // The form it happened in
    html += drop('Because this was ' + formName, '<p>' + formAdvice(state.form, r) + '</p>', false);

    // Message by message
    var th = '<p class="cr-hint">Marked words show what may have added heat, and what helped. Tap “What they may hear” under a message for more.</p><ol class="cr-thread">';
    r.turns.forEach(function (t, i) { th += bubble(r, t, i); });
    html += drop('Message by message', th + '</ol>', false, plural(r.turns.length, 'message'));

    // Patterns on each side
    var pt = r.safety ? '' : patterns(r, them);
    if (pt) html += drop('Patterns in the chat', pt, false);

    // Other things worth noticing
    var notes = [];
    r.missedRepairs.forEach(function (x) {
      var a = r.turns[x.at], b = r.turns[x.reply];
      notes.push('<strong>A reach-out that wasn’t taken.</strong> ' + esc(a.who) + ' tried to cool things down (“' + esc(snip(a.text, 70)) + '”) and the reply stayed hot (“' + esc(snip(b.text, 50)) + '”). Noticing these is one of the most useful things you can do.');
    });
    r.unanswered.forEach(function (u) {
      var t = r.turns[u.at];
      // "they always write short": a one-word reply is how they text, not a brush-off
      if (u.flat && cx && cx.flags.shortStyle) { notes.push('<strong>A short reply.</strong> ' + esc(t.who) + ' asked “' + esc(snip(u.q, 90)) + '” and the reply was “' + esc(snip(u.flat, 20)) + '”. You said they usually write short, so this is probably how they text, not a brush-off. If the answer matters, ask once more, kindly.'); return; }
      notes.push('<strong>A question that may not have been answered.</strong> ' + esc(t.who) + ' asked “' + esc(snip(u.q, 90)) + '”' + (u.open ? ' and it’s still open.' : u.flat ? ', and the reply was only “' + esc(snip(u.flat, 20)) + '”. A one-word reply can mean yes, or “I’m upset”, so it’s worth checking which.' : ', and the reply went somewhere else.'));
    });
    (r.literal || []).forEach(function (x) {
      var a = r.turns[x.at], b = r.turns[x.reply];
      notes.push('<strong>A figure of speech taken at its word.</strong> ' + esc(a.mine ? 'You' : a.who) + ' said “' + esc(x.phrase) + '”, which usually means ' + esc(x.means) + '. The reply (“' + esc(snip(b.text, 50)) + '”) read it literally. That’s a fair reading of the words; saying the plain meaning avoids it.');
    });
    r.drift.forEach(function (i) {
      notes.push('<strong>Another topic came in</strong> at message ' + (i + 1) + ' (“' + esc(snip(r.turns[i].text, 60)) + '”). Sticking to one topic at a time makes it easier to answer.');
    });
    r.bids.forEach(function (b) {
      var a = r.turns[b.at], c = r.turns[b.reply];
      notes.push('<strong>Good news met with a flat reply.</strong> ' + esc(a.mine ? 'You' : a.who) + ' shared “' + esc(snip(a.text, 60)) + '” and the reply was “' + esc(snip(c.text, 30)) + '”. Everyday moments like this build or wear down connection more than the big arguments do.');
    });
    r.gaps.forEach(function (g) {
      var h = Math.round(g.mins / 60);
      notes.push('<strong>A long silence</strong> of about ' + plural(h, 'hour') + ' before message ' + (g.at + 1) + '. Silence after a hard message is often read as not caring, even when it means someone needed time. Saying “I need some time, I’ll reply tonight” closes that gap.');
    });
    if (notes.length && !r.safety) html += drop('Worth noticing', '<ul class="cr-list">' + notes.map(function (n) { return '<li>' + n + '</li>'; }).join('') + '</ul>', false, String(notes.length));

    if (!r.safety) html += '<p style="margin-top:1.5rem;"><a class="dig" href="/check-ins-in-depth.html#order">Dig deeper: how to hold the conversation that comes next</a></p>';
    html += '</section>';

    pre('');
    out.innerHTML = html;
    try { var mr = document.getElementById('cr-me-row'); if (mr) mr.querySelectorAll('input[name="cr-me-pre"]').forEach(function (el) { el.checked = el.value === state.me; }); } catch (e) {}
    draftStep.hidden = false;
    wire();
    clarifyFor(r);
    if (scroll) { var s = $('cr-s3'); if (s) s.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
  }

  // ---------- Add context (context-panel.js): optional; the read uses it and says what it took into account ----------
  var ctxPanel = null;
  function ctxRead(r, them) {
    if (!window.TOLContext || !ctxPanel) return null;
    var c = ctxPanel.get();
    var lastTheirs = null; for (var i = r.turns.length - 1; i >= 0; i--) if (!r.turns[i].mine) { lastTheirs = r.turns[i]; break; }
    var earlier = r.turns.slice(0, lastTheirs ? r.turns.indexOf(lastTheirs) : r.turns.length).map(function (t) { return t.text; }).join('\n');
    if (!c.earlier && earlier) c.earlier = earlier;
    var cx = TOLContext.read(c, { text: lastTheirs ? lastTheirs.text : '', mode: 'read', engine: window.SignalEngine || null });
    // the pasted thread itself counts as "earlier messages", but it isn't something the person added
    if (!ctxPanel.get().earlier) cx.used = cx.used.filter(function (u) { return !/earlier messages you pasted/.test(u); });
    if (TOLContext.isEmpty(ctxPanel.get())) return TOLContext.read({}, {});
    return cx;
  }
  var GOAL_MOVE = {
    limit: ['Set your limit, kindly', 'Say it once, calmly. You don’t have to argue the whole thing in a message.', 'I hear you. For me, [your limit]. I’m happy to talk about it at [a calm time].'],
    plan: ['Fix the plan', 'Answer with one concrete suggestion: a time, a place or a next step.', 'Let’s settle it: how about [the plan] at [a time]?'],
    repair: ['Repair first', 'Name your part, if there was one, and the thing you both want.', 'I’m sorry for my part in this. I want us to be okay. Can we talk at [a time]?'],
    calm: ['Calm it down', 'You don’t have to answer the sharpest line. Answer the part you can agree with, or ask for a pause.', 'I don’t want to fight about this. Can we take a breather and talk at [a time]?'],
    understood: ['Say how it landed', 'Answer the point first, then say how it landed for you.', 'I want to understand you, and I’d like you to understand me too. When you said that, it landed as [how it felt]. Did you mean that?'],
    check: ['Check what they meant', 'Ask before deciding what it meant.', 'I want to be sure I’ve got this right. Did you mean [what you think they meant]?']
  };
  function ctxMoves(cx, them) {
    var mv = [];
    if (cx.flags.goal && GOAL_MOVE[cx.flags.goal]) { var g = GOAL_MOVE[cx.flags.goal]; mv.push({ key: 'goal', title: 'What you want: ' + g[0].toLowerCase(), say: g[1], script: g[2] }); }
    if (cx.flags.recurring) mv.push({ key: 'keeps', title: 'This keeps coming back', say: 'A message thread rarely settles a topic that keeps coming back. Suggest a calm time to talk it through, not over text.', script: 'This keeps coming up, and I’d like to sort it properly. Can we talk at [a calm time], not over text?', dig: ['/workpapers/wp-04-what-keeps-coming-back.html', 'What keeps coming back (WP-04)'] });
    return mv;
  }
  // "A few quick questions so the read is fair (optional)": when the thread shows possible unfairness or pressure
  var MARK_AS = { dig: 'jab', verdict: 'label', contempt: 'contempt', dismiss: 'brushoff', withdraw: 'withdraw', absolute: 'absolute', compare: 'compare', defend: 'invalid', demand: 'oblig' };
  function clarifyFor(r) {
    var slot = $('cr-clar'); if (!slot || !window.TOLContext) return;
    var found = {}, text = r.turns.map(function (t) { return t.text; }).join('\n');
    r.turns.forEach(function (t) { t.marks.forEach(function (m) { if (MARK_AS[m.kind]) found[MARK_AS[m.kind]] = [m.text]; }); });
    var an = { found: found, control: r.control ? { kind: 'isolate' } : null };
    TOLContext.offerClarify(slot, { an: an, text: text, ctx: ctxPanel ? ctxPanel.get() : null, onResult: function (res) {
      var line = TOLContext.clarifyLine(res); if (!line) return;
      var p = $('cr-clar-line'); if (!p) { p = document.createElement('p'); p.id = 'cr-clar-line'; p.className = 'cr-note'; slot.parentNode.insertBefore(p, slot); }
      p.textContent = line;
    } });
  }

  function summary(r, them) {
    var t = r.turns, parts = [];
    var level = { calm: 'calm', warm: 'tense', hot: 'heated' }[r.level];
    // (the engine's "warm" level means "a bit tense" here: warmth, on this site, is a good thing)
    var chip = r.trend === 'shutdown' ? '<span class="cr-temp hot">Ends shut down</span> ' : '<span class="cr-temp ' + r.level + '">Ends ' + level + '</span> ';
    var endsCalm = r.level === 'calm' && r.trend !== 'shutdown';
    parts.push('<p>' + chip +
      plural(t.length, 'message') + ': ' + r.mine + ' from you, ' + r.theirs + ' from ' + esc(them) + '.' +
      (r.topicGuess ? ' It looks like it’s about <strong>' + esc(r.topicGuess) + '</strong>. Right? If not, the read still holds.' : r.topic ? ' It seems to be about <strong>' + esc(r.topic) + '</strong>.' : r.topicUnsure ? ' The words don’t make it clear what it’s mostly about, so the Reader won’t guess.' : '') + '</p>');
    var startWarm = t[0].heat >= 1.2;
    var story = 'It starts ' + (startWarm ? 'already tense' : 'calm') + '. ';
    if (r.turned > 0) story += 'It turns at <strong>message ' + (r.turned + 1) + '</strong>, from ' + (t[r.turned].mine ? 'you' : esc(t[r.turned].who)) + ': “' + esc(snip(t[r.turned].text, 70)) + '”. ';
    else if (r.turned === 0) story += 'The first message already carries a lot of heat. ';
    else if (r.peak < 1.5 && endsCalm) story += 'It never really heats up. ';
    else if (r.peak < 3) story += 'There’s no one big turn, but some tension creeps in. ';
    else story += 'The heat builds gradually rather than at one moment. ';
    // The closing line has to agree with the "Ends …" chip above it
    story += {
      shutdown: 'By the end someone has pulled back. That isn’t the same as calm: it can mean they’re overwhelmed, or hurt.',
      rising: r.level === 'calm' ? 'It gets a touch warmer at the end, but it still ends calm.' : r.edgeRise && r.peak < 3 ? 'More of the lines carry an edge toward the end, on both sides, so it gets tenser as it goes.' : (r.peak < 3 ? 'It gets a little tenser toward the end.' : 'By the end it’s still heating up.'),
      cooling: endsCalm ? 'By the end it has cooled down.' : 'It cools a little from its hottest point, but it still ends ' + level + '.',
      steady: endsCalm ? (startWarm ? 'It settles down, and ends calm.' : 'It stays calm to the end.') : (startWarm ? 'It stays about as ' + level + ' to the end.' : 'It stays fairly ' + level + ' to the end.'),
      short: ''
    }[r.trend];
    parts.push('<p>' + story + '</p>');
    if (r.hottest && (r.hottest.me || r.hottest.them) && r.peak >= 1.5) parts.push(hottest(r, them));
    // a line that reads as a threat is named first: it matters more than how the rest of the chat went
    var hReal = (r.harm || []).filter(function (h) { return !h.playful; })[0], hPlay = (r.harm || []).filter(function (h) { return h.playful; })[0];
    if (hReal) parts.push('<p class="cr-note cr-threat"><strong>Message ' + (hReal.at + 1) + ' could read as a threat:</strong> “' + esc(snip(hReal.text, 80)) + '”. Read flatly, words like that can frighten someone, whatever was meant. That matters more than how the rest of the chat went. <a class="cr-ctx-open" href="#cr-ctx">Add context</a> if you know more.</p>');
    else if (hPlay) parts.push('<p class="cr-note"><strong>Message ' + (hPlay.at + 1) + ' could read as a threat if it isn’t a shared joke:</strong> “' + esc(snip(hPlay.text, 80)) + '”. The words alone can’t show the grin.</p>');
    if (r.crossedThem) parts.push('<p class="cr-note">A put-down isn’t the same as a disagreement. You can take their real point seriously and still say the put-down wasn’t okay.</p>');
    else if (r.turned > 0) parts.push('<p class="cr-note">A turn is rarely one person’s fault. It’s usually where two frequencies stopped matching. <a class="dig" href="/book/chapter-1-in-depth.html#squeal">Dig deeper: why two reasonable people end up in a fight</a></p>');
    return '<h2>What happened</h2>' + parts.join('');
  }

  function chart(r) {
    var n = r.turns.length, W = 600, H = 120, pad = 6;
    var max = Math.max(6, r.peak), bw = Math.min(40, (W - pad * 2) / n - 4);
    var step = (W - pad * 2) / n;
    var svg = '<svg viewBox="0 0 ' + W + ' ' + (H + 22) + '" role="img" aria-label="Heat of each message, in order. ' +
      (r.turned >= 0 ? 'The turn is at message ' + (r.turned + 1) + '.' : '') + '">';
    svg += '<line x1="0" y1="' + H + '" x2="' + W + '" y2="' + H + '" stroke="var(--line)" stroke-width="1"/>';
    r.turns.forEach(function (t, i) {
      var h = Math.max(3, (t.heat / max) * (H - 18));
      var x = pad + i * step + (step - bw) / 2;
      var fill = t.mine ? 'var(--credit)' : 'var(--brass)';
      svg += '<rect x="' + x.toFixed(1) + '" y="' + (H - h).toFixed(1) + '" width="' + bw.toFixed(1) + '" height="' + h.toFixed(1) + '" rx="2" fill="' + fill + '" opacity="' + (t.heat ? 0.9 : 0.35) + '"><title>Message ' + (i + 1) + ' from ' + esc(t.mine ? 'you' : t.who) + '</title></rect>';
      if (i === r.turned) svg += '<path d="M' + (x + bw / 2 - 5).toFixed(1) + ' ' + (H - h - 12).toFixed(1) + ' l5 7 l5 -7 z" fill="var(--debit)"/>';
      if (n <= 24) svg += '<text x="' + (x + bw / 2).toFixed(1) + '" y="' + (H + 15) + '" text-anchor="middle" font-family="IBM Plex Mono, monospace" font-size="10" fill="var(--ink-soft)">' + (i + 1) + '</text>';
    });
    svg += '</svg>';
    return '<div class="cr-chart">' + svg + '<div class="cr-legend"><span><i style="background:var(--credit)"></i>You</span><span><i style="background:var(--brass)"></i>' + (r.theirs ? 'Them' : '') + '</span>' +
      (r.turned >= 0 ? '<span><i style="background:var(--debit);width:.6rem;height:.5rem;clip-path:polygon(0 0,100% 0,50% 100%)"></i>Where it turned</span>' : '') + '<span>Taller = more heat</span></div></div>';
  }

  function bubble(r, t, i) {
    var kinds = [];
    t.marks.forEach(function (m) { if (kinds.indexOf(m.kind) === -1) kinds.push(m.kind); });
    var flags = '';
    if (i === r.turned) flags += '<span class="cr-flag">Where it turned</span>';
    if (kinds.indexOf('repair') !== -1) flags += '<span class="cr-flag is-repair">Reaching out</span>';
    if (r.missedRepairs.some(function (x) { return x.reply === i; })) flags += '<span class="cr-flag is-missed">Missed the reach-out</span>';
    var heatPct = Math.min(100, Math.round((t.heat / 6) * 100));
    var meta = '<div class="cr-meta"><span class="cr-who"><button type="button" data-flip="' + i + '" title="Switch who said this">' + esc(t.mine ? 'You (' + t.who + ')' : t.who) + '</button></span>' +
      (t.time ? '<span>' + esc(t.time) + '</span>' : '') +
      '<span class="cr-heat" title="Heat"><b style="width:' + heatPct + '%"></b></span>' + flags + '</div>';
    var why = '';
    var notes = kinds.filter(function (k) { return R.KINDS[k].hear; });
    if (notes.length) {
      why = '<details class="cr-why"><summary>What they may hear</summary><ul>' + notes.map(function (k) {
        var K = R.KINDS[k];
        if (k === 'idiom') return t.marks.filter(function (m) { return m.kind === 'idiom'; }).map(function (m) { return '<li><strong>' + esc(K.label) + ':</strong> “' + esc(m.text) + '” usually means ' + esc(m.means) + '. Some people take it literally. <em>Instead:</em> say the plain meaning.</li>'; }).join('');
        var res = k === 'dismiss' && t.marks.some(function (m) { return m.kind === 'dismiss' && m.resigned; }) && R.KINDS.dismiss.resigned;
        if (res) return '<li><strong>' + esc(res.label) + ':</strong> ' + esc(res.hear) + ' <em>Instead:</em> ' + esc(res.instead) + '</li>';
        var pat = K.pattern && t.marks.some(function (m) { return m.kind === k && m.pattern; }) ? ' ' + esc(K.pattern) : '';
        return '<li><strong>' + esc(K.label) + ':</strong> ' + esc(K.hear) + pat + (K.instead ? ' <em>Instead:</em> ' + esc(K.instead) : '') + (K.need ? ' <em>' + esc(K.need) + '</em>' : '') + '</li>';
      }).join('') + '</ul></details>';
    }
    var readAs = t.readAs && t.readAs.length ? '<p class="cr-hint" style="margin:.2rem 0 0">Read as: ' + t.readAs.slice(0, 3).map(function (f) { return '“' + esc(f.to) + '” (typed “' + esc(f.from) + '”)'; }).join(', ') + '</p>' : '';
    return '<li class="cr-msg' + (t.mine ? ' is-me' : '') + '">' + meta + '<div class="cr-bubble">' + highlight(t) + '</div>' + readAs + why + '</li>';
  }

  function highlight(t) {
    var text = t.text, marks = t.marks.filter(function (m) { return !m.whole && !m.non && m.start >= 0; }).sort(function (a, b) { return a.start - b.start; });
    var whole = t.marks.filter(function (m) { return m.whole; })[0];
    var out = '', pos = 0;
    marks.forEach(function (m) {
      if (m.start < pos) return;
      out += esc(text.slice(pos, m.start)) + '<mark class="t-' + R.KINDS[m.kind].tone + '" title="' + esc(markLabel(m)) + '">' + esc(text.slice(m.start, m.end)) + '</mark>';
      pos = m.end;
    });
    out += esc(text.slice(pos));
    if (whole) out = '<mark class="t-' + R.KINDS[whole.kind].tone + '" title="' + esc(markLabel(whole)) + '">' + out + '</mark>';
    return out;
  }
  // a resigned "whatever" carries the gentler name everywhere: on the card, in the marks and in the table
  function markLabel(m) { return m.kind === 'dismiss' && m.resigned && R.KINDS.dismiss.resigned ? R.KINDS.dismiss.resigned.label : R.KINDS[m.kind].label; }

  // sig17: each side's hottest line, side by side, so nobody is cast as the one who started it
  function hottest(r, them) {
    var H = r.hottest || {}, cells = [];
    [['me', 'You'], ['them', them]].forEach(function (x) {
      var h = H[x[0]];
      cells.push('<div class="cr-hot-c"><p class="cr-hot-k">' + esc(x[0] === 'me' ? 'Your hottest line' : (x[1].length > 14 ? 'Their' : x[1] + '’s') + ' hottest line') + '</p>' +
        (h ? '<p class="cr-hot-q">“' + esc(snip(h.said || h.text, 90)) + '”</p><p class="cr-hot-l">Message ' + (h.at + 1) + (h.label ? ' · ' + esc(h.label.toLowerCase()) : '') + '</p>'
           : '<p class="cr-hot-q cr-hot-none">Nothing that added heat.</p>') + '</div>');
    });
    return '<div class="cr-hot" role="group" aria-label="Each side’s hottest line">' + cells.join('') + '</div>';
  }
  function patterns(r, them) {
    // a resigned "whatever" is its own row, under the gentler name the message card uses
    var rMe = r.resignedMe || 0, rThem = r.resignedThem || 0;
    var cnt = function (side, k) { var n = (side === 'me' ? r.tallyMe : r.tallyThem)[k] || 0; if (k === 'dismiss') n -= side === 'me' ? rMe : rThem; if (k === 'dismiss:resigned') n = side === 'me' ? rMe : rThem; return n; };
    var rows = [];
    ORDER.forEach(function (k) { if (k === 'dismiss') { if (rMe || rThem) rows.push('dismiss:resigned'); } if (cnt('me', k) || cnt('them', k)) rows.push(k); });
    if (!rows.length) return '';
    var hint = r.crossedThem && !r.crossedMe ? 'Patterns in the chat, not a score. Some lines from ' + esc(them) + ' were put-downs. Whatever else was going on, that isn’t okay, and it isn’t yours to fix.'
      : r.crossedMe && !r.crossedThem ? 'Patterns in the chat, not a score. Some of your lines were put-downs. Owning those, plainly, is the fastest way back.'
      : 'Patterns in the chat, not a score. These count words, not people, and the same words count the same way on both sides: both of you are doing your best with what you were carrying.';
    var h = '<p class="cr-hint">' + hint + '</p>' + hottest(r, them) +
      '<div class="cr-table-wrap"><table class="cr-table"><thead><tr><th scope="col">Pattern</th><th scope="col" class="n">You</th><th scope="col" class="n">' + esc(them.length > 14 ? 'Them' : them) + '</th></tr></thead><tbody>';
    rows.forEach(function (k) {
      var lab = k === 'dismiss:resigned' ? R.KINDS.dismiss.resigned.label : R.KINDS[k].label;
      h += '<tr' + (GOOD[k] ? ' class="good"' : '') + '><td>' + (GOOD[k] ? '<span class="plus" aria-label="helpful">+</span>' : '') + esc(lab) + '</td><td class="n">' + (cnt('me', k) || '·') + '</td><td class="n">' + (cnt('them', k) || '·') + '</td></tr>';
    });
    var anyGood = rows.some(function (k) { return GOOD[k]; });
    return h + '</tbody></table></div><p class="cr-note">' + (anyGood ? 'Rows marked + are the helpful ones. ' : '') + 'This table is for you to notice your own side, not to show them: counts read aloud become ammunition.</p>';
  }

  function formAdvice(form, r) {
    var hot = r.level !== 'calm' || r.peak >= 3;
    if (form === 'text') return 'Text strips out tone of voice, so a neutral message can read as sharp and a joke can read as a jab. ' +
      (hot ? 'Once it’s this tense, more texting rarely helps. Suggest a call or talking in person, and name a time.' : 'Keep hard topics short, and move them to a call if they start to heat up.');
    if (form === 'email') return 'In email, put the one thing that matters in the first two lines, answer their question before adding your own, and leave anything written while upset in drafts overnight.';
    if (form === 'phone') return 'This is written from memory, so it’s your recollection; the other person may remember it differently. Use it to prepare, not to prove. On the phone, pace carries a lot: slow down and leave pauses.';
    return 'This is written from memory, so it’s your recollection; the other person may remember it differently. Use it to prepare for the next conversation, not to prove what happened in the last one.';
  }

  // ---------- Controls ----------
  function wire() {
    out.querySelectorAll('input[name="cr-me"]').forEach(function (el) {
      el.addEventListener('change', function () { state.me = state.speakers[+el.value]; render(false); });
    });
    out.querySelectorAll('input[name="cr-form"]').forEach(function (el) {
      el.addEventListener('change', function () { state.form = el.value; render(false); });
    });
    out.querySelectorAll('[data-flip]').forEach(function (b) {
      b.addEventListener('click', function () {
        var t = state.turns[+b.getAttribute('data-flip')];
        var i = state.speakers.indexOf(t.who);
        t.who = state.speakers[(i + 1) % state.speakers.length];
        render(false);
      });
    });
    out.querySelectorAll('[data-copy]').forEach(function (b) {
      b.addEventListener('click', function () { copy(b.getAttribute('data-copy'), b); });
    });
  }

  function copy(text, btn) {
    var done = function () { var o = btn.textContent; btn.textContent = 'Copied'; setTimeout(function () { btn.textContent = o; }, 1500); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, fallback); else fallback();
    function fallback() {
      var ta = document.createElement('textarea'); ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); done(); } catch (e) {} ta.remove();
    }
  }

  // ---------- Checking a reply ----------
  var timer = null;
  function checkDraft() {
    var v = draft.value;
    if (!v.trim()) { draftOut.innerHTML = ''; return; }
    var d = R.checkDraft(v), kinds = [];
    d.marks.forEach(function (m) { if (kinds.indexOf(m.kind) === -1) kinds.push(m.kind); });
    if (d.unsafe) {
      draftOut.innerHTML = '<div class="cr-safety" role="alert" style="margin-top:1rem;"><h2>Please don’t send this one</h2>' +
        '<p>These words read as a threat, or as checking up on or cutting off the other person. No rewording makes that okay to send. Step away from the conversation for now.</p></div>';
      return;
    }
    var h = '<ul class="cr-checks">' + d.checks.map(function (c) { return '<li class="' + (c.ok ? 'ok' : '') + '">' + esc(c.label) + '</li>'; }).join('') + '</ul>';
    var warn = kinds.filter(function (k) { return !GOOD[k] && R.KINDS[k].instead; });
    if (warn.length) h += '<ul class="cr-list cr-draft-marks">' + warn.map(function (k) { var K = R.KINDS[k]; return '<li><strong>' + esc(K.label) + ':</strong> ' + esc(K.instead) + '</li>'; }).join('') + '</ul>';
    if (d.softened) h += '<div class="cr-soft"><p><strong>Same words, less heat</strong> (with the all-caps, extra punctuation and always/never toned down):</p><p>' + esc(d.softened) + '</p><button type="button" class="cr-btn is-quiet is-small" id="cr-use">Use this wording</button> <button type="button" class="cr-btn is-quiet is-small" id="cr-copy-soft">Copy</button></div>';
    if (warn.length) h += '<div class="cr-soft"><p><strong>Or write it fresh in this shape:</strong></p><p>' + esc(d.shape) + '</p><button type="button" class="cr-btn is-quiet is-small" id="cr-copy-shape">Copy</button></div>';
    else if (!d.softened) h += '<p class="cr-note">Nothing in the wording is likely to add heat. Read it once more as if you were them, then send it when you’re calm.</p>';
    h += '<p style="margin-top:.9rem;"><a class="dig" href="/signal-translator.html">Dig deeper: test one sentence against how the other person is wired</a></p>';
    draftOut.innerHTML = h;
    var use = $('cr-use'); if (use) use.addEventListener('click', function () { draft.value = d.softened; checkDraft(); draft.focus(); });
    var cs = $('cr-copy-soft'); if (cs) cs.addEventListener('click', function () { copy(d.softened, cs); });
    var sh = $('cr-copy-shape'); if (sh) sh.addEventListener('click', function () { copy(d.shape, sh); });
  }
  draft.addEventListener('input', function () { clearTimeout(timer); timer = setTimeout(checkDraft, 250); });

  // sig17: "Which one is you?" right under the box, as soon as the paste has names: one tap reads it straight away.
  // A "Me:" or "You:" name is picked already; so is the name picked last time on this page (until the tab closes).
  var meRow = document.createElement('div'); meRow.id = 'cr-me-row'; meRow.className = 'cr-me-row no-bubble'; meRow.hidden = true;
  input.parentNode.insertBefore(meRow, input.nextSibling);
  var lastMe = '', meT = null;
  function drawMe() {
    var p = input.value.trim() ? R.parse(input.value) : { speakers: [], turns: [] };
    var sp = p.turns.length >= 2 ? p.speakers.filter(Boolean).slice(0, 6) : [];
    if (sp.length < 2 || p.format === 'unlabelled') { meRow.hidden = true; meRow.innerHTML = ''; return; }
    var pick = sp.filter(function (x) { return /^(me|you|i|myself)$/i.test(x); })[0] || (sp.indexOf(lastMe) !== -1 ? lastMe : '');
    var cur = meRow.querySelector('input:checked'); if (cur && sp.indexOf(cur.value) !== -1) pick = cur.value;
    meRow.innerHTML = '<p class="cr-hint cr-me-k" id="cr-me-k">Which one is you? <span>One tap reads it.</span></p><div class="cr-chips" role="radiogroup" aria-labelledby="cr-me-k">' +
      sp.map(function (x) { return '<label class="cr-chip"><input type="radio" name="cr-me-pre" value="' + esc(x) + '"' + (x === pick ? ' checked' : '') + '><span>' + esc(x) + '</span></label>'; }).join('') + '</div>';
    meRow.hidden = false;
    meRow.querySelectorAll('input[name="cr-me-pre"]').forEach(function (el) {
      el.addEventListener('change', function () { lastMe = el.value; readAs(el.value); });
    });
  }
  function readAs(me) {
    start(input.value);
    if (state && me && state.speakers.indexOf(me) !== -1) { state.me = me; render(true); }
  }
  input.addEventListener('input', function () { clearTimeout(meT); meT = setTimeout(drawMe, 250); });
  $('cr-go').addEventListener('click', function () {
    var c = meRow.hidden ? null : meRow.querySelector('input:checked');
    if (c) readAs(c.value); else start(input.value);
  });
  // Add context: closed by default; "Done" reads the conversation again with it
  // "Add context" next to a line that reads as a threat opens the panel
  document.addEventListener('click', function (e) { var a = e.target.closest && e.target.closest('a.cr-ctx-open'); if (a && ctxPanel && ctxPanel.open) { e.preventDefault(); ctxPanel.open(false); var el = $('cr-ctx'); if (el && el.scrollIntoView) el.scrollIntoView({ block: 'start' }); } });
  if (window.TOLContext && $('cr-ctx')) ctxPanel = TOLContext.mount($('cr-ctx'), { mode: 'read', earlier: false, onChange: function (c, o) { if (o && o.again && state && state.me) render(false); } });
  // the screenshot reader hands over the checked text, and who "you" are, so there's nothing to ask twice
  window.TOLReaderPage = {
    read: function (text, me) {
      input.value = text;
      drawMe();
      start(text);
      if (state && me && state.speakers.indexOf(me) !== -1 && state.me !== me) { state.me = me; render(true); }
    }
  };
  $('cr-example').addEventListener('click', function () {
    input.value = EXAMPLE; drawMe(); start(EXAMPLE);
    // In the example, read it from Alex's side: the one whose reach-outs came back cold
    if (state) { state.me = 'Alex'; render(true); }
  });
  $('cr-clear').addEventListener('click', function () {
    input.value = ''; draft.value = ''; out.innerHTML = ''; pre(''); drawMe(); draftOut.innerHTML = ''; draftStep.hidden = true; state = null; input.focus();
  });
  // A whole conversation handed over from another page or another part of the Chat analyzer waits in this tab's
  // sessionStorage ('tol-cr-text': {text, me} or plain text), never in the address. It is removed as soon as it's read.
  try {
    var handed = sessionStorage.getItem('tol-cr-text');
    if (handed != null) {
      sessionStorage.removeItem('tol-cr-text');
      var h = null; try { h = JSON.parse(handed); } catch (e) { h = null; }
      if (!h || typeof h !== 'object') h = { text: handed };
      if (h.text && String(h.text).trim()) window.TOLReaderPage.read(String(h.text).slice(0, 50000), h.me ? String(h.me) : '');
    }
  } catch (e) {}
})();
