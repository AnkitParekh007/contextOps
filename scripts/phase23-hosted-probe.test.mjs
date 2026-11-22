import {test} from "node:test";
import {strict as assert} from "node:assert";
import {runPhase23Probe,validatePinnedHost} from "./phase23-hosted-probe.mjs";

const origin="http://localhost:3000",sha="a".repeat(40);
const token="test-monitor-token-abcdefghijklmnopqrstuvwxyz";
const response=(status,body)=>({
  status,headers:new Headers({"content-type":"application/json",
    "cache-control":"private, no-store","x-content-type-options":"nosniff"}),
  json:async()=>body,
});
function fakeFetch(identity=sha){
  return async(url,options)=>{
    const path=new URL(url).pathname;
    if(path==="/api/ops/release")
      return response(200,{status:"ok",releaseSha:identity});
    if(path==="/api/health"||path==="/api/ready")
      return response(200,{status:"ok"});
    if(path==="/api/ops/status"){
      if(!options.headers.Authorization)return response(401,{error:"Unauthorized"});
      return response(200,{status:"ok",ready:true,
        customerDataVerified:false,externalBenchmarksEnabled:false,
        queue:{queued:0},issueCodes:[]});
    }
    throw Error("unexpected endpoint");
  };
}
const options=()=>({
  origin,registered:origin,token,expectedSha:sha,ci:true,
  fetcher:fakeFetch(),samples:2,sleep:async()=>{},
});
test("synthetic read-only checks never grant live approval",async()=>{
  const r=await runPhase23Probe(options());
  assert.equal(r.scope,"synthetic_ci_only");
  assert.equal(r.status,"READ_ONLY_CHECKS_PASSED");
  for(const key of ["stagingApproved","pilotAuthorized","productionApproved",
    "customerDataApproved","paidProviderCallsApproved","backupRestoreVerified",
    "independentDeploymentAttestation"])assert.equal(r[key],false);
  assert.equal(JSON.stringify(r).includes(sha),false);
  assert.equal(JSON.stringify(r).includes(token),false);
});
test("wrong deployed SHA stops acceptance before operational checks",async()=>{
  let calls=0;
  const o=options();
  o.fetcher=async(...args)=>{calls++;return fakeFetch("b".repeat(40))(...args);};
  await assert.rejects(runPhase23Probe(o),/RELEASE_IDENTITY_MISMATCH/);
  assert.equal(calls,1);
});
test("target validation rejects unrelated, lookalike, non-staging and HTTP domains",()=>{
  for(const url of [
    "https://staging.example.org.evil.com",
    "https://production.example.org",
    "http://staging.example.org",
    "https://attacker-staging.net",
  ])assert.throws(()=>validatePinnedHost(url,url,"example.org"),/(?:HOST_|TARGET_NOT_APPROVED)/);
  assert.equal(validatePinnedHost(
    "https://staging.example.org","https://staging.example.org","example.org").scope,
    "private_hosted_read_only");
});
test("CI localhost requires explicit synthetic selector",()=>{
  assert.throws(()=>validatePinnedHost(origin,origin,"",false),/TARGET_NOT_APPROVED/);
  assert.equal(validatePinnedHost(origin,origin,"",true).scope,"synthetic_ci_only");
});
test("invalid expected SHA and monitor token fail before any request",async()=>{
  const o=options();o.expectedSha="main";
  await assert.rejects(runPhase23Probe(o),/INVALID_EXPECTED_SHA/);
  const bad=options();bad.token="short";
  await assert.rejects(runPhase23Probe(bad),/INVALID_OPERATOR_TOKEN/);
});
test("unexpected authenticated identity payload is rejected",async()=>{
  const o=options();
  o.fetcher=async(url,opts)=>new URL(url).pathname==="/api/ops/release"?
    response(200,{status:"ok",releaseSha:sha,token:"sensitive"}):
    fakeFetch()(url,opts);
  await assert.rejects(runPhase23Probe(o),/RELEASE_IDENTITY_MISMATCH/);
});
