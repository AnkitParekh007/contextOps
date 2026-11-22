# Phase 18 — Hosted pilot deployment preflight (engineering increment)

Status: **configuration readiness only; not deployed, not authorized**.

## Boundary

This phase adds a read-only, static validation tool for the separate private
pilot web service, background worker, PostgreSQL and Redis. The tool never
contacts a cloud provider, tests credentials, migrates a database, sends emails,
processes customers, or activates external model inference.

Run locally with a privately provisioned environment:
```bash
npm run preflight:hosted
```
The output is intentionally limited to check names and results; do not upload
a populated environment file or screenshots containing secrets.

## Required configuration

- A dedicated HTTPS APP_URL; pinned 40-hex CONTEXTOPS_RELEASE_SHA.
- Private service PostgreSQL and Redis URLs, with a database password.
- Independent strong AUTH_SECRET, MFA_ENCRYPTION_KEY, PILOT_INVITE_CODE,
  and OPS_MONITOR_TOKEN.
- Verified EMAIL_FROM and RESEND_API_KEY (static format validation does not
  prove actual deliverability).
- ENABLE_EXTERNAL_BENCHMARKS=false and no provider API keys in this pilot.
- Distinct web and worker service processes; only web is publicly reachable.

Do not interpret a CONFIG_READY_ONLY result as proof of safe networking,
valid TLS, private databases, queue durability, authenticated user isolation,
email delivery, backups, monitoring alerts or complete incident procedures.

## Approval/activation sequence

1. Phase 16, 17, and 18 CI/reviews merge successfully.
2. Explicit owner authorization for hosting vendor, region and spending cap.
3. Provision segregated staging app/worker/database/Redis and a verified sender.
4. Privately apply migrations after validating a tested backup and rollback plan.
5. Run Phase 17 read-only HTTPS operational probes against the exact owner-approved
   origin; capture sanitized, non-customer evidence.
6. Independently exercise identity/MFA/email, two-tenant isolation, data retention,
   restore, queue recoverability, alerts and incident-response ownership.
7. Complete security, legal/DPA, data residency, provider-cost and human launch
   approvals separately using the Phase 15 release-readiness gate.
8. Only then consider a tightly controlled private synthetic-data pilot.
   Customer data, spending, model calls, and production routing need their
   own explicit approvals.

## CI

`node --test scripts/phase18-deployment-preflight.test.mjs` uses fake local
configuration only. It cannot approve deployment; `deploymentApproved` and
`customerDataApproved` always remain false.

## Remaining blockers

No verified hosted endpoint, managed backup/restore, transactional email,
delivery evidence, real monitoring alert delivery, production security review,
DPA, customer dataset authorization, provider invoice reconciliation, or human
production go-live decision is claimed here.
