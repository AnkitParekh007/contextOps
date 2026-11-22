# Phase 19 — Private staging integration and operational evidence

**State:** Engineering acceptance scaffolding; no cloud services provisioned, no
spend approved, no deployed staging acceptance yet.

## Goal

Establish a repeatable, read-only acceptance boundary between an isolated private
staging deployment and its eventual human review. This phase is deliberately
different from synthetic CI and cannot approve production or customer processing.

## Deployment topology to validate after explicit approval

- HTTPS ingress only to the authenticated web/API process.
- Worker as a separate private process, reachable only through database/queue.
- PostgreSQL and Redis restricted to private networks and narrowly scoped identities.
- Separate staging secrets, nonproduction invitation codes, TLS, and reviewed
  service permissions. Keep tokens out of source control and CI logs.
- External model benchmarks disabled and no provider API keys distributed.
- Verified recovery-email sender, with actual sending tested independently.

A passing Phase 18 static preflight does not prove this network topology.

## Operational sequence (manual, no automation of purchases or cloud changes)

1. Record hosting vendor, region, budget ceiling, authorized reviewer, and exact
   git SHA in an **access-controlled record**, not the public repository.
2. Designate a separate nonproduction domain and secure secret store.
3. Provision only after explicit approval; verify isolated database and Redis
   ingress before applying migrations. Verify backup and rollback readiness.
4. Run `npm run preflight:hosted` privately and save its sanitized JSON output.
5. From a trusted operator environment, run Phase 17's read-only health probe
   against the exact approved HTTPS origin; save sanitized JSON.
6. Compare outputs with `npm run verify:staging -- phase17.json phase18.json <40-hex-sha>`.
   The command checks schema and hosted-only scope and returns
   `INDEPENDENT_REVIEW_REQUIRED`, **never** deployment approval.
7. Separately test and document two-tenant auth isolation, MFA and recovery
   email, queue replay/restart, managed encrypted database restore, RPO/RTO,
   alert delivery and incident acknowledgements, TLS, access controls,
   and security/privacy/DPA requirements.
8. Submit evidence to independent reviewers and Phase 15 release gate. Approve
   a controlled pilot only through a separate, explicit decision.

## Important evidence limitations

- Input reports do not cryptographically prove the hosted release SHA; a
  separate deployment identity attestation remains mandatory.
- Phase 17 does not test hosted MFA, recovery email, backup restore or alerts.
- Phase 18 validates configuration syntax rather than real network reachability.
- The Phase 19 report contains only known coarse codes, no host, names,
  tokens, account identities, customer content or connection strings.
- Green CI is **synthetic**; it cannot stand in for real staging results.
- Any missing, duplicate, surprising or malformed input fails closed.

## Hard release blockers

No provisioned/verified dedicated staging services, no managed restore evidence,
no external delivery evidence, no independent access review and no explicit
hosting, privacy, budget, provider or customer-data approval. Do not enable
production routing or externally billed model evaluation.
