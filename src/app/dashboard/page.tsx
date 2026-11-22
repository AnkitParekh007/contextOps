import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, BarChart3, FileUp, FlaskConical, GitBranch, Plus, ShieldCheck } from "lucide-react";
import { Brand } from "@/components/brand";
import { LogoutButton } from "@/components/logout-button";
import { Card } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/session";
import { db } from "@/lib/db";
export const metadata: Metadata = { title: "Dashboard" };
const nextSteps = [
  { icon: FileUp, title: "Import execution traces", desc: "CSV and JSONL ingestion, schema mapping and redaction.", status: "Phase 2" },
  { icon: BarChart3, title: "Analyze workload", desc: "Understand recurring task categories and cost patterns.", status: "Phase 3" },
  { icon: FlaskConical, title: "Evaluate candidate models", desc: "Compare outputs using workflow-specific quality gates.", status: "Phase 5" },
  { icon: GitBranch, title: "Test routing in shadow mode", desc: "Measure projected impact without changing production.", status: "Phase 7" },
];
export default async function Dashboard() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const memberships = await db.membership.findMany({ where: { userId: user.id }, include: {
    organization: { include: { workspaces: { orderBy: { createdAt: "asc" } } } },
  }, orderBy: { createdAt: "asc" } });
  return <main className="min-h-screen">
    <header className="border-b border-slate-200 bg-white"><div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-5"><Brand href="/dashboard"/><div className="flex items-center gap-6"><span className="hidden text-sm text-slate-500 sm:block">{user.email}</span><LogoutButton/></div></div></header>
    <div className="mx-auto max-w-7xl px-5 py-12">
      <div className="flex flex-wrap items-start justify-between gap-5"><div><p className="text-sm font-bold uppercase tracking-widest text-brand">Workspace overview</p><h1 className="mt-3 text-4xl font-bold tracking-tight">Welcome, {user.name.split(" ")[0]}.</h1><p className="mt-3 text-slate-600">Your optimization journey starts with a trustworthy baseline.</p></div><Link href="/onboarding" className="inline-flex items-center gap-2 rounded-xl bg-brand px-5 py-3 font-semibold text-white hover:bg-[#095f58]"><Plus size={18}/> New company</Link></div>
      {memberships.length === 0 ? <Card className="mt-9 p-10"><h2 className="text-xl font-bold">Create your first workspace</h2><p className="mb-6 mt-2 text-slate-600">Track AI use cases and their model configurations in an isolated organization.</p><Link href="/onboarding" className="inline-flex items-center gap-2 font-semibold text-brand">Set up a workspace <ArrowRight size={16}/></Link></Card> :
        <div className="mt-9 grid gap-5 lg:grid-cols-2">{memberships.map(({ organization, role })=>
          <Card key={organization.id} className="overflow-hidden p-7"><div className="flex items-center justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-widest text-brand">{role}</p><h2 className="mt-2 text-2xl font-bold">{organization.name}</h2></div><ShieldCheck className="text-brand" size={26}/></div>
            <div className="mt-6 space-y-3">{organization.workspaces.map(w=><div className="rounded-2xl bg-canvas p-5" key={w.id}><p className="font-bold">{w.name}</p><p className="mt-1 text-sm text-slate-600">{w.useCase.replaceAll("_"," ")} · {w.provider} · {w.modelName}</p><p className="mt-2 text-xs text-slate-500">Ready for trace ingestion in Phase 2</p></div>)}</div>
          </Card>)}</div>}
      <div className="mt-14"><div className="mb-6 flex flex-wrap items-center justify-between gap-3"><h2 className="text-2xl font-bold">What&apos;s coming next</h2><span className="rounded-full bg-soft px-4 py-2 text-xs font-semibold text-brand">Phase 1 foundation</span></div><div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {nextSteps.map(step=><div key={step.title} className="rounded-2xl border border-slate-200 bg-white p-6"><step.icon size={25} className="text-brand"/><p className="mt-5 text-xs font-semibold uppercase tracking-widest text-slate-400">{step.status}</p><h3 className="mt-2 font-bold">{step.title}</h3><p className="mt-2 text-sm leading-relaxed text-slate-500">{step.desc}</p></div>)}
      </div></div>
      <p className="mt-12 text-xs text-slate-500">This is a foundation release. No trace analysis, cost projections, evaluation or shadow mode has been executed yet.</p>
    </div>
  </main>;
}
