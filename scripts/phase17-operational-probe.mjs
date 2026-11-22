/**
 * Phase 17 read-only operational probe. This checks observable behavior only;
 * it cannot attest managed backups, incident response, email, or customer approval.
 */
export const probeNames=[
  "health","readiness","operator_auth_boundary","operator_status",
  "response_headers","repeat_readiness",
];

export function validateTarget(base, registered, ci=false){
  if(!base||base!==registered)throw new Error("TARGET_NOT_APPROVED");
  let url;
  try{url=new URL(base);}catch{throw new Error("TARGET_NOT_APPROVED");}
  const local=ci===true&&base==="http://localhost:3000";
  if(url.origin!==base||url.username||url.password||url.search||url.hash||
    (url.protocol!=="https:"&&!local)||
    (!local&&(url.hostname==="localhost"||url.hostname==="127.0.0.1")))
    throw new Error("TARGET_NOT_APPROVED");
  return {origin:base,scope:local?"synthetic_ci_only":"private_hosted_read_only"};
}

const sensitiveFields=["organizationId","workspaceId","traceId","passwordHash",
  "DATABASE_URL","AUTH_SECRET","OPS_MONITOR_TOKEN","sessionToken"];
function safeJson(value){
  const serialized=JSON.stringify(value);
  if(!serialized||sensitiveFields.some(field=>serialized.includes(field)))
    throw new Error("UNSAFE_MONITOR_PAYLOAD");
  return value;
}
async function inspect(fetcher,origin,path,token,timeoutMs){
  const controller=new AbortController();
  const timeout=setTimeout(()=>controller.abort(),timeoutMs);
  try{
    const response=await fetcher(origin+path,{
      method:"GET",redirect:"manual",cache:"no-store",signal:controller.signal,
      headers:token?{Authorization:"Bearer "+token}:{},
    });
    if(response.status>=300&&response.status<400)
      throw new Error("UNEXPECTED_REDIRECT");
    if(!response.headers.get("content-type")?.includes("application/json"))
      throw new Error("UNEXPECTED_CONTENT_TYPE");
    if(response.headers.get("x-content-type-options")!=="nosniff")
      throw new Error("MISSING_SECURITY_HEADER");
    if(!response.headers.get("cache-control")?.includes("no-store"))
      throw new Error("MISSING_NO_STORE");
    const body=safeJson(await response.json());
    return {status:response.status,body};
  }finally{clearTimeout(timeout);}
}

/** Result contains ONLY coarse checks; never include origin or bearer tokens. */
export async function runOperationalProbe({
  origin,registered,token,ci=false,fetcher=fetch,
  samples=3,timeoutMs=8000,sleep=async()=>{},
}){
  const target=validateTarget(origin,registered,ci);
  if(!token||token.length<32||token.startsWith("REPLACE_"))
    throw new Error("INVALID_OPERATOR_TOKEN");
  if(!Number.isInteger(samples)||samples<2||samples>10)
    throw new Error("INVALID_SAMPLE_COUNT");
  const checks=[];
  const health=await inspect(fetcher,target.origin,"/api/health",null,timeoutMs);
  if(health.status!==200||health.body.status!=="ok")
    throw new Error("HEALTH_NOT_READY");
  checks.push("health");
  const ready=await inspect(fetcher,target.origin,"/api/ready",null,timeoutMs);
  if(ready.status!==200||ready.body.status!=="ok")
    throw new Error("WORKER_OR_QUEUE_NOT_READY");
  checks.push("readiness");
  const denied=await inspect(fetcher,target.origin,"/api/ops/status",null,timeoutMs);
  if(denied.status!==401)throw new Error("MONITOR_NOT_PRIVATE");
  checks.push("operator_auth_boundary");
  const monitor=await inspect(fetcher,target.origin,"/api/ops/status",token,timeoutMs);
  if(monitor.status!==200||monitor.body.status!=="ok"||
    monitor.body.ready!==true||monitor.body.customerDataVerified!==false||
    !monitor.body.queue||typeof monitor.body.queue.queued!=="number"||
    !Array.isArray(monitor.body.issueCodes)||monitor.body.issueCodes.length)
    throw new Error("OPERATOR_STATUS_NOT_HEALTHY");
  checks.push("operator_status","response_headers");
  for(let sample=1;sample<samples;sample++){
    await sleep();
    const response=await inspect(fetcher,target.origin,"/api/ready",null,timeoutMs);
    if(response.status!==200||response.body.status!=="ok")
      throw new Error("READINESS_UNSTABLE");
  }
  checks.push("repeat_readiness");
  return {
    schemaVersion:1,phase:17,status:"PASS",scope:target.scope,
    checks,samples,productionApproved:false,customerDataApproved:false,
    backupsVerified:false,emailVerified:false,alertsVerified:false,
    independentSecurityVerified:false,verifiedSavings:false,
  };
}
