import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Brand } from "@/components/brand";
import { Card } from "@/components/ui/card";
import { OnboardingForm } from "@/components/onboarding-form";
import { getCurrentUser } from "@/lib/session";
export const metadata: Metadata = { title: "Create a workspace" };
export default async function Onboarding() {
  if (!await getCurrentUser()) redirect("/login");
  return <main className="mx-auto max-w-3xl px-5 py-12"><Brand href="/dashboard"/><div className="mb-8 mt-14"><p className="text-sm font-bold uppercase tracking-widest text-brand">Step 01 / Workspace setup</p><h1 className="mt-3 text-4xl font-bold tracking-tight">Tell us about your AI workflow.</h1><p className="mt-3 max-w-xl text-slate-600">Start with one company and one workflow. No AI traces or API keys are required yet.</p></div><Card className="p-7 sm:p-9"><OnboardingForm/></Card></main>;
}
