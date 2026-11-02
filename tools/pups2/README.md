# New Tidbit and Sugarfoot (work in progress)

Owner, Nov 2 2026: the coloring books need a full redo, the pups must be smooth (one continuous outline,
no separate pieces), cute, and only ever do things a real dog does.

- `front.js`: the pups facing the reader, sitting (and lifting a paw to "shake").
- `side.js`: the pups from the side, sitting and standing, for the videos where they walk and run.

Both draw onto any canvas-like context. Every color area is outlined once: all the coat shapes of one
color are stroked wide and then filled, so only their outside edge shows (head, body, legs and tail read
as one smooth shape). With `mono: true` every area is white: the coloring page is the same drawing.

Preview sheets (need the pre-installed Playwright):

    NODE_PATH=$(npm root -g) node tools/pups2/sheet-front.js   # writes /tmp/cn/fsheet.png
    NODE_PATH=$(npm root -g) node tools/pups2/sheet-side.js    # writes /tmp/cn/sheet.png
