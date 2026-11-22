import {createHmac,randomBytes,timingSafeEqual,createHash} from "node:crypto";
const BASE32="ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
export function generateTotpSecret(){
  const bytes=randomBytes(20);
  let n=0,bits=0,out="";
  for(const b of bytes){
    n=(n<<8)|b;bits+=8;
    while(bits>=5){bits-=5;out+=BASE32[(n>>>bits)&31];}
    n&=(1<<bits)-1;
  }
  if(bits)out+=BASE32[(n<<(5-bits))&31];
  return out;
}
function decode32(s:string){
  if(!/^[A-Z2-7]{16,64}$/.test(s))throw Error("Invalid authenticator secret");
  let n=0,bits=0;const b:number[]=[];
  for(const c of s){n=(n<<5)|BASE32.indexOf(c);bits+=5;
    if(bits>=8){bits-=8;b.push((n>>>bits)&255);n&=(1<<bits)-1;}
  }
  return Buffer.from(b);
}
export function totpAt(secret:string,counter:number){
  if(!Number.isInteger(counter)||counter<0)throw Error("Invalid counter");
  const value=Buffer.alloc(8);value.writeBigUInt64BE(BigInt(counter));
  const hash=createHmac("sha1",decode32(secret)).update(value).digest();
  const offset=hash[hash.length-1]&15;
  const code=(hash.readUInt32BE(offset)&0x7fffffff)%1_000_000;
  return String(code).padStart(6,"0");
}
export function matchingTotpCounter(secret:string,code:string,now=Date.now()):number|null{
  if(!/^\d{6}$/.test(code))return null;
  const current=Math.floor(now/30000);
  const received=Buffer.from(code);
  for(const offset of [-1,0,1]){
    const counter=current+offset;
    if(counter<0)continue;
    const expected=Buffer.from(totpAt(secret,counter));
    if(timingSafeEqual(expected,received))return counter;
  }
  return null;
}
export function recoveryHash(code:string){
  const normalized=code.replaceAll("-","").toUpperCase();
  if(!/^[0-9A-F]{20}$/.test(normalized))return null;
  return createHash("sha256").update(normalized).digest("hex");
}
export function makeRecoveryCodes(count=8){
  return Array.from({length:count},()=>randomBytes(10).toString("hex").toUpperCase()
    .replace(/(.{5})(?=.)/g,"$1-"));
}
