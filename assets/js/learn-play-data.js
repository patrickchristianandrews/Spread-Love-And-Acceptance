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
              ['Because it only takes a few seconds', false, 'Close! Here’s the twist: the page says it goes unseen because it doesn’t look like a task, not because it’s small.'],
              ['Because nobody else cares', false, 'Close! Here’s the twist: nobody is the villain. People usually just can’t see it yet.']] },
        { at: 'Fix the setup, not the person', k: 'wyr', q: 'The bins get missed every week. Would you rather…',
          o: [['Say “you never remember”', 'That starts a round about someone’s character. The bins still have no owner, so next week looks the same.'],
              ['Give the bins one owner and a Tuesday reminder', 'That’s Pillar II: the setup changes, nobody gets blamed, and the bins start going out.']] },
        { at: 'Read your state first', k: 'slider', q: 'Drag your energy level and see how “What’s for dinner?” lands.', label: 'Energy left in your battery',
          min: 0, max: 100, step: 5, start: 85, fmt: 'pct',
          zones: [[30, 'Running on empty', '“What’s for dinner?” sounds like criticism. Try “give me twenty minutes,” then come back.', '🪫'],
                  [65, 'Revved up or tired', 'It sounds a bit pointed. A slow breath helps you hear it as a question.', '⚡'],
                  [100, 'Calm and charged', 'It lands as just a question. Easy to answer, maybe even fun.', '🔋']] },
        { at: 'Tune how you send and receive', k: 'quiz', q: 'You text “ok.” and mean “fine, thanks.” Your sister reads “I’m upset with you.” Who got it wrong?',
          o: [['Nobody. You’re tuned to different stations', true, 'Exactly. A mismatch is a tuning problem, not a moral failing, and you can learn each other’s station.'],
              ['You, for using a period', false, 'Ha, close! Here’s the twist: the page says neither of you did anything wrong.'],
              ['Your sister, for reading too much into it', false, 'Close! Here’s the twist: nobody is wrong. You can each learn how the other hears things.']] },
        { at: 'Notice the quiet incentives', k: 'gap', q: 'Fill the gap with the page’s own word.',
          s: 'Whoever notices the milk is low first ends up buying it, every time. Nobody chose that. It ___.', o: ['drifted', 'was planned', 'was a test'], a: 0,
          say: 'Yes, it drifted. A named owner and a specific thank-you stop the drift.' },
        { at: 'How they fit together', k: 'pillar', q: 'Which pillar is this?',
          items: [['Writing down one week of who did what', 1], ['Giving the school forms one owner', 2], ['Saying “give me twenty minutes” before a hard talk', 3],
                  ['Swapping “you always” for one fact and one ask', 4], ['Noticing a job always lands on whoever sees it first', 5]] }
      ]
    },

    '/five-pillars-in-depth.html': {
      t: 'The Five Pillars (full)', g: 'harbor', n: '/start-here.html',
      m: [
        { at: 'See the whole load', k: 'quiz', q: 'A score says who is winning. What does a ledger say?',
          o: [['What is there', true, 'Yes. A ledger gives a picture you both agree on, not a verdict.'],
              ['Who is winning', false, 'Close! That’s a score. Here’s the twist: a ledger just says what is there.'],
              ['Who owes whom', false, 'Close! Looking back at who owes whom is scorekeeping. A ledger shows what is there, so you can plan.']] },
        { at: 'Fix the setup, not the person', k: 'flip', q: 'Tap each common mix-up to flip it.',
          cards: [['“So nobody is responsible.”', 'The opposite. A good setup makes responsibility clear: one named owner. It removes blame, not accountability.', 'Name one owner for one job this week.'],
                  ['“Fixing the setup means a big overhaul.”', 'Usually it means one small change you keep: a reminder, a handoff or a single owner.', 'Pick the smallest change that would help.'],
                  ['“Pausing means avoiding.”', 'A pause has a time to come back. Without one, it feels like a door closing.', 'Try: “Can we pick this up at eight?”']] },
        { at: 'Notice the quiet incentives', k: 'quiz', q: 'A roommate buys the toilet paper once, then again. Now it’s “their job.” What turns the drift back into a choice?',
          o: [['A named owner, a kind no, or a rotation', true, 'Yes! Any of those gives the choice back.'],
              ['Buying extra, just to be safe', false, 'Close! Here’s the twist: doing more deepens the drift. Naming it gives the choice back.'],
              ['Deciding they’re taking advantage', false, 'Close! Here’s the twist: drift happens between kind people because nobody chose. No villain needed.']] },
        { at: 'How they fit together', k: 'pillar', q: 'Which pillar is this?',
          items: [['Two coworkers each list a week of follow-ups and notes', 1], ['One person owns the grocery list, another owns the shop', 2],
                  ['A friend’s one-word reply reads as “annoyed” on an empty battery', 3], ['Agreeing “we’ll decide on Sunday” about the holiday', 4],
                  ['A sibling who always drives Mom started with one “I’ll just do it”', 5]] },
        { at: 'How they lean on each other', k: 'match', q: 'Match each pairing to what it means.',
          pairs: [['I → II', 'You can’t redesign what you can’t see'], ['II ↔ V', 'A named owner removes the quiet pull'],
                  ['III → IV', 'State comes before signal'], ['V → I', 'Thanks keeps the unseen work visible']] },
        { at: 'Inside you, then between you', k: 'quiz', q: 'For caregivers, which pillars lead?',
          o: [['III and I: your battery and the load you carry', true, 'Yes! Then Pillar II shares the care out, with one owner per part.'],
              ['II and V', false, 'Close! Here’s the twist: II and V lead for coworkers and teams.'],
              ['IV on its own', false, 'Close! IV often leads for families. Caregivers start with III and I.']] }
      ],
      e: [
        { f: 'A ledger does one thing well', s: 'A ledger is just a shared list of what really happened, with no judging.', x: 'Two roommates each list a week of chores, then read both lists together.' },
        { f: 'Systems thinking looks at how a result is produced', s: 'When the same problem keeps happening, look at how things are set up before looking at the people.', x: 'The recycling keeps getting forgotten because the bin lives in the garage, not because anyone is careless.' },
        { f: 'Signal theory describes what happens', s: 'Two people running at slightly different speeds make “static,” even when nobody did anything wrong.', x: 'One of you wants to decide tonight, the other needs until Sunday. Agreeing on Sunday clears it.' },
        { f: 'Behavioral economics studies how defaults', s: 'Small defaults quietly decide things for us, like whoever notices a job first keeping it forever.', x: 'You bought the coffee filters once. Now everyone assumes it’s your job.' }
      ]
    },

    '/start-here.html': {
      t: 'Start here', g: 'harbor', n: '/how-it-works.html',
      m: [
        { at: 'Four questions', k: 'sort', q: 'Which of the four questions does this answer?', bins: ['What happened?', 'What state?', 'Who was responsible?', 'What was meant?'],
          items: [['“I did the dishes four nights this week.”', 0], ['“I was running on empty before you even spoke.”', 1],
                  ['“The bins are mine on the job list.”', 2], ['“I meant it as a reminder, not a complaint.”', 3]] },
        { at: 'How it works, in order', k: 'quiz', q: 'One of you is running hot. Which step comes first?',
          o: [['Regulate first, with the Calm-Down Kit', true, 'Yes! Nobody solves a relationship problem while overloaded. Calm first, then owners and words.'],
              ['Sort out ownership with the RACI Treaty', false, 'Close! Here’s the twist: the Calm-Down Kit comes before steps 3 and 4.'],
              ['Measure it with the Solvency Read', false, 'Close! Measuring comes once there are numbers. When someone is running hot, calming down comes first.']] },
        { at: 'Where to start', k: 'match', q: 'Match each workpaper to the question it answers.',
          pairs: [['WP-01 · Field Audit', 'What is actually happening?'], ['WP-02 · Battery & Stress Meter', 'What state are we each bringing?'],
                  ['WP-03 · RACI Treaty', 'Who is actually responsible for what?'], ['WP-09 · Tone Filter', 'How do I say what I actually mean?']] },
        { at: 'What TOL-OS is', k: 'sort', q: 'Is it, or isn’t it?', bins: ['It is', 'It isn’t'],
          items: [['A shared record of the household’s work', 0], ['A compatibility test or relationship score', 1], ['A daily habit for catching small problems early', 0],
                  ['A way to prove who’s right', 1], ['A way to find problems that are structural, not personal', 0]] }
      ]
    },

    '/how-it-works.html': {
      t: 'How it works', g: 'harbor', n: '/know-yourself.html',
      m: [
        { at: 'wiring is information', k: 'quiz', q: 'According to this page, your wiring is…',
          o: [['Information, not a flaw', true, 'Yes! Knowing yours helps you explain it to the people around you.'],
              ['A flaw to fix', false, 'Close! Here’s the twist: wiring is information, not a flaw.'],
              ['The same for everyone', false, 'Close! Every brain handles stress, noise and conversation differently. Some reset in minutes, others need hours.']] },
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
        { at: 'Layer three', k: 'sort', q: 'Which layer is it most likely? (Only you can sort your own, so these are common guesses.)',
          bins: ['Wiring (stays)', 'Learned pattern (can soften)', 'Today’s conditions (pass)'],
          items: [['Needs things in writing', 0], ['Snaps when hungry', 2], ['An alarm that goes off early, left over from years ago', 1],
                  ['Short on sleep after a late night', 2], ['A habit of pleasing people', 1]] },
        { at: 'Work on it, work with it', k: 'match', q: 'Match each layer to its move.',
          pairs: [['A learned pattern', 'Work on it, slowly and kindly'], ['Your wiring', 'Work with it: build a setup that suits you'],
                  ['Today’s conditions', 'Work around it: eat first, sleep on it, talk tomorrow']] },
        { at: 'Where is this feeling coming from', k: 'quiz', q: 'You’ve named the feeling (“tight, annoyed, a bit scared”). What’s the next question?',
          o: [['Is this the size of the moment, or does it feel older?', true, 'Yes! Chapter III calls it leftover stress versus this-moment stress.'],
              ['Who caused this?', false, 'Close! Here’s the twist: the self-check looks inward first. Size, then layer, then what it needs.'],
              ['How do I hide it?', false, 'Close! Here’s the twist: the goal is to understand the feeling, not hide it.']] },
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
              ['The more sensitive person', false, 'Close! Here’s the twist: a mix-up usually runs both ways.'],
              ['Whoever spoke first', false, 'Close! Here’s the twist: it isn’t one person’s fault. Both receivers are doing their best.']] },
        { at: 'find the word', k: 'wyr', q: 'Your friend feels plenty but can’t find the word. Would you rather ask…',
          o: [['“How does that make you feel?”', 'For some people this feels like a quiz with no right answer.'],
              ['“More like tired, or more like annoyed? Space or company?”', 'Asking about the body or actions gives them something easy to hold on to.']] },
        { at: 'relationship changes how words land', k: 'quiz', q: 'Between co-parents, a hint can feel like…',
          o: [['Someone is keeping notes', true, 'Yes. The same hint between friends risks only a little awkwardness.'],
              ['A fun guessing game', false, 'Ha, close! Here’s the twist: between co-parents, a hint can feel like someone is keeping notes.'],
              ['Nothing at all', false, 'Close! Here’s the twist: the relationship changes how the same words land.']] },
        { at: 'setting matters', k: 'quiz', q: 'One of you needs closeness and the other needs space. What helps?',
          o: [['Say you’re not leaving, name a clock time, and come back', true, 'Yes! Both needs get cared for.'],
              ['Sort it out now, in the group chat', false, 'Close! Here’s the twist: a group chat or a 1 a.m. text can’t hold a hard talk.'],
              ['Whoever needs space just goes', false, 'Close! Going without a time can feel like a door closing. Name when you’ll be back.']] },
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
              ['Silence', false, 'Close! Here’s the twist: nearly matched stations make static, not silence.'],
              ['A lovely duet', false, 'Ha! Close, but nearly matched stations crackle.']] },
        { at: 'five rhythms', k: 'match', q: 'Match each rhythm to what it’s about.',
          pairs: [['Money', 'When bills and pay land'], ['Rest', 'How long you need to settle after stress'], ['Decisions', 'Minutes or weeks'],
                  ['Talking', 'How often you need to check in'], ['Values', 'How often you ask if you’re headed the same way']] },
        { at: 'lives in the gap', k: 'slider', q: 'Drag the gap between two rest rhythms and listen for the static.', label: 'Gap between your rhythms',
          min: 0, max: 100, step: 5, start: 5, fmt: 'none',
          zones: [[20, 'A tiny gap', 'Barely any static. A quick “give me five” covers it.', '📻'],
                  [60, 'A medium gap', 'Some crackle: one wants to talk now, the other needs a bit of quiet.', '〰️'],
                  [100, 'A big gap', 'Loud static: one feels left alone, the other feels rushed. Nobody is wrong. The rhythms just don’t match.', '⚡']] },
        { at: 'change your speed', k: 'wyr', q: 'Saturday morning. You want to decide about the holiday now. They want a few days. Would you rather…',
          o: [['Push to decide now', 'The gap stays loud, and one of you feels rushed.'],
              ['Agree: “We’ll decide on Sunday.”', 'You both keep your speed and agree when you’ll meet. The static goes.']] }
      ]
    },

    '/check-ins.html': {
      t: 'Check-ins', g: 'p3', n: '/turning-toward.html',
      m: [
        { at: 'One topic', k: 'quiz', q: 'Halfway through, a second topic pops up. Now what?',
          o: [['Jot it down for another day', true, 'Yes! One topic keeps you on the same side.'],
              ['Bring it in while you’re at it', false, 'Close! Here’s the twist: two topics at once turns into a tangle.'],
              ['Drop the first topic', false, 'Close! Stay with the one you agreed on, and jot the new one down.']] },
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
              ['A quiet “mm” without looking up', false, 'Close! Here’s the twist: “mm” lets the tiny moment slip by. Saying when you can listen keeps the door open.'],
              ['Nothing. It’s too small to matter', false, 'Close! Here’s the twist: these tiny moments add up to most of your time together.']] },
        { at: 'Say thank you, specifically', k: 'wyr', q: 'Would you rather hear…',
          o: [['“Thanks for everything.”', 'Nice! But it doesn’t show what they noticed.'],
              ['“Thanks for handling the school forms. I know that ate your whole lunch break.”', 'This one proves they noticed. Specific thanks is how invisible effort gets seen.']] },
        { at: 'good news', k: 'quiz', q: '“I got the promotion!” Which reply helps you feel closest?',
          o: [['“No way! What did your boss say?”', true, 'Yes! Match their excitement and ask one question. Save the “buts” for another day.'],
              ['“Does it pay more? Isn’t the commute awful?”', false, 'Close! Practical worries are usually meant kindly. Here’s the twist: save them for tomorrow.'],
              ['“Oh, nice.” and back to your phone', false, 'Close! Warm but quiet. Tonight, try one excited question.']] },
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
              ['Point out that the other side has a point', false, 'Close! Here’s the twist: in this talk, the listener is on the speaker’s side.'],
              ['Solve it, fast', false, 'Close! Don’t problem-solve unless asked. Try “Do you want ideas, or do you want me to just listen?”']] },
        { at: 'Small rituals', k: 'gap', q: 'Fill the gap with the page’s own word.',
          s: 'A ritual that only happens when things are good isn’t a ___ yet.', o: ['ritual', 'habit', 'holiday'], a: 0,
          say: 'Yes! Keep rituals small enough to survive a bad week.' },
        { at: 'wired differently', k: 'quiz', q: 'Bids and warmth look different for different wiring. What’s the fix?',
          o: [['Ask each other, and write the answers down', true, 'Yes! The Wiring Card is a good place to keep them.'],
              ['Assume the quiet one doesn’t care', false, 'Close! Here’s the twist: someone may show care through practical help or shared interests instead of small talk.'],
              ['Stop making bids', false, 'Close! Keep reaching. Just learn what counts as a bid for each of you.']] }
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
              ['Proof they’re the problem', false, 'Close! Here’s the twist: a quick check can show it was leftover stress.'],
              ['Nothing worth noticing', false, 'Close! It’s worth a quick check of your own state.']] },
        { at: 'Co-parents', k: 'gap', q: 'Fill the gap with the page’s own word.',
          s: 'On exchange day, keep handoffs short: times, bags, school things. Kids are never the ___.', o: ['messengers', 'owners', 'referees'], a: 0,
          say: 'Yes. Short, steady handoffs, and the grown-ups carry the messages.' },
        { at: 'Roommates need', k: 'pillar', q: 'Which pillar is this?',
          items: [['Listing the week’s tasks so everyone sees the same thing', 1], ['Giving trash, bills and cleaning a named owner', 2],
                  ['Checking your own battery before a handoff', 3], ['Testing your opening line in the Signal Translator', 4], ['Noticing that one friend always does the planning', 5]] },
        { at: 'At work', k: 'quiz', q: 'At work, these tools are for…',
          o: [['Peers who agree to use them', true, 'Yes! Among peers who agree, never as a way to rate anyone.'],
              ['Rating someone’s performance', false, 'Close! Here’s the twist: never use them to rate anyone.'],
              ['Keeping notes on a coworker', false, 'Close! Here’s the twist: they’re for peers who agree, not for keeping notes on anyone.']] },
        { at: 'Caregiving', k: 'quiz', q: 'Running near empty as a caregiver is a sign to…',
          o: [['Get more support', true, 'Yes. It’s a sign to get more support, not a personal failing.'],
              ['Try harder on your own', false, 'Close! Here’s the twist: give each part of the care one owner, and ask for one specific help.'],
              ['Keep it quiet', false, 'Close! Try asking for one specific help, like “Could you do Thursday’s drive?”']] }
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
              ['A big pile of effort', false, 'Close! Here’s the twist: done well, nothing seems to happen.'],
              ['A reason to say thanks every time', false, 'Close! You can only thank someone for work you’ve seen, and this work hides.']] },
        { at: 'your own side', k: 'sort', q: 'Keeping score, or sharing the picture?', bins: ['Keeping score', 'Sharing the picture'],
          items: [['Each person writes only their own side', 1], ['Bringing out a private list mid-argument', 0], ['Reading both lists together', 1], ['Proving who does more', 0]] },
        { at: 'any shared life', k: 'quiz', q: 'Common mix-up: “It has to be exactly 50/50.” True?',
          o: [['No. The goal is a split you can both see and agree to', true, 'Yes! Not a perfect half. A split you both see and choose.'],
              ['Yes, to the minute', false, 'Close! Here’s the twist: the goal is a shared picture, not a perfect half.']] }
      ]
    },

    '/book/chapter-1.html': {
      t: 'Chapter I: Why we get out of tune', g: 'p4', n: '/book/chapter-2.html',
      m: [
        { at: 'Nearly in step', k: 'quiz', q: 'When do two radios whistle at each other?',
          o: [['When they’re close but not quite matched', true, 'Yes! That’s why people who know each other well can still clash.'],
              ['When they’re on very different stations', false, 'Close! Here’s the twist: far-apart stations don’t whistle. Nearly matched ones do.'],
              ['When one radio is broken', false, 'Close! Here’s the twist: two radios that work fine still crackle if they’re slightly off.']] },
        { at: 'Three things knock', k: 'sort', q: 'Pace, tone or urgency?', bins: ['Pace', 'Tone', 'Urgency'],
          items: [['“When you get a chance” means tonight to one person, next week to the other', 2], ['A simple update heard as a complaint', 1],
                  ['Talking fast and jumping in', 0], ['A long pause heard as a snub', 0]] },
        { at: 'Get back in tune', k: 'gap', q: 'Fill the gap with the book’s own word.',
          s: 'Say it out loud: “I think we’re out of ___.”', o: ['sync', 'milk', 'time'], a: 0,
          say: 'Yes! Then check how wound up you feel, slow down, and only then go back to the topic.' },
        { at: 'clear sentence', k: 'match', q: 'Match each part of the sentence you go back in with.',
          pairs: [['The fact', '“The bins go out Wednesday morning.”'], ['How you feel', '“I get anxious when it’s late.”'], ['What you’d like', '“Could you do it tonight?”']] },
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
              ['Yes, it raises the number', false, 'Close! Here’s the twist: it raises the number and changes nothing at home.']] },
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
        { at: 'Both views can be true', k: 'quiz', q: 'Same pile of post, two pictures. What’s the better question?',
          o: [['“Which angle are you seeing this from?”', true, 'Yes! You can both be right about what you see.'],
              ['“Who’s right?”', false, 'Close! Here’s the twist: you may just be standing at different angles.'],
              ['“Why can’t you see it?”', false, 'Close! Here’s the twist: they can see it, from a different angle.']] },
        { at: 'A full tank means', k: 'gap', q: 'Fill the gap with the book’s own word.',
          s: 'A full tank means “___,” not “never.”', o: ['later', 'right now', 'whatever'], a: 0,
          say: 'Yes! Say when you’ll come back. The Calm-Down Kit can help in the meantime.' }
      ]
    },

    '/book/chapter-4.html': {
      t: 'Chapter IV: Two kinds of fair', g: 'p5', n: '/book/chapter-5.html',
      m: [
        { at: 'two kinds of fair', k: 'sort', q: 'Fair by results, or fair by promises?', bins: ['Fair by results', 'Fair by promises'],
          items: [['“It all got done. Who cares who did it?”', 0], ['“You said you’d handle the bins.”', 1], ['Whoever’s free does it', 0], ['A fixed rota', 1]] },
        { at: 'Once a job has an owner', k: 'quiz', q: 'The bins are yours on the job list. Someone quietly covered for you. Judged by promises, what now?',
          o: [['It’s your job, so it’s worth a kind word and a look at the setup', true, 'Yes. Looking to the owner protects the person who keeps filling the gaps.'],
              ['It got done, so all good', false, 'Close! That’s fair by results. Here’s the twist: once a job has an owner, look to the owner.']] },
        { at: 'Covering is kind', k: 'wyr', q: 'You did the bins while they were away. Would you rather…',
          o: [['Say nothing', 'Kind, but silent help turns into unseen work.'],
              ['Say “I did the bins this week, as you were away.”', 'A note, not a complaint. Now the help is seen.']] },
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
              ['A fluke', false, 'Close! One miss looks like a fluke. Here’s the twist: four in a row is a pattern.'],
              ['Someone’s fault', false, 'Close! Here’s the twist: it’s a pattern in the setup, not a verdict on anyone.']] },
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
              ['With the longest list of misses', false, 'Close! Here’s the twist: start with something that went well.'],
              ['By adding up old hours', false, 'Close! Here’s the twist: past hours are never charged to anyone.']] }
      ]
    },

    /* ------------------------------------------------------------ the book, full */
    '/book/preface-in-depth.html': {
      t: 'Preface (full): Unbilled Debt', g: 'p1', n: '/book/chapter-1-in-depth.html',
      m: [
        { at: 'Unbilled debt: the work', k: 'quiz', q: 'In a business, an unbilled hour is…',
          o: [['Work done but never written on an invoice', true, 'Yes! At home it’s the same: the work was real, it just never made it onto the page.'],
              ['An hour off', false, 'Ha, close! Here’s the twist: it’s work that was done, just never written down.'],
              ['A late payment', false, 'Close! Here’s the twist: nobody even knows it’s owed, because it was never written down.']] },
        { at: 'kinds of unseen work', k: 'match', q: 'Match each kind of unseen work to an example.',
          pairs: [['Noticing', 'The bin is full, the shoes are too small'], ['Remembering', 'Birthdays, bin day, which form is due'],
                  ['Planning and deciding', 'What to cook, which plumber to call'], ['Checking', 'Making sure it happened, and following up'], ['Smoothing', 'Keeping the peace, cheering someone up']] },
        { at: 'other person doesn', k: 'quiz', q: 'In a well-known 1979 study, couples each estimated their share of household jobs. The two answers often added up to…',
          o: [['More than 100 percent', true, 'Yes! Nobody was lying. We each remember our own effort more easily.'],
              ['Exactly 100 percent', false, 'Close! Here’s the twist: the totals often went over 100, because we remember our own effort best.'],
              ['Less than 50 percent', false, 'Close! Here’s the twist: they added up to more than 100, not less.']] },
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
              ['An echo', false, 'Close! Here’s the twist: it’s a heterodyne, a brand-new tone from the two signals mixing.'],
              ['Feedback', false, 'Close! Here’s the twist: it’s called a heterodyne, or a beat.']] },
        { at: 'What sets the frequency', k: 'match', q: 'What was said, and how it was heard. Match them up.',
          pairs: [['“The sink’s full again.”', 'Meant as an update, heard as “You never wash up.”'], ['“Can we talk about the holiday?”', 'Meant as this week, heard as right now'],
                  ['“I’ll do it later.”', 'Meant as this evening, heard as maybe never']] },
        { at: 'How stress changes', k: 'sort', q: 'Which everyday state is this?', bins: ['Calm and connected', 'Revved up', 'Running on empty'],
          items: [['You can hear something hard without getting defensive', 0], ['Small things feel urgent or personal', 1], ['Words are hard to find, and replies get short', 2], ['Pace speeds up, tone gets sharper', 1]] },
        { at: 'Retuning, step by step', k: 'quiz', q: 'What is always the last retuning step?',
          o: [['Go back to the topic', true, 'Yes! The topic still matters. You come back when you can both hear properly.'],
              ['Drop the topic for good', false, 'Close! Here’s the twist: retuning always ends by going back to the topic.'],
              ['Decide who caused the static', false, 'Close! Here’s the twist: nobody has to be wrong. Retuning, not blame, clears it.']] },
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
          o: [['0.80', true, 'Yes! 8 ÷ 10 = 0.80.'], ['0.20', false, 'Close! That’s the unowned part. Here’s the twist: count the jobs with both names.'],
              ['8', false, 'Close! Here’s the twist: divide by all the jobs on the list, so 8 ÷ 10.']] },
        { at: 'The formula, in plain language', k: 'slider', q: 'Keep balance at 0.60 and stress at 0.40, like Sam and Alex. Now slide the ownership score.', label: 'Ownership clarity',
          min: 0, max: 1, step: 0.05, start: 0.8, fmt: 'solv',
          zones: [[0, 'No owners at all', 'The result is about 0.39: the kind-rethink band.', '🌧️'],
                  [0.85, 'Some owners', 'The result sits in the middle band, 0.40 up to 0.70: something is drifting.', '⛅'],
                  [1, 'Almost every job owned', 'Now the result reaches 0.70 or more: the setup is carrying its own weight.', '🌤️']] },
        { at: 'start with the shortfall', k: 'quiz', q: 'Sam and Alex’s biggest shortfall was balance (0.16). Where do they start?',
          o: [['With balance, often by giving a job a clear owner', true, 'Yes! The shortfall, not the total, is the part you can act on.'],
              ['With the total score', false, 'Close! Here’s the twist: the shortfall shows where one change helps most.'],
              ['With whichever person scored lower', false, 'Close! Here’s the twist: it reads the setup, never a person.']] }
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
                  ['Saturation', 'How full something is, like a sponge that can’t take any more water.', 'Picture that sponge after a long day.']] },
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
              ['One of them is lying', false, 'Close! Here’s the twist: each one describes what he touches honestly.'],
              ['The elephant keeps moving', false, 'Ha! Close. Here’s the twist: each thinks his part is the whole.']] },
        { at: 'What a high reading asks', k: 'quiz', q: 'After a round of calming steps, your battery reads 0.45. Now what?',
          o: [['Go back at the time you said', true, 'Yes! Under 0.50, you go back as planned.'],
              ['Do another round', false, 'Close! Here’s the twist: another round is for 0.50 to 0.60.'],
              ['Skip the talk for good', false, 'Close! Here’s the twist: a high reading means later, never never.']] }
      ],
      e: [
        { f: 'Parts of that theory are still debated', s: 'The three states are handy everyday labels, not medical facts.', x: '“I’m running on empty” is enough. No science words needed.' },
        { f: 'is a direction', s: 'The seven angles are seven different spots you might be looking at a moment from.', x: 'You see the pile of post as a to-do list. They see it as “I’m always the one who opens it.”' },
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
              ['Just how it is', false, 'Close! Here’s the twist: repeats are a signal worth noticing.'],
              ['Proof the owner doesn’t care', false, 'Close! Here’s the twist: it’s a fact about the job, never a verdict on the person.']] },
        { at: 'notice, name, decide', k: 'gap', q: 'Fill the gap with the book’s own word.',
          s: 'Gating isn’t bottling things up. It’s about ___: letting the spike pass before deciding how much weight a comment deserves.', o: ['timing', 'winning', 'forgetting'], a: 0,
          say: 'Yes! Timing. The Calm-Down Kit helps the spike pass, and WP-09 helps with the reply.' },
        { at: 'flat thank-you', k: 'wyr', q: '“Thanks for doing the bins,” said flatly. Would you rather…',
          o: [['Snap back: “I do them every week, you know.”', 'Now there’s an argument about tone, and nobody remembers it started with a thank-you.'],
              ['“That landed a bit oddly for me. Give me a second.”', 'After a breath: “Did you mean that as a thank-you?” “Yes, sorry, I’m worn out.” Over in ten seconds.']] }
      ],
      e: [
        { f: 'Philosophers call this deontological', s: 'Fair by promises means asking: did each person do the jobs they said they would?', x: 'You said you’d take Tuesday’s bins, so Tuesday’s bins are yours.' },
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
        { at: 'What a gap looks like', k: 'quiz', q: '“The bins have quietly become nobody’s job for three months.” That’s…',
          o: [['A deficit: a job that keeps producing the same miss', true, 'Yes! That’s where unbilled debt grows fastest.'],
              ['An event', false, 'Close! One missed Tuesday is an event. Here’s the twist: a deficit keeps coming back.'],
              ['Nothing to notice', false, 'Close! Here’s the twist: this is exactly what the look-back is for.']] },
        { at: 'Step two: sort each repeat', k: 'match', q: 'Match each kind of gap to what you do about it.',
          pairs: [['Structural gap', 'Update the WP-03 list and both initial it'], ['Capacity issue', 'Book an honest, kind conversation'], ['One-off', 'Note it and move on']] },
        { at: 'How to talk about a pattern', k: 'wyr', q: 'Would you rather say…',
          o: [['“You never do the bins.”', 'A pattern said as a verdict gets argued with.'],
              ['“The bins have slipped four weeks running. What’s getting in the way on Tuesdays?”', 'A pattern said as a repeated fact can get an owner.']] },
        { at: 'What the look-back is for', k: 'quiz', q: 'Does the look-back add up hours that were “owed”?',
          o: [['No. It only fixes the setup going forward', true, 'Yes! Billing for old hours just turns a look-back into a grievance.'],
              ['Yes, to settle up fairly', false, 'Close! Here’s the twist: those hours are gone. The question is where the setup failed.']] }
      ],
      e: [
        { f: 'In accounting, a deficit is a shortfall', s: 'Here a “deficit” is a job that keeps falling short, and the “audit” is a friendly monthly look.', x: 'The recycling overflowing every other week is a deficit.' },
        { f: 'A single missed job is an event', s: 'One miss is a blip. The same miss month after month is a gap in the setup.', x: 'Bins missed once: a blip. Bins missed every Tuesday for three months: a gap.' },
        { f: 'A falling number of structural gaps', s: 'If fewer jobs are missing an owner each month, the setup is getting better.', x: 'Three gaps in March, one in April: it’s working.' }
      ]
    },

    /* ------------------------------------------------------------ workpapers */
    '/workpapers/wp-01.html': {
      t: 'WP-01: Who did what', g: 'p1', n: '/workpapers/wp-02-battery-stress-meter.html',
      m: [
        { at: 'Write down the week', k: 'quiz', q: 'Who fills in each side of the log?',
          o: [['Each of you writes only your own side', true, 'Yes! You’re the only expert on your own week.'],
              ['Whoever does more fills in both', false, 'Close! Here’s the twist: nobody fills in the other person’s side.']] },
        { at: 'log the small jobs', k: 'gap', q: 'Fill the gap with the sheet’s own word.',
          s: 'For every task, note the day, what it was, who did it, roughly how many ___, and whether someone asked for it.', o: ['minutes', 'feelings', 'complaints'], a: 0,
          say: 'Yes! Those minutes go into the Lemonade Stand and CALC-01.' },
        { at: 'Log what happened', k: 'quiz', q: 'You noticed the full bin three times before taking it out. How many rows?',
          o: [['One honest row', true, 'Yes! One honest row, not three rows of resentment.'],
              ['Three rows', false, 'Close! Here’s the twist: log what happened, once.']] },
        { at: 'Say no in three', k: 'flip', q: 'Say no in three calm steps. Tap each one.',
          cards: [['1. Why it’s fair', 'Show you see the request is reasonable.', '“That’s a fair thing to ask.”'],
                  ['2. What you have left', 'Be honest about what you have right now.', '“I’m pretty full tonight.”'],
                  ['3. Something instead', 'Another time, another person, or part of the job.', '“Could I do it tomorrow at nine?”']] },
        { at: 'Pick the kind', k: 'sort', q: 'Which kind of “not now” is it?', bins: ['Capacity check', 'Delegation pivot', 'Time commitment'],
          items: [['“I’m already full tonight.”', 0], ['“Your brother knows that app better. Could he help?”', 1], ['“Yes, and I can do it Saturday morning.”', 2]] }
      ]
    },

    '/workpapers/wp-02-battery-stress-meter.html': {
      t: 'WP-02: How full is your battery?', g: 'p3', n: '/wp-11.html',
      m: [
        { at: 'before a hard conversation', k: 'quiz', q: 'This check is…',
          o: [['A simple gut-check', true, 'Yes! Kind and quick, and not a medical test.'],
              ['A medical test', false, 'Close! Here’s the twist: it’s a gut-check, not a medical test.'],
              ['A way to score the other person', false, 'Close! Here’s the twist: each of you scores only yourself.']] },
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
              ['The other person, when they get upset', false, 'Close! Here’s the twist: it’s only ever about you.']] },
        { at: 'Decide now', k: 'gap', q: 'Fill the gap with the kit’s own words.',
          s: 'Your stepping-away sentence says how you feel, how long, and ___.', o: ['when you’ll be back', 'who started it', 'what they did wrong'], a: 0,
          say: 'Yes! A time to come back means a break is never mistaken for walking out.' },
        { at: 'In the moment', k: 'quiz', q: 'Which of these is one of the kit’s calming steps?',
          o: [['Breathe in for four, out for six', true, 'Yes! Or a slow walk.'],
              ['Rehearse your comeback', false, 'Ha, close! Here’s the twist: pick something that settles your body, like a slow walk.'],
              ['Scroll the news', false, 'Close! Here’s the twist: pick a step that brings you down, like slow breathing.']] },
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
        { at: 'Change it on purpose', k: 'wyr', q: 'Life changed, and the bins no longer fit your week. Would you rather…',
          o: [['Let the other person quietly pick them up', 'That’s drift: one person quietly doing more.'],
              ['Raise it at the weekly closing and both initial the change', 'Changed on purpose, not by drift.']] },
        { at: 'Signing means', k: 'quiz', q: 'Initialing the list says…',
          o: [['We agree who owns what, as written', true, 'Yes! Clear, not perfect.'],
              ['Every job feels perfectly fair', false, 'Close! Here’s the twist: signing means clear, not perfect.']] },
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
              ['A list of complaints', false, 'Close! Here’s the twist: bring the logs, not the grievances.'],
              ['Just your memory', false, 'Close! Here’s the twist: memories blur. The logs keep it fair.']] },
        { at: 'List the jobs that slipped', k: 'gap', q: 'Fill the gap with the sheet’s own word.',
          s: 'Three or four checks in a month is a real pattern, not a ___.', o: ['fluke', 'crime', 'test'], a: 0,
          say: 'Yes! A pattern, and patterns can be fixed in the setup.' },
        { at: 'Sort each repeat', k: 'sort', q: 'Which kind of repeat is it?', bins: ['Update WP-03', 'Kind, honest talk', 'Note it and move on'],
          items: [['The named owner isn’t the one doing it', 0], ['The owner can’t keep up', 1], ['It slipped during a week of illness', 2]] },
        { at: 'Nobody owes anything', k: 'quiz', q: 'A job with no owner is…',
          o: [['A gap in the list', true, 'Yes! Not a judgment on whoever kept covering it.'],
              ['Someone’s fault', false, 'Close! Here’s the twist: nobody owes anything. It’s a gap in the list.']] }
      ]
    },

    '/workpapers/wp-09-tone-filter.html': {
      t: 'WP-09: Say it so it lands', g: 'p4', n: '/workpapers/wp-13-pll-protocol.html',
      m: [
        { at: 'own next message', k: 'quiz', q: 'Whose messages does the Tone Filter check?',
          o: [['Your own next message', true, 'Yes! Each of you uses it on yourself.'],
              ['The other person’s texts', false, 'Close! Here’s the twist: nothing is recorded, and nobody else’s voice is analyzed.']] },
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
              ['A kind of knot', false, 'Ha! Close. Here’s the twist: it’s a circuit that keeps two signals in step.'],
              ['A long weekly meeting', false, 'Close! Here’s the twist: small and often beats big and rare.']] },
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
    }
  },

  // The order new explorers are nudged through when a page has no "next" of its own
  order: ['/five-pillars.html', '/start-here.html', '/how-it-works.html', '/book/preface.html', '/book/chapter-1.html', '/know-yourself.html',
    '/workpapers/wp-01.html', '/book/chapter-2.html', '/book/chapter-3.html', '/workpapers/wp-02-battery-stress-meter.html', '/wp-11.html',
    '/check-ins.html', '/book/chapter-4.html', '/workpapers/wp-03-raci-treaty.html', '/wired-differently.html', '/frequency-framework.html',
    '/workpapers/wp-09-tone-filter.html', '/turning-toward.html', '/workpapers/wp-13-pll-protocol.html', '/book/chapter-5.html',
    '/workpapers/wp-04-deficit-audit.html', '/relationships.html']
};
