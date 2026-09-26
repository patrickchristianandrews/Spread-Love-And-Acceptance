"""Makes the levelled puzzle sets for Word Bloom and Quiet Crossword, and extra themes for
Quiet Words, from the safe vocabulary (vocab.py / lexicon.py).

  assets/js/puzzles/bloom-<level>.js   Word Bloom, five difficulty levels
  assets/js/puzzles/xw-<level>.js      Quiet Crossword, five difficulty levels
  assets/js/quiet-words-themes-more.js more word-search themes, from WordNet categories

The friendliest levels lean on gentle-words.txt and the hand-written clues in clues.py.
Run from the repo root:  python3 tools/word-games/make_levels.py
"""
import json
import os
import random
import sys
from collections import Counter

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from layout import place  # noqa: E402
from vocab import words, lex  # noqa: E402
from clues import THEMES, all_clues  # noqa: E402

OUT = os.path.join(HERE, '..', '..', 'assets', 'js', 'puzzles')

# Word Bloom: id, name, base word length, fewest/most grid words, familiarity floor, how many
BLOOM = [
    ('gentle', 'Gentle', 4, 3, 5, 4.0, 300),
    ('easy', 'Easy', 5, 4, 7, 3.7, 300),
    ('medium', 'Medium', 6, 5, 9, 3.4, 300),
    ('hard', 'Hard', 7, 6, 10, 3.1, 300),
    ('expert', 'Expert', 8, 7, 11, 2.9, 300),
]
# Quiet Crossword: id, name, grid size, fewest/most words, familiarity floor, share of short clues, how many
XW = [
    ('easy', 'Easy', 8, 6, 9, 3.9, 0.0, 250),
    ('medium', 'Medium', 9, 9, 12, 3.5, 0.15, 250),
    ('hard', 'Hard', 10, 10, 14, 3.2, 0.45, 250),
    ('expert', 'Expert', 10, 10, 16, 2.9, 0.75, 250),
]


def mask(w):
    m = 0
    for ch in w:
        m |= 1 << (ord(ch) - 97)
    return m


def write(name, data, note):
    os.makedirs(OUT, exist_ok=True)
    with open(os.path.join(OUT, name + '.js'), 'w') as f:
        f.write('/* %s.js: %s. Made by tools/word-games/make_levels.py. Do not edit by hand. */\n' % (name, note))
        f.write('(window.TOL_PUZZLES = window.TOL_PUZZLES || {})["%s"] = ' % name + json.dumps(data, separators=(',', ':'), ensure_ascii=False) + ';\n')


def bloom(rng):
    allw = words(min_z=2.8, plurals=True, lengths=range(3, 9))
    masks = {w: mask(w) for w in allw}
    counts = {w: Counter(w) for w in allw}
    used = set()
    for lid, name, L, lo, hi, minz, count in BLOOM:
        bases = [w for w, v in allw.items() if len(w) == L and (v[2] >= minz + 0.3 or v[3]) and len(set(w)) >= L - 1]
        rng.shuffle(bases)
        made = []
        for base in bases:
            if len(made) >= count:
                break
            if base in used:
                continue
            bm, bc = masks[base], counts[base]
            form = [w for w in allw if len(w) <= L and not (masks[w] & ~bm) and not (counts[w] - bc)]
            grid_pool = sorted([w for w in form if w != base and (allw[w][2] >= minz or allw[w][3])], key=lambda w: (-allw[w][2] - (1 if allw[w][3] else 0), w))
            if len(grid_pool) + 1 < lo:
                continue
            pick = [base] + grid_pool[:hi - 1]
            placed, W, H = place(pick, 8, 8, rng, tries=25)
            got = [p[0] for p in placed]
            if len(got) < lo or base not in got:
                continue
            letters = list(base.upper())
            rng.shuffle(letters)
            made.append({'l': ''.join(letters), 'W': W, 'H': H, 'w': [[w.upper(), r, c, d] for (w, r, c, d) in placed],
                         'b': sorted(w.upper() for w in form if w not in got)})
            used.add(base)
        # a gentle climb within each level: fewer, shorter words first
        made.sort(key=lambda lv: (len(lv['w']), sum(len(x[0]) for x in lv['w'])))
        write('bloom-' + lid, made, 'Word Bloom, %s (%d-letter wheels)' % (name, L))
        print('bloom', lid, len(made), flush=True)


def crosswords(rng):
    # the gentlest level keeps the hand-written themed puzzles
    hand = all_clues()
    gentle = []
    seen = set()
    for theme, d in THEMES.items():
        pool = [w for w in d if 3 <= len(w) <= 8]
        made = 0
        for _ in range(500):
            if made >= 22:
                break
            rng.shuffle(pool)
            placed, W, H = place(pool[:11], 8, 8, rng, tries=25)
            if len(placed) < 6:
                continue
            key = tuple(sorted(p[0] for p in placed))
            if key in seen:
                continue
            seen.add(key)
            gentle.append({'t': theme, 'W': W, 'H': H, 'w': [[w.upper(), r, c, dd, d.get(w) or hand[w]] for (w, r, c, dd) in placed]})
            made += 1
    rng.shuffle(gentle)
    write('xw-gentle', gentle, 'Quiet Crossword, Gentle (themed, hand-written clues)')
    print('xw gentle', len(gentle), flush=True)
    for lid, name, n, lo, hi, minz, hard_share, count in XW:
        vocab = words(min_z=minz, plurals=False, lengths=range(3, n + 1))
        pool = [w for w in vocab if vocab[w][2] < minz + 1.6 or vocab[w][3]]  # skip the very plainest words at harder levels
        made, seen = [], set()
        tries = 0
        while len(made) < count and tries < count * 30:
            tries += 1
            pick = rng.sample(pool, 90 if lo >= 10 else 40)
            placed, W, H = place(pick, n, n, rng, tries=8)
            if len(placed) < lo:
                continue
            placed = placed[:hi]
            minr = min(r for _, r, _, _ in placed)
            minc = min(c for _, _, c, _ in placed)
            placed = [(w, r - minr, c - minc, d) for (w, r, c, d) in placed]
            key = tuple(sorted(p[0] for p in placed))
            if key in seen:
                continue
            seen.add(key)
            W = max(c + (len(w) if d == 'a' else 1) for (w, r, c, d) in placed)
            H = max(r + (len(w) if d == 'd' else 1) for (w, r, c, d) in placed)
            out = []
            for (w, r, c, d) in placed:
                easy, hard, z, g = vocab[w]
                clue = hand.get(w) or (hard if rng.random() < hard_share and hard else easy)
                out.append([w.upper(), r, c, d, clue])
            made.append({'t': name, 'W': W, 'H': H, 'w': out})
        write('xw-' + lid, made, 'Quiet Crossword, %s. Clues adapted from Open English WordNet (CC BY 4.0)' % name)
        print('xw', lid, len(made), flush=True)


# Word-search families: a friendly title, and the WordNet "kind of" roots whose members fill it
FAMILIES = [
    ('Birds in the garden', [('bird', 'n', 0)]), ('Fruit bowl', [('edible fruit', 'n', 0)]), ('The vegetable patch', [('vegetable', 'n', 0)]),
    ('Flowers', [('flower', 'n', 0)]), ('Trees', [('tree', 'n', 0)]), ('Under the sea', [('fish', 'n', 0), ('seafood', 'n', 0)]),
    ('Little creatures', [('insect', 'n', 0), ('arthropod', 'n', 0)]), ('Herbs and spices', [('herb', 'n', 1), ('spice', 'n', 1)]),
    ('Colours', [('chromatic color', 'n', 0)]), ('Making music', [('musical instrument', 'n', 0)]), ('Let’s dance', [('dancing', 'n', 0)]),
    ('Soft fabrics', [('fabric', 'n', 0)]), ('Gems and stones', [('gem', 'n', 1), ('crystal', 'n', 0)]),
    ('Sweet things', [('dessert', 'n', 0), ('sweet', 'n', 1), ('cake', 'n', 2)]), ('The bakery', [('baked goods', 'n', 0), ('bread', 'n', 0)]),
    ('Cheese board', [('cheese', 'n', 0)]), ('Warm drinks', [('hot drink', 'n', 0), ('tea', 'n', 1)]), ('Boats', [('boat', 'n', 0), ('ship', 'n', 0)]),
    ('On the move', [('wheeled vehicle', 'n', 0)]), ('In the toolbox', [('hand tool', 'n', 0)]), ('In the kitchen', [('kitchen utensil', 'n', 0), ('cooking utensil', 'n', 0)]),
    ('Around the house', [('furniture', 'n', 0)]), ('In the wardrobe', [('garment', 'n', 0)]), ('Shoes and boots', [('footwear', 'n', 1)]),
    ('Hats', [('hat', 'n', 0)]), ('Toy box', [('toy', 'n', 0)]), ('Games people play', [('game', 'n', 1), ('board game', 'n', 0)]),
    ('Sports day', [('sport', 'n', 0)]), ('Mountains and valleys', [('natural elevation', 'n', 0), ('natural depression', 'n', 0)]),
    ('Water everywhere', [('body of water', 'n', 0), ('stream', 'n', 0)]), ('In the sky', [('celestial body', 'n', 0), ('cloud', 'n', 1)]),
    ('Shapes', [('plane figure', 'n', 0), ('solid', 'n', 2)]), ('Rooms', [('room', 'n', 0)]), ('Buildings', [('building', 'n', 0)]),
    ('Baskets and boxes', [('container', 'n', 0)]), ('Mammals', [('mammal', 'n', 0)]), ('Reptiles and frogs', [('reptile', 'n', 0), ('amphibian', 'n', 0)]),
    ('Nuts and seeds', [('edible nut', 'n', 0), ('seed', 'n', 1)]), ('Grains', [('grain', 'n', 1), ('cereal', 'n', 1)]), ('Sauces', [('sauce', 'n', 0)]),
    ('Soups and stews', [('soup', 'n', 0), ('stew', 'n', 0)]), ('Pasta', [('pasta', 'n', 0)]), ('Garden tools', [('garden tool', 'n', 0)]),
    ('Weather', [('atmospheric phenomenon', 'n', 0), ('wind', 'n', 0)]), ('Handcrafts', [('handicraft', 'n', 0), ('needlework', 'n', 0)]),
    ('Writing things', [('writing implement', 'n', 0)]), ('Stories and poems', [('literary composition', 'n', 0), ('poem', 'n', 0)]),
    ('Farm friends', [('farm animal', 'n', 0), ('domestic animal', 'n', 0), ('poultry', 'n', 1)]), ('Butterflies and moths', [('lepidopterous insect', 'n', 0)]),
    ('Shells and shore', [('mollusk', 'n', 0), ('crustacean', 'n', 0)]), ('Fresh salads', [('salad green', 'n', 0), ('salad', 'n', 0)]),
    ('Breakfast', [('breakfast food', 'n', 0), ('cereal', 'n', 1)]), ('Jewellery box', [('jewelry', 'n', 0)]), ('Lights', [('light source', 'n', 0)]),
    ('Bags', [('bag', 'n', 0)]), ('Keeping time', [('timepiece', 'n', 0), ('time unit', 'n', 0)]), ('Measurements', [('linear unit', 'n', 0)]),
]


# odd members that WordNet files under a family but that don't suit a gentle word search
THEME_SKIP = {'casino', 'briefs', 'drawers', 'toilet', 'milt', 'fryer', 'feeder', 'blackjack', 'samba', 'clemency', 'charger',
              'beef', 'mankind', 'wormhole', 'extrusion', 'footer', 'duster', 'sinker', 'baba', 'duff', 'tammy', 'stays', 'mack',
              'turtle', 'laundry', 'emmet', 'slater', 'brent', 'brant', 'gridiron', 'gavel', 'spreader', 'altar', 'throne', 'burrow',
              'grill', 'cockroach', 'termite', 'locust', 'flea', 'midge', 'drone', 'embassy', 'courtroom', 'locker', 'stall',
              'cockpit', 'livestock', 'bullock', 'panther', 'doggy', 'mutt', 'broach', 'solitaire', 'swimsuit', 'shorts', 'bulge',
              'cleft', 'taper', 'notch', 'foursquare', 'quadrangle', 'wallow', 'lough', 'arroyo', 'cirque', 'shoal', 'gully',
              'singles', 'doubles', 'racing', 'fishing', 'riding', 'oreo', 'tortilla', 'rusk', 'flipper', 'patten', 'brogan',
              'scooter', 'icebreaker', 'limo', 'coupe', 'lorry', 'jeep', 'auger', 'toothpick', 'cauldron', 'console', 'lounge',
              'chaise', 'buffet', 'mesh', 'micron', 'furlong', 'footer', 'crayfish', 'crawfish', 'catfish', 'flounder', 'sardine'}


def themes(rng):
    """Word-search themes: hand-picked families, filled with the safe, familiar members WordNet lists."""
    import wn
    en = wn.Wordnet('oewn:2023')
    L = lex()
    out = []
    for title, roots in FAMILIES:
        members = set()
        for lemma, pos, i in roots:
            ss = en.synsets(lemma, pos=pos)
            if len(ss) <= i:
                continue
            stack, seen = [ss[i]], set()
            while stack:
                s = stack.pop()
                if s.id in seen or len(seen) > 4000:
                    continue
                seen.add(s.id)
                stack.extend(s.hyponyms())
                for l in s.lemmas():
                    if l in L and l not in THEME_SKIP and 4 <= len(l) <= 10 and L[l]['z'] >= 2.8:
                        # only if this is the word's main meaning (so "trump" isn't a musical instrument)
                        first = [se.synset().id for w_ in en.words(l) for se in w_.senses()][:1]
                        if first and first[0] == s.id:
                            members.add(l)
        if len(members) < 8:
            print('  (skipped', title, len(members), ')')
            continue
        pick = sorted(members, key=lambda w: -L[w]['z'])[:18]
        out.append({'name': title, 'words': [[w.upper(), L[w]['e']] for w in pick]})
    path = os.path.join(HERE, '..', '..', 'assets', 'js', 'quiet-words-themes-more.js')
    with open(path, 'w') as f:
        f.write('/* quiet-words-themes-more.js: more word-search themes (families of everyday things), made by\n   tools/word-games/make_levels.py. Lines adapted from Open English WordNet (CC BY 4.0). Do not edit by hand. */\n')
        f.write('window.TOL_WORD_THEMES_MORE = ' + json.dumps(out, separators=(',', ':'), ensure_ascii=False) + ';\n')
    print('themes', len(out), flush=True)


if __name__ == '__main__':
    rng = random.Random(20260927)
    which = sys.argv[1:] or ['bloom', 'xw', 'themes']
    if 'bloom' in which:
        bloom(rng)
    if 'xw' in which:
        crosswords(rng)
    if 'themes' in which:
        themes(rng)
