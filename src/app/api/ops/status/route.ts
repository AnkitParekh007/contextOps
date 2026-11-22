import {NextRequest,NextResponse} from "next/server";
import Redis from "ioredis";
import {db} from "@/lib/db";
import {monitorCredentialValid,summarizePilotHealth} from "@/lib/ops/health";

/** Private aggregate-only diagnostics. Never include tenant data, traces, secrets or emails. */
export const dynamic="force-dynamic";
const headers={"Cache-Control":"private, no-store"};
const unavailable=()=>NextResponse.json({status:"unavailable"},{status:503,headers});
export async function GET(request:NextRequest){
  const secret=process.env.OPS_MONITOR_TOKEN;
  if(!secret||secret.length<32||secret.startsWith("REPLACE_"))return unavailable();
  if(!monitorCredentialValid(secret,request.headers.get("authorization")))
    return NextResponse.json({error:"Unauthorized"},{status:401,headers});
  const redis=new Redis(process.env.REDIS_URL??"redis://localhost:6379",{
    lazyConnect:true,maxRetriesPerRequest:1,connectTimeout:1500,retryStrategy:()=>null,
  });
  try{
    const now=Date.now(),oneDay=new Date(now-86400000);
    const stallDate=new Date(now-10*60_000);
    const [database,queued,retry,processing,failed24h,staleProcessing,oldestPending]=
      await Promise.all([
        db.$queryRaw`SELECT 1`,
        db.importJob.count({where:{status:"QUEUED"}}),
        db.importJob.count({where:{status:"RETRY"}}),
        db.importJob.count({where:{status:"PROCESSING"}}),
        db.importJob.count({where:{status:"FAILED",completedAt:{gte:oneDay}}}),
        db.importJob.count({where:{status:"PROCESSING",startedAt:{lt:stallDate}}}),
        db.importJob.findFirst({where:{status:{in:["QUEUED","RETRY"]}},
          orderBy:{createdAt:"asc"},select:{createdAt:true}}),
      ]);
    await redis.connect();
    const [pong,stamp]=await Promise.all([redis.ping(),
      redis.get("contextops:worker:heartbeat")]);
    const oldestPendingAgeSeconds=oldestPending?Math.max(0,
      Math.floor((now-oldestPending.createdAt.getTime())/1000)):null;
    const maxAge=Number(process.env.OPS_QUEUE_WARN_SECONDS??300);
    if(!Number.isFinite(maxAge)||maxAge<30||maxAge>86400)return unavailable();
    const summary=summarizePilotHealth({
      postgres:Boolean(database),redis:pong==="PONG",workerStamp:stamp,now,
      counts:{queued,retry,processing,failed24h,staleProcessing,oldestPendingAgeSeconds},
      queueWarnSeconds:maxAge,
    });
    return NextResponse.json({
      ...summary,checkedAt:new Date(now).toISOString(),
      environment:"pilot",customerDataVerified:false,
      externalBenchmarksEnabled:process.env.ENABLE_EXTERNAL_BENCHMARKS==="true",
    },{status:summary.status==="ok"?200:503,headers});
  }catch{
    return unavailable();
  }finally{
    redis.disconnect();
  }
}
