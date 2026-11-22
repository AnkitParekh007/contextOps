import {NextResponse} from "next/server";
import Redis from "ioredis";
import {db} from "@/lib/db";

/** A public, non-cached aggregate health bit; no connection strings or tenant data. */
export const dynamic="force-dynamic";
export async function GET(){
  const redis=new Redis(process.env.REDIS_URL ?? "redis://localhost:6379",{
    lazyConnect:true,maxRetriesPerRequest:1,connectTimeout:1500,retryStrategy:()=>null,
  });
  try{
    await redis.connect();
    const [dbReady,redisAlive,workerStamp]=await Promise.all([
      db.$queryRaw`SELECT 1`,
      redis.ping(),
      redis.get("contextops:worker:heartbeat"),
    ]);
    const stamp=Number(workerStamp);
    const healthy=Boolean(dbReady)&&redisAlive==="PONG"&&Number.isFinite(stamp)&&
      stamp>0&&Date.now()-stamp<30000;
    return NextResponse.json({status:healthy?"ok":"unavailable"},{
      status:healthy?200:503,headers:{"Cache-Control":"no-store"},
    });
  }catch{
    return NextResponse.json({status:"unavailable"},{
      status:503,headers:{"Cache-Control":"no-store"},
    });
  }finally{
    redis.disconnect();
  }
}
