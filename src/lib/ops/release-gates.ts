import {z} from "zod";

/**
 * Operator evidence is a review aid, never an authorization mechanism.
 * Do not expose review URLs or reviewer references in public CI reports.
 */
export const requiredExternalGates=[
  {id:"hosted_https",label:"Authenticated HTTPS web and isolated worker/DB/Redis"},
  {id:"email_delivery",label:"Verified transactional email and recovery flow"},
  {id:"backup_restore",label:"Encrypted managed backup and independent restore"},
  {id:"runtime_observability",label:"Alerts, incident owner and live health checks"},
  {id:"independent_security",label:"Independent security and tenant isolation review"},
  {id:"privacy_authorization",label:"Privacy/DPA/data residency and processing rights"},
  {id:"customer_dataset",label:"Authorized sanitized and independently adjudicated labels"},
  {id:"provider_costs",label:"Approved model budget and actual provider invoice reconciliation"},
  {id:"human_signoff",label:"Documented human pilot launch approval"},
] as const;
export type GateId=(typeof requiredExternalGates)[number]["id"];
export const mandatorySyntheticChecks=[
  "identity","tenant-isolation","frozen-protocol","holdout-non-reuse",
  "provider-denial","fault-stress","invoice-provenance","audit-evidence",
  "operator-boundary","cleanup",
] as const;
const syntheticCheckSchema=z.object({
  name:z.enum(mandatorySyntheticChecks),
  status:z.literal("PASS"),
  description:z.string().min(1).max(159),
}).strict();

export const operatorEvidenceSchema=z.object({
  gate:z.enum(requiredExternalGates.map(x=>x.id) as [GateId,...GateId[]]),
  outcome:z.enum(["ATTESTED","REJECTED"]),
  evidenceUrl:z.string().url().max(1000).refine(value=>{
    const uri=new URL(value);
    return uri.protocol==="https:"&&!uri.username&&!uri.password&&
      !uri.hash&&!uri.search;
  },"Use an HTTPS evidence URL without credentials, query parameters or fragments"),
  reviewedAt:z.string().datetime({offset:true}),
  reviewerReference:z.string().trim().min(6).max(100)
    .regex(/^[A-Za-z0-9 _./-]+$/),
}).strict();
export const operatorManifestSchema=z.object({
  version:z.literal(1),
  evidence:z.array(operatorEvidenceSchema).max(100),
}).strict();

export const syntheticManifestSchema=z.object({
  schemaVersion:z.literal(1),
  phase:z.literal(14),
  status:z.literal("PASS"),
  scope:z.literal("synthetic_ephemeral_ci_only"),
  generatedAt:z.string().datetime({offset:true}),
  releaseSha:z.string().regex(/^(?:[a-f0-9]{40}|local)$/),
  checks:z.array(syntheticCheckSchema).length(mandatorySyntheticChecks.length),
  checkCount:z.literal(10),
  failures:z.array(z.never()).length(0),
  providerCalls:z.literal("MOCK_ONLY"),
  customerDataProcessed:z.literal(false),
  verifiedCustomerSavings:z.literal(false),
  externalAcceptance:z.literal("NOT_EVALUATED"),
  productionReady:z.literal(false),
  blockers:z.array(z.string().min(1).max(300)).min(4),
}).strict();

export function calculateReleaseReadiness(
  syntheticInput:unknown,operatorInput:unknown,now=new Date()
){
  const synthetic=syntheticManifestSchema.safeParse(syntheticInput);
  const operator=operatorManifestSchema.safeParse(operatorInput);
  const names=synthetic.success?synthetic.data.checks.map(c=>c.name):[];
  const validSynthetic=synthetic.success&&
    new Set(names).size===mandatorySyntheticChecks.length&&
    mandatorySyntheticChecks.every(name=>names.includes(name))&&
    Date.parse(synthetic.data.generatedAt)<=now.getTime();
  const evidence=operator.success?operator.data.evidence:[];
  const gates=requiredExternalGates.map(gate=>{
    // Rejections are vetoes for the same timestamp, not quietly overruled
    // by sorting tied operator records.
    const candidates=evidence.filter(item=>item.gate===gate.id)
      .sort((a,b)=>b.reviewedAt.localeCompare(a.reviewedAt)||
        (a.outcome==="REJECTED"?-1:b.outcome==="REJECTED"?1:0));
    const selected=candidates[0];
    let state:"MISSING"|"REJECTED"|"RECORDED_UNVERIFIED"="MISSING";
    if(selected){
      const age=now.getTime()-Date.parse(selected.reviewedAt);
      if(age>=0&&age<=30*86400000)
        state=selected.outcome==="REJECTED"?"REJECTED":"RECORDED_UNVERIFIED";
    }
    return {id:gate.id,label:gate.label,state,
      hasRecentOperatorRecord:state!=="MISSING"};
  });
  const missing=gates.filter(g=>g.state!=="RECORDED_UNVERIFIED").map(g=>g.id);
  const operatorRecordsComplete=operator.success&&missing.length===0;
  return {
    status:validSynthetic&&operatorRecordsComplete?"INDEPENDENT_REVIEW_REQUIRED":"BLOCKED",
    syntheticCiPassed:Boolean(validSynthetic),
    operatorEvidenceParsed:operator.success,
    gateCount:gates.length,gates,missingGates:missing,
    operatorRecordsComplete:Boolean(operatorRecordsComplete),
    productionApproved:false,customerDataApproved:false,verifiedSavings:false,
    reason:"Operator-entered evidence remains unverified; independent review is required before any customer pilot.",
  } as const;
}
