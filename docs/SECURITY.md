# Security and Privacy — Pilot Boundary

## Implemented controls

- Bcrypt-hashed passwords (cost 12), signed expiring HTTP-only same-site cookies, Secure flag when production, **database-checked revocable sessions and password-confirmed global sign-out**.
- Authentication throttling via Redis; workspace POST operations rate-limited.
- Same-origin check on browser mutations and schema validation via Zod.
- Organization membership enforcement before every workspace operation.
- Owner/admin approval for pricing settings, connectors, policies and workspace deletion.
- Tenant data constrained by composite workspace/org foreign keys, plus scoped API queries.
- Explicit authorization and retention acknowledgement prior to trace ingestion.
- Server-side best-effort sanitization of emails, phone-like strings, credit-card-like strings, API keys and common secrets before storage.
- Consent flag required before optional external provider evaluation. Provider credentials loaded from server environment only.
- Audit events on ingestion, analysis, evaluation, policy, simulation, human review, report exports and deletion.
- Raw uploaded files are not saved; sanitized import queues are cleared after successful processing.
- Production model routing disabled by design.
- No cross-customer training.

## Important gaps before using sensitive or regulated records

1. **Automated redaction is not DLP.** Unrecognized customer IDs, names and uncommon secrets can still survive. Pilot with synthetic or independently approved sanitized records.
2. **Identity and tenancy:** email verification and recovery code are implemented in the authenticated app but require a verified transactional mail provider; optional authenticator MFA is implemented. Mandatory MFA/enterprise SSO, production email delivery tests and independent cross-tenant penetration testing remain open. Server-side session revocation is implemented, with pilot-grade device management.
3. **Retention:** explicit OWNER/ADMIN whole-workspace expiry and deletion is implemented, but granular trace retention, automatic backup/export/provider deletion, access logs and retention agreements remain open.
4. **Secrets:** no customer keys are stored today. If production connectors are added, use a proven managed secret vault with rotation and envelope encryption.
5. **Security operations:** add production monitoring, abuse alerts, audit integrity controls, vulnerability patching, external review and incident response.
6. **Contracts:** require DPA/data residency and written customer consent; verify provider restrictions before any distillation, fine-tuning or use of third-party model output for training.
7. **Infrastructure:** deploy HTTPS via a trusted proxy, private DB/Redis, least-privileged roles, managed backups and tested disaster recovery.

**Do not call this MVP security-certified or ready for regulated production data.**

## Data erasure

Owners/admins can invoke the workspace deletion endpoint after typing an exact confirmation string. The database cascades domain records from the workspace. A minimal organization-level audit event remains. Backups, provider-side copies (if any) and upstream source systems are not covered and require separate handling.

## Trace and provider consent

Trace imports are handled locally by the API/worker. Optional provider comparison requests send sanitized trace inputs only after the user accepts a separate external-processing consent. Real API calls may incur cost and are capped for pilot safety.

## Required pre-launch review checklist

- Threat model and penetration test completed
- Full cross-tenant authorization tests
- Verified DLP/redaction precision and high-risk sample handling
- Valid TLS, secret rotation and backup restore drill
- Customer DPA, provider terms and business processing rights documented
- Authentication hardening, deletion retention and recovery workflow tested
- Legal approval for any use of model outputs as training material

## Phase 11 security increment

The authenticated pilot now checks database-backed session revocation on every request, supports password-confirmed sign-out from all devices, and applies baseline security headers. An ephemeral CI backup/restore drill is implemented. These controls do **not** constitute enterprise or regulated-data certification. See [Phase 11 evidence and remaining gates](PHASE11.md).

## Phase 11 identity and expiry follow-up

Hosted registration requires an out-of-band email confirmation, the password recovery flow uses single-use links and revokes all sessions, and users can opt into authenticator MFA with encrypted secrets and one-time recovery codes. Expiry of an entire workspace is OWNER/ADMIN opt-in only; default is no scheduled deletion. Auth/session token maintenance runs from the worker. Production mail delivery, key rotation, backup expiry, SSO, formal security testing and legal approvals remain external gates. See [Phase 11](PHASE11.md).
