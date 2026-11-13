#!/usr/bin/env python3
"""gtm.py: puts the owner's Google Tag Manager tag at the top of <head> on every published page, except the private
pages listed in private-pages.json (the privacy policy promises analytics stays off those), redirect stubs, and pages
that only ever load inside another page. Safe to run again: the tag sits between <!-- gtm:start --> and <!-- gtm:end -->
and is replaced, not added twice; a private page that somehow got the tag has it taken out.
Run after any builder that rewrites pages (build_seo.py runs it at the end). tools/checks/site-health.js (group gtm)
fails if a page is missing it or a private page has it.
   python3 tools/analytics/gtm.py          write
   python3 tools/analytics/gtm.py --check  report only, exit 1 on a problem"""
import json, os, re, subprocess, sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
ID = 'GTM-N7K8M6ZL'
# Google's standard container snippet. Its gtm.js push is the "page loaded" event that every All Pages trigger in the
# container waits for; loading gtm.js on its own, without that push, leaves those tags silent.
TAG = ('<!-- gtm:start -->\n'
       "<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});"
       "var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;"
       "j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);"
       "})(window,document,'script','dataLayer','" + ID + "');</script>\n"
       '<!-- gtm:end -->\n')
BLOCK = re.compile(r'<!-- gtm:start -->.*?<!-- gtm:end -->\n?', re.S)
# not pages people visit: print sources for the PDFs, internal tooling, drafts, and the Quicksilver desktop app's own
# window (its CSP allows no network at all)
NOT_PAGES = re.compile(r'^(tools/[^/]+/|_manuscripts/|node_modules/|book/(print|kids|adult)/src/|quicksilver/)')


def private():
    d = json.load(open(os.path.join(os.path.dirname(__file__), 'private-pages.json'), encoding='utf-8'))
    return set(d['pages']), [re.compile(p) for p in d.get('patterns', [])], set(d.get('embedded', []))


def pages():
    out = subprocess.run(['git', 'ls-files', '*.html'], cwd=ROOT, capture_output=True, text=True).stdout.split()
    return sorted(f for f in out if not NOT_PAGES.match(f) and os.path.isfile(os.path.join(ROOT, f)))


def wanted(f, src, priv, pats, emb):
    if f in priv or f in emb or any(p.search(f) for p in pats):
        return False
    return not re.search(r'<meta[^>]+http-equiv=["\']refresh', src[:4000], re.I)


def main():
    check = '--check' in sys.argv
    priv, pats, emb = private()
    missing, leaked, changed = [], [], 0
    for f in pages():
        p = os.path.join(ROOT, f)
        src = open(p, encoding='utf-8').read()
        want = wanted(f, src, priv, pats, emb)
        has = TAG in src
        if want == has and (not want or len(BLOCK.findall(src)) == 1):
            continue
        if check:
            (missing if want else leaked).append(f)
            continue
        new = BLOCK.sub('', src)
        if want:
            m = re.search(r'<head[^>]*>\n?', new, re.I)
            if not m:
                missing.append(f + ' (no <head>)')
                continue
            new = new[:m.end()] + TAG + new[m.end():]
        if new != src:
            open(p, 'w', encoding='utf-8').write(new)
            changed += 1
    for f in missing:
        print('MISSING tag: ' + f)
    for f in leaked:
        print('PRIVATE page has the tag: ' + f)
    if check:
        print('gtm: %d missing, %d private pages with it' % (len(missing), len(leaked)))
    else:
        print('gtm: %d page(s) updated' % changed)
    sys.exit(1 if (missing or leaked) else 0)


if __name__ == '__main__':
    main()
