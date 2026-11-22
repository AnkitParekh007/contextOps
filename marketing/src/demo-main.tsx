import {useMemo,useState} from "react";
import {createRoot} from "react-dom/client";
import {ArrowLeft,ArrowRight,BarChart3,BrainCircuit,Check,CheckCircle2,
  ChevronRight,CircleHelp,ClipboardCheck,Download,FileText,FlaskConical,
  GitBranch,Layers3,LockKeyhole,RotateCcw,ShieldAlert,ShieldCheck,SlidersHorizontal,
  Sparkles,Workflow,XCircle} from "lucide-react";
import {ThemeControl} from "./components/ThemeControl";
import {assess,defaultSettings,labels,reportMarkdown,traces,type DemoSettings} from "./demo-data";
import "./styles.css";
import "./motion.css";
import "./blueprint.css";
import "./demo.css";

const money=(n:number)=>new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",maximumFractionDigits:2}).format(n);
const number=(n:number)=>new Intl.NumberFormat("en-US",{maximumFractionDigits:0}).format(n);
const steps=[
  {title:"Explore",short:"Workspace",detail:"Explore the 500-record synthetic workspace.",icon:Layers3},
  {title:"Inspect",short:"Import & analyze",detail:"Inspect categories, trace payloads and label coverage.",icon:BrainCircuit},
  {title:"Benchmark",short:"Evaluate MOCK",detail:"Compare deterministic mock predictions with the expected labels.",icon:FlaskConical},
  {title:"Approve",short:"Quality policy",detail:"Make a simulation-only routing decision based on quality gates.",icon:ShieldCheck},
  {title:"Simulate",short:"Shadow & costing",detail:"Model the routing economics without affecting production.",icon:GitBranch},
  {title:"Export",short:"Assessment report",detail:"Download a clearly labeled synthetic assessment.",icon:FileText},
];
const explanations=[
  "A repeatable classification task is a good candidate for benchmarking because each ticket has a known answer.",
  "This demonstration uses exactly 500 locally generated tickets—no uploaded CSVs or external systems.",
  "The local rule-based MOCK deliberately misclassifies some ticket numbers, so quality gates can be tested.",
  "An accepted policy is approved for simulation only. No real customer traffic or AI providers are changed.",
  "The projected monthly difference uses assumptions, not actual customer invoices or operational performance.",
  "The report is generated from the controls above and contains explicit limitations and the simulated evidence level.",
];
function ExportButton({settings}:{settings:DemoSettings}){
  const download=()=>{
    const content=reportMarkdown(settings);
    const blob=new Blob([content],{type:"text/markdown;charset=utf-8"});
    const url=URL.createObjectURL(blob);
    const link=document.createElement("a");
    link.href=url;
    link.download="ContextOps_Synthetic_Assessment.md";
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(()=>URL.revokeObjectURL(url),1000);
  };
  return <button className="demo-primary" type="button" onClick={download}>
    <Download size={18}/> Download synthetic assessment
  </button>;
}
function MoneyBox({title,value,detail}:{title:string;value:string;detail?:string}){
  return <div className="demo-metric"><span>{title}</span><strong>{value}</strong>{detail&&<small>{detail}</small>}</div>;
}
function Field({label,value,min,max,step,onChange,format}:{label:string;value:number;min:number;max:number;step:number;
  onChange:(x:number)=>void;format?:(value:number)=>string}){
  const fmt=format??((v:number)=>String(v));
  return <label className="demo-field">
    <span>{label}<strong>{fmt(value)}</strong></span>
    <input type="range" value={value} min={min} max={max} step={step}
      onChange={e=>onChange(Number(e.currentTarget.value))}/>
  </label>;
}
function DemoApp(){
  const [active,setActive]=useState(0);
  const [settings,setSettings]=useState<DemoSettings>(defaultSettings);
  const result=useMemo(()=>assess(settings),[settings]);
  const change=(key:keyof DemoSettings)=>(value:number)=>setSettings(previous=>({...previous,[key]:value}));
  const completed=active+1;
  return <div className="demo-shell">
    <a href="#demo-main" className="skip-link">Skip to interactive demo</a>
    <header className="demo-header"><div className="demo-container demo-header-inner">
      <a href="/contextOps/" className="demo-brand"><span className="demo-brand-icon"><Layers3 size={22}/></span>
        <span>context<strong>ops</strong><em>.ai</em></span></a>
      <div className="demo-header-right"><span className="demo-mode"><span/> LIVE BROWSER DEMO</span>
        <ThemeControl/><a href="/contextOps/" className="demo-back"><ArrowLeft size={16}/> <span>Back to website</span></a></div>
    </div></header>
    <main id="demo-main">
      <div className="demo-container">
        <div className="demo-hero"><div><div className="demo-kicker"><Sparkles size={15}/> PRODUCT WALKTHROUGH / PHASE 10</div>
          <h1>Watch smarter AI<br/><em>decisions take shape.</em></h1>
          <p>Explore a simulated cost-and-quality assessment from input traces to final report.
            Every step is deterministic, runs in your browser and uses synthetic support tickets.</p>
          <div className="demo-hero-badges">
            <span><CheckCircle2 size={16}/> 500 synthetic tickets</span>
            <span><LockKeyhole size={16}/> No login or uploads</span>
            <span><ShieldCheck size={16}/> No provider calls</span>
          </div></div>
          <div className="demo-topology" aria-hidden="true">
            <div className="demo-topology-pulse"/>
            <div className="demo-topology-node n1"><Layers3 size={20}/></div>
            <div className="demo-topology-node n2"><BrainCircuit size={20}/></div>
            <div className="demo-topology-node n3"><FlaskConical size={20}/></div>
            <div className="demo-topology-node n4"><ShieldCheck size={20}/></div>
            <svg viewBox="0 0 320 230" className="demo-topology-paths">
              <path d="M 58 115 C 100 115 100 57 154 57 S 220 115 264 115" />
              <path d="M 58 115 C 100 115 100 173 154 173 S 220 115 264 115"/>
            </svg>
          </div>
        </div>
        <div className="demo-disclaimer"><ShieldAlert size={20}/><div>
          <strong>This is a synthetic product preview, not a customer benchmark.</strong>
          <p>MOCK uses deterministic classification rules. All projected costs, fallbacks and savings are illustrative and never verified financial results. The actual application and database are separate from this page.</p>
        </div></div>
        <div className="demo-workspace">
          <aside className="demo-sidebar">
            <div className="demo-side-top"><span>YOUR WALKTHROUGH</span><span>0{completed} / 06</span></div>
            <div className="demo-progress" aria-hidden="true"><span style={{width:((completed/6)*100)+"%"}}/></div>
            <nav aria-label="Demo stages">
              {steps.map((step,i)=><button key={step.title} type="button" onClick={()=>setActive(i)}
                aria-current={active===i?"step":undefined} className={"demo-nav-step"+(active===i?" active":"")}>
                <span className="demo-nav-num">{String(i+1).padStart(2,"0")}</span>
                <span className="demo-nav-copy"><strong>{step.title}</strong><small>{step.short}</small></span>
                {active===i?<ChevronRight size={17}/>:i<active?<Check size={16}/>:null}
              </button>)}
            </nav>
            <div className="demo-side-help"><CircleHelp size={19}/><strong>What am I seeing?</strong>
              <p>{explanations[active]}</p></div>
          </aside>
          <section className="demo-stage" aria-live="polite">
            <div className="demo-stage-top"><span>STEP {String(completed).padStart(2,"0")} / 06</span><span><span className="demo-live-dot"/> BROWSER-ONLY SIMULATION</span></div>
            <div key={active} className="demo-step-content">
              <div className="demo-stage-heading"><div className="demo-heading-icon">{(() => {const Icon=steps[active].icon;return <Icon size={23}/>;})()}</div>
                <div><h2>{steps[active].short}</h2><p>{steps[active].detail}</p></div></div>
              {active===0&&<>
                <div className="demo-bento"><MoneyBox title="WORKSPACE" value="Northwind" detail="Fictional logistics organization"/>
                  <MoneyBox title="DATASET SIZE" value="500" detail="Locally generated traces"/>
                  <MoneyBox title="BASELINE" value="MOCK" detail="mock-premium"/>
                  <MoneyBox title="TASK TYPE" value="6 labels" detail="Support classification"/></div>
                <div className="demo-note"><ShieldCheck size={20}/><div><strong>Read-only, no account needed</strong>
                  <p>The live backend is not involved. The browser generates a fixed dataset and computes the walkthrough locally.</p></div></div>
              </>}
              {active===1&&<>
                <div className="demo-inline-stats"><span><DatabaseIcon/> 500 / 500 traces loaded</span><span><CheckCircle2 size={16}/> Ground truth available</span></div>
                <div className="demo-category-grid">{result.categories.map(c=><div key={c.label} className="demo-category">
                  <span>{c.label}</span><strong>{c.count}</strong><span className="demo-category-bar"><i style={{width:(100*c.count/500)+"%"}}/></span>
                </div>)}</div>
                <div className="demo-table-wrap"><table><caption>Preview of the first six synthetic traces</caption>
                  <thead><tr><th>TRACE</th><th>INPUT</th><th>EXPECTED LABEL</th></tr></thead>
                  <tbody>{traces.slice(0,6).map(t=><tr key={t.id}><td>{t.id}</td><td>{t.ticket}</td><td>{t.label}</td></tr>)}</tbody>
                </table></div>
              </>}
              {active===2&&<>
                <div className="demo-controls-inline">
                  <Field label="Labeled benchmark size" min={5} max={50} step={5} value={settings.sampleCount}
                    onChange={change("sampleCount")} format={n=>n+" samples"}/>
                  <span>Selection: first consecutive synthetic records. Not random or representative of customer workloads.</span>
                </div>
                <div className="demo-bento"><MoneyBox title="SAMPLE ACCURACY" value={(100*result.quality).toFixed(1)+"%"}/>
                  <MoneyBox title="MACRO-F1" value={(100*result.f1).toFixed(1)+"%"}/>
                  <MoneyBox title="CORRECT LABELS" value={result.correct+" / "+result.sample.length}/>
                  <MoneyBox title="BENCHMARK ENGINE" value="MOCK" detail="No real LLM requests"/></div>
                <div className="demo-table-wrap"><table><caption>First eight benchmark comparisons (rule-based mock)</caption>
                  <thead><tr><th>TICKET</th><th>EXPECTED</th><th>MOCK PREDICTION</th><th>RESULT</th></tr></thead>
                  <tbody>{result.predictions.slice(0,8).map(row=><tr key={row.trace.id}>
                    <td>{row.trace.id}</td><td>{row.expected}</td><td>{row.actual}</td>
                    <td>{row.valid?<span className="demo-match">Match</span>:<span className="demo-fail">Mismatch</span>}</td>
                  </tr>)}</tbody></table></div>
              </>}
              {active===3&&<>
                <div className="demo-policy-state"><div className={"demo-status-icon "+(result.passes?"pass":"fail")}>{result.passes?<ShieldCheck size={27}/>:<XCircle size={27}/>}</div>
                  <div><span>SIMULATION POLICY STATE</span><h3>{result.passes?"Approved for simulation":"Quality gate declined"}</h3>
                    <p>{result.passes?"The sampled mock clears all demo thresholds. No production routing is enabled.":
                      "The sampled mock does not clear the required quality/cost gates. The safer premium path is preserved."}</p></div></div>
                <div className="demo-policy-controls">
                  <Field label="Minimum candidate accuracy" value={settings.minimumQuality} min={.9} max={1} step={.01}
                    onChange={change("minimumQuality")} format={n=>(n*100).toFixed(0)+"%"}/>
                  <div className="demo-rule"><Check size={17}/><span>Within 5 percentage points of baseline quality</span><strong>{result.quality>=.95?"PASS":"FAIL"}</strong></div>
                  <div className="demo-rule"><Check size={17}/><span>Observed synthetic benchmark error rate ≤ 5%</span><strong>{1-result.quality<=.05?"PASS":"FAIL"}</strong></div>
                  <div className="demo-rule"><Check size={17}/><span>Candidate test-set token-price estimate below baseline</span><strong>{result.candidateTotal<result.baselineTotal?"PASS":"FAIL"}</strong></div>
                  <div className="demo-rule"><Check size={17}/><span>Quality threshold selected above</span><strong>{result.quality>=settings.minimumQuality?"PASS":"FAIL"}</strong></div>
                </div>
              </>}
              {active===4&&<>
                <div className="demo-bento demo-route-metrics">
                  <MoneyBox title="CANDIDATE PATH" value={number(result.candidateCount)} detail="Of 500 synthetic records"/>
                  <MoneyBox title="PREMIUM PATH" value={number(result.premiumCount)} detail="If quality gate declines"/>
                  <MoneyBox title="HUMAN REVIEW" value="0" detail="None flagged in this particular seed"/>
                  <MoneyBox title="LIVE ROUTING" value="OFF" detail="Simulation only"/>
                </div>
                <div className="demo-financial-layout">
                  <div className="demo-settings"><h3><SlidersHorizontal size={18}/> Assumptions</h3>
                    <Field label="Estimated tasks / month" min={10000} max={1000000} step={10000}
                      value={settings.monthlyVolume} onChange={change("monthlyVolume")} format={number}/>
                    <Field label="Assumed premium fallback" min={0} max={100} step={5} value={settings.fallbackPercent}
                      onChange={change("fallbackPercent")} format={n=>n+"%"}/>
                    <Field label="Infrastructure monthly (USD)" min={0} max={5000} step={50}
                      value={settings.infrastructureMonthly} onChange={change("infrastructureMonthly")} format={money}/>
                  </div>
                  <div className="demo-cost-summary">
                    <span>MODELED MONTHLY DIFFERENCE</span>
                    <strong className={result.simulated>=0?"positive":"negative"}>{money(result.simulated)}</strong>
                    <p>{result.simulated>=0?"Lower modeled cost":"Higher modeled cost"} · not verified</p>
                    <div><span>Premium-only scenario</span><b>{money(result.baselineMonthly)}</b></div>
                    <div><span>Candidate + premium + overhead</span><b>{money(result.projectedMonthly)}</b></div>
                    <small>Prices: $2/$10 baseline, $0.10/$0.50 candidate per million input/output tokens. One additional candidate attempt on fallback. The fallback percentage is chosen—not a measured detection rate.</small>
                  </div>
                </div>
              </>}
              {active===5&&<>
                <div className="demo-report-preview"><div className="demo-report-heading"><ClipboardCheck size={24}/>
                    <div><strong>Cost &amp; Quality Assessment</strong><span>ContextOps_Synthetic_Assessment.md</span></div>
                    <span>MARKDOWN</span></div>
                  <div className="demo-report-line"><CheckCircle2 size={18}/> Dataset and provenance <span>500 synthetic</span></div>
                  <div className="demo-report-line"><CheckCircle2 size={18}/> Labeled benchmark <span>{(100*result.quality).toFixed(1)}% MOCK</span></div>
                  <div className="demo-report-line"><CheckCircle2 size={18}/> Quality policy <span>{result.passes?"Passed":"Declined"}</span></div>
                  <div className="demo-report-line"><CheckCircle2 size={18}/> Monthly scenario <span>{money(result.simulated)}</span></div>
                  <div className="demo-report-line"><ShieldAlert size={18}/> Verified customer savings <span>NOT AVAILABLE</span></div>
                </div>
                <div className="demo-export-actions"><ExportButton settings={settings}/>
                  <button className="demo-reset" type="button" onClick={()=>{setSettings(defaultSettings);setActive(0);}}><RotateCcw size={17}/> Restart</button></div>
                <p className="demo-export-note">No data is sent to a server. The download is created in your browser and includes scenario assumptions and benchmark limitations.</p>
              </>}
            </div>
            <div className="demo-stage-footer">
              <button type="button" className="demo-secondary" disabled={active===0} onClick={()=>setActive(n=>Math.max(0,n-1))}>
                <ArrowLeft size={17}/> Previous
              </button>
              {active<5?<button className="demo-primary" type="button" onClick={()=>setActive(n=>Math.min(5,n+1))}>
                Next: {steps[active+1].title} <ArrowRight size={17}/>
              </button>:<a href="/contextOps/" className="demo-secondary">Back to website <ArrowRight size={16}/></a>}
            </div>
          </section>
        </div>
        <div className="demo-bottom-strip"><span><ShieldCheck size={18}/> No production traffic</span>
          <span><BarChart3 size={18}/> Cost estimates, not savings evidence</span>
          <a href="https://github.com/AnkitParekh007/contextOps/blob/main/docs/PILOT_OPERATIONS.md" target="_blank" rel="noreferrer">
            Read the pilot methodology <ArrowRight size={15}/></a></div>
      </div>
    </main>
    <footer className="demo-footer"><div className="demo-container"><span>© ContextOps AI · Open-source controlled pilot</span>
      <span>Simulate safely. Measure before you migrate.</span></div></footer>
  </div>;
}
function DatabaseIcon(){return <Workflow size={17}/>;}
const root=document.getElementById("root");
if(!root)throw new Error("Missing demo root");
createRoot(root).render(<DemoApp/>);
