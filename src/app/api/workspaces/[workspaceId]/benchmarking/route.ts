import {NextRequest,NextResponse} from "next/server";
import {createHash} from "node:crypto";
import {z} from "zod";
import {db} from "@/lib/db";
import {workspaceAccess} from "@/lib/tenant";
import {originAllowed,enforceRateLimit} from "@/lib/security";
import {apiError,handleApiError} from "@/lib/http";
import {benchmarkProtocolSchema,validateFrozenPopulation} from "@/lib/pipeline/protocol";
import {loadBenchmarkPool} from "@/lib/pipeline/benchmark-data";
import {stressScenario} from "@/lib/pipeline/budget";
import {reconcileAggregate} from "@/lib/pipeline/benchmark-insights";

type Context={params:Promise<{workspaceId:string}>};
const operator=(role:string)=>role==="OWNER"||role==="ADMIN";
const noStore={"Cache-Control":"private, no-store"};
export async function GET(_request:NextRequest,{params}:Context){
  const {workspaceId}=await params;
  const access=await workspaceAccess(workspaceId);
  if(!access.ok)return apiError(access.error,access.status);
  const organizationId=access.workspace.organizationId;
  try{
    const [protocols,reconciliations]=await Promise.all([
      db.benchmarkProtocol.findMany({where:{organizationId,workspaceId},
        orderBy:{createdAt:"desc"},take:25}),
      db.benchmarkReconciliation.findMany({where:{organizationId,workspaceId},
        orderBy:{createdAt:"desc"},take:25}),
    ]);
    return NextResponse.json({protocols:protocols.map(p=>({
      id:p.id,name:p.name,status:p.status,frozenAt:p.frozenAt,
      populationSize:p.populationSize,holdoutSize:p.holdoutSize,
      populationFingerprint:p.populationFingerprint,createdAt:p.createdAt,
      config:{...benchmarkProtocolSchema.parse(p.config),authorizationReference:undefined},
    })),reconciliations},{headers:noStore});
  }catch(e){return handleApiError(e);}
}
const reconciliation=z.object({
  runId:z.string().min(4),
  invoiceReference:z.string().trim().min(6).max(120),
  periodStart:z.string().datetime(),
  periodEnd:z.string().datetime(),
  billedTotalUsd:z.number().min(0).max(1e7),
  overheadUsd:z.number().min(0).max(1e7),
  billableTasks:z.number().int().min(1).max(1e8),
  successfulTasks:z.number().int().min(0).max(1e8),
  acknowledgeSelfReported:z.literal(true),
}).superRefine((v,ctx)=>{
  if(v.periodStart>=v.periodEnd)ctx.addIssue({code:"custom",message:"Invalid billing period"});
  if(v.successfulTasks>v.billableTasks)ctx.addIssue({code:"custom",message:"Success count exceeds billed task count"});
});
const stressSchema=z.object({
  monthlyTasks:z.number().int().min(1).max(1e8),
  eligibleFraction:z.number().min(0).max(1),
  baselineUsdPerTask:z.number().min(0).max(10000),
  candidateUsdPerAttempt:z.number().min(0).max(10000),
  errorFraction:z.number().min(0).max(1),
  retryFraction:z.number().min(0).max(1),
  fallbackUsdPerTask:z.number().min(0).max(10000),
  fixedMonthlyUsd:z.number().min(0).max(1e7),
});
export async function POST(request:NextRequest,{params}:Context){
  if(!originAllowed(request))return apiError("Invalid request origin",403);
  const {workspaceId}=await params;
  const access=await workspaceAccess(workspaceId,true);
  if(!access.ok)return apiError(access.error,access.status);
  const {user,workspace,membership}=access,organizationId=workspace.organizationId;
  try{
    if(!await enforceRateLimit("benchmarking",user.id,30))
      return apiError("Too many benchmarking operations",429);
    const body=z.object({mode:z.enum(["create","freeze","stress","reconcile"])})
      .passthrough().parse(await request.json());
    if(body.mode==="stress"){
      const scenario=stressScenario(stressSchema.parse(body.scenario));
      return NextResponse.json({scenario},{headers:noStore});
    }
    if(!operator(membership.role))return apiError("Owner/admin role required",403);
    if(body.mode==="create"){
      const config=benchmarkProtocolSchema.parse(body.config);
      const created=await db.benchmarkProtocol.create({data:{
        organizationId,workspaceId,name:config.name,
        createdById:user.id,config,
      }});
      await db.auditLog.create({data:{organizationId,actorId:user.id,
        action:"BENCHMARK_PROTOCOL_CREATED",subjectType:"BenchmarkProtocol",
        subjectId:created.id,metadata:{workspaceId,seed:config.seed}}});
      return NextResponse.json({protocol:{id:created.id,status:created.status,
        name:created.name}},{status:201,headers:noStore});
    }
    if(body.mode==="freeze"){
      const input=z.object({protocolId:z.string().min(4),confirmation:z.string()}).parse(body);
      const protocol=await db.benchmarkProtocol.findFirst({where:{
        id:input.protocolId,organizationId,workspaceId,status:"DRAFT",frozenAt:null,
      }});
      if(!protocol)return apiError("Draft benchmark protocol not found",404);
      if(input.confirmation!=="FREEZE "+protocol.name)
        return apiError("Exact protocol confirmation required",422);
      const config=benchmarkProtocolSchema.parse(protocol.config);
      const pool=await loadBenchmarkPool(workspaceId,organizationId,config);
      const validated=validateFrozenPopulation(pool,config);
      const updated=await db.benchmarkProtocol.updateMany({where:{
        id:protocol.id,organizationId,workspaceId,status:"DRAFT",frozenAt:null,
      },data:{status:"FROZEN",frozenAt:new Date(),
        populationFingerprint:validated.populationFingerprint,
        populationSize:validated.populationSize,holdoutSize:validated.holdoutSize}});
      if(!updated.count)return apiError("Benchmark protocol was already frozen",409);
      await db.auditLog.create({data:{organizationId,actorId:user.id,
        action:"BENCHMARK_PROTOCOL_FROZEN",subjectType:"BenchmarkProtocol",
        subjectId:protocol.id,metadata:{workspaceId,
          populationFingerprint:validated.populationFingerprint,
          populationSize:validated.populationSize,
          holdoutSize:validated.holdoutSize,strata:validated.strata}}});
      return NextResponse.json({protocol:{id:protocol.id,status:"FROZEN",
        populationSize:validated.populationSize,holdoutSize:validated.holdoutSize,
        populationFingerprint:validated.populationFingerprint}},
        {headers:noStore});
    }
    if(body.mode==="reconcile"){
      const input=reconciliation.parse(body);
      const run=await db.evaluationRun.findFirst({where:{
        id:input.runId,organizationId,workspaceId,status:"COMPLETED",
      }});
      if(!run)return apiError("Completed tenant-scoped evaluation required",422);
      // Pass only numeric aggregates. The request also contains identifiers,
      // timestamps and an attestation boolean; those must never enter math.
      const result=reconcileAggregate({
        billedTotalUsd:input.billedTotalUsd,overheadUsd:input.overheadUsd,
        billedTasks:input.billableTasks,successfulTasks:input.successfulTasks,
        modeledSampleCostUsd:run.estimatedCost??0,sampleSize:run.sampleSize,
      });
      const invoiceReferenceHash=createHash("sha256")
        .update(input.invoiceReference).digest("hex");
      const stored=await db.benchmarkReconciliation.create({data:{
        organizationId,workspaceId,evaluationRunId:run.id,
        createdById:user.id,invoiceReferenceHash,
        periodStart:new Date(input.periodStart),periodEnd:new Date(input.periodEnd),
        billedTotalUsd:input.billedTotalUsd,overheadUsd:input.overheadUsd,
        billableTasks:input.billableTasks,successfulTasks:input.successfulTasks,
      }});
      await db.auditLog.create({data:{organizationId,actorId:user.id,
        action:"BENCHMARK_AGGREGATE_RECONCILED",subjectType:"BenchmarkReconciliation",
        subjectId:stored.id,metadata:{workspaceId,evidenceLevel:"SELF_REPORTED_UNVERIFIED"}}});
      return NextResponse.json({id:stored.id,...result},
        {status:201,headers:noStore});
    }
    return apiError("Unsupported operation",400);
  }catch(e){return handleApiError(e);}
}
