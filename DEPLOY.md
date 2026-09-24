# DEPLOY — current file set

18 files. Two carry a warning; read Group 0 first.

Repo root is the site root. GitHub Pages serves from it, so a file's folder path
is also its URL path: `workpapers/wp-03.html` becomes
`spreadloveandacceptance.com/workpapers/wp-03.html`.

---

## Group 0 — READ BEFORE DEPLOYING `index.html` OR `roadmap.html`

Both were edited from copies uploaded several turns ago. Anything changed on the
live site since then is **not** in these versions and will be overwritten.

**Do not deploy either until you have re-uploaded the current live versions and
had the edits reapplied.** The safe alternative is to hand-apply the changes
listed below to your live files — there are six and seven of them respectively,
and they're all small.

Every other file in this set was written from scratch or from sources supplied
directly, so none of them carry this risk.

### `index.html` — six changes
1. Sidebar nav: added `telemetry.html` ("Rollout Telemetry")
2. Sidebar nav: added `suite-index.html` ("Suite Index")
3. Tier card: chapters line → "The Preface and Manuscript Chapters I through V — Chapters VI–XII are still being written"
4. Tier card: workpaper line → WP-04 added to the list
5. Tier card: PROG-01 line reworded
6. Status paragraph: original wording kept verbatim, one sentence appended linking the telemetry and the suite index
7. Footer: added Telemetry and Suite Index links

### `roadmap.html` — seven changes
1. Live Now / Manuscript: added Chapters III, IV, V
2. Live Now / Workpapers: added WP-04
3. In Progress: was "Chapter III" and "WP-04" (both shipped) → now Chapter VI and WP-05
4. Planned / Manuscript: "Chapters IV through XII" → "Chapters VII through XII"
5. Planned / Workpapers: removed WP-05 and WP-11 from the range
6. Planned lede: reworded so the 12/15/7 counts read as design targets
7. Sidebar and footer: added Suite Index link

---

## Group 1 — New site pages (nothing overwritten)

| File | Destination |
|---|---|
| `telemetry.html` | `telemetry.html` (repo root) |
| `suite-index.html` | `suite-index.html` (repo root) |
| `wp-03.html` | `workpapers/wp-03.html` |
| `wp-04.html` | `workpapers/wp-04.html` |
| `wp-09.html` | `workpapers/wp-09.html` |
| `wp-13.html` | `workpapers/wp-13.html` |

Open each in a browser before committing. Check the fonts load (serif headings,
not Times) and that File → Print shows clean page breaks with no table row split
across pages. These are meant to be printed and filled in by hand.

---

## Group 2 — The calculator (replaces a live file)

| File | Destination | Action |
|---|---|---|
| `calc01-solvency.html` | `workpapers/calculators/calc01-solvency.html` | **REPLACE** |
| `calc01-solvency.md` | `telemetry/calc01-solvency.md` | New |

**Do not move the HTML.** That URL is printed on page 23 of the member bundle,
already in members' inboxes.

Compare old and new side by side first. The old version had three sliders; this
one derives every input from entries, shows both P(Solvency) and the apex score,
and documents the scoring system in full. It also refuses to show a score until
both partners' battery columns are filled — enforcing a limit the telemetry spec
already stated, which means a half-filled form now shows nothing.

`calc01-solvency.md` goes in `telemetry/` because it supersedes
`epistemic-verdict-engine.md` and `hierarchy-matrix.md`, which each defined a
different top-level formula. Don't delete those two until you've read it and
agreed with how the conflict was resolved.

---

## Group 3 — Markdown sources

| File | Destination |
|---|---|
| `suite-index.md` | with the other `.md` sources |
| `wp-03.md` | wherever `wp-01.md` lives |
| `wp-04.md` | wherever `wp-01.md` lives |
| `wp-09.md` | wherever `wp-01.md` lives |
| `wp-13.md` | wherever `wp-01.md` lives |

Find `wp-01.md` in your repo first — use the search box at the top of the repo
page. Match wherever it sits. If it isn't in the repo at all, these don't belong
there either; keep them alongside it locally.

GitHub Pages serves `.md` publicly too. If you don't want sources fetchable, put
them in a folder excluded from the Pages build.

---

## Group 4 — The curriculum

| File | Destination |
|---|---|
| `prog-01.html` | `workpapers/prog-01.html` |
| `prog-01.md` | wherever `wp-01.md` lives |

**Deploy this in the same commit as Group 1.** Four pages — `index.html`,
`roadmap.html`, `suite-index.html` and `telemetry.html` — already describe
PROG-01 as live. Nothing links to it yet, so there are no broken links, but
those four claims only become true once this file is up.

If it is not deployed in this batch, the status has to be flipped in all four
instead: telemetry card to a Pending pill, suite index entry moved to Not Yet
Built, and the two tier-card lines reworded.

---

## Old files to DELETE, if present in the repo

- `wp03-raci-treaty.md`
- `wp04-deficit-audit.md`
- `wp09-tone-filter.md`
- `wp13-pll-protocol.md`

Superseded by `wp-03.md` through `wp-13.md`. Two sources per workpaper under
different names is the drift that started all of this. Use `git mv` to the new
name first if you want history preserved.

---

## Soundscapes / media pages

If `soundscapes.html` or similar is live and its players point at directories
that were never populated, it contradicts the source-of-truth boundary and
should come down. Order matters:

1. Remove every link pointing to it (likely `index.html` nav and footer)
2. Delete the page and any empty `assets/audio` or `assets/video` folders
3. Check `index.html` and `roadmap.html` for text promising audio
4. Commit once, stating what came down and why

Deleting the file without removing the links first leaves a 404, which is its
own kind of contradiction.

---

## Order of operations

1. `git checkout -b suite-update`
2. Group 1 + Group 4 — four workpaper pages, telemetry, suite index, and `prog-01.html` → commit
3. Group 2 — compare, then replace the calculator → commit separately
4. Group 3 — markdown sources → commit
5. Group 0 — only after re-uploading current versions and reapplying edits
6. Delete the four superseded `.md` files → commit
7. Merge, push, wait ~1 min for Pages to rebuild
8. Load `spreadloveandacceptance.com/suite-index.html` and click through every
   link from there

---

## Standing release rule

Three pages now report status: `telemetry.html` (the counts),
`suite-index.html` (every component named), `roadmap.html` (what's next).

**Shipping anything means editing all three.** They agree today because they were
verified together. They will drift the first time something ships and only two
get updated — which is exactly how WP-04 ended up listed as shipped in one place
and unstarted in another.

Where they disagree, `suite-index.html` wins. That precedence is written into
the telemetry page itself.

### Current verified counts
- Manuscript: **5 of 12** chapters (42%) — Preface plus I–V
- Workpapers: **7 of 15** (47%) — WP-01, 02, 03, 04, 09, 11, 13
- Calculators: **1 of 7** (14%) — CALC-01
- Public tools: **3 of 3** (100%)
- Curriculum: **6 of 6** weeks (100%)

Denominators never shrink to raise a percentage. If the design changes, state the
change rather than absorbing it.

### Bundle reissue
Three workpapers (WP-03, WP-04, WP-09) now differ from bundle pages 15–22. The
bundle should be regenerated and the version moved to **Baseline v1.0.5**, with
the suite index verification stamp updated to match.
