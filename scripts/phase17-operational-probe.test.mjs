import {describe,it,expect,vi} from "vitest";
import {runOperationalProbe,validateTarget} from "./phase17-operational-probe.mjs";

const token="synthetic-ci-only-monitor-token-32chars";
const origin="http://localhost:3000";
function fixture(overrides={}){
  const replies={
    "/api/health":{status:200,body:{status:"ok"}},
    "/api/ready":{status:200,body:{status:"ok"}},
    "/api/ops/status":{status:200,body:{status:"ok",ready:true,
      customerDataVerified:false,externalBenchmarksEnabled:false,
      queue:{queued:0},issueCodes:[]}},
    ...overrides,
  };
  return vi.fn(async(url,options)=>{
    const path=new URL(url).pathname;
    const auth=options.headers.Authorization;
    const result=path==="/api/ops/status"&&!auth?
      {status:401,body:{error:"Unauthorized"}}:replies[path];
    return {
      status:result.status,
      headers:new Headers({"content-type":"application/json",
        "x-content-type-options":"nosniff",
        "cache-control":"private, no-store"}),
      json:async()=>result.body,
    };
  });
}
const args=(fetcher)=>({origin,registered:origin,token,ci:true,
  fetcher,samples:3,sleep:async()=>{}});
describe("Phase 17 staging-only operational checks",()=>{
  it("returns sanitized evidence while keeping approvals false",async()=>{
    const fetched=fixture();
    const report=await runOperationalProbe(args(fetched));
    expect(report.status).toBe("PASS");
    expect(report.scope).toBe("synthetic_ci_only");
    expect(report.checks).toContain("repeat_readiness");
    expect(report.productionApproved).toBe(false);
    expect(report.customerDataApproved).toBe(false);
    expect(JSON.stringify(report)).not.toContain(token);
    expect(JSON.stringify(report)).not.toContain(origin);
    expect(fetched).toHaveBeenCalledTimes(6);
  });
  it("rejects unapproved targets, userinfo and remote HTTP",()=>{
    expect(()=>validateTarget("https://pilot.example.org","https://other.example.org"))
      .toThrow("TARGET_NOT_APPROVED");
    expect(()=>validateTarget("http://pilot.example.org","http://pilot.example.org"))
      .toThrow("TARGET_NOT_APPROVED");
    expect(()=>validateTarget("https://user:pass@pilot.example.org",
      "https://user:pass@pilot.example.org")).toThrow("TARGET_NOT_APPROVED");
    expect(()=>validateTarget(origin,origin,false)).toThrow("TARGET_NOT_APPROVED");
    expect(()=>validateTarget("https://pilot.example.org","https://pilot.example.org").scope)
      .toBe("private_hosted_read_only");
  });
  it("blocks an exposed operations endpoint",async()=>{
    const fetcher=fixture();
    const exposed=vi.fn(async(url,options)=>{
      const response=await fetcher(url,options);
      if(new URL(url).pathname==="/api/ops/status"&&!options.headers.Authorization)
        return {...response,status:200};
      return response;
    });
    await expect(runOperationalProbe(args(exposed))).rejects.toThrow("MONITOR_NOT_PRIVATE");
  });
  it("blocks external provider enablement",async()=>{
    const fetcher=fixture({"/api/ops/status":{status:200,body:{
      status:"ok",ready:true,customerDataVerified:false,
      externalBenchmarksEnabled:true,queue:{queued:0},issueCodes:[]}}});
    await expect(runOperationalProbe(args(fetcher))).rejects.toThrow(
      "OPERATOR_STATUS_NOT_HEALTHY");
  });
  it("blocks unstable repeated readiness",async()=>{
    const fetcher=fixture();let readyCount=0;
    const unstable=vi.fn(async(url,options)=>{
      const response=await fetcher(url,options);
      if(new URL(url).pathname==="/api/ready"&&++readyCount===2)
        return {...response,status:503,json:async()=>({status:"unavailable"})};
      return response;
    });
    await expect(runOperationalProbe(args(unstable))).rejects.toThrow("READINESS_UNSTABLE");
  });
  it("blocks sensitive monitor payloads and redirects",async()=>{
    const leaked=fixture({"/api/ops/status":{status:200,body:{
      status:"ok",workspaceId:"private-identifier"}}});
    await expect(runOperationalProbe(args(leaked))).rejects.toThrow("UNSAFE_MONITOR_PAYLOAD");
    const base=fixture();
    const redirected=vi.fn(async(url,opts)=>{
      const response=await base(url,opts);
      return new URL(url).pathname==="/api/health"?
        {...response,status:302}:response;
    });
    await expect(runOperationalProbe(args(redirected))).rejects.toThrow("UNEXPECTED_REDIRECT");
  });
});
