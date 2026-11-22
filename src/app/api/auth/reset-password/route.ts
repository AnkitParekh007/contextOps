import {NextRequest,NextResponse} from "next/server";
import {z} from "zod";
import {hash} from "bcryptjs";
import {db} from "@/lib/db";
import {hashToken,isValidToken} from "@/lib/auth/email";
import {registerSchema} from "@/lib/validation";
import {originAllowed,enforceRateLimit} from "@/lib/security";
import {apiError,handleApiError} from "@/lib/http";
export async function POST(request:NextRequest){
  if(!originAllowed(request))return apiError("Invalid request origin",403);
  try{
    const {token,password}=z.object({
      token:z.string(),password:registerSchema.shape.password,
    }).parse(await request.json());
    if(!isValidToken(token))return apiError("Invalid or expired recovery link",400);
    if(!await enforceRateLimit("reset-confirm",hashToken(token),8))return apiError("Try again later",429);
    const passwordHash=await hash(password,12);
    const now=new Date();
    const success=await db.$transaction(async tx=>{
      const row=await tx.authChallenge.findUnique({where:{tokenHash:hashToken(token)}});
      if(!row||row.purpose!=="RESET"||row.consumedAt||row.expiresAt<=now)return false;
      const changed=await tx.authChallenge.updateMany({where:{
        id:row.id,consumedAt:null,expiresAt:{gt:now},
      },data:{consumedAt:now}});
      if(!changed.count)return false;
      await tx.user.update({where:{id:row.userId},data:{passwordHash}});
      await tx.authSession.updateMany({where:{userId:row.userId,revokedAt:null},
        data:{revokedAt:now}});
      await tx.authChallenge.updateMany({where:{
        userId:row.userId,purpose:"RESET",consumedAt:null,
      },data:{consumedAt:now}});
      return true;
    });
    if(!success)return apiError("Invalid or expired recovery link",400);
    return NextResponse.json({ok:true,message:"Password updated. Sign in again; MFA remains enabled."},
      {headers:{"Cache-Control":"no-store"}});
  }catch(error){return handleApiError(error);}
}
