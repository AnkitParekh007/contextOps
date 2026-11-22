# ContextOps AI — System Architecture

## Design overview

```text
Browser (React + Next.js App Router, TanStack Query, Tailwind, Recharts)
   |
   | cookie session + same-origin API access
   v
Authenticated tenant API (Zod + membership roles + audit)
   |
   +--> PostgreSQL / Prisma --- Users / orgs / workspaces / memberships
   |                        \-- Trace, cost, quality, evaluation, policy, shadow, report tables
   |
   +--> Redis --------------- Auth and workflow rate limiting
   |
   +--> Trace parsing & redaction (server-side, consented)
   |           |
   |           v
   |      ImportJob with sanitized payload, status and issues (PostgreSQL)
   |           |
   |           v
   |      Separate worker, 200-row idempotent createMany batches,
   |      resumable claims and bounded exponential retry
   |
   +--> Workload analyzer --> Risk classifier / quality-label coverage
   |
   +--> Evaluation harness --> MOCK / optional OpenAI / optional Anthropic
   |                           --> exact classification, macro F1, extraction schema
   |
   +--> Simulation policy --> Risk / confidence / minimum quality / fallback
   |
   +--> Offline shadow run --> Projected model mix and modeled cost
   |
   \--> Dashboard, human review, Markdown reports, append-only audit
```

Production request interception is **deliberately absent**. The shadow engine reads existing traces and does not modify any customer workflow.

## Data model

Each business record has `organizationId` and `workspaceId`. Every domain record holds a **composite foreign key** to `Workspace(id, organizationId)` to prevent accidental cross-organization references. Database cascades remove domain data when a workspace is deleted. API queries are also scoped to the authenticated user's organization membership.

| Domain | Prisma entities |
| --- | --- |
| Identity / tenancy | User, Organization, Membership, Workspace |
| Processing / consent | WorkflowConnection, ImportJob, ExecutionTrace, TraceEvent |
| Analysis | TaskClassification, QualityThreshold, HumanReview, FeedbackEvent |
| Models / pricing | ModelRoute, CostSnapshot |
| Evaluation | EvaluationDataset, EvaluationRun, EvaluationResult |
| Routing / outcomes | RoutingPolicy, ShadowModeRun, SavingsReport |
| Accountability | AuditLog |

The schema and versioned migrations are the source of truth. Some extensible tables (e.g. `TraceEvent`) are prepared for later integrations; do not treat schema presence as evidence of an active feature.

## Ingestion

- Accept JSON arrays, JSONL lines or RFC-style quoted CSV records.
- Detect aliases, support custom field mapping and validate typed values.
- Limit upload to 16 MiB / 10,000 traces.
- Sanitize text and metadata before persisting it; never retain uploaded raw bytes.
- Store sanitized import batches as queued jobs. The worker replays with `createMany(skipDuplicates)` using `(workspaceId, externalTraceId)` uniqueness.
- On successful completion the queued payload is erased; retained trace records contain only sanitized content.

## Model evaluation

Representative, labeled task classes (classification and structured extraction only) are considered for automatic scoring. Baseline scores use previously observed outputs; candidate responses are generated without including expected answers in their prompt. Evaluation records baseline accuracy, candidate macro-F1, correctness, per-task costs, latency and provider failures.

A candidate route is simulation-eligible only when it clears configured minimum quality, baseline noninferiority, acceptable error/latency and lower modeled cost. Unlabeled free-text quality remains subject to human review, not speculative LLM-judge grades.

## Routing and shadow simulation

```text
if sensitive / high risk / blocked -> HUMAN_REVIEW
else if insufficient labels / low confidence -> PREMIUM
else if category unsupported -> PREMIUM
else if quality/cost benchmark not approved -> PREMIUM
else -> CHEAPER_MODEL_IN_SIMULATION
```

A simulated cheap attempt is counted as a cost even if it fails. Expected fallback premium calls are added, not substituted. The shadow engine stores routing decisions and projected totals. It never processes production requests.

## Cost evidence levels

- **Assumed:** prices and volume supplied by a human.
- **Estimated:** mathematical scenario or extrapolation from a sample.
- **Simulated:** offline per-trace routing policy projection.
- **Verified:** requires real-world controlled production monitoring; **not supported in this MVP**.

## Development conventions

Business logic lives under `src/lib/pipeline`, tenant guards under `src/lib/tenant.ts`, API endpoints under `src/app/api`, UI under `src/components`. Workflows should avoid direct model API calls from pages, never store provider keys in database fields, use typed input validation and log only sanitized metadata.
