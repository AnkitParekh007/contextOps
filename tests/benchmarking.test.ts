import {describe,it,expect} from "vitest";
import {drawLabeledSample} from "../src/lib/pipeline/sampling";
import {wilson95,percentile,costPerSuccessfulTask,perLabelMetrics}
  from "../src/lib/pipeline/statistics";

const population=[
  ...Array.from({length:60},(_,i)=>({id:"a"+i,stratum:"technical"})),
  ...Array.from({length:30},(_,i)=>({id:"b"+i,stratum:"billing"})),
  ...Array.from({length:10},(_,i)=>({id:"c"+i,stratum:"refund"})),
];
describe("Phase 12 reproducible label-stratified sampling",()=>{
  it("reproduces the same sample regardless of input order",()=>{
    const plan={mode:"STRATIFIED" as const,seed:"pilot1",size:20};
    const a=drawLabeledSample(population,plan);
    const b=drawLabeledSample([...population].reverse(),plan);
    expect(a.metadata.fingerprint).toBe(b.metadata.fingerprint);
    expect(a.selected.map(x=>x.id)).toEqual(b.selected.map(x=>x.id));
    expect(a.metadata.strata.map(x=>x.selected)).toEqual([6,2,12]);
  });
  it("makes a seed change auditable",()=>{
    const base=drawLabeledSample(population,{mode:"STRATIFIED",seed:"pilot1",size:20});
    const alt=drawLabeledSample(population,{mode:"STRATIFIED",seed:"pilot2",size:20});
    expect(base.metadata.fingerprint).not.toBe(alt.metadata.fingerprint);
  });
  it("prefers rare-stratum inclusion when sample permits",()=>{
    const selected=drawLabeledSample(population,{mode:"STRATIFIED",seed:"pilot3",size:3});
    expect(selected.metadata.coveredStrata).toBe(3);
    expect(selected.selected).toHaveLength(3);
  });
  it("supports legacy earliest-compatible sampling but calls out its limitation",()=>{
    const result=drawLabeledSample(population,{mode:"CHRONOLOGICAL",seed:"pilot1",size:5});
    expect(result.selected.map(x=>x.id)).toEqual(population.slice(0,5).map(x=>x.id));
    expect(result.metadata.limitations).toContain("bias");
  });
  it("rejects missing or invalid seeds",()=>{
    expect(()=>drawLabeledSample(population,{mode:"STRATIFIED",seed:"../",size:10})).toThrow();
  });
});
describe("Phase 12 statistical diagnostics",()=>{
  it("computes Wilson interval with realistic uncertainty for small samples",()=>{
    const x=wilson95(30,30);
    expect(x.lower).toBeCloseTo(.88649,3);
    expect(x.upper).toBe(1);
    expect(wilson95(0,0)).toEqual({lower:0,upper:1});
  });
  it("reports latency percentiles and no finite success cost when all fail",()=>{
    expect(percentile([40,20,10,30],.95)).toBe(40);
    expect(percentile([],0.95)).toBeNull();
    expect(costPerSuccessfulTask(4,2)).toBe(2);
    expect(costPerSuccessfulTask(4,0)).toBeNull();
  });
  it("makes class-specific misses visible",()=>{
    const metrics=perLabelMetrics([
      {expected:"billing",actual:"billing",valid:true},
      {expected:"billing",actual:"refund",valid:false},
      {expected:"refund",actual:"refund",valid:true},
    ]);
    const billing=metrics.find(x=>x.label==="billing");
    expect(billing?.support).toBe(2);
    expect(billing?.recall).toBe(.5);
    expect(metrics.find(x=>x.label==="refund")?.precision).toBe(.5);
  });
});
