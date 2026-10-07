#!/usr/bin/env python3
"""Mark the site's own framing on the library pages, add a legend, and fold the repeated
pillar boilerplate into one explanation per page. Run once from the repo root."""
import re, sys, os

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
LIB = os.path.join(ROOT, 'library')
LABEL = '<span class="lib-own-k">This site’s idea</span>'
CSS_LINK = '<link rel="stylesheet" href="/assets/css/library-marks.css">'
LEGEND = ('<p class="lib-legend"><strong>How to read this page:</strong> entries summarize published research and name '
          'their sources. Notes marked ' + LABEL + ' are our own way of putting it into practice, not established science.</p>')

SHORT = {'see-the-load': 'See the load', 'fix-the-setup': 'Fix the setup', 'read-your-state': 'Read your state', 'tune-signals': 'Tune the signal', 'quiet-incentives': 'Quiet incentives'}
ROMAN = {'see-the-load': 1, 'fix-the-setup': 2, 'read-your-state': 3, 'tune-signals': 4, 'quiet-incentives': 5}

# (file, exact old paragraph text, kept plain text or None, own text)
# kept None -> whole paragraph becomes the site's idea.
INLINE = [
    ('emotions.html', 'The program’s tools act at different points:', None, None),
    ('emotions.html', 'This is part of why check-ins start with naming feelings', None, None),
    ('fairness.html', 'The program’s approach tries to respect both truths', None, None),
    ('fairness.html', 'This maps neatly onto the program’s idea of ownership', None, None),
    ('fairness.html', 'The program calls this unbilled work.', None, None),
    ('fairness.html', 'This is why the program focuses less on hours', None, None),
    ('fairness.html', 'The program’s approach to ownership helps here', None, None),
    ('fairness.html', 'Changing it takes deliberate steps', 'SPLIT:The program’s ownership worksheet', None),
    ('life.html', 'The program’s ideas about ownership apply well here.', 'DROPFIRST', 'This is where the program’s ideas about ownership come in.'),
    ('motivation.html', 'For households, this suggests timing', 'SPLIT:The program’s monthly look-back', None),
    ('stress.html', 'This helps explain why battery levels matter so much.',
     'The same request (“could you call the plumber?”) can be an easy yes when resources are full and a heavy burden when they are depleted.',
     'This is why the program asks how full your battery is before a hard talk.'),
    ('stress.html', 'This is one reason the program pays attention to recurring patterns', None, None),
    ('stress.html', 'Many people find this language helpful.', 'SPLIT:The program uses a simple three-rung ladder', None),
    ('teams.html', 'RACI is a project-management tool', 'SPLIT:The program uses a simplified version', None),
    ('teams.html', 'The program’s version keeps it simple', None, None),
    ('teams.html', 'This supports the program’s approach of making contributions visible', None, None),
    ('teams.html', 'A retrospective is a regular meeting', 'SPLIT:The program’s weekly and monthly look-backs', None),
    ('teams.html', 'The program’s monthly look-back uses this spirit', None, None),
    ('teams.html', 'The lesson for households is important.', None, None),
    ('teams.html', 'This is why the program stresses that its scores', None, None),
    ('thinking.html', 'Useful questions: What is the most likely outcome', 'SPLIT:Looking at a month of records', None),
    ('thinking.html', 'The program’s habit of looking at systems', None, None),
    ('thinking.html', 'In a household disagreement, both people can feel', 'SPLIT:The program’s idea of seven angles', None),
    ('thinking.html', 'It is another reason to close check-ins on a kind note', None, None),
    ('thinking.html', 'Writing down the full steps of a job when handing it over', None, None),
    ('thinking.html', 'It helps to lower the stakes.', 'SPLIT:The program frames problems', None),
    ('wiring.html', 'The program’s battery meter works in a similar spirit', None, None),
    ('communication.html', 'Closing the loop, confirming what was agreed', 'SPLIT:It is also what the program’s',
     'Closing the loop is also what the program’s one-owner-per-job worksheet does at home.'),
    ('conflict.html', 'Conflict can even be useful.', 'SPLIT:which is one reason the program encourages',
     'That is one reason the program encourages writing things down early rather than waiting for an explosion.'),
    ('conflict.html', 'Objective criteria are standards both people can accept', 'SPLIT:In the program, writing down', None),
    ('conflict.html', 'It helps to know your own early warning signs', 'SPLIT:Writing these down while calm', None),
    ('conflict.html', 'This fits the spirit of the program', None, None),
    ('conflict.html', 'Talking openly about these backgrounds', 'SPLIT:It also fits the program’s idea of a family script',
     'This fits the program’s idea of a family script: patterns we inherited and can choose to keep or change.'),
    ('conflict.html', 'Timing preferences also differ', 'SPLIT:The program’s idea of rhythms', None),
    ('conflict.html', 'Many of the program’s tools came from workplace practice', None, None),
    ('connection.html', 'This supports the program’s emphasis on seeing unseen work', None, None),
]


def own_p(text):
    return '<p class="lib-own">' + LABEL + ' ' + text + '</p>'


def do_inline(fn, s):
    n = 0
    for f, start, kept, own in INLINE:
        if f != fn:
            continue
        pat = re.compile(r'<p>(' + re.escape(start) + r'[^\n]*?)</p>')
        ms = pat.findall(s)
        assert len(ms) == 1, (fn, start, len(ms))
        old = ms[0]
        if kept is None:
            new = own_p(old)
        elif kept == 'DROPFIRST':
            rest = old[len(start):].strip()
            new = '<p>' + rest + '</p>\n' + own_p(own)
        elif kept.startswith('SPLIT:'):
            at = kept[6:]
            i = old.index(at)
            before = old[:i].rstrip()
            after = old[i:]
            if before.endswith(','):  # "..., which is one reason" -> end the sentence
                before = before[:-1] + '.'
            new = '<p>' + before + '</p>\n' + own_p(own or after)
        else:
            new = '<p>' + kept + '</p>\n' + own_p(own)
        s = s.replace('<p>' + old + '</p>', new, 1)
        n += 1
    return s, n


ENTRY_RE = re.compile(
    r'<h3>How it connects to the program</h3>\n'
    r'<p class="lib-pillars">Where it sits in the <a href="/five-pillars.html">Five Pillars</a>: (.*?)</p>\n'
    r'<ul class="lib-pillar-list">\n((?:<li>.*?</li>\n)+)</ul>\n'
    r'(<p>Where to use it in the program:</p>\n<ul>\n(?:<li>.*?</li>\n)+</ul>\n)'
    r'(?=<h3>To talk about</h3>)')


def borrowed(li):
    # "(signal theory, the Frequency Framework)" -> "(borrowed from signal theory)"
    def rep(m):
        field = m.group(1).split(',')[0].strip()
        return '<small>(borrowed from ' + field + ')</small>'
    return re.sub(r'<small>\(([^)]*)\)</small>', rep, li)


def do_entries(s):
    items = {}

    def rep(m):
        links, lis, where = m.group(1), m.group(2), m.group(3)
        n0 = len(re.findall(r'<a ', links))
        links = re.sub(r'<a href="/five-pillars.html#([a-z-]+)">Pillar ([IV]+), [^<]*</a>',
                       lambda k: '<a href="/five-pillars.html#%s">%s, %s</a>' % (k.group(1), k.group(2), SHORT[k.group(1)]), links)
        assert 'Pillar' not in links and n0 == len(re.findall(r'<a ', links)), links
        for li in re.findall(r'<li>.*?</li>', lis):
            name = re.search(r'<strong>(.*?)</strong>', li).group(1)
            items.setdefault(name, li)
        return ('<div class="lib-own">\n<p class="lib-own-k">This site’s idea</p>\n'
                '<h3>How it connects to the program</h3>\n'
                '<p class="lib-pillars">In this site’s <a href="#pillars">Five Pillars</a>: ' + links + '</p>\n'
                + where + '</div>\n')
    s, n = ENTRY_RE.subn(rep, s)
    return s, n, items


PILLAR_NAMES = ['See the whole load', 'Fix the setup, not the person', 'Read your state first',
                'Tune how you send and receive', 'Notice the quiet incentives']


def do_note(s, items):
    old = '<section class="lib-pillar-note" id="pillars">'
    assert s.count(old) == 1
    s = s.replace(old, '<section class="lib-pillar-note lib-own" id="pillars">\n<p class="lib-own-k">This site’s idea</p>\n', 1)
    sent = ' Each entry says which pillar it belongs to and how it works in you and between you and others.'
    assert s.count(sent) == 1
    s = s.replace(sent, '', 1)
    ordered = []
    for i, n in enumerate(PILLAR_NAMES):
        if n in items:
            li = borrowed(items[n]).replace('<strong>' + n + '</strong>', '<strong>' + 'I II III IV V'.split()[i] + '. ' + n + '</strong>', 1)
            ordered.append(li)
    m = re.search(r'(<section class="lib-pillar-note lib-own" id="pillars">.*?)(</section>)', s, re.S)
    block = (m.group(1) + '\n<p>The Five Pillars are this site’s own way of grouping these ideas, not a research finding. '
             'Each one borrows its name from a field. Here is what the pillars on this page mean, in you and between you and others:</p>'
             '\n<ul class="lib-pillar-list">\n' + '\n'.join(ordered) + '\n</ul>\n' + m.group(2))
    s = s[:m.start()] + block + s[m.end():]
    return s


def add_common(s, legend=LEGEND):
    anchor = '<link rel="stylesheet" href="/assets/css/reading.css">'
    assert s.count(anchor) == 1 and CSS_LINK not in s
    s = s.replace(anchor, anchor + '\n' + CSS_LINK, 1)
    lede = re.search(r'<p class="simple-lede">.*?</p>\n', s, re.S)
    assert lede
    s = s[:lede.end()] + legend + '\n' + s[lede.end():]
    return s


def main():
    report = []
    for fn in sorted(os.listdir(LIB)):
        if not fn.endswith('.html'):
            continue
        path = os.path.join(LIB, fn)
        s = open(path, encoding='utf-8').read()
        before = len(s)
        s, ni = do_inline(fn, s)
        s, ne, items = do_entries(s)
        assert ne == s.count('<article class="lib-entry"'), (fn, ne)
        s = do_note(s, items)
        s = add_common(s)
        open(path, 'w', encoding='utf-8').write(s)
        report.append('%s: %d -> %d chars, %d entries, %d inline notes' % (fn, before, len(s), ne, ni))
    used = {(f, st) for f, st, _, _ in INLINE}
    print('\n'.join(report))


if __name__ == '__main__':
    main()
