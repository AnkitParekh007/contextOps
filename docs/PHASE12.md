# Phase 12 — Reproducible Benchmarking and Cost per Success

## First engineering increment

- Eligible labeled samples can use seeded, deterministic STRATIFIED selection (default), or CHRONOLOGICAL legacy selection.
- Stores SHA-256 selection fingerprints, sample seed, eligible population count, selected stratum counts and coverage.
- Proportional strata with minority-group inclusion make class imbalance visible, but do not guarantee random or representative production data.
- Wilson 95% score intervals are diagnostic; independence assumptions may not hold in stratified workloads.
- Per-class precision, recall, F1 for routine classification (not structured extraction), candidate p50/p95 successful-response latency and provider error count accompany raw accuracy.
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
 
## Phase 12 engineering completion increment

**Implemented in the new benchmark-governance feature branch:**
- Owner/admin preregistration of a bounded UTC data window, class-support floor, maximum preflight model spend, per-class recall gate, provenance and operator-attested authorization reference.
- Explicit two-stage DRAFT → FROZEN transition. Freeze records a source-content fingerprint and deterministic, disjoint calibration/holdout split. Altered source labels, model input or cohort composition invalidates reuse.
- Re-running the same provider/model on a previously used frozen holdout is rejected. A separate protocol is required. This reduces accidental test-set overfitting but does not certify blinded, independent ground truth.
- Synthetic and operator-attested data are never mixed in the same frozen cohort.
- Optional external-provider execution is **disabled by default** and requires ALL of: operator flag `ENABLE_EXTERNAL_BENCHMARKS=true`, existing provider API key, explicit per-run processing consent, frozen protocol marked `AUTHORIZED_SANITIZED`, authorization reference, positive user-entered token prices and conservative preflight budget. At most ten remote calls remain permitted. The preflight is NOT a mathematically guaranteed billing cap because providers may bill failed calls, changed rates, unexpected tokens, or retries.
- Aggregate invoice reconciliation stores only billing-period totals, successful-task count, additional overhead and a SHA-256 internal invoice-reference digest. The evidence level is `SELF_REPORTED_UNVERIFIED`; sample-level costs and period totals are NOT comparable without independent scope reconciliation.
- Offline fault scenarios explicitly charge model retries, premium fallback and fixed infrastructure overhead; no live model routing or provider calls occur.
- Evaluation reports compare quality with the previous same-model run and flag a notable decline **as a diagnostic only**, not as proof of statistical drift or causality.
- Responsive, tenant-scoped benchmark governance UI linked from the authenticated workspace navigation.

**Still requires external evidence rather than more code:**
- A verified, independently adjudicated representative business dataset and written permission to process it.
- Operator-approved cloud spending and public/managed infrastructure, private secrets, rate-card verification and invoice evidence.
- An independent security assessment, DPA/data residency review, production managed backup restoration and operator acceptance signoff.
- Real-world confidence/statistical validation and future approved production traffic-shift design. No such traffic switch is offered.

**Phase 12 code completion is not the same as an approved live customer pilot.**
