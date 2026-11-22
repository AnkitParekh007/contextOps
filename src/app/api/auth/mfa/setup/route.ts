import {NextRequest,NextResponse} from "next/server";
import {z} from "zod";
import {compare} from "bcryptjs";
import {db} from "@/lib/db";
import {getCurrentUser} from "@/lib/session";
import {encryptFactor} from "@/lib/auth/mfa";
import {generateTotpSecret} from "@/lib/auth/totp";
import {originAllowed,enforceRateLimit} from "@/lib/security";
import {apiError,handleApiError} from "@/lib/http";
export async function POST(request:NextRequest){
  if(!originAllowed(request))return apiError("Invalid request origin",403);
  const user=await getCurrentUser();
  if(!user)return apiError("Unauthorized",401);
  try{
    if(!await enforceRateLimit("mfa-setup",user.id,5))return apiError("Try again later",429);
    const {password}=z.object({password:z.string().min(1).max(128)}).parse(await request.json());
    const account=await db.user.findUnique({where:{id:user.id}});
    if(!account||!await compare(password,account.passwordHash))
      return apiError("Password confirmation failed",401);
    if(account.mfaEnabledAt)return apiError("Authenticator is already enabled",409);
    const secret=generateTotpSecret();
    await db.user.update({where:{id:user.id},data:{mfaPendingEncrypted:encryptFactor(secret)}});
    const uri="otpauth://totp/"+encodeURIComponent("ContextOps AI:"+user.email)+
      "?secret="+secret+"&issuer="+encodeURIComponent("ContextOps AI")+
      "&algorithm=SHA1&digits=6&period=30";
    return NextResponse.json({secret,otpauthUrl:uri,
      message:"Add the account to your authenticator and confirm with a new six-digit code."},
      {headers:{"Cache-Control":"private, no-store"}});
  }catch(error){return handleApiError(error);}
}
