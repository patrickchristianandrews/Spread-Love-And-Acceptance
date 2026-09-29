"""Checks every crossword clue and answer before a puzzle is served.

clue_problem(answer, clue) returns a short reason when a clue doesn't fit its answer, or None:
  - the clue is on the list of known-bad clues (BAD_CLUES), or a vague "Kind of ..." clue;
  - the answer, its stem or a spelling variant of it is inside the clue ("Cozy" for COSY);
  - the answer and clue disagree in number (a plural answer clued "A ..."; "... (plural)");
  - the answer and clue disagree in tense (a past-tense answer with a present-tense clue,
    an -ING answer whose clue isn't an -ING phrase);
  - the clue uses a British spelling or word.
answer_problem(answer) returns a reason when an answer shouldn't be in a calm American crossword:
British spellings and words, abbreviations and odd forms, and political, legal or
stereotype-prone words.
puzzle_problems(words) checks a whole puzzle ([[ANSWER, r, c, d, clue], ...]): every clue, every
answer, and no clue used twice.
americanize(text) turns British spellings in a clue into American ones.
"""
import re

# ---------------------------------------------------------------- answers kept out
# British spellings and British-only words (their American forms are welcome)
BRITISH = set('''
colour colours coloured colourful flavour flavours favour favours favourite favourites honour honours neighbour neighbours
neighbourhood harbour harbours humour labour parlour rumour rumours savour vapour vigour valour armour arbour behaviour
odour splendour clamour candour ardour glamour tumour endeavour
centre centres theatre theatres metre metres litre litres fibre fibres calibre sombre spectre lustre meagre sabre
organise organised realise realised recognise apologise apologised analyse paralyse catalogue dialogue monologue
travelled travelling traveller jewellery cancelled cancelling marvellous labelled modelling fuelled counsellor
instalment enrolment fulfil skilful wilful grey greys greyish tyre tyres kerb cheque cheques plough ploughs programme
programmes aluminium mould moulds moulded draught draughts pyjamas cosy cosier sceptic sceptical manoeuvre
defence offence licence pretence practise practised mum mums mummy nan nana rota fete fetes conker conkers jumper jumpers
sledge sledges allotment allotments nappy nappies cot cots lorry lorries petrol queue queues loo bloke blokes telly
fortnight aeroplane maths pram prams crisps trainers courgette courgettes aubergine aubergines
caravan caravans jab jabs rubbish trousers wellies holidaymaker hoover flatmate postcode
anyways gens tor toby col cos ere nowt aye amongst whilst learnt spelt dreamt burnt spoilt
'''.split())
# abbreviations, word fragments and odd forms that make poor answers
ODD = set('''
ben cox mag sup lux mike josh khan cole brad hank mack milo jimmy billy molly trump maria brit baba dame semi prof grad lite bong babe blah ness ling sept thou fiat jeep rave poker karma abbey baron canon sworn naked nude nudes quasi amir silva twitter tweet viral pic pics gee ref refs fab
abc abs aba ado ags ahs ain ais als amp amps ane ani apo ara ars asp ats avs baa bap bis bmx bra bras cia cos coz dak
dat dis doc docs dos ens eon eons ers esp eta etas ets gat gen gens gyp hoi ids ies ina ism isms kat ken kens lac lat lea
leas lev lox mac macs mho mig mil mils moa mon mos neo nee non nos obi oca oda ods ohs oms ons ope oxo pac pes pis pix
pro psi pst qua rad rads rec reps rep rev revs roc sae sec secs sis sot soi taw tec tis tor tors ute uts wen wens
yea yeas yen yens yon abba abo alee amah ante anti anon apse arak arco aril aver bade biz bren caw coif coir dace
deb debs doth drat ecru eddo eft eke eked elhi erne erst esne etui ewer faun gamp gape gaol haft hep hie hied hob iamb
ilk imam inky izar jape joss kami kepi kohl lade lase lath lode lour lurk mete mewl moue nard nave neep nome obit
odea olio orle oryx oust pish pone pule quod rale rapt rede rhea rime roue scad sere sera shoat sial sild
skua slag snog sough spae sprat stet tare tarn thew toff tole tope tret tung twee ulna ulnae urea wain
wale wan wast weal whit wive wont wot yaw yaws yegg zeta
'''.split())
# political, legal, religious and stereotype-prone words: not for a calm game
TOUCHY = set('''
heal heals healing cure cures remedy remedies law laws veto bloc mayor pact exile reign electoral president amendment manifesto inspector nightclub idol idols imam imams totem obese psychiatry prosthetic metabolism metabolic embryo embryos therapy therapist diagnosis referendum electorates liberalism strategists politicians
plaintiff plaintiffs defendant defendants lawsuit lawsuits verdict verdicts senate senator senators congress congressman
election elections elect elected ballot ballots voter voters vote votes voted voting liberal liberals conservative
conservatives tory tories democrat democrats republican republicans politics political politician politicians partisan
tax taxes taxed taxing taxation immigrant immigrants alien aliens illegal lawyer lawyers attorney attorneys sue sued
suing court courts judge judges jury juries prosecutor legal legislation legislature statute statutes decree decrees
treaty treaties regime regimes dictator empire colony colonies colonial native natives tribe tribes tribal ethnic racial gypsy gypsies eskimo eskimos oriental savage savages housewife housewives spinster spinsters mistress maid maids
manservant heir heiress dowry harem sheik sheikh caste slave slaves marriage marriages divorce divorced
widow widower church churches pew pews chapel mosque temple temples priest priests nun nuns monk monks
pope bishop bishops sermon pray prayer prayers psalm hymn hymns bible altar saint saints sin sins holy sacred god gods
goddess angel angels heaven hell devil ghost ghosts witch witches wizard wizards
poverty wealth wealthy fat fatty skinny obese diet diets dieting slimming police officer officers sheriff arrest arrested jail prison bail army navy troops soldier marine marines colonel sergeant
'''.split())
# answers that are only ever clued by hand (common inflected forms WordNet can't clue well)
HAND_ONLY = set('''
was were are is am been being did does done had has have having went gone saw seen won ran run sat met led fed lit
ate eaten bought brought caught taught thought fought built sent spent lent bent kept slept swept wept felt dealt knelt
meant held told sold found ground bound wound stood understood heard made paid said laid shone stuck struck hung
sang sung rang rung swam drank drunk began begun came become flew drew grew knew threw blew wore tore swore bore
spoke broke woke chose froze rode wrote rose drove strove gave forgave took shook mistook forsook
'''.split())


def answer_problem(word):
    w = word.lower()
    if w in BRITISH:
        return 'british'
    if w in ODD:
        return 'odd'
    if w in TOUCHY:
        return 'touchy'
    if re.search(r'(isation|isations|ised|ising|ise|ises)$', w) and re.sub(r'is(ation|ations|ed|ing|e|es)$', r'iz\1', w) in _AMERICAN:
        return 'british'
    if len(w) >= 5 and re.search(r'our(s|ed|ful|ite|ites|ing)?$', w) and not re.search(r'(four|pour|tour|sour|hour|your|flour|scour|court|mourn)', w) and re.sub(r'our', 'or', w) in _AMERICAN:
        return 'british'
    if re.search(r'tre(s)?$', w) and re.sub(r'tre(s?)$', r'ter\1', w) in _AMERICAN:
        return 'british'
    if re.search(r'(ll)(ed|ing|er|ers)$', w) and re.sub(r'll(ed|ing|er|ers)$', r'l\1', w) in _AMERICAN:
        return 'british'
    return None


# ---------------------------------------------------------------- clues
# clues a tester found that don't fit, and others like them from the dictionary
BAD_CLUES = {c.lower() for c in '''
Have the quality of being
Kind of property
Not subject to defeat
Flocks
Infinite
Tugboat
Maria
Ain
Be around, often idly or without specific purpose
Having a substance added to increase effectiveness
Of a moderate reddish-brown color
How something is done or how it happens
An affirmative
Place one's stake
Used with either mass or count nouns to indicate the whole number or amount of or every
Fool or hoax
Finger cot
Protective covering for an injured finger
The seat within a bishop's diocese where his cathedral is located
'''.strip().split('\n')}

# words a clue in a calm game shouldn't lean on: illness and medicine, politics, religion, money
# trouble, nationality asides
CLUE_TOUCHY = set('''
arthritis buboes bubo disease diseases illness symptom symptoms syndrome surgery surgical tumor tumors cancer patient patients
medication medicine clinical diagnosis therapy infection inflammation pathology fattened fattening obese
taxation taxes tax exile exiles refugee refugees troops tactical political politics election elections vote voting party's
church chapel priest priests god gods religious bishop diocese sacrament penance worship deity
irish italian chinese mexican jewish african asian indian french german spanish russian arab arabic oriental
'''.split())

# clues that are wrong only for one particular answer (a dictionary's odd meaning of it)
BAD_PAIRS = {('see', 'understand'), ('are', 'exist'), ('was', 'exist'), ('were', 'exist'), ('is', 'exist'),
             ('cod', 'collect'), ('early', 'former'), ('fresh', 'bracing'), ('tie', 'affiliation'), ('stems', 'roots'),
             ('inn', 'hostel'), ('own', 'ain'), ('mare', 'maria'), ('space', 'infinite'), ('tower', 'tugboat'),
             ('mountains', 'flocks'), ('won', 'not subject to defeat'), ('age', 'kind of property')}

# British spellings in clue text, and their American forms
AMERICAN_WORDS = {
    'favourite': 'favorite', 'favourites': 'favorites', 'colour': 'color', 'colours': 'colors', 'coloured': 'colored',
    'colourful': 'colorful', 'colouring': 'coloring', 'flavour': 'flavor', 'flavours': 'flavors', 'grey': 'gray', 'greys': 'grays',
    'greyish': 'grayish', 'centre': 'center', 'centres': 'centers', 'theatre': 'theater', 'metre': 'meter', 'metres': 'meters',
    'litre': 'liter', 'litres': 'liters', 'neighbour': 'neighbor', 'neighbours': 'neighbors', 'neighbourhood': 'neighborhood',
    'harbour': 'harbor', 'humour': 'humor', 'honour': 'honor', 'labour': 'labor', 'behaviour': 'behavior', 'odour': 'odor',
    'organise': 'organize', 'organised': 'organized', 'realise': 'realize', 'recognise': 'recognize', 'apologise': 'apologize',
    'travelled': 'traveled', 'travelling': 'traveling', 'jewellery': 'jewelry', 'cosy': 'cozy', 'mum': 'mom', 'mums': 'moms',
    'mummy': 'mommy', 'nan': 'grandma', 'practise': 'practice', 'practised': 'practiced', 'counsellor': 'counselor',
    'instalment': 'installment', 'courgette': 'zucchini', 'courgettes': 'zucchini', 'nappies': 'diapers', 'nappy': 'diaper',
    'jumper': 'sweater', 'jumpers': 'sweaters', 'sledge': 'sled', 'sledges': 'sleds', 'fete': 'fair', 'rota': 'schedule',
    'biscuit': 'cookie', 'biscuits': 'cookies', 'film': 'movie', 'films': 'movies', 'tyre': 'tire', 'tyres': 'tires',
    'plough': 'plow', 'mould': 'mold', 'pyjamas': 'pajamas', 'aluminium': 'aluminum', 'defence': 'defense', 'licence': 'license',
    'programme': 'program', 'cheque': 'check', 'petrol': 'gas', 'lorry': 'truck', 'holiday': 'vacation', 'autumn': 'fall',
    'torch': 'flashlight', 'trousers': 'pants', 'sweets': 'candy', 'crisps': 'chips', 'queue': 'line', 'fortnight': 'two weeks',
    'whilst': 'while', 'amongst': 'among', 'learnt': 'learned', 'spelt': 'spelled', 'dreamt': 'dreamed', 'burnt': 'burned',
    'conker': 'chestnut', 'conkers': 'chestnuts', 'allotment': 'community garden', 'maths': 'math', 'pram': 'stroller',
    'catalogue': 'catalog', 'analyse': 'analyze', 'fibre': 'fiber', 'sombre': 'somber', 'cancelled': 'canceled',
    'modelling': 'modeling', 'labelled': 'labeled', 'marvellous': 'marvelous', 'armour': 'armor', 'vapour': 'vapor',
    'rumour': 'rumor', 'parlour': 'parlor', 'savour': 'savor', 'splendour': 'splendor', 'endeavour': 'endeavor',
    'flavoured': 'flavored', 'flavourful': 'flavorful', 'traveller': 'traveler', 'travellers': 'travelers', 'coloured': 'colored',
    'realised': 'realized', 'organisation': 'organization', 'apologised': 'apologized', 'caravan': 'camper', 'caravans': 'campers',
    'dustbin': 'trash can', 'rubbish': 'trash', 'aeroplane': 'airplane', 'aeroplanes': 'airplanes',
    'ladybird': 'ladybug', 'ladybirds': 'ladybugs', 'postbox': 'mailbox', 'pavement': 'sidewalk', 'motorway': 'highway',
}
# words kept in clues on purpose even though they look British (autumn is fine in American English too)
AMERICAN_OK = {'autumn', 'holiday', 'torch', 'film', 'queue'}


def americanize(text):
    # "on holiday" is a vacation in American English (holiday lights stay holiday lights)
    text = re.sub(r'\b(on|little|small|a|for|summer|seaside|beach) (holiday)(s?)\b', lambda m: m.group(1) + ' vacation' + m.group(3), text)
    text = re.sub(r'\b(On|Little|Small|Summer|Seaside|Beach) (holiday)(s?)\b', lambda m: m.group(1) + ' vacation' + m.group(3), text)

    def fix(m):
        w = m.group(0)
        low = w.lower()
        if low in AMERICAN_OK or low not in AMERICAN_WORDS:
            return w
        a = AMERICAN_WORDS[low]
        return a[:1].upper() + a[1:] if w[:1].isupper() else a
    return re.sub(r"[A-Za-z]+", fix, text)


def _british_in(text):
    for t in re.findall(r"[A-Za-z]+", text):
        low = t.lower()
        if low in AMERICAN_WORDS and low not in AMERICAN_OK:
            return low
    return None


IRREGULAR_PAST = set('''
was were saw won ran sat met led fed lit ate bought brought caught taught thought fought built sent spent lent bent kept
slept swept wept felt dealt knelt meant held told sold found ground bound stood understood heard made paid said laid shone
stuck struck hung sang rang swam drank began came flew drew grew knew threw blew wore tore swore spoke broke woke chose
froze rode wrote rose drove gave forgave took shook got forgot hid bit let set put cut hit shut spread read left lost
did had went became taught sought wound slid spun dug clung flung stung swung strode lay sank shrank sprang
'''.split())
PAST_PARTICIPLE = set('been seen gone done eaten given taken written ridden risen driven chosen frozen spoken broken woken worn torn sworn shown grown known thrown blown drawn flown begun sung rung swum drunk forgotten hidden bitten gotten fallen'.split())
SINGULAR_START = re.compile(r"^(a|an|one|this|that|it|it's|its|someone|something|somebody)\b", re.I)
PLURAL_START = re.compile(r"^(kinds|some|these|those|they|they're|pairs|groups)\b", re.I)
NOT_PLURAL_S = re.compile(r"(ss|us|is|ous|ics|ness|less|ways|news|yes|plus|gas|bus|lens|atlas|canvas|chaos|iris|oasis|bonus|virus|circus|cactus|walrus|genus|census|thus|was|has|his|hers|ours|yours|its|this|always|perhaps|towards|afterwards|pants|jeans|scissors|glasses|mathematics|physics|thanks|species|series|means|odds)$")


VARIANT_PAIRS = {('s', 'z'), ('z', 's'), ('c', 'k'), ('k', 'c'), ('y', 'i'), ('i', 'y'), ('e', 'a'), ('a', 'e')}


def _edit1(a, b):
    """True if a and b look like spellings of one word: one letter swapped for a common variant
    (COSY / cozy), or one extra letter at the end (a plural or an -ed or -y form)."""
    if a == b:
        return True
    la, lb = len(a), len(b)
    if la == lb:
        diff = [(x, y) for x, y in zip(a, b) if x != y]
        return len(diff) == 1 and diff[0] in VARIANT_PAIRS
    if abs(la - lb) != 1:
        return False
    short, long_ = (a, b) if la < lb else (b, a)
    return long_.startswith(short) and long_[-1] in 'sedy'


def _stems(w):
    out = {w}
    for suf in ('ies', 'es', 's', 'ed', 'd', 'ing', 'er', 'ers', 'est', 'ly', 'y', 'ful', 'ness'):
        if w.endswith(suf) and len(w) - len(suf) >= 3:
            out.add(w[:-len(suf)])
    if w.endswith('ies'):
        out.add(w[:-3] + 'y')
    return out


def contains_answer(answer, clue):
    a = answer.lower()
    toks = [t for t in re.findall(r"[a-z]+", clue.lower())]
    stems = _stems(a)
    for t in toks:
        if t == a:
            return True
        tstems = _stems(t)
        if stems & tstems and min(len(x) for x in stems & tstems) >= 3:
            return True
        # spelling variants (COSY / Cozy) and near-copies of longer answers
        if len(a) >= 4 and len(t) >= 4 and _edit1(a, t):
            return True
        # a long shared start: DRASTICALLY / drastic, ELEGANTLY / elegance (but not RAINBOW / rainy)
        n = 0
        while n < min(len(a), len(t)) and a[n] == t[n]:
            n += 1
        if n >= 5 and n >= min(len(a), len(t)) - 3:
            return True
    return False


def looks_plural(answer, known=None):
    a = answer.lower()
    if not a.endswith('s') or NOT_PLURAL_S.search(a) or len(a) < 4:
        return False
    if known is None:
        return True
    base = {a[:-1], a[:-2] if a.endswith('es') else None, a[:-3] + 'y' if a.endswith('ies') else None}
    return any(b and b in known for b in base)


def looks_past(answer, known=None):
    a = answer.lower()
    if a in IRREGULAR_PAST:
        return True
    if a.endswith('ed') and len(a) >= 5 and not a.endswith(('eed', 'bed', 'red', 'shed', 'sled', 'sped')):
        if known is None:
            return True
        return a[:-2] in known or a[:-1] in known or (len(a) > 5 and a[-3] == a[-4] and a[:-3] in known) or (a.endswith('ied') and a[:-3] + 'y' in known)
    return False


def clue_is_past(clue):
    toks = re.findall(r"[A-Za-z']+", clue)
    if not toks:
        return False
    if '___' in clue:
        return True  # a fill-in-the-blank carries its own tense
    head = [t.lower() for t in toks[:3]]
    return any(t.endswith('ed') or t in IRREGULAR_PAST or t in PAST_PARTICIPLE for t in head)


def clue_problem(answer, clue, known=None, hand=False):
    """None if the clue fits, else a short reason. `known` is the lexicon (word -> info with the
    part of speech 'p'), for telling plurals and past tenses apart from words that just end in S or
    ED, and verb clues from noun ones. `hand` marks a hand-written clue (trusted on tense)."""
    c = (clue or '').strip()
    low = c.lower().rstrip('.')
    a = answer.lower()
    if len(c) < 2:
        return 'empty'
    if low in BAD_CLUES or (a, low) in BAD_PAIRS:
        return 'known bad'
    if re.match(r'^kinds? of\b', low) and len(low.split()) <= 4:
        return 'vague kind of'
    if '(plural)' in low:
        return 'plural tag'
    if not hand and re.match(r'^(used|serving) (to|as|with|in) (indicate|express|refer|introduce|form|signal|show|mean|emphasize)', low):
        return 'grammar-book clue'
    if set(re.findall(r'[a-z]+', low)) & CLUE_TOUCHY:
        return 'touchy clue'
    if contains_answer(a, c.replace('___', ' ')):
        return 'answer in clue'
    b = _british_in(c)
    if b:
        return 'british: ' + b
    if looks_plural(a, known):
        if SINGULAR_START.match(c) and not re.match(r'^(one|a|an) (pair|set|group|bunch|few|couple)\b', low):
            return 'number: plural answer, singular clue'
    elif PLURAL_START.match(c) and not a.endswith(('s', 'ren', 'men', 'ple', 'ice', 'eese', 'eet', 'eeth')):
        return 'number: singular answer, plural clue'
    # tense: a clue that opens with a plain verb ("Stay in one place") can't clue a past-tense or
    # -ING answer; a clue opening with a noun or adjective phrase can ("The season of new flowers")
    head = (re.findall(r"[A-Za-z']+", c) or [''])[0].lower()
    head_is_verb = isinstance(known, dict) and (known.get(head) or {}).get('p') == 'v' and not head.endswith(('ed', 'ing'))
    if not hand and looks_past(a, known) and not clue_is_past(c) and (head_is_verb or not isinstance(known, dict)):
        return 'tense: past answer, present clue'
    if not hand and a.endswith('ing') and len(a) >= 6 and '___' not in c and head_is_verb:
        return 'tense: -ing answer'
    if not hand and len(c) > 80:
        return 'too long'
    return None


def puzzle_problems(words, known=None, hand_of=None):
    """Every problem in a puzzle: [(answer, reason), ...]."""
    out, seen = [], {}
    for w in words:
        ans, clue = w[0], w[4]
        p = answer_problem(ans)
        if p:
            out.append((ans, 'answer ' + p))
        q = clue_problem(ans, clue, known, hand=bool(hand_of and clue in hand_of.get(ans.lower(), ())))
        if q:
            out.append((ans, q + ': ' + clue))
        k = clue.lower().rstrip('.').strip()
        if k in seen:
            out.append((ans, 'duplicate clue: ' + clue))
        seen[k] = ans
    return out


_AMERICAN = set()


def set_american_words(words):
    """The words answer_problem compares British spellings against (a US word list)."""
    _AMERICAN.clear()
    _AMERICAN.update(words)
