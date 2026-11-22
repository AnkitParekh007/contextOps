import {createHash,timingSafeEqual} from "node:crypto";

/** Helpers used by private operator telemetry; never include tenant names or traces. */
export type PilotCounts={queued:number;retry:number;processing:number;failed24h:number;
  staleProcessing:number;oldestPendingAgeSeconds:number|null};
export type PilotHealthInput={
  postgres:boolean;redis:boolean;workerStamp:string|null;
  now:number;counts:PilotCounts;queueWarnSeconds:number;
};
export function monitorCredentialValid(configured:string|undefined,supplied:string|null){
  if(!configured||configured.length<32||configured.startsWith("REPLACE_")||
    !supplied?.startsWith("Bearer "))return false;
  const token=supplied.slice(7);
  if(token.length<32||token.length>512)return false;
  const a=createHash("sha256").update(configured).digest();
  const b=createHash("sha256").update(token).digest();
  return timingSafeEqual(a,b);
}
export function summarizePilotHealth(input:PilotHealthInput){
  const age=input.workerStamp!==null?input.now-Number(input.workerStamp):Infinity;
  const workerOk=Number.isFinite(age)&&age>=0&&age<30000;
  const ready=input.postgres&&input.redis&&workerOk;
  const issues:string[]=[];
  if(!input.postgres)issues.push("database_unavailable");
  if(!input.redis)issues.push("redis_unavailable");
  if(!workerOk)issues.push("worker_heartbeat_stale");
  if(input.counts.staleProcessing>0)issues.push("import_processing_stalled");
  if(input.counts.failed24h>0)issues.push("recent_import_failures");
  if(input.counts.oldestPendingAgeSeconds!==null&&
    input.counts.oldestPendingAgeSeconds>input.queueWarnSeconds)issues.push("oldest_pending_import_exceeds_threshold");
  return {status:!ready?"unavailable":issues.length?"degraded":"ok",
    ready,workerHeartbeatAgeSeconds:workerOk?Math.floor(age/1000):null,
    issueCodes:issues,queue:input.counts};
}
