# Deployment and Operations Guide

## Local developer environment

```bash
cp .env.example .env
# Set a unique random 32+-character AUTH_SECRET
docker compose up --build -d
docker compose ps
curl http://localhost:3000/api/health
```

This stack is for local development only. It binds PostgreSQL/Redis to localhost and runs the development server.

## Containerized pilot deployment

A production **container configuration** is provided separately from the local development stack. It does not create public DNS, TLS, cloud accounts or managed databases for you.

1. Provision a secured PostgreSQL database and Redis service on a private network.
2. Configure an HTTPS reverse proxy / ingress to port 3000. Set `APP_URL` to the exact public HTTPS origin.
3. Configure `DATABASE_URL`, `REDIS_URL`, a strong random `AUTH_SECRET`, and optionally server-side provider keys in your deployment secret store. Do not commit credentials.
4. Review your provider contracts and data-processing/security acceptance; only permit synthetic or approved sanitized data.
5. Copy `.env.production.example` to a **private** `.env.production` and replace all placeholders.
6. Run:

```bash
docker compose -f docker-compose.production.yml --env-file .env.production up -d --build
docker compose -f docker-compose.production.yml logs --tail=100 app worker
```

The app performs `prisma migrate deploy` before startup. The worker is a separate service and must remain available to complete imports.

## Migrations and rollback

Versioned migration scripts are under `prisma/migrations`. Take a snapshot before applying schema changes; use `prisma migrate deploy` only after verifying backups and compatible app versions. Prisma does not automatically roll back destructive migrations. Restore the matching DB snapshot and app image if recovery is required.

## Health and observability

- `GET /api/health` checks DB readiness.
- Audit logs record application-level mutations and exports.
- Console errors are available in container logs, but a production system should ship structured logs to centralized monitoring and add latency/error alerting.
- Monitor worker queue depth, failed/retrying jobs, DB pool saturation, request errors and Redis availability.

## Security blockers for general availability

Before allowing enterprise production data: verify identity flows, TLS, secrets manager and key rotation, automatic retention/deletion, backup restore, provider DPA, penetration testing, load tests and incident handling. This repository does not claim those are fully complete.

## Important operational note

Import processing is asynchronous; if the worker is down, jobs remain queued. Never expose PostgreSQL or Redis directly to the public Internet. Model credentials are for backend runtime only.

## Phase 11 deployment upgrade

Apply the `AuthSession` migration before accepting traffic from an upgraded web service. Existing pre-Phase-11 JWTs lack a `jti` and are intentionally rejected; pilot testers must reauthenticate. Session revocation requires Postgres availability, and application requests fail closed when it is unavailable.

For operator recovery, use managed encrypted provider backups and restore into an isolated environment first. The CI-only script `scripts/verify-backup-restore.sh` runs with GitHub Actions' synthetic PostgreSQL container and must **never be aimed at a production DB**. It does not replace an operational backup service.

See [Phase 11 plan](PHASE11.md) for the authorization and recovery acceptance checklist.

### Phase 11 email/MFA/retention requirements

After migration, configure a private Resend API key with a verified sender domain, a separate 64-hex-character MFA encryption key and the private pilot invitation secret. `APP_URL` must match HTTPS exactly. Production registration returns a service-unavailable error when an email sender is not configured, and logins to unverified accounts fail closed. Previously registered users must verify via `/check-email`.

The worker is required for periodic cleanup of expired session and email token rows, and any explicitly scheduled whole-workspace expiry. Add a worker health alert, backup expiry policy, off-site encrypted backups and a **restored-to-isolation** acceptance drill before accepting real customer traces. Do not reuse the CI synthetic mail-capture mode on a live host.
