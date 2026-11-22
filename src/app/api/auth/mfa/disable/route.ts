import {NextRequest,NextResponse} from "next/server";
import {z} from "zod";
import {compare} from "bcryptjs";
import {db} from "@/lib/db";
import {getCurrentUser,revokeAllSessions} from "@/lib/session";
import {consumeMfaCode} from "@/lib/auth/mfa";
import {originAllowed,enforceRateLimit} from "@/lib/security";
import {apiError,handleApiError} from "@/lib/http";
export async function POST(request:NextRequest){
  if(!originAllowed(request))return apiError("Invalid request origin",403);
  const user=await getCurrentUser();
  if(!user)return apiError("Unauthorized",401);
  try{
    if(!await enforceRateLimit("mfa-disable",user.id,5))return apiError("Try again later",429);
    const body=z.object({password:z.string().min(1).max(128),code:z.string().min(6).max(40)})
      .parse(await request.json());
    const account=await db.user.findUnique({where:{id:user.id}});
    if(!account?.mfaEnabledAt||!account.mfaSecretEncrypted)
      return apiError("Authenticator is not enabled",409);
    if(!await compare(body.password,account.passwordHash)||!await consumeMfaCode(account,body.code))
      return apiError("Invalid account credentials",401);
    await db.$transaction(async tx=>{
      await tx.user.update({where:{id:user.id},data:{
        mfaEnabledAt:null,mfaSecretEncrypted:null,mfaPendingEncrypted:null,mfaLastCounter:null,
      }});
      await tx.mfaRecoveryCode.deleteMany({where:{userId:user.id}});
    });
    await revokeAllSessions(user.id);
    return NextResponse.json({ok:true,message:"Authenticator disabled and every device signed out"},
      {headers:{"Cache-Control":"private, no-store"}});
  }catch(error){return handleApiError(error);}
}
