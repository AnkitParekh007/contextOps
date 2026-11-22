import assert from "node:assert/strict";
import {randomUUID} from "node:crypto";
import {PrismaClient} from "@prisma/client";
import {cleanExpiredData} from "../src/lib/retention";

if(process.env.CI!=="true"||process.env.APP_URL!=="http://localhost:3000")
  throw Error("This destructive recovery test runs only against synthetic ephemeral CI");
const db=new PrismaClient();
const nonce=randomUUID().slice(0,10);
async function main(){
try{
  const user=await db.user.create({data:{
    email:"retention-"+nonce+"@example.test",name:"Retention Fixture",
    passwordHash:"not-used-in-login",emailVerifiedAt:new Date(),
  }});
  const org=await db.organization.create({data:{name:"Retention "+nonce,slug:"retention-"+nonce}});
  await db.membership.create({data:{userId:user.id,organizationId:org.id,role:"OWNER"}});
  const workspace=await db.workspace.create({data:{
    organizationId:org.id,name:"Expired Fixture",slug:"expired-fixture",
    modelName:"mock-premium",provider:"OTHER",useCase:"SUPPORT_CLASSIFICATION",
    retentionUntil:new Date(Date.now()-3600_000),
  }});
  await db.executionTrace.create({data:{
    organizationId:org.id,workspaceId:workspace.id,externalTraceId:"retained-trace",
    timestamp:new Date(),taskType:"support_ticket_classification",
    modelProvider:"MOCK",modelName:"mock-premium",inputTokens:10,
    outputTokens:1,latencyMs:100,status:"success",
  }});
  await db.authSession.create({data:{userId:user.id,expiresAt:new Date(Date.now()-86400_000)}});
  const first=await cleanExpiredData(db);
  assert.ok(first.workspaces>=1);
  assert.ok(first.sessions>=1);
  assert.equal(await db.workspace.findUnique({where:{id:workspace.id}}),null);
  assert.equal(await db.executionTrace.count({where:{workspaceId:workspace.id}}),0);
  assert.equal(await db.auditLog.count({where:{
    organizationId:org.id,action:"WORKSPACE_RETENTION_PURGED",subjectId:workspace.id,
  }}),1);
  const second=await cleanExpiredData(db);
  assert.equal(second.workspaces,0,"Retention cleanup must be idempotent");
  console.log("Phase 11 retention smoke PASS: explicit expiry cascades domain data, retains minimal audit evidence, and cleans expired sessions");
}finally{await db.$disconnect();}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
