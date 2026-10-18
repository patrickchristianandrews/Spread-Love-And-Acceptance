/* tool-guide-data.js: the words inside each tool page's "About this tool" panel (tool-guide.js draws it).
   One entry per tool, keyed by the id in the page's <div data-tool-guide="ID"></div>.
   Fields (all plain words, no codes):
     name     plain name (the tools registry, window.TOLTools, wins when it has one)
     pages    the pages this tool lives on (used to match filled-in examples in /tools/book/examples.json)
     two      true when the tool is meant to be done by two or more people together (adds "Using it fairly")
     when     when to use it
     notWhen  when not to, and what to use instead (may hold links)
     time     how long
     result   what a useful result looks like
     ex       optional [href, label] for a filled-in example; when absent, the panel looks one up in
              /tools/book/examples.json (bookex9) and, failing that, shows no example link
     next     1 to 3 next steps: [href, label, why]
     research [[research.html ref id, plain one-line summary], ...]  -> /research.html#ref-<id>
     idea     what is this site's own idea (format, scoring, wording)
     limits   what it can't do
     fair     extra "Using it fairly" lines for this tool (added to the shared ones when two is true)
     privacy  what is kept, and where
     problem, do, leave   (names12) the panel's "In short" answers: what it helps with, what you'll do, what you'll leave with.
              Optional: when absent, the panel takes them from the tools registry (bestFor, does, gets) for the entry's reg,
              with the registry's "Based on" line (tools-registry.js BASIS). A page that is one mode of a place sets its own.
   Keep every line short, kind and honest. Nothing here claims clinical validation. */
window.TOLToolGuideData = {
  shared: {
    fair: [
      'Do it only if everyone involved agrees to. Ask first; don’t spring it on anyone.',
      'Each person answers for themselves only. Nobody fills in someone else’s side.',
      'The result describes the setup and the moment, never who is the better or worse person.',
      'Anyone can stop at any time, and come back later or not at all.',
      'Nothing is shared unless you choose to send it.'
    ],
    notJoint: 'If one of you doesn’t want to, or it keeps turning into a fight, do just your own side and leave it there. Going on alone is a fine use of it.',
    disagree: 'If you see it differently, write both answers down. The gap between them is the useful part, not a problem to win.',
    overload: 'Too much at once? Do one part and stop. Nothing is lost.'
  },
  tools: {

    /* ---------------- Talk it through ---------------- */

    'signal-translator': {
      name: 'Chat analyzer',
      reg: 'signal',
      pages: ['/signal-translator.html'],
      when: 'Before you send a text, email or work message that matters. Or when a message you got stung or confused you and you want a calmer reading of it. For a whole conversation or a screenshot, choose “A whole chat or screenshot” at the top.',
      notWhen: 'Not in the middle of a heated exchange: take a break first with <a href="/pursue-withdraw.html">a pause plan</a>. Not for working out what someone “really” meant; only they can tell you that.',
      time: 'About 2 minutes a message.',
      result: 'A plain reading of how the words may land (for example “a little sharp: the ask is clear, but ‘you always’ may sound like blame”) and a calmer version that keeps your ask and adds no promises.',
      next: [
        ['/workpapers/wp-09-say-it-so-it-lands.html', 'Say it so it lands', 'when it needs more than a rewrite: a fact, a feeling and one kind ask'],
        ['/check-ins.html', 'Check-ins', 'if it’s a bigger topic, raise it at a calm, set time instead of by text'],
        ['/signal-translator.html#conversation', 'Read a whole conversation', 'when a thread has already gone wrong: paste it, or add a screenshot']
      ],
      research: [
        ['kruger-epley-2005-email', 'People overestimate how clearly their tone comes across in email (Kruger, Epley and colleagues, 2005).'],
        ['gunraj-2016-texting-period', 'Small things in short texts, like a full stop, can change how sincere a reply seems (one early study, 2016).'],
        ['crompton-2020', 'People who are wired differently can miss each other’s meaning more than people wired alike (Crompton and colleagues, 2020).']
      ],
      idea: 'The levels (from kind to very sharp), the patterns it looks for and the rewrite rules are this site’s own fixed rules. It doesn’t invent anything new each time.',
      limits: 'It reads the words only, not tone of voice, emoji habits or your history together. In our tests it read 92 of 101 held-out everyday messages the way people expected. Adding context (who they are, how they usually write, what you want) helps, and it still can\u2019t know everything. It is rule-based and will sometimes be wrong. Check its reading against what you know about the person. Not a test of anyone.',
      privacy: 'The checking happens on this device. What you type is not sent anywhere. Only your view settings are kept in this browser.'
    },

    // the Chat analyzer's "A whole conversation or screenshot" view (this was the Conversation Reader's own page)
    'conversation-reader': {
      name: 'Chat analyzer',
      reg: 'signal',
      pages: ['/signal-translator.html', '/signal-translator.html#conversation'],
      when: 'After a text or chat exchange went sideways and you want to see where it turned, what each of you may have been hearing, and a calmer way to reply.',
      notWhen: 'Not while you are still upset: reply later, after <a href="/upset-right-now.html">five calm minutes</a>. Not as evidence for who was right; it isn’t built for that.',
      time: 'About 5 to 10 minutes.',
      result: 'The one or two messages where it turned, a fair reading of both sides (“Sam may have heard ‘you don’t care’; Alex may have heard ‘you’re attacking me’”), and a calm reply you could send.',
      next: [
        ['/signal-translator.html', 'Check your reply before you send it', 'one message at a time: “A message I’m about to send”'],
        ['/carrier-wave-decoder.html', 'Go through it together', 'what slipped, not who started it'],
        ['/pursue-withdraw.html', 'Make a pause plan', 'if the same thread keeps happening']
      ],
      research: [
        ['kruger-epley-2005-email', 'Tone gets lost in writing far more than we expect (Kruger, Epley and colleagues, 2005).'],
        ['carrere-gottman-1999', 'How a hard talk starts shapes how it goes (Carrère and Gottman, 1999; one research group’s findings).'],
        ['schegloff-jefferson-sacks-1977', 'Fixing misunderstandings is a normal, built-in part of everyday talk (Schegloff and colleagues, 1977).']
      ],
      idea: 'Finding “the turn”, the both-sides reading and the reply wording are this site’s own method.',
      limits: 'It reads the words you paste, not tone of voice or what happened before. Adding context (who they are, how they usually write, whether it keeps coming back) helps, and it still can\u2019t know everything. It may pick the wrong turning point. It never decides who was right.',
      fair: ['Only paste a conversation you were part of, and keep it to yourself unless the other person agrees to look at it with you.'],
      privacy: 'It runs entirely in this browser. What you paste or screenshot is not saved or sent anywhere. Close the tab and it’s gone.'
    },

    'carrier-wave-decoder': {
      name: 'Rewind the talk',
      reg: 'decoder',
      pages: ['/carrier-wave-decoder.html', '/perspective-shifter.html'],
      when: 'After a conversation went wrong between two people who usually get on, and you want to settle, work out what slipped, step round to their side, and practise what to say next time. The Their side step alone is for when someone’s reaction surprised or hurt you.',
      notWhen: 'Not in the heat of the moment: use <a href="/upset-right-now.html">Upset right now?</a> first. If it’s a big topic, raise it later in a <a href="/check-ins.html">check-in</a>. Not as a way to excuse something that keeps hurting you, and not to decide what the other person thinks: Their side gives you questions to ask them, not answers.',
      time: 'One session takes about 15 to 20 minutes; each step is a few minutes and you can skip any. Their side on its own takes about 5.',
      result: 'A short note on what was out of sync (pace, words, state, timing), a picture of their side of the moment with two or three questions to check with them, one sentence to bridge the gap, an opening line you have practised and checked, and a journal entry to look back on.',
      next: [
        ['/signal-translator.html', 'Check your sentence in the Chat analyzer', 'the last step hands it over for you'],
        ['/check-ins.html', 'Raise it once, at a set time', 'one topic, no blame'],
        ['/wp-11.html', 'Make a calm-down plan', 'for next time it heats up']
      ],
      research: [
        ['gottman-levenson-1992', 'When the body is very stirred up, talks tend to go worse (Gottman and Levenson, 1992).'],
        ['mischkowski-kross-bushman-2012', 'Looking back “like a fly on the wall” lowers anger (Mischkowski, Kross and Bushman, 2012).'],
        ['schegloff-jefferson-sacks-1977', 'Repairing a misunderstanding is a normal part of talking (Schegloff and colleagues, 1977).'],
        ['eyal-steffel-epley-2018', 'Imagining someone’s view doesn’t make us more accurate; asking them does (Eyal, Steffel and Epley, 2018). That is why Their side ends in questions.'],
        ['ross-1977-fae', 'We tend to blame people’s character and miss their situation (Ross, 1977).'],
        ['ross-ward-1996-naive-realism', 'Each of us assumes we see things as they really are (Ross and Ward, 1996).']
      ],
      idea: 'The radio picture (two signals slightly out of tune), the practices and the session order are this site’s own, and so are the five things Their side looks at (who they are, their wiring, their state, what was around them, what they could see).',
      limits: 'A self-help practice, not therapy. It helps you look at your side; Their side is only your best guess about another person, so treat it as a question to ask, not a conclusion.',
      fair: ['Treat a mismatch as tuning, not a failing in either person.', 'Use Their side to understand, not to win. It never decides who was right.'],
      privacy: 'Your progress and notes are kept in this browser only if you say yes when it asks. You can see and erase them on <a href="/on-this-device.html">What’s stored on this device</a>. Your taps on Their side stay on the page and are never kept. A sentence you check goes to the Chat analyzer in this tab only.'
    },

    'write-it-through': {
      name: 'Write it through',
      reg: 'write',
      pages: ['/write-it-through.html'],
      two: true,
      when: 'When something is easier to sort out on paper: you want time to settle, to finish a thought without being cut off, and to both have the same words to look back on.',
      notWhen: 'Not when you’re flooded: try <a href="/upset-right-now.html">Upset right now?</a> first. Big news and big apologies are often better said out loud; a short note can open the door. Never as a way to avoid ever talking.',
      time: 'About 10 minutes to write one message, then a wait before you send.',
      result: 'One message on one topic: what happened (facts, not verdicts), how it was for you, and one clear ask, sent as a private link the other person can answer.',
      next: [
        ['/signal-translator.html', 'Check the tone first', 'how it may land'],
        ['/check-ins.html', 'Move it to a talk', 'when things are calmer'],
        ['/refusals.html', 'Say no kindly', 'if your ask is really a “no”']
      ],
      research: [
        ['frattaroli-2006', 'Writing about hard things has a small but real benefit on average (Frattaroli, 2006, pooling 146 studies).'],
        ['kruger-epley-2005-email', 'Written tone is easy to misread, so check it before you send (Kruger, Epley and colleagues, 2005).'],
        ['mischkowski-kross-bushman-2012', 'A little distance cools anger (Mischkowski, Kross and Bushman, 2012).']
      ],
      idea: 'The house rules (one topic, facts not verdicts, one ask, wait before sending) and the private-link format are this site’s own.',
      limits: 'Writing can’t carry a voice or a face. If it keeps going in circles, it’s time to talk, or to get outside help.',
      fair: ['Agree on the house rules together before you start.', 'Reply to what was written, not to what you guess was meant. Ask if unsure.'],
      privacy: 'Your draft and conversations are kept in this browser only once you type, and “Erase this conversation” removes them. Nothing is sent to this site. The link you send carries your words inside it, so anyone with the link can read it: send it only to the person it’s for.'
    },

    'say-it-so-it-lands': {
      name: 'Before you reply: say it so it lands',
      reg: 'sayit',
      pages: ['/workpapers/wp-09-say-it-so-it-lands.html', '/workpapers/fill/wp-09.html'],
      when: 'Before you answer something that stung, or before you raise a hard thing, so what you say is something the other person can actually hear.',
      notWhen: 'Not as a way to correct how someone else talks. Each person uses it on their own words only.',
      time: 'About 5 minutes.',
      result: 'One short sentence with a fact (what happened), a feeling (how it was for you) and one kind, doable ask, for example: “When the bins were missed on Tuesday, I felt let down. Could we put them on the job list?”',
      next: [
        ['/signal-translator.html', 'Check the sentence', 'how it may land'],
        ['/check-ins.html', 'Choose a calm time to say it', 'one topic at a time'],
        ['/workpapers/wp-13-daily-check-in.html', 'Start a 90-second daily check-in', 'so small things stay small']
      ],
      research: [
        ['carrere-gottman-1999', 'A softer start tends to lead to a better talk (Carrère and Gottman, 1999).'],
        ['lieberman-2007', 'Putting a feeling into words can take some of the heat out of it (Lieberman and colleagues, 2007).'],
        ['rosenberg-nvc', 'Fact, feeling, need and request is a widely used practice from Nonviolent Communication (Rosenberg); few rigorous studies.']
      ],
      idea: 'The three-part sentence and the self-check order are this site’s adaptation.',
      limits: 'A kinder sentence makes a good talk more likely, not certain. Not a script to make someone agree.',
      privacy: 'The fill-in sheet keeps a draft in this browser only while “Keep a draft on this device” is ticked. Nothing is sent anywhere.'
    },

    'soften-a-tense-moment': {
      name: 'Cool-down corner · Soften a tense moment',
      reg: 'soften',
      problem: 'Someone near you is in a bad mood',
      'do': 'Settle yourself, read the state someone else is in, and pick one small move.',
      leave: 'One small move that fits their state. The second level builds a plan you can print.',
      pages: ['/tools/soften-a-tense-moment.html', '/tools/soften-a-tense-moment-full.html'],
      when: 'When the mood in the room is heavy (someone is frazzled, flat or prickly) and you want a small, kind way to shift it.',
      notWhen: 'Not if you’re wound up yourself: settle first. Not a way to talk someone out of a feeling they need to have.',
      time: 'About 5 minutes to learn; a few seconds to use.',
      result: 'You name the state they seem to be in, pick one matching move (for example “offer company or space”), and have one sentence ready: “Want company while we deal with it, or do you need ten minutes first?”',
      next: [
        ['/tools/frequency-calibration.html', 'Compare your everyday rhythms', 'the slow patterns underneath tense moments'],
        ['/wp-11.html', 'Make your own calm-down plan', 'what settles you'],
        ['/turning-toward.html', 'Turning toward', 'small daily ways to stay close']
      ],
      research: [
        ['driver-gottman-2004', 'Couples who respond to small everyday moments bring more warmth into later disagreements (Driver and Gottman, 2004).'],
        ['gross-1998', 'Feelings can be shaped at several points, from changing the situation to changing how we see it (Gross, 1998).'],
        ['coan-schaefer-davidson-2006', 'A calm, trusted person nearby can make stress feel smaller (Coan and colleagues, 2006).']
      ],
      idea: 'The three states, the four steps and the move finder are this site’s own rule of thumb.',
      limits: 'A rule of thumb for everyday friction between people who feel safe with each other. Not a clinical tool.',
      privacy: 'Nothing you pick on this page is kept or sent.'
    },

    'pause-plan': {
      name: 'Cool-down corner · Make a pause plan',
      reg: 'pause',
      problem: 'When one of you wants to talk now and the other needs space',
      'do': 'Agree on a calm day how either of you can take a break, and when you come back.',
      leave: 'Your pause word, how long a break lasts, a return time and the first sentence back, to copy or send.',
      pages: ['/pursue-withdraw.html'],
      two: true,
      when: 'When one of you wants to sort it out now and the other needs space first, and the more one pushes, the more the other pulls back.',
      notWhen: 'Make the plan on a calm day, not mid-argument. If you’re upset right now, use <a href="/upset-right-now.html">Upset right now?</a> and come back to the plan later.',
      time: 'About 10 minutes, together, on a calm day.',
      result: 'An agreed pause word, how long a break lasts (at least 20 minutes, and not past a set time), when you’ll come back, and the first sentence the one who left will say on return.',
      next: [
        ['/wp-11.html', 'Each make a calm-down plan', 'what settles each of you during the pause'],
        ['/check-ins.html', 'Bring the topic back at a set time', 'one topic, one short talk'],
        ['/signal-translator.html', 'Check your return sentence', 'how it may land']
      ],
      research: [
        ['christensen-heavey-1990', 'The “one pushes, one pulls back” pattern is common, and who pushes often depends on whose topic it is (Christensen and Heavey, 1990).'],
        ['schrodt-witt-shimkowski-2014', 'Across 74 studies, this pattern goes with unhappier relationships, whichever person pushes (Schrodt and colleagues, 2014).'],
        ['gottman-levenson-1992', 'When bodies are very stirred up, talks go worse, which is why a break helps (Gottman and Levenson, 1992).']
      ],
      idea: 'The plan’s format (pause word, length, return time, first sentence) is this site’s own; the 20-minute break follows common couples-therapy advice.',
      limits: 'A plan helps the pause feel safe for both of you; it can’t make the topic itself easy.',
      fair: ['A pause is a promise to come back, not a way to end the talk for good.', 'Neither role is wrong: wanting to talk now and needing space are both ways of trying to feel safe again.'],
      privacy: 'Your plan is kept in this browser only while “Keep our plan on this device” is ticked. Nothing is sent anywhere.'
    },

    'check-in-card': {
      name: 'Kitchen-table check-in',
      reg: 'checkincard',
      pages: ['/check-ins.html'],
      two: true,
      when: 'When something needs talking about properly, but not right now: you agree a short, calm time for one topic. With a parent or grown child, the family plan card covers visits, advice and a review date.',
      notWhen: 'Not for several topics at once: pick the one that would make the rest feel lighter. Not straight after a fight; wait until you’ve both settled.',
      time: 'About 5 minutes to fill in; the talk itself about 20 minutes.',
      result: 'A small card that names one topic, when and where you’ll talk, and the ground rules you both agreed (one topic, no blame, a pause word), ready to copy, send or stick on the fridge.',
      next: [
        ['/signal-translator.html', 'Write your opening sentence', 'and check how it may land'],
        ['/workpapers/wp-13-daily-check-in.html', 'Add a 90-second daily check-in', 'so small things don’t pile up'],
        ['/pursue-withdraw.html', 'Agree a pause plan', 'in case it heats up']
      ],
      research: [
        ['markman-stanley-blumberg-1994', 'Couples programmes that teach structured, safer talks have shown some benefit in trials (Markman, Stanley and Blumberg; the PREP programme).'],
        ['gollwitzer-sheeran-2006', 'Deciding “when and where” in advance makes people much more likely to follow through (Gollwitzer and Sheeran, 2006).'],
        ['carrere-gottman-1999', 'How a talk starts shapes how it goes (Carrère and Gottman, 1999).']
      ],
      idea: 'The card’s layout and the ground rules are this site’s own.',
      limits: 'A good time and a calm start help a lot, but some topics need more than one talk, or outside help.',
      privacy: 'What you type on the card stays until you close the tab. If you tap the jobs on the card, they are kept in this browser (never who); “Don’t keep them” forgets them.'
    },

    'say-no-kindly': {
      name: 'Chat analyzer · Help me write it',
      reg: 'refusals',
      problem: 'Saying no without the guilt spiral',
      'do': 'Pick the situation and how you want to sound: warmer, plainer or firmer.',
      leave: 'Three kind, copy-ready ways to say no, with something to offer instead.',
      pages: ['/refusals.html'],
      when: 'When you need to turn something down (a favour, an extra shift, a visit) and want words that are clear and kind.',
      notWhen: 'Not for turning down something that is your fair share of a job you agreed to; that’s a conversation for <a href="/workpapers/wp-03-one-owner-per-job.html">One owner per job</a>.',
      time: 'About 2 minutes.',
      result: 'Three ready-to-send ways to say no in your situation (“I’m full today”, “Not me, but let’s find who”, “Yes, just later”), one changed into your own words.',
      next: [
        ['/signal-translator.html', 'Check how your no may land', 'before you send it'],
        ['/workpapers/wp-02-how-much-are-you-carrying.html', 'See how much you’re carrying', 'a two-minute load check'],
        ['/workpapers/wp-03-one-owner-per-job.html', 'Sort out who owns what', 'so the same asks stop landing on you']
      ],
      research: [
        ['flynn-bohns-2008', 'People find saying no awkward, so much so that askers underestimate how often others say yes (Flynn and Lake, 2008).'],
        ['helgeson-fritz-1998', 'Always putting others first at your own cost is linked with more distress than caring that includes yourself (Helgeson and Fritz, 1998).']
      ],
      idea: 'The three kinds of no and the scripts are this site’s own.',
      limits: 'Good words make a no easier to hear, not always welcome. Some people will still be disappointed, and that’s allowed.',
      privacy: 'Nothing you pick or type leaves this device, and nothing is kept.'
    },

    'decide-together': {
      name: 'Decide together, then tell both families',
      pages: ['/two-faiths.html'],
      two: true,
      when: 'When two faiths, cultures or family traditions meet a real decision (a name, a ceremony, a holiday) and you want to decide together and tell both families the same thing. The festival year planner on this page does the same for the whole year.',
      notWhen: 'Not before you’ve both had time to say what matters to you and why. Not as a way to settle it for the other person.',
      time: 'About 15 minutes to write; the deciding may take longer.',
      result: 'One short decision you both agree with, and one message each of you sends to your own family in your own words, saying you decided together. For festivals: one year table of who goes where.',
      next: [
        ['/family-obligations.html', 'Family, visits and elders', 'if family pressure is the harder part'],
        ['/signal-translator.html', 'Check the family message', 'how it may land'],
        ['/check-ins.html', 'Set a calm time for the next decision', 'one topic at a time']
      ],
      research: [
        ['thibaut-walker-1975', 'People accept a decision better when they had a real say in how it was made (Thibaut and Walker, 1975).'],
        ['fisher-ury-1981', 'Talking about what matters underneath (interests) rather than fixed positions helps find options for both (Fisher and Ury; a practice framework).']
      ],
      idea: 'The “each tells your own family” step and the message format are this site’s own.',
      limits: 'It helps you agree and speak with one voice; it can’t make every relative happy with the choice.',
      privacy: 'Nothing you type is sent anywhere. What you copy or share is up to you.'
    },

    /* ---------------- Know yourself ---------------- */

    'wavelength': {
      name: 'How you connect',
      reg: 'wavelength',
      pages: ['/wavelength.html', '/communication-style-quiz.html'],
      when: 'When you’d like to put into words how you think, talk and listen, so the people around you don’t have to guess.',
      notWhen: 'Not to label or sort someone else. Not a personality test or a diagnosis.',
      time: 'About 2 minutes for your code; 10 more for the optional extras.',
      result: 'A four-letter code for your pace, big picture or details, how you say things and how you take things in, with plain sentences like “Give me the headline first, then the details.”',
      next: [
        ['/wiring-card.html', 'Make a “how to talk to me” card', 'one page you can hand to someone'],
        ['/self-path.html', 'Your self path', 'small steps on your own'],
        ['/check-ins.html', 'Share one thing you learned', 'in a short, calm talk']
      ],
      research: [
        ['savitsky-2011-closeness-communication', 'We overestimate how well people close to us understand what we mean (Savitsky and colleagues, 2011).'],
        ['gilovich-savitsky-medvec-1998', 'We think others can read our inner states better than they can (Gilovich and colleagues, 1998).'],
        ['crompton-2020', 'Mixed pairs of differently wired people can lose detail and rapport; neither side is the “wrong” one (Crompton and colleagues, 2020).']
      ],
      idea: 'The four lines, the questions and the scoring are this site’s own; the scoring is written out on <a href="/method-and-limits.html">Method and limits</a>.',
      limits: 'A way to describe what you prefer, not a validated test. Your answers can change with mood and setting.',
      fair: ['Use it to tell others how you work, not to tell them how they are.'],
      privacy: 'Your answers are kept in this browser only if you tick “Keep my answers and journal on this device”. Nothing is sent anywhere.'
    },

    'wiring-card': {
      name: 'How you connect · How to talk to me: a card',
      reg: 'wiring',
      problem: 'Telling people how to reach you, without a long talk',
      'do': 'Pick what helps words reach you, what your silence means and what to avoid.',
      leave: 'A one-page card to copy, print or share, and a side-by-side view with someone else’s card.',
      pages: ['/wiring-card.html'],
      when: 'When you want the people you live or work with to know what helps words reach you: pace, format, timing, what to avoid.',
      notWhen: 'Give it before a hard conversation, not during one.',
      time: 'About 10 minutes.',
      result: 'A one-page card in your own words, for example: “Text me the plan first. Give me a minute to answer. If I go quiet, I’m thinking, not upset. I need twenty minutes; let’s talk at eight.”',
      next: [
        ['/check-ins.html', 'Swap cards in a short, calm talk', 'and ask for theirs'],
        ['/wavelength.html', 'Find your communication style', 'if you’re not sure what to put'],
        ['/self-path.html', 'Your self path', 'more small steps on your own']
      ],
      research: [
        ['gilovich-savitsky-medvec-1998', 'People can’t read our inner states as well as we think, so saying it plainly helps (Gilovich and colleagues, 1998).'],
        ['hull-2017', 'Many autistic adults describe hiding how they work as exhausting (Hull and colleagues, 2017).'],
        ['crompton-2020', 'Differently wired people can understand each other well once the gap is named (Crompton and colleagues, 2020).']
      ],
      idea: 'The card and its choices are this site’s own.',
      limits: 'A request, not a rulebook. Others may not always manage it, and your needs can change.',
      fair: ['Offer to read their card too. It works best as a swap.'],
      privacy: 'Your card is kept in this browser so you can come back to it. You can erase it on <a href="/on-this-device.html">What’s stored on this device</a>.'
    },

    'todays-weather': {
      name: 'My weather today',
      reg: 'weather',
      pages: ['/quick-checks.html', '/ladder.html'],
      when: 'Before something hard, when you can’t tell if now is a good time to talk (the quick 4 taps), or once a day to see what today has room for (the full forecast).',
      notWhen: 'Not a way to rate someone else’s mood. Not a measure of your mental health.',
      time: 'About 20 seconds for the quick check; about 1 minute for the full forecast.',
      result: 'Quick: calm and connected, revved up or running on empty, with what helps now and a pause line. Full: a “forecast” in words, such as “Gusty: not much room today. Keep the big talk for the weekend”, plus one thing that would help.',
      next: [
        ['/quick-checks.html#almanac', 'Your weather over time', 'a few days in, your own pattern starts to show'],
        ['/wp-11.html', 'Make a calm-down plan', 'for the gusty days'],
        ['/check-ins.html', 'Pick a good day to talk', 'and say it then']
      ],
      research: [
        ['lieberman-2007', 'Naming how you feel can calm the feeling a little (Lieberman and colleagues, 2007).'],
        ['kashdan-barrett-mcknight-2015', 'People who can tell their feelings apart tend to cope better (Kashdan, Barrett and McKnight, 2015).'],
        ['schwarz-clore-1983', 'Our mood colours how we judge everything else that day (Schwarz and Clore, 1983).']
      ],
      idea: 'The weather picture and the tally are this site’s own; the scoring is written out on <a href="/method-and-limits.html">Method and limits</a>.',
      limits: 'A reading of what you told it, not a measurement. If low days go on for weeks, talk to a doctor or see <a href="/outside-help.html">Help beyond this site</a>.',
      privacy: 'A reading is kept only if you choose to save it (up to 120 days), in this browser. The almanac can download or erase them.'
    },

    'how-much-carrying': {
      name: 'Load check: how much are you carrying?',
      pages: ['/workpapers/wp-02-how-much-are-you-carrying.html', '/workpapers/fill/wp-02.html'],
      when: 'Before a hard conversation, or when a small thing stings more than it should, to tell apart what you’re already carrying from the thing in front of you.',
      notWhen: 'Not about anyone else: fill it in only about yourself. Not a reason to skip a talk forever; a high score means “later”, not “never”.',
      time: 'About 2 minutes.',
      result: 'A number from 0 to 1 and a plain next step, for example: “0.65, high. Say ‘I’m carrying a lot today’ and move the money talk to Saturday.”',
      next: [
        ['/wp-11.html', 'Make a calm-down plan', 'for heavy days'],
        ['/workpapers/wp-03-one-owner-per-job.html', 'Give every job one owner', 'if the load is the shared work'],
        ['/caregivers.html', 'Help for caregivers', 'if what you carry can’t wait']
      ],
      research: [
        ['neff-karney-2009', 'Stress from outside a relationship makes everyday bumps inside it feel bigger (Neff and Karney, 2009).'],
        ['repetti-1989', 'After heavy work days, people tend to withdraw at home (Repetti, 1989).'],
        ['gordon-chen-2014', 'Poor sleep goes with more conflict the next day (Gordon and Chen, 2014).']
      ],
      idea: 'The five questions and the bands are this site’s rule of thumb; the scoring is on <a href="/method-and-limits.html">Method and limits</a>.',
      limits: 'A gut-check, not a validated or clinical scale.',
      fair: ['Each person scores only themselves. Never score someone else.'],
      privacy: 'The fill-in sheet keeps a draft in this browser only while “Keep a draft on this device” is ticked. Nothing is sent anywhere.'
    },

    'self-path': {
      name: 'Your self-discovery path',
      pages: ['/self-path.html'],
      when: 'When you want to work on yourself, on your own, at your own pace: what you’re carrying, your rhythms and reactions, and kind words for them.',
      notWhen: 'Not a test you can fail or a course to finish. Skip any step that doesn’t feel right yet.',
      time: 'A minute or two a step; as many or few steps as you like.',
      result: 'A few small things you now know about yourself in your own words, for example “I take things in best in writing” or “my battery is lowest on Sunday nights.”',
      next: [
        ['/wavelength.html', 'Find your communication style', 'how you think, talk and listen'],
        ['/wiring-card.html', 'Make a “how to talk to me” card', 'to share when you’re ready'],
        ['/book/topic-know-yourself.html', 'The book on knowing yourself', 'the reading that goes with it']
      ],
      research: [
        ['neff-2003-definition', 'Self-compassion means kindness, common humanity and keeping feelings in proportion (Neff, 2003).'],
        ['breines-chen-2012', 'Being kind to yourself about a mistake can make you more, not less, motivated to improve (Breines and Chen, 2012).'],
        ['kashdan-barrett-mcknight-2015', 'Telling your feelings apart is linked with coping better (Kashdan and colleagues, 2015).']
      ],
      idea: 'The order of the steps is this site’s own.',
      limits: 'Self-help, not therapy. If something here brings up a lot, <a href="/outside-help.html">Help beyond this site</a> lists people to talk to.',
      privacy: 'Which steps you mark done is kept in this browser, so the home page can show your next step. Nothing is sent anywhere.'
    },

    'rhythms': {
      name: 'Rhythms side by side',
      reg: 'rhythms',
      pages: ['/tools/frequency-calibration.html'],
      two: true,
      when: 'When you and one other person keep clashing over timing: how often to talk money, decide things, check in, rest, or ask the big questions.',
      notWhen: 'Not to prove whose pace is “right”. Different rhythms are normal, not a flaw in either of you.',
      time: 'About 10 minutes.',
      result: 'Where your rhythms are out of step, and one small agreement for each, for example: “We’ll look at money together on the first Sunday, for no more than twenty minutes.”',
      next: [
        ['/tools/soften-a-tense-moment.html', 'Soften a tense moment', 'for the moments when rhythms clash'],
        ['/check-ins.html', 'Put the agreement on a check-in card', 'and look at it again in a month'],
        ['/money-together.html', 'Money together', 'if money is the biggest gap']
      ],
      research: [
        ['rick-small-finkel-2011', 'Savers and spenders often pair up; the bigger the gap, the more money conflict (Rick, Small and Finkel, 2011).'],
        ['papp-cummings-goeke-morey-2009', 'Money arguments tend to recur and stay unresolved more than others (Papp and colleagues, 2009).'],
        ['gollwitzer-sheeran-2006', 'A specific “when and where” plan makes follow-through much more likely (Gollwitzer and Sheeran, 2006).']
      ],
      idea: 'The idea of “rhythms” and the five areas are this site’s own.',
      limits: 'A starting point for a conversation, not a compatibility test.',
      privacy: 'Only whether you chose “just me” or “two of us” is kept in this browser. Nothing you type is sent anywhere.'
    },

    'where-am-i': {
      name: 'My weather today',
      reg: 'weather',
      pages: ['/ladder.html'],
      when: 'When you can’t tell whether you’re calm enough to talk, or you feel revved up or flat and want one step that fits.',
      notWhen: 'Not for labelling someone else’s state.',
      time: 'About 1 minute.',
      result: 'A best guess at your state (calm and connected, revved up, or running on empty), what helps on that rung, words to say, and when to come back to a talk.',
      next: [
        ['/wp-11.html', 'Make a calm-down plan', 'what settles you, decided ahead of time'],
        ['/upset-right-now.html', 'Upset right now?', 'five calm minutes'],
        ['/quick-checks.html?mode=full', 'The full forecast', 'add sleep, pressure and what’s coming up']
      ],
      research: [
        ['arnsten-2009', 'Under stress, the planning, flexible-thinking part of the brain works less well (Arnsten, 2009).'],
        ['gross-1998', 'There are several points at which feelings can be shaped, including the situation and the body (Gross, 1998).'],
        ['grossman-2023', 'The “ladder” picture comes from polyvagal theory, whose science is disputed (Grossman, 2023). We use it only as a picture.']
      ],
      idea: 'The three rungs and the four questions are this site’s own; the scoring is on <a href="/method-and-limits.html">Method and limits</a>.',
      limits: 'A best guess, not a reading of your nervous system.',
      privacy: 'Nothing you tap leaves this device. A line is saved only if you choose to save or share it.'
    },

    'flip-it': {
      name: 'Chat analyzer · Help me write it',
      reg: 'flip',
      problem: 'A grumble or a harsh thought going round your head',
      'do': 'Type a complaint, a worry or a harsh thought about yourself.',
      leave: 'A suggested flip into a request or a plan, and a private list of small wins.',
      pages: ['/small-wins.html'],
      when: 'When a complaint, a worry, anger or a harsh thought about yourself keeps going round, and you’d like to turn it into a request or a plan. Also for noting small things that went right.',
      notWhen: 'Not a way to talk yourself out of a feeling. Some feelings just need to be felt for a while.',
      time: 'About 2 minutes.',
      result: 'A suggested flip you then put in your own words, for example “The kitchen is always a mess” becomes “Could we give the evening wipe-down one owner?”, plus a private done list of small wins.',
      next: [
        ['/workpapers/wp-03-one-owner-per-job.html', 'One owner per job', 'if the feeling is about the shared work'],
        ['/workpapers/wp-09-say-it-so-it-lands.html', 'Say it so it lands', 'if the next step is a conversation'],
        ['/turning-toward.html', 'Turning toward', 'small daily ways to connect']
      ],
      research: [
        ['jamieson-2012', 'Seeing stress as energy you can use changes how the body responds (Jamieson and colleagues, 2012).'],
        ['carver-harmon-jones-2009', 'Anger usually moves us toward a goal, so it can point to what matters (Carver and Harmon-Jones, 2009).'],
        ['kross-ayduk-mischel-2005', 'Asking “why” from a little distance helps; reliving it doesn’t (Kross, Ayduk and Mischel, 2005).']
      ],
      idea: 'The flip rules and the done list are this site’s own. It is a simple set of rules, not a person, so change the words until they sound like you.',
      limits: 'A small reframing tool, not therapy. Feelings that stay heavy deserve real support.',
      privacy: 'Your done list is kept in this browser until you remove it or press Erase. Nothing is sent anywhere.'
    },

    /* ---------------- Calm ---------------- */

    'calm-down-kit': {
      name: 'Calm-down plan',
      reg: 'calmkit',
      pages: ['/wp-11.html', '/workpapers/fill/wp-11.html'],
      when: 'On a calm day, to decide ahead of time what you notice first when you’re getting heated, the signal you’ll use, and what settles you.',
      notWhen: 'Not while you’re upset: use <a href="/upset-right-now.html">Upset right now?</a> first and make the plan later.',
      time: 'About 10 minutes.',
      result: 'A small plan in three parts: your early signs (“jaw tight, talking faster”), a pause signal everyone knows, and two or three things that settle you (“walk round the block, cold water, then text when I’m back”).',
      next: [
        ['/pursue-withdraw.html', 'Agree a pause plan together', 'so a break feels safe for both'],
        ['/quick-checks.html', 'My weather today', 'notice the gusty days early'],
        ['/check-ins.html', 'Share your plan at a calm time', 'so others know your signal']
      ],
      research: [
        ['gollwitzer-sheeran-2006', '“If this happens, I’ll do that” plans made in advance work well (Gollwitzer and Sheeran, 2006).'],
        ['kjaervik-bushman-2024', 'Activities that calm the body reduce anger; ones that rev it up don’t (Kjærvik and Bushman, 2024, 154 studies).'],
        ['zaccaro-2018', 'Slow breathing is linked with feeling calmer and less anxious (Zaccaro and colleagues, 2018).']
      ],
      idea: 'The plan’s three parts and the “come back” check are this site’s own; the rule of thumb is on <a href="/method-and-limits.html">Method and limits</a>.',
      limits: 'A personal plan, not a treatment. If anger or panic is often hard to manage, a doctor or counsellor can help.',
      privacy: 'The fill-in sheet keeps a draft in this browser only while “Keep a draft on this device” is ticked. Nothing is sent anywhere.'
    },

    'upset-right-now': {
      name: 'Cool-down corner · Upset right now? A 5-minute calm-down',
      reg: 'upset',
      problem: 'Right now, in the middle of an argument',
      'do': 'A pause line with a return time, a one-minute breathing pacer, and how to come back.',
      leave: 'A calmer body, and words to come back to the talk with.',
      pages: ['/upset-right-now.html'],
      when: 'Right now, when you or the two of you are too upset to talk well.',
      notWhen: 'Not a place to settle the argument. Come back to the topic later, at a time you name.',
      time: 'About 5 minutes.',
      result: 'You’ve paused, slowed your breathing, said one calm sentence (“I need twenty minutes. I’ll come back at eight.”), and picked a time to come back.',
      next: [
        ['/wp-11.html', 'Make a calm-down plan', 'later, on a calm day'],
        ['/pursue-withdraw.html', 'Agree a pause plan together', 'for next time'],
        ['/ladder.html', 'Where am I right now?', 'check whether you’re ready to talk']
      ],
      research: [
        ['kjaervik-bushman-2024', 'Calming the body reduces anger; venting tends not to (Kjærvik and Bushman, 2024).'],
        ['bushman-2002', 'Hitting a pillow while thinking about the person made people angrier, not calmer (Bushman, 2002).'],
        ['balban-2023', 'Five minutes of breathing with long out-breaths improved mood in one trial (Balban and colleagues, 2023; needs repeating).']
      ],
      idea: 'The order of the five minutes is this site’s own.',
      limits: 'A first-aid step for ordinary upsets, not a treatment.',
      privacy: 'Nothing on this page is kept or sent.'
    },

    'night-garden': {
      name: 'Cool-down corner · Breathing game',
      reg: 'garden',
      problem: 'Slowing your breathing without counting',
      'do': 'Breathe slowly to make flowers bloom and fireflies gather.',
      leave: 'A few slower breaths, with no timer and nothing to lose.',
      pages: ['/night-garden.html'],
      when: 'At the end of a long day, or when your thoughts are busy and you want a few quiet minutes.',
      notWhen: 'Not a treatment, and it doesn’t replace talking to someone.',
      time: 'As long as you like; two minutes is enough to feel a difference for many people.',
      result: 'A few slow breaths, a flower or two bloomed, and a calmer body.',
      next: [
        ['/wp-11.html', 'Make a calm-down plan', 'put breathing in your plan'],
        ['/quick-checks.html', 'My weather today', 'a one-minute daily read'],
        ['/pause-and-play.html', 'More calm games', 'no timers, no way to lose']
      ],
      research: [
        ['zaccaro-2018', 'Slow breathing is linked with more calm and less anxiety (Zaccaro and colleagues, 2018).'],
        ['balban-2023', 'Short daily breathing practice improved mood in one trial (Balban and colleagues, 2023).']
      ],
      idea: 'The garden and its breathing patterns are this site’s own.',
      limits: 'A calm game. If anxiety or poor sleep goes on, talk to a doctor.',
      privacy: 'Your flowers and sound choice are kept in this browser. Nothing is sent anywhere.'
    },

    /* ---------------- Share the load ---------------- */

    'lemonade-stand': {
      name: 'Who does what? · Count the hours and bills',
      reg: 'lemon-full',
      problem: 'Seeing hours and bills together, not just chores',
      'do': 'List the jobs, the hours and the bills for one person or a whole home.',
      leave: 'The split in hours and money, or your own load, with a simple money plan.',
      pages: ['/lemonade-stand.html'],
      two: true,
      when: 'When the work at home or the bills feel uneven and you want to see the whole list plainly, with no blame. Works for two people or a whole house.',
      notWhen: 'Not as a scorecard to win an argument. Not mid-fight: make the list on a calm day.',
      time: 'About 2 minutes for the quick look; 20 to 30 for the full version.',
      result: 'Every job and bill on one list with an owner, each person’s share of the hours shown in plain words (“fairly close” or “leaning one way”), and a fridge list you can print.',
      next: [
        ['/workpapers/wp-03-one-owner-per-job.html', 'Give every job one owner', 'so nobody has to keep asking'],
        ['/is-the-setup-working.html', 'Is the setup working for everyone?', 'a fair look at the split, never at a person'],
        ['/workpapers/wp-02-how-much-are-you-carrying.html', 'How much are you carrying?', 'if you’re running low']
      ],
      research: [
        ['ross-sicoly-1979', 'Each person tends to remember more of their own share of joint work (Ross and Sicoly, 1979). Writing it down helps.'],
        ['daminger-2019', 'The planning, remembering and noticing work at home is real work, and easy to miss (Daminger, 2019).'],
        ['deutsch-1975', 'Fair doesn’t have to mean equal; it can follow need or what people put in (Deutsch, 1975).']
      ],
      idea: 'The stand, the bands and the fridge list are this site’s own; the bands are on <a href="/method-and-limits.html">Method and limits</a>.',
      limits: 'It shows what was typed in. Hours don’t capture everything (energy, skill, how much a job is disliked), so talk about those too.',
      fair: ['Count the invisible jobs too: planning, remembering, noticing.', 'A lopsided split is a setup to change, not proof that someone is lazy or a martyr.'],
      privacy: 'Kept in this browser once you enter something, until you tap “Forget it” or “Erase”. Nothing is sent anywhere. On a shared device, erase it when you’re done.'
    },

    'who-did-what': {
      name: 'Who did what this week: a one-week log',
      reg: 'whodid',
      pages: ['/workpapers/wp-01.html', '/workpapers/fill/wp-01.html'],
      two: true,
      when: 'When memories of a busy week are blurring and you want to see what actually got done at home, by whom.',
      notWhen: 'Not to catch anyone out. If keeping a log would feel like being watched, use the <a href="/lemonade-stand.html">quick look</a> instead.',
      time: 'A minute a day for one week, then 10 minutes to compare.',
      result: 'One week of jobs written down, each person’s own side, and a short list of the jobs that surprised you, plus kind words for saying “not right now”.',
      next: [
        ['/workpapers/wp-03-one-owner-per-job.html', 'One owner per job', 'turn the log into a plan'],
        ['/workpapers/wp-02-how-much-are-you-carrying.html', 'How much are you carrying?', 'a two-minute load check'],
        ['/lemonade-stand.html', 'See the split plainly', 'in Who does what?']
      ],
      research: [
        ['ross-sicoly-1979', 'We each over-remember our own share of shared work (Ross and Sicoly, 1979).'],
        ['caruso-epley-bazerman-2006', 'Thinking about others’ contributions reduces that bias (Caruso, Epley and Bazerman, 2006).'],
        ['daniels-1987', 'Much everyday effort goes unnoticed because we don’t call it “work” (Daniels, 1987).']
      ],
      idea: 'The log’s layout and the kind-no scripts are this site’s own.',
      limits: 'A week is a snapshot. Unusual weeks (illness, travel) will look unusual.',
      fair: ['Each person writes only their own side.'],
      privacy: 'The fill-in sheet keeps a draft in this browser only while “Keep a draft on this device” is ticked. Nothing is sent anywhere.'
    },

    'one-owner': {
      name: 'One owner per job: a who-owns-what list',
      reg: 'owner',
      pages: ['/workpapers/wp-03-one-owner-per-job.html', '/workpapers/fill/wp-03.html'],
      two: true,
      when: 'When the same jobs keep being re-decided, forgotten or done by whoever cracks first, at home, in a team or among family sharing someone’s care.',
      notWhen: 'Not if one person would be handed jobs they never agreed to. Every owner says yes to their jobs.',
      time: 'About 30 minutes together, then a 10-minute look each week.',
      result: 'A shared list where every regular job has one owner who sees it through (and, if you like, a helper), for example “Bins: Sam owns it, Priya helps when Sam travels.”',
      next: [
        ['/workpapers/wp-13-daily-check-in.html', 'A 90-second daily check-in', 'small fixes as you go'],
        ['/workpapers/wp-04-what-keeps-coming-back.html', 'What keeps coming back?', 'a monthly look-back'],
        ['/chore-chart-for-couples.html', 'Print it as a chore chart', 'for the fridge']
      ],
      research: [
        ['latane-williams-harkins-1979', 'When a job belongs to everyone, each person tends to do less of it (Latané and colleagues, 1979).'],
        ['rizzo-house-lirtzman-1970', 'Unclear roles are a well-known source of strain at work (Rizzo, House and Lirtzman, 1970).'],
        ['daminger-2019', 'Owning a job includes the noticing and remembering, not just the doing (Daminger, 2019).']
      ],
      idea: 'One owner plus an optional helper is this site’s simplified take on role charts used at work.',
      limits: 'A list makes things clearer; it doesn’t make an unfair amount of work fair. Check the totals too.',
      fair: ['Owners choose or agree to their jobs; nobody is assigned a job in their absence.', 'Fair doesn’t have to mean 50/50. It means everyone agrees the split works.'],
      privacy: 'The fill-in sheet keeps a draft in this browser only while “Keep a draft on this device” is ticked. Names and jobs are shared with the site’s other tools only if you tick “Use these names in the other tools”.'
    },

    'keeps-coming-back': {
      name: 'What keeps coming back? A monthly look-back',
      reg: 'keepscoming',
      pages: ['/workpapers/wp-04-what-keeps-coming-back.html', '/workpapers/fill/wp-04.html'],
      two: true,
      when: 'Once a month, to find the jobs that keep slipping and fix the setup instead of patching it again.',
      notWhen: 'Not weekly: some patterns only show across a month. Not for charging past hours to anyone.',
      time: 'About 20 minutes once a month.',
      result: 'A short list of repeats, each sorted into one of three kinds (no clear owner, owner can’t keep up, or a one-off), and one change for each.',
      next: [
        ['/workpapers/wp-03-one-owner-per-job.html', 'Update your job list', 'for the jobs with no clear owner'],
        ['/workpapers/wp-09-say-it-so-it-lands.html', 'Say it so it lands', 'for the kind, honest conversation'],
        ['/is-the-setup-working.html', 'Is the setup working for everyone?', 'see the bigger picture']
      ],
      research: [
        ['tannenbaum-cerasoli-2013', 'Regular, structured look-backs improve how teams work, by about a fifth on average (Tannenbaum and Cerasoli, 2013).'],
        ['dekker-2007', 'Looking at the system, not blaming the person, helps people speak up about what went wrong (Dekker, 2007).']
      ],
      idea: 'The three kinds of repeat and the monthly rhythm are this site’s own.',
      limits: 'It shows patterns in what you wrote down. It can’t see jobs nobody logged.',
      fair: ['A job with no owner is a gap in the list, not a judgement on whoever kept covering it.'],
      privacy: 'The fill-in sheet keeps a draft in this browser only while “Keep a draft on this device” is ticked. Nothing is sent anywhere.'
    },

    'daily-check-in': {
      name: '90-second daily check-in',
      reg: 'checkin90',
      pages: ['/workpapers/wp-13-daily-check-in.html', '/workpapers/fill/wp-13.html'],
      two: true,
      when: 'Every day, at a regular moment (after dinner, at the start of a shift), so small things get said while they’re still small.',
      notWhen: 'Not a place to solve problems. If something needs a real talk, save it for a <a href="/check-ins.html">check-in</a>.',
      time: 'About 90 seconds a day.',
      result: 'One sentence each: how full you were today, one thing you appreciated, and (optional) one small thing that didn’t feel great and one thing that would help tomorrow.',
      next: [
        ['/workpapers/wp-03-one-owner-per-job.html', 'Move repeats to the job list', 'anything that comes up more than twice'],
        ['/turning-toward.html', 'Turning toward', 'more small daily habits'],
        ['/week-0.html', 'Six gentle weeks', 'if you’d like a little structure']
      ],
      research: [
        ['laurenceau-1998-intimacy', 'Sharing how you feel, and feeling heard, both make a moment feel close (Laurenceau and colleagues, 1998).'],
        ['gable-2004-capitalization', 'Sharing good things, and being met with interest, lifts mood and closeness (Gable and colleagues, 2004).'],
        ['algoe-2012', 'Everyday thanks helps keep good relationships close (Algoe, 2012).']
      ],
      idea: 'The four questions and the 90-second format are this site’s own.',
      limits: 'Works best as a light habit. Skip days freely; there is nothing to keep up.',
      fair: ['One person speaks, the others just listen. No debate.', 'Keep it a quick update, not a complaint.'],
      privacy: 'The fill-in sheet keeps a draft in this browser only while “Keep a draft on this device” is ticked. Nothing is sent anywhere.'
    },

    'setup-check': {
      name: 'Fair split check: is the setup working?',
      reg: 'fair-quick',
      problem: 'Checking whether your split can last',
      'do': 'Type in the totals from your worksheets, for 2 to 8 people.',
      leave: 'A plain-words read of whether the split can keep going. It scores the setup, never a person.',
      pages: ['/is-the-setup-working.html', '/workpapers/calculators/is-the-setup-working-quick.html'],
      two: true,
      when: 'When you’ve listed the jobs and want a plain read on whether the way you share the work can keep going for everyone, for 2 to 8 people.',
      notWhen: 'Not as a verdict on a person or the relationship. Not as a reason to stop speaking up when the score looks fine.',
      time: 'About 5 minutes for the quick read; 20 for the full one.',
      result: 'A plain sentence, like “Needs a look: one person is carrying most of the planning”, and the one part of the setup to change first.',
      next: [
        ['/workpapers/wp-03-one-owner-per-job.html', 'One owner per job', 'to fix gaps in ownership'],
        ['/workpapers/wp-02-how-much-are-you-carrying.html', 'How much are you carrying?', 'if stress is the weak spot'],
        ['/check-ins.html', 'Talk about it at a set time', 'one change at a time']
      ],
      research: [
        ['adams-1965', 'People notice and feel strain when what they put in and get out seems uneven (Adams, 1965).'],
        ['deutsch-1975', 'Close relationships often use equality or need, not strict tit-for-tat (Deutsch, 1975).'],
        ['lind-2001', 'How fairly a decision is made matters as much as the result (Lind, 2001).']
      ],
      idea: 'The formula and its weights were chosen by hand by this site; they are written out on <a href="/method-and-limits.html">Method and limits</a>.',
      limits: 'The score is not fitted to data, not a probability, and predicts nothing. It describes what you typed in.',
      fair: ['It scores the setup, never a person.'],
      privacy: 'The long form keeps your hours and jobs in this browser. Nothing is sent anywhere. Erase it on <a href="/on-this-device.html">What’s stored on this device</a>.'
    },

    'chore-chart': {
      name: 'Printable chore chart',
      reg: 'chart',
      pages: ['/chore-chart-for-couples.html'],
      two: true,
      when: 'When you want every job at home, including the invisible ones, on one page with one owner each, and a 10-minute look once a week.',
      notWhen: 'Not for scoring each other week by week. Not something one person fills in for both.',
      time: 'About 20 minutes to fill in; 10 minutes a week after that.',
      result: 'A printed chart on the fridge with every job, one owner each, and a weekly note: what went well, what slipped, one thing to change.',
      next: [
        ['/workpapers/wp-03-one-owner-per-job.html', 'One owner per job, on screen', 'a fillable version'],
        ['/invisible-labor-mental-load.html', 'Invisible labour and the mental load', 'what to put on the chart'],
        ['/workpapers/wp-13-daily-check-in.html', 'A 90-second daily check-in', 'small fixes as you go']
      ],
      research: [
        ['daminger-2019', 'Planning and remembering are real jobs too (Daminger, 2019).'],
        ['ross-sicoly-1979', 'Seeing the list together corrects how much we each think we do (Ross and Sicoly, 1979).']
      ],
      idea: 'The chart layout is this site’s own.',
      limits: 'A chart helps you see the work; agreeing the split is still a conversation.',
      fair: ['Fair doesn’t have to mean fifty-fifty. It means you both agree the split works.'],
      privacy: 'It’s a printable page. Nothing is kept or sent.'
    },

    'room-agreement': {
      name: 'Plan it once · Room agreement for roommates',
      reg: 'room',
      problem: 'Roommates, before small things get big',
      'do': 'Quiet hours, guests, cleaning and borrowing, from a common starting point.',
      leave: 'An agreement to copy or send to your roommate to change.',
      pages: ['/sharing-a-room.html'],
      two: true,
      when: 'Early on when sharing a room or flat, or when one thing (noise, guests, cleaning, sleep) keeps bothering one of you.',
      notWhen: 'Not a list of rules for the other person. It’s about the room, not the person.',
      time: 'About 5 minutes to fill in; 15 to agree.',
      result: 'A short agreement you both changed and kept, for example: “Quiet after 11 on weeknights. Guests two nights a week, with a text the day before.”',
      next: [
        ['/signal-translator.html', 'Check your text first', 'before you send it'],
        ['/lemonade-stand.html', 'Chores and bills for the whole house', 'who does what'],
        ['/refusals.html', 'Say no kindly', 'for the asks that don’t fit']
      ],
      research: [
        ['prentice-miller-1993', 'People often wrongly assume everyone else is fine with the way things are (Prentice and Miller, 1993). Saying it early helps.'],
        ['thibaut-walker-1975', 'Rules feel fairer when everyone had a say in making them (Thibaut and Walker, 1975).']
      ],
      idea: 'The agreement and its starting points are this site’s own.',
      limits: 'An agreement works while both people keep looking at it. Revisit it when things change.',
      fair: ['Either of you can suggest changes at any time.'],
      privacy: 'Nothing you type is kept or sent. The link you send carries the agreement inside it, so share it only with your roommate.'
    },

    'time-together-deal': {
      name: 'Plan it once · Time-together deal (games and phones)',
      reg: 'deal',
      problem: 'Gaming or phones versus time together',
      'do': 'Agree game nights, a heads-up rule, a protected evening and phone-free times.',
      leave: 'A deal to copy, share as a link or show as a QR code. Either of you can change it.',
      pages: ['/gaming-and-time-together.html'],
      two: true,
      when: 'When one of you feels ignored and the other feels nagged about gaming or phones, and you’d both like to feel chosen.',
      notWhen: 'Not a way to ban a hobby. The goal isn’t less gaming; it’s time that feels like yours together.',
      time: 'About 10 minutes.',
      result: 'A small deal you both wrote, for example: “Sunday evening is ours. Heads-up before a long session. Phones down for the last ten minutes in bed.”',
      next: [
        ['/bonding.html', 'Bonding ideas', 'something to do with the time'],
        ['/turning-toward.html', 'Turning toward', 'small daily ways to connect'],
        ['/check-ins.html', 'Look at the deal again in a month', 'at a calm, set time']
      ],
      research: [
        ['roberts-david-2016-phubbing', 'Feeling snubbed for a phone goes with more conflict and less satisfaction (Roberts and David, 2016).'],
        ['driver-gottman-2004', 'Answering each other’s small bids for attention builds warmth (Driver and Gottman, 2004).'],
        ['aron-2000-novel-activities', 'Doing something new together can lift how close you feel (Aron and colleagues, 2000).']
      ],
      idea: 'The deal’s parts are this site’s own.',
      limits: 'A deal is a starting point. If it isn’t working after a month, change it together.',
      fair: ['Both people’s needs count: unwinding and feeling close.'],
      privacy: 'Your deal is kept in this browser only while “keep it on this device” is ticked. The link you send carries the deal inside it.'
    },

    'week-on-one-page': {
      name: 'Plan it once · Our week on one page (different hours)',
      reg: 'ourweek',
      problem: 'Opposite shifts and crossed wires',
      'do': 'Write both schedules for the week, with sleep, overlaps and one together time.',
      leave: 'One shared week to copy or send as a text.',
      pages: ['/different-hours.html'],
      two: true,
      when: 'When one of you works nights or shifts, or works from home, and you share a home but not a clock.',
      notWhen: 'Not a timesheet to compare who rests more. Sleep after a night shift is part of the job, not time off.',
      time: 'About 10 minutes, and again when the rota changes.',
      result: 'Both schedules for the week with protected sleep hours, your overlaps marked as check-in moments, one together time, and home jobs fitted around when each of you is awake.',
      next: [
        ['/workpapers/wp-03-one-owner-per-job.html', 'One owner per job', 'share the jobs around the hours'],
        ['/workpapers/wp-13-daily-check-in.html', 'A 90-second check-in in your overlap', 'small things stay small'],
        ['/long-distance.html', 'Long-distance and apart', 'if the hours barely overlap']
      ],
      research: [
        ['gordon-chen-2014', 'Poor sleep goes with more conflict, so protecting sleep protects the relationship (Gordon and Chen, 2014).'],
        ['repetti-1989', 'Heavy work days spill over into home life (Repetti, 1989).'],
        ['daniels-1987', 'Work that isn’t seen tends to go uncounted (Daniels, 1987).']
      ],
      idea: 'The one-page week is this site’s own.',
      limits: 'A plan for an ordinary week. Rotas change; look again when they do.',
      privacy: 'Nothing you type is sent anywhere. What you copy or share is up to you.'
    },

    'work-owners': {
      name: 'Team job list · Owners and backups',
      reg: 'team-owner',
      pages: ['/work.html'],
      two: true,
      when: 'When jobs on a team or between business partners belong to “everyone”, and so to no one, or to the same reliable person every time. The 10-minute team check-in on this page keeps it current each week.',
      notWhen: 'Not a performance review. Not a way to load more work onto whoever is reliable.',
      time: 'About 20 minutes as a team.',
      result: 'A list of the recurring jobs, each with one owner and a backup for holidays and busy weeks, printed or copied for the team.',
      next: [
        ['/appreciation-at-work.html', 'Appreciation at work', 'thanks that fits the person'],
        ['/signal-translator.html', 'Check a work message', 'before you send it'],
        ['/workpapers/wp-04-what-keeps-coming-back.html', 'A monthly look-back', 'what keeps slipping']
      ],
      research: [
        ['latane-williams-harkins-1979', 'Shared jobs get less effort per person than owned ones (Latané and colleagues, 1979).'],
        ['rizzo-house-lirtzman-1970', 'Unclear roles are a known source of stress at work (Rizzo, House and Lirtzman, 1970).'],
        ['edmondson-1999', 'Teams learn more when it feels safe to speak up (Edmondson, 1999).']
      ],
      idea: 'One owner plus a backup is this site’s simplified version of role charts.',
      limits: 'A list makes ownership clear; it doesn’t fix too much work for too few people.',
      fair: ['Each owner agrees to their jobs. Give credit for the quiet jobs too.'],
      privacy: 'The team, jobs and owners are kept in this browser until you erase them. Nothing is sent anywhere.'
    },

    'workpaper-suite': {
      name: 'Your worksheets, in order, with a report',
      reg: 'suite',
      pages: ['/workpapers/fill/suite.html', '/full-path.html'],
      two: true,
      when: 'When you’d like to work through several worksheets in a sensible order for your situation (just you, a couple, a household, co-parents, a team), and get one report at the end. Fill them in one at a time, or all of them in one PDF (“Full path package”).',
      notWhen: 'Not all in one sitting. One sheet a week is plenty; <a href="/prog-01.html">Six gentle weeks</a> paces it for you.',
      time: 'Each sheet takes 5 to 30 minutes; the whole road takes a few weeks.',
      result: 'Your filled-in sheets in one PDF you can type into or print, and a report written for your road: findings, things worth a second look, and a short plan.',
      next: [
        ['/prog-01.html', 'Six gentle weeks', 'one sheet a week, with calendar reminders'],
        ['/is-the-setup-working.html', 'Is the setup working for everyone?', 'see how the split is going'],
        ['/method-and-limits.html', 'How the scores work', 'the plain rules behind each one']
      ],
      research: [
        ['gollwitzer-sheeran-2006', 'Writing down when and where you’ll act makes follow-through more likely (Gollwitzer and Sheeran, 2006).'],
        ['tannenbaum-cerasoli-2013', 'Regular structured look-backs help groups improve (Tannenbaum and Cerasoli, 2013).']
      ],
      idea: 'The roads, the order and the report are this site’s own. Each sheet’s own page says what it draws on.',
      limits: 'Worksheets help you see and agree; they don’t replace talking, or outside help when it’s needed.',
      privacy: 'Nothing is kept unless you tick “Keep a draft on this device”, or “Use these names in the other tools” (which keeps just the names and jobs). Nothing is sent anywhere.'
    },

    /* ---------------- Closeness ---------------- */

    'bonding-ideas': {
      name: 'Stay close',
      reg: 'bonding',
      pages: ['/bonding.html'],
      when: 'When you’d like one small, low-cost idea to grow closeness with someone (a partner, child, friend, parent, housemate or coworker), sized to your time and energy.',
      notWhen: 'Not a fix for a hurt that needs talking about first; try <a href="/check-ins.html">a check-in</a> for that.',
      time: 'About 1 minute to pick; the idea takes from 1 minute to a weekend.',
      result: 'One idea that fits who it’s with, how long you have and how much energy, for example “Ten minutes tonight with no to-do list”, ready to copy or send.',
      next: [
        ['/turning-toward.html', 'Turning toward', 'seven small daily habits'],
        ['/touchstones.html', 'Your shared language', 'the jokes and rituals that say “us”'],
        ['/workpapers/wp-13-daily-check-in.html', 'A 90-second daily check-in', 'a tiny daily habit to share']
      ],
      research: [
        ['aron-1997-closeness', 'Gradually deeper sharing can make two people feel closer (Aron and colleagues, 1997).'],
        ['hall-2019-hours-friend', 'Friendship grows with time spent together, especially fun time (Hall, 2019).'],
        ['kurtz-algoe-2015', 'Laughing together goes with feeling closer (Kurtz and Algoe, 2015).']
      ],
      idea: 'The ideas and the picker are this site’s own.',
      limits: 'Ideas, not a programme. Closeness grows slowly and unevenly, and that’s normal.',
      privacy: 'Only your last picks (who, how long, how much energy) are kept in this browser. Nothing is sent anywhere.'
    },

    'turning-toward': {
      name: 'Turning toward: a 7-day start',
      pages: ['/turning-toward.html'],
      when: 'When you’d like to feel closer to someone through tiny everyday moments: a joke, a sigh, a “look at this”.',
      notWhen: 'Not a chore list. Skip any day; there’s nothing to keep up.',
      time: 'About 1 minute a day.',
      result: 'A few small habits that felt natural, like looking up when they say “huh”, or asking one follow-up question about their day.',
      next: [
        ['/workpapers/wp-13-daily-check-in.html', 'A 90-second daily check-in', 'keep the habits going'],
        ['/bonding.html', 'Bonding ideas', 'something a little bigger'],
        ['/touchstones.html', 'Your shared language', 'the small things that say “us”']
      ],
      research: [
        ['driver-gottman-2004', 'Couples who answer each other’s small bids bring more warmth to later disagreements (Driver and Gottman, 2004).'],
        ['gable-2004-capitalization', 'Responding with interest to good news builds closeness (Gable and colleagues, 2004).'],
        ['huang-2017-questions', 'Asking follow-up questions makes people feel heard and liked (Huang and colleagues, 2017).']
      ],
      idea: 'The seven-day start is this site’s own.',
      limits: 'Small habits help most when things are basically okay. Bigger hurts need a real conversation.',
      privacy: 'Your check marks and who you chose are kept in this browser only. “Start over” clears them.'
    },

    'care-card': {
      name: 'How you connect · What feels like care: a card',
      reg: 'carecard',
      problem: 'Knowing what you need before you ask for it',
      'do': 'Tick what would feel like care to you right now: words, help, time, small gifts or touch.',
      leave: 'A short care card to copy and share.',
      pages: ['/love-languages.html'],
      when: 'When you’d like to tell someone the small, specific things that make you feel cared for, and ask what works for them.',
      notWhen: 'Not a label for you or them, and not a test of whether you’re compatible.',
      time: 'About 5 minutes.',
      result: 'A short card of specific things, for example “Taking a job off my plate without being asked. Twenty minutes with phones away. A long hug.”',
      next: [
        ['/check-ins.html', 'Swap cards in a calm talk', 'and ask for theirs'],
        ['/apology-languages.html', 'Apology languages', 'what helps after a hurt'],
        ['/languages-of-connection.html', 'How the “languages” fit together', 'one picture']
      ],
      research: [
        ['impett-park-muise-2024', 'A 2024 review found little support for “one main love language” or for matching them; the useful part is noticing specific care (Impett, Park and Muise).'],
        ['chapman-1992', 'The five love languages come from a counsellor’s book, not from research (Chapman, 1992).'],
        ['gable-2004-capitalization', 'Being responsive to what someone shares is what builds closeness (Gable and colleagues, 2004).']
      ],
      idea: 'Treating the five as a menu, not a type, and the card itself, are this site’s own.',
      limits: 'Popular, not well supported by research. Use it as a conversation starter only.',
      fair: ['Ask, don’t guess. Their card may look nothing like yours, and that’s fine.'],
      privacy: 'Nothing you tick is saved or sent. You can copy the card and share it if you choose.'
    },

    'touchstone-list': {
      name: 'Stay close · Our shared words and rituals',
      reg: 'touchstones',
      problem: 'Keeping the “this is us” things alive',
      'do': 'Note the shared words, jokes, rituals and stories that say “this is us”.',
      leave: 'A list to copy and keep, and one new touchstone to try.',
      pages: ['/touchstones.html'],
      when: 'When you’d like to notice and keep fresh the small things that say “we’re us”: nicknames, inside jokes, rituals.',
      notWhen: 'Not a test of how close you are. Every relationship’s touchstones look different.',
      time: 'About 5 minutes.',
      result: 'A short list: a word you use, an inside joke, a little habit, and one new one you’d like to try this week.',
      next: [
        ['/bonding.html', 'Bonding ideas', 'something to make a new touchstone from'],
        ['/turning-toward.html', 'Turning toward', 'small daily habits'],
        ['/love-languages.html', 'Care card', 'the specific things that feel like care']
      ],
      research: [
        ['bruess-pearson-1997', 'Couples and friends build shared everyday rituals (Bruess and Pearson, 1997; descriptive research).'],
        ['hopper-knapp-scott-1981', 'Couples develop private words and nicknames (Hopper, Knapp and Scott, 1981; exploratory).'],
        ['fiese-2002-rituals', 'Family routines and rituals go with better family wellbeing (Fiese and colleagues, 2002; mostly correlational).']
      ],
      idea: 'The idea of “touchstones” as a menu is this site’s own.',
      limits: 'The research here is early and descriptive. It shows these things are common, not that making them causes closeness.',
      privacy: 'Nothing is saved or sent. You can copy the list and share it if you choose.'
    },
    /* ---------------- More tools (from the tools registry) ---------------- */

    'roots': {
      name: 'Old rules, new choices',
      reg: 'roots',
      pages: ['/growing-up.html'],
      when: 'When a reaction of yours feels bigger or older than the moment (always fixing things, going quiet, needing to be useful) and you want to see where it may have started.',
      notWhen: 'Not for diagnosing anyone in your family, or for deciding who is to blame. Stop any time if it brings up too much.',
      time: 'About 5 minutes.',
      result: 'An old rule in your own words and a fairer, grown-up reading of it, for example “I’m only okay when I’m useful” becomes “Helping is something I do, not the price of being loved”, plus one small way to work with it now.',
      next: [
        ['/know-yourself.html', 'Know your own wiring', 'what’s you, what life taught you, and what’s just today'],
        ['/wiring-card.html', 'Make a one-page card', 'so others know what helps'],
        ['/self-path.html', 'Your self path', 'more small steps on your own']
      ],
      research: [
        ['masten-2001', 'Resilience is common and usually comes from ordinary things, like relationships (Masten, 2001).'],
        ['hudson-fraley-2015', 'People who want to change a trait can shift a little, especially with concrete plans (Hudson and Fraley, 2015).'],
        ['byng-hall-1995', '“Family scripts” are patterns passed down that families can rewrite (Byng-Hall, 1995; a clinical framework).']
      ],
      idea: 'The tap-through and the example rules are this site’s own.',
      limits: 'A gentle look back, not therapy. If old memories are painful, <a href="/outside-help.html">Help beyond this site</a> lists people to talk to.',
      privacy: 'Your answers stay until you close the tab, or are kept in this browser only if you tick “Keep my answers on this device”. Nothing is sent anywhere.'
    },

    'snapshot': {
      name: 'Who does what? · Not sure where to start? 2 minutes',
      reg: 'snapshot',
      problem: 'Not knowing where to start with a shared load',
      'do': 'Seven quick questions about how a shared load is set up, and how it bends when things get heavy.',
      leave: 'Which of four areas to look at first, with the scoring shown openly.',
      pages: ['/snapshot/index.html'],
      when: 'When you share a load with someone (a home, a child’s care, a team) and want a quick look at how it’s set up and how it bends when things get heavy.',
      notWhen: 'Not a judgement on anyone’s effort. Answer about the setup, not the people.',
      time: 'About 2 minutes.',
      result: 'Which of four areas to look at first (for example “who notices what needs doing”), with the scoring shown openly.',
      next: [
        ['/lemonade-stand.html#quick', 'Who does what? Quick look', 'see the jobs on one list'],
        ['/workpapers/wp-03-one-owner-per-job.html', 'One owner per job', 'fix the area that came up'],
        ['/share-the-load.html', 'Share the load, step by step', 'which tool to use next']
      ],
      research: [
        ['daminger-2019', 'Noticing, planning and checking are real work and easy to miss (Daminger, 2019).'],
        ['hobfoll-1989', 'Stress grows when what we rely on is used up faster than it’s replaced (Hobfoll, 1989).'],
        ['deutsch-1975', 'Fair can mean equal, by effort or by need, depending on the relationship (Deutsch, 1975).']
      ],
      idea: 'The seven questions, the four areas and the scoring are this site’s own.',
      limits: 'A quick snapshot of what you answered, not a measurement or a verdict.',
      privacy: 'Your answers stay on this page. Nothing is sent anywhere.'
    },

    'calm-sounds': {
      name: 'Cool-down corner · Calm sounds and music',
      reg: 'music',
      problem: 'A few minutes away from words',
      'do': 'Two ways to press play while you settle: four instrumental pieces with a visualizer, or a plain background sound (a low hum, a soft flutter or brown noise).',
      leave: 'A short break for your mind, or something steady in the background. A matter of taste, not a treatment.',
      pages: ['/soundscapes.html', '/wp-11-sound-toolkit.html'],
      when: 'While you settle after a hard moment, to cover background noise when you need to calm down or focus, or for a short real break. Music for a break; a plain background sound for something steady.',
      notWhen: 'Not a treatment. If a sound or a piece feels worse, stop; it’s a matter of taste.',
      time: 'A few minutes, or a piece of 2 to 4 minutes.',
      result: 'A sound or a piece that helps you, noted in your <a href="/wp-11.html">calm-down plan</a> so it’s ready next time.',
      next: [
        ['/wp-11.html', 'Calm-down plan', 'add the sound that helps'],
        ['/night-garden.html', 'Breathing game', 'slow breaths, nothing to win'],
        ['/upset-right-now.html', 'Upset right now?', 'five calm minutes']
      ],
      research: [],
      idea: 'The three background sounds (a low hum, a soft flutter and brown noise) are this site’s choice, and the music is by Christian’s Lab. There’s no strong research on which sound calms people best.',
      limits: 'A matter of taste, not a treatment. Keep the volume low.',
      privacy: 'The background sounds keep nothing. The music keeps your favourite and what you played in this browser. Nothing is sent anywhere.'
    },

    'drift': {
      name: 'Cool-down corner · Slow colours and tones',
      reg: 'drift',
      problem: 'Winding down before sleep',
      'do': 'Pick how you feel. Slow colours, kind words and gentle tones keep you company (headphones help).',
      leave: 'A few quiet minutes with nothing to do.',
      pages: ['/calm-visualizer.html'],
      when: 'When you want a few quiet minutes with nothing to do: slow colours, kind words and gentle tones (headphones help).',
      notWhen: 'If moving light or colour is uncomfortable for you, try <a href="/soundscapes.html#background">sounds only</a> instead.',
      time: 'About 5 minutes.',
      result: 'A few quiet minutes and a slower breath.',
      next: [
        ['/night-garden.html', 'Breathing game', 'slow breathing with something to watch'],
        ['/wp-11.html', 'Calm-down plan', 'what settles you, decided ahead of time'],
        ['/quick-checks.html', 'How am I right now?', 'four quick taps, or a one-minute forecast']
      ],
      research: [
        ['kaplan-1995', 'Things that hold attention gently (like nature) may help tired attention recover (Kaplan, 1995).']
      ],
      idea: 'The visuals and words are this site’s own.',
      limits: 'A calm moment, not a treatment.',
      privacy: 'Your last choices are kept in this browser. Nothing is sent anywhere.'
    },

    'handoff-bag': {
      name: 'Plan it once · Handoff-bag checklist for two homes',
      reg: 'handoff',
      problem: 'Co-parents handing over between two homes',
      'do': 'A short list, the same in both homes, of what goes in the bag.',
      leave: 'A list to copy, or a shared list both homes can change.',
      pages: ['/co-parenting.html'],
      two: true,
      when: 'When children move between two homes and handoffs keep going wrong over one forgotten thing.',
      notWhen: 'Not a way to check up on the other parent. It’s a list for the bag, used the same way in both homes.',
      time: 'About 3 minutes.',
      result: 'One short list, the same in both homes, kept by the door or in the bag: medicines with the last dose, school things, kit, chargers and the comfort toy, and one line about anything new.',
      next: [
        ['/workpapers/wp-03-one-owner-per-job.html?for=coparents', 'One owner per job, for two homes', 'who handles what'],
        ['/signal-translator.html', 'Check a message to the other parent', 'brief, friendly, firm'],
        ['/write-it-through.html', 'Write it through', 'for bigger topics']
      ],
      research: [
        ['haynes-et-al-2009', 'Simple checklists cut serious mistakes in hospitals (Haynes and colleagues, 2009).'],
        ['feinberg-2003', 'Co-parenting goes better with agreement and a clear split of jobs between homes (Feinberg, 2003).']
      ],
      idea: 'The list itself is this site’s own starting point. Change it to fit your children.',
      limits: 'A checklist prevents forgotten things; it doesn’t settle bigger disagreements between homes.',
      privacy: 'Nothing is sent to this site. A shared list goes only to the person you send it to.'
    },

    'event-terms': {
      name: 'Plan it once · Set your terms for a family event',
      reg: 'terms',
      problem: 'A family event while some things are still raw',
      'do': 'Fill in what you are happy to do, what you are not ready to talk about, and one ask.',
      leave: 'A calm message to copy into your own text.',
      pages: ['/family-rifts.html'],
      when: 'Before a wedding, funeral, christening or holiday with family you’re estranged from or on careful terms with: you can go and still keep some things off the table.',
      notWhen: 'Not something you have to send. You can fill it in just to get clear for yourself.',
      time: 'About 5 minutes.',
      result: 'A calm message in your own words: what you’re happy to do, what you’re not ready to talk about, and one thing you’d ask.',
      next: [
        ['/signal-translator.html', 'Check the message', 'before you send it'],
        ['/refusals.html', 'Say no kindly', 'if the answer is “not this time”'],
        ['/wp-11.html', 'Calm-down plan', 'for the day itself']
      ],
      research: [
        ['pillemer-2020', 'Family estrangement is more common than people think, and some families do reconcile (Pillemer, 2020).'],
        ['gollwitzer-sheeran-2006', 'Deciding in advance what you’ll do makes it easier to follow through (Gollwitzer and Sheeran, 2006).']
      ],
      idea: 'The three boxes and the message are this site’s own.',
      limits: 'Clear terms help, but you can’t control how others respond.',
      privacy: 'It stays on this page. Nothing is saved or sent.'
    },

    'full-package': {
      name: 'Your worksheets, in order, with a report',
      reg: 'suite',
      pages: ['/full-path.html'],
      two: true,
      when: 'When you want every worksheet for your situation in one fillable PDF, and a detailed report written from your own answers, alone or with 2 to 8 people.',
      notWhen: 'Not in one sitting. Do it in parts, over a few weeks.',
      time: 'An hour or more, in parts.',
      result: 'One PDF with your filled-in sheets and a report: what stands out, what’s worth a second look, and a short plan.',
      next: [
        ['/prog-01.html', 'Six gentle weeks', 'the same sheets, one a week'],
        ['/method-and-limits.html', 'How the scores work', 'the plain rules behind each one'],
        ['/workpapers/fill/suite.html', 'All the worksheets on screen', 'fill them in here instead']
      ],
      research: [
        ['tannenbaum-cerasoli-2013', 'Structured look-backs help people and groups improve (Tannenbaum and Cerasoli, 2013).']
      ],
      idea: 'The roads, the PDF and the report wording are this site’s own; the scores are written out on <a href="/method-and-limits.html">Method and limits</a>.',
      limits: 'The report reads your answers back with simple rules. It isn’t a professional assessment.',
      privacy: 'The PDF is made on this device and saved where you choose. Nothing is sent to this site.'
    },

    'six-weeks': {
      name: 'Six gentle weeks',
      reg: 'sixweeks',
      pages: ['/prog-01.html'],
      two: true,
      when: 'When you’d like a gentle structure: one small step a week, in an order that helps, on your own or with anyone you share a home or a load with.',
      notWhen: 'Not a course to keep up with. Missing a week is fine: pick up anywhere.',
      time: 'About 30 minutes a week, for six weeks.',
      result: 'Six small sheets done in order, and a before-and-after look at the end: which jobs now have owners, how much each of you is carrying, and what changed.',
      next: [
        ['/week-0.html', 'Start with week 0', 'five minutes, and reminders in your own calendar'],
        ['/workpapers/report-01.html', 'Your progress, week by week', 'see the weeks side by side'],
        ['/examples.html', 'What small changes look like', 'made-up examples']
      ],
      research: [
        ['lally-2010', 'New habits take weeks to months to settle, and missing a day doesn’t undo them (Lally and colleagues, 2010).'],
        ['gollwitzer-sheeran-2006', 'Naming when and where you’ll do something makes it more likely to happen (Gollwitzer and Sheeran, 2006).']
      ],
      idea: 'The six steps and their order are this site’s own; the program hasn’t been tested in a study.',
      limits: 'Self-help, not couples or family therapy.',
      privacy: 'Your start date and the weeks you ticked are kept in this browser; worksheet drafts only if you choose to keep them. Nothing is sent anywhere.'
    },

    'week-0': {
      name: 'Week 0: a five-minute start to Six gentle weeks',
      pages: ['/week-0.html'],
      when: 'Before the six weeks: five minutes to see what they are, how long each takes, and to add a reminder for each week to your own calendar.',
      notWhen: 'Nothing to fill in yet, and nothing to get right.',
      time: 'About 5 minutes.',
      result: 'You know what each week asks, and six reminders are in your own calendar (you add them; the site doesn’t send anything).',
      next: [
        ['/prog-01.html', 'Six gentle weeks: week 1', 'one small step'],
        ['/workpapers/wp-01.html', 'Who did what this week', 'the week 1 sheet'],
        ['/start-in-10-minutes.html', 'Ten-minute start', 'if you’d rather just try one thing']
      ],
      research: [
        ['gollwitzer-sheeran-2006', 'A set time and place makes follow-through more likely (Gollwitzer and Sheeran, 2006).']
      ],
      idea: 'The week-by-week plan is this site’s own.',
      limits: 'Reminders help you remember; they don’t make anyone take part.',
      privacy: 'The calendar file is made on this device and added by you. Nothing is sent to this site.'
    },

    'progress-report': {
      name: 'Your progress, week by week',
      reg: 'progress',
      pages: ['/workpapers/report-01.html'],
      two: true,
      when: 'Each week of the program, to type in what your worksheets produced and see them side by side: where they agree, and where they don’t.',
      notWhen: 'Not a report card on anyone. It reads the setup over time.',
      time: 'About 10 minutes a week.',
      result: 'One shared picture of the setup over the weeks, for example “jobs with no clear owner: 6, then 3, then 1”, with the places your sheets disagree pointed out.',
      next: [
        ['/workpapers/wp-04-what-keeps-coming-back.html', 'What keeps coming back?', 'look at the repeats'],
        ['/is-the-setup-working.html', 'Is the setup working for everyone?', 'the fuller calculator'],
        ['/check-ins.html', 'Talk about one finding', 'at a calm, set time']
      ],
      research: [
        ['tannenbaum-cerasoli-2013', 'Regular, structured look-backs improve how groups work (Tannenbaum and Cerasoli, 2013).'],
        ['kluger-denisi-1996', 'Feedback helps most when it’s about the task, and can backfire when it’s about the person (Kluger and DeNisi, 1996).']
      ],
      idea: 'The report and how it compares the sheets are this site’s own.',
      limits: 'It can only read what you typed in. Numbers don’t capture how things feel; talk about that too.',
      privacy: 'Your ledger is a file you keep: nothing is stored in the browser or sent anywhere. Press “Save ledger” to download it.'
    },

    /* ---------------- Round 10: three new worksheets and the 30-day look-back ---------------- */

    'same-moment': {
      name: 'Same moment, different speeds',
      reg: 'pace12',
      pages: ['/workpapers/wp-12-same-moment-different-speeds.html', '/workpapers/wp-12-same-moment-different-speeds-in-depth.html', '/workpapers/fill/wp-12.html'],
      two: true,
      when: 'When one of you keeps wanting to sort things now and the other keeps needing time, and it is starting to feel like a difference in caring.',
      notWhen: 'Not in the middle of a row: take a break first with <a href="/pursue-withdraw.html">a pause plan</a>. Not to prove who is “too slow” or “too pushy”.',
      time: 'About 20 minutes, once. Then try your agreement for two weeks.',
      result: 'Your gaps in plain words, for example “bills: Tom right away, Rosa after a night’s sleep”, and one small agreement for the biggest gap that gives the faster person a way to start and the slower person a time to land.',
      next: [
        ['/pursue-withdraw.html', 'A pause plan', 'when one of you needs space in the middle of a hard talk'],
        ['/tools/frequency-calibration.html', 'Compare your daily rhythms', 'for pace across the whole week, not just five moments'],
        ['/check-ins.html', 'Check-ins', 'to look at how the agreement is going, at a set time']
      ],
      idea: 'The five moments, the three questions (speed, talk, urgency) and how the gaps are counted are this site’s own. No study is behind these questions.',
      limits: 'It shows what each of you says about your own pace. It can’t tell you why, and it is not a tested tool.',
      fair: ['Mark your own speeds before you look at the other person’s answers.'],
      privacy: 'The worksheet runs on this device. What you type stays in this tab until you close it, or longer only if you tick “Keep a draft on this device”. Nothing is sent anywhere.'
    },

    'is-it-us': {
      name: 'Is it us, or is it everything else?',
      reg: 'static14',
      pages: ['/workpapers/wp-14-is-it-us-or-everything-else.html', '/workpapers/wp-14-is-it-us-or-everything-else-in-depth.html', '/workpapers/fill/wp-14.html'],
      two: true,
      when: 'In a hard stretch (a deadline, an illness, money worry, bad sleep) when you have started snapping at each other and wonder what has gone wrong between you.',
      notWhen: 'Not to excuse unkindness: outside pressure explains a hard day, it doesn’t excuse it. If the same tension is there on easy days too, talk about it at <a href="/check-ins.html">a calm, set time</a>.',
      time: 'A minute each evening for a week, then about 15 minutes together.',
      result: 'A plain count, for example “3 of our 4 tense moments came on a heavy day”, and one plan for the pressure: a way to flag a heavy day (“Rough day, not you”), things to go easy on, and one bit of outside help to ask for.',
      next: [
        ['/workpapers/wp-02-how-much-are-you-carrying.html', 'How much are you carrying?', 'a quick check of today’s load'],
        ['/workpapers/wp-04-what-keeps-coming-back.html', 'What keeps coming back?', 'for the tension that stays in the “between us” column'],
        ['/check-ins.html', 'Check-ins', 'to talk about one finding on a calmer day']
      ],
      research: [
        ['neff-karney-2009', 'Spouses under more outside stress reacted more strongly to everyday upsets in the relationship (Neff and Karney, 2009).'],
        ['repetti-1989', 'After heavy workdays, air traffic controllers were more withdrawn with their spouses that evening (Repetti, 1989).']
      ],
      idea: 'The two-column log, the “mostly” labels and the end-of-week count are this site’s own.',
      limits: 'Your labels are guesses, and they can change. A week is short, and it can’t prove what caused what.',
      fair: ['Each person fills in only their own rows.'],
      privacy: 'The worksheet runs on this device. What you type stays in this tab until you close it, or longer only if you tick “Keep a draft on this device”. Nothing is sent anywhere.'
    },

    'little-rituals': {
      name: 'Keep your little rituals alive',
      reg: 'rituals15',
      pages: ['/workpapers/wp-15-keep-your-little-rituals-alive.html', '/workpapers/wp-15-keep-your-little-rituals-alive-in-depth.html', '/workpapers/fill/wp-15.html'],
      two: true,
      when: 'Every three months or so, or when you notice it has been ages since you did the small things you used to do together.',
      notWhen: 'Not as a list of what the other person has stopped doing. Rituals lapse for ordinary reasons, and nobody is to blame.',
      time: 'About 15 minutes, four times a year.',
      result: 'Your shared rituals marked alive, fading or stopped, one to restart in its smallest form (for example “twenty minutes round the park on Sunday afternoons”), and maybe one to let go with thanks.',
      next: [
        ['/touchstones.html', 'Touchstones', 'your shared words, jokes and rituals'],
        ['/turning-toward.html', 'Turning toward', 'small everyday moments of closeness'],
        ['/complacency.html', 'Complacency', 'when things have gone quietly flat']
      ],
      research: [
        ['fiese-2002-rituals', 'A review linked family routines and rituals with closer, steadier family life, though much of the research is correlational (Fiese and colleagues, 2002).'],
        ['bruess-pearson-1997', 'Married couples and adult friends share many kinds of small everyday rituals (Bruess and Pearson, 1997).']
      ],
      idea: 'The alive, fading or stopped marks and the “smallest form” restart are this site’s own.',
      limits: 'It helps you notice and choose. It can’t make a ritual feel the way it used to, and it is not a tested tool.',
      privacy: 'The worksheet runs on this device. What you type stays in this tab until you close it, or longer only if you tick “Keep a draft on this device”. Nothing is sent anywhere.'
    },

    'look-back': {
      name: 'Fair split check · Over a month: a quick read',
      reg: 'lookback-quick',
      problem: 'Checking whether last month’s changes stuck',
      'do': 'Type in how things were about a month ago and how they are this week.',
      leave: 'What shifted, what didn’t, and one next step. It reads the setup, never a person.',
      pages: ['/look-back-30-days.html', '/workpapers/calculators/look-back-30-days-quick.html'],
      two: true,
      when: 'After about a month of using the worksheets or the six gentle weeks, to see whether what you changed is changing anything.',
      notWhen: 'Not as a verdict on a person. Not after one week: one week can be a fluke.',
      time: 'About 5 minutes for the quick look-back; 15 for the full one.',
      result: 'A plain list of what shifted and what didn’t, and one next step.',
      next: [
        ['/workpapers/wp-03-one-owner-per-job.html', 'One owner per job', 'if jobs still have no owner'],
        ['/workpapers/wp-04-what-keeps-coming-back.html', 'What keeps coming back?', 'if rescues keep happening'],
        ['/check-ins.html', 'Check-ins', 'to talk it through at a set time']
      ],
      idea: 'The cut-offs (0.10 on a 0 to 1 scale, 1 rescue a week) are this site’s own rule of thumb.',
      limits: 'It describes what you typed in. It predicts nothing and is not a tested tool.',
      privacy: 'Nothing is sent anywhere. The full page keeps entries only if you tick “Keep my entries on this device”.'
    }
  }
};
