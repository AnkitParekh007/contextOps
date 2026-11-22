# Phase 11 — Pilot Security and Recovery (first increment)

## Scope and verified engineering

This phase follows the Phase 10 public synthetic demo and tightens the **separately hosted authenticated application**, not the GitHub Pages site.

| Control | Status | Evidence |
| --- | --- | --- |
| Server-revocable browser sessions | Implemented | `AuthSession` Prisma model; signed JWT with matching `jti`; database authorization on every session check |
| Single-session logout | Implemented | Marks the current session revoked in Postgres before clearing its cookie |
| Global session revocation | Implemented | `POST /api/auth/revoke-all` requires existing session, origin check, rate limit and password confirmation |
| Self-service account screen | Implemented | `/account/security` active session count and all-device logout UI |
| Cookie replay regression | Added to CI | Original cookie must return 401 after logout, including a second device after global revocation |
| Baseline HTTP defense headers | Implemented | `nosniff`, `X-Frame-Options: DENY`, strict-origin-when-cross-origin referrer policy and restricted permissions |
| Synthetic database recovery drill | Added to CI | `pg_dump -Fc` → isolated scratch database `pg_restore` → schema and account/session count verification |
| Managed DB backups/restore on Railway | **Pending** | Requires actual project, retention policy, separate encrypted backup storage, restore evidence |
| Email verification / MFA / enterprise SSO | **Pending** | Not implemented; no enterprise-security certification claims |
| DLP / regulated-data approval | **Pending** | Best-effort redaction is not DLP; real customer intake requires separate approval |

### Session lifecycle and upgrade impact

Before this phase, a signed JWT could be reused until expiry after a browser logout. Starting with this phase, the JWT `jti` must exist as an unexpired, unrevoked `AuthSession` row belonging to the same user. A successful logout updates the DB row; a copied cookie cannot authorize another request. The global sign-out endpoint additionally verifies the account password before revoking every active session.

**Deployment behavior:** Existing JWTs without a `jti` are rejected after upgrade and users must sign in again. This is intentional. Apply the new `20261122235000_revocable_sessions` migration before serving the upgraded app. `AUTH_SECRET` must remain stable across web replicas; do not rotate it casually without a planned reauthentication rollout.

A seven-day session expiration is enforced both in the signed token and in the database; storage cleanup for expired/revoked sessions remains operational work to schedule after hosting is activated.

### Automated recovery evidence

The GitHub Actions workflow creates only **synthetic test accounts** against ephemeral PostgreSQL. After the application and worker smoke tests complete, the recovery step:

1. Creates a binary-format PostgreSQL dump using `pg_dump -Fc`.
2. Creates `contextops_ci_recovery` as a fresh, isolated database.
3. Restores the dump with `pg_restore`, refusing errors.
4. Confirms the `AuthSession` table exists and restored account/session counts match source.
5. Removes the temporary recovery database and dump on completion.

This proves the current schema and CI fixture data can be dumped and restored. It does **not** prove point-in-time recovery, managed Railway backup durability, off-site encryption, regional disaster recovery, or restore under real load.

### Real pilot launch gates

- Deploy web/worker/Postgres/Redis per [Phase 10](PHASE10.md), inspect `/api/ready`.
- Verify backups in the actual hosting environment, encrypted storage and separate retention policy. Perform at least one operator-supervised restore to an isolated environment. Never restore over a running production DB.
- Run revoked-cookie and cross-tenant authorization checks on the hosted synthetic pilot.
- Complete identity/security review (email recovery, MFA, independent penetration test and access logs).
- Obtain consent, DPA and provider-processing approval before real customer uploads.
- Document data retention/deletion policy including database snapshots, logs and provider copies.

This increment is not an authorization to accept confidential, regulated, or unredacted customer traces.
