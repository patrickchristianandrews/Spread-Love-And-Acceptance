# Telemetry Spec — Epistemic Verdict Engine

**Scope note:** "Epistemic Verdict Engine" is this project's internal name for a heuristic scoring worksheet. It is not a validated statistical model, was not trained on any dataset, and does not output a judgment about either person or about the relationship's overall worth. It scores exactly one thing: whether the current shared-workload arrangement, as logged, looks sustainable. Treat everything below as a spec for a transparent, editable spreadsheet formula — not a black box.

## Formula

```
P(Solvency) = (workload_balance_score * 0.40)
            + (ownership_clarity_score * 0.35)
            + ((1 - average_autonomic_saturation) * 0.25)
```

All three inputs are bounded 0–1. Output is bounded 0–1 by construction (weights sum to 1.0, each term is a weighted probability-like share).

### Why "logistic regression" language gets used loosely

Earlier drafts of this project referred to this as a logistic regression. To be precise: this is a **linear weighted sum**, not a fitted logistic model — there is no training data and no coefficients estimated from observed outcomes. If a future version wants a genuine logistic curve (e.g., to compress extreme inputs toward 0 or 1 more aggressively), the same three terms can be passed through a sigmoid:

```
raw = (workload_balance_score * 0.40) + (ownership_clarity_score * 0.35) + ((1 - average_autonomic_saturation) * 0.25)
P(Solvency) = 1 / (1 + e^(-6 * (raw - 0.5)))
```

This just reshapes the same inputs into an S-curve centered at 0.5 — it does not add predictive power, since there's still no fitted model behind it. Document any such change here before shipping it, so nobody mistakes house arithmetic for a validated instrument.

## Inputs, defined precisely

| Variable | Definition | Computed from |
|---|---|---|
| `workload_balance_score` | `1 - abs(pctA - pctB) / 100` | Lemonade Stand hour totals |
| `ownership_clarity_score` | tasks with both R and A filled ÷ total tasks | RACI Treaty (WP-03) |
| `average_autonomic_saturation` | mean of both partners' ASI scores | ASI Matrix (WP-02) |

## Interpretation bands

| Range | Reading |
|---|---|
| ≥ 0.70 | Arrangement is carrying its own weight |
| 0.40–0.69 | Drifting — check ownership clarity first |
| < 0.40 | Current arrangement unsustainable as structured |

## Hard limits on use

- Never computed from one partner's inputs alone.
- Never used as the sole basis for a decision about the relationship's future — it evaluates workload structure only, over the scope of one week.
- Never fed a tone, sentiment, or audio-derived input (see exclusions in `hierarchy-matrix.md`).
