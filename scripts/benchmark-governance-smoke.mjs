#!/usr/bin/env node
/** Phase 13 synthetic-only benchmark governance acceptance; never uses paid providers. */
import assert from "node:assert/strict";
import {randomUUID,createHash} from "node:crypto";
import {readFile} from "node:fs/promises";

const origin=process.env.APP_URL;
if(process.env.CI!=="true"||origin!=="http://localhost:3000"||
   process.env.ENABLE_EXTERNAL_BENCHMARKS==="true")
  throw Error("Run only in isolated CI with provider benchmarks disabled");
const nonce=randomUUID().slice(0,10);
const email="phase13-"+nonce+"@example.test";
let session="";
async function request(path,method="GET",body){
  const response=await fetch(origin+path,{
    method,headers:{Origin:origin,...(session?{Cookie:session}:{}),
      ...(body?{"Content-Type":"application/json"}:{})},
    body:body?JSON.stringify(body):undefined,
  });
  const data=await response.json().catch(()=>null);
  if(response.headers.get("set-cookie"))
    session=response.headers.get("set-cookie").split(";")[0];
  return {status:response.status,data};
}
async function must(path,method,body){
  const response=await request(path,method,body);
  assert.ok(response.status>=200&&response.status<300,
    path+": "+response.status+" "+JSON.stringify(response.data));
  return response.data;
}
const started=await must("/api/auth/register","POST",{
  name:"Benchmark Fixture",email,password:"Synthetic_Pilot_Password123",
  inviteCode:process.env.PILOT_INVITE_CODE,
});
assert.equal(started.verificationRequired,true);
const file="/tmp/contextops-ci-mail/"+createHash("sha256").update(email).digest("hex")+".json";
const message=JSON.parse(await readFile(file,"utf8"));
const token=new URL(message.url).searchParams.get("token");
await must("/api/auth/verify-email","POST",{token});
await must("/api/auth/login","POST",{email,password:"Synthetic_Pilot_Password123"});
const organization=await must("/api/organizations","POST",{
  companyName:"Benchmark CI "+nonce,workspace:{
    name:"Classification Triage",useCase:"SUPPORT_CLASSIFICATION",
    provider:"OTHER",modelName:"mock-premium",
  },
});
const id=organization.organization.workspace.id;
const endpoint="/api/workspaces/"+id;
const seeded=await must(endpoint+"/demo","POST");
assert.equal(seeded.inserted,500);
const classified=await must(endpoint+"/analysis","POST");
assert.equal(classified.analyzed,500);
const protocol=await must(endpoint+"/benchmarking","POST",{
  mode:"create",config:{
    name:"Frozen synthetic validation",seed:"phase13-fixture",
    windowStart:"2026-10-01T00:00:00.000Z",
    windowEnd:"2026-10-02T00:00:00.000Z",
    dataProvenance:"SYNTHETIC",holdoutPercent:30,
    minimumStratumSupport:3,
  },
});
assert.equal(protocol.protocol.status,"DRAFT");
const invalid=await request(endpoint+"/benchmarking","POST",{
  mode:"freeze",protocolId:protocol.protocol.id,confirmation:"not approved",
});
assert.equal(invalid.status,422);
const frozen=await must(endpoint+"/benchmarking","POST",{
  mode:"freeze",protocolId:protocol.protocol.id,
  confirmation:"FREEZE Frozen synthetic validation",
});
assert.equal(frozen.protocol.populationSize,500);
assert.ok(frozen.protocol.holdoutSize>=100);
const input={protocolId:protocol.protocol.id,provider:"MOCK",
  model:"mock-efficient",maximumSamples:30,minimumQuality:.85,
  candidateInputPrice:.1,candidateOutputPrice:.5,
  baselineInputPrice:2,baselineOutputPrice:10};
const run=await must(endpoint+"/evaluations","POST",input);
assert.equal(run.run.details.preregistered,true);
assert.equal(run.run.details.benchmarkProtocolId,protocol.protocol.id);
assert.match(run.run.details.holdoutFingerprint,/^[a-f0-9]{64}$/);
const reused=await request(endpoint+"/evaluations","POST",input);
assert.ok(reused.status>=400);
const external=await request(endpoint+"/evaluations","POST",{
  ...input,provider:"OPENAI",model:"unapproved-model",
  consentExternal:true,maximumSamples:10,
});
assert.ok(external.status>=400);
const scenario=await must(endpoint+"/benchmarking","POST",{
  mode:"stress",scenario:{
    monthlyTasks:1000,eligibleFraction:.7,baselineUsdPerTask:.003,
    candidateUsdPerAttempt:.00015,errorFraction:.1,retryFraction:.5,
    fallbackUsdPerTask:.003,fixedMonthlyUsd:1,
  },
});
assert.equal(scenario.scenario.customerSavingsVerified,false);
const invoice=await must(endpoint+"/benchmarking","POST",{
  mode:"reconcile",runId:run.run.id,
  invoiceReference:"ci-"+nonce+"-aggregate",
  periodStart:"2026-10-01T00:00:00.000Z",
  periodEnd:"2026-11-01T00:00:00.000Z",
  billedTotalUsd:20,overheadUsd:5,billableTasks:500,
  successfulTasks:450,acknowledgeSelfReported:true,
});
assert.equal(invoice.invoiceVerified,false);
assert.equal(invoice.evidenceLevel,"SELF_REPORTED_UNVERIFIED");
const list=await must(endpoint+"/benchmarking","GET");
assert.ok(list.reconciliations.some(x=>x.id===invoice.id));
await must(endpoint,"DELETE",{confirmation:"DELETE Classification Triage"});
console.log("Phase 13 governance acceptance PASS: frozen holdout, retry denial, external refusal, offline stress, self-reported billing");
