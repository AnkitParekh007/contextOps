import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { workspaceAccess } from "@/lib/tenant";
import { apiError, handleApiError } from "@/lib/http";
import { originAllowed, enforceRateLimit } from "@/lib/security";

/** Deletes one authorized workspace and all tenant-scoped domain records using FK cascades. */
export async function DELETE(request:NextRequest,{params}:{params:Promise<{workspaceId:string}>}){
  if(!originAllowed(request))return apiError("Invalid request origin",403);
  const {workspaceId}=await params;
  const access=await workspaceAccess(workspaceId);
  if(!access.ok)return apiError(access.error,access.status);
  if(!["OWNER","ADMIN"].includes(access.membership.role))
    return apiError("Only an organization owner or admin may delete a workspace",403);
  try{
    if(!await enforceRateLimit("workspace-delete",access.user.id,5))return apiError("Try again later",429);
    const data=z.object({confirmation:z.string()}).parse(await request.json());
    if(data.confirmation!=="DELETE "+access.workspace.name)
      return apiError("Type the exact workspace confirmation phrase",422);
    await db.$transaction(async tx=>{
      // All domain tables use FK references to Workspace; deletion cascades inside this transaction.
      await tx.workspace.delete({where:{id:workspaceId,organizationId:access.workspace.organizationId}});
      await tx.auditLog.create({data:{
        organizationId:access.workspace.organizationId,actorId:access.user.id,
        action:"WORKSPACE_DATA_DELETED",subjectType:"Workspace",subjectId:workspaceId,
        metadata:{workspaceName:access.workspace.name,erasureScope:"workspace_domain_records"},
      }});
    });
    return NextResponse.json({deleted:true,workspaceId});
  }catch(error){return handleApiError(error);}
}
