# Further Reading: keeping the list healthy

The Further Reading list lives in `assets/js/reading-list.js` (`window.TOL_READING`). It feeds
the full page at `/reading.html` and the small "Something to read" card
(`assets/js/reading-suggest.js`, `window.TOLReading`).

## Re-checking the links

```sh
python3 tools/reading/check_links.py            # all items
python3 tools/reading/check_links.py --source gg --json /tmp/gg.json
```

Standard library only. Each link is fetched and reported as OK, RETITLED (title changed, have a
look), HOME (redirected to a home or section page: treat as broken), BROKEN (404/410/other error)
or BLOCKED (the site refused an automated request; open it in a browser). The script exits with
status 1 when anything is BROKEN or HOME. Run it every month or two, and after any big redesign on
a publisher's site.

When a link breaks: search the publisher's site for the title. If the article moved, update its
`url`; if it is gone, delete the line. Keep the `id` of a moved article the same, because readers'
browsers remember which ids they have already opened.

## Adding an article

Add one line to `items`, in the same shape as the others:

- `id`: short, unique, never reused (source key + a few title words)
- `source`: a key from `sources`; add a new source there only if it is genuinely reputable
- `title`: exactly as the publisher shows it; `author` only when shown
- `summary`: one sentence in our own words (never copy the article's text)
- `topics`: keys from `tags`; the first one is the group it appears under on `/reading.html`
- `pillars`: which of the Five Pillars it belongs to (`I` to `V`, see `/five-pillars.html`)
- `audience`: `self` (understanding yourself), `others` (getting along with others) or `both`
- `pages`: site pages it goes with (the card prefers these on those pages)

Leave out anything about abuse, domestic violence, suicide or crisis lines, clickbait, and
pieces built around medical treatment advice.

## Wiring the card into a page

```html
<script src="/assets/js/reading-list.js" defer></script>
<script src="/assets/js/reading-suggest.js" defer></script>
<div id="read-next"></div>
<script>
  document.addEventListener('DOMContentLoaded', function () {
    TOLReading.mount('#read-next', { topics: ['calm'] });   // options are all optional
  });
</script>
```

Options: `topics` (tag keys), `pillars` (e.g. `['III']`), `page` (defaults to the current path),
`audience` (`'self'` or `'others'` to start the toggle on one side), `heading` (2 to 6, default 3),
`scan: false` (don't read the page's words for topics). `TOLReading.card(opts)` returns the element
without placing it; `TOLReading.suggest(opts)` returns one item. The only thing stored is the list
of article ids a reader has opened, in their own browser (`localStorage['tol-reading-v1']`).

`/reading.html` also accepts filters in the address, e.g. `/reading.html#for=me&pillar=III&topic=calm`.
