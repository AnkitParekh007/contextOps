"use client";
import {useState,type FormEvent} from "react";
import {useRouter} from "next/navigation";
import {KeyRound,LogOut} from "lucide-react";

export function RevokeSessionsForm(){
  const router=useRouter();
  const [password,setPassword]=useState("");
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  async function submit(event:FormEvent<HTMLFormElement>){
    event.preventDefault();
    setBusy(true);setError("");
    try{
      const res=await fetch("/api/auth/revoke-all",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({password}),
      });
      if(!res.ok){
        const body=await res.json().catch(()=>({error:"Cannot revoke sessions"}));
        setError(body.error??"Cannot revoke sessions");
        return;
      }
      setPassword("");
      router.replace("/login?reason=sessions-revoked");
      router.refresh();
    }catch{
      setError("Connection failed. Please try again.");
    }finally{
      setBusy(false);
    }
  }
  return <form onSubmit={submit} className="mt-6 max-w-lg space-y-4">
    <label className="block text-sm font-semibold text-ink" htmlFor="confirm-password">
      Confirm your password
      <span className="mt-2 flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3">
        <KeyRound size={17} className="shrink-0 text-slate-400"/>
        <input id="confirm-password" type="password" minLength={1} maxLength={128}
          autoComplete="current-password" required value={password}
          onChange={event=>setPassword(event.target.value)}
          className="w-full min-w-0 bg-transparent py-3 outline-none"
          placeholder="Your account password"/>
      </span>
    </label>
    {error&&<p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    <button type="submit" disabled={busy} className="inline-flex items-center gap-2 rounded-xl
      bg-ink px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-40">
      <LogOut size={17}/>{busy?"Revoking sessions…":"Sign out every device"}
    </button>
    <p className="text-xs leading-relaxed text-slate-500">This immediately invalidates every active
      ContextOps browser session, including this one. You will need to sign in again.</p>
  </form>;
}
