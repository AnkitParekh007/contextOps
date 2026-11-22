# ContextOps AI

**Measured AI cost optimization, with quality gates and safe fallbacks.**

ContextOps AI helps B2B teams understand expensive AI workloads, benchmark less costly models, and safely plan routing changes without compromising business outcomes.

> This repository is an **early MVP**. Phase 1 implements an authenticated workspace foundation. Trace ingestion, quality evaluations, savings analysis, routing and shadow mode are planned phases—not operational features yet.

## Product roadmap at a glance

| Phase | Focus | Status |
| --- | --- | --- |
| 1 | Auth, organizations, workspaces, PostgreSQL, audit foundation | Implemented in this branch |
| 2 | CSV/JSONL/JSON ingestion, PII redaction, deduplication, job progress | Planned |
| 3 | Deterministic workload analysis and classification | Planned |
| 4 | Transparent savings calculator | Planned |
| 5 | Model evaluation harness and providers | Planned |
| 6 | Quality-gated policy engine | Planned |
| 7 | Read-only shadow-mode experiments | Planned |
| 8 | Dashboard and report exports | Planned |
| 9 | Hardening, integration tests, pilot deployment | Planned |

## Local development

Requirements: Node.js 22.12+, Docker and Docker Compose.

```bash
git clone https://github.com/AnkitParekh007/contextOps.git
cd contextOps
cp .env.example .env
# Edit .env: replace AUTH_SECRET with the output of: openssl rand -hex 32
docker compose up --build -d
```

Open **http://localhost:3000**. Register, then create a company and its first AI workflow. The compose app waits for PostgreSQL/Redis readiness and applies the versioned Prisma migration.

To develop without the app container:

```bash
docker compose up -d db redis
npm install
npm run db:deploy
npm run dev
```

When working on a feature branch, ensure you run the correct branch locally. Never commit `.env`.

### Optional demo workspace

Set `DEMO_EMAIL` and `DEMO_PASSWORD` in your local environment (not committed), then:

```bash
npm run db:seed
```

This creates a synthetic **Northwind Logistics — Support Ticket Triage** workspace without traces or real customer content. The 500 synthetic tickets are scheduled for Phase 2.

### Quality checks

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

Checks are configured in GitHub Actions. External package installation is required for first-time setup.

## Design and API

- [Product requirements](docs/PRODUCT_REQUIREMENTS.md)
- [Architecture and data model](docs/ARCHITECTURE.md)
- [API contract](docs/API.md)
- [Phases and acceptance tests](docs/ROADMAP.md)
- [Security and pilot limitations](docs/SECURITY.md)

## Security boundaries

- Passwords are bcrypt-hashed; sessions use HTTP-only, signed cookies; Redis limits authentication attempts.
- Workspace reads and writes are scoped to authenticated organization membership with role checks.
- No provider keys or prompts are collected in Phase 1.
- No production live-routing or verified savings claims are implemented.
- Before accepting real customer traces, implement redaction, consent, retention, tenant access tests and deletion workflows.
- Do not use third-party model responses as training data without appropriate legal and contractual permission.

## License

See [LICENSE](LICENSE).
