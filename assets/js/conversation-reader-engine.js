/* conversation-reader-engine.js — the reading rules behind /conversation-reader.html

   Everything here runs in the visitor's browser. Nothing is saved or sent anywhere.
   It reads patterns in words (absolutes, verdicts, dismissals, repairs, asks...).
   It cannot know tone of voice, history or intent, and the page says so.

   parse(text)            -> { turns:[{who, text, time, date}], speakers:[names], format }
   read(turns, me, form)  -> the full read: per-turn marks and heat, where it turned,
                             patterns for each side, missed repairs, unanswered
                             questions, topic drift, and how to respond
   checkDraft(text)       -> marks and swaps for a reply someone is about to send */
(function (root) {
  'use strict';
  // The shared pattern list (message-patterns.js), so this reads words the same way as the
  // Signal Translator and the Carrier Wave Decoder's tone check
  var P = (typeof module !== 'undefined' && module.exports) ? require('./message-patterns.js') : root.TOLPatterns;

  // ---------- Parsing ----------
  var RX = {
    waIOS: /^‎?\[(\d{1,4}[./-]\d{1,2}[./-]\d{1,4}),?\s+(\d{1,2}[:.]\d{2}(?::\d{2})?\s?(?:[AaPp]\.?[Mm]\.?)?)\]\s+([^:]{1,40}):\s?(.*)$/,
    waAndroid: /^(\d{1,4}[./-]\d{1,2}[./-]\d{1,4}),?\s+(\d{1,2}[:.]\d{2}\s?(?:[AaPp]\.?[Mm]\.?)?)\s+[-–]\s+([^:]{1,40}):\s?(.*)$/,
    named: /^\s*([A-Za-zÀ-ɏ][\wÀ-ɏ .'’&-]{0,30}?)\s*:\s+(.+)$/,
    emailOn: /^\s*On (.{3,140}?)\s*wrote:\s*$/i,
    emailFrom: /^\s*From:\s*([^<\n]{1,60}?)\s*(?:<[^>]*>)?\s*$/i,
    header: /^\s*(Sent|To|Cc|Bcc|Subject|Date):/i,
    quoted: /^\s*>/,
    // "[10:02] Sam: message" and "[10:02 AM] Sam: message"
    bracketTime: /^\s*\[(\d{1,2}[:.]\d{2}(?::\d{2})?\s?(?:[AaPp]\.?[Mm]\.?)?)\]\s+([^:\[\]]{1,40}):\s?(.*)$/,
    // iMessage-style exports: "[Jan 5, 2024 at 10:02 AM] Sam: message", "[5 Jan 2024, 10:02] Sam: message"
    bracketDate: /^\s*\u200e?\[([^\]]{3,40}?),?\s+(?:at\s+)?(\d{1,2}[:.]\d{2}(?::\d{2})?\s?(?:[AaPp]\.?[Mm]\.?)?)\]\s+([^:\[\]]{1,40}):\s?(.*)$/,
    // Slack / Teams copy: a "Sam Lee  10:02 AM" (or "Sam Lee, 10:02 AM") line, then the message on the next line(s)
    headTime: /^\s*([^\s\d\[\]:@#][^\[\]:]{0,40}?)(,?\s{2,}|\t+|,\s*|\s)\[?(\d{1,2}:\d{2}(?::\d{2})?\s?(?:[AaPp]\.?[Mm]\.?)?)\]?\s*$/,
    // Discord-style: "Sam — Today at 10:02 AM", "Sam - Yesterday at 9:15 PM", "Sam — 03/04/2024 10:02 AM"
    headDay: /^\s*([^\s\[\]:][^\[\]:]{0,40}?)\s+[—–-]\s+((?:Today|Yesterday|(?:Mon|Tues|Wednes|Thurs|Fri|Satur|Sun)day|\d{1,4}[./-]\d{1,2}[./-]\d{1,4})(?:,)?(?:\s+at)?)\s+(\d{1,2}:\d{2}(?::\d{2})?\s?(?:[AaPp]\.?[Mm]\.?)?)\s*$/i,
    // Teams: "[10:02 AM] Sam Lee" on its own line
    headBracket: /^\s*\[(\d{1,2}:\d{2}(?::\d{2})?\s?(?:[AaPp]\.?[Mm]\.?)?)\]\s+([^:\[\]]{1,40}?)\s*$/,
    // A follow-up from the same person in Slack shows only its time
    timeOnly: /^\s*\[?(\d{1,2}:\d{2}(?::\d{2})?\s?(?:[AaPp]\.?[Mm]\.?)?)\]?\s*$/,
    // Bits of chat-app furniture that are not messages
    chrome: /^\s*(?:Today|Yesterday|New|New messages?|\(edited\)|edited|\d+ repl(?:y|ies)|View thread|Last reply .*|Reply|Replied to a thread.*|(?:Mon|Tues|Wednes|Thurs|Fri|Satur|Sun)day(?:,? [A-Z][a-z]+ \d{1,2}(?:st|nd|rd|th)?)?|:[a-z0-9_+-]+:\s*\d*|Seen|Delivered|Read \d.*)\s*$/i,
    noise: /^(?:<Media omitted>|<attached:.*>|This message was deleted\.?|You deleted this message\.?|Messages and calls are end-to-end encrypted.*|image omitted|sticker omitted|GIF omitted|audio omitted|video omitted)$/i
  };
  var NOT_NAMES = /^(https?|www|note|ps|p\.s|re|fwd?|subject|to|cc|date|sent|from|time|edit|update|also|and|but|ok|so|well|yes|no|like)$/i;

  function parse(text) {
    var lines = String(text || '').replace(/\r\n?/g, '\n').split('\n');
    var turns = [], format = 'unlabelled';

    // Chat exports and "Name: message" lines
    var labelled = 0, heads = 0;
    lines.forEach(function (l) {
      if (exportMatch(l) || namedMatch(l)) labelled++;
      else if (headMatch(l)) heads++;
    });
    var nonEmpty = lines.filter(function (l) { return l.trim(); }).length;
    var isEmail = lines.some(function (l) { return RX.emailOn.test(l) || RX.emailFrom.test(l); });

    if (!isEmail && heads >= 2 && heads >= labelled) {
      // Slack, Teams, Discord: a name-and-time line, then the message on the line(s) below
      format = 'chat app';
      var curT = null;
      lines.forEach(function (l) {
        if (!l.trim() || RX.chrome.test(l)) return;
        var h = headMatch(l);
        if (h) { curT = { who: h.who, text: '', time: h.time, date: h.date || '' }; turns.push(curT); return; }
        var to = l.match(RX.timeOnly);
        if (to && curT) { curT = { who: curT.who, text: '', time: to[1], date: curT.date }; turns.push(curT); return; }
        var ex = exportMatch(l);
        if (ex) { curT = null; push(ex.who, ex.text, ex.time, ex.date); return; }
        if (!curT) { curT = { who: 'Unnamed', text: '', time: '', date: '' }; turns.push(curT); }
        curT.text += (curT.text ? '\n' : '') + trim(l);
      });
      turns = turns.filter(function (t) { t.text = trim(t.text); return t.text && !RX.noise.test(t.text); });

    } else if (isEmail) {
      format = 'email';
      var cur = null;
      lines.forEach(function (l) {
        l = l.replace(/^(?:\s*>)+\s?/, '');   // quoted replies: strip every level of ">"
        var on = l.match(RX.emailOn), from = l.match(RX.emailFrom);
        if (on || from) { cur = { who: on ? senderOf(on[1]) : clean(from[1]), text: '', when: on ? Date.parse(on[1].replace(/\s+at\s+/i, ' ').replace(/[^\w\s:,\/-].*$/, '')) : NaN }; turns.push(cur); return; }
        var hd = l.match(/^\s*(?:Sent|Date):\s*(.+)$/i);
        if (hd && cur) { cur.when = Date.parse(hd[1].replace(/\s+at\s+/i, ' ')); return; }
        if (RX.header.test(l)) return;
        if (!cur) { cur = { who: '', text: '', top: true }; turns.push(cur); }
        cur.text += (cur.text ? '\n' : '') + l;
      });
      turns = turns.map(function (t) { t.text = t.text.trim(); return t; }).filter(function (t) { return t.text; });
      // Oldest first. With dates on every message, sort by them. A reply chain (a new message on top,
      // then "On … wrote:" or "From:" blocks under it) is newest-first, so turn it round. Emails pasted
      // one after another, each starting with its own "From:", are already in order.
      var dated = turns.length > 1 && turns.every(function (t) { return !isNaN(t.when); });
      if (dated) turns.sort(function (x, y) { return x.when - y.when; });
      else if (turns.length && (turns[0].top || turns.some(function (t, i) { return i > 0 && /^On .{3,140}wrote:/im.test(text); }))) turns.reverse();
      turns.forEach(function (t) { delete t.when; delete t.top; });

    } else if (labelled >= 2 && labelled >= nonEmpty * 0.4) {
      lines.forEach(function (l) {
        if (!l.trim()) return;
        var ex = exportMatch(l);
        if (ex) { format = 'chat export'; push(ex.who, ex.text, ex.time, ex.date); return; }
        var n = namedMatch(l);
        if (n) { if (format !== 'chat export') format = 'named lines'; push(n[0], n[1]); return; }
        if (turns.length) turns[turns.length - 1].text += '\n' + l.trim();   // a message that ran onto a new line
        else push('', l.trim());
      });
    } else {
      // No names: one message per paragraph (or per line if there are no blank lines),
      // alternating speakers. People can fix who said what on the page.
      var blocks = String(text || '').replace(/\r\n?/g, '\n').split(/\n\s*\n/).map(trim).filter(Boolean);
      if (blocks.length < 2) blocks = lines.map(trim).filter(Boolean);
      blocks.forEach(function (b, i) { push(i % 2 ? 'You' : 'Them', b); });
    }

    function push(who, t, time, date) {
      t = trim(t || '');
      if (!t || RX.noise.test(t)) return;
      turns.push({ who: who, text: t, time: time || '', date: date || '' });
    }
    function exportMatch(l) {
      var m = l.match(RX.waIOS) || l.match(RX.waAndroid);
      if (m) return { who: clean(m[3]), text: m[4], time: m[2], date: m[1] };
      m = l.match(RX.bracketDate);
      if (m) return { who: clean(m[3]), text: m[4], time: m[2], date: m[1] };
      m = l.match(RX.bracketTime);
      if (m && !NOT_NAMES.test(trim(m[2])) && m[2].split(/\s+/).length <= 4) return { who: clean(m[2]), text: m[3], time: m[1], date: '' };
      return null;
    }
    function headMatch(l) {
      var m = l.match(RX.headDay);
      if (m && nameLike(m[1])) return { who: clean(m[1]), time: m[3], date: m[2].replace(/,?\s+at$/i, '') };
      m = l.match(RX.headBracket);
      if (m && nameLike(m[2])) return { who: clean(m[2]), time: m[1] };
      m = l.match(RX.headTime);
      if (m && nameLike(m[1])) {
        // With one plain space before the time, only trust names that look like names
        // ("Sam Lee 10:02 AM"), so "see you at 10:30" is never read as a speaker.
        var loose = m[2] === ' ';
        if (!loose || /^[A-ZÀ-Ý][\wÀ-ɏ.'’-]*(?:\s+[A-ZÀ-Ý][\wÀ-ɏ.'’-]*){0,3}$/.test(trim(m[1]))) return { who: clean(m[1]), time: m[3] };
      }
      return null;
    }
    function nameLike(n) {
      n = trim(n || '');
      if (!n || n.length > 40 || n.split(/\s+/).length > 4) return false;
      if (NOT_NAMES.test(n) || /[?!.,]$/.test(n)) return false;
      return !/\b(?:at|by|until|before|after|around|from|to|till|is|was|are|the|and)$/i.test(n);
    }
    function namedMatch(l) {
      var m = l.match(RX.named);
      if (!m || NOT_NAMES.test(m[1].trim()) || /https?$/i.test(m[1]) || m[1].split(/\s+/).length > 4) return null;
      return [clean(m[1]), m[2]];
    }

    // Fill email turns that had no sender: alternate from the neighbour
    turns.forEach(function (t, i) {
      if (t.who) return;
      var prev = turns[i - 1], next = turns[i + 1];
      t.who = 'Unnamed';
    });
    // an email thread's newest message usually has no header: in a two-person thread it's from whoever wrote
    // the message before it's "other" side, and often signs off with a name
    if (format === 'email') {
      var named = []; turns.forEach(function (t) { if (t.who !== 'Unnamed' && named.indexOf(t.who) === -1) named.push(t.who); });
      turns.forEach(function (t, i) {
        if (t.who !== 'Unnamed') return;
        var sig = (t.text.match(/\n\s*([A-Z][a-z]+)\s*$/) || [])[1];
        var bySig = sig && named.filter(function (nm) { return nm.split(/\s+/)[0] === sig; })[0];
        var prevW = turns[i - 1] && turns[i - 1].who;
        if (bySig) t.who = bySig;
        else if (named.length === 2 && prevW && prevW !== 'Unnamed') t.who = named[0] === prevW ? named[1] : named[0];
      });
    }

    var speakers = [];
    turns.forEach(function (t) { if (speakers.indexOf(t.who) === -1) speakers.push(t.who); });
    return { turns: turns, speakers: speakers, format: format };
  }
  // "Tue, Mar 12, 2024 at 9:14 AM Pat Smith <pat@x.com>" -> "Pat Smith"
  function senderOf(s) {
    s = s.replace(/<[^>]*>/g, '').replace(/\S+@\S+/g, '').trim();
    var t = s.match(/\d{1,2}[:.]\d{2}(?::\d{2})?\s?(?:[AaPp]\.?[Mm]\.?)?,?\s*(.+)$/);
    var name = t ? t[1] : s.split(',').pop();
    return clean(name.replace(/^(?:at\s+)/i, '')) || 'Unnamed';
  }
  function trim(s) { return String(s).replace(/^\s+|\s+$/g, ''); }
  function clean(s) { return trim(String(s).replace(/^["'“”]+|["'“”]+$/g, '')); }

  // ---------- The patterns ----------
  // Each kind has: how it's found, how much heat it adds, and what the other person may hear.
  var KINDS = {
    threat:   { label: 'Safety: a threat', heat: 6, tone: 'alarm', safety: true },
    control:  { label: 'Safety: controlling', heat: 4, tone: 'alarm', safety: true },
    withdraw: { label: 'Shutting the door', heat: 2, tone: 'hot',
                hear: '“Not now,” “forget it” or a silent “…” usually means someone is flooded: too overwhelmed to keep going. Without a time to come back, the other person hears “this is over.” It isn’t calm, even when the messages stop.',
                instead: 'Name the pause and a time to come back: “I need an hour. I’ll call you at 8.”' },
    contempt: { label: 'Eye-roll or put-down', heat: 3, tone: 'hot' },
    swear:    { label: 'Swearing', heat: 2.5, tone: 'hot' },
    hostile:  { label: 'Hostile or fed-up line', heat: 3, tone: 'hot' },
    hint:     { label: 'Hint instead of an ask', heat: 1.5, tone: 'tense' },
    opener:   { label: 'Opener with no topic', heat: 1.5, tone: 'tense' },
    passive:  { label: 'Passive-aggressive edge', heat: 2, tone: 'hot' },
    pointed:  { label: 'Pointed work phrase', heat: 1.5, tone: 'tense' },
    compare:  { label: 'Comparison to someone else', heat: 2, tone: 'hot' },
    turnaway: { label: 'Good news met with a flat reply', heat: 1, tone: 'tense',
                hear: 'When someone shares good news or reaches out for attention and gets a flat reply, it lands as rejection, even when it wasn’t meant that way. Meeting good news with real interest is one of the strongest everyday ways to build connection.',
                instead: 'Ask one question about it, or say what you’re glad about.' },
    verdict:  { label: 'A verdict on the person', heat: 3, tone: 'hot',
                hear: 'A sentence about who someone is (“you’re selfish”) is heard as an attack, so it gets defended instead of heard.',
                instead: 'Describe what happened and how it landed, not what kind of person they are.' },
    absolute: { label: 'Always / never', heat: 1.5, tone: 'hot',
                hear: '“Always” and “never” turn one moment into a verdict on everything. The other person usually argues with the absolute instead of hearing the point.',
                instead: 'Name the specific time: “this week” or “the last two times.”' },
    dismiss:  { label: 'Dismissing', heat: 2.5, tone: 'hot',
                hear: 'Words like “calm down,” “whatever” or “you’re overreacting” tell the other person their feeling doesn’t count. They usually raise the heat.',
                instead: 'Say what you can hear, even if you see it differently: “I can tell this matters to you.”' },
    sarcasm:  { label: 'Sarcasm', heat: 2, tone: 'hot',
                hear: 'Sarcasm reads worse in writing than out loud. With no tone of voice, the other person fills the gap with the worst version.',
                instead: 'Say the real thing plainly, once.' },
    demand:   { label: 'Orders or blaming questions', heat: 1.5, tone: 'tense',
                hear: '“You should,” “you need to” and “why can’t you” land as orders or blame, so they invite pushback.',
                instead: 'Turn it into a request: “Could you…?”' },
    history:  { label: 'Bringing in the past', heat: 1.5, tone: 'tense',
                hear: 'Bringing in other times (“last time”, “remember when”) widens one topic into many. Nobody can answer all of them at once.',
                instead: 'Keep to one topic. Write the others down for another day.' },
    shouting: { label: 'Shouting in text', heat: 1, tone: 'tense',
                hear: 'Capitals and stacked punctuation (!!, ?!) read as shouting.',
                instead: 'Use normal capitals and one punctuation mark.' },
    vague:    { label: 'Vague timing', heat: 0.5, tone: 'note',
                hear: '“Later”, “soon” or “when you get a chance” can mean tonight to one person and next week to the other. That gap is where a lot of friction starts.',
                instead: 'Name a time: “by Thursday evening.”' },
    short:    { label: 'Very short reply', heat: 1, tone: 'note',
                hear: 'A one-word reply (“ok”, “k”, “fine.”) can mean “got it, I’m busy” or “I’m upset.” The word is the same, so the reader guesses, usually from their own mood. After a long message it can land as “I don’t care,” even when it means “I’m overwhelmed.”',
                instead: 'Add the missing half: “Ok, sounds good!” or “Ok. I need a minute, I’ll reply properly tonight.”' },
    repair:   { label: 'Repair attempt', heat: -2, tone: 'good',
                hear: 'This is an offer to cool things down: an apology, agreeing with part of it, or asking to pause. Repair attempts are one of the most important parts of a hard conversation.',
                instead: 'Take it when it’s offered, even if the rest isn’t settled.' },
    pause:    { label: 'A pause with a time to come back', heat: -2, tone: 'good' },
    warmth:   { label: 'Warmth or thanks', heat: -1, tone: 'good' },
    feeling:  { label: '“I feel” statement', heat: -1, tone: 'good',
                hear: 'Saying what’s happening for you, without blame, is easier to hear than a statement about the other person.' },
    ask:      { label: 'A clear ask', heat: -0.5, tone: 'good',
                hear: 'A specific request gives the other person something they can actually do.' }
  };

  // the shared list's own words for what the reader may hear, and what to try instead
  var FROM_SHARED = { sarcasm: 'sarcasm', contempt: 'contempt', passive: 'passive', pointed: 'pointed', compare: 'compare', absolute: 'absolute', dismiss: 'dismiss', stonewall: 'withdraw', flat: 'short', pause: 'pause', appreciation: 'warmth',
    swear: 'swear', hostile: 'hostile', label: 'verdict', hint: 'hint', opener: 'opener' };
  if (P) Object.keys(FROM_SHARED).forEach(function (id) {
    var K = KINDS[FROM_SHARED[id]], S = P.BY[id];
    if (!K || !S) return;
    if (!K.hear || ['contempt', 'passive', 'pointed', 'compare', 'sarcasm', 'absolute', 'pause', 'warmth', 'swear', 'hostile', 'hint', 'opener'].indexOf(FROM_SHARED[id]) !== -1) { K.hear = S.what; if (S.fix) K.instead = S.fix; }
  });

  function words(list) { return new RegExp('(?:^|[^\\w’\'])(' + list.join('|') + ')(?=$|[^\\w’\'])', 'gi'); }
  var PATTERNS = {
    threat: [words(["i(?:[’']?ll| will|[’']?m (?:going to|gonna)| am (?:going to|gonna)) (?:hurt|kill|hit|ruin|destroy|end) you", "you(?:[’']?ll| will) regret (?:this|it)", "you(?:[’']?ll| will) be sorry", "i(?:[’']?ll| will|[’']?m (?:going to|gonna)| am (?:going to|gonna)) make you (?:pay|sorry|regret)", "i know where you (?:are|live|work)", "watch your back", "or else", "i(?:[’']?ll| will|[’']?m (?:going to|gonna)| am (?:going to|gonna)) find you", "i(?:[’']?ll| will|[’']?m (?:going to|gonna)| am (?:going to|gonna)) take (?:the kids|the children|your kids|them)(?: away| from you)?", "you(?:[’']?ll| will) never see (?:the kids|the children|them|your kids) again", "if you (?:leave|go|tell anyone)[^.!?]{0,40}(?:i(?:[’']?ll| will|[’']?m (?:going to|gonna)| am (?:going to|gonna))|you(?:[’']?ll| will) never)", "i(?:[’']?ll| will|[’']?m (?:going to|gonna)| am (?:going to|gonna)) (?:post|send|share|show everyone) (?:your|the|those) (?:photos|pictures|messages|videos)", "i(?:[’']?ll| will|[’']?m (?:going to|gonna)| am (?:going to|gonna)) tell everyone"])],
    control: [words(["i(?:[’']?m| am) (?:checking|going through|going to check) your phone", "give me your (?:phone|password|passcode)", "what(?:[’']?s| is) your password", "(?:send|share) (?:me )?your location", "i(?:[’']?m| am) tracking you", "who were you (?:with|talking to|texting)", "answer me", "you(?:[’']?re| are) not allowed", "you (?:can[’']?t|cannot) (?:go|see|talk to|leave|have)", "you need my permission", "i forbid", "you(?:[’']?re| are) not going (?:out|anywhere)", "stop (?:seeing|talking to) your (?:friends|family|sister|brother|mom|mum|dad)", "(?:block|delete) (?:him|her|them|your friends)", "you don[’']?t get (?:any )?money", "i control the money", "you(?:[’']?ll| will) do as i say", "because i said so"])],
    verdict: [words(["you(?:[’']?re| are) (?:so |such an? |just |being |really |always |)?(?:selfish|lazy|useless|pathetic|ridiculous|crazy|insane|childish|impossible|stupid|an idiot|a joke|a liar|a mess|toxic|unbelievable|hopeless|the worst|a narcissist|dramatic|immature|clueless|heartless|cold)", "you don[’']?t care(?: about)?", "you only care about", "you(?:[’']?re| are) the problem", "what(?:[’']?s| is) wrong with you", "your problem is", "typical you", "that(?:[’']?s| is) so you", "you(?:[’']?re| are) just like your", "you make me (?:sick|crazy|miserable|feel (?:worthless|stupid|small|like (?:crap|garbage|nothing|an idiot)|bad|guilty|terrible))", "you(?:[’']?ve| have) ruined"])],
    demand: [words(["you should(?:n[’']?t)?(?: have)?", "you need to", "you have to", "you better", "why can[’']?t you", "why didn[’']?t you", "why don[’']?t you ever", "why do you always", "how hard is it", "is it too much to ask", "just do it", "do it now", "(?:can|could|would|will) you (?:please )?just", "just (?:get|do) it (?:done|already)", "asap", "immediately", "urgently", "right away"])],
    history: [words(["last time", "remember when", "like (?:the )?(?:last|other) time", "just like when", "you did the same", "same thing (?:as|with)", "and another thing", "while we[’']?re at it", "not to mention", "this is (?:just )?like", "again\\?", "for the (?:hundredth|millionth|thousandth) time", "back when"])],
    vague: [words(["later", "soon", "at some point", "when you get a chance", "when you can", "whenever", "in a bit", "in a minute", "sometime", "one of these days", "eventually"])],
    repair: [words(["sorry", "i apologi[sz]e", "my bad", "my fault", "you[’']?re right", "that[’']?s fair", "fair point", "i hear you", "i get it", "i understand", "i didn[’']?t mean", "i shouldn[’']?t have", "can we (?:start over|talk|pause|take a break|try again)", "let[’']?s (?:pause|take a break|talk later|start over|try again)", "i need a (?:minute|moment|break)", "thanks for (?:telling|saying|listening|understanding)", "i want to (?:fix|sort|work on) this", "we[’']?re on the same (?:side|team)", "i[’']?m not against you", "good point", "i[’']?m not trying to (?:start|fight|argue|blame)", "i[’']?m not (?:mad|angry) at you"]), /🙏/g],
    feeling: [words(["i feel", "i[’']?m feeling", "i felt", "i[’']?m (?:so |really |just |very |a bit |a little |kind of |pretty )?(?:hurt|sad|worried|tired|exhausted|frustrated|scared|overwhelmed|anxious|upset|lonely|stressed|disappointed|embarrassed)", "it hurt(?:s)? (?:me|when)", "that hurt", "makes me feel"])],
    ask: [words(["can you", "could you", "would you", "will you", "i need you to", "i[’']?d like", "i would like", "please", "would it help if", "can we", "how about", "what if we"])]
  };

  function findMarks(text) {
    var marks = [];
    Object.keys(PATTERNS).forEach(function (kind) {
      PATTERNS[kind].forEach(function (rx) {
        rx.lastIndex = 0;
        var m;
        if (!rx.global) { m = text.trim().match(rx); if (m) marks.push({ kind: kind, start: 0, end: text.length, text: text.trim() }); return; }
        while ((m = rx.exec(text))) {
          var phrase = m[1] || m[0];
          var start = m.index + m[0].indexOf(phrase);
          marks.push({ kind: kind, start: start, end: start + phrase.length, text: phrase });
          if (m[0].length === 0) rx.lastIndex++;
        }
      });
    });
    // The shared list: sarcasm, put-downs, passive edges, comparisons, always/never, dismissing,
    // shutting the door (or a pause with a time to come back), very short replies and warmth
    if (P) P.scan(text).forEach(function (m) {
      var kind = FROM_SHARED[m.id];
      if (!kind || !KINDS[kind]) return;
      // "Thanks," alone on a line near the end is an email sign-off, not warmth
      if (kind === 'warmth' && !m.whole) {
        var ls = text.lastIndexOf('\n', m.start) + 1, le = text.indexOf('\n', m.end); if (le < 0) le = text.length;
        if (/^\s*(?:many )?(?:thanks|thank you|thx|ty)[,.!]?\s*$/i.test(text.slice(ls, le)) && text.split('\n').length > 2) return;
      }
      marks.push(m.whole ? { kind: kind, start: 0, end: text.length, text: text.trim(), whole: true } : { kind: kind, start: m.start, end: m.end, text: m.text });
    });
    var edgy = marks.some(function (m) { return KINDS[m.kind].heat > 0; });
    // Shouting: words in capitals (3+ letters, not common acronyms) and stacked punctuation
    var caps = text.match(/\b[A-Z]{3,}\b/g) || [];
    caps = caps.filter(function (w) { return !/^(OK|USA|UK|ADHD|OCD|PTSD|ASAP|LOL|OMG|FYI|BTW|TV|PM|AM|ETA|DIY|RSVP|PDF|WP|CALC|ID|NHS|IRS|GPS|EOD|COB|HR|IT|CEO|PTO|WFH|FAQ|URL|API|QA|UX|UI|RACI|TOL)$/.test(w); });
    if (caps.length >= 1 && caps.join('').length >= 4) caps.forEach(function (w) { var i = text.indexOf(w); marks.push({ kind: 'shouting', start: i, end: i + w.length, text: w }); });
    // "you're so good at it though!!" is excitement, not shouting: stacked marks count only with an edge
    // somewhere in the message, or with a question mark in the stack ("?!", "??")
    var punct = /[!?]{2,}/g, pm;
    while ((pm = punct.exec(text))) if (edgy || /\?/.test(pm[0]) && pm[0].length > 1 && !/^\?+$/.test(pm[0]) || /\?{2,}/.test(pm[0]) || caps.length) marks.push({ kind: 'shouting', start: pm.index, end: pm.index + pm[0].length, text: pm[0] });

    // "never mind" is a dismissal, not an absolute; "thank you" inside sarcasm stays sarcasm
    marks = marks.filter(function (a) {
      if (a.kind === 'swear') return true;  // a swear word inside a fed-up line counts too
      return !marks.some(function (b) { return b !== a && !b.whole && b.start <= a.start && b.end >= a.end && (b.end - b.start) > (a.end - a.start); });
    });
    // "I'm sorry you feel that way" is not a repair
    if (/sorry (?:you feel|that you feel|if you)/i.test(text)) marks = marks.filter(function (m) { return m.kind !== 'repair' || !/sorry/i.test(m.text); }).concat([{ kind: 'dismiss', start: text.search(/sorry/i), end: text.search(/sorry/i) + 5, text: 'sorry you feel', non: true }]);
    marks.sort(function (a, b) { return a.start - b.start; });
    return marks;
  }

  // Good news, excitement or a reach for attention ("I got the job!!", "guess what", "look at this")
  var BID = /(?:\bi got (?:the|a|an|my)\b|\bguess what\b|\bgood news\b|\bgreat news\b|\bwe did it\b|\bi did it\b|\bi passed\b|\bi(?:[’']m| am) (?:so )?(?:excited|happy|proud)\b|\blook at this\b|\bcheck this out\b|\bi miss you\b|\bthinking (?:of|about) you\b|\bi love you\b|🎉|🥳|😍)/i;
  // a question ("did you finish the report?") is asking, not sharing news, and "no" is an answer to it
  function isBid(t) {
    if (/\?/.test(t) && !/\bguess what\b|\blook at this\b|\bcheck this out\b/i.test(t)) return false;
    if (P && P.scan(t).some(function (m) { var k = FROM_SHARED[m.id]; return k && KINDS[k].heat > 0; })) return false;
    return BID.test(t) || (/!{1,}/.test(t) && /\b(?:got|won|finished|finally|yay|amazing|passed)\b/i.test(t));
  }
  // A reply with no interest in it: very short, or busy/ok/cool with nothing warm
  function isFlat(t, marks) {
    if (marks.some(function (m) { return m.kind === 'repair' || m.kind === 'ask'; })) return false;
    if (/(?:congrat|proud|amazing|awesome|great|so happy|love|well done|that[’']s (?:huge|wonderful|fantastic)|tell me|how did|!)/i.test(t)) return false;
    var wc = (t.match(/\S+/g) || []).length;
    return wc <= 3 || /^(?:ok|okay|k|cool|nice|sure|busy|fine|mhm|hm+|ya|yeah)\b/i.test(trim(t));
  }

  // ---------- Reading a whole conversation ----------
  var STOP = ('a,an,the,and,or,but,so,if,then,than,to,of,in,on,at,for,with,about,from,by,as,is,are,was,were,be,been,being,am,i,im,you,your,youre,me,my,mine,we,us,our,they,them,their,he,she,him,her,his,it,its,this,that,these,those,there,here,what,when,where,why,how,who,which,do,does,did,done,dont,didnt,doesnt,cant,can,could,would,should,will,wont,just,really,very,too,also,not,no,yes,yeah,ok,okay,like,get,got,go,going,gonna,know,think,want,need,said,say,says,tell,told,thing,things,time,now,then,again,even,still,all,any,some,more,most,much,many,one,two,oh,well,lol,u,ur,im,ive,id,ill,thats,whats,theres,lets,had,has,have,havent,hasnt,make,made,way,out,up,down,off,over,back,into,because,cause,sure,right,fine,let,feel,feeling,always,never,sorry,please,thanks,thank,every,today,tonight,tomorrow,yesterday,ever,since,before,after,until,while,other,another,same,only,own,someone,something,anything,everything,nothing,day,days,week,night,morning').split(',');
  function contentWords(t) {
    return (t.toLowerCase().replace(/[’']/g, '').match(/[a-z]{3,}/g) || []).filter(function (w) { return STOP.indexOf(w) === -1; });
  }

  function read(turns, me, form) {
    var n = turns.length;
    var out = { turns: [], form: form, me: me, mine: 0, theirs: 0 };
    var prevLen = 0;
    turns.forEach(function (t, i) {
      // "you allways do this" reads as "you always do this": the shared list of common misspellings
      var sp = P && P.spell ? P.spell(t.text) : { text: t.text, fixes: [] };
      if (sp.fixes.length) { t = { who: t.who, text: sp.text, time: t.time, date: t.date, typed: t.text, readAs: sp.fixes }; turns[i] = t; }
      var marks = findMarks(t.text);
      var mine = t.who === me;
      var wc = (t.text.match(/\S+/g) || []).length;
      // A very short reply straight after a long one from the other side
      var prev = turns[i - 1];
      if (prev && prev.who !== t.who && wc <= 2 && prevLen >= 20 && !marks.some(function (m) { return m.kind === 'repair'; })) {
        marks.push({ kind: 'short', start: 0, end: t.text.length, text: t.text, whole: true });
      }
      if (prev && prev.who !== t.who && isBid(prev.text) && isFlat(t.text, marks)) {
        marks.push({ kind: 'turnaway', start: 0, end: t.text.length, text: t.text, whole: true });
      }
      var heat = 0, counted = {};
      marks.forEach(function (m) {
        counted[m.kind] = (counted[m.kind] || 0) + 1;
        if (counted[m.kind] <= (m.kind === 'shouting' ? 3 : 2)) heat += KINDS[m.kind].heat;
      });
      heat = Math.max(0, Math.round(heat * 10) / 10);
      out.turns.push({ who: t.who, text: t.text, typed: t.typed || '', readAs: t.readAs || [], time: t.time, date: t.date, mine: mine, marks: marks, heat: heat, words: wc });
      if (mine) out.mine++; else out.theirs++;
      prevLen = wc;
    });

    // Where it turned: the first message that is clearly hotter than what came before
    var turned = -1;
    for (var i = 1; i < n; i++) {
      var before = out.turns.slice(Math.max(0, i - 3), i);
      var avg = before.reduce(function (s, x) { return s + x.heat; }, 0) / before.length;
      if (out.turns[i].heat >= 3 && out.turns[i].heat >= avg + 2.5) { turned = i; break; }
    }
    if (turned === -1 && n && out.turns[0].heat >= 3) turned = 0;
    out.turned = turned;

    // Temperature at the start, the peak and the end
    var heats = out.turns.map(function (x) { return x.heat; });
    var peak = heats.length ? Math.max.apply(null, heats) : 0;
    // The end matters most: the last message counts for half
    var w = [0.5, 0.3, 0.2], endHeat = 0, wsum = 0;
    for (var k = 0; k < 3 && n - 1 - k >= 0; k++) { endHeat += heats[n - 1 - k] * w[k]; wsum += w[k]; }
    endHeat = wsum ? endHeat / wsum : 0;
    var head = heats.slice(0, 3), headAvg = head.length ? head.reduce(function (s, h) { return s + h; }, 0) / head.length : 0;
    var peakAt = heats.lastIndexOf(peak);
    out.peak = peak;
    out.endHeat = Math.round(endHeat * 10) / 10;
    out.level = endHeat >= 3 ? 'hot' : endHeat >= 1.2 ? 'warm' : 'calm';
    // an edge at the very end (sarcasm, a put-down, a passive jab) is never "calm", however short the message
    var lastT = n ? out.turns[n - 1] : null;
    if (lastT && out.level === 'calm' && lastT.marks.some(function (m) { return ['contempt', 'sarcasm', 'passive', 'dismiss', 'verdict', 'withdraw', 'compare', 'swear', 'hostile', 'opener', 'hint', 'short'].indexOf(m.kind) !== -1; })) out.level = 'warm';
    // swearing, a fed-up line or name-calling anywhere near the end: hot
    if (out.turns.slice(-2).some(function (t) { return t.marks.some(function (m) { return ['swear', 'hostile', 'verdict', 'contempt'].indexOf(m.kind) !== -1; }); }) && out.level !== 'hot' && peak >= 3) out.level = 'hot';
    var lastKinds = n ? out.turns[n - 1].marks.map(function (m) { return m.kind; }) : [];
    var doors = out.turns.filter(function (t) { return t.marks.some(function (m) { return m.kind === 'withdraw'; }); }).length;
    var lastTwo = out.turns.slice(-2).some(function (t) { return t.marks.some(function (m) { return m.kind === 'withdraw'; }); });
    var endsPause = lastKinds.indexOf('pause') !== -1;
    out.doors = doors;
    out.trend = !endsPause && (lastKinds.indexOf('withdraw') !== -1 || (doors >= 2 && lastTwo) || lastKinds.indexOf('short') !== -1 && heats.slice(0, -1).some(function (h) { return h >= 2.5; })) ? 'shutdown'
      : n < 3 ? 'short'
      : peak >= 3 && peakAt < n - 1 && heats[n - 1] < peak * 0.4 ? 'cooling'
      : endHeat > headAvg + 1 || (peakAt === n - 1 && peak >= 3) ? 'rising' : 'steady';

    // Patterns on each side, counted fairly
    function tally(filter) {
      var c = {};
      out.turns.filter(filter).forEach(function (t) { t.marks.forEach(function (m) { c[m.kind] = (c[m.kind] || 0) + 1; }); });
      return c;
    }
    out.tallyMe = tally(function (t) { return t.mine; });
    out.tallyThem = tally(function (t) { return !t.mine; });

    // Repair attempts the other person didn't take
    out.missedRepairs = [];
    out.turns.forEach(function (t, i) {
      if (!t.marks.some(function (m) { return m.kind === 'repair'; })) return;
      var reply = nextFrom(i, !t.mine);
      if (reply !== -1 && out.turns[reply].heat >= 2.5) out.missedRepairs.push({ at: i, reply: reply });
    });

    // Questions that may not have been answered
    out.unanswered = [];
    out.turns.forEach(function (t, i) {
      var qs = (t.text.slice(0, 4000).match(/[^?.!\n]*[?.!\n]?/g) || []).filter(function (x) { return x.slice(-1) === '?'; }).filter(function (s) {
        if (s.replace(/\?/g, '').trim().split(/\s+/).length < 3) return false;
        // "Remember when…?", "Why do you always…?", "What's wrong with you?" aren't really asking
        return !/(?:remember when|how could you|who does that|are you (?:serious|kidding)|why (?:do|would|can[’']t|didn[’']t) you (?:always|ever|even)|what(?:[’']s| is) wrong with you|how hard is it|is it too much|do you (?:even|ever) )/i.test(s) &&
               !findMarks(s).some(function (m) { return m.kind === 'history' || m.kind === 'verdict' || m.kind === 'sarcasm'; });
      });
      if (!qs.length) return;
      var reply = nextFrom(i, !t.mine);
      if (reply === -1) { if (i >= n - 2 && !t.mine) out.unanswered.push({ at: i, q: trim(qs[qs.length - 1]), open: true }); return; }
      var r = out.turns[reply].text;
      if (P && P.isFlat(r)) { out.unanswered.push({ at: i, q: trim(qs[qs.length - 1]), reply: reply, flat: trim(r) }); return; }
      var yesNo = /^(?:yes|yeah|yep|no|nope|sure|ok|okay|maybe|not really|i think|i will|i can|i did|i didn|because|since|it was|it[’']s|that[’']s)/i.test(trim(r));
      var qWords = contentWords(qs.join(' ')), rWords = contentWords(r);
      var overlap = qWords.some(function (w) { return rWords.indexOf(w) !== -1; });
      var deflect = /\?\s*$/.test(trim(r)) && !overlap;
      if (!yesNo && (!overlap || deflect) && out.turns[reply].heat >= 1) out.unanswered.push({ at: i, q: trim(qs[qs.length - 1]), reply: reply });
    });

    function nextFrom(i, mine) {
      for (var j = i + 1; j < n; j++) if (out.turns[j].mine === mine) return j;
      return -1;
    }

    // What it's about, and where new topics came in
    out.topic = findTopic(out.turns.slice(0, Math.min(4, n)));
    out.drift = [];
    out.turns.forEach(function (t, i) { if (t.marks.some(function (m) { return m.kind === 'history'; })) out.drift.push(i); });

    // Long silences, when times are in the paste
    out.gaps = [];
    out.turns.forEach(function (t, i) {
      var p = out.turns[i - 1];
      if (!p || !t.time || !p.time) return;
      var mins = minutesBetween(p, t);
      if (mins >= 120 && Math.max(p.heat, t.heat, i > 1 ? out.turns[i - 2].heat : 0) >= 2) out.gaps.push({ at: i, mins: mins });
    });

    function any(kind) { return out.turns.some(function (t) { return t.marks.some(function (m) { return m.kind === kind; }); }); }
    out.selfHarm = false; out.threat = any('threat'); out.control = any('control');
    out.safety = out.selfHarm || out.threat || out.control;
    out.bids = [];
    out.turns.forEach(function (t, i) { if (t.marks.some(function (m) { return m.kind === 'turnaway'; })) out.bids.push({ at: i - 1, reply: i }); });
    out.next = nextMove(out);
    out.drafts = out.safety ? [] : drafts(out);
    return out;
  }

  // What the conversation is about: the most-mentioned "the ___" / "your ___" phrase early on
  var VAGUE = /^(?:way|point|problem|thing|fact|end|same|whole|rest|last|first|second|third|fourth|fifth|next|other|time|times|weekend|plan|plans|moment|idea|deal|reason|issue|mood|situation|conversation|matter)$/;
  // Everyday things people talk about. A topic from this list wins; otherwise a thing mentioned at
  // least twice; otherwise no topic at all, rather than a guess like "the thoughts" or "the best".
  var TOPICS = ('dishes|sink|kitchen|laundry|trash|garbage|bins|recycling|bathroom|chores|cleaning|groceries|shopping|dinner|lunch|breakfast|cooking|rent|bills?|electric bill|water bill|internet bill|budget|money|venmo|car|school pickups?|pickups?|pick-ups?|school run|drop-off|school|homework|kids|baby|dog|cat|vet|trip|vacation|holiday|holidays|thanksgiving|christmas|party|wedding|birthday|weekend|plans|schedule|calendar|meeting|report|deck|deadline|project|presentation|email|invoice|shift|rota|handoff|custody|visit|guests?|boyfriend|girlfriend|noise|music|thermostat|heating|car park|parking|lease|landlord|deposit|mortgage|phone|bedtime|screen time|game|games|gym|appointment|doctor|dentist|mom|dad|parents|in-laws|family|job|work|promotion|raise|sofa|garage|garden|yard|lawn|snow|fridge|milk|leftovers|toilet|shower|towels|bed|keys').split('|');
  var NOT_TOPIC = /^(?:best|worst|most|least|last|first|next|other|same|whole|thoughts?|feelings?|idea|ideas|point|problem|thing|things|stuff|way|end|fact|time|times|moment|reason|issue|mood|situation|conversation|matter|deal|kind|sort|type|part|bit|lot|one|ones|rest|side|sense|world|life|day|week|night|morning|evening|minute|hour|second|message|messages|text|texts|point|question|answer|help|chance|plan|truth|problem|mistake|fault|attitude|tone|face|heads|head|hand|hands|mind|word|words|talk|call)$/;
  function findTopic(turns) {
    var lex = {}, lexOrder = [];
    turns.forEach(function (t) {
      var low = t.text.toLowerCase().replace(/[’']/g, '');
      TOPICS.forEach(function (w) {
        var m = low.match(new RegExp('\\b' + w + '\\b', 'g'));
        if (m) { var k = m[0]; if (!lex[k]) { lex[k] = 0; lexOrder.push(k); } lex[k] += m.length; }
      });
    });
    if (lexOrder.length) {
      lexOrder.sort(function (a, b) { return lex[b] - lex[a] || b.length - a.length; });
      var tw = lexOrder[0];
      return (/^(?:work|money|dinner|lunch|breakfast|school|homework|rent|laundry|trash|garbage|recycling|cooking|cleaning|groceries|shopping|custody|parking|noise|music|heating|bedtime|screen time|family|parents|kids|christmas|thanksgiving)$/.test(tw) ? '' : 'the ') + tw;
    }
    var freq = {}, order = [];
    turns.forEach(function (t) {
      var rx = /\b(?:the|my|your|our|his|her|their|this|that)\s+([a-z][a-z'’]+)(?:\s+([a-z][a-z'’]+))?/gi, m;
      while ((m = rx.exec(t.text))) {
        var a = m[1].toLowerCase().replace(/['’]s$/, ''), b = (m[2] || '').toLowerCase().replace(/['’]s$/, '');
        if (STOP.indexOf(a) !== -1 || VAGUE.test(a) || NOT_TOPIC.test(a) || /(?:est|ly|ful|ous|ive|able|ible)$/.test(a) || a.length < 3) continue;
        // "the electric bill": keep a second word when the first reads as a describing word
        var phrase = b && STOP.indexOf(b) === -1 && !VAGUE.test(b) && /(?:ic|al|ous|ful|ive|y|en|er|ing)$/.test(a) && !/(?:ing)$/.test(b) ? a + ' ' + b : a;
        var det = /^(?:my|your|our|his|her|their)$/i.test(m[0].split(/\s+/)[0]) ? m[0].split(/\s+/)[0].toLowerCase() : 'the';
        var key = phrase;
        if (!freq[key]) { freq[key] = { n: 0, det: det }; order.push(key); }
        freq[key].n++;
      }
    });
    if (!order.length) return '';
    order.sort(function (x, y) { return freq[y].n - freq[x].n; });
    var top = order[0];
    if (freq[top].n < 2) return "";
    return (freq[top].det === 'your' || freq[top].det === 'my' ? 'the' : freq[top].det) + ' ' + top;
  }

  function toMinutes(time) {
    var m = String(time).match(/(\d{1,2})[:.](\d{2})(?::\d{2})?\s?([AaPp])?/);
    if (!m) return null;
    var h = +m[1] % 12, mi = +m[2];
    if (m[3] && /p/i.test(m[3])) h += 12; else if (!m[3]) h = +m[1];
    return h * 60 + mi;
  }
  function minutesBetween(a, b) {
    var x = toMinutes(a.time), y = toMinutes(b.time);
    if (x === null || y === null) return 0;
    if (a.date && b.date && a.date !== b.date) return 24 * 60 - x + y;
    return y >= x ? y - x : 0;
  }

  // ---------- How to respond ----------
  function nextMove(r) {
    var n = r.turns.length;
    if (!n) return null;
    var last = r.turns[n - 1];
    var lastTheirs = null;
    for (var i = n - 1; i >= 0; i--) if (!r.turns[i].mine) { lastTheirs = r.turns[i]; break; }
    var topic = r.topic || 'this';
    var has = function (t, k) { return t && t.marks.some(function (m) { return m.kind === k; }); };
    var feelingWord = lastTheirs && (lastTheirs.text.match(/i(?:[’']m| am| feel| felt)(?: so| really| just)? (hurt|sad|worried|tired|exhausted|frustrated|scared|overwhelmed|anxious|upset|lonely|stressed|disappointed|embarrassed|ignored|alone|angry)/i) || [])[1];
    var moves = [];

    if (r.safety) {
      moves.push({ key: 'safety', title: 'Step away from this one',
        say: 'Threats, and checking or controlling what someone does, aren’t a communication problem to be worded better, and the conversation tools on this site aren’t meant for them. Step away from the conversation for now.',
        script: '' });
      return moves;
    }
    if (r.trend === 'shutdown') {
      moves.push({ key: 'pause', title: 'Someone has shut down. Give it time, then come back',
        say: 'The conversation ended with someone pulling away. That usually means they’re flooded, not that it’s settled. More messages now tend to push harder. Name a return time instead.',
        script: 'I can tell this is a lot right now. Let’s stop here. Can we talk about ' + topic + ' at [time]? I’m not going anywhere.',
        dig: ['/check-ins-in-depth.html#regroup', 'How to pause and come back'] });
    } else if (r.level === 'hot' || (r.trend === 'rising' && r.level !== 'calm' && r.peak >= 3)) {
      moves.push({ key: 'pause', title: 'Pause, and name when you’ll come back',
        say: 'It’s too hot to settle anything right now. A pause isn’t giving up if you say when you’ll return.' + (r.form === 'text' ? ' Text strips out tone, so a call or talking in person later will go better.' : ''),
        script: 'I want to get this right, and I don’t think we can right now. Can we talk about ' + topic + ' at [time]? I’m not going anywhere.',
        dig: ['/check-ins-in-depth.html#regroup', 'How to pause and come back'] });
    }
    if (lastTheirs && has(lastTheirs, 'repair') && lastTheirs === last && r.peak >= 2.5) {
      moves.push({ key: 'take', title: 'They reached out. Take it.',
        say: 'Their last message is a repair attempt. Taking it matters more than winning the point. (If the same hurt keeps happening, with an apology after it each time, you don’t have to accept the apology.)',
        script: 'Thank you for saying that. I want to sort this out too. Can we talk about ' + topic + ' properly at [time]?',
        dig: ['/check-ins-in-depth.html#leverage', 'Turning a hard moment into a better setup'] });
    }
    var missedMine = r.missedRepairs.filter(function (x) { return !r.turns[x.at].mine; });
    if (missedMine.length) {
      var rep = r.turns[missedMine[missedMine.length - 1].at];
      moves.unshift({ key: 'goback', title: 'Go back to the moment they reached out',
        say: 'They tried to cool things down (“' + snippet(rep.text) + '”), and the reply didn’t take it. It isn’t too late: naming that is one of the fastest ways back.',
        script: 'Earlier you reached out and I answered badly. I’m sorry. I do want to sort out ' + topic + '. Can we talk at [time]?',
        dig: ['/check-ins-in-depth.html#regroup', 'Coming back after it went wrong'] });
    }
    var missedBid = r.bids.filter(function (b) { return r.turns[b.reply].mine; });
    if (missedBid.length) {
      var news = r.turns[missedBid[missedBid.length - 1].at].text;
      var what = (news.match(/\bi got (the|a|an|my) ([a-z]+(?: [a-z]+)?)/i) || []);
      moves.push({ key: 'bid', title: 'Go back to their good news',
        say: 'They shared something that mattered to them (“' + snippet(news) + '”) and the reply was flat. Going back to it, even hours later, counts.',
        script: 'I’m sorry I was short when you told me' + (what[2] ? ' about ' + (what[1].toLowerCase() === 'my' ? 'your' : 'the') + ' ' + what[2] : '') + '. I’m really glad for you. Tell me about it?',
        dig: ['/check-ins-in-depth.html#leverage', 'Small moments that build a better setup'] });
    }
    var theirQ = r.unanswered.filter(function (u) { return !r.turns[u.at].mine; });
    if (theirQ.length) {
      moves.push({ key: 'answer', title: 'Answer their question first',
        say: 'They asked something that may not have been answered: “' + theirQ[theirQ.length - 1].q + '” A direct answer settles more than a new point.',
        script: 'You asked ' + '“' + theirQ[theirQ.length - 1].q + '” The honest answer is [answer].',
        dig: ['/check-ins-in-depth.html#order', 'Hear it back before you answer'] });
    }
    if (feelingWord) {
      moves.push({ key: 'reflect', title: 'Say back what you heard',
        say: 'They told you how they feel. Showing you heard it comes before explaining your side.',
        script: 'It sounds like you’re feeling ' + feelingWord.toLowerCase() + ' about ' + topic + '. Did I get that right?',
        dig: ['/check-ins-in-depth.html#order', 'Hear it back before you answer'] });
    }
    if (!moves.length && r.peak < 1.5) {
      moves.push({ key: 'fine', title: 'This one looks okay',
        say: 'Nothing in the words suggests hurt or heat. Everyday moments like this, answered warmly, are what connection is built from.',
        script: '' });
      return moves;
    }
    moves.push({ key: 'ffa', title: moves.length ? 'Then: one fact, one feeling, one ask' : 'Make your point in three short parts: one fact, one feeling, one ask',
      say: 'When you’re ready to make your point, keep it to one topic and three short parts.',
      script: 'When [what happened, one specific time], I felt [one feeling]. Could you [one specific thing, by when]?',
      dig: ['/workpapers/wp-09-tone-filter-in-depth.html', 'WP-09: turning a reaction into fact, feeling and ask'] });
    return moves;
  }

  // Two or three replies someone could actually send, built from this conversation's own words:
  // the topic, their question or ask, a time already mentioned, and the sharpest thing said on your side.
  function drafts(r) {
    var n = r.turns.length, out = [];
    if (!n) return out;
    var theirs = r.turns.filter(function (t) { return !t.mine; }), mineT = r.turns.filter(function (t) { return t.mine; });
    var last = theirs[theirs.length - 1];
    var topic = r.topic || 'this';
    var allText = r.turns.map(function (t) { return t.text; }).join(' \n');
    var when = (allText.match(/\b(?:tonight|tomorrow(?: (?:morning|night|evening))?|this (?:weekend|evening|afternoon)|(?:on )?(?:mon|tues|wednes|thurs|fri|satur|sun)day|after (?:dinner|work|school)|at \d{1,2}(?::\d{2})?\s*(?:am|pm)?|by \d{1,2}(?::\d{2})?\s*(?:am|pm)?)\b/i) || [])[0];
    // "Friday" → "on Friday", "tonight" stays "tonight", "at 7" stays "at 7"
    var whenTxt = when ? when.replace(/^on /i, '').toLowerCase().replace(/\b(mon|tues|wednes|thurs|fri|satur|sun)day\b/, function (d) { return d.charAt(0).toUpperCase() + d.slice(1); }) : '';
    if (/^[A-Z]/.test(whenTxt)) whenTxt = 'on ' + whenTxt;
    if (r.peak < 1.5 && r.next && r.next.length && r.next[0].key === 'fine') return out;
    // their ask: "could you …", "can you …", "please …", in their most recent message that has one
    var ask = null;
    for (var ti = theirs.length - 1; ti >= 0 && !ask; ti--) ask = (theirs[ti].text.match(/\b(?:can|could|would|will) you (?:please )?([^.?!\n]{3,70})/i) || theirs[ti].text.match(/\bplease ([^.?!\n]{3,60})/i) || [])[1] || null;
    // their question, if it's a real one
    var q = r.unanswered.filter(function (u) { return !r.turns[u.at].mine; }).map(function (u) { return u.q; }).pop();
    var feel = last && (last.text.match(/i(?:[’']m| am| feel| felt)(?: so| really| just)? (hurt|sad|worried|tired|exhausted|frustrated|scared|overwhelmed|anxious|upset|lonely|stressed|disappointed|embarrassed|ignored|alone|angry|unseen|stretched)/i) || [])[1];
    // their words, from my side: "send me your notes" → "send you my notes"
    function mine(t) { var SW = { me: 'you', my: 'your', mine: 'yours', your: 'my', yours: 'mine', you: 'you', myself: 'yourself', yourself: 'myself' }; return t.replace(/\b(me|my|mine|your|yours|you|myself|yourself)\b/gi, function (w) { return SW[w.toLowerCase()]; }); }
    var hot = r.level === 'hot' || r.peak >= 3 || r.trend === 'shutdown';
    // their good news met with a flat reply from me: go back to it, first
    var myBid = r.bids.filter(function (x) { return r.turns[x.reply].mine; }).pop();
    if (myBid) {
      var news = r.turns[myBid.at].text, nw = (news.match(/\bi got (the|a|an|my) ([a-z]+(?: [a-z]+)?)/i) || []);
      out.push({ label: 'Go back to their good news', text: 'Sorry I was short when you told me' + (nw[2] ? ' about ' + (nw[1].toLowerCase() === 'my' ? 'your' : 'the') + ' ' + nw[2] : '') + '. I’m really glad for you! Tell me everything?' });
    }
    // 1. answer what they asked, in their words
    var askHasTime = ask && (/\b(?:tonight|today|tomorrow|this (?:week|weekend|evening)|(?:mon|tues|wednes|thurs|fri|satur|sun)days?|at \d|by \d|\d\s*(?:am|pm))\b/i.test(ask));
    if (ask) out.push({ label: 'Say yes to the ask' + (askHasTime ? '' : ', with a time'), text: 'Yes, I can ' + mine(ask.trim()).replace(/[,;]+$/, '') + (askHasTime ? '' : whenTxt ? ' ' + whenTxt : ' by [time]') + '. Thanks for asking me straight.' });
    if (q && !(ask && q.indexOf(ask.trim().slice(0, 20)) !== -1)) out.push({ label: 'Answer their question first', text: 'You asked, “' + q.replace(/\s+/g, ' ').trim() + '” The honest answer is [your answer].' });
    // 2. own the sharpest thing you said
    var edges = ['contempt', 'sarcasm', 'passive', 'verdict', 'dismiss', 'compare', 'absolute', 'shouting', 'demand'];
    var sharp = null;
    mineT.forEach(function (t) { t.marks.forEach(function (m) { if (!m.whole && edges.indexOf(m.kind) !== -1 && (!sharp || edges.indexOf(m.kind) < edges.indexOf(sharp.kind))) sharp = m; }); });
    if (sharp) out.push({ label: 'Own your part', text: 'I’m sorry I said “' + sharp.text.trim() + '”. That came out sharper than I meant. What I meant was: [the plain version, one sentence].' });
    // 3. slow it down, or say back how they feel
    if (feel) out.push({ label: 'Say back what you heard', text: 'It sounds like you’re feeling ' + feel.toLowerCase() + ' about ' + topic + '. Did I get that right?' });
    if (hot && out.length < 3) out.push({ label: 'Pause, with a time to come back', text: 'I don’t want to keep going back and forth by text. Can we talk about ' + topic + ' ' + (whenTxt ? whenTxt : 'tonight at [time]') + '? I’m not going anywhere.' });
    if (out.length < 2) out.push({ label: 'One fact, one feeling, one ask', text: (topic !== 'this' ? 'About ' + topic + ': ' : '') + '[what happened, one specific time]. I felt [one feeling]. Could you [one specific thing] ' + (whenTxt ? (/^(?:on|at|by|tonight|tomorrow|this)\b/i.test(whenTxt) ? whenTxt.replace(/^on /, 'by ') : whenTxt) : 'by [time]') + '?' });
    return out.slice(0, 3);
  }

  function snippet(t) { t = trim(t).replace(/\s+/g, ' '); return t.length > 70 ? t.slice(0, 67).replace(/\s\S*$/, '') + '…' : t; }

  // ---------- A reply someone is about to send ----------
  // Only tidy what can be tidied without changing meaning or grammar. Anything else is
  // flagged with a suggestion, and a simple shape is offered to write it fresh.
  function tidy(text) {
    return String(text)
      .replace(/!{2,}/g, '!').replace(/\?{2,}/g, '?').replace(/\?!|!\?/g, '?')
      .replace(/\b([A-Z]{3,})\b/g, function (w) { return /^(?:OK|USA|UK|ADHD|OCD|PTSD|ASAP|FYI|PDF|WP|CALC|ID|NHS|IRS|GPS|ETA)$/.test(w) ? w : w.toLowerCase(); })
      .replace(/\balways\b/gi, function (w) { return w[0] === 'A' ? 'Often' : 'often'; })
      .replace(/\bnever\b/gi, function (w) { return w[0] === 'N' ? 'Rarely' : 'rarely'; });
  }
  function checkDraft(text) {
    text = String(text || '');
    var marks = findMarks(text);
    var has = function (k) { return marks.some(function (m) { return m.kind === k; }); };
    var unsafe = has('threat') || has('control');
    var tidied = unsafe ? '' : tidy(text);
    return {
      marks: marks,
      unsafe: unsafe,
      softened: tidied && tidied !== text ? tidied : '',
      shape: unsafe ? '' : 'When [what happened, one specific time], it landed as [how it felt, or what it made hard for you]. Could you [one specific thing, by when]?',
      checks: unsafe ? [] : [
        { ok: has('feeling') || has('ask') || /\bi need\b|\bi(?:[’']d| would) like\b|\bit landed\b|\bit made\b/i.test(text), label: 'Says what you need or how it landed (a feeling word is optional)' },
        { ok: has('ask'), label: 'Makes one clear ask (“Could you…?”)' },
        { ok: !has('verdict') && !has('absolute') && !has('dismiss') && !has('sarcasm') && !has('contempt') && !has('passive') && !has('compare') && !has('pointed') && !has('withdraw'), label: 'No verdicts, always/never, dismissals, sarcasm, jabs, comparisons or shutting the door' },
        { ok: !has('history'), label: 'Stays on one topic' }
      ]
    };
  }

  var api = { parse: parse, read: read, checkDraft: checkDraft, findMarks: findMarks, KINDS: KINDS };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.TOLReader = api;
})(this);
