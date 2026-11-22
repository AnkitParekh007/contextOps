import { PrismaClient } from "@prisma/client";
import Redis from "ioredis";
import {cleanExpiredData} from "../src/lib/retention";
const db=new PrismaClient();
let running=true;
const heartbeat=new Redis(process.env.REDIS_URL ?? "redis://localhost:6379",{
  lazyConnect:true,maxRetriesPerRequest:1,connectTimeout:1500,retryStrategy:()=>null,
});
let heartbeatWarning=false;
let heartbeatRunning=false;
async function markWorkerHealthy(){
  if(heartbeatRunning)return;
  heartbeatRunning=true;
  try{
    if(heartbeat.status==="wait"||heartbeat.status==="end")await heartbeat.connect();
    await heartbeat.set("contextops:worker:heartbeat",String(Date.now()),"EX",30);
    heartbeatWarning=false;
  }catch{
    if(!heartbeatWarning)console.warn("Worker heartbeat unavailable; readiness remains unhealthy");
    heartbeatWarning=true;
  }finally{heartbeatRunning=false;}
}

process.on("SIGINT",()=>{running=false;});
process.on("SIGTERM",()=>{running=false;});
async function workOne(){
  const claim=await db.importJob.findFirst({where:{
    OR:[{status:"QUEUED"},{status:"RETRY",nextAttemptAt:{lte:new Date()}},
      {status:"PROCESSING",startedAt:{lt:new Date(Date.now()-10*60*1000)}}],
  },orderBy:{createdAt:"asc"}});
  if(!claim)return false;
  const update=await db.importJob.updateMany({where:{id:claim.id,status:claim.status},
    data:{status:"PROCESSING",startedAt:new Date(),attempts:{increment:1}}});
  if(!update.count)return true;
  try{
    const rows=Array.isArray(claim.payload)?claim.payload as Array<Record<string,unknown>>:[];
    let processed=0,inserted=0;
    while(processed<rows.length){
      const batch=rows.slice(processed,processed+200).map(raw=>({
        organizationId:claim.organizationId,workspaceId:claim.workspaceId,
        externalTraceId:String(raw.externalTraceId),timestamp:new Date(String(raw.timestamp)),
        taskType:String(raw.taskType),inputText:raw.inputText as string|null,
        promptTemplate:raw.promptTemplate as string|null,modelProvider:String(raw.modelProvider),
        modelName:String(raw.modelName),inputTokens:Number(raw.inputTokens),
        outputTokens:Number(raw.outputTokens),latencyMs:Number(raw.latencyMs),
        status:String(raw.status),errorMessage:raw.errorMessage as string|null,
        outputText:raw.outputText as string|null,expectedOutput:raw.expectedOutput as string|null,
        humanLabel:raw.humanLabel as string|null,qualityScore:raw.qualityScore as number|null,
        businessContextRefs:(raw.businessContextRefs??[]) as object,
        metadata:(raw.metadata??{}) as object,
      }));
      const created=await db.executionTrace.createMany({data:batch,skipDuplicates:true});
      inserted+=created.count;processed+=batch.length;
      await db.importJob.update({where:{id:claim.id},data:{processed,startedAt:new Date()}});
    }
    await db.importJob.update({where:{id:claim.id},data:{
      status:"COMPLETED",payload:[],processed:rows.length,rejected:claim.rejected+(rows.length-inserted),
      completedAt:new Date(),
    }});
    await db.auditLog.create({data:{organizationId:claim.organizationId,actorId:null,
      subjectType:"ImportJob",subjectId:claim.id,action:"TRACE_IMPORT_COMPLETED",
      metadata:{accepted:inserted,duplicates:rows.length-inserted}}});
  }catch(error){
    console.error("Import job failure",claim.id,error instanceof Error?error.message:"unknown");
    const attempts=claim.attempts+1;
    const retry=attempts<3;
    await db.importJob.update({where:{id:claim.id},data:{
      status:retry?"RETRY":"FAILED",
      nextAttemptAt:retry?new Date(Date.now()+Math.pow(2,attempts)*1500):null,
      issues:[...((Array.isArray(claim.issues)?claim.issues:[]) as string[]),
        retry?"Retry scheduled following processing error":"Processing failed after retry attempts"],
      ...(retry?{}:{completedAt:new Date(),payload:[]}),
    }});
  }
  return true;
}
async function main(){
  await markWorkerHealthy();
  const timer=setInterval(()=>{void markWorkerHealthy();},10000);
  const maintenance=setInterval(()=>{
    void cleanExpiredData(db).catch(error=>console.error("Retention maintenance failure",
      error instanceof Error?error.message:"unknown"));
  },60*60*1000);
  await cleanExpiredData(db).catch(error=>console.error("Initial retention maintenance failure",
    error instanceof Error?error.message:"unknown"));
  try{
  while(running){
    try{const worked=await workOne();if(!worked)await new Promise(r=>setTimeout(r,1500));}
    catch(error){console.error("Worker loop error",error);await new Promise(r=>setTimeout(r,2500));}
  }
  }finally{
    clearInterval(timer);
    clearInterval(maintenance);
    heartbeat.disconnect();
    await db.$disconnect();
  }
}
main().catch(e=>{console.error(e);process.exit(1);});
