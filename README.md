# spreadloveandacceptance.com

This folder is the root of the website. Everything inside it goes at the top level of your GitHub Pages repository, exactly as arranged here.

```
/                          Home, membership, quick checks, framework, summary, roadmap, 404
├── book/                  Preface and Chapters I–V
├── workpapers/            WP-01, 02, 03, 04, 09, 13
│   └── calculators/       CALC-01 Solvency Read
├── tools/                 Mood Arbitrage, Frequency Calibration, Sync Visualizer
├── legal/                 Privacy, terms, cancellation & refunds
├── assets/
│   ├── css/               site.css (header, contents, members box), reading.css, page styles
│   └── js/                site.js (page list + all settings), lemonade-calc.js
├── data/
│   └── members.json       Members list (email fingerprints only)
├── CNAME                  Points GitHub Pages at spreadloveandacceptance.com
├── README.md              This file
└── manage-members.py      Adds and removes members
```

Every link on the site is written from the root (for example `/book/chapter-2.html`), so pages work from any folder.

## Uploading

1. Unzip `spreadloveandacceptance.zip`. You'll get a folder called `spreadloveandacceptance`.
2. Open that folder and select everything inside it: the folders and the files together.
3. On GitHub, open your repository, then **Add file → Upload files**, and drag the selection onto the page. Dragging keeps the folders intact. The "choose your files" button can't pick folders, so drag instead.
4. Commit to `main`.

**Remove the old site's leftovers first.** Anything left at an old address keeps being served in place of the new page, and the 404 redirects can't reach it. Delete from the repository:

- any `.html` page at the top level other than `index.html`, `404.html`, `membership.html`, `quick-checks.html`, `frequency-framework.html`, `infographic.html` and `roadmap.html`. For example, old copies of `mood-arbitrage-full.html`, `wp-01.html` or `privacy-policy.html` sitting at the top level
- `active-subscribers.json`, `members.json` at the top level, `paywall-control.js`, `paywall-css.css`, `PAYWALL-MODAL-TEMPLATE.html`, `tol-os-unified.css` and `book-layout.css` at the top level
- the `telemetry/` folder, and any planning `.md` or `.txt` guides

Files in `legal/`, `assets/` and `workpapers/calculators/` with the same names are simply replaced by the upload.

## Before you launch

All settings live at the top of `assets/js/site.js`. You can edit it on GitHub: open the file and click the pencil.

1. **Gumroad link.** Replace `joinUrl` with your Gumroad product link. Every Join button reads from that one line.
2. **Broken-link reports.** Go to https://web3forms.com, create a free access key with your email, and paste it into `formKey`. Reports from the 404 page then arrive in your inbox, and your email address never appears on that page. The key is safe to be public. Until it's filled in, the report form stays hidden.
3. **Remove the test member.** `python3 manage-members.py remove test@example.com`
4. **Custom domain.** In Settings → Pages, confirm the custom domain reads `spreadloveandacceptance.com` to match `CNAME`, and turn on Enforce HTTPS once it's offered.

## Members

`data/members.json` is public, so it stores a one-way fingerprint of each email, never the address. Run these from the top-level folder:

- New subscriber: `python3 manage-members.py add their@email.com`
- Cancellation: `python3 manage-members.py remove their@email.com`. Your refund policy promises access until the end of the paid period, so do this when that period ends, not when the cancellation notice arrives.
- Check someone: `python3 manage-members.py check their@email.com`

Then publish: `git add data/members.json && git commit -m "Update members" && git push`

A member signs in once with their subscription email, and every members page opens in that browser. Each visit re-checks the list, so a removed member is locked out on their next page load.

## Changing the site

- **Make a page free or members-only:** in `assets/js/site.js`, add or remove `paid: true` on that page's line in `SECTIONS`.
- **Add a page:** put the file in the right folder, add one line to `SECTIONS` with its path from the root (like `/workpapers/wp-05-example.html`), and put these two lines in its `<head>`:
  ```html
  <link rel="stylesheet" href="/assets/css/site.css">
  <script src="/assets/js/site.js" defer></script>
  ```
  Chapter and workpaper pages also use `<link rel="stylesheet" href="/assets/css/reading.css">`. Wrap any members-only part in `<div class="locked-section"> … </div>`.

## Testing on your computer

Links start from the site root, so serve the folder rather than double-clicking a file:

```
cd spreadloveandacceptance && python3 -m http.server 8000
```

Then visit http://localhost:8000.

## Limits worth knowing

This is a static site, so members content is hidden in the browser, not withheld by a server. Anyone who views the page source can read it. That's normal for a small membership at this stage. If it becomes a problem, the next step is a host with real logins, such as Gumroad's own content delivery or Memberful.
