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
    'architecture/architecture.html': ('How the site is built', 'How The Objective Ledger is designed and built, and why.'),
    'architecture/index.html': ('How the site is built', 'How The Objective Ledger is designed and built, and why.'),
}

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
    m = re.search(r'<title>(.*?)</title>', s, re.S)
    old_title = m.group(1) if m else ''
    title = ov_title if ov_title and path == 'index.html' else clean_title(ov_title or old_title, path)
    if m:
        s = s[:m.start()] + '<title>' + html.escape(title, quote=False) + '</title>' + s[m.end():]
    else:
        s = s.replace('</head>', '<title>' + html.escape(title, quote=False) + '</title>\n</head>', 1)
    dm = re.search(r'<meta name="description" content="([^"]*)"\s*/?>', s)
    desc = ov_desc or (html.unescape(dm.group(1)) if dm else '')
    if not desc:
        desc = title + '. ' + ABOUT_ORG.split('. ')[0] + '.'
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
    if re.search(r'^(start-here|five-pillars|relationships|pause-and-play|ask|signal-translator|library\.html|turning-toward|night-garden|sent-this|start-in-10|about|contents|program)', path): return '0.9'
    if re.search(r'^(book/|library/|workpapers/fill/suite|frequency-journey|soundscapes|calm-visualizer|word-bloom|quiet-words|quiet-crossword|daily-ledger)', path): return '0.8'
    return '0.6'


def write_sitemap(report):
    rows = ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
    for path, title, desc, mod in sorted(report, key=lambda r: (-float(priority(r[0])), r[0])):
        rows.append('  <url><loc>%s</loc><lastmod>%s</lastmod><changefreq>weekly</changefreq><priority>%s</priority></url>' % (html.escape(SITE + rel_url(path)), mod, priority(path)))
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
