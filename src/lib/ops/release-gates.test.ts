import {describe,expect,it} from "vitest";
import {calculateReleaseReadiness,mandatorySyntheticChecks,requiredExternalGates} from "./release-gates";

const now=new Date("2026-11-23T00:00:00.000Z");
function synthetic(){
  return {
    schemaVersion:1,phase:14,status:"PASS",
    scope:"synthetic_ephemeral_ci_only",
    generatedAt:"2026-11-22T00:00:00.000Z",releaseSha:"local",
    checks:mandatorySyntheticChecks.map(name=>({name,status:"PASS",description:"Synthetic test passed"})),
    checkCount:10,failures:[],providerCalls:"MOCK_ONLY",
    customerDataProcessed:false,verifiedCustomerSavings:false,
    externalAcceptance:"NOT_EVALUATED",productionReady:false,
    blockers:["hosting","legal","security","billing"],
  };
}
function records(){
  return {version:1,evidence:requiredExternalGates.map(gate=>({
    gate:gate.id,outcome:"ATTESTED",evidenceUrl:"https://reviews.example.org/evidence",
    reviewedAt:"2026-11-22T00:00:00.000Z",reviewerReference:"operator-123",
  }))};
}
describe("Phase 16 fail-closed pilot evidence validation",()=>{
  it("keeps complete synthetic and operator records unapproved",()=>{
    const result=calculateReleaseReadiness(synthetic(),records(),now);
    expect(result.status).toBe("INDEPENDENT_REVIEW_REQUIRED");
    expect(result.productionApproved).toBe(false);
    expect(result.customerDataApproved).toBe(false);
    expect(result.verifiedSavings).toBe(false);
  });
  it("rejects duplicated checks masquerading as complete acceptance",()=>{
    const input=synthetic();input.checks[9]={...input.checks[0]};
    expect(calculateReleaseReadiness(input,records(),now).status).toBe("BLOCKED");
  });
  it("rejects unknown and credential-bearing manifest fields",()=>{
    const input={...synthetic(),AUTH_SECRET:"should never enter evidence"};
    expect(calculateReleaseReadiness(input,records(),now).status).toBe("BLOCKED");
  });
  it("rejects future manifests, missing failures contract and extra checks",()=>{
    const future={...synthetic(),generatedAt:"2026-11-24T00:00:00.000Z"};
    expect(calculateReleaseReadiness(future,records(),now).syntheticCiPassed).toBe(false);
    const {failures:ignored,...missingFailures}=synthetic();
    expect(calculateReleaseReadiness(missingFailures,records(),now).syntheticCiPassed).toBe(false);
    const extra=synthetic();extra.checks.push({...extra.checks[0]});extra.checkCount++;
    expect(calculateReleaseReadiness(extra,records(),now).syntheticCiPassed).toBe(false);
  });
  it("rejects invalid, stale and future-dated operator records",()=>{
    for(const time of ["2026-10-01T00:00:00.000Z","2026-11-24T00:00:00.000Z"]){
      const input=records();input.evidence[0].reviewedAt=time;
      expect(calculateReleaseReadiness(synthetic(),input,now).status).toBe("BLOCKED");
    }
  });
  it("lets a simultaneous rejection veto an attestation",()=>{
    const input=records();
    input.evidence.push({...input.evidence[0],outcome:"REJECTED"});
    const result=calculateReleaseReadiness(synthetic(),input,now);
    expect(result.status).toBe("BLOCKED");
    expect(result.gates[0].state).toBe("REJECTED");
  });
  it("never includes internal review URLs in the result",()=>{
    const result=calculateReleaseReadiness(synthetic(),records(),now);
    expect(JSON.stringify(result)).not.toContain("reviews.example.org");
    expect(JSON.stringify(result)).not.toContain("operator-123");
  });
});
