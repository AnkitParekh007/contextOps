#!/usr/bin/env node
import {mkdir,writeFile} from "node:fs/promises";
import {join} from "node:path";
import {runOperationalProbe} from "./phase17-operational-probe.mjs";

const outputDir=process.env.PHASE17_OUTPUT_DIR??"artifacts";
try{
  const report=await runOperationalProbe({
    origin:process.env.PILOT_BASE_URL,
    registered:process.env.APP_URL,
    token:process.env.OPS_MONITOR_TOKEN,
    ci:process.env.CI==="true",
    sleep:()=>new Promise(resolve=>setTimeout(resolve,1000)),
  });
  await mkdir(outputDir,{recursive:true});
  await writeFile(join(outputDir,"phase17-operational-readiness.json"),
    JSON.stringify({...report,checkedAt:new Date().toISOString()},null,2)+"\n",
    {mode:0o600});
  console.log("Phase 17 operational probe PASS:",report.scope,
    report.checks.join(","),"(no customer/pilot release approval)");
}catch(error){
  // Never echo potentially sensitive HTTP errors, response bodies, origins or tokens.
  const code=error instanceof Error&&/^[A-Z_]+$/.test(error.message)?
    error.message:"PROBE_FAILED";
  console.error("Phase 17 operational probe BLOCKED:",code);
  process.exitCode=1;
}
