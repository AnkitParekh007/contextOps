/** 
 * Browser-only demonstration of the existing deterministic Northwind seed + MOCK provider.
 * No network calls, user data, account state or API keys. Never call this a customer benchmark.
 */
export const labels=[
  "billing question","shipping status","refund request",
  "technical issue","account access","spam/other",
] as const;
export type Label=typeof labels[number];
export type DemoTrace={
  id:string; ticket:string; label:Label; inputTokens:number;outputTokens:number;
  latencyMs:number;index:number;
};
const examples=[
  ["billing question","Why does invoice {n} include a duplicate service fee?"],
  ["shipping status","Can you tell me when shipment {n} arrives at the depot?"],
  ["refund request","Order {n} was returned. I would like my refund."],
  ["technical issue","The dashboard crashes when I open tracking case {n}."],
  ["account access","I cannot log in to my account for reference {n}."],
  ["spam/other","WIN a special promo for case {n} — unrelated promotion."],
] as const;
export const traces:DemoTrace[]=Array.from({length:500},(_,i)=>{
  const [label,example]=examples[i%examples.length];
  return {
    id:"northwind-demo-"+i,
    ticket:example.replace("{n}",String(10000+i)),
    label,inputTokens:150+((i*7)%90),outputTokens:10+((i*3)%8),
    latencyMs:300+((i*13)%600),index:i,
  };
});
export type DemoSettings={
  sampleCount:number;minimumQuality:number;fallbackPercent:number;
  monthlyVolume:number;infrastructureMonthly:number;
  baselineInputPrice:number;baselineOutputPrice:number;
  candidateInputPrice:number;candidateOutputPrice:number;
};
export const defaultSettings:DemoSettings={
  sampleCount:30,minimumQuality:.95,fallbackPercent:10,
  monthlyVolume:100000,infrastructureMonthly:150,
  baselineInputPrice:2,baselineOutputPrice:10,
  candidateInputPrice:.1,candidateOutputPrice:.5,
};
export const SIMULATED_ONLY="Synthetic, browser-only mock. No provider calls, customer data or verified savings.";

function mockClassify(value:string):Label{
  const lower=value.toLowerCase();
  if(/crash|error|dashboard|technical|bug/.test(lower))return "technical issue";
  if(/refund|return(ed)?/.test(lower))return "refund request";
  if(/login|log in|account|sign in/.test(lower))return "account access";
  if(/invoice|billing|charge|fee|payment/.test(lower))return "billing question";
  if(/shipment|shipping|arrive|tracking|delivery/.test(lower))return "shipping status";
  return "spam/other";
}
export function mockPredict(trace:DemoTrace):Label{
  const prediction=mockClassify(trace.ticket);
  const number=Number(trace.ticket.match(/\b\d{5}\b/)?.[0]??0);
  // Exact intentional local mock failure introduced in src/lib/pipeline/providers.ts.
  return number!==0&&number%19===0?"spam/other":prediction;
}
export function macroF1(predictions:{expected:Label;actual:Label}[]):number{
  if(!predictions.length)return 0;
  const classes=new Set(predictions.flatMap(p=>[p.expected,p.actual]));
  let total=0;
  for(const value of classes){
    const tp=predictions.filter(p=>p.expected===value&&p.actual===value).length;
    const fp=predictions.filter(p=>p.expected!==value&&p.actual===value).length;
    const fn=predictions.filter(p=>p.expected===value&&p.actual!==value).length;
    const precision=tp+fp?tp/(tp+fp):0;
    const recall=tp+fn?tp/(tp+fn):0;
    total+=precision+recall?2*precision*recall/(precision+recall):0;
  }
  return total/classes.size;
}
export function assess(settings:DemoSettings){
  const sample=traces.slice(0,Math.max(5,Math.min(50,Math.round(settings.sampleCount))));
  const predictions=sample.map(trace=>({
    trace,expected:trace.label,actual:mockPredict(trace),
    valid:trace.label===mockPredict(trace),
  }));
  const correct=predictions.filter(item=>item.valid).length;
  const quality=correct/sample.length;
  const f1=macroF1(predictions);
  const baselineAccuracy=1; // Seeded Northwind labels exactly match baseline output.
  const baselineTotal=sample.reduce((sum,t)=>sum+
    (t.inputTokens*settings.baselineInputPrice+t.outputTokens*settings.baselineOutputPrice)/1e6,0);
  const candidateTotal=predictions.reduce((sum,p)=>{
    const inputTokens=Math.max(1,Math.ceil(p.trace.ticket.length/4));
    const outputTokens=Math.max(1,Math.ceil(p.actual.length/4));
    return sum+(inputTokens*settings.candidateInputPrice+outputTokens*settings.candidateOutputPrice)/1e6;
  },0);
  const eligibleCount=traces.length; // All synthetic traces are labeled routine ticket classification.
  const passes=quality>=settings.minimumQuality&&
    quality>=baselineAccuracy-.05&&
    (1-quality)<=.05&&candidateTotal<baselineTotal;
  const averageBaselineInput=traces.reduce((n,t)=>n+t.inputTokens,0)/traces.length;
  const averageBaselineOutput=traces.reduce((n,t)=>n+t.outputTokens,0)/traces.length;
  const averageCandidateInput=predictions.reduce((n,p)=>n+Math.max(1,Math.ceil(p.trace.ticket.length/4)),0)/sample.length;
  const averageCandidateOutput=predictions.reduce((n,p)=>n+Math.max(1,Math.ceil(p.actual.length/4)),0)/sample.length;
  const baselinePer=(averageBaselineInput*settings.baselineInputPrice+
    averageBaselineOutput*settings.baselineOutputPrice)/1e6;
  const candidatePer=(averageCandidateInput*settings.candidateInputPrice+
    averageCandidateOutput*settings.candidateOutputPrice)/1e6;
  const eligibleMonthly=passes?settings.monthlyVolume:0;
  const fallbackMonthly=eligibleMonthly*settings.fallbackPercent/100;
  const premiumMonthly=settings.monthlyVolume-eligibleMonthly+fallbackMonthly;
  const baselineMonthly=settings.monthlyVolume*baselinePer;
  const projectedMonthly=(eligibleMonthly+fallbackMonthly)*candidatePer+
    premiumMonthly*baselinePer+settings.infrastructureMonthly;
  const categories=labels.map(label=>({label,count:traces.filter(t=>t.label===label).length}));
  const simulated=baselineMonthly-projectedMonthly;
  return {
    sample,predictions,quality,f1,correct,baselineAccuracy,baselineTotal,candidateTotal,
    eligibleCount,passes,categories,reviewCount:0,blockedCount:0,
    premiumCount:passes?0:traces.length,candidateCount:passes?traces.length:0,
    fallbackMonthly,baselineMonthly,projectedMonthly,simulated,
    averageBaselineInput,averageBaselineOutput,averageCandidateInput,averageCandidateOutput,
  };
}
export function reportMarkdown(settings:DemoSettings):string{
  const r=assess(settings);
  const money=(n:number)=>"$"+n.toFixed(2);
  return [
    "# ContextOps AI — Synthetic Product Assessment",
    "",
    "**Source:** Deterministic Northwind synthetic support-ticket example",
    "**Environment:** Browser-only MOCK engine on a public GitHub Pages site",
    "**Evidence level:** SIMULATED — not verified savings or customer model parity",
    "**Data protection:** No imports, no network model calls, no customer data",
    "",
    "## 1. Ingestion / analysis",
    "- Trace count: "+traces.length,
    "- Task type: routine support ticket classification",
    "- Distinct human labels: "+labels.length,
    "- Eligible for testing: "+r.eligibleCount,
    "- Human-review required in this seed: "+r.reviewCount,
    "- Sensitive/blocked in this seed: "+r.blockedCount,
    "",
    "## 2. Deterministic benchmark",
    "- Candidate provider/model: MOCK / mock-efficient (not a real LLM)",
    "- Baseline: MOCK / mock-premium (perfect labels by synthetic construction)",
    "- Benchmark samples: "+r.sample.length+" (first consecutive synthetic records)",
    "- Correct: "+r.correct,
    "- Accuracy: "+(100*r.quality).toFixed(2)+"%",
    "- Macro-F1: "+(100*r.f1).toFixed(2)+"%",
    "- Minimum quality threshold: "+(100*settings.minimumQuality).toFixed(1)+"%",
    "- Maximum drop from baseline: 5 percentage points",
    "- Synthetic evaluation passes all demo gates: "+(r.passes?"YES":"NO"),
    "- Baseline sample cost (provided price assumptions): "+money(r.baselineTotal),
    "- Candidate sample cost (provided price assumptions): "+money(r.candidateTotal),
    "",
    "## 3. Offline routing projection",
    "- Simulation-only policy: "+(r.passes?"candidate path for all eligible synthetic traces":"premium fallback for all traces"),
    "- Cheaper candidate path: "+r.candidateCount,
    "- Premium path: "+r.premiumCount,
    "- Human-review path (none in the synthetic seed): "+r.reviewCount,
    "- No live routing or provider changes took place.",
    "",
    "## 4. Monthly scenario, NOT a verified result",
    "- Monthly volume assumption: "+settings.monthlyVolume.toLocaleString("en-US"),
    "- User-selected premium fallback assumption: "+settings.fallbackPercent+"%",
    "- Monthly infrastructure cost assumption: "+money(settings.infrastructureMonthly),
    "- Baseline input/output price per million tokens: $"+settings.baselineInputPrice+" / $"+settings.baselineOutputPrice,
    "- Candidate input/output price per million tokens: $"+settings.candidateInputPrice+" / $"+settings.candidateOutputPrice,
    "- Modeled monthly baseline cost: "+money(r.baselineMonthly),
    "- Modeled monthly scenario cost: "+money(r.projectedMonthly),
    "- Simulated monthly difference: "+money(r.simulated),
    "- Projected premium fallback calls: "+Math.round(r.fallbackMonthly),
    "- Verified realized savings: NOT AVAILABLE",
    "",
    "## Limitations",
    "- The MOCK engine uses deterministic rules and a deliberately injected failure every nineteenth ticket ID.",
    "- The first consecutive rows are not a statistically representative real-world sample.",
    "- Baseline accuracy is perfect by synthetic construction and does not represent a real model.",
    "- The configured fallback percentage is a scenario assumption, not an error detector.",
    "- This report does not prove production quality, reliability or cost savings.",
    "- Actual provider rates, latency, retries, operating expenses, business labels and compliance must be independently verified.",
    "- Never upload or submit customer data in the public static demo.",
    "",
    "## Appropriate next step",
    "Run a tenant-isolated hosted pilot with independently authorized, sanitized and labeled records after privacy and infrastructure security review.",
    "",
    "_Generated without external AI calls by ContextOps AI demo._",
  ].join("\n");
}
