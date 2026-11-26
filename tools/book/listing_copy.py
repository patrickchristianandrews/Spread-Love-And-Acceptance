#!/usr/bin/env python3
"""listing_copy.py: the Amazon store words for every title, in one place (listing26).

The three package builders read their descriptions, keywords and categories from here:
tools/book/listing_kdp.py (the series), tools/kids/make_package.py (the Frequency Buddies books) and
tools/adultcolor/make_package.py (Color and Breathe). tools/book/listing_guide.py prints all of it as one guide.

How the words are chosen, so shoppers who search for books like these find them:
- Amazon's search reads the title, the subtitle, the 7 keyword boxes and the categories most. The keywords use the
  phrases people type for this kind of book (for example "mental load", "social emotional learning", "mindfulness
  coloring"), never another author's name, a brand or a trademark, and never a word that is already in the title,
  subtitle or series name (Amazon counts those already, so repeating them wastes a box).
- Each box holds one natural phrase of up to 50 characters, with as many different useful words as fit.
- The description opens with the moment the book is about, then says plainly what is inside and what makes the book
  different from others like it. It uses no reviews, no prices, no web addresses and no claims like "best".
House rules: American English, no dashes as punctuation, no semicolons.
"""

# ------------------------------------------------------------------ what every book in the adult series shares
SERIES_DIFFERENT = [
    'Plain words and everyday scenes. Every idea is shown in an ordinary moment you will recognize, then explained in language anyone can follow.',
    'Quickly, then slowly. Each chapter looks at one moment fast, from the surface down to its roots, then slows down and takes each layer in turn.',
    'It looks at the setup, never at the person. Nobody is cast as the villain, and nothing labels or diagnoses anyone.',
    'Ready to use the same day: words you could say, common mix-ups, one small thing to try this week, and workpapers to fill in.',
    'Room for everyone. Neurodivergent minds and the different rules people learn from family, faith and culture are part of the picture throughout.',
    'More to read, free. Each chapter has a code that opens an expanded version online, with the research, more examples and more to try.',
    'Three friendly characters, Professor Puddles, Tidbit and Sugarfoot, drop in with hints on the lighter pages. The pups also star in a set of children’s books, so a whole family can share the same calm words.',
]

SERIES = {
    'book-1-know-yourself-kindly': {
        'hook': 'Why do you react the way you do? This book helps you find out, gently, one layer at a time.',
        'body': [
            'Some of it started long before today: the home you grew up in, the rules nobody wrote down, the things life taught you to expect. Some of it is how you are wired, how much noise, change and talk you can take in before it costs you. And some of it is simply the week you are having. Know Yourself Kindly helps you tell these apart, so you can stop blaming yourself for the wrong thing and start changing the right one.',
            'In plain words, it explains how feelings work and why they show up in the body first, why your worth is not a score you have to earn, why personality is more like a set of sliders than a box, and how minds work differently, from ADHD and autism to sensory and learning differences. Then it helps you choose who you want to become, one small, doable step at a time.',
        ],
        'inside': ['Where your way of seeing came from: home, the rules nobody wrote down, and what life taught you',
                   'Your wiring, your weather and your words: what you can take in, what you need, and what lands',
                   'How feelings work, and how naming them helps you hold them',
                   'Self-worth and shame, and a kinder inner voice',
                   'Personality and temperament as sliders, not boxes',
                   'Minds that work differently: ADHD, autism, sensory and learning differences, and meeting in the middle',
                   'Who you are becoming: one small goal and a kind monthly look at yourself',
                   'A closing spread of every free tool and workpaper, with a code for each'],
        'different': ['It separates three things people often mix up: your history, your wiring and your current weather, because each one needs a different kind of care.'],
        'cats': ['Books › Self-Help › Personal Transformation', 'Books › Self-Help › Emotions', 'Books › Health, Fitness & Dieting › Psychology & Counseling › Personality'],
        'alt': ['Books › Self-Help › Self-Esteem', 'Books › Health, Fitness & Dieting › Mental Health › Neuropsychology', 'Books › Self-Help › Happiness'],
        'kw': ['self discovery and self compassion for adults', 'understanding emotions and how feelings work', 'self esteem healing shame and the inner critic',
               'adult adhd autism and sensory processing', 'childhood patterns family rules and upbringing', 'personality traits temperament introvert',
               'personal growth habits small steps beginners'],
    },
    'book-2-heal-and-steady': {
        'hook': 'Some days are heavy. This book helps you get your balance back, gently and without blame.',
        'body': [
            'Pressure piles up until a missing shoe sets off an argument. Anger flares hot and fast. Worry keeps you awake, low mood drains the color from things, or a loss changes everything. Heal and Steady explains what is going on inside you in plain words, and gives you small, practical things to try in the moment and over time.',
            'It covers what stress does to the body and why it adds up, what anger is for and what helps in the hot minutes, and how worry, low mood and trauma work. It walks with you through grief in its many forms, including the losses nobody sees, through repair and apologies that land, and through the slow work of change. It ends with what matters most to you, and what a good life can mean.',
        ],
        'inside': ['Stress, the ladder from calm to flooded, and rest that helps', 'Anger: what it is for, and what helps in the hot minutes', 'Worry, low mood and trauma, and what helps',
                   'Grief in waves, and the losses nobody sees', 'Repair, the six parts of an apology, and what forgiveness does and does not mean',
                   'Habits and change, one small step at a time', 'Values, meaning and a good life', 'A closing spread of every free tool and workpaper, with a code for each'],
        'different': ['It gives you two kinds of help for every hard feeling: a short step you can use while you are upset, and the bigger picture for when you are calm again.',
                      'It treats grief broadly: a death, a breakup, a move, a friendship that faded, or a future that did not happen.'],
        'cats': ['Books › Self-Help › Stress Management', 'Books › Self-Help › Anger Management', 'Books › Self-Help › Death & Grief › Grief & Bereavement'],
        'alt': ['Books › Self-Help › Anxieties & Phobias', 'Books › Self-Help › Emotions', 'Books › Health, Fitness & Dieting › Mental Health › Depression'],
        'kw': ['burnout and feeling overwhelmed self help', 'anxiety relief and calming racing thoughts', 'grief after a death divorce or breakup',
               'temper irritability and emotional regulation', 'how to apologize forgive and rebuild trust', 'trauma depression and gentle self care',
               'resilience and coping skills for hard times'],
    },
    'book-3-understanding-each-other': {
        'hook': 'Two people can care about each other deeply and still fall out of tune.',
        'body': [
            'One wants to talk now, and the other needs an hour. A short text lands cold. A wave goes unreturned, and a whole story writes itself in a second. Understanding Each Other is about the people around you: partners, families, friends, coworkers and every group you are part of.',
            'It explains how communication really works and where it slips, why two people can see the same moment so differently, why we need to belong, how trust grows and how it is rebuilt, how love takes many forms, and how groups quietly pull us along. It ends with how to help someone you care about well, with kind limits and without burning out.',
        ],
        'inside': ['Why we fall out of tune, and how to get back', 'How communication works: meaning, tone, listening and repair', 'How we see each other: perception, shortcuts and the stories we tell',
                   'Attachment, trust and belonging', 'Closeness and love in many forms', 'Groups, influence and disagreeing kindly', 'Helping others well, without burning out',
                   'A closing spread of every free tool and workpaper, with a code for each'],
        'different': ['It explains both sides of a misunderstanding, so neither person has to be wrong for things to get better.',
                      'It works for every kind of relationship: couples, parents and kids, siblings, friends, roommates, coworkers and teams.'],
        'cats': ['Books › Self-Help › Communication & Social Skills', 'Books › Parenting & Relationships › Marriage & Adult Relationships', 'Books › Self-Help › Relationships › Interpersonal Relations'],
        'alt': ['Books › Parenting & Relationships › Family Relationships', 'Books › Health, Fitness & Dieting › Psychology & Counseling › Social Psychology & Interactions', 'Books › Self-Help › Relationships › Love & Romance'],
        'kw': ['communication skills for couples and families', 'how to stop arguing and listen better', 'neurodivergent relationships adhd and autism',
               'attachment styles and rebuilding trust', 'conflict resolution and repair after a fight', 'empathy perspective taking and bias',
               'peer pressure team dynamics and friendship'],
    },
    'book-4-share-the-load': {
        'hook': 'Every shared home runs on work that nobody sees.',
        'body': [
            'Noticing the shoes are too small. Booking the dentist. Remembering trash day, the birthday card, the permission slip. When this invisible work goes uncounted, one person ends up carrying far more than anyone realizes, and resentment grows quietly on both sides.',
            'Share the Load helps you see the whole load together, kindly and without keeping score. It gives you a simple way to check whether the way you split the work can last, shows how much of a blowup is really leftover stress, helps you agree on what fair means to each of you, and sets up a gentle monthly look-back that catches what weekly chats miss.',
        ],
        'inside': ['The mental load, made visible: the noticing, planning and remembering', 'Is the split working? A simple setup score you fill in together', 'Full stress tanks, and seven angles on the same moment',
                   'Two kinds of fair, and letting words land', 'The monthly look-back', 'How the numbers work, in plain arithmetic', 'An afterword that draws the series together',
                   'A closing spread of every free tool and workpaper, with a code for each'],
        'different': ['It counts the thinking work, the noticing, planning and remembering, alongside the chores themselves.',
                      'The setup score is filled in from both people’s own notes, so nobody has to win an argument about who does more.',
                      'It works for couples, families, roommates, co-parents and teams.'],
        'cats': ['Books › Parenting & Relationships › Marriage & Adult Relationships', 'Books › Parenting & Relationships › Family Relationships', 'Books › Self-Help › Time Management'],
        'alt': ['Books › Self-Help › Relationships', 'Books › Business & Money › Management & Leadership › Teams', 'Books › Parenting & Relationships › Parenting › Parenting Skills'],
        'kw': ['mental labor and invisible chores in marriage', 'dividing household chores equally as a couple', 'chore chart for families and roommates',
               'household management for working parents', 'resentment over housework and burnout', 'equal partnership and domestic labor',
               'co parenting and family meeting planner'],
    },
    'workbook': {
        'hook': 'Every workpaper from the series, bound together on big pages with plenty of room to write.',
        'body': [
            'Inside are blank copies of all ten workpapers: a quick check of how much you are carrying, a calm-down plan you make on a calm day, a self-check before you reply to something that stung, a 90-second daily check-in, a one-week log of who did what, a list that gives every job one owner, a monthly look-back, and more, plus a paper version of the setup score with the math laid out.',
            'Use it with the four books or on its own, alone or together, for a week or for a whole six-week program.',
        ],
        'different': ['Each workpaper opens with a short guide: when to use it, how long it takes, who fills it in, and which book explains it.',
                      'The sheets describe what happened, never who someone is. On shared sheets each person writes only their own rows.',
                      'Spare copies for the weeks ahead and a six-week planner carry you through a whole program.'],
        'cats': ['Books › Self-Help › Relationships', 'Books › Parenting & Relationships › Marriage & Adult Relationships', 'Books › Self-Help › Communication & Social Skills'],
        'alt': ['Books › Self-Help › Stress Management', 'Books › Parenting & Relationships › Family Relationships', 'Books › Self-Help › Personal Transformation'],
        'kw': ['relationship worksheets for couples', 'couples communication exercises and prompts', 'chore chart and family meeting planner',
               'adult self help workbook and journaling prompts', 'calm down plan and emotional check in journal', 'mental load tracker for household tasks',
               'weekly check in log and printable worksheets'],
    },
    'pocket': {
        'hook': 'Why did they react like that? Most reactions that look odd, rude or over the top make sense once you can see the logic behind them.',
        'body': [
            'A friend leaves the party without a goodbye. A colleague’s feedback lands like a slap. Someone says “I’m fine” when they plainly aren’t. This pocket guide takes thirty-eight everyday reactions like these and lays out the reasoning behind each one, step by step, on a single page.',
            'Some pages explain neurodivergent logic for people who don’t share it, such as headphones at dinner or a long talk about one interest. Some explain common social habits in plain logic for anyone who finds them baffling, such as small talk, white lies, hints and “Let’s get coffee sometime.” Many cover things anyone does, like snapping when hungry or going quiet in an argument. A short section on “different rulebooks” looks at habits learned in a particular family, place or generation.',
        ],
        'different': ['It runs both ways. Neurodivergent logic is explained for people who don’t share it, and common social habits are explained for people who find them baffling.',
                      'One situation per page, always in the same order, so it is quick to look something up in the moment.',
                      'Every page shows the other person’s side too, with one sentence you could say and one small step.',
                      'Logic explains a reaction. It never excuses harm, and the pages say so where it matters.',
                      'Small enough to keep in a bag or by the bed.'],
        'cats': ['Books › Self-Help › Communication & Social Skills', 'Books › Health, Fitness & Dieting › Psychology & Counseling › Social Psychology & Interactions',
                 'Books › Self-Help › Relationships › Interpersonal Relations'],
        'alt': ['Books › Health, Fitness & Dieting › Mental Health › Neuropsychology', 'Books › Parenting & Relationships › Family Relationships', 'Books › Self-Help › Emotions'],
        'kw': ['understanding autistic adults and neurodiversity', 'unwritten social rules and hidden expectations', 'adhd and autism in relationships and friendship',
               'small talk white lies and hints explained', 'cross cultural communication differences', 'empathy and perspective taking for adults',
               'why someone shuts down or goes quiet in a fight'],
    },
    'boxset': {
        'hook': 'The whole series in one Kindle edition: four books and a pocket guide, for yourself and the people you share a life with.',
        'different': ['Five books that each stand on their own, with one contents page for all of them.'] + SERIES_DIFFERENT[:6],
        'kw': ['self help box set for adults', 'relationship guides for couples and families', 'emotional intelligence and self compassion',
               'mental load and household chores', 'communication skills and listening', 'neurodiversity adhd and autism at home', 'stress anger anxiety and grief'],
    },
}

# ------------------------------------------------------------------ the Frequency Buddies books (children)
KIDS = {
    'picture-book': {
        'html': (
            '<p><b>Tidbit zooms. Sugarfoot strolls. And today Tidbit is sure she can carry the whole picnic basket all by herself.</b></p>'
            '<p>Then her paws get buzzy, her ears get hot, and a little gray cloud of Static floats in the door. Big feelings have arrived. With help from Professor Puddles and a hill full of friends, '
            'Tidbit learns to notice what her body is telling her, take a calm-down breath, ask for a hand, and say sorry when she bumps the basket.</p>'
            '<p>A warm, funny read-aloud with rhymes and repeating lines that children join in on, and a calm-down trick small hands can copy anywhere: smell the flower, blow the candle.</p>'
            '<p><b>What makes this book different</b></p><ul>'
            '<li>Feelings become something children can see: buzzy paws for revved up, heavy paws for worn out, and soft, funny clouds of Static that only want a friend.</li>'
            '<li>It teaches the whole repair, start to finish: notice, breathe, ask, say sorry in three steps, and make it right.</li>'
            '<li>Teamwork kids can picture: one job each, and the heavy basket gets light.</li>'
            '<li>One pup is fast and one is slow, and the story treats both as just right.</li>'
            '<li>The last pages give grown-ups a breathing page to do together, a find-and-count page, and simple questions and words to use after the story.</li>'
            '</ul>'
            '<p>40 full-color pages, 8.5 x 8.5 inches. For ages 4 to 7, preschool through second grade, at home, at bedtime or in the classroom.</p>'
            '<p><b>Part of The Frequency Buddies Books.</b> Tidbit and Sugarfoot also star in a chapter book for ages 9 to 12 and two coloring books, and they drop in on a series of books for grown-ups, so a whole family can share the same calm words.</p>'),
        'kw': ['social emotional learning picture book preschool', 'calm down breathing for kids anger and worry', 'teamwork taking turns and asking for help',
               'apologizing and making amends kindergarten', 'dog friends picture book ages 4 5 6 7', 'emotional regulation body signals children',
               'kindness friendship bedtime book for kids'],
    },
    'chapter-book': {
        'html': (
            '<p><b>Wren Alvarez has one rule about her bedroom, written in glitter pen on the door: KNOCK FIRST.</b></p>'
            '<p>Then Grandpa Lou moves in, her room becomes his, and Wren ends up sharing with her little brother Theo, who wears headphones at dinner, counts ceiling tiles when things get loud, and takes everything exactly the way it is said.</p>'
            '<p>At the same time, the group chat blows up. One word, “fine,” lands like a slap. A group project turns into a shouting match. And the one person Wren most needs to say sorry to may need some room first.</p>'
            '<p>Funny, warm and honest, this is a middle grade story about the noise of growing up: a crowded house, misread messages, a brother who is wired differently, and feelings that come out louder than you mean them to. With two dogs named Tidbit and Sugarfoot, and a grandfather who has opinions about the weather.</p>'
            '<p><b>What makes this book different</b></p><ul>'
            '<li>It treats texting like real life, because for kids it is: how one word can sound like a slap, and how to ask “Did you mean it like that?” before it turns into a fight.</li>'
            '<li>Theo is wired differently, and both sides learn each other’s language with respect, with no labels and without making him the problem.</li>'
            '<li>It shows a whole apology from start to finish, with three things to say and time to let it land.</li>'
            '<li>It makes the invisible work at home visible to kids: a fair share includes the remembering as well as the chores.</li>'
            '<li>A short “Try this” box ends every chapter, and a page for grown-ups closes the book, so it works for a reader alone, a parent and child, or a class.</li>'
            '</ul>'
            '<p>Eleven short chapters, about 16,000 words, with a picture at the start of each. For ages 9 to 12, grades 4 to 7, with no scary parts.</p>'
            '<p><b>Part of The Frequency Buddies Books.</b> Tidbit and Sugarfoot also star in a read-aloud picture book and two coloring books.</p>'),
        'kw': ['middle grade realistic fiction family friendship', 'texting misunderstandings online drama tweens', 'grandparent moves in multigenerational family',
               'neurodivergent sibling sharing a bedroom', 'apology repair conflict resolution kids 9 12', 'emotions coping skills and anger for tweens',
               'social emotional learning novel grades 4 to 7'],
        'cats': [('Children\'s Books > Growing Up & Facts of Life > Friendship, Social Skills & School Life', 'Children\'s Books > Growing Up & Facts of Life > Emotions & Feelings'),
                 ('Children\'s Books > Growing Up & Facts of Life > Family Life > Multigenerational', 'Children\'s Books > Growing Up & Facts of Life > Family Life'),
                 ('Children\'s Books > Growing Up & Facts of Life > Family Life > Siblings', 'Children\'s Books > Literature & Fiction > Social & Family Issues')],
    },
    'coloring-younger': {
        'html': (
            '<p><b>Thirty-two big, joyful pictures of Tidbit and Sugarfoot, two puppy best friends, for little hands and chunky crayons.</b></p>'
            '<p>Zoom across a hill, give a free hug, splash in a puddle, fly a kite, blast off in a rocket, build a pillow fort and tuck in for the night. Every page is one happy scene with thick, clear lines and big open spaces, so young children can stay inside the lines and feel proud of what they made.</p>'
            '<p><b>What makes this book different</b></p><ul>'
            '<li>A blank page behind every picture, so markers do not soak through onto the next one, and every finished page can go on the fridge.</li>'
            '<li>A short, funny line from the pups on each page, for a grown-up to read aloud.</li>'
            '<li>Find-it games on some pages: find the hearts, the bones, the ball, the stars and more.</li>'
            '<li>A meet-the-friends page and a color-test page at the start, and a Great Job certificate to sign at the end.</li>'
            '<li>The same pups star in a read-aloud story about big feelings, so coloring can lead into talking.</li>'
            '</ul>'
            '<p>68 pages, 8.5 x 11 inches, black-and-white line art. For ages 3 to 7, preschool through second grade.</p>'
            '<p><b>Part of The Frequency Buddies Books.</b></p>'),
        'kw': ['coloring book for toddlers and preschoolers', 'puppy dog coloring book kids ages 3 to 7', 'easy thick lines crayons kindergarten',
               'single sided coloring sheets no bleed through', 'hidden objects search activity for kids', 'cute animals best friends gift for girls boys',
               'screen free quiet time activity preschool'],
    },
    'coloring-older': {
        'html': (
            '<p><b>Thirty-two detailed, cozy scenes to color slowly, with a short calm prompt on every page.</b></p>'
            '<p>Visit a lighthouse, a treehouse, a rainy window, a night garden, a sleepy town, a carnival and a snow globe with Tidbit and Sugarfoot. Each scene is drawn in layers, with fine lines, mandalas, tangle patterns, decorative borders and tiny hidden hearts and paw prints to spot as you go.</p>'
            '<p>Made for kids who have outgrown simple coloring books and want something that takes time, focus and fine-tipped pens.</p>'
            '<p><b>What makes this book different</b></p><ul>'
            '<li>A calm prompt on every page ties the picture to a breath, such as “Breathe in while the light turns. Breathe out as it passes.” It turns coloring into a simple, screen-free way to settle down.</li>'
            '<li>Intricate areas sit beside open spaces, so every page stays relaxing to finish.</li>'
            '<li>A blank page behind every picture, so markers do not soak through.</li>'
            '<li>A meet-the-friends page, a color-test page, a note before you begin and a certificate at the end.</li>'
            '<li>A companion to <i>Turn Down the Static</i>, a chapter book for the same ages.</li>'
            '</ul>'
            '<p>68 pages, 8.5 x 11 inches, black-and-white line art. For ages 8 to 12, grades 3 to 7.</p>'
            '<p><b>Part of The Frequency Buddies Books.</b></p>'),
        'kw': ['mindfulness coloring book for tweens', 'anxiety relief relaxation activity kids 8 to 12', 'mandalas and tangle doodle art for kids',
               'dog and puppy coloring for older kids', 'hidden pictures search and seek activity', 'screen free stress relief gift for girls boys',
               'cozy lighthouse treehouse night garden art'],
    },
}

# ------------------------------------------------------------------ Color and Breathe (grown-ups)
ADULT = {
    'html': (
        '<p><b>Forty original designs to color at your own pace, with no timer, no rules and no wrong colors.</b></p>'
        '<p>Color and Breathe is for anyone who wants a gentle, screen-free way to unwind at the end of the day. Choose a mandala built from layered rings of petals and paisleys, a wreath of ferns, a rainy window with a mug of tea, a lighthouse at dusk, a night sky of constellations, or a single quiet word to fill in. Some pages are intricate and some are simple, so you can pick the one that matches your energy tonight.</p>'
        '<p><b>What is inside</b></p>'
        '<ul>'
        '<li>%(mandala)d mandalas, each built from layered rings</li>'
        '<li>%(botanical)d botanical pages: wreaths, ferns, wildflowers, a garden gate, herbs, a bouquet and lavender</li>'
        '<li>%(scene)d cozy scenes: a reading nook, a tea table, a kitchen shelf, a porch at dusk, a greenhouse, a stone bridge and more</li>'
        '<li>%(pattern)d pattern pages to fill with woven fields and tiles</li>'
        '<li>%(word)d calm word pages: Breathe, Enough, Soft, Begin again and Room for everyone</li>'
        '</ul>'
        '<p><b>What makes it different</b></p>'
        '<ul>'
        '<li>A real mix in one book, arranged so no two pages in a row feel the same.</li>'
        '<li>Every design is printed on one side only, with a blank page behind it, so markers and gel pens will not bleed into the next design, and finished pages can be removed or framed.</li>'
        '<li>Clean, fine lines and generous open areas, made for colored pencils, gel pens and fine-tip markers, with a color-test page at the front.</li>'
        '<li>Two small pups hide in a few of the pictures, a quiet nod to the Spread Love &amp; Acceptance books.</li>'
        '</ul>'
        '<p>%(pages)d pages, 8.5 x 11 inches. A thoughtful gift for a friend, a parent or yourself. This book is a pastime. It is not therapy and not a diagnosis.</p>'),
    'kw': ['stress relief and relaxation for women and men', 'mindfulness art therapy anxiety relief', 'botanical flowers leaves and nature pages',
           'cozy cottage lighthouse tea and reading nook', 'single sided pages no bleed through markers', 'gel pens colored pencils intricate patterns',
           'gift for mom grandma friends retirement'],
}


def esc(s):
    return s.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')


def kw_problems(words_in_title, kws):
    """every keyword phrase: its length, and any word it repeats from the title, subtitle or series (wasted)"""
    tw = set(w.strip('.,:;!?’()–\'"').lower() for w in words_in_title.split() if len(w) > 3)
    out = []
    for k in kws:
        out.append((k, len(k), [w for w in k.split() if w.lower() in tw]))
    return out
