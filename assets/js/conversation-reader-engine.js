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

  // ---------- Parsing ----------
  var RX = {
    waIOS: /^‎?\[(\d{1,4}[./-]\d{1,2}[./-]\d{1,4}),?\s+(\d{1,2}[:.]\d{2}(?::\d{2})?\s?(?:[AaPp]\.?[Mm]\.?)?)\]\s+([^:]{1,40}):\s?(.*)$/,
    waAndroid: /^(\d{1,4}[./-]\d{1,2}[./-]\d{1,4}),?\s+(\d{1,2}[:.]\d{2}\s?(?:[AaPp]\.?[Mm]\.?)?)\s+[-–]\s+([^:]{1,40}):\s?(.*)$/,
    named: /^\s*([A-Za-zÀ-ɏ][\wÀ-ɏ .'’&-]{0,30}?)\s*:\s+(.+)$/,
    emailOn: /^\s*On (.{3,140}?)\s*wrote:\s*$/i,
    emailFrom: /^\s*From:\s*([^<\n]{1,60}?)\s*(?:<[^>]*>)?\s*$/i,
    header: /^\s*(Sent|To|Cc|Bcc|Subject|Date):/i,
    quoted: /^\s*>/,
    noise: /^(?:<Media omitted>|<attached:.*>|This message was deleted\.?|You deleted this message\.?|Messages and calls are end-to-end encrypted.*|image omitted|sticker omitted|GIF omitted|audio omitted|video omitted)$/i
  };
  var NOT_NAMES = /^(https?|www|note|ps|p\.s|re|fwd?|subject|to|cc|date|sent|from|time|edit|update|also|and|but|ok|so|well|yes|no|like)$/i;

  function parse(text) {
    var lines = String(text || '').replace(/\r\n?/g, '\n').split('\n');
    var turns = [], format = 'unlabelled';

    // Chat exports and "Name: message" lines
    var labelled = 0;
    lines.forEach(function (l) { if (RX.waIOS.test(l) || RX.waAndroid.test(l) || namedMatch(l)) labelled++; });
    var nonEmpty = lines.filter(function (l) { return l.trim(); }).length;
    var isEmail = lines.some(function (l) { return RX.emailOn.test(l) || RX.emailFrom.test(l); });

    if (isEmail) {
      format = 'email';
      var cur = null;
      lines.forEach(function (l) {
        l = l.replace(/^(?:\s*>)+\s?/, '');   // quoted replies: strip every level of ">"
        var on = l.match(RX.emailOn), from = l.match(RX.emailFrom);
        if (on || from) { cur = { who: on ? senderOf(on[1]) : clean(from[1]), text: '' }; turns.push(cur); return; }
        if (RX.header.test(l)) return;
        if (!cur) { cur = { who: '', text: '' }; turns.push(cur); }
        cur.text += (cur.text ? '\n' : '') + l;
      });
      // An email thread is newest-first; read it oldest-first
      turns = turns.map(function (t) { t.text = t.text.trim(); return t; }).filter(function (t) { return t.text; }).reverse();

    } else if (labelled >= 2 && labelled >= nonEmpty * 0.4) {
      lines.forEach(function (l) {
        if (!l.trim()) return;
        var m = l.match(RX.waIOS) || l.match(RX.waAndroid);
        if (m) { format = 'chat export'; push(clean(m[3]), m[4], m[2], m[1]); return; }
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
    selfharm: { label: 'Safety: self-harm', heat: 6, tone: 'alarm', safety: true },
    threat:   { label: 'Safety: a threat', heat: 6, tone: 'alarm', safety: true },
    control:  { label: 'Safety: controlling', heat: 4, tone: 'alarm', safety: true },
    withdraw: { label: 'Shutting down', heat: 2, tone: 'hot',
                hear: '“I’m done”, “leave me alone” or “forget it” usually means someone is flooded: too overwhelmed to keep going. It isn’t calm, even when the messages stop.',
                instead: 'Name the pause and a time to come back: “I need an hour. I’ll call you at 8.”' },
    turnaway: { label: 'Good news met flat', heat: 1, tone: 'warm',
                hear: 'When someone shares good news or reaches out for attention and gets a flat reply, it lands as rejection, even when it wasn’t meant that way. Responding with real interest to good news is one of the strongest everyday builders of connection.',
                instead: 'Ask one question about it, or say what you’re glad about.' },
    verdict:  { label: 'A verdict on the person', heat: 3, tone: 'hot',
                hear: 'A sentence about who someone is (“you’re selfish”) is heard as an attack, so it gets defended instead of heard.',
                instead: 'Describe what happened and how it landed, not what kind of person they are.' },
    absolute: { label: 'Always / never', heat: 1.5, tone: 'hot',
                hear: '“Always” and “never” turn one moment into a verdict on everything. The other person usually argues with the absolute instead of hearing the point.',
                instead: 'Name the specific time: “this week”, “the last two times”.' },
    dismiss:  { label: 'Dismissing', heat: 2.5, tone: 'hot',
                hear: 'Words like “calm down”, “whatever” or “you’re overreacting” tell the other person their feeling doesn’t count. They usually raise the heat.',
                instead: 'Say what you can hear, even if you see it differently: “I can tell this matters to you.”' },
    sarcasm:  { label: 'Sarcasm', heat: 2, tone: 'hot',
                hear: 'Sarcasm reads worse in writing than out loud. With no tone of voice, the other person fills the gap with the worst version.',
                instead: 'Say the real thing plainly, once.' },
    demand:   { label: 'Order or blame question', heat: 1.5, tone: 'warm',
                hear: '“You should”, “you need to” and “why can’t you” land as orders or blame, so they invite pushback.',
                instead: 'Turn it into a request: “Could you…?”' },
    history:  { label: 'Bringing in the past', heat: 1.5, tone: 'warm',
                hear: 'Bringing in other times (“last time”, “remember when”) widens one topic into many. Nobody can answer all of them at once.',
                instead: 'Keep to one topic. Write the others down for another day.' },
    shouting: { label: 'Shouting in text', heat: 1, tone: 'warm',
                hear: 'Capitals and stacked punctuation (!!, ?!) read as shouting.',
                instead: 'Plain case, one punctuation mark.' },
    vague:    { label: 'Vague timing', heat: 0.5, tone: 'note',
                hear: '“Later”, “soon” or “when you get a chance” can mean tonight to one person and next week to the other. That gap is where a lot of friction starts.',
                instead: 'Name a time: “by Thursday evening”.' },
    short:    { label: 'Very short reply', heat: 1, tone: 'note',
                hear: 'A one- or two-word reply after a long message can land as “I don’t care”, even when it means “I’m overwhelmed” or “I’m busy”.',
                instead: 'If you need time, say so: “I want to answer this properly. Can I reply tonight?”' },
    repair:   { label: 'Repair attempt', heat: -2, tone: 'good',
                hear: 'This is an offer to turn it down: an apology, agreeing with part of it, or asking to pause. Repair attempts matter more than anything else in a hard conversation.',
                instead: 'Take it when it’s offered, even if the rest isn’t settled.' },
    feeling:  { label: '“I feel” statement', heat: -1, tone: 'good',
                hear: 'Saying what’s happening for you, without blame, is easier to hear than a statement about the other person.' },
    ask:      { label: 'A clear ask', heat: -0.5, tone: 'good',
                hear: 'A specific request gives the other person something they can actually do.' }
  };

  function words(list) { return new RegExp('(?:^|[^\\w’\'])(' + list.join('|') + ')(?=$|[^\\w’\'])', 'gi'); }
  var PATTERNS = {
    selfharm: [words(["kill myself", "killing myself", "end it all", "end my life", "take my (?:own )?life", "(?:i )?(?:just )?(?:want|wanna|going) to die", "wish i (?:was|were) dead", "don[’']?t want to (?:be alive|live|be here|exist)(?: anymore)?", "not want to be here anymore", "no reason to (?:live|go on)", "can[’']?t go on", "hurt(?:ing)? myself", "cut myself", "better off (?:without me|dead|if i (?:was|were) gone)", "suicid(?:e|al)", "won[’']?t be around (?:much longer|anymore)", "say goodbye (?:to everyone|for me)"])],
    threat: [words(["i(?:[’']?ll| will|[’']?m (?:going to|gonna)| am (?:going to|gonna)) (?:hurt|kill|hit|ruin|destroy|end) you", "you(?:[’']?ll| will) regret (?:this|it)", "you(?:[’']?ll| will) be sorry", "i(?:[’']?ll| will|[’']?m (?:going to|gonna)| am (?:going to|gonna)) make you (?:pay|sorry|regret)", "i know where you (?:are|live|work)", "watch your back", "or else", "i(?:[’']?ll| will|[’']?m (?:going to|gonna)| am (?:going to|gonna)) find you", "i(?:[’']?ll| will|[’']?m (?:going to|gonna)| am (?:going to|gonna)) take (?:the kids|the children|your kids|them)(?: away| from you)?", "you(?:[’']?ll| will) never see (?:the kids|the children|them|your kids) again", "if you (?:leave|go|tell anyone)[^.!?]{0,40}(?:i(?:[’']?ll| will|[’']?m (?:going to|gonna)| am (?:going to|gonna))|you(?:[’']?ll| will) never)", "i(?:[’']?ll| will|[’']?m (?:going to|gonna)| am (?:going to|gonna)) (?:post|send|share|show everyone) (?:your|the|those) (?:photos|pictures|messages|videos)", "i(?:[’']?ll| will|[’']?m (?:going to|gonna)| am (?:going to|gonna)) tell everyone"])],
    control: [words(["i(?:[’']?m| am) (?:checking|going through|going to check) your phone", "give me your (?:phone|password|passcode)", "what(?:[’']?s| is) your password", "(?:send|share) (?:me )?your location", "i(?:[’']?m| am) tracking you", "who were you (?:with|talking to|texting)", "answer me", "you(?:[’']?re| are) not allowed", "you (?:can[’']?t|cannot) (?:go|see|talk to|leave|have)", "you need my permission", "i forbid", "you(?:[’']?re| are) not going (?:out|anywhere)", "stop (?:seeing|talking to) your (?:friends|family|sister|brother|mom|mum|dad)", "(?:block|delete) (?:him|her|them|your friends)", "you don[’']?t get (?:any )?money", "i control the money", "you(?:[’']?ll| will) do as i say", "because i said so"])],
    verdict: [words(["you(?:[’']?re| are) (?:so |such an? |just |being |really |always |)?(?:selfish|lazy|useless|pathetic|ridiculous|crazy|insane|childish|impossible|stupid|an idiot|a joke|a liar|a mess|toxic|unbelievable|hopeless|the worst|a narcissist|dramatic|immature|clueless|heartless|cold)", "you don[’']?t care(?: about)?", "you only care about", "you(?:[’']?re| are) the problem", "what(?:[’']?s| is) wrong with you", "your problem is", "typical you", "that(?:[’']?s| is) so you", "you(?:[’']?re| are) just like your", "you make me (?:sick|crazy|miserable|feel (?:worthless|stupid|small|like (?:crap|garbage|nothing|an idiot)|bad|guilty|terrible))", "you(?:[’']?ve| have) ruined"])],
    absolute: [words(["always", "never", "every (?:single )?time", "constantly", "all the time", "not once", "not even once", "nobody", "no one", "everyone", "nothing (?:ever)?", "every day"])],
    dismiss: [words(["calm down", "just relax", "relax,", "whatever", "you(?:[’']?re| are) overreacting", "you(?:[’']?re| are) (?:too|so) sensitive", "not a big deal", "no big deal", "get over it", "chill out", "you(?:[’']?re| are) being dramatic", "i don[’']?t care", "if you say so", "here we go again", "not this again"]),
              /^(?:k|ok\.|okay\.|fine\.?|sure\.|cool\.|noted\.?)$/i],
    sarcasm: [words(["wow,? thanks", "thanks a lot", "great job,? really", "must be nice", "sure you did", "sure you are", "oh really", "as usual", "big surprise", "thanks for nothing", "real mature", "whatever you say"]), /🙄|😒|🙃/g],
    demand: [words(["you should(?:n[’']?t)?(?: have)?", "you need to", "you have to", "you better", "why can[’']?t you", "why didn[’']?t you", "why don[’']?t you ever", "why do you always", "how hard is it", "is it too much to ask", "just do it", "do it now"])],
    withdraw: [words(["i[’']?m done(?: talking)?(?: about (?:this|it))?", "i am done", "leave me alone", "forget it", "never ?mind", "i don[’']?t want to talk(?: about (?:it|this))?", "stop (?:texting|messaging|calling) me", "don[’']?t (?:text|talk to|call) me", "i give up", "doesn[’']?t matter", "it doesn[’']?t matter"])],
    history: [words(["last time", "remember when", "like (?:the )?(?:last|other) time", "just like when", "you did the same", "same thing (?:as|with)", "and another thing", "while we[’']?re at it", "not to mention", "this is (?:just )?like", "again\\?", "for the (?:hundredth|millionth|thousandth) time", "back when"])],
    vague: [words(["later", "soon", "at some point", "when you get a chance", "when you can", "whenever", "in a bit", "in a minute", "sometime", "one of these days", "eventually"])],
    repair: [words(["sorry", "i apologi[sz]e", "my bad", "my fault", "you[’']?re right", "that[’']?s fair", "fair point", "i hear you", "i get it", "i understand", "i didn[’']?t mean", "i shouldn[’']?t have", "can we (?:start over|talk|pause|take a break|try again)", "let[’']?s (?:pause|take a break|talk later|start over|try again)", "i need a (?:minute|moment|break)", "i love you", "thank you", "thanks for (?:telling|saying|listening|understanding)", "i want to (?:fix|sort|work on) this", "we[’']?re on the same (?:side|team)", "i[’']?m not against you", "good point", "i[’']?m not trying to (?:start|fight|argue|blame)", "i[’']?m not (?:mad|angry) at you"]), /❤️|💕|🙏|🫶|🤍|💛/g],
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
    // Shouting: words in capitals (3+ letters, not common acronyms) and stacked punctuation
    var caps = text.match(/\b[A-Z]{3,}\b/g) || [];
    caps = caps.filter(function (w) { return !/^(OK|USA|UK|ADHD|OCD|PTSD|ASAP|LOL|OMG|FYI|BTW|TV|PM|AM|ETA|DIY|RSVP|PDF|WP|CALC|ID|NHS|IRS|GPS)$/.test(w); });
    if (caps.length >= 1 && caps.join('').length >= 4) caps.forEach(function (w) { var i = text.indexOf(w); marks.push({ kind: 'shouting', start: i, end: i + w.length, text: w }); });
    var punct = /[!?]{2,}/g, pm;
    while ((pm = punct.exec(text))) marks.push({ kind: 'shouting', start: pm.index, end: pm.index + pm[0].length, text: pm[0] });

    // "never mind" is a dismissal, not an absolute; "thank you" inside sarcasm stays sarcasm
    marks = marks.filter(function (a) {
      return !marks.some(function (b) { return b !== a && b.start <= a.start && b.end >= a.end && (b.end - b.start) > (a.end - a.start); });
    });
    // "I'm sorry you feel that way" is not a repair
    if (/sorry (?:you feel|that you feel|if you)/i.test(text)) marks = marks.filter(function (m) { return m.kind !== 'repair' || !/sorry/i.test(m.text); }).concat([{ kind: 'dismiss', start: text.search(/sorry/i), end: text.search(/sorry/i) + 5, text: 'sorry you feel', non: true }]);
    marks.sort(function (a, b) { return a.start - b.start; });
    return marks;
  }

  // Good news, excitement or a reach for attention ("I got the job!!", "guess what", "look at this")
  var BID = /(?:\bi got (?:the|a|an|my)\b|\bguess what\b|\bgood news\b|\bgreat news\b|\bwe did it\b|\bi did it\b|\bi passed\b|\bi(?:[’']m| am) (?:so )?(?:excited|happy|proud)\b|\blook at this\b|\bcheck this out\b|\bi miss you\b|\bthinking (?:of|about) you\b|\bi love you\b|🎉|🥳|😍)/i;
  function isBid(t) { return BID.test(t) || (/!{1,}/.test(t) && /\b(?:got|won|finished|finally|yes|yay|amazing|love)\b/i.test(t)); }
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
      out.turns.push({ who: t.who, text: t.text, time: t.time, date: t.date, mine: mine, marks: marks, heat: heat, words: wc });
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
    var lastKinds = n ? out.turns[n - 1].marks.map(function (m) { return m.kind; }) : [];
    out.trend = lastKinds.indexOf('withdraw') !== -1 || lastKinds.indexOf('short') !== -1 && heats.slice(0, -1).some(function (h) { return h >= 2.5; }) ? 'shutdown'
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
    out.selfHarm = any('selfharm'); out.threat = any('threat'); out.control = any('control');
    out.safety = out.selfHarm || out.threat || out.control;
    out.bids = [];
    out.turns.forEach(function (t, i) { if (t.marks.some(function (m) { return m.kind === 'turnaway'; })) out.bids.push({ at: i - 1, reply: i }); });
    out.next = nextMove(out);
    return out;
  }

  // What the conversation is about: the most-mentioned "the ___" / "your ___" phrase early on
  var VAGUE = /^(?:way|point|problem|thing|fact|end|same|whole|rest|last|first|second|third|fourth|fifth|next|other|time|times|weekend|plan|plans|moment|idea|deal|reason|issue|mood|situation|conversation|matter)$/;
  function findTopic(turns) {
    var freq = {}, order = [];
    turns.forEach(function (t) {
      var rx = /\b(?:the|my|your|our|his|her|their|this|that)\s+([a-z][a-z'’]+)(?:\s+([a-z][a-z'’]+))?/gi, m;
      while ((m = rx.exec(t.text))) {
        var a = m[1].toLowerCase().replace(/['’]s$/, ''), b = (m[2] || '').toLowerCase().replace(/['’]s$/, '');
        if (STOP.indexOf(a) !== -1 || VAGUE.test(a)) continue;
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
    var topic = r.topic || '[the one topic]';
    var has = function (t, k) { return t && t.marks.some(function (m) { return m.kind === k; }); };
    var feelingWord = lastTheirs && (lastTheirs.text.match(/i(?:[’']m| am| feel| felt)(?: so| really| just)? (hurt|sad|worried|tired|exhausted|frustrated|scared|overwhelmed|anxious|upset|lonely|stressed|disappointed|embarrassed|ignored|alone|angry)/i) || [])[1];
    var moves = [];

    if (r.safety) {
      moves.push({ key: 'safety', title: 'Put safety first',
        say: (r.selfHarm ? 'Something in this conversation sounds like someone may be thinking about ending their life or hurting themselves. Reach out for help now, and if someone is in immediate danger, call emergency services. ' : '') +
             (r.threat || r.control ? 'Threats, and checking or controlling what someone does, aren’t a communication problem to be worded better. The conversation tools on this site aren’t meant for that situation, and you don’t owe calm replies to them. Your safety comes first, and there are people who can help you think it through.' : ''),
        script: '' });
      return moves;
    }
    if (r.trend === 'shutdown') {
      moves.push({ key: 'pause', title: 'Someone has shut down. Give it time, then come back',
        say: 'The conversation ended with someone pulling away. That usually means they’re flooded, not that it’s settled. More messages now tend to push harder. Name a return time instead.',
        script: 'I can tell this is a lot right now. Let’s stop here. Can we come back to ' + topic + ' at [time]? I’m not going anywhere.',
        dig: ['/check-ins-in-depth.html#regroup', 'How to pause and come back'] });
    } else if (r.level === 'hot' || (r.trend === 'rising' && r.level !== 'calm' && r.peak >= 3)) {
      moves.push({ key: 'pause', title: 'Pause, and name when you’ll come back',
        say: 'It’s too hot to settle anything right now. A pause isn’t giving up if you say when you’ll return.' + (r.form === 'text' ? ' Text strips out tone, so a call or talking in person later will go better.' : ''),
        script: 'I want to get this right, and I don’t think we can right now. Can we come back to ' + topic + ' at [time]? I’m not going anywhere.',
        dig: ['/check-ins-in-depth.html#regroup', 'How to pause and come back'] });
    }
    if (lastTheirs && has(lastTheirs, 'repair') && lastTheirs === last && r.peak >= 2.5) {
      moves.push({ key: 'take', title: 'They reached out. Take it.',
        say: 'Their last message is a repair attempt. Taking it matters more than winning the point. (If apologies here usually come right after the same hurt, again and again, you don’t owe acceptance.)',
        script: 'Thank you for saying that. I want to sort this out too. Can we talk about ' + topic + ' properly at [time]?',
        dig: ['/check-ins-in-depth.html#leverage', 'Turning a hard moment into a better setup'] });
    }
    var missedMine = r.missedRepairs.filter(function (x) { return !r.turns[x.at].mine; });
    if (missedMine.length) {
      var rep = r.turns[missedMine[missedMine.length - 1].at];
      moves.unshift({ key: 'goback', title: 'Go back to the moment they reached out',
        say: 'They tried to turn it down (“' + snippet(rep.text) + '”), and the reply didn’t take it. It isn’t too late: naming that is one of the fastest ways back.',
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
    moves.push({ key: 'ffa', title: 'Then: one fact, one feeling, one ask',
      say: 'When you’re ready to make your point, keep it to one topic and three short parts.',
      script: 'When [what happened, one specific time], I felt [one feeling]. Could you [one specific thing, by when]?',
      dig: ['/workpapers/wp-09-tone-filter-in-depth.html', 'WP-09: turning a reaction into fact, feeling and ask'] });
    return moves;
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
    var unsafe = has('threat') || has('control') || has('selfharm');
    var tidied = unsafe ? '' : tidy(text);
    return {
      marks: marks,
      unsafe: unsafe,
      selfHarm: has('selfharm'),
      softened: tidied && tidied !== text ? tidied : '',
      shape: unsafe ? '' : 'When [what happened, one specific time], it landed as [how it felt, or what it made hard for you]. Could you [one specific thing, by when]?',
      checks: unsafe ? [] : [
        { ok: has('feeling') || has('ask') || /\bi need\b|\bi(?:[’']d| would) like\b|\bit landed\b|\bit made\b/i.test(text), label: 'Says what you need or how it landed (a feeling word is optional)' },
        { ok: has('ask'), label: 'Makes one clear ask (“Could you…?”)' },
        { ok: !has('verdict') && !has('absolute') && !has('dismiss') && !has('sarcasm') && !has('withdraw'), label: 'No verdicts, always/never, dismissals, sarcasm or shutting the door' },
        { ok: !has('history'), label: 'Stays on one topic' }
      ]
    };
  }

  var api = { parse: parse, read: read, checkDraft: checkDraft, findMarks: findMarks, KINDS: KINDS };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.TOLReader = api;
})(this);
