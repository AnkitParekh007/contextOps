import {z} from "zod";

/**
 * Phase 15 gate evidence is a review aid, not a certification authority.
 * Data entered by an operator does not independently verify the evidence URL.
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
export const operatorEvidenceSchema=z.object({
  gate:z.enum(requiredExternalGates.map(x=>x.id) as [GateId,...GateId[]]),
  outcome:z.enum(["ATTESTED","REJECTED"]),
  evidenceUrl:z.string().url().max(1000).refine(value=>{
    const uri=new URL(value);
    return uri.protocol==="https:"&&!uri.username&&!uri.password&&
      !uri.hash&&!uri.search;
  },"Use an HTTPS evidence URL without credentials, query parameters or fragments"),
  reviewedAt:z.string().datetime(),
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
  status:z.enum(["PASS","FAIL"]),
  scope:z.literal("synthetic_ephemeral_ci_only"),
  providerCalls:z.literal("MOCK_ONLY"),
  customerDataProcessed:z.literal(false),
  verifiedCustomerSavings:z.literal(false),
  externalAcceptance:z.literal("NOT_EVALUATED"),
  productionReady:z.literal(false),
  checkCount:z.number().int().nonnegative(),
  checks:z.array(z.object({
    name:z.string(),status:z.literal("PASS"),
  }).passthrough()),
}).passthrough();
export const mandatorySyntheticChecks=[
  "identity","tenant-isolation","frozen-protocol","holdout-non-reuse",
  "provider-denial","fault-stress","invoice-provenance","audit-evidence",
  "operator-boundary","cleanup",
] as const;

export function calculateReleaseReadiness(
  syntheticInput:unknown,operatorInput:unknown,now=new Date()
){
  const synthetic=syntheticManifestSchema.safeParse(syntheticInput);
  const operator=operatorManifestSchema.safeParse(operatorInput);
  const names=synthetic.success?new Set(synthetic.data.checks.map(x=>x.name)):new Set<string>();
  const validSynthetic=synthetic.success&&synthetic.data.status==="PASS"&&
    synthetic.data.checkCount===synthetic.data.checks.length&&
    mandatorySyntheticChecks.every(n=>names.has(n));
  const evidence=operator.success?operator.data.evidence:[];
  const gates=requiredExternalGates.map(gate=>{
    const candidates=evidence.filter(item=>item.gate===gate.id).sort(
      (a,b)=>b.reviewedAt.localeCompare(a.reviewedAt));
    const selected=candidates[0];
    let state:"MISSING"|"REJECTED"|"RECORDED_UNVERIFIED"="MISSING";
    if(selected){
      const checkedAt=new Date(selected.reviewedAt).getTime();
      const age=now.getTime()-checkedAt;
      if(age>=0&&age<=30*86400000)
        state=selected.outcome==="REJECTED"?"REJECTED":"RECORDED_UNVERIFIED";
    }
    return {id:gate.id,label:gate.label,state,
      // Do not include user-entered internal URLs or reviewer names in public/CI summaries.
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
    // This offline tool never verifies linked artifacts, contracts, or real infrastructure.
    productionApproved:false,customerDataApproved:false,verifiedSavings:false,
    reason:"Operator-entered evidence remains unverified; an independent decision is required before any hosted customer pilot.",
  } as const;
}
