#!/usr/bin/env python3
"""Build the Professor's Library: /library.html (the hub) and /library/<theme>.html.

The entries live in plain-text files in tools/library/entries/, one file per theme.
Edit those, then run:

    python3 tools/library/build_library.py
    python3 tools/chat/build_kb.py      # so the chat can use the new text

Entry file format (blank lines separate paragraphs):

    #slug: relationships
    #title: How relationships work
    #blurb: One line for the hub page.
    #intro: A short paragraph that opens the theme page.

    @@ entry-id | Entry title
    aka: other names, comma separated        (optional)
    nut: One or two sentences.
    deep:
    Paragraph.

    Paragraph.
    research:
    Paragraph.
    links:
    /path.html#anchor | Link text
    talk:
    - A question?

Inline markup: *text* becomes <em>text</em>. Everything else is escaped.
Python 3 standard library only.
"""
import html
import os
import re
import sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
SRC = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'entries')

HEAD = '''<!DOCTYPE html>
<html lang="en">
<head>
<!-- Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-NKC6CQ9S66"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());

  gtag('config', 'G-NKC6CQ9S66');
</script>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>%(title)s — The Objective Ledger</title>
<meta name="description" content="%(desc)s">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,500;0,9..144,600;1,9..144,500&family=Lora:ital,wght@0,400;0,500;0,600;1,400&family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/assets/css/site.css">
<link rel="stylesheet" href="/assets/css/reading.css">
<script src="/assets/js/site.js" defer></script>
<style>
.lib-note{ font-size:.95rem; color:var(--ink-soft); border:1px dashed var(--line); border-radius:12px; padding:.7rem 1rem; margin:0 0 1.6rem; }
.lib-toc{ margin:1.5rem 0 2.5rem; padding:1rem 1.2rem; background:var(--paper-deep); border-radius:14px; }
.lib-toc h2{ font-size:1.25rem !important; margin:0 0 .5rem !important; }
.lib-toc h3{ font-size:1.05rem !important; margin:1.1rem 0 .3rem !important; }
.lib-toc ul{ margin:0; padding-left:1.1rem; columns:2 15rem; column-gap:2rem; }
.lib-toc li{ margin:.15rem 0; break-inside:avoid; font-size:.97rem; line-height:1.45; }
.lib-toc p{ margin:.2rem 0 .4rem; font-size:.95rem; color:var(--ink-soft); }
.lib-entry{ border-top:1px solid var(--line); margin-top:2.6rem; padding-top:.4rem; scroll-margin-top:1rem; }
.lib-entry h2{ margin-top:1.4rem; }
.lib-entry h3{ font-size:1.08rem !important; margin:1.4rem 0 .35rem !important; color:var(--ink-soft); font-style:italic; }
.lib-aka{ font-size:.9rem; color:var(--ink-soft); margin:-.3rem 0 .8rem !important; }
.lib-nut p{ font-size:1.05rem; }
.lib-nut{ background:var(--paper-deep); border-left:3px solid var(--brass); border-radius:var(--radius); padding:.6rem 1rem .1rem; margin:.4rem 0 1rem; }
.lib-nut h3{ margin-top:.3rem !important; }
.lib-top{ font-size:.88rem; margin:1.2rem 0 0 !important; }
.lib-themes{ list-style:none; padding:0 !important; display:grid; grid-template-columns:repeat(auto-fill, minmax(15rem, 1fr)); gap:.8rem; }
.lib-themes li{ margin:0 !important; padding:.8rem 1rem; border:1px solid var(--line); border-radius:14px; background:var(--paper); max-width:none !important; }
.lib-themes a{ font-family:"Fraunces", Georgia, serif; font-weight:600; font-size:1.1rem; }
.lib-themes p{ margin:.25rem 0 0; font-size:.93rem; color:var(--ink-soft); line-height:1.5; }
.lib-foot{ margin:3rem 0 1rem; padding-top:1rem; border-top:3px double var(--ink); font-size:.95rem; }
.lib-foot ul{ padding-left:1.1rem; columns:2 14rem; }
.read .lib-entry a, .read .lib-toc a{ overflow-wrap:anywhere; }
.lib-pillars{ font-size:.97rem; margin-bottom:.3rem !important; }
.lib-pillar-list li{ font-size:.93rem; color:var(--ink-soft); }
.lib-pillar-list small, .lib-pillar small{ font-family:"IBM Plex Mono", ui-monospace, monospace; font-size:.72rem; color:var(--ink-soft); font-weight:400; }
.lib-pillar-note{ margin:0 0 1.5rem; }
.lib-pillar-note h2{ font-size:1.3rem; margin-top:1.5rem; }
</style>
</head>
<body>
<main class="read">
'''

NOTE = ('<p class="lib-note"><strong>A gentle note:</strong> this library is general education about how people '
        'tend to think, feel and get along. It is not diagnosis, therapy or treatment, and it can’t know your situation. '
        'Where the evidence is thin, mixed or debated, each entry says so.</p>')


# The Five Pillars (defined on /infographic.html; explained on /five-pillars.html).
# number: (plain name, anchor, field it borrows from, in you, between you and others)
PILLARS = {
    'I': ('See the whole load', 'see-the-load', 'ledger accounting',
          'notice everything you carry, including the invisible, mental and emotional load',
          'put it on one shared, fair page so nobody has to argue about whose work “counts”'),
    'II': ('Fix the setup, not the person', 'fix-the-setup', 'systems thinking',
           'see your habits and routines as a setup you can redesign, not a character flaw',
           'use clear owners, handoffs and agreements instead of blame'),
    'III': ('Read your state first', 'read-your-state', 'nervous-system science',
            'know how full your battery is (calm, revved up or shut down) before you judge a moment',
            'pick the timing, pause and come back; your state shapes how the other person’s words land'),
    'IV': ('Tune how you send and receive', 'tune-signals', 'signal theory, the Frequency Framework',
           'know your own wiring, pace and how you hear things',
           'translate across different wiring and tone; a mismatch is tuning, not a moral failing'),
    'V': ('Notice the quiet incentives', 'quiet-incentives', 'behavioural economics',
          'spot the defaults and shortcuts that steer your own choices',
          'see how unclaimed jobs drift to one person, and how fairness and thanks keep things steady'),
}
PILLAR_ORDER = ['I', 'II', 'III', 'IV', 'V']


def pillar_list(txt):
    out = [x.strip() for x in (txt or '').split(',') if x.strip()]
    for x in out:
        if x not in PILLARS:
            sys.exit('unknown pillar %r' % x)
    return out


def pillar_link(n):
    name, anchor = PILLARS[n][0], PILLARS[n][1]
    return '<a href="/five-pillars.html#%s">Pillar %s, %s</a>' % (anchor, n, html.escape(name))


def inline(s):
    s = html.escape(s, quote=False)
    s = re.sub(r'\*([^*\n]+)\*', r'<em>\1</em>', s)
    return s


def paras(lines):
    out, cur = [], []
    for ln in lines:
        if ln.strip():
            cur.append(ln.strip())
        elif cur:
            out.append(' '.join(cur))
            cur = []
    if cur:
        out.append(' '.join(cur))
    return out


def parse(path):
    meta, entries, e, field = {}, [], None, None
    for raw in open(path, encoding='utf-8').read().splitlines():
        line = raw.rstrip()
        m = re.match(r'^#(\w+):\s*(.*)$', line)
        if m and e is None:
            meta[m.group(1)] = m.group(2).strip()
            continue
        m = re.match(r'^@@\s*([a-z0-9-]+)\s*\|\s*(.+)$', line)
        if m:
            e = {'id': m.group(1), 'title': m.group(2).strip(), 'aka': '', 'pillars': '', 'nut': [], 'deep': [],
                 'research': [], 'links': [], 'talk': []}
            entries.append(e)
            field = None
            continue
        if e is None:
            continue
        m = re.match(r'^(aka|pillars|nut|deep|research|links|talk):\s*(.*)$', line)
        if m:
            field = m.group(1)
            if field in ('aka', 'pillars'):
                e[field] = m.group(2).strip()
                field = None
            elif m.group(2).strip():
                e[field].append(m.group(2).strip())
            continue
        if field:
            e[field].append(line)
    for e in entries:
        e['nut'] = paras(e['nut'])
        e['deep'] = paras(e['deep'])
        e['research'] = paras(e['research'])
        e['links'] = [tuple(x.strip() for x in ln.split('|', 1)) for ln in e['links'] if ln.strip()]
        e['talk'] = [ln.strip()[1:].strip() for ln in e['talk'] if ln.strip().startswith('-')]
        missing = [k for k in ('nut', 'deep', 'research', 'links', 'talk') if not e[k]]
        if missing:
            sys.exit('%s: entry %s is missing %s' % (os.path.basename(path), e['id'], ', '.join(missing)))
    return meta, entries


def entry_html(e):
    o = ['<article class="lib-entry" id="%s" data-k="%s">' % (e['id'], html.escape(e['title'] + (', ' + e['aka'] if e['aka'] else '')))]
    o.append('<h2>%s</h2>' % inline(e['title']))
    if e['aka']:
        o.append('<p class="lib-aka">Also known as: %s.</p>' % inline(e['aka']))
    o.append('<div class="lib-nut">\n<h3>In a nutshell</h3>')
    o += ['<p>%s</p>' % inline(p) for p in e['nut']]
    o.append('</div>\n<h3>Going deeper</h3>')
    o += ['<p>%s</p>' % inline(p) for p in e['deep']]
    o.append('<h3>What the research says, and its limits</h3>')
    o += ['<p>%s</p>' % inline(p) for p in e['research']]
    o.append('<h3>How it connects to the program</h3>')
    pl = pillar_list(e['pillars'])
    if pl:
        o.append('<p class="lib-pillars">Where it sits in the <a href="/five-pillars.html">Five Pillars</a>: %s.</p>\n<ul class="lib-pillar-list">'
                 % ' and '.join(pillar_link(n) for n in pl))
        for n in pl:
            name, _, field, you, us = PILLARS[n]
            o.append('<li><strong>%s</strong> <small>(%s)</small>. In you: %s. Between you and others: %s.</li>'
                     % (html.escape(name), html.escape(field), html.escape(you), html.escape(us)))
        o.append('</ul>')
    o.append('<p>Where to use it in the program:</p>\n<ul>')
    for href, text in e['links']:
        o.append('<li><a href="%s">%s</a></li>' % (html.escape(href), inline(text)))
    o.append('</ul>\n<h3>To talk about</h3>\n<ul>')
    o += ['<li>%s</li>' % inline(q) for q in e['talk']]
    o.append('</ul>\n<p class="lib-top"><a href="#contents">Back to the contents</a></p>\n</article>')
    return '\n'.join(o)


def main():
    files = sorted(f for f in os.listdir(SRC) if f.endswith('.txt'))
    themes = []
    for f in files:
        meta, entries = parse(os.path.join(SRC, f))
        themes.append((meta, entries))
    ids = {}
    for meta, entries in themes:
        for e in entries:
            if e['id'] in ids:
                sys.exit('duplicate entry id %s (%s and %s)' % (e['id'], ids[e['id']], meta['slug']))
            ids[e['id']] = meta['slug']
    total = sum(len(en) for _, en in themes)
    os.makedirs(os.path.join(ROOT, 'library'), exist_ok=True)

    def foot(current):
        o = ['<nav class="lib-foot" aria-label="Library themes"><p><strong>More from the Professor’s Library</strong> '
             '(<a href="/library.html">all themes</a>)</p><ul>']
        for m, en in themes:
            if m['slug'] != current:
                o.append('<li><a href="/library/%s.html">%s</a> (%d)</li>' % (m['slug'], inline(m['title']), len(en)))
        o.append('</ul></nav>')
        return '\n'.join(o)

    for meta, entries in themes:
        slug = meta['slug']
        o = [HEAD % {'title': html.escape(meta['title'] + ' · The Professor’s Library'), 'desc': html.escape(meta['blurb'])}]
        o.append('<header class="read-head"><p class="read-code">The Professor’s Library</p><h1>%s</h1></header>' % inline(meta['title']))
        o.append('<p class="depth-bar"><span>%d entries</span><a class="dig" href="/library.html">All library themes</a></p>' % len(entries))
        o.append(NOTE)
        o += ['<p class="simple-lede">%s</p>' % inline(p) for p in [meta['intro']]]
        tp = pillar_list(meta.get('pillars'))
        counts = {n: sum(1 for e in entries if n in pillar_list(e['pillars'])) for n in PILLAR_ORDER}
        o.append('<section class="lib-pillar-note" id="pillars"><h2>%s and the Five Pillars</h2>' % inline(meta['title']))
        o.append('<p>%s</p>' % inline(meta.get('pillarnote', '')))
        o.append('<p>Entries on this page, by pillar: %s. Each entry says which pillar it belongs to and how it works '
                 'in you and between you and others. <a href="/library.html#five-pillars">The Five Pillars, explained</a>.</p></section>'
                 % '; '.join('%s (%d)' % (pillar_link(n), counts[n]) for n in PILLAR_ORDER if counts[n]))
        o.append('<nav class="lib-toc" id="contents" aria-label="Contents"><h2>Contents</h2><ul>')
        o += ['<li><a href="#%s">%s</a></li>' % (e['id'], inline(e['title'])) for e in entries]
        o.append('</ul></nav>')
        o += [entry_html(e) for e in entries]
        o.append(foot(slug))
        o.append('</main>\n</body>\n</html>\n')
        with open(os.path.join(ROOT, 'library', slug + '.html'), 'w', encoding='utf-8') as fh:
            fh.write('\n'.join(o))

    # hub
    o = [HEAD % {'title': 'The Professor’s Library',
                 'desc': 'The science behind the program: %d plain-language entries on relationships, conflict, '
                         'fairness, stress, emotions, thinking traps, wiring, habits and connection.' % total}]
    o.append('<header class="read-head"><p class="read-code">The Professor’s Library</p><h1>The science behind the program</h1></header>')
    o.append('<p class="simple-lede">The Objective Ledger borrows from a lot of fields: relationship research, '
             'conflict resolution, psychology, behavioural science, even project management. This library is where '
             'those ideas are laid out properly, in plain words, with who found what, how strong the evidence is, and '
             'where it is still argued about. Each entry ends with questions to talk over together, and links back to '
             'the parts of the program that use the idea.</p>')
    o.append(NOTE)
    o.append('<p>Every entry has the same five parts: <em>in a nutshell</em>, <em>going deeper</em>, <em>what the '
             'research says and its limits</em>, <em>how it connects to the program</em>, and <em>to talk about</em>. '
             'Read one a day, or pick a theme that fits what is going on for you. Professor Puddles, the site’s chat '
             'helper on the <a href="/ask.html">Ask page</a>, can look things up in here too.</p>')
    o.append('<h2>The themes</h2>\n<ul class="lib-themes">')
    for meta, en in themes:
        o.append('<li><a href="/library/%s.html">%s</a><p>%s (%d entries; %s)</p></li>' % (
            meta['slug'], inline(meta['title']), inline(meta['blurb']), len(en),
            ', '.join('Pillar ' + n for n in pillar_list(meta.get('pillars')))))
    o.append('</ul>')
    # The Five Pillars, as the library uses them
    o.append('<section id="five-pillars"><h2>The Five Pillars, and how every topic here ties to them</h2>')
    o.append('<p>The whole program rests on five pillars of understanding. Each one starts inside you, as a way of '
             'understanding yourself, and then shows up between you and other people: partners, family, friends, '
             'roommates, coworkers and the people you care for. In one sentence: you see the load (I), redesign the setup '
             'around it (II), check your state before you talk (III), tune the message so it lands (IV), and keep an eye on '
             'the quiet pulls that let things slide back (V). Every entry in this library names the pillar or pillars it '
             'belongs to. The full explanation lives on <a href="/five-pillars.html">the Five Pillars page</a>.</p>')
    for n in PILLAR_ORDER:
        name, anchor, field, you, us = PILLARS[n]
        tagged = [(m, e) for m, en in themes for e in en if n in pillar_list(e['pillars'])]
        main_themes = [m for m, _ in themes if n in pillar_list(m.get('pillars'))]
        o.append('<section class="lib-pillar" id="pillar-%s"><h3>Pillar %s: %s <small>(borrowed from %s)</small></h3>' % (n.lower(), n, html.escape(name), html.escape(field)))
        o.append('<p><strong>In you:</strong> %s. <strong>Between you and others:</strong> %s.</p>' % (html.escape(you[0].upper() + you[1:]), html.escape(us)))
        o.append('<p>In this library, %d entries use Pillar %s%s. For example: %s. '
                 '<a href="/five-pillars.html#%s">More on Pillar %s</a>.</p></section>' % (
                     len(tagged), n,
                     (', mostly in ' + ', '.join('<a href="/library/%s.html">%s</a>' % (m['slug'], inline(m['title'])) for m in main_themes)) if main_themes else '',
                     ', '.join('<a href="/library/%s.html#%s">%s</a>' % (m['slug'], e['id'], inline(e['title'])) for m, e in tagged[:: max(1, len(tagged) // 5)][:5]),
                     anchor, n))
    o.append('<h3>How to tie any topic to a pillar</h3>')
    o.append('<p>When a question comes up, whether it is about chores, money, a sharp text or a hard week, you can ask '
             'five short questions. What is the whole load here, including the unseen part? (Pillar I.) Is this really '
             'about a person, or about a setup with no clear owner? (Pillar II.) What state were we each in when it '
             'happened? (Pillar III.) Did the message land the way it was meant, given our different wiring and tone? '
             '(Pillar IV.) What quiet default or shortcut is pulling things back the old way? (Pillar V.) Each question '
             'works inside one person first, as self-understanding, and then between people, as something to talk about '
             'together.</p></section>')
    o.append('<nav class="lib-toc" id="contents" aria-label="Every entry, by theme"><h2>Every entry, by theme</h2>')
    for meta, en in themes:
        o.append('<h3><a href="/library/%s.html">%s</a></h3><ul>' % (meta['slug'], inline(meta['title'])))
        o += ['<li><a href="/library/%s.html#%s">%s</a></li>' % (meta['slug'], e['id'], inline(e['title'])) for e in en]
        o.append('</ul>')
    o.append('</nav>')
    o.append('<p>A last word: research describes averages across many people. You and the people you live with are '
             'not averages. Use what fits, question what doesn’t, and treat every idea here as something to talk about '
             'rather than a rule to win with.</p>')
    o.append('</main>\n</body>\n</html>\n')
    with open(os.path.join(ROOT, 'library.html'), 'w', encoding='utf-8') as fh:
        fh.write('\n'.join(o))
    print('themes: %d  entries: %d' % (len(themes), total))
    for meta, en in themes:
        size = os.path.getsize(os.path.join(ROOT, 'library', meta['slug'] + '.html'))
        print('  %-14s %3d entries  %6.1f KB' % (meta['slug'], len(en), size / 1024))


if __name__ == '__main__':
    # The library pages have since been edited by hand (plain tool names, "This site's idea" labels and the
    # folded pillar notes, see mark_own_ideas.py). Rebuilding from the entries would undo that, so it only
    # runs on purpose, after those edits have been carried into the entries.
    if '--force' not in sys.argv:
        sys.exit('build_library.py: the library pages are now edited directly; rerun with --force only after porting those edits into tools/library/entries/.')
    main()
