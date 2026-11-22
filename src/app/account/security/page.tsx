import type {Metadata} from "next";
import Link from "next/link";
import {redirect} from "next/navigation";
import {ShieldCheck,ArrowLeft} from "lucide-react";
import {Brand} from "@/components/brand";
import {getCurrentUser} from "@/lib/session";
import {db} from "@/lib/db";
import {Card} from "@/components/ui/card";
import {RevokeSessionsForm} from "@/components/revoke-sessions-form";

export const metadata:Metadata={title:"Account security"};
export default async function SecurityPage(){
  const user=await getCurrentUser();
  if(!user)redirect("/login");
  const active=await db.authSession.count({
    where:{userId:user.id,revokedAt:null,expiresAt:{gt:new Date()}},
  });
  return <main className="min-h-screen bg-canvas">
    <div className="mx-auto max-w-4xl px-5 py-10">
      <div className="flex items-center justify-between"><Brand href="/dashboard"/>
        <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm font-semibold text-brand">
          <ArrowLeft size={16}/> Dashboard</Link></div>
      <div className="mt-12"><p className="text-xs font-bold uppercase tracking-widest text-brand">
        PILOT ACCOUNT PROTECTION</p>
        <h1 className="mt-3 text-4xl font-bold tracking-tight">Account security</h1>
        <p className="mt-3 leading-relaxed text-slate-600">Your sign-in is protected by a
          server-verifiable session. A copied cookie can no longer be reused after logout.</p></div>
      <Card className="mt-8 p-7">
        <div className="flex items-start gap-4"><span className="rounded-xl bg-soft p-3 text-brand">
          <ShieldCheck size={23}/></span>
          <div><h2 className="text-xl font-bold">Manage signed-in devices</h2>
            <p className="mt-2 text-sm text-slate-600">
              Active sessions: <strong>{active}</strong>. Sessions also expire after seven days.
              If you suspect unauthorized access, revoke all sessions immediately.</p></div></div>
        <RevokeSessionsForm/>
      </Card>
      <p className="mt-6 text-xs leading-relaxed text-slate-500">
        This pilot does not yet implement email recovery, MFA or enterprise SSO.
        Avoid uploading confidential or regulated data.</p>
    </div>
  </main>;
}
