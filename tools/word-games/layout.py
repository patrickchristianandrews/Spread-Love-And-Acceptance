"""Crossword-style layout shared by the word-game generators.

place(words, max_w, max_h, rng) lays the words out on a grid so that each new word
crosses one already placed, with no letters touching side by side except at crossings.
Returns (placements, width, height) where each placement is (word, row, col, 'a'|'d').
"""


def _fits(grid, used, word, r, c, d, max_w, max_h, bounds):
    dr, dc = (0, 1) if d == 'a' else (1, 0)
    r1, c1 = r + dr * (len(word) - 1), c + dc * (len(word) - 1)
    minr, minc, maxr, maxc = bounds
    nminr, nminc, nmaxr, nmaxc = min(minr, r), min(minc, c), max(maxr, r1), max(maxc, c1)
    if nmaxc - nminc + 1 > max_w or nmaxr - nminr + 1 > max_h:
        return -1
    # the cells just before and after the word must be empty
    if grid.get((r - dr, c - dc)) or grid.get((r1 + dr, c1 + dc)):
        return -1
    crossings = 0
    for i, ch in enumerate(word):
        rr, cc = r + dr * i, c + dc * i
        have = grid.get((rr, cc))
        if have:
            if have != ch or d in used.get((rr, cc), ''):
                return -1
            crossings += 1
            continue
        # a new letter: its side neighbours must be empty
        if dr == 0:
            if grid.get((rr - 1, cc)) or grid.get((rr + 1, cc)):
                return -1
        else:
            if grid.get((rr, cc - 1)) or grid.get((rr, cc + 1)):
                return -1
    if crossings == len(word):
        return -1
    return crossings


def place(words, max_w, max_h, rng, tries=40):
    best = None
    for t in range(tries):
        order = sorted(words, key=lambda w: (-len(w), rng.random()))
        if t:
            # keep the longest first, shuffle the rest a little
            head, rest = order[:1], order[1:]
            rng.shuffle(rest)
            order = head + sorted(rest, key=lambda w: -len(w) + rng.random() * 2)
        grid, used, placed = {}, {}, []
        first = order[0]
        if len(first) > max_w:
            continue
        for i, ch in enumerate(first):
            grid[(0, i)] = ch
            used[(0, i)] = 'a'
        placed.append((first, 0, 0, 'a'))
        bounds = [0, 0, 0, len(first) - 1]
        for w in order[1:]:
            opts = []
            for (pw, pr, pc, pd) in placed:
                for i, ch in enumerate(pw):
                    for j, wc in enumerate(w):
                        if ch != wc:
                            continue
                        d = 'd' if pd == 'a' else 'a'
                        cr, cc = (pr, pc + i) if pd == 'a' else (pr + i, pc)
                        r, c = (cr - j, cc) if d == 'd' else (cr, cc - j)
                        x = _fits(grid, used, w, r, c, d, max_w, max_h, bounds)
                        if x > 0:
                            nr1 = r + (len(w) - 1 if d == 'd' else 0)
                            nc1 = c + (len(w) - 1 if d == 'a' else 0)
                            area = (max(bounds[2], nr1) - min(bounds[0], r) + 1) * (max(bounds[3], nc1) - min(bounds[1], c) + 1)
                            opts.append((x * 10 - area * 0.2 + rng.random(), w, r, c, d))
            if not opts:
                continue
            _, w, r, c, d = max(opts)
            dr, dc = (0, 1) if d == 'a' else (1, 0)
            for i, ch in enumerate(w):
                grid[(r + dr * i, c + dc * i)] = ch
                used[(r + dr * i, c + dc * i)] = used.get((r + dr * i, c + dc * i), '') + d
            placed.append((w, r, c, d))
            bounds = [min(bounds[0], r), min(bounds[1], c), max(bounds[2], r + dr * (len(w) - 1)), max(bounds[3], c + dc * (len(w) - 1))]
        h, wd = bounds[2] - bounds[0] + 1, bounds[3] - bounds[1] + 1
        score = (len(placed), -abs(h - wd) - h * wd * 0.05)
        if best is None or score > best[0]:
            norm = [(w, r - bounds[0], c - bounds[1], d) for (w, r, c, d) in placed]
            best = (score, norm, wd, h)
        if len(placed) == len(words):
            break
    if not best:
        return [], 0, 0
    return best[1], best[2], best[3]
