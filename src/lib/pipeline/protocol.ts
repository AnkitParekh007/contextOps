import {createHash} from "node:crypto";
import {z} from "zod";
import {drawLabeledSample,type SampleUnit} from "./sampling";

export const benchmarkProtocolSchema=z.object({
  name:z.string().trim().min(3).max(120),
  seed:z.string().regex(/^[A-Za-z0-9_-]{1,64}$/),
  windowStart:z.string().datetime(),
  windowEnd:z.string().datetime(),
  holdoutPercent:z.number().int().min(20).max(50).default(30),
  minimumStratumSupport:z.number().int().min(2).max(100).default(3),
  maxExternalSpendUsd:z.number().min(.01).max(25).default(1),
  dataProvenance:z.enum(["SYNTHETIC","AUTHORIZED_SANITIZED"]).default("SYNTHETIC"),
  authorizationReference:z.string().trim().max(120).optional(),
}).superRefine((data,ctx)=>{
  if(new Date(data.windowStart)>=new Date(data.windowEnd))
    ctx.addIssue({code:"custom",message:"Window start must precede end",path:["windowEnd"]});
  if(data.dataProvenance==="AUTHORIZED_SANITIZED"&&
    (!data.authorizationReference||data.authorizationReference.length<6))
    ctx.addIssue({code:"custom",message:"Written processing authorization reference is required",
      path:["authorizationReference"]});
});
export type BenchmarkProtocolConfig=z.infer<typeof benchmarkProtocolSchema>;
export type BenchmarkUnit=SampleUnit&{label:string;inputText:string;timestamp:Date;synthetic:boolean};

const sha=(value:string)=>createHash("sha256").update(value).digest("hex");
export function protocolPopulationFingerprint(rows:readonly BenchmarkUnit[]){
  return sha([...rows].sort((a,b)=>a.id.localeCompare(b.id)).map(row=>[
    row.id,row.stratum,sha(row.label),sha(row.inputText),
    row.timestamp.toISOString(),row.synthetic?"synthetic":"other",
  ].join("|")).join("\n"));
}
/** Partition happens before any provider call. Holdout never appears in calibration. */
export function splitBenchmarkHoldout<T extends SampleUnit>(rows:readonly T[],
    seed:string,percentage:number){
  if(!Number.isInteger(percentage)||percentage<20||percentage>50)
    throw Error("Holdout must be 20–50 percent");
  const groups=new Map<string,T[]>();
  for(const row of rows){
    const items=groups.get(row.stratum)??[];
    items.push(row);groups.set(row.stratum,items);
  }
  const holdout:T[]=[],calibration:T[]=[];
  for(const [group,items] of [...groups.entries()].sort(([a],[b])=>a.localeCompare(b))){
    const ranking=drawLabeledSample(items,{mode:"STRATIFIED",
      seed:seed+"-holdout",size:items.length}).selected;
    const count=items.length>=2?Math.min(items.length-1,
      Math.max(1,Math.round(items.length*percentage/100))):0;
    if(!group||!ranking.length)continue;
    holdout.push(...ranking.slice(0,count));
    calibration.push(...ranking.slice(count));
  }
  const holdoutIds=new Set(holdout.map(x=>x.id));
  if(calibration.some(x=>holdoutIds.has(x.id)))
    throw Error("Holdout leakage detected");
  return {holdout,calibration,
    holdoutFingerprint:sha(holdout.map(x=>x.id).sort().join("|")),
    calibrationFingerprint:sha(calibration.map(x=>x.id).sort().join("|"))};
}
export function validateFrozenPopulation(rows:readonly BenchmarkUnit[],config:BenchmarkProtocolConfig){
  if(rows.length<20)throw Error("Freeze requires at least 20 independently labeled eligible records");
  const groups=new Map<string,number>();
  for(const item of rows){
    if(!item.label.trim())throw Error("Ground-truth human label is missing");
    groups.set(item.stratum,(groups.get(item.stratum)??0)+1);
    if(config.dataProvenance==="SYNTHETIC"&&!item.synthetic)
      throw Error("Synthetic protocol cannot contain non-synthetic records");
  }
  if([...groups.values()].some(n=>n<config.minimumStratumSupport))
    throw Error("Each stratum needs the preregistered minimum number of labels");
  const split=splitBenchmarkHoldout(rows,config.seed,config.holdoutPercent);
  if(split.holdout.length<5||split.calibration.length<5)
    throw Error("Not enough independent calibration and holdout records");
  return {populationFingerprint:protocolPopulationFingerprint(rows),
    populationSize:rows.length,holdoutSize:split.holdout.length,split,
    strata:groups.size};
}
