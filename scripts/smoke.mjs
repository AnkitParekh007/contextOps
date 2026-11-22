/**
 * End-to-end Phase 1 smoke check against a running app + PostgreSQL + Redis.
 * Uses only synthetic accounts; safe for an ephemeral CI database.
 */
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

const base = process.env.APP_URL ?? "http://localhost:3000";
const nonce = randomUUID().slice(0, 12);
const password = "Strong_Example_12345";
async function call(path, { method = "GET", body, cookie } = {}) {
  const res = await fetch(base + path, {
    method,
    headers: {
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(cookie ? { Cookie: cookie } : {}),
      Origin: base,
    },
    body: body ? JSON.stringify(body) : undefined,
    redirect: "manual",
  });
  const json = await res.json();
  return { status: res.status, json, cookie: res.headers.get("set-cookie")?.split(";")[0] };
}
const a = await call("/api/auth/register", {
  method: "POST", body: { name: "Synthetic Owner", email: "owner-" + nonce + "@example.test", password },
});
assert.equal(a.status, 201, JSON.stringify(a.json));
assert.ok(a.cookie?.startsWith("contextops_session="));
const cookieA = a.cookie;
const me = await call("/api/me", { cookie: cookieA });
assert.equal(me.status, 200);
assert.equal(me.json.user.name, "Synthetic Owner");

const org = await call("/api/organizations", { method: "POST", cookie: cookieA, body: {
  companyName: "Demo Tenant Alpha",
  workspace: { name: "Support Triage", useCase: "SUPPORT_CLASSIFICATION", provider: "ANTHROPIC", modelName: "Claude Sonnet" },
} });
assert.equal(org.status, 201, JSON.stringify(org.json));
const orgId = org.json.organization.id;
assert.ok(orgId);
const list = await call("/api/organizations", { cookie: cookieA });
assert.equal(list.status, 200);
assert.ok(list.json.organizations.some(o => o.id === orgId && o.role === "OWNER"));
const workspace = await call("/api/organizations/" + orgId + "/workspaces", { cookie: cookieA });
assert.equal(workspace.status, 200);
assert.equal(workspace.json.workspaces.length, 1);

const b = await call("/api/auth/register", {
  method: "POST", body: { name: "Synthetic Outsider", email: "outsider-" + nonce + "@example.test", password },
});
assert.equal(b.status, 201, JSON.stringify(b.json));
assert.equal((await call("/api/organizations/" + orgId + "/workspaces", { cookie: b.cookie })).status, 404);
assert.equal((await call("/api/organizations/" + orgId + "/workspaces", { method: "POST", cookie: b.cookie,
  body: { name: "Intrusion", useCase: "OTHER", provider: "OTHER", modelName: "No model" } })).status, 404);

const logout = await call("/api/auth/logout", { method: "POST", cookie: cookieA });
assert.equal(logout.status, 200);
assert.equal((await call("/api/me", { cookie: logout.cookie })).status, 401);

const loginBad = await call("/api/auth/login", { method: "POST",
  body: { email: "owner-" + nonce + "@example.test", password: "not-the-password" } });
assert.equal(loginBad.status, 401);
const login = await call("/api/auth/login", { method: "POST",
  body: { email: "owner-" + nonce + "@example.test", password } });
assert.equal(login.status, 200);
assert.equal((await call("/api/me", { cookie: login.cookie })).status, 200);
console.log("Phase 1 smoke passed: register, session, organization, workspace, isolation, logout, login");
