#!/usr/bin/env python3
"""pocket.py: "The Logic Behind It", the series' pocket guide (logicbook14).

A 5 x 8 in standard-colour paperback (72 to 80 pages) and a Kindle ebook, made from the situations in
assets/js/logic-library.js (the same words as /the-logic-behind-it.html, with the print wording in
tools/book/series-extras.json "overrides"), one situation to a page. tools/book/build_series.py calls build() for the
print page (book/print/src/<id>.html) and its cover; tools/book/build_epub.py calls epub_docs() for the ebook and the
box set. Nothing here runs on import.

Pages: title, copyright, contents, how to use this guide, three short pages on the six-part lens, then nine short
sections (an opening page and a page per situation, each with a code to that situation online), then "Build your own"
(a page on how, and blank cards), Find it fast, more free online, research notes, the series and pages for notes.
The owner's road-rage tip ("tailgating") stays on the website only: build() refuses it.
"""
import json
import os
import re
import subprocess

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
LIB_JS = os.path.join(ROOT, 'assets', 'js', 'logic-library.js')
PAGE = '/the-logic-behind-it.html'


def extras():
    with open(os.path.join(HERE, 'series-extras.json'), encoding='utf-8') as f:
        return json.load(f)


def library():
    """the logic library as data (node reads the file the website uses, so the words are always the same)"""
    out = subprocess.run(['node', '-e', 'process.stdout.write(JSON.stringify(require(process.argv[1])))', LIB_JS],
                         capture_output=True, text=True, check=True).stdout
    return json.loads(out)


_LIB = None


def lib():
    global _LIB
    if _LIB is None:
        _LIB = library()
    return _LIB


def item(iid, overrides=None):
    """one situation, with the print wording applied (field, or field.N for one step or analogy)"""
    it = dict(next(x for x in lib()['items'] if x['id'] == iid))
    it['chain'], it['an'] = list(it['chain']), list(it['an'])
    for k, v in (overrides or {}).get(iid, {}).items():
        if k.startswith('care'):
            continue  # "With care" lines stay exactly as written
        if '.' in k:
            f, n = k.split('.')
            it[f][int(n)] = v
        else:
            it[k] = v
    return it


def item_url(iid):
    return '%s?item=%s#find' % (PAGE, iid)


def item_addr(iid):
    return 'spreadloveandacceptance.com/the-logic-behind-it?item=%s' % iid


def cats():
    return lib()['cats']


def sides():
    return lib()['sides']


def config():
    p = extras()['pocket']
    bad = [x for x in p['items'] if x in p.get('never', [])]
    if bad:
        raise SystemExit('pocket: %s is for the website only (owner\'s decision)' % ', '.join(bad))
    have = {x['id'] for x in lib()['items']}
    missing = [x for x in p['items'] if x not in have]
    if missing:
        raise SystemExit('pocket: not in the logic library: %s' % ', '.join(missing))
    return p


def sections(p):
    """[(cat, [item, ...])] in the library's category order"""
    its = [item(i, p.get('overrides')) for i in p['items']]
    out = []
    for c in cats():
        mine = [x for x in its if x['cat'] == c['id']]
        if mine:
            out.append((c, mine))
    return out


# ---------- the words around the situations ----------
SEC_INTRO = {
    'plans': 'A plan does more than fix a time. For a lot of people it’s a map of the day, already walked through in their head, and when it changes at short notice the map has to be redrawn on the spot. These pages are about what that costs, and about the friendly plans that were never really meant to happen at all. An economist would say the plan already spent some of the day’s budget; changing it spends more.',
    'energy': 'Noise, crowds, hunger and a long week all draw on the same supply. When it runs low, people leave early, or put their headphones in, or snap at a small question. These pages follow a battery running down, and what helps before it hits empty. Neurobiology’s phrase for it is that your state sets the volume, and holistic practice starts there, with the body.',
    'talk': 'The same words can carry a plain meaning and a hidden one. Some people say exactly what they mean and hear exactly what’s said. Others hint, soften and tease, and expect the hidden meaning to be picked up. Both are systems. Either can be learned. Or you can just ask. Psychology’s short version is that intent isn’t impact.',
    'social': 'Small talk, white lies and “How are you?” can look pointless from outside. Each one does a quiet job, like showing goodwill or sparing a feeling. These pages set out those jobs plainly, along with what it costs to keep up appearances all day. The art of debating would add: say the other person’s strongest point first.',
    'work': 'Deadlines, meetings and feedback come with unwritten rules, and people bring different ones into the same room. These pages are about asking for things in writing, starting late, agreeing in the meeting and disagreeing by the lifts, and wrapping criticism in praise. Business and politics agree that every job needs an owner and every group a fair way to decide.',
    'family': 'Close to home, a reaction lands harder, because it comes from someone who matters. Going quiet, asking again, giving advice nobody asked for. Each has a logic, and each has another side. Finance has a picture for it: a repair tops up a reserve of goodwill.',
    'feelings': 'Big feelings can come out as a meltdown, a shutdown, a blank face or a row about a mug. None of these is chosen in the moment. These pages are about what’s going on inside, and what helps afterwards. Music explains a lot of it, because tone and tempo carry more than words, and a shared laugh can reset a heavy room (the research on laughter is modest).',
    'routines': 'Sameness and deep interests are ways of saving energy and finding joy. From outside they can look rigid, or one-sided. These pages show the logic, and a way to meet in the middle. Behavioural science calls these habits that save effort; the setting matters too, and aromatherapy’s modest point is that a familiar scent or a quieter room can help some people settle.',
    'rulebooks': 'A lot of friction comes from people following different rulebooks, each sure theirs is normal. What “seven o’clock” means. How loud a family dinner gets. How plainly feedback is given. Whether a full stop in a text is cross. All of it learned in a particular place, family or generation.',
}

HOW = [
    ('Dip in anywhere', 'Every page stands on its own. Use the contents, the section pages or “Find it fast” at the back to go straight to whatever’s in front of you.'),
    ('Read it with the other person', 'A page can say what’s hard to say in the moment. Hand it over, or read it together, and talk about the last two parts, the other side and the small step.'),
    ('Use it both ways', 'Some pages may explain you. Some may explain the people round you. Either way, the point is a fair view of both sides.'),
    ('Scan for more', 'Each page has a code to the same situation on the website, free, with more pictures to choose from. The website has more than seventy situations, and a box where you can type your own.'),
    ('Build your own', 'The blank cards at the back walk you through the six parts for a reaction this guide doesn’t cover. There will be plenty of those.'),
]

LENS = [
    ('lens-why', 'Why a reaction can look odd', [
        'A friend leaves the party without saying goodbye. A colleague’s feedback lands like a slap. Someone says “I’m fine” when they very obviously aren’t. From outside, each of these can look odd, or rude, or a bit much.',
        'Most of them have a logic behind them. Once you can see it, it usually makes sense, given how someone is built, what they learned and what kind of day they’ve had. The trouble is that the logic is hidden, so the rest of us fill the gap with a guess. The guess is often unkind.',
        'This guide puts the logic into words, a step at a time, and every page gives the other person’s side as well, because otherwise it wouldn’t be fair.',
        {'sn': 'ross-greene-house-1977', 'title': 'Why our own way looks normal',
         'text': 'In the studies that named the false consensus effect, people overestimated how many others would make the same choice they had, and saw the other choice as the odd one. It’s why a reaction unlike yours can look strange before it looks logical.',
         'ev': 'Strong: replicated many times, though the size of the effect varies', 'cite': 'Ross, Greene and House (1977)'},
        'No page is a diagnosis or a label. People differ, and no group always does anything. The pages say “many people” or “some people” on purpose.',
    ]),
    ('lens-parts', 'The six parts', None),
    ('lens-ways', 'It runs both ways', [
        'Every situation carries one of three small tags.',
        None,
        'The tag says where a reaction is common. It never tells you what the person in front of you is.',
        {'sn': 'milton-2012', 'title': 'The double empathy problem',
         'text': 'The autistic researcher Damian Milton argued that misunderstanding between autistic and non-autistic people runs both ways: each finds the other hard to read, so the problem sits between them. His paper is an argument rather than an experiment; later studies support parts of it.',
         'ev': 'Theory: no data in the paper itself; later experiments support parts of it', 'cite': 'Milton (2012)'},
        'The pages about common social habits matter as much as the others. If you have ever been told you “should have known” what someone meant, it can be a relief to see that there was a system all along, and that it can be learned or simply asked about. And if you use those habits without thinking, seeing their logic written down shows where someone else might miss the signal.',
        'The last section, “Different rulebooks”, is about habits learned in a particular place, family or generation. Two people can each be polite by their own rules and still upset each other.',
    ]),
    ('lens-care', 'Logic explains. It doesn’t excuse.', [
        'Knowing why a reaction happened doesn’t make its effects disappear. If a reaction hurts someone, the kind and logical next step is to say so, put it right and find a better step for next time.',
        'Some pages have a line marked “With care”. It appears where a reaction can land hard on someone else, and it says what keeps things fair.',
        'Seeing the other side doesn’t mean agreeing to everything the other person wants. A “no” or a limit given with care is part of looking after a relationship.',
        'If you’re reading a page with someone, start with the part about their side. People listen more easily once they feel understood.',
    ]),
]

PARTS = [
    ('What it looks like', 'One line in camera words, what a camera would see or hear. There is no “rude” and no “weird”, because a verdict closes the question before the logic can answer it.'),
    ('The logic', 'Three or four short steps, each following from the one before. The chain starts with a plain fact about how things work, such as “Energy works like a budget”.'),
    ('It’s like', 'An everyday picture that works the same way inside. A phone on 3% shuts down the extras to protect the call, which is why it suits low energy so well.'),
    ('Why it fits', 'What makes the reaction reasonable, said fairly and without stretching it. Where research supports a page, the research notes at the back list it.'),
    ('The other side', 'What the other person may have felt or needed. This part keeps the lens fair, so nobody has to be the bad guy.'),
    ('One sentence and one step', 'Words you could actually say out loud, and a step small enough to try this week that helps both people.'),
]

BUILD_PROMPTS = [
    ('What it looks like', 'Camera words only. What would a camera see or hear?'),
    ('The logic', 'Three or four steps. Start with a plain fact about how things work.'),
    ('It’s like', 'Something everyday that works the same way inside.'),
    ('Why it fits', 'What makes it reasonable, said fairly.'),
    ('The other side', 'What might the other person feel or need?'),
    ('One sentence and one step', 'Words to say, and something small to try this week.'),
]


def esc(s):
    return (s or '').replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;').replace('"', '&quot;')


# finalfix15: softer tags. A tag says where a reaction is common, never what a person is ("No page labels anyone")
SIDE_TAG = {'nd': 'Common for many neurodivergent people', 'nt': 'A common social habit', 'all': 'Something anyone can do'}


def side_words():
    return [(SIDE_TAG['nd'], 'a reaction many neurodivergent people have, explained for people who don’t share it, such as headphones at dinner or a long talk about one interest.'),
            (SIDE_TAG['nt'], 'a habit many people find natural, explained in plain logic for anyone who finds it baffling, such as small talk, “I’m fine” and hints.'),
            (SIDE_TAG['all'], 'a reaction anyone can have, such as snapping when hungry or going quiet in a row.')]


# ---------- print ----------
def sit_html(it, n, S, include_fits=True):
    """one situation, one page"""
    c = next(x for x in cats() if x['id'] == it['cat'])
    chain = ''.join('<li>%s</li>' % esc(x) for x in it['chain'])
    fits = ('<div class="pk-part pk-fits"><h3 class="pk-h">Why it fits</h3><p>%s</p></div>' % esc(it['fits'])) if include_fits and it.get('fits') else ''
    care = ('<p class="pk-care"><b>With care</b> %s</p>' % esc(it['care'])) if it.get('care') else ''
    return ('<article class="pk-sit pe-ch pk-c-%(cat)s" id="sit-%(id)s">%(mark)s'
            '<header class="pk-sit-head"><p class="pk-sit-k"><span class="pk-sit-n">%(n)d</span>%(cat_name)s<span class="pk-dot"> · </span><span class="pk-side pk-side-%(side)s">%(side_t)s</span></p>'
            '<h2 class="pk-sit-t">%(t)s</h2></header>'
            '<div class="pk-part pk-looks"><h3 class="pk-h">What it looks like</h3><p>%(looks)s</p></div>'
            '<div class="pk-part pk-logic"><h3 class="pk-h">The logic</h3><ol class="pk-chain">%(chain)s</ol></div>'
            '<div class="pk-part pk-like"><h3 class="pk-h">It’s like</h3><p>%(an)s</p></div>%(fits)s'
            '<div class="pk-part pk-other"><h3 class="pk-h">The other side</h3><p>%(other)s</p></div>'
            '<div class="pk-say"><p class="pk-say-q">%(say)s</p><p class="pk-step"><b>One small step</b> %(step)s</p>%(care)s</div>'
            '<div class="pk-online">%(qr)s<p><strong>This one online</strong>Free, with more pictures to choose from.'
            '<a href="https://spreadloveandacceptance.com%(url)s"><span class="ps-addr pk-addr">%(addr)s</span></a></p></div></article>') % {
        'cat': it['cat'], 'id': it['id'], 'mark': S.mark('sit-' + it['id']), 'n': n, 'cat_name': esc(c['name']), 'side': it['side'],
        'side_t': esc(SIDE_TAG[it['side']]), 't': esc(it['t']), 'looks': esc(it['looks']), 'chain': chain, 'an': esc(it['an'][0]), 'fits': fits,
        'other': esc(it['other']), 'say': esc(it['say']), 'step': esc(it['step']), 'care': care, 'qr': S.qr(item_url(it['id'])),
        'url': esc(item_url(it['id'])), 'addr': S.B.addr_html(item_addr(it['id'])).replace('?', '?<wbr>')}


def sec_html(k, c, its, S, nums):
    rows = ''.join('<li><a href="#sit-%s"><span class="pk-sec-n">%d</span><span class="pk-sec-t">%s</span><span class="pe-toc-dots"></span>%s</a></li>' % (
        it['id'], nums[it['id']], esc(it['t']), S.pg('sit-' + it['id'])) for it in its)
    return ('<section class="pk-sec pk-c-%s" id="sec-%s">%s<p class="pk-sec-k">Section %d</p><h1 class="pk-sec-h">%s</h1><p class="pk-sec-b">%s</p>'
            '<p class="pk-sec-i">%s</p><ol class="pk-sec-l">%s</ol><div class="pk-sec-art" aria-hidden="true">%s</div></section>') % (
        c['id'], c['id'], S.mark('sec-' + c['id']), k, esc(c['name']), esc(c['blurb']), esc(SEC_INTRO.get(c['id'], '')), rows, puzzle_svg())


def puzzle_svg(color='currentColor', w=None):
    """two jigsaw pieces about to fit together, in line art"""
    st = 'fill="none" stroke="%s" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"' % color
    return ('<svg class="pk-puzzle" viewBox="0 0 60 34"%s xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">'
            '<path d="M4 6H28V13C32 12 36 14 36 17S32 22 28 21V28H4Z" %s/>'
            '<path d="M31 6H55V28H31V21C35 22 39 20 39 17S35 12 31 13Z" %s/></svg>') % ((' width="%s"' % w) if w else '', st, st)


def copyright_html(p, S):
    s = '<section class="ps-copy pe-only"><div class="ps-copy-in">'
    s += ('<p><em>%s: %s</em>. Part of the %s series.<br>By %s. Independently published.</p>') % (
        esc(p['title']), esc(p['sub']), esc(S.SERIES_TITLE), S.B.AUTHOR)
    s += '<p>Text and pictures © 2026 %s. First print edition, %s. Printed on demand.</p>' % (S.B.AUTHOR, S.B.UPDATED)
    s += ('<p><strong>Free online, always.</strong> Every situation in this guide, and more than seventy in all, is free at '
          'spreadloveandacceptance.com/the-logic-behind-it, with no account and no paid version. The print book is optional. You may copy pages of this guide '
          'for personal use and for non-commercial teaching, with credit to “%s, spreadloveandacceptance.com”.</p>') % esc(p['title'])
    s += ('<p><strong>Not therapy.</strong> This guide is general education about people and relationships. It is not a diagnosis, treatment or a '
          'replacement for help from a doctor, counsellor or other trained professional, and it can’t know your situation. No page labels anyone.</p>')
    s += ('<p><strong>The examples are made up.</strong> The situations in this guide are drawn from common patterns, and nobody in them is a real person; '
          'any likeness is coincidence. None of them is a testimonial.</p>')
    s += '<p>The research the pages lean on is listed in short at the back, and in full at spreadloveandacceptance.com/research.</p>'
    s += '<p>Set in Lora, Fraunces and IBM Plex Mono.</p></div></section>'
    return s


def title_html(p, S):
    return ('<section class="ps-title pe-only" style="--acc:%s">%s<div class="ps-title-top"><p class="ps-title-k">%s · %s</p>'
            '<p class="ps-title-t">%s</p><p class="ps-title-s">%s</p></div><div class="ps-title-art">%s</div>'
            '<div class="ps-title-by"><p class="ps-title-a">by %s</p><p class="ps-title-p">Independently published<br>spreadloveandacceptance.com</p></div></section>') % (
        p['color'], S.mark('titlep'), esc(S.SERIES_TITLE), esc(p['kicker']), esc(p['title']), esc(p['sub']), S.series_site.art(p['art']), S.B.AUTHOR)


def how_html(S):
    li = ''.join('<li><strong>%s.</strong> %s</li>' % (esc(t), esc(d)) for t, d in HOW)
    return ('<section class="pk-front pk-how" id="how">%s<h1>How to use this guide</h1><p class="pk-lede">Thirty-eight everyday reactions, one to a page. '
            'Each page walks through the same six parts, so after a few you’ll start to see the logic in reactions this guide never mentions.</p>'
            '<ul class="pk-how-l">%s</ul></section>') % (S.mark('how'), li)


def lens_parts(S):
    """[(key, title, html)] for the three pages on the lens"""
    out = []
    for key, title, paras in LENS:
        if key == 'lens-parts':
            body = '<p class="pk-lede">Take one reaction, yours or someone else’s, and walk through six parts.</p><ol class="pk-parts">%s</ol>' % ''.join(
                '<li><strong>%s.</strong> %s</li>' % (esc(t), esc(d)) for t, d in PARTS)
            body += '<p class="pk-small">The order matters. Seeing the logic first makes the other side easier to hear, and the small step comes last, once both sides are on the table.</p>'
        else:
            body = ''
            for x in paras:
                if x is None:
                    body += '<ul class="pk-tags">%s</ul>' % ''.join('<li><span class="pk-side pk-side-%s">%s</span> %s</li>' % (
                        k, esc(t), esc(d)) for k, (t, d) in zip(('nd', 'nt', 'all'), side_words()))
                elif isinstance(x, dict):
                    body += ('<aside class="side-note no-bubble no-cheer no-dive" data-no-bubble data-ref="%s" aria-label="Side note"><p><span class="sn-h">%s</span> %s</p>'
                             '<p class="sn-src"><a href="/research.html#ref-%s">%s</a> <span class="sn-ev">· %s</span></p></aside>') % (
                        x['sn'], esc(x['title']), esc(x['text']), x['sn'], esc(x['cite']), esc(x['ev']))
                else:
                    body += '<p>%s</p>' % esc(x)
        out.append((key, title, '<section class="pk-front pk-lens" id="%s">%s<p class="pk-front-k">The six-part lens</p><h1>%s</h1>%s</section>' % (
            key, S.mark(key), esc(title), body)))
    return out


def lens_html(S):
    return ''.join(h for _k, _t, h in lens_parts(S))


def build_html(p, S):
    s = ('<section class="pk-back pk-build" id="build">%s<h1>Build your own</h1><p class="pk-lede">For a reaction this guide doesn’t cover, your own or someone else’s. '
         'It works best on a calm day, and better still with the other person.</p><ol class="pk-parts">%s</ol>'
         '<p class="pk-small"><strong>Watch for verdict words.</strong> “Rude”, “lazy”, “selfish” and “dramatic” are guesses about a person. Swap them for what a camera '
         'would see, and the logic has room to show itself. If a step needs “because they’re like that”, keep asking why.</p>'
         '<p class="pk-small"><strong>Online, it makes a card.</strong> The website’s “Build your own” turns your six parts into a card you can save or share. '
         'Nothing you type is sent anywhere.</p></section>') % (S.mark('build'), ''.join('<li><strong>%s.</strong> %s</li>' % (esc(t), esc(d)) for t, d in BUILD_PROMPTS))
    for k in range(p.get('build_cards', 3)):
        rows = ''.join('<div class="pk-card-row"><p class="pk-card-k">%s</p><div class="pk-card-lines">%s</div></div>' % (
            esc(t), '<div></div>' * (4 if t == 'The logic' else 3)) for t, _d in BUILD_PROMPTS)
        s += ('<section class="pk-back pk-card"><p class="pk-card-top"><span>Build your own</span><span>Card %d</span></p>'
              '<p class="pk-card-name">The reaction <span class="pk-card-line"></span></p>%s</section>') % (k + 1, rows)
    return s


def find_html(secs, S, nums, epub=False):
    allits = [it for _c, its in secs for it in its]
    key = lambda it: re.sub(r'^[“"‘\']+', '', it['t']).lower()
    li = ''.join('<li><a href="#sit-%s"><span class="pk-find-t">%s</span>%s</a></li>' % (
        it['id'], esc(it['t']), '' if epub else '<span class="pe-toc-dots"></span>' + S.pg('sit-' + it['id'])) for it in sorted(allits, key=key))
    return ('<section class="pk-back pk-find" id="find">%s<h1>Find it fast</h1><p class="pk-lede">Every situation in this guide, A to Z.</p>'
            '<ol class="pk-find-l">%s</ol></section>') % (S.mark('find'), li)


def online_html(p, S, epub=False):
    q = '' if epub else S.qr(PAGE)
    s = ('<section class="pk-back pk-online-page" id="online">%s<h1>More, free online</h1>'
         '<div class="pk-online-big">%s<p><strong>The logic behind it</strong>Scan with your phone’s camera, or type the address.'
         '<span class="ps-addr">spreadloveandacceptance.com/the-logic-behind-it</span></p></div>') % ('' if epub else S.mark('online'), q)
    if epub:
        s = ('<section class="pk-back pk-online-page" id="online"><h1>More, free online</h1><p><a href="https://spreadloveandacceptance.com%s">'
             'spreadloveandacceptance.com/the-logic-behind-it</a></p>') % PAGE
    s += ('<ul class="pk-online-l"><li><strong>More than seventy situations.</strong> Every one in this guide, and many more, each with all six parts.</li>'
          '<li><strong>Find the logic.</strong> Type what happened in your own words, and it shows the closest situations.</li>'
          '<li><strong>Another picture.</strong> Most situations have two or three analogies; one of them may click where another doesn’t.</li>'
          '<li><strong>Build your own.</strong> Fill in the six parts and get a card to save or share.</li>'
          '<li><strong>The full guide.</strong> How the lens works, the research behind it, and when logic isn’t an excuse.</li></ul>'
          '<p class="pk-small">Everything is free, with no account. What you type stays on your own device.</p></section>')
    return s


def refs_index():
    import glob
    out = {}
    for f in sorted(glob.glob(os.path.join(ROOT, 'tools', 'research', 'refs-*.json'))):
        d = json.load(open(f, encoding='utf-8'))
        d = d if isinstance(d, list) else d.get('refs', [])
        for r in d:
            if r.get('verified') and r.get('id') not in out:
                out[r['id']] = r
    return out


def notes_html(secs, S, nums, epub=False):
    R = refs_index()
    used = {}
    for _c, its in secs:
        for it in its:
            for rid in it.get('refs', []):
                if rid in R:
                    used.setdefault(rid, []).append(it)
    # voice18: the two side notes on the lens pages
    for key, title, paras in LENS:
        for x in (paras or []):
            if isinstance(x, dict) and x.get('sn') in R:
                used.setdefault(x['sn'], []).append({'t': title, 'id': None, 'lens': key})
    rows = []
    for rid, its in sorted(used.items(), key=lambda kv: (R[kv[0]].get('authors', '').lower(), str(R[kv[0]].get('year', '')))):
        r = R[rid]
        t = (r.get('title') or '').strip()
        t = t if re.search(r'[.?!]$', t) else t + '.'
        where = ', '.join('%s%s' % (esc(it['t']), '' if epub else ' (%s)' % S.pg(it['lens'] if it.get('lens') else 'sit-' + it['id'])) for it in its)
        rows.append('<li><span class="pe-ref-a">%s (%s).</span> <span class="pe-ref-t">%s</span> <span class="pk-ref-w">%s</span></li>' % (
            esc(r.get('authors', '')), esc(str(r.get('year_label') or r.get('year') or 'n.d.')), esc(t), where))
    return ('<section class="pk-back pk-notes" id="notes">%s<h1>Research notes</h1><p class="pk-lede">The %d studies and essays these pages lean on, in short, with the '
            'situations that use them. Each one was looked up and checked. The full list, with what each study found and how strong the finding is, is free at '
            'spreadloveandacceptance.com/research.</p><ul class="pe-refs ps-refs pk-refs">%s</ul></section>') % ('' if epub else S.mark('notes'), len(rows), ''.join(rows))


def series_html(p, S):
    return S.series_page(p)


def jot_html(p, S):
    n = p.get('notes_pages', 2)
    if n <= 0:
        return ''
    s = ('<section class="pk-back pk-jot" id="jot">%s<h1>Your notes</h1><p class="pk-lede">Reactions you want to understand, words that worked, and steps to try.</p>'
         '<div class="pk-lines">%s</div></section>') % (S.mark('jot'), '<div></div>' * 17)
    s += ''.join('<section class="pk-back pk-jot pk-jot-more"><div class="pk-lines">%s</div></section>' % ('<div></div>' * 21) for _ in range(n - 1))
    return s


def page_rules(p, secs):
    q = lambda t: '"%s"' % t.replace('\\', '').replace('"', '\\"')
    head = 'font-family:"Lora",Georgia,serif;font-style:italic;font-size:7pt;color:#6E6556;vertical-align:top;padding-top:2.2mm;border-top:.4pt solid #CDBF98;white-space:nowrap;'
    num = 'content:counter(page);font-family:"Fraunces",Georgia,serif;font-weight:500;font-size:8pt;color:#2B2620;vertical-align:top;padding-top:2.2mm;border-top:.4pt solid #CDBF98;'
    edge = 'vertical-align:top;border-top:.4pt solid #CDBF98;'
    none = '{@bottom-left{content:none;border:0}@bottom-center{content:none;border:0}@bottom-right{content:none;border:0}}'

    def rules(nm, recto, verso):
        return ('@page %s:right{@bottom-left{content:%s;%s}@bottom-center{content:"";%s}@bottom-right{%stext-align:right}}'
                '@page %s:left{@bottom-left{%stext-align:left}@bottom-center{content:"";%s}@bottom-right{content:%s;%stext-align:right}}') % (
            nm, q(recto), head, edge, num, nm, num, edge, q(verso), head)
    r = [rules('pk-main', p['title'], p['title']).replace('@page pk-main:right', '@page :right').replace('@page pk-main:left', '@page :left')]
    r.append('@page pe-front%s@page pe-blank%s@page pe-full%s@page pk-blank%s' % (none, none, none, none))
    for c, _its in secs:
        r.append('.pk-c-%s{page:pk-%s}' % (c['id'], c['id']))
        r.append(rules('pk-' + c['id'], c['name'], p['title']))
    r.append('.pk-card{page:pk-cards}' + rules('pk-cards', 'Build your own', p['title']))
    return '<style media="print">%s</style>' % '\n'.join(r)


def build(S):
    """the print page for build_pdfs.js, and its cover; returns facts for the build log"""
    p = config()
    secs = sections(p)
    nums, k = {}, 0
    for _c, its in secs:
        for it in its:
            k += 1
            nums[it['id']] = k
    toc = [S.B.toc_row('how', '', 'How to use this guide', 'is-front')]
    for key, title, _x in LENS:
        toc.append(S.B.toc_row(key, '', esc(title), 'is-front'))
    body = []
    for i, (c, its) in enumerate(secs, 1):
        toc.append(S.B.toc_row('sec-' + c['id'], str(i), esc(c['name']), 'is-ch', '%d situations' % len(its)))
        body.append(sec_html(i, c, its, S, nums))
        body += [sit_html(it, nums[it['id']], S, p.get('include_fits', True)) for it in its]
    for key, title in (('build', 'Build your own'), ('find', 'Find it fast'), ('ideas', 'How the ideas connect'), ('online', 'More, free online'), ('notes', 'Research notes'), ('series', 'The series'),
                       ('jot', 'Your notes')):
        if key == 'jot' and p.get('notes_pages', 2) <= 0:
            continue
        toc.append(S.B.toc_row(key, '', esc(title), 'is-back'))
    front = title_html(p, S) + copyright_html(p, S)
    front += '<nav class="pe-toc ps-toc pk-toc pe-only" aria-label="Contents">%s<h1>Contents</h1><ol class="pe-toc-list">%s</ol></nav>' % (S.mark('contents'), ''.join(toc))
    front += how_html(S) + lens_html(S)
    back = build_html(p, S) + find_html(secs, S, nums) + S.ideas_map(p, [], pocket_sections=[(c['id'], c['name']) for c, _x in secs]) + online_html(p, S) + notes_html(secs, S, nums) + series_html(p, S) + jot_html(p, S)
    ol = [['Contents', 'contents', 0], ['How to use this guide', 'how', 0]] + [[t, k_, 0] for k_, t, _x in LENS]
    for c, its in secs:
        ol.append([c['name'], 'sec-' + c['id'], 0])
    ol += [['Build your own', 'build', 0], ['Find it fast', 'find', 0], ['How the ideas connect', 'ideas', 0], ['More, free online', 'online', 0], ['Research notes', 'notes', 0], ['The series', 'series', 0]]
    title = '%s: %s' % (p['title'], p['sub'])
    outline = '<script type="application/json" id="pe-outline">%s</script>' % json.dumps(
        {'outline': ol, 'title': title, 'author': S.B.AUTHOR, 'subject': p['line']}, ensure_ascii=False).replace('</', '<\\/')
    page = S.head(title, '/book/print/pocket.css').replace('<link rel="stylesheet" href="/book/print/pocket.css">',
                                                          '<link rel="stylesheet" href="%s">\n<link rel="stylesheet" href="/book/print/pocket.css">' % S.SERIES_CSS)
    page += ('<body class="whole-book pe-book pe-series pk-book" data-pe="%s" style="--pc:%s;--pt:%s;--acc:%s">\n<main class="read whole" id="main">\n%s\n%s\n%s\n</main>\n%s\n%s\n%s\n'
             '</body>\n</html>\n') % (p['id'], p['color'], p['tint'], p['color'], front, '\n'.join(body), back, page_rules(p, secs), outline, S.QR_SCRIPT)
    S.B.write(os.path.join(S.SRC, p['id'] + '.html'), page)
    item_cover = dict(p, n=0, blurb=p['blurb'])
    S.B.write(os.path.join(S.SRC, 'cover-%s.html' % p['id']), S.cover_html(item_cover, p['trim_in'], pocket=True))
    return {'situations': k, 'sections': len(secs), 'sides': dict((sd, sum(1 for _c, its in secs for it in its if it['side'] == sd)) for sd in ('nd', 'nt', 'all')),
            'rulebooks': sum(len(its) for c, its in secs if c['id'] == 'rulebooks')}


# ---------- the ebook ----------
def epub_docs(S, Doc, B):
    """(docs, nav groups) for build_epub.py: the same words, links instead of codes, no page numbers"""
    p = config()
    secs = sections(p)
    nums, k = {}, 0
    for _c, its in secs:
        for it in its:
            k += 1
            nums[it['id']] = k
    docs = []
    docs.append(Doc('cover.xhtml', 'Cover', '<section class="cv" epub:type="cover"><img class="cv-img" src="images/cover.jpg" alt="%s"/></section>' % esc(
        'Cover: %s, %s, by %s' % (p['title'], p['sub'], B.AUTHOR)), body_type='cover'))
    docs.append(Doc('title.xhtml', p['title'], (
        '<section class="ps-title" epub:type="titlepage"><p class="ps-title-k">%s · %s</p><h1 class="ps-title-t">%s</h1>'
        '<p class="ps-title-s">%s</p><p class="ps-title-art"><img src="images/art-%s.png" alt="Two smiling round friends fit two jigsaw pieces together, with a heart above them."/></p>'
        '<p class="ps-title-a">by %s</p><p class="ps-title-p"><a href="%s/">spreadloveandacceptance.com</a></p></section>') % (
        esc(S.SERIES_TITLE), esc(p['kicker']), esc(p['title']), esc(p['sub']), p['art'], B.AUTHOR, S.SITE)))
    cp = copyright_html(p, S)
    cp = cp.replace('First print edition, %s. Printed on demand.</p>' % B.UPDATED, 'First ebook edition, %s.</p>' % B.UPDATED)
    cp = cp.replace('The print book is optional.', 'The print book and ebook are optional.').replace('<p>Set in Lora, Fraunces and IBM Plex Mono.</p>', '')
    cp = cp.replace('<section class="ps-copy pe-only">', '<section class="ps-copy" epub:type="copyright-page"><h1 class="ps-copy-h">Copyright and notes</h1>', 1)
    docs.append(Doc('copyright.xhtml', 'Copyright and notes', cp))
    docs.append(None)  # nav.xhtml
    how = how_html(S).replace('Use the contents, the section pages or “Find it fast” at the back', 'Use the contents or “Find it fast” at the back')
    # voice18 (bookqa18 M9): an ebook has links, not codes
    how = how.replace('<strong>Scan for more.</strong> Each page has a code to the same situation on the website,', '<strong>Tap for more.</strong> Each page links to the same situation on the website,')
    how = how.replace('Each page has a code to the same situation on the website', 'Each page links to the same situation on the website')
    docs.append(Doc('how.xhtml', 'How to use this guide', how))
    for key, title, h in lens_parts(S):
        docs.append(Doc(key + '.xhtml', title, h))
    chapters = []
    for i, (c, its) in enumerate(secs, 1):
        h = '<section class="pk-sec" id="sec-%s"><p class="pk-sec-k">Section %d</p><h1 class="pk-sec-h">%s</h1><p class="pk-sec-b">%s</p><p class="pk-sec-i">%s</p></section>' % (
            c['id'], i, esc(c['name']), esc(c['blurb']), esc(SEC_INTRO.get(c['id'], '')))
        for it in its:
            h += sit_html(it, nums[it['id']], S, p.get('include_fits', True))
        fname = 'sec-%s.xhtml' % c['id']
        chapters.append(fname[:-6])
        docs.append(Doc(fname, '%d. %s' % (i, c['name']), h, heading_shift=0, body_type='bodymatter'))
    bh = build_html(dict(p, build_cards=0), S)
    docs.append(Doc('build.xhtml', 'Build your own', bh))
    docs.append(Doc('find.xhtml', 'Find it fast', find_html(secs, S, nums, epub=True)))
    docs.append(Doc('online.xhtml', 'More, free online', online_html(p, S, epub=True)))
    docs.append(Doc('ideas.xhtml', 'How the ideas connect', S.ideas_map(p, [], epub=True, pocket_sections=[(c['id'], c['name']) for c, _x in secs])))
    docs.append(Doc('notes.xhtml', 'Research notes', notes_html(secs, S, nums, epub=True).replace('<section class="pk-back pk-notes"', '<section epub:type="bibliography" class="pk-back pk-notes"', 1)))
    return p, docs, chapters
