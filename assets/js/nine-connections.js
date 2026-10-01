/* nine-connections.js — how Christian's nine fields connect: one connection for every one of the 36 pairs, each
   with the root it shares, how obvious it is, what it means and where it shows up in the program; and the chain,
   where each field leads logically into the next, all the way round. Used by the polymath page; Professor Puddles
   learns the same list (tools/chat/build_kb.py reads this file). Edit here, and both stay in step. */
window.TOL_NINE = {
  fields: [
    ['nb', 'Neurobiology'], ['ps', 'Psychology'], ['ph', 'Philosophy'], ['bs', 'Behavioral science'], ['ec', 'Economics'],
    ['fi', 'Finance'], ['bu', 'Business'], ['ht', 'Holistic therapies'], ['ar', 'Aromatherapy']
  ],
  roots: { balance: 'balance', signal: 'signal and noise', loops: 'feedback loops', capacity: 'limited capacity', owner: 'ownership and structure', incent: 'quiet incentives', state: 'state and setting' },
  tiers: { o: 'Obvious', h: 'Hidden', a: 'Abstract' },
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
    ['ht', 'ar', 'state', 'o', 'Both start with the body and the senses, not the argument.', ['The Soundscape Catalog', '/soundscapes.html'], 3],

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
    ['ec', 'ht', 'balance', 'a', 'Rest isn’t time lost. It keeps the capacity that everything else spends, so skipping it is borrowing against next week.', ['Your Heartprint: what fills your battery', '/heartprint.html'], 3],
    ['ec', 'ar', 'incent', 'a', 'A room, like a market, carries costs nobody pays out loud. A rushed, noisy setting quietly taxes every conversation in it.', ['Chapter IV: the setting', '/book/chapter-4-in-depth.html'], 5],
    ['bu', 'ar', 'state', 'a', 'Good workplaces are designed so the setting helps people do their best. A home can be too: a quiet corner for hard talks is a design choice.', ['Check-ins: a good moment', '/check-ins.html'], 2],
    ['fi', 'ht', 'balance', 'a', 'A solvency read says whether an arrangement can last, never whether it’s worthwhile. Holistic care asks the other question: what makes the whole person well.', ['Chapter II', '/book/chapter-2.html'], 2],
    ['fi', 'ar', 'balance', 'a', 'Changing the setting costs almost nothing and pays back on every conversation held there: the cheapest investment in the whole program.', ['Chapter IV: where and when to talk', '/book/chapter-4-in-depth.html'], 3]
  ],
  // each field leads into the next, and the last leads back to the first
  chain: [
    ['nb', 'ps', 'The body’s state comes first. It shapes what you feel, and how every word you hear lands.', 3],
    ['ps', 'ph', 'Once you know feelings color what you hear, you have to ask what you actually know, and what you’re only assuming.', 4],
    ['ph', 'bs', 'Knowing what’s fair isn’t enough. Good intentions fade under stress, so you need habits and structures that work on bad days.', 2],
    ['bs', 'ec', 'Structures run on incentives. People follow what the setup rewards, and every choice spends a limited supply of time and attention.', 5],
    ['ec', 'fi', 'If time and attention are limited, they can be counted: a ledger of who spends what, the unseen work included.', 1],
    ['fi', 'bu', 'Counting isn’t enough on its own. Each regular job needs an owner and a simple check, or the books drift again.', 2],
    ['bu', 'ht', 'Systems are run by people. A team, or a home, only works if the people in it are cared for, not just managed.', 2],
    ['ht', 'ar', 'Caring for the whole person starts with the body and the senses: rest, calm and the setting you’re in.', 3],
    ['ar', 'nb', 'And the senses feed straight back into the nervous system, setting the body’s state, which is where the chain began.', 3]
  ]
};
