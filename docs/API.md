# ContextOps AI — HTTP API

All endpoints return JSON unless marked as a download. Browser POST and DELETE calls require a matching `APP_URL` Origin. Authentication uses a signed, HTTP-only session cookie. Token-only unauthenticated APIs are intentionally not available.

## Identity and tenancy

| Method | Path | Access | Notes |
| --- | --- | --- | --- |
| POST | /api/auth/register | Public, throttled | Name, email, 12+ character password |
| POST | /api/auth/login | Public, throttled | Return user and set cookie |
| POST | /api/auth/logout | Session | Clear cookie |
| GET | /api/me | Session | User profile |
| GET / POST | /api/organizations | Member / signed-in | List only member organizations or create company and first workspace |
| GET / POST | /api/organizations/:orgId/workspaces | Member / owner-admin | List or create workspace |
| DELETE | /api/workspaces/:workspaceId | Owner/admin | JSON `{"confirmation":"DELETE <exact workspace name>"}` |
| GET | /api/health | Public | DB readiness |

## Workflow (tenant-scoped)

Use `/api/workspaces/:workspaceId/:action`. Every operation verifies workspace membership. Owner and admin are required for policy changes, pricing assumptions, settings and connector creation; analyst can run evaluations/analysis, viewer can only read.

| Method | Action | Request / response |
| --- | --- | --- |
| GET | overview | Observed trace metrics, modeled sample costs if priced, latest simulation and evaluation |
| GET | traces | Paginated sanitized traces (`page`, `size`) |
| GET | template | Download CSV header template |
| POST | preview | Multipart `file`, `authorized=true`, optional `mapping` JSON; returns redacted preview/columns/issues |
| POST | imports | Multipart `file`, `authorized=true`, `retentionAcknowledged=true`, optional `mapping` JSON; returns 202 queue ID |
| GET | imports | Recent jobs and progress (without content payload) |
| GET | /api/imports/:jobId | Job owner/member | Status, processed, rejected, issues |
| POST | demo | Generate 500 synthetic traces with idempotent external IDs |
| GET | analysis | Task groupings and distribution |
| POST | analysis | Recompute deterministic classification and human-review queue |
| POST | calculator | Configurable prices, tokens, volume, success/fallback, fees; returns numerical scenario |
| GET/POST | evaluations | List labeled evaluation runs / run candidate benchmark |
| GET/POST | policies | List simulation policies / create policy tied to passing evaluation |
| GET/POST | shadow | List offline simulations / simulate an approved policy |
| GET/POST | reports | List report headers / create Markdown assessment from latest shadow run |
| GET | /api/reports/:reportId/download | Member | Download Markdown, audit export |
| GET/POST | reviews | Review queue / record human disposition |
| GET | audit | Recent tenant workspace audit events |
| GET/POST | settings | Quality thresholds / save per-task threshold |
| POST | pricing | Save assumed model price snapshot |
| POST | connections | Add synthetic MOCK connector only |

## Example API bodies

**Calculator**
```json
{
  "monthlyVolume": 100000,
  "averageInputTokens": 3000,
  "averageOutputTokens": 500,
  "baselineInputPrice": 2,
  "baselineOutputPrice": 10,
  "candidateInputPrice": 0.1,
  "candidateOutputPrice": 0.5,
  "eligiblePercent": 70,
  "fallbackPercent": 10,
  "infrastructureMonthly": 0,
  "platformMonthly": 0,
  "baselineSuccessRate": 0.99,
  "optimizedSuccessRate": 0.98
}
```

**Evaluation (local mock)**
```json
{
  "provider": "MOCK",
  "model": "mock-efficient",
  "maximumSamples": 30,
  "minimumQuality": 0.95,
  "baselineInputPrice": 2,
  "baselineOutputPrice": 10,
  "candidateInputPrice": 0.1,
  "candidateOutputPrice": 0.5,
  "consentExternal": false
}
```

External evaluations explicitly require `consentExternal=true` and server-side credentials. They are limited to at most ten redacted labeled samples per request. Model identifiers are provided by the operator; unsupported models return a provider failure, not a fabricated quality score.

**Policy**
```json
{
  "name": "Routine classification",
  "evaluationRunId": "<known evaluation id>",
  "minConfidence": 0.9,
  "minQuality": 0.95,
  "maxLatencyMs": 10000,
  "maxFallbackRate": 0.2,
  "retryLimit": 1,
  "requireApprovalForSensitive": true
}
```

Status `APPROVED_FOR_SIMULATION` never means approval for production routing.

## Standard error codes

- 401 no session
- 403 denied Origin, permissions or consent
- 404 workspace, report or import absent from the accessible tenant
- 409 duplicate account
- 413 oversized file
- 422 invalid schema, insufficient labels or policy quality gate
- 429 rate limit
- 500 unexpected server error
- 503 database unavailable

Output processing statuses are `QUEUED`, `PROCESSING`, `RETRY`, `COMPLETED`, `FAILED`. Errors do not intentionally echo raw uploaded content.
