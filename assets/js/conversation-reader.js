/* conversation-reader.js — the page for /conversation-reader.html
   Uses TOLReader (conversation-reader-engine.js). Runs only in the browser:
   nothing here saves, stores or sends what people paste. */
(function () {
  'use strict';
  var R = window.TOLReader;
  if (!R) return;

  var EXAMPLE = [
    'Sam: hey did you get a chance to look at the sink? it\'s backed up again',
    'Alex: not yet, I\'ll do it later',
    'Sam: you said that on Sunday. When exactly?',
    'Alex: I SAID later. Why do you always do this??',
    'Sam: I\'m not trying to start anything. I\'m just tired and the kitchen is a mess',
    'Alex: whatever. you never notice anything I do around here',
    'Sam: that\'s not fair. Remember when I did the whole garage last month?',
    'Alex: wow, thanks a lot for keeping score',
    'Sam: ok I\'m sorry, I didn\'t mean it like that. Can we talk tonight?',
    'Alex: fine.'
  ].join('\n');

  var FORMS = [['text', 'Text or chat'], ['email', 'Email'], ['person', 'In person, from memory'], ['phone', 'Phone call, from memory']];
  var ORDER = ['verdict', 'absolute', 'dismiss', 'sarcasm', 'withdraw', 'demand', 'history', 'shouting', 'vague', 'short', 'turnaway', 'repair', 'feeling', 'ask'];
  var HELP_SELF = 'If you’re thinking about ending your life or hurting yourself, or someone else is: in the US call or text <strong>988</strong> (Suicide &amp; Crisis Lifeline). If someone is in immediate danger, call <strong>911</strong>.';
  var HELP_ABUSE = 'For threats, abuse or control from a partner or family member: in the US, the National Domestic Violence Hotline is <strong>1-800-799-7233</strong> (or text START to 88788). If anyone is in immediate danger, call <strong>911</strong>.';
  var HELP_WORLD = 'Outside the US, <a href="https://findahelpline.com" rel="noopener">findahelpline.com</a> lists free, confidential helplines in your country, or call your local emergency number.';
  var GOOD = { repair: 1, feeling: 1, ask: 1 };

  var $ = function (id) { return document.getElementById(id); };
  var input = $('cr-input'), out = $('cr-out'), draftStep = $('cr-draft-step'), draft = $('cr-draft'), draftOut = $('cr-draft-out');
  var state = null;   // { turns, speakers, format, me, form }

  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function snip(t, n) { t = String(t).replace(/\s+/g, ' ').trim(); n = n || 80; return t.length > n ? t.slice(0, n - 3).replace(/\s\S*$/, '') + '…' : t; }
  function plural(n, w) { return n + ' ' + w + (n === 1 ? '' : 's'); }

  // ---------- Reading ----------
  function start(text) {
    var p = R.parse(text);
    if (p.turns.length < 2) {
      out.innerHTML = '<p class="cr-note" role="alert" style="margin-top:1.5rem!important;">Paste at least two messages, so there’s a back-and-forth to read.</p>';
      draftStep.hidden = true;
      return;
    }
    var guess = p.speakers.filter(function (s) { return /^(me|you|i|myself)$/i.test(s); })[0] ||
                (p.speakers.length > 1 ? p.speakers[1] : p.speakers[0]);
    state = { turns: p.turns, speakers: p.speakers, format: p.format, me: guess, form: p.format === 'email' ? 'email' : 'text' };
    render(true);
  }

  function render(scroll) {
    var r = R.read(state.turns, state.me, state.form);
    var others = state.speakers.filter(function (s) { return s !== state.me; });
    var them = others.length === 1 ? others[0] : (others.length ? 'the others' : 'them');
    var html = '';

    // 02 Who's who, and how it happened
    html += '<section class="cr-step" aria-labelledby="cr-s2"><h2 id="cr-s2"><span>02</span>Who’s who, and how it happened</h2>';
    html += '<p class="cr-hint">Which one is you?</p><div class="cr-chips" role="radiogroup" aria-label="Which one is you">';
    state.speakers.forEach(function (s, i) {
      html += '<label class="cr-chip"><input type="radio" name="cr-me" value="' + i + '"' + (s === state.me ? ' checked' : '') + '><span>' + esc(s) + '</span></label>';
    });
    html += '</div>';
    if (state.format === 'unlabelled') html += '<p class="cr-note">There were no names in the paste, so the Reader took turns between messages. If it got someone wrong, tap the name above that message to switch it.</p>';
    html += '<p class="cr-hint" style="margin-top:1rem!important;">How did this conversation happen?</p><div class="cr-chips" role="radiogroup" aria-label="How it happened">';
    FORMS.forEach(function (f) {
      html += '<label class="cr-chip"><input type="radio" name="cr-form" value="' + f[0] + '"' + (f[0] === state.form ? ' checked' : '') + '><span>' + f[1] + '</span></label>';
    });
    html += '</div></section>';

    // Safety first
    if (r.safety) {
      var what = [r.selfHarm ? 'someone not wanting to be alive, or hurting themselves' : '', r.threat ? 'threats' : '', r.control ? 'checking, controlling or cutting someone off' : ''].filter(Boolean).join(', and ');
      html += '<section class="cr-safety" role="alert" aria-labelledby="cr-safe"><h2 id="cr-safe">Your safety comes first</h2>' +
        '<p>Something in this conversation sounds like ' + what + '. The Reader can’t judge that properly, and nothing here matters more than being safe.</p>' +
        (r.threat || r.control ? '<p>Threats and control aren’t a communication problem to be worded better, and the joint exercises on this site aren’t meant for relationships where one person is afraid of the other. You don’t owe calm replies or acceptance. If you’re unsure, talking it through with a helpline is free and confidential.</p>' : '') +
        (r.selfHarm ? '<p>' + HELP_SELF + '</p>' : '') + (r.threat || r.control ? '<p>' + HELP_ABUSE + '</p>' : '') + '<p>' + HELP_WORLD + '</p>' +
        '<p style="margin:0!important;"><a class="dig" href="/relationships-in-depth.html#safety">Dig deeper: more places to get help</a></p></section>';
    }

    // 03 The read
    html += '<section class="cr-step" aria-labelledby="cr-s3"><h2 id="cr-s3"><span>03</span>The read</h2>';
    html += '<div class="cr-summary">' + summary(r, them) + chart(r) + '</div>';

    // How to respond
    if (r.next && r.next.length) {
      html += '<h3>How to respond</h3><ol class="cr-moves">';
      r.next.forEach(function (m, i) {
        html += '<li' + (i === 0 ? ' class="is-first"' : '') + '><h3>' + esc(m.title) + '</h3><p>' + esc(m.say) + '</p>' +
          (m.script ? '<div class="cr-script"><q>' + esc(m.script) + '</q><button type="button" class="cr-btn is-quiet is-small" data-copy="' + esc(m.script) + '">Copy</button></div>' : '') +
          (m.dig ? '<a class="dig" href="' + m.dig[0] + '">Dig deeper: ' + esc(m.dig[1]) + '</a>' : '') + '</li>';
      });
      html += '</ol>';
      html += '<p class="cr-note">Change anything in [square brackets] to fit. Short beats perfect.</p>';
    }

    // The form it happened in
    html += '<h3>Because this was ' + ({ text: 'by text', email: 'by email', person: 'in person', phone: 'on the phone' })[state.form] + '</h3><p>' + formAdvice(state.form, r) + '</p>';

    // Message by message
    html += '<h3>Message by message</h3><p class="cr-hint">Marked words show what may have added heat, and what helped. Tap “What they may hear” under a message for more.</p><ol class="cr-thread">';
    r.turns.forEach(function (t, i) { html += bubble(r, t, i); });
    html += '</ol>';

    // Patterns on each side
    html += patterns(r, them);

    // Other things worth noticing
    var notes = [];
    r.missedRepairs.forEach(function (x) {
      var a = r.turns[x.at], b = r.turns[x.reply];
      notes.push('<strong>A reach-out that wasn’t taken.</strong> ' + esc(a.who) + ' tried to turn it down (“' + esc(snip(a.text, 70)) + '”) and the reply stayed hot (“' + esc(snip(b.text, 50)) + '”). Noticing these is one of the most useful things you can do.');
    });
    r.unanswered.forEach(function (u) {
      var t = r.turns[u.at];
      notes.push('<strong>A question that may not have been answered.</strong> ' + esc(t.who) + ' asked “' + esc(snip(u.q, 90)) + '”' + (u.open ? ' and it’s still open.' : ', and the reply went somewhere else.'));
    });
    r.drift.forEach(function (i) {
      notes.push('<strong>Another topic came in</strong> at message ' + (i + 1) + ' (“' + esc(snip(r.turns[i].text, 60)) + '”). One topic at a time keeps it answerable.');
    });
    r.bids.forEach(function (b) {
      var a = r.turns[b.at], c = r.turns[b.reply];
      notes.push('<strong>Good news met flat.</strong> ' + esc(a.mine ? 'You' : a.who) + ' shared “' + esc(snip(a.text, 60)) + '” and the reply was “' + esc(snip(c.text, 30)) + '”. Everyday moments like this build or wear down connection more than the big arguments do.');
    });
    r.gaps.forEach(function (g) {
      var h = Math.round(g.mins / 60);
      notes.push('<strong>A long silence</strong> of about ' + plural(h, 'hour') + ' before message ' + (g.at + 1) + '. Silence after a hard message is often read as not caring, even when it means someone needed time. Saying “I need some time, I’ll reply tonight” closes that gap.');
    });
    if (notes.length) html += '<h3>Worth noticing</h3><ul class="cr-list">' + notes.map(function (n) { return '<li>' + n + '</li>'; }).join('') + '</ul>';

    html += '<p style="margin-top:1.5rem;"><a class="dig" href="/check-ins-in-depth.html#order">Dig deeper: how to hold the conversation that comes next</a></p>';
    html += '</section>';

    out.innerHTML = html;
    draftStep.hidden = false;
    wire();
    if (scroll) { var s = $('cr-s3'); if (s) s.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
  }

  function summary(r, them) {
    var t = r.turns, parts = [];
    var level = { calm: 'calm', warm: 'tense', hot: 'heated' }[r.level];
    var chip = r.trend === 'shutdown' ? '<span class="cr-temp hot">Ends shut down</span> ' : '<span class="cr-temp ' + r.level + '">Ends ' + level + '</span> ';
    parts.push('<p>' + chip +
      plural(t.length, 'message') + ': ' + r.mine + ' from you, ' + r.theirs + ' from ' + esc(them) + '.' +
      (r.topic ? ' It seems to be about <strong>' + esc(r.topic) + '</strong>.' : '') + '</p>');
    var startWarm = t[0].heat >= 1.2;
    var story = 'It starts ' + (startWarm ? 'already tense' : 'calm') + '. ';
    if (r.turned > 0) story += 'It turns at <strong>message ' + (r.turned + 1) + '</strong>, from ' + (t[r.turned].mine ? 'you' : esc(t[r.turned].who)) + ': “' + esc(snip(t[r.turned].text, 70)) + '”. ';
    else if (r.turned === 0) story += 'The first message already carries a lot of heat. ';
    else if (r.peak < 3) story += 'It never really heats up. ';
    else story += 'The heat builds gradually rather than at one moment. ';
    story += { shutdown: 'By the end someone has shut down. That isn’t the same as calm: it usually means they’re overwhelmed.', rising: 'By the end it’s still heating up.', cooling: 'By the end it has cooled down.', steady: 'It ends about where it has been.', short: '' }[r.trend];
    parts.push('<p>' + story + '</p>');
    if (r.turned > 0) parts.push('<p class="cr-note">A turn is rarely one person’s fault. It’s usually where two frequencies stopped matching. <a class="dig" href="/book/chapter-1-in-depth.html#squeal">Dig deeper: why two reasonable people end up in a fight</a></p>');
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
        return '<li><strong>' + esc(K.label) + ':</strong> ' + esc(K.hear) + (K.instead ? ' <em>Instead:</em> ' + esc(K.instead) : '') + '</li>';
      }).join('') + '</ul></details>';
    }
    return '<li class="cr-msg' + (t.mine ? ' is-me' : '') + '">' + meta + '<div class="cr-bubble">' + highlight(t) + '</div>' + why + '</li>';
  }

  function highlight(t) {
    var text = t.text, marks = t.marks.filter(function (m) { return !m.whole && !m.non && m.start >= 0; }).sort(function (a, b) { return a.start - b.start; });
    var whole = t.marks.filter(function (m) { return m.whole; })[0];
    var out = '', pos = 0;
    marks.forEach(function (m) {
      if (m.start < pos) return;
      out += esc(text.slice(pos, m.start)) + '<mark class="t-' + R.KINDS[m.kind].tone + '" title="' + esc(R.KINDS[m.kind].label) + '">' + esc(text.slice(m.start, m.end)) + '</mark>';
      pos = m.end;
    });
    out += esc(text.slice(pos));
    if (whole) out = '<mark class="t-' + R.KINDS[whole.kind].tone + '" title="' + esc(R.KINDS[whole.kind].label) + '">' + out + '</mark>';
    return out;
  }

  function patterns(r, them) {
    var rows = ORDER.filter(function (k) { return r.tallyMe[k] || r.tallyThem[k]; });
    if (!rows.length) return '';
    var h = '<h3>Patterns on each side</h3><p class="cr-hint">How often each pattern shows up. These count words, not people: both of you are doing your best with what you were carrying.</p>' +
      '<div class="cr-table-wrap"><table class="cr-table"><thead><tr><th scope="col">Pattern</th><th scope="col" class="n">You</th><th scope="col" class="n">' + esc(them.length > 14 ? 'Them' : them) + '</th></tr></thead><tbody>';
    rows.forEach(function (k) {
      h += '<tr' + (GOOD[k] ? ' class="good"' : '') + '><td>' + esc(R.KINDS[k].label) + '</td><td class="n">' + (r.tallyMe[k] || '·') + '</td><td class="n">' + (r.tallyThem[k] || '·') + '</td></tr>';
    });
    return h + '</tbody></table></div><p class="cr-note">Rows marked + are the helpful ones. This table is for you to notice your own side, not to show them: counts read aloud become ammunition.</p>';
  }

  function formAdvice(form, r) {
    var hot = r.level !== 'calm' || r.peak >= 3;
    if (form === 'text') return 'Text strips out tone of voice, so a neutral message can read as sharp and a joke can read as a jab. ' +
      (hot ? 'Once it’s this warm, more texting rarely helps. Suggest a call or talking in person, and name a time.' : 'Keep hard topics short, and move them to a call if they start to heat up.');
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
        (d.selfHarm ? '<p>What you’ve written sounds like you might be thinking about hurting yourself or not being alive. You deserve support right now. ' + HELP_SELF + '</p>'
          : '<p>This reads as a threat or as controlling the other person. No rewording makes it safe to send. Step away from the conversation for now. If you’re worried about what you might do, or feel this way often, talking to someone helps.</p>') +
        '<p style="margin:0!important;">' + HELP_WORLD + '</p></div>';
      return;
    }
    var h = '<ul class="cr-checks">' + d.checks.map(function (c) { return '<li class="' + (c.ok ? 'ok' : '') + '">' + esc(c.label) + '</li>'; }).join('') + '</ul>';
    var warn = kinds.filter(function (k) { return !GOOD[k] && R.KINDS[k].instead; });
    if (warn.length) h += '<ul class="cr-list cr-draft-marks">' + warn.map(function (k) { var K = R.KINDS[k]; return '<li><strong>' + esc(K.label) + ':</strong> ' + esc(K.instead) + '</li>'; }).join('') + '</ul>';
    if (d.softened) h += '<div class="cr-soft"><p><strong>Same words, less heat</strong> (capitals, stacked punctuation and always/never tidied):</p><p>' + esc(d.softened) + '</p><button type="button" class="cr-btn is-quiet is-small" id="cr-use">Use this wording</button> <button type="button" class="cr-btn is-quiet is-small" id="cr-copy-soft">Copy</button></div>';
    if (warn.length) h += '<div class="cr-soft"><p><strong>Or write it fresh in this shape:</strong></p><p>' + esc(d.shape) + '</p><button type="button" class="cr-btn is-quiet is-small" id="cr-copy-shape">Copy</button></div>';
    else if (!d.softened) h += '<p class="cr-note">Nothing in the wording is likely to add heat. Read it once more as if you were them, then send it when you’re calm.</p>';
    h += '<p style="margin-top:.9rem;"><a class="dig" href="/signal-translator.html">Dig deeper: test one sentence against how the other person is wired</a></p>';
    draftOut.innerHTML = h;
    var use = $('cr-use'); if (use) use.addEventListener('click', function () { draft.value = d.softened; checkDraft(); draft.focus(); });
    var cs = $('cr-copy-soft'); if (cs) cs.addEventListener('click', function () { copy(d.softened, cs); });
    var sh = $('cr-copy-shape'); if (sh) sh.addEventListener('click', function () { copy(d.shape, sh); });
  }
  draft.addEventListener('input', function () { clearTimeout(timer); timer = setTimeout(checkDraft, 250); });

  $('cr-go').addEventListener('click', function () { start(input.value); });
  $('cr-example').addEventListener('click', function () {
    input.value = EXAMPLE; start(EXAMPLE);
    // In the example, read it from Alex's side: the one whose reach-outs came back cold
    state.me = 'Alex'; render(true);
  });
  $('cr-clear').addEventListener('click', function () {
    input.value = ''; draft.value = ''; out.innerHTML = ''; draftOut.innerHTML = ''; draftStep.hidden = true; state = null; input.focus();
  });
})();
