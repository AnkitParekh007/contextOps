import {describe,it,expect} from "vitest";
import {benchmarkProtocolSchema,protocolPopulationFingerprint,splitBenchmarkHoldout,validateFrozenPopulation} from "../src/lib/pipeline/protocol";
import {reserveExternalBudget,stressScenario} from "../src/lib/pipeline/budget";
import {compareRunQuality,reconcileAggregate} from "../src/lib/pipeline/benchmark-insights";

const plan=benchmarkProtocolSchema.parse({name:"Northwind holdout",seed:"pilot-v1",windowStart:"2026-10-01T00:00:00.000Z",windowEnd:"2026-11-01T00:00:00.000Z",dataProvenance:"SYNTHETIC"});
const cases=Array.from({length:90},(_,i)=>({id:"case-"+i,stratum:"group-"+Math.floor(i/30),label:"label-"+Math.floor(i/30),inputText:"Synthetic ticket "+i,timestamp:new Date("2026-10-01T00:00:00.000Z"),synthetic:true}));
describe("Frozen evaluation protocols",()=>{
 it("builds disjoint reproducible holdouts regardless of input order",()=>{
   const a=validateFrozenPopulation(cases,plan),b=validateFrozenPopulation([...cases].reverse(),plan);
   expect(a.populationFingerprint).toBe(b.populationFingerprint);
   expect(a.split.holdoutFingerprint).toBe(b.split.holdoutFingerprint);
   expect(a.split.holdout).toHaveLength(27);
   const held=new Set(a.split.holdout.map(x=>x.id));
   expect(a.split.calibration.every(x=>!held.has(x.id))).toBe(true);
 });
 it("detects label or input changes, and refuses insufficient/unverified cohorts",()=>{
   const base=protocolPopulationFingerprint(cases);
   expect(protocolPopulationFingerprint([...cases.slice(0,-1),{...cases[89],label:"changed"}])).not.toBe(base);
   expect(protocolPopulationFingerprint([...cases.slice(0,-1),{...cases[89],inputText:"modified"}])).not.toBe(base);
   expect(()=>validateFrozenPopulation(cases.slice(0,12),plan)).toThrow();
   expect(()=>validateFrozenPopulation([...cases.slice(0,-1),{...cases[89],synthetic:false}],plan)).toThrow();
   expect(()=>splitBenchmarkHoldout(cases,"seed",15)).toThrow();
   expect(()=>benchmarkProtocolSchema.parse({...plan,dataProvenance:"AUTHORIZED_SANITIZED",authorizationReference:""})).toThrow();
 });
});
describe("Budget, fault and invoice diagnostics",()=>{
 it("stops preflight when the pessimistic cap is exceeded",()=>{
   expect(()=>reserveExternalBudget({texts:Array(10).fill("a".repeat(1000)),labelVocabulary:["billing"],maxSpendUsd:.01,inputPricePerMillion:3,outputPricePerMillion:15})).toThrow();
   expect(()=>reserveExternalBudget({texts:Array(11).fill("x"),labelVocabulary:["billing"],maxSpendUsd:25,inputPricePerMillion:2,outputPricePerMillion:10})).toThrow();
 });
 it("bounds a small call without claiming to guarantee billed cost",()=>{
   const p=reserveExternalBudget({texts:["invoice"],labelVocabulary:["billing"],maxSpendUsd:1,inputPricePerMillion:1,outputPricePerMillion:5});
   expect(p.projectedMax).toBeGreaterThan(0);
   expect(p.caveat).toMatch(/not a monetary spending guarantee/i);
 });
 it("charges retries and premium fallback in offline stress math",()=>{
   const v={monthlyTasks:1000,eligibleFraction:.7,baselineUsdPerTask:.003,candidateUsdPerAttempt:.00015,errorFraction:.1,retryFraction:.5,fallbackUsdPerTask:.003,fixedMonthlyUsd:1};
   const s=stressScenario(v);
   expect(s.retries).toBe(35);
   expect(s.fallbacks).toBe(70);
   expect(s.modeledMonthlyUsd).toBeCloseTo((700+35)*.00015+370*.003+1);
   expect(s.customerSavingsVerified).toBe(false);
 });
 it("labels invoice aggregates unverified and flags exploratory quality decline",()=>{
   const r=reconcileAggregate({billedTotalUsd:20,overheadUsd:5,successfulTasks:50,billedTasks:100,modeledSampleCostUsd:.01,sampleSize:30});
   expect(r.observedCostPerSuccess).toBe(.5);
   expect(r.invoiceVerified).toBe(false);
   const prev={provider:"MOCK",model:"mock-efficient",quality:.95,fingerprint:"a",size:30};
   const delta=compareRunQuality({...prev,quality:.86,fingerprint:"b"},prev);
   expect(delta.flaggedForReview).toBe(true);
   expect(delta.explanation).toMatch(/not causality/i);
 });
});
