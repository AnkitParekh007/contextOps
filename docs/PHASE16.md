# Phase 16 — Release Evidence Integrity Hardening

**Status:** Source-code and regression-test increment, pending CI and PR merge. **No hosted deployment or customer data approval.**

## Problem

Phase 15 intentionally never authorizes production use, but its evaluator previously accepted some malformed synthetic reports: a duplicated check could conceal an omitted acceptance check, and unexpected manifest properties were silently accepted. That undermines the trustworthiness of the operator-facing readiness summary even though it never granted deployment approval.

## Changes

- Require the exact sanitized Phase 14 manifest contract, including generated timestamp, release SHA, explicit empty failures, scoped disclaimers and blockers.
- Enforce exactly ten unique named PASS checks; reject duplicate, missing, extra or unknown checks.
- Reject future-dated synthetic manifests, unknown fields and operator attestations outside the 30-day freshness window.
- Treat an explicit rejection as a veto where attestation and rejection share the latest review timestamp.
- Add adversarial regression tests for malformed/forged reports, stale/future operator records and confidentiality of evidence links.

## Verification

Run `npm run typecheck && npm test && npm run lint`, then the Phase 14 smoke/manifest verifier and Phase 15 readiness report in a disposable CI environment. This implementation does not claim those checks have passed until CI reports success.

## Remaining operational gates

The [Phase 13 runbook](PHASE13.md) and [Phase 15 release evidence plan](PHASE15.md) remain authoritative. Railway provisioning needs explicit cost approval. HTTPS operation, recovery email, managed backup restore, external alerts, independent security/privacy assessment, customer labels, provider invoices and a separately documented human launch decision remain pending.

**Safety boundary:** A validated manifest is still a self-reported evidence *format*, not proof that the linked evidence exists or is authentic. `productionApproved`, `customerDataApproved` and `verifiedSavings` remain false under all circumstances.
