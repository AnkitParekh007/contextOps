import { z } from "zod";
export const policySchema=z.object({
  name:z.string().trim().min(2).max(120).default("Quality-gated default policy"),
  evaluationRunId:z.string().min(4),
  minConfidence:z.number().min(0.5).max(1).default(0.9),
  minQuality:z.number().min(0.5).max(1).default(0.95),
  maxLatencyMs:z.number().int().min(1).max(120000).default(10000),
  maxFallbackRate:z.number().min(0).max(1).default(0.2),
  retryLimit:z.number().int().min(0).max(1).default(1),
  requireApprovalForSensitive:z.literal(true).default(true),
});
export function routeDecision(c:{category:string;confidence:number;risk:string;suitability:string}|undefined,
  policy:z.infer<typeof policySchema>,evaluationEligible:boolean):"CHEAP"|"PREMIUM"|"REVIEW"{
  if(!c)return "REVIEW";
  if(c.risk==="HIGH"||c.suitability==="BLOCKED")return "REVIEW";
  if(c.suitability!=="ELIGIBLE"||c.confidence<policy.minConfidence)return "PREMIUM";
  if(!["ROUTINE_CLASSIFICATION","STRUCTURED_EXTRACTION"].includes(c.category))return "PREMIUM";
  return evaluationEligible?"CHEAP":"PREMIUM";
}
