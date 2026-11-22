import {createHash} from "node:crypto";

/**
 * Deterministic audit-friendly selection of labeled cases.
 * Stratification aims to cover rare label groups, not to manufacture representativeness.
 */
export type SamplingMode="STRATIFIED"|"CHRONOLOGICAL";
export type SampleUnit={id:string;stratum:string};
export type SamplingPlan={mode:SamplingMode;seed:string;size:number};
const hash=(input:string)=>createHash("sha256").update(input).digest("hex");
const byHash=(seed:string)=>(a:SampleUnit,b:SampleUnit)=>{
  const x=hash(seed+":"+a.id),y=hash(seed+":"+b.id);
  return x.localeCompare(y)||a.id.localeCompare(b.id);
};
export function drawLabeledSample<T extends SampleUnit>(input:readonly T[],plan:SamplingPlan){
  if(!Number.isInteger(plan.size)||plan.size<1||plan.size>10000)
    throw Error("Sample count must be 1–10,000");
  if(!/^[a-zA-Z0-9_-]{1,64}$/.test(plan.seed))
    throw Error("Sampling seed must be 1–64 alphanumeric, dash or underscore characters");
  if(!["STRATIFIED","CHRONOLOGICAL"].includes(plan.mode))
    throw Error("Unsupported sampling mode");
  const unique=new Map<string,T>();
  for(const item of input)if(item.id&&item.stratum&&!unique.has(item.id))unique.set(item.id,item);
  const population=[...unique.values()];
  const n=Math.min(plan.size,population.length);
  const groups=new Map<string,T[]>();
  for(const record of population){
    const group=groups.get(record.stratum)??[];
    group.push(record);groups.set(record.stratum,group);
  }
  const entries=[...groups.entries()].sort(([a],[b])=>a.localeCompare(b));
  let selected:T[];
  if(plan.mode==="CHRONOLOGICAL"){
    selected=population.slice(0,n);
  }else{
    const ideal=entries.map(([,g])=>g.length*n/Math.max(1,population.length));
    const minOne=n>=entries.length?1:0;
    const counts=entries.map(([,g],i)=>Math.min(g.length,Math.max(minOne,Math.floor(ideal[i]))));
    let total=counts.reduce((a,b)=>a+b,0);
    while(total>n){
      const choices=counts.map((count,i)=>({i,excess:count-ideal[i],count}))
        .filter(({count})=>count>minOne)
        .sort((a,b)=>b.excess-a.excess||entries[a.i][0].localeCompare(entries[b.i][0]));
      if(!choices.length)throw Error("Invalid stratified quota");
      counts[choices[0].i]--;total--;
    }
    while(total<n){
      const choices=counts.map((count,i)=>({i,need:ideal[i]-count,count}))
        .filter(({i,count})=>count<entries[i][1].length)
        .sort((a,b)=>b.need-a.need||entries[a.i][0].localeCompare(entries[b.i][0]));
      if(!choices.length)break;
      counts[choices[0].i]++;total++;
    }
    selected=entries.flatMap(([,items],i)=>
      [...items].sort(byHash(plan.seed)).slice(0,counts[i]));
    selected.sort(byHash(plan.seed+"-order"));
  }
  const strata=entries.map(([key,items])=>({
    label:key,population:items.length,
    selected:selected.filter(item=>item.stratum===key).length,
  }));
  const fingerprint=hash(selected.map(item=>item.id+"|"+item.stratum).sort().join("\n"));
  return {selected,metadata:{
    mode:plan.mode,seed:plan.seed,population:population.length,
    requested:plan.size,selectedCount:selected.length,
    strata,coveredStrata:strata.filter(x=>x.selected>0).length,
    totalStrata:strata.length,fingerprint,
    limitations:plan.mode==="CHRONOLOGICAL"
      ?"Earliest eligible records can bias results. This is a legacy compatibility mode."
      :"Deterministic proportional stratification covers labels but cannot alone establish a statistically representative production workload.",
  }};
}
