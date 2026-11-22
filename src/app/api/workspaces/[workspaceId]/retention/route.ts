import {NextRequest,NextResponse} from "next/server";
import {z} from "zod";
import {db} from "@/lib/db";
import {workspaceAccess} from "@/lib/tenant";
import {originAllowed,enforceRateLimit} from "@/lib/security";
import {expirationFromDays} from "@/lib/retention";
import {apiError,handleApiError} from "@/lib/http";

type Context={params:Promise<{workspaceId:string}>};
export async function POST(request:NextRequest,{params}:Context){
  if(!originAllowed(request))return apiError("Invalid request origin",403);
  const {workspaceId}=await params;
  const access=await workspaceAccess(workspaceId);
  if(!access.ok)return apiError(access.error,access.status);
  if(!["OWNER","ADMIN"].includes(access.membership.role))
    return apiError("Owner or admin required",403);
  try{
    if(!await enforceRateLimit("retention",access.user.id,10))
      return apiError("Try again later",429);
    const body=z.discriminatedUnion("mode",[
      z.object({mode:z.literal("schedule"),days:z.number().int().min(7).max(90),
        confirmation:z.string()}),
      z.object({mode:z.literal("cancel"),confirmation:z.string()}),
    ]).parse(await request.json());
    const phrase=(body.mode==="cancel"?"CANCEL EXPIRY ":"EXPIRE ")+access.workspace.name;
    if(body.confirmation!==phrase)return apiError("Confirmation phrase does not match",422);
    const retentionUntil=body.mode==="cancel"?null:expirationFromDays(body.days);
    await db.$transaction(async tx=>{
      await tx.workspace.update({where:{id:workspaceId,organizationId:access.workspace.organizationId},
        data:{retentionUntil}});
      await tx.auditLog.create({data:{
        organizationId:access.workspace.organizationId,actorId:access.user.id,
        action:retentionUntil?"WORKSPACE_EXPIRY_SCHEDULED":"WORKSPACE_EXPIRY_CANCELED",
        subjectType:"Workspace",subjectId:workspaceId,
        metadata:retentionUntil?{retentionUntil:retentionUntil.toISOString(),
          policy:"entire_workspace"}:{policy:"canceled"},
      }});
    });
    return NextResponse.json({ok:true,retentionUntil,scope:"entire_workspace",
      warning:"Backups, exports and provider copies require separate retention handling"},
      {headers:{"Cache-Control":"private, no-store"}});
  }catch(error){return handleApiError(error);}
}
