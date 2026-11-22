import {NextRequest,NextResponse} from "next/server";
import {z} from "zod";
import {db} from "@/lib/db";
import {hashToken,isValidToken} from "@/lib/auth/email";
import {originAllowed,enforceRateLimit} from "@/lib/security";
import {apiError,handleApiError} from "@/lib/http";

export async function POST(request:NextRequest){
  if(!originAllowed(request))return apiError("Invalid request origin",403);
  try{
    const {token}=z.object({token:z.string()}).parse(await request.json());
    if(!isValidToken(token))return apiError("Invalid or expired confirmation link",400);
    if(!await enforceRateLimit("confirm-email",hashToken(token),12))
      return apiError("Try again later",429);
    const now=new Date();
    const valid=await db.$transaction(async tx=>{
      const row=await tx.authChallenge.findUnique({where:{tokenHash:hashToken(token)}});
      if(!row||row.purpose!=="VERIFY"||row.consumedAt||row.expiresAt<=now)return false;
      const changed=await tx.authChallenge.updateMany({where:{
        id:row.id,consumedAt:null,expiresAt:{gt:now}
      },data:{consumedAt:now}});
      if(!changed.count)return false;
      await tx.user.update({where:{id:row.userId},data:{emailVerifiedAt:now}});
      return true;
    });
    if(!valid)return apiError("Invalid or expired confirmation link",400);
    return NextResponse.json({ok:true,message:"Email verified. You can now sign in."},
      {headers:{"Cache-Control":"no-store"}});
  }catch(error){return handleApiError(error);}
}
