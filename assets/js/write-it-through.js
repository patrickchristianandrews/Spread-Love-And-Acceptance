/* write-it-through.js — "Talk it through in writing" (/write-it-through.html)

   Write it, wait, then send. One message in parts (what happened, how it landed, the ask, what I'm not
   saying, a reply-by time), a gentle check with the Signal Translator's engine (window.SignalEngine,
   public API only: analyze, rewrite, receive, moneyControl, FBY), a cool-off wait, then a private link.

   The link carries the message after the "#letter=" (base64url JSON, the same style as "#list="), so a
   browser never sends it to any website. Opening it shows this page in "Someone wrote to you" mode, with
   a calm way to read it, a "What I heard" step and the same reply builder.

   Kept on this device only, in localStorage 'tol-letters':
     { v:1, cur, prefs:{literal}, draft:{…}, convos:{ id:{ id, me, them, rel, started, turns:[…], agreed:[…] } } }
   Nothing is kept until something is typed, a link is opened or "Plain and literal" is switched on.
   "Erase this conversation" removes one conversation; when none is left the key is removed. */
(function () {
  'use strict';
  var KEY = 'tol-letters', HASH_RE = /#letter=([A-Za-z0-9_-]+)/;
  var doc = document, root = doc.documentElement;
  function $(id) { return doc.getElementById(id); }
  if (!$('write')) return;

  // ---------------------------------------------------------------- small helpers
  function el(tag, attrs, kids) {
    var n = doc.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      var v = attrs[k]; if (v == null || v === false) return;
      if (k === 'text') n.textContent = v; else if (k === 'cls') n.className = v; else n.setAttribute(k, v === true ? '' : v);
    });
    (kids || []).forEach(function (c) { if (c == null) return; n.appendChild(typeof c === 'string' ? doc.createTextNode(c) : c); });
    return n;
  }
  function clean(s, max) { return String(s == null ? '' : s).replace(/\r/g, '').replace(/[ \t]+/g, ' ').trim().slice(0, max || 800); }
  function rid() { var s = ''; for (var i = 0; i < 10; i++) s += 'abcdefghijkmnpqrstuvwxyz23456789'.charAt(Math.floor(Math.random() * 32)); return s; }
  function b64urlEnc(str) {
    var bin = '';
    try { var b = new TextEncoder().encode(str); for (var i = 0; i < b.length; i++) bin += String.fromCharCode(b[i]); } catch (e) { bin = unescape(encodeURIComponent(str)); }
    return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  function b64urlDec(str) {
    var t = String(str || '').replace(/\s+/g, '').replace(/-/g, '+').replace(/_/g, '/');
    while (t.length % 4) t += '=';
    var bin = atob(t);
    try { var a = new Uint8Array(bin.length); for (var i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i); return new TextDecoder().decode(a); }
    catch (e) { return decodeURIComponent(escape(bin)); }
  }
  function lowerFirst(s) { return s ? s.charAt(0).toLowerCase() + s.slice(1) : s; }
  function upperFirst(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }
  function endStop(s) { s = String(s || '').trim(); return !s ? s : /[.!?…”"]$/.test(s) ? s : s + '.'; }
  function copyText(t) {
    if (window.TOLShare && window.TOLShare.copy) return window.TOLShare.copy(t);
    function fallback() {
      var ta = el('textarea', { readonly: true }); ta.value = t; ta.style.position = 'fixed'; ta.style.top = '-1000px';
      doc.body.appendChild(ta); ta.select(); var ok = false; try { ok = doc.execCommand('copy'); } catch (e) {} ta.remove(); return ok;
    }
    if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(t).then(function () { return true; }, function () { return fallback(); });
    return Promise.resolve(fallback());
  }
  function withKit(cb) {
    if (window.TOLShareKit) { cb(window.TOLShareKit); return; }
    var s = el('script', { src: '/assets/js/share-kit.js' }); s.onload = function () { if (window.TOLShareKit) cb(window.TOLShareKit); }; doc.head.appendChild(s);
  }

  // ---------------------------------------------------------------- dates
  var DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  function ymd(d) { return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
  function fromYmd(s) { var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || ''); return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null; }
  function dayName(d) { return DAYS[d.getDay()] + ' ' + d.getDate() + ' ' + MONTHS[d.getMonth()]; }
  function addDays(d, n) { var x = new Date(d.getFullYear(), d.getMonth(), d.getDate()); x.setDate(x.getDate() + n); return x; }
  function dayDiff(d) { var t = new Date(); t = new Date(t.getFullYear(), t.getMonth(), t.getDate()); return Math.round((new Date(d.getFullYear(), d.getMonth(), d.getDate()) - t) / 864e5); }
  function dueFor(p) {
    var now = new Date();
    if (p === 'today') return ymd(now);
    if (p === 'tomorrow') return ymd(addDays(now, 1));
    if (p === 'weekend') return ymd(addDays(now, (7 - now.getDay()) % 7));
    return '';
  }
  // "today", "tomorrow (Tuesday 13 October)", "Friday 16 October"
  function whenWords(dStr) {
    var d = fromYmd(dStr); if (!d) return '';
    var n = dayDiff(d);
    return n === 0 ? 'today' : n === 1 ? 'tomorrow (' + dayName(d) + ')' : dayName(d);
  }
  function stamp(iso) {
    var d = new Date(iso); if (isNaN(d)) return '';
    var h = d.getHours(), m = ('0' + d.getMinutes()).slice(-2), ap = h < 12 ? 'am' : 'pm'; h = h % 12 || 12;
    return DAYS[d.getDay()].slice(0, 3) + ' ' + d.getDate() + ' ' + MONTHS[d.getMonth()].slice(0, 3) + ', ' + h + ':' + m + ap;
  }
  function lateNow() { var h = new Date().getHours(); return h >= 22 || h < 6; }

  // ---------------------------------------------------------------- storage
  var S = load();
  function blank() { return { v: 1, cur: null, prefs: {}, draft: null, convos: {} }; }
  function load() {
    try { var s = JSON.parse(localStorage.getItem(KEY) || 'null'); if (s && s.v === 1 && s.convos && typeof s.convos === 'object') { s.prefs = s.prefs || {}; return s; } } catch (e) {}
    return blank();
  }
  function save() {
    try {
      var empty = !Object.keys(S.convos).length && !S.draft && !S.prefs.literal;
      if (empty) localStorage.removeItem(KEY); else localStorage.setItem(KEY, JSON.stringify(S));
    } catch (e) {}
  }
  function conv() { return S.cur && S.convos[S.cur] || null; }
  function lastTurn(c) { return c && c.turns.length ? c.turns[c.turns.length - 1] : null; }
  function themName(c, poss) { var n = c && c.them; return n ? (poss ? n + '’s' : n) : (poss ? 'their' : 'the other person'); }

  // ---------------------------------------------------------------- what each kind of message asks for
  var REL = { partner: 'Partner', coparent: 'Co-parent or ex', family: 'Family', friend: 'Friend', housemate: 'Housemate', coworker: 'Coworker', group: 'More than one person', other: 'Someone else' };
  var FEELINGS = ['tired', 'rushed', 'frustrated', 'unseen', 'taken for granted', 'overwhelmed', 'stretched thin', 'worried', 'hurt', 'disappointed', 'left out', 'alone with it', 'confused', 'embarrassed', 'annoyed', 'sad', 'on edge', 'hopeful', 'grateful'];
  var SORRY_FEELINGS = ['sorry', 'ashamed', 'regretful', 'embarrassed', 'worried', 'sad', 'hopeful'];
  var NOT_EG = ['I’m not saying you don’t care.', 'I’m not saying it’s all your fault.', 'I’m not angry with you as a person.', 'I’m not asking you to drop everything.', 'I’m not trying to win this. I want us to sort it out.'];
  var ASK_EG = {
    partner: ['Could we agree who does the school run on Wednesdays?', 'Could you tell me when plans change, before the day?', 'Can we talk about this at the weekend, when we’re both rested?'],
    coparent: ['Could we confirm the handover time by text the day before?', 'Can we agree on bedtimes for school nights at both homes?', 'Could you let me know about school events within a day of hearing?'],
    family: ['Could you text before you come over?', 'Can we agree who hosts this year, and next year?', 'Could we keep advice about the kids for when I ask?'],
    friend: ['Could you let me know if you can’t make it, before the day?', 'Can we split the costs evenly from now on?', 'Could we find a time to talk about it properly?'],
    housemate: ['Could we each wash up our own things by bedtime?', 'Can we agree on quiet hours after eleven on weeknights?', 'Could we set up a rota for the bins?'],
    coworker: ['Could we agree one owner for the weekly report?', 'Can we set a time each week to hand over?', 'Could you copy me in when the plan changes?'],
    group: ['Could we each say which job we’ll own by Friday?', 'Can we find one evening to talk about this together?', 'Could we agree how we split shared costs?'],
    other: ['Could we agree on one thing to do differently?', 'Can we talk about this at a calm time this week?', 'Could you let me know what would help from your side?']
  };
  // [label, small text], hint
  var KIND = {
    raise: { write: 'Write it', fact: ['What happened', 'facts only, one thing'], factHint: 'What a camera would have seen. For example: “The rent went in three days late this month.”', feel: 'How it landed for me', feelVerb: 'I felt', ask: ['What I’m asking for', 'one clear ask'], askHint: 'Something they can say yes, no or not yet to.', by: 'When I’d like a reply' },
    reply: { write: 'Write your reply', fact: ['What I’m replying to', 'the one thing, in plain words'], factHint: 'For example: “Your message on Sunday about the holiday plans.”', feel: 'How it landed for me', feelVerb: 'I felt', ask: ['What I’m asking for', 'one clear ask'], askHint: 'Something they can say yes, no or not yet to.', by: 'When I’d like a reply' },
    plan: { write: 'Write the plan', fact: ['What we need to plan', 'one thing'], factHint: 'For example: “Who picks the kids up on Wednesdays from next week.”', feel: 'How I feel about it', feelVerb: 'I feel', ask: ['What I suggest', 'one clear suggestion'], askHint: 'A suggestion they can say yes to, or change.', by: 'When I’d like a reply' },
    sorry: { write: 'Write your apology', fact: ['What I did', 'own it plainly, with no “but”'], factHint: 'For example: “I snapped at you in front of your friends on Saturday.”', feel: 'How I feel about it now', feelVerb: 'I feel', ask: ['What I’ll do differently, or what I’d like to ask', 'optional'], askHint: 'For example: “Next time I’ll say I need a minute, instead of snapping.”', askOptional: true, by: 'When I’d like a reply', feelings: SORRY_FEELINGS,
      note: 'Big apologies are often better said out loud. A short note can open the door: “Can we talk tonight? I owe you an apology.”' },
    pause: { write: 'Ask for a pause', fact: ['What it’s about', 'optional'], factHint: 'For example: “Our talk about money last night.”', factOptional: true, feel: 'How I am right now', feelVerb: 'I feel', ask: ['When I’ll come back to it', 'a time'], askHint: 'A pause with a time is easier to wait through. For example: “Can we pick this up after dinner tomorrow?”', by: 'I’ll come back to it', noRush: false, pauseBy: true,
      note: 'A pause is fine, and often wise. Say when you’ll come back, then come back on time. You can agree a pause plan together once, calmly, on the pause plan page.' }
  };
  var RK = {
    yes: { label: 'Yes', write: 'Say yes', fact: null, feel: null, ask: ['Anything to add?', 'optional'], askHint: 'A word of thanks is plenty. For example: “Thank you for asking so clearly.”', askOptional: true, by: null, not: false,
      note: 'A plain yes is a gift. It goes into “What we agreed” on both phones.' },
    yesand: { label: 'Yes, and…', write: 'Say yes, and add one thing', fact: null, feel: 'How it landed for me', feelVerb: 'I feel', feelOptional: true, ask: ['And…', 'one thing to add'], askHint: 'For example: “And could we look at it again in a month?”', by: 'When I’d like a reply',
      note: 'Your yes goes into “What we agreed”. The “and” is a new ask they can answer.' },
    notyet: { label: 'Not yet, can we…', write: 'Suggest another way', fact: ['What’s getting in the way', 'optional'], factOptional: true, factHint: 'For example: “Wednesdays I finish at six.”', feel: 'How it landed for me', feelVerb: 'I feel', feelOptional: true, ask: ['Can we…', 'what you suggest instead'], askHint: 'For example: “Can we swap: I take Thursdays and you take Wednesdays?”', by: 'When I’d like a reply',
      note: '“Not yet” keeps the door open. Suggest something they can say yes to.' },
    differ: { label: 'I see it differently', write: 'Give your side', fact: ['My side', 'facts only, one thing'], factHint: 'What you saw or knew, without a verdict on them. For example: “I thought we’d agreed I’d pay on the 8th.”', feel: 'How it landed for me', feelVerb: 'I felt', ask: ['What I’m asking for', 'one clear ask'], askHint: 'For example: “Could we write the date down this time, so we both know?”', by: 'When I’d like a reply',
      note: 'Two people can remember the same thing differently. Give your side once, calmly, and ask for one thing.' },
    needtime: { label: 'I need until…', write: 'Ask for time', fact: null, feel: 'How I am right now', feelVerb: 'I feel', feelOptional: true, ask: ['Anything else?', 'optional'], askHint: 'For example: “I want to answer properly, not quickly.”', askOptional: true, by: 'I need until', pauseBy: true, not: true,
      note: 'Taking time is not ignoring someone. Say when, then answer by then.' }
  };
  var BY_WORDS = { today: 'Today', tomorrow: 'Tomorrow', weekend: 'By the weekend', norush: 'No rush' };
  var BY_PAUSE = { today: 'Later today', tomorrow: 'Tomorrow', weekend: 'The weekend' };

  // ---------------------------------------------------------------- safety: fear, threats and control
  // only clear signs (owner's rule, round 10): fear, violence, threats, money, phone or tracking, being cut off from people.
  // A "no" ("my mum won't let me go to the gig", "you're not allowed to go"), "it hurts me", "I'm afraid I can't make it",
  // "the ladder is unsafe" are everyday words, not a safety sign.
  var FEAR_RE = /\b(?:(?:afraid|scared|frightened|terrified) (?:of (?:you|him|her|them|what (?:you|he|she|they)|how (?:angry|mad) (?:you|he|she|they))|to (?:go home|come home|say no|tell (?:you|him|her|them)|leave))\b|(?:i'?m|i am|i feel) (?:so |really )?(?:frightened|terrified)\b|(?:hit|hits|hitting|slapped|punched|kicked|pushed|shoved|choked|strangled|grabbed) (?:me|you|him|her|them|the kids|the children|my)\b|hurts? me (?:physically|badly)\b|threaten(?:ed|s|ing)? (?:to|me|my|the kids)\b|(?:won'?t|doesn'?t|don'?t|never) let me (?:(?:see|talk to|visit|call) (?:my )?(?:friends|family|mum|mom|dad|parents|sister|brother|anyone)|(?:have|use|keep|touch|see) (?:my own |my |any |our )?(?:money|bank card|bank|card|cards|phone|passport|wages|account)|leave the house|get a job|go to work)\b|controls? (?:my|all the|the|our) money|takes? (?:my|away my) (?:phone|money|keys|car|passport|cards?)|checks? my phone|tracks? (?:me|my phone|my location)|or else(?=\s*(?:[.!?…]|$))|i'?ll make you (?:pay|regret|sorry|suffer)|you'?ll regret|kill (?:you|me|him|her)\b(?!.{0,20}(?:😂|🤣|lol|haha))|(?:don'?t|do not) feel safe|not safe (?:at home|with (?:you|him|her|them))|abus(?:e|ed|es|ive|ing)\b)/i;
  var SELF_RE = /\b(?:kill myself|end (?:it all|my life)|don'?t want to (?:be alive|live)|hurt myself|suicid)/i;
  function engine() { var E = window.SignalEngine; return E && typeof E.analyze === 'function' ? E : null; }
  // "Add context" (context-panel.js), optional: the check and the softer lines use it, and say what they took into account
  var witCtx = null, CTX_REL = { partner: 'partner', coparent: 'ex', family: 'family', friend: 'friend', housemate: 'roommate', coworker: 'coworker', group: 'group' };
  function ctxNow() {
    if (!witCtx || !window.TOLContext) return null;
    var c = witCtx.get(), r = doc.querySelector('input[name="wit-rel"]:checked');
    if (!c.people.length && r && CTX_REL[r.value] && !TOLContext.isEmpty(c)) c.people = [{ rel: CTX_REL[r.value] }];
    return TOLContext.isEmpty(c) ? null : c;
  }
  function analyze(text) { var E = engine(); if (!E || !text) return null; try { return E.analyze(text, { channel: 'text', ctx: ctxNow(), mode: 'send' }); } catch (e) { return null; } }
  function safetyOf(text) {
    var out = { fear: false, self: false };
    if (!text) return out;
    if (FEAR_RE.test(text)) out.fear = true;
    if (SELF_RE.test(text)) out.self = true;
    var E = engine(), an = analyze(text);
    if (an) { if (an.control || an.danger) out.fear = true; if (an.selfHarm) out.self = true; }
    try { if (E && E.moneyControl && E.moneyControl(text)) out.fear = true; } catch (e) {}
    return out;
  }
  function safetyNote(s, receiving) {
    var box = el('div', { cls: 'wit-safety-in' });
    if (s.fear) {
      box.appendChild(el('p', null, [el('strong', { text: receiving ? 'If this message frightens you, your safety comes first.' : 'Some of these words sound like you may not feel safe. If so, that matters more than any message.' })]));
      box.appendChild(el('p', { text: receiving
        ? 'You don’t have to reply, and you don’t have to do what it asks to keep the peace. Threats, checking up on you, controlling money or cutting you off from people are not a communication problem.'
        : 'If you’re afraid of them, or they control your money, your phone or who you see, a well-worded message isn’t the fix, and it isn’t your job to talk them round. Your safety is what matters.' }));
    }
    if (s.self) {
      // nohot18: the one safety line, no numbers or names
      box.appendChild(el('p', { text: 'If you’re in danger or might hurt yourself or someone else, contact your local emergency services now, or tell someone you trust nearby.' }));
    }
    return box;
  }

  // ---------------------------------------------------------------- "What I heard": their ask, turned to face you
  var SWAP = { me: 'you', my: 'your', mine: 'yours', myself: 'yourself', i: 'you', "i'm": "you're", "i've": "you've", "i'll": "you'll", "i'd": "you'd",
    you: 'me', your: 'my', yours: 'mine', yourself: 'myself', "you're": "I'm", "you've": "I've", "you'll": "I'll", "you'd": "I'd" };
  // "you" doing something ("and you take Tuesdays") becomes "I"; "you" being done to ("for you") becomes "me"
  var SUBJ_BEFORE = /(?:^|[,:;]\s*|\b(?:and|but|or|so|if|when|then|while|because|that|before|after|until|unless|once|where)\s+)$/i;
  function swap(t) {
    var s = String(t).replace(/[’‘]/g, "'");
    return s.replace(/\b(you're|you've|you'll|you'd|i'm|i've|i'll|i'd|myself|yourself|mine|yours|me|my|your|you|i)\b/gi, function (w, _x, at) {
      var low = w.toLowerCase();
      if (low === 'you' && SUBJ_BEFORE.test(s.slice(0, at))) return 'I';
      return SWAP[low] || w;
    }).replace(/'/g, '’');
  }
  function heardFrom(ask) {
    var s = clean(ask, 400).replace(/[.?!]+$/, ''); if (!s) return '';
    var m;
    if ((m = /^(?:so,?\s*)?(?:could|can|would|will) you (?:please )?(.+)$/i.exec(s)) || (m = /^please,?\s+(.+)$/i.exec(s)) || (m = /^(?:i'?d like|i would like|i want|i'?m asking|i am asking)(?: for)? you to (.+)$/i.exec(s.replace(/’/g, "'"))))
      return 'You’d like me to ' + swap(m[1]) + '.';
    if ((m = /^(?:could|can|shall|should) we (?:please )?(.+)$/i.exec(s)) || (m = /^(?:i'?d like|i would like)(?: for)? us to (.+)$/i.exec(s.replace(/’/g, "'"))) || (m = /^let'?s (.+)$/i.exec(s.replace(/’/g, "'"))))
      return 'You’d like us to ' + swap(m[1]) + '.';
    return 'You’re asking for this: “' + swap(s) + '”.';
  }

  // ---------------------------------------------------------------- the form
  var F = {
    rel: function () { var r = doc.querySelector('input[name="wit-rel"]:checked'); return r ? r.value : 'other'; },
    kind: function () { var r = doc.querySelector('input[name="wit-kind"]:checked'); return r ? r.value : 'raise'; },
    rk: function () { var r = doc.querySelector('input[name="wit-rk"]:checked'); return r ? r.value : ''; },
    by: function () { var r = doc.querySelector('input[name="wit-by"]:checked'); return r ? r.value : 'tomorrow'; }
  };
  var picked = [];          // chosen feeling words
  var mode = 'new';         // 'new' or 'reply'
  var replyTo = null;       // the turn being answered
  var waitTimer = null, dismissed = {}, committed = null;

  function spec() { return mode === 'reply' ? (RK[F.rk()] || RK.differ) : KIND[F.kind()]; }

  function setRadio(name, v) { var r = doc.querySelector('input[name="' + name + '"][value="' + v + '"]'); if (r) r.checked = true; }

  function drawPicks() {
    var sp = spec(), box = $('wit-feelings'); box.textContent = '';
    var list = (sp.feelings || FEELINGS).slice();
    picked.forEach(function (w) { if (list.indexOf(w) < 0) list.unshift(w); });
    list.forEach(function (w) {
      var b = el('button', { type: 'button', cls: 'wit-chip', 'aria-pressed': picked.indexOf(w) >= 0 ? 'true' : 'false', text: w });
      b.addEventListener('click', function () {
        var i = picked.indexOf(w);
        if (i >= 0) picked.splice(i, 1); else picked.push(w);
        b.setAttribute('aria-pressed', i >= 0 ? 'false' : 'true');
        changed();
      });
      box.appendChild(b);
    });
    var eg = $('wit-ask-eg'); eg.textContent = '';
    var asks = mode === 'reply' ? [] : F.kind() === 'pause' ? ['Can we pick this up after dinner tomorrow?', 'Can we come back to it on Saturday morning?', 'I’ll message you by tonight with a time to talk.'] : F.kind() === 'sorry' ? ['Next time I’ll say I need a minute, instead of snapping.', 'Is there anything you need from me?', 'Could we talk about it when you’re ready?'] : (ASK_EG[F.rel()] || ASK_EG.other);
    asks.forEach(function (t) { eg.appendChild(egBtn(t, 'wit-ask')); });
    $('wit-ask-egl').hidden = !asks.length; eg.hidden = !asks.length;
    var ne = $('wit-not-eg'); ne.textContent = '';
    NOT_EG.forEach(function (t) { ne.appendChild(egBtn(t, 'wit-not')); });
  }
  function egBtn(t, target) {
    var b = el('button', { type: 'button', cls: 'wit-chip wit-eg', text: t });
    b.addEventListener('click', function () { var f = $(target); f.value = t; f.focus(); changed(); });
    return b;
  }

  // labels and which parts show, for the kind of message (or the kind of answer)
  function shape() {
    var sp = spec(), c = conv();
    $('wit-step-who').hidden = mode === 'reply';
    $('wit-step-heard').hidden = mode !== 'reply';
    $('wit-groupnote').hidden = !(mode === 'new' && F.rel() === 'group');
    var kn = mode === 'reply' ? $('wit-rknote') : $('wit-kindnote');
    $('wit-kindnote').hidden = true; $('wit-rknote').hidden = true;
    if (sp.note) {
      kn.textContent = sp.note; kn.hidden = false;
      if (mode === 'new' && F.kind() === 'pause') { kn.appendChild(doc.createTextNode(' ')); kn.appendChild(el('a', { href: '/pursue-withdraw.html#plan', text: 'Make a pause plan' })); }
    }
    $('wit-write-h').textContent = sp.write || 'Write it';
    function row(id, part, small, hint, optional) {
      var r = $(id + '-row'); r.hidden = !part; if (!part) return;
      var l = $(id.replace('wit-f-', 'wit-') + '-l');
      if (l) { l.textContent = ''; l.appendChild(doc.createTextNode(part + ' ')); if (small || optional) l.appendChild(el('small', { text: '(' + (small || 'optional') + ')' })); }
      var h = $(id.replace('wit-f-', 'wit-') + '-h'); if (h && hint != null) { h.textContent = hint; h.hidden = !hint; }
    }
    row('wit-f-fact', sp.fact && sp.fact[0], sp.fact && sp.fact[1], sp.factHint || '');
    row('wit-f-feel', sp.feel, sp.feelOptional ? 'optional' : '', null);
    row('wit-f-ask', sp.ask && sp.ask[0], sp.ask && sp.ask[1], sp.askHint || '');
    $('wit-f-not-row').hidden = sp.not === false;
    // the reply-by choice
    var byBox = $('wit-by'); byBox.hidden = !sp.by;
    if (sp.by) {
      $('wit-by-l').textContent = sp.by;
      var words = sp.pauseBy ? BY_PAUSE : BY_WORDS;
      ['today', 'tomorrow', 'weekend'].forEach(function (k) { $('wit-by-' + k).textContent = words[k]; });
      $('wit-by-norush-l').hidden = !!sp.pauseBy;
      if (sp.pauseBy && F.by() === 'norush') setRadio('wit-by', 'tomorrow');
    }
    // names: the first message of a conversation asks for them; later ones use what's kept
    var names = doc.querySelector('.wit-names'); names.hidden = !!(c && mode === 'new' && c.turns.length);
    $('wit-me2').parentNode.hidden = !(mode === 'reply' && c && !c.me);
  }

  // ---------------------------------------------------------------- the message, put together
  function current() {
    var sp = spec(), c = conv(), rk = mode === 'reply' ? F.rk() : '';
    var t = {
      k: mode === 'reply' ? 'answer' : F.kind(), rk: rk,
      rel: mode === 'reply' && c ? c.rel : F.rel(),
      fn: clean(mode === 'reply' ? (c && c.me || $('wit-me2').value) : (c && c.turns.length ? c.me : $('wit-me').value), 40),
      tn: clean(mode === 'reply' ? (c && c.them) : (c && c.turns.length ? c.them : $('wit-them').value), 40),
      h: mode === 'reply' ? clean($('wit-heard').value, 400) : '',
      f: sp.fact ? clean($('wit-fact').value) : '',
      fe: sp.feel ? picked.slice(0, 4) : [],
      fx: sp.feel ? clean($('wit-feelx').value, 500) : '',
      a: sp.ask ? clean($('wit-ask').value, 500) : '',
      ns: sp.not !== false ? clean($('wit-not').value, 300) : '',
      by: null,
      re: mode === 'reply' && replyTo ? clean(replyTo.a, 500) : ''
    };
    if (sp.by) { var p = F.by(); t.by = { p: p, d: dueFor(p), pause: !!sp.pauseBy }; }
    return t;
  }
  function feelLine(t, verb) {
    var w = (t.fe || []).filter(Boolean), s = '';
    if (w.length) s = (verb || 'I felt') + ' ' + (w.length > 1 ? w.slice(0, -1).join(', ') + ' and ' + w[w.length - 1] : w[0]) + '.';
    if (t.fx) s = (s ? s + ' ' : '') + endStop(upperFirst(t.fx));
    return s;
  }
  function specOf(t) { return t.rk ? (RK[t.rk] || RK.differ) : (KIND[t.k] || KIND.raise); }
  function byLine(t) {
    if (!t.by) return '';
    if (t.by.p === 'norush') return 'No rush.';
    var w = whenWords(t.by.d); if (!w) return '';
    return t.by.pause ? w.charAt(0).toUpperCase() + w.slice(1) + '.' : 'By ' + w + '.';
  }
  // the parts, in order: [label, text]
  function parts(t, forReader) {
    var sp = specOf(t), out = [];
    if (t.rk) {
      if (t.h) out.push(['What I heard', t.h]);
      out.push(['My answer', { yes: 'Yes.', yesand: 'Yes, and I’d like to add one thing.', notyet: 'Not yet. Here’s what I suggest instead.', differ: 'I see it differently. Here’s my side.', needtime: 'I need some time before I answer.' }[t.rk] || '']);
    } else if (t.k === 'sorry') out.push(['', 'I want to say sorry.']);
    else if (t.k === 'pause') out.push(['', 'I need a pause.']);
    if (t.f && sp.fact) out.push([sp.fact[0], t.f]);
    var fl = sp.feel ? feelLine(t, sp.feelVerb) : '';
    if (fl) out.push([forReader && sp.feel === 'How it landed for me' ? 'How it landed for them' : sp.feel, fl]);
    if (t.a && sp.ask) out.push([sp.ask[0].replace(/\?$/, ''), t.a]);
    if (t.ns) out.push(['What I’m not saying', t.ns]);
    var b = byLine(t);
    if (b && sp.by) out.push([sp.by, b]);
    return out;
  }
  function plainText(t) {
    var lines = [];
    if (t.tn) lines.push('Hi ' + t.tn + ',', '');
    parts(t).forEach(function (p) { lines.push(p[0] ? p[0] + ': ' + p[1] : p[1]); });
    if (t.fn) lines.push('', '– ' + t.fn);
    return lines.join('\n');
  }
  function prose(t) { return [t.f, feelLine(t, specOf(t).feelVerb), t.a, t.ns, t.h].filter(Boolean).join(' '); }
  // what still needs filling in before it can be sent
  function missing(t) {
    var out = [];
    if (mode === 'reply' && !t.rk) return ['your answer (Yes, Not yet…)'];
    var sp = specOf(t);
    if (sp.fact && !sp.factOptional && !t.f) out.push('“' + sp.fact[0] + '”');
    if (sp.ask && !sp.askOptional && !t.a) out.push('“' + sp.ask[0] + '”');
    return out;
  }
  function ready(t) { return !missing(t).length; }

  // ---------------------------------------------------------------- the gentle check
  var IGNORE = { nowhen: 1, period: 1, long: 1, multi: 1 };
  var YOU_RE = /\byou(?:'re|’re| are)?\s+(?:always|never|don'?t care|don’t care|didn'?t care|didn’t care|made me|make me|ruin(?:ed)?|only think|never listen|don'?t listen|don’t listen)\b|\byou(?:'re|’re| are) (?:so )?(?:selfish|lazy|useless|impossible|ridiculous|crazy|pathetic|unbelievable)\b/i;
  function flagsIn(text) {
    var an = analyze(text), out = [];
    if (!an) {
      var m = text.match(/\b(always|never|every single time)\b/gi); if (m) out.push({ name: 'Big words like always or never', words: m });
      if (/\b[A-Z]{4,}\b/.test(text)) out.push({ name: 'All caps', words: text.match(/\b[A-Z]{4,}\b/g) });
      return { an: null, flags: out };
    }
    var E = engine(), FBY = E.FBY || {}, by = {};
    (an.spans || []).forEach(function (sp) {
      var f = FBY[sp.f]; if (!f || f.kind !== 'static' || IGNORE[sp.f]) return;
      var w = (an.text || text).slice(sp.s, sp.e); if (!w.trim()) return;
      (by[sp.f] = by[sp.f] || { name: f.name || sp.f, words: [] });
      if (by[sp.f].words.indexOf(w) < 0) by[sp.f].words.push(w);
    });
    (an.staticIds || []).forEach(function (id) { if (!by[id] && !IGNORE[id] && FBY[id]) by[id] = { name: FBY[id].name || id, words: [] }; });
    Object.keys(by).forEach(function (k) { out.push(by[k]); });
    return { an: an, flags: out };
  }
  function suggestFor(an, text, field, rel) {
    var E = engine(); if (!E || !an || typeof E.rewrite !== 'function') return '';
    if (!(an.staticIds || []).some(function (id) { return !IGNORE[id]; })) return '';
    var r; try { r = E.rewrite(an, { channel: rel === 'group' ? 'group' : 'text', rel: rel }); } catch (e) { return ''; }
    if (!r || r.unchanged || !r.primary || !r.primary.text) return '';
    var s = String(r.primary.text).trim();
    // the ask has its own box: the other parts keep to their own job
    if (field !== 'wit-ask') {
      var ss = (s.match(/[^.!?]+[.!?]*/g) || []).map(function (x) { return x.trim(); }).filter(function (x) { return x && !/^(?:could|can|would|will) (?:you|we)\b/i.test(x); });
      s = ss.join(' ').trim();
    }
    if (!s || s.replace(/\W/g, '').toLowerCase() === text.replace(/\W/g, '').toLowerCase()) return '';
    return s;
  }
  function houseRules(t, all) {
    var sp = specOf(t), fact = t.f || '', txt = prose(t), an = all.an, has = function (id) { return !!(an && an.found && an.found[id]); };
    var sentences = fact ? fact.split(/[.!?]+\s/).filter(function (x) { return x.trim(); }).length : 0;
    var rows = [];
    if (sp.fact && fact) rows.push([sentences <= 3 && !/\b(and another thing|on top of that|while we'?re at it|and also|plus,)\b/i.test(fact), 'One topic', 'This looks like more than one thing. Keep one; the rest can have its own message later.']);
    rows.push([!['label', 'contempt', 'critic', 'dxlabel', 'motive'].some(has), 'Facts, not verdicts', 'A word here judges the person. Say what happened instead.']);
    rows.push([!has('absolute') && !/\b(always|never)\b/i.test(txt), 'No always or never', '“Always” and “never” invite an argument about the count. Name this one time.']);
    rows.push([!has('sarcasm') && !has('shout') && !has('caps') && !(an && an.allCaps) && !/\b[A-Z]{4,}\b/.test(txt), 'No sarcasm or ALL CAPS', 'Capitals and sarcasm read as shouting. Plain words land softer.']);
    rows.push([!YOU_RE.test(txt) && !['madefeel', 'blameq'].some(has), 'No “you” accusations', 'Try “I felt…” instead of “you made me…” or “you don’t care”.']);
    if (sp.ask && !sp.askOptional) rows.push([!!t.a, 'Says what you’re asking for', 'Add one clear ask, so they know what you’d like.']);
    if (sp.by) rows.push([!!t.by, 'A reply-by time', 'Choose when you’d like a reply.']);
    return rows;
  }

  function renderCheck() {
    var t = current(), pv = $('wit-preview'), ck = $('wit-check'), sf = $('wit-safety');
    pv.textContent = '';
    var anyText = !!prose(t);
    if (!anyText) pv.appendChild(el('p', { cls: 'wit-muted', text: 'Your message will appear here as you write.' }));
    else {
      if (t.tn) pv.appendChild(el('p', { text: 'Hi ' + t.tn + ',' }));
      parts(t).forEach(function (p) { pv.appendChild(el('p', null, p[0] ? [el('strong', { text: p[0] + ': ' }), p[1]] : [p[1]])); });
      if (t.fn) pv.appendChild(el('p', { text: '– ' + t.fn }));
    }
    // safety first: no "talk them round" lines when someone may be afraid
    var safe = safetyOf(prose(t));
    // crisis or fear typed into the context is never ignored
    var cxr = ctxNow() ? TOLContext.read(ctxNow(), { text: prose(t), mode: 'send' }) : null;
    if (cxr && cxr.safety === 'crisis') safe.self = true; else if (cxr && cxr.safety) safe.fear = true;
    sf.textContent = ''; sf.hidden = !(safe.fear || safe.self);
    if (!sf.hidden) sf.appendChild(safetyNote(safe, false));
    ck.textContent = '';
    if (!anyText) { $('wit-asthem-out').hidden = true; return; }
    var all = flagsIn(prose(t));
    var ul = el('ul', { cls: 'wit-rules-check' });
    houseRules(t, all).forEach(function (r) {
      ul.appendChild(el('li', { cls: r[0] ? 'is-ok' : 'is-look' }, [el('span', { cls: 'wit-mark', 'aria-hidden': 'true', text: r[0] ? '✓' : '•' }), el('span', { cls: 'sr-only', text: r[0] ? 'Looks good: ' : 'Worth a look: ' }), el('strong', { text: r[1] }), r[0] ? '' : ' ' + r[2]]));
    });
    ck.appendChild(el('p', { cls: 'wit-check-h', text: 'House rules' }));
    ck.appendChild(ul);
    if (cxr) { cxr = TOLContext.read(ctxNow(), { an: all.an, text: prose(t), mode: 'send', engine: engine() }); var cxd = el('div'); cxd.innerHTML = TOLContext.usedHTML(cxr); ck.appendChild(cxd); }
    if (safe.fear || safe.self) return;
    // flagged words and a softer line, field by field
    var fields = [['wit-fact', t.f], ['wit-feelx', t.fx], ['wit-ask', t.a], ['wit-not', t.ns], ['wit-heard', t.h]];
    var shown = 0;
    fields.forEach(function (fd) {
      var text = fd[1]; if (!text) return;
      var res = flagsIn(text); if (!res.flags.length) return;
      var box = el('div', { cls: 'wit-flag' });
      var words = [];
      res.flags.forEach(function (f) { words.push(f.words.length ? f.words.map(function (w) { return '“' + w + '”'; }).join(', ') + ' (' + lowerFirst(f.name) + ')' : lowerFirst(f.name)); });
      box.appendChild(el('p', null, [el('strong', { text: 'May land harder than you mean: ' }), words.join('; ') + '.']));
      var sug = dismissed[fd[0] + '|' + text] ? '' : suggestFor(res.an, text, fd[0], t.rel);
      if (sug) {
        box.appendChild(el('p', { cls: 'wit-sug' }, [el('span', { cls: 'wit-sug-l', text: 'A softer way to say it: ' }), el('q', { text: sug })]));
        if (/\[[^\]]+\]|\([^)]*\)/.test(sug)) box.appendChild(el('p', { cls: 'wit-muted', text: 'Fill in the parts in brackets with your own words.' }));
        var use = el('button', { type: 'button', cls: 'wit-btn is-small', text: 'Use this' });
        var keep = el('button', { type: 'button', cls: 'wit-btn is-small is-quiet', text: 'Keep mine' });
        use.addEventListener('click', function () { $(fd[0]).value = sug; changed(); $(fd[0]).focus(); });
        keep.addEventListener('click', function () { dismissed[fd[0] + '|' + text] = 1; renderCheck(); });
        box.appendChild(el('p', { cls: 'wit-acts' }, [use, ' ', keep]));
      }
      ck.appendChild(box); shown++;
    });
    if (!shown) ck.appendChild(el('p', { cls: 'wit-ok', text: engine() ? 'No sharp words found. It reads as calm and clear.' : 'The word check isn’t available right now, but the house rules above still help.' }));
    if (!$('wit-asthem-out').hidden) renderAsThem();
  }

  function renderAsThem() {
    var out = $('wit-asthem-out'), t = current(), E = engine(); out.textContent = '';
    var safe = safetyOf(prose(t));
    if (safe.fear || safe.self) { out.appendChild(safetyNote(safe, false)); return; }
    if (!prose(t)) { out.appendChild(el('p', { text: 'Write something first, then read it as them.' })); return; }
    out.appendChild(el('p', { cls: 'wit-check-h', text: 'How it may land for ' + (t.tn || 'them') }));
    var r = null; try { if (E && E.receive) r = E.receive(analyze(prose(t))); } catch (e) { r = null; }
    if (!r) { out.appendChild(el('p', { text: 'Read it slowly, as if you were them, after a long day. What do you hear first? If it’s the ask, it’s ready.' })); return; }
    out.appendChild(el('p', null, [el('strong', { text: r.head && r.head[1] || '' })]));
    var ul = el('ul'); (r.meanings || []).slice(0, 3).forEach(function (m) { ul.appendChild(el('li', { text: m })); });
    if (ul.children.length) out.appendChild(ul);
    out.appendChild(el('p', { cls: 'wit-muted', text: 'This is a guess from the words alone. It can’t hear tone or know your history.' }));
  }

  // ---------------------------------------------------------------- drafts
  function saveDraft() {
    var t = current();
    var has = prose(t) || $('wit-them').value.trim() || $('wit-me').value.trim();
    if (!has && !(S.draft && S.draft.waitUntil)) { if (S.draft) { S.draft = null; save(); } return; }
    S.draft = { mode: mode, c: S.cur, replyId: replyTo ? replyTo.id : '', rel: F.rel(), kind: F.kind(), rk: F.rk(), me: $('wit-me').value, them: $('wit-them').value, me2: $('wit-me2').value,
      heard: $('wit-heard').value, fact: $('wit-fact').value, fe: picked.slice(), fx: $('wit-feelx').value, ask: $('wit-ask').value, not: $('wit-not').value, by: F.by(),
      waitUntil: S.draft && S.draft.waitUntil || 0, waitMode: S.draft && S.draft.waitMode || '', readyToSend: !!(S.draft && S.draft.readyToSend), saved: new Date().toISOString() };
    save();
  }
  function fillFrom(d) {
    if (!d) return;
    setRadio('wit-rel', d.rel || 'other'); setRadio('wit-kind', d.kind || 'raise'); if (d.rk) setRadio('wit-rk', d.rk); setRadio('wit-by', d.by || 'tomorrow');
    $('wit-me').value = d.me || ''; $('wit-them').value = d.them || ''; $('wit-me2').value = d.me2 || '';
    $('wit-heard').value = d.heard || ''; $('wit-fact').value = d.fact || ''; $('wit-feelx').value = d.fx || ''; $('wit-ask').value = d.ask || ''; $('wit-not').value = d.not || '';
    picked = Array.isArray(d.fe) ? d.fe.slice(0, 6) : [];
    lastPickKey = '';
  }
  function clearForm() {
    ['wit-heard', 'wit-fact', 'wit-feelx', 'wit-ask', 'wit-not', 'wit-me2'].forEach(function (id) { $(id).value = ''; });
    if (!conv()) { $('wit-me').value = ''; $('wit-them').value = ''; }
    picked = []; lastPickKey = ''; doc.querySelectorAll('input[name="wit-rk"]').forEach(function (r) { r.checked = false; });
    setRadio('wit-kind', 'raise'); setRadio('wit-by', 'tomorrow');
    dismissed = {};
    S.draft = null; stopWait(); save();
  }

  var tick = null;
  function mountCtx() {
    if (witCtx || !window.TOLContext || !$('wit-ctx')) return;
    witCtx = TOLContext.mount($('wit-ctx'), { mode: 'send', onChange: function () { renderCheck(); } });
  }
  function changed() {
    shape(); drawPicksIfNeeded();
    clearTimeout(tick); tick = setTimeout(function () { renderCheck(); saveDraft(); }, 250);
  }
  var lastPickKey = '';
  function drawPicksIfNeeded() { var k = mode + '|' + F.kind() + '|' + F.rk() + '|' + F.rel(); if (k !== lastPickKey) { lastPickKey = k; drawPicks(); } }

  // ---------------------------------------------------------------- wait, then send
  function stopWait() { clearInterval(waitTimer); waitTimer = null; $('wit-timer').hidden = true; }
  function showSend(on) {
    $('wit-step-send').hidden = !on;
    $('wit-skip').hidden = !!on;
    $('wit-latenote').hidden = !(on && lateNow());
  }
  function startWait(kind) {
    var now = Date.now(), until;
    if (kind === 'sleep') { var d = new Date(); var m = new Date(d.getFullYear(), d.getMonth(), d.getDate() + (d.getHours() < 5 ? 0 : 1), 7, 0, 0); until = m.getTime(); }
    else until = now + (+kind) * 60000;
    S.draft = S.draft || {}; saveDraft();
    S.draft.waitUntil = until; S.draft.waitMode = kind; S.draft.readyToSend = false; save();
    showSend(false); runWait();
    var tt = $('wit-timer-t'); tt.setAttribute('aria-live', 'polite');
  }
  function runWait() {
    var d = S.draft; if (!d || !d.waitUntil) return;
    var box = $('wit-timer'), tt = $('wit-timer-t'); box.hidden = false;
    function step() {
      var left = d.waitUntil - Date.now();
      if (left <= 0) {
        stopWait(); d.waitUntil = 0; d.readyToSend = true; save();
        box.hidden = false; tt.textContent = 'The wait is over. Read it once more. If it still feels right, send it.';
        showSend(true); return;
      }
      if (d.waitMode === 'sleep') tt.textContent = 'Sleeping on it. Your draft is kept on this device. Come back in the morning and read it with fresh eyes.';
      else { var mins = Math.ceil(left / 60000); tt.textContent = mins > 1 ? 'About ' + mins + ' minutes to go. Skip whenever you’re ready.' : 'Less than a minute to go.'; }
    }
    clearInterval(waitTimer); step(); if (d.waitUntil) waitTimer = setInterval(step, 1000);
  }

  // the link and the turn it carries
  function payload(t, c, id, n) {
    var p = { t: 'tol-letter', v: 1, c: c.id, i: id, n: n, at: new Date().toISOString(), rel: t.rel, k: t.k };
    ['rk', 'fn', 'tn', 'h', 'f', 'fx', 'a', 'ns', 're'].forEach(function (k) { if (t[k]) p[k] = t[k]; });
    if (t.fe && t.fe.length) p.fe = t.fe;
    if (t.by) p.by = t.by;
    if (t.lk) p.lk = t.lk;
    return p;
  }
  // "#together=…" (collab.js: squeezed, the site's shared format for two-person tools) where it's loaded;
  // the older "#letter=…" otherwise. Both open here.
  function linkFor(p) {
    var C = window.TOLCollab;
    if (C && C.wrap) { try { return C.wrap('letter', p, { page: location.pathname, name: p.fn || '' }); } catch (e) {} }
    return location.origin + location.pathname + '#letter=' + b64urlEnc(JSON.stringify(p));
  }
  function isLetterHash(h) {
    if (HASH_RE.test(h || '')) return true;
    var C = window.TOLCollab; if (!C || !/#together=/.test(h || '')) return false;
    var env = C.read(h); return !env || env.t === 'letter';
  }
  // the message becomes a turn in the conversation the first time it's sent, copied or shown as a code
  function commit() {
    if (committed) return committed;
    var t = current(); if (!ready(t)) return null;
    var c = conv();
    if (!c) {
      c = { id: rid(), me: t.fn, them: t.tn, rel: t.rel, started: new Date().toISOString(), turns: [], agreed: [] };
      S.convos[c.id] = c;
    } else { if (t.fn && !c.me) c.me = t.fn; }
    S.cur = c.id;
    var id = rid(), n = c.turns.length + 1;
    if (t.rk === 'yes' || t.rk === 'yesand') t.lk = ymd(addDays(new Date(), 14));
    var p = payload(t, c, id, n), link = linkFor(p);
    var turn = turnFrom(p, 'me'); turn.link = link;
    c.turns.push(turn);
    if ((t.rk === 'yes' || t.rk === 'yesand') && t.re) agree(c, t.re, t.lk, turn.at, c.them, c.me);
    S.draft = null; save();
    committed = { turn: turn, link: link, text: plainText(t) };
    return committed;
  }
  function turnFrom(p, who) {
    var t = { id: p.i, n: p.n, who: who, at: p.at, k: p.k, rk: p.rk || '', h: p.h || '', f: p.f || '', fe: p.fe || [], fx: p.fx || '', a: p.a || '', ns: p.ns || '', by: p.by || null, re: p.re || '', fn: p.fn || '', tn: p.tn || '' };
    return t;
  }
  // asked: who asked for it, yes: who said yes (names as this device knows them; '' for "you")
  function agree(c, text, look, at, asked, yes) {
    text = clean(text, 500); if (!text) return;
    if (c.agreed.some(function (x) { return x.text === text; })) return;
    c.agreed.push({ text: text, at: at || new Date().toISOString(), look: look || ymd(addDays(new Date(), 14)), asked: clean(asked, 40), yes: clean(yes, 40) });
  }

  function say(msg) { var st = $('wit-status'); st.textContent = ''; setTimeout(function () { st.textContent = msg; }, 30); }
  function sendVia(how, sentBox) {
    var cm = commit();
    if (!cm) { var ms = missing(current()); say('Before it can go, fill in ' + ms.join(' and ') + '.'); return; }
    act(how, cm.turn, cm.link, cm.text);
    afterSend();
  }
  function act(how, turn, link, text) {
    var c = conv(), to = c && c.them;
    if (how === 'share') {
      var msg = 'I wrote this down so I could say it calmly. It opens on a private page, and nothing is stored online.';
      // the "Send by" buttons the site's other two-person tools use (QR code, text message, email, apps, copy)
      if (window.TOLCollab && window.TOLCollab.sendSheet) window.TOLCollab.sendSheet({ heading: 'Send your message', url: link, title: to ? 'A message for ' + to : 'A message for you', text: msg, who: to, subject: to ? 'A message for ' + to : 'A message for you',
        qrNote: 'For a phone in the same room. It opens the message on a private page there.' });
      else if (window.TOLShareKit && window.TOLShareKit.shareText) window.TOLShareKit.shareText({ title: to ? 'A message for ' + to : 'A message for you', text: msg, url: link, heading: 'Send your message' });
      else if (window.TOLShare && window.TOLShare.share) window.TOLShare.share({ title: 'A message for you', text: msg, url: link, private: true });
      else copyText(link).then(function (ok) { say(ok ? 'Link copied. Paste it into a message to them.' : 'Couldn’t copy here.'); });
    } else if (how === 'link') {
      copyText(link).then(function (ok) { say(ok ? 'Link copied. Paste it into a message to ' + (to || 'them') + '.' : 'Couldn’t copy here. Try “Send the link”.'); });
    } else if (how === 'text') {
      copyText(text).then(function (ok) { say(ok ? 'Message copied as plain text.' : 'Couldn’t copy here.'); });
    } else if (how === 'qr') {
      withKit(function (K) { K.showQR(link, { title: 'Scan to open the message', note: 'For a phone in the same room. Copy link is the backup.' }); });
    }
  }
  function afterSend() {
    renderAll();
    var c = conv();
    say('Saved in your conversation below. Waiting for ' + themName(c, true) + ' reply' + (committed.turn.by && committed.turn.by.d && committed.turn.by.p !== 'norush' && !committed.turn.by.pause ? ', by ' + whenWords(committed.turn.by.d) : '') + '.');
  }

  // ---------------------------------------------------------------- receiving a link
  var inbox = null;   // {turn, conv, note}
  function readHash() {
    var m = HASH_RE.exec(location.hash || ''), p = null, C = window.TOLCollab;
    if (!m && C && /#together=/.test(location.hash || '')) {
      var env = C.read(location.hash);
      if (env && env.t !== 'letter') return false;   // for another tool
      p = env && env.x && typeof env.x === 'object' ? env.x : null;
      m = [''];
    }
    if (!m) return false;
    if (m[1]) try { if (m[1].length < 20000) p = JSON.parse(b64urlDec(m[1])); } catch (e) { p = null; }
    try { history.replaceState(null, '', location.pathname + location.search + '#wit-inbox'); } catch (e) {}
    if (!p || p.t !== 'tol-letter' || typeof p.c !== 'string' || typeof p.i !== 'string') { inbox = { bad: true }; return true; }
    // only plain text, trimmed, from a link
    var q = { t: 'tol-letter', c: clean(p.c, 20), i: clean(p.i, 20), n: Math.max(1, Math.min(999, parseInt(p.n, 10) || 1)), at: isNaN(new Date(p.at)) ? new Date().toISOString() : new Date(p.at).toISOString(),
      rel: REL[p.rel] ? p.rel : 'other', k: KIND[p.k] || p.k === 'answer' ? p.k : 'raise', rk: RK[p.rk] ? p.rk : '', fn: clean(p.fn, 40), tn: clean(p.tn, 40), h: clean(p.h, 400), f: clean(p.f), fx: clean(p.fx, 500), a: clean(p.a, 500), ns: clean(p.ns, 300), re: clean(p.re, 500),
      fe: Array.isArray(p.fe) ? p.fe.slice(0, 6).map(function (x) { return clean(x, 30); }).filter(Boolean) : [], lk: fromYmd(p.lk) ? p.lk : '' };
    if (p.by && typeof p.by === 'object') q.by = { p: BY_WORDS[p.by.p] ? p.by.p : 'norush', d: fromYmd(p.by.d) ? p.by.d : '', pause: !!p.by.pause };
    var c = S.convos[q.c];
    var known = c && c.turns.filter(function (x) { return x.id === q.i; })[0];
    if (known) { S.cur = c.id; save(); inbox = { turn: known, conv: c, mine: known.who === 'me', again: known.who !== 'me' }; return true; }
    if (!c) { c = { id: q.c, me: q.tn, them: q.fn, rel: q.rel, started: q.at, turns: [], agreed: [] }; S.convos[c.id] = c; }
    else { if (q.fn) c.them = q.fn; if (q.tn && !c.me) c.me = q.tn; }
    var turn = turnFrom(q, 'them');
    c.turns.push(turn);
    c.turns.sort(function (a, b) { return (a.n - b.n) || (new Date(a.at) - new Date(b.at)); });
    if ((q.rk === 'yes' || q.rk === 'yesand') && q.re) agree(c, q.re, q.lk, q.at, c.me, c.them);
    S.cur = c.id;
    // a draft for another conversation stays where it was; a new letter starts the reply fresh
    if (S.draft && S.draft.c !== c.id) S.draft = null;
    if (S.draft && S.draft.mode === 'reply') S.draft = null;
    save();
    inbox = { turn: turn, conv: c };
    return true;
  }

  function helpBlock(soft, steps) {
    var d = el('div', { cls: 'wit-help' });
    var ul = el('ul', { cls: 'wit-soft' }); soft.forEach(function (s) { ul.appendChild(el('li', { text: s })); });
    var ol = el('ol', { cls: 'wit-lit' }); steps.forEach(function (s) { ol.appendChild(el('li', { text: s })); });
    d.appendChild(ul); d.appendChild(ol); return d;
  }
  function messageCard(t, forReader) {
    var dl = el('dl', { cls: 'wit-parts' });
    parts(t, forReader).forEach(function (p) {
      if (!p[0]) { dl.appendChild(el('div', { cls: 'wit-part is-lead' }, [el('dd', { text: p[1] })])); return; }
      dl.appendChild(el('div', { cls: 'wit-part' }, [el('dt', { text: p[0] }), el('dd', { text: p[1] })]));
    });
    return dl;
  }
  function listenBtn(target) {
    var b = el('button', { type: 'button', cls: 'wit-btn is-quiet', text: 'Read it aloud', 'aria-pressed': 'false' });
    b.addEventListener('click', function () { readAloud(target(), b); });
    return b;
  }
  function readAloud(node, btn) {
    if (window.TOLListen && window.TOLListen.ok && window.TOLListen.read) { window.TOLListen.read(node, btn); return; }
    if ('speechSynthesis' in window) {
      try { speechSynthesis.cancel(); var u = new SpeechSynthesisUtterance(node.innerText || node.textContent); u.rate = 0.95; speechSynthesis.speak(u); } catch (e) {}
      return;
    }
    say('This device has no voice to read with. Try reading it slowly, out loud, yourself.');
  }

  function renderInbox() {
    var box = $('wit-inbox'); box.textContent = '';
    if (!inbox) { box.hidden = true; return; }
    box.hidden = false;
    if (inbox.bad) {
      box.appendChild(el('h2', { id: 'wit-inbox-h', text: 'That link looks incomplete' }));
      box.appendChild(el('p', { text: 'Part of the message may have been cut off when it was copied. Ask them to send the link again, or to copy the message as plain text.' }));
      return;
    }
    var t = inbox.turn, c = inbox.conv, who = c.them || 'Someone';
    if (inbox.mine) {
      box.appendChild(el('h2', { id: 'wit-inbox-h', text: 'This is the message you sent' }));
      box.appendChild(el('p', { text: 'It’s already in your conversation below. When ' + themName(c) + ' replies, their link will open here too.' }));
      box.appendChild(messageCard(t));
      return;
    }
    box.appendChild(el('h2', { id: 'wit-inbox-h', text: t.rk ? who + ' replied to you' : who + ' wrote to you' }));
    if (inbox.again) box.appendChild(el('p', { cls: 'wit-muted', text: 'You’ve opened this one before. It’s already in your conversation below.' }));
    var dueW = t.by && t.by.d && t.by.p !== 'norush' && !t.by.pause ? whenWords(t.by.d) : '';
    var safe = safetyOf(prose(t));
    if (safe.fear || safe.self) box.appendChild(el('div', { cls: 'wit-safety', role: 'note' }, [safetyNote(safe, true)]));
    box.appendChild(el('h3', { text: 'How to read this' }));
    box.appendChild(helpBlock([
      'Read it twice, slowly. The second time, it usually sounds calmer.',
      'Look for the ask. That’s the part they’d like an answer to.',
      'Assume they want things to go better between you. That’s why they wrote it this way.',
      dueW ? 'You don’t have to reply now. They asked for a reply by ' + dueW + '.' : 'You don’t have to reply now. Take the time you need.'
    ], [
      'Read the whole message once.',
      'Read it a second time.',
      'Find the part called “' + (specOf(t).ask ? specOf(t).ask[0].replace(/\?$/, '') : 'What I’m asking for') + '”. That is what they want an answer to.',
      dueW ? 'You do not need to answer now. Answer by ' + dueW + '.' : 'You do not need to answer now.'
    ]));
    if (t.re) box.appendChild(el('p', { cls: 'wit-re' }, [el('strong', { text: 'Answering your ask: ' }), '“' + t.re + '”']));
    var card = messageCard(t, true);
    box.appendChild(el('div', { cls: 'wit-letter' }, [card]));
    box.appendChild(el('p', { cls: 'wit-acts' }, [listenBtn(function () { return card; })]));
    if ((t.rk === 'yes' || t.rk === 'yesand') && t.re) box.appendChild(el('p', { cls: 'wit-agreed-note' }, ['They said yes. It’s added to ', el('a', { href: '#agreed', text: 'What we agreed' }), '.']));
    // a kinder way to read any sharp words (never when it may be a threat or control)
    if (!safe.fear && !safe.self) {
      var r = null, E = engine(); try { if (E && E.receive) r = E.receive(analyze(prose(t))); } catch (e) { r = null; }
      if (r && r.head && r.head[0] !== 'ok' && r.meanings && r.meanings.length) {
        var det = el('details', { cls: 'wit-kind' }, [el('summary', { text: 'If some of it stings: a kinder way to read it' })]);
        var ul = el('ul'); r.meanings.slice(0, 3).forEach(function (m) { ul.appendChild(el('li', { text: m })); }); det.appendChild(ul);
        box.appendChild(det);
      }
    }
    var go = el('button', { type: 'button', cls: 'wit-btn', text: safe.fear ? 'Reply, only if it feels safe' : t.rk === 'yes' ? 'Add something (optional)' : 'Write my reply' });
    go.addEventListener('click', function () { startReply(); var w = $('write'); w.scrollIntoView({ block: 'start' }); setTimeout(function () { ($('wit-step-heard').hidden ? $('wit-fact') : $('wit-heard')).focus({ preventScroll: true }); }, 50); });
    box.appendChild(el('p', { cls: 'wit-acts' }, [go]));
    if (t.rk === 'yes') box.appendChild(el('p', { cls: 'wit-muted', text: 'Nothing more is needed. You can still add something if you’d like.' }));
  }

  // ---------------------------------------------------------------- the composer's mode
  function startReply() {
    var c = conv(), last = lastTurn(c);
    if (!c || !last || last.who !== 'them') { mode = 'new'; replyTo = null; shape(); return; }
    committed = null;
    mode = 'reply'; replyTo = last;
    if (!$('wit-heard').value.trim() || (S.draft && S.draft.replyId !== last.id)) $('wit-heard').value = last.a ? heardFrom(last.a) : '';
    if (!F.rk()) { /* the person chooses */ }
    renderComposer();
    changed();
  }
  function renderComposer() {
    var c = conv(), last = lastTurn(c), wn = $('wit-waitnote');
    var steps = ['wit-step-who', 'wit-step-heard', 'wit-step-write', 'wit-step-check', 'wit-step-wait'];
    $('wit-new').hidden = !c;
    if (committed) {
      steps.forEach(function (id) { $(id).hidden = true; }); $('wit-step-send').hidden = false;
      wn.hidden = false; wn.textContent = 'Sent. You can share the same link again below, or from your conversation.';
      $('wit-skip').hidden = true; $('wit-clear').hidden = true;
      var more = $('wit-more');
      if (!more) {
        more = el('p', { cls: 'wit-acts', id: 'wit-more' });
        var b = el('button', { type: 'button', cls: 'wit-btn is-quiet', text: 'Write another message' });
        b.addEventListener('click', function () { committed = null; clearForm(); mode = 'new'; replyTo = null; renderAll(); $('wit-fact').focus(); });
        more.appendChild(b); $('wit-step-send').appendChild(more);
      }
      more.hidden = false;
      return;
    }
    if ($('wit-more')) $('wit-more').hidden = true;
    $('wit-clear').hidden = false;
    steps.forEach(function (id) { $(id).hidden = false; });
    if (last && last.who === 'them' && last.rk !== 'yes') { if (mode !== 'reply') { mode = 'reply'; replyTo = last; if (!$('wit-heard').value.trim()) $('wit-heard').value = last.a ? heardFrom(last.a) : ''; } }
    else if (mode === 'reply' && !(last && last.who === 'them')) { mode = 'new'; replyTo = null; }
    if (mode === 'reply') {
      wn.hidden = false; wn.textContent = 'You’re replying to ' + themName(c) + '. Take your time.';
    } else if (last && last.who === 'me') {
      wn.hidden = false; wn.textContent = 'You’re waiting for ' + themName(c, true) + ' reply. Anything you write here is added to the same conversation. To talk about something else, start a new conversation.';
    } else if (last && last.who === 'them' && last.rk === 'yes') {
      wn.hidden = false; wn.textContent = themName(c).replace(/^./, function (x) { return x.toUpperCase(); }) + ' said yes. Nothing more is needed. Anything you write here is added to the same conversation.';
    } else wn.hidden = true;
    shape();
    var d = S.draft;
    showSend(!!(d && d.readyToSend));
    if (d && d.waitUntil) runWait(); else if (!(d && d.readyToSend)) $('wit-timer').hidden = true;
  }

  // ---------------------------------------------------------------- the turn bar, the thread and what we agreed
  function turnLabel(t) {
    if (t.rk) return RK[t.rk] ? 'Answered: ' + RK[t.rk].label : 'Replied';
    return { raise: 'Raised something', reply: 'Replied to something', plan: 'Suggested a plan', sorry: 'Said sorry', pause: 'Asked for a pause' }[t.k] || 'Wrote';
  }
  function dueText(t) {
    if (!t || !t.by || t.by.p === 'norush' || !t.by.d) return '';
    return whenWords(t.by.d);
  }
  function renderTurnbar() {
    var bar = $('wit-turnbar'), c = conv(), last = lastTurn(c); bar.textContent = '';
    if (!c || !last || (inbox && !inbox.bad && !inbox.mine)) { bar.hidden = true; return; }
    bar.hidden = false;
    var them = themName(c), Them = them.charAt(0).toUpperCase() + them.slice(1), p = el('p'), due = dueText(last), over = last.by && last.by.d && dayDiff(fromYmd(last.by.d)) < 0;
    if (last.who === 'me') {
      if (last.rk === 'yes') p.appendChild(doc.createTextNode('You said yes. It’s in What we agreed. Nothing more is needed unless one of you wants to add something.'));
      else if (last.by && last.by.pause) p.appendChild(el('span', null, [el('strong', { text: 'Pause. ' }), 'You said you’ll come back to it ' + (due || 'soon') + '.']));
      else {
        p.appendChild(el('strong', { text: 'Waiting for ' + themName(c, true) + ' reply. ' }));
        p.appendChild(doc.createTextNode(due ? 'You asked for one by ' + due + '.' : 'You said there’s no rush.'));
        if (over) p.appendChild(doc.createTextNode(' That time has passed. That’s okay: people get busy. One calm nudge is fine: “Just checking you saw my message. I’d still like to sort it out.”'));
      }
    } else {
      if (last.rk === 'yes') p.appendChild(doc.createTextNode(Them + ' said yes. It’s in What we agreed.'));
      else if (last.rk === 'needtime' || last.k === 'pause') { p.appendChild(el('strong', { text: Them + ' needs some time. ' })); p.appendChild(doc.createTextNode(due ? 'They’ll come back to it ' + due + '. Waiting is part of it.' : 'Waiting is part of it.')); }
      else {
        p.appendChild(el('strong', { text: 'Your turn. ' }));
        p.appendChild(doc.createTextNode(due ? Them + ' asked for a reply by ' + due + '. No rush before then.' : Them + ' said there’s no rush.'));
      }
    }
    bar.appendChild(p);
    var go = el('a', { href: last.who === 'them' && last.rk !== 'yes' ? '#write' : '#thread', text: last.who === 'them' && last.rk !== 'yes' ? 'Read and reply' : 'See the conversation' });
    bar.appendChild(el('p', { cls: 'wit-turnbar-go' }, [go]));
  }

  function renderThread() {
    var body = $('wit-thread-body'), c = conv(); body.textContent = '';
    $('wit-thread-empty').hidden = !!(c && c.turns.length);
    renderAgreed();
    renderConvos();
    if (!c || !c.turns.length) return;
    var them = themName(c), Them = them.charAt(0).toUpperCase() + them.slice(1);
    body.appendChild(el('p', { cls: 'wit-thread-who' }, [el('strong', { text: (c.me || 'You') + ' and ' + Them }), c.rel && REL[c.rel] ? ' · ' + REL[c.rel] : '']));
    var ol = el('ol', { cls: 'wit-turns' });
    c.turns.forEach(function (t, i) {
      var mine = t.who === 'me';
      var li = el('li', { cls: 'wit-turn ' + (mine ? 'is-me' : 'is-them') });
      li.appendChild(el('p', { cls: 'wit-turn-h' }, [el('span', { cls: 'wit-turn-n', text: String(i + 1) }), ' ', el('strong', { text: mine ? 'You' : Them }), ' · ' + turnLabel(t) + ' · ', el('time', { datetime: t.at, text: stamp(t.at) })]));
      var det = el('details', { cls: 'wit-turn-body' }, [el('summary', { text: t.a ? '“' + (t.a.length > 90 ? t.a.slice(0, 88) + '…' : t.a) + '”' : 'Show the message' })]);
      if (i === c.turns.length - 1) det.open = true;
      det.appendChild(messageCard(t, !mine));
      if (mine && t.link) {
        var row = el('p', { cls: 'wit-acts' });
        var a1 = el('button', { type: 'button', cls: 'wit-btn is-small is-quiet', text: 'Send the link again' }); a1.addEventListener('click', function () { act('share', t, t.link); });
        var a2 = el('button', { type: 'button', cls: 'wit-btn is-small is-quiet', text: 'Copy link' }); a2.addEventListener('click', function () { act('link', t, t.link); });
        row.appendChild(a1); row.appendChild(doc.createTextNode(' ')); row.appendChild(a2); det.appendChild(row);
      }
      li.appendChild(det);
      ol.appendChild(li);
    });
    body.appendChild(ol);
    var last = lastTurn(c);
    body.appendChild(el('p', { cls: 'wit-next' }, [el('strong', { text: last.who === 'me' ? (last.rk === 'yes' ? 'Nothing more is needed.' : 'Waiting for ' + themName(c, true) + ' reply.') : last.rk === 'yes' ? 'Agreed.' : 'Your turn.' })]));
    // erase, in two steps
    var er = el('p', { cls: 'wit-acts wit-erase' });
    var b = el('button', { type: 'button', cls: 'wit-link', text: 'Erase this conversation' });
    b.setAttribute('data-clear-confirm', 'this conversation');
    b.addEventListener('click', function () {
      er.textContent = '';
      er.appendChild(el('span', { text: 'Erase it from this device? This can’t be undone. ' }));
      var y = el('button', { type: 'button', cls: 'wit-btn is-small', text: 'Yes, erase it' }), n = el('button', { type: 'button', cls: 'wit-btn is-small is-quiet', text: 'Keep it' });
      y.addEventListener('click', function () {
        delete S.convos[c.id]; S.cur = Object.keys(S.convos)[0] || null; if (S.draft && S.draft.c === c.id) S.draft = null;
        committed = null; inbox = null; mode = 'new'; replyTo = null; save(); clearForm(); renderAll(); say('');
        var tb = $('thread-h'); tb.setAttribute('tabindex', '-1'); tb.focus();
        $('wit-thread-empty').textContent = 'Erased from this device.';
      });
      n.addEventListener('click', function () { renderThread(); });
      er.appendChild(y); er.appendChild(doc.createTextNode(' ')); er.appendChild(n);
      // site.js has already asked (data-clear-confirm), so go straight on
      if (b.tolClearOk) y.click(); else y.focus();
    });
    er.appendChild(b);
    body.appendChild(er);
  }

  function whoAgreed(a) { return a.asked && a.yes ? a.asked + ' asked, ' + a.yes + ' said yes.' : ''; }
  function agreedText(c) {
    var lines = ['What we agreed' + (c.me || c.them ? ' (' + [c.me || 'me', c.them || 'you'].join(' and ') + ')' : '')];
    c.agreed.forEach(function (a) { lines.push('• “' + endStop(a.text) + '” ' + (whoAgreed(a) ? whoAgreed(a) + ' ' : '') + 'Agreed ' + dayName(new Date(a.at)) + '. Look again on ' + dayName(fromYmd(a.look) || new Date()) + '.'); });
    return lines.join('\n');
  }
  function renderAgreed() {
    var box = $('agreed'), c = conv(); box.textContent = '';
    if (!c || !c.agreed.length) { box.hidden = true; return; }
    box.hidden = false;
    box.appendChild(el('h3', { text: 'What we agreed' }));
    box.appendChild(el('p', { cls: 'wit-muted', text: 'Both of you said yes to these. Pick a day to look again and see how it’s going: it’s fine to change an agreement that isn’t working.' }));
    var ul = el('ul', { cls: 'wit-agreed-list' });
    c.agreed.forEach(function (a, i) {
      var id = 'wit-look-' + i, inp = el('input', { type: 'date', id: id, value: a.look || '' });
      inp.addEventListener('change', function () { if (fromYmd(inp.value)) { a.look = inp.value; save(); } });
      ul.appendChild(el('li', null, [el('p', { cls: 'wit-agreed-t', text: '“' + endStop(a.text) + '”' }), el('p', { cls: 'wit-agreed-m' }, [(whoAgreed(a) ? whoAgreed(a) + ' ' : '') + 'Agreed ' + dayName(new Date(a.at)) + '. ', el('label', { for: id, text: 'Look again on ' }), inp])]));
    });
    box.appendChild(ul);
    var row = el('p', { cls: 'wit-acts' });
    [['Copy', function () { copyText(agreedText(c)).then(function (ok) { say(ok ? 'Copied what you agreed.' : 'Couldn’t copy here.'); agreedSay(ok ? 'Copied.' : 'Couldn’t copy here.'); }); }],
     ['Print', function () { root.classList.add('wit-print-agreed'); window.print(); setTimeout(function () { root.classList.remove('wit-print-agreed'); }, 800); }],
     ['Save as image', function () { withKit(function (K) { K.saveImage({ title: 'What we agreed', text: agreedText(c).split('\n').slice(1).join('\n') }).then(function () { agreedSay('Saved as an image.'); }, function () { agreedSay('Couldn’t make the image here. Try Copy instead.'); }); }); }],
     ['Share', function () { if (window.TOLShare) window.TOLShare.share({ title: 'What we agreed', text: agreedText(c), url: false, result: true }); }]
    ].forEach(function (x) { var b = el('button', { type: 'button', cls: 'wit-btn is-small is-quiet', text: x[0] }); b.addEventListener('click', x[1]); row.appendChild(b); row.appendChild(doc.createTextNode(' ')); });
    box.appendChild(row);
    box.appendChild(el('p', { cls: 'wit-status', id: 'wit-agreed-status', role: 'status', 'aria-live': 'polite' }));
  }
  function agreedSay(m) { var s = $('wit-agreed-status'); if (s) { s.textContent = ''; setTimeout(function () { s.textContent = m; }, 30); } }

  function renderConvos() {
    var box = $('wit-convos'), ids = Object.keys(S.convos); box.textContent = '';
    if (ids.length < 2) { box.hidden = true; return; }
    box.hidden = false;
    box.appendChild(el('h3', { text: 'Other conversations on this device' }));
    var ul = el('ul');
    ids.forEach(function (id) {
      if (id === S.cur) return;
      var c = S.convos[id], last = lastTurn(c);
      var b = el('button', { type: 'button', cls: 'wit-link', text: 'With ' + (c.them || 'someone') + (last ? ' · ' + stamp(last.at) : '') });
      b.addEventListener('click', function () { S.cur = id; committed = null; inbox = null; mode = 'new'; replyTo = null; clearForm(); save(); renderAll(); $('thread-h').scrollIntoView({ block: 'start' }); });
      ul.appendChild(el('li', null, [b]));
    });
    box.appendChild(ul);
  }

  function renderAll() {
    mountCtx(); renderInbox(); renderTurnbar(); renderComposer(); drawPicksIfNeeded(); renderThread(); renderCheck();
  }

  // ---------------------------------------------------------------- "Plain and literal"
  function applyLiteral() {
    var on = !!S.prefs.literal, b = $('wit-literal');
    root.classList.toggle('wit-literal', on);
    b.setAttribute('aria-pressed', String(on)); b.textContent = 'Plain and literal: ' + (on ? 'on' : 'off');
  }
  $('wit-literal').addEventListener('click', function () { S.prefs.literal = !S.prefs.literal; save(); applyLiteral(); });

  // ---------------------------------------------------------------- wiring
  ['wit-them', 'wit-me', 'wit-me2', 'wit-heard', 'wit-fact', 'wit-feelx', 'wit-ask', 'wit-not'].forEach(function (id) { $(id).addEventListener('input', changed); });
  doc.querySelectorAll('input[name="wit-rel"], input[name="wit-kind"], input[name="wit-rk"], input[name="wit-by"]').forEach(function (r) { r.addEventListener('change', changed); });
  doc.querySelectorAll('[data-wait]').forEach(function (b) { b.addEventListener('click', function () { startWait(b.getAttribute('data-wait')); }); });
  $('wit-skip').addEventListener('click', function () {
    stopWait(); saveDraft(); if (S.draft) { S.draft.waitUntil = 0; S.draft.readyToSend = true; save(); }
    showSend(true); $('wit-send').focus();
  });
  $('wit-aloud').addEventListener('click', function () { readAloud($('wit-preview'), $('wit-aloud')); });
  $('wit-asthem').addEventListener('click', function () {
    var out = $('wit-asthem-out'), open = out.hidden; out.hidden = !open; $('wit-asthem').setAttribute('aria-expanded', String(open)); if (open) renderAsThem();
  });
  $('wit-send').addEventListener('click', function () { if (committed) act('share', committed.turn, committed.link, committed.text); else sendVia('share'); });
  $('wit-copylink').addEventListener('click', function () { if (committed) act('link', committed.turn, committed.link, committed.text); else sendVia('link'); });
  $('wit-qr').addEventListener('click', function () { if (committed) act('qr', committed.turn, committed.link, committed.text); else sendVia('qr'); });
  $('wit-copytext').addEventListener('click', function () { if (committed) act('text', committed.turn, committed.link, committed.text); else sendVia('text'); });
  $('wit-clear').addEventListener('click', function () { clearForm(); renderAll(); say('Draft cleared.'); });
  $('wit-new').addEventListener('click', function () { S.cur = null; committed = null; inbox = null; mode = 'new'; replyTo = null; clearForm(); save(); renderAll(); $('wit-them').focus(); });
  window.addEventListener('hashchange', function () { if (isLetterHash(location.hash)) { committed = null; mode = 'new'; replyTo = null; clearForm(); readHash(); renderAll(); var b = $('wit-inbox'); if (!b.hidden) b.scrollIntoView({ block: 'start' }); } });

  // ---------------------------------------------------------------- start
  applyLiteral();
  var fromLink = readHash();
  if (!fromLink && S.draft) {
    if (S.draft.c && S.convos[S.draft.c]) S.cur = S.draft.c;
    fillFrom(S.draft);
  }
  renderAll();
  if (!fromLink && S.draft && S.draft.mode === 'reply') startReply();
  if (fromLink) setTimeout(function () { var b = $('wit-inbox'); if (b && !b.hidden) { b.scrollIntoView({ block: 'start' }); var h = $('wit-inbox-h'); if (h) { h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true }); } } }, 350);
})();
