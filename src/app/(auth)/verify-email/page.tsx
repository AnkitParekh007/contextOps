import type {Metadata} from "next";
import Link from "next/link";
import {Brand} from "@/components/brand";
import {Card} from "@/components/ui/card";
import {EmailAuthForm} from "@/components/email-auth-form";
export const metadata:Metadata={title:"Verify your email"};
export default async function VerifyEmail({searchParams}:{searchParams:Promise<{token?:string}>}){
  const {token=''}=await searchParams;
  return <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-5 py-12">
    <div className="mb-8 text-center"><Brand/>
      <h1 className="mt-8 text-3xl font-bold tracking-tight">Verify your email</h1>
      <p className="mt-3 text-sm leading-relaxed text-slate-600">Confirm this one-time email link, then sign in.</p></div>
    <Card className="p-7"><EmailAuthForm action="verify-email" token={token}/></Card>
    <p className="mt-6 text-center text-xs text-slate-500">
      No account, passwords, or private recovery tokens should be shared on GitHub Issues.
      <Link href="/" className="ml-2 font-semibold text-brand">Website</Link>
    </p>
  </main>;
}
