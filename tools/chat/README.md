# The on-device chat

`assets/js/site-chat.js` is Professor Puddles. It runs entirely in the browser: nothing typed is
sent anywhere, and the only thing kept is the current tab's conversation (sessionStorage).

It answers in this order:

1. **Safety.** A message that suggests danger or harm gets a short, kind "this is beyond me, please
   reach out to someone you trust or a qualified professional" and nothing else.
2. **Care first.** Program cards marked `"first": true` answer before anything else, plainly: who can see this
   chat (this tab only; “Start over” erases it; closing the tab clears it), “is it my fault?” (never a yes; after
   being snapped at, `what_hurt`/`how_hurt`), “tell me something calming”, “I feel judged”, “can you tell me if I’m
   autistic?” (plainly no), “I just had a fight and I have 5 minutes”, “what should I do next?”, “remind me later”,
   bigger text, reading out loud and easier words. `notPat` keeps a card out of the way (“how do I apologize”).
   They keep the topic we were on. “tl;dr” / “make it shorter” shortens the last answer (a one-line summary and up
   to three bullets); “where did I leave off?” names the last topic.
   Before any of this, typos are read as the word meant (“unbiled det”, “were do i start”): the shared list in
   `assets/js/message-patterns.js` (copied into the knowledge base by the build), then doubled letters, then the
   nearest site word by spelling or sound. The answer starts “I think you mean …”. A message with no word the chat
   knows (“asdfgh”) gets a kind “I didn’t catch that”.
3. **Follow-ups** ("tell me more", "give me an example", "another way to say it", "how do I start?",
   "what about for coworkers?") use the last topic: a card, a playbook, a background note or a search.
4. **Calculators.** Five Battery Meter answers (WP-02: sum ÷ 20, bands 0.3 / 0.6), a CALC-01 read from
   balance, ownership and battery (0.40 / 0.35 / 0.25, bands 0.70 / 0.40, apex with retuning), a single
   score to explain, or two people's hours to workload balance. Always "not a verdict".
5. **Clarifying chips** for vague messages ("help", "check in", "my partner", "idk"). A short, personal message
   that nothing else answers ("ugh, my sister") gets a warm clarifying question, never the off-topic reply, and a
   follow-up in someone's own words ("he just writes ok") stays with the last playbook.
6. **Program cards** (`program-cards.json`) for every tool, workpaper, chapter, game and the common
   questions, and **situation playbooks** (`situations/*.json`) when someone describes what's going on.
7. **The site's pages** (BM25 search over passages, the glossary and the Library), and only when they
   don't answer well, the **background notes** (`chat-kb-bg.js`, fetched on first need and always labelled
   "From the Professor's background notes (not a page on this site)"). Off-topic questions (cars, resumes,
   recipes…) get a polite no and never load the notes.

The two knowledge files, `assets/js/chat-kb.js` and `assets/js/chat-kb-bg.js`, are generated. Don't
edit them by hand.

## Rebuild the knowledge base

Run this after changing page text, the glossary (`assets/js/dives-glossary.js`) or the tips
(`assets/js/tips.js`):

    python3 tools/chat/build_kb.py

The script uses only the Python 3 standard library. It prints the page count, the number of
passages and the file size, and warns if the file goes over 4 MB. Commit the regenerated
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

- `tools/chat/program-cards.json`, `tools/chat/situations/*.json` and `tools/chat/background/*.md`
  (below). The build checks every link points at a real page, and refuses banned topics.

Near-duplicate passages, such as a simple page repeating its in-depth page, are dropped. The
page that appears first in the site menu wins.

The synonym map (the `SYN` dictionary in `build_kb.py`) links everyday words to the site's own
vocabulary, for example "fight" → argument, conflict, squeal. Add to it when a common question
misses.

## Adding a program card

Cards live in `program-cards.json` → `cards`. A **tool** card answers "what is it" (`what` plus the first
`how` steps), "how do I use it" (`how`), "what do my results mean" (`results`) and "show me the math"
(`math`); `ex` answers "give me an example", `start` answers "how do I start?", `more` answers "tell me
more". An **intent** card answers a common question (`what`, optional `how` list) and is found by its
`keys` or its `pat` (a JavaScript regular expression over the normalised text).

    { "id": "lemonade", "kind": "tool", "name": "the Lemonade Stand",
      "keys": ["lemonade stand", "~lemonade"],
      "what": "…", "how": ["…", "…"], "results": "…", "math": "…", "ex": "…",
      "pillar": "Pillar I, See the whole load.",
      "links": [["The Lemonade Stand", "/lemonade-stand.html"]] }

`keys` are names people type, matched as whole words, longest first. Start a key with `~` when it's a
common word ("battery", "drift", "the library"): then it only counts when the question has nothing else
in it. `clarify` holds the clarifying prompts: a `pat`, a line `x`, and 2–4 `chips` as [label, question].

## Adding a situation playbook

`situations/who.json` lists the kinds of relationship (`nouns` are captured, so "my sister" becomes
"your sister"; `cues` only detect), each with a `fit` line, a three-link `path`, a `read` link, a general
`step`, optional per-issue `steps`, `bonus` (extra weight for an issue) and four clarifying `chips`.
`situations/issues-*.json` lists the issues: `match` ([pattern, weight] pairs), `reflect`, `going`
(the Five Pillars lens, both sides), `steps` (2–3), `scripts` by kind of relationship (plus `default`),
`path` (tool, workpaper, reading), `deeper` [chip label, question] and `ex`. Self versions use
`reflect_self`, `going_self`, `steps_self`, `path_self`; issues about oneself (`selfFirst`) use
`*_other` and `scripts_other` when it's someone else. `only` limits an issue to some relationships;
`needsOther` means it needs another person. `situations/combos.json` hand-tunes a pair (`who+issue`):
any field there replaces the composed one. Text may use {them}, {Them}, {they}, {their}.

The chat works out who is doing the thing an issue is about ("my partner goes quiet" vs "I go quiet", "how do I
say no to my mom"): the person named inside the strongest match, or the nearest one before it. When it's the
other person, an issue's `*_other` fields are used (for any issue, not only `selfFirst` ones), and a named
person becomes {them} ("my mom needs care and my brother does nothing" is about your brother). More fields:
`ownSteps` (the issue's own four steps, with no general step for the relationship added), `defaultWho` (the relationship to assume when nobody is named, e.g. `family` for holidays), `themPat` (which
named person is {them}, e.g. the roommate rather than their boyfriend), `scripts_also` ([label, [scripts]]:
words for a second person involved, like the parent being cared for) and `tonight` (one tiny step for this
evening, used by the "What can I do tonight?" chip every playbook offers).

Tool names are matched with small typos allowed ("conversaton reader", "lemonaid stand"), and workpaper codes
typed loosely ("work paper three", "wp-o1") are understood. Every reply is tidied before it's shown: each
link and bullet once, and no chip that repeats a question just asked.

Patterns use a small language (compiled by the build): `|` separates choices, a trailing `*` ends a word
stem, ` .. ` allows up to four words between, `(a|b)` groups, `<a|b>` captures. They match lowercase
text with apostrophes and in-word hyphens removed ("don't" → "dont", "co-parent" → "coparent").

Rules for every playbook: never take sides or diagnose, never suggest leaving a relationship, no health
advice, and always "you know your situation best".

## Adding a background note

Background notes are related reading that isn't a page on the site. Add entries to any
`background/*.md` file (one file per topic):

    ## Title
    aka: other name; another name
    see: Another entry title; A third one
    go: /page.html#anchor | Where to put it into practice
    evidence: One honest sentence on how sure this is (name researchers and years only when confident).
    try: A short example or script.

    Two to four short paragraphs, plain and warm.

    Program: how it connects to the program.

The build warns about missing fields, unknown `see:` titles and broken `go:` links, and stops on banned
topics (no abuse, violence, self-harm or crisis-line content, no medical advice, no invented statistics).
Keep the background file under about 2 MB.

## Tests

    node tools/chat/test-chat.js        # 319 questions with expected cards, playbooks, notes and pages
    node tools/chat/coverage.js         # asks about every indexed page and checks the answer lands there

Both run site-chat.js in Node through `chat-sandbox.js`, loading the knowledge files the way the page
does, so they also check the background notes stay unloaded for off-topic questions.

## Using the chat

    <script src="/assets/js/site-chat.js" defer></script>

    TOLChat.open({ name: 'Pip', emoji: '🌷', color: '#C98BB9', greeting: '…', topic: 'what is WP-02' });
    TOLChat.close();
    TOLChat.mount(element, opts);   // inline, as on /ask.html
    TOLChat._ask(q, cb);             // tests: one question, a fresh conversation
    TOLChat._session().ask(q, cb);   // tests: a conversation that remembers the last topic

All the options are optional. `svg` (an `<svg>` string) can replace `emoji`. `topic` asks a
first question straight away. Adding `?chat=1` to the address of a page that loads the script
opens the chat when the page loads.
