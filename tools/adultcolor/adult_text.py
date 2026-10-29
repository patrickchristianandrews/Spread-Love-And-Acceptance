#!/usr/bin/env python3
"""adult_text.py: the words of "Color and Breathe" (adultcolor29): the title, the listing text and the pages around the art.
American English, plain and kind. No em dashes, no semicolons."""

TITLE = 'Color and Breathe'
SUBTITLE = 'An Adult Coloring Book of Mandalas, Gardens and Quiet Scenes for Calm and Focus'
SERIES = 'Spread Love & Acceptance'
AUTHOR = 'Christian'
SITE = 'spreadloveandacceptance.com'
UPDATED = 'October 2026'
PAGE_TARGET = '/pause-and-play'          # the Calm games page (pause-and-play.html), the QR code on the last page
PAGE_TARGET_NAME = 'Calm games and a place to relax'

BELONGS = 'This book belongs to'

HOWTO_HEAD = 'How to use this book'
HOWTO = [
    'Color in any order, with any colors you like. There is no wrong color, and nobody is checking.',
    'Stop whenever you want. A page can take ten minutes or sit half finished for a month. There is no timer.',
    'Every design has a blank page behind it, so markers will not bleed into the next one. A sheet of paper under the page helps with the wettest pens.',
    'Pens, pencils and gel pens all work here. Try them on the next page first.',
    'This book is a pastime. It is not therapy and not a diagnosis.',
]

TEST_HEAD = 'Color test'
TEST_NOTE = 'Try your pens, pencils and markers here. Blend two colors where the circles overlap.'

THANKS_HEAD = 'Your pages'
THANKS = [
    'If you finished a page, or only one corner of a page, that counts. Tape your favorite where you will see it.',
    'There is more free at the website, with no account and nothing to buy: calm games, slow colors and a quiet place to relax.',
]
THANKS_PROMPTS = ['The page I liked coloring most', 'Colors I want to try next']
THANKS_QR_LABEL = 'Calm games and a place to relax'

# the copyright page: the same wording and format as the two kids coloring books (tools/kids/coloring_text.py), with the series name,
# no book number, and the site named instead of the characters
COPYRIGHT = ('<p><em>{series}</em>: <em>{name}</em>. A companion to the series.<br>By {author}. Independently published.</p>'
             '<p>Pictures © 2026 {author}. First print edition, {updated}. Printed on demand, with a black-and-white interior.</p>'
             '<p><strong>The back of every picture is blank</strong>, so markers will not soak through to the next one. Slide a sheet of paper under the page you are coloring.</p>'
             '<p><strong>Free online, always.</strong> {series} lives at {site}, where everything is free to read and use, with no account and no paid version. This print book is optional. You may copy pages for personal use and for non-commercial teaching, with credit to “{site}.”</p>'
             '<p><strong>Original.</strong> The pictures, and the two pups who appear in a few of them, are original to this site.</p>'
             '<p>Set in Fraunces, Andika and Lora (SIL Open Font License).</p>')

BACK_HEAD = 'Take a quiet hour.'
BACK = [
    'Forty designs to color at your own pace: mandalas with exact, layered rings, gardens and wreaths, patterned fields, a lighthouse at dusk, a rainy window, a tea table, a night sky, and a few words to color in.',
    'Clean, fine lines with plenty of open areas, made for colored pencils, gel pens and fine markers. Some pages are intricate, some are simple, so you can pick the one that matches your mood.',
    'Every design is printed on its own page with a blank page behind it, so markers will not bleed through. Two pups, Tidbit and Sugarfoot, hide in a few of the pictures.',
]
BACK_BULLETS = [
    '40 original designs on single-sided pages',
    'Mandalas, botanicals, patterns, quiet scenes and calm words',
    'A color test page and a short note on how to use the book',
    '8.5 x 11 inches, black and white interior',
]
