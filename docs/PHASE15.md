# Phase 15 — Pilot Release Evidence and Go/No-Go Gate

**Status:** Source-code implementation in progress. This phase does **not** deploy Railway services or authorize customer data.

## Purpose

An engineering test passing in ephemeral GitHub Actions is necessary, but cannot prove a production pilot is secure, funded, approved, recoverable, or capable of real savings. Phase 15 adds a **fail-closed evidence registry** so a passing synthetic acceptance report is never confused with an approved customer rollout.

## Automated evidence evaluation

`src/lib/ops/release-gates.ts` reads the sanitized Phase 14 manifest and optional manually entered operator evidence. It requires all ten named synthetic checks, schema consistency, MOCK-only calls, no customer-data processing, no verified savings and an explicit `productionReady: false` declaration.

It then checks for dated operator-attestation records for nine independent gate categories:

1. Authenticated HTTPS web plus isolated worker, database and Redis.
2. Real outbound email and account-recovery delivery.
3. Encrypted managed database backup and isolated restore.
4. External monitoring, incident ownership and alerts.
5. Independent security and tenant-isolation review.
6. Data-processing contracts, privacy and residency approval.
7. Authorized sanitized, independently adjudicated customer labels.
8. Provider API budget approval and actual invoice reconciliation.
9. Explicit human approval to launch the private pilot.

Evidence records require an HTTPS URL with no query, fragment, embedded credentials or other private tokens; an operator reference; and a recent review timestamp. The generated CI report includes **only gate names and coarse statuses**, not linked internal URLs, user details, or reviewer identities.

### Decision states

- `BLOCKED`: synthetic acceptance failed, required operator record is missing, stale or rejected.
- `INDEPENDENT_REVIEW_REQUIRED`: all recorded evidence is present, but independent authenticity and scope verification is still necessary.

The tool always emits `productionApproved: false`, `customerDataApproved: false`, and `verifiedSavings: false`. It cannot be used to grant production access.

## Running the check

After the Phase 14 synthetic acceptance has produced its sanitized manifest:

```bash
npx tsx scripts/phase15-readiness.ts
```

Optionally an authorized operator can point the script to a locally held JSON manifest with `PHASE15_OPERATOR_EVIDENCE_PATH`. This manifest contains metadata references, not customer data or credentials. Do not place sensitive review URLs into public CI artifacts.

The output is `artifacts/phase15-pilot-readiness.json`. CI verifies the synthetic manifest and generates the blocked-by-default release summary.

## What this does not prove

Operator evidence is **self-reported** until independently verified. This phase does not sign attestations, verify URL content, deploy infrastructure, run real provider comparisons, execute managed backup restores, or certify financial savings. No automatic go-live endpoint or live traffic-rerouting behavior is introduced.

**Next external action:** an accountable operator must approve infrastructure budget, complete the Phase 13 hosting and recovery drills, review real security/privacy and representative labels, then independently verify each evidence item before any manual pilot launch.
