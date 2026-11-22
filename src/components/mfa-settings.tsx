"use client";
import {useState,type FormEvent} from "react";
import {useRouter} from "next/navigation";
import {Copy,KeyRound,ShieldCheck,ShieldOff} from "lucide-react";

type Enrollment={secret:string;otpauthUrl:string}|null;
export function MfaSettings({initiallyEnabled}:{initiallyEnabled:boolean}){
  const router=useRouter();
  const [enabled,setEnabled]=useState(initiallyEnabled);
  const [password,setPassword]=useState("");
  const [code,setCode]=useState("");
  const [enrollment,setEnrollment]=useState<Enrollment>(null);
  const [recoveryCodes,setRecoveryCodes]=useState<string[]>([]);
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState("");
  const [error,setError]=useState("");
  async function call(path:string,body:Record<string,string>){
    const response=await fetch("/api/auth/mfa/"+path,{
      method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body),
    });
    const data=await response.json().catch(()=>({}));
    if(!response.ok)throw Error(data.error||"Authenticator request failed");
    return data;
  }
  async function submit(event:FormEvent<HTMLFormElement>,action:"setup"|"confirm"|"disable"){
    event.preventDefault();setBusy(true);setMessage("");setError("");
    try{
      if(action==="setup"){
        const data=await call(action,{password});
        setEnrollment({secret:data.secret,otpauthUrl:data.otpauthUrl});
        setPassword("");setCode("");
        setMessage("Add this secret in an authenticator app, then enter its next code.");
      }else if(action==="confirm"){
        const data=await call(action,{code});
        setRecoveryCodes(data.recoveryCodes);
        setEnrollment(null);setEnabled(true);setCode("");
        setMessage("Authenticator enabled. Save your one-time recovery codes now.");
        router.refresh();
      }else{
        await call(action,{password,code});
        router.replace("/login?reason=mfa-updated");router.refresh();
      }
    }catch(e){setError(e instanceof Error?e.message:"Request failed");}
    finally{setBusy(false);}
  }
  return <section className="mt-7 rounded-2xl border border-slate-200 bg-white p-7">
    <div className="flex items-start gap-4">
      <span className="rounded-xl bg-soft p-3 text-brand">
        {enabled?<ShieldCheck size={22}/>:<KeyRound size={22}/>}</span>
      <div><h2 className="text-xl font-bold">Authenticator verification</h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          {enabled?"Two-factor authentication is enabled. A current code is required when signing in.":
            "Add a second factor with a standards-based authenticator app. Password recovery does not bypass MFA."}
        </p></div>
    </div>
    {error&&<p role="alert" className="mt-5 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    {message&&<p role="status" className="mt-5 rounded-xl bg-blue-50 p-3 text-sm text-blue-900">{message}</p>}
    {recoveryCodes.length>0&&<div className="mt-6 rounded-xl border border-amber-300 bg-amber-50 p-5">
      <h3 className="font-bold">Save these recovery codes now</h3>
      <p className="mt-2 text-xs leading-relaxed text-amber-900">
        Each code works exactly once. These codes will not be shown again. Save them privately, not in screenshots or GitHub.</p>
      <div className="mt-4 grid grid-cols-2 gap-3 font-mono text-xs">
        {recoveryCodes.map(c=><span key={c}>{c}</span>)}</div>
      <button className="mt-4 inline-flex items-center gap-2 text-xs font-bold text-brand"
        type="button" onClick={()=>navigator.clipboard.writeText(recoveryCodes.join("\n"))}>
        <Copy size={15}/> Copy all codes</button>
    </div>}
    {!enabled&&!enrollment&&<form onSubmit={e=>submit(e,"setup")} className="mt-6 max-w-lg space-y-4">
      <label className="block text-sm font-semibold">Confirm your password
        <input className="mt-2 block w-full rounded-xl border border-slate-300 p-3" type="password"
          autoComplete="current-password" required value={password} onChange={e=>setPassword(e.target.value)}/>
      </label>
      <button className="rounded-xl bg-brand px-5 py-3 text-sm font-bold text-white disabled:opacity-50"
        type="submit" disabled={busy}>Set up authenticator</button>
    </form>}
    {!enabled&&enrollment&&<form onSubmit={e=>submit(e,"confirm")} className="mt-6 max-w-lg space-y-4">
      <p className="text-sm text-slate-600">Use your authenticator app's manual account setup,
        or copy the provisioning URL. Do not publish either value.</p>
      <div className="rounded-lg bg-slate-100 p-4">
        <span className="block text-xs font-semibold text-slate-600">Secret key (one-time display)</span>
        <code className="mt-2 block break-all text-sm">{enrollment.secret}</code>
        <button type="button" className="mt-3 text-xs font-bold text-brand"
          onClick={()=>navigator.clipboard.writeText(enrollment.otpauthUrl)}>Copy authenticator setup URI</button>
      </div>
      <label className="block text-sm font-semibold">Current six-digit code
        <input className="mt-2 block w-full rounded-xl border border-slate-300 p-3" type="text"
          inputMode="numeric" pattern="[0-9]{6}" autoComplete="one-time-code"
          required value={code} onChange={e=>setCode(e.target.value)}/>
      </label>
      <button className="rounded-xl bg-brand px-5 py-3 text-sm font-bold text-white disabled:opacity-50"
        type="submit" disabled={busy}>Enable two-factor authentication</button>
    </form>}
    {enabled&&<form onSubmit={e=>submit(e,"disable")} className="mt-6 max-w-lg space-y-4">
      <p className="text-xs leading-relaxed text-slate-500">
        To disable MFA, confirm both your password and authenticator/recovery code.
        You will be signed out of every device.</p>
      <label className="block text-sm font-semibold">Password
        <input className="mt-2 block w-full rounded-xl border border-slate-300 p-3" type="password"
          autoComplete="current-password" required value={password}
          onChange={e=>setPassword(e.target.value)}/>
      </label>
      <label className="block text-sm font-semibold">Authenticator or recovery code
        <input className="mt-2 block w-full rounded-xl border border-slate-300 p-3"
          autoComplete="one-time-code" required value={code} onChange={e=>setCode(e.target.value)}/>
      </label>
      <button type="submit" disabled={busy}
        className="inline-flex items-center gap-2 rounded-xl border border-red-300 px-5 py-3 text-sm font-semibold text-red-700 disabled:opacity-50">
        <ShieldOff size={16}/> Disable authenticator and sign out
      </button>
    </form>}
  </section>;
}
