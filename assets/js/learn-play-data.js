/* learn-play-data.js — the "Check yourself" moments, learning trails and "Explain it like I'm new"
   notes for learn-play.js. One entry per page path (the simple and full versions are separate).
   Every line is written by hand from that page's own text.

   Page entry:
     t   title shown in the trail and on the quest map
     g   quest-map region: 'harbor' (start), or 'p1'..'p5' (the pillar it mostly teaches)
     n   suggested next page (another path in this file)
     m   the moments, in page order. Each has:
           at  a few words from the heading of the section it follows (matched loosely)
           k   kind: quiz | sort | pillar | match | flip | wyr | gap | slider
           q   the question or prompt
         quiz:   o  [[text, correct?, what we say back], ...]
         sort:   bins [labels], items [[text, bin index, optional note], ...]
         pillar: items [[text, pillar number 1-5, optional note], ...]
         match:  pairs [[term, plain meaning], ...]
         flip:   cards [[front, what it means, try this], ...]
         wyr:    o [[choice, what it leads to], ...]  ("Would you rather")
         gap:    s sentence with ___, o [choices], a index of the book's word, say
         slider: label, min, max, step, start, fmt, zones [[up to, name, what happens, emoji], ...], need
     e   "Explain it like I'm new" notes on the fullest paragraphs:
           f  a few words from the paragraph, s  one plain sentence, x  a tiny example
   Nothing here is sent anywhere. */
window.TOLLearnPlayData = {
  pages: {

    /* ------------------------------------------------------------ the harbor: start here */
    '/five-pillars.html': {
      t: 'The Five Pillars', g: 'harbor', n: '/start-here.html',
      m: [
        { at: 'See the whole load', k: 'quiz', q: 'You remember the dentist, the birthday card and the gas bill. Why does none of it get seen?',
          o: [['None of it looks like “doing the dishes,” so nobody counts it', true, 'Yes! Remembering and planning are real work. They just hide. One week written down changes that.'],
              ['Because it only takes a few seconds', false, 'Not quite. The page says it goes unseen because it doesn’t look like a task, not because it’s small.'],
              ['Because nobody else cares', false, 'Not quite. Nobody is the villain. People usually just can’t see it yet.']] },
        { at: 'Fix the setup, not the person', k: 'wyr', q: 'The trash gets missed every week. Would you rather…',
          o: [['Say “you never remember”', 'That starts a round about someone’s character. The trash still has no owner, so next week looks the same.'],
              ['Give the trash one owner and a Tuesday reminder', 'That’s Pillar II: the setup changes, nobody gets blamed, and the trash start going out.']] },
        { at: 'Read your state first', k: 'slider', q: 'Drag your energy level and see how “What’s for dinner?” lands.', label: 'Energy left in your battery',
          min: 0, max: 100, step: 5, start: 85, fmt: 'pct',
          zones: [[30, 'Running on empty', '“What’s for dinner?” sounds like criticism. Try “give me twenty minutes,” then come back.', '🪫'],
                  [65, 'Revved up or tired', 'It sounds a bit pointed. A slow breath helps you hear it as a question.', '⚡'],
                  [100, 'Calm and charged', 'It lands as just a question. Easy to answer, maybe even fun.', '🔋']] },
        { at: 'Tune how you send and receive', k: 'quiz', q: 'You text “ok.” and mean “fine, thanks.” Your sister reads “I’m upset with you.” Who got it wrong?',
          o: [['Nobody. You’re tuned to different stations', true, 'Exactly. A mismatch is a tuning problem, not a moral failing, and you can learn each other’s station.'],
              ['You, for using a period', false, 'Not quite. The page says neither of you did anything wrong.'],
              ['Your sister, for reading too much into it', false, 'Not quite. Nobody is wrong. You can each learn how the other hears things.']] },
        { at: 'Notice the quiet incentives', k: 'gap', q: 'Fill the gap with the page’s own word.',
          s: 'Whoever notices the milk is low first ends up buying it, every time. Nobody chose that. It ___.', o: ['drifted', 'was planned', 'was a test'], a: 0,
          say: 'Yes, it drifted. A named owner and a specific thank-you stop the drift.' },
        { at: 'How they fit together', k: 'pillar', q: 'Each example shows something someone does. Which pillar is it using?',
          items: [['You both jot down who did what for one week, so all the work is on paper.', 1, 'Yes, Pillar I, See the whole load. Writing it down lets you both see the work that usually goes unnoticed.'],
                  ['Instead of arguing about the school forms every week, you agree that one person always handles them.', 2, 'Yes, Pillar II, Fix the setup. Giving the job one owner changes the arrangement, so nobody needs reminding or blaming.'],
                  ['Before a hard talk, you say “give me twenty minutes” because you’re worn out.', 3, 'Yes, Pillar III, Read your state first. You noticed you were running low and waited until you could really listen.'],
                  ['Instead of “you always forget,” you say one fact and one ask: “The trash didn’t go out. Can you take them tonight?”', 4, 'Yes, Pillar IV, Tune how you send and receive. One fact and one ask is much easier to hear than “you always.”'],
                  ['You notice a chore always lands on whoever spots it first, even though nobody decided that.', 5, 'Yes, Pillar V, Notice the quiet incentives. Nobody chose it. The job just keeps drifting to the person who notices.']] }
      ]
    },

    '/five-pillars-in-depth.html': {
      t: 'The Five Pillars (full)', g: 'harbor', n: '/start-here.html',
      m: [
        { at: 'See the whole load', k: 'quiz', q: 'A score says who is winning. What does a ledger say?',
          o: [['What is there', true, 'Yes. A ledger gives a picture you both agree on, not a verdict.'],
              ['Who is winning', false, 'Not quite. That’s a score. A ledger just says what is there.'],
              ['Who owes whom', false, 'Not quite. Looking back at who owes whom is scorekeeping. A ledger shows what is there, so you can plan.']] },
        { at: 'Fix the setup, not the person', k: 'flip', q: 'Tap each common mix-up to flip it.',
          cards: [['“So nobody is responsible.”', 'The opposite. A good setup makes responsibility clear: one named owner. It removes blame, not accountability.', 'Name one owner for one job this week.'],
                  ['“Fixing the setup means a big overhaul.”', 'Usually it means one small change you keep: a reminder, a handoff or a single owner.', 'Pick the smallest change that would help.'],
                  ['“Pausing means avoiding.”', 'A pause has a time to come back. Without one, it feels like a door closing.', 'Try: “Can we pick this up at eight?”']] },
        { at: 'Notice the quiet incentives', k: 'quiz', q: 'A roommate buys the toilet paper once, then again. Now it’s “their job.” What turns the drift back into a choice?',
          o: [['A named owner, a kind no, or a rotation', true, 'Yes! Any of those gives the choice back.'],
              ['Buying extra, just to be safe', false, 'Not quite. Doing more deepens the drift. Naming it gives the choice back.'],
              ['Deciding they’re taking advantage', false, 'Not quite. Drift happens between kind people because nobody chose. No villain needed.']] },
        { at: 'How they fit together', k: 'pillar', q: 'Each example shows something someone does. Which pillar is it using?',
          items: [['Two coworkers each write down a week of the follow-ups and notes they handle.', 1, 'Yes, Pillar I, See the whole load. The small tasks nobody counts are now in plain view.'],
                  ['Instead of both half-doing the groceries, one person owns the list and the other owns the shopping.', 2, 'Yes, Pillar II, Fix the setup. Clear owners fix the gap, and nobody has to be the bad guy.'],
                  ['A friend texts back “fine.” You’re exhausted, it reads as annoyed, so you wait before replying.', 3, 'Yes, Pillar III, Read your state first. When your battery is empty, short replies feel colder than they are.'],
                  ['Before jumping in with advice, you ask, “Do you want ideas, or do you just want me to listen?”', 4, 'Yes, Pillar IV, Tune how you send and receive. You checked what kind of reply they want before sending one.'],
                  ['A sibling ended up driving Mom to every appointment. It started with one “I’ll just do it.”', 5, 'Yes, Pillar V, Notice the quiet incentives. One kind offer quietly turned into a permanent job.']] },
        { at: 'How they lean on each other', k: 'match', q: 'Match each pairing to what it means.',
          pairs: [['I → II', 'You can’t redesign what you can’t see'], ['II ↔ V', 'A named owner removes the quiet pull'],
                  ['III → IV', 'State comes before signal'], ['V → I', 'Thanks keeps the unseen work visible']] },
        { at: 'Inside you, then between you', k: 'quiz', q: 'For caregivers, which pillars lead?',
          o: [['III and I: your battery and the load you carry', true, 'Yes! Then Pillar II shares the care out, with one owner per part.'],
              ['II and V', false, 'Not quite. II and V lead for coworkers and teams.'],
              ['IV on its own', false, 'Not quite. IV often leads for families. Caregivers start with III and I.']] }
      ],
      e: [
        { f: 'A ledger does one thing well', s: 'A ledger is just a shared list of what really happened, with no judging.', x: 'Two roommates each list a week of chores, then read both lists together.' },
        { f: 'Systems thinking looks at how a result is produced', s: 'When the same problem keeps happening, look at how things are set up before looking at the people.', x: 'The recycling keeps getting forgotten because the trash can lives in the garage, not because anyone is careless.' },
        { f: 'Signal theory describes what happens', s: 'Two people running at slightly different speeds make “static,” even when nobody did anything wrong.', x: 'One of you wants to decide tonight, the other needs until Sunday. Agreeing on Sunday clears it.' },
        { f: 'Behavioral economics studies how defaults', s: 'Small defaults quietly decide things for us, like whoever notices a job first keeping it forever.', x: 'You bought the coffee filters once. Now everyone assumes it’s your job.' }
      ]
    },

    '/start-here.html': {
      t: 'Start here', g: 'harbor', n: '/how-it-works.html',
      m: [
        { at: 'Four questions', k: 'sort', q: 'Which of the four questions does this answer?', bins: ['What happened?', 'What state?', 'Who was responsible?', 'What was meant?'],
          items: [['“I did the dishes four nights this week.”', 0], ['“I was running on empty before you even spoke.”', 1],
                  ['“The trash is mine on the job list.”', 2], ['“I meant it as a reminder, not a complaint.”', 3]] },
        { at: 'How it works, in order', k: 'quiz', q: 'One of you is running hot. Which step comes first?',
          o: [['Regulate first, with the Calm-Down Kit', true, 'Yes! Nobody solves a relationship problem while overloaded. Calm first, then owners and words.'],
              ['Sort out who owns what, one owner per job', false, 'Not quite. The Calm-Down Kit comes before agreeing owners and choosing words.'],
              ['Check whether the load can last', false, 'Not quite. Measuring comes once there are numbers. When someone is running hot, calming down comes first.']] },
        { at: 'How it works, in order', k: 'match', q: 'Match each worksheet to the question it answers.',
          pairs: [['Who did what (WP-01)', 'What is actually happening?'], ['How much are you carrying? (WP-02)', 'What is each of us bringing?'],
                  ['One owner per job (WP-03)', 'Who is actually responsible for what?'], ['Say it so it lands (WP-09)', 'How do I say what I actually mean?']] },
        { at: 'What this is', k: 'sort', q: 'Is it, or isn’t it?', bins: ['It is', 'It isn’t'],
          items: [['A shared record of the work of a home', 0], ['A compatibility test or relationship score', 1], ['A daily habit for catching small problems early', 0],
                  ['A way to prove who’s right', 1], ['A way to find problems in the setup, not in a person', 0]] }
      ]
    },

    '/how-it-works.html': {
      t: 'How it works', g: 'harbor', n: '/know-yourself.html',
      m: [
        { at: 'wiring is information', k: 'quiz', q: 'According to this page, your wiring is…',
          o: [['Information, not a flaw', true, 'Yes! Knowing yours helps you explain it to the people around you.'],
              ['A flaw to fix', false, 'Not quite. Wiring is information, not a flaw.'],
              ['The same for everyone', false, 'Not quite. Every brain handles stress, noise and conversation differently. Some reset in minutes, others need hours.']] },
        { at: 'Patterns show up', k: 'flip', q: 'Tap to flip: what it means, and something to try.',
          cards: [['Your life situation', 'A new baby, a move, an illness or grief can shrink what you can carry.', 'Go easier on yourself in the season you’re in.'],
                  ['Your wiring', 'How your brain handles stress, noise and conversation.', 'Notice whether you reset in minutes or in hours.'],
                  ['Your patterns', 'What shows up after a few weeks of writing things down.', 'Look for the time of day you get snappy.']] },
        { at: 'The static lives between two people', k: 'gap', q: 'Fill the gap with the page’s own words.',
          s: 'You say “in a minute,” meaning “when I finish this.” They hear “___.”', o: ['sixty seconds', 'never', 'tomorrow'], a: 0,
          say: 'Yes! Nobody did anything wrong. Saying your signal out loud helps close the gap.' },
        { at: 'few entries', k: 'slider', q: 'Slide to add entries. When does a mood become a pattern?', label: 'Entries written down',
          min: 1, max: 12, step: 1, start: 1, fmt: 'int',
          zones: [[1, 'One entry', 'One entry is a mood. Interesting, but it might just be today.', '📝'],
                  [6, 'A few entries', 'Something might be showing up. Keep going.', '🗒️'],
                  [11, 'Nearly there', 'You may spot the time of day you get snappy, or the task that always slips.', '📒'],
                  [12, 'Twelve entries', 'Twelve entries are a pattern. Now it’s something you can work on.', '📚']], need: 3 }
      ]
    },

    /* ------------------------------------------------------------ know yourself */
    '/know-yourself.html': {
      t: 'Know your own wiring', g: 'p3', n: '/wired-differently.html',
      m: [
        { at: 'Layer three', k: 'sort', personal: true, q: 'Where would you put it? Only you can sort your own, so there are no wrong answers here, just where many people would put it.',
          bins: ['Wiring (stays)', 'Learned pattern (can soften)', 'Today’s conditions (pass)'],
          items: [['Needs things in writing', 0], ['Snaps when hungry', 2], ['An alarm that goes off early, left over from years ago', 1],
                  ['Short on sleep after a late night', 2], ['A habit of pleasing people', 1]] },
        { at: 'Work on it, work with it', k: 'match', q: 'Match each layer to its move.',
          pairs: [['A learned pattern', 'Work on it, slowly and kindly'], ['Your wiring', 'Work with it: build a setup that suits you'],
                  ['Today’s conditions', 'Work around it: eat first, sleep on it, talk tomorrow']] },
        { at: 'Where is this feeling coming from', k: 'quiz', q: 'You’ve named the feeling (“tight, annoyed, a bit scared”). What’s the next question?',
          o: [['Is this the size of the moment, or does it feel older?', true, 'Yes! Chapter III calls it leftover stress versus this-moment stress.'],
              ['Who caused this?', false, 'Not quite. The self-check looks inward first. Size, then layer, then what it needs.'],
              ['How do I hide it?', false, 'Not quite. The goal is to understand the feeling, not hide it.']] },
        { at: 'Explain yourself', k: 'flip', q: 'Three short scripts. Tap to flip each one.',
          cards: [['For your wiring', '“This is how I’m wired. It won’t change, but here’s what helps.”', 'Share the part that helps them help you.'],
                  ['For an old alarm', '“This is an old alarm. I’m working on it, and here’s what helps in the moment.”', 'You never owe anyone your history.'],
                  ['For today', '“Today’s a low-battery day.”', 'Short and true is plenty.']] },
        { at: 'Help others understand', k: 'wyr', q: 'Someone you care about goes quiet. Would you rather say…',
          o: [['“You’re just anxious.”', 'A label can feel like a verdict, and it argues with their experience. They may go quieter.'],
              ['“What was that like for you?”', 'A question invites them in, and leaves room for the chance that you’re misreading them too.']] },
        { at: 'Meet in the middle', k: 'gap', q: 'Fill the gap with the page’s own word.',
          s: 'When two people’s layers bump into each other, adjust the ___ first. Then agree on what each person’s wiring needs.', o: ['conditions', 'wiring', 'other person'], a: 0,
          say: 'Yes! Conditions first, then wiring, then time and grace for each other’s patterns.' }
      ]
    },

    '/wired-differently.html': {
      t: 'Wired Differently', g: 'p4', n: '/frequency-framework.html',
      m: [
        { at: 'runs both ways', k: 'quiz', q: 'Two differently wired people misread each other. Whose fault is it?',
          o: [['Nobody’s. Each is decoding with a receiver built for their own signal', true, 'Yes! Compare notes instead of looking for who is to blame.'],
              ['The more sensitive person', false, 'Not quite. A mix-up usually runs both ways.'],
              ['Whoever spoke first', false, 'Not quite. It isn’t one person’s fault. Both receivers are doing their best.']] },
        { at: 'find the word', k: 'wyr', q: 'Your friend feels plenty but can’t find the word. Would you rather ask…',
          o: [['“How does that make you feel?”', 'For some people this feels like a quiz with no right answer.'],
              ['“More like tired, or more like annoyed? Space or company?”', 'Asking about the body or actions gives them something easy to hold on to.']] },
        { at: 'relationship changes how words land', k: 'quiz', q: 'Between co-parents, a hint can feel like…',
          o: [['Someone is keeping notes', true, 'Yes. The same hint between friends risks only a little awkwardness.'],
              ['A fun guessing game', false, 'Not quite. Between co-parents, a hint can feel like someone is keeping notes.'],
              ['Nothing at all', false, 'Not quite. The relationship changes how the same words land.']] },
        { at: 'setting matters', k: 'quiz', q: 'One of you needs closeness and the other needs space. What helps?',
          o: [['Say you’re not leaving, name a clock time, and come back', true, 'Yes! Both needs get cared for.'],
              ['Sort it out now, in the group chat', false, 'Not quite. A group chat or a 1 a.m. text can’t hold a hard talk.'],
              ['Whoever needs space just goes', false, 'Not quite. Going without a time can feel like a door closing. Name when you’ll be back.']] },
        { at: 'how you’re built', k: 'gap', q: 'Fill the gap with the page’s own words.',
          s: 'Swap Wiring Cards on ___, not in the middle of an argument.', o: ['an ordinary day', 'your worst day', 'a group chat'], a: 0,
          say: 'Yes! An ordinary day, when you both have room to listen.' }
      ]
    },

    /* ------------------------------------------------------------ guides */
    '/frequency-framework.html': {
      t: 'The Frequency Framework', g: 'p4', n: '/book/chapter-1.html',
      m: [
        { at: 'crossed wires', k: 'quiz', q: 'Two radios tuned close to, but not exactly on, the same station make…',
          o: [['Static', true, 'Yes! Two people each saying something reasonable, at their own pace, can make the same noise.'],
              ['Silence', false, 'Not quite. Nearly matched stations make static, not silence.'],
              ['A lovely duet', false, 'Not quite. Nearly matched stations crackle.']] },
        { at: 'five rhythms', k: 'match', q: 'Match each rhythm to what it’s about.',
          pairs: [['Money', 'When bills and pay land'], ['Rest', 'How long you need to settle after stress'], ['Decisions', 'Minutes or weeks'],
                  ['Talking', 'How often you need to check in'], ['Values', 'How often you ask if you’re headed the same way']] },
        { at: 'lives in the gap', k: 'slider', q: 'Drag the gap between two rest rhythms and listen for the static.', label: 'Gap between your rhythms',
          min: 0, max: 100, step: 5, start: 5, fmt: 'none',
          zones: [[20, 'A tiny gap', 'Barely any static. A quick “give me five” covers it.', '📻'],
                  [60, 'A medium gap', 'Some crackle: one wants to talk now, the other needs a bit of quiet.', '〰️'],
                  [100, 'A big gap', 'Loud static: one feels left alone, the other feels rushed. Nobody is wrong. The rhythms just don’t match.', '⚡']] },
        { at: 'change your speed', k: 'wyr', q: 'Saturday morning. You want to decide about the vacation now. They want a few days. Would you rather…',
          o: [['Push to decide now', 'The gap stays loud, and one of you feels rushed.'],
              ['Agree: “We’ll decide on Sunday.”', 'You both keep your speed and agree when you’ll meet. The static goes.']] }
      ]
    },

    '/check-ins.html': {
      t: 'Check-ins', g: 'p3', n: '/turning-toward.html',
      m: [
        { at: 'One topic', k: 'quiz', q: 'Halfway through, a second topic pops up. Now what?',
          o: [['Jot it down for another day', true, 'Yes! One topic keeps you on the same side.'],
              ['Bring it in while you’re at it', false, 'Not quite. Two topics at once turns into a tangle.'],
              ['Drop the first topic', false, 'Not quite. Stay with the one you agreed on, and jot the new one down.']] },
        { at: 'good moment', k: 'sort', q: 'Good moment, or pick another time?', bins: ['Good moment', 'Pick another time'],
          items: [['A time you both agreed on, phones down', 0], ['10:50 p.m., both running on empty', 1], ['Private, and nobody is hungry', 0], ['Right in the middle of a stressful moment', 1]] },
        { at: 'Hear it back', k: 'gap', q: 'Fill the gap with the page’s own words.',
          s: 'The other person says back what they heard and asks, “___”', o: ['Did I get that?', 'Are you done?', 'Why would you do that?'], a: 0,
          say: 'Yes! Then you swap. Clearing things up waits until you’ve both been heard.' },
        { at: 'A pause is fine', k: 'wyr', q: 'You took a break. Coming back, would you rather say…',
          o: [['“Okay. Round two.”', 'That sounds like a boxing match, and round two tends to start where round one hurt.'],
              ['“I’m back. The topic is still the sink. I am not against you.”', 'A fresh start on the same topic. That’s the check-in way.']] },
        { at: 'rough moment', k: 'flip', q: 'Turn a rough moment into one small habit. Tap each step.',
          cards: [['Say how it affected you', 'Plain, kind words about the impact.', '“When the plan changed last minute, I felt left out.”'],
                  ['Agree one small habit', 'One small thing you can keep doing.', '“Let’s text each other if plans change.”'],
                  ['Name what they do well', 'One thing the other person already does well.', '“You’re great at keeping the calendar.”']] }
      ]
    },

    '/turning-toward.html': {
      t: 'Turning Toward', g: 'p5', n: '/workpapers/wp-13-pll-protocol.html',
      m: [
        { at: 'reach for you', k: 'quiz', q: 'You really can’t look up right now. What still counts as turning toward?',
          o: [['“Give me two minutes, then I want to hear.”', true, 'Yes! A short turn toward still counts, as long as you come back.'],
              ['A quiet “mm” without looking up', false, 'Not quite. “mm” lets the tiny moment slip by. Saying when you can listen keeps the door open.'],
              ['Nothing. It’s too small to matter', false, 'Not quite. These tiny moments add up to most of your time together.']] },
        { at: 'Say thank you, specifically', k: 'wyr', q: 'Would you rather hear…',
          o: [['“Thanks for everything.”', 'Nice! But it doesn’t show what they noticed.'],
              ['“Thanks for handling the school forms. I know that ate your whole lunch break.”', 'This one proves they noticed. Specific thanks is how invisible effort gets seen.']] },
        { at: 'good news', k: 'quiz', q: '“I got the promotion!” Which reply helps you feel closest?',
          o: [['“No way! What did your boss say?”', true, 'Yes! Match their excitement and ask one question. Save the “buts” for another day.'],
              ['“Does it pay more? Isn’t the commute awful?”', false, 'Not quite. Practical worries are usually meant kindly. Save them for tomorrow.'],
              ['“Oh, nice.” and back to your phone', false, 'Not quite. Warm but quiet. Tonight, try one excited question.']] },
        { at: 'outside stress', k: 'gap', q: 'Fill the gap with the page’s own words.',
          s: 'Not sure what they need? Ask: “Do you want ideas, or just ___?”', o: ['an ear', 'a plan', 'a pep talk'], a: 0,
          say: 'Yes! Your job is to listen and be on their side, not to fix it.' },
        { at: 'Remember what you like', k: 'flip', q: 'Three small habits. Tap to flip.',
          cards: [['A small ritual', 'A proper hello and goodbye, a Sunday walk, “best part of your day?”', 'Keep it small enough to survive a bad week.'],
                  ['A new question', '“What are you looking forward to?”', 'Ask something you don’t already know the answer to.'],
                  ['A fondness note', '“You were so patient on the phone today.”', 'Once a week, name one thing you admire and when you saw it.']] }
      ]
    },

    '/turning-toward-in-depth.html': {
      t: 'Turning Toward (full)', g: 'p5', n: '/workpapers/wp-13-pll-protocol.html',
      m: [
        { at: 'Notice bids', k: 'sort', q: 'Toward, away or against?', bins: ['Turning toward', 'Turning away', 'Turning against'],
          items: [['Looking up and asking one question', 0], ['Staying on the phone', 1], ['“Can’t you see I’m busy?”', 2], ['A small “oh nice”', 0], ['Changing the subject', 1]] },
        { at: 'Celebrate good news', k: 'match', q: 'Four ways to answer “I got the job!” Match them up.',
          pairs: [['Active and warm', '“That’s amazing! When do you start?”'], ['Quiet and warm', '“Oh, nice.” (then back to what you were doing)'],
                  ['Active and deflating', '“Does it pay more? Isn’t the commute awful?”'], ['Quiet and deflating', '“Did you remember to pick up milk?”']] },
        { at: 'stress-reducing conversation', k: 'quiz', q: 'In the stress-reducing conversation, the listener’s job is to…',
          o: [['Be on the speaker’s side', true, 'Yes! “That sounds exhausting.” It isn’t the time to defend the boss.'],
              ['Point out that the other side has a point', false, 'Not quite. In this talk, the listener is on the speaker’s side.'],
              ['Solve it, fast', false, 'Not quite. Don’t problem-solve unless asked. Try “Do you want ideas, or do you want me to just listen?”']] },
        { at: 'Small rituals', k: 'gap', q: 'Fill the gap with the page’s own word.',
          s: 'A ritual that only happens when things are good isn’t a ___ yet.', o: ['ritual', 'habit', 'holiday'], a: 0,
          say: 'Yes! Keep rituals small enough to survive a bad week.' },
        { at: 'wired differently', k: 'quiz', q: 'Bids and warmth look different for different wiring. What’s the fix?',
          o: [['Ask each other, and write the answers down', true, 'Yes! The Wiring Card is a good place to keep them.'],
              ['Assume the quiet one doesn’t care', false, 'Not quite. Someone may show care through practical help or shared interests instead of small talk.'],
              ['Stop making bids', false, 'Not quite. Keep reaching. Just learn what counts as a bid for each of you.']] }
      ],
      e: [
        { f: 'A bid is any small reach for attention', s: 'A bid is any little way someone reaches out, hoping you’ll notice.', x: 'Your roommate says “guess what happened today.” That’s a bid.' },
        { f: 'Specific thanks lands far better', s: 'A thank-you that names the exact thing shows you really noticed.', x: '“Thanks for the ride to the airport at 5 a.m.” beats “thanks for everything.”' },
        { f: 'Gottman calls it a', s: 'A “love map” just means knowing what’s going on in someone’s world right now.', x: 'You know your friend is nervous about Thursday, so on Friday you ask how it went.' },
        { f: 'Stress from outside that nobody talks about', s: 'Stress from work or family that never gets talked about tends to come out as grumpiness at home.', x: 'Ten minutes of “that sounds exhausting” about a boss can save an evening of snapping.' }
      ]
    },

    '/relationships.html': {
      t: 'How it fits your relationships', g: 'p1', n: '/five-pillars.html',
      m: [
        { at: 'Start with yourself', k: 'quiz', q: 'A snap at 4 p.m. might be…',
          o: [['Leftover stress, not about them', true, 'Yes! Every relationship runs through your own nervous system first.'],
              ['Proof they’re the problem', false, 'Not quite. A quick check can show it was leftover stress.'],
              ['Nothing worth noticing', false, 'Not quite. It’s worth a quick check of your own state.']] },
        { at: 'Co-parents', k: 'gap', q: 'Fill the gap with the page’s own word.',
          s: 'On exchange day, keep handoffs short: times, bags, school things. Kids are never the ___.', o: ['messengers', 'owners', 'referees'], a: 0,
          say: 'Yes. Short, steady handoffs, and the grown-ups carry the messages.' },
        { at: 'Roommates need', k: 'pillar', q: 'Each example shows something someone does. Which pillar is it using?',
          items: [['Roommates list the week’s chores on one shared note, so everyone sees the same picture.', 1, 'Yes, Pillar I, See the whole load. One shared list means nobody’s work is invisible.'],
                  ['Trash, bills and cleaning each get a named owner, so nobody has to nag.', 2, 'Yes, Pillar II, Fix the setup. A named owner replaces nagging with a clear plan.'],
                  ['Before bringing up a chore, you check whether you’re too drained to talk about it kindly.', 3, 'Yes, Pillar III, Read your state first. Checking your own battery first keeps a small talk small.'],
                  ['You reread your message to the group chat and soften one line so it won’t sound like a complaint.', 4, 'Yes, Pillar IV, Tune how you send and receive. You adjusted the words so they land the way you mean them.'],
                  ['You notice one friend always ends up doing the planning, just because they’re good at it.', 5, 'Yes, Pillar V, Notice the quiet incentives. Being good at something can quietly make it your job forever.']] },
        { at: 'At work', k: 'quiz', q: 'At work, these tools are for…',
          o: [['Peers who agree to use them', true, 'Yes! Among peers who agree, never as a way to rate anyone.'],
              ['Rating someone’s performance', false, 'Not quite. Never use them to rate anyone.'],
              ['Keeping notes on a coworker', false, 'Not quite. They’re for peers who agree, not for keeping notes on anyone.']] },
        { at: 'Caregiving', k: 'quiz', q: 'Running near empty as a caregiver is a sign to…',
          o: [['Get more support', true, 'Yes. It’s a sign to get more support, not a personal failing.'],
              ['Try harder on your own', false, 'Not quite. Give each part of the care one owner, and ask for one specific help.'],
              ['Keep it quiet', false, 'Not quite. Try asking for one specific help, like “Could you do Thursday’s drive?”']] }
      ]
    },

    /* ------------------------------------------------------------ the book, simple */
    '/book/preface.html': {
      t: 'Preface: The work nobody sees', g: 'p1', n: '/book/chapter-1.html',
      m: [
        { at: 'Unseen work quietly adds up', k: 'gap', q: 'Fill the gap with the book’s own word.',
          s: 'Over months, unseen work piles up. The book calls this pile unbilled ___.', o: ['debt', 'laundry', 'homework'], a: 0,
          say: 'Yes! Unbilled debt: work that got done, but nobody saw or thanked.' },
        { at: 'thinking, not doing', k: 'flip', q: 'Before a job gets done, someone has to… Tap each card.',
          cards: [['Notice it', 'Seeing that something needs doing.', 'Spot one thing today that only you noticed.'],
                  ['Remember it', 'Holding dates and details in your head.', 'Write down three things you’re remembering for someone.'],
                  ['Plan it', 'Working out the options and picking one.', 'Count the small decisions you made before dinner.'],
                  ['Check it happened', 'Making sure it actually got done.', 'Notice one follow-up you did that nobody saw.']] },
        { at: 'hasn', k: 'quiz', q: 'When unseen work is done well, what does the other person see?',
          o: [['Nothing much. It looks like things take care of themselves', true, 'Yes! Success looks like nothing, which is why nobody here is the villain.'],
              ['A big pile of effort', false, 'Not quite. Done well, nothing seems to happen.'],
              ['A reason to say thanks every time', false, 'Not quite. You can only thank someone for work you’ve seen, and this work hides.']] },
        { at: 'your own side', k: 'sort', q: 'Keeping score, or sharing the picture?', bins: ['Keeping score', 'Sharing the picture'],
          items: [['Each person writes only their own side', 1], ['Bringing out a private list mid-argument', 0], ['Reading both lists together', 1], ['Proving who does more', 0]] },
        { at: 'any shared life', k: 'quiz', q: 'Common mix-up: “It has to be exactly 50/50.” True?',
          o: [['No. The goal is a split you can both see and agree to', true, 'Yes! Not a perfect half. A split you both see and choose.'],
              ['Yes, to the minute', false, 'Not quite. The goal is a shared picture, not a perfect half.']] }
      ]
    },

    '/book/chapter-1.html': {
      t: 'Chapter I: Why we get out of tune', g: 'p4', n: '/book/chapter-2.html',
      m: [
        { at: 'Nearly in step', k: 'quiz', q: 'When do two radios whistle at each other?',
          o: [['When they’re close but not quite matched', true, 'Yes! That’s why people who know each other well can still clash.'],
              ['When they’re on very different stations', false, 'Not quite. Far-apart stations don’t whistle. Nearly matched ones do.'],
              ['When one radio is broken', false, 'Not quite. Two radios that work fine still crackle if they’re slightly off.']] },
        { at: 'Three things knock', k: 'sort', q: 'Pace, tone or urgency?', bins: ['Pace', 'Tone', 'Urgency'],
          items: [['“When you get a chance” means tonight to one person, next week to the other', 2], ['A simple update heard as a complaint', 1],
                  ['Talking fast and jumping in', 0], ['A long pause heard as a snub', 0]] },
        { at: 'Get back in tune', k: 'gap', q: 'Fill the gap with the book’s own word.',
          s: 'Say it out loud: “I think we’re out of ___.”', o: ['sync', 'milk', 'time'], a: 0,
          say: 'Yes! Then check how wound up you feel, slow down, and only then go back to the topic.' },
        { at: 'clear sentence', k: 'match', q: 'Match each part of the sentence you go back in with.',
          pairs: [['The fact', '“The trash goes out Wednesday morning.”'], ['How you feel', '“I get anxious when it’s late.”'], ['What you’d like', '“Could you do it tonight?”']] },
        { at: 'Small daily check-ins', k: 'slider', q: 'Drag how often you check in, and watch the drift.', label: 'Check-ins a week',
          min: 0, max: 7, step: 1, start: 0, fmt: 'int',
          zones: [[0, 'Never', 'Radios drift. Weeks of tiny drift can turn into one big argument.', '📻'],
                  [4, 'Now and then', 'Better! Some small corrections get made before things pile up.', '🎚️'],
                  [7, 'Every day', 'Ninety seconds a day: tiny corrections before small things become a big argument.', '🎶']] }
      ]
    },

    '/book/chapter-2.html': {
      t: 'Chapter II: Is the split working?', g: 'p1', n: '/book/chapter-3.html',
      m: [
        { at: 'Three things go in', k: 'match', q: 'Match each input to what it measures.',
          pairs: [['Balance', 'How evenly the hours are shared'], ['Ownership', 'Whether each regular job has a clear owner'], ['Stress', 'How full each battery already is']] },
        { at: 'Balance: how the hours split', k: 'slider', q: 'Drag the split of hours and watch the balance score.', label: 'Your share of the hours',
          min: 0, max: 100, step: 5, start: 70, fmt: 'balance',
          zones: [[15, 'Very lopsided', 'One person doing nearly everything scores close to 0.', '⚖️'],
                  [40, 'Leaning one way', 'A 70/30 week scores 0.60.', '⚖️'],
                  [60, 'Close to even', 'An even split scores 1. Rough hours are fine.', '⚖️'],
                  [85, 'Leaning the other way', 'Same score as leaning the first way. It doesn’t matter which person is doing more.', '⚖️'],
                  [100, 'Very lopsided', 'Close to 0 again. Only whether it’s shared matters.', '⚖️']], need: 3 },
        { at: 'Ownership: does each job', k: 'quiz', q: 'You want a better ownership score. Can you delete the jobs nobody owns?',
          o: [['No. Leave them on the list', true, 'Yes! The unowned jobs are the ones that matter most.'],
              ['Yes, it raises the number', false, 'Not quite. It raises the number and changes nothing at home.']] },
        { at: 'One number comes out', k: 'sort', q: 'Which band says this?', bins: ['0.7 or above', '0.4 up to 0.7', 'Below 0.4'],
          items: [['The setup is holding', 0], ['Something is drifting, often who owns what', 1], ['The setup needs a kind rethink', 2]] },
        { at: 'judges the setup', k: 'gap', q: 'Fill the gap with the book’s own word.',
          s: 'The number is where a conversation ___, never how one ends.', o: ['starts', 'wins', 'stops'], a: 0,
          say: 'Yes! It judges the setup, never a person.' }
      ]
    },

    '/book/chapter-3.html': {
      t: 'Chapter III: Full tanks and different angles', g: 'p3', n: '/book/chapter-4.html',
      m: [
        { at: 'left over from earlier', k: 'sort', q: 'This-moment stress, or leftover stress?', bins: ['This-moment stress', 'Leftover stress'],
          items: [['“I’m upset about the dishes.”', 0], ['“I’m exhausted, and the dishes are what I noticed.”', 1], ['A poor night’s sleep, carried into dinner', 1], ['The thing right in front of you', 0]] },
        { at: 'Check your battery', k: 'slider', q: 'Score five things from 0 to 4, add them up and divide by 20. Drag to see what each score says.', label: 'Battery score (what you’re carrying)',
          min: 0, max: 1, step: 0.05, start: 0.2, fmt: 'dec2',
          zones: [[0.3, 'Low load', 'Whatever comes up is probably about the thing itself.', '🌤️'],
                  [0.6, 'Moderate', 'Say it out loud first: “Heads up, I’m carrying more than usual today.”', '⛅'],
                  [1, 'Very full', 'Be gentle with yourself. Anything that doesn’t need deciding in the next hour can wait.', '🌧️']] },
        { at: 'Three everyday states', k: 'match', q: 'Match each state to what it tells you.',
          pairs: [['Calm and connected', 'A good time to talk'], ['Revved up', 'Small things feel urgent'], ['Running on empty', 'Rest first. Big decisions can wait']] },
        { at: 'Both views can be true', k: 'quiz', q: 'Same pile of mail, two pictures. What’s the better question?',
          o: [['“Which angle are you seeing this from?”', true, 'Yes! You can both be right about what you see.'],
              ['“Who’s right?”', false, 'Not quite. You may just be standing at different angles.'],
              ['“Why can’t you see it?”', false, 'Not quite. They can see it, from a different angle.']] },
        { at: 'A full tank means', k: 'gap', q: 'Fill the gap with the book’s own word.',
          s: 'A full tank means “___,” not “never.”', o: ['later', 'right now', 'whatever'], a: 0,
          say: 'Yes! Say when you’ll come back. The Calm-Down Kit can help in the meantime.' }
      ]
    },

    '/book/chapter-4.html': {
      t: 'Chapter IV: Two kinds of fair', g: 'p5', n: '/book/chapter-5.html',
      m: [
        { at: 'two kinds of fair', k: 'sort', q: 'Fair by results, or fair by promises?', bins: ['Fair by results', 'Fair by promises'],
          items: [['“It all got done. Who cares who did it?”', 0], ['“You said you’d handle the trash.”', 1], ['Whoever’s free does it', 0], ['A fixed rota', 1]] },
        { at: 'Once a job has an owner', k: 'quiz', q: 'The trash is yours on the job list. Someone quietly covered for you. Judged by promises, what now?',
          o: [['It’s your job, so it’s worth a kind word and a look at the setup', true, 'Yes. Looking to the owner protects the person who keeps filling the gaps.'],
              ['It got done, so all good', false, 'Not quite. That’s fair by results. Once a job has an owner, look to the owner.']] },
        { at: 'Covering is kind', k: 'wyr', q: 'You took out the trash while they were away. Would you rather…',
          o: [['Say nothing', 'Kind, but silent help turns into unseen work.'],
              ['Say “I took out the trash this week, as you were away.”', 'A note, not a complaint. Now the help is seen.']] },
        { at: 'Notice, name, decide', k: 'match', q: 'Match each step to what it sounds like.',
          pairs: [['Notice', 'It landed harder than the words deserved'], ['Name', '“That hit harder than you probably meant.”'], ['Decide', 'Once settled: reply now, later or not at all']] },
        { at: 'Keep the two questions apart', k: 'sort', q: 'A question about a fact, or about a feeling?', bins: ['About a fact', 'About a feeling'],
          items: [['Was the job done?', 0], ['Did that comment hurt?', 1], ['Who owns it on the list?', 0], ['Did that land as a dig?', 1]] }
      ]
    },

    '/book/chapter-5.html': {
      t: 'Chapter V: The monthly look-back', g: 'p2', n: '/workpapers/wp-01.html',
      m: [
        { at: 'Weekly check-ins miss', k: 'quiz', q: 'The same job missed four weeks running is…',
          o: [['A pattern', true, 'Yes! And you only see it when you look at the whole month.'],
              ['A fluke', false, 'Not quite. One miss looks like a fluke. Four in a row is a pattern.'],
              ['Someone’s fault', false, 'Not quite. It’s a pattern in the setup, not a verdict on anyone.']] },
        { at: 'Tick each week', k: 'slider', q: 'How many weeks did one job slip this month?', label: 'Weeks it slipped',
          min: 0, max: 4, step: 1, start: 0, fmt: 'int',
          zones: [[1, 'Everyday life', 'A miss here and there happens to everyone.', '✔️'],
                  [2, 'Worth a look', 'Twice in a month is worth a glance at the job list.', '👀'],
                  [4, 'A real pattern', 'Three or four ticks in a month is a real pattern, not a fluke.', '🔁']] },
        { at: 'Sort each repeat', k: 'sort', q: 'Which kind of repeat is it?', bins: ['No clear owner', 'Owner can’t keep up', 'Short-term cause'],
          items: [['Everyone thought someone else was taking the recycling down', 0], ['The owner is swamped this term', 1],
                  ['It slipped while one of you was traveling', 2], ['Nobody ever agreed who would call the landlord', 0]] },
        { at: 'Count the gaps', k: 'gap', q: 'Fill the gap with the book’s own word.',
          s: 'Write down how many jobs had no clear owner. If that number ___ month by month, the setup is working.', o: ['falls', 'rises', 'doubles'], a: 0,
          say: 'Yes! If it rises, something bigger has changed, and it’s worth a talk.' },
        { at: 'short and kind', k: 'quiz', q: 'How do you start the monthly look-back?',
          o: [['With something that went well', true, 'Yes! Then talk about the job, not the person.'],
              ['With the longest list of misses', false, 'Not quite. Start with something that went well.'],
              ['By adding up old hours', false, 'Not quite. Past hours are never charged to anyone.']] }
      ]
    },

    /* ------------------------------------------------------------ the book, full */
    '/book/preface-in-depth.html': {
      t: 'Preface (full): Unbilled Debt', g: 'p1', n: '/book/chapter-1-in-depth.html',
      m: [
        { at: 'Unbilled debt: the work', k: 'quiz', q: 'In a business, an unbilled hour is…',
          o: [['Work done but never written on an invoice', true, 'Yes! At home it’s the same: the work was real, it just never made it onto the page.'],
              ['An hour off', false, 'Not quite. It’s work that was done, just never written down.'],
              ['A late payment', false, 'Not quite. Nobody even knows it’s owed, because it was never written down.']] },
        { at: 'kinds of unseen work', k: 'match', q: 'Match each kind of unseen work to an example.',
          pairs: [['Noticing', 'The trash is full, the shoes are too small'], ['Remembering', 'Birthdays, trash day, which form is due'],
                  ['Planning and deciding', 'What to cook, which plumber to call'], ['Checking', 'Making sure it happened, and following up'], ['Smoothing', 'Keeping the peace, cheering someone up']] },
        { at: 'other person doesn', k: 'quiz', q: 'In a well-known 1979 study, couples each estimated their share of household jobs. The two answers often added up to…',
          o: [['More than 100 percent', true, 'Yes! Nobody was lying. We each remember our own effort more easily.'],
              ['Exactly 100 percent', false, 'Not quite. The totals often went over 100, because we remember our own effort best.'],
              ['Less than 50 percent', false, 'Not quite. They added up to more than 100, not less.']] },
        { at: 'Writing it down is not', k: 'sort', q: 'Scorekeeping, or a shared ledger?', bins: ['Scorekeeping', 'A shared ledger'],
          items: [['Looks backward: who owes whom?', 0], ['Looks forward: what do we change next week?', 1], ['Used to prove a point', 0], ['Both people write their own side', 1]] },
        { at: 'borrows these words', k: 'match', q: 'Match each grand name to its plain meaning.',
          pairs: [['Unbilled debt', 'Work that got done but nobody saw or thanked'], ['Autonomic Saturation', 'How much stress you’re already carrying'],
                  ['Sensory Gating', 'Giving a comment a moment to land'], ['The Deficit Audit', 'A monthly look-back for jobs that keep slipping']] }
      ],
      e: [
        { f: 'This book calls that gap unbilled debt', s: 'Unbilled debt is the work someone did that nobody else noticed.', x: 'You booked the plumber, bought the gift and paid the bill. None of it was seen, so it’s “unbilled.”' },
        { f: 'Each person simply remembered their own effort', s: 'We all remember our own work better than other people’s, so we each think we do more.', x: 'Two roommates each guess they do 70% of the cleaning. Both are honest. Both counted what they saw.' },
        { f: 'Scorekeeping looks backward', s: 'Keeping score asks who owes whom. A shared list asks what to change next week.', x: 'Instead of “you owe me five dinners,” try “who’s cooking on Tuesday?”' },
        { f: 'These fields are good at one particular thing', s: 'The fancy words come from fields that describe how things work without blaming anyone.', x: '“The accounts don’t balance” is calmer than “you’re lazy.”' }
      ]
    },

    '/book/chapter-1-in-depth.html': {
      t: 'Chapter I (full): The Radio Frequency Paradigm', g: 'p4', n: '/book/chapter-2-in-depth.html',
      m: [
        { at: 'The radio whistle', k: 'quiz', q: 'What do engineers call the extra tone two nearly matched signals make?',
          o: [['A heterodyne, or a “beat”', true, 'Yes! A third, uglier sound that neither radio was sending.'],
              ['An echo', false, 'Not quite. It’s a heterodyne, a brand-new tone from the two signals mixing.'],
              ['Feedback', false, 'Not quite. It’s called a heterodyne, or a beat.']] },
        { at: 'What sets the frequency', k: 'match', q: 'What was said, and how it was heard. Match them up.',
          pairs: [['“The sink’s full again.”', 'Meant as an update, heard as “You never wash up.”'], ['“Can we talk about the vacation?”', 'Meant as this week, heard as right now'],
                  ['“I’ll do it later.”', 'Meant as this evening, heard as maybe never']] },
        { at: 'How stress changes', k: 'sort', q: 'Which everyday state is this?', bins: ['Calm and connected', 'Revved up', 'Running on empty'],
          items: [['You can hear something hard without getting defensive', 0], ['Small things feel urgent or personal', 1], ['Words are hard to find, and replies get short', 2], ['Pace speeds up, tone gets sharper', 1]] },
        { at: 'Retuning, step by step', k: 'quiz', q: 'What is always the last retuning step?',
          o: [['Go back to the topic', true, 'Yes! The topic still matters. You come back when you can both hear properly.'],
              ['Drop the topic for good', false, 'Not quite. Retuning always ends by going back to the topic.'],
              ['Decide who caused the static', false, 'Not quite. Nobody has to be wrong. Retuning, not blame, clears it.']] },
        { at: 'Staying in tune', k: 'slider', q: 'Five things landed badly this week. How many did you retune before answering?', label: 'Moments retuned',
          min: 0, max: 5, step: 1, start: 0, fmt: 'ratio5',
          zones: [[1, 'Just starting', 'Not a grade. Every retune counts.', '🌱'],
                  [3, 'Getting the hang of it', 'Like the chapter’s example: 3 ÷ 5 = 0.60.', '🌿'],
                  [5, 'Becoming a habit', '“We’re out of tune” is working faster each time.', '🌳']] }
      ],
      e: [
        { f: 'Engineers call this a heterodyne', s: 'When two signals are almost the same, they make a whistle neither one was making.', x: 'Two fair sentences, said in two slightly different moods, can make an argument nobody meant.' },
        { f: 'These three match names from polyvagal theory', s: 'The long words are just science names for calm, revved up and running on empty.', x: '“I’m revved up right now” works just as well as any technical term.' },
        { f: 'the full CALC-01 calculator has a', s: 'Retuning frequency simply counts how often you fixed a bumpy moment before answering.', x: 'Five moments went badly and you retuned three of them: 3 out of 5.' }
      ]
    },

    '/book/chapter-2-in-depth.html': {
      t: 'Chapter II (full): P(Solvency)', g: 'p1', n: '/book/chapter-3-in-depth.html',
      m: [
        { at: 'What the names mean', k: 'match', q: 'Match each grand name to its plain meaning.',
          pairs: [['Epistemic', 'To do with what we know'], ['Solvency', 'Able to keep paying its way'], ['P(Solvency)', 'Just a name: a simple weighted sum, not a probability']] },
        { at: 'Workload balance', k: 'gap', q: 'Do the chapter’s sum.',
          s: 'A 70/30 week scores 1 − 40 ÷ 100 = ___.', o: ['0.60', '0.70', '0.30'], a: 0,
          say: 'Yes! And a 30/70 week scores exactly the same. The arithmetic doesn’t care who carries more.' },
        { at: 'Ownership clarity', k: 'quiz', q: 'Ten jobs on the list, and eight have both names. What’s the ownership clarity?',
          o: [['0.80', true, 'Yes! 8 ÷ 10 = 0.80.'], ['0.20', false, 'Not quite. That’s the unowned part. Count the jobs with both names.'],
              ['8', false, 'Not quite. Divide by all the jobs on the list, so 8 ÷ 10.']] },
        { at: 'The formula, in plain language', k: 'slider', q: 'Keep balance at 0.60 and stress at 0.40, like Sam and Alex. Now slide the ownership score.', label: 'Ownership clarity',
          min: 0, max: 1, step: 0.05, start: 0.8, fmt: 'solv',
          zones: [[0, 'No owners at all', 'The result is about 0.39: the kind-rethink band.', '🌧️'],
                  [0.85, 'Some owners', 'The result sits in the middle band, 0.40 up to 0.70: something is drifting.', '⛅'],
                  [1, 'Almost every job owned', 'Now the result reaches 0.70 or more: the setup is carrying its own weight.', '🌤️']] },
        { at: 'start with the shortfall', k: 'quiz', q: 'Sam and Alex’s biggest shortfall was balance (0.16). Where do they start?',
          o: [['With balance, often by giving a job a clear owner', true, 'Yes! The shortfall, not the total, is the part you can act on.'],
              ['With the total score', false, 'Not quite. The shortfall shows where one change helps most.'],
              ['With whichever person scored lower', false, 'Not quite. It reads the setup, never a person.']] }
      ],
      e: [
        { f: 'The score is the same whichever person is doing more', s: 'The balance score only asks whether the work is shared, not who does more.', x: '70/30 and 30/70 both score 0.60.' },
        { f: 'The weights add up to 1', s: 'Three parts go in, each counts a set amount, and the answer always lands between 0 and 1.', x: 'Balance counts most (0.40), owners next (0.35), stress least (0.25).' },
        { f: 'The gap between what a part earned', s: 'The shortfall is how far each part fell short of its best, and it shows where to start.', x: 'Balance could earn 0.40 but earned 0.24, so its shortfall is 0.16.' },
        { f: 'The two numbers answer different questions', s: 'One number asks if the work can last. The other also asks how well you make up after bumps.', x: 'You can share chores well and still need practice repairing after a snap.' }
      ]
    },

    '/book/chapter-3-in-depth.html': {
      t: 'Chapter III (full): Autonomic Saturation', g: 'p3', n: '/book/chapter-4-in-depth.html',
      m: [
        { at: 'Autonomic Saturation', k: 'flip', q: 'Two big words, both plain once unpacked. Tap to flip.',
          cards: [['Autonomic', 'The part of your nervous system that runs things without you deciding.', 'Notice your breathing. You didn’t choose that pace.'],
                  ['Saturation', 'How full something is, like a sponge that can’t take anymore water.', 'Picture that sponge after a long day.']] },
        { at: 'battery score, step by step', k: 'slider', q: 'Add up your five 0–4 scores. Drag to your total and watch it divide by 20.', label: 'Your total, out of 20',
          min: 0, max: 20, step: 1, start: 3, fmt: 'over20',
          zones: [[5, 'Low load (0 to 0.3)', 'Whatever comes up is probably about the thing itself.', '🌤️'],
                  [12, 'Moderate (0.3 to 0.6)', 'Sam’s 11 lands here: “Heads up, I’m carrying a lot today.”', '⛅'],
                  [20, 'High (0.6 to 1)', 'Be gentle with yourself, and put off anything that can wait an hour.', '🌧️']] },
        { at: 'The 7 Ocular Vectors', k: 'match', q: 'Match each angle to the question you ask yourself.',
          pairs: [['Physical tiredness', 'How rested am I, really, right now?'], ['History', 'Am I reacting to today, or the last five times?'],
                  ['Family script', 'Who did this job in the home I grew up in?'], ['Outside stress', 'Is money or work shaping how I see this?']] },
        { at: 'Two true views', k: 'quiz', q: 'In the old story of the Blind Men and the Elephant, why do they argue?',
          o: [['Each thinks his part is the whole animal', true, 'Yes! Each describes his part honestly. Naming the angle helps.'],
              ['One of them is lying', false, 'Not quite. Each one describes what he touches honestly.'],
              ['The elephant keeps moving', false, 'Not quite. Each thinks his part is the whole.']] },
        { at: 'What a high reading asks', k: 'quiz', q: 'After a round of calming steps, your battery reads 0.45. Now what?',
          o: [['Go back at the time you said', true, 'Yes! Under 0.50, you go back as planned.'],
              ['Do another round', false, 'Not quite. Another round is for 0.50 to 0.60.'],
              ['Skip the talk for good', false, 'Not quite. A high reading means later, never never.']] }
      ],
      e: [
        { f: 'Parts of that theory are still debated', s: 'The three states are handy everyday labels, not medical facts.', x: '“I’m running on empty” is enough. No science words needed.' },
        { f: 'is a direction', s: 'The seven angles are seven different spots you might be looking at a moment from.', x: 'You see the pile of mail as a to-do list. They see it as “I’m always the one who opens it.”' },
        { f: 'The average of both people', s: 'Your two battery scores get averaged and used in Chapter II’s check, where more stress lowers the result.', x: '0.55 and 0.25 average to 0.40.' },
        { f: 'Autonomic Saturation asks', s: 'One tool asks how charged the room is. The other asks what each person thinks it’s really about.', x: '“I’m at 0.55 and seeing this from time pressure.” “I’m at 0.25, and for me it’s history.”' }
      ]
    },

    '/book/chapter-4-in-depth.html': {
      t: 'Chapter IV (full): Two kinds of fair', g: 'p5', n: '/book/chapter-5-in-depth.html',
      m: [
        { at: 'Deontological parity: the two', k: 'match', q: 'Match each philosophy word to its plain meaning.',
          pairs: [['Consequentialist', 'Fair by results (from “consequences”)'], ['Deontological', 'Fair by promises (from the Greek for “duty”)'], ['Parity', 'Equal standing']] },
        { at: 'Choosing your kind of fair', k: 'sort', q: 'Judged by promises, or by results?', bins: ['By promises', 'By results'],
          items: [['An owned job on the WP-03 list', 0], ['A flat tire', 1], ['A surprise visitor', 1], ['A shared job that keeps coming up, once it moves to the owned list', 0]] },
        { at: 'Covering without resentment', k: 'quiz', q: 'Covering once is kindness. Covering every week is…',
          o: [['A sign the job needs a new owner, or a talk about capacity', true, 'Yes! The monthly look-back in Chapter V is built to catch this.'],
              ['Just how it is', false, 'Not quite. Repeats are a signal worth noticing.'],
              ['Proof the owner doesn’t care', false, 'Not quite. It’s a fact about the job, never a verdict on the person.']] },
        { at: 'notice, name, decide', k: 'gap', q: 'Fill the gap with the book’s own word.',
          s: 'Gating isn’t bottling things up. It’s about ___: letting the spike pass before deciding how much weight a comment deserves.', o: ['timing', 'winning', 'forgetting'], a: 0,
          say: 'Yes! Timing. The Calm-Down Kit helps the spike pass, and WP-09 helps with the reply.' },
        { at: 'flat thank-you', k: 'wyr', q: '“Thanks for taking out the trash,” said flatly. Would you rather…',
          o: [['Snap back: “I do them every week, you know.”', 'Now there’s an argument about tone, and nobody remembers it started with a thank-you.'],
              ['“That landed a bit oddly for me. Give me a second.”', 'After a breath: “Did you mean that as a thank-you?” “Yes, sorry, I’m worn out.” Over in ten seconds.']] }
      ],
      e: [
        { f: 'Philosophers call this deontological', s: 'Fair by promises means asking: did each person do the jobs they said they would?', x: 'You said you’d take Tuesday’s trash, so Tuesday’s trash are yours.' },
        { f: 'Deontological parity is this book', s: 'Once a job has an owner, you judge the job by whether that owner did it.', x: 'If someone quietly covered for you, the job still has a question mark next to your name.' },
        { f: 'The term is borrowed loosely from brain science', s: 'Not every comment needs a full-volume reaction. Let it settle first.', x: 'Say “give me a second” before answering a remark that stung.' }
      ]
    },

    '/book/chapter-5-in-depth.html': {
      t: 'Chapter V (full): The Deficit Audit', g: 'p2', n: '/workpapers/wp-04-deficit-audit.html',
      m: [
        { at: 'Why a monthly look', k: 'flip', q: 'Three rhythms keep things running. Tap each one.',
          cards: [['Daily', 'The 90-second check-in (WP-13).', 'Tonight, one sentence each.'],
                  ['Weekly', 'The weekly closing: tally the week and glance at the job list.', 'Pick a five-minute slot on Sunday.'],
                  ['Monthly', 'The look-back: which gaps kept reopening?', 'Put twenty minutes in the calendar.']] },
        { at: 'What a gap looks like', k: 'quiz', q: '“The trash has quietly become nobody’s job for three months.” That’s…',
          o: [['A deficit: a job that keeps producing the same miss', true, 'Yes! That’s where unbilled debt grows fastest.'],
              ['An event', false, 'Not quite. One missed Tuesday is an event. A deficit keeps coming back.'],
              ['Nothing to notice', false, 'Not quite. This is exactly what the look-back is for.']] },
        { at: 'Step two: sort each repeat', k: 'match', q: 'Match each kind of gap to what you do about it.',
          pairs: [['Structural gap', 'Update the WP-03 list together'], ['Capacity issue', 'Book an honest, kind conversation'], ['One-off', 'Note it and move on']] },
        { at: 'How to talk about a pattern', k: 'wyr', q: 'Would you rather say…',
          o: [['“You never take out the trash.”', 'A pattern said as a verdict gets argued with.'],
              ['“The trash has slipped four weeks running. What’s getting in the way on Tuesdays?”', 'A pattern said as a repeated fact can get an owner.']] },
        { at: 'What the look-back is for', k: 'quiz', q: 'Does the look-back add up hours that were “owed”?',
          o: [['No. It only fixes the setup going forward', true, 'Yes! Billing for old hours just turns a look-back into a grievance.'],
              ['Yes, to settle up fairly', false, 'Not quite. Those hours are gone. The question is where the setup failed.']] }
      ],
      e: [
        { f: 'In accounting, a deficit is a shortfall', s: 'Here a “deficit” is a job that keeps falling short, and the “audit” is a friendly monthly look.', x: 'The recycling overflowing every other week is a deficit.' },
        { f: 'A single missed job is an event', s: 'One miss is a blip. The same miss month after month is a gap in the setup.', x: 'Trash missed once: a blip. Trash missed every Tuesday for three months: a gap.' },
        { f: 'A falling number of structural gaps', s: 'If fewer jobs are missing an owner each month, the setup is getting better.', x: 'Three gaps in March, one in April: it’s working.' }
      ]
    },

    /* ------------------------------------------------------------ workpapers */
    '/workpapers/wp-01.html': {
      t: 'WP-01: Who did what', g: 'p1', n: '/workpapers/wp-02-battery-stress-meter.html',
      m: [
        { at: 'Write down the week', k: 'quiz', q: 'Who fills in each side of the log?',
          o: [['Each of you writes only your own side', true, 'Yes! You’re the only expert on your own week.'],
              ['Whoever does more fills in both', false, 'Not quite. Nobody fills in the other person’s side.']] },
        { at: 'log the small jobs', k: 'gap', q: 'Fill the gap with the sheet’s own word.',
          s: 'For every task, note the day, what it was, who did it, roughly how many ___, and whether someone asked for it.', o: ['minutes', 'feelings', 'complaints'], a: 0,
          say: 'Yes! Those minutes go into the Lemonade Stand and CALC-01.' },
        { at: 'Log what happened', k: 'quiz', q: 'You noticed the full trash can three times before taking it out. How many rows?',
          o: [['One honest row', true, 'Yes! One honest row, not three rows of resentment.'],
              ['Three rows', false, 'Not quite. Log what happened, once.']] },
        { at: 'Say no in three', k: 'flip', q: 'Say no in three calm steps. Tap each one.',
          cards: [['1. Why it’s fair', 'Show you see the request is reasonable.', '“That’s a fair thing to ask.”'],
                  ['2. What you have left', 'Be honest about what you have right now.', '“I’m pretty full tonight.”'],
                  ['3. Something instead', 'Another time, another person, or part of the job.', '“Could I do it tomorrow at nine?”']] },
        { at: 'Pick the kind', k: 'sort', q: 'Which kind of “not now” is it?', bins: ['Capacity check', 'Delegation pivot', 'Time commitment'],
          items: [['“I’m already full tonight.”', 0], ['“Your brother knows that app better. Could he help?”', 1], ['“Yes, and I can do it Saturday morning.”', 2]] }
      ]
    },

    '/workpapers/wp-02-battery-stress-meter.html': {
      t: 'WP-02: How much are you carrying?', g: 'p3', n: '/wp-11.html',
      m: [
        { at: 'before a hard conversation', k: 'quiz', q: 'This check is…',
          o: [['A simple gut-check', true, 'Yes! Kind and quick, and not a medical test.'],
              ['A medical test', false, 'Not quite. It’s a gut-check, not a medical test.'],
              ['A way to score the other person', false, 'Not quite. Each of you scores only yourself.']] },
        { at: 'Score five things', k: 'flip', q: 'The five things you score, 0 to 4. Tap each one.',
          cards: [['Sleep', 'Less rested than usual?', '0 means not at all, 4 means very true.'], ['Workload elsewhere', 'Work, study or caring for someone.', 'Think about the last day or two.'],
                  ['Unresolved conflict', 'From any part of life.', 'A small one still counts.'], ['How your body feels', 'Hungry, unwell or in pain?', 'Eating first can help.'],
                  ['Time pressure', 'Today in particular.', 'Rushed days count.']] },
        { at: 'divide by 20', k: 'slider', q: 'Drag the score and see what it suggests.', label: 'Battery score',
          min: 0, max: 1, step: 0.05, start: 0.15, fmt: 'dec2',
          zones: [[0.3, 'Under 0.3', 'Whatever comes up is probably about the thing itself.', '🌤️'],
                  [0.6, '0.3 to 0.6', 'Say out loud: “Heads up, I’m carrying more than usual today.”', '⛅'],
                  [1, 'Over 0.6', 'Be gentle with yourself, and put off anything that doesn’t need deciding in the next hour.', '🌧️']] },
        { at: 'A high score means', k: 'wyr', q: 'Your score is 0.7 and a hard topic comes up. Would you rather…',
          o: [['Push through right now', 'Anything decided now may need redoing once your tank is less full.'],
              ['“Let’s come back to this tomorrow at six.”', 'You’re using your score to pace the talk, not to dodge it. Exactly right.']] }
      ]
    },

    '/wp-11.html': {
      t: 'WP-11: The Calm-Down Kit', g: 'p3', n: '/workpapers/wp-03-raci-treaty.html',
      m: [
        { at: 'never for them', k: 'quiz', q: 'Who is the Calm-Down Kit for?',
          o: [['You, about yourself', true, 'Yes! It’s never something to hand to the other person.'],
              ['The other person, when they get upset', false, 'Not quite. It’s only ever about you.']] },
        { at: 'Decide now', k: 'gap', q: 'Fill the gap with the kit’s own words.',
          s: 'Your stepping-away sentence says how you feel, how long, and ___.', o: ['when you’ll be back', 'who started it', 'what they did wrong'], a: 0,
          say: 'Yes! A time to come back means a break is never mistaken for walking out.' },
        { at: 'In the moment', k: 'quiz', q: 'Which of these is one of the kit’s calming steps?',
          o: [['Breathe in for four, out for six', true, 'Yes! Or a slow walk.'],
              ['Rehearse your comeback', false, 'Not quite. Pick something that settles your body, like a slow walk.'],
              ['Scroll the news', false, 'Not quite. Pick a step that brings you down, like slow breathing.']] },
        { at: 'guide when you go back', k: 'slider', q: 'You’ve done a round of calming steps. Drag your new battery score.', label: 'Battery score now',
          min: 0.3, max: 0.8, step: 0.05, start: 0.7, fmt: 'dec2',
          zones: [[0.49, 'Under 0.50', 'Go back at the time you said. Start with one small, simple task.', '🌤️'],
                  [0.59, '0.50 to 0.60', 'Do another round of your calming steps.', '⛅'],
                  [0.8, '0.60 or more', 'Still here after two rounds? That’s okay: pick a new time and say when.', '🌧️']] }
      ]
    },

    '/workpapers/wp-03-raci-treaty.html': {
      t: 'WP-03: One owner per job', g: 'p2', n: '/workpapers/wp-04-deficit-audit.html',
      m: [
        { at: 'two names', k: 'match', q: 'Match each name to its job.',
          pairs: [['Responsible', 'Does the job'], ['Accountable', 'Keeps an eye on it and gently follows up'], ['Both at once', 'Allowed: it can be the same person']] },
        { at: 'Change it on purpose', k: 'wyr', q: 'Life changed, and the trash no longer fit your week. Would you rather…',
          o: [['Let the other person quietly pick them up', 'That’s drift: one person quietly doing more.'],
              ['Raise it at the weekly closing and agree on the change', 'Changed on purpose, not by drift.']] },
        { at: 'Agreeing means', k: 'quiz', q: 'Agreeing on the list says…',
          o: [['We agree who owns what, as written', true, 'Yes! Clear, not perfect.'],
              ['Every job feels perfectly fair', false, 'Not quite. Agreeing means clear, not perfect.']] },
        { at: 'Count how many', k: 'slider', q: 'Ten jobs on your list. Drag how many have both names.', label: 'Jobs with both names',
          min: 0, max: 10, step: 1, start: 4, fmt: 'of10',
          zones: [[3, 'Lots of gaps', 'Unowned jobs drift to whoever notices first.', '🧩'],
                  [7, 'Getting clearer', 'Keep going. Name owners for the easier jobs first.', '🧩'],
                  [10, 'Nearly all owned', 'Nobody has to keep re-deciding who does what.', '🧩']] }
      ]
    },

    '/workpapers/wp-04-deficit-audit.html': {
      t: 'WP-04: What keeps coming back?', g: 'p2', n: '/workpapers/wp-09-tone-filter.html',
      m: [
        { at: 'monthly, not weekly', k: 'quiz', q: 'What do you bring to the monthly look-back?',
          o: [['Four weekly WP-01 logs and your WP-03 job list', true, 'Yes! That’s all you need.'],
              ['A list of complaints', false, 'Not quite. Bring the logs, not the grievances.'],
              ['Just your memory', false, 'Not quite. Memories blur. The logs keep it fair.']] },
        { at: 'List the jobs that slipped', k: 'gap', q: 'Fill the gap with the sheet’s own word.',
          s: 'Three or four checks in a month is a real pattern, not a ___.', o: ['fluke', 'crime', 'test'], a: 0,
          say: 'Yes! A pattern, and patterns can be fixed in the setup.' },
        { at: 'Sort each repeat', k: 'sort', q: 'Which kind of repeat is it?', bins: ['Update WP-03', 'Kind, honest talk', 'Note it and move on'],
          items: [['The named owner isn’t the one doing it', 0], ['The owner can’t keep up', 1], ['It slipped during a week of illness', 2]] },
        { at: 'Nobody owes anything', k: 'quiz', q: 'A job with no owner is…',
          o: [['A gap in the list', true, 'Yes! Not a judgment on whoever kept covering it.'],
              ['Someone’s fault', false, 'Not quite. Nobody owes anything. It’s a gap in the list.']] }
      ]
    },

    '/workpapers/wp-09-tone-filter.html': {
      t: 'WP-09: Say it so it lands', g: 'p4', n: '/workpapers/wp-13-pll-protocol.html',
      m: [
        { at: 'own next message', k: 'quiz', q: 'Whose messages does the Tone Filter check?',
          o: [['Your own next message', true, 'Yes! Each of you uses it on yourself.'],
              ['The other person’s texts', false, 'Not quite. Nothing is recorded, and nobody else’s voice is analyzed.']] },
        { at: 'find three things', k: 'sort', q: 'Fact, feeling or ask?', bins: ['Fact', 'Feeling', 'Ask'],
          items: [['The bin wasn’t out before pickup.', 0], ['I feel a bit unseen.', 1], ['Can we pick a fixed day for it?', 2], ['Tired.', 1]] },
        { at: 'weigh what you heard', k: 'flip', q: 'Four quick questions before you react. Tap each one.',
          cards: [['About a task?', 'Is it about a specific task?', 'If not, an old argument may be talking.'], ['Stretched?', 'Would it read the same if you weren’t already stretched?', 'Check your battery first.'],
                  ['Neutral?', 'Could a neutral meaning fit?', 'Read it again in a calm voice.'], ['Old argument?', 'Are you answering their words, or an old argument?', 'Answer just today’s words.']] },
        { at: 'See it in action', k: 'wyr', q: 'Would you rather send…',
          o: [['“You never think about anyone but yourself.”', 'A judgment on the person. It will probably get argued with.'],
              ['“The bin wasn’t out before pickup. I feel a bit unseen. Can we pick a fixed day for it?”', 'One fact, one feeling, one ask: something they can actually hear.']] }
      ]
    },

    '/workpapers/wp-13-pll-protocol.html': {
      t: 'WP-13: The 90-second check-in', g: 'p5', n: '/turning-toward.html',
      m: [
        { at: 'Small and often', k: 'quiz', q: 'What is a phase-locked loop?',
          o: [['A circuit that keeps two signals in step', true, 'Yes! This check-in does the same for two people, with tiny daily nudges.'],
              ['A kind of knot', false, 'Not quite. It’s a circuit that keeps two signals in step.'],
              ['A long weekly meeting', false, 'Not quite. Small and often beats big and rare.']] },
        { at: 'one sentence each', k: 'flip', q: 'Once a day, one sentence each. Tap each part.',
          cards: [['How full were you?', 'Low, medium or high.', '“Medium today.”'], ['One appreciation', 'Something you appreciated about the other person.', '“Thanks for making coffee.”'],
                  ['One small ouch (optional)', 'One small thing that didn’t feel great.', '“The late text stung a little.”'], ['One help (optional)', 'One thing that would help tomorrow.', '“A heads-up if you’re running late.”']] },
        { at: 'Just listen', k: 'wyr', q: 'They mention a small ouch. Would you rather…',
          o: [['Debate it right there', 'The check-in stops feeling safe, and you’ll both start skipping it.'],
              ['Take it in, and save it for the weekly closing if it needs a real talk', 'Nothing gets solved here. That’s what keeps it to ninety kind seconds.']] },
        { at: 'look for repeats', k: 'gap', q: 'Fill the gap with the sheet’s own word.',
          s: 'Anything that came up more than ___ in a week moves to your job list or your tone check.', o: ['twice', 'once', 'ten times'], a: 0,
          say: 'Yes! Instead of just hanging around, it gets a home.' }
      ]
    },

    /* ------------------------------------------------------------ more guides, the full pages and the Library */
    '/is-this-for-you.html': {
      t: 'Is this right for you?', g: 'harbor', n: '/how-it-works.html',
      m: [
        { at: 'shared ledger, not a scorecard', k: 'sort', q: 'Is it, or isn’t it?', bins: ['It is', 'It isn’t'],
          items: [['Worksheets each person fills in about themselves, then reads together', 0], ['A way to prove who’s right', 1, 'It isn’t. Every score describes how things are shared, never a person.'],
                  ['Therapy or a diagnosis', 1, 'It isn’t. It’s a practical way to see what each of you carries.'], ['A fair way for two people to see what each one carries', 0]] },
        { at: 'same disagreements keep coming back', k: 'quiz', q: 'When does it fit best?',
          o: [['When the same disagreements keep coming back, and you’re both willing to write down your own side honestly', true, 'Yes! That’s the sweet spot. And you can also start on your own.'],
              ['Only when both people sign up on day one', false, 'Not quite. You can start on your own. The shared tools just work best with both of you.'],
              ['When you want a verdict on the other person', false, 'Not quite. It never gives a verdict on a person, only a picture of how things are shared.']] },
        { at: 'all of it is free', k: 'gap', q: 'Fill the gap with the page’s own word.',
          s: 'Some pages open with no sign-up, and the rest open once you enter your ___.', o: ['email', 'card number', 'password'], a: 0,
          say: 'Yes, just your email. Nothing is charged right now.' },
        { at: 'Every page is listed', k: 'wyr', q: 'You’re new and not sure where to begin. Would you rather…',
          o: [['Open random pages until something fits', 'You might find a gem, but it’s easy to get lost and give up.'],
              ['Read how it fits the relationship on your mind, then pick one tool', 'That’s the page’s own tip: one relationship, one tool, one small start.']] }
      ]
    },

    '/is-this-for-you-in-depth.html': {
      t: 'Is this right for you? (full)', g: 'harbor', n: '/how-it-works-in-depth.html',
      m: [
        { at: 'What it is, and what it isn', k: 'quiz', q: 'The page says a ledger only one person reads is…',
          o: [['Just a grudge with better formatting', true, 'Yes! A ledger works because both people read it, together.'],
              ['A good start on your own', false, 'Not quite. The self-discovery half is for you alone, but a shared ledger read by one person turns into a grudge.'],
              ['The safest way to keep score', false, 'Not quite. This isn’t a scorecard at all. It describes the arrangement, never a person.']] },
        { at: 'Who it’s for', k: 'sort', q: 'Good fit right now, or probably not?', bins: ['Likely a good fit', 'Probably not right now'],
          items: [['You want to understand why some moments hit harder than they should', 0], ['The same “who does more” argument keeps coming back', 0],
                  ['You’re hoping for proof that you’re right', 1, 'The page says this is the time to wait: it never gives a verdict on anyone.'],
                  ['Lists, numbers and clear steps make hard topics easier for you', 0]] },
        { at: 'Ways in', k: 'match', q: 'Match each way in to what it means.',
          pairs: [['Open access', 'Start right away, with nothing asked of you'], ['Free with email', 'Enter your email once and the rest opens in that browser'],
                  ['Paid membership', 'Coming later, and nothing is charged now']] },
        { at: 'Where everything is', k: 'quiz', q: 'The workpapers work best in an order. Where do you start?',
          o: [['WP-01, the week’s log of who did what', true, 'Yes! WP-01 → WP-02 → WP-03 → WP-09 → WP-13, with WP-04 once a month.'],
              ['WP-04, the monthly look-back', false, 'Not quite. WP-04 comes once a month, after the others have had time to work.'],
              ['Any of them, all at once', false, 'Not quite. One at a time, in order. If things feel urgent, start with WP-11 or WP-02.']] }
      ]
    },

    '/how-it-works-in-depth.html': {
      t: 'How it works (full)', g: 'harbor', n: '/five-pillars-in-depth.html',
      m: [
        { at: 'Your life situation', k: 'sort', q: 'Which of the three things is this?', bins: ['Your life situation', 'Your wiring', 'What you discover'],
          items: [['A move, a new baby and a job change in one season', 0], ['You need hours of quiet to reset after a busy day', 1],
                  ['Written down for a few weeks: you get short-tempered around 5 p.m.', 2], ['Caring for a parent while working full time', 0],
                  ['You think out loud, and your roommate needs quiet to think', 1]] },
        { at: 'Plain first', k: 'flip', q: 'Tap each card to see the plain version.',
          cards: [['Autonomic saturation', 'Stress left over from earlier in the day makes you react faster to the next thing.', 'On a running-on-empty day, say “it’s the day, not you.”'],
                  ['The technical layer', 'Optional. The tools work the same without it.', 'Read the plain version first, and the technical part only if you’re curious.'],
                  ['A heuristic', 'A practical rule of thumb, not a clinical or diagnostic tool.', 'Treat the numbers as a starting point for a talk.']] },
        { at: 'Where the static comes from', k: 'quiz', q: 'You say “in a minute,” meaning “when I finish this.” They hear “in sixty seconds.” Where does the static live?',
          o: [['In the gap between the two of you', true, 'Yes! Nobody lied and nobody was careless. The message went out on one frequency and arrived on another.'],
              ['In the person who said “in a minute”', false, 'Not quite. No one creates static alone. It happens in the space between two people.'],
              ['In the person who got upset', false, 'Not quite. They heard a reasonable meaning, just not the one you sent.']] },
        { at: 'What it should feel like', k: 'gap', q: 'Fill the gap with the page’s own word.',
          s: 'One entry is a mood. Twelve entries are a ___.', o: ['pattern', 'verdict', 'score'], a: 0,
          say: 'Yes, a pattern. Repetition is what makes it trustworthy enough to act on.' }
      ]
    },

    '/program-overview.html': {
      t: 'Program Overview', g: 'harbor', n: '/book/preface.html',
      m: [
        { at: 'Each chapter pairs', k: 'quiz', q: 'What does a chapter do, and what does its workpaper do?',
          o: [['The chapter shares one idea; the workpaper is where you put it to use', true, 'Yes! Read the idea, then use the matching worksheet.'],
              ['The chapter gives a score; the workpaper explains it', false, 'Not quite. Chapters explain ideas. Worksheets are where you do something with them.'],
              ['They’re two versions of the same thing', false, 'Not quite. They pair up, but one explains and the other puts it to use.']] },
        { at: 'feed one number', k: 'match', q: 'Match each piece to what it does.',
          pairs: [['WP-01, WP-02 and WP-03', 'Feed the Solvency Read'], ['CALC-01', 'One read on whether the way you share things can last'],
                  ['WP-13', 'A 90-second daily check-in with no debate']] },
        { at: 'No score ever comes from one person', k: 'wyr', q: 'Your number comes back lower than you hoped. Would you rather…',
          o: [['Show it as proof that something is wrong with them', 'That ends a conversation. A number should start one, and no score comes from one person alone.'],
              ['Use it to open a calm talk about the setup', 'That’s the page’s rule: a number should start a conversation, never end one.']] },
        { at: 'designed, not built', k: 'gap', q: 'Fill the gap with the page’s own words.',
          s: 'If this page and the ___ ever differ, go with the ___.', o: ['Suite Index', 'newest chapter', 'loudest opinion'], a: 0,
          say: 'Yes, the Suite Index. It lists exactly what is built today.' }
      ]
    },

    '/ways-in.html': {
      t: 'Ways in', g: 'harbor', n: '/start-here.html',
      m: [
        { at: 'open to anyone', k: 'sort', q: 'Open to anyone, or opens with your free email?', bins: ['Open to anyone', 'Opens with your email'],
          items: [['The Signal Translator and the Wiring Card', 0], ['All seven live workpapers', 1], ['The Preface and Chapters I and II', 0], ['Chapters III to V', 1], ['The Carrier Wave Decoder', 0]] },
        { at: 'Your email opens the rest', k: 'quiz', q: 'What do you need to open everything else?',
          o: [['Just your email, once', true, 'Yes! No account and no password.'],
              ['An account and a password', false, 'Not quite. There’s no account and no password. Your email is enough.'],
              ['A paid membership', false, 'Not quite. Paid membership comes later, and nothing is charged now.']] },
        { at: 'You share very little', k: 'quiz', q: 'Where does what you type into the tools go?',
          o: [['It stays in your own browser', true, 'Exactly. If you sign up, the newsletter service holds only your email address.'],
              ['It’s saved to your account', false, 'Not quite. There’s no account. It stays in your browser.'],
              ['It’s shared with advertisers', false, 'Not quite. Nothing is sold or used for advertising.']] }
      ]
    },

    '/relationships-in-depth.html': {
      t: 'How it fits your relationships (full)', g: 'p1', n: '/check-ins-in-depth.html',
      m: [
        { at: 'The map', k: 'match', q: 'Match each word on the map to what it means.',
          pairs: [['Core', 'Built for this, or one of the first things to reach for'], ['Helpful', 'Works with small adjustments'], ['A dash', 'Usually not the right tool']] },
        { at: 'Partners', k: 'quiz', q: 'One partner tracks every birthday and bill. The other hears “you never help” as unfair. Why?',
          o: [['From where they stand, it is unfair: they genuinely don’t know that work exists', true, 'Yes! That’s why WP-01 comes first: a week of who did what, written down by each of you.'],
              ['They’re pretending not to notice', false, 'Not quite. The page says they genuinely don’t see it. Unseen work isn’t the same as ignored work.'],
              ['The tracker is exaggerating', false, 'Not quite. The work is real, it’s just invisible. Writing it down makes it visible to both of you.']] },
        { at: 'Co-parents', k: 'wyr', q: 'Handoff day, and something bigger comes up. Would you rather…',
          o: [['Settle it right there at the door', 'Handoffs are not the place to settle anything, and the kids are never the messengers.'],
              ['Say “Can we put that on Thursday’s check-in?”', 'That’s the exchange-day script: short, logistical, and the same every time.']] },
        { at: 'Three or more people', k: 'quiz', q: 'Three roommates, and the bills feel uneven. What comes first?',
          o: [['Agree on the rule for rent and bills, and write it down', true, 'Yes! Deciding how “fair” will be judged comes before arguing about whether something was.'],
              ['Work out who has been late the most', false, 'Not quite. Start with the numbers, not with who is late. Talk about the setup, not the person.'],
              ['Sort it out late at night in the group chat', false, 'Not quite. Raise it at a house meeting, not late at night in the group chat.']] },
        { at: 'Caregivers', k: 'flip', q: 'Caring for your partner for a while? Tap each card.',
          cards: [['What to notice', 'The jobs moved to you without either of you choosing it.', 'Name it together as a setup that changed for a while, not a debt.'],
                  ['One small thing today', 'Check your battery, take a one-minute break, or ask for one specific help.', 'Try: “Could you do Thursday’s drive to the appointment?”'],
                  ['When you’re both ready', 'Write the week’s jobs on one page together.', 'Some jobs move back as they’re able, and some go to friends or family, each with one owner.']] }
      ]
    },

    '/know-yourself-in-depth.html': {
      t: 'Know your own wiring (full)', g: 'p3', n: '/wired-differently-in-depth.html',
      m: [
        { at: 'Three layers', k: 'sort', personal: true, q: 'Which layer is carrying most of the weight for you? There are no wrong answers, just where many people would put it.', bins: ['Wiring', 'Shaped pattern', 'Today’s conditions'],
          items: [['You take words literally, and always have', 0], ['You say yes before you’ve checked if you can', 1, 'A learned setting: pleasing once kept things calm.'],
                  ['You slept badly and skipped lunch', 2], ['Good news makes you wait for the catch', 1], ['You like a heads-up before plans change, on every kind of day', 0]] },
        { at: 'Work on it, work with it', k: 'match', q: 'Match each layer to its move.',
          pairs: [['Wiring', 'Work with it, always'], ['Shaped patterns', 'Work on them over time'], ['Today’s conditions', 'Work around them today']] },
        { at: 'Sorting common reactions', k: 'quiz', q: '“Later” quietly disappears. What might help?',
          o: [['A clock time instead of “later,” and a reminder set right then', true, 'Yes! For ADHD time and memory, work with it: a real time and a reminder.'],
              ['Trying harder to remember next time', false, 'Not quite. Pushing against wiring tends to wear you out. A setup that suits it works better.'],
              ['Never agreeing to anything later', false, 'Not quite. You don’t need to avoid it, just give “later” a clock time.']] },
        { at: 'Explaining yourself to others', k: 'gap', q: 'Fill the gap with the page’s own words.',
          s: 'For conditions, one short line covers it: “Today’s a ___ day.”', o: ['low-battery', 'bad', 'lost'], a: 0,
          say: 'Yes, a low-battery day. Naming a time to talk keeps the pause from feeling like a brush-off.' },
        { at: 'Common mix-ups', k: 'flip', q: 'Tap each common mix-up to flip it.',
          cards: [['“Calling it wiring is just an excuse.”', 'An explanation plus a plan is the opposite of an excuse. Repair still matters.', 'Say what you need ahead of time, and what helps.'],
                  ['“You can change anything if you try hard enough.”', 'Effort helps with patterns. Pushing against wiring usually just wears you out.', 'Work with the wiring instead.'],
                  ['“Understanding a pattern should make it go away.”', 'Insight helps, but patterns shift through repeated new experiences.', 'Try one new response, and notice that it goes okay.']] }
      ]
    },

    '/wired-differently-in-depth.html': {
      t: 'Wired Differently (full)', g: 'p4', n: '/check-ins-in-depth.html',
      m: [
        { at: 'The problem runs in both directions', k: 'quiz', q: 'A message goes wrong between two different wirings. What does the page suggest?',
          o: [['Assume two decoders, both partly accurate, and compare notes', true, 'Yes! The breakdown in understanding runs both ways, so nobody opens a case against anyone.'],
              ['Work out which person has trouble communicating', false, 'Not quite. The double empathy idea says the misunderstanding is mutual, not inside one person.'],
              ['Stop talking about anything important', false, 'Not quite. Compare notes instead. Mixed pairs can pass facts along fine.']] },
        { at: 'Three channels', k: 'match', q: 'Match each channel to what it carries.',
          pairs: [['Pace', 'Speed and timing'], ['Register', 'The tone underneath the words'], ['Urgency', 'How soon something matters']] },
        { at: 'Same words, many receivers', k: 'wyr', q: 'You want the kitchen tidied tonight. Would you rather say…',
          o: [['“Can you clean up a bit when you get a chance?”', 'Some hear “today,” some hear “sometime,” and some wonder if you’re upset. It’s easy to miss.'],
              ['“Could you clear the counter and run the dishwasher before 8 tonight?”', 'That’s the page’s clearer version: what, and by when. Almost every wiring gets it.']] },
        { at: 'Ten rules', k: 'sort', q: 'Does this follow the ten rules?', bins: ['Follows the rules', 'Doesn’t'],
          items: [['“Could you pay the bill by Friday?”', 0], ['“It would be nice if someone paid the bill.”', 1, 'Say the request as a request, with a real time.'],
                  ['“You’re so irresponsible.”', 1, 'Describe the behavior, never the person.'], ['“What did you take from that?”', 0], ['A sarcastic joke in a serious talk', 1, 'Leave sarcasm out of anything serious.']] },
        { at: 'Make a Wiring Card', k: 'quiz', q: 'When is the best time to share a Wiring Card?',
          o: [['On an ordinary day, before a hard conversation', true, 'Yes! Tell each other how you’re built before a hard talk, not during one.'],
              ['In the middle of an argument, to prove your point', false, 'Not quite. It isn’t a contract or evidence. Share it on a calm day.'],
              ['Only once, and never update it', false, 'Not quite. It changes with your state. When you’re depleted, every line gets stricter.']] }
      ]
    },

    '/check-ins-in-depth.html': {
      t: 'Check-ins (full)', g: 'p3', n: '/turning-toward-in-depth.html',
      m: [
        { at: 'Ground rules', k: 'sort', q: 'Before a check-in, sort your list into three piles.', bins: ['Today', 'A system problem', 'Can wait'],
          items: [['Something that will still be wrong tomorrow if you don’t touch it', 0], ['The trash has no owner and keep getting missed', 1, 'That goes to WP-03 or the weekly review, not into a speech.'],
                  ['A real worry about the holidays, with a date to look at it', 2], ['A task with no owner', 1]] },
        { at: 'The setting has to be right', k: 'quiz', q: 'Which of these is a check-in, not an ambush?',
          o: [['“Can we use twenty minutes at 8, after dinner, for the kitchen thing?”', true, 'Yes! Named in advance, one topic, and a time when nobody is rushing out.'],
              ['Bringing it up while they’re walking out the door', false, 'Not quite. A hard topic squeezed in before someone leaves teaches people to rush or to hide.'],
              ['Raising it in front of the kids so it gets settled', false, 'Not quite. Private first. Children pick up the tension even when the words are careful.']] },
        { at: 'Acknowledgment, before any answer', k: 'gap', q: 'Fill the gap with the page’s own word.',
          s: '“I hear you, but…” The “but” deletes the sentence in front of it. If you need a second sentence, use “___.”', o: ['and', 'however', 'actually'], a: 0,
          say: 'Yes, “and.” Acknowledgment is proof of receipt, not agreement.' },
        { at: 'How to rebut', k: 'wyr', q: 'You have a fact they may not know. Would you rather say…',
          o: [['“I hear you, but you never notice what I did do.”', 'That erases the mirror and turns one event into a verdict.'],
              ['“I got the part about the dishes. My part: I said I’d do them and didn’t. What I want on the record is that I did the lunch boxes.”', 'That keeps it: their fact survives, you own your part, and you add one fact.']] },
        { at: 'How to build the talking notes', k: 'slider', q: 'Drag to see how the load note reads your list.', label: 'Sentences you plan to say',
          min: 1, max: 4, step: 1, start: 1, fmt: 'int',
          zones: [[1, 'Light', 'One sentence. A good size for a check-in.', '🪶'],
                  [2, 'Can fit', 'Two can fit if both are small and you’re both settled.', '🙂'],
                  [3, 'Getting heavy', 'Keep the sentence that, if settled, makes the others smaller.', '🎒'],
                  [4, 'A list', 'Four is a list, not a conversation. Park the rest with a date.', '📋']], need: 3 }
      ]
    },

    '/library.html': {
      t: 'The Professor’s Library', g: 'harbor', n: '/library/fairness.html',
      m: [
        { at: 'The themes', k: 'quiz', q: 'What is the Library?',
          o: [['General education about how people tend to think, feel and get along', true, 'Yes! It says where the evidence is strong, and where it’s thin or argued about.'],
              ['A place to get a diagnosis', false, 'Not quite. It isn’t diagnosis, therapy or treatment, and it can’t know your situation.'],
              ['A list of rules to win arguments with', false, 'Not quite. Treat every idea as something to talk about, not a rule to win with.']] },
        { at: 'The Five Pillars, and how', k: 'pillar', q: 'Each example shows something someone does. Which pillar is it using?',
          items: [['You start counting the planning and remembering you do, not just the chores people can see.', 1, 'Yes, Pillar I, See the whole load. The thinking and remembering is real work too.'],
                  ['When something keeps getting missed, you give it a clear owner instead of blaming someone.', 2, 'Yes, Pillar II, Fix the setup. Change the arrangement, not the person.'],
                  ['Before deciding a comment was rude, you check how tired or stressed you already are.', 3, 'Yes, Pillar III, Read your state first. How full your battery is changes how things sound.'],
                  ['You and a friend who talks very differently agree on how to say “I need a minute.”', 4, 'Yes, Pillar IV, Tune how you send and receive. You found words you both hear the same way.'],
                  ['You notice that jobs nobody claimed keep ending up with the same person.', 5, 'Yes, Pillar V, Notice the quiet incentives. Unclaimed jobs drift, usually to one person.']] },
        { at: 'How to tie any topic', k: 'gap', q: 'Fill the gap with the page’s own word.',
          s: 'Research describes ___ across many people. You and the people you live with are not ___.', o: ['averages', 'rules', 'guarantees'], a: 0,
          say: 'Yes, averages. Use what fits, and question what doesn’t.' }
      ]
    },

    '/learn/index.html': {
      t: 'Stories from Philosophy', g: 'harbor', n: '/five-pillars.html',
      m: [
        { at: 'Start with yourself', k: 'quiz', q: 'In the story of the second arrow, what is the second arrow?',
          o: [['The story you add about what happened', true, 'Yes! The event hurts once, and the story you tell about it hurts again.'],
              ['A second thing going wrong the same day', false, 'Not quite. The second arrow is the meaning you add, not another event.'],
              ['The other person’s reply', false, 'Not quite. The second arrow comes from inside. Their reply is theirs to look after.']] },
        { at: 'both be right about different parts', k: 'wyr', q: 'You and a sibling remember a holiday very differently. Would you rather…',
          o: [['Explain what they must have meant', 'That fills in their side for them, like describing the whole elephant from one leg.'],
              ['Ask what they noticed, and listen', 'That’s the lesson: you’re each touching a different part. Ask, and listen.']] },
        { at: 'Closeness is a distance', k: 'flip', q: 'Tap each card to flip it.',
          cards: [['“Needing warmth is clingy.”', 'Needing warmth isn’t clingy.', 'Say what closeness looks like for you this week.'],
                  ['“Needing room is cold.”', 'Needing room isn’t cold.', 'Try: “I need an hour to myself, then I’d love to catch up.”'],
                  ['The porcupines', 'They huddle for warmth, pull apart when the quills prick, and find a middle distance.', 'Talk about the distance that suits you both.']] },
        { at: 'The ledger serves the person', k: 'sort', q: 'Which line belongs in the ledger?', bins: ['What happened', 'What I’m telling myself it means'],
          items: [['“The dishes were in the sink at 7.”', 0], ['“They don’t respect me.”', 1, 'That’s the story you add. Only the first line belongs in the ledger.'],
                  ['“I did the school run three days this week.”', 0], ['“Nobody here cares how tired I am.”', 1]] }
      ]
    },

    '/library/fairness.html': {
      t: 'Fairness and the load', g: 'p1', n: '/library/communication.html',
      m: [
        { at: 'Cognitive labor', k: 'sort', q: 'Which stage of the thinking work is this?', bins: ['Anticipate', 'Identify', 'Decide', 'Monitor'],
          items: [['Noticing the kids will need new shoes soon', 0], ['Looking up three shoe stores and their prices', 1], ['Choosing the pair', 2], ['Checking later that they still fit', 3]] },
        { at: 'Why we each think we do more', k: 'quiz', q: 'When two people each estimate their share of the housework, the totals usually…',
          o: [['Add up to more than 100 percent', true, 'Yes! We remember our own efforts more easily, so we overestimate our share without meaning to.'],
              ['Add up to exactly 100 percent', false, 'Not quite. Memory tilts toward our own work, so the totals go over.'],
              ['Add up to less than 100 percent', false, 'Not quite. It runs the other way. A shared log gently corrects it.']] },
        { at: 'Gatekeeping', k: 'wyr', q: 'Your partner packs the lunches for the first time, and the sandwich isn’t how you’d make it. Would you rather…',
          o: [['Redo it and explain the right way', 'Next time they may not bother, and you end up doing everything again.'],
              ['Let them own the method, within “good enough”', 'That’s gate opening: handing over a job means handing over the method too.']] },
        { at: 'The default person', k: 'quiz', q: 'How do you change who the “default person” is?',
          o: [['Give the other person whole areas to own, update the contact lists, and let things wobble while they learn', true, 'Yes! Deliberate steps, and a little patience while the new owner settles in.'],
              ['Wait for them to notice on their own', false, 'Not quite. Default status feeds itself. The default knows more, so they get asked more.'],
              ['Keep doing it, but complain about it', false, 'Not quite. That keeps the setup the same. Moving whole areas to a new owner changes it.']] }
      ]
    },

    '/library/communication.html': {
      t: 'Talking and listening', g: 'p4', n: '/library/conflict.html',
      m: [
        { at: 'I-statements', k: 'sort', q: 'A real I-statement, or a you-statement in disguise?', bins: ['A real I-statement', 'A you-statement in disguise'],
          items: [['“I felt worried when you were late and didn’t text.”', 0], ['“I feel that you are selfish.”', 1, 'It starts with “I,” but it’s a judgment about the person.'],
                  ['“Here’s how it landed for me.”', 0], ['“I feel like you never think about me.”', 1]] },
        { at: 'Validation', k: 'quiz', q: '“It makes sense you’re frustrated; you were expecting help and it didn’t come.” Is that agreeing?',
          o: [['No. It says the reaction is understandable, and you can still have your own view', true, 'Yes! Validation isn’t agreement. It lowers the temperature fast.'],
              ['Yes, it means you admit you were wrong', false, 'Not quite. Validation says their reaction makes sense, not that you agree with every conclusion.'],
              ['It’s the same as saying “don’t be so sensitive”', false, 'Not quite. That one is invalidation, and it often makes the feeling stronger.']] },
        { at: 'Why tone gets lost in text', k: 'wyr', q: 'A text from a friend reads a little cold. Would you rather…',
          o: [['Assume they’re annoyed and reply coldly too', 'The reader fills the gaps with their own mood. That’s where misunderstandings begin.'],
              ['Ask: “Did you mean that as a joke?”', 'That’s the page’s tip: hold interpretations lightly, and asking is kinder than assuming.']] },
        { at: 'Complaints versus criticism', k: 'sort', q: 'Complaint or criticism?', bins: ['Complaint', 'Criticism'],
          items: [['“I was frustrated the trash weren’t taken out last night.”', 0], ['“You never take responsibility for anything.”', 1, '“Never” turns one event into a verdict.'],
                  ['“What kind of person forgets that?”', 1], ['“The sink was full this morning. Could we sort it by 9?”', 0]] },
        { at: 'Advice or support', k: 'quiz', q: 'A friend tells you about a rough day. What’s the simple, powerful habit?',
          o: [['Ask whether they want solutions or to be heard', true, 'Yes! Offering the wrong one can feel like not being listened to.'],
              ['Give three solutions right away', false, 'Not quite. Some people want to be heard first. Asking takes one line.'],
              ['Change the subject to cheer them up', false, 'Not quite. That can feel dismissive. Ask what kind of support they want.']] }
      ]
    },

    '/library/conflict.html': {
      t: 'Conflict and how to resolve it', g: 'p4', n: '/library/connection.html',
      m: [
        { at: 'Interests versus positions', k: 'sort', q: 'Position or interest?', bins: ['Position (what I want)', 'Interest (why I want it)'],
          items: [['“I want the window open.”', 0], ['Fresh air', 1], ['“The dishes need doing straight after dinner.”', 0], ['Not waking up to a messy kitchen', 1], ['Needing to rest after a long day', 1]] },
        { at: 'One topic at a time', k: 'quiz', q: 'Mid-talk about the school run, “and last month you…” comes up. What helps?',
          o: [['Park it on a list for its own time', true, 'Yes! Parking isn’t dismissing. It says that matters too, and deserves its own time.'],
              ['Deal with everything now, while you’re at it', false, 'Not quite. That’s kitchen-sinking. Each extra item widens the argument until nothing can be settled.'],
              ['Pretend it never came up', false, 'Not quite. Park it with a plan to come back, so it doesn’t keep flooding in.']] },
        { at: 'Intent and impact', k: 'wyr', q: 'Something you said came across as dismissive. Would you rather open with…',
          o: [['“I didn’t mean it that way.”', 'Leading with intent tends to sound like a defense, and the hurt can feel denied.'],
              ['“I can see that came across as dismissive, and I’m sorry it hurt.”', 'Impact first, then intent if needed. Both can be true.']] },
        { at: 'What makes an apology work', k: 'sort', q: 'Does this help an apology, or undo it?', bins: ['Helps', 'Undoes it'],
          items: [['Owning what you did', 0], ['Offering to put it right', 0], ['“I’m sorry if you were offended.”', 1, 'That focuses on their reaction, not on what you did.'], ['“I’m sorry, but…”', 1], ['Listening first, then apologizing', 0]] }
      ]
    },

    '/library/connection.html': {
      t: 'Kindness and connection', g: 'p5', n: '/turning-toward.html',
      m: [
        { at: 'Gratitude in relationships', k: 'quiz', q: 'Which thank-you does the most?',
          o: [['“Thank you for sorting out the car insurance; I know that was tedious.”', true, 'Yes! Specific thanks is recognition and gratitude in one, and it helps both people.'],
              ['“Thanks for everything.”', false, 'Not quite. Warm, but a specific thank-you shows the effort was seen.'],
              ['Saving thanks for birthdays', false, 'Not quite. Everyday moments of gratitude are the ones linked with feeling closer.']] },
        { at: 'Responding to good news', k: 'sort', q: 'Your friend got the job. Which kind of response is this?', bins: ['Active-constructive', 'Something else'],
          items: [['“That’s brilliant! Tell me how it happened!”', 0], ['“That’s nice.”', 1, 'Quiet support is kind, but it leaves people feeling less understood.'],
                  ['“That’ll mean more work.”', 1], ['“What’s for dinner?”', 1], ['Putting your phone down and asking questions', 0]] },
        { at: 'Rituals of connection', k: 'quiz', q: 'Why do small rituals matter most in busy seasons?',
          o: [['They don’t depend on having free time', true, 'Yes! A ninety-second check-in or a goodnight message keeps connection going when other things are crowded out.'],
              ['They have to be big and planned', false, 'Not quite. Rituals are small, repeated moments, like a goodbye or a Sunday walk.'],
              ['They replace talking about problems', false, 'Not quite. They sit alongside everything else, and build a sense of shared life.']] }
      ]
    }
  },

  // The order new explorers are nudged through when a page has no "next" of its own
  order: ['/five-pillars.html', '/start-here.html', '/how-it-works.html', '/book/preface.html', '/book/chapter-1.html', '/know-yourself.html',
    '/workpapers/wp-01.html', '/book/chapter-2.html', '/book/chapter-3.html', '/workpapers/wp-02-battery-stress-meter.html', '/wp-11.html',
    '/check-ins.html', '/book/chapter-4.html', '/workpapers/wp-03-raci-treaty.html', '/wired-differently.html', '/frequency-framework.html',
    '/workpapers/wp-09-tone-filter.html', '/turning-toward.html', '/workpapers/wp-13-pll-protocol.html', '/book/chapter-5.html',
    '/workpapers/wp-04-deficit-audit.html', '/relationships.html']
};
