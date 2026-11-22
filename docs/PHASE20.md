# Phase 20 — Isolated staging deployment blueprint

**Engineering configuration delivered; live provisioning NOT executed.**

The separate `docker-compose.staging.yml` runs the web/API and background
worker as independent processes, without auto-migrating the database on app
startup. PostgreSQL and Redis are supplied by separately approved, private
managed services. The YAML does not create or protect those services.

## Required execution boundaries

1. Obtain explicit approval of vendor, region, max spend, expiry and named
   operator **before provisioning or executing this Compose blueprint**.
2. Reserve a staging-only domain and secrets; no production/customer credentials.
3. Establish HTTPS ingress via a trusted reverse proxy. The app publishes only
   `127.0.0.1:3000`; the worker has no published port.
4. Verify network policy for PostgreSQL and Redis at provider level. Private
   URLs in environment variables are not evidence of actual isolation.
5. Rotate secrets, enable managed storage encryption and backup retention.
6. Verify a backup and restore plan BEFORE operator-controlled migrations.
7. Keep `ENABLE_EXTERNAL_BENCHMARKS=false`, provider keys empty, and no
   customer data. Validate `npm run preflight:hosted` on a trusted operator host.
8. Verify deploy SHA using authenticated host/provider evidence, not a
   self-reported variable. Run the Phase 17 hosted read-only acceptance test.
9. Record evidence privately; Phase 19 and 20–22 gates cannot activate staging.

## Fail/rollback

Stop ingress and worker, revoke staging sessions, retain sanitized incident
records, and restore only through a separately verified recovery procedure.
Never silently point staging to production databases or rollback by deleting
unverified customer data. A deploy may proceed only after independent approval.

## CI-only acceptance

`npm run test:release-gates` runs adversarial evidence-validation tests
without provisioning. It does not exercise real networking or managed restore.
