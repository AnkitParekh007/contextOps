import type {PrismaClient} from "@prisma/client";

export const RETENTION_MIN_DAYS=7;
export const RETENTION_MAX_DAYS=90;
export function expirationFromDays(days:number,now=new Date()){
  if(!Number.isInteger(days)||days<RETENTION_MIN_DAYS||days>RETENTION_MAX_DAYS)
    throw Error("Retention duration must be 7–90 days");
  return new Date(now.getTime()+days*24*60*60*1000);
}
/** Only explicitly scheduled workspaces are removed. Audit trail survives the cascade. */
export async function cleanExpiredData(db:PrismaClient,now=new Date()){
  const day=24*60*60*1000;
  const [sessions,challenges,recovery]=await Promise.all([
    db.authSession.deleteMany({where:{OR:[
      {expiresAt:{lt:now}},{revokedAt:{lt:new Date(now.getTime()-day)}},
    ]}}),
    db.authChallenge.deleteMany({where:{OR:[
      {expiresAt:{lt:now}},{consumedAt:{lt:new Date(now.getTime()-day)}},
    ]}}),
    db.mfaRecoveryCode.deleteMany({where:{
      consumedAt:{lt:new Date(now.getTime()-30*day)},
    }}),
  ]);
  const expired=await db.workspace.findMany({
    where:{retentionUntil:{lte:now}},
    select:{id:true,name:true,organizationId:true,retentionUntil:true},
    orderBy:{retentionUntil:"asc"},take:20,
  });
  let workspaces=0;
  for(const item of expired){
    await db.$transaction(async tx=>{
      const done=await tx.workspace.deleteMany({where:{
        id:item.id,retentionUntil:{lte:now},
      }});
      if(!done.count)return;
      await tx.auditLog.create({data:{
        organizationId:item.organizationId,actorId:null,
        action:"WORKSPACE_RETENTION_PURGED",subjectType:"Workspace",
        subjectId:item.id,metadata:{source:"opt_in_retention",policy:"whole_workspace",
          retentionUntil:item.retentionUntil?.toISOString()??null},
      }});
      workspaces++;
    });
  }
  return {sessions:sessions.count,challenges:challenges.count,
    recoveryCodes:recovery.count,workspaces};
}
