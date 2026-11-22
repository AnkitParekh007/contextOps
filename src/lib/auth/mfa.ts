import "server-only";
import {createCipheriv,createDecipheriv,randomBytes} from "node:crypto";
import {db} from "@/lib/db";
import {matchingTotpCounter,recoveryHash} from "./totp";

function key(){
  const hex=process.env.MFA_ENCRYPTION_KEY;
  if(!hex||!/^[a-fA-F0-9]{64}$/.test(hex))throw Error("Set a separate 32-byte MFA_ENCRYPTION_KEY in private secrets");
  return Buffer.from(hex,"hex");
}
export function encryptFactor(secret:string){
  const iv=randomBytes(12);
  const cipher=createCipheriv("aes-256-gcm",key(),iv);
  const ciphertext=Buffer.concat([cipher.update(secret,"utf8"),cipher.final()]);
  return [iv.toString("base64url"),cipher.getAuthTag().toString("base64url"),
    ciphertext.toString("base64url")].join(".");
}
export function decryptFactor(data:string){
  const [iv,tag,ciphertext]=data.split(".");
  if(!iv||!tag||!ciphertext)throw Error("Invalid MFA secret");
  const decipher=createDecipheriv("aes-256-gcm",key(),Buffer.from(iv,"base64url"));
  decipher.setAuthTag(Buffer.from(tag,"base64url"));
  return Buffer.concat([decipher.update(Buffer.from(ciphertext,"base64url")),
    decipher.final()]).toString("utf8");
}
/** Enforces one use per time step or one-use recovery code with atomic DB updates. */
export async function consumeMfaCode(user:{
  id:string;mfaSecretEncrypted:string|null;
},code:string){
  if(!user.mfaSecretEncrypted)return false;
  const token=code.trim().toUpperCase();
  if(/^\d{6}$/.test(token)){
    const counter=matchingTotpCounter(decryptFactor(user.mfaSecretEncrypted),token);
    if(counter===null)return false;
    const updated=await db.user.updateMany({where:{
      id:user.id,mfaSecretEncrypted:{not:null},
      OR:[{mfaLastCounter:null},{mfaLastCounter:{lt:counter}}],
    },data:{mfaLastCounter:counter}});
    return updated.count===1;
  }
  const digest=recoveryHash(token);
  if(!digest)return false;
  const used=await db.mfaRecoveryCode.updateMany({where:{
    userId:user.id,codeHash:digest,consumedAt:null,
  },data:{consumedAt:new Date()}});
  return used.count===1;
}
