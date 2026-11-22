import "server-only";
import { z } from "zod";
import { db } from "@/lib/db";
import { infer, type ProviderKey } from "./providers";
import { macroF1, compareOutput, type MetricExample } from "./scoring";

export const evaluationRequestSchema=z.object({
  provider:z.enum(["MOCK","ANTHROPIC","OPENAI"]),
  model:z.string().trim().min(2).max(120),
  consentExternal:z.boolean().default(false),
  maximumSamples:z.number().int().min(5).max(50).default(30),
  minimumQuality:z.number().min(0.5).max(1).default(0.95),
  maxQualityDrop:z.number().min(0).max(0.2).default(0.05),
  candidateInputPrice:z.number().min(0).max(100000),
  candidateOutputPrice:z.number().min(0).max(100000),
  baselineInputPrice:z.number().min(0).max(100000),
  baselineOutputPrice:z.number().min(0).max(100000),
});
export async function evaluate(workspace:{id:string;organizationId:string;modelName:string},actorId:string,
  params:z.infer<typeof evaluationRequestSchema>){
  if(params.provider!=="MOCK"&&!params.consentExternal)throw Error("Consent required for external provider calls");
  const thresholds=await db.qualityThreshold.findMany({where:{
    organizationId:workspace.organizationId,workspaceId:workspace.id,
  }});
  const enforcedQuality=Math.max(params.minimumQuality,
    ...thresholds.map(t=>t.minimumQuality));
  const cappedSamples=params.provider==="MOCK"?params.maximumSamples:Math.min(params.maximumSamples,10);
  const labels=await db.taskClassification.findMany({where:{workspaceId:workspace.id,organizationId:workspace.organizationId,
    suitability:"ELIGIBLE",category:{in:["ROUTINE_CLASSIFICATION","STRUCTURED_EXTRACTION"]}},
    take:cappedSamples,orderBy:{createdAt:"asc"}});
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
  const invalid=results.filter(r=>!r.valid);
  if(invalid.length){
    const reviewed=new Set((await db.humanReview.findMany({where:{
      organizationId:workspace.organizationId,workspaceId:workspace.id,
      traceId:{in:invalid.map(r=>r.traceId)},status:"PENDING"},
      select:{traceId:true}})).map(item=>item.traceId));
    await db.humanReview.createMany({data:invalid.filter(r=>!reviewed.has(r.traceId)).map(r=>({
      organizationId:workspace.organizationId,workspaceId:workspace.id,traceId:r.traceId,
      reason:"Candidate model output failed evaluation against labeled expected result",
    }))});
  }
  const quality=scored.filter(s=>s.valid).length/allowed.length,errorRate=errors/allowed.length;
  const avgLatency=totalLatency/allowed.length;
  const baselineAccuracy=baselineCorrect/allowed.length;
  const baselineCost=allowed.reduce((sum,{trace})=>sum+
    (trace.inputTokens*params.baselineInputPrice+trace.outputTokens*params.baselineOutputPrice)/1000000,0);
  const details={
    labelCount:allowed.length,baselineAccuracy,candidateMacroF1:macroF1(scored),
    minimumQuality:enforcedQuality,maxQualityDrop:params.maxQualityDrop,baselineCost,candidateCost:totalCost,
    candidateInputPrice:params.candidateInputPrice,candidateOutputPrice:params.candidateOutputPrice,
    baselineInputPrice:params.baselineInputPrice,baselineOutputPrice:params.baselineOutputPrice,
    fallbackRate:1-quality,manualReviewRequired:invalid.length>0,provider:params.provider,
    canRecommend:quality>=enforcedQuality&&quality>=baselineAccuracy-params.maxQualityDrop&&errorRate<=0.05&&avgLatency<=10000&&totalCost<baselineCost&&baselineCost>0,
    source:"labeled_test_set",externalConsent:params.consentExternal,
  };
  await db.evaluationDataset.create({data:{organizationId:workspace.organizationId,workspaceId:workspace.id,
    name:"Labeled pilot benchmark",taskType:"ROUTINE_CLASSIFICATION_OR_EXTRACTION",
    provenance:"customer_supplied_or_synthetic_labels",count:allowed.length}});
  await db.costSnapshot.createMany({data:[
    {organizationId:workspace.organizationId,workspaceId:workspace.id,provider:"BASELINE",
      model:workspace.modelName,priceInputPerMillion:params.baselineInputPrice,
      priceOutputPerMillion:params.baselineOutputPrice},
    {organizationId:workspace.organizationId,workspaceId:workspace.id,provider:params.provider,
      model:params.model,priceInputPerMillion:params.candidateInputPrice,
      priceOutputPerMillion:params.candidateOutputPrice},
  ]});
  await db.evaluationRun.update({where:{id:run.id},data:{
    status:"COMPLETED",completedAt:new Date(),qualityScore:quality,errorRate,
    averageLatencyMs:avgLatency,estimatedCost:totalCost,details,
  }});
  await db.auditLog.create({data:{organizationId:workspace.organizationId,actorId,
    subjectType:"EvaluationRun",subjectId:run.id,action:"EVALUATION_COMPLETED",
    metadata:{provider:params.provider,model:params.model,samples:allowed.length,externalConsent:params.consentExternal}}});
  return {id:run.id,qualityScore:quality,errorRate,averageLatencyMs:avgLatency,estimatedCost:totalCost,details};
}
