# Phase 13 — Hosted Pilot Activation & Operational Readiness

**Status:** Engineering increment implemented for CI verification. **Railway deployment and operational signoff are not yet completed.**

Phase 13 turns the synthetic pilot into a deployable, observable, *private* hosted service. It does not authorize customer data intake, paid model evaluation, general availability, or live model routing.

## What this increment delivers

| Control | Engineering evidence | Meaning |
| --- | --- | --- |
| Production worker packaging | `Dockerfile.production` copies `/app/src`; CI builds the production image and runs the worker | Closes a deployment blocker where the worker script imported a missing shared module |
| Public health | `GET /api/health` and `GET /api/ready` (existing) | Aggregate DB and DB/Redis/worker readiness only; does not expose tenant data |
| Protected operator diagnostics | `GET /api/ops/status` | Bearer token required; aggregate queue count, worker heartbeat, stale processing and failed import signals |
| Fail-closed monitoring | Bad/unconfigured credentials -> 401/503; unavailable or degraded -> 503 | Privileged service status never reveals a private workspace or trace |
| Read-only HTTPS acceptance | `node scripts/hosted-acceptance.mjs` | Validates a preapproved HTTPS origin, readiness, monitoring authorization and content-security headers without writing customer data |
| CI evidence | Unit tests, synthetic-only operator acceptance, production-worker Docker boot, existing full pilot and isolated Postgres recovery | Local reproducibility only; not real cloud deployment proof |

## Deploying a private pilot

1. Have an operator agree on Railway's projected cost and the intended organization, environment and spending limits. **Do not provision services without approval.**
2. Create one private Postgres and one private Redis with backup retention configured; deploy web and separate worker using `Dockerfile.production`. The worker uses `npm run worker` and must never receive a public domain.
3. Set private environment variables as described in `docs/PHASE10.md` and `.env.production.example`. In addition, generate a **separate** cryptographically random `OPS_MONITOR_TOKEN` of 32+ characters. The token is for operator probes, not a user or a public marketing page.
4. `APP_URL` must be the final HTTPS web origin with no trailing slash. For an existing container deployment, provide `OPS_MONITOR_TOKEN` to the **app** service and `OPS_QUEUE_WARN_SECONDS` (default 300).
5. Run `prisma migrate deploy` against a pre-backed-up database, deploy the worker, and inspect `/api/ready`. Do not expose Postgres, Redis, worker, or the private operator token publicly.
6. Run the read-only acceptance probe from a trusted operator machine:
   ```bash
   export APP_URL="https://private-pilot.example"
   export PILOT_BASE_URL="$APP_URL"
   # Supply OPS_MONITOR_TOKEN securely from your private secret manager; never paste it into a public log.
   node scripts/hosted-acceptance.mjs
   ```
   It refuses non-HTTPS URLs, redirects, origin mismatch and missing credentials. An explicit `CI=true` exception applies **only** to local `http://localhost:3000` fixture testing.
7. Independently run the 500-synthetic-ticket pilot in the private hosted app, then verify the import queue returns to zero, audit entries are tenant-scoped and the report states that savings are simulated.
8. Capture the actual URL, masked deployment configuration, CI/build release SHA, runtime screenshots, health and acceptance outputs, TLS proof, backup snapshot details, separate-environment restore, and operator signoff. Never attach credentials, raw invoices or customer records to GitHub issues.

## Monitor and alert

- `/api/ready` returns HTTP 503 after Redis, DB or the worker heartbeat fails. The worker heartbeat expires after 30 seconds.
- `/api/ops/status` requires `Authorization: Bearer <OPS_MONITOR_TOKEN>`. It returns HTTP 200 only for `status: ok`, and HTTP 503 for `degraded` or `unavailable`.
- Degraded events: any failed import within the previous 24 hours, processing tasks stuck for over 10 minutes, or oldest queued/retrying import exceeding `OPS_QUEUE_WARN_SECONDS`.
- Queue totals and issue codes are aggregate-only. No individual traces, tenant names, addresses, or model secrets appear. The monitoring token must never be part of a URL.
- Configure an alert on two consecutive operator status 503 responses, a sustained /api/ready 503, or loss of deployment logs. Record acknowledgements and severity in a private incident tracker.

## Recovery exercises (operator-supervised only)

- **Worker failure:** Stop the worker in **staging**; verify /api/ready changes to 503 when its heartbeat expires, then restart it and verify recovery. Do not disrupt a customer production service.
- **Queue aging:** With synthetic fixtures, stage a stuck import and verify aggregate /api/ops/status returns a degraded condition; resolve the synthetic failure before signoff.
- **Database restore:** Take an encrypted managed backup and restore it into a **separate isolated staging database**. Verify schema, row counts, record deletion lifecycle and tenant isolation. Never restore over the active database or use the CI recovery script against real customer data.
- **Incident containment:** If secrets are suspected exposed, disable external benchmarks, rotate the monitoring secret, revoke user sessions and review application/worker audit logs. Follow the provider-specific credential rotation playbook.
- **Rollback:** Pin previous immutable image digest; never revert application code over incompatible migrations without documented database recovery.

## Remaining Phase 13 launch gates

- [ ] Cost-approved Railway project with real web, worker, Postgres and Redis private services
- [ ] Confirmed public HTTPS web URL and working live health/operator checks
- [ ] Production transactional email sender verification and recovery delivery tests
- [ ] Production-like synthetic 500-ticket acceptance with reviewer signoff
- [ ] Managed encrypted backups and separate-environment restore evidence, agreed RPO/RTO
- [ ] Centralized logs and external alerts, documented on-call/incident owner
- [ ] Independent security review, DPA/privacy, approved provider contracts and data classification
- [ ] Human decision to permit any non-synthetic customer records

**No live deployment is claimed by passing CI. The public GitHub Pages demo is a separate static experience.**

## Phase 13 governance acceptance expansion

The dedicated `scripts/benchmark-governance-smoke.mjs` test now runs after the full synthetic pilot in CI. It uses its own synthetic test organization and confirms:

- Private invited registration, email confirmation and authenticated workspace access.
- Synthetic 500-record dataset creation and classification.
- Explicit draft protocol creation and incorrect confirmation rejection.
- Frozen cohort fingerprint and deterministic holdout evaluation using the MOCK provider.
- Same-model frozen-holdout replay rejection.
- External model invocation refusal when processing is unapproved.
- Offline failure-cost scenario labels outcomes as unverified.
- Aggregate invoice entry remains **SELF_REPORTED_UNVERIFIED**, never certified savings.
- Synthetic workspace deletion.

The test refuses to start unless `CI=true`, `APP_URL=http://localhost:3000` and real external provider benchmarking is disabled. No paid API calls or production writes are needed.

Passing this test validates the code path in an isolated environment, not hosted reliability, cloud backups, actual invoice proof or customer-model quality.

### Next external approvals

Obtain a spend-approved hosting project, a functioning HTTPS pilot, independent transactional-email verification, a real backup restore, security/privacy signoff, approved sanitized datasets and actual provider cost evidence. Do not mark a production deployment complete from CI alone.
