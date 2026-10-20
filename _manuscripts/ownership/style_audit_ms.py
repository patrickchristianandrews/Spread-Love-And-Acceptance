#!/usr/bin/env python3
"""style_audit_ms.py: run the series' style audit (tools/book/style_audit.py) on this Markdown manuscript.

The four books are audited from HTML; this manuscript is Markdown. This script turns each chapter file into simple
HTML the audit's parser understands (headings, paragraphs, lists, and blockquote boxes as <aside>), then calls the same
block_metrics / prose_counts / text_metrics functions, so the numbers are comparable with the books' "src" view.
It also lists, per chapter, the exact sentences behind the tells (not-but frames, triads, stock phrases, moral
endings) and checks the house rules (no dashes, no label words, British spellings, no AI mentions).

Usage (from the repo root):
  python3 _manuscripts/ownership/style_audit_ms.py              Markdown summary on stdout
  python3 _manuscripts/ownership/style_audit_ms.py --json f     also save the JSON
  python3 _manuscripts/ownership/style_audit_ms.py --flags      also print the flagged sentences
It reads tools/book/style_audit.py and never changes it.
"""
import glob
import html
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
sys.path.insert(0, os.path.join(ROOT, 'tools', 'book'))
_argv = sys.argv
sys.argv = [sys.argv[0]]
import style_audit as sa  # noqa: E402
sys.argv = _argv


def inline(t):
    t = html.escape(t, quote=False)
    t = re.sub(r'\*\*(.+?)\*\*', r'<strong>\1</strong>', t)
    t = re.sub(r'\*(.+?)\*', r'<em>\1</em>', t)
    return t


def md_to_html(md):
    out, para, in_list, in_box = [], [], False, False

    def flush_para():
        nonlocal para
        if para:
            out.append('<p>' + inline(' '.join(para)) + '</p>')
            para = []

    def close_list():
        nonlocal in_list
        if in_list:
            out.append('</ul>')
            in_list = False

    for raw in md.split('\n'):
        line = raw.rstrip()
        box_line = line.startswith('>')
        if box_line and not in_box:
            flush_para(); close_list()
            out.append('<aside class="note">')
            in_box = True
        if not box_line and in_box and line.strip() == '':
            flush_para(); close_list()
            out.append('</aside>')
            in_box = False
            continue
        if box_line:
            line = line[1:].lstrip()
        if not line.strip():
            flush_para(); close_list()
            continue
        if line.strip() == '---':
            flush_para(); close_list()
            continue
        m = re.match(r'^(#{1,4})\s+(.*)$', line)
        if m:
            flush_para(); close_list()
            n = len(m.group(1))
            out.append('<h%d>%s</h%d>' % (n, inline(m.group(2)), n))
            continue
        if line.startswith('|'):
            flush_para(); close_list()
            if re.match(r'^\|[-| :]+\|$', line):
                continue
            cells = [c.strip() for c in line.strip('|').split('|')]
            out.append('<p>' + inline(' ; '.join(c for c in cells if c)) + '</p>')
            continue
        m = re.match(r'^(?:[-*]|\d+\.)\s+(.*)$', line)
        if m:
            flush_para()
            if not in_list:
                out.append('<ul>')
                in_list = True
            out.append('<li>' + inline(m.group(1)) + '</li>')
            continue
        if re.match(r'^\*\*[^*]+:\*\*', line) and para:
            flush_para()
        para.append(line.strip())
    flush_para(); close_list()
    if in_box:
        out.append('</aside>')
    return '\n'.join(out)


LABELS = re.compile(r'\b(narcissis\w*|toxic|gaslight\w*|abuser|abusive|manipulat\w*|red flag|psychopath\w*|sociopath\w*)\b', re.I)
AMERICAN = re.compile(r'\b(behavior|color|favorite|apologize[ds]?|apologizing|realize[ds]?|realizing|recognize[ds]?|recognizing|center|honor|neighbor|organize[ds]?|program(?!me))\b')
AI = re.compile(r'\b(AI|artificial intelligence|ChatGPT|language model|LLM)\b')
SAFETY = re.compile(r'hotline|helpline|crisis line|Samaritans|\b988\b|116 123|Not safe at home|refuge', re.I)
DASHES = re.compile(r'—|–| - ')


def flags(md, h):
    p = sa.parse(h)
    res = {'notbut': [], 'triads': [], 'stock': [], 'moral_end': [], 'labels': [], 'american': [], 'ai': [], 'safety': [],
           'dashes': []}
    for b in p.blocks:
        if b['kind'] == 'h':
            continue
        for sent in sa.sentences(b['text']):
            if any(r.search(sent) for r in sa.NOTBUT):
                res['notbut'].append(sent)
            for t in sa.triads(sent):
                res['triads'].append(t + '  <<  ' + sent[:140])
            for name, r in sa.STOCK.items():
                if r.search(sent):
                    res['stock'].append(name + ': ' + sent)
    paras = [b for b in p.blocks if b['kind'] == 'p' and len(sa.sentences(b['text'])) >= 2]
    res['moral_end'] = [sa.sentences(b['text'])[-1] for b in paras if sa.is_moral(sa.sentences(b['text'])[-1])]
    for rx, k in ((LABELS, 'labels'), (AMERICAN, 'american'), (AI, 'ai'), (SAFETY, 'safety'), (DASHES, 'dashes')):
        for m in rx.finditer(md):
            s = max(0, m.start() - 50)
            res[k].append(md[s:m.end() + 30].replace('\n', ' '))
    return res


def main():
    files = sorted(glob.glob(os.path.join(HERE, '[0-9][0-9]-*.md')))
    per, allb, alll, total_md = {}, [], [], ''
    chapter_flags = {}
    for f in files:
        k = os.path.basename(f)[:-3]
        md = open(f, encoding='utf-8').read()
        total_md += md + '\n'
        h = md_to_html(md)
        p = sa.parse(h)
        m = sa.block_metrics(p.blocks, p.lists)
        m.update(sa.prose_counts(h))
        m['words_md'] = len(re.findall(r"[A-Za-z0-9][A-Za-z0-9’'\-]*", re.sub(r'[#>*|]', ' ', md)))
        per[k] = m
        allb += [dict(b, sec=(k, b['sec']) if b['sec'] else 0) for b in p.blocks]
        alll += p.lists
        chapter_flags[k] = flags(md, h)
    tot = sa.block_metrics(allb, alll)
    for kk in ('prose_words', 'prose_triads', 'prose_notbut'):
        tot[kk] = sum(v.get(kk, 0) for v in per.values())
    tot['prose_triads_per_1k'] = round(tot['prose_triads'] * 1000.0 / max(tot['prose_words'], 1), 2)
    tot['prose_notbut_per_1k'] = round(tot['prose_notbut'] * 1000.0 / max(tot['prose_words'], 1), 2)
    tot['skeleton_same_pct_mean'] = round(sum(v['skeleton_same_pct'] for v in per.values()) / max(len(per), 1), 1)
    tot['words_md'] = sum(v['words_md'] for v in per.values())
    res = {'book': tot, 'chapters': per, 'flags': chapter_flags}
    if '--json' in sys.argv:
        json.dump(res, open(sys.argv[sys.argv.index('--json') + 1], 'w', encoding='utf-8'), indent=1, ensure_ascii=False)
    keys = [k for k, _l in sa.KEYS if k != 'bullets_per_page']
    print('| Measure | whole book | ' + ' | '.join(per) + ' |')
    print('|---|---|' + '---|' * len(per))
    for k, lab in sa.KEYS:
        if k == 'bullets_per_page':
            continue
        print('| %s | %s | %s |' % (lab, tot.get(k, ''), ' | '.join(str(per[c].get(k, '')) for c in per)))
    print('| Words (all text in the .md) | %s | %s |' % (tot['words_md'], ' | '.join(str(per[c]['words_md']) for c in per)))
    print()
    print('House-rule checks (counts across the book): ' + ', '.join(
        '%s %d' % (k, sum(len(chapter_flags[c][k]) for c in per)) for k in ('labels', 'american', 'ai', 'safety', 'dashes')))
    if '--flags' in sys.argv:
        for c in per:
            print('\n## ' + c)
            for k, v in chapter_flags[c].items():
                if v:
                    print('  [%s] %d' % (k, len(v)))
                    for x in v:
                        print('     - ' + x[:220])


if __name__ == '__main__':
    main()
