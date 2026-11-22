"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const cases = [
  ["SUPPORT_CLASSIFICATION", "Customer support classification"],
  ["DOCUMENT_EXTRACTION", "Invoice / document extraction"],
  ["POLICY_QA", "Internal policy Q&A"],
  ["SALES_FOLLOW_UP", "Sales follow-up generation"],
  ["LEAD_QUALIFICATION", "Lead qualification"],
  ["OTHER", "Other"],
];
export function OnboardingForm() {
  const router=useRouter(); const [companyName,setCompanyName]=useState("");
  const [name,setName]=useState("My first workflow");
  const [useCase,setUseCase]=useState("SUPPORT_CLASSIFICATION");
  const [provider,setProvider]=useState("ANTHROPIC");
  const [modelName,setModelName]=useState("Claude Sonnet");
  const [error,setError]=useState(""); const [busy,setBusy]=useState(false);
  async function submit(e: FormEvent) {
    e.preventDefault(); setBusy(true); setError("");
    try {
      const res=await fetch("/api/organizations",{
        method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({companyName,workspace:{name,useCase,provider,modelName}}),
      });
      const body=await res.json();
      if(!res.ok){setError(body.error??"Could not create workspace");return;}
      router.replace("/dashboard");router.refresh();
    }catch{setError("Connection failed. Please try again.");}finally{setBusy(false);}
  }
  return <form onSubmit={submit} className="space-y-6">
    <div className="grid gap-5 sm:grid-cols-2">
      <label className="block text-sm font-semibold text-ink">Company name<Input className="mt-2" required minLength={2} maxLength={120} value={companyName} onChange={e=>setCompanyName(e.target.value)} placeholder="Northwind Logistics"/></label>
      <label className="block text-sm font-semibold text-ink">Workflow name<Input className="mt-2" required minLength={2} maxLength={120} value={name} onChange={e=>setName(e.target.value)}/></label>
    </div>
    <label className="block text-sm font-semibold text-ink">Primary AI workflow
      <select value={useCase} onChange={e=>setUseCase(e.target.value)} className="mt-2 h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm focus:border-brand focus:outline-none">
        {cases.map(([value,label])=><option key={value} value={value}>{label}</option>)}
      </select>
    </label>
    <div className="grid gap-5 sm:grid-cols-2">
      <label className="block text-sm font-semibold text-ink">Current provider
        <select value={provider} onChange={e=>setProvider(e.target.value)} className="mt-2 h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm focus:border-brand focus:outline-none">
          {["ANTHROPIC","OPENAI","GOOGLE","OTHER"].map(value=><option key={value}>{value}</option>)}
        </select>
      </label>
      <label className="block text-sm font-semibold text-ink">Current model<Input required minLength={2} maxLength={120} className="mt-2" value={modelName} onChange={e=>setModelName(e.target.value)} placeholder="Your existing production model"/></label>
    </div>
    <div className="flex items-start gap-3 rounded-2xl bg-soft p-4 text-sm leading-relaxed text-ink"><ShieldCheck className="mt-0.5 shrink-0 text-brand" size={19}/> This phase stores workspace settings only. We will ask for explicit authorization, explain redaction and retention, and obtain provider consent before future trace ingestion or external AI processing.</div>
    {error&&<p className="rounded-xl bg-red-50 p-3 text-sm text-red-700" role="alert">{error}</p>}
    <Button type="submit" disabled={busy} size="lg">{busy?"Creating…":"Create workspace"} <ArrowRight size={18}/></Button>
  </form>;
}
