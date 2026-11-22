import { z } from "zod";
export const costInputSchema=z.object({
  monthlyVolume:z.number().int().min(1).max(100000000),
  averageInputTokens:z.number().min(0).max(10000000),
  averageOutputTokens:z.number().min(0).max(10000000),
  baselineInputPrice:z.number().min(0).max(100000),
  baselineOutputPrice:z.number().min(0).max(100000),
  candidateInputPrice:z.number().min(0).max(100000),
  candidateOutputPrice:z.number().min(0).max(100000),
  eligiblePercent:z.number().min(0).max(100),
  fallbackPercent:z.number().min(0).max(100),
  retryLimit:z.number().int().min(0).max(1).default(0),
  infrastructureMonthly:z.number().min(0).max(10000000).default(0),
  platformMonthly:z.number().min(0).max(10000000).default(0),
  baselineSuccessRate:z.number().min(0.001).max(1).default(1),
  optimizedSuccessRate:z.number().min(0.001).max(1).default(1),
});
export type CostInput=z.infer<typeof costInputSchema>;
export function calculateSavings(input:CostInput){
  const v=costInputSchema.parse(input);
  const perBase=(v.averageInputTokens*v.baselineInputPrice+v.averageOutputTokens*v.baselineOutputPrice)/1000000;
  const perCheap=(v.averageInputTokens*v.candidateInputPrice+v.averageOutputTokens*v.candidateOutputPrice)/1000000;
  const volume=v.monthlyVolume,eligible=volume*v.eligiblePercent/100, fallback=eligible*v.fallbackPercent/100;
  // When a candidate fails, both the candidate attempt and premium fallback are billed.
  const current=volume*perBase;
  const candidateRequests=eligible;
  const premiumRequests=volume-eligible+fallback;
  const optimizedModel=(candidateRequests+fallback*v.retryLimit)*perCheap+premiumRequests*perBase;
  const overhead=v.infrastructureMonthly+v.platformMonthly;
  const optimizedTotal=optimizedModel+overhead;
  const net=current-optimizedTotal;
  const marginalSavedPerTask=(perBase-perCheap)-(v.fallbackPercent/100*(perBase+v.retryLimit*perCheap));
  const breakEvenTasks=marginalSavedPerTask>0&&v.eligiblePercent>0?
    Math.ceil(overhead/(v.eligiblePercent/100*marginalSavedPerTask)):null;
  return {
    baselineMonthlyCost:current,optimizedModelMonthlyCost:optimizedModel,optimizedTotalMonthlyCost:optimizedTotal,
    grossModelSavings:current-optimizedModel,overheadMonthlyCost:overhead,netMonthlySavings:net,
    savingsPercent:current>0?net/current*100:0,annualizedNetSavings:net*12,
    baselineCostPerSuccessfulTask:current/(volume*v.baselineSuccessRate),
    optimizedCostPerSuccessfulTask:optimizedTotal/(volume*v.optimizedSuccessRate),
    candidateRequests:candidateRequests+fallback*v.retryLimit,premiumRequests,fallbackRequests:fallback,breakEvenMonthlyVolume:breakEvenTasks,
    note:"Scenario only; savings are estimated, not realized or verified.",
  };
}
