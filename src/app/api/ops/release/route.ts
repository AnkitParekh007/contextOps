import {NextRequest,NextResponse} from "next/server";
import {monitorCredentialValid} from "@/lib/ops/health";

/** Authenticated operator-only deployment identity.
 * A configured SHA is an operator claim, not independent build attestation.
 * Never expose tokens, infrastructure URLs or customer data.
 */
export const dynamic="force-dynamic";
const headers={"Cache-Control":"private, no-store"};
export async function GET(request:NextRequest){
  const token=process.env.OPS_MONITOR_TOKEN;
  if(!token||token.length<32||token.startsWith("REPLACE_"))
    return NextResponse.json({status:"unavailable"},{status:503,headers});
  if(!monitorCredentialValid(token,request.headers.get("authorization")))
    return NextResponse.json({error:"Unauthorized"},{status:401,headers});
  const sha=process.env.CONTEXTOPS_RELEASE_SHA??"";
  if(!/^[a-f0-9]{40}$/.test(sha))
    return NextResponse.json({status:"unavailable"},{status:503,headers});
  return NextResponse.json({status:"ok",releaseSha:sha},{headers});
}
