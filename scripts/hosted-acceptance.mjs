#!/usr/bin/env node
/**
 * Read-only, operator-invoked acceptance. Never creates users, mutates data,
 * uploads traces, issues provider calls or prints private monitoring tokens.
 */
import assert from "node:assert/strict";

const base=process.env.PILOT_BASE_URL??process.env.APP_URL;
const registered=process.env.APP_URL;
const token=process.env.OPS_MONITOR_TOKEN;
const ciLocal=process.env.CI==="true"&&base==="http://localhost:3000"&&
  registered==="http://localhost:3000";
function validOrigin(raw){
  if(!raw)return false;
  try{
    const parsed=new URL(raw);
    return !parsed.username&&!parsed.password&&parsed.pathname==="/"&&
      !parsed.search&&!parsed.hash&&!raw.endsWith("/")&&
      (parsed.protocol==="https:"||ciLocal&&parsed.protocol==="http:");
  }catch{return false;}
}
if(!base||base!==registered||!validOrigin(base)){
  console.error("Refused: PILOT_BASE_URL must exactly match APP_URL and use HTTPS");
  process.exit(2);
}
if(!token||token.length<32||token.startsWith("REPLACE_")){
  console.error("Refused: configure a strong private OPS_MONITOR_TOKEN");
  process.exit(2);
}
const checked=[];
async function inspect(path,authorized=false){
  const response=await fetch(base+path,{
    method:"GET",redirect:"manual",
    headers:authorized?{Authorization:"Bearer "+token}:{},
    signal:AbortSignal.timeout(8000),
  });
  const type=response.headers.get("content-type")??"";
  assert.ok(type.includes("application/json"),"Expected JSON for "+path);
  const data=await response.json();
  assert.ok(response.headers.get("cache-control")?.includes("no-store")||
    path==="/api/health","Status responses must prohibit caches");
  assert.equal(response.headers.get("x-content-type-options"),"nosniff");
  return {status:response.status,data};
}
try{
  const health=await inspect("/api/health");
  assert.equal(health.status,200,"Database health is not ready");
  assert.equal(health.data.status,"ok");
  checked.push("database_health");
  const readiness=await inspect("/api/ready");
  assert.equal(readiness.status,200,"Redis/worker readiness failed");
  assert.equal(readiness.data.status,"ok");
  checked.push("aggregate_readiness");
  const unauthorized=await inspect("/api/ops/status");
  assert.equal(unauthorized.status,401,"Operator diagnostics are not private");
  checked.push("ops_requires_auth");
  const status=await inspect("/api/ops/status",true);
  assert.equal(status.status,200,"Operator diagnostics degraded or unavailable");
  assert.equal(status.data.status,"ok");
  assert.equal(status.data.ready,true);
  assert.equal(status.data.customerDataVerified,false);
  assert.ok(typeof status.data.queue.queued==="number");
  assert.ok(Array.isArray(status.data.issueCodes)&&status.data.issueCodes.length===0);
  const keys=JSON.stringify(status.data);
  for(const disallowed of ["organizationId","workspaceId","traceId","passwordHash","DATABASE_URL"]){
    assert.equal(keys.includes(disallowed),false,"Private data leaked in ops status");
  }
  checked.push("operator_queue_and_worker_status");
  console.log(JSON.stringify({
    result:"PASS",scope:ciLocal?"synthetic_ci":"hosted_read_only",
    origin:base,checks:checked,checkedAt:new Date().toISOString(),
    note:"Infrastructure-only acceptance; email, backups, security review and customer outcomes remain unverified",
  }));
}catch(error){
  console.error("Pilot acceptance failed:",error instanceof Error?error.message:"unknown error");
  process.exitCode=1;
}
