#!/usr/bin/env node
/**
 * Phases 20-22: strictly offline external-evidence review gate.
 * Operator assertions are NOT independent verification or release permission.
 * No network calls, migrations, deployments or customer processing.
 */
import {readFileSync} from "node:fs";
import {pathToFileURL} from "node:url";

export const phaseControls=Object.freeze({
  20:["approved_hosting_budget","approved_staging_region","https_ingress",
      "private_database","private_redis","isolated_worker","deployed_sha_attestation",
      "secrets_and_rollback"],
  21:["auth_mfa_recovery","two_tenant_isolation","queue_restart_replay",
      "managed_backup_restore","alert_delivery_and_ack","email_delivery",
      "security_review","privacy_dpa_residency"],
  22:["synthetic_pilot_cohort","written_pilot_scope","data_rights_review",
      "incident_owner","kill_switch_test","human_go_no_go"],
});
const allowedScopes=new Set(["staging_operator_report","independent_review"]);
const exact=(v,keys)=>v&&typeof v==="object"&&!Array.isArray(v)&&
  Object.keys(v).length===keys.length&&keys.every(k=>Object.hasOwn(v,k));
const validRef=(ref)=>{
  if(typeof ref!=="string"||ref.length>500)return false;
  try{
    const u=new URL(ref);
    return u.protocol==="https:"&&!u.username&&!u.password&&!u.search&&!u.hash &&
      !["localhost","127.0.0.1"].includes(u.hostname);
  }catch{return false;}
};
const validWhen=(v,now)=>{
  if(typeof v!=="string"||!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,3})?(?:Z|[+-]\d\d:\d\d)$/.test(v))return false;
  const time=Date.parse(v);
  return Number.isFinite(time)&&time<=now&&now-time<=30*86400000;
};
export function assessPilotGates(input,now=Date.now()){
  const allControls=Object.values(phaseControls).flat();
  const bad=["MANIFEST_INVALID"];
  const empty=(codes)=>({
    schemaVersion:1,phaseRange:"20-22",status:"BLOCKED",
    acceptedEvidence:false,pendingControls:codes,
    independentReviewRequired:true,stagingAuthorized:false,
    pilotAuthorized:false,productionApproved:false,
    customerDataApproved:false,paidProviderCallsApproved:false,
    verifiedSavings:false,
  });
  if(!exact(input,["schemaVersion","releaseSha","environment","records"])||
    input.schemaVersion!==1 || !/^[a-f0-9]{40}$/.test(input.releaseSha)||
    input.environment!=="isolated_staging"||!Array.isArray(input.records)||
    input.records.length>allControls.length)return empty(bad);
  const seen=new Set();
  const recorded=new Map();
  for(const record of input.records){
    if(!exact(record,["control","result","scope","evidenceRef","reviewedAt"])||
      !allControls.includes(record.control)||seen.has(record.control)||
      !["PASS","FAIL"].includes(record.result)||
      !allowedScopes.has(record.scope)||
      !validRef(record.evidenceRef)||!validWhen(record.reviewedAt,now))
      return empty(bad);
    seen.add(record.control);
    recorded.set(record.control,record);
  }
  const pending=allControls.filter(c=>!recorded.has(c)||
    recorded.get(c).result!=="PASS");
  const unreviewed=allControls.filter(c=>recorded.get(c)?.scope!=="independent_review");
  const phaseStatus=Object.fromEntries(Object.entries(phaseControls).map(([p,controls])=>[
    p,controls.every(c=>recorded.get(c)?.result==="PASS"&&
      recorded.get(c)?.scope==="independent_review")?
      "EVIDENCE_RECORDED_REVIEW_REQUIRED":"BLOCKED",
  ]));
  // Even independent reviewer attestations are untrusted input and need separate
  // authenticated, human authorization. No programmatic release is possible here.
  return {
    schemaVersion:1,phaseRange:"20-22",
    status:pending.length||unreviewed.length?"BLOCKED":"INDEPENDENT_REVIEW_REQUIRED",
    acceptedEvidence:true,phaseStatus,pendingControls:pending,
    pendingIndependentReview:unreviewed,
    independentReviewRequired:true,stagingAuthorized:false,
    pilotAuthorized:false,productionApproved:false,
    customerDataApproved:false,paidProviderCallsApproved:false,
    verifiedSavings:false,
  };
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  try{
    if(process.argv.length!==3)throw Error("INVALID_ARGUMENTS");
    const parsed=JSON.parse(readFileSync(process.argv[2],"utf8"));
    const result=assessPilotGates(parsed);
    // Sanitized codes only. Do NOT echo input URLs, tokens or metadata.
    console.log(JSON.stringify(result,null,2));
    if(!result.acceptedEvidence||result.status==="BLOCKED")process.exitCode=1;
  }catch{
    console.error("PILOT_REVIEW_BLOCKED");
    process.exitCode=1;
  }
}
