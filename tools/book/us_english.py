#!/usr/bin/env python3
"""us_english.py: American English for the books and the online book pages (books-final9, owner decision 20 Oct 2026).

The owner's rule: American spelling, words, dates, times and settings everywhere, and US quote punctuation (periods and
commas inside closing quotes). This module holds one ordered list of rules and applies them to text only:

    us(text)            plain text
    us_html(html)       the text between tags (tags, attributes, scripts and styles are left alone); reference lists
                        (<ul class="... pe-refs ...">) and <cite> keep the published spelling of research titles
    python3 tools/book/us_english.py FILE...            convert files in place (.html, .json string values, .py string literals)
    python3 tools/book/us_english.py --check FILE...    list what would change, change nothing

The rules are phrase-level where a word has a British meaning only in some contexts (a "row" is a fight, but a row of
a table stays a row). Research titles in reference lists keep their published spelling."""
import io
import os
import json
import re
import sys
import tokenize

MONTHS = 'January|February|March|April|May|June|July|August|September|October|November|December'
DAYS = 'Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday'


def _case(src, dst):
    if src.isupper() and len(src) > 1:
        return dst.upper()
    if src[:1].isupper():
        return dst[:1].upper() + dst[1:]
    return dst


# ---------- spelling (case-preserving, whole words) ----------
WORDS = {
    'colour': 'color', 'colours': 'colors', 'coloured': 'colored', 'colouring': 'coloring', 'colourful': 'colorful',
    'behaviour': 'behavior', 'behaviours': 'behaviors', 'behavioural': 'behavioral', 'behaviourally': 'behaviorally',
    'favour': 'favor', 'favours': 'favors', 'favoured': 'favored', 'favourably': 'favorably', 'favouring': 'favoring', 'unfavourable': 'unfavorable', 'favourite': 'favorite', 'favourites': 'favorites', 'favourable': 'favorable',
    'honour': 'honor', 'honours': 'honors', 'honoured': 'honored', 'humour': 'humor', 'humours': 'humors', 'humoured': 'humored',
    'neighbour': 'neighbor', 'neighbours': 'neighbors', 'neighbourhood': 'neighborhood', 'neighbourhoods': 'neighborhoods', 'neighbouring': 'neighboring',
    'labour': 'labor', 'laboured': 'labored', 'flavour': 'flavor', 'flavours': 'flavors', 'rumour': 'rumor', 'rumours': 'rumors',
    'harbour': 'harbor', 'endeavour': 'endeavor', 'candour': 'candor', 'vigour': 'vigor', 'odour': 'odor', 'armour': 'armor', 'parlour': 'parlor',
    'centre': 'center', 'centres': 'centers', 'centred': 'centered', 'theatre': 'theater', 'theatres': 'theaters', 'fibre': 'fiber',
    'litre': 'liter', 'litres': 'liters', 'metre': 'meter', 'metres': 'meters', 'kilometre': 'kilometer', 'kilometres': 'kilometers',
    'sombre': 'somber', 'meagre': 'meager', 'spectre': 'specter', 'calibre': 'caliber',
    'defence': 'defense', 'defences': 'defenses', 'offence': 'offense', 'offences': 'offenses', 'pretence': 'pretense', 'licence': 'license',
    'judgement': 'judgment', 'judgements': 'judgments', 'acknowledgement': 'acknowledgment', 'ageing': 'aging', 'grey': 'gray', 'greys': 'grays',
    'greyish': 'grayish', 'cheque': 'check', 'cheques': 'checks', 'cosy': 'cozy', 'cosier': 'cozier', 'mould': 'mold', 'mouldy': 'moldy',
    'sceptic': 'skeptic', 'sceptical': 'skeptical', 'sceptics': 'skeptics', 'scepticism': 'skepticism', 'whilst': 'while', 'amongst': 'among',
    'towards': 'toward', 'afterwards': 'afterward', 'backwards': 'backward', 'forwards': 'forward', 'upwards': 'upward', 'downwards': 'downward',
    'onwards': 'onward', 'inwards': 'inward', 'outwards': 'outward', 'learnt': 'learned', 'spelt': 'spelled', 'dreamt': 'dreamed', 'burnt': 'burned',
    'spoilt': 'spoiled', 'smelt': 'smelled', 'programme': 'program', 'programmes': 'programs',
    'analyse': 'analyze', 'analysed': 'analyzed', 'analysing': 'analyzing', 'analyser': 'analyzer', 'analysers': 'analyzers',
    'paralyse': 'paralyze', 'paralysed': 'paralyzed', 'paralysing': 'paralyzing', 'catalyse': 'catalyze',
    'travelled': 'traveled', 'travelling': 'traveling', 'traveller': 'traveler', 'travellers': 'travelers',
    'cancelled': 'canceled', 'cancelling': 'canceling', 'labelled': 'labeled', 'labelling': 'labeling', 'modelled': 'modeled', 'modelling': 'modeling',
    'fuelled': 'fueled', 'fuelling': 'fueling', 'signalled': 'signaled', 'signalling': 'signaling', 'levelled': 'leveled', 'levelling': 'leveling',
    'marvellous': 'marvelous', 'woollen': 'woolen', 'counsellor': 'counselor', 'counsellors': 'counselors', 'counselling': 'counseling',
    'counselled': 'counseled', 'totalled': 'totaled', 'dialled': 'dialed', 'dialling': 'dialing', 'quarrelled': 'quarreled', 'quarrelling': 'quarreling',
    'channelled': 'channeled', 'tunnelling': 'tunneling', 'jewellery': 'jewelry', 'catalogue': 'catalog', 'catalogues': 'catalogs',
    'pyjamas': 'pajamas', 'aeroplane': 'airplane', 'aeroplanes': 'airplanes', 'plough': 'plow', 'storey': 'story', 'storeys': 'stories',
    'draught': 'draft', 'draughts': 'drafts', 'draughty': 'drafty', 'aluminium': 'aluminum', 'enrol': 'enroll', 'enrols': 'enrolls',
    'enrolment': 'enrollment', 'fulfil': 'fulfill', 'fulfils': 'fulfills', 'fulfilment': 'fulfillment', 'skilful': 'skillful', 'skilfully': 'skillfully',
    'wilful': 'willful', 'instil': 'instill', 'instils': 'instills', 'manoeuvre': 'maneuver', 'manoeuvres': 'maneuvers', 'manoeuvring': 'maneuvering',
    'paediatric': 'pediatric', 'paediatrician': 'pediatrician', 'anaesthetic': 'anesthetic', 'oestrogen': 'estrogen', 'foetus': 'fetus',
    'practise': 'practice', 'practised': 'practiced', 'practises': 'practices', 'practising': 'practicing',
    'smoulder': 'smolder', 'smouldering': 'smoldering', 'moult': 'molt', 'tyre': 'tire', 'tyres': 'tires', 'kerb': 'curb', 'kerbs': 'curbs',
    'mum': 'mom', 'mums': 'moms', 'mummy': 'mommy', 'grandad': 'grandpa', 'grandads': 'grandpas', 'nan': 'grandma', 'nana': 'grandma',
    'telly': 'TV', 'maths': 'math', 'fortnightly': 'every two weeks', 'housemate': 'roommate', 'housemates': 'roommates',
    'flatmate': 'roommate', 'flatmates': 'roommates', 'trainers': 'sneakers', 'jumper': 'sweater', 'jumpers': 'sweaters',
    'nappy': 'diaper', 'nappies': 'diapers', 'pram': 'stroller', 'prams': 'strollers', 'pushchair': 'stroller', 'buggy': 'stroller', 'buggies': 'strollers',
    'crisps': 'chips', 'biro': 'pen', 'biros': 'pens', 'secateurs': 'pruning shears', 'launderette': 'laundromat', 'porridge': 'oatmeal',
    'pudding': 'dessert', 'takeaway': 'takeout', 'takeaways': 'takeouts', 'teatime': 'dinnertime', 'rota': 'schedule', 'rotas': 'schedules',
    'cuppa': 'cup of coffee', 'skint': 'broke', 'knackered': 'exhausted', 'chuffed': 'thrilled', 'whinge': 'whine', 'whingeing': 'whining',
    'brolly': 'umbrella', 'bloke': 'guy', 'blokes': 'guys', 'quid': 'dollars', 'fiver': 'five dollars', 'tenner': 'ten dollars',
    'poorly': 'sick', 'advert': 'ad', 'adverts': 'ads', 'petrol': 'gas', 'motorway': 'highway', 'motorways': 'highways', 'roadworks': 'road work',
    'courgette': 'zucchini', 'courgettes': 'zucchini', 'aubergine': 'eggplant', 'aubergines': 'eggplants', 'coriander': 'cilantro',
    'sellotape': 'tape', 'hoover': 'vacuum', 'hoovered': 'vacuumed', 'hoovering': 'vacuuming', 'wellies': 'rain boots', 'waistcoat': 'vest',
    'lorry': 'truck', 'lorries': 'trucks', 'pavement': 'sidewalk', 'pavements': 'sidewalks', 'solicitor': 'lawyer', 'solicitors': 'lawyers',
    'cinema': 'movie theater', 'cinemas': 'movie theaters', 'jabs': 'shots', 'loo': 'bathroom', 'allotment': 'community garden plot',
    'allotments': 'community garden plots', 'crèche': 'daycare', 'creche': 'daycare', 'windscreen': 'windshield', 'freshers': 'freshmen',
}
# -ise to -ize (only these stems: advise, surprise, exercise, promise and the like are the same in American English)
ISE = ('realis|organis|apologis|recognis|criticis|prioritis|summaris|normalis|minimis|maximis|categoris|memoris|personalis|visualis|sympathis|'
       'utilis|stabilis|generalis|finalis|socialis|specialis|characteris|authoris|familiaris|energis|harmonis|mobilis|rationalis|standardis|'
       'idealis|legitimis|scrutinis|agonis|patronis|jeopardis|fantasis|hypnotis|traumatis|moralis|conceptualis|catastrophis|demonis|romanticis|'
       'internalis|externalis|polaris|sanitis|synchronis|theoris|optimis|customis|neutralis|empathis|verbalis|randomis|popularis|capitalis|'
       'itemis|mesmeris|globalis|institutionalis|hospitalis|immunis|vandalis|terroris|emphasis|stigmatis|marginalis|prioritis|sensitis|desensitis|'
       'legalis|centralis|decentralis|criminalis|monopolis|dramatis|economis|equalis|formalis|humanis|localis|naturalis|penalis|publicis|'
       'specialis|stabilis|strategis|subsidis|symbolis|tantalis|tranquillis|urbanis|vaporis|weatheris|womanis|scandalis|sterilis|accessoris|'
       'appetis|colonis|digitalis|dramatis|energis|eulogis|evangelis|fertilis|fraternis|galvanis|harmonis|idolis|immortalis|'
       'mechanis|memorialis|minimis|modernis|organis|ostracis|paralys|pasteuris|plagiaris|politicis|pressuris|privatis|proselytis|pulveris|'
       'recognis|regularis|reorganis|revitalis|satiris|scrutinis|sermonis|sexualis|sensationalis|signalis|socialis|solemnis|specialis|'
       'stylis|summaris|synthesis|systematis|temporis|theoris|trivialis|unionis|utilis|valoris|victimis|visualis')
_ISE = re.compile(r'\b(%s)(e|ed|es|ing|er|ers|ation|ations|able)\b' % ISE, re.I)


def _ise(m):
    stem, suf = m.group(1), m.group(2)
    if stem.lower() == 'synthesis' and suf.lower() in ('', 's'):
        return m.group(0)
    return stem[:-1] + ('Z' if stem[-1].isupper() else 'z') + suf


_WORDS = re.compile(r'\b(%s)\b' % '|'.join(sorted(map(re.escape, WORDS), key=len, reverse=True)), re.I)


def _words(m):
    w = m.group(0)
    r = WORDS[w.lower()]
    if w == 'Nan' or w == 'Nana':
        return 'Grandma'
    if w.lower() in ('nan',) and w.islower():
        return 'grandma'
    return _case(w, r)


# ---------- phrases (ordered: specific first). (regex, replacement, flags) ----------
P = [
    # settings and places
    (r'\bLeyton\b', 'Queens'), (r'\bTenby\b', 'Cape Cod'), (r'\bStockport\b', 'Columbus'), (r'\bLeeds\b', 'Chicago'), (r'\bthe M6\b', 'I-95'),
    (r'\bStoke’s defence\b', 'the Eagles’ defense'), (r'\bStoke\b', 'the Eagles'), (r'\bbuilding society\b', 'credit union'), (r'\bcaravan holiday\b', 'camping trip'),
    (r'\bWales\b', 'Maine'), (r'\bCardiff\b', 'Portland'), (r'\bManchester\b', 'Pittsburgh'), (r'\bLondon\b', 'New York'), (r'\bBirmingham\b', 'Cleveland'),
    (r'\bGlasgow\b', 'Baltimore'), (r'\bEdinburgh\b', 'Boston'), (r'\bBristol\b', 'Denver'), (r'\bBlackpool\b', 'Atlantic City'), (r'\bBrighton\b', 'Santa Cruz'),
    (r'\bCornwall\b', 'the Outer Banks'), (r'\bScotland\b', 'Vermont'), (r'\bthe Lake District\b', 'the Adirondacks'),
    # money: dollars (amounts are rounded local equivalents)
    (r'£9,000', '$12,000'), (r'£24\b', '$30'), (r'£2,600', '$3,300'), (r'£1,900', '$2,400'), (r'£1,500', '$1,900'), (r'£870', '$1,100'), (r'£630', '$800'),
    (r'£212', '$260'), (r'forty pounds', 'fifty dollars'), (r'\bheart pounds\b', 'heart hammers'), (r'£(\d+(?:,\d{3})*(?:\.\d\d)?)', r'$\1'),
    (r'\bpence\b', 'cents'), (r'\b(\d+)p\b(?= (each|a|for))', r'\1 cents'), (r'for 50p\b', 'for 50 cents'),
    # schools and ages
    (r'\bsince Year 2\b', 'since first grade'), (r'\btaught Year 4\b', 'taught third grade'), (r'\bYear (\d|1[0-3])\b', lambda m: _grade(int(m.group(1)))),
    (r'\bprimary school\b', 'elementary school'), (r'\bsecondary school\b', 'high school'), (r'\bsixth form\b', 'senior year'),
    (r'\bhead ?teacher\b', 'principal'), (r'\bdeputy head\b', 'assistant principal'), (r'\bgovernors’ meeting\b', 'school board meeting'),
    (r'\bform tutor\b', 'homeroom teacher'), (r'\bin halls\b', 'in the dorms'), (r'\bat university\b', 'in college'), (r'\buni\b', 'college'),
    (r'\bA[- ]levels?\b', 'finals'), (r'\bGCSEs?\b', 'exams'), (r'\bhalf[- ]term\b', 'school break'), (r'\bHalf[- ]term\b', 'School break'),
    (r'\bthe first term\b', 'the first semester'), (r'\blast term\b', 'last semester'), (r'\bthis term\b', 'this semester'), (r'\bnext term\b', 'next semester'),
    (r'\bschool run\b', 'school drop-off'), (r'\bschool-run\b', 'school drop-off'), (r'\bpacked lunch(es)?\b', r'lunch\1 from home'), (r'\bfrom PE\b', 'from gym class'),
    (r'\bPE towel\b', 'gym towel'), (r'\bPE kit\b', 'gym clothes'), (r'\bchemistry exam\b', 'biology exam'), (r'\brevision\b', 'studying'),
    (r'\bReception class\b', 'kindergarten'), (r'\bnursery bag\b', 'daycare bag'), (r'\bto nursery\b', 'to daycare'), (r'\bthe nursery\b', 'the daycare'),
    (r'\bnursery\b', 'daycare'), (r'\bUnder-12s\b', 'Under-12 soccer'), (r'\ba pitch that\b', 'a field that'), (r'\bthe pitch\b', 'the field'),
    # health
    (r'\bA&E\b', 'the ER'), (r'\bA&amp;E\b', 'the ER'), (r'driving someone to the ER', 'driving someone to the ER'), (r'\bwhich the ER\b', 'which ER'),
    (r'\bthe GP and the jabs\b', 'the doctor and the shots'), (r'\bthe GP\b', 'the doctor'), (r'\bHis GP\b', 'His doctor'), (r'\bher GP\b', 'her doctor'),
    (r'\byour GP\b', 'your doctor'), (r'\ba GP\b', 'a doctor'), (r'\bGPs\b', 'doctors'), (r'\bGP\b', 'doctor'), (r'\bin hospital\b', 'in the hospital'),
    (r'\bbloods\b', 'blood work'), (r'\bon lates\b', 'on late shifts'), (r'\bthe chemist’s\b', 'the drugstore'), (r'\bchemist’s\b', 'drugstore'),
    (r'\(\s*<a href="/research\.html#ref-nhs-face-blindness">NHS</a>\s*\)', ''),
    # homes
    (r'\bshare a flat\b', 'share an apartment'), (r'\bshared flat\b', 'shared apartment'), (r'\bin the flat\b', 'in the apartment'),
    (r'\bempty flat\b', 'empty apartment'), (r'\bmiserable flat\b', 'miserable apartment'), (r'\boutside the flats\b', 'outside the apartments'),
    (r'\bflat-pack\b', 'assemble-it-yourself'), (r'\bour flat\b', 'our apartment'), (r'\btheir flat\b', 'their apartment'), (r'\bher flat\b', 'her apartment'),
    (r'\bhis flat\b', 'his apartment'), (r'\byour flat\b', 'your apartment'), (r'\bthe flat\b(?= (above|below|next|where|was|is|they|she|he|upstairs))', 'the apartment'),
    (r'\ba flat\b(?= (above|in|with|of|on|near|where))', 'an apartment'), (r'\bnew flat\b', 'new apartment'), (r'\bfirst flat\b', 'first apartment'),
    (r'\bwashing-up\b', 'dishes'), (r'\bwashing up\b', 'doing the dishes'), (r'\bThe washing\b', 'The laundry'), (r'\bthe washing\b(?! machine)', 'the laundry'),
    (r'\bwash basket\b', 'laundry basket'), (r'\bkitchen roll\b', 'paper towels'), (r'\bthe hob\b', 'the stove'), (r'\bhob\b', 'stove'),
    (r'\bcooker\b', 'stove'), (r'\bthe boiler\b', 'the water heater'), (r'\bThe boiler\b', 'The water heater'), (r'\bbread bin\b', 'bread box'),
    (r'\bbiscuit tin\b', 'cookie jar'), (r'\bbiscuits\b', 'cookies'), (r'\b(?<![A-Z])biscuit\b', 'cookie'), (r'\btins\b(?= of)', 'cans'), (r'\ba tin of\b', 'a can of'),
    (r'\btins\b', 'cans'), (r'\boff the side\b', 'off the counter'), (r'\bon the side\b(?= in the kitchen)', 'on the counter'),
    (r'\bthe garden\b', 'the yard'), (r'\bThe garden\b', 'The yard'), (r'\bgarden\b(?= (shed|gate|wall|fence|path))', 'yard'), (r'\bback garden\b', 'backyard'),
    (r'\bfixing the tap\b', 'fixing the faucet'), (r'\bthe tap\b(?! (on|my|your))', 'the faucet'), (r'\btap running\b', 'faucet running'),
    (r'\bdressing gown\b', 'bathrobe'), (r'\bcot\b', 'crib'), (r'\bdummy\b', 'pacifier'), (r'\bplasters\b', 'Band-Aids'),
    # trash
    (r'\bbin bags?\b', 'trash bag'), (r'\bthe bin rota\b', 'the trash schedule'), (r'\bbin rota\b', 'trash schedule'), (r'\bbin day\b', 'trash day'), (r'\bBin day\b', 'Trash day'),
    (r'\bbathroom bin\b', 'bathroom trash can'), (r'\binto the bin\b', 'into the trash'), (r'\bin the bin\b', 'in the trash'), (r'\bthe bottom of the bin\b', 'the bottom of the trash can'),
    (r'\bpast the bins\b', 'past the dumpsters'), (r'\bBins went out\b', 'Trash went out'), (r'\bput the bins out\b', 'took the trash out'),
    (r'\bThe bins go out\b', 'The trash goes out'), (r'\btake the bins out\b', 'take the trash out'), (r'\btook the bins out\b', 'took the trash out'),
    (r'\btaking the bins\b', 'taking out the trash'), (r'\btake the bins\b', 'take out the trash'), (r'\bThe bins weren’t taken out\b', 'The trash wasn’t taken out'),
    (r'\bthe council about the bins\b', 'the city about trash pickup'), (r'\bthe bins again\b', 'the trash again'), (r'\bThe bins again\b', 'The trash again'),
    (r'\bthe bins\b', 'the trash'), (r'\bThe bins\b', 'The trash'), (r'\bbins\b', 'trash cans'), (r'\bthe bin is full\b', 'the trash is full'), (r'\bThe bin is full\b', 'The trash is full'), (r'\bbin\b', 'trash can'), (r'\brubbish\b', 'trash'),
    (r'\bthe council\b', 'the city'), (r'\bThe council\b', 'The city'), (r'\bcouncil\b', 'city'), (r'\bcar tax\b', 'car registration'), (r'\bthe MOT\b', 'the car inspection'),
    (r'\bMOT\b', 'car inspection'),
    # out and about
    (r'\bstaff car park\b', 'staff parking lot'), (r'\btest centre car park\b', 'DMV parking lot'), (r'\bcar parks?\b', 'parking lot'), (r'\bcar park charges\b', 'parking charges'),
    (r'\bcar boot\b', 'trunk'), (r'\bsat nav\b', 'navigation app'), (r'\bhigh street\b', 'main street'), (r'\bring road\b', 'beltway'),
    (r'\bat the roundabout\b', 'at the intersection'), (r'\bon a wet roundabout\b', 'at a wet intersection'), (r'\broundabouts?\b', 'traffic circle'),
    (r'\bzebra crossing\b', 'crosswalk'), (r'\bdual carriageway\b', 'highway'), (r'\bthe railway\b', 'the train tracks'), (r'\breturn ticket\b', 'round-trip ticket'),
    (r'\bthe queue\b', 'the line'), (r'\bThe queue\b', 'The line'), (r'\ba queue\b', 'a line'), (r'\bqueue\b', 'line'), (r'\bqueuing\b', 'waiting in line'),
    (r'\bthe shops\b', 'the store'), (r'\bshop assistant\b', 'store clerk'), (r'\btrolley\b', 'cart'), (r'\bthe lift\b(?! (it|of|in|that|this))', 'the elevator'),
    (r'\ba lift on\b', 'a ride on'), (r'\ba lift to\b', 'a ride to'), (r'\ba lift\b(?! (in|of|to your|from))', 'a ride'), (r'\bthe post office\b', 'the mailroom'), (r'\bThe post,\b', 'The mail,'),
    (r'\bthe post\b', 'the mail'), (r'\bin the post\b', 'in the mail'), (r'\bthe village pub\b', 'the local bar'), (r'\bpub quiz team\b', 'bar trivia team'),
    (r'\bin the pub\b', 'at the bar'), (r'\bat the pub\b', 'at the bar'), (r'\bthe pub\b', 'the bar'), (r'\bpubs\b', 'bars'), (r'\bpub\b', 'bar'), (r'\bleaving do\b', 'going-away party'),
    (r'\bsoft-play centre\b', 'indoor play place'), (r'\bcommunity centre\b', 'community center'), (r'\bassessment centre\b', 'assessment center'),
    (r'\bdistribution centre\b', 'distribution center'), (r'\bcinema-popcorn\b', 'movie-popcorn'), (r'\bthe cinema\b', 'the movie theater'), (r'\bat the movie theater\b', 'at the movies'),
    (r'\bpauses the film\b', 'pauses the movie'), (r'\ba film\b', 'a movie'), (r'\bthe film\b', 'the movie'), (r'\bfilms\b', 'movies'),
    (r'\bcooking programme\b', 'cooking show'), (r'\bBoxing Day\b', 'the day after Christmas'), (r'\bbonfire night\b', 'the Fourth of July'),
    (r'\bbank holiday weekend\b', 'holiday weekend'), (r'\bthe Thursday before a bank holiday\b', 'the Thursday before a holiday weekend'),
    (r'\bTwo bank holidays\b', 'Two holidays'), (r'\bbank holidays?\b', 'holiday'), (r'\bholiday plans\b', 'vacation plans'),
    (r'\bevery single holiday\b', 'every single vacation'), (r'\bdoes holidays\b', 'does vacations'), (r'\bon holiday\b', 'on vacation'),
    (r'\bHolidays belong to my family\b', 'The holidays belong to my family'), (r'\bsummer holidays\b', 'summer vacation'), (r'(?<!the )(?<!The )\bholidays\b', 'vacations'),
    (r'\ba holiday\b(?! (weekend|season|card|party|meal|dinner))', 'a vacation'), (r'\bthe holiday\b(?! (weekend|season|card|party|meal|dinner))', 'the vacation'),
    # time and dates
    (r'\bfortnight\b', 'two weeks'), (r'\bonce a two weeks\b', 'once every two weeks'), (r'\bFor a two weeks\b', 'For two weeks'), (r'\bfor a two weeks\b', 'for two weeks'),
    (r'\babout a two weeks\b', 'about two weeks'), (r'\bfirst two weeks\b', 'first two weeks'), (r'\ba two weeks\b', 'two weeks'),
    (r'\bat the weekend\b', 'on the weekend'), (r'\bAt the weekend\b', 'On the weekend'), (r'\bat weekends\b', 'on weekends'),
    (r'\b(at|by|from|until|before|after) quarter past (one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)\b', lambda m: '%s %s fifteen' % (m.group(1), m.group(2))),
    (r'\bat quarter past\b', 'at a quarter after'), (r'\bquarter past\b', 'a quarter after'),
    (r'\b([Hh])alf (one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)\b', lambda m: _case(m.group(1) + 'x', _num(m.group(2)))[:0] + _half(m)),
    (r'\b(five|ten|twenty|twenty-five) past (one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)\b', lambda m: '%s:%02d' % (_n(m.group(2)), _n(m.group(1)))),
    (r'\b(five|ten|twenty|twenty-five) past\b', r'\1 after'),
    (r'\b(\d{1,2}) (%s)( \d{4})?\b' % MONTHS, lambda m: '%s %s%s' % (m.group(2), m.group(1), (',' + m.group(3)) if m.group(3) else '')),
    (r'\b(%s) (%s) (\d{1,2})\b' % (DAYS, MONTHS), r'\1, \2 \3'),
    (r'(?<!\$)\b(the|at|by|on the|until|from|after|before|around|about|It’s|it’s|It was|it was)\s(1[0-2]|[1-9])\.([0-5]\d)\b(?!\d)(?! (hours|per|of|a|MB|in|percent|%))', r'\1 \2:\3'),
    (r'\b(\d{1,2})\.(\d{2}) ?(am|pm)\b', r'\1:\2\3'), (r'\b(\d{1,2}(?::\d{2})?) (am|pm)\b', r'\1\2'), (r'\b(\d{1,2}(?::\d{2})?) ?([ap])\.m\.', r'\1\2m'),
    (r'\bfor tea\b', 'for dinner'), (r'\bbefore tea\b', 'before dinner'), (r'\bafter tea\b', 'after dinner'), (r'\bat tea\b', 'at dinner'),
    (r'\bThu, Oct\b', 'Thu, Oct'),
    # people and talk
    (r'\bMum\b', 'Mom'), (r'\bNan’s\b', 'Grandma’s'), (r'\bNana\b', 'Grandma'), (r'\bGrandad\b', 'Grandpa'),
    (r'“I’m a bit tired today and all, love\.”', '“I’m a bit tired today too, sweetheart.”'), (r'“Do you not like coming here, love\?”', '“Don’t you like coming here, sweetie?”'),
    (r'\b(Mr|Mrs|Ms|Dr)\b(?!\.)', r'\1.'), (r'\bthe new lad\b', 'the new guy'), (r'\blads\b', 'guys'), (r'\blad\b', 'guy'), (r'\blass\b', 'girl'),
    (r'\bmates\b', 'friends'), (r'\bmate\b', 'buddy'), (r'\breckons\b', 'thinks'), (r'\breckon\b', 'think'), (r'\bcheeky\b', 'playful'),
    (r'\bBit gutted not to be asked\b', 'Kind of bummed not to be asked'), (r'\ba bit gutted\b', 'a little hurt'), (r'\bgutted\b', 'crushed'),
    (r'“All right\?', '“You okay?'), (r'\bYou all right\?', 'You okay?'), (r'\bthe friend everyone rings\b', 'the friend everyone calls'),
    (r'\brang round\b', 'called around'), (r'\b([Rr])ang\b', lambda m: _case(m.group(1) + 'x', 'called')), (r'\brung\b', 'called'),
    (r'\b([Rr])ing(s|ing)? (?!a bell)(me|him|her|you|them|us|back|his|their|the|a|my|your|our)\b', lambda m: _case(m.group(1) + 'x', 'call' + (m.group(2) or '')) + ' ' + m.group(3)),
    (r'\bthat you ring\b', 'that you call'), (r'\bstart ringing\b', 'start calling'), (r'\bkeeps ringing\b', 'keeps calling'),
    (r'\btells the children off\b', 'scolds the children'), (r'\btold (him|her|them|me|us|you) off\b', r'scolded \1'), (r'\btold off\b', 'scolded'),
    (r'\btelling-off\b', 'scolding'), (r'\btelling off\b', 'scolding'),
    (r'\bstraight away\b', 'right away'), (r'\bStraight away\b', 'Right away'), (r'\bin future\b', 'in the future'), (r'\bdifferent to\b', 'different from'),
    (r'\bhave a go\b', 'give it a try'), (r'\bgive it a go\b', 'give it a try'), (r'\bfill (it|this|them|the form|the sheet) in\b', r'fill \1 out'),
    (r'\bfill in\b(?= (the|a|your|this|their|each))', 'fill out'),
    (r'\bwent round the houses\b', 'went around in circles'), (r'\bgot round to\b', 'got around to'), (r'\bget round to\b', 'get around to'),
    (r'\bhave friends round\b', 'have friends over'), (r'\bcome round\b', 'come over'), (r'\bcame round\b', 'came over'),
    (r'\bturns this round\b', 'turns this around'), (r'\bturn it round\b', 'turn it around'), (r'\bturned round\b', 'turned around'),
    (r'\b(plan|go|went|walk|walked|walks|looking|look|looked|tiptoeing|chased|passed|come|came|show|showing|get|got|getting|rule|talk|turn|move|moving|sit|sat|gather|gathered|drive|drove|run|ran|wander|wandered) round\b', r'\1 around'),
    (r'\bround (the|you|him|her|them|it|to|a|his|their|my|your|our|this|that)\b', r'around \1'), (r'\ball round\b', 'all around'),
    (r'\bthe full stop problem\b', 'the period problem'), (r'\bThe full stop problem\b', 'The period problem'), (r'\bfull stops\b', 'periods'), (r'\bFull stop\b', 'Period'),
    (r'\bfull stop\b', 'period'), (r'\bfancy vocabulary\b', 'big vocabulary'), (r'\bfancy dress\b', 'costume'), (r'\bsorted it out\b', 'worked it out'),
    (r'\bsorted the shoes\b', 'settled the shoes'), (r'\bsorted themselves out\b', 'worked themselves out'),
    (r'\bhalf cross with\b', 'half annoyed with'), (r'\bquite cross with\b', 'pretty annoyed with'), (r'\bnot cross with you\b', 'not mad at you'),
    (r'\bcross about\b', 'mad about'), (r'\bcross with\b', 'annoyed with'), (r'\bcross at\b', 'mad at'), (r'\bis cross\b', 'is annoyed'), (r'\bgets cross\b', 'gets annoyed'),
    # rows (arguments), never rows of a table
    (r'(?<!in )\b(a|the|this|that|big|every|another|our|their|your|same|huge|blazing) row\b(?=( about| over| between| with (his|her|their|my|your|a|an|the)| was| is| didn| happen| that| starts| started| began| begins| blew| brewing| coming| kicked|[.,;:!?)”’]))', r'\1 fight'),
    (r'\bstart the rows\b', 'start the fights'), (r'\browing\b', 'fighting'),
    (r'\bThe row\b(?! (of|for|above|below))', 'The fight'), (r'\bMid-row\b', 'Mid-fight'), (r'\bmid-row\b', 'mid-fight'),
    # food and things
    (r'\bChinese takeaway\b', 'Chinese takeout'), (r'\ba takeaway menu\b', 'a takeout menu'), (r'\bover a takeaway\b', 'over takeout'), (r'\bwith a takeaway\b', 'with takeout'),
    (r'\bthe takeaway\b', 'the takeout'), (r'\ba takeaway\b', 'takeout'), (r'\bjacket potato\b', 'baked potato'), (r'\bsweets\b', 'candy'), (r'\bcandyfloss\b', 'cotton candy'),
    (r'\bfizzy drinks?\b', 'soda'), (r'\bchips and\b', 'fries and'), (r'\bSunday roast\b', 'Sunday dinner'), (r'\bdid a trifle\b', 'made a pie'), (r'\bthe trifle\b', 'the pie'),
    (r'\bcling film\b', 'plastic wrap'), (r'\bsolicitor\b', 'lawyer'), (r'\bestate agent\b', 'real estate agent'), (r'\boff-licence\b', 'liquor store'),
    (r'\bthe toilets\b', 'the restroom'), (r'\btoilets\b', 'restrooms'), (r'\bmobile phone\b', 'cell phone'), (r'\bmobile\b(?! (app|apps|version|screen|device))', 'phone'),
    (r'\bthe torch\b', 'the flashlight'), (r'\ba torch\b', 'a flashlight'), (r'\btorch\b', 'flashlight'), (r'\bthe timetable\b', 'the schedule'), (r'\btimetable\b', 'schedule'),
    (r'\bhas already cancelled the football\b', 'has already canceled soccer'), (r'\bcharity football match\b', 'charity soccer game'), (r'\bfootball match\b', 'soccer game'),
    (r'\bCubs\b', 'Cub Scouts'), (r'\bpost office\b', 'mailroom'), (r'\btake a decision\b', 'make a decision'), (r'\bhall warden\b', 'RA'),
    (r'\b([Ff])ill (this|it|them) in (on|together|online|by hand|about|for|before|after|at|with|first|again)\b', r'\1ill \2 out \3'),
    (r'\bto fill in on\b', 'to fill out on'), (r'\bfill in on\b', 'fill out on'), (r'\bto fill in\b(?=[.,;)])', 'to fill out'),
    (r'\bcommunity garden plots\b', 'community gardens'), (r'\bthe whole of the holiday weekend\b', 'the whole long weekend'),
    (r'\bthe Thursday before a holiday weekend\b', 'the Thursday before a long weekend'), (r'\bThe holidays belong to my family\b', 'Christmas belongs to my family'),
    (r'\bby the lifts\b', 'by the elevators'), (r'\bthe lifts\b', 'the elevators'), (r'\bcompany a lift\b', 'company a ride'),
    (r'\bTwenty past\b', 'Twenty after'), (r'\bTen past\b', 'Ten after'), (r'\bFive past\b', 'Five after'), (r'\brailway schedule\b', 'train schedule'),
    (r'\bThe post\b(?= is)', 'The mail'), (r'\(washing, dressing\)', '(bathing, dressing)'), (r'\bwashing up\b', 'doing the dishes'),
    (r'\bthe row (he|she|they|we|you|I)\b', r'the fight \1'), (r'\ba row (turning|getting|going|starting)\b', r'a fight from \1'),
    (r'\bBiscuit\b(?=,? the family)', 'Pickles'),
    (r'\b([Aa]) GPS\b', r'\1 navigation app'), (r'\btalking therapies\b', 'talk therapies'), (r'\btalking therapy\b', 'talk therapy'),
    (r'\bTalking therapies\b', 'Talk therapies'), (r'\ba cup of tea at\b', 'a cup of tea together at'), (r' A therapist can help with strong fears\.', ''),
    (r'\bBins out\b', 'Trash out'), (r'\bBins and recycling\b', 'Trash and recycling'), (r'\bBins:', 'Trash:'), (r'\bBins\b', 'Trash'),
    (r'\bA row about\b', 'A fight about'), (r'\bbig rows\b', 'big fights'), (r'\bWashing\b(?! machine| dishes| up)', 'Laundry'), (r'\bbaby’s washing\b', 'baby’s laundry'),
    (r'\bdiapers, washing,', 'diapers, laundry,'), (r'\bhalls and shared flats\b', 'dorms and shared apartments'), (r'\bhalls and flats\b', 'dorms and apartments'),
    (r'\bholiday (fund|hour|plans|money|budget|time)\b', r'vacation \1'), (r'\btell the children off\b', 'scold the children'),
    (r'£ \(pounds\)', '$ (dollars)'), (r'\(£\)', '($)'), (r'\bgets sorted\.', 'gets dealt with.'), (r'\bsorted into groups\b', 'divided into groups'),
    (r'\bgot sorted\b', 'got settled'), (r'\bqueues\b', 'lines'), (r'\bFancy a\b', 'Want to go for a'), (r'\bmodel railway club\b', 'model train club'),
    (r'\ba missed jab\b', 'a missed shot'),
    (r'\bThe post,', 'The mail,'), (r'\bpost one parcel\b', 'mail one package'), (r'\bparcels?\b', 'package'),
    (r'\bfootball annual\b', 'soccer annual'), (r'\bwith a football\b', 'with a soccer ball'), (r'\bthe football\b(?= (in|after|on Saturday|on Sunday|practice))', 'soccer'),
    (r'\bcarers’\b', 'caregivers’'), (r'\bcarers\b', 'caregivers'), (r'\bcarer\b', 'caregiver'), (r'\bgarage-forecourt\b', 'gas-station'),
    (r'\bfish fingers\b', 'fish sticks'), (r'\bfish finger\b', 'fish stick'), (r'\bgym kit\b', 'gym clothes'), (r'\bswim kit\b', 'swimsuit'),
    (r'\bthe cricket club\b', 'the golf club'), (r'\borange squash\b', 'orange drink'), (r'\bloading her boot\b', 'loading her trunk'), (r'\bthe boot\b(?= of the car)', 'the trunk'),
    (r'\b([Tt])he friend everyone rings\b', r'\1he friend everyone calls'), (r'\bto ring\b', 'to call'), (r'\bor ring\b', 'or call'), (r'\bwho to ring\b', 'who to call'),
    (r'\bof a term\b', 'of a semester'), (r'\bdark garden\b', 'dark backyard'), (r'\bstarted quite enjoying\b', 'started to enjoy'),
    (r'\brevise\b(?= (every|for|at|tonight|on))', 'study'), (r'\bward round\b', 'hospital rounds'), (r'\bcurry and the quiz on the TV\b', 'takeout and a game show on TV'),
    # book20 (books-final9, bookqa20 round): the last British words and settings
    (r'\blasagne\b', 'lasagna'), (r'\bbarely off the drive\b', 'barely out of the driveway'), (r'\boff the drive\b', 'out of the driveway'),
    (r'“Cheers,”', '“Thanks,”'), (r'“Cheers\.”', '“Thanks.”'), (r'\bjust a moan\?”', 'just a vent?”'), (r'“Moan\.”', '“Vent.”'),
    (r'\bat the school gate\b', 'at school pickup'), (r'\bdreads the school gate\b', 'dreads school pickup'), (r'\bthe school gate\b', 'school pickup'),
    (r'\b([Ss])tepmum\b', r'\1tepmom'), (r'\b([Ss])tepmums\b', r'\1tepmoms'), (r'\bsoppy\b', 'sappy'), (r'\bfeeling a bit of a lemon\b', 'feeling a bit silly'), (r'\ba bit of a lemon\b', 'a bit silly'),
    (r'\b([Tt])he out-of-hours pharmacy\b', r'\1he late-night pharmacy'), (r'\bout-of-hours\b', 'after-hours'), (r'\bhis repeat prescription\b', 'his prescription refills'), (r'\brepeat prescriptions?\b', 'prescription refill'),
    (r'\bthought about ringing to check\b', 'thought about calling to check'), (r'\bringing to check\b', 'calling to check'), (r'\bto get on in the house\b', 'to get along in the house'),
    (r'\bI’d better get on\.', 'I’d better get going.'), (r'\bAuntie\b', 'Aunt'), (r'\bgoes home shattered\b', 'goes home exhausted'), (r'\bshattered\b(?= (and|after|by))', 'exhausted'),
    (r'\beveryone was cross\b', 'everyone was upset'), (r'\bCarers and parents\b', 'Caregivers and parents'), (r'\bCarers\b', 'Caregivers'), (r'\bfootball pitch\b', 'football field'),
    (r'\bOne bit of outside help we could ask for\b', 'One bit of help we could ask a friend or family for'), (r'\bcharity soccer game\b', 'fundraiser soccer game'),
    (r'\bTraining and support group\b', 'Training and caregiver meetup'), (r'\byou don’t have to be their therapist\b', 'you don’t have to fix anything'),
    # book20, bookqa20 round 1 (idioms the spelling rules can't see)
    (r'\bany more(?=[.”]| by anyone\b)', 'anymore'), (r'\b[Pp]ortakabin\b', 'site trailer'), (r'\bHe only clocked why\b', 'He only figured out why'), (r'\bshe clocked every\b', 'she noticed every'),
    (r'\bholdall\b', 'duffel bag'), (r'\bdoesn’t mean permanent, mind\.', 'doesn’t mean permanent.'), (r'\b([Mm])oving house\b', r'\1oving'),
    (r'\b([Hh])alf past one\b', '1:30'), (r'\bHALF PAST ONE\b', '1:30'),
    (r'\b([Hh])alf past two\b', '2:30'), (r'\bHALF PAST TWO\b', '2:30'),
    (r'\b([Hh])alf past three\b', '3:30'), (r'\bHALF PAST THREE\b', '3:30'),
    (r'\b([Hh])alf past four\b', '4:30'), (r'\bHALF PAST FOUR\b', '4:30'),
    (r'\b([Hh])alf past five\b', '5:30'), (r'\bHALF PAST FIVE\b', '5:30'),
    (r'\b([Hh])alf past six\b', '6:30'), (r'\bHALF PAST SIX\b', '6:30'),
    (r'\b([Hh])alf past seven\b', '7:30'), (r'\bHALF PAST SEVEN\b', '7:30'),
    (r'\b([Hh])alf past eight\b', '8:30'), (r'\bHALF PAST EIGHT\b', '8:30'),
    (r'\b([Hh])alf past nine\b', '9:30'), (r'\bHALF PAST NINE\b', '9:30'),
    (r'\b([Hh])alf past ten\b', '10:30'), (r'\bHALF PAST TEN\b', '10:30'),
    (r'\b([Hh])alf past eleven\b', '11:30'), (r'\bHALF PAST ELEVEN\b', '11:30'),
    (r'\b([Hh])alf past twelve\b', '12:30'), (r'\bHALF PAST TWELVE\b', '12:30'),
    (r'\bThen she put the kettle on\.', 'Then she made some tea.'), (r'\bhad put the kettle on\b', 'had made some tea'), (r'\bAfter I put the kettle on\b', 'After I make my coffee'),
    (r'\bputting the kettle on\b', 'making tea'), (r'\bputs the kettle on\b', 'makes tea'), (r'\bput the kettle on\b', 'made some tea'), (r'“Kettle time”', '“Coffee break”'),
    (r'\bdoes his tea on\b', 'makes dinner on'), (r'\bthinking about his tea\b', 'thinking about dinner'), (r'\blooking at his tea\b', 'looking at his plate'), (r'\bon the phone to\b', 'on the phone with'),
    (r'\bsent the right one round\b', 'sent the right one'), (r'\bLoads of people need more goes\.', 'Lots of people need more tries.'), (r'\bon the doormat\b', 'by the front door'), (r'“POST ME”', '“MAIL ME”'),
    (r'\bdoes the sums\b', 'does the math'), (r'\bdo the sums\b', 'do the math'), (r'\bthe sums on paper\b', 'the math on paper'), (r'\bThe sums from\b', 'The math from'), (r'\bshows the sums\b', 'shows the math'), (r'\bthe sums\b', 'the math'),
    (r'\bin her lunch break between a sausage roll and a yoghurt\b', 'on her lunch break between a granola bar and a yogurt'), (r'\byoghurts?\b', 'yogurt'), (r'\bin (her|his|their|my|your) lunch break\b', r'on \1 lunch break'),
    (r'\bwe’ll sort it\b', 'we’ll deal with it'), (r'\bcare homes\b', 'nursing homes'), (r'\bcare home\b', 'nursing home'), (r'\bThe one with the consultant\b', 'The one with the specialist'),
    (r'\bI came across cross\b', 'I came across as angry'), (r'\bdoesn’t mean I’m cross\b', 'doesn’t mean I’m upset'), (r'\bMy period isn’t cross\.', 'My period isn’t angry.'),
    (r'\bthe same row\b', 'the same fight'), (r'\bits own small row\b', 'its own small argument'), (r'\bSunday-evening row\b', 'Sunday-evening argument'), (r'\bin and out of hospital\b', 'in and out of the hospital'),
    (r'\bunrecognised\b', 'unrecognized'), (r'\bcruellest\b', 'cruelest'), (r'\bone proper meal\b', 'one real meal'), (r'\ba proper (conversation|talk|chat)\b', r'a real \1'),
    (r'\bon the top deck of the 38\b', 'at the back of the 38 bus'), (r'\bon the top deck of the 8:10\b', 'at the back of the 8:10 bus'), (r'\btop deck\b', 'back of the bus'),
    (r'\bRing Gran\b', 'Call Grandma'), (r'\bGran\b', 'Grandma'), (r'“Lovely to see you\. I’d better get (on|going)\.', '“Great to see you. I’d better get going.'),
    (r'\buntil the bell goes\b', 'until the bell rings'), (r'\bby the railings\b', 'by the fence'), (r'\b([Ww])ardrobes?\b', lambda m: m.group(1).replace('W', 'D').replace('w', 'd') + 'resser'),
    (r'\byou cut someone up\b', 'you cut someone off'), (r'\ba lime and soda\b', 'a club soda with lime'), (r'\bgoes home exhausted\b', 'goes home wiped out'), (r'\bon the bypass\b', 'on the highway'),
    (r'\bIdeas, or just a (moan|vent)\?', 'Ideas, or do you just need to vent?'), (r'\ba hospital rounds\b', 'hospital rounds'), (r'\bsoccer annual\b', 'soccer book'), (r'\bPost and home email\b', 'Mail and home email'),
    (r'\bI can’t do tonight x\.', 'I can’t do tonight.'), (r'\bon the sofa\b', 'on the couch'), (r'\bcould you just pop that in an email\b', 'could you put that in an email'), (r'\bpop (it|that|this) in\b', r'put \1 in'),
    (r'\bleft on the side\b', 'left on the counter'), (r'\bOn a train out of Sheffield\b', 'On a train out of Philadelphia'), (r'\bdown the carriage\b', 'down the car'), (r'“Hiya!', '“Hi!'),
    (r'\bFetching a member of staff\b', 'Getting a staff member'), (r'\bThen came the fundraiser\b', 'Then came the fundraiser'),
    (r'\bFish fingers\b', 'Fish sticks'), (r'\bcome and find you at half past\.', 'come and find you in half an hour.'), (r'\bat half past\.', 'in half an hour.'),
    (r'\blike a lens any more,', 'like a lens anymore,'), (r'\bYou finish your tea\b', 'You finish your coffee'), (r'\bTherapists call this exposure\.', 'Psychologists call this exposure.'),
    # book20, bookqa20 round 2: grammar left by earlier swaps, and the last idioms
    (r'\b([Aa]) assistant principal\b', r'\1n assistant principal'), (r'\bat a indoor\b', 'at an indoor'), (r'\bthe trash are the surface\b', 'the trash is the surface'),
    (r'\bfrom noticing they’re full to putting them out\b', 'from noticing it’s full to putting it out'), (r'\bthe rows often feel\b', 'the fights often feel'),
    (r'\b(second|two|three|four|five|six) (weeks?|days?|nights?|months?|times?) running\b', r'\1 \2 in a row'), (r'\bstopped him getting on\b', 'kept him from getting on'),
    (r'\bslept on the settee and had stopped answering the phone to his friends\b', 'slept on the couch and had stopped answering his friends’ calls'), (r'\bsettee\b', 'couch'),
    (r'\bgetting properly cross\b', 'getting really frustrated'), (r'\bI’ll come and get you at five to\b', 'I’ll come and get you in five minutes'), (r'\bcomes round\b', 'comes around'),
    (r'\bWhen one of you is sick\b(?! or)', 'When one of you is sick or disabled'), (r'\bcrosser\b', 'angrier'), (r'“I’ve a different view\b', '“I have a different view'), (r'\bthe only reason she turns up\b', 'the only reason she shows up'),
    (r'\bbites his head off, properly,', 'bites his head off,'), (r'\bshop door\b', 'store door'), (r'\bnight-time\b', 'nighttime'), (r'\b([Ss])tep-parent', r'\1tepparent'),
    # book20, bookqa20 round 3: shop, round, cross, tea (meal), tick
    (r'\bhardware shop\b', 'hardware store'), (r'\bgoing to the shop\b', 'going to the store'), (r'\bOnline shop, ', 'Online grocery order, '), (r'\b([Bb])ig food shop\b', r'\1ig grocery run'),
    (r'\bSaturday’s shop\b', 'Saturday’s grocery run'), (r'\bthe Sunday shop\b', 'the Sunday grocery run'), (r'\bin a shop\b', 'in a store'), (r'\bthe noisy shop\b', 'the noisy store'), (r'\bfood shop\b', 'grocery run'),
    (r'\bthe jobs round people’s\b', 'the jobs around people’s'), (r'\bgoing round\b', 'going around'), (r'\btalking it round\b', 'talking it through'), (r'\bdrop dinner round\b', 'drop dinner off'),
    (r'\bbuilt round\b', 'built around'), (r'\bthe other way round\b', 'the other way around'),
    (r'\bI’m too cross to\b', 'I’m too angry to'), (r'\btired, cross message\b', 'tired, irritated message'), (r'\bextra close or cross\b', 'extra close or cranky'),
    (r'\bAfter tea, at\b', 'After dinner, at'), (r'\bFriday tea together\b', 'Friday dinner together'), (r'\bTick the ones\b', 'Check the ones'), (r'\bThe cross goes next to\b', 'The ✗ goes next to'),
    (r'\bwith the sums laid out\b', 'with the math laid out'),
    (r'\bTick a job\b', 'Check off a job'), (r'\beach ticked job\b', 'each checked job'), (r'\bif you tick\b', 'if you check'), (r'\bcan tick off\b', 'can check off'), (r'\btick off\b', 'check off'),
    (r'\b([Tt])ick\b(?= (the|a|each|every|one|it|them|this|that|your|any|whichever|what|which|yes|no|“))', lambda m: ('C' if m.group(1) == 'T' else 'c') + 'heck'), (r'\bticked\b', 'checked'),
    (r'\bgoes round and round\b', 'goes around and around'), (r'\bround and round\b', 'around and around'), (r'\band round again\b', 'and around again'), (r'^round again\b', 'around again'), (r'\bslightly better tea\b', 'slightly better dinner'),
]


def _n(w):
    return {'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5, 'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10, 'eleven': 11, 'twelve': 12,
            'twenty': 20, 'twenty-five': 25}[w.lower()]


def _num(w):
    return str(_n(w))


def _half(m):
    s = '%s thirty' % m.group(2)
    return s[0].upper() + s[1:] if m.group(1) == 'H' else s


def _grade(n):
    g = max(n - 1, 0)
    names = ['kindergarten', 'first grade', 'second grade', 'third grade', 'fourth grade', 'fifth grade', 'sixth grade', 'seventh grade',
             'eighth grade', 'ninth grade', 'tenth grade', 'eleventh grade', 'twelfth grade']
    return names[g] if g < len(names) else 'twelfth grade'


_P = [(re.compile(a), b) for a, b in P]

# US quote punctuation: periods and commas go inside closing quotes
_QDOUBLE = re.compile(r'”([.,])')


def _quotes(t):
    # a quotation that already ends in ? or ! takes no extra period or comma
    t = re.sub(r'([?!])”[.,]', r'\1”', t)
    t = _QDOUBLE.sub(r'\1”', t)
    # a closing single quote only when a matching opening ‘ came earlier in the same run of text (never an apostrophe)
    out, depth = [], 0
    i = 0
    while i < len(t):
        c = t[i]
        if c == '‘':
            depth += 1
        elif c == '’' and depth > 0 and (i + 1 == len(t) or not t[i + 1].isalpha()):
            depth -= 1
            if i + 1 < len(t) and t[i + 1] in '.,':
                out.append(t[i + 1])
                out.append('’')
                i += 2
                continue
        out.append(c)
        i += 1
    return ''.join(out)


_URL = re.compile(r'(https?://\S+|\b[\w.-]+\.(?:com|org|net|io|pub|gov|edu|uk|co)\b[\w./?#=&%-]*|\S+@\S+)')
MONEY = [True]  # listing_kdp.py and kdp_steps.py name UK marketplace prices in pounds on purpose: they run with MONEY[0] = False


def us(t):
    """American English for plain text (web addresses are left alone)"""
    if not t or not t.strip():
        return t
    parts = _URL.split(t)
    if len(parts) > 1:
        return ''.join(p if i % 2 else _us(p) for i, p in enumerate(parts))
    return _us(t)


# book26 (wave 27): the site-wide British spelling list (tools/checks/us-english-words.json, kept by the us-english check) is applied too,
# plus a few phrases (day-month dates, "ten to seven", "out of the window").
_BSJ = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'checks', 'us-english-words.json')
try:
    _WJ = json.load(open(_BSJ, encoding='utf-8'))
    _BS = {k.lower(): v for k, v in _WJ.get('britishSpellings', {}).items() if k.lower() != v.lower()}
    # the plain one-word entries of the "british" list too (acknowledgement, counsellor, pavement, ...)
    for _x in _WJ.get('british', []):
        _m = re.fullmatch(r"\\b([A-Za-z]+)\\b", _x.get('re', ''))
        if _m and re.fullmatch(r"[A-Za-z' -]+", _x.get('fix', '')) and _m.group(1).lower() != _x['fix'].lower():
            _BS.setdefault(_m.group(1).lower(), _x['fix'])
except Exception:
    _BS = {}
_BS.setdefault('acknowledgements', 'acknowledgments')
_BSRX = re.compile(r'\b(' + '|'.join(sorted((re.escape(k) for k in _BS), key=len, reverse=True)) + r')\b', re.I) if _BS else None
_MON = 'January|February|March|April|May|June|July|August|September|October|November|December'
_DATE = re.compile(r'\b(\d{1,2}) (' + _MON + r')( \d{4})?\b')
_TIMEOF = re.compile(r'\b(at|by|until|around|about|before|after) (five|ten|twenty|twenty-five|quarter) to (one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)\b')


def _bs(m):
    w = m.group(1); v = _BS[w.lower()]
    return _case(w, v)


_HRS = ['one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve']
_MIN = {'five': 55, 'ten': 50, 'twenty': 40, 'twenty-five': 35, 'quarter': 45}


_TIMEOF2 = re.compile(r'\b(Five|Ten|Twenty|Twenty-five|Quarter|five|ten|twenty|twenty-five|quarter) to (one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)(?=[.,;:!?”\"])')


def _timeof2(m):
    h = (_HRS.index(m.group(2)) + 11) % 12 + 1
    return '%d:%02d' % (h, _MIN[m.group(1).lower()])


def _timeof(m):
    h = (_HRS.index(m.group(3)) + 11) % 12 + 1
    return '%s %d:%02d' % (m.group(1), h, _MIN[m.group(2)])


def _more(t):
    if _BSRX:
        t = _BSRX.sub(_bs, t)
    t = _DATE.sub(lambda m: '%s %s%s' % (m.group(2), m.group(1), (',' + m.group(3)) if m.group(3) else ''), t)
    t = _TIMEOF.sub(_timeof, t)
    t = _TIMEOF2.sub(_timeof2, t)
    t = t.replace('different units, miles and kilometers, for the same distance', 'different units for the same distance')
    t = re.sub(r'\bout of the window\b', 'out the window', t)
    t = re.sub(r'\b(a|one|the) warm line\b', r'\1 warm sentence', t)
    return t



def _us(t):
    if not t or not t.strip():
        return t
    for rx, rep in _P:
        if not MONEY[0] and ('£' in rx.pattern or 'pounds' in rx.pattern or 'pence' in rx.pattern):
            continue
        t = rx.sub(rep, t)
    t = _WORDS.sub(_words, t)
    t = _ISE.sub(_ise, t)
    t = _more(t)
    t = _quotes(t)
    return t


# research titles, venues and authors keep their published spelling; the plain-words findings are ours and are converted
_SKIP = re.compile(r'<(script|style|code|pre)\b.*?</\1>|<span class="pe-ref-[atv]">.*?</span>|<cite\b.*?</cite>|<p class="sn-src">.*?</p>', re.S)


def _title_punct(g):
    """a published title keeps its spelling; its quotation marks follow US style (double quotes, period inside)"""
    g = re.sub(r'(?<![“\w])‘([^’“”]{2,120})’(?!\w)', r'“\1”', g)
    g = re.sub(r'\s*—\s*', ': ', g)  # no dashes as dashes, even in a title: a colon does the same job
    g = re.sub(r'(?<=[a-z])–(?=[a-z])', '-', g)
    return _quotes(g)


def us_html(h):
    """American English for the text of an HTML fragment; tags, attributes, scripts, styles and reference lists are left alone"""
    out, last = [], 0
    for m in _SKIP.finditer(h):
        out.append(_us_text_nodes(h[last:m.start()]))
        g = m.group(0)
        if g.startswith('<span class="pe-ref-t">'):
            g = _title_punct(g)  # spelling as published; US quote punctuation only
        out.append(g)
        last = m.end()
    out.append(_us_text_nodes(h[last:]))
    return ''.join(out)


def _us_text_nodes(h):
    parts = re.split(r'(<[^>]*>)', h)
    # join the text of an element run so phrases that cross an inline tag still match: convert each text piece, then
    # a second pass over the joined text catches quote punctuation split by a closing tag (”</strong>.)
    parts = [p if p.startswith('<') else us(p) for p in parts]
    s = ''.join(parts)
    s = re.sub(r'”((?:</(?:strong|em|b|i|a|span)>)+)([.,])', r'\2”\1', s)
    return s


def convert_json(s):
    """converts JSON string values in place in the raw text, so the file's own formatting is kept; only strings with a
    space in them (prose) are touched, never keys or ids"""
    def rep(m):
        raw = m.group(1)
        if m.group(2):
            return m.group(0)
        val = json.loads(raw)
        if ' ' not in val:
            return raw
        new = us_html(val) if '<' in val else us(val)
        if new == val:
            return raw
        enc = json.dumps(new, ensure_ascii=('\\u' in raw))
        return enc
    # a string followed by a colon is a key (group 1 catches it)
    return re.sub(r'("(?:[^"\\]|\\.)*")(\s*:)?', rep, s)


def convert_py(src):
    """only string literals with a space in them (prose); code, keys, ids and regexes are left alone"""
    toks = list(tokenize.generate_tokens(io.StringIO(src).readline))
    lines = src.splitlines(keepends=True)
    edits = []
    for t in toks:
        if t.type != tokenize.STRING:
            continue
        s = t.string
        m = re.match(r'^([rRbBuUfF]*)(\'\'\'|"""|\'|")', s)
        prefix, q = m.group(1), m.group(2)
        if 'r' in prefix.lower() or 'b' in prefix.lower():
            continue
        body = s[len(prefix) + len(q):-len(q)]
        if ' ' not in body or re.match(r'^\s*[.#\[\]()\\^$*+?{}|]', body):
            continue
        new = us_html(body) if '<' in body else us(body)
        if new != body:
            edits.append((t.start, t.end, prefix + q + new + q))
    if not edits:
        return src
    off = [0]
    for ln in lines:
        off.append(off[-1] + len(ln))
    out = src
    for (sr, sc), (er, ec), rep in sorted(edits, key=lambda e: e[0], reverse=True):
        a, b = off[sr - 1] + sc, off[er - 1] + ec
        out = out[:a] + rep + out[b:]
    return out


def convert_file(path, check=False):
    src = open(path, encoding='utf-8').read()
    if path.endswith('.json'):
        new = convert_json(src)
        json.loads(new)
    elif path.endswith('.py'):
        new = convert_py(src)
    else:
        new = us_html(src)
    if new == src:
        return 0
    n = sum(1 for a, b in zip(src.splitlines(), new.splitlines()) if a != b)
    if not check:
        open(path, 'w', encoding='utf-8').write(new)
    return n


if __name__ == '__main__':
    check = '--check' in sys.argv
    if '--keep-pounds' in sys.argv:
        MONEY[0] = False
    tot = 0
    for p in [a for a in sys.argv[1:] if not a.startswith('--')]:
        n = convert_file(p, check)
        if n:
            print('%5d lines  %s' % (n, p))
        tot += n
    print('total lines changed:', tot, '(check only)' if check else '')
