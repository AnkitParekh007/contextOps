import {describe,it,expect} from "vitest";
import {calculateReleaseReadiness,requiredExternalGates,mandatorySyntheticChecks}
  from "../src/lib/ops/release-gates";

const validSynthetic={
  schemaVersion:1,phase:14,status:"PASS",scope:"synthetic_ephemeral_ci_only",
  generatedAt:"2026-11-22T23:00:00.000Z",releaseSha:"local",
  providerCalls:"MOCK_ONLY",customerDataProcessed:false,
  verifiedCustomerSavings:false,externalAcceptance:"NOT_EVALUATED",
  productionReady:false,checkCount:mandatorySyntheticChecks.length,
  failures:[],blockers:["No hosted service","No data authorization","No billing approval","No human release signoff"],
  checks:mandatorySyntheticChecks.map(name=>({name,status:"PASS",description:`Synthetic ${name} contract passed`})),
};
const now=new Date("2026-11-23T00:00:00.000Z");
describe("Phase 15 release evidence must fail closed",()=>{
  it("keeps a passing synthetic CI run blocked without operator evidence",()=>{
    const result=calculateReleaseReadiness(validSynthetic,{version:1,evidence:[]},now);
    expect(result.syntheticCiPassed).toBe(true);
    expect(result.status).toBe("BLOCKED");
    expect(result.missingGates).toHaveLength(requiredExternalGates.length);
    expect(result.productionApproved).toBe(false);
    expect(result.customerDataApproved).toBe(false);
  });
  it("rejects missing or failed synthetic checks",()=>{
    expect(calculateReleaseReadiness({...validSynthetic,status:"FAIL"},
      {version:1,evidence:[]},now).syntheticCiPassed).toBe(false);
    expect(calculateReleaseReadiness({...validSynthetic,checks:[]},
      {version:1,evidence:[]},now).syntheticCiPassed).toBe(false);
    expect(calculateReleaseReadiness({...validSynthetic,providerCalls:"OPENAI"},
      {version:1,evidence:[]},now).syntheticCiPassed).toBe(false);
  });
  it("requires operator records and treats them as unverified even when complete",()=>{
    const evidence=requiredExternalGates.map(({id})=>({
      gate:id,outcome:"ATTESTED",
      evidenceUrl:"https://github.com/example/evidence",
      reviewedAt:"2026-11-22T00:00:00.000Z",reviewerReference:"security-reviewer",
    }));
    const result=calculateReleaseReadiness(validSynthetic,{version:1,evidence},now);
    expect(result.status).toBe("INDEPENDENT_REVIEW_REQUIRED");
    expect(result.operatorRecordsComplete).toBe(true);
    expect(result.productionApproved).toBe(false);
    expect(result.verifiedSavings).toBe(false);
  });
  it("does not accept stale, future, malformed or query-bearing links",()=>{
    const base={gate:"hosted_https",outcome:"ATTESTED",
      evidenceUrl:"https://github.com/example/evidence",
      reviewedAt:"2026-10-01T00:00:00.000Z",
      reviewerReference:"reviewer-01"};
    let result=calculateReleaseReadiness(validSynthetic,
      {version:1,evidence:[base]},now);
    expect(result.gates[0].state).toBe("MISSING");
    result=calculateReleaseReadiness(validSynthetic,
      {version:1,evidence:[{...base,reviewedAt:"2026-11-24T00:00:00.000Z"}]},now);
    expect(result.gates[0].state).toBe("MISSING");
    result=calculateReleaseReadiness(validSynthetic,
      {version:1,evidence:[{...base,evidenceUrl:"https://evidence.example/?token=secret"}]},now);
    expect(result.operatorEvidenceParsed).toBe(false);
  });
  it("cannot turn a rejected operator review into approval",()=>{
    const result=calculateReleaseReadiness(validSynthetic,{version:1,evidence:[{
      gate:"privacy_authorization",outcome:"REJECTED",
      evidenceUrl:"https://github.com/example/private-review",
      reviewedAt:"2026-11-22T00:00:00.000Z",
      reviewerReference:"legal-review",
    }]},now);
    expect(result.status).toBe("BLOCKED");
    expect(result.missingGates).toContain("privacy_authorization");
  });
});
