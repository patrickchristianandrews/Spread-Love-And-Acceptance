# CALC-01 — The Solvency Read

**A diagnostic starting point, not an exit script.** A low score doesn't assign blame, and a high score doesn't silence a partner.

**Scope note:** this is a heuristic scoring worksheet. It is not a validated statistical model, was not trained on any dataset, and does not output a judgment about either person or about the relationship's worth. It scores exactly one thing: whether the current shared-workload arrangement, as logged, looks sustainable. Treat everything below as a spec for a transparent, editable formula — not a black box.

**Deployed at:** `/workpapers/calculators/calc01-solvency.html`

## Design rule

Nothing is entered as an abstract 0–1 score. Every sub-matrix is derived in the calculator from the same raw entries its source workpaper asks for, and every derivation is shown on screen. A hand-estimated score is a mood with a decimal point on it.

## The two formulas

```
P(Solvency) = (WB × 0.40) + (OC × 0.35) + ((1 − AS) × 0.25)

apex_score  = (WB × 0.35) + (OC × 0.30) + ((1 − AS) × 0.20) + (RF × 0.15)
```

Both are linear weighted sums, not fitted models. Each weight set sums to 1.00 and every term is bounded 0–1, so each output is bounded 0–1 by construction. There is no training data behind either one and no coefficient was estimated from an observed outcome. The word "probability" in P(Solvency) is a naming convention inherited from the manuscript, not a claim about likelihood.

**This document supersedes** the formula statements in `epistemic-verdict-engine.md` and `hierarchy-matrix.md`, which each defined a different top-level score without reconciling them.

## The four inputs

| Variable | Definition | Source | Range |
|---|---|---|---|
| `WB` | `1 − abs(pctA − pctB) / 100` — even split = 1.00, one-sided = 0.00 | WP-01 Field Audit hours | 0–1 |
| `OC` | tasks with both R and A ÷ total tasks listed | WP-03 RACI Treaty | 0–1 |
| `AS` | mean of both partners' (sum of 5 factors ÷ 20); enters inverted as `1 − AS` | WP-02 Battery Meter | 0–1 |
| `RF` | retunes used ÷ friction events; undefined when friction events = 0 | WP-09 Tone Transducer | 0–1 |

WP-04 and WP-13 feed nothing scored. WP-04 drives treaty amendments; WP-13 produces qualitative notes only.

## Why these weights

The weights are a stated editorial judgment about which failures compound fastest. They are adjustable and are not derived from evidence.

| Term | Solvency | Apex | Reasoning |
|---|---|---|---|
| WB | 0.40 | 0.35 | Weighted highest because an unshared load accumulates whether or not anyone notices. Also the input with the most observable evidence behind it. |
| OC | 0.35 | 0.30 | Close behind, because unclear ownership turns a fixable imbalance into a recurring one. Unowned work defaults to whoever notices first, every time. |
| 1 − AS | 0.25 | 0.20 | Lowest of the three because it's the most volatile week to week and the most self-reported. A single bad-sleep week shouldn't dominate the read. |
| RF | — | 0.15 | Apex only. Small weight, because it's a tally rather than a measurement, and the input most easily inflated by whoever fills it in. |

If weights are changed, every previous read becomes non-comparable, and the change should be recorded here before being used twice.

## Interpretation bands

| Range | Reading | First move |
|---|---|---|
| ≥ 0.70 | The structure is carrying its own weight | Change nothing structural. Keep the same rhythm of check-ins, and protect the rest windows. |
| 0.40–0.69 | Structural drift | Go to the shortfall with the largest gap. When it's ownership: the load isn't failing, the ownership is blurry — an ambiguous task defaults to whoever notices first, every time. |
| < 0.40 | Operating in overdraft | Structural relief and renegotiation, not emotional defence. This is an audit of the operational setup, not of anyone's affection or character. |

Band boundaries are round numbers chosen for legibility. A 0.69 and a 0.70 are the same week; treat the bands as regions, not thresholds.

## Reading the two scores against each other

| Pattern | What it usually means |
|---|---|
| Both high | Workload is shared and owned, and friction is getting repaired. Keep going. |
| Solvency high, apex low | Structure is fine, repair isn't happening. Friction is being absorbed rather than processed. The lever is WP-09, not the treaty. |
| Solvency low, apex higher | Repairing well around a structure that keeps generating the need for repair. The lever is the treaty, not the scripts. |
| Both low | Structure and repair both under water. Worth considering outside help rather than another worksheet. |

## Defined edge cases

- **No hours logged.** WB is undefined, not 1.00. An empty ledger is not a perfectly even week.
- **No tasks listed.** OC is undefined, not 0.00. An empty treaty has no clarity to measure.
- **Only one partner's battery filled in.** No read is produced at all. The hard limit — never computed from one partner's inputs alone — is enforced, not trusted.
- **No friction events.** RF is undefined. Apex is computed on the remaining three weights, renormalized to sum to 1.00, and the readout says so.
- **Retunes exceed friction events.** RF is capped at 1.00. More repairs than problems means the tally is counting something else.

## Optional sigmoid

The same weighted sum may be passed through a logistic curve centred at 0.5:

```
P(Solvency) = 1 / (1 + e^(-6 × (raw − 0.5)))
```

This reshapes the same inputs into an S-curve. It adds no predictive power, since there is still no fitted model behind it, and it makes reads incomparable to any taken without it. Off by default in the calculator.

## Drift rule

Three consecutive weekly drops of more than 0.10 in the apex score trigger a treaty review — not an emergency conversation. A single large drop is usually a week, not a pattern. The calculator's trend log watches for this.

## Reading conditions

The Nervous System Ladder state (ventral / sympathetic / dorsal) does **not** enter the formula and never will. It changes what the calculator advises doing with the result: in sympathetic, record and hold until the weekly closing; in dorsal, record and stop for the night. The number stays visible and unchanged.

## Hard limits on use

- Never computed from one partner's inputs alone.
- Never used as the sole basis for a decision about the relationship's future — it evaluates workload structure, over the scope of one week.
- Never fed a tone, sentiment, timestamp, or audio-derived input, or anything describing one partner without their direct, contemporaneous participation in entering it. If a future version proposes adding such an input, that's a signal to stop and reconsider the feature, not to design around this note.
- Never used to end a conversation. Its only job is to give two people a low-drama place to start.

## Privacy

Runs entirely in the browser. Nothing is transmitted and nothing is persisted — no `localStorage`, no cookies — per the commitment in the site's privacy policy. The trend log clears when the tab closes; print it to keep it. That's deliberate: a shared household computer is exactly where an automatically saved ledger of one person's stress scores stops being a reflection tool.
