# Phase 10 — Hosted Interactive Product Demo

**Status (2026-11-22):**
- **10A Public synthetic walkthrough:** Code complete, published through the GitHub Pages workflow when `main` deploys successfully.
- **10B Authenticated hosted pilot:** Application is prepared for Railway deployment but is **not** considered live until Railway web, worker, PostgreSQL and Redis exist, secrets are configured and HTTPS/readiness checks pass.
- **10C Marketing handoff:** Public marketing routes to `/contextOps/demo/` (no sign-in); separately points to a public GitHub issue template for pilot interest.
- **10D Customer data readiness:** NOT approved. Only synthetic data or independently authorized and sanitized records after legal/privacy/security review. Full security gates remain in `docs/SECURITY.md`.

## 10A: Public website and demo

- Main marketing site: `https://ankitparekh007.github.io/contextOps/`
- Static demo route: `https://ankitparekh007.github.io/contextOps/demo/`
- Read-only deterministic Northwind dataset: 500 generated support tickets and six labels, using the algorithm in `src/lib/pipeline/demo.ts`.
- Deterministic mock predictions: mirrors the existing `MOCK / mock-efficient` rule engine, including intentional errors on ticket numbers divisible by 19.
- User-configurable labeled sample size (5–50), minimum quality threshold, fallback assumption, monthly task volume and infrastructure fee.
- Offline policy gate: requires minimum quality, no more than 5-point drop from the synthetically perfect baseline, error rate at most 5% and lower sample token-price estimate.
- Premium route is retained when a gate fails. No production interception, network model call or API transfer.
- Export: `ContextOps_Synthetic_Assessment.md`, generated in the browser. It reports benchmark labels, policy status, mathematical assumptions, modeled monthly difference and an explicit **verified savings: unavailable** statement.
- Demo is client-only and stores no user data. Any customer records must be kept OUT of this public route.

The hosted static demo demonstrates **product flow**, not live model quality, production availability or a validated customer savings opportunity.

## 10B: Railway application deployment checklist

Use the established **Next.js + PostgreSQL + Redis + separate worker** system already shipped in the repo. The app cannot be hosted on GitHub Pages.

1. Create a Railway project and connect the authorized GitHub repo `AnkitParekh007/contextOps`, branch `main`. Review expected spend before provisioning; running managed DB/Redis plus two containers may incur charges.
2. Add managed **PostgreSQL** and **Redis** services. Keep them on Railway private networking (no public TCP proxies). Enable Postgres durable volume/backups with a restore test before customer access.
3. Create a **web** service from the repo, using the root-level `Dockerfile.production`. The container listens on port 3000. Expose only this service through a Railway-managed HTTPS domain. Its Dockerfile starts with `npx prisma migrate deploy && npm run start`. Deploy the web service after databases are healthy.
4. Configure **web** secrets and variables:
   - `DATABASE_URL`: private Postgres service connection string (reference variable).
   - `REDIS_URL`: private Redis service connection string (reference variable).
   - `AUTH_SECRET`: independent cryptographically random 32+ character secret.
   - `APP_URL`: the **exact** `https://...` URL of the web service, no trailing slash.
   - `PILOT_INVITE_CODE`: **different** high-entropy random secret, 32+ characters recommended. If absent, hosted registration fails closed; never paste it into a public PR, log or marketing page.
   - `NODE_ENV=production`.
   - `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`: **unset** for initial synthetic-only verification. Cloud evaluations require separate consent and security approvals.
5. Create a separate **worker** service from the same repo and `Dockerfile.production`, with service start command `npm run worker`, `DATABASE_URL` and `REDIS_URL` referencing the same private services. Do **not** generate a public domain for this service. Do not put `AUTH_SECRET`, `APP_URL` or model keys in the worker.
6. Register one test account through the private `PILOT_INVITE_CODE`, create a workspace, load 500 synthetic tickets, analyze, evaluate local MOCK, simulate, export report and review audit. Do not open public signups. Distribute the invite through a secure channel; rotate it if exposed.
7. Verify:
   - `GET https://<web-domain>/api/health` → `{"status":"ok"}` confirms database connectivity.
   - `GET https://<web-domain>/api/ready` → `{"status":"ok"}` **only** when Postgres, Redis and a live worker heartbeat all respond. Worker heartbeat expires after 30 seconds.
   - `/login` and `/register` are HTTPS only.
   - Registration without the invite code returns 403 in production.
   - No database, Redis or worker endpoint has a publicly accessible domain.
   - A fresh private staging workspace can be created, imported and deleted without crossing tenant boundaries.
8. Configure logs/alerts for Redis availability, worker heartbeat, queue backlog, retries and DB connection errors; enable database snapshots. Verify restore, secret rotation, failure recovery and tenant tests before any real customer pilot.

**Never mark the authenticated application as deployed until a confirmed public HTTPS URL and a successful end-to-end synthetic test exist.** Do not add a live application login CTA on the GitHub Pages marketing site until these gates pass.

### Important deployment boundaries

- The **marketing/demo** Vite app is not a frontend to the Railway API. It has no API origin or credential bridge and will never upload customer content.
- The **authenticated Next.js** app is not production-certified for regulated records, public self-service signups, or live traffic switching.
- `/api/health` deliberately remains an application health endpoint. `/api/ready` adds end-to-end worker awareness, and is preferable for operator checks after all services boot.
- The application and worker use the same versioned schema. Apply migrations before the worker processes imports.
- Provider model identifiers, prices, and customer labels need independent verification. Simulated savings are never realized savings.

### Deployment evidence to capture

| Gate | Evidence |
| --- | --- |
| GitHub Pages deployment | Successful `Marketing Website · Build & GitHub Pages` workflow on `main` |
| Browser demo | Playwright: navigation, theme, benchmark, strict policy failure, report download, zero API traffic |
| API/worker CI | Successful `ContextOps AI CI`, including database/Redis/worker readiness and synthetic pilot smoke |
| Railway public app | Real web service URL, valid TLS, healthy `/api/health` |
| Railway worker | Healthy `/api/ready` after a real worker starts |
| Private pilot acceptance | Operator run of the synthetic 500-record full flow in the deployed backend |
| Security | Approved data classification and retention/backups, authorization tests, secrets audit |

## 10C: Pilot inquiry boundary

The GitHub request form is **public**. It asks only a broad category and an acknowledgement of the public nature of the issue. Do not submit company records, email addresses, customer details, pricing invoices, prompts, API keys or any other confidential information in GitHub Issues. A real data-processing pilot requires a separately arranged secure intake and agreement.

## Not yet included

A live paid billing system, regulated-data processing, SSO/MFA, hardened automatic DLP, public customer onboarding, production routing, observed provider savings, verified customer outcomes, and a managed support/on-call team are **not** Phase 10 claims.

## Phase 11 compatibility note

Phase 11 introduces server-verifiable sessions and a new Prisma migration. All pre-Phase-11 JWTs are intentionally invalidated and require fresh login. Deploy `prisma migrate deploy` before any upgraded authenticated web service; retain a verified backup and rollback plan.
