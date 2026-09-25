# spreadloveandacceptance.com

Source for The Objective Ledger (TOL-OS) site. The repo root is the site root: GitHub Pages serves it as-is, so a file's path is its URL (`workpapers/wp-01.html` → `spreadloveandacceptance.com/workpapers/wp-01.html`). Every file in the repo is public, including `.md` files and this README.

## How the site fits together

- **Navigation and membership** live in one file: `assets/js/site.js`. The `SECTIONS` list at the top is the menu for every page, in reading order. To add a page, add a line there and put these two lines in the page's `<head>`:
  ```html
  <link rel="stylesheet" href="/assets/css/site.css">
  <script src="/assets/js/site.js" defer></script>
  ```
- **Simple first, dig deeper on demand.** A page's normal address is its simple version: a short lede, a few numbered ideas, and a "Try this" box. The full version sits beside it as `<name>-in-depth.html` (for example `book/chapter-2.html` and `book/chapter-2-in-depth.html`). Each idea ends with a pickaxe link that jumps to the matching section of the full page:
  ```html
  <a class="dig" href="/book/chapter-2-in-depth.html#inputs">Dig deeper: where each number comes from</a>
  ```
  Give every section on the in-depth page an `id` to jump to. Set `deep: true` on the page's line in `SECTIONS`: the menu then shows its own Dig deeper link, and the in-depth page shares the simple page's members lock and previous/next links. Split so far: the book, every workpaper and REPORT-01, PROG-01, and the guide pages (How it works, Is this right for you, Relationships, Check-ins, Wired Differently, the Frequency Framework, Stories from Philosophy, Contents, Ways in, Suite Index, Program Overview, About). The home page is simple on its own. Interactive tools and calculators are not split: the tool itself is the simple version.
- **Members-only pages:** set `paid: true` on the page's line in `SECTIONS`. While `freePreview: true`, those pages open for anyone who signs up with an email (sent to Buttondown). The lock only runs in the browser: the page's HTML is still public, so treat it as a sign-up prompt, not protection.
- **Members list:** `data/members.json` holds SHA-256 fingerprints of member emails, never the addresses. Manage it with `python3 manage-members.py add|remove|check|count <email>`, then commit and push.
- **Household dashboard:** `dashboard.html` uses Supabase. Setup is in `dashboard-setup.md`, the schema in `supabase/schema.sql`. Only the anon/publishable key goes in `assets/js/dashboard-config.js`, never the service_role key.

## Folders

| Path | What's there |
|---|---|
| root `*.html` | Public pages, plus the standalone workpaper files (`wp-01.html`, `wp-02.html`, …, `calc01-solvency.html`) that also make up the Survival Kit bundle |
| `book/` | The manuscript chapters (Preface, I–V) |
| `workpapers/` | Workpaper pages linked from the menu, plus their `.md` sources |
| `workpapers/fill/` | Fill-in versions that save as PDFs |
| `workpapers/calculators/` | CALC-01 as linked from the menu |
| `tools/`, `snapshot/`, `learn/`, `do/`, `architecture/` | Interactive tools and explainer sections |
| `legal/` | Privacy policy, terms, refund policy. The root copies only redirect here |
| `assets/css`, `assets/js`, `assets/audio` | Shared styles, scripts and media |
| `manuscript/`, `telemetry/` | Markdown sources and specs (`telemetry/calc01-solvency.md` is the current CALC-01 spec) |
| `infrastructure/`, `notes/`, `samples/` | Internal notes and sample PDFs, not linked from the site |

## Rules to keep

- **Don't move `workpapers/calculators/calc01-solvency.html`.** That URL is printed in the member bundle.
- **Shipping anything means updating all three status pages:** `telemetry.html` (the counts), `suite-index.html` (every component named) and `roadmap.html` (what's next). Where they disagree, `suite-index.html` wins. Denominators never shrink to raise a percentage; if the plan changes, say so on the page.
- **One copy per page.** Before uploading a new version, check where the current one lives (search the repo) and replace it there instead of adding a second copy under another name.
- **Use root-relative links** (`/book/chapter-1.html`) so pages work from any folder.

## Open decisions

- WP-03, WP-04, WP-09 and CALC-01 each have a longer standalone version at the root (`wp-03.html`, `wp-04.html`, `wp-09.html`, `calc01-solvency.html`) and a shorter version linked from the menu under `workpapers/`. Decide which is current and keep one.
- `workpapers/wp-11.html` is a standalone copy of the Calm-Down Kit; the menu links the root `wp-11.html`.
- Several markdown sources still exist in more than one version: `workpapers/wp-01.md` vs `workpapers/workpapers/wp-01.md`, `wp-03.md` and `wp-04.md` (in root, `workpapers/` and `workpapers/workpapers/`), and `workpapers/wp03-raci-treaty.md` vs `workpapers/workpapers/wp03-raci-treaty.md`.
- Google Analytics (`G-NKC6CQ9S66`) runs on about 25 pages, but the privacy policy says the site has no analytics. Remove the tag or update the policy.
- `joinUrl` and `formKey` in `assets/js/site.js` are still placeholders.
