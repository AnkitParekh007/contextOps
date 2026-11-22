#!/usr/bin/env node
/**
 * Fail-closed, read-only Phase 23 deployment-identity acceptance.
 * No authorization to deploy, spend, migrate, process data, or issue approvals.
 */
import {pathToFileURL} from "node:url";
import {runOperationalProbe,validateTarget} from "./phase17-operational-probe.mjs";

const exact=(value,keys)=>value&&typeof value==="object"&&!Array.isArray(value)&&
  Object.keys(value).length===keys.length&&keys.every(key=>Object.hasOwn(value,key));
export function validatePinnedHost(origin,registered,approvedDomain,ci=false){
  const target=validateTarget(origin,registered,ci);
  if(ci && origin==="http://localhost:3000")return target;
  if(!approvedDomain||typeof approvedDomain!=="string"||
    !approvedDomain.includes(".")||!/^[a-z0-9.-]+$/.test(approvedDomain)||
    approvedDomain.includes("..")||approvedDomain==="localhost")
    throw new Error("HOST_NOT_APPROVED");
  const hostname=new URL(origin).hostname.toLowerCase();
  if(hostname!==approvedDomain&&!hostname.endsWith("."+approvedDomain))
    throw new Error("HOST_NOT_APPROVED");
  if(!hostname.includes("staging")&&!hostname.includes("preview"))
    throw new Error("HOST_NOT_STAGING");
  return target;
}
export async function runPhase23Probe({
  origin,registered,approvedDomain,token,expectedSha,ci=false,
  fetcher=fetch,sleep=async()=>{},samples=3,
}){
  const target=validatePinnedHost(origin,registered,approvedDomain,ci);
  if(!/^[a-f0-9]{40}$/.test(expectedSha??""))
    throw new Error("INVALID_EXPECTED_SHA");
  if(typeof token!=="string"||token.length<32||token.startsWith("REPLACE_"))
    throw new Error("INVALID_OPERATOR_TOKEN");
  // Check expected identity before making other authenticated requests.
  const response=await fetcher(origin+"/api/ops/release",{
    method:"GET",redirect:"manual",cache:"no-store",
    headers:{Authorization:"Bearer "+token},
    signal:AbortSignal.timeout(8000),
  });
  if(response.status!==200||
    !response.headers.get("content-type")?.includes("application/json")||
    response.headers.get("x-content-type-options")!=="nosniff"||
    !response.headers.get("cache-control")?.includes("no-store"))
    throw new Error("IDENTITY_UNAVAILABLE");
  const body=await response.json();
  if(!exact(body,["status","releaseSha"])||body.status!=="ok"||
    body.releaseSha!==expectedSha)
    throw new Error("RELEASE_IDENTITY_MISMATCH");
  const operational=await runOperationalProbe({
    origin,registered,token,ci,fetcher,sleep,samples,
  });
  if(operational.status!=="PASS")throw new Error("OPERATIONAL_NOT_READY");
  return {
    schemaVersion:1,phase:23,status:"READ_ONLY_CHECKS_PASSED",
    scope:target.scope,checks:["pinned_host","authenticated_release_identity",
      ...operational.checks],
    // The SHA was supplied by the operator and reported by the service.
    // This is consistency only, NOT provider-backed supply chain attestation.
    independentDeploymentAttestation:false,
    backupRestoreVerified:false,emailVerified:false,alertsVerified:false,
    tenantIsolationVerified:false,securityReviewed:false,
    stagingApproved:false,pilotAuthorized:false,customerDataApproved:false,
    productionApproved:false,paidProviderCallsApproved:false,
  };
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  try{
    const report=await runPhase23Probe({
      origin:process.env.PILOT_BASE_URL,registered:process.env.APP_URL,
      approvedDomain:process.env.STAGING_APPROVED_DOMAIN,
      token:process.env.OPS_MONITOR_TOKEN,
      expectedSha:process.env.STAGING_EXPECTED_SHA,
      ci:process.env.CI==="true"&&process.env.PHASE23_SYNTHETIC==="true",
      sleep:()=>new Promise(resolve=>setTimeout(resolve,1000)),
    });
    // Coarse, sanitized evidence only: no host, SHA, secret, identities.
    console.log(JSON.stringify(report,null,2));
  }catch(error){
    const code=error instanceof Error&&/^[A-Z_]+$/.test(error.message)?
      error.message:"PHASE23_PROBE_FAILED";
    console.error("PHASE23_BLOCKED:",code);
    process.exitCode=1;
  }
}
