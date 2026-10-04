#!/usr/bin/env python3
"""Search and AI discoverability for spreadloveandacceptance.com.

Run from the repo root after pages change:   python3 tools/seo/build_seo.py

What it does (all idempotent; safe to run again and again):
  1. In every page that should be found, writes one block between
     <!-- seo:start --> and <!-- seo:end --> inside <head>: a canonical address, index rules,
     sharing tags (Open Graph and Twitter), theme keywords and schema.org structured data (JSON-LD)
     describing the page as an article, a free web app, a game, the podcast or the site itself.
  2. Tidies titles (no internal "TOL-OS" names; the site name at the end) and fills in missing or
     improved descriptions for the key pages.
  3. Writes robots.txt (everyone welcome, AI crawlers named explicitly), sitemap.xml (with each
     page's last-changed date from git) and llms.txt + llms-full.txt, the plain summaries that AI
     assistants read to understand and cite a site.
Pages marked noindex, redirects, 404 and offline pages are left alone and kept out of the sitemap.
"""
import html, json, os, re, subprocess, sys, datetime

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
SITE = 'https://spreadloveandacceptance.com'
BRAND = 'Spread Love & Acceptance'
PROGRAM = 'The Objective Ledger'
EMAIL = 'patrick.christian.andrews@gmail.com'
OG_IMAGE = SITE + '/assets/img/og-image.png'
LOGO = SITE + '/assets/img/logo-stacked.png'
TAGLINE = 'See it fairly. Say it kindly.'
SKIP_DIRS = ('.claude', '.git', 'node_modules', 'tools', 'manuscript', 'notes', 'infrastructure', 'data', 'assets', '.well-known')
SKIP_FILES = {'404.html', 'offline.html'}

ABOUT_ORG = ('Spread Love & Acceptance is a young, independent start-up building The Objective Ledger: a free, '
             'growing suite of self-help tools for understanding yourself and sharing life kindly with the people '
             'around you. It brings together practical relationship tools, gentle games, calm breathing and sound '
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
    (r'^(night-garden|calm-visualizer|soundscapes|wp-11-sound|pause-and-play|echoes-of-gold)',
     ['calm', 'relaxation', 'breathing', 'meditation', 'mindfulness', 'peace', 'soundscapes', 'ambient music', 'sound frequencies', 'higher frequency']),
    (r'^frequency-buddies', ['animated stories', 'cartoon for kids and families', 'Tidbit and Sugarfoot', 'kindness stories', 'working through tough times together', 'captions']),
    (r'^(frequency-journey|frequency-framework)', ['higher frequency', 'sound frequencies', 'Solfeggio tones', 'harmony', 'being in tune', 'calm puzzle game']),
    (r'^(quiet-words|word-bloom|quiet-crossword|daily-ledger-crossword|quest|keepsakes|garden-backdrop|pal-cam)',
     ['calm games', 'relaxing word games', 'crossword', 'word search', 'cozy games', 'no timers', 'Tidbit and Sugarfoot']),
    (r'^(signal-translator|carrier-wave|conversation-reader|wired-differently|wiring-card|turning-toward|check-ins|know-yourself|ask|tools/)',
     ['communication tool', 'tone checker', 'how a message lands', 'repair after an argument', 'reconciliation', 'neurodiversity', 'listening', 'connection']),
    (r'^(workpapers|wp-|calc01|lemonade|quick-checks|full-path|do/|snapshot|dashboard|suite-index|prog-01)',
     ['chore chart', 'fair division of labor', 'household workload', 'mental load worksheet', 'stress check', 'calm-down plan', 'daily check-in', 'free worksheets']),
    (r'^wavelength', ['communication style quiz', 'personality type quiz', 'neurodivergent', 'ADHD', 'autistic', 'AuDHD', 'how you think, talk and listen', 'self-discovery journal']),
]

# Better titles and descriptions for the pages people are most likely to search for.
OVERRIDE = {
    'index.html': (
        'Spread Love & Acceptance · Free self-help for calm, kind relationships',
        'Free, kind self-help for understanding yourself and the people you love: tools for fair, calm relationships, '
        'kinder conversations and appreciation, gentle games, breathing and calm soundscapes. Everything stays on your device.'),
    'start-here.html': (None,
        'New here? Start with the one idea behind Spread Love & Acceptance: understand yourself first, then share the load '
        'kindly. The best first steps, free tools and a six-week path for calmer, kinder relationships.'),
    'five-pillars.html': (None,
        'The five simple ideas behind The Objective Ledger: see the whole load, fix the setup not the person, read your '
        'state first, tune how you send and receive, and notice the quiet incentives. Kindness and fairness, made practical.'),
    'relationships.html': (None,
        'How The Objective Ledger helps every kind of relationship: partners, family, co-parents, friends, roommates, '
        'coworkers and caregivers. Fair ways to share the load, kinder words and calmer check-ins.'),
    'turning-toward.html': (None,
        'Connection is built in small, everyday moments. Seven simple practices for love and appreciation: noticing when '
        'someone reaches for you, specific thanks, celebrating good news and gentle repair after a hard moment.'),
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
        'Calm soundscapes and gentle music made for The Objective Ledger: breathing tracks, peaceful ambient pieces and '
        'songs about love, acceptance and finding your way back to each other.'),
    'frequency-journey.html': (None,
        'The Frequency Journey: help Tidbit and Sugarfoot find the Perfect Frequency through seven tone-themed worlds of '
        'calm puzzles, riddles and small lessons about harmony, patience and being in tune with each other.'),
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
        'Paste a text thread or chat and see where it turned, what each of you may be hearing, and calmer replies built '
        'from your own words. A free, private tool for repair and reconciliation.'),
    'library.html': (None,
        'The Professor’s Library: 233 plain-language entries on relationships, conflict and reconciliation, kindness, '
        'gratitude, emotions, stress, calm and differences in wiring, with honest notes on the evidence.'),
    'sent-this.html': (None,
        'Someone sent you Spread Love & Acceptance? Here is what they can and can’t see, what stays yours, and kind ways '
        'to say yes, not yet or no. Nothing is entered about you without you.'),
    'about.html': (None,
        'The story behind Spread Love & Acceptance and The Objective Ledger: fifteen years auditing complex systems, a '
        'lifetime of wondering how people work, and a free, growing suite of tools for kinder relationships.'),
    'legal/privacy-policy.html': ('Privacy Policy', 'How Spread Love & Acceptance handles your information: what you type in the tools stays on your device.'),
    'legal/terms-of-service.html': ('Terms of Service', 'The terms for using Spread Love & Acceptance and The Objective Ledger.'),
    'legal/refund-policy.html': ('Cancellation & Refund Policy', 'Cancellation and refund terms for Spread Love & Acceptance.'),
    'architecture/architecture.html': ('The site’s architecture, in detail', 'The full technical picture of how The Objective Ledger is put together: pages, tools, privacy and how it all connects.'),
    'architecture/index.html': ('How the site is built', 'How The Objective Ledger is designed and built, and why.'),
}

# search-led titles and descriptions: what people type, in plain words (title without the site name)
SEARCH = {
 'index.html': ('Free Relationship Self-Help · Spread Love & Acceptance', 'Free tools for fair, kind relationships: share chores fairly, talk without fighting and calm down before hard talks, plus calm games and a kids’ cartoon.'),
 'start-here.html': ('Start Here: Fairer, Kinder Relationships, Step by Step', 'New here? The one idea behind it all, the best first tools and a gentle six-week path to fairer chores and kinder conversations at home.'),
 'five-pillars.html': ('The Five Pillars of Fair, Kind Relationships', 'Five simple ideas for fair, kind relationships: see the whole load, fix the setup not the person, read your state first, and tune how you talk.'),
 'relationships.html': ('Relationship Tools for Couples, Family and Roommates', 'Fair ways to share chores, kinder words and calmer check-ins for partners, families, co-parents, friends, roommates, coworkers and caregivers.'),
 'signal-translator.html': ('Tone Checker: See How Your Text Will Land', 'A free tone checker: type a text or message and see how it may land, what they may hear, and a kinder, clearer way to say it. Private, on your device.'),
 'conversation-reader.html': ('Text Thread Reader: Calm Replies After a Fight', 'Paste a text thread and see where it turned, what each of you may be hearing, and calmer replies in your own words. Free and private.'),
 'turning-toward.html': ('Turning Toward: 7 Small Habits for Closer Relationships', 'Connection grows in small moments. Seven simple practices: notice when someone reaches for you, give specific thanks, and repair gently after a hard moment.'),
 'check-ins.html': ('Relationship Check-Ins: A Simple, Kind Weekly Ritual', 'A short, kind check-in for couples, families and housemates: what went well, what felt heavy, and one small change to try next.'),
 'quick-checks.html': ('Daily Mood Check-In: How’s Your Weather Today?', 'A 60-second check-in on how you’re doing today, with a gentle forecast for hard talks and a calm pause with something soothing to do.'),
 'ask.html': ('Free Relationship Help Chat: Ask Professor Puddles', 'Describe what’s going on in a relationship and get kind, practical next steps and words you could use. Free and private: what you type stays on your device.'),
 'library.html': ('Relationship Psychology Library, in Plain English', 'Hundreds of plain-language entries on relationships, conflict, kindness, gratitude, emotions, stress, calm and wiring, with honest notes on the evidence.'),
 'pause-and-play.html': ('Calm Games for a Busy Mind: Free, No Timers', 'Free calm games with no timers and no way to lose: the Night Garden, the Frequency Journey, Word Bloom, crosswords and a word search, with two friendly pups.'),
 'night-garden.html': ('The Night Garden: A Calm Breathing Game', 'A peaceful garden at night: breathe slowly to make flowers bloom, guide fireflies into constellations and stack glowing stones. A free, calm game.'),
 'calm-visualizer.html': ('Drift: A Calm Visualizer With Soft Tones', 'Tell Drift how you feel, put on headphones and let slow, dreamy visuals, kind words and gentle tones keep you company for a few quiet minutes.'),
 'word-bloom.html': ('Word Bloom: A Relaxing Letter-Wheel Word Game', 'A free, calm word game: spin a wheel of letters and find the hidden words. Levels from easy to tricky, no timers and no ads.'),
 'quiet-crossword.html': ('Quiet Crossword: Easy, Gentle Mini Crosswords', 'Small, friendly crosswords with gentle clues, from easy to tricky. Free, calm and no timers: a peaceful puzzle for a few quiet minutes.'),
 'quiet-words.html': ('Quiet Words: A Calm, Free Word Search', 'A calming word search with soft themes, levels from easy to tricky and no timers. Free to play on your phone or computer.'),
 'daily-ledger-crossword.html': ('Daily Crossword Puzzle, Newspaper Style (Free)', 'A free newspaper-style crossword with fair, friendly clues. Play in your browser on any device, at your own pace.'),
 'frequency-journey.html': ('The Frequency Journey: A Calm Puzzle Adventure', 'Help Tidbit and Sugarfoot find the Perfect Frequency through seven worlds of calm puzzles, riddles and small lessons about patience and harmony.'),
 'frequency-buddies.html': ('Frequency Buddies: A Kids’ Cartoon About Feelings', 'Gentle animated episodes for kids and families: two pups, Tidbit and Sugarfoot, face tough times, talk it through and come out stronger. Free, with captions.'),
 'frequency-buddies-live.html': ('Frequency Buddies Live: Drop In Anytime', 'A Frequency Buddies TV station that is always on: drop in anytime, watch the episode playing right now, and cast it to your TV.'),
 'frequency-buddies-shuffle.html': ('Frequency Buddies: Watch Every Episode on Shuffle', 'Every Frequency Buddies episode back to back in a random order, with the theme song, plus every episode to download and watch offline.'),
 'soundscapes.html': ('Calm Soundscapes and Relaxing Music', 'Calm soundscapes and gentle music: breathing tracks, peaceful ambient pieces and songs about love, acceptance and finding your way back to each other.'),
 'pal-cam-tv.html': ('Pal Cam TV: A Cozy Puppy Cam for Your TV', 'Two cartoon pups play, nap and explore live on your TV, with calm music and soft place sounds. Free to cast or play full screen.'),
 'wp-01.html': ('Fair Chore Chart: Who Did What (WP-01)', 'A free chore chart worksheet: note who did what this week, see the split clearly, and find kind ways to say no. For couples, families and roommates.'),
 'wp-02.html': ('How Much Are You Carrying? A Stress Self-Check (WP-02)', 'A quick self-check of how full your plate feels today, to help you pace a hard talk. A reflection tool, not a test or diagnosis.'),
 'wp-03.html': ('Who Owns Which Chore? One Owner per Job (WP-03)', 'Give every recurring job one owner from start to finish, so nothing slips and nobody nags. A free household planning worksheet.'),
 'wp-04.html': ('Mental Load Audit: What Keeps Coming Back? (WP-04)', 'Find the jobs and arguments that keep coming back, see the invisible work behind them, and fix the setup instead of blaming a person.'),
 'wp-09.html': ('Say It So It Lands: Kinder Wording (WP-09)', 'Turn a hard sentence into one that lands: what you mean, what they may hear, and a calmer way to say it. A free communication worksheet.'),
 'wp-11.html': ('Calm-Down Kit: A Plan for Heated Moments (WP-11)', 'Make a simple plan for heated moments: your signs, a pause signal, what helps you settle, and how to come back to the talk kindly.'),
 'wp-13.html': ('90-Second Daily Check-In for Couples (WP-13)', 'A 90-second daily check-in for couples and housemates: how you’re doing, what’s coming up, and one small way to help.'),
 'lemonade-stand.html': ('Who Did What This Week? A Simple Chore Tracker', 'A friendly chore tracker for the week: note who did what, see the balance at a glance, and talk about it without blame.'),
 'calc01-solvency.html': ('Is the Chore Split Fair? A Free Calculator (CALC-01)', 'A free calculator for the household split: time, effort and the invisible jobs, so you can see whether the setup works for everyone.'),
 'prog-01.html': ('A Six-Week Guided Program for Fairer Chores', 'Six gentle weeks, one worksheet a week: see the load, give every job an owner, check your batteries and how you talk, then look at what changed.'),
 'wired-differently.html': ('Wired Differently: Neurodiversity in Relationships', 'How different minds can hear the same words differently, and simple ways to share plans, chores and feedback so they land for everyone.'),
 'know-yourself.html': ('Know Your Own Wiring: A Self-Discovery Guide', 'Understand how you take in plans, change and feedback, and how to explain what helps you to the people you live and work with.'),
 'wavelength.html': ('Wavelength: Free Communication Style Quiz and Self-Discovery Guide', 'A free quiz on how you think, talk and listen. Pick your wiring (ADHD, autistic, AuDHD and more) and get your four-letter Wave Code and archetype.'),
 'perspective-shifter.html': ('The Perspective Shifter: See It From Their Side', 'A simple tool for seeing a moment from someone else’s side: their state, wiring, surroundings and history, and what each of you could and couldn’t see.'),
 'polymath.html': ('The Polymath Way: How Every Field Connects', 'How psychology, economics, nature, music and more grow from the same few roots, and how a polymath joined nine fields into one program you can learn.'),
 'about.html': ('About Spread Love & Acceptance', 'The story behind Spread Love & Acceptance and The Objective Ledger: a free, growing suite of tools for kinder, fairer relationships.'),
 'book/preface.html': ('The Work Nobody Sees: Invisible Labor at Home', 'The preface: the planning, remembering and noticing that keeps a home running, why it goes unseen, and how seeing it changes everything.'),
 'book/chapter-1.html': ('Why We Get Out of Tune (Chapter I)', 'Chapter I: why kind people still end up resentful at home, and how small mismatches in what we see and expect add up over time.'),
 'book/chapter-2.html': ('Is the Chore Split Working? (Chapter II)', 'Chapter II: a fair way to ask whether the household split is working for everyone, counting time, effort and the invisible jobs.'),
 'book/chapter-3.html': ('Stress, Full Tanks and Different Angles (Chapter III)', 'Chapter III: how a full stress tank changes what we hear and say, and why the same moment looks different from each side.'),
 'book/chapter-4.html': ('Two Kinds of Fair at Home (Chapter IV)', 'Chapter IV: equal and fair are not the same. How to find a split that fits your real lives, strengths and seasons.'),
 'book/chapter-5.html': ('The Monthly Relationship Look-Back (Chapter V)', 'Chapter V: a calm monthly look-back to see what changed, celebrate it, and adjust the setup before resentment builds.'),
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
 'index.html': ('Spread Love & Acceptance: Free Relationship Self-Help Tools', 'Free self-help for love and acceptance at home: share the mental load, a fair chore chart, calm ways to stop fighting, a communication quiz and a kids’ cartoon.'),
 'start-here.html': ('Start Here: Fair Chores, Calm Talks, Kinder Relationships', 'New here? The one idea behind it all, the best free first tools, and a gentle six-week path to fairer chores, fewer fights and kinder talks at home.'),
 'five-pillars.html': ('The Five Pillars of Fair, Kind Relationships', 'Five simple ideas for fair, kind relationships: see the whole mental load, fix the setup instead of the person, read your stress first, and tune how you talk.'),
 'relationships.html': ('Relationship Tools for Couples, Families and Roommates', 'Free ways to share chores fairly, use kinder words and hold calmer check-ins, for couples, families, co-parents, friends, roommates, coworkers and caregivers.'),
 'about.html': ('About Spread Love & Acceptance and Its Creator', 'Meet Christian, the creator of Spread Love & Acceptance and The Objective Ledger: fifteen years auditing systems, and a free, growing suite of kindness tools.'),
 'how-it-works.html': ('How It Works: An Outside Look at Yourself', 'How the program works: a calm, outside view of your life situation, your wiring and what you notice, like an honest auditor with no verdict on your worth.'),
 'contents.html': ('Contents: Every Free Tool, Guide and Chapter', 'Everything in the program in three parts: tools for understanding yourself, tools for any two people, and where to start in your kind of relationship.'),
 'is-this-for-you.html': ('Is This Right for You? What It Is and Isn’t', 'A free self-help program for your own stress and reactions, and a fair way for two people to see what each carries at home. Education, not counseling.'),
 'ways-in.html': ('Ways In: Free While It’s Being Built', 'Everything here is free while it is being built. Most pages need nothing at all, a free email sign-up opens the rest, and paid membership comes later.'),
 'glossary.html': ('Glossary: The Words, in Plain English', 'Every word this site uses, from battery to talk window, in one plain sentence with an example, plus each tool’s everyday name beside its technical one.'),
 'roadmap.html': ('Content Roadmap: What’s Live and What’s Planned', 'What is live today, what is being written and what is planned: the Preface and Chapters I to V are live now, with Chapters VI to XII still to come.'),
 # relationship tools
 'signal-translator.html': ('Tone Checker for Texts: See How Your Message Lands', 'A free tone checker for texts: type a message, see how it may land and what they may hear, then get a kinder, clearer way to say it. Private, on your device.'),
 'conversation-reader.html': ('Text Thread Reader: Calm Replies After a Fight', 'Paste a text thread after a fight and see where it turned, what each of you may be hearing, and calmer replies built from your own words. Free and private.'),
 'turning-toward.html': ('Turning Toward: 7 Small Habits for Closer Relationships', 'Connection grows in small moments. Seven simple habits for love and appreciation: notice when someone reaches for you, give specific thanks, and repair gently.'),
 'check-ins.html': ('Relationship Check-Ins: A Kind Weekly Ritual for Couples', 'A short, kind weekly relationship check-in for couples, families and housemates: what went well, what felt heavy, and one small change to try next week.'),
 'quick-checks.html': ('Daily Mood Check-In and Stress Check: Today’s Weather', 'A one-minute daily mood check-in and stress check: how you are doing today, a gentle forecast for hard talks, and a calm pause with something soothing to do.'),
 'ask.html': ('Free Relationship Help Chat: Ask Professor Puddles', 'Describe what is going on in a relationship and get kind, practical next steps and words you could use. Free and private: what you type stays on your device.'),
 'perspective-shifter.html': ('See It From Their Side: A Free Perspective-Taking Tool', 'Step into the other person’s side of a moment: their day, their wiring, what they could see and what they could not. A free, private perspective-taking tool.'),
 'wired-differently.html': ('Wired Differently: Neurodiversity and Communication', 'How ADHD, autistic and other differently wired minds can hear the same words differently, and simple ways to share plans, chores and feedback that land.'),
 'know-yourself.html': ('Know Your Own Wiring: A Self-Discovery Guide', 'Why you react the way you do: what is your wiring, what life taught you and what is just today, plus kind words to explain what helps to the people around you.'),
 'wiring-card.html': ('Wiring Card: A One-Page “How I Communicate” Card', 'Make a free one-page card about how you take in words, what your silence means, what to avoid and how a request lands best, to share with people you love.'),
 'carrier-wave-decoder.html': ('Carrier Wave Decoder: When a Talk Starts to Go Wrong', 'A guided, step-by-step tool for the moment a conversation starts going sideways: check your state, get back in tune, and look back on the week together.'),
 'growing-up.html': ('Where Your Lens Came From: How Growing Up Shapes You', 'How growing up shapes the adult you are: the big question at each stage, why timing makes some experiences go deeper, and how to choose which old rules to keep.'),
 'self-path.html': ('Your Self-Discovery Path, Step by Step', 'The self-discovery path: understand your own load, rhythms and reactions first, with a few short worksheets and free tools you can use on your own.'),
 # chores and the mental load
 'lemonade-stand.html': ('Who Did What This Week? A Free Chore Tracker', 'A free chore and mental load tracker for one person or a whole home: log who did what this week, see the split or your own load, and talk without blame.'),
 'workpapers/wp-01.html': ('Who Did What: A One-Week Chore Log and Kind Ways to Say No', 'A one-week log of who did what at home, plus three calm ways to say no or “not right now” without starting a fight. A free worksheet for couples and roommates.'),
 'workpapers/wp-02-battery-stress-meter.html': ('Stress Check: How Much Are You Carrying? (WP-02)', 'A five-question stress check that separates how much you are already carrying from how upset you are about one thing. A reflection tool, not a test.'),
 'workpapers/wp-03-raci-treaty.html': ('One Owner per Chore: A Free Household Chore Agreement', 'Give every recurring household chore one clear owner from start to finish, so nothing slips, nobody nags and you stop re-deciding who does what each week.'),
 'workpapers/wp-04-deficit-audit.html': ('Mental Load Audit: Find the Chores That Keep Slipping', 'Once a month, look back at four weeks of chore logs together, find the jobs and arguments that keep coming back, and fix the setup instead of blaming a person.'),
 'workpapers/wp-09-tone-filter.html': ('Say It So It Lands: Kinder Words Before You Reply', 'A quick self-check before you answer something that landed hard, so what you say next is calm, clear and something the other person can actually hear.'),
 'workpapers/wp-13-pll-protocol.html': ('90-Second Daily Check-In for Couples and Housemates', 'A 90-second daily check-in: one sentence each about how you are doing and what is coming up, so small things do not pile up into a weekend argument. Free.'),
 'wp-11.html': ('Calm-Down Kit: A Plan for Heated Moments (WP-11)', 'Make a simple calm-down plan before you need it: your early signs, a pause signal, what helps you settle, and how to come back to the talk kindly and on time.'),
 'wp-11-sound-toolkit.html': ('Calm-Down Sounds: Brown Noise, a Low Hum and More', 'Brown noise, a low hum and a soft flutter for your calm-down plan, plus four tones to use as a signal you agree on. A matter of taste, not a treatment.'),
 'workpapers/calculators/calc01-solvency.html': ('Is the Chore Split Fair? A Free Calculator (CALC-01)', 'Type in the totals from your chore worksheets, for 2 to 8 people, and see in plain words whether the way you share the household load is working for everyone.'),
 'prog-01.html': ('A Six-Week Guided Program for Fairer Chores', 'Six gentle weeks, one worksheet a week: see the mental load, give every chore an owner, check your stress and how you talk, then look at what has changed.'),
 'tools/frequency-calibration.html': ('Are Your Rhythms in Step? Frequency Calibration', 'A worksheet for two people to map their rhythms for money, rest, decisions, check-ins and recovery, and see where they match and where they drift apart.'),
 'snapshot/index.html': ('A 2-Minute Snapshot of How Your Household Shares the Load', 'A gentle two-minute look at how the shared load is set up at home and how it bends, for couples, families, roommates and teams. Not a test or a diagnosis.'),
 # calm, games and media
 'pause-and-play.html': ('Calm Games for a Busy Mind: Free, No Timers', 'Free calm games with no timers and no way to lose: the Night Garden breathing game, the Frequency Journey, Word Bloom, crosswords and a cozy word search.'),
 'night-garden.html': ('The Night Garden: A Calm Breathing Exercise Game', 'A breathing exercise you can play: breathe slowly to make flowers bloom, guide fireflies into constellations and stack glowing stones. Free, calm, no timers.'),
 'calm-visualizer.html': ('Drift: Calm Visuals and Soft Tones to Unwind', 'Tell Drift how you feel, put on headphones, and let slow, dreamy visuals, kind words and gentle tones keep you company for a few quiet minutes of calm.'),
 'soundscapes.html': ('Calm Music and Relaxing Soundscapes', 'Calm music and relaxing soundscapes: breathing tracks, peaceful ambient pieces and gentle songs about love, acceptance and finding your way back to each other.'),
 'word-bloom.html': ('Word Bloom: A Relaxing Letter-Wheel Word Game', 'A free, relaxing word game: swipe across a wheel of letters to find the hidden words. Hundreds of levels from easy to tricky, with no timers and no ads.'),
 'quiet-words.html': ('Calm Word Search, No Timer: Quiet Words (Free)', 'A calm, free word search with soft themes, levels from easy to tricky and no timer. Every word you find leaves a kind thought behind. Play on phone or computer.'),
 'quiet-crossword.html': ('Quiet Crossword: Easy, Gentle Mini Crosswords', 'Small, friendly mini crosswords with gentle clues in five levels from easy to tricky. Free and calm with no timer: a peaceful puzzle for a few quiet minutes.'),
 'daily-ledger-crossword.html': ('Daily Crossword Puzzle, Newspaper Style (Free)', 'A free newspaper-style daily crossword with fair, friendly clues, from a quick 5x5 mini to a big Sunday grid. Play in your browser on any device, at your pace.'),
 'frequency-journey.html': ('The Frequency Journey: A Calm Puzzle Adventure', 'Help Tidbit and Sugarfoot find the Perfect Frequency through seven worlds of calm puzzles, riddles and small lessons about patience, kindness and harmony.'),
 'frequency-buddies.html': ('Frequency Buddies: A Kids’ Cartoon About Feelings', 'Free animated episodes for kids and families: two pups, Tidbit and Sugarfoot, face tough times, talk it through and come out stronger. With captions.'),
 'frequency-buddies-shuffle.html': ('Frequency Buddies: Every Episode on Shuffle', 'Every Frequency Buddies episode back to back in a random order, with the theme song: a free kids’ cartoon about feelings, plus each episode to download.'),
 'frequency-buddies-music-video-maker.html': ('Make Your Own Frequency Buddies Music Video', 'Make your own Frequency Buddies theme song music video: pick the stage, lights, effects, dance moves, costumes and who’s on stage, then play it and share the link.'),
 'frequency-buddies-music-video.html': ('Frequency Buddies Theme Song Music Video', 'The Frequency Buddies theme song as a music video: Tidbit, Sugarfoot and every friend from the episodes sing, dance and cheer on a stage that moves.'),
 'frequency-buddies-live.html': ('Frequency Buddies Live: A Kids’ Cartoon Channel', 'An always-on Frequency Buddies channel: drop in anytime, watch the kids’ cartoon episode playing right now, and cast it to your TV. Free, with captions.'),
 'frequency-buddies-season-2.html': ('Frequency Buddies Season 2: Watch the Teaser', 'Frequency Buddies Season 2 is coming: watch the one-minute teaser with Tidbit and Sugarfoot, spot the five hidden secrets and pick the new place you can’t wait to see.'),
 'pal-cam-tv.html': ('Pal Cam TV: A Cozy Cartoon Puppy Cam for Your TV', 'Leave two cartoon pups playing and napping on your TV all day, with calm music and light that follows the time of day. Free, no sign-up, ready to cast.'),
 # the book
 'book/preface.html': ('Invisible Labor at Home: The Work Nobody Sees', 'The Preface: the planning, remembering and noticing that keeps a home running, why this invisible work goes unseen, and how seeing it changes everything.'),
 'book/chapter-1.html': ('Why We Get Out of Tune: Communication at Home (Ch. I)', 'Chapter I: why kind people still end up resentful at home, and how small mismatches in pace, tone and what we expect add up, plus how to get back in tune.'),
 'book/chapter-2.html': ('Is the Chore Split Fair? Division of Labor (Ch. II)', 'Chapter II: a fair way to ask whether the division of labor at home is working for everyone, counting time, effort and the invisible jobs, never blame.'),
 'book/chapter-3.html': ('Stress and Seeing Things Differently (Chapter III)', 'Chapter III: how a full stress tank changes what we hear and say, why the same moment looks different from each side, and how to pause before you react.'),
 'book/chapter-4.html': ('Equal vs Fair: Two Kinds of Fair at Home (Ch. IV)', 'Chapter IV: equal and fair are not the same thing. How couples and families find a fair chore split that fits their real lives, strengths and seasons.'),
 'book/chapter-5.html': ('The Monthly Relationship Look-Back (Chapter V)', 'Chapter V: a calm monthly look-back for couples and households to see what changed, celebrate it, and adjust the setup before resentment builds up.'),
 'book/preface-in-depth.html': (None, 'The full Preface: every home keeps a set of books nobody agreed to. Why the invisible work of a shared life matters, and why noticing it is not keeping score.'),
 'book/chapter-1-in-depth.html': (None, 'Chapter I in full: a radio-tuning picture of why two kind people fall out of step, how pace and tone create static, and the steps for getting back in tune.'),
 'book/chapter-2-in-depth.html': (None, 'Chapter II in full: a self-reflection tool that reads whether the household workload split looks like it can last, counting time, effort and invisible jobs.'),
 'book/chapter-3-in-depth.html': (None, 'Chapter III in full: two self-report tools for how much of a reaction is leftover stress, and which of seven angles each person is seeing a moment from.'),
 # library
 'library.html': ('Relationship Psychology Library, in Plain English', 'Hundreds of plain-language entries on relationships, conflict, kindness, gratitude, emotions, stress, calm and wiring, with honest notes on the evidence.'),
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
 'learn/index.html': ('Stories From Philosophy for Everyday Life', 'Twelve old stories from philosophy, retold in plain words, to help you know yourself, see the other person more clearly and live more kindly with others.'),
 # cut-off descriptions
 'check-ins-in-depth.html': (None, 'How to hold a hard conversation kindly: a calm time and place, listening before any reply, a reply that does not erase what was heard, and a plan for both.'),
 'contents-in-depth.html': (None, 'Everything in The Objective Ledger, in three parts: self-discovery tools, relationship tools for any two people, and where to start in each relationship.'),
 'how-it-works-in-depth.html': (None, 'How The Objective Ledger works in full: an outside look at your life situation, your wiring and what you discover, and why the technical layer is optional.'),
 'learn/index-in-depth.html': (None, 'Twelve real stories from philosophy on knowing yourself and living well with others, retold in plain language and linked to the chapters and worksheets.'),
 'wired-differently-in-depth.html': (None, 'How autistic, ADHD, dyslexic, anxious, highly sensitive and neurotypical people can hear the same sentence in very different ways, with examples and research.'),
 'growing-up-in-depth.html': (None, 'A plain-language guide to the stages of growing up and the lens each one leaves: the big question at each stage, why timing matters, and family and culture.'),
 'workpapers/wp-03-raci-treaty-in-depth.html': (None, 'The full household chore agreement: give every regular job one owner, with an optional helper, so nothing slips and nobody has to keep asking who does what.'),
 'workpapers/wp-04-deficit-audit-in-depth.html': (None, 'The full mental load audit: a monthly look-back over four weeks of chore logs and owners, to find the tasks that keep slipping and fix the setup together.'),
 'workpapers/wp-09-tone-filter-in-depth.html': (None, 'The full checklist for getting back in tune before you reply: put the radio-tuning idea from Chapter I into everyday words that are calm, clear and kind.'),
 'workpapers/wp-13-pll-protocol-in-depth.html': (None, 'The full 90-second daily check-in for couples and housemates: a short, easy daily talk that keeps two people in step with small, steady corrections.'),
 'infographic.html': ('The Whole Idea on One Printable Page', 'The whole idea on one printable page: the Five Pillars, how an unowned chore turns into resentment, the Lemonade Stand chore tracker, and three kind phrases.'),
 'frequency-framework.html': ('The Frequency Framework: Getting Back in Step', 'Two people can each run on their own rhythm for money, rest, decisions, talking and values. Why kind people fall out of step, and how to find the beat again.'),
 'suite-index-in-depth.html': (None, 'An honest index of everything that is live today in The Objective Ledger Workpaper Suite: each chapter, worksheet and calculator you can use right now.'),
 'program-overview.html': (None, 'How the program fits together: the chapters explain the ideas and the worksheets put them to use. It also says plainly what is built today and what is not yet.'),
 # new guides
 'invisible-labor-mental-load.html': ('Invisible Labor and the Mental Load: How to Share It', 'What invisible labor and the mental load are, real examples from everyday home life, and five calm steps couples and families can use to share it fairly.'),
 'chore-chart-for-couples.html': ('Fair Chore Chart for Couples (Free, Printable)', 'A free, printable chore chart for couples, families and roommates: list every job, including the invisible ones, give each one an owner and review it weekly.'),
 'how-to-stop-fighting-with-your-partner.html': ('How to Stop Fighting With Your Partner: 7 Calm Steps', 'Practical, calm ways to stop fighting with your partner: notice the early signs, take a real pause, check your words, and fix the setup behind repeat fights.'),
 'neurodivergent-relationships.html': ('Neurodivergent Relationships: ADHD and Autistic Couples', 'Practical tips for ADHD, autistic and AuDHD couples and families: communication differences, sensory overload at home, plans, chores and kind feedback.'),
 'communication-style-quiz.html': ('Communication Style Quiz: Find Your Wave Code (Free)', 'A free communication style quiz: find your four-letter Wave Code and which of 16 archetypes fits, from pace and detail to how you send and receive words.'),
 'grandparents.html': ('For Grandparents: Help Without Taking Over', 'Free, gentle help for grandparents: share childcare fairly, agree on house rules with your adult children, say no kindly, and stay close to your grandkids.'),
})

# Titles past about 60 characters and descriptions past about 160 are cut off in search results
TITLE_MAX, DESC_MAX = 60, 160


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
    return d[:DESC_MAX].rsplit(' ', 1)[0].rstrip(',;:—-') + '.'


# The Frequency Buddies season as one video, for video search (with a chapter for each episode)
SEASON_VIDEO = {
    'url': SITE + '/assets/video/frequency-buddies-season-1.mp4', 'thumb': SITE + '/assets/img/frequency-buddies-season-1.jpg',
    'name': 'Frequency Buddies · Season 1 · All five episodes', 'duration': 'PT1H14M5S', 'seconds': 4445, 'uploaded': '2026-10-03',
    'desc': 'Five gentle animated episodes for kids and families: Tidbit and Sugarfoot set off on big little quests, hit real tough times and find their way through, together. With the theme song, captions in the picture and chapters.',
    'chapters': [(0, 905, 'Episode 1: The Storm Over the Treehouse'), (905, 1792, 'Episode 2: Out of Tune'), (1792, 2662, 'Episode 3: The Heavy Basket'),
                 (2662, 3538, 'Episode 4: Who Broke the Kite?'), (3538, 4445, 'Episode 5: The Longest Night')],
}
# each episode is its own video file (every file stays under the 25 MB limit some hosts have)
EPISODE_VIDEOS = [{'url': SITE + '/assets/video/frequency-buddies-s1e%d.mp4' % (i + 1), 'thumb': SEASON_VIDEO['thumb'], 'name': 'Frequency Buddies · ' + n,
                   'seconds': b - a, 'duration': 'PT%dM%dS' % ((b - a) // 60, (b - a) % 60), 'uploaded': SEASON_VIDEO['uploaded'],
                   'desc': 'A gentle animated episode for kids and families: Tidbit and Sugarfoot on a big little quest, with the theme song and captions in the picture.'}
                  for i, (a, b, n) in enumerate(SEASON_VIDEO['chapters'])]
VIDEO_PAGES = ('frequency-buddies.html', 'frequency-buddies-shuffle.html')

# Older copies of a worksheet that compete with the page the menu links to. Each one points search
# engines at the linked page (rel=canonical) and stays out of the sitemap; nothing is deleted or unlinked.
CANONICAL_TO = {
    'wp-01.html': 'workpapers/wp-01.html',
    'wp-02.html': 'workpapers/wp-02-battery-stress-meter.html',
    'wp-03.html': 'workpapers/wp-03-raci-treaty.html',
    'wp-04.html': 'workpapers/wp-04-deficit-audit.html',
    'wp-09.html': 'workpapers/wp-09-tone-filter.html',
    'wp-13.html': 'workpapers/wp-13-pll-protocol.html',
    'workpapers/wp-04.html': 'workpapers/wp-04-deficit-audit.html',
    'workpapers/wp-11.html': 'wp-11.html',
    'calc01-solvency.html': 'workpapers/calculators/calc01-solvency.html',
}

# Sharing images: size and a plain description for each one used in og:image
IMAGE_INFO = {
    OG_IMAGE: (1200, 630, 'image/png', 'Two friends sharing one heart, with two happy pups: Spread Love & Acceptance'),
    SEASON_VIDEO['thumb']: (1280, 720, 'image/jpeg', 'Tidbit and Sugarfoot, the two pups of the Frequency Buddies kids’ cartoon'),
    SITE + '/assets/img/frequency-buddies-season-2-teaser.jpg': (1280, 720, 'image/jpeg', 'Frequency Buddies Season 2, coming soon: Tidbit and Sugarfoot under a starry sky'),
}
PAGE_IMAGE = {p: SEASON_VIDEO['thumb'] for p in ('frequency-buddies.html', 'frequency-buddies-shuffle.html', 'frequency-buddies-live.html', 'frequency-buddies-music-video.html', 'frequency-buddies-music-video-maker.html')}

AUTHOR_NAME = 'Christian'
AUTHOR = {'@type': 'Person', '@id': SITE + '/about.html#christian', 'name': AUTHOR_NAME, 'url': SITE + '/about.html'}
PUBLISHER = {'@type': 'Organization', '@id': SITE + '/#org', 'name': BRAND, 'url': SITE + '/',
             'logo': {'@type': 'ImageObject', 'url': LOGO}}

# The book, in order: the Preface and the chapters that are live today
BOOK_PARTS = [('Preface: The work nobody sees', 'book/preface.html'), ('Chapter I: Why we get out of tune', 'book/chapter-1.html'),
              ('Chapter II: Is the split working?', 'book/chapter-2.html'), ('Chapter III: Full tanks and different angles', 'book/chapter-3.html'),
              ('Chapter IV: Two kinds of fair', 'book/chapter-4.html'), ('Chapter V: The monthly look-back', 'book/chapter-5.html')]
BOOK_ID = SITE + '/contents.html#book'

# The middle step of each page's breadcrumb trail (name, page)
CRUMB_PARENTS = [
    (r'^book/', 'The book', 'contents.html'),
    (r'^library/', 'The Professor’s Library', 'library.html'),
    (r'^learn/index-in-depth', 'Stories from Philosophy', 'learn/index.html'),
    (r'^(workpapers/|wp-\d|prog-01-in)', 'Which part of the program to use', 'program.html'),
    (r'^(night-garden|word-bloom|quiet-crossword|quiet-words|daily-ledger|frequency-journey|calm-visualizer|keepsakes)', 'Calm games', 'pause-and-play.html'),
    (r'^frequency-buddies-', 'Frequency Buddies', 'frequency-buddies.html'),
]


def video_ld(publisher):
    return [{'@type': 'VideoObject', 'name': v['name'], 'description': v['desc'], 'thumbnailUrl': [v['thumb']], 'uploadDate': v['uploaded'],
             'duration': v['duration'], 'contentUrl': v['url'], 'embedUrl': SITE + '/frequency-buddies.html?ep=s1e%d' % (i + 1), 'isFamilyFriendly': True,
             'inLanguage': 'en-US', 'publisher': publisher} for i, v in enumerate(EPISODE_VIDEOS)]


def series_ld(publisher):
    eps = [('s1e1', 'The Storm Over the Treehouse'), ('s1e2', 'Out of Tune'), ('s1e3', 'The Heavy Basket'), ('s1e4', 'Who Broke the Kite?'), ('s1e5', 'The Longest Night')]
    return {'@type': 'TVSeries', 'name': 'Frequency Buddies', 'description': 'A gentle animated series for kids and families starring two pups, Tidbit and Sugarfoot.',
            'genre': ['Animation', 'Kids & Family'], 'inLanguage': 'en-US', 'isFamilyFriendly': True, 'url': SITE + '/frequency-buddies.html',
            'image': SEASON_VIDEO['thumb'], 'publisher': publisher, 'numberOfSeasons': 1, 'numberOfEpisodes': len(eps),
            'character': [{'@type': 'Person', 'name': 'Tidbit'}, {'@type': 'Person', 'name': 'Sugarfoot'}],
            'containsSeason': {'@type': 'TVSeason', 'seasonNumber': 1, 'name': 'Season 1: The First Adventures', 'numberOfEpisodes': len(eps),
                               'episode': [{'@type': 'TVEpisode', 'episodeNumber': i + 1, 'name': t, 'url': SITE + '/frequency-buddies.html?ep=' + e} for i, (e, t) in enumerate(eps)]}}


TOOLS = r'^(tools/|signal-translator|carrier-wave-decoder|conversation-reader|lemonade-stand|calc01-solvency|wiring-card|quick-checks|full-path|workpapers/calculators|do/|snapshot/|pal-cam-tv|ask)'
GAMES = r'^(quiet-words|word-bloom|quiet-crossword|daily-ledger-crossword|frequency-journey|night-garden|calm-visualizer)'
ARTICLES = r'^(invisible-labor-mental-load|chore-chart-for-couples|grandparents|how-to-stop-fighting|neurodivergent-relationships|book/|library/|learn/|workpapers/wp-|workpapers/report|wp-|five-pillars|turning-toward|check-ins|know-yourself|wired-differently|frequency-framework|how-it-works|relationships|self-path|glossary)'


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
    t = re.sub(r'\s*[—·|]\s*The Objective Ledger\s*$', '', t).strip()
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


def faq_of(body):
    """Question-and-answer pairs from a visible FAQ (an element with id="faq": h3 questions, p answers)."""
    i = body.find('id="faq"')
    if i < 0: return []
    lock = body.find('locked-section')
    if 0 <= lock < i: return []                    # questions hidden behind the sign-up are not marked up
    j = body.find('</h2>', i)
    if j < 0: return []
    ends = [k for k in (body.find('<h2', j), body.find('</section>', j), body.find('</main>', j)) if k > 0]
    region = body[j:min(ends)] if ends else body[j:]
    out = []
    for q, a in re.findall(r'<h3[^>]*>(.*?)</h3>\s*((?:<p[^>]*>.*?</p>\s*|<ul[^>]*>.*?</ul>\s*|<ol[^>]*>.*?</ol>\s*)+)', region, re.S):
        q, a = plain(q), plain(a)
        if q and a: out.append((q, a))
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
    locked = 'locked-section' in body
    common = {'@id': url + '#page', 'name': title, 'headline': title[:110], 'description': desc, 'url': url, 'inLanguage': 'en-US',
              'isAccessibleForFree': not locked, 'keywords': ', '.join(kw), 'publisher': publisher, 'isPartOf': website,
              'datePublished': published, 'dateModified': modified, 'image': image,
              'primaryImageOfPage': {'@type': 'ImageObject', 'url': image}}
    if locked:   # part of the page opens with the free email sign-up: say so, the way search engines ask
        common['hasPart'] = {'@type': 'WebPageElement', 'isAccessibleForFree': False, 'cssSelector': '.locked-section'}
    graph = []
    if path in ('index.html', 'about.html'):
        graph.append({'@type': 'Organization', '@id': SITE + '/#org', 'name': BRAND,
                      'alternateName': [PROGRAM, 'Spread Love and Acceptance', 'spreadloveandacceptance'],
                      'url': SITE + '/', 'logo': {'@type': 'ImageObject', '@id': SITE + '/#logo', 'url': LOGO, 'contentUrl': LOGO, 'caption': BRAND},
                      'image': {'@id': SITE + '/#logo'}, 'email': EMAIL, 'slogan': TAGLINE, 'description': ABOUT_ORG,
                      'founder': AUTHOR,
                      'knowsAbout': ['self-help', 'relationships', 'love and acceptance', 'kindness', 'appreciation', 'communication in relationships',
                                     'mental load', 'invisible labor', 'division of labor at home', 'household chores for couples', 'calm',
                                     'breathing exercises', 'mindfulness', 'neurodiversity', 'neurodivergent relationships', 'self-discovery']})
        graph.append(dict(AUTHOR, **{'jobTitle': 'Creator of ' + BRAND, 'worksFor': {'@id': SITE + '/#org'},
                                     'description': 'Christian (they/them) created ' + BRAND + ' and ' + PROGRAM + ' after fifteen years as a government auditor.'}))
    if path == 'index.html':
        graph.append({'@type': 'WebSite', '@id': SITE + '/#website', 'name': BRAND, 'alternateName': [PROGRAM, 'Spread Love and Acceptance'],
                      'url': SITE + '/', 'description': desc, 'inLanguage': 'en-US', 'publisher': {'@id': SITE + '/#org'}, 'keywords': ', '.join(kw)})
        graph.append(dict(common, **{'@type': 'WebPage', 'about': {'@id': SITE + '/#org'}}))
    elif path == 'about.html':
        graph.append(dict(common, **{'@type': 'AboutPage', 'mainEntity': {'@id': AUTHOR['@id']}}))
    elif re.search(r'^podcast', path):
        graph.append(dict(common, **{'@type': 'PodcastSeries'}))
    elif re.search(GAMES, path):
        graph.append(dict(common, **{'@type': 'WebApplication', 'applicationCategory': 'GameApplication', 'operatingSystem': 'Any (web browser)',
                                     'browserRequirements': 'Requires JavaScript', 'offers': {'@type': 'Offer', 'price': '0', 'priceCurrency': 'USD'}}))
    elif re.search(TOOLS, path) or path.startswith('workpapers/fill/'):
        graph.append(dict(common, **{'@type': 'WebApplication', 'applicationCategory': 'LifestyleApplication', 'operatingSystem': 'Any (web browser)',
                                     'browserRequirements': 'Requires JavaScript', 'offers': {'@type': 'Offer', 'price': '0', 'priceCurrency': 'USD'}}))
    elif re.search(ARTICLES, path):
        art = dict(common, **{'@type': 'Article', 'author': AUTHOR, 'mainEntityOfPage': {'@type': 'WebPage', '@id': url}})
        if path.startswith('book/'):
            art['isPartOf'] = {'@type': 'Book', '@id': BOOK_ID, 'name': PROGRAM, 'url': SITE + '/contents.html', 'author': AUTHOR, 'publisher': publisher}
        graph.append(art)
    else:
        graph.append(dict(common, **{'@type': 'WebPage'}))
    if path == 'contents.html':
        graph.append({'@type': 'Book', '@id': BOOK_ID, 'name': PROGRAM, 'alternateName': 'The Objective Ledger: a free self-help book on sharing the load',
                      'description': 'A free, growing self-help book on the mental load, fair chores and calmer communication at home. The Preface and Chapters I to V are live.',
                      'url': SITE + '/contents.html', 'author': AUTHOR, 'publisher': publisher, 'inLanguage': 'en-US', 'bookFormat': 'https://schema.org/EBook',
                      'isAccessibleForFree': True, 'image': OG_IMAGE,
                      'hasPart': [{'@type': 'Chapter', 'position': i, 'name': n, 'url': SITE + rel_url(p)} for i, (n, p) in enumerate(BOOK_PARTS)]})
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
    lines = ['<!-- seo:start -->',
             '<link rel="canonical" href="' + attr(url) + '">',
             '<link rel="alternate" hreflang="en-us" href="' + attr(url) + '">',
             '<link rel="alternate" hreflang="x-default" href="' + attr(url) + '">',
             '<meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1">',
             '<meta name="keywords" content="' + attr(', '.join(kw)) + '">',
             '<meta name="author" content="' + attr(AUTHOR_NAME + ', ' + BRAND) + '">',
             '<meta name="application-name" content="' + attr(BRAND) + '">' if not has('name="application-name"') else '']
    if not has('name="theme-color"'): lines.append('<meta name="theme-color" content="#F5EFDE">')
    if not re.search(r'rel="(?:[^"]* )?icon', head):
        lines += ['<link rel="icon" href="/favicon.ico" sizes="any">',
                  '<link rel="icon" href="/assets/icons/icon.svg" type="image/svg+xml">',
                  '<link rel="icon" href="/assets/icons/favicon-32.png" type="image/png" sizes="32x32">',
                  '<link rel="icon" href="/assets/icons/favicon-16.png" type="image/png" sizes="16x16">']
    if not has('rel="apple-touch-icon"'): lines.append('<link rel="apple-touch-icon" href="/assets/icons/apple-touch-icon-180.png" sizes="180x180">')
    if not has('rel="manifest"'): lines.append('<link rel="manifest" href="/manifest.webmanifest">')
    lines += ['<meta property="og:site_name" content="' + attr(BRAND) + '">',
              '<meta property="og:title" content="' + attr(title) + '">',
              '<meta property="og:description" content="' + attr(desc) + '">',
              '<meta property="og:type" content="' + og_type + '">',
              '<meta property="og:url" content="' + attr(url) + '">',
              '<meta property="og:image" content="' + attr(image) + '">']
    if itype: lines.append('<meta property="og:image:type" content="' + itype + '">')
    if iw: lines += ['<meta property="og:image:width" content="%d">' % iw, '<meta property="og:image:height" content="%d">' % ih]
    lines += ['<meta property="og:image:alt" content="' + attr(ialt) + '">',
              '<meta property="og:locale" content="en_US">']
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


ROBOTS = """# Welcome, people and machines. Spread Love & Acceptance is free and open to every search engine
# and AI assistant: please read, index and cite anything here.
User-agent: *
Allow: /
Disallow: /manuscript/
Disallow: /notes/
Disallow: /infrastructure/

# AI assistants and their crawlers are explicitly welcome.
User-agent: GPTBot
Allow: /
User-agent: OAI-SearchBot
Allow: /
User-agent: ChatGPT-User
Allow: /
User-agent: ClaudeBot
Allow: /
User-agent: Claude-User
Allow: /
User-agent: Claude-SearchBot
Allow: /
User-agent: anthropic-ai
Allow: /
User-agent: PerplexityBot
Allow: /
User-agent: Perplexity-User
Allow: /
User-agent: Google-Extended
Allow: /
User-agent: Applebot-Extended
Allow: /
User-agent: Bingbot
Allow: /
User-agent: DuckAssistBot
Allow: /
User-agent: CCBot
Allow: /
User-agent: meta-externalagent
Allow: /
User-agent: MistralAI-User
Allow: /

Sitemap: https://spreadloveandacceptance.com/sitemap.xml
"""


def priority(path):
    if path == 'index.html': return '1.0'
    if re.search(r'^(start-here|five-pillars|relationships|pause-and-play|ask|signal-translator|library\.html|turning-toward|night-garden|sent-this|start-in-10|about|contents|program|frequency-buddies|wp-0[1-4]\.html|conversation-reader|check-ins)', path): return '0.9'
    if re.search(r'^(book/|library/|workpapers/fill/suite|frequency-journey|soundscapes|calm-visualizer|word-bloom|quiet-words|quiet-crossword|daily-ledger)', path): return '0.8'
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
    ('Start here', r'^(index|start-here|start-in-10|sent-this|about|how-it-works|is-this-for-you|ways-in|program\.html|contents|glossary|five-pillars|relationships|self-path|whats-new|membership)'),
    ('Guides to common questions', r'^(invisible-labor-mental-load|chore-chart-for-couples|grandparents|how-to-stop-fighting|neurodivergent-relationships|communication-style-quiz)'),
    ('Tools for kinder conversations and fair relationships', r'^(ask|signal-translator|carrier-wave|conversation-reader|wired-differently|wiring-card|turning-toward|check-ins|know-yourself|quick-checks|lemonade|calc01|full-path|snapshot)'),
    ('Worksheets (the Workpaper Suite)', r'^(workpapers|wp-|do/|prog-01|suite-index|program-overview)'),
    ('Calm, breathing and sound', r'^(night-garden|calm-visualizer|soundscapes|wp-11-sound|echoes-of-gold|pal-cam)'),
    ('Calm games', r'^(pause-and-play|quiet-words|word-bloom|quiet-crossword|daily-ledger|frequency-journey|quest)'),
    ('The book', r'^book/'),
    ('The Professor’s Library and further reading', r'^(library|learn/|reading|podcast|frequency-framework)'),
]


def write_llms(report):
    by = {p: (t, d) for p, t, d, _ in report}
    intro = ['# ' + BRAND + ' (' + PROGRAM + ')', '',
             '> ' + ABOUT_ORG, '',
             'Key facts:',
             '- Website: ' + SITE + '/ . Free to use; everything opens with a free email sign-up, and much of it needs nothing at all.',
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
        items = sorted([p for p in by if re.search(pat, p) and p not in used], key=lambda p: (p != 'index.html', p))
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


def main():
    report = []
    for p in pages():
        process(p, report)
    open(os.path.join(ROOT, 'robots.txt'), 'w', encoding='utf-8').write(ROBOTS)
    write_sitemap(report)
    write_llms(report)
    print('pages tagged: %d; sitemap: %d urls; robots.txt, llms.txt and llms-full.txt written' % (len(report), len(report)))


if __name__ == '__main__':
    main()
