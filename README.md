# TOL-OS site update

Everything in `site/` mirrors the root of spreadloveandacceptance.com. Copy its contents into your site repository, keeping the folders as they are.

## What's in `site/`

| Path | Status | Notes |
|---|---|---|
| `start-here.html` | New | The Start Here orientation page |
| `roadmap.html` | Replaces the live file | Matches the Suite Index. Confirm "Chapter VI" is what's actually in progress |
| `infographic.html` | Replaces the live file | Only the footer line changed. Compare it with your live version first. If the live one has changed since, edit just that line instead |
| `assets/js/lemonade-calc.js` | Replaces the live file | A code comment only |
| `manuscript/ch03-autonomic-saturation.md` | Renamed | Replaces `ch03-telemetry-metrics.md`, which you can delete |
| `manuscript/ch04-deontological-parity.md` | Renamed | Replaces `ch04-ocular-vectors.md`, which you can delete |
| `workpapers/wp-01.md` | Updated | Stale Chapter III reference fixed |
| `workpapers/wp03-raci-treaty.md` | Updated | Adds "When to use" and fixes the Chapter V reference |
| `workpapers/wp13-pll-protocol.md` | Updated | Chapter V reference fixed |
| `telemetry/hierarchy-matrix.md` | Updated | Chapter V reference fixed |
| `workpapers/fill/` | New folder | The fill-in workpapers that save as PDFs. Upload the whole folder |

The `manuscript/` and `workpapers/` locations for the markdown files are my best guess from your project notes. If your repository keeps them elsewhere, put them wherever the old versions are.

## Everything else

- `notes/site-fixes.md`: find-and-replace edits for live pages whose source wasn't in the project (homepage, Suite Index, About, Try It, Playground, Program Overview, Telemetry, Privacy Policy), in priority order. Not for uploading.
- `samples/`: two example PDFs from the fill-in workpapers, filled in with test entries. Not for uploading.

## After uploading

1. Delete `manuscript/ch03-telemetry-metrics.md` and `manuscript/ch04-ocular-vectors.md`.
2. Work through `notes/site-fixes.md`, including the Privacy Policy update in item 14.
3. Open `/workpapers/fill/wp-01.html` on the live site and check that Download PDF works.
4. Add the fill-in page links to the member bundle, then regenerate the bundle (item 12).
