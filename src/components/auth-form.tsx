"use client";
import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function AuthForm({ mode }: { mode: "register" | "login" }) {
  const router = useRouter();
  const [name, setName] = useState(""); const [email, setEmail] = useState("");
  const [password, setPassword] = useState(""); const [mfaCode,setMfaCode]=useState(""); const [inviteCode, setInviteCode] = useState(""); const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(e: FormEvent) {
    e.preventDefault(); setBusy(true); setError("");
    try {
      const res = await fetch("/api/auth/" + mode, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(mode === "register" ? { name, email, password, inviteCode } : { email, password, mfaCode }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Unable to continue"); return; }
      router.push(mode === "register" ? (data.verificationRequired ? "/check-email" : "/onboarding") : "/dashboard");
      router.refresh();
    } catch { setError("Connection failed. Please try again."); } finally { setBusy(false); }
  }
  return <form onSubmit={submit} className="space-y-5">
    {mode === "register" && <label className="block text-sm font-semibold text-ink">Full name<Input required autoComplete="name" placeholder="Your name" value={name} onChange={e=>setName(e.target.value)} className="mt-2"/></label>}
    <label className="block text-sm font-semibold text-ink">Work email<Input required type="email" autoComplete="email" placeholder="you@company.com" value={email} onChange={e=>setEmail(e.target.value)} className="mt-2"/></label>
    <label className="block text-sm font-semibold text-ink">Password<Input required minLength={mode === "register" ? 12 : 1} type="password" autoComplete={mode==="register"?"new-password":"current-password"} placeholder="••••••••••••" value={password} onChange={e=>setPassword(e.target.value)} className="mt-2"/>
      {mode === "register" && <span className="mt-2 block text-xs font-normal text-slate-500">12+ characters, with upper- and lowercase letters and a number.</span>}
    </label>
    {mode === "register" && <label className="block text-sm font-semibold text-ink">Pilot invitation code (required for hosted pilots)
      <Input autoComplete="off" placeholder="Code provided by the pilot operator" value={inviteCode} onChange={e=>setInviteCode(e.target.value)} className="mt-2"/>
      <span className="mt-2 block text-xs font-normal text-slate-500">Hosted pilot accounts are invitation-only. For local development, this field can be left blank.</span>
    </label>}
    {mode === "login" && <label className="block text-sm font-semibold text-ink">
      Authenticator or recovery code (if enabled)
      <Input autoComplete="one-time-code" inputMode="text" placeholder="6-digit code or recovery code"
        value={mfaCode} onChange={e=>setMfaCode(e.target.value)} className="mt-2"/>
    </label>}
    {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    <Button disabled={busy} className="w-full" type="submit">{busy?"Working…":mode==="register"?"Create your account":"Sign in"} <ArrowRight size={17}/></Button>
    {mode==="login"&&<div className="flex flex-wrap justify-center gap-4 text-xs font-semibold">
      <Link href="/forgot-password" className="text-brand">Forgot password?</Link>
      <Link href="/check-email" className="text-brand">Resend verification</Link>
    </div>}
    <p className="text-center text-sm text-slate-500">{mode==="register"?"Already have an account?":"New to ContextOps?"} <Link className="font-semibold text-brand hover:underline" href={mode==="register"?"/login":"/register"}>{mode==="register"?"Sign in":"Get started"}</Link></p>
  </form>;
}
