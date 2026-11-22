# Phase 17 — Private Pilot Operational Validation

**Status:** Engineering checks proposed; private hosted deployment and operational signoff **not performed**. No spending, customer data, paid-provider evaluation, or production traffic is authorized.

## Goal

Make a narrow, safe, operator-invoked operational check repeatable before any separately approved private deployment. The Phase 13 hosted acceptance script validates one snapshot; Phase 17 adds repeated readiness sampling and explicit denial if private diagnostics are exposed or external benchmarking is enabled.

## Read-only checks

`node scripts/phase17-staging-acceptance.mjs` validates:

1. Exact HTTPS origin matches the configured `APP_URL` (CI-only `http://localhost:3000` permitted when `CI=true`).
2. Public database health and DB/Redis/worker readiness return healthy aggregate responses.
3. Unauthenticated access to `/api/ops/status` is denied with HTTP 401.
4. Private operator status requires a configured bearer token and reports ready, no issue codes, no verified customer data and external benchmarking **disabled**.
5. Status endpoints use JSON, `nosniff`, and no-store caching where already part of their contract.
6. Multiple readiness samples remain healthy; any degradation fails closed.

The report `artifacts/phase17-operational-readiness.json` contains only coarse check names, scope and explicit false approval markers. It does **not** contain the origin, monitoring credentials, reviewer identity, workspace IDs, raw response bodies or customer information. The operator must keep `OPS_MONITOR_TOKEN` in a private secret store and run this on a trusted machine.

## CI execution

In the disposable CI environment, existing web, worker, PostgreSQL and Redis services are used with **synthetic credentials and fixture-only data**. Execute:

```bash
npm run test
npm run smoke:operations
```

The CI report is scoped to `synthetic_ci_only`. It must never be cited as a successful Railway or customer deployment.

## Private hosted execution (only after external cost approval)

From a trusted operator shell with secrets sourced securely:

```bash
export APP_URL="https://your-approved-private-pilot.example"
export PILOT_BASE_URL="$APP_URL"
# OPS_MONITOR_TOKEN must be loaded privately; never commit or echo it.
npm run smoke:operations
```

Perform independent evidence collection for these remaining launch gates:

- [ ] Confirm cost ceiling and budget owner for Railway deployment
- [ ] Prove web HTTPS, private DB/Redis/worker isolation and restricted ingress
- [ ] Verify transactional recovery email end-to-end without publishing addresses
- [ ] Test real managed encrypted backup restore into a separately isolated staging database, document RPO/RTO
- [ ] Validate two consecutive degraded-check alerts and incident acknowledgement with an owner
- [ ] Independently review tenant isolation, identity, secrets, privacy/DPA, provider contracts and residency
- [ ] Authorize representative sanitized labels, provider spend, billing provenance and independent quality review
- [ ] Record a separate human go/no-go decision

**Important:** The probe cannot prove any item above solely through its PASS result. A standalone external review and Phase 15 evidence process are mandatory. Never enable customer imports or live routing based on this report.

## Regression evidence

`scripts/phase17-operational-probe.test.mjs` covers nominal synthetic checks, rejected targets, exposed diagnostics, external benchmarking mistakenly enabled, unstable readiness, leaked fields and redirects.

## Follow-on scope

After CI and review, the next operational steps are budget-approved hosting, supervised staging recovery/alert exercises and a manually reviewed evidence register. Nothing in Phase 17 auto-creates infrastructure or changes production configuration.
