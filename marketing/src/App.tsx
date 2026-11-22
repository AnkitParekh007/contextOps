import {useEffect,useMemo,useRef,useState} from "react";
import type {ReactNode,PointerEvent} from "react";
import {ThemeControl} from "./components/ThemeControl";
import {MotionJourney} from "./components/MotionJourney";
import {HeroSignals} from "./components/HeroSignals";
import {RoutingStream} from "./components/RoutingStream";
import {useReveal} from "./hooks/useReveal";
import {useCountUp} from "./hooks/useCountUp";
import {ArrowDown,ArrowDownRight,ArrowRight,ArrowUpRight,BarChart3,BrainCircuit,
  Calculator,Check,CheckCircle2,ChevronDown,ChevronRight,CircleHelp,CloudUpload,
  Code2,Cpu,Database,ExternalLink,FileDown,FileText,FlaskConical,Github,GitBranch,
  Layers3,LockKeyhole,Menu,Minus,MousePointer2,Play,RotateCcw,Route,Shield,
  ShieldAlert,ShieldCheck,SlidersHorizontal,Sparkles,Workflow,X,Zap} from "lucide-react";
import {capabilities,faqs,githubUrl,pilotBoundary,processSteps,useCases} from "../../src/lib/marketing-content";
import {calculateSavings} from "./cost";

const docs=githubUrl+"/blob/main/README.md";
const safeDocs=githubUrl+"/blob/main/docs/SECURITY.md";
const accepted=githubUrl+"/blob/main/docs/ACCEPTANCE.md";
const start=githubUrl+"#start-locally";
const interactiveDemo="/contextOps/demo/";
const icons={
  layers:Layers3,database:Database,brain:BrainCircuit,calculator:Calculator,
  flask:FlaskConical,shield:ShieldCheck,route:Route,chart:BarChart3,lock:LockKeyhole
};
function Icon({name,size=23}:{name:keyof typeof icons;size?:number}){
  const C=icons[name];return <C size={size} strokeWidth={1.8}/>;
}
const nav=[{id:"capabilities",label:"Platform"},{id:"workflow",label:"How it works"},
  {id:"use-cases",label:"Use cases"},{id:"security",label:"Trust"}];
const numberFmt=(value:number)=>new Intl.NumberFormat("en-US",{maximumFractionDigits:0}).format(value);
const money=(value:number)=>new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",maximumFractionDigits:0}).format(value);
function Brand({inverse=false}:{inverse?:boolean}){
  return <a className={"brand"+(inverse?" brand-inverse":"")} href="#home" aria-label="ContextOps AI home">
    <span className="brand-mark"><Layers3 size={25} strokeWidth={2.1}/></span>
    <span>context<span className="brand-ops">ops</span><span className="brand-ai">.ai</span></span>
  </a>;
}
function Header(){
  const [open,setOpen]=useState(false);
  const [scrolled,setScrolled]=useState(false);
  const [progress,setProgress]=useState(0);
  const [active,setActive]=useState("");
  useEffect(()=>{
    let frame=0;
    const refresh=()=>{
      if(frame)return;
      frame=window.requestAnimationFrame(()=>{
        frame=0;
        const scroll=window.scrollY;
        setScrolled(scroll>12);
        const available=Math.max(1,document.documentElement.scrollHeight-window.innerHeight);
        setProgress(Math.min(1,Math.max(0,scroll/available)));
      });
    };
    refresh();
    window.addEventListener("scroll",refresh,{passive:true});
    window.addEventListener("resize",refresh);
    return()=>{window.cancelAnimationFrame(frame);window.removeEventListener("scroll",refresh);window.removeEventListener("resize",refresh);};
  },[]);
  useEffect(()=>{
    if(!("IntersectionObserver" in window))return;
    const sections=nav.map(item=>document.getElementById(item.id)).filter((node):node is HTMLElement=>Boolean(node));
    const io=new IntersectionObserver(entries=>{
      for(const entry of entries){
        if(entry.isIntersecting)setActive(entry.target.id);
      }
    },{rootMargin:"-25% 0px -55% 0px",threshold:0});
    sections.forEach(section=>io.observe(section));
    return()=>io.disconnect();
  },[]);
  return <>
    <div className="announcement"><span className="pulse-dot"/><span>Now available: open-source controlled pilot</span><a href={githubUrl} target="_blank" rel="noreferrer">Explore repository <ArrowRight size={13}/></a></div>
    <header className={"site-header"+(scrolled?" is-scrolled":"")}>
      <div className="container header-content">
        <Brand/>
        <nav className="desktop-nav" aria-label="Main navigation">
          {nav.map(item=><a className={active===item.id?"active":""} href={"#"+item.id} key={item.id}>{item.label}</a>)}
        </nav>
        <div className="header-cta">
          <ThemeControl/>
          <a className="header-gh" href={githubUrl} target="_blank" rel="noreferrer"><Github size={17}/><span>GitHub</span></a>
          <a className="btn btn-dark btn-sm" href={interactiveDemo}>Try demo <ArrowRight size={16}/></a>
          <button type="button" className="menu-toggle" aria-label={open?"Close navigation":"Open navigation"} aria-controls="mobile-nav" aria-expanded={open} onClick={()=>setOpen(!open)}>{open?<X size={24}/>:<Menu size={24}/>}</button>
        </div>
      </div>
      {open&&<nav id="mobile-nav" className="mobile-nav" aria-label="Mobile navigation">
        {nav.map(item=><a className={active===item.id?"active":""} href={"#"+item.id} key={item.id} onClick={()=>setOpen(false)}>{item.label}<ChevronRight size={18}/></a>)}
        <a href="#calculator" onClick={()=>setOpen(false)}>Cost calculator <ChevronRight size={18}/></a>
        <a href={interactiveDemo} onClick={()=>setOpen(false)}>Try product demo <ArrowRight size={17}/></a>
        <a href={githubUrl} target="_blank" rel="noreferrer" onClick={()=>setOpen(false)}>View source <ExternalLink size={16}/></a>
      </nav>}
      <span aria-hidden="true" className="header-scroll-track"><span className="header-scroll-progress" style={{transform:"scaleX("+progress+")"}}/></span>
    </header>
  </>;
}
function Eyebrow({children,light=false}:{children:ReactNode;light?:boolean}){
  return <span className={"eyebrow"+(light?" eyebrow-light":"")}><span className="eyebrow-line"/>{children}</span>;
}
function SectionHead({eyebrow,title,desc,center=false}:{eyebrow:string;title:ReactNode;desc?:string;center?:boolean}){
  return <div className={"section-head"+(center?" center":"")}><Eyebrow>{eyebrow}</Eyebrow><h2>{title}</h2>{desc&&<p>{desc}</p>}</div>;
}
function HeroBoard(){
  const heroRef=useRef<HTMLDivElement>(null);
  const onPointerMove=(event:PointerEvent<HTMLDivElement>)=>{
    if(!window.matchMedia("(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)").matches)return;
    const element=heroRef.current;if(!element)return;
    const bounds=element.getBoundingClientRect();
    const x=(event.clientX-bounds.left)/bounds.width-.5;
    const y=(event.clientY-bounds.top)/bounds.height-.5;
    element.style.setProperty("--hero-rotate-x",(2-y*4).toFixed(2)+"deg");
    element.style.setProperty("--hero-rotate-y",(-5+x*7).toFixed(2)+"deg");
  };
  const onPointerLeave=()=>{
    heroRef.current?.style.removeProperty("--hero-rotate-x");
    heroRef.current?.style.removeProperty("--hero-rotate-y");
  };
  const rows=[["Routine classification","Candidate evaluation","Eligible to test"],["Complex reasoning","Premium baseline","Preserve"],["Sensitive context","Human review","Escalate"]];
  return <div ref={heroRef} className="hero-art" onPointerMove={onPointerMove} onPointerLeave={onPointerLeave} aria-label="Illustration of a synthetic ContextOps workspace">
    <div className="hero-glow"/><HeroSignals/>
    <div className="hero-mini-tag top"><ShieldCheck size={17}/><span>Quality gate <strong>before routing</strong></span></div>
    <div className="hero-window">
      <div className="window-chrome"><span className="window-dots"><i/><i/><i/></span><span>CONTEXTOPS / WORKFLOW</span><span className="window-connected"><i/> Synthetic demo</span></div>
      <div className="window-inner">
        <div className="window-heading"><div className="window-app-icon"><Layers3 size={22}/></div><div><h3>Support ticket triage</h3><span>Northwind Logistics · Demo workspace</span></div><span className="window-phase">OFFLINE</span></div>
        <div className="window-metrics"><div><span>DATASET</span><strong>500 <small>tickets</small></strong><span>Generated sample</span></div>
          <div><span>ROUTING</span><strong>Shadow <small>mode</small></strong><span>No production changes</span></div>
          <div><span>REVIEW</span><strong>Human <small>in the loop</small></strong><span>High-risk tasks</span></div></div>
        <div className="window-flow"><div className="window-flow-heading"><span>THE ASSESSMENT PIPELINE</span><span><span className="green-dot"/> Ready to explore</span></div>
          <div className="window-flow-grid">{[
            {icon:CloudUpload,label:"Import"},{icon:BrainCircuit,label:"Analyze"},{icon:FlaskConical,label:"Evaluate"},{icon:GitBranch,label:"Simulate"}
          ].map((s,i)=><div className="window-flow-node" key={s.label}><span><s.icon size={17}/></span><strong>{s.label}</strong>{i<3&&<ArrowRight className="stage-arrow" size={18}/>}</div>)}</div>
        </div>
        <div className="window-table"><div className="table-title"><span>Example decisions</span><span>ILLUSTRATIVE</span></div>
          {rows.map(([task,path,outcome],i)=><div className="table-line" key={task}><span className={"row-indicator row-"+i}/><span>{task}</span><span>{path}</span><strong>{outcome}</strong></div>)}
        </div>
        <div className="window-foot"><span><ShieldCheck size={15}/> Safe by design</span><span>Measured quality &gt; cheapest price</span></div>
      </div>
    </div>
    <div className="hero-mini-tag bottom"><ActivityMini/><span>Measure first <strong>optimize second</strong></span></div>
  </div>;
}
function ActivityMini(){return <div className="activity-mini"><span/><span/><span/><span/></div>}
function Hero(){
  return <section className="hero" id="home"><div className="container hero-grid">
    <div className="hero-copy"><div className="hero-eyebrow"><Sparkles size={15}/> INTELLIGENCE THAT EARNS ITS COST <span className="tiny-arrow">↗</span></div>
      <h1>Stop paying <em>premium prices</em> for routine AI work.</h1>
      <p className="hero-lead">Your AI stack is powerful. Not every task needs all of it. ContextOps helps you find where lower-cost models might work—<strong>without gambling on quality.</strong></p>
      <div className="hero-actions"><a className="btn btn-primary" href={interactiveDemo}>Try interactive demo <ArrowRight size={18}/></a><a className="btn btn-ghost" href={start} target="_blank" rel="noreferrer">Explore the open-source MVP <ArrowUpRight size={17}/></a></div>
      <div className="hero-notes"><span><CheckCircle2 size={17}/> Real evaluation workflows</span><span><CheckCircle2 size={17}/> Offline routing simulation</span></div>
    </div>
    <HeroBoard/>
  </div><div className="container hero-bottom"><span>BUILT FOR TEAMS ALREADY USING AI</span>
    <div><span>Support</span><i/><span>Operations</span><i/><span>Engineering</span><i/><span>AI platform teams</span></div>
    <span className="hero-bottom-note">OPEN SOURCE · CONTROLLED PILOT</span>
  </div></section>;
}
function Why(){
  return <section className="why-section"><div className="container why-layout"><div className="why-title"><Eyebrow>THE COST OF GENERAL-PURPOSE AI</Eyebrow><h2>The smartest model is not always <em>the right model.</em></h2></div>
    <div className="why-right"><p>Classifying the same support intent all day? Extracting the same invoice fields? Your workflows have patterns. Your model costs don&apos;t automatically account for them.</p>
      <p>ContextOps takes a measured approach: <strong>understand the task, benchmark alternatives, and simulate routing with a premium fallback.</strong></p>
      <a className="text-link" href="#capabilities">See what the platform covers <ArrowRight size={18}/></a></div></div>
    <div className="container principle-grid"><div className="principle"><div><Database size={24}/></div><h3>Know the workload</h3><p>Find where tokens and repeated patterns accumulate.</p></div><div className="principle"><div><ShieldCheck size={24}/></div><h3>Protect the outcome</h3><p>Use quality thresholds and human oversight—not wishful thinking.</p></div><div className="principle"><div><BarChart3 size={24}/></div><h3>Prove the economics</h3><p>Account for fallbacks, retries, fees, and successful tasks.</p></div></div>
  </section>;
}
function DemoTeaser(){
  return <section className="demo-teaser-section" aria-labelledby="demo-teaser-title"><div className="container">
    <div className="demo-teaser"><div className="demo-teaser-copy">
      <Eyebrow>EXPLORE THE PRODUCT</Eyebrow>
      <h2 id="demo-teaser-title">From 500 synthetic traces to a <em>downloadable assessment.</em></h2>
      <p>Experience the entire quality-first workflow in your browser. Inspect labels, benchmark MOCK predictions, see policy gates respond, and export a simulation-only report. No sign-up, API keys or customer records.</p>
      <div className="demo-teaser-actions">
        <a href={interactiveDemo} className="btn btn-primary">Launch guided demo <ArrowRight size={18}/></a>
        <a href={interactiveDemo+"#report"} className="btn btn-ghost">Preview sample report <FileText size={17}/></a>
      </div>
      <span className="demo-teaser-foot"><ShieldCheck size={16}/> Fixed synthetic dataset · No production routing · Zero verified savings claims</span>
    </div>
    <div className="demo-teaser-terminal" aria-hidden="true"><div className="demo-teaser-chrome"><span/><span/><span/><b>DEMO / WORKFLOW</b></div>
      <div className="demo-teaser-line"><span>01</span><CheckCircle2 size={15}/><strong>Loaded</strong><em>500 sample traces</em></div>
      <div className="demo-teaser-line"><span>02</span><CheckCircle2 size={15}/><strong>Analyzed</strong><em>6 support categories</em></div>
      <div className="demo-teaser-line"><span>03</span><FlaskConical size={15}/><strong>Benchmarked</strong><em>local MOCK provider</em></div>
      <div className="demo-teaser-line"><span>04</span><GitBranch size={15}/><strong>Simulated</strong><em>quality-gated routing</em></div>
      <div className="demo-teaser-footer"><FileDown size={17}/> Assessment.md <span>SIMULATED ONLY</span></div>
    </div></div></div></section>;
}
function Capabilities(){
  return <section className="features-section section-padding" id="capabilities"><div className="container">
    <div className="feature-heading"><SectionHead eyebrow="THE PLATFORM" title={<>One connected workflow.<br/><em>Nine useful capabilities.</em></>} desc="From messy execution traces to a report you can defend. These features are implemented in the controlled-pilot MVP."/>
      <div className="section-side-note"><span className="note-disc"><Check size={20}/></span><p>Built and tested in the repository. Simulation-only routing. No production deployment claims.</p></div></div>
    <div className="feature-grid">{capabilities.map(item=><article className="feature-card" key={item.number}><div className="feature-top"><span className="feature-icon"><Icon name={item.icon}/></span><span className="feature-num">{item.number} / 09</span></div><p className="feature-category">{item.category}</p><h3>{item.title}</h3><p>{item.detail}</p><span className="feature-tag"><Check size={14}/>{item.tag}</span></article>)}</div>
    <div className="feature-bottom"><span><Code2 size={17}/> Built with React, Next.js, TypeScript, PostgreSQL, Prisma &amp; Redis</span><a href={accepted} target="_blank" rel="noreferrer">See the acceptance matrix <ArrowUpRight size={17}/></a></div>
  </div></section>;
}
function Journey(){
  return <section className="journey-section section-padding" id="workflow"><div className="container">
    <div className="journey-intro"><SectionHead eyebrow="HOW IT WORKS" title={<>From black-box spend<br/>to <em>actionable evidence.</em></>} desc="Six deliberate steps. No blind model swapping. No production request interception."/></div>
    <MotionJourney/>
    <div className="journey-example"><span className="example-icon"><Play size={19}/></span><div><strong>Want to try the full flow?</strong><p>The repository includes 500 synthetic Northwind support tickets, six example categories, and a local mock evaluation provider.</p></div><a href={start} target="_blank" rel="noreferrer">Run the demo <ArrowRight size={17}/></a></div>
  </div></section>;
}
function UseCases(){
  const [selected,setSelected]=useState(0);
  const item=useCases[selected];
  return <section className="use-section section-padding" id="use-cases"><div className="container">
    <SectionHead eyebrow="WHERE IT FITS" title={<>Real business work.<br/><em>Not a generic chatbot.</em></>} desc="Pick a workflow. Compare alternatives where the outputs can be measured. Escalate judgment-heavy work."/>
    <div className="use-grid"><div className="use-nav" role="tablist" aria-label="Use case categories">{useCases.map((u,i)=><button type="button" role="tab" aria-selected={selected===i} aria-controls="use-case-panel" id={"use-tab-"+i} className={"use-tab"+(selected===i?" active":"")} key={u.short} onClick={()=>setSelected(i)}>
      <span>{String(i+1).padStart(2,"0")}</span><strong>{u.short}</strong><ArrowRight size={17}/></button>)}</div>
      <div key={selected} className="use-detail" role="tabpanel" id="use-case-panel" aria-labelledby={"use-tab-"+selected}>
        <div className="use-detail-top"><Eyebrow light>{item.eyebrow}</Eyebrow><span className="use-open-icon"><Workflow size={25}/></span></div>
        <h3>{item.title}</h3><p>{item.desc}</p>
        <div className="use-list-label">WHAT YOU CAN ASSESS</div>
        <ul>{item.tasks.map(t=><li key={t}><CheckCircle2 size={17}/>{t}</li>)}</ul>
        <div className="use-detail-bottom"><ShieldCheck size={16}/>{item.badge}</div>
      </div>
    </div>
  </div></section>;
}
function Range({label,value,min,max,step=1,suffix="",onChange}:{label:string;value:number;min:number;max:number;step?:number;suffix?:string;onChange:(v:number)=>void}){
  const fill=(value-min)/(max-min)*100;
  return <label className="range"><span className="range-head"><span>{label}</span><strong>{numberFmt(value)}{suffix}</strong></span>
    <input type="range" min={min} max={max} step={step} value={value} onChange={e=>onChange(Number(e.currentTarget.value))} style={{background:`linear-gradient(to right,#052FED ${fill}%,var(--range-unfilled) ${fill}%)`}}/></label>;
}
function CalculatorSection(){
  const [volume,setVolume]=useState(100000);
  const [eligible,setEligible]=useState(70);
  const [fallback,setFallback]=useState(10);
  const [overhead,setOverhead]=useState(0);
  const scenario=useMemo(()=>calculateSavings({
    monthlyVolume:volume,averageInputTokens:3000,averageOutputTokens:500,
    baselineInputPrice:2,baselineOutputPrice:10,candidateInputPrice:.1,candidateOutputPrice:.5,
    eligiblePercent:eligible,fallbackPercent:fallback,retryLimit:1,
    infrastructureMonthly:overhead,platformMonthly:0,baselineSuccessRate:.99,optimizedSuccessRate:.98
  }),[volume,eligible,fallback,overhead]);
  const animatedSavings=useCountUp(scenario.netMonthlySavings);
  const pct=Math.max(0,Math.min(100,scenario.optimizedTotalMonthlyCost/Math.max(.01,scenario.baselineMonthlyCost)*100));
  const reset=()=>{setVolume(100000);setEligible(70);setFallback(10);setOverhead(0)};
  return <section className="calculator-section section-padding" id="calculator"><div className="container">
    <SectionHead eyebrow="INTERACTIVE COST SCENARIO" title={<>What could a <em>smarter model mix</em> change?</>} desc="Explore the math. See how fallback rates and operating expenses affect potential savings. This is an illustrative calculator, not a customer outcome."/>
    <div className="calc-grid"><div className="calc-controls"><div className="calc-controls-head"><span><SlidersHorizontal size={19}/> MODEL YOUR WORKLOAD</span><button type="button" onClick={reset}><RotateCcw size={15}/> Reset</button></div>
      <Range label="Tasks per month" value={volume} min={10000} max={1000000} step={10000} onChange={setVolume}/>
      <Range label="Tasks eligible for cheaper model" value={eligible} min={0} max={100} step={5} suffix="%" onChange={setEligible}/>
      <Range label="Premium fallback rate" value={fallback} min={0} max={100} step={5} suffix="%" onChange={setFallback}/>
      <Range label="Monthly infrastructure overhead" value={overhead} min={0} max={5000} step={100} suffix=" USD" onChange={setOverhead}/>
      <div className="calc-detail"><CircleHelp size={18}/><p>Assumes 3,000 input + 500 output tokens per task. Baseline rates: $2 input/$10 output per million; candidate: $0.10/$0.50. Includes one cheap-model retry and premium fallback, with 99%/98% task-success assumptions. Model prices here are examples only.</p></div>
    </div>
    <div className="calc-result"><div className="calc-result-eyebrow"><span className="green-dot"/> SIMULATED MONTHLY SCENARIO</div>
      <p className="calc-result-intro">Potential net difference</p><div className="calc-total" aria-label={"Estimated net monthly difference "+money(scenario.netMonthlySavings)}>{money(animatedSavings)}<span>/mo</span></div>
      <span className={"calc-delta "+(scenario.netMonthlySavings>=0?"good":"bad")}>{scenario.netMonthlySavings>=0?<ArrowDownRight size={18}/>:<ArrowUpRight size={18}/>}
        {Math.abs(scenario.savingsPercent).toFixed(1)}% {scenario.netMonthlySavings>=0?"lower modeled cost":"higher modeled cost"}</span>
      <div className="calc-bars"><div><p><span>All premium model</span><strong>{money(scenario.baselineMonthlyCost)}</strong></p><span className="calc-track"><i style={{width:"100%"}}/></span></div>
        <div><p><span>Hybrid routing + overhead</span><strong>{money(scenario.optimizedTotalMonthlyCost)}</strong></p><span className="calc-track alternate"><i style={{width:pct+"%"}}/></span></div></div>
      <div className="calc-result-stats"><div><span>Fallback requests</span><strong>{numberFmt(scenario.fallbackRequests)}</strong></div><div><span>Annualized estimate</span><strong>{money(scenario.annualizedNetSavings)}</strong></div></div>
      <div className="calc-caution"><ShieldCheck size={17}/> Scenario only. Not verified savings or a guarantee of model quality.</div>
    </div></div>
    <p className="calc-caption">The authenticated app provides additional editable price, retry, quality, and cost-per-success controls. <a href={docs} target="_blank" rel="noreferrer">Read how to use it <ArrowUpRight size={14}/></a></p>
  </div></section>;
}
function Trust(){
  return <section className="trust-section section-padding" id="security"><div className="container"><div className="trust-layout"><div className="trust-heading">
    <SectionHead eyebrow="TRUST & GOVERNANCE" title={<>Savings are a hypothesis.<br/><em>Quality is a gate.</em></>} desc="ContextOps is intentionally conservative about what it can automate, what it can claim, and which data should be used."/>
    <a className="text-link" href={safeDocs} target="_blank" rel="noreferrer">Read security boundaries <ArrowUpRight size={18}/></a></div>
    <div className="trust-cards">
      {[
        {icon:LockKeyhole,name:"Tenant-scoped workspaces",text:"Organization membership, role-based permissions, and workspace deletion."},
        {icon:ShieldCheck,name:"Consent-aware processing",text:"Best-effort redaction during imports; separate consent for optional external evaluations."},
        {icon:GitBranch,name:"No production interception",text:"Shadow mode is offline. The current release cannot redirect real customer traffic."},
        {icon:FileText,name:"Evidence, not promises",text:"Auditable decisions and reports that label estimated, simulated, and unverified results."}
      ].map(item=><div className="trust-card" key={item.name}><span><item.icon size={21}/></span><div><h3>{item.name}</h3><p>{item.text}</p></div></div>)}
    </div></div>
    <div className="trust-warning"><ShieldAlert size={22}/><div><strong>Controlled-pilot boundary</strong><p>{pilotBoundary} Best-effort redaction is not enterprise DLP. SSO/MFA, automatic retention, certified compliance, production connectors, and live routing require further work.</p></div></div>
  </div></section>;
}
function FAQ(){
  return <section className="faq-section section-padding" id="faq"><div className="container faq-layout">
    <div className="faq-intro"><Eyebrow>GOOD QUESTIONS</Eyebrow><h2>Clear answers.<br/><em>No AI theater.</em></h2><p>What the open-source product can do right now, and where the hard edges are.</p><a className="text-link" href={docs} target="_blank" rel="noreferrer">Full documentation <ArrowUpRight size={17}/></a></div>
    <div className="faq-list">{faqs.map((item,i)=><details className="faq-item" key={item.q} open={i===0?true:undefined}><summary><span>{item.q}</span><ChevronDown size={20}/></summary><p>{item.a}</p></details>)}</div>
  </div></section>;
}
function BottomCTA(){
  return <section className="bottom-section"><div className="container"><div className="bottom-cta"><div className="cta-sun"/><div className="cta-orbit"/><div className="cta-content"><Eyebrow light>MEASURE BEFORE YOU MIGRATE</Eyebrow>
    <h2>Make every model<br/><em>earn its place.</em></h2><p>Start with synthetic traces. Find candidate tasks. Benchmark the outcomes. Share an evidence-backed assessment.</p>
    <div className="bottom-actions"><a href={interactiveDemo} className="btn btn-primary">Try interactive demo <ArrowRight size={19}/></a><a className="btn btn-outline-light" href={start} target="_blank" rel="noreferrer">Run locally <Github size={18}/></a></div>
    <span className="cta-small">Open source · No production traffic changes · No guaranteed savings</span>
  </div></div></div></section>;
}
function Footer(){
  return <footer className="footer"><div className="container"><div className="footer-main">
    <div className="footer-about"><Brand inverse/><p>Measure cost. Protect quality.<br/>Make informed decisions about your AI stack.</p><span className="footer-tag"><span className="green-dot"/> Open-source controlled pilot</span></div>
    <div className="footer-columns">
      <div><strong>Explore</strong>{nav.map(n=><a key={n.id} href={"#"+n.id}>{n.label}</a>)}<a href="#calculator">Cost calculator</a></div>
      <div><strong>Resources</strong><a href={githubUrl} target="_blank" rel="noreferrer">Source code</a><a href={docs} target="_blank" rel="noreferrer">Getting started</a><a href={accepted} target="_blank" rel="noreferrer">Acceptance tests</a><a href={safeDocs} target="_blank" rel="noreferrer">Security notes</a></div>
      <div><strong>Developer</strong><a href={githubUrl+"/blob/main/docs/API.md"} target="_blank" rel="noreferrer">API contracts</a><a href={githubUrl+"/blob/main/docs/DEPLOYMENT.md"} target="_blank" rel="noreferrer">Deployment</a><a href={githubUrl+"/actions"} target="_blank" rel="noreferrer">CI status</a><a href={githubUrl+"/issues"} target="_blank" rel="noreferrer">Report an issue</a></div>
    </div></div><div className="footer-bottom"><span>© {new Date().getUTCFullYear()} ContextOps AI. Open-source project.</span><span>Built for measured optimization, not model hype.</span><a href="#home">Back to top ↑</a></div>
  </div></footer>;
}
export default function App(){
  useReveal();
  return <div className="site"><a href="#main" className="skip-link">Skip to content</a><Header/><main id="main"><Hero/><Why/><DemoTeaser/><RoutingStream/><Capabilities/><Journey/><UseCases/><CalculatorSection/><Trust/><FAQ/><BottomCTA/></main><Footer/></div>;
}
