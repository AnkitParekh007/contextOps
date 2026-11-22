/**
 * Synthetic end-to-end pilot workflow against a running Next.js API, Postgres, Redis and worker.
 * This test never sends data to third-party AI providers.
 */
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
const base=process.env.APP_URL??"http://localhost:3000";
const nonce=randomUUID().slice(0,10);
let cookie="";
async function req(path,{method="GET",body,multipart=false}={}){
  const res=await fetch(base+path,{
    method,
    headers:{
      Origin:base,
      ...(cookie?{Cookie:cookie}:{}),
      ...(!multipart&&body!==undefined?{"Content-Type":"application/json"}:{}),
    },
    body:multipart?body:body===undefined?undefined:JSON.stringify(body),
  });
  const json=await res.json().catch(()=>null);
  if(res.headers.get("set-cookie"))cookie=res.headers.get("set-cookie").split(";")[0];
  if(!res.ok)throw Error(method+" "+path+" HTTP "+res.status+" "+JSON.stringify(json));
  return json;
}
const user=await req("/api/auth/register",{method:"POST",body:{
  name:"Pilot Tester",email:"pilot-"+nonce+"@example.test",password:"Safe_Pilot_Password123",
}});
assert.ok(user.user.id);
const org=await req("/api/organizations",{method:"POST",body:{
  companyName:"Synthetic Pilot "+nonce,
  workspace:{name:"Support Triage",useCase:"SUPPORT_CLASSIFICATION",provider:"OTHER",modelName:"mock-premium"},
}});
const workspaceId=org.organization.workspace.id,api="/api/workspaces/"+workspaceId;
let form=new FormData();
form.set("authorized","true");form.set("retentionAcknowledged","true");
const email="private-"+nonce+"@example.com";
form.set("file",new File([
  "external_trace_id,timestamp,task_type,input_text,model_provider,model_name,input_tokens,output_tokens,latency_ms,status,output_text,expected_output,human_label\n"+
  "csv-1,2026-11-22T00:00:00.000Z,support_ticket_classification,Please contact "+email+" about invoice 10011,MOCK,mock-premium,180,8,200,success,billing question,billing question,billing question\n",
],"traces.csv",{type:"text/csv"}));
const preview=await req(api+"/preview",{method:"POST",body:form,multipart:true});
assert.equal(preview.valid,1);
assert.ok(Array.isArray(preview.columns));
assert.ok(!JSON.stringify(preview).includes(email),"Raw email appeared in preview");
const queued=await req(api+"/imports",{method:"POST",body:form,multipart:true});
assert.equal(queued.status,"QUEUED");
let done=null;
for(let i=0;i<50;i++){
  await new Promise(r=>setTimeout(r,150));
  const state=await req("/api/imports/"+queued.jobId);
  if(state.job.status==="COMPLETED"){done=state.job;break;}
  if(state.job.status==="FAILED")throw Error("Import worker failed "+JSON.stringify(state.job));
}
assert.ok(done,"Import did not complete");
const traces=await req(api+"/traces");
assert.equal(traces.total,1);
assert.ok(!JSON.stringify(traces).includes(email),"Raw email leaked from trace store");
const demo=await req(api+"/demo",{method:"POST"});
assert.equal(demo.inserted,500);
const analyzed=await req(api+"/analysis",{method:"POST"});
assert.equal(analyzed.analyzed,501);
assert.ok(analyzed.eligible>0);
const evalRes=await req(api+"/evaluations",{method:"POST",body:{
  provider:"MOCK",model:"mock-efficient",maximumSamples:30,minimumQuality:.9,
  baselineInputPrice:2,baselineOutputPrice:10,candidateInputPrice:.1,candidateOutputPrice:.5,
}});
assert.ok(evalRes.run.qualityScore>=.9,JSON.stringify(evalRes));
assert.equal(evalRes.run.details.canRecommend,true);
const policy=await req(api+"/policies",{method:"POST",body:{
  name:"Pilot safe policy",evaluationRunId:evalRes.run.id,
  minConfidence:.9,minQuality:.9,maxLatencyMs:10000,maxFallbackRate:.2,
  retryLimit:1,requireApprovalForSensitive:true,
}});
assert.equal(policy.policy.status,"APPROVED_FOR_SIMULATION");
const shadow=await req(api+"/shadow",{method:"POST",body:{policyId:policy.policy.id}});
assert.equal(shadow.run.total,501);
assert.ok(shadow.run.routed>0);
const report=await req(api+"/reports",{method:"POST",body:{monthlyVolume:100000}});
assert.equal(report.report.verifiedMonthlySavings,null);
const download=await fetch(base+"/api/reports/"+report.report.id+"/download",{
  headers:{Cookie:cookie},redirect:"manual",
});
assert.equal(download.status,200);
const markdown=await download.text();
assert.ok(markdown.includes("SIMULATION ONLY"));
const actions=await req(api+"/audit");
assert.ok(actions.events.length>0);
const wrongOrg=await req("/api/organizations",{method:"POST",body:{
  companyName:"Other Org "+nonce,workspace:{name:"Other",useCase:"OTHER",provider:"OTHER",modelName:"mock-premium"},
}});
assert.ok(wrongOrg.organization.id!==org.organization.id);
const deleted=await req("/api/workspaces/"+workspaceId,{method:"DELETE",
  body:{confirmation:"DELETE Support Triage"}});
assert.equal(deleted.deleted,true);
const orgList=await req("/api/organizations");
const original=orgList.organizations.find(o=>o.id===org.organization.id);
assert.equal(original.workspaces.length,0,"Deleted workspace still listed");
console.log("Full pilot smoke PASS: redacted preview/import, demo, classification, model benchmark, approved policy, shadow, report, audit, tenant deletion");
