#!/usr/bin/env python3
"""Build the research page and the research link index from the checked reference lists.

Inputs (one entry per study, book or review; fields: id, authors, year, title, venue, doi, url,
kind, finding, strength, topics, mentioned_on, verified, verified_by, note):
    tools/research/refs-a.json, refs-b.json, refs-c.json

Outputs:
    research.html                  "The research behind this site": every verified entry, grouped by topic
    assets/js/research-index.js    a small map that assets/js/research-links.js uses to link names and
                                   years in the reading to their entry on research.html

Only entries marked verified (with a checked link) are published. Unverified entries are left out
entirely. Run from anywhere:  python3 tools/research/build_research.py
"""
import html
import json
import os
import re
import sys
from collections import OrderedDict, defaultdict

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))
SRC = [os.path.join(ROOT, 'tools', 'research', 'refs-%s.json' % k) for k in 'abc']
OUT_PAGE = os.path.join(ROOT, 'research.html')
OUT_INDEX = os.path.join(ROOT, 'assets', 'js', 'research-index.js')
COMMON_WORDS = os.path.join(ROOT, 'tools', 'chat', 'common-words.txt')
SITE = 'https://spreadloveandacceptance.com'
PUBLISHED = '2026-10-09'

TITLE = 'The Research Behind This Site, in Plain Words'
DESCRIPTION = ('The studies, books and reviews behind this free self-help site: what each found, '
               'in plain words, how strong the evidence is, and a link to read more.')

# ---------------------------------------------------------------------------------------------
# Topic groups: each entry sits in the first group that one of its topic tags belongs to.
# ---------------------------------------------------------------------------------------------
GROUPS = [
    ('fairness', 'Fairness and the shared load',
     'Who does what at home, the work nobody sees, and why each person often feels they do more.',
     'equity fairness division-of-labour invisible-work mental-load second-shift emotional-labour cognitive-labour '
     'kin-work scorekeeping egocentric-bias gatekeeping same-sex-couples recognition justice procedural-justice '
     'time-use money gender appreciation'),
    ('couples', 'Couples and close relationships',
     'What keeps people close over the years, and what slowly pulls them apart.',
     'relationships couples gottman bids turning-toward love-maps positive-illusions capitalization '
     'hedonic-adaptation self-expansion commitment maintenance complacency love-languages rituals novelty '
     'michelangelo-effect couple-types five-to-one couple-therapy acceptance perpetual-problems long-distance '
     'phubbing attention responsiveness good-news play humour shared-language'),
    ('talking', 'Talking, listening and conflict',
     'How hard conversations start, what keeps them calm, and how messages land.',
     'conflict communication soft-startup four-horsemen flooding pursue-withdraw demand-withdraw '
     'accepting-influence active-listening listening validation i-statements nvc difficult-conversations '
     'intent-impact speaker-listener negotiation interests-vs-positions texting-and-tone media-richness '
     'asking-questions timing illusion-of-transparency closeness-communication-bias prep'),
    ('repair', 'Repair, apology, forgiveness and healing',
     'Putting things right after a hurt, and healing over time.',
     'repair apology forgiveness healing trust trauma'),
    ('seeing', 'How we see each other',
     'Why two people can look at the same moment and see different things.',
     'perception naive-realism fundamental-attribution-error actor-observer perspective-taking bias-blind-spot '
     'attributions mind-reading relationship-beliefs'),
    ('belonging', 'Belonging, friendship and support',
     'Why we need each other, how friendships grow, and how support helps.',
     'attachment belonging friendship loneliness weak-ties dunbar-number social-support invisible-support '
     'asking-for-help'),
    ('family', 'Families, parents and children',
     'Parenting, siblings, step-families, separation, and the rules families pass down.',
     'family parenting parenting-styles siblings coparenting transition-to-parenthood stepfamilies divorce '
     'family-scripts family-systems teenagers parental-burnout in-laws estrangement'),
    ('feelings', 'How feelings work',
     'Naming feelings, the body’s signals, and what helps feelings pass.',
     'emotions affect-labeling emotional-granularity emotional-contagion anger shame-guilt positive-emotions '
     'interoception alexithymia feelings-as-information thought-suppression rumination emotion-regulation '
     'expressive-writing co-regulation'),
    ('stress', 'Stress, calm and rest',
     'What stress does to the body and mind, and what helps people settle.',
     'stress calm breathing sleep rest polyvagal allostatic-load window-of-tolerance resilience anxiety'),
    ('helping', 'Helping, caring and burnout',
     'Caring for others without running dry, and why people do or don’t step in.',
     'burnout caregiving carer-burden compassion-fatigue helping kindness bystander limits'),
    ('teams', 'Work, teams and shared systems',
     'Teams, checklists, feedback and the setups that make shared work easier.',
     'work teams work-life spillover role-ambiguity diffusion-of-responsibility social-loafing '
     'psychological-safety retrospectives just-culture blameless-reviews checklists swiss-cheese feedback '
     'transactive-memory team-development goodharts-law measurement pdsa systems ownership workload '
     'check-ins decisions unfinished-tasks cognitive-offloading'),
    ('change', 'Habits and change',
     'Why change is hard, and why small steps and a kind setup help.',
     'change habits implementation-intentions ego-depletion stages-of-change motivation self-determination'),
    ('worth', 'Self-worth and self-compassion',
     'Shame, guilt, perfectionism and a kinder inner voice.',
     'self-worth self-compassion perfectionism identity'),
    ('loss', 'Grief and loss',
     'Grief in waves, and losses other people may not see.',
     'grief loss ambiguous-loss'),
    ('minds', 'Minds that work differently',
     'Autism, ADHD, sensory differences, and meeting in the middle.',
     'neurodiversity autism adhd double-empathy masking sensory monotropism highly-sensitive-person stimming '
     'energy rejection-sensitivity accessibility language'),
    ('values', 'Values, meaning and a good life',
     'What matters to people, and how culture and outlook shape it.',
     'values meaning personality culture control'),
]

TAG_NAMES = {
    'adhd': 'ADHD', 'nvc': 'Nonviolent Communication', 'pdsa': 'Plan, Do, Study, Act',
    'i-statements': '“I” statements', 'gottman': 'Gottman’s research', 'dunbar-number': 'Dunbar’s number',
    'goodharts-law': 'Goodhart’s law', 'five-to-one': 'the 5-to-1 ratio', 'swiss-cheese': 'the Swiss cheese model',
    'michelangelo-effect': 'the Michelangelo effect', 'highly-sensitive-person': 'highly sensitive people',
    'polyvagal': 'polyvagal theory', 'division-of-labour': 'sharing housework', 'emotional-labour': 'emotional labor',
    'cognitive-labour': 'cognitive labor', 'interests-vs-positions': 'interests, not positions',
    'intent-impact': 'intent and impact', 'self-determination': 'self-determination theory',
    'stages-of-change': 'stages of change', 'humour': 'humor', 'kin-work': 'family keeping-in-touch',
    'co-regulation': 'calming together', 'coparenting': 'co-parenting', 'work-life': 'work and home',
    'time-use': 'time use', 'just-culture': 'just culture', 'pursue-withdraw': 'pursue and withdraw',
    'demand-withdraw': 'demand and withdraw', 'texting-and-tone': 'texts and tone',
    'second-shift': 'the second shift', 'weak-ties': 'casual ties', 'invisible-support': 'quiet support',
}

STRENGTH = OrderedDict([
    ('strong', 'Strong evidence'),
    ('moderate', 'Moderate evidence'),
    ('mixed', 'Mixed evidence'),
    ('early', 'Early evidence'),
    ('debated', 'Debated'),
    ('theory', 'An idea, not a test'),
])

KIND = {
    'study': 'a study', 'book': 'a book', 'theory': 'a theory or model', 'review': 'a review of research',
    'meta-analysis': 'a meta-analysis (a study of many studies)', 'guideline': 'a guideline or official report',
}

STOP_FIRST = set()  # reserved


def esc(s):
    return html.escape(s or '', quote=True)


def fail(msg):
    sys.stderr.write('build_research: ' + msg + '\n')
    sys.exit(1)


# ---------------------------------------------------------------------------------------------
# Load, merge, validate
# ---------------------------------------------------------------------------------------------
def load():
    raw = []
    for p in SRC:
        with open(p, encoding='utf-8') as f:
            data = json.load(f)
        if not isinstance(data, list):
            fail('%s is not a list' % p)
        for r in data:
            r['_src'] = os.path.basename(p)
            raw.append(r)
    return raw


def title_key(t):
    return re.sub(r'[^a-z0-9]', '', (t or '').lower())[:40]


def surnames(authors):
    s = re.sub(r'\s*\((?:incl|conducted)[^)]*\)', '', authors or '')
    s = re.sub(r',?\s*et al\.?', '', s)
    out = re.findall(r'(?:^|,\s*&?\s*|&\s*|with\s+)([^,&]+?),\s*(?:[A-Z][a-z]?\.(?:[\s-]*[A-Z][a-z]?\.)*)', s)
    out = [re.sub(r'^(?:with|and)\s+', '', o.strip()) for o in out]
    return [o for o in out if o and '(' not in o]


def merge(raw):
    """Merge entries that share an id. The same id with a different title is a different work: it gets a new id."""
    by = OrderedDict()
    renamed = []
    for r in raw:
        rid = r.get('id')
        if not rid:
            fail('an entry in %s has no id' % r['_src'])
        if rid in by and title_key(by[rid]['title']) != title_key(r['title']):
            sn = surnames(r['authors'])
            new = '%s-%s-%s' % (re.sub(r'[^a-z]', '', sn[0].lower()) if sn else 'x',
                                re.sub(r'[^a-z]', '', sn[1].lower()) if len(sn) > 1 else 'b', r['year'])
            renamed.append((rid, new, r['_src']))
            r = dict(r, id=new)
            rid = new
        if rid not in by:
            by[rid] = dict(r)
            continue
        a = by[rid]
        # keep the verified one; between two, prefer a doi.org link
        if r.get('verified') and not a.get('verified'):
            a, r = dict(r), a
        elif r.get('verified') and a.get('verified') and 'doi.org' in (r.get('url') or '') and 'doi.org' not in (a.get('url') or ''):
            keep_topics, keep_m = a['topics'], a['mentioned_on']
            a = dict(r)
            a['topics'] = keep_topics + [t for t in r['topics'] if t not in keep_topics]
            a['mentioned_on'] = keep_m
        a['topics'] = a['topics'] + [t for t in r.get('topics', []) if t not in a['topics']]
        a['mentioned_on'] = a['mentioned_on'] + [m for m in r.get('mentioned_on', []) if m not in a['mentioned_on']]
        by[rid] = a
    # the same work listed twice under different ids (same title and year): one entry, the other id kept as an alias
    out, seen = [], {}
    for r in by.values():
        key = (title_key(r['title']), r.get('year'))
        if key in seen and r.get('verified') == seen[key].get('verified'):
            a = seen[key]
            a.setdefault('aliases', []).append(r['id'])
            a['topics'] = a['topics'] + [t for t in r.get('topics', []) if t not in a['topics']]
            a['mentioned_on'] = a['mentioned_on'] + [m for m in r.get('mentioned_on', []) if m not in a['mentioned_on']]
            continue
        seen[key] = r
        out.append(r)
    return out, renamed


def validate(refs):
    probs = []
    for r in refs:
        if not r.get('verified'):
            continue
        if not (r.get('url') or '').startswith('http'):
            probs.append('%s: verified but no url' % r['id'])
        if not (r.get('finding') or '').strip():
            probs.append('%s: empty finding' % r['id'])
        if not (r.get('title') or '').strip():
            probs.append('%s: no title' % r['id'])
        if r.get('year') is not None and not isinstance(r.get('year'), int):
            probs.append('%s: year is not a number' % r['id'])  # None is allowed: an ongoing survey or series
        if strength_of(r)[0] is None:
            probs.append('%s: strength not understood: %r' % (r['id'], r.get('strength')))
    if probs:
        fail('validation failed:\n  ' + '\n  '.join(probs))


def strength_of(r):
    s = (r.get('strength') or '').strip()
    m = re.match(r'(strong|moderate|mixed|early|debated|theory)\b\s*(?:[—–:,-]+\s*)?(.*)$', s, re.I | re.S)
    if not m:
        return None, ''
    note = m.group(2).strip()
    if note:
        note = note[0].upper() + note[1:]
        if not re.search(r'[.!?]$', note):
            note += '.'
    return m.group(1).lower(), note


# ---------------------------------------------------------------------------------------------
# Where on the site: readable labels for mentioned_on links
# ---------------------------------------------------------------------------------------------
_page_cache = {}


def strip_tags(s):
    return re.sub(r'\s+', ' ', html.unescape(re.sub(r'<[^>]+>', '', s))).strip()


def page_info(path):
    if path in _page_cache:
        return _page_cache[path]
    fp = os.path.join(ROOT, path.lstrip('/'))
    info = None
    if path.endswith('.html') and os.path.isfile(fp):
        with open(fp, encoding='utf-8') as f:
            src = f.read()
        h1 = re.search(r'<h1[^>]*>(.*?)</h1>', src, re.S)
        t = re.search(r'<title>(.*?)</title>', src, re.S)
        info = {'src': src, 'h1': strip_tags(h1.group(1)) if h1 else (strip_tags(t.group(1)) if t else path)}
    _page_cache[path] = info
    return info


def section_label(src, anchor):
    m = re.search(r'<(\w+)\b[^>]*\bid="%s"[^>]*>' % re.escape(anchor), src)
    if not m:
        return None
    tag = m.group(1).lower()
    if re.match(r'h[1-6]$', tag):
        end = src.find('</%s>' % tag, m.end())
        return strip_tags(src[m.end():end])
    h = re.compile(r'<h([2-4])\b[^>]*>(.*?)</h\1>', re.S).search(src, m.end())
    if h and h.start() - m.end() < 4000:
        return strip_tags(h.group(2))
    return ''


def page_kind(path):
    if path.startswith('/library'):
        return 'Library'
    if path.startswith('/book/'):
        return 'Book, in depth' if path.endswith('-in-depth.html') else 'Book'
    if path.endswith('-in-depth.html'):
        return 'In depth'
    return 'Guide'


def where_links(r, missing):
    out, seen = [], set()
    for m in r.get('mentioned_on', []):
        path, _, anchor = m.partition('#')
        if not path.endswith('.html'):
            continue
        info = page_info(path)
        if not info:
            missing.append('%s -> %s (no such page)' % (r['id'], m))
            continue
        label = None
        if anchor:
            label = section_label(info['src'], anchor)
            if label is None:
                missing.append('%s -> %s (no such anchor)' % (r['id'], m))
                continue
        label = label or info['h1']
        key = (path, label)
        if key in seen:
            continue
        seen.add(key)
        # which page the section is on: "Book: Is the split working?", "Library: Fairness and the mental load at home"
        page_name = short_title(re.split(r':\s', info['h1'])[0], 48)
        kind = page_kind(path).replace(', in depth', '').replace('In depth', 'Guide')
        where = kind if label == info['h1'] else '%s: %s' % (kind, page_name)
        out.append((m, label, where))
    return out[:5]


# ---------------------------------------------------------------------------------------------
# Short labels for the link index
# ---------------------------------------------------------------------------------------------
def short_authors(r):
    sn = surnames(r['authors'])
    if not sn:
        a = re.sub(r'\s*\(.*?\)\s*', ' ', r['authors']).strip()
        return a
    if len(sn) == 1:
        return sn[0]
    if len(sn) == 2 and 'et al' not in r['authors']:
        return '%s & %s' % (sn[0], sn[1])
    return '%s and colleagues' % sn[0]


def display_authors(r):
    a = r['authors']
    parts = re.split(r',\s*(?=[^,]*,\s*[A-Z][a-z]?\.)|,\s*&\s*|\s*&\s*', a)
    sn = surnames(a)
    if len(sn) > 4:
        # Surname, I., Surname, I., Surname, I., and colleagues
        m = re.match(r'((?:[^,&]+,\s*(?:[A-Z][a-z]?\.(?:[\s-]*[A-Z][a-z]?\.)*)\s*,?\s*){3})', a)
        if m:
            return m.group(1).rstrip(', ') + ', and colleagues'
    return a


def short_title(t, n=70):
    t = re.split(r':\s', t)[0] if len(t) > n else t
    if len(t) > n:
        t = t[:n].rsplit(' ', 1)[0] + '…'
    return t


def load_common():
    words = set()
    try:
        with open(COMMON_WORDS, encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#'):
                    words.add(line.lower())
    except OSError:
        pass
    words.update('day hall best long rich young cross field wood rice bond rose hope house white brown gross mills '
                 'little sharp price strange miller gordon page grant baker ward walker hill green king'.split())
    return words


# ---------------------------------------------------------------------------------------------
# research.html
# ---------------------------------------------------------------------------------------------
def tag_name(t):
    return TAG_NAMES.get(t, t.replace('-', ' '))


def group_of(r, topic_to_group):
    for t in r['topics']:
        if t in topic_to_group:
            return topic_to_group[t]
    return GROUPS[-1][0]


def host_of(u):
    h = re.sub(r'^https?://', '', u).split('/')[0]
    return re.sub(r'^www\.', '', h)


def entry_html(r, wl):
    st, note = strength_of(r)
    year = r['year'] if r.get('year') else 'ongoing'
    who = display_authors(r)
    venue = r.get('venue') or ''
    kind = KIND.get(r.get('kind'), r.get('kind') or 'a source')
    tags = [tag_name(t) for t in r['topics']]
    h = []
    h.append('<article class="rs-entry no-bubble" id="ref-%s" data-no-bubble>' % esc(r['id']))
    for al in r.get('aliases', []):
        h.append('<span class="rs-alias" id="ref-%s"></span>' % esc(al))
    h.append('<h3 class="rs-h"><span class="rs-au">%s (%s)</span> <em class="rs-ti">%s</em></h3>' % (esc(who), year, esc(r['title'])))
    if venue:
        h.append('<p class="rs-venue">%s · <span class="rs-kind">%s</span></p>' % (esc(venue), esc(kind)))
    h.append('<p class="rs-find">%s</p>' % esc(r['finding']))
    h.append('<p class="rs-str"><span class="rs-badge rs-b-%s">%s</span> %s</p>' % (st, STRENGTH[st], esc(note)))
    h.append('<p class="rs-more"><a href="%s" target="_blank" rel="noopener" aria-label="Read more: %s (opens a new tab)">Read more →</a> <span class="rs-host">%s</span></p>'
             % (esc(r['url']), esc(short_title(r['title'], 90)), esc(host_of(r['url']))))
    if wl:
        links = ' · '.join('<a href="%s">%s</a> <small>(%s)</small>' % (esc(m), esc(lbl), esc(kd)) for m, lbl, kd in wl)
        h.append('<p class="rs-where"><span class="rs-where-k">Where this shows up on the site:</span> %s</p>' % links)
    h.append('<p class="rs-tags">Topics: %s</p>' % esc(', '.join(tags)))
    h.append('</article>')
    return '\n'.join(h)


HEAD = '''<!DOCTYPE html>
<html lang="en">
<head>
<!-- Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-NKC6CQ9S66"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());

  gtag('config', 'G-NKC6CQ9S66', { page_location: location.origin + location.pathname }); // the address only: never a ?query or #part
</script>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>%(title)s</title>
<meta name="description" content="%(desc)s">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,500;0,9..144,600;1,9..144,500&family=Lora:ital,wght@0,400;0,500;0,600;1,400&family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/assets/css/site.css">
<link rel="stylesheet" href="/assets/css/reading.css">
<link rel="stylesheet" href="/assets/css/library-marks.css">
<script src="/assets/js/site.js" defer></script>
<style>
  .rs-jump{ list-style:none; padding:0 !important; margin:1rem 0 1.75rem !important; display:flex; flex-wrap:wrap; gap:.5rem; }
  .rs-jump li{ margin:0; max-width:none; }
  .rs-jump a{ display:inline-flex; align-items:center; min-height:44px; padding:.45rem 1rem; border:1px solid var(--line); border-radius:999px; background:var(--paper); text-decoration:none; font-size:.98rem; }
  .rs-jump a:hover{ border-color:var(--credit); }
  .rs-jump .rs-n{ margin-left:.4rem; font:500 .78rem/1 "IBM Plex Mono", ui-monospace, monospace; color:var(--ink-soft); }
  .rs-find-box{ margin:1rem 0 1.5rem !important; padding:.85rem 1rem; border:1px solid var(--line); border-radius:12px; background:var(--paper); max-width:100%%; box-sizing:border-box; }
  .rs-find-box[hidden]{ display:none; }
  .rs-find-box label{ display:block; font-weight:600; margin:0 0 .4rem; }
  .rs-find-box input{ width:100%%; box-sizing:border-box; min-height:44px; padding:.55rem .75rem; font:inherit; font-size:1rem; color:var(--ink); background:#FFFDF7; border:1px solid var(--ink-soft); border-radius:8px; }
  .rs-find-box p{ margin:.5rem 0 0 !important; font-size:.92rem; color:var(--ink-soft); }
  .rs-group{ margin:0 0 2rem; }
  .rs-group > p.rs-blurb{ color:var(--ink-soft); margin-top:.2rem !important; }
  .rs-entry{ margin:0 0 1rem; padding:.85rem 1rem .6rem; border:1px solid var(--line); border-radius:12px; background:var(--paper); box-sizing:border-box; max-width:100%%; overflow-wrap:anywhere; scroll-margin-top:5.5rem; }
  .rs-entry:target{ border-color:var(--credit); box-shadow:0 0 0 2px var(--credit); }
  .read .rs-entry p{ margin:.35rem 0 !important; max-width:none; }
  .read .rs-entry h3.rs-h{ margin:0 0 .25rem !important; font-size:1.05rem; line-height:1.4; font-weight:500; }
  .rs-au{ display:block; font:500 .85rem/1.45 "IBM Plex Mono", ui-monospace, monospace; color:var(--ink-soft); margin-bottom:.15rem; }
  .rs-ti{ font-family:"Fraunces", Georgia, serif; font-style:italic; }
  .rs-venue{ font-size:.92rem; color:var(--ink-soft); }
  .rs-badge{ display:inline-block; margin-right:.35rem; padding:.05rem .55rem; border-radius:999px; font:500 .75rem/1.6 "IBM Plex Mono", ui-monospace, monospace; letter-spacing:.03em; border:1px solid var(--ink-soft); color:var(--ink); background:var(--paper-deep); white-space:nowrap; }
  .rs-b-strong{ border-color:var(--credit); color:var(--credit); }
  .rs-b-moderate{ border-color:var(--brass); color:var(--brass-ink); }
  .rs-b-mixed, .rs-b-debated{ border-color:var(--debit); color:var(--debit); }
  .rs-b-early, .rs-b-theory{ border-style:dashed; }
  .rs-str{ font-size:.95rem; }
  .rs-more a{ display:inline-flex; align-items:center; min-height:44px; font-weight:600; }
  .rs-host{ font-size:.85rem; color:var(--ink-soft); }
  .rs-where{ font-size:.95rem; }
  .rs-where small{ color:var(--ink-soft); }
  .rs-where-k{ font-weight:600; }
  .rs-tags{ font-size:.85rem; color:var(--ink-soft); }
  .rs-legend{ list-style:none; padding:0 !important; }
  .rs-legend li{ margin:.45rem 0; }
  .rs-none{ padding:.75rem 1rem; border:1px dashed var(--line); border-radius:12px; }
  .rs-top{ font-size:.92rem; }
  .rs-links{ list-style:none; padding:0 !important; margin:.75rem 0 1.5rem !important; display:grid; gap:.5rem; width:100%%; }
  .rs-links li{ margin:0; max-width:none; width:100%%; box-sizing:border-box; }
  .rs-links a{ display:block; min-height:44px; padding:.7rem 1rem; background:var(--paper); border:1px solid var(--line); border-radius:var(--radius, 10px); text-decoration:none; }
  .rs-links a:hover{ border-color:var(--credit); }
  .rs-links a strong{ font-family:"Fraunces", Georgia, serif; text-decoration:underline; text-underline-offset:.15em; }
  .rs-links a span{ display:block; color:var(--ink-soft); font-size:.95rem; margin-top:.15rem; }
  .rs-say{ margin:.5rem 0 1.4rem !important; padding:.2rem 0 .2rem .9rem; border-left:3px solid var(--credit); }
  .rs-say p{ margin:.35rem 0 !important; }
  .rs-say p.q{ font-style:italic; }
</style>
<!-- seo:start -->
<link rel="canonical" href="%(url)s">
<link rel="alternate" hreflang="en-us" href="%(url)s">
<link rel="alternate" hreflang="x-default" href="%(url)s">
<meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1">
<meta name="keywords" content="self-help, relationships, kindness, love, appreciation, acceptance, connection, communication, calm, peace, harmony, reconciliation, emotional wellbeing, self-discovery, fairness at home, mental load, invisible work, free self-help tools, psychology, relationship research">
<meta name="author" content="Christian, Spread Love &amp; Acceptance">
<meta name="application-name" content="Spread Love &amp; Acceptance">
<meta name="theme-color" content="#F5EFDE">
<link rel="icon" href="/favicon.ico" sizes="any">
<link rel="icon" href="/assets/icons/icon.svg" type="image/svg+xml">
<link rel="icon" href="/assets/icons/favicon-32.png" type="image/png" sizes="32x32">
<link rel="icon" href="/assets/icons/favicon-16.png" type="image/png" sizes="16x16">
<link rel="apple-touch-icon" href="/assets/icons/apple-touch-icon-180.png" sizes="180x180">
<link rel="manifest" href="/manifest.webmanifest">
<meta property="og:site_name" content="Spread Love &amp; Acceptance">
<meta property="og:title" content="%(title)s">
<meta property="og:description" content="%(desc)s">
<meta property="og:type" content="article">
<meta property="og:url" content="%(url)s">
<meta property="og:image" content="https://spreadloveandacceptance.com/assets/img/og-image.png">
<meta property="og:image:type" content="image/png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="Two friends sharing one heart, with two happy pups: Spread Love &amp; Acceptance">
<meta property="og:locale" content="en_US">
<meta property="article:published_time" content="%(date)s">
<meta property="article:modified_time" content="%(date)s">
<meta property="article:author" content="https://spreadloveandacceptance.com/about.html">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="%(title)s">
<meta name="twitter:description" content="%(desc)s">
<meta name="twitter:image" content="https://spreadloveandacceptance.com/assets/img/og-image.png">
<meta name="twitter:image:alt" content="Two friends sharing one heart, with two happy pups: Spread Love &amp; Acceptance">
<script type="application/ld+json">%(ld)s</script>
<!-- seo:end -->
</head>
'''


def ld_json(url):
    g = {
        '@context': 'https://schema.org',
        '@graph': [
            {'@id': url + '#page', 'name': TITLE, 'headline': TITLE, 'description': DESCRIPTION, 'url': url,
             'inLanguage': 'en-US', 'isAccessibleForFree': True,
             'publisher': {'@type': 'Organization', '@id': SITE + '/#org', 'name': 'Spread Love & Acceptance', 'url': SITE + '/',
                           'logo': {'@type': 'ImageObject', 'url': SITE + '/assets/img/logo-stacked.png'}},
             'isPartOf': {'@type': 'WebSite', '@id': SITE + '/#website', 'name': 'Spread Love & Acceptance', 'url': SITE + '/'},
             'datePublished': PUBLISHED, 'dateModified': PUBLISHED,
             'image': SITE + '/assets/img/og-image.png', '@type': 'WebPage'},
            {'@type': 'BreadcrumbList', 'itemListElement': [
                {'@type': 'ListItem', 'position': 1, 'name': 'Spread Love & Acceptance', 'item': SITE + '/'},
                {'@type': 'ListItem', 'position': 2, 'name': TITLE, 'item': url}]},
        ]}
    return json.dumps(g, ensure_ascii=False, separators=(',', ':'))


FILTER_JS = r'''<script>
(function () {
  var q = document.getElementById('rs-q'), out = document.getElementById('rs-count'), none = document.getElementById('rs-none');
  if (!q) return;
  q.closest('.rs-find-box').hidden = false;   // the search box only works with scripts on, so it starts hidden
  var items = [].slice.call(document.querySelectorAll('.rs-entry')), groups = [].slice.call(document.querySelectorAll('.rs-group'));
  var total = items.length, t = null, keys = new Map();
  function norm(s) {
    s = String(s).toLowerCase();
    try { s = s.normalize('NFD').replace(/[\u0300-\u036f]/g, ''); } catch (e) {}
    return s.replace(/[“”"’'.,;:()]/g, ' ').replace(/\s+/g, ' ').trim();
  }
  // what a search looks through: everything in the entry except the "where on the site" links
  items.forEach(function (it) {
    var w = it.querySelector('.rs-where'), txt = (it.textContent || '').replace(w ? w.textContent : '', ' ');
    keys.set(it, norm(txt));
  });
  function run() {
    var words = norm(q.value || '').split(' ').filter(Boolean), shown = 0;
    items.forEach(function (it) {
      var k = keys.get(it), ok = words.every(function (w) { return k.indexOf(w) !== -1; });
      it.hidden = !ok; if (ok) shown++;
    });
    groups.forEach(function (g) { g.hidden = !g.querySelector('.rs-entry:not([hidden])'); });
    if (none) none.hidden = shown !== 0;
    out.textContent = words.length ? 'Showing ' + shown + ' of ' + total + ' entries.' : 'All ' + total + ' entries are shown.';
  }
  q.addEventListener('input', function () { clearTimeout(t); t = setTimeout(run, 120); });
  q.addEventListener('search', run);
  // a link to one entry (#ref-...) always shows it, even if a search had hidden it
  function showTarget() {
    var id = decodeURIComponent((location.hash || '').slice(1)), el = id && document.getElementById(id);
    if (!el || !el.classList.contains('rs-entry') || !el.hidden) return;
    q.value = ''; run(); el.scrollIntoView();
  }
  window.addEventListener('hashchange', showTarget);
  // arriving from a link to one entry: the site adds a few things near the top as it loads, which can push the
  // entry down, so put it back in view once, unless the reader has already started scrolling
  var moved = false;
  ['wheel', 'touchstart', 'keydown', 'mousedown'].forEach(function (ev) { window.addEventListener(ev, function () { moved = true; }, { once: true, passive: true }); });
  function settle() {
    var id = decodeURIComponent((location.hash || '').slice(1)), el = id && document.getElementById(id);
    if (moved || !el || !/^ref-/.test(id)) return;
    var top = el.getBoundingClientRect().top;
    if (top < 0 || top > 160) el.scrollIntoView();
  }
  window.addEventListener('load', function () { setTimeout(settle, 400); setTimeout(settle, 1500); });
  run();
})();
</script>
'''


def build_page(refs, missing):
    topic_to_group = {}
    for key, name, blurb, tops in GROUPS:
        for t in tops.split():
            topic_to_group.setdefault(t, key)
    grouped = OrderedDict((g[0], []) for g in GROUPS)
    for r in refs:
        grouped[group_of(r, topic_to_group)].append(r)
    for k in grouped:
        grouped[k].sort(key=lambda r: ((surnames(r['authors']) or [r['authors']])[0].lower(), r['year'] or 0, r['title']))
    pages_linked = set()
    body = []
    total = len(refs)
    counts = {s: 0 for s in STRENGTH}
    for r in refs:
        counts[strength_of(r)[0]] += 1

    body.append('<body data-no-cheer data-no-buddies data-no-pupvisits data-no-reading data-no-learnplay>')
    body.append('<main class="read" id="main">')
    body.append('<header class="read-head"><p class="read-code">Library · Sources</p><h1>The research behind this site</h1></header>')
    body.append('''
<aside class="tol-inshort no-cheer no-bubble" aria-label="In short">
  <p class="tol-inshort-h"><span aria-hidden="true">&#128204;</span> In short</p>
  <ul>
    <li>These are the %(total)d studies, books and reviews this site leans on, each with what it found, in plain words.</li>
    <li>Every entry says how strong the evidence is, and links to where you can read more.</li>
    <li>This site is self-help. It is built from research, but the site itself has not been tested in a trial.</li>
  </ul>
</aside>

<p class="simple-lede">The ideas on this site come from decades of research on relationships, feelings, stress, families and teams. This page lists the work we lean on: who did it, what they found, how sure we can be, and a link if you would like to read more. You don’t need any of this to use the site. It is here for the curious, and for anyone who wants to check our homework.</p>
''' % {'total': total})

    body.append('''<h2 id="how">How we use research, and its limits</h2>
<p>Research describes what tends to happen across many people. It can’t tell you what is true in your home, between you and the people you love. So we use it as a starting point for a kind conversation, never as a rule to win an argument with.</p>
<ul>
  <li><strong>We say how strong the evidence is.</strong> Some findings have been repeated many times. Others come from one study, or are still argued about. Each entry below has a label that says which.</li>
  <li><strong>“This site’s idea” means our own suggestion.</strong> Across the site, notes marked <span class="lib-own-k">This site’s idea</span> are our way of putting research into practice, like the tools, the scores and the step-by-step plans. They are not established science.</li>
  <li><strong>The site has not been tested in a trial.</strong> It is free self-help, not therapy, and it can’t know your situation. The <a href="/method-and-limits.html">method and limits</a> page sets out how the scores work.</li>
  <li><strong>We only list what we could check.</strong> Every entry here was looked up and has a working link. Anything we could not confirm is left off this page.</li>
  <li><strong>If someone is afraid at home,</strong> research about everyday disagreements doesn’t apply. Please see <a href="/safety.html">Not safe at home?</a> first.</li>
</ul>
<h3>What the research supports, and what it doesn’t</h3>
<ul>
  <li><strong>Well supported:</strong> people in a shared home each tend to remember more of their own part of the work (<a href="#ref-ross-sicoly-1979">Ross and Sicoly, 1979</a>). Findings like this one have been repeated many times, by different researchers.</li>
  <li><strong>Less sure:</strong> some popular ideas the site mentions have weak or mixed support. The five love languages are a handy way to start a talk, but research has not backed them as fixed types (<a href="#ref-impett-park-muise-2024">Impett, Park and Muise, 2024</a>). The idea that a tired will simply runs out did not hold up in a large repeat study (<a href="#ref-hagger-2016">Hagger and colleagues, 2016</a>). We say so where they come up.</li>
  <li><strong>Not tested at all:</strong> this site’s own tools, scores and step-by-step plans. They are built on the research, but no study has checked whether they work.</li>
</ul>
<h3>Words you could use</h3>
<div class="rs-say" data-keep-steps>
  <p class="q">“I read that a lot of couples each feel they do more. I wonder if that’s true for us too?”</p>
  <p class="q">“This study found something interesting. Does it sound like us, or not really?”</p>
</div>
''')

    body.append('<h2 id="labels">What the labels mean</h2>')
    body.append('<ul class="rs-legend">')
    legend = {
        'strong': 'Found again and again, by different researchers, often in large studies.',
        'moderate': 'Good support, but from fewer studies, smaller samples, or one main research group.',
        'mixed': 'Some studies support it and some don’t, or it depends a lot on the situation.',
        'early': 'Promising, but from a small number of studies. Treat it as a maybe.',
        'debated': 'Researchers disagree, or later studies could not repeat the result.',
        'theory': 'A way of thinking about something, like a model or a helpful picture, rather than something a study tested.',
    }
    for s, lbl in STRENGTH.items():
        if counts[s]:
            body.append('<li><span class="rs-badge rs-b-%s">%s</span> %s <small>(%d)</small></li>' % (s, lbl, legend[s], counts[s]))
    body.append('</ul>')

    body.append('<h2 id="find">Find a study</h2>')
    body.append('''<div class="rs-find-box no-bubble" role="search" data-no-bubble hidden>
  <label for="rs-q">Search by a name, a year or a topic</label>
  <input type="search" id="rs-q" autocomplete="off" spellcheck="false" placeholder="For example: Gottman, 1979, gratitude">
  <p id="rs-count" aria-live="polite">All %d entries are shown.</p>
</div>''' % total)
    body.append('<nav aria-label="Topics on this page">\n<ul class="rs-jump no-bubble">')
    for key, name, blurb, tops in GROUPS:
        if grouped[key]:
            body.append('  <li><a href="#t-%s">%s<span class="rs-n">%d</span></a></li>' % (key, esc(name), len(grouped[key])))
    body.append('</ul>\n</nav>')
    body.append('<p class="rs-none" id="rs-none" hidden>Nothing matches that search. Try a surname, a year, or one word like “stress”.</p>')

    for key, name, blurb, tops in GROUPS:
        items = grouped[key]
        if not items:
            continue
        body.append('<section class="rs-group no-bubble" aria-labelledby="t-%s">' % key)
        body.append('<h2 id="t-%s">%s</h2>' % (key, esc(name)))
        body.append('<p class="rs-blurb">%s</p>' % esc(blurb))
        for r in items:
            wl = where_links(r, missing)
            for m, _, _ in wl:
                pages_linked.add(m.split('#')[0])
            body.append(entry_html(r, wl))
        body.append('<p class="rs-top"><a href="#find">Back to the search and topics</a></p>')
        body.append('</section>')

    body.append('''
<h2 id="more">More for your situation</h2>
<ul class="rs-links no-bubble">
  <li><a href="/library.html"><strong>The Professor’s Library</strong><span>Each idea explained in plain words, with what the research says and its limits.</span></a></li>
  <li><a href="/method-and-limits.html"><strong>Method and limits</strong><span>How the site’s scores work, written out, with their cut-offs.</span></a></li>
  <li><a href="/for-counselors.html"><strong>For counselors, coaches and group leaders</strong><span>What this site is and isn’t, and the tools that work as homework.</span></a></li>
  <li><a href="/is-this-for-you.html"><strong>Is this right for you?</strong><span>Who the site is for, and when to look for other help.</span></a></li>
  <li><a href="/safety.html"><strong>Not safe at home?</strong><span>Helplines, and how to leave the site quickly.</span></a></li>
</ul>
<p>Spotted a mistake? Research moves on, and we would rather be corrected than be wrong. The links above go to the publisher, a library record or a trusted summary, and open in a new tab.</p>
''')
    body.append('</main>')
    body.append(FILTER_JS + '</body>\n</html>\n')

    url = SITE + '/research.html'
    head = HEAD % {'title': esc(TITLE), 'desc': esc(DESCRIPTION), 'url': url, 'date': PUBLISHED, 'ld': ld_json(url)}
    return head + '\n'.join(body), pages_linked, grouped


# ---------------------------------------------------------------------------------------------
# research-index.js
# ---------------------------------------------------------------------------------------------
def build_index(refs):
    common = load_common()
    rmap = OrderedDict()
    match = defaultdict(list)
    pages = defaultdict(list)
    for r in refs:
        sn = surnames(r['authors'])
        rmap[r['id']] = {'a': short_authors(r), 'y': r['year'], 'u': r['url'], 't': short_title(r['title'])}
        if len(sn) > 1 and not re.search(r'et al', r['authors']):
            rmap[r['id']]['c'] = sn[1:]   # every co-author, so "Neff and Vonk (2009)" never links to Neff and Karney (2009)
        if sn and r.get('year'):
            match[(sn[0], r['year'])].append(r['id'])
        for m in r.get('mentioned_on', []):
            if m.split('#')[0].endswith('.html') and r['id'] not in pages[m]:
                pages[m].append(r['id'])
    mlist = []
    for (s, y), ids in sorted(match.items(), key=lambda kv: (kv[0][0].lower(), kv[0][1])):
        strict = 1 if (len(s) <= 3 or s.lower() in common) else 0
        mlist.append([s, y, ids] + ([1] if strict else []))
    data = OrderedDict([('v', 1), ('refs', rmap), ('m', mlist), ('p', OrderedDict(sorted(pages.items())))])
    js = ('/* research-index.js: generated by tools/research/build_research.py from tools/research/refs-*.json. Do not edit.\n'
          '   refs: id -> {a: authors, y: year, u: link to the source, t: short title, c: every co-author surname, when known}\n'
          '   m: matchers [first author surname, year, [ids], strict?]; strict surnames are also everyday words,\n'
          '      so they need a first name, "and", "&", "et al." or a bracketed year next to them\n'
          '   p: page#section -> ids of the research that section draws on (used for the "Sources" line) */\n'
          'window.TOLResearchIndex = ' + json.dumps(data, ensure_ascii=False, separators=(',', ':')) + ';\n')
    return js, mlist


def main():
    raw = load()
    refs_all, renamed = merge(raw)
    validate(refs_all)
    refs = [r for r in refs_all if r.get('verified')]
    missing = []
    page, pages_linked, grouped = build_page(refs, missing)
    idx, mlist = build_index(refs)
    with open(OUT_PAGE, 'w', encoding='utf-8') as f:
        f.write(page)
    with open(OUT_INDEX, 'w', encoding='utf-8') as f:
        f.write(idx)
    print('read %d entries from %d files; %d unique ids after merging' % (len(raw), len(SRC), len(refs_all)))
    for old, new, src in renamed:
        print('  same id, different work: %s in %s published as %s' % (old, src, new))
    print('published %d verified entries; left out %d unverified' % (len(refs), len(refs_all) - len(refs)))
    al = [(r['id'], x) for r in refs for x in r.get('aliases', [])]
    if al:
        print('  same work under two ids, merged: ' + ', '.join('%s = %s' % p for p in al))
    print('groups: ' + ', '.join('%s %d' % (k, len(v)) for k, v in grouped.items()))
    print('"where this shows up" links point to %d pages' % len(pages_linked))
    print('matchers: %d (%d strict)' % (len(mlist), sum(1 for m in mlist if len(m) > 3)))
    print('wrote %s (%d KB) and %s (%d KB)' % (os.path.relpath(OUT_PAGE, ROOT), len(page.encode()) // 1024,
                                              os.path.relpath(OUT_INDEX, ROOT), len(idx.encode()) // 1024))
    if missing:
        print('WARNING: %d site links skipped:' % len(missing))
        for m in missing:
            print('  ' + m)


if __name__ == '__main__':
    main()
