import {NextRequest,NextResponse} from "next/server";
import {z} from "zod";
import {compare} from "bcryptjs";
import {db} from "@/lib/db";
import {sendChallenge,mailConfigured} from "@/lib/auth/email";
import {originAllowed,enforceRateLimit} from "@/lib/security";
import {apiError,handleApiError} from "@/lib/http";
const generic=()=>NextResponse.json({ok:true,message:"If your account is eligible, a new confirmation link will be sent."},
  {headers:{"Cache-Control":"no-store"}});
export async function POST(request:NextRequest){
  if(!originAllowed(request))return apiError("Invalid request origin",403);
  try{
    const body=z.object({email:z.string().trim().email().transform(v=>v.toLowerCase()),
      password:z.string().min(1)}).parse(await request.json());
    if(!await enforceRateLimit("resend-verification",body.email,4))
      return apiError("Try again later",429);
    const user=await db.user.findUnique({where:{email:body.email}});
    if(user&&!user.emailVerifiedAt&&await compare(body.password,user.passwordHash)&&mailConfigured(user.email)){
      await sendChallenge(user,"VERIFY");
    }
    return generic();
  }catch(error){return handleApiError(error);}
}
