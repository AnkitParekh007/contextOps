import {NextRequest,NextResponse} from "next/server";
import {z} from "zod";
import {db} from "@/lib/db";
import {getCurrentUser} from "@/lib/session";
import {decryptFactor} from "@/lib/auth/mfa";
import {matchingTotpCounter,makeRecoveryCodes,recoveryHash} from "@/lib/auth/totp";
import {originAllowed,enforceRateLimit} from "@/lib/security";
import {apiError,handleApiError} from "@/lib/http";
export async function POST(request:NextRequest){
  if(!originAllowed(request))return apiError("Invalid request origin",403);
  const user=await getCurrentUser();
  if(!user)return apiError("Unauthorized",401);
  try{
    if(!await enforceRateLimit("mfa-confirm",user.id,12))return apiError("Try again later",429);
    const {code}=z.object({code:z.string().regex(/^\d{6}$/)}).parse(await request.json());
    const account=await db.user.findUnique({where:{id:user.id}});
    if(!account?.mfaPendingEncrypted||account.mfaEnabledAt)
      return apiError("Start authenticator setup first",409);
    const counter=matchingTotpCounter(decryptFactor(account.mfaPendingEncrypted),code);
    if(counter===null)return apiError("Authenticator code is invalid",401);
    const recoveryCodes=makeRecoveryCodes();
    const success=await db.$transaction(async tx=>{
      const updated=await tx.user.updateMany({where:{
        id:user.id,mfaEnabledAt:null,mfaPendingEncrypted:account.mfaPendingEncrypted,
      },data:{mfaSecretEncrypted:account.mfaPendingEncrypted,
        mfaPendingEncrypted:null,mfaEnabledAt:new Date(),mfaLastCounter:counter}});
      if(!updated.count)return false;
      await tx.mfaRecoveryCode.deleteMany({where:{userId:user.id}});
      await tx.mfaRecoveryCode.createMany({data:recoveryCodes.map(code=>({
        userId:user.id,codeHash:recoveryHash(code)!,
      }))});
      return true;
    });
    if(!success)return apiError("Authenticator enrollment changed",409);
    return NextResponse.json({ok:true,recoveryCodes,
      warning:"Save these codes in a secure place. They will never be displayed again."},
      {headers:{"Cache-Control":"private, no-store"}});
  }catch(error){return handleApiError(error);}
}
