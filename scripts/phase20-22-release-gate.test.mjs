import {test} from "node:test";
import {strict as assert} from "node:assert";
import {assessPilotGates,phaseControls} from "./phase20-22-release-gate.mjs";
const instant=Date.parse("2026-11-23T00:00:00Z");
const all=Object.values(phaseControls).flat();
const valid=()=>({
 schemaVersion:1,releaseSha:"a".repeat(40),environment:"isolated_staging",
 records:all.map(control=>({
  control,result:"PASS",scope:"independent_review",
  evidenceRef:"https://github.com/AnkitParekh007/contextOps/issues/1",
  reviewedAt:"2026-11-22T00:00:00Z",
 })),
});
test("no evidence and synthetic-only inputs remain blocked",()=>{
  const empty=assessPilotGates({...valid(),records:[]},instant);
  assert.equal(empty.status,"BLOCKED");
  assert.equal(empty.pendingControls.length,all.length);
  assert.equal(assessPilotGates({...valid(),environment:"synthetic_ci"},instant).acceptedEvidence,false);
});
test("even complete independently recorded evidence cannot authorize go-live",()=>{
  const r=assessPilotGates(valid(),instant);
  assert.equal(r.acceptedEvidence,true);
  assert.equal(r.status,"INDEPENDENT_REVIEW_REQUIRED");
  for(const field of ["stagingAuthorized","pilotAuthorized","productionApproved",
    "customerDataApproved","paidProviderCallsApproved","verifiedSavings"])
    assert.equal(r[field],false);
});
test("reviewer assertions never substitute for independent review",()=>{
  const v=valid();
  v.records[0].scope="staging_operator_report";
  const r=assessPilotGates(v,instant);
  assert.equal(r.status,"BLOCKED");
  assert.ok(r.pendingIndependentReview.includes(v.records[0].control));
});
test("reject malformed duplicate, unknown, extra and missing fields",()=>{
  for(const mutation of [
    v=>v.records.push({...v.records[0]}),
    v=>v.records[0].control="unlisted_control",
    v=>v.records[0].extra="secret",
    v=>delete v.records[0].evidenceRef,
    v=>v.productionApproved=true,
    v=>v.releaseSha="main",
  ]){
    const v=valid(); mutation(v);
    assert.equal(assessPilotGates(v,instant).acceptedEvidence,false);
  }
});
test("reject future, stale, insecure and query-bearing evidence",()=>{
  for(const [field,value] of [
    ["reviewedAt","2026-11-25T00:00:00Z"],
    ["reviewedAt","2026-09-01T00:00:00Z"],
    ["evidenceRef","http://example.com/evidence"],
    ["evidenceRef","https://example.com/evidence?token=secret"],
    ["evidenceRef","https://user:pass@example.com/evidence"],
    ["evidenceRef","https://localhost/evidence"],
  ]){
    const v=valid();v.records[0][field]=value;
    assert.equal(assessPilotGates(v,instant).acceptedEvidence,false,field+" "+value);
  }
});
test("failed controls remain visible only by code, never sensitive details",()=>{
  const v=valid();
  v.records[2].result="FAIL";
  const r=assessPilotGates(v,instant);
  assert.equal(r.status,"BLOCKED");
  assert.ok(r.pendingControls.includes(v.records[2].control));
  const output=JSON.stringify(r);
  assert.equal(output.includes("https://"),false);
  assert.equal(output.includes(v.releaseSha),false);
  assert.equal(output.includes("reviewedAt"),false);
});
