#!/usr/bin/env python3
"""Search discoverability for spreadloveandacceptance.com.

Run from the repo root after pages change:   python3 tools/seo/build_seo.py

What it does (all idempotent; safe to run again and again):
  1. In every page that should be found, writes one block between
     <!-- seo:start --> and <!-- seo:end --> inside <head>: a canonical address, index rules,
     sharing tags (Open Graph and Twitter), theme keywords and schema.org structured data (JSON-LD)
     describing the page as an article, a free web app, a game, the podcast or the site itself.
  2. Tidies titles (no internal "TOL-OS" names; the site name at the end) and fills in missing or
     improved descriptions for the key pages.
  3. Writes robots.txt (everyone welcome), sitemap.xml (with each page's last-changed date from git)
     and llms.txt + llms-full.txt, the plain summaries of the site for programs that read it.
Pages marked noindex, redirects, 404 and offline pages are left alone and kept out of the sitemap.
"""
import html, json, os, re, subprocess, sys, datetime

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
SITE = 'https://spreadloveandacceptance.com'
BRAND = 'Spread Love & Acceptance'
BOOK_NAME = BRAND   # the book series has the site's name
EMAIL = 'spreadloveandacceptance@gmail.com'
OG_IMAGE = SITE + '/assets/img/og-image.png'
LOGO = SITE + '/assets/img/logo-stacked.png'
TAGLINE = 'See it fairly. Say it kindly.'
# IndexNow (Bing, Yandex and others): the key file /<key>.txt sits at the site root. See the owner notes for the ping.
INDEXNOW_KEY = '15557a97dc3839943cb3af516596d103'
# Ownership codes for Google Search Console and Bing Webmaster Tools ("HTML tag" method): paste the content="..." value here
# and rebuild; the tag goes on the home page only. Leave empty when the site is verified another way (DNS or Google Analytics).
SITE_VERIFY = {'google-site-verification': '', 'msvalidate.01': ''}
SKIP_DIRS = ('.claude', '.git', 'node_modules', 'tools', 'manuscript', 'notes', 'infrastructure', 'data', 'assets', '.well-known')
SKIP_FILES = {'404.html', 'offline.html'}

ABOUT_ORG = ('Spread Love & Acceptance is a young, independent start-up building a free, '
             'growing suite of self-help tools for understanding yourself and sharing life kindly with the people '
             'around you. It brings together practical relationship tools, calm games, calm breathing and sound '
             'spaces, and a plain-language library, with new tools and content added all the time. Everything you '
             'type stays on your device.')

BASE_KEYWORDS = ['self-help', 'relationships', 'kindness', 'love', 'appreciation', 'acceptance', 'connection',
                 'communication', 'calm', 'peace', 'harmony', 'reconciliation', 'emotional wellbeing', 'self-discovery',
                 'fairness at home', 'mental load', 'invisible work', 'free self-help tools']
SECTION_KEYWORDS = [
    (r'^(index|start-here|start-in-10|about|how-it-works|is-this-for-you|ways-in|sent-this|program|contents|five-pillars|relationships|self-path|glossary)',
     ['psychology-informed', 'personal growth', 'healthy relationships', 'understanding yourself', 'kind communication', 'couples', 'family', 'friends', 'roommates', 'coworkers', 'caregivers']),
    (r'^book/', ['self-help book', 'relationship book', 'shared household work', 'fairness', 'communication', 'stress and reactions']),
    (r'^library', ['psychology', 'relationship research', 'conflict resolution', 'gratitude', 'self-compassion', 'emotions', 'stress', 'neurodiversity', 'mindfulness']),
    (r'^(night-garden|bears-dojo|calm-visualizer|soundscapes|wp-11-sound|pause-and-play|echoes-of-gold)',
     ['calm', 'relaxation', 'breathing', 'meditation', 'mindfulness', 'peace', 'soundscapes', 'ambient music', 'sound frequencies', 'higher frequency']),
    (r'^frequency-buddies', ['animated stories', 'cartoon for all ages', 'Tidbit and Sugarfoot', 'kindness stories', 'working through tough times together', 'captions']),
    (r'^(frequency-journey|frequency-framework)', ['higher frequency', 'sound frequencies', 'Solfeggio tones', 'harmony', 'being in tune', 'calm arcade game', 'maze game', 'crossing game']),
    (r'^(quiet-words|word-bloom|quiet-crossword|daily-ledger-crossword|quest|keepsakes|garden-backdrop|pal-cam)',
     ['calm games', 'relaxing word games', 'crossword', 'word search', 'cozy games', 'no timers', 'Tidbit and Sugarfoot']),
    (r'^(signal-translator|carrier-wave|conversation-reader|wired-differently|wiring-card|turning-toward|complacency|recheck-drive|check-ins|know-yourself|ask|tools/)',
     ['communication tool', 'tone checker', 'how a message lands', 'repair after an argument', 'reconciliation', 'neurodiversity', 'listening', 'connection']),
    (r'^(workpapers|wp-|calc01|lemonade|quick-checks|full-path|do/|snapshot|dashboard|suite-index|prog-01)',
     ['chore chart', 'fair division of labor', 'household workload', 'mental load worksheet', 'stress check', 'calm-down plan', 'daily check-in', 'free worksheets']),
    (r'^brain-map', ['brain map', 'how the brain differs', 'brain differences', 'autism', 'ADHD', 'anxiety', 'depression', 'PTSD', 'OCD', 'dyslexia', 'neurodiversity', 'mental health', 'what helps']),
    (r'^wavelength', ['communication style quiz', 'personality type quiz', 'neurodivergent', 'ADHD', 'autistic', 'AuDHD', 'how you think, talk and listen', 'self-discovery journal']),
]

# Better titles and descriptions for the pages people are most likely to search for.
OVERRIDE = {
    'index.html': (
        'Spread Love & Acceptance · Free self-help for calm, kind relationships',
        'Free, kind self-help for understanding yourself and the people you love: tools for fair, calm relationships, '
        'kinder conversations and appreciation, calm games, breathing and calm soundscapes. Everything stays on your device.'),
    'start-here.html': (None,
        'New here? Start with the one idea behind Spread Love & Acceptance: understand yourself first, then share the load '
        'kindly. The best first steps, free tools and a six-week path for calmer, kinder relationships.'),
    'five-pillars.html': (None,
        'The five simple ideas behind the program: see the whole load, fix the setup not the person, read your '
        'state first, tune how you send and receive, and notice the quiet incentives. Kindness and fairness, made practical.'),
    'relationships.html': (None,
        'How the program helps every kind of relationship: partners, family, co-parents, friends, roommates, '
        'coworkers and caregivers. Fair ways to share the load, kinder words and calmer check-ins.'),
    'turning-toward.html': (None,
        'Connection is built in small, everyday moments. Seven simple practices for love and appreciation: noticing when '
        'someone reaches for you, specific thanks, celebrating good news and gentle repair after a hard moment.'),
    'complacency.html': (None,
        'Complacency isn’t laziness. It’s what happens when something has worked for a long time and we stop looking. '
        'How it shows up in you, partners, family, friends, roommates and coworkers, and the small re-checks that help.'),
    'pause-and-play.html': (None,
        'Calm games for a busy mind: the Night Garden, the Frequency Journey, Word Bloom, two crosswords and Quiet Words. '
        'No timers and no way to lose, just a peaceful few minutes with Tidbit and Sugarfoot.'),
    'night-garden.html': (None,
        'A peaceful garden at night: breathe slowly with the light to make flowers bloom, guide fireflies into '
        'constellations and stack glowing stones on the pond. A calm, free place for quiet minutes.'),
    'calm-visualizer.html': (None,
        'Drift is a calm visualizer: tell it how you feel, put on headphones and let slow, dreamy visuals and gentle '
        'tones keep you company for a few quiet minutes of breathing and rest.'),
    'soundscapes.html': (None,
        'Brain Breakers: three instrumental pieces you can see and feel, with a big live picture, optional gentle vibration '
        'on phones, and a short picker to find the one that fits how you feel. Music by Christian’s Lab.'),
    'frequency-journey.html': (None,
        'The Frequency Journey: pick Tidbit or Sugarfoot and play a maze chase or a road-and-river crossing, with easy '
        'controls and no game over, and watch the Frequency Buddies cartoon on the same page.'),
    'frequency-buddies.html': (None,
        'Frequency Buddies: gentle animated adventures starring two pups, Tidbit and Sugarfoot, who hit real tough times, '
        'work through them together and come out stronger. About 16 to 17 minutes each, with captions and real, recorded voices.'),
    'ask.html': (None,
        'Chat with Professor Puddles: describe what’s going on in a relationship or ask about any tool, and get kind, '
        'practical next steps and words you could use. Free, private and on your device.'),
    'signal-translator.html': (None,
        'Type a text or message and see how it might land, what the other person may hear, and a kinder, clearer way to '
        'say it. A free tone checker for partners, family, friends and work.'),
    'conversation-reader.html': (None,
        'Paste a text thread or chat into the Conversation Reader and see where it turned, what each of you may be hearing, and calmer replies built '
        'from your own words. A free, private tool for repair and reconciliation.'),
    'library.html': (None,
        'Psychology in plain words: 235 short entries on relationships, conflict and reconciliation, kindness, '
        'gratitude, emotions, stress, calm and differences in wiring, with honest notes on the evidence.'),
    'sent-this.html': (None,
        'Someone sent you Spread Love & Acceptance? Here is what they can and can’t see, what stays yours, and kind ways '
        'to say yes, not yet or no. Nothing is entered about you without you.'),
    'about.html': (None,
        'The story behind Spread Love & Acceptance: a career auditing complex systems, a '
        'lifetime of wondering how people work, and a free, growing suite of tools for kinder relationships.'),
    'legal/privacy-policy.html': ('Privacy Policy', 'How Spread Love & Acceptance handles your information: what you type in the tools stays on your device.'),
    'legal/terms-of-service.html': ('Terms of Service', 'The plain terms for Spread Love & Acceptance: everything on the site is free, what you may print and share, and what the site can and cannot promise.'),
    'legal/refund-policy.html': ('Refund Policy: Nothing Is Sold, Nothing to Refund', 'Everything on Spread Love & Acceptance is free, with no paid version, so there is nothing to refund. What to do if anyone charged you.'),
    'architecture/architecture.html': ('The site’s architecture, in detail', 'The full technical picture of how the site is put together: pages, tools, privacy and how it all connects.'),
    'architecture/index.html': ('How the site is built', 'How the site is designed and built, and why.'),
}

# search-led titles and descriptions: what people type, in plain words (title without the site name)
SEARCH = {
 'index.html': ('Understand Yourself, Understand Each Other: Free Self-Help', 'Free, kind lessons and tools for self-help and healing: how communication, relationships and the mind work, and what to do about it. Private, no sign-up.'),
 'start-here.html': ('Start Here: Fairer, Kinder Relationships, Step by Step', 'New here? The one idea behind it all, the best first tools and a six-week path to fairer chores and kinder conversations at home.'),
 'five-pillars.html': ('The Five Pillars of Fair, Kind Relationships', 'Five simple ideas for fair, kind relationships: see the whole load, fix the setup not the person, read your state first, and tune how you talk.'),
 'relationships.html': ('Relationship Tools for Couples, Family and Roommates', 'Fair ways to share chores, kinder words and calmer check-ins for partners, families, co-parents, friends, roommates, coworkers and caregivers.'),
 'signal-translator.html': ('The Signal Translator: a tone checker for texts', 'The Signal Translator, a free tone checker: type a text or message and see how it may land, what they may hear, and a kinder, clearer way to say it. Private, on your device.'),
 'conversation-reader.html': ('The Conversation Reader: Calm Replies After a Fight', 'Paste a text thread and see where it turned, what each of you may be hearing, and calmer replies in your own words. Free and private.'),
 'turning-toward.html': ('Turning Toward: 7 Small Habits for Closer Relationships', 'Connection grows in small moments. Seven simple practices: notice when someone reaches for you, give specific thanks, and repair gently after a hard moment.'),
 'check-ins.html': ('Relationship Check-Ins: A Simple, Kind Weekly Ritual', 'A short, kind check-in for couples, families and roommates: what went well, what felt heavy, and one small change to try next.'),
 'what-am-i-feeling.html': ('Paint Your Feelings: A Private Map and Painting of Your Feelings', 'Answer gentle questions, one at a time, and see a map of what may be behind how you feel, an abstract painting made from your own answers, and one or two first steps. It runs on your device and sends nothing anywhere.'),
 'quick-checks.html': ('My Weather Today: Daily Mood and Stress Check-In', 'A 60-second check-in on how you’re doing today, with a gentle forecast for hard talks and a calm pause with something soothing to do.'),
 'ask.html': ('Ask Professor Puddles: Free, Private Relationship Help Chat', 'Tell a cheerful raindrop professor what’s going on: kind next steps, words to say, deep talks and infographics. Free, and nothing you type leaves your device.'),
 'library.html': ('Psychology in Plain Words: How Relationships Work', 'Hundreds of plain-language entries on relationships, conflict, kindness, gratitude, emotions, stress, calm and wiring, with honest notes on the evidence.'),
 'pause-and-play.html': ('Relax and Play: Calm Tools and Calm Games, Free', 'Relax and reset with a breathing break, a silent wind-down, slow colors, calm music and sounds, or play a calm game with no timers and no way to lose.'),
 'bears-dojo.html': ('The Bears Dojo: A Calm Temple Garden to Wander Into', 'Wander a quiet temple garden where Tidbit and Sugarfoot tend the grounds, build your own bear, then step inside for gentle things to do. Free, no timers, nothing saved.'),
 'night-garden.html': ('The Night Garden: A Calm Breathing Game', 'A peaceful garden at night: breathe slowly to make flowers bloom, guide fireflies into constellations and stack glowing stones. A free, calm game.'),
 'calm-visualizer.html': ('Drift: A Calm Visualizer With Soft Tones', 'Tell Drift how you feel, put on headphones and let slow, dreamy visuals, kind words and gentle tones keep you company for a few quiet minutes.'),
 'word-bloom.html': ('Word Bloom: A Relaxing Letter-Wheel Word Game', 'A free, calm word game: spin a wheel of letters and find the hidden words. Levels from easy to tricky, no timers and no ads.'),
 'quiet-crossword.html': ('Quiet Crossword: Easy, Gentle Mini Crosswords', 'Small, friendly crosswords with gentle clues, from easy to tricky. Free, calm and no timers: a peaceful puzzle for a few quiet minutes.'),
 'quiet-words.html': ('Quiet Words: A Calm, Free Word Search', 'A calming word search with soft themes, levels from easy to tricky and no timers. Free to play on your phone or computer.'),
 'daily-ledger-crossword.html': ('Daily Crossword Puzzle, Newspaper Style (Free)', 'A free newspaper-style crossword with fair, friendly clues. Play in your browser on any device, at your own pace.'),
 'frequency-journey.html': ('Tidbit and Sugarfoot’s Arcade: Six Calm Classic Games', 'Play as Tidbit or Sugarfoot in six calm classic games: a maze chase, a road-and-river crossing, a wagon-trail journey, a brick breaker, a catching game and a Home Run Derby. Easy touch controls, a relaxed pace and no game over.'),
 'coin-pusher.html': ('Kindness Coin Pusher', 'A cozy coin pusher with 50 collectibles to find, cabinet looks to earn and a tip jar of short, useful tips. Free, private, nothing to buy.'),
 'the-logic-behind-it.html': ('The Logic Behind It: Why a Reaction Makes Sense', 'Why a reaction that looks odd, rude or over the top can make sense: the logic, an analogy, the other side, and one kind step. Both ways, free and private.'),
 'the-logic-behind-it-in-depth.html': ('The Logic Behind It, in Depth: Reactions, Rulebooks and Research', 'The full guide to seeing the logic behind a reaction: the double empathy problem, prediction and uncertainty, energy, social habits, different rulebooks, and when logic is not an excuse.'),
 'frequency-buddies.html': ('Frequency Buddies: A Cartoon About Feelings, for All Ages', 'Gentle animated episodes for all ages: two pups, Tidbit and Sugarfoot, face tough times, talk it through and come out stronger. Free, with captions.'),
 'frequency-buddies-live.html': ('Frequency Buddies Live: Drop In Anytime', 'A Frequency Buddies TV station that is always on: drop in anytime, watch the episode playing right now, and cast it to your TV.'),
 'frequency-buddies-shuffle.html': ('Frequency Buddies: Watch Every Episode on Shuffle', 'Every Frequency Buddies episode back to back in a random order, with the theme song, plus every episode to download and watch offline.'),
 'soundscapes.html': ('Brain Breakers: Instrumental Music with a Visualizer', 'Four instrumental pieces by Christian’s Lab, from soft and floating to big and cinematic, with a media-player-style music visualizer and gentle vibration.'),
 'pal-cam-tv.html': ('Pal Cam TV: A Cozy Puppy Cam for Your TV', 'Two cartoon pups play, nap and explore live on your TV, with calm music and soft place sounds. Free to cast or play full screen.'),
 'wp-01.html': ('Who Did What: A One-Week Chore Log (WP-01)', 'A free chore chart worksheet: note who did what this week, see the split clearly, and find kind ways to say no. For couples, families and roommates.'),
 'wp-02.html': ('How Much Are You Carrying? A Stress Self-Check (WP-02)', 'A quick self-check of how full your plate feels today, to help you pace a hard talk. A reflection tool, not a test or diagnosis.'),
 'wp-03.html': ('Who Owns Which Chore? One Owner per Job (WP-03)', 'Give every recurring job one owner from start to finish, so nothing slips and nobody nags. A free household planning worksheet.'),
 'wp-04.html': ('What Keeps Coming Back? A Monthly Look-Back (WP-04)', 'Find the jobs and arguments that keep coming back, see the invisible work behind them, and fix the setup instead of blaming a person.'),
 'wp-09.html': ('Say It So It Lands: Kinder Wording (WP-09)', 'Turn a hard sentence into one that lands: what you mean, what they may hear, and a calmer way to say it. A free communication worksheet.'),
 'wp-11.html': ('Calm-down plan: A Plan for Heated Moments (WP-11)', 'Make a simple plan for heated moments: your signs, a pause signal, what helps you settle, and how to come back to the talk kindly.'),
 'wp-13.html': ('90-Second Daily Check-In for Couples (WP-13)', 'A 90-second daily check-in for couples and roommates: how you’re doing, what’s coming up, and one small way to help.'),
 'lemonade-stand.html': ('Who Did What This Week? A Simple Chore Tracker', 'A friendly chore tracker for the week: note who did what, see the balance at a glance, and talk about it without blame.'),
 'is-the-setup-working.html': ('Fair Split Calculator: Is the Setup Working for Everyone?', 'A free calculator for the household split: time, effort and the invisible jobs, so you can see whether the setup works for everyone.'),
 'prog-01.html': ('A Six-Week Guided Program for Fairer Chores', 'Six-week program, one worksheet a week: see the load, give every job an owner, check your batteries and how you talk, then look at what changed.'),
 'wired-differently.html': ('Wired Differently: Neurodiversity in Relationships', 'How different minds can hear the same words differently, and simple ways to share plans, chores and feedback so they land for everyone.'),
 'know-yourself.html': ('Know Your Own Wiring: A Self-Discovery Guide', 'Understand how you take in plans, change and feedback, and how to explain what helps you to the people you live and work with.'),
 'wavelength.html': ('Wavelength: Free Communication Style Quiz and Self-Discovery Guide', 'A free quiz on how you think, talk and listen. Pick your wiring (ADHD, autistic, AuDHD and more) and get your four-letter Wave Code and archetype.'),
 'perspective-shifter.html': ('The Perspective Shifter: See It From Their Side', 'A simple tool for seeing a moment from someone else’s side: their state, wiring, surroundings and history, and what each of you could and couldn’t see.'),
 'polymath.html': ('The Polymath Way: How Every Field Connects', 'How psychology, economics, nature, music and more grow from the same few roots, and how a polymath joined thirteen fields into one program you can learn.'),
 'about.html': ('About Spread Love & Acceptance', 'The story behind Spread Love & Acceptance: a free, growing suite of tools for kinder, fairer relationships.'),
 'book/preface.html': ('Preface: The work nobody sees', 'The preface: the planning, remembering and noticing that keeps a home running, why it goes unseen, and how seeing it changes everything.'),
 'book/chapter-1.html': ('Chapter I: Why we get out of tune', 'Chapter I: why kind people still end up resentful at home, and how small mismatches in what we see and expect add up over time.'),
 'book/chapter-2.html': ('Chapter II: Is the split working?', 'Chapter II: a fair way to ask whether the household split is working for everyone, counting time, effort and the invisible jobs.'),
 'book/chapter-3.html': ('Chapter III: Full tanks and different angles', 'Chapter III: how a full stress tank changes what we hear and say, and why the same moment looks different from each side.'),
 'book/chapter-4.html': ('Chapter IV: Two kinds of fair', 'Chapter IV: equal and fair are not the same. How to find a split that fits your real lives, strengths and seasons.'),
 'book/chapter-5.html': ('Chapter V: The monthly look-back', 'Chapter V: a calm monthly look-back to see what changed, celebrate it, and adjust the setup before resentment builds.'),
 'book/self-1-then.html': ('Know Yourself, Then: Where Your Lens Came From', 'Part One, Then: where your lens came from, how growing up shaped what you expect, and which old rules are worth keeping.'),
 'book/self-2-now.html': ('Know Yourself, Now: Your Wiring, Weather and Words', 'Part One, Now: how you are built, what kind of day you are having, and one clear sentence about what helps.'),
 'book/self-3-next.html': ('Know Yourself, Next: Shaping Who You Are Becoming', 'Part One, Next: what matters to you, one small goal, tiny steps for tired days and a kind monthly look at yourself.'),
 'library/fairness.html': ('Fairness and the Mental Load at Home', None),
 'library/conflict.html': ('Conflict Resolution in Relationships, Explained', None),
 'library/communication.html': ('Communication Skills: Talking and Listening', None),
 'library/stress.html': ('Stress and the Body, in Plain English', None),
 'library/emotions.html': ('Understanding Feelings and Emotions', None),
 'library/connection.html': ('Kindness, Gratitude and Connection', None),
 'library/wiring.html': ('Neurodiversity: Differences in Wiring', None),
 'library/thinking.html': ('Common Thinking Traps, Explained', None),
 'library/motivation.html': ('Motivation, Habits and Change', None),
 'library/relationships.html': ('How Relationships Work: What Research Says', None),
 'library/teams.html': ('Fair Systems for Teams and Households', None),
 'library/life.html': ('Family, Money and Big Life Changes', None),
 'library/calm.html': ('Calm and Attention, Explained', None),
}

# Keyword-led titles and descriptions (Oct 2026 search pass): the words people actually type, where they
# honestly fit. These replace the entries above for the same page.
SEARCH.update({
 # home and start
 'index.html': ('Understand Yourself, Understand Each Other: Free Self-Help', 'Free, kind lessons and tools for self-help and healing: how communication, relationships and the mind work, and what to do about it. Private, no sign-up.'),
 'start-here.html': ('Start Here: Fair Chores, Calm Talks, Kinder Relationships', 'New here? The one idea behind it all, the best free first tools, and a six-week path to fairer chores, fewer fights and kinder talks at home.'),
 'recheck-drive.html': ('The Re-check Drive: A Calm Football Game for Keeping Things Alive', 'A calm football game with no clock and no way to lose. Do the small, kind things from the complacency playbook for real, and the ball moves toward a field goal on screen.'),
 'complacency.html': ('Complacency in Relationships: When “It’s Fine” Stops Being Checked', 'Complacency isn’t laziness. It’s what happens when something has worked for a long time and we stop looking. How to spot it in yourself and in relationships, and small re-checks that keep things alive.'),
 'five-pillars.html': ('The Five Pillars of Fair, Kind Relationships', 'Five simple ideas for fair, kind relationships: see the whole mental load, fix the setup instead of the person, read your stress first, and tune how you talk.'),
 'relationships.html': ('Relationship Tools for Couples, Families and Roommates', 'Free ways to share chores fairly, use kinder words and hold calmer check-ins, for couples, families, co-parents, friends, roommates, coworkers and caregivers.'),
 'about.html': ('About Spread Love & Acceptance and Its Creator', 'Meet Christian, the creator of Spread Love & Acceptance: a career auditing systems, and a free, growing suite of kindness tools.'),
 'how-it-works.html': ('How It Works: An Outside Look at Yourself', 'How the program works: a calm, outside view of your life situation, your wiring and what you notice, like an honest auditor with no verdict on your worth.'),
 'contents.html': ('Contents: Every Free Tool, Guide and Chapter', 'Everything in the program in three parts: tools for understanding yourself, tools for any two people, and where to start in your kind of relationship.'),
 'is-this-for-you.html': ('Is This Right for You? What It Is and Isn’t', 'A free self-help program for your own stress and reactions, and a fair way for two people to see what each carries at home. Education, not counseling.'),
 'ways-in.html': ('Ways In: Everything Is Free and Open', 'Everything here is free, with no account, no sign-up and no paid version. Email updates are optional.'),
 'glossary.html': ('Glossary: The Words, in Plain English', 'Every word this site uses, from battery to talk window, in one plain sentence with an example, plus the older names some tools used to have.'),
 'roadmap.html': ('Content Roadmap: What’s Live and What’s Planned', 'What is live today, what is being written and what is planned: the Preface and Chapters I to V are live now, with Chapters VI to XII still to come.'),
 # relationship tools
 'signal-translator.html': ('The Signal Translator: a tone checker for texts', 'The Signal Translator, a free tone checker for texts: type a message, see how it may land and what they may hear, then get a kinder, clearer way to say it. Private, on your device.'),
 'conversation-reader.html': ('The Conversation Reader: Calm Replies After a Fight', 'Paste a text thread after a fight and see where it turned, what each of you may be hearing, and calmer replies built from your own words. Free and private.'),
 'turning-toward.html': ('Turning Toward: 7 Small Habits for Closer Relationships', 'Connection grows in small moments. Seven simple habits for love and appreciation: notice when someone reaches for you, give specific thanks, and repair gently.'),
 'check-ins.html': ('Relationship Check-Ins: A Kind Weekly Ritual for Couples', 'A short, kind weekly relationship check-in for couples, families and roommates: what went well, what felt heavy, and one small change to try next week.'),
 'quick-checks.html': ('My Weather Today: Daily Mood and Stress Check-In', 'A one-minute daily mood check-in and stress check: how you are doing today, a gentle forecast for hard talks, and a calm pause with something soothing to do.'),
 'ask.html': ('Ask Professor Puddles: Free, Private Relationship Help Chat', 'Tell a cheerful raindrop professor what’s going on: kind next steps, words to say, deep talks and infographics. Free, and nothing you type leaves your device.'),
 'perspective-shifter.html': ('See It From Their Side: A Free Perspective-Taking Tool', 'Step into the other person’s side of a moment: their day, their wiring, what they could see and what they could not. A free, private perspective-taking tool.'),
 'wired-differently.html': ('Wired Differently: Neurodiversity and Communication', 'How ADHD, autistic and other differently wired minds can hear the same words differently, and simple ways to share plans, chores and feedback that land.'),
 'know-yourself.html': ('Know Your Own Wiring: A Self-Discovery Guide', 'Why you react the way you do: what is your wiring, what life taught you and what is just today, plus kind words to explain what helps to the people around you.'),
 'wiring-card.html': ('How I Like to Be Spoken To: A One-Page Card', 'Make a free one-page card about how you take in words, what your silence means, what to avoid and how a request lands best, to share with the people around you, at home or at work.'),
 'carrier-wave-decoder.html': ('Rewind the Talk: A Guided Reset When a Talk Goes Wrong', 'A guided, step-by-step tool for the moment a conversation starts going sideways: check your state, get back in tune, and look back on the week together.'),
 'growing-up.html': ('Where Your Lens Came From: How Growing Up Shapes You', 'How growing up shapes the adult you are: the big question at each stage, why timing makes some experiences go deeper, and how to choose which old rules to keep.'),
 'self-path.html': ('Your Self-Discovery Path, Step by Step', 'The self-discovery path: understand your own load, rhythms and reactions first, with a few short worksheets and free tools you can use on your own.'),
 # chores and the mental load
 'lemonade-stand.html': ('Who Does What? Chores, Bills and the Lemonade Stand', 'A free tool for chores, bills and family money, for one person or a whole home: list who does what and who pays what, see the split or your own load, and talk it over without blame.'),
 'workpapers/wp-01.html': ('Who Did What: A One-Week Chore Log and Kind Ways to Say No', 'A one-week log of who did what at home, plus three calm ways to say no or “not right now” without starting a fight. A free worksheet for couples and roommates.'),
 'workpapers/wp-02-how-much-are-you-carrying.html': ('Stress Check: How Much Are You Carrying? (WP-02)', 'A five-question stress check that separates how much you are already carrying from how upset you are about one thing. A reflection tool, not a test.'),
 'workpapers/wp-03-one-owner-per-job.html': ('One Owner per Job: A Free Household Chore Agreement', 'Give every recurring household chore one clear owner from start to finish, so nothing slips, nobody nags and you stop re-deciding who does what each week.'),
 'workpapers/wp-04-what-keeps-coming-back.html': ('What Keeps Coming Back? Find the Chores That Keep Slipping', 'Once a month, look back at four weeks of chore logs together, find the jobs and arguments that keep coming back, and fix the setup instead of blaming a person.'),
 'workpapers/wp-09-say-it-so-it-lands.html': ('Say It So It Lands: Kinder Words Before You Reply', 'A quick self-check before you answer something that landed hard, so what you say next is calm, clear and something the other person can actually hear.'),
 'workpapers/wp-13-daily-check-in.html': ('90-Second Daily Check-In for Couples and Roommates', 'A 90-second daily check-in: one sentence each about how you are doing and what is coming up, so small things do not pile up into a weekend argument. Free.'),
 'wp-11.html': ('Calm-down plan: A Plan for Heated Moments (WP-11)', 'Make a simple calm-down plan before you need it: your early signs, a pause signal, what helps you settle, and how to come back to the talk kindly and on time.'),
 'wp-11-sound-toolkit.html': ('Calm-Down Sounds: Brown Noise, a Low Hum and More', 'Three simple background sounds to try as part of your calm-down plan: a low hum, a soft flutter and brown noise. Free in your browser, and a matter of taste.'),
 'workpapers/calculators/is-the-setup-working-quick.html': ('Fair Split Check: Is the Setup Working for Everyone?', 'Type in the totals from your chore worksheets, for 2 to 8 people, and see in plain words whether the way you share the household load is working for everyone.'),
 'prog-01.html': ('A Six-Week Guided Program for Fairer Chores', 'Six-week program, one worksheet a week: see the mental load, give every chore an owner, check your stress and how you talk, then look at what has changed.'),
 'tools/frequency-calibration.html': ('Are Your Rhythms in Step? Frequency Calibration', 'A worksheet for two people to map their rhythms for money, rest, decisions, check-ins and recovery, and see where they match and where they drift apart.'),
 'snapshot/index.html': ('A 2-Minute Snapshot of How Your Household Shares the Load', 'A gentle two-minute look at how the shared load is set up at home and how it bends, for couples, families, roommates and teams. Not a test or a diagnosis.'),
 # calm, games and media
 'pause-and-play.html': ('Relax and Play: Calm Tools and Calm Games, Free', 'Relax and reset with a breathing break, a silent wind-down, slow colors, calm music and sounds, or play a calm game with no timers and no way to lose.'),
 'bears-dojo.html': ('The Bears Dojo: A Calm Temple Garden to Wander Into', 'Wander a quiet temple garden where Tidbit and Sugarfoot tend the grounds, build your own bear, then step inside for gentle things to do. Free, no timers, nothing saved.'),
 'night-garden.html': ('The Night Garden: A Calm Breathing Exercise Game', 'A breathing exercise you can play: breathe slowly to make flowers bloom, guide fireflies into constellations and stack glowing stones. Free, calm, no timers.'),
 'calm-visualizer.html': ('Drift: Calm Visuals and Soft Tones to Unwind', 'Tell Drift how you feel, put on headphones, and let slow, dreamy visuals, kind words and gentle tones keep you company for a few quiet minutes of calm.'),
 'soundscapes.html': ('Brain Breakers: Instrumental Music with a Visualizer', 'Four instrumental pieces by Christian’s Lab, from soft and floating to big and cinematic, with a media-player-style music visualizer and gentle vibration.'),
 'word-bloom.html': ('Word Bloom: A Relaxing Letter-Wheel Word Game', 'A free, relaxing word game: swipe across a wheel of letters to find the hidden words. Hundreds of levels from easy to tricky, with no timers and no ads.'),
 'quiet-words.html': ('Calm Word Search, No Timer: Quiet Words (Free)', 'A calm, free word search with soft themes, levels from easy to tricky and no timer. Every word you find leaves a kind thought behind. Play on phone or computer.'),
 'quiet-crossword.html': ('Quiet Crossword: Easy, Gentle Mini Crosswords', 'Small, friendly mini crosswords with gentle clues in five levels from easy to tricky. Free and calm with no timer: a peaceful puzzle for a few quiet minutes.'),
 'daily-ledger-crossword.html': ('Daily Crossword Puzzle, Newspaper Style (Free)', 'A free newspaper-style daily crossword with fair, friendly clues, from a quick 5x5 mini to a big Sunday grid. Play in your browser on any device, at your pace.'),
 'frequency-journey.html': ('Tidbit and Sugarfoot’s Arcade: Six Calm Classic Games', 'Play as Tidbit or Sugarfoot in six calm classic games: a maze chase, a road-and-river crossing, a wagon-trail journey, a brick breaker, a catching game and a Home Run Derby. Easy touch controls, a relaxed pace and no game over.'),
 'coin-pusher.html': ('Kindness Coin Pusher', 'A cozy coin pusher with 50 collectibles to find, cabinet looks to earn and a tip jar of short, useful tips. Free, private, nothing to buy.'),
 'the-logic-behind-it.html': ('The Logic Behind It: Why a Reaction Makes Sense', 'Why a reaction that looks odd, rude or over the top can make sense: the logic, an analogy, the other side, and one kind step. Both ways, free and private.'),
 'the-logic-behind-it-in-depth.html': ('The Logic Behind It, in Depth: Reactions, Rulebooks and Research', 'The full guide to seeing the logic behind a reaction: the double empathy problem, prediction and uncertainty, energy, social habits, different rulebooks, and when logic is not an excuse.'),
 'frequency-buddies.html': ('Frequency Buddies: A Cartoon About Feelings, for All Ages', 'Two seasons of free animated episodes for all ages: two pups, Tidbit and Sugarfoot, face tough times, talk it through and come out stronger. With captions.'),
 'frequency-buddies-shuffle.html': ('Frequency Buddies: Every Episode on Shuffle', 'Every Frequency Buddies episode back to back in a random order, with the theme song: a free cartoon about feelings for all ages, plus each episode to download.'),
 'frequency-buddies-music-video-maker.html': ('Make Your Own Frequency Buddies Music Video', 'Make your own Frequency Buddies theme song music video: pick the stage, lights, effects, dance moves, costumes and who’s on stage, then play it and share the link.'),
 'frequency-buddies-music-video.html': ('Frequency Buddies Theme Song Music Video', 'The Frequency Buddies theme song as a music video: Tidbit, Sugarfoot and every friend from the episodes sing, dance and cheer on a stage that moves.'),
 'frequency-buddies-live.html': ('Frequency Buddies Live: A Cartoon Channel for All Ages', 'An always-on Frequency Buddies channel: drop in anytime, watch the cartoon episode playing right now, and cast it to your TV. Free, with captions.'),
 'frequency-buddies-season-2.html': ('Frequency Buddies Season 2: Watch the Teaser', 'Frequency Buddies Season 2 is coming: watch the two-minute teaser with Tidbit and Sugarfoot, spot the five hidden secrets and pick the new place you can’t wait to see.'),
 'pal-cam-tv.html': ('Pal Cam TV: A Cozy Cartoon Puppy Cam for Your TV', 'Leave two cartoon pups playing and napping on your TV all day, with calm music and light that follows the time of day. Free, no sign-up, ready to cast.'),
 # the book
 'book/index.html': ('The Book: Free to Read Online', 'Read the whole free book in order, like any book: 24 chapters in three parts on yourself, sharing a life, and understanding people. Book text and expanded versions, or all of it on one page to print.'),
 'book/whole.html': ('The Whole Book on One Page (Book Text)', 'Every chapter of the book, in order, on one page: read straight through, search it or print it. Free to read, with no account.'),
 'book/whole-in-depth.html': ('The Whole Book on One Page (Expanded Versions)', 'Every chapter of the book in its expanded version, in order, on one page, ready to read straight through or print. Free, no sign-up.'),
 'book/preface.html': ('Preface: The work nobody sees', 'The Preface: the planning, remembering and noticing that keeps a home running, why this invisible work goes unseen, and how seeing it changes everything.'),
 'book/chapter-1.html': ('Chapter I: Why we get out of tune', 'Chapter I: why kind people still end up resentful at home, and how small mismatches in pace, tone and what we expect add up, plus how to get back in tune.'),
 'book/chapter-2.html': ('Chapter II: Is the split working?', 'Chapter II: a fair way to ask whether the division of labor at home is working for everyone, counting time, effort and the invisible jobs, never blame.'),
 'book/chapter-3.html': ('Chapter III: Full tanks and different angles', 'Chapter III: how a full stress tank changes what we hear and say, why the same moment looks different from each side, and how to pause before you react.'),
 'book/chapter-4.html': ('Chapter IV: Two kinds of fair', 'Chapter IV: equal and fair are not the same thing. How couples and families find a fair chore split that fits their real lives, strengths and seasons.'),
 'book/chapter-5.html': ('Chapter V: The monthly look-back', 'Chapter V: a calm monthly look-back for couples and households to see what changed, celebrate it, and adjust the setup before resentment builds up.'),
 'book/self-1-then.html': ('Know Yourself, Then: Where Your Lens Came From', 'Part One, Then: where your lens came from, how growing up shaped what you expect, and which old rules are worth keeping.'),
 'book/self-2-now.html': ('Know Yourself, Now: Your Wiring, Weather and Words', 'Part One, Now: how you are built, what kind of day you are having, and one clear sentence about what helps.'),
 'book/self-3-next.html': ('Know Yourself, Next: Shaping Who You Are Becoming', 'Part One, Next: what matters to you, one small goal, tiny steps for tired days and a kind monthly look at yourself.'),
 'book/preface-in-depth.html': (None, 'The full Preface: every home keeps a set of books nobody agreed to. Why the invisible work of a shared life matters, and why noticing it is not keeping score.'),
 'book/chapter-1-in-depth.html': (None, 'Chapter I in full: a radio-tuning picture of why two kind people fall out of step, how pace and tone create static, and the steps for getting back in tune.'),
 'book/chapter-2-in-depth.html': (None, 'Chapter II in full: a self-reflection tool that reads whether the household workload split looks like it can last, counting time, effort and invisible jobs.'),
 'book/chapter-3-in-depth.html': (None, 'Chapter III in full: two self-report tools for how much of a reaction is leftover stress, and which of seven angles each person is seeing a moment from.'),
 'book/self-1-then-in-depth.html': (None, 'Part One, Then, in full: the three layers of a reaction, the lens idea, how it forms, old answers and fairer readings, and how to choose which rules to keep.'),
 'book/self-2-now-in-depth.html': (None, 'Part One, Now, in full: wiring and conditions, how you like to be spoken to, reading your state, a four-step self-check, kind limits and how much to share.'),
 'book/self-3-next-in-depth.html': (None, 'Part One, Next, in full: values first, one small goal, what gets in the way, tiny repeatable steps, if-then plans, asking for support and a kind monthly look-back.'),
 # library
 'library.html': ('Psychology in Plain Words: How Relationships Work', 'Hundreds of plain-language entries on relationships, conflict, kindness, gratitude, emotions, stress, calm and wiring, with honest notes on the evidence.'),
 'library/fairness.html': ('The Mental Load and Fair Division of Labor at Home', 'What research says about the mental load, invisible work and the division of labor at home, why each person often thinks they do more, and what helps.'),
 'library/conflict.html': ('Conflict Resolution in Relationships, Explained', 'Plain-language research on conflict in relationships: why arguments escalate, how repair works, apology, forgiveness, mediation and fair process.'),
 'library/communication.html': ('Communication in Relationships: Talking and Listening', 'Plain-language research on communication in relationships: listening, asking, feedback, tone, apology and the everyday skills of being understood.'),
 'library/stress.html': ('Stress and the Body, in Plain English', 'How stress shows up in the body and in relationships, in plain words: the stress response, polyvagal theory and its critics, sleep, hunger and burnout.'),
 'library/emotions.html': ('Understanding Feelings and Emotions', 'Plain-language research on feelings and emotions: naming them, shame and guilt, anger, rumination, grief and resilience, with honest notes on the evidence.'),
 'library/connection.html': ('Kindness, Gratitude and Connection, Explained', 'What research says about kindness, gratitude, appreciation and connection: small daily rituals, thanks that lands and the habits that keep people close.'),
 'library/wiring.html': ('Neurodiversity Explained: Autism, ADHD and Sensitivity', 'Plain-language entries on differences in wiring: autism, ADHD, the double empathy problem, high sensitivity, sensory overload, personality and chronotype.'),
 'library/thinking.html': ('Common Thinking Traps, Explained', 'Plain-language guides to common thinking traps: why we jump to conclusions, expect the worst, remember selectively and misread each other, and what helps.'),
 'library/motivation.html': ('Motivation, Habits and Change, Explained', 'Plain-language research on motivation, habits and change: mindset, self-esteem, values, rewards and the small steps that help a new habit stick for good.'),
 'library/relationships.html': ('How Relationships Work: What Research Says', 'What research on couples, families and friends says about what keeps people close: attachment, trust, appreciation, repair and sharing the load at home.'),
 'library/teams.html': ('Fair Systems for Teams and Households', 'How fair systems work for teams and households: clear owners, blameless reviews, checklists, and why shared jobs slip when everyone owns them at once.'),
 'library/life.html': ('Family, Money and Big Life Changes', 'Plain-language research on family life, money talks, co-parents, holidays, in-laws and the big transitions of life, and how to share the load through them.'),
 'library/calm.html': ('Calm and Attention, Explained', 'What research says about calm and attention: breathing, mindfulness, nature, rest, mind-wandering and flow, with modest and honest claims about each one.'),
 'learn/index.html': ('Philosophy for Everyday Life: Old Stories, Useful Ideas', 'Twelve old stories from philosophy, retold in plain words, to help you know yourself, see the other person more clearly and live more kindly with others.'),
 # cut-off descriptions
 'complacency-in-depth.html': (None, 'Why good things fade into the background, the quiet signs of complacency, how it shows up in yourself and in every kind of relationship, and the small, kind re-checks that keep things alive.'),
 'check-ins-in-depth.html': (None, 'How to hold a hard conversation kindly: a calm time and place, listening before any reply, a reply that does not erase what was heard, and a plan for both.'),
 'contents-in-depth.html': (None, 'Everything in the program, in three parts: self-discovery tools, relationship tools for any two people, and where to start in each relationship.'),
 'how-it-works-in-depth.html': (None, 'How the program works in full: an outside look at your life situation, your wiring and what you discover, and why the technical layer is optional.'),
 'learn/index-in-depth.html': (None, 'Twelve real stories from philosophy on knowing yourself and living well with others, retold in plain language and linked to the chapters and worksheets.'),
 'wired-differently-in-depth.html': (None, 'How autistic, ADHD, dyslexic, anxious, highly sensitive and neurotypical people can hear the same sentence in very different ways, with examples and research.'),
 'growing-up-in-depth.html': (None, 'A plain-language guide to the stages of growing up and the lens each one leaves: the big question at each stage, why timing matters, and family and culture.'),
 'workpapers/wp-03-one-owner-per-job-in-depth.html': (None, 'The full household chore agreement: give every regular job one owner, with an optional helper, so nothing slips and nobody has to keep asking who does what.'),
 'workpapers/wp-04-what-keeps-coming-back-in-depth.html': (None, 'The full monthly look-back: a monthly review of four weeks of chore logs and owners, to find the tasks that keep slipping and fix the setup together.'),
 'workpapers/wp-09-say-it-so-it-lands-in-depth.html': (None, 'The full checklist for getting back in tune before you reply: put the radio-tuning idea from Chapter I into everyday words that are calm, clear and kind.'),
 'workpapers/wp-13-daily-check-in-in-depth.html': (None, 'The full 90-second daily check-in for couples and roommates: a short, easy daily talk that keeps two people in step with small, steady corrections.'),
 'infographic.html': ('The Whole Idea on One Printable Page', 'The whole idea on one printable page: the Five Pillars, how an unowned chore turns into resentment, the Lemonade Stand chore tracker, and three kind phrases.'),
 'frequency-framework.html': ('The Frequency Framework: Getting Back in Step', 'Two people can each run on their own rhythm for money, rest, decisions, talking and values. Why kind people fall out of step, and how to find the beat again.'),
 'suite-index-in-depth.html': (None, 'An honest index of everything that is live today in the Workpaper Suite: each chapter, worksheet and calculator you can use right now.'),
 'program-overview.html': (None, 'How the program fits together: the chapters explain the ideas and the worksheets put them to use. It also says plainly what is built today and what is not yet.'),
 # new guides
 'invisible-labor-mental-load.html': ('Invisible Labor and the Mental Load: How to Share It', 'What invisible labor and the mental load are, real examples from everyday home life, and five calm steps couples and families can use to share it fairly.'),
 'chore-chart-for-couples.html': ('Fair Chore Chart for Couples (Free, Printable)', 'A free, printable chore chart for couples, families and roommates: list every job, including the invisible ones, give each one an owner and review it weekly.'),
 'how-to-stop-fighting-with-your-partner.html': ('How to Stop Fighting With Your Partner: 7 Calm Steps', 'Practical, calm ways to stop fighting with your partner: notice the early signs, take a real pause, check your words, and fix the setup behind repeat fights.'),
 'neurodivergent-relationships.html': ('Neurodivergent Relationships: ADHD and Autistic Couples', 'Practical tips for ADHD, autistic and AuDHD couples and families: communication differences, sensory overload at home, plans, chores and kind feedback.'),
 'communication-style-quiz.html': ('Communication Style Quiz: Find Your Wave Code (Free)', 'A free communication style quiz: find your four-letter Wave Code and which of 16 archetypes fits, from pace and detail to how you send and receive words.'),
 'small-wins.html': ('Small Wins, and Turning Hard Feelings Into Fuel', 'Why small wins build momentum, and kind ways to turn anger, worry and complaints into requests and plans. With a free Flip it tool and a done list.'),
 'for-teachers.html': ('For Teachers: Free Lessons on Feelings and Communication', 'Free pages for teachers and youth leaders: lessons on feelings and communication, printable handouts with teen versions, projector tips, and clear permission to use them in class.'),
 'book/understanding-13-anger.html': ('Part Three, Chapter 13: Anger, What It’s For and What to Do With It', 'What anger is for, what it does in the body, steps for the hot minutes, why venting backfires, how to repair, and when anger becomes harm.'),
 'book/understanding-13-anger-in-depth.html': ('Part Three, Chapter 13 in depth: Anger', 'Anger in full: signal, body, the hot minutes, venting, stepping back, saying it, repair and harm, through psychology, philosophy and an autistic lens.'),
 'book/understanding-14-personality.html': ('Part Three, Chapter 14: Personality, Temperament and Change Across Life', 'Personality as sliders, not boxes: the Big Five, temperament, introverts and extraverts, how people change with age, and living with different people.'),
 'book/understanding-14-personality-in-depth.html': ('Part Three, Chapter 14 in depth: Personality and Temperament', 'Personality in full: traits, temperament, situations, energy, change with age and on purpose, gifts and costs, through psychology, philosophy and an autistic lens.'),
 'book/understanding-15-love.html': ('Part Three, Chapter 15: Closeness and Love', 'How closeness grows: love in many forms, intimacy as being known, feeling understood, attachment in adult love, and love across ages and relationship types.'),
 'book/understanding-15-love-in-depth.html': ('Part Three, Chapter 15 in depth: Closeness and Love', 'Love in full: its many forms, being known, responsiveness, attachment, love over time and across ages, through psychology, philosophy and an autistic lens.'),
 'calm-without-pills.html': ('Calm Without Pills: What Helps, and What Research Says', 'Everyday ways to ease stress, worry and poor sleep, from movement and daylight to slow breathing, each with the research and every source.'),
 'someone-sent-you-this.html': ('Someone Sent You This Link? What This Free Site Is, and What’s Here', 'Someone sent you a link to Spread Love & Acceptance? What it is in three lines, what you’ll find here, and no pressure: nothing you type leaves your device.'),
 'examples.html': ('Examples: Small Changes in Different Kinds of Relationships', 'Made-up examples built from common patterns: a couple, roommates, siblings, co-parents, friends, co-founders, a poly home, a kinship caregiver and someone on their own.'),
 'week-0.html': ('Week 0: A Calm Start to the Six-Week Program', 'Five minutes before the six weeks: what each week is, how long it takes, doing it alone or with anyone, why missing a week is fine, and one small thing to do now.'),
 'research.html': ('The Research Behind This Site, in Plain Words', 'The studies, books and reviews behind this free self-help site: what each found, in plain words, how strong the evidence is, and a link to read more.'),
 'start-in-10-minutes.html': ('Start in 10 Minutes', 'Four small steps, just for you or with someone: check your weather, read one short piece, notice your pattern or each say one thing, then pick one small change. Private, no sign-up.'),
 'grandparents.html': ('For Grandparents: Help Without Taking Over', 'Free, gentle help for grandparents: share childcare fairly, agree on house rules with your adult children, say no kindly, and stay close to your grandkids.'),
 'book/topic-by-relationship.html': ('The Book by Relationship: What to Read First', 'Which parts of the book matter most for you: the best sections for couples, friends, family, siblings, co-parents, caregivers, roommates and work.'),
 'by-relationship.html': ('Find It by Relationship: Every Page, Sorted by Who It’s For', 'Every page on the site in one list, sorted by who it’s for: just you, couples, friends, family, co-parents, roommates, work, life changes and games.'),
 'friends.html': ('Friends: When a Friendship Drifts', 'Free, kind help when a friendship drifts: for the friend who always reaches out and the one who went quiet after a baby or a hard year, with short messages.'),
 'more-than-two.html': ('More Than Two Partners at Home', 'Free help for triads and homes with more than two partners: share the planning, join a home that ran before you, and include the partner who works long hours.'),
 'gaming-and-time-together.html': ('Gaming, Phones and Time Together', 'Fair, free help when one of you games or scrolls a lot: heads-ups, bids between matches, a protected evening, and a time-together deal to fill out and share.'),
 'money-together.html': ('Money Together: Different Styles, One Plan', 'Free, fair help for couples with different money styles: personal money for each, a shared check-in limit, moving in, wedding costs, and limits vs control.'),
 'foster-and-kinship.html': ('Raising Someone Else’s Child: Grandparents and Foster Caregivers', 'Free help for grandparents and relatives raising a child (kinship care), foster caregivers and adoptive parents: behavior, house rules and contact visits.'),
 'adhd-kids.html': ('When a Child Has ADHD: For Parents and Grandparents', 'Plain, free help when a child has ADHD: it is real, not bad behavior. Words for fidgeting and forgetting, routines, screens and tips for grandparents.'),
 'grown-up-children.html': ('For Grown-Up Children: Boundaries With a Parent You Love', 'Free, kind help for grown-up children: visits, unasked-for advice, the new baby, in-laws and vacations, and a simple family plan with a parent you love.'),
 'coming-home.html': ('Coming Home After Time Apart: Deployment and Work Away', 'Free help for the first weeks after a deployment, work away or a hospital stay: a handover week, finding your place again, and the kids.'),
 'different-hours.html': ('Different Hours: Night Shifts, Shift Work and Time Together', 'Free help when you work different hours: night shifts and recovery sleep count as work, protected sleep, a shift-change check-in and one fixed together time.'),
 'two-faiths.html': ('Two Faiths or Cultures, One Family', 'Fair help for interfaith and mixed-culture families: decide names, rituals and upbringing together, tell both families, and plan festivals on one calendar.'),
 'coming-out.html': ('Coming Out as an Adult: Family, Work and Partners', 'Free help for coming out as an adult: your timing, money first, words for parents, if they cut you off, at work, with a partner, and support.'),
 'on-my-own.html': ('On My Own After a Breakup or Divorce', 'Free, gentle help after a breakup or divorce: the first weeks, loneliness, money, rebuilding a life, and part-time parenting when the kids are with you.'),
 'for-counselors.html': ('For Counselors, Coaches and Group Leaders', 'For therapists, counselors, coaches and group leaders: what this free self-help site is and isn’t, evidence status, and homework tools.'),
 'sharing-a-room.html': ('Sharing a Room: Dorm and Apartment Roommate Agreement', 'Free, calm help for sharing a dorm room or apartment: overnight guests, quiet hours, cleaning, borrowing, talking to your RA, and a room agreement to fill out.'),
 'when-one-is-ill.html': ('When One of You Is Ill or Disabled: Share by Energy', 'Free help for couples when one partner lives with a chronic illness or disability: share the load by energy, not hours, plan for bad days, and find support.'),
 'family-rifts.html': ('Adult Siblings and Family Rifts: Reaching Out, or Not Yet', 'Free, fair help for family rifts between grown siblings: after a loss, a will or years of silence. Short first messages, and kind ways to say “not yet.”'),
 'empty-nest.html': ('Empty Nest: When the House Is Quiet Between You', 'Free help in plain English for couples whose children have grown and left home: small daily habits, care shown by doing, and questions to ask each other.'),
 'caregivers.html': ('Caring for Someone You Love: Help for Caregivers', 'Free, practical help for caregivers: when the person can’t share the load back, how to ask family for specific help, and where to find respite and support.'),
 'work.html': ('At Work: Fair Workloads and Kind Messages for Teams', 'Free, plain tools for teams: one owner per job, messages that land, appreciation that fits, and a 45-minute team session. No sign-up, no cartoons.'),
 'grief.html': ('Grief and Later Life: Loss, Family and a New Chapter', 'Gentle, free help after a loss: grieving differently in one family, reconnecting with grown children, and starting a new chapter.'),
 'retired-together.html': ('Retired and Both Home Now: Sharing the House Again', 'Free, practical help when retirement puts you both at home all day: territory and routines, re-dividing whole jobs, handing over kindly, and finding purpose.'),
 'family-obligations.html': ('Supporting Family: Parents, Money Home and Duty', 'Free, even-handed help for couples who support parents and family: agree a monthly family-support amount, lead with your own family, and save alongside it.'),
 'long-distance.html': ('Long-Distance and Apart: Staying Close Across the Miles', 'Free, practical help for couples living apart: time zones, check-ins on video, a call rhythm you agree, small bids, short texts, and visits and goodbyes.'),
 'pursue-withdraw.html': ('One of You Wants to Talk Now, the Other Needs Space', 'Free, even-handed help when one partner wants to talk now and the other needs space: why it hurts on both sides, and a pause plan you can fill out and share.'),
 # two hub guides
 'communication.html': ('Effective Communication: A Complete, Plain Guide', 'A free, plain guide to effective communication: listening, saying what you need, timing, hard talks, repair, and talking well at home, with friends and at work.'),
 'bonding.html': ('Bonding: How Closeness Grows, and Small Ways to Grow It', 'How closeness grows, from research on bids, responsiveness and play, plus a free idea picker for partners, kids, teens, friends, family, coworkers and you.'),
 # the book, Part Three: Understanding people, and two small tools
 'book/understanding-1-feelings.html': ('Chapter 1: How Feelings Work, and Naming What You Feel', 'How feelings work: signals from the body, why naming a feeling helps, layers and waves, and kind words to use alone, at home, with friends and at work.'),
 'book/understanding-1-feelings-in-depth.html': ('Chapter 1 in depth: How Feelings Work', 'Feelings in full: signals, the body, naming, finer words, layers, waves and urges, through psychology, philosophy and an autistic lens, with exercises.'),
 'book/understanding-2-stress.html': ('Chapter 2: Stress, Flooding, Rest and Recovery', 'How stress works: your body getting ready, the calm, revved up and running on empty ladder, flooding, why stress adds up, and the rest that helps.'),
 'book/understanding-2-stress-in-depth.html': ('Chapter 2 in depth: Stress and the Nervous System', 'Stress in full: appraisal, the ladder, flooding, load that adds up, settling and kinds of rest, through psychology, philosophy and an autistic lens.'),
 'book/understanding-3-seeing.html': ('Chapter 3: How We See Each Other: Perception and Bias', 'Why perception is a best guess, the stories we fill gaps with, everyday bias, us and them, and how to see people more fairly by asking, not guessing.'),
 'book/understanding-3-seeing-in-depth.html': ('Chapter 3 in depth: How We See Each Other', 'Perception in full: attention, stories and memory, attribution, bias, naive realism and groups, through psychology, philosophy and an autistic lens.'),
 'book/understanding-4-communication.html': ('Chapter 4: How Communication Works: Listening and Repair', 'How communication works: why meaning is made between two people, listening, checking, saying hard things kindly, repairing mix-ups and messages that land.'),
 'book/understanding-4-communication-in-depth.html': ('Chapter 4 in depth: How Communication Works', 'Communication in full: meaning, two layers, listening, checking, hard talks, repair, texts and styles, through psychology, philosophy and an autistic lens.'),
 'book/understanding-5-belonging.html': ('Chapter 5: Attachment, Trust and Belonging', 'Why belonging is a basic need, how early bonds shape what we expect, how trust grows in small moments, and how to rebuild it and find your people. Free.'),
 'book/understanding-5-belonging-in-depth.html': ('Chapter 5 in depth: Attachment, Trust and Belonging', 'Belonging in full: the need to belong, attachment, trust, safe havens, groups, masking and rebuilding trust, via psychology, philosophy and an autistic lens.'),
 'book/understanding-6-change.html': ('Chapter 6: Habits and Change: How Small Steps Work', 'Why change is hard, how habits run on cues, and how tiny steps, a kinder setup and self-compassion after slips help change last, alone or with others.'),
 'book/understanding-6-change-in-depth.html': ('Chapter 6 in depth: Habits and Change', 'Habits and change in full: cues, tiny steps, setup over willpower, mixed feelings, slips and values, through psychology, philosophy and an autistic lens.'),
 'book/understanding-7-worth.html': ('Chapter 7: Self-worth, shame and self-compassion', 'Why worth is not a score, how shame differs from guilt, what the inner critic is for, and how self-compassion helps you own mistakes and grow. Free.'),
 'book/understanding-7-worth-in-depth.html': ('Chapter 7 in depth: Self-worth, shame and self-compassion', 'Self-worth and shame in full: the psychology, the philosophy and an autistic lens, with worked examples, exercises and kind words for hard moments.'),
 'book/understanding-8-loss.html': ('Chapter 8: Loss, grief and big life changes', 'How grief works: waves not stages, grief in the body, losses nobody sees, staying connected to who you lost, big life changes, and how to help. Free.'),
 'book/understanding-8-loss-in-depth.html': ('Chapter 8 in depth: Loss, grief and big life changes', 'Grief in full: the research, what philosophers and traditions say, an autistic lens on loss and change, worked examples and exercises.'),
 'book/understanding-9-minds.html': ('Chapter 9: Minds that work differently', 'A plain guide to neurodiversity: autism, ADHD, sensory and learning differences, masking and energy, and how to meet in the middle at home and work.'),
 'book/understanding-9-minds-in-depth.html': ('Chapter 9 in depth: Minds that work differently', 'Autism, ADHD, sensory and learning differences in full: the research, the philosophy of difference and disability, autistic voices, examples and exercises.'),
 'book/understanding-10-values.html': ('Chapter 10: Values, meaning and a good life', 'What values are, how to find yours, what to do when two good things clash, and what old philosophy offers a busy, ordinary life today.'),
 'book/understanding-10-values-in-depth.html': ('Chapter 10 in depth: Values and meaning', 'Chapter 10 in full: values, meaning and flourishing through psychology, philosophy and an autistic lens, with worked examples, exercises and an FAQ.'),
 'book/understanding-11-healing.html': ('Chapter 11: Healing after hurt', 'How hurt heals: repair after small ruptures, apologies that land, what forgiveness is and is not, and rebuilding trust.'),
 'book/understanding-11-healing-in-depth.html': ('Chapter 11 in depth: Healing after hurt', 'Chapter 11 in full: repair, apology, forgiveness and trust through psychology, philosophy and an autistic lens, with examples, exercises and an FAQ.'),
 'book/understanding-12-helping.html': ('Chapter 12: Helping others well', 'How to help without taking over: ask what help is wanted, listen first, keep kind limits, help in a crisis, and look after yourself so you last.'),
 'book/understanding-12-helping-in-depth.html': ('Chapter 12 in depth: Helping others well', 'Chapter 12 in full: support, listening, compassion, boundaries and burnout through psychology, philosophy and an autistic lens, with examples and an FAQ.'),
 'ladder.html': ('Where Am I Right Now? A Four-Tap Check', 'Four quick taps show if you’re calm and connected, revved up or running on empty, with what helps right now, a pause line to say and when to talk again.'),
 'refusals.html': ('Say No Kindly: Neutral Refusal Scripts', 'Pick a situation and a tone, and get three kind, copy-ready ways to say no: “I’m full today,” “Not me, but let’s find who” or “Yes, just later.” Free.'),
})

# Round 10 search pass (Oct 2026): every helper's seo-additions line, then the phrases people actually type,
# put first, for the pages that answer them. Titles stay at 60 characters or fewer and descriptions at 155 or
# fewer, so nothing is cut off in results. These replace the entries above for the same page.
SEARCH.update({
 # home, hubs and ways in
 'index.html': ('Free Self-Help for Relationships · Spread Love & Acceptance', 'Free self-help for calmer, fairer relationships: share chores and the mental load, check how a text lands, calm down and understand yourself. No sign-up.'),
 'tools.html': ('Free Relationship and Communication Tools, by Type', 'Every free tool in one place, by type: communication, knowing yourself, sharing chores, calm and stress, family, work and games. No sign-up, no account.'),
 'explore.html': ('Every Free Guide, Tool and Worksheet, With Filters', 'Every free page, guide, tool, worksheet, game and book chapter in one list. Filter by what you need, who it is about and how long you have. No sign-up.'),
 'find-your-start.html': ('Where to Start: Three Quick Questions, One Thing to Try', 'Answer three quick questions (who it is about, what is going on, how much time you have) and get one thing to try first and one short read. Free, private.'),
 'why-this-site.html': ('Why Use This Instead of Reading an Article?', 'What this free site does differently from articles: agreements you both keep, both sides by design, private, and honest about its limits.'),
 'how-you-take-things-in.html': ('Read Your Way: Make Every Page Fit Your Mind', 'Pick how your mind takes things in, by neurotype (ADHD, autistic, dyslexic and more) or plain preferences, and every page adapts. Optional, on your device.'),
 'someone-sent-you-this.html': ('Someone Sent You This Link? No Pressure, Here’s What It Is', 'Someone sent you a link to Spread Love & Acceptance? What it is in three lines. You don’t have to do anything, and nothing you type leaves your phone.'),
 'roadmap.html': ('Content Roadmap: What’s Live and What’s Next', 'Everything live today, all free: the whole book (26 chapters and an afterword), ten workpapers, two calculators, the tools, the guides and the calm corner.'),
 'telemetry.html': ('Rollout Status: What Is Live Today', 'What is live today on the site, as plain counts: the whole book, the workpapers, the calculators, the tools and the six-week program.'),
 'method-and-limits.html': ('Method and Limits: How the Scores Work', 'The main scores on the site written out: how each one is worked out, the cut-offs, and what it cannot tell you.'),
 'membership.html': ('Email Updates (Optional)', 'Everything on spreadloveandacceptance.com is free and open to everyone, with no account and no paid version. Email updates are optional.'),
 # chores, the mental load and fairness at home
 'invisible-labor-mental-load.html': ('Mental Load and Invisible Labor: How to Share It Fairly', 'What the mental load and invisible labor are, real examples from home life, and five calm steps to share the planning and remembering fairly. Free.'),
 'chore-chart-for-couples.html': ('Chore Chart for Couples: How to Split Chores Fairly', 'A free, printable chore chart for couples, families and roommates: list every job, including the invisible ones, give each an owner and review it weekly.'),
 'share-the-load.html': ('How to Share Household Chores Fairly, Step by Step', 'When it feels like you do everything at home: name every job, see the split in plain numbers, give each job one owner and review it. Free, no sign-up.'),
 'lemonade-stand.html': ('Who Does What? A Chore and Bill Tracker for Home', 'A free tracker for chores, bills and family money, for one person or a whole home: see who does and pays what, and talk it over without blame. No sign-up.'),
 'new-parent.html': ('New Baby: How New Parents Can Share the Load', 'A three-step way for new parents to split the baby jobs and the invisible ones: list every job, give each one owner, and review it ten minutes a week.'),
 'sharing-a-room.html': ('Roommate Agreement and Chores for a Dorm or Apartment', 'Free, calm help for sharing a dorm room or apartment: a roommate agreement, cleaning, quiet hours, guests, borrowing, and talking to your RA. No sign-up.'),
 'look-back-30-days.html': ('30-Day Look-Back: What Shifted in Who Does What', 'Four weeks of who did what, last-minute rescues and jobs with an owner, side by side: what shifted, what didn’t, and one next step. Free, on your device.'),
 'workpapers/calculators/look-back-30-days-quick.html': ('Look Back Over 30 Days: What Shifted, What Didn’t', 'Type in how things were a month ago and how they are this week: who did what, rescues, load and owners. Get a plain read of what shifted and one next step.'),
 'workpapers/wp-12-same-moment-different-speeds.html': ('Same Moment, Different Speeds: A Worksheet for Two', 'One of you wants to sort it now, the other needs time. A free worksheet to map each person’s speed in five everyday moments and agree one small fix.'),
 'workpapers/wp-12-same-moment-different-speeds-in-depth.html': ('WP-12 in depth: Same moment, different speeds', 'The full worksheet for mismatched pace: speed, talk and urgency for five everyday moments, how to read the gaps, and agreements that close them.'),
 'workpapers/wp-14-is-it-us-or-everything-else.html': ('Is It Us, or Everything Else? A Stress Log for Two', 'Snapping at each other lately? A free one-week log that separates outside pressure (work, money, sleep, illness) from friction between you, with a plan.'),
 'workpapers/wp-14-is-it-us-or-everything-else-in-depth.html': ('WP-14 in depth: Is it us, or is it everything else?', 'The full one-week log for outside pressure versus friction between you: what counts, how to sort each tense moment, stress spillover research, and a plan.'),
 'workpapers/wp-15-keep-your-little-rituals-alive.html': ('Keep Your Little Rituals Alive: A Check for Couples', 'The Sunday walk, the morning coffee, the goodnight text. A free 15-minute check, every few months, on which shared rituals are alive, fading or stopped.'),
 'workpapers/wp-15-keep-your-little-rituals-alive-in-depth.html': ('WP-15 in depth: Keep your little rituals alive', 'The full seasonal check on shared rituals: what counts, how to mark each one, restarting one in its smallest form, and letting one go with thanks.'),
 'wp-11.html': ('Calm-down plan: A Plan for Heated Moments', 'Make a short plan on a calm day: your early signs, two calming steps and a pause line with a time to come back. Free, no sign-up, on your device.'),
 # talking, texting and repair
 'signal-translator.html': ('Text Tone Checker: How Will My Message Land?', 'Worried a text sounds rude or cold? See how it may land and what they may hear, then get a clearer version that keeps your ask. Free, private, no sign-up.'),
 'conversation-reader.html': ('Text Conversation Analyzer: Calm Replies After a Fight', 'Paste a text thread after a fight and see where it turned, what each of you may be hearing, and calmer replies built from your own words. Free and private.'),
 'write-it-through.html': ('Talk It Through in Writing: Write It, Wait, Then Send', 'A calm, private way to sort something out in writing: one topic, facts not verdicts, one clear ask and a reply-by time. Write it, wait, then send it.'),
 'check-ins.html': ('Relationship Check-In: A Kind Weekly Talk for Couples', 'A short, kind weekly check-in for couples, families and roommates: what went well, what felt heavy, and one small change to try next week. Free.'),
 'apology-languages.html': ('How to Apologize So It Lands: The Apology Languages', 'The five apology languages as a menu of what makes a good apology, what research says works best, words to use and how to ask what helps. Free.'),
 'love-languages.html': ('Love Languages: What the Research Says, and How to Use Them', 'The five love languages as a menu, not a label: what research says, healthy and unhealthy versions of each, and how to ask for care in specifics. Free.'),
 'languages-of-connection.html': ('Love, Apology and Appreciation Languages, Together', 'Love languages, apology languages, touchstones, appreciation at work and your wiring, in one picture: six layers from you outward, and where to start.'),
 'appreciation-at-work.html': ('Appreciation at Work: How to Thank Coworkers Well', 'Five ways people like to be thanked at work, as a menu not a label: words, time, help, small gifts and fitting gestures, with what research says. Free.'),
 'touchstones.html': ('Touchstones: Shared Words, Jokes and Rituals That Bond', 'The small shared words, jokes, rituals and stories that say “we are us”: how to notice them, keep them fresh and make new ones. For couples and families.'),
 'wiring-card.html': ('How I Like to Be Spoken To: A One-Page Card', 'Make a free one-page card on how you take in words, what your silence means and how a request lands best, to share at home or at work. No sign-up.'),
 'refusals.html': ('How to Say No Kindly: Polite Refusal Scripts', 'Pick a situation and a tone, and get three kind, copy-ready ways to say no: “I’m full today,” “Not me, but let’s find who” or “Yes, just later.” Free.'),
 'wavelength.html': ('Wavelength: A 2-Minute Quiz on How You Talk and Listen', 'A free two-minute quiz on how you like to talk and listen. Get your four-letter Wave Code, compare it with someone and make a card for work. Free.'),
 'upset-right-now.html': ('Upset Right Now? How to Calm Down Together, Fast', 'A five-minute page for upset people: a pause line with a return time, a one-minute breathing pacer, and steps for a parent about to yell.'),
 # who it is for
 'co-parenting.html': ('Co-Parenting After Separation: Calmer Handoffs and Texts', 'Calmer co-parenting after a separation: an exchange-day script, keeping kids out of the middle, a tone check for texts, and a parallel-parenting route.'),
 'parents.html': ('Parenting Help: Big Feelings, Sibling Fights, Calm Kids', 'Free, gentle help for parents: name big feelings, calm sibling fights, simple calm-down routines for kids, talking with teens, and a cartoon to watch.'),
 'new-relationship.html': ('New Relationship Advice: Dating, Texting and Pace', 'Free, kind help for dating at any age: texting and pace, a difference or a real concern, the big questions, meeting family, and ending it kindly.'),
 'new-relationship-in-depth.html': ('Early Days in Full: Dating, Pace and the Big Questions', 'The full guide to early dating: texting and pace, attachment as degrees not types, differences and real concerns side by side, and decide, don’t slide.'),
 'stepfamily.html': ('Blended Families and Stepfamilies: Going Slowly Together', 'Free help for stepfamilies: the stepparent role, kids feeling torn, two homes with different rules, step and half siblings, money and vacations.'),
 'stepfamily-in-depth.html': ('Blended Families and Stepfamilies in Full', 'The full stepfamily guide: why stepfamilies start differently, connection before correction, loyalty binds, insiders and outsiders, and money.'),
 'living-alone.html': ('Living Alone: Loneliness, Friends and a Home for One', 'Free, kind help for living on your own at any age: alone versus lonely, a home for one, making friends as an adult, asking for help and weekends.'),
 'living-alone-in-depth.html': ('Living Alone, Living Well, in Full', 'The full guide to living alone: solitude and loneliness research, the one-person mental load, how long adult friendships take, and neurodivergent living.'),
 'grief.html': ('Grief and Loss: Help for Families and a New Chapter', 'Gentle, free help after a loss: grieving differently in one family, reconnecting with grown children, and starting a new chapter.'),
 'caregivers.html': ('Caregiver Support: Help for Caring for Someone You Love', 'Free, practical help for caregivers: when the person can’t share the load back, how to ask family for specific help, and where to find respite.'),
 'family-rifts.html': ('Family Rifts Between Adult Siblings: Reaching Out', 'Free, fair help for family rifts between grown siblings: after a loss, a will or years of silence. Short first messages, and kind ways to say “not yet.”'),
 'work.html': ('Workplace Communication: Fair Workloads, Kind Messages', 'Free, plain tools for teams: one owner per job, messages that land, appreciation that fits, and a 45-minute team session. No sign-up, no cartoons.'),
 'grandparents.html': ('For Grandparents: Staying Close Without Taking Over', 'Free, gentle help for grandparents: staying close when your grown child asks for space, sharing childcare fairly, house rules and saying no kindly.'),
 'foster-and-kinship.html': ('Raising Someone Else’s Child: Grandparents and Foster Caregivers', 'Free help for grandparents and relatives raising a child (kinship care), foster caregivers and adoptive parents: behavior, house rules and contact visits.'),
 'adhd-kids.html': ('When a Child Has ADHD: For Parents and Grandparents', 'Plain, free help when a child has ADHD: it is real, not bad behavior. Words for fidgeting and forgetting, one instruction at a time, routines and screens.'),
 'grown-up-children.html': ('For Grown-Up Children: Boundaries With a Parent You Love', 'Free, kind help for grown-up children: ask a parent to text before visiting, handle unasked-for advice, the new baby, in-laws and vacations.'),
 # calm, stress and the body
 'nervous-system.html': ('How to Calm Your Nervous System, in Plain Words', 'How your nervous system works: the stress response, fight, flight and freeze, the window of tolerance, the vagus nerve, and what helps you settle.'),
 'calm-without-pills.html': ('Calm Without Pills: What Helps, and What Research Says', 'Everyday ways to ease stress, worry and poor sleep, from movement and daylight to slow breathing, each with the research and every source.'),
 # the book
 'book/index.html': ('Free Self-Help Book Online: Spread Love & Acceptance', 'Read the whole self-help book free online: 26 chapters in three parts on yourself, sharing a life fairly and understanding people. No sign-up, no account.'),
 'book/download.html': ('Books and Downloads: Every PDF, Worksheet, Video and Song', 'Every book, PDF, worksheet, video and song you can take with you, on one page. Read and use everything free online; PDFs ask for your email once.'),
 'book/whole.html': ('The Whole Book on One Page (Book Text)', 'Every chapter of the book, in order, on one page: read straight through, search it or print it. Free to read, with no account.'),
 'book/whole-in-depth.html': ('The Whole Book on One Page (Expanded Versions)', 'Every chapter of the book in its expanded version, in order, on one page, ready to read straight through or print. Free, no sign-up.'),
 'book/for-yourself.html': ('The Book for One Person: Know Yourself, Understand People', 'Part One (yourself) and Part Three (understanding people) of the free book on one page: everything you can read and use on your own. No sign-up.'),
 'book/for-yourself-in-depth.html': ('The Book for One Person (Expanded Versions)', 'Part One and Part Three of the free book in their expanded versions, on one page: the research, more examples and more to try on your own. No sign-up.'),
 'book/together.html': ('The Book for Two or More: Sharing a Home Fairly', 'Part Two of the free book on one page: sharing a home, work or care fairly with partners, family, roommates, co-parents or coworkers. No sign-up.'),
 'book/together-in-depth.html': ('The Book for Two or More (Expanded Versions)', 'Part Two of the free book in its expanded versions, on one page: the invisible work, getting back in tune, a fair split and the monthly look-back. No sign-up.'),
 'book/understanding.html': ('Understanding People: How Feelings, Stress and Trust Work', 'Part Three of the free book on one page: seventeen short chapters on how feelings, stress, trust, change, grief, anger and love work. No sign-up.'),
 'book/understanding-in-depth.html': ('Understanding People (Expanded Versions)', 'Part Three of the free book in its expanded versions, on one page: seventeen chapters through psychology, philosophy and an autistic lens. No sign-up.'),
 'book/self-1-then-in-depth.html': ('Know Yourself, Then, in Depth: Where Your Lens Came From', None),
 'book/self-2-now-in-depth.html': ('Know Yourself, Now, in Depth: Wiring, State and Words', None),
 'book/self-3-next-in-depth.html': ('Know Yourself, Next, in Depth: Who You Are Becoming', None),
 'book/understanding-5-belonging.html': ('Attachment, Trust and Belonging: Chapter 5', 'Why belonging is a basic need, how early bonds shape what we expect, how trust grows in small moments, and how to rebuild it and find your people. Free.'),
 'book/understanding-16-worry.html': ('Worry, Low Mood and Trauma: Chapter 16', 'How worry and anxiety work, low mood versus depression, what trauma is and isn’t, what helps day to day, and how to support someone.'),
 'book/understanding-16-worry-in-depth.html': ('Chapter 16 in Depth: Worry, Low Mood and Trauma', 'Worry, low mood and trauma in full: anxiety and avoidance, worry time, depression, behavioral activation, sleep, trauma-informed care, therapy and help.'),
 'book/understanding-17-groups.html': ('Fitting In: Groups, Influence and Culture, Chapter 17', 'Why fitting in pulls so hard: conformity, obedience, us and them, norms, family culture, groups online, and how to stay yourself and disagree kindly.'),
 'book/understanding-17-groups-in-depth.html': ('Chapter 17 in Depth: Groups, Influence and Culture', 'Groups in full: Asch and Milgram with honest replication notes, social identity, norms, culture with care, family culture, online groups and kind dissent.'),
 'book/afterword.html': ('Afterword: What the Book Adds Up To', 'A short closing page: what Parts One to Three were for, six threads that run through the whole book, and where to go from here.'),
 'book/afterword-in-depth.html': ('Afterword in Depth: What the Book Adds Up To', 'The afterword in full: the three parts, six threads, how the book used evidence, why more than one lens, what a book can’t do, and where to go next.'),
 'book/understanding-13-anger.html': ('Anger: What It’s For and What to Do, Chapter 13', 'What anger is for, what it does in the body, steps for the hot minutes, why venting backfires, how to repair, and when anger becomes harm.'),
 'book/understanding-14-personality.html': ('Personality and Temperament: Chapter 14', 'Personality as sliders, not boxes: the Big Five, temperament, introverts and extraverts, how people change with age, and living with different people.'),
 'book/understanding-15-love.html': ('Closeness and Love: How Intimacy Grows, Chapter 15', 'How closeness grows: love in many forms, intimacy as being known, feeling understood, attachment in adult love, and love across ages and relationships.'),
 # the Frequency Buddies cartoon
 'frequency-buddies-season-2.html': ('Frequency Buddies Season 2: The Great Big Sea', 'Frequency Buddies Season 2 is here: Tidbit and Sugarfoot set sail with a map in a bottle. Watch the new episodes free, and the two-minute teaser.'),
 'frequency-buddies-shuffle.html': ('Frequency Buddies: Every Episode on Shuffle', 'Every Frequency Buddies episode back to back in a random order, with the theme song: a free cartoon about feelings for all ages, plus Season 1 to download.'),
 # the rest of this round's new and changed pages
 'communication.html': ('Effective Communication: A Complete, Plain Guide', 'A free, plain guide to effective communication: how to listen, say what you need, pick a good time, have hard talks and repair after a fight.'),
 'bonding.html': ('Bonding Ideas: How Closeness Grows, for Any Relationship', 'How closeness grows, from research on bids, responsiveness and play, plus a free idea picker for partners, kids, teens, friends, family and coworkers.'),
 'week-0.html': ('Week 0: A Calm Start to the Six-Week Program', 'Five minutes before the six weeks: what each week is, how long it takes, doing it alone or with anyone, and why missing a week is fine.'),
 'perspective-shifter.html': ('See It From Their Side: A Free Perspective-Taking Tool', 'Step into the other person’s side of a moment: their day, their wiring, what they could see and what they could not. A free, private tool.'),
 'start-in-10-minutes.html': ('Start in 10 Minutes: Four Small Steps', 'Four small steps, just for you or with someone: check your weather, read one short piece, notice your pattern, then pick one small change. No sign-up.'),
 # descriptions that ran past 155 characters, rewritten so nothing is cut mid-thought
 'complacency.html': ('Complacency in Relationships: When “Fine” Goes Unchecked', 'Complacency isn’t laziness: it is what happens when something has worked for a long time and we stop looking. How to spot it, and small re-checks.'),
 'complacency-in-depth.html': (None, 'Why good things fade into the background, the quiet signs of complacency in yourself and every kind of relationship, and small, kind re-checks that help.'),
 'know-yourself.html': ('Know Your Own Wiring: A Self-Discovery Guide', 'Why you react the way you do: your wiring, what life taught you and what is just today, plus kind words to explain what helps to the people around you.'),
 'workpapers/calculators/is-the-setup-working-quick.html': ('Fair Split Check: Is the Setup Working for Everyone?', 'Type in the totals from your chore worksheets, for 2 to 8 people, and see in plain words whether the way you share the load works for everyone.'),
 'workpapers/wp-03-one-owner-per-job-in-depth.html': ('WP-03 in Depth: One Owner per Job, With a Helper', 'The full household chore agreement: give every regular job one owner, with an optional helper, so nothing slips and nobody has to keep asking.'),
 'book/understanding-14-personality-in-depth.html': ('Chapter 14 in Depth: Personality and Temperament', 'Personality in full: traits, temperament, situations, energy, change with age and on purpose, through psychology, philosophy and an autistic lens.'),
 'book/understanding-5-belonging-in-depth.html': ('Chapter 5 in Depth: Attachment, Trust and Belonging', 'Belonging in full: the need to belong, attachment, trust, safe havens, masking and rebuilding trust, through psychology, philosophy and an autistic lens.'),
 'five-pillars.html': ('The Five Pillars of Fair, Kind Relationships', 'Five simple ideas for fair, kind relationships: see the whole mental load, fix the setup instead of the person, read your stress first, tune how you talk.'),
 'how-to-stop-fighting-with-your-partner.html': ('How to Stop Fighting With Your Partner: 7 Calm Steps', 'Calm, practical ways to stop fighting with your partner: notice the early signs, take a real pause, check your words and fix what keeps causing fights.'),
 'turning-toward.html': ('Turning Toward: 7 Small Habits for Closer Relationships', 'Connection grows in small moments. Seven simple habits for love and appreciation: notice when someone reaches for you, say specific thanks, repair gently.'),
 'relationships.html': ('Relationship Tools for Couples, Families and Roommates', 'Free ways to share chores fairly, use kinder words and hold calmer check-ins, for couples, families, co-parents, friends, roommates, coworkers and caregivers.'),
 'pursue-withdraw.html': ('One of You Wants to Talk Now, the Other Needs Space', 'Even-handed help when one partner wants to talk now and the other needs space: why it hurts on both sides, and a pause plan to fill out and share. Free.'),
 'workpapers/wp-01.html': ('Who Did What: A One-Week Chore Log and Kind Ways to Say No', 'A one-week log of who did what at home, plus three calm ways to say no or “not right now” without a fight. A free worksheet for couples and roommates.'),
 'recheck-drive.html': ('The Re-check Drive: A Calm Football Game', 'A calm football game with no clock and no way to lose. Do the small, kind re-checks from the complacency playbook for real, and the ball moves down the field.'),
 'touchstones-in-depth.html': ('Touchstones in Full: Shared Words, Jokes and Rituals', 'The full guide to touchstones: shared words, jokes, rituals and stories, how they go stale, what to do when one goes wrong, and a four-week plan.'),
 'sent-this.html': ('Sent This by Someone? What They Can and Can’t See', 'Someone sent you Spread Love & Acceptance? What they can and can’t see, what stays yours, and kind ways to say yes, not yet or no.'),
})

# Round 11 (Oct 2026): seo-additions from save10, tools11, collab10 and shot10 (search11 and splash10 added none).
# save10's and tools11's lines are trimmed to 60/155 here. /conversation-reader.html is now a noindex redirect to
# /signal-translator.html#conversation, so process() leaves it alone and it stays out of the sitemap.
SEARCH.update({
 'saved.html': ('Your Saved Places: Pages, Tools and Book Spots', 'The pages, tools and places in the book you saved for later, kept only on this device. Open one to pick up right where you were.'),
 'on-this-device.html': ('Your Progress and What’s Stored on This Device', 'Keep your progress private and safe: save a backup file, move it to another phone or the free app, lock it with a passcode, or clear it. Nothing is sent to us.'),
 'tools.html': ('All Free Tools: Start on Your Own, Then Together', 'Every free tool in one place, the ones you can use on your own first. Filter by what you want to do, who it is for and your time. No sign-up, no account.'),
 'together.html': ('Work on It Together: Share Results by Link, QR Code or Text', 'Fill in a tool on your own phone and pass it back and forth by QR code, text or email. Put your results side by side. Nothing is stored on our side.'),
 'signal-translator.html': ('Chat Analyzer: Check a Text, a Reply or a Whole Chat', 'Check how a text may land before you send it, read one you got, or add a whole chat or screenshot to see where it turned. Free, private, on your device.'),
})

# land16 (Oct 2026): three campaign front doors under /start/, one per audience and ad. Each has its own sharing image
# (IMAGE_INFO below), a lower sitemap priority than the main tools (priority()) and is left out of the main menu.
SEARCH.update({
 'start/chores.html': ('Who Does What at Home? A 2-Minute Chore Check for Two', 'Arguing about housework and the mental load? Each of you taps who mostly does each job, then see where you agree. Free, private, no sign-up.'),
 'start/text-check.html': ('Check a Text Before You Send It: Free Tone Checker', 'About to send a tense text? See how it may land and get a clearer version that keeps your point. Free, private: nothing you type leaves your device.'),
 'start/breakup.html': ('Want to Text Your Ex? Start Here, Before You Send', 'In the first weeks after a breakup: check a message before you send it, three steps for tonight, and gentle next steps. Free and private, on your device.'),
 # lang21 (wave21): Support languages, and the hub's description now names it
 'support-languages.html': ('Support Languages: What Helps When You’re Having a Hard Time', 'Seven support languages, from needing room to needing a hand: what each looks like, how it gets misread both ways, a short quiz and words to ask for help that works. Free.'),
 'languages-of-connection.html': ('Love, Apology and Appreciation Languages, Together', 'Love, apology, support and appreciation languages, touchstones and your wiring, in one picture: seven layers from you outward, and where to start.'),
 # return21 (wave21): the Contact page, and Email updates now promise at most one email a week
 'contact.html': ('Contact Us: Tell Us What Would Make This Better', 'Tell us what helped, what was confusing and what is missing. Email us, get one small idea a week by email, share the site or add it to your home screen.'),
 'membership.html': ('Email Updates: One Small Idea a Week (Optional)', 'Everything here is free, with no account. If you like, get at most one email a week: one small thing to try in a minute, and what is new on the site.'),
 # media21 (wave21): the Sleeping Pals Cam
 'sleeping-pals-cam.html': ('Sleeping Pals Cam: Two Pups and Your Fur Babies Asleep, for Bedtime', 'A calm night cam to go to bed with: Tidbit and Sugarfoot asleep, your own fur babies, a mixer of soft sounds (rain, ocean, fan, brown noise, lullabies) and a sleep timer.'),
 # play21 (wave21): the Bears Dojo's music corner
 'bears-dojo.html': ('The Bears Dojo: A Calm Temple Garden to Wander Into', 'Wander a quiet temple garden where Tidbit and Sugarfoot tend the grounds, build your own bear, then step inside for gentle things to do and a music corner with instruments and long, slow songs.'),
})

# fixB28 (QA 28): complete titles of 60 characters or fewer, so none of them is cut with "…" in search results and chat citations;
# and the names the tools page and the menu now use (Calm games, Learn by doing)
SEARCH.update({
 'what-am-i-feeling.html': ('Paint Your Feelings: A Private Map of How You Feel', 'Answer a few plain questions, one at a time, and see a map of what may be behind how you feel, an abstract painting made from your own answers, and one or two first steps. It runs on your device and sends nothing anywhere.'),
 'make-a-plan.html': ('Plan It Once: Free Templates for Agreements You Both Keep', 'Pick a template for holidays, a family event, screen time, a shared room, different work hours or a handoff between two homes. Fill it in alone or together, then send it as a link.'),
 'sleeping-pals-cam.html': ('Sleeping Pals Cam: Two Pups Asleep, for Bedtime', 'A calm night cam to go to bed with: Tidbit and Sugarfoot asleep, your own fur babies, a mixer of soft sounds (rain, ocean, fan, brown noise, lullabies) and a sleep timer.'),
 'pause-and-play.html': ('Calm Games and a Place to Relax: Pause & Play, Free', 'Relax with a breathing break, a silent wind-down, slow colors, calm music and sounds, or play a calm game with no timers and no way to lose.'),
 'do/index.html': ('Learn by Doing: Practice the Worksheets on an Example', 'Try the core worksheets on a made-up household first, see your learning map fill in, or watch two rhythms fall into step. Nothing to sign up for.'),
 'brain-map.html': ('Brain Map: How Wiring Differs', 'An explorable map of the brain. See where research finds average differences in autism, ADHD, anxiety, depression, trauma, OCD and dyslexia, and what helps.'),
})

# Titles past about 60 characters and descriptions past about 155 are cut off in search results
TITLE_MAX, DESC_MAX = 60, 155


def fit_title(t):
    if len(t) <= TITLE_MAX: return t
    bare = t.replace(' · ' + BRAND, '')
    if len(bare) <= TITLE_MAX: return bare            # search engines show the site name on their own
    for sep in (' — ', ': ', ' · '):
        head = bare.split(sep)[0]
        if 20 <= len(head) <= TITLE_MAX: return head
    return bare[:TITLE_MAX - 1].rsplit(' ', 1)[0] + '…'


def fit_desc(d):
    d = re.sub(r'\s+', ' ', d).strip()
    if len(d) <= DESC_MAX: return d
    cut = d[:DESC_MAX + 1]
    end = max(cut.rfind('. '), cut.rfind('! '), cut.rfind('? '))
    if end >= 90: return cut[:end + 1]
    # otherwise stop after the last whole item or clause, so a list never ends mid-phrase ("... and the.")
    end = max(cut.rfind(', '), cut.rfind('; '), cut.rfind(': '), cut.rfind(' — '))
    if end >= 100: return cut[:end].rstrip(',;:—- ') + '.'
    return d[:DESC_MAX].rsplit(' ', 1)[0].rstrip(',;:—-') + '.'


# The Frequency Buddies season as one video, for video search (with a chapter for each episode)
SEASON_VIDEO = {
    'url': SITE + '/assets/video/frequency-buddies-season-1.mp4', 'thumb': SITE + '/assets/img/frequency-buddies-season-1.jpg',
    'name': 'Frequency Buddies · Season 1 · All five episodes', 'duration': 'PT1H14M5S', 'seconds': 4445, 'uploaded': '2026-10-03',
    'desc': 'Five gentle animated episodes for all ages: Tidbit and Sugarfoot set off on big little quests, hit real tough times and find their way through, together. With the theme song, captions in the picture and chapters.',
    'chapters': [(0, 905, 'Episode 1: The Storm Over the Treehouse'), (905, 1792, 'Episode 2: Out of Tune'), (1792, 2662, 'Episode 3: The Heavy Basket'),
                 (2662, 3538, 'Episode 4: Who Broke the Kite?'), (3538, 4445, 'Episode 5: The Longest Night')],
}
# each episode is its own video file (every file stays under the 25 MB limit some hosts have)
EPISODE_VIDEOS = [{'url': SITE + '/assets/video/frequency-buddies-s1e%d.mp4' % (i + 1), 'thumb': SEASON_VIDEO['thumb'], 'name': 'Frequency Buddies · ' + n,
                   'seconds': b - a, 'duration': 'PT%dM%dS' % ((b - a) // 60, (b - a) % 60), 'uploaded': SEASON_VIDEO['uploaded'],
                   'desc': 'A gentle animated episode for all ages: Tidbit and Sugarfoot on a big little quest, with the theme song and captions in the picture.'}
                  for i, (a, b, n) in enumerate(SEASON_VIDEO['chapters'])]
VIDEO_PAGES = ('frequency-buddies.html', 'frequency-buddies-shuffle.html')

# Older copies of a worksheet that compete with the page the menu links to. Each one points search
# engines at the linked page (rel=canonical) and stays out of the sitemap; nothing is deleted or unlinked.
CANONICAL_TO = {
    'wp-01.html': 'workpapers/wp-01.html',
    'wp-02.html': 'workpapers/wp-02-how-much-are-you-carrying.html',
    'wp-03.html': 'workpapers/wp-03-one-owner-per-job.html',
    'wp-04.html': 'workpapers/wp-04-what-keeps-coming-back.html',
    'wp-09.html': 'workpapers/wp-09-say-it-so-it-lands.html',
    'wp-13.html': 'workpapers/wp-13-daily-check-in.html',
    '/workpapers/wp-04-what-keeps-coming-back.html': 'workpapers/wp-04-what-keeps-coming-back.html',
    '/wp-11.html': 'wp-11.html',
    'is-the-setup-working.html': 'workpapers/calculators/is-the-setup-working-quick.html',
}

# Sharing images: size and a plain description for each one used in og:image
IMAGE_INFO = {
    OG_IMAGE: (1200, 630, 'image/png', 'Two friends sharing one heart, with two happy pups: Spread Love & Acceptance'),
    SEASON_VIDEO['thumb']: (1280, 720, 'image/jpeg', 'Tidbit and Sugarfoot, the two pups of the Frequency Buddies cartoon'),
    SITE + '/assets/img/frequency-buddies-season-2-teaser.jpg': (1280, 720, 'image/jpeg', 'Frequency Buddies Season 2: Tidbit and Sugarfoot under a starry sky'),
    # land16: the /start/ front doors' own sharing images (rendered from a small HTML template; the headline as text)
    SITE + '/assets/img/og/start-chores.png': (1200, 630, 'image/png', 'Who really does what at home? Find out in 2 minutes, together. With Tidbit and Sugarfoot, two friendly pups.'),
    SITE + '/assets/img/og/start-text-check.png': (1200, 630, 'image/png', 'Check a text before you send it. With Professor Puddles, a cheerful raindrop in a graduation cap.'),
    SITE + '/assets/img/og/start-breakup.png': (1200, 630, 'image/png', 'When you want to text them, start here. A sleepy pup under a crescent moon.'),
}
PAGE_IMAGE = {p: SEASON_VIDEO['thumb'] for p in ('frequency-buddies.html', 'frequency-buddies-shuffle.html', 'frequency-buddies-live.html', 'frequency-buddies-music-video.html', 'frequency-buddies-music-video-maker.html')}
PAGE_IMAGE.update({'start/%s.html' % n: SITE + '/assets/img/og/start-%s.png' % n for n in ('chores', 'text-check', 'breakup')})

AUTHOR_NAME = 'Christian'
AUTHOR = {'@type': 'Person', '@id': SITE + '/about.html#christian', 'name': AUTHOR_NAME, 'url': SITE + '/about.html'}
PUBLISHER = {'@type': 'Organization', '@id': SITE + '/#org', 'name': BRAND, 'url': SITE + '/',
             'logo': {'@type': 'ImageObject', 'url': LOGO}}

# The book, in reading order: Part One (yourself), Part Two (between us: the Preface and Chapters I to V),
# Part Three (understanding people, seventeen chapters) and the afterword. 26 chapters and an afterword in all.
BOOK_PARTS = [('Part One, Then: Where your lens came from', 'book/self-1-then.html'), ('Part One, Now: Your wiring, weather and words', 'book/self-2-now.html'),
              ('Part One, Next: Shaping who you are becoming', 'book/self-3-next.html')]
BOOK_PARTS += [('Preface: The work nobody sees', 'book/preface.html'), ('Chapter I: Why we get out of tune', 'book/chapter-1.html'),
              ('Chapter II: Is the split working?', 'book/chapter-2.html'), ('Chapter III: Full tanks and different angles', 'book/chapter-3.html'),
              ('Chapter IV: Two kinds of fair', 'book/chapter-4.html'), ('Chapter V: The monthly look-back', 'book/chapter-5.html')]
# Part Three: Understanding people, seventeen chapters on how people work (each also has an -in-depth page)
BOOK_PARTS += [('Part Three, Chapter %d: %s' % (i + 1, n), 'book/understanding-%s.html' % s) for i, (s, n) in enumerate([
    ('1-feelings', 'How feelings work'),
    ('2-stress', 'Stress and the nervous system'),
    ('3-seeing', 'How we see each other'),
    ('4-communication', 'How communication works'),
    ('5-belonging', 'Attachment, trust and belonging'),
    ('6-change', 'Habits and change'),
    ('7-worth', 'Self-worth, shame and self-compassion'),
    ('8-loss', 'Loss, grief and big life changes'),
    ('9-minds', 'Minds that work differently'),
    ('10-values', 'Values, meaning and a good life'),
    ('11-healing', 'Healing after hurt'),
    ('12-helping', 'Helping others well'),
    ('13-anger', 'Anger'),
    ('14-personality', 'Personality, temperament and change'),
    ('15-love', 'Closeness and love'),
    ('16-worry', 'Worry, low mood and trauma'),
    ('17-groups', 'Fitting in: groups, influence and culture'),
])]
BOOK_PARTS += [('Afterword: What the book adds up to', 'book/afterword.html')]
BOOK_ID = SITE + '/book/#book'
BOOK_DESC = ('A free self-help book in three parts, 26 chapters in all, and an afterword: knowing yourself (three chapters); sharing a '
             'life, a home or a job fairly and kindly (the Preface and Chapters I to V); and understanding people, seventeen chapters '
             'on how feelings, stress, trust, change, grief, healing, anger, personality, worry, groups and love work.')
# The book as free PDF files (book/download.html), each as the book text and an expanded version
BOOK_PDFS = [('The whole book', 'whole'), ('The book for one person (Parts One and Three)', 'for-yourself'),
             ('The book for two or more (Part Two)', 'together'), ('Understanding People (Part Three)', 'understanding')]

# The middle step of each page's breadcrumb trail (name, page)
CRUMB_PARENTS = [
    (r'^book/', 'The book', 'book/index.html'),
    (r'^library/', 'Psychology in plain words', 'library.html'),
    (r'^learn/index-in-depth', 'Philosophy for everyday life', 'learn/index.html'),
    (r'^(workpapers/|wp-\d|prog-01-in)', 'Which part of the program to use', 'program.html'),
    (r'^(coin-pusher|night-garden|bears-dojo|word-bloom|quiet-crossword|quiet-words|daily-ledger|frequency-journey|calm-visualizer|keepsakes)', 'Calm games', 'pause-and-play.html'),
    (r'^frequency-buddies-', 'Frequency Buddies', 'frequency-buddies.html'),
]


def video_ld(publisher):
    return [{'@type': 'VideoObject', 'name': v['name'], 'description': v['desc'], 'thumbnailUrl': [v['thumb']], 'uploadDate': v['uploaded'],
             'duration': v['duration'], 'contentUrl': v['url'], 'embedUrl': SITE + '/frequency-buddies.html?ep=s1e%d' % (i + 1), 'isFamilyFriendly': True,
             'inLanguage': 'en-US', 'publisher': publisher} for i, v in enumerate(EPISODE_VIDEOS)]


def series_ld(publisher):
    eps = [('s1e1', 'The Storm Over the Treehouse'), ('s1e2', 'Out of Tune'), ('s1e3', 'The Heavy Basket'), ('s1e4', 'Who Broke the Kite?'), ('s1e5', 'The Longest Night')]
    eps2 = [('s2e1', 'The Great Big Sea'), ('s2e2', 'The Lighthouse in the Fog'), ('s2e3', 'Room for One More')]   # no video files for Season 2 yet
    season = lambda n, name, el: {'@type': 'TVSeason', 'seasonNumber': n, 'name': name, 'numberOfEpisodes': len(el),
                                  'episode': [{'@type': 'TVEpisode', 'episodeNumber': i + 1, 'name': t, 'url': SITE + '/frequency-buddies.html?ep=' + e} for i, (e, t) in enumerate(el)]}
    return {'@type': 'TVSeries', 'name': 'Frequency Buddies', 'description': 'A gentle animated series for all ages starring two pups, Tidbit and Sugarfoot.',
            'genre': ['Animation', 'Kids & Family'], 'inLanguage': 'en-US', 'isFamilyFriendly': True, 'url': SITE + '/frequency-buddies.html',
            'image': SEASON_VIDEO['thumb'], 'publisher': publisher, 'numberOfSeasons': 2, 'numberOfEpisodes': len(eps) + len(eps2),
            'character': [{'@type': 'Person', 'name': 'Tidbit'}, {'@type': 'Person', 'name': 'Sugarfoot'}],
            'containsSeason': [season(1, 'Season 1: The First Adventures', eps), season(2, 'Season 2: The Great Big Sea', eps2)]}


TOOLS = (r'^(tools/|signal-translator|carrier-wave-decoder|conversation-reader|lemonade-stand|calc01-solvency|is-the-setup-working|wiring-card|quick-checks|full-path|workpapers/calculators|do/|snapshot/|pal-cam-tv|ask'
         r'|perspective-shifter|ladder|refusals|wavelength|write-it-through|look-back-30-days|find-your-start|how-you-take-things-in)')
# Pages that list other pages (marked as a collection, with the site search on explore.html)
HUBS = r'^(book/index\.html|tools\.html|explore\.html|by-relationship\.html|contents\.html|pause-and-play\.html)$'
GAMES = r'^(coin-pusher|recheck-drive|quiet-words|word-bloom|quiet-crossword|daily-ledger-crossword|frequency-journey|night-garden|bears-dojo|calm-visualizer)'
ARTICLES = r'^(support-languages|invisible-labor-mental-load|chore-chart-for-couples|grandparents|how-to-stop-fighting|neurodivergent-relationships|book/|library/|learn/|workpapers/wp-|workpapers/report|wp-|five-pillars|turning-toward|complacency|check-ins|know-yourself|wired-differently|frequency-framework|how-it-works|relationships|self-path|glossary|communication\.html|bonding|living-alone|stepfamily|new-relationship|nervous-system|calm-without-pills|calming-supplements|love-languages|apology-languages|languages-of-connection|appreciation-at-work|touchstones|co-parenting|parents|teens|new-parent|share-the-load|grief|caregivers|family-rifts|work\.html|friends|more-than-two|gaming-and-time-together|money-together|foster-and-kinship|adhd-kids|grown-up-children|coming-home|different-hours|two-faiths|coming-out|on-my-own|sharing-a-room|when-one-is-ill|empty-nest|retired-together|family-obligations|long-distance|pursue-withdraw|small-wins|why-this-site|growing-up|polymath|communication-style-quiz|for-teachers|for-counselors|research\.html)'


def rel_url(path):
    if path == 'index.html':
        return '/'
    if path.endswith('/index.html'):
        return '/' + path[:-len('index.html')]
    return '/' + path


def git_date(path):
    try:
        out = subprocess.run(['git', 'log', '-1', '--format=%cs', '--', path], cwd=ROOT, capture_output=True, text=True).stdout.strip()
        return out or datetime.date.today().isoformat()
    except Exception:
        return datetime.date.today().isoformat()


def pages():
    out = []
    for dp, dns, fns in os.walk(ROOT):
        rel = os.path.relpath(dp, ROOT)
        top = rel.split(os.sep)[0]
        if rel == 'tools':
            dns[:] = []          # /tools/*.html are real pages; the folders under it are build scripts
        elif rel != '.' and top in SKIP_DIRS:
            dns[:] = []
            continue
        for fn in fns:
            if not fn.endswith('.html'):
                continue
            p = fn if rel == '.' else os.path.join(rel, fn).replace(os.sep, '/')
            if p in SKIP_FILES:
                continue
            out.append(p)
    return sorted(out)


def text_of(s):
    return html.unescape(re.sub(r'<[^>]+>', '', s)).strip()


def clean_title(t, path):
    t = text_of(t)
    t = re.sub(r'\s*[\(\[]?TOL-OS[\)\]]?', '', t).strip(' —·|-')
    t = re.sub(r'\s*[—·|]\s*$', '', t)
    if BRAND in t:
        return t
    return (t + ' · ' + BRAND) if t else BRAND


def keywords_for(path):
    kw = list(BASE_KEYWORDS)
    for pat, extra in SECTION_KEYWORDS:
        if re.search(pat, path):
            kw += extra
    seen, out = set(), []
    for k in kw:
        if k.lower() not in seen:
            seen.add(k.lower()); out.append(k)
    return out


_TITLES = {}


def short_title(path):
    """A page's own title without the site name, for breadcrumbs."""
    if path not in _TITLES:
        st = SEARCH.get(path, (None, None))[0]
        if not st:
            try:
                m = re.search(r'<title>(.*?)</title>', open(os.path.join(ROOT, path), encoding='utf-8').read(), re.S)
                st = text_of(m.group(1)) if m else path
            except OSError:
                st = path
        _TITLES[path] = st.replace(' · ' + BRAND, '').strip()
    return _TITLES[path]


def git_first_date(path):
    try:
        out = subprocess.run(['git', 'log', '--diff-filter=A', '--follow', '--format=%cs', '--', path], cwd=ROOT, capture_output=True, text=True).stdout.split()
        return out[-1] if out else datetime.date.today().isoformat()
    except Exception:
        return datetime.date.today().isoformat()


def plain(s):
    return re.sub(r'\s+', ' ', text_of(s)).strip()


# Everything is free and open (CONFIG.openAll in assets/js/site.js): no part of any page is
# behind the sign-up, so nothing is marked as paid. Set to False if the sign-up gate comes back.
OPEN_ALL = True


FAQ_HEADING = re.compile(r'<h2[^>]*>\s*(?:Questions people (?:often )?ask|Frequently asked questions|Common questions)\s*</h2>', re.I)


def faq_of(body):
    """Question-and-answer pairs from a visible FAQ: an element with id="faq" (or an h2 such as "Questions people often
    ask"), with h3 questions and p answers, or <details> blocks whose <summary> is the question."""
    i = body.find('id="faq"')
    if i < 0:
        m = FAQ_HEADING.search(body)
        if not m: return []
        i = m.start()
    lock = body.find('locked-section')
    if 0 <= lock < i and not OPEN_ALL: return []                    # questions hidden behind the sign-up are not marked up
    j = body.find('</h2>', i)
    if j < 0: return []
    ends = [k for k in (body.find('<h2', j), body.find('</section>', j), body.find('</main>', j)) if k > 0]
    region = body[j:min(ends)] if ends else body[j:]
    out = []
    for q, a in re.findall(r'<h3[^>]*>(.*?)</h3>\s*((?:<p[^>]*>.*?</p>\s*|<ul[^>]*>.*?</ul>\s*|<ol[^>]*>.*?</ol>\s*)+)', region, re.S):
        q, a = plain(q), plain(a)
        if q and a: out.append((q, a))
    for q, a in re.findall(r'<details[^>]*>\s*<summary[^>]*>(.*?)</summary>(.*?)</details>', region, re.S):
        q, a = plain(q), plain(a)
        if q.endswith('?') and a: out.append((q, a))
    return out


def howtos_of(body):
    """Step lists marked <ol data-howto="Name">, as HowTo steps."""
    out = []
    for name, inner in re.findall(r'<ol[^>]*\bdata-howto="([^"]+)"[^>]*>(.*?)</ol>', body, re.S):
        steps = []
        for li in re.findall(r'<li[^>]*>(.*?)</li>', inner, re.S):
            m = re.search(r'<strong>(.*?)</strong>', li, re.S)
            steps.append((plain(m.group(1)).rstrip('.:') if m else plain(li)[:80], plain(li)))
        if steps: out.append((html.unescape(name), steps))
    return out


def crumbs(path, title, url):
    items = [(BRAND, SITE + '/')]
    parent = None
    if path.endswith('-in-depth.html'):
        simple = path.replace('-in-depth.html', '.html')
        if os.path.exists(os.path.join(ROOT, simple)): parent = (short_title(simple), SITE + rel_url(simple))
    if not parent:
        for pat, name, page in CRUMB_PARENTS:
            if re.search(pat, path) and page != path:
                parent = (name, SITE + rel_url(page)); break
    if parent and parent[1] != items[0][1]: items.append(parent)
    items.append((title.replace(' · ' + BRAND, ''), url))
    return {'@type': 'BreadcrumbList', 'itemListElement': [{'@type': 'ListItem', 'position': i + 1, 'name': n, 'item': u} for i, (n, u) in enumerate(items)]}


def ld_for(path, title, desc, url, kw, modified, published, body, image):
    publisher = PUBLISHER
    website = {'@type': 'WebSite', '@id': SITE + '/#website', 'name': BRAND, 'url': SITE + '/'}
    locked = 'locked-section' in body and not OPEN_ALL
    common = {'@id': url + '#page', 'name': title, 'headline': title[:110], 'description': desc, 'url': url, 'inLanguage': 'en-US',
              'isAccessibleForFree': not locked, 'keywords': ', '.join(kw), 'publisher': publisher, 'isPartOf': website,
              'datePublished': published, 'dateModified': modified, 'image': image,
              'primaryImageOfPage': {'@type': 'ImageObject', 'url': image}}
    if locked:   # part of the page opens with the free email sign-up: say so, the way search engines ask
        common['hasPart'] = {'@type': 'WebPageElement', 'isAccessibleForFree': False, 'cssSelector': '.locked-section'}
    graph = []
    if path in ('index.html', 'about.html'):
        graph.append({'@type': 'Organization', '@id': SITE + '/#org', 'name': BRAND,
                      'alternateName': ['Spread Love and Acceptance', 'spreadloveandacceptance'],
                      'url': SITE + '/', 'logo': {'@type': 'ImageObject', '@id': SITE + '/#logo', 'url': LOGO, 'contentUrl': LOGO, 'caption': BRAND},
                      'image': {'@id': SITE + '/#logo'}, 'email': EMAIL, 'slogan': TAGLINE, 'description': ABOUT_ORG,
                      'founder': AUTHOR,
                      'knowsAbout': ['self-help', 'relationships', 'love and acceptance', 'kindness', 'appreciation', 'communication in relationships',
                                     'mental load', 'invisible labor', 'division of labor at home', 'household chores for couples', 'calm',
                                     'breathing exercises', 'mindfulness', 'neurodiversity', 'neurodivergent relationships', 'self-discovery']})
        graph.append(dict(AUTHOR, **{'jobTitle': 'Creator of ' + BRAND, 'worksFor': {'@id': SITE + '/#org'},
                                     'description': 'Christian (they/them) created ' + BRAND + ' after working as a government auditor.'}))
    if path == 'index.html':
        graph.append({'@type': 'WebSite', '@id': SITE + '/#website', 'name': BRAND, 'alternateName': ['Spread Love and Acceptance'],
                      'url': SITE + '/', 'description': desc, 'inLanguage': 'en-US', 'publisher': {'@id': SITE + '/#org'}, 'keywords': ', '.join(kw),
                      # explore.html reads ?q= and searches every page on the site
                      'potentialAction': {'@type': 'SearchAction', 'target': {'@type': 'EntryPoint', 'urlTemplate': SITE + '/explore.html?q={search_term_string}'},
                                          'query-input': 'required name=search_term_string'}})
        graph.append(dict(common, **{'@type': 'WebPage', 'about': {'@id': SITE + '/#org'}}))
    elif path == 'about.html':
        graph.append(dict(common, **{'@type': 'AboutPage', 'mainEntity': {'@id': AUTHOR['@id']}}))
    elif re.search(HUBS, path):
        graph.append(dict(common, **{'@type': 'CollectionPage'}))
    elif re.search(GAMES, path):
        graph.append(dict(common, **{'@type': 'WebApplication', 'applicationCategory': 'GameApplication', 'operatingSystem': 'Any (web browser)',
                                     'browserRequirements': 'Requires JavaScript', 'offers': {'@type': 'Offer', 'price': '0', 'priceCurrency': 'USD'}}))
    elif re.search(TOOLS, path) or path.startswith('workpapers/fill/'):
        graph.append(dict(common, **{'@type': 'WebApplication', 'applicationCategory': 'LifestyleApplication', 'operatingSystem': 'Any (web browser)',
                                     'browserRequirements': 'Requires JavaScript', 'offers': {'@type': 'Offer', 'price': '0', 'priceCurrency': 'USD'}}))
    elif re.search(ARTICLES, path):
        art = dict(common, **{'@type': 'Article', 'author': AUTHOR, 'mainEntityOfPage': {'@type': 'WebPage', '@id': url}})
        if path.startswith('book/'):
            art['isPartOf'] = {'@type': 'Book', '@id': BOOK_ID, 'name': BOOK_NAME, 'url': SITE + '/book/', 'author': AUTHOR, 'publisher': publisher}
        graph.append(art)
    else:
        graph.append(dict(common, **{'@type': 'WebPage'}))
    if path in ('book/index.html', 'book/download.html'):
        book = {'@type': 'Book', '@id': BOOK_ID, 'name': BOOK_NAME, 'alternateName': BOOK_NAME + ': a free self-help book on knowing yourself, sharing the load and understanding people',
                'description': BOOK_DESC, 'url': SITE + '/book/', 'author': AUTHOR, 'publisher': publisher, 'inLanguage': 'en-US',
                'bookFormat': 'https://schema.org/EBook', 'isAccessibleForFree': True, 'image': OG_IMAGE, 'genre': ['Self-help', 'Psychology', 'Relationships'],
                # the free PDFs: the four books (book/download.html asks for an email address before a book downloads)
                'workExample': [{'@type': 'Book', 'name': 'Book %d: %s (PDF)' % (n, t), 'bookFormat': 'https://schema.org/EBook', 'encodingFormat': 'application/pdf',
                                 'url': SITE + '/book/download.html#book-%d' % n, 'inLanguage': 'en-US', 'isAccessibleForFree': True}
                                for n, t in ((1, 'Know Yourself Kindly'), (2, 'Heal and Steady'), (3, 'Understanding Each Other'), (4, 'Share the Load'))]}
        if path == 'book/index.html':
            book['hasPart'] = [{'@type': 'Chapter', 'position': i + 1, 'name': n, 'url': SITE + rel_url(p)} for i, (n, p) in enumerate(BOOK_PARTS)]
        graph.append(book)
    faq = faq_of(body)
    if faq:
        graph.append({'@type': 'FAQPage', '@id': url + '#faq', 'url': url, 'inLanguage': 'en-US', 'isPartOf': {'@id': url + '#page'},
                      'mainEntity': [{'@type': 'Question', 'name': q, 'acceptedAnswer': {'@type': 'Answer', 'text': a}} for q, a in faq]})
    for name, steps in howtos_of(body):
        graph.append({'@type': 'HowTo', 'name': name, 'description': desc, 'inLanguage': 'en-US', 'image': image, 'url': url,
                      'totalTime': None, 'step': [{'@type': 'HowToStep', 'position': i + 1, 'name': n, 'text': t, 'url': url}
                                                  for i, (n, t) in enumerate(steps)]})
        graph[-1].pop('totalTime')
    if path in VIDEO_PAGES:
        graph.extend(video_ld(publisher)); graph.append(series_ld(publisher))
    if path != 'index.html':
        graph.append(crumbs(path, title, url))
    return {'@context': 'https://schema.org', '@graph': graph}


def attr(s):
    return html.escape(s, quote=True)


# The site installed as an app ("Spread Love & Acceptance" on the home screen): full screen on iPhone and iPad,
# the bigger iPad icons, and a start-up screen for each common iPhone and iPad size (portrait). The images are
# in assets/icons/ and assets/icons/splash/ (light background, the icon in the middle, the name under it).
APP_TAGS = ['<meta name="apple-mobile-web-app-capable" content="yes">',
            '<meta name="mobile-web-app-capable" content="yes">',
            '<meta name="apple-mobile-web-app-title" content="' + attr(BRAND) + '">',
            '<meta name="apple-mobile-web-app-status-bar-style" content="default">',
            '<link rel="apple-touch-icon" href="/assets/icons/apple-touch-icon-152.png" sizes="152x152">',
            '<link rel="apple-touch-icon" href="/assets/icons/apple-touch-icon-167.png" sizes="167x167">']
SPLASH_SIZES = [(440, 956, 3), (402, 874, 3), (430, 932, 3), (393, 852, 3), (428, 926, 3), (390, 844, 3), (375, 812, 3),
                (414, 896, 3), (414, 896, 2), (414, 736, 3), (375, 667, 2),
                (744, 1133, 2), (820, 1180, 2), (810, 1080, 2), (834, 1194, 2), (834, 1112, 2), (1024, 1366, 2), (1032, 1376, 2), (768, 1024, 2)]
SPLASH_TAGS = ['<link rel="apple-touch-startup-image" href="/assets/icons/splash/splash-%dx%d.png" media="(device-width: %dpx) and (device-height: %dpx) and (-webkit-device-pixel-ratio: %d) and (orientation: portrait)">'
               % (w * r, h * r, w, h, r) for (w, h, r) in SPLASH_SIZES]

# The installed app's launch cover (written near the top of each page's head by process(), between launch:start and
# launch:end): in the app only (never in a browser tab), once per launch, a plain cover in the
# app's colour shows before the page paints, and launch-pups.js (Tidbit and Sugarfoot running up and down the screen
# until the page is ready, always gone within 2.5 seconds) starts loading. Keep it in step with the copy in site.js.
LAUNCH_BOOT = ['<style id="lp-boot-css">html.lp-boot::before{content:"";position:fixed;inset:0;z-index:2147483000;background:#F5EFDE;transition:opacity .25s;'
               'animation:lp-boot-gone .25s ease 1.9s forwards}@keyframes lp-boot-gone{to{opacity:0;visibility:hidden}}'
               'html.lp-boot.lp-dark::before{background:#1E1B24}html.lp-boot-out::before{opacity:0}</style>',
               '<script>(function(){try{var d=document.documentElement,m=window.matchMedia;'
               'if(!((m&&m("(display-mode: standalone)").matches)||navigator.standalone===true)||window.top!==window||sessionStorage.getItem("tol-launch-seen")'
               '||/^\\/upset-right-now\\.html$/.test(location.pathname))return;'
               'var t=localStorage.getItem("tol-theme");if(t==="dark"||(t!=="light"&&m("(prefers-color-scheme: dark)").matches))d.classList.add("lp-dark");'
               'sessionStorage.setItem("tol-launch-seen","1");d.classList.add("lp-boot");var h=document.head,l=document.createElement("link");'
               'l.rel="stylesheet";l.href="/assets/css/launch-pups.css";h.appendChild(l);var s=document.createElement("script");s.src="/assets/js/launch-pups.js";'
               's.onerror=function(){d.classList.remove("lp-boot")};h.appendChild(s);setTimeout(function(){d.classList.remove("lp-boot")},2500)}catch(e){}})();</script>']
# The launch cover above is inline, so a page with its own Content-Security-Policy (the strict worksheet fill pages)
# never gets it: there site.js starts the cover itself, with /assets/css/launch-boot.css instead of an inline style.
CSP_META = 'http-equiv="Content-Security-Policy"'

# The app lock's first moment (save10, /assets/js/lock-boot.js): first thing after the viewport line of EVERY page
# (noindex pages and the strict-CSP fill pages too, which is why it's an external file), so a locked page is hidden
# before it paints. Not on the two pages the lock never covers, and not on redirect stubs. Written by lock_boot(),
# between lock:start and lock:end, and idempotent.
LOCK_BOOT = '<script src="/assets/js/lock-boot.js"></script>'
LOCK_FREE = ('upset-right-now.html',)


def lock_boot(path):
    fp = os.path.join(ROOT, path)
    s = open(fp, encoding='utf-8').read()
    if s.find('</head>') < 0 or 'http-equiv="refresh"' in s[:s.find('</head>')]:
        return False
    new = re.sub(r'\n?<!-- lock:start -->.*?<!-- lock:end -->', '', s, flags=re.S)
    if path not in LOCK_FREE:
        he = new.find('</head>')
        mv = re.search(r'<meta name="viewport"[^>]*>', new[:he]) or re.search(r'<meta charset="[^"]*"\s*/?>', new[:he])
        if mv: new = new[:mv.end()] + '\n<!-- lock:start -->' + LOCK_BOOT + '<!-- lock:end -->' + new[mv.end():]
    if new != s:
        open(fp, 'w', encoding='utf-8').write(new)
        return True
    return False


def process(path, report):
    fp = os.path.join(ROOT, path)
    s = open(fp, encoding='utf-8').read()
    head_end = s.find('</head>')
    if head_end < 0:
        return None
    head = s[:head_end]
    if re.search(r'<meta[^>]+name="robots"[^>]+noindex', head) or 'http-equiv="refresh"' in head:
        return None
    s = re.sub(r'\n?[ \t]*<!-- seo:start -->.*?<!-- seo:end -->[ \t]*', '', s, flags=re.S)
    # the installed app's launch cover goes near the top of <head> (just after the viewport line), so it starts at once
    s = re.sub(r'\n?<!-- launch:start -->.*?<!-- launch:end -->', '', s, flags=re.S)
    # (never on the upset-right-now page: the cover doesn't show there anyway, and that page is left as it is)
    if 'id="lp-boot-css"' not in s[:s.find('</head>')] and CSP_META not in s[:s.find('</head>')] and path not in LOCK_FREE:
        # (after the app-lock line when there is one, so lock_boot() below finds it already in place)
        mv = (re.search(r'<!-- lock:end -->', s[:s.find('</head>')]) or re.search(r'<meta name="viewport"[^>]*>', s[:s.find('</head>')])
              or re.search(r'<meta charset="[^"]*"\s*/?>', s[:s.find('</head>')]))
        if mv: s = s[:mv.end()] + '\n<!-- launch:start -->' + ''.join(LAUNCH_BOOT) + '<!-- launch:end -->' + s[mv.end():]
    ov_title, ov_desc = OVERRIDE.get(path, (None, None))
    st, sd = SEARCH.get(path, (None, None))
    if st: ov_title = st
    if sd: ov_desc = sd
    m = re.search(r'<title>(.*?)</title>', s, re.S)
    old_title = m.group(1) if m else ''
    title = ov_title if ov_title and path == 'index.html' else fit_title(clean_title(ov_title or old_title, path))
    if m:
        s = s[:m.start()] + '<title>' + html.escape(title, quote=False) + '</title>' + s[m.end():]
    else:
        s = s.replace('</head>', '<title>' + html.escape(title, quote=False) + '</title>\n</head>', 1)
    dm = re.search(r'<meta name="description" content="([^"]*)"\s*/?>', s)
    desc = ov_desc or (html.unescape(dm.group(1)) if dm else '')
    if not desc:
        desc = title + '. ' + ABOUT_ORG.split('. ')[0] + '.'
    desc = fit_desc(desc)
    if dm:
        s = s[:dm.start()] + '<meta name="description" content="' + attr(desc) + '">' + s[dm.end():]
    else:
        s = s.replace('</head>', '<meta name="description" content="' + attr(desc) + '">\n</head>', 1)
    canon_path = CANONICAL_TO.get(path, path)
    url = SITE + rel_url(canon_path)
    kw = keywords_for(path)
    modified = git_date(path)
    published = min(git_first_date(path), modified)
    he = s.find('</head>')
    head = s[:he]
    # This block owns the sharing, index and address tags: hand-written copies elsewhere in <head> are taken
    # out so every page carries one consistent set (a page's own sharing image and its description are kept)
    m_img = re.search(r'<meta property="og:image" content="([^"]+)"', head)
    m_alt = re.search(r'<meta property="og:image:alt" content="([^"]+)"', head)
    image = PAGE_IMAGE.get(path) or (html.unescape(m_img.group(1)) if m_img else OG_IMAGE)
    iw, ih, itype, ialt = IMAGE_INFO.get(image, (None, None, None, BRAND))
    if m_alt and m_img and html.unescape(m_img.group(1)) == image: ialt = html.unescape(m_alt.group(1))
    owned = (r'\n?[ \t]*<(?:link rel="canonical"[^>]*|link rel="alternate" hreflang="[^"]*"[^>]*'
             r'|meta (?:property|name)="(?:og|twitter|article):[a-z_:]+"[^>]*|meta name="(?:robots|keywords|author)"[^>]*)>')
    head = re.sub(owned, '', head)
    s = head + s[he:]
    body = s[s.find('</head>'):]
    has = lambda needle: needle in head
    og_type = 'article' if path != 'index.html' and re.search(ARTICLES, path) else 'website'
    # a page in another language says so in its tags
    m_lang = re.search(r'<html[^>]*\slang="([a-z]{2})', s); lang = m_lang.group(1) if m_lang else 'en'
    lines = ['<!-- seo:start -->',
             '<link rel="canonical" href="' + attr(url) + '">',
             '<link rel="alternate" hreflang="' + ('en-us' if lang == 'en' else lang) + '" href="' + attr(url) + '">',
             '<link rel="alternate" hreflang="x-default" href="' + attr(url) + '">',
             '<meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1">',
             '<meta name="keywords" content="' + attr(', '.join(kw)) + '">',
             '<meta name="author" content="' + attr(AUTHOR_NAME + ', ' + BRAND) + '">',
             '<meta name="application-name" content="' + attr(BRAND) + '">' if not has('name="application-name"') else '']
    if path == 'index.html':      # search-console ownership tags, once the owner has the codes (see SITE_VERIFY)
        lines += ['<meta name="%s" content="%s">' % (n, attr(v)) for n, v in SITE_VERIFY.items() if v]
    if not has('name="theme-color"'): lines.append('<meta name="theme-color" content="#F5EFDE">')
    if not re.search(r'rel="(?:[^"]* )?icon', head):
        lines += ['<link rel="icon" href="/favicon.ico" sizes="any">',
                  '<link rel="icon" href="/assets/icons/icon.svg" type="image/svg+xml">',
                  '<link rel="icon" href="/assets/icons/favicon-32.png" type="image/png" sizes="32x32">',
                  '<link rel="icon" href="/assets/icons/favicon-16.png" type="image/png" sizes="16x16">']
    if not has('rel="apple-touch-icon"'): lines.append('<link rel="apple-touch-icon" href="/assets/icons/apple-touch-icon-180.png" sizes="180x180">')
    if not has('rel="manifest"'): lines.append('<link rel="manifest" href="/manifest.webmanifest">')
    if not has('name="apple-mobile-web-app-capable"'): lines += APP_TAGS
    if not has('rel="apple-touch-startup-image"'): lines += SPLASH_TAGS
    lines += ['<meta property="og:site_name" content="' + attr(BRAND) + '">',
              '<meta property="og:title" content="' + attr(title) + '">',
              '<meta property="og:description" content="' + attr(desc) + '">',
              '<meta property="og:type" content="' + og_type + '">',
              '<meta property="og:url" content="' + attr(url) + '">',
              '<meta property="og:image" content="' + attr(image) + '">']
    if itype: lines.append('<meta property="og:image:type" content="' + itype + '">')
    if iw: lines += ['<meta property="og:image:width" content="%d">' % iw, '<meta property="og:image:height" content="%d">' % ih]
    lines += ['<meta property="og:image:alt" content="' + attr(ialt) + '">',
              '<meta property="og:locale" content="' + ('en_US' if lang == 'en' else lang + '_US') + '">']
    if og_type == 'article':
        lines += ['<meta property="article:published_time" content="' + published + '">',
                  '<meta property="article:modified_time" content="' + modified + '">',
                  '<meta property="article:author" content="' + attr(SITE + '/about.html') + '">']
    lines += ['<meta name="twitter:card" content="summary_large_image">',
              '<meta name="twitter:title" content="' + attr(title) + '">',
              '<meta name="twitter:description" content="' + attr(desc) + '">',
              '<meta name="twitter:image" content="' + attr(image) + '">',
              '<meta name="twitter:image:alt" content="' + attr(ialt) + '">']
    ld = json.dumps(ld_for(path, title, desc, url, kw, modified, published, body, image), ensure_ascii=False, separators=(',', ':')).replace('</', '<\\/')
    if lang != 'en': ld = ld.replace('"inLanguage":"en-US"', '"inLanguage":"' + lang + '"')
    lines.append('<script type="application/ld+json">' + ld + '</script>')
    lines.append('<!-- seo:end -->')
    s = s.replace('</head>', '\n'.join(l for l in lines if l) + '\n</head>', 1)
    open(fp, 'w', encoding='utf-8').write(s)
    if path in CANONICAL_TO:          # an older copy: its canonical page is the one listed in the sitemap
        return True
    PAGE_IMAGES[path] = images_of(path, body, image)
    report.append((path, title, desc, modified))
    return True


PAGE_IMAGES = {}


def images_of(path, body, image):
    """Real pictures on a page (not icons or drawings), for the sitemap's image entries."""
    from urllib.parse import urljoin
    out = [] if image == OG_IMAGE else [image]
    for src in re.findall(r'<img[^>]+src="([^"]+)"', body):
        if src.startswith('data:') or not re.search(r'\.(png|jpe?g|webp|gif)(\?|$)', src, re.I) or 'logo' in src or '/icons/' in src:
            continue
        u = urljoin(SITE + rel_url(path), src)
        if u.startswith(SITE) and u not in out: out.append(u)
    return out[:10]


ROBOTS = """# Welcome, people and search engines. Spread Love & Acceptance is free and open:
# please read, index and cite anything here, except the private folders below.

User-agent: *
Allow: /
Disallow: /manuscript/
Disallow: /notes/
Disallow: /infrastructure/

Sitemap: https://spreadloveandacceptance.com/sitemap.xml
"""


def priority(path):
    if path == 'index.html': return '1.0'
    if path.startswith('start/'): return '0.5'   # land16: the campaign front doors stay below the tools they lead to
    if re.search(r'^(start-here|five-pillars|relationships|pause-and-play|ask|signal-translator|library\.html|turning-toward|complacency|night-garden|sent-this|start-in-10|about|contents|program|frequency-buddies|conversation-reader|check-ins|tools\.html|explore|invisible-labor-mental-load|chore-chart-for-couples|how-to-stop-fighting|neurodivergent-relationships|communication\.html|share-the-load|nervous-system|calm-without-pills|calming-supplements|love-languages\.html|apology-languages|co-parenting|living-alone\.html|book/index|lemonade-stand)', path): return '0.9'
    if re.search(r'^(book/|library/|workpapers/fill/suite|coin-pusher|frequency-journey|soundscapes|calm-visualizer|word-bloom|quiet-words|quiet-crossword|daily-ledger)', path): return '0.8'
    return '0.6'


def write_sitemap(report):
    rows = ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1" xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">']
    vid = ''.join(('<video:video><video:thumbnail_loc>%s</video:thumbnail_loc><video:title>%s</video:title><video:description>%s</video:description>'
           '<video:content_loc>%s</video:content_loc><video:duration>%d</video:duration><video:family_friendly>yes</video:family_friendly></video:video>') % (
           html.escape(v['thumb']), html.escape(v['name']), html.escape(v['desc'][:2000]), html.escape(v['url']), v['seconds']) for v in EPISODE_VIDEOS)
    for path, title, desc, mod in sorted(report, key=lambda r: (-float(priority(r[0])), r[0])):
        imgs = ''.join('<image:image><image:loc>%s</image:loc></image:image>' % html.escape(u) for u in PAGE_IMAGES.get(path, []))
        rows.append('  <url><loc>%s</loc><lastmod>%s</lastmod><changefreq>weekly</changefreq><priority>%s</priority>%s%s</url>' % (html.escape(SITE + rel_url(path)), mod, priority(path), imgs, vid if path in VIDEO_PAGES else ''))
    rows.append('</urlset>')
    open(os.path.join(ROOT, 'sitemap.xml'), 'w', encoding='utf-8').write('\n'.join(rows) + '\n')


GROUPS = [
    ('Start here', r'^(contact|index|start-here|start-in-10|find-your-start|sent-this|someone-sent-you-this|about|how-it-works|is-this-for-you|why-this-site|ways-in|program\.html|contents|tools\.html|explore|glossary|five-pillars|relationships|self-path|whats-new|membership|how-you-take-things-in|week-0|do\.html|what-am-i-feeling)'),
    ('Guides to common questions', r'^(communication\.html|bonding|complacency|invisible-labor-mental-load|chore-chart-for-couples|grandparents|how-to-stop-fighting|neurodivergent-relationships|communication-style-quiz'
                                   r'|love-languages|apology-languages|support-languages|languages-of-connection|appreciation-at-work|touchstones|nervous-system|calm-without-pills|calming-supplements|living-alone|stepfamily|new-relationship|small-wins|growing-up)'),
    ('Tools for kinder conversations and fair relationships', r'^(ask|signal-translator|carrier-wave|conversation-reader|write-it-through|perspective-shifter|wavelength|wired-differently|wiring-card|brain-map|turning-toward|check-ins|know-yourself|quick-checks|lemonade|look-back-30-days|calc01|full-path|snapshot|tools/)'),
    ('Worksheets (the Workpaper Suite)', r'^(workpapers|wp-|do/|prog-01|suite-index|program-overview)'),
    ('Calm, breathing and sound', r'^(night-garden|bears-dojo|calm-visualizer|soundscapes|wp-11-sound|echoes-of-gold|pal-cam)'),
    ('Frequency Buddies, a cartoon about feelings for all ages', r'^frequency-buddies'),
    ('Calm games', r'^(pause-and-play|recheck-drive|quiet-words|word-bloom|quiet-crossword|daily-ledger|frequency-journey|quest)'),
    ('Help for your situation', r'^(by-relationship|examples|for-teachers|groups\.html|infographic|ladder|refusals|upset-right-now|friends|more-than-two|gaming-and-time-together|money-together|foster-and-kinship|adhd-kids|grown-up-children|coming-home|different-hours|two-faiths|coming-out|on-my-own|for-counselors|sharing-a-room|family-rifts|empty-nest|when-one-is-ill|caregivers|grief|work\.html|teens|parents|co-parenting|new-parent|share-the-load|long-distance|retired-together|family-obligations|pursue-withdraw)'),
    ('The book, Part Three: Understanding people', r'^book/understanding-'),
    ('The book', r'^book/'),
    ('Psychology in plain words, philosophy and further reading', r'^(library|learn/|reading|research\.html|method-and-limits|polymath|frequency-framework)'),
    ('About this site', r'^(install|roadmap|telemetry|on-this-device|surprise|keepsakes|brand|legal/|architecture/)'),
]


def write_llms(report):
    by = {p: (t, d) for p, t, d, _ in report}
    intro = ['# ' + BRAND, '',
             '> ' + ABOUT_ORG, '',
             'Key facts:',
             '- Website: ' + SITE + '/ . Free to use: every page, tool and chapter is open to everyone, with no sign-up, no account and no paid version. Email updates are optional.',
             '- Who it is for: anyone who wants to understand themselves and get along more kindly and fairly with others: partners, families, co-parents, friends, roommates, coworkers and caregivers, and people exploring on their own.',
             '- Themes: self-help, relationships, love, kindness, appreciation, acceptance, reconciliation and repair, calm, peace, harmony, breathing and quiet moments, connection, fairness and the invisible "mental load", and differences in how people are wired.',
             '- The Five Pillars: see the whole load; fix the setup, not the person; read your state first; tune how you send and receive; notice the quiet incentives.',
             '- Privacy: what people type into the tools stays on their own device.',
             '- It is education and self-reflection, not therapy, diagnosis or treatment.',
             '- Mascots: two pups, Tidbit (black mask) and Sugarfoot (white feet). Chat helper: Professor Puddles.',
             '- Status: a young start-up with a working, growing suite; new tools and content are added continually (see ' + SITE + '/whats-new.html).',
             '- Contact: ' + EMAIL, '']
    short, full = list(intro), list(intro)
    used = set()
    for name, pat in GROUPS:
        items = sorted([p for p in by if re.search(pat, p) and p not in used], key=lambda p: (p != 'index.html', re.sub(r'\d+', lambda m: m.group().zfill(3), p)))
        if not items: continue
        short.append('## ' + name); full.append('## ' + name)
        for p in items:
            used.add(p)
            t, d = by[p]
            line = '- [%s](%s)' % ('Home' if p == 'index.html' else t.replace(' · ' + BRAND, ''), SITE + rel_url(p))
            if not p.endswith('-in-depth.html'):
                short.append(line + ': ' + d)
            full.append(line + ': ' + d)
        short.append(''); full.append('')
    rest = [p for p in sorted(by) if p not in used]
    if rest:
        full.append('## More')
        for p in rest:
            t, d = by[p]
            full.append('- [%s](%s): %s' % (t.replace(' · ' + BRAND, ''), SITE + rel_url(p), d))
        full.append('')
    short.append('## Optional'); short.append('- [Every page, with descriptions](' + SITE + '/llms-full.txt)'); short.append('')
    open(os.path.join(ROOT, 'llms.txt'), 'w', encoding='utf-8').write('\n'.join(short))
    open(os.path.join(ROOT, 'llms-full.txt'), 'w', encoding='utf-8').write('\n'.join(full))


def guard():
    """The removed content (safety lines, outside resources, the Spanish layer) never comes back through the SEO
    outputs: tools/checks/no-removed-content.js checks every title, description and URL written here. Stops on any hit."""
    import subprocess, sys
    outs = [os.path.join(ROOT, n) for n in ('sitemap.xml', 'llms.txt', 'llms-full.txt', 'robots.txt')]
    r = subprocess.run(['node', os.path.join(ROOT, 'tools', 'checks', 'no-removed-content.js')] + outs, capture_output=True, text=True)
    if r.returncode != 0:
        sys.stdout.write(r.stdout + r.stderr)
        sys.exit('build_seo: removed content found in the SEO outputs (see above).')


def main():
    report = []
    locks = 0
    for p in pages():
        process(p, report)
        if lock_boot(p): locks += 1
    open(os.path.join(ROOT, 'robots.txt'), 'w', encoding='utf-8').write(ROBOTS)
    write_sitemap(report)
    write_llms(report)
    guard()
    print('pages tagged: %d; sitemap: %d urls; robots.txt, llms.txt and llms-full.txt written; app-lock head line changed on %d pages' % (len(report), len(report), locks))


if __name__ == '__main__':
    main()
