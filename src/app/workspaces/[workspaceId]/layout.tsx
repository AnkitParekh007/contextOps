import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { BarChart3, BrainCircuit, Calculator, ClipboardCheck, Database, FileText, Gauge,
  GitBranch, Layers3, ScrollText, Settings2, ShieldCheck, Upload, FlaskConical } from "lucide-react";
import { Brand } from "@/components/brand";
import { LogoutButton } from "@/components/logout-button";
import { workspaceAccess } from "@/lib/tenant";
const links=[
  {slug:"overview",label:"Overview",icon:Gauge},
  {slug:"traces",label:"Execution traces",icon:Database},
  {slug:"imports",label:"Data imports",icon:Upload},
  {slug:"analysis",label:"Workload analysis",icon:BarChart3},
  {slug:"classifications",label:"Classification",icon:BrainCircuit},
  {slug:"calculator",label:"Savings calculator",icon:Calculator},
  {slug:"evaluations",label:"Model evaluations",icon:FlaskConical},
  {slug:"policies",label:"Routing policies",icon:GitBranch},
  {slug:"shadow",label:"Shadow simulations",icon:Layers3},
  {slug:"reviews",label:"Human reviews",icon:ClipboardCheck},
  {slug:"reports",label:"Savings reports",icon:FileText},
  {slug:"audit",label:"Audit log",icon:ScrollText},
  {slug:"settings",label:"Settings",icon:Settings2},
];
export default async function WorkspaceLayout({children,params}:{
  children:React.ReactNode;params:Promise<{workspaceId:string}>}){
  const {workspaceId}=await params;
  const access=await workspaceAccess(workspaceId);
  if(!access.ok){if(access.status===401)redirect("/login");notFound();}
  return <div className="min-h-screen bg-canvas lg:grid lg:grid-cols-[248px_1fr]">
    <aside className="border-b border-slate-200 bg-white px-5 py-6 lg:sticky lg:top-0 lg:h-screen lg:overflow-y-auto lg:border-b-0 lg:border-r">
      <Brand href="/dashboard"/>
      <div className="mb-7 mt-8 rounded-2xl border border-slate-200 bg-canvas p-4">
        <Link href="/dashboard" className="text-xs font-semibold text-brand hover:underline">← All workspaces</Link>
        <p className="mt-3 break-words font-bold text-ink">{access.workspace.name}</p>
        <p className="mt-1 text-xs uppercase tracking-wide text-slate-500">{access.membership.role} access</p>
      </div>
      <nav aria-label="Workspace sections" className="grid grid-cols-2 gap-1 sm:grid-cols-3 lg:grid-cols-1">
        {links.map(({slug,label,icon:Icon})=><Link key={slug}
          href={"/workspaces/"+workspaceId+"/"+slug}
          className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-soft hover:text-brand">
          <Icon size={17} className="shrink-0"/>{label}</Link>)}
      </nav>
      <div className="mt-7 flex items-center justify-between border-t border-slate-100 pt-5">
        <Link href="/account/security" className="inline-flex items-center gap-1.5 text-xs text-brand hover:underline"><ShieldCheck size={15}/> Account security</Link>
        <LogoutButton/>
      </div>
    </aside>
    <main className="min-w-0 px-5 py-9 sm:px-10 lg:py-12">
      <div className="mx-auto max-w-6xl">{children}</div>
      <p className="mx-auto mt-12 max-w-6xl border-t border-slate-200 pt-5 text-xs text-slate-500">
        ContextOps AI · Simulations and projections are not verified savings. Production routing remains disabled.
      </p>
    </main>
  </div>;
}
