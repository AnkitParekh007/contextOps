# Security and Privacy — Pilot Readiness

## Implemented in Phase 1

- Passwords hashed using bcrypt cost 12.
- Signed HS256 JWT session in HTTP-only, SameSite=Lax cookie; Secure in production.
- JWT expiry after seven days.
- Redis per-email authentication request throttling (15-minute window); Redis errors fail closed.
- Zod input validation; Origin check for browser POST requests.
- Organization-scoped workspace reads/writes and owner/admin mutation checks.
- Password hashes omitted from every response.
- Audit event on organization onboarding and workspace creation.
- No customer prompts, provider credentials or business documents ingested.

## Not implemented yet (deployment blockers)

- Verified email / account recovery and mandatory multi-factor for privileged accounts.
- Persistent session revocation and device/session management.
- Multi-instance abuse monitoring, IP+account throttling with trusted proxy configuration.
- Central security monitoring and mandatory retention/deletion enforcement.
- Provider secret storage, secure connectors, PII redaction and customer consent workflows.
- Cross-tenant penetration and automated authorization tests.
- DPA, provider contract/privacy and data residency review.
- Independent infrastructure validation and production incident response.

**Do not use with regulated or real customer trace data until Phase 2 controls are implemented and assessed.** The first release is an onboarding foundation, not an audited enterprise offering.

## Operational notes

Use a unique AUTH_SECRET of at least 32 random characters and TLS/HTTPS in production. Restrict PostgreSQL/Redis to private networks; Docker Compose binds their ports to localhost by default. Configure APP_URL to the exact public origin. Never commit `.env`, secrets or customer traces. Avoid seed demo credentials in production.
