"""Builds the safe, gentle vocabulary (with clues) shared by every word-game generator.

Needs:  pip install wn wordfreq english-words
        python -c "import wn; wn.download('oewn:2023')"
Clues come from Open English WordNet 2023 (CC BY 4.0, https://en-word.net/).

A word is kept only if EVERY one of its meanings is safe:
  - no meaning marked disparaging, obscene, slang, an ethnic slur and the like;
  - no meaning that falls under a category we keep out of calm games (weapons, crime,
    violence, illness, death, drugs and so on), found by walking WordNet's "kind of"
    tree down from those categories; and
  - not a name (proper nouns are skipped) and in everyday use (wordfreq).
Words from gentle-words.txt are always welcome and their hand-written clues win.
The result is cached in tools/word-games/build/lexicon.json.
"""
import json
import os
import re

HERE = os.path.dirname(os.path.abspath(__file__))
BUILD = os.path.join(HERE, 'build')
CACHE = os.path.join(BUILD, 'lexicon.json')

# usage labels that keep a word out entirely
BAD_USAGE = {'disparagement', 'obscenity', 'slang', 'ethnic slur', 'colloquialism', 'euphemism',
             'intensifier', 'trademark', 'trade name', 'archaism', 'vulgarism', 'African American Vernacular English'}
# categories (and everything under them) kept out of calm games: [lemma, pos, sense index]
KEEP_OUT = [
    ('weapon', 'n', 0), ('weaponry', 'n', 0), ('crime', 'n', 0), ('wrongdoing', 'n', 0), ('violence', 'n', 0),
    ('killing', 'n', 0), ('death', 'n', 0), ('death', 'n', 1), ('disease', 'n', 0), ('illness', 'n', 0),
    ('injury', 'n', 0), ('pathology', 'n', 1), ('drug', 'n', 0), ('drug of abuse', 'n', 0), ('alcohol', 'n', 0),
    ('tobacco', 'n', 0), ('sexual activity', 'n', 0), ('sex toy', 'n', 0), ('underwear', 'n', 0), ('lingerie', 'n', 0), ('sexual desire', 'n', 0), ('sex', 'n', 0),
    ('reproductive organ', 'n', 0), ('body waste', 'n', 0), ('excretion', 'n', 0), ('military action', 'n', 0),
    ('war', 'n', 0), ('battle', 'n', 0), ('attack', 'n', 0), ('punishment', 'n', 0), ('torture', 'n', 0),
    ('bad person', 'n', 0), ('wrongdoer', 'n', 0), ('unwelcome person', 'n', 0), ('unpleasant person', 'n', 0),
    ('sick person', 'n', 0), ('victim', 'n', 0), ('combatant', 'n', 0), ('military personnel', 'n', 0),
    ('anger', 'n', 0), ('fear', 'n', 0), ('hate', 'n', 0), ('sadness', 'n', 0), ('shame', 'n', 0), ('cruelty', 'n', 0),
    ('evil', 'n', 0), ('gambling', 'n', 0), ('explosive', 'n', 0), ('poison', 'n', 0), ('corpse', 'n', 0),
    ('prison', 'n', 0), ('religion', 'n', 0), ('deity', 'n', 0), ('supernatural being', 'n', 0),
    ('trouble', 'n', 0), ('misfortune', 'n', 0), ('disaster', 'n', 0), ('destruction', 'n', 0), ('conflict', 'n', 0),
    ('failure', 'n', 0), ('harm', 'n', 0), ('distress', 'n', 0), ('unpleasantness', 'n', 0), ('badness', 'n', 0),
    ('expulsion', 'n', 0), ('coercion', 'n', 0), ('vagrant', 'n', 0), ('threat', 'n', 0), ('pain', 'n', 0),
    ('decay', 'n', 0), ('dishonesty', 'n', 0), ('egotism', 'n', 0), ('polygamy', 'n', 0), ('misconduct', 'n', 0),
    ('accusation', 'n', 0), ('disorder', 'n', 0), ('infection', 'n', 0), ('predator', 'n', 0),
    ('warrior', 'n', 0), ('armed forces', 'n', 0), ('terrorist', 'n', 0), ('danger', 'n', 0), ('enemy', 'n', 0),
    ('military unit', 'n', 0), ('armor', 'n', 0), ('soldier', 'n', 0), ('spy', 'n', 0), ('military service', 'n', 0),
    ('warship', 'n', 0), ('ammunition', 'n', 0), ('racism', 'n', 0), ('discrimination', 'n', 0), ('insult', 'n', 0),
    ('kill', 'v', 0), ('hit', 'v', 1), ('attack', 'v', 0), ('injure', 'v', 0), ('hurt', 'v', 0), ('steal', 'v', 0),
    ('cheat', 'v', 0), ('fight', 'v', 0), ('destroy', 'v', 0), ('die', 'v', 0), ('copulate', 'v', 0),
    ('excrete', 'v', 0), ('torture', 'v', 0), ('shoot', 'v', 0), ('insult', 'v', 0), ('abuse', 'v', 0),
]
# a few more that don't suit a calm game
NOT_HERE = {'hookup', 'swine', 'bury', 'contaminated', 'raving', 'missy', 'narcissistic', 'callous', 'trapping', 'twisted', 'hoe', 'booty', 'screw', 'bang', 'blow', 'toil'}
KEEP_OUT_FILES = {'noun.body', 'verb.body'}   # body words only via gentle-words.txt
# a meaning whose definition uses one of these isn't used as a clue
CLUE_AVOID = {'sexual', 'sex', 'sexually', 'drives', 'appetites', 'despicable', 'kill', 'killed', 'killing', 'death', 'dead',
              'die', 'dies', 'disease', 'violent', 'violence', 'drug', 'drugs', 'alcohol', 'alcoholic', 'weapon', 'weapons',
              'war', 'crime', 'criminal', 'murder', 'penis', 'genital', 'erotic', 'erotica', 'nude', 'naked', 'intercourse', 'orgasm', 'masturbation', 'prostitution', 'pornography', 'obscene', 'vulgar', 'urine', 'feces', 'vomit', 'drunk', 'intoxicated', 'intoxicating', 'narcotic', 'breasts', 'buttocks', 'erect', 'arousal', 'aroused', 'lewd', 'brothel', 'stripper', 'seduce', 'seduction', 'mistress', 'lover', 'lovers', 'fetish', 'pubic', 'anus', 'rectum', 'defecate', 'urinate', 'military', 'army', 'armor', 'soldier', 'soldiers', 'spy', 'racial', 'religious', 'bomb', 'gun', 'guns', 'armed', 'sabotage', 'poison', 'poisonous', 'venomous', 'fight', 'fights', 'fighting', 'enemy', 'kills', 'hostile', 'terror', 'blood', 'wound', 'corpse', 'genitals', 'excrement', 'prostitute'}


def _gentle():
    words = set()
    for line in open(os.path.join(HERE, 'gentle-words.txt')):
        if line.startswith('#'):
            continue
        words.update(w.lower() for w in line.split() if w.isalpha())
    return words


def _hand_clues():
    import sys
    sys.path.insert(0, HERE)
    from clues import all_clues
    return all_clues()


def build(force=False):
    if os.path.exists(CACHE) and not force:
        return json.load(open(CACHE))
    import wn
    from wordfreq import zipf_frequency
    from english_words import get_english_words_set
    en = wn.Wordnet('oewn:2023')
    dict_lower = get_english_words_set(['web2', 'gcide'], lower=False, alpha=True)
    dict_lower = {w for w in dict_lower if w.islower()}

    # everything under the kept-out categories
    blocked = set()
    stack = []
    for lemma, pos, i in KEEP_OUT:
        ss = en.synsets(lemma, pos=pos)
        if len(ss) > i:
            stack.append(ss[i])
    while stack:
        s = stack.pop()
        if s.id in blocked:
            continue
        blocked.add(s.id)
        stack.extend(s.hyponyms())
        stack.extend(s.relations().get('instance_hyponym', []))

    def bad_usage(s):
        for d in s.relations().get('exemplifies', []):
            if set(l.lower() for l in d.lemmas()) & {u.lower() for u in BAD_USAGE}:
                return True
        return False

    # sentiment: keep out words that read as negative, or whose meanings are described with
    # strongly negative words (VADER's sentiment lexicon: pip install vaderSentiment)
    try:
        from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer
        VAL = SentimentIntensityAnalyzer().lexicon
    except ImportError:
        VAL = {}

    def valence(t):
        for form in (t, t[:-1] if t.endswith('s') else t, t[:-2] if t.endswith(('ed', 'ly')) else t, t[:-3] if t.endswith('ing') else t):
            if form in VAL:
                return VAL[form]
        return 0

    gentle = _gentle()
    hand = _hand_clues()
    out, unsafe = {}, set()
    # every single-word, lowercase lemma of 3 to 15 letters
    candidates = set()
    for w in en.words():
        lemma = w.lemma()
        if re.fullmatch(r'[a-z]{3,15}', lemma):
            candidates.add(lemma)
    candidates |= gentle
    for word in sorted(candidates):
        ss = en.synsets(word)
        z = zipf_frequency(word, 'en')
        ok = True
        if word not in gentle:
            if valence(word) <= -1.0:
                unsafe.add(word)
                continue
            defs = ' '.join((s_.definition() or '') for s_ in ss).lower()
            toks = set(re.findall(r'[a-z]+', defs))
            if toks & CLUE_AVOID or any(valence(t) <= -2.0 for t in toks):
                unsafe.add(word)
                continue
        # words formed from a kept-out idea (an adjective from a noun, and so on) stay out too
        related = set()
        for w_ in en.words(word):
            for se in w_.senses():
                for rel in ('derivation', 'pertainym'):
                    for t in se.get_related(rel):
                        related.add(t.synset().id)
        if related & blocked:
            unsafe.add(word)
            continue
        for s in ss:
            if s.id in blocked or bad_usage(s) or (s.lexfile() in KEEP_OUT_FILES and word not in gentle):
                ok = False
                break
            if 'instance_hypernym' in s.relations():
                ok = False  # one of its meanings is the name of a particular person or place
                break
        if not ok:
            unsafe.add(word)
            continue
        if word in NOT_HERE:
            continue
        if word not in gentle and re.fullmatch(r'[ivxlcdm]+', word):
            continue  # Roman numerals
        if word not in gentle:
            if z < 2.4 or not ss or word not in dict_lower or (len(word) == 3 and z < 3.3):
                continue
        # meanings in their usual order (most common first), word by word
        ordered = [se.synset().id for w in en.words(word) for se in w.senses()]
        out[word] = {'z': round(z, 2), 'g': word in gentle, 'ss': ordered[:6] or [s.id for s in ss][:6]}

    # clues: the hand-written one if we have it; otherwise the most common safe meaning
    def clean(text, word):
        text = text.split(';')[0].strip()
        text = re.sub(r'\s*\(.*?\)', '', text).strip()
        if len(text) > 90:
            cut = text[:90].rsplit(',', 1)[0] if ',' in text[:90] else ''
            text = cut if len(cut) > 30 else text[:88].rsplit(' ', 1)[0]
            text = re.sub(r'\s+(and|or|of|a|an|the|to|with|in|for|by|that)$', '', text)
        stem = word[:max(4, len(word) - 2)]
        low = text.lower()
        if word in re.findall(r'[a-z]+', low) or stem in low:
            return None
        if set(re.findall(r'[a-z]+', low)) & CLUE_AVOID:
            return None
        if re.search(r'(^|\s)[A-Z][a-z]+', text[1:]):  # names inside a definition read oddly in a calm game
            return None
        return text[:1].upper() + text[1:] if text else None

    for word, info in out.items():
        easy = hand.get(word)
        hard = None
        for sid in info['ss']:
            s = en.synset(sid)
            c = clean(s.definition() or '', word)
            if c and not easy:
                easy = c
            # a newspaper-style short clue: a synonym, or "Kind of ..."
            if not hard:
                syn = [l for l in s.lemmas() if l != word and re.fullmatch(r'[a-z][a-z ]{2,18}', l) and word[:4] not in l and l.split()[0] not in unsafe]
                if syn:
                    hard = syn[0][:1].upper() + syn[0][1:]
                else:
                    hy = [l for h in s.hypernyms() for l in h.lemmas() if re.fullmatch(r'[a-z][a-z ]{2,18}', l) and word[:4] not in l]
                    if hy and s.pos == 'n':
                        hard = 'Kind of ' + hy[0]
            if easy and hard:
                break
        info['e'] = easy
        info['h'] = hard or easy
        info['p'] = en.synset(info['ss'][0]).pos if info['ss'] else 'n'
        del info['ss']
    out = {w: i for w, i in out.items() if i['e']}
    os.makedirs(BUILD, exist_ok=True)
    json.dump(out, open(CACHE, 'w'))
    return out


if __name__ == '__main__':
    lex = build(force=True)
    print(len(lex), 'safe words with clues')
