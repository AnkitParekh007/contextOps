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

## Phase 11 completion increment (identity and lifecycle)

The following engineering changes were added after the first phase increment:

- **Email ownership verification** in hosted production. New users must click a hashed, 60-minute one-use link before login; preexisting unverified accounts must verify before accessing the app.
- **Password recovery** using hashed, 15-minute single-use reset links. Resetting a password revokes all existing sessions but **never bypasses MFA**.
- **Transactional mail integration** using the verified Resend REST API. Configure `RESEND_API_KEY`, `EMAIL_FROM` and an HTTPS `APP_URL`. CI uses a tightly gated local-only synthetic mail capture. Hosted registration fails closed when no approved email service is configured. The external email service, sender domain, provider terms, deliverability and production dispatch require **live verification**.
- **Authenticator MFA (TOTP)** with AES-256-GCM encrypted secrets, one-use hashed recovery codes, code-step replay prevention and password + factor confirmation to disable. Configure a separate `MFA_ENCRYPTION_KEY` (32 cryptographically random bytes, hex-encoded). Enrollment shows recovery codes only once.
- **Operator-safe automated lifecycle**: hourly worker cleanup of expired/revoked auth sessions, challenges and consumed recovery codes; optional 7–90 day **whole-workspace** expiry scheduled by OWNER/ADMIN with explicit confirmation. The worker deletes a scheduled workspace and its cascade-scoped domain data, retaining a minimal audit event.
- **Security tests**: RFC 6238 TOTP vector, challenge reuse rejection, email-first login policy, one-time recovery codes, password reset invalidating all sessions, retention policy authorization and domain cascade in CI.

### Important limitations and external blockers

- Automated retention applies only to **app DB rows**. It does not erase backups, exports, connected providers or upstream records, which need separately contracted retention and tested deletion.
- MFA is **optional** in this codebase. Mandatory organization-wide MFA, SSO and enterprise identity providers are not implemented. Do not claim an external penetration test or formal certification.
- Railway managed services still have not been provisioned, so **real managed backup/restore, monitoring, emergency response exercise and live hosted acceptance remain open**.
- External customer data onboarding needs independent DPA/data-processing authorization, privacy classification, a human-approved redaction/DLP review and, where applicable, data-residency controls. Synthetic CI and application tests do not count as those approvals.
- This increment is **engineering complete**, not a statement that enterprise security and the production launch are approved.

### Upgrade

Run `prisma migrate deploy` before starting the upgraded application and worker. Set and secure `RESEND_API_KEY`, `EMAIL_FROM`, `MFA_ENCRYPTION_KEY`, and `PILOT_INVITE_CODE`. Existing legacy users without verified email need to confirm their address through `/check-email`; do not enable external data intake until the complete hosted pilot acceptance is signed.
