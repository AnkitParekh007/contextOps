# Phase 12 — Reproducible Benchmarking and Cost per Success

## First engineering increment

- Eligible labeled samples can use seeded, deterministic STRATIFIED selection (default), or CHRONOLOGICAL legacy selection.
- Stores SHA-256 selection fingerprints, sample seed, eligible population count, selected stratum counts and coverage.
- Proportional strata with minority-group inclusion make class imbalance visible, but do not guarantee random or representative production data.
- Wilson 95% score intervals are diagnostic; independence assumptions may not hold in stratified workloads.
- Per-class precision, recall, F1, candidate p50/p95 successful-response latency and provider error count accompany raw accuracy.
- Baseline and candidate cost per correctly classified task use user-entered example price assumptions, not provider invoices.
- Raw customer labels are hashed in aggregated sample metadata. Tenant-scoped evaluation results retain appropriate private labels.
- Real provider comparisons remain explicitly consent-gated and capped at 10 requests; the conservative 30+ sample statistical gate cannot pass yet. Mock-only approved policies remain offline simulations.
- Unit tests cover deterministic fingerprints, seed variation, label coverage, small-sample uncertainty and per-class quality.

## External gates still pending

1. Secure hosted Railway app, managed backups and Phase 11 independent privacy/security approval.
2. Pre-registered workload-specific population, label taxonomy, time window, exclusion criteria and blind holdout.
3. Independently adjudicated human ground truth, real provider-model permission and per-run spending limits.
4. Large-enough statistically justified samples, stratification-aware uncertainty and evidence against data leakage.
5. Real invoices, token usage, retry/fallback expenses, latency observations and cost-per-success reconciliation.
6. Independent human approval prior to any non-simulated routing, which is not implemented here.

No current result establishes verified customer savings or guaranteed production quality.