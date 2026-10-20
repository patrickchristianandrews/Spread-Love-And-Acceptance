/* context-panel.js: "Add context (optional, makes the reading fairer)".
   One shared, collapsible panel for every tool that reads something said (the Text message checker, the Chat analyzer,
   the Carrier Wave Decoder, the Perspective Shifter, Soften a tense moment, Write it through, WP-09).
   It asks a few short, optional questions (who they are to you, what happened just before, how they usually write,
   whether the topic keeps coming back, how you're each doing today, how you each take things in, culture or language
   notes, what you want from this), and the tool's reading uses the answers.

   Two parts:
   1. TOLContext.read(ctx, info) -> what the context means for this reading. Pure (no page needed), so the
      Signal Engine and the tests use it too. info = {text, an (a SignalEngine analysis, optional), mode: 'send'|'read',
      engine (SignalEngine, optional, to read pasted earlier messages)}.
      -> {empty, used:[plain words], notes:[{id, text, href, link}], flags:{...}, safety: 'crisis'|'fear'|'threat'|null, rel}
      Context never makes a crisis, a threat or someone's fear disappear. Free text (what happened, earlier messages,
      culture notes, anything else) is scanned for crisis and fear wording too, and that always comes first.
   2. TOLContext.mount(el, opts) -> a panel. opts: {mode: 'send'|'read' or a function, onChange(ctx), earlier: true,
      compact: false, id}. Returns {get, set, clear, open, el}. Chips over typing, every question optional, Skip always there.
      TOLContext.usedHTML(read) -> the "What I took into account" line, with "Change context".

   Storage: nothing, unless someone ticks "Remember context for this person on this device" (off by default).
   Then the lasting parts (who they are, how they usually write, how you each take things in, culture notes) are kept
   under localStorage 'tol-ctx-people', by the person's name or label. "Forget" removes it. Never sent anywhere. */
(function (root) {
  'use strict';
  var NODE = typeof module !== 'undefined' && module.exports;
  var PATTERNS = null;
  if (NODE) { try { PATTERNS = require('./message-patterns.js'); } catch (e) { PATTERNS = null; } }
  function P() { return PATTERNS || (root && root.TOLPatterns) || null; }

  /* ---------------------------------------------------------------- the questions */
  var REL = [
    ['partner', 'Partner'], ['ex', 'Ex or co-parent'], ['child', 'My child'], ['parent', 'My parent'], ['sibling', 'Sibling'],
    ['family', 'Other family'], ['friend', 'Friend'], ['date', 'New date'], ['coworker', 'Coworker'], ['manager', 'My manager'],
    ['report', 'Someone I manage'], ['roommate', 'Roommate'], ['group', 'Group chat'], ['other', 'Other']
  ];
  var AGE = [['under12', 'Under 12'], ['teen', 'Teen'], ['adult', 'Adult child']];
  var USUAL = [['short', 'Always short'], ['emoji', 'Lots of emoji'], ['tease', 'Jokes and teases a lot'], ['direct', 'Very direct'], ['formal', 'Formal'], ['unsure', 'Not sure']];
  var TOPIC = [['first', 'First time'], ['few', 'A few times'], ['keeps', 'It keeps coming back']];
  var STATE = [['tired', 'Tired'], ['stressed', 'Stressed'], ['unwell', 'Unwell'], ['rushed', 'Rushed'], ['fine', 'Fine']];
  var TAKE = [['literal', 'Literal and direct'], ['time', 'Needs time to reply'], ['tone', 'Sensitive to tone'], ['unsure', 'Not sure']];
  var GOAL = [['understood', 'To be understood'], ['plan', 'To fix a plan'], ['calm', 'To calm things'], ['limit', 'To set a limit'], ['repair', 'To repair'], ['check', 'Just to check I’m reading it right']];
  var LISTS = { rel: REL, age: AGE, usual: USUAL, topic: TOPIC, state: STATE, take: TAKE, goal: GOAL };
  function label(list, id) { for (var i = 0; i < list.length; i++) if (list[i][0] === id) return list[i][1]; return ''; }

  // the engine's relationship words (signal-engine.js): partner, coparent, family, friend, roommate, coworker, manager
  var ENGINE_REL = { partner: 'partner', ex: 'coparent', child: 'family', parent: 'family', sibling: 'family', family: 'family', friend: 'friend', date: 'friend', coworker: 'coworker', manager: 'manager', report: 'manager', roommate: 'roommate', group: 'friend', other: '' };
  var WORK = ['coworker', 'manager', 'report'];

  /* ---------------------------------------------------------------- normalising */
  function arr(v) { return Array.isArray(v) ? v.filter(Boolean) : v ? [v] : []; }
  function str(v) { return String(v == null ? '' : v).trim(); }
  function norm(ctx) {
    ctx = ctx || {};
    var people = arr(ctx.people).map(function (p) { return { rel: str(p.rel), age: str(p.age), name: str(p.name).slice(0, 40) }; }).filter(function (p) { return p.rel || p.name; });
    if (!people.length && ctx.rel) people = [{ rel: str(ctx.rel), age: str(ctx.age), name: str(ctx.name) }];
    return {
      people: people, before: str(ctx.before), earlier: str(ctx.earlier), usual: arr(ctx.usual), topic: str(ctx.topic),
      me: arr(ctx.me), them: arr(ctx.them), takeThem: arr(ctx.takeThem), takeMe: arr(ctx.takeMe),
      culture: str(ctx.culture), goal: str(ctx.goal), other: str(ctx.other)
    };
  }
  function isEmpty(c) {
    c = norm(c);
    return !c.people.length && !c.before && !c.earlier && !c.usual.length && !c.topic && !c.me.length && !c.them.length &&
      !c.takeThem.length && !c.takeMe.length && !c.culture && !c.goal && !c.other;
  }
  function count(c) {
    c = norm(c);
    return (c.people.length ? 1 : 0) + (c.before ? 1 : 0) + (c.earlier ? 1 : 0) + (c.usual.length ? 1 : 0) + (c.topic ? 1 : 0) +
      (c.me.length || c.them.length ? 1 : 0) + (c.takeThem.length || c.takeMe.length ? 1 : 0) + (c.culture ? 1 : 0) + (c.goal ? 1 : 0) + (c.other ? 1 : 0);
  }

  /* ---------------------------------------------------------------- reading the free text */
  var ESL_RE = /\b(?:english (?:is|isn't|is not) (?:their|his|her|my|our) (?:second|third|first)|(?:second|2nd|other) language|not (?:their|his|her) first language|not a native (?:speaker|english speaker)|non-native|learning english|translat(?:e|es|ing|or|ion)|english isn't (?:their|his|her))\b/i;
  var LOUD_RE = /\b(?:(?:we're|we are|my family is|our family is|they're|they are|in my family|in our family|in their family)[^.]{0,30}\b(?:loud|blunt|direct|shout|yell|teas|sarcastic|swear))|\b(?:loud|blunt|direct) (?:family|culture|household)\b/i;
  var SHORT_RE = /\b(?:always|usually|normally|just) (?:writes?|texts?|replies|types?|answers?) (?:short|brief|one word|in one word)|\b(?:short|brief|one-word) (?:texts?|replies|messages)\b|\bnot (?:a|much of a) texter\b|\bhates texting\b/i;
  var TEASE_RE = /\b(?:we|they|he|she) (?:always |often |)(?:tease|joke|banter|take the mick|take the piss|wind each other up|rib)\b|\bbanter\b|\bin-?jokes?\b|\b(?:we're|we are|we were|i'm|i was|they're|he's|she's) (?:just |only )?(?:joking|kidding|teasing|messing around)\b|\b(?:we|they) (?:always |often |)play (?:games|video games|board games|cards|chess|mario ?kart|\w+) together\b|\btrash[- ]talk/i;
  var KEEPS_RE = /\b(?:keeps? (?:coming|happening) (?:back|up)|again and again|same (?:fight|argument|thing) (?:again|every)|every (?:week|time|weekend)|for (?:months|years|ages)|we always (?:fight|argue) about)\b/i;
  var DEPL_RE = /\b(?:tired|exhausted|knackered|wiped|stressed|overwhelmed|ill|sick|unwell|poorly|migraine|long day|bad day|rough day|night shift|hasn't slept|no sleep|grieving|in pain)\b/i;
  var FIGHT_RE = /\b(?:argu(?:e|ed|ing|ment)|fight|fought|row(?:ed)?|yell(?:ed|ing)?|shout(?:ed|ing)?|snapp?ed|blew up|fell out)\b/i;
  var SORRY_RE = /\b(?:sorry|apologi[sz]ed?|my bad|i was wrong|made up)\b/i;

  // what someone says about another person ("she said she wants to kill herself", "he's scared of his dad") counts too
  var CRISIS3_RE = /\b(?:wants?|wanted|going|trying|tried|threaten(?:s|ed|ing)?|talk(?:s|ed|ing)? about|thinking about|thinks about) (?:to )?(?:kill (?:herself|himself|themselves|themself|myself)|end (?:her|his|their|my) (?:life|lives)|take (?:her|his|their|my) (?:own )?life|die)\b|\b(?:doesn't|does not|don't|do not|didn't) want to (?:be alive|live|be here|wake up)(?: anymore| any more)?\b|\bsuicid\w*|\bself[- ]harm\w*|\b(?:cutting|hurting) (?:herself|himself|themselves|myself)\b|\boverdos\w*/i;
  var FEAR3_RE = /\b(?:(?:she|he|they)(?:'s|'re| is| are)|i'm|i am) (?:so |really |too )?(?:scared|afraid|frightened|terrified) (?:of (?:him|her|them|his|her|their|my)\b|to go home)|\b(?:hits?|hit|punched|slapped|shoved|choked|strangled) (?:me|her|him|them)\b|\bthreatened (?:to|me|her|him|them)\b/i;
  function scanSafety(t) {
    var Pp = P(); if (!t) return null;
    if (CRISIS3_RE.test(t) && !/\b(?:lol|joke|joking|💀|😂)\b/i.test(t)) return 'crisis';
    if (FEAR3_RE.test(t)) return 'fear';
    if (!Pp) return null;
    if (Pp.selfHarm && Pp.selfHarm(t)) return 'crisis';
    var c = Pp.control ? Pp.control(t) : null;
    if (c && c.kinds && c.kinds.indexOf('fear') !== -1) return 'fear';
    if (Pp.THREAT_RE && new RegExp(Pp.THREAT_RE.source, 'i').test(Pp.prep ? Pp.prep(t) : t) && !(Pp.isBoundary && Pp.isBoundary(t))) return 'threat';
    if (c && (c.kind === 'isolate' || c.kind === 'degrade' || c.kind === 'monitor')) return 'control';
    return null;
  }

  // what the message itself shows, from a Signal Engine analysis when there is one, or from the words
  function cuesOf(text, an) {
    var t = String(text || ''), low = t.toLowerCase(), f = (an && an.found) || {};
    var words = an ? an.words : (t.match(/\S+/g) || []).length;
    var hasF = function (ids) { return ids.some(function (id) { return !!f[id]; }); };
    return {
      words: words,
      short: words > 0 && (words <= 5 || hasF(['minimal', 'period'])),
      emoji: /[\u{1F300}-\u{1FAFF}☀-➿]/u.test(t),
      tease: !!(an && an.banter) || !!(an && an.harm && (an.harm.playful || an.harm.kind === 'idiom')) || hasF(['sarcasm', 'jab']) || (!an && /\b(?:lol|haha|jk|lmao)\b|😂|🤣|😜/i.test(t)),
      point: !!(an && an.banterPoint) || hasF(['absolute', 'again', 'critic', 'blameq', 'jab']),
      direct: hasF(['oblig', 'impera', 'blunt', 'critic', 'should', 'minimal', 'period', 'urgent', 'cannot', 'closer']) || (!an && /^(?:do|send|call|stop|don't|get|bring|fix|tell|no)\b|\b(?:need to|have to|must)\b/i.test(t.trim())),
      hint: hasF(['hint', 'sarcasm', 'idiom', 'passiveag']) || (!!P() && P().idioms && P().idioms(t).length > 0),
      sharp: !!(an && an.staticIds && an.staticIds.length) || (!an && /\b(?:always|never|why can't you|whatever|fine\.)\b|!{2,}/i.test(t)),
      hot: hasF(['swear', 'hostile', 'label', 'contempt', 'menace', 'control', 'violent', 'dxlabel']) || !!(an && an.harm && !an.harm.playful && an.harm.kind !== 'idiom'),
      limit: !!(an && (an.care && ['no', 'rule'].indexOf(an.care.kind) !== -1 || an.parentLimit)) || hasF(['oblig', 'impera']) || /\b(?:not allowed|you can't|no,|home by|bed ?time|until your|grounded)\b/i.test(low),
      ask: !!(an && an.asks && an.asks.length) || /\?|\b(?:can you|could you|would you|please)\b/i.test(low)
    };
  }

  function listWords(ids, list) { return ids.map(function (id) { return label(list, id).toLowerCase(); }).filter(Boolean); }
  function joinAnd(a) { return a.length < 2 ? (a[0] || '') : a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1]; }
  function cut(s, n) { s = str(s).replace(/\s+/g, ' '); return s.length > n ? s.slice(0, n - 1) + '…' : s; }

  /* ---------------------------------------------------------------- what the context means */
  function read(ctxIn, info) {
    info = info || {};
    var c = norm(ctxIn), mode = info.mode === 'read' ? 'read' : 'send';
    var out = { empty: isEmpty(c), used: [], notes: [], flags: {}, safety: null, rel: '', ctx: c, mode: mode };
    if (out.empty) return out;
    var an = info.an || null, text = info.text || (an && an.text) || '';
    var cue = cuesOf(text, an);
    var F = out.flags, used = out.used;
    var note = function (id, t, href, link) { if (!out.notes.some(function (n) { return n.id === id; })) out.notes.push({ id: id, text: t, href: href || '', link: link || '' }); };
    var free = [c.before, c.earlier, c.culture, c.other].join('\n');

    // 0. safety first: crisis or fear in anything typed into the context is never ignored
    var s1 = scanSafety(c.before) || scanSafety(c.other) || scanSafety(c.culture), s2 = scanSafety(c.earlier);
    var rank = { crisis: 4, fear: 3, threat: 2, control: 1 };
    var sf = [s1, s2].filter(Boolean).sort(function (a, b) { return rank[b] - rank[a]; })[0] || null;
    if (sf) { out.safety = sf; F[sf] = true; }

    // 1. who they are
    var p0 = c.people[0] || null, rels = c.people.map(function (p) { return p.rel; });
    if (c.people.length) {
      out.rel = p0 && p0.rel ? ENGINE_REL[p0.rel] || '' : '';
      used.push(c.people.length > 1 ? 'more than one person (' + c.people.map(function (p) { return (p.name ? p.name + ', ' : '') + (label(REL, p.rel) || 'other').toLowerCase() + (p.rel === 'child' && p.age ? ' (' + label(AGE, p.age).toLowerCase() + ')' : ''); }).join('; ') + ')'
        : (p0.name ? p0.name + ', ' : '') + 'who they are to you: ' + (label(REL, p0.rel) || 'other').toLowerCase() + (p0.rel === 'child' && p0.age ? ' (' + label(AGE, p0.age).toLowerCase() + ')' : ''));
    }
    var kid = c.people.some(function (p) { return p.rel === 'child' && (p.age === 'under12' || p.age === 'teen' || !p.age); });
    var young = c.people.some(function (p) { return p.rel === 'child' && p.age === 'under12'; });
    var teen = c.people.some(function (p) { return p.rel === 'child' && p.age === 'teen'; });
    F.child = kid; F.parent = rels.indexOf('parent') !== -1;
    F.work = rels.some(function (r) { return WORK.indexOf(r) !== -1; });
    F.group = rels.indexOf('group') !== -1 || c.people.length > 2;
    F.ex = rels.indexOf('ex') !== -1; F.date = rels.indexOf('date') !== -1;
    F.manager = rels.indexOf('manager') !== -1; F.report = rels.indexOf('report') !== -1;

    // a parent setting a limit for a child, or a child hearing one
    if (cue.limit && !F.crisis && !F.fear) {
      if (mode === 'send' && kid) {
        F.parentLimit = true;
        note('limit', 'This reads as a parent setting a limit, not control. ' + (young ? 'With a young child, keep it short and calm: the rule, the reason, and what happens next.' : teen ? 'With a teen, a limit lands better with the reason, how long it lasts, and what would change it. Hearing them out first, then holding the limit, keeps it a limit and not a fight.' : 'It lands better with the reason, how long it lasts, and what would change it.'));
      } else if (mode === 'read' && F.parent) {
        F.parentLimit = true;
        note('limit', 'This reads as your parent setting a limit. It’s usually about keeping you safe, or the home running. It’s fine to ask why, calmly, or to ask what would change their mind.');
      }
    }
    if (mode === 'read' && kid && cue.sharp && !cue.hot) note('kidpush', 'Kids and teens push back on limits. It’s part of growing up, and it’s usually about the rule, not about how much they love you.');
    if (F.work) note('work', mode === 'send' ? 'At work: keep it to the task, the ask and the time. Feelings words aren’t needed, and a neutral tone reads as professional, not cold.' + (F.manager ? ' Writing to your manager, lead with the update or the question.' : F.report ? ' Writing to someone you manage, your words carry extra weight, so a plain, friendly tone helps.' : '')
      : 'Work messages are often brief because people are busy. Read it as about the task first.' + (F.manager ? ' From a manager, a short message is rarely personal.' : ''));
    if (F.group) note('group', mode === 'send' ? 'In a group chat everyone reads it, and each person hears it their own way. Keep anything about one person for a private message.' : 'In a group chat, a line may be meant for someone else, or for everyone. It’s fine to ask who it was for.');
    if (F.ex) note('ex', mode === 'send' ? 'With an ex or co-parent: brief, informative, friendly and firm usually works best. Stick to the plan and the facts.' : 'With an ex or co-parent, you only need to answer the practical part. You don’t have to answer the tone.');
    if (F.date) note('date', 'Early on, you don’t know each other’s texting style yet. Assume less, and ask more.');

    // 2. how they usually write
    var usual = c.usual.filter(function (u) { return u !== 'unsure'; });
    if (usual.length) used.push('how they usually write: ' + listWords(usual, USUAL).join(', '));
    var shortStyle = usual.indexOf('short') !== -1 || SHORT_RE.test(free);
    if (shortStyle) {
      F.shortStyle = true;
      if (mode === 'read') note('short', cue.short ? 'They usually write short, so a short reply like this probably isn’t cold. It’s how they text.' : 'They usually write short, so a longer message from them may mean this matters to them.');
      else note('short', 'They write short themselves, so a short message probably won’t read as cold to them.');
    }
    if (usual.indexOf('emoji') !== -1) {
      F.emojiStyle = true;
      if (mode === 'read' && !cue.emoji) note('emoji', 'They usually use lots of emoji, so a message with none can feel flatter than they mean. They may just be busy. Ask if you’re not sure.');
      if (mode === 'send' && !cue.emoji) note('emoji', 'They use lots of emoji, so a plain message may read cooler to them than you mean. One warm word or emoji can help.');
    }
    var tease = usual.indexOf('tease') !== -1 || TEASE_RE.test(free) || LOUD_RE.test(c.culture);
    if (tease) {
      F.tease = true;
      if (cue.tease || cue.point) {
        F.teaseRoom = !cue.hot;
        if (cue.hot) note('tease', 'Even between people who tease a lot, some words cut. This part may not land as a joke.');
        else note('tease', (mode === 'read' ? 'You two tease a lot, so this has more room to be a joke.' : 'They know you tease, so this has more room to be taken as a joke.') + (cue.point ? (mode === 'read' ? ' There may still be a real point inside it, and that part is worth answering.' : ' If there’s a real point in it, say that part plainly too, so it isn’t lost in the joke.') : ''));
      }
    }
    if (usual.indexOf('direct') !== -1 || usual.indexOf('formal') !== -1) {
      F.directStyle = usual.indexOf('direct') !== -1; F.formal = usual.indexOf('formal') !== -1;
      if (mode === 'read' && (cue.direct || cue.short || cue.sharp)) note('direct', F.directStyle ? 'They’re usually very direct, so plain wording here is probably just their style, not anger.' : 'They usually write formally, so this may be less cold than it sounds.');
      if (mode === 'send' && F.directStyle) note('direct', 'They’re direct themselves, so plain wording is likely to suit them. Hints may be missed.');
    }

    // 3. has it come up before
    if (c.topic) used.push('this topic: ' + label(TOPIC, c.topic).toLowerCase());
    if (c.topic === 'keeps' || KEEPS_RE.test(free)) {
      F.recurring = true;
      note('keeps', 'This topic keeps coming back. A text rarely settles a recurring topic. ' + (mode === 'send' ? 'Say this one thing now, and suggest a calm time to talk about the bigger pattern, not over text.' : 'You don’t have to solve it in a reply. Suggest a calm time to talk it through.'), '/workpapers/wp-04-what-keeps-coming-back.html', 'What keeps coming back (WP-04)');
    } else if (c.topic === 'few') {
      F.few = true;
      note('few', 'It’s come up a few times. Keep this message to this one time, and if it matters, suggest a time to talk about the pattern.');
    } else if (c.topic === 'first') {
      F.first = true;
      note('first', mode === 'send' ? 'It’s the first time this has come up, so a light, curious touch usually works best.' : 'It’s the first time this has come up, so there’s room to ask what they meant before deciding.');
    }

    // 4. how you're each doing today
    var me = c.me.filter(function (x) { return x !== 'fine'; }), them = c.them.filter(function (x) { return x !== 'fine'; });
    if (c.me.length) used.push('you today: ' + listWords(c.me, STATE).join(', '));
    if (c.them.length) used.push('them today: ' + listWords(c.them, STATE).join(', '));
    if (them.length) {
      F.themLow = them;
      note('them', 'They’re ' + joinAnd(listWords(them, STATE)) + ' today, so they may be running on empty. ' + (mode === 'read' ? 'The wording may be sharper than they mean.' + (cue.sharp ? ' A reply can wait until they’ve had a rest.' : '') : 'If it can wait, a calmer moment may help it land. If it can’t, keep it short and kind.'));
    }
    if (me.length) {
      F.meLow = me;
      note('me', 'You’re ' + joinAnd(listWords(me, STATE)) + ' today. ' + (mode === 'read' ? 'Messages can read harsher when we’re running low. Worth reading it again after a rest before you answer.' : 'Read it once more after a break, or keep it short for now.'));
    }
    if (!them.length && !me.length && DEPL_RE.test(c.before + ' ' + c.other)) { F.themLow = ['stressed']; note('them', 'From what you wrote, someone may be running on empty today. That can make words sharper than meant, so timing matters.'); }

    // 5. how you each take things in
    var tt = c.takeThem.filter(function (x) { return x !== 'unsure'; }), tm = c.takeMe.filter(function (x) { return x !== 'unsure'; });
    if (tt.length) used.push('how they take things in: ' + listWords(tt, TAKE).join(', '));
    if (tm.length) used.push('how you take things in: ' + listWords(tm, TAKE).join(', '));
    if (tt.indexOf('literal') !== -1) {
      F.literal = true;
      note('literal', mode === 'read' ? 'They take things literally and directly, so plain wording here is probably just plain, not cold.' : 'They take things literally. Say the ask plainly' + (cue.hint ? ': the hint, joke or figure of speech here may be missed.' : '. Hints, sarcasm and figures of speech can be missed.'));
    }
    if (tt.indexOf('time') !== -1) note('time', mode === 'read' ? 'They may need time to reply, so a slow answer from them isn’t a no.' : 'They may need time to reply. Saying there’s no rush, or giving a time, helps.');
    if (tt.indexOf('tone') !== -1) { F.toneSensitive = true; if (mode === 'send') note('tone', 'They’re sensitive to tone. Small edges can land bigger for them, so the gentler version may be worth it.' + (cue.sharp ? ' The marked parts are the ones to look at.' : '')); }
    if (tm.indexOf('literal') !== -1 && mode === 'read') note('melit', 'You take things literally. If anything here is unclear, it’s fine to ask what they meant.');
    if (tm.indexOf('tone') !== -1 && mode === 'read') note('metone', 'You notice tone a lot. The words may carry less edge than they feel like right now.');
    if (tm.indexOf('time') !== -1) note('metime', 'You can take your time. “Let me think and get back to you tonight” is a fine answer.');

    // 6. culture or language
    if (c.culture) { used.push('your note: “' + cut(c.culture, 70) + '”'); }
    if (ESL_RE.test(c.culture + ' ' + c.other + ' ' + c.before)) {
      F.esl = true;
      note('esl', mode === 'read' ? 'English isn’t their first language, so directness may come from the language, not the mood. Don’t over-read short or blunt wording.' : 'English isn’t their first language. Short sentences, plain words and no idioms help.' + (cue.hint ? ' The figure of speech here may not translate.' : ''));
    }
    if (LOUD_RE.test(c.culture)) note('loud', 'In some families loud or blunt is normal, and warm. Read it with that in mind, and notice whether it still stings.');

    // 7. what happened just before, and earlier messages
    if (c.before) {
      used.push('what happened just before: “' + cut(c.before, 70) + '”');
      if (FIGHT_RE.test(c.before)) { F.afterFight = true; note('before', mode === 'read' ? 'Coming right after a disagreement, this may carry some of that heat. It may be more about the moment than about you.' : 'Coming right after a disagreement, it may land with that heat. A short pause first can help.'); }
      else if (SORRY_RE.test(c.before)) { F.afterSorry = true; note('before', 'Someone has already said sorry. Building on that usually goes further than going back over it.'); }
    }
    if (c.earlier) {
      used.push('the earlier messages you pasted');
      var E = info.engine, ear = c.earlier;
      var ea = E && E.analyze ? E.analyze(ear, { channel: 'text' }) : null;
      var warm = ea ? !!(ea.warm || ea.apology || (ea.found && (ea.found.appreciation || ea.found.repair))) : /\b(?:thanks|thank you|love you|sorry|xx?\b|❤|😊)/i.test(ear);
      var heat = ea ? ['swear', 'hostile', 'label', 'contempt', 'sarcasm', 'jab', 'guilt', 'blameq', 'absolute', 'brushoff', 'stonewall', 'withdraw'].some(function (id) { return ea.found && ea.found[id]; }) : /\b(?:always|never|whatever|seriously|ffs|wtf)\b|!{2,}/i.test(ear);
      F.earlierWarm = warm && !heat; F.earlierHeat = heat;
      if (F.earlierHeat) note('earlier', 'In light of the earlier messages, this is part of a heated exchange. ' + (mode === 'read' ? 'A pause may help more than a quick reply.' : 'Starting with what you heard from them can help this land.'));
      else if (F.earlierWarm) note('earlier', 'In light of the earlier messages, which were friendly, ' + (mode === 'read' ? 'this is more likely a passing moment than a change in how they feel.' : 'a short, warm message fits the thread.'));
      else note('earlier', 'In light of the earlier messages, nothing in the thread changes how this reads.');
    }
    if (c.other) used.push('anything else: “' + cut(c.other, 70) + '”');

    // 8. what you want from this
    if (c.goal) {
      used.push('what you want: ' + label(GOAL, c.goal).toLowerCase());
      F.goal = c.goal;
      var G = mode === 'send' ? {
        understood: 'To be understood: say the fact and how it felt, then ask them to say back what they heard.',
        plan: 'To fix a plan: end with one specific question about what, when or who.',
        calm: 'To calm things: lead with what you agree on, keep it short, and suggest a pause if it’s heated.',
        limit: 'To set a limit: say it once, kindly and clearly. A reason helps if you want to give one, and you don’t need to apologise for having it.',
        repair: 'To repair: start with your part, then say what you hope for.',
        check: 'To check you’re reading it right: a short “did you mean…?” beats guessing.'
      } : {
        understood: 'To be understood: answer the point first, then say how it landed for you.',
        plan: 'To fix a plan: answer with one concrete suggestion, a time or a next step.',
        calm: 'To calm things: you don’t have to answer the sharpest line. Answer the part you can agree with, or ask for a pause.',
        limit: 'To set a limit: you can say no, or not like this, once and calmly. You don’t have to argue the whole thing in a text.',
        repair: 'To repair: name your part, if there was one, and the thing you both want.',
        check: 'To check you’re reading it right: ask. “I want to be sure I’ve got this. Did you mean…?”'
      };
      if (G[c.goal]) note('goal', 'What you want ' + G[c.goal].charAt(0).toLowerCase() + G[c.goal].slice(1));
    }

    // safety notes go first, and are never softened by anything above
    if (out.safety) {
      var S = {
        crisis: 'Something you added sounds like someone may be thinking about ending their life. That matters more than any message. If you’re in danger or might hurt yourself or someone else, contact your local emergency services now, or tell someone you trust nearby.',
        fear: 'Something you added says someone feels afraid or controlled. That matters much more than the wording, and it isn’t something a better wording can fix.',
        threat: 'Something you added sounds like a threat. That matters more than the wording of this message.',
        control: 'Something you added sounds like someone’s choices may be being taken away (who they see, their phone or money).'
      };
      out.notes.unshift({ id: 'safety', text: S[out.safety], href: '', link: '' });   // nohot18: no link to a list of lines
      F.parentLimit = false; F.teaseRoom = false;
    }
    return out;
  }

  /* what the Clarify questions (assets/js/clarify.js) need to know already, so they aren't asked twice */
  function forClarify(ctxIn) {
    var c = norm(ctxIn), r = read(c, {});
    // answers to the Clarify questions that the context already gives (question id -> answer id in clarify-data.js)
    var prefill = {};
    if (c.topic === 'keeps') prefill.often = 'most'; else if (c.topic === 'few') prefill.often = 'sometimes'; else if (c.topic === 'first') prefill.often = 'once';
    if (r.safety === 'fear') prefill.afraid = 'afraid';
    return {
      prefill: prefill,
      who: c.people.map(function (p) { return p.rel; }), rel: r.rel, age: (c.people[0] || {}).age || '',
      recurring: c.topic === 'keeps' ? true : c.topic === 'first' ? false : null, topic: c.topic,
      afraid: r.safety === 'fear' ? true : null, crisis: r.safety === 'crisis',
      states: { me: c.me, them: c.them }, goal: c.goal, culture: c.culture
    };
  }

  /* ---------------------------------------------------------------- HTML helpers */
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (ch) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]; }); }
  // "What I took into account" (+ the notes, + "Change context"); with nothing added, a quiet invitation to add some
  function usedHTML(r, opts) {
    opts = opts || {};
    if (!r || r.empty) return '<p class="tol-ctx-used tol-ctx-none tol-plain no-bubble">No context added, so this reads the words alone. <button type="button" class="tol-ctx-change">Add context</button> to make the reading fairer.</p>';
    var skip = opts.skip || [];
    var notes = r.notes.filter(function (n) { return skip.indexOf(n.id) === -1; }).slice(0, opts.max || 6);
    return '<div class="tol-ctx-used tol-plain no-bubble" role="note"><p class="tol-ctx-took"><b>What I took into account:</b> ' + esc(r.used.join('; ') || 'what you added') + '.' + (opts.noChange ? '' : ' <button type="button" class="tol-ctx-change">Change context</button>') + '</p>' +
      (notes.length ? '<ul class="tol-ctx-notes">' + notes.map(function (n) { return '<li class="tol-ctx-n-' + esc(n.id) + '">' + esc(n.text) + (n.href ? ' <a href="' + esc(n.href) + '">' + esc(n.link || 'More') + '</a>' : '') + '</li>'; }).join('') + '</ul>' : '') +
      '<p class="tol-ctx-still">Context makes the reading fairer. It still can’t know everything, so check it against what you know.</p></div>';
  }
  // one message can't tell you what a relationship is like
  var ONE_MESSAGE = 'One message can’t tell you what a relationship is like. If you’re not sure, ask, and look at the whole picture.';

  /* ---------------------------------------------------------------- the panel (browser only) */
  var STORE = 'tol-ctx-people';
  function lsGet() { try { var v = JSON.parse(localStorage.getItem(STORE) || 'null'); return v && typeof v === 'object' ? v : {}; } catch (e) { return {}; } }
  function lsSet(o) { try { if (!o || !Object.keys(o).length) localStorage.removeItem(STORE); else localStorage.setItem(STORE, JSON.stringify(o)); } catch (e) { /* storage off: nothing kept */ } }
  function lasting(c) { return { people: c.people, usual: c.usual, takeThem: c.takeThem, takeMe: c.takeMe, culture: c.culture }; }
  function keyOf(c) { var p = c.people[0]; return p ? (p.name || label(REL, p.rel) || '').trim() : ''; }

  var seq = 0;
  function ensureCss() {
    if (typeof document === 'undefined') return;
    var links = document.querySelectorAll('link[rel="stylesheet"]');
    for (var i = 0; i < links.length; i++) if ((links[i].getAttribute('href') || '').indexOf('context-panel.css') >= 0) return;
    var l = document.createElement('link'); l.rel = 'stylesheet'; l.href = '/assets/css/context-panel.css'; document.head.appendChild(l);
  }
  function chips(name, list, multi, sel, extra) {
    return '<div class="tol-ctx-chips" role="group" data-q="' + name + '"' + (multi ? ' data-multi' : '') + (extra || '') + '>' + list.map(function (o) {
      var on = multi ? (sel || []).indexOf(o[0]) !== -1 : sel === o[0];
      return '<button type="button" class="tol-chip" data-v="' + o[0] + '" aria-pressed="' + on + '">' + esc(o[1]) + '</button>';
    }).join('') + '</div>';
  }
  function q(id, title, body, hint) {
    return '<div class="tol-ctx-q" role="group" aria-labelledby="' + id + '"><p class="tol-ctx-k" id="' + id + '">' + title + '</p>' + (hint ? '<p class="tol-ctx-h">' + hint + '</p>' : '') + body + '</div>';
  }

  function mount(el, opts) {
    if (typeof document === 'undefined' || !el) return null;
    opts = opts || {};
    ensureCss();
    var id = opts.id || ('tctx' + (++seq));
    var modeOf = function () { return typeof opts.mode === 'function' ? opts.mode() : (opts.mode || 'send'); };
    var state = norm(opts.value || {});
    var remember = false;
    var saved = lsGet();
    if (opts.person && saved[opts.person]) { state = norm(Object.assign({}, state, saved[opts.person])); remember = true; }

    el.classList.add('tol-ctx-wrap', 'tol-plain', 'no-bubble');
    el.innerHTML = '<details class="tol-ctx" id="' + id + '"' + (opts.open ? ' open' : '') + '><summary class="tol-ctx-sum"><span class="tol-ctx-t">Add context</span> <span class="tol-ctx-s">(optional, makes the reading fairer)</span> <span class="tol-ctx-count" aria-live="polite"></span></summary><div class="tol-ctx-b"></div></details>';
    var det = el.querySelector('details'), body = el.querySelector('.tol-ctx-b');

    function personRow(p, i) {
      return '<div class="tol-ctx-person" data-i="' + i + '">' +
        (state.people.length > 1 || i > 0 ? '<p class="tol-ctx-pk">Person ' + (i + 1) + ' <button type="button" class="tol-ctx-x" data-rm="' + i + '" aria-label="Remove person ' + (i + 1) + '">Remove</button></p>' : '') +
        chips('rel' + i, REL, false, p.rel, ' aria-label="Who they are to you' + (i ? ', person ' + (i + 1) : '') + '"') +
        '<div class="tol-ctx-age"' + (p.rel === 'child' ? '' : ' hidden') + '><p class="tol-ctx-h">How old?</p>' + chips('age' + i, AGE, false, p.age, ' aria-label="How old"') + '</div>' +
        '<label class="tol-ctx-name"><span>Name or label (optional)</span><input type="text" maxlength="40" autocomplete="off" data-name="' + i + '" value="' + esc(p.name) + '" placeholder="e.g. Sam, or Mum"></label></div>';
    }
    function render() {
      var m = modeOf(), people = state.people.length ? state.people : [{ rel: '', age: '', name: '' }];
      var savedKeys = Object.keys(lsGet());
      body.innerHTML = '<p class="tol-ctx-lede">All optional. Tap what fits and skip the rest. The more it knows, the fairer the reading, though it still can’t know everything. It stays on this device.</p>' +
        (savedKeys.length ? '<p class="tol-ctx-saved">Saved on this device: ' + savedKeys.map(function (k) { return '<button type="button" class="tol-chip" data-load="' + esc(k) + '">' + esc(k) + '</button>'; }).join(' ') + '</p>' : '') +
        q(id + '-who', 'Who are they to you?', '<div class="tol-ctx-people">' + people.map(personRow).join('') + '</div><button type="button" class="tol-ctx-add">+ Add another person</button>', 'A group chat or a family thread? Add each person.') +
        q(id + '-before', 'What happened just before this?', '<textarea rows="2" maxlength="600" data-f="before" aria-labelledby="' + id + '-before" placeholder="e.g. We argued about money this morning.">' + esc(state.before) + '</textarea>' +
          (opts.earlier === false ? '' : '<details class="tol-ctx-earlier"' + (state.earlier ? ' open' : '') + '><summary>Paste earlier messages (optional)</summary><textarea rows="3" maxlength="3000" data-f="earlier" aria-label="Earlier messages" placeholder="The messages before this one, if they help.">' + esc(state.earlier) + '</textarea></details>')) +
        q(id + '-usual', 'Is this how they usually write?', chips('usual', USUAL, true, state.usual)) +
        q(id + '-topic', 'Has this topic come up before?', chips('topic', TOPIC, false, state.topic)) +
        q(id + '-today', 'How are you each doing today?', '<p class="tol-ctx-h">You</p>' + chips('me', STATE, true, state.me, ' aria-label="How you are today"') + '<p class="tol-ctx-h">Them</p>' + chips('them', STATE, true, state.them, ' aria-label="How they are today"')) +
        q(id + '-take', 'How do they, and you, take things in?', '<p class="tol-ctx-h">Them</p>' + chips('takeThem', TAKE, true, state.takeThem, ' aria-label="How they take things in"') + '<p class="tol-ctx-h">You</p>' + chips('takeMe', TAKE, true, state.takeMe, ' aria-label="How you take things in"'), 'No labels needed. <a href="/how-you-take-things-in.html">More about how people take things in</a>') +
        q(id + '-culture', 'Culture or language notes', '<input type="text" maxlength="200" data-f="culture" aria-labelledby="' + id + '-culture" value="' + esc(state.culture) + '" placeholder="e.g. English is their second language. In my family we’re loud.">') +
        q(id + '-goal', 'What do you want from this?', chips('goal', GOAL, false, state.goal)) +
        q(id + '-other', 'Anything else?', '<textarea rows="2" maxlength="600" data-f="other" aria-labelledby="' + id + '-other">' + esc(state.other) + '</textarea>') +
        '<div class="tol-ctx-foot"><label class="tol-ctx-rem"><input type="checkbox" class="tol-ctx-remember"' + (remember ? ' checked' : '') + '> Remember context for this person on this device</label>' +
        (savedKeys.length ? ' <button type="button" class="tol-ctx-forget" data-clear-confirm="the context you saved about people" data-clear-keys="tol-ctx-people">Forget saved context</button>' : '') +
        '<p class="tol-ctx-h tol-ctx-remh">Off unless you tick it. It keeps who they are, how they write and how you each take things in, under their name or label, in this browser only.</p>' +
        '<div class="tol-ctx-btns"><button type="button" class="tol-ctx-done">' + (m === 'read' ? 'Done, read it again' : 'Done, check it again') + '</button><button type="button" class="tol-ctx-skip">Skip</button><button type="button" class="tol-ctx-clear">Clear all</button></div></div>';
      paintCount();
    }
    function paintCount() {
      var n = count(state), cEl = el.querySelector('.tol-ctx-count');
      if (cEl) cEl.textContent = n ? '· ' + n + ' added' : '';
      det.classList.toggle('tol-ctx-has', n > 0);
    }
    function save() {
      if (!remember) return;
      var k = keyOf(state); if (!k) return;
      var all = lsGet(); all[k] = lasting(state); lsSet(all);
    }
    function changed(again) {
      paintCount(); save();
      if (opts.onChange) opts.onChange(norm(state), { again: !!again });
    }
    function setPeople(fn) { var ps = state.people.length ? state.people.slice() : [{ rel: '', age: '', name: '' }]; fn(ps); state.people = ps.filter(function (p) { return p.rel || p.name; }); }

    el.addEventListener('click', function (e) {
      var b = e.target.closest ? e.target.closest('button') : null;
      if (!b || !el.contains(b)) return;
      var box = b.parentNode && b.parentNode.closest ? b.closest('.tol-ctx-chips') : null;
      if (b.hasAttribute('data-load')) { var s = lsGet()[b.getAttribute('data-load')]; if (s) { state = norm(Object.assign({}, state, s)); remember = true; render(); changed(); } return; }
      if (box && b.hasAttribute('data-v')) {
        var qn = box.getAttribute('data-q'), v = b.getAttribute('data-v'), multi = box.hasAttribute('data-multi');
        var on = b.getAttribute('aria-pressed') !== 'true';
        if (/^rel\d+$/.test(qn) || /^age\d+$/.test(qn)) {
          var i = +qn.replace(/\D/g, ''), key = qn.replace(/\d+$/, '');
          setPeople(function (ps) { while (ps.length <= i) ps.push({ rel: '', age: '', name: '' }); ps[i][key] = on ? v : ''; if (key === 'rel' && v !== 'child') ps[i].age = ''; });
          // the age chips only matter for "My child"
          box.querySelectorAll('.tol-chip').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b && on)); });
          if (key === 'rel') { var ag = box.parentNode.querySelector('.tol-ctx-age'); if (ag) ag.hidden = !(on && v === 'child'); }
        } else if (multi) {
          var list = state[qn].slice(), ix = list.indexOf(v);
          if (on && ix === -1) list.push(v); if (!on && ix !== -1) list.splice(ix, 1);
          // "Not sure" and "Fine" stand alone
          if (on && (v === 'unsure' || v === 'fine')) list = [v]; else if (on) list = list.filter(function (x) { return x !== 'unsure' && x !== 'fine'; });
          state[qn] = list;
          box.querySelectorAll('.tol-chip').forEach(function (x) { x.setAttribute('aria-pressed', String(list.indexOf(x.getAttribute('data-v')) !== -1)); });
        } else {
          state[qn] = on ? v : '';
          box.querySelectorAll('.tol-chip').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b && on)); });
        }
        changed(); return;
      }
      if (b.classList.contains('tol-ctx-add')) { setPeople(function (ps) { ps.push({ rel: '', age: '', name: '' }); }); if (!state.people.length || state.people.length < 2) state.people = (state.people.length ? state.people : [{ rel: 'other', age: '', name: '' }]).concat([{ rel: '', age: '', name: '' }]); render(); var rows = el.querySelectorAll('.tol-ctx-person'); var last = rows[rows.length - 1]; if (last) { var f = last.querySelector('.tol-chip'); if (f) f.focus(); } return; }
      if (b.hasAttribute('data-rm')) { var ri = +b.getAttribute('data-rm'); setPeople(function (ps) { ps.splice(ri, 1); }); render(); changed(); return; }
      if (b.classList.contains('tol-ctx-done')) { det.open = false; changed(true); var sm = det.querySelector('summary'); if (sm) sm.focus(); return; }
      if (b.classList.contains('tol-ctx-skip')) { det.open = false; var sm2 = det.querySelector('summary'); if (sm2) sm2.focus(); if (opts.onSkip) opts.onSkip(); return; }
      if (b.classList.contains('tol-ctx-clear')) { state = norm({}); render(); changed(); return; }
      if (b.classList.contains('tol-ctx-forget')) { lsSet({}); remember = false; render(); return; }
    });
    el.addEventListener('input', function (e) {
      var t = e.target;
      if (t.hasAttribute && t.hasAttribute('data-f')) { state[t.getAttribute('data-f')] = t.value; changed(); }
      else if (t.hasAttribute && t.hasAttribute('data-name')) { var i = +t.getAttribute('data-name'); setPeople(function (ps) { while (ps.length <= i) ps.push({ rel: '', age: '', name: '' }); ps[i].name = t.value; }); changed(); }
    });
    el.addEventListener('change', function (e) {
      if (e.target.classList && e.target.classList.contains('tol-ctx-remember')) {
        remember = e.target.checked;
        if (remember) save();
        else { var k = keyOf(state), all = lsGet(); if (k && all[k]) { delete all[k]; lsSet(all); } }
      }
    });
    render();
    var api = {
      el: el, details: det,
      get: function () { return norm(state); },
      set: function (c) { state = norm(c); render(); },
      clear: function () { state = norm({}); render(); },
      open: function (focus) { det.open = true; if (focus !== false) { var f = det.querySelector('.tol-chip, textarea, input'); try { det.scrollIntoView({ block: 'start', behavior: 'auto' }); } catch (x) { /* old browsers */ } if (f) f.focus(); } },
      rerender: render
    };
    el._tolCtx = api;
    return api;
  }
  // a "Change context" / "Add context" button anywhere on the page opens the nearest panel (the first one on the page)
  if (typeof document !== 'undefined') document.addEventListener('click', function (e) {
    var b = e.target.closest ? e.target.closest('.tol-ctx-change') : null; if (!b) return;
    var panel = document.querySelector('[data-ctx-for="' + (b.getAttribute('data-for') || '') + '"]') || document.querySelector('.tol-ctx-wrap');
    if (panel && panel._tolCtx) panel._tolCtx.open();
  });

  /* "A few quick questions so the read is fair (optional)": the shared Clarify questions (assets/js/clarify.js, TOLClarify),
     loaded only when someone asks for them. Answers already given here (who they are, whether it keeps coming back,
     fear) are passed in so they aren't asked twice. Resolves with {level 0-3 | 'safety', reasons, answers}, or null when
     the questions aren't available or were skipped. */
  function clarify(type, ctxIn, container, lang) {
    var ctx = forClarify(ctxIn);
    function call(resolve) {
      var C = root.TOLClarify;
      if (!C || typeof C.ask !== 'function') { resolve(null); return; }
      var done = false, fin = function (r) { if (!done) { done = true; resolve(r || null); } };
      try {
        var r = C.ask({ type: type, context: ctx, container: container, lang: lang || 'en', onDone: fin, onResult: fin });
        if (r && typeof r.then === 'function') r.then(fin, function () { fin(null); });
        else if (r && (r.level !== undefined)) fin(r);
      } catch (e) { fin(null); }
    }
    return new Promise(function (resolve) {
      if (root.TOLClarify || typeof document === 'undefined') { call(resolve); return; }
      var s = document.querySelector('script[src*="/clarify.js"]');
      if (!s) {
        var d = document.createElement('script'); d.src = '/assets/js/clarify-data.js';
        d.onload = d.onerror = function () { s = document.createElement('script'); s.src = '/assets/js/clarify.js'; s.onload = function () { call(resolve); }; s.onerror = function () { resolve(null); }; document.head.appendChild(s); };
        document.head.appendChild(d);
      } else s.addEventListener('load', function () { call(resolve); });
    });
  }

  /* Which Clarify questions fit a reading, or '' when nothing in it is about possible unfairness or pressure.
     an: a SignalEngine analysis (optional); text: the words. */
  function clarifyType(an, text) {
    var f = (an && an.found) || {}, t = String(text || '').toLowerCase();
    var has = function (ids) { return ids.some(function (id) { return !!f[id]; }); };
    if (an && an.control && an.control.kind === 'fear') return 'afraid';
    if (an && an.danger) return '';
    // a line that reads as a threat: the checker already says so, and the questions could only make it sound smaller
    if (f.harm) return '';
    if (/\b(?:my money|our money|spend|spending|purchase|bills?|rent|account|card)\b/.test(t) && (has(['jab', 'blameq', 'absolute', 'control', 'oblig']) || (an && an.control))) return 'money';
    if (an && an.control && an.control.kind === 'degrade') return 'respect';
    if ((an && (an.control || an.ultOwn || (an.care && an.care.kind === 'no'))) || has(['threat', 'closer'])) return 'limits';
    if (has(['label', 'contempt', 'dxlabel', 'compare'])) return 'respect';
    if (/\b(?:dishes|chores|bins|laundry|housework|clean(?:ing)?|cook(?:ing)?|kids|school run|everything around here|all the work)\b/.test(t) && has(['absolute', 'again', 'jab', 'guilt', 'count', 'blameq', 'critic'])) return 'load';
    if (has(['jab', 'count', 'guilt', 'sorrybut', 'madefeel', 'shouldhave', 'past'])) return 'repair';
    if (has(['withdraw', 'stonewall', 'brushoff', 'invalid', 'calm', 'absolute', 'blameq'])) return 'communication';
    return '';
  }
  /* Offer the Clarify questions in slot (an element), when the reading is about possible unfairness or pressure.
     o: {an, text, ctx, onResult}. Loads /assets/js/clarify.js only when needed. Returns the type offered, or ''. */
  function offerClarify(slot, o) {
    o = o || {};
    if (!slot || typeof document === 'undefined') return '';
    var type = o.type || clarifyType(o.an, o.text);
    if (!type) { slot.hidden = true; return ''; }
    var go = function () {
      if (!root.TOLClarify || !root.TOLClarify.offer) { slot.hidden = true; return; }
      root.TOLClarify.offer(slot, { type: type, show: true, context: function () { var k = forClarify(o.ctx || {}); return { text: [o.text, o.ctx && norm(o.ctx).before, o.ctx && norm(o.ctx).other].filter(Boolean).join('\n'), known: k, prefill: k.prefill }; }, onResult: o.onResult });
    };
    if (root.TOLClarify) go();
    else {
      var s = document.querySelector('script[src*="/clarify.js"]');
      if (!s) { s = document.createElement('script'); s.src = '/assets/js/clarify.js'; s.defer = true; document.head.appendChild(s); }
      s.addEventListener('load', go);
    }
    return type;
  }
  // a line that matches how strong the answers say it is (the Clarify card itself carries the next step)
  function clarifyLine(res) {
    if (!res || res.skipped) return '';
    var lv = res.key === 'safety' ? 4 : res.level;
    return lv >= 4 ? 'From your answers, safety comes first. The card below has free, private support, as an option.'
      : lv === 3 ? 'From your answers, this may be bigger than one message. Talking it through with someone outside the two of you could help.'
      : lv === 2 ? 'From your answers, this looks like a pattern worth working on together, more than a one-off.'
      : lv === 1 ? 'From your answers, this is worth a calm talk, not a big alarm.'
      : 'From your answers, this sounds like an ordinary rough patch or a one-off. Read the notes above lightly.';
  }

  var api = { read: read, norm: norm, clarifyType: clarifyType, offerClarify: offerClarify, clarifyLine: clarifyLine, isEmpty: isEmpty, count: count, forClarify: forClarify, usedHTML: usedHTML, mount: mount, clarify: clarify,
    ONE_MESSAGE: ONE_MESSAGE, LISTS: LISTS, ENGINE_REL: ENGINE_REL, STORE: STORE, scanSafety: scanSafety };
  if (NODE) module.exports = api; else root.TOLContext = api;
})(typeof window !== 'undefined' ? window : this);
