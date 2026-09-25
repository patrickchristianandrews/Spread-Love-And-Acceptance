# Deploy: Wired Differently + The Signal Translator

Added 24 September 2026. Follows ENHANCEMENT-PROTOCOL.md.

## What this adds

1. **Wired Differently** (`/wired-differently.html`), a reading guide on how different neurotypes receive the same words. It covers 14 wirings: neurotypical, autistic, ADHD, autistic + ADHD, dyslexic, dyspraxic (DCD), auditory processing differences (APD), developmental language disorder (DLD), Tourette/tic disorders, alexithymia, highly sensitive (SPS), anxiety, trauma (PTSD/C-PTSD) and OCD. Each profile has:
   - how information arrives
   - a table with three columns: what was said, how it may be heard, and why
   - "Speaking to this wiring"
   - "When they're the one talking"

   It also includes a double empathy section, a three-channel explainer with an at-a-glance table, "Same words, many receivers" (8 phrases), mixed pairs (8), ten rules, a wiring card template and a limits box. Sources are linked inline.
2. **The Signal Translator** (`/signal-translator.html`), a free tool that runs only in the browser. You pick Person A's and Person B's wiring (one neurotype or a combination), the channel (in person, phone, text, email) and the listener's state. Then you type a phrase or pick one of 15 presets. The tool shows:
   - a static meter and the phrase with problem spots marked
   - a reading for each of B's wirings
   - notes for combinations (for example AuDHD)
   - what B may hear and what A probably meant
   - a clearer rewrite with [fill-in] placeholders
   - tips for B's wiring, a check-back script and a double empathy note
   - sources, plus Try the reverse, Copy and Print buttons

   Nothing is stored or sent. Ctrl/Cmd + Enter runs it.

## Check-ins, 24 September 2026

`wiring-card.html` is a free tool. Public Diagnostic Tools go from **4 of 4** to **5 of 5**. It does not diagnose. `check-ins.html` stays a reading page and is not counted.

`check-ins.html` is a reading page, not a tool. Wired Differently and Check-ins are both excluded from that count.

The page covers a safe time, a regulated room, external load, a bond signal, then an order drawn from Speaker-Listener (Family Institute / Markman, Stanley, Blumberg), Imago mirroring before response, and Gottman's softened start, accept-influence, and compromise. Acknowledgement comes before any rebuttal. The close turns the miss into one repeatable action, not a compliment that hides the cost.

Hints pointing at Check-ins and the Signal Translator were added on: index, roadmap, suite-index, telemetry (note only), relationships, wired-differently, signal-translator, carrier-wave-decoder, quick-checks, WP-09, WP-11, WP-13, chapter 5, mood-arbitrage-free, and the menu in `assets/js/site.js`.

## Files to upload (exact paths from site root)

| Path | Status | Change |
|---|---|---|
| `wired-differently.html` | NEW | Full guide page |
| `signal-translator.html` | NEW | Full tool page |
| `assets/js/site.js` | CHANGED | Menu: "Wired Differently" (code New) added to Self-discovery after Check Your State. "The Signal Translator" (code New) added at the top of Tools. Carrier Wave Decoder code changed New → Tool |
| `index.html` | CHANGED | Two stacked announcement bars: Wired Differently and the Signal Translator on top, the Carrier Wave Decoder under it. Wiring lens links now include both new pages. "Talk it through" list gains both rows, and the Decoder code changed New → Tool |
| `roadmap.html` | CHANGED | "Tools, calculators & program" gains a Signal Translator row |
| `suite-index.html` | CHANGED | "Free, Public" gains the Signal Translator (Tool) and Wired Differently (Guide) |
| `telemetry.html` | CHANGED | Public Diagnostic Tools goes from 3 of 3 to **4 of 4** (still 100%). Signal Translator added to Built. The scope change is stated on the page |
| `relationships.html` | CHANGED | #yourself "How the rest connects" gains a paragraph linking both pages |
| `DEPLOY-NEUROTYPES.md` | NEW | This file |

## Denominator change (stated, per protocol)

On the Telemetry page, the Public Diagnostic Tools count goes from 3 of 3 to 4 of 4. The page says so: "Scope change, 24 September 2026: this count went from 3 of 3 to 4 of 4 when the Signal Translator was added." Wired Differently is a reading page, so it is not counted as a tool. No other counts change: chapters stay at 5/12, workpapers at 7/15 and calculators at 1/7.

## Cross-link verification

| From | To | Checked |
|---|---|---|
| site.js menu (Self-discovery) | /wired-differently.html | yes |
| site.js menu (Tools) | /signal-translator.html | yes |
| index.html announce, lens, Talk it through | both pages | yes |
| roadmap.html | /signal-translator.html | yes |
| suite-index.html | both (code labels) | yes |
| relationships.html #yourself | both pages | yes |
| wired-differently.html | signal-translator.html, wp-11.html, workpapers/wp-02, wp-09, wp-13, book chapters, quick-checks.html#ladder | yes, all files exist |
| signal-translator.html | wired-differently.html, book/chapter-1.html, carrier-wave-decoder.html, workpapers | yes, all files exist |

An automated check of every relative and root-relative href in the changed files found no missing targets.

## Google Analytics

Both new pages contain the standard `G-NKC6CQ9S66` gtag snippet in `<head>`. The changed pages keep their existing tag.

## Deployment steps

1. Upload the files in the table above to the same paths in the GitHub repo, keeping folders as they are (only `assets/js/site.js` is in a subfolder).
2. Commit with a message like: "Add Wired Differently guide and Signal Translator tool".
3. Wait for the host to rebuild (GitHub Pages usually takes 1–2 minutes).
4. Hard-refresh (Ctrl/Cmd + Shift + R) so the updated `site.js` menu loads.

## Verification checklist

- [ ] `/wired-differently.html` loads with the site header, fonts and styling. The jump chips scroll to each of the 14 profiles.
- [ ] Tables stack into labeled rows on a phone (~390px) with no sideways scroll.
- [ ] `/signal-translator.html` loads. Choosing Neurotypical for a person clears their autistic/ADHD/dyslexic-type picks, and the reverse. Traits and conditions (anxiety, HSP, etc.) can be combined with either.
- [ ] Try: A = Neurotypical, B = Autistic + ADHD, text, mobilized, phrase "Can you clean up a bit when you get a chance?" and press Translate. You should see Heavy static, marks on "clean up", "a bit" and "when you get a chance", readings for autistic, ADHD and AuDHD, and a rewrite with [which rooms…] and [time] placeholders.
- [ ] Pick a relationship in Step 2 (Partners, Family, Co-parents, Friends, Roommates, Coworkers, or Caregivers). The read should say what that dynamic is, why it exists, how this phrase may land there, and how the same words can land in other dynamics. Clicking the selected relationship again clears it.
- [ ] In Step 3, pick a situation, an environment, and what each person needs. An active argument, a public room, children, work, substances, or a shut-down state should show a risk warning. If one person needs a bond signal and the other needs space, the settle plan should offer a signal, an optional welcome hug, a return time, and a return.
- [ ] The facts box and the reply box are optional. Facts should appear as a separate note, not as part of the phrase score. A reply should get its own short read, the other way. Try the reverse should move the reply into the phrase box.
- [ ] Swap, Try the reverse, Start over, Copy the read and Print all work.
- [ ] The menu shows Wired Differently under Self-discovery and The Signal Translator under Tools.
- [ ] Home page shows two stacked announcements: the translator on top, the Carrier Wave Decoder under it. The wiring lens shows the two new links.
- [ ] Telemetry shows 4 of 4 with the scope-change note.
- [ ] GA Realtime shows hits on both new pages.

## Main sources

- Double empathy: [National Autistic Society](https://www.autism.org.uk/learn/knowledge-hub/professional-practice/double-empathy); [Crompton et al., 2020](https://pmc.ncbi.nlm.nih.gov/articles/PMC7545656/); [2025 replication, Nature Human Behaviour](https://www.nature.com/articles/s41562-025-02163-z); [first-impressions review](https://pmc.ncbi.nlm.nih.gov/articles/PMC12123177/)
- Autism and communication: [NAS](https://www.autism.org.uk/advice-and-guidance/about-autism/autism-and-communication); [Howard & Sedgewick](https://journals.sagepub.com/doi/full/10.1177/13623613211014995); [Kalandadze meta-analysis](https://journals.sagepub.com/doi/10.1177/1362361316668652); [Zalla, irony](https://pmc.ncbi.nlm.nih.gov/articles/PMC3991690/); [Frost 2024, hints](https://pmc.ncbi.nlm.nih.gov/articles/PMC11897084/); [Keating et al., language](https://pmc.ncbi.nlm.nih.gov/articles/PMC10946540/)
- ADHD / AuDHD: [CHADD](https://chadd.org/for-adults/relationships-social-skills/); [Cleveland Clinic, RSD](https://my.clevelandclinic.org/health/diseases/24099-rejection-sensitive-dysphoria-rsd); [Autistica, ADHD and autism](https://www.autistica.org.uk/what-is-autism/adhd-and-autism)
- Others: [NHS, APD](https://www.nhs.uk/conditions/auditory-processing-disorder/); [Beard & Amir, anxiety](https://pmc.ncbi.nlm.nih.gov/articles/PMC2792932/); [Kimble, PTSD](https://pmc.ncbi.nlm.nih.gov/articles/PMC4157995/); [Hogeveen, alexithymia](https://pmc.ncbi.nlm.nih.gov/articles/PMC8456171/); [Gunraj et al., text periods](https://phys.org/news/2015-12-text-messages-period-sincere.html)
