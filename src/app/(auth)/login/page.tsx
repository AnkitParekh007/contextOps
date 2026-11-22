import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth-form";
import { Brand } from "@/components/brand";
import { Card } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/session";
export const metadata: Metadata = { title: "Sign in" };
export default async function Login() {
  if (await getCurrentUser()) redirect("/dashboard");
  return <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-5 py-12"><div className="mb-10 text-center"><Brand/><h1 className="mt-8 text-3xl font-bold tracking-tight">Welcome back</h1><p className="mt-2 text-slate-500">Sign in to your ContextOps workspace.</p></div><Card className="p-8"><AuthForm mode="login"/></Card><p className="mt-7 text-center text-sm"><Link className="text-slate-500 hover:text-brand" href="/">← Back to home</Link></p></main>;
}
