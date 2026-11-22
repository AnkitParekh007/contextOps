import {ArrowRight,BrainCircuit,CheckCircle2,Database,ShieldCheck,UserRoundCheck} from "lucide-react";

/**
 * Original concept illustration: each saved task trace meets a quality
 * gate before being considered for cheaper evaluation, premium fallback,
 * or human review. It is a diagram of offline simulation, not live routing.
 */
export function RoutingStream(){
  return <section className="routing-section" aria-labelledby="routing-heading">
    <div className="container">
      <div className="routing-head">
        <div><span className="routing-kicker"><span/> THE DECISION LAYER</span>
          <h2 id="routing-heading">One workload. <em>Multiple right answers.</em></h2>
          <p>Visualize how an offline quality gate separates repeatable tasks from those that deserve premium reasoning or human judgment.</p></div>
        <span className="routing-section-tag"><ShieldCheck size={16}/> SIMULATION ONLY</span>
      </div>
      <div className="routing-illustration">
        <div className="routing-noise" aria-hidden="true"/>
        <svg className="routing-connections" aria-hidden="true" viewBox="0 0 1080 280" preserveAspectRatio="none">
          <defs><linearGradient id="routing-wire" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#69B6CD" stopOpacity=".05"/>
            <stop offset="50%" stopColor="#052FED" stopOpacity=".85"/>
            <stop offset="100%" stopColor="#69B6CD" stopOpacity=".6"/>
          </linearGradient></defs>
          <path className="routing-wire" d="M 220 141 C 310 141 300 141 414 141"/>
          <path className="routing-wire routing-wire-one" d="M 640 141 C 732 141 708 53 830 53"/>
          <path className="routing-wire routing-wire-two" d="M 640 141 C 737 141 723 141 830 141"/>
          <path className="routing-wire routing-wire-three" d="M 640 141 C 732 141 709 230 830 230"/>
          <path className="routing-wire-flow" d="M 220 141 C 310 141 300 141 414 141"/>
          <path className="routing-wire-flow" d="M 640 141 C 732 141 708 53 830 53"/>
          <path className="routing-wire-flow" d="M 640 141 C 737 141 723 141 830 141"/>
          <path className="routing-wire-flow" d="M 640 141 C 732 141 709 230 830 230"/>
          <circle className="routing-node-pulse" cx="415" cy="141" r="4"/>
          <circle className="routing-node-pulse" cx="641" cy="141" r="4"/>
        </svg>
        <div className="routing-flow-stage">
          <div className="routing-box routing-source"><span className="routing-icon"><Database size={21}/></span>
            <span className="routing-caption">OBSERVED</span><strong>Workflow traces</strong><small>Input · tokens · labels</small></div>
          <div className="routing-mobile-link"><ArrowRight size={20}/></div>
          <div className="routing-box routing-gate"><span className="routing-icon"><BrainCircuit size={23}/></span>
            <span className="routing-caption">THE GATE</span><strong>Evaluate quality</strong><small>Confidence · risk · cost</small>
            <span className="routing-gate-pulse"/></div>
          <div className="routing-mobile-link"><ArrowRight size={20}/></div>
          <div className="routing-results">
            <div className="routing-result routing-candidate"><span><CheckCircle2 size={18}/></span><div><strong>Candidate evaluation</strong><small>Only if thresholds pass</small></div></div>
            <div className="routing-result routing-premium"><span><ShieldCheck size={18}/></span><div><strong>Premium fallback</strong><small>Keep the stronger path</small></div></div>
            <div className="routing-result routing-review"><span><UserRoundCheck size={18}/></span><div><strong>Human review</strong><small>Sensitive or uncertain tasks</small></div></div>
          </div>
        </div>
        <div className="routing-foot"><span>Quality gates before model changes</span><span>Illustrative flow · No production switching</span></div>
      </div>
    </div>
  </section>;
}
