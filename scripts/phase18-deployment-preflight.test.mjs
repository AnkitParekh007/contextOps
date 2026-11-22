import {test} from "node:test";
import {strict as assert} from "node:assert";
import {assessHostedPreflight,checks} from "./phase18-deployment-preflight.mjs";

const valid=()=>({
  APP_URL:"https://pilot.contextops.test",
  CONTEXTOPS_RELEASE_SHA:"a".repeat(40),
  DATABASE_URL:"postgresql://service:strong-postgres-password@private-db.internal:5432/contextops",
  REDIS_URL:"redis://private-redis.internal:6379",
  AUTH_SECRET:"A".repeat(48)+"-auth",
  MFA_ENCRYPTION_KEY:"ab".repeat(32),
  PILOT_INVITE_CODE:"B".repeat(48)+"-invite",
  RESEND_API_KEY:"re_live_"+ "c".repeat(32),
  EMAIL_FROM:"ContextOps Security <security@contextops.test>",
  OPS_MONITOR_TOKEN:"D".repeat(48)+"-monitor",
  ENABLE_EXTERNAL_BENCHMARKS:"false",
  OPENAI_API_KEY:"",ANTHROPIC_API_KEY:"",
});
test("synthetic complete config remains unapproved",()=>{
  const report=assessHostedPreflight(valid());
  assert.equal(report.status,"CONFIG_READY_ONLY");
  assert.equal(report.checks.length,checks.length);
  assert.equal(report.deploymentApproved,false);
  assert.equal(report.customerDataApproved,false);
  assert.equal(report.paidProviderCallsApproved,false);
  assert.equal(JSON.stringify(report).includes("strong-postgres-password"),false);
});
test("missing config fails closed without exposing values",()=>{
  const report=assessHostedPreflight({});
  assert.equal(report.status,"BLOCKED");
  assert.equal(report.failedChecks.length,checks.length-1);
});
test("rejects localhost and URL manipulation",()=>{
  for(const url of ["http://pilot.contextops.test","https://localhost","https://pilot.contextops.test.evil.com/path","https://pilot.contextops.test/?token=oops","https://user:pass@pilot.contextops.test"]){
    const report=assessHostedPreflight({...valid(),APP_URL:url});
    assert.ok(report.failedChecks.includes("deployment_target"),url);
  }
});
test("rejects inappropriate service and secret settings",()=>{
  const invalid=[
    {DATABASE_URL:"postgresql://service:p@localhost:5432/contextops"},
    {REDIS_URL:"redis://127.0.0.1:6379"},
    {MFA_ENCRYPTION_KEY:"REPLACE_WITH_64_RANDOM_HEX_CHARACTERS"},
    {PILOT_INVITE_CODE:"same"},
    {RESEND_API_KEY:""},
    {EMAIL_FROM:"ContextOps <security@example.com>"},
    {OPS_MONITOR_TOKEN:"REPLACE_ME"},
    {ENABLE_EXTERNAL_BENCHMARKS:"true"},
    {OPENAI_API_KEY:"test-key"},
    {CONTEXTOPS_RELEASE_SHA:"unknown"},
  ];
  for(const item of invalid)assert.equal(assessHostedPreflight({...valid(),...item}).status,"BLOCKED",Object.keys(item)[0]);
});
test("preflight is stable and provides no dynamic approval override",()=>{
  const v={...valid(),DEPLOYMENT_APPROVED:"true",PRODUCTION_APPROVED:"true"};
  assert.equal(assessHostedPreflight(v).deploymentApproved,false);
  assert.equal(assessHostedPreflight(v).productionApproved,false);
});
