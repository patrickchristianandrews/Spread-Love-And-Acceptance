# Site fixes, in priority order

These are edits for live pages whose source files aren't in the Claude project. Each one gives the text as it appears on the live page and what to replace it with. In the HTML source, some characters appear as entities (`&middot;` for ·, `&amp;` for &, `&mdash;` for —, `&ndash;` for –), so search for a distinctive phrase if an exact match fails.

Files delivered alongside this list:

- `start-here.html`: new page. Upload to the site root.
- `roadmap.html`: full replacement for the live roadmap.
- `manuscript/wp03-raci-treaty.md`: WP-03 with its timing stated.
- `manuscript/ch03-autonomic-saturation.md` and `manuscript/ch04-deontological-parity.md`: the same chapter text under filenames that match their titles. Replace `ch03-telemetry-metrics.md` and `ch04-ocular-vectors.md` with these. Nothing in the project links to the old names.
- `manuscript/wp-01.md`, `manuscript/wp13-pll-protocol.md`, `manuscript/hierarchy-matrix.md`: stale chapter references fixed (see item 11).
- `infographic.html`: footer no longer claims the full 12-chapter / WP-01–15 / CALC-01–07 suite exists (see item 1).
- `lemonade-calc.js`: code comment only, "diagnostic engine" → "calculator".

---

## 1. Make every page agree on what's live

The canonical counts, taken from the live Suite Index and confirmed by the Telemetry page: **5 of 12 chapters, 7 of 15 workpapers (01, 02, 03, 04, 09, 11, 13), 1 of 7 calculators**, plus REPORT-01 and PROG-01.

### Homepage (`index.html`), status bar

Find:
> Content Rollout · In Progress 9 of 34 planned chapters, workpapers & calculators live — updated as new material ships

Replace the note with:
> Content Rollout · In Progress — 5 of 12 chapters, 7 of 15 workpapers, 1 of 7 calculators live. Updated the day new material ships.

### Homepage, Survival Kit card ("Live right now:" list)

Find:
> Manuscript Chapters I & II, with III–XII in active development

Replace with:
> The Preface and Chapters I–V, with VI–XII still to come

Find:
> WP-01, WP-02, WP-03, WP-09, WP-11, and WP-13 — the remaining workpapers are rolling out over time

Replace with:
> Seven workpapers: WP-01, WP-02, WP-03, WP-04, WP-09, WP-11 and WP-13. The rest are rolling out over time

Find:
> PROG-01, the 6-week guided curriculum sequencing the six live workpapers above

Replace with:
> PROG-01, the 6-week guided program, and REPORT-01, your week-by-week record

### Roadmap

Replace the live file with the delivered `roadmap.html`. Your latest update added WP-11 to Live Now, a Reference Guides block in the sidebar and a longer footer; the delivered file keeps all three. The live version still:

- lists only the Preface and Chapters I–II as live, with Chapter III in progress and IV–XII planned (III–V are built)
- lists WP-04 as in progress (it's built)
- leaves out REPORT-01
- includes WP-11 in the Planned range "WP-10 through WP-12", now that it's also listed as live

The delivered file also adds Start Here to the Reference Guides block, and labels the Telemetry link "What's Built" (see item 6). One thing to confirm: I listed **Chapter VI** under In Progress. If something else is actually being worked on, change that line.

### Printable infographic

The copy of `infographic.html` in your project ends with: "For the complete 12-chapter manuscript, the full WP-01–WP-15 workpaper suite, and CALC-01–CALC-07 — visit spreadloveandacceptance.com". That's the same overclaim as the old homepage, on the page people print and pass around. I couldn't open the live infographic to check whether it still says this.

If it does, change that line to:
> For the manuscript, workpapers and calculators in the Survival Kit — and exactly which ones are live today — visit spreadloveandacceptance.com/suite-index.html

The corrected file is included, but compare it with your live version first. If the live one has changed since, edit just this one line rather than uploading the whole file.

### Telemetry

The counts here are correct and match the Suite Index. Two small gaps:

- REPORT-01 is on the Suite Index but doesn't appear anywhere on this page. Add it under the Six-Week Implementation Curriculum card, or as its own line: "**Built:** REPORT-01 The Full Read — your week-by-week record."
- The heading "Public Diagnostic Tools" should change to match item 9 below: **Free Self-Assessment Tools**.

The page's "Status verified 17 September 2026" line is a good idea. Consider adding the same line to the Suite Index and Roadmap so all three show when they were last checked.

### About page, "Live & Growing" banner

This banner says material ships "almost every day" and that "nothing sits half-finished behind a coming-soon page." The Roadmap says there are no firm ship dates, and the Playground shows a Coming Soon badge.

Find:
> Live & Growing · Updated Daily

Replace with:
> Still being built

Find the paragraph starting:
> This site changes fast. New chapters, workpapers, and calculators ship here almost every day…

Replace with:
> **This site is still being built.** New chapters, workpapers and calculators are added as they're finished, and the [Suite Index](suite-index.html) lists exactly what's live today.

---

## 2. Add the Start Here page to the navigation

Upload `start-here.html`, then on the homepage add it as the first item in the sidebar, above the Preface list:

```html
<a class="header-cta" href="start-here.html">
  New here? Start here
  <span class="ext-note">What this is and what to do first</span>
</a>
```

Also add `<a href="start-here.html">Start Here</a>` as the second link in the footer of every page.

### Move the creator story below the product

On the homepage, the "Who built this, and why?" block currently sits above the Preface. Move it down to sit between the Register section and the Appendix. Put this short orientation block in its old place:

```html
<div class="draft-notice">
  <strong>New here?</strong> Relationships rarely come apart because people stop caring. They come apart when invisible work, overloaded nervous systems, unclear ownership and crossed signals pile up faster than two people can sort them out. The Objective Ledger gives two people a structured way to see those patterns together, without making either person the problem. <a href="start-here.html">See how it works and where to start.</a>
</div>
```

---

## 3. Make the sequence the backbone

`start-here.html` now carries the full sequence, with the WP-11 gate shown. On the Suite Index, replace the bare arrow line with the version that includes the gate.

### Suite Index

Find:
> WP-01 → WP-02 → WP-03 → WP-09 → WP-13

Replace with:
> Observe (WP-01) → Check your state (WP-02) → Clarify ownership (WP-03) → Communicate (WP-09) → Maintain (WP-13)
>
> If the state check shows either of you is too activated, use the Calm-Down Kit (WP-11) before WP-03 or WP-09.

---

## 4. Settle the one-week vs. two-week question for WP-03

I went with **one full week**, because WP-01 is a 7-day audit and the Suite Index already tells new users to keep one week before touching anything else. If PROG-01 actually schedules WP-03 in week 3, use "two weeks" everywhere instead, including in `wp03-raci-treaty.md`.

### Suite Index, WP-03 row

Find:
> Use after two weeks of audit data, and amend whenever life changes.

Replace with:
> Use after your first full week of the Field Audit, and amend whenever life changes.

The delivered `wp03-raci-treaty.md` also fixes a stray reference. It pointed reviews to "the weekly closing (Chapter V)", but Chapter V is the monthly Deficit Audit.

---

## 5. Fix the WP-03 mislabel on Try It

The Playground's "WP-03" demo isn't the RACI Treaty at all. It's a 12-week tracker of workload, satisfaction, state and clarity, which matches the description of **REPORT-01, The Full Read**. The cleanest fix is to relabel it as REPORT-01, rather than build a new WP-03 demo.

### Try It (`do/index.html`)

Find:
> WP-03: Telemetry Metrics — Track workload and satisfaction over time

Replace with:
> REPORT-01: The Full Read — Track your figures week by week (coming soon)

Also change "test-drive three of our core workpapers" to "test-drive three of our core tools", since one of the three is a calculator.

### Playground (`do/workpaper-playground.html`)

- Sidebar link `WP-03: Telemetry` → `REPORT-01: The Full Read`
- Heading `WP-03: Telemetry Metrics — Track Over Time` → `REPORT-01: The Full Read — Track Over Time`
- Check the badge positions. In the page text, "Live Now" and "Coming Soon" each appear after the *next* card's button, so a visitor can't tell which badge belongs to which tool. Each badge should sit directly under its own card's heading.

Also in the CALC-01 card, find:
> The calculator returns a single number: P(Solvency), your probability that the current arrangement can carry its own weight.

Replace with:
> The calculator returns a single 0–1 read, P(Solvency), on whether the current arrangement looks sustainable. It's a heuristic score, not a probability, and it scores the arrangement, never either person.

---

## 6. Use the names consistently

`start-here.html` defines the hierarchy once: Spread Love & Acceptance (the site) → The Objective Ledger / TOL-OS (the framework) → the Survival Kit (the paid membership) → workpapers, calculators and the 6-Week Program (the tools).

On the homepage and Roadmap, "Workpaper Suite" and "Full Program membership" are used for the Survival Kit. Standardize on **the Survival Kit**.

### Homepage

Find:
> Free Diagnostic Tools vs. The Workpaper Suite

Replace with:
> Free Tools vs. The Survival Kit

Rename the sidebar item "Rollout Status & Telemetry" to **What's Built**. The page can keep its filename.

---

## 7. Put the 6-Week Program first for beginners

### Suite Index

Find:
> If you're new: start with WP-01 and keep one week of the Field Audit before touching anything else.

Replace with:
> **If you're new:** start with PROG-01, the 6-Week Program, which walks you through everything below in order. **Prefer to work on your own?** Start with WP-01 and keep one full week of the Field Audit before touching anything else.

In `start-here.html`, the "Start the 6-Week Program" link currently points to `suite-index.html`, because I don't know PROG-01's page address. Change that `href` to PROG-01's real page.

---

## 8. Separate theory, practice, measurement and review

This is handled by the Theory → Practice → Measure → Review strip in `start-here.html`. One related fix on the Program Overview:

### Program Overview, "How They Connect" table

The WP-01 row says it reads from **Ch. V**. WP-01 is the first thing a household does, and it measures the Preface's idea of unbilled debt, so this looks like an error. Change `Ch. V` to `Preface` in the WP-01 row, unless you meant it.

Add this note under the table, so "apex score" is defined where it first appears:

> **Apex score:** a broader weekly read than P(Solvency). It combines the same three inputs with WP-09's retuning frequency, to show whether communication repair is happening as well as whether the workload is balanced. Weights: workload balance 0.35, ownership clarity 0.30, autonomic saturation 0.20, retuning frequency 0.15. Like P(Solvency), it scores the arrangement, never either person.

---

## 9. Qualify "diagnostic" and the neuroscience

### Homepage

Find:
> Polyvagal theory describes three broad states, arranged like rungs on a ladder rather than points on a line.

Replace with:
> Polyvagal theory, a popular but scientifically debated model, describes three broad states arranged like rungs on a ladder. We use it here as a practical self-check, not as settled physiology.

Find:
> Free Public Diagnostic Tools

Replace with:
> Free self-assessment tools

Find:
> They're diagnostic snapshots, not the full system.

Replace with:
> They're quick snapshots, not the full system.

Rename the sidebar item "Diagnostic Snapshot" to **Household Snapshot**.

Add this directly above the P(Solvency) formula in Chapter II:

```html
<div class="draft-notice">
  <strong>This number is not a relationship score.</strong> It doesn't measure love, compatibility, commitment or who's right. It only estimates whether the current workload arrangement looks sustainable, based on what you both entered.
</div>
```

### About page, Neurobiology card

Find:
> Learning how the autonomic nervous system actually governs state

Replace with:
> Learning how the autonomic nervous system shapes state

### About page, "A Different Language"

Find:
> When leveraged correctly, I can channel this processing power for good, driving tasks and systemic problem-solving to near-perfect execution.

Replace with:
> When my environment and systems match the way I process information, I can bring unusually strong pattern recognition, systems thinking and persistence to complex problems.

### About page, the nine fields

Find:
> Nine fields, studied for a reason.

Replace with:
> Nine bodies of knowledge and practice, studied for a reason.

And on the homepage, "how nine separate fields of study became the workpapers" → "how nine bodies of knowledge and practice became the workpapers".

### About page, the closing prayer (optional)

Keep it as it is. If you want to make clear the framework doesn't depend on it, add one sentence directly after:

> My faith is part of my story. It isn't part of the method, and nothing in TOL-OS asks you to share it.

---

## 10. "What it is / isn't"

Done in `start-here.html`. It pulls together the statements currently scattered across the homepage, Suite Index and Program Overview. Once Start Here is live, you can link to that section from the homepage's Access area with `start-here.html#what-it-isnt`.

---

## 11. Stale cross-references inside the manuscript and workpapers

These come from earlier versions of the chapter plan, when Chapter III was the Lemonade Stand and Chapter V covered the weekly closing.

- **WP-01** said the Field Audit total feeds "the Lemonade Stand (/index.html, Chapter III)". Chapter III is now Autonomic Saturation. Fixed to "the Lemonade Stand (the free tool on the homepage)".
- **WP-03, WP-13 and the hierarchy matrix** each pointed to "the weekly closing (Chapter V)". Chapter V is the monthly Deficit Audit. The weekly closing is introduced in the Preface ("close the books together at the end of each week") and its routine is laid out in WP-13's weekly resync. All three now point there.
- **WP-02 has two names.** The Suite Index, Roadmap and member worksheet call it "The Battery & Stress Meter", but `wp02-asi-matrix.md`, the member bundle and the About page's Neurobiology card call it "Autonomic Saturation Index". Pick one public name. If the ASI matrix is now the scoring part of the Battery & Stress Meter, retitle its file heading to say so, and on the About page change "the Autonomic Saturation Index (WP‑02)" to "the Battery & Stress Meter (WP‑02)".

---

## 12. The member bundle needs regenerating

The bundle members download repeats the same problems, so rebuild it from the corrected source files once the edits above are in. What's in it now:

- **Page 1** calls it the "Full Program bundle". Use "Survival Kit".
- **Chapter II** says "the conversation Chapter V calls closing the books". Point to the Preface instead.
- **WP-01** has the "Lemonade Stand … Chapter III" reference.
- **WP-02** is titled "Autonomic Saturation Index".
- **WP-03** has the "weekly closing (Chapter V)" reference and no "When to use" line.
- **WP-13** has the "weekly closing (Chapter V)" reference.

Its contents list (Preface, Chapters I–V, WP-01–04, 09 and 13) is correct. WP-11 is page-only, which matches the Suite Index.

One more thing: `spread-love-and-acceptance-survival-kit-bundle.pdf` in the project isn't actually a PDF. It's a zip archive of 23 page images with text extracts. If that's the same file members download from Gumroad, some of them won't be able to open it. Check the file on Gumroad.

---

## 13. Project housekeeping

The project holds older copies of `index.html` and `roadmap.html` that don't match the live site. The old `index.html` still claims the complete 12-chapter suite is live. Replace both with the current live versions (or with the delivered `roadmap.html`), so nothing stale gets uploaded by accident and future edits start from what visitors actually see.

---

## 14. Fill-in workpapers that save as PDFs

New folder: `workpapers/fill/`. Upload the whole folder as-is, keeping the paths, so it lives at `spreadloveandacceptance.com/workpapers/fill/`.

| File | What it is |
|---|---|
| `index.html` | Lists the fill-in workpapers, in the order to use them |
| `wp-01.html`, `wp-02.html`, `wp-03.html`, `wp-04.html`, `wp-09.html`, `wp-13.html` | One page per live workpaper |
| `tol-workpaper-schemas.js` | Every field, table and calculation, taken from the manuscript source files |
| `tol-workpaper.js` | Builds the form and the PDF |
| `tol-pdf.js` | A small PDF writer, with no outside libraries |
| `tol-workpaper.css` | Styling, using the site's palette |

**How it works for a member:** they type into the form, see their scores update as they go, and press **Download PDF** to get a finished workpaper file. To stop partway, **Save draft** downloads a small `.json` file they can reopen on the same page later. **Clear this page** wipes the form on a shared computer.

**What keeps it private:**

- Everything runs in the browser. Nothing a person types is sent anywhere, and nothing is kept in the browser's storage or cookies.
- Each page carries a security policy (`connect-src 'none'`) that makes the browser refuse to send data out, even if a script tried to.
- Form fields have autocomplete off, so the browser doesn't remember what was typed.
- The PDF's filename and file details don't include anyone's name.
- On WP-09, the raw reaction is left out of the PDF unless the person ticks a box to include it.

The only outside request these pages make is to Google Fonts, for the typefaces, and it carries none of what people type. To remove even that, self-host the three fonts and delete the Google Fonts links. The pages fall back to Georgia if the fonts don't load.

**Which calculations are built in:**

| Workpaper | Calculation | Where it goes |
|---|---|---|
| WP-01 | Minutes and percentage per person, how much was noticed and handled without being asked, and the workload balance score | CALC-01 workload balance input |
| WP-02 | Battery score and its reading, plus the two-person average if a partner's score is entered | CALC-01 autonomic saturation input |
| WP-03 | Ownership clarity score, and a list of tasks still missing an owner | CALC-01 ownership clarity input |
| WP-04 | Times flagged per task, a button to pull tasks flagged twice or more into Part B, and counts for Part C | — |
| WP-09 | The message laid out as fact, feeling and ask, plus a pause-or-proceed suggestion from the four filter checks | — |
| WP-13 | Each person's high, medium and low days this week | — |

**What's not included yet:**

- **WP-11, the Calm-Down Kit.** Its source isn't in the project. Add the file and I'll build its page the same way.
- **Password-protected PDFs.** The PDFs aren't encrypted. The pages tell people to keep files in a private or encrypted folder. Password protection can be added later.
- **Access control.** As `paywall-integration.md` explains, a static site can't truly restrict a URL. The pages are marked `noindex` so search engines skip them. Link to them only from the member bundle and member emails, the same way you share the other paid pages.

**Links to add:**

- In the member bundle, add a line under each workpaper: "Fill this in on screen: spreadloveandacceptance.com/workpapers/fill/wp-01.html" (and so on).
- On the Suite Index, WP-01 through WP-13 are marked "Page". Consider adding "Fill-in" to those rows once members have the link.

### Privacy Policy

Find:
> Interactive tools: the Lemonade Stand calculator and Nervous System Ladder run entirely in your browser. Nothing you type into them is transmitted anywhere or stored beyond your current browser session.

Replace with:
> Interactive tools: the Lemonade Stand calculator, the Nervous System Ladder, the Solvency Read calculator and the fill-in workpapers run entirely in your browser. Nothing you type into them is transmitted anywhere or stored by this site. The fill-in workpapers let you download your entries as a PDF or a draft file, and those files are saved only to your own device. Pages load typefaces from Google Fonts, which receives your IP address the way any web font request does, but not anything you type.
