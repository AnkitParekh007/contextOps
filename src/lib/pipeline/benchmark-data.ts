import "server-only";
import {createHash} from "node:crypto";
import {db} from "@/lib/db";
import type {BenchmarkProtocolConfig,BenchmarkUnit} from "./protocol";

export async function loadBenchmarkPool(workspaceId:string,organizationId:string,
  config:BenchmarkProtocolConfig){
  const labels=await db.taskClassification.findMany({where:{
    workspaceId,organizationId,suitability:"ELIGIBLE",
    category:"ROUTINE_CLASSIFICATION",
  },take:10000,orderBy:{createdAt:"asc"}});
  const traces=await db.executionTrace.findMany({where:{
    id:{in:labels.map(row=>row.traceId)},workspaceId,organizationId,
    timestamp:{gte:new Date(config.windowStart),lte:new Date(config.windowEnd)},
    humanLabel:{not:null},
  }});
  const byId=new Map(traces.map(t=>[t.id,t]));
  const data=labels.flatMap(classification=>{
    const trace=byId.get(classification.traceId);
    if(!trace?.humanLabel?.trim()||!trace.inputText?.trim())return [];
    const label=trace.humanLabel.trim();
    const synthetic=Boolean(trace.metadata&&typeof trace.metadata==="object"&&
      !Array.isArray(trace.metadata)&&"synthetic" in trace.metadata&&
      trace.metadata.synthetic===true);
    const stratum="routine:"+createHash("sha256").update(label.toLowerCase()).digest("hex").slice(0,16);
    return [{id:trace.id,stratum,label,inputText:trace.inputText,
      timestamp:trace.timestamp,synthetic,classification,trace}];
  });
  return data satisfies (BenchmarkUnit&{classification:(typeof labels)[number];
    trace:(typeof traces)[number]})[];
}
