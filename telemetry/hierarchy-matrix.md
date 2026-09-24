# Telemetry Spec — Hierarchy Matrix

**Scope note:** every score in this document is derived from inputs both people enter about shared, observable things (hours logged, tasks owned, self-reported saturation). Nothing here is derived from, or intended to characterize, one person's personality, worth, or behavior in isolation.

## Purpose

Defines how the individual workpaper scores roll up into a single top-level reading (the "apex score") for a given week, so the site's components (Lemonade Stand, ASI matrix, RACI treaty, solvency calculator) stay consistent with each other.

## Sub-matrices

| Sub-matrix | Source | Range | Computed in |
|---|---|---|---|
| Workload Balance (WB) | Lemonade Stand hours | 0–1 | `/assets/js/lemonade-calc.js` |
| Ownership Clarity (OC) | RACI Treaty (WP-03) | 0–1 | Manual, per treaty review |
| Autonomic Saturation (AS) | ASI Matrix (WP-02) | 0–1 | Manual, per partner, averaged |
| Retuning Frequency (RF) | Tone Filter usage (WP-09) | 0–1 | Manual tally: retunes used ÷ friction events logged |

`Workload Balance` is derived from the Lemonade Stand split: `1 - abs(pctA - pctB)/100`, i.e. a perfectly even week scores 1, a fully one-sided week scores 0.

## Apex score

```
apex_score = (WB * 0.35) + (OC * 0.30) + ((1 - AS) * 0.20) + (RF * 0.15)
```

This is a superset of the `P(Solvency)` formula in `epistemic-verdict-engine.md` — Solvency uses WB, OC, and AS only, as the narrower "is this week's workload sustainable" question. The apex score adds Retuning Frequency to capture whether communication repair is happening, not just whether the workload is balanced.

## Reporting cadence

- **Daily:** PLL loop (WP-13) feeds qualitative notes only, not scored.
- **Weekly:** all four sub-matrices recomputed at the weekly closing-the-books session (see the Preface and WP-13's weekly resync).
- **Monthly:** apex score trend reviewed for drift; three consecutive weekly drops of >0.1 triggers a RACI treaty review, not an emergency conversation.

## Explicit exclusions

This hierarchy does not, and should not be extended to, ingest: tone of voice recordings, message sentiment analysis, timestamps of responsiveness, or any input describing one partner without their direct, contemporaneous participation in entering it. If a future contributor proposes adding such an input, that's a signal to stop and reconsider the feature, not to design around this note.
