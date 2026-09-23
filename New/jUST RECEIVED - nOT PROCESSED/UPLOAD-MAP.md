# Upload Map — 13 HTML files

Two ways to get these onto the server. Pick one.

## Option A — the zip (no renaming)
`tol-os-site-files.zip` already has the folder structure inside it. Unzip it and upload the contents to your web root. Done.

## Option B — individual downloads (rename as you upload)
The download cards use flattened names so you can tell them apart. Rename each one as shown:

| Download name | Upload it to | Rename it to |
|---|---|---|
| `index.html` | `/` | `index.html` |
| `snapshot-index.html` | `/snapshot/` | `index.html` |
| `snapshot-diagnostic-snapshot-interactive.html` | `/snapshot/` | `diagnostic-snapshot-interactive.html` |
| `learn-index.html` | `/learn/` | `index.html` |
| `learn-marco-yuki-index.html` | `/learn/marco-yuki/` | `index.html` |
| `do-index.html` | `/do/` | `index.html` |
| `do-workpaper-playground.html` | `/do/` | `workpaper-playground.html` |
| `architecture-index.html` | `/architecture/` | `index.html` |
| `architecture-review.html` | `/architecture/` | `review.html` |
| `reference-index.html` | `/reference/` | `index.html` |
| `reference-diagnostic-framework.html` | `/reference/` | `diagnostic-framework.html` |
| `reference-carrier-wave-decoder.html` | `/reference/` | `carrier-wave-decoder.html` |
| `reference-tol-os-strategy.html` | `/reference/` | `tol-os-strategy.html` |

The five `index.html` files are different pages — each is the landing page for its own folder, which is what makes `/snapshot/`, `/learn/`, `/do/`, `/architecture/` and `/reference/` work as clean URLs. That's why five of them share a name on the server.

## Final structure

```
/
├── index.html
├── snapshot/
│   ├── index.html
│   └── diagnostic-snapshot-interactive.html
├── learn/
│   ├── index.html
│   └── marco-yuki/
│       └── index.html
├── do/
│   ├── index.html
│   └── workpaper-playground.html
├── architecture/
│   ├── index.html
│   └── review.html
└── reference/
    ├── index.html
    ├── diagnostic-framework.html
    ├── carrier-wave-decoder.html
    └── tol-os-strategy.html
```

Upload the root `index.html` first — it carries the navigation that points at everything else.

## Correction on the count

I said 19 files earlier. The real number is 13. The 19 came from my own miscount, not from files going missing — nothing on the list above is a placeholder, and nothing else was built. If you want the four items that would round it out (the three `wp-01-demo.html` / `wp-03-demo.html` / `calc01-demo.html` pages the playground links to, plus a `/learn/` case study for a second quadrant), those are still unbuilt and the playground links to them will 404 until they exist.
