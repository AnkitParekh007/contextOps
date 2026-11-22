import {NextRequest,NextResponse} from "next/server";
import {compare} from "bcryptjs";
import {z} from "zod";
import {db} from "@/lib/db";
import {getCurrentUser,revokeAllSessions} from "@/lib/session";
import {originAllowed,enforceRateLimit} from "@/lib/security";
import {apiError,handleApiError} from "@/lib/http";

/** Password-confirmed emergency termination of all sessions including current. */
export async function POST(request:NextRequest){
  if(!originAllowed(request))return apiError("Invalid request origin",403);
  const user=await getCurrentUser();
  if(!user)return apiError("Unauthorized",401);
  try{
    if(!await enforceRateLimit("revoke-sessions",user.id,5))return apiError("Try again later",429);
    const body=z.object({password:z.string().min(1).max(128)}).parse(await request.json());
    const account=await db.user.findUnique({where:{id:user.id},select:{passwordHash:true}});
    if(!account||!await compare(body.password,account.passwordHash))
      return apiError("Password confirmation failed",401);
    const revoked=await revokeAllSessions(user.id);
    return NextResponse.json({ok:true,revoked});
  }catch(error){return handleApiError(error);}
}
