/* creator-kb.js — what Tide knows. Tide is the little helper on the About page that answers questions about
   Christian, the creator, and only about Christian: their story, their way of thinking, and how the program
   grew out of it. Every answer here comes from the About pages and the polymath page, in Christian's own words
   where possible. Tide never guesses and never answers about anything else.

   To teach Tide something new, add an entry to `entries` below:
     id  a short name
     k   words and phrases people might type (lowercase; the more specific, the better)
     a   the answer, one paragraph per string
     l   optional links: [label, path]
     f   optional follow-up questions, shown as chips
   Nothing anyone types to Tide is sent anywhere or kept. */
window.TOL_CREATOR_KB = {
  name: 'Tide',
  hello: 'Hi, I’m Tide. Ask me anything about Christian, who made this site: their story, how they think, and how the program grew out of it. I only know about Christian, and what you type stays on your device.',
  starters: ['Who is Christian?', 'Is Christian a polymath?', 'Which fields did Christian study?', 'How does Christian think differently?', 'How did the program come from Christian’s life?'],
  entries: [
    { id: 'tide', k: ['who are you', 'what are you', 'what is tide', 'why tide', 'your name', 'are you a person', 'are you real', 'are you ai', 'are you a bot', 'what can you do', 'what do you know', 'help'],
      a: ['I’m Tide, a small helper that only knows about Christian, the creator of Spread Love & Acceptance and The Objective Ledger. I answer from what Christian has shared on the About pages and the polymath page, and nothing else.', 'I work entirely on your device: what you type isn’t sent anywhere, and it’s gone when you leave the page. For questions about the tools, the book or a situation you’re in, Professor Puddles on the Ask page is the one to talk to.'],
      l: [['Ask Professor Puddles about the program', '/ask.html']],
      f: ['Who is Christian?', 'Is Christian a polymath?'] },

    { id: 'who', k: ['who is christian', 'who made', 'who created', 'who built', 'who wrote', 'who is the creator', 'who is the founder', 'the creator', 'the founder', 'the author', 'about christian', 'tell me about christian', 'who is behind', 'who runs', 'who are they', 'creator', 'founder', 'christian'],
      a: ['Christian is the founder of Spread Love & Acceptance and the creator of The Objective Ledger. Christian worked as a government auditor and audit manager, and has spent a lifetime trying to understand how people work. The program grew out of both.', 'Christian is a polymath: someone who has studied many fields deeply (psychology, philosophy, behavioral science, neurobiology, economics, business, finance, holistic therapies and aromatherapy) and looks for the places where they meet. Christian is also autistic, with OCD, ADHD and anxiety, and has built the site around what that wiring taught them.'],
      l: [['About Christian', '/about.html'], ['The full story', '/about.html']],
      f: ['What did Christian do for work?', 'Is Christian a polymath?', 'Why did Christian make this site?'] },

    { id: 'career', k: ['job', 'work', 'for work', 'do for work', 'what did christian do', 'what does christian do', 'what did they do', 'what do they do', 'career', 'auditor', 'audit', 'audits', 'auditing', 'government', 'tax', 'internal controls', 'compliance', 'profession', 'what do they do', 'for a living', 'audit manager', 'background', 'experience'],
      a: ['Christian built a career as a government auditor and audit manager, specializing in tax enforcement, internal controls and compliance. In Christian’s words, the work “came down to one job: finding the objective truth inside complex systems that are hard to see into.”', 'That audit lens is the thread through the whole program. An audit doesn’t ask whether people are good. It asks whether the system produces reliable results, where the controls are missing, and what the evidence actually supports. Turning that lens on a household is the premise of The Objective Ledger.'],
      l: [['Where it started', '/about.html#the-mandate']],
      f: ['How did audit shape the tools?', 'Which fields did Christian study?'] },

    { id: 'polymath', k: ['polymath', 'polymaths', 'renaissance', 'many fields', 'many subjects', 'lots of subjects', 'so many things', 'generalist', 'jack of all trades', 'many interests', 'study everything', 'why so many'],
      a: ['Yes. Christian is a polymath: someone who learns deeply across many fields and lets them talk to each other. Christian studied psychology, philosophy, behavioral science, neurobiology, economics, business, finance, alternative holistic therapies and aromatherapy, on top of a career in audit.', 'In Christian’s words: “I didn’t study nine fields because I was collecting credentials. I studied them because each one held a piece of a problem I was living inside, and none of them held the whole thing. The framework is what happened when the pieces were finally laid on the same table.”'],
      l: [['The polymath way: how every field connects', '/polymath.html']],
      f: ['How do the fields connect?', 'What does “a new dimension” mean?'] },

    { id: 'connect', k: ['connect', 'connected', 'connection between', 'tie together', 'ties together', 'tie in', 'universal', 'universally', 'rooted', 'roots', 'same root', 'everything is connected', 'all connected', 'patterns', 'same patterns', 'intersect', 'intersection', 'overlap', 'how do the fields', 'link between'],
      a: ['Christian’s view is that the different fields are branches of the same few roots. The same patterns keep turning up everywhere, just in different clothes: balance (what flows in and out), signal and noise (what’s meant and what arrives), feedback loops, limited capacity, ownership and structure, quiet incentives, and the state and setting you’re in.', 'A ledger, a nervous system and a conversation look nothing alike, but each one has a limited capacity, each one sends signals that can get lost in noise, and each one stays healthy only when what goes out is matched by what comes back. Seeing those shared roots is what let Christian join nine fields into one program.'],
      l: [['Try connecting two fields yourself', '/polymath.html#connect']],
      f: ['What does “a new dimension” mean?', 'How did the fields become the Five Pillars?'] },

    { id: 'dimension', k: ['new dimension', 'dimension', 'elevation', 'elevate', 'transform', 'transformation', 'higher', 'bigger picture', 'zoom out', 'whole picture'],
      a: ['It’s Christian’s way of describing what happens when fields meet. One field on its own is like a line: you can go back and forth along it. Two fields together make a flat map. Many fields together give you depth, a space you can move around in and see from new angles.', 'The Objective Ledger is built in that third dimension. An accounting idea (a ledger) meets nervous-system science (a battery) and communication (a signal), and something appears that none of them had alone: a way to see the whole load, read your state first and say it kindly. Elevation here doesn’t mean more information. It means a higher place to stand, where you can see how the pieces connect.'],
      l: [['The polymath way', '/polymath.html#dimension']],
      f: ['How do the fields connect?', 'What are the Five Pillars?'] },

    { id: 'fields', k: ['fields', 'what did christian study', 'which fields', 'subjects', 'studied', 'study', 'education', 'learn', 'learned', 'nine inputs', 'nine fields', '9 fields', 'curriculum', 'degree', 'school'],
      a: ['Christian studied nine fields “almost obsessively”, each for a reason: psychology, philosophy, behavioral science, neurobiology, economics, business, finance, alternative holistic therapies and aromatherapy. Audit work is the thread that holds them together.', 'Each field became part of the program. Psychology became the Tone Filter (WP-09), behavioral science the 90-second check-in (WP-13), neurobiology the Battery & Stress Meter (WP-02), economics the Deficit Audit (WP-04), business and audit “One owner per job” (WP-03), and finance the ledger itself.'],
      l: [['The nine inputs', '/about.html#curriculum']],
      f: ['How did psychology shape the program?', 'How did neurobiology shape the program?', 'How did audit shape the tools?'] },

    { id: 'psychology', k: ['psychology', 'psych', 'tone filter', 'wp-09', 'wp 09', 'intent and impact', 'neutral refusals'],
      a: ['Christian spent years being told their intent and their impact were different things, without anyone able to say where the gap was opening. Psychology gave Christian the vocabulary for masking, for what it costs to perform “normal” on top of an already overloaded system, and for why a clear, well-meant sentence can still land as an attack.', 'It became the Tone Filter (WP-09): the fact, feeling, ask structure exists because Christian needed a way to send what they actually meant. The Neutral Refusals in WP-01 came from the same place: a way to say no that doesn’t read as rejection.'],
      l: [['WP-09: Say it so it lands', '/workpapers/wp-09-tone-filter.html']], f: ['How did philosophy shape the program?'] },

    { id: 'philosophy', k: ['philosophy', 'epistemology', 'ethics', 'how we know', 'verdict engine', 'deontological', 'chapter iv'],
      a: ['Philosophy is the discipline Christian returns to most, especially epistemology, the study of how we know what we claim to know. In Christian’s words: “In a conflict, almost nothing being asserted is actually knowledge. It’s inference, memory, and pattern-matching, all wearing the costume of fact.” Ethics did the other half: it set what a ledger is not allowed to do.', 'That’s why the program scores an arrangement, never a person, and why each person’s needs carry equal weight as a starting principle (Chapter IV’s Deontological Parity).'],
      l: [['The nine inputs', '/about.html#curriculum']], f: ['How did behavioral science shape the program?'] },

    { id: 'behavioral', k: ['behavioral science', 'behavioural science', 'behavior', 'willpower', 'habits', 'discipline', 'check-in', 'check in', 'wp-13', 'phase-locked loop', '90 second', 'ninety second'],
      a: ['Christian’s hardest lesson here: willpower collapses exactly when you need it most. Every resolution evaporated the moment Christian was depleted. What survived wasn’t discipline. It was structure that didn’t need discipline to run.', 'It became the 90-second daily check-in (WP-13): deliberately too small to skip, because small and frequent beats big and rare. In Christian’s words: “A system that only works when both people are at their best isn’t a system.”'],
      l: [['WP-13: the 90-second check-in', '/workpapers/wp-13-pll-protocol.html']], f: ['How did neurobiology shape the program?'] },

    { id: 'neuro', k: ['neurobiology', 'nervous system', 'neuroscience', 'brain science', 'autonomic', 'battery', 'stress meter', 'wp-02', 'shutting down', 'shut down', 'revved up'],
      a: ['Christian calls this the field that “explained me to myself.” Learning how the autonomic nervous system (the automatic part that runs stress and rest) controls our state ended years of Christian treating their own responses as character defects. Shutting down isn’t a choice, and getting revved up isn’t aggression. It also explained why the same sentence can land three different ways depending on the state someone is in that day.', 'It became the self-check in Today’s Weather and the Battery & Stress Meter (WP-02), and the pillar “read your state first.”'],
      l: [['Today’s Weather', '/quick-checks.html#today'], ['WP-02: the Battery & Stress Meter', '/workpapers/wp-02-battery-stress-meter.html']], f: ['How did economics shape the program?'] },

    { id: 'economics', k: ['economics', 'economy', 'capacity', 'unbilled debt', 'deficit audit', 'wp-04', 'safety margin', 'incentives', 'quiet incentives'],
      a: ['Economics is the study of finite capacity and what it costs to allocate it. It gave Christian words for something they could feel but never name: that noticing, remembering and anticipating are real spending, drawn from a real and limited account, adding up whether or not anyone records them.', 'It became the Preface’s idea of unbilled debt, the monthly Deficit Audit (WP-04), the idea of a safety margin, and the pillar “notice the quiet incentives.”'],
      l: [['The Preface: unbilled debt', '/book/preface.html']], f: ['How did business shape the program?'] },

    { id: 'business', k: ['business', 'ownership', 'owner per job', 'one owner', 'raci', 'wp-03', 'who owns', 'departments'],
      a: ['Audit work taught Christian that most operational failure isn’t incompetence. It’s unclear ownership. Work that belongs to everyone belongs to no one, and it quietly lands on whoever notices first. Christian watched this happen in departments, and lived it at home.', 'It became “One owner per job” (WP-03, the RACI Treaty), lifted almost directly from internal controls practice: one named person per recurring task, with ownership changed on purpose and in writing, never by silent default.'],
      l: [['WP-03: One owner per job', '/workpapers/wp-03-raci-treaty.html']], f: ['How did finance shape the program?'] },

    { id: 'finance', k: ['finance', 'bookkeeping', 'double entry', 'double-entry', 'ledger', 'solvency', 'accounting', 'why a ledger', 'objective ledger name', 'why is it called'],
      a: ['Finance is Christian’s professional native language. Double-entry bookkeeping carries a quiet philosophical claim: every entry has two sides, and a book that only balances from one direction isn’t balanced at all.', 'It became the ledger framing of the whole program, and the Solvency Read in Chapter II. Both carry the caveat that took Christian longest to learn: the number describes the arrangement, never the people inside it.'],
      l: [['The full story', '/about.html#curriculum']], f: ['How did holistic practice shape the program?'] },

    { id: 'holistic', k: ['holistic', 'alternative', 'body first', 'soundscape', 'soundscapes', 'self-care', 'self care', 'routines', 'calm down first', 'grounded'],
      a: ['Christian turned to holistic practice when thinking-based approaches stopped being enough: they worked beautifully at the level of thought and did nothing when Christian’s system was already past its limit. Holistic practice starts with the body instead of the argument, and it’s how Christian keeps their balance now.', 'It became Brain Breakers and a rule that runs through the whole program: calm down first, talk second. The audio is always optional, because, as Christian puts it, “a practice that becomes another obligation has already stopped working.”'],
      l: [['Brain Breakers', '/soundscapes.html']], f: ['How did aromatherapy shape the program?'] },

    { id: 'aroma', k: ['aromatherapy', 'smell', 'scent', 'scents', 'senses', 'sensory', 'sensory gating', 'setting', 'light and noise'],
      a: ['For Christian’s sensory profile, scent is one of the quickest ways they’ve found to shift their state without changing their circumstances: a practical tool in the personal routine that keeps them steady, not a pleasant extra.', 'It became the Sensory Gating half of Chapter IV: the setting of a conversation isn’t neutral background. Light, noise and scent all shift what each person can take in, so choosing where and when to talk is part of the method.'],
      l: [['The nine inputs', '/about.html#curriculum']], f: ['How does Christian think differently?'] },

    { id: 'wiring', k: ['autistic', 'autism', 'adhd', 'ocd', 'anxiety', 'neurodivergent', 'neurodiverse', 'neurodiversity', 'wiring', 'wired', 'diagnosis', 'spectrum', 'different language', 'level 1', 'asperger'],
      a: ['In Christian’s words: “My brain speaks a different language than most. My diagnosis is autism spectrum disorder, level 1. The level is not a grade and not a measure of ability.” Level 1 is the lightest of the three support levels, and covers roughly what used to be called Asperger’s.', 'Christian’s wiring also includes OCD, ADHD and anxiety. In practice, the social rules most people absorb without noticing had to be learned on purpose, and noise, sudden change and unstructured conversation cost more. Christian is clear that it’s a different way of working, not a better one: “Put them together and between them they see most of it.”'],
      l: [['A different language', '/about.html#different-language'], ['Wired Differently', '/wired-differently.html']],
      f: ['Is Christian gifted?', 'What is the constant audit?', 'What was masking like for Christian?'] },

    { id: 'gifted', k: ['gifted', 'twice exceptional', '2e', 'genius', 'smart', 'intelligent', 'iq', 'above the line'],
      a: ['Christian is also gifted, which, in their words, “sits alongside the rest rather than canceling any of it out.” The combination is called twice exceptional. It explains what confused people for years: the same person can work well above the line in one area and need real support in another, on the same afternoon. Both are true at once, and neither is the whole picture.', 'Pointed at the right thing, it finds the control that was never there in a broken process, the assumption nobody checked in an argument, and the reason the same disagreement keeps coming back in the same shape.'],
      l: [['A different language', '/about.html#different-language']],
      f: ['What is the constant audit?', 'How does Christian think differently?'] },

    { id: 'constant-audit', k: ['constant audit', 'never switches off', 'auditing the room', 'sensory', 'senses', 'notice everything', 'what it gives', 'what it costs', 'volume dial', 'overwhelm', 'loud places'],
      a: ['Christian describes a part of them that never switches off: wherever they are, some part of them is auditing the room. The temperature, the light, a hum from a vent, who is standing where, a picture half an inch off level. In their words, “It is not vigilance and it is not anxiety. It is simply the resolution I receive at.”', 'It gives pattern recognition, vivid appreciation, early warning and deep focus. It costs fast fatigue, ordinary places like supermarkets that hurt, and a mind that never clocks off. “Both columns are the same mechanism.” What Christian can do is spend that attention on purpose, and protect it where it simply drains.'],
      l: [['The Constant Audit', '/about.html#constant-audit']],
      f: ['What was masking like for Christian?', 'How did the program come from Christian’s life?'] },

    { id: 'audit-cycle', k: ['audit cycle', 'control', 'controls', 'complacency', 'corrective action', 'compliance', 'harmony', 'no news is good news', 'we have always done it this way', 're-test', 'follow up'],
      a: ['From Christian’s audit work: find what’s actually true, then the risks, then the failures, then the real question, which is never “who let this happen” but which control broke, or which was never there. “A control is just an agreement. How a thing gets done, who owns it, and how anyone would notice if it stopped.”', 'Most of the time the cause wasn’t fraud or laziness but complacency, and “no news is not good news.” Then comes a corrective plan and, months later, going back to check that it held. The goal is compliance, which only means things working the way everyone already agreed, and harmony on the other side. Christian looks at a home the same way.'],
      l: [['The Mandate', '/about.html#the-mandate'], ['One owner per job (WP-03)', '/workpapers/wp-03-raci-treaty.html']],
      f: ['What did Christian do for work?', 'How did audit shape the tools?'] },

    { id: 'masking', k: ['masking', 'mask', 'hiding', 'hide', 'pretend', 'pretending', 'exhaustion', 'exhausted', 'invisible cost', 'cost', 'fit in'],
      a: ['Since childhood, Christian absorbed the unspoken message that it wasn’t okay to just be themselves. Christian spent years masking (hiding) their neurodivergence to make everyone else comfortable, and gave up their own identity and peace to do it. Running a very fast mind while pretending to be wired like everyone else led to deep exhaustion.'],
      l: [['The invisible cost', '/about.html#invisible-cost']], f: ['How did Christian drop the mask?', 'How did it affect Christian’s relationships?'] },

    { id: 'relationships', k: ['relationships', 'relationship', 'friends', 'lonely', 'loneliness', 'misread', 'misunderstood', 'directness', 'direct', 'static', 'unseen', 'people', 'social'],
      a: ['The exhaustion took its heaviest toll on Christian’s personal life. Making and keeping relationships became a source of constant static. Christian’s directness and quick leaps to the pattern were often misread: Christian meant to offer clarity, honest facts and practical support, and people often heard intensity, aggression or a lack of empathy instead.', 'In Christian’s words: “This constant mistranslation made for a very lonely, painful life. I felt completely unseen, even while standing right in front of people I cared about deeply.” That gap between what’s meant and what’s heard is exactly what tools like the Signal Translator and the Tone Filter were built to close.'],
      l: [['Relational static', '/about.html#relational-static'], ['The Signal Translator', '/signal-translator.html']],
      f: ['How did Christian drop the mask?'] },

    { id: 'unmask', k: ['drop the mask', 'dropping the mask', 'dropped the mask', 'unmask', 'unmasking', 'changed', 'turning point', 'what changed', 'recover', 'clarity', 'stay steady', 'how does christian cope', 'cope'],
      a: ['Looking back, Christian sees that none of that pain was wasted. Through key life events, constant study and the hard lessons of their career, Christian found real clarity: to keep going, they had to drop the mask, stop living for everyone else and start honoring how they are actually built.', 'Today Christian stays steady with self-care routines built around their own sensory and physical needs, including holistic practices that help them feel calm and grounded.'],
      l: [['Dropping the mask', '/about.html#dropping-the-mask']], f: ['Why did Christian make this site?'] },

    { id: 'mission', k: ['why did christian make', 'why make', 'why build', 'why create', 'why this site', 'why does this exist', 'mission', 'purpose', 'goal', 'why', 'spread love and acceptance', 'what is the point'],
      a: ['Christian built Spread Love & Acceptance and The Objective Ledger to use their lived experience to help others map their own realities. In Christian’s words: “I stopped trying to force my brain to run like someone else’s. Instead, I built a life where my true wiring could thrive. My mission is to help you do the same.”'],
      l: [['The mission', '/about.html#the-mission'], ['Start here', '/start-here.html']],
      f: ['How did the program come from Christian’s life?', 'What are the Five Pillars?'] },

    { id: 'program', k: ['program', 'objective ledger', 'framework', 'how did the program', 'tie into', 'ties into', 'come from', 'came from', 'based on', 'how does the site relate', 'tools come from', 'where did the ideas'],
      a: ['The program is Christian’s own life, laid out as tools. Each of the nine fields Christian studied held a piece of a problem Christian was living inside, and each piece became a tool: the Tone Filter from psychology, the check-in from behavioral science, the Battery & Stress Meter from neurobiology, the Deficit Audit from economics, “One owner per job” from business and audit, the ledger itself from finance, and “calm down first” from holistic practice.', 'Audit work holds it all together: look at the system, not the person, and go by what the evidence supports.'],
      l: [['The nine inputs', '/about.html#curriculum'], ['Program overview', '/program-overview.html']],
      f: ['What are the Five Pillars?', 'How did audit shape the tools?'] },

    { id: 'pillars', k: ['five pillars', 'pillars', 'pillar', 'see the whole load', 'fix the setup', 'read your state', 'tune how you send', 'quiet incentives'],
      a: ['Christian’s nine fields meet in the Five Pillars the whole program rests on: see the whole load (ledger accounting), fix the setup, not the person (systems thinking), read your state first (nervous-system science), tune how you send and receive (signal theory) and notice the quiet incentives (behavioral economics).', 'Each pillar is a place where several fields meet, and each one starts inside you before it shows up between you and other people.'],
      l: [['The Five Pillars', '/five-pillars.html'], ['Where the fields meet', '/polymath.html#pillars']],
      f: ['How do the fields connect?'] },

    { id: 'auditlens', k: ['how did audit shape', 'audit shape', 'audit lens', 'audit thread', 'holds them together', 'thread', 'objective truth', 'evidence'],
      a: ['In Christian’s words: “An audit doesn’t ask whether people are good. It asks whether the system produces reliable results, where the controls are missing, and what the evidence actually supports. Turning that lens on a household is the entire premise of The Objective Ledger. The nine fields are where the evidence came from. The audit is what holds them together.”'],
      l: [['The full story', '/about.html']], f: ['Is Christian a polymath?'] },

    { id: 'faith', k: ['god', 'faith', 'religious', 'religion', 'spiritual', 'spirituality', 'angels', 'pray', 'prayer', 'believe', 'blessed'],
      a: ['Christian closes their story with gratitude: “God, thank you for the allowance of the presence of my angels who work so hard; I feel their love every day with every step. I feel blessed, sanctified.”'],
      l: [['The full story', '/about.html']] },

    { id: 'neurotypical', k: ['neurotypical', 'normal people', 'is it only for autistic', 'only for neurodivergent', 'for everyone', 'am i welcome'],
      a: ['The program grew out of Christian’s own wiring, but it’s made for everyone. As Christian says, “being neurotypical is awesome too!” The tools help any two people whose wiring differs, which is nearly everyone, see the same picture and hear each other more clearly.'],
      l: [['Is this for you?', '/is-this-for-you.html']] },

    { id: 'music', k: ['album', 'music', 'echoes of gold', 'songs', 'song', 'sing', 'musician'],
      a: ['Christian made a companion album, Echoes of Gold. In Christian’s words, it “carries what the numbers were never going to reach”: the music that came before the framework.'],
      l: [['Echoes of Gold', '/echoes-of-gold.html']] },

    { id: 'podcast', k: ['podcast', 'kane', 'listen to christian', 'interview'],
      a: ['Christian talks through the ideas behind the program in The Podcast, in friendly conversations with Kane.'],
      l: [['The Podcast', '/podcast-index.html']] },

    { id: 'therapist', k: ['therapist', 'counselor', 'counsellor', 'psychologist', 'licensed', 'qualified', 'credentials', 'certified', 'doctor', 'professional', 'expert'],
      a: ['Christian’s professional background is as a government auditor and audit manager. Christian has studied psychology, neurobiology and the other fields deeply, out of a need to understand how people work rather than to collect credentials.', 'The program is self-help and general guidance. It isn’t counseling or therapy, and it doesn’t replace a qualified professional.'],
      l: [['The full story', '/about.html']] },

    { id: 'contact', k: ['contact', 'email christian', 'reach christian', 'get in touch', 'message christian', 'talk to christian', 'write to'],
      a: ['The Membership page has the way to get in touch with Christian. Joining the free newsletter is also a good way to hear when something new arrives.'],
      l: [['Membership and contact', '/membership.html']] }
  ]
};
