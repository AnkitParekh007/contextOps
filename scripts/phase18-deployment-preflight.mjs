#!/usr/bin/env node
/**
 * Phase 18: static, read-only hosted configuration preflight.
 * This does not provision services, perform network calls, or authorize a pilot.
 */
import {pathToFileURL} from "node:url";

const badHost = host => !host || host==="localhost" || host==="127.0.0.1" ||
  host==="0.0.0.0" || host==="::1" || host.endsWith(".localhost");
const placeholder = value => !value || /REPLACE_|YOUR_|CHANGE_ME|EXAMPLE|PLACEHOLDER/i.test(value);

function parseUrl(value,protocols,requirePath=false){
  try {
    const u=new URL(value);
    if(!protocols.includes(u.protocol)||badHost(u.hostname)||u.hash||u.searchParams.has("token"))
      return null;
    if(requirePath && (!u.pathname || u.pathname==="/")) return null;
    return u;
  }catch{return null;}
}
const accepted = (value,length=32) =>
  typeof value==="string" && value.length>=length && !placeholder(value) &&
  !/^([a-z0-9])\1+$/i.test(value);

export const checks=[
  "deployment_target","release_identity","database_target","redis_target",
  "auth_secrets","invitation_secret","email_sender","operator_monitor",
  "external_provider_lock","release_approval_boundary",
];

export function assessHostedPreflight(env){
  const status={};
  const origin=parseUrl(env.APP_URL,["https:"]);
  status.deployment_target=Boolean(origin && origin.origin===env.APP_URL &&
    !origin.username && !origin.password && origin.pathname==="/");
  status.release_identity=/^[a-f0-9]{40}$/.test(env.CONTEXTOPS_RELEASE_SHA??"");

  const db=parseUrl(env.DATABASE_URL,["postgresql:","postgres:"],true);
  status.database_target=Boolean(db && accepted(decodeURIComponent(db.password),8) &&
    db.username && !placeholder(db.hostname) && !db.hostname.endsWith(".example"));
  const redis=parseUrl(env.REDIS_URL,["redis:","rediss:"]);
  status.redis_target=Boolean(redis && !placeholder(redis.hostname) &&
    !redis.hostname.endsWith(".example"));

  status.auth_secrets=accepted(env.AUTH_SECRET,32) &&
    /^[a-f0-9]{64}$/i.test(env.MFA_ENCRYPTION_KEY??"") &&
    new Set([env.AUTH_SECRET,env.MFA_ENCRYPTION_KEY]).size===2 &&
    !placeholder(env.MFA_ENCRYPTION_KEY);
  status.invitation_secret=accepted(env.PILOT_INVITE_CODE,32) &&
    env.PILOT_INVITE_CODE!==env.AUTH_SECRET;
  const email=env.EMAIL_FROM??"";
  status.email_sender=accepted(env.RESEND_API_KEY,16) &&
    /^[^\r\n<>]+<[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+>$/.test(email) &&
    !/example|localhost/i.test(email);
  status.operator_monitor=accepted(env.OPS_MONITOR_TOKEN,32) &&
    ![env.AUTH_SECRET,env.PILOT_INVITE_CODE,env.MFA_ENCRYPTION_KEY].includes(env.OPS_MONITOR_TOKEN);
  status.external_provider_lock=env.ENABLE_EXTERNAL_BENCHMARKS==="false" &&
    !env.OPENAI_API_KEY && !env.ANTHROPIC_API_KEY;
  // Static preflight cannot assert a real approval, expenditure permission, or DPA.
  status.release_approval_boundary=true;
  const failedChecks=checks.filter(name=>status[name]!==true);
  return {
    schemaVersion:1,phase:18,status:failedChecks.length?"BLOCKED":"CONFIG_READY_ONLY",
    checks:checks.map(name=>({name,status:status[name]?"PASS":"BLOCKED"})),
    failedChecks,
    deploymentApproved:false,productionApproved:false,customerDataApproved:false,
    paidProviderCallsApproved:false,verifiedSavings:false,
    externalHumanApprovalRequired:true,
  };
}

if(process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href){
  const result=assessHostedPreflight(process.env);
  // Only emit names/booleans. Never serialize process.env or connection strings.
  console.log(JSON.stringify(result,null,2));
  if(result.status!=="CONFIG_READY_ONLY")process.exitCode=1;
}
