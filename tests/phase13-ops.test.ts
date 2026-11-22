import {describe,it,expect} from "vitest";
import {monitorCredentialValid,summarizePilotHealth} from "../src/lib/ops/health";

const token="ci_only_ops_monitor_secret_at_least_32_bytes_012345";
const healthy={postgres:true,redis:true,workerStamp:"100000",
  now:105000,queueWarnSeconds:300,
  counts:{queued:0,retry:0,processing:0,failed24h:0,
    staleProcessing:0,oldestPendingAgeSeconds:null}};
describe("Phase 13 operator monitoring",()=>{
  it("does not accept absent, short or incorrect bearer credentials",()=>{
    expect(monitorCredentialValid(undefined,"Bearer "+token)).toBe(false);
    expect(monitorCredentialValid("REPLACE_WITH_SECRET","Bearer "+token)).toBe(false);
    expect(monitorCredentialValid(token,null)).toBe(false);
    expect(monitorCredentialValid(token,token)).toBe(false);
    expect(monitorCredentialValid(token,"Bearer "+token+"bad")).toBe(false);
    expect(monitorCredentialValid(token,"Bearer "+token)).toBe(true);
  });
  it("is healthy only with live database, Redis and worker heartbeat",()=>{
    const status=summarizePilotHealth(healthy);
    expect(status.status).toBe("ok");
    expect(status.ready).toBe(true);
    expect(status.issueCodes).toEqual([]);
    expect(summarizePilotHealth({...healthy,workerStamp:"1000"}).status)
      .toBe("unavailable");
    expect(summarizePilotHealth({...healthy,redis:false}).issueCodes)
      .toContain("redis_unavailable");
  });
  it("marks backlog, stalled imports and recent failures degraded",()=>{
    const checks=summarizePilotHealth({...healthy,counts:{
      ...healthy.counts,queued:2,staleProcessing:1,failed24h:1,
      oldestPendingAgeSeconds:301}});
    expect(checks.status).toBe("degraded");
    expect(checks.issueCodes).toEqual(expect.arrayContaining([
      "import_processing_stalled","recent_import_failures",
      "oldest_pending_import_exceeds_threshold"]));
    expect(checks.ready).toBe(true);
  });
  it("does not treat future worker clocks or missing heartbeats as healthy",()=>{
    expect(summarizePilotHealth({...healthy,workerStamp:"999999"}).ready).toBe(false);
    expect(summarizePilotHealth({...healthy,workerStamp:null}).ready).toBe(false);
  });
});
