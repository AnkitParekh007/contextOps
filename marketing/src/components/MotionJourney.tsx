import {useEffect,useRef,useState} from "react";
import {ArrowRight,BarChart3,Check,CheckCircle2,Database,FileText,FlaskConical,
  GitBranch,Layers3,ShieldAlert,ShieldCheck,Sparkles} from "lucide-react";
import {processSteps} from "../../../src/lib/marketing-content";

const steps=processSteps;

function StageVisual({stage}:{stage:number}){
  if(stage===0)return <div className="motion-stage-content" key="setup">
    <span className="motion-mini-label">WORKSPACE CREATED</span>
    <div className="motion-workspace"><span className="motion-workspace-icon"><Layers3 size={24}/></span>
      <div><strong>Support ticket triage</strong><span>Northwind Logistics / Synthetic demo</span></div><CheckCircle2 size={20}/></div>
    <div className="motion-kv"><span>Model baseline</span><strong>Mock premium</strong></div>
    <div className="motion-kv"><span>Task type</span><strong>Structured classification</strong></div>
    <div className="motion-kv"><span>Environment</span><strong>Read-only pilot</strong></div>
  </div>;
  if(stage===1)return <div className="motion-stage-content" key="import">
    <span className="motion-mini-label">AUTHORIZED IMPORT</span>
    <div className="motion-import-row"><Database size={20}/><div><strong>support-traces.csv</strong><span>Redacted sample · Synthetic</span></div><span>CSV</span></div>
    <div className="motion-import-progress"><span/></div>
    <div className="motion-stage-metrics"><div><strong>500</strong><span>Records</span></div><div><strong>6</strong><span>Example classes</span></div><div><strong>0</strong><span>External calls</span></div></div>
  </div>;
  if(stage===2)return <div className="motion-stage-content" key="analysis">
    <span className="motion-mini-label">TASK SUITABILITY</span>
    {[
      {label:"Routine ticket",status:"Eligible to evaluate",type:"safe"},
      {label:"Unknown request",status:"Manual review",type:"review"},
      {label:"Sensitive context",status:"Blocked",type:"block"},
    ].map(item=><div className={"motion-routing-row "+item.type} key={item.label}>
      <span className="motion-route-dot"/><strong>{item.label}</strong><span>{item.status}</span></div>)}
    <p className="motion-footnote">Heuristics identify candidates—not proven model parity.</p>
  </div>;
  if(stage===3)return <div className="motion-stage-content" key="evaluate">
    <span className="motion-mini-label">LABELED QUALITY BENCHMARK</span>
    <div className="motion-eval-target"><FlaskConical size={24}/><div><strong>Quality gate</strong><span>Candidate vs. baseline</span></div><span>TEST</span></div>
    <div className="motion-quality-list"><div><span>Accuracy</span><span className="motion-quality-track"><i style={{width:"91%"}}/></span><span>Measured</span></div>
      <div><span>Macro-F1</span><span className="motion-quality-track"><i style={{width:"86%"}}/></span><span>Measured</span></div>
      <div><span>Latency</span><span className="motion-quality-track"><i style={{width:"76%"}}/></span><span>Compared</span></div></div>
    <p className="motion-footnote">Illustrative bars; not a customer benchmark result.</p>
  </div>;
  if(stage===4)return <div className="motion-stage-content" key="simulate">
    <span className="motion-mini-label">OFFLINE ROUTING SIMULATION</span>
    <div className="motion-sim-diagram">
      <div className="motion-sim-in"><GitBranch size={19}/> Workflow traces</div>
      <div className="motion-sim-line"/><div className="motion-sim-branches"><div className="motion-sim-safe"><Check size={16}/> Candidate path</div>
      <div className="motion-sim-safe"><ShieldCheck size={16}/> Premium fallback</div>
      <div className="motion-sim-warning"><ShieldAlert size={16}/> Human review</div></div>
    </div>
    <p className="motion-footnote">No changes to live provider calls.</p>
  </div>;
  return <div className="motion-stage-content" key="report">
    <span className="motion-mini-label">AUDITABLE ASSESSMENT</span>
    <div className="motion-report-doc"><div className="motion-doc-head"><FileText size={19}/><strong>Cost &amp; Quality Assessment</strong><span>MD</span></div>
      {["Observed workload","Candidate benchmark","Scenario assumptions","Routing decisions"].map((label,i)=>
        <div className="motion-doc-line" key={label}><Check size={14}/><span>{label}</span><i style={{width:(74-i*9)+"%"}}/></div>)}
    </div>
    <div className="motion-report-badge"><ShieldCheck size={17}/> Savings labeled simulated, not verified</div>
  </div>;
}

export function MotionJourney(){
  const [active,setActive]=useState(0);
  const nodeRefs=useRef<(HTMLLIElement|null)[]>([]);
  useEffect(()=>{
    if(!("IntersectionObserver" in window))return;
    const io=new IntersectionObserver(entries=>{
      const middle=entries.filter(e=>e.isIntersecting).sort((a,b)=>b.intersectionRatio-a.intersectionRatio)[0];
      if(middle)setActive(Number((middle.target as HTMLElement).dataset.step));
    },{rootMargin:"-32% 0px -40% 0px",threshold:[0,.1,.5]});
    nodeRefs.current.forEach(node=>{if(node)io.observe(node);});
    return()=>io.disconnect();
  },[]);
  return <div className="journey-story">
    <div className="journey-sticky" aria-live="off">
      <div className="motion-stage-frame">
        <div className="motion-stage-chrome"><div className="window-dots"><i/><i/><i/></div>
          <span className="motion-stage-path">contextops / <strong>{steps[active].phase.toLowerCase()}</strong></span>
          <span className="motion-stage-status"><i/> SIMULATED DEMO</span></div>
        <div className="motion-stage-rail">{steps.map((step,i)=><span key={step.number} className={i===active?"active":i<active?"complete":""}><i/>{step.phase}</span>)}</div>
        <div className="motion-stage-body"><div className="motion-stage-top"><span>STEP {steps[active].number} / 06</span><span><Sparkles size={13}/> WORKFLOW PREVIEW</span></div>
          <div className="motion-stage-enter" key={active}><StageVisual stage={active}/></div>
        </div>
        <div className="motion-stage-footer"><span><ShieldCheck size={15}/> Evidence-driven workflow</span><span>Preview · Not live customer data</span></div>
      </div>
      <div className="motion-dots">{steps.map((s,i)=><button key={s.number} type="button" aria-label={"Jump to "+s.phase}
        className={active===i?"active":""} onClick={()=>nodeRefs.current[i]?.scrollIntoView({behavior:window.matchMedia("(prefers-reduced-motion: reduce)").matches?"auto":"smooth",block:"center"})}/>)}</div>
    </div>
    <ol className="journey-story-steps">{steps.map((step,i)=><li data-step={i} key={step.number}
        ref={node=>{nodeRefs.current[i]=node;}} className={"journey-story-step"+(i===active?" active":"")}>
      <div className="journey-step-number">{step.number} <span>/ 06</span></div>
      <div className="journey-step-phase">{step.phase.toUpperCase()}</div>
      <h3>{step.title}</h3><p>{step.description}</p>
      <div className="journey-mobile-stage" aria-hidden="true"><StageVisual stage={i}/></div>
      <div className="journey-step-next">{i===steps.length-1?"Generate evidence":steps[i+1].phase+" next"}<ArrowRight size={15}/></div>
    </li>)}</ol>
  </div>;
}
