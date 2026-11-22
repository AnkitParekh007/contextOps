# Phase 23 — Real staging deployment and operational acceptance

**State: engineering integration completed on branch; hosted infrastructure not provisioned or independently accepted.**

## Current external state

At preparation time the connected Railway account contained **zero projects**.
Do not claim a deployed staging environment, hosted identity proof, actual TLS,
managed backup/restore, email delivery, alerting, two-tenant isolation, DPA
or production approval from these changes.

## What Phase 23 adds

- Authenticated GET `/api/ops/release`: the operator's bearer token is
  required; exact 40-character `CONTEXTOPS_RELEASE_SHA` is returned only
  on successful authentication. This is **configuration consistency**, not
  cryptographic provenance or trusted provider deployment attestation.
- Fail-closed read-only `scripts/phase23-hosted-probe.mjs`: validates exact
  approved HTTPS staging target, approved hostname suffix, expected SHA and
  Phase 17 DB/Redis/worker/operator health. Never outputs host, SHA or token.
- Offline adversarial tests via `npm run test:phase23`.
- A manually dispatched GitHub Actions workflow with the
  `contextops-staging` protected environment, with retained sanitized
  acceptance output only. **It does not provision hosting or grant approvals.**

## Protected environment setup (operator action after deployment approval)

Create GitHub Environment `contextops-staging` with required reviewers
and limit allowed branches to the reviewed deployment branch.
Set environment variables `STAGING_APP_URL` and
`STAGING_APPROVED_DOMAIN` to an owned domain.
Set secret `STAGING_OPS_MONITOR_TOKEN` to a staging-only high-entropy token.
Do not use a production monitor token.

The domain approval compares the exact hostname or a proper subdomain
of the approved suffix; targets must have `staging` or `preview` in the
hostname. Do not assign a broad shared provider domain as the suffix.

The workflow has no cloud credentials and read-only GitHub permissions.
Its `release_sha` input must be matched independently to the actual
deployed artifact by an authorized operator, using provider deployment
metadata. Comparing self-reported environment SHA does not establish this.

## Non-negotiable operational acceptance

1. Explicit owner authorization for staging vendor, billing, spend cap,
   region, environment expiry and accountable operator.
2. Verify isolated web, private worker, private PostgreSQL and Redis
   networking. Validate DNS, HTTPS, encryption and least-privileged secrets.
3. Privately test backups then apply migrations with controlled rollback.
4. Check actual transactional email verification/recovery, MFA, invitation
   gating, session revocation and separate A/B tenant isolation.
5. Run managed backup restore against a disposable isolated target, worker
   restart/retry/idempotency, alerts and human incident acknowledgement.
6. Invoke protected read-only Phase 23 workflow and archive sanitized evidence.
7. Independently review Phase 20–22 release gates and explicitly decide
   whether a narrow synthetic-only pilot is authorized.

No paid provider calls, production traffic interception, customer data, or
verified cost-savings claim is authorized by a passing script or workflow.

## Local CI check

`npm run test:phase23` runs only fake HTTP tests. It must be green
alongside the full existing CI suite, but does not substitute for a
real staging deployment or human approval.
