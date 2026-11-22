#!/usr/bin/env node
/**
 * Phase 19: reconcile read-only hosted probes into a sanitized REVIEW_REQUIRED
 * evidence register. No network requests, cloud changes or release authorization.
 */
import {readFileSync} from "node:fs";
import {pathToFileURL} from "node:url";

const exactKeys=(value,keys)=>value && typeof value==="object" &&
  !Array.isArray(value) && Object.keys(value).every(k=>keys.includes(k));
const hex40=value=>typeof value==="string" && /^[a-f0-9]{40}$/.test(value);
const phase17Checks=[
  "health","readiness","operator_auth_boundary","operator_status",
  "response_headers","repeat_readiness",
];
const phase18Checks=[
  "deployment_target","release_identity","database_target","redis_target",
  "auth_secrets","invitation_secret","email_sender","operator_monitor",
  "external_provider_lock","release_approval_boundary",
];
const alwaysFalse=[
  "productionApproved","customerDataApproved","verifiedSavings",
];
const isFalseMarkers=(obj,fields)=>fields.every(field=>obj?.[field]===false);

export function assessStagingEvidence({phase17,phase18,releaseSha,operatorScope="private_hosted_read_only"}={}){
  const findings=[];
  if(!hex40(releaseSha)) findings.push("INVALID_RELEASE_SHA");
  const p17Keys=[
    "schemaVersion","phase","status","scope","checks","samples",
    "productionApproved","customerDataApproved","backupsVerified",
    "emailVerified","alertsVerified","independentSecurityVerified",
    "verifiedSavings","checkedAt",
  ];
  const valid17=exactKeys(phase17,p17Keys) &&
    phase17.schemaVersion===1 && phase17.phase===17 && phase17.status==="PASS" &&
    phase17.scope===operatorScope &&
    operatorScope==="private_hosted_read_only" &&
    Number.isInteger(phase17.samples) && phase17.samples>=2 &&
    phase17.samples<=10 && Array.isArray(phase17.checks) &&
    phase17.checks.length===phase17Checks.length &&
    new Set(phase17.checks).size===phase17Checks.length &&
    phase17Checks.every(k=>phase17.checks.includes(k)) &&
    isFalseMarkers(phase17,[...alwaysFalse,"backupsVerified","emailVerified",
      "alertsVerified","independentSecurityVerified"]) &&
    (phase17.checkedAt===undefined ||
      (typeof phase17.checkedAt==="string" &&
      Number.isFinite(Date.parse(phase17.checkedAt))));
  if(!valid17) findings.push("HOSTED_OPERATIONAL_EVIDENCE_UNVERIFIED");

  const p18Keys=[
    "schemaVersion","phase","status","checks","failedChecks",
    "deploymentApproved","productionApproved","customerDataApproved",
    "paidProviderCallsApproved","verifiedSavings","externalHumanApprovalRequired",
  ];
  const valid18=exactKeys(phase18,p18Keys) &&
    phase18.schemaVersion===1 && phase18.phase===18 &&
    phase18.status==="CONFIG_READY_ONLY" &&
    Array.isArray(phase18.failedChecks) && phase18.failedChecks.length===0 &&
    Array.isArray(phase18.checks) && phase18.checks.length===phase18Checks.length &&
    new Set(phase18.checks.map(x=>x?.name)).size===phase18Checks.length &&
    phase18Checks.every(k=>phase18.checks.some(x=>
      x && Object.keys(x).length===2 && x.name===k && x.status==="PASS")) &&
    isFalseMarkers(phase18,[...alwaysFalse,"deploymentApproved","paidProviderCallsApproved"]) &&
    phase18.externalHumanApprovalRequired===true;
  if(!valid18) findings.push("HOSTED_CONFIGURATION_UNVERIFIED");

  // This report intentionally does NOT link a probe to the deployed SHA.
  // Deployment identity must be independently attested by operator evidence.
  findings.push("DEPLOYMENT_SHA_NOT_INDEPENDENTLY_ATTESTED");
  findings.push("MANAGED_BACKUP_RESTORE_NOT_VERIFIED");
  findings.push("EMAIL_AND_ALERT_DELIVERY_NOT_VERIFIED");
  findings.push("TWO_TENANT_HOSTED_ISOLATION_NOT_VERIFIED");
  findings.push("SECURITY_PRIVACY_AND_HUMAN_APPROVAL_PENDING");

  return {
    schemaVersion:1,phase:19,status:"INDEPENDENT_REVIEW_REQUIRED",
    evidenceInputAccepted:valid17 && valid18 && hex40(releaseSha),
    scope:"private_hosted_review_only",
    failedOrPendingChecks:findings,
    productionApproved:false,customerDataApproved:false,
    deploymentApproved:false,paidProviderCallsApproved:false,
    verifiedSavings:false,
  };
}

if(process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href){
  try{
    if(process.argv.length!==5)throw Error("USAGE");
    const [phase17File,phase18File,sha]=process.argv.slice(2);
    const report=assessStagingEvidence({
      phase17:JSON.parse(readFileSync(phase17File,"utf8")),
      phase18:JSON.parse(readFileSync(phase18File,"utf8")),
      releaseSha:sha,
    });
    // Never log source evidence, paths or environment; outputs contain known codes only.
    console.log(JSON.stringify(report,null,2));
    if(!report.evidenceInputAccepted)process.exitCode=1;
  }catch{
    console.error("PHASE19_EVIDENCE_BLOCKED");
    process.exitCode=1;
  }
}
