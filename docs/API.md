# API Contract — Phase 1

Base path: `/api`. Responses are JSON. Authentication uses an HTTP-only cookie. Browser POST requests are same-origin checked. Errors return `{ "error": "message" }`.

| Method | Route | Auth | Description |
| --- | --- | --- | --- |
| GET | /health | Public | Check DB readiness, 200 or 503 |
| POST | /auth/register | Public | Create user and session |
| POST | /auth/login | Public | Authenticate user |
| POST | /auth/logout | Session | Clear cookie |
| GET | /me | Session | Current public user identity |
| GET | /organizations | Session | List only member organizations and their workspaces |
| POST | /organizations | Session | Create organization, owner membership and first workspace atomically |
| GET | /organizations/:organizationId/workspaces | Member | List workspaces |
| POST | /organizations/:organizationId/workspaces | Owner or admin | Create workspace and audit event |

## Example registration

```http
POST /api/auth/register
Content-Type: application/json

{"name":"Taylor Lee","email":"taylor@example.com","password":"A_StrongPassphrase123"}
```

Status 201, response `{ "user": { "id", "name", "email" } }`. Login takes email/password, 200 on success, 401 on invalid credentials.

## Example organization onboarding

```http
POST /api/organizations
Content-Type: application/json

{
  "companyName": "Northwind Logistics",
  "workspace": {
    "name": "Support Ticket Triage",
    "useCase": "SUPPORT_CLASSIFICATION",
    "provider": "ANTHROPIC",
    "modelName": "Claude Sonnet"
  }
}
```

Returns status 201 and `{ "organization": { ...organization, "workspace": { ... } } }`.

Use cases: `SUPPORT_CLASSIFICATION`, `DOCUMENT_EXTRACTION`, `POLICY_QA`, `SALES_FOLLOW_UP`, `LEAD_QUALIFICATION`, `OTHER`.

Providers: `ANTHROPIC`, `OPENAI`, `GOOGLE`, `OTHER`.

## Authorization and error codes

401 means no valid session; 403 means present but insufficient role or invalid Origin; 404 avoids revealing whether an unauthorized organization exists; 409 duplicate email; 422 schema validation failed; 429 rate limited; 500 server error; 503 dependency unavailable.

## Planned endpoints

`POST /api/workspaces/:id/traces/import`, `GET /api/imports/:id`, `POST /api/workspaces/:id/analysis`, `POST /api/evaluations`, `POST /api/routing-policies`, `POST /api/shadow-runs`, `GET /api/reports/:id`. These routes **do not exist in Phase 1**. All must enforce membership, authorization and tenant scoping.
