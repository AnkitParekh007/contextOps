# Implementation phases and acceptance criteria

## Phase 1 — Foundation (this PR)

Deliver:
- Next.js/React/TypeScript, Tailwind and shadcn-style UI primitives.
- Versioned PostgreSQL Prisma migration.
- Register, login, logout and signed HTTP-only session cookies.
- Redis auth throttling; Zod validation and same-origin checks.
- Organization membership, role-based workspace APIs and audit record on creation.
- Marketing landing page, onboarding and authenticated dashboard.
- Local Docker Compose, opt-in demo seed and unit tests.

**Acceptance:** New account registers, signs in, creates company/workflow, sees scoped dashboard, signs out. Unknown users cannot enumerate organizations; viewer cannot create workspaces. Docker setup applies migrations and starts API and UI.

## Phase 2 — Trace ingestion

CSV/JSONL/JSON upload; mapping preview; PII+secret redaction, consent gate, retention settings, idempotency, job progress/retry, synthetic 500-ticket demo. Test 10k traces and no raw-content leakage.

## Phase 3 — Workload intelligence

Deterministic task grouping, token/cost baselines, risk flags, eligible/review/blocked categories, reason codes and labeled-data coverage. No claims of model adequacy from clustering.

## Phase 4 — Cost and savings

Current and alternative pricing inputs, caching and retry-aware scenarios, fallback rates, model costs, hosting/fees, gross/net monthly and annual projections, per-success economics and break-even point.

## Phase 5 — Evaluation harness

Provider adapters (Anthropic, OpenAI, mock), permission gate, representative labeled runs, accuracy/F1, extraction exact match, schema validity, text rubric review, latency/error/fallback measures and explicit quality thresholds.

## Phase 6 — Policy engine

Risk-first routing eligibility, versioned policy changes, failure circuit breakers, approval queue, audit trail. No production interception in the MVP.

## Phase 7 — Shadow mode

Simulated route analysis on traces and optional consented shadow calls, originals unchanged, simulation explicitly labeled, comparison and drill-downs.

## Phase 8 — Dashboard and reports

Cost/quality by workflow/task/model, routing mix, error and fallback trends, estimated vs simulated vs verified savings, report PDF/Markdown and complete assumptions.

## Phase 9 — Pilot hardening

Tenant isolation integration tests; security review, dependencies and migrations, provider contract review, deletion workflows, observability, performance/load tests, recovery and deploy guide.

## Next 30 days

Week 1: Phase 1 hardening and first customer interviews.
Week 2: Trace ingestion and synthetic demo.
Week 3: Classification, transparent cost model and comparison data.
Week 4: Provider evaluation, first shadow experiment and pilot report.

Avoid custom-model training until one workflow establishes measurable savings and quality.
