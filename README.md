# ContextOps AI

## Public marketing website

The public-facing **React + Vite** marketing site lives in [`marketing/`](marketing/) and is designed for GitHub Pages:

**https://ankitparekh007.github.io/contextOps/**

**Try the guided synthetic demo:** https://ankitparekh007.github.io/contextOps/demo/

Phase 10 demo is a separate static, browser-only walkthrough: 500 deterministic support tickets, MOCK label evaluation, quality-gated offline simulation and downloadable scenario report. It makes no backend/model calls and must never be mistaken for a hosted authenticated app or customer evidence. See [Phase 10 delivery and Railway deployment gates](docs/PHASE10.md).

It covers the nine implemented controlled-pilot capabilities, supported use cases, a six-step workflow, privacy limitations, and an interactive **scenario** calculator. The static site is deployed through [the GitHub Pages workflow](.github/workflows/marketing-pages.yml) on updates to `main`. The Next.js application and APIs remain separate; GitHub Pages cannot host server-side login, PostgreSQL, or model evaluations.

For local marketing development, run `cd marketing && npm install && npm run dev`. See [marketing/README.md](marketing/README.md). If GitHub Pages is not enabled, choose **Settings → Pages → Source: GitHub Actions**, and rerun the workflow.


> **Measure AI cost, prove model quality, then optimize safely.**

ContextOps AI is a pilot-oriented B2B application for analyzing an existing AI workflow and testing whether some repeatable tasks could be handled by a cheaper model. It is not a replacement for Claude, GPT, or Gemini. It is a quality-first assessment platform with **simulation-only** routing.

[![CI](https://github.com/AnkitParekh007/contextOps/actions/workflows/ci.yml/badge.svg)](https://github.com/AnkitParekh007/contextOps/actions/workflows/ci.yml)

**Promise:** Keep your existing AI automations. Make them more cost-efficient, measure results, and preserve quality controls.

## Included in this MVP

- **Onboarding:** email/password registration, company + workspace setup, tenant membership and owner/admin/analyst/viewer roles.
- **Import:** CSV, JSONL, JSON, schema aliases/custom mapping, redacted preview, upload limits, idempotent asynchronous processing with resumable retries and progress.
- **Demo:** 500 generated Northwind Logistics support tickets, with six labeled classifications and no real customer content.
- **Analysis:** task grouping, heuristic classification/confidence, trace statistics, sensitive/complex task blocks, human review queue.
- **Cost calculator:** configurable model rates, token usage, eligible volume, fallback attempts, infrastructure fees, quality/success assumptions, break-even volume and net savings.
- **Evaluation:** baseline vs candidate on labeled examples; deterministic local mock; optional explicitly consented OpenAI and Anthropic provider adapters. Macro-F1, accuracy, output validity, errors, latency and cost.
- **Routing policies:** versioned draft/approved-for-simulation status, quality/risk thresholds, cost benchmark, premium fallback and mandatory review for high-risk work.
- **Shadow simulation:** offline route and fallback projections. Production answers remain untouched.
- **Reports:** export a Markdown assessment with assumptions, test evidence, risk notes and **no invented verified savings**.
- **Governance:** audit history, quality thresholds, permission checks, a workspace data deletion endpoint and optional demo connector.
- **Deployment:** Docker Compose for local setup, separate Postgres-backed worker, isolated test CI and production-container guidance.

**Not included:** live production request interception; custom model fine-tuning; dedicated GPU hosting; enterprise SSO; complex billing; regulated-workload certification; production CRM connectors; actual verified savings. Those require a later gated rollout.

## Requirements

- Node.js **22.12+** (or Docker)
- Docker Engine + Compose
- Local port 3000, PostgreSQL port 5432 and Redis port 6379 available

## Start locally

```bash
git clone https://github.com/AnkitParekh007/contextOps.git
cd contextOps
cp .env.example .env
# Set AUTH_SECRET to the result of: openssl rand -hex 32
docker compose up --build -d
```

Navigate to **http://localhost:3000**, register, create a company and workspace, then click its name to enter the workflow console.

The Compose stack starts four containers: Next.js web app, PostgreSQL 16, Redis 7 and the import worker. On first boot, the app applies versioned Prisma migrations.

For a host-based development workflow:

```bash
docker compose up -d db redis
npm install
npm run db:deploy
npm run dev
# In another terminal:
npm run worker
```

For a synthetic demo account, set `DEMO_EMAIL` and `DEMO_PASSWORD` in your private environment and run `npm run db:seed`. The same 500 records can also be generated through the dashboard.

## Example customer journey

1. **Create workspace.** Choose your current model provider and AI task type.
2. **Import traces.** Use the template, preview redaction/mapping, confirm authorization and queue a sample. **Do not upload sensitive or regulated records for this pilot without separate approval and DLP controls.**
3. **Analyze.** Identify routine labeled tasks versus uncertain, complex or sensitive records.
4. **Evaluate.** Choose local `MOCK / mock-efficient` and provide sample input/output prices. Run on the labeled data.
5. **Create policy.** Only candidate routes passing minimum accuracy, baseline non-inferiority, cost and error gates become **approved for simulation**.
6. **Run shadow mode.** Observe projected task splits and sample costs without routing any production task.
7. **Run calculator.** Include estimated fallbacks, premium retries, fixed fees, success-rate changes and break-even volume.
8. **Export report.** Download the Markdown assessment; review all estimates and evidence.

**Important:** Sample API costs are calculated from trace token counts and *provided rate assumptions*. They are not validated provider invoices. A simulated saving is not a realized saving.

## AI providers

| Provider | Availability | Data transfer |
| --- | --- | --- |
| MOCK | Enabled without keys | Local deterministic outputs; synthetic testing |
| OpenAI | Optional, requires `OPENAI_API_KEY` server-side | Redacted labeled samples only after user consent |
| Anthropic | Optional, requires `ANTHROPIC_API_KEY` server-side | Redacted labeled samples only after user consent |

Never put provider API keys in frontend variables. Model identifiers and prices are user-supplied so API/model availability can evolve without forcing a new release. External evaluation costs are billed by the provider to the configured account.

## Tests

```bash
npm run db:deploy
npm run typecheck
npm run lint
npm test
npm run build
# With Postgres, Redis, web app AND worker running:
npm run smoke:pilot
```

CI also runs Phase 1 registration and tenancy tests. It provisions ephemeral PostgreSQL/Redis services, applies migrations and tests the synthetic end-to-end flow. No live model API keys are used in CI.

## Documentation

- [Requirements and success metrics](docs/PRODUCT_REQUIREMENTS.md)
- [Architecture and data model](docs/ARCHITECTURE.md)
- [API endpoints and examples](docs/API.md)
- [Phase completion and acceptance matrix](docs/ACCEPTANCE.md)
- [Security and privacy limitations](docs/SECURITY.md)
- [Pilot runbook](docs/PILOT_OPERATIONS.md)
- [Production-container deployment guide](docs/DEPLOYMENT.md)
- [Roadmap and unresolved production gates](docs/ROADMAP.md)

## Safety & limitations

The current product is appropriate for a **controlled pilot using synthetic or approved, sanitized data**. Automated PII removal is best-effort; it is not certified DLP. A real-customer deployment requires contractual/provider reviews, encryption/key management, verified identity, cross-tenant penetration testing, data retention controls, monitoring and an incident-response plan. Never describe a simulated savings projection as a realized outcome.

## License

See [LICENSE](LICENSE).

## Phase 11 security increment

The authenticated pilot now provides DB-backed revocable sessions, a password-confirmed "sign out every device" screen, baseline HTTP security headers, and an ephemeral PostgreSQL backup/restore regression in CI. Railway service provisioning and enterprise security controls remain separate gates. See [Phase 11 delivery and limitations](docs/PHASE11.md).

### Current identity and retention engineering

Hosted verification and account recovery require an approved transactional email provider. Authenticator MFA and explicit whole-workspace expiry are implemented as pilot controls. These features are not a substitute for enterprise identity, managed backup retention, privacy review or security certification. See [Phase 11](docs/PHASE11.md).

## Phase 12 — Reproducible Benchmarks

Evaluate with seeded label-stratified samples, uncertainty diagnostics and modeled cost per successful task. This is offline evidence only, not verified customer production results. Read docs/PHASE12.md.
