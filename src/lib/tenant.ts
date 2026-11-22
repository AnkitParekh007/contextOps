import "server-only";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { canWriteWorkspace } from "@/lib/permissions";
export async function workspaceAccess(workspaceId:string,write=false){
  const user=await getCurrentUser();if(!user)return {error:"Unauthorized",status:401} as const;
  const workspace=await db.workspace.findUnique({where:{id:workspaceId}});
  if(!workspace)return {error:"Not found",status:404} as const;
  const membership=await db.membership.findUnique({where:{
    userId_organizationId:{userId:user.id,organizationId:workspace.organizationId},
  }});
  if(!membership)return {error:"Not found",status:404} as const;
  if(write&&!canWriteWorkspace(membership.role)&&membership.role!=="ANALYST")
    return {error:"Insufficient permissions",status:403} as const;
  return {user,workspace,membership} as const;
}
export type AuthorizedWorkspace=Extract<Awaited<ReturnType<typeof workspaceAccess>>,{workspace:object}>;
