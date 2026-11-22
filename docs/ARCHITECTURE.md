# Architecture and Data Model

## System

```text
Browser (Next.js App Router)
  -> Auth / organization APIs (Zod + session + RBAC)
  -> Prisma + PostgreSQL (users, orgs, workspaces, audit records)
  -> Redis (authentication throttling)

Future:
  Authorized traces -> Redaction & validation -> Ingestion jobs
    -> Workload analyzer -> Evaluation harness -> Policy engine
    -> Shadow-mode simulator -> Dashboard / report / audit
```

The UI and API run in Next.js. Keep adapters and domain logic outside route handlers. The current app does not call Anthropic/OpenAI or ingest customer prompts.

## Phase 1 logical tables

| Table | Purpose | Tenant boundary |
| --- | --- | --- |
| User | Individual login identity; hashed password | User id |
| Organization | Customer account and company name | Organization id |
| Membership | User-to-organization role (OWNER, ADMIN, ANALYST, VIEWER) | Unique user+org |
| Workspace | One business AI workflow, provider/model metadata | Organization id |
| AuditLog | Immutable event records for foundational actions | Organization id |

Database FKs, unique constraints and scoped Prisma queries support tenant isolation. For the MVP, the application enforces membership authorization. A pilot-ready deployment will additionally require automated cross-tenant security tests and stronger operational controls.

## Planned domain tables (not created yet)

| Table | Key design requirements |
| --- | --- |
| workflow_connections | org_id, workspace_id, provider, encrypted credentials reference, consent |
| execution_traces | tenant/workflow/external ID, tokens, latency, model, sanitized input/output and metadata |
| trace_events | chronological steps linked to trace |
| task_classifications | label, confidence, risk, explainable suitability |
| routing_policies | version, risk/quality bounds, status, approval |
| model_routes | provider/model, fallback order, pricing snapshot |
| evaluation_datasets | version, task category, labeled examples and provenance |
| evaluation_runs | baseline/candidate models, status, evaluator config |
| evaluation_results | output, quality, latency, cost, errors |
| quality_thresholds | workspace/task-specific thresholds |
| cost_snapshots | effective-dated model pricing and currency |
| savings_reports | assumptions, gross/net, method, confidence and status |
| shadow_mode_runs | isolated simulation experiment and outcomes |
| feedback_events | human review, label correction, drift signal |

All domain records will include organization and workspace scoping where relevant. Tenant composite foreign keys and data deletion plans will be applied before Phase 2 enables real data uploads.

## Key planned algorithms

**Candidate selection**
```text
for each task:
  if sensitive OR high_risk OR insufficient_labels: blocked/review
  else cluster deterministically using type/template/schema/length
  benchmark cheaper candidates against baseline on same labeled cases
  eligible only if quality >= task_threshold AND
    latency, error, fallback and total cost are acceptable
```

**Savings**
```text
baseline = sum(actual request tokens * baseline price)
optimized = sum(candidate tokens * candidate price)
  + fallback requests + retries + hosting + platform/integration fees
net_savings = baseline - optimized
cost_per_success = full_cost / successfully_completed_tasks
```

Use prices effective for the evaluation period. Never treat a failed/invalid result as a successful task. Cached input and provider-specific price tiers must be explicit.

**Shadow mode**
```text
production request -> original provider (unchanged production answer)
                   -> optional consented shadow evaluator (isolated)
compare, record simulated route/cost/quality -> report
```

## Security boundaries

Customer content is absent from Phase 1. In future: explicit per-provider consent, redaction prior to storage, secret encryption, minimum retention, export/deletion, action audit, privacy agreements and a legal review of training rights.
