#!/usr/bin/env python3
"""coloring_text.py: the words of the two coloring books (kids29). Both books star only Tidbit and Sugarfoot.
Captions and calm prompts live next to their pictures in coloring_younger.py and coloring_older.py; this file holds the rest."""

YOUNGER = dict(
    title='Color with Tidbit and Sugarfoot',
    title_lines=('Color with', 'Tidbit and Sugarfoot'),
    subtitle='A big, bright coloring book of two best friends, for ages 3 to 7',
    ages='Ages 3 to 7',
    series_no=3,
    cover_subtitle='32 big pictures to color, with find-it games and a blank page behind every one',
    back_heading='Pick up a crayon.',
    back_cover=[
        'Thirty-two big, bright pictures of Tidbit and Sugarfoot, the two best friends from the Frequency Buddies books: zooming, hugging, splashing in puddles, flying a kite, blasting off in a rocket and tucking in for the night.',
        'Inside: a meet-the-friends page, a color-test page, find-it games (find the hearts, the bones, the ball), a short joke from the pups on every page and a Great job certificate at the end.',
        'Every picture is on its own page with a blank page behind it, so markers will not soak through. Lines are thick and clear, with plenty of room for crayons.',
    ],
    meet=dict(
        head='Meet Tidbit and Sugarfoot',
        tidbit='Tidbit is the quick, curious pup with the big smile. Zoom first, look second.',
        sugarfoot='Sugarfoot is the steady, gentle pup with the long, soft ears and the best hugs.',
        grownups_head='For grown-ups',
        grownups='Every picture has a blank page behind it, so markers stay put, and a sheet of paper under the page helps too. Color a whole page or just the part you love, and look for the find-it games.',
        test_head='Color test',
        test_note='Try your crayons and markers here.',
    ),
    belongs='This book belongs to',
    cert=dict(head='Great job!', line1='This certificate goes to', line2='for coloring with Tidbit and Sugarfoot.', date='Date', sign='Signed by Tidbit and Sugarfoot'),
)

OLDER = dict(
    title='Color and Calm with Tidbit and Sugarfoot',
    title_lines=('Color and Calm with', 'Tidbit and Sugarfoot'),
    subtitle='Detailed, calming scenes with patterns to color, for ages 8 to 12',
    ages='Ages 8 to 12',
    series_no=4,
    cover_subtitle='32 detailed scenes, patterns to fill and a calm prompt on every page',
    back_heading='Take a calm minute.',
    back_cover=[
        'Thirty-two detailed scenes of Tidbit and Sugarfoot in cozy, quiet places: a lighthouse, a treehouse, a rainy window, a night garden, a sleepy town, a carnival, a snow globe and more.',
        'Inside: a meet-the-friends page, a color-test page, patterns and mandalas to fill, tiny hidden hearts and paw prints to find, a short calm prompt on every page and a certificate at the end.',
        'Color a whole scene, or just one pattern. Every picture has a blank page behind it, so markers will not soak through.',
    ],
    meet=dict(
        head='Meet Tidbit and Sugarfoot',
        tidbit='Tidbit is the quick, curious pup with the big smile. Zoom first, look second.',
        sugarfoot='Sugarfoot is the steady, gentle pup with the long, soft ears and the best hugs.',
        grownups_head='Before you begin',
        grownups='Every picture has a blank page behind it, so markers stay put, and a sheet of paper under the page helps too. Take your time, color a whole scene or just one pattern, and read the short calm prompt at the bottom of each page.',
        test_head='Color test',
        test_note='Try your pens and markers here.',
    ),
    belongs='This book belongs to',
    cert=dict(head='Well done', line1='This certificate goes to', line2='for taking time to color with Tidbit and Sugarfoot.', date='Date', sign='Signed by Tidbit and Sugarfoot'),
)

COPYRIGHT = ('<p><em>{series}</em>, Book {n}: <em>{name}</em>.<br>By {author}. Independently published.</p>'
             '<p>Pictures © 2026 {author}. First print edition, {updated}. Printed on demand, with a black-and-white interior.</p>'
             '<p><strong>The back of every picture is blank</strong>, so markers will not soak through to the next one. Slide a sheet of paper under the page you are coloring.</p>'
             '<p><strong>Free online, always.</strong> Tidbit and Sugarfoot live at {site}, where everything is free to read and use, with no account and no paid version. This print book is optional. You may copy pages for personal use and for non-commercial teaching, with credit to “{site}.”</p>'
             '<p><strong>Original.</strong> The characters and the pictures are original to this site.</p>'
             '<p>Set in Fraunces, Andika and Lora (SIL Open Font License).</p>')
