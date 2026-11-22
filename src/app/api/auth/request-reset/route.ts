import {NextRequest,NextResponse} from "next/server";
import {z} from "zod";
import {db} from "@/lib/db";
import {sendChallenge,mailConfigured} from "@/lib/auth/email";
import {originAllowed,enforceRateLimit} from "@/lib/security";
import {apiError,handleApiError} from "@/lib/http";
const generic=()=>NextResponse.json({ok:true,message:"If the account exists, password recovery instructions will be sent."},
  {headers:{"Cache-Control":"no-store"}});
export async function POST(request:NextRequest){
  if(!originAllowed(request))return apiError("Invalid request origin",403);
  try{
    const body=z.object({email:z.string().trim().email().max(320).transform(v=>v.toLowerCase())})
      .parse(await request.json());
    if(!await enforceRateLimit("password-reset",body.email,4))
      return apiError("Try again later",429);
    const user=await db.user.findUnique({where:{email:body.email}});
    if(user&&mailConfigured(user.email)){
      try{await sendChallenge(user,"RESET");}
      catch{ /* Generic response does not reveal account existence or provider state. */ }
    }
    return generic();
  }catch(error){return handleApiError(error);}
}
