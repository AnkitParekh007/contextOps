import {test} from "node:test";
import {strict as assert} from "node:assert";
import {assessStagingEvidence} from "./phase19-staging-evidence.mjs";

const names17=["health","readiness","operator_auth_boundary","operator_status",
  "response_headers","repeat_readiness"];
const names18=["deployment_target","release_identity","database_target","redis_target",
  "auth_secrets","invitation_secret","email_sender","operator_monitor",
  "external_provider_lock","release_approval_boundary"];
const sample=()=>({
  releaseSha:"a".repeat(40),
  phase17:{
    schemaVersion:1,phase:17,status:"PASS",scope:"private_hosted_read_only",
    checks:names17,samples:3,productionApproved:false,customerDataApproved:false,
    backupsVerified:false,emailVerified:false,alertsVerified:false,
    independentSecurityVerified:false,verifiedSavings:false,
  },
  phase18:{
    schemaVersion:1,phase:18,status:"CONFIG_READY_ONLY",
    checks:names18.map(name=>({name,status:"PASS"})),failedChecks:[],
    deploymentApproved:false,productionApproved:false,customerDataApproved:false,
    paidProviderCallsApproved:false,verifiedSavings:false,
    externalHumanApprovalRequired:true,
  },
});
test("correctly shaped hosted evidence is still only review-required",()=>{
  const r=assessStagingEvidence(sample());
  assert.equal(r.evidenceInputAccepted,true);
  assert.equal(r.status,"INDEPENDENT_REVIEW_REQUIRED");
  assert.equal(r.deploymentApproved,false);
  assert.equal(r.productionApproved,false);
  assert.equal(r.customerDataApproved,false);
});
test("synthetic CI report must never be accepted as hosted evidence",()=>{
  const data=sample();
  data.phase17.scope="synthetic_ci_only";
  assert.equal(assessStagingEvidence(data).evidenceInputAccepted,false);
});
test("duplicate or missing checks fail closed",()=>{
  const data=sample();
  data.phase17.checks[0]=data.phase17.checks[1];
  assert.equal(assessStagingEvidence(data).evidenceInputAccepted,false);
  const other=sample();
  other.phase18.checks.pop();
  assert.equal(assessStagingEvidence(other).evidenceInputAccepted,false);
});
test("extra data or forged approvals are rejected",()=>{
  const data=sample();
  data.phase17.token="sensitive-value";
  assert.equal(assessStagingEvidence(data).evidenceInputAccepted,false);
  const other=sample();
  other.phase18.productionApproved=true;
  assert.equal(assessStagingEvidence(other).evidenceInputAccepted,false);
});
test("release hash is required but never treated as deployed identity proof",()=>{
  const data=sample();
  data.releaseSha="main";
  assert.equal(assessStagingEvidence(data).evidenceInputAccepted,false);
  assert.ok(assessStagingEvidence(sample()).failedOrPendingChecks.includes(
    "DEPLOYMENT_SHA_NOT_INDEPENDENTLY_ATTESTED"));
});
test("only bounded, sanitized result fields are emitted",()=>{
  const data=sample();
  data.phase17.checkedAt="2026-11-23T00:00:00Z";
  const report=JSON.stringify(assessStagingEvidence(data));
  assert.equal(report.includes(data.releaseSha),false);
  assert.equal(report.includes(data.phase17.checkedAt),false);
  assert.equal(report.includes("https://"),false);
});
