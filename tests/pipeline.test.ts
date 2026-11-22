import { describe,expect,it } from "vitest";
import {redactText,sanitizeValue} from "../src/lib/pipeline/redaction";
import {parseRows,cleanRows} from "../src/lib/pipeline/parse";
import {classify} from "../src/lib/pipeline/classify";
import {calculateSavings} from "../src/lib/pipeline/cost";
import {macroF1,compareOutput} from "../src/lib/pipeline/scoring";
import {routeDecision} from "../src/lib/pipeline/routing";
describe("PII and secret handling",()=>{
  it("redacts common PII and API keys",()=>{
    const s=redactText("Contact alice@example.com with sk-abcdefghijklmnopqrstuv");
    expect(s).not.toContain("alice@example.com");expect(s).not.toContain("sk-abcdefgh");
  });
  it("removes nested credential fields",()=>{
    expect(sanitizeValue({token:"secret",nested:{password:"123"}})).toEqual({
      token:"[REDACTED_SECRET_FIELD]",nested:{password:"[REDACTED_SECRET_FIELD]"}});
  });
});
describe("trace parsing",()=>{
  it("handles CSV quoted commas and line breaks",()=>{
    const r=parseRows('task_type,input_text,model_name\n"support_ticket_classification","Hello,\nworld",premium\n',"a.csv");
    expect(r).toHaveLength(1);const clean=cleanRows(r);
    expect(clean.issues).toHaveLength(0);expect(clean.rows[0].inputText).toBe("Hello,\nworld");
  });
  it("does not leak unsafe external trace identifiers and generates stable IDs",()=>{
    const first=cleanRows([{task_type:"support",external_trace_id:"patient@example.com",input_text:"Hello"}]);
    expect(first.rows[0].externalTraceId).not.toContain("patient@example.com");
    const a=cleanRows([{task_type:"support",input_text:"missing id"}]);
    const b=cleanRows([{task_type:"support",input_text:"missing id"}]);
    expect(a.rows[0].externalTraceId).toBe(b.rows[0].externalTraceId);
  });
  it("reports invalid records without storing raw content",()=>{
    const r=cleanRows([{task_type:"triage",input_tokens:-5,input_text:"alice@example.com"}]);
    expect(r.rows).toHaveLength(0);expect(r.issues[0]).not.toContain("alice@example.com");
  });
});
describe("quality-gated routing",()=>{
  const t={taskType:"support ticket classification",inputText:"Invoice 123",humanLabel:"billing question",expectedOutput:null,status:"success",metadata:{}};
  it("allows routine labeled samples but blocks regulated and uncertain work",()=>{
    expect(classify(t).suitability).toBe("ELIGIBLE");
    expect(classify({...t,inputText:"Please change my password"}).suitability).toBe("BLOCKED");
    expect(classify({...t,humanLabel:null}).suitability).toBe("REVIEW");
  });
  it("requires passing evaluation before cheaper routing",()=>{
    const policy={name:"Safe",evaluationRunId:"run1",minConfidence:.9,minQuality:.95,maxLatencyMs:10000,maxFallbackRate:.2,circuitBreakerErrorRate:.05,maxCostPerTaskUsd:10000,retryLimit:1,requireApprovalForSensitive:true as const};
    const c=classify(t);
    expect(routeDecision(c,policy,false)).toBe("PREMIUM");
    expect(routeDecision(c,policy,true)).toBe("CHEAP");
    expect(routeDecision(classify({...t,inputText:"password"}),policy,true)).toBe("REVIEW");
  });
});
describe("savings math",()=>{
  const input={monthlyVolume:1000,averageInputTokens:1000,averageOutputTokens:100,
    baselineInputPrice:2,baselineOutputPrice:10,candidateInputPrice:.1,candidateOutputPrice:.5,
    eligiblePercent:70,fallbackPercent:10,infrastructureMonthly:1,platformMonthly:0,baselineSuccessRate:1,
    optimizedSuccessRate:.95};
  it("charges both model calls on fallback and includes overhead",()=>{
    const s=calculateSavings(input);
    expect(s.fallbackRequests).toBe(70);
    expect(s.optimizedTotalMonthlyCost).toBeCloseTo(700*.00015+370*.003+1,6);
    expect(s.baselineMonthlyCost).toBeCloseTo(3,6);
    expect(s.optimizedCostPerSuccessfulTask).toBeCloseTo(s.optimizedTotalMonthlyCost/950,6);
  });
});
describe("task scoring",()=>{
  it("scores label classification and structured extraction",()=>{
    expect(compareOutput("refund request","REFUND REQUEST","ROUTINE_CLASSIFICATION")).toBe(true);
    expect(compareOutput('{"amount":123}','{"amount":123,"currency":"USD"}',"STRUCTURED_EXTRACTION")).toBe(true);
    expect(compareOutput("any","any","ROUTINE_GENERATION")).toBe(false);
    expect(macroF1([{expected:"a",actual:"a",valid:true},{expected:"b",actual:"a",valid:false}])).toBeCloseTo(1/3);
  });
});
