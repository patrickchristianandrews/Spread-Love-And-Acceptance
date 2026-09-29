"""Reading the puzzle banks back from their chunk files (assets/js/puzzles/<bank>-<k>.js)."""
import json
import os
import re

from bank import OUT, read_index


def load_bank(name):
    idx = read_index()
    info = idx.get(name)
    if not info:
        return [], ''
    items, note = [], ''
    for k in range(info['c']):
        txt = open(os.path.join(OUT, '%s-%d.js' % (name, k)), encoding='utf-8').read()
        items.extend(json.loads(re.search(r'\]\s*=\s*(\[.*\]);\s*$', txt, re.S).group(1)))
        m = re.match(r'/\* \S+: (.*), puzzles \d+ to \d+', txt)
        if m:
            note = m.group(1)
    return items, note
