#!/usr/bin/env python3
"""Re-check every article in the Further Reading list (assets/js/reading-list.js).

For each item it fetches the URL, follows redirects, and reports:
  OK        HTTP 200 and the page title matches the title in the list
  RETITLED  HTTP 200 but the page title looks different (worth a look; the article may have moved)
  HOME      redirected to a home, section or search page instead of the article (treat as broken)
  BROKEN    404, 410, other 4xx/5xx, or the connection failed
  BLOCKED   the site refused an automated check (401/403/429); open it in a browser to confirm

Usage (from the repo root):
  python3 tools/reading/check_links.py                 # check everything
  python3 tools/reading/check_links.py --source pt     # just one source key (pt, gg, gottman, ...)
  python3 tools/reading/check_links.py --json out.json # also save the full results
  python3 tools/reading/check_links.py --workers 4 --timeout 20

Exit status is 1 when anything is BROKEN or HOME, so it can run in CI. Standard library only.
"""
import argparse
import concurrent.futures as cf
import html
import json
import os
import re
import sys
import urllib.error
import urllib.parse
import urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
LIST = os.path.normpath(os.path.join(HERE, '..', '..', 'assets', 'js', 'reading-list.js'))
UA = ('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) '
      'Chrome/124.0 Safari/537.36 (The Objective Ledger reading-list link check)')
STOP = set('a an and the of to in for on with your you is are it its how what why when do does be at by or as from that this'.split())


def load_items(path):
    """Read the items out of reading-list.js (one JSON object per line inside `items: [ ... ]`)."""
    src = open(path, encoding='utf-8').read()
    m = re.search(r'items:\s*\[(.*)\]\s*\}\s*;?\s*$', src, re.S)
    if not m:
        sys.exit('Could not find the items list in ' + path)
    body = m.group(1).strip().rstrip(',')
    return json.loads('[' + body + ']')


def words(t):
    t = html.unescape(t or '').lower().replace('’', "'").replace('—', ' ').replace('–', ' ')
    t = re.sub(r"[^a-z0-9' ]+", ' ', t)
    return [w.strip("'") for w in t.split() if w.strip("'") and w.strip("'") not in STOP]


def title_matches(expected, found):
    if not found:
        return False
    e, f = words(expected), set(words(found))
    if not e:
        return True
    hit = sum(1 for w in e if w in f)
    return hit / len(e) >= 0.6


def page_title(doc):
    for pat in (r'<meta[^>]+property=["\']og:title["\'][^>]*content=["\']([^"\']+)',
                r'<meta[^>]+content=["\']([^"\']+)["\'][^>]*property=["\']og:title',
                r'<title[^>]*>(.*?)</title>',
                r'<h1[^>]*>(.*?)</h1>'):
        m = re.search(pat, doc, re.S | re.I)
        if m:
            return re.sub(r'<[^>]+>', '', html.unescape(m.group(1))).strip()
    return ''


def looks_like_home(orig, final):
    """A redirect that lands somewhere with no article slug left, e.g. a home or section page."""
    a, b = urllib.parse.urlparse(orig), urllib.parse.urlparse(final)
    if a.netloc.replace('www.', '') != b.netloc.replace('www.', '') and b.path in ('', '/'):
        return True
    pa, pb = a.path.rstrip('/'), b.path.rstrip('/')
    if pa == pb:
        return False
    slug = pa.rsplit('/', 1)[-1]
    return bool(slug) and slug not in pb and len(pb) < len(pa) / 2


def check(item, timeout):
    url = item['url']
    req = urllib.request.Request(url, headers={'User-Agent': UA, 'Accept': 'text/html,application/xhtml+xml',
                                               'Accept-Language': 'en-US,en;q=0.8'})
    res = {'id': item['id'], 'source': item['source'], 'title': item['title'], 'url': url}
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            res['status'] = r.status
            res['final_url'] = r.geturl()
            doc = r.read(400000).decode(r.headers.get_content_charset() or 'utf-8', 'replace')
    except urllib.error.HTTPError as e:
        res['status'] = e.code
        res['final_url'] = e.geturl() if hasattr(e, 'geturl') else url
        res['result'] = 'BLOCKED' if e.code in (401, 403, 429) else 'BROKEN'
        return res
    except Exception as e:  # DNS, TLS, timeout, reset
        res['status'] = 0
        res['error'] = str(e)[:200]
        res['result'] = 'BROKEN'
        return res
    res['page_title'] = page_title(doc)
    if looks_like_home(url, res['final_url']):
        res['result'] = 'HOME'
    elif res['status'] != 200:
        res['result'] = 'BROKEN'
    elif title_matches(item['title'], res['page_title']):
        res['result'] = 'OK'
    else:
        res['result'] = 'RETITLED'
    return res


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--list', default=LIST, help='path to reading-list.js')
    ap.add_argument('--source', help='only check items from this source key')
    ap.add_argument('--workers', type=int, default=6)
    ap.add_argument('--timeout', type=float, default=25)
    ap.add_argument('--json', help='write every result to this JSON file')
    args = ap.parse_args()

    items = load_items(args.list)
    if args.source:
        items = [i for i in items if i['source'] == args.source]
    print('Checking %d links from %s ...' % (len(items), os.path.relpath(args.list)))

    results = []
    with cf.ThreadPoolExecutor(max_workers=max(1, args.workers)) as ex:
        futs = {ex.submit(check, it, args.timeout): it for it in items}
        for n, f in enumerate(cf.as_completed(futs), 1):
            r = f.result()
            results.append(r)
            if r['result'] != 'OK':
                print('  %-8s %s  [%s]' % (r['result'], r['id'], r.get('status')))
            if n % 25 == 0:
                print('  ... %d/%d' % (n, len(items)))

    order = ['BROKEN', 'HOME', 'RETITLED', 'BLOCKED', 'OK']
    results.sort(key=lambda r: (order.index(r['result']), r['id']))
    tally = {k: sum(1 for r in results if r['result'] == k) for k in order}
    print('\nSummary: ' + ', '.join('%s %d' % (k, v) for k, v in tally.items()))
    for r in results:
        if r['result'] == 'OK':
            continue
        print('\n%s  %s' % (r['result'], r['id']))
        print('  list title: %s' % r['title'])
        if r.get('page_title'):
            print('  page title: %s' % r['page_title'])
        print('  url:        %s' % r['url'])
        if r.get('final_url') and r['final_url'] != r['url']:
            print('  landed on:  %s' % r['final_url'])
        if r.get('error'):
            print('  error:      %s' % r['error'])
    if args.json:
        with open(args.json, 'w', encoding='utf-8') as fh:
            json.dump(results, fh, ensure_ascii=False, indent=1)
        print('\nSaved results to ' + args.json)
    return 1 if tally['BROKEN'] or tally['HOME'] else 0


if __name__ == '__main__':
    sys.exit(main())
