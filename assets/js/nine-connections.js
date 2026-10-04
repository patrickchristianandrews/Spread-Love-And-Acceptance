/* nine-connections.js — how Christian's thirteen fields connect: one connection for every one of the 78 pairs, each
   with the root it shares, how obvious it is, what it means and where it shows up in the program; and the chain,
   where each field leads logically into the next, all the way round. Used by the polymath page; Professor Puddles
   learns the same list (tools/chat/build_kb.py reads this file). Edit here, and both stay in step. */
window.TOL_NINE = {
  fields: [
    ['nb', 'Neurobiology'], ['ps', 'Psychology'], ['ph', 'Philosophy'], ['db', 'The art of debating'], ['po', 'Politics'],
    ['bs', 'Behavioral science'], ['ec', 'Economics'], ['fi', 'Finance'], ['bu', 'Business'], ['ht', 'Holistic therapies'],
    ['la', 'Laughter therapy'], ['mu', 'Music'], ['ar', 'Aromatherapy']
  ],
  roots: { balance: 'balance', signal: 'signal and noise', loops: 'feedback loops', capacity: 'limited capacity', owner: 'ownership and structure', incent: 'quiet incentives', state: 'state and setting' },
  tiers: { o: 'Obvious', h: 'Hidden', a: 'Abstract', d: 'Deepest' },
  pillars: { 1: ['Pillar I, See the whole load', 'see-the-load'], 2: ['Pillar II, Fix the setup, not the person', 'fix-the-setup'], 3: ['Pillar III, Read your state first', 'read-your-state'], 4: ['Pillar IV, Tune how you send and receive', 'tune-signals'], 5: ['Pillar V, Notice the quiet incentives', 'quiet-incentives'] },
  // [field a, field b, root, tier, what connects them, [tool, link], pillar]
  pairs: [
    ['ps', 'bs', 'loops', 'o', 'Habits beat willpower, especially when you’re tired. A routine too small to skip keeps going on the bad days.', ['The 90-second check-in (WP-13)', '/workpapers/wp-13-pll-protocol.html'], 4],
    ['ps', 'nb', 'state', 'o', 'How you feel and how your nervous system is running are the same moment, seen from two sides.', ['Today’s Weather', '/quick-checks.html#today'], 3],
    ['ps', 'ht', 'state', 'o', 'Calm the body before the conversation. Words land better once the body has settled.', ['The Calm-Down Kit (WP-11)', '/wp-11.html'], 3],
    ['ph', 'bu', 'owner', 'o', '“Fair by promises” only works when the promises are written down: one owner per job.', ['Chapter IV: two kinds of fair', '/book/chapter-4.html'], 2],
    ['bs', 'ec', 'incent', 'o', 'People follow what the setup quietly rewards, far more than what they intend.', ['Pillar V', '/five-pillars.html#quiet-incentives'], 5],
    ['bs', 'bu', 'loops', 'o', 'Small, regular reviews catch problems while they’re small, in a company or a home.', ['The monthly look-back (WP-04)', '/workpapers/wp-04-deficit-audit.html'], 2],
    ['nb', 'ht', 'capacity', 'o', 'A system past its limit can’t think its way back. Settle first, then talk.', ['Breathe or the Night Garden', '/night-garden.html'], 3],
    ['nb', 'ar', 'state', 'o', 'What reaches the senses sets the body’s alert level. A noisy room makes every comment arrive louder.', ['Chapter IV: giving a comment time to land', '/book/chapter-4.html'], 3],
    ['ec', 'bu', 'capacity', 'o', 'Time and attention get spent like any budget, and they run out like one too.', ['The Lemonade Stand', '/lemonade-stand.html'], 1],
    ['ec', 'fi', 'balance', 'o', 'Both keep accounts of a limited supply. Together they give the book its ledger and the idea of unbilled debt.', ['The Preface: unbilled debt', '/book/preface.html'], 1],
    ['fi', 'bu', 'owner', 'o', 'Internal controls give every job an owner and every entry a record.', ['One owner per job (WP-03)', '/workpapers/wp-03-raci-treaty.html'], 2],
    ['ht', 'ar', 'state', 'o', 'Both start with the body and the senses, not the argument.', ['Brain Breakers', '/soundscapes.html'], 3],

    ['ps', 'ph', 'signal', 'h', 'Intent isn’t impact, and most of what’s said in a conflict is a guess wearing the costume of a fact.', ['The Signal Translator', '/signal-translator.html'], 4],
    ['ps', 'ec', 'capacity', 'h', 'We each remember our own effort best, so unseen work goes uncounted, though it spends real attention.', ['Who did what (WP-01)', '/workpapers/wp-01.html'], 1],
    ['ps', 'bu', 'owner', 'h', 'Work with no clear owner lands on whoever notices first, and that person gets called controlling. Unclear ownership turns into hurt feelings.', ['One owner per job (WP-03)', '/workpapers/wp-03-raci-treaty.html'], 2],
    ['ps', 'fi', 'balance', 'h', 'Goodwill works like a reserve. Thanks and repairs top it up; sharp words draw it down, and a low reserve makes small things feel big.', ['Turning Toward', '/turning-toward.html'], 1],
    ['ps', 'ar', 'state', 'h', 'The same sentence lands differently in a calm, quiet room. The setting changes what a person can take in.', ['Chapter IV: where and when to talk', '/book/chapter-4-in-depth.html'], 3],
    ['ph', 'ec', 'balance', 'h', 'Efficient and fair aren’t the same thing. “It all got done” can hide who quietly did it.', ['Chapter IV: two kinds of fair', '/book/chapter-4.html'], 5],
    ['ph', 'fi', 'balance', 'h', 'Double-entry bookkeeping is a fairness idea: every entry has two sides, and a book that balances from one side only isn’t balanced.', ['Your side, their side', '/book/preface-in-depth.html'], 2],
    ['bs', 'nb', 'capacity', 'h', 'A tired body makes good habits harder. That’s why the program’s habits are tiny: they have to survive the worst day of the week.', ['The 90-second check-in (WP-13)', '/workpapers/wp-13-pll-protocol.html'], 3],
    ['bs', 'fi', 'incent', 'h', 'A score you can raise by deleting the hard rows is rewarding the wrong thing. Keep the unowned jobs on the list.', ['Chapter II: ownership clarity', '/book/chapter-2-in-depth.html'], 5],
    ['bs', 'ar', 'state', 'h', 'Cues in a room start habits. A cup of tea or a familiar scent can become your signal to slow down.', ['The Calm-Down Kit (WP-11)', '/wp-11.html'], 3],
    ['nb', 'ec', 'capacity', 'h', 'Attention is scarce. Noticing, remembering and planning spend it, even when nobody sees.', ['The mental load', '/book/preface.html'], 1],
    ['nb', 'bu', 'capacity', 'h', 'A team past capacity drops things, and so does a body. Both need a safety margin for the ordinary bad week.', ['Chapter V: a capacity issue', '/book/chapter-5.html'], 2],
    ['nb', 'fi', 'balance', 'h', 'Your battery works like a balance sheet: leftover stress is a debt, and rest is the reserve.', ['The Battery & Stress Meter (WP-02)', '/workpapers/wp-02-battery-stress-meter.html'], 3],
    ['bu', 'ht', 'loops', 'h', 'Maintenance before breakdown. Care for people the way a good team cares for its systems, before the crisis.', ['Check-ins', '/check-ins.html'], 2],

    ['ph', 'bs', 'loops', 'a', 'Aristotle thought we become what we repeatedly do. Character, like a habit, is built by small acts, not by one big decision.', ['Small and often', '/book/chapter-1.html'], 4],
    ['ph', 'nb', 'state', 'a', 'If shutting down or getting revved up is a body doing its job, it isn’t a character flaw. That changes what blame means.', ['Pillar II', '/five-pillars.html#fix-the-setup'], 2],
    ['ph', 'ht', 'balance', 'a', 'A setup can be sustainable without being good for the people in it. Asking what makes the whole person well is a different question from “does it work?”', ['Chapter II: what the number is not', '/book/chapter-2-in-depth.html'], 2],
    ['ph', 'ar', 'state', 'a', 'What we take in through the senses shapes what we believe is true. Two people in one room may not be perceiving the same room.', ['The Perspective Shifter', '/perspective-shifter.html'], 4],
    ['bs', 'ht', 'loops', 'a', 'The smallest repeated acts, a breath, a daily check-in, a weekly look back, are rhythms, and rhythm is how a body and a relationship stay in tune.', ['Chapter V: the rhythms', '/book/chapter-5.html'], 3],
    ['ec', 'ht', 'balance', 'a', 'Rest isn’t time lost. It keeps the capacity that everything else spends, so skipping it is borrowing against next week.', ['Wavelength: what fills you up', '/wavelength.html'], 3],
    ['ec', 'ar', 'incent', 'a', 'A room, like a market, carries costs nobody pays out loud. A rushed, noisy setting quietly taxes every conversation in it.', ['Chapter IV: the setting', '/book/chapter-4-in-depth.html'], 5],
    ['bu', 'ar', 'state', 'a', 'Good workplaces are designed so the setting helps people do their best. A home can be too: a quiet corner for hard talks is a design choice.', ['Check-ins: a good moment', '/check-ins.html'], 2],
    ['fi', 'ht', 'balance', 'a', 'A solvency read says whether an arrangement can last, never whether it’s worthwhile. Holistic care asks the other question: what makes the whole person well.', ['Chapter II', '/book/chapter-2.html'], 2],
    ['fi', 'ar', 'balance', 'a', 'Changing the setting costs almost nothing and pays back on every conversation held there: the cheapest investment in the whole program.', ['Chapter IV: where and when to talk', '/book/chapter-4-in-depth.html'], 3],
    // the four newest fields: the art of debating (db), politics (po), music (mu) and the healing power of laughter (la)
    ['db', 'ps', 'signal', 'o', 'Winning an argument and being understood are different goals. Debate trains the first; psychology reminds you the second is why you started talking.', ['Say it so it lands (WP-09)', '/workpapers/wp-09-tone-filter.html'], 4],
    ['db', 'ph', 'signal', 'o', 'Debate grew out of philosophy: a claim is only tested when someone who disagrees gets to push on it. Telling what you know from what you assume is the first move of both.', ['The Conversation Reader', '/conversation-reader.html'], 4],
    ['db', 'po', 'owner', 'o', 'Politics is debate with a decision attached: someone has to hear every side, then decide. A home needs a small version, with each voice heard first and one agreement at the end.', ['Check-ins', '/check-ins.html'], 2],
    ['db', 'bs', 'loops', 'h', 'Arguments run on habit: the same lines, the same escalation. The best debate trick, restating their point before you answer, only works once it’s practiced enough to be automatic.', ['The 90-second check-in (WP-13)', '/workpapers/wp-13-pll-protocol.html'], 4],
    ['db', 'ec', 'incent', 'h', 'In a debate the reward goes to whoever wins the room. At home the quiet reward for “winning” is the other person giving up, which costs far more than it saves.', ['Chapter IV: two kinds of fair', '/book/chapter-4.html'], 5],
    ['db', 'fi', 'balance', 'h', 'A good argument keeps honest books: claims on one side, evidence on the other, and no entry without support. “You always…” is a debit with no receipt.', ['The Conversation Reader', '/conversation-reader.html'], 4],
    ['db', 'bu', 'owner', 'h', 'Good meetings have a chair, an agenda and a decision at the end. A good hard talk at home needs the same: one topic, a turn each, and a named next step.', ['Check-ins', '/check-ins.html'], 2],
    ['db', 'nb', 'state', 'h', 'Reasoning well needs the thinking part of the brain, and it goes quiet on high alert. The best debate skill is knowing when your body can’t take part yet.', ['The Calm-Down Kit (WP-11)', '/wp-11.html'], 3],
    ['db', 'ht', 'state', 'a', 'Holistic care treats the whole person, and so does a good debate partner. The person across from you is tired, hungry or hurt as well as holding a position.', ['The Perspective Shifter', '/perspective-shifter.html'], 3],
    ['db', 'ar', 'state', 'h', 'Where an argument happens shapes how it goes. A crowded kitchen at dinnertime argues differently from a quiet walk.', ['Check-ins: a good moment', '/check-ins.html'], 3],
    ['db', 'mu', 'signal', 'h', 'Tone carries more than the words. The same sentence has a pace and a pitch, and spoken softly and slowly it lands differently than spoken fast and flat.', ['The Signal Translator', '/signal-translator.html'], 4],
    ['db', 'la', 'signal', 'h', 'Humor in a disagreement can open a door or slam one. Laughing with someone shows you’re on the same side; laughing at them shuts the talk down.', ['Say it so it lands (WP-09)', '/workpapers/wp-09-tone-filter.html'], 4],

    ['po', 'ps', 'signal', 'h', 'Groups hear what they fear. How a message is framed changes how it’s received, and that’s as true at a dinner table as in a parliament.', ['The Signal Translator', '/signal-translator.html'], 4],
    ['po', 'ph', 'owner', 'o', 'Politics asks philosophy’s questions with real stakes: what is fair, who decides, and who is owed what.', ['Chapter IV: two kinds of fair', '/book/chapter-4.html'], 2],
    ['po', 'bs', 'incent', 'o', 'Good policy makes the right thing the easy thing: defaults, small rewards, less friction. Good house rules work the same way.', ['Pillar V', '/five-pillars.html#quiet-incentives'], 5],
    ['po', 'ec', 'incent', 'o', 'Politics is largely a contest over who gets limited resources; economics counts them. In a home the resources are time, money and attention.', ['The Lemonade Stand', '/lemonade-stand.html'], 1],
    ['po', 'fi', 'balance', 'h', 'A budget is a political document: it shows what a group values. A week’s chores and hours are a household budget, and they show the same thing.', ['Who did what (WP-01)', '/workpapers/wp-01.html'], 1],
    ['po', 'bu', 'owner', 'o', 'Governance means who is accountable for what, how decisions get made, and how to change them. “One owner per job” is governance for a household.', ['One owner per job (WP-03)', '/workpapers/wp-03-raci-treaty.html'], 2],
    ['po', 'nb', 'state', 'a', 'The nervous system treats a threat to “our side” as a threat to the self. Calm bodies compromise more, which is why settling comes before the vote.', ['The Calm-Down Kit (WP-11)', '/wp-11.html'], 3],
    ['po', 'ht', 'balance', 'a', 'Public health and holistic care agree that wellbeing is shaped by the conditions around a person, not only by their choices. Fix the conditions.', ['Pillar II', '/five-pillars.html#fix-the-setup'], 2],
    ['po', 'ar', 'state', 'a', 'Politics knows the setting is a message: where the table is, how the room is laid out, who sits where. A home can use the same craft for hard talks.', ['Check-ins: a good moment', '/check-ins.html'], 3],
    ['po', 'mu', 'loops', 'a', 'Anthems and marching songs show how music binds a group. A shared beat is how a crowd starts to feel like one body.', ['The theme song music video', '/frequency-buddies-music-video.html'], 4],
    ['po', 'la', 'signal', 'a', 'Groups have long used jokes and satire to say what can’t be said straight about power. At home, a light touch lets a sore topic be raised, if both people are in on the joke.', ['Check-ins', '/check-ins.html'], 4],

    ['mu', 'ps', 'state', 'o', 'Music changes mood faster than words, and people use it on purpose: to pump up, to wind down, or to feel less alone.', ['Drift: calm visualizer', '/calm-visualizer.html'], 3],
    ['mu', 'nb', 'state', 'o', 'Rhythm and sound reach the nervous system directly. Slow tempos tend to settle the body and fast ones lift it.', ['Brain Breakers', '/soundscapes.html'], 3],
    ['mu', 'ph', 'balance', 'a', 'Thinkers since Pythagoras have asked why sound moves us. Harmony is a picture of fairness: different parts, each with room, in one piece.', ['Echoes of Gold', '/echoes-of-gold.html'], 4],
    ['mu', 'bs', 'loops', 'o', 'A song is a loop: a pattern that repeats with small changes. A habit tied to a tune or a time of day is easier to keep.', ['The 90-second check-in (WP-13)', '/workpapers/wp-13-pll-protocol.html'], 4],
    ['mu', 'ec', 'capacity', 'a', 'Attention is what a song and a market both compete for, and it runs out. A noisy setting taxes every conversation held in it.', ['Brain Breakers', '/soundscapes.html'], 5],
    ['mu', 'fi', 'balance', 'a', 'In music a rest is written into the score, and silence counts as much as sound. In a household the quiet work needs writing down too.', ['The Preface: unbilled debt', '/book/preface.html'], 1],
    ['mu', 'bu', 'owner', 'h', 'An orchestra works because every player has a part and someone sets the tempo: one owner per job, and one shared beat.', ['One owner per job (WP-03)', '/workpapers/wp-03-raci-treaty.html'], 2],
    ['mu', 'ht', 'state', 'o', 'Music therapy is a recognized form of care: singing, drumming and listening help people settle, feel connected and find words.', ['The Calm-Down Kit (WP-11)', '/wp-11.html'], 3],
    ['mu', 'ar', 'state', 'o', 'Sound and scent both set the mood of a room before anyone speaks. A playlist in the kitchen does what a candle does.', ['Brain Breakers', '/soundscapes.html'], 3],
    ['mu', 'la', 'state', 'o', 'Laughter is rhythm too: breath, bounce and sound, in time with other people. A shared laugh and a shared song both say “we’re in step.”', ['Pause & Play', '/pause-and-play.html'], 3],

    ['la', 'ps', 'state', 'o', 'A shared laugh tells the body “we’re safe.” Research on couples suggests that gentle humor during a disagreement can help calm it down.', ['Turning Toward', '/turning-toward.html'], 3],
    ['la', 'nb', 'state', 'o', 'Laughing is linked with looser muscles and lower stress afterward. It’s a quick way to let the body know the alarm can stand down.', ['The Calm-Down Kit (WP-11)', '/wp-11.html'], 3],
    ['la', 'ph', 'signal', 'a', 'Thinkers have long said humor spots what’s out of place: the gap between how things are and how they should be. A good joke names the gap without blaming anyone.', ['The Perspective Shifter', '/perspective-shifter.html'], 4],
    ['la', 'bs', 'loops', 'h', 'A small, shared bit of silliness gets repeated and sticks. The in-joke is a habit that keeps closeness going.', ['Turning Toward', '/turning-toward.html'], 4],
    ['la', 'ec', 'capacity', 'h', 'Joy refills what effort spends. A few minutes of play is a cheap way to top up the battery everything else draws on.', ['Pause & Play', '/pause-and-play.html'], 3],
    ['la', 'fi', 'balance', 'a', 'Goodwill is a reserve, and shared laughs are deposits that don’t appear on any sheet but make the withdrawals of a hard week survivable.', ['Turning Toward', '/turning-toward.html'], 1],
    ['la', 'bu', 'loops', 'h', 'Teams that can laugh together tend to find it easier to say hard things early, while they’re still small.', ['Check-ins', '/check-ins.html'], 2],
    ['la', 'ht', 'state', 'o', 'Laughter yoga and therapeutic humor are part of the holistic toolkit: a whole-body reset that costs nothing.', ['The Night Garden', '/night-garden.html'], 3],
    ['la', 'ar', 'state', 'h', 'A warm, softly lit, relaxed room makes laughter easier. The senses set the mood for play as much as for calm.', ['Brain Breakers', '/soundscapes.html'], 3]
  ],
  // each field leads into the next, and the last leads back to the first
  chain: [
    ['nb', 'ps', 'The body’s state comes first. It shapes what you feel, and how every word you hear lands.', 3],
    ['ps', 'ph', 'Once you know feelings color what you hear, you have to ask what you actually know, and what you’re only assuming.', 4],
    ['ph', 'db', 'Knowing what’s fair isn’t enough. You have to be able to say it, and to test it with someone who disagrees, without it turning into a fight.', 4],
    ['db', 'po', 'Debate between two people becomes politics when a group has to decide: who gets a say, who chooses, and how a disagreement ends without a loser.', 2],
    ['po', 'bs', 'Fair rules agreed on aren’t enough. Good intentions fade under stress, so you need habits and structures that work on bad days.', 2],
    ['bs', 'ec', 'Structures run on incentives. People follow what the setup rewards, and every choice spends a limited supply of time and attention.', 5],
    ['ec', 'fi', 'If time and attention are limited, they can be counted: a ledger of who spends what, the unseen work included.', 1],
    ['fi', 'bu', 'Counting isn’t enough on its own. Each regular job needs an owner and a simple check, or the books drift again.', 2],
    ['bu', 'ht', 'Systems are run by people. A team, or a home, only works if the people in it are cared for, not just managed.', 2],
    ['ht', 'la', 'Caring for the whole person includes joy. A shared laugh is a reset for the body and a repair for the relationship, and it costs nothing.', 3],
    ['la', 'mu', 'Laughter and music do the same quiet work: they bring people into step, with a shared breath and a shared beat.', 3],
    ['mu', 'ar', 'Sound is one of the senses that sets the mood of a room, along with light and scent, and the setting is part of every conversation.', 3],
    ['ar', 'nb', 'And the senses feed straight back into the nervous system, setting the body’s state, which is where the chain began.', 3]
  ],

  // the deepest tier: connections that run through three or more fields at once. Each has a title, the fields it
  // runs through (in order), the roots it rests on, what it means, what to do with it, and a tool. The first one,
  // a single hard conversation, has a step for every field; the polymath page draws it as a flowchart.
  deep: [
    {
      id: 'hard-talk', title: 'One hard conversation, all thirteen fields at once',
      fields: ['nb', 'ps', 'ph', 'db', 'po', 'bs', 'ec', 'fi', 'bu', 'ht', 'la', 'mu', 'ar'], roots: ['state', 'signal', 'capacity', 'balance', 'owner', 'loops'],
      text: 'A single tense talk about the dishes runs through every field in the program, one after another, in a few seconds.',
      steps: [
        ['nb', 'Your body reacts first. A tight chest or a racing heart sets the volume before anyone speaks.'],
        ['ps', 'That state becomes a filter. A neutral sentence can sound like criticism when you’re already on edge.'],
        ['ph', 'So ask what you actually know. “The dishes are still there” is a fact. “They don’t care” is a guess.'],
        ['db', 'How you argue matters more than who wins. Restating what they said before you answer is the one debate move worth borrowing, and the point is to understand, not to score.'],
        ['po', 'Who gets a say, and who decides? A talk where one person always makes the call is a vote the other never got to cast.'],
        ['bs', 'Under stress, habits take over. A small, practiced pause works better than a promise to stay calm.'],
        ['ec', 'Attention is limited. A talk squeezed in at 11 p.m. is paid for out of an almost empty account.'],
        ['fi', 'Underneath sits a ledger: the unseen work each person has carried, and how much goodwill is left in reserve.'],
        ['bu', 'Much of the heat is about a job with no clear owner. Naming one owner turns blame into a plan.'],
        ['ht', 'Body first: a glass of water, a short walk or a few slow breaths, then the words.'],
        ['la', 'If it fits, a small laugh together, never at them, tells the body the danger has passed. It’s a reset, and it’s a repair.'],
        ['mu', 'And the tone. Pace, volume and tempo carry more than the words, and slowing down is a beat you can both follow.'],
        ['ar', 'And the setting. For some people, a quieter room or a familiar scent is a quick cue to slow down.']
      ],
      decide: 'Then you decide: talk now, or name a better time. Either way, you’re choosing with the whole picture.',
      tool: ['Check-ins: pick a good moment', '/check-ins.html']
    },
    {
      id: 'unowned-job', title: 'The job nobody owns',
      fields: ['ps', 'bs', 'ec', 'fi', 'bu', 'ph'], roots: ['owner', 'incent', 'balance'],
      text: 'Each of us remembers our own effort best (psychology). A job with no owner drifts to whoever notices first (behavioral science). Noticing spends real attention (economics), so a debt builds up that nobody writes down (finance). Business calls it a missing owner. Philosophy calls it unfair. They’re all describing the same unwritten job.',
      tool: ['One owner per job (WP-03)', '/workpapers/wp-03-raci-treaty.html']
    },
    {
      id: 'tired-week', title: 'The tired week',
      fields: ['nb', 'ht', 'bs', 'ec', 'fi', 'bu'], roots: ['capacity', 'balance', 'loops'],
      text: 'A worn-out body has less to give (neurobiology), so rest has to match effort (holistic therapies). Habits have to be small enough to survive that week (behavioral science). A household running at full stretch has no safety margin (economics) and no reserve for a surprise (finance), and a team in the same state drops things (business). One tired week shows that capacity is a single root under six fields.',
      tool: ['The Battery & Stress Meter (WP-02)', '/workpapers/wp-02-battery-stress-meter.html']
    },
    {
      id: 'the-room', title: 'The room does some of the talking',
      fields: ['ar', 'nb', 'ps', 'ph', 'ec', 'bu'], roots: ['state', 'incent'],
      text: 'Noise, light and smell reach the senses first (aromatherapy and the senses) and set the body’s alert level (neurobiology). That changes what a person can take in (psychology), and even what they believe happened (philosophy). A rushed, noisy room quietly taxes every conversation in it (economics), and good workplaces are designed to avoid that (business). Choosing the place is part of the conversation.',
      tool: ['Brain Breakers', '/soundscapes.html']
    },
    {
      id: 'house-rules', title: 'Making a house rule',
      fields: ['ph', 'db', 'po', 'bu', 'bs'], roots: ['owner', 'incent', 'signal'],
      text: 'Agreeing on a rule is politics at the smallest scale. Philosophy asks what is fair. Debate says each side should be able to state the other’s case before answering. Politics is how a group decides, and who gets a say. Business gives the rule an owner, and behavioral science makes it easy enough to follow on a bad day.',
      tool: ['One owner per job (WP-03)', '/workpapers/wp-03-raci-treaty.html']
    },
    {
      id: 'the-mood', title: 'The mood of the room',
      fields: ['mu', 'la', 'ar', 'nb', 'ht'], roots: ['state', 'loops'],
      text: 'Sound, a shared laugh and the setting reach the body before any words do. Music sets the tempo (music), a laugh lets the body stand down (laughter), and light, scent and noise set the mood of the room (aromatherapy and the senses). Neurobiology explains why it works, and holistic care says to start there.',
      tool: ['Drift: calm visualizer', '/calm-visualizer.html']
    }
  ]
};
