# The Suite Index

**TOL-OS · Baseline v1.0.4 · Verified 17 September 2026**

This page is the source of truth for what the Suite contains. Status is descriptive: checked against the member bundle and the published files, not against the roadmap. If something isn't listed here, it isn't built — regardless of where else it may be mentioned.

Verified against `Baseline v1.0.4`, whose cover states its contents as: the Preface, Chapters I through V, and Workpapers 01 through 04, 09 and 13.

**Status key**

| Marker | Meaning |
|---|---|
| Live page | Has its own page on the site |
| In bundle | Delivered in the member PDF, no standalone page yet |
| Drafted | Written, not yet published |
| Not built | Nothing exists |

## Start here

Every instrument works on its own, but they were built to be picked up in an order. Used all at once they collapse into paperwork, which is the most common way a household abandons the whole thing in week two.

- **If you're new:** begin with WP-01 and keep a single week of the Field Audit before touching anything else. Nothing downstream works without it.
- **If something is on fire right now:** WP-02 first, then WP-09. Check what you're carrying before you decide what the conversation is about.
- **If the same argument keeps recurring:** that's a WP-03 problem, not a communication problem. Unowned work defaults to whoever notices first, every time.

Intended sequence: WP-01 → WP-02 → WP-03 → WP-09 → WP-13, with CALC-01 read once the first three have produced numbers, and WP-04 picked up monthly after that.

## Free & public

| Item | What it does | File | Status |
|---|---|---|---|
| The Lemonade Stand Heuristic | Interactive ledger of the week's visible hours per person. Reports the split as a fact, not a verdict. | `index.html` + `/assets/js/lemonade-calc.js` | Live page |
| The Nervous System Ladder | Three-rung self-check on which state you're reading from. Short version of what WP-02 measures properly. | `index.html` | Live page |
| Infographic Executive Summary | The framework on one printable page. | `infographic.html` | Live page |
| Chapters I & II | The Radio Frequency Paradigm and the Epistemic Verdict Engine, free in full. | `index.html` | Live page |

## The manuscript

| Part | Title | Pairs with | Status |
|---|---|---|---|
| Front | Preface — Unbilled Debt | — | In bundle |
| Ch. I | The Radio Frequency Paradigm | WP-09 | In bundle |
| Ch. II | The Epistemic Verdict Engine & P(Solvency) | CALC-01 | In bundle |
| Ch. III | Autonomic Saturation & the 7 Ocular Vectors | WP-02 | In bundle |
| Ch. IV | Deontological Parity & Sensory Gating | WP-03 | In bundle |
| Ch. V | The Deficit Audit | WP-04 | In bundle |

Chapters I and II are also free on the public site. Chapters III through V require membership.

## The workpapers

Six built. The numbering is not sequential and never has been — the numbers are slots in a planned framework, and the gaps are honest rather than accidental.

### WP-01 — Field Audit & Neutral Refusals · Live page

- **What it does:** a seven-day raw log of what was actually done, by whom, for roughly how long, kept before any interpretation is added. Part B adds scripts for declining or deferring without a fight.
- **When to use:** first, always. Then one full week per quarter as a re-baseline. Not continuously — permanent logging turns a diagnostic into a chore.
- **Feeds:** Workload Balance (WB) into CALC-01.
- **File:** `/workpapers/wp-01.html`

### WP-02 — Autonomic Saturation Index · Live page

- **What it does:** five factors, rated 0–4 by each person about themselves, separating "how much am I already carrying" from "how upset am I about this specific thing."
- **When to use:** daily as a sixty-second habit, and always before a conversation you expect to be hard. Never filled in about the other person.
- **Feeds:** Autonomic Saturation (AS) into CALC-01, inverted as `1 − AS`.
- **File:** `/workpapers/wp-02-The-Battery-__Stress-Meter.html`
- **Note:** the bundle calls this the Autonomic Saturation Index; the site page is titled The Battery & Stress Meter. Same instrument, same five factors, same arithmetic.

### WP-03 — Domestic RACI Treaty · Live page

- **What it does:** assigns exactly one Responsible and one Accountable to every recurring task, so ownership stops getting renegotiated by default every week.
- **When to use:** after two weeks of Field Audit data, so you're assigning from evidence rather than impressions. Amend whenever life changes.
- **Feeds:** Ownership Clarity (OC) into CALC-01.
- **File:** `/workpapers/wp-03.html` · bundle pages 15–16

### WP-04 — Unbilled Deficit Audit · Live page

- **What it does:** a monthly pass across four weeks of Field Audits to find tasks that keep becoming deficits, classifying each as a structural gap, a capacity issue, or a one-off.
- **When to use:** monthly, not weekly. It exists for patterns invisible at the weekly scale.
- **Feeds:** nothing scored. It drives amendments to WP-03.
- **File:** `/workpapers/wp-04.html` · bundle pages 17–18

### WP-09 — Tone Transducer & Filter · Live page

- **What it does:** two directions. The transducer converts your raw reaction into fact, feeling and ask before you send it. The filter decides how much weight to give what you just received.
- **When to use:** in the moment, on one thing that actually stung. Running everything through it turns a repair tool into a performance.
- **Feeds:** Retuning Frequency (RF) into the apex score.
- **File:** `/workpapers/wp-09.html` · bundle pages 19–20

### WP-13 — Phase-Locked Loop Protocol · Live page

- **What it does:** a ninety-second daily check-in — load, friction, ask — with no debate, no solving, no rebuttal. Small continuous corrections instead of occasional large ones.
- **When to use:** daily, permanently. The one habit meant to outlive the rest of the system.
- **Feeds:** qualitative notes only. Never scored.
- **File:** `/workpapers/wp-13.html` · bundle pages 21–22
- **Note:** the page adds a seven-day capture grid and a resync table; the protocol itself is unchanged from the bundle.

## The calculators

### CALC-01 — The Solvency Read · Live page

- **What it does:** takes the numbers the workpapers produce and returns a single 0–1 read on whether the current workload arrangement looks sustainable. Scores the arrangement — not either person, and not the relationship.
- **When to use:** at the weekly closing, once WP-01, WP-02 and WP-03 have each produced a figure.
- **Takes:** WB from WP-01, OC from WP-03, AS from WP-02, optionally RF from WP-09.
- **File:** `/workpapers/calculators/calc01-solvency.html` · spec in `calc01-solvency.md`

Browser-based, not reproduced as a static page in the bundle. Runs locally and stores nothing.

## How they connect

| Source | Produces | Definition | Used in |
|---|---|---|---|
| WP-01 | WB | Workload Balance — `1 − abs(pctA − pctB) / 100` | Both scores |
| WP-03 | OC | Ownership Clarity — tasks with both R and A, over total tasks | Both scores |
| WP-02 | AS | Autonomic Saturation — mean of both partners' five-factor scores | Both scores |
| WP-09 | RF | Retuning Frequency — retunes used over friction events | Apex only |
| WP-04 | — | Monthly deficit classification; drives treaty amendments | Not scored |
| WP-13 | — | Daily qualitative notes; repeats promote to WP-03 or WP-09 | Not scored |

**P(Solvency)** uses WB, OC and AS, and asks the narrow question: is this week's workload sustainable as structured? The **apex score** adds RF and asks the wider one: is the whole system working, including repair? They can disagree, and the disagreement is the useful part.

> **What none of this will ever take as an input:** tone of voice, recordings, message sentiment, response timestamps, or anything describing one person without their direct participation in entering it. No score is ever computed from one partner's inputs alone, and none of it is a validated clinical or statistical instrument. If a number is ever used to end a conversation rather than start one, it's being misused.

## Not yet built

| Item | State | Status |
|---|---|---|
| The six-week guided curriculum | Written in full — sequences WP-01, 02, 03, 09 and 13 into a week-by-week program with checkpoints. Not yet published or in the bundle. | Drafted |
| Chapters VI through XII | Topics not yet finalized. | Not built |
| WP-05–08, WP-10–12, WP-14, WP-15 | Reserved slots. Topics not yet finalized. | Not built |
| CALC-02 through CALC-07 | Reserved slots. Topics not yet finalized. | Not built |

Release order and timing are estimates, not commitments. This page is updated when work is actually finished, not on a schedule anyone is being billed against. The roadmap describes intent; this index describes what exists, and where the two disagree, this index is correct.
