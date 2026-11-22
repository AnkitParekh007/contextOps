import {z} from "zod";
/** Upper-bound reservation is deliberately conservative, not a provider invoice guarantee. */
export const benchmarkBudgetSchema=z.object({
  maxSpendUsd:z.number().min(.01).max(25),
  inputPricePerMillion:z.number().gt(0).max(100000),
  outputPricePerMillion:z.number().gt(0).max(100000),
  maximumCalls:z.number().int().min(1).max(10),
});
export function reserveExternalBudget(input:{
  texts:string[];labelVocabulary:string[];maxSpendUsd:number;
  inputPricePerMillion:number;outputPricePerMillion:number;
}){
  benchmarkBudgetSchema.parse({...input,maximumCalls:input.texts.length});
  if(input.labelVocabulary.some(s=>s.length>70)||input.labelVocabulary.length>30)
    throw Error("Unsafe or overlong label vocabulary");
  const instructionBytes=Buffer.byteLength(input.labelVocabulary.join(", "),"utf8");
  let projectedMax=0;
  const reserved=input.texts.map(text=>{
    if(!text||Buffer.byteLength(text,"utf8")>16000)
      throw Error("External benchmark inputs must be present and under 16 KB");
    // Four tokens per UTF-8 byte plus 2,048 prompt-envelope reserve is
    // intentionally pessimistic, but providers still control final billing.
    const reservedInputTokens=(Buffer.byteLength(text,"utf8")+instructionBytes)*4+2048;
    const reservedOutputTokens=128;
    const amount=(reservedInputTokens*input.inputPricePerMillion+
      reservedOutputTokens*input.outputPricePerMillion)/1e6;
    projectedMax+=amount;
    return {reservedInputTokens,reservedOutputTokens,amount};
  });
  if(projectedMax>input.maxSpendUsd+1e-12)
    throw Error("Estimated worst-case provider spend exceeds pre-registered budget");
  return {reserved,projectedMax,remainingEstimatedUsd:input.maxSpendUsd-projectedMax,
    caveat:"Pessimistic token envelope only; provider fees and failure charges require invoice reconciliation. Not a monetary spending guarantee."};
}
/** Offline-only fault experiment; no provider requests or routing changes. */
export function stressScenario(input:{
  monthlyTasks:number;eligibleFraction:number;
  baselineUsdPerTask:number;candidateUsdPerAttempt:number;
  errorFraction:number;retryFraction:number;fallbackUsdPerTask:number;
  fixedMonthlyUsd:number;
}){
  const all=Object.values(input);
  if(all.some(n=>!Number.isFinite(n)||n<0))throw Error("Invalid stress scenario");
  if(input.monthlyTasks<=0||!Number.isInteger(input.monthlyTasks))throw Error("Invalid task volume");
  if([input.eligibleFraction,input.errorFraction,input.retryFraction].some(n=>n>1))
    throw Error("Scenario fractions must be 0–1");
  const candidateTasks=input.monthlyTasks*input.eligibleFraction;
  const errors=candidateTasks*input.errorFraction;
  const retries=errors*input.retryFraction;
  const fallback=errors;
  const premiumTasks=input.monthlyTasks-candidateTasks+fallback;
  const baseline=input.monthlyTasks*input.baselineUsdPerTask;
  const modeled=(candidateTasks+retries)*input.candidateUsdPerAttempt+
    premiumTasks*input.fallbackUsdPerTask+input.fixedMonthlyUsd;
  return {baselineMonthlyUsd:baseline,modeledMonthlyUsd:modeled,
    modeledDifferenceUsd:baseline-modeled,retries,fallbacks:fallback,
    savingsEvidence:"SCENARIO_ONLY",customerSavingsVerified:false};
}
