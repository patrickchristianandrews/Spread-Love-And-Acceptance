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
 'frequency-buddies-shuffle.html': ('Frequency Buddies: Watch Every Episode on Shuffle', 'Every Frequency Buddies episode back to back in a random order, with the theme song, plus the whole season as one video for YouTube.'),
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

# Titles past about 60 characters and descriptions past about 158 are cut off in search results
TITLE_MAX, DESC_MAX = 60, 158


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
    return cut.rsplit(' ', 1)[0].rstrip(',;:—-') + '.'


# The Frequency Buddies season as one video, for video search (with a chapter for each episode)
SEASON_VIDEO = {
    'url': SITE + '/assets/video/frequency-buddies-season-1.mp4', 'thumb': SITE + '/assets/img/frequency-buddies-season-1.jpg',
    'name': 'Frequency Buddies · Season 1 · All five episodes', 'duration': 'PT1H12M13S', 'seconds': 4333, 'uploaded': '2026-09-30',
    'desc': 'Five gentle animated episodes for kids and families: Tidbit and Sugarfoot set off on big little quests, hit real tough times and find their way through, together. With the theme song, captions in the picture and chapters.',
    'chapters': [(0, 893, 'Episode 1: The Storm Over the Treehouse'), (893, 1746, 'Episode 2: Out of Tune'), (1746, 2598, 'Episode 3: The Heavy Basket'),
                 (2598, 3451, 'Episode 4: Who Broke the Kite?'), (3451, 4333, 'Episode 5: The Longest Night')],
}
VIDEO_PAGES = ('frequency-buddies.html', 'frequency-buddies-shuffle.html')


def video_ld(publisher):
    v = SEASON_VIDEO
    return {'@type': 'VideoObject', 'name': v['name'], 'description': v['desc'], 'thumbnailUrl': [v['thumb']], 'uploadDate': v['uploaded'],
            'duration': v['duration'], 'contentUrl': v['url'], 'embedUrl': SITE + '/frequency-buddies-shuffle.html', 'isFamilyFriendly': True,
            'inLanguage': 'en-US', 'publisher': publisher,
            'hasPart': [{'@type': 'Clip', 'name': n, 'startOffset': a, 'endOffset': b, 'url': v['url'] + '#t=' + str(a)} for a, b, n in v['chapters']]}


def series_ld(publisher):
    eps = [('s1e1', 'The Storm Over the Treehouse'), ('s1e2', 'Out of Tune'), ('s1e3', 'The Heavy Basket'), ('s1e4', 'Who Broke the Kite?'), ('s1e5', 'The Longest Night')]
    return {'@type': 'TVSeries', 'name': 'Frequency Buddies', 'description': 'A gentle animated series for kids and families starring two pups, Tidbit and Sugarfoot.',
            'genre': ['Animation', 'Kids & Family'], 'inLanguage': 'en-US', 'isFamilyFriendly': True, 'url': SITE + '/frequency-buddies.html',
            'image': SEASON_VIDEO['thumb'], 'publisher': publisher, 'numberOfSeasons': 1, 'numberOfEpisodes': len(eps),
            'character': [{'@type': 'Person', 'name': 'Tidbit'}, {'@type': 'Person', 'name': 'Sugarfoot'}],
            'containsSeason': {'@type': 'TVSeason', 'seasonNumber': 1, 'name': 'Season 1: The First Adventures', 'numberOfEpisodes': len(eps),
                               'episode': [{'@type': 'TVEpisode', 'episodeNumber': i + 1, 'name': t, 'url': SITE + '/frequency-buddies.html?ep=' + e} for i, (e, t) in enumerate(eps)]}}


TOOLS = r'^(tools/|signal-translator|carrier-wave-decoder|conversation-reader|lemonade-stand|calc01-solvency|wiring-card|quick-checks|full-path|workpapers/calculators|do/|snapshot/|pal-cam-tv|ask)'
GAMES = r'^(frequency-buddies|quiet-words|word-bloom|quiet-crossword|daily-ledger-crossword|frequency-journey|night-garden|calm-visualizer)'
ARTICLES = r'^(book/|library/|learn/|workpapers/wp-|workpapers/report|wp-|five-pillars|turning-toward|check-ins|know-yourself|wired-differently|frequency-framework|how-it-works|relationships|self-path|glossary)'


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


def ld_for(path, title, desc, url, kw, modified):
    publisher = {'@type': 'Organization', '@id': SITE + '/#org', 'name': BRAND}
    website = {'@type': 'WebSite', '@id': SITE + '/#website', 'name': BRAND, 'url': SITE + '/'}
    common = {'name': title, 'headline': title[:110], 'description': desc, 'url': url, 'inLanguage': 'en-US',
              'isAccessibleForFree': True, 'keywords': ', '.join(kw), 'publisher': publisher, 'isPartOf': website,
              'dateModified': modified, 'image': OG_IMAGE}
    graph = []
    if path == 'index.html':
        graph.append({'@type': 'Organization', '@id': SITE + '/#org', 'name': BRAND, 'alternateName': [PROGRAM, 'Spread Love and Acceptance'],
                      'url': SITE + '/', 'logo': LOGO, 'email': EMAIL, 'slogan': TAGLINE, 'description': ABOUT_ORG,
                      'knowsAbout': ['self-help', 'relationships', 'kindness', 'appreciation', 'reconciliation', 'communication', 'calm',
                                     'breathing', 'meditation', 'mindfulness', 'harmony', 'connection', 'fairness at home', 'mental load',
                                     'neurodiversity', 'emotional wellbeing']})
        graph.append({'@type': 'WebSite', '@id': SITE + '/#website', 'name': BRAND, 'alternateName': PROGRAM, 'url': SITE + '/',
                      'description': desc, 'inLanguage': 'en-US', 'publisher': publisher, 'keywords': ', '.join(kw)})
        graph.append(dict(common, **{'@type': 'WebPage'}))
    elif re.search(r'^podcast', path):
        graph.append(dict(common, **{'@type': 'PodcastSeries', 'webFeed': None}))
        graph[-1].pop('webFeed')
    elif re.search(GAMES, path):
        graph.append(dict(common, **{'@type': 'WebApplication', 'applicationCategory': 'GameApplication', 'operatingSystem': 'Any (web browser)',
                                     'offers': {'@type': 'Offer', 'price': '0', 'priceCurrency': 'USD'}}))
    elif re.search(TOOLS, path) or path.startswith('workpapers/fill/'):
        graph.append(dict(common, **{'@type': 'WebApplication', 'applicationCategory': 'LifestyleApplication', 'operatingSystem': 'Any (web browser)',
                                     'offers': {'@type': 'Offer', 'price': '0', 'priceCurrency': 'USD'}}))
    elif re.search(ARTICLES, path):
        art = dict(common, **{'@type': 'Article', 'author': publisher, 'mainEntityOfPage': url})
        if path.startswith('book/'):
            art['isPartOf'] = {'@type': 'Book', 'name': PROGRAM, 'url': SITE + '/contents.html', 'publisher': publisher}
        graph.append(art)
    else:
        graph.append(dict(common, **{'@type': 'WebPage'}))
    if path in VIDEO_PAGES:
        graph.append(video_ld(publisher)); graph.append(series_ld(publisher))
    if path != 'index.html':
        graph.append({'@type': 'BreadcrumbList', 'itemListElement': [
            {'@type': 'ListItem', 'position': 1, 'name': BRAND, 'item': SITE + '/'},
            {'@type': 'ListItem', 'position': 2, 'name': title, 'item': url}]})
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
    url = SITE + rel_url(path)
    kw = keywords_for(path)
    modified = git_date(path)
    head = s[:s.find('</head>')]
    has = lambda needle: needle in head
    lines = ['<!-- seo:start -->']
    if not re.search(r'rel="canonical"', head):
        lines.append('<link rel="canonical" href="' + attr(url) + '">')
    lines.append('<meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1">')
    lines.append('<meta name="keywords" content="' + attr(', '.join(kw)) + '">')
    lines.append('<meta name="author" content="' + attr(BRAND) + '">')
    if not has('og:site_name'): lines.append('<meta property="og:site_name" content="' + attr(BRAND) + '">')
    if not has('og:title'): lines.append('<meta property="og:title" content="' + attr(title) + '">')
    if not has('og:description'): lines.append('<meta property="og:description" content="' + attr(desc) + '">')
    if not has('og:type'): lines.append('<meta property="og:type" content="' + ('website' if path == 'index.html' else 'article' if re.search(ARTICLES, path) else 'website') + '">')
    if not has('og:url'): lines.append('<meta property="og:url" content="' + attr(url) + '">')
    if not has('og:image'):
        lines.append('<meta property="og:image" content="' + OG_IMAGE + '">')
        lines.append('<meta property="og:image:alt" content="Two friends sharing one heart, with two happy pups: Spread Love &amp; Acceptance">')
    if not has('og:locale'): lines.append('<meta property="og:locale" content="en_US">')
    if not has('twitter:card'): lines.append('<meta name="twitter:card" content="summary_large_image">')
    if not has('twitter:title'): lines.append('<meta name="twitter:title" content="' + attr(title) + '">')
    if not has('twitter:description'): lines.append('<meta name="twitter:description" content="' + attr(desc) + '">')
    if not has('twitter:image'): lines.append('<meta name="twitter:image" content="' + OG_IMAGE + '">')
    ld = json.dumps(ld_for(path, title, desc, url, kw, modified), ensure_ascii=False, separators=(',', ':')).replace('</', '<\\/')
    lines.append('<script type="application/ld+json">' + ld + '</script>')
    lines.append('<!-- seo:end -->')
    s = s.replace('</head>', '\n'.join(lines) + '\n</head>', 1)
    open(fp, 'w', encoding='utf-8').write(s)
    report.append((path, title, desc, modified))
    return True


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
    rows = ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">']
    v = SEASON_VIDEO
    vid = ('<video:video><video:thumbnail_loc>%s</video:thumbnail_loc><video:title>%s</video:title><video:description>%s</video:description>'
           '<video:content_loc>%s</video:content_loc><video:duration>%d</video:duration><video:family_friendly>yes</video:family_friendly></video:video>') % (
           html.escape(v['thumb']), html.escape(v['name']), html.escape(v['desc'][:2000]), html.escape(v['url']), v['seconds'])
    for path, title, desc, mod in sorted(report, key=lambda r: (-float(priority(r[0])), r[0])):
        rows.append('  <url><loc>%s</loc><lastmod>%s</lastmod><changefreq>weekly</changefreq><priority>%s</priority>%s</url>' % (html.escape(SITE + rel_url(path)), mod, priority(path), vid if path in VIDEO_PAGES else ''))
    rows.append('</urlset>')
    open(os.path.join(ROOT, 'sitemap.xml'), 'w', encoding='utf-8').write('\n'.join(rows) + '\n')


GROUPS = [
    ('Start here', r'^(index|start-here|start-in-10|sent-this|about|how-it-works|is-this-for-you|ways-in|program\.html|contents|glossary|five-pillars|relationships|self-path|whats-new|membership)'),
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
