/**
 * End-to-end Phase 1 smoke check against a running app + PostgreSQL + Redis.
 * Uses only synthetic accounts; safe for an ephemeral CI database.
 */
import assert from "node:assert/strict";
import { randomUUID,createHash,createHmac } from "node:crypto";
import {readFile} from "node:fs/promises";
async function capture(email){
  const id=createHash("sha256").update(email).digest("hex");
  return JSON.parse(await readFile("/tmp/contextops-ci-mail/"+id+".json","utf8"));
}
async function finishVerification(email){
  const message=await capture(email);
  assert.equal(message.purpose,"VERIFY");
  const token=new URL(message.url).searchParams.get("token");
  const result=await call("/api/auth/verify-email",{method:"POST",body:{token}});
  assert.equal(result.status,200,JSON.stringify(result.json));
  const replay=await call("/api/auth/verify-email",{method:"POST",body:{token}});
  assert.equal(replay.status,400,"Verification link must not be reusable");
}


const base = process.env.APP_URL ?? "http://localhost:3000";
const nonce = randomUUID().slice(0, 12);
const password = "Strong_Example_12345";
async function call(path, { method = "GET", body, cookie } = {}) {
  const res = await fetch(base + path, {
    method,
    headers: {
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(cookie ? { Cookie: cookie } : {}),
      Origin: base,
    },
    body: body ? JSON.stringify(body) : undefined,
    redirect: "manual",
  });
  const json = await res.json();
  return { status: res.status, json, cookie: res.headers.get("set-cookie")?.split(";")[0] };
}
const a = await call("/api/auth/register", {
  method: "POST", body: { name: "Synthetic Owner", email: "owner-" + nonce + "@example.test", password, inviteCode: process.env.PILOT_INVITE_CODE },
});
assert.equal(a.status, 201, JSON.stringify(a.json));
assert.equal(a.json.verificationRequired,true);
const ownerEmail="owner-"+nonce+"@example.test";
const unverified=await call("/api/auth/login",{method:"POST",body:{email:ownerEmail,password}});
assert.equal(unverified.status,403,"Email verification must precede hosted access");
await finishVerification(ownerEmail);
const ownerLogin=await call("/api/auth/login",{method:"POST",body:{email:ownerEmail,password}});
assert.equal(ownerLogin.status,200,JSON.stringify(ownerLogin.json));
const cookieA=ownerLogin.cookie;
assert.ok(cookieA?.startsWith("contextops_session="));
const me = await call("/api/me", { cookie: cookieA });
assert.equal(me.status, 200);
assert.equal(me.json.user.name, "Synthetic Owner");

const org = await call("/api/organizations", { method: "POST", cookie: cookieA, body: {
  companyName: "Demo Tenant Alpha",
  workspace: { name: "Support Triage", useCase: "SUPPORT_CLASSIFICATION", provider: "ANTHROPIC", modelName: "Claude Sonnet" },
} });
assert.equal(org.status, 201, JSON.stringify(org.json));
const orgId = org.json.organization.id;
assert.ok(orgId);
const list = await call("/api/organizations", { cookie: cookieA });
assert.equal(list.status, 200);
assert.ok(list.json.organizations.some(o => o.id === orgId && o.role === "OWNER"));
const workspace = await call("/api/organizations/" + orgId + "/workspaces", { cookie: cookieA });
assert.equal(workspace.status, 200);
assert.equal(workspace.json.workspaces.length, 1);

const b = await call("/api/auth/register", {
  method: "POST", body: { name: "Synthetic Outsider", email: "outsider-" + nonce + "@example.test", password, inviteCode: process.env.PILOT_INVITE_CODE },
});
assert.equal(b.status, 201, JSON.stringify(b.json));
const outsiderEmail="outsider-"+nonce+"@example.test";
await finishVerification(outsiderEmail);
const outsider=await call("/api/auth/login",{method:"POST",body:{email:outsiderEmail,password}});
assert.equal(outsider.status,200);
assert.equal((await call("/api/organizations/" + orgId + "/workspaces", { cookie: outsider.cookie })).status, 404);
assert.equal((await call("/api/organizations/" + orgId + "/workspaces", { method: "POST", cookie: outsider.cookie,
  body: { name: "Intrusion", useCase: "OTHER", provider: "OTHER", modelName: "No model" } })).status, 404);

const logout = await call("/api/auth/logout", { method: "POST", cookie: cookieA });
assert.equal(logout.status, 200);
assert.equal((await call("/api/me", { cookie: logout.cookie })).status, 401);
assert.equal((await call("/api/me", { cookie: cookieA })).status, 401,
  "Reusing the original pre-logout JWT must not revive a revoked server session");

const loginBad = await call("/api/auth/login", { method: "POST",
  body: { email: outsiderEmail, password: "not-the-password" } });
assert.equal(loginBad.status, 401);
const login = await call("/api/auth/login", { method: "POST",
  body: { email: "owner-" + nonce + "@example.test", password } });
assert.equal(login.status, 200);
assert.equal((await call("/api/me", { cookie: login.cookie })).status, 200);
const session2 = await call("/api/auth/login", {
  method: "POST", body: { email: "owner-" + nonce + "@example.test", password },
});
assert.equal(session2.status, 200, JSON.stringify(session2.json));
assert.equal((await call("/api/me", { cookie: session2.cookie })).status, 200);
const wrongRevoke = await call("/api/auth/revoke-all", { method: "POST",
  cookie: login.cookie, body: { password: "incorrect_password" },
});
assert.equal(wrongRevoke.status, 401);
assert.equal((await call("/api/me", { cookie: login.cookie })).status, 200);
const revoke = await call("/api/auth/revoke-all", { method: "POST",
  cookie: login.cookie, body: { password },
});
assert.equal(revoke.status, 200);
assert.ok(revoke.json.revoked >= 2, "Both active browser sessions should be revoked");
assert.equal((await call("/api/me", { cookie: login.cookie })).status, 401,
  "First stolen session cookie remains invalid");
assert.equal((await call("/api/me", { cookie: session2.cookie })).status, 401,
  "Second device session remains invalid");
console.log("Phase 11 auth smoke PASS: per-device logout invalidates stolen JWT, password-confirmed global revocation closes every active session");

const verifiedLogin=await call("/api/auth/login",{
  method:"POST",body:{email:ownerEmail,password},
});
assert.equal(verifiedLogin.status,200);
const setup=await call("/api/auth/mfa/setup",{method:"POST",cookie:verifiedLogin.cookie,body:{password}});
assert.equal(setup.status,200,JSON.stringify(setup.json));
assert.match(setup.json.secret,/^[A-Z2-7]{32}$/);
const secret=setup.json.secret;
function base32Bytes(s){
  const alphabet="ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let n=0,bits=0;const arr=[];
  for(const c of s){
    n=(n<<5)|alphabet.indexOf(c);bits+=5;
    if(bits>=8){bits-=8;arr.push((n>>>bits)&255);n&=(1<<bits)-1;}
  }
  return Buffer.from(arr);
}
function totp(counter){
  const challenge=Buffer.alloc(8);
  challenge.writeBigUInt64BE(BigInt(counter));
  const hash=createHmac("sha1",base32Bytes(secret)).update(challenge).digest();
  const offset=hash[19]&15;
  return String((hash.readUInt32BE(offset)&0x7fffffff)%1000000).padStart(6,"0");
}
const counter=Math.floor(Date.now()/30000);
const confirm=await call("/api/auth/mfa/confirm",{method:"POST",cookie:verifiedLogin.cookie,
  body:{code:totp(counter)}});
assert.equal(confirm.status,200,JSON.stringify(confirm.json));
assert.equal(confirm.json.recoveryCodes.length,8);
const mfaMissing=await call("/api/auth/login",{method:"POST",body:{email:ownerEmail,password}});
assert.equal(mfaMissing.status,401,"MFA must be mandatory after setup");
const useOne=await call("/api/auth/login",{method:"POST",body:{
  email:ownerEmail,password,mfaCode:confirm.json.recoveryCodes[0],
}});
assert.equal(useOne.status,200,JSON.stringify(useOne.json));
const replayRecovery=await call("/api/auth/login",{method:"POST",body:{
  email:ownerEmail,password,mfaCode:confirm.json.recoveryCodes[0],
}});
assert.equal(replayRecovery.status,401,"MFA recovery code cannot be reused");
const requestReset=await call("/api/auth/request-reset",{method:"POST",body:{email:ownerEmail}});
assert.equal(requestReset.status,200);
const resetMail=await capture(ownerEmail);
assert.equal(resetMail.purpose,"RESET");
const resetToken=new URL(resetMail.url).searchParams.get("token");
const changedPassword="AnotherStrongPassword_12345";
const reset=await call("/api/auth/reset-password",{method:"POST",
  body:{token:resetToken,password:changedPassword}});
assert.equal(reset.status,200,JSON.stringify(reset.json));
const resetReplay=await call("/api/auth/reset-password",{method:"POST",
  body:{token:resetToken,password:"AgainStrongPassword_45678"}});
assert.equal(resetReplay.status,400,"Recovery token cannot be reused");
const stale=await call("/api/me",{cookie:useOne.cookie});
assert.equal(stale.status,401,"Password reset must revoke existing sessions");
const passwordOnly=await call("/api/auth/login",{method:"POST",body:{
  email:ownerEmail,password:changedPassword,
}});
assert.equal(passwordOnly.status,401,"Password reset must not bypass MFA");
const recovered=await call("/api/auth/login",{method:"POST",body:{
  email:ownerEmail,password:changedPassword,mfaCode:confirm.json.recoveryCodes[1],
}});
assert.equal(recovered.status,200,JSON.stringify(recovered.json));
console.log("Phase 11 identity smoke PASS: verified email, single-use links, MFA, one-time backup codes, password recovery and session revocation");
