#!/usr/bin/env node
/**
 * Validate the CI evidence *schema* before publishing it as an artifact.
 * Never read credentials, trace content, token files or application logs.
 */
import assert from "node:assert/strict";
import {readFile,writeFile} from "node:fs/promises";
import {join} from "node:path";

const dir=process.env.PHASE14_OUTPUT_DIR??"artifacts";
const report=JSON.parse(await readFile(join(dir,"phase14-synthetic-acceptance.json"),"utf8"));
const exactKeys=["schemaVersion","phase","status","scope","generatedAt",
  "releaseSha","checks","checkCount","failures","providerCalls",
  "customerDataProcessed","verifiedCustomerSavings","externalAcceptance",
  "productionReady","blockers"].sort();
assert.deepEqual(Object.keys(report).sort(),exactKeys);
assert.equal(report.schemaVersion,1);
assert.equal(report.phase,14);
assert.equal(report.status,"PASS");
assert.equal(report.scope,"synthetic_ephemeral_ci_only");
assert.equal(report.customerDataProcessed,false);
assert.equal(report.verifiedCustomerSavings,false);
assert.equal(report.externalAcceptance,"NOT_EVALUATED");
assert.equal(report.productionReady,false);
assert.equal(report.providerCalls,"MOCK_ONLY");
assert.deepEqual(report.failures,[]);
assert.ok(Number.isFinite(Date.parse(report.generatedAt)));
assert.match(report.releaseSha,/^(?:[a-f0-9]{40}|local)$/);
assert.ok(Array.isArray(report.blockers)&&report.blockers.length>=4);
const expected=[
  "identity","tenant-isolation","frozen-protocol","holdout-non-reuse",
  "provider-denial","fault-stress","invoice-provenance","audit-evidence",
  "operator-boundary","cleanup",
].sort();
assert.equal(report.checkCount,expected.length);
assert.deepEqual(report.checks.map(c=>c.name).sort(),expected);
for(const c of report.checks){
  assert.deepEqual(Object.keys(c).sort(),["description","name","status"]);
  assert.equal(c.status,"PASS");
  assert.ok(/^[a-z-]{3,40}$/.test(c.name));
  assert.ok(typeof c.description==="string"&&c.description.length<160);
}
// Never accept a report containing authorization credentials, addresses,
// API keys, real account identifiers, or financially verified claims.
const serialized=JSON.stringify(report);
for(const bad of ["contextops_session","Bearer ","@example.","DATABASE_URL",
  "AUTH_SECRET","OPS_MONITOR_TOKEN","api_key","traceId","organizationId",
  "workspaceId","invoiceReferenceHash","password","customerSavingsVerified"]) {
  assert.equal(serialized.includes(bad),false,"Unsafe evidence field detected");
}
const lines=[
  "# Phase 14 — Synthetic CI Acceptance",
  "",
  "**Result:** "+report.status+" · **Scope:** "+report.scope,
  "",
  "Release SHA: `"+report.releaseSha+"` · Executed: "+report.generatedAt,
  "",
  "| Check | Outcome | Evidence |",
  "| --- | --- | --- |",
  ...report.checks.map(c=>"| "+c.name+" | "+c.status+" | "+c.description+" |"),
  "",
  "## Important boundaries",
  "",
  "- No customer data, paid provider call or production traffic was processed.",
  "- Synthetic CI passing does not demonstrate model parity or verified savings.",
  "- Hosting, legal approval, security testing, managed backups and live invoices are not attested.",
  "- Production approval: **NOT GRANTED**.",
  "",
];
await writeFile(join(dir,"phase14-synthetic-acceptance.md"),lines.join("\n"),{mode:0o600});
console.log("Phase 14 evidence contract PASS: sanitized JSON and human-readable summary");
