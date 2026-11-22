"use client";
import {useState,type FormEvent} from "react";
import Link from "next/link";

type Action="verification"|"request-reset"|"verify-email"|"reset-password";
export function EmailAuthForm({action,token=""}:{action:Action;token?:string}){
  const [email,setEmail]=useState("");
  const [password,setPassword]=useState("");
  const [error,setError]=useState("");
  const [result,setResult]=useState("");
  const [busy,setBusy]=useState(false);
  const [recoveryPassword,setRecoveryPassword]=useState("");
  const [confirmPassword,setConfirmPassword]=useState("");
  const endpoints:Record<Action,string>={
    verification:"/api/auth/request-verification",
    "request-reset":"/api/auth/request-reset",
    "verify-email":"/api/auth/verify-email",
    "reset-password":"/api/auth/reset-password",
  };
  const validToken=/^[a-f0-9]{64}$/.test(token);
  async function submit(event:FormEvent<HTMLFormElement>){
    event.preventDefault();setBusy(true);setError("");setResult("");
    if((action==="verify-email"||action==="reset-password")&&!validToken){
      setError("This confirmation link is invalid.");setBusy(false);return;
    }
    if(action==="reset-password"&&recoveryPassword!==confirmPassword){
      setError("New passwords do not match.");setBusy(false);return;
    }
    const body=action==="verification"?{email,password}:
      action==="request-reset"?{email}:
      action==="verify-email"?{token}:{token,password:recoveryPassword};
    try{
      const response=await fetch(endpoints[action],{
        method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify(body),
      });
      const data=await response.json().catch(()=>({error:"Request unavailable"}));
      if(!response.ok){setError(data.error??"Request could not be completed");return;}
      setResult(data.message??"Request completed");
      setPassword("");setRecoveryPassword("");setConfirmPassword("");
    }catch{setError("Connection failed. Try again.");}
    finally{setBusy(false);}
  }
  const tokenAction=action==="verify-email"||action==="reset-password";
  return <form onSubmit={submit} className="mt-7 space-y-4">
    {!tokenAction&&<label className="block text-sm font-semibold">Email
      <input required type="email" autoComplete="email" value={email}
        onChange={e=>setEmail(e.target.value)}
        className="mt-2 block w-full rounded-xl border border-slate-300 bg-white p-3"/>
    </label>}
    {action==="verification"&&<label className="block text-sm font-semibold">Account password
      <input required type="password" autoComplete="current-password" value={password}
        onChange={e=>setPassword(e.target.value)}
        className="mt-2 block w-full rounded-xl border border-slate-300 bg-white p-3"/>
    </label>}
    {action==="reset-password"&&<>
      <label className="block text-sm font-semibold">New password
        <input required type="password" autoComplete="new-password" minLength={12}
          value={recoveryPassword} onChange={e=>setRecoveryPassword(e.target.value)}
          className="mt-2 block w-full rounded-xl border border-slate-300 bg-white p-3"/>
      </label>
      <label className="block text-sm font-semibold">Confirm new password
        <input required type="password" autoComplete="new-password" minLength={12}
          value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)}
          className="mt-2 block w-full rounded-xl border border-slate-300 bg-white p-3"/>
      </label>
      <p className="text-xs text-slate-500">Use 12+ characters, upper- and lowercase letters and a number.
        If MFA is enabled, your authenticator or recovery code is still required to sign in.</p>
    </>}
    {error&&<p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    {result&&<p role="status" className="rounded-lg bg-blue-50 p-3 text-sm text-blue-900">{result}</p>}
    <button type="submit" disabled={busy||(tokenAction&&!validToken)}
      className="w-full rounded-xl bg-brand p-3 text-sm font-bold text-white disabled:opacity-50">
      {busy?"Submitting…":action==="verification"?"Resend verification email":
        action==="request-reset"?"Request recovery link":
        action==="verify-email"?"Confirm my email":"Change password"}
    </button>
    <Link href="/login" className="block text-center text-sm font-semibold text-brand">Back to sign in</Link>
  </form>;
}
