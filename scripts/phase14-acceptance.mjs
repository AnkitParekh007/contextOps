#!/usr/bin/env node
/**
 * Phase 14 acceptance: ephemeral synthetic-only API + cross-tenant pilot.
 * Never run against a hosted application, customer environment or paid provider.
 * Only a sanitized aggregate JSON report is emitted for CI artifact retention.
 */
import assert from "node:assert/strict";
import {createHash,randomUUID} from "node:crypto";
import {readFile,mkdir,writeFile} from "node:fs/promises";
import {join} from "node:path";

const base=process.env.APP_URL;
if(process.env.CI!=="true"||base!=="http://localhost:3000"||
  process.env.ENABLE_EXTERNAL_BENCHMARKS==="true")
  throw Error("Refused: Phase 14 acceptance is localhost synthetic CI only");
const nonce=randomUUID().slice(0,12);
const checks=[];
const stamp=new Date().toISOString();
const artifactDir=process.env.PHASE14_OUTPUT_DIR??"artifacts";
const record=(name,description)=>{
  checks.push({name,status:"PASS",description});
};
let status="FAIL",failureCode="unknown";
let ownerCookie="",outsiderCookie="",ownerWorkspace="",outsiderWorkspace="";
function key(address){return createHash("sha256").update(address).digest("hex");}
function digest(value){return createHash("sha256").update(value).digest("hex");}
async function call(path,{method="GET",body,cookie,expected=200}={}){
  const response=await fetch(base+path,{
    method,redirect:"manual",
    headers:{Origin:base,...(cookie?{Cookie:cookie}:{}),
      ...(body===undefined?{}:{"Content-Type":"application/json"})},
    body:body===undefined?undefined:JSON.stringify(body),
    signal:AbortSignal.timeout(20000),
  });
  const result=await response.json().catch(()=>null);
  if(response.status!==expected)
    throw Error("Unexpected HTTP status "+response.status+" for "+method+" "+path+
      " (expected "+expected+")");
  return {result,headers:response.headers};
}
async function createAccount(prefix){
  const address=prefix+"-"+nonce+"@example.test";
  const password="Synthetic-Phase14-Password-2026";
  const registered=await call("/api/auth/register",{
    method:"POST",expected:201,body:{
      name:"Synthetic phase14 fixture",email:address,password,
      inviteCode:process.env.PILOT_INVITE_CODE,
    },
  });
  assert.equal(registered.result.verificationRequired,true);
  const mail=JSON.parse(await readFile(
    "/tmp/contextops-ci-mail/"+key(address)+".json","utf8"));
  assert.equal(mail.purpose,"VERIFY");
  const token=new URL(mail.url).searchParams.get("token");
  assert.match(token,/^[a-f0-9]{64}$/);
  await call("/api/auth/verify-email",{method:"POST",body:{token}});
  await call("/api/auth/verify-email",{method:"POST",body:{token},expected:400});
  const response=await call("/api/auth/login",{
    method:"POST",body:{email:address,password},
  });
  const cookie=response.headers.get("set-cookie")?.split(";")[0];
  assert.ok(cookie?.startsWith("contextops_session="));
  return cookie;
}
async function makeWorkspace(cookie,label){
  const response=await call("/api/organizations",{
    method:"POST",expected:201,cookie,body:{
      companyName:"Phase14 synthetic "+label+" "+nonce,
      workspace:{name:"Evidence "+label,useCase:"SUPPORT_CLASSIFICATION",
        provider:"OTHER",modelName:"mock-premium"},
    },
  });
  return response.result.organization.workspace.id;
}
async function main(){
  ownerCookie=await createAccount("phase14-owner");
  outsiderCookie=await createAccount("phase14-outsider");
  record("identity","Two separate synthetic accounts verified with one-use tokens");
  ownerWorkspace=await makeWorkspace(ownerCookie,"Owner");
  outsiderWorkspace=await makeWorkspace(outsiderCookie,"Outsider");
  const api="/api/workspaces/"+ownerWorkspace;
  const gov=api+"/benchmarking";
  await call(gov,{expected:401});
  await call(gov,{cookie:outsiderCookie,expected:404});
  await call(gov,{cookie:ownerCookie});
  const config={name:"Northwind holdout "+nonce,seed:"phase14-evidence",
    windowStart:"2026-10-01T00:00:00.000Z",
    windowEnd:"2026-10-02T00:00:00.000Z",
    holdoutPercent:30,minimumStratumSupport:3,minimumClassRecall:.7,
    maxExternalSpendUsd:1,dataProvenance:"SYNTHETIC"};
  await call(gov,{method:"POST",cookie:outsiderCookie,expected:404,
    body:{mode:"create",config}});
  record("tenant-isolation","Uninvolved user cannot read or create benchmark protocols");
  const demo=await call(api+"/demo",{method:"POST",cookie:ownerCookie});
  assert.equal(demo.result.inserted,500);
  const analyzed=await call(api+"/analysis",{method:"POST",cookie:ownerCookie});
  assert.equal(analyzed.result.analyzed,500);
  const created=await call(gov,{method:"POST",cookie:ownerCookie,
    expected:201,body:{mode:"create",config}});
  const protocolId=created.result.protocol.id;
  await call(gov,{method:"POST",cookie:ownerCookie,expected:422,
    body:{mode:"freeze",protocolId,confirmation:"NOT APPROVED"}});
  const frozen=await call(gov,{method:"POST",cookie:ownerCookie,
    body:{mode:"freeze",protocolId,confirmation:"FREEZE "+config.name}});
  assert.equal(frozen.result.protocol.status,"FROZEN");
  assert.equal(frozen.result.protocol.populationSize,500);
  assert.ok(frozen.result.protocol.holdoutSize>=100);
  assert.match(frozen.result.protocol.populationFingerprint,/^[a-f0-9]{64}$/);
  await call(gov,{method:"POST",cookie:ownerCookie,expected:404,
    body:{mode:"freeze",protocolId,confirmation:"FREEZE "+config.name}});
  record("frozen-protocol","Synthetic 500-case protocol fingerprinted; invalid and repeat freeze rejected");
  const evaluationBody={provider:"MOCK",model:"mock-efficient",
    protocolId,maximumSamples:30,minimumQuality:.85,
    baselineInputPrice:2,baselineOutputPrice:10,
    candidateInputPrice:.1,candidateOutputPrice:.5};
  const first=await call(api+"/evaluations",{method:"POST",cookie:ownerCookie,
    body:evaluationBody});
  assert.equal(first.result.run.details.preregistered,true);
  assert.equal(first.result.run.details.benchmarkProtocolId,protocolId);
  assert.match(first.result.run.details.holdoutFingerprint,/^[a-f0-9]{64}$/);
  await call(api+"/evaluations",{method:"POST",cookie:ownerCookie,
    body:evaluationBody,expected:500});
  const runs=await call(api+"/evaluations",{cookie:ownerCookie});
  const duplicates=runs.result.runs.filter(r=>
    r.benchmarkProtocolId===protocolId&&r.provider==="MOCK"&&r.model==="mock-efficient");
  assert.equal(duplicates.length,1,"Same model must not reuse frozen holdout");
  record("holdout-non-reuse","One completed MOCK run; replay of frozen model/holdout rejected");
  const external={...evaluationBody,provider:"OPENAI",model:"unapproved-model",
    consentExternal:true};
  await call(api+"/evaluations",{method:"POST",cookie:ownerCookie,
    body:external,expected:500});
  const after=await call(api+"/evaluations",{cookie:ownerCookie});
  assert.ok(!after.result.runs.some(r=>r.provider==="OPENAI"));
  record("provider-denial","Synthetic cohort cannot be sent to unapproved paid provider");
  const stress=await call(gov,{method:"POST",cookie:ownerCookie,body:{
    mode:"stress",scenario:{monthlyTasks:10000,eligibleFraction:.7,
      baselineUsdPerTask:.003,candidateUsdPerAttempt:.00015,
      errorFraction:.1,retryFraction:.5,fallbackUsdPerTask:.003,
      fixedMonthlyUsd:10},
  }});
  assert.equal(stress.result.scenario.customerSavingsVerified,false);
  assert.ok(stress.result.scenario.fallbacks>0);
  record("fault-stress","Offline retry/fallback cost model records hypothetical, unverified figures");
  const invoice="synthetic-aggregate-"+nonce;
  const reconciled=await call(gov,{method:"POST",cookie:ownerCookie,
    expected:201,body:{mode:"reconcile",runId:first.result.run.id,
      invoiceReference:invoice,periodStart:"2026-10-01T00:00:00.000Z",
      periodEnd:"2026-11-01T00:00:00.000Z",billedTotalUsd:20,
      overheadUsd:5,billableTasks:500,successfulTasks:450,
      acknowledgeSelfReported:true}});
  assert.equal(reconciled.result.invoiceVerified,false);
  assert.equal(reconciled.result.evidenceLevel,"SELF_REPORTED_UNVERIFIED");
  const listing=await call(gov,{cookie:ownerCookie});
  assert.equal(listing.result.reconciliations.length,1);
  assert.equal(listing.result.reconciliations[0].invoiceReferenceHash,digest(invoice));
  assert.equal(JSON.stringify(listing.result).includes(invoice),false);
  await call(gov,{cookie:outsiderCookie,expected:404});
  record("invoice-provenance","Aggregate financial evidence remains unverified and tenant-scoped");
  const audit=await call(api+"/audit",{cookie:ownerCookie});
  const actions=new Set(audit.result.events.map(e=>e.action));
  for(const expected of ["BENCHMARK_PROTOCOL_CREATED","BENCHMARK_PROTOCOL_FROZEN",
    "BENCHMARK_AGGREGATE_RECONCILED"])
    assert.ok(actions.has(expected),"Missing benchmark audit action");
  record("audit-evidence","Creation, freezing, and self-reported reconciliation audited");
  const extra=await call("/api/ops/status",{expected:401,cookie:ownerCookie});
  assert.equal(extra.result.error,"Unauthorized");
  record("operator-boundary","Authenticated browser session is not an operator monitoring token");
  const deleteWorkspace=async(id,cookie,name)=>{
    const res=await call("/api/workspaces/"+id,{
      method:"DELETE",cookie,body:{confirmation:"DELETE "+name}});
    assert.equal(res.result.deleted,true);
  };
  await deleteWorkspace(ownerWorkspace,ownerCookie,"Evidence Owner");
  ownerWorkspace="";
  await deleteWorkspace(outsiderWorkspace,outsiderCookie,"Evidence Outsider");
  outsiderWorkspace="";
  record("cleanup","Both test workspaces deleted through owner-scoped API");
  status="PASS";failureCode="none";
}
try{await main();}
catch(error){
  failureCode="synthetic_acceptance_failed";
  console.error("Phase 14 synthetic acceptance FAILED:",
    error instanceof Error?error.message:"unknown error");
  process.exitCode=1;
}finally{
  // Do not emit trace content, auth headers, tenant IDs, customer labels or raw invoices.
  const report={
    schemaVersion:1,phase:14,status,
    scope:"synthetic_ephemeral_ci_only",generatedAt:stamp,
    releaseSha:(process.env.GITHUB_SHA??"").slice(0,40)||"local",
    checks,checkCount:checks.length,
    failures:status==="PASS"?[]:[failureCode],
    providerCalls:"MOCK_ONLY",customerDataProcessed:false,
    verifiedCustomerSavings:false,externalAcceptance:"NOT_EVALUATED",
    productionReady:false,
    blockers:[
      "hosted_railway_services_not_attested",
      "independent_security_and_dpa_not_attested",
      "managed_backup_restore_not_attested",
      "real_provider_quality_and_invoices_not_attested",
    ],
  };
  await mkdir(artifactDir,{recursive:true});
  const file=join(artifactDir,"phase14-synthetic-acceptance.json");
  await writeFile(file,JSON.stringify(report,null,2)+"\n",{mode:0o600});
  console.log("Phase 14 synthetic acceptance:",status,
    checks.length,"checks; sanitized evidence:",file);
}
