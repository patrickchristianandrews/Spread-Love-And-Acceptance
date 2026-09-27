"""Writing puzzle banks as small, lazily loaded chunk files, plus the shared index.

A bank (say "bloom-gentle") is written as assets/js/puzzles/<bank>-<k>.js, each chunk holding
`per` puzzles in order, so puzzle i lives in chunk floor(i / per). No chunk goes over MAX_BYTES,
which keeps the first load of any game about as light as a single old level file.
assets/js/puzzles/index.js lists every bank's size: {"bloom-gentle": {"n": 900, "per": 180, "c": 5}, ...}
and is the only file every game needs up front (it is tiny).

The puzzles that were in the banks before they grew (tools/word-games/legacy/*.json.gz) always
stay first, at the same positions, so a player's record of what they've played still lines up.
"""
import glob
import gzip
import json
import os
import re

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.normpath(os.path.join(HERE, '..', '..', 'assets', 'js', 'puzzles'))
INDEX = os.path.join(OUT, 'index.js')
MAX_BYTES = 32_000


def legacy(name):
    path = os.path.join(HERE, 'legacy', name + '.json.gz')
    if not os.path.exists(path):
        return []
    with gzip.open(path, 'rt') as f:
        return json.load(f)


def _dump(x):
    return json.dumps(x, separators=(',', ':'), ensure_ascii=False)


def read_index():
    if not os.path.exists(INDEX):
        return {}
    txt = open(INDEX).read()
    m = re.search(r'window\.TOL_PUZZLE_INDEX\s*=\s*(\{.*\});', txt, re.S)
    return json.loads(m.group(1)) if m else {}


def write_index(idx):
    with open(INDEX, 'w') as f:
        f.write('/* index.js: how many puzzles each bank holds and how they are split into chunk files\n'
                '   (assets/js/puzzles/<bank>-<chunk>.js, puzzle i in chunk floor(i / per)). Made by\n'
                '   tools/word-games/bank.py. Do not edit by hand. */\n')
        f.write('window.TOL_PUZZLE_INDEX = ' + _dump(dict(sorted(idx.items()))) + ';\n')


def write_bank(name, items, note, max_bytes=MAX_BYTES, extra=None):
    """Write items as chunk files and record the bank in index.js. Returns the chunk size."""
    os.makedirs(OUT, exist_ok=True)
    sizes = [len(_dump(x).encode()) + 1 for x in items]
    head = 200
    # the largest chunk size (puzzles per file) that keeps every file under max_bytes
    per = max(1, (max_bytes - head) * len(items) // max(1, sum(sizes)))
    while per > 1:
        if all(sum(sizes[i:i + per]) + head <= max_bytes for i in range(0, len(items), per)):
            break
        per = int(per * 0.95)
    for old in glob.glob(os.path.join(OUT, name + '-*.js')):
        if re.fullmatch(re.escape(name) + r'-\d+\.js', os.path.basename(old)):
            os.remove(old)
    plain = os.path.join(OUT, name + '.js')
    if os.path.exists(plain):
        os.remove(plain)  # the old single-file bank
    chunks = 0
    for k, i in enumerate(range(0, len(items), per)):
        key = '%s-%d' % (name, k)
        with open(os.path.join(OUT, key + '.js'), 'w') as f:
            f.write('/* %s.js: %s, puzzles %d to %d. Made by tools/word-games. Do not edit by hand. */\n' % (key, note, i + 1, min(len(items), i + per)))
            f.write('(window.TOL_PUZZLES = window.TOL_PUZZLES || {})["%s"] = ' % key + _dump(items[i:i + per]) + ';\n')
        chunks += 1
    idx = read_index()
    entry = {'n': len(items), 'per': per, 'c': chunks}
    if extra:
        entry.update(extra)
    idx[name] = entry
    write_index(idx)
    biggest = max(os.path.getsize(os.path.join(OUT, '%s-%d.js' % (name, k))) for k in range(chunks))
    print('  %s: %d puzzles in %d chunks of %d (largest %.0f KB)' % (name, len(items), chunks, per, biggest / 1024), flush=True)
    return per


class ClueRotor:
    """Hands out a clue for each answer, taking turns through that word's different clues so the same
    answer reads differently from puzzle to puzzle. `prefer` orders the kinds of clue by level."""
    def __init__(self, V, lex, prefer, rng, seen_text=None):
        from clue_variants import variants
        self.V, self.lex, self.prefer, self.rng = V, lex, prefer, rng
        self.variants = variants
        self.uses = {}
        self.cache = {}

    def options(self, w):
        if w in self.cache:
            return self.cache[w]
        vs = [c for c in self.variants(w, self.V, self.lex) if c[1] in self.prefer]
        # the lexicon's own clue (the one the old puzzles used) always counts
        e = (self.lex.get(w) or {}).get('e')
        if e and not any(c[0].rstrip('.') == e.rstrip('.') for c in vs):
            vs.append([e, 'd'])
        # clean plurals ("Kinds of lamp", "Seaports") read better than "... (plural)"
        vs.sort(key=lambda c: (c[0].endswith('(plural)'), self.prefer.index(c[1]) if c[1] in self.prefer else 9))
        self.cache[w] = vs
        return vs

    def clue(self, w, fallback=None):
        opts = self.options(w)
        if not opts:
            return fallback
        n = self.uses.get(w, 0)
        self.uses[w] = n + 1
        # the first time, the best-suited clue; after that, go round the others
        return opts[n % len(opts)][0]


def reindex():
    """Rebuild index.js from the chunk files on disk (safe after several generators ran at once)."""
    groups = {}
    for path in glob.glob(os.path.join(OUT, '*-*.js')):
        m = re.fullmatch(r'(.+)-(\d+)\.js', os.path.basename(path))
        if m:
            groups.setdefault(m.group(1), {})[int(m.group(2))] = path
    idx = {}
    for name, parts in groups.items():
        ks = sorted(parts)
        if ks != list(range(len(ks))):
            raise SystemExit('%s: chunks %s are not 0..%d' % (name, ks, len(ks) - 1))
        counts = []
        for k in ks:
            txt = open(parts[k], encoding='utf-8').read()
            counts.append(len(json.loads(re.search(r'\]\s*=\s*(\[.*\]);\s*$', txt, re.S).group(1))))
        idx[name] = {'n': sum(counts), 'per': counts[0], 'c': len(ks)}
    write_index(idx)
    return idx


if __name__ == '__main__':
    import sys
    if sys.argv[1:] == ['reindex']:
        for k, v in sorted(reindex().items()):
            print(k, v)


def rechunk(max_bytes=MAX_BYTES):
    """Re-split every bank on disk into chunks of at most max_bytes (keeps each bank's order)."""
    idx = reindex()
    for name, info in sorted(idx.items()):
        items = []
        for k in range(info['c']):
            txt = open(os.path.join(OUT, '%s-%d.js' % (name, k)), encoding='utf-8').read()
            items.extend(json.loads(re.search(r'\]\s*=\s*(\[.*\]);\s*$', txt, re.S).group(1)))
            note = re.match(r'/\* \S+: (.*), puzzles \d+ to \d+', txt).group(1)
        write_bank(name, items, note, max_bytes)


if __name__ == '__main__' and sys.argv[1:] == ['rechunk']:
    rechunk()
