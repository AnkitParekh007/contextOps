import "server-only";
import { z } from "zod";
import { db } from "@/lib/db";
import { infer, type ProviderKey } from "./providers";

export const evaluationRequestSchema=z.object({
  provider:z.enum(["MOCK","ANTHROPIC","OPENAI"]),
  model:z.string().trim().min(2).max(120),
  consentExternal:z.boolean().default(false),
  maximumSamples:z.number().int().min(5).max(50).default(30),
  minimumQuality:z.number().min(0.5).max(1).default(0.95),
  candidateInputPrice:z.number().min(0).max(100000),
  candidateOutputPrice:z.number().min(0).max(100000),
  baselineInputPrice:z.number().min(0).max(100000),
  baselineOutputPrice:z.number().min(0).max(100000),
});
type MetricExample={expected:string;actual:string;valid:boolean};
export function compareOutput(expected:string,actual:string,category:string){
  if(category==="STRUCTURED_EXTRACTION"){
    try{
      const a=JSON.parse(expected),b=JSON.parse(actual);
      if(!a||typeof a!=="object"||!b||typeof b!=="object")return false;
      return Object.entries(a).every(([key,value])=>JSON.stringify(b[key])===JSON.stringify(value));
    }catch{return false;}
  }
  // Never auto-score natural-language generation/retrieval as a factual pass.
  if(!["ROUTINE_CLASSIFICATION","STRUCTURED_EXTRACTION"].includes(category))return false;
  return expected.trim().toLowerCase()===actual.trim().toLowerCase();
}
export function macroF1(examples:MetricExample[]):number{
  const labels=new Set(examples.flatMap(x=>[x.expected,x.actual]));
  if(!examples.length||!labels.size)return 0;
  let sum=0;
  for(const label of labels){
    const tp=examples.filter(x=>x.expected===label&&x.actual===label).length;
    const fp=examples.filter(x=>x.expected!==label&&x.actual===label).length;
    const fn=examples.filter(x=>x.expected===label&&x.actual!==label).length;
    const precision=tp+fp?tp/(tp+fp):0,recall=tp+fn?tp/(tp+fn):0;
    sum+=precision+recall?2*precision*recall/(precision+recall):0;
  }
  return sum/labels.size;
}
export async function evaluate(workspace:{id:string;organizationId:string;modelName:string},actorId:string,
  params:z.infer<typeof evaluationRequestSchema>){
  if(params.provider!=="MOCK"&&!params.consentExternal)throw Error("Consent required for external provider calls");
  const labels=await db.taskClassification.findMany({where:{workspaceId:workspace.id,organizationId:workspace.organizationId,
    suitability:"ELIGIBLE",category:{in:["ROUTINE_CLASSIFICATION","STRUCTURED_EXTRACTION"]}},
    take:params.maximumSamples,orderBy:{createdAt:"asc"}});
  if(labels.length<5)throw Error("Need at least 5 labeled, eligible traces. Run analysis first.");
  const candidates=await db.executionTrace.findMany({where:{id:{in:labels.map(l=>l.traceId)},workspaceId:workspace.id}});
  const byId=new Map(candidates.map(t=>[t.id,t]));
  const allowed=labels.map(l=>({classification:l,trace:byId.get(l.traceId)!})).filter(x=>x.trace);
  const labelSet=[...new Set(allowed.map(x=>x.trace.humanLabel??x.trace.expectedOutput??""))];
  const run=await db.evaluationRun.create({data:{
    workspaceId:workspace.id,organizationId:workspace.organizationId,status:"RUNNING",
    provider:params.provider,model:params.model,baselineModel:workspace.modelName,sampleSize:allowed.length,
  }});
  const scored:MetricExample[]=[];let totalCost=0,totalLatency=0,errors=0,baselineCorrect=0;
  const results=[];
  for(const {classification,trace} of allowed){
    const expected=trace.humanLabel??trace.expectedOutput??"";
    const baseline=compareOutput(expected,trace.outputText??"",classification.category);
    if(baseline)baselineCorrect++;
    try{
      // Redacted, labeled sample only. Never reveal expected label to the candidate model.
      const prediction=await infer({provider:params.provider as ProviderKey,model:params.model,
        text:trace.inputText??"",taskType:trace.taskType,labelSet},params.consentExternal);
      const valid=compareOutput(expected,prediction.text,classification.category);
      const cost=(prediction.inputTokens*params.candidateInputPrice+prediction.outputTokens*params.candidateOutputPrice)/1000000;
      totalCost+=cost;totalLatency+=prediction.latencyMs;
      scored.push({expected,actual:prediction.text,valid});
      results.push({workspaceId:workspace.id,organizationId:workspace.organizationId,runId:run.id,traceId:trace.id,
        expectedOutput:expected,actualOutput:prediction.text.slice(0,40000),valid,qualityScore:valid?1:0,
        latencyMs:prediction.latencyMs,inputTokens:prediction.inputTokens,outputTokens:prediction.outputTokens,cost});
    }catch(error){
      errors++;
      const message=error instanceof Error?error.message:"Provider unavailable";
      scored.push({expected,actual:"[ERROR]",valid:false});
      results.push({workspaceId:workspace.id,organizationId:workspace.organizationId,runId:run.id,traceId:trace.id,
        expectedOutput:expected,actualOutput:null,valid:false,qualityScore:0,latencyMs:0,inputTokens:0,
        outputTokens:0,cost:0,error:message.slice(0,300)});
    }
  }
  await db.evaluationResult.createMany({data:results});
  const quality=scored.filter(s=>s.valid).length/allowed.length,errorRate=errors/allowed.length;
  const avgLatency=totalLatency/allowed.length;
  const baselineCost=allowed.reduce((sum,{trace})=>sum+
    (trace.inputTokens*params.baselineInputPrice+trace.outputTokens*params.baselineOutputPrice)/1000000,0);
  const details={
    labelCount:allowed.length,baselineAccuracy:baselineCorrect/allowed.length,candidateMacroF1:macroF1(scored),
    minimumQuality:params.minimumQuality,baselineCost,candidateCost:totalCost,
    candidateInputPrice:params.candidateInputPrice,candidateOutputPrice:params.candidateOutputPrice,
    baselineInputPrice:params.baselineInputPrice,baselineOutputPrice:params.baselineOutputPrice,
    fallbackRate:1-quality,manualReviewRequired:false,provider:params.provider,
    canRecommend:quality>=params.minimumQuality&&errorRate<=0.05&&avgLatency<=10000&&totalCost<baselineCost&&baselineCost>0,
    source:"labeled_test_set",externalConsent:params.consentExternal,
  };
  await db.evaluationRun.update({where:{id:run.id},data:{
    status:"COMPLETED",completedAt:new Date(),qualityScore:quality,errorRate,
    averageLatencyMs:avgLatency,estimatedCost:totalCost,details,
  }});
  await db.auditLog.create({data:{organizationId:workspace.organizationId,actorId,
    subjectType:"EvaluationRun",subjectId:run.id,action:"EVALUATION_COMPLETED",
    metadata:{provider:params.provider,model:params.model,samples:allowed.length,externalConsent:params.consentExternal}}});
  return {id:run.id,qualityScore:quality,errorRate,averageLatencyMs:avgLatency,estimatedCost:totalCost,details};
}
