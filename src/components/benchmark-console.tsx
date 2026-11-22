"use client";
import {useCallback,useEffect,useState,type FormEvent} from "react";
import Link from "next/link";
import {ShieldCheck,LockKeyhole,BarChart3,AlertTriangle,ArrowRight} from "lucide-react";
import {Card} from "@/components/ui/card";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";

type Json=Record<string,unknown>;
type Protocol={id:string;name:string;status:string;populationSize:number|null;holdoutSize:number|null;
  populationFingerprint:string|null;config:Record<string,unknown>};
type Reconciliation={id:string;createdAt:string;billedTotalUsd:number;
  successfulTasks:number;evidenceLevel:string};
const date=(offsetDays:number)=>new Date(Date.now()+offsetDays*86400000).toISOString().slice(0,10);
const stamp=(value:string)=>new Date(value+"T00:00:00.000Z").toISOString();
export function BenchmarkConsole({workspaceId}:{workspaceId:string}){
  const root="/api/workspaces/"+workspaceId+"/benchmarking";
  const [protocols,setProtocols]=useState<Protocol[]>([]);
  const [reconciliations,setReconciliations]=useState<Reconciliation[]>([]);
  const [runs,setRuns]=useState<Json[]>([]);
  const [busy,setBusy]=useState(false),[error,setError]=useState(""),[message,setMessage]=useState("");
  const [name,setName]=useState("Support classification holdout");
  const [seed,setSeed]=useState("evaluation-v1");
  const [from,setFrom]=useState(()=>date(-90)),[to,setTo]=useState(()=>date(1));
  const [holdout,setHoldout]=useState(30),[minSupport,setMinSupport]=useState(3);
  const [minimumRecall,setMinimumRecall]=useState(.7),[budget,setBudget]=useState(1);
  const [provenance,setProvenance]=useState<"SYNTHETIC"|"AUTHORIZED_SANITIZED">("SYNTHETIC");
  const [authorization,setAuthorization]=useState("");
  const [confirmation,setConfirmation]=useState("");
  const [invoiceRun,setInvoiceRun]=useState("");
  const [invoiceReference,setInvoiceReference]=useState("");
  const [billed,setBilled]=useState(0),[overhead,setOverhead]=useState(0);
  const [billedTasks,setBilledTasks]=useState(500),[successful,setSuccessful]=useState(450);
  const [scenarioErrors,setScenarioErrors]=useState(10),[scenarioFallback,setScenarioFallback]=useState(100);
  const [scenarioResult,setScenarioResult]=useState<Json|null>(null);
  const [reconcileResult,setReconcileResult]=useState<Json|null>(null);
  const refresh=useCallback(async()=>{
    const [a,b]=await Promise.all([fetch(root,{cache:"no-store"}),
      fetch("/api/workspaces/"+workspaceId+"/evaluations",{cache:"no-store"})]);
    if(!a.ok||!b.ok)throw Error("Cannot load benchmarking workspace data");
    const first=await a.json(),second=await b.json();
    setProtocols(first.protocols??[]);setReconciliations(first.reconciliations??[]);
    setRuns(second.runs??[]);
  },[root,workspaceId]);
  useEffect(()=>{void refresh().catch(e=>setError(e instanceof Error?e.message:"Request failed"));},[refresh]);
  async function submit(mode:string,body:Json){
    setBusy(true);setError("");setMessage("");
    try{
      const result=await fetch(root,{
        method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({mode,...body}),
      });
      const data=await result.json();
      if(!result.ok)throw Error(data.error??"Benchmark operation failed");
      if(mode==="stress")setScenarioResult(data.scenario);
      if(mode==="reconcile")setReconcileResult(data);
      await refresh();
      setMessage(mode==="create"?"Draft protocol created. Review it before freezing.":
        mode==="freeze"?"Protocol frozen. Its data window and sample fingerprint cannot be edited.":
        mode==="reconcile"?"Self-reported aggregate saved; invoice not verified.":
        "Offline failure scenario calculated.");
      return true;
    }catch(e){setError(e instanceof Error?e.message:"Request failed");return false;}
    finally{setBusy(false);}
  }
  async function create(event:FormEvent){
    event.preventDefault();
    await submit("create",{config:{
      name,seed,windowStart:stamp(from),windowEnd:stamp(to),
      holdoutPercent:holdout,minimumStratumSupport:minSupport,
      minimumClassRecall:minimumRecall,maxExternalSpendUsd:budget,
      dataProvenance:provenance,
      ...(provenance==="AUTHORIZED_SANITIZED"?{authorizationReference:authorization}:{}),
    }});
  }
  const frozen=protocols.filter(p=>p.status==="FROZEN");
  return <div className="space-y-7">
    <div><p className="text-xs font-bold uppercase tracking-widest text-brand">PHASE 12 / EVIDENCE</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight text-ink sm:text-4xl">Benchmark governance</h1>
      <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-600">
        Preregister a label window, freeze a disjoint holdout and set a conservative model-call
        budget before comparing providers. No real provider is contacted from this page.</p></div>
    <div className="grid gap-4 md:grid-cols-3">
      {[
        {icon:LockKeyhole,title:"Frozen evidence",detail:"Dataset fingerprint and holdout split"},
        {icon:ShieldCheck,title:"Consent and budget",detail:"Provider calls gated and disabled by default"},
        {icon:BarChart3,title:"Real cost context",detail:"Aggregate self-reported invoice comparisons"},
      ].map(({icon:Icon,title,detail})=><Card key={title} className="p-5">
        <Icon className="text-brand" size={22}/>
        <h2 className="mt-3 font-bold text-ink">{title}</h2>
        <p className="mt-1 text-xs leading-relaxed text-slate-500">{detail}</p>
      </Card>)}</div>
    {error&&<p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</p>}
    {message&&<p role="status" className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">{message}</p>}
    <Card className="space-y-5 p-7">
      <div><h2 className="text-xl font-bold">1. Preregister evaluation protocol</h2>
        <p className="mt-2 text-sm text-slate-500">
          Frozen protocols cannot be edited. Only traces with human labels in the selected window
          are eligible. Synthetic or authorized sanitized origin must be recorded.</p></div>
      <form onSubmit={create} className="space-y-5">
        <label className="block text-sm font-semibold">Protocol name
          <Input required className="mt-2" value={name} onChange={e=>setName(e.target.value)}/></label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-semibold">Start date (UTC)
            <Input required type="date" className="mt-2" value={from} onChange={e=>setFrom(e.target.value)}/></label>
          <label className="text-sm font-semibold">End date (UTC)
            <Input required type="date" className="mt-2" value={to} onChange={e=>setTo(e.target.value)}/></label>
          <label className="text-sm font-semibold">Reproducible seed
            <Input required className="mt-2" value={seed} onChange={e=>setSeed(e.target.value)}/></label>
          <label className="text-sm font-semibold">Holdout percentage (20–50)
            <Input type="number" min={20} max={50} required className="mt-2"
              value={holdout} onChange={e=>setHoldout(Number(e.target.value))}/></label>
          <label className="text-sm font-semibold">Minimum records per label (2–100)
            <Input type="number" min={2} max={100} required className="mt-2"
              value={minSupport} onChange={e=>setMinSupport(Number(e.target.value))}/></label>
          <label className="text-sm font-semibold">Minimum per-label recall (0.5–1.0)
            <Input type="number" min={.5} max={1} step={.05} required className="mt-2"
              value={minimumRecall} onChange={e=>setMinimumRecall(Number(e.target.value))}/></label>
          <label className="text-sm font-semibold">External preflight cap (USD, 0.01–25)
            <Input type="number" min={.01} max={25} step={.01} required className="mt-2"
              value={budget} onChange={e=>setBudget(Number(e.target.value))}/></label>
          <label className="text-sm font-semibold">Data provenance
            <select className="mt-2 h-12 w-full rounded-xl border border-slate-300 bg-white px-3"
              value={provenance} onChange={e=>setProvenance(e.target.value as "SYNTHETIC"|"AUTHORIZED_SANITIZED")}>
              <option value="SYNTHETIC">Synthetic only</option>
              <option value="AUTHORIZED_SANITIZED">Operator-attested authorized, sanitized data</option>
            </select></label>
        </div>
        {provenance==="AUTHORIZED_SANITIZED"&&<label className="block text-sm font-semibold">
          Written processing authorization reference (no secrets/customer data)
          <Input className="mt-2" required value={authorization}
            onChange={e=>setAuthorization(e.target.value)}/></label>}
        <p className="text-xs text-slate-500">External calls also require explicit evaluation consent,
          operator enablement, an API key, and a frozen non-synthetic protocol.
          An operator reference is not independent legal or security approval.</p>
        <Button type="submit" disabled={busy}>Create draft protocol</Button>
      </form>
    </Card>
    <Card className="space-y-4 p-7">
      <h2 className="text-xl font-bold">2. Freeze and inspect held-out cohorts</h2>
      {!protocols.length?<p className="text-sm text-slate-500">No protocol created yet.</p>:
        <div className="space-y-4">{protocols.map(p=><div key={p.id}
          className="rounded-xl border border-slate-200 p-4">
          <div className="flex flex-wrap justify-between gap-2"><strong>{p.name}</strong>
            <span className="text-xs font-bold text-brand">{p.status}</span></div>
          <p className="mt-2 text-xs text-slate-500">
            Population {p.populationSize??"not frozen"} · Holdout {p.holdoutSize??"not frozen"}
            {p.populationFingerprint&&" · Fingerprint "+p.populationFingerprint.slice(0,16)+"…"}
          </p>
          {p.status==="DRAFT"&&<div className="mt-3 flex flex-wrap gap-2">
            <Input placeholder={"Type FREEZE "+p.name} value={confirmation}
              onChange={e=>setConfirmation(e.target.value)}
              aria-label={"Confirm freezing "+p.name} className="min-w-[250px] flex-1"/>
            <Button type="button" disabled={busy||confirmation!=="FREEZE "+p.name}
              onClick={()=>void submit("freeze",{protocolId:p.id,confirmation}).then(ok=>{if(ok)setConfirmation("");})}>
              Freeze</Button>
          </div>}</div>)}</div>}
      {frozen.length>0&&<Link className="inline-flex items-center gap-2 text-sm font-semibold text-brand"
        href={"/workspaces/"+workspaceId+"/evaluations"}>
        Run one model comparison per frozen protocol <ArrowRight size={16}/></Link>}
    </Card>
    <Card className="space-y-4 p-7">
      <h2 className="text-xl font-bold">3. Stress-test a hypothetical fallback scenario</h2>
      <p className="text-sm text-slate-500">Local math only; no remote provider traffic.
        Observe how errors, retries and fallback change the modeled bill.</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-semibold">Candidate error rate (%)
          <Input type="number" min={0} max={100} className="mt-2" value={scenarioErrors}
            onChange={e=>setScenarioErrors(Number(e.target.value))}/></label>
        <label className="text-sm font-semibold">Fallback cost per task (USD ×100000)
          <Input type="number" min={0} className="mt-2" value={scenarioFallback}
            onChange={e=>setScenarioFallback(Number(e.target.value))}/></label>
      </div>
      <Button type="button" disabled={busy} onClick={()=>void submit("stress",{scenario:{
        monthlyTasks:10000,eligibleFraction:.7,baselineUsdPerTask:.003,
        candidateUsdPerAttempt:.00015,errorFraction:scenarioErrors/100,
        retryFraction:.25,fallbackUsdPerTask:scenarioFallback/100000,
        fixedMonthlyUsd:25,
      }})}>Run offline failure stress test</Button>
      {scenarioResult&&<p className="rounded-xl bg-slate-50 p-4 text-sm">
        Hypothetical monthly difference: <strong>
          ${Number(scenarioResult.modeledDifferenceUsd).toFixed(2)}</strong>.
        {String(scenarioResult.savingsEvidence)} · Not verified customer savings.</p>}
    </Card>
    <Card className="space-y-4 p-7">
      <div><h2 className="text-xl font-bold">4. Record an aggregate billing comparison</h2>
        <p className="mt-2 text-sm text-slate-500">
          Enter aggregate totals only; do not upload invoices, personal information or provider secrets.
          This is explicitly <strong>self-reported, unverified</strong> and cannot certify savings.</p></div>
      <label className="block text-sm font-semibold">Evaluation run
        <select className="mt-2 h-12 w-full rounded-xl border border-slate-300 bg-white px-3"
          value={invoiceRun} onChange={e=>setInvoiceRun(e.target.value)}>
          <option value="">Choose a completed run</option>
          {runs.filter(r=>r.status==="COMPLETED").map(r=><option key={String(r.id)} value={String(r.id)}>
            {String(r.model)} · {String(r.id).slice(0,10)}</option>)}
        </select></label>
      <label className="block text-sm font-semibold">Invoice reference (stored as SHA-256 only)
        <Input className="mt-2" value={invoiceReference}
          onChange={e=>setInvoiceReference(e.target.value)} placeholder="Internal invoice reference, not a file"/></label>
      <div className="grid gap-4 sm:grid-cols-2">
        {[
          {label:"Billed total USD",value:billed,set:setBilled},
          {label:"Additional overhead USD",value:overhead,set:setOverhead},
          {label:"Billed tasks",value:billedTasks,set:setBilledTasks},
          {label:"Independently successful tasks",value:successful,set:setSuccessful},
        ].map(f=><label key={f.label} className="text-sm font-semibold">{f.label}
          <Input type="number" min={0} step={f.label.includes("USD")?".01":"1"}
            className="mt-2" value={f.value} onChange={e=>f.set(Number(e.target.value))}/></label>)}
      </div>
      <Button type="button" disabled={busy||!invoiceRun||invoiceReference.length<6}
        onClick={()=>void submit("reconcile",{
          runId:invoiceRun,invoiceReference,periodStart:stamp(from),periodEnd:stamp(to),
          billedTotalUsd:billed,overheadUsd:overhead,
          billableTasks:billedTasks,successfulTasks:successful,acknowledgeSelfReported:true,
        })}>Save self-reported reconciliation</Button>
      {reconcileResult&&<p className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">
        Aggregate cost per successful task: {reconcileResult.observedCostPerSuccess===null?"Unavailable":
          "$"+Number(reconcileResult.observedCostPerSuccess).toFixed(4)}.
        This is not validated invoice evidence and is not comparable to sample costs.</p>}
      {reconciliations.length>0&&<div className="space-y-2">
        <h3 className="text-sm font-bold">Recorded aggregates</h3>
        {reconciliations.map(r=><p key={r.id} className="text-xs text-slate-500">
          {new Date(r.createdAt).toLocaleDateString()} · ${r.billedTotalUsd.toFixed(2)}
          · {r.successfulTasks} reported successes · {r.evidenceLevel}</p>)}</div>}
    </Card>
    <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-5">
      <AlertTriangle className="shrink-0 text-amber-700" size={18}/>
      <p className="text-xs leading-relaxed text-amber-900">
        These are engineering controls for an offline pilot. Live Railway hosting, managed backup
        restores, external provider approval, independently audited business labels, a DPA,
        real invoice validation and statistical review remain launch prerequisites.
      </p>
    </div>
  </div>;
}
