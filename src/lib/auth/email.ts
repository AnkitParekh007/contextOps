import "server-only";
import {createHash,randomBytes} from "node:crypto";
import {mkdir,writeFile} from "node:fs/promises";
import {join} from "node:path";
import {db} from "@/lib/db";

export type ChallengePurpose="VERIFY"|"RESET";
export const emailRequired=()=>process.env.NODE_ENV==="production";
const ciMailbox=(address:string)=>process.env.CI==="true"&&
  process.env.APP_URL==="http://localhost:3000"&&address.endsWith("@example.test");
export function mailConfigured(address:string){
  return ciMailbox(address)||
    (Boolean(process.env.RESEND_API_KEY?.startsWith("re_"))&&Boolean(process.env.EMAIL_FROM)&&
      Boolean(process.env.APP_URL?.startsWith("https://")));
}
export function hashToken(token:string){
  return createHash("sha256").update(token).digest("hex");
}
export function isValidToken(value:unknown):value is string{
  return typeof value==="string"&&/^[a-f0-9]{64}$/.test(value);
}
export function ciCapturePath(address:string){
  return join("/tmp/contextops-ci-mail",hashToken(address)+".json");
}
async function deliverEmail(address:string,purpose:ChallengePurpose,url:string){
  if(ciMailbox(address)){
    await mkdir("/tmp/contextops-ci-mail",{recursive:true,mode:0o700});
    await writeFile(ciCapturePath(address),JSON.stringify({purpose,url}),{mode:0o600});
    return;
  }
  if(!mailConfigured(address))throw Error("Transactional email service is not configured");
  const label=purpose==="VERIFY"?"Confirm your ContextOps email":"Reset your ContextOps password";
  const res=await fetch("https://api.resend.com/emails",{
    method:"POST",headers:{
      Authorization:"Bearer "+process.env.RESEND_API_KEY,
      "Content-Type":"application/json",
    },
    body:JSON.stringify({
      from:process.env.EMAIL_FROM,to:[address],subject:label,
      text:label+"\n\n"+url+"\n\nThis link expires soon. If you did not request it, ignore this email.",
    }),signal:AbortSignal.timeout(12000),
  });
  if(!res.ok)throw Error("Email provider rejected transactional delivery");
}
/** Raw tokens are delivered only out-of-band, never returned by the API or written into DB. */
export async function sendChallenge(user:{id:string;email:string},purpose:ChallengePurpose){
  const token=randomBytes(32).toString("hex");
  const expiresAt=new Date(Date.now()+(purpose==="VERIFY"?60:15)*60*1000);
  const row=await db.authChallenge.create({data:{
    userId:user.id,purpose,tokenHash:hashToken(token),expiresAt,
  }});
  try{
    const target=purpose==="VERIFY"?"verify-email":"reset-password";
    const url=new URL("/"+target,process.env.APP_URL??"http://localhost:3000");
    url.searchParams.set("token",token);
    await deliverEmail(user.email,purpose,url.toString());
  }catch(error){
    await db.authChallenge.deleteMany({where:{id:row.id}});
    throw error;
  }
}
