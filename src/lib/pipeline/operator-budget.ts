import "server-only";
import {createHash} from "node:crypto";
import Redis from "ioredis";

/**
 * Fail-closed, cross-instance conservative spend reservation.
 * This is a reservation ledger, NOT a guarantee of provider invoicing.
 */
export async function reserveOperatorExternalBudget(input:{
  organizationId:string;workspaceId:string;estimatedMaximumUsd:number;
}){
  if(process.env.ENABLE_EXTERNAL_BENCHMARKS!=="true")
    throw Error("External provider benchmarking is disabled");
  const allowlist=(process.env.BENCHMARK_APPROVED_WORKSPACE_IDS??"")
    .split(",").map(value=>value.trim()).filter(Boolean);
  if(!allowlist.includes(input.workspaceId))
    throw Error("This workspace lacks independent operator processing approval");
  const dailyLimit=Number(process.env.BENCHMARK_DAILY_ORG_BUDGET_USD??"1");
  if(!Number.isFinite(dailyLimit)||dailyLimit<=0||dailyLimit>100)
    throw Error("Invalid operator daily benchmark budget");
  const reserved=Math.ceil(input.estimatedMaximumUsd*1e6);
  if(!Number.isSafeInteger(reserved)||reserved<=0)
    throw Error("Invalid estimated spend reservation");
  const day=new Date().toISOString().slice(0,10);
  const id=createHash("sha256").update(input.organizationId).digest("hex").slice(0,24);
  const key="contextops:benchmark:budget:"+day+":"+id;
  const redis=new Redis(process.env.REDIS_URL??"redis://localhost:6379",{
    lazyConnect:true,maxRetriesPerRequest:1,connectTimeout:2000,retryStrategy:()=>null,
  });
  try{
    await redis.connect();
    const used=await redis.incrby(key,reserved);
    await redis.expire(key,172800);
    if(used>Math.floor(dailyLimit*1e6))
      throw Error("Daily organization benchmark reservation budget exceeded");
    return {reservedUsd:reserved/1e6,approxDailyReservedUsd:used/1e6,
      dailyLimitUsd:dailyLimit,
      note:"This quota covers conservative reservations, not actual provider invoices."};
  }finally{redis.disconnect();}
}
