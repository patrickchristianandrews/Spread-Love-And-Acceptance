# PATCH — hand-apply to your live files

`index.html` and `roadmap.html` in the delivered set were built from copies uploaded
several turns ago. Rather than deploy those and risk overwriting later changes, apply
the edits below directly to your live files.

Each block is a find-and-replace. Search for the FIND text, replace with REPLACE.
If a FIND string is not present, that edit was already applied or that section has
changed — skip it and tell me.


---

## `index.html`

### Edit 1 — add

**INSERT AFTER the line above it in context** (see below)

**REPLACE WITH**
```html
<li><a href="telemetry.html">Rollout Telemetry</a></li>
<li><a href="https://spreadloveandacceptance.com/soundscapes">Soundscape Catalog</a></li>
<li><a href="suite-index.html">Suite Index</a></li>
```

### Edit 2 — replace

**FIND**
```html
<li>Manuscript Chapters I &amp; II, with III&ndash;XII in active development</li>
<li>WP-01, WP-02, WP-03, WP-09, WP-11, and WP-13 &mdash; the remaining workpapers are rolling out over time</li>
```

**REPLACE WITH**
```html
<li>The Preface and Manuscript Chapters I through V &mdash; Chapters VI&ndash;XII are still being written</li>
<li>WP-01, WP-02, WP-03, WP-04, WP-09, WP-11 and WP-13 &mdash; the remaining workpapers are rolling out over time</li>
```

### Edit 3 — replace

**FIND**
```html
<li>PROG-01, the 6-week guided curriculum sequencing the six live workpapers above</li>
```

**REPLACE WITH**
```html
<li>PROG-01, the 6-week guided curriculum, sequencing the live workpapers into a week-by-week program</li>
```

### Edit 4 — replace

**FIND**
```html
<span>The Content Roadmap tracks every chapter, workpaper, and calculator by real status &mdash; Live Now, In Progress, or Planned &mdash; updated the same day something actually ships. No guessing, no marketing gloss: if it's not listed as live there, it isn't live yet.</span>
```

**REPLACE WITH**
```html
<span>The Content Roadmap tracks every chapter, workpaper, and calculator by real status &mdash; Live Now, In Progress, or Planned &mdash; updated the same day something actually ships. No guessing, no marketing gloss: if it's not listed as live there, it isn't live yet. See also the <a href="telemetry.html">Rollout Telemetry</a> for the counts, and the <a href="suite-index.html">Suite Index</a> for what each piece does.</span>
```

### Edit 5 — add

**INSERT AFTER the line above it in context** (see below)

**REPLACE WITH**
```html
<a href="telemetry.html">Telemetry</a>
<a href="https://spreadloveandacceptance.com/soundscapes">Soundscapes</a>
<a href="suite-index.html">Suite Index</a>
```


*5 edits total for `index.html`.*


---

## `roadmap.html`

### Edit 1 — add

**INSERT AFTER the line above it in context** (see below)

**REPLACE WITH**
```html
<a class="back-link" href="suite-index.html">The Suite Index &rarr;</a>
```

### Edit 2 — add

**INSERT AFTER the line above it in context** (see below)

**REPLACE WITH**
```html
<li>Chapter III — Autonomic Saturation &amp; the 7 Ocular Vectors</li>
<li>Chapter IV — Deontological Parity &amp; Sensory Gating</li>
<li>Chapter V — The Deficit Audit</li>
```

### Edit 3 — add

**INSERT AFTER the line above it in context** (see below)

**REPLACE WITH**
```html
<li>WP-04 — Unbilled Deficit Audit</li>
```

### Edit 4 — replace

**FIND**
```html
<li class="tbd">Chapter III — topic to be finalized</li>
<li class="tbd">WP-04 — topic to be finalized</li>
```

**REPLACE WITH**
```html
<li class="tbd">Chapter VI — topic to be finalized</li>
<li class="tbd">WP-05 — topic to be finalized</li>
```

### Edit 5 — replace

**FIND**
```html
<p class="lede">On the roadmap, not yet started. Filling out the framework toward the full 12-chapter manuscript, 15-workpaper suite, and 7 calculators referenced in the Survival Kit tier.</p>
```

**REPLACE WITH**
```html
<p class="lede">On the roadmap, not yet started. Filling out the framework toward the full 12-chapter manuscript, 15-workpaper suite, and 7 calculators the framework is designed around.</p>
```

### Edit 6 — replace

**FIND**
```html
<li class="tbd">Chapters IV through XII — topics to be finalized</li>
```

**REPLACE WITH**
```html
<li class="tbd">Chapters VII through XII — topics to be finalized</li>
```

### Edit 7 — replace

**FIND**
```html
<li class="tbd">WP-05 through WP-08, WP-10 through WP-12, WP-14, WP-15 — topics to be finalized</li>
```

**REPLACE WITH**
```html
<li class="tbd">WP-06 through WP-08, WP-10, WP-12, WP-14, WP-15 — topics to be finalized</li>
```

### Edit 8 — add

**INSERT AFTER the line above it in context** (see below)

**REPLACE WITH**
```html
<a href="suite-index.html">Suite Index</a>
```


*8 edits total for `roadmap.html`.*

---

## `index.html` — additional edits for the two new pages

These were generated after the diff above. Apply them the same way.

### Edit A — sidebar nav

**FIND**
```html
<li><a href="telemetry.html">Rollout Telemetry</a></li>
```

**REPLACE WITH**
```html
<li><a href="telemetry.html">Rollout Telemetry</a></li>
<li><a href="program-overview.html">Program Overview</a></li>
```

### Edit B — footer links

**FIND**
```html
<a href="telemetry.html">Telemetry</a>
```

**REPLACE WITH**
```html
<a href="telemetry.html">Telemetry</a>
<a href="program-overview.html">Program Overview</a>
```

**Note:** `report-01.html` is deliberately NOT linked from `index.html`. It's a member
instrument and lives under `workpapers/`, where nothing on the public site links to
anything — same as WP-01 through WP-13. It's reachable from `suite-index.html`, which
is where members go to find instruments.

---

## Destinations for the two new pages

| File | Destination | Why |
|---|---|---|
| `program-overview.html` | repo root | Public explainer, same class as the roadmap. Links `assets/css/book-layout.css` relatively, which only resolves from root. |
| `report-01.html` | `workpapers/report-01.html` | Member instrument. CSS is inlined, so it works from any folder. |

### REPORT-01 and the telemetry

`report-01.html` deliberately gets no bar on `telemetry.html`. That page divides what
is built by what was promised, and REPORT-01 was never part of the 12/15/7 counts — so
there is no honest denominator to divide it by. Same reasoning as the soundscape
catalog. It's listed on the Suite Index instead, which names things rather than counting
them.
