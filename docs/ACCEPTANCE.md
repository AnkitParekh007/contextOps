# MVP Acceptance Matrix

## Workflow acceptance

| # | Criteria | Implementation / verification |
| --- | --- | --- |
| 1 | Create workspace | Auth + organizations API and onboarding |
| 2 | Upload CSV / JSONL / JSON | File API + server parser, mapping and redacted preview |
| 3 | Parsed traces + data quality issues | Job statuses, validation issues, paginated trace list |
| 4 | Workload analysis | `POST /analysis` |
| 5 | Categories, volume, cost and routing candidates | Analysis pages + cost assumptions + suitability |
| 6 | Configure quality threshold | Settings endpoint and UI |
| 7 | Evaluate current/candidate on same labels | Test-set harness and provider adapter |
| 8 | Quality/cost/latency/fallback/per-success | Evaluation results, scenario and summary views |
| 9 | Create routing policy | Simulation-only policy builder |
| 10 | Run shadow mode | Offline per-trace projected routing |
| 11 | Distinguish projected/estimated/verified | Dashboard, calculator and report label verified unavailable |
| 12 | Export assessment | Markdown report download with audit |
| 13 | View audit trail | Scoped audit log page |
| 14 | Docker Compose + demo | App/worker/DB/Redis Compose and 500-label seed |

## Programmatic verification

Run `npm run typecheck && npm test && npm run lint && npm run build`, then `npm run smoke:pilot` against a running app, Postgres, Redis and worker. CI provisions the services and automatically tests account/session behavior, tenant isolation, import redaction, 500 synthetic traces, classification, mock evaluation, quality-gated policy, shadow run, report and audit.

**Limitation:** the full pilot CI verifies the synthetic workflow, not real-provider accuracy or production savings. Actual third-party calls need separately approved data and credentials.

## Data quality criteria

- Invalid schema rows must return counts and generic errors, never raw secrets.
- Duplicate external trace IDs must not create multiple records in the same workspace.
- Failed jobs must never create authorization bypasses or cross-tenant records.
- Sensitive and unsupported tasks default to review/premium, not cheap routing.
- A failed or unvalidated candidate cannot be promoted to a simulation-approved policy.
- Scenario cost must charge both the cheap attempt and premium fallback.

## Phase 13 engineering acceptance

CI additionally builds the production Docker image and boots the worker to catch missing runtime imports. A read-only `hosted-acceptance.mjs` probe validates health/readiness, rejects unauthorized access to `/api/ops/status`, and verifies an authorized aggregate status. In CI a synthetic localhost-only exemption permits HTTP; the real operator probe requires exact configured HTTPS origin. These checks do not replace live Railway activation, managed backup restore, security review or a staged synthetic pilot.
