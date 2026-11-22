import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { workspaceAccess } from "@/lib/tenant";
import { apiError } from "@/lib/http";
export async function GET(_request:NextRequest,{params}:{params:Promise<{reportId:string}>}){
  const {reportId}=await params;
  const report=await db.savingsReport.findUnique({where:{id:reportId}});
  if(!report)return apiError("Not found",404);
  const access=await workspaceAccess(report.workspaceId);
  if(!access.ok)return apiError(access.error,access.status);
  if(access.workspace.organizationId!==report.organizationId)return apiError("Not found",404);
  await db.auditLog.create({data:{organizationId:report.organizationId,actorId:access.user.id,
    action:"REPORT_EXPORTED",subjectType:"SavingsReport",subjectId:report.id,
    metadata:{workspaceId:report.workspaceId,format:"markdown"}}});
  return new NextResponse(report.markdown,{headers:{"Content-Type":"text/markdown; charset=utf-8",
    "Content-Disposition":'attachment; filename="contextops-ai-assessment.md"',
    "Cache-Control":"private, no-store"}});
}
