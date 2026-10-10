#!/usr/bin/env python3
"""Check that only verified research is ever published as a link.

Reads tools/research/refs-*.json and checks:
  1. research.html has one entry for every verified reference (or an alias of one), and no entry for an
     unverified one; every "Read more" link is the verified reference's own url.
  2. assets/js/research-index.js (what research-links.js uses on other pages) holds only verified ids and urls,
     and every page#section it names exists.
  3. No page on the site links to the url or doi of a reference that is still unverified (unless the same url
     also belongs to a verified reference).
  4. Every "Where this shows up" link on research.html points to a page (and section) that exists.

Exits with 1 and lists the problems if any check fails.  Run:  python3 tools/research/check_research.py
"""
import glob
import json
import os
import re
import sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))


def load_refs():
    refs = []
    for p in sorted(glob.glob(os.path.join(ROOT, 'tools', 'research', 'refs-*.json'))):
        with open(p, encoding='utf-8') as f:
            refs += json.load(f)
    return refs


def norm_url(u):
    return re.sub(r'/+$', '', re.sub(r'^https?://(www\.)?', '', (u or '').strip())).lower()


def main():
    refs = load_refs()
    ver = [r for r in refs if r.get('verified')]
    unver = [r for r in refs if not r.get('verified')]
    ver_ids = {r['id'] for r in ver}
    ver_urls = {norm_url(r.get('url')) for r in ver} | {norm_url('https://doi.org/' + r['doi']) for r in ver if r.get('doi')}
    unver_ids = {r['id'] for r in unver} - ver_ids
    probs = []

    # 1. research.html
    page = open(os.path.join(ROOT, 'research.html'), encoding='utf-8').read()
    entries = re.findall(r'<article class="rs-entry[^"]*" id="ref-([^"]+)"(.*?)</article>', page, re.S)
    aliases = set(re.findall(r'<span class="rs-alias" id="ref-([^"]+)"', page))
    shown = {e[0] for e in entries} | aliases
    for rid, body in entries:
        if rid in unver_ids or rid not in ver_ids and rid not in aliases:
            # renamed ids (same id, different work) are checked through their url below
            pass
        more = re.search(r'<p class="rs-more"><a href="([^"]+)"', body)
        if not more:
            probs.append('research.html: ref-%s has no Read more link' % rid)
            continue
        if norm_url(more.group(1).replace('&amp;', '&')) not in ver_urls:
            probs.append('research.html: ref-%s links to a url that is not a verified reference: %s' % (rid, more.group(1)))
        for ext in re.findall(r'href="(https?://[^"]+)"', body):
            if norm_url(ext.replace('&amp;', '&')) not in ver_urls:
                probs.append('research.html: ref-%s has an external link that is not verified: %s' % (rid, ext))
    for rid in unver_ids:
        if rid in shown:
            probs.append('research.html: unverified reference %s is published' % rid)
    missing = [r['id'] for r in ver if r['id'] not in shown]
    # a verified id can be published under another id when two lists used the same id for different works
    really_missing = []
    for rid in missing:
        u = norm_url(next(r['url'] for r in ver if r['id'] == rid))
        if not any(norm_url(re.sub('&amp;', '&', m)) == u for m in re.findall(r'<p class="rs-more"><a href="([^"]+)"', page)):
            really_missing.append(rid)
    for rid in really_missing:
        probs.append('research.html: verified reference %s is missing' % rid)

    # 2. research-index.js
    js = open(os.path.join(ROOT, 'assets', 'js', 'research-index.js'), encoding='utf-8').read()
    idx = json.loads(js[js.index('= ') + 2:js.rindex(';')])
    for rid, r in idx['refs'].items():
        if rid not in shown:
            probs.append('research-index.js: %s has no entry on research.html' % rid)
        if norm_url(r['u']) not in ver_urls:
            probs.append('research-index.js: %s has an unverified url %s' % (rid, r['u']))
    for m in idx['m']:
        for rid in m[2]:
            if rid not in idx['refs']:
                probs.append('research-index.js: matcher %s %s names unknown id %s' % (m[0], m[1], rid))
    for key, ids in idx['p'].items():
        for rid in ids:
            if rid not in idx['refs']:
                probs.append('research-index.js: %s names unknown id %s' % (key, rid))

    # 3. no site page links to an unverified reference
    bad_urls = {}
    for r in unver:
        for u in [r.get('url'), 'https://doi.org/' + r['doi'] if r.get('doi') else None]:
            if u and norm_url(u) not in ver_urls:
                bad_urls[norm_url(u)] = r['id']
    pages = [p for p in glob.glob(os.path.join(ROOT, '**', '*.html'), recursive=True) if '/node_modules/' not in p]
    pages += [os.path.join(ROOT, 'assets', 'js', f) for f in ('research-index.js', 'research-links.js', 'chat-kb.js', 'search-index.js')]
    linked_pages = 0
    for p in pages:
        if not os.path.isfile(p):
            continue
        s = open(p, encoding='utf-8', errors='replace').read()
        if 'research.html#ref-' in s or '/research.html' in s:
            linked_pages += 1
        for h in re.findall(r'(?:href=|"u":)"(https?://[^"]+)"', s):
            if norm_url(h.replace('&amp;', '&')) in bad_urls:
                probs.append('%s links to unverified %s: %s' % (os.path.relpath(p, ROOT), bad_urls[norm_url(h)], h))
        for rid in re.findall(r'research\.html#ref-([A-Za-z0-9_-]+)', s):
            if rid not in shown:
                probs.append('%s links to research.html#ref-%s, which is not on the page' % (os.path.relpath(p, ROOT), rid))

    # 4. "Where this shows up" links
    cache = {}
    for href in set(re.findall(r'<p class="rs-where">.*?</p>', page, re.S)):
        for link in re.findall(r'href="(/[^"]+)"', href):
            path, _, anchor = link.partition('#')
            fp = os.path.join(ROOT, path.lstrip('/'))
            if fp not in cache:
                cache[fp] = open(fp, encoding='utf-8').read() if os.path.isfile(fp) else None
            if cache[fp] is None:
                probs.append('research.html: "where" link to missing page %s' % link)
            elif anchor and not re.search(r'\bid="%s"' % re.escape(anchor), cache[fp]):
                probs.append('research.html: "where" link to missing section %s' % link)

    print('references: %d verified, %d unverified (%d unverified ids not also verified)' % (len(ver), len(unver), len(unver_ids)))
    print('research.html: %d entries (+%d aliases); research-index.js: %d refs, %d matchers, %d page sections'
          % (len(entries), len(aliases), len(idx['refs']), len(idx['m']), len(idx['p'])))
    print('files that link to research.html: %d' % linked_pages)
    if probs:
        print('PROBLEMS (%d):' % len(probs))
        for p in probs:
            print('  ' + p)
        sys.exit(1)
    print('OK: no unverified reference is published as a link')


if __name__ == '__main__':
    main()
