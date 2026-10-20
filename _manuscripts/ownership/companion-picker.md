# Companion idea for the site: "What's happening for you?" (design only, not built)

spin19, 20 October 2026. From the end of the owner's source notes. The book's front matter already carries a print version ("Find your chapter"); this is the online version, for a later site tool. Nothing here is built.

## What it is

A two-question picker, one screen, no typing. It sends the reader to the right chapter of *Both Sides of Sorry* (online reading page) and shows one matching script they can copy, edit and check in the Chat analyzer. Everything stays on the device; nothing is saved unless the reader taps "Keep this script", which uses the site's existing local-notes pattern (if one is added, the lead lists the localStorage key on on-this-device.html).

The owner's key sentence drives the routing: the best approach for someone who is ashamed and defensive is different from the approach for someone who repeatedly avoids responsibility while understanding exactly what they're doing.

## The two questions

**1. What do you notice about them?** (one choice)

| Key | Label on screen | What it usually points to |
|---|---|---|
| `understand` | They seem to understand what they did, but won't admit fault | shame, or unwillingness: tell them apart over time |
| `turn` | They get defensive and turn it back on me | defensiveness; the counter-list |
| `unclear` | They genuinely don't seem to see why it hurt | different layers, limited self-awareness, different wiring |
| `repeat` | They apologise, then it happens again | words without a changed setup |
| `me` | It's me: I'm being asked to apologise and I'm not sure for what | the same standard, turned round (added by spin19; the book is for both sides) |

**2. Who is this happening with?** (one choice)

`partner` (Romantic partner) · `family` (Family member or friend) · `work` (Someone at work) · `other` (Someone else)

A small line under both questions, in the site's usual wording: "Made for everyday disagreements between people who feel safe with each other." (This is the existing site line, kept exactly; the picker adds no safety content and no outside resources, per the owner's decisions.)

## Routing: question 1 decides the chapter

| Q1 | First chapter | Then | The one idea shown on the result card |
|---|---|---|---|
| `understand` | 3 Owning it is not a verdict on you | 8, then 11 | "Owning an act concedes a point, not your whole character. Make the self safe first; if it's still refused over months, decide what you'll do." |
| `turn` | 7 When it gets turned round on you | 8, 9 | "Two people can both be responsible for different things. Write each one on its own line and finish one first." |
| `unclear` | 1 The surface and the fuller picture | 5, 6 | "You may be on different layers of the same minute. Put the facts down first, then ask what it looked like from their side." |
| `repeat` | 10 Words, then what happens next | 4, 11 | "Real ownership shows up as a changed setup. Ask for the change, not another sorry." |
| `me` | 9 Your own part, by the same rule | 3, 5 | "Own the part that's yours, no bigger and no smaller. If you don't owe one, say so kindly." |

Each chapter has an online reading page (see integration.md); the card links to the chapter's first heading, and to the "Then" chapters as small links.

## Routing: question 2 picks the wording of the script

The scripts are the book's own (chapter 12 has them by relationship). The picker shows one, filled for the pair of answers. Twenty combinations; the table gives the script for each Q1 with a partner, and how the other three relationships change it.

| Q1 | Partner (shown as written) | Family or friend | Work | Someone else |
|---|---|---|---|---|
| `understand` | "I'm not saying you're a bad partner. One thing hurt, and I'd like us to look at that one thing." | "bad partner" → "bad mum / bad friend" (a choice chip) | "I'm not saying you're bad at your job. One thing affected me, and I'd like us to look at it." | neutral: "I'm not saying you're a bad person…" |
| `turn` | "I'm willing to talk about what I've done wrong, and I'll own my part. Can we finish this one first? What I got wrong doesn't cancel what you got wrong, and the other way round." | same | "There are a few things we could cover. Can we take this one to the end first, and then I'll hear yours?" | same as partner |
| `unclear` | "I think we're on different layers of this. You're talking about tonight, and you're right about tonight. I'm talking about the last few weeks. Can we put the facts down first?" | same | "Can I check something about Friday's email? When you wrote it, what were you hoping I'd take from it?" | same as partner |
| `repeat` | "I believe you mean it. I don't need another sorry. What can we change so it doesn't happen again?" | same | "I'm going to send the report on the sixth with whatever's in. I'd much rather yours was there." (a limit about what you'll do) | same as partner |
| `me` | "I can see this really hurt. I don't understand yet what I did. Will you tell me, and give me a minute to think about it?" | same | same, with "I can see this has affected you" | same |

Under every script: **Copy**, **Make it mine** (opens it in an editable box), **Check it in the Chat analyzer** (passes the text to /signal-translator.html, the same hand-off the refusals page already uses), and **Read the chapter**.

## A second step for `understand` and `repeat` (optional)

Both of these can mean very different things. A short follow-up, shown only for them, helps the reader judge a pattern rather than one evening (chapter 8):

"Over the last few months, when things are calm, do they ever come back to it?" Yes, sometimes / Rarely / Never.

- *Yes, sometimes* → the card adds: "That points towards someone who finds it hard, not someone who won't. Safety, time and specifics help most (chapters 3 and 8)."
- *Rarely / Never* → the card adds: "If they understand and never come back to it, more explaining may not help. Chapter 11 is about deciding what you'll do, without trying to steer them."

No verdicts, no labels: the card describes behaviour and points to a chapter.

## Where it would live and how it's built

- One page, e.g. `/both-sides-of-sorry.html` (the book's landing page online) with the picker at the top and the chapter list below; or a block on the book's /book/ index entry.
- Plain HTML and a small script (no libraries), modelled on the refusals page (`refusals.html`), which already does "pick a situation and a tone → three scripts → Make it mine → Check it in the Chat analyzer".
- URL parameters so a result can be linked or put on a QR code in print: `?what=turn&who=work`.
- No storage needed. If "Keep this script" is added, one localStorage key (for example `sla-sorry-script`) for the last kept script, listed on on-this-device.html.
- Accessibility: radio groups with visible labels, the result in an `aria-live="polite"` region, works without JavaScript by showing the full routing table above (as the logic page does).
- Checks before launch: 390x844 and 1366x768, light and dark, no horizontal scroll, every chapter link resolves.

## Print version

The front matter of the book already has "Find your chapter", the same routing as a table. If the picker is built, a QR code to it can sit beside that table at build time.
