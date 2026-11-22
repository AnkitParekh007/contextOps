import type {Metadata} from "next";
import Link from "next/link";
import {Brand} from "@/components/brand";
import {Card} from "@/components/ui/card";
import {EmailAuthForm} from "@/components/email-auth-form";
export const metadata:Metadata={title:"Check your inbox"};
export default async function CheckEmail(){
  
  return <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-5 py-12">
    <div className="mb-8 text-center"><Brand/>
      <h1 className="mt-8 text-3xl font-bold tracking-tight">Check your inbox</h1>
      <p className="mt-3 text-sm leading-relaxed text-slate-600">Registration needs a confirmed email address before you can access a hosted pilot. You can resend a link below with your email and password.</p></div>
    <Card className="p-7"><EmailAuthForm action="verification" /></Card>
    <p className="mt-6 text-center text-xs text-slate-500">
      No account, passwords, or private recovery tokens should be shared on GitHub Issues.
      <Link href="/" className="ml-2 font-semibold text-brand">Website</Link>
    </p>
  </main>;
}
