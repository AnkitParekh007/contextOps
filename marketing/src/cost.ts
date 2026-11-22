/**
 * Public calculator demonstration — mirrors the mathematical assumptions of
 * src/lib/pipeline/cost.ts without requiring private application dependencies.
 * Illustrative only: does not represent realized or verified savings.
 */
export type CostScenario = {
  monthlyVolume:number; averageInputTokens:number; averageOutputTokens:number;
  baselineInputPrice:number; baselineOutputPrice:number;
  candidateInputPrice:number; candidateOutputPrice:number;
  eligiblePercent:number; fallbackPercent:number; retryLimit:0|1;
  infrastructureMonthly:number; platformMonthly:number;
  baselineSuccessRate:number; optimizedSuccessRate:number;
};
export function calculateSavings(v:CostScenario){
  const perBaseline=(v.averageInputTokens*v.baselineInputPrice+v.averageOutputTokens*v.baselineOutputPrice)/1_000_000;
  const perCandidate=(v.averageInputTokens*v.candidateInputPrice+v.averageOutputTokens*v.candidateOutputPrice)/1_000_000;
  const eligibleRequests=v.monthlyVolume*v.eligiblePercent/100;
  const fallbackRequests=eligibleRequests*v.fallbackPercent/100;
  const premiumRequests=v.monthlyVolume-eligibleRequests+fallbackRequests;
  const baselineMonthlyCost=v.monthlyVolume*perBaseline;
  const optimizedModelMonthlyCost=(eligibleRequests+fallbackRequests*v.retryLimit)*perCandidate+premiumRequests*perBaseline;
  const overheadMonthlyCost=v.infrastructureMonthly+v.platformMonthly;
  const optimizedTotalMonthlyCost=optimizedModelMonthlyCost+overheadMonthlyCost;
  const netMonthlySavings=baselineMonthlyCost-optimizedTotalMonthlyCost;
  return {
    baselineMonthlyCost,optimizedTotalMonthlyCost,netMonthlySavings,
    fallbackRequests,annualizedNetSavings:12*netMonthlySavings,
    savingsPercent:baselineMonthlyCost>0?100*netMonthlySavings/baselineMonthlyCost:0,
  };
}
