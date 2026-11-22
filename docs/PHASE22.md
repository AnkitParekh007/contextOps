# Phase 22 — Controlled private pilot release gate

**Pilot policy implemented; private pilot NOT activated.**

A pilot requires separately documented:

1. Operator-approved hosting budget, region and environment expiration.
2. Phase 20 actual staging isolation and deployment SHA attestation.
3. Phase 21 authenticated tenant security and operational acceptance.
4. A narrowly specified synthetic-only pilot cohort and a written data policy.
5. Named security/privacy reviewers, incident owner and tested stop switch.
6. Human go/no-go recorded outside source code by authorized stakeholders.

The offline evidence evaluator accepts private references for review but
always leaves `pilotAuthorized=false`, `productionApproved=false`,
`customerDataApproved=false` and `paidProviderCallsApproved=false`.
Even a complete report is `INDEPENDENT_REVIEW_REQUIRED`, never an
authorization token or cryptographic proof.

## Operating guardrails

Use synthetic data initially; keep external model API keys absent, all
benchmarks mock-only, no production traffic interception and no published
verified-savings claims. Define a pilot cohort, expiry, monitoring owner,
failure thresholds and rollback operator before invitations are distributed.
Any breach, unexpected cross-tenant access, backup failure or runaway spend
terminates the pilot and triggers incident procedures.

## Review command

```bash
npm run verify:pilot -- path/to/private-evidence-manifest.json
```

Input records require unique Phase 20–22 control identifiers, PASS/FAIL,
review scope, recent HTTPS evidence references and a pinned 40-character SHA.
Keep this manifest private; output is only sanitized control codes.
Running the CLI does not provision anything or certify evidence authenticity.
