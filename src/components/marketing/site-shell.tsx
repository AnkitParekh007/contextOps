import Link from "next/link";
import { ArrowRight, Github, Layers3, LockKeyhole } from "lucide-react";
import { MobileMenu } from "@/components/marketing/mobile-menu";
import { navigation, githubUrl, pilotBoundary } from "@/lib/marketing-content";

export function SiteHeader(){
  return <>
    <div className="mkt-announcement">
      <span className="mkt-announcement-dot"/>
      <span>ContextOps AI is available as an open-source controlled pilot.</span>
      <Link href="/product">Explore what&apos;s built <ArrowRight size={13}/></Link>
    </div>
    <header className="mkt-header">
      <div className="mkt-container mkt-header-inner">
        <Link className="mkt-wordmark" href="/" aria-label="ContextOps AI home">
          <span className="mkt-logo"><Layers3 size={23} strokeWidth={2.2}/></span>
          <span>context<span className="mkt-wordmark-ops">ops</span><span className="mkt-wordmark-ai">.ai</span></span>
        </Link>
        <nav className="mkt-nav" aria-label="Main navigation">
          {navigation.map(item=><Link key={item.href} href={item.href}>{item.label}</Link>)}
        </nav>
        <div className="mkt-header-actions">
          <Link href="/login" className="mkt-sign-in">Sign in</Link>
          <Link className="mkt-button mkt-button-dark mkt-button-small" href="/register">
            Open workspace <ArrowRight size={16}/>
          </Link>
          <MobileMenu/>
        </div>
      </div>
    </header>
  </>;
}
export function SiteFooter(){
  return <footer className="mkt-footer">
    <div className="mkt-container">
      <div className="mkt-footer-top">
        <div>
          <Link className="mkt-wordmark mkt-wordmark-footer" href="/">
            <span className="mkt-logo"><Layers3 size={22}/></span>
            <span>context<span className="mkt-wordmark-ops">ops</span><span className="mkt-wordmark-ai">.ai</span></span>
          </Link>
          <p>Make every model earn its place.<br/>Measure cost. Protect quality. Show the evidence.</p>
          <span className="mkt-footer-status"><LockKeyhole size={14}/> Controlled-pilot software</span>
        </div>
        <div className="mkt-footer-links">
          <div><strong>Explore</strong><Link href="/product">Platform</Link><Link href="/how-it-works">How it works</Link><Link href="/use-cases">Use cases</Link><Link href="/trust">Trust &amp; safety</Link></div>
          <div><strong>Get started</strong><Link href="/register">Create a workspace</Link><Link href="/login">Sign in</Link><a target="_blank" rel="noopener noreferrer" href={githubUrl}>GitHub repository</a><a target="_blank" rel="noopener noreferrer" href={githubUrl+"/blob/main/docs/DEPLOYMENT.md"}>Self-hosting guide</a></div>
          <div><strong>Resources</strong><a target="_blank" rel="noopener noreferrer" href={githubUrl+"/blob/main/docs/ACCEPTANCE.md"}>What&apos;s implemented</a><a target="_blank" rel="noopener noreferrer" href={githubUrl+"/blob/main/docs/SECURITY.md"}>Security notes</a><a target="_blank" rel="noopener noreferrer" href={githubUrl+"/blob/main/docs/API.md"}>API reference</a><a target="_blank" rel="noopener noreferrer" href={githubUrl}><Github size={15}/> Open source</a></div>
        </div>
      </div>
      <div className="mkt-footer-bottom"><span>© {new Date().getUTCFullYear()} ContextOps AI · Open-source MVP</span><span>{pilotBoundary}</span></div>
    </div>
  </footer>;
}
export function MarketingShell({children}:{children:React.ReactNode}){
  return <div className="mkt"><SiteHeader/><main id="main-content">{children}</main><SiteFooter/></div>;
}
export function Eyebrow({children,light=false}:{children:React.ReactNode;light?:boolean}){
  return <p className={light?"mkt-eyebrow mkt-eyebrow-light":"mkt-eyebrow"}><span/> {children}</p>;
}
export function SectionHeading({eyebrow,title,description,centered=false}:{eyebrow:string;title:string;description?:string;centered?:boolean}){
  return <div className={centered?"mkt-section-heading centered":"mkt-section-heading"}>
    <Eyebrow>{eyebrow}</Eyebrow><h2>{title}</h2>{description&&<p>{description}</p>}
  </div>;
}
export function SectionCTA({heading="Ready to explore your AI workload?",description="Start with the synthetic demo. Move toward real decisions only when the evidence and approvals are there."}:{heading?:string;description?:string}){
  return <section className="mkt-cta-section"><div className="mkt-container">
    <div className="mkt-cta-panel">
      <div className="mkt-orb mkt-orb-one"/><div className="mkt-orb mkt-orb-two"/>
      <div className="mkt-cta-content"><Eyebrow light>Make the next decision measurable</Eyebrow>
        <h2>{heading}</h2><p>{description}</p>
        <div className="mkt-cta-buttons">
          <Link className="mkt-button mkt-button-light" href="/register">Start your workspace <ArrowRight size={18}/></Link>
          <a className="mkt-button mkt-button-outline-light" target="_blank" rel="noopener noreferrer" href={githubUrl}>Explore the code <Github size={17}/></a>
        </div>
        <span className="mkt-cta-note">No live production switching · No guaranteed savings</span>
      </div>
    </div>
  </div></section>;
}
