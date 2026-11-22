# Phase 21 — Security and reliability acceptance

**Automated contract checks prepared; hosted security certification pending.**

For isolated staging, collect access-controlled, dated evidence for:

- Invitation-only registration, verified recovery email, session revocation,
  MFA enrollment/recovery, and rejected invalid credentials.
- Two independently authenticated tenants: deny all cross-tenant read/write,
  imports, exports, reports, audit logs, policy changes and account deletion.
- Queue replay/idempotency, worker restart, poison jobs, age thresholds and
  no duplication of customer-visible actions.
- Encrypted managed backup and actual restore into a separate isolated
  database; capture RPO/RTO and verify ownership/tenant boundaries.
- Operator-monitor authentication, uptime and degraded alert delivery,
  incident acknowledgement, emergency stop and secret rotation.
- Security/privacy review, retention/deletion and residency/DPA evidence.

Use fake or expressly approved sanitized data. Do not put tokens, user emails,
workspaces, raw SQL exports, traces, screenshots containing secrets or
customer content into public GitHub CI artifacts.

A synthetic pass is not a hosted acceptance pass. Each Phase 21 control is
reviewed separately. Missing, stale, duplicate, untrusted or failing evidence
leaves release blocked. Source: `scripts/phase20-22-release-gate.mjs`.
