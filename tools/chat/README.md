# The on-device chat

`assets/js/site-chat.js` answers questions using only this site's own pages. It runs entirely
in the browser: nothing typed is sent anywhere, and the only thing kept is the current tab's
conversation (sessionStorage).

Its knowledge base, `assets/js/chat-kb.js`, is generated. Don't edit it by hand.

## Rebuild the knowledge base

Run this after changing page text, the glossary (`assets/js/dives-glossary.js`) or the tips
(`assets/js/tips.js`):

    python3 tools/chat/build_kb.py

The script uses only the Python 3 standard library. It prints the page count, the number of
passages and the file size, and warns if the file goes over 1.5 MB. Commit the regenerated
`assets/js/chat-kb.js` along with your page changes.

What it reads:

- Every public `*.html` page, split into passages of about 40 to 160 words. Each passage uses
  its heading and the nearest `id` as the link anchor. It skips `tools/`, `supabase/`,
  `garden-backdrop.html`, `offline.html`, `404.html`, `dashboard.html`, `ask.html` and
  redirect pages.
- The glossary behind the mini dives, which becomes clean definition passages.
- The "little tip" library.
- The page codes and "Also called" names from the site menu in `assets/js/site.js`, used as
  keywords.

Near-duplicate passages, such as a simple page repeating its in-depth page, are dropped. The
page that appears first in the site menu wins.

The synonym map (the `SYN` dictionary in `build_kb.py`) links everyday words to the site's own
vocabulary, for example "fight" → argument, conflict, squeal. Add to it when a common question
misses.

## Using the chat

    <script src="/assets/js/site-chat.js" defer></script>

    TOLChat.open({ name: 'Pip', emoji: '🌷', color: '#C98BB9', greeting: '…', topic: 'what is WP-02' });
    TOLChat.close();
    TOLChat.mount(element, opts);   // inline, as on /ask.html

All the options are optional. `svg` (an `<svg>` string) can replace `emoji`. `topic` asks a
first question straight away. Adding `?chat=1` to the address of a page that loads the script
opens the chat when the page loads.
