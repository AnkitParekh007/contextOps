"use client";
import { useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ArrowRight, CheckCircle2, CircleAlert, Download, FileDown,
  LoaderCircle, Play, ShieldCheck, Sparkles, UploadCloud } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type WorkspaceConsoleProps={workspaceId:string;section:string};
type Json=Record<string,unknown>;
const sectionTitles:Record<string,[string,string]>={
  overview:["Optimization overview","A transparent view of your AI workload, quality and modeled opportunities."],
  traces:["Execution traces","Inspect redacted requests, model usage and labeled output samples."],
  imports:["Import execution traces","Upload authorized, redacted-only CSV, JSONL or JSON data and monitor ingestion."],
  analysis:["Workload intelligence","Classify routine, complex and sensitive tasks before considering model replacement."],
  classifications:["Task suitability","The system does not equate repeated patterns with proven model quality."],
  calculator:["Cost & savings calculator","Explore pricing and fallback scenarios with costs per successful task."],
  evaluations:["Candidate evaluations","Test cheaper model outputs on representative human-labeled data."],
  policies:["Quality-gated routing policies","Create simulation-only rules; unqualified models stay in draft."],
  shadow:["Read-only shadow simulations","Project potential routing impact without modifying production answers."],
  reviews:["Human review queue","Record decisions on sensitive, unknown and low-confidence tasks."],
  reports:["Savings assessments","Export a client-readable report with explicit assumptions and evidence levels."],
  audit:["Workspace audit trail","A history of key processing, policy, review and export activities."],
  settings:["Workflow settings","Configure quality expectations and view authorized demo connections."],
};
const money=(n:unknown)=>typeof n==="number"&&Number.isFinite(n)?
  n.toLocaleString("en-US",{style:"currency",currency:"USD",maximumFractionDigits:4}):"—";
const pct=(n:unknown)=>typeof n==="number"&&Number.isFinite(n)?(n*100).toFixed(1)+"%":"—";
const num=(n:unknown)=>typeof n==="number"?n.toLocaleString():"—";
function Box({label,value,sub}:{label:string;value:string;sub?:string}){
  return <Card className="p-5"><p className="text-sm font-medium text-slate-500">{label}</p>
    <p className="mt-3 text-2xl font-bold tracking-tight text-ink">{value}</p>
    {sub&&<p className="mt-1 text-xs text-slate-500">{sub}</p>}</Card>;
}
function Notice({children}:{children:React.ReactNode}){
  return <div className="flex gap-3 rounded-2xl border border-brand/20 bg-soft p-4 text-sm leading-relaxed text-ink">
    <ShieldCheck className="mt-0.5 shrink-0 text-brand" size={19}/><div>{children}</div></div>;
}
function Table({headers,rows}:{headers:string[];rows:Array<Array<React.ReactNode>>}){
  return <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
    <table className="w-full min-w-[580px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
      <tr>{headers.map(h=><th className="px-4 py-3 font-semibold" key={h}>{h}</th>)}</tr></thead>
      <tbody>{rows.length?rows.map((cells,i)=><tr key={i} className="border-t border-slate-100">
        {cells.map((v,j)=><td key={j} className="max-w-[280px] break-words px-4 py-3 align-top text-slate-700">{v}</td>)}</tr>):
        <tr><td className="px-4 py-8 text-center text-slate-400" colSpan={headers.length}>No records yet</td></tr>}</tbody>
    </table>
  </div>;
}
async function fetchJson(url:string){
  const response=await fetch(url,{cache:"no-store"});
  const json=await response.json();if(!response.ok)throw Error(json.error??"Could not load data");
  return json;
}
export function WorkspaceConsole({workspaceId,section}:WorkspaceConsoleProps){
  const api="/api/workspaces/"+workspaceId;
  const queryClient=useQueryClient();
  const {data,error,isLoading}=useQuery<Json>({
    queryKey:["contextops",workspaceId,section],
    queryFn:()=>fetchJson(api+"/"+(section==="classifications"?"analysis":section)),
    enabled:section!=="calculator",
    refetchInterval:section==="imports"?3000:false,
  });
  const [busy,setBusy]=useState(false),[message,setMessage]=useState(""),[result,setResult]=useState<Json|null>(null);
  const [file,setFile]=useState<File|null>(null);
  const [preview,setPreview]=useState<Json|null>(null);
  const [mapping,setMapping]=useState<Record<string,string>>({});
  const schemaColumns=["external_trace_id","timestamp","task_type","input_text","prompt_template",
    "model_provider","model_name","input_tokens","output_tokens","latency_ms","status",
    "error_message","output_text","expected_output","human_label","quality_score"];
  const [authorized,setAuthorized]=useState(false),[retention,setRetention]=useState(false);
  const [provider,setProvider]=useState("MOCK"),[model,setModel]=useState("mock-efficient");
  const [consent,setConsent]=useState(false),[evalCount,setEvalCount]=useState(30);
  const [quality,setQuality]=useState(.95),[baselineIn,setBaselineIn]=useState(2);
  const [baselineOut,setBaselineOut]=useState(10),[candidateIn,setCandidateIn]=useState(.1);
  const [candidateOut,setCandidateOut]=useState(.5),[monthlyVolume,setMonthlyVolume]=useState(100000);
  const [fallback,setFallback]=useState(10),[eligible,setEligible]=useState(70);
  const [platform,setPlatform]=useState(0),[infrastructure,setInfrastructure]=useState(0);
  const [reviewId,setReviewId]=useState("");
  async function invoke(action:string,body:Json|FormData={}){
    setBusy(true);setMessage("");setResult(null);
    try{
      const response=await fetch(api+"/"+action,{method:"POST",
        headers:body instanceof FormData?undefined:{"Content-Type":"application/json"},
        body:body instanceof FormData?body:JSON.stringify(body)});
      const value=await response.json();
      if(!response.ok)throw Error(value.error??"Unable to complete action");
      setResult(value);
      setMessage("Action completed. Results shown below.");
      await queryClient.invalidateQueries({queryKey:["contextops",workspaceId]});
      return value;
    }catch(error){setMessage(error instanceof Error?error.message:"Request failed");return null;}
    finally{setBusy(false);}
  }
  const button=(label:string,action:()=>void,disabled=false)=>
    <Button disabled={busy||disabled} type="button" onClick={action}>
      {busy?<LoaderCircle size={17} className="animate-spin"/>:<Play size={16}/>} {label}</Button>;
  const items=(key:string)=>(data?.[key] as Json[]|undefined)??[];
  const latest=(key:string)=>items(key)[0]??null;
  const [title,description]=sectionTitles[section];
  const workspacesLink="/workspaces/"+workspaceId+"/";
  const overview=data??{}, counts=(overview.counts??{}) as Json, latestEval=(overview.latestEvaluation??null) as Json|null;
  const latestShadow=(overview.latestShadow??null) as Json|null;
  const statRows=(items("categories") as Json[]);
  return <div className="space-y-7">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div><p className="text-xs font-bold uppercase tracking-widest text-brand">ContextOps AI / {section}</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-ink sm:text-4xl">{title}</h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-600">{description}</p></div>
      {section!=="overview"&&<Link href={workspacesLink+"overview"} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-ink hover:bg-slate-50">Overview <ArrowRight size={16}/></Link>}
    </div>
    {isLoading&&<div role="status" className="flex items-center gap-3 rounded-2xl bg-white p-5 text-slate-500"><LoaderCircle className="animate-spin" size={18}/> Loading workspace data…</div>}
    {error&&<div role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error instanceof Error?error.message:"Unable to load"}</div>}
    {section==="overview"&&<>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Box label="Execution traces" value={num(overview.total)} sub="Observed sample volume"/>
        <Box label="Input tokens" value={num(counts.totalInputTokens)}/>
        <Box label="Output tokens" value={num(counts.totalOutputTokens)}/>
        <Box label="Trace error rate" value={pct(counts.errorRate)}/>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <Box label="Latest test-set quality" value={pct(latestEval?.qualityScore)} sub="Candidate evaluation"/>
        <Box label="Simulated sample savings" value={money(latestShadow?.simulatedSavings)} sub="NOT verified or realized"/>
        <Box label="Verified savings" value="Not available" sub="Requires measured production rollout"/>
      </div>
      <Card className="p-7"><div className="flex items-start justify-between gap-4"><div><h2 className="text-xl font-bold">Start with one workflow</h2>
        <p className="mt-2 text-sm text-slate-500">Synthetic demo traces provide a safe way to try the full assessment.</p></div><Sparkles className="text-brand"/></div>
        <div className="mt-6 flex flex-wrap gap-3">{button("Load 500 synthetic tickets",()=>{void invoke("demo");})}
          <Link className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold hover:bg-canvas" href={workspacesLink+"imports"}>Upload your traces</Link>
          <Link className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold hover:bg-canvas" href={workspacesLink+"analysis"}>Workload analysis</Link></div>
      </Card>
      <Card className="p-7"><h2 className="text-lg font-bold">Task mix by suitability</h2><p className="mt-1 text-sm text-slate-500">Requires a completed workload analysis.</p>
        {statRows.length>0?<div className="mt-5 h-56"><ResponsiveContainer width="100%" height="100%">
          <BarChart data={statRows}><XAxis dataKey="category" tick={{fontSize:10}} interval={0}/>
            <YAxis allowDecimals={false}/><Tooltip/><Bar dataKey="count" fill="#0b7269" radius={[6,6,0,0]}/></BarChart>
        </ResponsiveContainer></div>:<p className="mt-5 text-sm text-slate-400">Load traces and run classification to view the chart.</p>}
      </Card>
    </>}
    {section==="imports"&&<>
      <Card className="p-7"><h2 className="text-xl font-bold">Import redacted traces</h2>
        <p className="mt-2 text-sm text-slate-600">CSV, JSONL or JSON (up to 16 MB and 10,000 records). Only sanitized fields are stored; raw upload bytes are not retained.</p>
        <a href={api+"/template"} className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-brand hover:underline"><Download size={15}/> Download CSV template</a>
        <form className="mt-6 space-y-4" onSubmit={async e=>{e.preventDefault();if(!file)return;const form=new FormData();
          form.set("file",file);form.set("authorized",String(authorized));form.set("retentionAcknowledged",String(retention));
          form.set("mapping",JSON.stringify(mapping));
          await invoke("imports",form);}}>
          <label className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-slate-200 bg-canvas p-8 text-center text-sm text-slate-500 hover:border-brand">
            <UploadCloud size={28} className="text-brand"/>{file?file.name:"Choose an authorized trace export"}
            <input required type="file" className="sr-only" accept=".csv,.json,.jsonl,.ndjson" onChange={e=>{setFile(e.target.files?.[0]??null);setPreview(null);setMapping({});}}/>
          </label>
          <label className="flex items-start gap-3 text-sm text-ink"><input type="checkbox" checked={authorized} onChange={e=>setAuthorized(e.target.checked)} className="mt-1 accent-brand"/> I am authorized to upload and process these workflow traces.</label>
          <label className="flex items-start gap-3 text-sm text-ink"><input type="checkbox" checked={retention} onChange={e=>setRetention(e.target.checked)} className="mt-1 accent-brand"/> I understand only best-effort redacted content is retained for analysis; the importer may not catch every sensitive value.</label>
          
          <div className="flex items-center gap-3"><Button type="button" variant="secondary" disabled={busy||!file||!authorized}
            onClick={async()=>{if(!file)return;const form=new FormData();form.set("file",file);
              form.set("authorized",String(authorized));form.set("mapping",JSON.stringify(mapping));
              const value=await invoke("preview",form);if(value)setPreview(value);
            }}><UploadCloud size={16}/> Preview redacted sample</Button>
            <span className="text-xs text-slate-500">Map your columns before importing.</span></div>
          {preview&&<div className="space-y-4 rounded-2xl border border-slate-200 p-5">
            <div><h3 className="font-bold">Detected column mapping</h3>
              <p className="mt-1 text-xs text-slate-500">Leave on auto-detect when a header already matches the canonical name or common alias.</p></div>
            <div className="grid gap-3 sm:grid-cols-2">{(preview.columns as string[]??[]).map((column,i)=>
              <label key={i} className="text-xs font-semibold">{column}
                <select className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2 py-2.5"
                  value={mapping[column.toLowerCase().replace(/[^a-z0-9]+/g,"_")]??""}
                  onChange={e=>{setMapping(old=>({...old,[column.toLowerCase().replace(/[^a-z0-9]+/g,"_")]:e.target.value}));}}>
                  <option value="">Auto-detect</option>{schemaColumns.map(target=><option key={target} value={target}>{target}</option>)}
                </select>
              </label>)}</div>
            <p className="text-xs text-slate-500">{num(preview.valid)} valid of {num(preview.total)} records. Preview text is redacted before rendering.</p>
            <pre className="max-h-48 overflow-auto rounded-xl bg-canvas p-4 text-xs">{JSON.stringify(preview.redactedPreview,null,2)}</pre>
          </div>}
          <Notice>No third-party model receives uploaded content during ingestion. External evaluations require separate explicit consent. Avoid regulated or highly confidential data until a formal DLP review is complete.</Notice>
          <Button disabled={busy||!file||!authorized||!retention} type="submit">{busy?"Queueing…":"Queue secure import"} <ArrowRight size={16}/></Button>
        </form>
      </Card>
      <h2 className="text-lg font-bold">Recent imports</h2>
      <Table headers={["File","Status","Processed","Issues"]} rows={items("imports").map(r=>[
        String(r.filename),String(r.status),num(r.processed)+" / "+num(r.total),String(r.rejected)])}/>
      <p className="text-xs text-slate-500">The worker processes imports asynchronously. Pending imports require the worker service to be running.</p>
    </>}
    {section==="traces"&&<>
      <Notice>All text displayed here is sanitized on ingestion. Never assume automated redaction is perfect; only import data you are authorized to process.</Notice>
      <div className="flex flex-wrap gap-3">{button("Load synthetic demo",()=>{void invoke("demo");})}
        <Link className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold" href={workspacesLink+"imports"}>Upload CSV/JSONL</Link></div>
      <Table headers={["External ID","Task type","Input (redacted)","Model","Tokens","Expected label"]} rows={items("traces").map(t=>[
        String(t.externalTraceId),String(t.taskType),String(t.inputText??"—").slice(0,120),
        String(t.modelName),num(Number(t.inputTokens)+Number(t.outputTokens)),String(t.humanLabel??t.expectedOutput??"—")])}/>
      <p className="text-xs text-slate-500">First page of up to 25 traces. {num(data?.total)} total records.</p>
    </>}
    {(section==="analysis"||section==="classifications")&&<>
      <Card className="flex flex-wrap items-center justify-between gap-4 p-7"><div><h2 className="text-lg font-bold">Deterministic task assessment</h2>
        <p className="mt-2 text-sm text-slate-500">Uses task type, risk flags, available labels and execution status. No provider calls.</p></div>
        {button("Run workload analysis",()=>{void invoke("analysis");})}</Card>
      <div className="grid gap-4 sm:grid-cols-3"><Box label="Tasks analyzed" value={num(((data?.summary??{}) as Json).taskCount)}/>
        <Box label="Average input tokens" value={num(Math.round(Number(((data?.summary??{}) as Json).averageInputTokens??0)))}/>
        <Box label="Error rate" value={pct(((data?.summary??{}) as Json).errorRate)}/></div>
      <Table headers={["Task classification","Risk","Routing suitability","Traces"]} rows={items("categories").map(c=>[
        String(c.category),String(c.risk),String(c.suitability),num(c.count)])}/>
      <Notice>“Eligible” means suitable for evaluation, not approved for cheap model routing. Quality must pass a representative labeled benchmark first.</Notice>
      {section==="analysis"&&<Table headers={["Model","Observed tasks"]} rows={items("modelDistribution").map(m=>[
        String(m.name),num(m.count)])}/>}
    </>}
    {section==="calculator"&&<CalculatorPanel invoke={invoke} busy={busy} result={result}
      monthlyVolume={monthlyVolume} setMonthlyVolume={setMonthlyVolume}
      baselineIn={baselineIn} setBaselineIn={setBaselineIn} baselineOut={baselineOut} setBaselineOut={setBaselineOut}
      candidateIn={candidateIn} setCandidateIn={setCandidateIn} candidateOut={candidateOut} setCandidateOut={setCandidateOut}
      eligible={eligible} setEligible={setEligible} fallback={fallback} setFallback={setFallback}
      platform={platform} setPlatform={setPlatform} infrastructure={infrastructure} setInfrastructure={setInfrastructure}/>}
    {section==="evaluations"&&<>
      <Card className="space-y-5 p-7"><div><h2 className="text-lg font-bold">Compare candidate model</h2><p className="mt-2 text-sm text-slate-500">Start with synthetic trace labels and the offline mock provider. Real provider evaluations require explicit consent and API keys in the server environment.</p></div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-semibold">Provider<select className="mt-2 h-12 w-full rounded-xl border border-slate-200 bg-white px-4" value={provider} onChange={e=>{
            const p=e.target.value;setProvider(p);setModel(p==="MOCK"?"mock-efficient":"");setConsent(false);}}>
            <option value="MOCK">Local deterministic mock</option><option value="OPENAI">OpenAI (external)</option><option value="ANTHROPIC">Anthropic (external)</option></select></label>
          <label className="text-sm font-semibold">Candidate model<Input className="mt-2" value={model} onChange={e=>setModel(e.target.value)} placeholder="Exact provider model ID"/></label>
          <NumberField label="Maximum labeled samples (5–50)" value={evalCount} onChange={setEvalCount} min={5} max={50}/>
          <NumberField label="Required quality (0.50–1.00)" value={quality} onChange={setQuality} min={.5} max={1} step={.01}/>
          <NumberField label="Baseline input $/1M" value={baselineIn} onChange={setBaselineIn}/>
          <NumberField label="Baseline output $/1M" value={baselineOut} onChange={setBaselineOut}/>
          <NumberField label="Candidate input $/1M" value={candidateIn} onChange={setCandidateIn}/>
          <NumberField label="Candidate output $/1M" value={candidateOut} onChange={setCandidateOut}/>
        </div>
        {provider!=="MOCK"&&<label className="flex gap-3 text-sm"><input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)} className="accent-brand"/> I explicitly approve sending these sanitized labeled samples to this external provider, including any resulting API charges.</label>}
        <Notice>Prices are user-provided assumptions, not automatically verified provider prices. No ground truth is included in candidate prompts. Free-text answers require human review.</Notice>
        {button("Run candidate evaluation",()=>{void invoke("evaluations",{
          provider,model,consentExternal:provider==="MOCK"?false:consent,maximumSamples:evalCount,
          minimumQuality:quality,baselineInputPrice:baselineIn,baselineOutputPrice:baselineOut,
          candidateInputPrice:candidateIn,candidateOutputPrice:candidateOut,
        });},!model||provider!=="MOCK"&&!consent)}
      </Card>
      <h2 className="text-lg font-bold">Recent evaluation runs</h2>
      <Table headers={["Candidate","Status","Test-set quality","Errors","Sample","Cost","Routing gate"]} rows={items("runs").map(r=>[
        String(r.provider)+" / "+String(r.model),String(r.status),pct(r.qualityScore),pct(r.errorRate),
        num(r.sampleSize),money(r.estimatedCost),
        ((r.details??{}) as Json).canRecommend===true?"Passed":"Not passed"])}/>
    </>}
    {section==="policies"&&<>
      <Card className="space-y-5 p-7"><h2 className="text-lg font-bold">Create a simulation-only policy</h2>
        <p className="text-sm text-slate-500">A policy must be tied to a completed model evaluation. Failed quality or cost checks produce a non-routable draft.</p>
        <div className="flex flex-wrap gap-3"><Link href={workspacesLink+"evaluations"} className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold">Review evaluations</Link>
          {button("Create policy from latest evaluation",async ()=>{
            const runs=await fetchJson(api+"/evaluations");const first=runs.runs?.[0];
            if(!first){setMessage("Please run an evaluation first");return;}
            await invoke("policies",{name:"Default quality-gated policy",evaluationRunId:first.id,
              minQuality:.95,minConfidence:.9,maxLatencyMs:10000,maxFallbackRate:.2,
              retryLimit:1,requireApprovalForSensitive:true});
          })}</div>
        <Notice>No live model switching is implemented. Approved policies are authorized for offline simulation only.</Notice>
      </Card>
      <Table headers={["Policy","Status","Evaluation","Version","Created"]} rows={items("policies").map(p=>[
        String(p.name),String(p.status),String(p.evaluationRunId??"—"),num(p.version),
        new Date(String(p.createdAt)).toLocaleDateString()])}/>
    </>}
    {section==="shadow"&&<>
      <Card className="space-y-5 p-7"><h2 className="text-lg font-bold">Simulate a routing policy</h2>
        <p className="text-sm text-slate-500">Simulates eligibility and fallback costs from recorded traces. Original production execution remains unchanged.</p>
        {button("Run shadow simulation",async ()=>{
          const policies=await fetchJson(api+"/policies");const first=(policies.policies??[]).find((p:Json)=>p.status==="APPROVED_FOR_SIMULATION");
          if(!first){setMessage("No quality-approved policy found. Evaluate a model and create a policy first.");return;}
          await invoke("shadow",{policyId:first.id});
        })}
        <Notice>Shadow results extrapolate quality and fallback frequency from an evaluation sample. They are simulations, not live A/B measurements or realized savings.</Notice>
      </Card>
      <Table headers={["Date","Traces","Cheaper route","Premium","Human review","Simulated savings"]} rows={items("runs").map(r=>[
        new Date(String(r.createdAt)).toLocaleDateString(),num(r.total),num(r.routed),num(r.escalated),num(r.blocked),
        money(r.simulatedSavings)])}/>
    </>}
    {section==="reports"&&<>
      <Card className="space-y-5 p-7"><h2 className="text-lg font-bold">Generate a client-ready assessment</h2>
        <p className="text-sm text-slate-600">Uses your most recent shadow simulation, transparent monthly volume assumption, and test-set quality evidence.</p>
        <NumberField label="Assumed tasks per month" value={monthlyVolume} onChange={setMonthlyVolume} min={1}/>
        {button("Generate Markdown report",()=>{void invoke("reports",{monthlyVolume});})}
        <Notice>Verified savings remain unavailable until a controlled production rollout measures true cost and success-rate changes.</Notice>
      </Card>
      <Table headers={["Report","Created","Projected monthly savings","Test quality","Download"]} rows={items("reports").map(r=>[
        String(r.title),new Date(String(r.createdAt)).toLocaleDateString(),money(r.simulatedMonthlySavings),
        pct(r.qualityScore),<a key={String(r.id)} href={"/api/reports/"+r.id+"/download"} className="inline-flex items-center gap-2 font-semibold text-brand hover:underline"><FileDown size={15}/> Markdown</a>])}/>
    </>}
    {section==="reviews"&&<>
      <Notice>Human approval records your disposition. It never overrides sensitive-task policy blocks or authorizes live routing.</Notice>
      <Table headers={["Trace ID","Reason","Status","Decision","Actions"]} rows={items("reviews").map(r=>[
        String(r.traceId).slice(0,18)+"…",String(r.reason),String(r.status),String(r.decision??"—"),
        r.status==="PENDING"?<span className="flex gap-2" key={String(r.id)}>
          <button disabled={busy} className="font-semibold text-brand" onClick={()=>{setReviewId(String(r.id));void invoke("reviews",{reviewId:r.id,decision:"APPROVED"});}}>Reviewed</button>
          <button disabled={busy} className="font-semibold text-red-600" onClick={()=>{setReviewId(String(r.id));void invoke("reviews",{reviewId:r.id,decision:"REJECTED"});}}>Reject</button>
        </span>:"Resolved"])}/>
      {reviewId&&<p className="text-xs text-slate-500">Last review item: {reviewId}</p>}
    </>}
    {section==="audit"&&<Table headers={["When","Action","Subject","Details"]} rows={items("events").map(e=>[
      new Date(String(e.createdAt)).toLocaleString(),String(e.action),String(e.subjectType),
      JSON.stringify(e.metadata??{}).slice(0,150)])}/>}
    {section==="settings"&&<>
      <Card className="space-y-5 p-7"><h2 className="text-lg font-bold">Quality threshold</h2>
        <p className="text-sm text-slate-500">Default confidence gate is 95% for routine classification. Configure task-specific quality expectations.</p>
        <NumberField label="Minimum classification quality (0.50–1.00)" value={quality} onChange={setQuality} min={.5} max={1} step={.01}/>
        {button("Save threshold",()=>{void invoke("settings",{taskType:"support_ticket_classification",
          minimumQuality:quality,maximumErrorRate:.05,maximumFallbackRate:.2,maximumLatencyMs:10000});})}
        <p className="text-xs text-slate-500">These persisted expectations should be applied to every production approval process; shadow policies separately require explicit evaluation thresholds.</p>
      </Card>
      <Card className="space-y-4 p-7"><h2 className="text-lg font-bold">Mock workflow connector</h2>
        <p className="text-sm text-slate-500">Create a demo-only connector record. It does not connect to a real CRM or transmit customer data.</p>
        {button("Connect mock support system",()=>{void invoke("connections",{
          name:"Demo support connector",provider:"MOCK",confirmNoExternalData:true});})}
      </Card>
      <Table headers={["Connector","Provider","Status"]} rows={items("connections").map(c=>[
        String(c.name),String(c.provider),String(c.status)])}/>
      <Table headers={["Task type","Minimum quality","Max error rate"]} rows={items("thresholds").map(t=>[
        String(t.taskType),pct(t.minimumQuality),pct(t.maximumErrorRate)])}/>
    </>}
    {message&&<div role="status" className={"rounded-xl border p-4 text-sm "+(
      result?"border-brand/20 bg-soft text-ink":"border-amber-200 bg-amber-50 text-amber-900")}>
      <span className="inline-flex items-center gap-2">{result?<CheckCircle2 size={17}/>:<CircleAlert size={17}/>} {message}</span></div>}
    {result&&section!=="calculator"&&<Card className="p-6"><p className="mb-3 text-sm font-bold">Action result</p>
      <pre className="max-h-72 overflow-auto rounded-xl bg-ink p-5 text-xs leading-relaxed text-[#ccece3]">{JSON.stringify(result,null,2)}</pre></Card>}
  </div>;
}
function NumberField({label,value,onChange,min=0,max=100000000,step="any"}:{
  label:string;value:number;onChange:(n:number)=>void;min?:number;max?:number;step?:number|"any";
}){
  return <label className="block text-sm font-semibold text-ink">{label}
    <Input className="mt-2" type="number" required min={min} max={max} step={step}
      value={Number.isFinite(value)?value:""} onChange={e=>onChange(e.target.value===""?0:Number(e.target.value))}/></label>;
}
function CalculatorPanel({invoke,busy,result,monthlyVolume,setMonthlyVolume,baselineIn,setBaselineIn,
  baselineOut,setBaselineOut,candidateIn,setCandidateIn,candidateOut,setCandidateOut,
  eligible,setEligible,fallback,setFallback,platform,setPlatform,infrastructure,setInfrastructure
}:{
  invoke:(action:string,body:Json)=>Promise<Json|null>;busy:boolean;result:Json|null;
  monthlyVolume:number;setMonthlyVolume:(n:number)=>void;baselineIn:number;setBaselineIn:(n:number)=>void;
  baselineOut:number;setBaselineOut:(n:number)=>void;candidateIn:number;setCandidateIn:(n:number)=>void;
  candidateOut:number;setCandidateOut:(n:number)=>void;eligible:number;setEligible:(n:number)=>void;
  fallback:number;setFallback:(n:number)=>void;platform:number;setPlatform:(n:number)=>void;
  infrastructure:number;setInfrastructure:(n:number)=>void;
}){
  const [inTokens,setInTokens]=useState(3000),[outTokens,setOutTokens]=useState(500);
  const [baselineSuccess,setBaselineSuccess]=useState(.99),[optimizedSuccess,setOptimizedSuccess]=useState(.98);
  const scenario=(result?.scenario??{}) as Json;
  return <>
    <Card className="p-7"><p className="mb-6 text-sm text-slate-500">Example prices are editable assumptions. Calculations include retries/fallbacks and recurring operating costs.</p>
      <form onSubmit={e=>{e.preventDefault();void invoke("calculator",{
        monthlyVolume,averageInputTokens:inTokens,averageOutputTokens:outTokens,
        baselineInputPrice:baselineIn,baselineOutputPrice:baselineOut,
        candidateInputPrice:candidateIn,candidateOutputPrice:candidateOut,
        eligiblePercent:eligible,fallbackPercent:fallback,platformMonthly:platform,
        infrastructureMonthly:infrastructure,baselineSuccessRate:baselineSuccess,
        optimizedSuccessRate:optimizedSuccess,
      });}} className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <NumberField label="Monthly tasks" value={monthlyVolume} onChange={setMonthlyVolume} min={1}/>
          <NumberField label="Input tokens per task" value={inTokens} onChange={setInTokens}/>
          <NumberField label="Output tokens per task" value={outTokens} onChange={setOutTokens}/>
          <NumberField label="Baseline input $ / 1M" value={baselineIn} onChange={setBaselineIn}/>
          <NumberField label="Baseline output $ / 1M" value={baselineOut} onChange={setBaselineOut}/>
          <NumberField label="Candidate input $ / 1M" value={candidateIn} onChange={setCandidateIn}/>
          <NumberField label="Candidate output $ / 1M" value={candidateOut} onChange={setCandidateOut}/>
          <NumberField label="Eligible tasks %" value={eligible} onChange={setEligible} max={100}/>
          <NumberField label="Fallback rate %" value={fallback} onChange={setFallback} max={100}/>
          <NumberField label="Monthly platform fee ($)" value={platform} onChange={setPlatform}/>
          <NumberField label="Monthly infrastructure ($)" value={infrastructure} onChange={setInfrastructure}/>
          <NumberField label="Baseline success rate (0–1)" value={baselineSuccess} onChange={setBaselineSuccess} min={.001} max={1} step={.01}/>
          <NumberField label="Optimized success rate (0–1)" value={optimizedSuccess} onChange={setOptimizedSuccess} min={.001} max={1} step={.01}/>
        </div>
        <Button disabled={busy} type="submit">Calculate conservative scenario <ArrowRight size={17}/></Button>
      </form>
    </Card>
    {result&&<><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Box label="Baseline monthly API cost" value={money(scenario.baselineMonthlyCost)}/>
      <Box label="Optimized monthly total" value={money(scenario.optimizedTotalMonthlyCost)}/>
      <Box label="Estimated net savings / month" value={money(scenario.netMonthlySavings)}/>
      <Box label="Annualized estimated savings" value={money(scenario.annualizedNetSavings)}/>
      <Box label="Cost / successful task (before)" value={money(scenario.baselineCostPerSuccessfulTask)}/>
      <Box label="Cost / successful task (after)" value={money(scenario.optimizedCostPerSuccessfulTask)}/>
      <Box label="Fallback requests" value={num(scenario.fallbackRequests)}/>
      <Box label="Break-even tasks / month" value={num(scenario.breakEvenMonthlyVolume)}/>
      </div><Notice>These are scenario estimates. Optimized cost includes fallback premium calls and declared platform/infrastructure fees. Nothing here is verified savings.</Notice></>}
  </>;
}
