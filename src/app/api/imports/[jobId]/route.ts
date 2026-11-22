import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { workspaceAccess } from "@/lib/tenant";
import { apiError } from "@/lib/http";
export async function GET(_request:NextRequest,{params}:{params:Promise<{jobId:string}>}){
  const {jobId}=await params;
  const job=await db.importJob.findUnique({where:{id:jobId},select:{
    id:true,workspaceId:true,organizationId:true,status:true,total:true,processed:true,
    rejected:true,issues:true,createdAt:true,completedAt:true,
  }});
  if(!job)return apiError("Not found",404);
  const access=await workspaceAccess(job.workspaceId);
  if(!access.ok)return apiError(access.error,access.status);
  if(access.workspace.organizationId!==job.organizationId)return apiError("Not found",404);
  return NextResponse.json({job});
}
