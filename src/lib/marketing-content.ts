export const githubUrl = "https://github.com/AnkitParekh007/contextOps";
export const docsUrl = githubUrl + "/blob/main/README.md";
export const pilotBoundary =
  "Controlled pilot only. Routing and savings are simulated; production model switching and verified financial outcomes are not available.";

export const navigation = [
  { href: "/product", label: "Platform" },
  { href: "/how-it-works", label: "How it works" },
  { href: "/use-cases", label: "Use cases" },
  { href: "/trust", label: "Trust & safety" },
] as const;

export const capabilities = [
  { number: "01", title: "A home for every workflow", detail: "Company accounts, isolated workspaces, team roles, and an auditable foundation for every optimization assessment.", category: "FOUNDATION", tag: "Workspace onboarding", icon: "layers" },
  { number: "02", title: "Bring your traces", detail: "CSV, JSONL, or JSON imports with field mapping, redacted previews, progress tracking, duplicate protection, and retrying worker jobs.", category: "DATA", tag: "Up to 10,000 records/import", icon: "database" },
  { number: "03", title: "Understand repeatable work", detail: "Group requests by task type and prompt pattern. Surface labels, confidence heuristics, risk flags, and human-review candidates.", category: "INTELLIGENCE", tag: "Explainable classification", icon: "brain" },
  { number: "04", title: "See the whole cost", detail: "Compare token prices, eligible volume, fallbacks, retries, infrastructure fees, and cost per successfully completed task.", category: "ECONOMICS", tag: "Transparent what-if math", icon: "calculator" },
  { number: "05", title: "Benchmark before you switch", detail: "Evaluate labeled tasks against cheaper candidates. Review accuracy, macro-F1, output validity, latency, errors, and modeled cost.", category: "EVALUATION", tag: "Quality before price", icon: "flask" },
  { number: "06", title: "Set policy guardrails", detail: "Create versioned simulation-only policies with minimum quality, confidence, latency, fallback, and cost ceilings.", category: "CONTROL", tag: "Safe escalation", icon: "shield" },
  { number: "07", title: "Try a route without using it", detail: "Offline shadow runs project how work might split between cheaper, premium, and human-review paths. Production stays unchanged.", category: "SIMULATION", tag: "Zero production interception", icon: "route" },
  { number: "08", title: "Show your work", detail: "Explore model mix, token use, task suitability, evaluation history, assumptions, audit events, and downloadable Markdown assessments.", category: "EVIDENCE", tag: "Reports with context", icon: "chart" },
  { number: "09", title: "Keep humans accountable", detail: "Tenant-scoped permissions, review decisions, audit records, workspace data deletion, Docker deployment, and CI-tested synthetic flows.", category: "GOVERNANCE", tag: "Controlled-pilot safeguards", icon: "lock" },
] as const;

export const processSteps = [
  { number:"01", title:"Create the workspace", description:"Choose a company, the workflow you want to study, and its existing AI model.", phase:"Setup" },
  { number:"02", title:"Import a safe sample", description:"Preview field mapping and best-effort redaction, then process authorized traces with the background worker.", phase:"Understand" },
  { number:"03", title:"Find candidate tasks", description:"Group repetitive work. Flag sensitive, unfamiliar, complex, or unlabeled cases for review.", phase:"Discover" },
  { number:"04", title:"Evaluate cheaper options", description:"Run candidate models on labeled samples and compare measurable quality against the baseline.", phase:"Validate" },
  { number:"05", title:"Simulate the policy", description:"Apply quality and cost gates to offline traces with premium fallback and human-review paths.", phase:"Simulate" },
  { number:"06", title:"Share the evidence", description:"Export a scenario assessment with assumptions, audit events, and clearly unverified savings.", phase:"Report" },
] as const;

export const useCases = [
  { short:"Support operations", title:"Customer support triage", eyebrow:"Structured classification", desc:"Compare how candidates categorize ticket intent while preserving a route for unexpected or sensitive requests.", tasks:["Ticket categorization","Repeated intent patterns","Exception escalation"], badge:"Automatic label scoring supported" },
  { short:"Finance operations", title:"Invoice & document extraction", eyebrow:"Structured extraction", desc:"Evaluate field-level structured outputs against labeled examples, with input and output schemas as benchmarks.", tasks:["Invoice field extraction","JSON schema checks","Labeled exact-match comparisons"], badge:"Structured scoring supported" },
  { short:"Internal knowledge", title:"Policy and knowledge Q&A", eyebrow:"Knowledge retrieval", desc:"Inspect recurring internal-question patterns and cost assumptions. Correctness of free-text answers still requires human review.", tasks:["Policy Q&A classification","Recurring prompt analysis","Human review for factual accuracy"], badge:"Analysis + manual review" },
  { short:"Sales operations", title:"Follow-up generation", eyebrow:"Routine generation", desc:"Identify repeatable follow-up tasks and understand volume and costs. No automatic factual-quality approval for generated prose.", tasks:["Follow-up task grouping","Template-frequency insights","Quality review workflow"], badge:"Analysis + manual review" },
  { short:"Revenue teams", title:"Lead qualification", eyebrow:"Decision support", desc:"Compare labeled qualification categories on routine records, and escalate cases that need judgment.", tasks:["Lead-type grouping","Category benchmarking","Policy-gated escalation"], badge:"Depends on structured labels" },
  { short:"Product & AI teams", title:"AI workflow audits", eyebrow:"Cross-functional assessments", desc:"Map mixed workflows across models, compare scenario economics, and report what has and has not been validated.", tasks:["Model usage inventory","Cost per successful task","Risk and audit evidence"], badge:"Simulation-oriented" },
] as const;

export const faqs = [
  {q:"Does ContextOps automatically replace Claude or GPT in production?", a:"No. The current MVP evaluates samples and runs offline routing simulations. It does not intercept production requests, deploy new models, or claim verified realized savings."},
  {q:"Can I connect an existing Anthropic or OpenAI account?", a:"The evaluation harness has optional Anthropic and OpenAI adapters. Server-side API credentials and explicit per-evaluation consent are required. Production workflow connectors are not available."},
  {q:"Do I need to train or fine-tune a custom small model?", a:"No. The MVP starts with workload analysis and benchmarking. It includes a deterministic local mock provider for synthetic demonstration; model fine-tuning and dedicated GPU hosting are not implemented."},
  {q:"What data can I import?", a:"CSV, JSONL, NDJSON, and JSON traces, up to 16 MiB and 10,000 records per import. The app provides field mapping and best-effort redaction. Use synthetic or separately approved sanitized data; this is not certified DLP."},
  {q:"Are the savings calculations real?", a:"The calculator uses your volume, token, price, fallback, retry, success-rate, and infrastructure assumptions. Shadow runs simulate sample-level costs. Verified production savings remain unavailable until a separately authorized rollout measures outcomes."},
  {q:"How does ContextOps protect business data?", a:"The MVP includes organization-scoped access, role checks, signed session cookies, ingestion consent, best-effort redaction, audit records, and workspace deletion. It does not yet provide enterprise SSO, DLP certification, automated retention schedules, or an independent security audit."},
  {q:"Can I try the full workflow without sharing customer data?", a:"Yes. Load the 500 synthetic Northwind Logistics support tickets, analyze them, run a local mock evaluation, create an approved-for-simulation policy, and export a report."},
  {q:"Is ContextOps open source?", a:"Yes. The repository includes source, local Docker instructions, tests, and documentation. You can inspect the implementation and its current limitations on GitHub."},
] as const;
