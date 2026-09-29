"""Makes assets/js/puzzles/bloom-dict.js: every everyday, family-friendly English word of 3 to 9
letters that Word Bloom accepts. A word you spell that fits a slot in the little crossword (with the
same letters where it crosses other words) fills that slot; any other word from this list goes in
the bonus jar, so common words like SAP, GAS, END, OUR, RIGHT or COLUMN always count.

A word is in if it is common (wordfreq), spelled the American way, found in a US dictionary (Webster's
2nd, via english-words) or is a plain inflection of one (-s, -es, -ed, -ing, -er, -est, -ly), and is
not unkind or unsuitable: no profanity, slurs, sexual or drug words, nothing strongly negative
(VADER), and nothing from clue_check's British, odd or touchy lists.

Run:  python3 tools/word-games/make_bloom_dict.py
"""
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from bank import OUT  # noqa: E402
from clue_check import BRITISH, ODD, TOUCHY, set_american_words, answer_problem  # noqa: E402

# kept out of the jar: rude, sexual, drug, violent and unkind words (and a few that only read that way)
UNSUITABLE = set('''
ass asses arse bum butt butts boob boobs booby tit tits titty cum cunt cock cocks dick dicks dong dildo fag fags faggot fuck fucks
fucked fucker fucking shit shits shitty piss pissed pisses crap crappy damn damned hell hells bitch bitches bastard slut sluts
whore whores hoe hoes pimp pimps porn porno horny sexy sex sexes sexual nude nudes nudity naked strip stripper stripped
bra bras thong thongs panty panties orgy orgies rape raped rapes rapist molest incest penis penises vagina vulva anus anal
rectum semen sperm erotic erection erect lust lusty lewd kinky fetish kink kinks spank spanked spanking grope groped
drug drugs dope dopes stoned weed weeds pot pots crack cracked cocaine heroin meth opium acid joint joints bong bongs
beer beers wine wines booze boozy drunk drunks liquor vodka whiskey rum gin ale ales lager keg kegs tipsy
kill kills killed killer killing murder murders murdered slay slain dead death deaths die dies died dying corpse gun guns
shoot shot shots stab stabbed bomb bombs war wars wound wounds blood bloody gore gory knife knives sword swords
hate hated hates hatred racist racism nazi slave slaves slavery negro nigger gypsy gypsies jap japs chink spic kike wop
retard retarded retards idiot idiots moron morons stupid dumb lame loser losers ugly fat fatty obese freak freaks
suicide suicidal abuse abused abuser abusive assault assaulted torture tortured victim victims hostage prison jail
satan satanic devil devils demon demons hell damn cult cults witch witches ghost ghosts
puke puked vomit vomits poop poops pee pees peed fart farts turd turds snot
'''.split())

# everyday little words some dictionaries leave out
ALWAYS = set('''
our ours ourselves hers his its itself theirs their them they yours your you she her him himself herself who whom whose what which
that this these those and but for nor yet not any all few many much some each both either neither none one two three four five
six seven eight nine ten okay into onto upon with from than then when where while why how here there were was are been being
has had have does did done doing can could would should might must shall will wont cannot
'''.split())


def main():
    from english_words import get_english_words_set
    from wordfreq import top_n_list, zipf_frequency
    try:
        from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer
        VAL = SentimentIntensityAnalyzer().lexicon
    except ImportError:
        VAL = {}
    us = {w for w in get_english_words_set(['web2'], lower=False, alpha=True) if w.islower()}
    set_american_words(us)

    def in_dict(w):
        if w in us:
            return True
        for suf, add in (('s', ''), ('es', ''), ('ies', 'y'), ('ed', ''), ('ed', 'e'), ('ied', 'y'), ('ing', ''), ('ing', 'e'),
                         ('er', ''), ('er', 'e'), ('est', ''), ('est', 'e'), ('ly', ''), ('ily', 'y'), ('ers', ''), ('ers', 'e')):
            if w.endswith(suf) and len(w) - len(suf) >= 2:
                base = w[:-len(suf)] + add
                if base in us:
                    return True
                # a doubled last letter: running, stopped, bigger
                if len(base) >= 3 and base[-1] == base[-2] and base[:-1] in us:
                    return True
        return False

    out = {}
    for w in top_n_list('en', 250000):
        if not re.fullmatch(r'[a-z]{3,9}', w):
            continue
        z = zipf_frequency(w, 'en')
        if z < 2.5:
            continue
        if w in UNSUITABLE or w in BRITISH or w in TOUCHY or (w in ODD and z < 3.8):
            continue
        if answer_problem(w) == 'british':
            continue
        if VAL.get(w, 0) <= -1.6:
            continue
        if w not in ALWAYS and not in_dict(w):
            continue
        out.setdefault(len(w), []).append(w)
    total = sum(len(v) for v in out.values())
    path = os.path.join(OUT, 'bloom-dict.js')
    with open(path, 'w') as f:
        f.write('/* bloom-dict.js: the everyday, family-friendly words Word Bloom accepts (3 to 9 letters), for the bonus jar\n'
                '   and for other words that fit a slot. Made by tools/word-games/make_bloom_dict.py. Do not edit by hand. */\n')
        f.write('window.TOL_BLOOM_DICT = ' + json.dumps({str(k): ' '.join(sorted(v)) for k, v in sorted(out.items())}, separators=(',', ':')) + ';\n')
    print(total, 'words,', os.path.getsize(path) // 1024, 'KB')
    for k in ('sap', 'gas', 'end', 'our', 'right', 'column', 'nude', 'tor', 'toby', 'col', 'ends', 'columns', 'stopped', 'running'):
        print(k, k in out.get(len(k), []))


if __name__ == '__main__':
    main()
