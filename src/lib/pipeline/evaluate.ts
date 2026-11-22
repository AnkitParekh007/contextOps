import "server-only";
import { z } from "zod";
import { db } from "@/lib/db";
import { infer, type ProviderKey } from "./providers";
import { macroF1, compareOutput, type MetricExample } from "./scoring";
import {drawLabeledSample} from "./sampling";
import {wilson95,percentile,costPerSuccessfulTask,perLabelMetrics} from "./statistics";
import {createHash} from "node:crypto";
import {benchmarkProtocolSchema,validateFrozenPopulation} from "./protocol";
import {loadBenchmarkPool} from "./benchmark-data";
import {reserveExternalBudget} from "./budget";
import {reserveOperatorExternalBudget} from "./operator-budget";
import {compareRunQuality} from "./benchmark-insights";

export const evaluationRequestSchema=z.object({
  provider:z.enum(["MOCK","ANTHROPIC","OPENAI"]),
  model:z.string().trim().min(2).max(120),
  consentExternal:z.boolean().default(false),
  maximumSamples:z.number().int().min(5).max(50).default(30),
  samplingMode:z.enum(["STRATIFIED","CHRONOLOGICAL"]).default("STRATIFIED"),
  samplingSeed:z.string().trim().regex(/^[A-Za-z0-9_-]{1,64}$/).default("pilot-v1"),
  protocolId:z.string().min(4).optional(),
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
  const protocol=params.protocolId?await db.benchmarkProtocol.findFirst({where:{
    id:params.protocolId,workspaceId:workspace.id,
    organizationId:workspace.organizationId,status:"FROZEN",frozenAt:{not:null},
  }}):null;
  if(params.protocolId&&!protocol)throw Error("Frozen tenant-scoped protocol required");
  if(params.provider!=="MOCK"&&!protocol)
    throw Error("External providers require a preregistered frozen protocol");
  let allowedPool;
  let mode=params.samplingMode,seed=params.samplingSeed;
  let holdoutFingerprint:null|string=null;
  let budget:null|ReturnType<typeof reserveExternalBudget>=null;
  let protocolConfig:null|ReturnType<typeof benchmarkProtocolSchema.parse>=null;
  if(protocol){
    protocolConfig=benchmarkProtocolSchema.parse(protocol.config);
    const population=await loadBenchmarkPool(workspace.id,workspace.organizationId,protocolConfig);
    const frozen=validateFrozenPopulation(population,protocolConfig);
    if(frozen.populationFingerprint!==protocol.populationFingerprint||
      frozen.populationSize!==protocol.populationSize||
      frozen.holdoutSize!==protocol.holdoutSize)
      throw Error("Frozen benchmark cohort changed: create and freeze a new protocol");
    allowedPool=frozen.split.holdout.map(item=>({
      id:item.id,stratum:item.stratum,classification:item.classification,trace:item.trace,
    }));
    holdoutFingerprint=frozen.split.holdoutFingerprint;
    mode="STRATIFIED";seed=protocolConfig.seed;
    if(await db.evaluationRun.findFirst({where:{
      benchmarkProtocolId:protocol.id,provider:params.provider,model:params.model,
    },select:{id:true}}))
      throw Error("This model has already used the frozen holdout; create a new protocol");
  }else{
    const labels=await db.taskClassification.findMany({where:{workspaceId:workspace.id,organizationId:workspace.organizationId,
      suitability:"ELIGIBLE",category:{in:["ROUTINE_CLASSIFICATION","STRUCTURED_EXTRACTION"]}},
      take:10000,orderBy:{createdAt:"asc"}});
    if(labels.length<5)throw Error("Need at least 5 eligible traces. Run analysis first.");
    const candidates=await db.executionTrace.findMany({where:{
      id:{in:labels.map(l=>l.traceId)},workspaceId:workspace.id,
      organizationId:workspace.organizationId,
    }});
    const byId=new Map(candidates.map(trace=>[trace.id,trace]));
    const available=labels.map(classification=>({
      classification,trace:byId.get(classification.traceId),
    })).filter((item):item is {classification:(typeof labels)[number];
      trace:(typeof candidates)[number]}=>Boolean(item.trace&&
        (item.trace.humanLabel??item.trace.expectedOutput)&&item.trace.inputText));
    allowedPool=available.map(item=>{
      const label=item.trace.humanLabel??item.trace.expectedOutput??"";
      const value=item.classification.category==="ROUTINE_CLASSIFICATION"?
        createHash("sha256").update(label.trim().toLowerCase()).digest("hex").slice(0,12):
        "structured";
      return {id:item.trace.id,stratum:item.classification.category+":"+value,...item};
    });
  }
  const selection=drawLabeledSample(allowedPool,{
    mode,seed,size:cappedSamples,
  });
  const allowed=selection.selected;
  if(allowed.length<5)throw Error("Not enough labeled records in the held-out test set");
  const labelSet=[...new Set(allowed.map(x=>x.trace.humanLabel??x.trace.expectedOutput??""))];
  if(params.provider!=="MOCK"){
    if(process.env.ENABLE_EXTERNAL_BENCHMARKS!=="true")
      throw Error("External benchmark execution disabled by operator");
    if(!protocolConfig||protocolConfig.dataProvenance!=="AUTHORIZED_SANITIZED"||
      !protocolConfig.authorizationReference)
      throw Error("External benchmark requires documented authorized sanitized provenance");
    if(allowed.some(item=>item.classification.category!=="ROUTINE_CLASSIFICATION"))
      throw Error("External structured extraction requires separate schema/rubric approval");
    if(labelSet.some(label=>!/^[A-Za-z][A-Za-z0-9 /_-]{1,50}$/.test(label)))
      throw Error("External benchmark contains unapproved label vocabulary");
    budget=reserveExternalBudget({
      texts:allowed.map(item=>item.trace.inputText??""),
      labelVocabulary:labelSet,maxSpendUsd:protocolConfig.maxExternalSpendUsd,
      inputPricePerMillion:params.candidateInputPrice,
      outputPricePerMillion:params.candidateOutputPrice,
    });
    await reserveOperatorExternalBudget({
      organizationId:workspace.organizationId,workspaceId:workspace.id,
      estimatedMaximumUsd:budget.projectedMax,
    });
  }
  const run=await db.evaluationRun.create({data:{
    workspaceId:workspace.id,organizationId:workspace.organizationId,status:"RUNNING",
    benchmarkProtocolId:protocol?.id,
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
  const correct=scored.filter(s=>s.valid).length;
  const quality=correct/allowed.length,errorRate=errors/allowed.length;
  const successfulLatencies=results.filter(row=>!row.error).map(row=>row.latencyMs);
  const avgLatency=successfulLatencies.length?totalLatency/successfulLatencies.length:null;
  const confidence=wilson95(correct,allowed.length);
  const baselineAccuracy=baselineCorrect/allowed.length;
  const baselineCost=allowed.reduce((sum,{trace})=>sum+
    (trace.inputTokens*params.baselineInputPrice+trace.outputTokens*params.baselineOutputPrice)/1000000,0);
  const rawGate=quality>=enforcedQuality&&
    quality>=baselineAccuracy-params.maxQualityDrop&&
    errorRate<=.05&&avgLatency!==null&&avgLatency<=10000&&
    totalCost<baselineCost&&baselineCost>0;
  const externalStatisticalGate=allowed.length>=30&&confidence.lower>=enforcedQuality&&
    selection.metadata.coveredStrata===selection.metadata.totalStrata;
  // External pilot comparisons remain limited to 10 calls, so they cannot
  // pass a 30+ sample confidence gate and cannot authorize a routing policy.
  const canRecommend=rawGate&&(params.provider==="MOCK"||externalStatisticalGate)&&
    (!protocolConfig||perLabelMetrics(scored).every(row=>
      row.recall>=protocolConfig!.minimumClassRecall));
  const syntheticOnly=allowed.every(({trace})=>trace.metadata!==null&&
    typeof trace.metadata==="object"&&!Array.isArray(trace.metadata)&&
    "synthetic" in trace.metadata&&trace.metadata.synthetic===true);
  const routineScores=scored.filter((_,index)=>
    allowed[index].classification.category==="ROUTINE_CLASSIFICATION");
  const labelScores=perLabelMetrics(routineScores).map(row=>({
    ...row,label:"group-"+createHash("sha256").update(row.label).digest("hex").slice(0,10),
  }));
  const previous=await db.evaluationRun.findFirst({where:{
    workspaceId:workspace.id,organizationId:workspace.organizationId,
    provider:params.provider,model:params.model,status:"COMPLETED",
  },orderBy:{createdAt:"desc"}});
  const previousDetails=previous?.details as Record<string,unknown>|null;
  const priorSampling=previousDetails?.sampling as Record<string,unknown>|undefined;
  const drift=previous?.qualityScore!==null&&previous?.qualityScore!==undefined?
    compareRunQuality({
      quality,provider:params.provider,model:params.model,
      fingerprint:selection.metadata.fingerprint,size:allowed.length,
    },{
      quality:previous.qualityScore,provider:previous.provider,model:previous.model,
      fingerprint:String(priorSampling?.fingerprint??""),size:previous.sampleSize,
    }):null;
  const details={
    labelCount:allowed.length,baselineAccuracy,candidateMacroF1:macroF1(scored),
    candidateAccuracyLower95:confidence.lower,candidateAccuracyUpper95:confidence.upper,
    candidateCostPerSuccess:costPerSuccessfulTask(totalCost,correct),
    baselineCostPerSuccess:costPerSuccessfulTask(baselineCost,baselineCorrect),
    candidateMedianLatencyMs:percentile(successfulLatencies,.5),
    candidateP95LatencyMs:percentile(successfulLatencies,.95),
    providerErrorCount:errors,perLabelMetrics:labelScores,
    perLabelScope:"routine_classification_only",
    structuredExtractionCount:allowed.filter(item=>
      item.classification.category==="STRUCTURED_EXTRACTION").length,
    sampling:selection.metadata,provenance:syntheticOnly?"synthetic_seed":"unverified_or_mixed",
    benchmarkProtocolId:protocol?.id??null,
    holdoutFingerprint,preregistered:Boolean(protocol),
    externalEstimatedBudgetReservationUsd:budget?.projectedMax??null,
    externalMaxSpendUsd:protocolConfig?.maxExternalSpendUsd??null,
    billingGuarantee:false,driftDiagnostic:drift,
    statisticalValidation:params.provider!=="MOCK"&&externalStatisticalGate,
    statisticalCaution:"Wilson score assumes independent Bernoulli outcomes. Deterministic stratification and small samples are diagnostic, not proof of representative production quality.",
    minimumQuality:enforcedQuality,maxQualityDrop:params.maxQualityDrop,baselineCost,candidateCost:totalCost,
    candidateInputPrice:params.candidateInputPrice,candidateOutputPrice:params.candidateOutputPrice,
    baselineInputPrice:params.baselineInputPrice,baselineOutputPrice:params.baselineOutputPrice,
    fallbackRate:1-quality,manualReviewRequired:invalid.length>0,provider:params.provider,
    canRecommend,rawQualityGate:rawGate,
    labelRecallGate:protocolConfig?.minimumClassRecall??null,
    source:"labeled_test_set",externalConsent:params.consentExternal,
  };
  await db.evaluationDataset.create({data:{organizationId:workspace.organizationId,workspaceId:workspace.id,
    name:"Labeled pilot benchmark",taskType:"ROUTINE_CLASSIFICATION_OR_EXTRACTION",
    provenance:syntheticOnly?"synthetic_seed":"unverified_or_mixed",count:allowed.length}});
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
    metadata:{provider:params.provider,model:params.model,samples:allowed.length,externalConsent:params.consentExternal,
      samplingMode:mode,samplingFingerprint:selection.metadata.fingerprint,
      benchmarkProtocolId:protocol?.id??null,holdoutFingerprint}}});
  return {id:run.id,qualityScore:quality,errorRate,averageLatencyMs:avgLatency,estimatedCost:totalCost,details};
}
