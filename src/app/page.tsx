import Link from "next/link";
import { ArrowRight, BarChart3, CheckCircle2, GitBranch, Layers3, ShieldCheck, Sparkles } from "lucide-react";
import { Brand } from "@/components/brand";
const steps = [
  { icon: BarChart3, title: "Understand your spend", text: "Inspect workload volume, model usage and recurring patterns before making changes." },
  { icon: GitBranch, title: "Route with confidence", text: "Recommend cheaper models only when quality and risk thresholds are met." },
  { icon: ShieldCheck, title: "Prove the outcome", text: "Separate estimated, simulated and verified savings with an auditable trail." },
];
export default function Home() {
  return <main className="overflow-hidden">
    <div className="mx-auto max-w-7xl px-5">
      <header className="flex items-center justify-between py-7"><Brand/>
        <nav className="flex items-center gap-5 text-sm font-semibold">
          <Link href="/login" className="hidden text-slate-600 hover:text-ink sm:block">Sign in</Link>
          <Link href="/register" className="rounded-xl bg-ink px-4 py-2.5 text-white hover:bg-slate-800">Get started <ArrowRight className="inline" size={15}/></Link>
        </nav>
      </header>
      <section className="relative grid items-center gap-12 py-16 lg:grid-cols-[1.15fr_.85fr] lg:py-28">
        <div className="animate-up">
          <p className="mb-7 inline-flex items-center gap-2 rounded-full border border-brand/20 bg-soft px-4 py-2 text-xs font-bold uppercase tracking-widest text-brand"><Sparkles size={15}/> Quality-first AI optimization</p>
          <h1 className="max-w-3xl text-5xl font-bold leading-[1.09] tracking-[-.055em] text-ink sm:text-6xl lg:text-[4.5rem]">Stop overpaying for <span className="text-brand">routine AI work.</span></h1>
          <p className="mt-7 max-w-xl text-lg leading-relaxed text-slate-600">Keep your existing AI automations. Understand what they cost, find safe optimization opportunities, and verify model quality before changing a thing.</p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Link href="/register" className="inline-flex items-center gap-2 rounded-xl bg-brand px-6 py-3.5 font-semibold text-white hover:bg-[#095f58]">Start with a workflow <ArrowRight size={18}/></Link>
            <a href="#how-it-works" className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-6 py-3.5 font-semibold text-ink hover:bg-slate-50">How it works</a>
          </div>
          <p className="mt-6 flex items-center gap-2 text-sm text-slate-500"><CheckCircle2 size={16} className="text-brand"/> Quality thresholds first. Savings claims only with evidence.</p>
        </div>
        <div className="relative animate-up" style={{animationDelay:"100ms"}}>
          <div className="absolute -left-14 -top-10 h-56 w-56 rounded-full bg-[#c5e7dd] opacity-60 blur-3xl"/>
          <div className="relative rounded-[2rem] border border-slate-200 bg-white p-7 shadow-float sm:p-9">
            <div className="mb-8 flex items-center justify-between"><div className="flex items-center gap-3"><span className="rounded-xl bg-soft p-3 text-brand"><Layers3 size={22}/></span><div><p className="font-bold">AI workflow health</p><p className="text-xs text-slate-500">Illustrative preview · not live data</p></div></div><span className="rounded-full bg-soft px-3 py-1 text-xs font-semibold text-brand">Pilot-ready</span></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-2xl bg-canvas p-5"><p className="text-sm text-slate-500">Model quality</p><p className="mt-2 text-3xl font-bold">Quality first</p><p className="mt-2 text-xs text-slate-500">Configured by workflow</p></div>
              <div className="rounded-2xl bg-canvas p-5"><p className="text-sm text-slate-500">Routing policy</p><p className="mt-2 text-3xl font-bold">Safe fallback</p><p className="mt-2 text-xs text-slate-500">Premium model when uncertain</p></div>
            </div>
            <div className="mt-6 rounded-2xl border border-slate-200 p-5"><div className="mb-5 flex items-center justify-between"><p className="text-sm font-semibold">Optimization pipeline</p><span className="text-xs text-slate-500">Preview</span></div>
              <div className="grid grid-cols-[1fr_auto_1fr_auto_1fr] items-center gap-2 text-center text-xs font-semibold"><div className="rounded-lg bg-soft px-2 py-3 text-brand">Analyze</div><ArrowRight size={14} className="text-slate-400"/><div className="rounded-lg bg-soft px-2 py-3 text-brand">Evaluate</div><ArrowRight size={14} className="text-slate-400"/><div className="rounded-lg bg-soft px-2 py-3 text-brand">Simulate</div></div>
            </div>
            <p className="mt-6 text-xs leading-relaxed text-slate-500">No guaranteed savings. Recommendations require representative evaluations and customer-approved processing.</p>
          </div>
        </div>
      </section>
    </div>
    <section id="how-it-works" className="bg-white py-20"><div className="mx-auto max-w-7xl px-5"><p className="text-sm font-bold uppercase tracking-widest text-brand">How ContextOps works</p><h2 className="mt-3 max-w-2xl text-3xl font-bold tracking-tight sm:text-4xl">A measurable path to cheaper AI operations.</h2>
      <div className="mt-10 grid gap-5 md:grid-cols-3">{steps.map((s,i)=><div key={s.title} className="rounded-3xl border border-slate-200 p-7"><div className="flex items-center justify-between"><s.icon className="text-brand" size={27}/><span className="text-xs font-semibold text-slate-400">0{i+1}</span></div><h3 className="mt-6 text-xl font-bold">{s.title}</h3><p className="mt-3 leading-relaxed text-slate-600">{s.text}</p></div>)}</div>
    </div></section>
    <footer className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-5 py-10 text-sm text-slate-500"><span>© ContextOps AI · Open-source MVP</span><span>Measured optimization, not magic.</span></footer>
  </main>;
}
