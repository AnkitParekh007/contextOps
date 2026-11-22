import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { workspaceAccess } from "@/lib/tenant";
import { apiError, handleApiError } from "@/lib/http";
import { originAllowed, enforceRateLimit } from "@/lib/security";
import { cleanRows, parseRows, mapColumns, MAX_UPLOAD_BYTES, MAX_TRACES } from "@/lib/pipeline/parse";
import { demoTraces } from "@/lib/pipeline/demo";
import { classify } from "@/lib/pipeline/classify";
import { calculateSavings, costInputSchema } from "@/lib/pipeline/cost";
import { evaluationRequestSchema, evaluate } from "@/lib/pipeline/evaluate";
import { policySchema, routeDecision } from "@/lib/pipeline/routing";
import { buildMarkdown } from "@/lib/pipeline/reports";
import { z, ZodError } from "zod";
import type { Prisma } from "@prisma/client";

type Context={params:Promise<{workspaceId:string;action:string}>};
function json(value:unknown,status=200){return NextResponse.json(value,{status});}
function message(error:unknown){
  return error instanceof Error?error.message:"Request failed";
}
async function audit(organizationId:string,actorId:string,action:string,subjectType:string,subjectId:string,metadata?:Record<string,unknown>){
  await db.auditLog.create({data:{organizationId,actorId,action,subjectType,subjectId,
    metadata:metadata as Prisma.InputJsonValue|undefined}});
}
function traceCost(inputTokens:number,outputTokens:number,inPrice:number,outPrice:number){
  return (inputTokens*inPrice+outputTokens*outPrice)/1_000_000;
}
function datasetSummary(traces:Array<{inputTokens:number;outputTokens:number;latencyMs:number;status:string}>){
  const n=traces.length||1;
  return {taskCount:traces.length,totalInputTokens:traces.reduce((v,t)=>v+t.inputTokens,0),
    totalOutputTokens:traces.reduce((v,t)=>v+t.outputTokens,0),
    averageInputTokens:traces.reduce((v,t)=>v+t.inputTokens,0)/n,
    averageOutputTokens:traces.reduce((v,t)=>v+t.outputTokens,0)/n,
    averageLatencyMs:traces.reduce((v,t)=>v+t.latencyMs,0)/n,
    errorRate:traces.filter(t=>t.status.toLowerCase()!=="success").length/n};
}
export async function GET(request:NextRequest,{params}:Context){
  const {workspaceId,action}=await params;
  const access=await workspaceAccess(workspaceId);
  if(!access.ok)return apiError(access.error,access.status);
  const org=access.workspace.organizationId;
  try{
    if(action==="template"){
      const body="external_trace_id,timestamp,task_type,input_text,prompt_template,model_provider,model_name,input_tokens,output_tokens,latency_ms,status,output_text,expected_output,human_label\n";
      return new NextResponse(body,{headers:{"Content-Type":"text/csv; charset=utf-8",
        "Content-Disposition":'attachment; filename="contextops-trace-template.csv"',"Cache-Control":"no-store"}});
    }
    if(action==="overview"){
      const [counts,traces,latestEvaluation,latestShadow,latestReport,baselinePricing]=await Promise.all([
        db.executionTrace.count({where:{workspaceId,organizationId:org}}),
        db.executionTrace.findMany({where:{workspaceId,organizationId:org},select:{
          inputTokens:true,outputTokens:true,latencyMs:true,status:true,modelName:true,taskType:true,
          outputText:true,expectedOutput:true,humanLabel:true,
        },take:MAX_TRACES}),
        db.evaluationRun.findFirst({where:{workspaceId,organizationId:org},orderBy:{createdAt:"desc"}}),
        db.shadowModeRun.findFirst({where:{workspaceId,organizationId:org},orderBy:{createdAt:"desc"}}),
        db.savingsReport.findFirst({where:{workspaceId,organizationId:org},orderBy:{createdAt:"desc"}}),
        db.costSnapshot.findFirst({where:{workspaceId,organizationId:org,provider:"BASELINE",
          model:access.workspace.modelName},orderBy:{createdAt:"desc"}}),
      ]);
      const classes=await db.taskClassification.groupBy({by:["category","suitability"],where:{workspaceId,organizationId:org},_count:{_all:true}});
      const sampleCost=baselinePricing?traces.reduce((total,t)=>total+traceCost(t.inputTokens,
        t.outputTokens,baselinePricing.priceInputPerMillion,baselinePricing.priceOutputPerMillion),0):null;
      const labeledSuccess=traces.filter(t=>(t.expectedOutput||t.humanLabel)&&t.outputText&&
        (t.humanLabel??t.expectedOutput)?.toLowerCase().trim()===t.outputText.toLowerCase().trim()).length;
      const p95=traces.length?[...traces].sort((a,b)=>a.latencyMs-b.latencyMs)[
        Math.ceil(traces.length*.95)-1].latencyMs:null;
      return json({workspace:access.workspace,counts:datasetSummary(traces),total:counts,
        modeledSampleSpend:sampleCost,costPerLabeledSuccess:sampleCost!==null&&labeledSuccess>0?
          sampleCost/labeledSuccess:null,labeledSuccess,p95LatencyMs:p95,
        pricingAssumptions:baselinePricing?{input:baselinePricing.priceInputPerMillion,
          output:baselinePricing.priceOutputPerMillion,effectiveAt:baselinePricing.effectiveAt}:null,
        categories:classes.map(c=>({category:c.category,suitability:c.suitability,count:c._count._all})),
        latestEvaluation,latestShadow,latestReport});
    }
    if(action==="traces"){
      const page=Math.max(1,Math.min(10000,Number(request.nextUrl.searchParams.get("page")??1)||1));
      const size=Math.min(100,Math.max(1,Number(request.nextUrl.searchParams.get("size")??25)||25));
      const where={workspaceId,organizationId:org};
      const [total,traces]=await Promise.all([
        db.executionTrace.count({where}),
        db.executionTrace.findMany({where,orderBy:{timestamp:"desc"},skip:(page-1)*size,take:size,
          select:{id:true,externalTraceId:true,timestamp:true,taskType:true,modelName:true,
            inputTokens:true,outputTokens:true,status:true,inputText:true,outputText:true,
            humanLabel:true,expectedOutput:true,latencyMs:true}}),
      ]);
      return json({total,page,size,traces});
    }
    if(action==="imports")return json({imports:await db.importJob.findMany({where:{
      workspaceId,organizationId:org},select:{id:true,status:true,filename:true,total:true,processed:true,
        rejected:true,issues:true,createdAt:true,completedAt:true},orderBy:{createdAt:"desc"},take:20})});
    if(action==="analysis"){
      const [classifications,traces,classificationSamples]=await Promise.all([
        db.taskClassification.groupBy({by:["category","risk","suitability"],where:{workspaceId,organizationId:org},_count:{_all:true}}),
        db.executionTrace.findMany({where:{workspaceId,organizationId:org},select:{
          taskType:true,modelName:true,inputTokens:true,outputTokens:true,latencyMs:true,
          status:true,promptTemplate:true,humanLabel:true,expectedOutput:true},take:MAX_TRACES}),
        db.taskClassification.findMany({where:{workspaceId,organizationId:org},
          select:{traceId:true,category:true,confidence:true,risk:true,suitability:true,
            reason:true,evaluationApproach:true},take:50,orderBy:{createdAt:"asc"}}),
      ]);
      const patterns=Object.entries(traces.reduce<Record<string,number>>((acc,t)=>{
        const key=(t.promptTemplate??t.taskType).slice(0,120);
        acc[key]=(acc[key]??0)+1;return acc;},{}))
        .sort((a,b)=>b[1]-a[1]).slice(0,12).map(([name,count])=>({name,count}));
      const labeledCount=traces.filter(t=>t.humanLabel||t.expectedOutput).length;
      return json({summary:{...datasetSummary(traces),labeledCount},patterns,
        samples:classificationSamples,categories:classifications.map(c=>({
        category:c.category,risk:c.risk,suitability:c.suitability,count:c._count._all})),
        modelDistribution:Object.entries(traces.reduce<Record<string,number>>((acc,t)=>{
          acc[t.modelName]=(acc[t.modelName]??0)+1;return acc;},{})).map(([name,count])=>({name,count}))});
    }
    if(action==="evaluations")return json({runs:await db.evaluationRun.findMany({where:{
      workspaceId,organizationId:org},orderBy:{createdAt:"desc"},take:20})});
    if(action==="policies")return json({policies:await db.routingPolicy.findMany({where:{
      workspaceId,organizationId:org},orderBy:{createdAt:"desc"},take:20})});
    if(action==="shadow")return json({runs:await db.shadowModeRun.findMany({where:{
      workspaceId,organizationId:org},orderBy:{createdAt:"desc"},take:15})});
    if(action==="reports")return json({reports:await db.savingsReport.findMany({where:{
      workspaceId,organizationId:org},orderBy:{createdAt:"desc"},take:20,
      select:{id:true,title:true,createdAt:true,baselineCost:true,optimizedCost:true,monthlyVolume:true,
        simulatedMonthlySavings:true,estimatedMonthlySavings:true,verifiedMonthlySavings:true,qualityScore:true}})});
    if(action==="reviews")return json({reviews:await db.humanReview.findMany({where:{
      workspaceId,organizationId:org},orderBy:{createdAt:"desc"},take:100})});
    if(action==="audit")return json({events:await db.auditLog.findMany({where:{
      organizationId:org,OR:[{subjectId:workspaceId},{metadata:{path:["workspaceId"],equals:workspaceId}},
        {subjectType:{in:["ImportJob","EvaluationRun","RoutingPolicy","ShadowModeRun","SavingsReport","HumanReview"]}}]},
      orderBy:{createdAt:"desc"},take:100,select:{id:true,action:true,subjectType:true,subjectId:true,createdAt:true,metadata:true}})});
    if(action==="settings")return json({workspace:{name:access.workspace.name,modelName:access.workspace.modelName,retentionUntil:access.workspace.retentionUntil},role:access.membership.role,thresholds:await db.qualityThreshold.findMany({where:{workspaceId,organizationId:org}}),
      pricing:await db.costSnapshot.findMany({where:{workspaceId,organizationId:org},
        orderBy:{createdAt:"desc"},take:10}),
      connections:await db.workflowConnection.findMany({where:{workspaceId,organizationId:org},
        select:{id:true,name:true,provider:true,status:true,consentAt:true}})});
    return apiError("Unknown endpoint",404);
  }catch(error){return handleApiError(error);}
}
export async function POST(request:NextRequest,{params}:Context){
  if(!originAllowed(request))return apiError("Invalid request origin",403);
  const {workspaceId,action}=await params;
  const access=await workspaceAccess(workspaceId,true);
  if(!access.ok)return apiError(access.error,access.status);
  const {user,workspace}=access,org=workspace.organizationId;
  try{
    if(!await enforceRateLimit("workspace-"+action,user.id,action==="imports"?30:120))
      return apiError("Rate limit exceeded",429);
    if(action==="imports"||action==="preview"){
      const form=await request.formData();
      const file=form.get("file");
      if(!(file instanceof File))return apiError("Upload CSV, JSONL or JSON",422);
      if(file.size>MAX_UPLOAD_BYTES)return apiError("File exceeds 16 MB",413);
      if(form.get("authorized")!=="true")return apiError("Upload authorization required",403);
      const original=parseRows(await file.text(),file.name);
      const mappingInput=String(form.get("mapping")??"{}");
      let mapping:Record<string,string>={};
      try{mapping=z.record(z.string()).parse(JSON.parse(mappingInput));}
      catch{return apiError("Invalid column mapping",422);}
      const parsed=mapColumns(original,mapping);
      const {rows,issues}=cleanRows(parsed);
      if(action==="preview"){
        return json({columns:original.length&&original[0]&&typeof original[0]==="object"?
          Object.keys(original[0] as Record<string,unknown>):[],
          redactedPreview:rows.slice(0,3),total:original.length,valid:rows.length,issues});
      }
      if(form.get("retentionAcknowledged")!=="true")
        return apiError("Redacted-only retention acknowledgement required",403);
      if(!rows.length)return apiError("No valid traces found",422);
      const job=await db.importJob.create({data:{
        organizationId:org,workspaceId,filename:file.name.slice(0,180),
        status:"QUEUED",payload:rows as unknown as Prisma.InputJsonValue,total:parsed.length,
        rejected:issues.length,issues,
      }});
      await audit(org,user.id,"TRACE_IMPORT_QUEUED","ImportJob",job.id,{workspaceId,
        count:rows.length,redactedOnly:true,authorized:true});
      return json({jobId:job.id,status:job.status,total:job.total,validationIssues:issues},202);
    }
    if(action==="demo"){
      const traces=demoTraces();
      const result=await db.executionTrace.createMany({data:traces.map(t=>({
        ...t,organizationId:org,workspaceId,metadata:t.metadata,
      })),skipDuplicates:true});
      await audit(org,user.id,"SYNTHETIC_TRACES_CREATED","Workspace",workspaceId,{workspaceId,count:result.count});
      return json({inserted:result.count,totalAvailable:await db.executionTrace.count({where:{workspaceId,organizationId:org}})});
    }
    if(action==="analysis"){
      const traces=await db.executionTrace.findMany({where:{workspaceId,organizationId:org},take:MAX_TRACES,
        orderBy:{timestamp:"desc"}});
      if(!traces.length)return apiError("Upload traces or load synthetic demo first",422);
      const classified=traces.map(t=>({trace:t,classification:classify(t)}));
      await db.taskClassification.deleteMany({where:{workspaceId,organizationId:org}});
      for(let offset=0;offset<classified.length;offset+=500){
        await db.taskClassification.createMany({data:classified.slice(offset,offset+500).map(({trace,classification})=>({
          organizationId:org,workspaceId,traceId:trace.id,...classification,
        }))});
      }
      const pending=classified.filter(x=>x.classification.suitability!=="ELIGIBLE");
      const existing=new Set((await db.humanReview.findMany({where:{workspaceId,organizationId:org},
        select:{traceId:true}})).map(r=>r.traceId));
      await db.humanReview.createMany({data:pending.filter(p=>!existing.has(p.trace.id)).map(p=>({
        organizationId:org,workspaceId,traceId:p.trace.id,reason:p.classification.reason,
      }))});
      await audit(org,user.id,"WORKLOAD_ANALYZED","Workspace",workspaceId,{workspaceId,traces:traces.length});
      return json({analyzed:classified.length,eligible:classified.filter(x=>x.classification.suitability==="ELIGIBLE").length,
        needsReview:pending.length});
    }
    if(action==="calculator")return json({scenario:calculateSavings(costInputSchema.parse(await request.json()))});
    if(action==="evaluations"){
      const params=evaluationRequestSchema.parse(await request.json());
      if(params.provider!=="MOCK"&&!params.consentExternal)return apiError("External provider consent is required",403);
      const result=await evaluate(workspace,user.id,params);
      return json({run:result},201);
    }
    if(action==="policies"){
      if(!["OWNER","ADMIN"].includes(access.membership.role))return apiError("Owner or admin role required",403);
      const input=policySchema.parse(await request.json());
      const run=await db.evaluationRun.findFirst({where:{
        id:input.evaluationRunId,workspaceId,organizationId:org,status:"COMPLETED"}});
      if(!run)return apiError("Run an evaluation first",422);
      const details=(run.details??{}) as Record<string,unknown>;
      const pass=details.canRecommend===true&&(run.qualityScore??0)>=input.minQuality&&
        (run.errorRate??1)<=input.circuitBreakerErrorRate&&
        (1-(run.qualityScore??0))<=input.maxFallbackRate&&(run.averageLatencyMs??Infinity)<=input.maxLatencyMs;
      const existingPolicy=await db.routingPolicy.findFirst({where:{
        organizationId:org,workspaceId,name:input.name},orderBy:{version:"desc"}});
      const policy=await db.routingPolicy.create({data:{
        workspaceId,organizationId:org,name:input.name,evaluationRunId:run.id,
        status:pass?"APPROVED_FOR_SIMULATION":"DRAFT",
        version:(existingPolicy?.version??0)+1,
        config:input,
      }});
      await db.modelRoute.createMany({data:[
        {workspaceId,organizationId:org,routingPolicyId:policy.id,provider:run.provider,
          model:run.model,priority:1,settings:{simulationOnly:true}},
        {workspaceId,organizationId:org,routingPolicyId:policy.id,provider:workspace.provider,
          model:workspace.modelName,priority:2,settings:{fallback:true,simulationOnly:true}},
      ]});
      await audit(org,user.id,"ROUTING_POLICY_CREATED","RoutingPolicy",policy.id,{workspaceId,status:policy.status});
      return json({policy,notice:pass?"Approved for offline simulation only":"Quality/cost gates failed; policy remains a draft"},201);
    }
    if(action==="shadow"){
      const input=z.object({policyId:z.string().min(4)}).parse(await request.json());
      const policy=await db.routingPolicy.findFirst({where:{
        id:input.policyId,workspaceId,organizationId:org,status:"APPROVED_FOR_SIMULATION"}});
      if(!policy)return apiError("Only quality-approved simulation policies may run",422);
      const run=await db.evaluationRun.findFirst({where:{
        id:policy.evaluationRunId??"",workspaceId,organizationId:org,status:"COMPLETED"}});
      if(!run)return apiError("Policy evaluation missing",422);
      const details=(run.details??{}) as Record<string,number|boolean>;
      if(details.canRecommend!==true)return apiError("Evaluation quality gates failed",422);
      const config=policySchema.parse(policy.config);
      const traces=await db.executionTrace.findMany({where:{workspaceId,organizationId:org},
        orderBy:{timestamp:"desc"},take:MAX_TRACES});
      if(!traces.length)return apiError("No traces found",422);
      const classes=await db.taskClassification.findMany({where:{workspaceId,organizationId:org}});
      const byId=new Map(classes.map(c=>[c.traceId,c]));
      const baselineIn=Number(details.baselineInputPrice??0),baselineOut=Number(details.baselineOutputPrice??0);
      const candidateIn=Number(details.candidateInputPrice??0),candidateOut=Number(details.candidateOutputPrice??0);
      const fallbackRate=Number(details.fallbackRate??0);
      let baselineCost=0,projectedCost=0,routed=0,escalated=0,blocked=0;
      const decisions=traces.map(trace=>{
        const c=byId.get(trace.id);
        const baseline=traceCost(trace.inputTokens,trace.outputTokens,baselineIn,baselineOut);
        const candidate=traceCost(trace.inputTokens,trace.outputTokens,candidateIn,candidateOut);
        const route=routeDecision(c,config,true,candidate);
        baselineCost+=baseline;
        let projected=baseline;
        if(route==="CHEAP"){routed++;projected=candidate*(1+fallbackRate*config.retryLimit)+fallbackRate*baseline;}
        else if(route==="REVIEW"){blocked++;}
        else{escalated++;}
        projectedCost+=projected;
        return {traceId:trace.id,route,estimatedCost:projected};
      });
      const saved=baselineCost-projectedCost;
      const shadow=await db.shadowModeRun.create({data:{organizationId:org,workspaceId,policyId:policy.id,
        evaluationRunId:run.id,total:traces.length,routed,escalated,blocked,baselineCost,
        projectedCost,simulatedSavings:saved,projectedQuality:run.qualityScore,
        fallbackRate,expectedFallbacks:routed*fallbackRate,decisions}});
      await audit(org,user.id,"SHADOW_SIMULATED","ShadowModeRun",shadow.id,{workspaceId,
        total:traces.length,routed,blocked,simulatedSavings:saved});
      return json({run:{...shadow,decisions:decisions.slice(0,20)},note:"Offline simulation; no production routing occurred"},201);
    }
    if(action==="reports"){
      const body=z.object({monthlyVolume:z.number().int().min(1).max(100000000).optional()}).parse(await request.json());
      const shadow=await db.shadowModeRun.findFirst({where:{workspaceId,organizationId:org},orderBy:{createdAt:"desc"}});
      if(!shadow)return apiError("Run shadow mode before generating a report",422);
      const policy=await db.routingPolicy.findFirst({where:{id:shadow.policyId,workspaceId,organizationId:org}});
      const evaluation=await db.evaluationRun.findFirst({where:{id:shadow.evaluationRunId??"",workspaceId,organizationId:org}});
      const [orgRecord,categoryGroups,auditHistory]=await Promise.all([
        db.organization.findUnique({where:{id:org}}),
        db.taskClassification.groupBy({by:["category"],where:{workspaceId,organizationId:org},
          _count:{_all:true}}),
        db.auditLog.findMany({where:{organizationId:org,OR:[
          {subjectId:workspaceId},{metadata:{path:["workspaceId"],equals:workspaceId}}]},
          select:{action:true,createdAt:true,subjectType:true},
          orderBy:{createdAt:"desc"},take:12}),
      ]);
      const monthlyVolume=body.monthlyVolume??shadow.total;
      const factor=monthlyVolume/Math.max(1,shadow.total);
      const estimate=shadow.simulatedSavings*factor;
      const assumptions={
        monthlyVolume,sourceSampleSize:shadow.total,linearScaling:true,
        excludedOverhead:"Fees and infrastructure not included in sample simulation",
        tokenCounts:"Candidate requests estimated using baseline token counts",
        fallback:"Candidate quality is extrapolated from labeled evaluation sample",
        expectedFallbackRate:shadow.fallbackRate,
        expectedFallbackCalls:shadow.expectedFallbacks,
        evalBaselineQuality:((evaluation?.details??{}) as Record<string,unknown>).baselineAccuracy??null,
        verified:false,
      };
      const markdown=buildMarkdown({organization:orgRecord?.name??"Organization",workspace:workspace.name,
        date:new Date().toISOString(),sampleSize:shadow.total,taskVolume:monthlyVolume,
        baselineCost:shadow.baselineCost,candidateCost:shadow.projectedCost,
        simulatedSavings:shadow.simulatedSavings,quality:evaluation?.qualityScore??null,
        eligible:shadow.routed,escalated:shadow.escalated,blocked:shadow.blocked,
        model:evaluation?.model??"Unknown",policy:policy?.name??"Unspecified",
        categories:categoryGroups.map(c=>c.category+": "+c._count._all+" traces"),
        auditTrail:auditHistory.map(a=>a.createdAt.toISOString()+" "+a.action+" ("+a.subjectType+")"),
        assumptions:Object.entries(assumptions).map(([k,v])=>k+": "+String(v))});
      const report=await db.savingsReport.create({data:{organizationId:org,workspaceId,
        title:"AI Cost & Quality Assessment",baselineCost:shadow.baselineCost,
        optimizedCost:shadow.projectedCost,monthlyVolume,estimatedMonthlySavings:estimate,
        projectedAnnualSavings:estimate*12,simulatedMonthlySavings:estimate,
        verifiedMonthlySavings:null,qualityScore:evaluation?.qualityScore??null,assumptions,markdown}});
      await audit(org,user.id,"SAVINGS_REPORT_CREATED","SavingsReport",report.id,{workspaceId,
        evidenceLevel:"SIMULATED",monthlyVolume});
      return json({report:{id:report.id,title:report.title,simulatedMonthlySavings:estimate,
        projectedAnnualSavings:estimate*12,verifiedMonthlySavings:null}},201);
    }
    if(action==="reviews"){
      const input=z.object({reviewId:z.string(),decision:z.enum(["APPROVED","REJECTED"]),notes:z.string().max(500).optional()}).parse(await request.json());
      const review=await db.humanReview.findFirst({where:{id:input.reviewId,workspaceId,organizationId:org}});
      if(!review)return apiError("Review item not found",404);
      const updated=await db.humanReview.update({where:{id:review.id},data:{
        status:"RESOLVED",decision:input.decision,reviewerId:user.id,reviewedAt:new Date(),
      }});
      await db.feedbackEvent.create({data:{organizationId:org,workspaceId,traceId:review.traceId,
        eventType:"HUMAN_REVIEW",label:input.decision,details:{notes:input.notes??""}}});
      await audit(org,user.id,"HUMAN_REVIEW_RECORDED","HumanReview",review.id,{workspaceId,decision:input.decision});
      return json({review:updated});
    }
    if(action==="pricing"){
      if(!["OWNER","ADMIN"].includes(access.membership.role))
        return apiError("Owner or admin role required",403);
      const input=z.object({provider:z.string().min(2).max(60),model:z.string().min(2).max(120),
        priceInputPerMillion:z.number().min(0).max(100000),
        priceOutputPerMillion:z.number().min(0).max(100000)}).parse(await request.json());
      const snapshot=await db.costSnapshot.create({data:{workspaceId,organizationId:org,...input}});
      await audit(org,user.id,"PRICE_ASSUMPTION_SAVED","Workspace",workspaceId,{
        workspaceId,model:input.model,provider:input.provider});
      return json({snapshot},201);
    }
    if(action==="settings"){
      if(!["OWNER","ADMIN"].includes(access.membership.role))
        return apiError("Owner or admin role required",403);
      const body=z.object({taskType:z.string().min(1).max(80),minimumQuality:z.number().min(.5).max(1),
        maximumErrorRate:z.number().min(0).max(1),maximumFallbackRate:z.number().min(0).max(1),
        maximumLatencyMs:z.number().int().min(1).max(120000)}).parse(await request.json());
      const {taskType,...settings}=body;
      const updated=await db.qualityThreshold.upsert({where:{workspaceId_taskType:{workspaceId,taskType}},
        create:{workspaceId,organizationId:org,taskType,...settings},update:settings});
      await audit(org,user.id,"QUALITY_THRESHOLD_UPDATED","Workspace",workspaceId,{workspaceId,taskType});
      return json({threshold:updated});
    }
    if(action==="connections"){
      if(!["OWNER","ADMIN"].includes(access.membership.role))return apiError("Owner or admin role required",403);
      const input=z.object({name:z.string().min(2).max(120),provider:z.enum(["MOCK"]),
        confirmNoExternalData:z.literal(true)}).parse(await request.json());
      const connection=await db.workflowConnection.create({data:{organizationId:org,workspaceId,
        name:input.name,provider:"MOCK",status:"DEMO_ONLY",consentAt:new Date(),
        config:{syntheticOnly:true}}});
      await audit(org,user.id,"DEMO_CONNECTION_CREATED","WorkflowConnection",connection.id,{workspaceId});
      return json({connection:{id:connection.id,name:connection.name,status:connection.status}},201);
    }
    return apiError("Unknown endpoint",404);
  }catch(error){
    if(error instanceof ZodError)return handleApiError(error);
    // Expected domain/parse errors are safe to display; provider HTTP errors never echo upstream payload.
    if(error instanceof SyntaxError)return apiError("Invalid uploaded data",422);
    const msg=message(error);
    // Explicit domain status codes: policy denial is never an internal server error.
    if(msg==="This model has already used the frozen holdout; create a new protocol"||
      msg==="Frozen benchmark cohort changed: create and freeze a new protocol")
      return apiError("Frozen benchmark cohort cannot be reused or has changed",409);
    if(msg==="External benchmark execution disabled by operator"||
      msg==="External benchmark requires documented authorized sanitized provenance")
      return apiError("External benchmarking is not approved for this workspace",403);
    if(msg==="Frozen tenant-scoped protocol required")
      return apiError("A frozen tenant-scoped benchmark protocol is required",422);
    if(/^(Need at least|Upload traces|No traces|Only quality|Run an evaluation|Run shadow|Consent required|External provider|Unsupported provider|Sensitive trace|CSV needs|Invalid JSONL|Use a |Maximum |Unterminated CSV|Malformed CSV|JSON upload|Invalid column mapping)/.test(msg))
      return apiError(msg,422);
    return handleApiError(error);
  }
}
