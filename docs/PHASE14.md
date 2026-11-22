# Phase 14 — Reproducible Synthetic Acceptance & Evidence

**Engineering objective:** Verify the Phase 12 benchmarking and Phase 13
operational safeguards through an isolated, repeatable synthetic API workflow.
This phase does **not** authorize hosting spend, external provider requests,
real customer uploads or production traffic changes.

## What the new acceptance run verifies

1. Two independent CI-only synthetic accounts can register, confirm a one-time
   email token and authenticate.
2. Tenant A can create a benchmark; tenant B cannot read or create records
   against tenant A's workspace (404), including using a valid session.
3. Tenant A creates the 500-case Northwind synthetic dataset and analyzes it.
4. Benchmark protocol creation, explicit freeze confirmation, frozen data
   fingerprint and one-time freeze semantics behave correctly.
5. A MOCK-only evaluation uses the frozen holdout and records its fingerprint.
   Reuse of that frozen holdout by the same model is rejected.
6. An external provider request against the synthetic dataset is blocked
   before any paid call. The test explicitly refuses to run if
   `ENABLE_EXTERNAL_BENCHMARKS=true`.
7. Offline fault stress reports hypothetical, unverified savings.
8. Financial comparison records only an aggregate invoice reference digest.
   Reported costs are clearly self-reported and unverified, not certified
   invoices or realized savings.
9. Governance actions exist in the tenant's audit history.
10. A browser session cannot access the private operations monitor, and
    both synthetic workspaces are deleted with owner confirmation.

## Execution & evidence

With ephemeral Postgres, Redis, web and worker running using synthetic CI
secrets, GitHub Actions runs:

```bash
node scripts/pilot-smoke.mjs
node scripts/phase14-acceptance.mjs
```

The second script **refuses all non-localhost hosts and non-CI executions**.
It writes `artifacts/phase14-synthetic-acceptance.json`. Only the following
non-sensitive summary fields are retained: protocol version, phase, status,
test names and descriptions, count, release commit, UTC timestamp, synthetic
provenance, customer-data-processed false, paid-provider-call scope, and
explicit external acceptance blockers. The manifest is a 14-day
`phase14-synthetic-acceptance` GitHub Actions artifact.

No cookies, tokens, user identifiers, raw emails, workspace IDs, raw invoice
references, customer traces or model prompts appear in this artifact.

## Phase 14 acceptance boundary

Passing CI establishes only that this synthetic software workflow passed in
a disposable GitHub Actions environment. In particular, neither an artifact
nor a 500-label MOCK example proves production model parity or verified
financial savings.

The following must still be performed **and evidenced independently**:
- Explicitly cost-approved Railway web/worker/Postgres/Redis services and HTTPS.
- Verified outbound recovery email and secrets lifecycle.
- Managed encrypted backups with a supervised staging restore and RPO/RTO.
- Live private operator telemetry and alerts with incident ownership.
- Independent security assessment and tenant-isolation review.
- Written customer consent, DPA/privacy/data-residency and provider terms.
- Independently adjudicated real workload labels, benchmark budget and
  quality gates; actual provider invoices and billing reconciliation.
- Written approval for any future non-simulated routing.

See [Phase 13](PHASE13.md), [Phase 12](PHASE12.md), and
[the acceptance matrix](ACCEPTANCE.md).

## Evidence contract verification

After the synthetic runner, CI executes
`node scripts/verify-phase14-evidence.mjs`. It enforces an explicit
schema/key allowlist, all ten required test names, PASS-only check results,
no customer or verified-savings claims, and absence of typical credentials,
identifiers and account fields. It emits an additional Markdown summary.
Both JSON and Markdown are retained as 14-day GitHub CI artifacts.

The verifier only audits artifact **content**, not actual infrastructure
or independently collected provider and customer evidence.
