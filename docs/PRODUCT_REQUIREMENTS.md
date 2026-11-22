# ContextOps AI — Product Requirements (MVP)

## Thesis

Help a mid-sized B2B team reduce the cost of an existing production AI workflow, without blindly replacing the current model. Success requires better **cost per successful task**, not simply lower token price.

The promise: *Keep your existing AI automations. We make them more cost-efficient, measure the results, and preserve the quality controls your business depends on.*

## Personas

- AI/engineering, operations or automation lead owning a production LLM workflow.
- Founder, consultant or agency performing a customer AI-spend audit.

## First pilot

Start with **one organization and one workflow**. Priority use cases are support triage, invoice/document extraction and internal policy Q&A. Users need sufficient traffic, representative labels and authorization to inspect samples.

## Customer journey

1. Register and create a company/workspace with workflow type and current provider/model.
2. Explicitly authorize trace ingestion and configure redaction and retention.
3. Upload CSV/JSONL/JSON, map fields and inspect errors and sample records.
4. Inspect volume, token usage, cost, task clusters, repetitive categories and risk flags.
5. Compare baseline and cheaper candidates against labeled evaluations and configurable quality thresholds.
6. Generate routing recommendations with fallback, risk, estimated savings and evidence.
7. Execute read-only shadow routing, never affecting the production result.
8. Export an auditable savings report.

## Core metrics

Task count, tokens, cost/task, **cost/successful task**, model mix, classification and extraction accuracy, output validity, latency percentiles, errors, fallback rate, quality score, projected annual savings, and separate **estimated / simulated / verified** savings.

## Nonnegotiable guardrails

- A cheaper route is never recommended solely on price.
- Uncertain, sensitive or high-impact tasks must default to premium handling or human review.
- Customer data cannot be sent to a new provider without explicit authorization.
- RAG is for changeable business knowledge; fine-tuning is deferred until benchmarked.
- Raw model outputs are not automatically safe to use for training.
- Never claim simulated results are realized or verified savings.
- An audit event accompanies consequential routing, processing and permission decisions.

## MVP exclusions

No dedicated training pipeline, GPU hosting, SSO, complex billing, production connectors, marketplace or live production model switching in v1.

## Phase 1 scope (implemented foundation)

Account registration/login/logout, company/workspace creation, owner/admin/analyst/viewer role model, scoped listing APIs, audit events, health endpoint, Docker Postgres and Redis, local demo workspace option, landing and dashboard.

## Future acceptance goals

At least 10,000 ingested traces in an asynchronous, idempotent pipeline; deterministic classification; per-task evaluation harness; transparent savings calculator including fallback and hosting fees; shadow mode; exportable reports and auditable activity. Each feature requires its own tests and must not be described as complete before it is implemented.
